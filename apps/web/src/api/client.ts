import type {
  AskAnswer,
  AssistantStatus,
  ChatTurn,
  Execution,
  Explanation,
  FixProposal,
  FixVerdict,
  Health,
  Language,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterS: number | null = null,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the API running?", 0);
  }
  if (!response.ok) {
    let detail = response.statusText || `HTTP ${response.status}`;
    let retryAfter: number | null = null;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join("; ");
      if (typeof body.retryAfterS === "number") retryAfter = body.retryAfterS;
    } catch {
      // not JSON; keep the status text
    }
    const header = response.headers.get("Retry-After");
    if (retryAfter === null && header && !Number.isNaN(Number(header))) retryAfter = Number(header);
    throw new ApiError(detail, response.status, retryAfter);
  }
  return (await response.json()) as T;
}

const post = <T,>(path: string, body: unknown, signal?: AbortSignal) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body), signal });

export const api = {
  languages: () => request<Language[]>("/api/v1/languages"),
  health: () => request<Health>("/api/v1/health"),
  getExecution: (id: string) => request<Execution>(`/api/v1/executions/${encodeURIComponent(id)}`),
  createExecution: (body: { languageId: string; source: string; stdin: string }) =>
    post<Execution>("/api/v1/executions", body),

  // Saarthi: every call is triggered by a student's click, never by typing.
  assistantStatus: () => request<AssistantStatus>("/api/v1/assistant/status"),
  explain: (body: { executionId: string; sourceHash: string; diagnosticId?: string | null; question?: string | null }) =>
    post<Explanation>("/api/v1/assistant/explain", body),
  fix: (body: { executionId: string; sourceHash: string; diagnosticId?: string | null }) =>
    post<FixProposal>("/api/v1/assistant/fix", body),
  verify: (body: { fixId: string; executionId: string }) => post<FixVerdict>("/api/v1/assistant/verify", body),
  ask: (body: {
    question: string;
    languageId?: string | null;
    executionId?: string | null;
    sourceHash?: string | null;
    source?: string | null;
    history?: ChatTurn[];
  }) => post<AskAnswer>("/api/v1/assistant/ask", body),
  // The one exception: AI autocomplete (an extension the student switches on)
  // asks for ghost text after a pause in typing, with the code around the cursor.
  complete: (body: { languageId: string; prefix: string; suffix: string; maxLines?: number }, signal?: AbortSignal) =>
    post<{ completion: string; provider: string; model: string; cached: boolean }>("/api/v1/assistant/complete", body, signal),
};

function websocketUrl(path: string): string {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}${path}`;
}

/**
 * Follow an execution until it reaches a terminal state.
 *
 * Uses the WebSocket event stream (a full snapshot per change) and falls back
 * to polling if the socket cannot be opened or drops early, e.g. behind a
 * proxy without WebSocket support. Returns a function that stops watching.
 */
export function watchExecution(
  id: string,
  onUpdate: (execution: Execution) => void,
  pollIntervalMs = 400,
): () => void {
  let stopped = false;
  let finished = false;
  let socket: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deliver = (execution: Execution) => {
    if (stopped) return;
    onUpdate(execution);
    if (execution.terminal) {
      finished = true;
      stop();
    }
  };

  const poll = async () => {
    if (stopped || finished) return;
    try {
      deliver(await api.getExecution(id));
    } catch {
      // transient; try again
    }
    if (!stopped && !finished) timer = setTimeout(poll, pollIntervalMs);
  };

  function stop() {
    stopped = true;
    clearTimeout(timer);
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
  }

  try {
    socket = new WebSocket(websocketUrl(`/api/v1/executions/${encodeURIComponent(id)}/events`));
    socket.onmessage = (event) => deliver(JSON.parse(event.data) as Execution);
    socket.onclose = () => {
      if (!stopped && !finished) void poll();
    };
  } catch {
    void poll();
  }
  return stop;
}
