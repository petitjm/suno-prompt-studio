import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;

// All existing consumers use tagged-template queries that return
// an array of database rows.
type SqlRows = Record<string, any>[];

let cachedSql: NeonSql | null = null;

function getSql(): NeonSql {
  if (cachedSql) {
    return cachedSql;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Neon-backed database operations are unavailable.",
    );
  }

  cachedSql = neon(databaseUrl);

  return cachedSql;
}

export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<SqlRows> {
  const client = getSql();

  return client(strings, ...values) as Promise<SqlRows>;
}
