import type { RenderedUnavailableCode } from "@/lib/audit/types";

export type RenderFailureCode = Exclude<RenderedUnavailableCode, "DISABLED">;

/**
 * A rendered-scan failure with a fixed, client-safe message. Raw browser
 * errors, hostnames, and addresses must never be attached.
 */
export class RenderFailure extends Error {
  readonly code: RenderFailureCode;

  constructor(code: RenderFailureCode, message: string) {
    super(message);
    this.name = "RenderFailure";
    this.code = code;
  }
}
