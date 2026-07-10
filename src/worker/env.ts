import type { D1Database, KVNamespace, R2Bucket } from "@cloudflare/workers-types";
import type { AuthUser } from "../shared/types";

export type WorkerBindings = {
  DB: D1Database;
  KV: KVNamespace;
  // R2 binding removed so Free Cloudflare accounts deploy instantly without credit card requests
  R2?: R2Bucket;
  ASSETS?: { fetch(input: string): Promise<Response> };
  JWT_SECRET: string;
  APP_URL?: string;
};

export type AppEnv = {
  Bindings: WorkerBindings;
  Variables: { user: AuthUser };
};
