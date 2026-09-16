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
