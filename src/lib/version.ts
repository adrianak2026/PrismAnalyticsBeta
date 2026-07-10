/**
 * PrismAnalytics - Version & Build Info
 * Single source of truth for app version.
 */

export const VERSION = "1.0.0";
export const VERSION_NAME = "Prism — First Light";
export const BUILD_DATE = "2026-07-10";
export const BUILD_CHANNEL = "stable"; // stable | beta | canary

export const CHANGELOG = [
  {
    version: "1.0.0",
    name: "First Light",
    date: "2026-07-10",
    highlights: [
      "Privacy-first analytics with no cookies, no IP storage",
      "Multi-tenant with strict isolation",
      "12 framework tracking snippets (HTML, React, Next.js, Vue, Nuxt, Angular, Svelte, GTM, WordPress, Shopify, Webflow, Wix)",
      "Real-time live visitors (10s polling)",
      "World map visualization with 60+ countries",
      "MX/DNS email verification & disposable blocking",
      "Database-backed rate limiting & account lockout",
      "PBKDF2-SHA256 password hashing with timing-safe compare",
      "JWT + session revocation + audit logging",
      "CSV/JSON export + cascade deletion",
      "Dark theme (default), fully responsive",
    ],
  },
];

export function getVersionInfo() {
  return {
    version: VERSION,
    name: VERSION_NAME,
    buildDate: BUILD_DATE,
    channel: BUILD_CHANNEL,
    apiVersion: "v1",
    compatibility: {
      node: ">=18.0.0",
      cloudflare: "workers",
    },
  };
}
