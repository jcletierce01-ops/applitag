/**
 * Stockage de repli pour les données APPLITAG Connect (annonces publiques, comptes gratuits).
 *
 * DEFAULT_ENTREPRISE_ID : entreprise mono-tenant de l'admin, utilisée pour les annonces
 * déposées sans connexion. Ne contient aucune donnée sensible (prix, contrats, marges).
 */

export const DEFAULT_ENTREPRISE_ID = "c1b035b8-c2d5-4b84-a07e-2a3d503fb96c";

export const COMPTE_SESSION_KEY = "applitag_compte_contact_session";

const ANNONCES_KEY = "applitag_annonces";
export const annoncesLocalGet = () => {
  try { return JSON.parse(localStorage.getItem(ANNONCES_KEY) || "[]"); } catch { return []; }
};
export const annoncesLocalSave = (arr) => {
  try { localStorage.setItem(ANNONCES_KEY, JSON.stringify(arr)); } catch { /* noop */ }
};

const COMPTES_KEY = "applitag_comptes_contact";
export const comptesLocalGet = () => {
  try { return JSON.parse(localStorage.getItem(COMPTES_KEY) || "[]"); } catch { return []; }
};
export const comptesLocalSave = (arr) => {
  try { localStorage.setItem(COMPTES_KEY, JSON.stringify(arr)); } catch { /* noop */ }
};
