import { describe, expect, it } from "vitest";
import { validateAuditUrl } from "@/lib/audit/validation";

describe("validateAuditUrl", () => {
  it("accepts a bare public domain and adds HTTPS", () => {
    expect(validateAuditUrl("northlinegear.com")).toEqual({
      ok: true,
      hostname: "northlinegear.com",
      url: "https://northlinegear.com/",
    });
  });

  it("preserves a public path and query string", () => {
    expect(
      validateAuditUrl("northlinegear.com/products/trail-runner-2?variant=42"),
    ).toEqual({
      ok: true,
      hostname: "northlinegear.com",
      url: "https://northlinegear.com/products/trail-runner-2?variant=42",
    });
  });

  it("normalises the hostname and removes the fragment", () => {
    expect(validateAuditUrl("https://NorthlineGear.com/About#team")).toEqual({
      ok: true,
      hostname: "northlinegear.com",
      url: "https://northlinegear.com/About",
    });
  });

  it("allows an explicit default HTTP port", () => {
    expect(validateAuditUrl("http://northlinegear.com:80/shop")).toEqual({
      ok: true,
      hostname: "northlinegear.com",
      url: "http://northlinegear.com/shop",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(validateAuditUrl("  https://northlinegear.com/shop  ").ok).toBe(true);
  });

  const rejectedInputs: Array<[string, string]> = [
    ["", "empty input"],
    ["   ", "whitespace only"],
    ["not a url", "spaces in input"],
    ["ftp://northlinegear.com", "unsupported protocol"],
    ["file:///etc/passwd", "local file protocol"],
    ["https://user:pass@northlinegear.com", "embedded credentials"],
    ["http://localhost:3000", "localhost"],
    ["http://localhost./", "localhost with trailing dot"],
    ["http://127.0.0.1", "loopback IPv4"],
    ["http://10.0.0.5", "private IPv4"],
    ["http://192.168.1.1", "private IPv4 range"],
    ["http://169.254.169.254", "link-local metadata address"],
    ["http://[::1]/", "loopback IPv6"],
    ["http://0x7f000001/", "hex-encoded loopback IP"],
    ["https://2130706433/", "decimal-encoded loopback IP"],
    ["https://northlinegear.local", "local suffix"],
    ["https://intranet", "single-label hostname"],
    ["https://northlinegear.internal", "internal suffix"],
    ["https://example.test", "reserved test suffix"],
    ["https://shop.example", "reserved example suffix"],
    ["https://northlinegear.com:8443/", "non-standard port"],
    [`https://northlinegear.com/${"a".repeat(2100)}`, "overlong URL"],
  ];

  it.each(rejectedInputs)("rejects %s (%s)", (input) => {
    expect(validateAuditUrl(input).ok).toBe(false);
  });

  it("returns a readable message instead of throwing", () => {
    const result = validateAuditUrl("http://127.0.0.1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message.length).toBeGreaterThan(10);
      expect(result.message).not.toContain("127.0.0.1");
    }
  });
});
