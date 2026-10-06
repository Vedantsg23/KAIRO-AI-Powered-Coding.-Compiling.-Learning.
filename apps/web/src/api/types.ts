// Friendly names for the generated OpenAPI types (see src/api/schema.ts,
// regenerate with `npm run gen:api` after changing the API contracts).
import type { components } from "./schema";

type Schemas = components["schemas"];

export type Execution = Schemas["ExecutionOut"];
export type ExecutionStep = Schemas["ExecutionStepOut"];
export type ExecutionState = Schemas["ExecutionState"];
export type Diagnostic = Schemas["Diagnostic"];
export type SourceRange = Schemas["SourceRange"];
export type RelatedLocation = Schemas["RelatedLocation"];
export type RawOutputReference = Schemas["RawOutputReference"];
export type Language = Schemas["LanguageOut"];
export type LanguageStep = Schemas["LanguageStepOut"];
export type Severity = Schemas["Severity"];
export type Category = Schemas["Category"];

// Saarthi, the AI assistant
export type AssistantStatus = Schemas["AssistantStatusOut"];
export type Explanation = Schemas["ExplanationOut"];
export type FixProposal = Schemas["FixOut"];
export type FixVerdict = Schemas["VerifyOut"];
export type AskAnswer = Schemas["AskOut"];
export type ChatTurn = Schemas["ChatTurnIn"];

/** GET /api/v1/health (not modelled in OpenAPI because it is diagnostic only). */
export interface Health {
  status: "ok" | "degraded";
  api: string;
  runner: {
    status: "ok" | "degraded" | "unreachable";
    docker?: boolean;
    images?: Record<string, string | null>;
    workers?: number;
    inFlight?: number;
  };
  queue: { depth: number; capacity: number; workers: number };
}
