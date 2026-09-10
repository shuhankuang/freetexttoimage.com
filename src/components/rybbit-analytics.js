import "server-only";
import Script from "next/script";

export default function RybbitAnalytics() {
  const scriptUrl = process.env.RYBBIT_SCRIPT_URL;
  const siteId = process.env.RYBBIT_SITE_ID;

  if (!scriptUrl || !siteId) return null;

  return (
    <Script
      src={scriptUrl}
      data-site-id={siteId}
      strategy="afterInteractive"
    />
  );
}
