import type { ApiConfig } from "./config.js";

// Minimal Supabase REST client. Every call uses the publishable key plus the
// caller's own access token, so database and Storage RLS stay in force.
export interface SupabaseRest {
  request(path: string, accessToken: string, body?: unknown): Promise<Response>;
  readRows(
    path: string,
    accessToken: string,
    body?: unknown,
  ): Promise<unknown[]>;
  rpc(name: string, accessToken: string, args: unknown): Promise<unknown>;
}

export class SupabaseForbiddenError extends Error {
  constructor() {
    super("Supabase request forbidden");
  }
}

export function createSupabaseRest(
  config: Pick<ApiConfig, "supabaseUrl" | "supabasePublishableKey">,
  fetcher: typeof fetch = fetch,
): SupabaseRest {
  async function request(path: string, accessToken: string, body?: unknown) {
    return fetcher(new URL(path, config.supabaseUrl), {
      ...(body === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(body) }),
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${accessToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      signal: AbortSignal.timeout(10_000),
    });
  }

  async function readRows(path: string, accessToken: string, body?: unknown) {
    const response = await request(path, accessToken, body);
    if (!response.ok) throw new Error("Supabase Data API request failed");
    const rows: unknown = await response.json();
    if (!Array.isArray(rows))
      throw new Error("Unexpected Supabase Data API response");
    return rows;
  }

  // PostgREST reports SQLSTATE 42501 (our owner checks) as 401/403.
  async function rpc(name: string, accessToken: string, args: unknown) {
    const response = await request(`/rest/v1/rpc/${name}`, accessToken, args);
    if (response.status === 401 || response.status === 403)
      throw new SupabaseForbiddenError();
    if (!response.ok) throw new Error("Supabase Data API request failed");
    return (await response.json()) as unknown;
  }

  return { request, readRows, rpc };
}
