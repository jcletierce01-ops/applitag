/**
 * Stockage de repli pour les lots supprimés côté client.
 * Utilisé pour masquer localement un lot supprimé avant resynchronisation.
 */

const KEY = "applitag_deleted_lots";

export const deletedLotsGet = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};

export const deletedLotsAdd = (id) => {
  try {
    const ids = [...new Set([...deletedLotsGet(), id])];
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch { /* noop */ }
};
