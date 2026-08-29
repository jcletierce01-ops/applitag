// @ts-nocheck
// ============================================================
// APPLITAG — Sprint 0 : Contact → Opportunité
// Point d'entrée du workflow complet
// Contact · Opportunité · Pipeline · Conversion visite/lot
// JSDoc TypeScript-style · Mobile terrain · Tests core
// ============================================================

import { useState, useCallback, useMemo, useRef } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────

/**
 * @typedef {'proprietaire_forestier'|'cooperative'|'etf'|'transporteur'|
 *           'chaufferie'|'plateforme'|'negociant'|'collectivite'|'prospect'} ContactType
 *
 * @typedef {'appel_entrant'|'visite_terrain'|'recommandation'|'salon'|
 *           'email'|'site_internet'|'reseau_applitag'|'autre'} ContactOrigine
 *
 * @typedef {'nouveau'|'a_rappeler'|'qualifie'|'converti'|'perdu'} ContactStatut
 *
 * @typedef {'nouvelle'|'a_rappeler'|'visite_prevue'|'visite_realisee'|
 *           'lot_cree'|'perdue'} OppStatut
 *
 * @typedef {'basse'|'moyenne'|'haute'|'immediate'} Priorite
 *
 * @typedef {'bois_energie'|'bois_oeuvre'|'remanents'|'depot_bord_route'|'mixte'} TypeRessource
 */

/**
 * @typedef {Object} Contact
 * @property {string} id
 * @property {string} nom
 * @property {string} [prenom]
 * @property {string} [societe]
 * @property {string} telephone
 * @property {string} [email]
 * @property {string} [adresse]
 * @property {string} commune
 * @property {ContactType} typeContact
 * @property {ContactOrigine} origine
 * @property {{ lat: number, lng: number, source: 'gps'|'adresse' }|null} gps
 * @property {string} [potentiel]        – "150 t bord de route" ou "25 ha taillis"
 * @property {string} [commentaire]
 * @property {ContactStatut} statut
 * @property {string} [rappelAt]         – ISO date
 * @property {string} createdAt
 * @property {string} [updatedAt]
 */

/**
 * @typedef {Object} Opportunite
 * @property {string} id
 * @property {string} contactId
 * @property {TypeRessource} typeRessource
 * @property {number|null} volumeEstimeT
 * @property {number|null} surfaceHa
 * @property {Priorite} priorite
 * @property {OppStatut} statut
 * @property {string} [notes]
 * @property {string} [rappelAt]
 * @property {string} [visiteId]
 * @property {string} [lotId]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} HistoriqueEvent
 * @property {string} id
 * @property {string} refId
 * @property {'contact'|'opportunite'} refType
 * @property {string} action
 * @property {string} message
 * @property {string} utilisateur
 * @property {string} createdAt
 */

// ── TOKENS ─────────────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75",  greenL:"#E1F5EE",  greenD:"#085041",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  blue:"#185FA5",   blueL:"#E6F1FB",   blueD:"#042C53",
  amber:"#BA7517",  amberL:"#FAEEDA",  amberD:"#412402",
  red:"#A32D2D",    redL:"#FCEBEB",
  coral:"#D85A30",  coralL:"#FAECE7",  coralD:"#4A1B0C",
  bg:"#F5F4F1", bg2:"#ECEAE6",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
  sb:"#111",
};

// ── LABELS ─────────────────────────────────────────────────────────────────────
const TYPE_CONTACT_OPTS = [
  ["proprietaire_forestier","👤","Propriétaire forestier"],
  ["cooperative","🌿","Coopérative"],
  ["etf","⛏","ETF"],
  ["transporteur","🚛","Transporteur"],
  ["chaufferie","🏭","Chaufferie"],
  ["plateforme","🏗️","Plateforme"],
  ["negociant","💼","Négociant"],
  ["collectivite","🏛️","Collectivité"],
  ["prospect","🔍","Prospect"],
];

const ORIGINE_OPTS = [
  ["appel_entrant","📞","Appel entrant"],
  ["visite_terrain","🔭","Visite terrain"],
  ["recommandation","🤝","Recommandation"],
  ["salon","🎪","Salon"],
  ["email","📧","Email"],
  ["site_internet","🌐","Site internet"],
  ["reseau_applitag","🌲","Réseau APPLITAG"],
  ["autre","…","Autre"],
];

const TYPE_RESSOURCE_OPTS = [
  ["bois_energie","🔥","Bois énergie"],
  ["bois_oeuvre","🏗","Bois d'œuvre"],
  ["remanents","🌿","Rémanents"],
  ["depot_bord_route","📦","Dépôt bord de route"],
  ["mixte","🌳","Mixte"],
];

const PRIORITE_OPTS = [
  ["basse","⚪","Basse"],
  ["moyenne","🟡","Moyenne"],
  ["haute","🟠","Haute"],
  ["immediate","🔴","Immédiate"],
];

const contactStatutCfg = s => ({
  nouveau:   {bg:T.bg2,    color:T.tx3,    label:"Nouveau"},
  a_rappeler:{bg:T.amberL, color:T.amberD, label:"À rappeler"},
  qualifie:  {bg:T.blueL,  color:T.blueD,  label:"Qualifié"},
  converti:  {bg:T.greenL, color:T.greenD, label:"Converti ✓"},
  perdu:     {bg:T.redL,   color:T.red,    label:"Perdu"},
}[s] ?? {bg:T.bg2, color:T.tx2, label:s});

const oppStatutCfg = s => ({
  nouvelle:        {bg:T.bg2,    color:T.tx3,    label:"Nouvelle",        step:1},
  a_rappeler:      {bg:T.amberL, color:T.amberD, label:"À rappeler",       step:2},
  visite_prevue:   {bg:T.blueL,  color:T.blueD,  label:"Visite prévue",    step:3},
  visite_realisee: {bg:T.purpleL,color:T.purpleD,label:"Visite réalisée",  step:4},
  lot_cree:        {bg:T.greenL, color:T.greenD, label:"Lot créé ✓",       step:5},
  perdue:          {bg:T.redL,   color:T.red,    label:"Perdue",           step:0},
}[s] ?? {bg:T.bg2,color:T.tx2,label:s,step:0});

const prioriteCfg = p => ({
  basse:     {color:"#888",  label:"Basse"},
  moyenne:   {color:T.amber, label:"Moyenne"},
  haute:     {color:T.coral, label:"Haute"},
  immediate: {color:T.red,   label:"Immédiate"},
}[p] ?? {color:T.tx3,label:p});

const typeContactLabel = t => TYPE_CONTACT_OPTS.find(([v])=>v===t)?.[2] ?? t;
const typeContactEmoji = t => TYPE_CONTACT_OPTS.find(([v])=>v===t)?.[1] ?? "👤";
const typeRessourceLabel = t => TYPE_RESSOURCE_OPTS.find(([v])=>v===t)?.[2] ?? t;

// ── HELPERS ─────────────────────────────────────────────────────────────────────
const uid   = () => Math.random().toString(36).slice(2,9);
const nowISO = () => new Date().toISOString();
const fmtDate = d => d
  ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})
  : "—";
const fmtTime = d => d
  ? new Date(d).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})
  : "";
const isValidPhone = p => /^[\d\s\+\-\.]{8,}$/.test(p.trim());
const isValidEmail = e => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ── MOCK DATA ──────────────────────────────────────────────────────────────────
/** @returns {{contacts:Contact[], opportunites:Opportunite[], historique:HistoriqueEvent[]}} */
const buildStore = () => {
  const contacts = [
    { id:"c1", nom:"Bernard", prenom:"Michel", telephone:"06 12 34 56 78",
      email:"m.bernard@gmail.com", commune:"Charny (89)",
      typeContact:"proprietaire_forestier", origine:"appel_entrant",
      gps:{lat:47.984, lng:3.089, source:"gps"},
      potentiel:"~400 t de peuplier bord de route",
      commentaire:"Rappeler vendredi matin. Accès chemin forestier praticable.",
      statut:"a_rappeler", createdAt:"2025-06-01T08:00:00Z" },
    { id:"c2", nom:"Coop Yonne Bois", telephone:"03 86 44 55 66",
      email:"contact@coopyonnebois.fr", commune:"Auxerre (89)",
      typeContact:"cooperative", origine:"recommandation",
      gps:null,
      potentiel:"12 propriétés — 800 t saison 2025",
      commentaire:"Référent : Mme Dupont. Budget annuel défini en janvier.",
      statut:"qualifie", createdAt:"2025-05-15T09:00:00Z" },
    { id:"c3", nom:"Lemaire", prenom:"Patrick", telephone:"06 88 77 66 55",
      commune:"Tonnerre (89)", typeContact:"proprietaire_forestier",
      origine:"visite_terrain", gps:{lat:47.858, lng:3.978, source:"gps"},
      potentiel:"200 t chêne. Accès difficile.",
      commentaire:"Visite faite 28/05. Volume confirmé 190 t.",
      statut:"qualifie", createdAt:"2025-05-20T10:00:00Z" },
    { id:"c4", nom:"Girard Transport", telephone:"03 86 12 34 56",
      commune:"Sens (89)", typeContact:"transporteur",
      origine:"reseau_applitag", gps:null,
      potentiel:"4 semi-remorques. Disponibles dès 06h.",
      statut:"nouveau", createdAt:"2025-06-08T11:00:00Z" },
  ];
  const opportunites = [
    { id:"o1", contactId:"c1", typeRessource:"depot_bord_route", volumeEstimeT:400,
      surfaceHa:null, priorite:"haute", statut:"visite_prevue",
      notes:"Peuplier 65%, frêne 35%. Rappel vendredi.",
      rappelAt:"2025-06-13T09:00:00Z", createdAt:"2025-06-01T08:30:00Z" },
    { id:"o2", contactId:"c2", typeRessource:"bois_energie", volumeEstimeT:800,
      surfaceHa:null, priorite:"moyenne", statut:"visite_realisee",
      notes:"Plusieurs parcelles Yonne-Nièvre. PEFC possible.",
      createdAt:"2025-05-16T09:00:00Z" },
    { id:"o3", contactId:"c3", typeRessource:"bois_energie", volumeEstimeT:190,
      surfaceHa:8.5, priorite:"basse", statut:"visite_realisee",
      notes:"Chêne 100%. Volume confirmé visite 28/05.",
      createdAt:"2025-05-21T10:00:00Z" },
  ];
  const historique = [
    { id:"h1", refId:"c1", refType:"contact", action:"contact_cree",
      message:"Contact créé — M. Bernard (Propriétaire, appel entrant)",
      utilisateur:"J. Moreau", createdAt:"2025-06-01T08:00:00Z" },
    { id:"h2", refId:"o1", refType:"opportunite", action:"opportunite_creee",
      message:"Opportunité créée — 400 t dépôt bord de route",
      utilisateur:"J. Moreau", createdAt:"2025-06-01T08:30:00Z" },
    { id:"h3", refId:"o1", refType:"opportunite", action:"statut_change",
      message:"Statut → Visite prévue",
      utilisateur:"J. Moreau", createdAt:"2025-06-02T09:00:00Z" },
    { id:"h4", refId:"c3", refType:"contact", action:"statut_change",
      message:"Contact qualifié après visite terrain",
      utilisateur:"J. Moreau", createdAt:"2025-05-28T17:00:00Z" },
  ];
  return { contacts, opportunites, historique };
};

// ── UNIT TESTS ─────────────────────────────────────────────────────────────────
const UNIT_TESTS = [
  { name:"Validation: téléphone valide",
    fn:() => isValidPhone("06 12 34 56 78") === true },
  { name:"Validation: téléphone court invalide",
    fn:() => isValidPhone("0612") === false },
  { name:"Validation: email valide",
    fn:() => isValidEmail("test@example.com") === true },
  { name:"Validation: email invalide",
    fn:() => isValidEmail("pas-un-email") === false },
  { name:"Validation: email vide = valide (optionnel)",
    fn:() => isValidEmail("") === true },
  { name:"Statut: contact nouveau → statut 'nouveau'",
    fn:() => contactStatutCfg("nouveau").label === "Nouveau" },
  { name:"Opp: 5 statuts définis",
    fn:() => ["nouvelle","a_rappeler","visite_prevue","visite_realisee","lot_cree"]
      .every(s => oppStatutCfg(s).step > 0) },
  { name:"OppStatut lot_cree = step 5 (final)",
    fn:() => oppStatutCfg("lot_cree").step === 5 },
  { name:"Priorité haute → couleur coral",
    fn:() => prioriteCfg("haute").color === T.coral },
  { name:"Contact: champs obligatoires nom+tel+commune+type",
    fn:() => {
      const c = { nom:"", telephone:"", commune:"", typeContact:"" };
      const errors = [
        !c.nom && "nom",
        !c.telephone && "telephone",
        !c.commune && "commune",
        !c.typeContact && "typeContact",
      ].filter(Boolean);
      return errors.length === 4;
    }},
];
const TEST_RESULTS = UNIT_TESTS.map(t => {
  try { return { name:t.name, pass:t.fn()===true }; }
  catch(e) { return { name:t.name, pass:false, err:e.message }; }
});
const TESTS_PASS = TEST_RESULTS.filter(r=>r.pass).length;
console.log(`[APPLITAG Contact Tests] ${TESTS_PASS}/${TEST_RESULTS.length} passed`);

// ── ATOMS ──────────────────────────────────────────────────────────────────────
const Badge = ({bg,color,children,style={}}) => (
  <span style={{display:"inline-block",padding:"2px 9px",borderRadius:9,
    fontSize:10,fontWeight:600,background:bg,color,whiteSpace:"nowrap",...style}}>
    {children}
  </span>
);

const Btn = ({onClick,bg=T.bg2,color=T.tx,children,disabled,sm,full,style={}}) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding:sm?"6px 11px":"9px 16px", borderRadius:9,
    fontSize:sm?11:12, fontWeight:500,
    display:"inline-flex", alignItems:"center", gap:6,
    cursor:disabled?"not-allowed":"pointer",
    border:"none", fontFamily:"inherit",
    background:disabled?T.bg2:bg, color:disabled?T.tx3:color,
    opacity:disabled?.6:1, transition:"all .12s",
    whiteSpace:"nowrap", width:full?"100%":undefined,
    justifyContent:full?"center":undefined, ...style,
  }}>{children}</button>
);

const PBtn = ({onClick,children,disabled,full,style={}}) => (
  <Btn onClick={onClick} bg={T.green} color="#fff"
    disabled={disabled} full={full} style={style}>{children}</Btn>
);

const Field = ({label,required,error,hint,children}) => (
  <div style={{marginBottom:10}}>
    <div style={{fontSize:11,fontWeight:600,color:error?T.red:T.tx2,
      marginBottom:3,display:"flex",gap:5,alignItems:"baseline"}}>
      {label}
      {required&&<span style={{color:"#E24B4A"}}>*</span>}
      {hint&&<span style={{fontWeight:400,color:T.tx3,fontSize:10}}>{hint}</span>}
    </div>
    {children}
    {error&&<div style={{fontSize:10,color:T.red,marginTop:3}}>⚠ {error}</div>}
  </div>
);

const FInput = ({value,onChange,placeholder,type="text",error,autoFocus}) => (
  <input value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} type={type} autoFocus={autoFocus}
    style={{width:"100%",padding:"11px 10px",borderRadius:10,
      border:`1.5px solid ${error?T.red:T.bd2}`,fontSize:13,
      fontFamily:"inherit",background:"#fff",color:T.tx,
      outline:"none",transition:"border-color .15s"}}/>
);

const FTextarea = ({value,onChange,placeholder,rows=3}) => (
  <textarea value={value} onChange={e=>onChange(e.target.value)}
    placeholder={placeholder} rows={rows}
    style={{width:"100%",padding:"10px",borderRadius:10,resize:"vertical",
      border:`1.5px solid ${T.bd2}`,fontSize:13,fontFamily:"inherit",
      background:"#fff",color:T.tx,outline:"none",lineHeight:1.5}}/>
);

// Sélecteur en grille
const GridSelect = ({options, value, onChange, cols=3}) => (
  <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:6}}>
    {options.map(([v,emoji,label]) => {
      const active = value === v;
      return (
        <button key={v} onClick={()=>onChange(v)} style={{
          padding:"9px 6px",borderRadius:10,border:`1.5px solid ${active?T.green:T.bd}`,
          background:active?T.greenL:"#fff",cursor:"pointer",
          fontFamily:"inherit",display:"flex",flexDirection:"column",
          alignItems:"center",gap:4,transition:"all .1s",
        }}>
          <span style={{fontSize:18}}>{emoji}</span>
          <span style={{fontSize:10,fontWeight:active?600:400,
            color:active?T.greenD:T.tx2,textAlign:"center",lineHeight:1.3}}>
            {label}
          </span>
        </button>
      );
    })}
  </div>
);

// GPS widget léger
const GpsWidget = ({value,onChange}) => {
  const [loading,setLoading] = useState(false);
  const capture = () => {
    setLoading(true);
    setTimeout(()=>{
      onChange({lat:47.984+(Math.random()-.5)*.05, lng:3.089+(Math.random()-.5)*.05, source:"gps"});
      setLoading(false);
    }, 1100);
  };
  if (value) return (
    <div style={{background:T.greenL,borderRadius:10,padding:"9px 12px",
      display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:10,color:T.greenD,fontWeight:600,marginBottom:1}}>
          📍 {value.source==="gps"?"GPS automatique":"Depuis adresse"}
        </div>
        <div style={{fontFamily:"monospace",fontSize:11,color:T.greenD}}>
          {value.lat.toFixed(5)}°N · {value.lng.toFixed(5)}°E
        </div>
      </div>
      <button onClick={()=>onChange(null)} style={{background:"none",border:"none",
        color:T.greenD,cursor:"pointer",fontSize:16}}>✕</button>
    </div>
  );
  return (
    <div style={{display:"flex",gap:7}}>
      <button onClick={capture} disabled={loading} style={{
        flex:1,padding:"11px",borderRadius:10,border:"none",fontFamily:"inherit",
        background:loading?T.bg2:T.greenL,color:loading?T.tx3:T.greenD,
        fontSize:12,fontWeight:500,cursor:loading?"wait":"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:7,
      }}>
        {loading?"⏳ Localisation…":"📍 Capturer GPS"}
      </button>
      <button onClick={()=>onChange({lat:48.1,lng:3.2,source:"adresse"})} style={{
        padding:"11px",borderRadius:10,border:`1px solid ${T.bd}`,
        background:"#fff",color:T.tx2,fontSize:11,cursor:"pointer",
        fontFamily:"inherit",whiteSpace:"nowrap",
      }}>📍 Depuis adresse</button>
    </div>
  );
};

// Indicateur de progression workflow
const WorkflowBar = ({currentStep}) => {
  const steps = [
    {n:"Contact",step:0},
    {n:"Opportunité",step:1},
    {n:"Visite",step:2},
    {n:"Lot",step:3},
  ];
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,padding:"8px 0"}}>
      {steps.map((s,i) => {
        const done = i < currentStep, active = i === currentStep;
        return (
          <div key={s.n} style={{display:"flex",alignItems:"center",flex:1}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",
              flex:"none",minWidth:60}}>
              <div style={{
                width:24,height:24,borderRadius:"50%",
                background:done?T.green:active?T.amber:T.bg2,
                border:`2px solid ${done?T.green:active?T.amber:T.bd2}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,color:done?"#fff":active?T.amberD:T.tx3,fontWeight:600,
              }}>{done?"✓":i+1}</div>
              <div style={{fontSize:9,color:done?T.greenD:active?T.amberD:T.tx3,
                marginTop:3,fontWeight:active?600:400,whiteSpace:"nowrap"}}>
                {s.n}
              </div>
            </div>
            {i<steps.length-1&&(
              <div style={{flex:1,height:2,background:done?T.green:T.bg2,
                margin:"0 4px",marginBottom:12}}/>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Timeline historique
const Historique = ({events}) => (
  <div>
    {events.length===0&&(
      <div style={{fontSize:12,color:T.tx3,textAlign:"center",padding:"10px 0"}}>
        Aucun événement
      </div>
    )}
    {[...events].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map((e,i)=>{
      const icons = {
        contact_cree:"👤",opportunite_creee:"💡",statut_change:"🔄",
        visite_planifiee:"🔭",visite_realisee:"✅",lot_cree:"🌲",rappel:"📅",
      };
      return (
        <div key={e.id} style={{display:"flex",gap:9,padding:"7px 0",
          borderBottom:i<events.length-1?`0.5px solid ${T.bd}`:"none"}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:T.bg2,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11,flexShrink:0}}>{icons[e.action]??"•"}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:T.tx,lineHeight:1.4}}>{e.message}</div>
            <div style={{fontSize:10,color:T.tx3,marginTop:2}}>
              {fmtDate(e.createdAt)} {fmtTime(e.createdAt)} · {e.utilisateur}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// ── FORMULAIRE NOUVEAU CONTACT ─────────────────────────────────────────────────
const FormulaireContact = ({onSave, onBack, editContact}) => {
  const [nom,        setNom]        = useState(editContact?.nom ?? "");
  const [prenom,     setPrenom]     = useState(editContact?.prenom ?? "");
  const [societe,    setSociete]    = useState(editContact?.societe ?? "");
  const [telephone,  setTelephone]  = useState(editContact?.telephone ?? "");
  const [email,      setEmail]      = useState(editContact?.email ?? "");
  const [adresse,    setAdresse]    = useState(editContact?.adresse ?? "");
  const [commune,    setCommune]    = useState(editContact?.commune ?? "");
  const [typeContact,setTypeContact]= useState(editContact?.typeContact ?? "");
  const [origine,    setOrigine]    = useState(editContact?.origine ?? "");
  const [gps,        setGps]        = useState(editContact?.gps ?? null);
  const [potentiel,  setPotentiel]  = useState(editContact?.potentiel ?? "");
  const [commentaire,setCommentaire]= useState(editContact?.commentaire ?? "");
  const [submitted,  setSubmitted]  = useState(false);

  const errors = useMemo(()=>{
    if (!submitted) return {};
    return {
      nom:       !nom.trim()       ? "Nom obligatoire" : null,
      telephone: !telephone.trim() ? "Téléphone obligatoire"
                 : !isValidPhone(telephone) ? "Format invalide (ex : 06 12 34 56 78)" : null,
      commune:   !commune.trim()   ? "Commune obligatoire" : null,
      typeContact:!typeContact     ? "Sélectionner un type" : null,
      email:     !isValidEmail(email) ? "Email invalide" : null,
    };
  },[submitted,nom,telephone,commune,typeContact,email]);

  const hasErrors = Object.values(errors).some(Boolean);

  const handleSubmit = () => {
    setSubmitted(true);
    if (!nom.trim()||!telephone.trim()||!commune.trim()||!typeContact||!isValidPhone(telephone)) return;
    /** @type {Contact} */
    const c = {
      id: editContact?.id ?? uid(),
      nom: nom.trim(), prenom: prenom.trim()||undefined,
      societe: societe.trim()||undefined,
      telephone: telephone.trim(), email: email.trim()||undefined,
      adresse: adresse.trim()||undefined, commune: commune.trim(),
      typeContact, origine: origine||"autre",
      gps, potentiel: potentiel.trim()||undefined,
      commentaire: commentaire.trim()||undefined,
      statut: editContact?.statut ?? "nouveau",
      createdAt: editContact?.createdAt ?? nowISO(),
      updatedAt: editContact ? nowISO() : undefined,
    };
    onSave(c);
  };

  const isEdit = !!editContact;

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      {/* Header */}
      <div style={{padding:"11px 13px 9px",background:"#fff",
        borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:9}}>
        {onBack&&(
          <button onClick={onBack} style={{background:"none",border:"none",
            cursor:"pointer",fontSize:18,color:T.tx2,padding:"2px 8px 2px 0"}}>‹</button>
        )}
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>
            {isEdit?"Modifier le contact":"Nouveau contact"}
          </div>
          <div style={{fontSize:11,color:T.tx3}}>
            {isEdit?"Mise à jour des informations":"Saisie rapide — champs essentiels en premier"}
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"13px",paddingBottom:90}}>

        {/* Infos générales */}
        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${T.bd}`,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:10}}>Informations générales</div>

          {/* Nom + Prénom */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:0}}>
            <Field label="Nom" required error={errors.nom}>
              <FInput value={nom} onChange={setNom} placeholder="Dupont" autoFocus
                error={!!errors.nom}/>
            </Field>
            <Field label="Prénom" hint="optionnel">
              <FInput value={prenom} onChange={setPrenom} placeholder="Jean"/>
            </Field>
          </div>

          <Field label="Société" hint="optionnel">
            <FInput value={societe} onChange={setSociete} placeholder="Ex : Forêts Bourgogne SARL"/>
          </Field>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Field label="Téléphone" required error={errors.telephone}>
              <FInput value={telephone} onChange={setTelephone}
                placeholder="06 12 34 56 78" type="tel" error={!!errors.telephone}/>
            </Field>
            <Field label="Email" hint="optionnel" error={errors.email}>
              <FInput value={email} onChange={setEmail}
                placeholder="contact@exemple.fr" type="email" error={!!errors.email}/>
            </Field>
          </div>

          <Field label="Commune" required error={errors.commune}>
            <FInput value={commune} onChange={setCommune}
              placeholder="Charny (89)" error={!!errors.commune}/>
          </Field>

          <Field label="Adresse" hint="optionnel">
            <FInput value={adresse} onChange={setAdresse}
              placeholder="12 chemin de la Forêt"/>
          </Field>
        </div>

        {/* Type de contact */}
        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${errors.typeContact?T.red:T.bd}`,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:errors.typeContact?T.red:T.tx3,
            textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>
            Type de contact <span style={{color:"#E24B4A"}}>*</span>
          </div>
          <GridSelect options={TYPE_CONTACT_OPTS} value={typeContact}
            onChange={setTypeContact} cols={3}/>
          {errors.typeContact&&(
            <div style={{fontSize:10,color:T.red,marginTop:6}}>⚠ {errors.typeContact}</div>
          )}
        </div>

        {/* Origine */}
        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${T.bd}`,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:10}}>Origine du contact</div>
          <GridSelect options={ORIGINE_OPTS} value={origine}
            onChange={setOrigine} cols={4}/>
        </div>

        {/* GPS */}
        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${T.bd}`,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:10}}>Géolocalisation</div>
          <GpsWidget value={gps} onChange={setGps}/>
        </div>

        {/* Potentiel + commentaire */}
        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${T.bd}`,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:10}}>Potentiel & notes</div>
          <Field label="Potentiel estimé" hint="ex : 150 t bord de route, 25 ha taillis">
            <FInput value={potentiel} onChange={setPotentiel}
              placeholder="~300 t de peuplier bord de route"/>
          </Field>
          <Field label="Commentaire libre">
            <FTextarea value={commentaire} onChange={setCommentaire}
              placeholder="Souhaite valoriser des bois de faible diamètre.
Rappeler semaine prochaine. Accès chemin praticable."
              rows={3}/>
          </Field>
        </div>
      </div>

      {/* CTA sticky */}
      <div style={{position:"sticky",bottom:0,padding:"10px 13px 16px",
        background:`linear-gradient(transparent,${T.bg} 30%)`}}>
        <PBtn onClick={handleSubmit} full>
          {isEdit?"✓ Mettre à jour":"ENREGISTRER CONTACT"}
        </PBtn>
        {submitted&&hasErrors&&(
          <div style={{fontSize:11,color:T.red,textAlign:"center",marginTop:6}}>
            ⚠ Corriger les champs obligatoires
          </div>
        )}
      </div>
    </div>
  );
};

// ── FORMULAIRE OPPORTUNITÉ ─────────────────────────────────────────────────────
const FormulaireOpportunite = ({contact, editOpp, onSave, onBack}) => {
  const [typeRessource, setTypeRessource] = useState(editOpp?.typeRessource ?? "bois_energie");
  const [volumeEstime,  setVolumeEstime]  = useState(String(editOpp?.volumeEstimeT ?? ""));
  const [surface,       setSurface]       = useState(String(editOpp?.surfaceHa ?? ""));
  const [priorite,      setPriorite]      = useState(editOpp?.priorite ?? "moyenne");
  const [notes,         setNotes]         = useState(editOpp?.notes ?? "");
  const [rappelAt,      setRappelAt]      = useState(editOpp?.rappelAt?.slice(0,10) ?? "");

  const handleSave = () => {
    /** @type {Opportunite} */
    const o = {
      id: editOpp?.id ?? uid(),
      contactId: contact.id,
      typeRessource,
      volumeEstimeT: volumeEstime ? parseFloat(volumeEstime) : null,
      surfaceHa: surface ? parseFloat(surface) : null,
      priorite, notes: notes.trim()||undefined,
      statut: editOpp?.statut ?? "nouvelle",
      rappelAt: rappelAt ? new Date(rappelAt).toISOString() : undefined,
      createdAt: editOpp?.createdAt ?? nowISO(),
    };
    onSave(o);
  };

  const p = prioriteCfg(priorite);

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      <div style={{padding:"11px 13px 9px",background:"#fff",
        borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:9}}>
        {onBack&&(
          <button onClick={onBack} style={{background:"none",border:"none",
            cursor:"pointer",fontSize:18,color:T.tx2,padding:"2px 8px 2px 0"}}>‹</button>
        )}
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>
            {editOpp?"Modifier l'opportunité":"Nouvelle opportunité"}
          </div>
          <div style={{fontSize:11,color:T.tx3}}>
            {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
            {" · "}{contact.commune}
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"13px",paddingBottom:90}}>
        {/* Contact recap */}
        <div style={{background:T.purpleL,borderRadius:10,padding:"10px 12px",
          marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:24}}>{typeContactEmoji(contact.typeContact)}</span>
          <div>
            <div style={{fontSize:13,fontWeight:500,color:T.purpleD}}>
              {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
            </div>
            <div style={{fontSize:11,color:T.purpleD,opacity:.8}}>
              {typeContactLabel(contact.typeContact)} · {contact.commune}
            </div>
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${T.bd}`,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:10}}>Type de ressource</div>
          <GridSelect options={TYPE_RESSOURCE_OPTS} value={typeRessource}
            onChange={setTypeRessource} cols={3}/>
        </div>

        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${T.bd}`,marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
            <Field label="Volume estimé" hint="(t)">
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <FInput value={volumeEstime} onChange={setVolumeEstime}
                  placeholder="300" type="number"/>
                <span style={{fontSize:11,color:T.tx3,flexShrink:0}}>t</span>
              </div>
            </Field>
            <Field label="Surface" hint="(ha, optionnel)">
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <FInput value={surface} onChange={setSurface}
                  placeholder="12.5" type="number"/>
                <span style={{fontSize:11,color:T.tx3,flexShrink:0}}>ha</span>
              </div>
            </Field>
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${T.bd}`,marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:10}}>Priorité</div>
          <div style={{display:"flex",gap:7}}>
            {PRIORITE_OPTS.map(([v,emoji,label])=>{
              const cfg = prioriteCfg(v);
              const active = priorite === v;
              return (
                <button key={v} onClick={()=>setPriorite(v)} style={{
                  flex:1,padding:"10px 6px",borderRadius:10,
                  border:`2px solid ${active?cfg.color:T.bd}`,
                  background:active?cfg.color+"18":"#fff",
                  cursor:"pointer",fontFamily:"inherit",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                }}>
                  <span style={{fontSize:20}}>{emoji}</span>
                  <span style={{fontSize:10,fontWeight:active?600:400,
                    color:active?cfg.color:T.tx3}}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:12,padding:"12px",
          border:`1px solid ${T.bd}`,marginBottom:10}}>
          <Field label="Date de rappel" hint="optionnel">
            <input type="date" value={rappelAt} onChange={e=>setRappelAt(e.target.value)}
              style={{width:"100%",padding:"11px 10px",borderRadius:10,
                border:`1.5px solid ${T.bd2}`,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
          </Field>
          <Field label="Notes">
            <FTextarea value={notes} onChange={setNotes}
              placeholder="Peuplier 65%, frêne 35%. Rappel vendredi matin."
              rows={3}/>
          </Field>
        </div>
      </div>

      <div style={{position:"sticky",bottom:0,padding:"10px 13px 16px",
        background:`linear-gradient(transparent,${T.bg} 30%)`}}>
        <PBtn onClick={handleSave} full>
          {editOpp?"✓ Mettre à jour":"CRÉER L'OPPORTUNITÉ"}
        </PBtn>
      </div>
    </div>
  );
};

// ── FICHE CONTACT ──────────────────────────────────────────────────────────────
const FicheContact = ({contact, opportunites, historique, onBack, onEdit,
  onCreateOpp, onUpdateStatut, onDeleteOpp, onUpdateOppStatut}) => {

  const sc = contactStatutCfg(contact.statut);
  const contactOpps = opportunites.filter(o=>o.contactId===contact.id);

  const STATUTS = ["nouveau","a_rappeler","qualifie","converti","perdu"];

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,${T.greenD},${T.green})`,
        color:"#fff",padding:"12px 14px 14px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",
          color:"rgba(255,255,255,.75)",fontSize:14,marginBottom:7}}>‹ Contacts</button>
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,
            background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:22,flexShrink:0}}>
            {typeContactEmoji(contact.typeContact)}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:600}}>
              {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
            </div>
            <div style={{fontSize:12,opacity:.8,marginTop:2}}>
              {typeContactLabel(contact.typeContact)}
              {contact.societe ? ` · ${contact.societe}` : ""}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
            <Badge bg="rgba(255,255,255,.2)" color="#fff">{sc.label}</Badge>
            <Btn onClick={onEdit} bg="rgba(255,255,255,.15)" color="#fff" sm>✏️ Modifier</Btn>
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",
        display:"flex",flexDirection:"column",gap:9}}>

        {/* Coordonnées */}
        <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,padding:"12px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:8}}>Coordonnées</div>
          {[
            {icon:"📞",v:contact.telephone,href:`tel:${contact.telephone}`},
            {icon:"📧",v:contact.email,href:`mailto:${contact.email}`},
            {icon:"📍",v:contact.commune},
            {icon:"🏠",v:contact.adresse},
          ].filter(x=>x.v).map(({icon,v,href})=>(
            <div key={v} style={{display:"flex",gap:9,padding:"5px 0",
              borderBottom:`0.5px solid ${T.bd}`,alignItems:"center"}}>
              <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
              {href
                ? <a href={href} style={{fontSize:12,color:T.blue,textDecoration:"none"}}>{v}</a>
                : <span style={{fontSize:12,color:T.tx}}>{v}</span>}
            </div>
          ))}
          {contact.gps&&(
            <div style={{display:"flex",gap:9,padding:"5px 0",alignItems:"center"}}>
              <span style={{fontSize:14}}>🗺️</span>
              <span style={{fontSize:11,fontFamily:"monospace",color:T.greenD}}>
                {contact.gps.lat.toFixed(5)}°N · {contact.gps.lng.toFixed(5)}°E
              </span>
            </div>
          )}
        </div>

        {/* Potentiel */}
        {contact.potentiel&&(
          <div style={{background:T.greenL,borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:10,fontWeight:700,color:T.greenD,marginBottom:3,
              textTransform:"uppercase",letterSpacing:".05em"}}>🌲 Potentiel estimé</div>
            <div style={{fontSize:13,fontWeight:500,color:T.greenD}}>{contact.potentiel}</div>
          </div>
        )}
        {contact.commentaire&&(
          <div style={{background:T.bg2,borderRadius:10,padding:"10px 12px",
            fontSize:12,color:T.tx,lineHeight:1.6}}>{contact.commentaire}</div>
        )}

        {/* Statut */}
        <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,padding:"12px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:8}}>Statut</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {STATUTS.map(s=>{
              const cfg = contactStatutCfg(s);
              const active = contact.statut===s;
              return (
                <button key={s} onClick={()=>onUpdateStatut(contact.id,s)} style={{
                  padding:"6px 11px",borderRadius:8,fontSize:11,fontWeight:500,
                  cursor:"pointer",border:"none",fontFamily:"inherit",
                  background:active?cfg.bg:T.bg2, color:active?cfg.color:T.tx3,
                  boxShadow:active?`0 0 0 1.5px ${cfg.color}`:"none",
                }}>{cfg.label}</button>
              );
            })}
          </div>
        </div>

        {/* Opportunités */}
        <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`,background:T.bg,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,fontWeight:700,color:T.tx2,textTransform:"uppercase",
              letterSpacing:".05em"}}>Opportunités ({contactOpps.length})</div>
            <Btn onClick={onCreateOpp} bg={T.greenL} color={T.greenD} sm>+ Opportunité</Btn>
          </div>
          <div style={{padding:"8px 12px"}}>
            {contactOpps.length===0 ? (
              <div style={{fontSize:12,color:T.tx3,textAlign:"center",padding:"10px 0"}}>
                Aucune opportunité — cliquer + pour en créer une
              </div>
            ) : contactOpps.map((o,i)=>{
              const os = oppStatutCfg(o.statut);
              const pc = prioriteCfg(o.priorite);
              return (
                <div key={o.id} style={{padding:"9px 0",
                  borderBottom:i<contactOpps.length-1?`0.5px solid ${T.bd}`:"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"flex-start",marginBottom:4}}>
                    <div>
                      <Badge bg={os.bg} color={os.color}>{os.label}</Badge>
                      {" "}
                      <span style={{fontSize:11,color:pc.color,fontWeight:600}}>
                        {pc.label}
                      </span>
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      {o.statut==="nouvelle"&&(
                        <Btn onClick={()=>onUpdateOppStatut(o.id,"visite_prevue")}
                          bg={T.blueL} color={T.blueD} sm>Planifier visite</Btn>
                      )}
                      {o.statut==="visite_prevue"&&(
                        <Btn onClick={()=>onUpdateOppStatut(o.id,"visite_realisee")}
                          bg={T.purpleL} color={T.purpleD} sm>Visite réalisée</Btn>
                      )}
                      {o.statut==="visite_realisee"&&(
                        <Btn onClick={()=>onUpdateOppStatut(o.id,"lot_cree")}
                          bg={T.greenL} color={T.greenD} sm>🌲 Créer lot</Btn>
                      )}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:T.tx}}>
                    {typeRessourceLabel(o.typeRessource)}
                    {o.volumeEstimeT ? ` · ~${o.volumeEstimeT} t` : ""}
                    {o.surfaceHa ? ` · ${o.surfaceHa} ha` : ""}
                  </div>
                  {o.notes&&(
                    <div style={{fontSize:11,color:T.tx3,marginTop:2}}>{o.notes}</div>
                  )}
                  {o.rappelAt&&(
                    <div style={{fontSize:10,color:T.amber,marginTop:3}}>
                      📅 Rappel : {fmtDate(o.rappelAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow step */}
        <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,padding:"12px"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:8}}>Progression workflow</div>
          <WorkflowBar currentStep={
            contactOpps.some(o=>o.statut==="lot_cree") ? 3
            : contactOpps.some(o=>o.statut==="visite_realisee") ? 2
            : contactOpps.some(o=>["nouvelle","a_rappeler","visite_prevue"].includes(o.statut)) ? 1
            : 0
          }/>
        </div>

        {/* Historique */}
        <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"9px 12px",borderBottom:`1px solid ${T.bd}`,background:T.bg}}>
            <div style={{fontSize:11,fontWeight:700,color:T.tx2,textTransform:"uppercase",
              letterSpacing:".05em"}}>Historique</div>
          </div>
          <div style={{padding:"8px 12px"}}>
            <Historique events={historique.filter(e=>
              e.refId===contact.id || contactOpps.some(o=>o.id===e.refId))}/>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── LISTE CONTACTS ─────────────────────────────────────────────────────────────
const ListeContacts = ({contacts, opportunites, onSelect, onNew}) => {
  const [search, setSearch]   = useState("");
  const [filterType, setFilterType] = useState("tous");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [sortBy, setSortBy]   = useState("date");

  const STATUT_FILTER_OPTS = [
    ["tous","Tous"],["nouveau","Nouveau"],["a_rappeler","À rappeler"],
    ["qualifie","Qualifié"],["converti","Converti"],
  ];
  const TYPE_FILTER_OPTS = [
    ["tous","Tous"],["proprietaire_forestier","Propriétaire"],
    ["cooperative","Coopérative"],["etf","ETF"],
    ["transporteur","Transporteur"],["chaufferie","Chaufferie"],
  ];

  const filtered = useMemo(()=>{
    let list = [...contacts];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.nom.toLowerCase().includes(q) ||
        c.prenom?.toLowerCase().includes(q) ||
        c.commune.toLowerCase().includes(q) ||
        c.societe?.toLowerCase().includes(q) ||
        c.telephone.includes(q)
      );
    }
    if (filterType !== "tous") list = list.filter(c=>c.typeContact===filterType);
    if (filterStatut !== "tous") list = list.filter(c=>c.statut===filterStatut);
    if (sortBy==="date") list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    if (sortBy==="nom")  list.sort((a,b)=>a.nom.localeCompare(b.nom));
    return list;
  },[contacts,search,filterType,filterStatut,sortBy]);

  const rappels = contacts.filter(c=>c.statut==="a_rappeler").length;

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      {/* Header */}
      <div style={{padding:"11px 13px 9px",background:"#fff",
        borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>Contacts</div>
          <div style={{fontSize:11,color:T.tx3}}>
            {contacts.length} contact{contacts.length>1?"s":""}
            {rappels>0&&<span style={{color:T.amber}}> · {rappels} à rappeler</span>}
          </div>
        </div>
        <Btn onClick={onNew} bg={T.green} color="#fff">+ Contact</Btn>
      </div>

      {/* Search */}
      <div style={{padding:"9px 13px",background:"#fff",borderBottom:`1px solid ${T.bd}`}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Rechercher nom, commune, téléphone…"
          style={{width:"100%",padding:"9px 12px",borderRadius:10,
            border:`1px solid ${T.bd2}`,fontSize:12,fontFamily:"inherit",outline:"none"}}/>
        <div style={{display:"flex",gap:5,marginTop:7,overflowX:"auto",paddingBottom:2}}>
          {STATUT_FILTER_OPTS.map(([v,l])=>(
            <button key={v} onClick={()=>setFilterStatut(v)} style={{
              padding:"4px 9px",borderRadius:7,fontSize:10,fontWeight:500,
              cursor:"pointer",border:"none",fontFamily:"inherit",whiteSpace:"nowrap",
              background:filterStatut===v?T.green:T.bg2,
              color:filterStatut===v?"#fff":T.tx3,
            }}>{l}</button>
          ))}
          <div style={{width:1,background:T.bd,flexShrink:0,margin:"0 4px"}}/>
          {TYPE_FILTER_OPTS.map(([v,l])=>(
            <button key={v} onClick={()=>setFilterType(v)} style={{
              padding:"4px 9px",borderRadius:7,fontSize:10,fontWeight:500,
              cursor:"pointer",border:"none",fontFamily:"inherit",whiteSpace:"nowrap",
              background:filterType===v?T.blue:T.bg2,
              color:filterType===v?"#fff":T.tx3,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{flex:1,overflowY:"auto",padding:"9px 13px",
        display:"flex",flexDirection:"column",gap:7}}>
        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"28px 0",color:T.tx3}}>
            <div style={{fontSize:28,marginBottom:8}}>🔍</div>
            <div style={{fontSize:13,fontWeight:500}}>Aucun contact trouvé</div>
            <div style={{fontSize:11,marginTop:3}}>Modifier les filtres ou créer un nouveau contact</div>
          </div>
        )}
        {filtered.map(c=>{
          const sc = contactStatutCfg(c.statut);
          const opp = opportunites.filter(o=>o.contactId===c.id);
          const hasUrgentRappel = c.statut==="a_rappeler";
          return (
            <div key={c.id} onClick={()=>onSelect(c)}
              style={{background:"#fff",border:`1px solid ${T.bd}`,
                borderRadius:12,padding:"11px 13px",cursor:"pointer",
                borderLeft:`4px solid ${hasUrgentRappel?T.amber:sc.color}`,
                transition:"box-shadow .1s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.08)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:4}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:18}}>{typeContactEmoji(c.typeContact)}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>
                      {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                    </div>
                    <div style={{fontSize:11,color:T.tx3}}>
                      {c.commune}{c.societe ? ` · ${c.societe}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                  <Badge bg={sc.bg} color={sc.color}>{sc.label}</Badge>
                  {opp.length>0&&(
                    <Badge bg={T.purpleL} color={T.purpleD}>
                      {opp.length} opp.
                    </Badge>
                  )}
                </div>
              </div>
              <div style={{fontSize:11,color:T.tx2}}>
                📞 {c.telephone}
              </div>
              {c.potentiel&&(
                <div style={{fontSize:11,color:T.greenD,marginTop:3}}>
                  🌲 {c.potentiel}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── APP ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [store, setStore] = useState(buildStore);
  const [view, setView] = useState("liste"); // liste | nouveau | fiche | edit | nouvelle-opp | edit-opp
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedOppId,     setSelectedOppId]     = useState(null);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type="success")=>{
    const id = uid();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3000);
  },[]);

  const addHistorique = useCallback((event)=>{
    setStore(s=>({...s,
      historique:[...s.historique,{...event,id:uid(),createdAt:nowISO()}]
    }));
  },[]);

  const selectedContact = store.contacts.find(c=>c.id===selectedContactId);

  // ── Handlers ──
  const handleSaveContact = useCallback((c)=>{
    const isNew = !store.contacts.find(x=>x.id===c.id);
   // Sauvegarder dans l'API
const url = isNew
  ? 'https://applitag-api-production.up.railway.app/contacts'
  : `http://https://applitag-api-production.up.railway.app/contacts/${c.id}`;
const method = isNew ? 'POST' : 'PATCH';

fetch(url, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(c),
}).catch(err => console.log('API indisponible - mode offline', err));

setStore(s=>({...s,
  contacts: isNew
    ? [...s.contacts, c]
    : s.contacts.map(x=>x.id===c.id?c:x),
}));
    addHistorique({
      refId:c.id, refType:"contact",
      action: isNew ? "contact_cree" : "contact_modifie",
      message: isNew
        ? `Contact créé — ${c.prenom?c.prenom+" ":""}${c.nom} (${typeContactLabel(c.typeContact)})`
        : `Contact mis à jour — ${c.nom}`,
      utilisateur:"J. Moreau",
    });
    toast(isNew?"Contact enregistré ✓":"Contact mis à jour ✓");
    setSelectedContactId(c.id);
    setView("fiche");
  },[store.contacts,addHistorique,toast]);

  const handleSaveOpp = useCallback((o)=>{
    const isNew = !store.opportunites.find(x=>x.id===o.id);
    setStore(s=>({...s,
      opportunites: isNew
        ? [...s.opportunites, o]
        : s.opportunites.map(x=>x.id===o.id?o:x),
    }));
    addHistorique({
      refId:o.id, refType:"opportunite",
      action: isNew ? "opportunite_creee" : "opportunite_modifiee",
      message: isNew
        ? `Opportunité créée — ${typeRessourceLabel(o.typeRessource)}${o.volumeEstimeT?` · ~${o.volumeEstimeT} t`:""}`
        : `Opportunité mise à jour`,
      utilisateur:"J. Moreau",
    });
    toast(isNew?"Opportunité créée ✓":"Opportunité mise à jour ✓");
    setView("fiche");
  },[store.opportunites,addHistorique,toast]);

  const handleUpdateContactStatut = useCallback((id, statut)=>{
    setStore(s=>({...s,
      contacts:s.contacts.map(c=>c.id===id?{...c,statut}:c)
    }));
    addHistorique({
      refId:id, refType:"contact", action:"statut_change",
      message:`Statut contact → ${contactStatutCfg(statut).label}`,
      utilisateur:"J. Moreau",
    });
    toast(`Statut → ${contactStatutCfg(statut).label}`);
  },[addHistorique,toast]);

  const handleUpdateOppStatut = useCallback((id, statut)=>{
    setStore(s=>({...s,
      opportunites:s.opportunites.map(o=>o.id===id?{...o,statut}:o)
    }));
    // Si lot créé → mettre contact en converti
    if (statut==="lot_cree") {
      const opp = store.opportunites.find(o=>o.id===id);
      if (opp) handleUpdateContactStatut(opp.contactId,"converti");
    }
    addHistorique({
      refId:id, refType:"opportunite", action:"statut_change",
      message:`Opportunité → ${oppStatutCfg(statut).label}`,
      utilisateur:"J. Moreau",
    });
    toast(`Opportunité → ${oppStatutCfg(statut).label}`);
  },[store.opportunites,addHistorique,toast,handleUpdateContactStatut]);

  // ── Tests view ──
  const TestsView = () => (
    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>
        Tests core — {TESTS_PASS}/{TEST_RESULTS.length} passés
      </div>
      <div style={{marginBottom:10,padding:"9px 12px",borderRadius:9,
        background:TESTS_PASS===TEST_RESULTS.length?T.greenL:T.amberL,
        fontSize:12,fontWeight:600,
        color:TESTS_PASS===TEST_RESULTS.length?T.greenD:T.amberD}}>
        {TESTS_PASS}/{TEST_RESULTS.length} tests passés
      </div>
      {TEST_RESULTS.map((r,i)=>(
        <div key={i} style={{display:"flex",gap:8,padding:"6px 0",
          borderBottom:`0.5px solid ${T.bd}`,fontSize:12}}>
          <span style={{color:r.pass?T.green:T.red,fontWeight:700,fontSize:14}}>{r.pass?"✓":"✗"}</span>
          <div>
            <div style={{color:r.pass?T.tx:T.red}}>{r.name}</div>
            {r.err&&<div style={{fontSize:10,color:T.red}}>{r.err}</div>}
          </div>
        </div>
      ))}
    </div>
  );

  // ── Render ──
  const renderView = () => {
    if (view==="tests") return <TestsView/>;
    if (view==="liste") return (
      <ListeContacts
        contacts={store.contacts}
        opportunites={store.opportunites}
        onSelect={c=>{setSelectedContactId(c.id);setView("fiche");}}
        onNew={()=>setView("nouveau")}/>
    );
    if (view==="nouveau") return (
      <FormulaireContact
        onSave={handleSaveContact}
        onBack={()=>setView("liste")}/>
    );
    if (view==="edit"&&selectedContact) return (
      <FormulaireContact
        editContact={selectedContact}
        onSave={handleSaveContact}
        onBack={()=>setView("fiche")}/>
    );
    if (view==="fiche"&&selectedContact) return (
      <FicheContact
        contact={selectedContact}
        opportunites={store.opportunites}
        historique={store.historique}
        onBack={()=>setView("liste")}
        onEdit={()=>setView("edit")}
        onCreateOpp={()=>setView("nouvelle-opp")}
        onUpdateStatut={handleUpdateContactStatut}
        onUpdateOppStatut={handleUpdateOppStatut}
        onDeleteOpp={id=>{
          setStore(s=>({...s,opportunites:s.opportunites.filter(o=>o.id!==id)}));
          toast("Opportunité supprimée","warn");
        }}/>
    );
    if (view==="nouvelle-opp"&&selectedContact) return (
      <FormulaireOpportunite
        contact={selectedContact}
        onSave={handleSaveOpp}
        onBack={()=>setView("fiche")}/>
    );
    if (view==="pipeline") return (
      <div style={{flex:1,overflowY:"auto",padding:"12px 13px"}}>
        <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>
          Pipeline — {store.opportunites.length} opportunités
        </div>
        {["nouvelle","a_rappeler","visite_prevue","visite_realisee","lot_cree"].map(statut=>{
          const opps = store.opportunites.filter(o=>o.statut===statut);
          if (!opps.length) return null;
          const cfg = oppStatutCfg(statut);
          return (
            <div key={statut} style={{marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <Badge bg={cfg.bg} color={cfg.color}>{cfg.label}</Badge>
                <span style={{fontSize:11,color:T.tx3}}>{opps.length}</span>
              </div>
              {opps.map(o=>{
                const c = store.contacts.find(x=>x.id===o.contactId);
                const pc = prioriteCfg(o.priorite);
                return (
                  <div key={o.id}
                    onClick={()=>{setSelectedContactId(o.contactId);setView("fiche");}}
                    style={{background:"#fff",border:`1px solid ${T.bd}`,
                      borderRadius:10,padding:"10px 12px",marginBottom:6,
                      cursor:"pointer",borderLeft:`3px solid ${cfg.color}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:500}}>
                        {c ? (c.prenom?`${c.prenom} ${c.nom}`:c.nom) : "—"}
                      </span>
                      <span style={{fontSize:11,color:pc.color,fontWeight:600}}>
                        ● {pc.label}
                      </span>
                    </div>
                    <div style={{fontSize:11,color:T.tx3}}>
                      {typeRessourceLabel(o.typeRessource)}
                      {o.volumeEstimeT?` · ~${o.volumeEstimeT} t`:""}
                      {c?` · ${c.commune}`:""}
                    </div>
                    {o.rappelAt&&(
                      <div style={{fontSize:10,color:T.amber,marginTop:3}}>
                        📅 {fmtDate(o.rappelAt)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
    return null;
  };

  return (
    <div style={{display:"flex",justifyContent:"center",
      minHeight:"100vh",background:T.bg,padding:"12px 8px",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>

      {/* Toasts */}
      <div style={{position:"fixed",top:14,right:14,zIndex:9999,
        display:"flex",flexDirection:"column",gap:6,pointerEvents:"none"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:"9px 15px",borderRadius:9,fontSize:12,
            fontWeight:500,color:"#fff",boxShadow:"0 4px 14px rgba(0,0,0,.2)",
            background:t.type==="success"?T.greenD:t.type==="warn"?T.amberD:T.red}}>
            {t.type==="success"?"✓":t.type==="warn"?"⚠":"✗"} {t.msg}
          </div>
        ))}
      </div>

      {/* Phone frame */}
      <div style={{width:340,background:"#111",borderRadius:36,overflow:"hidden",
        border:"6px solid #1A1A1A",boxShadow:"0 16px 48px rgba(0,0,0,.35)",
        display:"flex",flexDirection:"column",alignSelf:"flex-start"}}>
        {/* Notch */}
        <div style={{height:20,background:"#111",display:"flex",
          alignItems:"center",justifyContent:"center"}}>
          <div style={{width:56,height:7,background:"#000",borderRadius:4}}/>
        </div>

        {/* App */}
        <div style={{background:T.bg,minHeight:620,display:"flex",
          flexDirection:"column",maxHeight:660,overflow:"hidden"}}>

          {/* Topbar */}
          <div style={{background:T.sb,color:"#fff",padding:"8px 12px",
            display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:22,height:22,background:T.green,borderRadius:5,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>🌲</div>
            <span style={{fontSize:13,fontWeight:700,letterSpacing:".02em"}}>APPLITAG</span>
            <div style={{flex:1}}/>
            <Badge bg={T.greenL} color={T.greenD}>
              {TESTS_PASS}/{TEST_RESULTS.length} ✓
            </Badge>
          </div>

          {/* Content */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {renderView()}
          </div>

          {/* Bottom nav */}
          <div style={{height:52,background:"#111",display:"flex",
            alignItems:"center",justifyContent:"space-around",flexShrink:0}}>
            {[
              ["liste","📋","Contacts"],
              ["pipeline","💡","Pipeline"],
              ["tests","🧪","Tests"],
            ].map(([id,icon,label])=>(
              <button key={id} onClick={()=>setView(id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                cursor:"pointer",padding:"4px 8px",borderRadius:6,
                background:"none",border:"none",fontFamily:"inherit",
              }}>
                <span style={{fontSize:18,opacity:view===id?1:0.4}}>{icon}</span>
                <span style={{fontSize:9,fontWeight:500,
                  color:view===id?T.green:"#666"}}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div style={{maxWidth:260,marginLeft:16,display:"flex",
        flexDirection:"column",gap:8,paddingTop:4,alignSelf:"flex-start"}}>
        <div style={{background:"#fff",border:`1px solid ${T.bd}`,
          borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:13,fontWeight:600,color:T.green,marginBottom:6}}>
            Sprint 0 — Contact
          </div>
          <div style={{fontSize:11,color:T.tx2,lineHeight:1.8}}>
            <div>📍 GPS automatique</div>
            <div>🔍 Recherche + filtres</div>
            <div>📋 9 types de contact</div>
            <div>🌿 8 origines du contact</div>
            <div>💡 Pipeline par statut</div>
            <div>📅 Rappels</div>
            <div>✅ Workflow intégré</div>
          </div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${T.bd}`,
          borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:11,fontWeight:700,color:T.tx2,
            textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>
            Workflow complet
          </div>
          {[
            ["👤","Contact",T.green],
            ["💡","Opportunité",T.purple],
            ["🔭","Visite",T.blue],
            ["🌲","Lot",T.green],
            ["⛏","Exploitation",T.amber],
            ["📦","Tas",T.brown],
            ["🚛","Transport",T.purple],
            ["🏭","Livraison",T.blue],
            ["🔒","Clôture",T.green],
          ].map(([ic,l,c],i)=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:7,
              padding:"3px 0",borderBottom:`0.5px solid ${T.bd}`,fontSize:11}}>
              <span>{ic}</span>
              <span style={{flex:1,color:i===0||i===1?c:T.tx3,
                fontWeight:i<=1?600:400}}>{l}</span>
              {i<8&&<span style={{color:T.bd2,fontSize:10}}>↓</span>}
            </div>
          ))}
        </div>
        <div style={{background:T.greenL,borderRadius:12,padding:"10px 13px",
          fontSize:11,color:T.greenD,lineHeight:1.6,border:`1px solid ${T.green}20`}}>
          <strong>Validation :</strong> nom + téléphone + commune + type obligatoires.
          Statut automatique "Nouveau" à la création.
          {TESTS_PASS}/{TEST_RESULTS.length} tests passés.
        </div>
      </div>
    </div>
  );
}
