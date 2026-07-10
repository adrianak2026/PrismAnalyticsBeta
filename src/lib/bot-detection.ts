const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /headless/i, /puppeteer/i, /playwright/i, /selenium/i,
  /phantom/i, /nightmare/i, /electron/i, /googlebot/i, /bingbot/i, /yandex/i, /baidu/i,
  /duckduck/i, /slurp/i, /facebookexternal/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /telegram/i, /discord/i, /slack/i, /skype/i, /wget/i, /curl/i,
  /python-requests/i, /go-http/i, /java\//i, /okhttp/i, /axios/i, /node-fetch/i,
  /lighthouse/i, /pagespeed/i, /gtmetrix/i, /pingdom/i, /uptime/i, /monitor/i,
  /scanner/i, /nikto/i, /nmap/i, /sqlmap/i, /nuclei/i, /burpsuite/i, /zap/i,
  /preview/i, /screenshot/i, /snapshot/i,
];

export function isBot(userAgent: string | null): boolean {
  if (!userAgent || userAgent.length < 5 || userAgent.length > 1000) return true;
  return BOT_PATTERNS.some((re) => re.test(userAgent));
}

export function detectDevice(userAgent: string | null): "Mobile" | "Tablet" | "Desktop" | "Unknown" {
  if (!userAgent) return "Unknown";
  if (/ipad|tablet|playbook|silk|kindle/i.test(userAgent)) return "Tablet";
  if (/mobile|iphone|ipod|android(?!.*tablet)|blackberry|opera mini|windows phone/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

export function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/opr\/|opera/i.test(userAgent)) return "Opera";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  if (/samsungbrowser/i.test(userAgent)) return "Samsung";
  return "Other";
}

export function detectOS(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  if (/windows nt 10/i.test(userAgent)) return "Windows 10/11";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/mac os|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  if (/cros/i.test(userAgent)) return "ChromeOS";
  return "Other";
}

// Detect SQL injection, XSS, path traversal patterns
export function containsMaliciousPattern(input: string): boolean {
  const patterns = [
    /(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b.*\bwhere\b)/i,
    /(\bdrop\b\s+\btable\b|\bexec\b\s*\()/i,
    /<script[\s>]|javascript:|on\w+\s*=\s*["']/i,
    /\.\.\/|\.\.\\|%2e%2e/i,
    /\bor\b\s+1\s*=\s*1|\band\b\s+1\s*=\s*1/i,
  ];
  return patterns.some((re) => re.test(input));
}
