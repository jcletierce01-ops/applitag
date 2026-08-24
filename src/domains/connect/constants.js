/**
 * Constantes du domaine CONNECT — APPLITAG Connect (annonces publiques, comptes gratuits)
 */

import { C } from "@/design-system/tokens.js";

export const TYPES_PRESTATION_ANNONCE = [
  ["abattage",    "🪓", "Abattage"],
  ["debardage",   "🚜", "Débardage"],
  ["dechiquetage","🌀", "Déchiquetage"],
  ["transport",   "🚛", "Transport"],
];

export const STATUTS_ANNONCE = {
  recu:        { label: "Reçu",        color: C.blueD,   bg: C.blueL   },
  a_qualifier: { label: "À qualifier", color: C.amberD,  bg: C.amberL  },
  valide:      { label: "Validé",      color: C.greenD,  bg: C.greenL  },
  publie:      { label: "Publié",      color: C.purpleD, bg: C.purpleL },
  archive:     { label: "Archivé",     color: C.tx3,     bg: C.bg2     },
};

export const ORDRE_STATUTS_ANNONCE = ["recu", "a_qualifier", "valide", "publie", "archive"];
