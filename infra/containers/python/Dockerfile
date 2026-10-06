# Sandbox image for Python (CPython 3.12, from the Ubuntu 24.04 archive).
#
# Same rules as the GCC image: student programs run in throw-away containers
# made from this image, with the limits set by the runner (read-only root
# filesystem, no network, all capabilities dropped, non-root user,
# memory/CPU/PID/time caps). Only the standard library is installed: there is
# no pip and no network, so third-party packages are not available (Black is
# installed for the formatter only).
#
# Reproducibility: for a deployment, pin the base image by digest
# (FROM ubuntu:24.04@sha256:<digest>). The runner records the image ID and the
# exact Python version with every execution.
FROM ubuntu:24.04

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 \
      # The "Sandbox Formatters" extension formats Python with Black (format_python.py).
      black \
 && rm -rf /var/lib/apt/lists/* \
 # Toolchain metadata read by the runner and stored with every execution.
 && mkdir -p /etc/compiler-copilot \
 && printf '{"name": "CPython", "version": "%s", "languages": ["python"]}\n' \
      "$(python3 -c 'import platform; print(platform.python_version())')" \
      > /etc/compiler-copilot/toolchain.json \
 # Defence in depth: no setuid/setgid binaries inside the sandbox.
 && find / -xdev -perm /6000 -type f -exec chmod a-s {} + \
 # Unprivileged sandbox user; UID/GID must match SANDBOX_UID in the runner.
 && groupadd --gid 10001 sandbox \
 && useradd --uid 10001 --gid 10001 --home-dir /tmp --no-create-home \
      --shell /usr/sbin/nologin sandbox \
 && mkdir -p /workspace \
 && chown 10001:10001 /workspace \
 && chmod 0755 /workspace

# The syntax check used by the Python profile's "compile" step.
COPY check_syntax.py /opt/code-drishti/check_syntax.py
# The notebook runner used by the "notebook" profile (Jupyter-style cells).
COPY notebook.py /opt/code-drishti/notebook.py
# The Python formatter used by the "fmt-python" profile.
COPY format_python.py /opt/code-drishti/format_python.py

ENV LANG=C.UTF-8 \
    HOME=/tmp

USER 10001:10001
WORKDIR /workspace
CMD ["python3", "--version"]
