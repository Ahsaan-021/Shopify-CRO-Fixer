import type { AuditErrorCode } from "@/lib/audit/types";

export class AuditScanError extends Error {
  readonly code: AuditErrorCode;
  readonly httpStatus: number;
  readonly upstreamStatus?: number;

  constructor(
    code: AuditErrorCode,
    message: string,
    httpStatus = 422,
    upstreamStatus?: number,
  ) {
    super(message);
    this.name = "AuditScanError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.upstreamStatus = upstreamStatus;
  }
}
