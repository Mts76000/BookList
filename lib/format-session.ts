const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Chrome\//, "Chrome"],
  [/CriOS\//, "Chrome"],
  [/FxiOS\//, "Firefox"],
  [/Firefox\//, "Firefox"],
  [/Version\/.*Safari\//, "Safari"],
];

const OS: [RegExp, string][] = [
  [/Windows/, "Windows"],
  // Checked before "Mac OS X": iOS user agents contain the literal substring
  // "like Mac OS X" (e.g. "iPhone; CPU iPhone OS 17_0 like Mac OS X").
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X/, "macOS"],
  [/Android/, "Android"],
  [/Linux/, "Linux"],
];

/** Turns a raw User-Agent string into "Chrome sur macOS" instead of showing it verbatim. */
export function formatUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return "Appareil inconnu";

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const os = OS.find(([pattern]) => pattern.test(userAgent))?.[1];

  if (browser && os) return `${browser} sur ${os}`;
  if (browser) return browser;
  if (os) return os;
  return "Appareil inconnu";
}

const LOOPBACK_PATTERNS = [/^127\./, /^::1$/, /^(0{1,4}:){7}0{1,4}$/, /^::$/];

/** Hides the noisy "0000:0000:...:0000" / "::1" loopback address dev/localhost produces. */
export function formatIp(ip: string | null | undefined): string {
  if (!ip) return "IP inconnue";
  if (LOOPBACK_PATTERNS.some((pattern) => pattern.test(ip))) return "Local";
  return ip;
}
