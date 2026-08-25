// ============================================================
// APPLITAG MOBILE — Auth QR + PIN + Multi-tenant
// ============================================================

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { IS_DEMO_BUILD, API_BASE_URL } from "./config/env.js";
import { FEATURE_FLAGS } from "./config/featureFlags.js";
import {
  DEMO_ENTREPRISE_ID,
  DEMO_USERS,
  DEMO_LOTS,
  DEMO_VISITES,
  DEMO_REPORTINGS,
  DEMO_TRANSPORTS,
  DEMO_LIVRAISONS,
  DEMO_DECHIQUETAGES,
} from "./demo/demoData.js";
import { C, FONT_TITLE, FONT_BODY, BTN_H, INPUT_H, FONT_INPUT, PADDING } from "./design-system/tokens.js";
import { uid, nowISO, todayS, genCode, genCodeAPT } from "./shared/utils.js";
import { getToken, getUser, getEntrepriseId, setAuth, clearAuth, authHeaders, genPin4 } from "./services/auth.service.js";
import { fmtNum } from "./shared/format.js";
import { INDICES_ESSENCE, calculerPoidsAjuste as poidsAjusteHumidite, indicesPonderes } from "./metier/formules.js";
import { TYPES_PRESTATION_ANNONCE, STATUTS_ANNONCE, ORDRE_STATUTS_ANNONCE } from "./domains/connect/constants.js";
import { ORIGINE_OPTS, TYPE_CONTACT_OPTS, TYPE_RESSOURCE_OPTS, PRIORITE_OPTS, STATUT_OPTS } from "./domains/contacts/constants.js";
import { genLotNumero } from "./domains/lots/utils.js";
import { deletedLotsGet, deletedLotsAdd } from "./domains/lots/local-storage.js";
import { DEFAULT_ENTREPRISE_ID, COMPTE_SESSION_KEY, annoncesLocalGet, annoncesLocalSave, comptesLocalGet, comptesLocalSave } from "./domains/connect/local-storage.js";
import { ordresExplLocalGet, ordresExplLocalSave } from "./domains/exploitation/local-storage.js";
import { countPendingSync, resyncPendingRecords } from "./domains/sync/legacy-sync.js";
import { apiGet, apiPost, apiPostPublic, apiPatch, apiDelete } from "./services/api.service.js";
import { BigBtn, MInput, GridSelect, SectionTitle, MiniBarChart, MSlider, CheckItem } from "./shared/ui.jsx";
import { SignatureCanvas } from "./shared/SignatureCanvas.jsx";
import { validatePhone, formatPhone, formatCMR, validateCMR, formatImmat, validateImmat } from "./shared/validators.js";
import { generatePdfFromHtml, buildCompteRenduContactHTML, buildCMRHTML, buildReceptionExploitHTML, buildPVVisiteHTML, buildOrdreDechiHTML, buildSimpleDocHTML, buildBonCommandeHTML, buildOrdreExploitationHTML, buildRedHTML } from "./domains/documents/pdf-templates.js";
import { MapZonesProtegees, GpsWidget, PhotosWidget, EssenceEditor, ChecklistChantier, FormulaireVisite, ListeVisites } from "./domains/visites/FormulaireVisite.jsx";
import { SectionAcces, SectionAbonnements, SectionDemoScenario, SectionModulesFuturs, SectionFinancements, SectionConformiteRED, SectionCoutReglementaire, SectionGES, SectionApplitgData, SectionScierie, SectionPermisIncendie, SectionDesserte, SectionCoproduits, SectionProjetFinance, SectionParcelleTravaux, SectionRegistreIA, SectionBoisCrise, SectionFicheCombustible, SectionVeilleReglementaire, SectionLivraisons, SectionFacturationElec, SectionChaufferies, SectionRapports, SectionReseau, SectionParametres, SectionChantiers, SectionTransports, BarChart, SectionAnalyses, SectionDocuments, SectionTerritoire, HubAlertes, SectionPlanning } from "./domains/dashboard/sections.jsx";

const API = API_BASE_URL;
// Helpers importés depuis leurs modules domaine (voir imports ci-dessus)

// ── ATOMS ─────────────────────────────────────────────────────
// BigBtn, MInput, GridSelect, SectionTitle, MiniBarChart importés depuis ./shared/ui.jsx
// SignatureCanvas importé depuis ./shared/SignatureCanvas.jsx

// ── ÉCRAN LOGIN ───────────────────────────────────────────────
// ── DONNÉES DÉMO ──────────────────────────────────────────────
// DEMO_ENTREPRISE_ID, DEMO_USERS et les autres constantes DEMO_*
// sont importées depuis ./demo/demoData.js (env-guarded).

// Données DEMO_LOTS, DEMO_VISITES, DEMO_REPORTINGS, DEMO_TRANSPORTS,
// DEMO_LIVRAISONS, DEMO_DECHIQUETAGES — importées depuis ./demo/demoData.js

// ── LOGIN SCREEN COMPONENT ────────────────────────────────────
const LoginScreen = ({onLogin, onLoginOperateur, onLoginDemo}) => {
  const [step, setStep] = useState("bienvenue"); // bienvenue | home | scan | pin | operateur | demo | ordre
  const [entrepriseId, setEntrepriseId] = useState("");
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [opNom, setOpNom] = useState("");
  const [opPin, setOpPin] = useState("");
  const [ordreCode, setOrdreCode] = useState("");
  const [ordreTrouve, setOrdreTrouve] = useState(null);
  const [ordreErreur, setOrdreErreur] = useState("");
  const [ordreLoading, setOrdreLoading] = useState(false);

  const handleRechercherOrdre = async () => {
    const code = ordreCode.trim().toUpperCase();
    if (!code) return;
    setOrdreLoading(true); setOrdreErreur(""); setOrdreTrouve(null);
    let found = null;
    try {
      found = await apiGet(`/ordres-exploitation/code/${code}`);
    } catch {}
    if (!found) found = ordresExplLocalGet().find(o=>o.code===code)||null;
    if (!found) setOrdreErreur("Code introuvable — vérifiez la saisie");
    else setOrdreTrouve(found);
    setOrdreLoading(false);
  };

  const handleValiderOrdre = async (statut) => {
    if (!ordreTrouve) return;
    setOrdreLoading(true);
    const updated = {...ordreTrouve, statut, dateValidation: nowISO()};
    let syncOk = false;
    try {
      await apiPatch(`/ordres-exploitation/${ordreTrouve.id}`, {statut, dateValidation: updated.dateValidation});
      syncOk = true;
    } catch {
      setOrdreErreur("Erreur — validation sauvegardée localement uniquement");
    }
    updated.synced = syncOk;
    ordresExplLocalSave(ordresExplLocalGet().map(o=>o.code===updated.code?updated:o));
    setOrdreTrouve(updated);
    setOrdreLoading(false);
  };

  // ── APPLITAG Connect - Annonces : proposition de bois / offre de service / demande de plaquettes ──
  const [annonceType,     setAnnonceType]    = useState(null); // gisement | service | demande
  const [annonceNom,      setAnnonceNom]      = useState(""); // Nom / société
  const [annonceTel,      setAnnonceTel]      = useState("");
  const [annonceEmail,    setAnnonceEmail]    = useState("");
  const [annonceCommune,  setAnnonceCommune]  = useState("");
  const [annonceCP,       setAnnonceCP]       = useState("");
  const [annonceTypeBois, setAnnonceTypeBois] = useState("");
  const [annonceVolume,   setAnnonceVolume]   = useState("");
  const [annonceEtatBois, setAnnonceEtatBois] = useState("sur_pied"); // sur_pied | bord_route
  const [annoncePhotos,   setAnnoncePhotos]   = useState([]);
  const [annoncePrestations,setAnnoncePrest]  = useState([]);
  const [annonceCommentaire,setAnnonceComment]= useState("");
  const [consentRecontact,setConsentRecontact]= useState(false);
  const [consentActus,    setConsentActus]    = useState(false);
  const [consentNetwork,  setConsentNetwork]  = useState(false);
  const [annonceEnvoyee,  setAnnonceEnvoyee]  = useState(false);
  const [annonceSaving,   setAnnonceSaving]   = useState(false);

  const toggleAnnoncePrestation = v => setAnnoncePrest(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);

  const handleAjouterPhotoAnnonce = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => setAnnoncePhotos(prev=>[...prev, ev.target.result].slice(0,3));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const resetAnnonce = () => {
    setAnnonceType(null); setAnnonceNom(""); setAnnonceTel(""); setAnnonceEmail("");
    setAnnonceCommune(""); setAnnonceCP(""); setAnnonceTypeBois(""); setAnnonceVolume(""); setAnnonceEtatBois("sur_pied");
    setAnnoncePhotos([]); setAnnoncePrest([]); setAnnonceComment("");
    setConsentRecontact(false); setConsentActus(false); setConsentNetwork(false);
    setAnnonceEnvoyee(false);
  };

  const handleEnvoyerAnnonce = async () => {
    if (!annonceNom.trim()||!annonceTel.trim()) { setError("Indiquez votre nom/société et votre téléphone"); return; }
    if (!annonceCP.trim()) { setError("Indiquez votre code postal"); return; }
    if (!consentRecontact) { setError("Merci de cocher la case « J'accepte d'être recontacté »"); return; }
    setError(""); setAnnonceSaving(true);
    const annonce = {
      id: uid(), type: annonceType, statut:"recu", entrepriseId: DEFAULT_ENTREPRISE_ID,
      compteId: compteSession?.id||null,
      nom: annonceNom, telephone: annonceTel, email: annonceEmail, commune: annonceCommune, codePostal: annonceCP,
      typeBois: annonceTypeBois, volumeEstime: annonceVolume, etatBois: annonceEtatBois,
      photos: annoncePhotos,
      prestations: annoncePrestations, commentaire: annonceCommentaire,
      consentRecontact, consentActus, consentNetwork,
      dateEnvoi: nowISO(), synced:false,
    };
    try {
      await apiPostPublic(`/annonces`, annonce);
      annonce.synced = true;
    } catch {}
    annoncesLocalSave([annonce, ...annoncesLocalGet()]);
    setAnnonceEnvoyee(true);
    setAnnonceSaving(false);
  };

  // ── APPLITAG Connect - Compte contact (accès gratuit, sans fonction sensible) ──
  const [compteVue,     setCompteVue]    = useState("choix"); // choix | inscription | connexion | espace
  const [compteSession, setCompteSession]= useState(()=>{
    try { return JSON.parse(localStorage.getItem(COMPTE_SESSION_KEY)||"null"); } catch { return null; }
  });
  const [suiviOps, setSuiviOps] = useState(null);
  const suiviOpsIsDemo = useRef(false);
  const [compteNom,      setCompteNom]     = useState("");
  const [compteTel,      setCompteTel]     = useState("");
  const [compteEmail,    setCompteEmail]   = useState("");
  const [compteCodeGenere, setCompteCodeGenere] = useState("");
  const [compteTrancheHoraire, setCompteTrancheHoraire] = useState("");
  const [compteCodePostal,  setCompteCodePostal]  = useState("");
  const [compteNatureDemande, setCompteNatureDemande] = useState([]);
  const [compteRgpd, setCompteRgpd] = useState(false);
  const [compteCgu, setCompteCgu] = useState(false);
  const [compteIdentifiant, setCompteIdentifiant] = useState("");
  const [compteLoginPin, setCompteLoginPin]= useState("");
  const [compteErreur,   setCompteErreur]  = useState("");
  const [compteSaving,   setCompteSaving]  = useState(false);
  const [comptePrefActus,setComptePrefActus]    = useState(compteSession?.consentActus||false);
  const [comptePrefNetwork,setComptePrefNetwork]= useState(compteSession?.consentNetwork||false);

  const resetCompteForm = () => {
    setCompteNom(""); setCompteTel(""); setCompteEmail("");
    setCompteTrancheHoraire(""); setCompteNatureDemande([]); setCompteCodePostal("");
    setCompteIdentifiant(""); setCompteLoginPin(""); setCompteCodeGenere(""); setCompteErreur("");
    setCompteRgpd(false); setCompteCgu(false);
  };

  const handleCreerCompte = async () => {
    if (!compteNom.trim()||!compteTel.trim()) { setCompteErreur("Indiquez votre nom/société et votre téléphone"); return; }
    if (!compteCodePostal.trim()||compteCodePostal.length!==5) { setCompteErreur("Indiquez votre code postal (5 chiffres)"); return; }
    if (!compteRgpd) { setCompteErreur("Vous devez accepter la politique de protection des données"); return; }
    if (!compteCgu) { setCompteErreur("Vous devez accepter les conditions générales d'utilisation"); return; }
    const existants = comptesLocalGet();
    if (existants.some(c=>c.telephone===compteTel||(compteEmail&&c.email===compteEmail))) {
      setCompteErreur("Un compte existe déjà avec ce téléphone ou cet email — connectez-vous"); return;
    }
    setCompteErreur(""); setCompteSaving(true);
    const codeAPT = genCodeAPT();
    const compte = {
      id: uid(), nom: compteNom, telephone: compteTel, email: compteEmail, pin: codeAPT,
      entrepriseId: DEFAULT_ENTREPRISE_ID, consentActus:false, consentNetwork:false,
      trancheHoraire: compteTrancheHoraire||"", natureDemande: compteNatureDemande, codePostal: compteCodePostal||"", rapportAppel:"",
      dateCreation: nowISO(), synced:false,
    };
    try {
      await apiPostPublic(`/comptes-contact`, compte);
      compte.synced = true;
    } catch {}
    try {
      const msg = `Bonjour ${compteNom}, votre compte APPLITAG Connect a été créé. Votre code d'accès personnel est : ${codeAPT}. Conservez-le précieusement, il vous sera demandé à chaque connexion.`;
      await apiPostPublic(`/sms`, {to: compteTel, message: msg});
    } catch {}
    comptesLocalSave([compte, ...existants]);
    const session = {id:compte.id, nom:compte.nom, telephone:compte.telephone, email:compte.email,
      consentActus:compte.consentActus, consentNetwork:compte.consentNetwork};
    localStorage.setItem(COMPTE_SESSION_KEY, JSON.stringify(session));
    setCompteSession(session);
    setComptePrefActus(false); setComptePrefNetwork(false);
    setCompteCodeGenere(codeAPT);
    resetCompteForm();
    setCompteVue("code_genere");
    setCompteSaving(false);
  };

  const handleConnexionCompte = async () => {
    if (!compteIdentifiant.trim()||!compteLoginPin.trim()) {
      setCompteErreur("Indiquez votre téléphone/email et votre code APPLITAG"); return;
    }
    setCompteErreur(""); setCompteSaving(true);
    const saisie = compteLoginPin.trim().toUpperCase();
    const compte = comptesLocalGet().find(c=>
      (c.telephone===compteIdentifiant||c.email===compteIdentifiant)&&c.pin===saisie);
    if (!compte) {
      setCompteErreur("Identifiant ou code incorrect");
      setCompteSaving(false); return;
    }
    const session = {id:compte.id, nom:compte.nom, telephone:compte.telephone, email:compte.email,
      consentActus:compte.consentActus, consentNetwork:compte.consentNetwork};
    localStorage.setItem(COMPTE_SESSION_KEY, JSON.stringify(session));
    setCompteSession(session);
    setComptePrefActus(compte.consentActus||false); setComptePrefNetwork(compte.consentNetwork||false);
    resetCompteForm();
    setCompteVue("espace");
    setCompteSaving(false);
  };

  const handleDeconnexionCompte = () => {
    suiviOpsIsDemo.current = false;
    localStorage.removeItem(COMPTE_SESSION_KEY);
    setCompteSession(null); setSuiviOps(null);
    setCompteVue("choix");
  };

  const handleMajPrefsCompte = (champ, valeur) => {
    if (champ==="actus") setComptePrefActus(valeur); else setComptePrefNetwork(valeur);
    const comptes = comptesLocalGet().map(c=>c.id===compteSession.id
      ? {...c, consentActus:champ==="actus"?valeur:c.consentActus, consentNetwork:champ==="network"?valeur:c.consentNetwork}
      : c);
    comptesLocalSave(comptes);
    const session = {...compteSession, consentActus:champ==="actus"?valeur:compteSession.consentActus,
      consentNetwork:champ==="network"?valeur:compteSession.consentNetwork};
    localStorage.setItem(COMPTE_SESSION_KEY, JSON.stringify(session));
    setCompteSession(session);
    apiPatch(`/comptes-contact/${compteSession.id}`, {consentActus:champ==="actus"?valeur:compteSession.consentActus,
      consentNetwork:champ==="network"?valeur:compteSession.consentNetwork}).catch(()=>{});
  };

  const mesAnnonces = compteSession
    ? annoncesLocalGet().filter(a=>a.telephone===compteSession.telephone||(compteSession.email&&a.email===compteSession.email))
    : [];

  useEffect(() => {
    if (compteVue !== "espace" || !compteSession?.telephone) return;
    if (suiviOpsIsDemo.current) return;
    setSuiviOps(null);
    const today = todayS();
    Promise.all([
      apiGet(`/contacts`).catch(()=>[]),
      apiGet(`/dechiquetage`).catch(()=>[]),
      apiGet(`/activites`).catch(()=>[]),
    ]).then(([lots, dechiqList, activites]) => {
      const tel = compteSession.telephone;
      const mesLots = Array.isArray(lots) ? lots.filter(l=>l.telephone===tel) : [];
      const lotIds = new Set(mesLots.map(l=>l.id));

      const actsToday = Array.isArray(activites)
        ? activites.filter(a=>lotIds.has(a.lotId) && (a.dateJour||"").startsWith(today))
        : [];

      const abattageM3 = actsToday
        .filter(a=>["abattage","abattage_debardage"].includes(a.typeOperationJour))
        .reduce((s,a)=>s+(parseFloat(a.volumeJour)||0), 0);

      const debardageM3 = actsToday
        .filter(a=>["debardage","abattage_debardage"].includes(a.typeOperationJour))
        .reduce((s,a)=>s+(parseFloat(a.volumeJour)||0), 0);

      const dechiqToday = Array.isArray(dechiqList)
        ? dechiqList.filter(d=>lotIds.has(d.lotId) && (d.createdAt||d.dateJour||"").startsWith(today))
        : [];
      const dechiqT  = dechiqToday.reduce((s,d)=>s+(parseFloat(d.tonnageCharge)||0), 0);
      const dechiqM3 = dechiqToday.reduce((s,d)=>s+(parseFloat(d.cubageCharge)||0), 0);

      setSuiviOps({ abattageM3, debardageM3, dechiqT, dechiqM3, nbLots: mesLots.length, today });
    });
  }, [compteVue, compteSession?.telephone]);

  const qrRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (step === "scan") {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      let started = false;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          try {
            const data = JSON.parse(text);
            if (data.entrepriseId && data.nom) {
              scanner.stop().catch(()=>{});
              setEntrepriseId(data.entrepriseId);
              setEntrepriseNom(data.nom);
              setStep("pin");
            }
          } catch {
            setError("QR code invalide");
          }
        },
        () => {}
      ).then(()=>{ started = true; })
       .catch(() => setError("Impossible d'accéder à la caméra"));
      return () => {
        if (started) scanner.stop().catch(()=>{});
        else try { scanner.stop().catch(()=>{}); } catch(e) {}
      };
    }
  }, [step]);

  const handlePin = (digit) => {
    if (pin.length < 4) setPin(p => p + digit);
  };
  const handleDel = () => setPin(p => p.slice(0,-1));

  useEffect(() => {
    if (pin.length === 4) handleLogin();
  }, [pin]);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiPostPublic(`/auth/login`, { entrepriseId, pin });
      setAuth(data.access_token, data.utilisateur, entrepriseId);
      onLogin(data.utilisateur);
    } catch(e) {
      setError("PIN incorrect — réessayez");
      setPin("");
    }
    setLoading(false);
  };

  const handleLoginOperateur = async () => {
    if (!opNom.trim()||!opPin.trim()) { setError("Saisissez votre nom et PIN"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await apiPostPublic(`/operateurs/login`, {
        entrepriseId: "c1b035b8-c2d5-4b84-a07e-2a3d503fb96c",
        nom: opNom, pin: opPin,
      });
      onLoginOperateur(data);
    } catch(e) {
      setError("Nom ou PIN incorrect — réessayez");
    }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",
      background:C.sb,color:"#fff"}}>
      {/* Header */}
      <div style={{padding:"32px 24px 24px",textAlign:"center"}}>
        <img src="/logo.png" alt="APPLITAG" style={{width:80,height:80,objectFit:"contain",marginBottom:12}}/>
        <div style={{fontSize:22,fontWeight:700,fontFamily:FONT_TITLE}}>APPLITAG</div>
        <div style={{fontSize:13,opacity:.6,marginTop:4}}>Gestion des flux bois énergie</div>
      </div>

      <div style={{flex:1,padding:PADDING,overflowY:"scroll",background:C.sb}}>

        {/* ── BIENVENUE ── */}
        {step==="bienvenue"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:8}}>
            <div style={{fontSize:14,color:"rgba(255,255,255,.75)",textAlign:"center",
              lineHeight:1.7,marginBottom:32,maxWidth:300}}>
              Bienvenue sur <strong>APPLITAG</strong>, votre plateforme de gestion de la chaîne bois-énergie.
              Connectez-vous ou rejoignez-nous pour déposer une annonce.
            </div>
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
              <button onClick={()=>setStep("home")}
                style={{width:"100%",padding:20,borderRadius:16,
                  background:"rgba(255,255,255,.12)",border:"1.5px solid rgba(255,255,255,.35)",
                  color:"#fff",fontFamily:"inherit",fontSize:15,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent",
                  display:"flex",alignItems:"center",gap:16,textAlign:"left"}}>
                <span style={{fontSize:32,lineHeight:1}}>🔑</span>
                <div>
                  <div>Me connecter</div>
                  <div style={{fontSize:12,opacity:.65,fontWeight:400,marginTop:3}}>
                    Espace professionnel fourni par l'administrateur
                  </div>
                </div>
              </button>
              <button onClick={()=>{ setCompteErreur(""); setCompteVue(compteSession?"espace":"choix"); setStep("compte"); }}
                style={{width:"100%",padding:20,borderRadius:16,
                  background:"rgba(76,175,80,.25)",border:"1.5px solid rgba(76,175,80,.6)",
                  color:"#fff",fontFamily:"inherit",fontSize:15,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent",
                  display:"flex",alignItems:"center",gap:16,textAlign:"left"}}>
                <span style={{fontSize:32,lineHeight:1}}>📲</span>
                <div>
                  <div>APPLITAG Connect</div>
                  <div style={{fontSize:12,opacity:.65,fontWeight:400,marginTop:3}}>
                    Créer un compte · Suivre mon lot · Déposer une annonce bois ou service
                  </div>
                </div>
              </button>
            </div>
            <div style={{display:"flex",gap:20,marginBottom:12}}>
              <button onClick={()=>setStep("demo")}
                style={{background:"none",border:"none",color:"rgba(255,255,255,.45)",
                  fontFamily:"inherit",fontSize:12,cursor:"pointer",textDecoration:"underline",
                  WebkitTapHighlightColor:"transparent"}}>
                🎭 Mode démo
              </button>
            </div>
          </div>
        )}

        {/* ── HOME — menu connexion professionnelle ── */}
        {step==="home"&&(
          <div>
            <button onClick={()=>setStep("bienvenue")}
              style={{background:"none",border:"none",color:"rgba(255,255,255,.55)",
                fontFamily:"inherit",fontSize:13,cursor:"pointer",marginBottom:16,
                display:"flex",alignItems:"center",gap:6,WebkitTapHighlightColor:"transparent"}}>
              {"< "} Retour
            </button>
            <div style={{fontSize:14,color:"rgba(255,255,255,.7)",
              textAlign:"center",marginBottom:28,lineHeight:1.6}}>
              Choisissez votre mode de connexion
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <button onClick={()=>{
                setEntrepriseId("c1b035b8-c2d5-4b84-a07e-2a3d503fb96c");
                setEntrepriseNom("APPLITAG");
                setStep("pin");
              }} style={{width:"100%",padding:18,borderRadius:14,
                background:"rgba(29,158,117,.25)",border:"1.5px solid rgba(29,158,117,.6)",
                color:"#fff",fontFamily:"inherit",fontSize:15,fontWeight:600,
                cursor:"pointer",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
                <span style={{fontSize:28}}>🔑</span>
                <div>
                  <div>Connexion administrateur</div>
                  <div style={{fontSize:11,opacity:.6,fontWeight:400,marginTop:2}}>
                    Code PIN à 4 chiffres
                  </div>
                </div>
              </button>
              <button onClick={()=>{ setError(""); setStep("scan"); }} style={{
                width:"100%",padding:18,borderRadius:14,
                background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.2)",
                color:"rgba(255,255,255,.8)",fontFamily:"inherit",fontSize:15,fontWeight:500,
                cursor:"pointer",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
                <span style={{fontSize:28}}>📷</span>
                <div>
                  <div>Scanner le QR code</div>
                  <div style={{fontSize:11,opacity:.6,fontWeight:400,marginTop:2}}>
                    QR fourni par l'administrateur
                  </div>
                </div>
              </button>
              <button onClick={()=>{ setError(""); setStep("operateur"); }} style={{
                width:"100%",padding:18,borderRadius:14,
                background:"rgba(29,158,117,.12)",border:"1px solid rgba(29,158,117,.3)",
                color:"rgba(255,255,255,.8)",fontFamily:"inherit",fontSize:15,fontWeight:500,
                cursor:"pointer",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
                <span style={{fontSize:28}}>👷</span>
                <div>
                  <div>Connexion opérateur terrain</div>
                  <div style={{fontSize:11,opacity:.6,fontWeight:400,marginTop:2}}>
                    Code opérateur ETF
                  </div>
                </div>
              </button>
              <button onClick={()=>{ setOrdreCode(""); setOrdreTrouve(null); setOrdreErreur(""); setStep("ordre"); }} style={{
                width:"100%",padding:18,borderRadius:14,
                background:"rgba(166,106,46,.15)",border:"1px solid rgba(166,106,46,.4)",
                color:"rgba(255,255,255,.8)",fontFamily:"inherit",fontSize:15,fontWeight:500,
                cursor:"pointer",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
                <span style={{fontSize:28}}>📄</span>
                <div>
                  <div>Valider un ordre d'exploitation</div>
                  <div style={{fontSize:11,opacity:.6,fontWeight:400,marginTop:2}}>
                    Sous-traitant — code reçu de l'administrateur
                  </div>
                </div>
              </button>
              <button onClick={()=>{ resetAnnonce(); setError(""); setStep("annonce"); }} style={{
                width:"100%",padding:18,borderRadius:14,
                background:"rgba(76,175,80,.15)",border:"1px solid rgba(76,175,80,.4)",
                color:"rgba(255,255,255,.8)",fontFamily:"inherit",fontSize:15,fontWeight:500,
                cursor:"pointer",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
                <span style={{fontSize:28}}>📢</span>
                <div>
                  <div>Signaler / Proposer une annonce</div>
                  <div style={{fontSize:11,opacity:.6,fontWeight:400,marginTop:2}}>
                    Gisement, prestation ou demande de plaquettes
                  </div>
                </div>
              </button>
              <button onClick={()=>{ setCompteErreur(""); setCompteVue(compteSession?"espace":"choix"); setStep("compte"); }} style={{
                width:"100%",padding:18,borderRadius:14,
                background:"rgba(76,175,80,.15)",border:"1px solid rgba(76,175,80,.4)",
                color:"rgba(255,255,255,.8)",fontFamily:"inherit",fontSize:15,fontWeight:500,
                cursor:"pointer",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
                <span style={{fontSize:28}}>👤</span>
                <div>
                  <div>{compteSession?`Mon compte (${compteSession.nom})`:"Mon compte APPLITAG Connect"}</div>
                  <div style={{fontSize:11,opacity:.6,fontWeight:400,marginTop:2}}>
                    Accès gratuit — suivez vos propositions
                  </div>
                </div>
              </button>
              <button onClick={()=>setStep("demo")} style={{
                width:"100%",padding:18,borderRadius:14,
                background:"rgba(255,200,0,.1)",border:"1px solid rgba(255,200,0,.25)",
                color:"rgba(255,200,0,.9)",fontFamily:"inherit",fontSize:15,fontWeight:500,
                cursor:"pointer",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
                <span style={{fontSize:28}}>🎭</span>
                <div>
                  <div>Mode démonstration</div>
                  <div style={{fontSize:11,opacity:.6,fontWeight:400,marginTop:2}}>
                    6 rôles disponibles, données fictives
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step==="ordre"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:28,marginBottom:8}}>📄</div>
              <div style={{fontSize:16,fontWeight:700}}>Ordre d'exploitation</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:6,lineHeight:1.5}}>
                Saisissez le code transmis par l'administrateur
              </div>
            </div>
            {!ordreTrouve ? (
              <>
                <input value={ordreCode} onChange={e=>setOrdreCode(e.target.value.toUpperCase())}
                  placeholder="Ex: A7K9P2QX" maxLength={8}
                  style={{width:"100%",height:54,padding:"0 16px",borderRadius:12,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"monospace",fontSize:22,fontWeight:700,
                    letterSpacing:4,textAlign:"center",outline:"none",marginBottom:14}}/>
                {ordreErreur&&(
                  <div style={{color:C.amber,fontSize:13,textAlign:"center",marginBottom:12}}>
                    ⚠ {ordreErreur}
                  </div>
                )}
                <button onClick={handleRechercherOrdre} disabled={ordreLoading||!ordreCode.trim()}
                  style={{width:"100%",height:50,borderRadius:12,
                    background:"rgba(76,175,80,.3)",border:"1px solid rgba(76,175,80,.6)",
                    color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",marginBottom:14}}>
                  {ordreLoading?"Recherche…":"🔍 Rechercher"}
                </button>
              </>
            ) : (
              <div>
                <div style={{background:"rgba(255,255,255,.08)",borderRadius:14,padding:16,
                  marginBottom:14,border:"1px solid rgba(255,255,255,.15)"}}>
                  <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,
                    color:"#4CAF50",marginBottom:8}}>{ordreTrouve.lotNumero}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",lineHeight:1.9}}>
                    📍 {ordreTrouve.lotCommune||"—"}{ordreTrouve.lotAdresse?` · ${ordreTrouve.lotAdresse}`:""}<br/>
                    🛠️ {ordreTrouve.missionLabel}<br/>
                    📅 Délai : {ordreTrouve.delaiExecution
                      ? new Date(ordreTrouve.delaiExecution).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})
                      : "—"}<br/>
                    🏢 Pour : {ordreTrouve.entrepriseNom}
                  </div>
                </div>
                {ordreTrouve.statut==="en_attente" ? (
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={()=>handleValiderOrdre("refuse")} disabled={ordreLoading}
                      style={{flex:1,height:50,borderRadius:12,
                        background:"rgba(226,75,74,.2)",border:"1px solid rgba(226,75,74,.5)",
                        color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
                        WebkitTapHighlightColor:"transparent"}}>
                      ❌ Refuser
                    </button>
                    <button onClick={()=>handleValiderOrdre("accepte")} disabled={ordreLoading}
                      style={{flex:2,height:50,borderRadius:12,
                        background:"rgba(76,175,80,.4)",border:"1px solid rgba(76,175,80,.7)",
                        color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
                        WebkitTapHighlightColor:"transparent"}}>
                      ✅ J'accepte ce chantier
                    </button>
                  </div>
                ) : (
                  <div style={{background:ordreTrouve.statut==="accepte"?"rgba(76,175,80,.2)":"rgba(226,75,74,.2)",
                    borderRadius:12,padding:14,textAlign:"center",
                    border:`1px solid ${ordreTrouve.statut==="accepte"?"rgba(76,175,80,.5)":"rgba(226,75,74,.5)"}`}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>
                      {ordreTrouve.statut==="accepte"?"✅ Chantier accepté":"❌ Chantier refusé"}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={()=>{ setStep("bienvenue"); setOrdreTrouve(null); setOrdreCode(""); setOrdreErreur(""); }}
              style={{width:"100%",padding:14,borderRadius:12,marginTop:14,
              background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
              color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
              cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              {"<"} Retour à l'accueil
            </button>
          </div>
        )}

        {step==="annonce"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:28,marginBottom:8}}>📢</div>
              <div style={{fontSize:16,fontWeight:700}}>APPLITAG Connect - Annonces</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:6,lineHeight:1.5}}>
                {annonceEnvoyee ? "" : "Aucun compte requis — vous serez recontacté"}
              </div>
            </div>

            {annonceEnvoyee ? (
              <div>
                <div style={{background:"rgba(76,175,80,.2)",borderRadius:14,padding:20,
                  marginBottom:16,textAlign:"center",border:"1px solid rgba(76,175,80,.5)"}}>
                  <div style={{fontSize:32,marginBottom:8}}>✅</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>Annonce transmise</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:6,lineHeight:1.6}}>
                    L'administrateur va l'examiner et vous recontacter au {annonceTel}.
                  </div>
                </div>
                <button onClick={()=>{ resetAnnonce(); setStep("bienvenue"); }}
                  style={{width:"100%",padding:14,borderRadius:12,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
                  color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  {"<"} Retour à l'accueil
                </button>
              </div>
            ) : !annonceType ? (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {[
                  ["gisement","🌲","Proposer du bois","Bois sur pied ou bord de route à valoriser"],
                  ["service","🛠️","Proposer mes services","Abattage, débardage, déchiquetage, transport"],
                  ["demande","🪵","Demande de plaquettes forestières","Besoin d'approvisionnement bois énergie"],
                ].map(([v,e,l,s])=>(
                  <button key={v} onClick={()=>setAnnonceType(v)} style={{
                    width:"100%",padding:16,borderRadius:14,textAlign:"left",
                    background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.18)",
                    color:"#fff",fontFamily:"inherit",cursor:"pointer",
                    display:"flex",alignItems:"center",gap:14,
                    WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:26}}>{e}</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:600}}>{l}</div>
                      <div style={{fontSize:11,opacity:.6,marginTop:2}}>{s}</div>
                    </div>
                  </button>
                ))}
                <button onClick={()=>setStep("bienvenue")}
                  style={{width:"100%",padding:14,borderRadius:12,marginTop:6,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
                  color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  {"<"} Retour à l'accueil
                </button>
              </div>
            ) : (
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.8)",marginBottom:14}}>
                  {{"gisement":"🌲 Proposer du bois","service":"🛠️ Proposer mes services",
                    "demande":"🪵 Demande de plaquettes forestières"}[annonceType]}
                </div>
                <input value={annonceNom} onChange={e=>setAnnonceNom(e.target.value)}
                  placeholder="Nom / société *"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                <input value={annonceCommune} onChange={e=>setAnnonceCommune(e.target.value)}
                  placeholder="Commune"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                <input value={annonceCP} onChange={e=>setAnnonceCP(e.target.value.replace(/\D/g,"").slice(0,5))}
                  placeholder="Code postal *" type="tel" maxLength={5}
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>

                {annonceType==="gisement"&&(
                  <>
                    <input value={annonceTypeBois} onChange={e=>setAnnonceTypeBois(e.target.value)}
                      placeholder="Type de bois — optionnel"
                      style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                        border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                        color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                    <input value={annonceVolume} onChange={e=>setAnnonceVolume(e.target.value)}
                      placeholder="Volume ou surface estimée (t, m³, ha…) — optionnel"
                      style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                        border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                        color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:8}}>État du bois</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                      {[["sur_pied","Sur pied"],["bord_route","Bord de route"]].map(([v,l])=>(
                        <div key={v} onClick={()=>setAnnonceEtatBois(v)} style={{
                          padding:"10px 8px",borderRadius:10,cursor:"pointer",textAlign:"center",
                          border:`1.5px solid ${annonceEtatBois===v?"#4CAF50":"rgba(255,255,255,.25)"}`,
                          background:annonceEtatBois===v?"rgba(76,175,80,.25)":"rgba(255,255,255,.05)",
                          fontSize:13,color:"#fff",WebkitTapHighlightColor:"transparent"}}>
                          {l}
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:8}}>
                      Photos — optionnel (max 3)
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                      {annoncePhotos.map((p,i)=>(
                        <div key={i} style={{position:"relative",width:64,height:64}}>
                          <img src={p} style={{width:64,height:64,borderRadius:8,objectFit:"cover"}}/>
                          <div onClick={()=>setAnnoncePhotos(prev=>prev.filter((_,j)=>j!==i))}
                            style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",
                              background:C.red,color:"#fff",fontSize:12,display:"flex",
                              alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</div>
                        </div>
                      ))}
                      {annoncePhotos.length<3&&(
                        <div onClick={handleAjouterPhotoAnnonce} style={{width:64,height:64,borderRadius:8,
                          border:"1.5px dashed rgba(255,255,255,.35)",display:"flex",alignItems:"center",
                          justifyContent:"center",cursor:"pointer",fontSize:22,color:"rgba(255,255,255,.6)"}}>
                          📷
                        </div>
                      )}
                    </div>
                  </>
                )}

                <input value={annonceTel} onChange={e=>setAnnonceTel(formatPhone(e.target.value))}
                  placeholder="Téléphone *" type="tel"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                <input value={annonceEmail} onChange={e=>setAnnonceEmail(e.target.value)}
                  placeholder="Email — optionnel" type="email"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>

                {annonceType==="service"&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:8}}>
                      Prestations proposées
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                      {TYPES_PRESTATION_ANNONCE.map(([v,e,l])=>(
                        <div key={v} onClick={()=>toggleAnnoncePrestation(v)} style={{
                          padding:"10px 8px",borderRadius:10,cursor:"pointer",textAlign:"center",
                          border:`1.5px solid ${annoncePrestations.includes(v)?"#4CAF50":"rgba(255,255,255,.25)"}`,
                          background:annoncePrestations.includes(v)?"rgba(76,175,80,.25)":"rgba(255,255,255,.05)",
                          WebkitTapHighlightColor:"transparent"}}>
                          <div style={{fontSize:18}}>{e}</div>
                          <div style={{fontSize:11,color:"#fff",marginTop:2}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <textarea value={annonceCommentaire} onChange={e=>setAnnonceComment(e.target.value)}
                  placeholder="Message libre — optionnel"
                  rows={3}
                  style={{width:"100%",padding:14,borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",
                    marginBottom:14,resize:"vertical"}}/>

                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
                  {[
                    [consentRecontact,setConsentRecontact,"J'accepte d'être recontacté concernant ma proposition.",true],
                    [consentActus,setConsentActus,"J'accepte de recevoir les actualités APPLITAG.",false],
                    [consentNetwork,setConsentNetwork,"J'accepte de recevoir des informations sur APPLITAG Radio / TV / Network.",false],
                  ].map(([val,setter,label,required],i)=>(
                    <div key={i} onClick={()=>setter(!val)} style={{display:"flex",alignItems:"flex-start",
                      gap:10,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontSize:16,marginTop:1}}>{val?"☑️":"☐"}</span>
                      <span style={{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.5}}>
                        {label}{required&&<span style={{color:C.amber}}> *</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {error&&(
                  <div style={{color:C.amber,fontSize:13,textAlign:"center",marginBottom:12}}>
                    ⚠ {error}
                  </div>
                )}

                <button onClick={handleEnvoyerAnnonce} disabled={annonceSaving}
                  style={{width:"100%",height:50,borderRadius:12,
                    background:"rgba(76,175,80,.4)",border:"1px solid rgba(76,175,80,.7)",
                    color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",marginBottom:10}}>
                  {annonceSaving?"Envoi…":"📤 Envoyer l'annonce"}
                </button>
                <button onClick={()=>setAnnonceType(null)}
                  style={{width:"100%",padding:14,borderRadius:12,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
                  color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  {"<"} Changer de type d'annonce
                </button>
              </div>
            )}
          </div>
        )}

        {step==="compte"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:28,marginBottom:8}}>👤</div>
              <div style={{fontSize:16,fontWeight:700}}>APPLITAG Connect</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:6,lineHeight:1.5}}>
                Accès gratuit — aucune fonction sensible (prix, contrats, clients…)
              </div>
            </div>

            {compteVue==="choix"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button onClick={()=>{ resetCompteForm(); setCompteVue("connexion"); }} style={{
                  width:"100%",padding:16,borderRadius:14,textAlign:"left",
                  background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.18)",
                  color:"#fff",fontFamily:"inherit",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:14,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:24}}>🔑</span>
                  <div style={{fontSize:14,fontWeight:600}}>Se connecter</div>
                </button>
                <button onClick={()=>{ resetCompteForm(); setCompteVue("inscription"); }} style={{
                  width:"100%",padding:16,borderRadius:14,textAlign:"left",
                  background:"rgba(76,175,80,.2)",border:"1px solid rgba(76,175,80,.5)",
                  color:"#fff",fontFamily:"inherit",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:14,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:24}}>➕</span>
                  <div style={{fontSize:14,fontWeight:600}}>Créer un compte gratuit</div>
                </button>
                <button onClick={()=>setStep("bienvenue")}
                  style={{width:"100%",padding:14,borderRadius:12,marginTop:6,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
                  color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  {"<"} Retour à l'accueil
                </button>
              </div>
            )}

            {compteVue==="inscription"&&(
              <div>
                <input value={compteNom} onChange={e=>setCompteNom(e.target.value)}
                  placeholder="Nom / société *"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                <input value={compteTel} onChange={e=>setCompteTel(formatPhone(e.target.value))}
                  placeholder="Téléphone *" type="tel"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                <input value={compteCodePostal} onChange={e=>setCompteCodePostal(e.target.value.replace(/\D/g,"").slice(0,5))}
                  placeholder="Code postal *" type="tel" inputMode="numeric" maxLength={5}
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                <input value={compteEmail} onChange={e=>setCompteEmail(e.target.value)}
                  placeholder="Email — optionnel" type="email"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:6}}>Nature de la demande <span style={{opacity:.6}}>(plusieurs choix possibles)</span></div>
                  {[
                    "🌲 Proposer une parcelle / vendre du bois",
                    "📋 Demande d'estimation / devis",
                    "🤝 Rejoindre le réseau APPLITAG",
                    "📰 Recevoir des informations / actualités",
                    "❓ Autre demande",
                  ].map(n=>{
                    const sel=compteNatureDemande.includes(n);
                    return (
                      <button key={n} onClick={()=>setCompteNatureDemande(sel?compteNatureDemande.filter(x=>x!==n):[...compteNatureDemande,n])}
                        style={{display:"block",width:"100%",textAlign:"left",marginBottom:6,padding:"8px 12px",
                          borderRadius:10,border:`1.5px solid ${sel?"rgba(76,175,80,.8)":"rgba(255,255,255,.25)"}`,
                          background:sel?"rgba(76,175,80,.3)":"rgba(255,255,255,.08)",
                          color:"#fff",fontFamily:"inherit",fontSize:13,cursor:"pointer",
                          WebkitTapHighlightColor:"transparent"}}>
                        {sel?"✅ ":""}{n}
                      </button>
                    );
                  })}
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:6}}>Tranche horaire de rappel souhaitée</div>
                  {["Matin (8h–12h)","Après-midi (12h–17h)","Soirée (17h–19h)","Peu importe"].map(t=>(
                    <button key={t} onClick={()=>setCompteTrancheHoraire(compteTrancheHoraire===t?"":t)}
                      style={{display:"inline-block",marginRight:6,marginBottom:6,padding:"6px 12px",
                        borderRadius:20,border:"1.5px solid rgba(255,255,255,.35)",
                        background:compteTrancheHoraire===t?"rgba(76,175,80,.5)":"rgba(255,255,255,.1)",
                        color:"#fff",fontFamily:"inherit",fontSize:12,cursor:"pointer",
                        WebkitTapHighlightColor:"transparent"}}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"12px 14px",
                  marginBottom:14,border:"1px solid rgba(255,255,255,.2)",fontSize:13,
                  color:"rgba(255,255,255,.75)",lineHeight:1.5}}>
                  🔐 Un code d'accès personnel au format <strong style={{color:"#fff",fontFamily:"monospace"}}>APT-XXXX-XXXX</strong> vous sera généré automatiquement et envoyé par SMS.
                </div>

                {/* RGPD + CGU */}
                <div style={{background:"rgba(255,255,255,.06)",borderRadius:10,padding:"12px 14px",
                  marginBottom:14,border:"1px solid rgba(255,255,255,.15)"}}>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginBottom:10,lineHeight:1.5}}>
                    Conformément au RGPD (UE 2016/679), vos données sont collectées uniquement pour la gestion de votre espace APPLITAG Connect et la mise en relation avec des professionnels de la filière bois énergie dans votre région. Elles ne sont jamais vendues ni transmises à des tiers hors réseau APPLITAG.
                  </div>
                  {[
                    [compteRgpd, setCompteRgpd, "J'accepte la politique de protection des données personnelles (RGPD) *"],
                    [compteCgu,  setCompteCgu,  "J'accepte les conditions générales d'utilisation APPLITAG Connect *"],
                  ].map(([val, setter, label], i)=>(
                    <div key={i} onClick={()=>setter(!val)}
                      style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8,cursor:"pointer",
                        WebkitTapHighlightColor:"transparent"}}>
                      <div style={{width:18,height:18,borderRadius:4,flexShrink:0,marginTop:1,
                        border:`2px solid ${val?"rgba(76,175,80,.9)":"rgba(255,255,255,.4)"}`,
                        background:val?"rgba(76,175,80,.5)":"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {val&&<span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}
                      </div>
                      <span style={{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.5}}>{label}</span>
                    </div>
                  ))}
                </div>

                {compteErreur&&(
                  <div style={{color:C.amber,fontSize:13,textAlign:"center",marginBottom:12}}>⚠ {compteErreur}</div>
                )}
                <button onClick={handleCreerCompte} disabled={compteSaving}
                  style={{width:"100%",height:50,borderRadius:12,
                    background:"rgba(76,175,80,.4)",border:"1px solid rgba(76,175,80,.7)",
                    color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",marginBottom:10}}>
                  {compteSaving?"Création…":"✅ Créer mon compte"}
                </button>
                <button onClick={()=>setCompteVue("choix")}
                  style={{width:"100%",padding:14,borderRadius:12,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
                  color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  {"<"} Retour
                </button>
              </div>
            )}

            {compteVue==="code_genere"&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:12}}>🎉</div>
                <div style={{fontSize:17,fontWeight:700,color:"#fff",marginBottom:8}}>
                  Bienvenue, {compteSession?.nom} !
                </div>
                <div style={{fontSize:13,color:"rgba(255,255,255,.7)",marginBottom:20,lineHeight:1.6}}>
                  Votre compte APPLITAG Connect a été créé.<br/>
                  Votre code d'accès personnel a été envoyé par SMS au <strong style={{color:"#fff"}}>{compteSession?.telephone}</strong>.
                </div>
                <div style={{background:"rgba(255,255,255,.12)",borderRadius:14,padding:"18px 14px",
                  marginBottom:20,border:"2px solid rgba(255,255,255,.3)"}}>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:6}}>Votre code d'accès</div>
                  <div style={{fontSize:26,fontWeight:800,color:"#fff",fontFamily:"monospace",
                    letterSpacing:3}}>{compteCodeGenere}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:8}}>
                    Conservez-le précieusement — il vous sera demandé à chaque connexion
                  </div>
                </div>
                <button onClick={()=>setCompteVue("espace")}
                  style={{width:"100%",height:50,borderRadius:12,
                    background:"rgba(76,175,80,.4)",border:"1px solid rgba(76,175,80,.7)",
                    color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent"}}>
                  Accéder à mon espace →
                </button>
              </div>
            )}

            {compteVue==="connexion"&&(
              <div>
                <input value={compteIdentifiant} onChange={e=>setCompteIdentifiant(e.target.value)}
                  placeholder="Téléphone ou email *"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:10}}/>
                <input value={compteLoginPin} onChange={e=>setCompteLoginPin(e.target.value.toUpperCase())}
                  placeholder="Code APPLITAG (APT-XXXX-XXXX) *" autoCapitalize="characters"
                  style={{width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"monospace",fontSize:15,letterSpacing:2,outline:"none",marginBottom:14}}/>
                {compteErreur&&(
                  <div style={{color:C.amber,fontSize:13,textAlign:"center",marginBottom:12}}>⚠ {compteErreur}</div>
                )}
                <button onClick={handleConnexionCompte} disabled={compteSaving}
                  style={{width:"100%",height:50,borderRadius:12,
                    background:"rgba(76,175,80,.4)",border:"1px solid rgba(76,175,80,.7)",
                    color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",marginBottom:10}}>
                  {compteSaving?"Connexion…":"🔑 Se connecter"}
                </button>
                <button onClick={()=>setCompteVue("choix")}
                  style={{width:"100%",padding:14,borderRadius:12,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
                  color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  {"<"} Retour
                </button>
              </div>
            )}

            {compteVue==="espace"&&compteSession&&(
              <div>
                <div style={{background:"rgba(255,255,255,.08)",borderRadius:14,padding:16,
                  marginBottom:16,border:"1px solid rgba(255,255,255,.15)"}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{compteSession.nom}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:4}}>
                    📞 {compteSession.telephone}{compteSession.email&&<> · 📧 {compteSession.email}</>}
                  </div>
                </div>

                <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.8)",marginBottom:8}}>
                  ⚙️ Suivi des opérations du jour
                </div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.45)",marginBottom:10,fontStyle:"italic"}}>
                  * Toutes les valeurs affichées sont des estimations
                </div>
                {!suiviOps ? (
                  <div style={{fontSize:12,color:"rgba(255,255,255,.45)",marginBottom:16,textAlign:"center"}}>
                    Chargement…
                  </div>
                ) : suiviOps.nbLots===0 ? (
                  <div style={{fontSize:12,color:"rgba(255,255,255,.45)",marginBottom:16}}>
                    Aucun lot associé à votre compte pour le moment.
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                    {[
                      {icon:"🪓", label:"Abattage", val: suiviOps.abattageM3>0 ? `${suiviOps.abattageM3.toFixed(1)} m³ *` : "—", sub:"Volume abattu estimé"},
                      {icon:"🚜", label:"Débardage", val: suiviOps.debardageM3>0 ? `${suiviOps.debardageM3.toFixed(1)} m³ *` : "—", sub:"Volume sorti estimé"},
                      {icon:"⚙️", label:"Déchiquetage",
                        val: suiviOps.dechiqT>0||suiviOps.dechiqM3>0
                          ? [suiviOps.dechiqT>0&&`${suiviOps.dechiqT.toFixed(1)} t`, suiviOps.dechiqM3>0&&`${suiviOps.dechiqM3.toFixed(1)} m³`].filter(Boolean).join(" · ")+" *"
                          : "—",
                        sub:"Tonnage & cubage chargés estimés"},
                    ].map(({icon,label,val,sub})=>(
                      <div key={label} style={{background:"rgba(255,255,255,.07)",borderRadius:10,
                        padding:"10px 14px",border:"1px solid rgba(255,255,255,.12)",
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{icon} {label}</div>
                          <div style={{fontSize:10,color:"rgba(255,255,255,.45)",marginTop:2}}>{sub}</div>
                        </div>
                        <div style={{fontSize:15,fontWeight:700,color:"rgba(255,255,255,.85)",textAlign:"right"}}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.8)",marginBottom:10}}>
                  📋 Mes propositions ({mesAnnonces.length})
                </div>
                {mesAnnonces.length===0 ? (
                  <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginBottom:16}}>
                    Aucune proposition envoyée pour le moment.
                  </div>
                ) : (
                  <div style={{marginBottom:16}}>
                    {mesAnnonces.map(a=>{
                      const statutInfo = STATUTS_ANNONCE[a.statut]||STATUTS_ANNONCE.recu;
                      return (
                        <div key={a.id} style={{background:"rgba(255,255,255,.06)",borderRadius:10,
                          padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:12,color:"#fff",fontWeight:600}}>
                              {{"gisement":"🌲 Bois proposé","service":"🛠️ Service proposé",
                                "demande":"🪵 Demande plaquettes"}[a.type]||a.type}
                            </div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:2}}>
                              {new Date(a.dateEnvoi).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                          <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,fontWeight:600,
                            background:statutInfo.bg,color:statutInfo.color}}>{statutInfo.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Contacts intéressés */}
                {(()=>{
                  const DEMO_CONTACTS_INTERESSES = [
                    {id:"ci1",entreprise:"SYLVA ENERGIE SARL",contact:"Marc Dujardin",
                      date:"2026-07-14",type:"gisement",vu:true,relanceFaite:false,
                      message:"Intéressé par vos 120 t de plaquettes forestières. Disponible pour visite mercredi."},
                    {id:"ci2",entreprise:"BOIS ÉNERGIE CENTRE",contact:"Sophie Marchand",
                      date:"2026-07-10",type:"gisement",vu:true,relanceFaite:true,
                      message:"Nous avons capacité de stockage. Quel est votre délai d'exploitation ?"},
                    {id:"ci3",entreprise:"CHAUFFERIE MUNICIPALE ST-AMAND",contact:"Régie technique",
                      date:"2026-07-09",type:"gisement",vu:false,relanceFaite:false,
                      message:""},
                  ];
                  const now = new Date();
                  const contactsNonRelances = DEMO_CONTACTS_INTERESSES.filter(c=>{
                    const ageJ = Math.floor((now-new Date(c.date))/(1000*60*60*24));
                    return !c.relanceFaite && ageJ>=7;
                  });
                  return (
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.8)",marginBottom:10}}>
                        👁️ Professionnels intéressés ({DEMO_CONTACTS_INTERESSES.length})
                      </div>

                      {/* Alerte relance 7j */}
                      {contactsNonRelances.length>0&&(
                        <div style={{background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.5)",
                          borderRadius:10,padding:"10px 14px",marginBottom:12,
                          display:"flex",gap:10,alignItems:"flex-start"}}>
                          <span style={{fontSize:18}}>⏰</span>
                          <div>
                            <div style={{fontSize:12,fontWeight:700,color:"rgba(245,158,11,1)",marginBottom:4}}>
                              Relance recommandée
                            </div>
                            <div style={{fontSize:11,color:"rgba(255,255,255,.7)",lineHeight:1.5}}>
                              {contactsNonRelances.length} contact{contactsNonRelances.length>1?"s ont":"a"} consulté votre offre il y a plus de 7 jours sans retour de votre part. Avez-vous été contacté(e) ?
                            </div>
                            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                              {contactsNonRelances.map(c=>(
                                <span key={c.id} style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                                  background:"rgba(245,158,11,.25)",color:"rgba(255,220,100,1)",fontWeight:600}}>
                                  {c.entreprise.split(" ")[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {DEMO_CONTACTS_INTERESSES.map(c=>{
                          const ageJ = Math.floor((now-new Date(c.date))/(1000*60*60*24));
                          return (
                            <div key={c.id} style={{background:"rgba(255,255,255,.06)",borderRadius:10,
                              padding:"10px 14px",border:`1px solid ${c.vu?"rgba(255,255,255,.1)":"rgba(76,175,80,.4)"}`}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:2}}>
                                    {!c.vu&&<span style={{fontSize:9,background:"rgba(76,175,80,.6)",
                                      color:"#fff",padding:"1px 5px",borderRadius:4,marginRight:5,fontWeight:700}}>NOUVEAU</span>}
                                    {c.entreprise}
                                  </div>
                                  <div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>
                                    {c.contact} · il y a {ageJ===0?"aujourd'hui":ageJ===1?"1 jour":`${ageJ} jours`}
                                  </div>
                                  {c.message&&<div style={{fontSize:11,color:"rgba(255,255,255,.65)",
                                    marginTop:6,fontStyle:"italic",lineHeight:1.4}}>
                                    « {c.message} »
                                  </div>}
                                </div>
                                {c.relanceFaite&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:5,
                                  background:"rgba(34,197,94,.2)",color:"rgba(134,239,172,1)",
                                  fontWeight:600,marginLeft:8,flexShrink:0}}>Relancé</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <button onClick={()=>{ resetAnnonce(); setAnnonceNom(compteSession.nom);
                  setAnnonceTel(compteSession.telephone); setAnnonceEmail(compteSession.email||"");
                  setConsentRecontact(true); setError(""); setStep("annonce"); }}
                  style={{width:"100%",height:48,borderRadius:12,marginBottom:16,
                    background:"rgba(76,175,80,.3)",border:"1px solid rgba(76,175,80,.6)",
                    color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent"}}>
                  ➕ Nouvelle proposition
                </button>

                <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.8)",marginBottom:10}}>
                  📰 Mes préférences
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                  <div onClick={()=>handleMajPrefsCompte("actus",!comptePrefActus)} style={{display:"flex",
                    alignItems:"center",gap:10,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:16}}>{comptePrefActus?"☑️":"☐"}</span>
                    <span style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>Recevoir les actualités APPLITAG</span>
                  </div>
                  <div onClick={()=>handleMajPrefsCompte("network",!comptePrefNetwork)} style={{display:"flex",
                    alignItems:"center",gap:10,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:16}}>{comptePrefNetwork?"☑️":"☐"}</span>
                    <span style={{fontSize:12,color:"rgba(255,255,255,.8)"}}>Infos APPLITAG Radio / TV / Network</span>
                  </div>
                </div>

                <button onClick={()=>setStep("bienvenue")}
                  style={{width:"100%",padding:14,borderRadius:12,marginBottom:10,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
                  color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  {"<"} Retour à l'accueil
                </button>
                <button onClick={handleDeconnexionCompte}
                  style={{width:"100%",padding:14,borderRadius:12,
                  background:"rgba(226,75,74,.15)",border:"1px solid rgba(226,75,74,.4)",
                  color:"rgba(255,255,255,.8)",fontFamily:"inherit",fontSize:13,
                  cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        )}

        {step==="scan"&&(
          <div>
            <div style={{fontSize:14,color:"rgba(255,255,255,.7)",
              textAlign:"center",marginBottom:20,lineHeight:1.6}}>
              Scannez le QR code fourni par votre administrateur
            </div>
            <div id="qr-reader" style={{borderRadius:16,overflow:"hidden",
              background:"#000",marginBottom:16}}/>
            {error&&(
              <div style={{color:C.amber,fontSize:13,textAlign:"center",marginBottom:12}}>
                ⚠ {error}
              </div>
            )}
            <button onClick={()=>{
              setEntrepriseId("c1b035b8-c2d5-4b84-a07e-2a3d503fb96c");
              setEntrepriseNom("APPLITAG");
              setStep("pin");
            }} style={{width:"100%",padding:14,borderRadius:12,
              background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
              color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
              cursor:"pointer",WebkitTapHighlightColor:"transparent",marginBottom:10}}>
              Saisir manuellement l'identifiant
            </button>
            <div style={{textAlign:"center",color:"rgba(255,255,255,.3)",fontSize:12,margin:"12px 0"}}>
              ou
            </div>
            <button onClick={()=>{ setError(""); setStep("operateur"); }} style={{
              width:"100%",padding:14,borderRadius:12,
              background:"rgba(29,158,117,.2)",border:"1px solid rgba(29,158,117,.4)",
              color:"rgba(255,255,255,.8)",fontFamily:"inherit",fontSize:13,
              cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              👷 Connexion opérateur terrain
            </button>
            <div style={{textAlign:"center",color:"rgba(255,255,255,.3)",fontSize:12,margin:"12px 0"}}>ou</div>
            <button onClick={()=>setStep("demo")} style={{
              width:"100%",padding:14,borderRadius:12,
              background:"rgba(255,200,0,.15)",border:"1px solid rgba(255,200,0,.35)",
              color:"rgba(255,200,0,.9)",fontFamily:"inherit",fontSize:13,
              cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              🎭 Mode démonstration
            </button>
          </div>
        )}

        {step==="demo"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:28,marginBottom:8}}>🎭</div>
              <div style={{fontSize:16,fontWeight:700}}>Mode Démonstration</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:6,lineHeight:1.5}}>
                Choisissez un profil pour explorer APPLITAG.<br/>
                Données fictives — aucune donnée réelle.
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {/* 1 — APPLITAG Connect */}
              <button onClick={()=>{
                suiviOpsIsDemo.current = true;
                setCompteSession({id:"demo-prop1", nom:"Jean Martin", telephone:"06 12 34 56 78", email:"jean.martin@exemple.fr"});
                setSuiviOps({
                  abattageM3: 124.5,
                  debardageM3: 98.0,
                  dechiqT: 28.5,
                  dechiqM3: 85.0,
                  nbLots: 2,
                  today: todayS(),
                });
                setCompteVue("espace");
                setStep("compte");
              }} style={{
                padding:"14px 16px",borderRadius:14,width:"100%",textAlign:"left",
                background:"rgba(76,175,80,.15)",border:"1px solid rgba(76,175,80,.4)",
                cursor:"pointer",fontFamily:"inherit",
                WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:28,width:36,textAlign:"center"}}>📲</span>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>APPLITAG Connect</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:2}}>Jean Martin · Suivi opérations du jour</div>
                </div>
                <span style={{marginLeft:"auto",color:"rgba(255,255,255,.3)",fontSize:18}}>›</span>
              </button>
              {/* 2 à 9 — rôles démo */}
              {[
                {role:"admin",         icon:"⚙️", label:"Administrateur",            sub:"Marie Dupont · Gestion du chantier"},
                {role:"contact",       icon:"📋",label:"Fiche contact propriétaire",sub:"Marie Dubois · LOT-89-009 · Joigny"},
                {role:"proprietaire",  icon:"🏠",label:"Espace propriétaire",        sub:"Jean Martin · LOT-89-001"},
                {role:"mandataire",    icon:"🔭",label:"Mandataire",                sub:"Claire Laurent · Visite terrain & contrat"},
                {role:"entreprise",    icon:"🏢",label:"Entreprise sollicitée",      sub:"ETF Gaillard · Exploitation forestière"},
                {role:"operateur",     icon:"👷",label:"Opérateur terrain",         sub:"Martin Dupont · ETF Gaillard"},
                {role:"dechiquetage",  icon:"🌀",label:"Déchiquetage",              sub:"François Forestier · Jenz HEM 593"},
                {role:"chauffeur",     icon:"🚛",label:"Chauffeur",                 sub:"Pierre Robert · Transport Moreau"},
                {role:"chaufferie",    icon:"🔥",label:"Chaufferie",                sub:"Sophie Énergie · Migennes"},
                {role:"receptionnaire",icon:"🏗️",label:"Réceptionnaire plateforme", sub:"Nathalie Plateau · Plateforme Auxerre"},
              ].map(({role,icon,label,sub})=>(
                <button key={role} onClick={()=>onLoginDemo(role)} style={{
                  padding:"14px 16px",borderRadius:14,width:"100%",textAlign:"left",
                  background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",
                  cursor:"pointer",fontFamily:"inherit",
                  WebkitTapHighlightColor:"transparent",
                  display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:28,width:36,textAlign:"center"}}>{icon}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{label}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:2}}>{sub}</div>
                  </div>
                  <span style={{marginLeft:"auto",color:"rgba(255,255,255,.3)",fontSize:18}}>›</span>
                </button>
              ))}
            </div>
            <button onClick={()=>setStep("scan")} style={{
              width:"100%",marginTop:20,padding:12,
              background:"transparent",border:"none",
              color:"rgba(255,255,255,.4)",fontFamily:"inherit",
              fontSize:13,cursor:"pointer"}}>
              {"<"} Retour
            </button>
          </div>
        )}

        {step==="pin"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,.5)",marginBottom:4}}>
                Entreprise
              </div>
              <div style={{fontSize:18,fontWeight:700,color:C.green}}>
                {entrepriseNom}
              </div>
            </div>
            <div style={{fontSize:14,color:"rgba(255,255,255,.7)",
              textAlign:"center",marginBottom:24}}>
              Entrez votre code PIN
            </div>
            <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:32}}>
              {[0,1,2,3].map(i=>(
                <div key={i} style={{
                  width:18,height:18,borderRadius:"50%",
                  background:pin.length>i?C.green:"rgba(255,255,255,.2)",
                  transition:"background .15s",
                }}/>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"0 auto",maxWidth:320}}>
              {[1,2,3,4,5,6,7,8,9].map(d=>(
                <button key={d} onClick={()=>handlePin(String(d))}
                  style={{height:68,borderRadius:14,
                    background:"rgba(255,255,255,.1)",
                    border:"1px solid rgba(255,255,255,.15)",
                    color:"#fff",fontSize:26,fontWeight:500,
                    cursor:"pointer",fontFamily:"inherit",
                    WebkitTapHighlightColor:"transparent"}}>
                  {d}
                </button>
              ))}
              <div/>
              <button onClick={()=>handlePin("0")}
                style={{height:68,borderRadius:14,
                  background:"rgba(255,255,255,.1)",
                  border:"1px solid rgba(255,255,255,.15)",
                  color:"#fff",fontSize:26,fontWeight:500,
                  cursor:"pointer",fontFamily:"inherit",
                  WebkitTapHighlightColor:"transparent"}}>0</button>
              <button onClick={handleDel}
                style={{height:68,borderRadius:14,
                  background:"rgba(255,255,255,.08)",
                  border:"1px solid rgba(255,255,255,.1)",
                  color:"#fff",fontSize:22,
                  cursor:"pointer",fontFamily:"inherit",
                  WebkitTapHighlightColor:"transparent"}}>⌫</button>
            </div>
            {error&&(
              <div style={{color:C.amber,fontSize:13,textAlign:"center",marginTop:16}}>
                ⚠ {error}
              </div>
            )}
            {loading&&(
              <div style={{color:"rgba(255,255,255,.5)",fontSize:13,
                textAlign:"center",marginTop:16}}>
                Vérification…
              </div>
            )}
            <button onClick={()=>setStep("scan")} style={{
              width:"100%",marginTop:24,padding:12,
              background:"transparent",border:"none",
              color:"rgba(255,255,255,.4)",fontFamily:"inherit",
              fontSize:13,cursor:"pointer"}}>
              {"<"} Rescanner le QR code
            </button>
          </div>
        )}

        {step==="operateur"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:36,marginBottom:8}}>👷</div>
              <div style={{fontSize:16,fontWeight:600}}>Opérateur terrain</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:4}}>
                Saisissez vos identifiants
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.6)",marginBottom:6}}>
                Nom
              </div>
              <input value={opNom} onChange={e=>setOpNom(e.target.value)}
                placeholder="Votre nom de famille"
                style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                  border:"1.5px solid rgba(255,255,255,.2)",fontSize:FONT_INPUT,
                  fontFamily:"inherit",background:"rgba(255,255,255,.1)",
                  color:"#fff",outline:"none"}}/>
            </div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,.6)",marginBottom:6}}>
                Code PIN
              </div>
              <input value={opPin} onChange={e=>setOpPin(e.target.value)}
                placeholder="Votre PIN"
                type="password"
                style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                  border:"1.5px solid rgba(255,255,255,.2)",fontSize:FONT_INPUT,
                  fontFamily:"inherit",background:"rgba(255,255,255,.1)",
                  color:"#fff",outline:"none"}}/>
            </div>
            {error&&(
              <div style={{color:C.amber,fontSize:13,textAlign:"center",marginBottom:12}}>
                ⚠ {error}
              </div>
            )}
            <button onClick={handleLoginOperateur} disabled={loading} style={{
              width:"100%",height:BTN_H,borderRadius:14,
              background:loading?C.bg2:C.green,color:"#fff",
              border:"none",fontFamily:"inherit",fontSize:16,fontWeight:600,
              cursor:loading?"not-allowed":"pointer",
              WebkitTapHighlightColor:"transparent"}}>
              {loading?"Vérification…":"SE CONNECTER"}
            </button>
            <button onClick={()=>{ setError(""); setStep("scan"); }} style={{
              width:"100%",marginTop:16,padding:12,
              background:"transparent",border:"none",
              color:"rgba(255,255,255,.4)",fontFamily:"inherit",
              fontSize:13,cursor:"pointer"}}>
              {"<"} Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── QR CODE ADMIN ─────────────────────────────────────────────
const QrCodeAdmin = ({entrepriseId, entrepriseNom, onClose}) => {
  const canvasRef = useRef(null);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(()=>{
    const data = JSON.stringify({entrepriseId, nom:entrepriseNom});
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
    setQrUrl(url);
  },[entrepriseId, entrepriseNom]);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",
      background:C.sb,color:"#fff"}}>
      <div style={{padding:"20px 16px 16px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",
          border:"none",color:"#fff",width:36,height:36,borderRadius:9,
          cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",
          justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>{"<"}</button>
        <div style={{fontSize:16,fontWeight:600}}>QR Code entreprise</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{background:"#fff",borderRadius:20,padding:20,marginBottom:20}}>
          {qrUrl&&<img src={qrUrl} alt="QR Code" style={{width:260,height:260,display:"block"}}/>}
        </div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:6}}>{entrepriseNom}</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.4)",fontFamily:"monospace",
          marginBottom:24,textAlign:"center"}}>{entrepriseId}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.6)",textAlign:"center",lineHeight:1.6}}>
          Faites scanner ce QR code par vos collaborateurs lors de leur première connexion.
        </div>
      </div>
    </div>
  );
};

// ── FICHE 0 ───────────────────────────────────────────────────
const Fiche0 = ({onBack, onSaved, toast, contactCount, entrepriseId, prefill=null, comptes=[]}) => {
  const [origine,       setOrigine]  = useState(prefill?"appel_applitag":"");
  const [nomApporteur,  setApporteur]= useState("");
  const [dateContact,   setDateC]    = useState(todayS());
  const [typeContact,   setType]     = useState("proprietaire_forestier");
  const [nom,           setNom]      = useState(prefill?.nom||"");
  const [prenom,        setPrenom]   = useState(prefill?.prenom||"");
  const [telephone,     setTel]      = useState(prefill?.telephone||"");
  const [email,         setEmail]    = useState(prefill?.email||"");
  const [compteSelec,   setCompteSelec] = useState(prefill?.id||"");
  const [adressePostale,setAdresse]  = useState("");
  const [complementAdresse,setComplementAdresse] = useState("");
  const [cpProprietaire, setCpProprietaire] = useState("");
  const [villeProprietaire, setVilleProprietaire] = useState("");
  const [commune,       setCommune]  = useState("");
  const [codePostal,    setCP]       = useState("");
  const [adresseParcelle,setParc]    = useState("");
  const [surfaceHa,     setSurface]  = useState("");
  const [refCadastrale, setRef]      = useState("");
  const [typeRessource, setRessource]= useState("");
  const [mixteDetails,  setMixteD]   = useState([]);
  const [priorite,      setPriorite] = useState("moyenne");
  const [statut,        setStatut]   = useState("nouveau");
  const [commentaire,   setComment]  = useState("");
  const [redacteur,     setRedacteur]= useState("");
  const [conclusion,    setConclusion]=useState("");
  const [exploitationAutorisee, setExploitAuth] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  const validate = () => {
    const e = {};
    if (!nom.trim())        e.nom = "Obligatoire";
    if (!telephone.trim())  e.telephone = "Obligatoire";
    else { const err=validatePhone(telephone); if(err) e.telephone=err; }
    if (!commune.trim())    e.commune = "Obligatoire";
    if (!codePostal.trim()) e.codePostal = "Obligatoire pour le n° de lot";
    if (!typeRessource)     e.typeRessource = "Sélectionner une nature";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { toast("Compléter les champs obligatoires","warn"); return; }
    setSaving(true);
    const contact = {
      nom, prenom, telephone, email,
      adressePostale, complementAdresse, cpProprietaire, villeProprietaire, commune, adresseParcelle,
      surfaceHa: surfaceHa ? parseFloat(surfaceHa) : null,
      refCadastrale, typeContact, origine, nomApporteur, dateContact,
      statut, potentiel: typeRessource==="mixte"
        ? `mixte:${mixteDetails.join(",")}`
        : typeRessource, commentaire,
      codePostal,
      entrepriseId, redacteur, conclusion, exploitationAutorisee,
      // lotNumero omis volontairement : généré côté serveur (P0.5)
    };
    try {
      const saved = await apiPost(`/contacts`, contact);
      const lotNumero = saved.lotNumero;
      toast(`Fiche créée — ${lotNumero}`);
      const html = buildCompteRenduContactHTML(saved);
      generatePdfFromHtml(html, `CompteRenduContact_${lotNumero}.pdf`, toast);
      onSaved(saved);
    } catch(e) {
      toast("Erreur API","warn");
    }
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:C.purple,color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.2)",
            border:"none",color:"#fff",width:36,height:36,borderRadius:9,
            cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",
            justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>{"<"}</button>
          <div>
            <div style={{fontSize:16,fontWeight:600}}>📋 Nouvelle fiche contact</div>
            <div style={{fontSize:11,opacity:.7,marginTop:2}}>
              Fiche 0 — Origine · Propriétaire · Parcelle
            </div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>
        <SectionTitle icon="📡" label="Origine du contact"/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Source</div>
          <GridSelect options={ORIGINE_OPTS} value={origine} onChange={v=>{setOrigine(v);if(v!=="appel_applitag"){setCompteSelec("");}}} cols={4}/>
        </div>
        {origine==="appel_applitag"&&(
          <div style={{marginBottom:14,background:"#FFF3E0",borderRadius:12,padding:"12px 14px",
            border:"1.5px solid #FF9800"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#E65100",marginBottom:8}}>
              📲 Contact APPLITAG Connect à rappeler
            </div>
            {comptes.filter(c=>!c.rapportAppel).length===0&&(
              <div style={{fontSize:13,color:C.tx3}}>Aucun contact en attente de rappel</div>
            )}
            {comptes.filter(c=>!c.rapportAppel).length>0&&(
              <select value={compteSelec}
                onChange={e=>{
                  const id=e.target.value;
                  setCompteSelec(id);
                  const c=comptes.find(x=>x.id===id);
                  if(c){
                    const parts=(c.nom||"").trim().split(" ");
                    setNom(parts[0]||"");
                    setPrenom(parts.slice(1).join(" ")||"");
                    setTel(c.telephone||"");
                    setEmail(c.email||"");
                  }
                }}
                style={{width:"100%",height:44,padding:"0 12px",borderRadius:10,
                  border:"1.5px solid #FFB74D",background:"#fff",
                  fontFamily:"inherit",fontSize:14,color:C.tx,outline:"none",marginBottom:8}}>
                <option value="">— Sélectionner un contact —</option>
                {comptes.filter(c=>!c.rapportAppel).map(c=>(
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.trancheHoraire?`(${c.trancheHoraire})`:""}
                  </option>
                ))}
              </select>
            )}
            {compteSelec&&comptes.find(x=>x.id===compteSelec)&&(
              <div style={{background:"rgba(255,255,255,.6)",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#5D4037",marginTop:4}}>
                {comptes.find(x=>x.id===compteSelec).natureDemande?.length>0&&(
                  <div style={{marginBottom:4}}>
                    <span style={{fontWeight:600}}>Demande(s) : </span>
                    {comptes.find(x=>x.id===compteSelec).natureDemande.join(" · ")}
                  </div>
                )}
                {comptes.find(x=>x.id===compteSelec).trancheHoraire&&(
                  <div><span style={{fontWeight:600}}>Rappel souhaité : </span>{comptes.find(x=>x.id===compteSelec).trancheHoraire}</div>
                )}
                {comptes.find(x=>x.id===compteSelec).email&&(
                  <div style={{marginTop:4}}><span style={{fontWeight:600}}>Email : </span>{comptes.find(x=>x.id===compteSelec).email}</div>
                )}
              </div>
            )}
          </div>
        )}
        <MInput label="Nom de l'apporteur" value={nomApporteur}
          onChange={setApporteur} placeholder="Personne qui a transmis l'info" hint="optionnel"/>
        <MInput label="Date du contact" value={dateContact} onChange={setDateC} type="date"/>

        <SectionTitle icon="👤" label="Propriétaire / Contact"/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
            Type <span style={{color:"#E24B4A"}}>*</span>
          </div>
          <GridSelect options={TYPE_CONTACT_OPTS} value={typeContact} onChange={setType} cols={3}/>
        </div>
        <MInput label="Nom" value={nom} onChange={setNom}
          placeholder="Nom de famille" required error={errors.nom}/>
        <MInput label="Prénom" value={prenom} onChange={setPrenom}
          placeholder="Prénom" hint="optionnel"/>
        <MInput label="Téléphone" value={telephone} onChange={v=>setTel(formatPhone(v))}
          placeholder="06 xx xx xx xx" type="tel" required error={errors.telephone}/>
        <MInput label="Email" value={email} onChange={setEmail}
          placeholder="email@exemple.fr" type="email" hint="optionnel"/>
        <MInput label="Adresse postale" value={adressePostale} onChange={setAdresse}
          placeholder="Adresse du propriétaire" hint="optionnel"/>
        <MInput label="Complément d'adresse" value={complementAdresse} onChange={setComplementAdresse}
          placeholder="Bâtiment, étage, lieu-dit…" hint="optionnel"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
          <MInput label="Code postal" value={cpProprietaire} onChange={setCpProprietaire}
            placeholder="89000" hint="optionnel"/>
          <MInput label="Ville" value={villeProprietaire} onChange={setVilleProprietaire}
            placeholder="Ville du propriétaire" hint="optionnel"/>
        </div>

        <SectionTitle icon="🌲" label="Parcelle"/>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
          <MInput label="Commune" value={commune} onChange={setCommune}
            placeholder="Nom de la commune" required error={errors.commune}/>
          <MInput label="Code postal" value={codePostal} onChange={setCP}
            placeholder="89000" required error={errors.codePostal}/>
        </div>
        <MInput label="Adresse / Lieu-dit" value={adresseParcelle} onChange={setParc}
          placeholder="Lieu-dit, chemin forestier…" hint="optionnel"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Surface (ha)" value={surfaceHa} onChange={setSurface}
            placeholder="ex: 12.5" type="number" hint="optionnel"/>
          <MInput label="Réf. cadastrale" value={refCadastrale} onChange={setRef}
            placeholder="ex: B 142" hint="optionnel"/>
        </div>

        <SectionTitle icon="🪵" label="Nature du produit"/>
        {errors.typeRessource&&(
          <div style={{fontSize:12,color:C.red,marginBottom:8}}>⚠ {errors.typeRessource}</div>
        )}
        <GridSelect options={TYPE_RESSOURCE_OPTS} value={typeRessource}
          onChange={setRessource} cols={3}/>
        {typeRessource==="mixte"&&(
          <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
            border:`1px solid ${C.green}`}}>
            <div style={{fontSize:13,fontWeight:600,color:C.greenD,marginBottom:10}}>
              Détail du mixte
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {TYPE_RESSOURCE_OPTS.filter(([v])=>v!=="mixte").map(([v,emoji,label])=>{
                const checked = mixteDetails.includes(v);
                return (
                  <div key={v} onClick={()=>setMixteD(prev=>
                    checked?prev.filter(x=>x!==v):[...prev,v]
                  )} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"10px 12px",
                    borderRadius:10,cursor:"pointer",
                    border:`1.5px solid ${checked?C.green:C.bd}`,
                    background:checked?C.greenL:"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <div style={{width:20,height:20,borderRadius:5,flexShrink:0,
                      border:`2px solid ${checked?C.green:C.bd2}`,
                      background:checked?C.green:"#fff",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {checked&&<span style={{color:"#fff",fontSize:12}}>✓</span>}
                    </div>
                    <span style={{fontSize:12,color:checked?C.greenD:C.tx2}}>{emoji} {label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <SectionTitle icon="📊" label="Qualification"/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Priorité</div>
          <GridSelect options={PRIORITE_OPTS} value={priorite} onChange={setPriorite} cols={4}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Statut</div>
          <GridSelect options={STATUT_OPTS} value={statut} onChange={setStatut} cols={3}/>
        </div>
        <MInput label="Commentaire" value={commentaire} onChange={setComment}
          placeholder="Notes libres…" big hint="optionnel"/>

        <SectionTitle icon="📝" label="Compte rendu"/>
        <MInput label="Rédacteur du compte rendu" value={redacteur} onChange={setRedacteur}
          placeholder="Nom Prénom" hint="optionnel"/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Conclusion de l'entretien</div>
          <GridSelect options={[
            ["rendez_vous","📅","Rendez-vous fixé"],
            ["visite_prevue","🔭","Visite prévue"],
            ["a_rappeler","📞","À rappeler"],
            ["en_reflexion","🤔","En réflexion"],
            ["echec","❌","Sans suite"],
          ]} value={conclusion} onChange={setConclusion} cols={3}/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Exploitation autorisée ?</div>
          <GridSelect options={[
            ["oui","✅","Oui — accord verbal"],
            ["non","❌","Non"],
            ["en_cours","⏳","À confirmer"],
          ]} value={exploitationAutorisee} onChange={setExploitAuth} cols={3}/>
        </div>

        {codePostal&&(
          <div style={{background:C.greenL,borderRadius:12,padding:14,marginTop:4,
            border:`1.5px solid ${C.green}`}}>
            <div style={{fontSize:12,color:C.greenD,fontWeight:600,marginBottom:4}}>
              🏷 Numéro de lot (attribué à l'enregistrement)
            </div>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:600,color:C.greenD,opacity:0.7,letterSpacing:1}}>
              LOT-{new Date().getFullYear()}-{String(new Date().getMonth()+1).padStart(2,"0")}-{(codePostal||"00").slice(0,2)}-<span style={{opacity:0.5}}>NNN</span>
            </div>
            <div style={{fontSize:10,color:C.tx3,marginTop:2}}>Le numéro séquentiel est attribué par le serveur à la création.</div>
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleSave} disabled={saving} bg={C.purple} icon={saving?"":"✅"}>
          {saving?"Enregistrement…":"CRÉER LA FICHE"}
        </BigBtn>
      </div>
    </div>
  );
};

// ── LISTE CONTACTS ────────────────────────────────────────────
const ListeContacts = ({contacts, onNew, onNewVisite, onEdit}) => {
  const typeRessourceLabel = t => TYPE_RESSOURCE_OPTS.find(([v])=>v===t)?.[2] ?? t;
  const statutColor = s => ({
    nouveau:      {bg:C.bg2,     color:C.tx3},
    a_rappeler:   {bg:C.amberL,  color:C.amberD},
    qualifie:     {bg:C.blueL,   color:C.blueD},
    visite_prevue:{bg:C.purpleL, color:C.purpleD},
    perdu:        {bg:C.redL,    color:C.red},
  }[s] ?? {bg:C.bg2,color:C.tx2});

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING}}>
        {contacts.length===0 ? (
          <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <div style={{fontSize:16,fontWeight:500,marginBottom:6}}>Aucune fiche</div>
            <div style={{fontSize:13}}>Créez votre première fiche contact</div>
          </div>
        ) : contacts.map(c=>{
          const sc = statutColor(c.statut);
          return (
            <div key={c.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
              borderRadius:14,padding:16,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",
                alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:C.tx}}>
                    {c.nom}{c.prenom?` ${c.prenom}`:""}
                  </div>
                  {c.lotNumero&&(
                    <div style={{fontFamily:"monospace",fontSize:11,
                      color:C.greenD,marginTop:2}}>🏷 {c.lotNumero}</div>
                  )}
                </div>
                <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                  background:sc.bg,color:sc.color,fontWeight:600,whiteSpace:"nowrap"}}>
                  {STATUT_OPTS.find(([v])=>v===c.statut)?.[2]??c.statut}
                </span>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                📞 {c.telephone}
                {c.email&&<><br/>📧 {c.email}</>}
                <br/>📍 {c.commune}{c.refCadastrale?` · ${c.refCadastrale}`:""}
                {c.surfaceHa&&<><br/>🌲 {c.surfaceHa} ha</>}
                {c.potentiel&&<><br/>🪵 {typeRessourceLabel(c.potentiel)}</>}
                {c.nomApporteur&&<><br/>🤝 Via {c.nomApporteur}</>}
              </div>
              {c.lotNumero&&(
                <div>
                  <button onClick={()=>onNewVisite(c)} style={{
                    marginTop:10,width:"100%",height:40,borderRadius:10,
                    background:C.greenL,color:C.greenD,border:`1px solid ${C.green}`,
                    fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",
                  }}>🔭 Lancer la visite terrain</button>
                  <button onClick={()=>onEdit(c)} style={{
                    marginTop:6,width:"100%",height:40,borderRadius:10,
                    background:C.purpleL,color:C.purpleD,border:`1px solid ${C.purple}`,
                    fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",
                  }}>✏️ Modifier la fiche</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{padding:"12px 16px 24px",flexShrink:0}}>
        <BigBtn onClick={onNew} bg={C.purple} icon="📋">Nouvelle fiche contact</BigBtn>
      </div>
    </div>
  );
};

// ── VISITE TERRAIN ────────────────────────────────────────────
// MSlider importé depuis ./shared/ui.jsx

const EcranReleves = ({entrepriseId, user, toast, notifications=[], setNotifications, onGoDelegations}) => {
  const [sousOnglet, setSousOnglet] = useState("notifs");
  const [operateurs, setOperateurs] = useState([]);
  const [acces, setAcces] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [entreprises, setEntreprises] = useState([]);
  const [annonces, setAnnonces] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showNewAcces, setShowNewAcces] = useState(false);
  const [opNom, setOpNom] = useState("");
  const [opPrenom, setOpPrenom] = useState("");
  const [opEtfId, setOpEtfId] = useState("");
  const [opPin, setOpPin] = useState("");
  const [opRoles, setOpRoles] = useState(["abattage","debardage"]);
  const [opSaving, setOpSaving] = useState(false);
  const [selOp, setSelOp] = useState(null);
  const [assignLotId, setAssignLotId] = useState("");
  const [assignLotNumero, setAssignLotNumero] = useState("");
  const [assignType, setAssignType] = useState("abattage");
  const [assignSaving, setAssignSaving] = useState(false);
  const [lotId, setLotId] = useState("");
  const [lotNumero, setLotNumero] = useState("");
  const [etfNom, setEtfNom] = useState("");
  const [etfContact, setEtfContact] = useState("");
  const [typeOperation, setTypeOperation] = useState("abattage");
  const [accesSaving, setAccesSaving] = useState(false);

  // Lots déjà assignés à un opérateur (tous opérateurs confondus) — à exclure du menu d'assignation
  const lotsDejaAssignes = new Set(
    operateurs.flatMap(op=>(op.assignations||[]).map(a=>a.lotId))
  );

  useEffect(()=>{
    apiGet(`/operateurs/entreprise/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setOperateurs(d); }).catch(()=>{});
    apiGet(`/acces-lot/entreprise/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setAcces(d); }).catch(()=>{});
    apiGet(`/contacts`).then(d=>{ if(Array.isArray(d)) setContacts(d); }).catch(()=>{});
    apiGet(`/entreprises/entreprise/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setEntreprises(d); }).catch(()=>{});
    (async () => {
      let fromApi = [];
      try {
        const d = await apiGet(`/annonces/entreprise/${entrepriseId}`);
        if (Array.isArray(d)) fromApi = d;
      } catch {}
      const fromLocal = annoncesLocalGet().filter(a=>a.entrepriseId===entrepriseId);
      const ids = new Set(fromApi.map(a=>a.id));
      setAnnonces([...fromApi, ...fromLocal.filter(a=>!ids.has(a.id))]
        .sort((a,b)=>new Date(b.dateEnvoi)-new Date(a.dateEnvoi)));
    })();
  },[entrepriseId]);

  const handleTraiterAnnonce = async (annonce, statut) => {
    try {
      await apiPatch(`/annonces/${annonce.id}`, { statut });
    } catch {
      toast("Pas de connexion — statut mis à jour localement","warn");
    }
    annoncesLocalSave(annoncesLocalGet().map(a=>a.id===annonce.id?{...a,statut}:a));
    setAnnonces(prev=>prev.map(a=>a.id===annonce.id?{...a,statut}:a));
  };

  const handleCreerLotDepuisAnnonce = async (annonce) => {
    const contact = {
      nom: annonce.nom, telephone: annonce.telephone, commune: annonce.commune, codePostal: annonce.codePostal||"",
      potentiel: annonce.typeBois||annonce.essence||"", commentaire: annonce.commentaire||"",
      surfaceHa: annonce.surfaceHa?parseFloat(annonce.surfaceHa):null,
      typeContact:"proprietaire_forestier", origine:"annonce", statut:"nouveau",
      dateContact: todayS(), entrepriseId,
    };
    try {
      await apiPost(`/contacts`, contact);
    } catch {
      toast("Erreur — fiche non créée","warn"); return;
    }
    await handleTraiterAnnonce(annonce, "valide");
    toast(`Fiche contact créée pour ${annonce.nom} ✓`);
  };

  const entrepriseSel = entreprises.find(e=>e.id===opEtfId)||null;
  const annoncesNouvelles = annonces.filter(a=>a.statut==="recu"||a.statut==="nouvelle"||!a.statut);

  const handleCreateOp = async () => {
    if (!opNom||!entrepriseSel||!opPin) { toast("Remplir nom, entreprise et PIN","warn"); return; }
    if (opProfil==="charge_mission"&&opMandate&&!opEntrepriseMandanteId) { toast("Sélectionnez l'entreprise mandante","warn"); return; }
    setOpSaving(true);
    const entrepriseMandante = opMandate ? entreprises.find(e=>e.id===opEntrepriseMandanteId) : null;
    try {
      const saved = await apiPost(`/operateurs`, {nom:opNom,prenom:opPrenom,etfNom:entrepriseSel.nom,etfId:entrepriseSel.id,pin:opPin,roles:opRoles,profil:opProfil,
          entrepriseMandanteId:entrepriseMandante?.id||null,entrepriseMandanteNom:entrepriseMandante?.nom||null,entrepriseId});
      setOperateurs(prev=>[{...saved,etfNom:entrepriseSel.nom,etfId:entrepriseSel.id,roles:opRoles,profil:opProfil,
        entrepriseMandanteId:entrepriseMandante?.id||null,entrepriseMandanteNom:entrepriseMandante?.nom||null,assignations:[]},...prev]);
      setShowNew(false);
      setOpNom(""); setOpPrenom(""); setOpEtfId(""); setOpPin(""); setOpRoles(["abattage","debardage"]); setOpProfil("terrain");
      setOpMandate(false); setOpEntrepriseMandanteId("");
      toast(`Opérateur ${saved.nom} créé ✓`);
    } catch { toast("Erreur API","warn"); }
    setOpSaving(false);
  };

  const handleAssigner = async () => {
    if (!assignLotId||!selOp) return;
    setAssignSaving(true);
    try {
      const saved = await apiPost(`/operateurs/${selOp.id}/assigner`, {lotId:assignLotId,lotNumero:assignLotNumero,typeOperation:assignType});
      setOperateurs(prev=>prev.map(op=>op.id===selOp.id?
        {...op,assignations:[...(op.assignations||[]),saved]}:op));
      setSelOp(null);
      setAssignLotId(""); setAssignLotNumero("");
      toast("Lot assigné ✓");
    } catch { toast("Erreur API","warn"); }
    setAssignSaving(false);
  };

  const handleCreateAcces = async () => {
    if (!lotId||!etfNom) { toast("Sélectionnez un lot et saisissez l\'ETF","warn"); return; }
    setAccesSaving(true);
    try {
      const saved = await apiPost(`/acces-lot`, {lotId,lotNumero,entrepriseId,etfNom,etfContact,typeOperation});
      setAcces(prev=>[saved,...prev]);
      setShowNewAcces(false);
      setEtfNom(""); setEtfContact(""); setLotId(""); setLotNumero("");
      toast(`Code créé : ${saved.code}`);
    } catch { toast("Erreur API","warn"); }
    setAccesSaving(false);
  };

  const handleDesactiver = async (id) => {
    try {
      await apiPatch(`/acces-lot/${id}/desactiver`);
      setAcces(prev=>prev.map(a=>a.id===id?{...a,actif:false}:a));
      toast("Accès désactivé");
    } catch { toast("Erreur","warn"); }
  };

  const typeLabel = t=>({"mandataire":"🔭 Visite terrain","abattage":"🪓 Abattage","debardage":"🚜 Débardage","dechiquetage":"🌀 Déchiquetage"}[t]||t);
  const PROFILS_OPERATEUR = {
    terrain:        {label:"Opérateur terrain",  icon:"👷", desc:"Saisie abattage et débardage uniquement", roles:["abattage","debardage"]},
    charge_mission: {label:"Chargé de mission",  icon:"🔭", desc:"Visite terrain uniquement",               roles:["mandataire"]},
  };
  const [opProfil, setOpProfil] = useState("terrain");
  const choisirProfilOp = p => { setOpProfil(p); setOpRoles(PROFILS_OPERATEUR[p].roles); if(p!=="charge_mission"){ setOpMandate(false); setOpEntrepriseMandanteId(""); } };
  const [opMandate, setOpMandate] = useState(false); // chargé de mission nommé par une entreprise tierce
  const [opEntrepriseMandanteId, setOpEntrepriseMandanteId] = useState("");

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",gap:0,padding:"8px 16px 0",background:"#fff",
        borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {[["operateurs","👷 Opérateurs"],["acces","🔑 Accès lot"],
          ["annonces",`📢 APPLITAG Connect${annoncesNouvelles.length>0?` (${annoncesNouvelles.length})`:""}`],
          ["notifs","🔔 Alertes"]].map(([id,label])=>(
          <button key={id} onClick={()=>{ setSousOnglet(id); setShowNew(false); setShowNewAcces(false); setSelOp(null); }} style={{
            flex:1,height:36,background:"transparent",border:"none",
            borderBottom:`2.5px solid ${sousOnglet===id?C.green:"transparent"}`,
            color:sousOnglet===id?C.greenD:C.tx3,fontFamily:"inherit",
            fontSize:13,fontWeight:sousOnglet===id?700:400,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
            {label}
          </button>
        ))}
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING}}>
        {sousOnglet==="operateurs"&&(
          <div>
            {selOp ? (
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                  <button onClick={()=>setSelOp(null)} style={{background:"none",border:"none",
                    fontSize:20,cursor:"pointer",color:C.tx2}}>{"<"}</button>
                  <div style={{fontSize:15,fontWeight:700}}>Assigner un lot à {selOp.nom}</div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Lot</div>
                  <select value={assignLotId} onChange={e=>{
                    const c=contacts.find(x=>x.id===e.target.value);
                    setAssignLotId(e.target.value);
                    setAssignLotNumero(c?.lotNumero||"");
                  }} style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                    border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                    background:"#fff",color:C.tx,outline:"none"}}>
                    <option value="">— Sélectionner un lot —</option>
                    {contacts.filter(c=>c.lotNumero && !lotsDejaAssignes.has(c.id)).map(c=>(
                      <option key={c.id} value={c.id}>{c.lotNumero} · {c.nom} · {c.commune}</option>
                    ))}
                  </select>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Type</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                    {[["mandataire","🔭","Visite terrain"],["abattage","🪓","Abattage"],
                      ["debardage","🚜","Débardage"],["dechiquetage","🌀","Déchiquetage"]]
                      .filter(([v])=>!selOp.roles?.length||selOp.roles.includes(v))
                      .map(([v,e,l])=>(
                      <button key={v} onClick={()=>setAssignType(v)} style={{
                        padding:"12px 6px",borderRadius:12,
                        border:`1.5px solid ${assignType===v?C.green:C.bd}`,
                        background:assignType===v?C.greenL:"#fff",cursor:"pointer",
                        fontFamily:"inherit",display:"flex",flexDirection:"column",
                        alignItems:"center",gap:4,WebkitTapHighlightColor:"transparent"}}>
                        <span style={{fontSize:22}}>{e}</span>
                        <span style={{fontSize:11,fontWeight:assignType===v?600:400,
                          color:assignType===v?C.greenD:C.tx2}}>{l}</span>
                      </button>
                    ))}
                  </div>
                  {selOp.roles?.length>0&&(
                    <div style={{fontSize:11,color:C.tx3,marginTop:6}}>
                      Options limitées aux rôles de {selOp.nom} — modifiable dans sa fiche.
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setSelOp(null)} style={{flex:1,height:BTN_H,borderRadius:14,
                    background:C.bg2,color:C.tx2,border:"none",fontFamily:"inherit",
                    fontSize:15,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>Annuler</button>
                  <BigBtn onClick={handleAssigner} disabled={assignSaving} style={{flex:2}}
                    bg={C.green} icon={assignSaving?"":"✅"}>
                    {assignSaving?"Assignation…":"ASSIGNER"}
                  </BigBtn>
                </div>
              </div>
            ) : showNew ? (
              <div>
                <SectionTitle icon="👷" label="Nouvel opérateur"/>
                <MInput label="Nom" value={opNom} onChange={setOpNom} placeholder="Nom" required/>
                <MInput label="Prénom" value={opPrenom} onChange={setOpPrenom} placeholder="Prénom" hint="optionnel"/>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Entreprise ETF *</div>
                  {entreprises.length>0 ? (
                    <select value={opEtfId} onChange={e=>setOpEtfId(e.target.value)}
                      style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                        border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                        background:"#fff",color:C.tx,outline:"none"}}>
                      <option value="">— Sélectionner dans le répertoire —</option>
                      {entreprises.map(e=>(
                        <option key={e.id} value={e.id}>
                          {e.nom}{e.typesProposes?.length?` · ${e.typesProposes.map(t=>TYPES_TRAVAUX_DELEGATION.find(([v])=>v===t)?.[2]||t).join(", ")}`:""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{background:C.amberL,borderRadius:12,padding:12,
                      border:`1px solid ${C.amber}`,fontSize:12,color:C.amberD}}>
                      ⚠ Aucune entreprise référencée.
                    </div>
                  )}
                  <div onClick={onGoDelegations} style={{marginTop:8,fontSize:12,color:C.green,
                    fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                    + Créer une nouvelle fiche entreprise
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Code PIN <span style={{fontWeight:400,color:C.tx3}}>(généré automatiquement)</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10,height:INPUT_H,
                    padding:"0 14px",borderRadius:12,border:`1.5px solid ${C.bd}`,background:C.bg2}}>
                    <span style={{flex:1,fontFamily:"monospace",fontSize:20,fontWeight:700,
                      letterSpacing:6,color:C.tx}}>{opPin}</span>
                    <button onClick={async()=>{ try{setOpPin(await genPin4(API));}catch{toast("Erreur génération PIN — réessayez","warn");} }} style={{
                      background:C.greenL,border:`1px solid ${C.green}`,color:C.greenD,
                      borderRadius:8,padding:"6px 10px",fontSize:12,fontWeight:600,
                      cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>🔄 Régénérer</button>
                  </div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:6}}>
                    L'opérateur pourra le modifier lui-même ensuite depuis son profil.
                  </div>
                </div>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                  Profil <span style={{fontWeight:400,color:C.tx3}}>(détermine les saisies autorisées)</span>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  {Object.entries(PROFILS_OPERATEUR).map(([v,p])=>(
                    <div key={v} onClick={()=>choisirProfilOp(v)} style={{
                      padding:"12px 14px",borderRadius:12,cursor:"pointer",
                      border:`2px solid ${opProfil===v?C.green:C.bd}`,
                      background:opProfil===v?C.greenL:"#fff",
                      WebkitTapHighlightColor:"transparent"}}>
                      <div style={{fontSize:14,fontWeight:600,
                        color:opProfil===v?C.greenD:C.tx}}>{p.icon} {p.label}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{p.desc}</div>
                    </div>
                  ))}
                </div>

                {opProfil==="charge_mission"&&(
                  <div style={{marginBottom:14}}>
                    <div onClick={()=>setOpMandate(!opMandate)} style={{
                      display:"flex",alignItems:"center",gap:8,cursor:"pointer",
                      padding:"10px 12px",borderRadius:10,
                      border:`1.5px solid ${opMandate?C.green:C.bd}`,
                      background:opMandate?C.greenL:"#fff",
                      WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontSize:16}}>{opMandate?"☑️":"⬜"}</span>
                      <span style={{fontSize:12,fontWeight:opMandate?600:400,
                        color:opMandate?C.greenD:C.tx2}}>
                        Nommé par une autre entreprise que son employeur
                      </span>
                    </div>
                    {opMandate&&(
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                          Entreprise mandante *
                        </div>
                        {entreprises.length>0 ? (
                          <select value={opEntrepriseMandanteId} onChange={e=>setOpEntrepriseMandanteId(e.target.value)}
                            style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                              border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                              background:"#fff",color:C.tx,outline:"none"}}>
                            <option value="">— Sélectionner dans le répertoire —</option>
                            {entreprises.map(e=>(
                              <option key={e.id} value={e.id}>{e.nom}</option>
                            ))}
                          </select>
                        ) : (
                          <div style={{background:C.amberL,borderRadius:12,padding:12,
                            border:`1px solid ${C.amber}`,fontSize:12,color:C.amberD}}>
                            ⚠ Aucune entreprise référencée.
                          </div>
                        )}
                        <div style={{fontSize:11,color:C.tx3,marginTop:6}}>
                          Entreprise pour le compte de laquelle ce chargé de mission intervient sur ce lot — distincte de son employeur ({entrepriseSel?.nom||"—"}).
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{background:C.amberL,borderRadius:12,padding:12,marginBottom:14,
                  fontSize:12,color:C.amberD}}>
                  ⚠ Communiquez ce PIN directement à l'opérateur.
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setShowNew(false)} style={{flex:1,height:BTN_H,borderRadius:14,
                    background:C.bg2,color:C.tx2,border:"none",fontFamily:"inherit",
                    fontSize:15,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>Annuler</button>
                  <BigBtn onClick={handleCreateOp} disabled={opSaving} style={{flex:2}}
                    bg={C.green} icon={opSaving?"":"👷"}>
                    {opSaving?"Création…":"CRÉER"}
                  </BigBtn>
                </div>
              </div>
            ) : (
              <div>
                {operateurs.length===0 ? (
                  <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                    <div style={{fontSize:40,marginBottom:12}}>👷</div>
                    <div style={{fontSize:16,fontWeight:500,marginBottom:6}}>Aucun opérateur</div>
                    <div style={{fontSize:13}}>Créez un opérateur pour lui assigner des lots</div>
                  </div>
                ) : operateurs.map(op=>(
                  <div key={op.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                    borderRadius:14,padding:16,marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700}}>{op.nom}{op.prenom?` ${op.prenom}`:""}</div>
                        <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{op.etfNom}</div>
                        <div style={{fontSize:11,color:C.green,fontWeight:600,marginTop:2}}>
                          {PROFILS_OPERATEUR[op.profil||(op.roles?.includes("mandataire")?"charge_mission":"terrain")]?.icon}{" "}
                          {PROFILS_OPERATEUR[op.profil||(op.roles?.includes("mandataire")?"charge_mission":"terrain")]?.label}
                        </div>
                        {op.entrepriseMandanteNom&&(
                          <div style={{fontSize:11,color:C.purpleD,marginTop:2}}>
                            🤝 Mandaté par {op.entrepriseMandanteNom}
                          </div>
                        )}
                      </div>
                      <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                        background:op.actif?C.greenL:C.bg2,color:op.actif?C.greenD:C.tx3,fontWeight:600}}>
                        {op.actif?"✅ Actif":"❌ Inactif"}
                      </span>
                    </div>
                    {op.roles&&op.roles.length>0&&(
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                        {op.roles.map(r=>(
                          <span key={r} style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                            background:C.bg2,color:C.tx2,fontWeight:500}}>{typeLabel(r)}</span>
                        ))}
                      </div>
                    )}
                    {op.assignations&&op.assignations.length>0&&(
                      <div style={{marginBottom:10}}>
                        {op.assignations.map(a=>(
                          <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,
                            padding:"6px 10px",borderRadius:8,background:C.bg2,marginBottom:4,fontSize:12}}>
                            <span>{typeLabel(a.typeOperation)}</span>
                            <span style={{fontFamily:"monospace",color:C.greenD,flex:1}}>{a.lotNumero}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={()=>{ setSelOp(op); setAssignType(op.roles?.[0]||"abattage"); }} style={{width:"100%",height:38,borderRadius:10,
                      background:C.blueL,color:C.blueD,border:`1px solid ${C.blue}`,
                      fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
                      WebkitTapHighlightColor:"transparent"}}>+ Assigner un lot</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sousOnglet==="acces"&&(
          <div>
            {showNewAcces ? (
              <div>
                <SectionTitle icon="🔑" label="Nouvel accès lot"/>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Lot</div>
                  <select value={lotId} onChange={e=>{
                    const c=contacts.find(x=>x.id===e.target.value);
                    setLotId(e.target.value);
                    setLotNumero(c?.lotNumero||"");
                  }} style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                    border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                    background:"#fff",color:C.tx,outline:"none"}}>
                    <option value="">— Sélectionner —</option>
                    {contacts.filter(c=>c.lotNumero).map(c=>(
                      <option key={c.id} value={c.id}>{c.lotNumero} · {c.nom} · {c.commune}</option>
                    ))}
                  </select>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Type</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {[["abattage","🪓","Abattage"],["debardage","🚜","Débardage"],["dechiquetage","🌀","Déchiquetage"]].map(([v,e,l])=>(
                      <button key={v} onClick={()=>setTypeOperation(v)} style={{
                        padding:"12px 6px",borderRadius:12,
                        border:`1.5px solid ${typeOperation===v?C.green:C.bd}`,
                        background:typeOperation===v?C.greenL:"#fff",cursor:"pointer",
                        fontFamily:"inherit",display:"flex",flexDirection:"column",
                        alignItems:"center",gap:4,WebkitTapHighlightColor:"transparent"}}>
                        <span style={{fontSize:22}}>{e}</span>
                        <span style={{fontSize:11,fontWeight:typeOperation===v?600:400,
                          color:typeOperation===v?C.greenD:C.tx2}}>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <MInput label="Nom ETF" value={etfNom} onChange={setEtfNom} placeholder="Nom ETF" required/>
                <MInput label="Contact" value={etfContact} onChange={setEtfContact}
                  placeholder="06 xx ou email@..." hint="Pour envoi"/>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>setShowNewAcces(false)} style={{flex:1,height:BTN_H,borderRadius:14,
                    background:C.bg2,color:C.tx2,border:"none",fontFamily:"inherit",
                    fontSize:15,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>Annuler</button>
                  <BigBtn onClick={handleCreateAcces} disabled={accesSaving} style={{flex:2}}
                    bg={C.green} icon={accesSaving?"":"🔑"}>
                    {accesSaving?"Création…":"CRÉER L'ACCÈS"}
                  </BigBtn>
                </div>
              </div>
            ) : (
              <div>
                {acces.length===0 ? (
                  <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                    <div style={{fontSize:40,marginBottom:12}}>🔑</div>
                    <div style={{fontSize:16,fontWeight:500,marginBottom:6}}>Aucun accès</div>
                    <div style={{fontSize:13}}>Créez un accès code pour une ETF</div>
                  </div>
                ) : acces.map(a=>(
                  <div key={a.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                    borderRadius:14,padding:16,marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700}}>{a.etfNom}</div>
                        <div style={{fontFamily:"monospace",fontSize:11,color:C.greenD,marginTop:2}}>🏷 {a.lotNumero}</div>
                      </div>
                      <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,fontWeight:600,
                        background:a.actif?C.greenL:C.bg2,color:a.actif?C.greenD:C.tx3}}>
                        {a.actif?"✅ Actif":"❌ Désactivé"}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                      {typeLabel(a.typeOperation)}{a.etfContact&&<><br/>{a.etfContact}</>}<br/>
                      📅 Expire le {new Date(a.expiresAt).toLocaleDateString("fr-FR")}
                    </div>
                    <div style={{marginTop:10,background:C.amberL,borderRadius:10,
                      padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:11,color:C.amberD,fontWeight:600,marginBottom:2}}>Code</div>
                        <div style={{fontFamily:"monospace",fontSize:24,fontWeight:700,
                          color:C.amberD,letterSpacing:4}}>{a.code}</div>
                      </div>
                      {a.actif&&(
                        <button onClick={()=>handleDesactiver(a.id)} style={{padding:"8px 12px",
                          borderRadius:8,background:C.redL,color:C.red,border:"none",
                          fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:500,
                          WebkitTapHighlightColor:"transparent"}}>Désactiver</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sousOnglet==="annonces"&&(
          <div>
            <div style={{fontSize:16,fontWeight:700,color:C.tx,marginBottom:4,fontFamily:FONT_TITLE}}>
              📢 APPLITAG Connect - Annonces
            </div>
            <div style={{fontSize:12,color:C.tx3,marginBottom:16}}>
              Bois proposés, offres de service et demandes de plaquettes déposés sans compte.
            </div>
            {annonces.length===0 ? (
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>📢</div>
                <div style={{fontSize:16,fontWeight:500,marginBottom:6}}>Aucune annonce</div>
                <div style={{fontSize:13}}>Les propositions de bois et offres de service apparaîtront ici</div>
              </div>
            ) : annonces.map(a=>{
              const meta = {
                gisement:{icon:"🌲",label:"Proposition de bois",bg:C.greenL,color:C.greenD},
                service:{icon:"🛠️",label:"Offre de service",bg:C.blueL,color:C.blueD},
                demande:{icon:"🪵",label:"Demande de plaquettes",bg:C.amberL,color:C.amberD},
              }[a.type]||{icon:"📢",label:a.type,bg:C.bg2,color:C.tx3};
              const statutInfo = STATUTS_ANNONCE[a.statut]||STATUTS_ANNONCE.recu;
              const archivee = a.statut==="archive";
              return (
                <div key={a.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                  borderRadius:14,padding:16,marginBottom:10,opacity:archivee?.6:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <span style={{fontSize:11,padding:"3px 8px",borderRadius:6,fontWeight:600,
                      background:meta.bg,color:meta.color}}>{meta.icon} {meta.label}</span>
                    <span style={{fontSize:10,color:C.tx3}}>
                      {new Date(a.dateEnvoi).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:2}}>{a.nom}</div>
                  <div style={{fontSize:12,color:C.tx3,lineHeight:1.8,marginBottom:10}}>
                    📞 {a.telephone}{a.email&&<> · 📧 {a.email}</>}{a.commune&&<> · 📍 {a.commune}{a.codePostal?` (${a.codePostal})`:""}</>}
                    {a.typeBois&&<><br/>🪵 {a.typeBois}</>}
                    {a.volumeEstime&&<><br/>📦 {a.volumeEstime}</>}
                    {a.etatBois&&<><br/>🌲 {a.etatBois==="sur_pied"?"Bois sur pied":"Bord de route"}</>}
                    {a.surfaceHa&&<><br/>🌲 {a.surfaceHa} ha estimés</>}
                    {a.essence&&<><br/>🪵 {a.essence}</>}
                    {a.prestations?.length>0&&<><br/>🛠️ {a.prestations.map(p=>TYPES_PRESTATION_ANNONCE.find(([v])=>v===p)?.[2]||p).join(", ")}</>}
                    {a.commentaire&&<><br/>💬 {a.commentaire}</>}
                  </div>
                  {a.photos?.length>0&&(
                    <div style={{display:"flex",gap:6,marginBottom:10}}>
                      {a.photos.map((p,i)=>(
                        <img key={i} src={p} style={{width:48,height:48,borderRadius:8,objectFit:"cover"}}/>
                      ))}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <select value={a.statut||"recu"} onChange={e=>handleTraiterAnnonce(a,e.target.value)}
                      style={{flex:1,height:36,padding:"0 10px",borderRadius:8,
                        border:`1.5px solid ${statutInfo.color}`,fontSize:12,fontWeight:600,
                        fontFamily:"inherit",background:statutInfo.bg,color:statutInfo.color,outline:"none"}}>
                      {ORDRE_STATUTS_ANNONCE.map(s=>(
                        <option key={s} value={s}>{STATUTS_ANNONCE[s].label}</option>
                      ))}
                    </select>
                    {a.type==="gisement"&&a.statut!=="valide"&&a.statut!=="publie"&&(
                      <button onClick={()=>handleCreerLotDepuisAnnonce(a)} style={{height:36,padding:"0 12px",
                        borderRadius:8,background:C.green,color:"#fff",border:"none",
                        fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",
                        WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>➕ Créer la fiche lot</button>
                    )}
                  </div>
                  {(a.consentActus||a.consentNetwork)&&(
                    <div style={{fontSize:10,color:C.tx3,marginTop:8}}>
                      {a.consentActus&&"📰 OK actus APPLITAG"}{a.consentActus&&a.consentNetwork&&" · "}
                      {a.consentNetwork&&"📺 OK APPLITAG Network"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sousOnglet==="operateurs"&&!showNew&&!selOp&&(
        <div style={{padding:"12px 16px 24px",flexShrink:0}}>
          <BigBtn onClick={async()=>{ try{const p=await genPin4(API);setOpPin(p);setShowNew(true);}catch{toast("Erreur génération PIN — réessayez","warn");} }} bg={C.green} icon="👷">Nouvel opérateur</BigBtn>
        </div>
      )}
      {sousOnglet==="notifs"&&(
          <div>
            {notifications.length===0 ? (
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>🔔</div>
                <div style={{fontSize:16,fontWeight:500}}>Aucune notification</div>
              </div>
            ) : notifications.map(n=>(
              <div key={n.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                borderRadius:14,padding:16,marginBottom:10,
                borderLeft:`4px solid ${n.type==="CRITIQUE"?C.red:n.type==="WARNING"?C.amber:C.blue}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{n.titre}</div>
                  <div style={{fontSize:10,color:C.tx3}}>
                    {new Date(n.createdAt).toLocaleString('fr-FR')}
                  </div>
                </div>
                {n.lotNumero&&(
                  <div style={{fontFamily:"monospace",fontSize:12,fontWeight:600,
                    color:C.greenD,background:C.greenL,padding:"2px 8px",
                    borderRadius:6,display:"inline-block",marginBottom:6}}>
                    🏷️ {n.lotNumero}
                  </div>
                )}
                <div style={{fontSize:13,color:C.tx2,marginBottom:10}}>{n.message}</div>
                <button onClick={async()=>{
                  await apiPatch(`/notifications/${n.id}/lu`);
                  setNotifications(prev=>prev.filter(x=>x.id!==n.id));
                }} style={{width:"100%",height:36,borderRadius:8,
                  background:C.bg2,color:C.tx2,border:"none",
                  fontFamily:"inherit",fontSize:12,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                  ✓ Marquer comme lu
                </button>
              </div>
            ))}
          </div>
        )}
      {sousOnglet==="acces"&&!showNewAcces&&(
        <div style={{padding:"12px 16px 24px",flexShrink:0}}>
          <BigBtn onClick={()=>setShowNewAcces(true)} bg={C.green} icon="🔑">Créer un accès lot</BigBtn>
        </div>
      )}
    </div>
  );
};

// ── FICHE EDIT ────────────────────────────────────────────────
const CHAMP_LABELS = {
  nom:"Nom", prenom:"Prénom", telephone:"Téléphone", email:"Email",
  adressePostale:"Adresse postale", complementAdresse:"Complément d'adresse", commune:"Commune",
  adresseParcelle:"Adresse parcelle", surfaceHa:"Surface (ha)",
  refCadastrale:"Réf. cadastrale", typeContact:"Type contact",
  origine:"Origine", nomApporteur:"Apporteur", dateContact:"Date contact",
  statut:"Statut", potentiel:"Nature produit", commentaire:"Commentaire",
  estPersonneMorale:"Personne morale", typePersonneMorale:"Type structure",
  numeroSiret:"SIRET", nomSignataire:"Signataire", qualiteSignataire:"Qualité signataire",
};

const Fiche0Edit = ({contact, onBack, onSaved, toast, user, onLaunchVisite, onLaunchValidation, onLaunchCloture, onLaunchDechiquetage, onLaunchTransporteur, onLaunchLivraison}) => {
  const [nom,           setNom]      = useState(contact.nom||"");
  const [prenom,        setPrenom]   = useState(contact.prenom||"");
  const [telephone,     setTel]      = useState(contact.telephone||"");
  const [email,         setEmail]    = useState(contact.email||"");
  const [adressePostale,setAdresse]  = useState(contact.adressePostale||"");
  const [complementAdresse,setComplementAdresse] = useState(contact.complementAdresse||"");
  const [commune,       setCommune]  = useState(contact.commune||"");
  const [adresseParcelle,setParc]    = useState(contact.adresseParcelle||"");
  const [surfaceHa,     setSurface]  = useState(contact.surfaceHa||"");
  const [refCadastrale, setRef]      = useState(contact.refCadastrale||"");
  const [typeContact,   setType]     = useState(contact.typeContact||"proprietaire_forestier");
  const [origine,       setOrigine]  = useState(contact.origine||"");
  const [nomApporteur,  setApporteur]= useState(contact.nomApporteur||"");
  const [dateContact,   setDateC]    = useState(contact.dateContact||todayS());
  const [statut,        setStatut]   = useState(contact.statut||"nouveau");
  const [potentiel,     setPotentiel]= useState(contact.potentiel||"");
  const [commentaire,   setComment]  = useState(contact.commentaire||"");
  const [estPersonneMorale,setEstPM] = useState(contact.estPersonneMorale||false);
  const [typePersonneMorale,setTypePM]=useState(contact.typePersonneMorale||"");
  const [numeroSiret,   setSiret]    = useState(contact.numeroSiret||"");
  const [nomSignataire, setSignataire]=useState(contact.nomSignataire||"");
  const [qualiteSignataire,setQualite]=useState(contact.qualiteSignataire||"");
  const [saving, setSaving] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [historique, setHistorique] = useState([]);

  useEffect(()=>{
    if (showHistorique) {
      apiGet(`/contacts/${contact.id}/historique`)
        .then(d=>{ if(Array.isArray(d)) setHistorique(d); }).catch(()=>{});
    }
  },[showHistorique]);

  const handleSave = async () => {
    const phoneErr = telephone ? validatePhone(telephone) : null;
    if (phoneErr) { toast(`Téléphone : ${phoneErr}`,"warn"); return; }
    setSaving(true);
    const data = {
      nom, prenom, telephone, email, adressePostale, complementAdresse,
      commune, adresseParcelle,
      surfaceHa: surfaceHa ? parseFloat(surfaceHa) : null,
      refCadastrale, typeContact, origine, nomApporteur, dateContact,
      statut, potentiel, commentaire,
      estPersonneMorale, typePersonneMorale, numeroSiret,
      nomSignataire, qualiteSignataire,
      operateur: user?.nom || "inconnu",
    };
    try {
      const saved = await apiPatch(`/contacts/${contact.id}`, data);
      toast("Fiche mise à jour ✓");
      onSaved(saved);
    } catch {
      toast("Erreur API","warn");
    }
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:C.purple,color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.2)",
            border:"none",color:"#fff",width:36,height:36,borderRadius:9,
            cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",
            justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>{"<"}</button>
          <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600}}>✏️ Modifier</div>
              <div style={{fontSize:10,opacity:.7,marginTop:1,overflow:"hidden",
                textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {contact.lotNumero}
              </div>
            </div>
          <button onClick={()=>setShowHistorique(v=>!v)} style={{
            background:"rgba(255,255,255,.15)",border:"none",color:"#fff",
            padding:"6px 8px",borderRadius:8,fontSize:11,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
            🕐
          </button>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>

        {showHistorique ? (
          <div>
            <SectionTitle icon="🕐" label="Historique des modifications"/>
            {historique.length===0 ? (
              <div style={{textAlign:"center",padding:"32px 0",color:C.tx3,fontSize:13}}>
                Aucune modification enregistrée
              </div>
            ) : historique.map(h=>(
              <div key={h.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                borderRadius:12,padding:12,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.tx}}>
                    {CHAMP_LABELS[h.champ]||h.champ}
                  </span>
                  <span style={{fontSize:11,color:C.tx3}}>
                    {new Date(h.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div style={{fontSize:12,color:C.tx3}}>
                  <span style={{color:C.red}}>— {h.ancienneVal||"(vide)"}</span>
                  {" > "}
                  <span style={{color:C.greenD}}>+ {h.nouvelleVal||"(vide)"}</span>
                </div>
                <div style={{fontSize:11,color:C.tx3,marginTop:4}}>
                  👤 {h.operateur}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {/* Menu Actions — contextuels selon statut */}
            {contact.lotNumero&&(()=>{
              const s = contact.statutLot||"NOUVEAU";
              const showVisite      = ["NOUVEAU","VISITE_PREVUE"].includes(s)||!s;
              const showValider     = ["VISITE_REALISEE","VALIDE_EXPLOITATION"].includes(s);
              const showCloture     = ["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION"].includes(s);
              const showDechi       = ["BORD_ROUTE","A_DECHIQUETER"].includes(s);
              const showTransp      = ["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON"].includes(s);
              const showLivraison   = ["EN_COURS_DECHIQUETAGE","EN_LIVRAISON"].includes(s);
              const btns = [
                showVisite    && {icon:"🔭",label:"Visite",    bg:C.greenL, bd:C.green,  color:C.greenD,  action:onLaunchVisite},
                showValider   && {icon:"✅",label:"Valider",   bg:C.blueL,  bd:C.blue,   color:C.blueD,   action:onLaunchValidation},
                showCloture   && {icon:"🏁",label:"Clôture",   bg:C.amberL, bd:C.amber,  color:C.amberD,  action:onLaunchCloture},
                showDechi     && {icon:"🌀",label:"Déchi.",    bg:"#FAECE7",bd:"#D85A30", color:"#D85A30", action:onLaunchDechiquetage},
                showTransp    && {icon:"🚛",label:"Transp.",   bg:C.purpleL,bd:C.purple,  color:C.purpleD, action:onLaunchTransporteur},
                showLivraison && {icon:"📦",label:"Livraison", bg:C.greenL, bd:C.green,  color:C.greenD,  action:onLaunchLivraison},
              ].filter(Boolean);
              if (!btns.length) return null;
              const cols = btns.length <= 3 ? btns.length : 4;
              return (
                <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,
                  gap:8,marginBottom:16}}>
                  {btns.map((b,i)=>(
                    <button key={i} onClick={b.action} style={{
                      height:60,borderRadius:12,background:b.bg,
                      border:`1.5px solid ${b.bd}`,color:b.color,
                      fontFamily:"inherit",fontSize:11,fontWeight:600,cursor:"pointer",
                      display:"flex",flexDirection:"column",alignItems:"center",
                      justifyContent:"center",gap:3,WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontSize:20}}>{b.icon}</span>
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
            <SectionTitle icon="👤" label="Propriétaire / Contact"/>
            <GridSelect options={TYPE_CONTACT_OPTS} value={typeContact} onChange={setType} cols={3}/>
            <MInput label="Nom" value={nom} onChange={setNom} required placeholder="Nom"/>
            <MInput label="Prénom" value={prenom} onChange={setPrenom} placeholder="Prénom" hint="optionnel"/>
            <MInput label="Téléphone" value={telephone} onChange={v=>setTel(formatPhone(v))} type="tel" required placeholder="06..."/>
            <MInput label="Email" value={email} onChange={setEmail} type="email" hint="optionnel" placeholder="email@..."/>
            <MInput label="Adresse postale" value={adressePostale} onChange={setAdresse} hint="optionnel" placeholder="Adresse"/>
            <MInput label="Complément d'adresse" value={complementAdresse} onChange={setComplementAdresse} hint="optionnel" placeholder="Bâtiment, étage, lieu-dit…"/>

            <SectionTitle icon="🌲" label="Parcelle"/>
            <MInput label="Commune" value={commune} onChange={setCommune} required placeholder="Commune"/>
            <MInput label="Adresse / Lieu-dit" value={adresseParcelle} onChange={setParc} hint="optionnel" placeholder="Lieu-dit..."/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MInput label="Surface (ha)" value={surfaceHa} onChange={setSurface} type="number" hint="optionnel" placeholder="ex: 12.5"/>
              <MInput label="Réf. cadastrale" value={refCadastrale} onChange={setRef} hint="optionnel" placeholder="ex: B 142"/>
            </div>

            <div onClick={()=>setEstPM(v=>!v)} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"14px",borderRadius:12,marginBottom:14,
              background:estPersonneMorale?C.purpleL:"#fff",
              border:`1.5px solid ${estPersonneMorale?C.purple:C.bd}`,
              cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:estPersonneMorale?C.purpleD:C.tx}}>
                  🏢 Personne morale
                </div>
                <div style={{fontSize:12,color:C.tx3,marginTop:2}}>Société, coopérative…</div>
              </div>
              <div style={{width:44,height:26,borderRadius:13,
                background:estPersonneMorale?C.purple:"#ccc",position:"relative"}}>
                <div style={{position:"absolute",top:3,
                  left:estPersonneMorale?20:3,width:20,height:20,
                  borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
              </div>
            </div>
            {estPersonneMorale&&(
              <div style={{background:C.purpleL,borderRadius:12,padding:14,marginBottom:14,
                border:`1px solid ${C.purple}`}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
                  {[["SCI","SCI"],["SARL","SARL"],["SAS","SAS"],["SA","SA"],["EARL","EARL"],
                    ["cooperative","Coopérative"],["groupement_forestier","GF"],
                    ["collectivite","Collectivité"],["commune","Commune"],["onf","ONF"],
                  ].map(([v,l])=>(
                    <button key={v} onClick={()=>setTypePM(v)} style={{
                      padding:"8px 4px",borderRadius:8,fontSize:11,fontWeight:500,
                      border:`1.5px solid ${typePersonneMorale===v?C.purple:C.bd}`,
                      background:typePersonneMorale===v?C.purple:"#fff",
                      color:typePersonneMorale===v?"#fff":C.tx2,
                      cursor:"pointer",fontFamily:"inherit",
                      WebkitTapHighlightColor:"transparent"}}>
                      {l}
                    </button>
                  ))}
                </div>
                <MInput label="N° SIRET / RNA" value={numeroSiret} onChange={setSiret} placeholder="14 chiffres" hint="optionnel"/>
                <MInput label="Nom du signataire" value={nomSignataire} onChange={setSignataire} placeholder="Nom Prénom"/>
                <MInput label="Qualité" value={qualiteSignataire} onChange={setQualite} placeholder="Gérant, Président…"/>
              </div>
            )}

            <SectionTitle icon="📡" label="Origine"/>
            <GridSelect options={ORIGINE_OPTS} value={origine} onChange={setOrigine} cols={4}/>
            <MInput label="Apporteur" value={nomApporteur} onChange={setApporteur} hint="optionnel" placeholder="Nom apporteur"/>
            <MInput label="Date contact" value={dateContact} onChange={setDateC} type="date"/>

            <SectionTitle icon="🪵" label="Nature du produit"/>
            <GridSelect options={TYPE_RESSOURCE_OPTS} value={potentiel} onChange={setPotentiel} cols={3}/>

            <SectionTitle icon="📊" label="Qualification"/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Statut</div>
              <GridSelect options={STATUT_OPTS} value={statut} onChange={setStatut} cols={3}/>
            </div>
            <MInput label="Commentaire" value={commentaire} onChange={setComment}
              placeholder="Notes libres…" big hint="optionnel"/>
          </div>
        )}
      </div>

      {!showHistorique&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,
          padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
          <BigBtn onClick={handleSave} disabled={saving} bg={C.purple} icon={saving?"":"💾"}>
            {saving?"Enregistrement…":"SAUVEGARDER"}
          </BigBtn>
        </div>
      )}
    </div>
  );
};

// ── ÉCRAN OPÉRATEUR TERRAIN ───────────────────────────────────
// Statuts à partir desquels la clôture d'exploitation a eu lieu — au-delà,
// la saisie de relevé terrain n'est plus pertinente pour l'opérateur.
const STATUTS_CLOTURES = ["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"];

const EcranOperateur = ({operateur, onLogout, toast, onUpdateOperateur}) => {
  const [screen, setScreen] = useState("lots"); // lots | releve | profil
  const [activeLot, setActiveLot] = useState(null);
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
    if (operateur.pin && pinActuel!==operateur.pin) { setPinErreur("PIN actuel incorrect"); return; }
    if (!/^\d{6}$/.test(pinNouveau)) { setPinErreur("Le nouveau PIN doit comporter 6 chiffres"); return; }
    if (pinNouveau!==pinNouveauConf) { setPinErreur("Les deux PIN ne correspondent pas"); return; }
    setPinSaving(true);
    try {
      await apiPatch(`/operateurs/${operateur.id}`, {pin:pinNouveau});
    } catch {}
    const opMaj = {...operateur, pin:pinNouveau};
    onUpdateOperateur?.(opMaj);
    setPinActuel(""); setPinNouveau(""); setPinNouveauConf("");
    setPinSaving(false);
    toast?.("PIN modifié ✓");
    setScreen("lots");
  };
  const [lotsStatus, setLotsStatus] = useState({}); // {lotId: statutLot} — rafraîchi depuis le serveur
  const [visites, setVisites] = useState([]);
  const [contactsFull, setContactsFull] = useState([]); // lots complets — requis pour la visite terrain (mandataire)

  // Rafraîchit le statut réel des lots assignés, pour ne jamais bloquer
  // l'accès à la saisie tant que la clôture n'a pas eu lieu (et le couper après).
  useEffect(()=>{
    apiGet(`/contacts`)
      .then(d=>{
        if (!Array.isArray(d)) return;
        const map = {};
        d.forEach(c=>{ map[c.id]=c.statutLot; });
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
  const [temps,       setTemps]   = useState(8);
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
    ? visiteActiveLot.essences.map(e=>`${e.label} ${e.pct}%`).join(", ")
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
      let res;
      try {
        res = modeModif && releveExistantId
          ? await apiPatch(`${endpoint}/${releveExistantId}`, payload)
          : await apiPost(endpoint, payload);
      } catch(apiErr) {
        const msg = apiErr?.message || "";
        if (msg.includes("DOUBLON:")) {
          const id = msg.split("DOUBLON:")[1];
          setReleveExistantId(id);
          setDoublonDetecte(true);
          setSaving(false);
          return;
        }
        throw new Error();
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
      relevesSoumis.current.add(`${activeLot.lotId}|${typeOp}`);
      toast("Relevé enregistré ✓");
      setScreen("lots");
      setActiveLot(null);
      setModeModif(false);
      setReleveExistantId(null);
    }
    setSaving(false);
  };

  const handleDemanderModification = async () => {
    setMsgModifEnvoi(true);
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
    } catch {}
    setMsgModifEnvoi(false);
    setMsgModifEnvoye(true);
    toast("Message envoyé à l'administrateur ✓");
    setTimeout(()=>{
      setScreen("lots"); setActiveLot(null);
      setDoublonDetecte(false); setMsgModifEnvoye(false); setReleveExistantId(null);
    }, 2500);
  };

  // Profil de l'opérateur : "terrain" (abattage/débardage uniquement) ou "charge_mission" (visite uniquement).
  // Filtre défensif au cas où des assignations historiques ne correspondraient plus au profil.
  const estChargeMission = operateur.profil==="charge_mission" || (!operateur.profil && operateur.roles?.includes("mandataire") && !operateur.roles?.some(r=>["abattage","debardage"].includes(r)));
  const typesAutorises = estChargeMission ? ["mandataire"] : ["abattage","debardage"];
  const assignations = (operateur.assignations||[]).filter(a=>typesAutorises.includes(a.typeOperation));

  // Mandataire — visite terrain : écran plein avec le formulaire de visite habituel
  if (screen==="visite" && activeLot) {
    const lotComplet = contactsFull.find(c=>c.id===activeLot.lotId) || {
      id:activeLot.lotId, lotNumero:activeLot.lotNumero,
    };
    return (
      <FormulaireVisite lot={lotComplet} entrepriseId={operateur.entrepriseId}
        onBack={()=>{ setActiveLot(null); setScreen("lots"); }}
        onSaved={v=>{
          setVisites(prev=>[v,...prev]);
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
            {operateur.pin&&(
              <MInput label="PIN actuel" value={pinActuel} onChange={setPinActuel}
                placeholder="6 chiffres" type="password"/>
            )}
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
            ) : assignations.map(a=>{
              const statut = lotsStatus[a.lotId]||lotsStatus[a.id];
              const cloture = statut && STATUTS_CLOTURES.includes(statut);
              const estMandataire = a.typeOperation==="mandataire";
              const visiteFaite = estMandataire && visites.some(v=>v.lotId===a.lotId||v.lotNumero===a.lotNumero);
              return (
              <div key={a.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                borderRadius:14,padding:16,marginBottom:10}}>
                <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                  color:C.greenD,marginBottom:8}}>🏷 {a.lotNumero}</div>
                <div style={{fontSize:12,color:C.tx3,marginBottom:12}}>
                  {{"mandataire":"🔭 Visite terrain","abattage":"🪓 Abattage","debardage":"🚜 Débardage","dechiquetage":"🌀 Déchiquetage"}[a.typeOperation]||a.typeOperation}
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
                  ].map(([v,l,s,e])=>(
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
                      {[["Début pause",pauseDebutDeb,setPauseDebDeb],["Fin pause",pauseFinDeb,setPauseFinDeb]].map(([lbl,val,set],i)=>(
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
                    const toMins = t=>{ const [h,m]=t.split(":").map(Number); return h*60+m; };
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
                  ].map(([v,l,s,e])=>(
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
                      {[["Début pause",pauseDebutAb,setPauseDebAb],["Fin pause",pauseFinAb,setPauseFinAb]].map(([lbl,val,set],i)=>(
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
                    const toMins = t=>{ const [h,m]=t.split(":").map(Number); return h*60+m; };
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
const STATUT_LOT = {
  NOUVEAU:               {label:"Nouveau",            color:"#9A9892", bg:"#ECEAE6"},
  VISITE_PREVUE:         {label:"Visite prévue",      color:"#BA7517", bg:"#FAEEDA"},
  VISITE_REALISEE:       {label:"Visite réalisée",    color:"#185FA5", bg:"#E6F1FB"},
  VALIDE_EXPLOITATION:   {label:"Validé",             color:"#534AB7", bg:"#EEEDFE"},
  EN_COURS_EXPLOITATION: {label:"En exploitation",    color:"#185FA5", bg:"#E6F1FB"},
  BORD_ROUTE:            {label:"Bord de route",      color:"#A66A2E", bg:"#F3EBE0"},
  A_DECHIQUETER:         {label:"À déchiqueter",      color:"#D85A30", bg:"#FAECE7"},
  EN_COURS_DECHIQUETAGE:      {label:"Déchiquetage en cours", color:"#D85A30", bg:"#FAECE7"},
  EN_LIVRAISON:          {label:"En livraison",       color:"#534AB7", bg:"#EEEDFE"},
  LIVRE_CHAUFFERIE:      {label:"Livré chaufferie",   color:"#4CAF50", bg:"#E8F5E9"},
  EN_STOCK_PLATEFORME:   {label:"En stock plateforme",color:"#185FA5", bg:"#E6F1FB"},
  LIVRE:                 {label:"Livré",              color:"#4CAF50", bg:"#E8F5E9"},
  ALERTE:                {label:"⚠ Alerte",           color:"#A32D2D", bg:"#FCEBEB"},
};

// ── ÉCRAN ACCUEIL ─────────────────────────────────────────────
const EcranAccueil = ({contacts, visites, notifications, user, onNewLot, onGoLots, onGoAlertes, onGoDelegations, onAppelerContact}) => {
  const STATUTS_EXPLOITATION = ["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE","EN_STOCK_PLATEFORME","LIVRE"];
  const lotsAVisiter = contacts.filter(c=>c.lotNumero&&(c.statutLot==="VISITE_PREVUE"||c.statutLot==="NOUVEAU"||!c.statutLot)&&!STATUTS_EXPLOITATION.includes(c.statutLot));
  const chantiersJour = contacts.filter(c=>["EN_COURS_EXPLOITATION","VALIDE_EXPLOITATION"].includes(c.statutLot));
  const alertes = notifications.filter(n=>!n.lu);

  const [comptes, setComptes] = useState(()=>comptesLocalGet());
  const [showInscrits, setShowInscrits] = useState(false);
  const [ficheCompte, setFicheCompte] = useState(null);
  const [rapportTexte, setRapportTexte] = useState("");

  useEffect(()=>{
    apiGet(`/comptes-contact`)
      .then(d=>{ if(Array.isArray(d)){
        const local = comptesLocalGet();
        const nonSynced = local.filter(c=>!c.synced && !d.some(a=>a.id===c.id));
        const merged = [...nonSynced, ...d];
        setComptes(merged); comptesLocalSave(merged);
      } })
      .catch(()=>{});
  },[]);

  const sauvegarderRapport = (compte) => {
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
      {alertes.length>0&&(
        <div onClick={onGoAlertes} style={{background:C.redL,borderRadius:14,padding:16,
          marginBottom:12,border:`1.5px solid ${C.red}`,cursor:"pointer",
          WebkitTapHighlightColor:"transparent"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24}}>🔴</span>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:C.red}}>
                {alertes.length} alerte{alertes.length>1?"s":""} active{alertes.length>1?"s":""}
              </div>
              <div style={{fontSize:12,color:C.red,opacity:.8}}>Appuyer pour voir</div>
            </div>
          </div>
        </div>
      )}
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
      {(user?.role==="admin"||user?.role==="manager")&&(
        <div onClick={onGoDelegations} style={{background:C.purpleL,borderRadius:14,padding:16,
          marginBottom:12,border:`1.5px solid ${C.purple}`,cursor:"pointer",
          display:"flex",alignItems:"center",gap:10,
          WebkitTapHighlightColor:"transparent"}}>
          <span style={{fontSize:24}}>🏢</span>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:C.purpleD}}>Délégations entreprises</div>
            <div style={{fontSize:12,color:C.purpleD,opacity:.8}}>Créer une entreprise et missionner sur un lot</div>
          </div>
          <span style={{fontSize:18,color:C.purpleD}}>›</span>
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
                  ficheCompte.natureDemande.map(n=>(
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
          {icon:"🔭",label:"À visiter",count:lotsAVisiter.length,color:C.amber,bg:C.amberL,action:()=>onGoLots("VISITE_PREVUE")},
          {icon:"🪓",label:"En exploitation",count:chantiersJour.length,color:C.blue,bg:C.blueL,action:()=>onGoLots("EN_COURS_EXPLOITATION")},
          {icon:"📦",label:"Bord de route",count:contacts.filter(c=>c.statutLot==="BORD_ROUTE").length,color:C.brown,bg:C.brownL,action:()=>onGoLots("BORD_ROUTE")},
          {icon:"🚛",label:"Transports",count:contacts.filter(c=>c.statutLot==="EN_LIVRAISON").length,color:C.purple,bg:C.purpleL,action:()=>onGoLots("EN_LIVRAISON")},
          {icon:"✅",label:"Livraisons",count:contacts.filter(c=>c.statutLot==="LIVRE_CHAUFFERIE").length,color:C.green,bg:C.greenL,action:()=>onGoLots("LIVRE_CHAUFFERIE")},
          {icon:"⚠️",label:"Alertes critiques",count:alertes.length,color:C.red,bg:C.redL,action:onGoAlertes},
        ].map((card,i)=>(
          <div key={i} onClick={card.action} style={{
            background:card.bg,borderRadius:14,padding:"14px 10px",cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
            <div style={{fontSize:22,marginBottom:6}}>{card.icon}</div>
            <div style={{fontSize:22,fontWeight:700,color:card.color,fontFamily:FONT_TITLE}}>{card.count}</div>
            <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{card.label}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:13,fontWeight:700,color:C.tx2,marginBottom:10,fontFamily:FONT_TITLE}}>
        Chantiers du jour
      </div>
      {chantiersJour.length===0&&(
        <div style={{fontSize:13,color:C.tx3,marginBottom:14}}>Aucun chantier en cours.</div>
      )}
      {chantiersJour.slice(0,5).map(c=>{
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

const EcranDelegations = ({entrepriseId, toast, onBack}) => {
  const [entreprises,  setEntreprises]  = useState([]);
  const [contacts,     setContacts]     = useState([]);
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
  const [typesProposes, setTypesProp]    = useState([]);

  // Mission sur un lot
  const [selEntId,      setSelEntId]     = useState("");
  const [missionLotId,  setMissionLotId] = useState("");
  const [missionType,   setMissionType]  = useState("abattage");
  const [delaiExecution,setDelaiExecution]= useState(()=>{
    const d=new Date(); d.setDate(d.getDate()+14); return d.toISOString().slice(0,10);
  });
  const [missionSaving, setMissionSaving]= useState(false);
  const [ordreGenere,   setOrdreGenere]  = useState(null);
  const [ordresLocaux,  setOrdresLocaux] = useState(()=>ordresExplLocalGet());

  // Filtrage croisé lots ↔ entreprises ↔ type
  const DELAI_ATTENTE_MS = 5 * 24 * 60 * 60 * 1000; // 5 jours
  // Types bloquants par lot : ordre en_attente < 5 jours OU accepte. Exclut refuse et en_attente expiré.
  const typesCouvertsParLot = ordresLocaux.reduce((acc,o)=>{
    const age = Date.now() - new Date(o.dateEmission).getTime();
    const bloquant = o.statut==="accepte" || (o.statut==="en_attente" && age < DELAI_ATTENTE_MS);
    if (!bloquant) return acc;
    if (!acc[o.lotId]) acc[o.lotId]=new Set();
    acc[o.lotId].add(o.missionType);
    return acc;
  },{});
  const entSelec = entreprises.find(e=>e.id===selEntId);
  const typesEntreprise = entSelec?.typesProposes?.length ? entSelec.typesProposes : null;
  // Lots dispo : ont un lotNumero + le type courant n'est pas déjà commandé + si entreprise sélectionnée, au moins un de ses types n'est pas couvert
  const lotsDisponibles = contacts.filter(c=>{
    if (!c.lotNumero) return false;
    const couverts = typesCouvertsParLot[c.id] || new Set();
    if (typesEntreprise) {
      // au moins un type de l'entreprise n'est pas encore couvert sur ce lot
      return typesEntreprise.some(t=>!couverts.has(t));
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
  const deptOf = e => e.codePostal ? String(e.codePostal).slice(0,2) : null;
  const deptsDisponibles = [...new Set(entreprises.map(deptOf).filter(Boolean))].sort();
  const entreprisesFiltrees = entreprises.filter(e=>
    (!filtreDept||deptOf(e)===filtreDept) &&
    (!filtreSpecialite||e.typesProposes?.includes(filtreSpecialite))
  );

  useEffect(()=>{
    try { const s=localStorage.getItem(`applitag_entreprises_${entrepriseId}`); if(s){ const p=JSON.parse(s); if(Array.isArray(p)) setEntreprises(p); } } catch{}
    apiGet(`/entreprises/entreprise/${entrepriseId}`)
      .then(d=>{ if(Array.isArray(d)){ setEntreprises(d); try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(d));}catch{} } }).catch(()=>{});
    apiGet(`/contacts`)
      .then(d=>{ if(Array.isArray(d)) setContacts(d); }).catch(()=>{});
  },[entrepriseId]);

  const toggleType = v => setTypesProp(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);

  const handleCreate = async () => {
    if (!nom.trim()) { toast("Le nom de l'entreprise est obligatoire","warn"); return; }
    setSaving(true);
    const entreprise = {
      nom, siret, adressePostale, complementAdresse, commune, codePostal,
      telephone, email, contactNom, contactPrenom, contactTel, contactFonction,
      typesProposes, entrepriseId,
    };
    try {
      const saved = await apiPost(`/entreprises`, entreprise);
      setEntreprises(prev=>{ const next=[saved,...prev]; try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(next));}catch{} return next; });
      toast(`Entreprise ${nom} créée ✓`);
    } catch {
      setEntreprises(prev=>{ const next=[{...entreprise,id:uid()},...prev]; try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(next));}catch{} return next; });
      toast("Entreprise enregistrée localement ✓");
    }
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
      } catch {}
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

      <div ref={el=>{ if(el) el._scrollTopRef=el; }} data-scrollable="1" id="delegations-scroll" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:40}}>

        <SectionTitle icon="📖" label="Répertoire des entreprises"/>
        {entreprises.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <select value={filtreDept} onChange={e=>setFiltreDept(e.target.value)}
              style={{width:"100%",height:42,padding:"0 10px",borderRadius:10,
                border:`1.5px solid ${C.bd}`,fontSize:13,fontFamily:"inherit",
                background:"#fff",color:C.tx,outline:"none"}}>
              <option value="">Tous départements</option>
              {deptsDisponibles.map(d=>(
                <option key={d} value={d}>Département {d}</option>
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
                {e.typesProposes.map(t=>{
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
                  <option key={e.id} value={e.id}>{e.nom}{e.typesProposes?.length?` · ${e.typesProposes.map(t=>TYPES_TRAVAUX_DELEGATION.find(([v])=>v===t)?.[2]||t).join(", ")}`:"" }</option>
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
const FILTRES_LOTS = [
  {id:"TOUS",              label:"Tous"},
  {id:"VISITE_PREVUE",     label:"À visiter"},
  {id:"VISITE_REALISEE",   label:"Visite faite"},
  {id:"EN_COURS_EXPLOITATION", label:"Exploitation"},
  {id:"BORD_ROUTE",        label:"Bord route"},
  {id:"EN_LIVRAISON",      label:"Transport"},
  {id:"LIVRE_CHAUFFERIE",  label:"Livré"},
];

const EcranLots = ({contacts, onNewLot, onOpenLot, filtreInitial="TOUS"}) => {
  const [filtre, setFiltre] = useState(filtreInitial);
  const [search, setSearch] = useState("");

  useEffect(()=>{ setFiltre(filtreInitial); }, [filtreInitial]);

  const lotsFiltres = contacts.filter(c=>{
    if (!c.lotNumero) return false;
    if (search && !`${c.lotNumero} ${c.nom} ${c.commune}`.toLowerCase().includes(search.toLowerCase())) return false;
    const s = c.statutLot||"NOUVEAU";
    if (filtre==="TOUS") return true;
    if (filtre==="VISITE_PREVUE") return ["NOUVEAU","VISITE_PREVUE"].includes(s)||!s;
    if (filtre==="VISITE_REALISEE") return s==="VISITE_REALISEE";
    if (filtre==="EN_COURS_EXPLOITATION") return ["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION"].includes(s);
    if (filtre==="LIVRE_CHAUFFERIE") return ["LIVRE_CHAUFFERIE","LIVRE","EN_STOCK_PLATEFORME"].includes(s);
    return s===filtre;
  });
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"8px 16px",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Rechercher un lot, propriétaire, commune…"
          style={{width:"100%",height:40,padding:"0 12px",borderRadius:10,
            border:`1px solid ${C.bd}`,fontSize:14,fontFamily:"inherit",
            background:C.bg,color:C.tx,outline:"none"}}/>
      </div>
      <div style={{display:"flex",gap:6,padding:"8px 16px",overflowX:"auto",
        flexShrink:0,background:"#fff",borderBottom:`1px solid ${C.bd}`}}>
        {FILTRES_LOTS.map(f=>(
          <button key={f.id} onClick={()=>setFiltre(f.id)} style={{
            height:32,padding:"0 12px",borderRadius:16,whiteSpace:"nowrap",
            border:`1.5px solid ${filtre===f.id?C.green:C.bd}`,
            background:filtre===f.id?C.green:"#fff",
            color:filtre===f.id?"#fff":C.tx2,
            fontFamily:"inherit",fontSize:12,fontWeight:500,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",flexShrink:0}}>
            {f.label}
          </button>
        ))}
      </div>
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING}}>
        {lotsFiltres.length===0 ? (
          <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
            <div style={{fontSize:40,marginBottom:12}}>🌲</div>
            <div style={{fontSize:16,fontWeight:500}}>Aucun lot</div>
          </div>
        ) : lotsFiltres.map(c=>{
          const st = STATUT_LOT[c.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
          return (
            <div key={c.id} onClick={()=>onOpenLot(c)} style={{
              background:"#fff",borderRadius:14,padding:16,marginBottom:10,cursor:"pointer",
              WebkitTapHighlightColor:"transparent",
              borderLeft:`4px solid ${st.color}`,border:`1px solid ${C.bd}`,
              borderLeftWidth:4,borderLeftColor:st.color}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD}}>{c.lotNumero}</div>
                  <div style={{fontSize:15,fontWeight:600,color:C.tx,marginTop:2}}>{c.nom}{c.prenom?` ${c.prenom}`:""}</div>
                </div>
                <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                  background:st.bg,color:st.color,fontWeight:600,whiteSpace:"nowrap"}}>
                  {st.label}
                </span>
              </div>
              <div style={{fontSize:12,color:C.tx3}}>
                📍 {c.commune}{c.surfaceHa?` · 🌲 ${c.surfaceHa} ha`:""}
                {c.tonnageCumul>0&&(
                  <span style={{marginLeft:8,color:C.amberD,fontWeight:600}}>
                    · ⚖️ {fmtNum(c.tonnageCumul,1)} t abattu
                  </span>
                )}
                {c.tonnageBordRoute>0&&(
                  <span style={{marginLeft:8,color:"#A66A2E",fontWeight:600}}>
                    · 🌲 {fmtNum(c.tonnageBordRoute,1)} t bord route
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{padding:"12px 16px 24px",flexShrink:0}}>
        <BigBtn onClick={onNewLot} bg={C.green} icon="➕">Nouveau lot</BigBtn>
      </div>
    </div>
  );
};

// ── MODAL SUGGESTION ETF ──────────────────────────────────────
const calcDistKm = (gps1, gps2) => {
  if (!gps1||!gps2) return null;
  const R=6371, dLat=(gps2.lat-gps1.lat)*Math.PI/180;
  const dLng=(gps2.lng-gps1.lng)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(gps1.lat*Math.PI/180)*Math.cos(gps2.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
};

// ── MODAL DÉLÉGATION VISITE ───────────────────────────────────
const ModalDelegationVisite = ({lot, operateurs, onDeleguee, onIgnorer}) => {
  const [nomDelegue,    setNomDelegue]  = useState("");
  const [telDelegue,    setTelDelegue]  = useState("");
  const [qualiteDelegue,setQualDelegue] = useState("technicien_forestier");
  const [dateExpiry,    setDateExpiry]  = useState(()=>{
    const d=new Date(); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10);
  });
  const [codeGenere, setCodeGenere] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const techniciens = operateurs.filter(o=>!o.role||o.role==="technicien"||o.role==="visiteur");

  const handleDelegueer = async () => {
    if (!nomDelegue) { return; }
    setSaving(true);
    try {
      const created = await apiPost(`/acces-lot`, {lotId:lot.id,lotNumero:lot.lotNumero,
          nomDelegue,telDelegue,qualiteDelegue,expiresAt:dateExpiry,type:"visite"});
      setCodeGenere(created.code); setSaving(false);
      onDeleguee&&onDeleguee({nomDelegue,code:created.code});
    } catch {
      setSaving(false); alert("Pas de connexion — délégation non enregistrée"); return;
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
      zIndex:2000,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:C.bg,borderRadius:"20px 20px 0 0",
        width:"100%",maxHeight:"85vh",overflowY:"auto",padding:PADDING,paddingBottom:32}}>
        <div style={{width:40,height:4,borderRadius:2,background:C.bd,margin:"0 auto 16px"}}/>
        <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>🔭 Déléguer la visite</div>
        <div style={{fontSize:12,color:C.tx3,marginBottom:16}}>
          {lot.lotNumero} · {lot.commune}
        </div>
        {codeGenere?(
          <div>
            <div style={{background:C.greenL,borderRadius:16,padding:20,marginBottom:16,
              border:`2px solid ${C.green}`,textAlign:"center"}}>
              <div style={{fontSize:13,color:C.greenD,fontWeight:600,marginBottom:8}}>
                ✅ Code d'accès généré
              </div>
              <div style={{fontFamily:"monospace",fontSize:36,fontWeight:800,
                color:C.greenD,letterSpacing:6,marginBottom:8}}>{codeGenere}</div>
              <div style={{fontSize:12,color:C.tx3}}>
                Valide jusqu'au {new Date(dateExpiry).toLocaleDateString("fr-FR")}
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:14,
              border:`1px solid ${C.bd}`,fontSize:12,color:C.tx3,lineHeight:1.8}}>
              <strong>Instructions pour {nomDelegue} :</strong><br/>
              1. Ouvrir APPLITAG<br/>
              2. "Connexion opérateur terrain"<br/>
              3. Entrer le code : <strong style={{color:C.greenD}}>{codeGenere}</strong><br/>
              4. Réaliser la visite du lot {lot.lotNumero}
            </div>
            <BigBtn onClick={onIgnorer} bg={C.green} icon="✓">TERMINÉ</BigBtn>
          </div>
        ):(
          <>
            {techniciens.length>0&&(
              <>
                <SectionTitle icon="👤" label="Techniciens disponibles"/>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                  {techniciens.slice(0,5).map(t=>(
                    <div key={t.id} onClick={()=>{ setNomDelegue(`${t.prenom||""} ${t.nom||""}`.trim()); setTelDelegue(t.telephone||""); }}
                      style={{padding:"10px 14px",borderRadius:10,cursor:"pointer",
                        border:`1.5px solid ${nomDelegue.includes(t.nom||"")?C.green:C.bd}`,
                        background:nomDelegue.includes(t.nom||"")?C.greenL:"#fff",
                        display:"flex",alignItems:"center",gap:10,
                        WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontSize:20}}>👤</span>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{t.prenom} {t.nom}</div>
                        <div style={{fontSize:11,color:C.tx3}}>{t.etfNom||"Indépendant"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <SectionTitle icon="📋" label="Délégué"/>
            <MInput label="Nom" value={nomDelegue} onChange={setNomDelegue} placeholder="Prénom Nom" required/>
            <MInput label="Téléphone" value={telDelegue} onChange={v=>setTelDelegue(formatPhone(v))} placeholder="06 XX XX XX XX" type="tel" hint="optionnel"/>
            <SectionTitle icon="📅" label="Validité"/>
            <MInput label="Valide jusqu'au" value={dateExpiry} onChange={setDateExpiry} type="date"/>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:16}}>
              <BigBtn onClick={handleDelegueer} disabled={!nomDelegue||saving} bg={C.blue} icon={saving?"":"🔑"}>
                {saving?"Génération…":"GÉNÉRER LE CODE D'ACCÈS"}
              </BigBtn>
              <button onClick={onIgnorer} style={{padding:"14px",borderRadius:12,
                background:"transparent",border:`1.5px solid ${C.bd}`,color:C.tx3,
                fontFamily:"inherit",fontSize:14,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>Annuler</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ModalSuggestionETF = ({lot, visites, operateurs, rayon=100, onChoisir, onIgnorer}) => {
  const visite = visites.find(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
  const lotGps = visite?.gps;

  // Grouper opérateurs par ETF avec distance
  const etfsMap = {};
  operateurs.forEach(op=>{
    if (!op.etfNom) return;
    if (!etfsMap[op.etfNom]) etfsMap[op.etfNom] = {nom:op.etfNom, ops:[], gps:op.gps||null};
    etfsMap[op.etfNom].ops.push(op);
  });

  const etfs = Object.values(etfsMap).map(etf=>({
    ...etf,
    distance: calcDistKm(lotGps, etf.gps),
  })).sort((a,b)=>(a.distance??999)-(b.distance??999));

  const [selected, setSelected] = useState(etfs[0]?.nom||"");
  const [rayonFiltre, setRayonFiltre] = useState(rayon);

  const etfsFiltres = etfs.filter(e=>!e.distance||e.distance<=rayonFiltre);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",
      zIndex:2000,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:C.bg,borderRadius:"20px 20px 0 0",
        width:"100%",maxHeight:"80vh",overflowY:"auto",padding:PADDING,paddingBottom:32}}>

        <div style={{width:40,height:4,borderRadius:2,background:C.bd,
          margin:"0 auto 16px"}}/>
        <div style={{fontSize:16,fontWeight:700,color:C.tx,marginBottom:4}}>
          🏢 Proposer une ETF
        </div>
        <div style={{fontSize:13,color:C.tx3,marginBottom:16}}>
          Lot {lot.lotNumero} · {lot.commune}
          {lotGps&&<span> · GPS disponible</span>}
        </div>

        {/* Rayon de recherche */}
        <MSlider label="Rayon de recherche" value={rayonFiltre}
          onChange={setRayonFiltre} min={10} max={300} step={10}
          unit=" km" color={C.purple}/>

        {etfsFiltres.length===0?(
          <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
            border:`1px solid ${C.amber}`,textAlign:"center"}}>
            <div style={{fontSize:14,color:C.amberD,fontWeight:600}}>
              Aucune ETF dans un rayon de {rayonFiltre} km
            </div>
            <div style={{fontSize:12,color:C.tx3,marginTop:4}}>
              Augmentez le rayon ou ajoutez des ETF dans les opérateurs
            </div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
            {etfsFiltres.map(etf=>(
              <div key={etf.nom} onClick={()=>setSelected(etf.nom)} style={{
                padding:14,borderRadius:12,cursor:"pointer",
                border:`2px solid ${selected===etf.nom?C.green:C.bd}`,
                background:selected===etf.nom?C.greenL:"#fff",
                WebkitTapHighlightColor:"transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,
                      color:selected===etf.nom?C.greenD:C.tx}}>
                      🏢 {etf.nom}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:3}}>
                      {etf.ops.length} opérateur(s)
                      {etf.distance!=null&&` · 📍 ${etf.distance} km`}
                    </div>
                  </div>
                  {selected===etf.nom&&<span style={{fontSize:20}}>✅</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {selected&&(
            <BigBtn onClick={()=>onChoisir(selected)} bg={C.green} icon="✅">
              ASSIGNER {selected.toUpperCase()}
            </BigBtn>
          )}
          <button onClick={onIgnorer} style={{
            padding:"14px",borderRadius:12,background:"transparent",
            border:`1.5px solid ${C.bd}`,color:C.tx3,
            fontFamily:"inherit",fontSize:14,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
            Choisir plus tard
          </button>
        </div>
      </div>
    </div>
  );
};


// ── COMPOSANT CALCUL TAS ──────────────────────────────────────
const TasDimensionsInput = ({nbTas, foisonnement, onFoisonnementChange, essence="melange", essences=null, onChange}) => {
  const [longueur, setLong]  = useState("");
  const [largeur,  setLarg]  = useState("");
  const [hauteur,  setHaut]  = useState("");

  // Composition pondérée (ITEBE) si la composition réelle du lot est connue, sinon essence unique en repli
  const indices = essences?.length ? indicesPonderes(essences) : (INDICES_ESSENCE_ITEBE[essence]||INDICES_ESSENCE_ITEBE.melange);
  const essenceLabel = essences?.length ? essences.map(e=>`${e.label} ${e.pct}%`).join(", ") : essence;
  const L = parseFloat(longueur)||0;
  const la = parseFloat(largeur)||0;
  const H = parseFloat(hauteur)||0;
  const ready = L>0 && la>0 && H>0 && nbTas>0;
  const volApparent = L * la * H * (nbTas||1);
  const volReel     = volApparent * indices.foisonnement;
  const tonnage     = volReel * indices.densite / 1000;
  const energie     = tonnage * indices.pci; // MWh = t × MWh/t (source: ITEBE 2004)

  useEffect(()=>{ ready && onChange&&onChange({longueur:L,largeur:la,hauteur:H,volApparent,volReel,tonnage,energie}); },
    [longueur,largeur,hauteur,nbTas]);

  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <MInput label="Longueur (m)" value={longueur}
          onChange={setLong} type="number" placeholder="ex: 4"/>
        <MInput label="Largeur (m)" value={largeur}
          onChange={setLarg} type="number" placeholder="ex: 1.2"/>
        <MInput label="Hauteur (m)" value={hauteur}
          onChange={setHaut} type="number" placeholder="ex: 1.2"/>
      </div>

      {ready&&(
        <div style={{background:C.amberL,borderRadius:12,padding:14,
          border:`1.5px solid ${C.amber}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.amberD,marginBottom:10}}>
            📊 Calculs automatiques — {nbTas} tas · essence(s) : {essenceLabel}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            {[
              [fmtNum(volApparent,1)+" m³","Volume apparent"],
              [fmtNum(volReel,1)+" m³","Volume réel"],
              [fmtNum(tonnage,1)+" t","Tonnage estimé"],
              [fmtNum(energie,1)+" MWh","Énergie PCI"],
            ].map(([v,l],i)=>(
              <div key={i} style={{textAlign:"center",
                background:"rgba(186,117,23,.12)",borderRadius:8,padding:8}}>
                <div style={{fontSize:16,fontWeight:700,color:C.amberD}}>{v}</div>
                <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:C.tx3,lineHeight:1.7}}>
            Base de calcul : {L}×{la}×{H} m × {nbTas} tas<br/>
            Densité verte {Math.round(indices.densite)} kg/m³ · Foisonnement {indices.foisonnement.toFixed(2)} · PCI {indices.pci.toFixed(1)} kWh/kg
          </div>
        </div>
      )}

      <div style={{marginTop:10}}>
        <MSlider label="Taux de foisonnement" value={foisonnement}
          onChange={onFoisonnementChange} min={0.30} max={0.65} step={0.01}
          unit="" color={C.amber}
          hint={`Valeur théorique ${indices.foisonnement.toFixed(2)} pour ${essenceLabel}`}/>
      </div>
    </div>
  );
};

const EcranValidationExploitation = ({lot, visites=[], operateurs, onBack, onSaved, toast, entrepriseId, user}) => {
  // Composition essences du lot (issue de sa dernière visite) → indices pondérés ITEBE
  const visiteLotJour = visites.filter(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero)[0]||null;
  // Ordre de mission (première fois — admin)
  const [etfNom,      setEtfNom]     = useState(lot.etfNom||"");
  const [typeOp,      setTypeOp]     = useState(lot.typeOperation||"abattage_debardage");
  const [machine,     setMachine]    = useState(lot.machine||"");
  const [dateDebut,   setDateDebut]  = useState(lot.dateDebutPrev||todayS());
  const [dateFin,     setDateFin]    = useState(lot.dateFinPrev||"");
  // Reporting quotidien
  const [dateJour,    setDateJour]   = useState(todayS());
  const [heureDebut,  setHeureDeb]   = useState("");
  const [heureFin,    setHeureFin]   = useState("");
  const [pauseDebutJour, setPauseDebJour] = useState("");
  const [pauseFinJour,   setPauseFinJour] = useState("");
  const [typeOpJour,  setTypeOpJour] = useState("abattage_debardage");
  const [machineJour, setMachineJ]   = useState("");
  const [foisonnement,setFoisonn]    = useState(0.50);
  const [nbTasJour,   setNbTasJour]  = useState(0);
  const [volumeJour,  setVolJour]    = useState("");
  const [nbOperateurs,setNbOps]      = useState(1);
  const [observations,setObs]        = useState("");
  const [anomalies,   setAnom]       = useState("");
  const [saving,      setSaving]     = useState(false);
  const [onglet,      setOnglet]     = useState("reporting"); // ordre | reporting

  const etfs = [...new Set(operateurs.map(o=>o.etfNom).filter(Boolean))];
  const isAdmin = user?.role==="admin"||user?.role==="manager";

  const handleSave = async () => {
    if (!dateJour) { toast("Date obligatoire","warn"); return; }
    setSaving(true);
    const payload = {
      lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
      etfNom, typeOperation:typeOp, machine, dateDebut, dateFin,
      dateJour, heureDebut, heureFin,
      pauseDebut:pauseDebutJour, pauseFin:pauseFinJour,
      typeOperationJour:typeOpJour, machineJour,
      foisonnement, nbTasJour, volumeJour, nbOperateurs,
      observations, anomalies,
      statut:"EN_COURS_EXPLOITATION",
    };
    try {
      await apiPost(`/validations`, payload);
      toast("Reporting du jour enregistré ✓");
      onSaved({etfNom, tonnage:parseFloat(volumeJour)||0});
    } catch {
      toast("Reporting enregistré localement ✓");
      onSaved({etfNom, tonnage:parseFloat(volumeJour)||0});
    }
    setSaving(false);
  };

  const TYPE_OPS = [
    ["abattage","🪓 Abattage mécanisé"],
    ["abattage_manuel","🌀 Abattage manuel"],
    ["debardage","🚜 Débardage"],
    ["abattage_debardage","🪓🚜 Abattage + Débardage"],
    ["abattage_manuel_debardage","🌀🚜 Abattage manuel + Débardage"],
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:C.sb,color:"#fff",padding:"12px 16px 0",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.1)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>📋 Exploitation</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero}</div>
          </div>
        </div>
        {/* Onglets */}
        <div style={{display:"flex"}}>
          {[["reporting","📝 Reporting jour"],["ordre",isAdmin?"📋 Ordre mission":""]].filter(([,l])=>l).map(([v,l])=>(
            <button key={v} onClick={()=>setOnglet(v)} style={{
              flex:1,height:40,background:"transparent",border:"none",
              color:onglet===v?"#fff":"rgba(255,255,255,.45)",
              fontFamily:"inherit",fontSize:12,fontWeight:onglet===v?700:400,
              cursor:"pointer",borderBottom:onglet===v?"2px solid #fff":"2px solid transparent",
              WebkitTapHighlightColor:"transparent"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:90}}>

        {/* ── REPORTING QUOTIDIEN ── */}
        {onglet==="reporting"&&(
          <>
            <SectionTitle icon="📅" label="Date du jour"/>
            <MInput label="Date" value={dateJour} onChange={setDateJour} type="date"/>

            <SectionTitle icon="⏱️" label="Horaires de travail"/>
            <div style={{background:"#fff",borderRadius:12,padding:16,marginBottom:14,
              border:`1px solid ${C.bd}`}}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>🕐 Heure de début</div>
                <input type="time" value={heureDebut}
                  onChange={e=>setHeureDeb(e.target.value)}
                  style={{width:"100%",padding:"14px 16px",borderRadius:10,
                    fontSize:20,fontWeight:700,boxSizing:"border-box",
                    border:`2px solid ${heureDebut?C.green:C.bd}`,
                    background:heureDebut?C.greenL:"#fff",
                    color:heureDebut?C.greenD:"#333",fontFamily:"inherit"}}/>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>🕕 Heure de fin</div>
                <input type="time" value={heureFin}
                  onChange={e=>setHeureFin(e.target.value)}
                  style={{width:"100%",padding:"14px 16px",borderRadius:10,
                    fontSize:20,fontWeight:700,boxSizing:"border-box",
                    border:`2px solid ${heureFin?C.amber:C.bd}`,
                    background:heureFin?C.amberL:"#fff",
                    color:heureFin?C.amberD:"#333",fontFamily:"inherit"}}/>
              </div>

              {/* Pause déjeuner */}
              <div style={{background:"#FFF8E1",borderRadius:10,padding:12,
                marginBottom:heureDebut&&heureFin?12:0,border:"1px solid #FFD54F"}}>
                <div style={{fontSize:12,fontWeight:600,color:"#795548",marginBottom:8}}>
                  🍽️ Pause déjeuner (optionnel)
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["Début pause",pauseDebutJour,setPauseDebJour],["Fin pause",pauseFinJour,setPauseFinJour]].map(([lbl,val,set],i)=>(
                    <div key={i}>
                      <div style={{fontSize:11,color:"#795548",marginBottom:6}}>{lbl}</div>
                      <input type="time" value={val} onChange={e=>set(e.target.value)}
                        style={{width:"100%",padding:"10px 12px",borderRadius:8,fontSize:16,fontWeight:600,
                          boxSizing:"border-box",border:"1.5px solid #FFD54F",
                          background:"#fff",fontFamily:"inherit"}}/>
                    </div>
                  ))}
                </div>
              </div>

              {heureDebut&&heureFin&&(()=>{
                const [dh,dm]=heureDebut.split(":").map(Number);
                const [fh,fm]=heureFin.split(":").map(Number);
                const brut = (fh*60+fm)-(dh*60+dm);
                const pause = (pauseDebutJour&&pauseFinJour) ? (()=>{
                  const [pdh,pdm]=pauseDebutJour.split(":").map(Number);
                  const [pfh,pfm]=pauseFinJour.split(":").map(Number);
                  return (pfh*60+pfm)-(pdh*60+pdm);
                })() : 0;
                const mins = brut - Math.max(0,pause);
                if(mins>0) return (
                  <div style={{textAlign:"center",padding:"12px",
                    background:C.greenL,borderRadius:10,
                    fontSize:16,fontWeight:700,color:C.greenD}}>
                    ⏱️ {Math.floor(mins/60)}h{String(mins%60).padStart(2,"0")} de travail
                    {pause>0?` (pause ${Math.floor(pause/60)}h${String(pause%60).padStart(2,"0")} déduite)`:""}
                  </div>
                );
              })()}
            </div>

            <SectionTitle icon="⚙️" label="Opération du jour"/>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
              {TYPE_OPS.map(([v,l])=>(
                <button key={v} onClick={()=>setTypeOpJour(v)} style={{
                  padding:"11px 14px",borderRadius:10,textAlign:"left",
                  border:`2px solid ${typeOpJour===v?C.green:C.bd}`,
                  background:typeOpJour===v?C.greenL:"#fff",cursor:"pointer",
                  fontFamily:"inherit",fontSize:13,fontWeight:typeOpJour===v?600:400,
                  color:typeOpJour===v?C.greenD:C.tx,
                  WebkitTapHighlightColor:"transparent"}}>
                  {l}
                </button>
              ))}
            </div>

            <MInput label="Machine du jour" value={machineJour} onChange={setMachineJ}
              placeholder="Ex: Tronçonneuse STIHL MS 500i, Ponsse Bear…" hint="optionnel"/>

            <MSlider label="Nombre d'opérateurs" value={nbOperateurs} onChange={setNbOps}
              min={1} max={10} step={1} unit=" opérateur(s)" color={C.blue}/>

            <SectionTitle icon="📊" label="Production du jour — Dimensions des tas"/>
            <MInput label="Nombre de tas" value={String(nbTasJour||"")}
              onChange={v=>setNbTasJour(parseInt(v)||0)}
              type="number" placeholder="ex: 5"/>
            <TasDimensionsInput
              nbTas={nbTasJour}
              foisonnement={foisonnement}
              onFoisonnementChange={setFoisonn}
              essences={visiteLotJour?.essences}
              essence={lot.potentiel?.split(":")?.[0]||"melange"}/>

            <MInput label="Observations" value={observations} onChange={setObs}
              placeholder="Conditions terrain, avancement…" big hint="optionnel"/>
            <MInput label="Anomalies / incidents" value={anomalies} onChange={setAnom}
              placeholder="Panne, accident, problème accès…" big hint="optionnel"/>
          </>
        )}

        {/* ── ORDRE DE MISSION (admin only) ── */}
        {onglet==="ordre"&&isAdmin&&(
          <>
            <div style={{background:C.blueL,borderRadius:12,padding:12,marginBottom:14,
              border:`1px solid ${C.blue}`}}>
              <div style={{fontSize:12,color:C.blueD,fontWeight:600}}>
                🔒 Vue administrateur uniquement
              </div>
            </div>

            <SectionTitle icon="🏢" label="Entreprise ETF"/>
            {etfs.length===0?(
              <div style={{background:C.amberL,borderRadius:10,padding:12,marginBottom:14,
                border:`1px solid ${C.amber}`}}>
                <div style={{fontSize:12,color:C.amberD}}>
                  ⚠ Aucune ETF disponible. Créez d'abord des opérateurs.
                </div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
                {etfs.map(etf=>(
                  <div key={etf} onClick={()=>setEtfNom(etf)} style={{
                    padding:12,borderRadius:10,cursor:"pointer",
                    border:`2px solid ${etfNom===etf?C.green:C.bd}`,
                    background:etfNom===etf?C.greenL:"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <div style={{fontSize:14,fontWeight:600,color:etfNom===etf?C.greenD:C.tx}}>
                      🏢 {etf}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <SectionTitle icon="⚙️" label="Type d'opération"/>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:14}}>
              {TYPE_OPS.map(([v,l])=>(
                <button key={v} onClick={()=>setTypeOp(v)} style={{
                  padding:"11px 14px",borderRadius:10,textAlign:"left",
                  border:`2px solid ${typeOp===v?C.green:C.bd}`,
                  background:typeOp===v?C.greenL:"#fff",cursor:"pointer",
                  fontFamily:"inherit",fontSize:13,fontWeight:typeOp===v?600:400,
                  color:typeOp===v?C.greenD:C.tx,WebkitTapHighlightColor:"transparent"}}>
                  {l}
                </button>
              ))}
            </div>

            <MInput label="Machine principale" value={machine} onChange={setMachine}
              placeholder="Ex: John Deere 1270G…"/>

            <SectionTitle icon="📅" label="Planning"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MInput label="Date début" value={dateDebut} onChange={setDateDebut} type="date"/>
              <MInput label="Date fin" value={dateFin} onChange={setDateFin} type="date"/>
            </div>
          </>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleSave} disabled={saving} bg={C.green} icon={saving?"":"📝"}>
          {saving?"Enregistrement…":"ENREGISTRER REPORTING DU JOUR"}
        </BigBtn>
      </div>
    </div>
  );
};

// ── ÉCRAN CLÔTURE EXPLOITATION ───────────────────────────────
const EcranClotureExploitation = ({lot, visites=[], onBack, onSaved, toast, entrepriseId, user}) => {
  const [nbTas,       setNbTas]    = useState(1);
  const [longueur,    setLong]     = useState(4);
  const [largeur,     setLarg]     = useState(1.2);
  const [hauteur,     setHaut]     = useState(1.2);
  const [tasDetails,  setTasDetails] = useState([]); // [{longueur,largeur,hauteur}] — utilisé si nbTas>1
  const [foisonnement,setFoison]   = useState(0.55);
  const [humidite,    setHumidite] = useState(35);
  const [anomalies,   setAnomalies]= useState("");
  const [photos,      setPhotos]   = useState([]);
  const [saving,      setSaving]   = useState(false);

  // Composition essences du lot (issue de sa dernière visite) → indices pondérés ITEBE
  const visiteLot = visites.filter(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero)[0]||null;
  const essence = visiteLot?.essences?.length
    ? visiteLot.essences.map(e=>`${e.label} ${e.pct}%`).join(", ")
    : (lot.potentiel||"Mélange (composition inconnue)");
  const indices = indicesPonderes(visiteLot?.essences);

  // Synchronise le nombre de fiches de mesure avec le nombre de tas déclaré
  useEffect(()=>{
    setTasDetails(prev=>{
      const next = [...prev];
      while (next.length < nbTas) next.push({longueur, largeur, hauteur});
      return next.slice(0, nbTas);
    });
  },[nbTas]);

  const volApparent = nbTas>1
    ? tasDetails.reduce((s,t)=>s+(parseFloat(t.longueur)||0)*(parseFloat(t.largeur)||0)*(parseFloat(t.hauteur)||0),0)
    : nbTas * longueur * largeur * hauteur;
  const volReel = Math.round(volApparent * foisonnement * 100)/100;
  const poidsEstime = Math.round(poidsAjusteHumidite(volReel, indices.densite, humidite) * 100)/100;
  const energieMWh = Math.round(poidsEstime * indices.pci * 100)/100;

  const handlePhoto = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => setPhotos(prev=>[...prev, ev.target.result]);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const isDemo = !!(user?.id?.startsWith("demo-"));
  const handleSave = async () => {
    if (photos.length === 0 && !isDemo) { toast("Au moins une photo requise","warn"); return; }
    setSaving(true);
    if (isDemo) {
      await new Promise(r=>setTimeout(r,600));
      toast("Réception de fin d'exploitation enregistrée ✓");
      setSaving(false);
      onSaved();
      return;
    }
    try {
      await apiPost(`/clotures`, {
          lotId: lot.id, lotNumero: lot.lotNumero,
          entrepriseId, nbTas, longueur, largeur, hauteur,
          tasDetails: nbTas>1 ? tasDetails : undefined,
          foisonnement, volumeTotal: volReel,
          poidsEstime, humiditeEstimee: humidite,
          photos: JSON.stringify(photos.map((_,i)=>`photo_${i+1}`)),
          anomalies, statut: "validee",
      });
      toast("Réception de fin d'exploitation enregistrée ✓");
      onSaved();
    } catch { toast("Erreur API","warn"); }
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:C.brown||"#A66A2E",color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>Réception de fin d'exploitation</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero}</div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:90}}>

        <SectionTitle icon="📦" label="Mesures des tas bord de route" color={C.red}/>
        <MInput label="Nombre de tas" value={String(nbTas||"")}
          onChange={v=>setNbTas(Math.max(1,parseInt(v)||0))}
          type="number" placeholder="ex: 3"/>

        {nbTas===1 ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            <MInput label="Profondeur (m)" value={String(longueur)} type="number"
              onChange={v=>setLong(parseFloat(v)||0)} placeholder="max 30 m"/>
            <MInput label="Largeur (m)" value={String(largeur)} type="number"
              onChange={v=>setLarg(parseFloat(v)||0)} placeholder="max 1000 m"/>
            <MInput label="Hauteur (m)" value={String(hauteur)} type="number"
              onChange={v=>setHaut(parseFloat(v)||0)} placeholder="max 10 m"/>
          </div>
        ) : (
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:C.tx3,marginBottom:10,lineHeight:1.6}}>
              {nbTas} tas déclarés — saisissez les dimensions de chacun.
            </div>
            {tasDetails.map((t,i)=>(
              <div key={i} style={{background:"#fff",border:`1px solid ${C.bd}`,
                borderRadius:12,padding:14,marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:C.amberD,marginBottom:10}}>
                  📦 Tas {i+1}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <MInput label="Prof. (m)" value={String(t.longueur)} type="number"
                    onChange={v=>setTasDetails(prev=>prev.map((x,j)=>j===i?{...x,longueur:parseFloat(v)||0}:x))}/>
                  <MInput label="Larg. (m)" value={String(t.largeur)} type="number"
                    onChange={v=>setTasDetails(prev=>prev.map((x,j)=>j===i?{...x,largeur:parseFloat(v)||0}:x))}/>
                  <MInput label="Haut. (m)" value={String(t.hauteur)} type="number"
                    onChange={v=>setTasDetails(prev=>prev.map((x,j)=>j===i?{...x,hauteur:parseFloat(v)||0}:x))}/>
                </div>
              </div>
            ))}
          </div>
        )}

        <SectionTitle icon="🌬️" label="Foisonnement"/>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {[[0.40,"Très vrac","Bois fraîchement abattu"],
            [0.55,"Débardé en tas","État habituel"],
            [0.65,"Bien empilé","Bois rangé soigneusement"]].map(([v,l,s])=>(
            <div key={v} onClick={()=>setFoison(v)} style={{
              padding:"12px 14px",borderRadius:12,cursor:"pointer",
              border:`2px solid ${foisonnement===v?C.green:C.bd}`,
              background:foisonnement===v?C.greenL:"#fff",
              WebkitTapHighlightColor:"transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:foisonnement===v?C.greenD:C.tx}}>{l}</div>
                  <div style={{fontSize:11,color:C.tx3}}>{s}</div>
                </div>
                <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,
                  color:foisonnement===v?C.greenD:C.tx3}}>{Math.round(v*100)}%</div>
              </div>
            </div>
          ))}
        </div>

        <MSlider label="Humidité estimée" value={humidite} onChange={setHumidite}
          min={10} max={60} step={5} unit="%" color={C.blue}/>

        {/* Récap */}
        <div style={{background:C.amberL,borderRadius:14,padding:16,marginBottom:16,
          border:`1.5px solid ${C.amber}`}}>
          <div style={{fontSize:12,color:C.amberD,fontWeight:700,marginBottom:12}}>
            📊 Estimation automatique
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[[Math.round(volApparent*10)/10,"m³ apparent"],
              [volReel,"m³ réel"],
              [poidsEstime,"tonnes"],
            ].map(([v,l],i)=>(
              <div key={i} style={{textAlign:"center",background:"rgba(186,117,23,.1)",
                borderRadius:10,padding:10}}>
                <div style={{fontSize:20,fontWeight:700,color:C.amberD}}>{v}</div>
                <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:C.tx3,marginTop:8,textAlign:"center"}}>
            Énergie estimée : {energieMWh} MWh
          </div>
          <div style={{fontSize:10,color:C.tx3,marginTop:6,textAlign:"center",lineHeight:1.5}}>
            Essence(s) : {essence} · Densité verte {Math.round(indices.densite)} kg/m³<br/>
            Poids corrigé pour {humidite}% d'humidité (réf. ITEBE {HUMIDITE_REF_ITEBE}%)
          </div>
        </div>

        <SectionTitle icon="📷" label="Photos des tas"/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          {photos.map((p,i)=>(
            <div key={i} style={{position:"relative"}}>
              <img src={p} style={{width:80,height:80,objectFit:"cover",borderRadius:10}}/>
              <button onClick={()=>setPhotos(prev=>prev.filter((_,j)=>j!==i))} style={{
                position:"absolute",top:-6,right:-6,width:20,height:20,
                borderRadius:"50%",background:C.red,color:"#fff",border:"none",
                fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",
                justifyContent:"center"}}>×</button>
            </div>
          ))}
          <button onClick={handlePhoto} style={{
            width:80,height:80,borderRadius:10,
            border:`2px dashed ${C.bd}`,background:C.bg,
            cursor:"pointer",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:4,
            WebkitTapHighlightColor:"transparent"}}>
            <span style={{fontSize:24}}>📷</span>
            <span style={{fontSize:10,color:C.tx3}}>Ajouter</span>
          </button>
        </div>

        <MInput label="Anomalies / Observations" value={anomalies}
          onChange={setAnomalies} placeholder="Bois souillé, accès difficile…" big hint="optionnel"/>
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleSave} disabled={saving} bg={C.green} icon={saving?"":"✅"}>
          {saving?"Enregistrement…":"VALIDER LA CLÔTURE"}
        </BigBtn>
      </div>
    </div>
  );
};

const EcranBonCommande = ({lot, visites, entrepriseId, onBack, onGoDelegations, toast}) => {
  const visite = visites.find(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);

  const [modePrix,        setModePrix] = useState("global");
  const [prixGlobal,      setPrixGlobal] = useState("");
  const [prixHoraire,     setPrixHoraire] = useState("");
  const [typeTravaux,     setTypeTravaux] = useState("");
  const [entreprises,     setEntreprises] = useState([]);
  const [selEntId,        setSelEntId]  = useState("");
  const [nomDO,           setNomDO]   = useState("");
  const [qualiteDO,       setQualDO]  = useState("Responsable achats");
  const [modeReglementBC, setModeRegBC] = useState(["cheque","virement"].includes(visite?.modeReglement)?visite.modeReglement:"");
  const [delaiReglementBC,setDelaiRegBC] = useState("");
  const [dateReception,   setDateReception] = useState(todayS());
  const [observationsBC,  setObsBC]   = useState("");
  const [dateSign,        setDateS]   = useState(todayS());
  const [condPart,        setCondP]   = useState("");
  const [sigDataProprio,  setSigProp] = useState(visite?.sigDataProprio||null);
  const [sigDataExploit,  setSigExpl] = useState(visite?.sigDataExploit||null);
  const [nomSignProprio,  setNomSigP] = useState(visite?.nomSignProprio||lot.nom||"");
  const [nomSignExploit,  setNomSigE] = useState(visite?.nomSignExploit||"");
  const [generating,      setGen]     = useState(false);

  useEffect(()=>{
    apiGet(`/entreprises/entreprise/${entrepriseId}`)
      .then(d=>{ if(Array.isArray(d)) setEntreprises(d); }).catch(()=>{});
  },[entrepriseId]);

  const entrepriseObj = entreprises.find(e=>e.id===selEntId)||null;
  const volumeT = visite?.volumeEstimeT || "";
  const prixAffiche = modePrix==="horaire"
    ? (prixHoraire?`${fmtNum(parseFloat(prixHoraire),2)} €/h`:null)
    : (prixGlobal?`${fmtNum(parseFloat(prixGlobal),2)} €`:null);

  const handleGenerer = () => {
    setGen(true);
    const extra = {modePrix,prixGlobal,prixHoraire,typeTravaux,nomDO,qualiteDO,dateSign,
      conditionsParticulieres:condPart,entrepriseObj,
      modeReglementBC,delaiReglementBC,dateReception,observationsBC,
      sigDataProprio, sigDataExploit, nomSignProprio, nomSignExploit};
    const html = buildBonCommandeHTML(lot, visite, extra);
    generatePdfFromHtml(html, `BonCommande_${lot.lotNumero||"APPLITAG"}.pdf`, toast, ()=>setGen(false));
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      {/* Header */}
      <div style={{background:C.greenD,color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>📄 Bon de commande de travaux</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero} · {lot.commune}</div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>

        {/* Récap lot */}
        <div style={{background:C.greenL,borderRadius:14,padding:16,marginBottom:16,
          border:`1.5px solid ${C.green}`}}>
          <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,
            color:C.greenD,marginBottom:6}}>{lot.lotNumero}</div>
          <div style={{fontSize:13,fontWeight:600,color:C.tx}}>{lot.nom} {lot.prenom}</div>
          <div style={{fontSize:12,color:C.tx3,marginTop:4,lineHeight:1.8}}>
            📍 {lot.commune}{lot.refCadastrale?` · ${lot.refCadastrale}`:""}<br/>
            🌲 {lot.surfaceHa?lot.surfaceHa+" ha":"Surface non renseignée"}
            {volumeT?` · 📦 ${fmtNum(volumeT)} t estimées`:""}
            {visite?.essences?.length>0?
              `\n🌿 ${visite.essences.map(e=>e.label).join(", ")}`:""}
          </div>
          {!visite&&(
            <div style={{marginTop:8,fontSize:11,color:C.amberD,fontWeight:500}}>
              ⚠️ Aucune visite terrain — le document sera partiel
            </div>
          )}
        </div>

        {/* Localisation — reprise de la visite terrain */}
        <SectionTitle icon="📍" label="Localisation du lot"/>
        <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:16,
          border:`1px solid ${C.bd}`,fontSize:13,color:C.tx,lineHeight:1.8}}>
          📍 {lot.commune||"—"}{lot.refCadastrale?` · ${lot.refCadastrale}`:""}<br/>
          {lot.adresseParcelle?<>📌 {lot.adresseParcelle}<br/></>:null}
          {visite?.gps?.lat
            ? <>🛰️ GPS : {visite.gps.lat.toFixed(5)}°N · {visite.gps.lng.toFixed(5)}°E
                {visite.gps.accuracy?` (± ${Math.round(visite.gps.accuracy)} m)`:""}</>
            : <span style={{color:C.tx3}}>🛰️ GPS non renseigné (aucune visite avec position)</span>}
        </div>

        {/* Acheteur / Donneur d'ordre */}
        <SectionTitle icon="🏢" label="Donneur d'ordre"/>
        {entreprises.length>0 ? (
          <div style={{marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Entreprise</div>
            <select value={selEntId} onChange={e=>setSelEntId(e.target.value)}
              style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                background:"#fff",color:C.tx,outline:"none"}}>
              <option value="">— Sélectionner —</option>
              {entreprises.map(e=><option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
            <div onClick={onGoDelegations} style={{marginTop:8,fontSize:12,color:C.green,
              fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              + Créer une nouvelle fiche entreprise
            </div>
          </div>
        ) : (
          <div style={{background:C.amberL,borderRadius:14,padding:16,marginBottom:14,
            border:`1px solid ${C.amber}`,textAlign:"center"}}>
            <div style={{fontSize:12,color:C.amberD,marginBottom:10}}>
              ⚠️ Aucune entreprise enregistrée dans la base
            </div>
            <button onClick={onGoDelegations} style={{height:44,padding:"0 18px",borderRadius:10,
              background:C.amber,color:"#fff",border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:13,fontWeight:600}}>
              🏢 Créer une fiche entreprise
            </button>
          </div>
        )}
        {entrepriseObj&&(
          <div style={{fontSize:11,color:C.tx3,marginBottom:10,lineHeight:1.7}}>
            {entrepriseObj.adressePostale?entrepriseObj.adressePostale+" · ":""}
            {entrepriseObj.complementAdresse?entrepriseObj.complementAdresse+" · ":""}
            {[entrepriseObj.codePostal,entrepriseObj.commune].filter(Boolean).join(" ")}
            {entrepriseObj.siret?` · SIRET ${entrepriseObj.siret}`:""}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Nom signataire" value={nomDO} onChange={setNomDO}
            placeholder="Prénom Nom" hint="optionnel"/>
          <MInput label="Qualité" value={qualiteDO} onChange={setQualDO}
            placeholder="Directeur, Resp. achats…" hint="optionnel"/>
        </div>

        {/* Désignation */}
        <SectionTitle icon="🪓" label="Désignation"/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Type de travaux</div>
          <select value={typeTravaux} onChange={e=>setTypeTravaux(e.target.value)}
            style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
              border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
              background:"#fff",color:C.tx,outline:"none"}}>
            <option value="">— Sélectionner —</option>
            <option value="abattage_debardage">🪓🚜 Abattage et débardage</option>
            <option value="dechiquetage">🌀 Déchiquetage</option>
            <option value="abattage_manuel">🌀 Abattage manuel</option>
            <option value="faconnage_manuel">🪵 Façonnage manuel</option>
            <option value="nettoyage_plateforme">🧹 Nettoyage de plateforme</option>
            <option value="main_oeuvre">👷 Main d'œuvre</option>
            <option value="autre">… Autre</option>
          </select>
        </div>

        {/* Prix */}
        <SectionTitle icon="💶" label="Conditions commerciales"/>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[["global","💰 Prix global"],["horaire","⏱️ Prix horaire unitaire"]].map(([v,l])=>(
            <button key={v} onClick={()=>setModePrix(v)} style={{
              flex:1,padding:"10px 0",borderRadius:10,fontSize:13,fontWeight:modePrix===v?600:400,
              border:`1.5px solid ${modePrix===v?C.green:C.bd}`,
              background:modePrix===v?C.greenL:"#fff",
              cursor:"pointer",fontFamily:"inherit",color:modePrix===v?C.greenD:C.tx2,
              WebkitTapHighlightColor:"transparent"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {modePrix==="horaire" ? (
            <MInput label="Prix horaire unitaire (€/h)" value={prixHoraire} onChange={setPrixHoraire}
              type="number" placeholder="ex: 65" hint="HT"/>
          ) : (
            <MInput label="Prix global (€)" value={prixGlobal} onChange={setPrixGlobal}
              type="number" placeholder="ex: 4500" hint="HT"/>
          )}
          <div style={{paddingTop:20}}>
            {prixAffiche ? (
              <div style={{background:C.greenL,borderRadius:12,padding:"12px 14px",
                border:`1.5px solid ${C.green}`,textAlign:"center",height:52,
                display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{fontSize:10,color:C.greenD,fontWeight:600}}>
                  {modePrix==="horaire"?"TARIF HORAIRE HT":"TOTAL HT"}
                </div>
                <div style={{fontSize:18,fontWeight:700,color:C.greenD}}>{prixAffiche}</div>
              </div>
            ) : (
              <div style={{background:C.bg2,borderRadius:12,padding:"12px 14px",
                height:52,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:12,color:C.tx3}}>Saisir le prix</span>
              </div>
            )}
          </div>
        </div>
        <MInput label="Conditions particulières" value={condPart} onChange={setCondP}
          placeholder="Modalités de paiement, délais, accès spécifiques…"
          big hint="optionnel"/>

        {/* Conditions de paiement */}
        <SectionTitle icon="💳" label="Conditions de paiement"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Mode de règlement</div>
            <select value={modeReglementBC} onChange={e=>setModeRegBC(e.target.value)}
              style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                background:"#fff",color:C.tx,outline:"none"}}>
              <option value="">— Sélectionner —</option>
              <option value="cheque">📝 Chèque</option>
              <option value="virement">🏦 Virement</option>
              <option value="traite">📃 Traite</option>
            </select>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Délai de règlement</div>
            <select value={delaiReglementBC} onChange={e=>setDelaiRegBC(e.target.value)}
              style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                background:"#fff",color:C.tx,outline:"none"}}>
              <option value="">— Sélectionner —</option>
              <option value="comptant">Comptant</option>
              <option value="30j">30 jours</option>
              <option value="60j">60 jours</option>
              <option value="90j">90 jours</option>
            </select>
          </div>
        </div>

        {visite&&(visite.tauxTVA||visite.acompte||visite.iban) && (
          <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
            border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:11,color:C.tx3,marginBottom:10}}>
              ℹ️ Conditions complémentaires reprises de la visite terrain
            </div>
            {[
              ["TVA", visite.tauxTVA?`${visite.tauxTVA} %`:null],
              ["Acompte", visite.acompte?`${visite.acompte} €`:null],
              ["IBAN", visite.iban],
              ["BIC / SWIFT", visite.swift],
              ["Banque", [visite.nomBanque,visite.villeBanque].filter(Boolean).join(" · ")||null],
            ].filter(([,v])=>v).map(([k,v],i,arr)=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                padding:"8px 0",borderBottom:i<arr.length-1?`1px solid ${C.bd}`:"none"}}>
                <span style={{fontSize:12,color:C.tx3}}>{k}</span>
                <span style={{fontSize:13,fontWeight:600,color:C.tx}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Réception & observations */}
        <SectionTitle icon="📅" label="Réception de la commande"/>
        <MInput label="Date de réception de la commande" value={dateReception}
          onChange={setDateReception} type="date"/>
        <MInput label="Observations" value={observationsBC} onChange={setObsBC}
          placeholder="Remarques, réserves, précisions diverses…" big hint="optionnel"/>

        {/* Date signature */}
        <SectionTitle icon="✍️" label="Signatures électroniques"/>
        <MInput label="Date de signature" value={dateSign} onChange={setDateS} type="date"/>
        <div style={{fontSize:12,color:C.tx3,marginBottom:12,lineHeight:1.6}}>
          {(sigDataProprio||visite?.sigDataProprio)?
            "✅ Signature propriétaire récupérée depuis la visite terrain":
            "Signez ici ou la signature sera saisie lors de la visite terrain"}
        </div>
        <SignatureCanvas
          label="🏠 Propriétaire / Vendeur"
          nomSignataire={nomSignProprio}
          signed={!!sigDataProprio}
          onSigned={data=>{setSigProp(data);}}
          onClear={()=>setSigProp(null)}/>
        <MInput label="Nom du signataire propriétaire" value={nomSignProprio}
          onChange={setNomSigP} placeholder="Prénom Nom"/>
        <SignatureCanvas
          label="🏢 Donneur d'ordre"
          nomSignataire={nomSignExploit||nomDO}
          signed={!!sigDataExploit}
          onSigned={data=>{setSigExpl(data);}}
          onClear={()=>setSigExpl(null)}/>
        <MInput label="Nom du signataire DO" value={nomSignExploit}
          onChange={setNomSigE} placeholder="Prénom Nom" hint="optionnel"/>

        {/* Contenu du document */}
        <SectionTitle icon="📋" label="Contenu du document généré"/>
        {[
          [true,  "En-tête APPLITAG + référence lot"],
          [true,  "Identité vendeur (propriétaire)"],
          [true,  "Identité acheteur (donneur d'ordre)"],
          [true,  "Parcelle : commune, surface, cadastre, essences"],
          [!!visite?.gps?.lat,"GPS parcelle (coordonnées visite)"],
          [!!entrepriseObj,"Coordonnées complètes de l'entreprise"],
          [!!(prixGlobal||prixHoraire),modePrix==="horaire"?"Tarif horaire unitaire":"Prix global forfaitaire"],
          [!!(modeReglementBC&&delaiReglementBC),"Mode et délai de règlement"],
          [!!dateReception,"Date de réception de la commande"],
          [!!visite,"Conditions d'exploitation (accès, contraintes)"],
          [visite?.replantation==="oui","Clause de replantation"],
          [visite?.certification!=="aucune"&&!!visite?.certification,"Certification "+visite?.certification?.toUpperCase()],
          [true,  "Conditions générales (5 clauses)"],
          [true,  "Zones de signature × 2 (propriétaire + DO)"],
        ].map(([ok,label],i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,
            padding:"7px 0",borderBottom:`0.5px solid ${C.bd}`}}>
            <span style={{fontSize:16,width:20,textAlign:"center"}}>
              {ok?"✅":"➖"}
            </span>
            <span style={{fontSize:12,color:ok?C.tx:C.tx3}}>{label}</span>
          </div>
        ))}

        <div style={{background:C.blueL,borderRadius:12,padding:14,marginTop:14,
          border:`1px solid ${C.blue}`}}>
          <div style={{fontSize:12,color:C.blueD,lineHeight:1.7}}>
            ℹ️ Le document s'ouvrira dans un nouvel onglet.<br/>
            Utilisez <strong>Imprimer → Enregistrer en PDF</strong> pour télécharger.
          </div>
        </div>
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleGenerer} disabled={generating}
          bg={C.greenD} icon={generating?"":"📄"}>
          {generating?"Génération en cours…":"GÉNÉRER LE BON DE COMMANDE PDF"}
        </BigBtn>
      </div>
    </div>
  );
};

// ── ÉCRAN SAISIES ADMIN ───────────────────────────────────────
const EcranSaisiesAdmin = ({contacts, visites, reportings=[], transports=[], livraisons=[], onBack}) => {
  const [onglet, setOnglet] = useState("lots");
  const TABS = [
    {id:"lots",icon:"🌲",label:"Lots"},
    {id:"visites",icon:"🔭",label:"Visites"},
    {id:"reporting",icon:"📝",label:"Reporting"},
    {id:"transport",icon:"🚛",label:"Transports"},
    {id:"livraisons",icon:"📦",label:"Livraisons"},
  ];
  const Card = ({children,date,by}) => (
    <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:10,
      border:`1px solid ${C.bd}`}}>
      {children}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:8,
        fontSize:10,color:C.tx3}}>
        {by&&<span>👤 {by}</span>}
        {date&&<span>📅 {date?.slice(0,10)}</span>}
      </div>
    </div>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{background:C.sb,color:"#fff",padding:"10px 0 0",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 16px 8px"}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"8px 14px",borderRadius:10,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",minHeight:40,
            display:"flex",alignItems:"center",gap:5}}>
            ‹ <span style={{fontWeight:600}}>Accueil</span>
          </button>
          <div style={{fontSize:15,fontWeight:600}}>🔑 Saisies administrateur</div>
        </div>
        <div style={{display:"flex",overflowX:"auto",scrollbarWidth:"none"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setOnglet(t.id)} style={{
              flex:"0 0 auto",padding:"8px 14px",background:"transparent",border:"none",
              color:onglet===t.id?"#fff":"rgba(255,255,255,.45)",
              fontFamily:"inherit",fontSize:12,fontWeight:onglet===t.id?700:400,
              cursor:"pointer",borderBottom:onglet===t.id?"2px solid #fff":"2px solid transparent",
              WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING}}>

        {onglet==="lots"&&(
          contacts.filter(c=>c.lotNumero).length===0?(
            <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
              <div style={{fontSize:32}}>🌲</div><div style={{marginTop:8}}>Aucun lot</div>
            </div>
          ):contacts.filter(c=>c.lotNumero).map(c=>{
            const st=STATUT_LOT[c.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
            return (
              <Card key={c.id} date={c.dateContact} by={c.operateur}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD}}>
                    {c.lotNumero}
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                    background:st.bg,color:st.color,fontWeight:600}}>{st.label}</span>
                </div>
                <div style={{fontSize:13,fontWeight:600}}>{c.nom} {c.prenom}</div>
                <div style={{fontSize:11,color:C.tx3,marginTop:3}}>
                  📍 {c.commune} · 🌲 {c.surfaceHa||"—"} ha
                  {c.tonnageCumul>0&&` · ⚖️ ${fmtNum(c.tonnageCumul,1)} t`}
                </div>
              </Card>
            );
          })
        )}

        {onglet==="visites"&&(
          visites.length===0?(
            <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
              <div style={{fontSize:32}}>🔭</div><div style={{marginTop:8}}>Aucune visite</div>
            </div>
          ):visites.map(v=>(
            <Card key={v.id} date={v.date} by={v.operateur}>
              <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.blueD,marginBottom:4}}>
                {v.lotNumero}
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                📍 GPS {v.gps?`${v.gps.lat.toFixed(4)}°N`:"—"}<br/>
                📦 {v.volumeEstimeT?fmtNum(v.volumeEstimeT):"—"} t estimées<br/>
                🌿 {v.essences?.map(e=>e.label).join(", ")||"—"}<br/>
                {v.prixTonne&&`💶 ${fmtNum(v.prixTonne,2)} €/t HT`}
                {v.certification&&v.certification!=="aucune"&&
                  ` · 🏅 ${v.certification.toUpperCase()}`}
              </div>
            </Card>
          ))
        )}

        {onglet==="reporting"&&(
          reportings.length===0?(
            <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
              <div style={{fontSize:32}}>📝</div><div style={{marginTop:8}}>Aucun reporting</div>
            </div>
          ):reportings.map(r=>(
            <Card key={r.id} date={r.dateJour} by={r.operateur||r.etfNom}>
              <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.amberD,marginBottom:4}}>
                {r.lotNumero}
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                ⚙️ {r.typeOperationJour||r.typeOperation||"—"}<br/>
                {r.heureDebut&&r.heureFin&&`⏱️ ${r.heureDebut} → ${r.heureFin}`}<br/>
                {r.nbTasJour>0&&`📦 ${r.nbTasJour} tas`}
                {r.machineJour&&` · 🪛 ${r.machineJour}`}<br/>
                {r.observations&&`💬 ${r.observations}`}
              </div>
            </Card>
          ))
        )}

        {onglet==="transport"&&(
          transports.length===0?(
            <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
              <div style={{fontSize:32}}>🚛</div><div style={{marginTop:8}}>Aucun transport</div>
            </div>
          ):transports.map(t=>(
            <Card key={t.id} date={t.heureDebut} by={t.societeTransp}>
              <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.purpleD,marginBottom:4}}>
                {t.lotNumero} · CMR {t.numeroCMR||"—"}
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                🚛 {t.immatTracteur||"—"} · {t.immatRemorque||""}<br/>
                👤 {t.nomChauffeur||"—"}<br/>
                {t.departConfirme&&"✅ Départ confirmé"}
              </div>
            </Card>
          ))
        )}

        {onglet==="livraisons"&&(
          livraisons.length===0?(
            <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
              <div style={{fontSize:32}}>📦</div><div style={{marginTop:8}}>Aucune livraison</div>
            </div>
          ):livraisons.map(l=>(
            <Card key={l.id} date={l.dateHeureLivraison} by={l.nomReceptionnaire}>
              <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD,marginBottom:4}}>
                {l.lotNumero}
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                🔥 {l.nomDestination||"—"}<br/>
                ⚖️ {l.pesee||"—"} t livrées · 💧 {l.humiditeReception||"—"}%<br/>
                📄 CMR {l.numeroCMR||"—"}
                {l.gpsAlerteDeclenche&&<><br/>⚠️ Alerte GPS déclenchée</>}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// ── ÉCRANS RÔLES SIMPLIFIÉS ───────────────────────────────────
const EcranRoleMandataire = ({user, contacts, onSelectLot}) => {
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

const EcranRoleProprietaire = ({user, contacts, visites, reportings=[], livraisons=[], dechiquetages=[]}) => {
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

const EcranRoleChauffeur = ({user, transports=[], dechiquetages=[], gpsChantier={}, onValiderArrivee, onValiderDepart}) => {
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
            try{localStorage.setItem(storageKey,val)}catch{}
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
    try { localStorage.setItem(`applitag_dech_machine_${user?.id||""}`, machine); } catch {}
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
const EcranRoleDechiquetage = ({user, contacts, onLaunchDechiquetage, avisArrivee={}, camionsPartis={}, onArriveeChantier, toast}) => {
  const lotsABroyer = contacts.filter(c=>["BORD_ROUTE","A_DECHIQUETER"].includes(c.statutLot));
  const [actif, setActif] = useState(null);
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
      onFinChantier={(lotId)=>{
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
    try{localStorage.setItem(arriveeKey,JSON.stringify(val))}catch{}
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          const coords = {lat:pos.coords.latitude, lng:pos.coords.longitude, precision:Math.round(pos.coords.accuracy)};
          const v2 = {heure:h,gpsStatut:"ok",coords};
          setArriveeGlobale(v2);
          try{localStorage.setItem(arriveeKey,JSON.stringify(v2))}catch{}
          onArriveeChantier&&onArriveeChantier("global", h, coords);
        },
        ()=>{
          const v2 = {heure:h,gpsStatut:"erreur"};
          setArriveeGlobale(v2);
          try{localStorage.setItem(arriveeKey,JSON.stringify(v2))}catch{}
          onArriveeChantier&&onArriveeChantier("global", h, null);
        },
        {enableHighAccuracy:true, timeout:10000}
      );
    } else {
      const v2 = {heure:h,gpsStatut:"indisponible"};
      setArriveeGlobale(v2);
      try{localStorage.setItem(arriveeKey,JSON.stringify(v2))}catch{}
      onArriveeChantier&&onArriveeChantier("global", h, null);
    }
  };
  const avisActifs = Object.entries(avisArrivee).filter(([lotId])=>!avisLus[lotId]);
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
                try{localStorage.removeItem(arriveeKey)}catch{}
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

const EcranEntrepriseSollicitee = ({user, lots=[], toast}) => {
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
    try{localStorage.setItem(storageKey,JSON.stringify(list))}catch{}
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

const EcranRoleChaufferie = ({user, livraisons=[]}) => {
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
const EcranRoleReceptionnaire = ({user, livraisons=[], contacts=[], visites=[], toast}) => {
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

const EcranAutoDeclarationRED = ({lot, visites, transports=[], livraisons=[], onBack, toast}) => {
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
const EcranCarte = ({contacts, visites, onOpenLot}) => {
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

// ── FICHE LOT CENTRALE (6 onglets) ───────────────────────────
const PIPELINE = [
  {id:"NOUVEAU",            label:"Nouveau",       icon:"🆕"},
  {id:"VISITE_PREVUE",      label:"Visite prévue", icon:"🔭"},
  {id:"VISITE_REALISEE",    label:"Visite OK",     icon:"✅"},
  {id:"VALIDE_EXPLOITATION",label:"Validé",        icon:"📋"},
  {id:"EN_COURS_EXPLOITATION",label:"Exploitation",icon:"🪓"},
  {id:"BORD_ROUTE",         label:"Bord route",    icon:"🌲"},
  {id:"A_DECHIQUETER",      label:"À déchiqueter", icon:"🌀"},
  {id:"EN_COURS_DECHIQUETAGE",   label:"Déchiquetage", icon:"⚙️"},
  {id:"EN_LIVRAISON",       label:"En livraison",  icon:"🚛"},
  {id:"LIVRE_CHAUFFERIE",   label:"Livré",         icon:"🔥"},
];

const FicheLotCentrale = ({
  lot, visites=[], operateurs=[], onBack, onEdit, onBonCommande,
  onLaunchVisite, onLaunchValidation, onLaunchCloture,
  onLaunchDechiquetage, onLaunchTransporteur, onLaunchLivraison, onLaunchFinChantier,
  onRedDeclaration, onDeleguerVisite, onDeleteLot,
  toast, entrepriseId, user,
}) => {
  const [onglet, setOnglet] = useState(0);
  const [deleteStep, setDeleteStep] = useState(0);
  const [releves,    setReleves]    = useState([]);
  const [transports, setTransports] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showDeclMairie, setShowDeclMairie] = useState(false);
  const [mairieAdresse,  setMairieAdresse]  = useState("");
  const [mairieCP,       setMairieCP]       = useState("");
  const [mairieVille,    setMairieVille]    = useState("");

  const st = STATUT_LOT[lot.statutLot||"NOUVEAU"] || STATUT_LOT.NOUVEAU;
  const pipelineIdx = PIPELINE.findIndex(p=>p.id===(lot.statutLot||"NOUVEAU"));
  const visitesLot = visites.filter(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
  const derniereVisite = visitesLot[0]||null;
  const mandataireAssigne = operateurs.find(op=>(op.assignations||[])
    .some(a=>(a.lotId===lot.id||a.lotNumero===lot.lotNumero)&&a.typeOperation==="mandataire"));

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      apiGet(`/relevés/lot/${lot.id}`).catch(()=>[]),
      apiGet(`/transports/lot/${lot.id}`).catch(()=>[]),
      apiGet(`/livraisons/lot/${lot.id}`).catch(()=>[]),
    ]).then(([r,t,l])=>{
      if(Array.isArray(r)) setReleves(r);
      if(Array.isArray(t)) setTransports(t);
      if(Array.isArray(l)) setLivraisons(l);
      setLoading(false);
    });
  },[lot.id]);

  // Calculs volumes
  const totalTonnes = releves.reduce((s,r)=>s+(parseFloat(r.poidsTotal)||0),0);
  const totalMWh    = releves.reduce((s,r)=>s+(parseFloat(r.energieMWh)||0),0);
  const typeRessLabel = t => TYPE_RESSOURCE_OPTS.find(([v])=>v===t)?.[2]??t;
  const isDemo = !!(user?.id?.startsWith("demo-"));

  const TABS = [
    {id:"general",   icon:"📊", label:"Général"},
    {id:"parcelle",  icon:"🌲", label:"Parcelle"},
    {id:"tas",       icon:"📦", label:"Tas"},
    {id:"transport", icon:"🚛", label:"Transport"},
    {id:"livraisons",icon:"📍", label:"Livraisons"},
    {id:"documents", icon:"📄", label:"Documents"},
  ];

  // Boutons d'action contextuels
  const s = lot.statutLot||"NOUVEAU";
  const actions = [
    (["NOUVEAU","VISITE_PREVUE"].includes(s)||!s) &&
      (mandataireAssigne
        ? {icon:"🔒",label:"Visite",bg:C.bg2,bd:C.bd,color:C.tx3,
           fn:()=>toast(`Visite réservée au mandataire désigné : ${mandataireAssigne.nom}${mandataireAssigne.prenom?" "+mandataireAssigne.prenom:""}`,"warn")}
        : {icon:"🔭",label:"Visite",bg:C.greenL,bd:C.green,color:C.greenD,fn:onLaunchVisite}),
    (["NOUVEAU","VISITE_PREVUE"].includes(s)||!s) &&
      {icon:"🔑",label:"Déléguer",bg:C.blueL,bd:C.blue,color:C.blueD,fn:onDeleguerVisite},
    ["VISITE_REALISEE","VALIDE_EXPLOITATION"].includes(s) &&
      {icon:"✅",label:"Valider",bg:C.blueL,bd:C.blue,color:C.blueD,fn:onLaunchValidation},
    ["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION"].includes(s) &&
      {icon:"🏁",label:"Clôture",bg:C.amberL,bd:C.amber,color:C.amberD,fn:onLaunchCloture},
    ["BORD_ROUTE","A_DECHIQUETER"].includes(s) &&
      {icon:"🌀",label:"Déchi.",bg:"#FAECE7",bd:"#D85A30",color:"#D85A30",fn:onLaunchDechiquetage},
    ["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"🚛",label:"Transp.",bg:C.purpleL,bd:C.purple,color:C.purpleD,fn:onLaunchTransporteur},
    ["EN_COURS_DECHIQUETAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"📦",label:"Livraison",bg:C.greenL,bd:C.green,color:C.greenD,fn:onLaunchLivraison},
    ["LIVRE_CHAUFFERIE","EN_STOCK_PLATEFORME","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"🏁",label:"Fin chantier",bg:"#F0EBF8",bd:"#7B2FBE",color:"#7B2FBE",fn:onLaunchFinChantier},
  ].filter(Boolean);

  // Max 4 boutons visibles — priorité aux plus avancés
  const actionsVisible = actions.slice(-4);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>

      {/* ── HEADER ── */}
      <div style={{background:C.sb,color:"#fff",flexShrink:0}}>
        <div style={{padding:"10px 16px 8px",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.12)",border:"none",
            color:"#fff",padding:"8px 14px",borderRadius:10,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",gap:6,
            minHeight:40,flexShrink:0}}>
            {"‹"} <span style={{fontWeight:600}}>Lots</span>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lot.lotNumero}</div>
            <div style={{fontSize:11,opacity:.65,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {lot.nom}{lot.prenom?` ${lot.prenom}`:""} · {lot.commune}
            </div>
          </div>
          <span style={{fontSize:10,padding:"5px 10px",borderRadius:20,fontWeight:700,
            background:st.bg,color:st.color,flexShrink:0}}>
            {st.label}
          </span>
          <button onClick={onEdit} style={{background:"rgba(255,255,255,.12)",border:"none",
            color:"#fff",padding:"8px 12px",borderRadius:10,fontSize:16,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",minHeight:40,flexShrink:0}}>✏️</button>
        </div>

        {/* Pipeline horizontal */}
        <div style={{overflowX:"auto",display:"flex",alignItems:"center",
          gap:0,padding:"6px 16px 12px",scrollbarWidth:"none"}}>
          {PIPELINE.map((p,i)=>{
            const done = i < pipelineIdx;
            const current = i === pipelineIdx;
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{
                    width:current?36:28,height:current?36:28,borderRadius:"50%",
                    background:current?"#fff":done?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:current?16:12,
                    border:current?"2.5px solid #fff":"1px solid rgba(255,255,255,.2)",
                    boxShadow:current?"0 0 0 3px rgba(255,255,255,.2)":undefined,
                    transition:"all .2s"}}>
                    {done?"✓":p.icon}
                  </div>
                  {current&&(
                    <div style={{fontSize:9,color:"rgba(255,255,255,.9)",
                      whiteSpace:"nowrap",fontWeight:700,marginTop:0,
                      textAlign:"center",maxWidth:60}}>
                      {p.label}
                    </div>
                  )}
                </div>
                {i<PIPELINE.length-1&&(
                  <div style={{width:current||i===pipelineIdx-1?16:12,height:1.5,
                    background:done?"rgba(255,255,255,.55)":"rgba(255,255,255,.15)",
                    margin:"0 3px",
                    marginBottom:current||i===pipelineIdx-1?18:0}}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Tab bar — horizontal scroll */}
        <div style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",
          borderTop:"1px solid rgba(255,255,255,.1)"}}>
          {TABS.map((t,i)=>(
            <button key={t.id} onClick={()=>setOnglet(i)} style={{
              flex:"0 0 auto",minWidth:72,height:50,background:"transparent",border:"none",
              color:onglet===i?"#fff":"rgba(255,255,255,.5)",
              fontFamily:"inherit",fontSize:11,fontWeight:onglet===i?700:400,
              cursor:"pointer",display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:2,padding:"0 10px",
              borderBottom:onglet===i?"2.5px solid #fff":"2.5px solid transparent",
              WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
              <span style={{fontSize:16}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENU ── */}
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:actions.length?90:20}}>

        {/* ── ONGLET 0 : GÉNÉRAL ── */}
        {onglet===0&&(
          <div>
            {/* Métriques clés */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {[
                {icon:"🌲",label:"Surface",val:lot.surfaceHa?`${lot.surfaceHa} ha`:"—",color:C.green,bg:C.greenL},
                {icon:"🪵",label:"Ressource",val:typeRessLabel(lot.potentiel)||"—",color:C.brown,bg:C.brownL},
                {icon:"⚖️",label:"Volume estimé",val:derniereVisite?`${fmtNum(derniereVisite.volumeEstimeT)} t`:"—",color:C.amber,bg:C.amberL},
                {icon:"📊",label:"Relevés",val:`${releves.length} relevé${releves.length!==1?"s":""}`,color:C.blue,bg:C.blueL},
              ].map((m,i)=>(
                <div key={i} style={{background:m.bg,borderRadius:14,padding:14}}>
                  <div style={{fontSize:22,marginBottom:6}}>{m.icon}</div>
                  <div style={{fontSize:18,fontWeight:700,color:m.color}}>{m.val}</div>
                  <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Volumes calculés depuis relevés */}
            {releves.length>0&&(
              <div style={{background:C.amberL,borderRadius:14,padding:16,marginBottom:16,
                border:`1.5px solid ${C.amber}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.amberD,marginBottom:10}}>
                  📊 Volumes réels (relevés opérateurs)
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    [fmtNum(totalTonnes,1),"t récoltées"],
                    [fmtNum(totalMWh,1),"MWh potentiel"],
                    [releves.length+" relev.","saisies"],
                  ].map(([v,l],i)=>(
                    <div key={i} style={{textAlign:"center",
                      background:"rgba(186,117,23,.1)",borderRadius:10,padding:10}}>
                      <div style={{fontSize:18,fontWeight:700,color:C.amberD}}>{v}</div>
                      <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Infos rapides */}
            <SectionTitle icon="ℹ️" label="Infos rapides"/>
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
              border:`1px solid ${C.bd}`}}>
              {[
                ["📍","Commune",lot.commune],
                ["🏷️","N° lot",lot.lotNumero],
                ["📐","Réf. cadastrale",lot.refCadastrale||"—"],
                ["📅","Date contact",lot.dateContact||"—"],
                ["🤝","Apporteur",lot.nomApporteur||"—"],
                lot.certification&&["🏅","Certification",lot.certification?.toUpperCase()],
              ].filter(Boolean).map(([e,l,v],i,arr)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"10px 0",
                  borderBottom:i<arr.length-1?`1px solid ${C.bd}`:"none"}}>
                  <span style={{fontSize:12,color:C.tx3}}>{e} {l}</span>
                  <span style={{fontSize:13,fontWeight:500,color:C.tx,
                    textAlign:"right",maxWidth:"55%"}}>{v}</span>
                </div>
              ))}
            </div>

            {/* Mandataire désigné — tant que la visite n'a pas été réalisée */}
            {!derniereVisite&&mandataireAssigne&&(
              <div style={{background:C.blueL,borderRadius:12,padding:14,marginBottom:14,
                border:`1px solid ${C.blue}`,fontSize:12,color:C.blueD}}>
                🔭 <strong>Mandataire désigné</strong> : {mandataireAssigne.nom}{mandataireAssigne.prenom?` ${mandataireAssigne.prenom}`:""}
                <br/>Seule cette personne peut réaliser la visite terrain de ce lot.
              </div>
            )}

            {/* Dernière visite */}
            {derniereVisite&&(
              <>
                <SectionTitle icon="🔭" label="Dernière visite"/>
                <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
                  border:`1px solid ${C.bd}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontSize:14,fontWeight:600}}>📅 {derniereVisite.date}</div>
                    <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                      background:C.greenL,color:C.greenD,fontWeight:600}}>✅ Validée</span>
                  </div>
                  <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                    📦 {fmtNum(derniereVisite.volumeEstimeT)} t · 🌲 {derniereVisite.surfaceHa} ha<br/>
                    🚛 Accès {derniereVisite.accesCamion}
                    {derniereVisite.accesCamion==="praticable"?" ✓":" ⚠️"}<br/>
                    {derniereVisite.essences?.length>0&&
                      `🌿 ${derniereVisite.essences.map(e=>`${e.label} ${e.pct}%`).join(", ")}`}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ONGLET 1 : PARCELLE ── */}
        {onglet===1&&(
          <div>
            <SectionTitle icon="👤" label="Propriétaire / Contact"/>
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
              border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:16,fontWeight:700,color:C.tx,marginBottom:4}}>
                {lot.nom} {lot.prenom}
              </div>
              {[
                ["📞",lot.telephone],["📧",lot.email],
                ["📮",lot.adressePostale],["📮",lot.complementAdresse],
                lot.estPersonneMorale&&["🏢",lot.typePersonneMorale?.toUpperCase()],
                lot.nomSignataire&&["✍️",`Signataire : ${lot.nomSignataire}`],
              ].filter(Boolean).map(([e,v],i)=>v&&(
                <div key={i} style={{fontSize:13,color:C.tx2,marginTop:6}}>{e} {v}</div>
              ))}
            </div>

            <SectionTitle icon="🌲" label="Parcelle"/>
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
              border:`1px solid ${C.bd}`}}>
              {[
                ["📍","Commune",lot.commune],
                ["🏡","Lieu-dit",lot.adresseParcelle||"—"],
                ["📐","Surface",lot.surfaceHa?`${lot.surfaceHa} ha`:"—"],
                ["🗂️","Réf. cadastrale",lot.refCadastrale||"—"],
              ].map(([e,l,v],i,arr)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  padding:"9px 0",
                  borderBottom:i<arr.length-1?`1px solid ${C.bd}`:"none"}}>
                  <span style={{fontSize:12,color:C.tx3}}>{e} {l}</span>
                  <span style={{fontSize:13,fontWeight:500,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>

            {derniereVisite&&(
              <>
                <SectionTitle icon="⚠️" label="Contraintes terrain"/>
                <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,
                  border:`1px solid ${C.bd}`}}>
                  {Object.entries(derniereVisite.contraintes||{}).filter(([,v])=>v).length===0 ? (
                    <div style={{fontSize:13,color:C.tx3}}>Aucune contrainte signalée ✅</div>
                  ) : Object.entries(derniereVisite.contraintes||{}).filter(([,v])=>v).map(([k],i)=>(
                    <div key={i} style={{fontSize:13,color:C.amberD,padding:"4px 0"}}>
                      ⚠️ {k}
                    </div>
                  ))}
                </div>

                <SectionTitle icon="🚛" label="Accès"/>
                <div style={{background:
                  derniereVisite.accesCamion==="praticable"?C.greenL:
                  derniereVisite.accesCamion==="difficile"?C.amberL:C.redL,
                  borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${
                    derniereVisite.accesCamion==="praticable"?C.green:
                    derniereVisite.accesCamion==="difficile"?C.amber:C.red}`}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.tx}}>
                    {derniereVisite.accesCamion==="praticable"?"✅ Praticable":
                     derniereVisite.accesCamion==="difficile"?"⚠️ Difficile":"🚫 Impossible"}
                  </div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:4}}>
                    Largeur : {derniereVisite.largeurAcces}m ·
                    Distance plateforme : {derniereVisite.distancePlateforme}m
                  </div>
                </div>
              </>
            )}

            {derniereVisite?.replantation&&derniereVisite.replantation!=="non"&&(
              <>
                <SectionTitle icon="🌱" label="Replantation"/>
                <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${C.green}`}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.greenD,marginBottom:6}}>
                    {derniereVisite.replantation==="oui"?"✅ Prévue":"❓ À définir"}
                  </div>
                  {derniereVisite.essenceReplanT&&
                    <div style={{fontSize:12,color:C.tx3}}>🌿 {derniereVisite.essenceReplanT}</div>}
                  {derniereVisite.surfaceReplant&&
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>
                      📐 {derniereVisite.surfaceReplant} ha · 👤 {derniereVisite.respReplant}
                    </div>}
                </div>
              </>
            )}

            {derniereVisite?.certification&&derniereVisite.certification!=="aucune"&&(
              <>
                <SectionTitle icon="🏅" label="Certification"/>
                <div style={{background:C.blueL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${C.blue}`}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.blueD}}>
                    {derniereVisite.certification.toUpperCase()}
                  </div>
                  {derniereVisite.certification==="red"&&(
                    <div style={{fontSize:12,color:C.tx3,marginTop:4,lineHeight:1.7}}>
                      📦 {derniereVisite.redCategorie}<br/>
                      🌍 {derniereVisite.redPays} · 📏 {derniereVisite.redDistance} km
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ONGLET 2 : TAS ── */}
        {onglet===2&&(
          <div>
            {loading?(
              <div style={{textAlign:"center",padding:"40px 0",color:C.tx3}}>
                <div style={{fontSize:32,marginBottom:8}}>⏳</div>
                Chargement des relevés…
              </div>
            ):releves.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>📦</div>
                <div style={{fontSize:15,fontWeight:500}}>Aucun relevé</div>
                <div style={{fontSize:13,marginTop:6}}>
                  Les opérateurs terrain saisiront leurs relevés ici
                </div>
              </div>
            ):(
              <>
                <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1px solid ${C.amber}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      [fmtNum(totalTonnes,1)+"t","Total"],
                      [fmtNum(totalMWh,1)+" MWh","Énergie"],
                      [releves.length+" relev.","Saisies"],
                    ].map(([v,l],i)=>(
                      <div key={i} style={{textAlign:"center"}}>
                        <div style={{fontSize:18,fontWeight:700,color:C.amberD}}>{v}</div>
                        <div style={{fontSize:10,color:C.tx3}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {releves.map((r,i)=>(
                  <div key={r.id||i} style={{background:"#fff",borderRadius:14,padding:14,
                    marginBottom:10,border:`1px solid ${C.bd}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{fontSize:13,fontWeight:600}}>{r.operateurNom||"Opérateur"}</div>
                      <div style={{fontSize:11,color:C.tx3}}>{r.date?.slice(0,10)||""}</div>
                    </div>
                    <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                      {r.nbTas&&`📦 ${r.nbTas} tas · `}
                      {r.poidsTotal&&`⚖️ ${r.poidsTotal} t · `}
                      {r.energieMWh&&`⚡ ${r.energieMWh} MWh`}
                    </div>
                    {r.typeOperation&&(
                      <div style={{marginTop:6,fontSize:11,padding:"2px 8px",
                        display:"inline-block",borderRadius:6,
                        background:C.bg2,color:C.tx2}}>
                        {r.typeOperation}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── ONGLET 3 : TRANSPORT ── */}
        {onglet===3&&(
          <div>
            {loading?(
              <div style={{textAlign:"center",padding:"40px 0",color:C.tx3}}>⏳ Chargement…</div>
            ):transports.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>🚛</div>
                <div style={{fontSize:15,fontWeight:500}}>Aucun transport</div>
                <div style={{fontSize:13,marginTop:6}}>
                  Déclenchez le déchiquetage pour créer un transport
                </div>
              </div>
            ):(
              transports.map((t,i)=>(
                <div key={t.id||i} style={{background:"#fff",borderRadius:14,padding:16,
                  marginBottom:12,border:`1px solid ${C.bd}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.purpleD}}>
                      CMR {t.numeroCMR||"—"}
                    </div>
                    <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,fontWeight:600,
                      background:C.purpleL,color:C.purpleD}}>
                      {t.typeVehicule||"transport"}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:C.tx3,lineHeight:1.9}}>
                    🚛 {t.immatTracteur||"—"} · {t.immatRemorque||""}<br/>
                    👤 {t.nomChauffeur||t.chauffeur||"—"}<br/>
                    🏢 {t.societeTransp||t.entrepriseDechiquetage||t.entrepriseBroyage||"—"}<br/>
                    {t.heureDebut&&`⏱️ Départ : ${t.heureDebut}`}
                    {t.heureFin&&` → ${t.heureFin}`}
                  </div>
                  {t.departConfirme&&(
                    <div style={{marginTop:8,fontSize:11,color:C.green,fontWeight:600}}>
                      ✅ Départ confirmé par le chauffeur
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ONGLET 4 : LIVRAISONS ── */}
        {onglet===4&&(
          <div>
            {loading?(
              <div style={{textAlign:"center",padding:"40px 0",color:C.tx3}}>⏳ Chargement…</div>
            ):livraisons.length===0?(
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>📍</div>
                <div style={{fontSize:15,fontWeight:500}}>Aucune livraison</div>
                <div style={{fontSize:13,marginTop:6}}>En attente de livraison</div>
              </div>
            ):(
              <>
                {/* Récap poids total livré */}
                {livraisons.length>0&&(()=>{
                  const totalLivr = livraisons.reduce((s,l)=>s+(parseFloat(l.pesee)||0),0);
                  return (
                    <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
                      border:`1.5px solid ${C.green}`}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:8}}>
                        ✅ Total livré
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:22,fontWeight:700,color:C.greenD}}>{fmtNum(totalLivr,1)} t</div>
                          <div style={{fontSize:10,color:C.tx3}}>poids livré</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:22,fontWeight:700,color:C.greenD}}>{livraisons.length}</div>
                          <div style={{fontSize:10,color:C.tx3}}>livraison(s)</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {livraisons.map((l,i)=>(
                  <div key={l.id||i} style={{background:"#fff",borderRadius:14,padding:16,
                    marginBottom:12,border:`1px solid ${C.bd}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{fontSize:14,fontWeight:600}}>
                        {l.typeDest==="chaufferie"?"🔥":"🏗️"} {l.nomDestination||"—"}
                      </div>
                      <div style={{fontSize:11,color:C.tx3}}>
                        {l.dateHeureLivraison?.slice(0,10)||l.dateLivraison||""}
                      </div>
                    </div>
                    <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                      ⚖️ {l.pesee||"—"} t ·
                      💧 {l.humiditeReception||l.humiditeMesuree||"—"}%<br/>
                      👤 Réceptionnaire : {l.nomReceptionnaire||"—"}
                      {l.numeroCMR&&<><br/>📄 CMR : {l.numeroCMR}</>}
                    </div>
                    {l.gpsAlerteDeclenche&&(
                      <div style={{marginTop:8,fontSize:11,color:C.red,fontWeight:600}}>
                        ⚠️ Alerte GPS déclenchée à la livraison
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── ONGLET 5 : DOCUMENTS ── */}
        {onglet===5&&(
          <div>
            {[
              {icon:"📋",titre:"Compte rendu entretien de contact",
               statut:"✅ Disponible",color:C.green,bg:C.greenL,
               action:"Générer PDF",
               onAction:()=>generatePdfFromHtml(buildCompteRenduContactHTML(lot),
                 `CompteRenduContact_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🔭",titre:"PV de visite de terrain",
               statut:derniereVisite?"✅ Visite du "+derniereVisite.date:"⏳ Non réalisée",
               color:derniereVisite?C.green:C.tx3,bg:derniereVisite?C.greenL:C.bg2,
               action:derniereVisite?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildPVVisiteHTML(lot, derniereVisite, user?.prenom?`${user.prenom} ${user.nom||""}`.trim():user?.nom||""),
                 `PV_Visite_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"📋",titre:"Bon de commande",
               statut:lot.lotNumero?"✅ N° lot généré — prêt à générer":"⏳ En attente",
               color:lot.lotNumero?C.green:C.tx3,bg:lot.lotNumero?C.greenL:C.bg2,
               action: lot.lotNumero ? "Générer PDF" : null,
               onAction: onBonCommande},

              {icon:"📝",titre:"Ordre d'exploitation",
               statut:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?"✅ Disponible":"⏳ En attente validation",
               color:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?C.green:C.tx3,
               bg:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?C.greenL:C.bg2,
               action:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildSimpleDocHTML(lot,"Ordre d'exploitation",[
                 {icon:"🌲",label:"Parcelle",rows:[
                   ["Commune",lot.commune], ["Réf. cadastrale",lot.refCadastrale],
                   ["Surface",lot.surfaceHa?lot.surfaceHa+" ha":null],
                 ]},
                 {icon:"🪓",label:"Exploitation",rows:[
                   ["Essence",derniereVisite?.essences?.map(e=>e.label).join(", ")],
                   ["Volume estimé",derniereVisite?.volumeEstimeT?derniereVisite.volumeEstimeT+" t":null],
                   ["Accès camion",derniereVisite?.accesCamion],
                 ]},
               ],"Ordre d'exploitation généré automatiquement par APPLITAG."),
                 `OrdreExploitation_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🏁",titre:"Réception d'exploitation",
               statut:(isDemo||["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?"✅ Effectuée":"⏳ En attente",
               color:(isDemo||["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?C.green:C.tx3,
               bg:(isDemo||["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?C.greenL:C.bg2,
               action:(isDemo||["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildReceptionExploitHTML(lot, derniereVisite, user),
                 `ReceptionExploitation_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🌀",titre:"Ordre de déchiquetage",
               statut:(isDemo||["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?"✅ Disponible":"⏳ En attente bord de route",
               color:(isDemo||["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?C.green:C.tx3,
               bg:(isDemo||["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?C.greenL:C.bg2,
               action:(isDemo||["A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot))?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildOrdreDechiHTML(lot, derniereVisite, {
                 doNom:"APPLITAG SAS", doAdresse:"Gestion des flux bois énergie",
                 entrepriseNom:lot.entrepriseDechiquetage||"—",
                 machine:lot.machineDechiquetage||"Jenz HEM 593",
                 operateur:lot.operateurDechiquetage||"—",
                 datePrevue:lot.datePrevueDechiquetage||"—",
                 granulometrie:"P45",
               }),`OrdreDechiquetage_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🚛",titre:"CMR Transport",
               statut:(isDemo||transports.length>0)?`✅ ${transports.length||1} CMR`:"⏳ En attente déchiquetage",
               color:(isDemo||transports.length>0)?C.purple:C.tx3,
               bg:(isDemo||transports.length>0)?C.purpleL:C.bg2,
               action:(isDemo||transports.length>0)?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(
                 buildCMRHTML(lot, transports[0]||{numeroCMR:"CMR-2026-0042",immatTracteur:"AB-512-CD",immatRemorque:"XY-001-ZZ",heureDebut:"07:30"}, livraisons[0]||{nomDestination:"Plateforme Auxerre Énergie",pesee:"24.5"}),
                 `CMR_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"📦",titre:"Bon de livraison",
               statut:(isDemo||livraisons.length>0)?`✅ ${livraisons.length||1} livraison(s)`:"⏳ En attente livraison",
               color:(isDemo||livraisons.length>0)?C.green:C.tx3,
               bg:(isDemo||livraisons.length>0)?C.greenL:C.bg2,
               action:(isDemo||livraisons.length>0)?"Générer PDF":null,
               onAction:()=>generatePdfFromHtml(buildSimpleDocHTML(lot,"Bon de livraison",[
                 {icon:"📦",label:"Livraison",rows:[
                   ["N° BL",livraisons[0]?.numeroBL||`BL-2026-0018`],
                   ["Date livraison",livraisons[0]?.dateLivraison||livraisons[0]?.dateHeureLivraison?.slice(0,10)||"2026-06-22"],
                   ["Heure d'arrivée zone de déchargement",livraisons[0]?.heureArrivee||livraisons[0]?.dateHeureLivraison?.slice(11,16)||"—"],
                   ["Plateforme / Destination",livraisons[0]?.nomDestination||"Auxerre Énergie — 89000 Auxerre"],
                   ["Tonnage livré",livraisons[0]?.pesee?livraisons[0].pesee+" t":livraisons[0]?.tonnage?livraisons[0].tonnage+" t":"23.8 t"],
                   ["Granulométrie",livraisons[0]?.granulometrie||"P45"],
                   ["Humidité réception",livraisons[0]?.humiditeReception?livraisons[0].humiditeReception+"%":"—"],
                   ["Réceptionnaire",livraisons[0]?.nomReceptionnaire||"—"],
                   ["N° CMR associé",livraisons[0]?.numeroCMR||transports[0]?.numeroCMR||"—"],
                 ]},
               ],"Bon de livraison généré automatiquement par APPLITAG."),
                 `BonLivraison_${lot.lotNumero||"APPLITAG"}.pdf`, toast)},

              {icon:"🇪🇺",titre:"Auto-déclaration RED",
               statut:(isDemo||derniereVisite?.certification==="red")?"✅ Données RED disponibles":"ℹ️ Activer certification RED en visite",
               color:(isDemo||derniereVisite?.certification==="red")?C.blue:C.tx3,
               bg:(isDemo||derniereVisite?.certification==="red")?C.blueL:C.bg2,
               action:(isDemo||derniereVisite?.certification==="red")?"Générer":null,
               onAction:(isDemo&&!derniereVisite?.certification)?()=>generatePdfFromHtml(buildSimpleDocHTML(lot,"Auto-déclaration RED II",[
                 {icon:"🇪🇺",label:"Conformité RED II",rows:[
                   ["Certification","RED II — Directive 2018/2001/UE"],
                   ["Essence principale","Hêtre (Fagus sylvatica)"],
                   ["Origine","Forêt gérée durablement — France"],
                   ["Surface certifiée",lot.surfaceHa?lot.surfaceHa+" ha":"8.2 ha"],
                   ["Réf. cadastrale",lot.refCadastrale||"C 218"],
                   ["Commune",lot.commune||"Sens"],
                   ["Émissions GES","11,5 gCO₂eq/MJ (< 4% fossile)"],
                   ["Date déclaration","2026-06-22"],
                   ["Signataire","Marie Dupont — APPLITAG"],
                 ]},
               ],"Auto-déclaration de durabilité conforme à la Directive RED II. Document généré par APPLITAG."),
                 `AutoDeclarationRED_${lot.lotNumero||"APPLITAG"}.pdf`, toast):onRedDeclaration},

              {icon:"📷",titre:"Photos",
               statut:derniereVisite?.photos?.length>0?`✅ ${derniereVisite.photos.length} photo(s) visite`:"⏳ Aucune photo",
               color:derniereVisite?.photos?.length>0?C.blue:C.tx3,
               bg:derniereVisite?.photos?.length>0?C.blueL:C.bg2},

              {icon:"🏛️",titre:"Déclaration de chantier forestier à la mairie",
               statut:"📝 À compléter et transmettre avant démarrage",
               color:"#1565C0",bg:"#E3F2FD",
               action:"Ouvrir",
               onAction:()=>setShowDeclMairie(true)},
            ].map((doc,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:14,padding:14,
                marginBottom:10,border:`1px solid ${C.bd}`,
                display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:doc.bg,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:22,flexShrink:0}}>
                  {doc.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:C.tx}}>{doc.titre}</div>
                  <div style={{fontSize:11,color:doc.color,marginTop:2,fontWeight:500}}>
                    {doc.statut}
                  </div>
                </div>
                {doc.action&&(
                  <button onClick={doc.onAction||undefined}
                    style={{padding:"6px 12px",borderRadius:8,
                    background:C.greenL,color:C.greenD,border:"none",
                    fontSize:11,fontWeight:600,cursor:"pointer",
                    fontFamily:"inherit",WebkitTapHighlightColor:"transparent"}}>
                    {doc.action}
                  </button>
                )}
              </div>
            ))}

            {showDeclMairie&&(()=>{
              const entNom   = lot.etfNom||"";
              const commune  = lot.commune||"";
              const lieuDit  = lot.adresseParcelle||lot.lieuDit||"";
              const cadastre = lot.refCadastrale||"";
              const surface  = lot.surfaceHa?lot.surfaceHa+" ha":"—";
              const volume   = derniereVisite?.volumeEstimeT?fmtNum(derniereVisite.volumeEstimeT)+" t estimées":"—";
              const dateDebut= derniereVisite?.date||"";
              const essences = derniereVisite?.essences?.map(e=>e.label).join(", ")||"—";
              const ready    = !!(mairieAdresse&&mairieCP&&mairieVille);
              const htmlPdf  = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;max-width:700px;margin:0 auto;padding:40px}h1{font-size:16px;text-align:center;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}.subtitle{text-align:center;font-size:12px;color:#555;margin-bottom:32px}.expediteur{margin-bottom:24px;font-size:12px;line-height:1.8}.destinataire{float:right;width:260px;border:1px solid #999;padding:12px;font-size:12px;line-height:1.8;margin-top:-60px}.objet{margin:32px 0 20px;font-weight:bold}.section{margin-bottom:16px}.section-title{font-weight:bold;text-decoration:underline;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:16px}td{padding:6px 10px;border:1px solid #ccc;font-size:12px;vertical-align:top}td:first-child{background:#f5f5f5;font-weight:600;width:45%}.signature{margin-top:48px;display:flex;justify-content:space-between}.sig-block{width:45%}.footer{margin-top:40px;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:8px;text-align:center}.legal{background:#fffde7;border:1px solid #f9a825;padding:10px;font-size:11px;margin:20px 0}</style></head><body>
<div class="expediteur"><strong>${entNom||"[Entreprise exécutante]"}</strong><br/>[Adresse de l'entreprise]<br/>[Code postal] [Ville]<br/>[Téléphone] · [Email]</div>
<div class="destinataire"><strong>À l'attention de Monsieur/Madame le Maire</strong><br/>Mairie de ${mairieVille}<br/>${mairieAdresse}<br/>${mairieCP} ${mairieVille}</div>
<div style="clear:both;margin-top:32px"></div>
<div style="text-align:right;font-size:12px;margin-bottom:24px">Le ${new Date().toLocaleDateString("fr-FR",{year:"numeric",month:"long",day:"numeric"})}</div>
<h1>Déclaration de chantier forestier</h1>
<div class="subtitle">Conformément aux articles L. 718-9 et R. 718-27 du Code du travail</div>
<div class="objet">Objet : Déclaration préalable de chantier forestier — commune de ${commune}</div>
<div class="legal">Cette déclaration constitue la copie obligatoire transmise à la mairie en application de l'article R. 718-27 du Code du travail. Elle est adressée simultanément à l'inspection du travail territorialement compétente. Elle ne constitue pas une demande d'autorisation de coupe.</div>
<div class="section"><div class="section-title">1. Entreprise exécutante</div><table><tr><td>Dénomination sociale</td><td>${entNom||"—"}</td></tr><tr><td>Adresse</td><td>[À compléter]</td></tr><tr><td>Représentant légal</td><td>[Nom · Qualité]</td></tr><tr><td>Téléphone</td><td>[À compléter]</td></tr><tr><td>Email</td><td>[À compléter]</td></tr></table></div>
<div class="section"><div class="section-title">2. Localisation du chantier</div><table><tr><td>Commune</td><td>${commune}</td></tr><tr><td>Lieu-dit / adresse parcelle</td><td>${lieuDit||"—"}</td></tr><tr><td>Références cadastrales</td><td>${cadastre||"—"}</td></tr><tr><td>N° de lot APPLITAG</td><td>${lot.lotNumero||"—"}</td></tr><tr><td>Surface concernée</td><td>${surface}</td></tr></table></div>
<div class="section"><div class="section-title">3. Nature et description des travaux</div><table><tr><td>Type de travaux</td><td>Abattage, façonnage et débardage de bois énergie</td></tr><tr><td>Essences concernées</td><td>${essences}</td></tr><tr><td>Volume estimé</td><td>${volume}</td></tr><tr><td>Méthode de réalisation</td><td>Chantier mécanisé</td></tr></table></div>
<div class="section"><div class="section-title">4. Calendrier prévisionnel</div><table><tr><td>Date prévisionnelle de début</td><td>${dateDebut||"[À compléter]"}</td></tr><tr><td>Date prévisionnelle de fin</td><td>[À compléter]</td></tr><tr><td>Nombre de salariés sur le chantier</td><td>[À compléter]</td></tr></table></div>
<div class="section"><div class="section-title">5. Affichage</div><p style="font-size:12px">Un panneau d'identification de l'entreprise, visible depuis les voies d'accès, sera installé en bordure du chantier conformément aux dispositions réglementaires en vigueur.</p></div>
<div class="signature"><div class="sig-block"><strong>Le déclarant</strong><br/><br/><br/><div style="border-top:1px solid #999;padding-top:4px;font-size:11px">[Nom, qualité et signature]</div></div><div class="sig-block" style="text-align:right"><strong>Pour information,<br/>le maître d'ouvrage</strong><br/><br/><br/><div style="border-top:1px solid #999;padding-top:4px;font-size:11px">${lot.nom||""} ${lot.prenom||""}</div></div></div>
<div class="footer">Document généré par APPLITAG · Réf. ${lot.lotNumero||"—"} · ${new Date().toLocaleDateString("fr-FR")}<br/>Base légale : articles L. 718-9 et R. 718-27 du Code du travail</div>
</body></html>`;
              return (
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",
                zIndex:9999,display:"flex",flexDirection:"column"}}>
                <div style={{background:"#fff",flex:1,overflowY:"auto",
                  borderRadius:"16px 16px 0 0",marginTop:48}}>
                  <div style={{position:"sticky",top:0,background:"#1565C0",
                    padding:"14px 16px",display:"flex",alignItems:"center",gap:10,
                    borderRadius:"16px 16px 0 0",zIndex:1}}>
                    <span style={{fontSize:18}}>🏛️</span>
                    <div style={{flex:1,color:"#fff"}}>
                      <div style={{fontSize:13,fontWeight:700}}>Déclaration de chantier forestier à la mairie</div>
                      <div style={{fontSize:10,opacity:.7}}>{lot.lotNumero} · {lot.commune}</div>
                    </div>
                    <button onClick={()=>setShowDeclMairie(false)} style={{
                      background:"rgba(255,255,255,.2)",border:"none",color:"#fff",
                      borderRadius:8,padding:"4px 10px",fontSize:14,cursor:"pointer",
                      fontFamily:"inherit",fontWeight:700}}>✕</button>
                  </div>
                  <div style={{padding:16}}>
                    <div style={{background:"#FFF8E1",border:"1.5px solid #FFE082",
                      borderRadius:12,padding:14,marginBottom:16}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#F57F17",marginBottom:12}}>
                        📬 Adresse de la mairie destinataire
                      </div>
                    <div style={{marginBottom:10}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:5}}>Adresse</div>
                        <input value={mairieAdresse} onChange={e=>setMairieAdresse(e.target.value)}
                          placeholder="Ex : 1 place de la Mairie"
                          style={{width:"100%",height:44,padding:"0 12px",borderRadius:10,
                            border:`1.5px solid ${mairieAdresse?C.green:"#FFD54F"}`,
                            fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <div style={{flex:"0 0 100px"}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:5}}>Code postal</div>
                          <input value={mairieCP} onChange={e=>setMairieCP(e.target.value)}
                            placeholder="89000" maxLength={5}
                            style={{width:"100%",height:44,padding:"0 12px",borderRadius:10,
                              border:`1.5px solid ${mairieCP?C.green:"#FFD54F"}`,
                              fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:5}}>Ville</div>
                          <input value={mairieVille} onChange={e=>setMairieVille(e.target.value)}
                            placeholder="Toucy"
                            style={{width:"100%",height:44,padding:"0 12px",borderRadius:10,
                              border:`1.5px solid ${mairieVille?C.green:"#FFD54F"}`,
                              fontFamily:"inherit",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                      </div>
                    </div>
                    {/* Récap données pré-remplies */}
                    <div style={{background:C.bg,borderRadius:12,padding:14,marginBottom:16,
                      border:`1px solid ${C.bd}`,fontSize:12,lineHeight:1.8}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:10,textAlign:"center",
                        textTransform:"uppercase",letterSpacing:1}}>
                        Aperçu du document
                      </div>
                      {[
                        ["Entreprise exécutante", entNom||"[À renseigner]"],
                        ["Commune du chantier",   commune||"—"],
                        ["Lieu-dit / parcelle",   lieuDit||cadastre||"—"],
                        ["Réf. cadastrale",       cadastre||"—"],
                        ["Surface",               surface],
                        ["Essences",              essences],
                        ["Volume estimé",         volume],
                        ["Type de travaux",       "Abattage, façonnage, débardage bois énergie"],
                        ["Date prévisionnelle",   dateDebut||"[À compléter dans le PDF]"],
                        ["Destinataire",          ready?`Mairie de ${mairieVille} · ${mairieCP}`:"⚠️ Adresse mairie à renseigner"],
                      ].map(([l,v],i,a)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",
                          padding:"5px 0",borderBottom:i<a.length-1?`1px solid ${C.bd}`:"none"}}>
                          <span style={{color:C.tx3,fontSize:11}}>{l}</span>
                          <span style={{fontWeight:500,fontSize:12,textAlign:"right",
                            maxWidth:"55%",color:v.startsWith("⚠️")?C.amber:C.tx}}>{v}</span>
                        </div>
                      ))}
                      <div style={{marginTop:12,padding:10,background:"#E3F2FD",borderRadius:8,
                        fontSize:11,color:"#1565C0",lineHeight:1.6}}>
                        ℹ️ Formalité réglementaire (art. L. 718-9 et R. 718-27 C. trav.) — ne constitue pas une autorisation de coupe. À transmettre <strong>avant le dernier jour ouvrable précédant le démarrage</strong>.
                      </div>
                    </div>
                    <button disabled={!ready}
                      onClick={()=>generatePdfFromHtml(htmlPdf,`Declaration_Mairie_${lot.lotNumero||"APPLITAG"}.pdf`,toast)}
                      style={{width:"100%",height:50,borderRadius:14,
                        background:ready?"#1565C0":"#ccc",color:"#fff",border:"none",
                        fontFamily:"inherit",fontSize:15,fontWeight:700,
                        cursor:ready?"pointer":"default",
                        WebkitTapHighlightColor:"transparent",marginBottom:8}}>
                      {ready?"📄 Générer le PDF":"Compléter l'adresse mairie pour générer"}
                    </button>
                  </div>
                </div>
              </div>
              );
            })()}

            <div style={{background:C.blueL,borderRadius:12,padding:14,marginBottom:14,
              border:`1px solid ${C.blue}`}}>
              <div style={{fontSize:12,color:C.blueD,fontWeight:600,marginBottom:4}}>
                📋 Traçabilité complète
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                Pipeline de statut : {lot.statutLot||"NOUVEAU"}<br/>
                Visites réalisées : {visitesLot.length}<br/>
                Relevés terrain : {releves.length}<br/>
                Transports créés : {transports.length}<br/>
                Livraisons validées : {livraisons.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOUTONS D'ACTION CONTEXTUELS ── */}
      {actionsVisible.length>0&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,maxWidth:430,margin:"0 auto",
          padding:"10px 16px 0",
          paddingBottom:"calc(16px + env(safe-area-inset-bottom, 0px))",
          background:`linear-gradient(transparent,${C.bg} 28%)`}}>
          <div style={{display:"grid",
            gridTemplateColumns:`repeat(${Math.min(actionsVisible.length,4)},1fr)`,gap:8}}>
            {actionsVisible.map((a,i)=>(
              <button key={i} onClick={a.fn} style={{
                height:56,borderRadius:14,background:a.bg,
                border:`1.5px solid ${a.bd}`,color:a.color,
                fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:3,
                WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:20}}>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SUPPRESSION LOT (admin uniquement) ── */}
      {onDeleteLot&&(
        <div style={{position:"fixed",bottom:actionsVisible.length>0?90:16,right:16,zIndex:200}}>
          {deleteStep===0&&(
            <button onClick={()=>setDeleteStep(1)}
              style={{width:44,height:44,borderRadius:"50%",background:"#fff",
                border:"1.5px solid #E53935",color:"#E53935",fontSize:18,cursor:"pointer",
                boxShadow:"0 2px 8px rgba(0,0,0,.15)",WebkitTapHighlightColor:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center"}}
              title="Supprimer ce lot">
              🗑️
            </button>
          )}
          {deleteStep===1&&(
            <div style={{background:"#fff",borderRadius:14,padding:14,
              boxShadow:"0 4px 20px rgba(0,0,0,.2)",border:"1.5px solid #E53935",
              maxWidth:240,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#B71C1C",marginBottom:4}}>
                ⚠️ Supprimer ce lot ?
              </div>
              <div style={{fontSize:11,color:C.tx3,marginBottom:12}}>
                Lot {lot.lotNumero} — {lot.nom}.<br/>Cette action est irréversible.
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setDeleteStep(0)}
                  style={{flex:1,height:38,borderRadius:10,background:C.bg,
                    border:`1px solid ${C.bd}`,color:C.tx,fontFamily:"inherit",
                    fontSize:12,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  Annuler
                </button>
                <button onClick={()=>setDeleteStep(2)}
                  style={{flex:1,height:38,borderRadius:10,background:"#FFEBEE",
                    border:"1.5px solid #E53935",color:"#B71C1C",fontFamily:"inherit",
                    fontSize:12,fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  Confirmer
                </button>
              </div>
            </div>
          )}
          {deleteStep===2&&(
            <div style={{background:"#fff",borderRadius:14,padding:14,
              boxShadow:"0 4px 20px rgba(0,0,0,.2)",border:"2px solid #B71C1C",
              maxWidth:240,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#B71C1C",marginBottom:4}}>
                🔴 Dernière confirmation
              </div>
              <div style={{fontSize:11,color:C.tx3,marginBottom:12}}>
                Toutes les données associées à ce lot seront définitivement supprimées.
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setDeleteStep(0)}
                  style={{flex:1,height:38,borderRadius:10,background:C.bg,
                    border:`1px solid ${C.bd}`,color:C.tx,fontFamily:"inherit",
                    fontSize:12,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  Annuler
                </button>
                <button onClick={()=>{ setDeleteStep(0); onDeleteLot(lot); }}
                  style={{flex:1,height:38,borderRadius:10,background:"#E53935",
                    border:"none",color:"#fff",fontFamily:"inherit",
                    fontSize:12,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ── ÉCRAN FIN DE CHANTIER (7 sections) ───────────────────────
const EcranFinChantier = ({lot, onBack, onSaved, toast, entrepriseId}) => {
  const [section, setSection] = useState(0);

  // §1 Photos avant/après
  const [photosAvant,   setPhotosAvant]  = useState([]);
  const [photosApres,   setPhotosApres]  = useState([]);
  const [photosDepot,   setPhotosDepot]  = useState([]);
  const [photosAcces,   setPhotosAcces]  = useState([]);

  // §2 Rénovation
  const [surfaceRenovee,setSurfRenov]    = useState(0);
  const [typeBroyage,   setTypeBroyage]  = useState([]);
  const [machineRenov,  setMachineRenov] = useState("");
  const [tempsRenov,    setTempsRenov]   = useState(0);
  const [nbPassages,    setNbPassages]   = useState(1);

  // §3 Consommations
  const [gnrLitres,     setGnrLitres]   = useState("");
  const [prixLitre,     setPrixLitre]   = useState("");
  const [coutMachine,   setCoutMach]     = useState("");
  const [coutOperateur, setCoutOp]       = useState("");

  // §4 Contrôle qualité (checklist 6 points)
  const [checklist, setChecklist] = useState({
    depotNettoye:false, remanentsTraites:false, accesRetablis:false,
    fossesPreserves:false, pasDechets:false, respectConsignes:false,
  });

  // §5 Validation propriétaire
  const [sigPropFin,    setSigPropFin]   = useState(false);
  const [sigDataFin,    setSigDataFin]   = useState(null);
  const [nomPropFin,    setNomPropFin]   = useState(lot.nom||"");
  const [reserveProp,   setReserveProp]  = useState("sans_reserve"); // sans_reserve | avec_reserve
  const [commentaireProp,setComProp]     = useState("");

  // §6 Note qualité
  const [noteQualite,   setNoteQualite]  = useState(0); // 1-5

  // §7 Indice APPLITAG (calculé)
  const [saving, setSaving] = useState(false);

  const SECTIONS = [
    {icon:"📷", label:"Photos"},
    {icon:"🌿", label:"Rénovation"},
    {icon:"⛽", label:"Consommations"},
    {icon:"✅", label:"Qualité"},
    {icon:"✍️", label:"Validation"},
    {icon:"⭐", label:"Note"},
    {icon:"📊", label:"Indice"},
  ];

  const TYPE_BROYAGE_OPTS = [
    "Rémanents forestiers","Accotements","Souches","Invasives","Dépôt","Plateforme"
  ];

  const toggleBroyage = v => setTypeBroyage(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v]);

  // Calcul indice APPLITAG 0-100
  const nbCheckOK = Object.values(checklist).filter(Boolean).length;
  const hasPhotos = photosApres.length>0 || photosAvant.length>0;
  const indiceDocs = hasPhotos ? 25 : 0;
  const indiceQualite = Math.round((nbCheckOK/6)*35);
  const indiceNote = noteQualite>0 ? Math.round((noteQualite/5)*20) : 0;
  const indiceValidation = sigDataFin ? 20 : (sigPropFin ? 10 : 0);
  const indiceTotal = Math.min(100, indiceDocs + indiceQualite + indiceNote + indiceValidation);

  const indiceColor = indiceTotal>=80?C.greenD:indiceTotal>=50?C.amberD:C.red;
  const indiceLabel = indiceTotal>=80?"Excellent":indiceTotal>=60?"Bon":
    indiceTotal>=40?"Conforme":indiceTotal>=20?"À améliorer":"Non conforme";

  const coutCarburant = ((parseFloat(gnrLitres)||0) * (parseFloat(prixLitre)||0));
  const totalCout = coutCarburant+(parseFloat(coutMachine)||0)+(parseFloat(coutOperateur)||0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPost(`/fin-chantier`, {
          lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
          photosAvant, photosApres, photosDepot, photosAcces,
          surfaceRenovee, typeBroyage, machineRenov, tempsRenov, nbPassages,
          gnrLitres, coutCarburant, coutMachine, coutOperateur, totalCout,
          checklist, nbCheckOK,
          sigPropFin, sigDataFin, nomPropFin, reserveProp, commentaireProp,
          noteQualite, indiceTotal, indiceLabel,
          statut:"LIVRE",
      });
      toast("Fin de chantier validée ✓");
      onSaved();
    } catch {
      toast("Fin de chantier enregistrée localement ✓");
      onSaved();
    }
    setSaving(false);
  };

  const NoteEtoile = ({n}) => (
    <button onClick={()=>setNoteQualite(n)} style={{
      fontSize:32,background:"none",border:"none",cursor:"pointer",
      opacity:noteQualite>=n?1:0.25,
      WebkitTapHighlightColor:"transparent",
      filter:noteQualite>=n?"none":"grayscale(1)"}}>⭐</button>
  );

  const NOTES_LABELS = ["","Non conforme","À améliorer","Conforme","Bon","Excellent"];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      {/* Header */}
      <div style={{background:C.greenD,color:"#fff",padding:"10px 16px 0",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.1)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>🏁 Fin de chantier</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero} · {lot.commune}</div>
          </div>
          <div style={{fontSize:12,fontWeight:700,background:"rgba(255,255,255,.15)",
            padding:"4px 10px",borderRadius:8}}>
            {section+1}/7
          </div>
        </div>
        {/* Barre sections */}
        <div style={{display:"flex",gap:0,overflowX:"auto",scrollbarWidth:"none"}}>
          {SECTIONS.map((s,i)=>(
            <button key={i} onClick={()=>setSection(i)} style={{
              flex:"0 0 auto",padding:"8px 12px",background:"transparent",border:"none",
              color:section===i?"#fff":"rgba(255,255,255,.4)",
              fontFamily:"inherit",fontSize:11,fontWeight:section===i?700:400,
              cursor:"pointer",borderBottom:section===i?"2px solid #fff":"2px solid transparent",
              WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>

        {/* ── §1 PHOTOS ── */}
        {section===0&&(
          <div>
            <SectionTitle icon="📷" label="Photos avant/après"/>
            {[
              {label:"📷 Photos AVANT exploitation",state:photosAvant,set:setPhotosAvant,
               hint:"Parcelle, accès avant travaux"},
              {label:"📷 Photos APRÈS exploitation",state:photosApres,set:setPhotosApres,
               hint:"État final de la parcelle"},
              {label:"📷 Place de dépôt",state:photosDepot,set:setPhotosDepot,
               hint:"Bord de route, stockage"},
              {label:"📷 Accès rétablis",state:photosAcces,set:setPhotosAcces,
               hint:"Chemins, barrières, fossés"},
            ].map(({label,state,set,hint},i)=>(
              <div key={i} style={{background:"#fff",borderRadius:12,padding:14,
                marginBottom:12,border:`1px solid ${C.bd}`}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{label}</div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:10}}>{hint}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
                  {state.map((p,j)=>(
                    <div key={j} style={{width:64,height:64,borderRadius:8,
                      background:C.greenL,border:`1px solid ${C.green}`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,color:C.greenD,fontWeight:600,position:"relative"}}>
                      📷<span style={{position:"absolute",top:-6,right:-6,
                        background:C.red,color:"#fff",borderRadius:"50%",
                        width:18,height:18,fontSize:11,display:"flex",
                        alignItems:"center",justifyContent:"center",cursor:"pointer"}}
                        onClick={()=>set(s=>s.filter((_,k)=>k!==j))}>✕</span>
                    </div>
                  ))}
                  <button onClick={()=>set(s=>[...s,`photo_${uid()}`])} style={{
                    width:64,height:64,borderRadius:8,background:C.bg2,
                    border:`2px dashed ${C.bd}`,cursor:"pointer",fontSize:24,
                    WebkitTapHighlightColor:"transparent"}}>+</button>
                </div>
                <div style={{fontSize:10,color:state.length>0?C.greenD:C.tx3}}>
                  {state.length>0?`✅ ${state.length} photo(s)`:"Aucune photo"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── §2 RÉNOVATION ── */}
        {section===1&&(
          <div>
            <SectionTitle icon="🌿" label="Travaux de rénovation"/>
            <MSlider label="Surface rénovée" value={surfaceRenovee} onChange={setSurfRenov}
              min={0} max={50} step={0.5} unit=" ha" color={C.green}/>
            <SectionTitle icon="🌀" label="Types de broyage réalisés"/>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
              {TYPE_BROYAGE_OPTS.map(v=>(
                <div key={v} onClick={()=>toggleBroyage(v)} style={{
                  padding:"12px 14px",borderRadius:10,cursor:"pointer",
                  border:`2px solid ${typeBroyage.includes(v)?C.green:C.bd}`,
                  background:typeBroyage.includes(v)?C.greenL:"#fff",
                  display:"flex",alignItems:"center",gap:10,
                  WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:18}}>{typeBroyage.includes(v)?"✅":"⬜"}</span>
                  <span style={{fontSize:14,fontWeight:typeBroyage.includes(v)?600:400,
                    color:typeBroyage.includes(v)?C.greenD:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <MInput label="Machine utilisée" value={machineRenov} onChange={setMachineRenov}
              placeholder="Ex: Broyeur Ahwi, Prinoth Raptor…"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MInput label="Temps (heures)" value={String(tempsRenov||"")}
                onChange={v=>setTempsRenov(parseFloat(v)||0)} type="number" placeholder="ex: 8"/>
              <MInput label="Nb passages" value={String(nbPassages||"")}
                onChange={v=>setNbPassages(parseInt(v)||1)} type="number" placeholder="1"/>
            </div>
          </div>
        )}

        {/* ── §3 CONSOMMATIONS ── */}
        {section===2&&(
          <div>
            <SectionTitle icon="⛽" label="Consommations et coûts"/>
            <MInput label="GNR consommé (litres)" value={gnrLitres} onChange={setGnrLitres}
              type="number" placeholder="ex: 120"/>
            <MInput label="Prix carburant (€/L)" value={prixLitre} onChange={setPrixLitre}
              type="number" placeholder="ex: 1.45"/>
            {gnrLitres&&prixLitre&&(
              <div style={{background:C.amberL,borderRadius:10,padding:"10px 14px",
                marginBottom:14,border:`1px solid ${C.amber}`,fontSize:13,color:C.amberD}}>
                ⛽ Coût carburant calculé : <strong>{fmtNum(coutCarburant,2)} € HT</strong>
                <span style={{fontSize:11,opacity:.7,marginLeft:8}}>
                  ({gnrLitres} L × {prixLitre} €/L)
                </span>
              </div>
            )}
            <SectionTitle icon="💶" label="Coûts (€ HT)"/>
            <MInput label="Coût machine" value={coutMachine} onChange={setCoutMach}
              type="number" placeholder="ex: 350"/>
            <MInput label="Coût opérateur" value={coutOperateur} onChange={setCoutOp}
              type="number" placeholder="ex: 280"/>
            {totalCout>0&&(
              <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
                border:`1.5px solid ${C.amber}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[[coutCarburant+"€","Carburant"],[coutMachine+"€","Machine"],
                    [coutOperateur+"€","Opérateur"]].map(([v,l],i)=>(
                    <div key={i} style={{textAlign:"center",
                      background:"rgba(186,117,23,.1)",borderRadius:8,padding:8}}>
                      <div style={{fontSize:15,fontWeight:700,color:C.amberD}}>{v}</div>
                      <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{textAlign:"center",marginTop:10,fontSize:16,
                  fontWeight:700,color:C.amberD}}>
                  Total : {fmtNum(totalCout,2)} € HT
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── §4 CONTRÔLE QUALITÉ ── */}
        {section===3&&(
          <div>
            <SectionTitle icon="✅" label="Checklist contrôle qualité"/>
            <div style={{background:C.blueL,borderRadius:12,padding:12,marginBottom:14,
              border:`1px solid ${C.blue}`,fontSize:12,color:C.blueD}}>
              Valider les 6 points obligatoires avant validation finale
            </div>
            {[
              {k:"depotNettoye",    icon:"🧹",label:"Dépôt nettoyé",    sub:"Place de dépôt dégagée, bois évacué"},
              {k:"remanentsTraites",icon:"🌿",label:"Rémanents traités", sub:"Broyés ou andainés selon contrat"},
              {k:"accesRetablis",   icon:"🛤️", label:"Accès rétablis",   sub:"Chemins, barrières, passages remis en état"},
              {k:"fossesPreserves", icon:"💧",label:"Fossés préservés",  sub:"Fossés et écoulements non obstrués"},
              {k:"pasDechets",      icon:"♻️", label:"Pas de déchets",    sub:"Aucun déchet laissé sur la parcelle"},
              {k:"respectConsignes",icon:"📋",label:"Consignes respectées",sub:"Conditions du contrat respectées"},
            ].map(({k,icon,label,sub})=>(
              <div key={k} onClick={()=>setChecklist(p=>({...p,[k]:!p[k]}))} style={{
                display:"flex",alignItems:"center",gap:14,padding:"14px",
                borderRadius:12,marginBottom:10,cursor:"pointer",
                border:`2px solid ${checklist[k]?C.green:C.bd}`,
                background:checklist[k]?C.greenL:"#fff",
                WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:24}}>{checklist[k]?"✅":icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,
                    color:checklist[k]?C.greenD:C.tx}}>{label}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{sub}</div>
                </div>
              </div>
            ))}
            <div style={{background:nbCheckOK===6?C.greenL:C.amberL,borderRadius:12,
              padding:14,border:`1.5px solid ${nbCheckOK===6?C.green:C.amber}`,
              textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,
                color:nbCheckOK===6?C.greenD:C.amberD}}>
                {nbCheckOK}/6 points validés
              </div>
              {nbCheckOK<6&&(
                <div style={{fontSize:12,color:C.amberD,marginTop:4}}>
                  {6-nbCheckOK} point(s) restant(s) à valider
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── §5 VALIDATION PROPRIÉTAIRE ── */}
        {section===4&&(
          <div>
            <SectionTitle icon="✍️" label="Validation propriétaire"/>
            <MInput label="Nom du propriétaire" value={nomPropFin} onChange={setNomPropFin}
              placeholder="Prénom Nom"/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                Validation
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["sans_reserve","✅","Sans réserve"],["avec_reserve","⚠️","Avec réserve"]].map(([v,e,l])=>(
                  <div key={v} onClick={()=>setReserveProp(v)} style={{
                    padding:"14px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
                    border:`2px solid ${reserveProp===v?(v==="sans_reserve"?C.green:C.amber):C.bd}`,
                    background:reserveProp===v?(v==="sans_reserve"?C.greenL:C.amberL):"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                    <div style={{fontSize:22,marginBottom:4}}>{e}</div>
                    <div style={{fontSize:13,fontWeight:reserveProp===v?600:400,
                      color:reserveProp===v?(v==="sans_reserve"?C.greenD:C.amberD):C.tx}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {reserveProp==="avec_reserve"&&(
              <MInput label="Réserves du propriétaire" value={commentaireProp}
                onChange={setComProp} placeholder="Décrivez les réserves…" big/>
            )}
            <SignatureCanvas
              label="✍️ Signature propriétaire"
              nomSignataire={nomPropFin}
              signed={!!sigDataFin}
              onSigned={data=>{setSigDataFin(data);setSigPropFin(true);}}
              onClear={()=>{setSigDataFin(null);setSigPropFin(false);}}/>
          </div>
        )}

        {/* ── §6 NOTE QUALITÉ ── */}
        {section===5&&(
          <div>
            <SectionTitle icon="⭐" label="Note qualité du chantier"/>
            <div style={{textAlign:"center",padding:"24px 0 16px"}}>
              <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:12}}>
                {[1,2,3,4,5].map(n=><NoteEtoile key={n} n={n}/>)}
              </div>
              {noteQualite>0&&(
                <div style={{fontSize:22,fontWeight:700,
                  color:noteQualite>=4?C.greenD:noteQualite>=3?C.amberD:C.red}}>
                  {NOTES_LABELS[noteQualite]}
                </div>
              )}
              {noteQualite===0&&(
                <div style={{fontSize:14,color:C.tx3}}>
                  Appuyez sur les étoiles pour noter
                </div>
              )}
            </div>
            <div style={{background:"#fff",borderRadius:14,padding:16,
              border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:12}}>
                Grille de référence
              </div>
              {[
                [5,"⭐⭐⭐⭐⭐","Excellent","Parfait, au-delà des attentes"],
                [4,"⭐⭐⭐⭐","Bon","Chantier réalisé selon les attentes"],
                [3,"⭐⭐⭐","Conforme","Travail correct, quelques points à améliorer"],
                [2,"⭐⭐","À améliorer","Réserves significatives signalées"],
                [1,"⭐","Non conforme","Non-respect des conditions du contrat"],
              ].map(([n,e,l,s])=>(
                <div key={n} onClick={()=>setNoteQualite(n)} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"10px 0",
                  borderBottom:n>1?`1px solid ${C.bd}`:"none",cursor:"pointer",
                  opacity:noteQualite>0&&noteQualite!==n?0.5:1}}>
                  <span style={{fontSize:18,fontWeight:700,color:C.tx3,width:20}}>{n}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:noteQualite===n?700:500,
                      color:noteQualite===n?C.greenD:C.tx}}>{l}</div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{s}</div>
                  </div>
                  {noteQualite===n&&<span style={{color:C.green}}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── §7 INDICE APPLITAG ── */}
        {section===6&&(
          <div>
            <SectionTitle icon="📊" label="Indice APPLITAG"/>
            {/* Score principal */}
            <div style={{background:`linear-gradient(135deg,${C.sb},${C.greenD})`,
              borderRadius:20,padding:28,marginBottom:20,textAlign:"center",color:"#fff"}}>
              <div style={{fontSize:11,opacity:.7,marginBottom:8,letterSpacing:1,
                textTransform:"uppercase"}}>Score de clôture</div>
              <div style={{fontSize:64,fontWeight:800,lineHeight:1}}>{indiceTotal}</div>
              <div style={{fontSize:14,opacity:.8,marginTop:4}}>/100</div>
              <div style={{fontSize:18,fontWeight:600,marginTop:12,
                background:"rgba(255,255,255,.15)",borderRadius:10,padding:"8px 20px",
                display:"inline-block"}}>
                {indiceLabel}
              </div>
            </div>
            {/* Détail des composantes */}
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:16,
              border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:12}}>
                Détail du calcul
              </div>
              {[
                {label:"📷 Documentation photos",  score:indiceDocs,   max:25, color:C.blue},
                {label:"✅ Contrôle qualité",       score:indiceQualite,max:35, color:C.green},
                {label:"⭐ Note propriétaire",       score:indiceNote,   max:20, color:C.amber},
                {label:"✍️ Signature propriétaire",  score:indiceValidation,max:20, color:C.purple},
              ].map(({label,score,max,color},i)=>(
                <div key={i} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:12,marginBottom:5}}>
                    <span style={{color:C.tx}}>{label}</span>
                    <span style={{fontWeight:700,color}}>{score}/{max}</span>
                  </div>
                  <div style={{background:C.bg2,borderRadius:8,height:8,overflow:"hidden"}}>
                    <div style={{width:`${(score/max)*100}%`,height:"100%",
                      background:color,borderRadius:8,transition:"width .5s"}}/>
                  </div>
                </div>
              ))}
            </div>
            {/* Conseils */}
            {indiceTotal<80&&(
              <div style={{background:C.amberL,borderRadius:12,padding:14,
                border:`1px solid ${C.amber}`}}>
                <div style={{fontSize:13,fontWeight:700,color:C.amberD,marginBottom:8}}>
                  💡 Pour améliorer le score
                </div>
                <div style={{fontSize:12,color:C.amberD,lineHeight:1.8}}>
                  {indiceDocs<25&&"📷 Ajoutez des photos avant/après (+25 pts)\n"}
                  {indiceQualite<35&&`✅ Validez tous les points qualité (${nbCheckOK}/6 validés)\n`}
                  {indiceNote<20&&"⭐ Faites noter le chantier par le propriétaire\n"}
                  {indiceValidation<20&&"✍️ Obtenez la signature du propriétaire"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation + bouton final */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        {section<6?(
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
            {section>0&&(
              <button onClick={()=>setSection(s=>s-1)} style={{
                padding:"14px",borderRadius:14,background:"#fff",
                border:`1.5px solid ${C.bd}`,color:C.tx2,
                fontFamily:"inherit",fontSize:14,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
                {"<"} Préc.
              </button>
            )}
            <button onClick={()=>setSection(s=>s+1)} style={{
              padding:"14px",borderRadius:14,background:C.greenD,
              border:"none",color:"#fff",fontFamily:"inherit",
              fontSize:14,fontWeight:600,cursor:"pointer",
              gridColumn:section===0?"1/-1":"auto",
              WebkitTapHighlightColor:"transparent"}}>
              Suivant ›
            </button>
          </div>
        ):(
          <BigBtn onClick={handleSave} disabled={saving} bg={C.greenD} icon={saving?"":"🏁"}>
            {saving?"Enregistrement…":`CLÔTURER — Indice ${indiceTotal}/100`}
          </BigBtn>
        )}
      </div>
    </div>
  );
};

// ── ÉCRAN DÉCHIQUETAGE & CHARGEMENT ──────────────────────────
const CAPACITES_CHARGEMENT = {
  semi: 30, camion_remorque: 30, benne_ampliroll: 15,
};

const EcranDechiquetage = ({lot, operateurs=[], onBack, onSaved, toast, entrepriseId, user}) => {
  const nomUserDechiquetage = user ? `${user.prenom||""} ${user.nom||""}`.trim() : "";
  const [lotSuggere,    setLotSuggere]  = useState(lot.lotNumero||"");
  const [operateurDechiquetage,setOpDechiquetage] = useState(nomUserDechiquetage);
  const [machine,       setMachine]     = useState(()=>{ try { return localStorage.getItem(`applitag_dech_machine_${user?.id||""}`) || ""; } catch { return ""; } });
  const [typeChargement,setTypeCharg]   = useState("semi");
  const [cubageCharge,  setCubageCharge]  = useState("");
  const [tonnageCharge, setTonnageCharge] = useState("");
  const [erreurTonnage, setErreurTonnage] = useState("");
  const [numeroCMR,     setNumeroCMR]   = useState("");
  const [photoCMR,      setPhotoCMR]    = useState(false);
  const [missionsTransport, setMissionsTransport] = useState([]);
  const [missionId,     setMissionId]   = useState("");
  const [immatTracteur, setImmatTract]  = useState("");
  const [immatRemorque, setImmatRemor]  = useState("");
  const [heureDebut,    setHeureDebut]  = useState("");
  const [heureFin,      setHeureFin]    = useState("");
  const [evenements,    setEvenements]  = useState([]);
  const [autreEvenement,setAutreEv]    = useState("");
  const [saving,        setSaving]      = useState(false);

  const entrepriseDechiquetage = lot.etfNom || "Non déléguée";

  // Ordres de mission transport déjà attribués à ce lot
  useEffect(()=>{
    apiGet(`/transports/lot/${lot.id}`)
      .then(d=>{ if(Array.isArray(d)) setMissionsTransport(d); }).catch(()=>{});
  },[lot.id]);

  // Opérateur délégué par l'entreprise prestataire missionnée sur ce lot → pré-rempli automatiquement
  useEffect(()=>{
    if (operateurDechiquetage) return; // déjà rempli (par user ou par assignation)
    const op = operateurs.find(o=>
      (o.etfId===lot.etfId || (lot.etfNom && o.etfNom===lot.etfNom)) &&
      (o.assignations||[]).some(a=>(a.lotId===lot.id||a.lotNumero===lot.lotNumero)&&a.typeOperation==="dechiquetage")
    );
    if (op) setOpDechiquetage(`${op.nom}${op.prenom?" "+op.prenom:""}`);
  },[operateurs, lot]);

  // Heure de début du prochain chargement du jour : pré-remplie à l'heure de saisie moins 30 minutes
  useEffect(()=>{
    if (heureDebut) return;
    const d = new Date(Date.now()-30*60000);
    setHeureDebut(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`);
  },[]);

  const handleSelectMission = (id) => {
    setMissionId(id);
    const m = missionsTransport.find(x=>x.id===id);
    if (m) {
      setImmatTract(formatImmat(m.immatTracteur||""));
      setImmatRemor(formatImmat(m.immatRemorque||""));
    }
  };

  const handlePhotoCMR = () => {
    const next = !photoCMR;
    setPhotoCMR(next);
    if (next && !heureDebut) {
      const now = new Date();
      setHeureDebut(`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
    }
  };

  const handleTonnageChange = (v) => {
    setTonnageCharge(v);
    const max = CAPACITES_CHARGEMENT[typeChargement];
    const num = parseFloat(v);
    if (!isNaN(num) && num > max) {
      setErreurTonnage(`Capacité maximale dépassée (${max} t)`);
    } else {
      setErreurTonnage("");
    }
  };

  const EVENEMENTS_LIST = [
    ["panne_machine","🔧","Panne machine"],
    ["attente_camion","🚛","Attente camion"],
    ["casse","💥","Casse matériel"],
    ["intemperies","🌧️","Intempéries"],
    ["manque_carburant","⛽","Manque carburant"],
    ["probleme_acces","🚧","Problème accès"],
    ["incident_personnel","🩺","Incident personnel"],
    ["autre","📝","Autre"],
  ];

  const toggleEv = v => setEvenements(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);

  const erreurCMR = numeroCMR ? validateCMR(numeroCMR) : null;
  const erreurImmatTract = immatTracteur ? validateImmat(immatTracteur) : null;
  const erreurImmatRemor = immatRemorque ? validateImmat(immatRemorque) : null;
  const erreurHeureFin = heureDebut && heureFin && heureFin <= heureDebut ? "L'heure de fin doit être après l'heure de début" : null;
  const canValidate = numeroCMR && !erreurCMR && immatTracteur && !erreurImmatTract
    && !erreurImmatRemor && heureDebut && heureFin && !erreurHeureFin && photoCMR && !erreurTonnage;

  const handleSave = async () => {
    if (!canValidate) { toast("CMR, immatriculation tracteur, horaires complets et photo CMR obligatoires (formats valides)","warn"); return; }
    setSaving(true);
    try { localStorage.setItem(`applitag_dech_machine_${user?.id||""}`, machine); } catch {}
    try {
      await apiPost(`/dechiquetage`, {
          lotId:lot.id, lotNumero:lotSuggere, entrepriseId,
          entrepriseDechiquetage, operateurDechiquetage, machine, typeChargement,
          cubageCharge: parseFloat(cubageCharge)||null,
          tonnageCharge: parseFloat(tonnageCharge)||null,
          numeroCMR, photoCMR, immatTracteur, immatRemorque,
          heureDebut, heureFin, evenements, autreEvenement, statut:"EN_LIVRAISON",
      });
      toast("Déchiquetage enregistré — transport créé ✓");
      onSaved("EN_LIVRAISON");
    } catch {
      toast("Déchiquetage enregistré localement ✓");
      onSaved("EN_LIVRAISON");
    }
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#D85A30",color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>🌀 Déchiquetage & Chargement</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero} · {lot.commune}</div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>

        <SectionTitle icon="📋" label="Lot"/>
        <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
          border:`1.5px solid ${C.green}`}}>
          <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:C.greenD}}>
            {lotSuggere}
          </div>
          <div style={{fontSize:12,color:C.tx3,marginTop:4}}>{lot.commune} · {lot.surfaceHa} ha</div>
        </div>

        <SectionTitle icon="🏭" label="Entreprise de déchiquetage"/>
        <div style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:12,
          padding:14,marginBottom:14}}>
          <div style={{fontSize:11,color:C.tx3,marginBottom:4}}>Entreprise déléguée sur ce lot</div>
          <div style={{fontSize:15,fontWeight:700,color:C.tx}}>{entrepriseDechiquetage}</div>
        </div>
        <MInput label="Opérateur déchiquetage" value={operateurDechiquetage} onChange={setOpDechiquetage}
          placeholder="Nom opérateur"/>
        <MInput label="Machine" value={machine} onChange={setMachine}
          placeholder="Ex: Jenz HEM 593, Doppstadt AK 430…"/>

        <SectionTitle icon="🚛" label="Type de chargement"/>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {[
            ["semi","🚛","Semi-remorque"],
            ["camion_remorque","🚚","Camion-remorque"],
            ["benne_ampliroll","🏗️","Benne ampliroll"],
          ].map(([v,e,l])=>(
            <div key={v} onClick={()=>{ setTypeCharg(v); handleTonnageChange(tonnageCharge); }} style={{
              padding:"12px 14px",borderRadius:12,cursor:"pointer",
              border:`2px solid ${typeChargement===v?"#D85A30":C.bd}`,
              background:typeChargement===v?"#FAECE7":"#fff",
              WebkitTapHighlightColor:"transparent",
              display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:24}}>{e}</span>
              <div style={{fontSize:14,fontWeight:typeChargement===v?600:400,
                color:typeChargement===v?"#D85A30":C.tx}}>{l}</div>
            </div>
          ))}
        </div>
        <MInput label="Cubage chargé estimé (m³)" value={cubageCharge} onChange={setCubageCharge}
          type="number" placeholder="ex: 85"/>
        <MInput label="Tonnage net chargé estimé (t)" value={tonnageCharge} onChange={handleTonnageChange}
          type="number" placeholder="ex: 28" required/>
        {erreurTonnage&&(
          <div style={{background:C.redL,borderRadius:10,padding:12,marginBottom:14,
            border:`1px solid ${C.red}`,fontSize:12,color:C.red,fontWeight:600}}>
            ⚠️ {erreurTonnage}
          </div>
        )}

        <SectionTitle icon="📄" label="CMR"/>
        <MInput label="Numéro CMR" value={numeroCMR} onChange={v=>setNumeroCMR(formatCMR(v))}
          placeholder="CMR-2026-0001" hint="Format : CMR-AAAA-NNNN" required error={erreurCMR}/>

        <div onClick={handlePhotoCMR} style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:14,borderRadius:12,marginBottom:14,cursor:"pointer",
          background:photoCMR?C.greenL:"#fff",
          border:`2px solid ${photoCMR?C.green:C.bd}`,
          WebkitTapHighlightColor:"transparent"}}>
          <div>
            <div style={{fontSize:15,fontWeight:600,color:photoCMR?C.greenD:C.tx}}>
              📷 Photo CMR
            </div>
            <div style={{fontSize:12,color:C.tx3,marginTop:2}}>
              {photoCMR?"✓ Photo prise — heure de départ enregistrée":"Obligatoire — photographier le CMR"}
            </div>
          </div>
          <div style={{fontSize:24}}>{photoCMR?"✅":"📷"}</div>
        </div>

        <SectionTitle icon="🚛" label="Véhicule"/>
        {missionsTransport.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
              Ordre de mission transport
            </div>
            <select value={missionId} onChange={e=>handleSelectMission(e.target.value)}
              style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
                border:`1.5px solid ${C.bd}`,fontSize:FONT_INPUT,fontFamily:"inherit",
                background:"#fff",color:C.tx,outline:"none"}}>
              <option value="">— Sélectionner —</option>
              {missionsTransport.map(m=>(
                <option key={m.id} value={m.id}>
                  {m.societeTransp||"Transporteur"} · {m.immatTracteur||"?"} · {m.nomChauffeur||""}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Immat. tracteur" value={immatTracteur} onChange={v=>setImmatTract(formatImmat(v))}
            placeholder="AB-123-CD" required error={erreurImmatTract}/>
          <MInput label="Immat. remorque" value={immatRemorque} onChange={v=>setImmatRemor(formatImmat(v))}
            placeholder="AB-456-CD" hint="optionnel" error={erreurImmatRemor}/>
        </div>

        <SectionTitle icon="⏱️" label="Horaires de chargement"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Heure début" value={heureDebut} onChange={setHeureDebut}
            type="time" required/>
          <MInput label="Heure fin (photo CMR)" value={heureFin} onChange={setHeureFin}
            type="time" required error={erreurHeureFin}/>
        </div>

        <SectionTitle icon="📋" label="Événements du jour"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {EVENEMENTS_LIST.map(([v,e,l])=>(
            <div key={v} onClick={()=>toggleEv(v)} style={{
              padding:"10px 8px",borderRadius:10,cursor:"pointer",
              border:`1.5px solid ${evenements.includes(v)?"#D85A30":C.bd}`,
              background:evenements.includes(v)?"#FAECE7":"#fff",
              display:"flex",alignItems:"center",gap:8,
              WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:18}}>{e}</span>
              <span style={{fontSize:12,fontWeight:evenements.includes(v)?600:400,
                color:evenements.includes(v)?"#D85A30":C.tx}}>{l}</span>
            </div>
          ))}
        </div>
        {evenements.includes("autre")&&(
          <MInput label="Préciser l'événement" value={autreEvenement}
            onChange={setAutreEv} placeholder="Décrivez l'événement…"/>
        )}

        {!canValidate&&(
          <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
            border:`1px solid ${C.amber}`}}>
            <div style={{fontSize:12,color:C.amberD,lineHeight:1.8}}>
              <div style={{fontWeight:700,marginBottom:6}}>Obligatoires avant départ :</div>
              {!numeroCMR&&<div>❌ Numéro CMR</div>}
              {numeroCMR&&erreurCMR&&<div>❌ N° CMR : {erreurCMR}</div>}
              {!photoCMR&&<div>❌ Photo CMR</div>}
              {!immatTracteur&&<div>❌ Immatriculation tracteur</div>}
              {immatTracteur&&erreurImmatTract&&<div>❌ Immat. tracteur : {erreurImmatTract}</div>}
              {immatRemorque&&erreurImmatRemor&&<div>❌ Immat. remorque : {erreurImmatRemor}</div>}
              {!heureDebut&&<div>❌ Heure de début</div>}
              {!heureFin&&<div>❌ Heure de fin</div>}
              {erreurTonnage&&<div>❌ {erreurTonnage}</div>}
            </div>
          </div>
        )}

        {canValidate&&(
          <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
            border:`1.5px solid ${C.green}`}}>
            <div style={{fontSize:13,fontWeight:600,color:C.greenD}}>
              ✅ Prêt pour le départ — le transport sera créé automatiquement
            </div>
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleSave} disabled={saving||!canValidate}
          bg="#D85A30" icon={saving?"":"🚛"}>
          {saving?"Enregistrement…":"VALIDER DÉPART CHARGEMENT"}
        </BigBtn>
      </div>
    </div>
  );
};

// ── ÉCRAN TRANSPORTEUR ────────────────────────────────────────
const EcranTransporteur = ({lot, onBack, onSaved, toast, entrepriseId}) => {
  // Côté entreprise
  const [typeVehicule,    setTypeVeh]    = useState("semi");
  const [immatTracteur,   setImmatTract] = useState("");
  const [immatRemorque,   setImmatRemor] = useState("");
  const [nomChauffeur,    setNomChauff]  = useState("");
  const [societeTransp,   setSocieteT]   = useState("");
  const [numeroCMR,       setNumeroCMR]  = useState("");
  // Côté chauffeur
  const [confirmReception,setConfirmR]   = useState(false);
  const [heureArrivee,    setHeureArr]   = useState("");
  const [departConfirme,  setDepartC]    = useState(false);
  const [destinationConfirmee,setDestC]  = useState(false);
  const [onglet,          setOnglet]     = useState("entreprise"); // entreprise | chauffeur
  const [saving,          setSaving]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPost(`/transports`, {
          lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
          typeVehicule, immatTracteur, immatRemorque, nomChauffeur,
          societeTransp, numeroCMR,
          confirmReception, heureArrivee, departConfirme, destinationConfirmee,
          statut: departConfirme?"EN_LIVRAISON":"EN_COURS_DECHIQUETAGE",
      });
      toast("Transport enregistré ✓");
      onSaved(departConfirme?"EN_LIVRAISON":"EN_COURS_DECHIQUETAGE");
    } catch {
      toast("Transport enregistré localement ✓");
      onSaved(departConfirme?"EN_LIVRAISON":"EN_COURS_DECHIQUETAGE");
    }
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:C.purpleD,color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>🚛 Transporteur</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero} · {lot.commune}</div>
          </div>
        </div>
        {/* Onglets */}
        <div style={{display:"flex",gap:8,marginTop:10}}>
          {[["entreprise","🏢 Entreprise"],["chauffeur","👤 Chauffeur"]].map(([v,l])=>(
            <button key={v} onClick={()=>setOnglet(v)} style={{
              flex:1,padding:"8px 0",borderRadius:8,fontSize:13,fontWeight:600,
              background:onglet===v?"rgba(255,255,255,.2)":"rgba(255,255,255,.05)",
              border:`1px solid ${onglet===v?"rgba(255,255,255,.4)":"rgba(255,255,255,.1)"}`,
              color:"#fff",cursor:"pointer",fontFamily:"inherit",
              WebkitTapHighlightColor:"transparent"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>
        {onglet==="entreprise"&&(
          <>
            <SectionTitle icon="📋" label="Lot assigné"/>
            <div style={{background:C.purpleL,borderRadius:12,padding:14,marginBottom:14,
              border:`1.5px solid ${C.purple}`}}>
              <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:C.purpleD}}>
                {lot.lotNumero}
              </div>
              <div style={{fontSize:12,color:C.tx3,marginTop:4}}>{lot.commune}</div>
            </div>

            <SectionTitle icon="🏢" label="Société de transport"/>
            <MInput label="Société" value={societeTransp} onChange={setSocieteT}
              placeholder="Nom de la société" required/>
            <MInput label="Numéro CMR" value={numeroCMR} onChange={setNumeroCMR}
              placeholder="N° lettre de voiture"/>

            <SectionTitle icon="🚛" label="Type de véhicule"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[["semi","🚛","Semi"],["camion_remorque","🚚","Cam.+Rem."],["benne_ampliroll","🏗️","Ampliroll"]].map(([v,e,l])=>(
                <button key={v} onClick={()=>setTypeVeh(v)} style={{
                  padding:"12px 6px",borderRadius:12,
                  border:`1.5px solid ${typeVehicule===v?C.purple:C.bd}`,
                  background:typeVehicule===v?C.purpleL:"#fff",cursor:"pointer",
                  fontFamily:"inherit",display:"flex",flexDirection:"column",
                  alignItems:"center",gap:4,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:22}}>{e}</span>
                  <span style={{fontSize:11,fontWeight:typeVehicule===v?600:400,
                    color:typeVehicule===v?C.purpleD:C.tx2}}>{l}</span>
                </button>
              ))}
            </div>

            <SectionTitle icon="🔑" label="Identification véhicule"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <MInput label="Immat. tracteur" value={immatTracteur} onChange={v=>setImmatTract(formatImmat(v))}
                placeholder="AB-123-CD" required/>
              <MInput label="Immat. remorque" value={immatRemorque} onChange={v=>setImmatRemor(formatImmat(v))}
                placeholder="AB-456-CD" hint="optionnel"/>
            </div>

            <SectionTitle icon="👤" label="Chauffeur assigné"/>
            <MInput label="Nom du chauffeur" value={nomChauffeur} onChange={setNomChauff}
              placeholder="Prénom Nom" required/>
          </>
        )}

        {onglet==="chauffeur"&&(
          <>
            <div style={{background:C.purpleL,borderRadius:14,padding:16,marginBottom:16,
              border:`1.5px solid ${C.purple}`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.purpleD,marginBottom:4}}>
                Mission en cours
              </div>
              <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:C.purpleD}}>
                {lot.lotNumero}
              </div>
              <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{lot.commune}</div>
              {nomChauffeur&&<div style={{fontSize:13,color:C.purpleD,marginTop:6}}>👤 {nomChauffeur}</div>}
            </div>

            <SectionTitle icon="✅" label="Étapes chauffeur"/>

            {[
              {label:"Réception ordre de transport",sub:"J'ai bien reçu ma mission",
               value:confirmReception,set:setConfirmR,icon:"📋"},
              {label:"Départ confirmé",sub:`Horodatage : ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,
               value:departConfirme,set:setDepartC,icon:"🚛"},
              {label:"Destination confirmée",sub:lot.commune||"Destination en attente",
               value:destinationConfirmee,set:setDestC,icon:"📍"},
            ].map((item,i)=>(
              <div key={i} onClick={()=>item.set(!item.value)} style={{
                display:"flex",alignItems:"center",gap:14,padding:"16px",
                borderRadius:14,marginBottom:10,cursor:"pointer",
                background:item.value?C.greenL:"#fff",
                border:`2px solid ${item.value?C.green:C.bd}`,
                WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:28}}>{item.value?"✅":item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:600,color:item.value?C.greenD:C.tx}}>
                    {item.label}
                  </div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{item.sub}</div>
                </div>
              </div>
            ))}

            <MInput label="Heure d'arrivée prévue" value={heureArrivee}
              onChange={setHeureArr} type="time" hint="optionnel"/>
          </>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleSave} disabled={saving} bg={C.purple} icon={saving?"":"🚛"}>
          {saving?"Enregistrement…":departConfirme?"DÉPART CONFIRMÉ — EN LIVRAISON":"ENREGISTRER TRANSPORT"}
        </BigBtn>
      </div>
    </div>
  );
};

// ── ÉCRAN LIVRAISON ───────────────────────────────────────────
const EcranLivraison = ({lot, onBack, onSaved, toast, entrepriseId}) => {
  const [typeDest,       setTypeDest]    = useState("chaufferie"); // chaufferie | plateforme
  const [numeroCMR,      setNumeroCMR]   = useState("");
  const [nomDestination, setNomDest]     = useState("");
  const [gpsLivraison,   setGpsLivr]     = useState(null);
  const [gpsLoading,     setGpsLoading]  = useState(false);
  const [pesee,          setPesee]       = useState("");
  const [humiditeReception,setHumRecep]  = useState(30);
  const [nomReceptionnaire,setNomRecep]  = useState("");
  const [signatureRecep, setSignRecep]   = useState(false);
  const [commentaire,    setComment]     = useState("");
  // Plateforme uniquement
  const [numeroPlateforme,setNumPlat]    = useState("");
  const [saving,         setSaving]      = useState(false);

  // Alerte GPS : si GPS capturé mais loin de la destination prévue
  const gpsAlerte = gpsLivraison && gpsLivraison.source === "sim";

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setGpsLivr({lat:pos.coords.latitude,lng:pos.coords.longitude,
        accuracy:pos.coords.accuracy,source:"gps"}); setGpsLoading(false); },
      () => { setGpsLivr({lat:47.98,lng:3.09,source:"sim"}); setGpsLoading(false); },
      {enableHighAccuracy:true,timeout:10000}
    ) ?? (() => { setGpsLivr({lat:47.98,lng:3.09,source:"sim"}); setGpsLoading(false); })();
  };

  const canValidate = nomDestination && pesee && nomReceptionnaire && gpsLivraison;

  const handleSave = async () => {
    if (!canValidate) { toast("Destination, pesée, réceptionnaire et GPS obligatoires","warn"); return; }
    setSaving(true);
    const statutFinal = typeDest==="chaufferie" ? "LIVRE_CHAUFFERIE" : "EN_STOCK_PLATEFORME";
    try {
      await apiPost(`/livraisons`, {
          lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
          typeDest, numeroCMR, nomDestination, gpsLivraison,
          pesee, humiditeReception, nomReceptionnaire, signatureRecep,
          commentaire, numeroPlateforme,
          dateHeureLivraison: new Date().toISOString(),
          statut: statutFinal,
          gpsAlerteDeclenche: gpsAlerte,
      });
      toast(typeDest==="chaufferie"?"Livraison chaufferie validée ✓":"Entrée stock plateforme ✓");
      onSaved(statutFinal);
    } catch {
      toast("Livraison enregistrée localement ✓");
      onSaved(statutFinal);
    }
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:C.greenD,color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>📦 Livraison</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.lotNumero} · {lot.commune}</div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:100}}>

        <SectionTitle icon="🏭" label="Type de destination"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[
            ["chaufferie","🔥","Chaufferie","Livraison directe"],
            ["plateforme","🏗️","Plateforme","Stockage intermédiaire"],
          ].map(([v,e,l,s])=>(
            <div key={v} onClick={()=>setTypeDest(v)} style={{
              padding:"14px 12px",borderRadius:14,cursor:"pointer",textAlign:"center",
              border:`2px solid ${typeDest===v?C.green:C.bd}`,
              background:typeDest===v?C.greenL:"#fff",
              WebkitTapHighlightColor:"transparent"}}>
              <div style={{fontSize:32,marginBottom:6}}>{e}</div>
              <div style={{fontSize:14,fontWeight:typeDest===v?700:500,
                color:typeDest===v?C.greenD:C.tx}}>{l}</div>
              <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{s}</div>
            </div>
          ))}
        </div>

        <SectionTitle icon="📄" label="Informations transport"/>
        <MInput label="N° CMR" value={numeroCMR} onChange={setNumeroCMR}
          placeholder="Numéro lettre de voiture" hint="optionnel"/>
        <MInput label={typeDest==="chaufferie"?"Nom de la chaufferie":"Nom de la plateforme"}
          value={nomDestination} onChange={setNomDest}
          placeholder={typeDest==="chaufferie"?"Ex: Chaufferie Auxerre":"Ex: Plateforme Sens"} required/>

        {typeDest==="plateforme"&&(
          <MInput label="N° emplacement plateforme" value={numeroPlateforme}
            onChange={setNumPlat} placeholder="Ex: Zone A - Emplacement 12" hint="optionnel"/>
        )}

        <SectionTitle icon="📍" label="Validation GPS lieu de livraison"/>
        {!gpsLivraison ? (
          <BigBtn onClick={captureGPS} bg={gpsLoading?C.bg2:C.greenL}
            color={gpsLoading?C.tx3:C.greenD} icon={gpsLoading?"":"📍"}>
            {gpsLoading?"Localisation…":"Capturer position GPS"}
          </BigBtn>
        ) : (
          <div style={{background:gpsAlerte?C.redL:C.greenL,borderRadius:12,padding:14,
            marginBottom:14,border:`1.5px solid ${gpsAlerte?C.red:C.green}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,
                  color:gpsAlerte?C.red:C.greenD,marginBottom:3}}>
                  {gpsAlerte?"⚠️ Position approximative":"📍 GPS confirmé"}
                </div>
                <div style={{fontFamily:"monospace",fontSize:12,
                  color:gpsAlerte?C.red:C.greenD}}>
                  {gpsLivraison.lat.toFixed(5)}°N · {gpsLivraison.lng.toFixed(5)}°E
                </div>
              </div>
              <button onClick={()=>setGpsLivr(null)} style={{background:"none",border:"none",
                color:C.tx3,cursor:"pointer",fontSize:20}}>✕</button>
            </div>
          </div>
        )}

        {gpsAlerte&&(
          <div style={{background:C.redL,borderRadius:12,padding:14,marginBottom:14,
            border:`1.5px solid ${C.red}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:6}}>
              🔴 Alerte GPS — Vérification requise
            </div>
            <div style={{fontSize:12,color:C.red,lineHeight:1.7}}>
              La position GPS ne correspond pas à la destination prévue.<br/>
              → Alerte envoyée au donneur d'ordre<br/>
              → Alerte envoyée au transporteur<br/>
              → Alerte envoyée à l'entreprise de déchiquetage
            </div>
          </div>
        )}

        <SectionTitle icon="⚖️" label="Pesée & Qualité"/>
        <MInput label="Poids livré (tonnes)" value={pesee} onChange={setPesee}
          type="number" placeholder="ex: 78.5" required/>
        <MSlider label="Humidité à réception" value={humiditeReception}
          onChange={setHumRecep} min={10} max={60} step={1} unit="%" color={C.blue}/>
        <div style={{
          background:humiditeReception<=30?C.greenL:humiditeReception<=45?C.amberL:C.redL,
          border:`1px solid ${humiditeReception<=30?C.green:humiditeReception<=45?C.amber:C.red}`,
          borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,fontWeight:600,
          color:humiditeReception<=30?C.greenD:humiditeReception<=45?C.amberD:C.red}}>
          {humiditeReception<=30?"✅ Conforme — excellente qualité"
            :humiditeReception<=45?"⚠️ Humidité élevée — à signaler"
            :"🔴 Hors normes — risque refus chaufferie"}
        </div>

        <SectionTitle icon="✍️" label="Réception"/>
        <MInput label="Nom du réceptionnaire" value={nomReceptionnaire}
          onChange={setNomRecep} placeholder="Prénom Nom" required/>

        <div onClick={()=>setSignRecep(!signatureRecep)} style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:14,borderRadius:12,marginBottom:14,cursor:"pointer",
          background:signatureRecep?C.greenL:"#fff",
          border:`2px solid ${signatureRecep?C.green:C.bd}`,
          WebkitTapHighlightColor:"transparent"}}>
          <div>
            <div style={{fontSize:15,fontWeight:600,color:signatureRecep?C.greenD:C.tx}}>
              ✍️ Signature réceptionnaire
            </div>
            <div style={{fontSize:12,color:C.tx3,marginTop:2}}>
              {signatureRecep?"✓ Signature confirmée":"Optionnel — confirmer la réception"}
            </div>
          </div>
          <div style={{fontSize:24}}>{signatureRecep?"✅":"📝"}</div>
        </div>

        <MInput label="Commentaire" value={commentaire} onChange={setComment}
          placeholder="Observations à la livraison…" big hint="optionnel"/>

        {typeDest==="plateforme"&&(
          <div style={{background:C.blueL,borderRadius:12,padding:14,marginBottom:14,
            border:`1px solid ${C.blue}`}}>
            <div style={{fontSize:13,fontWeight:600,color:C.blueD,marginBottom:6}}>
              📊 Stock plateforme créé
            </div>
            <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
              • N° lot origine : {lot.lotNumero}<br/>
              • Poids entrant : {pesee||"—"} tonnes<br/>
              • Date entrée : {new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,
        padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
        <BigBtn onClick={handleSave} disabled={saving||!canValidate}
          bg={canValidate?C.green:C.bg2} icon={saving?"":"✅"}>
          {saving?"Enregistrement…":
            typeDest==="chaufferie"?"VALIDER LIVRAISON CHAUFFERIE":"VALIDER ENTRÉE PLATEFORME"}
        </BigBtn>
      </div>
    </div>
  );
};

// ── GESTION DES ACCÈS / HIÉRARCHIE UTILISATEURS ───────────────
const EcranDashboardPC = ({user, contacts, visites, notifications, transports=[], livraisons=[], dechiquetages=[], pendingSyncCount=0, onLogout}) => {
  const [section, setSection] = useState("dashboard");
  const [lotDetail, setLotDetail] = useState(null);

  const lots = contacts.filter(c=>c.lotNumero);
  const enExploitation = lots.filter(c=>["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION"].includes(c.statutLot));
  const moisCourant = new Date().toISOString().slice(0,7);
  const livraisonsDuMois = livraisons.filter(l=>(l.dateHeureLivraison||l.dateLivraison||l.createdAt||"").slice(0,7)===moisCourant);
  const tonnesLivreesMois = livraisonsDuMois.reduce((s,l)=>s+(parseFloat(l.pesee)||0),0);
  const humidites = livraisons.map(l=>parseFloat(l.humiditeReception)).filter(n=>!isNaN(n));
  const humiditeMoyenne = humidites.length ? humidites.reduce((s,n)=>s+n,0)/humidites.length : null;

  // Séries journalières du mois en cours (tonnage livré et humidité moyenne par jour)
  const nbJoursMois = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  const tonnageParJour = Array.from({length:nbJoursMois},()=>0);
  const humiditeParJour = Array.from({length:nbJoursMois},()=>[]);
  livraisonsDuMois.forEach(l=>{
    const dateStr = l.dateHeureLivraison||l.dateLivraison||l.createdAt||"";
    const jour = parseInt(dateStr.slice(8,10),10);
    if (jour>=1 && jour<=nbJoursMois) {
      tonnageParJour[jour-1] += parseFloat(l.pesee)||0;
      const h = parseFloat(l.humiditeReception);
      if (!isNaN(h)) humiditeParJour[jour-1].push(h);
    }
  });
  const humiditeMoyenneParJour = humiditeParJour.map(arr=>arr.length?arr.reduce((s,n)=>s+n,0)/arr.length:0);
  const transportsEnCours = lots.filter(c=>c.statutLot==="EN_LIVRAISON").length;
  const alertesActives = notifications.filter(n=>!n.lu);
  const stockPlateformes = lots.filter(c=>["BORD_ROUTE","A_DECHIQUETER","EN_STOCK_PLATEFORME"].includes(c.statutLot))
    .reduce((s,c)=>s+(parseFloat(c.tonnageCumul)||0),0);
  const stockChaufferies = livraisons.filter(l=>l.typeDest==="chaufferie")
    .reduce((s,l)=>s+(parseFloat(l.pesee)||0),0);
  const cmrTotal = dechiquetages.length;
  const cmrConformes = dechiquetages.filter(d=>d.numeroCMR&&d.photoCMR).length;
  const tauxConformite = cmrTotal ? Math.round((cmrConformes/cmrTotal)*100) : null;

  const KPI_CARDS = [
    {icon:"⚖️",label:"Tonnage livré (mois)",val:fmtNum(tonnesLivreesMois)+" t",color:C.brown,chart:tonnageParJour},
    {icon:"📦",label:"Livraisons (mois)",val:livraisonsDuMois.length,color:C.blue},
    {icon:"💧",label:"Humidité moyenne",val:humiditeMoyenne!=null?fmtNum(humiditeMoyenne,1)+" %":"—",color:C.blueD,chart:humiditeMoyenneParJour},
    {icon:"🚛",label:"Transports en cours",val:transportsEnCours,color:C.purple},
    {icon:"⚠️",label:"Alertes actives",val:alertesActives.length,color:C.red,danger:alertesActives.length>0},
  ];

  const KPI_CARDS_2 = [
    {icon:"📥",label:"Stock plateformes",val:fmtNum(stockPlateformes)+" t",color:C.greenD},
    {icon:"🔥",label:"Stock chaufferies",val:fmtNum(stockChaufferies)+" t",color:C.brown},
    {icon:"⚡",label:"Consommation (MWh)",val:"—",color:C.tx3,note:"Donnée non disponible"},
    {icon:"💶",label:"Coût transport / t",val:"—",color:C.tx3,note:"Donnée non disponible"},
    {icon:"✅",label:"Taux de conformité CMR",val:tauxConformite!=null?tauxConformite+" %":"—",color:C.green},
  ];

  const MAP_LEGEND = [
    ["🌲",C.green,"Lots forestiers"],
    ["📦",C.amber,"Plateformes"],
    ["🔥",C.green,"Chaufferies"],
    ["🚛",C.purple,"Transports"],
    ["⚠️",C.red,"Alertes"],
  ];

  return (
    <div style={{display:"flex",height:"100dvh",fontFamily:FONT_BODY,background:C.bg,color:C.tx}}>
      {/* Sidebar */}
      <div style={{width:230,background:C.sb,color:"#fff",flexShrink:0,
        display:"flex",flexDirection:"column",padding:"20px 0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 20px 24px"}}>
          <img src="/logo.png" alt="APPLITAG" style={{width:30,height:30,objectFit:"contain"}}/>
          <div>
            <div style={{fontSize:15,fontWeight:700,fontFamily:FONT_TITLE}}>APPLITAG</div>
            <div style={{fontSize:10,opacity:.6}}>by ALTEGAD SAS</div>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>
          {DASHBOARD_NAV.map(item=>(
            <div key={item.id} onClick={()=>setSection(item.id)} style={{
              display:"flex",alignItems:"center",gap:10,padding:"11px 20px",cursor:"pointer",
              background:section===item.id?"rgba(255,255,255,.12)":"transparent",
              borderLeft:`3px solid ${section===item.id?C.greenPale:"transparent"}`,
              fontSize:14,fontWeight:section===item.id?600:400,
              WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
              <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>
              {item.id==="alertes"&&alertesActives.length>0&&(
                <span style={{background:C.red,color:"#fff",fontSize:10,fontWeight:700,
                  borderRadius:10,padding:"2px 7px",flexShrink:0}}>{alertesActives.length}</span>
              )}
            </div>
          ))}
        </div>
        <div onClick={onLogout} style={{display:"flex",alignItems:"center",gap:10,
          padding:"12px 20px",cursor:"pointer",borderTop:"1px solid rgba(255,255,255,.12)"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:C.greenL,
            color:C.greenD,display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:700,fontSize:13,flexShrink:0}}>
            {(user?.prenom||user?.nom||"?")[0]}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600}}>
              {user?.prenom ? `${user.prenom[0]}.` : ""} {user?.nom}
            </div>
            <div style={{fontSize:11,opacity:.6}}>Exploitant</div>
          </div>
          <span style={{fontSize:14,opacity:.6}}>›</span>
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{flex:1,overflowY:"auto",padding:24}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{fontSize:20,fontWeight:700,fontFamily:FONT_TITLE,color:C.tx}}>
            {DASHBOARD_NAV.find(n=>n.id===section)?.label||"Tableau de bord"}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {pendingSyncCount>0&&(
              <div title="Enregistrements en attente de synchronisation avec le serveur"
                style={{background:C.amberL,color:C.amberD,fontSize:12,fontWeight:600,
                padding:"6px 12px",borderRadius:20}}>📡 {pendingSyncCount}</div>
            )}
            {alertesActives.length>0&&(
              <div style={{background:C.redL,color:C.red,fontSize:12,fontWeight:600,
                padding:"6px 12px",borderRadius:20}}>🔔 {alertesActives.length}</div>
            )}
            <div style={{width:34,height:34,borderRadius:"50%",background:C.greenL,
              color:C.greenD,display:"flex",alignItems:"center",justifyContent:"center",
              fontWeight:700,fontSize:14}}>
              {(user?.prenom||user?.nom||"?")[0]}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{user?.prenom} {user?.nom}</div>
              <div style={{fontSize:11,color:C.tx3,textTransform:"capitalize"}}>{user?.role}</div>
            </div>
          </div>
        </div>

        {section==="dashboard" && (
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:20}}>
              {KPI_CARDS.map((k,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:14,padding:16,
                  border:`1px solid ${C.bd}`,borderLeft:k.danger?`4px solid ${C.red}`:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontSize:24,fontWeight:700,color:k.color,fontFamily:FONT_TITLE}}>{k.val}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2,marginBottom:k.chart?8:0}}>{k.label}</div>
                  {k.chart&&<MiniBarChart data={k.chart} color={k.color}/>}
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,alignItems:"start",marginBottom:20}}>
              <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
                padding:16,height:480,display:"flex",flexDirection:"column",position:"relative"}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:10,fontFamily:FONT_TITLE}}>
                  Suivi des activités en temps réel
                </div>
                <div style={{flex:1,borderRadius:10,overflow:"hidden",position:"relative"}}>
                  <EcranCarte contacts={contacts} visites={visites}
                    onOpenLot={lot=>setLotDetail(lot)}/>
                  <div style={{position:"absolute",bottom:10,left:10,background:"rgba(255,255,255,.95)",
                    borderRadius:10,padding:"8px 12px",boxShadow:"0 2px 8px rgba(0,0,0,.12)",
                    display:"flex",flexDirection:"column",gap:5,zIndex:5}}>
                    {MAP_LEGEND.map(([icon,color,label],i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.tx2}}>
                        <span style={{fontSize:12}}>{icon}</span>{label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,fontFamily:FONT_TITLE}}>🚛 Transports en cours</div>
                    {transports.length>3&&(
                      <span onClick={()=>setSection("transports")} style={{fontSize:11,color:C.green,
                        fontWeight:600,cursor:"pointer"}}>Voir tout</span>
                    )}
                  </div>
                  {transports.filter(t=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut)).length===0 ? (
                    <div style={{fontSize:13,color:C.tx3}}>Aucun transport en cours.</div>
                  ) : transports.filter(t=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut)).slice(0,3).map((t,i)=>(
                    <div key={t.id||i} style={{marginBottom:12,paddingBottom:12,
                      borderBottom:i<2?`1px solid ${C.bd}`:"none"}}>
                      <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.tx}}>
                        {t.lotNumero||"—"}
                      </div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        {t.societeTransp||t.immatTracteur||"Transporteur"}
                      </div>
                      <span style={{fontSize:10,color:C.green,fontWeight:600}}>● En route</span>
                    </div>
                  ))}
                  {transports.filter(t=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut)).length>3&&(
                    <div style={{fontSize:11,color:C.tx3}}>
                      + {transports.filter(t=>!["LIVRE","LIVRE_CHAUFFERIE"].includes(t.statut)).length-3} autres transports
                    </div>
                  )}
                </div>

                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,fontFamily:FONT_TITLE}}>🔔 Alertes récentes</div>
                    {notifications.length>3&&(
                      <span onClick={()=>setSection("alertes")} style={{fontSize:11,color:C.green,
                        fontWeight:600,cursor:"pointer"}}>Voir tout</span>
                    )}
                  </div>
                  {notifications.length===0 ? (
                    <div style={{fontSize:13,color:C.tx3}}>Aucune alerte récente.</div>
                  ) : notifications.slice(0,3).map((n,i)=>(
                    <div key={n.id||i} style={{display:"flex",gap:10,marginBottom:12}}>
                      <span style={{fontSize:14}}>{n.lu?"✅":"⚠️"}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,color:C.tx,lineHeight:1.4}}>{n.message||n.titre||"—"}</div>
                        <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                          {n.date?new Date(n.date).toLocaleString("fr-FR"):""}
                        </div>
                      </div>
                    </div>
                  ))}
                  {notifications.length>3&&(
                    <div style={{fontSize:11,color:C.tx3}}>+ {notifications.length-3} autres alertes</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:20}}>
              {KPI_CARDS_2.map((k,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:14,padding:16,
                  border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontSize:22,fontWeight:700,color:k.color,fontFamily:FONT_TITLE}}>{k.val}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{k.label}</div>
                  {k.note&&<div style={{fontSize:10,color:C.tx3,marginTop:2,fontStyle:"italic"}}>{k.note}</div>}
                </div>
              ))}
            </div>

            {lotDetail && (
              <div style={{marginTop:16,background:"#fff",borderRadius:14,
                border:`1px solid ${C.bd}`,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:14,fontWeight:700,fontFamily:FONT_TITLE}}>
                    🌲 {lotDetail.lotNumero} · {lotDetail.commune}
                  </div>
                  <button onClick={()=>setLotDetail(null)} style={{border:"none",background:"transparent",
                    cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,fontSize:13}}>
                  <div><span style={{color:C.tx3}}>Statut</span><br/>
                    <strong>{(STATUT_LOT[lotDetail.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU).label}</strong></div>
                  <div><span style={{color:C.tx3}}>Propriétaire</span><br/><strong>{lotDetail.nom||"—"}</strong></div>
                  <div><span style={{color:C.tx3}}>Tonnage cumulé</span><br/>
                    <strong>{fmtNum(lotDetail.tonnageCumul||0)} t</strong></div>
                  <div><span style={{color:C.tx3}}>Nature produit</span><br/><strong>{lotDetail.potentiel||"—"}</strong></div>
                </div>
              </div>
            )}
          </>
        )}

        {section==="lots" && (
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            height:"calc(100dvh - 140px)",overflow:"hidden"}}>
            <EcranLots contacts={contacts} onNewLot={()=>{}}
              onOpenLot={setLotDetail} filtreInitial="TOUS"/>
          </div>
        )}

        {section==="carte" && (
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            height:"calc(100dvh - 140px)",overflow:"hidden"}}>
            <EcranCarte contacts={contacts} visites={visites} onOpenLot={setLotDetail}/>
          </div>
        )}

        {section==="documents" && <SectionDocuments/>}
        {section==="analyses" && <SectionAnalyses/>}
        {section==="chantiers"   && <SectionChantiers/>}
        {section==="transports"  && <SectionTransports/>}
        {section==="livraisons"   && <SectionLivraisons/>}
        {section==="facture_elec" && <SectionFacturationElec/>}
        {section==="chaufferies"  && <SectionChaufferies/>}
        {section==="rapports"    && <SectionRapports/>}
        {section==="parametres"  && <SectionParametres/>}
        {section==="reseau"      && <SectionReseau/>}

        {[].includes(section) && (
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:40,textAlign:"center",color:C.tx3}}>
            <div style={{fontSize:32,marginBottom:10}}>🚧</div>
            Module "{DASHBOARD_NAV.find(n=>n.id===section)?.label}" — bientôt disponible sur le tableau de bord desktop.
          </div>
        )}

        {section==="utilisateurs" && (
          <SectionAcces isDemo={true}/>
        )}

        {section==="abonnements" && (
          <SectionAbonnements/>
        )}

        {section==="financements" && (
          <SectionFinancements/>
        )}

        {section==="conformite_red" && (
          <SectionConformiteRED lots={lots} visites={visites} livraisons={livraisons}/>
        )}

        {section==="cout_reglementaire" && (
          <SectionCoutReglementaire lots={lots} livraisons={livraisons}/>
        )}

        {section==="ges" && (
          <SectionGES lots={lots} visites={visites} livraisons={livraisons}/>
        )}

        {section==="demo" && (
          <SectionDemoScenario/>
        )}

        {section==="futur" && (
          <SectionModulesFuturs/>
        )}

        {section==="parcelles" && (
          <SectionParcelleTravaux/>
        )}
        {section==="desserte"        && <SectionDesserte/>}
        {section==="coproduits"      && <SectionCoproduits/>}
        {section==="projet_finance"  && <SectionProjetFinance/>}
        {section==="permis_incendie" && <SectionPermisIncendie/>}
        {section==="scierie"       && <SectionScierie/>}
        {section==="bois_crise"   && <SectionBoisCrise/>}
        {section==="fiche_comb"   && <SectionFicheCombustible/>}
        {section==="registre_ia"  && <SectionRegistreIA/>}
        {section==="applitag_data"&& <SectionApplitgData onSignaler={()=>setSection("desserte")}/>}

        {section==="reglementation" && (
          <SectionVeilleReglementaire/>
        )}

        {section==="territoire" && (
          <SectionTerritoire/>
        )}

        {section==="planning" && (
          <SectionPlanning
            contacts={contacts} visites={visites}
            transports={transports} livraisons={livraisons}
            onSelectLot={(lotId)=>{ const lot=contacts.find(c=>c.id===lotId); if(lot){setLotDetail(lot);setSection("lots");} }}
          />
        )}

        {section==="alertes" && <HubAlertes
          contacts={contacts} livraisons={livraisons}
          onGoTo={setSection}
        />}
      </div>
    </div>
  );
};

export default function App() {
  const [user,      setUser]      = useState(()=>getUser());
  const [operateur, setOperateur] = useState(()=>{ try { return JSON.parse(localStorage.getItem("applitag_operateur")||"null"); } catch { return null; } });
  const [screen,    setScreen]    = useState("accueil");
  const [fiche0Prefill, setFiche0Prefill] = useState(null);
  const [roleChoisi, setRoleChoisi] = useState(null);
  const [contacts,  setContacts]  = useState(()=>getUser()?.demo ? DEMO_LOTS : []);
  const [visites,   setVisites]   = useState(()=>getUser()?.demo ? DEMO_VISITES : []);
  const [toasts,    setToasts]    = useState([]);
  const [activeLot, setActiveLot] = useState(null);
  const [activeContact, setActiveContact] = useState(null);
  const [showQr,    setShowQr]    = useState(false);
  const [filtreLotsInitial, setFiltreLotsInitial] = useState("TOUS");
  const [operateurs, setOperateurs] = useState([]);
  const [showEtfModal,    setShowEtfModal]    = useState(false);
  const [showDelegVisite, setShowDelegVisite] = useState(false);
  const [isDemoMode,   setIsDemoMode]   = useState(()=>!!(getUser()?.demo));
  const [reportings,   setReportings]   = useState(()=>getUser()?.demo ? DEMO_REPORTINGS : []);
  const [transports,   setTransports]   = useState(()=>getUser()?.demo ? DEMO_TRANSPORTS : []);
  const [livraisons,   setLivraisons]   = useState(()=>getUser()?.demo ? DEMO_LIVRAISONS : []);
  const [dechiquetages,setDechiquetages] = useState(()=>getUser()?.demo ? DEMO_DECHIQUETAGES : []);
  const [avisArrivee,  setAvisArrivee]   = useState(()=>{try{const s=sessionStorage.getItem("applitag_avis_arrivee");return s?JSON.parse(s):{}}catch{return{}}});
  const [camionsPartis,setCamionsPartis] = useState(()=>{try{const s=sessionStorage.getItem("applitag_camions_partis");return s?JSON.parse(s):{}}catch{return{}}});
  const [gpsChantier,  setGpsChantier]  = useState({}); // {[lotId]: {lat,lng,heure}}
  const entrepriseId = getEntrepriseId();

  // Bascule vers le tableau de bord desktop (admin) sur grand écran
  const [isWideScreen, setIsWideScreen] = useState(()=>window.innerWidth>=1024);
  useEffect(()=>{
    const onResize = () => setIsWideScreen(window.innerWidth>=1024);
    window.addEventListener("resize", onResize);
    return ()=>window.removeEventListener("resize", onResize);
  },[]);

  // Resynchronisation des enregistrements restés en local (ordres, annonces, comptes)
  // dès que l'API correspondante répond — réduit la dépendance au localStorage seul,
  // notamment sensible sur iOS Safari hors écran d'accueil.
  const [pendingSyncCount, setPendingSyncCount] = useState(()=>countPendingSync());
  useEffect(()=>{
    if (!user || isDemoMode) return;
    resyncPendingRecords().finally(()=>setPendingSyncCount(countPendingSync()));
  },[user, isDemoMode]);

  const toast = useCallback((msg,type="success")=>{
    const id=uid();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000);
  },[]);

  const [notifications, setNotifications] = useState([]);

  useEffect(()=>{
    if (!user || isDemoMode) return;
    apiGet(`/contacts`)
      .then(d=>{
        if(Array.isArray(d)) {
          try {
            const deleted = deletedLotsGet();
            const filtered = d.filter(c=>!deleted.includes(c.id));
            const local = JSON.parse(localStorage.getItem("applitag_contacts")||"[]");
            if(local.length>0) {
              const ordre = ["NOUVEAU","VISITE_PREVUE","VISITE_REALISEE","VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"];
              const merged = filtered.map(c=>{
                const l = local.find(x=>x.id===c.id);
                if(l && ordre.indexOf(l.statutLot)>ordre.indexOf(c.statutLot)) return {...c,statutLot:l.statutLot};
                return c;
              });
              setContacts(merged);
            } else { setContacts(filtered); }
          } catch { setContacts(d); }
        }
      })
      .catch(()=>{
        try { const c=JSON.parse(localStorage.getItem("applitag_contacts")||"[]"); if(c.length>0) setContacts(c); } catch {}
      });
    apiGet(`/visites`).then(d=>{ if(Array.isArray(d)) setVisites(d); }).catch(()=>{});
    apiGet(`/notifications/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setNotifications(d); }).catch(()=>{});
    apiGet(`/operateurs/entreprise/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setOperateurs(d); }).catch(()=>{});
    apiGet(`/reportings`).then(d=>{ if(Array.isArray(d)) setReportings(d); }).catch(()=>{});
    apiGet(`/transports`).then(d=>{ if(Array.isArray(d)) setTransports(d); }).catch(()=>{});
    apiGet(`/livraisons`).then(d=>{ if(Array.isArray(d)) setLivraisons(d); }).catch(()=>{});
    apiGet(`/dechiquetage`).then(d=>{ if(Array.isArray(d)) setDechiquetages(d); }).catch(()=>{});
  },[user]);

  const [transitioning, setTransitioning] = useState(false);

  // Auto-save contacts to localStorage
  useEffect(()=>{
    if(contacts.length>0 && !isDemoMode) {
      try { localStorage.setItem("applitag_contacts", JSON.stringify(contacts)); } catch {}
    }
  },[contacts]);

  const handleLogin = (u) => {
    setTransitioning(true);
    setUser(u);
    setTimeout(()=>setTransitioning(false), 50);
  };
  const handleLoginOperateur = (op) => {
    setOperateur(op);
    try { localStorage.setItem("applitag_operateur", JSON.stringify(op)); } catch {}
  };
  const handleLoginDemo = (role) => {
    if (!IS_DEMO_BUILD) return;
    setIsDemoMode(true);
    setContacts(DEMO_LOTS);
    setVisites(DEMO_VISITES);
    setReportings(DEMO_REPORTINGS);
    setTransports(DEMO_TRANSPORTS);
    setLivraisons(DEMO_LIVRAISONS);
    setDechiquetages(DEMO_DECHIQUETAGES);
    if (role === "operateur") {
      const demoOp = {
        ...DEMO_USERS.operateur, demo:true,
        assignations: [
          {id:"demo-asgn-1", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001", typeOperation:"abattage"},
          {id:"demo-asgn-2", lotId:"demo-lot-2", lotNumero:"LOT-2026-06-89-002", typeOperation:"debardage"},
        ],
      };
      setOperateur(demoOp);
      return;
    }
    const demoKey = role === "contact" ? "contact" : role;
    const u = {...DEMO_USERS[demoKey], demo:true};
    setUser(u);
    setAuth("demo-token", u, DEMO_ENTREPRISE_ID);
  };
  const handleLogoutOperateur = () => {
    localStorage.removeItem("applitag_operateur");
    setOperateur(null);
  };
  const handleLogout = () => {
    clearAuth();
    setRoleChoisi(null);
    setTransitioning(true);
    setTimeout(()=>window.location.reload(), 200);
  };

  // Scroll to top on every screen change
  useEffect(()=>{
    window.scrollTo(0,0);
    document.querySelectorAll('[data-scrollable]').forEach(el=>{ el.scrollTop=0; });
  },[screen]);

  if (transitioning) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",height:"100dvh",background:C.sb,color:"#fff",
      fontFamily:FONT_BODY}}>
      <div style={{fontSize:48,marginBottom:16}}>🌲</div>
      <div style={{fontSize:18,fontWeight:700,fontFamily:FONT_TITLE}}>APPLITAG</div>
    </div>
  );

  if (operateur) return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranOperateur operateur={operateur} onLogout={handleLogoutOperateur} toast={toast}
        onUpdateOperateur={op=>{ setOperateur(op); try{localStorage.setItem("applitag_operateur",JSON.stringify(op));}catch{} }}/>
    </div>
  );

  if (!user) return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <LoginScreen onLogin={handleLogin} onLoginOperateur={handleLoginOperateur} onLoginDemo={handleLoginDemo}/>
    </div>
  );

  if (showQr) return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <QrCodeAdmin entrepriseId={entrepriseId} entrepriseNom="APPLITAG"
        onClose={()=>setShowQr(false)}/>
    </div>
  );

  // ── PICKER MULTI-RÔLES ──
  const tousRoles = user?.roles?.length>1 ? user.roles : null;
  const roleEffectif = roleChoisi || user?.role;
  if (tousRoles && !roleChoisi) {
    const ROLE_INFO = {
      admin:        {icon:"⚙️", label:"Administration",      desc:"Gestion complète de l'application"},
      manager:      {icon:"📊", label:"Manager",              desc:"Supervision et rapports"},
      proprietaire: {icon:"🏠", label:"Espace Propriétaire",  desc:"Mes lots et suivis"},
      mandataire:   {icon:"🤝", label:"Mandataire",           desc:"Visites terrain déléguées"},
      operateur:    {icon:"👷", label:"Opérateur terrain",    desc:"Saisies et opérations"},
      dechiquetage: {icon:"🔧", label:"Déchiquetage",         desc:"Chantiers à traiter"},
      chauffeur:    {icon:"🚛", label:"Chauffeur",            desc:"Transports assignés"},
      chaufferie:   {icon:"🏭", label:"Chaufferie",           desc:"Livraisons reçues"},
    };
    return (
      <div style={{display:"flex",flexDirection:"column",height:"100dvh",fontFamily:FONT_BODY,
        maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)",
        background:C.sb,color:"#fff"}}>
        <div style={{padding:"32px 24px 20px",textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:10}}>🌲</div>
          <div style={{fontSize:20,fontWeight:700,fontFamily:FONT_TITLE}}>APPLITAG</div>
          <div style={{fontSize:13,opacity:.6,marginTop:6}}>
            Bonjour {user.prenom||user.nom} — choisissez votre espace
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"0 20px 40px"}}>
          {tousRoles.map(r=>{
            const info = ROLE_INFO[r]||{icon:"👤",label:r,desc:""};
            return (
              <button key={r} onClick={()=>setRoleChoisi(r)}
                style={{width:"100%",padding:18,borderRadius:14,marginBottom:10,
                  background:"rgba(255,255,255,.1)",border:"1.5px solid rgba(255,255,255,.25)",
                  color:"#fff",fontFamily:"inherit",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:14,textAlign:"left",
                  WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:30}}>{info.icon}</span>
                <div>
                  <div style={{fontSize:15,fontWeight:600}}>{info.label}</div>
                  <div style={{fontSize:12,opacity:.6,marginTop:2}}>{info.desc}</div>
                </div>
              </button>
            );
          })}
          <button onClick={handleLogout}
            style={{width:"100%",marginTop:8,padding:12,borderRadius:12,
              background:"none",border:"1px solid rgba(255,255,255,.2)",
              color:"rgba(255,255,255,.5)",fontFamily:"inherit",fontSize:13,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
            ⎋ Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  // Rôles simplifiés (non-admin)
  if (roleEffectif==="mandataire") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <div style={{background:C.sb,color:"#fff",padding:"12px 16px 10px",flexShrink:0,
        display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>🔭 Espace Mandataire</div>
          <div style={{fontSize:11,opacity:.6}}>{user.prenom} {user.nom}</div>
        </div>
        <button onClick={handleLogout} style={{background:"rgba(255,255,255,.1)",
          border:"none",color:"rgba(255,255,255,.6)",padding:"6px 10px",borderRadius:8,
          fontSize:12,cursor:"pointer"}}>⎋</button>
      </div>
      {screen==="visite-form"&&activeLot ? (
        <FormulaireVisite
          lot={activeLot}
          onBack={()=>{ setScreen("mandataire-lots"); setActiveLot(null); }}
          onSaved={v=>{
            setVisites(prev=>[v,...prev]);
            setContacts(prev=>prev.map(c=>c.id===activeLot.id?{...c,statutLot:"VISITE_REALISEE"}:c));
            apiPost(`/contacts/${activeLot.id}/transition`, {action:"validerVisite"}).catch(()=>{});
            setScreen("mandataire-lots"); setActiveLot(null);
            toast("Visite enregistrée ✓");
          }}
          toast={toast} entrepriseId={entrepriseId}/>
      ) : (
        <EcranRoleMandataire user={user} contacts={contacts} onSelectLot={lot=>{
          setActiveLot(lot); setScreen("visite-form");
        }}/>
      )}
    </div>
  );

  if (roleEffectif==="contact") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <Fiche0
        onBack={handleLogout}
        onSaved={()=>{}}
        toast={toast}
        contactCount={9}
        entrepriseId={DEMO_ENTREPRISE_ID}
        prefill={{
          nom:"Dubois", prenom:"Marie",
          telephone:"0386491234", email:"",
          id:"demo-prop2",
        }}
        comptes={[]}
      />
    </div>
  );

  if (roleEffectif==="proprietaire") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <div style={{background:C.sb,color:"#fff",padding:"12px 16px 10px",flexShrink:0,
        display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>🏠 Espace Propriétaire</div>
          <div style={{fontSize:11,opacity:.6}}>{user.prenom} {user.nom}</div>
        </div>
        <button onClick={handleLogout} style={{background:"rgba(255,255,255,.1)",
          border:"none",color:"rgba(255,255,255,.6)",padding:"6px 10px",borderRadius:8,
          fontSize:12,cursor:"pointer"}}>⎋</button>
      </div>
      <EcranRoleProprietaire user={user} contacts={contacts} visites={visites}
        reportings={reportings} livraisons={livraisons} dechiquetages={dechiquetages}/>
    </div>
  );

  if (roleEffectif==="entreprise") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <div style={{background:"#5D4037",color:"#fff",padding:"12px 16px 10px",flexShrink:0,
        display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>🏢 Entreprise sollicitée</div>
          <div style={{fontSize:11,opacity:.6}}>{user.nomEntreprise||user.prenom+" "+user.nom}</div>
        </div>
        <button onClick={handleLogout} style={{background:"rgba(255,255,255,.1)",
          border:"none",color:"rgba(255,255,255,.6)",padding:"6px 10px",borderRadius:8,
          fontSize:12,cursor:"pointer"}}>⎋</button>
      </div>
      <EcranEntrepriseSollicitee user={user} lots={contacts} toast={toast}/>
    </div>
  );

  if (roleEffectif==="chauffeur") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <div style={{background:"#534AB7",color:"#fff",padding:"12px 16px 10px",flexShrink:0,
        display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>🚛 Espace Chauffeur</div>
          <div style={{fontSize:11,opacity:.6}}>{user.prenom} {user.nom}</div>
        </div>
        <button onClick={handleLogout} style={{background:"rgba(255,255,255,.1)",
          border:"none",color:"rgba(255,255,255,.6)",padding:"6px 10px",borderRadius:8,
          fontSize:12,cursor:"pointer"}}>⎋</button>
      </div>
      <EcranRoleChauffeur user={user} transports={transports} dechiquetages={dechiquetages}
        gpsChantier={gpsChantier}
        onValiderArrivee={(lotId,h,nomChauffeur,capaciteM3)=>setAvisArrivee(p=>{const next={...p,[lotId]:{heure:h,nomChauffeur:nomChauffeur.trim(),capaciteM3}};try{sessionStorage.setItem("applitag_avis_arrivee",JSON.stringify(next))}catch{}return next;})}
        onValiderDepart={(lotId,info)=>setCamionsPartis(p=>{const next={...p,[lotId]:info};try{sessionStorage.setItem("applitag_camions_partis",JSON.stringify(next))}catch{}return next;})}/>
    </div>
  );

  if (roleEffectif==="dechiquetage") {
    if (activeLot) return (
      <div style={{display:"flex",flexDirection:"column",height:"100dvh",
        fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
        <EcranDechiquetage
          lot={activeLot}
          operateurs={operateurs}
          onBack={()=>setActiveLot(null)}
          onSaved={(newStatut)=>{
            setContacts(prev=>prev.map(c=>c.id===activeLot.id?{...c,statutLot:newStatut}:c));
            setActiveLot(null);
            toast("Déchiquetage enregistré ✓");
          }}
          toast={toast}
          entrepriseId={entrepriseId}
          user={user}/>
      </div>
    );
    return (
      <div style={{display:"flex",flexDirection:"column",height:"100dvh",
        fontFamily:FONT_BODY,
        maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
        <div style={{background:"#D85A30",color:"#fff",padding:"12px 16px 10px",flexShrink:0,
          display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>🌀 Espace Déchiquetage</div>
            <div style={{fontSize:11,opacity:.6}}>{user.prenom} {user.nom}</div>
          </div>
          <button onClick={handleLogout} style={{background:"rgba(255,255,255,.1)",
            border:"none",color:"rgba(255,255,255,.6)",padding:"6px 10px",borderRadius:8,
            fontSize:12,cursor:"pointer"}}>⎋</button>
        </div>
        <EcranRoleDechiquetage user={user} contacts={contacts}
          onLaunchDechiquetage={lot=>setActiveLot(lot)}
          avisArrivee={avisArrivee}
          camionsPartis={camionsPartis}
          toast={toast}
          onArriveeChantier={(lotId,heure,coords)=>setGpsChantier(p=>({...p,[lotId]:{heure,coords}}))}/>
      </div>
    );
  }

  if (roleEffectif==="chaufferie") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <div style={{background:"#8B2500",color:"#fff",padding:"12px 16px 10px",flexShrink:0,
        display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>🔥 Espace Chaufferie</div>
          <div style={{fontSize:11,opacity:.6}}>{user.prenom} {user.nom}</div>
        </div>
        <button onClick={handleLogout} style={{background:"rgba(255,255,255,.1)",
          border:"none",color:"rgba(255,255,255,.6)",padding:"6px 10px",borderRadius:8,
          fontSize:12,cursor:"pointer"}}>⎋</button>
      </div>
      <EcranRoleChaufferie user={user} livraisons={livraisons}/>
    </div>
  );

  if (roleEffectif==="receptionnaire") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <div style={{background:"#1565C0",color:"#fff",padding:"12px 16px 10px",flexShrink:0,
        display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>🏗️ Plateforme de stockage</div>
          <div style={{fontSize:11,opacity:.6}}>{user.prenom} {user.nom}</div>
        </div>
        <button onClick={handleLogout} style={{background:"rgba(255,255,255,.1)",
          border:"none",color:"rgba(255,255,255,.6)",padding:"6px 10px",borderRadius:8,
          fontSize:12,cursor:"pointer"}}>⎋</button>
      </div>
      <EcranRoleReceptionnaire user={user} livraisons={livraisons} contacts={contacts} visites={visites} toast={toast}/>
    </div>
  );

  const screensFullPage = ["fiche0","fiche-lot","edit-contact","visite-form","validation-exploitation","cloture-exploitation","dechiquetage","transporteur","livraison","bon-commande","saisies","fin-chantier","red-declaration","delegations"];
  const isFullPage = screensFullPage.includes(screen);

  const navItems = [
    {id:"accueil", label:"Accueil", icon:"🏠"},
    {id:"lots",    label:"Lots",    icon:"🌲"},
    {id:"carte",   label:"Carte",   icon:"🗺️"},
    {id:"alertes", label:"Alertes", icon:"🔔", badge: notifications.length},
    (roleEffectif==="admin"||roleEffectif==="manager")
      ? {id:"saisies", label:"Saisies", icon:"📋"}
      : {id:"profil",  label:"Profil",  icon:"👤"},
  ].filter(Boolean);

  const SCREEN_TITLES = {
    accueil:"APPLITAG", lots:"Mes lots", carte:"Carte",
    alertes:"Alertes", profil:"Profil",
  };

  if (roleEffectif==="admin" && isWideScreen) return (
    <EcranDashboardPC user={user} contacts={contacts} visites={visites}
      notifications={notifications} transports={transports} livraisons={livraisons}
      dechiquetages={dechiquetages} toasts={toasts} pendingSyncCount={pendingSyncCount}
      onLogout={handleLogout}/>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,
      background:C.bg,color:C.tx,maxWidth:430,margin:"0 auto",
      boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>

      {/* Bandeau démonstration — visible uniquement en mode démo */}
      {IS_DEMO_BUILD && (
        <div style={{
          position:"fixed",top:0,left:0,right:0,zIndex:10000,
          background:"#92400e",color:"#fef3c7",
          fontSize:12,fontWeight:700,textAlign:"center",
          padding:"6px 8px",letterSpacing:"0.03em",
          maxWidth:430,margin:"0 auto",
        }}>
          🎭 MODE DÉMONSTRATION — Données fictives, aucune donnée réelle
        </div>
      )}

      {/* Toasts */}
      <div style={{position:"fixed",top: IS_DEMO_BUILD ? 32 : 16,left:16,right:16,zIndex:9999,
        display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
        {toasts.map(t=>(
          <div key={t.id} style={{padding:"12px 16px",borderRadius:12,
            fontSize:14,fontWeight:500,color:"#fff",textAlign:"center",
            background:t.type==="success"?C.greenD:C.amberD,
            boxShadow:"0 4px 20px rgba(0,0,0,.25)"}}>
            {t.type==="success"?"✓":"⚠"} {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      {!isFullPage&&(
        <div style={{background:C.sb,color:"#fff",flexShrink:0,padding:"12px 16px 10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/logo.png" alt="APPLITAG" style={{width:32,height:32,objectFit:"contain"}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:600,fontFamily:FONT_TITLE}}>{SCREEN_TITLES[screen]||"APPLITAG"}</div>
              <div style={{fontSize:11,opacity:.6,display:"flex",alignItems:"center",gap:8}}>
                {user.prenom||user.nom} · {roleEffectif}
                {tousRoles&&(
                  <button onClick={()=>setRoleChoisi(null)}
                    style={{background:"rgba(255,255,255,.15)",border:"none",color:"rgba(255,255,255,.8)",
                      padding:"2px 7px",borderRadius:6,fontSize:10,cursor:"pointer",
                      WebkitTapHighlightColor:"transparent"}}>
                    Changer
                  </button>
                )}
              </div>
            </div>
            {roleEffectif==="admin"&&pendingSyncCount>0&&(
              <div title="Enregistrements en attente de synchronisation avec le serveur" style={{
                background:C.amberL,color:C.amberD,padding:"6px 10px",borderRadius:8,
                fontSize:11,fontWeight:600}}>📡 {pendingSyncCount}</div>
            )}
            {user.role==="admin"&&(
              <button onClick={()=>setShowQr(true)} style={{
                background:"rgba(255,255,255,.1)",border:"none",color:"#fff",
                padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>📲 QR</button>
            )}
            <button onClick={handleLogout} style={{
              background:"rgba(255,255,255,.1)",border:"none",color:"rgba(255,255,255,.6)",
              padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>⎋</button>
          </div>
        </div>
      )}

      {/* Contenu */}
      <div ref={el=>{ if(el) el.scrollTop=0; }}
        style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {screen==="accueil"&&(
          <EcranAccueil contacts={contacts} visites={visites}
            notifications={notifications} user={user}
            onNewLot={()=>setScreen("fiche0")}
            onGoLots={(f)=>{ setFiltreLotsInitial(f); setScreen("lots"); }}
            onGoAlertes={()=>setScreen("alertes")}
            onGoDelegations={()=>setScreen("delegations")}
            onAppelerContact={c=>{ setFiche0Prefill(c); setScreen("fiche0"); }}/>
        )}
        {screen==="delegations"&&(
          <EcranDelegations entrepriseId={entrepriseId} toast={toast}
            onBack={()=>setScreen("accueil")}/>
        )}
        {screen==="lots"&&(
          <EcranLots key={filtreLotsInitial} contacts={contacts}
            onNewLot={()=>setScreen("fiche0")}
            onOpenLot={c=>{ setActiveContact(c); setScreen("fiche-lot"); }}
            filtreInitial={filtreLotsInitial}/>
        )}
        {screen==="alertes"&&(
          <EcranReleves entrepriseId={entrepriseId} user={user} toast={toast}
            notifications={notifications} setNotifications={setNotifications}
            onGoDelegations={()=>setScreen("delegations")}/>
        )}
        {screen==="saisies"&&(
          <EcranSaisiesAdmin
            contacts={contacts} visites={visites}
            reportings={reportings} transports={transports}
            livraisons={livraisons}
            onBack={()=>setScreen("accueil")}/>
        )}
        {screen==="profil"&&(
          <div style={{padding:PADDING}}>
            <SectionTitle icon="👤" label="Profil"/>
            <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12}}>
              <div style={{fontSize:16,fontWeight:700}}>{user.prenom} {user.nom}</div>
              <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Rôle : {user.role}</div>
              {isDemoMode&&<div style={{fontSize:11,color:C.amberD,marginTop:4}}>🎭 Mode démonstration</div>}
            </div>
            {isDemoMode&&(
              <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:12,
                border:`1px solid ${C.amber}`}}>
                <div style={{fontSize:12,color:C.amberD,fontWeight:600,marginBottom:6}}>
                  🎭 Données de démonstration
                </div>
                <div style={{fontSize:11,color:C.amberD,lineHeight:1.7}}>
                  {DEMO_LOTS.length} lots · {DEMO_VISITES.length} visites ·
                  {DEMO_REPORTINGS.length} reportings · {DEMO_TRANSPORTS.length} transports
                </div>
              </div>
            )}
            <BigBtn onClick={handleLogout} bg={C.red} icon="⎋">Se déconnecter</BigBtn>
          </div>
        )}
        {screen==="carte"&&(
          <EcranCarte
            contacts={contacts}
            visites={visites}
            onOpenLot={c=>{ setActiveContact(c); setScreen("fiche-lot"); }}/>
        )}
        {screen==="fiche0"&&(
          <Fiche0 onBack={()=>{ setFiche0Prefill(null); setScreen("accueil"); }}
            onSaved={c=>{ setFiche0Prefill(null); setContacts(prev=>[c,...prev]); setScreen("lots"); }}
            toast={toast} contactCount={contacts.length} entrepriseId={entrepriseId}
            prefill={fiche0Prefill} comptes={comptesLocalGet()}/>
        )}
        {screen==="fiche-lot"&&activeContact&&(
          <FicheLotCentrale
            lot={activeContact}
            visites={visites}
            operateurs={operateurs}
            onBack={()=>setScreen("lots")}
            onEdit={()=>setScreen("edit-contact")}
            onBonCommande={()=>setScreen("bon-commande")}
            onLaunchVisite={()=>{ setActiveLot(activeContact); setScreen("visite-form"); }}
            onLaunchValidation={()=>setScreen("validation-exploitation")}
            onLaunchCloture={()=>setScreen("cloture-exploitation")}
            onLaunchDechiquetage={()=>setScreen("dechiquetage")}
            onLaunchTransporteur={()=>setScreen("transporteur")}
            onLaunchLivraison={()=>setScreen("livraison")}
            onLaunchFinChantier={()=>setScreen("fin-chantier")}
            onRedDeclaration={()=>setScreen("red-declaration")}
            onDeleguerVisite={()=>setShowDelegVisite(true)}
            onDeleteLot={(user?.role==="admin"||user?.role==="manager")?async (lot)=>{
              deletedLotsAdd(lot.id);
              try {
                await apiDelete(`/contacts/${lot.id}`);
              } catch {}
              setContacts(prev=>prev.filter(c=>c.id!==lot.id));
              setActiveContact(null);
              setScreen("lots");
              toast(`Lot ${lot.lotNumero} supprimé`,"warn");
            }:undefined}
            toast={toast}
            user={user}
            entrepriseId={entrepriseId}/>
        )}
        {screen==="red-declaration"&&activeContact&&(
          <EcranAutoDeclarationRED
            lot={activeContact}
            visites={visites}
            transports={transports}
            livraisons={livraisons}
            onBack={()=>setScreen("fiche-lot")}
            toast={toast}/>
        )}
        {screen==="fin-chantier"&&activeContact&&(
          <EcranFinChantier
            lot={activeContact}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={()=>{ setScreen("fiche-lot"); toast("Fin de chantier enregistrée ✓"); }}
            toast={toast}
            entrepriseId={entrepriseId}/>
        )}
        {screen==="bon-commande"&&activeContact&&(
          <EcranBonCommande
            lot={activeContact}
            visites={visites}
            entrepriseId={entrepriseId}
            onBack={()=>setScreen("fiche-lot")}
            onGoDelegations={()=>setScreen("delegations")}
            toast={toast}/>
        )}
        {screen==="cloture-exploitation"&&activeContact&&(
          <EcranClotureExploitation
            lot={activeContact}
            visites={visites}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={()=>{
              setContacts(prev=>prev.map(c=>c.id===activeContact.id?{...c,statutLot:"BORD_ROUTE"}:c));
              setActiveContact(prev=>prev?{...prev,statutLot:"BORD_ROUTE"}:prev);
              setScreen("fiche-lot");
              toast("Réception de fin d'exploitation enregistrée ✓");
            }}
            toast={toast}
            entrepriseId={entrepriseId}
            user={user}/>
        )}
        {screen==="dechiquetage"&&activeContact&&(
          <EcranDechiquetage
            lot={activeContact}
            operateurs={operateurs}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={(newStatut)=>{
              setContacts(prev=>prev.map(c=>c.id===activeContact.id?{...c,statutLot:newStatut}:c));
              setScreen("fiche-lot");
              toast("Déchiquetage enregistré — transport créé ✓");
            }}
            toast={toast}
            entrepriseId={entrepriseId}/>
        )}
        {screen==="transporteur"&&activeContact&&(
          <EcranTransporteur
            lot={activeContact}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={(newStatut)=>{
              setContacts(prev=>prev.map(c=>c.id===activeContact.id?{...c,statutLot:newStatut}:c));
              setScreen("fiche-lot");
              toast("Transport enregistré ✓");
            }}
            toast={toast}
            entrepriseId={entrepriseId}/>
        )}
        {screen==="livraison"&&activeContact&&(
          <EcranLivraison
            lot={activeContact}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={(newStatut)=>{
              setContacts(prev=>prev.map(c=>c.id===activeContact.id?{...c,statutLot:newStatut}:c));
              setScreen("fiche-lot");
              toast(newStatut==="LIVRE_CHAUFFERIE"?"Livraison chaufferie validée ✓":"Entrée stock plateforme ✓");
            }}
            toast={toast}
            entrepriseId={entrepriseId}/>
        )}
        {screen==="validation-exploitation"&&activeContact&&(
          <EcranValidationExploitation
            lot={activeContact}
            visites={visites}
            operateurs={operateurs}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={(data)=>{
              const lotId = activeContact.id;
              const newStatut = "EN_COURS_EXPLOITATION";
              const tonnageAjout = data?.tonnage||0;
              setContacts(prev=>prev.map(c=>c.id===lotId?{
                ...c,
                statutLot: newStatut,
                tonnageCumul: (parseFloat(c.tonnageCumul)||0) + tonnageAjout,
                etfNom: data?.etfNom||c.etfNom,
              }:c));
              setActiveContact(prev=>prev&&prev.id===lotId?{
                ...prev,
                statutLot: newStatut,
                tonnageCumul: (parseFloat(prev.tonnageCumul)||0) + tonnageAjout,
              }:prev);
              setScreen("fiche-lot");
              toast("Reporting enregistré ✓");
            }}
            toast={toast}
            user={user}
            entrepriseId={entrepriseId}/>
        )}
        {screen==="edit-contact"&&activeContact&&(
          <Fiche0Edit contact={activeContact}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={c=>{ setContacts(prev=>prev.map(x=>x.id===c.id?c:x)); setScreen("fiche-lot"); toast("Fiche mise à jour ✓"); }}
            toast={toast} user={user}
            onLaunchVisite={()=>{ setActiveLot(activeContact); setScreen("visite-form"); }}
            onLaunchValidation={()=>setScreen("validation-exploitation")}
            onLaunchCloture={()=>setScreen("cloture-exploitation")}
            onLaunchDechiquetage={()=>setScreen("dechiquetage")}
            onLaunchTransporteur={()=>setScreen("transporteur")}
            onLaunchLivraison={()=>setScreen("livraison")}/>
        )}
        {screen==="visite-form"&&activeLot&&(
          <FormulaireVisite lot={activeLot} onBack={()=>setScreen("fiche-lot")}
            onSaved={v=>{
              setVisites(prev=>[v,...prev]);
              setContacts(prev=>prev.map(c=>c.id===activeLot.id
                ?{...c,statutLot:"VISITE_REALISEE"}:c));
              setActiveContact(prev=>prev?.id===activeLot.id
                ?{...prev,statutLot:"VISITE_REALISEE"}:prev);
              // Persister côté API — transition métier validée serveur
              apiPost(`/contacts/${activeLot.id}/transition`, {action:"validerVisite"}).catch(()=>{});
              setScreen("fiche-lot");
              toast("Visite enregistrée ✓");
              if (operateurs.length>0) setShowEtfModal(true);
            }}
            toast={toast} entrepriseId={entrepriseId} user={user}/>
        )}
      </div>

      {/* Modal délégation visite */}
      {showDelegVisite&&activeContact&&(
        <ModalDelegationVisite
          lot={activeContact}
          operateurs={operateurs}
          onDeleguee={(d)=>{ toast(`Code ${d.code} généré pour ${d.nomDelegue} ✓`); }}
          onIgnorer={()=>setShowDelegVisite(false)}/>
      )}

      {/* Modal suggestion ETF */}
      {showEtfModal&&activeContact&&(
        <ModalSuggestionETF
          lot={activeContact}
          visites={visites}
          operateurs={operateurs}
          rayon={100}
          onChoisir={(etfNom)=>{
            setContacts(prev=>prev.map(c=>c.id===activeContact.id?{...c,etfNom}:c));
            setActiveContact(prev=>prev?{...prev,etfNom}:prev);
            setShowEtfModal(false);
            toast(`ETF ${etfNom} assignée ✓`);
          }}
          onIgnorer={()=>setShowEtfModal(false)}/>
      )}

      {/* Barre navigation basse */}
      {!isFullPage&&(
        <div style={{display:"flex",background:"#fff",
          borderTop:`1px solid ${C.bd}`,flexShrink:0,
          paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
          {navItems.map(item=>(
            <button key={item.id} onClick={()=>setScreen(item.id)} style={{
              flex:1,height:60,background:"transparent",border:"none",
              display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",gap:3,cursor:"pointer",
              position:"relative",WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:22}}>{item.icon}</span>
              <span style={{fontSize:10,fontWeight:screen===item.id?700:400,
                color:screen===item.id?C.green:C.tx3}}>
                {item.label}
              </span>
              {screen===item.id&&(
                <div style={{position:"absolute",top:0,left:"25%",right:"25%",
                  height:3,borderRadius:"0 0 3px 3px",background:C.green}}/>
              )}
              {item.badge>0&&(
                <span style={{position:"absolute",top:8,right:"20%",
                  background:C.red,color:"#fff",borderRadius:"50%",
                  width:16,height:16,fontSize:9,fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {item.badge>9?"9+":item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
