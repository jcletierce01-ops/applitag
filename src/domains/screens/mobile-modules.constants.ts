import { FEATURE_FLAGS } from "../../config/featureFlags.js";

export type ModuleDef = { id: string; icon: string; label: string; flag?: keyof typeof FEATURE_FLAGS; nav: string };

export const GROUPES_MODULES: { label: string; items: ModuleDef[] }[] = [
  { label:"🌲 Terrain", items:[
    { id:"lots",            icon:"🌲", label:"Lots",             flag:"LOTS",            nav:"lots" },
    { id:"chantiers",       icon:"🪓", label:"Chantiers",        flag:"CHANTIERS",       nav:"chantiers" },
    { id:"parcelles",       icon:"🌿", label:"Parcelles",        flag:"PARCELLES",       nav:"pc" },
    { id:"desserte",        icon:"🛣️", label:"Desserte",         flag:"DESSERTE",        nav:"pc" },
    { id:"permis_incendie", icon:"🔥", label:"Permis chantier",  flag:"PERMIS_INCENDIE", nav:"pc" },
    { id:"bois_crise",      icon:"🌲", label:"Bois de crise",    flag:"BOIS_CRISE",      nav:"pc" },
  ]},
  { label:"🚛 Logistique", items:[
    { id:"transports",  icon:"🚛", label:"Transports",   flag:"TRANSPORTS",  nav:"transports" },
    { id:"livraisons",  icon:"📦", label:"Livraisons",   flag:"LIVRAISONS",  nav:"livraisons" },
    { id:"chaufferies", icon:"🔥", label:"Chaufferies",  flag:"CHAUFFERIES", nav:"pc" },
    { id:"coproduits",  icon:"♻️", label:"Coproduits",   flag:"COPRODUITS",  nav:"pc" },
    { id:"scierie",     icon:"🏭", label:"Scierie",      flag:"SCIERIE",     nav:"pc" },
  ]},
  { label:"🇪🇺 Conformité & GES", items:[
    { id:"conformite_red",     icon:"🇪🇺", label:"Conformité RED",   flag:"CONFORMITE_RED",     nav:"pc" },
    { id:"cout_reglementaire", icon:"💶",  label:"Coût RED/tonne",   flag:"COUT_REGLEMENTAIRE", nav:"pc" },
    { id:"ges",                icon:"🌿",  label:"Bilan GES",         flag:"GES",                nav:"pc" },
    { id:"reglementation",     icon:"⚖️",  label:"Réglementation",   flag:"REGLEMENTATION",     nav:"pc" },
    { id:"fiche_comb",         icon:"📋",  label:"Fiche combustible", flag:"FICHE_COMB",         nav:"pc" },
  ]},
  { label:"💼 Gestion & Commerce", items:[
    { id:"planning",     icon:"📅", label:"Planning",        flag:"PLANNING",     nav:"pc" },
    { id:"facture_elec", icon:"🧾", label:"Fact. électron.", flag:"FACTURE_ELEC", nav:"pc" },
    { id:"financements", icon:"💶", label:"Financements",    flag:"FINANCEMENTS", nav:"pc" },
    { id:"plan_appro",   icon:"📐", label:"Plan d'appro.",   flag:"PLAN_APPRO",   nav:"pc" },
    { id:"documents",    icon:"📄", label:"Documents",       flag:"DOCUMENTS",    nav:"pc" },
    { id:"rapports",     icon:"📋", label:"Rapports",        flag:"RAPPORTS",     nav:"pc" },
    { id:"analyses",     icon:"📈", label:"Analyses",        flag:"ANALYSES",     nav:"pc" },
  ]},
  { label:"⚙️ Admin & Réseau", items:[
    { id:"alertes",      icon:"🔔", label:"Alertes",         flag:"ALERTES",      nav:"alertes" },
    { id:"utilisateurs", icon:"👥", label:"Utilisateurs",    flag:"UTILISATEURS", nav:"pc" },
    { id:"abonnements",  icon:"💳", label:"Abonnements",     flag:"ABONNEMENTS",  nav:"pc" },
    { id:"reseau",       icon:"🤝", label:"Réseau & Offres", flag:"RESEAU",       nav:"pc" },
    { id:"territoire",   icon:"🗺️", label:"Territoire",      flag:"TERRITOIRE",   nav:"pc" },
    { id:"registre_ia",  icon:"🤖", label:"Registre IA",     flag:"REGISTRE_IA",  nav:"pc" },
    { id:"parametres",   icon:"⚙️", label:"Paramètres",      flag:"PARAMETRES",   nav:"pc" },
  ]},
];
