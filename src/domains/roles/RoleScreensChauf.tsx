// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { fmtNum } from "../../shared/format.js";
import { apiPost, apiPostPublic } from "../../services/api.service.js";
import { BigBtn, MInput } from "../../shared/ui.jsx";
import { validateCMR, formatCMR, formatImmat, validateImmat } from "../../shared/validators.js";

export const EcranRoleChauffeur = ({user, transports=[], dechiquetages=[], gpsChantier={}, onValiderArrivee, onValiderDepart}: any) => {
  const mesTransports = transports.filter((t: any)=>t.nomChauffeur?.toLowerCase().includes(user.nom.toLowerCase()));
  const [confirmed, setConfirmed] = useState<Record<string,any>>({});
  const [heuresArriveeEst, setHeuresArriveeEst] = useState<Record<string,any>>({});
  const [heuresValidees, setHeuresValidees] = useState<Record<string,any>>({});
  const [heuresArriveSite, setHeuresArriveSite] = useState<Record<string,any>>({});
  const [heuresDebutCharg, setHeuresDebutCharg] = useState<Record<string,any>>({});
  const [heuresFinCharg, setHeuresFinCharg] = useState<Record<string,any>>({});
  const [justifModal, setJustifModal] = useState<any>(null); // {tid, dureeMin}
  const [justifChoix, setJustifChoix] = useState("");
  const [justifTexte, setJustifTexte] = useState("");
  const [justifValidees, setJustifValidees] = useState<Record<string,any>>({});

  // Prise de poste : capacité véhicule
  const storageKey = `applitag_capacite_${user.id||user.nom}`;
  const [capaciteM3, setCapaciteM3] = useState(()=>{try{return localStorage.getItem(storageKey)||""}catch{return ""}});
  const [capaciteSaisie, setCapaciteSaisie] = useState("");
  const [posteValide, setPosteValide] = useState(()=>{try{return !!localStorage.getItem(storageKey)}catch{return false}});

  // Bloquer le retour arrière navigateur quand "DÉBUT DE CHARGEMENT" est en attente
  const blockingTransportId = mesTransports.find((t: any)=>confirmed[t.id+"arrivePlace"]&&!heuresDebutCharg[t.id])?.id||null;
  useEffect(()=>{
    if(!blockingTransportId) return;
    window.history.pushState({chargBloque:true},"");
    const handler=(e: any)=>{
      if(e.state?.chargBloque===undefined){
        window.history.pushState({chargBloque:true},"");
      }
    };
    window.addEventListener("popstate",handler);
    return ()=>window.removeEventListener("popstate",handler);
  },[blockingTransportId]);

  const getNow=()=>{const n=new Date();return String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");};
  const diffMin=(h1: any,h2: any)=>{
    const [ah,am]=h1.split(":").map(Number);
    const [bh,bm]=h2.split(":").map(Number);
    return (bh*60+bm)-(ah*60+am);
  };

  // Écran prise de poste si capacité pas encore validée
  if (!posteValide) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:24,background:C.bg}}>
      <div style={{fontSize:48,marginBottom:12}}>🚛</div>
      <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Prise de poste</div>
      <div style={{fontSize:14,color:C.tx3,marginBottom:28,textAlign:"center"}}>
        Bonjour {user.prenom} — avant de commencer,<br/>
        renseignez la capacité de votre véhicule.
      </div>
      <div style={{width:"100%",maxWidth:320}}>
        <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
          Capacité de chargement (m³)
        </div>
        <input
          type="number" inputMode="decimal" min="1" max="200" step="0.5"
          value={capaciteSaisie}
          onChange={e=>setCapaciteSaisie(e.target.value)}
          placeholder="Ex : 85"
          style={{width:"100%",height:54,padding:"0 16px",borderRadius:14,
            border:`2px solid ${capaciteSaisie?C.green:C.bd}`,
            fontFamily:"inherit",fontSize:22,fontWeight:700,outline:"none",
            boxSizing:"border-box",textAlign:"center",color:C.tx}}/>
        <div style={{fontSize:11,color:C.tx3,textAlign:"center",marginTop:6,marginBottom:20}}>
          Cette valeur sera transmise à l'opérateur de déchiquetage.
        </div>
        <button
          disabled={!capaciteSaisie||parseFloat(capaciteSaisie)<=0}
          onClick={()=>{
            const val=capaciteSaisie.trim();
            setCapaciteM3(val);
            try{localStorage.setItem(storageKey,val)} catch { /* noop */ }
            setPosteValide(true);
          }}
          style={{width:"100%",height:52,borderRadius:14,
            background:capaciteSaisie&&parseFloat(capaciteSaisie)>0?C.green:"#ccc",
            border:"none",color:"#fff",fontFamily:"inherit",fontSize:16,fontWeight:700,
            cursor:capaciteSaisie&&parseFloat(capaciteSaisie)>0?"pointer":"default",
            WebkitTapHighlightColor:"transparent"}}>
          ✅ Valider et commencer
        </button>
      </div>
    </div>
  );

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40}}>🚛</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Vos missions de transport</div>
      </div>
      {mesTransports.length===0?(
        <div style={{background:C.amberL,borderRadius:14,padding:20,textAlign:"center",
          border:`1px solid ${C.amber}`}}>
          <div style={{fontSize:32,marginBottom:8}}>⏳</div>
          <div style={{fontSize:15,fontWeight:600,color:C.amberD}}>Aucune mission en cours</div>
          <div style={{fontSize:12,color:C.tx3,marginTop:4}}>
            Votre dispatcher vous assignera une mission
          </div>
        </div>
      ):(
        mesTransports.map((t: any)=>(
          <div key={t.id} style={{background:"#fff",borderRadius:16,padding:20,marginBottom:14,
            border:`2px solid ${C.green}`}}>
            <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:C.greenD,marginBottom:12}}>
              {t.lotNumero}
            </div>
            <div style={{fontSize:13,color:C.tx3,lineHeight:2,marginBottom:12}}>
              📄 CMR : <strong>{t.numeroCMR}</strong><br/>
              🚛 {t.immatTracteur} · {t.immatRemorque}<br/>
              🏢 {t.societeTransp}
            </div>
            {(()=>{
              const dech = dechiquetages.find((d: any)=>d.lotId===t.lotId && d.operateurDechiquetage);
              return (t.adresse||t.codePostal||t.commune||t.departement||dech)&&(
                <div style={{background:C.bg2,borderRadius:10,padding:"10px 14px",
                  marginBottom:16,border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,
                    textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>
                    📍 Adresse de chargement
                  </div>
                  {t.adresse&&(
                    <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:2}}>
                      {t.adresse}
                    </div>
                  )}
                  {(t.codePostal||t.commune)&&(
                    <div style={{fontSize:13,color:C.tx}}>
                      {[t.codePostal,t.commune].filter(Boolean).join(" ")}
                    </div>
                  )}
                  {t.departement&&(
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>
                      {t.departement}
                    </div>
                  )}
                  {dech&&(
                    <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.bd}`}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.tx2,
                        textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>
                        🪓 Opérateur de déchiquetage
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:2}}>
                        {dech.operateurDechiquetage}
                      </div>
                      {dech.telOperateur&&(
                        <a href={`tel:${dech.telOperateur.replace(/\s/g,"")}`}
                          style={{fontSize:13,color:C.green,fontWeight:600,
                            textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                          📞 {dech.telOperateur}
                        </a>
                      )}
                      {(()=>{
                        const gps = gpsChantier[t.lotId];
                        if(!gps) return null;
                        const mapsUrl = gps.coords
                          ? `https://maps.google.com/?q=${gps.coords.lat},${gps.coords.lng}`
                          : null;
                        return (
                          <div style={{marginTop:8,paddingTop:8,borderTop:`1px dashed ${C.bd}`}}>
                            <div style={{fontSize:11,fontWeight:700,color:C.tx2,
                              textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
                              📡 Position chantier
                            </div>
                            {gps.coords?(
                              <a href={mapsUrl||undefined} target="_blank" rel="noreferrer"
                                style={{fontSize:12,color:C.green,fontWeight:600,
                                  textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                                🗺️ Ouvrir dans Maps (±{gps.coords.precision} m)
                              </a>
                            ):(
                              <div style={{fontSize:12,color:C.tx3}}>
                                Position GPS non disponible — contactez l'opérateur
                              </div>
                            )}
                            <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                              Enregistrée à {gps.heure} par {dech.operateurDechiquetage}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}
            <button onClick={()=>setConfirmed(p=>({...p,[t.id+"reception"]:true}))}
              disabled={confirmed[t.id+"reception"]}
              style={{width:"100%",padding:14,borderRadius:12,marginBottom:8,
                background:confirmed[t.id+"reception"]?C.greenL:"#fff",
                border:`2px solid ${confirmed[t.id+"reception"]?C.green:C.bd}`,
                color:confirmed[t.id+"reception"]?C.greenD:C.tx,
                fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
              {confirmed[t.id+"reception"]?"✅ Réception mission":"Réception mission"}
            </button>

            {confirmed[t.id+"reception"]&&(
              <div style={{marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>
                  🕐 Heure d'arrivée estimée
                </div>
                <input type="time" value={heuresArriveeEst[t.id]||""}
                  onChange={e=>setHeuresArriveeEst(p=>({...p,[t.id]:e.target.value}))}
                  disabled={!!heuresValidees[t.id]}
                  style={{width:"100%",height:46,padding:"0 14px",borderRadius:10,
                    border:`1.5px solid ${heuresValidees[t.id]?C.green:C.bd}`,
                    background:heuresValidees[t.id]?C.greenL:"#fff",
                    color:C.tx,fontFamily:"inherit",fontSize:15,outline:"none"}}/>
                {!heuresValidees[t.id]&&(
                  <button
                    onClick={()=>{
                      const h=heuresArriveeEst[t.id];
                      if(!h) return;
                      setHeuresValidees(p=>({...p,[t.id]:h}));
                      onValiderArrivee&&onValiderArrivee(t.lotId, h, (user.prenom||"")+" "+(user.nom||""), capaciteM3);
                    }}
                    disabled={!heuresArriveeEst[t.id]}
                    style={{width:"100%",marginTop:8,padding:13,borderRadius:12,
                      background:heuresArriveeEst[t.id]?C.green:"#eee",
                      border:"none",color:"#fff",
                      fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                      opacity:heuresArriveeEst[t.id]?1:0.5,
                      WebkitTapHighlightColor:"transparent"}}>
                    ✉️ Valider et notifier l'opérateur
                  </button>
                )}
                {heuresValidees[t.id]&&(
                  <div style={{marginTop:8,padding:"10px 14px",borderRadius:10,
                    background:C.greenL,border:`1px solid ${C.green}`,
                    fontSize:13,color:C.greenD,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                    ✅ Heure {heuresValidees[t.id]} transmise à l'opérateur de déchiquetage
                  </div>
                )}
              </div>
            )}

            {heuresValidees[t.id]&&!confirmed[t.id+"arrivePlace"]&&(
              <button onClick={()=>{
                  const now=new Date();
                  const hh=String(now.getHours()).padStart(2,"0");
                  const mm=String(now.getMinutes()).padStart(2,"0");
                  setHeuresArriveSite(p=>({...p,[t.id]:`${hh}:${mm}`}));
                  setConfirmed(p=>({...p,[t.id+"arrivePlace"]:true}));
                }}
                style={{width:"100%",padding:14,borderRadius:12,marginBottom:8,
                  background:"#fff",border:`2px solid ${C.bd}`,color:C.tx,
                  fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                📍 Arrivé sur site de chargement
              </button>
            )}
            {confirmed[t.id+"arrivePlace"]&&(
              <div style={{padding:"10px 14px",borderRadius:10,marginBottom:8,
                background:C.greenL,border:`1px solid ${C.green}`,
                fontSize:13,color:C.greenD,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                ✅ Arrivé sur site à {heuresArriveSite[t.id]}
              </div>
            )}
            {confirmed[t.id+"arrivePlace"]&&!heuresDebutCharg[t.id]&&(
              <style>{`@keyframes pulse-charg{0%,100%{opacity:1;box-shadow:0 4px 18px rgba(255,111,0,.45)}50%{opacity:.88;box-shadow:0 6px 28px rgba(255,111,0,.75)}}`}</style>
            )}
            {/* Bouton fixe en bas — visible depuis n'importe où sur la page */}
            {confirmed[t.id+"arrivePlace"]&&!heuresDebutCharg[t.id]&&(
              <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:8888,
                padding:"10px 16px 28px",
                background:"linear-gradient(transparent,rgba(0,0,0,.18) 30%,rgba(0,0,0,.35))"}}>
                <button onClick={()=>{
                    const now=new Date();
                    const hh=String(now.getHours()).padStart(2,"0");
                    const mm=String(now.getMinutes()).padStart(2,"0");
                    setHeuresDebutCharg(p=>({...p,[t.id]:`${hh}:${mm}`}));
                  }}
                  style={{width:"100%",padding:18,borderRadius:16,
                    background:"linear-gradient(135deg,#FF6F00,#FF8F00)",
                    border:"none",color:"#fff",
                    fontFamily:"inherit",fontSize:18,fontWeight:800,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",letterSpacing:.5,
                    boxShadow:"0 4px 18px rgba(255,111,0,.45)",
                    animation:"pulse-charg 1.4s ease-in-out infinite"}}>
                  🟠 DÉBUT DE CHARGEMENT
                </button>
              </div>
            )}
            {heuresDebutCharg[t.id]&&(
              <div style={{padding:"10px 14px",borderRadius:10,marginBottom:8,
                background:"#FFF3E0",border:`1px solid #FF8F00`,
                fontSize:13,color:"#E65100",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                🟠 Chargement démarré à {heuresDebutCharg[t.id]}
              </div>
            )}

            {/* FIN DE CHARGEMENT */}
            {heuresDebutCharg[t.id]&&!heuresFinCharg[t.id]&&(
              <button onClick={()=>{
                  const fin=getNow();
                  const duree=diffMin(heuresDebutCharg[t.id],fin);
                  setHeuresFinCharg(p=>({...p,[t.id]:fin}));
                  if(duree<5) setJustifModal({tid:t.id,dureeMin:duree});
                }}
                style={{width:"100%",padding:14,borderRadius:12,marginBottom:8,
                  background:"#fff",border:`2px solid ${C.bd}`,color:C.tx,
                  fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                🏁 Fin de chargement
              </button>
            )}
            {heuresFinCharg[t.id]&&(
              <div style={{padding:"10px 14px",borderRadius:10,marginBottom:8,
                background:C.greenL,border:`1px solid ${C.green}`,
                fontSize:13,color:C.greenD,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                ✅ Chargement terminé à {heuresFinCharg[t.id]}
                {justifValidees[t.id]&&<span style={{fontSize:11,fontWeight:400,marginLeft:4,color:C.tx3}}>· {justifValidees[t.id]}</span>}
              </div>
            )}

            {/* Départ et déchargement — uniquement après fin de chargement validée */}
            {heuresFinCharg[t.id]&&(justifModal?.tid!==t.id)&&(!justifModal||justifValidees[t.id])&&[
              {label:"Départ confirmé",key:"depart"},
              {label:"Arrivé sur site déchargement",key:"arrivee"},
            ].map(btn=>(
              <button key={btn.key} onClick={()=>{
                  setConfirmed(p=>({...p,[t.id+btn.key]:true}));
                  if(btn.key==="depart"&&onValiderDepart){
                    const now=new Date();
                    const hh=String(now.getHours()).padStart(2,"0");
                    const mm=String(now.getMinutes()).padStart(2,"0");
                    onValiderDepart(t.lotId||t.id,{
                      nomChauffeur:((user.prenom||"")+" "+(user.nom||"")).trim(),
                      capaciteM3,
                      lotNumero:t.lotNumero,
                      heureDebutCharg:heuresDebutCharg[t.id]||"—",
                      heureFinCharg:heuresFinCharg[t.id]||"—",
                      heureDepart:`${hh}:${mm}`
                    });
                  }
                }}
                disabled={confirmed[t.id+btn.key]}
                style={{width:"100%",padding:14,borderRadius:12,marginBottom:8,
                  background:confirmed[t.id+btn.key]?C.greenL:"#fff",
                  border:`2px solid ${confirmed[t.id+btn.key]?C.green:C.bd}`,
                  color:confirmed[t.id+btn.key]?C.greenD:C.tx,
                  fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                {confirmed[t.id+btn.key]?"✅ "+btn.label:btn.label}
              </button>
            ))}
          </div>
        ))
      )}

      {/* Modal justification chargement court */}
      {justifModal&&!justifValidees[justifModal.tid]&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,
          display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#fff",width:"100%",borderRadius:"20px 20px 0 0",
            padding:"24px 20px 36px"}}>
            <div style={{fontSize:22,textAlign:"center",marginBottom:8}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:4}}>
              Chargement court détecté
            </div>
            <div style={{fontSize:13,color:C.tx3,textAlign:"center",marginBottom:20}}>
              Durée : <strong>{justifModal.dureeMin} min</strong> — inférieure à 5 minutes.<br/>
              Veuillez indiquer la raison.
            </div>
            {[
              {val:"Manque de produits",icon:"📦"},
              {val:"Chargement annulé",icon:"🚫"},
              {val:"Erreur de mission",icon:"📋"},
            ].map(opt=>(
              <button key={opt.val} onClick={()=>setJustifChoix(opt.val)}
                style={{width:"100%",padding:"12px 16px",borderRadius:12,marginBottom:8,
                  background:justifChoix===opt.val?"#E3F2FD":"#fff",
                  border:`2px solid ${justifChoix===opt.val?C.blue:C.bd}`,
                  color:justifChoix===opt.val?C.blue:C.tx,
                  fontFamily:"inherit",fontSize:14,fontWeight:600,
                  cursor:"pointer",textAlign:"left",
                  WebkitTapHighlightColor:"transparent"}}>
                {opt.icon} {opt.val}
              </button>
            ))}
            <button onClick={()=>setJustifChoix("autre")}
              style={{width:"100%",padding:"12px 16px",borderRadius:12,marginBottom:justifChoix==="autre"?8:16,
                background:justifChoix==="autre"?"#E3F2FD":"#fff",
                border:`2px solid ${justifChoix==="autre"?C.blue:C.bd}`,
                color:justifChoix==="autre"?C.blue:C.tx,
                fontFamily:"inherit",fontSize:14,fontWeight:600,
                cursor:"pointer",textAlign:"left",
                WebkitTapHighlightColor:"transparent"}}>
              ✏️ Autre raison
            </button>
            {justifChoix==="autre"&&(
              <textarea value={justifTexte} onChange={e=>setJustifTexte(e.target.value)}
                placeholder="Décrivez la raison..."
                rows={3}
                style={{width:"100%",borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"10px 12px",fontFamily:"inherit",fontSize:14,
                  resize:"none",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
            )}
            <button
              disabled={!justifChoix||(justifChoix==="autre"&&!justifTexte.trim())}
              onClick={()=>{
                const raison=justifChoix==="autre"?justifTexte.trim():justifChoix;
                setJustifValidees(p=>({...p,[justifModal.tid]:raison}));
                setJustifModal(null);
                setJustifChoix("");
                setJustifTexte("");
              }}
              style={{width:"100%",padding:14,borderRadius:14,
                background:(!justifChoix||(justifChoix==="autre"&&!justifTexte.trim()))?"#ccc":C.blue,
                border:"none",color:"#fff",fontFamily:"inherit",
                fontSize:15,fontWeight:700,cursor:"pointer",
                WebkitTapHighlightColor:"transparent",
                opacity:(!justifChoix||(justifChoix==="autre"&&!justifTexte.trim()))?0.6:1}}>
              Valider la justification
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Flux déchiquetage multi-camions (espace opérateur rôle) ────────────────
const FluxDechiquetageRole = ({lot, user, onFinChantier, onRetour, toast}: any) => {
  // phase: demarrage | en_cours | saisie_fin | entre_camions | cloture
  const [phase,        setPhase]       = useState("demarrage");
  const [machine,      setMachine]     = useState(()=>{ try { return localStorage.getItem(`applitag_dech_machine_${user?.id||""}`)||""; } catch { return ""; } });
  const [heureDebut,   setHeureDebut]  = useState("");
  const [dateDebut,    setDateDebut]   = useState("");
  const [chargements,  setChargements] = useState<any[]>([]); // [{type,cubage,tonnage,cmr,immatTract,immatRemor,heureFin}]
  // Saisie fin de chargement
  const [typeCharg,    setTypeCharg]   = useState("semi");
  const [cubage,       setCubage]      = useState("");
  const [tonnage,      setTonnage]     = useState("");
  const [cmr,          setCmr]         = useState("");
  const [immatTract,   setImmatTract]  = useState("");
  const [immatRemor,   setImmatRemor]  = useState("");
  const [heureFin,     setHeureFin]    = useState("");
  const [saving,       setSaving]      = useState(false);

  const [chrono,       setChrono]       = useState(0); // secondes écoulées
  const chronoRef = useRef<any>(null);

  useEffect(()=>{
    if(phase==="en_cours"){
      chronoRef.current = setInterval(()=>setChrono(s=>s+1), 1000);
    } else {
      clearInterval(chronoRef.current);
      if(phase==="demarrage") setChrono(0);
    }
    return ()=>clearInterval(chronoRef.current);
  },[phase]);

  const fmtChrono = (s: any) => {
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    return h>0
      ? `${h}h ${String(m).padStart(2,"0")}min ${String(sec).padStart(2,"0")}s`
      : `${String(m).padStart(2,"0")}min ${String(sec).padStart(2,"0")}s`;
  };

  const operateurNom = `${user.prenom||""} ${user.nom||""}`.trim();
  const entreprise   = user.etfNom || "—";

  const hNow = () => { const d=new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

  const resetFinCharg = () => { setTypeCharg("semi"); setCubage(""); setTonnage(""); setCmr(""); setImmatTract(""); setImmatRemor(""); setHeureFin(""); };

  const handleDemarrer = () => {
    if (!machine.trim()) { toast&&toast("Veuillez indiquer le nom de la machine","warn"); return; }
    try { localStorage.setItem(`applitag_dech_machine_${user?.id||""}`, machine); } catch { /* noop */ }
    const now = new Date();
    setHeureDebut(hNow());
    setDateDebut(now.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}));
    setPhase("en_cours");
  };

  const handleValiderChargement = () => {
    const errCMR = validateCMR(cmr);
    if (!cmr || errCMR) { toast&&toast("Numéro CMR invalide — format CMR-AAAA-NNNN","warn"); return; }
    if (!tonnage) { toast&&toast("Tonnage obligatoire","warn"); return; }
    if (!heureFin) { toast&&toast("Heure de fin obligatoire","warn"); return; }
    const dureeMin = Math.round(chrono / 60); // chrono = secondes depuis le début de ce chargement
    const entry = { type:typeCharg, cubage:parseFloat(cubage)||0, tonnage:parseFloat(tonnage)||0, cmr, immatTract, immatRemor, heureDebut, heureFin, dureeMin };
    setChargements(p=>[...p, entry]);
    resetFinCharg();
    setChrono(0);
    setPhase("entre_camions");
  };

  const handleFinChantier = async () => {
    setSaving(true);
    const payload = {
      lotId: lot.id, lotNumero: lot.lotNumero,
      entrepriseDechiquetage: entreprise,
      operateurDechiquetage: operateurNom,
      machine, heureDebut,
      chargements,
      nbCamions: chargements.length,
      tonnageTotal: chargements.reduce((s,c)=>s+c.tonnage,0),
      cubageTotal:  chargements.reduce((s,c)=>s+c.cubage,0),
      statut:"RECEPTION_A_EFFECTUER",
      dateJour: new Date().toISOString().slice(0,10),
    };
    try {
      await apiPost(`/dechiquetage`, payload);
      await apiPost(`/contacts/${lot.id}/transition`, {action:"terminerDechiquetage"});
    } catch(e) {
      toast&&toast(`Erreur enregistrement chantier — ${(e as any).message||"vérifiez la connexion"}`, "warn");
      setSaving(false);
      return;
    }
    // Notification admin : fire-and-forget, ne bloque pas la clôture
    apiPostPublic(`/messages-admin`, { type:"fin_chantier_dechiquetage", lotId:lot.id, lotNumero:lot.lotNumero,
      operateurDechiquetage:operateurNom, machine,
      nbCamions:chargements.length,
      tonnageTotal:payload.tonnageTotal.toFixed(1),
      message:`Chantier de déchiquetage terminé sur le lot ${lot.lotNumero}. ${chargements.length} camion(s) chargé(s), ${payload.tonnageTotal.toFixed(1)} t au total. Réception à effectuer.`,
      date:new Date().toISOString() }).catch(()=>{});
    setSaving(false);
    setPhase("cloture");
    onFinChantier&&onFinChantier(lot.id);
  };

  // ── Phase : cloture ──────────────────────────────────────────────────────
  if (phase==="cloture") return (
    <div style={{padding:PADDING,paddingBottom:40}}>
      <div style={{textAlign:"center",padding:"32px 0 24px"}}>
        <div style={{fontSize:48,marginBottom:12}}>🏁</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:6}}>Chantier clôturé</div>
        {(()=>{
          const avecDuree   = chargements.filter(c=>c.dureeMin!=null);
          const avecTonnage = chargements.filter(c=>c.tonnage>0);
          const moy    = avecDuree.length   ? Math.round(avecDuree.reduce((s,c)=>s+c.dureeMin,0)/avecDuree.length)           : null;
          const moyTon = avecTonnage.length ? (avecTonnage.reduce((s,c)=>s+c.tonnage,0)/avecTonnage.length).toFixed(1)        : null;
          return (
            <div style={{fontSize:13,color:C.tx3,lineHeight:1.8}}>
              {chargements.length} camion(s) · {chargements.reduce((s,c)=>s+c.tonnage,0).toFixed(1)} t chargées
              {moy!=null&&<><br/>⏱ Temps moyen de chargement : <strong style={{color:C.tx}}>{moy} min</strong></>}
              {moyTon!=null&&<><br/>⚖️ Tonnage moyen par camion : <strong style={{color:C.tx}}>{moyTon} t</strong></>}
            </div>
          );
        })()}
      </div>
      <div style={{background:"#E8F5E9",borderRadius:14,padding:16,border:"1px solid #A5D6A7",marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E7D32",marginBottom:6}}>✅ Statut mis à jour</div>
        <div style={{fontSize:12,color:"#388E3C",lineHeight:1.7}}>
          Le lot <strong>{lot.lotNumero}</strong> est classifié <strong>Réception à effectuer</strong>.<br/>
          La personne missionnée a été notifiée. L'administrateur voit la mise à jour en temps réel.
        </div>
      </div>
      <button onClick={onRetour} style={{width:"100%",padding:14,borderRadius:12,
        background:C.green,border:"none",color:"#fff",
        fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer"}}>
        ← Retour à mes lots
      </button>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <div style={{background:"#D85A30",color:"#fff",padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onRetour} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"5px 10px",borderRadius:8,fontSize:13,cursor:"pointer"}}>
            ← Retour
          </button>
          <div>
            <div style={{fontSize:14,fontWeight:600}}>🌀 Chantier de déchiquetage</div>
            <div style={{fontSize:11,opacity:.7}}>{lot.lotNumero} · {lot.commune}</div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:40}}>

        {/* Recap auto */}
        <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:16,
          border:`1px solid ${C.bd}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.tx2,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:8}}>Informations chantier</div>
          <div style={{fontSize:13,color:C.tx,lineHeight:1.9}}>
            🏭 <strong>{entreprise}</strong><br/>
            👷 {operateurNom}
            {dateDebut&&<><br/>📅 {dateDebut}</>}
            {heureDebut&&<><br/>⏱ Début : {heureDebut}</>}
          </div>
        </div>

        {/* ── Phase : démarrage ── */}
        {phase==="demarrage"&&(<>
          <MInput label="Machine utilisée" value={machine} onChange={setMachine}
            placeholder="Ex : Jenz HEM 593, Doppstadt AK 430…"/>
          <BigBtn onClick={handleDemarrer} bg="#D85A30" icon="▶">
            DÉMARRER LE CHANTIER
          </BigBtn>
        </>)}

        {/* ── Phase : en cours ── */}
        {phase==="en_cours"&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:36,marginBottom:10}}>⚙️</div>
            <div style={{fontSize:16,fontWeight:700,color:"#D85A30",marginBottom:4}}>
              Chantier en cours
            </div>
            <div style={{fontSize:13,color:C.tx3,marginBottom:20}}>
              Démarré à {heureDebut} · {machine}
            </div>
            {/* Chronomètre */}
            <div style={{background:"#1C2B23",borderRadius:16,padding:"18px 24px",
              marginBottom:20,display:"inline-block",minWidth:200}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",
                textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>
                Durée de déchiquetage
              </div>
              <div style={{fontSize:36,fontWeight:700,color:"#4CAF50",
                fontVariantNumeric:"tabular-nums",letterSpacing:".04em",
                fontFamily:"ui-monospace,'SF Mono',monospace"}}>
                {fmtChrono(chrono)}
              </div>
            </div>
            {chargements.length>0&&(
              <div style={{background:C.greenL,borderRadius:10,padding:12,marginBottom:16,
                border:`1px solid ${C.green}`,fontSize:13,color:C.greenD}}>
                ✅ {chargements.length} chargement(s) enregistré(s)
              </div>
            )}
            <BigBtn onClick={()=>{ setHeureFin(hNow()); setPhase("saisie_fin"); }} bg="#D85A30" icon="🏁">
              FIN DE CHARGEMENT CAMION
            </BigBtn>
          </div>
        )}

        {/* ── Phase : saisie fin de chargement ── */}
        {phase==="saisie_fin"&&(<>
          <div style={{fontSize:14,fontWeight:700,color:"#D85A30",marginBottom:14}}>
            🚛 Chargement n°{chargements.length+1} — informations
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:8}}>Type de chargement</div>
            {[["semi","🚛","Semi-remorque"],["camion_remorque","🚚","Camion-remorque"],["benne_ampliroll","🏗️","Benne ampliroll"]].map(([v,e,l])=>(
              <div key={v} onClick={()=>setTypeCharg(v)}
                style={{padding:"11px 14px",borderRadius:10,cursor:"pointer",marginBottom:6,
                  border:`2px solid ${typeCharg===v?"#D85A30":C.bd}`,
                  background:typeCharg===v?"#FAECE7":"#fff",
                  display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{e}</span>
                <span style={{fontSize:13,fontWeight:typeCharg===v?600:400,
                  color:typeCharg===v?"#D85A30":C.tx}}>{l}</span>
              </div>
            ))}
          </div>
          <MInput label="Tonnage estimé chargé (t)" value={tonnage} onChange={setTonnage} type="number" placeholder="ex: 28" required/>
          <MInput label="Cubage chargé estimé (m³)" value={cubage} onChange={setCubage} type="number" placeholder="ex: 85"/>
          <MInput label="Numéro CMR" value={cmr} onChange={v=>setCmr(formatCMR(v))} placeholder="CMR-2026-0001" hint="CMR-AAAA-NNNN" required error={cmr?validateCMR(cmr) as any:undefined}/>
          <MInput label="Immat. tracteur" value={immatTract} onChange={v=>setImmatTract(formatImmat(v))} placeholder="AB-123-CD" error={immatTract?validateImmat(immatTract) as any:undefined}/>
          <MInput label="Immat. remorque" value={immatRemor} onChange={v=>setImmatRemor(formatImmat(v))} placeholder="EF-456-GH" error={immatRemor?validateImmat(immatRemor) as any:undefined}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Heure début chargement</div>
              <input type="time" value={heureDebut} disabled
                style={{width:"100%",height:46,padding:"0 12px",borderRadius:10,
                  border:`1.5px solid ${C.bd}`,background:"#f5f5f5",
                  color:C.tx3,fontFamily:"inherit",fontSize:14,outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Heure fin chargement</div>
              <input type="time" value={heureFin} onChange={e=>setHeureFin(e.target.value)}
                style={{width:"100%",height:46,padding:"0 12px",borderRadius:10,
                  border:`1.5px solid ${C.bd}`,background:"#fff",
                  color:C.tx,fontFamily:"inherit",fontSize:14,outline:"none"}}/>
            </div>
          </div>
          <BigBtn onClick={handleValiderChargement} bg={C.green} icon="✅">
            VALIDER CE CHARGEMENT
          </BigBtn>
        </>)}

        {/* ── Phase : entre deux camions ── */}
        {phase==="entre_camions"&&(
          <div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{fontSize:36,marginBottom:10}}>✅</div>
            <div style={{fontSize:15,fontWeight:700,color:C.greenD,marginBottom:4}}>
              Chargement {chargements.length} validé
            </div>
            <div style={{fontSize:13,color:C.tx3,marginBottom:20}}>
              {chargements.reduce((s,c)=>s+c.tonnage,0).toFixed(1)} t chargées au total
            </div>
            {/* Récap chargements */}
            {chargements.map((c,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:10,padding:"10px 14px",
                marginBottom:8,border:`1px solid ${C.bd}`,textAlign:"left",fontSize:12,color:C.tx3}}>
                <strong style={{color:C.tx}}>Camion {i+1}</strong> · {c.tonnage} t · {c.cmr} · {c.heureFin}
                {c.dureeMin!=null&&<span style={{color:C.green,marginLeft:6}}>({c.dureeMin} min)</span>}
              </div>
            ))}
            {(()=>{
              const avecDuree   = chargements.filter(c=>c.dureeMin!=null);
              const avecTonnage = chargements.filter(c=>c.tonnage>0);
              if(avecDuree.length<2&&avecTonnage.length<2) return null;
              const moy    = avecDuree.length>1   ? Math.round(avecDuree.reduce((s,c)=>s+c.dureeMin,0)/avecDuree.length)     : null;
              const moyTon = avecTonnage.length>1 ? (avecTonnage.reduce((s,c)=>s+c.tonnage,0)/avecTonnage.length).toFixed(1) : null;
              return (
                <div style={{background:C.bg2,borderRadius:10,padding:"10px 14px",
                  marginBottom:16,border:`1px solid ${C.bd}`,fontSize:12,color:C.tx2,lineHeight:1.8}}>
                  {moy!=null&&<div>⏱ Durée moyenne de chargement : <strong style={{color:C.tx}}>{moy} min</strong></div>}
                  {moyTon!=null&&<div>⚖️ Tonnage moyen par camion : <strong style={{color:C.tx}}>{moyTon} t</strong></div>}
                </div>
              );
            })()}
            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:10}}>
              <BigBtn onClick={()=>{ setHeureDebut(hNow()); setPhase("en_cours"); }} bg="#D85A30" icon="🔄">
                PROCHAIN CAMION
              </BigBtn>
              <button onClick={handleFinChantier} disabled={saving}
                style={{width:"100%",padding:14,borderRadius:12,
                  background:"#1C2B23",border:"none",color:"#fff",
                  fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                  opacity:saving?0.6:1}}>
                {saving?"Clôture en cours…":"🏁 FIN DU CHANTIER"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
export const EcranRoleDechiquetage = ({user, contacts, avisArrivee={}, camionsPartis={}, onArriveeChantier, toast}: any) => {
  const lotsABroyer = contacts.filter((c: any)=>["BORD_ROUTE","A_DECHIQUETER"].includes(c.statutLot));
  const [actif, _setActif] = useState<any>(null);
  const [avisLus, setAvisLus] = useState<Record<string,any>>({});
  const arriveeKey = `applitag_arrivee_op_${user.id||user.nom}`;
  const [arriveeGlobale, setArriveeGlobale] = useState(()=>{try{const s=localStorage.getItem(arriveeKey);return s?JSON.parse(s):null}catch{return null}});
  const [recapOuvert, setRecapOuvert] = useState<any>(null); // "enRoute" | "partis" | null
  const [lotActif, setLotActif] = useState<any>(null); // lot en cours de déchiquetage

  // ── Rendu du flux multi-camions si un lot est actif ──────────────────────
  if (lotActif) return (
    <FluxDechiquetageRole
      lot={lotActif}
      user={user}
      toast={toast}
      onFinChantier={(_lotId: any)=>{
        // Retirer le lot de la liste locale (statut mis à jour côté API)
        setLotActif(null);
      }}
      onRetour={()=>setLotActif(null)}
    />
  );

  const handleArriveeGlobale = () => {
    const h = new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    const val = {heure:h,gpsStatut:"acquisition"};
    setArriveeGlobale(val);
    try{localStorage.setItem(arriveeKey,JSON.stringify(val))} catch { /* noop */ }
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          const coords = {lat:pos.coords.latitude, lng:pos.coords.longitude, precision:Math.round(pos.coords.accuracy)};
          const v2 = {heure:h,gpsStatut:"ok",coords};
          setArriveeGlobale(v2);
          try{localStorage.setItem(arriveeKey,JSON.stringify(v2))} catch { /* noop */ }
          onArriveeChantier&&onArriveeChantier("global", h, coords);
        },
        ()=>{
          const v2 = {heure:h,gpsStatut:"erreur"};
          setArriveeGlobale(v2);
          try{localStorage.setItem(arriveeKey,JSON.stringify(v2))} catch { /* noop */ }
          onArriveeChantier&&onArriveeChantier("global", h, null);
        },
        {enableHighAccuracy:true, timeout:10000}
      );
    } else {
      const v2 = {heure:h,gpsStatut:"indisponible"};
      setArriveeGlobale(v2);
      try{localStorage.setItem(arriveeKey,JSON.stringify(v2))} catch { /* noop */ }
      onArriveeChantier&&onArriveeChantier("global", h, null);
    }
  };
  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40}}>🌀</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Opérations de déchiquetage</div>
      </div>
      {/* ── Boutons récap ── */}
      {(()=>{
        const nbEnRoute = Object.keys(avisArrivee).length;
        const nbPartis  = Object.keys(camionsPartis).length;
        if(nbEnRoute===0&&nbPartis===0) return null;
        return (
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {nbEnRoute>0&&(
              <button onClick={()=>setRecapOuvert((r: any)=>r==="enRoute"?null:"enRoute")}
                style={{flex:1,padding:"10px 8px",borderRadius:12,border:"none",fontFamily:"inherit",
                  fontSize:12,fontWeight:700,cursor:"pointer",
                  background:recapOuvert==="enRoute"?"#FFC107":"#FFF8E1",
                  color:"#E65100"}}>
                🚛 En route ({nbEnRoute})
              </button>
            )}
            {nbPartis>0&&(
              <button onClick={()=>setRecapOuvert((r: any)=>r==="partis"?null:"partis")}
                style={{flex:1,padding:"10px 8px",borderRadius:12,border:"none",fontFamily:"inherit",
                  fontSize:12,fontWeight:700,cursor:"pointer",
                  background:recapOuvert==="partis"?"#A5D6A7":"#E8F5E9",
                  color:"#2E7D32"}}>
                ✅ Chargés &amp; partis ({nbPartis})
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Récap camions en route ── */}
      {recapOuvert==="enRoute"&&(
        <div style={{background:"#FFFDE7",borderRadius:14,padding:14,marginBottom:14,
          border:"1.5px solid #FFE082"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#E65100",marginBottom:10}}>
            🚛 Camions en route vers ce chantier
          </div>
          {Object.entries(avisArrivee).map(([lotId,avis])=>{
            const heure     = avis!=null&&typeof avis==="object" ? (avis as any).heure      : avis;
            const chauffeur = avis!=null&&typeof avis==="object" ? (avis as any).nomChauffeur : "—";
            const capacite  = avis!=null&&typeof avis==="object" ? (avis as any).capaciteM3  : null;
            const lot = contacts.find((c: any)=>c.id===lotId||c.lotId===lotId);
            return (
              <div key={lotId} style={{display:"flex",gap:10,alignItems:"flex-start",
                padding:"8px 0",borderBottom:"1px solid #FFE082"}}>
                <span style={{fontSize:18}}>🚛</span>
                <div style={{flex:1,fontSize:12,lineHeight:1.6}}>
                  <strong>{chauffeur}</strong>
                  {lot&&<span> · lot <strong>{lot.lotNumero}</strong></span>}
                  <br/>
                  Arrivée prévue <strong>{heure}</strong>
                  {capacite&&<span> · <strong>{capacite} m³</strong></span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Récap camions chargés et partis ── */}
      {recapOuvert==="partis"&&(
        <div style={{background:"#F1F8E9",borderRadius:14,padding:14,marginBottom:14,
          border:"1.5px solid #A5D6A7"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#2E7D32",marginBottom:10}}>
            ✅ Camions chargés et partis
          </div>
          {Object.entries(camionsPartis).map(([lotId,info]: any)=>(
            <div key={lotId} style={{display:"flex",gap:10,alignItems:"flex-start",
              padding:"8px 0",borderBottom:"1px solid #C8E6C9"}}>
              <span style={{fontSize:18}}>✅</span>
              <div style={{flex:1,fontSize:12,lineHeight:1.6}}>
                <strong>{info.nomChauffeur||"—"}</strong>
                {info.lotNumero&&<span> · lot <strong>{info.lotNumero}</strong></span>}
                <br/>
                Départ <strong>{info.heureDepart||"—"}</strong>
                {info.capaciteM3&&<span> · <strong>{info.capaciteM3} m³</strong></span>}
                {info.heureDebutCharg&&info.heureFinCharg&&
                  <span style={{color:"#558B2F"}}> · chargement {info.heureDebutCharg}→{info.heureFinCharg}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(avisArrivee).map(([lotId,avis])=>{
        const heure = avis!=null&&typeof avis==="object" ? (avis as any).heure : avis;
        const nomChauffeur = avis!=null&&typeof avis==="object" ? (avis as any).nomChauffeur : "Le chauffeur";
        const capacite = avis!=null&&typeof avis==="object" ? (avis as any).capaciteM3 : null;
        const lot = contacts.find((c: any)=>c.id===lotId||c.lotId===lotId);
        const lu = !!avisLus[lotId];
        return lu ? (
          /* Trace archivée après "Compris" */
          <div key={lotId} style={{background:"#F9FBE7",borderRadius:12,padding:"10px 14px",
            marginBottom:12,border:"1px solid #C5E1A5",
            display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>✅</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#558B2F"}}>
                Avis reçu — {nomChauffeur}
              </div>
              <div style={{fontSize:11,color:"#5D4037",marginTop:2}}>
                Arrivée prévue à <strong>{heure}</strong> · lot <strong>{lot?.lotNumero||lotId}</strong>
                {capacite&&<span> · <strong>{capacite} m³</strong></span>}
              </div>
            </div>
          </div>
        ) : (
          /* Notification active */
          <div key={lotId} style={{background:"#FFF8E1",borderRadius:14,padding:16,
            marginBottom:14,border:"2px solid #FFC107",position:"relative"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#E65100",marginBottom:6}}>
              🚛 Camion en route — arrivée estimée {heure}{capacite?` · capacité ${capacite} m³`:""}
            </div>
            <div style={{fontSize:12,color:"#5D4037",lineHeight:1.6}}>
              <strong>{nomChauffeur}</strong> a confirmé son arrivée sur le lot{lot?" ":""}
              <strong>{lot?.lotNumero||lotId}</strong> pour <strong>{heure}</strong>.
              {capacite&&<span> Capacité véhicule : <strong>{capacite} m³</strong>.</span>}
              {" "}Préparez le chargement.
            </div>
            <button onClick={()=>setAvisLus(p=>({...p,[lotId]:true}))}
              style={{marginTop:10,padding:"7px 14px",borderRadius:8,border:"none",
                background:"#FF8F00",color:"#fff",fontSize:12,fontWeight:600,
                cursor:"pointer",fontFamily:"inherit"}}>
              ✓ Compris
            </button>
          </div>
        );
      })}
      {lotsABroyer.length===0?(
        <div style={{background:C.bg2,borderRadius:14,padding:20,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>✅</div>
          <div style={{fontSize:14,color:C.tx3}}>Aucun lot à déchiqueter actuellement</div>
        </div>
      ):lotsABroyer.map((lot: any)=>(
        <div key={lot.id} style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12,
          border:`1.5px solid ${actif===lot.id?"#D85A30":C.bd}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:"#D85A30"}}>
              {lot.lotNumero}
            </div>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
              background:"#FAECE7",color:"#D85A30",fontWeight:600}}>
              {lot.statutLot==="BORD_ROUTE"?"Bord route":"À déchiqueter"}
            </span>
          </div>
          <div style={{fontSize:12,color:C.tx3,marginBottom:12}}>
            📍 {lot.commune} · ⚖️ {lot.tonnageCumul?fmtNum(lot.tonnageCumul,1):"—"} t
          </div>
          <button onClick={()=>{ if(arriveeGlobale) setLotActif(lot); }}
            disabled={!arriveeGlobale}
            style={{width:"100%",padding:12,borderRadius:10,
              background:arriveeGlobale?"#FAECE7":"#f5f5f5",
              border:`2px solid ${arriveeGlobale?"#D85A30":C.bd}`,
              color:arriveeGlobale?"#D85A30":C.tx3,
              fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
              opacity:arriveeGlobale?1:0.5,
              WebkitTapHighlightColor:"transparent"}}>
            🌀 Démarrer le déchiquetage
          </button>
        </div>
      ))}

      {/* ── Bouton arrivée sur chantier (une seule fois) ou fin du chantier ── */}
      {!arriveeGlobale?(
        <div style={{marginTop:8,marginBottom:24}}>
          <button onClick={handleArriveeGlobale}
            style={{width:"100%",padding:14,borderRadius:12,
              background:C.greenL,border:`2px solid ${C.green}`,color:C.greenD,
              fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
            📍 Arrivé sur chantier
          </button>
        </div>
      ):(()=>{
        const a = arriveeGlobale;
        return (
          <div style={{marginTop:8,marginBottom:24}}>
            {a.gpsStatut==="acquisition"&&(
              <div style={{padding:"8px 12px",borderRadius:8,marginBottom:8,
                background:"#E3F2FD",border:"1px solid #90CAF9",
                fontSize:12,color:"#1565C0",display:"flex",alignItems:"center",gap:6}}>
                <span>📡</span>Acquisition GPS en cours…
              </div>
            )}
            {a.gpsStatut==="ok"&&a.coords&&(
              <div style={{padding:"8px 12px",borderRadius:8,marginBottom:8,
                background:"#E8F5E9",border:"1px solid #A5D6A7",
                fontSize:12,color:"#2E7D32",display:"flex",alignItems:"center",gap:6}}>
                <span>✅</span>Position GPS transmise aux chauffeurs (±{a.coords.precision} m)
              </div>
            )}
            {(a.gpsStatut==="erreur"||a.gpsStatut==="indisponible")&&(
              <div style={{padding:"8px 12px",borderRadius:8,marginBottom:8,
                background:"#FFF8E1",border:"1px solid #FFD54F",
                fontSize:12,color:"#F57F17"}}>
                ⚠️ GPS non disponible — chauffeurs notifiés sans coordonnées
              </div>
            )}
            <button onClick={()=>{
                setArriveeGlobale(null);
                try{localStorage.removeItem(arriveeKey)} catch { /* noop */ }
              }}
              style={{width:"100%",padding:14,borderRadius:12,
                background:"#FFEBEE",border:"2px solid #EF9A9A",color:"#C62828",
                fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
              🏁 Fin du chantier
            </button>
          </div>
        );
      })()}
    </div>
  );
};

