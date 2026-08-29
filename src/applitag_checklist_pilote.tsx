// @ts-nocheck
// ============================================================
// APPLITAG — Checklist Chantier Pilote + Mode Pilote Complet
// 11 sections · Score · Tableau de bord · Journal · Retour terrain
// Rapport PDF · Audit · Offline · JSDoc TypeScript-style
// ============================================================

import { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────
/**
 * @typedef {'ok'|'incomplete'|'blocking'|'na'} CheckStatus
 * @typedef {'info'|'warn'|'critique'} AlertLevel
 * @typedef {'visite'|'tas'|'dechiq'|'transport'|'livraison'|'cloture'|'doc'|'checklist'|'feedback'|'sync'} ActionType
 */

/**
 * @typedef {Object} CheckItem
 * @property {string} id
 * @property {string} label
 * @property {boolean} required       - Bloquant pour la clôture si non coché
 * @property {boolean} checked
 * @property {string} [helpText]
 * @property {string} [linkedScreen]  - Screen de résolution
 */

/**
 * @typedef {Object} CheckSection
 * @property {string} id
 * @property {string} title
 * @property {string} icon
 * @property {CheckItem[]} items
 * @property {CheckStatus} status      - Calculé automatiquement
 */

/**
 * @typedef {Object} PiloteEvent
 * @property {string} id
 * @property {ActionType} type
 * @property {string} message
 * @property {string} user
 * @property {string} [gps]
 * @property {number} [durationMs]    - Temps de saisie mesurée
 * @property {boolean} [offline]
 * @property {boolean} [success]
 * @property {string} [errorMsg]
 * @property {string} at
 */

/**
 * @typedef {Object} Feedback
 * @property {string} id
 * @property {'bug'|'suggestion'|'bloquant'} type
 * @property {string} message
 * @property {string} [screenshot]    - Emoji simulé
 * @property {string} [photo]
 * @property {string} at
 * @property {string} user
 * @property {boolean} resolved
 */

/**
 * @typedef {Object} PiloteStats
 * @property {number} avgVisiteSec
 * @property {number} avgLotSec
 * @property {number} avgTasSec
 * @property {number} avgLivraisonSec
 * @property {number} totalDocsGenerated
 * @property {number} totalOfflineActions
 * @property {number} totalSyncErrors
 */

// ── TOKENS ─────────────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75", greenL:"#E1F5EE", greenD:"#085041",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  blue:"#185FA5",  blueL:"#E6F1FB",  blueD:"#042C53",
  amber:"#BA7517", amberL:"#FAEEDA", amberD:"#412402",
  red:"#A32D2D",   redL:"#FCEBEB",
  coral:"#D85A30", coralL:"#FAECE7",
  bg:"#F5F4F1", bg2:"#ECEAE6",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
};

// ── HELPERS ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,10);
const nowISO = () => new Date().toISOString();
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}) : "—";
const fmtDuration = (ms) => {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms/1000)}s`;
  return `${Math.round(ms/60000)}min ${Math.round((ms%60000)/1000)}s`;
};
const fmtDurationSec = (s) => {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s/60)}min ${s%60}s`;
};

// ── CHECKLIST TEMPLATE ─────────────────────────────────────────────────────────
/** @returns {CheckSection[]} */
const buildChecklist = () => [
  {
    id:"contact", title:"Contact / Propriétaire", icon:"👤",
    items:[
      {id:"c1",label:"Contact propriétaire créé avec nom + téléphone",required:true,checked:true,helpText:"Écran Contact"},
      {id:"c2",label:"Type de contact renseigné (propriétaire forestier)",required:true,checked:true},
      {id:"c3",label:"Commentaire ou note de premier contact",required:false,checked:true},
      {id:"c4",label:"Rappel planifié ou converti en opportunité",required:false,checked:false},
    ],
  },
  {
    id:"parcelle", title:"Parcelle / GPS", icon:"📍",
    items:[
      {id:"p1",label:"Commune renseignée",required:true,checked:true},
      {id:"p2",label:"GPS parcelle capturé (≥ 4 décimales)",required:true,checked:true,helpText:"Précision 10m minimum"},
      {id:"p3",label:"Référence cadastrale (optionnelle)",required:false,checked:false},
      {id:"p4",label:"Surface estimée (ha) saisie",required:true,checked:true},
    ],
  },
  {
    id:"visite", title:"Visite terrain", icon:"🔭",
    items:[
      {id:"v1",label:"Visite terrain réalisée et validée",required:true,checked:true},
      {id:"v2",label:"≥ 2 photos de la parcelle",required:true,checked:true},
      {id:"v3",label:"Essences identifiées (% + volume)",required:true,checked:true},
      {id:"v4",label:"Somme essences = 100 %",required:true,checked:true},
      {id:"v5",label:"Contraintes terrain cochées",required:false,checked:true},
      {id:"v6",label:"Accès camion renseigné",required:true,checked:true},
      {id:"v7",label:"Date limite exploitation définie",required:false,checked:false,helpText:"Recommandé pour planification"},
    ],
  },
  {
    id:"autorisation", title:"Autorisation propriétaire", icon:"📋",
    items:[
      {id:"a1",label:"Bon d'achat généré",required:true,checked:true},
      {id:"a2",label:"Bon d'achat signé par le propriétaire",required:true,checked:false,helpText:"Signature manuelle ou numérique requise"},
      {id:"a3",label:"Autorisation d'exploitation signée",required:true,checked:false},
      {id:"a4",label:"Documents classés dans la fiche lot",required:false,checked:true},
    ],
  },
  {
    id:"exploitation", title:"Exploitation / Chantier", icon:"⛏",
    items:[
      {id:"e1",label:"ETF affecté",required:true,checked:true},
      {id:"e2",label:"≥ 1 opérateur affecté",required:true,checked:true},
      {id:"e3",label:"Machine renseignée",required:false,checked:true},
      {id:"e4",label:"Dates début / fin prévues saisies",required:false,checked:true},
      {id:"e5",label:"Relevé journalier ≥ 1 saisi",required:true,checked:true},
    ],
  },
  {
    id:"tas", title:"Tas bord de route", icon:"📦",
    items:[
      {id:"t1",label:"≥ 1 tas créé",required:true,checked:true},
      {id:"t2",label:"Tous les tas géolocalisés",required:true,checked:true,helpText:"GPS obligatoire pour déchiquetage"},
      {id:"t3",label:"Volumes estimés saisis par tas",required:true,checked:true},
      {id:"t4",label:"Photos des tas (min. 1 par tas)",required:false,checked:false},
      {id:"t5",label:"Tous les tas marqués 'prêt'",required:true,checked:false,helpText:"Valider chaque tas avant déchiquetage"},
    ],
  },
  {
    id:"dechiquetage", title:"Déchiquetage", icon:"🪓",
    items:[
      {id:"d1",label:"Entreprise broyage renseignée",required:true,checked:true},
      {id:"d2",label:"Immatriculation engin saisie (AA-000-AA)",required:true,checked:true},
      {id:"d3",label:"Granulométrie définie (P45/P63/P100)",required:true,checked:true},
      {id:"d4",label:"Volume chargé saisi",required:true,checked:false},
      {id:"d5",label:"GPS de départ horodaté",required:true,checked:false},
      {id:"d6",label:"Photo du chargement prise",required:false,checked:false},
    ],
  },
  {
    id:"transport", title:"Transport / CMR", icon:"🚛",
    items:[
      {id:"tr1",label:"Chauffeur renseigné",required:true,checked:true},
      {id:"tr2",label:"Immatriculation tracteur + remorque",required:true,checked:true},
      {id:"tr3",label:"CMR généré",required:true,checked:true},
      {id:"tr4",label:"CMR signé par le chauffeur au départ",required:true,checked:false,helpText:"Signature obligatoire avant transit"},
      {id:"tr5",label:"Destination confirmée par le chauffeur",required:true,checked:false},
      {id:"tr6",label:"Départ confirmé avec GPS horodaté",required:true,checked:false},
    ],
  },
  {
    id:"livraison", title:"Livraison / Pesée", icon:"🏭",
    items:[
      {id:"l1",label:"Arrivée confirmée à la destination",required:true,checked:false},
      {id:"l2",label:"Poids brut bascule saisi",required:true,checked:false},
      {id:"l3",label:"Tare saisie → poids net calculé",required:true,checked:false},
      {id:"l4",label:"Humidité mesurée et saisie",required:true,checked:false},
      {id:"l5",label:"N° ticket bascule enregistré",required:true,checked:false},
      {id:"l6",label:"GPS livraison conforme (< 5 km)",required:true,checked:false},
      {id:"l7",label:"Bon de livraison généré et signé",required:true,checked:false},
    ],
  },
  {
    id:"documents", title:"Documents", icon:"📄",
    items:[
      {id:"doc1",label:"Bon d'achat (signé)",required:true,checked:false},
      {id:"doc2",label:"Autorisation d'exploitation (signée)",required:true,checked:false},
      {id:"doc3",label:"CMR (signé chauffeur)",required:true,checked:false},
      {id:"doc4",label:"Bon de livraison (signé réceptionnaire)",required:true,checked:false},
      {id:"doc5",label:"Photos terrain archivées",required:false,checked:true},
      {id:"doc6",label:"Rapport chantier généré",required:false,checked:false},
    ],
  },
  {
    id:"cloture", title:"Clôture lot", icon:"🔒",
    items:[
      {id:"cl1",label:"Tous tas déchiquetés ou annulés",required:true,checked:false},
      {id:"cl2",label:"Tous transports statut 'arrivé'",required:true,checked:false},
      {id:"cl3",label:"Toutes pesées saisies",required:true,checked:false},
      {id:"cl4",label:"Aucun litige ouvert",required:true,checked:false},
      {id:"cl5",label:"CMR + BL signés pour chaque transport",required:true,checked:false},
      {id:"cl6",label:"Rapport chantier généré",required:false,checked:false},
    ],
  },
];

// ── SCORE CALCULATION ──────────────────────────────────────────────────────────
/**
 * @param {CheckSection[]} sections
 * @returns {{ score: number, blocking: number, incomplete: number, total: number, canClose: boolean }}
 */
const calcScore = (sections) => {
  const allItems = sections.flatMap(s => s.items);
  const total = allItems.length;
  const checked = allItems.filter(i => i.checked).length;
  const blockingUnchecked = allItems.filter(i => i.required && !i.checked).length;
  const incomplete = allItems.filter(i => !i.checked).length;
  const score = total > 0 ? Math.round((checked / total) * 100) : 0;
  return { score, blocking: blockingUnchecked, incomplete, total, canClose: blockingUnchecked === 0 };
};

/**
 * @param {CheckSection} section
 * @returns {CheckStatus}
 */
const calcSectionStatus = (section) => {
  const blocking = section.items.filter(i => i.required && !i.checked);
  const incomplete = section.items.filter(i => !i.checked);
  if (blocking.length > 0) return "blocking";
  if (incomplete.length > 0) return "incomplete";
  return "ok";
};

// ── MOCK PILOT EVENTS ──────────────────────────────────────────────────────────
/** @returns {PiloteEvent[]} */
const buildPiloteEvents = () => [
  {id:uid(),type:"visite",message:"Visite terrain validée — Charny (89) · 350 t Peuplier",user:"J. Moreau",gps:"47.9812°N · 3.0891°E",durationMs:187000,offline:false,success:true,at:"2025-02-18T10:15:00Z"},
  {id:uid(),type:"tas",message:"Tas A créé — 85 t · GPS capturé automatiquement",user:"P. Girard",gps:"47.9812°N · 3.0891°E",durationMs:32000,offline:false,success:true,at:"2025-03-15T09:30:00Z"},
  {id:uid(),type:"tas",message:"Tas B créé — 35 t · GPS capturé automatiquement",user:"P. Girard",gps:"47.9807°N · 3.0899°E",durationMs:28000,offline:true,success:true,at:"2025-03-15T09:58:00Z"},
  {id:uid(),type:"sync",message:"Synchronisation offline — 2 actions replaying",user:"Système",offline:false,success:true,at:"2025-03-15T10:02:00Z"},
  {id:uid(),type:"dechiq",message:"Déchiquetage validé — Bandit 2590XP · EF-456-GH · 42 t",user:"J. Moreau",durationMs:145000,offline:false,success:true,at:"2025-06-09T07:50:00Z"},
  {id:uid(),type:"transport",message:"Transport confirmé — D. Martel · LOT-2025-007",user:"D. Martel",gps:"48.0500°N · 3.3240°E",durationMs:18000,offline:false,success:true,at:"2025-06-09T07:45:00Z"},
  {id:uid(),type:"sync",message:"Erreur sync — timeout réseau (action mise en file)",user:"Système",offline:true,success:false,errorMsg:"Network timeout — retrying in 30s",at:"2025-06-09T08:12:00Z"},
  {id:uid(),type:"livraison",message:"Livraison validée — BL-2025-0089 · 42 t · Humidité 32%",user:"M. Dupont",gps:"48.2900°N · 4.0733°E",durationMs:94000,offline:false,success:true,at:"2025-06-09T09:15:00Z"},
  {id:uid(),type:"doc",message:"Bon de livraison BL-2025-0089 généré et signé",user:"Système",durationMs:2000,offline:false,success:true,at:"2025-06-09T09:16:00Z"},
  {id:uid(),type:"checklist",message:"Checklist sections 1-6 validées — score 78%",user:"J. Moreau",offline:false,success:true,at:"2025-06-10T08:00:00Z"},
];

/** @returns {Feedback[]} */
const buildFeedbacks = () => [
  {id:uid(),type:"bug",message:"GPS parfois inexact à 10-15m en zone forestière dense. Impact faible mais à noter.",at:"2025-03-15T09:45:00Z",user:"P. Girard",resolved:true},
  {id:uid(),type:"suggestion",message:"Ajouter un champ 'météo' dans la saisie fin de service — utile pour justifier les jours 0t.",at:"2025-04-02T17:30:00Z",user:"P. Girard",resolved:false},
  {id:uid(),type:"bloquant",message:"Formulaire visite — champ essences : les % ne se mettent pas à jour si on change l'essence déjà saisie.",at:"2025-05-10T11:15:00Z",user:"J. Moreau",resolved:true},
];

// ── CHECKLIST SCORE COLOR ──────────────────────────────────────────────────────
const scoreColor = (s) => s >= 90 ? T.green : s >= 70 ? T.amber : T.red;
const scoreLabel = (s) => s >= 90 ? "Excellent" : s >= 70 ? "Bon" : s >= 50 ? "Partiel" : "Insuffisant";

const statusCfg = {
  ok:         {color:T.green,  bg:T.greenL,  icon:"✓", label:"Complet"},
  incomplete: {color:T.amber,  bg:T.amberL,  icon:"○", label:"Incomplet"},
  blocking:   {color:T.red,    bg:T.redL,    icon:"✗", label:"Bloquant"},
  na:         {color:T.tx3,    bg:T.bg2,     icon:"—", label:"N/A"},
};

const actionCfg = {
  visite:    {icon:"🔭",color:T.blue},
  tas:       {icon:"📦",color:"#8B6914"},
  dechiq:    {icon:"🪓",color:T.purple},
  transport: {icon:"🚛",color:T.purple},
  livraison: {icon:"🏭",color:T.green},
  cloture:   {icon:"🔒",color:T.green},
  doc:       {icon:"📄",color:T.tx2},
  checklist: {icon:"✅",color:T.green},
  feedback:  {icon:"💬",color:T.coral},
  sync:      {icon:"⟳",color:T.blue},
};

// ── ATOMS ──────────────────────────────────────────────────────────────────────
const Badge = ({bg,color,children,style={}}) => (
  <span style={{display:"inline-block",padding:"2px 8px",borderRadius:9,
    fontSize:10,fontWeight:600,background:bg,color,whiteSpace:"nowrap",...style}}>{children}</span>
);

const Btn = ({onClick,bg=T.bg2,color=T.tx,children,disabled,sm,style={}}) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding:sm?"5px 10px":"8px 14px",borderRadius:8,fontSize:sm?11:12,fontWeight:500,
    display:"inline-flex",alignItems:"center",gap:6,
    cursor:disabled?"not-allowed":"pointer",border:"none",fontFamily:"inherit",
    background:disabled?T.bg2:bg,color:disabled?T.tx3:color,
    opacity:disabled?.6:1,transition:"all .1s",whiteSpace:"nowrap",...style,
  }}>{children}</button>
);
const PBtn = ({onClick,children,disabled,style={}}) => (
  <Btn onClick={onClick} bg={T.green} color="#fff" disabled={disabled} style={style}>{children}</Btn>
);

const Card = ({children,style={}}) => (
  <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,...style}}>{children}</div>
);

const SCard = ({title,extra,children,accent}) => (
  <Card style={{overflow:"hidden",marginBottom:10,
    outline:accent?`2px solid ${accent}`:"none",outlineOffset:2}}>
    <div style={{padding:"9px 13px",borderBottom:`1px solid ${T.bd}`,background:T.bg,
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:11,fontWeight:600,color:T.tx2,textTransform:"uppercase",letterSpacing:".05em"}}>{title}</div>
      {extra}
    </div>
    <div style={{padding:"10px 13px"}}>{children}</div>
  </Card>
);

// ── RADIAL SCORE ───────────────────────────────────────────────────────────────
const RadialScore = ({score, size=80}) => {
  const r = size/2 - 8;
  const circ = 2*Math.PI*r;
  const dash = (score/100)*circ;
  const c = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={T.bg2} strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r}
        fill="none" stroke={c} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dasharray .6s ease"}}/>
      <text x={size/2} y={size/2+5} textAnchor="middle"
        fontSize={size>60?16:12} fontWeight="700" fill={c}>{score}%</text>
    </svg>
  );
};

// ── CHECKLIST COMPONENT ─────────────────────────────────────────────────────────
const Checklist = ({sections, onToggle, onAddEvent, compact=false}) => {
  const [expanded, setExpanded] = useState(new Set(["contact","parcelle","visite"]));
  const {score, blocking, incomplete, canClose} = calcScore(sections);

  const toggleSection = (id) => {
    setExpanded(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div>
      {/* Score header */}
      <div style={{display:"flex",alignItems:"center",gap:16,padding:"12px 14px",
        background:"#fff",borderRadius:12,border:`1px solid ${T.bd}`,marginBottom:12}}>
        <RadialScore score={score} size={compact?64:80}/>
        <div style={{flex:1}}>
          <div style={{fontSize:compact?13:15,fontWeight:600}}>{scoreLabel(score)}</div>
          <div style={{fontSize:11,color:T.tx3,marginTop:2}}>
            {blocking > 0
              ? <span style={{color:T.red}}>⚠ {blocking} élément{blocking>1?"s":""} bloquant{blocking>1?"s":""}</span>
              : incomplete > 0
              ? <span style={{color:T.amber}}>○ {incomplete} élément{incomplete>1?"s":""} incomplet{incomplete>1?"s":""}</span>
              : <span style={{color:T.green}}>✓ Checklist complète</span>}
          </div>
        </div>
        <div>
          {canClose
            ? <Badge bg={T.greenL} color={T.greenD}>Clôture autorisée ✓</Badge>
            : <Badge bg={T.redL} color={T.red}>Clôture bloquée</Badge>}
        </div>
      </div>

      {/* Sections */}
      {sections.map(sec => {
        const st = calcSectionStatus(sec);
        const cfg = statusCfg[st];
        const isOpen = expanded.has(sec.id);
        const blockCount = sec.items.filter(i=>i.required&&!i.checked).length;
        const incCount = sec.items.filter(i=>!i.checked).length;

        return (
          <div key={sec.id} style={{marginBottom:6}}>
            {/* Section header */}
            <div onClick={()=>toggleSection(sec.id)}
              style={{
                display:"flex",alignItems:"center",gap:10,padding:"10px 13px",
                background:"#fff",borderRadius:isOpen?"12px 12px 0 0":12,
                border:`1px solid ${st==="blocking"?T.red:st==="incomplete"?T.amber:T.bd}`,
                cursor:"pointer",userSelect:"none",
              }}>
              <div style={{width:22,height:22,borderRadius:6,background:cfg.bg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,fontWeight:700,color:cfg.color,flexShrink:0}}>
                {cfg.icon}
              </div>
              <span style={{fontSize:13}}>{sec.icon}</span>
              <span style={{flex:1,fontSize:13,fontWeight:500}}>{sec.title}</span>
              {blockCount>0 && <Badge bg={T.redL} color={T.red}>{blockCount} bloquant{blockCount>1?"s":""}</Badge>}
              {blockCount===0&&incCount>0 && <Badge bg={T.amberL} color={T.amberD}>{incCount} incomplet{incCount>1?"s":""}</Badge>}
              {incCount===0 && <Badge bg={T.greenL} color={T.greenD}>✓</Badge>}
              <span style={{color:T.tx3,fontSize:14}}>{isOpen?"▾":"▸"}</span>
            </div>

            {/* Section items */}
            {isOpen && (
              <div style={{background:"#fff",borderRadius:"0 0 12px 12px",
                border:`1px solid ${T.bd}`,borderTop:"none",padding:"4px 13px 8px"}}>
                {sec.items.map(item => (
                  <div key={item.id}
                    onClick={()=>{
                      onToggle(sec.id, item.id);
                      if (!item.checked) {
                        onAddEvent("checklist",`${sec.title} — "${item.label}" validé`);
                      }
                    }}
                    style={{
                      display:"flex",alignItems:"flex-start",gap:10,
                      padding:"8px 0",borderBottom:`0.5px solid ${T.bd}`,
                      cursor:"pointer",
                    }}>
                    <div style={{
                      width:22,height:22,borderRadius:6,border:`1.5px solid ${item.checked?T.green:item.required?T.red:T.bd2}`,
                      background:item.checked?T.green:"#fff",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      flexShrink:0,marginTop:1,transition:"all .15s",
                    }}>
                      {item.checked && <span style={{color:"#fff",fontSize:13,lineHeight:1}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,color:item.checked?T.tx2:T.tx,
                        fontWeight:item.required&&!item.checked?500:400,
                        textDecoration:item.checked?"line-through":undefined}}>
                        {item.label}
                        {item.required && !item.checked && (
                          <span style={{color:T.red,marginLeft:5,fontSize:10}}>*requis</span>
                        )}
                      </div>
                      {item.helpText && (
                        <div style={{fontSize:10,color:T.tx3,marginTop:2}}>{item.helpText}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── PILOTE DASHBOARD ───────────────────────────────────────────────────────────
const PiloteDashboard = ({sections, events, feedbacks, onNav}) => {
  const {score, blocking, canClose} = calcScore(sections);
  const offlineActions = events.filter(e=>e.offline&&e.success).length;
  const syncErrors = events.filter(e=>e.type==="sync"&&!e.success).length;
  const docsGenerated = events.filter(e=>e.type==="doc").length;
  const unresolvedFeedback = feedbacks.filter(f=>!f.resolved).length;
  const progression = Math.round(
    (sections.flatMap(s=>s.items).filter(i=>i.checked).length /
     sections.flatMap(s=>s.items).length) * 100
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* Hero card */}
      <div style={{background:`linear-gradient(135deg,${T.greenD},${T.green})`,
        color:"#fff",borderRadius:14,padding:"18px 20px"}}>
        <div style={{fontSize:12,opacity:.8,marginBottom:4}}>CHANTIER PILOTE ACTIF</div>
        <div style={{fontSize:18,fontWeight:600,marginBottom:6}}>LOT-2025-007 — Charny (89)</div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div>
            <div style={{fontSize:32,fontWeight:700}}>{progression}%</div>
            <div style={{fontSize:11,opacity:.8}}>Progression</div>
          </div>
          <div style={{flex:1}}>
            <div style={{height:8,background:"rgba(255,255,255,.2)",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progression}%`,background:"#fff",borderRadius:4,transition:"width .6s"}}/>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:14,fontWeight:600}}>{canClose?"Prêt à clôturer":"En cours"}</div>
            <div style={{fontSize:11,opacity:.8}}>{blocking} bloquant{blocking>1?"s":""}</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {[
          {l:"Score checklist",v:`${score}%`,c:scoreColor(score),i:"✅",action:()=>onNav("checklist")},
          {l:"Alertes terrain",v:feedbacks.filter(f=>f.type==="bloquant").length,c:T.red,i:"⚠",action:()=>onNav("feedback")},
          {l:"Actions offline",v:offlineActions,c:T.blue,i:"📶",action:()=>onNav("audit")},
          {l:"Erreurs sync",v:syncErrors,c:syncErrors>0?T.red:T.green,i:"⟳",action:()=>onNav("audit")},
          {l:"Docs générés",v:docsGenerated,c:T.green,i:"📄",action:()=>onNav("documents")},
          {l:"Feedbacks ouverts",v:unresolvedFeedback,c:unresolvedFeedback>0?T.amber:T.green,i:"💬",action:()=>onNav("feedback")},
        ].map(({l,v,c,i,action})=>(
          <div key={l} onClick={action} style={{background:"#fff",border:`1px solid ${T.bd}`,
            borderRadius:10,padding:"12px",cursor:"pointer",transition:"box-shadow .1s"}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.08)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:10,color:T.tx3}}>{l}</span>
              <span style={{fontSize:14}}>{i}</span>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Checklist summary */}
      <SCard title="Checklist — vue rapide">
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
          {sections.map(sec=>{
            const st = calcSectionStatus(sec);
            const cfg = statusCfg[st];
            return (
              <div key={sec.id} onClick={()=>onNav("checklist")}
                style={{
                  display:"flex",alignItems:"center",gap:7,padding:"7px 9px",
                  borderRadius:8,border:`1px solid ${st==="blocking"?T.red:st==="incomplete"?T.amber:T.bd}`,
                  background:cfg.bg+"44",cursor:"pointer",
                }}>
                <span style={{fontSize:14}}>{sec.icon}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,fontWeight:500,overflow:"hidden",
                    textOverflow:"ellipsis",whiteSpace:"nowrap",color:cfg.color}}>{sec.title}</div>
                </div>
                <span style={{fontSize:11,color:cfg.color,fontWeight:700}}>{cfg.icon}</span>
              </div>
            );
          })}
        </div>
      </SCard>

      {/* Recent events */}
      <SCard title="Dernières actions" extra={
        <Btn onClick={()=>onNav("journal")} sm bg={T.blueL} color={T.blueD}>Journal complet</Btn>
      }>
        {events.slice(-5).reverse().map((e,i)=>{
          const cfg = actionCfg[e.type];
          return (
            <div key={e.id} style={{display:"flex",gap:8,padding:"6px 0",
              borderBottom:i<4?`0.5px solid ${T.bd}`:"none"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:cfg.color+"22",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,flexShrink:0}}>{cfg.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:T.tx,lineHeight:1.3}}>{e.message}</div>
                <div style={{fontSize:9,color:T.tx3,display:"flex",gap:8,marginTop:2}}>
                  <span>{e.user}</span>
                  <span>{fmtDate(e.at)} {fmtTime(e.at)}</span>
                  {e.offline && <span style={{color:T.amber}}>📶 offline</span>}
                  {!e.success && <span style={{color:T.red}}>✗ échec</span>}
                </div>
              </div>
            </div>
          );
        })}
      </SCard>
    </div>
  );
};

// ── JOURNAL ────────────────────────────────────────────────────────────────────
const Journal = ({events}) => {
  const [filter, setFilter] = useState("all");
  const FILTERS = [
    {v:"all",l:"Tout"},{v:"visite",l:"Visites"},{v:"tas",l:"Tas"},
    {v:"transport",l:"Transport"},{v:"livraison",l:"Livraison"},
    {v:"sync",l:"Sync"},{v:"doc",l:"Docs"},
  ];
  const visible = filter==="all" ? events : events.filter(e=>e.type===filter);
  const visible_sorted = [...visible].sort((a,b)=>b.at.localeCompare(a.at));

  return (
    <div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
        {FILTERS.map(f=>(
          <button key={f.v} onClick={()=>setFilter(f.v)} style={{
            padding:"5px 11px",borderRadius:7,fontSize:11,fontWeight:500,
            cursor:"pointer",border:"none",fontFamily:"inherit",
            background:filter===f.v?T.blue:T.bg2,
            color:filter===f.v?"#fff":T.tx2,
          }}>{f.l}</button>
        ))}
        <div style={{marginLeft:"auto",fontSize:11,color:T.tx3,lineHeight:"30px"}}>
          {visible.length} événement{visible.length>1?"s":""}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {visible_sorted.map((e,i) => {
          const cfg = actionCfg[e.type];
          return (
            <div key={e.id} style={{
              display:"flex",gap:12,padding:"10px 14px",
              background:"#fff",border:`1px solid ${T.bd}`,
              borderRadius:8,marginBottom:4,
              borderLeft:`4px solid ${e.success===false?T.red:cfg.color}`,
            }}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,flexShrink:0}}>
                <div style={{width:28,height:28,borderRadius:7,
                  background:cfg.color+"18",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:15}}>{cfg.icon}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,marginBottom:3,
                  color:e.success===false?T.red:T.tx}}>{e.message}</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:10,color:T.tx3}}>
                  <span>👤 {e.user}</span>
                  <span>🕐 {fmtDate(e.at)} {fmtTime(e.at)}</span>
                  {e.gps && <span>📍 {e.gps}</span>}
                  {e.durationMs && <span>⏱ {fmtDuration(e.durationMs)}</span>}
                  {e.offline && <Badge bg={T.amberL} color={T.amberD} style={{fontSize:9}}>offline</Badge>}
                  {e.success===false && <Badge bg={T.redL} color={T.red} style={{fontSize:9}}>échec</Badge>}
                </div>
                {e.errorMsg && (
                  <div style={{fontSize:10,color:T.red,marginTop:3}}>{e.errorMsg}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── FEEDBACK ───────────────────────────────────────────────────────────────────
const FeedbackPanel = ({feedbacks, onAdd, onResolve}) => {
  const [type, setType] = useState("bug");
  const [msg, setMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!msg.trim()) return;
    onAdd({id:uid(), type, message:msg.trim(),
      screenshot: type==="bug" ? "📸 Capture simulée" : undefined,
      at:nowISO(), user:"J. Moreau", resolved:false});
    setMsg("");
    setSubmitted(true);
    setTimeout(()=>setSubmitted(false), 2000);
  };

  return (
    <div>
      <SCard title="Signaler un retour terrain">
        <div style={{display:"flex",gap:7,marginBottom:10}}>
          {[["bug","🐛 Bug"],["suggestion","💡 Suggestion"],["bloquant","🚫 Bloquant"]].map(([v,l])=>(
            <button key={v} onClick={()=>setType(v)} style={{
              flex:1,padding:"8px 6px",borderRadius:8,fontSize:11,fontWeight:500,
              cursor:"pointer",border:"none",fontFamily:"inherit",
              background:type===v?{bug:T.amberL,suggestion:T.blueL,bloquant:T.redL}[v]:T.bg2,
              color:type===v?{bug:T.amberD,suggestion:T.blueD,bloquant:T.red}[v]:T.tx3,
            }}>{l}</button>
          ))}
        </div>
        <textarea value={msg} onChange={e=>setMsg(e.target.value)}
          placeholder="Décrivez le problème ou la suggestion…"
          rows={4} style={{width:"100%",padding:"10px",borderRadius:9,resize:"vertical",
            border:`1px solid ${T.bd2}`,fontSize:13,fontFamily:"inherit",
            outline:"none",lineHeight:1.5}}/>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <PBtn onClick={handleSubmit} disabled={!msg.trim()}>
            {submitted ? "✓ Envoyé !" : "Envoyer le retour"}
          </PBtn>
          <Btn onClick={()=>{}} bg={T.bg2} color={T.tx2}>📸 Capture écran auto</Btn>
        </div>
      </SCard>

      <SCard title={`Retours terrain (${feedbacks.length})`}>
        {feedbacks.map((f,i)=>{
          const cfgMap = {bug:{bg:T.amberL,c:T.amberD,ic:"🐛"},
            suggestion:{bg:T.blueL,c:T.blueD,ic:"💡"},
            bloquant:{bg:T.redL,c:T.red,ic:"🚫"}};
          const fc = cfgMap[f.type];
          return (
            <div key={f.id} style={{padding:"10px 0",borderBottom:i<feedbacks.length-1?`0.5px solid ${T.bd}`:"none",
              opacity:f.resolved?.65:1}}>
              <div style={{display:"flex",gap:7,alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:7,marginBottom:4,flexWrap:"wrap"}}>
                    <Badge bg={fc.bg} color={fc.c}>{fc.ic} {f.type}</Badge>
                    {f.resolved && <Badge bg={T.greenL} color={T.greenD}>Résolu ✓</Badge>}
                  </div>
                  <div style={{fontSize:12,color:T.tx,lineHeight:1.5}}>{f.message}</div>
                  <div style={{fontSize:10,color:T.tx3,marginTop:4}}>
                    {f.user} · {fmtDate(f.at)} {fmtTime(f.at)}
                    {f.screenshot && <span style={{marginLeft:8}}>{f.screenshot}</span>}
                  </div>
                </div>
                {!f.resolved && (
                  <Btn onClick={()=>onResolve(f.id)} bg={T.greenL} color={T.greenD} sm>Résoudre</Btn>
                )}
              </div>
            </div>
          );
        })}
      </SCard>
    </div>
  );
};

// ── PERFORMANCE METRICS ────────────────────────────────────────────────────────
const PerformancePanel = ({events}) => {
  const avg = (type) => {
    const matching = events.filter(e=>e.type===type&&e.durationMs&&e.success!==false);
    if (!matching.length) return 0;
    return Math.round(matching.reduce((s,e)=>s+e.durationMs,0)/matching.length/1000);
  };

  const metrics = [
    {l:"Saisie visite terrain",v:avg("visite"),target:120,unit:"s",icon:"🔭"},
    {l:"Ajout d'un tas",v:avg("tas"),target:30,unit:"s",icon:"📦"},
    {l:"Déchiquetage + CMR",v:avg("dechiq"),target:90,unit:"s",icon:"🪓"},
    {l:"Validation livraison",v:avg("livraison"),target:60,unit:"s",icon:"🏭"},
  ];

  return (
    <SCard title="Mesure de performance terrain">
      <div style={{marginBottom:12,padding:"8px 10px",background:T.blueL,borderRadius:9,
        fontSize:11,color:T.blueD}}>
        ℹ️ Temps mesurés depuis l'ouverture de l'écran jusqu'à la validation.
        Cible = moins de X secondes par action.
      </div>
      {metrics.map(m => {
        const ok = m.v <= m.target;
        const pct = Math.min(100, m.target>0 ? Math.round((m.target/Math.max(m.v,1))*100) : 0);
        return (
          <div key={m.l} style={{padding:"10px 0",borderBottom:`0.5px solid ${T.bd}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
              <div style={{display:"flex",gap:7,alignItems:"center"}}>
                <span style={{fontSize:15}}>{m.icon}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:500}}>{m.l}</div>
                  <div style={{fontSize:10,color:T.tx3}}>Cible : &lt; {fmtDurationSec(m.target)}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:18,fontWeight:700,color:ok?T.green:T.red}}>
                  {m.v ? fmtDurationSec(m.v) : "—"}
                </div>
                <Badge bg={ok?T.greenL:T.redL} color={ok?T.greenD:T.red}>
                  {ok?"✓ OK":"⚠ Lent"}
                </Badge>
              </div>
            </div>
            {m.v > 0 && (
              <div style={{height:4,background:T.bg2,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:ok?T.green:T.red,borderRadius:2}}/>
              </div>
            )}
          </div>
        );
      })}
    </SCard>
  );
};

// ── AUDIT SCREEN ───────────────────────────────────────────────────────────────
const AuditScreen = ({events}) => {
  const ok = events.filter(e=>e.success!==false);
  const failed = events.filter(e=>e.success===false);
  const offline = events.filter(e=>e.offline);
  const syncErrors = events.filter(e=>e.type==="sync"&&!e.success);
  const syncOk = events.filter(e=>e.type==="sync"&&e.success!==false);

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"Actions réussies",n:ok.length,c:T.green,i:"✓"},
          {l:"Actions échouées",n:failed.length,c:failed.length?T.red:T.green,i:"✗"},
          {l:"Actions offline",n:offline.length,c:T.blue,i:"📶"},
          {l:"Erreurs sync",n:syncErrors.length,c:syncErrors.length?T.red:T.green,i:"⟳"},
        ].map(({l,n,c,i})=>(
          <div key={l} style={{background:"#fff",border:`1px solid ${T.bd}`,
            borderRadius:10,padding:"13px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:8,background:c+"18",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:18,color:c,flexShrink:0}}>{i}</div>
            <div>
              <div style={{fontSize:22,fontWeight:700,color:c}}>{n}</div>
              <div style={{fontSize:11,color:T.tx3}}>{l}</div>
            </div>
          </div>
        ))}
      </div>

      <SCard title="Ce qui a fonctionné" extra={<Badge bg={T.greenL} color={T.greenD}>{ok.length}</Badge>}>
        {ok.slice(-6).reverse().map((e,i)=>{
          const cfg = actionCfg[e.type];
          return (
            <div key={e.id} style={{display:"flex",gap:8,padding:"6px 0",
              borderBottom:i<5?`0.5px solid ${T.bd}`:"none",fontSize:11}}>
              <span style={{fontSize:13}}>{cfg.icon}</span>
              <div style={{flex:1,color:T.tx}}>{e.message}</div>
              <span style={{color:T.tx3,flexShrink:0}}>{fmtDate(e.at)}</span>
            </div>
          );
        })}
      </SCard>

      {failed.length > 0 && (
        <SCard title="Ce qui a échoué" accent={T.red}
          extra={<Badge bg={T.redL} color={T.red}>{failed.length}</Badge>}>
          {failed.map((e,i)=>{
            const cfg = actionCfg[e.type];
            return (
              <div key={e.id} style={{padding:"8px 0",
                borderBottom:i<failed.length-1?`0.5px solid ${T.bd}`:"none"}}>
                <div style={{display:"flex",gap:7,marginBottom:3,fontSize:12}}>
                  <span>{cfg.icon}</span>
                  <span style={{color:T.red,fontWeight:500}}>{e.message}</span>
                </div>
                {e.errorMsg && <div style={{fontSize:10,color:T.red,marginLeft:20}}>{e.errorMsg}</div>}
                <div style={{fontSize:10,color:T.tx3,marginLeft:20}}>{fmtDate(e.at)} · {e.user}</div>
              </div>
            );
          })}
        </SCard>
      )}

      <SCard title="Synchronisation">
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:10}}>
          <span>Syncs réussies</span><span style={{fontWeight:600,color:T.green}}>{syncOk.length}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:10}}>
          <span>Syncs échouées</span><span style={{fontWeight:600,color:syncErrors.length?T.red:T.tx3}}>{syncErrors.length}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span>Taux de succès</span>
          <span style={{fontWeight:600,color:T.green}}>
            {syncOk.length+syncErrors.length>0
              ? Math.round(syncOk.length/(syncOk.length+syncErrors.length)*100)+"%" : "—"}
          </span>
        </div>
      </SCard>
    </div>
  );
};

// ── PDF RAPPORT ────────────────────────────────────────────────────────────────
const RapportPreview = ({sections, events, feedbacks, stats}) => {
  const {score} = calcScore(sections);
  const html = `
<div style="font-family:Arial,sans-serif;padding:24px;max-width:720px;margin:0 auto">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #1D9E75;margin-bottom:18px">
    <div>
      <div style="font-size:22px;font-weight:700;color:#1D9E75">🌲 APPLITAG</div>
      <div style="font-size:14px;color:#666">Rapport de fin de chantier pilote</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700">LOT-2025-007</div>
      <div style="font-size:12px;color:#666">Charny (89) · ${new Date().toLocaleDateString("fr-FR")}</div>
    </div>
  </div>

  <h2 style="font-size:16px;color:#1D9E75;border-bottom:1px solid #ddd;padding-bottom:6px">Score checklist</h2>
  <div style="font-size:32px;font-weight:700;color:${scoreColor(score)};margin-bottom:4px">${score}%</div>
  <div style="font-size:12px;color:#666;margin-bottom:16px">${scoreLabel(score)}</div>

  <h2 style="font-size:16px;color:#1D9E75;border-bottom:1px solid #ddd;padding-bottom:6px">Sections</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    ${sections.map(s => {
      const st = calcSectionStatus(s);
      const c = {ok:"#085041",incomplete:"#412402",blocking:"#A32D2D"}[st];
      const lbl = {ok:"✓ Complet",incomplete:"○ Incomplet",blocking:"✗ Bloquant"}[st];
      return `<tr>
        <td style="padding:5px 8px;border:1px solid #eee;font-size:12px">${s.icon} ${s.title}</td>
        <td style="padding:5px 8px;border:1px solid #eee;font-size:11px;font-weight:600;color:${c}">${lbl}</td>
        <td style="padding:5px 8px;border:1px solid #eee;font-size:11px;color:#666">${s.items.filter(i=>i.checked).length}/${s.items.length} items</td>
      </tr>`;
    }).join("")}
  </table>

  <h2 style="font-size:16px;color:#1D9E75;border-bottom:1px solid #ddd;padding-bottom:6px">Statistiques</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr><td style="padding:5px 8px;border:1px solid #eee;font-size:12px">Actions totales</td><td style="padding:5px 8px;border:1px solid #eee;font-size:12px;font-weight:600">${events.length}</td></tr>
    <tr><td style="padding:5px 8px;border:1px solid #eee;font-size:12px">Actions offline</td><td style="padding:5px 8px;border:1px solid #eee;font-size:12px;font-weight:600">${events.filter(e=>e.offline).length}</td></tr>
    <tr><td style="padding:5px 8px;border:1px solid #eee;font-size:12px">Documents générés</td><td style="padding:5px 8px;border:1px solid #eee;font-size:12px;font-weight:600">${events.filter(e=>e.type==="doc").length}</td></tr>
    <tr><td style="padding:5px 8px;border:1px solid #eee;font-size:12px">Feedbacks soumis</td><td style="padding:5px 8px;border:1px solid #eee;font-size:12px;font-weight:600">${feedbacks.length}</td></tr>
  </table>

  <h2 style="font-size:16px;color:#1D9E75;border-bottom:1px solid #ddd;padding-bottom:6px">Chronologie</h2>
  ${events.slice().sort((a,b)=>a.at.localeCompare(b.at)).map(e=>
    `<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:11px">
      <span style="color:#999;min-width:90px">${new Date(e.at).toLocaleDateString("fr-FR")} ${new Date(e.at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
      <span style="flex:1;color:${e.success===false?"#A32D2D":"#333"}">${e.message}</span>
      <span style="color:#999">${e.user}</span>
    </div>`
  ).join("")}

  <div style="margin-top:20px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px">
    Rapport généré automatiquement par APPLITAG · www.applitag.fr
  </div>
</div>`;
  return html;
};

// ── MAIN APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [sections, setSections] = useState(buildChecklist);
  const [events, setEvents] = useState(buildPiloteEvents);
  const [feedbacks, setFeedbacks] = useState(buildFeedbacks);
  const [page, setPage] = useState("dashboard");
  const [pdfModal, setPdfModal] = useState(null);
  const [toasts, setToasts] = useState([]);

  const toast = (msg, type="success") => {
    const id = uid();
    setToasts(t => [...t, {id,msg,type}]);
    setTimeout(() => setToasts(t => t.filter(x=>x.id!==id)), 3000);
  };

  const handleToggle = (secId, itemId) => {
    setSections(ss => ss.map(s =>
      s.id === secId
        ? {...s, items: s.items.map(i => i.id===itemId ? {...i,checked:!i.checked} : i)}
        : s
    ));
  };

  const addEvent = useCallback((type, message) => {
    setEvents(es => [...es, {
      id:uid(), type, message, user:"J. Moreau",
      offline:false, success:true, at:nowISO(),
    }]);
  }, []);

  const handleAddFeedback = (fb) => {
    setFeedbacks(f => [...f, fb]);
    addEvent("feedback", `Retour terrain soumis : ${fb.type} — ${fb.message.slice(0,50)}…`);
    toast("Retour envoyé — merci !");
  };

  const handleResolveFeedback = (id) => {
    setFeedbacks(f => f.map(x => x.id===id ? {...x,resolved:true} : x));
    toast("Feedback résolu ✓");
  };

  const handleRapport = () => {
    const html = RapportPreview({sections, events, feedbacks, stats:{}});
    setPdfModal(html);
    addEvent("doc","Rapport de fin de chantier généré — PDF");
    toast("Rapport généré");
  };

  const PAGES = [
    {id:"dashboard",label:"Dashboard",icon:"📊"},
    {id:"checklist",label:"Checklist",icon:"✅"},
    {id:"journal",  label:"Journal",  icon:"📋"},
    {id:"feedback", label:"Retour",   icon:"💬"},
    {id:"perf",     label:"Performance",icon:"📈"},
    {id:"audit",    label:"Audit",    icon:"🔍"},
  ];

  const {score} = calcScore(sections);

  return (
    <div style={{
      display:"flex",flexDirection:"column",height:"100vh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      background:T.bg,color:T.tx,
    }}>
      {/* Toasts */}
      <div style={{position:"fixed",top:14,right:14,zIndex:9998,
        display:"flex",flexDirection:"column",gap:6,pointerEvents:"none"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:"9px 15px",borderRadius:9,fontSize:12,fontWeight:500,
            background:t.type==="success"?T.greenD:t.type==="warn"?T.amberD:T.red,
            color:"#fff",boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>
            {t.type==="success"?"✓":t.type==="warn"?"⚠":"✗"} {t.msg}
          </div>
        ))}
      </div>

      {/* PDF Modal */}
      {pdfModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",
          display:"flex",alignItems:"flex-start",justifyContent:"center",
          zIndex:9999,padding:"20px",overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:760}}>
            <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.bd}`,background:T.bg,
              borderRadius:"14px 14px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:14,fontWeight:600}}>Rapport de fin de chantier — PDF</div>
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>window.print()} bg={T.blueL} color={T.blueD}>🖨️ Imprimer</Btn>
                <Btn onClick={()=>setPdfModal(null)}>✕ Fermer</Btn>
              </div>
            </div>
            <div style={{background:"#e0e0e0",padding:8}}>
              <div style={{background:"#fff"}} dangerouslySetInnerHTML={{__html:pdfModal}}/>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div style={{background:"#111",color:"#fff",padding:"10px 16px",
        display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:28,height:28,background:T.green,borderRadius:7,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🌲</div>
        <div>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:".02em"}}>APPLITAG</div>
          <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:".04em"}}>Pilote chantier</div>
        </div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{
            padding:"4px 10px",borderRadius:8,
            background:score>=80?T.greenL:score>=60?T.amberL:T.redL,
            color:score>=80?T.greenD:score>=60?T.amberD:T.red,
            fontSize:11,fontWeight:600,
          }}>Score {score}%</div>
          <Btn onClick={handleRapport} bg={T.purpleL} color={T.purpleD} sm>📄 Rapport PDF</Btn>
        </div>
      </div>

      {/* Nav */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.bd}`,
        padding:"0 16px",display:"flex",gap:0,overflowX:"auto",flexShrink:0}}>
        {PAGES.map(p=>(
          <button key={p.id} onClick={()=>setPage(p.id)} style={{
            padding:"10px 14px",fontSize:12,fontWeight:500,border:"none",
            cursor:"pointer",fontFamily:"inherit",background:"none",
            color:page===p.id?T.green:T.tx3,
            borderBottom:`2px solid ${page===p.id?T.green:"transparent"}`,
            display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",
          }}>
            <span>{p.icon}</span>{p.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>
        {page==="dashboard" && (
          <PiloteDashboard sections={sections} events={events} feedbacks={feedbacks} onNav={setPage}/>
        )}
        {page==="checklist" && (
          <Checklist sections={sections} onToggle={handleToggle} onAddEvent={addEvent}/>
        )}
        {page==="journal" && <Journal events={events}/>}
        {page==="feedback" && (
          <FeedbackPanel feedbacks={feedbacks} onAdd={handleAddFeedback} onResolve={handleResolveFeedback}/>
        )}
        {page==="perf" && <PerformancePanel events={events}/>}
        {page==="audit" && <AuditScreen events={events}/>}
      </div>
    </div>
  );
}
