import { AuditScanError } from "@/lib/audit/errors";
import { checkRateLimit, getClientKey } from "@/lib/audit/rate-limit";
import { runLiveAudit } from "@/lib/audit/scanner";
import type {
  AuditErrorCode,
  AuditErrorPayload,
} from "@/lib/audit/types";
import { validateAuditUrl } from "@/lib/audit/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 4 * 1024;

class BodyTooLargeError extends Error {}
class InvalidBodyError extends Error {}

function errorResponse(
  code: AuditErrorCode,
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
  upstreamStatus?: number,
) {
  const payload: AuditErrorPayload = {
    error: {
      code,
      message,
      ...(upstreamStatus ? { upstreamStatus } : {}),
    },
  };

  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

async function readLimitedBody(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new BodyTooLargeError();
  }

  if (!request.body) throw new InvalidBodyError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const rawBody = await readLimitedBody(request);
    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new InvalidBodyError();
    }

    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as { url?: unknown }).url !== "string"
    ) {
      throw new InvalidBodyError();
    }

    const requestedUrl = (body as { url: string }).url;
    const validation = validateAuditUrl(requestedUrl);

    if (!validation.ok) {
      return errorResponse("INVALID_URL", validation.message, 400);
    }

    const rateLimit = checkRateLimit(getClientKey(request));
    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: {
            code: "RATE_LIMITED",
            message:
              "You have reached the free scan limit for now. Please wait a few minutes and try again.",
            retryAfterSeconds: rateLimit.retryAfterSeconds,
          },
        } satisfies AuditErrorPayload,
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const report = await runLiveAudit(validation.url);

    console.info("[audit] scan complete", {
      hostname: validation.hostname,
      status: report.httpStatus,
      durationMs: Date.now() - startedAt,
    });

    return Response.json(report, {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return errorResponse(
        "INVALID_REQUEST",
        "The request was too large.",
        413,
      );
    }

    if (error instanceof InvalidBodyError) {
      return errorResponse(
        "INVALID_REQUEST",
        "Send a JSON request containing a url field.",
        400,
      );
    }

    if (error instanceof AuditScanError) {
      console.warn("[audit] request failed", {
        code: error.code,
        httpStatus: error.httpStatus,
        upstreamStatus: error.upstreamStatus,
        durationMs: Date.now() - startedAt,
      });

      return errorResponse(
        error.code,
        error.message,
        error.httpStatus,
        undefined,
        error.upstreamStatus,
      );
    }

    console.error("[audit] unexpected failure", {
      durationMs: Date.now() - startedAt,
      error,
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Something went wrong while running the audit. Please try again.",
      500,
    );
  }
}
