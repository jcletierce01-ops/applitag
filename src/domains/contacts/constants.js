/**
 * Constantes du domaine CONTACTS — options de formulaires et listes de référence
 */

export const ORIGINE_OPTS = [
  ["appel_entrant",    "📞", "Appel entrant"],
  ["appel_applitag",   "📲", "Rappel APPLITAG Connect"],
  ["visite_terrain",   "🔭", "Visite terrain"],
  ["recommandation",   "🤝", "Recommandation"],
  ["salon",            "🎪", "Salon"],
  ["email",            "📧", "Email"],
  ["site_internet",    "🌐", "Site internet"],
  ["reseau_applitag",  "🌲", "Réseau APPLITAG"],
  ["autre",            "…",  "Autre"],
];

export const TYPE_CONTACT_OPTS = [
  ["proprietaire_forestier", "👤", "Propriétaire forestier"],
  ["cooperative",            "🌿", "Coopérative"],
  ["etf",                    "⛏",  "ETF"],
  ["transporteur",           "🚛", "Transporteur"],
  ["chaufferie",             "🏭", "Chaufferie"],
  ["plateforme",             "🏗️", "Plateforme"],
  ["negociant",              "💼", "Négociant"],
  ["collectivite",           "🏛️", "Collectivité"],
  ["prospect",               "🔍", "Prospect"],
];

export const TYPE_RESSOURCE_OPTS = [
  ["bois_energie",     "🪵", "Bois énergie"],
  ["bois_oeuvre",      "🌲", "Bois d'œuvre"],
  ["bois_rond",        "🪨", "Bois rond"],
  ["bois_trituration", "📄", "Bois de trituration"],
  ["bois_bord_route",  "🛣️", "Bois bord de route"],
  ["stock_plaquettes", "🪣", "Stock plaquettes"],
  ["mixte",            "🌳", "Mixte"],
];

export const PRIORITE_OPTS = [
  ["basse",     "⚪", "Basse"],
  ["moyenne",   "🟡", "Moyenne"],
  ["haute",     "🟠", "Haute"],
  ["immediate", "🔴", "Immédiate"],
];

export const STATUT_OPTS = [
  ["nouveau",       "🆕", "Nouveau"],
  ["a_rappeler",    "📞", "À rappeler"],
  ["qualifie",      "✅", "Qualifié"],
  ["visite_prevue", "🔭", "Visite prévue"],
  ["perdu",         "❌", "Perdu"],
];
