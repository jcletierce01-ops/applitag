/**
 * Utilitaires partagés — APPLITAG
 *
 * Fonctions pures sans dépendance React.
 * À importer depuis n'importe quel domaine.
 */

/** UUID v4 aléatoire (Web Crypto API). */
export const uid = (): string => crypto.randomUUID();

/** Horodatage ISO 8601 courant. */
export const nowISO = (): string => new Date().toISOString();

/** Date du jour au format YYYY-MM-DD. */
export const todayS = (): string => new Date().toISOString().slice(0, 10);

/**
 * Code à usage unique (ordre d'exploitation) — 8 caractères.
 * Alphabet sans caractères ambigus (0/O, 1/I/L).
 */
export const genCode = (): string => {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => alphabet[b % alphabet.length]!).join("");
};

/**
 * Code d'accès lot format APT (APT-XXXX-XXXX).
 * Alphabet sans caractères ambigus.
 */
export const genCodeAPT = (): string => {
  const alpha = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(8));
  const part = (s: number, n: number): string =>
    Array.from(b.slice(s, s + n), x => alpha[x % alpha.length]!).join("");
  return `APT-${part(0, 4)}-${part(4, 4)}`;
};
