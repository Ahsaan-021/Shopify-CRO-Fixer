import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPublicIp } from "@/lib/audit/ip";

export type HostResolver = (hostname: string) => Promise<string[]>;

export type TargetBlockReason =
  | "blocked-scheme"
  | "blocked-port"
  | "blocked-credentials"
  | "blocked-hostname"
  | "private-address"
  | "dns-failed"
  | "dns-timeout";

export type TargetDecision =
  | {
      ok: true;
      hostname: string;
      port: number;
      address: string;
      family: 4 | 6;
      url: URL;
    }
  | { ok: false; reason: TargetBlockReason };

const DNS_TIMEOUT_MS = 3_000;
const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".intranet",
  ".lan",
  ".corp",
  ".private",
];

function isBlockedHostname(hostname: string) {
  const normalised = hostname.replace(/\.$/, "").toLowerCase();
  if (!normalised) return true;
  if (normalised === "localhost") return true;
  if (BLOCKED_SUFFIXES.some((suffix) => normalised.endsWith(suffix))) {
    return true;
  }
  return false;
}

function resolveWithTimeout(
  hostname: string,
  resolver: HostResolver,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dns-timeout")), DNS_TIMEOUT_MS);

    resolver(hostname)
      .then((addresses) => {
        clearTimeout(timer);
        resolve(addresses);
      })
      .catch(() => {
        clearTimeout(timer);
        reject(new Error("dns-failed"));
      });
  });
}

const defaultResolver: HostResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
};

/**
 * Decides whether one browser request may leave the machine. Every hostname is
 * resolved for that request, every returned address must be public, and only
 * standard web ports are allowed. The browser proxy then connects to the exact
 * validated address, which closes the DNS-rebinding gap between the check and
 * the connection.
 */
export async function checkTarget(
  rawUrl: string,
  options: { resolver?: HostResolver; cache?: Map<string, string[]> } = {},
): Promise<TargetDecision> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "blocked-scheme" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "blocked-scheme" };
  }

  if (url.username || url.password) {
    return { ok: false, reason: "blocked-credentials" };
  }

  const expectedPort = url.protocol === "https:" ? "443" : "80";
  const port = url.port || expectedPort;
  if (port !== expectedPort) {
    return { ok: false, reason: "blocked-port" };
  }

  const hostname = url.hostname.replace(/\.$/, "").toLowerCase();
  if (isBlockedHostname(hostname)) {
    return { ok: false, reason: "blocked-hostname" };
  }

  let addresses: string[];

  if (isIP(hostname)) {
    addresses = [hostname];
  } else {
    const cached = options.cache?.get(hostname);
    if (cached) {
      addresses = cached;
    } else {
      try {
        addresses = await resolveWithTimeout(
          hostname,
          options.resolver ?? defaultResolver,
        );
      } catch (error) {
        return {
          ok: false,
          reason:
            error instanceof Error && error.message === "dns-timeout"
              ? "dns-timeout"
              : "dns-failed",
        };
      }
      options.cache?.set(hostname, addresses);
    }
  }

  if (addresses.length === 0) {
    return { ok: false, reason: "dns-failed" };
  }

  // Reject the whole hostname if any answer is inward. This is conservative and
  // stops split-answer tricks from slipping a private address into the pool.
  if (addresses.some((address) => !isPublicIp(address))) {
    return { ok: false, reason: "private-address" };
  }

  const selected =
    addresses.find((address) => isIP(address) === 4) ?? addresses[0];

  return {
    ok: true,
    hostname,
    port: Number(port),
    address: selected,
    family: isIP(selected) === 4 ? 4 : 6,
    url,
  };
}
