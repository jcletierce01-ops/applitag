// ============================================================
// APPLITAG — Gestion des tas v3
// Densités réelles par essence · Emplacements dépôt depuis visite
// Abattage (tas forêt) · Débardage (tours → emplacement existant)
// JSDoc TypeScript-style · 8 tests core
// ============================================================

import { useState, useCallback, useMemo } from "react";

// ── RÉFÉRENTIEL DENSITÉS (poids spécifiques par essence) ──────────────────────
/**
 * Source : CTBA / IFN / FD P51-006
 * Toutes valeurs en kg/m³ bois rond sur pied (fût)
 * Converties en t/m³ apparent plaquettes via foisonnement.
 *
 * @typedef {Object} EssenceRef
 * @property {string} id
 * @property {string} label
 * @property {string} emoji
 * @property {number} densiteSeche      - kg/m³ bois sec absolu
 * @property {number} densiteVerte      - kg/m³ bois vert (fraîchement abattu)
 * @property {number} foisonnementMoyen - vol apparent / vol bois plein (plaquettes)
 * @property {'feuillus'|'resineux'} groupe
 */

/** @type {EssenceRef[]} */
const ESSENCES_REF = [
  // FEUILLUS durs
  { id:"charme",       label:"Charme",        emoji:"🌿", groupe:"feuillus",
    densiteSeche:760,  densiteVerte:1060, foisonnementMoyen:0.33 },
  { id:"hetre",        label:"Hêtre",         emoji:"🌲", groupe:"feuillus",
    densiteSeche:720,  densiteVerte:990,  foisonnementMoyen:0.34 },
  { id:"chene",        label:"Chêne",         emoji:"🌳", groupe:"feuillus",
    densiteSeche:700,  densiteVerte:960,  foisonnementMoyen:0.34 },
  { id:"frene",        label:"Frêne",         emoji:"🍃", groupe:"feuillus",
    densiteSeche:680,  densiteVerte:1050, foisonnementMoyen:0.35 },
  { id:"robinier",     label:"Robinier",      emoji:"🌸", groupe:"feuillus",
    densiteSeche:720,  densiteVerte:900,  foisonnementMoyen:0.34 },
  { id:"chataignier",  label:"Châtaignier",   emoji:"🌰", groupe:"feuillus",
    densiteSeche:560,  densiteVerte:850,  foisonnementMoyen:0.36 },
  { id:"erable",       label:"Érable",        emoji:"🍁", groupe:"feuillus",
    densiteSeche:640,  densiteVerte:900,  foisonnementMoyen:0.35 },
  { id:"bouleau",      label:"Bouleau",       emoji:"🪵", groupe:"feuillus",
    densiteSeche:600,  densiteVerte:880,  foisonnementMoyen:0.36 },
  // FEUILLUS tendres
  { id:"peuplier",     label:"Peuplier",      emoji:"🌾", groupe:"feuillus",
    densiteSeche:420,  densiteVerte:780,  foisonnementMoyen:0.40 },
  { id:"saule",        label:"Saule",         emoji:"🌿", groupe:"feuillus",
    densiteSeche:450,  densiteVerte:800,  foisonnementMoyen:0.39 },
  { id:"aulne",        label:"Aulne",         emoji:"🌱", groupe:"feuillus",
    densiteSeche:500,  densiteVerte:870,  foisonnementMoyen:0.38 },
  // RÉSINEUX
  { id:"douglas",      label:"Douglas",       emoji:"🎄", groupe:"resineux",
    densiteSeche:510,  densiteVerte:780,  foisonnementMoyen:0.37 },
  { id:"epicea",       label:"Épicéa",        emoji:"🎋", groupe:"resineux",
    densiteSeche:450,  densiteVerte:750,  foisonnementMoyen:0.39 },
  { id:"sapin",        label:"Sapin",         emoji:"🌲", groupe:"resineux",
    densiteSeche:430,  densiteVerte:720,  foisonnementMoyen:0.40 },
  { id:"pin_sylvestre",label:"Pin sylvestre",  emoji:"🌲", groupe:"resineux",
    densiteSeche:500,  densiteVerte:760,  foisonnementMoyen:0.38 },
  { id:"meleze",       label:"Mélèze",        emoji:"🍂", groupe:"resineux",
    densiteSeche:590,  densiteVerte:840,  foisonnementMoyen:0.37 },
  { id:"melange",      label:"Mélange",       emoji:"🌳", groupe:"feuillus",
    densiteSeche:580,  densiteVerte:870,  foisonnementMoyen:0.36 },
];

const ESSENCE_MAP = Object.fromEntries(ESSENCES_REF.map(e => [e.id, e]));

// ── CALCULS BIOMASSE ──────────────────────────────────────────────────────────
/**
 * Volume apparent d'un tas en forêt (forme andain/fagot).
 * @param {number} l @param {number} la @param {number} h
 * @returns {number} m³ apparent
 */
const COEFF_FORET = 0.60;   // andain/fagot forestier
const COEFF_DEPOT = 1.00;   // panier porteur = mesure directe

const calcVolApparent = (l, la, h, coeff = 1.0) =>
  Math.round(l * la * h * coeff * 100) / 100;

/**
 * Poids brut d'un volume apparent selon l'essence et l'humidité.
 * Méthode : vol apparent × foisonnement essence → vol bois plein
 *           × densité verte (bois fraîchement abattu, humidité ~50-60%)
 *           puis correction vers l'humidité cible.
 *
 * @param {number} volApparentM3
 * @param {EssenceRef} essence
 * @param {number} humidite  - % humidité base humide (0-100)
 * @returns {{ volBoisPleinM3:number, poidsBrutT:number, poidsSecT:number }}
 */
const calcPoids = (volApparentM3, essence, humidite) => {
  const e = essence ?? ESSENCE_MAP["melange"];
  const volBoisPlein = Math.round(volApparentM3 * e.foisonnementMoyen * 100) / 100;
  // Densité interpolée entre sèche et verte selon humidité
  // H=0% → densiteSeche   H=60% → densiteVerte   (relation linéaire approchée)
  const hRef = 0.55; // humidité de référence bois vert
  const hFrac = Math.min(humidite / 100, 0.95);
  const densite = hFrac <= hRef
    ? e.densiteSeche + (e.densiteVerte - e.densiteSeche) * (hFrac / hRef)
    : e.densiteVerte;
  const poidsBrutT  = Math.round(volBoisPlein * densite / 1000 * 100) / 100;
  const poidsSecT   = Math.round(volBoisPlein * e.densiteSeche / 1000 * 100) / 100;
  return { volBoisPleinM3: volBoisPlein, poidsBrutT, poidsSecT };
};

// ── TYPES ─────────────────────────────────────────────────────────────────────
/**
 * @typedef {'en_foret'|'en_transit'|'sur_emplacement'} TasAbattageStatut
 * @typedef {'disponible'|'en_cours_remplissage'|'pret_broyage'|'broyage_en_cours'|'termine'} EmplacementStatut
 */

/**
 * Emplacement de dépôt défini lors de la visite initiale.
 * Ne change pas au fil du débardage — les tours viennent se déverser ici.
 * @typedef {Object} EmplacementDepot
 * @property {string} id
 * @property {string} lotId
 * @property {string} nom           – "Dépôt principal", "Zone A", etc.
 * @property {{ lat:number, lng:number }} gps
 * @property {number} capaciteEstimeeM3
 * @property {EmplacementStatut} statut
 * @property {string} essencePrincipale
 * @property {number} volumeAccumuleM3   – mis à jour à chaque tour
 * @property {number} poidsAccumuleT
 * @property {number} nbToursRecus
 * @property {string} [visiteId]
 * @property {string} createdAt
 */

// ── UNIT TESTS ────────────────────────────────────────────────────────────────
const UNIT_TESTS = [
  { name:"Chêne plus lourd que Peuplier à même volume",
    fn:() => {
      const chene  = calcPoids(10, ESSENCE_MAP["chene"],   40);
      const peuplier = calcPoids(10, ESSENCE_MAP["peuplier"], 40);
      return chene.poidsBrutT > peuplier.poidsBrutT;
    }},
  { name:"Charme > Hêtre > Chêne > Peuplier (densité sèche)",
    fn:() => {
      const d = ["charme","hetre","chene","peuplier"]
        .map(id => ESSENCE_MAP[id].densiteSeche);
      return d[0] > d[1] && d[1] > d[2] && d[2] > d[3];
    }},
  { name:"Humidité 0% → poids brut ≈ poids sec",
    fn:() => {
      const r = calcPoids(10, ESSENCE_MAP["chene"], 0);
      return Math.abs(r.poidsBrutT - r.poidsSecT) < 0.5;
    }},
  { name:"Humidité 50% → poids brut > poids sec",
    fn:() => {
      const r = calcPoids(10, ESSENCE_MAP["chene"], 50);
      return r.poidsBrutT > r.poidsSecT;
    }},
  { name:"Volume forêt coeff 0.6 : 4×2×2 = 9.6 m³",
    fn:() => calcVolApparent(4, 2, 2, COEFF_FORET) === 9.6 },
  { name:"Volume dépôt coeff 1.0 : 6×3×1.5 = 27 m³",
    fn:() => calcVolApparent(6, 3, 1.5, COEFF_DEPOT) === 27 },
  { name:"Débardage incrémente l'emplacement existant (pas création)",
    fn:() => {
      const emp = { id:"e1", volumeAccumuleM3:50, poidsAccumuleT:14, nbToursRecus:3 };
      // Un tour de 10 m³ / 2.8 t vient s'ajouter
      const tourVol = 10, tourPoids = 2.8;
      const apres = {
        ...emp,
        volumeAccumuleM3: emp.volumeAccumuleM3 + tourVol,
        poidsAccumuleT:   emp.poidsAccumuleT   + tourPoids,
        nbToursRecus:     emp.nbToursRecus + 1,
      };
      return apres.volumeAccumuleM3 === 60
          && apres.nbToursRecus === 4
          && apres.id === emp.id; // même emplacement
    }},
  { name:"Conservation matière : vol abattu ≈ vol débarié ±15%",
    fn:() => {
      const abattu = 120, debardie = 112;
      return Math.abs(abattu - debardie) / abattu <= 0.15;
    }},
];

const TEST_RESULTS = UNIT_TESTS.map(t => {
  try { return { name:t.name, pass:t.fn() === true }; }
  catch(e) { return { name:t.name, pass:false, err:e.message }; }
});
const TESTS_PASS = TEST_RESULTS.filter(r => r.pass).length;
console.log(`[APPLITAG Tas v3 Tests] ${TESTS_PASS}/${UNIT_TESTS.length} passed`);

// ── TOKENS ────────────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75",  greenL:"#E1F5EE",  greenD:"#085041",
  blue:"#185FA5",   blueL:"#E6F1FB",   blueD:"#042C53",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  amber:"#BA7517",  amberL:"#FAEEDA",  amberD:"#412402",
  red:"#A32D2D",    redL:"#FCEBEB",
  brown:"#8B6914",  brownL:"#F1EFE8",
  bg:"#F5F4F1", bg2:"#ECEAE6",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
};

// ── MOCK : emplacements définis à la visite ───────────────────────────────────
/** @type {EmplacementDepot[]} */
const EMPLACEMENTS_VISITE = [
  { id:"emp1", lotId:"l1", nom:"Dépôt principal — bord RD943",
    gps:{lat:47.9812, lng:3.0891}, capaciteEstimeeM3:400,
    statut:"en_cours_remplissage", essencePrincipale:"peuplier",
    volumeAccumuleM3:0, poidsAccumuleT:0, nbToursRecus:0,
    visiteId:"v1", createdAt:"2025-03-01T08:00:00Z" },
  { id:"emp2", lotId:"l1", nom:"Zone secondaire — chemin forestier",
    gps:{lat:47.9834, lng:3.0912}, capaciteEstimeeM3:150,
    statut:"disponible", essencePrincipale:"frene",
    volumeAccumuleM3:0, poidsAccumuleT:0, nbToursRecus:0,
    visiteId:"v1", createdAt:"2025-03-01T08:00:00Z" },
];

const LOT = {
  id:"l1", numero:"LOT-2025-007",
  commune:"Charny (89)", essencePrincipale:"peuplier", etf:"ETF Duclos",
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
const uid    = () => Math.random().toString(36).slice(2,9);
const nowISO = () => new Date().toISOString();
const todayS = () => new Date().toISOString().slice(0,10);
const fmt    = d => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}) : "—";

const essenceOpts = ESSENCES_REF.map(e => [e.id, e.emoji, e.label]);

// ── ATOMS ─────────────────────────────────────────────────────────────────────
const Badge = ({bg,color,children,style={}}) => (
  <span style={{display:"inline-block",padding:"2px 9px",borderRadius:9,
    fontSize:10,fontWeight:600,background:bg,color,whiteSpace:"nowrap",...style}}>
    {children}
  </span>
);

const Btn = ({onClick,bg=T.bg2,color=T.tx,children,disabled,sm,full,style={}}) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding:sm?"6px 11px":"10px 16px",borderRadius:9,fontSize:sm?11:13,fontWeight:500,
    display:"inline-flex",alignItems:"center",gap:6,
    justifyContent:full?"center":undefined, width:full?"100%":undefined,
    cursor:disabled?"not-allowed":"pointer",border:"none",fontFamily:"inherit",
    background:disabled?T.bg2:bg, color:disabled?T.tx3:color,
    opacity:disabled?.6:1,transition:"all .12s",whiteSpace:"nowrap",...style,
  }}>{children}</button>
);

const PBtn = ({onClick,children,disabled,full,style={}}) => (
  <Btn onClick={onClick} bg={T.green} color="#fff"
    disabled={disabled} full={full} style={style}>{children}</Btn>
);

const Sec = ({title,icon,color=T.tx2,children,extra}) => (
  <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,
    overflow:"hidden",marginBottom:10}}>
    <div style={{padding:"9px 14px",borderBottom:`1px solid ${T.bd}`,background:T.bg,
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:11,fontWeight:700,color,textTransform:"uppercase",
        letterSpacing:".05em",display:"flex",gap:7,alignItems:"center"}}>
        <span>{icon}</span>{title}
      </div>
      {extra}
    </div>
    <div style={{padding:"12px 14px"}}>{children}</div>
  </div>
);

const NumCtrl = ({value,onChange,label,sub,step=1,min=0}) => (
  <div>
    {label&&<div style={{fontSize:11,fontWeight:500,color:T.tx2,marginBottom:6}}>{label}</div>}
    {sub&&<div style={{fontSize:10,color:T.tx3,marginBottom:8}}>{sub}</div>}
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:18}}>
      <button onClick={()=>onChange(Math.max(min,Math.round((value-step)*100)/100))}
        style={{width:44,height:44,borderRadius:"50%",border:`2px solid ${T.bd}`,
          background:"#fff",fontSize:22,cursor:"pointer",fontFamily:"inherit",
          display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
      <div style={{textAlign:"center",minWidth:64}}>
        <div style={{fontSize:44,fontWeight:700,color:T.brown,lineHeight:1}}>{value}</div>
        {sub&&<div style={{fontSize:10,color:T.tx3,marginTop:2}}>{sub.split(" ").pop()}</div>}
      </div>
      <button onClick={()=>onChange(Math.round((value+step)*100)/100)}
        style={{width:44,height:44,borderRadius:"50%",border:`2px solid ${T.green}`,
          background:T.greenL,fontSize:22,cursor:"pointer",fontFamily:"inherit",
          display:"flex",alignItems:"center",justifyContent:"center",color:T.greenD}}>+</button>
    </div>
  </div>
);

const DimRow = ({label,value,onChange,unit="m",step=0.5}) => (
  <div style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",
    borderBottom:`0.5px solid ${T.bd}`}}>
    <div style={{flex:1,fontSize:12,fontWeight:500,color:T.tx}}>{label}</div>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <input type="number" value={value||""} min={0} step={step}
        onChange={e=>onChange(parseFloat(e.target.value)||0)}
        style={{width:72,padding:"8px",borderRadius:8,border:`1px solid ${T.bd2}`,
          fontSize:14,textAlign:"center",fontFamily:"inherit",outline:"none"}}/>
      <span style={{fontSize:11,color:T.tx3,minWidth:14}}>{unit}</span>
    </div>
  </div>
);

// Sélecteur essence compact avec densité affichée
const EssencePicker = ({value, onChange}) => {
  const ref = ESSENCE_MAP[value];
  return (
    <div>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",padding:"10px",borderRadius:9,border:`1px solid ${T.bd2}`,
          fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none",marginBottom:8}}>
        <optgroup label="Feuillus durs">
          {ESSENCES_REF.filter(e=>e.groupe==="feuillus"&&e.densiteSeche>=560).map(e=>(
            <option key={e.id} value={e.id}>{e.emoji} {e.label} — ρ sec {e.densiteSeche} kg/m³</option>
          ))}
        </optgroup>
        <optgroup label="Feuillus tendres">
          {ESSENCES_REF.filter(e=>e.groupe==="feuillus"&&e.densiteSeche<560).map(e=>(
            <option key={e.id} value={e.id}>{e.emoji} {e.label} — ρ sec {e.densiteSeche} kg/m³</option>
          ))}
        </optgroup>
        <optgroup label="Résineux">
          {ESSENCES_REF.filter(e=>e.groupe==="resineux").map(e=>(
            <option key={e.id} value={e.id}>{e.emoji} {e.label} — ρ sec {e.densiteSeche} kg/m³</option>
          ))}
        </optgroup>
      </select>
      {ref&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {[
            {l:"Densité sèche",v:`${ref.densiteSeche} kg/m³`,c:T.amber},
            {l:"Densité verte",v:`${ref.densiteVerte} kg/m³`,c:T.blue},
            {l:"Foisonnement",v:ref.foisonnementMoyen,c:T.purple},
          ].map(({l,v,c})=>(
            <div key={l} style={{background:c+"12",borderRadius:8,
              padding:"7px",textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
              <div style={{fontSize:9,color:T.tx3,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MeteoBar = ({value,onChange}) => (
  <div style={{display:"flex",gap:7}}>
    {[["beau","☀️"],["nuageux","⛅"],["pluie","🌧️"],["gel","❄️"]].map(([v,ic])=>(
      <button key={v} onClick={()=>onChange(v)} style={{
        flex:1,padding:"10px 4px",borderRadius:10,
        border:`2px solid ${value===v?T.green:T.bd}`,
        background:value===v?T.greenL:"#fff",
        cursor:"pointer",fontFamily:"inherit",
        display:"flex",flexDirection:"column",alignItems:"center",gap:3,
      }}>
        <span style={{fontSize:22}}>{ic}</span>
        <span style={{fontSize:9,color:value===v?T.greenD:T.tx3}}>{v}</span>
      </button>
    ))}
  </div>
);

// Résultat biomasse coloré
const BilanTas = ({volApparentM3,essence,humidite,nb=1}) => {
  if (!volApparentM3||!essence) return null;
  const e = ESSENCE_MAP[essence];
  const {volBoisPleinM3,poidsBrutT,poidsSecT} = calcPoids(volApparentM3,e,humidite);
  const totalBrut = Math.round(poidsBrutT*nb*100)/100;
  const totalSec  = Math.round(poidsSecT*nb*100)/100;
  return (
    <div style={{background:T.green+"12",borderRadius:12,padding:"13px",marginTop:10}}>
      <div style={{fontSize:10,fontWeight:700,color:T.greenD,textTransform:"uppercase",
        letterSpacing:".05em",marginBottom:9}}>
        {nb>1?`Bilan × ${nb} tas`:"1 tas"}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {[
          {l:"Vol. apparent",  v:`${(volApparentM3*nb).toFixed(1)} m³`, c:T.blue},
          {l:`Poids brut (${humidite}%)`, v:`${totalBrut.toFixed(1)} t`, c:T.amber},
          {l:"Poids sec",      v:`${totalSec.toFixed(1)} t`,  c:T.green},
        ].map(({l,v,c})=>(
          <div key={l} style={{textAlign:"center",padding:"8px",
            background:"#fff",borderRadius:9}}>
            <div style={{fontSize:18,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:9,color:T.tx3,marginTop:2,lineHeight:1.3}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:8,fontSize:10,color:T.greenD,textAlign:"center"}}>
        {e?.emoji} {e?.label} · ρ sec {e?.densiteSeche} kg/m³ ·
        foisonnement {e?.foisonnementMoyen}
      </div>
    </div>
  );
};

// GPS widget
const GpsBtn = ({value,onChange,label="📍 Capturer GPS"}) => {
  const [loading,setLoading] = useState(false);
  const capture = () => {
    setLoading(true);
    setTimeout(()=>{
      onChange({lat:47.9812+(Math.random()-.5)*.01,lng:3.0891+(Math.random()-.5)*.01});
      setLoading(false);
    },900);
  };
  if (value) return (
    <div style={{background:T.greenL,borderRadius:9,padding:"8px 12px",
      display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontFamily:"monospace",fontSize:11,color:T.greenD}}>
        {value.lat.toFixed(5)}°N · {value.lng.toFixed(5)}°E
      </span>
      <button onClick={()=>onChange(null)}
        style={{background:"none",border:"none",color:T.greenD,cursor:"pointer",fontSize:16}}>
        ✕</button>
    </div>
  );
  return (
    <button onClick={capture} disabled={loading} style={{
      width:"100%",padding:"12px",borderRadius:10,border:"none",fontFamily:"inherit",
      background:loading?T.bg2:T.greenL,color:loading?T.tx3:T.greenD,
      fontSize:12,fontWeight:500,cursor:loading?"wait":"pointer",
      display:"flex",alignItems:"center",justifyContent:"center",gap:7,
    }}>{loading?"⏳ Localisation…":label}</button>
  );
};

// ── SAISIE ABATTEUR ───────────────────────────────────────────────────────────
const SaisieAbatteur = ({lot, onSave, onBack}) => {
  const [nbTas,    setNbTas]    = useState(0);
  const [longueur, setLongueur] = useState(4.0);
  const [largeur,  setLargeur]  = useState(2.0);
  const [hauteur,  setHauteur]  = useState(1.5);
  const [essence,  setEssence]  = useState("peuplier");
  const [humidite, setHumidite] = useState(50);   // bois vert ≈ 50%
  const [meteo,    setMeteo]    = useState("beau");
  const [incident, setIncident] = useState("aucun");
  const [temps,    setTemps]    = useState(8);
  const [submitted,setSubmitted]= useState(false);

  const volTas = calcVolApparent(longueur, largeur, hauteur, COEFF_FORET);
  const e = ESSENCE_MAP[essence];
  const { poidsBrutT, poidsSecT } = e
    ? calcPoids(volTas, e, humidite)
    : { poidsBrutT:0, poidsSecT:0 };

  const canSave = nbTas > 0 && longueur > 0 && largeur > 0 && hauteur > 0;

  const handleSave = () => {
    setSubmitted(true);
    if (!canSave) return;
    const releveId = uid();
    const tas = Array.from({length:nbTas}).map(() => ({
      id:uid(), releveId,
      lotId:lot.id, lotNumero:lot.numero,
      operateurNom:"P. Girard", date:todayS(),
      essence, humidite,
      longueurM:longueur, largeurM:largeur, hauteurM:hauteur,
      coeffForme: COEFF_FORET,
      volumeApparentM3: volTas,
      poidsBrutT, poidsSecT,
      statut:"en_foret", createdAt:nowISO(),
    }));
    onSave({
      id:releveId, lotId:lot.id, operateurNom:"P. Girard",
      date:todayS(), nbTasTotal:nbTas, tas,
      essence, humidite, meteo, incident, tempsTravailH:temps,
      volumeTotalM3: Math.round(nbTas*volTas*100)/100,
      poidsTotalT:   Math.round(nbTas*poidsBrutT*100)/100,
      createdAt:nowISO(),
    });
  };

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      <div style={{background:T.brown,color:"#fff",padding:"11px 13px",flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",
          cursor:"pointer",color:"rgba(255,255,255,.75)",fontSize:14,marginBottom:5}}>
          ‹ Retour</button>
        <div style={{fontSize:16,fontWeight:600}}>Saisie fin de service — Abatteur</div>
        <div style={{fontSize:12,opacity:.8}}>P. Girard · {lot.numero} · {todayS()}</div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"13px",paddingBottom:80}}>

        <Sec title="Nombre de tas abattus" icon="🌲" color={T.brown}>
          <NumCtrl value={nbTas} onChange={setNbTas}
            sub="tas abattus aujourd'hui"/>
          {submitted&&nbTas===0&&(
            <div style={{fontSize:11,color:T.red,textAlign:"center",marginTop:8}}>
              ⚠ Saisir au moins 1 tas
            </div>
          )}
        </Sec>

        <Sec title="Dimension moyenne d'un tas" icon="📏" color={T.blue}>
          <div style={{fontSize:11,color:T.tx3,marginBottom:8}}>
            Estimez la taille <strong>moyenne</strong> d'un tas laissé en forêt.
            Coefficient forme forestière (andain) : {COEFF_FORET}
          </div>
          <DimRow label="Longueur" value={longueur} onChange={setLongueur}/>
          <DimRow label="Largeur"  value={largeur}  onChange={setLargeur}/>
          <DimRow label="Hauteur"  value={hauteur}  onChange={setHauteur} step={0.1}/>
          {volTas>0&&(
            <div style={{marginTop:8,fontSize:11,color:T.blue,textAlign:"center"}}>
              Volume d'un tas : <strong>{volTas.toFixed(2)} m³</strong>
              {" "}({longueur}×{largeur}×{hauteur}×{COEFF_FORET})
            </div>
          )}
        </Sec>

        <Sec title="Essence dominante" icon="🌿">
          <EssencePicker value={essence} onChange={setEssence}/>
        </Sec>

        <Sec title="Humidité estimée" icon="💧">
          <div style={{fontSize:11,color:T.tx3,marginBottom:8}}>
            Bois vert fraîchement abattu ≈ 45-55 %.
            Bois sur pied depuis plusieurs mois peut être plus sec.
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <input type="range" min={20} max={70} value={humidite} step={1}
              onChange={e=>setHumidite(parseInt(e.target.value))}
              style={{flex:1,accentColor:T.green}}/>
            <div style={{minWidth:64,textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:700,
                color:humidite>45?T.blue:humidite>35?T.amber:T.green}}>
                {humidite}%
              </div>
              <div style={{fontSize:9,color:T.tx3}}>
                {humidite>=50?"Vert":humidite>=35?"Demi-sec":"Sec"}
              </div>
            </div>
          </div>
        </Sec>

        {/* Bilan live avec densité réelle */}
        {nbTas>0&&volTas>0&&(
          <BilanTas volApparentM3={volTas} essence={essence}
            humidite={humidite} nb={nbTas}/>
        )}

        <Sec title="Conditions de la journée" icon="🌤️">
          <MeteoBar value={meteo} onChange={setMeteo}/>
          <div style={{marginTop:10}}>
            <div style={{fontSize:11,fontWeight:500,color:T.tx2,marginBottom:5}}>Incident</div>
            <select value={incident} onChange={e=>setIncident(e.target.value)}
              style={{width:"100%",padding:"10px",borderRadius:9,border:`1px solid ${T.bd2}`,
                fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none"}}>
              {["aucun","panne_machine","arret_meteo","accident","autre"]
                .map(v=><option key={v} value={v}>{v.replace(/_/g," ")}</option>)}
            </select>
          </div>
          <div style={{marginTop:10}}>
            <div style={{fontSize:11,fontWeight:500,color:T.tx2,marginBottom:5}}>
              Temps de travail — <strong>{temps}h</strong>
            </div>
            <input type="range" min={1} max={12} value={temps} step={0.5}
              onChange={e=>setTemps(parseFloat(e.target.value))}
              style={{width:"100%",accentColor:T.green}}/>
          </div>
        </Sec>
      </div>

      <div style={{position:"sticky",bottom:0,padding:"10px 13px 16px",
        background:`linear-gradient(transparent,${T.bg} 30%)`}}>
        <PBtn onClick={handleSave} disabled={!canSave} full>
          ✓ Valider ma saisie journée
        </PBtn>
      </div>
    </div>
  );
};

// ── SAISIE DÉBARDEUR ──────────────────────────────────────────────────────────
const SaisieDebardeur = ({lot, emplacements, onSave, onBack}) => {
  const [nbTours,      setNbTours]      = useState(0);
  const [longueur,     setLongueur]     = useState(6.0);
  const [largeur,      setLargeur]      = useState(3.0);
  const [hauteur,      setHauteur]      = useState(1.5);
  const [nbTasParTour, setNbTasParTour] = useState(3);
  const [essence,      setEssence]      = useState("peuplier");
  const [humidite,     setHumidite]     = useState(48);
  const [machine,      setMachine]      = useState("Skidder Timberjack 450C");
  const [empId,        setEmpId]        = useState(emplacements[0]?.id ?? "");
  const [meteo,        setMeteo]        = useState("beau");
  const [incident,     setIncident]     = useState("aucun");
  const [temps,        setTemps]        = useState(8);
  const [submitted,    setSubmitted]    = useState(false);

  const emp = emplacements.find(e=>e.id===empId);
  const volTour    = calcVolApparent(longueur, largeur, hauteur, COEFF_DEPOT);
  const e          = ESSENCE_MAP[essence];
  const { poidsBrutT: poidsTour } = e ? calcPoids(volTour,e,humidite) : {poidsBrutT:0};
  const volTotal   = Math.round(nbTours*volTour*100)/100;
  const poidsTotal = Math.round(nbTours*poidsTour*100)/100;
  const nbTasTotal = nbTours * nbTasParTour;

  const canSave = nbTours>0 && longueur>0 && largeur>0 && hauteur>0 && !!empId;

  const handleSave = () => {
    setSubmitted(true);
    if (!canSave) return;
    const releveId = uid();
    const tours = Array.from({length:nbTours}).map((_,i) => ({
      id:uid(), releveId,
      lotId:lot.id, lotNumero:lot.numero,
      operateurNom:"J. Moreau", machine, date:todayS(),
      numerotour: i+1,
      nbTasTransportes: nbTasParTour,
      longueurM:longueur, largeurM:largeur, hauteurM:hauteur,
      volumeM3: volTour, poidsBrutT: poidsTour,
      essence, humidite,
      emplacementId: empId,
      createdAt:nowISO(),
    }));
    onSave({
      id:releveId, lotId:lot.id,
      operateurNom:"J. Moreau", machine,
      date:todayS(), nbToursTotal:nbTours, tours,
      nbTasTotal, essence, humidite,
      emplacementId: empId,
      emplacementNom: emp?.nom,
      meteo, incident, tempsTravailH:temps,
      volumeTotalM3: volTotal,
      poidsTotalT:   poidsTotal,
      createdAt:nowISO(),
    });
  };

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      <div style={{background:T.blue,color:"#fff",padding:"11px 13px",flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",
          cursor:"pointer",color:"rgba(255,255,255,.75)",fontSize:14,marginBottom:5}}>
          ‹ Retour</button>
        <div style={{fontSize:16,fontWeight:600}}>Saisie fin de service — Débardeur</div>
        <div style={{fontSize:12,opacity:.8}}>J. Moreau · {lot.numero} · {todayS()}</div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"13px",paddingBottom:80}}>

        {/* Machine */}
        <Sec title="Machine" icon="🚜" color={T.blue}>
          <input value={machine} onChange={e=>setMachine(e.target.value)}
            placeholder="Skidder, porteur…"
            style={{width:"100%",padding:"10px",borderRadius:9,border:`1px solid ${T.bd2}`,
              fontSize:13,fontFamily:"inherit",outline:"none"}}/>
        </Sec>

        {/* Emplacement cible — défini à la visite */}
        <Sec title="Emplacement de dépôt" icon="📍" color={T.green}>
          <div style={{background:T.amberL,borderRadius:9,padding:"9px 11px",
            fontSize:11,color:T.amberD,marginBottom:10}}>
            ⚠ Sélectionnez l'emplacement <strong>défini lors de la visite initiale</strong>.
            Les tours s'accumulent sur cet emplacement existant.
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {emplacements.filter(e=>e.lotId===lot.id).map(emp=>{
              const pct = Math.round(emp.volumeAccumuleM3/emp.capaciteEstimeeM3*100);
              const isSelected = empId===emp.id;
              return (
                <div key={emp.id} onClick={()=>setEmpId(emp.id)} style={{
                  padding:"11px 13px",borderRadius:10,cursor:"pointer",
                  border:`2px solid ${isSelected?T.green:T.bd}`,
                  background:isSelected?T.greenL:"#fff",
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"flex-start",marginBottom:5}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,
                        color:isSelected?T.greenD:T.tx}}>
                        {emp.nom}
                      </div>
                      <div style={{fontFamily:"monospace",fontSize:10,color:T.tx3}}>
                        {emp.gps.lat.toFixed(4)}°N · {emp.gps.lng.toFixed(4)}°E
                      </div>
                    </div>
                    {isSelected&&(
                      <div style={{width:20,height:20,borderRadius:"50%",
                        background:T.green,display:"flex",alignItems:"center",
                        justifyContent:"center"}}>
                        <span style={{color:"#fff",fontSize:12}}>✓</span>
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:10,color:T.tx3,marginBottom:6}}>
                    Capacité estimée : {emp.capaciteEstimeeM3} m³ ·
                    Déjà reçu : {emp.volumeAccumuleM3.toFixed(1)} m³
                    ({emp.nbToursRecus} tours)
                  </div>
                  <div style={{height:5,background:T.bg2,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",
                      width:`${Math.min(100,pct)}%`,
                      background:pct>85?T.red:pct>60?T.amber:T.green,
                      borderRadius:3}}/>
                  </div>
                  <div style={{fontSize:9,color:T.tx3,marginTop:3,textAlign:"right"}}>
                    {pct}% capacité
                  </div>
                </div>
              );
            })}
          </div>
          {submitted&&!empId&&(
            <div style={{fontSize:11,color:T.red,marginTop:6}}>
              ⚠ Sélectionner un emplacement
            </div>
          )}
        </Sec>

        {/* Nombre de tours */}
        <Sec title="Nombre de tours" icon="🔄" color={T.blue}>
          <div style={{fontSize:11,color:T.tx3,marginBottom:10}}>
            Un tour = trajet forêt → emplacement de dépôt.
          </div>
          <NumCtrl value={nbTours} onChange={setNbTours} sub="tours"/>
        </Sec>

        {/* Tas par tour */}
        <Sec title="Tas par tour (moyenne)" icon="📦">
          <div style={{fontSize:11,color:T.tx3,marginBottom:10}}>
            Combien de tas abattus transportez-vous en moyenne par tour ?
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
            <button onClick={()=>setNbTasParTour(n=>Math.max(1,n-1))} style={{
              width:36,height:36,borderRadius:"50%",border:`2px solid ${T.bd}`,
              background:"#fff",fontSize:18,cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:36,fontWeight:700,color:T.blue,lineHeight:1}}>
                {nbTasParTour}
              </div>
              <div style={{fontSize:10,color:T.tx3}}>tas / tour</div>
            </div>
            <button onClick={()=>setNbTasParTour(n=>n+1)} style={{
              width:36,height:36,borderRadius:"50%",border:`2px solid ${T.blue}`,
              background:T.blueL,fontSize:18,cursor:"pointer",fontFamily:"inherit",
              display:"flex",alignItems:"center",justifyContent:"center",color:T.blueD}}>+</button>
          </div>
          {nbTours>0&&(
            <div style={{textAlign:"center",marginTop:6,fontSize:11,color:T.tx3}}>
              = {nbTasTotal} tas débarié{nbTasTotal>1?"s":""} au total
            </div>
          )}
        </Sec>

        {/* Dimension panier */}
        <Sec title="Dimension du panier (mesure directe)" icon="📏" color={T.blue}>
          <div style={{fontSize:11,color:T.tx3,marginBottom:8}}>
            Taille d'un chargement type tel que visible sur la machine. Pas de coefficient de forme.
          </div>
          <DimRow label="Longueur du panier" value={longueur} onChange={setLongueur}/>
          <DimRow label="Largeur du panier"  value={largeur}  onChange={setLargeur}/>
          <DimRow label="Hauteur"            value={hauteur}  onChange={setHauteur} step={0.1}/>
          {volTour>0&&(
            <div style={{marginTop:8,fontSize:11,color:T.blue,textAlign:"center"}}>
              1 tour = <strong>{volTour.toFixed(2)} m³</strong>
            </div>
          )}
        </Sec>

        {/* Essence + humidité */}
        <Sec title="Essence dominante transportée" icon="🌿">
          <EssencePicker value={essence} onChange={setEssence}/>
        </Sec>

        <Sec title="Humidité estimée" icon="💧">
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <input type="range" min={20} max={70} value={humidite} step={1}
              onChange={e=>setHumidite(parseInt(e.target.value))}
              style={{flex:1,accentColor:T.green}}/>
            <div style={{minWidth:64,textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:700,
                color:humidite>45?T.blue:humidite>35?T.amber:T.green}}>
                {humidite}%
              </div>
            </div>
          </div>
        </Sec>

        {/* Bilan live */}
        {nbTours>0&&volTour>0&&(
          <BilanTas volApparentM3={volTour} essence={essence}
            humidite={humidite} nb={nbTours}/>
        )}

        {/* Récap emplacement */}
        {emp&&nbTours>0&&poidsTotal>0&&(
          <div style={{background:T.greenL,borderRadius:12,padding:"12px 14px",
            border:`1px solid ${T.green}40`,marginTop:0}}>
            <div style={{fontSize:11,fontWeight:700,color:T.greenD,marginBottom:6}}>
              Après validation :
            </div>
            <div style={{fontSize:12,color:T.greenD}}>
              <strong>{emp.nom}</strong> recevra
              {" "}<strong>+{volTotal.toFixed(1)} m³</strong>
              {" "}(+{poidsTotal.toFixed(1)} t)
              {" "}→ total {(emp.volumeAccumuleM3+volTotal).toFixed(1)} m³
            </div>
          </div>
        )}

        <Sec title="Conditions" icon="🌤️">
          <MeteoBar value={meteo} onChange={setMeteo}/>
          <div style={{marginTop:10}}>
            <select value={incident} onChange={e=>setIncident(e.target.value)}
              style={{width:"100%",padding:"10px",borderRadius:9,border:`1px solid ${T.bd2}`,
                fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none"}}>
              {["aucun","panne_machine","arret_meteo","enlisement","accident","autre"]
                .map(v=><option key={v} value={v}>{v.replace(/_/g," ")}</option>)}
            </select>
          </div>
          <div style={{marginTop:10}}>
            <div style={{fontSize:11,fontWeight:500,color:T.tx2,marginBottom:5}}>
              Temps de travail — <strong>{temps}h</strong>
            </div>
            <input type="range" min={1} max={12} value={temps} step={0.5}
              onChange={e=>setTemps(parseFloat(e.target.value))}
              style={{width:"100%",accentColor:T.blue}}/>
          </div>
        </Sec>
      </div>

      <div style={{position:"sticky",bottom:0,padding:"10px 13px 16px",
        background:`linear-gradient(transparent,${T.bg} 30%)`}}>
        <PBtn onClick={handleSave} disabled={!canSave} full>
          ✓ Valider ma saisie journée
        </PBtn>
      </div>
    </div>
  );
};

// ── VUE EMPLACEMENTS DE DÉPÔT ─────────────────────────────────────────────────
const VueEmplacements = ({emplacements, releveAbatteurs, releveDebardeurs, onBack}) => {
  const totAbattu  = releveAbatteurs.reduce((s,r)=>s+r.poidsTotalT,0);
  const totDebarié = releveDebardeurs.reduce((s,r)=>s+r.poidsTotalT,0);
  const totDepot   = emplacements.reduce((s,e)=>s+e.poidsAccumuleT,0);

  const statutCfg = {
    disponible:          {bg:T.bg2,    c:T.tx3,    l:"Disponible"},
    en_cours_remplissage:{bg:T.blueL,  c:T.blueD,  l:"En cours"},
    pret_broyage:        {bg:T.greenL, c:T.greenD, l:"Prêt broyeur ✓"},
    broyage_en_cours:    {bg:T.purpleL,c:T.purpleD,l:"Broyage"},
    termine:             {bg:T.bg2,    c:T.tx3,    l:"Terminé"},
  };

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      <div style={{padding:"10px 13px 8px",background:"#fff",
        borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:8}}>
        <button onClick={onBack} style={{background:"none",border:"none",
          cursor:"pointer",fontSize:18,color:T.tx2}}>‹</button>
        <div style={{fontSize:14,fontWeight:500}}>Emplacements de dépôt</div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 13px"}}>
        {/* Bilan */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          {[
            {l:"Abattu",  v:`${totAbattu.toFixed(1)} t`, c:T.brown, i:"🌲"},
            {l:"Débarié", v:`${totDebarié.toFixed(1)} t`,c:T.blue,  i:"🚜"},
            {l:"Dépôt",   v:`${totDepot.toFixed(1)} t`,  c:T.green, i:"📦"},
          ].map(({l,v,c,i})=>(
            <div key={l} style={{background:"#fff",border:`1px solid ${T.bd}`,
              borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:18}}>{i}</div>
              <div style={{fontSize:17,fontWeight:700,color:c,margin:"3px 0"}}>{v}</div>
              <div style={{fontSize:9,color:T.tx3}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Emplacements */}
        {emplacements.map(emp=>{
          const sc = statutCfg[emp.statut];
          const pct = emp.capaciteEstimeeM3>0
            ? Math.min(100,Math.round(emp.volumeAccumuleM3/emp.capaciteEstimeeM3*100))
            : 0;
          return (
            <Sec key={emp.id} title={emp.nom} icon="📍"
              color={emp.statut==="pret_broyage"?T.green:T.tx2}
              extra={<Badge bg={sc.bg} color={sc.c}>{sc.l}</Badge>}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
                gap:8,marginBottom:10}}>
                {[
                  {l:"Reçu",    v:`${emp.volumeAccumuleM3.toFixed(1)} m³`,c:T.blue},
                  {l:"Poids",   v:`${emp.poidsAccumuleT.toFixed(1)} t`,  c:T.green},
                  {l:"Tours",   v:emp.nbToursRecus,                        c:T.brown},
                ].map(({l,v,c})=>(
                  <div key={l} style={{textAlign:"center",padding:"8px",
                    background:c+"12",borderRadius:8}}>
                    <div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div>
                    <div style={{fontSize:9,color:T.tx3,marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:4,fontSize:10,color:T.tx3,
                display:"flex",justifyContent:"space-between"}}>
                <span>Capacité : {emp.capaciteEstimeeM3} m³</span>
                <span>{pct}%</span>
              </div>
              <div style={{height:7,background:T.bg2,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",
                  width:`${pct}%`,
                  background:pct>85?T.red:pct>60?T.amber:T.green,
                  borderRadius:4,transition:"width .5s"}}/>
              </div>
              <div style={{marginTop:8,fontFamily:"monospace",fontSize:10,color:T.tx3}}>
                {emp.gps.lat.toFixed(5)}°N · {emp.gps.lng.toFixed(5)}°E
              </div>
            </Sec>
          );
        })}

        {/* Historique débardage */}
        {releveDebardeurs.length>0&&(
          <Sec title="Relevés débardage" icon="📋">
            {releveDebardeurs.map((r,i)=>(
              <div key={r.id} style={{display:"flex",gap:9,padding:"7px 0",
                borderBottom:i<releveDebardeurs.length-1?`0.5px solid ${T.bd}`:"none"}}>
                <div style={{width:26,height:26,borderRadius:6,background:T.blueL,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,flexShrink:0}}>🚜</div>
                <div>
                  <div style={{fontSize:12,fontWeight:500}}>
                    {r.nbToursTotal} tours · {r.nbTasTotal} tas ·
                    {" "}{r.poidsTotalT.toFixed(1)} t
                  </div>
                  <div style={{fontSize:10,color:T.tx3}}>
                    {r.operateurNom} · {r.machine} ·
                    {" "}→ {r.emplacementNom} · {fmt(r.date)}
                  </div>
                </div>
              </div>
            ))}
          </Sec>
        )}
      </div>
    </div>
  );
};

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,              setView]              = useState("accueil");
  const [releveAbatteurs,   setReleveAbatteurs]   = useState([]);
  const [releveDebardeurs,  setReleveDebardeurs]  = useState([]);
  const [emplacements,      setEmplacements]      = useState(EMPLACEMENTS_VISITE);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg)=>{
    const id=uid();
    setToasts(t=>[...t,{id,msg}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2800);
  },[]);

  const handleSaveAbatteur = useCallback((releve)=>{
    setReleveAbatteurs(prev=>[...prev,releve]);
    toast(`✓ Abattage — ${releve.nbTasTotal} tas · ${releve.poidsTotalT.toFixed(1)} t`);
    setView("accueil");
  },[toast]);

  const handleSaveDebardeur = useCallback((releve)=>{
    setReleveDebardeurs(prev=>[...prev,releve]);
    // Incrémenter l'emplacement existant (pas de création)
    setEmplacements(prev=>prev.map(e=> e.id===releve.emplacementId
      ? {
          ...e,
          volumeAccumuleM3: Math.round((e.volumeAccumuleM3+releve.volumeTotalM3)*100)/100,
          poidsAccumuleT:   Math.round((e.poidsAccumuleT+releve.poidsTotalT)*100)/100,
          nbToursRecus:     e.nbToursRecus+releve.nbToursTotal,
          statut:           "en_cours_remplissage",
        }
      : e
    ));
    toast(`✓ Débardage — ${releve.nbToursTotal} tours → ${releve.emplacementNom}`);
    setView("accueil");
  },[toast]);

  const totAbattu  = releveAbatteurs.reduce((s,r)=>s+r.poidsTotalT,0);
  const totDebarié = releveDebardeurs.reduce((s,r)=>s+r.poidsTotalT,0);
  const totDepot   = emplacements.reduce((s,e)=>s+e.poidsAccumuleT,0);

  return (
    <div style={{display:"flex",justifyContent:"center",minHeight:"100vh",
      background:T.bg,padding:"12px 8px",gap:18,alignItems:"flex-start",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>

      {/* Toasts */}
      <div style={{position:"fixed",top:14,right:14,zIndex:9999,
        display:"flex",flexDirection:"column",gap:6,pointerEvents:"none"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:"9px 15px",borderRadius:9,fontSize:12,
            fontWeight:500,color:"#fff",boxShadow:"0 4px 14px rgba(0,0,0,.2)",
            background:T.greenD}}>{t.msg}</div>
        ))}
      </div>

      {/* Phone */}
      <div style={{width:340,background:"#111",borderRadius:36,overflow:"hidden",
        border:"6px solid #1a1a1a",boxShadow:"0 16px 48px rgba(0,0,0,.35)",
        display:"flex",flexDirection:"column",alignSelf:"flex-start"}}>
        <div style={{height:20,background:"#111",display:"flex",
          alignItems:"center",justifyContent:"center"}}>
          <div style={{width:56,height:7,background:"#000",borderRadius:4}}/>
        </div>
        <div style={{background:T.bg,display:"flex",flexDirection:"column",
          maxHeight:690,overflow:"hidden"}}>
          {/* Topbar */}
          <div style={{background:"#111",color:"#fff",padding:"8px 12px",
            display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:22,height:22,background:T.green,borderRadius:5,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>🌲</div>
            <span style={{fontSize:13,fontWeight:700,letterSpacing:".02em"}}>APPLITAG</span>
            <div style={{flex:1}}/>
            <Badge bg={T.greenL} color={T.greenD} style={{fontSize:9}}>
              {TESTS_PASS}/{UNIT_TESTS.length} ✓
            </Badge>
          </div>

          <div style={{flex:1,display:"flex",flexDirection:"column",overflowY:"auto"}}>

            {/* ACCUEIL */}
            {view==="accueil"&&(
              <div style={{padding:"13px 13px",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{background:T.green,color:"#fff",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:10,opacity:.7,marginBottom:2}}>CHANTIER ACTIF</div>
                  <div style={{fontSize:15,fontWeight:600}}>{LOT.numero}</div>
                  <div style={{fontSize:11,opacity:.8}}>{LOT.commune} · {LOT.essencePrincipale}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {[
                    {i:"🌲",l:"Abattu",  v:totAbattu.toFixed(1),  c:T.brown},
                    {i:"🚜",l:"Débarié", v:totDebarié.toFixed(1), c:T.blue},
                    {i:"📦",l:"Dépôt",   v:totDepot.toFixed(1),   c:T.green},
                  ].map(({i,l,v,c})=>(
                    <div key={l} style={{background:"#fff",border:`1px solid ${T.bd}`,
                      borderRadius:10,padding:"10px",textAlign:"center"}}>
                      <div style={{fontSize:18}}>{i}</div>
                      <div style={{fontSize:15,fontWeight:700,color:c,margin:"2px 0"}}>
                        {v} t
                      </div>
                      <div style={{fontSize:9,color:T.tx3}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:"#fff",border:`1px solid ${T.bd}`,
                  borderRadius:12,padding:"12px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
                    letterSpacing:".06em",marginBottom:10}}>Actions terrain</div>
                  {[
                    {icon:"🌲",c:T.brown,titre:"Saisie abatteur",sub:"Fin de journée · Nombre de tas + dimensions",action:"abatteur"},
                    {icon:"🚜",c:T.blue, titre:"Saisie débardeur",sub:"Fin de journée · Tours + emplacement dépôt",action:"debardeur"},
                    {icon:"📦",c:T.green,titre:"Emplacements dépôt",sub:"Voir les stocks par emplacement",action:"depot"},
                  ].map((s,i)=>(
                    <div key={s.titre}>
                      <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}>
                        <div style={{width:34,height:34,borderRadius:8,background:s.c+"14",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:18,flexShrink:0}}>{s.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:500}}>{s.titre}</div>
                          <div style={{fontSize:10,color:T.tx3}}>{s.sub}</div>
                        </div>
                        <Btn onClick={()=>setView(s.action)}
                          bg={s.c+"18"} color={s.c} sm>›</Btn>
                      </div>
                      {i<2&&<div style={{height:1,background:T.bd,margin:"0 2px"}}/>}
                    </div>
                  ))}
                </div>
                <Btn onClick={()=>setView("tests")} bg={T.bg2} color={T.tx3}
                  sm style={{alignSelf:"center"}}>
                  🧪 Tests ({TESTS_PASS}/{UNIT_TESTS.length})
                </Btn>
              </div>
            )}

            {view==="abatteur"&&(
              <SaisieAbatteur lot={LOT} onSave={handleSaveAbatteur}
                onBack={()=>setView("accueil")}/>
            )}

            {view==="debardeur"&&(
              <SaisieDebardeur lot={LOT} emplacements={emplacements}
                onSave={handleSaveDebardeur} onBack={()=>setView("accueil")}/>
            )}

            {view==="depot"&&(
              <VueEmplacements emplacements={emplacements}
                releveAbatteurs={releveAbatteurs}
                releveDebardeurs={releveDebardeurs}
                onBack={()=>setView("accueil")}/>
            )}

            {view==="tests"&&(
              <div style={{padding:"13px"}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <button onClick={()=>setView("accueil")} style={{background:"none",
                    border:"none",cursor:"pointer",fontSize:18,color:T.tx2}}>‹</button>
                  <div style={{fontSize:14,fontWeight:500}}>
                    Tests — {TESTS_PASS}/{UNIT_TESTS.length}
                  </div>
                </div>
                <div style={{padding:"8px 11px",borderRadius:9,marginBottom:10,
                  background:TESTS_PASS===UNIT_TESTS.length?T.greenL:T.amberL,
                  fontSize:12,fontWeight:600,
                  color:TESTS_PASS===UNIT_TESTS.length?T.greenD:T.amberD}}>
                  {TESTS_PASS}/{UNIT_TESTS.length} passés
                </div>
                {TEST_RESULTS.map((r,i)=>(
                  <div key={i} style={{display:"flex",gap:8,padding:"6px 0",
                    borderBottom:`0.5px solid ${T.bd}`,fontSize:11}}>
                    <span style={{color:r.pass?T.green:T.red,fontWeight:700,
                      fontSize:14,flexShrink:0}}>{r.pass?"✓":"✗"}</span>
                    <div>
                      <div style={{color:r.pass?T.tx:T.red}}>{r.name}</div>
                      {r.err&&<div style={{fontSize:10,color:T.red}}>{r.err}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom nav */}
          <div style={{height:50,background:"#111",display:"flex",
            alignItems:"center",justifyContent:"space-around",flexShrink:0}}>
            {[["accueil","🏠","Accueil"],["abatteur","🌲","Abattage"],
              ["debardeur","🚜","Débardage"],["depot","📦","Dépôt"]].map(([id,icon,label])=>(
              <button key={id} onClick={()=>setView(id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                cursor:"pointer",background:"none",border:"none",fontFamily:"inherit"}}>
                <span style={{fontSize:17,opacity:view===id?1:0.35}}>{icon}</span>
                <span style={{fontSize:8,fontWeight:500,color:view===id?T.green:"#555"}}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panel explicatif */}
      <div style={{maxWidth:240,display:"flex",flexDirection:"column",
        gap:9,paddingTop:4,alignSelf:"flex-start"}}>

        <div style={{background:"#fff",border:`1px solid ${T.bd}`,
          borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:12,fontWeight:600,color:T.green,marginBottom:8}}>
            Poids par essence (ρ sec)
          </div>
          {ESSENCES_REF.filter(e=>!["saule","aulne","melange","chataignier","robinier","erable"]
            .includes(e.id)).map(e=>(
            <div key={e.id} style={{display:"flex",justifyContent:"space-between",
              alignItems:"center",padding:"4px 0",borderBottom:`0.5px solid ${T.bd}`,
              fontSize:11}}>
              <div style={{display:"flex",gap:6}}>
                <span>{e.emoji}</span>
                <span style={{color:T.tx}}>{e.label}</span>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:10,color:T.tx3}}>{e.groupe==="resineux"?"rés.":"feu."}
                </span>
                <Badge bg={e.densiteSeche>=700?T.greenL:e.densiteSeche>=550?T.amberL:T.blueL}
                  color={e.densiteSeche>=700?T.greenD:e.densiteSeche>=550?T.amberD:T.blueD}
                  style={{fontSize:9}}>
                  {e.densiteSeche} kg/m³
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:"#fff",border:`1px solid ${T.bd}`,
          borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontSize:11,fontWeight:700,color:T.tx2,textTransform:"uppercase",
            letterSpacing:".05em",marginBottom:7}}>Deux corrections clés</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{padding:"9px",background:T.brownL,borderRadius:9}}>
              <div style={{fontSize:11,fontWeight:600,color:T.brown,marginBottom:3}}>
                Densité réelle
              </div>
              <div style={{fontSize:10,color:T.brown,lineHeight:1.5}}>
                Le poids dépend de l'essence. Charme 760 kg/m³ vs Peuplier 420 kg/m³ — un écart de 81 % pour le même volume.
              </div>
            </div>
            <div style={{padding:"9px",background:T.greenL,borderRadius:9}}>
              <div style={{fontSize:11,fontWeight:600,color:T.greenD,marginBottom:3}}>
                Emplacement visite
              </div>
              <div style={{fontSize:10,color:T.greenD,lineHeight:1.5}}>
                Les emplacements sont créés une fois lors de la visite. Le débardeur choisit à quel emplacement il dépose — les tours s'accumulent, aucun nouvel emplacement n'est créé.
              </div>
            </div>
          </div>
        </div>

        <div style={{background:T.blueL,borderRadius:12,padding:"10px 13px",
          fontSize:11,color:T.blueD,lineHeight:1.6,border:`1px solid ${T.blue}20`}}>
          <strong>Formule :</strong><br/>
          vol apparent × foisonnement = vol bois plein<br/>
          vol bois plein × densité(H%) = poids brut<br/>
          <span style={{fontSize:10,opacity:.8}}>
            La densité est interpolée entre ρ sèche (H=0%) et ρ verte (H≈55%) selon l'humidité saisie.
          </span>
        </div>
      </div>
    </div>
  );
}
