import { useState, useEffect, useRef } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { todayS } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { apiPost, apiPostPublic } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle } from "../../shared/ui.jsx";
import { generatePdfFromHtml, buildRedHTML } from "../../domains/documents/pdf-templates.js";
import { validateCMR, formatCMR, formatImmat, validateImmat } from "../../shared/validators.js";
import { STATUT_LOT } from "../../domains/screens/MobileScreens.constants.js";
export const EcranRoleMandataire = ({user, contacts, onSelectLot}) => {
  const mesLots = contacts.filter(c=>c.mandataireId===user.id);
  const [selLot, setSelLot] = useState(null);

  if (selLot) {
    const st = STATUT_LOT[selLot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
    return (
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
        <button onClick={()=>setSelLot(null)} style={{background:"none",border:"none",
          color:C.greenD,fontSize:13,cursor:"pointer",padding:"0 0 16px",fontFamily:"inherit",
          display:"flex",alignItems:"center",gap:6}}>
          ← Retour à mes lots
        </button>
        <div style={{background:"#fff",borderRadius:16,padding:20,border:`1px solid ${C.bd}`,
          borderLeft:`4px solid ${st.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:C.greenD}}>
              {selLot.lotNumero}
            </div>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
              background:st.bg,color:st.color,fontWeight:600}}>{st.label}</span>
          </div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>
            👤 {selLot.nom} {selLot.prenom}
          </div>
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            📞 {selLot.telephone}
          </div>
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            📍 {selLot.commune}{selLot.adresseParcelle?` — ${selLot.adresseParcelle}`:""}
          </div>
          {selLot.refCadastrale&&(
            <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
              📋 Réf. cadastrale : {selLot.refCadastrale}
            </div>
          )}
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            🌲 Surface : {selLot.surfaceHa} ha
          </div>
          {selLot.dateVisite&&(
            <div style={{background:C.amberL,borderRadius:10,padding:"10px 14px",
              marginTop:12,border:`1px solid ${C.amber}`,fontSize:13,color:C.amberD,fontWeight:600}}>
              📅 Visite prévue le {new Date(selLot.dateVisite).toLocaleDateString("fr-FR")}
            </div>
          )}
          <div style={{marginTop:16}}>
            <button onClick={()=>onSelectLot&&onSelectLot(selLot)} style={{
              width:"100%",height:50,borderRadius:12,
              background:C.green,border:"none",color:"#fff",
              fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
              ✏️ Saisir la visite terrain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 20px"}}>
        <div style={{fontSize:40}}>🔭</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Lots à visiter qui vous sont attribués</div>
      </div>
      {mesLots.length===0 ? (
        <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
          <div style={{fontSize:32}}>📋</div>
          <div style={{marginTop:8}}>Aucun lot attribué pour le moment</div>
        </div>
      ) : mesLots.map(lot=>{
        const st = STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
        return (
          <div key={lot.id} onClick={()=>setSelLot(lot)}
            style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12,
              border:`1px solid ${C.bd}`,borderLeft:`4px solid ${st.color}`,
              cursor:"pointer",WebkitTapHighlightColor:"transparent",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                color:C.greenD,marginBottom:4}}>{lot.lotNumero}</div>
              <div style={{fontSize:14,fontWeight:600,color:C.tx,marginBottom:2}}>
                👤 {lot.nom} {lot.prenom}
              </div>
              <div style={{fontSize:12,color:C.tx2}}>
                📍 {lot.commune} · 🌲 {lot.surfaceHa} ha
              </div>
              {lot.dateVisite&&(
                <div style={{fontSize:11,color:C.amberD,marginTop:4,fontWeight:600}}>
                  📅 Visite le {new Date(lot.dateVisite).toLocaleDateString("fr-FR")}
                </div>
              )}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
                background:st.bg,color:st.color,fontWeight:600,whiteSpace:"nowrap"}}>
                {st.label}
              </span>
              <span style={{fontSize:18,color:C.tx3}}>›</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const EcranRoleProprietaire = ({user, contacts, visites, reportings=[], livraisons=[], dechiquetages=[]}) => {
  const mesSLots = contacts.filter(c=>c.nom?.toLowerCase()===user.nom?.toLowerCase());

  const today = todayS();

  const dateDebutOperation = (lot, typeMatch) => {
    const dates = reportings
      .filter(r=>(r.lotId===lot.id||r.lotNumero===lot.lotNumero)&&typeMatch(r.typeOperationJour||""))
      .map(r=>r.dateJour).filter(Boolean).sort();
    return dates[0]||null;
  };

  const suiviJour = (lot) => {
    const rToday = reportings.filter(r=>
      (r.lotId===lot.id||r.lotNumero===lot.lotNumero) && (r.dateJour||"").startsWith(today));
    const abattageM3 = rToday
      .filter(r=>["abattage","abattage_debardage"].includes(r.typeOperationJour))
      .reduce((s,r)=>s+(parseFloat(r.volumeJour)||0), 0);
    const debardageM3 = rToday
      .filter(r=>["debardage","abattage_debardage"].includes(r.typeOperationJour))
      .reduce((s,r)=>s+(parseFloat(r.volumeJour)||0), 0);
    const dToday = dechiquetages.filter(d=>
      (d.lotId===lot.id||d.lotNumero===lot.lotNumero) &&
      ((d.dateJour||d.createdAt||"").startsWith(today)));
    const dechiqT  = dToday.reduce((s,d)=>s+(parseFloat(d.tonnageCharge)||0), 0);
    const dechiqM3 = dToday.reduce((s,d)=>s+(parseFloat(d.cubageCharge)||0), 0);
    return {abattageM3, debardageM3, dechiqT, dechiqM3, hasData: abattageM3>0||debardageM3>0||dechiqT>0||dechiqM3>0};
  };

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40}}>🏠</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Suivi de vos parcelles forestières</div>
      </div>
      {mesSLots.length===0?(
        <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
          <div style={{fontSize:32}}>🌲</div>
          <div style={{marginTop:8}}>Aucune parcelle assignée</div>
        </div>
      ):mesSLots.map(lot=>{
        const st=STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
        const visite=visites.find(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);

        const livraisonsChaufferie = livraisons
          .filter(l=>(l.lotId===lot.id||l.lotNumero===lot.lotNumero)&&l.typeDest==="chaufferie")
          .sort((a,b)=>new Date(a.dateHeureLivraison||0)-new Date(b.dateHeureLivraison||0));
        const poidsCumule = livraisonsChaufferie.reduce((s,l)=>s+(parseFloat(l.pesee)||0),0);
        const prixTonne = parseFloat(visite?.prixTonne)||0;
        const sommeDue = poidsCumule*prixTonne;

        const dateAbattage = dateDebutOperation(lot, t=>t.startsWith("abattage"));
        const dateDebardage = dateDebutOperation(lot, t=>t.includes("debardage"));
        const dechiq = dechiquetages.find(d=>d.lotId===lot.id||d.lotNumero===lot.lotNumero);
        const dateDechiquetage = dechiq?.dateJour||dechiq?.date||null;

        return (
          <div key={lot.id} style={{background:"#fff",borderRadius:16,padding:20,
            marginBottom:14,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${st.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.greenD}}>
                {lot.lotNumero}
              </div>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
                background:st.bg,color:st.color,fontWeight:600}}>{st.label}</span>
            </div>
            <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>
              📍 {lot.commune} · 🌲 {lot.surfaceHa} ha
            </div>

            {/* Informations recueillies lors de la visite terrain */}
            {visite&&(
              <div style={{background:C.greenL,borderRadius:10,padding:12,marginBottom:10,
                fontSize:12,color:C.tx,lineHeight:1.8}}>
                <div style={{fontWeight:700,color:C.greenD,marginBottom:4}}>🔭 Visite terrain — {visite.date}</div>
                {visite.essences?.length>0&&<>🌿 {visite.essences.map(e=>`${e.label} (${e.pct}%)`).join(", ")}<br/></>}
                ⚖️ Volume estimé : {fmtNum(visite.volumeEstimeT||0)} t<br/>
                {visite.gps?.lat&&<>🛰️ GPS : {visite.gps.lat.toFixed(5)}°N · {visite.gps.lng.toFixed(5)}°E<br/></>}
                🚛 Accès : {visite.accesCamion==="praticable"?"Praticable":visite.accesCamion==="difficile"?"Difficile":visite.accesCamion||"—"}
              </div>
            )}

            {/* Contrat signé — non modifiable */}
            {(visite?.sigDataProprio||visite?.nomSignProprio)&&(
              <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
                <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:6}}>
                  📄 Contrat signé {prixTonne?`— ${fmtNum(prixTonne,2)} €/t HT`:""}
                </div>
                {visite.sigDataProprio&&(
                  <img src={visite.sigDataProprio} style={{width:120,height:40,objectFit:"contain",
                    background:"#fff",border:`1px solid ${C.bd}`,borderRadius:6}}/>
                )}
                <div style={{fontSize:11,color:C.tx3,marginTop:4}}>
                  Signataire : {visite.nomSignProprio||lot.nom+" "+(lot.prenom||"")}
                </div>
              </div>
            )}

            {/* Dates de début par opération */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:6}}>📅 Démarrage des opérations</div>
              {[
                ["🪓 Abattage",dateAbattage],
                ["🚜 Débardage",dateDebardage],
                ["🌀 Déchiquetage",dateDechiquetage],
              ].map(([l,d])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0"}}>
                  <span style={{color:C.tx2}}>{l}</span>
                  <span style={{fontWeight:600,color:d?C.tx:C.tx3}}>
                    {d?new Date(d).toLocaleDateString("fr-FR"):"Non démarré"}
                  </span>
                </div>
              ))}
            </div>

            {/* Suivi des opérations du jour */}
            {(()=>{
              const s = suiviJour(lot);
              return (
                <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
                  <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:2}}>
                    ⚙️ Suivi des opérations du jour
                  </div>
                  <div style={{fontSize:10,color:C.tx3,fontStyle:"italic",marginBottom:8}}>
                    * Toutes les valeurs sont des estimations
                  </div>
                  {[
                    {icon:"🪓",label:"Abattage",    val:s.abattageM3>0?`${s.abattageM3.toFixed(1)} m³ *`:null, sub:"Volume abattu estimé"},
                    {icon:"🚜",label:"Débardage",   val:s.debardageM3>0?`${s.debardageM3.toFixed(1)} m³ *`:null, sub:"Volume sorti estimé"},
                    {icon:"⚙️",label:"Déchiquetage",
                      val:(s.dechiqT>0||s.dechiqM3>0)
                        ? [s.dechiqT>0&&`${s.dechiqT.toFixed(1)} t`,s.dechiqM3>0&&`${s.dechiqM3.toFixed(1)} m³`].filter(Boolean).join(" · ")+" *"
                        : null,
                      sub:"Tonnage & cubage chargés estimés"},
                  ].map(({icon,label,val,sub})=>(
                    <div key={label} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",fontSize:12,padding:"5px 0",
                      borderBottom:`1px solid ${C.bd}`}}>
                      <div>
                        <span style={{color:C.tx2}}>{icon} {label}</span>
                        <div style={{fontSize:10,color:C.tx3}}>{sub}</div>
                      </div>
                      <span style={{fontWeight:600,color:val?C.greenD:C.tx3}}>{val||"—"}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Timeline statut */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              {[
                {label:"Visite terrain",done:!!visite,icon:"🔭"},
                {label:"Validation exploitation",done:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"✅"},
                {label:"Exploitation en cours",done:["EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🪓"},
                {label:"Bord de route",done:["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🌲"},
                {label:"Lot entièrement livré",done:["LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🔥"},
              ].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"5px 0",fontSize:12,
                  color:s.done?C.greenD:C.tx3,
                  borderBottom:i<4?`1px solid ${C.bd}`:"none"}}>
                  <span style={{fontSize:16}}>{s.done?"✅":"⬜"}</span>
                  <span style={{fontWeight:s.done?600:400}}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Suivi des poids livrés en chaufferie */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:6}}>
                🔥 Poids livrés en chaufferie
              </div>
              {livraisonsChaufferie.length===0?(
                <div style={{fontSize:12,color:C.tx3}}>Aucune livraison enregistrée à ce jour</div>
              ):livraisonsChaufferie.map((l,i)=>(
                <div key={l.id||i} style={{display:"flex",justifyContent:"space-between",
                  fontSize:12,padding:"4px 0",borderBottom:`1px solid ${C.bd}`}}>
                  <span style={{color:C.tx2}}>
                    {l.dateHeureLivraison?new Date(l.dateHeureLivraison).toLocaleDateString("fr-FR"):"—"}
                  </span>
                  <span style={{fontWeight:600,color:C.tx}}>{fmtNum(parseFloat(l.pesee)||0)} t</span>
                </div>
              ))}
            </div>

            {/* Total cumulé et somme due */}
            {(poidsCumule>0||prixTonne>0)&&(
              <div style={{background:C.greenL,borderRadius:10,padding:12,
                fontSize:12,color:C.greenD}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span>Poids cumulé livré</span>
                  <strong>{fmtNum(poidsCumule)} t</strong>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span>Prix d'achat</span>
                  <strong>{prixTonne?fmtNum(prixTonne,2)+" €/t HT":"—"}</strong>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,
                  borderTop:`1px solid ${C.green}`,fontSize:14,fontWeight:700}}>
                  <span>Total dû à ce jour</span>
                  <span>{fmtNum(sommeDue,2)} €</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const EcranRoleChauffeur = ({user, transports=[], dechiquetages=[], gpsChantier={}, onValiderArrivee, onValiderDepart}) => {
  const mesTransports = transports.filter(t=>t.nomChauffeur?.toLowerCase().includes(user.nom.toLowerCase()));
  const [confirmed, setConfirmed] = useState({});
  const [heuresArriveeEst, setHeuresArriveeEst] = useState({});
  const [heuresValidees, setHeuresValidees] = useState({});
  const [heuresArriveSite, setHeuresArriveSite] = useState({});
  const [heuresDebutCharg, setHeuresDebutCharg] = useState({});
  const [heuresFinCharg, setHeuresFinCharg] = useState({});
  const [justifModal, setJustifModal] = useState(null); // {tid, dureeMin}
  const [justifChoix, setJustifChoix] = useState("");
  const [justifTexte, setJustifTexte] = useState("");
  const [justifValidees, setJustifValidees] = useState({});

  // Prise de poste : capacité véhicule
  const storageKey = `applitag_capacite_${user.id||user.nom}`;
  const [capaciteM3, setCapaciteM3] = useState(()=>{try{return localStorage.getItem(storageKey)||""}catch{return ""}});
  const [capaciteSaisie, setCapaciteSaisie] = useState("");
  const [posteValide, setPosteValide] = useState(()=>{try{return !!localStorage.getItem(storageKey)}catch{return false}});

  // Bloquer le retour arrière navigateur quand "DÉBUT DE CHARGEMENT" est en attente
  const blockingTransportId = mesTransports.find(t=>confirmed[t.id+"arrivePlace"]&&!heuresDebutCharg[t.id])?.id||null;
  useEffect(()=>{
    if(!blockingTransportId) return;
    window.history.pushState({chargBloque:true},"");
    const handler=(e)=>{
      if(e.state?.chargBloque===undefined){
        window.history.pushState({chargBloque:true},"");
      }
    };
    window.addEventListener("popstate",handler);
    return ()=>window.removeEventListener("popstate",handler);
  },[blockingTransportId]);

  const getNow=()=>{const n=new Date();return String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");};
  const diffMin=(h1,h2)=>{
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
        mesTransports.map(t=>(
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
              const dech = dechiquetages.find(d=>d.lotId===t.lotId && d.operateurDechiquetage);
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
                              <a href={mapsUrl} target="_blank" rel="noreferrer"
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
const FluxDechiquetageRole = ({lot, user, onFinChantier, onRetour, toast}) => {
  // phase: demarrage | en_cours | saisie_fin | entre_camions | cloture
  const [phase,        setPhase]       = useState("demarrage");
  const [machine,      setMachine]     = useState(()=>{ try { return localStorage.getItem(`applitag_dech_machine_${user?.id||""}`)||""; } catch { return ""; } });
  const [heureDebut,   setHeureDebut]  = useState("");
  const [dateDebut,    setDateDebut]   = useState("");
  const [chargements,  setChargements] = useState([]); // [{type,cubage,tonnage,cmr,immatTract,immatRemor,heureFin}]
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
  const chronoRef = useRef(null);

  useEffect(()=>{
    if(phase==="en_cours"){
      chronoRef.current = setInterval(()=>setChrono(s=>s+1), 1000);
    } else {
      clearInterval(chronoRef.current);
      if(phase==="demarrage") setChrono(0);
    }
    return ()=>clearInterval(chronoRef.current);
  },[phase]);

  const fmtChrono = (s) => {
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
      await apiPostPublic(`/messages-admin`, { type:"fin_chantier_dechiquetage", lotId:lot.id, lotNumero:lot.lotNumero,
        operateurDechiquetage:operateurNom, machine,
        nbCamions:chargements.length,
        tonnageTotal:payload.tonnageTotal.toFixed(1),
        message:`Chantier de déchiquetage terminé sur le lot ${lot.lotNumero}. ${chargements.length} camion(s) chargé(s), ${payload.tonnageTotal.toFixed(1)} t au total. Réception à effectuer.`,
        date:new Date().toISOString() });
    } catch(e) {
      toast&&toast(`Erreur enregistrement chantier — ${e.message||"vérifiez la connexion"}`, "warn");
      setSaving(false);
      return;
    }
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
          <MInput label="Numéro CMR" value={cmr} onChange={v=>setCmr(formatCMR(v))} placeholder="CMR-2026-0001" hint="CMR-AAAA-NNNN" required error={cmr?validateCMR(cmr):null}/>
          <MInput label="Immat. tracteur" value={immatTract} onChange={v=>setImmatTract(formatImmat(v))} placeholder="AB-123-CD" error={immatTract?validateImmat(immatTract):null}/>
          <MInput label="Immat. remorque" value={immatRemor} onChange={v=>setImmatRemor(formatImmat(v))} placeholder="EF-456-GH" error={immatRemor?validateImmat(immatRemor):null}/>
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
export const EcranRoleDechiquetage = ({user, contacts, _onLaunchDechiquetage, avisArrivee={}, camionsPartis={}, onArriveeChantier, toast}) => {
  const lotsABroyer = contacts.filter(c=>["BORD_ROUTE","A_DECHIQUETER"].includes(c.statutLot));
  const [actif, _setActif] = useState(null);
  const [avisLus, setAvisLus] = useState({});
  const arriveeKey = `applitag_arrivee_op_${user.id||user.nom}`;
  const [arriveeGlobale, setArriveeGlobale] = useState(()=>{try{const s=localStorage.getItem(arriveeKey);return s?JSON.parse(s):null}catch{return null}});
  const [recapOuvert, setRecapOuvert] = useState(null); // "enRoute" | "partis" | null
  const [lotActif, setLotActif] = useState(null); // lot en cours de déchiquetage

  // ── Rendu du flux multi-camions si un lot est actif ──────────────────────
  if (lotActif) return (
    <FluxDechiquetageRole
      lot={lotActif}
      user={user}
      toast={toast}
      onFinChantier={(_lotId)=>{
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
  const _avisActifs = Object.entries(avisArrivee).filter(([lotId])=>!avisLus[lotId]);
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
              <button onClick={()=>setRecapOuvert(r=>r==="enRoute"?null:"enRoute")}
                style={{flex:1,padding:"10px 8px",borderRadius:12,border:"none",fontFamily:"inherit",
                  fontSize:12,fontWeight:700,cursor:"pointer",
                  background:recapOuvert==="enRoute"?"#FFC107":"#FFF8E1",
                  color:"#E65100"}}>
                🚛 En route ({nbEnRoute})
              </button>
            )}
            {nbPartis>0&&(
              <button onClick={()=>setRecapOuvert(r=>r==="partis"?null:"partis")}
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
            const heure     = typeof avis==="object" ? avis.heure      : avis;
            const chauffeur = typeof avis==="object" ? avis.nomChauffeur : "—";
            const capacite  = typeof avis==="object" ? avis.capaciteM3  : null;
            const lot = contacts.find(c=>c.id===lotId||c.lotId===lotId);
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
          {Object.entries(camionsPartis).map(([lotId,info])=>(
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
        const heure = typeof avis==="object" ? avis.heure : avis;
        const nomChauffeur = typeof avis==="object" ? avis.nomChauffeur : "Le chauffeur";
        const capacite = typeof avis==="object" ? avis.capaciteM3 : null;
        const lot = contacts.find(c=>c.id===lotId||c.lotId===lotId);
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
      ):lotsABroyer.map(lot=>(
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

// ── ENTREPRISE SOLLICITÉE ─────────────────────────────────────────────────────
const FONCTIONS_ETF = [
  {value:"abattage",      label:"Opérateur abattage"},
  {value:"debardage",     label:"Porteur / débardage"},
  {value:"dechiquetage",  label:"Opérateur déchiquetage"},
  {value:"chauffeur",     label:"Chauffeur camion"},
];

export const EcranEntrepriseSollicitee = ({user, lots=[], toast}) => {
  const storageKey = `applitag_etf_operateurs_${user.id}`;
  const [operateurs, setOperateurs] = useState(()=>{
    try{const s=localStorage.getItem(storageKey);return s?JSON.parse(s):[]}catch{return[]}
  });
  const [showForm, setShowForm] = useState(false);
  const [nom,      setNom]      = useState("");
  const [prenom,   setPrenom]   = useState("");
  const [fonction, setFonction] = useState("abattage");
  const [lotId,    setLotId]    = useState("");

  const lotsEtf = lots.filter(l=>
    l.etfNom===(user.nomEntreprise||user.nom) ||
    l.etfId===user.id
  );

  const save = (list) => {
    setOperateurs(list);
    try{localStorage.setItem(storageKey,JSON.stringify(list))} catch { /* noop */ }
  };

  const handleAjouter = () => {
    if(!nom.trim()||!prenom.trim()||!lotId){
      toast("Renseignez nom, prénom et lot assigné","warn"); return;
    }
    const nouvel = {
      id: Date.now().toString(),
      nom: nom.trim(), prenom: prenom.trim(),
      fonction, lotId,
      lotNumero: lots.find(l=>l.id===lotId)?.lotNumero||lotId,
      dateCreation: new Date().toLocaleDateString("fr-FR"),
    };
    save([...operateurs, nouvel]);
    setNom(""); setPrenom(""); setFonction("abattage"); setLotId("");
    setShowForm(false);
    toast("Opérateur ajouté ✓");
  };

  const handleSupprimer = (id) => save(operateurs.filter(o=>o.id!==id));

  const fonctionLabel = (v) => FONCTIONS_ETF.find(f=>f.value===v)?.label||v;

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40,marginBottom:8}}>🏢</div>
        <div style={{fontSize:18,fontWeight:700}}>{user.nomEntreprise||user.prenom+" "+user.nom}</div>
        <div style={{fontSize:12,color:C.tx3,marginTop:4,lineHeight:1.6,maxWidth:300,margin:"6px auto 0"}}>
          Espace réservé aux entreprises de travaux forestiers mandatées pour intervenir sur chantier.
          Déléguez vos missions à vos opérateurs.
        </div>
      </div>

      {/* Lots attribués */}
      {lotsEtf.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:C.tx2,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>
            Lots attribués à votre entreprise
          </div>
          {lotsEtf.map(lot=>(
            <div key={lot.id} style={{background:"#fff",borderRadius:12,padding:"10px 14px",
              marginBottom:8,border:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.purpleD}}>{lot.lotNumero}</div>
                <div style={{fontSize:11,color:C.tx3,marginTop:2}}>📍 {lot.commune} · {lot.surfaceHa} ha</div>
              </div>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                background:"#EDE7F6",color:C.purpleD,fontWeight:600}}>
                {operateurs.filter(o=>o.lotId===lot.id).length} opér.
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Liste opérateurs */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.tx2,textTransform:"uppercase",letterSpacing:".5px"}}>
          Opérateurs créés ({operateurs.length})
        </div>
        <button onClick={()=>setShowForm(s=>!s)}
          style={{padding:"6px 14px",borderRadius:20,border:"none",
            background:C.purpleD,color:"#fff",fontSize:12,fontWeight:600,
            cursor:"pointer",fontFamily:"inherit"}}>
          {showForm?"✕ Annuler":"+ Ajouter"}
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm&&(
        <div style={{background:"#F3F0FF",borderRadius:14,padding:16,marginBottom:16,
          border:"1.5px solid #B39DDB"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.purpleD,marginBottom:12}}>
            Nouvel opérateur
          </div>
          <MInput label="Prénom" value={prenom} onChange={setPrenom} placeholder="ex : Pierre"/>
          <MInput label="Nom" value={nom} onChange={setNom} placeholder="ex : Dupont"/>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Fonction</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {FONCTIONS_ETF.map(f=>(
                <button key={f.value} onClick={()=>setFonction(f.value)}
                  style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${fonction===f.value?C.purpleD:C.bd}`,
                    background:fonction===f.value?"#EDE7F6":"#fff",
                    color:fonction===f.value?C.purpleD:C.tx,
                    fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Lot assigné</div>
            <select value={lotId} onChange={e=>setLotId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,
                border:`1.5px solid ${C.bd}`,background:"#fff",
                fontFamily:"inherit",fontSize:13,color:C.tx}}>
              <option value="">— Choisir un lot —</option>
              {lotsEtf.length>0
                ? lotsEtf.map(l=><option key={l.id} value={l.id}>{l.lotNumero} · {l.commune}</option>)
                : lots.map(l=><option key={l.id} value={l.id}>{l.lotNumero} · {l.commune}</option>)
              }
            </select>
          </div>
          <button onClick={handleAjouter}
            style={{width:"100%",padding:13,borderRadius:12,border:"none",
              background:C.purpleD,color:"#fff",fontSize:14,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit"}}>
            ✅ Créer l'opérateur
          </button>
        </div>
      )}

      {/* Liste */}
      {operateurs.length===0?(
        <div style={{background:C.bg2,borderRadius:14,padding:20,textAlign:"center",color:C.tx3,fontSize:13}}>
          Aucun opérateur créé pour l'instant.<br/>Appuyez sur "+ Ajouter" pour commencer.
        </div>
      ):operateurs.map(op=>(
        <div key={op.id} style={{background:"#fff",borderRadius:14,padding:"12px 14px",
          marginBottom:10,border:`1px solid ${C.bd}`,
          display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:20,background:"#EDE7F6",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,flexShrink:0}}>
            👷
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700}}>{op.prenom} {op.nom}</div>
            <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
              {fonctionLabel(op.fonction)} · {op.lotNumero}
            </div>
          </div>
          <button onClick={()=>handleSupprimer(op.id)}
            style={{background:"none",border:"none",color:"#EF9A9A",
              fontSize:18,cursor:"pointer",padding:4}}>
            ✕
          </button>
        </div>
      ))}
      <div style={{height:32}}/>
    </div>
  );
};

export const EcranRoleChaufferie = ({user, livraisons=[]}) => {
  const [confirmee, setConfirmee] = useState({});
  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40}}>🔥</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Réception chaufferie</div>
      </div>
      {/* Stats rapides */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[
          [livraisons.filter(l=>l.typeDest==="chaufferie").length+" liv.","Livraisons reçues"],
          [fmtNum(livraisons.reduce((s,l)=>s+(parseFloat(l.pesee)||0),0),1)+" t","Tonnage reçu"],
        ].map(([v,l],i)=>(
          <div key={i} style={{background:i===0?C.greenL:C.amberL,borderRadius:12,padding:14,
            border:`1px solid ${i===0?C.green:C.amber}`}}>
            <div style={{fontSize:20,fontWeight:700,color:i===0?C.greenD:C.amberD}}>{v}</div>
            <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      {livraisons.map((l,i)=>(
        <div key={l.id||i} style={{background:"#fff",borderRadius:14,padding:16,marginBottom:10,
          border:`1.5px solid ${confirmee[l.id]?C.green:C.bd}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD}}>
              {l.lotNumero}
            </div>
            <div style={{fontSize:11,color:C.tx3}}>
              {l.dateHeureLivraison?.slice(0,10)}
            </div>
          </div>
          <div style={{fontSize:12,color:C.tx3,lineHeight:1.8,marginBottom:12}}>
            ⚖️ {l.pesee} t · 💧 {l.humiditeReception}% humidité<br/>
            📄 CMR : {l.numeroCMR||"—"}<br/>
            👤 {l.nomReceptionnaire}
          </div>
          <div style={{
            padding:"8px 12px",borderRadius:8,textAlign:"center",fontSize:12,fontWeight:600,
            background:l.humiditeReception<=30?C.greenL:l.humiditeReception<=45?C.amberL:C.redL,
            color:l.humiditeReception<=30?C.greenD:l.humiditeReception<=45?C.amberD:C.red,
            marginBottom:confirmee[l.id]?0:10}}>
            {l.humiditeReception<=30?"✅ Qualité conforme":l.humiditeReception<=45?"⚠️ Humidité élevée":"🔴 Hors normes"}
          </div>
          {!confirmee[l.id]&&(
            <button onClick={()=>setConfirmee(p=>({...p,[l.id]:true}))}
              style={{width:"100%",padding:12,borderRadius:10,
                background:C.green,color:"#fff",border:"none",
                fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
              ✅ Confirmer réception
            </button>
          )}
        </div>
      ))}
      {livraisons.length===0&&(
        <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
          <div style={{fontSize:32}}>⏳</div>
          <div style={{marginTop:8}}>Aucune livraison en attente</div>
        </div>
      )}
    </div>
  );
};

// ── RÉCEPTIONNAIRE PLATEFORME DE STOCKAGE ─────────────────────
export const EcranRoleReceptionnaire = ({user, livraisons=[], contacts=[], visites=[], toast}) => {
  const [onglet, setOnglet] = useState("attente"); // "attente" | "stock" | "historique"
  const [humidite, setHumidite] = useState({});
  const [confirmes, setConfirmes] = useState({});
  const [lotStockSelec, setLotStockSelec] = useState(null); // lot contact ouvert dans "En stock"
  const [rechercheHisto, setRechercheHisto] = useState("");

  const platLivs = livraisons.filter(l=>l.typeDest==="plateforme");
  const enAttente = platLivs.filter(l=>!l.statut||l.statut==="en_attente");
  const recues    = platLivs.filter(l=>l.statut==="recu"||confirmes[l.id]);
  const enStock   = contacts.filter(c=>["BORD_ROUTE","A_DECHIQUETER","EN_STOCK_PLATEFORME"].includes(c.statutLot));
  const tonnageStock = platLivs.filter(l=>l.statut==="recu"||confirmes[l.id]).reduce((s,l)=>s+(parseFloat(l.pesee)||0),0);
  const tonnageRecus = recues.reduce((s,l)=>s+(parseFloat(l.pesee)||0),0);

  const handleConfirmer = (l) => {
    setConfirmes(p=>({...p,[l.id]:true}));
    toast("Réception enregistrée ✓");
  };

  const enAttenteVisibles = enAttente.filter(l=>!confirmes[l.id]);
  const tabs = [
    {id:"attente",   label:"En attente",  badge:enAttenteVisibles.length},
    {id:"stock",     label:"En stock",    badge:enStock.length},
    {id:"historique",label:"Historique",  badge:null},
  ];

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"20px 0 14px"}}>
        <div style={{fontSize:36}}>🏗️</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:6}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:12,color:C.tx3,marginTop:3}}>Plateforme de stockage bois énergie</div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[
          [enAttenteVisibles.length+" lot"+(enAttenteVisibles.length>1?"s":""),"En attente","#E3F2FD","#1565C0"],
          [fmtNum(tonnageStock,1)+" t","En stock","#E8F5E9",C.greenD],
          [fmtNum(tonnageRecus,1)+" t","Reçu total",C.amberL,C.amberD],
        ].map(([v,l,bg,tc],i)=>(
          <div key={i} style={{background:bg,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:tc}}>{v}</div>
            <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setOnglet(t.id)} style={{
            flex:1,padding:"9px 0",borderRadius:10,fontSize:12,fontWeight:onglet===t.id?700:400,
            border:`1.5px solid ${onglet===t.id?"#1565C0":C.bd}`,
            background:onglet===t.id?"#E3F2FD":"#fff",
            color:onglet===t.id?"#1565C0":C.tx2,
            cursor:"pointer",fontFamily:"inherit",position:"relative",
            WebkitTapHighlightColor:"transparent"}}>
            {t.label}
            {t.badge>0&&<span style={{position:"absolute",top:-5,right:-5,
              background:"#1565C0",color:"#fff",fontSize:9,fontWeight:700,
              borderRadius:"50%",width:16,height:16,display:"flex",
              alignItems:"center",justifyContent:"center"}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Livraisons en attente */}
      {onglet==="attente"&&(
        <div>
          {enAttente.length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>✅</div>
              <div style={{marginTop:8}}>Aucune livraison en attente</div>
            </div>
          )}
          {enAttente.filter(l=>!confirmes[l.id]).map((l,i)=>{
            const h = humidite[l.id]||"";
            const visite = visites.find(v=>v.lotId===l.lotId);
            const isRed = visite?.certification==="red";
            return (
              <div key={l.id||i} style={{background:"#fff",borderRadius:14,padding:16,
                marginBottom:12,border:`2px solid ${isRed?"#E65100":"#1565C0"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                      color:isRed?"#E65100":"#1565C0"}}>
                      {l.lotNumero}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:1}}>🌿 Plaquettes forestières</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {isRed&&(
                      <div style={{background:"#FFF3E0",color:"#E65100",padding:"3px 8px",
                        borderRadius:6,fontSize:10,fontWeight:700,
                        border:"1px solid #E65100"}}>⚡ RED</div>
                    )}
                    {!isRed&&visite&&(
                      <div style={{background:C.bg2,color:C.tx3,padding:"3px 8px",
                        borderRadius:6,fontSize:10,fontWeight:600}}>Hors RED</div>
                    )}
                    <div style={{background:"#E3F2FD",color:"#1565C0",padding:"3px 8px",
                      borderRadius:6,fontSize:10,fontWeight:600}}>⏳ En attente</div>
                  </div>
                </div>
                {isRed&&(
                  <div style={{background:"#FFF3E0",border:"1px solid #E65100",borderRadius:8,
                    padding:"8px 10px",marginBottom:10,fontSize:11,color:"#BF360C",lineHeight:1.5}}>
                    ⚡ <strong>Lot soumis à la directive RED</strong> — traçabilité renforcée requise.
                    Conservez le CMR et les documents de durabilité.
                    {visite?.numeroCertification&&<> · Certif. {visite.certification?.toUpperCase()} n° {visite.numeroCertification}</>}
                  </div>
                )}
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.9,marginBottom:12}}>
                  🚛 CMR : {l.numeroCMR||"—"}<br/>
                  ⚖️ Pesée transport : <strong style={{color:C.tx}}>{l.pesee} t</strong><br/>
                  📅 {new Date(l.dateHeureLivraison).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:6}}>
                    💧 Taux d'humidité à réception (%)
                  </div>
                  <input type="number" min={0} max={100} value={h}
                    onChange={e=>setHumidite(p=>({...p,[l.id]:e.target.value}))}
                    placeholder="Ex : 28"
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${h?C.green:C.bd}`,fontFamily:"inherit",
                      background:"#fff",boxSizing:"border-box"}}/>
                  {h&&(
                    <div style={{fontSize:11,marginTop:4,fontWeight:600,
                      color:h<=30?C.greenD:h<=45?C.amberD:C.red}}>
                      {h<=30?"✅ Conforme":h<=45?"⚠️ Humidité élevée":"🔴 Hors normes (>45%)"}
                    </div>
                  )}
                </div>
                <button onClick={()=>handleConfirmer(l)}
                  disabled={!h}
                  style={{width:"100%",padding:13,borderRadius:10,
                    background:h?"#1565C0":C.bg2,color:h?"#fff":C.tx3,
                    border:"none",fontFamily:"inherit",fontSize:14,fontWeight:700,
                    cursor:h?"pointer":"not-allowed",
                    WebkitTapHighlightColor:"transparent"}}>
                  ✅ Confirmer la réception
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Lots en stock */}
      {onglet==="stock"&&!lotStockSelec&&(
        <div>
          {enStock.length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>📦</div>
              <div style={{marginTop:8}}>Aucun lot en stock actuellement</div>
            </div>
          )}
          {enStock.map(c=>{
            const entrees = platLivs.filter(l=>l.lotId===c.id&&(l.statut==="recu"||confirmes[l.id]));
            const tonnageLot = entrees.reduce((s,l)=>s+(parseFloat(l.pesee)||0),0);
            return (
              <div key={c.id} onClick={()=>setLotStockSelec(c)}
                style={{background:"#fff",borderRadius:14,padding:14,marginBottom:10,
                  border:`1.5px solid ${C.bd}`,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD}}>
                      {c.lotNumero}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:1}}>🌿 Plaquettes forestières</div>
                  </div>
                  <span style={{fontSize:18,color:C.tx3}}>›</span>
                </div>
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                  👤 {c.prenom} {c.nom} · 📍 {c.commune}<br/>
                  📦 {entrees.length} entrée{entrees.length>1?"s":""} · ⚖️ {fmtNum(tonnageLot||c.tonnageCumul||0,1)} t stockées
                </div>
              </div>
            );
          })}
          <div style={{background:C.greenL,borderRadius:12,padding:"12px 14px",
            border:`1px solid ${C.green}`,textAlign:"center",marginTop:4}}>
            <div style={{fontSize:15,fontWeight:700,color:C.greenD}}>{fmtNum(tonnageStock,1)} t</div>
            <div style={{fontSize:11,color:C.tx3,marginTop:2}}>Tonnage total en stock plateforme</div>
          </div>
        </div>
      )}

      {/* Détail entrées d'un lot en stock */}
      {onglet==="stock"&&lotStockSelec&&(
        <div>
          <button onClick={()=>setLotStockSelec(null)}
            style={{background:"none",border:"none",color:"#1565C0",cursor:"pointer",
              fontSize:13,fontWeight:600,padding:"0 0 12px",fontFamily:"inherit"}}>
            ← Retour au stock
          </button>
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:12,
            border:`1.5px solid ${C.green}`}}>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.greenD,marginBottom:4}}>
              {lotStockSelec.lotNumero}
            </div>
            <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
              🌿 Plaquettes forestières<br/>
              👤 {lotStockSelec.prenom} {lotStockSelec.nom} · 📍 {lotStockSelec.commune}<br/>
              🌲 {lotStockSelec.surfaceHa} ha
            </div>
          </div>
          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
            Historique des entrées
          </div>
          {platLivs.filter(l=>l.lotId===lotStockSelec.id&&(l.statut==="recu"||confirmes[l.id])).length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"24px 0",fontSize:13}}>
              Aucune entrée enregistrée pour ce lot
            </div>
          )}
          {platLivs.filter(l=>l.lotId===lotStockSelec.id&&(l.statut==="recu"||confirmes[l.id])).map((l,i)=>(
            <div key={l.id||i} style={{background:"#fff",borderRadius:12,padding:14,
              marginBottom:8,border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tx}}>Entrée {i+1}</div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.tx3}}>
                    {new Date(l.dateHeureLivraison).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx2}}>
                    {new Date(l.dateHeureLivraison).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                ⚖️ {l.pesee} t · 💧 {l.humiditeReception??humidite[l.id]??"—"}%<br/>
                📄 CMR : {l.numeroCMR||"—"}
              </div>
              <div style={{marginTop:6,fontSize:11,fontWeight:600,
                color:(l.humiditeReception||humidite[l.id])<=30?C.greenD
                  :(l.humiditeReception||humidite[l.id])<=45?C.amberD:C.red}}>
                {(l.humiditeReception||humidite[l.id])<=30?"✅ Conforme"
                  :(l.humiditeReception||humidite[l.id])<=45?"⚠️ Humidité élevée":"🔴 Hors normes"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historique */}
      {onglet==="historique"&&(
        <div>
          <div style={{position:"relative",marginBottom:12}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",
              fontSize:15,pointerEvents:"none"}}>🔍</span>
            <input
              type="text"
              value={rechercheHisto}
              onChange={e=>setRechercheHisto(e.target.value)}
              placeholder="Rechercher par n° de lot…"
              style={{width:"100%",padding:"10px 12px 10px 36px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${rechercheHisto?C.green:C.bd}`,fontFamily:"inherit",
                background:"#fff",boxSizing:"border-box",color:C.tx}}/>
            {rechercheHisto&&(
              <button onClick={()=>setRechercheHisto("")}
                style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",cursor:"pointer",fontSize:15,color:C.tx3,
                  padding:0,lineHeight:1}}>✕</button>
            )}
          </div>
          {recues.filter(l=>!rechercheHisto||l.lotNumero?.toLowerCase().includes(rechercheHisto.toLowerCase())).length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>{rechercheHisto?"🔍":"📋"}</div>
              <div style={{marginTop:8}}>{rechercheHisto?"Aucun lot trouvé":"Aucune réception enregistrée"}</div>
            </div>
          )}
          {recues.filter(l=>!rechercheHisto||l.lotNumero?.toLowerCase().includes(rechercheHisto.toLowerCase())).map((l,i)=>(
            <div key={l.id||i} style={{background:"#fff",borderRadius:12,padding:14,
              marginBottom:8,border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.greenD}}>
                  {l.lotNumero}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.tx3}}>
                    {new Date(l.dateHeureLivraison).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx2,marginTop:1}}>
                    {new Date(l.dateHeureLivraison).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                ⚖️ {l.pesee} t · 💧 {l.humiditeReception??humidite[l.id]??"—"}% · 📄 {l.numeroCMR}
              </div>
              <div style={{marginTop:6,fontSize:11,fontWeight:600,
                color:(l.humiditeReception||humidite[l.id])<=30?C.greenD:(l.humiditeReception||humidite[l.id])<=45?C.amberD:C.red}}>
                {(l.humiditeReception||humidite[l.id])<=30?"✅ Conforme":(l.humiditeReception||humidite[l.id])<=45?"⚠️ Humidité élevée":"🔴 Hors normes"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const EcranAutoDeclarationRED = ({lot, visites, transports=[], livraisons=[], onBack, toast}) => {
  const visite    = visites.find(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
  const transport = transports.find(t=>t.lotId===lot.id||t.lotNumero===lot.lotNumero);
  const livraison = livraisons.find(l=>l.lotId===lot.id||l.lotNumero===lot.lotNumero);

  const tonnage = parseFloat(livraison?.pesee||visite?.volumeEstimeT||0);
  // Seuil 500 t/an → auto-déclaration, sinon déclaration durabilité
  const typeAuto = tonnage<=500 ? "auto" : "durabilite";
  const [typeDecl, setTypeDecl] = useState(typeAuto);
  const [generating, setGen]    = useState(false);

  const handleGenerer = () => {
    setGen(true);
    const html = buildRedHTML(lot, visite, transport, livraison, typeDecl);
    generatePdfFromHtml(html, `AutoDeclarationRED_${lot.lotNumero||"APPLITAG"}.pdf`, toast, ()=>setGen(false));
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#185FA5",color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.1)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>🇪🇺 Déclaration RED</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero} · Biomasse bois-énergie</div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>

        {/* Seuil tonnage */}
        <div style={{background:C.blueL,borderRadius:14,padding:16,marginBottom:16,
          border:`1.5px solid ${C.blue}`}}>
          <div style={{fontSize:13,fontWeight:700,color:C.blueD,marginBottom:8}}>
            📊 Données du lot
          </div>
          <div style={{fontSize:12,color:C.tx3,lineHeight:1.9}}>
            🌲 Lot : {lot.lotNumero} · {lot.commune}<br/>
            📍 GPS : {visite?.gps?`${visite.gps.lat.toFixed(4)}°N`:"Non renseigné"}<br/>
            ⚖️ Tonnage : {tonnage>0?tonnage+" t":"Non renseigné"}<br/>
            🏭 Destination : {livraison?.nomDestination||"Non renseignée"}<br/>
            📏 Distance : {visite?.redDistance||"—"} km
          </div>
        </div>

        {/* Sélection type */}
        <SectionTitle icon="📋" label="Type de déclaration RED"/>
        <div style={{background:C.amberL,borderRadius:12,padding:12,marginBottom:14,
          border:`1px solid ${C.amber}`,fontSize:11,color:C.amberD,lineHeight:1.6}}>
          ℹ️ Seuil légal : &lt;500 t/an → Auto-déclaration · ≥500 t/an → Déclaration durabilité (audit tiers requis).<br/>
          Tonnage actuel : <strong>{tonnage>0?tonnage+" t":"non renseigné"}</strong>
          {tonnage>0&&` → ${tonnage<=500?"Auto-déclaration applicable":"Déclaration durabilité recommandée"}`}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {[
            ["auto","📝","Auto-déclaration","Lots < 500 t/an · Déclaration sur l'honneur",tonnage<=500||tonnage===0],
            ["durabilite","🔍","Déclaration de durabilité","Lots ≥ 500 t/an · Audit tiers requis",tonnage>=500],
            ["pos","🔗","Preuve de durabilité (PoS)","Transfert entre opérateurs de la chaîne",false],
          ].map(([v,e,l,s,recommande])=>(
            <div key={v} onClick={()=>setTypeDecl(v)} style={{
              padding:14,borderRadius:14,cursor:"pointer",
              border:`2px solid ${typeDecl===v?C.blue:C.bd}`,
              background:typeDecl===v?C.blueL:"#fff",
              WebkitTapHighlightColor:"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24}}>{e}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:typeDecl===v?700:500,
                    color:typeDecl===v?C.blueD:C.tx}}>
                    {l}
                    {recommande&&<span style={{fontSize:10,marginLeft:8,
                      background:C.green,color:"#fff",padding:"1px 6px",
                      borderRadius:4,fontWeight:600}}>Recommandé</span>}
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{s}</div>
                </div>
                {typeDecl===v&&<span style={{color:C.blue,fontSize:20}}>●</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Checklist avant génération */}
        <SectionTitle icon="✅" label="Données requises"/>
        {[
          [!!visite?.gps,        "GPS parcelle capturé"],
          [!!visite?.essences?.length,"Essences renseignées"],
          [!!(visite?.volumeEstimeT||livraison?.pesee),"Tonnage renseigné"],
          [!!lot.commune,        "Commune renseignée"],
          [!!(visite?.redDistance||visite?.certification==="red"),"Données RED (certification visite)"],
          [!!livraison,          "Livraison enregistrée"],
        ].map(([ok,label],i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,
            padding:"8px 0",borderBottom:`0.5px solid ${C.bd}`,
            color:ok?C.greenD:C.tx3}}>
            <span style={{fontSize:18,width:22}}>{ok?"✅":"⬜"}</span>
            <span style={{fontSize:13,fontWeight:ok?500:400}}>{label}</span>
          </div>
        ))}

        <div style={{background:C.blueL,borderRadius:12,padding:14,marginTop:14,
          border:`1px solid ${C.blue}`}}>
          <div style={{fontSize:12,color:C.blueD,lineHeight:1.7}}>
            ℹ️ Le document s'ouvrira dans un nouvel onglet.<br/>
            Utilisez <strong>Imprimer → Enregistrer en PDF</strong> pour archiver.
          </div>
        </div>
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleGenerer} disabled={generating} bg="#185FA5" icon={generating?"":"🇪🇺"}>
          {generating?"Génération…":"GÉNÉRER LA DÉCLARATION RED"}
        </BigBtn>
      </div>
    </div>
  );
};

// Centroïdes département (fallback carte sans GPS visite)
const DEPT_CENTROIDS = {
  "01":[46.20,5.23],"02":[49.55,3.63],"03":[46.34,3.08],"04":[44.09,6.24],
  "05":[44.66,6.46],"06":[43.93,7.10],"07":[44.75,4.54],"08":[49.69,4.73],
  "09":[42.95,1.60],"10":[48.30,4.08],"11":[43.12,2.35],"12":[44.35,2.57],
  "13":[43.53,5.45],"14":[49.09,-0.37],"15":[45.05,2.63],"16":[45.69,0.16],
  "17":[45.75,-0.74],"18":[47.07,2.40],"19":[45.27,1.77],"21":[47.32,5.04],
  "22":[48.45,-2.90],"23":[46.00,2.02],"24":[45.15,0.72],"25":[47.24,6.02],
  "26":[44.72,5.05],"27":[49.03,1.15],"28":[48.44,1.49],"29":[48.23,-4.10],
  "2A":[41.86,9.01],"2B":[42.37,9.28],"30":[43.96,4.18],"31":[43.60,1.44],
  "32":[43.67,0.59],"33":[44.84,-0.58],"34":[43.61,3.88],"35":[48.11,-1.68],
  "36":[46.81,1.69],"37":[47.24,0.69],"38":[45.19,5.72],"39":[46.67,5.56],
  "40":[44.00,-0.75],"41":[47.59,1.33],"42":[45.44,4.39],"43":[45.04,3.89],
  "44":[47.24,-1.56],"45":[47.90,2.06],"46":[44.62,1.67],"47":[44.35,0.46],
  "48":[44.50,3.50],"49":[47.47,-0.55],"50":[49.11,-1.31],"51":[49.04,4.36],
  "52":[48.11,5.14],"53":[48.07,-0.77],"54":[48.69,6.18],"55":[48.99,5.38],
  "56":[47.83,-2.75],"57":[49.04,6.46],"58":[47.07,3.66],"59":[50.52,3.08],
  "60":[49.40,2.44],"61":[48.43,0.08],"62":[50.52,2.63],"63":[45.77,3.08],
  "64":[43.29,-0.37],"65":[43.23,0.08],"66":[42.70,2.89],"67":[48.58,7.75],
  "68":[47.75,7.34],"69":[45.76,4.83],"70":[47.63,6.16],"71":[46.64,4.52],
  "72":[47.99,0.19],"73":[45.48,6.56],"74":[46.06,6.39],"75":[48.86,2.35],
  "76":[49.44,1.09],"77":[48.62,2.99],"78":[48.80,1.98],"79":[46.65,-0.41],
  "80":[49.92,2.30],"81":[43.93,2.15],"82":[44.01,1.35],"83":[43.47,6.15],
  "84":[43.95,5.05],"85":[46.67,-1.43],"86":[46.58,0.34],"87":[45.83,1.26],
  "88":[48.17,6.46],"89":[47.80,3.56],"90":[47.64,6.85],"91":[48.63,2.26],
  "92":[48.86,2.25],"93":[48.92,2.46],"94":[48.78,2.46],"95":[49.05,2.10],
};
const gpsByDept = (cp) => {
  if (!cp) return null;
  const dept = String(cp).slice(0,2).toUpperCase();
  const c = DEPT_CENTROIDS[dept];
  return c ? {lat:c[0],lng:c[1]} : null;
};

// ── ÉCRAN CARTE (Leaflet / OpenStreetMap) ────────────────────
export const EcranCarte = ({contacts, visites, onOpenLot}) => {
  const mapRef     = useRef(null);
  const mapInst    = useRef(null);
  const markersRef = useRef([]);
  const [loaded,   setLoaded]  = useState(!!window.L);
  const [filtre,   setFiltre]  = useState("TOUS");
  const [nbLots,   setNbLots]  = useState(0);

  // ── Chargement Leaflet depuis CDN ──
  useEffect(()=>{
    if (window.L) { setLoaded(true); return; }
    if (!document.getElementById("lf-css")) {
      const lnk = document.createElement("link");
      lnk.id="lf-css"; lnk.rel="stylesheet";
      lnk.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(lnk);
    }
    if (!document.getElementById("lf-js")) {
      const sc = document.createElement("script");
      sc.id="lf-js";
      sc.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      sc.onload=()=>setLoaded(true);
      document.head.appendChild(sc);
    }
  },[]);

  // ── Init carte ──
  useEffect(()=>{
    if (!loaded || !mapRef.current || mapInst.current) return;
    const L = window.L;
    // Fix icônes Leaflet en prod
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    const map = L.map(mapRef.current,{
      center:[46.8,2.5], zoom:6,
      zoomControl:true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      attribution:'© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom:19,
    }).addTo(map);
    mapInst.current = map;
    return ()=>{ map.remove(); mapInst.current=null; };
  },[loaded]);

  // ── Callback popup → fiche lot ──
  useEffect(()=>{
    window.__aplt_open = (id)=>{
      const lot = contacts.find(c=>c.id===id);
      if (lot) onOpenLot(lot);
    };
    return ()=>{ delete window.__aplt_open; };
  },[contacts, onOpenLot]);


  // ── Mise à jour des markers ──
  useEffect(()=>{
    if (!loaded || !mapInst.current) return;
    const L = window.L;
    const map = mapInst.current;

    // Supprimer anciens markers
    markersRef.current.forEach(m=>map.removeLayer(m));
    markersRef.current = [];

    const bounds = [];
    let count = 0;

    contacts.forEach(lot=>{
      if (!lot.lotNumero) return;
      if (filtre!=="TOUS" && lot.statutLot!==filtre) return;
      const v = visites.find(vi=>vi.lotId===lot.id||vi.lotNumero===lot.lotNumero);
      const gpsExact = lot.gps?.lat ? lot.gps : (v?.gps?.lat ? v.gps : null);
      const gps = gpsExact || gpsByDept(lot.codePostal);
      if (!gps?.lat) return;
      const approx = !gpsExact;

      const st = STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;

      const icon = L.divIcon({
        className:"",
        iconSize:[32,32],
        iconAnchor:[16,16],
        popupAnchor:[0,-16],
        html:`<div style="width:32px;height:32px;border-radius:50%;background:${st.color};border:3px solid ${approx?"rgba(255,255,255,.5)":"#fff"};opacity:${approx?0.75:1};box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;">${approx?"📍":"🌲"}</div>`,
      });

      const popup = `
        <div style="font-family:-apple-system,sans-serif;min-width:200px;padding:2px">
          <div style="font-family:monospace;font-size:14px;font-weight:700;
            color:#1E5B3A;margin-bottom:4px">${lot.lotNumero}</div>
          <div style="font-size:13px;color:#1A1A18;font-weight:500">
            ${lot.nom}${lot.prenom?" "+lot.prenom:""}</div>
          <div style="font-size:12px;color:#5A5955;margin-top:2px">📍 ${lot.commune}</div>
          <div style="margin-top:6px">
            <span style="font-size:10px;padding:3px 8px;border-radius:12px;
              background:${st.bg};color:${st.color};font-weight:600">
              ${st.label}
            </span>
          </div>
          ${lot.surfaceHa?`<div style="font-size:11px;color:#9A9892;margin-top:6px">
            🌲 ${lot.surfaceHa} ha${v?.volumeEstimeT?" · 📦 "+fmtNum(v.volumeEstimeT)+" t":""}</div>`:""}
          ${v?.essences?.length?`<div style="font-size:11px;color:#9A9892;margin-top:2px">
            🌿 ${v.essences.map(e=>e.label).join(", ")}</div>`:""}
          <button onclick="window.__aplt_open('${lot.id}')"
            style="width:100%;margin-top:10px;padding:8px;border-radius:8px;
              background:#4CAF50;color:#fff;border:none;cursor:pointer;
              font-size:12px;font-weight:600;font-family:inherit;">
            Ouvrir la fiche →
          </button>
        </div>`;

      const marker = L.marker([gps.lat, gps.lng],{icon})
        .addTo(map)
        .bindPopup(popup,{maxWidth:240,className:"aplt-popup"});

      markersRef.current.push(marker);
      bounds.push([gps.lat, gps.lng]);
      count++;
    });

    setNbLots(count);
    if (bounds.length>0) {
      map.fitBounds(bounds,{padding:[40,40],maxZoom:13});
    }
  },[loaded, contacts, visites, filtre]);

  const FILTRES = [
    ["TOUS","Tous"],
    ["VISITE_PREVUE","À visiter"],
    ["EN_COURS_EXPLOITATION","Exploitation"],
    ["BORD_ROUTE","Bord route"],
    ["EN_LIVRAISON","Transport"],
    ["LIVRE_CHAUFFERIE","Livré"],
  ];

  const LEGENDE = [
    ["NOUVEAU","#9A9892"],
    ["VISITE_PREVUE","#BA7517"],
    ["EN_COURS_EXPLOITATION","#185FA5"],
    ["BORD_ROUTE","#A66A2E"],
    ["EN_LIVRAISON","#534AB7"],
    ["LIVRE_CHAUFFERIE","#4CAF50"],
    ["ALERTE","#A32D2D"],
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,padding:"8px 12px",overflowX:"auto",
        flexShrink:0,background:"#fff",borderBottom:`1px solid ${C.bd}`,
        scrollbarWidth:"none"}}>
        {FILTRES.map(([id,label])=>(
          <button key={id} onClick={()=>setFiltre(id)} style={{
            height:32,padding:"0 12px",borderRadius:16,whiteSpace:"nowrap",
            border:`1.5px solid ${filtre===id?C.green:C.bd}`,
            background:filtre===id?C.green:"#fff",
            color:filtre===id?"#fff":C.tx2,
            fontFamily:"inherit",fontSize:12,fontWeight:500,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",flexShrink:0}}>
            {label}
          </button>
        ))}
      </div>

      {/* Carte */}
      <div style={{flex:1,position:"relative"}}>
        {!loaded&&(
          <div style={{position:"absolute",inset:0,display:"flex",
            alignItems:"center",justifyContent:"center",
            flexDirection:"column",background:C.bg,color:C.tx3,gap:12,zIndex:10}}>
            <div style={{fontSize:40}}>🗺️</div>
            <div style={{fontSize:14,fontWeight:500}}>Chargement de la carte…</div>
            <div style={{fontSize:12,color:C.tx3}}>OpenStreetMap via Leaflet</div>
          </div>
        )}
        <div ref={mapRef} style={{width:"100%",height:"100%"}}/>

        {/* Badge nb lots */}
        {loaded&&(
          <div style={{position:"absolute",top:10,right:10,zIndex:1000,
            background:"#fff",borderRadius:20,padding:"5px 12px",
            boxShadow:"0 2px 8px rgba(0,0,0,.2)",fontSize:12,fontWeight:600,
            color:C.tx,border:`1px solid ${C.bd}`}}>
            {nbLots} lot{nbLots!==1?"s":""} {filtre!=="TOUS"?"filtré"+(nbLots>1?"s":""):""}
          </div>
        )}
      </div>

      {/* Légende */}
      {loaded&&(
        <div style={{background:"#fff",borderTop:`1px solid ${C.bd}`,
          padding:"8px 12px",display:"flex",gap:10,flexShrink:0,
          overflowX:"auto",scrollbarWidth:"none"}}>
          {LEGENDE.map(([k,color])=>(
            <div key={k} style={{display:"flex",alignItems:"center",
              gap:5,flexShrink:0}}>
              <div style={{width:10,height:10,borderRadius:"50%",
                background:color,border:"1.5px solid #fff",
                boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              <span style={{fontSize:10,color:C.tx3,whiteSpace:"nowrap"}}>
                {STATUT_LOT[k]?.label||k}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


