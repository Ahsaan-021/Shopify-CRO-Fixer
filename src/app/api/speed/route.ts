import { fetchPageSpeed } from "@/lib/audit/pagespeed";
import { checkRateLimit, getClientKey } from "@/lib/audit/rate-limit";
import type { AuditErrorCode, AuditErrorPayload } from "@/lib/audit/types";
import { validateAuditUrl } from "@/lib/audit/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 4 * 1024;
const SPEED_SCANS_PER_WINDOW = 10;
const SPEED_WINDOW_MS = 10 * 60 * 1000;

class BodyTooLargeError extends Error {}
class InvalidBodyError extends Error {}

function errorResponse(
  code: AuditErrorCode,
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
) {
  const payload: AuditErrorPayload = { error: { code, message } };

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

    if (!process.env.PAGESPEED_API_KEY?.trim()) {
      return Response.json(
        {
          status: "unavailable",
          code: "NO_KEY",
          message: "Speed data unavailable: PageSpeed API key not configured.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const rateLimit = checkRateLimit(`speed:${getClientKey(request)}`, {
      max: SPEED_SCANS_PER_WINDOW,
      windowMs: SPEED_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return errorResponse(
        "RATE_LIMITED",
        "You have reached the free speed-check limit for now. The rest of the report is unaffected.",
        429,
        { "Retry-After": String(rateLimit.retryAfterSeconds) },
      );
    }

    const result = await fetchPageSpeed(validation.url, {
      apiKey: process.env.PAGESPEED_API_KEY,
    });

    console.info("[speed] check complete", {
      status: result.status,
      code: result.status === "unavailable" ? result.code : undefined,
      durationMs: Date.now() - startedAt,
    });

    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return errorResponse("INVALID_REQUEST", "The request was too large.", 413);
    }

    if (error instanceof InvalidBodyError) {
      return errorResponse(
        "INVALID_REQUEST",
        "Send a JSON request containing a url field.",
        400,
      );
    }

    console.error("[speed] unexpected failure", {
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Something went wrong while checking speed. The rest of the report is unaffected.",
      500,
    );
  }
}
