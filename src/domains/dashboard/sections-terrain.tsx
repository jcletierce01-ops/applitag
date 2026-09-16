// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";
import { todayS, uid } from "../../shared/utils.js";

const STATUT_VERSION_COLORS = {
  EXPIRE:                      {color:"#374151",bg:"#E5E7EB",label:"Expiré"},
  ANNULE:                      {color:"#991B1B",bg:"#FEE2E2",label:"Annulé CE"},
  SUSPENDU:                    {color:"#B45309",bg:"#FEF3C7",label:"Suspendu"},
  ANNONCE_EN_ATTENTE_DE_TEXTE: {color:"#92400E",bg:"#FEF9C3",label:"Attendu"},
  OUVERT:                      {color:"#065F46",bg:"#D1FAE5",label:"Ouvert"},
};

export const SectionFinancements = () => {
  const [tab, setTab] = useState("dashboard");
  const [selProg, setSelProg] = useState(null);
  const [wfStep, setWfStep] = useState(3);
  const [selVersion, setSelVersion] = useState("v1.1");
  // Champs dossier versionnés
  const [dossDispo,      setDossDispo]      = useState("Aide au renouvellement des forêts");
  const [dossTexte,      setDossTexte]      = useState("");
  const [dossDateConsult,setDossDateConsult]= useState("");
  const [dossVersionCah, setDossVersionCah] = useState("");
  const [dossDateDepot,  setDossDateDepot]  = useState("");
  const [dossPieces,     setDossPieces]     = useState("");
  const [dossDecision,   setDossDecision]   = useState("");
  const [dossReserves,   setDossReserves]   = useState("");

  const prog = selProg ? FUNDING_PROGRAMS.find(p=>p.id===selProg) : null;

  const TABS = [
    {id:"dashboard",   label:"Tableau de bord", icon:"📊"},
    {id:"programmes",  label:"Programmes",       icon:"📋"},
    {id:"dossiers",    label:"Dossiers",          icon:"📂"},
    {id:"workflow",    label:"Workflow",          icon:"🔄"},
    {id:"veille",           label:"Veille réglementaire",  icon:"⚖️"},
    {id:"renouvellement",   label:"Renouvellement forestier", icon:"🌲"},
  ];

  const SR = (s) => STATUT_REG[s] || STATUT_REG.BROUILLON;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* Header */}
      <div style={{marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,
            background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:20,
            padding:"3px 12px",fontSize:10,fontWeight:800,color:"#92400E",marginBottom:8}}>
            📢 ANNONCE GOUVERNEMENTALE — 21 juillet 2026
          </div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            💶 Financements & Restauration forestière
          </div>
          <div style={{fontSize:12,color:C.tx2}}>
            5 dispositifs enregistrés · Statut : <span style={{fontWeight:700,color:"#92400E"}}>ANNONCÉ – textes attendus</span> · Aucun dossier déposable à ce jour
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
          {[["1 Md€","Fonds vert total"],["100 M€","Forêt (annoncé)"],["5–10k€/ha","Coût prévisionnel"]].map(([v,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:8,
              background:"#fff",border:`1px solid ${C.bd}`,borderRadius:10,
              padding:"5px 12px",fontSize:11}}>
              <span style={{fontWeight:800,color:"#0369A1"}}>{v}</span>
              <span style={{color:C.tx2}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerte ANNONCÉ */}
      <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:10,
        padding:"10px 16px",marginBottom:16,fontSize:12,color:"#92400E",
        display:"flex",alignItems:"flex-start",gap:10}}>
        <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
        <div>
          <strong>Principe réglementaire APPLITAG :</strong> Aucun taux, plafond ou règle réglementaire n'est inscrit définitivement dans l'application.
          Toutes les règles sont paramétrables, datées, versionnées et rattachées à un texte officiel.
          Les dispositifs du 21 juillet 2026 sont au statut <strong>ANNONCÉ_EN_ATTENTE_DE_TEXTE</strong> — ils seront mis à jour à la publication des décrets et cahiers des charges.
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 14px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:`2px solid ${tab===t.id?"#0369A1":C.bd}`,
              background:tab===t.id?"#0369A1":"#fff",color:tab===t.id?"#fff":C.tx2}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TABLEAU DE BORD ── */}
      {tab==="dashboard"&&(()=>{
        const alertCount = DEMO_DOSSIER.alertes.length;
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[
                {icon:"📋",label:"Programmes enregistrés",val:"5",sub:"Tous ANNONCÉ",col:"#0369A1",bg:"#DBEAFE"},
                {icon:"📂",label:"Dossiers en cours",val:"1",sub:"Diagnostic phase",col:"#1E5B3A",bg:"#D1FAE5"},
                {icon:"⚠️",label:"Alertes actives",val:String(alertCount),sub:"dont 1 bloquant",col:"#92400E",bg:"#FEF3C7"},
                {icon:"💶",label:"Investissement prév.",val:"96 k€",sub:"Indicateur 12 ha",col:"#065F46",bg:"#CCFBF1"},
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontSize:22,fontWeight:900,color:k.col}}>{k.val}</div>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx,marginBottom:2}}>{k.label}</div>
                  <div style={{fontSize:10,color:C.tx2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Contrôles automatiques */}
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>🤖 Moteur de contrôles automatiques — Dossier DOS-2026-001</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {CONTROLES_AUTO.map((c,i)=>{
                  const cfg = c.statut==="ok"
                    ? {icon:"✅",col:"#065F46",bg:"#F0FDF4"}
                    : c.statut==="warning"
                    ? {icon:"⚠️",col:"#92400E",bg:"#FFFBEB"}
                    : c.statut==="error"
                    ? {icon:"🔴",col:"#991B1B",bg:"#FEF2F2"}
                    : {icon:"ℹ️",col:"#0369A1",bg:"#EFF6FF"};
                  return (
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                      padding:"8px 12px",borderRadius:8,background:cfg.bg,
                      border:`1px solid ${cfg.col}22`}}>
                      <span style={{flexShrink:0,fontSize:13}}>{cfg.icon}</span>
                      <span style={{fontSize:11,color:cfg.col,fontWeight:c.statut==="error"?700:400}}>{c.msg}</span>
                      <span style={{marginLeft:"auto",fontSize:9,color:C.tx2,flexShrink:0,
                        background:"#fff",padding:"1px 6px",borderRadius:10,border:`1px solid ${C.bd}`}}>
                        {c.statut==="ok"?"OK":c.statut==="error"?"BLOQUANT":c.statut==="warning"?"AVERTISSEMENT":"INFO"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertes dossier */}
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>🔔 Alertes — DOS-2026-001</div>
              {DEMO_DOSSIER.alertes.map((a,i)=>{
                const cfg = a.type==="warning"
                  ? {col:"#92400E",bg:"#FFFBEB",icon:"⚠️"}
                  : {col:"#0369A1",bg:"#EFF6FF",icon:"ℹ️"};
                return (
                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                    padding:"9px 12px",borderRadius:8,background:cfg.bg,
                    border:`1px solid ${cfg.col}22`,marginBottom:6}}>
                    <span style={{flexShrink:0}}>{cfg.icon}</span>
                    <span style={{fontSize:12,color:cfg.col}}>{a.msg}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── PROGRAMMES ── */}
      {tab==="programmes"&&(
        <div style={{display:"grid",gridTemplateColumns:selProg?"1fr 380px":"1fr",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {FUNDING_PROGRAMS.map(p=>{
              const sr = SR(p.statut);
              const isActive = selProg===p.id;
              return (
                <div key={p.id} onClick={()=>setSelProg(isActive?null:p.id)}
                  style={{background:"#fff",borderRadius:12,border:`2px solid ${isActive?p.couleur:C.bd}`,
                    padding:16,cursor:"pointer",boxShadow:isActive?`0 0 0 3px ${p.bg}`:"none",
                    transition:"all .2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1}}>
                      <span style={{fontSize:28,flexShrink:0}}>{p.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{fontSize:14,fontWeight:800,color:isActive?p.couleur:C.tx}}>{p.nom}</span>
                          <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,
                            background:sr.bg,color:sr.color}}>{sr.label}</span>
                          <span style={{fontSize:9,color:C.tx2,background:"#F3F4F6",
                            padding:"2px 6px",borderRadius:6}}>{p.acronyme}</span>
                        </div>
                        <div style={{fontSize:11,color:C.tx2,marginBottom:6}}>{p.type} · {p.organisme}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {p.operationsEligibles.slice(0,3).map((o,i)=>(
                            <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:20,
                              background:p.bg,color:p.couleur,fontWeight:600}}>{o}</span>
                          ))}
                          {p.operationsEligibles.length>3&&(
                            <span style={{fontSize:10,color:C.tx2}}>+{p.operationsEligibles.length-3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,color:C.tx2}}>Annoncé le</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{p.dateAnnonce}</div>
                      <div style={{fontSize:10,color:C.tx2,marginTop:4}}>Ouverture</div>
                      <div style={{fontSize:11,fontWeight:700,color:p.dateOuverture?"#0369A1":"#9CA3AF"}}>
                        {p.dateOuverture||"Non précisée"}
                      </div>
                    </div>
                  </div>
                  {isActive&&(
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${p.couleur}22`}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:6,textTransform:"uppercase"}}>Fonctions prévues</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                        {p.fonctions.map((f,i)=>(
                          <span key={i} style={{fontSize:11,padding:"4px 10px",borderRadius:7,
                            background:p.bg,color:p.couleur,fontWeight:500,
                            border:`1px solid ${p.couleur}33`}}>🔹 {f}</span>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:"#92400E",background:"#FEF3C7",
                        border:"1px solid #F59E0B",borderRadius:8,padding:"8px 12px"}}>
                        ⚠️ {p.notes}
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                        <div style={{fontSize:10,color:C.tx2}}>Texte de référence :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.texteRef}</div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:4}}>
                        <div style={{fontSize:10,color:C.tx2}}>Version :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.version}</div>
                        <div style={{fontSize:10,color:C.tx2,marginLeft:12}}>Vérif. :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.derniereVerif}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selProg&&prog&&(
            <div style={{position:"sticky",top:0}}>
              <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
                <div style={{background:prog.bg,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                  <div style={{fontSize:24,marginBottom:4}}>{prog.icon}</div>
                  <div style={{fontSize:15,fontWeight:900,color:prog.couleur}}>{prog.nom}</div>
                  <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{prog.type}</div>
                </div>

                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Bénéficiaires</div>
                {prog.beneficiaires.map((b,i)=>(
                  <div key={i} style={{fontSize:11,color:C.tx,padding:"3px 0",
                    borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:prog.couleur}}>•</span>{b}
                  </div>
                ))}

                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginTop:12,marginBottom:8}}>Opérations éligibles</div>
                {prog.operationsEligibles.map((o,i)=>(
                  <div key={i} style={{fontSize:11,color:C.tx,padding:"3px 0",
                    borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:prog.couleur}}>✓</span>{o}
                  </div>
                ))}

                <div style={{marginTop:14,padding:"10px 12px",borderRadius:8,
                  background:"#F9FAFB",border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Paramétrage réglementaire</div>
                  {[
                    ["Taux min/max","Non publié"],
                    ["Plafond","Non publié"],
                    ["Montant national",prog.montantNational||"Non publié"],
                    ["URL officielle","Connecteur désactivé"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",
                      fontSize:10,padding:"3px 0",borderBottom:`1px solid ${C.bd}`}}>
                      <span style={{color:C.tx2}}>{k}</span>
                      <span style={{fontWeight:700,color:v==="Non publié"?"#9CA3AF":C.tx}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOSSIERS ── */}
      {tab==="dossiers"&&(
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
          {/* Liste dossiers */}
          <div>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:12,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:10}}>Dossiers actifs</div>
              <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
                border:"2px solid #0369A1",cursor:"pointer"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#0369A1",marginBottom:4}}>{DEMO_DOSSIER.id}</div>
                <div style={{fontSize:11,color:C.tx,marginBottom:3}}>{DEMO_DOSSIER.proprietaire}</div>
                <div style={{fontSize:10,color:C.tx2,marginBottom:6}}>{DEMO_DOSSIER.parcelle}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,fontWeight:700,color:"#0369A1",
                    background:"#DBEAFE",padding:"2px 8px",borderRadius:10}}>
                    {DEMO_DOSSIER.statut}
                  </span>
                  <span style={{fontSize:10,fontWeight:700,color:"#1E5B3A"}}>
                    {DEMO_DOSSIER.montantDemande.toLocaleString("fr-FR")} €
                  </span>
                </div>
              </div>
            </div>
            {/* Pièces */}
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:10}}>📎 Pièces justificatives</div>
              <div style={{fontSize:10,fontWeight:700,color:"#065F46",marginBottom:6}}>Fournies</div>
              {DEMO_DOSSIER.piecesOk.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                  fontSize:11,color:"#065F46",padding:"3px 0"}}>
                  <span>✅</span>{p}
                </div>
              ))}
              <div style={{fontSize:10,fontWeight:700,color:"#991B1B",marginTop:10,marginBottom:6}}>Manquantes</div>
              {DEMO_DOSSIER.piecesManquantes.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                  fontSize:11,color:"#991B1B",padding:"3px 0"}}>
                  <span>❌</span>{p}
                </div>
              ))}
            </div>
          </div>

          {/* Détail dossier */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:14,fontWeight:900,color:C.tx,marginBottom:4}}>
                📂 {DEMO_DOSSIER.id} — {DEMO_DOSSIER.proprietaire}
              </div>
              <div style={{fontSize:12,color:C.tx2,marginBottom:12}}>{DEMO_DOSSIER.parcelle} · {DEMO_DOSSIER.surface} ha</div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[
                  ["Programme","France Forêt 2100 + Fonds vert"],
                  ["Créé le",DEMO_DOSSIER.dateCreation],
                  ["Investissement prévi.",`${DEMO_DOSSIER.montantDemande.toLocaleString("fr-FR")} € (indicateur)`],
                  ["Étape en cours",`${DEMO_DOSSIER.stepCurrent}/24 — Diagnostic forestier`],
                ].map(([k,v])=>(
                  <div key={k} style={{padding:"8px 12px",borderRadius:8,background:"#F9FAFB",
                    border:`1px solid ${C.bd}`}}>
                    <div style={{fontSize:10,color:C.tx2,marginBottom:2}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Budget prévisionnel */}
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Budget prévisionnel par poste (indicateur 5 000–10 000 €/ha)</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {[
                  ["Diagnostic & maîtrise d'œuvre","8 400 €",8.75],
                  ["Préparation du sol","12 000 €",12.5],
                  ["Plants & plantation","36 000 €",37.5],
                  ["Protection & entretien","18 000 €",18.75],
                  ["Sécurisation & accès","9 600 €",10],
                  ["Suivi & certification","12 000 €",12.5],
                ].map(([p,v,pct])=>(
                  <div key={p} style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:10,color:C.tx2,width:160,flexShrink:0}}>{p}</div>
                    <div style={{flex:1,height:14,borderRadius:4,background:"#E5E7EB",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:"#0369A1",width:`${pct}%`}}/>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:"#0369A1",width:64,textAlign:"right",flexShrink:0}}>{v}</div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,
                  borderTop:`2px solid ${C.bd}`,paddingTop:6,marginTop:4}}>
                  <span style={{color:C.tx}}>Total indicatif</span>
                  <span style={{color:"#0369A1"}}>96 000 €</span>
                </div>
              </div>

              <div style={{marginTop:10,fontSize:10,color:"#92400E",
                background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:6,padding:"6px 10px"}}>
                ⚠️ Ces montants sont des indicateurs prévisionnels modifiables. Aucun taux réglementaire confirmé à ce stade.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WORKFLOW ── */}
      {tab==="workflow"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:14,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              🔄 Workflow — 24 étapes — DOS-2026-001 (étape {wfStep}/24)
            </div>
            {/* Mini stepper horizontal */}
            <div style={{display:"flex",overflowX:"auto",gap:2,paddingBottom:8}}>
              {WORKFLOW_FIN_STEPS.map((s,_i)=>(
                <div key={s.n} onClick={()=>setWfStep(s.n)}
                  style={{flexShrink:0,width:32,height:32,borderRadius:"50%",cursor:"pointer",
                    background:s.n<wfStep?"#1E5B3A":s.n===wfStep?"#0369A1":"#E5E7EB",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:s.n===wfStep?13:10,color:s.n<=wfStep?"#fff":"#9CA3AF",
                    fontWeight:700,transition:"all .2s",
                    boxShadow:s.n===wfStep?"0 0 0 3px #BFDBFE":undefined}}>
                  {s.n<wfStep?"✓":s.n===wfStep?s.icon:s.n}
                </div>
              ))}
            </div>
          </div>

          {/* Étape courante */}
          {(()=>{
            const cur = WORKFLOW_FIN_STEPS[wfStep-1];
            const isDone = wfStep > DEMO_DOSSIER.stepCurrent;
            const isCur = wfStep === DEMO_DOSSIER.stepCurrent;
            return (
              <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
                  <div style={{background:isCur?"#EFF6FF":isDone?"#F0FDF4":"#F9FAFB",
                    borderBottom:`1px solid ${isCur?"#93C5FD":isDone?"#86EFAC":C.bd}`,
                    padding:"14px 18px",display:"flex",gap:14,alignItems:"center"}}>
                    <div style={{width:48,height:48,borderRadius:12,
                      background:isCur?"#0369A1":isDone?"#1E5B3A":"#E5E7EB",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:22,flexShrink:0}}>
                      {cur.icon}
                    </div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:16,fontWeight:900,color:isCur?"#0369A1":isDone?"#1E5B3A":C.tx2}}>
                          Étape {cur.n} — {cur.label}
                        </span>
                        <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,
                          background:isCur?"#DBEAFE":isDone?"#D1FAE5":"#E5E7EB",
                          color:isCur?"#0369A1":isDone?"#065F46":"#6B7280"}}>
                          {isCur?"EN COURS":isDone?"À VENIR":"COMPLÉTÉ"}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:C.tx2,marginTop:3}}>DOS-2026-001 · {DEMO_DOSSIER.proprietaire}</div>
                    </div>
                  </div>
                  <div style={{padding:"16px 18px"}}>
                    <div style={{fontSize:13,color:C.tx,lineHeight:1.7,marginBottom:14}}>{cur.desc}</div>
                    {isCur&&(
                      <div style={{background:"#EFF6FF",border:"1px solid #93C5FD",borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:"#0369A1"}}>
                        📌 Cette étape est actuellement en cours pour le dossier DOS-2026-001. Toute action est datée et inscrite dans le journal d'audit.
                      </div>
                    )}
                    {!isCur&&!isDone&&(
                      <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:"#065F46"}}>
                        ✅ Étape complétée — inscrite dans le journal d'audit non modifiable.
                      </div>
                    )}
                    {isDone&&(
                      <div style={{background:"#F9FAFB",border:`1px solid ${C.bd}`,borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:C.tx2}}>
                        🔒 Étape non encore atteinte. Accessible après validation des étapes précédentes.
                      </div>
                    )}
                  </div>
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"10px 18px",
                    display:"flex",justifyContent:"space-between"}}>
                    <button onClick={()=>setWfStep(s=>Math.max(1,s-1))} disabled={wfStep===1}
                      style={{padding:"7px 16px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",
                        fontFamily:"inherit",border:`1px solid ${C.bd}`,background:"transparent",
                        color:wfStep===1?"#D1D5DB":C.tx2,opacity:wfStep===1?.4:1}}>
                      ← Précédent
                    </button>
                    <span style={{fontSize:11,color:C.tx2,alignSelf:"center"}}>{wfStep}/24</span>
                    <button onClick={()=>setWfStep(s=>Math.min(24,s+1))} disabled={wfStep===24}
                      style={{padding:"7px 16px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",
                        fontFamily:"inherit",border:"none",background:"#0369A1",color:"#fff",
                        opacity:wfStep===24?.4:1}}>
                      Suivant →
                    </button>
                  </div>
                </div>

                {/* Liste des étapes */}
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
                  padding:14,maxHeight:480,overflowY:"auto"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Toutes les étapes</div>
                  {WORKFLOW_FIN_STEPS.map(s=>{
                    const done = s.n < DEMO_DOSSIER.stepCurrent;
                    const cur2 = s.n === DEMO_DOSSIER.stepCurrent;
                    return (
                      <div key={s.n} onClick={()=>setWfStep(s.n)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",
                          borderRadius:7,cursor:"pointer",marginBottom:2,
                          background:wfStep===s.n?"#EFF6FF":"transparent",
                          border:`1px solid ${wfStep===s.n?"#93C5FD":"transparent"}`}}>
                        <span style={{fontSize:11,flexShrink:0}}>{done?"✅":cur2?"🔵":"⬜"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <span style={{fontSize:10,color:done?"#065F46":cur2?"#0369A1":C.tx2,
                            fontWeight:cur2?700:400}}>
                            {s.n}. {s.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── VEILLE RÉGLEMENTAIRE ── */}
      {tab==="veille"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.tx}}>⚖️ Veille réglementaire — Financements forestiers</div>
            <div style={{fontSize:11,color:C.tx2}}>Dernière mise à jour : 21 juillet 2026</div>
          </div>

          {VEILLE_REG.map((v,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:12,
              border:`1px solid ${v.color}33`,overflow:"hidden"}}>
              <div style={{background:v.bg,borderBottom:`1px solid ${v.color}22`,
                padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:24,flexShrink:0}}>{v.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:800,color:v.color}}>{v.titre}</span>
                    {v.statut!=="info"&&(
                      <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,fontWeight:700,
                        background:SR(v.statut).bg,color:SR(v.statut).color}}>
                        {SR(v.statut).label}
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:C.tx2}}>📅 {v.date} · {v.programme}</div>
                </div>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontSize:12,color:C.tx,lineHeight:1.7,marginBottom:10}}>{v.contenu}</div>
                <div style={{background:"#F9FAFB",border:`1px solid ${C.bd}`,borderRadius:8,
                  padding:"8px 12px",fontSize:11,color:C.tx2}}>
                  <strong style={{color:v.color}}>Impact APPLITAG :</strong> {v.impact}
                </div>
              </div>
            </div>
          ))}

          {/* Statuts réglementaires */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              Statuts réglementaires APPLITAG
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
              {Object.entries(STATUT_REG).map(([k,v])=>(
                <div key={k} style={{padding:"8px 12px",borderRadius:8,
                  background:v.bg,border:`1px solid ${v.color}33`,
                  display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:v.color,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:9,fontWeight:800,color:v.color,fontFamily:"monospace"}}>{k}</div>
                    <div style={{fontSize:10,color:C.tx2}}>{v.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RENOUVELLEMENT FORESTIER ── */}
      {tab==="renouvellement"&&(()=>{
        const vSel = RENOUVELLEMENT_VERSIONS.find(v=>v.version===selVersion)
                     || RENOUVELLEMENT_VERSIONS[2];
        const sc   = STATUT_VERSION_COLORS[vSel.statut] || STATUT_VERSION_COLORS.SUSPENDU;
        const inputSt = {
          width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
          border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
          background:C.bg,color:C.tx,boxSizing:"border-box",
        };
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Bannière alerte juridique */}
            <div style={{background:"#FEE2E2",border:"2px solid #F87171",borderRadius:12,
              padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0}}>⚖️</span>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:"#991B1B",marginBottom:4}}>
                  Guichet juridiquement fragilisé — Conseil d'État, 15 juillet 2026
                </div>
                <div style={{fontSize:12,color:"#991B1B",lineHeight:1.7}}>
                  Le décret du 2 mai 2025 encadrant l'aide au renouvellement des forêts privées
                  et des collectivités a été <strong>annulé</strong> faute de consultation préalable du public.
                  L'arrêté d'application subsiste (recours tardif), mais le guichet est classé
                  <strong> SUSPENDU</strong> par le ministère de l'Agriculture.
                  Un nouveau décret est attendu dans le cadre de la SNBC 3.
                </div>
                <div style={{marginTop:10,padding:"8px 12px",background:"#fff",borderRadius:8,
                  fontSize:11,color:"#7F1D1D",fontStyle:"italic",lineHeight:1.6,
                  border:"1px solid #FECACA"}}>
                  📋 <strong>Formulation recommandée dans vos propositions :</strong><br/>
                  « Projet techniquement préparé, sous réserve de l'ouverture du guichet et du cadre
                  réglementaire applicable à la date du dépôt. »
                </div>
              </div>
            </div>

            {/* Chronologie des versions */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
                📜 Historique réglementaire — Versionnement APPLITAG
              </div>
              <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:4}}>
                {RENOUVELLEMENT_VERSIONS.map((v,i)=>{
                  const sc2 = STATUT_VERSION_COLORS[v.statut]||STATUT_VERSION_COLORS.SUSPENDU;
                  const sel = selVersion===v.version;
                  return (
                    <div key={v.version} style={{display:"flex",alignItems:"stretch",flexShrink:0}}>
                      {i>0&&<div style={{width:32,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{width:24,height:2,background:C.bd}}/>
                      </div>}
                      <div onClick={()=>setSelVersion(v.version)} style={{
                        borderRadius:10,border:`2px solid ${sel?sc2.color:C.bd}`,
                        background:sel?sc2.bg:"#fff",padding:"10px 14px",cursor:"pointer",
                        minWidth:140,WebkitTapHighlightColor:"transparent"}}>
                        <div style={{fontSize:9,fontWeight:800,color:sc2.color,marginBottom:3,
                          background:sc2.bg,display:"inline-block",padding:"1px 6px",
                          borderRadius:8,border:`1px solid ${sc2.color}44`}}>
                          {sc2.label}
                        </div>
                        <div style={{fontSize:12,fontWeight:800,color:sel?sc2.color:C.tx,marginTop:4}}>
                          {v.version}
                        </div>
                        <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{v.label}</div>
                        <div style={{fontSize:9,color:C.tx3,marginTop:2}}>
                          {v.dateDebut}{v.dateFin?` → ${v.dateFin}`:" → en cours"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fiche version sélectionnée */}
            <div style={{background:"#fff",borderRadius:12,border:`2px solid ${sc.color}44`,overflow:"hidden"}}>
              <div style={{background:sc.bg,padding:"12px 16px",borderBottom:`1px solid ${sc.color}22`,
                display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:sc.color}}>{vSel.label}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{vSel.texte}</div>
                </div>
                <span style={{fontSize:11,fontWeight:800,padding:"4px 12px",borderRadius:20,
                  background:sc.color,color:"#fff"}}>{sc.label}</span>
              </div>
              <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
                {vSel.reservesJur.length>0&&(
                  <div style={{background:"#FEF2F2",borderRadius:8,padding:"10px 12px",border:"1px solid #FECACA"}}>
                    <div style={{fontSize:11,fontWeight:800,color:"#991B1B",marginBottom:6}}>🚫 Réserves juridiques</div>
                    {vSel.reservesJur.map((r,i)=>(
                      <div key={i} style={{fontSize:11,color:"#7F1D1D",padding:"3px 0",
                        borderBottom:i<vSel.reservesJur.length-1?`1px solid #FECACA`:"none",lineHeight:1.6}}>
                        • {r}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:6}}>📋 Pièces exigées</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {vSel.piecesCles.map((p,i)=>(
                      <span key={i} style={{fontSize:10,padding:"4px 10px",borderRadius:20,
                        background:C.bg2,border:`1px solid ${C.bd}`,color:C.tx2}}>{p}</span>
                    ))}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["📅 Consultation publique","dateConsult"],["📄 Version cahier","versionCahier"]]
                    .filter(([,k])=>vSel[k])
                    .map(([lbl,k])=>(
                      <div key={k} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                        <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{vSel[k]}</div>
                      </div>
                  ))}
                </div>
                {vSel.notes&&(
                  <div style={{background:"#FFFBEB",borderRadius:8,padding:"8px 12px",
                    border:"1px solid #FCD34D",fontSize:11,color:"#78350F",lineHeight:1.6}}>
                    📝 {vSel.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Dossier — champs versionnés */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:4}}>📂 Suivi de dossier — champs versionnés</div>
              <div style={{fontSize:11,color:C.tx3,marginBottom:12}}>
                Rattaché à la version réglementaire {selVersion}.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["Dispositif",              dossDispo,      setDossDispo,      "Aide au renouvellement…"],
                  ["Texte applicable retenu", dossTexte,      setDossTexte,      "Décret / Arrêté…"],
                  ["Date consultation publie",dossDateConsult,setDossDateConsult,"JJ/MM/AAAA"],
                  ["Version cahier des charges",dossVersionCah,setDossVersionCah,"v1.0 — 2025…"],
                  ["Date de dépôt prévu",     dossDateDepot,  setDossDateDepot,  "JJ/MM/AAAA"],
                  ["Décision obtenue",        dossDecision,   setDossDecision,   "En attente / Accordé / Refusé…"],
                ].map(([lbl,val,set,ph])=>(
                  <div key={lbl}>
                    <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{lbl}</div>
                    <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={inputSt}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Pièces exigées (personnalisées)</div>
                <textarea value={dossPieces} onChange={e=>setDossPieces(e.target.value)}
                  rows={3} placeholder="Une pièce par ligne…" style={{...inputSt,resize:"vertical"}}/>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#991B1B",marginBottom:4}}>🚫 Réserves juridiques propres à ce dossier</div>
                <textarea value={dossReserves} onChange={e=>setDossReserves(e.target.value)}
                  rows={3} placeholder="Ex : dossier déposé sous décret v1.0 — statut à confirmer…"
                  style={{...inputSt,resize:"vertical",borderColor:"#FECACA"}}/>
              </div>
            </div>

            {/* Objectifs SNBC 3 */}
            <div style={{background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",borderRadius:12,
              padding:"14px",border:"1.5px solid #6EE7B7"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:10}}>🎯 Objectifs SNBC 3 — Ambition nationale</div>
              {[
                ["10 %","des forêts françaises à renouveler/adapter d'ici 2032","Zones dépérissantes et DFCI en priorité"],
                ["−39 MtCO₂e","Rôle d'absorption forêt-bois maintenu en 2030","Objectif puits de carbone SNBC 3"],
                ["2032","Échéance du plan de renouvellement","Objectif politique confirmé, guichet à sécuriser"],
              ].map(([val,lbl,det])=>(
                <div key={val} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                  borderRadius:8,background:"#fff",border:"1px solid #A7F3D0",marginBottom:6}}>
                  <div style={{fontSize:18,fontWeight:900,color:"#065F46",minWidth:100,flexShrink:0}}>{val}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                    <div style={{fontSize:10,color:C.tx3}}>{det}</div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:8,padding:"10px 12px",background:"#fff",borderRadius:8,
                border:"1px solid #A7F3D0",fontSize:11,color:"#065F46",lineHeight:1.6}}>
                🛠️ <strong>Statut APPLITAG :</strong> Module techniquement prêt.
                Aucun moteur d'éligibilité définitif ne sera activé avant la parution du nouveau cadre réglementaire.
              </div>
            </div>

            {/* Risques */}
            <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",border:"1.5px solid #FED7AA"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:10}}>⚠️ Risques à éviter</div>
              {[
                ["Promettre une subvention aujourd'hui indisponible",
                 "Le guichet est SUSPENDU. Ne pas indiquer un taux ou montant comme acquis."],
                ["Utiliser les critères du décret annulé",
                 "Le décret du 2 mai 2025 a été annulé. Ses critères ne font plus référence."],
                ["Engager des travaux avant décision attributive",
                 "Sans acte attributif valide, les dépenses engagées ne sont pas remboursables."],
                ["Conclure que les dossiers acceptés sont annulés",
                 "Le CE n'a pas annulé les décisions individuelles — analyser cas par cas."],
              ].map(([titre,detail])=>(
                <div key={titre} style={{display:"flex",gap:10,padding:"8px 0",
                  borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
                  <span style={{fontSize:14,flexShrink:0,marginTop:1}}>🚫</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{titre}</div>
                    <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{detail}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        );
      })()}
    </div>
  );
};

// ── CONFORMITÉ RED — DONNÉES & HELPERS ─────────────────────────
const STATUT_FOURN_RED = {
  valide:    {label:"Valide",     color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  expire:    {label:"Expiré",    color:"#991B1B", bg:"#FEE2E2", icon:"❌"},
  incomplet: {label:"Incomplet", color:"#92400E", bg:"#FEF3C7", icon:"⚠️"},
  a_auditer: {label:"À auditer", color:"#1E40AF", bg:"#DBEAFE", icon:"🔵"},
};

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
const PORTANCE_OPTS = [
  {v:"legere",  l:"Légère (< 10 t)", col:"#065F46", bg:"#D1FAE5"},
  {v:"normale", l:"Normale (10–19 t)",col:"#1E40AF", bg:"#DBEAFE"},
  {v:"renforcee",l:"Renforcée (≥ 19 t)",col:"#7C3AED",bg:"#EDE9FE"},
];
const ACCES_INCENDIE_OPTS = ["Oui — accès DFCI conforme","Oui — à améliorer","Non — hors périmètre","Non — à créer"];
const DEMO_TRONCONS = [
  {
    id:"TRC-001", nom:"Chemin des Battets — section nord",
    type:"existant", proprietaire:"Commune de Tronçais",
    parcelles:["B 112","B 113","B 114"], surface:12.5,
    portance:"renforcee", largeur:4.5, pentePct:8,
    placeDepot:true, retournement:true, accesIncendie:"Oui — accès DFCI conforme",
    tonnageMobilisable:320, volumeMobilisable:480,
    coutProjet:0, travaux:"Entretien fossés 2024",
    photos:2, statut:"operationnel",
    lat:46.51, lng:2.89,
  },
  {
    id:"TRC-002", nom:"Piste de la Corniche — prolongement",
    type:"a_creer", proprietaire:"Syndicat forestier Allier",
    parcelles:["C 218","C 219"], surface:8.2,
    portance:"normale", largeur:3.5, pentePct:14,
    placeDepot:false, retournement:false, accesIncendie:"Non — à créer",
    tonnageMobilisable:180, volumeMobilisable:270,
    coutProjet:42000, travaux:"",
    photos:0, statut:"projet",
    lat:46.49, lng:2.91,
  },
  {
    id:"TRC-003", nom:"Route de la Biche — section sud",
    type:"existant", proprietaire:"Propriétaire privé",
    parcelles:["A 034"], surface:3.8,
    portance:"legere", largeur:2.8, pentePct:6,
    placeDepot:true, retournement:false, accesIncendie:"Oui — à améliorer",
    tonnageMobilisable:85, volumeMobilisable:120,
    coutProjet:8500, travaux:"Élargissement 2025 prévu",
    photos:1, statut:"a_ameliorer",
  },
];
const STATUT_TRONCON = {
  operationnel:  {l:"Opérationnel",   col:"#065F46", bg:"#D1FAE5", icon:"✅"},
  a_ameliorer:   {l:"À améliorer",    col:"#B45309", bg:"#FEF3C7", icon:"⚠️"},
  projet:        {l:"Projet",         col:"#7C3AED", bg:"#EDE9FE", icon:"📐"},
  ferme:         {l:"Fermé / interdit",col:"#991B1B",bg:"#FEE2E2", icon:"🚫"},
};

// ── APPLITAG DATA — SIGNALEMENTS ANOMALIES DESSERTES ─────────────
const SIGNALEMENTS_KEY = "applitag_signalements_desserte";
const signalementsGet = () => { try { return JSON.parse(localStorage.getItem(SIGNALEMENTS_KEY)||"[]"); } catch { return []; } };
const signalementsSet = (arr) => { try { localStorage.setItem(SIGNALEMENTS_KEY, JSON.stringify(arr)); } catch { /* noop */ } };

const TYPES_ANOMALIE = [
  {id:"orniere",     label:"Ornières / nids-de-poule",  icon:"🕳️", urgence:"orange"},
  {id:"ravinement",  label:"Ravinement",                icon:"🌊", urgence:"orange"},
  {id:"arbre_tombe", label:"Arbre tombé",               icon:"🌳", urgence:"rouge"},
  {id:"vegetation",  label:"Végétation envahissante",   icon:"🌿", urgence:"jaune"},
  {id:"pont_buse",   label:"Pont / buse dégradé",       icon:"🌉", urgence:"rouge"},
  {id:"largeur",     label:"Largeur insuffisante",      icon:"↔️", urgence:"orange"},
  {id:"fosse",       label:"Fossé bouché / débordement",icon:"💧", urgence:"orange"},
  {id:"affaissement",label:"Affaissement de chaussée",  icon:"⬇️", urgence:"rouge"},
  {id:"glissement",  label:"Glissement de terrain",     icon:"⛰️", urgence:"rouge"},
  {id:"barriere",    label:"Barrière bloquée / cassée", icon:"🚧", urgence:"orange"},
  {id:"signalisation",label:"Signalisation manquante",  icon:"🪧", urgence:"jaune"},
  {id:"incendie",    label:"Traces d'incendie",         icon:"🔥", urgence:"rouge"},
  {id:"autre",       label:"Autre",                     icon:"❓", urgence:"jaune"},
];
const URGENCES = {
  rouge:  {label:"Urgent — accès bloqué",   col:"#991B1B", bg:"#FEE2E2", icon:"🔴"},
  orange: {label:"Dégradation notable",     col:"#C2410C", bg:"#FFEDD5", icon:"🟠"},
  jaune:  {label:"Signalement préventif",   col:"#92400E", bg:"#FEF3C7", icon:"🟡"},
};
const SOURCES_PROFIL = [
  "Opérateur terrain","Propriétaire forestier","ETF","Expert forestier","Mandataire",
  "Conducteur de travaux","Chauffeur transport","Collectivité","Administration","Autre",
];

const DEMO_SIGNALEMENTS = [
  {id:"sg1",createdAt:"2026-08-05T07:12:00Z",auteur:"Martin Dupont",profil:"Opérateur terrain",
   tronconId:"TRC-003",tronconNom:"Route de la Biche — section sud",
   type:"arbre_tombe",urgence:"rouge",commentaire:"Chêne traversant la piste sur 50 m, passage impossible.",
   gps:{lat:46.495,lng:2.883},photos:2,statut:"ouvert",commune:"Saint-Bonnet-Tronçais",
   validePar:null,traitePar:null,dateTraitement:null},
  {id:"sg2",createdAt:"2026-08-04T14:30:00Z",auteur:"Claire Laurent",profil:"Mandataire",
   tronconId:"TRC-001",tronconNom:"Chemin des Battets — section nord",
   type:"fosse",urgence:"orange",commentaire:"Fossé nord bouché sur 30 m après la pluie du 3 août. Eau sur chaussée.",
   gps:{lat:46.512,lng:2.891},photos:1,statut:"ouvert",commune:"Saint-Bonnet-Tronçais",
   validePar:null,traitePar:null,dateTraitement:null},
  {id:"sg3",createdAt:"2026-07-28T09:00:00Z",auteur:"Commune de Tronçais",profil:"Collectivité",
   tronconId:"TRC-002",tronconNom:"Piste de la Corniche",
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
  {id:"d1",tronconId:"TRC-001",date:"2026-07-15",praticabilite:"praticable",
   obstacles:[],commentaire:"RAS — entretien fossés réalisé en juin.",
   photos:2,validePar:"J. Dupont",dernierPassage:"2026-07-15"},
  {id:"d2",tronconId:"TRC-003",date:"2026-07-20",praticabilite:"degradee",
   obstacles:["Ornières profondes","Végétation envahissante"],
   commentaire:"Ornières sur 80 m en sortie de coude. Passage tracteur limité.",
   photos:3,validePar:"M. Laurent",dernierPassage:"2026-07-20"},
];
const DEMO_POINTS_DFCI = [
  {id:"dfci1",type:"citerne",nom:"Citerne DFCI — Battets",tronconId:"TRC-001",
   capacite:"60 m³",gps:{lat:46.511,lng:2.892},acces:"Accès direct piste TRC-001",
   etat:"ok",dernierControle:"2026-05-10",responsable:"ONF Allier"},
  {id:"dfci2",type:"point_eau",nom:"Mare du Bois Rond",tronconId:"TRC-003",
   capacite:"Naturel",gps:{lat:46.498,lng:2.889},acces:"150 m depuis TRC-003",
   etat:"a_verifier",dernierControle:"2025-10-15",responsable:"Commune"},
  {id:"dfci3",type:"retournement",nom:"Aire de retournement Nord",tronconId:"TRC-001",
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
const NIVEAUX_RESTRICTION = [
  {id:"aucune",  label:"Aucune restriction",     icon:"🟢", couleur:"#065F46", bg:"#D1FAE5"},
  {id:"faible",  label:"Niveau faible",          icon:"🟡", couleur:"#92400E", bg:"#FEF3C7"},
  {id:"eleve",   label:"Niveau élevé",           icon:"🟠", couleur:"#C2410C", bg:"#FFEDD5"},
  {id:"tres_eleve",label:"Très élevé",           icon:"🔴", couleur:"#991B1B", bg:"#FEE2E2"},
  {id:"interdit",label:"Travaux interdits",      icon:"⛔", couleur:"#7F1D1D", bg:"#FEE2E2"},
];

// ── APPLITAG SCIERIE — MVP ───────────────────────────────────────

const SCIERIE_KEY_GRUMES    = "applitag_scierie_grumes";
const SCIERIE_KEY_COPRODUITS= "applitag_scierie_coproduits";
const SCIERIE_KEY_ENLEV     = "applitag_scierie_enlev";
const LOTS_SECONDAIRES_KEY  = "applitag_lots_secondaires";
const scierieGet = (key) => { try { return JSON.parse(localStorage.getItem(key)||"[]"); } catch { return []; } };
const lotsSecGet = () => { try { return JSON.parse(localStorage.getItem(LOTS_SECONDAIRES_KEY)||"[]"); } catch { return []; } };
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
  {id:"g1",date:"2026-07-28",fournisseur:"Forêt Bernard",essence:"Chêne",qualite:"A (grume d'œuvre)",volume:18.5,prix:95,origine:"Tronçais (03)",ref:"GR-2026-001"},
  {id:"g2",date:"2026-07-30",fournisseur:"CUMA Bois Est",essence:"Douglas",qualite:"A (grume d'œuvre)",volume:32.0,prix:68,origine:"Vosges (88)",ref:"GR-2026-002"},
  {id:"g3",date:"2026-08-01",fournisseur:"Prop. Martin",essence:"Hêtre",qualite:"B (bois d'industrie)",volume:11.2,prix:55,origine:"Haute-Marne (52)",ref:"GR-2026-003"},
];
const DEMO_COPRODUITS = [
  {id:"cp1",grumeRef:"GR-2026-001",type:"sciure",qte:2.8,humidite:18,destination:"Chaufferie",prix:0,statut:"disponible"},
  {id:"cp2",grumeRef:"GR-2026-001",type:"ecorce",qte:1.4,humidite:42,destination:"Compostage",prix:0,statut:"disponible"},
  {id:"cp3",grumeRef:"GR-2026-002",type:"plaquette",qte:6.5,humidite:25,destination:"Chaufferie",prix:28,statut:"vendu"},
  {id:"cp4",grumeRef:"GR-2026-002",type:"dosses",qte:4.2,humidite:20,destination:"Particulier",prix:15,statut:"disponible"},
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

