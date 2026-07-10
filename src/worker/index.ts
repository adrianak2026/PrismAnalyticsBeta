import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv } from "./env";
import analytics from "./routes/analytics";
import auth from "./routes/auth";
import siteRoutes from "./routes/sites";
import track from "./routes/track";

const app = new Hono<AppEnv>();

app.use("*", secureHeaders());
app.use("/api/track", cors({
  origin: "*",
  allowMethods: ["POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "X-Session-Id"],
  maxAge: 86400,
}));
app.use("/api/*", cors({
  origin: (origin, c) => c.env.APP_URL || origin,
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
}));

app.get("/api/health", (c) => c.json({ ok: true, service: "PrismAnalytics", privacy: "no-ip-storage" }));
app.route("/api", auth);
app.route("/api", siteRoutes);
app.route("/api", track);
app.route("/api", analytics);

app.notFound(async (c) => {
  if (c.env.ASSETS) return c.env.ASSETS.fetch(c.req.url);
  return c.json({ error: "Not found" }, 404);
});

app.onError((error, c) => {
  console.error("PrismAnalytics worker error", error.message);
  return c.json({ error: "Unexpected server error" }, 500);
});

export default app;
