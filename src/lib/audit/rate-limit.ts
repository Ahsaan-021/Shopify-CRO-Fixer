const WINDOW_MS = 10 * 60 * 1000;
const MAX_SCANS_PER_WINDOW = 5;

type RateLimitEntry = {
  timestamps: number[];
};

type RateLimitStore = Map<string, RateLimitEntry>;

const globalStore = globalThis as typeof globalThis & {
  __croFixerRateLimits?: RateLimitStore;
};

const store: RateLimitStore =
  globalStore.__croFixerRateLimits ?? new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  globalStore.__croFixerRateLimits = store;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Small in-memory limiter for the initial version.
 *
 * It is intentionally best-effort: serverless deployments can run multiple
 * isolated instances. Replace this with a shared store (for example Redis)
 * before exposing the audit API to substantial traffic.
 */
export function checkRateLimit(
  key: string,
  options: { max?: number; windowMs?: number } = {},
): RateLimitResult {
  const windowMs = options.windowMs ?? WINDOW_MS;
  const max = options.max ?? MAX_SCANS_PER_WINDOW;
  const now = Date.now();
  const cutoff = now - windowMs;
  const entry = store.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter(
    (timestamp) => timestamp > cutoff,
  );

  if (entry.timestamps.length >= max) {
    const oldest = entry.timestamps[0];
    store.set(key, entry);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + windowMs - now) / 1000),
      ),
    };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  // Prevent the map from growing forever on a long-lived process.
  if (store.size > 5000) {
    for (const [storedKey, storedEntry] of store) {
      if (storedEntry.timestamps.every((timestamp) => timestamp <= cutoff)) {
        store.delete(storedKey);
      }
    }
  }

  return {
    allowed: true,
    remaining: max - entry.timestamps.length,
    retryAfterSeconds: 0,
  };
}

export function getClientKey(request: Request) {
  // These headers are deployment-dependent. This limiter is a speed bump,
  // not the scanner's primary security control.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
