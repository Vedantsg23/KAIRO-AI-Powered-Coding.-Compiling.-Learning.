import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "../api/client";
import type { AssistantStatus, ChatTurn, Explanation, FixProposal, FixVerdict } from "../api/types";
import { offlineAnswer, type OfflineContext } from "./offline";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  grounded?: "execution" | "source" | "none";
  error?: boolean;
  /** Answered by offline Saarthi (built-in knowledge), not by the AI model. */
  offline?: boolean;
}

export type Pending = null | "explain" | "fix" | "verify" | "ask";

export interface SaarthiApi {
  status: AssistantStatus | null;
  enabled: boolean;
  explanation: Explanation | null;
  fix: FixProposal | null;
  /** The source the fix was applied to, so it can be undone. */
  applied: { fixId: string; before: string } | null;
  verdict: FixVerdict | null;
  chat: ChatMessage[];
  pending: Pending;
  error: string | null;
  explain(args: { executionId: string; sourceHash: string; diagnosticId?: string | null; question?: string | null }): Promise<void>;
  suggestFix(args: { executionId: string; sourceHash: string; diagnosticId?: string | null }): Promise<void>;
  markApplied(fixId: string, before: string): void;
  verify(fixId: string, executionId: string): Promise<void>;
  /**
   * Ask a question. With an AI model on the server the model answers; without
   * one (or when it cannot answer) offline Saarthi answers from the context.
   */
  ask(
    args: {
      question: string;
      languageId: string;
      executionId?: string | null;
      sourceHash?: string | null;
      source?: string | null;
    },
    offline?: () => Omit<OfflineContext, "question" | "reason">,
  ): Promise<void>;
  dismissFix(): void;
  clearForLanguage(): void;
}

function message(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "Cannot reach the server. Is the API running?";
    return error.message;
  }
  return String(error);
}

/**
 * Saarthi's client state. Nothing here runs on a timer or on typing: every
 * request starts from a button the student pressed.
 */
export function useSaarthi(): SaarthiApi {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [fix, setFix] = useState<FixProposal | null>(null);
  const [applied, setApplied] = useState<{ fixId: string; before: string } | null>(null);
  const [verdict, setVerdict] = useState<FixVerdict | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const chatRef = useRef(chat);
  chatRef.current = chat;

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api
        .assistantStatus()
        .then((s) => !cancelled && setStatus(s))
        .catch(() => !cancelled && setStatus(null));
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const explain = useCallback<SaarthiApi["explain"]>(async (args) => {
    setPending("explain");
    setError(null);
    try {
      setExplanation(await api.explain(args));
    } catch (e) {
      setError(message(e));
    } finally {
      setPending(null);
    }
  }, []);

  const suggestFix = useCallback<SaarthiApi["suggestFix"]>(async (args) => {
    setPending("fix");
    setError(null);
    setVerdict(null);
    setApplied(null);
    try {
      setFix(await api.fix(args));
    } catch (e) {
      setFix(null);
      setError(message(e));
    } finally {
      setPending(null);
    }
  }, []);

  const verify = useCallback<SaarthiApi["verify"]>(async (fixId, executionId) => {
    setPending("verify");
    setError(null);
    try {
      setVerdict(await api.verify({ fixId, executionId }));
    } catch (e) {
      setError(message(e));
    } finally {
      setPending(null);
    }
  }, []);

  const statusRef = useRef(status);
  statusRef.current = status;

  const ask = useCallback<SaarthiApi["ask"]>(async ({ question, languageId, executionId, sourceHash, source }, offline) => {
    const history: ChatTurn[] = chatRef.current
      .filter((m) => !m.error && !m.offline)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
    setChat((all) => [...all, { role: "user", content: question }]);
    setPending("ask");
    setError(null);
    const answerOffline = (reason?: string) => {
      if (!offline) return false;
      const content = offlineAnswer({ ...offline(), question, reason });
      setChat((all) => [...all, { role: "assistant", content, offline: true }]);
      return true;
    };
    try {
      if (statusRef.current?.enabled !== true) {
        // No AI model on the server: answer at once from KAIRO's own knowledge.
        await new Promise((r) => setTimeout(r, 250));
        if (!answerOffline(statusRef.current?.reason ?? "no AI model is connected")) {
          setChat((all) => [...all, { role: "assistant", content: "Saarthi's AI model is not connected on this server.", error: true }]);
        }
        return;
      }
      const answer = await api.ask({ question, languageId, executionId, sourceHash, source, history });
      setChat((all) => [...all, { role: "assistant", content: answer.answer, grounded: answer.groundedOn }]);
    } catch (e) {
      // The model could not answer (offline server, rate limit, provider error): offline Saarthi steps in.
      const why = message(e);
      if (!answerOffline(why)) setChat((all) => [...all, { role: "assistant", content: why, error: true }]);
      else setChat((all) => [...all.slice(0, -1), { ...all[all.length - 1], content: `_The AI model did not answer (${why}), so here is what I know offline._\n\n${all[all.length - 1].content}` }]);
    } finally {
      setPending(null);
    }
  }, []);

  return {
    status,
    enabled: status?.enabled === true,
    explanation,
    fix,
    applied,
    verdict,
    chat,
    pending,
    error,
    explain,
    suggestFix,
    markApplied: useCallback((fixId: string, before: string) => {
      setApplied({ fixId, before });
      setVerdict(null);
    }, []),
    verify,
    ask,
    dismissFix: useCallback(() => {
      setFix(null);
      setApplied(null);
      setVerdict(null);
    }, []),
    clearForLanguage: useCallback(() => {
      setExplanation(null);
      setFix(null);
      setApplied(null);
      setVerdict(null);
      setError(null);
    }, []),
  };
}
