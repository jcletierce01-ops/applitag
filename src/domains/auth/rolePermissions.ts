// Sections accessibles par rôle.
// Le backend reste l'autorité pour tout accès réel aux données (RBAC serveur).
// Ce mapping contrôle uniquement l'affichage : section accessible vs. cadenassée/grisée.

export const ROLE_SECTIONS: Record<string, string[]> = {
  admin: [
    "dashboard","planning","lots","chantiers","transports","livraisons",
    "facture_elec","chaufferies","alertes","parcelles","desserte","coproduits",
    "projet_finance","permis_incendie","scierie","bois_crise","fiche_comb",
    "registre_ia","applitag_data","reglementation","conformite_red",
    "cout_reglementaire","ges","financements","territoire","analyses",
    "documents","rapports","utilisateurs","abonnements","reseau",
    "plan_appro","demo","futur","parametres",
  ],
  manager: [
    "dashboard","planning","lots","chantiers","transports","livraisons",
    "facture_elec","chaufferies","alertes","parcelles","desserte","coproduits",
    "projet_finance","permis_incendie","scierie","bois_crise","fiche_comb",
    "registre_ia","applitag_data","reglementation","conformite_red",
    "cout_reglementaire","ges","financements","territoire","analyses",
    "documents","rapports","utilisateurs","reseau","plan_appro","parametres",
  ],
  mandataire: [
    "dashboard","planning","lots","chantiers","parcelles","desserte",
    "alertes","documents","rapports","analyses","territoire","reseau",
  ],
  proprietaire: [
    "dashboard","lots","chantiers","parcelles","desserte",
    "documents","rapports","territoire",
  ],
  chauffeur: [
    "lots","transports","livraisons","chantiers","documents",
  ],
  dechiquetage: [
    "lots","chantiers","transports","livraisons","coproduits","documents",
  ],
  chaufferie: [
    "lots","livraisons","chaufferies","alertes",
    "ges","conformite_red","fiche_comb","documents",
  ],
  receptionnaire: [
    "lots","livraisons","chaufferies","documents",
  ],
  entreprise: [
    "dashboard","lots","chantiers","transports","livraisons","chaufferies",
    "planning","facture_elec","financements","documents","rapports",
    "analyses","reseau","abonnements","alertes","parametres",
  ],
  collectivite: [
    "dashboard","lots","chantiers","parcelles","desserte","territoire",
    "financements","documents","rapports","projet_finance",
    "permis_incendie","reglementation",
  ],
  bet: [
    "dashboard","lots","chantiers","parcelles","desserte","territoire",
    "documents","rapports","analyses","projet_finance","permis_incendie",
    "reglementation","conformite_red","ges","cout_reglementaire",
  ],
  gestionnaire: [
    "dashboard","planning","lots","chantiers","parcelles","desserte",
    "alertes","documents","rapports","analyses","territoire","reseau","financements",
  ],
  scierie: [
    "lots","chantiers","transports","livraisons","scierie","documents","rapports",
  ],
  etf: [
    "lots","chantiers","transports","livraisons","coproduits",
    "planning","facture_elec","documents","rapports","analyses","reseau",
  ],
  association: [
    "lots","territoire","documents","rapports","reseau",
  ],
  institutionnel: [
    "lots","territoire","documents","rapports","analyses",
    "reglementation","ges","conformite_red",
  ],
  financeur: [
    "lots","financements","projet_finance","documents","rapports","analyses",
  ],
  logistique: [
    "lots","chantiers","transports","livraisons","planning","documents",
  ],
  contact: [
    "documents","reseau",
  ],
  operateur: [
    "lots","chantiers","transports","livraisons",
  ],
};

export function hasPermission(role: string | undefined, sectionId: string): boolean {
  if (!role) return false;
  const allowed = ROLE_SECTIONS[role];
  if (!allowed) return false;
  return allowed.includes(sectionId);
}
