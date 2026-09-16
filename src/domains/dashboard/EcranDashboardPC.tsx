import { useState } from "react";
import { C, FONT_TITLE, FONT_BODY } from "../../design-system/tokens.js";
import { fmtNum } from "../../shared/format.js";
import { MiniBarChart } from "../../shared/ui.jsx";
import { EcranLots } from "../exploitation/ExploitationScreens.jsx";
import { SectionAcces, SectionAbonnements } from "./sections-admin.jsx";
import { SectionDemoScenario } from "./sections-admin-demo.jsx";
import { SectionModulesFuturs } from "./sections-admin-modules.jsx";
import { SectionFinancements } from "./sections-terrain.jsx";
import { SectionApplitgData, SectionScierie } from "./sections-terrain-op.jsx";
import { SectionPermisIncendie, SectionDesserte } from "./sections-dfci.jsx";
import { SectionCoproduits, SectionProjetFinance } from "./sections-projets.jsx";
import { SectionParcelleTravaux } from "./sections-projets-parcelles.jsx";
import { SectionRegistreIA, SectionBoisCrise, SectionFicheCombustible } from "./sections-veille.jsx";
import { SectionVeilleReglementaire } from "./sections-veille-reg.jsx";
import { SectionLivraisons, SectionFacturationElec } from "./sections-energie.jsx";
import { SectionChaufferies } from "./sections-energie-chaufferies.jsx";
import { SectionRapports, SectionReseau } from "./sections-config.jsx";
import { SectionPlanApprovisionnement } from "./sections-config-plans.jsx";
import { SectionParametres } from "./sections-config-params.jsx";
import { SectionConformiteRED } from "./sections-reglementaire.jsx";
import { SectionCoutReglementaire } from "./sections-reglementaire-ges.jsx";
import { SectionGES } from "./sections-reglementaire-ges2.jsx";
import { SectionChantiers } from "./sections-logistique.jsx";
import { SectionTransports, SectionAnalyses } from "./sections-logistique-transports.jsx";
import { SectionDocuments, SectionTerritoire } from "./sections-logistique-docs.jsx";
import { HubAlertes, SectionPlanning } from "./sections-logistique-alertes.jsx";
import { DASHBOARD_NAV } from "./sections.constants.js";

import { EcranCarte } from "../roles/RoleScreensEntrepriseGeo.jsx";
import { STATUT_LOT } from "../screens/MobileScreens.constants.js";

interface EcranDashboardPCProps {
  user: Record<string, unknown> | null;
  contacts: any[];
  visites: any[];
  notifications: any[];
  transports?: any[];
  livraisons?: any[];
  dechiquetages?: any[];
  pendingSyncCount?: number;
  onLogout: () => void;
}

export const EcranDashboardPC = ({user, contacts, visites, notifications, transports=[], livraisons=[], dechiquetages=[], pendingSyncCount=0, onLogout}: EcranDashboardPCProps) => {
  const [section, setSection] = useState("dashboard");
  const [lotDetail, setLotDetail] = useState<any>(null);

  const lots = contacts.filter(c=>c.lotNumero);
  const moisCourant = new Date().toISOString().slice(0,7);
  const livraisonsDuMois = livraisons.filter((l: any)=>(l.date||l.createdAt||"").slice(0,7)===moisCourant);
  const tonnesLivreesMois = livraisonsDuMois.reduce((s: number,l: any)=>s+(l.poidsNet||l.poidsBrut||0),0);
  const humidites = livraisons.map((l: any)=>parseFloat(l.humiditeReception)).filter((n: number)=>!isNaN(n));
  const humiditeMoyenne = humidites.length ? humidites.reduce((s: number,n: number)=>s+n,0)/humidites.length : null;

  // Séries journalières du mois en cours (tonnage livré et humidité moyenne par jour)
  const nbJoursMois = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  const tonnageParJour: number[] = Array.from({length:nbJoursMois},()=>0);
  const humiditeParJour: number[][] = Array.from({length:nbJoursMois},()=>[]);
  livraisonsDuMois.forEach((l: any)=>{
    const dateStr = l.date||l.createdAt||"";
    const jour = parseInt(dateStr.slice(8,10),10);
    if (jour>=1 && jour<=nbJoursMois) {
      tonnageParJour[jour-1] += (l.poidsNet||l.poidsBrut||0);
      const h = parseFloat(l.humiditeReception);
      if (!isNaN(h)) humiditeParJour[jour-1].push(h);
    }
  });
  const humiditeMoyenneParJour = humiditeParJour.map(arr=>arr.length?arr.reduce((s,n)=>s+n,0)/arr.length:0);
  const transportsEnCours = lots.filter((c: any)=>c.statutLot==="EN_LIVRAISON").length;
  const alertesActives = notifications.filter((n: any)=>!n.lu);
  const stockPlateformes = lots.filter((c: any)=>["BORD_ROUTE","A_DECHIQUETER","EN_STOCK_PLATEFORME"].includes(c.statutLot))
    .reduce((s: number,c: any)=>s+(parseFloat(c.tonnageCumul)||0),0);
  const stockChaufferies = livraisons.reduce((s: number,l: any)=>s+(l.poidsNet||l.poidsBrut||0),0);
  const cmrTotal = dechiquetages.length;
  const cmrConformes = dechiquetages.filter((d: any)=>d.numeroCMR&&d.photoCMR).length;
  const tauxConformite = cmrTotal ? Math.round((cmrConformes/cmrTotal)*100) : null;

  const KPI_CARDS = [
    {icon:"⚖️",label:"Tonnage livré (mois)",val:fmtNum(tonnesLivreesMois)+" t",color:C.brown,chart:tonnageParJour},
    {icon:"📦",label:"Livraisons (mois)",val:livraisonsDuMois.length,color:C.blue},
    {icon:"💧",label:"Humidité moyenne",val:humiditeMoyenne!=null?fmtNum(humiditeMoyenne,1)+" %":"—",color:C.blueD,chart:humiditeMoyenneParJour},
    {icon:"🚛",label:"Transports en cours",val:transportsEnCours,color:C.purple},
    {icon:"⚠️",label:"Alertes actives",val:alertesActives.length,color:C.red,danger:alertesActives.length>0},
  ];

  const KPI_CARDS_2 = [
    {icon:"📥",label:"Stock plateformes",val:fmtNum(stockPlateformes)+" t",color:C.greenD},
    {icon:"🔥",label:"Stock chaufferies",val:fmtNum(stockChaufferies)+" t",color:C.brown},
    {icon:"⚡",label:"Consommation (MWh)",val:"—",color:C.tx3,note:"Donnée non disponible"},
    {icon:"💶",label:"Coût transport / t",val:"—",color:C.tx3,note:"Donnée non disponible"},
    {icon:"✅",label:"Taux de conformité CMR",val:tauxConformite!=null?tauxConformite+" %":"—",color:C.green},
  ];

  const MAP_LEGEND = [
    ["🌲",C.green,"Lots forestiers"],
    ["📦",C.amber,"Plateformes"],
    ["🔥",C.green,"Chaufferies"],
    ["🚛",C.purple,"Transports"],
    ["⚠️",C.red,"Alertes"],
  ];

  return (
    <div style={{display:"flex",height:"100dvh",fontFamily:FONT_BODY,background:C.bg,color:C.tx}}>
      {/* Sidebar */}
      <div style={{width:230,background:C.sb,color:"#fff",flexShrink:0,
        display:"flex",flexDirection:"column",padding:"20px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 20px 24px"}}>
          <img src="/logo.png" alt="APPLITAG" style={{width:30,height:30,objectFit:"contain"}}/>
          <div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:FONT_TITLE}}>APPLITAG</div>
            <div style={{fontSize:10,opacity:.6}}>by ALTEGAD SAS</div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>
          {DASHBOARD_NAV.map((item: any)=>(
            <div key={item.id} onClick={()=>setSection(item.id)} style={{
              display:"flex",alignItems:"center",gap:10,padding:"11px 20px",cursor:"pointer",
              background:section===item.id?"rgba(255,255,255,.12)":"transparent",
              borderLeft:`3px solid ${section===item.id?C.greenPale:"transparent"}`,
              fontSize:14,fontWeight:section===item.id?600:400,
              WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
              <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>
              {item.id==="alertes"&&alertesActives.length>0&&(
                <span style={{background:C.red,color:"#fff",fontSize:10,fontWeight:700,
                  borderRadius:10,padding:"2px 7px",flexShrink:0}}>{alertesActives.length}</span>
              )}
            </div>
          ))}
        </div>
        <div onClick={onLogout} style={{display:"flex",alignItems:"center",gap:10,
          padding:"12px 20px",cursor:"pointer",borderTop:"1px solid rgba(255,255,255,.12)"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:C.greenL,
            color:C.greenD,display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:700,fontSize:13,flexShrink:0}}>
            {(String(user?.prenom||user?.nom||"?"))[0]}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600}}>
              {user?.prenom ? `${String(user.prenom)[0]}.` : ""} {String(user?.nom||"")}
            </div>
            <div style={{fontSize:11,opacity:.6}}>Exploitant</div>
          </div>
          <span style={{fontSize:14,opacity:.6}}>›</span>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{flex:1,overflowY:"auto",padding:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:20,fontWeight:700,fontFamily:FONT_TITLE,color:C.tx}}>
            {DASHBOARD_NAV.find((n: any)=>n.id===section)?.label||"Tableau de bord"}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {pendingSyncCount>0&&(
              <div title="Enregistrements en attente de synchronisation avec le serveur"
                style={{background:C.amberL,color:C.amberD,fontSize:12,fontWeight:600,
                padding:"6px 12px",borderRadius:20}}>📡 {pendingSyncCount}</div>
            )}
            {alertesActives.length>0&&(
              <div style={{background:C.redL,color:C.red,fontSize:12,fontWeight:600,
                padding:"6px 12px",borderRadius:20}}>🔔 {alertesActives.length}</div>
            )}
            <div style={{width:34,height:34,borderRadius:"50%",background:C.greenL,
              color:C.greenD,display:"flex",alignItems:"center",justifyContent:"center",
              fontWeight:700,fontSize:14}}>
              {(String(user?.prenom||user?.nom||"?"))[0]}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{String(user?.prenom||"")} {String(user?.nom||"")}</div>
              <div style={{fontSize:11,color:C.tx3,textTransform:"capitalize"}}>{String(user?.role||"")}</div>
            </div>
          </div>
        </div>

        {section==="dashboard" && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:20}}>
              {KPI_CARDS.map((k,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:14,padding:16,
                  border:`1px solid ${C.bd}`,borderLeft:k.danger?`4px solid ${C.red}`:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontSize:24,fontWeight:700,color:k.color,fontFamily:FONT_TITLE}}>{k.val}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2,marginBottom:k.chart?8:0}}>{k.label}</div>
                  {k.chart&&<MiniBarChart data={k.chart} color={k.color}/>}
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,alignItems:"start",marginBottom:20}}>
              <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
                padding:16,height:480,display:"flex",flexDirection:"column",position:"relative"}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:10,fontFamily:FONT_TITLE}}>
                  Suivi des activités en temps réel
                </div>
                <div style={{flex:1,borderRadius:10,overflow:"hidden",position:"relative"}}>
                  <EcranCarte contacts={contacts} visites={visites}
                    onOpenLot={(lot: any)=>setLotDetail(lot)}/>
                  <div style={{position:"absolute",bottom:10,left:10,background:"rgba(255,255,255,.95)",
                    borderRadius:10,padding:"8px 12px",boxShadow:"0 2px 8px rgba(0,0,0,.12)",
                    display:"flex",flexDirection:"column",gap:5,zIndex:5}}>
                    {MAP_LEGEND.map(([icon,_color,label],i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.tx2}}>
                        <span style={{fontSize:12}}>{icon}</span>{label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,fontFamily:FONT_TITLE}}>🚛 Transports en cours</div>
                    {transports.length>3&&(
                      <span onClick={()=>setSection("transports")} style={{fontSize:11,color:C.green,
                        fontWeight:600,cursor:"pointer"}}>Voir tout</span>
                    )}
                  </div>
                  {transports.filter((t: any)=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut)).length===0 ? (
                    <div style={{fontSize:13,color:C.tx3}}>Aucun transport en cours.</div>
                  ) : transports.filter((t: any)=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut)).slice(0,3).map((t: any,i: number)=>(
                    <div key={t.id||i} style={{marginBottom:12,paddingBottom:12,
                      borderBottom:i<2?`1px solid ${C.bd}`:"none"}}>
                      <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.tx}}>
                        {t.lotNumero||"—"}
                      </div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        {t.societeTransp||t.immatTracteur||"Transporteur"}
                      </div>
                      <span style={{fontSize:10,color:C.green,fontWeight:600}}>● En route</span>
                    </div>
                  ))}
                  {transports.filter((t: any)=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut)).length>3&&(
                    <div style={{fontSize:11,color:C.tx3}}>
                      + {transports.filter((t: any)=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut)).length-3} autres transports
                    </div>
                  )}
                </div>

                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,fontFamily:FONT_TITLE}}>🔔 Alertes récentes</div>
                    {notifications.length>3&&(
                      <span onClick={()=>setSection("alertes")} style={{fontSize:11,color:C.green,
                        fontWeight:600,cursor:"pointer"}}>Voir tout</span>
                    )}
                  </div>
                  {notifications.length===0 ? (
                    <div style={{fontSize:13,color:C.tx3}}>Aucune alerte récente.</div>
                  ) : notifications.slice(0,3).map((n: any,i: number)=>(
                    <div key={n.id||i} style={{display:"flex",gap:10,marginBottom:12}}>
                      <span style={{fontSize:14}}>{n.lu?"✅":"⚠️"}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,color:C.tx,lineHeight:1.4}}>{n.message||n.titre||"—"}</div>
                        <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                          {n.date?new Date(n.date).toLocaleString("fr-FR"):""}
                        </div>
                      </div>
                    </div>
                  ))}
                  {notifications.length>3&&(
                    <div style={{fontSize:11,color:C.tx3}}>+ {notifications.length-3} autres alertes</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:20}}>
              {KPI_CARDS_2.map((k,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:14,padding:16,
                  border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontSize:22,fontWeight:700,color:k.color,fontFamily:FONT_TITLE}}>{k.val}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{k.label}</div>
                  {k.note&&<div style={{fontSize:10,color:C.tx3,marginTop:2,fontStyle:"italic"}}>{k.note}</div>}
                </div>
              ))}
            </div>

            {lotDetail && (
              <div style={{marginTop:16,background:"#fff",borderRadius:14,
                border:`1px solid ${C.bd}`,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:14,fontWeight:700,fontFamily:FONT_TITLE}}>
                    🌲 {lotDetail.lotNumero} · {lotDetail.commune}
                  </div>
                  <button onClick={()=>setLotDetail(null)} style={{border:"none",background:"transparent",
                    cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,fontSize:13}}>
                  <div><span style={{color:C.tx3}}>Statut</span><br/>
                    <strong>{(STATUT_LOT[lotDetail.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU).label}</strong></div>
                  <div><span style={{color:C.tx3}}>Propriétaire</span><br/><strong>{lotDetail.nom||"—"}</strong></div>
                  <div><span style={{color:C.tx3}}>Tonnage cumulé</span><br/>
                    <strong>{fmtNum(lotDetail.tonnageCumul||0)} t</strong></div>
                  <div><span style={{color:C.tx3}}>Nature produit</span><br/><strong>{lotDetail.potentiel||"—"}</strong></div>
                </div>
              </div>
            )}
          </>
        )}

        {section==="lots" && (
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            height:"calc(100dvh - 140px)",overflow:"hidden"}}>
            <EcranLots contacts={contacts} onNewLot={()=>{}}
              onOpenLot={setLotDetail} filtreInitial="TOUS"/>
          </div>
        )}

        {section==="carte" && (
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            height:"calc(100dvh - 140px)",overflow:"hidden"}}>
            <EcranCarte contacts={contacts} visites={visites} onOpenLot={setLotDetail}/>
          </div>
        )}

        {section==="documents" && <SectionDocuments/>}
        {section==="analyses" && <SectionAnalyses/>}
        {section==="chantiers"   && <SectionChantiers/>}
        {section==="transports"  && <SectionTransports/>}
        {section==="livraisons"   && <SectionLivraisons/>}
        {section==="facture_elec" && <SectionFacturationElec/>}
        {section==="chaufferies"  && <SectionChaufferies/>}
        {section==="rapports"    && <SectionRapports/>}
        {section==="parametres"  && <SectionParametres/>}
        {section==="reseau"      && <SectionReseau/>}
        {section==="plan_appro"  && <SectionPlanApprovisionnement/>}

        {([] as string[]).includes(section) && (
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:40,textAlign:"center",color:C.tx3}}>
            <div style={{fontSize:32,marginBottom:10}}>🚧</div>
            Module "{DASHBOARD_NAV.find((n: any)=>n.id===section)?.label}" — bientôt disponible sur le tableau de bord desktop.
          </div>
        )}

        {section==="utilisateurs" && (
          <SectionAcces _isDemo={true as any}/>
        )}

        {section==="abonnements" && (
          <SectionAbonnements/>
        )}

        {section==="financements" && (
          <SectionFinancements/>
        )}

        {section==="conformite_red" && (
          <SectionConformiteRED lots={lots as any} visites={visites as any} livraisons={livraisons as any}/>
        )}

        {section==="cout_reglementaire" && (
          <SectionCoutReglementaire lots={lots as any} livraisons={livraisons as any}/>
        )}

        {section==="ges" && (
          <SectionGES lots={lots as any} visites={visites as any} livraisons={livraisons as any}/>
        )}

        {section==="demo" && (
          <SectionDemoScenario/>
        )}

        {section==="futur" && (
          <SectionModulesFuturs/>
        )}

        {section==="parcelles" && (
          <SectionParcelleTravaux/>
        )}
        {section==="desserte"        && <SectionDesserte/>}
        {section==="coproduits"      && <SectionCoproduits/>}
        {section==="projet_finance"  && <SectionProjetFinance/>}
        {section==="permis_incendie" && <SectionPermisIncendie/>}
        {section==="scierie"       && <SectionScierie/>}
        {section==="bois_crise"   && <SectionBoisCrise/>}
        {section==="fiche_comb"   && <SectionFicheCombustible/>}
        {section==="registre_ia"  && <SectionRegistreIA/>}
        {section==="applitag_data"&& <SectionApplitgData onSignaler={()=>setSection("desserte")}/>}

        {section==="reglementation" && (
          <SectionVeilleReglementaire/>
        )}

        {section==="territoire" && (
          <SectionTerritoire/>
        )}

        {section==="planning" && (
          <SectionPlanning
            contacts={contacts as any} visites={visites as any}
            transports={transports as any} livraisons={livraisons as any}
            onSelectLot={(lotId: any)=>{ const lot=contacts.find((c: any)=>c.id===lotId); if(lot){setLotDetail(lot);setSection("lots");} }}
          />
        )}

        {section==="alertes" && <HubAlertes
          contacts={contacts as any} livraisons={livraisons as any}
          onGoTo={setSection}
        />}
      </div>
    </div>
  );
};
