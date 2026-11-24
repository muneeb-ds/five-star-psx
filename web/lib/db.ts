import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:../data/app.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function q<T = Record<string, any>>(sql: string, args: any[] = []): Promise<T[]> {
  const r = await client.execute({ sql, args });
  return r.rows.map((row) => ({ ...row })) as T[];
}

export async function latestReview() {
  const r = await q("SELECT * FROM reviews WHERE state!='needs_check' ORDER BY effective_date DESC, revision DESC LIMIT 1");
  return r[0] as any | undefined;
}
