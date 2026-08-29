// @ts-nocheck
// ============================================================
// APPLITAG — Fin de chantier + Rentabilité
// Broyage rémanents · Réhabilitation · Indice qualité · Marge
// JSDoc TypeScript-style · Mobile + Desktop · Tests core
// ============================================================

import { useState, useCallback, useMemo } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────
/**
 * @typedef {'remenants_forestiers'|'accotements'|'souches'|'vegetation_invasive'|
 *           'entretien_depot'|'remise_etat_plateforme'} TypeBroyage
 * @typedef {'tracteur_broyeur'|'broyeur_chenilles'|'gyrobroyeur'|'broyeur_faucille'} TypeMachine
 * @typedef {'ok'|'reserve'|'non_fait'} QualiteCheck
 * @typedef {Object} PhotoTerrain
 * @property {string} id
 * @property {'avant'|'apres'} phase
 * @property {string} label
 * @property {string} emoji
 * @property {string} capturedAt
 */

/**
 * @typedef {Object} FinChantier
 * @property {string} lotId
 * // Broyage
 * @property {number} surfaceRenoveeHa
 * @property {TypeBroyage[]} typesBroyage
 * @property {TypeMachine} typeMachine
 * @property {number} tempsMachineH
 * @property {number} nbPassages
 * @property {string} dateFinTravaux
 * // Consommations
 * @property {number} csoGnrL
 * @property {number} coutCarburantEur
 * @property {number} coutMachineEur
 * @property {number} coutOperateurEur
 * // Photos
 * @property {PhotoTerrain[]} photos
 * // Qualité
 * @property {Record<string,boolean>} qualiteChecks
 * // Validation
 * @property {string} validationNom
 * @property {string} validationDate
 * @property {boolean} validationSigne
 * @property {string} validationCommentaire
 * @property {boolean} reservesEmises
 * // Note
 * @property {number} noteEtoiles  1-5
 */

/**
 * @typedef {Object} CoutChantier
 * @property {number} achatBoisEur
 * @property {number} etfAbattageEur
 * @property {number} etfDebardageEur
 * @property {number} broyageEur
 * @property {number} transportEur
 * @property {number} carburantEur
 * @property {number} diversEur
 */

/**
 * @typedef {Object} RentabiliteChantier
 * @property {string} lotId
 * @property {CoutChantier} couts
 * @property {number} volumeEstimeT
 * @property {number} volumeLivreT
 * @property {number} prixVenteEurT
 * @property {number} humiditeAvg
 * @property {number} indiceApplitag
 * @property {boolean} validationProprio
 */

// ── TOKENS ─────────────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75", greenL:"#E1F5EE", greenD:"#085041",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  blue:"#185FA5",  blueL:"#E6F1FB",  blueD:"#042C53",
  amber:"#BA7517", amberL:"#FAEEDA", amberD:"#412402",
  red:"#A32D2D",   redL:"#FCEBEB",
  coral:"#D85A30", coralL:"#FAECE7", coralD:"#4A1B0C",
  bg:"#F5F4F1", bg2:"#ECEAE6",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
};

// ── MOCK DATA ──────────────────────────────────────────────────────────────────
const LOT = {
  id:"l1", numero:"LOT-2025-007", commune:"Charny (89)",
  essence:"Peuplier", surface:"12.5", proprietaire:"M. Vasseur Alain",
  etf:"ETF Duclos Forêts", volumeEstime:350, volumeReel:238,
  humidite:38, statut:"LIVRE", certification:"PEFC",
};

/** @returns {FinChantier} */
const initFinChantier = () => ({
  lotId:"l1",
  surfaceRenoveeHa:12.5,
  typesBroyage:["remenants_forestiers"],
  typeMachine:"broyeur_chenilles",
  tempsMachineH:6,
  nbPassages:2,
  dateFinTravaux:new Date().toISOString().slice(0,10),
  csoGnrL:180,
  coutCarburantEur:270,
  coutMachineEur:840,
  coutOperateurEur:360,
  photos:[
    {id:"p1",phase:"avant",label:"Parcelle avant intervention",emoji:"🌳",capturedAt:"2025-06-09T08:00:00Z"},
    {id:"p2",phase:"avant",label:"Accès chantier",emoji:"🛤️",capturedAt:"2025-06-09T08:05:00Z"},
    {id:"p3",phase:"apres",label:"Vue générale après",emoji:"🌿",capturedAt:"2025-06-10T16:30:00Z"},
    {id:"p4",phase:"apres",label:"Place de dépôt remise en état",emoji:"✅",capturedAt:"2025-06-10T16:35:00Z"},
  ],
  qualiteChecks:{
    depot_nettoye:true, remanents_traites:true, acces_retablis:true,
    fosses_preserves:true, aucun_dechet:false, respect_consignes:true,
  },
  validationNom:"M. Vasseur Alain",
  validationDate:new Date().toISOString().slice(0,10),
  validationSigne:false,
  validationCommentaire:"",
  reservesEmises:false,
  noteEtoiles:4,
});

/** @returns {RentabiliteChantier} */
const initRentabilite = () => ({
  lotId:"l1",
  couts:{
    achatBoisEur:8400,
    etfAbattageEur:3200,
    etfDebardageEur:2100,
    broyageEur:1470,
    transportEur:1800,
    carburantEur:630,
    diversEur:350,
  },
  volumeEstimeT:350,
  volumeLivreT:238,
  prixVenteEurT:65,
  humiditeAvg:38,
  indiceApplitag:0, // calculated
  validationProprio:false,
});

// ── CALCULS INDICE APPLITAG ────────────────────────────────────────────────────
/**
 * @param {FinChantier} fc
 * @returns {number} score 0-100
 */
const calcIndiceApplitag = (fc) => {
  let score = 0;
  // Conformité documentaire (25 pts)
  const docs = [fc.validationSigne, fc.photos.filter(p=>p.phase==="avant").length>=2, fc.photos.filter(p=>p.phase==="apres").length>=2, fc.dateFinTravaux].filter(Boolean).length;
  score += Math.round((docs/4)*25);
  // Qualité photos (20 pts)
  const photos = fc.photos.length;
  score += Math.min(20, Math.round(photos/6*20));
  // Qualité terrain (25 pts)
  const checks = Object.values(fc.qualiteChecks).filter(Boolean).length;
  const totalChecks = Object.keys(fc.qualiteChecks).length;
  score += Math.round((checks/totalChecks)*25);
  // Note propriétaire (20 pts)
  score += Math.round((fc.noteEtoiles/5)*20);
  // Validation proprio (10 pts)
  if (fc.validationSigne) score += 10;
  return Math.min(100, score);
};

/**
 * @param {RentabiliteChantier} r
 * @returns {{ totalCoutsEur:number, caEur:number, margeEur:number, coutTonne:number, margePct:number, scoreEco:number }}
 */
const calcRentabilite = (r) => {
  const totalCoutsEur = Object.values(r.couts).reduce((s,v)=>s+(v||0), 0);
  const caEur = (r.volumeLivreT || 0) * (r.prixVenteEurT || 0);
  const margeEur = caEur - totalCoutsEur;
  const coutTonne = r.volumeLivreT > 0 ? totalCoutsEur / r.volumeLivreT : 0;
  const margePct = caEur > 0 ? (margeEur / caEur) * 100 : 0;
  const ecartVolume = r.volumeEstimeT > 0 ? ((r.volumeLivreT - r.volumeEstimeT) / r.volumeEstimeT) * 100 : 0;
  // Score économique /100
  let scoreEco = 0;
  if (margePct >= 25) scoreEco += 40;
  else if (margePct >= 15) scoreEco += 25;
  else if (margePct >= 5) scoreEco += 10;
  if (Math.abs(ecartVolume) <= 10) scoreEco += 20;
  else if (Math.abs(ecartVolume) <= 20) scoreEco += 10;
  if (r.humiditeAvg <= 35) scoreEco += 20;
  else if (r.humiditeAvg <= 40) scoreEco += 10;
  if (r.validationProprio) scoreEco += 20;
  return { totalCoutsEur, caEur, margeEur, coutTonne, margePct, ecartVolume, scoreEco };
};

// ── UNIT TESTS ──────────────────────────────────────────────────────────────────
const UNIT_TESTS = [
  {name:"Indice: 5 étoiles + tout coché → score ≥ 90",fn:()=>{
    const fc = initFinChantier();
    fc.noteEtoiles=5; fc.validationSigne=true;
    Object.keys(fc.qualiteChecks).forEach(k=>{fc.qualiteChecks[k]=true;});
    fc.photos=[...Array(6)].map((_,i)=>({id:String(i),phase:i<3?"avant":"apres",label:"test",emoji:"📷",capturedAt:new Date().toISOString()}));
    return calcIndiceApplitag(fc)>=90;
  }},
  {name:"Indice: aucun check → score < 30",fn:()=>{
    const fc = initFinChantier();
    fc.noteEtoiles=1; fc.validationSigne=false; fc.photos=[];
    Object.keys(fc.qualiteChecks).forEach(k=>{fc.qualiteChecks[k]=false;});
    return calcIndiceApplitag(fc)<30;
  }},
  {name:"Rentabilité: CA calculé = volumeLivré × prixVente",fn:()=>{
    const r = initRentabilite(); r.volumeLivreT=200; r.prixVenteEurT=70;
    const {caEur}=calcRentabilite(r);
    return caEur===14000;
  }},
  {name:"Rentabilité: marge = CA - couts",fn:()=>{
    const r = initRentabilite();
    const {caEur,totalCoutsEur,margeEur}=calcRentabilite(r);
    return margeEur===caEur-totalCoutsEur;
  }},
  {name:"Rentabilité: coutTonne = totalCouts / volumeLivré",fn:()=>{
    const r = initRentabilite(); r.volumeLivreT=100;
    const {totalCoutsEur,coutTonne}=calcRentabilite(r);
    return Math.abs(coutTonne-(totalCoutsEur/100))<0.01;
  }},
  {name:"CoutTotal: somme de 7 postes",fn:()=>{
    const r = initRentabilite();
    const {totalCoutsEur}=calcRentabilite(r);
    return totalCoutsEur===Object.values(r.couts).reduce((s,v)=>s+v,0);
  }},
  {name:"Couts total broyage rémanents = coutMachine + coutOp + coutCarburant",fn:()=>{
    const fc = initFinChantier();
    const total = fc.coutMachineEur+fc.coutOperateurEur+fc.coutCarburantEur;
    return total===1470;
  }},
];
const TEST_RESULTS = UNIT_TESTS.map(t=>{
  try{return{name:t.name,pass:t.fn()===true};}
  catch(e){return{name:t.name,pass:false,err:e.message};}
});
const TESTS_PASS = TEST_RESULTS.filter(r=>r.pass).length;
console.log(`[APPLITAG Tests] ${TESTS_PASS}/${UNIT_TESTS.length} passed`);

// ── ATOMS ──────────────────────────────────────────────────────────────────────
const Badge = ({bg,color,children,style={}}) => (
  <span style={{display:"inline-block",padding:"2px 8px",borderRadius:9,
    fontSize:10,fontWeight:600,background:bg,color,whiteSpace:"nowrap",...style}}>
    {children}
  </span>
);

const Btn = ({onClick,bg=T.bg2,color=T.tx,children,disabled,sm,style={}}) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding:sm?"5px 10px":"9px 14px",borderRadius:9,fontSize:sm?11:12,fontWeight:500,
    display:"inline-flex",alignItems:"center",gap:6,cursor:disabled?"not-allowed":"pointer",
    border:"none",fontFamily:"inherit",background:disabled?T.bg2:bg,
    color:disabled?T.tx3:color,opacity:disabled?.6:1,transition:"all .12s",
    whiteSpace:"nowrap",...style,
  }}>{children}</button>
);
const PBtn = ({onClick,children,disabled,style={}}) => (
  <Btn onClick={onClick} bg={T.green} color="#fff" disabled={disabled} style={style}>{children}</Btn>
);

const SCard = ({title,icon,extra,children,accent}) => (
  <div style={{background:"#fff",border:`1px solid ${accent?accent:T.bd}`,borderRadius:12,
    overflow:"hidden",marginBottom:10}}>
    <div style={{padding:"9px 14px",borderBottom:`1px solid ${T.bd}`,background:T.bg,
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:11,fontWeight:700,color:T.tx2,textTransform:"uppercase",
        letterSpacing:".05em",display:"flex",alignItems:"center",gap:7}}>
        {icon&&<span style={{fontSize:14}}>{icon}</span>}
        {title}
      </div>
      {extra}
    </div>
    <div style={{padding:"12px 14px"}}>{children}</div>
  </div>
);

const Field = ({label,required,children,sub}) => (
  <div style={{marginBottom:10}}>
    <div style={{fontSize:11,fontWeight:600,color:T.tx2,marginBottom:3,display:"flex",gap:5}}>
      {label}{required&&<span style={{color:"#E24B4A"}}>*</span>}
      {sub&&<span style={{fontWeight:400,color:T.tx3}}>{sub}</span>}
    </div>
    {children}
  </div>
);

const NumInput = ({value,onChange,placeholder,min=0,unit,prefix}) => (
  <div style={{display:"flex",alignItems:"center",gap:6}}>
    {prefix&&<span style={{fontSize:11,color:T.tx2,minWidth:16}}>{prefix}</span>}
    <input type="number" value={value||""} min={min}
      onChange={e=>onChange(parseFloat(e.target.value)||0)}
      placeholder={placeholder}
      style={{flex:1,padding:"9px 10px",borderRadius:9,border:`1px solid ${T.bd2}`,
        fontSize:13,fontFamily:"inherit",outline:"none",
        background:"#fff",color:T.tx}}/>
    {unit&&<span style={{fontSize:11,color:T.tx3,minWidth:20}}>{unit}</span>}
  </div>
);

const CurrencyInput = ({value,onChange,label}) => (
  <div style={{display:"flex",alignItems:"center",gap:6}}>
    <span style={{fontSize:12,color:T.tx3,minWidth:10}}>€</span>
    <input type="number" value={value||""} min={0} step={10}
      onChange={e=>onChange(parseFloat(e.target.value)||0)}
      placeholder="0"
      style={{flex:1,padding:"9px 10px",borderRadius:9,border:`1px solid ${T.bd2}`,
        fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",textAlign:"right"}}/>
  </div>
);

const CheckItem = ({checked,onChange,label,sub}) => (
  <div onClick={()=>onChange(!checked)} style={{
    display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",
    borderBottom:`0.5px solid ${T.bd}`,cursor:"pointer",
  }}>
    <div style={{
      width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,
      border:`1.5px solid ${checked?T.green:T.bd2}`,
      background:checked?T.green:"#fff",
      display:"flex",alignItems:"center",justifyContent:"center",
      transition:"all .15s",
    }}>
      {checked&&<span style={{color:"#fff",fontSize:14,lineHeight:1}}>✓</span>}
    </div>
    <div>
      <div style={{fontSize:12,fontWeight:checked?400:500,color:checked?T.tx2:T.tx,
        textDecoration:checked?"line-through":"none"}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:T.tx3}}>{sub}</div>}
    </div>
  </div>
);

const Chip = ({active,onClick,children,color,bg}) => (
  <button onClick={onClick} style={{
    padding:"6px 11px",borderRadius:8,fontSize:11,fontWeight:500,
    cursor:"pointer",border:"none",fontFamily:"inherit",
    background:active?bg||T.greenL:T.bg2,
    color:active?color||T.greenD:T.tx3,
    boxShadow:active?`0 0 0 1.5px ${color||T.green}`:"none",
    transition:"all .1s",
  }}>{children}</button>
);

// ── INDICE VISUAL ───────────────────────────────────────────────────────────────
const IndiceApplitag = ({score, size=80, showLabel=true}) => {
  const c = score>=80?T.green:score>=60?T.amber:T.red;
  const label = score>=90?"Excellent":score>=80?"Très bon":score>=70?"Bon":score>=60?"Conforme":score>=40?"À améliorer":"Non conforme";
  const r = size/2-7;
  const circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  return (
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.bg2} strokeWidth="5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{transition:"stroke-dasharray .5s ease"}}/>
        <text x={size/2} y={size/2+4} textAnchor="middle" fontSize={size>70?16:12}
          fontWeight="700" fill={c}>{score}</text>
        <text x={size/2} y={size/2+14} textAnchor="middle" fontSize={8} fill={T.tx3}>/100</text>
      </svg>
      {showLabel&&<div>
        <div style={{fontSize:14,fontWeight:600,color:c}}>{label}</div>
        <div style={{fontSize:10,color:T.tx3}}>Indice APPLITAG</div>
      </div>}
    </div>
  );
};

// ── ÉTOILES ────────────────────────────────────────────────────────────────────
const Stars = ({value,onChange,size=28}) => (
  <div style={{display:"flex",gap:4}}>
    {[1,2,3,4,5].map(n=>(
      <span key={n} onClick={()=>onChange&&onChange(n)}
        style={{fontSize:size,cursor:onChange?"pointer":"default",
          filter:n<=value?"none":"grayscale(1) opacity(.3)",
          transition:"filter .1s"}}>
        ⭐
      </span>
    ))}
    <span style={{fontSize:13,color:T.tx2,marginLeft:6,alignSelf:"center"}}>
      {{1:"Non conforme",2:"À améliorer",3:"Conforme",4:"Bon",5:"Excellent"}[value]||""}
    </span>
  </div>
);

// ── PHOTO GRID ──────────────────────────────────────────────────────────────────
const PhotoGrid = ({photos, phase, onAdd}) => {
  const filtered = photos.filter(p=>p.phase===phase);
  return (
    <div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}>
        {filtered.map(p=>(
          <div key={p.id} style={{
            width:58,height:58,borderRadius:9,background:phase==="avant"?T.amberL:T.greenL,
            display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",fontSize:22,border:`1px solid ${T.bd}`,cursor:"pointer",
          }}>
            {p.emoji}
            <div style={{fontSize:8,color:T.tx3,textAlign:"center",padding:"0 2px",lineHeight:1.1,marginTop:2}}>
              {p.label.slice(0,12)}
            </div>
          </div>
        ))}
        <div onClick={()=>onAdd(phase)} style={{
          width:58,height:58,borderRadius:9,border:`1.5px dashed ${T.bd2}`,
          display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",cursor:"pointer",color:T.tx3,
        }}>
          <span style={{fontSize:22}}>+</span>
          <span style={{fontSize:9}}>Photo</span>
        </div>
      </div>
      <div style={{fontSize:10,color:T.tx3}}>
        {filtered.length} photo{filtered.length>1?"s":""} {phase==="avant"?"avant":"après"}
        {filtered.length<2&&<span style={{color:T.amber}}> · min. 2 recommandées</span>}
      </div>
    </div>
  );
};

// ── FIN DE CHANTIER MODULE ─────────────────────────────────────────────────────
const FinChantierModule = ({data, onChange, toast}) => {
  const [tab, setTab] = useState("controle");
  const indice = calcIndiceApplitag(data);
  const coutTotal = data.coutCarburantEur + data.coutMachineEur + data.coutOperateurEur;
  const gnrPrix = 1.5; // €/L simulé

  const TYPES_BROYAGE = [
    {v:"remenants_forestiers",l:"Rémanents forestiers"},
    {v:"accotements",l:"Accotements"},
    {v:"souches",l:"Souches"},
    {v:"vegetation_invasive",l:"Végétation invasive"},
    {v:"entretien_depot",l:"Entretien dépôt"},
    {v:"remise_etat_plateforme",l:"Remise en état plateforme"},
  ];
  const TYPES_MACHINE = [
    {v:"broyeur_chenilles",l:"Broyeur sur chenilles"},
    {v:"tracteur_broyeur",l:"Tracteur broyeur"},
    {v:"gyrobroyeur",l:"Gyrobroyeur"},
    {v:"broyeur_faucille",l:"Broyeur à faucille"},
  ];
  const QUALITE_ITEMS = [
    {k:"depot_nettoye",l:"Dépôt nettoyé",s:"Aire de stockage remise en état"},
    {k:"remanents_traites",l:"Rémanents traités",s:"Broyés ou exportés"},
    {k:"acces_retablis",l:"Accès rétablis",s:"Chemins et passages remis en état"},
    {k:"fosses_preserves",l:"Fossés préservés",s:"Aucun comblement accidentel"},
    {k:"aucun_dechet",l:"Aucun déchet sur site",s:"Huile, carburant, plastiques"},
    {k:"respect_consignes",l:"Consignes propriétaire respectées",s:"Voir cahier des charges"},
  ];

  const TABS = [
    {id:"controle",l:"📷 Contrôle",n:0},
    {id:"renovation",l:"🌿 Rénovation",n:0},
    {id:"couts",l:"💶 Coûts",n:0},
    {id:"qualite",l:"✅ Qualité",n:Object.values(data.qualiteChecks).filter(v=>!v).length},
    {id:"validation",l:"✍️ Validation",n:data.validationSigne?0:1},
    {id:"indice",l:"⭐ Indice",n:0},
  ];

  const update = (patch) => onChange({...data,...patch});

  return (
    <div>
      {/* Indice header */}
      <div style={{display:"flex",alignItems:"center",gap:16,padding:"12px 14px",
        background:"#fff",borderRadius:12,border:`1px solid ${T.bd}`,marginBottom:12}}>
        <IndiceApplitag score={indice} size={72}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>
            Fin de chantier — {LOT.numero}
          </div>
          <div style={{fontSize:11,color:T.tx3}}>
            {LOT.commune} · {LOT.proprietaire}
          </div>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <Badge bg={T.greenL} color={T.greenD}>{data.surfaceRenoveeHa} ha rénovés</Badge>
            <Badge bg={T.amberL} color={T.amberD}>{data.tempsMachineH}h machine</Badge>
            <Badge bg={T.bg2} color={T.tx2}>{coutTotal.toLocaleString()} € coût rénov.</Badge>
          </div>
        </div>
        <Stars value={data.noteEtoiles} size={20}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"#fff",border:`1px solid ${T.bd}`,
        borderRadius:10,overflow:"hidden",marginBottom:12}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"9px 4px",fontSize:10,fontWeight:500,border:"none",
            cursor:"pointer",fontFamily:"inherit",background:"none",
            color:tab===t.id?T.green:T.tx3,
            borderBottom:`2px solid ${tab===t.id?T.green:"transparent"}`,
            display:"flex",alignItems:"center",justifyContent:"center",gap:4,
            position:"relative",
          }}>
            {t.l}
            {t.n>0&&<span style={{position:"absolute",top:3,right:6,width:14,height:14,
              borderRadius:"50%",background:T.red,color:"#fff",fontSize:8,
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
              {t.n}</span>}
          </button>
        ))}
      </div>

      {/* ─── 1. Contrôle visuel ─── */}
      {tab==="controle" && (
        <div>
          <SCard title="Photos avant travaux" icon="📷" accent={T.amber}>
            <PhotoGrid photos={data.photos} phase="avant" onAdd={(phase)=>{
              const labels = ["Zone sensible","Rémanents","Parcelle vue générale"];
              const emojis = ["🌳","🪵","📍"];
              const n = data.photos.filter(p=>p.phase==="avant").length;
              update({photos:[...data.photos,{id:Math.random().toString(36).slice(2),phase,
                label:labels[n%3]||"Photo",emoji:emojis[n%3]||"📷",capturedAt:new Date().toISOString()}]});
              toast("Photo avant ajoutée");
            }}/>
          </SCard>
          <SCard title="Photos après travaux" icon="📷" accent={T.green}>
            <PhotoGrid photos={data.photos} phase="apres" onAdd={(phase)=>{
              const labels = ["Vue générale","Place de dépôt","Chemin remis en état","Zone rénovée"];
              const emojis = ["🌿","✅","🛤️","🌱"];
              const n = data.photos.filter(p=>p.phase==="apres").length;
              update({photos:[...data.photos,{id:Math.random().toString(36).slice(2),phase,
                label:labels[n%4]||"Photo",emoji:emojis[n%4]||"📷",capturedAt:new Date().toISOString()}]});
              toast("Photo après ajoutée");
            }}/>
          </SCard>
        </div>
      )}

      {/* ─── 2. Rénovation ─── */}
      {tab==="renovation" && (
        <div>
          <SCard title="Paramètres rénovation" icon="🌿">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Surface rénovée" required><NumInput value={data.surfaceRenoveeHa} onChange={v=>update({surfaceRenoveeHa:v})} unit="ha"/></Field>
              <Field label="Nombre de passages"><NumInput value={data.nbPassages} onChange={v=>update({nbPassages:v})} min={1}/></Field>
              <Field label="Temps machine" required><NumInput value={data.tempsMachineH} onChange={v=>update({tempsMachineH:v})} unit="h"/></Field>
              <Field label="Date fin travaux"><input type="date" value={data.dateFinTravaux} onChange={e=>update({dateFinTravaux:e.target.value})}
                style={{width:"100%",padding:"9px 10px",borderRadius:9,border:`1px solid ${T.bd2}`,fontSize:13,fontFamily:"inherit",outline:"none"}}/></Field>
            </div>
            <Field label="Type de machine" required>
              <select value={data.typeMachine} onChange={e=>update({typeMachine:e.target.value})}
                style={{width:"100%",padding:"10px",borderRadius:9,border:`1px solid ${T.bd2}`,fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none"}}>
                {TYPES_MACHINE.map(({v,l})=><option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Types de broyage réalisés">
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:3}}>
                {TYPES_BROYAGE.map(({v,l})=>(
                  <Chip key={v} active={data.typesBroyage.includes(v)}
                    onClick={()=>update({typesBroyage:data.typesBroyage.includes(v)?data.typesBroyage.filter(x=>x!==v):[...data.typesBroyage,v]})}>
                    {l}
                  </Chip>
                ))}
              </div>
            </Field>
          </SCard>
        </div>
      )}

      {/* ─── 3. Coûts ─── */}
      {tab==="couts" && (
        <div>
          <SCard title="Consommations & coûts rénovation" icon="💶">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
              <Field label="GNR consommé"><NumInput value={data.csoGnrL} onChange={v=>{update({csoGnrL:v,coutCarburantEur:Math.round(v*gnrPrix)})}} unit="L"/></Field>
              <Field label="Coût carburant" sub="(auto)"><CurrencyInput value={data.coutCarburantEur} onChange={v=>update({coutCarburantEur:v})}/></Field>
              <Field label="Prix GNR estimé"><NumInput value={gnrPrix} onChange={()=>{}} unit="€/L" placeholder="1.50"/></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Coût machine (location/amort.)"><CurrencyInput value={data.coutMachineEur} onChange={v=>update({coutMachineEur:v})}/></Field>
              <Field label="Coût opérateur"><CurrencyInput value={data.coutOperateurEur} onChange={v=>update({coutOperateurEur:v})}/></Field>
            </div>
          </SCard>
          {/* Total */}
          <div style={{background:T.greenL,borderRadius:12,padding:"14px",border:`1px solid ${T.green}40`}}>
            <div style={{fontSize:11,color:T.greenD,marginBottom:8,fontWeight:600}}>Total rénovation chantier</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[
                {l:"Carburant",v:data.coutCarburantEur,c:T.amber},
                {l:"Machine",v:data.coutMachineEur,c:T.blue},
                {l:"Opérateur",v:data.coutOperateurEur,c:T.purple},
              ].map(({l,v,c})=>(
                <div key={l} style={{background:"#fff",borderRadius:9,padding:"10px",textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:700,color:c}}>
                    {v.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
                  </div>
                  <div style={{fontSize:10,color:T.tx3,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:10,padding:"10px",background:"#fff",borderRadius:9,
              textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:700,color:T.green}}>
                {coutTotal.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
              </div>
              <div style={{fontSize:11,color:T.tx3}}>
                TOTAL · {data.surfaceRenoveeHa>0?Math.round(coutTotal/data.surfaceRenoveeHa):0} €/ha
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. Qualité ─── */}
      {tab==="qualite" && (
        <SCard title="Contrôle qualité terrain" icon="✅"
          accent={Object.values(data.qualiteChecks).every(v=>v)?T.green:T.amber}>
          {QUALITE_ITEMS.map(({k,l,s})=>(
            <CheckItem key={k} checked={data.qualiteChecks[k]||false}
              onChange={v=>update({qualiteChecks:{...data.qualiteChecks,[k]:v}})}
              label={l} sub={s}/>
          ))}
          <div style={{marginTop:10,padding:"9px 11px",borderRadius:9,
            background:Object.values(data.qualiteChecks).every(v=>v)?T.greenL:T.amberL,
            fontSize:12,fontWeight:600,
            color:Object.values(data.qualiteChecks).every(v=>v)?T.greenD:T.amberD}}>
            {Object.values(data.qualiteChecks).filter(v=>v).length}/
            {Object.keys(data.qualiteChecks).length} points conformes
          </div>
        </SCard>
      )}

      {/* ─── 5. Validation ─── */}
      {tab==="validation" && (
        <SCard title="Validation propriétaire" icon="✍️">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <Field label="Nom propriétaire" required>
              <input value={data.validationNom} onChange={e=>update({validationNom:e.target.value})}
                style={{width:"100%",padding:"10px",borderRadius:9,border:`1px solid ${T.bd2}`,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
            </Field>
            <Field label="Date réception">
              <input type="date" value={data.validationDate} onChange={e=>update({validationDate:e.target.value})}
                style={{width:"100%",padding:"10px",borderRadius:9,border:`1px solid ${T.bd2}`,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
            </Field>
          </div>
          <Field label="Commentaire">
            <textarea value={data.validationCommentaire} rows={3}
              onChange={e=>update({validationCommentaire:e.target.value})}
              placeholder="Chantier réceptionné sans réserve / Réserves émises…"
              style={{width:"100%",padding:"10px",borderRadius:9,resize:"vertical",
                border:`1px solid ${T.bd2}`,fontSize:13,fontFamily:"inherit",outline:"none",lineHeight:1.5}}/>
          </Field>
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <Chip active={!data.reservesEmises} onClick={()=>update({reservesEmises:false})} color={T.greenD} bg={T.greenL}>
              ✓ Sans réserve
            </Chip>
            <Chip active={data.reservesEmises} onClick={()=>update({reservesEmises:true})} color={T.red} bg={T.redL}>
              ⚠ Réserves émises
            </Chip>
          </div>
          <div style={{border:`1.5px dashed ${T.bd2}`,borderRadius:10,padding:"18px",
            textAlign:"center",background:T.bg2,marginBottom:10}}>
            <div style={{fontSize:20,marginBottom:6}}>✍️</div>
            <div style={{fontSize:12,color:T.tx2,fontWeight:500}}>
              {data.validationSigne?"Signature apposée ✓":"Zone de signature électronique"}
            </div>
            <div style={{fontSize:10,color:T.tx3,marginTop:3}}>Tablette ou lien SMS envoyé au propriétaire</div>
          </div>
          <PBtn onClick={()=>{update({validationSigne:true});toast("Signature enregistrée ✓");}}
            disabled={data.validationSigne} style={{width:"100%",justifyContent:"center"}}>
            {data.validationSigne?"✓ Signé":"Signer la réception"}
          </PBtn>
        </SCard>
      )}

      {/* ─── 6. Indice ─── */}
      {tab==="indice" && (
        <div>
          <SCard title="Indice APPLITAG" icon="⭐"
            accent={indice>=80?T.green:indice>=60?T.amber:T.red}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
              <IndiceApplitag score={indice} size={90}/>
              <div style={{flex:1}}>
                <Stars value={data.noteEtoiles} onChange={v=>{update({noteEtoiles:v});toast(`Note mise à jour : ${v}/5 étoiles`);}} size={24}/>
                <div style={{fontSize:11,color:T.tx3,marginTop:6}}>
                  Cliquer pour modifier la note visuelle
                </div>
              </div>
            </div>
            {/* Score breakdown */}
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {[
                {l:"Conformité documentaire",pct:25,score:Math.round((([data.validationSigne, data.photos.filter(p=>p.phase==="avant").length>=2, data.photos.filter(p=>p.phase==="apres").length>=2, data.dateFinTravaux].filter(Boolean).length)/4)*25),max:25},
                {l:"Qualité photos",pct:20,score:Math.min(20,Math.round(data.photos.length/6*20)),max:20},
                {l:"Contrôle terrain",pct:25,score:Math.round((Object.values(data.qualiteChecks).filter(Boolean).length/Object.keys(data.qualiteChecks).length)*25),max:25},
                {l:"Note propriétaire",pct:20,score:Math.round((data.noteEtoiles/5)*20),max:20},
                {l:"Signature validation",pct:10,score:data.validationSigne?10:0,max:10},
              ].map(({l,score:s,max})=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:140,fontSize:11,color:T.tx2,flexShrink:0}}>{l}</div>
                  <div style={{flex:1,height:8,background:T.bg2,borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(s/max)*100}%`,
                      background:s>=max*0.8?T.green:s>=max*0.5?T.amber:T.red,borderRadius:4,
                      transition:"width .5s ease"}}/>
                  </div>
                  <div style={{width:40,fontSize:11,fontWeight:600,textAlign:"right",
                    color:s>=max*0.8?T.green:s>=max*0.5?T.amber:T.red}}>
                    {s}/{max}
                  </div>
                </div>
              ))}
            </div>
          </SCard>
          {/* Strategic insight */}
          <div style={{background:T.purpleL,borderRadius:12,padding:"14px",
            border:`1px solid ${T.purple}30`,fontSize:12,color:T.purpleD,lineHeight:1.7}}>
            <div style={{fontWeight:700,marginBottom:6}}>🎯 Valeur stratégique de l'Indice APPLITAG</div>
            À terme, cet indice permettra de produire :
            une <strong>note moyenne par ETF</strong>, par opérateur, et par chantier.
            C'est un <strong>argument commercial différenciant</strong> pour les exploitants, les
            énergéticiens et les propriétaires. C'est aussi ce qui différencie APPLITAG
            des logiciels qui s'arrêtent à la livraison du bois.
          </div>
        </div>
      )}
    </div>
  );
};

// ── RENTABILITÉ MODULE ─────────────────────────────────────────────────────────
const RentabiliteModule = ({data, onChange, finChantier, toast}) => {
  const [tab, setTab] = useState("couts");
  const calc = calcRentabilite(data);
  const indiceQualite = calcIndiceApplitag(finChantier);
  const indiceGlobal = Math.round((calc.scoreEco * 0.5) + (indiceQualite * 0.5));

  const COUTS_LABELS = [
    {k:"achatBoisEur",l:"Achat bois sur pied",icon:"🌲"},
    {k:"etfAbattageEur",l:"ETF — Abattage",icon:"⛏"},
    {k:"etfDebardageEur",l:"ETF — Débardage",icon:"🚜"},
    {k:"broyageEur",l:"Broyage / Déchiquetage",icon:"🪓"},
    {k:"transportEur",l:"Transport",icon:"🚛"},
    {k:"carburantEur",l:"Carburant chantier",icon:"⛽"},
    {k:"diversEur",l:"Divers / Imprévus",icon:"📦"},
  ];

  const updateCout = (key, val) => onChange({...data, couts:{...data.couts,[key]:val}});

  const TABS = [
    {id:"couts",l:"💶 Coûts"},
    {id:"volumes",l:"📦 Volumes"},
    {id:"resultat",l:"📊 Résultat"},
    {id:"tableau",l:"📋 Tableau de bord"},
  ];

  return (
    <div>
      {/* Summary header */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {[
          {l:"Coût total",v:calc.totalCoutsEur,fmt:"eur",c:T.red},
          {l:"CA estimé",v:calc.caEur,fmt:"eur",c:T.green},
          {l:"Marge brute",v:calc.margeEur,fmt:"eur",c:calc.margeEur>0?T.green:T.red},
          {l:"Coût/tonne",v:calc.coutTonne,fmt:"eur_dec",c:T.blue},
        ].map(({l,v,fmt,c})=>(
          <div key={l} style={{background:"#fff",border:`1px solid ${T.bd}`,
            borderRadius:11,padding:"12px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:700,color:c}}>
              {fmt==="eur"
                ? v.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})
                : v.toFixed(2)+" €"}
            </div>
            <div style={{fontSize:10,color:T.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"#fff",border:`1px solid ${T.bd}`,
        borderRadius:10,overflow:"hidden",marginBottom:12}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"9px 6px",fontSize:11,fontWeight:500,border:"none",
            cursor:"pointer",fontFamily:"inherit",background:"none",
            color:tab===t.id?T.green:T.tx3,
            borderBottom:`2px solid ${tab===t.id?T.green:"transparent"}`,
          }}>{t.l}</button>
        ))}
      </div>

      {/* ─── Coûts ─── */}
      {tab==="couts" && (
        <SCard title="Postes de coûts" icon="💶">
          {COUTS_LABELS.map(({k,l,icon})=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:10,
              padding:"7px 0",borderBottom:`0.5px solid ${T.bd}`}}>
              <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
              <div style={{flex:1,fontSize:12}}>{l}</div>
              <div style={{width:140}}>
                <CurrencyInput value={data.couts[k]} onChange={v=>updateCout(k,v)}/>
              </div>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"flex-end",gap:6,
            padding:"10px 0",borderTop:`1px solid ${T.bd}`,marginTop:4}}>
            <span style={{fontSize:12,color:T.tx2}}>Total :</span>
            <span style={{fontSize:16,fontWeight:700,color:T.red}}>
              {calc.totalCoutsEur.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
            </span>
          </div>
        </SCard>
      )}

      {/* ─── Volumes ─── */}
      {tab==="volumes" && (
        <div>
          <SCard title="Volumes & prix de vente" icon="📦">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <Field label="Volume estimé"><NumInput value={data.volumeEstimeT} onChange={v=>onChange({...data,volumeEstimeT:v})} unit="t"/></Field>
              <Field label="Volume livré"><NumInput value={data.volumeLivreT} onChange={v=>onChange({...data,volumeLivreT:v})} unit="t"/></Field>
              <Field label="Prix de vente">
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:T.tx3}}>€</span>
                  <input type="number" value={data.prixVenteEurT} min={0} step={1}
                    onChange={e=>onChange({...data,prixVenteEurT:parseFloat(e.target.value)||0})}
                    style={{flex:1,padding:"9px 10px",borderRadius:9,border:`1px solid ${T.bd2}`,
                      fontSize:13,fontFamily:"inherit",outline:"none",textAlign:"right"}}/>
                  <span style={{fontSize:11,color:T.tx3}}>/t</span>
                </div>
              </Field>
              <Field label="Humidité moyenne livrée">
                <NumInput value={data.humiditeAvg} onChange={v=>onChange({...data,humiditeAvg:v})} unit="%"/>
              </Field>
            </div>
            {/* Écart volume */}
            <div style={{padding:"10px 12px",borderRadius:9,
              background:Math.abs(calc.ecartVolume)<=10?T.greenL:T.amberL}}>
              <div style={{fontSize:11,fontWeight:600,
                color:Math.abs(calc.ecartVolume)<=10?T.greenD:T.amberD}}>
                Écart volume : {calc.ecartVolume>0?"+":""}{calc.ecartVolume.toFixed(1)} %
              </div>
              <div style={{fontSize:10,color:T.tx3,marginTop:2}}>
                {Math.abs(calc.ecartVolume)<=10?"✓ Dans la norme (±10%)":"⚠ Écart significatif — justifier"}
              </div>
            </div>
          </SCard>
        </div>
      )}

      {/* ─── Résultat ─── */}
      {tab==="resultat" && (
        <div>
          {/* P&L */}
          <div style={{background:calc.margeEur>0?"#fff":T.redL,
            border:`2px solid ${calc.margeEur>0?T.green:T.red}`,
            borderRadius:14,padding:"20px",marginBottom:12,textAlign:"center"}}>
            <div style={{fontSize:12,color:T.tx3,marginBottom:4}}>Résultat chantier</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              <div>
                <div style={{fontSize:11,color:T.tx3}}>Coût total</div>
                <div style={{fontSize:20,fontWeight:700,color:T.red}}>
                  {calc.totalCoutsEur.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:T.tx3}}>CA brut</div>
                <div style={{fontSize:20,fontWeight:700,color:T.green}}>
                  {calc.caEur.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:T.tx3}}>Marge brute</div>
                <div style={{fontSize:20,fontWeight:700,color:calc.margeEur>=0?T.green:T.red}}>
                  {calc.margeEur.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",fontSize:12}}>
              <div><span style={{color:T.tx2}}>Volume livré : </span><strong>{data.volumeLivreT} t</strong></div>
              <div><span style={{color:T.tx2}}>Coût/t : </span><strong>{calc.coutTonne.toFixed(2)} €</strong></div>
              <div><span style={{color:T.tx2}}>Marge % : </span><strong style={{color:calc.margePct>=15?T.green:T.red}}>{calc.margePct.toFixed(1)} %</strong></div>
              <div><span style={{color:T.tx2}}>Humidité moy. : </span><strong style={{color:data.humiditeAvg>35?T.red:T.green}}>{data.humiditeAvg} %</strong></div>
            </div>
          </div>
          {/* Cost breakdown donut-like */}
          <SCard title="Répartition des coûts" icon="📊">
            {COUTS_LABELS.map(({k,l,icon})=>{
              const v = data.couts[k]||0;
              const pct = calc.totalCoutsEur>0 ? (v/calc.totalCoutsEur)*100 : 0;
              return (
                <div key={k} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"5px 0",borderBottom:`0.5px solid ${T.bd}`}}>
                  <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
                  <div style={{width:110,fontSize:11,color:T.tx2,flexShrink:0}}>{l}</div>
                  <div style={{flex:1,height:8,background:T.bg2,borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:T.blue,
                      borderRadius:4,transition:"width .4s"}}/>
                  </div>
                  <div style={{width:50,fontSize:11,fontWeight:600,textAlign:"right"}}>{pct.toFixed(1)}%</div>
                  <div style={{width:70,fontSize:11,color:T.tx3,textAlign:"right"}}>
                    {v.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
                  </div>
                </div>
              );
            })}
          </SCard>
        </div>
      )}

      {/* ─── Tableau de bord exploitant ─── */}
      {tab==="tableau" && (
        <div>
          <div style={{background:`linear-gradient(135deg,${T.greenD},${T.green})`,
            color:"#fff",borderRadius:14,padding:"18px",marginBottom:12}}>
            <div style={{fontSize:11,opacity:.7,marginBottom:4}}>BILAN CHANTIER</div>
            <div style={{fontSize:16,fontWeight:600,marginBottom:2}}>{LOT.numero} — {LOT.commune}</div>
            <div style={{fontSize:12,opacity:.8}}>{LOT.essence} · {data.volumeLivreT} t livrées · {LOT.proprietaire}</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            {/* Technique */}
            <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
                letterSpacing:".05em",marginBottom:10}}>🔧 Technique</div>
              <div style={{fontSize:11,color:T.tx2,marginBottom:4}}>Chantier terminé</div>
              <Badge bg={T.greenL} color={T.greenD}>✓ Oui</Badge>
              <div style={{height:1,background:T.bd,margin:"8px 0"}}/>
              <div style={{fontSize:11,color:T.tx2,marginBottom:4}}>Qualité validée</div>
              <IndiceApplitag score={indiceQualite} size={48} showLabel={false}/>
              <div style={{fontSize:11,color:indiceQualite>=80?T.green:T.amber,fontWeight:600,marginTop:4}}>
                {indiceQualite}/100
              </div>
            </div>
            {/* Économique */}
            <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
                letterSpacing:".05em",marginBottom:10}}>💶 Économique</div>
              <div style={{fontSize:11,color:T.tx2,marginBottom:2}}>Marge brute</div>
              <div style={{fontSize:18,fontWeight:700,color:calc.margeEur>=0?T.green:T.red}}>
                {calc.margeEur.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
              </div>
              <div style={{fontSize:10,color:T.tx3}}>{calc.margePct.toFixed(1)} % de marge</div>
              <div style={{height:1,background:T.bd,margin:"8px 0"}}/>
              <div style={{fontSize:11,color:T.tx2}}>Coût moyen</div>
              <div style={{fontSize:16,fontWeight:600,color:T.blue}}>{calc.coutTonne.toFixed(2)} €/t</div>
            </div>
            {/* Commercial */}
            <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:10,fontWeight:700,color:T.tx3,textTransform:"uppercase",
                letterSpacing:".05em",marginBottom:10}}>🤝 Commercial</div>
              <div style={{fontSize:11,color:T.tx2,marginBottom:4}}>Propriétaire satisfait</div>
              <Badge bg={finChantier.validationSigne?T.greenL:T.amberL}
                color={finChantier.validationSigne?T.greenD:T.amberD}>
                {finChantier.validationSigne?"✓ Signé":"En attente"}
              </Badge>
              <div style={{height:1,background:T.bd,margin:"8px 0"}}/>
              <div style={{fontSize:11,color:T.tx2,marginBottom:4}}>Note</div>
              <Stars value={finChantier.noteEtoiles} size={16}/>
            </div>
          </div>

          {/* Indice global */}
          <div style={{background:T.purpleL,borderRadius:12,padding:"16px",
            border:`1px solid ${T.purple}30`,textAlign:"center"}}>
            <div style={{fontSize:11,color:T.purpleD,marginBottom:8,fontWeight:600}}>
              Indice APPLITAG Global — Chantier complet
            </div>
            <div style={{fontSize:48,fontWeight:700,color:T.purple}}>{indiceGlobal}</div>
            <div style={{fontSize:12,color:T.purpleD,marginBottom:4}}>/100</div>
            <div style={{fontSize:11,color:T.tx3}}>
              Qualité terrain ({indiceQualite}/100) · Économique ({calc.scoreEco}/100)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── MAIN APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [finChantier, setFinChantier] = useState(initFinChantier);
  const [rentabilite, setRentabilite] = useState(initRentabilite);
  const [activeModule, setActiveModule] = useState("fin");
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type="success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),2800);
  },[]);

  const indice = calcIndiceApplitag(finChantier);
  const calc = calcRentabilite(rentabilite);

  return (
    <div style={{
      display:"flex",flexDirection:"column",minHeight:"100vh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      background:T.bg,color:T.tx,
    }}>
      {/* Toasts */}
      <div style={{position:"fixed",top:14,right:14,zIndex:9999,
        display:"flex",flexDirection:"column",gap:6,pointerEvents:"none"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:"9px 15px",borderRadius:9,fontSize:12,fontWeight:500,
            background:t.type==="success"?T.greenD:t.type==="warn"?T.amberD:T.red,
            color:"#fff",boxShadow:"0 4px 14px rgba(0,0,0,.2)"}}>
            {t.type==="success"?"✓":t.type==="warn"?"⚠":"✗"} {t.msg}
          </div>
        ))}
      </div>

      {/* Topbar */}
      <div style={{background:"#111",color:"#fff",padding:"10px 18px",
        display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:28,height:28,background:T.green,borderRadius:7,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🌲</div>
        <div>
          <div style={{fontSize:14,fontWeight:700,letterSpacing:".02em"}}>APPLITAG</div>
          <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:".04em"}}>
            Fin de chantier · Rentabilité
          </div>
        </div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:10,fontSize:11}}>
          <div style={{padding:"4px 10px",borderRadius:7,background:T.greenL,color:T.greenD,fontWeight:600}}>
            Indice {indice}/100
          </div>
          <div style={{padding:"4px 10px",borderRadius:7,
            background:calc.margeEur>0?T.greenL:T.redL,
            color:calc.margeEur>0?T.greenD:T.red,fontWeight:600}}>
            Marge {calc.margeEur.toLocaleString("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0})}
          </div>
          <div style={{padding:"4px 10px",borderRadius:7,background:T.bg2,color:T.tx3,fontWeight:500}}>
            Tests {TESTS_PASS}/{UNIT_TESTS.length} ✓
          </div>
        </div>
      </div>

      {/* Lot header */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.bd}`,
        padding:"10px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontFamily:"monospace",fontSize:14,fontWeight:700}}>{LOT.numero}</span>
            <Badge bg={T.greenL} color={T.greenD}>LIVRE</Badge>
            <Badge bg={T.bg2} color={T.tx2}>{LOT.commune}</Badge>
            <Badge bg={T.bg2} color={T.tx2}>{LOT.essence}</Badge>
          </div>
          <div style={{fontSize:11,color:T.tx3,marginTop:3}}>
            {LOT.proprietaire} · {LOT.etf} · {LOT.surface} ha
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setActiveModule("fin")} style={{
            padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",
            cursor:"pointer",fontFamily:"inherit",
            background:activeModule==="fin"?T.coral:T.bg2,
            color:activeModule==="fin"?"#fff":T.tx2,
          }}>🌿 Fin de chantier</button>
          <button onClick={()=>setActiveModule("rentabilite")} style={{
            padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",
            cursor:"pointer",fontFamily:"inherit",
            background:activeModule==="rentabilite"?T.green:T.bg2,
            color:activeModule==="rentabilite"?"#fff":T.tx2,
          }}>📊 Rentabilité</button>
          <button onClick={()=>setActiveModule("tests")} style={{
            padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",
            cursor:"pointer",fontFamily:"inherit",
            background:activeModule==="tests"?T.blue:T.bg2,
            color:activeModule==="tests"?"#fff":T.tx2,
          }}>🧪 Tests</button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px",maxWidth:860,width:"100%",margin:"0 auto"}}>
        {activeModule==="fin" && (
          <FinChantierModule data={finChantier} onChange={setFinChantier} toast={toast}/>
        )}
        {activeModule==="rentabilite" && (
          <RentabiliteModule data={rentabilite} onChange={setRentabilite}
            finChantier={finChantier} toast={toast}/>
        )}
        {activeModule==="tests" && (
          <SCard title={`Tests unitaires — ${TESTS_PASS}/${UNIT_TESTS.length} passés`}
            icon="🧪" accent={TESTS_PASS===UNIT_TESTS.length?T.green:T.amber}>
            <div style={{marginBottom:10,padding:"9px 11px",borderRadius:9,
              background:TESTS_PASS===UNIT_TESTS.length?T.greenL:T.amberL,
              fontSize:13,fontWeight:600,
              color:TESTS_PASS===UNIT_TESTS.length?T.greenD:T.amberD}}>
              {TESTS_PASS}/{UNIT_TESTS.length} tests passés
            </div>
            {TEST_RESULTS.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:9,padding:"7px 0",
                borderBottom:i<TEST_RESULTS.length-1?`0.5px solid ${T.bd}`:"none",
                fontSize:12}}>
                <span style={{color:r.pass?T.green:T.red,fontWeight:700,fontSize:15,flexShrink:0}}>
                  {r.pass?"✓":"✗"}
                </span>
                <div>
                  <div style={{color:r.pass?T.tx:T.red}}>{r.name}</div>
                  {r.err&&<div style={{fontSize:10,color:T.red}}>{r.err}</div>}
                </div>
              </div>
            ))}
          </SCard>
        )}
      </div>
    </div>
  );
}
