// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";
import { TEXTES_REGL } from "./sections.constants.js";

// Duplique depuis sections-veille.tsx — utilise par SectionVeilleReglementaire
export const CLAUSE_RESERVE = "Projet techniquement préparé, sous réserve du cadre réglementaire et de l'ouverture effective du dispositif au jour du dépôt.";

const SNAPSHOTS_DOSSIER = [
  {
    id:"snap1",
    dossierId:"PAR-2026-001",
    dossierNom:"Forêt Bernard — Tronçais Nord",
    datePreparation:"2026-04-15",
    auteur:"Sylvie Moreau",
    textesSnapshot:[
      {ref:"Décret n° 2025-401",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"Arrêté du 2 mai 2025",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
      {ref:"FEADER PDR AuRA",version:"v2023",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:true,
    alerteDetail:"Décret 2025-401 annulé le 15/07/2026 — dossier préparé sous texte désormais annulé",
    statut:"alerte",
  },
  {
    id:"snap2",
    dossierId:"PAR-2025-047",
    dossierNom:"Bois de la Croix — Montluçon",
    datePreparation:"2025-09-10",
    auteur:"Jean-Paul Faure",
    textesSnapshot:[
      {ref:"Décret n° 2025-401",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:true,
    alerteDetail:"Décret 2025-401 annulé le 15/07/2026 — analyser impact sur dossier accordé",
    statut:"alerte",
  },
  {
    id:"snap3",
    dossierId:"PAR-2025-061",
    dossierNom:"Pinède de Commentry",
    datePreparation:"2025-11-20",
    auteur:"Sylvie Moreau",
    textesSnapshot:[
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:false,
    alerteDetail:"",
    statut:"conforme",
  },
];

/* ── IA TRANSPARENCE — Art. 50 Règlement IA — applicable 02/08/2026 ── */
const IA_STATUT = {
  conforme:   {label:"Conforme",         color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  a_adapter:  {label:"À adapter avant le 2 août", color:"#B45309", bg:"#FEF3C7", icon:"⚠️"},
  non_conforme:{label:"Non conforme",    color:"#991B1B", bg:"#FEE2E2", icon:"🚫"},
  hors_scope: {label:"Hors scope art.50",color:"#6B7280", bg:"#F3F4F6", icon:"ℹ️"},
};

const INVENTAIRE_IA = [
  {
    id:"assistant",
    nom:"Assistant métier APPLITAG",
    type:"Système interactif",
    scope50:"Oui — interaction directe utilisateur",
    statut:"a_adapter",
    mentions:[
      {texte:"🤖 Assistant IA — réponses générées automatiquement", fait:false},
      {texte:"Distinction donnée mesurée / estimation IA", fait:false},
      {texte:"Validation humaine avant transmission contractuelle", fait:false},
    ],
    controlHumain:"À formaliser",
    donneesTransmises:"Données de chantier, essences, volumes → LLM externe",
    prestataire:"À identifier et encadrer (DPA)",
    journalDecisions:false,
    risques:["IA bloquant seule un lot ou un chantier","Donnée contractuelle transmise sans encadrement"],
  },
  {
    id:"rapports",
    nom:"Génération de rapports",
    type:"Contenu généré par IA",
    scope50:"Oui — contenu produit automatiquement",
    statut:"a_adapter",
    mentions:[
      {texte:"« Suggestion générée automatiquement »", fait:false},
      {texte:"Validation humaine obligatoire avant diffusion", fait:false},
      {texte:"Horodatage et auteur de la validation", fait:false},
    ],
    controlHumain:"Validation avant export PDF / envoi",
    donneesTransmises:"Données de visite, lots, GES",
    prestataire:"À confirmer",
    journalDecisions:false,
    risques:["Rapport transmis sans relecture","Estimation présentée comme mesure"],
  },
  {
    id:"synthese",
    nom:"Synthèses de chantiers",
    type:"Résumé automatique",
    scope50:"Oui — texte généré automatiquement",
    statut:"a_adapter",
    mentions:[
      {texte:"« Synthèse générée automatiquement »", fait:false},
      {texte:"Sources des données citées", fait:true},
    ],
    controlHumain:"Relecture recommandée",
    donneesTransmises:"Données terrain APPLITAG",
    prestataire:"À confirmer",
    journalDecisions:false,
    risques:["Synthèse erronée diffusée comme compte-rendu officiel"],
  },
  {
    id:"anomalies",
    nom:"Détection d'anomalies",
    type:"Décision automatisée (aide à la décision)",
    scope50:"Partiel — décision finale humaine obligatoire",
    statut:"a_adapter",
    mentions:[
      {texte:"« Anomalie détectée par l'algorithme — à confirmer »", fait:false},
      {texte:"L'IA ne bloque aucune action sans validation humaine", fait:false},
    ],
    controlHumain:"OBLIGATOIRE — l'IA ne peut pas refuser seule un lot",
    donneesTransmises:"Données de livraison, humidité, pesées",
    prestataire:"Interne",
    journalDecisions:true,
    risques:["IA refusant automatiquement un lot sans action humaine"],
  },
  {
    id:"radio_tv",
    nom:"APPLITAG Radio & TV",
    type:"Voix et images synthétiques",
    scope50:"Oui — obligation de signalement explicite",
    statut:"a_adapter",
    mentions:[
      {texte:"« Voix / image générée par intelligence artificielle »", fait:false},
      {texte:"Aucune fausse interview ou deepfake non signalé", fait:false},
      {texte:"Règle éditoriale formalisée avant diffusion", fait:false},
    ],
    controlHumain:"Validation éditoriale avant toute diffusion",
    donneesTransmises:"Voix synthétique générée localement ou via API",
    prestataire:"À formaliser dans la règle éditoriale",
    journalDecisions:false,
    risques:["Voix artificielle non identifiée","Fausse interview diffusée"],
  },
  {
    id:"textes_info",
    nom:"Textes d'information automatiques",
    type:"Contenu généré par IA",
    scope50:"Oui — diffusion publique ou contractuelle",
    statut:"a_adapter",
    mentions:[
      {texte:"« Texte généré automatiquement — vérifier avant utilisation »", fait:false},
      {texte:"Distinction claire donnée source / texte produit", fait:false},
    ],
    controlHumain:"Recommandé pour toute diffusion externe",
    donneesTransmises:"Données APPLITAG → modèle de langage",
    prestataire:"À encadrer",
    journalDecisions:false,
    risques:["Données personnelles transmises à prestataire non encadré"],
  },
];

const JOURNAL_IA_DEMO = [
  {date:"2026-07-15",fonction:"Rapports",action:"Rapport GES lot LOT-2026-004",
   suggestion:"GES estimé à 18,4 kgCO₂eq/MJ — seuil RED II respecté",
   validation:"Validé par J. Lefèvre",decisionFinale:"Rapport transmis au maître d'ouvrage",
   corrigé:false},
  {date:"2026-07-18",fonction:"Anomalies",action:"Détection humidité élevée livraison LIV-007",
   suggestion:"Humidité 42 % — lot suspendu par l'algorithme",
   validation:"Confirmé par opérateur plateforme",decisionFinale:"Lot refusé, contre-mesure en cours",
   corrigé:false},
  {date:"2026-07-20",fonction:"Synthèses",action:"Synthèse chantier CHT-2026-012",
   suggestion:"3 essences identifiées, volume estimé 145 m³",
   validation:"Corrigé : volume réel 138 m³",decisionFinale:"Synthèse corrigée archivée",
   corrigé:true},
];

// ── EU AI ACT ART. 50 — REGISTRE IA ────────────────────────────
// Mentions obligatoires applicables dès le 2 août 2026


export const SectionVeilleReglementaire = () => {
  const [vue, setVue] = useState("registre");
  const [selectedTexte, setSelectedTexte] = useState(null);
  const [selFonction, setSelFonction] = useState(null);
  const [selectedSnap, setSelectedSnap] = useState(null);

  const nbAlertes = TEXTES_REGL.filter(t=>t.alerteActive).length;
  const nbDossiersAlerte = SNAPSHOTS_DOSSIER.filter(s=>s.alerteReglPostDepot).length;

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>⚖️ Veille réglementaire</div>
          <div style={{fontSize:13,color:C.tx2}}>Versionnement des textes · Snapshots par dossier · Alertes de conformité</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            ["registre",       "#7C3AED","📋 Registre textes"],
            ["snapshots",      "#7C3AED","🗃️ Snapshots dossiers"],
            ["ia_transparence","#1E40AF","🤖 IA Transparence"],
          ].map(([v,col,lbl])=>(
            <button key={v} onClick={()=>setVue(v)}
              style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",border:`1.5px solid ${vue===v?col:C.bd}`,
                background:vue===v?col:"transparent",color:vue===v?"#fff":C.tx2,
                WebkitTapHighlightColor:"transparent"}}>
              {lbl}{v==="ia_transparence"&&<span style={{
                fontSize:9,background:"#EF4444",color:"#fff",borderRadius:20,
                padding:"1px 5px",marginLeft:5,fontWeight:800}}>2 août</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Alerte générale */}
      {nbAlertes>0&&(
        <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,
          padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>🚨</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#991B1B",marginBottom:4}}>
              {nbAlertes} texte{nbAlertes>1?"s":""} avec alerte active — {nbDossiersAlerte} dossier{nbDossiersAlerte>1?"s":""} concerné{nbDossiersAlerte>1?"s":""}
            </div>
            <div style={{fontSize:12,color:"#7F1D1D",lineHeight:1.6,marginBottom:6}}>
              <strong>Décret n° 2025-401 annulé</strong> par le Conseil d'État le 15 juillet 2026 (procédure irrégulière — défaut de consultation du public). L'arrêté du 2 mai 2025 reste en vigueur mais sa base légale est fragilisée.
            </div>
            <div style={{background:"#FFF1F2",border:"1px solid #FDA4AF",borderRadius:8,
              padding:"8px 12px",fontSize:11,color:"#881337",fontStyle:"italic",fontWeight:600}}>
              ⚠️ Ne pas garantir l'éligibilité ni le maintien d'une aide individuelle sans analyse juridique au cas par cas.
            </div>
          </div>
        </div>
      )}

      {/* Clause de réserve */}
      <div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:10,
        padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:16,flexShrink:0}}>📌</span>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#6D28D9",marginBottom:3,textTransform:"uppercase",letterSpacing:".5px"}}>
            Clause de réserve standard — à apposer sur tout document préparatoire
          </div>
          <div style={{fontSize:12,color:"#4C1D95",fontStyle:"italic",fontWeight:600}}>
            « {CLAUSE_RESERVE} »
          </div>
        </div>
      </div>

      {vue==="registre" && (
        <div>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {Object.entries(STATUT_REGL).map(([k,s])=>{
              const n = TEXTES_REGL.filter(t=>t.statut===k).length;
              return (
                <div key={k} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,
                  padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:20}}>{s.icon}</div>
                  <div style={{fontSize:22,fontWeight:800,color:s.color}}>{n}</div>
                  <div style={{fontSize:10,color:C.tx2}}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Liste textes */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {TEXTES_REGL.map(t=>{
              const st = STATUT_REGL[t.statut]||STATUT_REGL.applicable;
              const isOpen = selectedTexte===t.id;
              return (
                <div key={t.id} style={{background:"#fff",borderRadius:12,
                  border:`1px solid ${t.alerteActive?"#FECACA":C.bd}`,overflow:"hidden",
                  boxShadow:t.alerteActive?"0 0 0 2px #FEE2E2":undefined}}>
                  {/* Header */}
                  <div onClick={()=>setSelectedTexte(isOpen?null:t.id)}
                    style={{padding:"12px 16px",cursor:"pointer",
                      display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,
                      background:t.alerteActive?"#FFF5F5":"#fff"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:5,fontWeight:700,
                          background:st.bg,color:st.color}}>{st.icon} {st.label}</span>
                        {t.alerteActive&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:5,
                          background:"#FEE2E2",color:"#991B1B",fontWeight:700}}>🚨 Alerte</span>}
                        <span style={{fontSize:10,color:C.tx2}}>Mis à jour {new Date(t.dateStatut).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{t.dispositif}</div>
                      <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{t.texteRef}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{fontSize:11,color:C.tx2}}>
                        {t.dossiersImpactes.length} dossier{t.dossiersImpactes.length>1?"s":""}
                      </span>
                      <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>

                  {/* Détail */}
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px 16px",background:"#FAFAFA"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Informations</div>
                          {[
                            ["Source décision",t.sourceStatut],
                            ["Motif",t.motifStatut],
                            ["Consultation",new Date(t.dateConsultation).toLocaleDateString("fr-FR")],
                            ["Version critères",t.versionCriteres],
                            t.remplacePar&&["Remplacé par",t.remplacePar],
                          ].filter(Boolean).map(([k,v])=>(
                            <div key={k} style={{display:"flex",gap:8,padding:"5px 8px",
                              borderBottom:`1px solid ${C.bd}`,fontSize:11}}>
                              <span style={{color:C.tx2,minWidth:120,flexShrink:0}}>{k}</span>
                              <span style={{color:C.tx,fontWeight:500}}>{v}</span>
                            </div>
                          ))}
                        </div>

                        <div>
                          {t.reservesJuridiques.length>0&&(
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:"#991B1B",marginBottom:6}}>
                                ⚠️ Réserves juridiques ({t.reservesJuridiques.length})
                              </div>
                              {t.reservesJuridiques.map((r,i)=>(
                                <div key={i} style={{display:"flex",gap:6,marginBottom:6,fontSize:11,
                                  padding:"6px 8px",borderRadius:6,background:"#FEF2F2",
                                  border:"1px solid #FECACA"}}>
                                  <span style={{color:"#991B1B",flexShrink:0}}>•</span>
                                  <span style={{color:"#7F1D1D",lineHeight:1.4}}>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{marginTop:8}}>
                            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Dossiers concernés</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {t.dossiersImpactes.map(d=>(
                                <span key={d} style={{fontSize:10,padding:"2px 8px",borderRadius:4,
                                  background:"#EDE9FE",color:"#7C3AED",fontWeight:600}}>{d}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{display:"flex",gap:8,paddingTop:10,borderTop:`1px solid ${C.bd}`}}>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📥 Télécharger snapshot PDF
                        </button>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          🔗 Source officielle (Légifrance)
                        </button>
                        {t.alerteActive&&(
                          <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                            cursor:"pointer",border:"1px solid #DC2626",background:"#FEF2F2",
                            color:"#991B1B",fontFamily:"inherit"}}>
                            📋 Générer note d'impact dossiers
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vue==="snapshots" && (
        <div>
          <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,
            padding:"10px 14px",marginBottom:14,fontSize:11,color:"#1E40AF",lineHeight:1.6}}>
            💾 <strong>Principe de l'archivage :</strong> APPLITAG conserve une copie datée des règles et documents en vigueur au moment de la préparation de chaque dossier. Cette copie est immuable et sert de preuve en cas de contestation réglementaire ultérieure.
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {SNAPSHOTS_DOSSIER.map(snap=>{
              const isOpen = selectedSnap===snap.id;
              const statutSnap = snap.statut==="alerte"
                ? {color:"#991B1B",bg:"#FEE2E2",icon:"🚨",label:"Alerte post-dépôt"}
                : {color:"#065F46",bg:"#D1FAE5",icon:"✅",label:"Conforme"};
              return (
                <div key={snap.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                  border:`1px solid ${snap.alerteReglPostDepot?"#FECACA":C.bd}`,
                  boxShadow:snap.alerteReglPostDepot?"0 0 0 2px #FEE2E2":undefined}}>
                  <div onClick={()=>setSelectedSnap(isOpen?null:snap.id)}
                    style={{padding:"12px 16px",cursor:"pointer",
                      display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                      background:snap.alerteReglPostDepot?"#FFF5F5":"#fff"}}>
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700,
                          background:statutSnap.bg,color:statutSnap.color}}>
                          {statutSnap.icon} {statutSnap.label}
                        </span>
                        <span style={{fontSize:10,color:C.tx2,fontFamily:"monospace"}}>{snap.dossierId}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{snap.dossierNom}</div>
                      <div style={{fontSize:11,color:C.tx2,marginTop:2}}>
                        Préparé le {new Date(snap.datePreparation).toLocaleDateString("fr-FR")} par {snap.auteur}
                        {snap.clauseReserveApposee&&<span style={{marginLeft:8,color:"#7C3AED",fontWeight:600}}>· ✓ Clause réserve apposée</span>}
                      </div>
                    </div>
                    <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                  </div>

                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px 16px",background:"#FAFAFA"}}>
                      {snap.alerteReglPostDepot&&(
                        <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,
                          padding:"10px 12px",marginBottom:12,fontSize:11,color:"#7F1D1D"}}>
                          <div style={{fontWeight:700,marginBottom:4}}>🚨 Alerte réglementaire post-dépôt</div>
                          {snap.alerteDetail}
                          <div style={{marginTop:6,fontWeight:700,color:"#991B1B"}}>
                            Action requise : analyser l'impact sur ce dossier au cas par cas.
                          </div>
                        </div>
                      )}

                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>
                          📸 Snapshot des textes au {new Date(snap.datePreparation).toLocaleDateString("fr-FR")}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {snap.textesSnapshot.map((ts,i)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",
                              alignItems:"center",padding:"7px 10px",borderRadius:7,
                              background:"#fff",border:`1px solid ${C.bd}`,fontSize:11}}>
                              <div>
                                <span style={{fontWeight:600,color:C.tx}}>{ts.ref}</span>
                                <span style={{color:C.tx2,marginLeft:8}}>{ts.version}</span>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:10,color:C.tx2}}>Statut au dépôt :</span>
                                <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:700,
                                  background:STATUT_REGL[ts.statut_au_depot]?.bg||"#F3F4F6",
                                  color:STATUT_REGL[ts.statut_au_depot]?.color||"#6B7280"}}>
                                  {STATUT_REGL[ts.statut_au_depot]?.label||ts.statut_au_depot}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Clause réserve */}
                      <div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:8,
                        padding:"8px 12px",fontSize:11,color:"#4C1D95",fontStyle:"italic",marginBottom:10}}>
                        « {CLAUSE_RESERVE} »
                      </div>

                      <div style={{display:"flex",gap:8}}>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📥 Exporter snapshot certifié
                        </button>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📄 Ouvrir dossier parcelle
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── IA TRANSPARENCE — Art. 50 Règlement IA ── */}
      {vue==="ia_transparence"&&(()=>{
        const nbAdapt = INVENTAIRE_IA.filter(f=>f.statut==="a_adapter").length;
        const _sel = selFonction ? INVENTAIRE_IA.find(f=>f.id===selFonction) : null;
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Bannière deadline */}
            <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
              border:"2px solid #3B82F6",borderRadius:12,padding:"14px 16px",
              display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0}}>🤖</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#1E40AF"}}>
                    Règlement IA — Article 50 : obligations de transparence
                  </div>
                  <span style={{fontSize:10,background:"#EF4444",color:"#fff",
                    borderRadius:20,padding:"2px 8px",fontWeight:800}}>
                    Applicable le 2 août 2026
                  </span>
                </div>
                <div style={{fontSize:12,color:"#1E3A8A",lineHeight:1.7}}>
                  Lignes directrices définitives publiées le 20 juillet 2026 par la Commission européenne.
                  Concernent les systèmes interactifs, les contenus générés ou modifiés par IA et les deepfakes.
                  <strong> {nbAdapt} fonction{nbAdapt>1?"s":""} APPLITAG à adapter avant la date limite.</strong>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {Object.entries(IA_STATUT).map(([k,s])=>{
                const n = INVENTAIRE_IA.filter(f=>f.statut===k).length;
                return (
                  <div key={k} style={{background:s.bg,borderRadius:10,
                    border:`1.5px solid ${s.color}44`,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:18}}>{s.icon}</div>
                    <div style={{fontSize:20,fontWeight:900,color:s.color}}>{n}</div>
                    <div style={{fontSize:9,color:s.color,fontWeight:700,marginTop:2}}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Inventaire fonctions IA */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:2}}>
                Inventaire des fonctions IA — 6 périmètres identifiés
              </div>
              {INVENTAIRE_IA.map(f=>{
                const st = IA_STATUT[f.statut]||IA_STATUT.a_adapter;
                const isOpen = selFonction===f.id;
                const nbFait = f.mentions.filter(m=>m.fait).length;
                const pct    = Math.round(nbFait/f.mentions.length*100);
                return (
                  <div key={f.id} style={{background:"#fff",borderRadius:12,
                    border:`1.5px solid ${st.color}44`,overflow:"hidden"}}>
                    {/* Header */}
                    <div onClick={()=>setSelFonction(isOpen?null:f.id)}
                      style={{padding:"12px 14px",cursor:"pointer",
                        display:"flex",alignItems:"center",gap:12,
                        background:isOpen?st.bg+"80":"#fff",
                        WebkitTapHighlightColor:"transparent"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                          <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",
                            borderRadius:10,background:st.bg,color:st.color}}>
                            {st.icon} {st.label}
                          </span>
                          <span style={{fontSize:10,color:C.tx3}}>{f.type}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{f.nom}</div>
                        <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{f.scope50}</div>
                      </div>
                      {/* Progress mentions */}
                      <div style={{textAlign:"center",flexShrink:0,minWidth:52}}>
                        <div style={{fontSize:16,fontWeight:900,
                          color:pct===100?"#065F46":pct>0?"#B45309":"#991B1B"}}>{pct}%</div>
                        <div style={{fontSize:9,color:C.tx3}}>mentions</div>
                      </div>
                      <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                    </div>

                    {/* Détail */}
                    {isOpen&&(
                      <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",
                        background:"#FAFAFA",display:"flex",flexDirection:"column",gap:12}}>

                        {/* Checklist mentions */}
                        <div>
                          <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:8}}>
                            Mentions de transparence obligatoires
                          </div>
                          {f.mentions.map((m,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                              padding:"8px 10px",borderRadius:8,marginBottom:4,
                              background:m.fait?"#F0FDF4":"#FFF7ED",
                              border:`1px solid ${m.fait?"#86EFAC":"#FED7AA"}`}}>
                              <span style={{fontSize:16,flexShrink:0}}>{m.fait?"✅":"⏳"}</span>
                              <span style={{fontSize:12,color:m.fait?"#065F46":"#92400E"}}>{m.texte}</span>
                              <span style={{marginLeft:"auto",fontSize:9,flexShrink:0,
                                fontWeight:700,color:m.fait?"#065F46":"#92400E"}}>
                                {m.fait?"FAIT":"À FAIRE"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Contrôle humain */}
                        <div style={{background:"#EFF6FF",borderRadius:8,padding:"10px 12px",
                          border:"1px solid #BFDBFE"}}>
                          <div style={{fontSize:11,fontWeight:800,color:"#1E40AF",marginBottom:4}}>
                            👤 Contrôle humain défini
                          </div>
                          <div style={{fontSize:12,color:"#1E3A8A"}}>{f.controlHumain}</div>
                        </div>

                        {/* Données & prestataire */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:3}}>📤 Données transmises</div>
                            <div style={{fontSize:11,color:C.tx}}>{f.donneesTransmises}</div>
                          </div>
                          <div style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                            border:f.prestataire.includes("À")?"1px solid #FED7AA":undefined}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:3}}>🏢 Prestataire IA</div>
                            <div style={{fontSize:11,fontWeight:f.prestataire.includes("À")?700:400,
                              color:f.prestataire.includes("À")?"#92400E":C.tx}}>{f.prestataire}</div>
                          </div>
                        </div>

                        {/* Risques */}
                        {f.risques.length>0&&(
                          <div style={{background:"#FEF2F2",borderRadius:8,padding:"8px 12px",
                            border:"1px solid #FECACA"}}>
                            <div style={{fontSize:11,fontWeight:800,color:"#991B1B",marginBottom:6}}>
                              🚫 Risques à éviter
                            </div>
                            {f.risques.map((r,i)=>(
                              <div key={i} style={{fontSize:11,color:"#7F1D1D",padding:"2px 0",lineHeight:1.5}}>
                                • {r}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Journal */}
                        <div style={{display:"flex",alignItems:"center",gap:8,
                          padding:"8px 10px",borderRadius:8,
                          background:f.journalDecisions?"#F0FDF4":"#FFF7ED",
                          border:`1px solid ${f.journalDecisions?"#86EFAC":"#FED7AA"}`}}>
                          <span>{f.journalDecisions?"✅":"⏳"}</span>
                          <span style={{fontSize:11,
                            color:f.journalDecisions?"#065F46":"#92400E"}}>
                            Journal des suggestions ayant influencé une décision
                            {f.journalDecisions?" — activé":" — à mettre en place"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Journal des décisions IA */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                📔 Journal des suggestions IA ayant influencé une décision
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr>
                      {["Date","Fonction","Action","Suggestion IA","Validation humaine","Décision finale","Corrigé"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",
                          background:"#EFF6FF",color:"#1E40AF",fontWeight:800,
                          borderBottom:"2px solid #BFDBFE",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {JOURNAL_IA_DEMO.map((j,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.bd}`,
                        background:i%2===0?C.bg:C.bg2}}>
                        <td style={{padding:"8px 10px",whiteSpace:"nowrap",color:C.tx3}}>
                          {new Date(j.date).toLocaleDateString("fr-FR")}
                        </td>
                        <td style={{padding:"8px 10px",fontWeight:700,color:"#1E40AF"}}>{j.fonction}</td>
                        <td style={{padding:"8px 10px",color:C.tx}}>{j.action}</td>
                        <td style={{padding:"8px 10px",color:C.tx2,fontStyle:"italic"}}>{j.suggestion}</td>
                        <td style={{padding:"8px 10px",color:"#065F46",fontWeight:600}}>{j.validation}</td>
                        <td style={{padding:"8px 10px",color:C.tx}}>{j.decisionFinale}</td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>
                          {j.corrigé
                            ? <span style={{fontSize:10,background:"#FEF3C7",color:"#92400E",
                                padding:"2px 7px",borderRadius:10,fontWeight:700}}>Corrigé</span>
                            : <span style={{fontSize:10,background:"#D1FAE5",color:"#065F46",
                                padding:"2px 7px",borderRadius:10,fontWeight:700}}>OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6 actions avant le 2 août */}
            <div style={{background:"linear-gradient(135deg,#FFF7ED,#FEF3C7)",
              borderRadius:12,padding:"14px",border:"1.5px solid #FCD34D"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:10}}>
                ✅ Plan d'actions — avant le 2 août 2026
              </div>
              {[
                ["1","Inventorier toutes les fonctions IA",   "Fait — 6 fonctions identifiées ci-dessus","#065F46","#D1FAE5"],
                ["2","Identifier les données transmises à chaque prestataire","À compléter — prestataires LLM à confirmer","#B45309","#FEF3C7"],
                ["3","Définir le contrôle humain pour chaque fonction",        "Partiellement défini — détail par fonction","#B45309","#FEF3C7"],
                ["4","Ajouter les mentions de transparence dans l'interface",  "À implémenter dans les vues concernées","#B45309","#FEF3C7"],
                ["5","Formaliser la règle éditoriale Radio & TV",              "À rédiger avant toute diffusion synthétique","#991B1B","#FEE2E2"],
                ["6","Conserver l'historique des suggestions décisionnelles",  "Journal démo actif — à connecter en production","#B45309","#FEF3C7"],
              ].map(([n,lbl,statut,col,bg])=>(
                <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start",
                  padding:"9px 10px",borderRadius:8,marginBottom:6,
                  background:bg,border:`1px solid ${col}33`}}>
                  <span style={{fontSize:14,fontWeight:900,color:col,
                    width:22,textAlign:"center",flexShrink:0}}>{n}.</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                    <div style={{fontSize:10,color:col,marginTop:2,fontWeight:600}}>{statut}</div>
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
