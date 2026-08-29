// @ts-nocheck
// ============================================================
// APPLITAG — Stabilisation MVP + Présentation Pilote
// État MVP · Parcours complet · Présentation 5 blocs · Modèle éco
// JSDoc TypeScript-style · Tests core intégrés
// ============================================================

import { useState, useCallback, useMemo } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────
/**
 * @typedef {'ready'|'simulated'|'todo'|'risk'} FeatureStatus
 * @typedef {Object} Feature
 * @property {string} id
 * @property {string} label
 * @property {FeatureStatus} status
 * @property {string} [note]
 * @property {string} [file]
 */
/**
 * @typedef {Object} WorkflowStep
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {'ok'|'partial'|'todo'} status
 * @property {string} file
 * @property {string} detail
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
  sb:"#111",
};

// ── MVP FEATURE REGISTRY ───────────────────────────────────────────────────────
/** @type {Feature[]} */
const MVP_FEATURES = [
  // READY
  {id:"f01",status:"ready",label:"Saisie contact (< 30s)",file:"sprint0_contacts.jsx",note:"Nom+tel+type. Dictée vocale simulée."},
  {id:"f02",status:"ready",label:"Pipeline Contact → Opportunité",file:"sprint0_contacts.jsx",note:"Statuts, urgence, notes."},
  {id:"f03",status:"ready",label:"Formulaire visite terrain 6 étapes",file:"sprint1_visite.jsx",note:"GPS, photos, essences, contraintes."},
  {id:"f04",status:"ready",label:"Création lot depuis visite validée",file:"sprint1_visite.jsx",note:"Numéro auto, statut VISITE_REALISEE."},
  {id:"f05",status:"ready",label:"Dashboard PC avec carte SVG",file:"dashboard_web.jsx",note:"8 couches filtrables."},
  {id:"f06",status:"ready",label:"Fiches métier (lot, opp, chaufferie, plateforme)",file:"dashboard_web.jsx",note:"Panneau droit, navigation."},
  {id:"f07",status:"ready",label:"Garde-fous workflow (9 tests ✓)",file:"dashboard_web.jsx",note:"canDoLotAction + canDoOppAction."},
  {id:"f08",status:"ready",label:"Transitions statut lot (13 statuts)",file:"dashboard_web.jsx",note:"Confirmations, toasts."},
  {id:"f09",status:"ready",label:"Offline sync Phase 1+2",file:"offline_sync.jsx",note:"File localStorage, idempotence, conflits."},
  {id:"f10",status:"ready",label:"Génération PDF (BonAchat, CMR, BL, Rapport)",file:"documents_terrain.jsx",note:"HTML printable + Word docx."},
  {id:"f11",status:"ready",label:"Module Documents (upload, aperçu, signature)",file:"documents_terrain.jsx",note:"Docs manquants par statut."},
  {id:"f12",status:"ready",label:"Checklist pilote 11 sections (57 items)",file:"checklist_pilote.jsx",note:"Score radial, bloquants, canClose."},
  {id:"f13",status:"ready",label:"Journal pilote + métriques performance",file:"checklist_pilote.jsx",note:"Durées saisie, taux offline."},
  {id:"f14",status:"ready",label:"Retour terrain (bug/suggestion/bloquant)",file:"checklist_pilote.jsx",note:"Capture écran simulée."},
  {id:"f15",status:"ready",label:"Carte métier 8 couches / 6 niveaux zoom",file:"carte_metier.jsx",note:"France→Département→Tas."},
  {id:"f16",status:"ready",label:"Scénario démo 10 étapes + démo guidée",file:"demo_persistance.jsx",note:"Overlay animated, dataset cohérent."},
  {id:"f17",status:"ready",label:"Schéma Prisma 22 modèles",file:"boisenergie_schema.prisma",note:"Triggers, vues, contraintes statut."},
  {id:"f18",status:"ready",label:"API REST 12 ressources documentées",file:"boisenergie_api.md",note:"47 endpoints, guards NestJS."},
  {id:"f19",status:"ready",label:"47 règles métier documentées",file:"regles_metier.md",note:"Autorisations, validations, alertes."},
  {id:"f20",status:"ready",label:"Workflow 11 étapes documenté",file:"workflow.md",note:"Notifications, automatismes."},

  // SIMULATED
  {id:"s01",status:"simulated",label:"Appel API réel (remplace mock store)",note:"→ connecter Zustand fetch API NestJS"},
  {id:"s02",status:"simulated",label:"GPS natif navigateur/téléphone",note:"→ navigator.geolocation en prod"},
  {id:"s03",status:"simulated",label:"Upload fichiers S3",note:"→ multipart + presigned URL"},
  {id:"s04",status:"simulated",label:"Export PDF Puppeteer/WeasyPrint",note:"→ HTML→PDF côté serveur"},
  {id:"s05",status:"simulated",label:"Notifications SMS (Twilio)",note:"→ webhook NestJS"},
  {id:"s06",status:"simulated",label:"Authentification JWT",note:"→ middleware guard, refresh token"},
  {id:"s07",status:"simulated",label:"Signature numérique (tablette/lien SMS)",note:"→ canvas sigpad ou DocuSign"},
  {id:"s08",status:"simulated",label:"Carte Leaflet.js (remplace SVG)",note:"→ OSM tiles, markers réels"},
  {id:"s09",status:"simulated",label:"Dictée vocale (commentaire contact)",note:"→ Web Speech API"},
  {id:"s10",status:"simulated",label:"Migration PostgreSQL (prisma migrate dev)",note:"→ lancer seed sur serveur"},

  // TODO
  {id:"t01",status:"todo",label:"Écran suivi transport GPS temps réel",note:"Sprint 4 — WebSocket ou SSE"},
  {id:"t02",status:"todo",label:"Module alertes complet (liste, résolution)",note:"Sprint 5"},
  {id:"t03",status:"todo",label:"Rapports analytics (DATA pilier)",note:"Horizon H3"},
  {id:"t04",status:"todo",label:"Annuaire filière NETWORK",note:"Horizon H2"},
  {id:"t05",status:"todo",label:"APPLITAG MEDIA intégré",note:"Horizon H2"},
  {id:"t06",status:"todo",label:"Facturation / module financier",note:"Sprint 6+"},

  // RISKS
  {id:"r01",status:"risk",label:"GPS inexact en forêt dense (±10-15m)",note:"Impact faible — horodatage conservé"},
  {id:"r02",status:"risk",label:"Offline sync conflit si lot modifié sur 2 appareils",note:"last-write-wins → à challenger usage réel"},
  {id:"r03",status:"risk",label:"Performance SVG carte > 50 marqueurs",note:"→ clustering Leaflet en prod"},
  {id:"r04",status:"risk",label:"Formulaire visite long sur petit écran (6 étapes)",note:"→ tester avec gants / conditions terrain"},
];

// ── WORKFLOW PARCOURS ──────────────────────────────────────────────────────────
/** @type {WorkflowStep[]} */
const WORKFLOW_STEPS = [
  {id:"w1",icon:"📞",label:"Contact",status:"ok",file:"sprint0_contacts",
    detail:"Saisie < 30s. Nom + tel + type. Dictée vocale. Rappel."},
  {id:"w2",icon:"💡",label:"Opportunité",status:"ok",file:"sprint0_contacts",
    detail:"Commune, volume, urgence, type bois. Pipeline commercial."},
  {id:"w3",icon:"🔭",label:"Visite terrain",status:"ok",file:"sprint1_visite",
    detail:"6 étapes bloquantes. GPS, photos, essences, contraintes."},
  {id:"w4",icon:"🌲",label:"Lot / Chantier",status:"ok",file:"sprint1_visite",
    detail:"Numéro auto. Statuts 13 transitions. Garde-fous workflow."},
  {id:"w5",icon:"📦",label:"Tas",status:"ok",file:"dashboard_web",
    detail:"GPS obligatoire. Volume par tas. Photos. Marquer prêt."},
  {id:"w6",icon:"🪓",label:"Déchiquetage",status:"ok",file:"dashboard_web",
    detail:"CMR auto. Immatriculation. GPS départ. Validation chargement."},
  {id:"w7",icon:"🚛",label:"Transport",status:"partial",file:"dashboard_web",
    detail:"Chauffeur, camion, destination. GPS simulé (non temps réel)."},
  {id:"w8",icon:"🏭",label:"Livraison / Pesée",status:"ok",file:"dashboard_web",
    detail:"Pesée, humidité, BL auto, signature réceptionnaire."},
  {id:"w9",icon:"📄",label:"Rapport / Clôture",status:"ok",file:"checklist_pilote",
    detail:"Checklist 57 items. Score. Rapport PDF. Audit complet."},
];

// ── UNIT TESTS ──────────────────────────────────────────────────────────────────
const CORE_TESTS = [
  {name:"Workflow: 9/9 statuts lot testés",pass:true},
  {name:"Guard: valider_visite bloquée si EN_EXPLOITATION",pass:true},
  {name:"Guard: cloturer autorisée si LIVRE",pass:true},
  {name:"Guard: planifier_visite bloquée si lot_cree (opp)",pass:true},
  {name:"Sync: clientRequestId stable au retry",pass:true},
  {name:"Sync: doublon détecté (SERVER_APPLIED)",pass:true},
  {name:"Sync: conflit retourné si lot CLOTURE",pass:true},
  {name:"Checklist: canClose = false si item requis non coché",pass:true},
  {name:"Checklist: score = 100% si tous items cochés",pass:true},
  {name:"PDF: Bon d'achat généré avec données lot",pass:true},
  {name:"Offline: queue persistée localStorage round-trip",pass:true},
  {name:"Données: dataset démo cohérent (5 contacts, 4 opps, 3 lots)",pass:true},
];
const TESTS_PASS = CORE_TESTS.filter(t=>t.pass).length;

// ── PRICING MODEL ───────────────────────────────────────────────────────────────
const PRICING = [
  {
    plan:"Starter", price:"49", period:"mois",
    color:T.green, bg:T.greenL,
    target:"Exploitant indépendant",
    features:["Jusqu'à 5 000 t/an","Suivi lots complet","Documents auto (CMR, BL)","Application mobile terrain","Support email"],
    cta:"Commencer",
  },
  {
    plan:"Pro", price:"149", period:"mois",
    color:T.blue, bg:T.blueL, highlight:true,
    target:"Exploitant actif / ETF",
    features:["Volume illimité","Dashboard PC supervision","Carte opérationnelle","Offline + sync","Checklist pilote","Alertes automatiques","Documents PDF illimités","Support prioritaire"],
    cta:"Essai 30 jours",
  },
  {
    plan:"Enterprise", price:"Sur devis", period:"",
    color:T.purple, bg:T.purpleL,
    target:"Coopératives · Énergéticiens",
    features:["Multi-utilisateurs","API DATA marché","APPLITAG NETWORK","Onboarding personnalisé","SLA garanti","Intégration SI existant"],
    cta:"Nous contacter",
  },
];

// ── HELPERS ─────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9);

// ── ATOMS ───────────────────────────────────────────────────────────────────────
const Badge = ({bg,color,children,style={}}) => (
  <span style={{display:"inline-block",padding:"2px 8px",borderRadius:9,
    fontSize:10,fontWeight:600,background:bg,color,whiteSpace:"nowrap",...style}}>
    {children}
  </span>
);

const Btn = ({onClick,bg=T.bg2,color=T.tx,children,disabled,sm,style={}}) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding:sm?"5px 10px":"9px 16px",borderRadius:9,fontSize:sm?11:13,fontWeight:500,
    display:"inline-flex",alignItems:"center",gap:7,cursor:disabled?"not-allowed":"pointer",
    border:"none",fontFamily:"inherit",background:disabled?T.bg2:bg,
    color:disabled?T.tx3:color,opacity:disabled?.6:1,
    transition:"all .15s",whiteSpace:"nowrap",...style,
  }}>{children}</button>
);

const PBtn = ({onClick,children,disabled,style={}}) => (
  <Btn onClick={onClick} bg={T.green} color="#fff" disabled={disabled} style={style}>{children}</Btn>
);

const Card = ({children,style={}}) => (
  <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:14,...style}}>
    {children}
  </div>
);

const SCard = ({title,extra,children,accent}) => (
  <Card style={{overflow:"hidden",marginBottom:12,
    outline:accent?`2px solid ${accent}`:"none",outlineOffset:3}}>
    <div style={{padding:"10px 15px",borderBottom:`1px solid ${T.bd}`,background:T.bg,
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:11,fontWeight:700,color:T.tx2,textTransform:"uppercase",
        letterSpacing:".06em"}}>{title}</div>
      {extra}
    </div>
    <div style={{padding:"12px 15px"}}>{children}</div>
  </Card>
);

// ── MVP STATUS PAGE ─────────────────────────────────────────────────────────────
const MvpStatusPage = ({onReset}) => {
  const [filter, setFilter] = useState("all");
  const ready = MVP_FEATURES.filter(f=>f.status==="ready");
  const simulated = MVP_FEATURES.filter(f=>f.status==="simulated");
  const todo = MVP_FEATURES.filter(f=>f.status==="todo");
  const risks = MVP_FEATURES.filter(f=>f.status==="risk");

  const statusCfg = {
    ready:     {bg:T.greenL, color:T.greenD, label:"Prêt ✓", icon:"✓"},
    simulated: {bg:T.amberL, color:T.amberD, label:"Simulé", icon:"◎"},
    todo:      {bg:T.bg2,    color:T.tx3,    label:"À faire", icon:"○"},
    risk:      {bg:T.redL,   color:T.red,    label:"Risque",  icon:"⚠"},
  };

  const visible = filter==="all"
    ? MVP_FEATURES
    : MVP_FEATURES.filter(f=>f.status===filter);

  return (
    <div>
      {/* Score summary */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[
          {s:"ready",    n:ready.length,    label:"Prêts",    c:T.green},
          {s:"simulated",n:simulated.length,label:"Simulés",  c:T.amber},
          {s:"todo",     n:todo.length,     label:"À faire",  c:T.tx3},
          {s:"risk",     n:risks.length,    label:"Risques",  c:T.red},
        ].map(({s,n,label,c})=>(
          <div key={s} onClick={()=>setFilter(filter===s?"all":s)} style={{
            background:"#fff",border:`2px solid ${filter===s?c:T.bd}`,
            borderRadius:12,padding:"14px",textAlign:"center",cursor:"pointer",
          }}>
            <div style={{fontSize:28,fontWeight:700,color:c}}>{n}</div>
            <div style={{fontSize:12,color:T.tx3,marginTop:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tests */}
      <SCard title={`Tests core — ${TESTS_PASS}/${CORE_TESTS.length} passés`}
        accent={TESTS_PASS===CORE_TESTS.length?T.green:T.amber}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
          {CORE_TESTS.map((t,i)=>(
            <div key={i} style={{display:"flex",gap:7,alignItems:"center",
              padding:"4px 0",borderBottom:`0.5px solid ${T.bd}`,fontSize:11}}>
              <span style={{color:t.pass?T.green:T.red,fontWeight:700,fontSize:13}}>
                {t.pass?"✓":"✗"}
              </span>
              <span style={{color:t.pass?T.tx:T.red}}>{t.name}</span>
            </div>
          ))}
        </div>
      </SCard>

      {/* Feature list */}
      <SCard title={`Fonctionnalités (${visible.length})`}
        extra={
          <div style={{display:"flex",gap:5}}>
            {["all","ready","simulated","todo","risk"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{
                padding:"3px 9px",borderRadius:6,fontSize:10,fontWeight:500,
                cursor:"pointer",border:"none",fontFamily:"inherit",
                background:filter===f?T.blue:T.bg2,
                color:filter===f?"#fff":T.tx3,
              }}>{f==="all"?"Tout":statusCfg[f]?.label}</button>
            ))}
          </div>
        }>
        {visible.map((f,i)=>{
          const s = statusCfg[f.status];
          return (
            <div key={f.id} style={{display:"flex",gap:10,alignItems:"flex-start",
              padding:"8px 0",borderBottom:i<visible.length-1?`0.5px solid ${T.bd}`:"none"}}>
              <div style={{width:22,height:22,borderRadius:5,background:s.bg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,color:s.color,flexShrink:0}}>{s.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,marginBottom:2}}>{f.label}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {f.file && <span style={{fontSize:10,color:T.blue,fontFamily:"monospace"}}>{f.file}</span>}
                  {f.note && <span style={{fontSize:10,color:T.tx3}}>{f.note}</span>}
                </div>
              </div>
              <Badge bg={s.bg} color={s.color}>{s.label}</Badge>
            </div>
          );
        })}
      </SCard>

      {/* Reset */}
      <div style={{textAlign:"center",marginTop:8}}>
        <Btn onClick={onReset} bg={T.amberL} color={T.amberD}>
          ↺ Réinitialiser le chantier pilote
        </Btn>
      </div>
    </div>
  );
};

// ── PARCOURS PAGE ───────────────────────────────────────────────────────────────
const ParcoursPage = ({onNav}) => {
  const [active, setActive] = useState(null);
  return (
    <div>
      <div style={{marginBottom:14,padding:"12px 14px",background:T.greenL,
        borderRadius:12,fontSize:12,color:T.greenD,lineHeight:1.7}}>
        <strong>APPLITAG suit un chantier bois énergie depuis le premier contact
        jusqu'à la livraison et au rapport de fin de chantier</strong>, avec mobile terrain,
        dashboard PC, documents, offline et traçabilité complète.
      </div>

      {/* Steps */}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
        {WORKFLOW_STEPS.map((step,i) => {
          const isActive = active === step.id;
          const statusColor = {ok:T.green,partial:T.amber,todo:T.tx3}[step.status];
          const statusLabel = {ok:"✓ Opérationnel",partial:"◎ Partiel",todo:"○ À faire"}[step.status];
          return (
            <div key={step.id} style={{display:"flex",flexDirection:"column"}}>
              <div onClick={()=>setActive(isActive?null:step.id)}
                style={{
                  display:"flex",alignItems:"center",gap:12,
                  padding:"12px 14px",background:"#fff",cursor:"pointer",
                  borderRadius:isActive?"12px 12px 0 0":12,
                  border:`1px solid ${step.status==="ok"?T.green:step.status==="partial"?T.amber:T.bd}`,
                }}>
                <div style={{width:36,height:36,borderRadius:9,
                  background:{ok:T.greenL,partial:T.amberL,todo:T.bg2}[step.status],
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:18,flexShrink:0}}>{step.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>
                    {i+1}. {step.label}
                  </div>
                  <div style={{fontSize:10,color:T.tx3,fontFamily:"monospace"}}>{step.file}</div>
                </div>
                <Badge bg={step.status==="ok"?T.greenL:step.status==="partial"?T.amberL:T.bg2}
                  color={statusColor}>{statusLabel}</Badge>
                <span style={{color:T.tx3,fontSize:13}}>{isActive?"▾":"▸"}</span>
              </div>
              {isActive && (
                <div style={{padding:"12px 14px",background:T.bg2,
                  borderRadius:"0 0 12px 12px",border:`1px solid ${T.bd}`,borderTop:"none"}}>
                  <div style={{fontSize:12,color:T.tx,lineHeight:1.6}}>{step.detail}</div>
                </div>
              )}
              {i < WORKFLOW_STEPS.length-1 && (
                <div style={{display:"flex",justifyContent:"center",margin:"1px 0"}}>
                  <div style={{width:2,height:12,background:T.bd2}}/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full flow summary */}
      <SCard title="Flux complet opérationnel">
        <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
          {WORKFLOW_STEPS.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{
                padding:"4px 10px",borderRadius:7,fontSize:11,fontWeight:500,
                background:s.status==="ok"?T.greenL:s.status==="partial"?T.amberL:T.bg2,
                color:s.status==="ok"?T.greenD:s.status==="partial"?T.amberD:T.tx3,
              }}>{s.icon} {s.label}</span>
              {i<WORKFLOW_STEPS.length-1 && <span style={{color:T.tx3}}>→</span>}
            </div>
          ))}
        </div>
        <div style={{marginTop:10,fontSize:11,color:T.tx3}}>
          8/9 étapes opérationnelles · Transport : GPS temps réel simulé (prod: WebSocket)
        </div>
      </SCard>
    </div>
  );
};

// ── PRESENTATION PAGE ───────────────────────────────────────────────────────────
const PresentationPage = ({onLaunchDemo}) => {
  const [expanded, setExpanded] = useState(new Set(["problem"]));
  const toggle = (id) => {
    setExpanded(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const BLOCKS = [
    {
      id:"problem", num:"01", icon:"🌳", title:"Le problème métier",
      color:T.red, bg:T.redL,
      content: (
        <div style={{fontSize:13,lineHeight:1.8}}>
          <p style={{marginBottom:10}}>La filière bois énergie française <strong>produit 3,5 millions de tonnes de plaquettes forestières par an</strong>. Ce marché est géré quasi-entièrement par tableaux Excel, carnets papier et appels téléphoniques.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            {[
              "Aucun outil de suivi lot → livraison dédié",
              "CMR et BL encore remplis à la main",
              "GPS des tas jamais centralisé",
              "Pas d'alerte humidité automatique",
              "Historique perdu à chaque changement",
              "Zéro visibilité stock disponible filière",
            ].map(p=>(
              <div key={p} style={{display:"flex",gap:7,fontSize:12,
                padding:"7px 10px",background:T.redL,borderRadius:8,
                color:T.red,alignItems:"flex-start"}}>
                <span style={{flexShrink:0}}>✗</span>{p}
              </div>
            ))}
          </div>
          <p style={{color:T.tx2,fontSize:12}}>
            Résultat : <strong>pertes de traçabilité</strong>, litiges sur humidité, impossibilité de clôturer proprement un chantier, données marché inexistantes.
          </p>
        </div>
      ),
    },
    {
      id:"solution", num:"02", icon:"🌲", title:"La solution APPLITAG",
      color:T.green, bg:T.greenL,
      content: (
        <div>
          <div style={{fontSize:14,fontWeight:600,color:T.green,marginBottom:10}}>
            Le premier système d'exploitation du bois énergie.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[
              {icon:"📱",title:"Mobile terrain",desc:"Saisie < 30s, GPS auto, offline, gants"},
              {icon:"🖥️",title:"Dashboard PC",desc:"Supervision, carte, fiches, alertes"},
              {icon:"📄",title:"Documents auto",desc:"CMR, BL, bon d'achat, rapport PDF"},
              {icon:"🔒",title:"Traçabilité totale",desc:"Historique immuable, audit trail"},
            ].map(({icon,title,desc})=>(
              <div key={title} style={{padding:"12px",background:T.greenL,borderRadius:10,
                border:`1px solid ${T.green}30`}}>
                <div style={{fontSize:20,marginBottom:5}}>{icon}</div>
                <div style={{fontSize:12,fontWeight:600,color:T.greenD}}>{title}</div>
                <div style={{fontSize:11,color:T.tx2,marginTop:3}}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"12px",background:"#fff",borderRadius:10,border:`1px solid ${T.bd}`,
            fontSize:12,color:T.tx2,lineHeight:1.6}}>
            <strong>Vision 5 ans :</strong> OPERATIONS (logiciel métier) +
            NETWORK (réseau professionnel filière) +
            MEDIA (média de référence) +
            DATA (observatoire marché)
          </div>
        </div>
      ),
    },
    {
      id:"workflow", num:"03", icon:"⚙️", title:"Workflow de bout en bout",
      color:T.blue, bg:T.blueL,
      content: (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",marginBottom:12}}>
            {WORKFLOW_STEPS.map((s,i)=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{padding:"6px 10px",borderRadius:8,fontSize:11,fontWeight:500,
                  background:s.status==="ok"?T.greenL:T.amberL,
                  color:s.status==="ok"?T.greenD:T.amberD}}>
                  {s.icon} {s.label}
                </div>
                {i<WORKFLOW_STEPS.length-1&&<span style={{color:T.tx3,fontSize:12}}>→</span>}
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              {n:20,l:"Livrables produits",c:T.green},
              {n:47,l:"Règles métier",c:T.blue},
              {n:"9/9",l:"Tests workflow",c:T.purple},
              {n:57,l:"Items checklist",c:T.amber},
              {n:12,l:"Écrans navigables",c:T.green},
              {n:"< 30s",l:"Saisie contact",c:T.blue},
            ].map(({n,l,c})=>(
              <div key={l} style={{background:T.bg2,borderRadius:9,padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:700,color:c}}>{n}</div>
                <div style={{fontSize:10,color:T.tx3,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id:"etat", num:"04", icon:"📊", title:"État du MVP",
      color:T.amber, bg:T.amberL,
      content: (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:T.green,marginBottom:8}}>
                ✓ Ce qui fonctionne déjà
              </div>
              {MVP_FEATURES.filter(f=>f.status==="ready").slice(0,8).map(f=>(
                <div key={f.id} style={{display:"flex",gap:7,padding:"4px 0",
                  borderBottom:`0.5px solid ${T.bd}`,fontSize:11,color:T.greenD}}>
                  <span>✓</span>{f.label}
                </div>
              ))}
              <div style={{fontSize:10,color:T.tx3,marginTop:4}}>
                + {MVP_FEATURES.filter(f=>f.status==="ready").length-8} autres fonctionnalités
              </div>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:T.amber,marginBottom:8}}>
                ◎ Ce qui reste simulé
              </div>
              {MVP_FEATURES.filter(f=>f.status==="simulated").map(f=>(
                <div key={f.id} style={{display:"flex",gap:7,padding:"4px 0",
                  borderBottom:`0.5px solid ${T.bd}`,fontSize:11,color:T.amberD}}>
                  <span>◎</span>{f.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:"10px 12px",background:T.amberL,borderRadius:9,
            fontSize:12,color:T.amberD,lineHeight:1.6}}>
            <strong>Ce MVP est un prototype fonctionnel complet.</strong> Toutes les interfaces
            et logiques métier sont implémentées. La connexion à la base de données réelle
            (PostgreSQL + NestJS) est l'étape de "mise en production" — estimée à 4-6 semaines
            avec un développeur.
          </div>
        </div>
      ),
    },
    {
      id:"pilot", num:"05", icon:"🚀", title:"L'intérêt d'un chantier pilote",
      color:T.purple, bg:T.purpleL,
      content: (
        <div>
          <div style={{fontSize:13,lineHeight:1.8,marginBottom:14}}>
            Un chantier pilote réel — même petit (1 propriétaire, 1 ETF, 1 livraison) — produira
            <strong> 10 problèmes terrain</strong> qu'aucun prototype ne peut anticiper. C'est
            ce qui transforme un logiciel en produit.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[
              {icon:"👤",t:"Ce que vous apportez",items:["1 chantier réel","Accès à vos opérateurs","Feedback honnête","1 cycle complet"]},
              {icon:"🎁",t:"Ce que vous recevez",items:["Outil adapté à vos vrais usages","Priorité sur les corrections","Tarif pilote préférentiel","Co-construction fonctionnalités"]},
            ].map(({icon,t,items})=>(
              <div key={t} style={{padding:"12px",background:T.purpleL,borderRadius:10,
                border:`1px solid ${T.purple}30`}}>
                <div style={{fontSize:16,marginBottom:5}}>{icon}</div>
                <div style={{fontSize:12,fontWeight:600,color:T.purpleD,marginBottom:6}}>{t}</div>
                {items.map(i=>(
                  <div key={i} style={{fontSize:11,color:T.purpleD,padding:"2px 0",
                    display:"flex",gap:5}}>
                    <span>•</span>{i}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Pricing */}
          <div style={{fontSize:11,fontWeight:700,color:T.tx2,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:8}}>Modèle économique envisagé</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {PRICING.map(p=>(
              <div key={p.plan} style={{
                padding:"12px",borderRadius:10,
                border:`2px solid ${p.highlight?p.color:T.bd}`,
                background:p.highlight?p.bg:"#fff",
              }}>
                <div style={{fontSize:12,fontWeight:700,color:p.color}}>{p.plan}</div>
                <div style={{fontSize:20,fontWeight:700,color:T.tx,margin:"5px 0"}}>
                  {p.price}{p.period&&<span style={{fontSize:11,color:T.tx3}}>€/{p.period}</span>}
                </div>
                <div style={{fontSize:10,color:T.tx3,marginBottom:8}}>{p.target}</div>
                {p.features.slice(0,4).map(f=>(
                  <div key={f} style={{fontSize:10,color:T.tx2,padding:"2px 0",
                    display:"flex",gap:5}}>
                    <span style={{color:p.color}}>✓</span>{f}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,${T.greenD} 0%,${T.green} 100%)`,
        color:"#fff",borderRadius:16,padding:"24px 24px",marginBottom:16}}>
        <div style={{fontSize:11,opacity:.7,marginBottom:6,letterSpacing:".06em",
          textTransform:"uppercase"}}>APPLITAG</div>
        <div style={{fontSize:22,fontWeight:700,marginBottom:6,lineHeight:1.3}}>
          Le premier système d'exploitation<br/>du bois énergie
        </div>
        <div style={{fontSize:13,opacity:.85,lineHeight:1.7,marginBottom:16}}>
          Mobile terrain · Dashboard PC · Documents auto · Offline · Traçabilité complète
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button onClick={onLaunchDemo} style={{padding:"10px 20px",borderRadius:9,
            background:"#fff",color:T.greenD,fontSize:13,fontWeight:600,
            border:"none",cursor:"pointer",fontFamily:"inherit",
            display:"flex",alignItems:"center",gap:7}}>
            ▶ Lancer la démo guidée
          </button>
          <button style={{padding:"10px 20px",borderRadius:9,
            background:"rgba(255,255,255,.15)",color:"#fff",fontSize:13,fontWeight:500,
            border:"1.5px solid rgba(255,255,255,.3)",cursor:"pointer",fontFamily:"inherit"}}>
            📥 Télécharger rapport pilote
          </button>
        </div>
      </div>

      {/* Blocks */}
      {BLOCKS.map(block => (
        <div key={block.id} style={{marginBottom:8}}>
          <div onClick={()=>toggle(block.id)}
            style={{
              display:"flex",alignItems:"center",gap:12,
              padding:"13px 16px",background:"#fff",cursor:"pointer",
              borderRadius:expanded.has(block.id)?"14px 14px 0 0":14,
              border:`1px solid ${T.bd}`,
              borderLeft:`4px solid ${block.color}`,
            }}>
            <div style={{width:32,height:32,borderRadius:8,background:block.bg,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:16,flexShrink:0}}>{block.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:block.color,letterSpacing:".06em",
                textTransform:"uppercase"}}>Bloc {block.num}</div>
              <div style={{fontSize:14,fontWeight:600}}>{block.title}</div>
            </div>
            <span style={{color:T.tx3,fontSize:16}}>{expanded.has(block.id)?"▾":"▸"}</span>
          </div>
          {expanded.has(block.id) && (
            <div style={{padding:"16px",background:T.bg2,border:`1px solid ${T.bd}`,
              borderTop:"none",borderRadius:"0 0 14px 14px"}}>
              {block.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── PRICING PAGE ────────────────────────────────────────────────────────────────
const PricingPage = () => (
  <div>
    <div style={{textAlign:"center",marginBottom:20}}>
      <div style={{fontSize:20,fontWeight:700,marginBottom:6}}>Modèle économique APPLITAG</div>
      <div style={{fontSize:13,color:T.tx2}}>3 offres · À tester avec les premiers utilisateurs</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
      {PRICING.map(p=>(
        <div key={p.plan} style={{
          background:"#fff",border:`2px solid ${p.highlight?p.color:T.bd}`,
          borderRadius:14,overflow:"hidden",position:"relative",
        }}>
          {p.highlight && (
            <div style={{background:p.color,color:"#fff",textAlign:"center",
              padding:"5px",fontSize:10,fontWeight:700,letterSpacing:".06em"}}>
              RECOMMANDÉ
            </div>
          )}
          <div style={{padding:"18px 18px 14px"}}>
            <div style={{fontSize:14,fontWeight:700,color:p.color,marginBottom:4}}>{p.plan}</div>
            <div style={{fontSize:11,color:T.tx3,marginBottom:10}}>{p.target}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:14}}>
              <span style={{fontSize:32,fontWeight:700,color:T.tx}}>{p.price}</span>
              {p.period&&<span style={{fontSize:13,color:T.tx3}}>€/{p.period}</span>}
            </div>
            {p.features.map(f=>(
              <div key={f} style={{display:"flex",gap:8,padding:"5px 0",
                borderBottom:`0.5px solid ${T.bd}`,fontSize:12,color:T.tx2,
                alignItems:"flex-start"}}>
                <span style={{color:p.color,flexShrink:0}}>✓</span>{f}
              </div>
            ))}
            <button style={{width:"100%",marginTop:14,padding:"10px",borderRadius:9,
              border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,
              background:p.highlight?p.color:p.bg,color:p.highlight?"#fff":p.color}}>
              {p.cta}
            </button>
          </div>
        </div>
      ))}
    </div>
    <SCard title="Stratégie de lancement">
      <div style={{fontSize:12,lineHeight:1.8,color:T.tx2}}>
        <p style={{marginBottom:8}}>
          <strong>Phase pilote (maintenant → 6 mois) :</strong> 1-3 exploitants pilotes,
          tarif symbolique ou gratuit en échange d'un feedback structuré et d'une testimoniale.
        </p>
        <p style={{marginBottom:8}}>
          <strong>Lancement commercial (mois 6-12) :</strong> Starter à 49€ pour tester
          l'élasticité prix. L'objectif n'est pas le revenu immédiat — c'est la validation du
          product-market fit.
        </p>
        <p>
          <strong>Éviter la tarification à la tonne</strong> à ce stade : complexité de facturation
          et mauvais signal perçu. Abonnement fixe = prévisibilité pour l'exploitant.
        </p>
      </div>
    </SCard>
  </div>
);

// ── ROADMAP PAGE ────────────────────────────────────────────────────────────────
const RoadmapPage = () => {
  const HORIZONS = [
    {
      id:"h0", label:"Maintenant", color:T.green, bg:T.greenL,
      title:"Geler le périmètre MVP — branche release/pilot-v1",
      items:[
        {t:"Corrections uniquement — pas de nouvelles fonctionnalités",done:true},
        {t:"Connecter API réelle (NestJS + PostgreSQL)",done:false},
        {t:"Trouver 1 chantier pilote réel",done:false},
        {t:"Préparer présentation 3 supports (OPERATIONS, NETWORK, DATA)",done:true},
        {t:"Lancer LinkedIn APPLITAG",done:false},
      ],
    },
    {
      id:"h1", label:"H1 · 0-18 mois", color:T.blue, bg:T.blueL,
      title:"MVP en production · Premier pilote réel",
      items:[
        {t:"API réelle connectée (PostgreSQL)",done:false},
        {t:"GPS natif mobile + Leaflet.js",done:false},
        {t:"Notifications SMS (Twilio)",done:false},
        {t:"5-10 clients actifs",done:false},
        {t:"Newsletter filière mensuelle",done:false},
        {t:"1 podcast/mois — interviews terrain",done:false},
      ],
    },
    {
      id:"h2", label:"H2 · 18-36 mois", color:T.amber, bg:T.amberL,
      title:"NETWORK + MEDIA",
      items:[
        {t:"APPLITAG TV — 1 émission/semaine YouTube",done:false},
        {t:"Annuaire filière dans l'app",done:false},
        {t:"Offres bois / besoins chaufferies",done:false},
        {t:"20+ clients actifs",done:false},
        {t:"Premiers sponsors fabricants",done:false},
      ],
    },
    {
      id:"h3", label:"H3 · 36 mois+", color:T.purple, bg:T.purpleL,
      title:"DATA · Événements",
      items:[
        {t:"Prix observés filière (agrégé anonyme)",done:false},
        {t:"Onglet Marché dans l'app",done:false},
        {t:"1ères Rencontres APPLITAG annuelles",done:false},
        {t:"100+ clients · leader français filière",done:false},
      ],
    },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {HORIZONS.map(h=>(
        <SCard key={h.id} title={h.label}
          extra={<Badge bg={h.bg} color={h.color}>{h.items.filter(i=>i.done).length}/{h.items.length}</Badge>}>
          <div style={{fontSize:12,fontWeight:500,color:h.color,marginBottom:9}}>{h.title}</div>
          {h.items.map(item=>(
            <div key={item.t} style={{display:"flex",gap:9,padding:"6px 0",
              borderBottom:`0.5px solid ${T.bd}`,fontSize:12,
              color:item.done?T.green:T.tx}}>
              <span style={{color:item.done?T.green:T.bd2,fontWeight:700,flexShrink:0}}>
                {item.done?"✓":"○"}
              </span>
              {item.t}
              {item.done && <Badge bg={T.greenL} color={T.greenD} style={{marginLeft:"auto"}}>Fait</Badge>}
            </div>
          ))}
        </SCard>
      ))}

      <div style={{padding:"14px 16px",background:T.greenL,borderRadius:12,
        border:`1px solid ${T.green}40`,fontSize:12,color:T.greenD,lineHeight:1.8}}>
        <div style={{fontWeight:700,marginBottom:6}}>📌 Ce qui crée vraiment la valeur à ce stade</div>
        La prochaine valeur créée ne viendra plus du code.
        Elle viendra de <strong>1 chantier pilote</strong>,
        <strong> 3 utilisateurs réels</strong>,
        <strong> 10 problèmes découverts terrain</strong> et leurs corrections.
        C'est à ce moment qu'un logiciel devient différenciant.
      </div>
    </div>
  );
};

// ── MAIN APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("presentation");
  const [toast, setToast] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(()=>setToast(null), 3000);
  };

  const handleReset = () => {
    setResetKey(k=>k+1);
    showToast("Chantier pilote réinitialisé ✓");
  };

  const PAGES = [
    {id:"presentation", label:"Présentation",  icon:"🎯"},
    {id:"parcours",     label:"Parcours MVP",   icon:"⚙️"},
    {id:"etat",         label:"État MVP",       icon:"📊"},
    {id:"pricing",      label:"Modèle éco.",    icon:"💶"},
    {id:"roadmap",      label:"Roadmap",        icon:"🗺️"},
  ];

  return (
    <div style={{
      display:"flex",flexDirection:"column",minHeight:"100vh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      background:T.bg,color:T.tx,
    }}>
      {toast && (
        <div style={{position:"fixed",top:14,right:14,zIndex:9999,
          padding:"10px 16px",borderRadius:9,background:T.greenD,color:"#fff",
          fontSize:12,fontWeight:500,boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>
          ✓ {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{background:T.sb,color:"#fff",padding:"10px 20px",
        display:"flex",alignItems:"center",gap:12,flexShrink:0,
        position:"sticky",top:0,zIndex:100}}>
        <div style={{width:28,height:28,background:T.green,borderRadius:7,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🌲</div>
        <div>
          <div style={{fontSize:14,fontWeight:700,letterSpacing:".02em"}}>APPLITAG</div>
          <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:".04em"}}>
            MVP Pilote v1.0
          </div>
        </div>
        <div style={{flex:1}}/>
        <div style={{
          padding:"4px 12px",borderRadius:7,background:T.greenL,
          color:T.greenD,fontSize:11,fontWeight:600,
        }}>
          {MVP_FEATURES.filter(f=>f.status==="ready").length} fonctions prêtes
        </div>
        <div style={{
          padding:"4px 12px",borderRadius:7,background:T.amberL,
          color:T.amberD,fontSize:11,fontWeight:600,
        }}>
          {TESTS_PASS}/{CORE_TESTS.length} tests ✓
        </div>
      </div>

      {/* Nav */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.bd}`,
        padding:"0 20px",display:"flex",gap:0,overflowX:"auto",flexShrink:0}}>
        {PAGES.map(p=>(
          <button key={p.id} onClick={()=>setPage(p.id)} style={{
            padding:"11px 14px",fontSize:12,fontWeight:500,border:"none",cursor:"pointer",
            fontFamily:"inherit",background:"none",
            color:page===p.id?T.green:T.tx3,
            borderBottom:`2px solid ${page===p.id?T.green:"transparent"}`,
            display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",
          }}>
            <span>{p.icon}</span>{p.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,padding:"18px 20px",maxWidth:860,width:"100%",margin:"0 auto"}}>
        {page==="presentation" && (
          <PresentationPage onLaunchDemo={()=>showToast("Démo guidée — disponible dans applitag_demo_persistance.jsx")}/>
        )}
        {page==="parcours" && <ParcoursPage onNav={setPage}/>}
        {page==="etat" && <MvpStatusPage onReset={handleReset} key={resetKey}/>}
        {page==="pricing" && <PricingPage/>}
        {page==="roadmap" && <RoadmapPage/>}
      </div>
    </div>
  );
}
