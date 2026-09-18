// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";

const CHANTIERS_DATA = [
  {id:"CH-2026-14",label:"Forêt de Tronçais — Parcelle 18",
   proprietaire:"M. Gallet Bernard",commune:"Tronçais (03360)",surface:8.4,
   typeIntervention:"Coupe de taillis sous futaie",essences:"Chêne/Charme",
   entreprise:"SARL Forestry Allier",responsable:"L. Bonnet",
   dateDebut:"2026-07-21",dateFin:"2026-08-08",
   statut:"planifié",
   volPrévu:280,budget:18400,
   machines:["Porteur Ponsse Bear","Abatteuse Komatsu 931"],
   acces:"Route D145 + piste forestière — accès PL possible",
   contraintes:"Zone humide en bordure sud — pas d'engin < 15 t",
   photos:2,docs:3,alertes:0},
  {id:"CH-2026-12",label:"Bocage Nord — Haies et lisières",
   proprietaire:"Mme Renard Claire",commune:"Cérilly (03350)",surface:3.1,
   typeIntervention:"Broyage de haies bocagères",essences:"Charme/Noisetier",
   entreprise:"Entreprise Bocage 03",responsable:"P. Aubert",
   dateDebut:"2026-07-10",dateFin:"2026-07-18",
   statut:"terminé",
   volPrévu:62,budget:4200,
   machines:["Broyeur Berti BL 280"],
   acces:"Accès chemin agricole — tracteur seul",
   contraintes:"Période de nidification — vérification avant démarrage",
   photos:8,docs:5,alertes:0},
  {id:"CH-2026-11",label:"Parcelle Ternant — Éclaircie résineuse",
   proprietaire:"GFA Ternant",commune:"Ternant (58)",surface:5.7,
   typeIntervention:"Éclaircie mécanique — Douglas",essences:"Douglas",
   entreprise:"SARL Forestry Allier",responsable:"L. Bonnet",
   dateDebut:"2026-07-01",dateFin:"2026-07-14",
   statut:"en cours",
   volPrévu:195,budget:12800,
   machines:["Abatteuse Komatsu 931","Porteur Ponsse Bear"],
   acces:"RD 977 + chemin communal — accès PL avec autorisation mairie",
   contraintes:"Câbles téléphoniques en bordure parcelle nord",
   photos:5,docs:4,alertes:1},
  {id:"CH-2026-09",label:"Tronçais Sud — Coupe rase pin sylvestre",
   proprietaire:"M. Dubois René",commune:"Tronçais (03360)",surface:12.2,
   typeIntervention:"Coupe rase avec replantation prévue",essences:"Pin sylvestre",
   entreprise:"ForêtPro Bourbonnais",responsable:"A. Martel",
   dateDebut:"2026-06-02",dateFin:"2026-06-28",
   statut:"terminé",
   volPrévu:410,budget:26500,
   machines:["Abatteuse John Deere 1270G","Porteur 1110G","Broyeur de souches"],
   acces:"Accès direct RD — bon état",
   contraintes:"Aucune",
   photos:12,docs:7,alertes:0},
];

const STATUT_CHANTIER = {
  planifié:  {label:"Planifié",  icon:"📋",col:"#1E40AF",bg:"#DBEAFE"},
  "en cours":{label:"En cours",  icon:"🔨",col:"#B45309",bg:"#FEF3C7"},
  terminé:   {label:"Terminé",   icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  annulé:    {label:"Annulé",    icon:"❌",col:"#991B1B",bg:"#FEE2E2"},
};

const PRIORITE_ALERTE = {
  critique: {label:"Critique", col:"#7F1D1D", bg:"#FEE2E2", icon:"🔴"},
  haute:    {label:"Haute",    col:"#991B1B", bg:"#FEE2E2", icon:"🟠"},
  moyenne:  {label:"Moyenne",  col:"#92400E", bg:"#FEF3C7", icon:"🟡"},
  basse:    {label:"Basse",    col:"#065F46", bg:"#D1FAE5", icon:"🟢"},
};
const STATUT_ALERTE = {
  ouverte:       {label:"Ouverte",        col:"#991B1B", bg:"#FEE2E2"},
  en_traitement: {label:"En traitement",  col:"#92400E", bg:"#FEF3C7"},
  résolue:       {label:"Résolue",        col:"#065F46", bg:"#D1FAE5"},
};

const ALERTES_DATA = [
  {id:"ALT-001",chantierId:"CH-2026-11",
   dateCreation:"2026-07-01",dateMaj:"2026-07-14",
   titre:"Câbles téléphoniques — zone nord non délimitée",
   description:"Câbles Orange en bordure parcelle nord non balisés. Risque de contact lors des abattages. Arrêt des travaux dans la zone nord jusqu'à délimitation officielle.",
   statut:"en_traitement",priorite:"haute",responsable:"L. Bonnet",
   actions:[
     {date:"2026-07-01",auteur:"L. Bonnet",texte:"Alerte créée — câbles identifiés lors de la visite de démarrage chantier."},
     {date:"2026-07-05",auteur:"L. Bonnet",texte:"Demande de délimitation envoyée à Orange (réf. DR-2026-0812). Accusé de réception reçu."},
     {date:"2026-07-12",auteur:"J.C. LETIERCE",texte:"Relance téléphonique Orange. Intervention prévue semaine du 21 juillet."},
     {date:"2026-07-14",auteur:"L. Bonnet",texte:"Travaux zone nord suspendus en attendant délimitation. Abattage poursuivi zones sud et centrale."},
   ]},
];

const TAS_DATA = [
  {id:"TAS-001",chantierId:"CH-2026-11",label:"Tas D1 — Bord piste nord",
   volumeEstime:60,volumeReel:null,essence:"Douglas",humidite:38,
   statut:"mesure_en_cours",dateMise:"2026-07-03",datePrévEnlèvement:"2026-07-25",
   coordGPS:"46.4512 / 3.1874",notes:"Accessible porteur"},
  {id:"TAS-002",chantierId:"CH-2026-11",label:"Tas D2 — Clairière centrale",
   volumeEstime:85,volumeReel:82,essence:"Douglas",humidite:42,
   statut:"prêt_à_enlever",dateMise:"2026-07-05",datePrévEnlèvement:"2026-07-22",
   coordGPS:"46.4519 / 3.1891",notes:"Pesée réalisée"},
  {id:"TAS-003",chantierId:"CH-2026-14",label:"Tas T1 — Route D145",
   volumeEstime:120,volumeReel:null,essence:"Chêne",humidite:null,
   statut:"constitué",dateMise:"2026-07-23",datePrévEnlèvement:"2026-08-15",
   coordGPS:"46.5201 / 2.9847",notes:"En attente pesée"},
  {id:"TAS-004",chantierId:"CH-2026-09",label:"Tas P1 — Aire de stockage",
   volumeEstime:200,volumeReel:195,essence:"Pin sylvestre",humidite:28,
   statut:"enlevé",dateMise:"2026-06-15",datePrévEnlèvement:"2026-06-29",
   coordGPS:"46.5180 / 2.9722",notes:"Livré chaufferie Moulins"},
];

const STATUT_TAS = {
  constitué:       {label:"Constitué",       icon:"🪵",col:"#92400E",bg:"#FEF3C7"},
  mesure_en_cours: {label:"Mesure en cours", icon:"📏",col:"#1E40AF",bg:"#DBEAFE"},
  prêt_à_enlever:  {label:"Prêt à enlever", icon:"🚛",col:"#065F46",bg:"#D1FAE5"},
  enlevé:          {label:"Enlevé",          icon:"✅",col:"#374151",bg:"#E5E7EB"},
};

export const SectionChantiers = () => {
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [selected, setSelected] = useState(null);
  const [ongletFiche, setOngletFiche] = useState("infos");

  const chantiers = filtreStatut==="tous"
    ? CHANTIERS_DATA
    : CHANTIERS_DATA.filter(c=>c.statut===filtreStatut);

  const ch = selected ? CHANTIERS_DATA.find(c=>c.id===selected) : null;

  const totSurface = CHANTIERS_DATA.reduce((s,c)=>s+c.surface,0);
  const totBudget  = CHANTIERS_DATA.reduce((s,c)=>s+c.budget,0);
  const enCours    = CHANTIERS_DATA.filter(c=>c.statut==="en cours").length;
  const alertes    = ALERTES_DATA.filter(a=>a.statut!=="résolue").length;

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🌲 Chantiers forestiers</div>
        <div style={{fontSize:13,color:C.tx2}}>Déclaration, suivi terrain et clôture des chantiers</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🌲",label:"Surface totale",val:totSurface.toFixed(1)+" ha",col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"🔨",label:"En cours",val:enCours+" chantier"+(enCours>1?"s":""),col:"#B45309",bg:"#FEF3C7"},
          {ico:"💶",label:"Budget total",val:(totBudget/1000).toFixed(1)+" k€",col:"#0369A1",bg:"#DBEAFE"},
          {ico:"⚠️",label:"Alertes actives",val:alertes+" alerte"+(alertes>1?"s":""),col:alertes>0?"#991B1B":"#059669",bg:alertes>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres statut */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Tous"],["planifié","Planifiés"],["en cours","En cours"],["terminé","Terminés"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setFiltreStatut(v);setSelected(null);}}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",border:`1px solid ${filtreStatut===v?"#1E5B3A":C.bd}`,
              background:filtreStatut===v?"#1E5B3A":"transparent",
              color:filtreStatut===v?"#fff":C.tx2}}>
            {l} <span style={{opacity:.6}}>({v==="tous"?CHANTIERS_DATA.length:CHANTIERS_DATA.filter(c=>c.statut===v).length})</span>
          </button>
        ))}
        <button style={{marginLeft:"auto",padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
          + Nouveau chantier
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:ch?"1fr 380px":"1fr",gap:12,alignItems:"start"}}>
        {/* Liste */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {chantiers.map(c=>{
            const st = STATUT_CHANTIER[c.statut]||STATUT_CHANTIER.planifié;
            const isSelected = selected===c.id;
            const nbAlt = ALERTES_DATA.filter(a=>a.chantierId===c.id&&a.statut!=="résolue").length;
            return (
              <div key={c.id} onClick={()=>setSelected(isSelected?null:c.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?"#1E5B3A":nbAlt>0?"#FCA5A5":C.bd}`,
                  boxShadow:isSelected?"0 0 0 3px #1E5B3A22":"none"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{c.label}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                      {nbAlt>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",
                        borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {nbAlt} alerte</span>}
                    </div>
                    <div style={{fontSize:11,color:C.tx2}}>{c.typeIntervention} · {c.essences}</div>
                    <div style={{display:"flex",gap:12,marginTop:5,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>📍 {c.commune}</span>
                      <span>👤 {c.proprietaire}</span>
                      <span>🏢 {c.entreprise}</span>
                      <span>📐 {c.surface} ha</span>
                      <span>📅 {new Date(c.dateDebut).toLocaleDateString("fr-FR")} → {new Date(c.dateFin).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:"#0369A1"}}>{(c.budget/1000).toFixed(1)} k€</div>
                    <div style={{fontSize:10,color:C.tx3}}>{c.volPrévu} m³ prév.</div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:4}}>📷 {c.photos} · 📄 {c.docs}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fiche détail */}
        {ch&&(()=>{
          const st = STATUT_CHANTIER[ch.statut]||STATUT_CHANTIER.planifié;
          return (
            <div style={{background:"#fff",borderRadius:14,border:`2px solid #1E5B3A`,
              padding:16,position:"sticky",top:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{ch.id}</div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                </div>
                <button onClick={()=>setSelected(null)}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
              </div>

              {/* Onglets fiche */}
              <div style={{display:"flex",gap:4,marginBottom:12,borderBottom:`1px solid ${C.bd}`,paddingBottom:8,flexWrap:"wrap"}}>
                {(()=>{const nbAlt=ALERTES_DATA.filter(a=>a.chantierId===ch.id&&a.statut!=="résolue").length;
                return [["infos","📋 Infos"],["terrain","⛰️ Terrain"],["machines","🚜 Machines"],["tas","🪵 Tas"],["alertes",`⚠️ Alertes${nbAlt>0?" ("+nbAlt+")":""}`]].map(([v,l])=>(
                  <button key={v} onClick={()=>setOngletFiche(v)}
                    style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",
                      fontFamily:"inherit",border:"none",
                      background:ongletFiche===v?"#1E5B3A":"transparent",
                      color:ongletFiche===v?"#fff":v==="alertes"&&nbAlt>0?"#991B1B":C.tx3}}>
                    {l}
                  </button>
                ));}})()}
              </div>

              {ongletFiche==="infos"&&(
                <div style={{display:"flex",flexDirection:"column",gap:7,fontSize:11}}>
                  {[
                    ["Parcelle / Lieu",ch.label],
                    ["Propriétaire",ch.proprietaire],
                    ["Commune",ch.commune],
                    ["Type d'intervention",ch.typeIntervention],
                    ["Essences",ch.essences],
                    ["Surface",ch.surface+" ha"],
                    ["Volume prévu",ch.volPrévu+" m³"],
                    ["Budget",ch.budget.toLocaleString("fr-FR")+" €"],
                    ["Entreprise",ch.entreprise],
                    ["Responsable",ch.responsable],
                    ["Période",new Date(ch.dateDebut).toLocaleDateString("fr-FR")+" → "+new Date(ch.dateFin).toLocaleDateString("fr-FR")],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                      <span style={{color:C.tx3,minWidth:130,flexShrink:0}}>{k}</span>
                      <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {ongletFiche==="terrain"&&(
                <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:11}}>
                  <div style={{background:"#F0FDF4",borderRadius:8,padding:10,border:"1px solid #BBF7D0"}}>
                    <div style={{fontWeight:700,color:"#065F46",marginBottom:4}}>🛣️ Accès</div>
                    <div style={{color:C.tx2,lineHeight:1.5}}>{ch.acces}</div>
                  </div>
                  <div style={{background:"#FFFBEB",borderRadius:8,padding:10,border:"1px solid #FDE68A"}}>
                    <div style={{fontWeight:700,color:"#92400E",marginBottom:4}}>⚠️ Contraintes</div>
                    <div style={{color:C.tx2,lineHeight:1.5}}>{ch.contraintes}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                    <div style={{background:"#F9FAFB",borderRadius:8,padding:10,textAlign:"center"}}>
                      <div style={{fontSize:18}}>📷</div>
                      <div style={{fontSize:16,fontWeight:800,color:C.tx}}>{ch.photos}</div>
                      <div style={{fontSize:10,color:C.tx3}}>Photos</div>
                    </div>
                    <div style={{background:"#F9FAFB",borderRadius:8,padding:10,textAlign:"center"}}>
                      <div style={{fontSize:18}}>📄</div>
                      <div style={{fontSize:16,fontWeight:800,color:C.tx}}>{ch.docs}</div>
                      <div style={{fontSize:10,color:C.tx3}}>Documents</div>
                    </div>
                  </div>
                </div>
              )}

              {ongletFiche==="machines"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {ch.machines.map((m,i)=>(
                    <div key={i} style={{background:"#F9FAFB",borderRadius:8,padding:"9px 12px",
                      border:`1px solid ${C.bd}`,fontSize:11,display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:18}}>🚜</span>
                      <span style={{fontWeight:600,color:C.tx}}>{m}</span>
                    </div>
                  ))}
                  <div style={{marginTop:8,padding:10,background:"#EDE9FE",borderRadius:8,
                    fontSize:10,color:"#5B21B6",border:"1px solid #C4B5FD"}}>
                    🔧 Maintenance et disponibilités disponibles dans le module Matériels (à venir)
                  </div>
                </div>
              )}

              {ongletFiche==="tas"&&(()=>{
                const tasChantier = TAS_DATA.filter(t=>t.chantierId===ch.id);
                return (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {tasChantier.length===0?(
                      <div style={{padding:20,textAlign:"center",color:C.tx3,fontSize:12}}>
                        Aucun tas intermédiaire enregistré pour ce chantier.
                      </div>
                    ):tasChantier.map(tas=>{
                      const st = STATUT_TAS[tas.statut as keyof typeof STATUT_TAS]||STATUT_TAS.constitué;
                      return (
                        <div key={tas.id} style={{background:"#F9FAFB",borderRadius:10,
                          border:`1px solid ${st.col}44`,padding:"10px 12px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <span style={{fontSize:11,fontWeight:800,color:C.tx}}>{tas.label}</span>
                            <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                              background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10,color:C.tx2}}>
                            <span>🌲 {tas.essence}</span>
                            <span>📦 {tas.volumeEstime} m³ estimé{tas.volumeReel?` · ${tas.volumeReel} m³ réel`:""}</span>
                            {tas.humidite&&<span>💧 H = {tas.humidite}%</span>}
                            <span>📅 Mis le {new Date(tas.dateMise).toLocaleDateString("fr-FR")}</span>
                            {tas.datePrévEnlèvement&&<span>🚛 Enl. prévu : {new Date(tas.datePrévEnlèvement).toLocaleDateString("fr-FR")}</span>}
                            {tas.coordGPS&&<span>📍 GPS : {tas.coordGPS}</span>}
                          </div>
                          {tas.notes&&<div style={{marginTop:5,fontSize:10,color:"#92400E",
                            background:"#FEF3C7",borderRadius:5,padding:"4px 7px"}}>{tas.notes}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {ongletFiche==="alertes"&&(()=>{
                const alertesChantier = ALERTES_DATA.filter(a=>a.chantierId===ch.id);
                return (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {alertesChantier.length===0?(
                      <div style={{padding:"20px",textAlign:"center",background:"#F0FDF4",borderRadius:10,
                        border:"1px solid #BBF7D0",color:"#065F46",fontSize:12}}>
                        ✅ Aucune alerte active sur ce chantier.
                      </div>
                    ):alertesChantier.map(alt=>{
                      const pr = PRIORITE_ALERTE[alt.priorite]||PRIORITE_ALERTE.moyenne;
                      const st = STATUT_ALERTE[alt.statut]||STATUT_ALERTE.ouverte;
                      return (
                        <div key={alt.id} style={{background:"#FFF",borderRadius:10,
                          border:`1px solid ${pr.col}55`,padding:"10px 12px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                            <div style={{flex:1}}>
                              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:3}}>
                                <span style={{fontSize:11,fontWeight:800,color:C.tx}}>{pr.icon} {alt.titre}</span>
                              </div>
                              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                                <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                                  background:pr.bg,color:pr.col}}>{pr.label}</span>
                                <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                                  background:st.bg,color:st.col}}>{st.label}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{fontSize:10,color:C.tx2,lineHeight:1.5,marginBottom:8,
                            background:"#F9FAFB",borderRadius:6,padding:"6px 8px"}}>
                            {alt.description}
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.tx3,marginBottom:8}}>
                            <span>👤 Responsable : {alt.responsable}</span>
                            <span>Créée le {new Date(alt.dateCreation).toLocaleDateString("fr-FR")}</span>
                          </div>
                          {/* Chronologie des mises à jour */}
                          <div style={{borderTop:`1px solid ${C.bd}`,paddingTop:8}}>
                            <div style={{fontSize:9,fontWeight:700,color:C.tx3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>
                              Suivi — dernière mise à jour le {new Date(alt.dateMaj).toLocaleDateString("fr-FR")}
                            </div>
                            <div style={{display:"flex",flexDirection:"column",gap:5}}>
                              {[...alt.actions].reverse().map((a,i)=>(
                                <div key={i} style={{display:"flex",gap:8,fontSize:9,alignItems:"flex-start"}}>
                                  <div style={{flexShrink:0,color:C.tx3,minWidth:60}}>
                                    {new Date(a.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}
                                  </div>
                                  <div style={{flexShrink:0,color:"#1E40AF",fontWeight:600,minWidth:90}}>{a.auteur}</div>
                                  <div style={{color:C.tx2,lineHeight:1.4}}>{a.texte}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div style={{display:"flex",gap:5,marginTop:8}}>
                            <button onClick={()=>alert("Mise à jour de l'alerte "+alt.id+" — fonctionnalité disponible en mode connecté.")}
                              style={{flex:1,padding:"5px",borderRadius:6,fontSize:9,fontWeight:700,
                                cursor:"pointer",fontFamily:"inherit",background:"#1E3A5F",border:"none",color:"#fff"}}>
                              ✏️ Ajouter une mise à jour
                            </button>
                            {alt.statut!=="résolue"&&(
                              <button onClick={()=>alert("Alerte "+alt.id+" marquée résolue.")}
                                style={{flex:1,padding:"5px",borderRadius:6,fontSize:9,fontWeight:700,
                                  cursor:"pointer",fontFamily:"inherit",background:"#059669",border:"none",color:"#fff"}}>
                                ✅ Marquer résolue
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={()=>alert("Nouvelle alerte — formulaire disponible en mode connecté.")}
                      style={{padding:"7px",borderRadius:8,fontSize:10,fontWeight:700,
                        cursor:"pointer",fontFamily:"inherit",background:"transparent",
                        border:`1px dashed #991B1B`,color:"#991B1B"}}>
                      + Signaler une alerte
                    </button>
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
                <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
                  ✏️ Modifier
                </button>
                <button onClick={()=>{
                  const tasChantier2 = TAS_DATA.filter(t=>t.chantierId===ch.id);
                  const st2 = STATUT_CHANTIER[ch.statut]||{icon:"?",label:ch.statut,col:"#555"};
                  const now = new Date();
                  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Chantier ${ch.id}</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;margin:0;color:#1a1a1a;font-size:10pt}
.hdr{background:#1E3A5F;color:#fff;padding:20px 28px;display:flex;justify-content:space-between;align-items:flex-start}
.hdr h1{margin:0;font-size:14pt;line-height:1.3}.meta{text-align:right;font-size:9pt;opacity:.85}
.badge{background:${st2.col};color:#fff;padding:2px 9px;border-radius:4px;font-size:9pt;font-weight:700;display:inline-block;margin-top:5px}
.body{padding:20px 28px}.sec{margin-bottom:18px}
.sec h2{font-size:11pt;color:#1E3A5F;border-bottom:2px solid #1E3A5F;padding-bottom:3px;margin-bottom:10px}
.row{display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #F3F4F6}
.lbl{color:#666;width:170px;flex-shrink:0;font-size:9pt}.val{color:#111;font-weight:600;font-size:9pt}
.tas{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:10px 12px;margin-bottom:8px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;font-size:9pt}
.ftr{padding:12px 28px;border-top:1px solid #E5E7EB;display:flex;justify-content:space-between;font-size:8pt;color:#666}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr">
  <div><div style="font-size:9pt;opacity:.7;margin-bottom:3px">🌿 APPLITAG by ALTEGAD SAS — Chantiers forestiers</div>
  <h1>🌲 ${ch.label}</h1><span class="badge">${st2.icon} ${st2.label}</span></div>
  <div class="meta"><div><strong>${ch.id}</strong></div>
  <div>Généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>
  <div style="margin-top:5px;font-size:8pt">Jean-Christophe LETIERCE — Administrateur</div></div>
</div>
<div class="body">
  <div class="sec"><h2>Informations générales</h2>
  ${[["Propriétaire",ch.proprietaire],["Commune",ch.commune],["Type d'intervention",ch.typeIntervention],
    ["Essences",ch.essences],["Surface",ch.surface+" ha"],["Volume prévu",ch.volPrévu+" m³"],
    ["Budget",ch.budget.toLocaleString("fr-FR")+" €"],["Entreprise",ch.entreprise],
    ["Responsable",ch.responsable],["Période",new Date(ch.dateDebut).toLocaleDateString("fr-FR")+" — "+new Date(ch.dateFin).toLocaleDateString("fr-FR")],
  ].map(([l,v])=>`<div class="row"><span class="lbl">${l}</span><span class="val">${v||"—"}</span></div>`).join("")}
  </div>
  <div class="sec"><h2>Accès et contraintes</h2>
  <div class="row"><span class="lbl">Accès</span><span class="val">${ch.acces||"—"}</span></div>
  <div class="row"><span class="lbl">Contraintes</span><span class="val">${ch.contraintes||"Aucune"}</span></div>
  </div>
  <div class="sec"><h2>Engins mobilisés</h2>
  ${(ch.machines||[]).length>0?(ch.machines||[]).map(m=>`<div class="row"><span style="color:#B45309;margin-right:6px">🚜</span><span class="val">${m}</span></div>`).join("")
    :`<div style="color:#9CA3AF;font-size:9pt">Aucun engin renseigné</div>`}
  </div>
  ${tasChantier2.length>0?`<div class="sec"><h2>Tas intermédiaires (${tasChantier2.length})</h2>
  ${tasChantier2.map(t=>{const s=STATUT_TAS[t.statut]||{label:t.statut,col:"#555"};return`<div class="tas">
    <div style="display:flex;justify-content:space-between;margin-bottom:5px"><strong>${t.label}</strong>
    <span style="font-size:8pt;font-weight:700;color:${s.col}">${s.label}</span></div>
    <div class="g2"><span>🌲 ${t.essence}</span><span>📦 ${t.volumeEstime} m³ estimé${t.volumeReel?" · "+t.volumeReel+" m³ réel":""}</span>
    ${t.humidite?`<span>💧 H = ${t.humidite}%</span>`:""}${t.coordGPS?`<span>📍 ${t.coordGPS}</span>`:""}</div>
    ${t.notes?`<div style="margin-top:4px;font-size:9pt;color:#92400E;background:#FEF3C7;padding:3px 7px;border-radius:4px">${t.notes}</div>`:""}</div>`;}).join("")}
  </div>`:""}
  <div class="sec"><h2>Documents et photos</h2>
  <div class="row"><span class="lbl">Photos terrain</span><span class="val">${ch.photos||0} photo${(ch.photos||0)!==1?"s":""}</span></div>
  <div class="row"><span class="lbl">Documents</span><span class="val">${ch.docs||0} document${(ch.docs||0)!==1?"s":""}</span></div>
  </div>
  ${(()=>{const alts2=ALERTES_DATA.filter(a=>a.chantierId===ch.id);return alts2.length>0?`<div class="sec"><h2>Alertes actives (${alts2.filter(a=>a.statut!=="résolue").length}/${alts2.length})</h2>
  ${alts2.map(alt=>{const pr2=PRIORITE_ALERTE[alt.priorite]||PRIORITE_ALERTE.moyenne;const st3=STATUT_ALERTE[alt.statut]||STATUT_ALERTE.ouverte;return`<div class="tas">
    <div style="display:flex;justify-content:space-between;margin-bottom:5px">
      <strong style="color:${pr2.col}">${pr2.icon} ${alt.titre}</strong>
      <span style="font-size:8pt;font-weight:700;color:${st3.col}">${st3.label}</span>
    </div>
    <div style="font-size:9pt;color:#555;margin-bottom:6px">${alt.description}</div>
    <div style="font-size:8pt;color:#777;margin-bottom:6px">👤 ${alt.responsable} · Créée le ${new Date(alt.dateCreation).toLocaleDateString("fr-FR")} · Mise à jour le ${new Date(alt.dateMaj).toLocaleDateString("fr-FR")}</div>
    <div style="background:#F9FAFB;border-left:3px solid ${pr2.col};padding:6px 10px">
      ${[...alt.actions].reverse().map(a=>`<div style="display:flex;gap:10px;font-size:8pt;margin-bottom:3px;color:#333">
        <span style="color:#777;min-width:40px">${new Date(a.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}</span>
        <span style="font-weight:700;min-width:90px">${a.auteur}</span>
        <span>${a.texte}</span>
      </div>`).join("")}
    </div>
  </div>`;}).join("")}
  </div>`:"";})()}
  <div class="sec">
</div>
<div class="ftr"><div>APPLITAG by ALTEGAD SAS · Jean-Christophe LETIERCE</div><div>Rapport ${ch.id} · ${now.toLocaleDateString("fr-FR")}</div></div>
</body></html>`;
                  const win = window.open("","_blank","width=1000,height=760");
                  if(win){win.document.write(html);win.document.close();setTimeout(()=>win.print(),700);}
                }} style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"transparent",
                  border:`1px solid ${C.bd}`,color:C.tx2}}>
                  📄 Rapport PDF
                </button>
                {ch.statut==="en cours"&&(
                  <button style={{width:"100%",padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",background:"#059669",border:"none",color:"#fff",marginTop:4}}>
                    ✅ Clôturer le chantier
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ── TRANSPORTS ───────────────────────────────────────────────────

