// @ts-nocheck
import { useState, useRef } from "react";
import { C, FONT_TITLE, BTN_H, INPUT_H, FONT_INPUT } from "../../design-system/tokens.js";
import { DEMO_TRONCONS, PORTANCE_OPTS, ACCES_INCENDIE_OPTS, STATUT_TRONCON, TYPES_ANOMALIE, URGENCES, SOURCES_PROFIL } from "./sections-terrain-op.constants.js";

export const SectionDesserte = () => {
  const [tab,    setTab]    = useState("liste");
  const [sel,    setSel]    = useState(null);

  const _trc = sel ? DEMO_TRONCONS.find(t=>t.id===sel) : null;
  const totalTonnage = DEMO_TRONCONS.reduce((s,t)=>s+t.tonnageMobilisable,0);
  const totalCout    = DEMO_TRONCONS.reduce((s,t)=>s+t.coutProjet,0);

  const inp = (val,set,ph,type="text") => (
    <input type={type} value={val} onChange={e=>set(e.target.value)}
      placeholder={ph}
      style={{width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
        border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
        background:C.bg,color:C.tx,boxSizing:"border-box"}}/>
  );

  // ─ Formulaire nouveau tronçon ─
  const [fNom,         setFNom]         = useState("");
  const [fType,        setFType]        = useState("existant");
  const [fProp,        setFProp]        = useState("");
  const [fParcelles,   setFParcelles]   = useState("");
  const [fPortance,    setFPortance]    = useState("normale");
  const [fLargeur,     setFLargeur]     = useState("");
  const [fPente,       setFPente]       = useState("");
  const [fDepot,       setFDepot]       = useState(false);
  const [fRetour,      setFRetour]      = useState(false);
  const [fIncendie,    setFIncendie]    = useState(ACCES_INCENDIE_OPTS[0]);
  const [fTonnage,     setFTonnage]     = useState("");
  const [fVolume,      setFVolume]      = useState("");
  const [fCout,        setFCout]        = useState("");
  const [fTravaux,     setFTravaux]     = useState("");

  // ── Tracé GPS du tronçon ──
  const [tracePoints,  setTracePoints]  = useState([]); // [{lat,lng,alt,t}]
  const [traceActif,   setTraceActif]   = useState(false);
  const [traceDist,    setTraceDist]    = useState(0);   // mètres
  const [traceError,   setTraceError]   = useState(null);
  const watchIdRef = useRef(null);

  // Haversine (m) entre deux coordonnées
  const haversine = (a, b) => {
    const R=6371000, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  };

  const demarrerTrace = () => {
    if (!navigator.geolocation) { setTraceError("GPS non disponible sur cet appareil."); return; }
    setTracePoints([]); setTraceDist(0); setTraceError(null); setTraceActif(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt = {lat:pos.coords.latitude, lng:pos.coords.longitude,
          alt:pos.coords.altitude, t:Date.now()};
        setTracePoints(prev => {
          const dist = prev.length ? haversine(prev[prev.length-1], pt) : 0;
          setTraceDist(d => d + dist);
          return [...prev, pt];
        });
      },
      (err) => setTraceError("Erreur GPS : " + err.message),
      {enableHighAccuracy:true, maximumAge:0, timeout:10000}
    );
  };

  const arreterTrace = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTraceActif(false);
  };

  const ajouterPointManuel = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const pt = {lat:pos.coords.latitude, lng:pos.coords.longitude, alt:pos.coords.altitude, t:Date.now()};
      setTracePoints(prev => {
        const dist = prev.length ? haversine(prev[prev.length-1], pt) : 0;
        setTraceDist(d => d + dist);
        return [...prev, pt];
      });
    }, () => setTraceError("Impossible de récupérer la position."), {enableHighAccuracy:true});
  };

  const effacerTrace = () => {
    arreterTrace();
    setTracePoints([]); setTraceDist(0); setTraceError(null);
  };

  const distLabel = traceDist < 1000
    ? `${Math.round(traceDist)} m`
    : `${(traceDist/1000).toFixed(2)} km`;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            🛣️ Desserte forestière
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Tronçons · Portance · Mobilisation · Coûts · Accès incendie
          </div>
        </div>
        <button onClick={()=>setTab("nouveau")} style={{
          padding:"10px 18px",borderRadius:12,background:C.green,border:"none",
          color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
          WebkitTapHighlightColor:"transparent"}}>
          + Nouveau tronçon
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🛣️",l:"Tronçons",        v:DEMO_TRONCONS.length,      col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"⚖️",l:"Tonnage mobilisable",v:`${totalTonnage} t`,      col:"#065F46",bg:"#D1FAE5"},
          {ico:"📐",l:"Projets à créer",  v:DEMO_TRONCONS.filter(t=>t.type==="a_creer").length,col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"💶",l:"Coût total estimé",v:`${(totalCout/1000).toFixed(0)} k€`,col:"#B45309",bg:"#FEF3C7"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.v}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["liste","📋","Liste des tronçons"],["carte","🗺️","Vue territoire"],
          ["nouveau","➕","Nouveau tronçon"],["contraintes","⚠️","Contraintes & règles"],
          ["diagnostic","🔍","Diagnostic terrain"],["dfci","🚒","Accès pompiers & DFCI"],
          ["priorite","📊","Priorité travaux"],["signaler","🚨","Signaler"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#1E40AF":C.bd}`,
            background:tab===id?"#1E40AF":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── LISTE ── */}
      {tab==="liste"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_TRONCONS.map(t=>{
            const st = STATUT_TRONCON[t.statut]||STATUT_TRONCON.operationnel;
            const po = PORTANCE_OPTS.find(p=>p.v===t.portance)||PORTANCE_OPTS[1];
            const isOpen = sel===t.id;
            return (
              <div key={t.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${st.col}44`}}>
                <div onClick={()=>setSel(isOpen?null:t.id)}
                  style={{padding:"12px 14px",cursor:"pointer",
                    background:isOpen?st.bg+"50":"#fff",
                    display:"flex",alignItems:"center",gap:12,
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:800,padding:"2px 8px",borderRadius:10,
                        background:st.bg,color:st.col}}>{st.icon} {st.l}</span>
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,fontWeight:700,
                        background:po.bg,color:po.col}}>{po.l}</span>
                      <span style={{fontSize:10,color:C.tx3}}>
                        {t.type==="existant"?"Existant":"À créer"}
                      </span>
                    </div>
                    <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{t.nom}</div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                      {t.proprietaire} · {t.parcelles.join(", ")} · {t.largeur} m · pente {t.pentePct}%
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#1E40AF"}}>{t.tonnageMobilisable} t</div>
                    {t.coutProjet>0&&<div style={{fontSize:10,color:C.tx3}}>{t.coutProjet.toLocaleString("fr-FR")} €</div>}
                  </div>
                  <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",
                    background:"#FAFAFA",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                      {[
                        ["🛣️ Largeur",`${t.largeur} m`],
                        ["📐 Pente max",`${t.pentePct} %`],
                        ["⚖️ Portance",po.l],
                        ["🌲 Surface desservie",`${t.surface} ha`],
                        ["📦 Tonnage mobilisable",`${t.tonnageMobilisable} t`],
                        ["🌳 Volume mobilisable",`${t.volumeMobilisable} m³`],
                      ].map(([lbl,val])=>(
                        <div key={lbl} style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                          border:`1px solid ${C.bd}`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[
                        ["🅿️ Place de dépôt",t.placeDepot,"Disponible","Inexistante"],
                        ["🔄 Retournement",t.retournement,"Possible","Impossible"],
                      ].map(([lbl,ok,y,n])=>(
                        <div key={lbl} style={{background:ok?"#F0FDF4":"#FFF7ED",borderRadius:8,
                          padding:"8px 10px",border:`1px solid ${ok?"#86EFAC":"#FED7AA"}`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:12,fontWeight:700,color:ok?"#065F46":"#B45309"}}>
                            {ok?y:n}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"8px 12px",borderRadius:8,fontSize:11,
                      background:t.accesIncendie.startsWith("Oui")?"#F0FDF4":"#FEF2F2",
                      border:`1px solid ${t.accesIncendie.startsWith("Oui")?"#86EFAC":"#FECACA"}`,
                      color:t.accesIncendie.startsWith("Oui")?"#065F46":"#991B1B",fontWeight:600}}>
                      🔥 Accès incendie : {t.accesIncendie}
                    </div>
                    {t.coutProjet>0&&(
                      <div style={{padding:"8px 12px",borderRadius:8,
                        background:"#EFF6FF",border:"1px solid #BFDBFE",fontSize:11}}>
                        💶 Coût estimé : <strong>{t.coutProjet.toLocaleString("fr-FR")} €</strong>
                        {t.travaux&&<span style={{marginLeft:8,color:C.tx3}}>· {t.travaux}</span>}
                      </div>
                    )}
                    {t.photos>0&&(
                      <div style={{fontSize:11,color:"#7C3AED",fontWeight:600}}>
                        📸 {t.photos} photo{t.photos>1?"s":""} de contrôle
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NOUVEAU TRONÇON ── */}
      {tab==="nouveau"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:13,fontWeight:800,color:C.tx,marginBottom:14}}>
            📐 Créer un nouveau tronçon
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Nom + Type */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Nom du tronçon</div>
                {inp(fNom,setFNom,"Ex : Chemin des Battets — section nord")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Type</div>
                <div style={{display:"flex",gap:6}}>
                  {[["existant","✅ Existant"],["a_creer","📐 À créer"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setFType(v)} style={{
                      flex:1,padding:"8px 10px",borderRadius:9,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",
                      border:`1.5px solid ${fType===v?"#1E40AF":C.bd}`,
                      background:fType===v?"#DBEAFE":"#fff",color:fType===v?"#1E40AF":C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            {/* Propriétaire + Parcelles */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Propriétaire</div>
                {inp(fProp,setFProp,"Commune, propriétaire privé…")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>
                  Parcelles desservies
                </div>
                {inp(fParcelles,setFParcelles,"B 112, B 113, C 218…")}
              </div>
            </div>
            {/* Portance */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Portance</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {PORTANCE_OPTS.map(p=>(
                  <button key={p.v} onClick={()=>setFPortance(p.v)} style={{
                    padding:"8px 14px",borderRadius:10,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`1.5px solid ${fPortance===p.v?p.col:C.bd}`,
                    background:fPortance===p.v?p.bg:"#fff",color:fPortance===p.v?p.col:C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>{p.l}</button>
                ))}
              </div>
            </div>
            {/* Dimensions + Pente */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Largeur (m)</div>
                {inp(fLargeur,setFLargeur,"ex : 3.5","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Pente max (%)</div>
                {inp(fPente,setFPente,"ex : 12","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Coût projet (€)</div>
                {inp(fCout,setFCout,"0 si existant","number")}
              </div>
            </div>
            {/* Tonnage / Volume */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Tonnage mobilisable (t)</div>
                {inp(fTonnage,setFTonnage,"ex : 250","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Volume mobilisable (m³)</div>
                {inp(fVolume,setFVolume,"ex : 380","number")}
              </div>
            </div>
            {/* Cases */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                [fDepot,setFDepot,"🅿️ Place de dépôt"],
                [fRetour,setFRetour,"🔄 Retournement"],
              ].map(([val,set,lbl])=>(
                <button key={lbl} onClick={()=>set(!val)} style={{
                  display:"flex",alignItems:"center",gap:8,padding:"9px 14px",
                  borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:12,
                  border:`1.5px solid ${val?"#065F46":C.bd}`,
                  background:val?"#D1FAE5":"#fff",color:val?"#065F46":C.tx2,
                  WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:16}}>{val?"✅":"⬜"}</span>{lbl}
                </button>
              ))}
            </div>
            {/* Accès incendie */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>
                🔥 Accès incendie
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {ACCES_INCENDIE_OPTS.map(o=>(
                  <button key={o} onClick={()=>setFIncendie(o)} style={{
                    padding:"8px 12px",borderRadius:9,textAlign:"left",fontSize:11,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`1.5px solid ${fIncendie===o?"#065F46":C.bd}`,
                    background:fIncendie===o?"#D1FAE5":"#fff",
                    color:fIncendie===o?"#065F46":C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>{o}</button>
                ))}
              </div>
            </div>
            {/* Travaux */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>
                Travaux réalisés / prévus
              </div>
              <textarea value={fTravaux} onChange={e=>setFTravaux(e.target.value)}
                rows={3} placeholder="Ex : Entretien fossés 2024, élargissement section…"
                style={{width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
                  border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
                  background:C.bg,color:C.tx,boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            {/* ── TRACÉ GPS ── */}
            <div style={{borderRadius:12,border:`2px solid ${traceActif?"#1E40AF":C.bd}`,
              background:traceActif?"#EFF6FF":"#fff",padding:"14px 16px",transition:"all .2s"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                📍 Tracé GPS du tronçon
                {traceActif&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"#1E40AF",color:"#fff",fontWeight:700,animation:"pulse 1s infinite"}}>● EN COURS</span>}
              </div>

              {/* Compteurs temps réel */}
              {(tracePoints.length>0||traceActif)&&(
                <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                  {[
                    {icon:"📍",label:"Points capturés",val:`${tracePoints.length}`},
                    {icon:"📏",label:"Distance",val:distLabel},
                    ...(tracePoints.length>0?[{icon:"🕐",label:"Dernier point",val:new Date(tracePoints[tracePoints.length-1].t).toLocaleTimeString("fr-FR")}]:[]),
                  ].map(s=>(
                    <div key={s.label} style={{background:"#DBEAFE",borderRadius:10,padding:"8px 12px",flex:1,minWidth:90,textAlign:"center"}}>
                      <div style={{fontSize:16}}>{s.icon}</div>
                      <div style={{fontWeight:800,fontSize:15,color:"#1E3A5F",fontVariantNumeric:"tabular-nums"}}>{s.val}</div>
                      <div style={{fontSize:10,color:"#1E40AF"}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mini-tracé visuel */}
              {tracePoints.length>1&&(()=>{
                const lats=tracePoints.map(p=>p.lat), lngs=tracePoints.map(p=>p.lng);
                const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
                const W=280,H=80,pad=8;
                const sx=lng=>pad+(lng-minLng)/(maxLng-minLng||1)*(W-2*pad);
                const sy=lat=>H-pad-(lat-minLat)/(maxLat-minLat||1)*(H-2*pad);
                const pts=tracePoints.map(p=>`${sx(p.lng).toFixed(1)},${sy(p.lat).toFixed(1)}`).join(" ");
                return (
                  <div style={{marginBottom:10,borderRadius:10,overflow:"hidden",border:`1px solid #BFDBFE`,background:"#F0F9FF"}}>
                    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
                      <polyline points={pts} fill="none" stroke="#1E40AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Départ */}
                      <circle cx={sx(tracePoints[0].lng)} cy={sy(tracePoints[0].lat)} r="5" fill="#065F46"/>
                      <text x={sx(tracePoints[0].lng)+7} y={sy(tracePoints[0].lat)+4} fontSize="9" fill="#065F46" fontWeight="700">Départ</text>
                      {/* Arrivée */}
                      <circle cx={sx(tracePoints[tracePoints.length-1].lng)} cy={sy(tracePoints[tracePoints.length-1].lat)} r="5" fill={traceActif?"#1E40AF":"#991B1B"}/>
                      {!traceActif&&<text x={sx(tracePoints[tracePoints.length-1].lng)+7} y={sy(tracePoints[tracePoints.length-1].lat)+4} fontSize="9" fill="#991B1B" fontWeight="700">Fin</text>}
                    </svg>
                  </div>
                );
              })()}

              {traceError&&(
                <div style={{background:"#FEE2E2",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#991B1B",marginBottom:10}}>
                  ⚠️ {traceError}
                </div>
              )}

              {/* Boutons de contrôle */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {!traceActif?(
                  <button onClick={demarrerTrace} style={{
                    flex:2,height:44,borderRadius:10,border:"none",
                    background:"#1E40AF",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    ▶ Démarrer le tracé GPS
                  </button>
                ):(
                  <button onClick={arreterTrace} style={{
                    flex:2,height:44,borderRadius:10,border:"none",
                    background:"#991B1B",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    ⏹ Terminer le tracé
                  </button>
                )}
                <button onClick={ajouterPointManuel} disabled={traceActif} style={{
                  flex:1,height:44,borderRadius:10,border:`1.5px solid ${C.blue}`,
                  background:traceActif?"#e5e7eb":C.blueL,color:traceActif?C.tx3:C.blue,
                  fontWeight:600,fontSize:13,cursor:traceActif?"not-allowed":"pointer"}}>
                  📍 Point manuel
                </button>
                {tracePoints.length>0&&!traceActif&&(
                  <button onClick={effacerTrace} style={{
                    height:44,padding:"0 14px",borderRadius:10,border:`1.5px solid ${C.bd}`,
                    background:"#fff",color:C.tx3,fontWeight:600,fontSize:13,cursor:"pointer"}}>
                    🗑️
                  </button>
                )}
              </div>

              {/* Guide */}
              {tracePoints.length===0&&!traceActif&&(
                <div style={{marginTop:10,fontSize:11,color:C.tx3,lineHeight:1.6}}>
                  <strong>▶ Démarrer le tracé</strong> : conduisez ou marchez sur la piste — l'app enregistre un point toutes les 8 s.<br/>
                  <strong>📍 Point manuel</strong> : pour les zones sans signal, capturez chaque virage manuellement.
                </div>
              )}
            </div>

            <button style={{padding:"12px",borderRadius:12,background:"#1E40AF",border:"none",
              color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}
              onClick={()=>setTab("liste")}>
              ✓ Enregistrer le tronçon {tracePoints.length>0?`(tracé ${distLabel} — ${tracePoints.length} pts)`:""}
            </button>
          </div>
        </div>
      )}

      {/* ── CONTRAINTES ── */}
      {tab==="contraintes"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              ⚠️ Règles techniques de desserte forestière
            </div>
            {[
              {titre:"Pente maximale",detail:"12 % pour les engins de débardage courants. Au-delà, étude de faisabilité requise. En zone humide : 8 % recommandé.",col:"#991B1B",bg:"#FEE2E2"},
              {titre:"Largeur minimale",detail:"3,5 m de plateforme pour permettre le croisement avec une marge latérale. Voie principale : 4 m recommandé. Accès DFCI : 4 m minimum.",col:"#B45309",bg:"#FEF3C7"},
              {titre:"Portance minimale poids lourds",detail:"19 t admissibles pour un grumier. Vérifier les ouvrages d'art (ponts, buses) indépendamment de la chaussée.",col:"#1E40AF",bg:"#DBEAFE"},
              {titre:"Place de dépôt",detail:"Superficie minimale 400 m² pour un stockage bord de route opérationnel. Drainage impératif.",col:"#065F46",bg:"#D1FAE5"},
              {titre:"Retournement",detail:"Aire de retournement recommandée tous les 300 m sur voie sans issue. Rayon de giration ≥ 10 m pour grumier.",col:"#7C3AED",bg:"#EDE9FE"},
              {titre:"Accès DFCI",detail:"Pour être classé accès DFCI : largeur ≥ 4 m, pente ≤ 10 %, dégagement vertical ≥ 4 m, possibilité de demi-tour tous les 500 m.",col:"#DC2626",bg:"#FEE2E2"},
            ].map(r=>(
              <div key={r.titre} style={{padding:"10px 12px",borderRadius:10,
                background:r.bg,border:`1px solid ${r.col}33`,marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:800,color:r.col,marginBottom:3}}>{r.titre}</div>
                <div style={{fontSize:11,color:C.tx,lineHeight:1.6}}>{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DIAGNOSTIC TERRAIN ── */}
      {tab==="diagnostic"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:4}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>🔍 Diagnostics terrain récents</div>
            {DEMO_DIAGNOSTICS.map(d=>{
              const trc=DEMO_TRONCONS.find(t=>t.id===d.tronconId);
              const prat=PRATICABILITE_OPTS.find(p=>p.id===d.praticabilite)||PRATICABILITE_OPTS[4];
              return (
                <div key={d.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{trc?.nom||d.tronconId}</div>
                      <div style={{fontSize:12,color:C.tx3}}>Visité le {d.date} · {d.validePar}</div>
                    </div>
                    <span style={{padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700,background:prat.bg,color:prat.col}}>
                      {prat.icon} {prat.label}
                    </span>
                  </div>
                  {d.obstacles.length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:5}}>
                      {d.obstacles.map(o=>(
                        <span key={o} style={{padding:"2px 8px",borderRadius:6,fontSize:11,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {o}</span>
                      ))}
                    </div>
                  )}
                  {d.commentaire&&<div style={{fontSize:12,color:C.tx2,fontStyle:"italic"}}>"{d.commentaire}"</div>}
                  {d.photos>0&&<div style={{fontSize:11,color:C.tx3,marginTop:3}}>📷 {d.photos} photo(s)</div>}
                </div>
              );
            })}
          </div>

          {/* Formulaire nouveau diagnostic */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>➕ Saisir un diagnostic terrain</div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Tronçon</div>
            <select style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1px solid ${C.bd}`,padding:"0 12px",fontSize:14,marginBottom:10,background:"#fff",boxSizing:"border-box"}}>
              <option value="">— Sélectionner —</option>
              {DEMO_TRONCONS.map(t=><option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Praticabilité</div>
            <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
              {PRATICABILITE_OPTS.map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",
                  borderRadius:9,border:`1.5px solid ${C.bd}`,background:"#fff",cursor:"pointer",fontSize:13}}>
                  <input type="radio" name="prat_diag" value={p.id}/>{p.icon} {p.label}
                </label>
              ))}
            </div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Obstacles constatés</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
              {OBSTACLES_TYPES.map(o=>(
                <span key={o} style={{padding:"5px 10px",borderRadius:7,fontSize:12,border:`1px solid ${C.bd}`,background:"#fff",cursor:"pointer",color:C.tx2}}>⚠️ {o}</span>
              ))}
            </div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Commentaire</div>
            <textarea rows={2} placeholder="Observations terrain..." style={{width:"100%",borderRadius:10,border:`1px solid ${C.bd}`,padding:"10px 12px",fontSize:13,resize:"vertical",boxSizing:"border-box",marginBottom:10}}/>
            <button style={{height:BTN_H,width:"100%",borderRadius:12,border:"none",background:"#1E3A5F",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              📷 Enregistrer le diagnostic
            </button>
          </div>
        </div>
      )}

      {/* ── ACCÈS POMPIERS & DFCI ── */}
      {tab==="dfci"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#FEE2E2",border:"1px solid #FCA5A5",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#7F1D1D",lineHeight:1.5}}>
            <strong>⚖️ Règle APPLITAG :</strong> APPLITAG inventorie, documente et priorise l'état des pistes. La décision réglementaire sur le classement DFCI reste humaine et appartient aux autorités compétentes (SDIS, ONF, préfecture).
          </div>

          {/* Points DFCI */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>🚒 Équipements DFCI inventoriés</div>
            {DEMO_POINTS_DFCI.map(p=>{
              const ti=DFCI_TYPE_INFO[p.type]||DFCI_TYPE_INFO.citerne;
              const estOk=p.etat==="ok";
              return (
                <div key={p.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{ti.icon} {p.nom}</div>
                      <div style={{fontSize:12,color:C.tx3}}>Rattaché à {DEMO_TRONCONS.find(t=>t.id===p.tronconId)?.nom?.split("—")[0].trim()||p.tronconId}</div>
                      <div style={{fontSize:12,color:C.tx2,marginTop:2}}>{p.acces} · Capacité : {p.capacite}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>Dernier contrôle : {p.dernierControle} · {p.responsable}</div>
                    </div>
                    <span style={{padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,
                      background:estOk?C.greenL:"#FEF3C7",color:estOk?C.greenD:C.amber,flexShrink:0}}>
                      {estOk?"✅ OK":"⚠️ À vérifier"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checklist accès pompier par tronçon */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>📋 Checklist accès secours par tronçon</div>
            {DEMO_TRONCONS.map(t=>{
              const checks=[
                {label:"Largeur ≥ 4 m",ok:t.largeur>=4},
                {label:"Pente ≤ 10 %",ok:t.pentePct<=10},
                {label:"Zone de retournement",ok:t.retournement},
                {label:"Accès incendie déclaré",ok:!t.accesIncendie?.toLowerCase().includes("non")},
                {label:"Portance poids lourds",ok:t.portance==="renforcee"},
              ];
              const score=checks.filter(c=>c.ok).length;
              return (
                <div key={t.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{t.nom}</div>
                    <span style={{padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,
                      background:score>=4?C.greenL:score>=2?"#FEF3C7":"#FEE2E2",
                      color:score>=4?C.greenD:score>=2?C.amber:C.red}}>
                      {score}/{checks.length} critères
                    </span>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {checks.map(c=>(
                      <span key={c.label} style={{padding:"2px 8px",borderRadius:6,fontSize:11,
                        background:c.ok?C.greenL:"#FEE2E2",color:c.ok?C.greenD:"#991B1B"}}>
                        {c.ok?"✅":"❌"} {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Règles DFCI */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:8}}>📏 Critères classement accès DFCI</div>
            {[
              ["Largeur","≥ 4 m de plateforme"],
              ["Pente","≤ 10 %"],
              ["Dégagement vertical","≥ 4 m (passage engins pompiers)"],
              ["Retournement","Possible tous les 500 m maximum"],
              ["Signalétique","Balisage numéroté visible"],
              ["Clé pompier","Accès barrières avec triangle de Pompiers ou clé DFCI"],
            ].map(([l,v])=>(
              <div key={l} style={{display:"flex",gap:12,padding:"5px 0",borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
                <span style={{color:C.tx3,minWidth:140,flexShrink:0}}>{l}</span>
                <span style={{color:C.tx,fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRIORITÉ TRAVAUX ── */}
      {tab==="priorite"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:12}}>📊 Score de priorité de rénovation</div>
            <div style={{fontSize:12,color:C.tx3,marginBottom:12,lineHeight:1.5}}>
              Score calculé automatiquement à partir de : risque incendie + état de dégradation + accès secours + largeur + volume bois desservi. <strong>La décision de travaux reste humaine.</strong>
            </div>
            {[...DEMO_TRONCONS].sort((a,b)=>{
              const dA=DEMO_DIAGNOSTICS.find(d=>d.tronconId===a.id);
              const dB=DEMO_DIAGNOSTICS.find(d=>d.tronconId===b.id);
              return calcPriorite(b,dB)-calcPriorite(a,dA);
            }).map((t,i)=>{
              const diag=DEMO_DIAGNOSTICS.find(d=>d.tronconId===t.id);
              const score=calcPriorite(t,diag);
              const prat=PRATICABILITE_OPTS.find(p=>p.id===diag?.praticabilite);
              const level=score>=7?"🔴 Priorité 1":score>=4?"🟠 Priorité 2":score>=2?"🟡 Priorité 3":"🟢 Priorité 4";
              return (
                <div key={t.id} style={{background:score>=7?"#FEE2E2":score>=4?"#FFEDD5":score>=2?"#FEF3C7":"#F0FDF4",
                  borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>#{i+1} {t.nom}</div>
                      <div style={{fontSize:12,color:C.tx3}}>{t.proprietaire}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:900,fontSize:22,color:score>=7?"#991B1B":score>=4?"#C2410C":score>=2?"#92400E":"#065F46"}}>{score}/10</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.tx3}}>{level}</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12}}>
                    <span style={{color:C.tx2}}>🚒 Accès incendie : <strong>{t.accesIncendie?.split("—")[0].trim()}</strong></span>
                    <span style={{color:C.tx2}}>↔️ Largeur : <strong>{t.largeur} m</strong></span>
                    <span style={{color:C.tx2}}>🔄 Retournement : <strong>{t.retournement?"Oui":"Non"}</strong></span>
                    <span style={{color:C.tx2}}>📦 Volume : <strong>{t.tonnageMobilisable} t</strong></span>
                    {prat&&<span style={{color:prat.col}}>🔍 État : <strong>{prat.label}</strong></span>}
                    {t.coutProjet>0&&<span style={{color:C.tx2}}>💶 Devis estimé : <strong>{t.coutProjet.toLocaleString("fr-FR")} €</strong></span>}
                  </div>
                  {diag?.obstacles?.length>0&&(
                    <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                      {diag.obstacles.map(o=><span key={o} style={{padding:"1px 7px",borderRadius:5,fontSize:10,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {o}</span>)}
                    </div>
                  )}
                  {t.coutProjet>0&&(
                    <div style={{marginTop:8,padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,.6)",fontSize:12,color:C.tx2}}>
                      💡 Financeurs potentiels : Fonds vert · FEADER · Région · Collectivité
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CARTE placeholder ── */}
      {tab==="carte"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:40,textAlign:"center",
          border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:40,marginBottom:12}}>🗺️</div>
          <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:6}}>
            Cartographie des tronçons
          </div>
          <div style={{fontSize:12,color:C.tx3,lineHeight:1.6}}>
            Visualisation des tronçons de desserte superposée aux parcelles forestières.
            <br/>Disponible dans la prochaine mise à jour avec intégration carte IGN / OpenStreetMap.
          </div>
          <div style={{marginTop:14,display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {DEMO_TRONCONS.map(t=>{
              const st = STATUT_TRONCON[t.statut]||STATUT_TRONCON.operationnel;
              return (
                <div key={t.id} style={{padding:"6px 12px",borderRadius:20,fontSize:11,
                  fontWeight:700,background:st.bg,color:st.col}}>
                  {st.icon} {t.nom.split("—")[0].trim()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Onglet Signaler ────────────────────────────────── */}
      {tab==="signaler"&&<SignalementRapideDesserte onRetour={()=>setTab("liste")}/>}
    </div>
  );
};

// ── Formulaire de signalement rapide (inline dans Desserte) ───
const SignalementRapideDesserte = ({onRetour}) => {
  const [form, setForm] = useState({
    type:"",urgence:"orange",tronconId:"",tronconLibre:"",
    commentaire:"",profil:"Opérateur terrain",auteur:"",commune:"",
  });
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const captureGps = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      p=>{ setGps({lat:p.coords.latitude,lng:p.coords.longitude}); setGpsLoading(false); },
      ()=>setGpsLoading(false),
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const envoyer = () => {
    if(!form.type||!form.urgence||(!form.tronconId&&!form.tronconLibre)||!form.auteur) return;
    const arr = signalementsGet();
    const nouveau = {
      id:"sg"+Date.now(), createdAt:new Date().toISOString(),
      auteur:form.auteur, profil:form.profil,
      tronconId:form.tronconId||"LIBRE", tronconNom:form.tronconLibre||form.tronconId,
      type:form.type, urgence:form.urgence,
      commentaire:form.commentaire, gps, photos:0,
      statut:"ouvert", commune:form.commune,
      validePar:null, traitePar:null, dateTraitement:null,
    };
    signalementsSet([nouveau,...arr]);
    setEnvoye(true);
  };

  if(envoye) return (
    <div style={{textAlign:"center",padding:"40px 16px"}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:8}}>Signalement enregistré</div>
      <div style={{fontSize:13,color:C.tx2,marginBottom:20,lineHeight:1.6}}>
        Votre signalement a été transmis à la banque de données APPLITAG Data.<br/>
        Il sera traité par le gestionnaire du territoire.
      </div>
      <button onClick={onRetour} style={{height:BTN_H,width:"100%",maxWidth:300,borderRadius:12,border:"none",
        background:"#1E3A5F",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
        Retour à la desserte
      </button>
    </div>
  );

  const F = ({label,children}) => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:C.tx2,marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
  const sel = {height:INPUT_H,borderRadius:8,border:`1.5px solid ${C.bd}`,
    fontSize:FONT_INPUT,padding:"0 12px",background:"#fff",color:C.tx,width:"100%",fontFamily:"inherit"};

  return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <div style={{background:"#991B1B",borderRadius:12,padding:"14px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontWeight:800,fontSize:16,marginBottom:2}}>🚨 Signaler une anomalie</div>
        <div style={{fontSize:12,opacity:.85}}>Ce signalement sera versé dans APPLITAG Data, accessible à tous les gestionnaires et collectivités.</div>
        <button onClick={captureGps} disabled={gpsLoading} style={{
          marginTop:12,height:40,borderRadius:8,border:"1.5px solid rgba(255,255,255,.4)",padding:"0 16px",
          background:gps?"rgba(0,0,0,.25)":"rgba(255,255,255,.15)",
          color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>
          {gpsLoading?"⏳ Localisation en cours…":gps?`📍 Position captée : ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`:"📍 Capter ma position GPS"}
        </button>
      </div>

      <F label="Votre nom / organisme *">
        <input value={form.auteur} onChange={e=>setForm({...form,auteur:e.target.value})}
          placeholder="Ex : Martin Dupont" style={{...sel,display:"block"}}/>
      </F>
      <F label="Profil">
        <select value={form.profil} onChange={e=>setForm({...form,profil:e.target.value})} style={sel}>
          {SOURCES_PROFIL.map(p=><option key={p}>{p}</option>)}
        </select>
      </F>
      <F label="Tronçon concerné">
        <select value={form.tronconId} onChange={e=>setForm({...form,tronconId:e.target.value,tronconLibre:""})}
          style={{...sel,marginBottom:6,display:"block"}}>
          <option value="">-- Choisir un tronçon connu --</option>
          {DEMO_TRONCONS.map(t=><option key={t.id} value={t.id}>{t.id} — {t.nom}</option>)}
        </select>
        <input value={form.tronconLibre} onChange={e=>setForm({...form,tronconLibre:e.target.value,tronconId:""})}
          placeholder="Ou saisir librement : lieu-dit, commune…" style={{...sel,display:"block"}}/>
      </F>
      <F label="Commune">
        <input value={form.commune} onChange={e=>setForm({...form,commune:e.target.value})}
          placeholder="Ex : Saint-Bonnet-Tronçais" style={{...sel,display:"block"}}/>
      </F>
      <F label="Type d'anomalie *">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {TYPES_ANOMALIE.map(a=>(
            <button key={a.id} onClick={()=>setForm({...form,type:a.id})} style={{
              padding:"8px 10px",borderRadius:8,fontSize:12,fontWeight:form.type===a.id?700:400,
              border:`1.5px solid ${form.type===a.id?"#1E3A5F":C.bd}`,cursor:"pointer",
              background:form.type===a.id?"#1E3A5F":"#fff",
              color:form.type===a.id?"#fff":C.tx,textAlign:"left"}}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </F>
      <F label="Niveau d'urgence *">
        <div style={{display:"flex",gap:6}}>
          {Object.entries(URGENCES).map(([k,u])=>(
            <button key={k} onClick={()=>setForm({...form,urgence:k})} style={{
              flex:1,padding:"8px 6px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              border:`1.5px solid ${form.urgence===k?u.col:C.bd}`,
              background:form.urgence===k?u.bg:"#fff",color:form.urgence===k?u.col:C.tx2}}>
              {u.icon} {u.label}
            </button>
          ))}
        </div>
      </F>
      <F label="Description (facultatif)">
        <textarea value={form.commentaire} onChange={e=>setForm({...form,commentaire:e.target.value})}
          placeholder="Décrivez l'anomalie, son étendue, les risques…" rows={3}
          style={{...sel,height:"auto",padding:"10px 12px",resize:"vertical",display:"block"}}/>
      </F>
      <F label="Localisation GPS">
        <button onClick={captureGps} disabled={gpsLoading} style={{
          height:42,borderRadius:8,border:`1.5px solid ${C.bd}`,padding:"0 16px",
          background:gps?"#D1FAE5":"#fff",color:gps?"#065F46":C.tx2,fontSize:13,cursor:"pointer"}}>
          {gpsLoading?"⏳ Localisation…":gps?`📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`:"📍 Capter ma position GPS"}
        </button>
      </F>

      <button onClick={envoyer} style={{
        width:"100%",height:BTN_H,borderRadius:12,border:"none",marginTop:8,
        background:(!form.type||!form.auteur||(!form.tronconId&&!form.tronconLibre))?"#9CA3AF":"#991B1B",
        color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer"}}>
        🚨 Envoyer le signalement
      </button>
      <button onClick={onRetour} style={{
        width:"100%",height:40,borderRadius:12,border:`1.5px solid ${C.bd}`,marginTop:8,
        background:"transparent",color:C.tx2,fontSize:13,cursor:"pointer"}}>
        Annuler
      </button>
    </div>
  );
};