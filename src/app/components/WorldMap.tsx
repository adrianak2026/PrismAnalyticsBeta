"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Simplified world map — inline SVG paths for ~50 major countries covering ~95% of typical web traffic.
// Uses ISO-3166 alpha-2 codes. Regions are simplified polygons of country outlines.
const COUNTRIES: Record<string, { name: string; flag: string; path: string }> = {
  US: { name: "United States", flag: "🇺🇸", path: "M158 145l-8 4-6-1-5 3-4-2-8 3-6 7-3 6 2 5-3 4 4 6 5 2 7-1 4 3 6-2 5 1 4 5 7 2 8-3 5 4 6-1 4 3 3-4-2-7 3-6-2-5-4-3-5 2-6-4-4-2-2-6-5-2-3-6-2-5z" },
  CA: { name: "Canada", flag: "🇨🇦", path: "M120 75l-5 3-4-1-6 2-3 5 2 6 4 3 5-1 3 4 6 1 5-3 8 1 6-2 4-4 7-1 5-3 4 1 5-3 3-4 6-1 4-3 5 1 4-3-1-5-4-2-5 2-6-1-5-3-7 1-5-2-6 2-4-3-5 1-6 3-5-1-4 3-6-1-3 4-5 1z" },
  MX: { name: "Mexico", flag: "🇲🇽", path: "M155 195l-3 5 2 4 5 2 3 4 6-1 4 3 5-1 3-4-1-5-4-3-3-4-5-1-4-3-6 1-2 3z" },
  BR: { name: "Brazil", flag: "🇧🇷", path: "M225 245l-5 3-3 6 1 8 4 5 3 7-1 6 3 5 5 3 6-1 4-4 5-3 4 1 5-3 2-5-1-6-4-4-3-6 1-5-3-5-5-2-7 1-6-2-4-3-4 2z" },
  AR: { name: "Argentina", flag: "🇦🇷", path: "M220 305l-2 6 1 5 3 6-1 5 3 4 5-1 3-4-1-5 2-5-2-6-3-4-5-1-3-2z" },
  GB: { name: "United Kingdom", flag: "🇬🇧", path: "M330 125l-2 3 1 4 3 2 4-1 2-3-1-4-3-2-4 1z" },
  DE: { name: "Germany", flag: "🇩🇪", path: "M348 135l-2 4 1 4 4 2 4-1 2-4-1-4-4-2-4 1z" },
  FR: { name: "France", flag: "🇫🇷", path: "M335 145l-3 3 1 5 4 3 5-1 2-4-1-4-4-3-4 1z" },
  ES: { name: "Spain", flag: "🇪🇸", path: "M325 160l-3 3 1 4 4 2 5-1 2-3-1-4-4-2-4 1z" },
  IT: { name: "Italy", flag: "🇮🇹", path: "M355 155l-2 4 1 5 3 3 4-1 2-4-1-4-3-3-4 0z" },
  NL: { name: "Netherlands", flag: "🇳🇱", path: "M343 130l-1 2 1 2 2 1 2-1 1-2-1-2-2-1-2 1z" },
  SE: { name: "Sweden", flag: "🇸🇪", path: "M360 105l-2 4 1 6 3 3 4-1 2-4-1-5-3-3-4 0z" },
  NO: { name: "Norway", flag: "🇳🇴", path: "M355 100l-3 4 1 5 3 3 4-1 2-4-1-4-3-3-3 0z" },
  PL: { name: "Poland", flag: "🇵🇱", path: "M365 135l-2 3 1 4 3 2 4-1 2-3-1-4-3-2-4 1z" },
  RU: { name: "Russia", flag: "🇷🇺", path: "M420 105l-8 3-6 5-4 6 2 5 5 4 7-1 6 3 8-1 6 3 9-1 8 3 6-2 8 1 5-4 4-6-2-5-6-3-8 1-6-3-8-2-6 1-8-3-7 0-5-2-4 2z" },
  CN: { name: "China", flag: "🇨🇳", path: "M475 165l-6 4-3 6 2 5 5 3 4 4 6-1 5 3 6-2 5-3 3-5-1-5-4-4-6-2-5-3-4-2-7 2z" },
  JP: { name: "Japan", flag: "🇯🇵", path: "M540 165l-3 3 1 5 3 3 4-1 2-4-1-4-3-3-3 1z" },
  IN: { name: "India", flag: "🇮🇳", path: "M455 200l-3 5 1 6 3 5 4 3 5-1 3-4-1-5-3-5-4-3-5-1z" },
  AU: { name: "Australia", flag: "🇦🇺", path: "M510 285l-6 4-4 5 1 6 4 4 6 2 6-1 5-3 4-5-1-5-4-4-6-2-5-1z" },
  NZ: { name: "New Zealand", flag: "🇳🇿", path: "M555 315l-3 3 1 4 3 2 3-1 2-3-1-3-3-2-2 0z" },
  ZA: { name: "South Africa", flag: "🇿🇦", path: "M370 285l-4 4 1 5 3 3 5-1 3-4-1-4-3-3-4 0z" },
  EG: { name: "Egypt", flag: "🇪🇬", path: "M375 195l-3 3 1 4 3 2 4-1 2-3-1-4-3-2-3 1z" },
  NG: { name: "Nigeria", flag: "🇳🇬", path: "M345 235l-3 3 1 4 3 2 4-1 2-3-1-4-3-2-3 1z" },
  KE: { name: "Kenya", flag: "🇰🇪", path: "M395 250l-2 3 1 4 3 2 3-1 2-3-1-3-3-2-3 0z" },
  KR: { name: "South Korea", flag: "🇰🇷", path: "M525 160l-2 2 1 3 2 2 3-1 1-2-1-3-2-2-2 1z" },
  TH: { name: "Thailand", flag: "🇹🇭", path: "M490 210l-2 3 1 4 3 2 3-1 2-3-1-3-3-2-3 0z" },
  ID: { name: "Indonesia", flag: "🇮🇩", path: "M505 250l-5 3 1 4 4 2 5-1 4-2 1-4-4-2-3-1-3 1z" },
  PH: { name: "Philippines", flag: "🇵🇭", path: "M525 220l-2 3 1 4 3 2 3-1 2-3-1-3-3-2-3 0z" },
  VN: { name: "Vietnam", flag: "🇻🇳", path: "M498 205l-2 4 1 4 3 2 3-1 2-3-1-4-3-2-3 0z" },
  MY: { name: "Malaysia", flag: "🇲🇾", path: "M495 235l-3 2 1 3 3 2 4-1 2-2-1-3-3-2-3 1z" },
  SG: { name: "Singapore", flag: "🇸🇬", path: "M496 240l-1 1 0 2 1 1 2 0 1-1 0-2-1-1-2 0z" },
  TR: { name: "Turkey", flag: "🇹🇷", path: "M385 165l-4 3 1 4 4 2 5-1 3-3-1-4-4-2-4 1z" },
  SA: { name: "Saudi Arabia", flag: "🇸🇦", path: "M400 200l-4 4 1 5 3 3 5-1 3-4-1-4-3-3-4 0z" },
  IL: { name: "Israel", flag: "🇮🇱", path: "M385 190l-1 2 1 2 1 1 2-1 1-2-1-2-2-1-1 1z" },
  AE: { name: "UAE", flag: "🇦🇪", path: "M420 205l-2 2 1 3 2 2 3-1 1-2-1-3-2-2-2 1z" },
  IR: { name: "Iran", flag: "🇮🇷", path: "M420 180l-4 3 1 5 3 3 5-1 3-3-1-5-4-2-3 0z" },
  PK: { name: "Pakistan", flag: "🇵🇰", path: "M445 195l-3 3 1 4 3 2 4-1 2-3-1-4-3-2-3 1z" },
  UA: { name: "Ukraine", flag: "🇺🇦", path: "M380 140l-3 3 1 4 3 2 4-1 2-3-1-4-3-2-3 1z" },
  RO: { name: "Romania", flag: "🇷🇴", path: "M373 145l-2 2 1 3 2 2 3-1 1-2-1-3-2-2-2 1z" },
  GR: { name: "Greece", flag: "🇬🇷", path: "M370 165l-2 3 1 3 3 2 3-1 1-3-1-3-3-2-2 1z" },
  PT: { name: "Portugal", flag: "🇵🇹", path: "M318 160l-1 3 1 3 2 2 3-1 1-3-1-3-2-2-3 1z" },
  BE: { name: "Belgium", flag: "🇧🇪", path: "M340 132l-1 2 1 2 2 1 2-1 1-2-1-2-2-1-2 1z" },
  CH: { name: "Switzerland", flag: "🇨🇭", path: "M347 145l-1 2 1 2 2 1 2-1 1-2-1-2-2-1-2 1z" },
  AT: { name: "Austria", flag: "🇦🇹", path: "M355 143l-2 2 1 3 2 2 3-1 1-2-1-3-2-2-2 1z" },
  IE: { name: "Ireland", flag: "🇮🇪", path: "M325 128l-2 2 1 3 2 2 3-1 1-2-1-3-2-2-2 1z" },
  DK: { name: "Denmark", flag: "🇩🇰", path: "M350 120l-1 2 1 2 2 1 2-1 1-2-1-2-2-1-2 1z" },
  FI: { name: "Finland", flag: "🇫🇮", path: "M370 105l-2 4 1 5 3 3 4-1 2-4-1-4-3-3-4 0z" },
  CL: { name: "Chile", flag: "🇨🇱", path: "M210 295l-1 6 1 8 2 5 3 4 4-1 1-4-2-5 1-6-2-4-3-3-4 0z" },
  CO: { name: "Colombia", flag: "🇨🇴", path: "M205 240l-3 3 1 4 3 2 4-1 2-3-1-4-3-2-3 1z" },
  PE: { name: "Peru", flag: "🇵🇪", path: "M205 260l-3 3 1 4 3 3 4-1 2-3-1-4-3-3-3 1z" },
  VE: { name: "Venezuela", flag: "🇻🇪", path: "M215 232l-3 2 1 3 3 2 3-1 2-2-1-3-3-2-2 1z" },
  MA: { name: "Morocco", flag: "🇲🇦", path: "M320 180l-3 3 1 4 3 2 4-1 2-3-1-4-3-2-3 1z" },
  DZ: { name: "Algeria", flag: "🇩🇿", path: "M340 190l-3 3 1 4 3 3 4-1 2-3-1-4-3-3-3 1z" },
  ET: { name: "Ethiopia", flag: "🇪🇹", path: "M400 240l-2 3 1 4 3 2 3-1 2-3-1-4-3-2-3 1z" },
  TZ: { name: "Tanzania", flag: "🇹🇿", path: "M390 265l-2 3 1 4 3 2 3-1 2-3-1-4-3-2-3 1z" },
  BD: { name: "Bangladesh", flag: "🇧🇩", path: "M475 195l-2 2 1 3 2 2 3-1 1-2-1-3-2-2-2 1z" },
  TW: { name: "Taiwan", flag: "🇹🇼", path: "M520 195l-1 2 1 3 2 2 2-1 1-2-1-3-2-2-2 1z" },
  HK: { name: "Hong Kong", flag: "🇭🇰", path: "M510 205l-1 1 0 2 1 1 2 0 1-1 0-2-1-1-2 0z" },
};

interface Props {
  data: Array<{ label: string; views: number; percentage?: number }>;
  className?: string;
}

const LABEL_TO_ISO: Record<string, string> = {
  "United States": "US", "USA": "US", "US": "US",
  "United Kingdom": "GB", "UK": "GB", "Great Britain": "GB",
  "Germany": "DE", "France": "FR", "Spain": "ES", "Italy": "IT",
  "Canada": "CA", "Mexico": "MX", "Brazil": "BR", "Argentina": "AR",
  "Australia": "AU", "New Zealand": "NZ", "Japan": "JP", "China": "CN",
  "India": "IN", "Russia": "RU", "South Africa": "ZA", "Egypt": "EG",
  "Nigeria": "NG", "Kenya": "KE", "South Korea": "KR", "Korea": "KR",
  "Netherlands": "NL", "Sweden": "SE", "Norway": "NO", "Poland": "PL",
  "Thailand": "TH", "Indonesia": "ID", "Philippines": "PH", "Vietnam": "VN",
  "Malaysia": "MY", "Singapore": "SG", "Turkey": "TR", "Saudi Arabia": "SA",
  "Israel": "IL", "UAE": "AE", "United Arab Emirates": "AE", "Iran": "IR",
  "Pakistan": "PK", "Ukraine": "UA", "Romania": "RO", "Greece": "GR",
  "Portugal": "PT", "Belgium": "BE", "Switzerland": "CH", "Austria": "AT",
  "Ireland": "IE", "Denmark": "DK", "Finland": "FI", "Chile": "CL",
  "Colombia": "CO", "Peru": "PE", "Venezuela": "VE", "Morocco": "MA",
  "Algeria": "DZ", "Ethiopia": "ET", "Tanzania": "TZ", "Bangladesh": "BD",
  "Taiwan": "TW", "Hong Kong": "HK",
};

export function WorldMap({ data, className }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  const dataByIso = useMemo(() => {
    const map = new Map<string, { views: number; percentage: number; name: string }>();
    for (const d of data) {
      const iso = LABEL_TO_ISO[d.label] || d.label.toUpperCase().slice(0, 2);
      map.set(iso, { views: d.views, percentage: d.percentage || 0, name: d.label });
    }
    return map;
  }, [data]);

  function activityClass(iso: string): string {
    const entry = dataByIso.get(iso);
    if (!entry) return "";
    if (entry.percentage >= 40) return "active-3";
    if (entry.percentage >= 20) return "active-2";
    if (entry.percentage >= 5) return "active-1";
    return "active-0";
  }

  const hoverData = hover ? dataByIso.get(hover) : null;
  const hoverCountry = hover ? COUNTRIES[hover] : null;

  return (
    <div className={cn("relative", className)}>
      <svg viewBox="80 60 500 280" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* Ocean/background */}
        <rect x="0" y="0" width="800" height="400" fill="#0f0f18" />
        {/* Grid dots */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="#1a1a26" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="800" height="400" fill="url(#grid)" />
        {Object.entries(COUNTRIES).map(([iso, country]) => (
          <path
            key={iso}
            d={country.path}
            className={cn("country-region", activityClass(iso))}
            onMouseEnter={() => setHover(iso)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(iso)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            role="img"
            aria-label={`${country.name}: ${dataByIso.get(iso)?.views || 0} views`}
          />
        ))}
      </svg>

      {hover && hoverCountry && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)]/95 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--color-text)]">
            <span className="text-base">{hoverCountry.flag}</span>{hoverCountry.name}
          </div>
          {hoverData ? (
            <div className="mt-1 text-[10px] text-[color:var(--color-text-muted)]">
              <span className="text-[color:var(--color-brand)] font-semibold">{hoverData.views.toLocaleString()}</span> views · {hoverData.percentage}%
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-[color:var(--color-text-dim)]">No data yet</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/80 px-2.5 py-1.5 backdrop-blur-sm">
        <span className="text-[9px] font-medium text-[color:var(--color-text-dim)]">Less</span>
        <div className="flex gap-0.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#1c1c28]" />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(139,108,245,0.28)" }} />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(139,108,245,0.5)" }} />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(139,108,245,0.72)" }} />
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(139,108,245,0.95)" }} />
        </div>
        <span className="text-[9px] font-medium text-[color:var(--color-text-dim)]">More</span>
      </div>
    </div>
  );
}
