"""API behaviour with a fake runner (no Docker needed)."""

from __future__ import annotations

import hashlib
from pathlib import Path

import httpx
from starlette.websockets import WebSocketDisconnect

from app.schemas.runner import StepResult, Termination

from .conftest import FakeRunner, ndjson_response, wait_until_terminal

FIXTURES = Path(__file__).parent / "fixtures" / "gcc"
HELLO = '#include <stdio.h>\nint main(void) { printf("hi\\n"); return 0; }\n'


def submit(client, source=HELLO, stdin="", language="c"):
    return client.post("/api/v1/executions", json={"languageId": language, "source": source, "stdin": stdin})


def test_languages_lists_every_language_with_limits(make_client):
    body = make_client().get("/api/v1/languages").json()
    assert [lang["id"] for lang in body] == [
        "c", "cpp", "java", "python", "javascript", "typescript", "go", "rust",
        "csharp", "kotlin", "swift", "php", "ruby", "lua", "bash", "sql",
        "r", "asm", "lex", "verilog", "prolog", "fortran", "pascal", "cobol", "perl",
        "lisp", "scheme", "erlang", "elixir", "nim", "d", "ada", "tcl"]
    assert {lang["id"] for lang in body if lang["status"] == "experimental"} == {"swift"}
    by_id = {lang["id"]: lang for lang in body}
    c = by_id["c"]
    assert c["editorMode"] == "c" and c["sourceFile"] == "main.c"
    assert c["toolchain"] == {"name": "GCC", "declaredVersion": "13", "image": "compiler-copilot/sandbox-gcc:13"}
    assert [(s["name"], s["kind"], s["label"]) for s in c["steps"]] == [
        ("compile", "compile", "Compile"), ("run", "run", "Run")]
    assert c["steps"][1]["limits"] == {"wallTimeMs": 5000, "memoryMb": 256, "outputKb": 64}
    assert c["steps"][0]["argv"][:2] == ["gcc", "-std=gnu17"]
    assert by_id["cpp"]["sourceFile"] == "main.cpp" and by_id["cpp"]["steps"][0]["argv"][0] == "g++"
    assert by_id["java"]["sourceFile"] == "Main.java" and by_id["java"]["toolchain"]["name"] == "OpenJDK"
    python = by_id["python"]
    assert python["sourceFile"] == "main.py" and python["steps"][0]["label"] == "Syntax check"
    assert [s["name"] for s in by_id["go"]["steps"]] == ["compile", "link", "run"]
    assert [s["name"] for s in by_id["sql"]["steps"]] == ["run"]  # SQL runs statement by statement
    assert [s["name"] for s in by_id["asm"]["steps"]] == ["assemble", "link", "run"]
    assert [s["name"] for s in by_id["lex"]["steps"]] == ["scan", "compile", "run"]
    assert by_id["prolog"]["sourceFile"] == "main.pro" and by_id["perl"]["sourceFile"] == "main.pl"
    assert by_id["typescript"]["sourceFile"] == "main.ts" and by_id["kotlin"]["sourceFile"] == "main.kt"


def test_languages_report_whether_their_toolchain_is_installed(make_client):
    runner = FakeRunner(missing={"compiler-copilot/sandbox-kotlin:2.4"})
    client = make_client(runner)
    by_id = {lang["id"]: lang for lang in client.get("/api/v1/languages").json()}
    assert by_id["kotlin"]["available"] is False
    assert by_id["c"]["available"] is True and by_id["sql"]["available"] is True
    # A language whose image is missing is refused up front, not failed later.
    refused = submit(client, source="fun main() {}\n", language="kotlin")
    assert refused.status_code == 409
    assert "Kotlin is not installed on this server" in refused.json()["detail"]
    assert runner.jobs == []


def test_languages_availability_is_unknown_while_the_runner_is_down(make_client):
    def down(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=request)

    client = make_client(transport=httpx.MockTransport(down))
    assert {lang["available"] for lang in client.get("/api/v1/languages").json()} == {None}
    assert submit(client).status_code == 202  # accepted; the run then reports the runner problem


def test_successful_run(make_client, fake_runner):
    client = make_client(fake_runner)
    accepted = submit(client, stdin="Asha\n")
    assert accepted.status_code == 202
    body = accepted.json()
    assert body["id"].startswith("exe_")
    assert body["sourceHash"] == "sha256:" + hashlib.sha256(HELLO.encode()).hexdigest()
    assert body["state"] in {"QUEUED", "STARTING", "COMPILING", "RUNNING", "SUCCEEDED"}

    done = wait_until_terminal(client, body["id"])
    assert done["state"] == "SUCCEEDED"
    assert done["summary"] == "Finished successfully"
    assert [(s["name"], s["status"]) for s in done["steps"]] == [("compile", "SUCCEEDED"), ("run", "SUCCEEDED")]
    assert done["steps"][1]["stdout"] == "hi\n"
    assert done["diagnostics"] == []
    assert done["toolchain"] == {"name": "GCC", "version": "13.3.0",
                                 "image": "compiler-copilot/sandbox-gcc:13", "imageId": "sha256:fake"}


def test_job_is_built_only_from_the_trusted_profile(make_client, fake_runner):
    client = make_client(fake_runner)
    wait_until_terminal(client, submit(client, stdin="42\n").json()["id"])
    job = fake_runner.jobs[0]
    assert job["image"] == "compiler-copilot/sandbox-gcc:13"
    assert job["files"] == [{"path": "main.c", "content": HELLO}]
    compile_step, run_step = job["steps"]
    assert compile_step["argv"][0] == "gcc" and "main.c" in compile_step["argv"]
    assert compile_step["stdin"] is None
    assert run_step["argv"] == ["stdbuf", "-oL", "/workspace/main"]
    assert run_step["stdin"] == "42\n"
    assert run_step["workspaceMode"] == "ro"
    assert run_step["limits"]["memoryMb"] == 256


def test_compile_error_is_normalized(make_client):
    stderr = (FIXTURES / "missing_semicolon.stderr.txt").read_text()
    runner = FakeRunner(lambda job: ndjson_response(job, [
        StepResult(name="compile", termination=Termination.EXITED, exit_code=1, wall_ms=80, stderr=stderr)]))
    client = make_client(runner)
    source = (FIXTURES / "missing_semicolon.c").read_text()
    done = wait_until_terminal(client, submit(client, source).json()["id"])
    assert done["state"] == "COMPILE_ERROR"
    assert done["summary"] == "Compilation failed: 1 error, 1 warning"
    assert [(s["name"], s["status"]) for s in done["steps"]] == [("compile", "FAILED"), ("run", "SKIPPED")]
    first = done["diagnostics"][0]
    assert first["code"] == "C_MISSING_SEMICOLON"
    assert first["source"] == "compiler"
    assert first["range"] == {"startLine": 5, "startColumn": 5, "endLine": 5, "endColumn": 11}
    assert first["executionId"] == done["id"]
    assert first["rawOutputReference"]["stream"] == "stderr"


def test_crash_is_reported_with_signal(make_client):
    runner = FakeRunner(lambda job: ndjson_response(job, [
        StepResult(name="compile", termination=Termination.EXITED, exit_code=0, wall_ms=80),
        StepResult(name="run", termination=Termination.SIGNALED, exit_code=139, signal=11, wall_ms=30,
                   stdout="before crash\n")]))
    client = make_client(runner)
    done = wait_until_terminal(client, submit(client).json()["id"])
    assert done["state"] == "RUNTIME_ERROR"
    assert done["summary"] == "Crashed with SIGSEGV"
    assert done["steps"][1]["signalName"] == "SIGSEGV"
    assert [d["code"] for d in done["diagnostics"]] == ["RUNTIME_SEGMENTATION_FAULT"]


def test_timeout_state(make_client):
    runner = FakeRunner(lambda job: ndjson_response(job, [
        StepResult(name="compile", termination=Termination.EXITED, exit_code=0, wall_ms=80),
        StepResult(name="run", termination=Termination.TIMEOUT, exit_code=137, wall_ms=5000)]))
    client = make_client(runner)
    done = wait_until_terminal(client, submit(client).json()["id"])
    assert done["state"] == "TIMEOUT"
    assert [d["code"] for d in done["diagnostics"]] == ["LIMIT_TIMEOUT"]


def test_unknown_language_is_422(make_client):
    response = submit(make_client(), language="brainfuck")
    assert response.status_code == 422
    assert "unknown language" in response.json()["detail"]


def test_missing_fields_are_422(make_client):
    assert make_client().post("/api/v1/executions", json={"languageId": "c"}).status_code == 422


def test_oversized_source_and_input_are_413(make_client):
    client = make_client(max_source_bytes=100, max_stdin_bytes=10)
    assert submit(client, source="x" * 101).status_code == 413
    assert submit(client, stdin="y" * 11).status_code == 413


def test_full_queue_is_refused_with_retry_after(make_client):
    client = make_client(dispatch_workers=0, max_queue=1)  # nothing dequeues
    first = submit(client)
    assert first.status_code == 202 and first.json()["queuePosition"] == 1
    second = submit(client)
    assert second.status_code == 503
    assert int(second.headers["retry-after"]) >= 1
    assert second.json()["retryAfterS"] == int(second.headers["retry-after"])


def test_unreachable_runner_is_an_internal_error(make_client):
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    client = make_client(transport=httpx.MockTransport(refuse))
    done = wait_until_terminal(client, submit(client).json()["id"])
    assert done["state"] == "INTERNAL_ERROR"
    assert "not reachable" in done["error"]
    assert [s["status"] for s in done["steps"]] == ["SKIPPED", "SKIPPED"]


def test_busy_runner_rejects_the_execution(make_client):
    runner = FakeRunner(lambda job: httpx.Response(503, headers={"Retry-After": "2"}, json={"detail": "busy"}))
    client = make_client(runner)
    done = wait_until_terminal(client, submit(client).json()["id"])
    assert done["state"] == "REJECTED"


def test_runner_side_error_is_surfaced(make_client):
    runner = FakeRunner(lambda job: ndjson_response(job, [], error="sandbox image missing"))
    client = make_client(runner)
    done = wait_until_terminal(client, submit(client).json()["id"])
    assert done["state"] == "INTERNAL_ERROR"
    assert done["error"] == "sandbox image missing"


def test_unknown_execution_is_404(make_client):
    assert make_client().get("/api/v1/executions/exe_nope").status_code == 404


def test_websocket_streams_snapshots_until_terminal(make_client, fake_runner):
    client = make_client(fake_runner)
    execution_id = submit(client).json()["id"]
    states = []
    with client.websocket_connect(f"/api/v1/executions/{execution_id}/events") as ws:
        while True:
            try:
                snapshot = ws.receive_json()
            except WebSocketDisconnect:  # server closed the socket after the terminal snapshot
                break
            states.append(snapshot["state"])
            if snapshot["terminal"]:
                break
    assert states[-1] == "SUCCEEDED"


def test_websocket_for_unknown_execution_closes_with_4404(make_client):
    client = make_client()
    with client.websocket_connect("/api/v1/executions/exe_missing/events") as ws:
        message = ws.receive()
    assert message["type"] == "websocket.close" and message["code"] == 4404


def test_health_reports_runner_and_queue(make_client):
    body = make_client().get("/api/v1/health").json()
    assert body["api"] == "ok"
    assert body["runner"]["status"] == "ok"
    assert body["queue"]["capacity"] == 20


def test_serves_the_built_web_app_without_hiding_api_errors(make_client, tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><title>app</title>")
    (tmp_path / "assets" / "app.js").write_text("console.log(1)")
    client = make_client(web_dist=tmp_path)
    assert "<title>app</title>" in client.get("/").text
    assert "<title>app</title>" in client.get("/some/client/route").text
    assert client.get("/assets/app.js").text == "console.log(1)"
    assert client.get("/api/v1/nope").status_code == 404
    assert client.get("/api/v1/languages").status_code == 200
