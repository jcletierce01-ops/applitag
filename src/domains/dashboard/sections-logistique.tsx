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
