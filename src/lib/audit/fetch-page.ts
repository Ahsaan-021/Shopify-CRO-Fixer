import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import type { IncomingHttpHeaders } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { RequestOptions } from "node:https";
import {
  brotliDecompressSync,
  gunzipSync,
  inflateSync,
} from "node:zlib";
import { AuditScanError } from "@/lib/audit/errors";
import { detectBlockedPage } from "@/lib/audit/blocked-page";
import {
  auditErrorForHttpStatus,
  unsupportedContentError,
} from "@/lib/audit/http-status-error";
import { isPublicIp } from "@/lib/audit/ip";
import { auditErrorForRequestFailure } from "@/lib/audit/request-errors";
import { validateAuditUrl } from "@/lib/audit/validation";
import type { AuditRedirect } from "@/lib/audit/types";

const DNS_TIMEOUT_MS = 3_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const MAX_JSON_BYTES = 1 * 1024 * 1024;
const MAX_REDIRECTS = 4;

const USER_AGENT =
  "ShopifyCROFixer/0.2 (free static audit and public product data; one page per request)";

type ResolvedTarget = {
  address: string;
  family: 4 | 6;
};

type ResourceKind = "html" | "json";

type ResourceRules = {
  accept: string;
  maxBytes: number;
  label: string;
  contentTypeOk: (contentType: string) => boolean;
  tooLargeMessage: string;
};

const RESOURCE_RULES: Record<ResourceKind, ResourceRules> = {
  html: {
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    maxBytes: MAX_HTML_BYTES,
    label: "page",
    contentTypeOk: (contentType) =>
      contentType.includes("text/html") ||
      contentType.includes("application/xhtml+xml"),
    tooLargeMessage:
      "The page returned more than 2 MB of HTML, so the audit stopped.",
  },
  json: {
    accept: "application/json,text/json;q=0.9,*/*;q=0.1",
    maxBytes: MAX_JSON_BYTES,
    label: "product data",
    contentTypeOk: (contentType) =>
      contentType.includes("application/json") ||
      contentType.includes("+json") ||
      contentType.includes("text/json"),
    tooLargeMessage:
      "The product data returned more than 1 MB of JSON, so it could not be read.",
  },
};

type ResourceResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  text: string;
  bytes: number;
  redirectTo: string | null;
};

type RedirectableResponse = {
  status: number;
  redirectTo: string | null;
};

export type PageResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  html: string;
  bytes: number;
  redirectTo: string | null;
};

export type JsonResponse = {
  status: number;
  headers: IncomingHttpHeaders;
  text: string;
  bytes: number;
  redirectTo: string | null;
};

export type PageRequest = (
  url: URL,
  deadline: number,
) => Promise<PageResponse>;

export type JsonRequest = (
  url: URL,
  deadline: number,
) => Promise<JsonResponse>;

export type FetchedPage = {
  finalUrl: string;
  status: number;
  html: string;
  bytes: number;
  redirects: AuditRedirect[];
  xRobotsTag: string;
};

export type FetchedJson = {
  finalUrl: string;
  status: number;
  text: string;
  bytes: number;
  redirects: AuditRedirect[];
};

async function resolvePublicTarget(url: URL): Promise<ResolvedTarget> {
  let records;

  try {
    records = await new Promise<LookupAddress[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new AuditScanError(
            "DNS_TIMEOUT",
            "The domain took too long to resolve. Try again in a moment.",
            504,
          ),
        );
      }, DNS_TIMEOUT_MS);

      lookup(url.hostname, { all: true, verbatim: true })
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(() => {
          clearTimeout(timer);
          reject(
            new AuditScanError(
              "DNS_FAILED",
              "We could not find that domain. Check the store URL and try again.",
            ),
          );
        });
    });
  } catch (error) {
    if (error instanceof AuditScanError) throw error;
    throw new AuditScanError(
      "DNS_FAILED",
      "We could not find that domain. Check the store URL and try again.",
    );
  }

  if (records.length === 0) {
    throw new AuditScanError(
      "DNS_FAILED",
      "That domain did not resolve to a website. Check the URL and try again.",
    );
  }

  // Reject the whole hostname if any resolved record points inward. This is
  // deliberately conservative and closes split-answer / rebinding tricks.
  if (records.some((record) => !isPublicIp(record.address))) {
    throw new AuditScanError(
      "UNSAFE_TARGET",
      "That address points to a private or internal network, so it cannot be audited.",
      400,
    );
  }

  const selected =
    records.find((record) => record.family === 4) ?? records[0];

  return {
    address: selected.address,
    family: selected.family as 4 | 6,
  };
}

function decodeBody(
  body: Buffer,
  encodingHeader: string,
  contentType: string,
  rules: ResourceRules,
): string {
  const encoding = encodingHeader.trim().toLowerCase();
  let decoded: Buffer;

  try {
    if (!encoding || encoding === "identity") {
      decoded = body;
    } else if (encoding === "gzip" || encoding === "x-gzip") {
      decoded = gunzipSync(body, { maxOutputLength: rules.maxBytes });
    } else if (encoding === "deflate") {
      decoded = inflateSync(body, { maxOutputLength: rules.maxBytes });
    } else if (encoding === "br") {
      decoded = brotliDecompressSync(body, {
        maxOutputLength: rules.maxBytes,
      });
    } else {
      throw new AuditScanError(
        "UNSUPPORTED_ENCODING",
        `The ${rules.label} used a response encoding this scanner cannot read safely.`,
      );
    }
  } catch (error) {
    if (error instanceof AuditScanError) throw error;

    const code =
      typeof error === "object" && error !== null
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    const message = error instanceof Error ? error.message : "";

    if (
      code === "ERR_BUFFER_TOO_LARGE" ||
      /max(imum)?\s*output|larger than|output length/i.test(message)
    ) {
      throw new AuditScanError("RESPONSE_TOO_LARGE", rules.tooLargeMessage);
    }

    throw new AuditScanError(
      "INVALID_RESPONSE",
      `The ${rules.label}'s compressed response could not be decoded, so the audit stopped.`,
    );
  }

  if (decoded.length > rules.maxBytes) {
    throw new AuditScanError("RESPONSE_TOO_LARGE", rules.tooLargeMessage);
  }

  const charsetMatch = /charset\s*=\s*"?([^";\s]+)/i.exec(contentType);
  const charset = charsetMatch?.[1] ?? "utf-8";

  try {
    return new TextDecoder(charset, { fatal: false }).decode(decoded);
  } catch {
    throw new AuditScanError(
      "UNSUPPORTED_ENCODING",
      `The ${rules.label} used a text encoding this scanner cannot read safely.`,
    );
  }
}

export function decodeHtml(
  body: Buffer,
  encodingHeader: string,
  contentType: string,
): string {
  return decodeBody(body, encodingHeader, contentType, RESOURCE_RULES.html);
}

async function requestResource(
  url: URL,
  deadline: number,
  kind: ResourceKind,
): Promise<ResourceResponse> {
  const rules = RESOURCE_RULES[kind];
  const target = await resolvePublicTarget(url);
  const remaining = deadline - Date.now();

  if (remaining < 500) {
    throw new AuditScanError(
      "TIMEOUT",
      "The audit took too long to complete. Try again with a lighter page.",
      504,
    );
  }

  const timeoutMs = Math.min(REQUEST_TIMEOUT_MS, remaining);
  const isHttps = url.protocol === "https:";
  const transport = isHttps ? httpsRequest : httpRequest;
  const options: RequestOptions = {
    protocol: url.protocol,
    hostname: target.address,
    family: target.family,
    port: url.port || (isHttps ? 443 : 80),
    path: `${url.pathname}${url.search}`,
    method: "GET",
    agent: false,
    rejectUnauthorized: true,
    servername: url.hostname,
    headers: {
      Host: url.host,
      "User-Agent": USER_AGENT,
      Accept: rules.accept,
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Connection: "close",
    },
  };

  return new Promise<ResourceResponse>((resolve, reject) => {
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };

    const fail = (error: unknown) => {
      finish(() => {
        reject(auditErrorForRequestFailure(error));
      });
    };

    const timer = setTimeout(() => {
      fail(
        new AuditScanError(
          "TIMEOUT",
          "The page took too long to respond. Try again or audit a lighter page.",
          504,
        ),
      );
      request.destroy();
    }, timeoutMs);

    const request = transport(options, (response) => {
      const status = response.statusCode ?? 0;
      const headers = response.headers;
      const location = Array.isArray(headers.location)
        ? headers.location[0]
        : headers.location;

      if (
        [301, 302, 303, 307, 308].includes(status) &&
        typeof location === "string" &&
        location.length > 0
      ) {
        response.resume();
        finish(() =>
          resolve({
            status,
            headers,
            text: "",
            bytes: 0,
            redirectTo: location,
          }),
        );
        return;
      }

      if (status < 200 || status >= 300) {
        response.resume();
        fail(auditErrorForHttpStatus(status));
        return;
      }

      const contentType = String(headers["content-type"] ?? "").toLowerCase();
      if (!rules.contentTypeOk(contentType)) {
        response.resume();
        fail(unsupportedContentError(contentType, kind));
        return;
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;

      response.on("data", (chunk: Buffer) => {
        totalBytes += chunk.length;

        if (totalBytes > rules.maxBytes) {
          fail(new AuditScanError("RESPONSE_TOO_LARGE", rules.tooLargeMessage));
          response.destroy();
          request.destroy();
          return;
        }

        chunks.push(chunk);
      });

      response.on("error", fail);
      response.on("end", () => {
        try {
          const body = Buffer.concat(chunks);
          const text = decodeBody(
            body,
            String(headers["content-encoding"] ?? ""),
            contentType,
            rules,
          );

          if (kind === "html") {
            const blocked = detectBlockedPage(text);
            if (blocked) {
              throw new AuditScanError("BLOCKED_BY_SITE", blocked.message);
            }
          }

          finish(() =>
            resolve({
              status,
              headers,
              text,
              bytes: Buffer.byteLength(text, "utf8"),
              redirectTo: null,
            }),
          );
        } catch (error) {
          fail(error);
        }
      });
    });

    request.on("error", fail);
    request.end();
  });
}

async function requestPage(
  url: URL,
  deadline: number,
): Promise<PageResponse> {
  const resource = await requestResource(url, deadline, "html");
  return {
    status: resource.status,
    headers: resource.headers,
    html: resource.text,
    bytes: resource.bytes,
    redirectTo: resource.redirectTo,
  };
}

async function requestJson(
  url: URL,
  deadline: number,
): Promise<JsonResponse> {
  const resource = await requestResource(url, deadline, "json");
  return {
    status: resource.status,
    headers: resource.headers,
    text: resource.text,
    bytes: resource.bytes,
    redirectTo: resource.redirectTo,
  };
}

async function followRedirects<T extends RedirectableResponse>(
  inputUrl: string,
  deadline: number,
  requestFn: (url: URL, deadline: number) => Promise<T>,
): Promise<{ finalUrl: string; response: T; redirects: AuditRedirect[] }> {
  const currentValidation = validateAuditUrl(inputUrl);
  if (!currentValidation.ok) {
    throw new AuditScanError("INVALID_URL", currentValidation.message, 400);
  }

  let currentUrl = new URL(currentValidation.url);
  const redirects: AuditRedirect[] = [];

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (Date.now() >= deadline) {
      throw new AuditScanError(
        "TIMEOUT",
        "The audit took too long to complete. Try again with a lighter page.",
        504,
      );
    }

    const response = await requestFn(currentUrl, deadline);

    if (!response.redirectTo) {
      return { finalUrl: currentUrl.toString(), response, redirects };
    }

    if (hop === MAX_REDIRECTS) {
      throw new AuditScanError(
        "TOO_MANY_REDIRECTS",
        "The page redirected too many times, so the audit stopped.",
      );
    }

    let nextUrl: URL;
    try {
      nextUrl = new URL(response.redirectTo, currentUrl);
    } catch {
      throw new AuditScanError(
        "INVALID_URL",
        "The page redirected to an invalid address, so the audit stopped.",
      );
    }

    const nextValidation = validateAuditUrl(nextUrl.toString());
    if (!nextValidation.ok) {
      throw new AuditScanError(
        "UNSAFE_TARGET",
        "The page redirected to an address that cannot be audited safely.",
        400,
      );
    }

    redirects.push({
      from: currentUrl.toString(),
      to: nextValidation.url,
      status: response.status,
    });
    currentUrl = new URL(nextValidation.url);
  }

  throw new AuditScanError(
    "TOO_MANY_REDIRECTS",
    "The page redirected too many times, so the audit stopped.",
  );
}

export async function fetchPublicHtml(
  inputUrl: string,
  deadline: number,
  requestPageFn: PageRequest = requestPage,
): Promise<FetchedPage> {
  const { finalUrl, response, redirects } = await followRedirects(
    inputUrl,
    deadline,
    requestPageFn,
  );

  const xRobotsTag = Array.isArray(response.headers["x-robots-tag"])
    ? response.headers["x-robots-tag"].join(", ")
    : String(response.headers["x-robots-tag"] ?? "");

  return {
    finalUrl,
    status: response.status,
    html: response.html,
    bytes: response.bytes,
    redirects,
    xRobotsTag,
  };
}

/**
 * Fetches public Shopify product JSON through exactly the same DNS, IP-pinning,
 * redirect, timeout, encoding, and size controls as the HTML page fetch.
 */
export async function fetchPublicJson(
  inputUrl: string,
  deadline: number,
  requestJsonFn: JsonRequest = requestJson,
): Promise<FetchedJson> {
  const { finalUrl, response, redirects } = await followRedirects(
    inputUrl,
    deadline,
    requestJsonFn,
  );

  return {
    finalUrl,
    status: response.status,
    text: response.text,
    bytes: response.bytes,
    redirects,
  };
}
