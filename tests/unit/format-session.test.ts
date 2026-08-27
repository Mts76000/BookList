import { describe, expect, it } from "vitest";
import { formatUserAgent, formatIp } from "@/lib/format-session";

describe("formatUserAgent", () => {
  it("recognizes Chrome on macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";
    expect(formatUserAgent(ua)).toBe("Chrome sur macOS");
  });

  it("recognizes Safari on iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1";
    expect(formatUserAgent(ua)).toBe("Safari sur iOS");
  });

  it("falls back to a generic label for null/empty input", () => {
    expect(formatUserAgent(null)).toBe("Appareil inconnu");
    expect(formatUserAgent("")).toBe("Appareil inconnu");
  });
});

describe("formatIp", () => {
  it("replaces loopback addresses with 'Local'", () => {
    expect(formatIp("127.0.0.1")).toBe("Local");
    expect(formatIp("::1")).toBe("Local");
    expect(formatIp("0000:0000:0000:0000:0000:0000:0000:0000")).toBe("Local");
  });

  it("passes through a real IP unchanged", () => {
    expect(formatIp("203.0.113.42")).toBe("203.0.113.42");
  });

  it("falls back to a generic label when missing", () => {
    expect(formatIp(null)).toBe("IP inconnue");
  });
});
