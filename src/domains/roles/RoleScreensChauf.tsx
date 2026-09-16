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
