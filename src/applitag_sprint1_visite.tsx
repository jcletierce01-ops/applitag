// @ts-nocheck
// ============================================================
// APPLITAG — Sprint 1 : Visite Terrain Réelle
// TypeScript-style JSDoc · Zustand (simulé) · Mobile terrain
// Parcours : Opportunité → Visite → Lot créé
// ============================================================

import { useState, useCallback, useMemo, useEffect } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────

/**
 * @typedef {'proprietaire_forestier'|'cooperative'|'etf'|'chaufferie'|'plateforme'|'transporteur'|'negociant'|'collectivite'|'prospect'} ContactType
 * @typedef {'nouveau'|'a_rappeler'|'qualifie'|'converti'|'perdu'} ContactStatut
 * @typedef {'nouvelle'|'a_visiter'|'visite_programmee'|'visite_faite'|'lot_cree'|'perdue'} OpportuniteStatut
 * @typedef {'basse'|'normale'|'haute'|'immediate'} Urgence
 * @typedef {'peuplier'|'chene'|'frene'|'acacia'|'saule'|'bouleau'|'charme'|'aulne'|'autre'} EssenceType
 * @typedef {'BROUILLON'|'A_VISITER'|'VISITE_REALISEE'|'VALIDE_EXPLOITATION'} LotStatut
 * @typedef {'contact_cree'|'opportunite_creee'|'statut_change'|'visite_creee'|'visite_validee'|'lot_cree'|'rappel'} HistoriqueAction
 */

/**
 * @typedef {Object} Contact
 * @property {string} id
 * @property {string} nom
 * @property {string} telephone
 * @property {ContactType} typeContact
 * @property {string} [prenom]
 * @property {string} [societe]
 * @property {ContactStatut} statut
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Opportunite
 * @property {string} id
 * @property {string} contactId
 * @property {string} [commune]
 * @property {number} [volumeEstime]
 * @property {string} [typeBois]
 * @property {Urgence} urgence
 * @property {OpportuniteStatut} statut
 * @property {string} [notes]
 * @property {string} [visiteId]
 * @property {string} [lotId]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} EssenceItem
 * @property {EssenceType} essence
 * @property {number} pct
 * @property {number} volumeT
 * @property {'p45'|'p63'|'p100'} granulometrie
 */

/**
 * @typedef {Object} ContrainteTerrain
 * @property {boolean} ligneEDF
 * @property {boolean} lignesTelecom
 * @property {boolean} penteFort
 * @property {boolean} zoneHumide
 * @property {boolean} voisinage
 * @property {boolean} accesDifficile
 * @property {boolean} routeLimitee
 * @property {boolean} naturaZone
 * @property {boolean} remanents
 */

/**
 * @typedef {Object} AccesCamion
 * @property {'praticable'|'difficile'|'impossible'} type
 * @property {number} [largeurM]
 * @property {number} [distancePlatekm]
 */

/**
 * @typedef {Object} Photo
 * @property {string} id
 * @property {string} url
 * @property {string} label
 * @property {string} createdAt
 */

/**
 * @typedef {Object} VisiteTerrain
 * @property {string} id
 * @property {string} opportuniteId
 * @property {string} contactId
 * @property {string} agentId
 * @property {string} agentNom
 * @property {string} dateVisite
 * @property {{ lat: number, lng: number, source: 'auto'|'manuel' } | null} gps
 * @property {Photo[]} photos
 * @property {EssenceItem[]} essences
 * @property {number | null} volumeEstimeT
 * @property {number | null} surfaceEstimeeHa
 * @property {ContrainteTerrain} contraintes
 * @property {AccesCamion} accesCamion
 * @property {string} dateLimiteExploitation
 * @property {string} observations
 * @property {'en_cours'|'soumise'|'validee'|'refusee'} statut
 * @property {string} createdAt
 * @property {string} [valideeAt]
 */

/**
 * @typedef {Object} Lot
 * @property {string} id
 * @property {string} numeroLot
 * @property {LotStatut} statut
 * @property {string} commune
 * @property {string} [essencePrincipale]
 * @property {number} [volumeEstime]
 * @property {number} [surfaceHa]
 * @property {{ lat: number, lng: number } | null} gps
 * @property {string} [certification]
 * @property {string} [contactId]
 * @property {string} [opportuniteId]
 * @property {string} [visiteId]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} HistoriqueEvent
 * @property {string} id
 * @property {string} refId
 * @property {'contact'|'opportunite'|'visite'|'lot'} refType
 * @property {HistoriqueAction} action
 * @property {string} message
 * @property {Record<string,any>} [data]
 * @property {string} utilisateur
 * @property {string} createdAt
 */

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75", greenL:"#E1F5EE", greenD:"#085041",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  coral:"#D85A30", coralL:"#FAECE7", coralD:"#4A1B0C",
  blue:"#185FA5", blueL:"#E6F1FB", blueD:"#042C53",
  amber:"#BA7517", amberL:"#FAEEDA", amberD:"#412402",
  red:"#A32D2D", redL:"#FCEBEB",
  bg:"#F5F4F1", bg2:"#ECEAE6", bg3:"#fff",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
};

// ── STORE (Zustand-style, local state) ────────────────────────────────────────

/** @type {Contact[]} */
const INIT_CONTACTS = [
  { id:"c1", nom:"Bernard", prenom:"Michel", telephone:"06 12 34 56 78",
    typeContact:"proprietaire_forestier", statut:"a_rappeler", createdAt:"2025-06-10T14:32:00Z" },
  { id:"c2", nom:"Coopérative Yonne Bois", telephone:"03 86 11 22 33",
    typeContact:"cooperative", statut:"qualifie", createdAt:"2025-06-08T09:10:00Z" },
];

/** @type {Opportunite[]} */
const INIT_OPPS = [
  { id:"o1", contactId:"c1", commune:"Charny (89)", volumeEstime:400,
    typeBois:"bois_sur_pied", urgence:"haute", statut:"a_visiter",
    notes:"Peuplier principalement. Accès chemin forestier. Rappel validé.", createdAt:"2025-06-10T14:35:00Z" },
  { id:"o2", contactId:"c2", commune:"Sens (89)", volumeEstime:800,
    typeBois:"bois_abattu", urgence:"normale", statut:"visite_programmee", createdAt:"2025-06-08T09:15:00Z" },
];

/** @type {VisiteTerrain[]} */
const INIT_VISITES = [];

/** @type {Lot[]} */
const INIT_LOTS = [];

/** @type {HistoriqueEvent[]} */
const INIT_HISTORIQUE = [
  { id:"h1", refId:"o1", refType:"opportunite", action:"opportunite_creee",
    message:"Opportunité créée depuis contact M. Bernard", utilisateur:"J. Moreau",
    createdAt:"2025-06-10T14:35:00Z" },
  { id:"h2", refId:"o1", refType:"opportunite", action:"statut_change",
    message:"Statut → À visiter", data:{ancien:"nouvelle",nouveau:"a_visiter"},
    utilisateur:"J. Moreau", createdAt:"2025-06-10T14:36:00Z" },
];

let lotSeq = 8;
const nextLotNum = () => { lotSeq++; return `LOT-2025-0${String(lotSeq).padStart(2,"0")}`; };

// ── HELPERS ────────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2,10);
const fmt = (d) => { if (!d) return "—"; return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}); };
const fmtTime = (d) => { if (!d) return ""; return new Date(d).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}); };

/** @param {EssenceType} e */
const essenceLabel = (e) => ({
  peuplier:"Peuplier", chene:"Chêne", frene:"Frêne", acacia:"Acacia",
  saule:"Saule", bouleau:"Bouleau", charme:"Charme", aulne:"Aulne", autre:"Autre",
}[e] ?? e);

const typeLabel = (t) => ({
  proprietaire_forestier:"Propriétaire", cooperative:"Coopérative", etf:"ETF",
  transporteur:"Transporteur", chaufferie:"Chaufferie", plateforme:"Plateforme",
  negociant:"Négociant", collectivite:"Collectivité", prospect:"Prospect",
}[t] ?? t);

const oppStatutBadge = (s) => ({
  nouvelle:          {bg:T.bg2,    color:T.tx2,   label:"Nouvelle"},
  a_visiter:         {bg:T.amberL, color:T.amberD, label:"À visiter"},
  visite_programmee: {bg:T.blueL,  color:T.blueD,  label:"Visite prog."},
  visite_faite:      {bg:T.purpleL,color:T.purpleD,label:"Visite faite"},
  lot_cree:          {bg:T.greenL, color:T.greenD, label:"Lot créé ✓"},
  perdue:            {bg:T.redL,   color:T.red,    label:"Perdue"},
}[s] ?? {bg:T.bg2, color:T.tx2, label:s});

const visiteStatutBadge = (s) => ({
  en_cours: {bg:T.bg2,    color:T.tx2,   label:"En cours"},
  soumise:  {bg:T.amberL, color:T.amberD,label:"Soumise"},
  validee:  {bg:T.greenL, color:T.greenD,label:"Validée ✓"},
  refusee:  {bg:T.redL,   color:T.red,   label:"Refusée"},
}[s] ?? {bg:T.bg2, color:T.tx2, label:s});

const actionIcon = (a) => ({
  contact_cree:"👤", opportunite_creee:"💡", statut_change:"🔄",
  visite_creee:"🔭", visite_validee:"✅", lot_cree:"🌲", rappel:"📅",
}[a] ?? "•");

// ── ATOMS ──────────────────────────────────────────────────────────────────────
const Badge = ({bg, color, children}) => (
  <span style={{display:"inline-block",padding:"2px 8px",borderRadius:9,
    fontSize:10,fontWeight:600,background:bg,color,whiteSpace:"nowrap"}}>{children}</span>
);

const BigBtn = ({onClick, bg, color="#fff", disabled, children, style={}}) => (
  <button onClick={disabled ? undefined : onClick} style={{
    width:"100%", padding:"15px 14px", borderRadius:14, fontSize:14, fontWeight:500,
    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
    cursor:disabled?"not-allowed":"pointer", border:"none", fontFamily:"inherit",
    background:disabled ? T.bg2 : bg, color:disabled ? T.tx3 : color,
    transition:"all .12s", opacity:disabled?0.7:1, ...style,
  }}>{children}</button>
);

const SmBtn = ({onClick, bg=T.bg2, color=T.tx, children, style={}}) => (
  <button onClick={onClick} style={{
    padding:"9px 12px", borderRadius:10, fontSize:12, fontWeight:500,
    display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer",
    border:"none", fontFamily:"inherit", background:bg, color, ...style,
  }}>{children}</button>
);

const Field = ({label, required, sub, children}) => (
  <div style={{marginBottom:11}}>
    <div style={{fontSize:11, fontWeight:600, color:T.tx2, marginBottom:3, display:"flex", gap:5, alignItems:"baseline"}}>
      {label}{required && <span style={{color:"#E24B4A"}}>*</span>}
      {sub && <span style={{fontSize:10, fontWeight:400, color:T.tx3}}>{sub}</span>}
    </div>
    {children}
  </div>
);

const FInput = ({value, onChange, placeholder, type="text"}) => (
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
    style={{width:"100%", padding:"11px 10px", borderRadius:10, border:`1px solid ${T.bd2}`,
      fontSize:13, fontFamily:"inherit", background:"#fff", color:T.tx, outline:"none"}} />
);

const FTextarea = ({value, onChange, placeholder, rows=3}) => (
  <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    rows={rows} style={{width:"100%", padding:"10px", borderRadius:10, resize:"vertical",
      border:`1px solid ${T.bd2}`, fontSize:13, fontFamily:"inherit", background:"#fff",
      color:T.tx, outline:"none", lineHeight:1.5}} />
);

const Chips = ({options, value, onChange, multi=false}) => (
  <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
    {options.map(([v, label]) => {
      const active = multi ? (value||[]).includes(v) : value === v;
      return (
        <button key={v} onClick={() => {
          if (multi) {
            const cur = value || [];
            onChange(active ? cur.filter(x=>x!==v) : [...cur, v]);
          } else { onChange(v); }
        }} style={{
          padding:"8px 11px", borderRadius:9, fontSize:11, fontWeight:500,
          cursor:"pointer", border:"none", fontFamily:"inherit",
          background:active ? T.greenL : T.bg2, color:active ? T.greenD : T.tx2,
          boxShadow:active ? `0 0 0 1.5px ${T.green}` : "none", transition:"all .1s",
        }}>{label}</button>
      );
    })}
  </div>
);

const CheckItem = ({checked, onChange, label, sub}) => (
  <div onClick={()=>onChange(!checked)} style={{display:"flex", alignItems:"flex-start",
    gap:10, padding:"8px 0", borderBottom:`0.5px solid ${T.bd}`, cursor:"pointer"}}>
    <div style={{width:24, height:24, borderRadius:7, border:`1.5px solid ${checked?T.green:T.bd2}`,
      background:checked?T.green:"#fff", display:"flex", alignItems:"center",
      justifyContent:"center", flexShrink:0, marginTop:1}}>
      {checked && <span style={{color:"#fff", fontSize:14, lineHeight:1}}>✓</span>}
    </div>
    <div>
      <div style={{fontSize:13, fontWeight:500, color:checked?T.greenD:T.tx}}>{label}</div>
      {sub && <div style={{fontSize:11, color:T.tx3}}>{sub}</div>}
    </div>
  </div>
);

const Divider = () => <div style={{height:1, background:T.bd, margin:"10px 0"}} />;

const SectionCard = ({title, icon, color=T.tx2, children}) => (
  <div style={{background:"#fff", borderRadius:12, padding:"11px 12px",
    border:`1px solid ${T.bd}`, marginBottom:8}}>
    <div style={{fontSize:10, fontWeight:700, color, textTransform:"uppercase",
      letterSpacing:".05em", marginBottom:9, display:"flex", alignItems:"center", gap:6}}>
      {icon} {title}
    </div>
    {children}
  </div>
);

// Step pill
const StepBar = ({step, total, steps}) => (
  <div style={{padding:"8px 12px", background:"#fff", borderBottom:`1px solid ${T.bd}`,
    display:"flex", gap:4, alignItems:"center"}}>
    {Array.from({length:total}).map((_,i) => {
      const done = i < step-1, active = i === step-1;
      return (
        <div key={i} style={{flex:1, height:4, borderRadius:2,
          background:done ? T.green : active ? T.amber : T.bg2}} />
      );
    })}
    <span style={{fontSize:10, color:T.tx3, marginLeft:6, whiteSpace:"nowrap"}}>
      {step}/{total} {steps[step-1]}
    </span>
  </div>
);

// ── ESSENCE EDITOR ─────────────────────────────────────────────────────────────
/** @param {{ essences: EssenceItem[], onChange: (e:EssenceItem[])=>void }} props */
const EssenceEditor = ({essences, onChange}) => {
  const ESSENCES = [
    ["peuplier","Peuplier"],["chene","Chêne"],["frene","Frêne"],["acacia","Acacia"],
    ["saule","Saule"],["bouleau","Bouleau"],["charme","Charme"],["aulne","Aulne"],["autre","Autre"],
  ];
  const GRANULO = [["p45","P45"],["p63","P63"],["p100","P100"]];

  const add = () => {
    const existing = new Set(essences.map(e=>e.essence));
    const next = ESSENCES.find(([v])=>!existing.has(v));
    if (!next) return;
    const newItem = {essence:next[0], pct:0, volumeT:0, granulometrie:"p45"};
    onChange([...essences, newItem]);
  };

  const update = (i, patch) => {
    const updated = essences.map((e,idx) => idx===i ? {...e,...patch} : e);
    onChange(updated);
  };

  const remove = (i) => onChange(essences.filter((_,idx)=>idx!==i));

  const totalPct = essences.reduce((s,e)=>s+e.pct, 0);
  const totalVol = essences.reduce((s,e)=>s+e.volumeT, 0);
  const pctOk = essences.length === 0 || Math.abs(totalPct - 100) <= 2;

  return (
    <div>
      {essences.map((e,i) => (
        <div key={i} style={{background:T.bg2, borderRadius:10, padding:"10px 11px",
          marginBottom:7, border:`1px solid ${pctOk ? T.bd : T.amberD}`}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
            <select value={e.essence} onChange={ev=>update(i,{essence:ev.target.value})}
              style={{border:`1px solid ${T.bd2}`, borderRadius:8, padding:"6px 8px",
                fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", flex:1}}>
              {ESSENCES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <button onClick={()=>remove(i)} style={{marginLeft:8, background:T.redL, color:T.red,
              border:"none", borderRadius:7, padding:"5px 9px", cursor:"pointer", fontSize:12,
              fontFamily:"inherit"}}>✕</button>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6}}>
            <div>
              <div style={{fontSize:10, color:T.tx3, marginBottom:3}}>% de composition</div>
              <input type="number" value={e.pct} min={0} max={100}
                onChange={ev=>update(i,{pct:Number(ev.target.value)})}
                style={{width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${T.bd2}`,
                  fontSize:13, fontFamily:"inherit", outline:"none", textAlign:"center"}} />
            </div>
            <div>
              <div style={{fontSize:10, color:T.tx3, marginBottom:3}}>Volume (t)</div>
              <input type="number" value={e.volumeT} min={0}
                onChange={ev=>update(i,{volumeT:Number(ev.target.value)})}
                style={{width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${T.bd2}`,
                  fontSize:13, fontFamily:"inherit", outline:"none", textAlign:"center"}} />
            </div>
            <div>
              <div style={{fontSize:10, color:T.tx3, marginBottom:3}}>Granulo</div>
              <select value={e.granulometrie} onChange={ev=>update(i,{granulometrie:ev.target.value})}
                style={{width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${T.bd2}`,
                  fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none"}}>
                {GRANULO.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <SmBtn onClick={add} bg={T.greenL} color={T.greenD}>+ Ajouter une essence</SmBtn>
        {essences.length > 0 && (
          <div style={{fontSize:11, fontWeight:600,
            color:pctOk ? T.greenD : T.amberD}}>
            Σ {totalPct} % · {totalVol} t {!pctOk && "⚠ ≠ 100%"}
          </div>
        )}
      </div>
    </div>
  );
};

// ── GPS WIDGET ──────────────────────────────────────────────────────────────────
/** @param {{ value: {lat:number,lng:number,source:string}|null, onChange: Function }} */
const GpsWidget = ({value, onChange}) => {
  const [manualMode, setManualMode] = useState(false);
  const [manLat, setManLat] = useState("");
  const [manLng, setManLng] = useState("");
  const [loading, setLoading] = useState(false);

  const capture = () => {
    setLoading(true);
    // Simule l'API Geolocation avec un délai réaliste
    setTimeout(() => {
      const lat = 47.9801 + (Math.random()-0.5)*0.02;
      const lng = 3.0876 + (Math.random()-0.5)*0.02;
      onChange({lat:parseFloat(lat.toFixed(6)), lng:parseFloat(lng.toFixed(6)), source:"auto"});
      setLoading(false);
    }, 1200);
  };

  const saveManual = () => {
    if (manLat && manLng) {
      onChange({lat:parseFloat(manLat), lng:parseFloat(manLng), source:"manuel"});
      setManualMode(false);
    }
  };

  return (
    <div>
      {value ? (
        <div style={{background:T.greenL, borderRadius:10, padding:"10px 12px", marginBottom:8}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
            <div>
              <div style={{fontSize:10, color:T.greenD, fontWeight:600, marginBottom:3}}>
                📍 Position {value.source === "manuel" ? "saisie manuellement" : "capturée automatiquement"}
              </div>
              <div style={{fontFamily:"monospace", fontSize:13, fontWeight:600, color:T.greenD}}>
                {value.lat.toFixed(6)}°N · {value.lng.toFixed(6)}°E
              </div>
            </div>
            <button onClick={()=>onChange(null)} style={{background:"none", border:"none",
              color:T.greenD, cursor:"pointer", fontSize:18, padding:0}}>✕</button>
          </div>
          {/* Mini carte simulée */}
          <div style={{marginTop:8, height:60, background:"linear-gradient(160deg,#C6E4CF,#E8F4EC)",
            borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
            position:"relative", overflow:"hidden"}}>
            <div style={{position:"absolute", width:10, height:10, borderRadius:"50%",
              background:T.coral, border:"2px solid #fff", top:"50%", left:"50%",
              transform:"translate(-50%,-50%)", boxShadow:"0 1px 4px rgba(0,0,0,.3)"}} />
            <span style={{fontSize:10, color:T.greenD, fontWeight:500, marginTop:16}}>
              Carte parcelle
            </span>
          </div>
        </div>
      ) : null}

      {!value && !manualMode && (
        <button onClick={capture} disabled={loading}
          style={{width:"100%", padding:"14px", borderRadius:12, border:"none",
            background:loading ? T.bg2 : T.greenL, color:loading ? T.tx3 : T.greenD,
            fontSize:13, fontWeight:500, display:"flex", alignItems:"center",
            justifyContent:"center", gap:8, cursor:loading?"wait":"pointer", fontFamily:"inherit"}}>
          {loading ? "⏳ Localisation en cours…" : "📍 Capturer la position GPS"}
        </button>
      )}

      {!value && manualMode && (
        <div style={{background:T.bg2, borderRadius:10, padding:"10px 12px"}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8}}>
            <div>
              <div style={{fontSize:10, color:T.tx3, marginBottom:3}}>Latitude</div>
              <input value={manLat} onChange={e=>setManLat(e.target.value)} placeholder="47.9801"
                type="number" step="0.0001"
                style={{width:"100%", padding:"9px", borderRadius:8, border:`1px solid ${T.bd2}`,
                  fontSize:13, fontFamily:"inherit", outline:"none"}} />
            </div>
            <div>
              <div style={{fontSize:10, color:T.tx3, marginBottom:3}}>Longitude</div>
              <input value={manLng} onChange={e=>setManLng(e.target.value)} placeholder="3.0876"
                type="number" step="0.0001"
                style={{width:"100%", padding:"9px", borderRadius:8, border:`1px solid ${T.bd2}`,
                  fontSize:13, fontFamily:"inherit", outline:"none"}} />
            </div>
          </div>
          <div style={{display:"flex", gap:6}}>
            <SmBtn onClick={saveManual} bg={T.greenL} color={T.greenD} style={{flex:1}}>✓ Valider</SmBtn>
            <SmBtn onClick={()=>setManualMode(false)} style={{flex:1}}>Annuler</SmBtn>
          </div>
        </div>
      )}

      {!value && (
        <div style={{display:"flex", gap:6, marginTop:6}}>
          {!loading && !manualMode && (
            <SmBtn onClick={()=>setManualMode(true)} style={{fontSize:11}}>
              Saisie manuelle
            </SmBtn>
          )}
        </div>
      )}
    </div>
  );
};

// ── PHOTOS WIDGET ──────────────────────────────────────────────────────────────
const PHOTO_URLS = [
  "🌲 Photo forêt", "🌿 Sous-bois", "🪵 Bois abattu",
  "🛤️ Accès chemin", "📏 Vue d'ensemble", "🔍 Détail essence",
];

/** @param {{ photos: Photo[], onChange: Function }} */
const PhotosWidget = ({photos, onChange}) => {
  const add = () => {
    const label = PHOTO_URLS[photos.length % PHOTO_URLS.length];
    const p = {id:uid(), url:`photo_${uid()}`, label, createdAt:now()};
    onChange([...photos, p]);
  };
  const remove = (id) => onChange(photos.filter(p=>p.id!==id));

  return (
    <div>
      <div style={{display:"flex", flexWrap:"wrap", gap:7, marginBottom:8}}>
        {photos.map(p => (
          <div key={p.id} style={{position:"relative"}}>
            <div style={{width:64, height:64, borderRadius:10, background:T.greenL,
              display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", fontSize:20, border:`1px solid ${T.bd}`}}>
              {p.label.split(" ")[0]}
              <div style={{fontSize:8, color:T.greenD, textAlign:"center", padding:"0 2px",
                lineHeight:1.2, marginTop:2}}>{p.label.split(" ").slice(1).join(" ")}</div>
            </div>
            <button onClick={()=>remove(p.id)} style={{position:"absolute", top:-5, right:-5,
              width:18, height:18, borderRadius:"50%", background:T.red, color:"#fff",
              border:"none", cursor:"pointer", fontSize:10, display:"flex",
              alignItems:"center", justifyContent:"center", lineHeight:1}}>✕</button>
          </div>
        ))}
        <div onClick={add} style={{width:64, height:64, borderRadius:10,
          border:`1.5px dashed ${T.bd2}`, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", cursor:"pointer",
          color:T.tx3, gap:3}}>
          <span style={{fontSize:24}}>+</span>
          <span style={{fontSize:8}}>Photo</span>
        </div>
      </div>
      <button onClick={add} style={{width:"100%", padding:"13px", borderRadius:12, border:"none",
        background:"#111", color:"#fff", fontSize:13, fontWeight:500,
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        cursor:"pointer", fontFamily:"inherit"}}>
        📷 Prendre une photo
      </button>
      {photos.length > 0 && (
        <div style={{fontSize:11, color:T.tx3, textAlign:"center", marginTop:5}}>
          {photos.length} photo{photos.length>1?"s":""} · {photos.length >= 2 ? "✓ Minimum atteint" : "⚠ Minimum 2 photos"}
        </div>
      )}
    </div>
  );
};

// ── HISTORIQUE ─────────────────────────────────────────────────────────────────
const HistoriqueView = ({events}) => (
  <div style={{display:"flex", flexDirection:"column", gap:0}}>
    {events.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map((e,i) => (
      <div key={e.id} style={{display:"flex", gap:10, padding:"7px 0",
        borderBottom:i<events.length-1 ? `0.5px solid ${T.bd}` : "none"}}>
        <div style={{width:24, height:24, borderRadius:"50%", background:T.bg2,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, flexShrink:0}}>{actionIcon(e.action)}</div>
        <div>
          <div style={{fontSize:12, fontWeight:500, color:T.tx}}>{e.message}</div>
          <div style={{fontSize:10, color:T.tx3}}>
            {fmt(e.createdAt)} à {fmtTime(e.createdAt)} · {e.utilisateur}
          </div>
        </div>
      </div>
    ))}
    {events.length === 0 && (
      <div style={{fontSize:12, color:T.tx3, textAlign:"center", padding:"12px 0"}}>Aucun événement</div>
    )}
  </div>
);

// ── ÉCRAN VISITE TERRAIN ───────────────────────────────────────────────────────
/**
 * @param {{ opportunite: Opportunite, contact: Contact,
 *           visite: VisiteTerrain|null,
 *           onSave: (v:VisiteTerrain)=>void,
 *           onBack: ()=>void }} props
 */
const VisiteForm = ({opportunite, contact, visite, onSave, onBack}) => {
  const STEPS = ["GPS", "Photos", "Essences", "Terrain", "Accès", "Récap"];
  const [step, setStep] = useState(1);

  // Formulaire
  const [gps, setGps] = useState(visite?.gps ?? null);
  const [photos, setPhotos] = useState(visite?.photos ?? []);
  const [essences, setEssences] = useState(visite?.essences ?? []);
  const [volumeEstimeT, setVolumeEstimeT] = useState(visite?.volumeEstimeT ?? (opportunite.volumeEstime ?? 200));
  const [surfaceEstimeeHa, setSurfaceEstimeeHa] = useState(visite?.surfaceEstimeeHa ?? null);
  const [contraintes, setContraintes] = useState(visite?.contraintes ?? {
    ligneEDF:false, lignesTelecom:false, penteFort:false, zoneHumide:false,
    voisinage:false, accesDifficile:false, routeLimitee:false, naturaZone:false, remanents:false,
  });
  const [accesType, setAccesType] = useState(visite?.accesCamion?.type ?? "praticable");
  const [accesLargeur, setAccesLargeur] = useState(String(visite?.accesCamion?.largeurM ?? ""));
  const [accesDistance, setAccesDistance] = useState(String(visite?.accesCamion?.distancePlatekm ?? ""));
  const [dateLimite, setDateLimite] = useState(visite?.dateLimiteExploitation ?? "");
  const [observations, setObservations] = useState(visite?.observations ?? "");

  const essencesPctOk = essences.length === 0 || Math.abs(essences.reduce((s,e)=>s+e.pct,0)-100) <= 2;

  /** @type {Record<number,boolean>} */
  const stepValid = {
    1: !!gps,
    2: photos.length >= 2,
    3: essences.length > 0 && essencesPctOk,
    4: !!volumeEstimeT && !!surfaceEstimeeHa,
    5: true,
    6: true,
  };

  const canSubmit = stepValid[1] && stepValid[2] && stepValid[3] && stepValid[4];

  const submit = () => {
    if (!canSubmit) return;
    /** @type {VisiteTerrain} */
    const v = {
      id: visite?.id ?? "v" + uid(),
      opportuniteId: opportunite.id,
      contactId: contact.id,
      agentId: "u1",
      agentNom: "J. Moreau",
      dateVisite: new Date().toISOString().slice(0,10),
      gps, photos, essences,
      volumeEstimeT: Number(volumeEstimeT),
      surfaceEstimeeHa: Number(surfaceEstimeeHa),
      contraintes,
      accesCamion: {
        type: accesType,
        largeurM: accesLargeur ? Number(accesLargeur) : undefined,
        distancePlatekm: accesDistance ? Number(accesDistance) : undefined,
      },
      dateLimiteExploitation: dateLimite,
      observations,
      statut: "validee",
      createdAt: visite?.createdAt ?? now(),
      valideeAt: now(),
    };
    onSave(v);
  };

  const CONTRAINTE_LIST = [
    ["ligneEDF", "Ligne EDF", "Risque électrique — distances de sécurité obligatoires"],
    ["lignesTelecom", "Ligne télécom", "Réseau téléphonique ou câble enterré"],
    ["penteFort", "Pente forte", "Inclinaison > 30% — risque débardage"],
    ["zoneHumide", "Zone humide", "Sol portant limité, restrictions environnementales"],
    ["voisinage", "Voisinage sensible", "Habitations proches, restrictions horaires"],
    ["accesDifficile", "Accès difficile", "Chemin étroit ou en mauvais état"],
    ["routeLimitee", "Route limitée tonnage", "Limitation poids lourds à l'accès"],
    ["naturaZone", "Natura 2000 / ZNIEFF", "Zone protégée, autorisation préfectorale"],
    ["remanents", "Rémanents abondants", "Résidus exploitation précédente"],
  ];

  return (
    <div style={{display:"flex", flexDirection:"column", flex:1}}>
      {/* Header */}
      <div style={{padding:"10px 12px 8px", background:"#fff",
        borderBottom:`1px solid ${T.bd}`, display:"flex", alignItems:"center", gap:8}}>
        <button onClick={onBack} style={{background:"none", border:"none", cursor:"pointer",
          fontSize:18, color:T.tx2, padding:"4px 8px 4px 0"}}>‹</button>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:14, fontWeight:500}}>Visite terrain</div>
          <div style={{fontSize:11, color:T.tx3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {opportunite.commune ?? "—"} · {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
          </div>
        </div>
        <Badge bg={T.amberL} color={T.amberD}>En cours</Badge>
      </div>

      <StepBar step={step} total={6} steps={STEPS} />

      <div style={{flex:1, overflowY:"auto", padding:"12px 12px", paddingBottom:80}}>

        {/* Contexte repris de l'opportunité */}
        {step === 1 && (
          <div style={{background:T.purpleL, borderRadius:10, padding:"9px 12px", marginBottom:12,
            fontSize:11, color:T.purpleD}}>
            <div style={{fontWeight:600, marginBottom:3}}>Opportunité source</div>
            <div>{opportunite.commune ?? "Commune non précisée"} · {opportunite.typeBois?.replace(/_/g," ")} · ~{opportunite.volumeEstime ?? "?"} t</div>
            {opportunite.notes && <div style={{marginTop:3, opacity:.8}}>{opportunite.notes}</div>}
          </div>
        )}

        {/* ÉTAPE 1 — GPS */}
        {step === 1 && (
          <SectionCard title="Localisation GPS" icon="📍" color={gps ? T.greenD : T.amberD}>
            <GpsWidget value={gps} onChange={setGps} />
          </SectionCard>
        )}

        {/* ÉTAPE 2 — PHOTOS */}
        {step === 2 && (
          <SectionCard title="Photos parcelle" icon="📷" color={photos.length>=2 ? T.greenD : T.amberD}>
            <PhotosWidget photos={photos} onChange={setPhotos} />
          </SectionCard>
        )}

        {/* ÉTAPE 3 — ESSENCES */}
        {step === 3 && (
          <SectionCard title="Essences présentes" icon="🌿" color={essences.length>0 ? T.greenD : T.amberD}>
            <div style={{marginBottom:8, fontSize:12, color:T.tx3}}>
              Identifiez les essences, leur proportion et le volume estimé pour chaque.
            </div>
            <EssenceEditor essences={essences} onChange={setEssences} />
          </SectionCard>
        )}

        {/* ÉTAPE 4 — VOLUMES & SURFACE */}
        {step === 4 && (
          <>
            <SectionCard title="Volume et surface" icon="📏" color={T.tx2}>
              <Field label="Volume estimé total (t)" required>
                <div style={{fontSize:30, fontWeight:500, textAlign:"center",
                  margin:"8px 0", color:T.green}}>{volumeEstimeT} t</div>
                <input type="range" min={10} max={3000} step={10} value={volumeEstimeT}
                  onChange={e=>setVolumeEstimeT(Number(e.target.value))}
                  style={{width:"100%", accentColor:T.green, marginBottom:6}} />
                <div style={{display:"flex", justifyContent:"space-between", fontSize:10, color:T.tx3}}>
                  <span>10 t</span><span>500 t</span><span>3 000 t</span>
                </div>
              </Field>
              <Field label="Surface estimée (ha)" required>
                <FInput value={String(surfaceEstimeeHa ?? "")}
                  onChange={v=>setSurfaceEstimeeHa(Number(v))}
                  placeholder="12.5" type="number" />
              </Field>
            </SectionCard>
            <SectionCard title="Date limite exploitation" icon="📅" color={T.tx2}>
              <Field label="Date limite">
                <FInput value={dateLimite} onChange={setDateLimite} type="date" />
              </Field>
              <Field label="Observations">
                <FTextarea value={observations} onChange={setObservations}
                  placeholder="Conditions d'accès, périodes sensibles, notes de terrain…" />
              </Field>
            </SectionCard>
          </>
        )}

        {/* ÉTAPE 5 — CONTRAINTES & ACCÈS */}
        {step === 5 && (
          <>
            <SectionCard title="Contraintes terrain" icon="⚠️" color={T.tx2}>
              {CONTRAINTE_LIST.map(([key, label, sub]) => (
                <CheckItem key={key} checked={contraintes[key]}
                  onChange={v=>setContraintes({...contraintes, [key]:v})}
                  label={label} sub={sub} />
              ))}
            </SectionCard>
            <SectionCard title="Accès camion" icon="🚛" color={T.tx2}>
              <Field label="Type d'accès" required>
                <Chips options={[["praticable","✅ Praticable"],["difficile","⚠️ Difficile"],["impossible","❌ Impossible"]]}
                  value={accesType} onChange={setAccesType} />
              </Field>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                <Field label="Largeur voie (m)">
                  <FInput value={accesLargeur} onChange={setAccesLargeur} placeholder="4.5" type="number" />
                </Field>
                <Field label="Distance plateforme (km)">
                  <FInput value={accesDistance} onChange={setAccesDistance} placeholder="12" type="number" />
                </Field>
              </div>
            </SectionCard>
          </>
        )}

        {/* ÉTAPE 6 — RÉCAPITULATIF */}
        {step === 6 && (
          <>
            <div style={{background:T.greenL, borderRadius:12, padding:"11px 12px",
              marginBottom:8, border:`1px solid ${T.green}`}}>
              <div style={{fontSize:12, fontWeight:600, color:T.greenD, marginBottom:6}}>
                ✓ Récapitulatif visite
              </div>
              <div style={{display:"flex", flexDirection:"column", gap:4, fontSize:12}}>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:T.tx2}}>GPS</span>
                  <span style={{fontWeight:600, color:T.greenD}}>
                    {gps ? `${gps.lat.toFixed(4)}°N · ${gps.lng.toFixed(4)}°E` : "⚠ Manquant"}
                  </span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:T.tx2}}>Photos</span>
                  <span style={{fontWeight:600, color:photos.length>=2?T.greenD:T.red}}>
                    {photos.length} photo{photos.length>1?"s":""} {photos.length<2?"⚠ min. 2":""}
                  </span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:T.tx2}}>Essences</span>
                  <span style={{fontWeight:600, color:essences.length>0?T.greenD:T.red}}>
                    {essences.length > 0
                      ? essences.map(e=>essenceLabel(e.essence)).join(", ")
                      : "⚠ Aucune essence"}
                  </span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:T.tx2}}>Volume estimé</span>
                  <span style={{fontWeight:600, color:volumeEstimeT?T.greenD:T.red}}>
                    {volumeEstimeT ? `${volumeEstimeT} t` : "⚠ Manquant"}
                  </span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:T.tx2}}>Surface</span>
                  <span style={{fontWeight:600, color:surfaceEstimeeHa?T.greenD:T.red}}>
                    {surfaceEstimeeHa ? `${surfaceEstimeeHa} ha` : "⚠ Manquante"}
                  </span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:T.tx2}}>Accès camion</span>
                  <span style={{fontWeight:600}}>{accesType}</span>
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <span style={{color:T.tx2}}>Contraintes</span>
                  <span style={{fontWeight:600}}>
                    {Object.values(contraintes).filter(Boolean).length} cochée(s)
                  </span>
                </div>
                {dateLimite && (
                  <div style={{display:"flex", justifyContent:"space-between"}}>
                    <span style={{color:T.tx2}}>Date limite</span>
                    <span style={{fontWeight:600}}>{fmt(dateLimite)}</span>
                  </div>
                )}
              </div>
            </div>

            {!canSubmit && (
              <div style={{background:T.amberL, borderRadius:10, padding:"10px 12px",
                fontSize:12, color:T.amberD, marginBottom:8}}>
                <div style={{fontWeight:600, marginBottom:4}}>⚠ Compléter avant de valider :</div>
                {!gps && <div>· GPS de la parcelle requis (étape 1)</div>}
                {photos.length < 2 && <div>· Minimum 2 photos (étape 2)</div>}
                {essences.length === 0 && <div>· Au moins une essence (étape 3)</div>}
                {!volumeEstimeT && <div>· Volume estimé requis (étape 4)</div>}
                {!surfaceEstimeeHa && <div>· Surface estimée requise (étape 4)</div>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky actions */}
      <div style={{position:"sticky", bottom:0, padding:"10px 12px 14px",
        background:`linear-gradient(transparent, ${T.bg} 30%)`,
        display:"flex", flexDirection:"column", gap:6}}>
        <div style={{display:"flex", gap:6}}>
          {step > 1 && (
            <SmBtn onClick={()=>setStep(s=>s-1)} style={{flex:1, justifyContent:"center"}}>
              ‹ Retour
            </SmBtn>
          )}
          {step < 6 ? (
            <BigBtn onClick={()=>setStep(s=>s+1)} bg={stepValid[step]?T.green:T.amber}
              style={{flex:step>1?2:1}}>
              {STEPS[step]} →
            </BigBtn>
          ) : (
            <BigBtn onClick={submit} bg={canSubmit?T.green:T.bg2} disabled={!canSubmit}
              style={{flex:2}}>
              ✅ Valider la visite
            </BigBtn>
          )}
        </div>
        <div style={{display:"flex", justifyContent:"center", gap:4}}>
          {STEPS.map((_,i) => (
            <div key={i} onClick={()=>setStep(i+1)} style={{
              width:6, height:6, borderRadius:"50%", cursor:"pointer",
              background:i===step-1 ? T.green : i<step-1 ? T.greenL : T.bg2,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── FICHE VISITE (lecture) ─────────────────────────────────────────────────────
const FicheVisite = ({visite, opportunite, contact, lot, onBack, onCreateLot}) => {
  const vs = visiteStatutBadge(visite.statut);
  const nb_contraintes = Object.values(visite.contraintes).filter(Boolean).length;

  return (
    <div style={{display:"flex", flexDirection:"column", flex:1}}>
      <div style={{background:T.green, color:"#fff", padding:"12px 14px 10px"}}>
        <button onClick={onBack} style={{background:"none", border:"none",
          color:"rgba(255,255,255,.8)", fontSize:16, padding:"2px 8px 2px 0", cursor:"pointer"}}>
          ‹ Retour
        </button>
        <div style={{fontSize:16, fontWeight:500}}>Visite validée</div>
        <div style={{display:"flex", gap:8, marginTop:4}}>
          <Badge bg="rgba(255,255,255,.25)" color="#fff">{opportunite.commune}</Badge>
          <Badge bg="rgba(255,255,255,.25)" color="#fff">
            {fmt(visite.dateVisite)}
          </Badge>
        </div>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"12px 12px",
        display:"flex", flexDirection:"column", gap:8}}>

        <SectionCard title="Métriques clés" icon="📊" color={T.greenD}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            {[
              ["Volume estimé", `${visite.volumeEstimeT} t`, T.green],
              ["Surface", `${visite.surfaceEstimeeHa} ha`, T.blue],
              ["Essences", `${visite.essences.length}`, T.purple],
              ["Contraintes", `${nb_contraintes}`, nb_contraintes>0?T.amber:T.tx3],
            ].map(([l,v,c]) => (
              <div key={l} style={{background:T.bg2, borderRadius:8, padding:"9px 10px"}}>
                <div style={{fontSize:10, color:T.tx3}}>{l}</div>
                <div style={{fontSize:18, fontWeight:600, color:c}}>{v}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {visite.gps && (
          <SectionCard title="Localisation GPS" icon="📍" color={T.greenD}>
            <div style={{fontFamily:"monospace", fontSize:13, fontWeight:600, color:T.greenD,
              background:T.greenL, padding:"9px 12px", borderRadius:9}}>
              {visite.gps.lat.toFixed(6)}°N · {visite.gps.lng.toFixed(6)}°E
            </div>
            <div style={{fontSize:11, color:T.tx3, marginTop:5}}>
              Source : {visite.gps.source === "auto" ? "GPS automatique" : "Saisie manuelle"}
            </div>
          </SectionCard>
        )}

        {visite.photos.length > 0 && (
          <SectionCard title={`Photos (${visite.photos.length})`} icon="📷" color={T.tx2}>
            <div style={{display:"flex", flexWrap:"wrap", gap:7}}>
              {visite.photos.map(p => (
                <div key={p.id} style={{width:56, height:56, borderRadius:8, background:T.greenL,
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", fontSize:18, border:`1px solid ${T.bd}`}}>
                  {p.label.split(" ")[0]}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {visite.essences.length > 0 && (
          <SectionCard title="Essences identifiées" icon="🌿" color={T.tx2}>
            {visite.essences.map((e,i) => (
              <div key={i} style={{display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"5px 0",
                borderBottom:i<visite.essences.length-1?`0.5px solid ${T.bd}`:"none"}}>
                <span style={{fontSize:13, fontWeight:500}}>{essenceLabel(e.essence)}</span>
                <div style={{display:"flex", gap:6}}>
                  <Badge bg={T.bg2} color={T.tx2}>{e.pct} %</Badge>
                  <Badge bg={T.greenL} color={T.greenD}>{e.volumeT} t</Badge>
                  <Badge bg={T.purpleL} color={T.purpleD}>{e.granulometrie.toUpperCase()}</Badge>
                </div>
              </div>
            ))}
          </SectionCard>
        )}

        {nb_contraintes > 0 && (
          <SectionCard title="Contraintes identifiées" icon="⚠️" color={T.amberD}>
            {Object.entries(visite.contraintes)
              .filter(([,v])=>v)
              .map(([k]) => {
                const label = {
                  ligneEDF:"Ligne EDF", lignesTelecom:"Ligne télécom", penteFort:"Pente forte",
                  zoneHumide:"Zone humide", voisinage:"Voisinage sensible", accesDifficile:"Accès difficile",
                  routeLimitee:"Route limitée tonnage", naturaZone:"Natura 2000",remanents:"Rémanents",
                }[k];
                return (
                  <div key={k} style={{display:"flex", alignItems:"center", gap:8,
                    padding:"5px 0", borderBottom:`0.5px solid ${T.bd}`, fontSize:12}}>
                    <span style={{color:T.amber}}>⚠</span> {label}
                  </div>
                );
              })}
          </SectionCard>
        )}

        {visite.observations && (
          <SectionCard title="Observations" icon="📝" color={T.tx2}>
            <p style={{fontSize:13, color:T.tx, lineHeight:1.6, margin:0}}>{visite.observations}</p>
          </SectionCard>
        )}

        {/* Action : créer le lot */}
        {!lot && visite.statut === "validee" && (
          <BigBtn onClick={onCreateLot} bg={T.green}>
            🌲 Créer le lot / chantier →
          </BigBtn>
        )}
        {lot && (
          <div style={{background:T.greenL, borderRadius:12, padding:"11px 12px",
            border:`1.5px solid ${T.green}`}}>
            <div style={{fontSize:12, fontWeight:600, color:T.greenD, marginBottom:4}}>
              ✅ Lot créé depuis cette visite
            </div>
            <div style={{fontFamily:"monospace", fontSize:14, fontWeight:600, color:T.greenD}}>
              {lot.numeroLot}
            </div>
            <div style={{fontSize:11, color:T.greenD, marginTop:2}}>
              {lot.commune} · Statut : {lot.statut}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── LISTE VISITES ──────────────────────────────────────────────────────────────
const ListeVisites = ({visites, opportunites, contacts, onNav}) => (
  <div style={{display:"flex", flexDirection:"column", flex:1}}>
    <div style={{padding:"12px 14px 10px", background:"#fff", borderBottom:`1px solid ${T.bd}`}}>
      <div style={{fontSize:16, fontWeight:500}}>Visites terrain</div>
      <div style={{fontSize:11, color:T.tx3}}>{visites.length} visite{visites.length>1?"s":""}</div>
    </div>
    <div style={{flex:1, overflowY:"auto", padding:"10px 12px", display:"flex", flexDirection:"column", gap:7}}>
      {visites.length === 0 && (
        <div style={{textAlign:"center", color:T.tx3, fontSize:12, padding:"24px 0"}}>
          Aucune visite réalisée.<br/>Ouvrez une opportunité pour démarrer une visite.
        </div>
      )}
      {visites.map(v => {
        const opp = opportunites.find(o=>o.id===v.opportuniteId);
        const contact = contacts.find(c=>c.id===v.contactId);
        const vs = visiteStatutBadge(v.statut);
        return (
          <div key={v.id} onClick={()=>onNav("fiche-visite",{visite:v, opportunite:opp, contact})}
            style={{background:"#fff", borderRadius:12, padding:"11px 12px",
              border:`1px solid ${T.bd}`, cursor:"pointer",
              borderLeft:`3px solid ${v.statut==="validee"?T.green:T.amber}`}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}>
              <span style={{fontSize:13, fontWeight:500}}>{opp?.commune ?? "—"}</span>
              <Badge bg={vs.bg} color={vs.color}>{vs.label}</Badge>
            </div>
            <div style={{fontSize:11, color:T.tx3}}>
              {contact ? (contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom) : "—"}
              {" · "}{fmt(v.dateVisite)} · {v.essences.length} essence(s)
            </div>
            <div style={{fontSize:11, color:T.green, marginTop:2}}>
              {v.volumeEstimeT} t · {v.surfaceEstimeeHa} ha
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── ÉCRAN OPPORTUNITÉ (avec lien visite) ──────────────────────────────────────
const FicheOpportunite = ({opportunite, contact, visite, lot, onBack, onNav, onUpdateOpp}) => {
  const ob = oppStatutBadge(opportunite.statut);
  const statuts = [
    ["nouvelle","Nouvelle"],["a_visiter","À visiter"],
    ["visite_programmee","Visite prog."],["visite_faite","Visite faite"],
    ["lot_cree","Lot créé"],["perdue","Perdue"],
  ];

  return (
    <div style={{display:"flex", flexDirection:"column", flex:1}}>
      <div style={{background:T.purple, color:"#fff", padding:"12px 14px 10px"}}>
        <button onClick={onBack} style={{background:"none", border:"none",
          color:"rgba(255,255,255,.8)", fontSize:16, padding:"2px 8px 2px 0", cursor:"pointer"}}>
          ‹ Retour
        </button>
        <div style={{fontSize:16, fontWeight:500}}>{opportunite.commune ?? "Opportunité"}</div>
        <div style={{display:"flex", gap:8, marginTop:4, flexWrap:"wrap"}}>
          <Badge bg="rgba(255,255,255,.25)" color="#fff">{ob.label}</Badge>
          {opportunite.volumeEstime && <Badge bg="rgba(255,255,255,.25)" color="#fff">~{opportunite.volumeEstime} t</Badge>}
        </div>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"12px 12px", display:"flex", flexDirection:"column", gap:8}}>
        <SectionCard title="Contact source" icon="👤" color={T.tx2}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <div style={{fontSize:13, fontWeight:500}}>
                {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
              </div>
              <div style={{fontSize:11, color:T.tx3}}>{typeLabel(contact.typeContact)} · {contact.telephone}</div>
            </div>
            <SmBtn onClick={()=>onNav("fiche-contact",contact)} bg={T.bg2}>Voir</SmBtn>
          </div>
        </SectionCard>

        <SectionCard title="Détails" icon="📋" color={T.tx2}>
          <div style={{display:"flex", flexDirection:"column", gap:0}}>
            {opportunite.commune && (
              <div style={{display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${T.bd}`, fontSize:12}}>
                <span style={{color:T.tx2}}>Commune</span><span style={{fontWeight:600}}>{opportunite.commune}</span>
              </div>
            )}
            {opportunite.volumeEstime && (
              <div style={{display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${T.bd}`, fontSize:12}}>
                <span style={{color:T.tx2}}>Volume estimé</span>
                <span style={{fontWeight:600, color:T.green}}>~{opportunite.volumeEstime} t</span>
              </div>
            )}
            {opportunite.typeBois && (
              <div style={{display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:12}}>
                <span style={{color:T.tx2}}>Type de bois</span>
                <span style={{fontWeight:600}}>{opportunite.typeBois.replace(/_/g," ")}</span>
              </div>
            )}
          </div>
        </SectionCard>

        {opportunite.notes && (
          <div style={{background:T.bg2, borderRadius:10, padding:"10px 12px"}}>
            <div style={{fontSize:10, fontWeight:700, color:T.tx3, textTransform:"uppercase",
              letterSpacing:".05em", marginBottom:4}}>Notes</div>
            <div style={{fontSize:12, color:T.tx, lineHeight:1.5}}>{opportunite.notes}</div>
          </div>
        )}

        {/* Visite liée */}
        {visite && (
          <div onClick={()=>onNav("fiche-visite",{visite,opportunite,contact,lot})}
            style={{background:"#fff", borderRadius:12, padding:"11px 12px",
              border:`1.5px solid ${T.green}`, cursor:"pointer"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <div style={{fontSize:12, fontWeight:600, color:T.greenD}}>✓ Visite réalisée</div>
                <div style={{fontSize:11, color:T.tx3}}>
                  {fmt(visite.dateVisite)} · {visite.volumeEstimeT} t · {visite.surfaceEstimeeHa} ha
                </div>
              </div>
              <span style={{fontSize:20}}>→</span>
            </div>
          </div>
        )}

        {/* Lot créé */}
        {lot && (
          <div style={{background:T.greenL, borderRadius:12, padding:"11px 12px",
            border:`1.5px solid ${T.green}`}}>
            <div style={{fontSize:12, fontWeight:600, color:T.greenD}}>🌲 Lot créé</div>
            <div style={{fontFamily:"monospace", fontSize:14, fontWeight:600, color:T.greenD}}>
              {lot.numeroLot}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{display:"flex", flexDirection:"column", gap:7}}>
          {!visite && (
            <BigBtn onClick={()=>onNav("visite-form",{opportunite,contact})} bg={T.amber}>
              🔭 Démarrer la visite terrain →
            </BigBtn>
          )}
          {visite && !lot && visite.statut === "validee" && (
            <BigBtn onClick={()=>onNav("fiche-visite",{visite,opportunite,contact})} bg={T.green}>
              🌲 Créer le lot depuis la visite →
            </BigBtn>
          )}

          <SectionCard title="Changer le statut" icon="🔄" color={T.tx2}>
            <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
              {statuts.map(([val,label]) => {
                const b = oppStatutBadge(val);
                return (
                  <button key={val} onClick={()=>onUpdateOpp({...opportunite, statut:val})}
                    style={{padding:"6px 10px", borderRadius:8, fontSize:11, fontWeight:500,
                      cursor:"pointer", border:"none", fontFamily:"inherit",
                      background:opportunite.statut===val?b.bg:T.bg2,
                      color:opportunite.statut===val?b.color:T.tx3,
                      boxShadow:opportunite.statut===val?`0 0 0 1.5px ${b.color}`:"none"}}>
                    {label}
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

// ── BOTTOM NAV ─────────────────────────────────────────────────────────────────
const BottomNav = ({active, onNav}) => {
  const items = [
    ["accueil","🏠","Accueil"],
    ["contacts","📋","Contacts"],
    ["visites","🔭","Visites"],
    ["reseau","🤝","Réseau"],
    ["alertes","🔔","Alertes"],
  ];
  return (
    <div style={{height:52, background:"#111", display:"flex", alignItems:"center",
      justifyContent:"space-around", flexShrink:0}}>
      {items.map(([id,icon,label]) => (
        <button key={id} onClick={()=>onNav(id)} style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:2,
          cursor:"pointer", padding:"4px 8px", borderRadius:6,
          background:"none", border:"none", fontFamily:"inherit",
        }}>
          <span style={{fontSize:18, opacity:active===id?1:0.4}}>{icon}</span>
          <span style={{fontSize:9, fontWeight:500, color:active===id?T.green:"#666"}}>{label}</span>
        </button>
      ))}
    </div>
  );
};

// ── APP ────────────────────────────────────────────────────────────────────────
export default function App() {
  // Store
  const [contacts, setContacts] = useState(INIT_CONTACTS);
  const [opportunites, setOpportunites] = useState(INIT_OPPS);
  const [visites, setVisites] = useState(INIT_VISITES);
  const [lots, setLots] = useState(INIT_LOTS);
  const [historique, setHistorique] = useState(INIT_HISTORIQUE);

  // Nav stack: [{screen, ...params}]
  const [stack, setStack] = useState([{screen:"accueil"}]);
  const cur = stack[stack.length-1];

  const push = useCallback((screen, params={}) => setStack(s=>[...s,{screen,...params}]), []);
  const pop = useCallback(() => setStack(s=>s.length>1?s.slice(0,-1):s), []);
  const navRoot = useCallback((screen) => setStack([{screen}]), []);

  /** @param {HistoriqueEvent} e */
  const addEvent = useCallback((e) => setHistorique(h=>[...h,{...e,id:uid(),createdAt:now()}]), []);

  const updateOpp = useCallback((opp) => {
    setOpportunites(prev => prev.map(o=>o.id===opp.id?opp:o));
    addEvent({refId:opp.id, refType:"opportunite", action:"statut_change",
      message:`Statut opportunité → ${oppStatutBadge(opp.statut).label}`,
      utilisateur:"J. Moreau"});
  }, [addEvent]);

  const saveVisite = useCallback((v) => {
    setVisites(prev => {
      const exists = prev.some(x=>x.id===v.id);
      return exists ? prev.map(x=>x.id===v.id?v:x) : [...prev,v];
    });
    // Mettre à jour statut opportunité → visite_faite
    setOpportunites(prev=>prev.map(o=>o.id===v.opportuniteId
      ? {...o, statut:"visite_faite", visiteId:v.id} : o));
    addEvent({refId:v.id, refType:"visite", action:"visite_validee",
      message:`Visite validée — ${v.volumeEstimeT} t · ${v.surfaceEstimeeHa} ha`,
      utilisateur:v.agentNom});
    pop();
    push("fiche-visite", {visite:v,
      opportunite: cur.opportunite || opportunites.find(o=>o.id===v.opportuniteId),
      contact: cur.contact || contacts.find(c=>c.id===v.contactId)});
  }, [opportunites, contacts, addEvent, pop, push, cur]);

  const createLot = useCallback((visite, opportunite, contact) => {
    const num = nextLotNum();
    /** @type {Lot} */
    const lot = {
      id:"l"+uid(), numeroLot:num,
      statut:"VISITE_REALISEE",
      commune: opportunite.commune ?? contact.nom,
      essencePrincipale: visite.essences[0]?.essence,
      volumeEstime: visite.volumeEstimeT,
      surfaceHa: visite.surfaceEstimeeHa,
      gps: visite.gps,
      contactId: contact.id,
      opportuniteId: opportunite.id,
      visiteId: visite.id,
      createdAt: now(),
    };
    setLots(prev=>[...prev,lot]);
    setOpportunites(prev=>prev.map(o=>o.id===opportunite.id
      ? {...o, statut:"lot_cree", lotId:num} : o));
    addEvent({refId:lot.id, refType:"lot", action:"lot_cree",
      message:`Lot ${num} créé depuis visite — ${lot.commune} · ${lot.volumeEstime} t`,
      utilisateur:"J. Moreau"});
    // Mise à jour de l'écran courant
    setStack(s => s.map(frame =>
      frame.screen==="fiche-visite" ? {...frame, lot} :
      frame.screen==="fiche-opportunite" ? {...frame, lot, opportunite:{...opportunite,statut:"lot_cree",lotId:num}} :
      frame
    ));
  }, [addEvent]);

  // Accueil simplifié
  const Accueil = () => {
    const urgents = opportunites.filter(o=>o.statut==="a_visiter").length;
    return (
      <div style={{display:"flex", flexDirection:"column", flex:1}}>
        <div style={{padding:"14px 14px 10px", background:"#fff", borderBottom:`1px solid ${T.bd}`}}>
          <div style={{fontSize:16, fontWeight:500}}>Bonjour, J. Moreau</div>
          <div style={{fontSize:11, color:T.tx3}}>Sprint 1 — Visite terrain</div>
        </div>
        <div style={{flex:1, overflowY:"auto", padding:"12px", display:"flex",
          flexDirection:"column", gap:8}}>
          <BigBtn onClick={()=>push("liste-opportunites")} bg={T.amber}>
            🔭 Démarrer une visite ({urgents} à visiter)
          </BigBtn>
          <BigBtn onClick={()=>navRoot("visites")} bg={T.purpleL} color={T.purpleD}>
            📋 Mes visites ({visites.length})
          </BigBtn>
          {/* Historique global */}
          <SectionCard title="Activité récente" icon="🕐" color={T.tx2}>
            <HistoriqueView events={historique.slice(-5)} />
          </SectionCard>
        </div>
      </div>
    );
  };

  const ListeOpportunites = () => (
    <div style={{display:"flex", flexDirection:"column", flex:1}}>
      <div style={{padding:"10px 12px 8px", background:"#fff", borderBottom:`1px solid ${T.bd}`,
        display:"flex", alignItems:"center", gap:8}}>
        <button onClick={pop} style={{background:"none", border:"none",
          cursor:"pointer", fontSize:18, color:T.tx2, padding:"4px 8px 4px 0"}}>‹</button>
        <div style={{fontSize:14, fontWeight:500}}>Choisir une opportunité</div>
      </div>
      <div style={{flex:1, overflowY:"auto", padding:"10px 12px", display:"flex",
        flexDirection:"column", gap:7}}>
        {opportunites.map(o => {
          const c = contacts.find(x=>x.id===o.contactId);
          const ob = oppStatutBadge(o.statut);
          const v = visites.find(v=>v.opportuniteId===o.id);
          return (
            <div key={o.id}
              onClick={()=>push("fiche-opportunite",{opportunite:o, contact:c,
                visite:v||null, lot:lots.find(l=>l.opportuniteId===o.id)||null})}
              style={{background:"#fff", borderRadius:12, padding:"11px 12px",
                border:`1px solid ${T.bd}`, cursor:"pointer",
                borderLeft:`3px solid ${o.statut==="a_visiter"?T.amber:o.statut==="lot_cree"?T.green:T.bd}`}}>
              <div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}>
                <span style={{fontSize:13, fontWeight:500}}>{o.commune ?? "—"}</span>
                <Badge bg={ob.bg} color={ob.color}>{ob.label}</Badge>
              </div>
              <div style={{fontSize:11, color:T.tx3}}>
                {c ? (c.prenom ? `${c.prenom} ${c.nom}` : c.nom) : "—"}
                {o.volumeEstime ? ` · ~${o.volumeEstime} t` : ""}
              </div>
              {v && <div style={{fontSize:10, color:T.greenD, marginTop:3}}>✓ Visite réalisée</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const activeNav = ["accueil","contacts","visites","reseau","alertes"].includes(cur.screen)
    ? cur.screen : null;

  const renderScreen = () => {
    if (cur.screen==="accueil") return <Accueil />;
    if (cur.screen==="visites") return (
      <ListeVisites visites={visites} opportunites={opportunites}
        contacts={contacts}
        onNav={(s,p)=>{
          if (s==="fiche-visite") push("fiche-visite",{...p,
            lot:lots.find(l=>l.opportuniteId===p.opportunite?.id)||null});
        }} />
    );
    if (cur.screen==="liste-opportunites") return <ListeOpportunites />;
    if (cur.screen==="fiche-opportunite") return (
      <FicheOpportunite opportunite={cur.opportunite} contact={cur.contact}
        visite={cur.visite} lot={cur.lot}
        onBack={pop}
        onNav={(s,p) => {
          if (s==="visite-form") push("visite-form",{opportunite:cur.opportunite,contact:cur.contact});
          else if (s==="fiche-visite") push("fiche-visite",{
            visite:cur.visite, opportunite:cur.opportunite, contact:cur.contact, lot:cur.lot});
          else if (s==="fiche-contact") push("contacts");
        }}
        onUpdateOpp={updateOpp} />
    );
    if (cur.screen==="visite-form") return (
      <VisiteForm opportunite={cur.opportunite} contact={cur.contact}
        visite={visites.find(v=>v.opportuniteId===cur.opportunite?.id)||null}
        onSave={saveVisite} onBack={pop} />
    );
    if (cur.screen==="fiche-visite") return (
      <FicheVisite visite={cur.visite} opportunite={cur.opportunite}
        contact={cur.contact} lot={cur.lot}
        onBack={pop}
        onCreateLot={()=>createLot(cur.visite, cur.opportunite, cur.contact)} />
    );
    // Stubs
    return (
      <div style={{display:"flex", flexDirection:"column", flex:1}}>
        <div style={{padding:"12px 14px", background:"#fff", borderBottom:`1px solid ${T.bd}`,
          display:"flex", gap:10, alignItems:"center"}}>
          <button onClick={pop} style={{background:"none",border:"none",cursor:"pointer",
            fontSize:18,color:T.tx2, padding:"4px 8px 4px 0"}}>‹</button>
          <div style={{fontSize:14, fontWeight:500}}>{cur.screen}</div>
        </div>
        <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          flexDirection:"column", gap:10, padding:24}}>
          <div style={{fontSize:40}}>🚧</div>
          <div style={{fontSize:14, fontWeight:500}}>Sprint suivant</div>
          <div style={{fontSize:12, color:T.tx3, textAlign:"center"}}>
            Module en développement — Sprints 1–5
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{display:"flex", justifyContent:"center", alignItems:"flex-start",
      minHeight:"100vh", background:T.bg, padding:"16px 8px", gap:20}}>
      {/* Phone */}
      <div style={{width:320, background:"#111", borderRadius:36, overflow:"hidden",
        border:"6px solid #1A1A1A", boxShadow:"0 16px 48px rgba(0,0,0,.35)",
        display:"flex", flexDirection:"column", alignSelf:"flex-start"}}>
        <div style={{height:20, background:"#111", display:"flex", alignItems:"center",
          justifyContent:"center"}}>
          <div style={{width:56, height:7, background:"#000", borderRadius:4}} />
        </div>
        <div style={{background:T.bg, minHeight:580, display:"flex", flexDirection:"column",
          maxHeight:640, overflow:"hidden"}}>
          {renderScreen()}
        </div>
        <BottomNav active={activeNav ?? cur.screen} onNav={navRoot} />
      </div>

      {/* Info panel */}
      <div style={{maxWidth:280, display:"flex", flexDirection:"column", gap:8,
        paddingTop:4, alignSelf:"flex-start"}}>
        <div style={{background:"#fff", borderRadius:12, padding:"13px 14px",
          border:`1px solid ${T.bd}`}}>
          <div style={{fontSize:13, fontWeight:600, color:T.amber, marginBottom:6}}>
            Sprint 1 — Visite terrain réelle
          </div>
          <div style={{fontSize:12, color:T.tx2, lineHeight:1.7}}>
            <span style={{color:T.purple,fontWeight:500}}>Opportunité</span>{" → "}
            <span style={{color:T.amber,fontWeight:500}}>Visite 6 étapes</span>{" → "}
            <span style={{color:T.green,fontWeight:500}}>Lot créé</span>
          </div>
        </div>
        <div style={{background:"#fff", borderRadius:12, padding:"12px 14px",
          border:`1px solid ${T.bd}`}}>
          <div style={{fontSize:11, fontWeight:600, color:T.tx2, marginBottom:7}}>
            Formulaire — 6 étapes
          </div>
          {["GPS automatique + saisie manuelle",
            "Photos (min. 2 obligatoires)",
            "Essences · % · volume · granulo",
            "Volume estimé · surface · date limite",
            "Contraintes terrain + accès camion",
            "Récapitulatif · validation bloquante"].map((s,i) => (
            <div key={i} style={{display:"flex", gap:7, padding:"3px 0",
              borderBottom:`0.5px solid ${T.bd}`, fontSize:11}}>
              <span style={{color:T.green, fontWeight:600, minWidth:14}}>{i+1}</span>
              <span style={{color:T.tx2}}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{background:"#fff", borderRadius:12, padding:"12px 14px",
          border:`1px solid ${T.bd}`}}>
          <div style={{fontSize:11, fontWeight:600, color:T.tx2, marginBottom:6}}>
            Automatismes
          </div>
          {["Opportunité → visite_faite à la validation",
            "Lot créé avec numéro LOT-2025-0XX",
            "Opportunité → lot_cree à la création",
            "Historique événements en temps réel",
            "Validations bloquantes par étape"].map((s,i) => (
            <div key={i} style={{fontSize:11, color:T.tx2, padding:"2px 0",
              borderBottom:`0.5px solid ${T.bd}`, display:"flex", gap:5, alignItems:"flex-start"}}>
              <span style={{color:T.green, marginTop:1}}>✓</span>{s}
            </div>
          ))}
        </div>
        <div style={{background:T.greenL, borderRadius:12, padding:"10px 13px"}}>
          <div style={{fontSize:11, color:T.greenD, lineHeight:1.6}}>
            <strong>Données persistantes</strong> dans l'état React.
            Contacts, opportunités, visites, lots et historique
            survivent à la navigation dans la session.
          </div>
        </div>
      </div>
    </div>
  );
}
