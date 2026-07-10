import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import type { AuthUser } from "../shared/types";

export type WorkerBindings = {
  DB: D1Database;
  KV?: KVNamespace;
  ASSETS?: { fetch(input: string): Promise<Response> };
  JWT_SECRET?: string;
  APP_URL?: string;
  VERSION?: string;
  ENVIRONMENT?: string;
  B2_ENDPOINT?: string;
  B2_BUCKET_NAME?: string;
  B2_APPLICATION_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_REGION?: string;
};

export type AppEnv = {
  Bindings: WorkerBindings;
  Variables: { user: AuthUser };
};
