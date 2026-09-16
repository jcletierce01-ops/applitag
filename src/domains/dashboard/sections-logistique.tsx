// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { C, FONT_TITLE } from "../../design-system/tokens.js";

// Dupliqué depuis sections.tsx — utilisé par HubAlertes
const SIGNALEMENTS_KEY = "applitag_signalements_desserte";
const signalementsGet = () => { try { return JSON.parse(localStorage.getItem(SIGNALEMENTS_KEY)||"[]"); } catch { return []; } };

// Dupliqué depuis sections.tsx — utilisé par HubAlertes + SectionPlanning
const PERMIS_LOCAL_KEY = "applitag_permis_incendie";
const permisLocalGet = () => { try { return JSON.parse(localStorage.getItem(PERMIS_LOCAL_KEY)||"[]"); } catch { return []; } };
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
  const alertes    = CHANTIERS_DATA.reduce((s,c)=>s+c.alertes,0);

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
            return (
              <div key={c.id} onClick={()=>setSelected(isSelected?null:c.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?"#1E5B3A":c.alertes>0?"#FCA5A5":C.bd}`,
                  boxShadow:isSelected?"0 0 0 3px #1E5B3A22":"none"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{c.label}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                      {c.alertes>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",
                        borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {c.alertes} alerte</span>}
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
              <div style={{display:"flex",gap:4,marginBottom:12,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
                {[["infos","📋 Infos"],["terrain","⛰️ Terrain"],["machines","🚜 Machines"],["tas","🪵 Tas"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setOngletFiche(v)}
                    style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",
                      fontFamily:"inherit",border:"none",
                      background:ongletFiche===v?"#1E5B3A":"transparent",
                      color:ongletFiche===v?"#fff":C.tx3}}>
                    {l}
                  </button>
                ))}
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

              {/* Actions */}
              <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
                <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
                  ✏️ Modifier
                </button>
                <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
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

const TRANSPORTS_DATA = [
  {id:"TRP-2026-0901",lot:"LOT-2026-044",client:"Chaufferie Moulins",
   chargement:"Plateforme Tronçais",destination:"Rue des Chataigniers, Moulins",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   dateHeure:"2026-07-19T07:30",tonnagePrévu:24,tonnageChargé:23.6,
   peseeDepart:null,peseeArrivee:null,
   statut:"en chargement",distanceKm:42,dureeMin:65,alertes:0},
  {id:"TRP-2026-0898",lot:"LOT-2026-041",client:"Réseau Vichy Agglo",
   chargement:"Stockage Ternant",destination:"ZI de Vichy — Chaufferie Centrale",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   dateHeure:"2026-07-18T14:00",tonnagePrévu:28,tonnageChargé:27.2,
   peseeDepart:27200,peseeArrivee:27100,
   statut:"livré",distanceKm:38,dureeMin:55,alertes:0},
  {id:"TRP-2026-0891",lot:"LOT-2026-038",client:"Réseau Vichy Agglo",
   chargement:"Stockage Ternant",destination:"ZI de Vichy — Chaufferie Centrale",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   dateHeure:"2026-07-16T08:00",tonnagePrévu:25,tonnageChargé:24.8,
   peseeDepart:24800,peseeArrivee:24650,
   statut:"contrôlé",distanceKm:38,dureeMin:55,alertes:0},
  {id:"TRP-2026-0884",lot:"LOT-2026-035",client:"Lycée agricole",
   chargement:"Plateforme Cérilly",destination:"Route de Moulins, Cérilly",
   chauffeur:"M. Aubert P.",vehicule:"PL Mercedes Actros — CK-891-RS",
   dateHeure:"2026-07-22T09:00",tonnagePrévu:18,tonnageChargé:null,
   peseeDepart:null,peseeArrivee:null,
   statut:"planifié",distanceKm:12,dureeMin:25,alertes:1},
  {id:"TRP-2026-0876",lot:"LOT-2026-031",client:"Réseau Vichy Agglo",
   chargement:"Stockage Ternant",destination:"ZI de Vichy — Chaufferie Centrale",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   dateHeure:"2026-07-15T07:30",tonnagePrévu:26,tonnageChargé:25.4,
   peseeDepart:25400,peseeArrivee:25200,
   statut:"contrôlé",distanceKm:38,dureeMin:55,alertes:0},
];

const STATUT_TRANSPORT = {
  planifié:       {label:"Planifié",        icon:"📋",col:"#1E40AF",bg:"#DBEAFE"},
  "en chargement":{label:"En chargement",   icon:"📦",col:"#92400E",bg:"#FEF3C7"},
  "en route":     {label:"En route",        icon:"🚛",col:"#7C3AED",bg:"#EDE9FE"},
  livré:          {label:"Livré",           icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  contrôlé:       {label:"Contrôlé",        icon:"☑️",col:"#059669",bg:"#D1FAE5"},
  annulé:         {label:"Annulé",          icon:"❌",col:"#991B1B",bg:"#FEE2E2"},
};

export const SectionTransports = () => {
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [selected, setSelected]         = useState(null);

  const transports = filtreStatut==="tous"
    ? TRANSPORTS_DATA
    : TRANSPORTS_DATA.filter(t=>t.statut===filtreStatut);

  const tr = selected ? TRANSPORTS_DATA.find(t=>t.id===selected) : null;

  const totalTonnes  = TRANSPORTS_DATA.filter(t=>t.tonnageChargé).reduce((s,t)=>s+t.tonnageChargé,0);
  const enRoute      = TRANSPORTS_DATA.filter(t=>["en chargement","en route"].includes(t.statut)).length;
  const alertesTotal = TRANSPORTS_DATA.reduce((s,t)=>s+t.alertes,0);
  const totalKm      = TRANSPORTS_DATA.reduce((s,t)=>s+t.distanceKm,0);

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🚛 Transports</div>
        <div style={{fontSize:13,color:C.tx2}}>Planification, suivi et traçabilité des enlèvements</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🚛",label:"En mouvement",val:enRoute+" véhicule"+(enRoute>1?"s":""),col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"⚖️",label:"Tonnes transportées",val:totalTonnes.toFixed(1)+" t",col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"📍",label:"Distance totale",val:totalKm+" km",col:"#0369A1",bg:"#DBEAFE"},
          {ico:"⚠️",label:"Alertes",val:alertesTotal+" alerte"+(alertesTotal>1?"s":""),col:alertesTotal>0?"#991B1B":"#059669",bg:alertesTotal>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Tous"],["planifié","Planifiés"],["en chargement","En chargement"],["livré","Livrés"],["contrôlé","Contrôlés"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setFiltreStatut(v);setSelected(null);}}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",border:`1px solid ${filtreStatut===v?"#1E5B3A":C.bd}`,
              background:filtreStatut===v?"#1E5B3A":"transparent",
              color:filtreStatut===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
        <button style={{marginLeft:"auto",padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",background:"#0369A1",border:"none",color:"#fff"}}>
          + Nouveau transport
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:tr?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
        {/* Liste */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {transports.map(t=>{
            const st = STATUT_TRANSPORT[t.statut]||STATUT_TRANSPORT.planifié;
            const isSelected = selected===t.id;
            return (
              <div key={t.id} onClick={()=>setSelected(isSelected?null:t.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?"#0369A1":t.alertes>0?"#FCA5A5":C.bd}`,
                  boxShadow:isSelected?"0 0 0 3px #0369A122":"none"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{t.id}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                      {t.alertes>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",
                        borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>⚠️ alerte</span>}
                    </div>
                    <div style={{fontSize:11,color:C.tx2,marginBottom:3}}>{t.lot} → {t.client}</div>
                    <div style={{display:"flex",gap:10,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>🚛 {t.vehicule.split("—")[0].trim()}</span>
                      <span>👤 {t.chauffeur}</span>
                      <span>📍 {t.chargement}</span>
                      <span>📅 {new Date(t.dateHeure).toLocaleDateString("fr-FR")} {new Date(t.dateHeure).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:"#0369A1"}}>
                      {t.tonnageChargé??t.tonnagePrévu} t
                    </div>
                    <div style={{fontSize:10,color:C.tx3}}>{t.distanceKm} km</div>
                    {t.peseeDepart&&(
                      <div style={{fontSize:9,color:"#059669",marginTop:2,fontWeight:600}}>
                        ⚖️ {(t.peseeDepart/1000).toFixed(1)} t pesée
                      </div>
                    )}
                  </div>
                </div>

                {/* Barre de progression statut */}
                {(()=>{
                  const etapes = ["planifié","en chargement","en route","livré","contrôlé"];
                  const idx = etapes.indexOf(t.statut);
                  return (
                    <div style={{display:"flex",gap:2,marginTop:8}}>
                      {etapes.map((e,i)=>(
                        <div key={e} style={{flex:1,height:4,borderRadius:2,
                          background:i<=idx?"#0369A1":"#E5E7EB"}}/>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Fiche détail transport */}
        {tr&&(()=>{
          const st = STATUT_TRANSPORT[tr.statut]||STATUT_TRANSPORT.planifié;
          const etapes = ["planifié","en chargement","en route","livré","contrôlé"];
          const idxSt = etapes.indexOf(tr.statut);
          return (
            <div style={{background:"#fff",borderRadius:14,border:"2px solid #0369A1",
              padding:16,position:"sticky",top:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{tr.id}</div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                </div>
                <button onClick={()=>setSelected(null)}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
              </div>

              {/* Progression */}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  {etapes.map((e,i)=>(
                    <div key={e} style={{textAlign:"center",flex:1}}>
                      <div style={{width:20,height:20,borderRadius:"50%",margin:"0 auto",
                        background:i<=idxSt?"#0369A1":"#E5E7EB",
                        border:`2px solid ${i<=idxSt?"#0369A1":"#E5E7EB"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700}}>
                        {i<=idxSt?"✓":i+1}
                      </div>
                      <div style={{fontSize:7,color:i<=idxSt?"#0369A1":C.tx3,marginTop:2,lineHeight:1.2}}>
                        {e.replace("en ","").replace("chargement","charg.").replace("planifié","prévu")}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{height:3,background:"#E5E7EB",borderRadius:2,marginTop:2}}>
                  <div style={{height:"100%",borderRadius:2,background:"#0369A1",
                    width:`${Math.min(100,idxSt/(etapes.length-1)*100)}%`}}/>
                </div>
              </div>

              {/* Détails */}
              <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11}}>
                {[
                  ["Lot","🏷️ "+tr.lot],
                  ["Client",tr.client],
                  ["Chargement","📍 "+tr.chargement],
                  ["Destination","🏁 "+tr.destination],
                  ["Chauffeur","👤 "+tr.chauffeur],
                  ["Véhicule","🚛 "+tr.vehicule],
                  ["Date / Heure","📅 "+new Date(tr.dateHeure).toLocaleDateString("fr-FR")+" à "+new Date(tr.dateHeure).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})],
                  ["Tonnage prévu","⚖️ "+tr.tonnagePrévu+" t"],
                  ["Tonnage chargé",tr.tonnageChargé?"⚖️ "+tr.tonnageChargé+" t":"— non saisi"],
                  ["Pesée départ",tr.peseeDepart?(tr.peseeDepart/1000).toFixed(1)+" t":"— en attente"],
                  ["Pesée arrivée",tr.peseeArrivee?(tr.peseeArrivee/1000).toFixed(1)+" t":"— en attente"],
                  ["Distance",tr.distanceKm+" km · ~"+tr.dureeMin+" min"],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                    <span style={{color:C.tx3,minWidth:110,flexShrink:0}}>{k}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Écart pesée */}
              {tr.peseeDepart&&tr.peseeArrivee&&(
                <div style={{marginTop:10,padding:8,borderRadius:8,
                  background:(tr.peseeDepart-tr.peseeArrivee)>500?"#FEF3C7":"#F0FDF4",
                  border:`1px solid ${(tr.peseeDepart-tr.peseeArrivee)>500?"#FDE68A":"#BBF7D0"}`,fontSize:11}}>
                  <span style={{fontWeight:700}}>Écart pesée : </span>
                  {((tr.peseeDepart-tr.peseeArrivee)/1000).toFixed(2)} t
                  {(tr.peseeDepart-tr.peseeArrivee)>500
                    ? " ⚠️ écart significatif — vérifier"
                    : " ✅ dans les tolérances"}
                </div>
              )}

              {tr.alertes>0&&(
                <div style={{marginTop:8,padding:"8px 10px",background:"#FEE2E2",borderRadius:8,
                  fontSize:11,color:"#991B1B",border:"1px solid #FECACA"}}>
                  ⚠️ Transport en alerte — vérifier le dossier avant départ
                </div>
              )}

              {/* Actions */}
              <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
                {tr.statut==="planifié"&&(
                  <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",background:"#0369A1",border:"none",color:"#fff"}}>
                    ▶ Démarrer
                  </button>
                )}
                {tr.statut==="en chargement"&&(
                  <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",background:"#7C3AED",border:"none",color:"#fff"}}>
                    🚛 Marquer En route
                  </button>
                )}
                <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"transparent",
                  border:`1px solid ${C.bd}`,color:C.tx2}}>
                  📄 Lettre de voiture
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ── ANALYSES — TABLEAUX DE BORD FINANCIERS ──────────────────────

const LOTS_ANALYSES = [
  {id:"L044",label:"LOT-2026-044",client:"Chaufferie Moulins",chantier:"Forêt Tronçais",
   essences:"Chêne/Hêtre",tonne:148,prixVente:82,coutAchat:18,coutChantier:12,coutTransport:8,coutBroyage:6,
   humidite:28,qualite:"BE",mois:"2026-05"},
  {id:"L041",label:"LOT-2026-041",client:"Réseau Vichy Agglo",chantier:"Parcelle Ternant",
   essences:"Chêne",tonne:95,prixVente:85,coutAchat:20,coutChantier:14,coutTransport:9,coutBroyage:6,
   humidite:31,qualite:"BE",mois:"2026-05"},
  {id:"L038",label:"LOT-2026-038",client:"Chaufferie Moulins",chantier:"CH-2026-09",
   essences:"Hêtre",tonne:203,prixVente:78,coutAchat:16,coutChantier:11,coutTransport:7,coutBroyage:5,
   humidite:25,qualite:"BE",mois:"2026-04"},
  {id:"L035",label:"LOT-2026-035",client:"Lycée agricole",chantier:"Forêt Cérilly",
   essences:"Charme/Hêtre",tonne:61,prixVente:80,coutAchat:19,coutChantier:13,coutTransport:10,coutBroyage:6,
   humidite:33,qualite:"BE",mois:"2026-04"},
  {id:"L031",label:"LOT-2026-031",client:"Réseau Vichy Agglo",chantier:"CH-2026-07",
   essences:"Chêne",tonne:174,prixVente:83,coutAchat:21,coutChantier:15,coutTransport:8,coutBroyage:7,
   humidite:29,qualite:"BE",mois:"2026-03"},
  {id:"L028",label:"LOT-2026-028",client:"Chaufferie St-Amand",chantier:"Bocage Nord",
   essences:"Chêne/Charme",tonne:88,prixVente:76,coutAchat:17,coutChantier:12,coutTransport:11,coutBroyage:6,
   humidite:36,qualite:"BE",mois:"2026-03"},
  {id:"L024",label:"LOT-2026-024",client:"Chaufferie Moulins",chantier:"Tronçais Sud",
   essences:"Hêtre",tonne:221,prixVente:81,coutAchat:18,coutChantier:11,coutTransport:7,coutBroyage:5,
   humidite:27,qualite:"BE",mois:"2026-02"},
  {id:"L019",label:"LOT-2026-019",client:"Réseau Vichy Agglo",chantier:"Parcelle Ternant",
   essences:"Chêne",tonne:132,prixVente:84,coutAchat:20,coutChantier:13,coutTransport:9,coutBroyage:6,
   humidite:30,qualite:"BE",mois:"2026-01"},
];

// Calculs dérivés
const enrichLot = l => {
  const coutTotal = l.coutAchat + l.coutChantier + l.coutTransport + l.coutBroyage;
  const marge = l.prixVente - coutTotal;
  const margePct = Math.round(marge / l.prixVente * 100);
  const caTotal = l.tonne * l.prixVente;
  const coutTotalEur = l.tonne * coutTotal;
  const margeEur = l.tonne * marge;
  return {...l, coutTotal, marge, margePct, caTotal, coutTotalEur, margeEur};
};
const LOTS_ENRICHIS = LOTS_ANALYSES.map(enrichLot);

// Agrégation par client
const byClient = () => {
  const map = {};
  LOTS_ENRICHIS.forEach(l => {
    if (!map[l.client]) map[l.client] = {client:l.client, tonne:0, caTotal:0, margeEur:0, lots:0};
    map[l.client].tonne    += l.tonne;
    map[l.client].caTotal  += l.caTotal;
    map[l.client].margeEur += l.margeEur;
    map[l.client].lots     += 1;
  });
  return Object.values(map).map(c => ({...c, margePct:Math.round(c.margeEur/c.caTotal*100)}));
};

// Agrégation par mois
const byMois = () => {
  const map = {};
  LOTS_ENRICHIS.forEach(l => {
    if (!map[l.mois]) map[l.mois] = {mois:l.mois, caTotal:0, margeEur:0, tonne:0};
    map[l.mois].caTotal  += l.caTotal;
    map[l.mois].margeEur += l.margeEur;
    map[l.mois].tonne    += l.tonne;
  });
  return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v);
};

// Mini barre SVG inline
export const BarChart = ({data, valKey, labelKey, couleurFn, height=120, _unite="€"}) => {
  const max = Math.max(...data.map(d=>d[valKey]));
  const _w = 100 / data.length;
  return (
    <svg viewBox={`0 0 ${data.length*60} ${height+30}`} style={{width:"100%",height:height+30}}>
      {data.map((d,i)=>{
        const barH = Math.round((d[valKey]/max)*(height-10));
        const x = i*60+8;
        const y = height - barH;
        const col = couleurFn ? couleurFn(d) : "#1E5B3A";
        return (
          <g key={i}>
            <rect x={x} y={y} width={44} height={barH} rx={4} fill={col} opacity={.85}/>
            <text x={x+22} y={y-4} textAnchor="middle" fontSize={8} fill="#374151" fontWeight="700">
              {d[valKey]>=1000?Math.round(d[valKey]/1000)+"k":d[valKey]}
            </text>
            <text x={x+22} y={height+14} textAnchor="middle" fontSize={8} fill="#6B7280">
              {String(d[labelKey]).slice(0,7)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// Jauge marge
const JaugeMarge = ({pct, size=52}) => {
  const col = pct>=30?"#059669":pct>=20?"#D97706":"#DC2626";
  const bg  = pct>=30?"#D1FAE5":pct>=20?"#FEF3C7":"#FEE2E2";
  return (
    <div style={{width:size,height:size,borderRadius:"50%",
      border:`4px solid ${col}`,background:bg,
      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{fontSize:size*0.22,fontWeight:900,color:col}}>{pct}%</span>
    </div>
  );
};

export const SectionAnalyses = () => {
  const [vue, setVue] = useState("global"); // global | lots | clients | mensuel
  const [periodeFiltre, setPeriodeFiltre] = useState("tous");

  const lotsFiltres = periodeFiltre==="tous"
    ? LOTS_ENRICHIS
    : LOTS_ENRICHIS.filter(l=>l.mois.startsWith(periodeFiltre));

  const totCA    = lotsFiltres.reduce((s,l)=>s+l.caTotal,0);
  const totMarge = lotsFiltres.reduce((s,l)=>s+l.margeEur,0);
  const totTonne = lotsFiltres.reduce((s,l)=>s+l.tonne,0);
  const totCout  = lotsFiltres.reduce((s,l)=>s+l.coutTotalEur,0);
  const margePctGlobal = totCA>0 ? Math.round(totMarge/totCA*100) : 0;
  const coutMoyTonne = totTonne>0 ? Math.round(totCout/totTonne) : 0;
  const prixMoyTonne = totTonne>0 ? Math.round(totCA/totTonne) : 0;

  const clientsData = byClient();
  const mensuelData = byMois();

  const fmt = v => v>=1000 ? (v/1000).toFixed(1)+" k€" : v+" €";

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>📊 APPLITAG Analyses</div>
        <div style={{fontSize:13,color:C.tx2}}>Rentabilité, coûts et performance par lot · chantier · client</div>
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        <div style={{display:"flex",gap:4}}>
          {[["tous","Toute période"],["2026-05","Mai 2026"],["2026-04","Avr. 2026"],
            ["2026-03","Mars 2026"],["2026-02","Fév. 2026"],["2026-01","Jan. 2026"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriodeFiltre(v)}
              style={{padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",border:`1px solid ${periodeFiltre===v?"#1E5B3A":C.bd}`,
                background:periodeFiltre===v?"#1E5B3A":"transparent",
                color:periodeFiltre===v?"#fff":C.tx2}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {[["global","🌐 Global"],["lots","📦 Par lot"],["clients","👥 Par client"],["mensuel","📅 Mensuel"]].map(([v,l])=>(
            <button key={v} onClick={()=>setVue(v)}
              style={{padding:"5px 11px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",border:`1px solid ${vue===v?"#7C3AED":C.bd}`,
                background:vue===v?"#7C3AED":"transparent",
                color:vue===v?"#fff":C.tx2}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs globaux — toujours visibles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"💶",label:"Chiffre d'affaires",val:fmt(totCA),sub:`${totTonne} t · ${prixMoyTonne} €/t`,col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"💰",label:"Marge brute",val:fmt(totMarge),sub:`${margePctGlobal}% du CA`,col:margePctGlobal>=25?"#059669":margePctGlobal>=15?"#D97706":"#DC2626",
           bg:margePctGlobal>=25?"#D1FAE5":margePctGlobal>=15?"#FEF3C7":"#FEE2E2"},
          {ico:"⚙️",label:"Coûts directs",val:fmt(totCout),sub:`${coutMoyTonne} €/tonne`,col:"#0369A1",bg:"#DBEAFE"},
          {ico:"📦",label:"Lots analysés",val:lotsFiltres.length+" lots",sub:`${totTonne} tonnes totales`,col:"#7C3AED",bg:"#EDE9FE"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px",border:`1px solid ${k.col}22`}}>
            <div style={{fontSize:18,marginBottom:4}}>{k.ico}</div>
            <div style={{fontSize:15,fontWeight:900,color:k.col}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.8,marginTop:2}}>{k.label}</div>
            <div style={{fontSize:10,color:k.col,opacity:.65,marginTop:1}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Vue GLOBAL */}
      {vue==="global"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {/* Décomposition des coûts */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:12}}>⚙️ Décomposition des coûts (€/tonne moyen)</div>
            {[
              {label:"Achat bois",key:"coutAchat",col:"#1E5B3A"},
              {label:"Travaux chantier",key:"coutChantier",col:"#0369A1"},
              {label:"Transport",key:"coutTransport",col:"#D97706"},
              {label:"Broyage",key:"coutBroyage",col:"#7C3AED"},
            ].map(item=>{
              const moy = Math.round(lotsFiltres.reduce((s,l)=>s+l[item.key],0)/Math.max(lotsFiltres.length,1));
              const pct = coutMoyTonne>0?Math.round(moy/coutMoyTonne*100):0;
              return (
                <div key={item.key} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                    <span style={{color:C.tx2}}>{item.label}</span>
                    <span style={{fontWeight:700,color:C.tx}}>{moy} €/t <span style={{color:C.tx3,fontWeight:400}}>({pct}%)</span></span>
                  </div>
                  <div style={{height:8,borderRadius:4,background:"#F3F4F6",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:item.col,borderRadius:4}}/>
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.bd}`,
              display:"flex",justifyContent:"space-between",fontSize:11}}>
              <span style={{color:C.tx2,fontWeight:700}}>Total coûts</span>
              <span style={{fontWeight:900,color:C.tx}}>{coutMoyTonne} €/t</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:4}}>
              <span style={{color:"#059669",fontWeight:700}}>Marge brute</span>
              <span style={{fontWeight:900,color:"#059669"}}>{prixMoyTonne-coutMoyTonne} €/t · {margePctGlobal}%</span>
            </div>
          </div>

          {/* Évolution mensuelle CA + Marge */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:8}}>📅 Évolution mensuelle CA / Marge</div>
            <div style={{display:"flex",gap:10,marginBottom:8}}>
              <div style={{display:"flex",gap:4,alignItems:"center",fontSize:10}}>
                <div style={{width:10,height:10,borderRadius:2,background:"#1E5B3A"}}/>CA
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center",fontSize:10}}>
                <div style={{width:10,height:10,borderRadius:2,background:"#059669",opacity:.6}}/>Marge
              </div>
            </div>
            <svg viewBox={`0 0 ${mensuelData.length*70} 130`} style={{width:"100%",height:130}}>
              {mensuelData.map((d,i)=>{
                const maxCA = Math.max(...mensuelData.map(x=>x.caTotal));
                const barH_CA = Math.round(d.caTotal/maxCA*90);
                const barH_MG = Math.round(d.margeEur/maxCA*90);
                const x = i*70+5;
                const label = d.mois.slice(5)===("01")?"Jan":d.mois.slice(5)==="02"?"Fév":
                              d.mois.slice(5)==="03"?"Mar":d.mois.slice(5)==="04"?"Avr":
                              d.mois.slice(5)==="05"?"Mai":"Jun";
                return (
                  <g key={i}>
                    <rect x={x} y={100-barH_CA} width={25} height={barH_CA} rx={3} fill="#1E5B3A" opacity={.8}/>
                    <rect x={x+28} y={100-barH_MG} width={25} height={barH_MG} rx={3} fill="#059669" opacity={.6}/>
                    <text x={x+29} y={115} fontSize={8} fill="#6B7280" textAnchor="middle">{label}</text>
                    <text x={x+12} y={100-barH_CA-3} fontSize={7} fill="#374151" textAnchor="middle">
                      {Math.round(d.caTotal/1000)}k
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Top clients par marge */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>👥 Clients — Classement par marge</div>
            {clientsData.sort((a,b)=>b.margePct-a.margePct).map((cl,i)=>(
              <div key={cl.client} style={{display:"flex",gap:10,alignItems:"center",
                padding:"7px 0",borderBottom:i<clientsData.length-1?`1px solid ${C.bd}`:"none"}}>
                <JaugeMarge pct={cl.margePct}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{cl.client}</div>
                  <div style={{fontSize:10,color:C.tx2}}>
                    {cl.lots} lots · {cl.tonne} t · CA {fmt(cl.caTotal)}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#059669"}}>{fmt(cl.margeEur)}</div>
                  <div style={{fontSize:10,color:C.tx3}}>marge brute</div>
                </div>
              </div>
            ))}
          </div>

          {/* Alertes financières */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>⚠️ Points d'attention financiers</div>
            {[
              {icon:"🔴",msg:"LOT-2026-028 (Chaufferie St-Amand) : humidité 36% — risque de refus ou décote",type:"qualité"},
              {icon:"🟠",msg:"LOT-2026-035 (Lycée agricole) : marge 25% — coût transport élevé (10 €/t)",type:"coût"},
              {icon:"🟡",msg:"Chaufferie St-Amand : 1 seul lot livré — dépendance faible volume",type:"commercial"},
              {icon:"🟢",msg:"LOT-2026-024 (Tronçais Sud) : meilleure marge brute — 221 t à 34 €/t",type:"bon"},
            ].map((al,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",
                padding:"7px 8px",marginBottom:5,borderRadius:7,
                background:al.type==="bon"?"#F0FDF4":al.type==="qualité"?"#FEF2F2":"#FFFBEB",
                border:`1px solid ${al.type==="bon"?"#BBF7D0":al.type==="qualité"?"#FECACA":"#FDE68A"}`}}>
                <span style={{fontSize:14,flexShrink:0}}>{al.icon}</span>
                <span style={{fontSize:11,color:C.tx2,lineHeight:1.4}}>{al.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vue PAR LOT */}
      {vue==="lots"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`,background:"#F9FAFB",
            display:"grid",gridTemplateColumns:"1.5fr 80px 70px 70px 70px 70px 70px 60px",
            gap:6,fontSize:10,fontWeight:700,color:C.tx3}}>
            <span>Lot / Client</span><span style={{textAlign:"right"}}>Tonnes</span>
            <span style={{textAlign:"right"}}>Prix/t</span><span style={{textAlign:"right"}}>Coût/t</span>
            <span style={{textAlign:"right"}}>Marge/t</span><span style={{textAlign:"right"}}>CA total</span>
            <span style={{textAlign:"right"}}>Marge €</span><span style={{textAlign:"center"}}>Marge %</span>
          </div>
          {lotsFiltres.sort((a,b)=>b.margePct-a.margePct).map((l,i)=>(
            <div key={l.id} style={{
              display:"grid",gridTemplateColumns:"1.5fr 80px 70px 70px 70px 70px 70px 60px",
              gap:6,padding:"9px 14px",alignItems:"center",
              borderBottom:i<lotsFiltres.length-1?`1px solid ${C.bd}`:"none",
              background:i%2===0?"#fff":"#FAFAFA"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{l.label}</div>
                <div style={{fontSize:10,color:C.tx2}}>{l.client} · {l.mois.slice(0,7)}</div>
                <div style={{fontSize:9,color:C.tx3}}>{l.essences} · H={l.humidite}%</div>
              </div>
              <span style={{fontSize:11,textAlign:"right",color:C.tx2}}>{l.tonne} t</span>
              <span style={{fontSize:11,textAlign:"right",color:C.tx2}}>{l.prixVente} €</span>
              <span style={{fontSize:11,textAlign:"right",color:"#0369A1"}}>{l.coutTotal} €</span>
              <span style={{fontSize:11,textAlign:"right",fontWeight:700,
                color:l.marge>=25?"#059669":l.marge>=15?"#D97706":"#DC2626"}}>{l.marge} €</span>
              <span style={{fontSize:11,textAlign:"right",color:C.tx2}}>{fmt(l.caTotal)}</span>
              <span style={{fontSize:11,textAlign:"right",fontWeight:700,color:"#059669"}}>{fmt(l.margeEur)}</span>
              <div style={{display:"flex",justifyContent:"center"}}>
                <JaugeMarge pct={l.margePct} size={38}/>
              </div>
            </div>
          ))}
          <div style={{padding:"10px 14px",background:"#F0FDF4",borderTop:`2px solid #1E5B3A`,
            display:"grid",gridTemplateColumns:"1.5fr 80px 70px 70px 70px 70px 70px 60px",gap:6,
            fontSize:11,fontWeight:800,color:"#065F46"}}>
            <span>TOTAL</span>
            <span style={{textAlign:"right"}}>{totTonne} t</span>
            <span style={{textAlign:"right"}}>{prixMoyTonne} €</span>
            <span style={{textAlign:"right"}}>{coutMoyTonne} €</span>
            <span style={{textAlign:"right"}}>{prixMoyTonne-coutMoyTonne} €</span>
            <span style={{textAlign:"right"}}>{fmt(totCA)}</span>
            <span style={{textAlign:"right"}}>{fmt(totMarge)}</span>
            <span style={{textAlign:"center"}}>{margePctGlobal}%</span>
          </div>
        </div>
      )}

      {/* Vue PAR CLIENT */}
      {vue==="clients"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {clientsData.sort((a,b)=>b.caTotal-a.caTotal).map(cl=>{
            const lotsClient = LOTS_ENRICHIS.filter(l=>l.client===cl.client);
            return (
              <div key={cl.client} style={{background:"#fff",borderRadius:12,
                border:`2px solid ${cl.margePct>=25?"#059669":cl.margePct>=15?"#D97706":"#DC2626"}`,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",display:"flex",gap:12,alignItems:"center",
                  background:cl.margePct>=25?"#F0FDF4":cl.margePct>=15?"#FFFBEB":"#FEF2F2",
                  borderBottom:`1px solid ${C.bd}`}}>
                  <JaugeMarge pct={cl.margePct} size={52}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:800,color:C.tx}}>{cl.client}</div>
                    <div style={{fontSize:11,color:C.tx2,marginTop:2}}>
                      {cl.lots} lots · {cl.tonne} tonnes · CA {fmt(cl.caTotal)}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#059669"}}>{fmt(cl.margeEur)}</div>
                    <div style={{fontSize:10,color:C.tx3}}>marge brute totale</div>
                  </div>
                </div>
                <div style={{padding:"10px 16px",overflowX:"auto"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,minWidth:400}}>
                    {lotsClient.map(l=>(
                      <div key={l.id} style={{background:"#F9FAFB",borderRadius:8,padding:"8px 10px",
                        border:`1px solid ${C.bd}`,fontSize:10}}>
                        <div style={{fontWeight:700,color:C.tx,marginBottom:2}}>{l.label.slice(-6)}</div>
                        <div style={{color:C.tx3}}>{l.mois.slice(0,7)}</div>
                        <div style={{color:C.tx2}}>{l.tonne} t</div>
                        <div style={{fontWeight:700,color:l.margePct>=25?"#059669":"#D97706"}}>
                          {l.margePct}% · {fmt(l.margeEur)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vue MENSUELLE */}
      {vue==="mensuel"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
              💶 CA mensuel (€)
            </div>
            <BarChart
              data={mensuelData} valKey="caTotal" labelKey="mois"
              couleurFn={()=>"#1E5B3A"} height={130}
            />
          </div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
              💰 Marge brute mensuelle (€)
            </div>
            <BarChart
              data={mensuelData} valKey="margeEur" labelKey="mois"
              couleurFn={d=>d.margeEur/d.caTotal>=0.25?"#059669":"#D97706"} height={130}
            />
          </div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,gridColumn:"1/-1"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>📅 Synthèse mensuelle</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#F9FAFB",borderBottom:`1px solid ${C.bd}`}}>
                    {["Mois","Tonnes","CA (€)","Coûts (€)","Marge (€)","Marge %","Moy €/t"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",color:C.tx3,fontWeight:700,
                        textAlign:h==="Mois"?"left":"right"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mensuelData.map((m,i)=>{
                    const margePct=Math.round(m.margeEur/m.caTotal*100);
                    return (
                      <tr key={m.mois} style={{borderBottom:`1px solid ${C.bd}`,
                        background:i%2===0?"#fff":"#FAFAFA"}}>
                        <td style={{padding:"7px 10px",fontWeight:700}}>{m.mois}</td>
                        <td style={{padding:"7px 10px",textAlign:"right"}}>{m.tonne}</td>
                        <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(m.caTotal)}</td>
                        <td style={{padding:"7px 10px",textAlign:"right",color:"#0369A1"}}>
                          {fmt(m.caTotal-m.margeEur)}
                        </td>
                        <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#059669"}}>
                          {fmt(m.margeEur)}
                        </td>
                        <td style={{padding:"7px 10px",textAlign:"right"}}>
                          <span style={{fontWeight:700,
                            color:margePct>=25?"#059669":margePct>=15?"#D97706":"#DC2626"}}>
                            {margePct}%
                          </span>
                        </td>
                        <td style={{padding:"7px 10px",textAlign:"right"}}>
                          {Math.round(m.caTotal/m.tonne)} €
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:"#F0FDF4",borderTop:`2px solid #1E5B3A`,fontWeight:800,color:"#065F46"}}>
                    <td style={{padding:"7px 10px"}}>TOTAL</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{totTonne}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(totCA)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(totCout)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(totMarge)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{margePctGlobal}%</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{prixMoyTonne} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── DOCUMENTS PDF ───────────────────────────────────────────────

const DOC_TYPES = [
  {
    id:"rapport_visite", cat:"exploitation",
    icon:"📋", label:"Rapport de visite mandataire",
    desc:"Synthèse des 12 étapes de visite terrain : admin, GPS, biomasse, finance, contraintes, accès, plateforme, replantation, certification, réglementation, check-list",
    champs:["Propriétaire","Parcelle","Date visite","Mandataire","GPS","Essences","Surface","Volume estimé","Prix/tonne","Snapshot réglementaire","Clause de réserve","Certifications"],
    delai:"Immédiat",couleur:"#1E5B3A",
  },
  {
    id:"bon_livraison", cat:"logistique",
    icon:"📦", label:"Bon de livraison",
    desc:"Document de réception chaufferie : pesée, humidité, qualité, conformité, signature réceptionnaire",
    champs:["N° BL","Lot","Chaufferie","Date","Heure","Poids brut","Tare","Poids net","Humidité","Granulométrie","Conformité","Signature"],
    delai:"Immédiat",couleur:"#0369A1",
  },
  {
    id:"lettre_voiture", cat:"logistique",
    icon:"🚛", label:"Lettre de voiture (CMR simplifiée)",
    desc:"Document d'expédition pour le chauffeur : lieu de chargement, destination, lot, tonnage",
    champs:["N° transport","Chauffeur","Véhicule","Chargement GPS","Destination","Lot","Tonnage estimé","Date/heure départ","Observations"],
    delai:"Immédiat",couleur:"#0369A1",
  },
  {
    id:"convention_proprio", cat:"propriétaire",
    icon:"🤝", label:"Convention propriétaire",
    desc:"Accord entre le propriétaire et l'opérateur : parcelle, volumes, prix, conditions d'accès, remise en état",
    champs:["Propriétaire","Parcelle","Références cadastrales","Surface","Volume prévu","Prix unitaire","Modalités paiement","Conditions accès","Obligations remise en état","Durée","Signatures"],
    delai:"Sur validation",couleur:"#7C3AED",
  },
  {
    id:"autorisation_coupe", cat:"propriétaire",
    icon:"🪓", label:"Autorisation d'exploitation",
    desc:"Document signé par le propriétaire autorisant le chantier d'exploitation forestière",
    champs:["Propriétaire","Mandataire","Parcelle","Nature travaux","Dates prévisionnelles","Entreprise intervenante","Conditions particulières","Date","Signature propriétaire"],
    delai:"Sur validation",couleur:"#7C3AED",
  },
  {
    id:"rapport_chantier", cat:"exploitation",
    icon:"🌲", label:"Rapport de fin de chantier",
    desc:"Bilan complet du chantier : surface traitée, volumes produits, coûts, incidents, photos, validation",
    champs:["Chantier","Période","Entreprise","Surface traitée","Nature intervention","Volume produit","Tonnage","Coût total","Incidents","Photos avant/après","Observations","Validation"],
    delai:"Sur clôture",couleur:"#1E5B3A",
  },
  {
    id:"fiche_lot", cat:"traçabilité",
    icon:"🏷️", label:"Fiche traçabilité lot",
    desc:"Document de traçabilité complet d'un lot : origine parcelle → chantier → stockage → livraison",
    champs:["ID lot","Origine parcelle","Propriétaire","Essences","Volume","Poids","Chantier","Date production","Entreprise","Transporteur","Destination","Livraison","Conformité"],
    delai:"Immédiat",couleur:"#D97706",
  },
  {
    id:"snapshot_regl", cat:"réglementation",
    icon:"⚖️", label:"Snapshot réglementaire dossier",
    desc:"Copie datée des textes réglementaires en vigueur au moment de la préparation du dossier — immuable, valeur probante",
    champs:["Dossier","Date snapshot","Auteur","Dispositif d'aide","Textes de référence","Statuts au jour J","Alertes actives","Clause de réserve","Version critères","Signature mandataire"],
    delai:"Sur visite",couleur:"#5b21b6",
  },
  {
    id:"attestation_durabilite", cat:"réglementation",
    icon:"🌿", label:"Attestation de durabilité biomasse",
    desc:"Document de conformité RED II/RED III : origine, type de biomasse, critères de durabilité, réduction émissions",
    champs:["Opérateur","Période","Lots concernés","Origine géographique","Type biomasse","Critères durabilité","Réduction GES estimée","Chaîne de contrôle","Certifications","Signature"],
    delai:"Sur demande",couleur:"#059669",
  },
];

const DOC_CATS = [
  {id:"tous",           label:"Tous",          icon:"📁"},
  {id:"exploitation",   label:"Exploitation",  icon:"🌲"},
  {id:"logistique",     label:"Logistique",    icon:"🚛"},
  {id:"propriétaire",   label:"Propriétaire",  icon:"👤"},
  {id:"traçabilité",    label:"Traçabilité",   icon:"🔗"},
  {id:"réglementation", label:"Réglementation",icon:"⚖️"},
];

// Historique de documents générés (simulé)
const DOCS_HISTORIQUE = [
  {id:"d001",type:"rapport_visite",    ref:"Visite — Forêt Ternant (58)",   date:"2026-07-17",auteur:"M. Boivin",taille:"148 Ko",statut:"signé"},
  {id:"d002",type:"bon_livraison",     ref:"BL-2026-0234 — Chaufferie Moulins",date:"2026-07-16",auteur:"Système",taille:"42 Ko",statut:"validé"},
  {id:"d003",type:"lettre_voiture",    ref:"TRP-2026-0891 — Vichy Agglo",   date:"2026-07-16",auteur:"Système",taille:"28 Ko",statut:"émis"},
  {id:"d004",type:"convention_proprio",ref:"Convention — M. Gallet (03)",   date:"2026-07-14",auteur:"M. Boivin",taille:"204 Ko",statut:"signé"},
  {id:"d005",type:"snapshot_regl",     ref:"Snapshot — Dossier Ternant",    date:"2026-07-14",auteur:"M. Boivin",taille:"96 Ko",statut:"archivé"},
  {id:"d006",type:"fiche_lot",         ref:"LOT-2026-044 — Forêt Tronçais", date:"2026-07-13",auteur:"Système",taille:"64 Ko",statut:"validé"},
  {id:"d007",type:"rapport_chantier",  ref:"Chantier CH-2026-12 — Cérilly", date:"2026-07-10",auteur:"M. Boivin",taille:"312 Ko",statut:"signé"},
  {id:"d008",type:"autorisation_coupe",ref:"Autorisation — Mme Renard",     date:"2026-07-08",auteur:"M. Boivin",taille:"88 Ko",statut:"signé"},
];

const STATUT_DOC = {
  signé:   {label:"Signé",    color:"#065F46",bg:"#D1FAE5",icon:"✅"},
  validé:  {label:"Validé",   color:"#1E40AF",bg:"#DBEAFE",icon:"☑️"},
  émis:    {label:"Émis",     color:"#92400E",bg:"#FEF3C7",icon:"📤"},
  archivé: {label:"Archivé",  color:"#6B7280",bg:"#F3F4F6",icon:"🗃️"},
  brouillon:{label:"Brouillon",color:"#9CA3AF",bg:"#F9FAFB",icon:"📝"},
};

export const SectionDocuments = () => {
  const [catActive, setCatActive] = useState("tous");
  const [docPreview, setDocPreview] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [onglet, setOnglet] = useState("catalogue"); // catalogue | historique

  const docsFiltres = DOC_TYPES.filter(d =>
    (catActive==="tous" || d.cat===catActive) &&
    (!searchQ || d.label.toLowerCase().includes(searchQ.toLowerCase()) || d.desc.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const getDocType = id => DOC_TYPES.find(d=>d.id===id);

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>📄 APPLITAG Documents</div>
        <div style={{fontSize:13,color:C.tx2}}>Génération, classement et archivage des documents métier</div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {[["catalogue","📚 Catalogue documents"],["historique","🗃️ Historique & archives"]].map(([v,l])=>(
          <button key={v} onClick={()=>setOnglet(v)}
            style={{padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:`2px solid ${onglet===v?"#1E5B3A":C.bd}`,
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <div style={{background:"#D1FAE5",color:"#065F46",borderRadius:6,padding:"4px 10px",
            fontSize:11,fontWeight:700}}>
            {DOCS_HISTORIQUE.length} documents archivés
          </div>
        </div>
      </div>

      {/* CATALOGUE */}
      {onglet==="catalogue"&&(
        <div>
          {/* Filtres */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {DOC_CATS.map(cat=>(
              <button key={cat.id} onClick={()=>setCatActive(cat.id)}
                style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                  fontFamily:"inherit",border:`1px solid ${catActive===cat.id?"#1E5B3A":C.bd}`,
                  background:catActive===cat.id?"#1E5B3A":"transparent",
                  color:catActive===cat.id?"#fff":C.tx2}}>
                {cat.icon} {cat.label}
              </button>
            ))}
            <input
              value={searchQ} onChange={e=>setSearchQ(e.target.value)}
              placeholder="Rechercher un document…"
              style={{marginLeft:"auto",padding:"5px 10px",borderRadius:7,border:`1px solid ${C.bd}`,
                fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none",minWidth:180}}
            />
          </div>

          {/* Grille de types */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:10,marginBottom:16}}>
            {docsFiltres.map(doc=>(
              <div key={doc.id}
                onClick={()=>setDocPreview(docPreview?.id===doc.id?null:doc)}
                style={{background:"#fff",borderRadius:12,border:`2px solid ${docPreview?.id===doc.id?doc.couleur:C.bd}`,
                  padding:"12px 14px",cursor:"pointer",transition:"all .15s",
                  boxShadow:docPreview?.id===doc.id?"0 0 0 3px "+doc.couleur+"22":"none"}}>
                <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontSize:22,lineHeight:1}}>{doc.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:2}}>{doc.label}</div>
                    <div style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,display:"inline-block",
                      background:doc.couleur+"15",color:doc.couleur}}>
                      {doc.cat}
                    </div>
                  </div>
                  <div style={{fontSize:9,color:C.tx3,fontStyle:"italic",whiteSpace:"nowrap"}}>{doc.delai}</div>
                </div>
                <div style={{fontSize:11,color:C.tx2,lineHeight:1.4,marginBottom:8}}>{doc.desc}</div>
                <button
                  onClick={e=>{e.stopPropagation();setDocPreview(doc);}}
                  style={{width:"100%",padding:"6px",borderRadius:7,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",border:`1px solid ${doc.couleur}`,
                    background:doc.couleur,color:"#fff"}}>
                  ⚡ Générer ce document
                </button>
              </div>
            ))}
          </div>

          {/* Panneau de prévisualisation */}
          {docPreview&&(
            <div style={{background:"#fff",borderRadius:14,border:`2px solid ${docPreview.couleur}`,
              padding:20,marginBottom:16}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14}}>
                <div style={{fontSize:32}}>{docPreview.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:C.tx}}>{docPreview.label}</div>
                  <div style={{fontSize:12,color:C.tx2,marginTop:2}}>{docPreview.desc}</div>
                </div>
                <button onClick={()=>setDocPreview(null)}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {/* Champs inclus */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx,marginBottom:8}}>📌 Champs inclus</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {docPreview.champs.map((ch,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,
                        padding:"4px 8px",borderRadius:6,background:"#F9FAFB",border:`1px solid ${C.bd}`}}>
                        <span style={{color:docPreview.couleur,fontWeight:700,fontSize:9}}>▸</span>
                        <span style={{color:C.tx2}}>{ch}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulation de contenu */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx,marginBottom:8}}>📄 Aperçu du document</div>
                  <div style={{background:"#F9FAFB",borderRadius:10,border:`1px solid ${C.bd}`,
                    padding:14,fontFamily:"Georgia,serif",fontSize:10,color:"#374151",lineHeight:1.6}}>
                    <div style={{textAlign:"center",marginBottom:10,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
                      <div style={{fontWeight:900,fontSize:12,color:docPreview.couleur}}>APPLITAG</div>
                      <div style={{fontWeight:700,fontSize:11,marginTop:2}}>{docPreview.label.toUpperCase()}</div>
                      <div style={{fontSize:9,color:"#9CA3AF",marginTop:2}}>
                        Généré le {new Date().toLocaleDateString("fr-FR")} · Référence : [AUTO]
                      </div>
                    </div>
                    {docPreview.champs.slice(0,5).map((ch,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:3}}>
                        <span style={{fontWeight:700,minWidth:110,color:"#374151"}}>{ch} :</span>
                        <span style={{color:"#6B7280",fontStyle:"italic"}}>
                          {i===0?"[Automatique depuis dossier]":i===1?"[Sélectionné]":"…"}
                        </span>
                      </div>
                    ))}
                    <div style={{textAlign:"center",marginTop:10,color:"#D1D5DB",fontSize:9}}>
                      ·  ·  ·  {docPreview.champs.length - 5} champs supplémentaires  ·  ·  ·
                    </div>
                    <div style={{marginTop:10,borderTop:`1px solid ${C.bd}`,paddingTop:8,
                      fontSize:9,color:"#9CA3AF",textAlign:"center"}}>
                      Document généré par APPLITAG · ALTEGAD · Confidentiel
                    </div>
                  </div>

                  <div style={{marginTop:10,display:"flex",gap:6}}>
                    <button style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",border:"none",
                      background:docPreview.couleur,color:"#fff"}}>
                      ⬇️ Télécharger PDF
                    </button>
                    <button style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",background:"transparent",
                      border:`1px solid ${C.bd}`,color:C.tx2}}>
                      ✉️ Envoyer par mail
                    </button>
                  </div>
                  <div style={{marginTop:6,fontSize:9,color:C.tx3,textAlign:"center"}}>
                    Le PDF sera archivé automatiquement dans le dossier concerné
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORIQUE */}
      {onglet==="historique"&&(
        <div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`,
              display:"flex",gap:12,alignItems:"center",background:"#F9FAFB"}}>
              <div style={{fontSize:12,fontWeight:700,color:C.tx,flex:1}}>
                Documents générés et archivés
              </div>
              <div style={{fontSize:10,color:C.tx3}}>Triés par date décroissante</div>
            </div>
            {DOCS_HISTORIQUE.map((doc,i)=>{
              const type = getDocType(doc.type);
              const st = STATUT_DOC[doc.statut]||STATUT_DOC.brouillon;
              return (
                <div key={doc.id} style={{
                  display:"grid",gridTemplateColumns:"36px 1fr auto",gap:10,
                  alignItems:"center",padding:"10px 14px",
                  borderBottom:i<DOCS_HISTORIQUE.length-1?`1px solid ${C.bd}`:"none",
                  background:i%2===0?"#fff":"#FAFAFA"}}>
                  <div style={{fontSize:20,textAlign:"center"}}>{type?.icon||"📄"}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{doc.ref}</div>
                    <div style={{display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,color:C.tx3}}>
                        {new Date(doc.date).toLocaleDateString("fr-FR")}
                      </span>
                      <span style={{fontSize:10,color:C.tx3}}>{type?.label||doc.type}</span>
                      <span style={{fontSize:10,color:C.tx3}}>Par {doc.auteur}</span>
                      <span style={{fontSize:10,color:C.tx3}}>{doc.taille}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
                      background:st.bg,color:st.color}}>
                      {st.icon} {st.label}
                    </span>
                    <button style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:600,
                      cursor:"pointer",fontFamily:"inherit",border:`1px solid ${C.bd}`,
                      background:"transparent",color:C.tx2}}>
                      ⬇️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats archives */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12}}>
            {[
              ["📄","Total docs",DOCS_HISTORIQUE.length+" docs","#1E5B3A"],
              ["✅","Signés",DOCS_HISTORIQUE.filter(d=>d.statut==="signé").length+" docs","#059669"],
              ["📦","Validés",DOCS_HISTORIQUE.filter(d=>d.statut==="validé"||d.statut==="émis").length+" docs","#0369A1"],
              ["🗃️","Archivés",DOCS_HISTORIQUE.filter(d=>d.statut==="archivé").length+" docs","#6B7280"],
            ].map(([ico,label,val,col])=>(
              <div key={label} style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:10,
                padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:20}}>{ico}</div>
                <div style={{fontSize:16,fontWeight:800,color:col}}>{val}</div>
                <div style={{fontSize:10,color:C.tx3}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── TERRITOIRE — DOUBLE LECTURE CARTOFOB / APPLITAG ────────────

// Données CARTOFOB simulées par territoire (source IFN / Observatoire biomasse)
const TERRITOIRES = [
  {
    id:"allier",
    nom:"Allier (03)",
    niveau:"Département",
    surfaceForestiere:175000,    // ha
    volumeSurPied:36200000,      // m³
    productionBiologique:1420000,// m³/an
    mortalite:185000,            // m³/an
    prelevements:680000,         // m³/an
    recolteBoisOeuvre:290000,    // m³/an
    recolteBoisEnergie:310000,   // m³/an
    disponibiliteFuture:145000,  // m³/an horizon 10 ans
    chaufferies:[
      {nom:"Réseau chaleur Moulins",puissance:4.2,conso:8400},
      {nom:"Chaufferie Vichy Agglo",puissance:6.8,conso:13600},
      {nom:"Chaufferie St-Amand",puissance:1.2,conso:2400},
      {nom:"Lycée agricole Moulins",puissance:0.5,conso:1000},
    ],
    bassinAppro:85,              // km rayon moyen
    refCartofob:"IFN-NFI_2022 / IGN — Observatoire de la biomasse",
    anneeRef:2022,
    dateConsultation:"2026-07-01",
  },
  {
    id:"troncon",
    nom:"EPCI Tronçais-Bocage",
    niveau:"EPCI",
    surfaceForestiere:28400,
    volumeSurPied:6800000,
    productionBiologique:218000,
    mortalite:28000,
    prelevements:94000,
    recolteBoisOeuvre:42000,
    recolteBoisEnergie:46000,
    disponibiliteFuture:22000,
    chaufferies:[
      {nom:"Chaufferie St-Amand",puissance:1.2,conso:2400},
      {nom:"École Cérilly",puissance:0.08,conso:160},
    ],
    bassinAppro:35,
    refCartofob:"IFN-NFI_2022 / IGN — Observatoire de la biomasse",
    anneeRef:2022,
    dateConsultation:"2026-07-01",
  },
];

// Données APPLITAG vérifiées terrain — pour le même territoire
const APPLITAG_TERRAIN = {
  allier:{
    parcelles:12,
    proprietairesContacates:34,
    volumesEstimes:4820,     // m³ — somme visites terrain
    contratsSignes:7,
    lotsEnCours:5,
    lotsLivres:3,
    volumesLivres:1240,      // m³ réellement livrés
    surfaceCouvertHa:118,
    periodeRef:"2025–2026",
    alertes:[
      "3 lots avec contraintes d'accès non résolues",
      "2 propriétaires sans réponse depuis 60 jours",
    ],
  },
  troncon:{
    parcelles:4,
    proprietairesContacates:11,
    volumesEstimes:1380,
    contratsSignes:3,
    lotsEnCours:2,
    lotsLivres:1,
    volumesLivres:490,
    surfaceCouvertHa:36,
    periodeRef:"2025–2026",
    alertes:[],
  },
};

const INDICATEURS_CARTOFOB = [
  {id:"surface",      icon:"🌲", label:"Surface forestière",  unite:"ha",    fmt:v=>v.toLocaleString("fr-FR"), key:"surfaceForestiere"},
  {id:"volume",       icon:"📦", label:"Volume sur pied",     unite:"m³",    fmt:v=>`${(v/1000000).toFixed(1)} Mm³`, key:"volumeSurPied"},
  {id:"production",   icon:"📈", label:"Production biologique",unite:"m³/an",fmt:v=>v.toLocaleString("fr-FR"), key:"productionBiologique"},
  {id:"mortalite",    icon:"💀", label:"Mortalité",           unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"mortalite"},
  {id:"prelevements", icon:"🪓", label:"Prélèvements totaux", unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"prelevements"},
  {id:"bo",           icon:"🪵", label:"Récolte bois d'œuvre",unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"recolteBoisOeuvre"},
  {id:"be",           icon:"🔥", label:"Récolte bois énergie",unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"recolteBoisEnergie"},
  {id:"dispo",        icon:"🔮", label:"Disponibilité future",unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"disponibiliteFuture",
   note:"Horizon 10 ans — estimation prospective, non commerciale"},
];

export const SectionTerritoire = () => {
  const [territoireId, setTerritoireId] = useState("allier");
  const [couche, setCouche] = useState("comparaison"); // cartofob | applitag | comparaison
  const T = TERRITOIRES.find(t=>t.id===territoireId);
  const A = APPLITAG_TERRAIN[territoireId];

  const tauxCouvertureParcelles = T ? Math.round(A.surfaceCouvertHa/T.surfaceForestiere*100*10)/10 : 0;
  const tauxVolumeSecu = T ? Math.round(A.volumesLivres/T.recolteBoisEnergie*100*10)/10 : 0;

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>🗺️ Double lecture territoire</div>
        <div style={{fontSize:13,color:C.tx2}}>
          Données publiques CARTOFOB · Données terrain APPLITAG · Ne pas confondre les deux registres
        </div>
      </div>

      {/* Bannière épistémique — non masquable */}
      <div style={{background:"#FFFBEB",border:"2px solid #F59E0B",borderRadius:12,
        padding:"12px 16px",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:6}}>
          ⚠️ Précautions d'usage obligatoires
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,color:"#78350F"}}>
          {[
            "Ne pas présenter une disponibilité statistique comme un volume commercial disponible",
            "Toujours indiquer la source, l'année de référence et le niveau géographique",
            "Ne pas mélanger estimation prospective et mesure terrain vérifiée",
            "Toute donnée publique doit être confirmée par qualification terrain avant intégration au plan d'approvisionnement",
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",
              padding:"6px 8px",background:"rgba(245,158,11,.1)",borderRadius:6}}>
              <span style={{flexShrink:0,color:"#D97706"}}>•</span>
              <span style={{lineHeight:1.4}}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sélecteur territoire + vue */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        flexWrap:"wrap",gap:10,marginBottom:16}}>
        <div style={{display:"flex",gap:6}}>
          {TERRITOIRES.map(t=>(
            <button key={t.id} onClick={()=>setTerritoireId(t.id)}
              style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,
                cursor:"pointer",fontFamily:"inherit",
                border:`1px solid ${territoireId===t.id?"#1E5B3A":C.bd}`,
                background:territoireId===t.id?"#1E5B3A":"transparent",
                color:territoireId===t.id?"#fff":C.tx2}}>
              📍 {t.nom}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:4}}>
          {[
            ["comparaison","⚖️ Comparaison"],
            ["cartofob","🛰️ CARTOFOB"],
            ["applitag","🌲 APPLITAG terrain"],
          ].map(([v,l])=>(
            <button key={v} onClick={()=>setCouche(v)}
              style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,
                cursor:"pointer",fontFamily:"inherit",
                border:`1px solid ${couche===v?( v==="cartofob"?"#6B7280":v==="applitag"?"#1E5B3A":"#7C3AED"):C.bd}`,
                background:couche===v?(v==="cartofob"?"#6B7280":v==="applitag"?"#1E5B3A":"#7C3AED"):"transparent",
                color:couche===v?"#fff":C.tx2}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Source CARTOFOB — toujours visible */}
      <div style={{background:"#F3F4F6",border:"1px solid #D1D5DB",borderRadius:8,
        padding:"7px 12px",marginBottom:14,display:"flex",gap:16,flexWrap:"wrap",fontSize:10,color:"#6B7280"}}>
        <span>🛰️ Source : <strong style={{color:"#374151"}}>{T.refCartofob}</strong></span>
        <span>📅 Année de référence : <strong style={{color:"#374151"}}>{T.anneeRef}</strong></span>
        <span>🗓️ Consulté le : <strong style={{color:"#374151"}}>{new Date(T.dateConsultation).toLocaleDateString("fr-FR")}</strong></span>
        <span>📐 Niveau : <strong style={{color:"#374151"}}>{T.niveau}</strong></span>
      </div>

      {/* VUE COMPARAISON */}
      {couche==="comparaison"&&(
        <div>
          {/* KPIs de mise en regard */}
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,marginBottom:16,alignItems:"stretch"}}>

            {/* Colonne CARTOFOB */}
            <div style={{background:"#F9FAFB",border:"2px solid #9CA3AF",borderRadius:14,overflow:"hidden"}}>
              <div style={{background:"#6B7280",color:"#fff",padding:"10px 14px",fontSize:12,fontWeight:700}}>
                🛰️ Données publiques CARTOFOB
                <div style={{fontSize:9,fontWeight:400,opacity:.8,marginTop:2}}>
                  Statistiques territoriales — {T.anneeRef} — {T.niveau}
                </div>
              </div>
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {[
                  ["Surface forestière",T.surfaceForestiere.toLocaleString("fr-FR")+" ha","🌲"],
                  ["Production biologique",T.productionBiologique.toLocaleString("fr-FR")+" m³/an","📈"],
                  ["Récolte bois énergie",T.recolteBoisEnergie.toLocaleString("fr-FR")+" m³/an","🔥"],
                  ["Disponibilité future *",T.disponibiliteFuture.toLocaleString("fr-FR")+" m³/an","🔮"],
                  ["Mortalité",T.mortalite.toLocaleString("fr-FR")+" m³/an","💀"],
                ].map(([k,v,ico])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"6px 8px",borderRadius:7,background:"#fff",border:"1px solid #E5E7EB",fontSize:11}}>
                    <span style={{color:"#6B7280"}}>{ico} {k}</span>
                    <span style={{fontWeight:700,color:"#374151"}}>{v}</span>
                  </div>
                ))}
                <div style={{fontSize:9,color:"#9CA3AF",fontStyle:"italic",marginTop:4,lineHeight:1.4}}>
                  * Estimation prospective horizon 10 ans — non commercialisable en l'état
                </div>
              </div>
            </div>

            {/* Séparateur avec ratio */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",gap:8,padding:"0 8px"}}>
              <div style={{width:2,flex:1,background:"linear-gradient(to bottom,#E5E7EB,#7C3AED,#E5E7EB)"}}/>
              <div style={{background:"#7C3AED",color:"#fff",borderRadius:8,padding:"8px 10px",
                textAlign:"center",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                <div style={{fontSize:18,fontWeight:900}}>{tauxCouvertureParcelles}%</div>
                <div style={{fontSize:9,opacity:.85}}>surface</div>
                <div style={{fontSize:9,opacity:.85}}>couverte</div>
              </div>
              <div style={{width:2,flex:1,background:"linear-gradient(to bottom,#E5E7EB,#7C3AED,#E5E7EB)"}}/>
            </div>

            {/* Colonne APPLITAG */}
            <div style={{background:"#F0FDF4",border:"2px solid #1E5B3A",borderRadius:14,overflow:"hidden"}}>
              <div style={{background:"#1E5B3A",color:"#fff",padding:"10px 14px",fontSize:12,fontWeight:700}}>
                🌲 Données terrain APPLITAG
                <div style={{fontSize:9,fontWeight:400,opacity:.8,marginTop:2}}>
                  Mesures vérifiées · {A.periodeRef} · Opérationnel
                </div>
              </div>
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {[
                  ["Parcelles identifiées",A.parcelles+" lots","🗂️"],
                  ["Propriétaires contactés",A.proprietairesContacates+" personnes","👥"],
                  ["Volume estimé terrain",A.volumesEstimes.toLocaleString("fr-FR")+" m³","📐"],
                  ["Contrats signés",A.contratsSignes+" lots","✅"],
                  ["Volume réellement livré",A.volumesLivres.toLocaleString("fr-FR")+" m³","📦"],
                ].map(([k,v,ico])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"6px 8px",borderRadius:7,background:"#fff",border:"1px solid #BBF7D0",fontSize:11}}>
                    <span style={{color:"#065F46"}}>{ico} {k}</span>
                    <span style={{fontWeight:700,color:"#064E3B"}}>{v}</span>
                  </div>
                ))}
                <div style={{fontSize:9,color:"#047857",fontStyle:"italic",marginTop:4,lineHeight:1.4}}>
                  Données vérifiées par visite terrain — intégrables au plan d'approvisionnement
                </div>
              </div>
            </div>
          </div>

          {/* Ratio volume sécurisé */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
              Volume bois énergie : potentiel statistique vs volume sécurisé APPLITAG
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{fontSize:11,color:"#6B7280",whiteSpace:"nowrap",width:160}}>
                🛰️ Récolte BE territoire
              </div>
              <div style={{flex:1,height:20,borderRadius:10,background:"#E5E7EB",overflow:"hidden",position:"relative"}}>
                <div style={{height:"100%",width:"100%",background:"#D1D5DB",borderRadius:10}}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                  paddingLeft:8,fontSize:10,color:"#6B7280",fontWeight:600}}>
                  {T.recolteBoisEnergie.toLocaleString("fr-FR")} m³/an (statistique {T.anneeRef})
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{fontSize:11,color:"#065F46",whiteSpace:"nowrap",width:160}}>
                🌲 Livré APPLITAG
              </div>
              <div style={{flex:1,height:20,borderRadius:10,background:"#E5E7EB",overflow:"hidden",position:"relative"}}>
                <div style={{height:"100%",borderRadius:10,background:"#1E5B3A",
                  width:`${Math.min(tauxVolumeSecu,100)}%`}}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                  paddingLeft:8,fontSize:10,color:"#fff",fontWeight:700}}>
                  {A.volumesLivres.toLocaleString("fr-FR")} m³ ({tauxVolumeSecu}% du stat.)
                </div>
              </div>
            </div>
            <div style={{marginTop:8,padding:"8px 10px",background:"#FFFBEB",borderRadius:7,
              fontSize:10,color:"#92400E",lineHeight:1.5}}>
              ⚠️ Le volume livré APPLITAG représente <strong>{tauxVolumeSecu}%</strong> de la récolte statistique territoriale.
              Cet écart reflète les contraintes de desserte, propriété, qualité et concurrence locale — pas un manque de ressource.
            </div>
          </div>

          {/* Chaufferies locales */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
              🔥 Chaufferies et bassins d'approvisionnement — {T.nom}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {T.chaufferies.map(ch=>(
                <div key={ch.nom} style={{background:"#FEF3C7",borderRadius:8,
                  border:"1px solid #FCD34D",padding:"10px 12px",fontSize:11}}>
                  <div style={{fontWeight:700,color:"#92400E",marginBottom:4}}>{ch.nom}</div>
                  <div style={{display:"flex",justifyContent:"space-between",color:"#B45309"}}>
                    <span>Puissance : {ch.puissance} MW</span>
                    <span>Conso. : {ch.conso.toLocaleString("fr-FR")} t/an</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:8,fontSize:10,color:C.tx2}}>
              Rayon moyen bassin d'approvisionnement : {T.bassinAppro} km
              <span style={{marginLeft:8,color:"#6B7280"}}>Source : CARTOFOB {T.anneeRef}</span>
            </div>
          </div>
        </div>
      )}

      {/* VUE CARTOFOB SEULE */}
      {couche==="cartofob"&&(
        <div>
          <div style={{background:"#F9FAFB",border:"2px solid #9CA3AF",borderRadius:14,
            padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:18}}>🛰️</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#374151"}}>CARTOFOB — {T.nom}</div>
                <div style={{fontSize:10,color:"#9CA3AF"}}>
                  {T.refCartofob} · Réf. {T.anneeRef} · Consulté {new Date(T.dateConsultation).toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {INDICATEURS_CARTOFOB.map(ind=>(
                <div key={ind.id} style={{background:"#fff",borderRadius:8,border:"1px solid #E5E7EB",
                  padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:"#9CA3AF",marginBottom:2}}>
                    {ind.icon} {ind.label} <span style={{fontSize:9}}>({ind.unite})</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:800,color:"#374151"}}>
                    {ind.fmt(T[ind.key])}
                  </div>
                  {ind.note&&(
                    <div style={{fontSize:9,color:"#EF4444",marginTop:2,fontStyle:"italic"}}>{ind.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{background:"#FEF9C3",border:"1px solid #FDE047",borderRadius:8,
            padding:"10px 14px",fontSize:11,color:"#713F12",lineHeight:1.5}}>
            <strong>Rappel :</strong> Ces données sont des statistiques d'inventaire et de modélisation à l'échelle {T.niveau.toLowerCase()}.
            Elles ne constituent pas une offre de bois disponible à la vente. Elles doivent être confirmées par une prospection terrain avant toute intégration dans un plan d'approvisionnement.
          </div>
        </div>
      )}

      {/* VUE APPLITAG SEULE */}
      {couche==="applitag"&&(
        <div>
          <div style={{background:"#F0FDF4",border:"2px solid #1E5B3A",borderRadius:14,
            padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:18}}>🌲</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#065F46"}}>APPLITAG — Données terrain vérifiées</div>
                <div style={{fontSize:10,color:"#047857"}}>{T.nom} · {A.periodeRef} · Opérationnel</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[
                {icon:"🗂️",label:"Parcelles identifiées",val:A.parcelles},
                {icon:"👥",label:"Propriétaires contactés",val:A.proprietairesContacates},
                {icon:"📐",label:"Surface couverte",val:`${A.surfaceCouvertHa} ha`},
                {icon:"📋",label:"Volumes estimés terrain",val:`${A.volumesEstimes.toLocaleString("fr-FR")} m³`},
                {icon:"✅",label:"Contrats signés",val:`${A.contratsSignes} lots`},
                {icon:"📦",label:"Volume réellement livré",val:`${A.volumesLivres.toLocaleString("fr-FR")} m³`},
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:8,border:"1px solid #BBF7D0",
                  padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:18}}>{k.icon}</div>
                  <div style={{fontSize:16,fontWeight:800,color:"#065F46"}}>{k.val}</div>
                  <div style={{fontSize:10,color:"#047857",lineHeight:1.3}}>{k.label}</div>
                </div>
              ))}
            </div>

            {A.alertes.length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#92400E",marginBottom:6}}>⚠️ Points d'attention</div>
                {A.alertes.map((al,i)=>(
                  <div key={i} style={{fontSize:11,padding:"6px 10px",background:"#FEF3C7",
                    borderRadius:6,border:"1px solid #FCD34D",color:"#92400E",marginBottom:5}}>
                    {al}
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:8,padding:"8px 10px",background:"#D1FAE5",borderRadius:7,
              fontSize:10,color:"#065F46",lineHeight:1.5,border:"1px solid #6EE7B7"}}>
              ✅ Ces données sont issues de visites terrain géolocalisées, de contrats signés et de bons de livraison vérifiés.
              Elles peuvent être intégrées directement dans un plan d'approvisionnement.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── PLANNING ADMIN ─────────────────────────────────────────────
/* ═══════════════════════════════════════════════════════════════
   HUB ALERTES — agrégateur cross-modules
═══════════════════════════════════════════════════════════════ */
export const HubAlertes = ({contacts=[], livraisons=[], onGoTo}) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);

  // ── Collecte des signaux depuis chaque module ─────────────────
  const alertes = useMemo(()=>{
    const arr = [];

    // 1. Anomalies voiries urgentes non traitées
    signalementsGet().filter(s=>s.urgence==="rouge"&&s.statut==="ouvert").forEach(s=>{
      arr.push({
        id:"sg_"+s.id, gravite:0, source:"Voiries", sourceIcon:"🚧",
        titre:"Accès bloqué — "+( s.tronconNom||s.commune||"Tronçon"),
        detail: s.commentaire||(s.auteur+" · "+( s.commune||"")),
        date: s.createdAt?.slice(0,10)||todayStr,
        action:"Voir anomalie", goTo:"applitag_data",
      });
    });

    // 2. Permis chantier expirés ou expirant aujourd'hui
    permisLocalGet().filter(p=>p.date&&p.date<=todayStr&&p.statut!=="cloture").forEach(p=>{
      const expired = p.date < todayStr;
      arr.push({
        id:"pm_"+p.id, gravite: expired?1:2, source:"Permis chantier", sourceIcon:"🔥",
        titre:(expired?"Permis expiré — ":"Permis expire aujourd'hui — ")+(p.chantier||p.commune||""),
        detail:"Niveau risque "+( p.niveauRisque||"?")+" · Commune : "+(p.commune||"—"),
        date: p.date,
        action:"Voir permis", goTo:"permis_incendie",
      });
    });

    // 3. Lots sans transport depuis plus de 14 jours
    contacts.filter(c=>c.statutLot==="VALIDE_EXPLOITATION"||c.statutLot==="EN_COURS_EXPLOITATION").forEach(c=>{
      const lastUpdate = new Date(c.updatedAt||c.createdAt||0);
      const joursEcoules = Math.floor((today-lastUpdate)/(1000*60*60*24));
      if (joursEcoules > 14) arr.push({
        id:"lot_"+c.id, gravite:2, source:"Lots", sourceIcon:"🌲",
        titre:"Lot en exploitation sans activité depuis "+joursEcoules+" j",
        detail:(c.lotNumero||"LOT")+" · "+(c.commune||"")+" · "+(c.entrepriseEtf||"ETF"),
        date: lastUpdate.toISOString().slice(0,10),
        action:"Ouvrir le lot", goTo:"lots",
      });
    });

    // 4. Livraisons avec humidité hors seuil RED (>25%)
    livraisons.filter(l=>l.humidite&&parseFloat(l.humidite)>25).forEach(l=>{
      arr.push({
        id:"liv_"+l.id, gravite:2, source:"Conformité RED", sourceIcon:"🇪🇺",
        titre:"Humidité hors seuil RED — "+(l.numeroBL||"BL"),
        detail:`${l.humidite}% mesuré · Seuil RED : 25% · ${l.nomDestination||""}`,
        date: (l.date||l.createdAt||"").slice(0,10),
        action:"Voir conformité", goTo:"conformite_red",
      });
    });

    // 5. Anomalies voiries orange non traitées depuis +7 jours
    const il7a = new Date(today); il7a.setDate(il7a.getDate()-7);
    signalementsGet().filter(s=>s.urgence==="orange"&&s.statut==="ouvert"&&s.createdAt<il7a.toISOString()).forEach(s=>{
      arr.push({
        id:"sgo_"+s.id, gravite:3, source:"Voiries", sourceIcon:"🚧",
        titre:"Dégradation non traitée depuis +7 j — "+(s.tronconNom||s.commune||""),
        detail: s.commentaire||(s.auteur+" · "+(s.commune||"")),
        date: s.createdAt?.slice(0,10)||todayStr,
        action:"Voir anomalie", goTo:"applitag_data",
      });
    });

    return arr.sort((a,b)=>a.gravite-b.gravite);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[contacts,livraisons]); // today/todayStr : new Date() à chaque render — les ajouter invaliderait le memo

  const GRAVITE = [
    {label:"Bloquant",  bg:"#FEE2E2", col:"#991B1B", dot:"#EF4444"},
    {label:"Urgent",    bg:"#FFEDD5", col:"#C2410C", dot:"#F97316"},
    {label:"Important", bg:"#FEF3C7", col:"#92400E", dot:"#F59E0B"},
    {label:"Attention", bg:"#DBEAFE", col:"#1E3A5F", dot:"#3B82F6"},
  ];

  return (
    <div>
      {/* Bandeau résumé */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:16}}>
        {[
          {label:"Bloquant",  n:alertes.filter(a=>a.gravite===0).length, col:"#991B1B", bg:"#FEE2E2"},
          {label:"Urgent",    n:alertes.filter(a=>a.gravite===1).length, col:"#C2410C", bg:"#FFEDD5"},
          {label:"Important", n:alertes.filter(a=>a.gravite===2).length, col:"#92400E", bg:"#FEF3C7"},
          {label:"Total",     n:alertes.length, col:"#1E3A5F", bg:"#DBEAFE"},
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
            <div style={{fontSize:28,fontWeight:800,color:s.col}}>{s.n}</div>
            <div style={{fontSize:11,fontWeight:700,color:s.col,opacity:.8}}>{s.label}</div>
          </div>
        ))}
      </div>

      {alertes.length===0 && (
        <div style={{background:C.bg2,borderRadius:14,padding:40,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:8}}>✅</div>
          <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Aucune alerte active</div>
          <div style={{fontSize:13,color:C.tx2}}>Tous les modules sont en ordre. Bonne journée !</div>
        </div>
      )}

      {alertes.map(a=>{
        const g = GRAVITE[a.gravite]||GRAVITE[3];
        return (
          <div key={a.id} style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:12,
            padding:"14px 16px",marginBottom:10,display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:g.dot,flexShrink:0,marginTop:5}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,
                  background:g.bg,color:g.col}}>{g.label}</span>
                <span style={{fontSize:11,color:C.tx3}}>{a.sourceIcon} {a.source}</span>
                <span style={{fontSize:11,color:C.tx3,marginLeft:"auto"}}>{a.date}</span>
              </div>
              <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:2}}>{a.titre}</div>
              <div style={{fontSize:12,color:C.tx2}}>{a.detail}</div>
            </div>
            <button onClick={()=>onGoTo(a.goTo)} style={{
              flexShrink:0,height:34,borderRadius:8,border:`1px solid ${C.bd}`,
              padding:"0 12px",fontSize:11,fontWeight:700,cursor:"pointer",
              background:C.bg,color:C.tx,whiteSpace:"nowrap"}}>
              {a.action} →
            </button>
          </div>
        );
      })}
    </div>
  );
};

const PLANNING_TYPES = {
  visite_terrain:   {label:"Visite terrain",   color:"#1E5B3A", bg:"#E8F5E9", icon:"🔭"},
  date_limite:      {label:"Date limite",      color:"#B91C1C", bg:"#FEE2E2", icon:"⏰"},
  transport:        {label:"Transport",        color:"#6D28D9", bg:"#EDE9FE", icon:"🚛"},
  livraison:        {label:"Livraison",        color:"#0369A1", bg:"#E0F2FE", icon:"📦"},
  dechiquetage:     {label:"Déchiquetage",     color:"#92400E", bg:"#FEF3C7", icon:"🌀"},
  exploitation:     {label:"Exploitation",     color:"#065F46", bg:"#D1FAE5", icon:"🪓"},
  replantation:     {label:"Replantation",     color:"#166534", bg:"#DCFCE7", icon:"🌱"},
  permis_incendie:  {label:"Permis chantier",  color:"#991B1B", bg:"#FEE2E2", icon:"🔥"},
  restriction_feu:  {label:"Restriction feu",  color:"#7F1D1D", bg:"#FEE2E2", icon:"🚫🔥"},
  anomalie_urgente: {label:"Anomalie voirie",  color:"#C2410C", bg:"#FFEDD5", icon:"🚧"},
};

const buildPlanningEvents = (contacts, visites, transports, livraisons) => {
  const events = [];

  // ── Permis chantier incendie ──────────────────────────────────
  permisLocalGet().forEach(p => {
    if (p.date) events.push({
      date: p.date, type: "permis_incendie",
      titre: `Permis chantier — ${p.chantier||p.commune||"Chantier"}`,
      sous: `${p.commune||""} · Niveau ${p.niveauRisque||"?"}`,
      lotNumero: null, lotId: null,
    });
    // Si restriction active ce jour-là
    if (p.restrictionActive && p.date) events.push({
      date: p.date, type: "restriction_feu",
      titre: `🚫 Restriction feu — ${p.commune||""}`,
      sous: p.mesures||"Vérifier arrêté préfectoral",
      lotNumero: null, lotId: null,
    });
  });

  // ── Anomalies voiries urgentes (rouge) ───────────────────────
  signalementsGet().filter(s => s.urgence === "rouge" && s.statut === "ouvert").forEach(s => {
    if (s.createdAt) events.push({
      date: s.createdAt.slice(0,10), type: "anomalie_urgente",
      titre: `🚧 Voirie bloquée — ${s.tronconNom||s.commune||"Tronçon"}`,
      sous: `${s.auteur||""} · ${s.commune||""}`,
      lotNumero: null, lotId: null,
    });
  });
  contacts.forEach(c=>{
    if (c.dateLimite) events.push({
      date:c.dateLimite, type:"date_limite",
      titre:`Date limite — ${c.lotNumero||c.nom}`,
      sous:`${c.commune||""} · ${c.nom||""} ${c.prenom||""}`,
      lotNumero:c.lotNumero, lotId:c.id,
    });
    if (c.dateVisitePrevue) events.push({
      date:c.dateVisitePrevue, type:"visite_terrain",
      titre:`Visite prévue — ${c.lotNumero||c.nom}`,
      sous:`${c.commune||""} · ${c.nom||""} ${c.prenom||""}`,
      lotNumero:c.lotNumero, lotId:c.id,
    });
    if (c.statutLot==="EN_COURS_EXPLOITATION"||c.statutLot==="VALIDE_EXPLOITATION") {
      const dateRef = c.dateDebutExploitation||c.updatedAt||c.createdAt;
      if (dateRef) events.push({
        date:dateRef.slice(0,10), type:"exploitation",
        titre:`Exploitation en cours — ${c.lotNumero}`,
        sous:`${c.commune||""} · ${c.entrepriseEtf||"ETF"}`,
        lotNumero:c.lotNumero, lotId:c.id,
      });
    }
  });
  visites.forEach(v=>{
    if (v.date) events.push({
      date:v.date, type:"visite_terrain",
      titre:`Visite terrain — ${v.lotNumero||""}`,
      sous:`${v.commune||""} · ${v.mandataire||""}`,
      lotNumero:v.lotNumero, lotId:v.lotId,
      heure:null,
    });
    if (v.dateLimite) events.push({
      date:v.dateLimite, type:"date_limite",
      titre:`Échéance — ${v.lotNumero||""}`,
      sous:`${v.commune||""}`,
      lotNumero:v.lotNumero, lotId:v.lotId,
    });
    if (v.replantation==="oui"&&v.dateReplant) events.push({
      date:v.dateReplant, type:"replantation",
      titre:`Replantation — ${v.lotNumero||""}`,
      sous:`${v.essenceReplanT||""} · ${v.surfaceReplant?v.surfaceReplant+" ha":""}`,
      lotNumero:v.lotNumero, lotId:v.lotId,
    });
  });
  transports.forEach(t=>{
    const dateStr = t.heureDebut ? t.heureDebut.slice(0,10) : t.createdAt?.slice(0,10);
    if (!dateStr) return;
    const heure = t.heureDebut?.slice(11,16)||null;
    events.push({
      date:dateStr, type:"transport", heure,
      titre:`Transport — ${t.numeroCMR||""}`,
      sous:`${t.immatTracteur||""} · ${t.nomDestination||""}`,
      lotNumero:t.lotNumero, lotId:t.lotId,
      enCours: t.statut==="EN_LIVRAISON",
    });
  });
  livraisons.forEach(l=>{
    const dateStr = (l.date||l.createdAt||"").slice(0,10);
    if (!dateStr) return;
    const heure = l.date?.slice(11,16)||null;
    events.push({
      date:dateStr, type:"livraison", heure,
      titre:`Livraison — ${l.numeroBL||"BL"}`,
      sous:`${(l.poidsNet||l.poidsBrut)?(l.poidsNet||l.poidsBrut)+" t · ":""}${l.nomDestination||""}`,
      lotNumero:l.lotNumero, lotId:l.lotId,
    });
  });
  return events.sort((a,b)=>(a.date+""+(a.heure||""))>"" ? a.date.localeCompare(b.date) : 0);
};

export const SectionPlanning = ({contacts=[], visites=[], transports=[], livraisons=[], onSelectLot}) => {
  const [now, setNow] = useState(new Date());
  const [moisOffset, setMoisOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(()=>{
    const timer = setInterval(()=>setNow(new Date()), 60000);
    return ()=>clearInterval(timer);
  },[]);

  const events = useMemo(()=>buildPlanningEvents(contacts,visites,transports,livraisons),[contacts,visites,transports,livraisons]);

  const viewDate = new Date(now.getFullYear(), now.getMonth()+moisOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const nbJours = new Date(viewYear, viewMonth+1, 0).getDate();
  const premierJour = (viewDate.getDay()+6)%7; // lundi=0
  const todayStr = now.toISOString().slice(0,10);
  const moisLabel = viewDate.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});

  const eventsByDay = {};
  events.forEach(e=>{
    if (!e.date) return;
    const d = e.date.slice(0,10);
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  // Événements du jour sélectionné ou d'aujourd'hui
  const focusDay = selectedDay || todayStr;
  const focusEvents = eventsByDay[focusDay]||[];

  // Événements des 7 prochains jours
  const upcomingDates = Array.from({length:8},(_,i)=>{
    const d = new Date(now); d.setDate(d.getDate()+i);
    return d.toISOString().slice(0,10);
  });
  const upcomingEvents = events.filter(e=>upcomingDates.includes(e.date?.slice(0,10)));

  const dayStr = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,height:"calc(100dvh - 120px)"}}>
      {/* Calendrier */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Navigation mois */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 20px",borderBottom:`1px solid ${C.bd}`}}>
          <button onClick={()=>setMoisOffset(o=>o-1)} style={{background:C.bg2,border:"none",
            width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,color:C.tx}}>‹</button>
          <div style={{fontSize:16,fontWeight:700,fontFamily:FONT_TITLE,textTransform:"capitalize",color:C.tx}}>
            {moisLabel}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{setMoisOffset(0);setSelectedDay(todayStr);}} style={{
              background:C.greenL,border:"none",borderRadius:8,cursor:"pointer",
              fontSize:12,fontWeight:600,color:C.greenD,padding:"4px 10px"}}>Aujourd'hui</button>
            <button onClick={()=>setMoisOffset(o=>o+1)} style={{background:C.bg2,border:"none",
              width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,color:C.tx}}>›</button>
          </div>
        </div>

        {/* En-têtes jours */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",
          padding:"8px 16px 0",gap:2}}>
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(j=>(
            <div key={j} style={{textAlign:"center",fontSize:11,fontWeight:600,
              color:C.tx3,paddingBottom:6}}>{j}</div>
          ))}
        </div>

        {/* Grille jours */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",
          padding:"0 16px 16px",gap:2,flex:1,overflowY:"auto"}}>
          {/* Cases vides avant le 1er */}
          {Array.from({length:premierJour},(_,i)=>(
            <div key={`e${i}`}/>
          ))}
          {/* Jours du mois */}
          {Array.from({length:nbJours},(_,i)=>{
            const d = i+1;
            const ds = dayStr(viewYear,viewMonth,d);
            const isToday = ds===todayStr;
            const isSel = ds===selectedDay;
            const dayEvts = eventsByDay[ds]||[];
            const hasPast = ds<todayStr;
            return (
              <div key={d} onClick={()=>setSelectedDay(ds===selectedDay?null:ds)}
                style={{minHeight:70,borderRadius:8,padding:"6px 4px",cursor:"pointer",
                  border:`2px solid ${isSel?C.green:isToday?"#4CAF50":"transparent"}`,
                  background:isSel?C.greenL:isToday?"#F0FDF4":hasPast&&dayEvts.length===0?"#FAFAFA":"#fff",
                  transition:"background .12s"}}>
                <div style={{fontSize:12,fontWeight:isToday?700:400,
                  color:isToday?C.greenD:hasPast?C.tx3:C.tx,marginBottom:3,textAlign:"center"}}>
                  {d}
                </div>
                {dayEvts.slice(0,3).map((ev,ei)=>{
                  const t = PLANNING_TYPES[ev.type]||PLANNING_TYPES.visite_terrain;
                  return (
                    <div key={ei} style={{fontSize:9,fontWeight:600,color:t.color,
                      background:t.bg,borderRadius:4,padding:"1px 4px",
                      marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {t.icon} {ev.titre.split("—")[1]?.trim()||ev.titre}
                    </div>
                  );
                })}
                {dayEvts.length>3&&(
                  <div style={{fontSize:9,color:C.tx3,textAlign:"center"}}>+{dayEvts.length-3}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Légende */}
        <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"10px 20px",
          borderTop:`1px solid ${C.bd}`,background:C.bg}}>
          {Object.entries(PLANNING_TYPES).map(([k,t])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}>
              <span style={{display:"inline-block",width:10,height:10,borderRadius:3,
                background:t.bg,border:`1px solid ${t.color}`}}/>
              <span style={{color:C.tx3}}>{t.icon} {t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau latéral */}
      <div style={{display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>
        {/* Horloge + mise à jour */}
        <div style={{background:C.greenD,color:"#fff",borderRadius:14,padding:"14px 18px",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:28,fontWeight:700,fontFamily:"monospace",letterSpacing:2}}>
              {now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
            </div>
            <div style={{fontSize:12,opacity:.8,marginTop:2}}>
              {now.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
            </div>
          </div>
          <div style={{textAlign:"right",fontSize:10,opacity:.7}}>
            <div>🔄 Mise à jour</div>
            <div>toutes les minutes</div>
          </div>
        </div>

        {/* Événements du jour sélectionné */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`,
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.tx}}>
              {focusDay===todayStr?"Aujourd'hui":new Date(focusDay+"T12:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
            </div>
            <span style={{fontSize:11,color:C.tx3}}>{focusEvents.length} événement{focusEvents.length!==1?"s":""}</span>
          </div>
          {focusEvents.length===0 ? (
            <div style={{padding:14,color:C.tx3,fontSize:12,textAlign:"center"}}>Aucun événement</div>
          ) : focusEvents.map((ev,i)=>{
            const t = PLANNING_TYPES[ev.type]||PLANNING_TYPES.visite_terrain;
            return (
              <div key={i} onClick={()=>ev.lotId&&onSelectLot&&onSelectLot(ev.lotId)}
                style={{padding:"10px 14px",borderBottom:i<focusEvents.length-1?`1px solid ${C.bd}`:"none",
                  cursor:ev.lotId?"pointer":"default",
                  background:ev.enCours?"#FEF9F0":"#fff",
                  transition:"background .1s"}}
                onMouseEnter={e=>{ if(ev.lotId) e.currentTarget.style.background=t.bg; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=ev.enCours?"#FEF9F0":"#fff"; }}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{t.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.tx,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {ev.titre}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:1}}>{ev.sous}</div>
                    {ev.heure&&(
                      <div style={{fontSize:10,color:t.color,fontWeight:600,marginTop:2}}>🕐 {ev.heure}</div>
                    )}
                  </div>
                  {ev.enCours&&(
                    <span style={{fontSize:9,background:C.amber,color:"#fff",
                      borderRadius:4,padding:"2px 6px",fontWeight:700,flexShrink:0}}>EN COURS</span>
                  )}
                  {ev.lotNumero&&(
                    <span style={{fontSize:9,fontFamily:"monospace",color:C.greenD,flexShrink:0}}>{ev.lotNumero}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 7 prochains jours */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.tx}}>Prochains 7 jours</div>
          </div>
          {upcomingEvents.length===0 ? (
            <div style={{padding:14,color:C.tx3,fontSize:12,textAlign:"center"}}>Aucun événement à venir</div>
          ) : upcomingDates.slice(1).map(ds=>{
            const evs = eventsByDay[ds]||[];
            if (evs.length===0) return null;
            const label = new Date(ds+"T12:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"});
            return (
              <div key={ds} style={{borderBottom:`1px solid ${C.bd}`}}>
                <div style={{padding:"6px 14px",background:C.bg,fontSize:10,
                  fontWeight:700,color:C.tx2,textTransform:"capitalize"}}>{label}</div>
                {evs.map((ev,i)=>{
                  const t = PLANNING_TYPES[ev.type]||PLANNING_TYPES.visite_terrain;
                  return (
                    <div key={i} onClick={()=>ev.lotId&&onSelectLot&&onSelectLot(ev.lotId)}
                      style={{padding:"7px 14px",display:"flex",alignItems:"center",gap:8,
                        cursor:ev.lotId?"pointer":"default",
                        borderBottom:i<evs.length-1?`1px solid ${C.bd}`:"none"}}
                      onMouseEnter={e=>{ if(ev.lotId) e.currentTarget.style.background=t.bg; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background="#fff"; }}>
                      <span style={{fontSize:13}}>{t.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:600,color:C.tx,
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.titre}</div>
                        <div style={{fontSize:10,color:C.tx3}}>{ev.sous}</div>
                      </div>
                      {ev.heure&&<span style={{fontSize:10,color:t.color,fontWeight:600,flexShrink:0}}>{ev.heure}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
