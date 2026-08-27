import Script from "next/script";
import { UMAMI_SCRIPT_URL } from "@/lib/umami";

/** Injected in production only. Never send personal data in custom Umami events. */
export function UmamiScript() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  if (process.env.NODE_ENV !== "production" || !websiteId) return null;

  return <Script src={UMAMI_SCRIPT_URL} data-website-id={websiteId} strategy="afterInteractive" />;
}
