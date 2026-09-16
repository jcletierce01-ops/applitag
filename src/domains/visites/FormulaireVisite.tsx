// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { C, BTN_H, INPUT_H, FONT_INPUT, PADDING } from "../../design-system/tokens.js";
import { IS_DEMO_BUILD } from "../../config/env.js";
import { uid, nowISO, todayS } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { indicesPonderes } from "../../metier/formules.js";
import { apiPost, apiGet } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle, MSlider, CheckItem } from "../../shared/ui.jsx";
import { SignatureCanvas } from "../../shared/SignatureCanvas.jsx";
import { GeoContextBadge as GeoCtxBadge } from "../../shared/GeoContextBadge.jsx";
import { TEXTES_REGL, CLAUSE_RESERVE, STATUT_REGL, VSS_RECONNUS } from "../../domains/dashboard/sections.constants.js";
import { MapZonesProtegees, GpsWidget, PhotosWidget, EssenceEditor, ChecklistChantier } from "./FormulaireVisite.widgets.jsx";
export const FormulaireVisite = ({lot, onBack, onSaved, toast, entrepriseId, user}: any) => {
  const [step,     setStep]    = useState(0);
  const [returnStep, setReturnStep] = useState<any>(null); // retour direct au récapitulatif après "Compléter"
  const [gps,      setGps]     = useState<any>(null);
  const [photos,   setPhotos]  = useState<any[]>([]);
  const [typeBiomasse, setTypeBiomasse] = useState("");
  const [essences, setEssences]= useState<any[]>([{id:"chene",emoji:"🌳",label:"Chêne",pct:100}]);
  const [volumeT,  setVolumeT] = useState(0);
  const [modeVolume, setModeVolume] = useState("manuel"); // manuel | slider | parha
  const [popParHa, setPopParHa] = useState("");
  const [diametreMoyen, setDiametreMoyen] = useState(""); // diamètre moyen à 1,20 m, en cm
  const [surfaceHa,setSurface] = useState(String(lot.surfaceHa||5));
  const [dateLimite,setDateL]  = useState("");
  const [observations,setObs]  = useState("");
  // Prix & conditions commerciales
  const [modeleContractuel, setModeleContractuel] = useState<string>("");
  const [prixTonne,     setPrixTonne]    = useState("");
  const [tauxTVA,       setTauxTVA]      = useState("5.5");
  const [acompte,       setAcompte]      = useState("");
  const [delaiSolde,    setDelaiSolde]   = useState("comptant");
  const [modeReglement, setModeReglement]= useState("virement");
  const [iban,          setIban]         = useState("");
  const [swift,         setSwift]        = useState("");
  const [nomBanque,     setNomBanque]    = useState("");
  const [villeBanque,   setVilleBanque]  = useState("");
  // Signatures terrain
  const [sigProprio,  setSigProprio] = useState(false);
  const [sigExploit,  setSigExploit] = useState(false);
  const [sigDataProprio, setSigDataProprio] = useState<any>(null);
  const [sigDataExploit, setSigDataExploit] = useState<any>(null);
  const [nomSignProprio,_setNomSigPr] = useState(lot.nomSignataire||lot.nom||"");
  const [nomSignExploit,_setNomSigEx] = useState("");
  // Attestation déclaration sur l'honneur (redDocGestion === "aucun")
  const [attestEmail,   setAttestEmail]   = useState<string>(lot.email||"");
  const [attestSigData, setAttestSigData] = useState<any>(null);
  const [attestSigned,  setAttestSigned]  = useState(false);
  const [attestSending, setAttestSending] = useState(false);
  const [attestSentOk,  setAttestSentOk]  = useState(false);
  const [coupeAutorisee,        setCoupeAutorisee]        = useState("");   // "oui"|"non"
  const [dateAutorisationPrevue,setDateAutorisationPrevue] = useState("");
  const [nomGestionnaire,       setNomGestionnaire]        = useState("");
  const [personneEnCharge,      setPersonneEnCharge]        = useState("");
  const [cpGestionnaire,        setCpGestionnaire]          = useState("");
  const [villeGestionnaire,     setVilleGestionnaire]       = useState("");
  const [zoneProtegee,          setZoneProtegee]           = useState("");   // "oui"|"non"
  const [contraintes,setCont]  = useState<Record<string,boolean>>({
    ligneEDF:false, lignesTelecom:false, penteForte:false,
    zoneHumide:false, tourbieres:false, solsVulnerables:false,
    voisinage:false, accesDifficile:false,
    routeLimitee:false, natura2000:false, remanents:false,
    autorisationVoirie:false, prevenir_mairie:false, prevenir_voisinage:false,
  });
  // Détails contraintes avec responsable
  const [detailsContraintes, setDetailsCont] = useState<Record<string,any>>({});
  const [accesCamion,setAcces] = useState("praticable");
  const [largeurAcces,setLarg] = useState(4);
  const [distancePlateforme,setDist] = useState(500);
  const [saving, setSaving]    = useState(false);

  // Essence principale (affichage) + indices pondérés par la composition réelle (%) — source ITEBE 2004
  const essencePrincipale = [...essences].sort((a,b)=>b.pct-a.pct)[0]?.id || "melange";
  const indices = indicesPonderes(essences);

  // Persistance brouillon
  useEffect(()=>{
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY+lot.id)||"null");
      if (draft) {
        if (draft.gps) setGps(draft.gps);
        if (draft.essences) setEssences(draft.essences);
        if (draft.volumeT) setVolumeT(draft.volumeT);
        if (draft.surfaceHa) setSurface(draft.surfaceHa);
        if (draft.dateLimite) setDateL(draft.dateLimite);
        if (draft.observations) setObs(draft.observations);
        if (draft.prixTonne) setPrixTonne(draft.prixTonne);
        if (draft.diametreMoyen) setDiametreMoyen(draft.diametreMoyen);
        if (draft.popParHa) setPopParHa(draft.popParHa);
        if (draft.modeVolume) setModeVolume(draft.modeVolume);
        if (draft.contraintes) setCont(draft.contraintes);
        if (draft.accesCamion) setAcces(draft.accesCamion);
      }
    } catch { /* noop */ }
  },[lot.id]);

  // Pré-remplit le massif depuis les coordonnées GPS (IGN Géoplateforme)
  useEffect(()=>{
    if (!gps || redMassif) return;
    let cancelled = false;
    (apiGet(`/geoplateforme/context?lat=${gps.lat}&lng=${gps.lng}`) as Promise<any>)
      .then((d: any)=>{
        if (cancelled) return;
        const commune = d?.commune || lot?.commune || "";
        const dept    = d?.nomDept || "";
        if (commune) setRedMassif(dept ? `${commune} — ${dept}` : commune);
      })
      .catch(()=>{});
    return ()=>{ cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[gps?.lat, gps?.lng]);

  // Sauvegarde automatique brouillon
  useEffect(()=>{
    try {
      localStorage.setItem(DRAFT_KEY+lot.id, JSON.stringify({
        gps, essences, volumeT, surfaceHa, dateLimite, observations,
        modeleContractuel, prixTonne, diametreMoyen, popParHa, modeVolume, tauxTVA, acompte, delaiSolde, modeReglement,
        iban, swift, nomBanque, villeBanque,
        contraintes, accesCamion, step,
      }));
    } catch { /* noop */ }
  },[lot.id, gps, essences, volumeT, surfaceHa, dateLimite, observations,
     modeleContractuel, prixTonne, diametreMoyen, popParHa, modeVolume, tauxTVA, acompte, delaiSolde, modeReglement,
     iban, swift, nomBanque, villeBanque, contraintes, accesCamion, step]);

  // Recalcul du volume estimé si la surface ou l'essence change en mode "par ha"
  useEffect(()=>{
    if (modeVolume==="parha") {
      setVolumeT(calcVolumeParHa(popParHa, diametreMoyen, surfaceHa, indices));
    }
  },[surfaceHa, modeVolume, essencePrincipale, diametreMoyen, indices, popParHa]);


  // Plateforme
  const [platLargeur,    setPlatLarg]   = useState(10);
  const [platLongueur,   setPlatLong]   = useState(20);
  const [platRevetement, setPlatRev]    = useState("terre");
  const [platBordee,     setPlatBord]   = useState("chemin_public");
  const [platAccesCam,   setPlatAccCam] = useState("direct");
  const [platPosBroyeur, setPlatPosBr]  = useState("devant");
  const [platGps,        setPlatGps]    = useState<any>(null);
  const [platGpsLoading, setPlatGpsL]   = useState(false);
  const [platAutorisation,setPlatAutor] = useState(false);
  const [platQuiAutoris, setPlatQui]    = useState("");
  const [platPhoto,      setPlatPhoto]  = useState(false);

  // Replantation
  const [replantation,    setReplantation]   = useState("non"); // non | oui | a_definir
  const [essenceReplanT,  setEssenceReplant] = useState("");
  const [surfaceReplant,  setSurfaceReplant] = useState(0);
  const [dateReplant,     setDateReplant]    = useState("");
  const [respReplant,     setRespReplant]    = useState("proprietaire");
  const [replantNomEntreprise, setReplantNomEntreprise] = useState("");
  const [replantPersonne,      setReplantPersonne]      = useState("");
  const [replantCp,            setReplantCp]            = useState("");
  const [replantVille,         setReplantVille]         = useState("");
  const [replantTel,           setReplantTel]           = useState("");
  const [replantEmail,         setReplantEmail]         = useState("");

  // Pré-positionne la surface à replanter sur la surface exploitée saisie en étape "Volumes"
  useEffect(()=>{
    if (replantation==="oui" && surfaceReplant===0) setSurfaceReplant(parseFloat(surfaceHa)||0);
  },[replantation, surfaceHa, surfaceReplant]);

  // Scroll en haut à chaque changement d'étape
  const scrollRef = useRef<any>(null);
  useEffect(()=>{
    if(scrollRef.current) scrollRef.current.scrollTop = 0;
  },[step]);

  // Certification
  const [certification,   setCertification]  = useState("aucune");
  const [numeroCertification, setNumeroCert] = useState("");
  const [organismeCertif,  setOrganismeCertif] = useState("");
  const [dateAudit,        setDateAudit]       = useState("");
  const [dateExpiration,   setDateExpiration]  = useState("");
  const [redCategorie,    setRedCategorie]   = useState("bois_forestier");
  const [redDistance,     setRedDistance]    = useState(100);
  const [redPays,         setRedPays]        = useState("France");
  const [redMassif,       setRedMassif]      = useState("");
  const [redPointCollecte,setRedPointCollecte] = useState("");
  const [redSysVolontaire,setRedSysVolontaire] = useState("");
  const [redPerimetreCertif,setRedPerimetreCertif] = useState("");
  const [redVssCertificat,  setRedVssCertificat]  = useState("");
  const [redVssDateValidite,setRedVssDateValidite] = useState("");
  const [redVssOrganisme,   setRedVssOrganisme]   = useState("");
  const [redDestination,  setRedDestination] = useState("");
  const [redForetPrimaire,setRedForetPrimaire] = useState("");  // confirmé|a_verifier|non_concerne
  const [redDocGestion,   setRedDocGestion]   = useState("");  // psg|cbps|amenagement|aucun
  const [redBoisMort,     setRedBoisMort]     = useState<Record<string,boolean>>({souches:false,boisMort:false,coupeRase:false});
  const [statutRed,       setStatutRed]       = useState("");

  // Arbitrage SNBC 3
  const [usagePotentiel,    setUsagePotentiel]    = useState("bois_energie");
  const [usageRetenu,       setUsageRetenu]       = useState("bois_energie");
  const [motifArbitrage,    setMotifArbitrage]    = useState("");
  const [motifArbitrageLib, setMotifArbitrageLib] = useState("");
  const [niveauSecurisation,setNiveauSecurisation]= useState("mobilisable_cond");
  const [preuveDestFin,     setPreuveDestFin]     = useState("");

  // Flux bois — usage et destination par qualité
  const [usagePrevu,      setUsagePrevu]     = useState(""); // bo|bi|be|mixte
  const [volBO,           setVolBO]          = useState("");
  const [volBI,           setVolBI]          = useState("");
  const [volBE,           setVolBE]          = useState("");
  const [destBO,          setDestBO]         = useState("");
  const [destBE,          setDestBE]         = useState("");
  const [preuveDestBO,    setPreuveDestBO]   = useState("");
  const [preuveDestBE,    setPreuveDestBE]   = useState("");
  const [dateControleFlux,setDateControle]   = useState("");

  // Réglementation — snapshot dossier
  const [dispositifAide,  setDispositifAide] = useState("");
  const [dateDepotPrevu,  setDateDepotPrevu] = useState("");
  const [clauseReserveOk, setClauseReserve] = useState(false);
  const [reserveManuelle, setReserveManuelle]= useState("");
  const [decisionAttributive, setDecisionAttr] = useState("");

  const isDemo = !!(user?.id?.startsWith("demo-"));

  // Auto-fill usagePrevu depuis typeBiomasse si non encore renseigné
  useEffect(()=>{
    if (!typeBiomasse || usagePrevu) return;
    const MAP: Record<string,string> = {
      bois_forestier:   "be",
      remanents:        "be",
      connexe_scierie:  "bi",
      dechets_bois:     "be",
      biomasse_agricole:"be",
      csr_biogenique:   "mixte",
    };
    const val = MAP[typeBiomasse];
    if (val) setUsagePrevu(val);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[typeBiomasse]);

  // Auto-fill destBE depuis redDestination (certification RED) + commune du lot
  useEffect(()=>{
    if (!redDestination || destBE) return;
    const LABEL: Record<string,string> = {
      chaufferie:        "Chaufferie",
      reseau_chaleur:    "Réseau de chaleur",
      industrie:         "Site industriel",
      plateforme_transit:"Plateforme de transit",
    };
    const lbl = LABEL[redDestination];
    if (!lbl) return;
    const commune = (lot as any).commune || "";
    setDestBE(commune ? `${lbl} — ${commune}` : `${lbl} — à préciser`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[redDestination]);

  const stepValid: Record<number, boolean> = {
    0:true, 1:isDemo||!!gps, 2:isDemo||photos.length>=2,
    3:!!typeBiomasse&&essences.length>0&&Math.abs(essences.reduce((s,e)=>s+e.pct,0)-100)<=1&&volumeT>0,
    4:true, 5:true, 6:true, 7:true, 8:true, 9:clauseReserveOk||isDemo, 10:parseFloat(prixTonne)>0,
  };
  const allValid = Object.values(stepValid).every(Boolean);

  const genererAttestationPDF = () => {
    const nomP = nomSignProprio||(lot as any).nom||"Le/la propriétaire";
    const dateJour = new Date().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
    const sigImg = attestSigData
      ? `<img src="${attestSigData}" alt="Signature" style="max-width:200px;border:1px solid #ccc;border-radius:4px;">`
      : `<div style="height:70px;border:1px dashed #aaa;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:12px;">Signature manquante</div>`;
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Déclaration — ${lot.lotNumero||lot.numero}</title>
<style>
body{font-family:Georgia,serif;max-width:680px;margin:36px auto;color:#111;line-height:1.7;font-size:13.5px;}
h1{font-size:17px;text-align:center;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:6px;}
.subtitle{text-align:center;font-size:11px;color:#555;margin-bottom:22px;}
table{width:100%;border-collapse:collapse;margin:14px 0;}
td{padding:5px 11px;border:1px solid #ccc;font-size:12.5px;}
td:first-child{font-weight:600;width:36%;background:#f7f7f5;}
.bloc{background:#f7f7f5;border-left:4px solid #2d6a2d;padding:11px 15px;margin:14px 0;font-size:12.5px;}
.bloc li{margin:5px 0;}
.sig{margin-top:30px;display:flex;justify-content:flex-end;}
.sig-box{text-align:center;min-width:210px;}
.sig-line{border-top:1px solid #555;margin-top:10px;padding-top:4px;font-size:11px;color:#555;}
@media print{body{margin:16px;}}
</style></head><body>
<h1>Déclaration sur l'honneur<br>Gestion forestière durable</h1>
<p class="subtitle">Art. 29-1 de la directive RED II — Critères de durabilité biomasse</p>
<p>Je soussigné(e), <strong>${nomP}</strong>, propriétaire de la parcelle forestière désignée ci-après,</p>
<p><strong>CERTIFIE SUR L'HONNEUR :</strong></p>
<div class="bloc"><ul>
<li>Que la forêt concernée est gérée durablement, conformément aux principes de la gestion forestière durable.</li>
<li>Que la récolte de biomasse n'excède pas la capacité de production biologique de la forêt.</li>
<li>Que cette biomasse n'est pas issue d'une forêt primaire ni d'une zone dont le statut en termes de carbone a changé après le 1er janvier 2008.</li>
<li>Que les pratiques d'exploitation respectent la réglementation française en vigueur (Code forestier).</li>
</ul></div>
<table>
<tr><td>Lot / Référence</td><td>${lot.lotNumero||lot.numero||"—"}</td></tr>
<tr><td>Commune</td><td>${lot.commune||"—"}</td></tr>
<tr><td>Surface</td><td>${lot.surfaceHa||"—"} ha</td></tr>
<tr><td>Date</td><td>${dateJour}</td></tr>
</table>
<div class="sig"><div class="sig-box">
<p style="font-size:11px;color:#555;margin-bottom:8px;">Signature du propriétaire</p>
${sigImg}
<div class="sig-line">${nomP}</div>
</div></div>
</body></html>`;
    const win = window.open("","_blank","width=820,height=920");
    if(win){ win.document.write(html); win.document.close(); win.focus(); setTimeout(()=>win.print(),600); }
  };

  const envoyerAttestation = async () => {
    if(!attestEmail.trim()){alert("Veuillez saisir l'adresse email du propriétaire.");return;}
    setAttestSending(true); setAttestSentOk(false);
    try {
      if(IS_DEMO_BUILD){
        await new Promise(r=>setTimeout(r,900));
        setAttestSentOk(true);
      } else {
        await apiPost("/documents/attestation-email",{
          lotId:lot.id, lotNumero:lot.lotNumero||lot.numero,
          commune:lot.commune||"", surfaceHa:lot.surfaceHa,
          nomProprietaire:nomSignProprio||(lot as any).nom||"",
          email:attestEmail, sigData:attestSigData, dateDocument:todayS(),
        });
        setAttestSentOk(true);
      }
    } catch(err:any){
      alert(`Erreur envoi attestation : ${err?.message||"Erreur réseau"}`);
    } finally { setAttestSending(false); }
  };

  const handleSave = async () => {
    if (!allValid) { toast("Compléter toutes les étapes","warn"); return; }
    setSaving(true);
    const visite = {
      lotId: lot.id, lotNumero: lot.lotNumero||lot.numero,
      coupeAutorisee, dateAutorisationPrevue, nomGestionnaire, personneEnCharge,
      cpGestionnaire, villeGestionnaire, zoneProtegee,
      date: todayS(), gps, photos, typeBiomasse, essences,
      volumeEstimeT: volumeT, surfaceHa, dateLimite, observations,
      diametreMoyen, popParHa,
      modeleContractuel, prixTonne, tauxTVA, acompte, delaiSolde, modeReglement,
      iban, swift, nomBanque, villeBanque,
      sigProprio, sigExploit, nomSignProprio, nomSignExploit,
      sigDataProprio, sigDataExploit,
      contraintes, detailsContraintes, accesCamion, largeurAcces, distancePlateforme,
      plateforme:{ largeur:platLargeur, longueur:platLongueur,
        revetement:platRevetement, bordee:platBordee,
        accesCamion:platAccesCam, positionBroyeur:platPosBroyeur,
        gps:platGps, autorisation:platAutorisation,
        quiAutorise:platQuiAutoris, photo:platPhoto },
      replantation, essenceReplanT, surfaceReplant, dateReplant, respReplant,
      certification, organismeCertif, dateAudit, dateExpiration, numeroCertification,
      redCategorie, redDistance, redPays, redMassif, redPointCollecte,
      redSysVolontaire, redVssCertificat, redVssDateValidite, redVssOrganisme, redPerimetreCertif,
      redDestination, redForetPrimaire, redDocGestion, redBoisMort,
      // Flux bois — usage et destination
      usagePrevu, volBO:parseFloat(volBO)||0, volBI:parseFloat(volBI)||0, volBE:parseFloat(volBE)||0,
      destBO, destBE, preuveDestBO, preuveDestBE, dateControleFlux,
      usagePotentiel, usageRetenu, motifArbitrage, motifArbitrageLib, niveauSecurisation, preuveDestFin,
      // Snapshot réglementaire — figé à la date de la visite
      reglementaireSnapshot:{
        dateSnapshot: todayS(),
        auteur: user ? `${user.prenom||""} ${user.nom||""}`.trim() : "Mandataire",
        dispositifAide, dateDepotPrevu, decisionAttributive,
        clauseReserveApposee: clauseReserveOk,
        clauseReserveTexte: CLAUSE_RESERVE,
        reserveManuelle,
        textesEnVigueur: TEXTES_REGL.map(t=>({
          id:t.id, texteRef:t.texteRef, statut:t.statut,
          versionCriteres:t.versionCriteres, dateConsultation:t.dateConsultation,
          alerteActive:t.alerteActive,
        })),
        alertesActives: TEXTES_REGL.filter(t=>t.alerteActive).map(t=>t.texteRef),
      },
      indicesCalcul: indices,
      statut:"validee", entrepriseId,
    };
    try {
      const saved = await apiPost(`/visites`, visite);
      localStorage.removeItem(DRAFT_KEY+lot.id);
      if (coupeAutorisee==="non"&&dateAutorisationPrevue) {
        const dateAlerte = new Date(new Date(dateAutorisationPrevue).getTime()-2*86400000).toISOString().slice(0,10);
        const msgAlerte = {
          type:"alerte_autorisation_coupe",
          lotId: lot.id, lotNumero: lot.lotNumero||lot.numero,
          commune: lot.commune||"",
          missionne: `${user?.prenom||""} ${user?.nom||""}`.trim(),
          dateAutorisationPrevue,
          dateAlerte,
          message:`⚠️ Rappel autorisation coupe — lot ${lot.lotNumero||lot.numero} (${lot.commune||""}) : l'autorisation de coupe est attendue le ${new Date(dateAutorisationPrevue).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}. Vérifiez l'obtention de l'autorisation.`,
        };
        apiPost(`/messages-admin`, msgAlerte).catch(()=>{});
        apiPost(`/notifications`, {...msgAlerte,destinataire:"missionne"}).catch(()=>{});
      }
      toast("Visite validée ✓");
      onSaved(saved);
    } catch {
      localStorage.removeItem(DRAFT_KEY+lot.id);
      toast("Visite enregistrée localement ✓");
      onSaved({...visite, id:uid()});
    }
    setSaving(false);
  };

  const currentStep = STEPS[step];
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:currentStep.color,color:"#fff",padding:"12px 16px 10px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={()=>{
              if(step===0){onBack();return;}
              if(returnStep!==null){setStep(returnStep);setReturnStep(null);}
              else{setStep(s=>s-1);}
            }} style={{background:"rgba(255,255,255,.2)",border:"none",
            color:"#fff",width:36,height:36,borderRadius:9,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center",
            WebkitTapHighlightColor:"transparent"}}>{"<"}</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:600}}>{currentStep.icon} {currentStep.label}</div>
            <div style={{fontSize:11,opacity:.7}}>{lot.lotNumero||lot.numero} · {lot.commune}</div>
          </div>
          <div style={{fontSize:12,opacity:.75}}>{step+1}/{STEPS.length}</div>
        </div>
        <div style={{display:"flex",gap:4,paddingBottom:10}}>
          {STEPS.map((s,i)=>(
            <div key={s.id} onClick={()=>i<step&&setStep(i)}
              style={{flex:1,cursor:i<step?"pointer":"default"}}>
              <div style={{height:4,borderRadius:2,
                background:i<=step?"rgba(255,255,255,.9)":"rgba(255,255,255,.25)"}}/>
              <div style={{height:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {i<step&&!stepValid[i]&&(
                  <span style={{fontSize:11,color:"#ff4444",fontWeight:900,lineHeight:1}}>✱</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRef} data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:90}}>
        {returnStep!==null&&(
          <div style={{background:C.amberL,border:`1px solid ${C.amber}`,borderRadius:10,
            padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>↩️</span>
            <span style={{fontSize:12,color:C.amberD,fontWeight:600}}>
              Mode complément — validez puis revenez au récapitulatif
            </span>
          </div>
        )}
        {step===0&&(
          <div>
            <SectionTitle icon="✅" label="Validation réglementaire"/>
            {[
              {key:"coupeAutorisee", val:coupeAutorisee, set:setCoupeAutorisee,
               label:"Coupe autorisée ?", sub:"Autorisation administrative en cours de validité"},
              {key:"zoneProtegee",   val:zoneProtegee,   set:setZoneProtegee,
               label:"Le chantier est-il dans une zone protégée ?",   sub:"Natura 2000, ZNIEFF, arrêté biotope…"},
            ].map(({key,val,set,label,sub})=>(
              <div key={key} style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:6}}>{label}</div>
                <div style={{fontSize:12,color:C.tx3,marginBottom:8}}>{sub}</div>
                <div style={{display:"flex",gap:8}}>
                  {[["oui","✅ Oui",C.green,C.greenL,C.greenD],["non","❌ Non",C.red,"#fdecea","#b71c1c"]].map(([v,l,border,bg,tc])=>(
                    <button key={v} onClick={()=>set(val===v?"":v)} style={{
                      flex:1,padding:"11px 0",borderRadius:10,fontSize:13,fontWeight:val===v?700:400,
                      border:`2px solid ${val===v?border:C.bd}`,
                      background:val===v?bg:"#fff",color:val===v?tc:C.tx2,
                      cursor:"pointer",fontFamily:"inherit",
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {coupeAutorisee==="non"&&(
              <div style={{background:"#fdecea",border:"2px solid #e53935",borderRadius:12,
                padding:14,marginBottom:14}}>
                <div style={{fontWeight:700,color:"#b71c1c",fontSize:14,marginBottom:4}}>
                  ⛔ Coupe non autorisée
                </div>
                <div style={{fontSize:12,color:"#b71c1c",marginBottom:12,lineHeight:1.5}}>
                  Saisissez la date prévue d'obtention de l'autorisation. Un rappel sera
                  envoyé automatiquement 2 jours avant à la personne missionnée et à l'administrateur.
                </div>
                <div style={{fontSize:13,fontWeight:600,color:"#b71c1c",marginBottom:6}}>
                  Date prévue d'obtention
                </div>
                <input type="date" value={dateAutorisationPrevue}
                  onChange={e=>setDateAutorisationPrevue(e.target.value)}
                  style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                    border:"1.5px solid #e53935",fontFamily:"inherit",
                    background:"#fff",color:"#b71c1c",boxSizing:"border-box"}}/>
                {dateAutorisationPrevue&&(
                  <div style={{fontSize:11,color:"#b71c1c",marginTop:8,opacity:.8}}>
                    🔔 Alerte prévue le {new Date(new Date(dateAutorisationPrevue).getTime()-2*86400000).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
                  </div>
                )}
              </div>
            )}
            <MInput bold label="Nom du gestionnaire forestier ou coopérative" value={nomGestionnaire} onChange={setNomGestionnaire}
              placeholder="Ex : ONF, CRPF, gestionnaire privé…"/>
            <MInput label="Nom du contact" value={personneEnCharge} onChange={setPersonneEnCharge}
              placeholder="Prénom Nom du référent"/>
            <div style={{display:"flex",gap:8}}>
              <div style={{flex:"0 0 110px"}}>
                <MInput label="Code postal" value={cpGestionnaire} onChange={setCpGestionnaire}
                  placeholder="89000" type="number"/>
              </div>
              <div style={{flex:1}}>
                <MInput label="Ville" value={villeGestionnaire} onChange={setVilleGestionnaire}
                  placeholder="Auxerre"/>
              </div>
            </div>
          </div>
        )}
        {step===1&&(
          <div>
            <SectionTitle icon="📍" label="Position GPS de la parcelle"/>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16,lineHeight:1.6}}>
              Capturez la position GPS de la parcelle.
            </div>
            <GpsWidget value={gps} onChange={setGps} required/>
            {gps && <GeoCtxBadge lat={gps.lat} lng={gps.lng}/>}
            <MapZonesProtegees gps={gps}/>
            <div style={{marginTop:16}}>
              <MInput label="Lot" value={lot.lotNumero||lot.numero} onChange={()=>{}} hint="auto"/>
              <MInput label="Date" value={todayS()} onChange={()=>{}} hint="auto"/>
            </div>
          </div>
        )}
        {step===2&&(
          <div>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16}}>2 photos minimum.</div>
            <PhotosWidget photos={photos} onChange={setPhotos} required={2}/>
          </div>
        )}
        {step===3&&(
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:18,fontWeight:700,color:C.tx,marginBottom:4}}>
                🍃 Quel type de biomasse selon RED ?
              </div>
              <div style={{fontSize:13,color:C.tx3,display:"flex",alignItems:"center",gap:4}}>
                Appuyez sur le menu ci-dessous pour sélectionner
                <span style={{fontSize:16}}>👇</span>
              </div>
            </div>
            <select value={typeBiomasse} onChange={e=>setTypeBiomasse(e.target.value)}
              style={{width:"100%",padding:"14px 12px",borderRadius:12,
                border:`2px solid ${typeBiomasse?C.green:C.bd}`,
                background:"#fff",fontFamily:"inherit",fontSize:16,
                color:typeBiomasse?C.tx:C.tx3,cursor:"pointer",outline:"none",
                appearance:"none",WebkitAppearance:"none",
                backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",
                marginBottom:24}}>
              <option value="">— Sélectionner —</option>
              <option value="bois_forestier">Bois forestier</option>
              <option value="remanents">Rémanents</option>
              <option value="connexe_scierie">Connexe de Scierie</option>
              <option value="dechets_bois">Déchets bois</option>
              <option value="biomasse_agricole">Biomasse agricole</option>
              <option value="csr_biogenique">CSR avec fraction biogénique</option>
            </select>
            {typeBiomasse&&(
              <div style={{marginTop:24,marginBottom:24,padding:12,borderRadius:10,
                background:"#E8F5E9",border:"1px solid #A5D6A7",
                fontSize:13,color:"#2E7D32",fontWeight:500}}>
                ✅ {typeBiomasse==="bois_forestier"?"Bois forestier"
                  :typeBiomasse==="remanents"?"Rémanents"
                  :typeBiomasse==="connexe_scierie"?"Connexe de Scierie"
                  :typeBiomasse==="dechets_bois"?"Déchets bois"
                  :typeBiomasse==="biomasse_agricole"?"Biomasse agricole"
                  :"CSR avec fraction biogénique"} sélectionné
              </div>
            )}
            <SectionTitle icon="🌿" label="Essences présentes"/>
            <div style={{fontSize:13,color:C.tx2,marginBottom:12}}>Sélectionnez les essences présentes. Total = 100%.</div>
            <EssenceEditor essences={essences} onChange={setEssences}/>
            <SectionTitle icon="📏" label="Surface & Volume"/>
            <MInput label="Surface (ha)" value={surfaceHa}
              onChange={setSurface}
              type="number" placeholder="ex : 12.5" hint="hectares"/>

            {/* Toggle saisie manuelle vs slider vs population/ha */}
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {[["slider","🎚️ Slider"],["manuel","⌨️ Saisie manuelle"],["parha","📐 Par ha"]].map(([v,l])=>(
                <button key={v} onClick={()=>setModeVolume(v)} style={{
                  flex:1,padding:"9px 0",borderRadius:10,fontSize:12,fontWeight:modeVolume===v?600:400,
                  border:`1.5px solid ${modeVolume===v?C.amber:C.bd}`,
                  background:modeVolume===v?C.amberL:"#fff",
                  cursor:"pointer",fontFamily:"inherit",color:modeVolume===v?C.amberD:C.tx2,
                  WebkitTapHighlightColor:"transparent"}}>
                  {l}
                </button>
              ))}
            </div>

            {modeVolume==="manuel" && (
              <MInput label="Volume estimé (tonnes)" value={volumeT===0?"":String(volumeT)}
                onChange={v=>setVolumeT(parseFloat(v)||0)}
                type="number" placeholder="Saisir le tonnage estimé" hint="saisie directe"
                required/>
            )}
            {modeVolume==="slider" && (
              <MSlider label="Volume estimé" value={volumeT} onChange={setVolumeT}
                min={10} max={2000} step={10} unit=" t" color={C.amber}/>
            )}
            {modeVolume==="parha" && (
              <>
                <MInput label="Population estimée (tiges/ha)" value={popParHa}
                  onChange={v=>{
                    setPopParHa(v);
                    setVolumeT(calcVolumeParHa(v, diametreMoyen, surfaceHa, indices));
                  }}
                  type="number" placeholder="ex: 300"/>
                <MInput label="Diamètre moyen à 1,20 m (cm)" value={diametreMoyen}
                  onChange={v=>{
                    setDiametreMoyen(v);
                    setVolumeT(calcVolumeParHa(popParHa, v, surfaceHa, indices));
                  }}
                  type="number" placeholder="ex: 35" hint="saisie en centimètres"/>
                {diametreMoyen&&parseFloat(diametreMoyen)<5&&(
                  <div style={{fontSize:12,color:C.amber,marginBottom:8,marginTop:-10,
                    display:"flex",alignItems:"center",gap:6}}>
                    ⚠️ Diamètre saisi &lt; 5 cm — vérifier la valeur (ex : 35 pour 35 cm)
                  </div>
                )}
                <div style={{fontSize:12,color:C.tx3,marginBottom:14,marginTop:-6}}>
                  = {volumeT>0?`${fmtNum(volumeT,1)} t`:"—"} volume estimé total
                </div>
              </>
            )}

            {/* Estimation calculée — affichée seulement si volume > 0 */}
            {volumeT>0&&(
              <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
                border:`1px solid ${C.amber}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.amberD,marginBottom:8}}>
                  📊 Estimations — composition pondérée ({essences.map(e=>`${e.label} ${e.pct}%`).join(", ")||essencePrincipale})
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    [fmtNum(volumeT,1)+" t","Tonnage estimé"],
                    [fmtNum(volumeT/indices.foisonnement,1)+" m³","Volume bois"],
                    [fmtNum(volumeT*indices.pci/1000,1)+" MWh","Énergie PCI"],
                  ].map(([v,l],i)=>(
                    <div key={i} style={{textAlign:"center",background:"rgba(186,117,23,.1)",
                      borderRadius:8,padding:8}}>
                      <div style={{fontSize:16,fontWeight:700,color:C.amberD}}>{v}</div>
                      <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:10,color:C.tx3,marginTop:8}}>
                  Densité verte : {Math.round(indices.densite)} kg/m³ · Foisonnement : {indices.foisonnement.toFixed(2)}
                </div>
              </div>
            )}

          </div>
        )}
        {step===10&&(
          <div>
            <SectionTitle icon="📜" label="Modèle contractuel"/>
            {/* Modèle contractuel — détermine la base de rémunération et les obligations de preuve */}
            <div style={{marginBottom:16}}>
              {([
                ["forfaitaire",      "🤝","Vente forfaitaire",       "Montant convenu — pas de pesée obligatoire","L'ETF achète le bois pour un montant fixé. Preuve : contrat + réception chantier."],
                ["poids_bord_route", "🌲","Vente au poids bord route","Pesée commerciale au transfert","Pesée avant chargement, avant mélange de lots. Preuve : ticket bord route."],
                ["poids_livre",      "🔥","Vente au poids livré",     "Prix selon la réception finale","Les tickets de la chaufferie / destination sont obligatoirement transmis au propriétaire."],
                ["prestation",       "🛠️","Prestation de travaux",    "Le propriétaire reste propriétaire","L'ETF réalise les travaux, un mandat de commercialisation définit qui vend et rend compte."],
              ] as [string,string,string,string,string][]).map(([val,ico,titre,soustitre,note])=>{
                const sel = modeleContractuel===val;
                const borderColor = sel ? C.amber : C.bd;
                return (
                  <div key={val} onClick={()=>setModeleContractuel(val)}
                    style={{display:"flex",gap:12,padding:"12px 14px",borderRadius:12,
                      cursor:"pointer",marginBottom:8,WebkitTapHighlightColor:"transparent",
                      border:`2px solid ${borderColor}`,
                      background:sel?"#FFFBEB":"#fff"}}>
                    <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                      background:sel?"#FDE68A":"#F3F4F6",display:"flex",
                      alignItems:"center",justifyContent:"center",fontSize:18}}>{ico}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:sel?C.amber:C.tx}}>{titre}</div>
                      <div style={{fontSize:11,color:sel?"#92400E":C.tx2,fontWeight:sel?600:400,marginTop:2}}>{soustitre}</div>
                      {sel&&<div style={{fontSize:10,color:"#78350F",marginTop:5,lineHeight:1.5,padding:"6px 8px",background:"#FEF3C7",borderRadius:6}}>{note}</div>}
                    </div>
                    <div style={{width:18,height:18,borderRadius:"50%",flexShrink:0,marginTop:10,
                      border:`2px solid ${sel?C.amber:C.bd}`,
                      background:sel?C.amber:"transparent"}}/>
                  </div>
                );
              })}
              {!modeleContractuel&&<div style={{fontSize:11,color:C.tx3,fontStyle:"italic",textAlign:"center",marginTop:4}}>Sélectionnez le modèle applicable — il détermine les obligations de preuve et traçabilité</div>}
            </div>

            {/* Avertissement pesée livré */}
            {modeleContractuel==="poids_livre"&&(
              <div style={{background:"#FFF7ED",border:`1px solid #F59E0B`,borderRadius:10,
                padding:"10px 12px",marginBottom:14,fontSize:11,color:"#92400E",lineHeight:1.6}}>
                ⚠️ <strong>Pesée au poids livré :</strong> l'ETF s'engage contractuellement à transmettre les justificatifs de pesée de la destination finale. À défaut, une pesée indépendante est réalisée avant mélange de lots.
              </div>
            )}

            <SectionTitle icon="💶" label="Prix & Conditions commerciales"/>

            {/* Volume de référence issu de l'estimation (step Biomasse) */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              background:volumeT>0?C.bg2:C.amberL,borderRadius:10,padding:"10px 14px",marginBottom:14,
              border:`1px solid ${volumeT>0?C.bd:C.amber}`}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:volumeT>0?C.tx2:C.amberD}}>
                  📦 Volume estimé lors de la visite
                </div>
                <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                  {volumeT>0
                    ? (modeleContractuel==="poids_bord_route"||modeleContractuel==="poids_livre"
                        ? "Base de calcul provisoire — sera confirmée par la pesée commerciale"
                        : "Issu de l'étape Biomasse — sert de base au calcul de la valeur estimée")
                    : "⚠ À renseigner à l'étape Biomasse (étape 3)"}
                </div>
              </div>
              <div style={{fontSize:20,fontWeight:800,color:volumeT>0?C.greenD:C.amberD,
                fontVariantNumeric:"tabular-nums"}}>
                {volumeT>0?`${fmtNum(volumeT)} t`:"—"}
              </div>
            </div>

            {/* Prix HT + TVA */}
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
              <MInput label="Prix à la tonne (€ HT)" value={prixTonne} onChange={setPrixTonne}
                type="number" placeholder="ex: 42.50" required/>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:5}}>
                  TVA (%)
                </div>
                <select value={tauxTVA||"20"} onChange={e=>setTauxTVA(e.target.value)}
                  style={{width:"100%",height:INPUT_H,padding:"0 10px",borderRadius:12,
                    fontSize:FONT_INPUT,border:`1.5px solid ${C.bd}`,
                    fontFamily:"inherit",background:"#fff",color:C.tx,appearance:"auto"}}>
                  <option value="0">0 %</option>
                  <option value="5.5">5,5 %</option>
                  <option value="10">10 %</option>
                  <option value="20">20 %</option>
                </select>
              </div>
            </div>

            {/* Récap HT / TVA / TTC */}
            {prixTonne&&volumeT>0&&(()=>{
              const ht = volumeT*parseFloat(prixTonne);
              const tva = ht*(parseFloat(tauxTVA||"20")/100);
              const ttc = ht+tva;
              return (
                <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1.5px solid ${C.green}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:8}}>
                    💰 Valeur estimée du lot
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      [fmtNum(ht,2)+" €","Total HT"],
                      [fmtNum(tva,2)+" €",`TVA ${tauxTVA||"20"}%`],
                      [fmtNum(ttc,2)+" €","Total TTC"],
                    ].map(([v,l],i)=>(
                      <div key={i} style={{textAlign:"center",
                        background:"rgba(29,158,117,.1)",borderRadius:8,padding:8}}>
                        <div style={{fontSize:i===2?16:13,fontWeight:i===2?700:500,
                          color:C.greenD}}>{v}</div>
                        <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Conditions de règlement */}
            <SectionTitle icon="📅" label="Conditions de règlement"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <MInput label="Acompte à la commande (€)" value={acompte} onChange={setAcompte}
                type="number" placeholder="ex: 500"/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:5}}>
                  Solde
                </div>
                <select value={delaiSolde} onChange={e=>setDelaiSolde(e.target.value)}
                  style={{width:"100%",height:INPUT_H,padding:"0 10px",borderRadius:12,
                    fontSize:FONT_INPUT,border:`1.5px solid ${C.bd}`,
                    fontFamily:"inherit",background:"#fff",color:C.tx,appearance:"auto"}}>
                  <option value="comptant">Comptant</option>
                  <option value="30j">30 jours</option>
                  <option value="60j">60 jours</option>
                  <option value="90j">90 jours</option>
                </select>
              </div>
            </div>
            {acompte&&prixTonne&&volumeT>0&&(
              <div style={{background:C.blueL,borderRadius:10,padding:12,marginBottom:14,
                border:`1px solid ${C.blue}`,fontSize:12,color:C.blueD}}>
                Acompte : {fmtNum(acompte,2)} € · Solde : {fmtNum(Math.max(0,volumeT*parseFloat(prixTonne)*(1+parseFloat(tauxTVA||"20")/100)-parseFloat(acompte)),2)} € ({delaiSolde})
              </div>
            )}

            {/* Mode de règlement */}
            <SectionTitle icon="💳" label="Mode de règlement"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[["cheque","📝 Chèque"],["virement","🏦 Virement"],
                ["sepa","🔄 Prélèvement SEPA"],["cb","💳 Carte bancaire"]].map(([v,l])=>(
                <div key={v} onClick={()=>setModeReglement(v)} style={{
                  padding:"12px 10px",borderRadius:10,cursor:"pointer",textAlign:"center",
                  border:`2px solid ${modeReglement===v?C.green:C.bd}`,
                  background:modeReglement===v?C.greenL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:13,fontWeight:modeReglement===v?600:400,
                    color:modeReglement===v?C.greenD:C.tx}}>{l}</div>
                </div>
              ))}
            </div>

            {/* Coordonnées bancaires */}
            {(modeReglement==="virement"||modeReglement==="sepa")&&(
              <>
                <SectionTitle icon="🏦" label="Coordonnées bancaires"/>
                <MInput label="IBAN" value={iban} hint="format IBAN"
                  placeholder="Ex : FR76 3000 4028 3798 7654 3210 943"
                  onChange={v=>{
                    const raw = v.replace(/\s/g,"").toUpperCase();
                    if(raw.length===0){setIban("");return;}
                    // 2 lettres pays puis uniquement chiffres, max 34 chars
                    const letters = raw.slice(0,2);
                    const digits  = raw.slice(2).replace(/\D/g,"");
                    const combined = (letters+digits).slice(0,34);
                    if(!/^[A-Z]{0,2}$/.test(letters)) return;
                    const fmt = combined.replace(/(.{4})/g,"$1 ").trim();
                    setIban(fmt);
                  }}/>
                <MInput label="BIC / SWIFT" value={swift} hint="8 ou 11 caractères"
                  placeholder="Ex : BNPAFRPPXXX"
                  onChange={v=>{
                    const raw = v.replace(/\s/g,"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,11);
                    if(raw.length>=2 && !/^[A-Z]{2}/.test(raw)) return;
                    setSwift(raw);
                  }}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <MInput label="Nom de la banque" value={nomBanque} onChange={setNomBanque}
                    placeholder="ex: BNP Paribas"/>
                  <MInput label="Ville de l'agence" value={villeBanque} onChange={setVilleBanque}
                    placeholder="ex: Paris"/>
                </div>
              </>
            )}

            <SectionTitle icon="✍️" label="Signatures terrain"/>
            <div style={{fontSize:12,color:C.tx3,marginBottom:12,lineHeight:1.6}}>
              Signatures recueillies sur le terrain — reportées sur le bon de commande.
            </div>
            <SignatureCanvas
              label="🏠 Propriétaire / Vendeur"
              nomSignataire={nomSignProprio||lot.nom||"Propriétaire"}
              signed={sigProprio}
              onSigned={data=>{ setSigProprio(true); setSigDataProprio(data); }}
              onClear={()=>{ setSigProprio(false); setSigDataProprio(null); }}/>
            <SignatureCanvas
              label="🏢 Exploitant / Acheteur"
              nomSignataire={nomSignExploit||"Donneur d'ordre"}
              signed={sigExploit}
              onSigned={data=>{ setSigExploit(true); setSigDataExploit(data); }}
              onClear={()=>{ setSigExploit(false); setSigDataExploit(null); }}/>

            <MInput label="Date limite exploitation" value={dateLimite} onChange={setDateL}
              type="date" hint="optionnel"/>
            <MInput label="Observations" value={observations} onChange={setObs}
              placeholder="Notes…" big hint="optionnel"/>
          </div>
        )}
        {step===4&&(
          <div>
            <div style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:14,
              padding:"0 14px"}}>
              {[
                {k:"ligneEDF",      l:"Ligne électrique HT/BT", s:"Risque abattage — signaler ERDF"},
                {k:"lignesTelecom", l:"Câbles télécom",          s:"Vérifier avant travaux"},
                {k:"penteForte",    l:"Pente forte >30%",        s:"Débardage difficile"},
                {k:"zoneHumide",      l:"Zone humide",               s:"Passage restreint"},
                {k:"tourbieres",      l:"Tourbières",                s:"Milieu protégé — accès très limité"},
                {k:"solsVulnerables", l:"Sols vulnérables",          s:"Risque de compactage ou d'érosion"},
                {k:"natura2000",    l:"Natura 2000",             s:"Contraintes réglementaires"},
                {k:"routeLimitee",  l:"Route limitée tonnage",   s:"Vérifier gabarit camion"},
                {k:"accesDifficile",l:"Accès difficile",         s:"Chemin dégradé"},
                {k:"remanents",     l:"Rémanents importants",    s:"Broyage nécessaire"},
                {k:"autorisationVoirie",l:"Autorisation de voirie nécessaire",s:"Arrêté ou permission de voirie"},
                {k:"prevenir_mairie",l:"Mairie à prévenir",      s:"Information préalable obligatoire"},
                {k:"prevenir_voisinage",l:"Voisinage à prévenir",s:"Bruit, horaires, poussière"},
                {k:"voisinage",     l:"Voisinage sensible",      s:"Précautions particulières"},
              ].map(({k,l,s})=>(
                <div key={k}>
                  <CheckItem checked={contraintes[k]||false}
                    onChange={v=>setCont({...contraintes,[k]:v})} label={l} sub={s} warn/>
                  {contraintes[k]&&["autorisationVoirie","prevenir_mairie","prevenir_voisinage"].includes(k)&&(
                    <div style={{marginLeft:16,marginBottom:8,padding:"10px 12px",
                      background:C.amberL,borderRadius:10,border:`1px solid ${C.amber}`}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>
                        Qui se charge de la démarche ?
                      </div>
                      <select value={detailsContraintes[k]?.responsable||""}
                        onChange={e=>setDetailsCont(p=>({...p,[k]:{...p[k],responsable:e.target.value}}))}
                        style={{width:"100%",padding:"10px 12px",borderRadius:8,
                          fontSize:14,border:`1.5px solid ${C.amber}`,
                          fontFamily:"inherit",background:"#fff",color:C.tx,
                          marginBottom:8,appearance:"auto"}}>
                        <option value="">— Sélectionner —</option>
                        <option value="proprietaire">🏠 Propriétaire</option>
                        <option value="etf">🪓 ETF / Exploitant</option>
                        <option value="donneurOrdre">🏢 Donneur d'ordre</option>
                        <option value="geometre">📐 Géomètre</option>
                        <option value="commune">🏛️ Commune / Mairie</option>
                        <option value="autre">👤 Autre</option>
                      </select>
                      <MInput label="Coordonnées / qualité" value={detailsContraintes[k]?.contact||""}
                        onChange={v=>setDetailsCont(p=>({...p,[k]:{...p[k],contact:v}}))}
                        placeholder="Téléphone, email…" hint="optionnel"/>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{marginTop:10,padding:"10px 14px",background:C.bg2,
              borderRadius:10,fontSize:12,color:C.tx3}}>
              {Object.values(contraintes).filter(Boolean).length} contrainte(s) identifiée(s)
            </div>
          </div>
        )}
        {step===5&&(
          <div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {[["praticable","✅ Praticable","Accès normal"],
                ["difficile","⚠️ Difficile","Conditions dégradées"],
                ["impossible","🚫 Impossible","Accès interdit"]].map(([v,l,s])=>(
                <div key={v} onClick={()=>setAcces(v)} style={{padding:"14px",
                  borderRadius:12,cursor:"pointer",
                  border:`2px solid ${accesCamion===v?C.green:C.bd}`,
                  background:accesCamion===v?C.greenL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:15,fontWeight:600,
                    color:accesCamion===v?C.greenD:C.tx}}>{l}</div>
                  <div style={{fontSize:12,color:C.tx3}}>{s}</div>
                </div>
              ))}
            </div>
            <MSlider label="Largeur" value={largeurAcces} onChange={setLarg}
              min={2} max={8} step={0.5} unit="m" color={C.brown}/>
            <MSlider label="Distance plateforme" value={distancePlateforme} onChange={setDist}
              min={100} max={5000} step={100} unit="m" color={C.blue}/>
            <div style={{background:allValid?C.greenL:C.amberL,borderRadius:14,
              padding:16,marginTop:8,border:`1.5px solid ${allValid?C.green:C.amber}`}}>
              <div style={{fontSize:13,fontWeight:700,
                color:allValid?C.greenD:C.amberD,marginBottom:10}}>
                {allValid?"✅ Visite complète":"⚠ Étapes incomplètes"}
              </div>
              {STEPS.map((s,i)=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",
                  gap:8,padding:"4px 0",fontSize:12,color:stepValid[i]?C.greenD:C.red}}>
                  <span>{stepValid[i]?"✓":"✗"}</span>
                  <span>{s.icon} {s.label}</span>
                  {!stepValid[i]&&(
                    <button onClick={()=>{ setReturnStep(step); setStep(i); }} style={{marginLeft:"auto",
                      background:"none",border:"none",color:C.red,cursor:"pointer",
                      fontSize:11,textDecoration:"underline",fontFamily:"inherit"}}>
                      Compléter
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step===6&&(
          <div>
            <SectionTitle icon="📐" label="Dimensions approximatives"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
              <MInput label="Largeur (m)" value={platLargeur} onChange={v=>setPlatLarg(parseFloat(v)||0)}
                type="number" placeholder="ex: 10"/>
              <MInput label="Longueur (m)" value={platLongueur} onChange={v=>setPlatLong(parseFloat(v)||0)}
                type="number" placeholder="ex: 20"/>
            </div>
            <div style={{background:C.purpleL,borderRadius:10,padding:10,marginBottom:14,
              textAlign:"center",border:`1px solid ${C.purple}`}}>
              <span style={{fontSize:13,fontWeight:600,color:C.purpleD}}>
                Surface : {fmtNum(platLargeur*platLongueur)} m²
              </span>
            </div>

            <SectionTitle icon="🛣️" label="Revêtement"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {[["terre","🟤 Terre"],["gravier","⬜ Gravier"],["beton","🔲 Béton"],["enrobe","⬛ Enrobé"]].map(([v,l])=>(
                <button key={v} onClick={()=>setPlatRev(v)} style={{
                  padding:"10px 8px",borderRadius:10,fontSize:12,cursor:"pointer",
                  border:`1.5px solid ${platRevetement===v?C.purple:C.bd}`,
                  background:platRevetement===v?C.purpleL:"#fff",
                  color:platRevetement===v?C.purpleD:C.tx2,
                  fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
                  {l}
                </button>
              ))}
            </div>

            <SectionTitle icon="🛤️" label="Bordée par"/>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
              {["route_departementale","route_communale","chemin_public","chemin_prive"].map(v=>{
              const labels = {
                route_departementale:"🛣️ Route départementale",
                route_communale:"🏘️ Route communale",
                chemin_public:"🌿 Chemin public",
                chemin_prive:"🔒 Chemin privé",
              };
              return (
                <div key={v} onClick={()=>setPlatBord(v)} style={{
                  padding:"12px 14px",borderRadius:10,cursor:"pointer",
                  border:`2px solid ${platBordee===v?C.purple:C.bd}`,
                  background:platBordee===v?C.purpleL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:14,fontWeight:platBordee===v?600:400,
                    color:platBordee===v?C.purpleD:C.tx}}>{(labels as Record<string,string>)[v]}</div>
                </div>
              );
            })}
            </div>

            <SectionTitle icon="🚛" label="Accès camion sur plateforme"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["direct","➡️","Direct"],["marche_arriere","↩️","Marche AR"],["retournement","🔄","Retournement"]].map(([v,e,l])=>(
                <button key={v} onClick={()=>setPlatAccCam(v)} style={{
                  padding:"10px 4px",borderRadius:10,fontSize:11,cursor:"pointer",
                  border:`1.5px solid ${platAccesCam===v?C.purple:C.bd}`,
                  background:platAccesCam===v?C.purpleL:"#fff",
                  color:platAccesCam===v?C.purpleD:C.tx2,
                  fontFamily:"inherit",WebkitTapHighlightColor:"transparent",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontSize:18}}>{e}</span>{l}
                </button>
              ))}
            </div>

            <SectionTitle icon="⚙️" label="Position du broyeur"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["devant","⬆️","Devant"],["derriere","⬇️","Derrière"],["cote","➡️","À côté"]].map(([v,e,l])=>(
                <button key={v} onClick={()=>setPlatPosBr(v)} style={{
                  padding:"10px 4px",borderRadius:10,fontSize:11,cursor:"pointer",
                  border:`1.5px solid ${platPosBroyeur===v?C.purple:C.bd}`,
                  background:platPosBroyeur===v?C.purpleL:"#fff",
                  color:platPosBroyeur===v?C.purpleD:C.tx2,
                  fontFamily:"inherit",WebkitTapHighlightColor:"transparent",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontSize:18}}>{e}</span>{l}
                </button>
              ))}
            </div>

            <SectionTitle icon="📍" label="GPS emplacement"/>
            {!platGps?(
              <button onClick={()=>{
                setPlatGpsL(true);
                navigator.geolocation?.getCurrentPosition(
                  p=>{setPlatGps({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy});setPlatGpsL(false);},
                  ()=>{setPlatGps({lat:47.98,lng:3.09,source:"sim"});setPlatGpsL(false);},
                  {enableHighAccuracy:true,timeout:8000}
                )??setPlatGpsL(false);
              }} style={{width:"100%",padding:"14px",borderRadius:12,marginBottom:14,
                background:platGpsLoading?C.bg2:C.purpleL,
                border:`1.5px solid ${C.purple}`,color:C.purpleD,
                fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
                {platGpsLoading?"📡 Localisation…":"📍 Capturer GPS plateforme"}
              </button>
            ):(
              <div style={{background:C.purpleL,borderRadius:10,padding:12,marginBottom:14,
                border:`1px solid ${C.purple}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.purpleD}}>📍 Position capturée</div>
                  <div style={{fontFamily:"monospace",fontSize:11,color:C.purpleD,marginTop:2}}>
                    {platGps.lat.toFixed(5)}°N · {platGps.lng.toFixed(5)}°E
                  </div>
                </div>
                <button onClick={()=>setPlatGps(null)} style={{background:"none",border:"none",
                  color:C.tx3,cursor:"pointer",fontSize:18}}>✕</button>
              </div>
            )}

            <SectionTitle icon="🔑" label="Autorisation nécessaire"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[[false,"✅ Non","Aucune autorisation"],[true,"⚠️ Oui","Démarche requise"]].map(([v,l,s])=>(
                <div key={String(v)} onClick={()=>setPlatAutor(v as any)} style={{
                  padding:"12px",borderRadius:10,cursor:"pointer",textAlign:"center",
                  border:`2px solid ${platAutorisation===v?(v?C.amber:C.green):C.bd}`,
                  background:platAutorisation===v?(v?C.amberL:C.greenL):"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:15,fontWeight:600,
                    color:platAutorisation===v?(v?C.amberD:C.greenD):C.tx}}>{l}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{s}</div>
                </div>
              ))}
            </div>
            {platAutorisation&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                  Qui se charge de la démarche ?
                </div>
                <select value={platQuiAutoris} onChange={e=>setPlatQui(e.target.value)}
                  style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                    border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                    background:"#fff",color:C.tx,outline:"none"}}>
                  <option value="">— Sélectionner —</option>
                  <option value="proprietaire">Propriétaire</option>
                  <option value="etf">ETF</option>
                  <option value="exploitant">Exploitant</option>
                  <option value="applitag">APPLITAG</option>
                  <option value="mairie">Mairie</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            )}

            <div onClick={()=>setPlatPhoto(!platPhoto)} style={{
              display:"flex",alignItems:"center",gap:14,padding:14,borderRadius:12,
              cursor:"pointer",marginBottom:14,
              background:platPhoto?C.purpleL:"#fff",
              border:`2px solid ${platPhoto?C.purple:C.bd}`,
              WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:28}}>{platPhoto?"✅":"📷"}</span>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:platPhoto?C.purpleD:C.tx}}>
                  Photo emplacement
                </div>
                <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                  {platPhoto?"✓ Photo confirmée":"Photographier la plateforme"}
                </div>
              </div>
            </div>
          </div>
        )}

        {step===7&&(
          <div>
            <SectionTitle icon="🌱" label="Replantation prévue ?"/>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {[["non","❌","Non","Pas de replantation prévue"],
                ["oui","✅","Oui","Replantation planifiée"],
                ["a_definir","❓","À définir","Décision ultérieure"]].map(([v,e,l,s])=>(
                <div key={v} onClick={()=>setReplantation(v)} style={{
                  padding:14,borderRadius:12,cursor:"pointer",
                  border:`2px solid ${replantation===v?C.green:C.bd}`,
                  background:replantation===v?C.greenL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:15,fontWeight:600,
                    color:replantation===v?C.greenD:C.tx}}>{e} {l}</div>
                  <div style={{fontSize:12,color:C.tx3}}>{s}</div>
                </div>
              ))}
            </div>
            {replantation==="oui"&&(
              <div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Essence(s) à replanter
                  </div>
                  <select value={essenceReplanT} onChange={e=>setEssenceReplant(e.target.value)}
                    style={{width:"100%",padding:"12px 14px",borderRadius:12,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",
                      background:"#fff",color:C.tx,appearance:"auto"}}>
                    <option value="">— Sélectionner une essence —</option>
                    <optgroup label="Feuillus">
                      <option value="chene">🌳 Chêne</option>
                      <option value="charme">🌿 Charme</option>
                      <option value="hetre">🌲 Hêtre</option>
                      <option value="frene">🌿 Frêne</option>
                      <option value="orme">🌿 Orme</option>
                      <option value="acacia">🌿 Acacia</option>
                      <option value="bouleau">🌿 Bouleau</option>
                      <option value="chataignier">🌰 Châtaignier</option>
                      <option value="fruitiers">🍒 Fruitiers</option>
                      <option value="erables">🍁 Érables</option>
                      <option value="tilleul">🌿 Tilleul</option>
                      <option value="aulne">🌿 Aulne</option>
                      <option value="peupliers">🌾 Peupliers</option>
                      <option value="saule">🌿 Saule</option>
                    </optgroup>
                    <optgroup label="Résineux">
                      <option value="pin_sylvestre">🌲 Pin sylvestre</option>
                      <option value="pin_maritime">🌲 Pin maritime</option>
                      <option value="sapin">🌲 Sapin</option>
                      <option value="epicea">🌲 Épicéa</option>
                      <option value="meleze">🌲 Mélèze</option>
                      <option value="douglas">🌲 Douglas</option>
                    </optgroup>
                    <optgroup label="Autres">
                      <option value="rdv_proprietaire">📋 À définir avec le propriétaire</option>
                    </optgroup>
                  </select>
                </div>
                <MSlider label="Surface à replanter" value={surfaceReplant}
                  onChange={setSurfaceReplant} min={0.1} max={50} step={0.1}
                  unit=" ha" color={C.green}/>
                <MInput label="Période prévue" value={dateReplant}
                  onChange={setDateReplant} type="month"/>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Chargé de cette mission
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {[["proprietaire","🏠 Propriétaire"],["etf","🪓 ETF"],["autre","👤 Autre"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setRespReplant(v)} style={{
                        flex:1,padding:"10px 4px",borderRadius:10,fontSize:12,
                        border:`1.5px solid ${respReplant===v?C.green:C.bd}`,
                        background:respReplant===v?C.greenL:"#fff",cursor:"pointer",
                        fontFamily:"inherit",color:respReplant===v?C.greenD:C.tx2,
                        WebkitTapHighlightColor:"transparent"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {(respReplant==="etf"||respReplant==="autre")&&(
                  <div style={{background:C.greenL,borderRadius:12,padding:14,marginTop:4,
                    border:`1px solid ${C.green}`}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.greenD,marginBottom:12}}>
                      {respReplant==="etf"?"🪓 Coordonnées ETF":"👤 Coordonnées du responsable"}
                    </div>
                    <MInput label="Nom de l'entreprise" value={replantNomEntreprise}
                      onChange={setReplantNomEntreprise} placeholder="Raison sociale"/>
                    <MInput label="Personne en charge" value={replantPersonne}
                      onChange={setReplantPersonne} placeholder="Prénom Nom du référent"/>
                    <div style={{display:"flex",gap:8}}>
                      <div style={{flex:"0 0 110px"}}>
                        <MInput label="Code postal" value={replantCp}
                          onChange={setReplantCp} placeholder="89000" type="number"/>
                      </div>
                      <div style={{flex:1}}>
                        <MInput label="Ville" value={replantVille}
                          onChange={setReplantVille} placeholder="Auxerre"/>
                      </div>
                    </div>
                    <MInput label="Téléphone" value={replantTel}
                      onChange={setReplantTel} placeholder="06 00 00 00 00" type="tel"/>
                    <MInput label="Email" value={replantEmail}
                      onChange={setReplantEmail} placeholder="contact@entreprise.fr" type="email"/>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step===8&&(
          <div>
            <SectionTitle icon="🏅" label="Certification"/>
            <div style={{fontSize:12,color:C.tx3,marginBottom:14,lineHeight:1.6}}>
              Optionnel — sélectionnez si ce lot est soumis à une certification forestière ou énergétique.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {[["aucune","⬜","Aucune","Pas de certification requise"],
                ["pefc","🌿","PEFC","Programme de reconnaissance des certifications forestières"],
                ["fsc","🌳","FSC","Forest Stewardship Council"],
                ["red","⚡","RED","Renewable Energy Directive (directive européenne)"]].map(([v,e,l,s])=>(
                <div key={v} onClick={()=>setCertification(v)} style={{
                  padding:14,borderRadius:12,cursor:"pointer",
                  border:`2px solid ${certification===v?C.blue:C.bd}`,
                  background:certification===v?C.blueL:"#fff",
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{fontSize:15,fontWeight:600,
                    color:certification===v?C.blueD:C.tx}}>{e} {l}</div>
                  <div style={{fontSize:12,color:C.tx3}}>{s}</div>
                </div>
              ))}
            </div>
            {certification!=="aucune"&&(
              <>
                <MInput label="Organisme certificateur"
                  value={organismeCertif} onChange={setOrganismeCertif}
                  placeholder="Ex : Bureau Veritas, SGS, ECOCERT…"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Date de l'audit</div>
                    <input type="date" value={dateAudit} onChange={e=>setDateAudit(e.target.value)}
                      style={{width:"100%",height:46,padding:"0 12px",borderRadius:10,
                        border:`1.5px solid ${C.bd}`,background:"#fff",
                        color:C.tx,fontFamily:"inherit",fontSize:14,outline:"none"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Date d'expiration</div>
                    <input type="date" value={dateExpiration} onChange={e=>setDateExpiration(e.target.value)}
                      style={{width:"100%",height:46,padding:"0 12px",borderRadius:10,
                        border:`1.5px solid ${C.bd}`,background:"#fff",
                        color:C.tx,fontFamily:"inherit",fontSize:14,outline:"none"}}/>
                  </div>
                </div>
                <MInput label={`N° de certification ${certification.toUpperCase()}`}
                  value={numeroCertification} onChange={setNumeroCert}
                  placeholder="Ex: PEFC/10-31-1234 ou FSC-C012345"
                  hint="Obligatoire si certification validée"/>
                {certification==="red"&&(
                  <>
                    {/* ── Sélecteur VSS enrichi ── */}
                    <div style={{marginBottom:6,marginTop:4}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:4}}>
                        Système volontaire de certification (VSS)
                      </div>
                      <div style={{fontSize:11,color:C.tx3,marginBottom:10,lineHeight:1.5}}>
                        Systèmes reconnus par la Commission européenne pour RED II.
                        Sélectionnez le système utilisé pour ce lot.
                      </div>
                      {VSS_RECONNUS.map(vss=>{
                        const sel = redSysVolontaire===vss.id;
                        return (
                          <div key={vss.id} onClick={()=>setRedSysVolontaire(vss.id)}
                            style={{marginBottom:8,borderRadius:12,cursor:"pointer",
                              border:`2px solid ${sel?vss.couleur:C.bd}`,
                              background:sel?vss.bg:"#fff",
                              padding:"10px 14px",
                              WebkitTapHighlightColor:"transparent"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div>
                                <span style={{fontSize:14,fontWeight:700,
                                  color:sel?vss.couleur:C.tx}}>{vss.label}</span>
                                {vss.vigilance&&(
                                  <span style={{marginLeft:8,fontSize:10,fontWeight:700,
                                    color:"#E65100",background:"#FFF3E0",
                                    padding:"2px 6px",borderRadius:4}}>⚠️ Vigilance</span>
                                )}
                                {vss.reconnu==="UE"&&!vss.vigilance&&(
                                  <span style={{marginLeft:8,fontSize:10,fontWeight:600,
                                    color:"#1565C0",background:"#E3F2FD",
                                    padding:"2px 6px",borderRadius:4}}>✅ Reconnu UE</span>
                                )}
                              </div>
                              {sel&&<span style={{color:vss.couleur,fontSize:16}}>●</span>}
                            </div>
                            <div style={{fontSize:11,color:C.tx3,marginTop:3}}>{vss.org}</div>
                            {sel&&(
                              <div style={{fontSize:11,color:C.tx2,marginTop:6,
                                lineHeight:1.5,padding:"8px 10px",
                                background:"rgba(255,255,255,.7)",borderRadius:8}}>
                                <div style={{marginBottom:3}}>
                                  <strong>Périmètre :</strong> {vss.perimetre}
                                </div>
                                <div style={{color:C.tx3}}>{vss.note}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Fiche certificat complète */}
                    {redSysVolontaire&&(
                      <div style={{background:"rgba(255,255,255,.8)",borderRadius:12,
                        padding:"12px 14px",marginBottom:8,
                        border:`1px solid ${C.bd}`}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
                          📄 Détails du certificat VSS
                        </div>
                        <MInput label="N° de certificat VSS"
                          value={redVssCertificat} onChange={setRedVssCertificat}
                          placeholder="Ex : SBP-COC-FR-123456 / SURE-FR-2026-…"
                          hint="Numéro attribué par l'organisme certificateur"/>
                        <MInput label="Organisme certificateur"
                          value={redVssOrganisme} onChange={setRedVssOrganisme}
                          placeholder="Ex : Bureau Veritas, SGS, DNV, ECOCERT…"
                          hint="Organisme ayant réalisé l'audit de certification"/>
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>
                            Date de validité du certificat
                          </div>
                          <input type="date" value={redVssDateValidite}
                            onChange={e=>setRedVssDateValidite(e.target.value)}
                            style={{width:"100%",padding:"10px 12px",borderRadius:10,
                              fontSize:14,border:`1.5px solid ${C.bd}`,
                              fontFamily:"inherit",outline:"none",boxSizing:"border-box",
                              background:"#fff",color:C.tx}}/>
                          {redVssDateValidite&&new Date(redVssDateValidite)<new Date()&&(
                            <div style={{fontSize:11,color:"#B91C1C",marginTop:4,fontWeight:600}}>
                              ⚠️ Ce certificat est expiré — mettre à jour avant déclaration RED
                            </div>
                          )}
                          {redVssDateValidite&&new Date(redVssDateValidite)>=new Date()&&
                           new Date(redVssDateValidite)<new Date(Date.now()+60*86400000)&&(
                            <div style={{fontSize:11,color:"#E65100",marginTop:4,fontWeight:600}}>
                              🔔 Certificat expirant dans moins de 60 jours
                            </div>
                          )}
                        </div>
                        <MInput label="Périmètre certifié"
                          value={redPerimetreCertif} onChange={setRedPerimetreCertif}
                          placeholder="Ex : région, massif, entité certifiée, rayon géographique…"
                          hint="Zone ou entité couverte par le certificat VSS"/>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {certification==="red"&&(
              <div style={{background:C.blueL,borderRadius:12,padding:14,
                border:`1px solid ${C.blue}`}}>
                <div style={{fontSize:13,fontWeight:700,color:C.blueD,marginBottom:12}}>
                  ⚡ Informations RED obligatoires
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Catégorie biomasse
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[["bois_forestier","🌲 Bois forestier"],
                      ["residus","♻️ Résidus forestiers"],
                      ["dechets_bois","🗑️ Déchets bois"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setRedCategorie(v)} style={{
                        padding:"10px 14px",borderRadius:10,textAlign:"left",
                        border:`1.5px solid ${redCategorie===v?C.blue:C.bd}`,
                        background:redCategorie===v?"#fff":C.bg,
                        cursor:"pointer",fontFamily:"inherit",fontSize:13,
                        color:redCategorie===v?C.blueD:C.tx2,
                        WebkitTapHighlightColor:"transparent"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <MSlider label="Distance chaufferie estimée" value={redDistance}
                  onChange={setRedDistance} min={10} max={500} step={10}
                  unit=" km" color={C.blue}/>
                <MInput label="Pays d&apos;origine" value={redPays}
                  onChange={setRedPays} placeholder="France"/>
                <MInput label="Massif / zone d&apos;approvisionnement"
                  value={redMassif} onChange={setRedMassif}
                  placeholder="Ex : Forêt de Tronçais, massif des Vosges…"
                  hint={gps ? "Pré-rempli depuis la position GPS — à compléter si nécessaire" : "Nom du massif forestier ou zone d'approvisionnement identifiée"}/>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Premier point de collecte
                  </div>
                  {[["foret","🌲 Bord de route forêt"],["plateforme","🏗️ Plateforme de stockage"],["depot","📦 Dépôt intermédiaire"],["broyage","🌀 Site de broyage/déchiquetage"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setRedPointCollecte(v)} style={{
                      display:"block",width:"100%",padding:"9px 14px",borderRadius:10,
                      textAlign:"left",marginBottom:5,
                      border:`1.5px solid ${redPointCollecte===v?C.blue:C.bd}`,
                      background:redPointCollecte===v?C.blueL:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontSize:13,
                      color:redPointCollecte===v?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Destination finale
                  </div>
                  {[["chaufferie","🔥 Chaufferie / installation de combustion"],["reseau_chaleur","♨️ Réseau de chaleur"],["industrie","🏭 Usage industriel"],["plateforme_transit","🏗️ Plateforme de transit"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setRedDestination(v)} style={{
                      display:"block",width:"100%",padding:"9px 14px",borderRadius:10,
                      textAlign:"left",marginBottom:5,
                      border:`1.5px solid ${redDestination===v?C.blue:C.bd}`,
                      background:redDestination===v?C.blueL:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontSize:13,
                      color:redDestination===v?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:11,color:C.blueD,marginTop:8,padding:8,
                  background:"rgba(255,255,255,.6)",borderRadius:8}}>
                  ℹ️ Le GPS de la parcelle et les tonnages serviront à générer l&apos;auto-déclaration RED lors de la livraison.
                </div>
                {/* ── Critère RED : forêts primaires / anciennes ── */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:4}}>
                    Forêts primaires / anciennes
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginBottom:8,lineHeight:1.5}}>
                    La biomasse ne provient pas d'une forêt primaire ni d'une zone dont le statut a changé après janvier 2008 (art. 29 RED II).
                  </div>
                  {[["confirme","✅ Confirmé — aucune forêt primaire ou ancienne concernée"],
                    ["a_verifier","🔍 À vérifier — origine à documenter"],
                    ["non_concerne","➖ Non applicable à ce lot"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setRedForetPrimaire(v)} style={{
                      display:"block",width:"100%",padding:"9px 14px",borderRadius:10,
                      textAlign:"left",marginBottom:5,
                      border:`1.5px solid ${redForetPrimaire===v?C.blue:C.bd}`,
                      background:redForetPrimaire===v?C.blueL:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontSize:12,
                      color:redForetPrimaire===v?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* ── Critère RED : maintien capacité productive ── */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:4}}>
                    Document de gestion forestière
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginBottom:8,lineHeight:1.5}}>
                    Preuve du maintien de la capacité productive de la forêt (art. 29 RED II).
                  </div>
                  {[["psg","📄 PSG — Plan Simple de Gestion (validé ONF/CRPF)"],
                    ["cbps","📋 CBPS — Code de Bonnes Pratiques Sylvicoles"],
                    ["amenagement","🗂️ Aménagement forestier (forêt publique)"],
                    ["aucun","⬜ Aucun document — déclaration sur l'honneur"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setRedDocGestion(v)} style={{
                      display:"block",width:"100%",padding:"9px 14px",borderRadius:10,
                      textAlign:"left",marginBottom:5,
                      border:`1.5px solid ${redDocGestion===v?C.blue:C.bd}`,
                      background:redDocGestion===v?C.blueL:"#fff",
                      cursor:"pointer",fontFamily:"inherit",fontSize:12,
                      color:redDocGestion===v?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* ── Attestation déclaration sur l'honneur ── */}
                {redDocGestion==="aucun"&&(
                  <div style={{background:"#FFFBEB",border:`1.5px solid ${C.amber}`,borderRadius:12,padding:14,marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#92400E",marginBottom:4}}>
                      📝 Déclaration sur l'honneur
                    </div>
                    <div style={{fontSize:11,color:"#92400E",marginBottom:12,lineHeight:1.5}}>
                      Aucun document de gestion fourni — une déclaration sur l'honneur est requise (art. 29 RED II).
                      Le document sera pré-rempli au nom du propriétaire, signé sur l'écran et envoyé par email.
                    </div>
                    <div style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:8,padding:12,marginBottom:12,fontSize:12,lineHeight:1.7,color:C.tx}}>
                      <div style={{fontWeight:700,textAlign:"center",marginBottom:6,fontSize:13}}>DÉCLARATION SUR L'HONNEUR</div>
                      <div style={{fontSize:11,textAlign:"center",color:C.tx3,marginBottom:10}}>Art. 29-1 directive RED II — Gestion forestière durable</div>
                      Je soussigné(e), <strong>{nomSignProprio||(lot as any).nom||"___________________"}</strong>, propriétaire de la parcelle forestière<br/>
                      Lot : <strong>{lot.lotNumero||lot.numero}</strong> · Commune : <strong>{lot.commune}</strong> · Surface : <strong>{lot.surfaceHa} ha</strong><br/>
                      certifie sur l'honneur que la forêt est gérée durablement, que la récolte n'excède pas la capacité de production biologique, et que la biomasse n'est pas issue d'une forêt primaire (critères art. 29 RED II).
                    </div>
                    <SignatureCanvas
                      label="Signature du propriétaire"
                      nomSignataire={nomSignProprio||(lot as any).nom||"Propriétaire"}
                      signed={attestSigned}
                      onSigned={d=>{setAttestSigned(true);setAttestSigData(d);}}
                      onClear={()=>{setAttestSigned(false);setAttestSigData(null);}}/>
                    <MInput label="Email du propriétaire" value={attestEmail} onChange={setAttestEmail}
                      type="email" placeholder="prenom.nom@exemple.fr"
                      hint="Pour envoi de l'attestation signée en pièce jointe"/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                      <button onClick={genererAttestationPDF}
                        style={{padding:"12px 0",borderRadius:10,background:C.bg2,border:`1px solid ${C.bd}`,
                          color:C.tx,fontFamily:"inherit",fontSize:13,fontWeight:500,cursor:"pointer",
                          WebkitTapHighlightColor:"transparent"}}>
                        📄 Aperçu / PDF
                      </button>
                      <button onClick={envoyerAttestation}
                        disabled={attestSending||!attestEmail||!attestSigned}
                        style={{padding:"12px 0",borderRadius:10,
                          background:attestSentOk?C.green:attestSending?"#aaa":(!attestEmail||!attestSigned?C.bg2:C.amber),
                          border:"none",color:attestSentOk||attestSending||(!attestEmail||!attestSigned)?"#fff":"#92400E",
                          fontFamily:"inherit",fontSize:13,fontWeight:600,
                          cursor:attestSending||!attestEmail||!attestSigned?"not-allowed":"pointer",
                          WebkitTapHighlightColor:"transparent"}}>
                        {attestSentOk?"✅ Envoyé":attestSending?"Envoi…":"📧 Envoyer"}
                      </button>
                    </div>
                    {!attestSigned&&<div style={{fontSize:11,color:C.amber,marginTop:6,textAlign:"center"}}>⚠️ Signature requise avant envoi</div>}
                  </div>
                )}

                {/* ── Critère RED : limitation souches / bois mort ── */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:4}}>
                    Pratiques d'exploitation durables
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginBottom:8,lineHeight:1.5}}>
                    Cochez les engagements respectés sur ce chantier (art. 29 RED II).
                  </div>
                  {[["souches","Récolte de souches et racines limitée ou absente"],
                    ["boisMort","Rétention de bois mort respectée (arbres sénescents maintenus)"],
                    ["coupeRase","Coupe rase dans les limites réglementaires (seuil surface)"]].map(([k,l])=>(
                    <div key={k} onClick={()=>setRedBoisMort(p=>({...p,[k]:!p[k]}))}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                        borderRadius:10,marginBottom:5,cursor:"pointer",
                        border:`1.5px solid ${redBoisMort[k]?C.green:C.bd}`,
                        background:redBoisMort[k]?C.greenL:"#fff",
                        WebkitTapHighlightColor:"transparent"}}>
                      <div style={{width:20,height:20,borderRadius:5,flexShrink:0,
                        border:`2px solid ${redBoisMort[k]?C.green:C.bd}`,
                        background:redBoisMort[k]?C.green:"#fff",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        color:"#fff",fontSize:12,fontWeight:800}}>
                        {redBoisMort[k]?"✓":""}
                      </div>
                      <span style={{fontSize:12,color:redBoisMort[k]?C.greenD:C.tx2,lineHeight:1.4}}>{l}</span>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:16}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Statut conformité RED
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[
                      ["conforme",    "✅","Conforme",    C.green,  C.greenL,  C.greenD],
                      ["a_verifier",  "🔍","À vérifier",  C.amber,  C.amberL,  C.amber],
                      ["incomplet",   "⚠️","Incomplet",   (C as any).orange||"#E65100", "#FFF3E0","#E65100"],
                      ["non_conforme","❌","Non conforme", C.red,    "#FFEBEE",  "#B71C1C"],
                    ].map(([v,e,l,border,bg,col])=>(
                      <button key={v} onClick={()=>setStatutRed(v)} style={{
                        padding:"10px 14px",borderRadius:10,textAlign:"left",
                        border:`2px solid ${statutRed===v?border:C.bd}`,
                        background:statutRed===v?bg:"#fff",
                        cursor:"pointer",fontFamily:"inherit",fontSize:13,
                        color:statutRed===v?col:C.tx2,fontWeight:statutRed===v?700:400,
                        WebkitTapHighlightColor:"transparent"}}>
                        {e} {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {step===9&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Alerte si textes annulés */}
            {TEXTES_REGL.some(t=>t.alerteActive)&&(
              <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,
                padding:"12px 14px"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#991B1B",marginBottom:6}}>
                  🚨 Alerte réglementaire — textes impactant ce dossier
                </div>
                {TEXTES_REGL.filter(t=>t.alerteActive).map(t=>(
                  <div key={t.id} style={{marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#7F1D1D"}}>{t.texteRef}</div>
                    <div style={{fontSize:10,color:"#991B1B",marginTop:2}}>{t.motifStatut}</div>
                    {t.reservesJuridiques.slice(0,2).map((r,i)=>(
                      <div key={i} style={{fontSize:10,color:"#7F1D1D",marginTop:3,
                        padding:"4px 8px",background:"#FFF1F2",borderRadius:5}}>• {r}</div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Clause de réserve — obligatoire */}
            <div style={{background:"#F5F3FF",border:`2px solid ${clauseReserveOk?"#7C3AED":"#C4B5FD"}`,
              borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6D28D9",marginBottom:8,
                textTransform:"uppercase",letterSpacing:".5px"}}>Clause de réserve obligatoire</div>
              <div style={{fontSize:12,color:"#4C1D95",fontStyle:"italic",
                lineHeight:1.6,marginBottom:12,padding:"8px 10px",
                background:"rgba(124,58,237,.08)",borderRadius:8}}>
                « {CLAUSE_RESERVE} »
              </div>
              <div onClick={()=>setClauseReserve(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                <div style={{width:22,height:22,borderRadius:6,flexShrink:0,
                  border:`2px solid ${clauseReserveOk?"#7C3AED":"#9CA3AF"}`,
                  background:clauseReserveOk?"#7C3AED":"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {clauseReserveOk&&<span style={{color:"#fff",fontWeight:900,fontSize:13}}>✓</span>}
                </div>
                <span style={{fontSize:13,fontWeight:600,color:clauseReserveOk?"#6D28D9":"#374151"}}>
                  Je confirme que cette clause est apposée sur tous les documents préparatoires *
                </span>
              </div>
            </div>

            {/* Dispositif d'aide visé */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                Dispositif d'aide visé (si applicable)
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[
                  ["","Aucune aide publique visée"],
                  ...TEXTES_REGL.filter(t=>t.statut==="applicable").map(t=>[t.id,t.dispositif]),
                ].map(([val,lbl])=>(
                  <div key={val} onClick={()=>setDispositifAide(val)}
                    style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",
                      borderRadius:10,cursor:"pointer",WebkitTapHighlightColor:"transparent",
                      border:`1px solid ${dispositifAide===val?"#7C3AED":C.bd}`,
                      background:dispositifAide===val?"#F5F3FF":"#fff"}}>
                    <div style={{width:16,height:16,borderRadius:"50%",flexShrink:0,marginTop:2,
                      border:`2px solid ${dispositifAide===val?"#7C3AED":"#D1D5DB"}`,
                      background:dispositifAide===val?"#7C3AED":"transparent"}}/>
                    <span style={{fontSize:12,color:dispositifAide===val?"#4C1D95":C.tx,
                      fontWeight:dispositifAide===val?600:400,lineHeight:1.4}}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flux bois — usage prévu */}
            <div style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:10}}>
                🔀 Usage prévu du bois mobilisé
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[
                  ["bo","🪵","Bois d'œuvre","Sciage, charpente"],
                  ["bi","📦","Bois d'industrie","Pâte, panneaux"],
                  ["be","🔥","Bois énergie","Plaquettes, granulés"],
                  ["mixte","🔀","Mixte","Plusieurs usages"],
                ].map(([v,ico,lbl,sub])=>(
                  <div key={v} onClick={()=>setUsagePrevu(v)}
                    style={{padding:"10px 10px",borderRadius:10,cursor:"pointer",
                      border:`2px solid ${usagePrevu===v?(v==="be"?"#B45309":v==="bo"?"#1E5B3A":"#0369A1"):C.bd}`,
                      background:usagePrevu===v?(v==="be"?"#FEF3C7":v==="bo"?"#D1FAE5":"#DBEAFE"):"#F9FAFB",
                      WebkitTapHighlightColor:"transparent",textAlign:"center"}}>
                    <div style={{fontSize:20}}>{ico}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                    <div style={{fontSize:10,color:C.tx2}}>{sub}</div>
                  </div>
                ))}
              </div>
              {(usagePrevu==="bo"||usagePrevu==="mixte")&&(
                <div style={{marginBottom:8}}>
                  <MInput label="Volume bois d'œuvre prévu (m³)" value={volBO} onChange={setVolBO}
                    placeholder="ex: 180" hint="Usage matière — stockage carbone long terme"/>
                  <MInput label="Destination BO" value={destBO} onChange={setDestBO}
                    placeholder="ex: Scierie Marchais — Moulins (03)"/>
                  <MInput label="Référence preuve / bon" value={preuveDestBO} onChange={setPreuveDestBO}
                    placeholder="ex: BON-SC-2026-0441"/>
                </div>
              )}
              {(usagePrevu==="be"||usagePrevu==="mixte")&&(
                <div style={{marginBottom:8}}>
                  <MInput label="Volume bois énergie prévu (m³)" value={volBE} onChange={setVolBE}
                    placeholder="ex: 320"/>
                  <MInput label="Destination BE" value={destBE} onChange={setDestBE}
                    placeholder="ex: Chaufferie Municipale St-Amand"
                    {...(redDestination?{hint:"Pré-rempli depuis la certification RED — à préciser"}:{})}/>
                  <MInput label="Référence preuve / BL" value={preuveDestBE} onChange={setPreuveDestBE}
                    placeholder="ex: BL-2026-0831"/>
                </div>
              )}
              {usagePrevu==="bi"&&(
                <MInput label="Volume bois d'industrie prévu (m³)" value={volBI} onChange={setVolBI}
                  placeholder="ex: 50"/>
              )}
              {usagePrevu&&<MInput label="Date de contrôle prévue" value={dateControleFlux}
                onChange={setDateControle} placeholder="JJ/MM/AAAA" hint="Vérification après travaux"/>}
            </div>

            {/* ── Arbitrage SNBC 3 ── */}
            <div style={{background:"linear-gradient(135deg,#FFFBEB,#FEF3C7)",borderRadius:14,
              padding:"14px",border:"1.5px solid #F59E0B",marginTop:4}}>
              <div style={{fontSize:13,fontWeight:800,color:"#78350F",marginBottom:4}}>
                ⚖️ Arbitrage de la ressource — SNBC 3
              </div>
              <div style={{fontSize:11,color:"#92400E",marginBottom:12,lineHeight:1.5}}>
                La biomasse doit être qualifiée selon son usage potentiel et l'usage effectivement retenu,
                conformément à la hiérarchie des usages SNBC 3 (matière prioritaire sur énergie).
              </div>

              {/* Usage potentiel */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#78350F",marginBottom:6}}>
                  Usage potentiel de cette ressource
                </div>
                {[["bois_oeuvre","🪵","Bois d'œuvre (BO)","Sciage, grumes — valorisation matière haute"],
                  ["bois_industrie","📦","Bois d'industrie (BI)","Panneaux, pâte, trituration"],
                  ["bois_energie","🔥","Bois-énergie exclusif (BE)","Qualité ou dimension hors marché matière"],
                  ["mixte_bo_be","🌲","Mixte BO + BE","Lot hétérogène — partie valorisable matière"],
                  ["mixte_bi_be","🌿","Mixte BI + BE","Lot partiellement valorisable industrie"],
                ].map(([v,ico,l,s])=>(
                  <div key={v} onClick={()=>setUsagePotentiel(v)} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                    borderRadius:10,marginBottom:5,cursor:"pointer",
                    border:`1.5px solid ${usagePotentiel===v?"#F59E0B":C.bd}`,
                    background:usagePotentiel===v?"#FEF3C7":"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{ico}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:usagePotentiel===v?"#78350F":C.tx}}>{l}</div>
                      <div style={{fontSize:10,color:C.tx3}}>{s}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Usage retenu */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#78350F",marginBottom:6}}>
                  Usage effectivement retenu
                </div>
                {[["bois_oeuvre","🪵","Bois d'œuvre"],
                  ["bois_industrie","📦","Bois d'industrie"],
                  ["bois_energie","🔥","Bois-énergie"],
                ].map(([v,ico,l])=>(
                  <button key={v} onClick={()=>setUsageRetenu(v)} style={{
                    display:"inline-flex",alignItems:"center",gap:6,
                    padding:"8px 14px",borderRadius:10,marginRight:6,marginBottom:6,
                    border:`2px solid ${usageRetenu===v?"#F59E0B":C.bd}`,
                    background:usageRetenu===v?"#FEF3C7":"#fff",
                    cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,
                    color:usageRetenu===v?"#78350F":C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>
                    {ico} {l}
                  </button>
                ))}
              </div>

              {/* Alerte déclassement */}
              {usagePotentiel!=="bois_energie"&&usageRetenu==="bois_energie"&&(
                <div style={{background:"#FEE2E2",borderRadius:10,padding:"10px 12px",
                  marginBottom:12,border:"1px solid #FECACA"}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#991B1B",marginBottom:8}}>
                    ⚠️ Déclassement vers l'énergie détecté — motif obligatoire
                  </div>
                  <div style={{fontSize:12,color:"#991B1B",marginBottom:10,lineHeight:1.5}}>
                    Ce lot présente un potentiel matière mais est orienté vers l'énergie.
                    Conformément à la hiérarchie des usages SNBC 3, un motif doit être documenté.
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {[["qualite_insuffisante","Qualité insuffisante pour la valorisation matière"],
                      ["pas_de_client_matiere","Absence de client matière à distance acceptable"],
                      ["couts_logistiques","Coûts logistiques prohibitifs vers scierie/industrie"],
                      ["essence_non_valorisable","Essence ou dimension hors marché matière local"],
                      ["degradation_acces","Dégradation lors du transport, orientation énergie contrainte"],
                      ["urgence_exploitation","Contrainte calendaire — chablis, tempête, urgence sanitaire"],
                      ["choix_proprietaire","Choix documenté du propriétaire"],
                      ["autre","Autre motif — préciser ci-dessous"],
                    ].map(([v,l])=>(
                      <button key={v} onClick={()=>setMotifArbitrage(v)} style={{
                        padding:"8px 12px",borderRadius:8,textAlign:"left",
                        border:`1.5px solid ${motifArbitrage===v?"#991B1B":C.bd}`,
                        background:motifArbitrage===v?"#FEE2E2":"#fff",
                        cursor:"pointer",fontFamily:"inherit",fontSize:12,
                        color:motifArbitrage===v?"#991B1B":C.tx2,
                        WebkitTapHighlightColor:"transparent"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {motifArbitrage==="autre"&&(
                    <div style={{marginTop:8}}>
                      <textarea value={motifArbitrageLib}
                        onChange={e=>setMotifArbitrageLib(e.target.value)}
                        rows={2} placeholder="Décrire le motif de déclassement…"
                        style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:12,
                          border:"1.5px solid #FECACA",fontFamily:"inherit",
                          outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
                    </div>
                  )}
                </div>
              )}

              {/* Niveau de sécurisation */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#78350F",marginBottom:6}}>
                  Niveau de sécurisation du volume
                </div>
                {[["securise","✅","Sécurisé","Contrat signé, preuve de destination disponible","#065F46","#D1FAE5"],
                  ["mobilisable_cond","⚠️","Mobilisable sous conditions","Accord propriétaire, certification ou accès à confirmer","#92400E","#FEF3C7"],
                  ["theorique","🔵","Théorique","Estimation statistique ou territoriale — non sécurisée","#1E40AF","#DBEAFE"],
                ].map(([v,ico,l,s,col,bg])=>(
                  <div key={v} onClick={()=>setNiveauSecurisation(v)} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                    borderRadius:10,marginBottom:5,cursor:"pointer",
                    border:`1.5px solid ${niveauSecurisation===v?col:C.bd}`,
                    background:niveauSecurisation===v?bg:"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:niveauSecurisation===v?col:C.tx}}>{l}</div>
                      <div style={{fontSize:10,color:C.tx3}}>{s}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preuve de destination finale */}
              <MInput label="Preuve de destination finale"
                value={preuveDestFin} onChange={setPreuveDestFin}
                placeholder="Réf. contrat, BL, attestation client…"
                hint="Lien ou référence documentaire prouvant l'usage effectif"/>
            </div>

            {/* Date de dépôt et décision */}
            {dispositifAide&&dispositifAide!==""&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <MInput label="Date de dépôt prévue" value={dateDepotPrevu}
                  onChange={setDateDepotPrevu} placeholder="JJ/MM/AAAA"/>
                <MInput label="Décision attributive (si déjà obtenue)" value={decisionAttributive}
                  onChange={setDecisionAttr} placeholder="ex: Décision n° 2026-XXX du ..."/>
                <MInput label="Réserves spécifiques à ce dossier" value={reserveManuelle}
                  onChange={setReserveManuelle} placeholder="Observations juridiques particulières"/>
              </div>
            )}

            {/* Snapshot — aperçu */}
            <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,
              padding:"10px 12px",fontSize:11,color:"#1E40AF"}}>
              <div style={{fontWeight:700,marginBottom:6}}>
                💾 Snapshot réglementaire — sera figé à la date d'aujourd'hui
              </div>
              <div style={{color:"#1D4ED8",lineHeight:1.6}}>
                {TEXTES_REGL.map(t=>(
                  <div key={t.id} style={{display:"flex",justifyContent:"space-between",
                    padding:"2px 0",borderBottom:"1px solid #DBEAFE"}}>
                    <span>{t.texteRef}</span>
                    <span style={{fontWeight:700,
                      color:t.statut==="annule"?"#DC2626":t.statut==="applicable"?"#065F46":"#92400E"}}>
                      {STATUT_REGL[t.statut]?.icon} {STATUT_REGL[t.statut]?.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step<STEPS.length-1 ? (
          <BigBtn onClick={()=>{ if(returnStep!==null){setStep(returnStep);setReturnStep(null);}else{setStep(s=>s+1);} }}
            bg={step<9?C.green:stepValid[step]?currentStep.color:C.amber} style={{flex:1}}>
            {returnStep!==null?`↩ Retour au récapitulatif`
              :step<10?`Valider`
              :`${STEPS[step+1].icon} ${STEPS[step+1].label}`}
          </BigBtn>
        ) : (
          <BigBtn onClick={handleSave} bg={allValid?C.green:C.bg2}
            disabled={saving} style={{flex:1}} icon={saving?"":"✅"}>
            {saving?"Enregistrement…":"VALIDER LA VISITE"}
          </BigBtn>
        )}
        {step>0&&(
          <button onClick={()=>{ if(returnStep!==null){setStep(returnStep);setReturnStep(null);}else{setStep(s=>s-1);} }}
            style={{height:BTN_H,padding:"0 20px",
            borderRadius:14,background:C.bg2,color:C.tx2,border:"none",
            fontFamily:"inherit",fontSize:15,fontWeight:500,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
            {returnStep!==null?"↩ Récap.":"< Retour"}
          </button>
        )}
      </div>
    </div>
  );
};

export const ListeVisites = ({visites}: any) => (
  <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING}}>
    {visites.length===0 ? (
      <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
        <div style={{fontSize:40,marginBottom:12}}>🔭</div>
        <div style={{fontSize:16,fontWeight:500}}>Aucune visite</div>
        <div style={{fontSize:13,marginTop:6}}>Lancez une visite depuis une fiche contact</div>
      </div>
    ) : visites.map((v: any)=>(
      <div key={v.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
        borderRadius:14,padding:16,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:600}}>{v.lotNumero}</div>
          <div style={{fontSize:11,padding:"3px 8px",borderRadius:6,
            background:C.greenL,color:C.greenD,fontWeight:500}}>✅ Validée</div>
        </div>
        <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
          📅 {v.date} · 📦 {fmtNum(v.volumeEstimeT)}t · {v.surfaceHa}ha<br/>
          🚛 Accès {v.accesCamion}
          {Array.isArray(v.photos)&&v.photos.length>0&&
            <span> · 📷 {v.photos.length} photo{v.photos.length>1?"s":""}</span>}
        </div>
      </div>
    ))}
  </div>
);

// ── APP ────────────────────────────────────────────────────────
// ── ÉCRAN RELEVÉS ─────────────────────────────────────────────
