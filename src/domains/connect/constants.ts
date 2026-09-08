/**
 * Constantes du domaine CONNECT — APPLITAG Connect (annonces publiques, comptes gratuits)
 */

import { C } from "@/design-system/tokens.js";

export const TYPES_PRESTATION_ANNONCE: [string, string, string][] = [
  ["abattage",    "🪓", "Abattage"],
  ["debardage",   "🚜", "Débardage"],
  ["dechiquetage","🌀", "Déchiquetage"],
  ["transport",   "🚛", "Transport"],
];

type StatutAnnonce = { label: string; color: string; bg: string };

export const STATUTS_ANNONCE: Record<string, StatutAnnonce> = {
  recu:        { label: "Reçu",        color: C.blueD,   bg: C.blueL   },
  a_qualifier: { label: "À qualifier", color: C.amberD,  bg: C.amberL  },
  valide:      { label: "Validé",      color: C.greenD,  bg: C.greenL  },
  lot_cree:    { label: "Lot créé",    color: C.purpleD, bg: C.purpleL },
  archive:     { label: "Archivé",     color: C.tx3,     bg: C.bg2     },
};

export const ORDRE_STATUTS_ANNONCE: string[] = ["recu", "a_qualifier", "valide", "lot_cree", "archive"];
