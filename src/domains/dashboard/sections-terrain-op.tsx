// @ts-nocheck
import { useState } from "react";
import { C, PADDING, FONT_TITLE, BTN_H, INPUT_H, FONT_INPUT } from "../../design-system/tokens.js";
import { todayS, uid } from "../../shared/utils.js";
import { STATUT_FOURN_RED, DEMO_TRONCONS, NIVEAUX_RESTRICTION, PORTANCE_OPTS, ACCES_INCENDIE_OPTS, STATUT_TRONCON, TYPES_ANOMALIE, URGENCES, SOURCES_PROFIL } from "./sections-terrain-op.constants.js";

const PERIMETRE_RED_OPTS = [
  {id:"bois_forestier", label:"Bois forestier"},
  {id:"residus",        label:"Résidus forestiers"},
  {id:"connexes",       label:"Connexes de scierie"},
  {id:"dechets_bois",   label:"Déchets bois"},
  {id:"plaquettes",     label:"Plaquettes forestières"},
  {id:"bois_rond",      label:"Bois rond"},
];

const CHAINE_ETAPES = [
  {id:"lot_forestier",  label:"Lot forestier identifié",    icon:"🌲"},
  {id:"bord_route",     label:"Tas bord de route",           icon:"🪵"},
  {id:"broyage",        label:"Broyage / déchiquetage",      icon:"🌀"},
  {id:"entree_plat",    label:"Entrée plateforme",           icon:"🏗️"},
  {id:"stockage",       label:"Stockage",                    icon:"📦"},
  {id:"melange",        label:"Mélange éventuel",            icon:"🔀"},
  {id:"chargement",     label:"Chargement camion",           icon:"🚛"},
  {id:"transport",      label:"Transport",                   icon:"🛣️"},
  {id:"livraison",      label:"Livraison chaufferie",        icon:"🔥"},
  {id:"reception",      label:"Réception / pesée / humidité",icon:"⚖️"},
];


/* ═══════════════════════════════════════════════════════════════
   MODULE DESSERTE FORESTIÈRE
═══════════════════════════════════════════════════════════════ */
// PORTANCE_OPTS, ACCES_INCENDIE_OPTS, STATUT_TRONCON, DEMO_TRONCONS importés depuis sections-terrain-op.constants.js

// ── APPLITAG DATA — SIGNALEMENTS ANOMALIES DESSERTES ─────────────
const SIGNALEMENTS_KEY = "applitag_signalements_desserte";
const signalementsGet = () => { try { return JSON.parse(localStorage.getItem(SIGNALEMENTS_KEY)||"[]"); } catch { return []; } };
const signalementsSet = (arr) => { try { localStorage.setItem(SIGNALEMENTS_KEY, JSON.stringify(arr)); } catch { /* noop */ } };

// TYPES_ANOMALIE, URGENCES importés depuis sections-terrain-op.constants.js
// SOURCES_PROFIL importé depuis sections-terrain-op.constants.js

const DEMO_SIGNALEMENTS = [
  {id:"sg1",createdAt:"2026-08-05T07:12:00Z",auteur:"Martin Dupont",profil:"Opérateur terrain",
   tronconId:"TRC-003-demo",tronconNom:"Route de la Biche — section sud",
   type:"arbre_tombe",urgence:"rouge",commentaire:"Chêne traversant la piste sur 50 m, passage impossible.",
   gps:{lat:46.495,lng:2.883},photos:2,statut:"ouvert",commune:"Saint-Bonnet-Tronçais",
   validePar:null,traitePar:null,dateTraitement:null},
  {id:"sg2",createdAt:"2026-08-04T14:30:00Z",auteur:"Claire Laurent",profil:"Mandataire",
   tronconId:"TRC-001-demo",tronconNom:"Chemin des Battets — section nord",
   type:"fosse",urgence:"orange",commentaire:"Fossé nord bouché sur 30 m après la pluie du 3 août. Eau sur chaussée.",
   gps:{lat:46.512,lng:2.891},photos:1,statut:"ouvert",commune:"Saint-Bonnet-Tronçais",
   validePar:null,traitePar:null,dateTraitement:null},
  {id:"sg3",createdAt:"2026-07-28T09:00:00Z",auteur:"Commune de Tronçais",profil:"Collectivité",
   tronconId:"TRC-002-demo",tronconNom:"Piste de la Corniche",
   type:"vegetation",urgence:"jaune",commentaire:"Végétation envahissante sur 200 m côté amont. Réduction de la largeur visible.",
   gps:{lat:46.491,lng:2.912},photos:0,statut:"traite",commune:"Tronçais",
   validePar:"Admin APPLITAG",traitePar:"Sylviculture Allier",dateTraitement:"2026-08-01"},
];

// Composant banque de données cartographiée
export const SectionApplitgData = ({onSignaler}) => {
  const [signalements, setSignalements] = useState(()=>{
    const d=signalementsGet(); return d.length?d:[...DEMO_SIGNALEMENTS];
  });
  const [filtre, setFiltre] = useState("tous"); // tous | ouvert | traite
  const [filtreUrgence, setFiltreUrgence] = useState("tous");

  const displayed = signalements
    .filter(s=> filtre==="tous" || s.statut===filtre)
    .filter(s=> filtreUrgence==="tous" || s.urgence===filtreUrgence)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const nbOuverts = signalements.filter(s=>s.statut==="ouvert").length;
  const nbUrgents = signalements.filter(s=>s.statut==="ouvert"&&s.urgence==="rouge").length;
  const nbParType = {};
  signalements.forEach(s=>{ nbParType[s.type]=(nbParType[s.type]||0)+1; });

  const marquerTraite = (id) => {
    const upd = signalements.map(s=>s.id===id?{...s,statut:"traite",dateTraitement:todayS(),traitePar:"Gestionnaire"}:s);
    setSignalements(upd); signalementsSet(upd);
  };

  return (
    <div style={{padding:PADDING,maxWidth:680,margin:"0 auto"}}>
      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#1E3A5F 0%,#1E5B3A 100%)",borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🗄️</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>APPLITAG Data</div>
        <div style={{fontSize:13,opacity:.85}}>Banque de données des anomalies dessertes forestières — signalements terrain collaboratifs</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>🚨 {nbUrgents} urgent{nbUrgents>1?"s":""}</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>📋 {nbOuverts} ouvert{nbOuverts>1?"s":""}</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>✅ {signalements.filter(s=>s.statut==="traite").length} traité{signalements.filter(s=>s.statut==="traite").length>1?"s":""}</span>
        </div>
      </div>

      {/* Bouton signaler rapide */}
      <button onClick={onSignaler} style={{
        width:"100%",height:BTN_H,borderRadius:12,border:"none",marginBottom:16,
        background:"#991B1B",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        🚨 Signaler une anomalie
      </button>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Tous"],["ouvert","Ouverts"],["traite","Traités"]].map(([id,l])=>(
          <button key={id} onClick={()=>setFiltre(id)} style={{
            padding:"6px 12px",borderRadius:99,fontSize:12,fontWeight:filtre===id?700:400,
            border:`1.5px solid ${filtre===id?"#1E3A5F":C.bd}`,
            background:filtre===id?"#1E3A5F":"#fff",color:filtre===id?"#fff":C.tx2,cursor:"pointer"}}>
            {l}
          </button>
        ))}
        <div style={{flex:1}}/>
        {["tous","rouge","orange","jaune"].map(u=>{
          const info=u==="tous"?null:URGENCES[u];
          return (
            <button key={u} onClick={()=>setFiltreUrgence(u)} style={{
              padding:"6px 12px",borderRadius:99,fontSize:12,fontWeight:filtreUrgence===u?700:400,
              border:`1.5px solid ${filtreUrgence===u?(info?.col||"#1E3A5F"):C.bd}`,
              background:filtreUrgence===u?(info?.bg||"#1E3A5F"):"#fff",
              color:filtreUrgence===u?(info?.col||"#fff"):C.tx2,cursor:"pointer"}}>
              {info?info.icon:"🔍"} {info?info.label.split(" ")[0]:"Tous"}
            </button>
          );
        })}
      </div>

      {/* Carte placeholder des points */}
      <div style={{background:"#F0F9FF",border:"1px solid #BFDBFE",borderRadius:12,
        padding:"12px 16px",marginBottom:12,fontSize:12,color:"#1E3A5F"}}>
        <div style={{fontWeight:700,marginBottom:6}}>🗺️ Carte APPLITAG Data — {displayed.length} signalement(s) affiché(s)</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {displayed.map(s=>{
            const t=TYPES_ANOMALIE.find(a=>a.id===s.type)||TYPES_ANOMALIE[12];
            const u=URGENCES[s.urgence]||URGENCES.jaune;
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",
                borderRadius:99,fontSize:11,background:u.bg,color:u.col,fontWeight:600}}>
                {t.icon} {s.tronconNom?.split("—")[0].trim()||s.tronconId}
              </div>
            );
          })}
        </div>
        <div style={{marginTop:6,fontSize:11,opacity:.7}}>Intégration cartographique IGN/OSM prévue — les coordonnées GPS sont déjà enregistrées.</div>
      </div>

      {/* Liste des signalements */}
      {displayed.length===0?(
        <div style={{textAlign:"center",padding:40,color:C.tx3}}>Aucun signalement correspondant</div>
      ):displayed.map(s=>{
        const t=TYPES_ANOMALIE.find(a=>a.id===s.type)||TYPES_ANOMALIE[12];
        const u=URGENCES[s.urgence]||URGENCES.jaune;
        const dateS=new Date(s.createdAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
        return (
          <div key={s.id} style={{background:"#fff",borderRadius:12,border:`1.5px solid ${s.statut==="ouvert"?u.col+"66":C.bd}`,
            padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{t.icon} {t.label}</div>
                <div style={{fontSize:12,color:C.tx3,marginTop:1}}>{s.tronconNom||s.tronconId} · {s.commune}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:u.bg,color:u.col}}>
                  {u.icon} {u.label}
                </span>
                <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:600,
                  background:s.statut==="traite"?C.greenL:"#FEF3C7",
                  color:s.statut==="traite"?C.greenD:C.amber}}>
                  {s.statut==="traite"?"✅ Traité":"🔴 Ouvert"}
                </span>
              </div>
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.5,marginBottom:6,fontStyle:"italic"}}>
              "{s.commentaire}"
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
              <div style={{fontSize:11,color:C.tx3}}>
                Par <strong>{s.auteur}</strong> ({s.profil}) · {dateS}
                {s.gps&&<span> · 📍 {s.gps.lat.toFixed(4)}, {s.gps.lng.toFixed(4)}</span>}
                {s.photos>0&&<span> · 📷 {s.photos} photo(s)</span>}
              </div>
              {s.statut==="ouvert"&&(
                <button onClick={()=>marquerTraite(s.id)} style={{
                  padding:"5px 12px",borderRadius:8,border:`1px solid ${C.green}`,
                  background:C.greenL,color:C.greenD,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  ✅ Marquer traité
                </button>
              )}
              {s.statut==="traite"&&s.traitePar&&(
                <div style={{fontSize:11,color:C.tx3}}>Traité par {s.traitePar} · {s.dateTraitement}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── DFCI — Données complémentaires ──────────────────────────────
const PRATICABILITE_OPTS = [
  {id:"praticable",  label:"Praticable",            icon:"🟢", col:"#065F46", bg:"#D1FAE5"},
  {id:"conditions",  label:"Praticable sous conditions",icon:"🟡",col:"#92400E",bg:"#FEF3C7"},
  {id:"degradee",    label:"Dégradée",              icon:"🟠", col:"#C2410C", bg:"#FFEDD5"},
  {id:"impraticable",label:"Impraticable",          icon:"🔴", col:"#991B1B", bg:"#FEE2E2"},
  {id:"a_verifier",  label:"À vérifier",            icon:"⬜", col:"#475569", bg:"#F1F5F9"},
  {id:"priorite_incendie",label:"Priorité incendie",icon:"🚨", col:"#7F1D1D", bg:"#FEE2E2"},
];
const OBSTACLES_TYPES = [
  "Ornières profondes","Ravinement","Arbres tombés","Végétation envahissante",
  "Pont / buse dégradé","Largeur insuffisante","Fossé bouché","Affaissement de chaussée","Glissement de terrain",
];
const DEMO_DIAGNOSTICS = [
  {id:"d1",tronconId:"TRC-001-demo",date:"2026-07-15",praticabilite:"praticable",
   obstacles:[],commentaire:"RAS — entretien fossés réalisé en juin.",
   photos:2,validePar:"J. Dupont",dernierPassage:"2026-07-15"},
  {id:"d2",tronconId:"TRC-003-demo",date:"2026-07-20",praticabilite:"degradee",
   obstacles:["Ornières profondes","Végétation envahissante"],
   commentaire:"Ornières sur 80 m en sortie de coude. Passage tracteur limité.",
   photos:3,validePar:"M. Laurent",dernierPassage:"2026-07-20"},
];
const DEMO_POINTS_DFCI = [
  {id:"dfci1",type:"citerne",nom:"Citerne DFCI — Battets",tronconId:"TRC-001-demo",
   capacite:"60 m³",gps:{lat:46.511,lng:2.892},acces:"Accès direct piste TRC-001",
   etat:"ok",dernierControle:"2026-05-10",responsable:"ONF Allier"},
  {id:"dfci2",type:"point_eau",nom:"Mare du Bois Rond",tronconId:"TRC-003-demo",
   capacite:"Naturel",gps:{lat:46.498,lng:2.889},acces:"150 m depuis TRC-003",
   etat:"a_verifier",dernierControle:"2025-10-15",responsable:"Commune"},
  {id:"dfci3",type:"retournement",nom:"Aire de retournement Nord",tronconId:"TRC-001-demo",
   capacite:"Camion 10 t",gps:{lat:46.513,lng:2.890},acces:"Fin de TRC-001",
   etat:"ok",dernierControle:"2026-07-15",responsable:"Commune de Tronçais"},
];
const DFCI_TYPE_INFO = {
  citerne:      {icon:"🚒",label:"Citerne DFCI",   col:"#991B1B",bg:"#FEE2E2"},
  point_eau:    {icon:"💧",label:"Point d'eau",     col:"#1E3A5F",bg:"#DBEAFE"},
  retournement: {icon:"🔄",label:"Retournement",    col:"#065F46",bg:"#D1FAE5"},
  croix:        {icon:"📍",label:"Balisage / croix",col:"#7C3AED",bg:"#EDE9FE"},
};

// Calcul priorité de rénovation (score 1-10)
const calcPriorite = (t, diag) => {
  let score = 0;
  if (t.accesIncendie?.toLowerCase().includes("non"))    score += 4;
  if (t.accesIncendie?.toLowerCase().includes("améliorer")) score += 2;
  if (diag?.praticabilite === "impraticable")             score += 3;
  if (diag?.praticabilite === "degradee")                 score += 2;
  if (!t.retournement)                                    score += 1;
  if (t.largeur < 3.5)                                    score += 1;
  if (t.tonnageMobilisable > 200)                         score += 1;
  if (diag?.obstacles?.length > 1)                        score += 1;
  return Math.min(score, 10);
};

// ── PERMIS QUOTIDIEN DE CHANTIER — INCENDIE FORÊT ───────────────
// NIVEAUX_RESTRICTION importé depuis sections-terrain-op.constants.js

// ── APPLITAG SCIERIE — MVP ───────────────────────────────────────

const SCIERIE_KEY_GRUMES    = "applitag_scierie_grumes";
const SCIERIE_KEY_COPRODUITS= "applitag_scierie_coproduits";
const SCIERIE_KEY_ENLEV     = "applitag_scierie_enlev";
const LOTS_SECONDAIRES_KEY  = "applitag_lots_secondaires";
const scierieGet = (key) => { try { return JSON.parse(localStorage.getItem(key)||"[]"); } catch { return []; } };
export const lotsSecGet = () => { try { return JSON.parse(localStorage.getItem(LOTS_SECONDAIRES_KEY)||"[]"); } catch { return []; } };
const lotsSecSet = (arr) => { try { localStorage.setItem(LOTS_SECONDAIRES_KEY,JSON.stringify(arr)); } catch { /* noop */ } };
const scierieSet = (key,arr) => { try { localStorage.setItem(key,JSON.stringify(arr)); } catch { /* noop */ } };

const ESSENCES_GRUMES = ["Chêne","Hêtre","Douglas","Pin sylvestre","Épicéa","Sapin","Frêne","Peuplier","Châtaignier","Autres"];
const QUALITES_GRUME  = ["A (grume d'œuvre)","B (bois d'industrie)","C (bois énergie)","Déclassé"];
const TYPES_COPRODUIT = [
  {id:"sciure",    label:"Sciure",           icon:"🟡", unite:"t"},
  {id:"ecorce",    label:"Écorces",          icon:"🟤", unite:"t"},
  {id:"plaquette", label:"Plaquettes",       icon:"🟢", unite:"t"},
  {id:"dosses",    label:"Dosses / chutes",  icon:"🪵", unite:"stères"},
  {id:"connexe_be",label:"Bois énergie tronc",icon:"🔥",unite:"t"},
];
const DESTINATIONS_COPRODUIT = ["Chaufferie","Particulier","Agriculteur","Pépiniériste","Plateforme bois énergie","Compostage","Interne / non valorisé"];

const DEMO_GRUMES = [
  {id:"g1",date:"2026-07-28",fournisseur:"Forêt Bernard",essence:"Chêne",qualite:"A (grume d'œuvre)",volume:18.5,prix:95,origine:"Tronçais (03)",ref:"GR-2026-001-demo"},
  {id:"g2",date:"2026-07-30",fournisseur:"CUMA Bois Est",essence:"Douglas",qualite:"A (grume d'œuvre)",volume:32.0,prix:68,origine:"Vosges (88)",ref:"GR-2026-002-demo"},
  {id:"g3",date:"2026-08-01",fournisseur:"Prop. Martin",essence:"Hêtre",qualite:"B (bois d'industrie)",volume:11.2,prix:55,origine:"Haute-Marne (52)",ref:"GR-2026-003-demo"},
];
const DEMO_COPRODUITS = [
  {id:"cp1",grumeRef:"GR-2026-001-demo",type:"sciure",qte:2.8,humidite:18,destination:"Chaufferie",prix:0,statut:"disponible"},
  {id:"cp2",grumeRef:"GR-2026-001-demo",type:"ecorce",qte:1.4,humidite:42,destination:"Compostage",prix:0,statut:"disponible"},
  {id:"cp3",grumeRef:"GR-2026-002-demo",type:"plaquette",qte:6.5,humidite:25,destination:"Chaufferie",prix:28,statut:"vendu"},
  {id:"cp4",grumeRef:"GR-2026-002-demo",type:"dosses",qte:4.2,humidite:20,destination:"Particulier",prix:15,statut:"disponible"},
];
const DEMO_ENLEVEMENTS = [
  {id:"e1",date:"2026-08-02",client:"Chaufferie Communale Épinal",coproduitType:"plaquette",qte:6.5,prix:28,transporteur:"Camion Rossi",statut:"livré"},
];

export const SectionScierie = () => {
  const [tab,      setTab]    = useState("grumes");
  const [grumes,   setGrumes] = useState(() => { const d=scierieGet(SCIERIE_KEY_GRUMES); return d.length?d:[...DEMO_GRUMES]; });
  const [coprods,  setCoprods]= useState(() => { const d=scierieGet(SCIERIE_KEY_COPRODUITS); return d.length?d:[...DEMO_COPRODUITS]; });
  const [enlevs,   setEnlevs] = useState(() => { const d=scierieGet(SCIERIE_KEY_ENLEV); return d.length?d:[...DEMO_ENLEVEMENTS]; });

  // ── Formulaire grume
  const [gDate,setGDate]       = useState(todayS());
  const [gFourn,setGFourn]     = useState("");
  const [gEss,setGEss]         = useState("Chêne");
  const [gQual,setGQual]       = useState("A (grume d'œuvre)");
  const [gVol,setGVol]         = useState("");
  const [gPrix,setGPrix]       = useState("");
  const [gOrig,setGOrig]       = useState("");
  const [gSaved,setGSaved]     = useState(false);

  // ── Formulaire coproduit
  const [cpGrume,setCpGrume]   = useState("");
  const [cpType,setCpType]     = useState("sciure");
  const [cpQte,setCpQte]       = useState("");
  const [cpHum,setCpHum]       = useState("");
  const [cpDest,setCpDest]     = useState("Chaufferie");
  const [cpPrix,setCpPrix]     = useState("");
  const [cpSaved,setCpSaved]   = useState(false);

  // ── Formulaire enlèvement
  const [eDate,setEDate]       = useState(todayS());
  const [eClient,setEClient]   = useState("");
  const [eCp,setECp]           = useState("");
  const [eQte,setEQte]         = useState("");
  const [ePrix,setEPrix]       = useState("");
  const [eTrans,setETrans]     = useState("");
  const [eSaved,setESaved]     = useState(false);

  const addGrume = () => {
    if (!gFourn || !gVol) return;
    const g = {id:uid(),date:gDate,fournisseur:gFourn,essence:gEss,qualite:gQual,
      volume:parseFloat(gVol),prix:parseFloat(gPrix)||0,origine:gOrig,
      ref:`GR-${gDate.replace(/-/g,"").slice(2)}-${String(grumes.length+1).padStart(3,"0")}`};
    const upd=[g,...grumes]; setGrumes(upd); scierieSet(SCIERIE_KEY_GRUMES,upd);
    setGFourn(""); setGVol(""); setGPrix(""); setGOrig("");
    setGSaved(true); setTimeout(()=>setGSaved(false),2500);
  };

  const addCoproduit = () => {
    if (!cpQte || !cpGrume) return;
    const cp = {id:uid(),grumeRef:cpGrume,type:cpType,qte:parseFloat(cpQte),
      humidite:parseFloat(cpHum)||0,destination:cpDest,prix:parseFloat(cpPrix)||0,statut:"disponible"};
    const upd=[cp,...coprods]; setCoprods(upd); scierieSet(SCIERIE_KEY_COPRODUITS,upd);
    setCpQte(""); setCpHum(""); setCpPrix(""); setCpGrume("");
    setCpSaved(true); setTimeout(()=>setCpSaved(false),2500);
  };

  const addEnlevement = () => {
    if (!eClient || !eQte) return;
    const cpSel = TYPES_COPRODUIT.find(t=>t.id===eCp)||TYPES_COPRODUIT[0];
    const annee = eDate.slice(0,4);
    const existants = lotsSecGet();
    const seq = String(existants.length+1).padStart(3,"0");
    const lotNum = `LOT-SC-${annee}-${seq}`;
    // LOT secondaire traçable
    const lotSec = {
      id: uid(), lotNumero: lotNum, type: "coproduit_scierie",
      createdAt: new Date().toISOString(), date: eDate,
      origine: "Scierie", coproduitType: eCp, coproduitLabel: cpSel.label,
      tonnage: parseFloat(eQte), prixTonne: parseFloat(ePrix)||0,
      destination: eClient, transporteur: eTrans,
      statut: "EN_LIVRAISON", source: "scierie",
    };
    lotsSecSet([lotSec,...existants]);
    const e = {id:uid(),date:eDate,client:eClient,coproduitType:eCp,
      coproduitLabel:cpSel.label,qte:parseFloat(eQte),prix:parseFloat(ePrix)||0,
      transporteur:eTrans,statut:"planifié", lotSecondaire: lotNum};
    const upd=[e,...enlevs]; setEnlevs(upd); scierieSet(SCIERIE_KEY_ENLEV,upd);
    setEClient(""); setEQte(""); setEPrix(""); setETrans("");
    setESaved(true); setTimeout(()=>setESaved(false),2500);
  };

  // ── Calculs marges
  const revenuGrumes   = grumes.reduce((s,g)=>s+g.volume*g.prix,0);
  const revenuCoprods  = coprods.filter(c=>c.statut==="vendu").reduce((s,c)=>s+c.qte*c.prix,0);
  const revenuEnlevs   = enlevs.reduce((s,e)=>s+e.qte*e.prix,0);
  const stockDispo     = coprods.filter(c=>c.statut==="disponible");
  const totalVolGrumes = grumes.reduce((s,g)=>s+g.volume,0);

  const Fld = ({label,children}) => (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
      {children}
    </div>
  );
  const inp = {height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
    padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box",width:"100%"};
  const Stat = ({icon,label,val,color}) => (
    <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",flex:1,minWidth:120}}>
      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:20,fontWeight:800,color:color||C.tx,fontVariantNumeric:"tabular-nums"}}>{val}</div>
      <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{label}</div>
    </div>
  );
  const Badge = ({s}) => {
    const map={disponible:{bg:C.greenL,c:C.greenD},vendu:{bg:C.blueL,c:C.blue},livré:{bg:C.greenL,c:C.greenD},planifié:{bg:C.amberL,c:C.amber}};
    const st=map[s]||{bg:C.bg,c:C.tx3};
    return <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:st.bg,color:st.c}}>{s}</span>;
  };

  const TABS=[
    {id:"grumes",    icon:"🪵", label:"Grumes"},
    {id:"coproduits",icon:"♻️", label:"Coproduits"},
    {id:"stocks",    icon:"📦", label:"Stocks"},
    {id:"enlevements",icon:"🚛",label:"Enlèvements"},
    {id:"marges",    icon:"📈", label:"Marges"},
  ];

  return (
    <div style={{padding:PADDING,maxWidth:680,margin:"0 auto"}}>

      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,#1E3A5F 0%,#2D6A4F 100%)`,
        borderRadius:14,padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🏭</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>APPLITAG Scierie</div>
        <div style={{fontSize:13,opacity:.8}}>Réception grumes · Coproduits · Stocks · Enlèvements · Marges</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          {[`🪵 ${grumes.length} grumes`,`♻️ ${coprods.length} coproduits`,`🚛 ${enlevs.length} enlèvements`].map(t=>(
            <span key={t} style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>{t}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:"flex",alignItems:"center",gap:5,padding:"8px 14px",
            borderRadius:10,border:`1.5px solid ${tab===t.id?"#1E3A5F":C.bd}`,
            background:tab===t.id?"#1E3A5F":"#fff",
            color:tab===t.id?"#fff":C.tx2,fontWeight:tab===t.id?700:400,
            fontSize:13,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0
          }}><span>{t.icon}</span>{t.label}</button>
        ))}
      </div>

      {/* ── Onglet GRUMES ── */}
      {tab==="grumes" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Réception des grumes</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Date réception"><input type="date" value={gDate} onChange={e=>setGDate(e.target.value)} style={inp}/></Fld>
              <Fld label="Fournisseur"><input value={gFourn} onChange={e=>setGFourn(e.target.value)} placeholder="Nom propriétaire / ETF" style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Essence">
                <select value={gEss} onChange={e=>setGEss(e.target.value)} style={{...inp,background:"#fff"}}>
                  {ESSENCES_GRUMES.map(e=><option key={e}>{e}</option>)}
                </select>
              </Fld>
              <Fld label="Qualité">
                <select value={gQual} onChange={e=>setGQual(e.target.value)} style={{...inp,background:"#fff"}}>
                  {QUALITES_GRUME.map(q=><option key={q}>{q}</option>)}
                </select>
              </Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Fld label="Volume (m³)"><input type="number" value={gVol} onChange={e=>setGVol(e.target.value)} placeholder="0.0" style={inp}/></Fld>
              <Fld label="Prix (€/m³)"><input type="number" value={gPrix} onChange={e=>setGPrix(e.target.value)} placeholder="0" style={inp}/></Fld>
              <Fld label="Origine"><input value={gOrig} onChange={e=>setGOrig(e.target.value)} placeholder="Massif / dép." style={inp}/></Fld>
            </div>
            <button onClick={addGrume} disabled={!gFourn||!gVol} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!gFourn||!gVol)?"#ccc":"#1E3A5F",color:"#fff",fontWeight:700,fontSize:15,cursor:(!gFourn||!gVol)?"not-allowed":"pointer"
            }}>+ Enregistrer la réception</button>
            {gSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.greenL,color:C.greenD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Réception enregistrée</div>}
          </div>

          {grumes.map(g=>(
            <div key={g.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{g.ref}</div>
                  <div style={{fontSize:13,color:C.tx2,marginTop:2}}>{g.fournisseur} · {g.essence} · {g.qualite}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{g.date} {g.origine&&`· ${g.origine}`}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,fontSize:16,color:C.greenD}}>{g.volume} m³</div>
                  {g.prix>0&&<div style={{fontSize:12,color:C.tx3}}>{(g.volume*g.prix).toLocaleString("fr-FR")} €</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onglet COPRODUITS ── */}
      {tab==="coproduits" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Génération des coproduits</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <Fld label="Grume d'origine">
              <select value={cpGrume} onChange={e=>setCpGrume(e.target.value)} style={{...inp,background:"#fff"}}>
                <option value="">— Sélectionner —</option>
                {grumes.map(g=><option key={g.id} value={g.ref}>{g.ref} — {g.fournisseur} ({g.essence})</option>)}
              </select>
            </Fld>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Type de coproduit">
                <select value={cpType} onChange={e=>setCpType(e.target.value)} style={{...inp,background:"#fff"}}>
                  {TYPES_COPRODUIT.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </Fld>
              <Fld label="Destination">
                <select value={cpDest} onChange={e=>setCpDest(e.target.value)} style={{...inp,background:"#fff"}}>
                  {DESTINATIONS_COPRODUIT.map(d=><option key={d}>{d}</option>)}
                </select>
              </Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Fld label={`Qté (${TYPES_COPRODUIT.find(t=>t.id===cpType)?.unite||"t"})`}>
                <input type="number" value={cpQte} onChange={e=>setCpQte(e.target.value)} placeholder="0.0" style={inp}/>
              </Fld>
              <Fld label="Humidité (%)">
                <input type="number" value={cpHum} onChange={e=>setCpHum(e.target.value)} placeholder="%" style={inp}/>
              </Fld>
              <Fld label="Prix (€/t)">
                <input type="number" value={cpPrix} onChange={e=>setCpPrix(e.target.value)} placeholder="0" style={inp}/>
              </Fld>
            </div>
            <button onClick={addCoproduit} disabled={!cpGrume||!cpQte} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!cpGrume||!cpQte)?"#ccc":"#2D6A4F",color:"#fff",fontWeight:700,fontSize:15,cursor:(!cpGrume||!cpQte)?"not-allowed":"pointer"
            }}>+ Enregistrer le coproduit</button>
            {cpSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.greenL,color:C.greenD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Coproduit enregistré</div>}
          </div>

          {coprods.map(c=>{
            const t=TYPES_COPRODUIT.find(x=>x.id===c.type)||TYPES_COPRODUIT[0];
            return (
              <div key={c.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>Grume {c.grumeRef} · {c.destination} {c.humidite>0?`· H ${c.humidite}%`:""}</div>
                </div>
                <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.tx}}>{c.qte} {t.unite}</div>
                  {c.prix>0&&<div style={{fontSize:12,color:C.green}}>{c.prix} €/{t.unite}</div>}
                  <Badge s={c.statut}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Onglet STOCKS ── */}
      {tab==="stocks" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Stocks disponibles par catégorie</h3>
          {TYPES_COPRODUIT.map(t=>{
            const items = coprods.filter(c=>c.type===t.id&&c.statut==="disponible");
            const total = items.reduce((s,c)=>s+c.qte,0);
            const revPotentiel = items.reduce((s,c)=>s+(c.prix*c.qte),0);
            if (items.length===0) return null;
            return (
              <div key={t.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:15,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{fontWeight:800,fontSize:18,color:C.greenD}}>{total.toFixed(1)} {t.unite}</div>
                </div>
                {revPotentiel>0&&<div style={{fontSize:12,color:C.tx3,marginBottom:8}}>Revenu potentiel : <strong style={{color:C.green}}>{revPotentiel.toLocaleString("fr-FR")} €</strong></div>}
                {items.map(c=>(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:`1px solid ${C.bd}`,fontSize:13}}>
                    <span style={{color:C.tx2}}>Grume {c.grumeRef} · {c.destination}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{c.qte} {t.unite} {c.humidite>0?`· H${c.humidite}%`:""}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {stockDispo.length===0&&(
            <div style={{textAlign:"center",padding:40,color:C.tx3}}>Aucun stock disponible</div>
          )}
        </div>
      )}

      {/* ── Onglet ENLÈVEMENTS ── */}
      {tab==="enlevements" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Enlèvements clients</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Date"><input type="date" value={eDate} onChange={e=>setEDate(e.target.value)} style={inp}/></Fld>
              <Fld label="Client"><input value={eClient} onChange={e=>setEClient(e.target.value)} placeholder="Chaufferie, particulier..." style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Coproduit">
                <select value={eCp} onChange={e=>setECp(e.target.value)} style={{...inp,background:"#fff"}}>
                  {TYPES_COPRODUIT.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </Fld>
              <Fld label="Transporteur"><input value={eTrans} onChange={e=>setETrans(e.target.value)} placeholder="Nom transporteur" style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label={`Quantité (${TYPES_COPRODUIT.find(t=>t.id===eCp)?.unite||"t"})`}>
                <input type="number" value={eQte} onChange={e=>setEQte(e.target.value)} placeholder="0.0" style={inp}/>
              </Fld>
              <Fld label="Prix facturé (€/t)">
                <input type="number" value={ePrix} onChange={e=>setEPrix(e.target.value)} placeholder="0" style={inp}/>
              </Fld>
            </div>
            <button onClick={addEnlevement} disabled={!eClient||!eQte} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!eClient||!eQte)?"#ccc":"#B45309",color:"#fff",fontWeight:700,fontSize:15,cursor:(!eClient||!eQte)?"not-allowed":"pointer"
            }}>+ Enregistrer l'enlèvement</button>
            {eSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.amberL,color:C.amberD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Enlèvement planifié</div>}
          </div>

          {enlevs.map(e=>{
            const t=TYPES_COPRODUIT.find(x=>x.id===e.coproduitType)||TYPES_COPRODUIT[0];
            return (
              <div key={e.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{e.client}</div>
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{e.date} · {t.icon} {t.label} {e.transporteur&&`· ${e.transporteur}`}</div>
                    {e.lotSecondaire&&(
                      <div style={{marginTop:4,display:"inline-flex",alignItems:"center",gap:4,
                        background:"#D1FAE5",borderRadius:6,padding:"2px 8px",fontSize:11,
                        fontWeight:700,color:"#065F46"}}>
                        🌲 {e.lotSecondaire}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <div style={{fontWeight:800,fontSize:15,color:C.tx}}>{e.qte} {t.unite}</div>
                    {e.prix>0&&<div style={{fontSize:12,color:C.green}}>{(e.qte*e.prix).toLocaleString("fr-FR")} €</div>}
                    <Badge s={e.statut}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Onglet MARGES ── */}
      {tab==="marges" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Marges & indicateurs</h3>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            <Stat icon="🪵" label="Volume grumes reçu" val={`${totalVolGrumes.toFixed(1)} m³`} color={C.tx}/>
            <Stat icon="♻️" label="Coproduits générés" val={`${coprods.length}`} color={C.greenD}/>
            <Stat icon="📦" label="Lots dispo en stock" val={`${stockDispo.length}`} color={C.blue}/>
            <Stat icon="🚛" label="Enlèvements réalisés" val={`${enlevs.length}`} color={C.amber}/>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            <Stat icon="💶" label="Revenu grumes estimé" val={`${revenuGrumes.toLocaleString("fr-FR")} €`} color={C.greenD}/>
            <Stat icon="💰" label="Revenu coproduits vendus" val={`${revenuCoprods.toLocaleString("fr-FR")} €`} color={C.green}/>
            <Stat icon="📤" label="CA enlèvements" val={`${revenuEnlevs.toLocaleString("fr-FR")} €`} color={C.amber}/>
          </div>

          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>📊 Revenu par type de coproduit</div>
            {TYPES_COPRODUIT.map(t=>{
              const vendus=coprods.filter(c=>c.type===t.id&&c.statut==="vendu");
              const rev=vendus.reduce((s,c)=>s+c.qte*c.prix,0);
              const vol=coprods.filter(c=>c.type===t.id).reduce((s,c)=>s+c.qte,0);
              if(vol===0) return null;
              return (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:13,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <span style={{fontSize:12,color:C.tx3}}>{vol.toFixed(1)} {t.unite} produit</span>
                    <span style={{fontSize:13,fontWeight:700,color:rev>0?C.green:C.tx3}}>{rev>0?`${rev.toLocaleString("fr-FR")} €`:"—"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{background:C.greenL,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>💡 Leviers d'amélioration</div>
            <div style={{fontSize:13,color:C.greenD,lineHeight:1.6}}>
              {stockDispo.filter(c=>c.prix===0).length>0&&<div>⚠️ {stockDispo.filter(c=>c.prix===0).length} lot(s) en stock sans prix de vente défini</div>}
              {stockDispo.filter(c=>c.destination==="Interne / non valorisé").length>0&&<div>⚠️ {stockDispo.filter(c=>c.destination==="Interne / non valorisé").length} lot(s) non valorisé(s) — débouché à trouver</div>}
              {stockDispo.filter(c=>c.humidite>30).length>0&&<div>⚠️ {stockDispo.filter(c=>c.humidite>30).length} lot(s) avec humidité {">"} 30 % — valorisation réduite</div>}
              {stockDispo.length===0&&<div>✅ Tous les coproduits ont été valorisés ou enlèvements planifiés</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

