export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
}

export interface SiteSummary {
  id: string;
  name: string;
  domain: string | null;
  trackingCode: string;
  ipPrivacyMode: "strict_hash" | "store_raw";
  createdAt: number | string;
}

export interface TimelinePoint {
  date: string;
  views: number;
  unique: number;
}

export interface RankedMetric {
  label: string;
  views: number;
  percentage?: number;
}

export interface InspectorLog {
  id: string;
  occurredAt: number;
  pathname: string;
  referrer: string | null;
  userHash: string;
  rawIp: string | null;
  country: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  eventName: string;
}

export interface AnalyticsResponse {
  totalViews: number;
  uniqueVisitors: number;
  liveVisitors: number;
  bounceRate: number;
  avgSessionDuration: string;
  viewsChange: number;
  visitorsChange: number;
  timeline: TimelinePoint[];
  topPages: Array<{ pathname: string; views: number; percentage?: number }>;
  referrers: Array<{ referrer: string | null; views: number; percentage?: number }>;
  countries: RankedMetric[];
  devices: RankedMetric[];
  hourlyTraffic: Array<{ hour: string; views: number; percentage: number }>;
  recentLogs: InspectorLog[];
  period: number;
}

export interface TrackPayload {
  site_id: string;
  pathname: string;
  referrer?: string;
  screen_size?: string;
  session_id?: string;
  event_name?: string;
  event_data?: Record<string, string | number | boolean>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export type AuthUser = PublicUser;
