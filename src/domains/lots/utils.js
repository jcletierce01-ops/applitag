/**
 * Utilitaires du domaine LOTS — affichage côté client uniquement.
 * La numérotation normative est générée côté serveur (LotNumerotationService).
 */

/** Génère un numéro de lot lisible pour l'affichage local (non probant). */
export const genLotNumero = (codePostal, seq) => {
  const now = new Date();
  const annee = now.getFullYear();
  const mois = String(now.getMonth() + 1).padStart(2, "0");
  const dept = (codePostal || "00").toString().slice(0, 2);
  const seqStr = String(seq || 1).padStart(3, "0");
  return `LOT-${annee}-${mois}-${dept}-${seqStr}`;
};
