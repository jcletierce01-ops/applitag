// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { C, FONT_TITLE } from "../../design-system/tokens.js";

// Dupliqué depuis sections.tsx — utilisé par HubAlertes + SectionPlanning
const SIGNALEMENTS_KEY = "applitag_signalements_desserte";
const signalementsGet = () => { try { return JSON.parse(localStorage.getItem(SIGNALEMENTS_KEY)||"[]"); } catch { return []; } };

// Dupliqué depuis sections.tsx — utilisé par HubAlertes + SectionPlanning
const PERMIS_LOCAL_KEY = "applitag_permis_incendie";
const permisLocalGet = () => { try { return JSON.parse(localStorage.getItem(PERMIS_LOCAL_KEY)||"[]"); } catch { return []; } };

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
