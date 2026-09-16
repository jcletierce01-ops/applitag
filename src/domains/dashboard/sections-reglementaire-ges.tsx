// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";
import { VSS_RECONNUS } from "./sections.constants.js";


// ── SYSTÈMES VOLONTAIRES (VSS) RED II ──────────────────────────


const BENCH_RED = {
  redII:   { val: 3.3, label: "RED II (sites existants)", color: "#1565C0" },
  redIII:  { val: 3.7, label: "RED III (sites post-2021)", color: "#6A1B9A" },
  amont:   { val: 1.3, label: "Coût amont fournisseur moyen", color: "#2E7D32" },
};

export const SectionCoutReglementaire = ({ lots=[], livraisons=[] }) => {
  // ── Inputs coûts ──
  const [tonnageCertifie, setTonnageCertifie] = useState("");
  const [nbLots,          setNbLots]          = useState("");
  const [nbChantiers,     setNbChantiers]     = useState("");
  const [coutCertif,      setCoutCertif]      = useState("");
  const [heuresAdmin,     setHeuresAdmin]     = useState("");
  const [tauxHoraire,     setTauxHoraire]     = useState("35");
  const [heuresAudit,     setHeuresAudit]     = useState("");
  const [nbDocManquants,  setNbDocManquants]  = useState("");
  const [coutLogiciels,   setCoutLogiciels]   = useState("");
  const [autresCouts,     setAutresCouts]     = useState("");
  const [typeInstallation,setTypeInstallation]= useState("redII");
  // ── Pilote avant/après ──
  const [piloteTab,       setPiloteTab]       = useState("mesures");
  const [avantHeures,     setAvantHeures]     = useState("");
  const [apresHeures,     setApresHeures]     = useState("");
  const [coutAuditMoyen,  setCoutAuditMoyen]  = useState("");
  const [nbAudits,        setNbAudits]        = useState("");
  const [notePilote,      setNotePilote]      = useState("");

  // ── Calculs ──
  const tonnes     = parseFloat(tonnageCertifie) || 0;
  const certif     = parseFloat(coutCertif)      || 0;
  const tempAdmin  = (parseFloat(heuresAdmin)||0) * (parseFloat(tauxHoraire)||35);
  const tempAudit  = (parseFloat(heuresAudit)||0) * (parseFloat(tauxHoraire)||35);
  const logiciels  = parseFloat(coutLogiciels)   || 0;
  const autres     = parseFloat(autresCouts)      || 0;
  const total      = certif + tempAdmin + tempAudit + logiciels + autres;
  const parTonne   = tonnes > 0 ? total / tonnes : 0;
  const bench      = BENCH_RED[typeInstallation]?.val || 3.3;
  const ecartBench = parTonne > 0 ? parTonne - bench : null;

  // Pilote
  const gainHeures    = (parseFloat(avantHeures)||0) - (parseFloat(apresHeures)||0);
  const gainEuros     = gainHeures * (parseFloat(tauxHoraire)||35);
  const totalAudits   = (parseFloat(coutAuditMoyen)||0) * (parseFloat(nbAudits)||1);
  const coutConformite= tonnes > 0 ? (total + totalAudits) / tonnes : 0;

  // Données auto depuis lots/livraisons
  const lotsCount = lots.length;
  const livTotal  = livraisons.reduce((s,l)=>s+(parseFloat(l.poids)||0),0);

  const inputStyle = {
    width:"100%", padding:"9px 12px", borderRadius:10, fontSize:13,
    border:`1.5px solid ${C.bd}`, fontFamily:"inherit", outline:"none",
    background:C.bg, color:C.tx, boxSizing:"border-box"
  };
  const labelStyle = { fontSize:11, fontWeight:700, color:C.tx2, marginBottom:4 };
  const cardStyle  = (col) => ({
    background:col+"18", border:`1.5px solid ${col}44`, borderRadius:12,
    padding:"12px 14px", flex:1
  });

  return (
    <div style={{padding:"0 0 40px"}}>
      <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>
        💶 Coût réglementaire RED
      </div>
      <div style={{fontSize:12,color:C.tx3,marginBottom:18,lineHeight:1.6}}>
        Source : consortium RED — surcoût moyen estimé à <strong>3,3 €/t (RED II)</strong> et
        <strong> 3,7 €/t (RED III)</strong> pour une chaîne de 2,5 intermédiaires.
        Coût amont fournisseur : 1,0–1,6 €/t.
      </div>

      {/* Onglets */}
      {(()=>{
        const tabs=[["calculateur","🧮 Calculateur"],["pilote","🔬 Pilote avant/après"],["benchmark","📊 Benchmark consortium"]];
        return(
          <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
            {tabs.map(([id,lbl])=>(
              <button key={id} onClick={()=>setPiloteTab(id===piloteTab?piloteTab:id)} style={{
                padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit",border:`2px solid ${piloteTab===id?C.blue:C.bd}`,
                background:piloteTab===id?C.blueL:"transparent",color:piloteTab===id?C.blueD:C.tx2,
                WebkitTapHighlightColor:"transparent"}}>
                {lbl}
              </button>
            ))}
          </div>
        );
      })()}

      {/* ── CALCULATEUR ── */}
      {piloteTab==="calculateur"&&(()=>{
        const lignes = [
          ["💳","Certification VSS / organisme",         coutCertif,      setCoutCertif],
          ["💻","Logiciels & outils (abonnements/an)",   coutLogiciels,   setCoutLogiciels],
          ["📋","Autres coûts directs",                  autresCouts,     setAutresCouts],
        ];
        return(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Type installation */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Type d'installation de référence
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {Object.entries(BENCH_RED).map(([k,b])=>(
                  <button key={k} onClick={()=>setTypeInstallation(k)} style={{
                    padding:"8px 14px",borderRadius:10,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`2px solid ${typeInstallation===k?b.color:C.bd}`,
                    background:typeInstallation===k?b.color+"18":"transparent",
                    color:typeInstallation===k?b.color:C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>
                    {b.label} — {b.val} €/t
                  </button>
                ))}
              </div>
            </div>

            {/* Volumes */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Volumes (données APPLITAG auto-calculées disponibles)
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[
                  ["Tonnage certifié (t/an)",tonnageCertifie,setTonnageCertifie,
                   livTotal>0?`${livTotal.toFixed(0)} t en base`:""],
                  ["Nombre de lots",nbLots,setNbLots,
                   lotsCount>0?`${lotsCount} lots en base`:""],
                  ["Nombre de chantiers",nbChantiers,setNbChantiers,""],
                ].map(([lbl,val,set,hint])=>(
                  <div key={lbl}>
                    <div style={labelStyle}>{lbl}</div>
                    <input type="number" value={val} onChange={e=>set(e.target.value)}
                      placeholder={hint||"0"} style={inputStyle}/>
                    {hint&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>{hint}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Temps */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Temps salarié valorisé
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <div>
                  <div style={labelStyle}>Taux horaire chargé (€/h)</div>
                  <input type="number" value={tauxHoraire} onChange={e=>setTauxHoraire(e.target.value)}
                    placeholder="35" style={inputStyle}/>
                </div>
                <div>
                  <div style={labelStyle}>Heures admin traçabilité/an</div>
                  <input type="number" value={heuresAdmin} onChange={e=>setHeuresAdmin(e.target.value)}
                    placeholder="0" style={inputStyle}/>
                  {heuresAdmin&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>
                    = {((parseFloat(heuresAdmin)||0)*(parseFloat(tauxHoraire)||35)).toFixed(0)} €
                  </div>}
                </div>
                <div>
                  <div style={labelStyle}>Heures préparation audits/an</div>
                  <input type="number" value={heuresAudit} onChange={e=>setHeuresAudit(e.target.value)}
                    placeholder="0" style={inputStyle}/>
                  {heuresAudit&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>
                    = {((parseFloat(heuresAudit)||0)*(parseFloat(tauxHoraire)||35)).toFixed(0)} €
                  </div>}
                </div>
              </div>
            </div>

            {/* Autres coûts directs */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Coûts directs (€/an)
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {lignes.map(([ico,lbl,val,set])=>(
                  <div key={lbl}>
                    <div style={labelStyle}>{ico} {lbl}</div>
                    <input type="number" value={val} onChange={e=>set(e.target.value)}
                      placeholder="0" style={inputStyle}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10}}>
                <div style={labelStyle}>📦 Documents manquants détectés</div>
                <input type="number" value={nbDocManquants}
                  onChange={e=>setNbDocManquants(e.target.value)}
                  placeholder="0 (coût qualitatif — non valorisé ici)" style={{...inputStyle,width:"50%"}}/>
              </div>
            </div>

            {/* Résultat */}
            {total>0&&(
              <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
                borderRadius:14,padding:"16px",border:"2px solid #3B82F6"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#1E40AF",marginBottom:12}}>
                  📊 Résultat — Coût réglementaire RED
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  <div style={cardStyle("#1E40AF")}>
                    <div style={{fontSize:10,color:C.tx3,marginBottom:4}}>Coût total annuel</div>
                    <div style={{fontSize:22,fontWeight:900,color:"#1E40AF"}}>
                      {total.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                    </div>
                  </div>
                  {tonnes>0&&(
                    <div style={cardStyle(parTonne>bench?"#991B1B":"#065F46")}>
                      <div style={{fontSize:10,color:C.tx3,marginBottom:4}}>Coût par tonne</div>
                      <div style={{fontSize:22,fontWeight:900,
                        color:parTonne>bench?"#991B1B":"#065F46"}}>
                        {parTonne.toFixed(2)} €/t
                      </div>
                      {ecartBench!==null&&(
                        <div style={{fontSize:11,marginTop:4,color:parTonne>bench?"#991B1B":"#065F46"}}>
                          {parTonne>bench
                            ? `+${ecartBench.toFixed(2)} €/t vs référence consortium (${bench} €/t)`
                            : ecartBench<0
                              ? `${ecartBench.toFixed(2)} €/t vs référence consortium (${bench} €/t) ✓`
                              : `= référence consortium (${bench} €/t)`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Décomposition */}
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {[
                    ["Certification",          certif,    "#7C3AED"],
                    ["Temps admin valorisé",   tempAdmin, "#1565C0"],
                    ["Temps audit valorisé",   tempAudit, "#0277BD"],
                    ["Logiciels & outils",     logiciels, "#00695C"],
                    ["Autres coûts",           autres,    "#78350F"],
                  ].filter(([,v])=>v>0).map(([lbl,v,col])=>(
                    <div key={lbl} style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{height:8,borderRadius:4,background:col,
                        width:`${Math.round((v/total)*100)}%`,minWidth:4,maxWidth:"60%"}}/>
                      <span style={{fontSize:11,color:C.tx2,flexShrink:0}}>
                        {lbl} — <strong>{v.toLocaleString("fr-FR",{minimumFractionDigits:0})} €</strong>
                        {total>0&&<span style={{color:C.tx3}}> ({(v/total*100).toFixed(0)} %)</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:"10px 12px",background:"#FEF3C7",
                  borderRadius:8,fontSize:11,color:"#78350F",lineHeight:1.6}}>
                  ⚠️ <strong>Note contractuelle :</strong> Le consortium RED rappelle qu'un supplément RED
                  ne peut pas être ajouté unilatéralement aux contrats existants.
                  La prise en compte des surcoûts doit respecter les règles contractuelles et de concurrence.
                  Ces données servent à documenter et négocier, pas à facturer automatiquement.
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── PILOTE AVANT/APRÈS ── */}
      {piloteTab==="pilote"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#F0FDF4",borderRadius:12,padding:"14px",
            border:"1.5px solid #86EFAC"}}>
            <div style={{fontSize:13,fontWeight:800,color:"#14532D",marginBottom:8}}>
              🔬 Mesures du pilote de démonstration
            </div>
            <div style={{fontSize:11,color:"#166534",marginBottom:14,lineHeight:1.6}}>
              Mesurez le temps administratif, le coût d'audit et le coût de conformité par tonne
              avant et après déploiement d'APPLITAG pour quantifier le retour sur investissement.
            </div>

            {/* Taux horaire partagé */}
            <div style={{marginBottom:14}}>
              <div style={labelStyle}>Taux horaire chargé (€/h) — partagé avec le calculateur</div>
              <input type="number" value={tauxHoraire} onChange={e=>setTauxHoraire(e.target.value)}
                placeholder="35" style={{...inputStyle,width:"160px"}}/>
            </div>

            {/* Tableau avant/après */}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr>
                    {["Indicateur","Avant APPLITAG","Après APPLITAG","Gain"].map(h=>(
                      <th key={h} style={{padding:"10px 12px",textAlign:"left",
                        background:"#DCFCE7",color:"#14532D",fontWeight:800,
                        borderBottom:"2px solid #86EFAC"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(()=>{
                    const rows = [
                      {
                        label:"Temps admin traçabilité (h/an)",
                        avant:<input type="number" value={avantHeures}
                          onChange={e=>setAvantHeures(e.target.value)}
                          placeholder="ex : 120" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        apres:<input type="number" value={apresHeures}
                          onChange={e=>setApresHeures(e.target.value)}
                          placeholder="ex : 40" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        gain: gainHeures>0
                          ? <span style={{color:"#14532D",fontWeight:700}}>
                              −{gainHeures} h → {gainEuros.toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                            </span>
                          : "—"
                      },
                      {
                        label:"Coût moyen d'un audit (€)",
                        avant:<input type="number" value={coutAuditMoyen}
                          onChange={e=>setCoutAuditMoyen(e.target.value)}
                          placeholder="ex : 2500" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        apres:<span style={{color:C.tx3,fontSize:11,padding:"6px 0",display:"block"}}>
                          Saisir après pilote
                        </span>,
                        gain:"—"
                      },
                      {
                        label:"Nb audits/an",
                        avant:<input type="number" value={nbAudits}
                          onChange={e=>setNbAudits(e.target.value)}
                          placeholder="1" style={{...inputStyle,padding:"6px 8px",fontSize:12,width:"100px"}}/>,
                        apres:"—",
                        gain: totalAudits>0
                          ? <span style={{color:"#1E40AF",fontWeight:700}}>
                              {totalAudits.toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                            </span>
                          : "—"
                      },
                      {
                        label:"Coût conformité/tonne",
                        avant:"—",
                        apres:"—",
                        gain: coutConformite>0
                          ? <span style={{fontWeight:800,
                              color:coutConformite<=3.3?"#14532D":"#991B1B"}}>
                              {coutConformite.toFixed(2)} €/t
                              {coutConformite<=3.3
                                ? " ✓ sous référence"
                                : ` (réf. ${BENCH_RED[typeInstallation]?.val} €/t)`}
                            </span>
                          : <span style={{color:C.tx3,fontSize:11}}>Renseigner tonnage dans calculateur</span>
                      },
                    ];
                    return rows.map((r,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.bd}`,
                        background:i%2===0?C.bg:C.bg2}}>
                        <td style={{padding:"10px 12px",fontWeight:700,color:C.tx,
                          fontSize:12,minWidth:200}}>{r.label}</td>
                        <td style={{padding:"8px 12px"}}>{r.avant}</td>
                        <td style={{padding:"8px 12px"}}>{r.apres}</td>
                        <td style={{padding:"8px 12px"}}>{r.gain}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Notes pilote */}
            <div style={{marginTop:14}}>
              <div style={labelStyle}>Notes & observations du pilote</div>
              <textarea value={notePilote} onChange={e=>setNotePilote(e.target.value)}
                rows={4} placeholder="Contexte, méthode de mesure, observations terrain, nuances…"
                style={{...inputStyle,resize:"vertical"}}/>
            </div>

            {/* ROI si données suffisantes */}
            {(gainEuros>0||totalAudits>0)&&(
              <div style={{marginTop:14,background:"#DBEAFE",borderRadius:10,
                padding:"12px 14px",border:"1.5px solid #93C5FD"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:8}}>
                  💰 Retour sur investissement estimé
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {gainEuros>0&&(
                    <div style={cardStyle("#1E40AF")}>
                      <div style={{fontSize:10,color:C.tx3}}>Gain temps admin/an</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#1E40AF"}}>
                        {gainEuros.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                      </div>
                    </div>
                  )}
                  {totalAudits>0&&(
                    <div style={cardStyle("#7C3AED")}>
                      <div style={{fontSize:10,color:C.tx3}}>Coût audit annuel</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#7C3AED"}}>
                        {totalAudits.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                      </div>
                    </div>
                  )}
                  {(gainEuros+totalAudits)>0&&(
                    <div style={cardStyle("#065F46")}>
                      <div style={{fontSize:10,color:C.tx3}}>Économie potentielle identifiée</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#065F46"}}>
                        {(gainEuros).toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                      </div>
                      <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                        (gain admin — les coûts d'audit restent réels)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BENCHMARK ── */}
      {piloteTab==="benchmark"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",
            border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:13,fontWeight:800,color:C.tx,marginBottom:4}}>
              📊 Données de référence — Consortium RED
            </div>
            <div style={{fontSize:11,color:C.tx3,marginBottom:14}}>
              Source : étude consortium RED, données gouvernementales françaises
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {label:"Surcoût moyen RED II (sites existants)",val:"3,3 €/t",
                 detail:"Chaîne moyenne de 2,5 intermédiaires",color:"#1565C0"},
                {label:"Surcoût moyen RED III (sites post-2021)",val:"3,7 €/t",
                 detail:"Exigences renforcées sur la traçabilité et la durabilité",color:"#6A1B9A"},
                {label:"Coût amont fournisseur",val:"1,0 – 1,6 €/t",
                 detail:"Certification, temps, outils — côté producteur/intermédiaire",color:"#2E7D32"},
                {label:"Nombre d'intermédiaires moyen",val:"2,5",
                 detail:"Pour une chaîne forêt → plateforme → chaufferie",color:"#00695C"},
              ].map(r=>(
                <div key={r.label} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"10px 12px",borderRadius:10,background:r.color+"0D",
                  border:`1px solid ${r.color}33`}}>
                  <div style={{fontSize:20,fontWeight:900,color:r.color,
                    minWidth:100,flexShrink:0}}>{r.val}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{r.label}</div>
                    <div style={{fontSize:11,color:C.tx3}}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Principaux postes */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              Principaux postes identifiés par le consortium
            </div>
            {[
              ["💳","Certification auprès d'un organisme VSS reconnu",
               "Obligatoire pour SURE, SBP, ISCC EU, 2BSvs, REDcert-EU"],
              ["⏱️","Temps salarié — traçabilité et audits",
               "Souvent le poste le plus lourd, difficile à externaliser"],
              ["💻","Logiciels et outils administratifs",
               "SIG, ERP, outils de déclaration, plateformes documentaires"],
              ["🔄","Saisies redondantes RED / RDUE / PEFC / SSD / ISO",
               "Informations similaires demandées dans des formats différents — surcoût de coordination"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,alignItems:"flex-start",
                padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}>
                <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{det}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Opportunité APPLITAG */}
          <div style={{background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",
            borderRadius:12,padding:"14px",border:"1.5px solid #6EE7B7"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:8}}>
              🎯 Opportunité APPLITAG — Mutualisation des saisies
            </div>
            <div style={{fontSize:11,color:"#065F46",lineHeight:1.7}}>
              Le consortium identifie que RED, RDUE, PEFC, SSD et ISO demandent des informations
              similaires dans des formats différents. APPLITAG centralise la saisie unique et
              génère les exports adaptés à chaque référentiel, réduisant directement ce surcoût.
            </div>
            <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
              {["RED II / III","RDUE","PEFC","SSD","ISO 50001"].map(r=>(
                <span key={r} style={{padding:"4px 10px",borderRadius:20,fontSize:11,
                  fontWeight:700,background:"#065F46",color:"#fff"}}>{r}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

