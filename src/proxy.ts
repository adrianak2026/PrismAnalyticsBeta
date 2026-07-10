import { NextRequest, NextResponse } from "next/server";

/**
 * PrismAnalytics — Security Proxy (Next.js 16)
 * Runs before every route (except _next/static, favicon, etc.).
 * Implements strict security headers, CSP, HSTS, and bot filtering at edge.
 */

const BOT_UAS = ["curl/", "wget/", "python-requests", "go-http", "sqlmap", "nikto", "nuclei"];

export function proxy(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const path = req.nextUrl.pathname;

  // Allow health/version checks from monitoring (curl) — never block these
  const PUBLIC_API_ALLOWLIST = ["/api/health", "/api/version", "/api/track"];
  const isPublicApi = PUBLIC_API_ALLOWLIST.some((p) => path === p || path.startsWith(p + "?"));

  // Block obvious scanners on API (return 403, but allow browser + public allowlist)
  if (path.startsWith("/api/") && !isPublicApi && BOT_UAS.some((b) => ua.toLowerCase().includes(b.toLowerCase()))) {
    return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = NextResponse.next();

  // ── Security headers ──
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=()");
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // Remove fingerprinting headers
  res.headers.delete("X-Powered-By");
  res.headers.delete("Server");

  // ── CSP ──
  if (!path.startsWith("/api/")) {
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https: https://*.tile.openstreetmap.org",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://cloudflare-dns.com https://*.workers.dev",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
  } else {
    // API: strict CORS already handled in route, but add safety
    if (path === "/api/track") {
      // public endpoint needs wildcard, handled in route
    } else {
      res.headers.set("Access-Control-Allow-Origin", process.env.APP_URL || "");
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|robots.txt|sitemap.xml|og-image.png|apple-touch-icon.png).*)",
  ],
};
