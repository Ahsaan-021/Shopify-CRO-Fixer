import { isIP } from "node:net";

const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function ipv4ToNumber(address: string) {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }

  return (
    (((parts[0] << 24) >>> 0) +
      (parts[1] << 16) +
      (parts[2] << 8) +
      parts[3]) >>>
    0
  );
}

function isPublicIpv4(address: string) {
  const value = ipv4ToNumber(address);
  if (value === null) return false;

  return BLOCKED_IPV4_RANGES.every(([network, prefix]) => {
    const base = ipv4ToNumber(network);
    if (base === null) return true;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (value & mask) >>> 0 !== (base & mask) >>> 0;
  });
}

function parseIpv6(address: string): number[] | null {
  const withoutZone = address.split("%")[0].toLowerCase();
  if (!withoutZone.includes(":")) return null;

  let working = withoutZone;

  if (working.includes(".")) {
    const lastColon = working.lastIndexOf(":");
    if (lastColon === -1) return null;
    const v4 = working.slice(lastColon + 1);
    const value = ipv4ToNumber(v4);
    if (value === null) return null;
    working = `${working.slice(0, lastColon)}:${((value >>> 16) & 0xffff).toString(16)}:${(value & 0xffff).toString(16)}`;
  }

  const halves = working.split("::");
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;

  if (halves.length === 1 && missing !== 0) return null;
  if (halves.length === 2 && missing < 1) return null;

  const hextets = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right,
  ];

  if (hextets.length !== 8) return null;

  const parsed = hextets.map((part) => {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return NaN;
    return Number.parseInt(part, 16);
  });

  return parsed.some(Number.isNaN) ? null : parsed;
}

function embeddedIpv4IsPublic(high: number, low: number) {
  const address = `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
  return isPublicIpv4(address);
}

function isPublicIpv6(address: string) {
  const hextets = parseIpv6(address);
  if (!hextets) return false;

  // IPv4-mapped and IPv4-compatible forms must be judged by their embedded IPv4.
  if (
    hextets.slice(0, 5).every((part) => part === 0) &&
    (hextets[5] === 0 || hextets[5] === 0xffff)
  ) {
    return embeddedIpv4IsPublic(hextets[6], hextets[7]);
  }

  // Only global unicast space is eligible.
  if (hextets[0] < 0x2000 || hextets[0] > 0x3fff) return false;

  // Documentation, Teredo, benchmarking, 6to4, deprecated 6bone, and
  // special-purpose blocks are not treated as public destinations.
  if (hextets[0] === 0x2001) {
    if (
      hextets[1] === 0x0000 ||
      hextets[1] === 0x0002 ||
      hextets[1] === 0x0db8 ||
      (hextets[1] >= 0x0010 && hextets[1] <= 0x002f)
    ) {
      return false;
    }
  }

  if (hextets[0] === 0x2002 || hextets[0] === 0x3ffe) return false;
  if (hextets[0] === 0x3fff && (hextets[1] & 0xf000) === 0) return false;

  return true;
}

export function isPublicIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version === 6) return isPublicIpv6(address);
  return false;
}
