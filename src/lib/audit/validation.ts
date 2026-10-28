const MAX_URL_LENGTH = 2048;

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
  ".test",
  ".invalid",
  ".example",
  ".onion",
];

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export type UrlValidationResult =
  | { ok: true; url: string; hostname: string }
  | { ok: false; message: string };

function hasValidDomainShape(hostname: string) {
  if (hostname.length > 253 || !hostname.includes(".")) return false;

  const labels = hostname.split(".");
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      !label.startsWith("-") &&
      !label.endsWith("-"),
  );
}

/**
 * Validates and normalises a URL entered by a visitor.
 *
 * This is intentionally stricter than a general-purpose URL parser. It only
 * accepts public website hostnames, so direct IP addresses and internal names
 * never reach the network layer. The server repeats this check and also
 * resolves the hostname to public IP addresses before connecting.
 */
export function validateAuditUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, message: "Enter your store URL to run an audit." };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      message: "That URL is too long. Use a normal store or product page URL.",
    };
  }

  if (/\s/.test(trimmed)) {
    return {
      ok: false,
      message: "Remove spaces from the URL and try again.",
    };
  }

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return {
      ok: false,
      message:
        "That does not look like a valid URL. Try something like https://your-store.com/products/example.",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      message: "Only public HTTP and HTTPS website URLs can be audited.",
    };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      message: "URLs containing usernames or passwords are not accepted.",
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");

  if (!hostname) {
    return { ok: false, message: "The URL is missing a website domain." };
  }

  if (hostname.startsWith("[") || hostname.includes(":")) {
    return {
      ok: false,
      message: "Use the store's domain name rather than an IP address.",
    };
  }

  if (IPV4_PATTERN.test(hostname)) {
    return {
      ok: false,
      message: "Use the store's domain name rather than an IP address.",
    };
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return {
      ok: false,
      message: "Local addresses cannot be audited. Enter a public store URL.",
    };
  }

  if (
    BLOCKED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix),
    )
  ) {
    return {
      ok: false,
      message:
        "That domain is reserved for local or private networks. Enter a public store URL.",
    };
  }

  if (!hasValidDomainShape(hostname)) {
    return {
      ok: false,
      message:
        "Enter a full public domain, such as your-store.com or your-store.com/products/example.",
    };
  }

  if (
    parsed.port &&
    !(
      (parsed.protocol === "http:" && parsed.port === "80") ||
      (parsed.protocol === "https:" && parsed.port === "443")
    )
  ) {
    return {
      ok: false,
      message: "Use a standard web address without a custom port number.",
    };
  }

  parsed.hash = "";
  parsed.hostname = hostname;

  return { ok: true, url: parsed.toString(), hostname };
}
