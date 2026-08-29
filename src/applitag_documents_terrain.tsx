// @ts-nocheck
// ============================================================
// APPLITAG — Documents Terrain (Sprint 3 + Pilote)
// Bon achat · Autorisation · CMR · BL · Rapport · Photos
// PDF generation · Upload · Offline sync · Fiche lot
// JSDoc TypeScript-style
// ============================================================

import { useState, useCallback, useMemo } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────
/**
 * @typedef {'bon_achat'|'autorisation'|'cmr'|'bon_livraison'|'rapport_chantier'|'photo'|'analyse_humidite'} DocType
 * @typedef {'draft'|'generated'|'uploaded'|'signed'|'pending_sync'} DocStatus
 * @typedef {'lot'|'transport'|'livraison'|'contact'} DocRefType
 */

/**
 * @typedef {Object} Document
 * @property {string} id
 * @property {DocType} type
 * @property {string} titre
 * @property {DocStatus} status
 * @property {DocRefType} refType
 * @property {string} refId
 * @property {string} refLabel
 * @property {string} [url]
 * @property {string} [thumbnailEmoji]
 * @property {string} [notes]
 * @property {string} createurNom
 * @property {string} createdAt
 * @property {string} [signedAt]
 * @property {boolean} pendingSync
 */

/**
 * @typedef {Object} CompanySettings
 * @property {string} raisonSociale
 * @property {string} siret
 * @property {string} adresse
 * @property {string} telephone
 * @property {string} email
 * @property {string} logoEmoji
 */

// ── TOKENS ─────────────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75", greenL:"#E1F5EE", greenD:"#085041",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  blue:"#185FA5",  blueL:"#E6F1FB",  blueD:"#042C53",
  amber:"#BA7517", amberL:"#FAEEDA", amberD:"#412402",
  red:"#A32D2D",   redL:"#FCEBEB",
  bg:"#F5F4F1", bg2:"#ECEAE6",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
};

// ── HELPERS ─────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,10);
const nowISO = () => new Date().toISOString();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";

/** @type {Record<DocType,{icon:string,label:string,color:string,bg:string,canGenerate:boolean}>} */
const DOC_CFG = {
  bon_achat:       {icon:"🤝",label:"Bon d'achat",       color:T.green,  bg:T.greenL,  canGenerate:true},
  autorisation:    {icon:"📋",label:"Autorisation",       color:T.blue,   bg:T.blueL,   canGenerate:true},
  cmr:             {icon:"🚛",label:"CMR",                color:T.purple, bg:T.purpleL, canGenerate:true},
  bon_livraison:   {icon:"📦",label:"Bon de livraison",   color:T.green,  bg:T.greenL,  canGenerate:true},
  rapport_chantier:{icon:"📊",label:"Rapport chantier",   color:T.amber,  bg:T.amberL,  canGenerate:true},
  photo:           {icon:"📷",label:"Photo terrain",      color:T.tx2,    bg:T.bg2,     canGenerate:false},
  analyse_humidite:{icon:"💧",label:"Analyse humidité",   color:T.blue,   bg:T.blueL,   canGenerate:false},
};

const docStatusBadge = (s) => ({
  draft:        {bg:T.bg2,    color:T.tx2,    label:"Brouillon"},
  generated:    {bg:T.blueL,  color:T.blueD,  label:"Généré"},
  uploaded:     {bg:T.purpleL,color:T.purpleD,label:"Uploadé"},
  signed:       {bg:T.greenL, color:T.greenD, label:"Signé ✓"},
  pending_sync: {bg:T.amberL, color:T.amberD, label:"Hors ligne ⟳"},
}[s] ?? {bg:T.bg2,color:T.tx2,label:s});

// Documents obligatoires par statut lot
/** @type {Record<string,DocType[]>} */
const DOCS_REQUIRED_BY_STATUS = {
  VISITE_REALISEE:      ["photo"],
  VALIDE_EXPLOITATION:  ["autorisation","bon_achat"],
  A_DECHIQUETER:        ["cmr"],
  EN_TRANSPORT:         ["cmr"],
  LIVRE:                ["bon_livraison"],
  CLOTURE:              ["bon_livraison","cmr"],
};

/** @param {DocType[]} docTypes @param {string} lotStatut @returns {DocType[]} */
const getMissingDocs = (docTypes, lotStatut) => {
  const required = DOCS_REQUIRED_BY_STATUS[lotStatut] ?? [];
  return required.filter(r => !docTypes.includes(r));
};

// ── MOCK DATA ───────────────────────────────────────────────────────────────────
/** @type {CompanySettings} */
const DEFAULT_SETTINGS = {
  raisonSociale:"BoisÉnergie Bourgogne", siret:"12345678900012",
  adresse:"12 route de la Forêt, 89120 Charny",
  telephone:"03 86 00 00 01", email:"contact@boisenergie.fr",
  logoEmoji:"🌲",
};

const LOTS_MOCK = [
  {id:"l1",numero:"LOT-2025-007",commune:"Charny (89)",statut:"EN_EXPLOITATION",essence:"Peuplier",volumeT:350,humidite:38,etf:"ETF Duclos",proprietaire:"Vasseur A."},
  {id:"l2",numero:"LOT-2025-006",commune:"Joigny (89)",statut:"EN_TRANSPORT",essence:"Peuplier",volumeT:320,humidite:32,etf:"ETF Duclos",proprietaire:"Girard B."},
  {id:"l3",numero:"LOT-2025-005",commune:"Sens (89)",statut:"LIVRE",essence:"Chêne",volumeT:145,humidite:31,etf:"Coop BFC",proprietaire:"Martin S."},
];

/** @returns {Document[]} */
const buildInitDocs = () => [
  {id:"d1",type:"photo",titre:"Photos parcelle — LOT-2025-007",status:"uploaded",
    refType:"lot",refId:"l1",refLabel:"LOT-2025-007",thumbnailEmoji:"🌲",
    createurNom:"J. Moreau",createdAt:"2025-02-18T10:15:00Z",pendingSync:false},
  {id:"d2",type:"autorisation",titre:"Autorisation exploitation — LOT-2025-007",status:"signed",
    refType:"lot",refId:"l1",refLabel:"LOT-2025-007",thumbnailEmoji:"📋",
    createurNom:"J. Moreau",createdAt:"2025-02-25T09:00:00Z",signedAt:"2025-02-25T14:30:00Z",pendingSync:false},
  {id:"d3",type:"bon_achat",titre:"Bon d'achat — LOT-2025-007",status:"signed",
    refType:"lot",refId:"l1",refLabel:"LOT-2025-007",thumbnailEmoji:"🤝",
    createurNom:"J. Moreau",createdAt:"2025-01-15T08:00:00Z",signedAt:"2025-01-16T10:00:00Z",pendingSync:false},
  {id:"d4",type:"cmr",titre:"CMR-2025-0089 — LOT-2025-006",status:"signed",
    refType:"transport",refId:"tr1",refLabel:"CMR-2025-0089",thumbnailEmoji:"🚛",
    createurNom:"J. Moreau",createdAt:"2025-06-09T07:45:00Z",signedAt:"2025-06-09T07:48:00Z",pendingSync:false},
  {id:"d5",type:"bon_livraison",titre:"BL-2025-0089",status:"generated",
    refType:"livraison",refId:"lv1",refLabel:"BL-2025-0089",thumbnailEmoji:"📦",
    createurNom:"Système",createdAt:"2025-06-09T09:15:00Z",pendingSync:false},
  {id:"d6",type:"analyse_humidite",titre:"Analyse humidité — LOT-2025-005",status:"uploaded",
    refType:"lot",refId:"l3",refLabel:"LOT-2025-005",thumbnailEmoji:"💧",
    createurNom:"Chaufferie Troyes",createdAt:"2025-06-08T15:00:00Z",pendingSync:false},
];

// ── PDF GENERATOR (HTML→printable) ─────────────────────────────────────────────

/**
 * Generate a printable PDF preview HTML string for a document type
 * @param {DocType} type @param {any} lot @param {CompanySettings} settings
 * @returns {string}
 */
const generatePDFHTML = (type, lot, settings) => {
  const today = new Date().toLocaleDateString("fr-FR");
  const header = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #1D9E75">
      <div>
        <div style="font-size:22px;font-weight:700;color:#1D9E75">${settings.logoEmoji} ${settings.raisonSociale}</div>
        <div style="font-size:11px;color:#666">${settings.adresse}</div>
        <div style="font-size:11px;color:#666">${settings.telephone} · ${settings.email}</div>
        <div style="font-size:11px;color:#666">SIRET : ${settings.siret}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#999">Document généré par</div>
        <div style="font-size:14px;font-weight:700;color:#1D9E75">APPLITAG</div>
        <div style="font-size:11px;color:#666">Date : ${today}</div>
      </div>
    </div>`;

  const row = (k,v) => `
    <tr>
      <td style="padding:6px 10px;font-size:12px;font-weight:600;color:#666;background:#F5F4F1;border:1px solid #ddd;width:35%">${k}</td>
      <td style="padding:6px 10px;font-size:12px;border:1px solid #ddd">${v}</td>
    </tr>`;

  const section = (title) => `
    <tr><td colspan="2" style="padding:8px 10px;font-size:12px;font-weight:700;color:#fff;background:#1D9E75">${title}</td></tr>`;

  const sigZone = (label) => `
    <div style="flex:1;border:1px solid #ddd;border-radius:6px;padding:12px">
      <div style="font-size:11px;font-weight:600;color:#666;margin-bottom:8px">${label}</div>
      <div style="height:40px;border-bottom:1px solid #ccc;margin-bottom:6px"></div>
      <div style="font-size:10px;color:#999">Signature :</div>
      <div style="font-size:10px;color:#999;margin-top:4px">Date : ___/___/______</div>
    </div>`;

  if (type === "bon_achat") return `
    <div style="font-family:Arial,sans-serif;padding:24px;max-width:720px;margin:0 auto">
      ${header}
      <h2 style="font-size:18px;margin-bottom:4px">Bon d'Achat de Bois</h2>
      <div style="color:#1D9E75;font-size:13px;font-weight:600;margin-bottom:16px">N° BA-${lot.numero} · ${today}</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        ${section("PARTIES")}
        ${row("Acheteur (Exploitant)",settings.raisonSociale)}
        ${row("Vendeur (Propriétaire)",lot.proprietaire)}
        ${section("DESCRIPTION DU BOIS")}
        ${row("Lot N°",lot.numero)}
        ${row("Commune",lot.commune)}
        ${row("Essence principale",lot.essence)}
        ${row("Volume estimé",`${lot.volumeT} t`)}
        ${row("Humidité estimée",`${lot.humidite} %`)}
        ${section("CONDITIONS FINANCIÈRES")}
        ${row("Prix unitaire","________ €/t HT")}
        ${row("Total estimé","________ € HT")}
        ${row("Modalité paiement","Virement — 30j réception BL signé")}
      </table>
      <div style="display:flex;gap:16px;margin-top:20px">
        ${sigZone("Signature Vendeur (Propriétaire)")}
        ${sigZone("Signature Acheteur (Exploitant)")}
      </div>
      <div style="text-align:center;margin-top:20px;font-size:10px;color:#999">
        Document généré automatiquement par APPLITAG · www.applitag.fr
      </div>
    </div>`;

  if (type === "bon_livraison") return `
    <div style="font-family:Arial,sans-serif;padding:24px;max-width:720px;margin:0 auto">
      ${header}
      <h2 style="font-size:18px;margin-bottom:4px">Bon de Livraison</h2>
      <div style="color:#1D9E75;font-size:13px;font-weight:600;margin-bottom:16px">BL-${Date.now().toString().slice(-6)} · ${today}</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        ${section("RÉFÉRENCES")}
        ${row("Lot de référence",lot.numero)}
        ${row("Commune",lot.commune)}
        ${row("Produit","Plaquette P45 — "+lot.essence)}
        ${section("PESÉE RÉCEPTION")}
        ${row("Poids brut bascule","________ t")}
        ${row("Tare véhicule","________ t")}
        ${row("Poids net réceptionné","________ t")}
        ${row("N° ticket bascule","________________")}
        ${section("QUALITÉ")}
        ${row("Humidité mesurée",`${lot.humidite} % — ${lot.humidite<=35?"✓ Conforme":"⚠ Vérifier"}`)}
        ${section("RÉCEPTION")}
        ${row("Réceptionnaire","________________________________")}
        ${row("Date/heure livraison",today+" · ______h______")}
      </table>
      <div style="display:flex;gap:16px;margin-top:20px">
        ${sigZone("Signature Chauffeur")}
        ${sigZone("Signature Réceptionnaire")}
      </div>
      <div style="text-align:center;margin-top:20px;font-size:10px;color:#999">
        Document généré automatiquement par APPLITAG · www.applitag.fr
      </div>
    </div>`;

  if (type === "rapport_chantier") return `
    <div style="font-family:Arial,sans-serif;padding:24px;max-width:720px;margin:0 auto">
      ${header}
      <h2 style="font-size:18px;margin-bottom:4px">Rapport de Chantier</h2>
      <div style="color:#1D9E75;font-size:13px;font-weight:600;margin-bottom:16px">${lot.numero} · ${today}</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        ${section("CHANTIER")}
        ${row("Lot N°",lot.numero)}
        ${row("Commune",lot.commune)}
        ${row("ETF",lot.etf)}
        ${row("Propriétaire",lot.proprietaire)}
        ${section("VOLUMES")}
        ${row("Volume estimé",`${lot.volumeT} t`)}
        ${row("Volume réel","________ t")}
        ${row("Taux de réalisation","________ %")}
        ${section("QUALITÉ")}
        ${row("Essence principale",lot.essence)}
        ${row("Humidité moyenne",`${lot.humidite} %`)}
        ${row("Granulométrie","P45")}
        ${section("OBSERVATIONS")}
        ${row("Incidents","Aucun")}
        ${row("Observations","________________________________________________")}
        ${row("Date fin chantier",today)}
      </table>
      <div style="display:flex;gap:16px;margin-top:20px">
        ${sigZone("Signature ETF")}
        ${sigZone("Validation Exploitant")}
      </div>
    </div>`;

  if (type === "autorisation") return `
    <div style="font-family:Arial,sans-serif;padding:24px;max-width:720px;margin:0 auto">
      ${header}
      <h2 style="font-size:18px;margin-bottom:4px">Autorisation d'Exploitation Forestière</h2>
      <div style="color:#1D9E75;font-size:13px;margin-bottom:16px">Référence : AUTH-${lot.numero}</div>
      <p style="font-size:13px;line-height:1.8;margin-bottom:16px">
        Je soussigné(e) <strong>${lot.proprietaire}</strong>, propriétaire des parcelles forestières
        référencées au lot <strong>${lot.numero}</strong> situées sur la commune de <strong>${lot.commune}</strong>,
        autorise par le présent document <strong>${settings.raisonSociale}</strong> et ses sous-traitants
        à procéder aux opérations d'abattage, débardage et exploitation des bois sur pied.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        ${section("CONDITIONS")}
        ${row("Période d'exploitation","Du __________ au __________")}
        ${row("Essence(s) concernée(s)",lot.essence)}
        ${row("Volume autorisé",`${lot.volumeT} t (estimé)`)}
        ${row("Modalités d'accès","Chemin forestier — Véhicules ≤ 30 t")}
        ${row("Remise en état","Chemin remis en état après exploitation")}
      </table>
      <div style="display:flex;gap:16px;margin-top:20px">
        ${sigZone("Signature Propriétaire")}
        ${sigZone("Signature Exploitant")}
      </div>
    </div>`;

  return `<div style="padding:24px;font-family:Arial">Document ${type} pour ${lot.numero}</div>`;
};

// ── ATOMS ──────────────────────────────────────────────────────────────────────
const Badge = ({bg,color,children}) => (
  <span style={{display:"inline-block",padding:"2px 8px",borderRadius:9,
    fontSize:10,fontWeight:600,background:bg,color,whiteSpace:"nowrap"}}>{children}</span>
);

const Btn = ({onClick,bg=T.bg2,color=T.tx,children,disabled,sm,style={}}) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding:sm?"5px 10px":"8px 14px",borderRadius:8,fontSize:sm?11:12,fontWeight:500,
    display:"inline-flex",alignItems:"center",gap:6,cursor:disabled?"not-allowed":"pointer",
    border:"none",fontFamily:"inherit",background:disabled?T.bg2:bg,
    color:disabled?T.tx3:color,opacity:disabled?.6:1,transition:"all .1s",
    whiteSpace:"nowrap",...style,
  }}>{children}</button>
);

const PBtn = ({onClick,children,disabled,style={}}) => (
  <Btn onClick={onClick} bg={T.green} color="#fff" disabled={disabled} style={style}>{children}</Btn>
);

const SCard = ({title,extra,children}) => (
  <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,overflow:"hidden",marginBottom:10}}>
    <div style={{padding:"9px 13px",borderBottom:`1px solid ${T.bd}`,background:T.bg,
      display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontSize:11,fontWeight:600,color:T.tx2,textTransform:"uppercase",letterSpacing:".05em"}}>{title}</div>
      {extra}
    </div>
    <div style={{padding:"10px 13px"}}>{children}</div>
  </div>
);

// ── PDF PREVIEW MODAL ───────────────────────────────────────────────────────────
const PDFPreviewModal = ({html, title, onClose, onSign}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",
    display:"flex",alignItems:"flex-start",justifyContent:"center",
    zIndex:9999,padding:"20px",overflowY:"auto"}}>
    <div style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:760,
      boxShadow:"0 16px 48px rgba(0,0,0,.3)"}}>
      {/* Modal header */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.bd}`,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        background:T.bg,borderRadius:"14px 14px 0 0"}}>
        <div style={{fontSize:14,fontWeight:600}}>Aperçu — {title}</div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={onSign} bg={T.green} color="#fff">✍️ Marquer signé</Btn>
          <Btn onClick={()=>window.print()} bg={T.blueL} color={T.blueD}>🖨️ Imprimer</Btn>
          <Btn onClick={onClose}>✕ Fermer</Btn>
        </div>
      </div>
      {/* PDF content */}
      <div style={{padding:"8px",background:"#e0e0e0",minHeight:200}}>
        <div style={{background:"#fff",boxShadow:"0 2px 8px rgba(0,0,0,.1)"}}
          dangerouslySetInnerHTML={{__html:html}}/>
      </div>
      <div style={{padding:"10px 18px",borderTop:`1px solid ${T.bd}`,
        fontSize:11,color:T.tx3,textAlign:"center"}}>
        Document généré automatiquement · APPLITAG · En production : export PDF via Puppeteer / WeasyPrint
      </div>
    </div>
  </div>
);

// ── UPLOAD ZONE ─────────────────────────────────────────────────────────────────
const UploadZone = ({onUpload}) => {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);onUpload(e.dataTransfer.files[0]);}}
      onClick={()=>{
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
        input.onchange = (e) => onUpload(e.target.files[0]);
        input.click();
      }}
      style={{
        border:`2px dashed ${drag?T.green:T.bd2}`,borderRadius:10,
        padding:"20px",textAlign:"center",cursor:"pointer",
        background:drag?T.greenL:"#fff",transition:"all .2s",
      }}>
      <div style={{fontSize:28,marginBottom:6}}>📤</div>
      <div style={{fontSize:12,fontWeight:500,color:T.tx2}}>
        Glisser-déposer ou cliquer
      </div>
      <div style={{fontSize:10,color:T.tx3,marginTop:3}}>
        PDF, JPG, PNG, DOC — max 20 Mo
      </div>
    </div>
  );
};

// ── DOCUMENT CARD ───────────────────────────────────────────────────────────────
const DocCard = ({doc, onPreview, onSign, onDelete}) => {
  const cfg = DOC_CFG[doc.type];
  const sb = docStatusBadge(doc.status);
  return (
    <div style={{
      display:"flex",gap:12,padding:"10px 12px",
      borderBottom:`0.5px solid ${T.bd}`,alignItems:"flex-start",
    }}>
      {/* Thumb */}
      <div style={{
        width:44,height:44,borderRadius:9,background:cfg.bg,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:22,flexShrink:0,border:`1px solid ${T.bd}`,
      }}>{doc.thumbnailEmoji||cfg.icon}</div>
      {/* Info */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
          <span style={{fontSize:12,fontWeight:500,overflow:"hidden",
            textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.titre}</span>
          {doc.pendingSync && <span title="En attente de sync" style={{fontSize:12}}>⟳</span>}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <Badge bg={cfg.bg} color={cfg.color}>{cfg.label}</Badge>
          <Badge bg={sb.bg} color={sb.color}>{sb.label}</Badge>
          <span style={{fontSize:10,color:T.tx3}}>{fmtDate(doc.createdAt)} · {doc.createurNom}</span>
        </div>
        {doc.refLabel && (
          <div style={{fontSize:10,color:T.tx3,marginTop:2}}>→ {doc.refLabel}</div>
        )}
      </div>
      {/* Actions */}
      <div style={{display:"flex",gap:5,flexShrink:0}}>
        <Btn onClick={()=>onPreview(doc)} bg={T.blueL} color={T.blueD} sm>👁 Voir</Btn>
        {doc.status !== "signed" && (
          <Btn onClick={()=>onSign(doc.id)} bg={T.greenL} color={T.greenD} sm>✍️</Btn>
        )}
        <Btn onClick={()=>onDelete(doc.id)} bg={T.redL} color={T.red} sm>✕</Btn>
      </div>
    </div>
  );
};

// ── MAIN APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [docs, setDocs] = useState(buildInitDocs);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeLot, setActiveLot] = useState("l1");
  const [activeTab, setActiveTab] = useState("lot");
  const [pdfPreview, setPdfPreview] = useState(null); // {html, title, docId}
  const [addPanel, setAddPanel] = useState(false);
  const [selectedType, setSelectedType] = useState("bon_achat");
  const [editSettings, setEditSettings] = useState(false);
  const [toasts, setToasts] = useState([]);

  const lot = LOTS_MOCK.find(l => l.id === activeLot) ?? LOTS_MOCK[0];
  const lotDocs = docs.filter(d => d.refId === activeLot && d.refType === "lot");
  const allDocs = docs;

  const toast = (msg, type="success") => {
    const id = uid();
    setToasts(t => [...t, {id,msg,type}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  const handleGenerate = (type) => {
    const lot = LOTS_MOCK.find(l => l.id === activeLot);
    const cfg = DOC_CFG[type];
    const html = generatePDFHTML(type, lot, settings);
    const doc = {
      id: uid(), type, titre:`${cfg.label} — ${lot.numero}`,
      status:"generated", refType:"lot", refId:activeLot,
      refLabel:lot.numero, thumbnailEmoji:cfg.icon,
      createurNom:"J. Moreau", createdAt:nowISO(), pendingSync:false,
    };
    setDocs(d => [...d, doc]);
    setPdfPreview({html, title:cfg.label, docId:doc.id});
    toast(`${cfg.label} généré`);
  };

  const handleUpload = (file) => {
    if (!file) return;
    const cfg = DOC_CFG[selectedType];
    const doc = {
      id:uid(), type:selectedType, titre:file.name || `${cfg.label} uploadé`,
      status:"uploaded", refType:"lot", refId:activeLot,
      refLabel:lot.numero, thumbnailEmoji:cfg.icon,
      createurNom:"J. Moreau", createdAt:nowISO(), pendingSync:true,
    };
    setDocs(d => [...d, doc]);
    setAddPanel(false);
    toast(`${file.name} uploadé — en attente de sync`,"warn");
  };

  const handleSign = (docId) => {
    setDocs(d => d.map(x => x.id===docId ? {...x, status:"signed", signedAt:nowISO()} : x));
    setPdfPreview(null);
    toast("Document signé ✓");
  };

  const handleDelete = (docId) => {
    setDocs(d => d.filter(x => x.id !== docId));
    toast("Document supprimé","warn");
  };

  const handlePreview = (doc) => {
    const lot = LOTS_MOCK.find(l => l.id === doc.refId) ?? LOTS_MOCK[0];
    if (DOC_CFG[doc.type].canGenerate) {
      const html = generatePDFHTML(doc.type, lot, settings);
      setPdfPreview({html, title:DOC_CFG[doc.type].label, docId:doc.id});
    } else {
      toast(`Aperçu non disponible pour les ${DOC_CFG[doc.type].label}s`,"warn");
    }
  };

  // Missing docs indicator
  const missingDocs = getMissingDocs(lotDocs.map(d=>d.type), lot.statut);

  // Dashboard stats
  const generated = docs.filter(d => d.status==="generated"||d.status==="signed").length;
  const pendingSync = docs.filter(d => d.pendingSync).length;
  const cmrMissing = LOTS_MOCK.filter(l =>
    ["A_DECHIQUETER","EN_TRANSPORT","LIVRE"].includes(l.statut) &&
    !docs.find(d => d.refId===l.id && d.type==="cmr")
  ).length;

  const TABS = [
    {id:"lot",      label:"Fiche lot"},
    {id:"all",      label:"Tous les docs"},
    {id:"generate", label:"Générer PDF"},
    {id:"settings", label:"Paramètres"},
    {id:"dashboard",label:"Dashboard pilote"},
  ];

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
          <div key={t.id} style={{
            padding:"9px 15px",borderRadius:9,fontSize:12,fontWeight:500,
            background:t.type==="success"?T.greenD:t.type==="warn"?T.amberD:T.red,
            color:"#fff",boxShadow:"0 4px 16px rgba(0,0,0,.2)",
          }}>{t.type==="success"?"✓":t.type==="warn"?"⚠":"✗"} {t.msg}</div>
        ))}
      </div>

      {pdfPreview && (
        <PDFPreviewModal html={pdfPreview.html} title={pdfPreview.title}
          onClose={()=>setPdfPreview(null)}
          onSign={()=>handleSign(pdfPreview.docId)}/>
      )}

      {/* Topbar */}
      <div style={{background:"#111",color:"#fff",padding:"10px 16px",
        display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:28,height:28,background:T.green,borderRadius:7,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🌲</div>
        <div>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:".02em"}}>APPLITAG</div>
          <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:".04em"}}>Documents Terrain</div>
        </div>
        <div style={{flex:1}}/>
        {pendingSync > 0 && (
          <div style={{background:T.amber,color:"#fff",padding:"4px 10px",
            borderRadius:7,fontSize:11,fontWeight:600}}>
            ⟳ {pendingSync} en attente de sync
          </div>
        )}
      </div>

      {/* Lot selector */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.bd}`,
        padding:"8px 16px",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
        <span style={{fontSize:11,color:T.tx3,fontWeight:600}}>Lot :</span>
        {LOTS_MOCK.map(l=>(
          <button key={l.id} onClick={()=>setActiveLot(l.id)} style={{
            padding:"5px 11px",borderRadius:7,fontSize:11,fontWeight:500,border:"none",
            cursor:"pointer",fontFamily:"inherit",
            background:activeLot===l.id?T.green:T.bg2,
            color:activeLot===l.id?"#fff":T.tx2,
          }}>{l.numero}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
              padding:"5px 11px",borderRadius:7,fontSize:11,fontWeight:500,
              border:"none",cursor:"pointer",fontFamily:"inherit",
              background:activeTab===t.id?T.blue:T.bg2,
              color:activeTab===t.id?"#fff":T.tx2,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 18px"}}>

        {/* FICHE LOT */}
        {activeTab==="lot" && (
          <>
            {missingDocs.length > 0 && (
              <div style={{background:T.amberL,borderRadius:10,padding:"10px 14px",
                fontSize:12,color:T.amberD,marginBottom:12,display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:16}}>⚠</span>
                <div>
                  <div style={{fontWeight:600,marginBottom:3}}>
                    Documents manquants pour le statut {lot.statut}
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {missingDocs.map(t=>(
                      <span key={t} style={{
                        background:T.amber,color:"#fff",padding:"2px 8px",
                        borderRadius:6,fontSize:10,fontWeight:600,
                      }}>{DOC_CFG[t].label}</span>
                    ))}
                  </div>
                </div>
                <PBtn onClick={()=>setActiveTab("generate")} style={{marginLeft:"auto",flexShrink:0}}>Générer</PBtn>
              </div>
            )}
            <SCard title={`Documents — ${lot.numero}`}
              extra={<PBtn onClick={()=>setAddPanel(!addPanel)} sm>+ Ajouter</PBtn>}>
              {lotDocs.length === 0 ? (
                <div style={{textAlign:"center",padding:"16px 0",color:T.tx3,fontSize:12}}>
                  Aucun document pour ce lot
                </div>
              ) : lotDocs.map(d => (
                <DocCard key={d.id} doc={d}
                  onPreview={handlePreview} onSign={handleSign} onDelete={handleDelete}/>
              ))}
              {addPanel && (
                <div style={{marginTop:10,padding:12,background:T.bg2,borderRadius:10}}>
                  <UploadZone onUpload={handleUpload}/>
                </div>
              )}
            </SCard>
          </>
        )}

        {/* ALL DOCS */}
        {activeTab==="all" && (
          <SCard title={`Tous les documents (${allDocs.length})`}
            extra={
              <div style={{display:"flex",gap:6}}>
                {Object.entries(DOC_CFG).map(([t,cfg])=>(
                  <span key={t} style={{
                    padding:"2px 7px",borderRadius:6,fontSize:9,fontWeight:600,
                    background:cfg.bg,color:cfg.color,cursor:"pointer",
                  }}>{cfg.icon}</span>
                ))}
              </div>
            }>
            {allDocs.map(d=>(
              <DocCard key={d.id} doc={d}
                onPreview={handlePreview} onSign={handleSign} onDelete={handleDelete}/>
            ))}
          </SCard>
        )}

        {/* GENERATE */}
        {activeTab==="generate" && (
          <SCard title="Générer un document PDF">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
              {Object.entries(DOC_CFG).filter(([,cfg])=>cfg.canGenerate).map(([type,cfg])=>(
                <div key={type} style={{
                  border:`1px solid ${T.bd}`,borderRadius:10,padding:"14px 12px",
                  textAlign:"center",cursor:"pointer",background:"#fff",
                  transition:"all .1s",
                }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=cfg.color}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.bd}
                  onClick={()=>handleGenerate(type)}>
                  <div style={{fontSize:28,marginBottom:6}}>{cfg.icon}</div>
                  <div style={{fontSize:12,fontWeight:600,color:cfg.color}}>{cfg.label}</div>
                  <div style={{fontSize:10,color:T.tx3,marginTop:3}}>Cliquer pour générer</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:14,padding:"10px 12px",background:T.blueL,borderRadius:9,
              fontSize:11,color:T.blueD}}>
              💡 Les PDF sont générés avec les données du lot sélectionné et les paramètres entreprise.
              En production : export via Puppeteer (Node.js) ou WeasyPrint (Python).
            </div>
          </SCard>
        )}

        {/* SETTINGS */}
        {activeTab==="settings" && (
          <SCard title="Paramètres entreprise — En-tête PDF">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[
                ["raisonSociale","Raison sociale"],["siret","SIRET"],
                ["adresse","Adresse"],["telephone","Téléphone"],
                ["email","Email"],["logoEmoji","Logo (emoji)"],
              ].map(([k,label])=>(
                <div key={k}>
                  <div style={{fontSize:11,fontWeight:600,color:T.tx2,marginBottom:3}}>{label}</div>
                  <input value={settings[k]} onChange={e=>setSettings(s=>({...s,[k]:e.target.value}))}
                    style={{width:"100%",padding:"9px 10px",borderRadius:8,border:`1px solid ${T.bd2}`,
                      fontSize:12,fontFamily:"inherit",outline:"none"}}/>
                </div>
              ))}
            </div>
            {/* Preview */}
            <div style={{background:T.bg2,borderRadius:10,padding:"14px",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:600,color:T.tx2,marginBottom:8}}>Aperçu en-tête</div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:T.green}}>
                    {settings.logoEmoji} {settings.raisonSociale}
                  </div>
                  <div style={{fontSize:11,color:T.tx2}}>{settings.adresse}</div>
                  <div style={{fontSize:11,color:T.tx2}}>{settings.telephone} · {settings.email}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.green}}>APPLITAG</div>
                </div>
              </div>
            </div>
            <PBtn onClick={()=>toast("Paramètres sauvegardés")} style={{width:"100%",justifyContent:"center"}}>
              ✓ Sauvegarder
            </PBtn>
          </SCard>
        )}

        {/* DASHBOARD PILOTE */}
        {activeTab==="dashboard" && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              {[
                {l:"Docs générés",n:generated,i:"📄",c:T.green},
                {l:"Docs manquants",n:docs.length===0?3:missingDocs.length,i:"⚠",c:T.amber},
                {l:"CMR manquants",n:cmrMissing,i:"🚛",c:T.red},
                {l:"En attente sync",n:pendingSync,i:"⟳",c:T.blue},
              ].map(({l,n,i,c})=>(
                <div key={l} style={{background:"#fff",border:`1px solid ${T.bd}`,
                  borderRadius:11,padding:"13px",textAlign:"center"}}>
                  <div style={{fontSize:24}}>{i}</div>
                  <div style={{fontSize:22,fontWeight:700,color:c,margin:"4px 0"}}>{n}</div>
                  <div style={{fontSize:10,color:T.tx3}}>{l}</div>
                </div>
              ))}
            </div>

            <SCard title="État des lots — documents obligatoires">
              {LOTS_MOCK.map(l=>{
                const lDocs = docs.filter(d=>d.refId===l.id&&d.refType==="lot");
                const missing = getMissingDocs(lDocs.map(d=>d.type), l.statut);
                return (
                  <div key={l.id} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"9px 0",
                    borderBottom:`0.5px solid ${T.bd}`,
                  }}>
                    <span style={{fontFamily:"monospace",fontSize:12,fontWeight:600,minWidth:110}}>{l.numero}</span>
                    <span style={{fontSize:11,color:T.tx3,flex:1}}>{l.commune} · {l.statut}</span>
                    {missing.length === 0 ? (
                      <Badge bg={T.greenL} color={T.greenD}>✓ Complet</Badge>
                    ) : (
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {missing.map(t=>(
                          <Badge key={t} bg={T.amberL} color={T.amberD}>
                            {DOC_CFG[t].icon} {DOC_CFG[t].label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </SCard>

            <SCard title="Derniers documents ajoutés">
              {docs.slice(-5).reverse().map(d=>(
                <div key={d.id} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"6px 0",borderBottom:`0.5px solid ${T.bd}`,fontSize:11}}>
                  <span>{DOC_CFG[d.type].icon}</span>
                  <span style={{flex:1,fontWeight:500}}>{d.titre}</span>
                  <Badge bg={docStatusBadge(d.status).bg} color={docStatusBadge(d.status).color}>
                    {docStatusBadge(d.status).label}
                  </Badge>
                  <span style={{color:T.tx3}}>{fmtDate(d.createdAt)}</span>
                </div>
              ))}
            </SCard>
          </>
        )}
      </div>
    </div>
  );
}
