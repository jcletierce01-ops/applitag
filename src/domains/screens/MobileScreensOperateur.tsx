// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { STATUT_LOT } from "./MobileScreens.constants.js";
import { C, BTN_H, INPUT_H, FONT_INPUT, FONT_TITLE, PADDING } from "../../design-system/tokens.js";
import { todayS, nowISO, uid, genCode } from "../../shared/utils.js";
import { apiGet, apiPost, apiPatch, apiPostPublic, ApiError } from "../../services/api.service.js";
import { genPin4, getToken } from "../../services/auth.service.js";
import { annoncesLocalGet, annoncesLocalSave, comptesLocalGet, comptesLocalSave } from "../../domains/connect/local-storage.js";
import { ordresExplLocalGet, ordresExplLocalSave } from "../../domains/exploitation/local-storage.js";
import { BigBtn, MInput, SectionTitle, MiniBarChart } from "../../shared/ui.jsx";
import { fmtNum } from "../../shared/format.js";
import { validatePhone, formatPhone } from "../../shared/validators.js";
import { generatePdfFromHtml, buildOrdreExploitationHTML } from "../../domains/documents/pdf-templates.js";
import { FormulaireVisite } from "../../domains/visites/FormulaireVisite.jsx";
import { indicesPonderes } from "../../metier/formules.js";
import { GROUPES_MODULES } from "./mobile-modules.constants.js";

// ── ÉCRAN OPÉRATEUR TERRAIN ───────────────────────────────────
// Statuts à partir desquels la clôture d'exploitation a eu lieu — au-delà,
// la saisie de relevé terrain n'est plus pertinente pour l'opérateur.
const STATUTS_CLOTURES = ["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"];

export const EcranOperateur = ({operateur, onLogout, toast, onUpdateOperateur}: any) => {
  const [screen, setScreen] = useState("lots"); // lots | releve | profil
  const [activeLot, setActiveLot] = useState<any>(null);
  const [typeOp, setTypeOp] = useState(null);
  const [saving, setSaving] = useState(false);

  // Changement de PIN par l'opérateur lui-même
  const [pinActuel, setPinActuel] = useState("");
  const [pinNouveau, setPinNouveau] = useState("");
  const [pinNouveauConf, setPinNouveauConf] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinErreur, setPinErreur] = useState("");

  const handleChangerPin = async () => {
    setPinErreur("");
    if (!pinActuel) { setPinErreur("Le PIN actuel est requis"); return; }
    if (!/^\d{6}$/.test(pinNouveau)) { setPinErreur("Le nouveau PIN doit comporter 6 chiffres"); return; }
    if (pinNouveau!==pinNouveauConf) { setPinErreur("Les deux PIN ne correspondent pas"); return; }
    setPinSaving(true);
    try {
      await apiPatch(`/operateurs/${operateur.id}`, {pin:pinNouveau, pinActuel});
      const opMaj = {...operateur, pin:pinNouveau};
      onUpdateOperateur?.(opMaj);
      setPinActuel(""); setPinNouveau(""); setPinNouveauConf("");
      toast?.("PIN modifié ✓");
      setScreen("lots");
    } catch(e) {
      const msg = (e as Error).message ?? "";
      setPinErreur(msg.includes("PIN actuel incorrect") ? "PIN actuel incorrect" : "Impossible de modifier le PIN — réessayez quand vous êtes connecté");
    }
    setPinSaving(false);
  };
  const [lotsStatus, setLotsStatus] = useState<Record<string,any>>({}); // {lotId: statutLot} — rafraîchi depuis le serveur
  const [visites, setVisites] = useState<any[]>([]);
  const [contactsFull, setContactsFull] = useState<any[]>([]); // lots complets — requis pour la visite terrain (mandataire)

  // Rafraîchit le statut réel des lots assignés, pour ne jamais bloquer
  // l'accès à la saisie tant que la clôture n'a pas eu lieu (et le couper après).
  // Guard : sans JWT admin, ces endpoints retourneraient 401 → reload en boucle.
  useEffect(()=>{
    if (!getToken()) return;
    apiGet(`/contacts`)
      .then(d=>{
        if (!Array.isArray(d)) return;
        const map: Record<string,any> = {};
        d.forEach((c: any)=>{ map[c.id]=c.statutLot; });
        setLotsStatus(map);
        setContactsFull(d);
      })
      .catch(()=>{}); // échec réseau → on n'affiche aucun statut, l'accès reste ouvert
    apiGet(`/visites`)
      .then(d=>{ if (Array.isArray(d)) setVisites(d); })
      .catch(()=>{});
  },[]);

  // Composition essences du lot actif (issue de sa dernière visite) → indices pondérés ITEBE
  const visiteActiveLot = visites.filter(v=>v.lotId===activeLot?.lotId)[0]||null;

  // Relevé abatteur
  const [nbTas,       setNbTas]   = useState(0);
  const [longueur,    setLong]    = useState(0);
  const [largeur,     setLarg]    = useState(0);
  const [hauteur,     setHaut]    = useState(0);
  const [foisonnement,setFoison]  = useState(0.55);
  const [meteo,       setMeteo]   = useState("beau");
  const [incident,    setIncid]   = useState("");
  const [temps,       _setTemps]   = useState(8);
  const [heureDebAb,  setHeureDebAb] = useState("");
  const [heureFinAb,  setHeureFinAb] = useState("");

  // Pause déjeuner — abatteur
  const [pauseDebutAb, setPauseDebAb] = useState("");
  const [pauseFinAb,   setPauseFinAb] = useState("");
  // Pause déjeuner — débardeur
  const [pauseDebutDeb,setPauseDebDeb]= useState("");
  const [pauseFinDeb,  setPauseFinDeb]= useState("");
  const [nbVoyages,     setNbVoyages]  = useState(0);
  const [longueurDeb,   setLongDeb]    = useState(0);
  const [largeurDeb,    setLargDeb]    = useState(0);
  const [hauteurDeb,    setHautDeb]    = useState(0);
  const [foisDeb,       setFoisDeb]    = useState(0.55);
  const [distTransport, setDistTransp] = useState("");
  const [machineDeb,    setMachineDeb] = useState("");
  const [heureDebDeb,   setHeureDebD]  = useState("");
  const [heureFinDeb,   setHeureFinD]  = useState("");

  // Calcul automatique abatteur
  const volApparent = nbTas * longueur * largeur * hauteur;
  const volReel = volApparent * foisonnement;

  // Calcul automatique débardeur (dimension moyenne × nombre de rotations)
  const volApparentDeb = nbVoyages * longueurDeb * largeurDeb * hauteurDeb;
  const volReelDeb = volApparentDeb * foisDeb;

  // Composition essences de la visite (pondérée, source ITEBE) — sinon mélange par défaut
  const essenceVisite = visiteActiveLot?.essences?.length
    ? visiteActiveLot.essences.map((e: any)=>`${e.label} ${e.pct}%`).join(", ")
    : "Mélange (composition inconnue)";
  const indices = indicesPonderes(visiteActiveLot?.essences);
  const poidsTotal    = Math.round(volReel    * indices.densite / 1000 * 100) / 100;
  const energieMWh    = Math.round(poidsTotal * indices.pci * 100) / 100;
  const poidsTotalDeb = Math.round(volReelDeb * indices.densite / 1000 * 100) / 100;
  const energieMWhDeb = Math.round(poidsTotalDeb * indices.pci * 100) / 100;

  const [releveExistantId, setReleveExistantId] = useState(null);
  const [modeModif, setModeModif] = useState(false);
  const [doublonDetecte, setDoublonDetecte] = useState(false);
  const [msgModifEnvoi, setMsgModifEnvoi] = useState(false);
  const [msgModifEnvoye, setMsgModifEnvoye] = useState(false);
  const relevesSoumis = useRef(new Set()); // clés "lotId|typeOp" soumis dans cette session

  const handleSaveReleve = async () => {
    setSaving(true);
    const isDebardeur = typeOp==="debardage";
    const endpoint = isDebardeur ? "/releves-debardeur" : "/releves-abatteur";
    const dateHeure = new Date().toISOString();
    const payload = isDebardeur ? {
      lotId: activeLot.lotId,
      operateur: `${operateur.nom}${operateur.prenom?" "+operateur.prenom:""}`,
      etfNom: operateur.etfNom,
      date: dateHeure,
      nbVoyages,
      longueur:longueurDeb, largeur:largeurDeb, hauteur:hauteurDeb,
      foisonnement:foisDeb,
      volTotal: Math.round(volReelDeb*100)/100,
      poidsTotal: poidsTotalDeb,
      energieMWh: energieMWhDeb,
      distanceTransport: parseFloat(distTransport)||0,
      machine: machineDeb,
      heureDebut: heureDebDeb, heureFin: heureFinDeb,
      pauseDebut: pauseDebutDeb, pauseFin: pauseFinDeb,
      meteo, incident,
    } : {
      lotId: activeLot.lotId,
      operateur: `${operateur.nom}${operateur.prenom?" "+operateur.prenom:""}`,
      etfNom: operateur.etfNom,
      date: dateHeure,
      nbTas, longueur, largeur, hauteur,
      essence: essenceVisite,
      // ⚠ NON_VALIDEE (formules.js:FORMULE_HUMIDITE_DEPUIS_FOISONNEMENT) — relation non validée ; remplacer par mesure humidimètre
      humidite: Math.round((1 - foisonnement) * 100),
      meteo, incident, temps,
      heureDebut: heureDebAb, heureFin: heureFinAb,
      pauseDebut: pauseDebutAb, pauseFin: pauseFinAb,
      volTotal: Math.round(volReel * 100) / 100,
      poidsTotal,
    };
    try {
      try {
        await (modeModif && releveExistantId
          ? apiPatch(`${endpoint}/${releveExistantId}`, payload)
          : apiPost(endpoint, payload));
      } catch(apiErr) {
        const msg = (apiErr as any)?.message || "";
        if (msg.includes("DOUBLON:")) {
          const id = msg.split("DOUBLON:")[1];
          setReleveExistantId(id);
          setDoublonDetecte(true);
          setSaving(false);
          return;
        }
        throw apiErr;
      }
      // Débardeur → accumuler tonnage bord de route sur le lot
      if (isDebardeur && poidsTotalDeb>0) {
        apiPatch(`/contacts/${activeLot.lotId}`, { tonnageBordRoute_increment: poidsTotalDeb }).catch(()=>{});
      }
      relevesSoumis.current.add(`${activeLot.lotId}|${typeOp}`);
      toast("Relevé enregistré ✓");
      setScreen("lots");
      setActiveLot(null);
      setModeModif(false);
      setReleveExistantId(null);
    } catch {
      // Offline : sauvegarde locale pour synchronisation ultérieure
      try {
        const pendingKey = `applitag_releve_pending_${activeLot.lotId}_${typeOp}`;
        localStorage.setItem(pendingKey, JSON.stringify({
          endpoint,
          payload,
          releveExistantId: modeModif ? releveExistantId : null,
        }));
      } catch { /* noop */ }
      // Ne pas marquer comme soumis — retry possible à la reconnexion
      toast("Relevé enregistré localement ✓ — sera synchronisé à la reconnexion");
      setScreen("lots");
      setActiveLot(null);
      setModeModif(false);
      setReleveExistantId(null);
    }
    setSaving(false);
  };

  const handleDemanderModification = async () => {
    setMsgModifEnvoi(true);
    let envoye = false;
    try {
      await apiPostPublic(`/messages-admin`, {
        type:"demande_modification_releve",
        operateur:`${operateur.prenom||""} ${operateur.nom}`.trim(),
        etfNom: operateur.etfNom||"",
        lotId: activeLot?.lotId,
        lotNumero: activeLot?.lotNumero,
        typeOperation: typeOp,
        releveId: releveExistantId,
        date: new Date().toISOString(),
        message:`L'opérateur ${operateur.prenom||""} ${operateur.nom} demande une correction sur le relevé ${typeOp==="debardage"?"débardage":"abattage"} du lot ${activeLot?.lotNumero} (${new Date().toLocaleDateString("fr-FR")}).`,
      });
      envoye = true;
    } catch { /* noop — endpoint optionnel */ }
    setMsgModifEnvoi(false);
    setMsgModifEnvoye(true);
    toast(envoye ? "Message envoyé à l'administrateur ✓" : "Demande enregistrée — message transmis à la reconnexion");
    setTimeout(()=>{
      setScreen("lots"); setActiveLot(null);
      setDoublonDetecte(false); setMsgModifEnvoye(false); setReleveExistantId(null);
    }, 2500);
  };

  // Profil de l'opérateur : "terrain" (abattage/débardage uniquement) ou "charge_mission" (visite uniquement).
  // Filtre défensif au cas où des assignations historiques ne correspondraient plus au profil.
  const estChargeMission = operateur.profil==="charge_mission" || (!operateur.profil && operateur.roles?.includes("mandataire") && !operateur.roles?.some((r: any)=>["abattage","debardage"].includes(r)));
  const typesAutorises = estChargeMission ? ["mandataire"] : ["abattage","debardage"];
  const assignations = (operateur.assignations||[]).filter((a: any)=>typesAutorises.includes(a.typeOperation));

  // Mandataire — visite terrain : écran plein avec le formulaire de visite habituel
  if (screen==="visite" && activeLot) {
    const lotComplet = contactsFull.find(c=>c.id===activeLot.lotId) || {
      id:activeLot.lotId, lotNumero:activeLot.lotNumero,
    };
    return (
      <FormulaireVisite lot={lotComplet} entrepriseId={operateur.entrepriseId}
        onBack={()=>{ setActiveLot(null); setScreen("lots"); }}
        onSaved={(v: any)=>{
          setVisites((prev: any)=>[v,...prev]);
          setActiveLot(null);
          setScreen("lots");
          toast("Visite enregistrée ✓");
          apiPostPublic(`/contacts/${lotComplet.id}/transition-etf`, {action:"validerVisite",operateurId:operateur.id}).catch(()=>{});
        }}
        toast={toast}/>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      {/* Header */}
      <div style={{background:C.sb,color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src="/logo.png" alt="APPLITAG" style={{width:32,height:32,objectFit:"contain"}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:600}}>
              {screen==="lots" ? `👷 ${operateur.nom}` : screen==="profil" ? "👤 Mon profil" : `📋 Relevé ${typeOp}`}
            </div>
            <div style={{fontSize:11,opacity:.6}}>{operateur.etfNom}</div>
          </div>
          {(screen==="releve"||screen==="profil")&&(
            <button onClick={()=>setScreen("lots")} style={{
              background:"rgba(255,255,255,.1)",border:"none",color:"#fff",
              padding:"6px 12px",borderRadius:8,fontSize:13,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          )}
          {screen==="lots"&&(
            <>
              <button onClick={()=>setScreen("profil")} style={{
                background:"rgba(255,255,255,.1)",border:"none",color:"rgba(255,255,255,.8)",
                padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>👤 Mon profil</button>
              <button onClick={onLogout} style={{
                background:"rgba(255,255,255,.1)",border:"none",color:"rgba(255,255,255,.6)",
                padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>⎋</button>
            </>
          )}
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:90}}>
        {screen==="profil"&&(
          <div>
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:20,
              border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:15,fontWeight:700,color:C.tx}}>
                {operateur.nom}{operateur.prenom?` ${operateur.prenom}`:""}
              </div>
              <div style={{fontSize:12,color:C.tx3,marginTop:4}}>{operateur.etfNom}</div>
            </div>
            <SectionTitle icon="🔑" label="Changer mon code PIN"/>
            <MInput label="PIN actuel" value={pinActuel} onChange={setPinActuel}
              placeholder="6 chiffres" type="password"/>
            <MInput label="Nouveau PIN" value={pinNouveau}
              onChange={v=>setPinNouveau(v.replace(/\D/g,"").slice(0,6))}
              placeholder="6 chiffres" type="password"/>
            <MInput label="Confirmer le nouveau PIN" value={pinNouveauConf}
              onChange={v=>setPinNouveauConf(v.replace(/\D/g,"").slice(0,6))}
              placeholder="6 chiffres" type="password"/>
            {pinErreur&&(
              <div style={{color:C.amberD,fontSize:13,marginBottom:12}}>⚠ {pinErreur}</div>
            )}
            <BigBtn onClick={handleChangerPin} disabled={pinSaving} bg={C.green} icon={pinSaving?"":"💾"}>
              {pinSaving?"Enregistrement…":"ENREGISTRER LE NOUVEAU PIN"}
            </BigBtn>
          </div>
        )}
        {screen==="lots"&&(
          <div>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16,lineHeight:1.6}}>
              {estChargeMission
                ? "Sélectionnez le lot pour réaliser la visite terrain."
                : "Sélectionnez le lot et le type d'opération (abattage/débardage) pour saisir votre relevé."}
            </div>
            {assignations.length===0 ? (
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>📋</div>
                <div style={{fontSize:16,fontWeight:500}}>Aucun lot assigné</div>
                <div style={{fontSize:13,marginTop:6}}>Contactez votre administrateur</div>
              </div>
            ) : assignations.map((a: any)=>{
              const statut = lotsStatus[a.lotId]||lotsStatus[a.id];
              const cloture = statut && STATUTS_CLOTURES.includes(statut);
              const estMandataire = a.typeOperation==="mandataire";
              const visiteFaite = estMandataire && visites.some((v: any)=>v.lotId===a.lotId||v.lotNumero===a.lotNumero);
              return (
              <div key={a.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                borderRadius:14,padding:16,marginBottom:10}}>
                <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                  color:C.greenD,marginBottom:8}}>🏷 {a.lotNumero}</div>
                <div style={{fontSize:12,color:C.tx3,marginBottom:12}}>
                  {({"mandataire":"🔭 Visite terrain","abattage":"🪓 Abattage","debardage":"🚜 Débardage","dechiquetage":"🌀 Déchiquetage"} as Record<string,any>)[a.typeOperation]||a.typeOperation}
                </div>
                {estMandataire ? (
                  visiteFaite ? (
                    <div style={{width:"100%",height:44,borderRadius:10,
                      background:C.bg2,color:C.tx3,display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:13,fontWeight:600}}>
                      ✅ Visite terrain déjà réalisée
                    </div>
                  ) : (
                    <button onClick={()=>{ setActiveLot(a); setScreen("visite"); }}
                      style={{width:"100%",height:44,borderRadius:10,
                        background:C.green,color:"#fff",border:"none",
                        fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                        WebkitTapHighlightColor:"transparent"}}>
                      📝 Réaliser la visite terrain
                    </button>
                  )
                ) : cloture ? (
                  <div style={{width:"100%",height:44,borderRadius:10,
                    background:C.bg2,color:C.tx3,display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:13,fontWeight:600}}>
                    ✅ Réception de fin d'exploitation effectuée
                  </div>
                ) : (
                <button onClick={()=>{ setActiveLot(a); setTypeOp(a.typeOperation); setDoublonDetecte(relevesSoumis.current.has(`${a.lotId}|${a.typeOperation}`)); setScreen("releve"); }}
                  style={{width:"100%",height:44,borderRadius:10,
                    background:C.green,color:"#fff",border:"none",
                    fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent"}}>
                  ➕ Saisir mon rapport journalier
                </button>
                )}
              </div>
              );
            })}
          </div>
        )}

        {screen==="releve"&&activeLot&&(
          <div>
            {doublonDetecte ? (
              <div style={{padding:"8px 0 120px"}}>
                <div style={{background:"#FCEBEB",borderRadius:14,padding:20,
                  border:"1.5px solid #E53935",marginBottom:16}}>
                  <div style={{fontSize:16,fontWeight:700,color:"#B71C1C",marginBottom:8}}>
                    ⛔ Relevé déjà saisi aujourd'hui
                  </div>
                  <div style={{fontSize:13,color:"#C62828",lineHeight:1.6}}>
                    Un relevé {typeOp==="debardage"?"débardage":"abattage"} a déjà été enregistré pour le lot <strong>{activeLot.lotNumero}</strong> aujourd'hui. Il n'est pas possible de saisir un second relevé pour la même journée.
                  </div>
                </div>
                <div style={{background:C.amberL,borderRadius:12,padding:16,
                  border:`1px solid ${C.amber}`}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.amberD,marginBottom:6}}>
                    Une erreur s'est glissée dans votre saisie ?
                  </div>
                  <div style={{fontSize:12,color:C.amberD,lineHeight:1.6,marginBottom:14}}>
                    Si une correction est nécessaire, envoyez une demande à l'administrateur. Il sera notifié et pourra effectuer la modification à votre place.
                  </div>
                  {msgModifEnvoye ? (
                    <div style={{background:"#E8F5E9",borderRadius:10,padding:12,
                      border:"1px solid #4CAF50",textAlign:"center",
                      fontSize:13,fontWeight:600,color:C.greenD}}>
                      ✅ Demande envoyée — l'administrateur a été notifié
                    </div>
                  ) : (
                    <button onClick={handleDemanderModification} disabled={msgModifEnvoi}
                      style={{width:"100%",padding:14,borderRadius:12,
                        background:C.amberD,border:"none",color:"#fff",
                        fontFamily:"inherit",fontSize:14,fontWeight:600,
                        cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                      {msgModifEnvoi?"Envoi en cours…":"✉️ Demander une correction à l'administrateur"}
                    </button>
                  )}
                </div>
              </div>
            ) : (<>
            <div style={{background:typeOp==="debardage"?C.purpleL:C.greenL,
              borderRadius:12,padding:12,marginBottom:16,
              border:`1px solid ${typeOp==="debardage"?C.purple:C.green}`}}>
              <div style={{fontSize:11,fontWeight:600,
                color:typeOp==="debardage"?C.purpleD:C.greenD}}>
                {typeOp==="debardage"?"🚜 Relevé Débardeur":"🪓 Relevé Abatteur"} · {activeLot.lotNumero}
              </div>
              <div style={{fontSize:11,color:C.tx3,marginTop:4}}>
                📅 Date et heure enregistrées automatiquement à la validation
              </div>
            </div>

            {/* ── FORMULAIRE DÉBARDEUR ── */}
            {typeOp==="debardage"&&(
              <>
                <SectionTitle icon="📦" label="Mesures approximatives des bois débardés"/>
                <MInput label="Nombre de rotations" value={String(nbVoyages||"")}
                  onChange={v=>setNbVoyages(parseInt(v)||0)} type="number"
                  placeholder="ex: 6" hint="une seule dimension moyenne sera utilisée pour toutes les rotations"/>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <MInput label="Longueur moyenne (m)" value={String(longueurDeb||"")}
                    onChange={v=>setLongDeb(parseFloat(v)||0)} type="number" placeholder="ex: 4"/>
                  <MInput label="Largeur moyenne (m)" value={String(largeurDeb||"")}
                    onChange={v=>setLargDeb(parseFloat(v)||0)} type="number" placeholder="ex: 1.2"/>
                </div>
                <MInput label="Hauteur moyenne (m)" value={String(hauteurDeb||"")}
                  onChange={v=>setHautDeb(parseFloat(v)||0)} type="number" placeholder="ex: 1.5"/>

                <SectionTitle icon="🌬️" label="Foisonnement"/>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  {[
                    [0.40,"Très vrac","Bois fraîchement débardé","🪵"],
                    [0.55,"Débardé en tas","État habituel après débardage","🚜"],
                    [0.65,"Bien empilé","Bois rangé soigneusement","📐"],
                  ].map(([v,l,s,e]: any)=>(
                    <div key={v} onClick={()=>setFoisDeb(v)} style={{
                      padding:"12px 14px",borderRadius:12,cursor:"pointer",
                      border:`2px solid ${foisDeb===v?C.purple:C.bd}`,
                      background:foisDeb===v?C.purpleL:"#fff",
                      WebkitTapHighlightColor:"transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:600,
                            color:foisDeb===v?C.purpleD:C.tx}}>{e} {l}</div>
                          <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{s}</div>
                        </div>
                        <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,
                          color:foisDeb===v?C.purpleD:C.tx3}}>{Math.round(v*100)}%</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Récap ITEBE débardeur */}
                {volApparentDeb>0&&(
                  <div style={{background:C.purpleL,borderRadius:14,padding:16,marginBottom:14,
                    border:`1.5px solid ${C.purple}`}}>
                    <div style={{fontSize:12,color:C.purpleD,fontWeight:700,marginBottom:10}}>
                      📊 Calcul automatique (indices ITEBE)
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[
                        [Math.round(volApparentDeb*10)/10+" m³","Apparent"],
                        [poidsTotalDeb+" t","Poids"],
                        [energieMWhDeb+" MWh","Énergie"],
                      ].map(([v,l],i)=>(
                        <div key={i} style={{textAlign:"center",
                          background:"rgba(83,74,183,.1)",borderRadius:10,padding:10}}>
                          <div style={{fontSize:16,fontWeight:700,color:C.purpleD}}>{v}</div>
                          <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:8,textAlign:"center"}}>
                      {essenceVisite} · {Math.round(indices?.densite)} kg/m³ · Foisonnement {Math.round(foisDeb*100)}%
                    </div>
                  </div>
                )}

                <MInput label="Distance transport (m)" value={distTransport}
                  onChange={setDistTransp} type="number"
                  placeholder="ex: 350" hint="coupe → dépôt"/>
                <MInput label="Machine utilisée" value={machineDeb} onChange={setMachineDeb}
                  placeholder="Ex: John Deere 1270G…" hint="optionnel"/>

                <SectionTitle icon="⏱️" label="Horaires"/>
                <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${C.bd}`}}>
                  {/* Heure début */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>🕐 Heure de début</div>
                    <input type="time" value={heureDebDeb} onChange={e=>setHeureDebD(e.target.value)}
                      style={{width:"100%",padding:"14px 16px",borderRadius:10,fontSize:20,fontWeight:700,
                        boxSizing:"border-box",border:`2px solid ${heureDebDeb?C.purple:C.bd}`,
                        background:heureDebDeb?C.purpleL:"#fff",color:heureDebDeb?C.purpleD:"#333",fontFamily:"inherit"}}/>
                  </div>
                  {/* Pause déjeuner */}
                  <div style={{background:"#FFF8E1",borderRadius:10,padding:12,marginBottom:12,
                    border:"1px solid #FFD54F"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#795548",marginBottom:8}}>
                      🍽️ Pause déjeuner (optionnel)
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[["Début pause",pauseDebutDeb,setPauseDebDeb],["Fin pause",pauseFinDeb,setPauseFinDeb]].map(([lbl,val,set]: any,i: any)=>(
                        <div key={i}>
                          <div style={{fontSize:11,color:"#795548",marginBottom:6}}>{lbl}</div>
                          <input type="time" value={val} onChange={e=>set(e.target.value)}
                            style={{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:16,fontWeight:600,
                              boxSizing:"border-box",border:`1.5px solid ${val?"#FF8F00":"#E0E0E0"}`,
                              background:val?"#FFF3E0":"#fff",color:val?"#795548":"#333",fontFamily:"inherit"}}/>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Heure fin */}
                  <div style={{marginBottom:heureDebDeb&&heureFinDeb?12:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>🕕 Heure de fin</div>
                    <input type="time" value={heureFinDeb} onChange={e=>setHeureFinD(e.target.value)}
                      style={{width:"100%",padding:"14px 16px",borderRadius:10,fontSize:20,fontWeight:700,
                        boxSizing:"border-box",border:`2px solid ${heureFinDeb?C.amber:C.bd}`,
                        background:heureFinDeb?C.amberL:"#fff",color:heureFinDeb?C.amberD:"#333",fontFamily:"inherit"}}/>
                  </div>
                  {/* Calcul temps net */}
                  {heureDebDeb&&heureFinDeb&&(()=>{
                    const toMins = (t: any)=>{ const [h,m]=t.split(":").map(Number); return h*60+m; };
                    const brut = toMins(heureFinDeb)-toMins(heureDebDeb);
                    const pause = (pauseDebutDeb&&pauseFinDeb) ? toMins(pauseFinDeb)-toMins(pauseDebutDeb) : 0;
                    const net = brut - Math.max(0,pause);
                    if(brut<=0) return null;
                    return(
                      <div style={{background:C.greenL,borderRadius:10,padding:12,
                        fontSize:14,fontWeight:700,color:C.greenD,textAlign:"center"}}>
                        ⏱️ {Math.floor(net/60)}h{String(net%60).padStart(2,"0")} net
                        {pause>0&&<span style={{fontSize:11,fontWeight:400,color:C.tx3,marginLeft:8}}>
                          (brut {Math.floor(brut/60)}h{String(brut%60).padStart(2,"0")} − pause {Math.floor(pause/60)}h{String(pause%60).padStart(2,"0")})
                        </span>}
                      </div>
                    );
                  })()}
                </div>

                <SectionTitle icon="🌤️" label="Conditions"/>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  {[["beau","☀️","Beau"],["nuageux","⛅","Nuageux"],["pluie","🌧️","Pluie"],["vent","💨","Vent"]].map(([v,e,l])=>(
                    <button key={v} onClick={()=>setMeteo(v)} style={{
                      flex:1,padding:"10px 4px",borderRadius:10,
                      border:`1.5px solid ${meteo===v?C.purple:C.bd}`,
                      background:meteo===v?C.purpleL:"#fff",cursor:"pointer",
                      fontFamily:"inherit",display:"flex",flexDirection:"column",
                      alignItems:"center",gap:3,WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontSize:20}}>{e}</span>
                      <span style={{fontSize:10,color:meteo===v?C.purpleD:C.tx2}}>{l}</span>
                    </button>
                  ))}
                </div>
                <MInput label="Incident / Remarque" value={incident} onChange={setIncid}
                  placeholder="Panne, accident, remarque…" big hint="optionnel"/>
              </>
            )}

            {/* ── FORMULAIRE ABATTEUR ── */}
            {typeOp!=="debardage"&&(
              <>
                <SectionTitle icon="📦" label="Mesures du tas"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <MInput label="Nombre de tas" value={String(nbTas||"")}
                    onChange={v=>setNbTas(parseInt(v)||0)} type="number" placeholder="ex: 3"/>
                  <MInput label="Longueur (m)" value={String(longueur||"")}
                    onChange={v=>setLong(parseFloat(v)||0)} type="number" placeholder="ex: 4"/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <MInput label="Largeur (m)" value={String(largeur||"")}
                    onChange={v=>setLarg(parseFloat(v)||0)} type="number" placeholder="ex: 1.2"/>
                  <MInput label="Hauteur (m)" value={String(hauteur||"")}
                    onChange={v=>setHaut(parseFloat(v)||0)} type="number" placeholder="ex: 1.5"/>
                </div>

                <SectionTitle icon="🌬️" label="Foisonnement"/>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  {[
                    [0.40,"Très vrac","Bois fraîchement abattu, mal empilé","🪵"],
                    [0.55,"Débardé en tas","État habituel après débardage","🚜"],
                    [0.65,"Bien empilé","Bois rangé soigneusement","📐"],
                  ].map(([v,l,s,e]: any)=>(
                    <div key={v} onClick={()=>setFoison(v)} style={{
                      padding:"12px 14px",borderRadius:12,cursor:"pointer",
                      border:`2px solid ${foisonnement===v?C.green:C.bd}`,
                      background:foisonnement===v?C.greenL:"#fff",
                      WebkitTapHighlightColor:"transparent"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:14,fontWeight:600,
                            color:foisonnement===v?C.greenD:C.tx}}>{e} {l}</div>
                          <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{s}</div>
                        </div>
                        <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,
                          color:foisonnement===v?C.greenD:C.tx3}}>
                          {Math.round(v*100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <SectionTitle icon="⏱️" label="Horaires"/>
                <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${C.bd}`}}>
                  {/* Heure début */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>🕐 Heure de début</div>
                    <input type="time" value={heureDebAb} onChange={e=>setHeureDebAb(e.target.value)}
                      style={{width:"100%",padding:"14px 16px",borderRadius:10,fontSize:20,fontWeight:700,
                        boxSizing:"border-box",border:`2px solid ${heureDebAb?C.green:C.bd}`,
                        background:heureDebAb?C.greenL:"#fff",color:heureDebAb?C.greenD:"#333",fontFamily:"inherit"}}/>
                  </div>
                  {/* Pause déjeuner */}
                  <div style={{background:"#FFF8E1",borderRadius:10,padding:12,marginBottom:12,
                    border:"1px solid #FFD54F"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#795548",marginBottom:8}}>
                      🍽️ Pause déjeuner (optionnel)
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[["Début pause",pauseDebutAb,setPauseDebAb],["Fin pause",pauseFinAb,setPauseFinAb]].map(([lbl,val,set]: any,i: any)=>(
                        <div key={i}>
                          <div style={{fontSize:11,color:"#795548",marginBottom:6}}>{lbl}</div>
                          <input type="time" value={val} onChange={e=>set(e.target.value)}
                            style={{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:16,fontWeight:600,
                              boxSizing:"border-box",border:`1.5px solid ${val?"#FF8F00":"#E0E0E0"}`,
                              background:val?"#FFF3E0":"#fff",color:val?"#795548":"#333",fontFamily:"inherit"}}/>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Heure fin */}
                  <div style={{marginBottom:heureDebAb&&heureFinAb?12:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>🕕 Heure de fin</div>
                    <input type="time" value={heureFinAb} onChange={e=>setHeureFinAb(e.target.value)}
                      style={{width:"100%",padding:"14px 16px",borderRadius:10,fontSize:20,fontWeight:700,
                        boxSizing:"border-box",border:`2px solid ${heureFinAb?C.amber:C.bd}`,
                        background:heureFinAb?C.amberL:"#fff",color:heureFinAb?C.amberD:"#333",fontFamily:"inherit"}}/>
                  </div>
                  {/* Calcul temps net */}
                  {heureDebAb&&heureFinAb&&(()=>{
                    const toMins = (t: any)=>{ const [h,m]=t.split(":").map(Number); return h*60+m; };
                    const brut = toMins(heureFinAb)-toMins(heureDebAb);
                    const pause = (pauseDebutAb&&pauseFinAb) ? toMins(pauseFinAb)-toMins(pauseDebutAb) : 0;
                    const net = brut - Math.max(0,pause);
                    if(brut<=0) return null;
                    return(
                      <div style={{background:C.greenL,borderRadius:10,padding:12,
                        fontSize:14,fontWeight:700,color:C.greenD,textAlign:"center"}}>
                        ⏱️ {Math.floor(net/60)}h{String(net%60).padStart(2,"0")} net
                        {pause>0&&<span style={{fontSize:11,fontWeight:400,color:C.tx3,marginLeft:8}}>
                          (brut {Math.floor(brut/60)}h{String(brut%60).padStart(2,"0")} − pause {Math.floor(pause/60)}h{String(pause%60).padStart(2,"0")})
                        </span>}
                      </div>
                    );
                  })()}
                </div>

                <SectionTitle icon="🌤️" label="Conditions"/>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  {[["beau","☀️","Beau"],["nuageux","⛅","Nuageux"],["pluie","🌧️","Pluie"],["vent","💨","Vent"]].map(([v,e,l])=>(
                    <button key={v} onClick={()=>setMeteo(v)} style={{
                      flex:1,padding:"10px 4px",borderRadius:10,
                      border:`1.5px solid ${meteo===v?C.green:C.bd}`,
                      background:meteo===v?C.greenL:"#fff",cursor:"pointer",
                      fontFamily:"inherit",display:"flex",flexDirection:"column",
                      alignItems:"center",gap:3,WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontSize:20}}>{e}</span>
                      <span style={{fontSize:10,color:meteo===v?C.greenD:C.tx2}}>{l}</span>
                    </button>
                  ))}
                </div>
                <MInput label="Incident / Remarque" value={incident} onChange={setIncid}
                  placeholder="Panne, accident, remarque…" big hint="optionnel"/>

                {/* Récap calcul automatique */}
                {nbTas>0&&longueur>0&&largeur>0&&hauteur>0&&(
                  <div style={{background:C.amberL,borderRadius:14,padding:16,marginBottom:16,
                    border:`1.5px solid ${C.amber}`}}>
                    <div style={{fontSize:12,color:C.amberD,fontWeight:700,marginBottom:12}}>
                      📊 Calcul automatique (indices ITEBE)
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[
                        [Math.round(volApparent*10)/10+" m³","Apparent"],
                        [poidsTotal+" t","Poids"],
                        [energieMWh+" MWh","Énergie"],
                      ].map(([v,l],i)=>(
                        <div key={i} style={{textAlign:"center",
                          background:"rgba(186,117,23,.1)",borderRadius:10,padding:10}}>
                          <div style={{fontSize:16,fontWeight:700,color:C.amberD}}>{v}</div>
                          <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:8,textAlign:"center"}}>
                      {essenceVisite} · {Math.round(indices?.densite)} kg/m³ · PCI {indices?.pci?.toFixed(1)} MWh/t
                    </div>
                  </div>
                )}
              </>
            )}
          </>) }
          </div>
        )}
      </div>

      {screen==="releve"&&!doublonDetecte&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,
          padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
          <BigBtn onClick={handleSaveReleve} disabled={saving}
            bg={C.green} icon={saving?"":"✅"}>
            {saving?"Enregistrement…":"VALIDER LE RELEVÉ"}
          </BigBtn>
        </div>
      )}
    </div>
  );
};

// ── COULEURS STATUT LOT ───────────────────────────────────────

// ── ÉCRAN ACCUEIL ─────────────────────────────────────────────
export const EcranAccueil = ({contacts, notifications, user, livraisons=[], transports=[], dechiquetages=[], onNewLot, onGoLots, onGoAlertes, onGoDelegations, onAppelerContact, onOpenMenu}: any) => {
  const STATUTS_EXPLOITATION = ["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE","EN_STOCK_PLATEFORME","LIVRE"];
  const lotsAVisiter = contacts.filter((c: any)=>c.lotNumero&&(c.statutLot==="VISITE_PREVUE"||c.statutLot==="NOUVEAU"||!c.statutLot)&&!STATUTS_EXPLOITATION.includes(c.statutLot));
  const chantiersJour = contacts.filter((c: any)=>["EN_COURS_EXPLOITATION","VALIDE_EXPLOITATION"].includes(c.statutLot));
  const alertes = notifications.filter((n: any)=>!n.lu);

  // ── KPIs tonnage (identiques au tableau de bord PC) ──────────
  const moisCourant = new Date().toISOString().slice(0,7);
  const livraisonsDuMois = livraisons.filter((l: any)=>(l.date||l.createdAt||"").slice(0,7)===moisCourant);
  const tonnesLivreesMois = livraisonsDuMois.reduce((s: number,l: any)=>s+(l.poidsNet||l.poidsBrut||0),0);
  const nbJoursMois = new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const tonnageParJour: number[] = Array.from({length:nbJoursMois},()=>0);
  livraisonsDuMois.forEach((l: any)=>{ const j=parseInt((l.date||l.createdAt||"").slice(8,10),10); if(j>=1&&j<=nbJoursMois) tonnageParJour[j-1]+=(l.poidsNet||l.poidsBrut||0); });
  const humidites = livraisons.map((l: any)=>parseFloat(l.humiditeReception)).filter((n: number)=>!isNaN(n));
  const humiditeMoyenne = humidites.length ? humidites.reduce((s: number,n: number)=>s+n,0)/humidites.length : null;
  const stockPlateformes = contacts.filter((c: any)=>["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_STOCK_PLATEFORME"].includes(c.statutLot)).reduce((s: number,c: any)=>s+(parseFloat(c.tonnageCumul)||0),0);
  const stockChaufferies = livraisons.reduce((s: number,l: any)=>s+(l.poidsNet||l.poidsBrut||0),0);
  const cmrTotal = dechiquetages.length;
  const cmrConformes = dechiquetages.filter((d: any)=>d.numeroCMR&&d.photoCMR).length;
  const tauxConformite = cmrTotal ? Math.round((cmrConformes/cmrTotal)*100) : null;
  const transportsEnCours = transports.filter((t: any)=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut));

  const [comptes, setComptes] = useState<any[]>(()=>comptesLocalGet() as any[]);
  const [showInscrits, setShowInscrits] = useState(false);
  const [ficheCompte, setFicheCompte] = useState<any>(null);
  const [rapportTexte, setRapportTexte] = useState("");
  useEffect(()=>{
    apiGet(`/comptes-contact`)
      .then(d=>{ if(Array.isArray(d)){
        const local = comptesLocalGet() as any[];
        const nonSynced = local.filter((c: any)=>!c.synced && !d.some((a: any)=>a.id===c.id));
        const merged = [...nonSynced, ...d];
        setComptes(merged); comptesLocalSave(merged);
      } })
      .catch(()=>{});
  },[]);

  const sauvegarderRapport = (compte: any) => {
    if (!rapportTexte.trim()) return;
    const updated = comptes.map(c=>c.id===compte.id?{...c,rapportAppel:rapportTexte,dateRapport:nowISO()}:c);
    setComptes(updated); comptesLocalSave(updated);
    apiPatch(`/comptes-contact/${compte.id}`, {rapportAppel:rapportTexte,dateRapport:nowISO()}).catch(()=>{});
    setFicheCompte(null); setRapportTexte(""); setShowInscrits(false);
  };

  const comptesEnAttente = comptes.filter(c=>c.trancheHoraire&&!c.rapportAppel);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflowY:"auto",
      padding:PADDING,paddingBottom:90}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:13,color:C.tx3}}>{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
        <div style={{fontSize:22,fontWeight:700,color:C.tx,marginTop:2}}>
          Bonjour {user?.prenom||user?.nom} 👋
        </div>
      </div>
      {(user?.role==="admin"||user?.role==="manager")&&comptes.length>0&&(
        <div onClick={()=>setShowInscrits(true)} style={{background:"#E8F5E9",borderRadius:14,padding:16,
          marginBottom:12,border:`1.5px solid ${C.green}`,cursor:"pointer",
          display:"flex",alignItems:"center",gap:10,
          WebkitTapHighlightColor:"transparent"}}>
          <span style={{fontSize:24}}>📲</span>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:C.greenD}}>
              {comptes.length} inscrit{comptes.length>1?"s":""} APPLITAG Connect
            </div>
            <div style={{fontSize:12,color:C.greenD,opacity:.8}}>Appuyer pour voir la liste</div>
          </div>
          <span style={{fontSize:18,color:C.greenD}}>›</span>
        </div>
      )}
      {(user?.role==="admin"||user?.role==="manager")&&comptesEnAttente.length>0&&(
        <div onClick={()=>setShowInscrits(true)} style={{background:"#FFF3E0",borderRadius:14,padding:16,
          marginBottom:12,border:"1.5px solid #FF9800",cursor:"pointer",
          display:"flex",alignItems:"center",gap:10,
          WebkitTapHighlightColor:"transparent"}}>
          <span style={{fontSize:24}}>📞</span>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:"#E65100"}}>
              {comptesEnAttente.length} rappel{comptesEnAttente.length>1?"s":""} en attente
            </div>
            <div style={{fontSize:12,color:"#E65100",opacity:.8}}>
              {comptesEnAttente.map(c=>c.trancheHoraire).join(", ")}
            </div>
          </div>
          <span style={{fontSize:18,color:"#E65100"}}>›</span>
        </div>
      )}
      {showInscrits&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:3000,
          display:"flex",flexDirection:"column",justifyContent:"flex-end"}}
          onClick={e=>{ if(e.target===e.currentTarget) setShowInscrits(false); }}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"80vh",
            display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${C.bd}`,
              display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{fontSize:16,fontWeight:700,color:C.tx}}>
                📲 Inscrits APPLITAG Connect
              </div>
              <button onClick={()=>setShowInscrits(false)} style={{background:"none",border:"none",
                fontSize:22,cursor:"pointer",color:C.tx3,lineHeight:1}}>×</button>
            </div>
            <div style={{overflowY:"auto",padding:"12px 16px 24px"}}>
              {comptes.length===0?(
                <div style={{fontSize:13,color:C.tx3,textAlign:"center",padding:24}}>Aucun inscrit</div>
              ):comptes.map(c=>(
                <div key={c.id} onClick={()=>{ setFicheCompte(c); setRapportTexte(c.rapportAppel||""); }}
                  style={{background:C.bg,borderRadius:12,padding:"12px 14px",
                  marginBottom:8,border:`1px solid ${c.trancheHoraire&&!c.rapportAppel?"#FF9800":C.bd}`,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.tx}}>{c.nom}</div>
                  {c.email&&<div style={{fontSize:12,color:C.tx3,marginTop:2}}>✉ {c.email}</div>}
                  {c.telephone&&<div style={{fontSize:12,color:C.tx3,marginTop:1}}>📞 {c.telephone}</div>}
                  {c.natureDemande?.length>0&&<div style={{fontSize:11,color:C.purple,marginTop:3,lineHeight:1.5}}>{c.natureDemande.join(" · ")}</div>}
                  {c.trancheHoraire&&<div style={{fontSize:11,color:"#E65100",marginTop:3}}>⏰ {c.trancheHoraire}{c.rapportAppel?" ✓":""}</div>}
                  <div style={{fontSize:11,color:C.tx3,marginTop:4,opacity:.7}}>
                    Inscrit le {c.dateCreation?new Date(c.dateCreation).toLocaleDateString('fr-FR'):"—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {ficheCompte&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:4000,
          display:"flex",flexDirection:"column",justifyContent:"flex-end"}}
          onClick={e=>{ if(e.target===e.currentTarget){ setFicheCompte(null); setRapportTexte(""); } }}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"90vh",
            display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${C.bd}`,
              display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{fontSize:16,fontWeight:700,color:C.tx}}>Fiche contact</div>
              <button onClick={()=>{ setFicheCompte(null); setRapportTexte(""); }}
                style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.tx3,lineHeight:1}}>×</button>
            </div>
            <div style={{overflowY:"auto",padding:"16px 20px 32px"}}>
              <div style={{fontSize:18,fontWeight:700,color:C.tx,marginBottom:4}}>{ficheCompte.nom}</div>
              <div style={{fontSize:12,color:C.tx3,marginBottom:ficheCompte.natureDemande?.length>0?8:12}}>
                Inscrit le {ficheCompte.dateCreation?new Date(ficheCompte.dateCreation).toLocaleDateString('fr-FR'):"—"}
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:600,color:C.tx3,marginBottom:6,textTransform:"uppercase",letterSpacing:".05em"}}>Nature de la demande</div>
                {ficheCompte.natureDemande?.length>0?(
                  ficheCompte.natureDemande.map((n: any)=>(
                    <div key={n} style={{display:"inline-block",marginRight:6,marginBottom:6,
                      padding:"4px 10px",borderRadius:20,background:C.purpleL,
                      border:`1px solid ${C.purple}`,fontSize:12,color:C.purpleD||C.purple}}>
                      {n}
                    </div>
                  ))
                ):(
                  <div style={{fontSize:12,color:C.tx3,fontStyle:"italic"}}>Non précisée</div>
                )}
              </div>
              <div style={{background:"#FFF3E0",borderRadius:10,padding:"8px 12px",marginBottom:12,
                border:"1px solid #FFB74D",fontSize:13,color:"#E65100"}}>
                ⏰ Rappel souhaité : <strong>{ficheCompte.trancheHoraire||"Non précisé"}</strong>
                {ficheCompte.rapportAppel&&<span style={{color:C.green,marginLeft:8}}>✓ Rapport saisi</span>}
              </div>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                {ficheCompte.telephone&&(
                  <button onClick={()=>{
                      window.location.href=`tel:${ficheCompte.telephone.replace(/\s/g,"")}`;
                      if(onAppelerContact) onAppelerContact(ficheCompte);
                    }}
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                      padding:"14px 10px",borderRadius:12,background:C.greenL,
                      border:`1.5px solid ${C.green}`,color:C.greenD,
                      fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                      WebkitTapHighlightColor:"transparent"}}>
                    📞 Appeler
                  </button>
                )}
                {ficheCompte.email&&(
                  <a href={`mailto:${ficheCompte.email}?subject=${encodeURIComponent("Suite à votre demande APPLITAG Connect")}&body=${encodeURIComponent(`Bonjour ${ficheCompte.nom},\n\nSuite à votre inscription APPLITAG Connect${ficheCompte.natureDemande?.length>0?` concernant : ${ficheCompte.natureDemande.join(", ")}`:""}.\n\nCordialement,`)}`}
                    style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                      padding:"14px 10px",borderRadius:12,background:C.blueL,
                      border:`1.5px solid ${C.blue}`,color:C.blueD||C.blue,textDecoration:"none",
                      fontSize:14,fontWeight:600}}>
                    ✉ Email
                  </a>
                )}
              </div>
              {ficheCompte.telephone&&(
                <div style={{fontSize:12,color:C.tx3,marginBottom:2}}>📞 {ficheCompte.telephone}</div>
              )}
              {ficheCompte.email&&(
                <div style={{fontSize:12,color:C.tx3,marginBottom:12}}>✉ {ficheCompte.email}</div>
              )}
              <div style={{borderTop:`1px solid ${C.bd}`,paddingTop:14,marginTop:4}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:8}}>Rapport d'appel</div>
                {ficheCompte.rapportAppel?(
                  <div>
                    <div style={{background:C.bg,borderRadius:10,padding:"10px 12px",fontSize:13,
                      color:C.tx,border:`1px solid ${C.bd}`,marginBottom:6}}>{ficheCompte.rapportAppel}</div>
                    <div style={{fontSize:11,color:C.tx3}}>
                      Saisi le {ficheCompte.dateRapport?new Date(ficheCompte.dateRapport).toLocaleDateString('fr-FR'):"—"}
                    </div>
                  </div>
                ):(
                  <div>
                    <textarea value={rapportTexte} onChange={e=>setRapportTexte(e.target.value)}
                      placeholder="Notes sur l'appel…"
                      rows={4} style={{width:"100%",padding:"10px 12px",borderRadius:10,
                        border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,
                        color:C.tx,resize:"none",outline:"none",marginBottom:10}}/>
                    <button onClick={()=>sauvegarderRapport(ficheCompte)}
                      style={{width:"100%",height:46,borderRadius:12,
                        background:C.green,border:"none",color:"#fff",
                        fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                        WebkitTapHighlightColor:"transparent"}}>
                      ✅ Valider le rapport
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {icon:"🔭",label:"À visiter",count:lotsAVisiter.length,color:C.amber,labelColor:C.tx2,bg:C.amberL,action:()=>onGoLots("VISITE_PREVUE")},
          {icon:"🪓",label:"En exploitation",count:chantiersJour.length,color:C.blue,labelColor:C.tx2,bg:C.blueL,action:()=>onGoLots("EN_COURS_EXPLOITATION")},
          {icon:"📦",label:"Bord de route",count:contacts.filter((c: any)=>c.statutLot==="BORD_ROUTE").length,color:C.brown,labelColor:C.tx2,bg:C.brownL,action:()=>onGoLots("BORD_ROUTE")},
          {icon:"🚛",label:"Transports",count:contacts.filter((c: any)=>c.statutLot==="EN_LIVRAISON").length,color:C.purple,labelColor:C.tx2,bg:C.purpleL,action:()=>onGoLots("EN_LIVRAISON")},
          {icon:"✅",label:"Livraisons",count:contacts.filter((c: any)=>c.statutLot==="LIVRE_CHAUFFERIE").length,color:C.green,labelColor:C.tx2,bg:C.greenL,action:()=>onGoLots("LIVRE_CHAUFFERIE")},
          {icon:"⚠️",label:"Alertes",count:alertes.length,color:alertes.length>0?"#fff":C.red,labelColor:alertes.length>0?"rgba(255,255,255,.8)":C.tx2,bg:alertes.length>0?C.red:C.redL,action:onGoAlertes},
          {icon:"🏢",label:"Délégations",count:null,color:C.purpleD,labelColor:C.tx2,bg:C.purpleL,action:onGoDelegations},
        ].filter(card=>card.icon!=="🏢"||(user?.role==="admin"||user?.role==="manager")).map((card,i)=>(
          <div key={i} onClick={card.action} style={{
            background:card.bg,borderRadius:14,padding:"14px 10px",cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
            <div style={{fontSize:22,marginBottom:6}}>{card.icon}</div>
            <div style={{fontSize:22,fontWeight:700,color:card.color,fontFamily:FONT_TITLE}}>{card.count??""}</div>
            <div style={{fontSize:11,color:card.labelColor,marginTop:2}}>{card.label}</div>
          </div>
        ))}
      </div>
      {/* ── Tonnages du mois ── */}
      <div style={{fontSize:13,fontWeight:700,color:C.tx2,marginBottom:8,fontFamily:FONT_TITLE}}>
        Tonnages du mois
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:"#fff",borderRadius:14,padding:14,border:`1px solid ${C.bd}`}}>
          <div style={{fontSize:18,marginBottom:4}}>⚖️</div>
          <div style={{fontSize:22,fontWeight:700,color:C.brown,fontFamily:FONT_TITLE}}>{fmtNum(tonnesLivreesMois)} t</div>
          <div style={{fontSize:11,color:C.tx3,marginTop:2,marginBottom:6}}>Livré ce mois</div>
          <MiniBarChart data={tonnageParJour} color={C.brown} height={30}/>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:14,border:`1px solid ${C.bd}`}}>
          <div style={{fontSize:18,marginBottom:4}}>💧</div>
          <div style={{fontSize:22,fontWeight:700,color:C.blueD,fontFamily:FONT_TITLE}}>
            {humiditeMoyenne!=null?fmtNum(humiditeMoyenne,1)+" %":"—"}
          </div>
          <div style={{fontSize:11,color:C.tx3,marginTop:2}}>Humidité moyenne</div>
        </div>
      </div>

      {/* ── Stocks & Conformité ── */}
      <div style={{fontSize:13,fontWeight:700,color:C.tx2,marginBottom:8,fontFamily:FONT_TITLE}}>
        Stocks &amp; Conformité
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        {[
          {icon:"📥",label:"Stock plateformes",val:fmtNum(stockPlateformes)+" t",color:C.greenD},
          {icon:"🔥",label:"Stock chaufferies",val:fmtNum(stockChaufferies)+" t",color:C.brown},
          {icon:"✅",label:"Conformité CMR",val:tauxConformite!=null?tauxConformite+" %":"—",color:C.green},
        ].map((k,i)=>(
          <div key={i} style={{flex:"1 1 0",background:"#fff",borderRadius:14,padding:"12px 8px",border:`1px solid ${C.bd}`,minWidth:0}}>
            <div style={{fontSize:16,marginBottom:4}}>{k.icon}</div>
            <div style={{fontSize:16,fontWeight:700,color:k.color,fontFamily:FONT_TITLE,lineHeight:1.2}}>{k.val}</div>
            <div style={{fontSize:10,color:C.tx3,marginTop:2,lineHeight:1.3}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Transports en cours ── */}
      {transportsEnCours.length>0&&(
        <>
          <div style={{fontSize:13,fontWeight:700,color:C.tx2,marginBottom:8,fontFamily:FONT_TITLE}}>
            🚛 Transports en cours
          </div>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:"0 14px",marginBottom:16}}>
            {transportsEnCours.slice(0,3).map((t: any,i: number)=>(
              <div key={t.id||i} style={{display:"flex",alignItems:"center",gap:10,
                padding:"12px 0",borderBottom:i<Math.min(transportsEnCours.length,3)-1?`1px solid ${C.bd}`:"none"}}>
                <span style={{fontSize:16}}>🚛</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx,fontFamily:"monospace"}}>{t.lotNumero||"—"}</div>
                  <div style={{fontSize:11,color:C.tx3}}>{t.societeTransp||t.immatTracteur||"Transporteur"}</div>
                </div>
                <span style={{fontSize:10,color:C.green,fontWeight:600}}>● En route</span>
              </div>
            ))}
            {transportsEnCours.length>3&&(
              <div style={{fontSize:11,color:C.tx3,padding:"8px 0",borderTop:`1px solid ${C.bd}`}}>
                + {transportsEnCours.length-3} autres transports
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Alertes non lues ── */}
      {alertes.slice(0,2).length>0&&(
        <>
          <div style={{fontSize:13,fontWeight:700,color:C.tx2,marginBottom:8,fontFamily:FONT_TITLE}}>
            🔔 Alertes non lues
          </div>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:"0 14px",marginBottom:16}}>
            {alertes.slice(0,2).map((n: any,i: number)=>(
              <div key={n.id||i} onClick={onGoAlertes} style={{display:"flex",gap:10,
                padding:"12px 0",cursor:"pointer",WebkitTapHighlightColor:"transparent",
                borderBottom:i<Math.min(alertes.length,2)-1?`1px solid ${C.bd}`:"none"}}>
                <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:C.tx,lineHeight:1.4}}>{n.message||n.titre||"—"}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                    {n.date?new Date(n.date).toLocaleString("fr-FR"):""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{fontSize:13,fontWeight:700,color:C.tx2,marginBottom:10,fontFamily:FONT_TITLE}}>
        Chantiers du jour
      </div>
      {chantiersJour.length===0&&(
        <div style={{fontSize:13,color:C.tx3,marginBottom:14}}>Aucun chantier en cours.</div>
      )}
      {chantiersJour.slice(0,5).map((c: any)=>{
        const st = STATUT_LOT[c.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
        return (
          <div key={c.id} onClick={()=>onGoLots("EN_COURS_EXPLOITATION")}
            style={{background:"#fff",border:`1px solid ${C.bd}`,cursor:"pointer",
            borderRadius:14,padding:14,marginBottom:10,display:"flex",
            alignItems:"center",gap:12,WebkitTapHighlightColor:"transparent"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:st.color,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontFamily:"monospace",fontSize:12,color:C.greenD,fontWeight:600}}>{c.lotNumero}</div>
              <div style={{fontSize:13,color:C.tx,marginTop:1}}>{c.nom} · {c.commune}</div>
            </div>
            <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,
              background:st.bg,color:st.color,fontWeight:600,whiteSpace:"nowrap"}}>
              {st.label}
            </span>
          </div>
        );
      })}
      <div style={{marginTop:8}}>
        <BigBtn onClick={onNewLot} bg={C.green} icon="➕">NOUVEAU LOT</BigBtn>
      </div>

      {/* Bouton tiroir */}
      <div onClick={()=>onOpenMenu&&onOpenMenu()} style={{
        marginTop:12,display:"flex",alignItems:"center",justifyContent:"center",
        gap:8,padding:"14px",borderRadius:14,
        background:C.bg2,border:`1.5px solid ${C.bd}`,cursor:"pointer",
        WebkitTapHighlightColor:"transparent"}}>
        <span style={{fontSize:18}}>⊞</span>
        <span style={{fontSize:14,fontWeight:600,color:C.tx2}}>Tous les modules</span>
        <span style={{background:C.greenL,color:C.greenD,fontSize:11,fontWeight:700,
          borderRadius:10,padding:"2px 8px"}}>
          {GROUPES_MODULES.reduce((n,g)=>n+g.items.length,0)}
        </span>
      </div>

    </div>
  );
};

// ── ÉCRAN DÉLÉGATIONS ENTREPRISES ──────────────────────────────
const TYPES_TRAVAUX_DELEGATION = [
  ["abattage","🪓","Abattage"],
  ["debardage","🚜","Débardage"],
  ["dechiquetage","🌀","Déchiquetage"],
  ["transport","🚛","Transport"],
  ["autre","…","Autre"],
];

export const EcranDelegations = ({entrepriseId, toast, onBack}: any) => {
  const [entreprises,  setEntreprises]  = useState<any[]>([]);
  const [contacts,     setContacts]     = useState<any[]>([]);
  const [showNew,      setShowNew]      = useState(false);
  const [saving,       setSaving]       = useState(false);

  // Formulaire création entreprise
  const [nom,           setNom]          = useState("");
  const [siret,         setSiret]        = useState("");
  const [adressePostale,setAdresse]      = useState("");
  const [complementAdresse,setComplementAdresse] = useState("");
  const [commune,       setCommune]      = useState("");
  const [codePostal,    setCP]           = useState("");
  const [telephone,     setTel]          = useState("");
  const [email,         setEmail]        = useState("");
  const [contactNom,    setContactNom]   = useState("");
  const [contactPrenom, setContactPrenom]= useState("");
  const [contactTel,    setContactTel]   = useState("");
  const [contactFonction,setContactFonction] = useState("");
  const [typesProposes, setTypesProp]    = useState<any[]>([]);

  // Mission sur un lot
  const [selEntId,      setSelEntId]     = useState("");
  const [missionLotId,  setMissionLotId] = useState("");
  const [missionType,   setMissionType]  = useState("abattage");
  const [delaiExecution,setDelaiExecution]= useState(()=>{
    const d=new Date(); d.setDate(d.getDate()+14); return d.toISOString().slice(0,10);
  });
  const [missionSaving, setMissionSaving]= useState(false);
  const [ordreGenere,   setOrdreGenere]  = useState<any>(null);
  const [ordresLocaux,  setOrdresLocaux] = useState<any[]>(()=>ordresExplLocalGet() as any[]);

  // Filtrage croisé lots ↔ entreprises ↔ type
  const DELAI_ATTENTE_MS = 5 * 24 * 60 * 60 * 1000; // 5 jours
  // Types bloquants par lot : ordre en_attente < 5 jours OU accepte. Exclut refuse et en_attente expiré.
  const typesCouvertsParLot: Record<string,any> = ordresLocaux.reduce((acc: any,o: any)=>{
    const age = Date.now() - new Date(o.dateEmission).getTime();
    const bloquant = o.statut==="accepte" || (o.statut==="en_attente" && age < DELAI_ATTENTE_MS);
    if (!bloquant) return acc;
    if (!acc[o.lotId]) acc[o.lotId]=new Set();
    acc[o.lotId].add(o.missionType);
    return acc;
  },{} as Record<string,any>);
  const entSelec = entreprises.find(e=>e.id===selEntId);
  const typesEntreprise = entSelec?.typesProposes?.length ? entSelec.typesProposes : null;
  // Lots dispo : ont un lotNumero + le type courant n'est pas déjà commandé + si entreprise sélectionnée, au moins un de ses types n'est pas couvert
  const lotsDisponibles = contacts.filter(c=>{
    if (!c.lotNumero) return false;
    const couverts = typesCouvertsParLot[c.id] || new Set();
    if (typesEntreprise) {
      // au moins un type de l'entreprise n'est pas encore couvert sur ce lot
      return typesEntreprise.some((t: any)=>!couverts.has(t));
    }
    return true;
  });
  // Entreprises compatibles : si un lot est sélectionné, ne garder que celles dont au moins un typesProposes n'est pas couvert sur ce lot
  const lotSelec = contacts.find(c=>c.id===missionLotId);
  const entreprisesCompatibles = entreprises.filter(e=>{
    if (!e.typesProposes?.length) return true;
    // doit proposer le type de mission sélectionné
    if (!e.typesProposes.includes(missionType)) return false;
    // si un lot est sélectionné, ce type ne doit pas être déjà couvert
    if (lotSelec) {
      const couverts = typesCouvertsParLot[lotSelec.id] || new Set();
      if (couverts.has(missionType)) return false;
    }
    return true;
  });
  // Types disponibles pour le panneau de mission (intersection entreprise × non couvert sur lot)
  const typesDisponibles = TYPES_TRAVAUX_DELEGATION.filter(([v])=>{
    if (typesEntreprise && !typesEntreprise.includes(v)) return false;
    if (lotSelec) {
      const couverts = typesCouvertsParLot[lotSelec.id] || new Set();
      if (couverts.has(v)) return false;
    }
    return true;
  });

  // Répertoire — filtres
  const [filtreDept,       setFiltreDept]       = useState("");
  const [filtreSpecialite, setFiltreSpecialite] = useState("");
  const deptOf = (e: any) => e.codePostal ? String(e.codePostal).slice(0,2) : null;
  const deptsDisponibles = [...new Set(entreprises.map(deptOf).filter(Boolean))].sort();
  const entreprisesFiltrees = entreprises.filter(e=>
    (!filtreDept||deptOf(e)===filtreDept) &&
    (!filtreSpecialite||e.typesProposes?.includes(filtreSpecialite))
  );

  useEffect(()=>{
    try { const s=localStorage.getItem(`applitag_entreprises_${entrepriseId}`); if(s){ const p=JSON.parse(s); if(Array.isArray(p)) setEntreprises(p); } } catch { /* noop */ }
    apiGet(`/entreprises/entreprise/${entrepriseId}`)
      .then(d=>{ if(Array.isArray(d)){ setEntreprises(d); try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(d));} catch { /* noop */ } } }).catch(()=>{});
    apiGet(`/contacts`)
      .then(d=>{ if(Array.isArray(d)) setContacts(d); }).catch(()=>{});
  },[entrepriseId]);

  const toggleType = (v: any) => setTypesProp(prev=>prev.includes(v)?prev.filter((x: any)=>x!==v):[...prev,v]);

  const handleCreate = async () => {
    if (!nom.trim()) { toast("Le nom de l'entreprise est obligatoire","warn"); return; }
    setSaving(true);
    const entreprise = {
      nom, siret, adressePostale, complementAdresse, commune, codePostal,
      telephone, email, contactNom, contactPrenom, contactTel, contactFonction,
      typesProposes, entrepriseId,
    };
    let nouvelleEntId: string | undefined;
    try {
      const saved: any = await apiPost(`/entreprises`, entreprise);
      nouvelleEntId = saved.id;
      setEntreprises(prev=>{ const next=[saved,...prev]; try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(next));} catch { /* noop */ } return next; });
      toast(`Entreprise ${nom} créée ✓`);
    } catch {
      const localId = uid();
      nouvelleEntId = localId;
      setEntreprises(prev=>{ const next=[{...entreprise,id:localId},...prev]; try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(next));} catch { /* noop */ } return next; });
      toast("Entreprise enregistrée localement ✓");
    }
    if (nouvelleEntId) setSelEntId(nouvelleEntId);
    setNom(""); setSiret(""); setAdresse(""); setComplementAdresse(""); setCommune(""); setCP("");
    setTel(""); setEmail(""); setContactNom(""); setContactPrenom(""); setContactTel("");
    setContactFonction(""); setTypesProp([]);
    setShowNew(false);
    setSaving(false);
  };

  // Recale missionType si l'entreprise change et que le type courant n'est plus disponible
  useEffect(()=>{
    if (typesDisponibles.length && !typesDisponibles.find(([v])=>v===missionType)) {
      setMissionType(typesDisponibles[0][0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selEntId, missionLotId]);

  // Pré-remplit le délai d'exécution depuis la fiche du lot sélectionné
  useEffect(()=>{
    if (!missionLotId) return;
    const lot = contacts.find(c=>c.id===missionLotId) as any;
    if (lot?.delaiExecution) {
      setDelaiExecution(lot.delaiExecution);
    } else {
      const d=new Date(); d.setDate(d.getDate()+14);
      setDelaiExecution(d.toISOString().slice(0,10));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[missionLotId]);

  const handleMissionner = async () => {
    const ent = entreprises.find(e=>e.id===selEntId);
    const lot = contacts.find(c=>c.id===missionLotId);
    if (!ent||!lot) { toast("Sélectionner une entreprise et un lot","warn"); return; }
    if (!delaiExecution) { toast("Préciser un délai d'exécution","warn"); return; }
    setMissionSaving(true);
    const missionLabel = TYPES_TRAVAUX_DELEGATION.find(([v])=>v===missionType)?.[2]||missionType;
    const ordre = {
      id: uid(), code: genCode(), statut:"en_attente", entrepriseId,
      lotId: lot.id, lotNumero: lot.lotNumero, lotCommune: lot.commune,
      lotAdresse: lot.adresseParcelle, lotRefCadastrale: lot.refCadastrale,
      lotSurfaceHa: lot.surfaceHa,
      entrepriseDestId: ent.id, entrepriseNom: ent.nom,
      entrepriseAdresse: ent.adressePostale, entrepriseComplement: ent.complementAdresse,
      entrepriseCP: ent.codePostal, entrepriseCommune: ent.commune, entrepriseSiret: ent.siret,
      missionType, missionLabel, delaiExecution,
      dateEmission: nowISO(), synced:false,
    };
    try {
      await apiPatch(`/contacts/${missionLotId}`, {etfNom:ent.nom, etfId:ent.id, typeMission:missionType});
      setContacts(prev=>prev.map(c=>c.id===missionLotId?{...c,etfNom:ent.nom}:c));
      try {
        await apiPost(`/ordres-exploitation`, ordre);
        ordre.synced = true;
      } catch { /* noop */ }
      const newOrdres = [ordre, ...ordresExplLocalGet()];
      ordresExplLocalSave(newOrdres);
      setOrdresLocaux(newOrdres);
      setOrdreGenere(ordre);
      setTimeout(()=>{ document.getElementById("delegations-scroll")?.scrollTo({top:0,behavior:"smooth"}); },50);
      const html = buildOrdreExploitationHTML(ordre);
      generatePdfFromHtml(html, `OrdreExploitation_${lot.lotNumero||"APPLITAG"}.pdf`, toast);
      toast(`${ent.nom} missionnée (${missionLabel}) ✓`);
      setMissionLotId("");
    } catch { toast("Erreur API","warn"); }
    setMissionSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:C.purpleD,color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{fontSize:15,fontWeight:600}}>🏢 Délégations entreprises</div>
        </div>
      </div>

      <div ref={el=>{ if(el) (el as any)._scrollTopRef=el; }} data-scrollable="1" id="delegations-scroll" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:40}}>

        <SectionTitle icon="📖" label="Répertoire des entreprises"/>
        {entreprises.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <select value={filtreDept} onChange={e=>setFiltreDept(e.target.value)}
              style={{width:"100%",height:42,padding:"0 10px",borderRadius:10,
                border:`1.5px solid ${C.bd}`,fontSize:13,fontFamily:"inherit",
                background:"#fff",color:C.tx,outline:"none"}}>
              <option value="">Tous départements</option>
              {deptsDisponibles.map(d=>(
                <option key={d as string} value={d as string}>Département {d}</option>
              ))}
            </select>
            <select value={filtreSpecialite} onChange={e=>setFiltreSpecialite(e.target.value)}
              style={{width:"100%",height:42,padding:"0 10px",borderRadius:10,
                border:`1.5px solid ${C.bd}`,fontSize:13,fontFamily:"inherit",
                background:"#fff",color:C.tx,outline:"none"}}>
              <option value="">Toutes spécialités</option>
              {TYPES_TRAVAUX_DELEGATION.map(([v,e,l])=>(
                <option key={v} value={v}>{e} {l}</option>
              ))}
            </select>
          </div>
        )}
        {entreprisesFiltrees.length===0&&!showNew&&(
          <div style={{textAlign:"center",padding:"24px 0",color:C.tx3,fontSize:13}}>
            {entreprises.length===0?"Aucune entreprise référencée":"Aucune entreprise ne correspond aux filtres"}
          </div>
        )}
        {entreprisesFiltrees.map(e=>(
          <div key={e.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
            borderRadius:14,padding:14,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{e.nom}</div>
              {deptOf(e)&&(
                <span style={{fontSize:11,padding:"3px 8px",borderRadius:6,
                  background:C.blueL,color:C.blueD,fontWeight:700,flexShrink:0}}>
                  Dépt. {deptOf(e)}
                </span>
              )}
            </div>
            <div style={{fontSize:12,color:C.tx3,marginTop:4,lineHeight:1.7}}>
              {e.siret&&`SIRET ${e.siret} · `}{e.commune||"—"}{e.codePostal?` (${e.codePostal})`:""}<br/>
              {e.telephone&&`📞 ${e.telephone} `}{e.email&&`· 📧 ${e.email}`}
            </div>
            {e.typesProposes?.length>0&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                {e.typesProposes.map((t: any)=>{
                  const d = TYPES_TRAVAUX_DELEGATION.find(([v])=>v===t);
                  return d&&(
                    <span key={t} style={{fontSize:11,padding:"3px 8px",borderRadius:6,
                      background:C.purpleL,color:C.purpleD,fontWeight:600}}>
                      {d[1]} {d[2]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {!showNew ? (
          <button onClick={()=>setShowNew(true)} style={{width:"100%",height:48,borderRadius:12,
            background:C.purpleL,color:C.purpleD,border:`1.5px solid ${C.purple}`,
            fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:20,
            WebkitTapHighlightColor:"transparent"}}>
            ➕ Créer une entreprise
          </button>
        ) : (
          <div style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:14,
            padding:16,marginBottom:20}}>
            <SectionTitle icon="🏢" label="Nouvelle entreprise"/>
            <MInput label="Nom de l'entreprise" value={nom} onChange={setNom}
              placeholder="Ex: ETF Gaillard" required/>
            <MInput label="SIRET" value={siret} onChange={setSiret}
              placeholder="14 chiffres" hint="optionnel"/>
            <MInput label="Adresse" value={adressePostale} onChange={setAdresse}
              placeholder="Adresse postale" hint="optionnel"/>
            <MInput label="Complément d'adresse" value={complementAdresse} onChange={setComplementAdresse}
              placeholder="Bâtiment, étage, lieu-dit…" hint="optionnel"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MInput label="Code postal" value={codePostal} onChange={setCP} hint="optionnel"/>
              <MInput label="Commune" value={commune} onChange={setCommune} hint="optionnel"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MInput label="Téléphone" value={telephone} onChange={v=>setTel(formatPhone(v))} hint="optionnel"/>
              <MInput label="Email" value={email} onChange={setEmail} hint="optionnel"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MInput label="Nom du contact référent" value={contactNom} onChange={setContactNom}
                placeholder="Nom" hint="optionnel"/>
              <MInput label="Prénom du contact référent" value={contactPrenom} onChange={setContactPrenom}
                placeholder="Prénom" hint="optionnel"/>
            </div>
            <MInput label="Téléphone du contact référent" value={contactTel} onChange={v=>setContactTel(formatPhone(v))}
              placeholder="06 12 34 56 78" type="tel" hint="optionnel"/>
            <MInput label="Fonction" value={contactFonction} onChange={setContactFonction}
              placeholder="Ex: Gérant, Responsable travaux…" hint="optionnel"/>

            <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8,marginTop:6}}>
              Types de travaux proposés
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
              {TYPES_TRAVAUX_DELEGATION.map(([v,e,l])=>(
                <div key={v} onClick={()=>toggleType(v)} style={{
                  padding:"10px 6px",borderRadius:10,cursor:"pointer",textAlign:"center",
                  border:`1.5px solid ${typesProposes.includes(v)?C.purple:C.bd}`,
                  background:typesProposes.includes(v)?C.purpleL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:18}}>{e}</div>
                  <div style={{fontSize:11,fontWeight:typesProposes.includes(v)?600:400,
                    color:typesProposes.includes(v)?C.purpleD:C.tx2}}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowNew(false)} style={{flex:1,height:BTN_H,borderRadius:14,
                background:"#fff",border:`1.5px solid ${C.bd}`,color:C.tx2,
                fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>Annuler</button>
              <button onClick={handleCreate} disabled={saving} style={{flex:2,height:BTN_H,borderRadius:14,
                background:C.purple,border:"none",color:"#fff",
                fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
                {saving?"Création…":"Créer l'entreprise"}
              </button>
            </div>
          </div>
        )}

        <SectionTitle icon="🎯" label="Missionner sur un lot"/>
        {entreprises.length===0 ? (
          <div style={{background:C.bg2,borderRadius:12,padding:14,fontSize:12,color:C.tx3,textAlign:"center"}}>
            Créez d'abord une entreprise pour pouvoir la missionner
          </div>
        ) : ordreGenere ? (
          <div style={{background:"#fff",border:`1.5px solid ${C.green}`,borderRadius:14,padding:16}}>
            <div style={{background:C.greenL,borderRadius:12,padding:16,marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:11,color:C.greenD,fontWeight:600,marginBottom:8}}>
                ✅ Ordre d'exploitation généré
              </div>
              <div style={{fontFamily:"monospace",fontSize:32,fontWeight:800,
                color:C.greenD,letterSpacing:6}}>{ordreGenere.code}</div>
            </div>
            <div style={{background:C.bg,borderRadius:12,padding:14,marginBottom:14,
              fontSize:12,color:C.tx3,lineHeight:1.8}}>
              <strong>À transmettre à {ordreGenere.entrepriseNom} :</strong><br/>
              1. Ouvrir APPLITAG<br/>
              2. "Valider un ordre d'exploitation"<br/>
              3. Entrer le code : <strong style={{color:C.greenD}}>{ordreGenere.code}</strong><br/>
              4. Accepter ou refuser le chantier {ordreGenere.lotNumero}
            </div>
            <button onClick={()=>setOrdreGenere(null)} style={{width:"100%",height:BTN_H,
              borderRadius:14,background:C.green,border:"none",color:"#fff",
              fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
              ✓ TERMINÉ
            </button>
          </div>
        ) : (
          <div style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:14,padding:16}}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Lot</div>
              <select value={missionLotId} onChange={e=>setMissionLotId(e.target.value)}
                style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                  border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                  background:"#fff",color:C.tx,outline:"none"}}>
                <option value="">— Sélectionner un lot —</option>
                {lotsDisponibles.map(c=>(
                  <option key={c.id} value={c.id}>{c.lotNumero} · {c.nom} · {c.commune}</option>
                ))}
              </select>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Entreprise</div>
              <select value={selEntId} onChange={e=>setSelEntId(e.target.value)}
                style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                  border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                  background:"#fff",color:C.tx,outline:"none"}}>
                <option value="">— Sélectionner —</option>
                {entreprisesCompatibles.map(e=>(
                  <option key={e.id} value={e.id}>{e.nom}{e.typesProposes?.length?` · ${e.typesProposes.map((t: any)=>TYPES_TRAVAUX_DELEGATION.find(([v])=>v===t)?.[2]||t).join(", ")}`:"" }</option>
                ))}
              </select>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Type de mission</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {typesDisponibles.map(([v,e,l])=>(
                  <div key={v} onClick={()=>setMissionType(v)} style={{
                    padding:"10px 6px",borderRadius:10,cursor:"pointer",textAlign:"center",
                    border:`1.5px solid ${missionType===v?C.purple:C.bd}`,
                    background:missionType===v?C.purpleL:"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <div style={{fontSize:18}}>{e}</div>
                    <div style={{fontSize:11,fontWeight:missionType===v?600:400,
                      color:missionType===v?C.purpleD:C.tx2}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <MInput label="Délai d'exécution" value={delaiExecution} onChange={setDelaiExecution} type="date" required/>
            <button onClick={handleMissionner} disabled={missionSaving} style={{width:"100%",height:BTN_H,
              borderRadius:14,background:C.purple,border:"none",color:"#fff",
              fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
              {missionSaving?"Génération…":"📄 Générer l'ordre d'exploitation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── ÉCRAN LISTE LOTS ──────────────────────────────────────────

