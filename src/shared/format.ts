/**
 * Utilitaires de formatage — APPLITAG
 *
 * Fonctions pures de présentation des données métier.
 * Locale : fr-FR (espace comme séparateur de milliers, virgule décimale).
 */

/**
 * Formate un nombre avec séparateur de milliers (espace) et virgule décimale.
 * Retourne la valeur brute si non numérique.
 */
export const fmtNum = (n: number | string, decimals = 0): string => {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return String(n);
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formate une date ISO (YYYY-MM-DD) en date courte française (JJ/MM/AAAA).
 * Retourne la chaîne brute si le format est inattendu.
 */
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso || typeof iso !== "string") return iso ?? "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};
