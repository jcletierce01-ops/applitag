// @ts-nocheck
import { useState, useEffect } from "react";
import { C, INPUT_H, FONT_INPUT, PADDING } from "../../design-system/tokens.js";
import { uid } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { apiGet, apiPost } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle, MSlider } from "../../shared/ui.jsx";
import { SignatureCanvas } from "../../shared/SignatureCanvas.jsx";
import { validateCMR, formatCMR, formatImmat, validateImmat } from "../../shared/validators.js";
import { generatePdfFromHtml, buildCMRHTML, buildPVVisiteHTML, buildReceptionExploitHTML, buildOrdreDechiHTML, buildSimpleDocHTML, buildCompteRenduContactHTML } from "../../domains/documents/pdf-templates.js";
import { TYPE_RESSOURCE_OPTS } from "../../domains/contacts/constants.js";
import { STATUT_LOT } from "../../domains/screens/MobileScreens.constants.js";
import { calculerPci, calculerEnergie } from "../../metier/formules.js";
import { PIPELINE } from "../../domains/roles/RoleScreens.constants.js";
import { GeoContextBadge } from "../../shared/GeoContextBadge.jsx";

// ── EffisBadge ────────────────────────────────────────────────────────────────
// Affiche le risque incendie EFFIS/Open-Meteo pour un lot avec coordonnées GPS.
// Données temps réel, non stockées en base (RisqueRessource = évaluations persistantes).
const FWI_COLORS: Record<string,string> = {
  TRES_FAIBLE:"#4CAF50",FAIBLE:"#8BC34A",MODERE:"#FFC107",
  ELEVE:"#FF9800",TRES_ELEVE:"#F44336",EXTREME:"#7B1FA2",
};
const FWI_BG: Record<string,string> = {
  TRES_FAIBLE:"#E8F5E9",FAIBLE:"#F1F8E9",MODERE:"#FFFDE7",
  ELEVE:"#FFF3E0",TRES_ELEVE:"#FFEBEE",EXTREME:"#F3E5F5",
};

function EffisBadge({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Appel direct sans JWT — route @Public()
    fetch(`${import.meta.env.VITE_API_URL ?? ""}/effis/risk?lat=${lat}&lng=${lng}`, {
      headers: { Accept: "application/json" },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  }, [lat, lng]);

  if (loading) {
    return (
      <div style={{borderRadius:12,padding:"10px 14px",marginBottom:16,
        background:"#F3F4F6",border:"1px solid #E5E7EB",
        fontSize:11,color:"#6B7280",display:"flex",alignItems:"center",gap:6}}>
        <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>🔄</span>
        Chargement risque incendie…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!data || !data.disponible) {
    return (
      <div style={{borderRadius:12,padding:"10px 14px",marginBottom:16,
        background:"#F3F4F6",border:"1px solid #E5E7EB",
        fontSize:11,color:"#9CA3AF",display:"flex",alignItems:"center",gap:6}}>
        🔥 Risque incendie non disponible
      </div>
    );
  }

  const col = FWI_COLORS[data.niveauRisque ?? ""] ?? "#9CA3AF";
  const bg  = FWI_BG[data.niveauRisque ?? ""]    ?? "#F3F4F6";

  return (
    <div style={{borderRadius:14,padding:14,marginBottom:16,
      background:bg, border:`1.5px solid ${col}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{fontSize:11,fontWeight:700,color:col,letterSpacing:"0.06em",
          textTransform:"uppercase"}}>
          🔥 Risque incendie EFFIS · J0
        </div>
        <span style={{fontSize:9,color:col,opacity:0.7}}>
          {new Date(data.dateActualisation).toLocaleDateString("fr-FR")}
        </span>
      </div>

      {/* Badge principal */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:12,height:12,borderRadius:"50%",background:col,flexShrink:0}}/>
        <span style={{fontSize:18,fontWeight:700,color:col}}>{data.labelRisque}</span>
        {data.fwi !== null && (
          <span style={{fontSize:12,color:col,opacity:0.8}}>FWI {data.fwi}</span>
        )}
      </div>

      {/* Prévisions J+1 J+2 */}
      {(data.fwiJ1 !== null || data.fwiJ2 !== null) && (
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          {[
            {label:"Demain", niv:data.niveauJ1, val:data.fwiJ1, lab:data.labelJ1},
            {label:"J+2",    niv:data.niveauJ2, val:data.fwiJ2, lab:data.labelJ2},
          ].map((f,i) => f.niv && (
            <div key={i} style={{flex:1,borderRadius:8,padding:"6px 8px",
              background:"rgba(255,255,255,0.5)",border:`1px solid ${FWI_COLORS[f.niv]??col}`,
              textAlign:"center"}}>
              <div style={{fontSize:9,color:"#6B7280",marginBottom:2}}>{f.label}</div>
              <div style={{width:8,height:8,borderRadius:"50%",
                background:FWI_COLORS[f.niv]??"#9CA3AF",margin:"0 auto 2px"}}/>
              <div style={{fontSize:10,fontWeight:700,color:FWI_COLORS[f.niv]??col}}>{f.lab}</div>
              {f.val !== null && <div style={{fontSize:9,color:"#6B7280"}}>FWI {f.val}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Feux proches */}
      {data.feuxActifsProches && (
        <div style={{fontSize:11,color:"#991B1B",fontWeight:600,
          background:"#FEE2E2",borderRadius:8,padding:"6px 10px",marginBottom:4}}>
          ⚠️ Périmètre brûlé récent à {data.distanceDernierFeuKm} km
        </div>
      )}
      {!data.feuxActifsProches && data.distanceDernierFeuKm !== null && (
        <div style={{fontSize:10,color:"#6B7280"}}>
          Dernier feu EFFIS à {data.distanceDernierFeuKm} km
        </div>
      )}
      <div style={{fontSize:9,color:"#9CA3AF",marginTop:4}}>
        Source : {data.source} · Résolution ~10 km
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── LotSanitaireBadge ─────────────────────────────────────────────────────────
// Affiche le workflow post-incendie/sanitaire et permet de créer ou mettre à jour
// le dossier (upsert). Visible en onglet Général si le lot a ce type de dossier.
const TYPE_SINISTRE_LABELS: Record<string,string> = {
  POST_INCENDIE:"🔥 Incendie",
  CHABLIS:"🌪️ Chablis",
  SCOLYTES:"🐛 Scolytes",
  PATHOGENE:"🦠 Pathogène",
  AUTRE:"⚠️ Autre sinistre",
};
const STATUT_WORKFLOW_LABELS: Record<string,{label:string,color:string,bg:string}> = {
  EN_ATTENTE_DIAGNOSTIC: {label:"En attente diagnostic",color:"#92400E",bg:"#FFFBEB"},
  DIAGNOSTIC_REALISE:    {label:"Diagnostic réalisé",   color:"#1D4ED8",bg:"#EFF6FF"},
  EXPLOITATION_EN_COURS: {label:"Exploitation en cours", color:"#065F46",bg:"#ECFDF5"},
  BOIS_EVACUES:          {label:"Bois évacués",          color:"#374151",bg:"#F3F4F6"},
  EN_RECONSTITUTION:     {label:"En reconstitution",     color:"#5B21B6",bg:"#F5F3FF"},
  RENOUVELLEMENT:        {label:"Renouvellement",        color:"#1E40AF",bg:"#EFF6FF"},
  CLOS:                  {label:"Dossier clos",          color:"#6B7280",bg:"#F9FAFB"},
};
const URGENCE_COLORS = ["","#10B981","#84CC16","#F59E0B","#EF4444","#7C3AED"];

function LotSanitaireBadge({ contactId }: { contactId: string }) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const WORKFLOW_STEPS = Object.keys(STATUT_WORKFLOW_LABELS);

  const load = () => {
    setLoading(true);
    apiGet(`/contacts/${contactId}/lot-sanitaire`)
      .then((d: any) => { setData(d ?? null); setLoading(false); })
      .catch(() => { setData(null); setLoading(false); });
  };
  useEffect(load, [contactId]);

  const [form, setForm] = useState({
    typeSinistre:"POST_INCENDIE",
    surfaceAffecteeHa:"",
    scoreUrgence:"3",
    statutWorkflow:"EN_ATTENTE_DIAGNOSTIC",
    diagnosticObservations:"",
    preconisationReconstitution:"",
    aidesDisponibles:"",
    lienICarto:"",
    notes:"",
  });

  const save = async () => {
    setSaving(true);
    try {
      await apiPost(`/contacts/${contactId}/lot-sanitaire`, {
        ...form,
        surfaceAffecteeHa: form.surfaceAffecteeHa ? parseFloat(form.surfaceAffecteeHa) : undefined,
        scoreUrgence: parseInt(form.scoreUrgence) || undefined,
      });
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{borderRadius:12,padding:"10px 14px",marginBottom:16,
      background:"#FFF7ED",border:"1px solid #FED7AA",fontSize:11,color:"#92400E",
      display:"flex",alignItems:"center",gap:6}}>
      ⚠️ Chargement dossier sanitaire…
    </div>
  );

  const statut = data?.statutWorkflow ? STATUT_WORKFLOW_LABELS[data.statutWorkflow] : null;

  return (
    <div style={{marginBottom:16}}>
      <div style={{borderRadius:14,padding:14,
        background: statut?.bg ?? "#FFF7ED",
        border:`1.5px solid ${statut?.color ?? "#F59E0B"}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",
            color: statut?.color ?? "#92400E"}}>
            🌲 Dossier sanitaire / Post-incendie
          </div>
          <button onClick={() => setShowForm(f=>!f)}
            style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid",cursor:"pointer",
              borderColor: statut?.color ?? "#F59E0B",
              background:"white",color: statut?.color ?? "#92400E",fontWeight:600}}>
            {showForm ? "Annuler" : data ? "Mettre à jour" : "Créer dossier"}
          </button>
        </div>

        {data ? (
          <>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>
                {TYPE_SINISTRE_LABELS[data.typeSinistre]?.split(" ")[0] ?? "⚠️"}
              </span>
              <div>
                <div style={{fontSize:14,fontWeight:700,color: statut?.color ?? "#374151"}}>
                  {TYPE_SINISTRE_LABELS[data.typeSinistre] ?? data.typeSinistre}
                </div>
                <div style={{fontSize:11,padding:"2px 8px",borderRadius:6,display:"inline-block",
                  background:"rgba(255,255,255,0.7)",border:`1px solid ${statut?.color}`,
                  color:statut?.color,fontWeight:600,marginTop:2}}>
                  {statut?.label ?? data.statutWorkflow}
                </div>
              </div>
              {data.scoreUrgence != null && (
                <div style={{marginLeft:"auto",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:700,
                    color:URGENCE_COLORS[data.scoreUrgence] ?? "#6B7280"}}>
                    {data.scoreUrgence}/5
                  </div>
                  <div style={{fontSize:9,color:"#6B7280"}}>urgence</div>
                </div>
              )}
            </div>

            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
              {data.surfaceAffecteeHa && (
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                  background:"rgba(255,255,255,0.7)",border:"1px solid #D1D5DB",color:"#374151"}}>
                  📐 {data.surfaceAffecteeHa} ha affectés
                </span>
              )}
              {data.dateSinistre && (
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                  background:"rgba(255,255,255,0.7)",border:"1px solid #D1D5DB",color:"#374151"}}>
                  📅 {new Date(data.dateSinistre).toLocaleDateString("fr-FR")}
                </span>
              )}
              {data.aidesDisponibles && (
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                  background:"#EFF6FF",border:"1px solid #BFDBFE",color:"#1E40AF"}}>
                  💶 {data.aidesDisponibles}
                </span>
              )}
            </div>

            {/* Workflow progress */}
            <div style={{display:"flex",gap:2,marginBottom:8}}>
              {WORKFLOW_STEPS.map((step, i) => {
                const idx = WORKFLOW_STEPS.indexOf(data.statutWorkflow ?? "");
                const done = i <= idx;
                return (
                  <div key={step} style={{flex:1,height:4,borderRadius:2,
                    background: done ? (statut?.color ?? "#F59E0B") : "#E5E7EB"}}/>
                );
              })}
            </div>

            {data.preconisationReconstitution && (
              <div style={{fontSize:11,color:"#374151",marginBottom:4}}>
                🌱 <strong>Reconstitution :</strong> {data.preconisationReconstitution}
              </div>
            )}
            {data.lienICarto && (
              <div style={{fontSize:10,color:"#1D4ED8",marginBottom:4}}>
                🔗 iCarto MFR : <a href={data.lienICarto} target="_blank" rel="noreferrer"
                  style={{color:"inherit"}}>{data.lienICarto}</a>
              </div>
            )}
            {data.diagnosticObservations && (
              <div style={{fontSize:10,color:"#6B7280",fontStyle:"italic",marginTop:4}}>
                {data.diagnosticObservations}
              </div>
            )}
          </>
        ) : (
          <div style={{fontSize:12,color:"#92400E"}}>
            Aucun dossier sanitaire enregistré pour ce lot.
          </div>
        )}
      </div>

      {showForm && (
        <div style={{borderRadius:12,padding:14,marginTop:8,
          background:"#FFFBEB",border:"1px solid #FDE68A"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#78350F",marginBottom:10,
            textTransform:"uppercase",letterSpacing:"0.05em"}}>
            {data ? "Mise à jour du dossier" : "Nouveau dossier sanitaire"}
          </div>

          {/* Type sinistre */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:"#78350F",marginBottom:4,fontWeight:600}}>Type de sinistre *</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.entries(TYPE_SINISTRE_LABELS).map(([k,v]) => (
                <button key={k} onClick={()=>setForm(f=>({...f,typeSinistre:k}))}
                  style={{padding:"6px 10px",borderRadius:8,cursor:"pointer",
                    border:`2px solid ${form.typeSinistre===k?"#F59E0B":"#E5E7EB"}`,
                    background:form.typeSinistre===k?"#FEF3C7":"white",
                    color:form.typeSinistre===k?"#78350F":"#374151",
                    fontWeight:form.typeSinistre===k?700:400,fontSize:11}}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#78350F",marginBottom:3,fontWeight:600}}>Surface affectée (ha)</div>
              <input type="number" value={form.surfaceAffecteeHa}
                onChange={e=>setForm(f=>({...f,surfaceAffecteeHa:e.target.value}))}
                placeholder="12.5"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #FCD34D",fontSize:11,background:"white"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#78350F",marginBottom:3,fontWeight:600}}>Urgence (1–5)</div>
              <input type="range" min="1" max="5" value={form.scoreUrgence}
                onChange={e=>setForm(f=>({...f,scoreUrgence:e.target.value}))}
                style={{width:"100%",marginTop:8}}/>
              <div style={{textAlign:"center",fontSize:12,fontWeight:700,
                color:URGENCE_COLORS[parseInt(form.scoreUrgence)]??"#6B7280"}}>
                {form.scoreUrgence}/5
              </div>
            </div>
          </div>

          {/* Statut workflow */}
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,color:"#78350F",marginBottom:3,fontWeight:600}}>Statut du dossier</div>
            <select value={form.statutWorkflow}
              onChange={e=>setForm(f=>({...f,statutWorkflow:e.target.value}))}
              style={{width:"100%",padding:"7px 10px",borderRadius:8,
                border:"1px solid #FCD34D",fontSize:11,background:"white",
                fontFamily:"inherit"}}>
              {WORKFLOW_STEPS.map(s => (
                <option key={s} value={s}>{STATUT_WORKFLOW_LABELS[s].label}</option>
              ))}
            </select>
          </div>

          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,color:"#78350F",marginBottom:3,fontWeight:600}}>Observations diagnostic</div>
            <textarea value={form.diagnosticObservations}
              onChange={e=>setForm(f=>({...f,diagnosticObservations:e.target.value}))}
              placeholder="Observations CNPF/ONF/gestionnaire…" rows={2}
              style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                borderRadius:8,border:"1px solid #FCD34D",fontSize:11,
                background:"white",resize:"vertical"}}/>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{flex:2}}>
              <div style={{fontSize:10,color:"#78350F",marginBottom:3,fontWeight:600}}>Préconisation reconstitution</div>
              <input value={form.preconisationReconstitution}
                onChange={e=>setForm(f=>({...f,preconisationReconstitution:e.target.value}))}
                placeholder="Ex : Reboisement mixte pin + chêne"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #FCD34D",fontSize:11,background:"white"}}/>
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#78350F",marginBottom:3,fontWeight:600}}>Aides mobilisables</div>
              <input value={form.aidesDisponibles}
                onChange={e=>setForm(f=>({...f,aidesDisponibles:e.target.value}))}
                placeholder="France Relance, FRF, ADEME…"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #FCD34D",fontSize:11,background:"white"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#78350F",marginBottom:3,fontWeight:600}}>Lien iCarto MFR</div>
              <input value={form.lienICarto}
                onChange={e=>setForm(f=>({...f,lienICarto:e.target.value}))}
                placeholder="https://icarto.cnpf.fr/…"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #FCD34D",fontSize:11,background:"white"}}/>
            </div>
          </div>

          <button onClick={save} disabled={saving}
            style={{width:"100%",padding:"10px 0",borderRadius:10,border:"none",
              cursor:saving?"not-allowed":"pointer",fontWeight:700,fontSize:13,
              background:saving?"#94A3B8":"#78350F",color:"white",marginTop:4}}>
            {saving ? "Enregistrement…" : data ? "Mettre à jour" : "Créer le dossier sanitaire"}
          </button>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── RisqueBadge ───────────────────────────────────────────────────────────────
const RISQUE_NIVEAU: Record<string,{bg:string,bd:string,txt:string,icon:string}> = {
  TRES_FAIBLE:  {bg:"#F0FDF4",bd:"#86EFAC",txt:"#166534",icon:"🟢"},
  FAIBLE:       {bg:"#ECFDF5",bd:"#6EE7B7",txt:"#065F46",icon:"🟢"},
  MODERE:       {bg:"#FFFBEB",bd:"#FDE68A",txt:"#92400E",icon:"🟡"},
  ELEVE:        {bg:"#FFF7ED",bd:"#FDBA74",txt:"#C2410C",icon:"🟠"},
  TRES_ELEVE:   {bg:"#FEF2F2",bd:"#FCA5A5",txt:"#991B1B",icon:"🔴"},
  EXTREME:      {bg:"#FDF4FF",bd:"#E879F9",txt:"#86198F",icon:"🚨"},
};
const RISQUE_TYPE_LABELS: Record<string,string> = {
  INCENDIE:"🔥 Incendie", CLIMATIQUE:"🌪️ Climatique", SANITAIRE:"🦠 Sanitaire",
  SOL:"🪨 Sol", ACCESSIBILITE:"🛣️ Accès", BIODIVERSITE:"🦎 Biodiversité",
  REGLEMENTATION:"📋 Réglementation", ECONOMIQUE:"💶 Économique",
};

function RisqueBadge({ contactId }: { contactId: string }) {
  const [risques, setRisques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    apiGet(`/contacts/${contactId}/risques`)
      .then((d: any)=>setRisques(Array.isArray(d)?d:[]))
      .catch(()=>setRisques([]))
      .finally(()=>setLoading(false));
  },[contactId]);

  if (loading) return null;
  if (!risques.length) return null;

  const max = risques.reduce((a: any,b: any)=>{
    const ordre = ["TRES_FAIBLE","FAIBLE","MODERE","ELEVE","TRES_ELEVE","EXTREME"];
    return ordre.indexOf(b.niveauRisque)>ordre.indexOf(a.niveauRisque)?b:a;
  }, risques[0]);
  const style = RISQUE_NIVEAU[max.niveauRisque]??RISQUE_NIVEAU.MODERE;

  return (
    <div style={{borderRadius:12,padding:14,marginBottom:14,
      background:style.bg,border:`1.5px solid ${style.bd}`}}>
      <div style={{display:"flex",justifyContent:"space-between",
        alignItems:"center",marginBottom:risques.length>1?10:0}}>
        <div style={{fontSize:12,fontWeight:700,color:style.txt}}>
          {style.icon} Risques ressource — {risques.length} évaluation{risques.length>1?"s":""}
        </div>
        <div style={{fontSize:10,padding:"2px 8px",borderRadius:12,
          background:style.bd,color:style.txt,fontWeight:700}}>
          {max.niveauRisque.replace("_"," ")}
        </div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:risques.length>1?4:0}}>
        {risques.map((r: any)=>{
          const s = RISQUE_NIVEAU[r.niveauRisque]??RISQUE_NIVEAU.MODERE;
          return (
            <span key={r.id} style={{fontSize:10,padding:"2px 8px",borderRadius:10,
              background:s.bd,color:s.txt,fontWeight:600}}>
              {RISQUE_TYPE_LABELS[r.type]??r.type} · {r.niveauRisque.replace("_"," ")}
            </span>
          );
        })}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── DFCIBadge ─────────────────────────────────────────────────────────────────
// Affiche le statut sécurité/DFCI courant du chantier et permet d'enregistrer
// un nouveau snapshot horodaté (valeur juridique = règle connue à l'instant T).
const DFCI_COLORS: Record<string,{bg:string,bd:string,txt:string,icon:string}> = {
  AUTORISE:       {bg:"#ECFDF5",bd:"#10B981",txt:"#065F46",icon:"✅"},
  SOUS_CONDITIONS:{bg:"#FFFBEB",bd:"#F59E0B",txt:"#92400E",icon:"⚠️"},
  SUSPENDU:       {bg:"#FEF2F2",bd:"#EF4444",txt:"#991B1B",icon:"🚫"},
};

function DFCIBadge({ contactId }: { contactId: string; token?: string }) {
  const [current, setCurrent]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    statutChantier:"AUTORISE",
    restrictionHoraire:"",
    arreteRef:"",
    pisteDFCI:"",
    pointEauDistanceKm:"",
    pointEauDescription:"",
    largeurAccesM:"",
    accessibilitePompiers:true,
    notes:"",
  });

  const load = () => {
    setLoading(true);
    apiGet(`/contacts/${contactId}/securite-dfci/current`)
      .then((d: any) => { setCurrent(d ?? null); setLoading(false); })
      .catch(() => { setCurrent(null); setLoading(false); });
  };
  useEffect(load, [contactId]);

  const save = async () => {
    setSaving(true);
    try {
      await apiPost(`/contacts/${contactId}/securite-dfci`, {
        ...form,
        pointEauDistanceKm: form.pointEauDistanceKm ? parseFloat(form.pointEauDistanceKm) : undefined,
        largeurAccesM:      form.largeurAccesM      ? parseFloat(form.largeurAccesM)      : undefined,
      });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{borderRadius:12,padding:"10px 14px",marginBottom:16,
      background:"#F3F4F6",border:"1px solid #E5E7EB",fontSize:11,color:"#6B7280",
      display:"flex",alignItems:"center",gap:6}}>
      <span>🛡️</span> Chargement sécurité DFCI…
    </div>
  );

  const palette = DFCI_COLORS[current?.statutChantier ?? ""] ?? DFCI_COLORS.AUTORISE;
  const hasCurrent = !!current;

  return (
    <div style={{marginBottom:16}}>
      {/* Carte statut courant */}
      <div style={{borderRadius:14,padding:14,
        background: hasCurrent ? palette.bg : "#F9FAFB",
        border:`1.5px solid ${hasCurrent ? palette.bd : "#E5E7EB"}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",
            color: hasCurrent ? palette.txt : "#6B7280"}}>
            🛡️ Sécurité DFCI Chantier
          </div>
          <button onClick={() => setShowForm(f=>!f)}
            style={{fontSize:10,padding:"3px 10px",borderRadius:8,border:"1px solid",cursor:"pointer",
              borderColor: hasCurrent ? palette.bd : "#D1D5DB",
              background:"white",color: hasCurrent ? palette.txt : "#374151",fontWeight:600}}>
            {showForm ? "Annuler" : hasCurrent ? "Mettre à jour" : "Enregistrer décision"}
          </button>
        </div>

        {hasCurrent ? (
          <>
            {/* Statut principal */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:20}}>{palette.icon}</span>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:palette.txt}}>
                  CHANTIER {current.statutChantier === "SOUS_CONDITIONS" ? "SOUS CONDITIONS" : current.statutChantier}
                </div>
                {current.restrictionHoraire && (
                  <div style={{fontSize:11,color:palette.txt,opacity:0.85}}>
                    {current.restrictionHoraire}
                  </div>
                )}
              </div>
            </div>

            {/* Détails DFCI */}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
              {current.pisteDFCI && (
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                  background:"rgba(255,255,255,0.7)",border:`1px solid ${palette.bd}`,
                  color:palette.txt}}>
                  🛤️ {current.pisteDFCI}
                </span>
              )}
              {current.pointEauDistanceKm != null && (
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                  background:"rgba(255,255,255,0.7)",border:`1px solid ${palette.bd}`,
                  color:palette.txt}}>
                  💧 {current.pointEauDistanceKm} km
                  {current.pointEauDescription ? ` · ${current.pointEauDescription}` : ""}
                </span>
              )}
              {current.largeurAccesM != null && (
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                  background:"rgba(255,255,255,0.7)",border:`1px solid ${palette.bd}`,
                  color:palette.txt}}>
                  ↔️ {current.largeurAccesM} m accès
                </span>
              )}
              {current.accessibilitePompiers === false && (
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                  background:"#FEE2E2",border:"1px solid #EF4444",color:"#991B1B",fontWeight:600}}>
                  🚒 Accès pompiers limité
                </span>
              )}
            </div>

            {current.arreteRef && (
              <div style={{fontSize:10,color:palette.txt,opacity:0.8}}>
                📋 Arrêté : {current.arreteRef}
                {current.arreteDate ? ` (${new Date(current.arreteDate).toLocaleDateString("fr-FR")})` : ""}
              </div>
            )}
            {current.notes && (
              <div style={{fontSize:10,color:"#6B7280",marginTop:4,fontStyle:"italic"}}>
                {current.notes}
              </div>
            )}
            <div style={{fontSize:9,color:"#9CA3AF",marginTop:6}}>
              Décision enregistrée le {new Date(current.horodatageDecision).toLocaleString("fr-FR")}
              {current.auteurNom ? ` · par ${current.auteurNom}` : ""}
            </div>
          </>
        ) : (
          <div style={{fontSize:12,color:"#6B7280"}}>
            Aucune décision DFCI enregistrée pour ce chantier.
          </div>
        )}
      </div>

      {/* Formulaire de saisie */}
      {showForm && (
        <div style={{borderRadius:12,padding:14,marginTop:8,
          background:"#F8FAFC",border:"1px solid #E2E8F0"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#334155",marginBottom:10,
            textTransform:"uppercase",letterSpacing:"0.05em"}}>
            Nouveau snapshot de décision
          </div>

          {/* Statut */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:"#64748B",marginBottom:4,fontWeight:600}}>
              Statut chantier *
            </div>
            <div style={{display:"flex",gap:6}}>
              {(["AUTORISE","SOUS_CONDITIONS","SUSPENDU"] as const).map(s => {
                const p = DFCI_COLORS[s];
                return (
                  <button key={s} onClick={()=>setForm(f=>({...f,statutChantier:s}))}
                    style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",
                      border:`2px solid ${form.statutChantier===s ? p.bd : "#E2E8F0"}`,
                      background:form.statutChantier===s ? p.bg : "white",
                      color:form.statutChantier===s ? p.txt : "#64748B",
                      fontWeight:form.statutChantier===s ? 700 : 400,fontSize:10,
                      textAlign:"center"}}>
                    {p.icon} {s.replace("_"," ")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Restriction horaire */}
          {form.statutChantier === "SOUS_CONDITIONS" && (
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:3,fontWeight:600}}>
                Restriction horaire
              </div>
              <input
                value={form.restrictionHoraire}
                onChange={e=>setForm(f=>({...f,restrictionHoraire:e.target.value}))}
                placeholder="Ex : Travaux mécaniques autorisés jusqu'à 13h00"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #CBD5E1",fontSize:11,
                  background:"white"}}
              />
            </div>
          )}

          {/* Arrêté */}
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{flex:2}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:3,fontWeight:600}}>Arrêté préfectoral</div>
              <input value={form.arreteRef}
                onChange={e=>setForm(f=>({...f,arreteRef:e.target.value}))}
                placeholder="Réf. arrêté"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #CBD5E1",fontSize:11,background:"white"}}/>
            </div>
          </div>

          {/* DFCI */}
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{flex:2}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:3,fontWeight:600}}>Piste DFCI</div>
              <input value={form.pisteDFCI}
                onChange={e=>setForm(f=>({...f,pisteDFCI:e.target.value}))}
                placeholder="Ex : Piste n°12"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #CBD5E1",fontSize:11,background:"white"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:3,fontWeight:600}}>Point d'eau (km)</div>
              <input type="number" value={form.pointEauDistanceKm}
                onChange={e=>setForm(f=>({...f,pointEauDistanceKm:e.target.value}))}
                placeholder="1.4"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #CBD5E1",fontSize:11,background:"white"}}/>
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{flex:2}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:3,fontWeight:600}}>Point d'eau (description)</div>
              <input value={form.pointEauDescription}
                onChange={e=>setForm(f=>({...f,pointEauDescription:e.target.value}))}
                placeholder="Ex : Mare forestière"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #CBD5E1",fontSize:11,background:"white"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"#64748B",marginBottom:3,fontWeight:600}}>Largeur accès (m)</div>
              <input type="number" value={form.largeurAccesM}
                onChange={e=>setForm(f=>({...f,largeurAccesM:e.target.value}))}
                placeholder="4.5"
                style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                  borderRadius:8,border:"1px solid #CBD5E1",fontSize:11,background:"white"}}/>
            </div>
          </div>

          {/* Accessibilité pompiers */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <input type="checkbox" id="dfci-pompiers"
              checked={form.accessibilitePompiers}
              onChange={e=>setForm(f=>({...f,accessibilitePompiers:e.target.checked}))}/>
            <label htmlFor="dfci-pompiers" style={{fontSize:11,color:"#374151",cursor:"pointer"}}>
              🚒 Accès pompiers dégagé
            </label>
          </div>

          {/* Notes */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:"#64748B",marginBottom:3,fontWeight:600}}>Notes</div>
            <textarea value={form.notes}
              onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
              placeholder="Observations complémentaires…"
              rows={2}
              style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
                borderRadius:8,border:"1px solid #CBD5E1",fontSize:11,
                background:"white",resize:"vertical"}}/>
          </div>

          <div style={{fontSize:9,color:"#94A3B8",marginBottom:8}}>
            ⏱️ Ce snapshot sera horodaté et conservé comme preuve de la décision.
          </div>

          <button onClick={save} disabled={saving}
            style={{width:"100%",padding:"10px 0",borderRadius:10,border:"none",
              cursor:saving?"not-allowed":"pointer",fontWeight:700,fontSize:13,
              background:saving?"#94A3B8":"#0F172A",color:"white"}}>
            {saving ? "Enregistrement…" : "Enregistrer la décision"}
          </button>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export const FicheLotCentrale = ({
  lot, visites=[], operateurs=[], onBack, onEdit, onBonCommande,
  onLaunchVisite, onLaunchValidation, onLaunchCloture,
  onLaunchDechiquetage, onLaunchTransporteur, onLaunchLivraison, onLaunchFinChantier,
  onRedDeclaration, onDeleguerVisite, onDeleteLot,
  toast, user,
}: any) => {
  const [onglet, setOnglet] = useState(0);
  const [deleteStep, setDeleteStep] = useState(0);
  const [releves,    setReleves]    = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [livraisons, setLivraisons] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showDeclMairie, setShowDeclMairie] = useState(false);
  const [mairieAdresse,  setMairieAdresse]  = useState("");
  const [mairieCP,       setMairieCP]       = useState("");
  const [mairieVille,    setMairieVille]    = useState("");

  const st = STATUT_LOT[lot.statutLot||"NOUVEAU"] || STATUT_LOT.NOUVEAU;
  const pipelineIdx = PIPELINE.findIndex(p=>p.id===(lot.statutLot||"NOUVEAU"));
  const visitesLot = visites.filter((v: any)=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
  const derniereVisite = visitesLot[0]||null;
  const mandataireAssigne = operateurs.find((op: any)=>(op.assignations||[])
    .some((a: any)=>(a.lotId===lot.id||a.lotNumero===lot.lotNumero)&&a.typeOperation==="mandataire"));

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      apiGet(`/releves/releves-abatteur/${lot.id}`).catch(()=>[]),
      apiGet(`/transports/lot/${lot.id}`).catch(()=>[]),
      apiGet(`/livraisons/lot/${lot.id}`).catch(()=>[]),
    ]).then(([r,t,l])=>{
      if(Array.isArray(r)) setReleves(r);
      if(Array.isArray(t)) setTransports(t);
      if(Array.isArray(l)) setLivraisons(l);
      setLoading(false);
    });
  },[lot.id]);

  // Calculs volumes
  const totalTonnes = releves.reduce((s,r: any)=>s+(parseFloat(r.poidsTotal)||0),0);
  const totalMWh    = releves.reduce((s,r: any)=>s+(parseFloat(r.energieMWh)||0),0);
  const typeRessLabel = (t: any) => TYPE_RESSOURCE_OPTS.find(([v])=>v===t)?.[2]??t;
  const isDemo = !!(user?.id?.startsWith("demo-"));

  const TABS = [
    {id:"general",   icon:"📊", label:"Général"},
    {id:"parcelle",  icon:"🌲", label:"Parcelle"},
    {id:"tas",       icon:"📦", label:"Tas"},
    {id:"transport", icon:"🚛", label:"Transport"},
    {id:"livraisons",icon:"📍", label:"Livraisons"},
    {id:"documents", icon:"📄", label:"Documents"},
  ];

  // Boutons d'action contextuels
  const s = lot.statutLot||"NOUVEAU";
  const actions = [
    (["NOUVEAU","VISITE_PREVUE"].includes(s)||!s) &&
      (mandataireAssigne
        ? {icon:"🔒",label:"Visite",bg:C.bg2,bd:C.bd,color:C.tx3,
           fn:()=>toast(`Visite réservée au mandataire désigné : ${mandataireAssigne.nom}${mandataireAssigne.prenom?" "+mandataireAssigne.prenom:""}`,"warn")}
        : {icon:"🔭",label:"Visite",bg:C.greenL,bd:C.green,color:C.greenD,fn:onLaunchVisite}),
    (["NOUVEAU","VISITE_PREVUE"].includes(s)||!s) &&
      {icon:"🔑",label:"Déléguer",bg:C.blueL,bd:C.blue,color:C.blueD,fn:onDeleguerVisite},
    ["VISITE_REALISEE","VALIDE_EXPLOITATION"].includes(s) &&
      {icon:"✅",label:"Valider",bg:C.blueL,bd:C.blue,color:C.blueD,fn:onLaunchValidation},
    ["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION"].includes(s) &&
      {icon:"🏁",label:"Clôture",bg:C.amberL,bd:C.amber,color:C.amberD,fn:onLaunchCloture},
    ["BORD_ROUTE","A_DECHIQUETER"].includes(s) &&
      {icon:"🌀",label:"Déchi.",bg:"#FAECE7",bd:"#D85A30",color:"#D85A30",fn:onLaunchDechiquetage},
    ["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"🚛",label:"Transp.",bg:C.purpleL,bd:C.purple,color:C.purpleD,fn:onLaunchTransporteur},
    ["EN_COURS_DECHIQUETAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"📦",label:"Livraison",bg:C.greenL,bd:C.green,color:C.greenD,fn:onLaunchLivraison},
    ["LIVRE_CHAUFFERIE","EN_STOCK_PLATEFORME","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"🏁",label:"Fin chantier",bg:"#F0EBF8",bd:"#7B2FBE",color:"#7B2FBE",fn:onLaunchFinChantier},
  ].filter(Boolean);

  // Max 4 boutons visibles — priorité aux plus avancés
  const actionsVisible: any[] = actions.slice(-4);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>

      {/* ── HEADER ── */}
      <div style={{background:C.sb,color:"#fff",flexShrink:0}}>
        <div style={{padding:"10px 16px 8px",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.12)",border:"none",
            color:"#fff",padding:"8px 14px",borderRadius:10,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",gap:6,
            minHeight:40,flexShrink:0}}>
            {"‹"} <span style={{fontWeight:600}}>Lots</span>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lot.lotNumero}</div>
            <div style={{fontSize:11,opacity:.65,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {lot.nom}{lot.prenom?` ${lot.prenom}`:""} · {lot.commune}
            </div>
          </div>
          <span style={{fontSize:10,padding:"5px 10px",borderRadius:20,fontWeight:700,
            background:st.bg,color:st.color,flexShrink:0}}>
            {st.label}
          </span>
          <button onClick={onEdit} style={{background:"rgba(255,255,255,.12)",border:"none",
            color:"#fff",padding:"8px 12px",borderRadius:10,fontSize:16,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",minHeight:40,flexShrink:0}}>✏️</button>
        </div>

        {/* Pipeline horizontal */}
        <div style={{overflowX:"auto",display:"flex",alignItems:"center",
          gap:0,padding:"6px 16px 12px",scrollbarWidth:"none"}}>
          {PIPELINE.map((p,i)=>{
            const done = i < pipelineIdx;
            const current = i === pipelineIdx;
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{
                    width:current?36:28,height:current?36:28,borderRadius:"50%",
                    background:current?"#fff":done?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:current?16:12,
                    border:current?"2.5px solid #fff":"1px solid rgba(255,255,255,.2)",
                    boxShadow:current?"0 0 0 3px rgba(255,255,255,.2)":undefined,
                    transition:"all .2s"}}>
                    {done?"✓":p.icon}
                  </div>
                  {current&&(
                    <div style={{fontSize:9,color:"rgba(255,255,255,.9)",
                      whiteSpace:"nowrap",fontWeight:700,marginTop:0,
                      textAlign:"center",maxWidth:60}}>
                      {p.label}
                    </div>
                  )}
                </div>
                {i<PIPELINE.length-1&&(
                  <div style={{width:current||i===pipelineIdx-1?16:12,height:1.5,
                    background:done?"rgba(255,255,255,.55)":"rgba(255,255,255,.15)",
                    margin:"0 3px",
                    marginBottom:current||i===pipelineIdx-1?18:0}}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Tab bar — horizontal scroll */}
        <div style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",
          borderTop:"1px solid rgba(255,255,255,.1)"}}>
          {TABS.map((t,i)=>(
            <button key={t.id} onClick={()=>setOnglet(i)} style={{
              flex:"0 0 auto",minWidth:72,height:50,background:"transparent",border:"none",
              color:onglet===i?"#fff":"rgba(255,255,255,.5)",
              fontFamily:"inherit",fontSize:11,fontWeight:onglet===i?700:400,
              cursor:"pointer",display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:2,padding:"0 10px",
              borderBottom:onglet===i?"2.5px solid #fff":"2.5px solid transparent",
              WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
              <span style={{fontSize:16}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENU ── */}
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:actions.length?90:20}}>

        {/* ── ONGLET 0 : GÉNÉRAL ── */}
        {onglet===0&&(
          <div>
            {/* Métriques clés */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[
                lot.potentiel==="haie_bocager"
                  ? {icon:"🌿",label:"Linéaire",val:lot.lineaireHaieM?`${lot.lineaireHaieM} m`:"—",color:"#16A34A",bg:"#F0FDF4"}
                  : {icon:"🌲",label:"Surface",val:lot.surfaceHa?`${lot.surfaceHa} ha`:"—",color:C.green,bg:C.greenL},
                {icon:"🪵",label:"Ressource",val:typeRessLabel(lot.potentiel)||"—",color:C.brown,bg:C.brownL},
                {icon:"⚖️",label:"Volume estimé",val:derniereVisite?`${fmtNum(derniereVisite.volumeEstimeT)} t`:"—",color:C.amber,bg:C.amberL},
                {icon:"📊",label:"Relevés",val:`${releves.length} relevé${releves.length!==1?"s":""}`,color:C.blue,bg:C.blueL},
              ].map((m,i)=>(
                <div key={i} style={{background:m.bg,borderRadius:14,padding:14}}>
                  <div style={{fontSize:22,marginBottom:6}}>{m.icon}</div>
                  <div style={{fontSize:18,fontWeight:700,color:m.color}}>{m.val}</div>
                  <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Niveau de justification des données */}
            {(()=>{
              const niveau = livraisons.length>0 ? 3 : releves.length>0 ? 2 : derniereVisite ? 1 : 0;
              const niveaux = [
                {n:1, label:"Estimé",   icon:"📐", desc:"Volume issu de la visite terrain",            color:"#B45309", bg:"#FEF3C7"},
                {n:2, label:"Déclaré",  icon:"📋", desc:"Données d'exploitation saisies par l'équipe", color:"#1D4ED8", bg:"#DBEAFE"},
                {n:3, label:"Justifié", icon:"✅", desc:"Livraisons documentées (CMR / bons)",         color:"#15803D", bg:"#DCFCE7"},
              ];
              const niv = niveaux[Math.max(niveau-1,0)];
              return (
                <div style={{borderRadius:14,padding:14,marginBottom:16,
                  background:niveau>0?niv.bg:"#F3F4F6",
                  border:`1.5px solid ${niveau>0?niv.color:"#E5E7EB"}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10,
                    letterSpacing:"0.06em",textTransform:"uppercase"}}>
                    Niveau de justification
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {niveaux.map((n)=>{
                      const active = niveau>=n.n;
                      const current = niveau===n.n;
                      return (
                        <div key={n.n} style={{flex:1,borderRadius:10,padding:"10px 6px",textAlign:"center",
                          background:active?n.bg:"#F9FAFB",
                          border:`1.5px solid ${active?n.color:"#E5E7EB"}`,
                          opacity:active?1:0.45}}>
                          <div style={{fontSize:20,marginBottom:3}}>{active?n.icon:"○"}</div>
                          <div style={{fontSize:11,fontWeight:700,color:active?n.color:C.tx3}}>{n.label}</div>
                          {current&&<div style={{fontSize:9,color:n.color,marginTop:2,fontWeight:700}}>actuel</div>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{fontSize:10,color:niv.color,marginTop:8,fontWeight:500}}>{niv.desc}</div>
                </div>
              );
            })()}

            {/* Volumes calculés depuis relevés */}
            {releves.length>0&&(
              <div style={{background:C.amberL,borderRadius:14,padding:16,marginBottom:16,
                border:`1.5px solid ${C.amber}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.amberD,marginBottom:10}}>
                  📊 Volumes réels (relevés opérateurs)
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    [fmtNum(totalTonnes,1),"t récoltées"],
                    [fmtNum(totalMWh,1),"MWh potentiel"],
                    [releves.length+" relev.","saisies"],
                  ].map(([v,l],i)=>(
                    <div key={i} style={{textAlign:"center",
                      background:"rgba(186,117,23,.1)",borderRadius:10,padding:10}}>
                      <div style={{fontSize:18,fontWeight:700,color:C.amberD}}>{v}</div>
                      <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Infos rapides */}
            <SectionTitle icon="ℹ️" label="Infos rapides"/>
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
              border:`1px solid ${C.bd}`}}>
              {[
                ["📍","Commune",lot.commune],
                ["🏷️","N° lot",lot.lotNumero],
                ["📐","Réf. cadastrale",lot.refCadastrale||"—"],
                ["📅","Date contact",lot.dateContact||"—"],
                ["🤝","Apporteur",lot.nomApporteur||"—"],
                lot.certification&&["🏅","Certification",lot.certification?.toUpperCase()],
              ].filter(Boolean).map(([e,l,v],i,arr)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"10px 0",
                  borderBottom:i<arr.length-1?`1px solid ${C.bd}`:"none"}}>
                  <span style={{fontSize:12,color:C.tx3}}>{e} {l}</span>
                  <span style={{fontSize:13,fontWeight:500,color:C.tx,
                    textAlign:"right",maxWidth:"55%"}}>{v}</span>
                </div>
              ))}
            </div>

            {/* Bois bocager — champs spécifiques haie */}
            {lot.potentiel==="haie_bocager"&&(
              <div style={{borderRadius:14,padding:14,marginBottom:14,
                background:"#F0FDF4",border:"1.5px solid #86EFAC"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#166534",
                  textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>
                  🌿 Bois bocager / Haie
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {lot.lineaireHaieM&&(
                    <div style={{background:"#fff",borderRadius:10,padding:"6px 12px",
                      border:"1px solid #BBF7D0"}}>
                      <div style={{fontSize:10,color:"#6B7280"}}>Linéaire haie</div>
                      <div style={{fontSize:15,fontWeight:700,color:"#166534"}}>
                        {lot.lineaireHaieM} m
                      </div>
                    </div>
                  )}
                  {lot.cbqPlus&&(
                    <div style={{background:"#DCFCE7",borderRadius:10,padding:"6px 12px",
                      border:"1px solid #86EFAC",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:16}}>🏅</span>
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:"#166534"}}>CBQ+</div>
                        <div style={{fontSize:9,color:"#4ADE80"}}>Éligible</div>
                      </div>
                    </div>
                  )}
                  {lot.proprietaireHaie&&(
                    <div style={{background:"#fff",borderRadius:10,padding:"6px 12px",
                      border:"1px solid #BBF7D0",flex:1,minWidth:120}}>
                      <div style={{fontSize:10,color:"#6B7280"}}>Propriétaire haie</div>
                      <div style={{fontSize:12,fontWeight:600,color:"#166534"}}>
                        {lot.proprietaireHaie}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contexte territorial IGN — si le lot a des coordonnées GPS */}
            {lot.gpsLat&&lot.gpsLng&&(
              <GeoContextBadge lat={lot.gpsLat} lng={lot.gpsLng}/>
            )}

            {/* Risque incendie EFFIS — si le lot a des coordonnées GPS */}
            {lot.gpsLat&&lot.gpsLng&&(
              <EffisBadge lat={lot.gpsLat} lng={lot.gpsLng}/>
            )}

            {/* Sécurité DFCI — snapshot horodaté valeur juridique */}
            <DFCIBadge contactId={lot.id} token={user?.token}/>

            {/* Risques ressource (INCENDIE, CLIMATIQUE, SANITAIRE…) */}
            <RisqueBadge contactId={lot.id}/>

            {/* Dossier sanitaire / Post-incendie */}
            <LotSanitaireBadge contactId={lot.id}/>

            {/* Mandataire désigné — tant que la visite n'a pas été réalisée */}
            {!derniereVisite&&mandataireAssigne&&(
              <div style={{background:C.blueL,borderRadius:12,padding:14,marginBottom:14,
                border:`1px solid ${C.blue}`,fontSize:12,color:C.blueD}}>
                🔭 <strong>Mandataire désigné</strong> : {mandataireAssigne.nom}{mandataireAssigne.prenom?` ${mandataireAssigne.prenom}`:""}
                <br/>Seule cette personne peut réaliser la visite terrain de ce lot.
              </div>
            )}

            {/* Dernière visite */}
            {derniereVisite&&(
              <>
                <SectionTitle icon="🔭" label="Dernière visite"/>
                <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
                  border:`1px solid ${C.bd}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontSize:14,fontWeight:600}}>📅 {derniereVisite.date}</div>
                    <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                      background:C.greenL,color:C.greenD,fontWeight:600}}>✅ Validée</span>
                  </div>
                  <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                    📦 {fmtNum(derniereVisite.volumeEstimeT)} t · 🌲 {derniereVisite.surfaceHa} ha<br/>
                    🚛 Accès {derniereVisite.accesCamion}
                    {derniereVisite.accesCamion==="praticable"?" ✓":" ⚠️"}<br/>
                    {derniereVisite.essences?.length>0&&
                      `🌿 ${derniereVisite.essences.map((e: any)=>`${e.label} ${e.pct}%`).join(", ")}`}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ONGLET 1 : PARCELLE ── */}
        {onglet===1&&(
          <div>
            <SectionTitle icon="👤" label="Propriétaire / Contact"/>
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
              border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:16,fontWeight:700,color:C.tx,marginBottom:4}}>
                {lot.nom} {lot.prenom}
              </div>
              {[
                ["📞",lot.telephone],["📧",lot.email],
                ["📮",lot.adressePostale],["📮",lot.complementAdresse],
                lot.estPersonneMorale&&["🏢",lot.typePersonneMorale?.toUpperCase()],
                lot.nomSignataire&&["✍️",`Signataire : ${lot.nomSignataire}`],
              ].filter(Boolean).map(([e,v],i)=>v&&(
                <div key={i} style={{fontSize:13,color:C.tx2,marginTop:6}}>{e} {v}</div>
              ))}
            </div>

            <SectionTitle icon="🌲" label="Parcelle"/>
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
              border:`1px solid ${C.bd}`}}>
              {[
                ["📍","Commune",lot.commune],
                ["🏡","Lieu-dit",lot.adresseParcelle||"—"],
                ["📐","Surface",lot.surfaceHa?`${lot.surfaceHa} ha`:"—"],
                ["🗂️","Réf. cadastrale",lot.refCadastrale||"—"],
              ].map(([e,l,v],i,arr)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"9px 0",
                  borderBottom:i<arr.length-1?`1px solid ${C.bd}`:"none"}}>
                  <span style={{fontSize:12,color:C.tx3}}>{e} {l}</span>
                  <span style={{fontSize:13,fontWeight:500,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>

            {derniereVisite&&(
              <>
                <SectionTitle icon="⚠️" label="Contraintes terrain"/>
                <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
                  border:`1px solid ${C.bd}`}}>
                  {Object.entries(derniereVisite.contraintes||{}).filter(([,v])=>v).length===0 ? (
                    <div style={{fontSize:13,color:C.tx3}}>Aucune contrainte signalée ✅</div>
                  ) : Object.entries(derniereVisite.contraintes||{}).filter(([,v])=>v).map(([k],i)=>(
                    <div key={i} style={{fontSize:13,color:C.amberD,padding:"4px 0"}}>
                      ⚠️ {k}
                    </div>
                  ))}
                </div>

                <SectionTitle icon="🚛" label="Accès"/>
                <div style={{background:
                  derniereVisite.accesCamion==="praticable"?C.greenL:
                  derniereVisite.accesCamion==="difficile"?C.amberL:C.redL,
                  borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${
                    derniereVisite.accesCamion==="praticable"?C.green:
                    derniereVisite.accesCamion==="difficile"?C.amber:C.red}`}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.tx}}>
                    {derniereVisite.accesCamion==="praticable"?"✅ Praticable":
                     derniereVisite.accesCamion==="difficile"?"⚠️ Difficile":"🚫 Impossible"}
                  </div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:4}}>
                    Largeur : {derniereVisite.largeurAcces}m ·
                    Distance plateforme : {derniereVisite.distancePlateforme}m
                  </div>
                </div>
              </>
            )}

            {derniereVisite?.replantation&&derniereVisite.replantation!=="non"&&(
              <>
                <SectionTitle icon="🌱" label="Replantation"/>
                <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${C.green}`}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.greenD,marginBottom:6}}>
                    {derniereVisite.replantation==="oui"?"✅ Prévue":"❓ À définir"}
                  </div>
                  {derniereVisite.essenceReplanT&&
                    <div style={{fontSize:12,color:C.tx3}}>🌿 {derniereVisite.essenceReplanT}</div>}
                  {derniereVisite.surfaceReplant&&
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>
                      📐 {derniereVisite.surfaceReplant} ha · 👤 {derniereVisite.respReplant}
                    </div>}
                </div>
              </>
            )}

            {derniereVisite?.certification&&derniereVisite.certification!=="aucune"&&(
              <>
                <SectionTitle icon="🏅" label="Certification"/>
                <div style={{background:C.blueL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${C.blue}`}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.blueD}}>
                    {derniereVisite.certification.toUpperCase()}
                  </div>
                  {derniereVisite.certification==="red"&&(
                    <div style={{fontSize:12,color:C.tx3,marginTop:4,lineHeight:1.7}}>
                      📦 {derniereVisite.redCategorie}<br/>
                      🌍 {derniereVisite.redPays} · 📏 {derniereVisite.redDistance} km
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ONGLET 2 : TAS ── */}
        {onglet===2&&(
          <div>
            {loading?(
              <div style={{textAlign:"center",padding:"40px 0",color:C.tx3}}>
                <div style={{fontSize:32,marginBottom:8}}>⏳</div>
                Chargement des relevés…
              </div>
            ):releves.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>📦</div>
                <div style={{fontSize:15,fontWeight:500}}>Aucun relevé</div>
                <div style={{fontSize:13,marginTop:6}}>
                  Les opérateurs terrain saisiront leurs relevés ici
                </div>
              </div>
            ):(
              <>
                <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${C.amber}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      [fmtNum(totalTonnes,1)+"t","Total"],
                      [fmtNum(totalMWh,1)+" MWh","Énergie"],
                      [releves.length+" relev.","Saisies"],
                    ].map(([v,l],i)=>(
                      <div key={i} style={{textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:700,color:C.amberD}}>{v}</div>
                        <div style={{fontSize:10,color:C.tx3}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {releves.map((r,i)=>(
                  <div key={r.id||i} style={{background:"#fff",borderRadius:14,padding:14,
                    marginBottom:10,border:`1px solid ${C.bd}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{fontSize:13,fontWeight:600}}>{r.operateurNom||"Opérateur"}</div>
                      <div style={{fontSize:11,color:C.tx3}}>{r.date?.slice(0,10)||""}</div>
                    </div>
                    <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                      {r.nbTas&&`📦 ${r.nbTas} tas · `}
                      {r.poidsTotal&&`⚖️ ${r.poidsTotal} t · `}
                      {r.energieMWh&&`⚡ ${r.energieMWh} MWh`}
                    </div>
                    {r.typeOperation&&(
                      <div style={{marginTop:6,fontSize:11,padding:"2px 8px",
                        display:"inline-block",borderRadius:6,
                        background:C.bg2,color:C.tx2}}>
                        {r.typeOperation}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── ONGLET 3 : TRANSPORT ── */}
        {onglet===3&&(
          <div>
            {loading?(
              <div style={{textAlign:"center",padding:"40px 0",color:C.tx3}}>⏳ Chargement…</div>
            ):transports.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>🚛</div>
                <div style={{fontSize:15,fontWeight:500}}>Aucun transport</div>
                <div style={{fontSize:13,marginTop:6}}>
                  Déclenchez le déchiquetage pour créer un transport
                </div>
              </div>
            ):(
              transports.map((t,i)=>(
                <div key={t.id||i} style={{background:"#fff",borderRadius:14,padding:16,
                  marginBottom:12,border:`1px solid ${C.bd}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.purpleD}}>
                      CMR {t.numeroCMR||"—"}
                    </div>
                    <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,fontWeight:600,
                      background:C.purpleL,color:C.purpleD}}>
                      {t.typeVehicule||"transport"}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:C.tx3,lineHeight:1.9}}>
                    🚛 {t.immatTracteur||"—"} · {t.immatRemorque||""}<br/>
                    👤 {t.nomChauffeur||t.chauffeur||"—"}<br/>
                    🏢 {t.societeTransp||t.entrepriseDechiquetage||t.entrepriseBroyage||"—"}<br/>
                    {t.heureDebut&&`⏱️ Départ : ${t.heureDebut}`}
                    {t.heureFin&&` → ${t.heureFin}`}
                  </div>
                  {t.departConfirme&&(
                    <div style={{marginTop:8,fontSize:11,color:C.green,fontWeight:600}}>
                      ✅ Départ confirmé par le chauffeur
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ONGLET 4 : LIVRAISONS ── */}
        {onglet===4&&(
          <div>
            {loading?(
              <div style={{textAlign:"center",padding:"40px 0",color:C.tx3}}>⏳ Chargement…</div>
            ):livraisons.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>📍</div>
                <div style={{fontSize:15,fontWeight:500}}>Aucune livraison</div>
                <div style={{fontSize:13,marginTop:6}}>En attente de livraison</div>
              </div>
            ):(
              <>
                {/* Récap poids total livré */}
                {livraisons.length>0&&(()=>{
                  const totalLivr = livraisons.reduce((s,l)=>s+(l.poidsNet||l.poidsBrut||0),0);
                  return (
                    <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
                      border:`1.5px solid ${C.green}`}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:8}}>
                        ✅ Total livré
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:22,fontWeight:700,color:C.greenD}}>{fmtNum(totalLivr,1)} t</div>
                          <div style={{fontSize:10,color:C.tx3}}>poids livré</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:22,fontWeight:700,color:C.greenD}}>{livraisons.length}</div>
                          <div style={{fontSize:10,color:C.tx3}}>livraison(s)</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {livraisons.map((l,i)=>(
                  <div key={l.id||i} style={{background:"#fff",borderRadius:14,padding:16,
                    marginBottom:12,border:`1px solid ${C.bd}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{fontSize:14,fontWeight:600}}>
                        🔥 {l.nomDestination||"—"}
                      </div>
                      <div style={{fontSize:11,color:C.tx3}}>
                        {l.date?.slice(0,10)||""}
                      </div>
                    </div>
                    <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                      ⚖️ {(l.poidsNet||l.poidsBrut||"—")} t ·
                      💧 {l.humiditeReception||l.humiditeMesuree||"—"}%<br/>
                      👤 Réceptionnaire : {l.nomReceptionnaire||"—"}
                      {l.numeroCMR&&<><br/>📄 CMR : {l.numeroCMR}</>}
                    </div>
                    {l.gpsAlerteDeclenche&&(
                      <div style={{marginTop:8,fontSize:11,color:C.red,fontWeight:600}}>
                        ⚠️ Alerte GPS déclenchée à la livraison
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── ONGLET 5 : DOCUMENTS ── */}
        {onglet===5&&(
          <div>
            {[
              {icon:"📋",titre:"Compte rendu entretien de contact",
               statut:"✅ Disponible",color:C.green,bg:C.greenL,
               action:"Générer PDF",
               onAction:()=>generatePdfFromHtml(buildCompteRenduContactHTML(lot),
                 `CompteRenduContact_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🔭",titre:"PV de visite de terrain",
               statut:derniereVisite?"✅ Visite du "+derniereVisite.date:"⏳ Non réalisée",
               color:derniereVisite?C.green:C.tx3,bg:derniereVisite?C.greenL:C.bg2,
               action:derniereVisite?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildPVVisiteHTML(lot, derniereVisite, user?.prenom?`${user.prenom} ${user.nom||""}`.trim():user?.nom||""),
                 `PV_Visite_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"📋",titre:"Bon de commande",
               statut:lot.lotNumero?"✅ N° lot généré — prêt à générer":"⏳ En attente",
               color:lot.lotNumero?C.green:C.tx3,bg:lot.lotNumero?C.greenL:C.bg2,
               action: lot.lotNumero ? "Générer PDF" : null,
               onAction: onBonCommande},

              {icon:"📝",titre:"Ordre d'exploitation",
               statut:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?"✅ Disponible":"⏳ En attente validation",
               color:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?C.green:C.tx3,
               bg:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?C.greenL:C.bg2,
               action:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildSimpleDocHTML(lot,"Ordre d'exploitation",[
                 {icon:"🌲",label:"Parcelle",rows:[
                   ["Commune",lot.commune], ["Réf. cadastrale",lot.refCadastrale],
                   ["Surface",lot.surfaceHa?lot.surfaceHa+" ha":null],
                 ]},
                 {icon:"🪓",label:"Exploitation",rows:[
                   ["Essence",derniereVisite?.essences?.map((e: any)=>e.label).join(", ")],
                   ["Volume estimé",derniereVisite?.volumeEstimeT?derniereVisite.volumeEstimeT+" t":null],
                   ["Accès camion",derniereVisite?.accesCamion],
                 ]},
               ],"Ordre d'exploitation généré automatiquement par APPLITAG."),
                 `OrdreExploitation_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🏁",titre:"Réception d'exploitation",
               statut:(isDemo||["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?"✅ Effectuée":"⏳ En attente",
               color:(isDemo||["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?C.green:C.tx3,
               bg:(isDemo||["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?C.greenL:C.bg2,
               action:(isDemo||["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildReceptionExploitHTML(lot, derniereVisite, user),
                 `ReceptionExploitation_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🌀",titre:"Ordre de déchiquetage",
               statut:(isDemo||["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?"✅ Disponible":"⏳ En attente bord de route",
               color:(isDemo||["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?C.green:C.tx3,
               bg:(isDemo||["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?C.greenL:C.bg2,
               action:(isDemo||["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildOrdreDechiHTML(lot, derniereVisite, {
                 doNom:"APPLITAG SAS", doAdresse:"Gestion des flux bois énergie",
                 entrepriseNom:lot.entrepriseDechiquetage||"—",
                 machine:lot.machineDechiquetage||"Jenz HEM 593",
                 operateur:lot.operateurDechiquetage||"—",
                 datePrevue:lot.datePrevueDechiquetage||"—",
                 granulometrie:"P45",
               }),`OrdreDechiquetage_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🚛",titre:"CMR Transport",
               statut:(isDemo||transports.length>0)?`✅ ${transports.length||1} CMR`:"⏳ En attente déchiquetage",
               color:(isDemo||transports.length>0)?C.purple:C.tx3,
               bg:(isDemo||transports.length>0)?C.purpleL:C.bg2,
               action:(isDemo||transports.length>0)?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(
                 buildCMRHTML(lot, transports[0]||{numeroCMR:"CMR-2026-0042",immatTracteur:"AB-512-CD",immatRemorque:"XY-001-ZZ",heureDebut:"07:30"}, livraisons[0]||{nomDestination:"Plateforme Auxerre Énergie",pesee:"24.5"}),
                 `CMR_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"📦",titre:"Bon de livraison",
               statut:(isDemo||livraisons.length>0)?`✅ ${livraisons.length||1} livraison(s)`:"⏳ En attente livraison",
               color:(isDemo||livraisons.length>0)?C.green:C.tx3,
               bg:(isDemo||livraisons.length>0)?C.greenL:C.bg2,
               action:(isDemo||livraisons.length>0)?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildSimpleDocHTML(lot,"Bon de livraison",[
                 {icon:"📦",label:"Livraison",rows:[
                   ["N° BL",livraisons[0]?.numeroBL||`BL-2026-0018`],
                   ["Date livraison",livraisons[0]?.date?.slice(0,10)||"2026-06-22"],
                   ["Heure d'arrivée zone de déchargement",livraisons[0]?.heureArrivee||livraisons[0]?.date?.slice(11,16)||"—"],
                   ["Plateforme / Destination",livraisons[0]?.nomDestination||"Auxerre Énergie — 89000 Auxerre"],
                   ["Tonnage livré",(livraisons[0]?.poidsNet||livraisons[0]?.poidsBrut)?(livraisons[0].poidsNet||livraisons[0].poidsBrut)+" t":livraisons[0]?.tonnage?livraisons[0].tonnage+" t":"23.8 t"],
                   ["Granulométrie",livraisons[0]?.granulometrie||"P45"],
                   ["Humidité réception",livraisons[0]?.humiditeReception?livraisons[0].humiditeReception+"%":"—"],
                   ["Réceptionnaire",livraisons[0]?.nomReceptionnaire||"—"],
                   ["N° CMR associé",livraisons[0]?.numeroCMR||transports[0]?.numeroCMR||"—"],
                 ]},
               ],"Bon de livraison généré automatiquement par APPLITAG."),
                 `BonLivraison_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🇪🇺",titre:"Auto-déclaration RED",
               statut:(isDemo||derniereVisite?.certification==="red")?"✅ Données RED disponibles":"ℹ️ Activer certification RED en visite",
               color:(isDemo||derniereVisite?.certification==="red")?C.blue:C.tx3,
               bg:(isDemo||derniereVisite?.certification==="red")?C.blueL:C.bg2,
               action:(isDemo||derniereVisite?.certification==="red")?"Générer":null,
               onAction:(isDemo&&!derniereVisite?.certification)?()=>generatePdfFromHtml(buildSimpleDocHTML(lot,"Auto-déclaration RED II",[
                 {icon:"🇪🇺",label:"Conformité RED II",rows:[
                   ["Certification","RED II — Directive 2018/2001/UE"],
                   ["Essence principale","Hêtre (Fagus sylvatica)"],
                   ["Origine","Forêt gérée durablement — France"],
                   ["Surface certifiée",lot.surfaceHa?lot.surfaceHa+" ha":"8.2 ha"],
                   ["Réf. cadastrale",lot.refCadastrale||"C 218"],
                   ["Commune",lot.commune||"Sens"],
                   ["Émissions GES","11,5 gCO₂eq/MJ (< 4% fossile)"],
                   ["Date déclaration","2026-06-22"],
                   ["Signataire","Marie Dupont — APPLITAG"],
                 ]},
               ],"Auto-déclaration de durabilité conforme à la Directive RED II. Document généré par APPLITAG."),
                 `AutoDeclarationRED_${lot.lotNumero||"APPLITAG"}.pdf`, toast):onRedDeclaration},

              {icon:"📷",titre:"Photos",
               statut:derniereVisite?.photos?.length>0?`✅ ${derniereVisite.photos.length} photo(s) visite`:"⏳ Aucune photo",
               color:derniereVisite?.photos?.length>0?C.blue:C.tx3,
               bg:derniereVisite?.photos?.length>0?C.blueL:C.bg2},

              {icon:"🏛️",titre:"Déclaration de chantier forestier à la mairie",
               statut:"📝 À compléter et transmettre avant démarrage",
               color:"#1565C0",bg:"#E3F2FD",
               action:"Ouvrir",
               onAction:()=>setShowDeclMairie(true)},
            ].map((doc,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:14,padding:14,
                marginBottom:10,border:`1px solid ${C.bd}`,
                display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:doc.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:22,flexShrink:0}}>
                  {doc.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.tx}}>{doc.titre}</div>
                  <div style={{fontSize:11,color:doc.color,marginTop:2,fontWeight:500}}>
                    {doc.statut}
                  </div>
                </div>
                {doc.action&&(
                  <button onClick={doc.onAction||undefined}
                    style={{padding:"6px 12px",borderRadius:8,
                    background:C.greenL,color:C.greenD,border:"none",
                    fontSize:11,fontWeight:600,cursor:"pointer",
                    fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
                    {doc.action}
                  </button>
                )}
              </div>
            ))}

            {showDeclMairie&&(()=>{
              const entNom   = lot.etfNom||"";
              const commune  = lot.commune||"";
              const lieuDit  = lot.adresseParcelle||lot.lieuDit||"";
              const cadastre = lot.refCadastrale||"";
              const surface  = lot.surfaceHa?lot.surfaceHa+" ha":"—";
              const volume   = derniereVisite?.volumeEstimeT?fmtNum(derniereVisite.volumeEstimeT)+" t estimées":"—";
              const dateDebut= derniereVisite?.date||"";
              const essences = derniereVisite?.essences?.map((e: any)=>e.label).join(", ")||"—";
              const ready    = !!(mairieAdresse&&mairieCP&&mairieVille);
              const htmlPdf  = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;max-width:700px;margin:0 auto;padding:40px}h1{font-size:16px;text-align:center;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}.subtitle{text-align:center;font-size:12px;color:#555;margin-bottom:32px}.expediteur{margin-bottom:24px;font-size:12px;line-height:1.8}.destinataire{float:right;width:260px;border:1px solid #999;padding:12px;font-size:12px;line-height:1.8;margin-top:-60px}.objet{margin:32px 0 20px;font-weight:bold}.section{margin-bottom:16px}.section-title{font-weight:bold;text-decoration:underline;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:16px}td{padding:6px 10px;border:1px solid #ccc;font-size:12px;vertical-align:top}td:first-child{background:#f5f5f5;font-weight:600;width:45%}.signature{margin-top:48px;display:flex;justify-content:space-between}.sig-block{width:45%}.footer{margin-top:40px;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px;text-align:center}.legal{background:#fffde7;border:1px solid #f9a825;padding:10px;font-size:11px;margin:20px 0}</style></head><body>
<div class="expediteur"><strong>${entNom||"[Entreprise exécutante]"}</strong><br/>[Adresse de l'entreprise]<br/>[Code postal] [Ville]<br/>[Téléphone] · [Email]</div>
<div class="destinataire"><strong>À l'attention de Monsieur/Madame le Maire</strong><br/>Mairie de ${mairieVille}<br/>${mairieAdresse}<br/>${mairieCP} ${mairieVille}</div>
<div style="clear:both;margin-top:32px"></div>
<div style="text-align:right;font-size:12px;margin-bottom:24px">Le ${new Date().toLocaleDateString("fr-FR",{year:"numeric",month:"long",day:"numeric"})}</div>
<h1>Déclaration de chantier forestier</h1>
<div class="subtitle">Conformément aux articles L. 718-9 et R. 718-27 du Code du travail</div>
<div class="objet">Objet : Déclaration préalable de chantier forestier — commune de ${commune}</div>
<div class="legal">Cette déclaration constitue la copie obligatoire transmise à la mairie en application de l'article R. 718-27 du Code du travail. Elle est adressée simultanément à l'inspection du travail territorialement compétente. Elle ne constitue pas une demande d'autorisation de coupe.</div>
<div class="section"><div class="section-title">1. Entreprise exécutante</div><table><tr><td>Dénomination sociale</td><td>${entNom||"—"}</td></tr><tr><td>Adresse</td><td>[À compléter]</td></tr><tr><td>Représentant légal</td><td>[Nom · Qualité]</td></tr><tr><td>Téléphone</td><td>[À compléter]</td></tr><tr><td>Email</td><td>[À compléter]</td></tr></table></div>
<div class="section"><div class="section-title">2. Localisation du chantier</div><table><tr><td>Commune</td><td>${commune}</td></tr><tr><td>Lieu-dit / adresse parcelle</td><td>${lieuDit||"—"}</td></tr><tr><td>Références cadastrales</td><td>${cadastre||"—"}</td></tr><tr><td>N° de lot APPLITAG</td><td>${lot.lotNumero||"—"}</td></tr><tr><td>Surface concernée</td><td>${surface}</td></tr></table></div>
<div class="section"><div class="section-title">3. Nature et description des travaux</div><table><tr><td>Type de travaux</td><td>Abattage, façonnage et débardage de bois énergie</td></tr><tr><td>Essences concernées</td><td>${essences}</td></tr><tr><td>Volume estimé</td><td>${volume}</td></tr><tr><td>Méthode de réalisation</td><td>Chantier mécanisé</td></tr></table></div>
<div class="section"><div class="section-title">4. Calendrier prévisionnel</div><table><tr><td>Date prévisionnelle de début</td><td>${dateDebut||"[À compléter]"}</td></tr><tr><td>Date prévisionnelle de fin</td><td>[À compléter]</td></tr><tr><td>Nombre de salariés sur le chantier</td><td>[À compléter]</td></tr></table></div>
<div class="section"><div class="section-title">5. Affichage</div><p style="font-size:12px">Un panneau d'identification de l'entreprise, visible depuis les voies d'accès, sera installé en bordure du chantier conformément aux dispositions réglementaires en vigueur.</p></div>
<div class="signature"><div class="sig-block"><strong>Le déclarant</strong><br/><br/><br/><div style="border-top:1px solid #999;padding-top:4px;font-size:11px">[Nom, qualité et signature]</div></div><div class="sig-block" style="text-align:right"><strong>Pour information,<br/>le maître d'ouvrage</strong><br/><br/><br/><div style="border-top:1px solid #999;padding-top:4px;font-size:11px">${lot.nom||""} ${lot.prenom||""}</div></div></div>
<div class="footer">Document généré par APPLITAG · Réf. ${lot.lotNumero||"—"} · ${new Date().toLocaleDateString("fr-FR")}<br/>Base légale : articles L. 718-9 et R. 718-27 du Code du travail</div>
</body></html>`;
              return (
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",
                zIndex:9999,display:"flex",flexDirection:"column"}}>
                <div style={{background:"#fff",flex:1,overflowY:"auto",
                  borderRadius:"16px 16px 0 0",marginTop:48}}>
                  <div style={{position:"sticky",top:0,background:"#1565C0",
                    padding:"14px 16px",display:"flex",alignItems:"center",gap:10,
                    borderRadius:"16px 16px 0 0",zIndex:1}}>
                    <span style={{fontSize:18}}>🏛️</span>
                    <div style={{flex:1,color:"#fff"}}>
                      <div style={{fontSize:13,fontWeight:700}}>Déclaration de chantier forestier à la mairie</div>
                      <div style={{fontSize:10,opacity:.7}}>{lot.lotNumero} · {lot.commune}</div>
                    </div>
                    <button onClick={()=>setShowDeclMairie(false)} style={{
                      background:"rgba(255,255,255,.2)",border:"none",color:"#fff",
                      borderRadius:8,padding:"4px 10px",fontSize:14,cursor:"pointer",
                      fontFamily:"inherit",fontWeight:700}}>✕</button>
                  </div>
                  <div style={{padding:16}}>
                    <div style={{background:"#FFF8E1",border:"1.5px solid #FFE082",
                      borderRadius:12,padding:14,marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#F57F17",marginBottom:12}}>
                        📬 Adresse de la mairie destinataire
                      </div>
                    <div style={{marginBottom:10}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:5}}>Adresse</div>
                        <input value={mairieAdresse} onChange={e=>setMairieAdresse(e.target.value)}
                          placeholder="Ex : 1 place de la Mairie"
                          style={{width:"100%",height:44,padding:"0 12px",borderRadius:10,
                            border:`1.5px solid ${mairieAdresse?C.green:"#FFD54F"}`,
                            fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <div style={{flex:"0 0 100px"}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:5}}>Code postal</div>
                          <input value={mairieCP} onChange={e=>setMairieCP(e.target.value)}
                            placeholder="89000" maxLength={5}
                            style={{width:"100%",height:44,padding:"0 12px",borderRadius:10,
                              border:`1.5px solid ${mairieCP?C.green:"#FFD54F"}`,
                              fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:5}}>Ville</div>
                          <input value={mairieVille} onChange={e=>setMairieVille(e.target.value)}
                            placeholder="Toucy"
                            style={{width:"100%",height:44,padding:"0 12px",borderRadius:10,
                              border:`1.5px solid ${mairieVille?C.green:"#FFD54F"}`,
                              fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                      </div>
                    </div>
                    {/* Récap données pré-remplies */}
                    <div style={{background:C.bg,borderRadius:12,padding:14,marginBottom:16,
                      border:`1px solid ${C.bd}`,fontSize:12,lineHeight:1.8}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:10,textAlign:"center",
                        textTransform:"uppercase",letterSpacing:1}}>
                        Aperçu du document
                      </div>
                      {[
                        ["Entreprise exécutante", entNom||"[À renseigner]"],
                        ["Commune du chantier",   commune||"—"],
                        ["Lieu-dit / parcelle",   lieuDit||cadastre||"—"],
                        ["Réf. cadastrale",       cadastre||"—"],
                        ["Surface",               surface],
                        ["Essences",              essences],
                        ["Volume estimé",         volume],
                        ["Type de travaux",       "Abattage, façonnage, débardage bois énergie"],
                        ["Date prévisionnelle",   dateDebut||"[À compléter dans le PDF]"],
                        ["Destinataire",          ready?`Mairie de ${mairieVille} · ${mairieCP}`:"⚠️ Adresse mairie à renseigner"],
                      ].map(([l,v],i,a)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",
                          padding:"5px 0",borderBottom:i<a.length-1?`1px solid ${C.bd}`:"none"}}>
                          <span style={{color:C.tx3,fontSize:11}}>{l}</span>
                          <span style={{fontWeight:500,fontSize:12,textAlign:"right",
                            maxWidth:"55%",color:v.startsWith("⚠️")?C.amber:C.tx}}>{v}</span>
                        </div>
                      ))}
                      <div style={{marginTop:12,padding:10,background:"#E3F2FD",borderRadius:8,
                        fontSize:11,color:"#1565C0",lineHeight:1.6}}>
                        ℹ️ Formalité réglementaire (art. L. 718-9 et R. 718-27 C. trav.) — ne constitue pas une autorisation de coupe. À transmettre <strong>avant le dernier jour ouvrable précédant le démarrage</strong>.
                      </div>
                    </div>
                    <button disabled={!ready}
                      onClick={()=>generatePdfFromHtml(htmlPdf,`Declaration_Mairie_${lot.lotNumero||"APPLITAG"}.pdf`,toast)}
                      style={{width:"100%",height:50,borderRadius:14,
                        background:ready?"#1565C0":"#ccc",color:"#fff",border:"none",
                        fontFamily:"inherit",fontSize:15,fontWeight:700,
                        cursor:ready?"pointer":"default",
                        WebkitTapHighlightColor:"transparent",marginBottom:8}}>
                      {ready?"📄 Générer le PDF":"Compléter l'adresse mairie pour générer"}
                    </button>
                  </div>
                </div>
              </div>
              );
            })()}

            <div style={{background:C.blueL,borderRadius:12,padding:14,marginBottom:14,
              border:`1px solid ${C.blue}`}}>
              <div style={{fontSize:12,color:C.blueD,fontWeight:600,marginBottom:4}}>
                📋 Traçabilité complète
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                Pipeline de statut : {lot.statutLot||"NOUVEAU"}<br/>
                Visites réalisées : {visitesLot.length}<br/>
                Relevés terrain : {releves.length}<br/>
                Transports créés : {transports.length}<br/>
                Livraisons validées : {livraisons.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOUTONS D'ACTION CONTEXTUELS ── */}
      {actionsVisible.length>0&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:430,margin:"0 auto",
          padding:"10px 16px 0",
          paddingBottom:"calc(16px + env(safe-area-inset-bottom, 0px))",
          background:`linear-gradient(transparent,${C.bg} 28%)`}}>
          <div style={{display:"grid",
            gridTemplateColumns:`repeat(${Math.min(actionsVisible.length,4)},1fr)`,gap:8}}>
            {actionsVisible.map((a,i)=>(
              <button key={i} onClick={a.fn} style={{
                height:56,borderRadius:14,background:a.bg,
                border:`1.5px solid ${a.bd}`,color:a.color,
                fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:3,
                WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:20}}>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SUPPRESSION LOT (admin uniquement) ── */}
      {onDeleteLot&&(
        <div style={{position:"fixed",bottom:actionsVisible.length>0?90:16,right:16,zIndex:200}}>
          {deleteStep===0&&(
            <button onClick={()=>setDeleteStep(1)}
              style={{width:44,height:44,borderRadius:"50%",background:"#fff",
                border:"1.5px solid #E53935",color:"#E53935",fontSize:18,cursor:"pointer",
                boxShadow:"0 2px 8px rgba(0,0,0,.15)",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center"}}
              title="Supprimer ce lot">
              🗑️
            </button>
          )}
          {deleteStep===1&&(
            <div style={{background:"#fff",borderRadius:14,padding:14,
              boxShadow:"0 4px 20px rgba(0,0,0,.2)",border:"1.5px solid #E53935",
              maxWidth:240,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#B71C1C",marginBottom:4}}>
                ⚠️ Supprimer ce lot ?
              </div>
              <div style={{fontSize:11,color:C.tx3,marginBottom:12}}>
                Lot {lot.lotNumero} — {lot.nom}.<br/>Cette action est irréversible.
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setDeleteStep(0)}
                  style={{flex:1,height:38,borderRadius:10,background:C.bg,
                    border:`1px solid ${C.bd}`,color:C.tx,fontFamily:"inherit",
                    fontSize:12,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  Annuler
                </button>
                <button onClick={()=>setDeleteStep(2)}
                  style={{flex:1,height:38,borderRadius:10,background:"#FFEBEE",
                    border:"1.5px solid #E53935",color:"#B71C1C",fontFamily:"inherit",
                    fontSize:12,fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  Confirmer
                </button>
              </div>
            </div>
          )}
          {deleteStep===2&&(
            <div style={{background:"#fff",borderRadius:14,padding:14,
              boxShadow:"0 4px 20px rgba(0,0,0,.2)",border:"2px solid #B71C1C",
              maxWidth:240,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#B71C1C",marginBottom:4}}>
                🔴 Dernière confirmation
              </div>
              <div style={{fontSize:11,color:C.tx3,marginBottom:12}}>
                Toutes les données associées à ce lot seront définitivement supprimées.
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setDeleteStep(0)}
                  style={{flex:1,height:38,borderRadius:10,background:C.bg,
                    border:`1px solid ${C.bd}`,color:C.tx,fontFamily:"inherit",
                    fontSize:12,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  Annuler
                </button>
                <button onClick={()=>{ setDeleteStep(0); onDeleteLot(lot); }}
                  style={{flex:1,height:38,borderRadius:10,background:"#E53935",
                    border:"none",color:"#fff",fontFamily:"inherit",
                    fontSize:12,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


