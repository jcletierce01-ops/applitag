/**
 * Stockage de repli pour les lots supprimés côté client.
 * Utilisé pour masquer localement un lot supprimé avant resynchronisation.
 */

const KEY = "applitag_deleted_lots";

export const deletedLotsGet = (): string[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; } catch { return []; }
};

export const deletedLotsAdd = (id: string): void => {
  try {
    const ids = [...new Set([...deletedLotsGet(), id])];
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch { /* noop */ }
};
