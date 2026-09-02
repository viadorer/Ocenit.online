/**
 * Databázový klient — jen tenká vrstva nad @vercel/postgres.
 *
 * Používá se `sql` tagged template pro parametrizované dotazy (bezpečně
 * escapované proti SQL injekci). Kdo chce dotaz sestavovat dynamicky,
 * ať použije `db` a plain string s parametry $1, $2, ...
 */
import { sql, db } from '@vercel/postgres';

export { sql, db };

// Malý typový pomocník: `sql` vrací `{ rows: T[] }`, tohle ho zbaví boilerplate.
export async function query<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  // @ts-expect-error — @vercel/postgres má generický `sql` overload, ale TS ho v tomto použití nezachytí čistě
  const result = await sql<T>(strings, ...values);
  return result.rows;
}
