export const STATUT_LOT = {
  NOUVEAU:               {label:"Nouveau",            color:"#9A9892", bg:"#ECEAE6"},
  VISITE_PREVUE:         {label:"Visite prévue",      color:"#BA7517", bg:"#FAEEDA"},
  VISITE_REALISEE:       {label:"Visite réalisée",    color:"#185FA5", bg:"#E6F1FB"},
  VALIDE_EXPLOITATION:   {label:"Validé",             color:"#534AB7", bg:"#EEEDFE"},
  EN_COURS_EXPLOITATION: {label:"En exploitation",    color:"#185FA5", bg:"#E6F1FB"},
  BORD_ROUTE:            {label:"Bord de route",      color:"#A66A2E", bg:"#F3EBE0"},
  A_DECHIQUETER:         {label:"À déchiqueter",      color:"#D85A30", bg:"#FAECE7"},
  EN_COURS_DECHIQUETAGE:      {label:"Déchiquetage en cours", color:"#D85A30", bg:"#FAECE7"},
  EN_LIVRAISON:          {label:"En livraison",       color:"#534AB7", bg:"#EEEDFE"},
  LIVRE_CHAUFFERIE:      {label:"Livré chaufferie",   color:"#4CAF50", bg:"#E8F5E9"},
  EN_STOCK_PLATEFORME:   {label:"En stock plateforme",color:"#185FA5", bg:"#E6F1FB"},
  LIVRE:                 {label:"Livré",              color:"#4CAF50", bg:"#E8F5E9"},
  ALERTE:                {label:"⚠ Alerte",           color:"#A32D2D", bg:"#FCEBEB"},
};

export const FILTRES_LOTS = [
  {id:"TOUS",              label:"Tous"},
  {id:"VISITE_PREVUE",     label:"À visiter"},
  {id:"VISITE_REALISEE",   label:"Visite faite"},
  {id:"EN_COURS_EXPLOITATION", label:"Exploitation"},
  {id:"BORD_ROUTE",        label:"Bord route"},
  {id:"EN_LIVRAISON",      label:"Transport"},
  {id:"LIVRE_CHAUFFERIE",  label:"Livré"},
];
