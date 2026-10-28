import { describe, expect, it } from "vitest";
import { isPublicIp } from "@/lib/audit/ip";

describe("isPublicIp", () => {
  const publicAddresses = [
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "2606:4700:4700::1111",
  ];

  const blockedAddresses = [
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "192.0.2.10",
    "198.18.0.1",
    "198.51.100.10",
    "203.0.113.10",
    "224.0.0.1",
    "240.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "::ffff:192.168.1.1",
  ];

  it.each(publicAddresses)("accepts public address %s", (address) => {
    expect(isPublicIp(address)).toBe(true);
  });

  it.each(blockedAddresses)("rejects internal or reserved address %s", (address) => {
    expect(isPublicIp(address)).toBe(false);
  });

  it("rejects values that are not IP addresses", () => {
    expect(isPublicIp("northlinegear.com")).toBe(false);
    expect(isPublicIp("127.0.0.1.nip.io")).toBe(false);
  });
});
