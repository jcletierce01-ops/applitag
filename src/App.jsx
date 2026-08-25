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
import { FicheLotCentrale, EcranFinChantier, EcranDechiquetage, EcranTransporteur, EcranLivraison } from "./domains/lots/LotScreens.jsx";
import { EcranRoleMandataire, EcranRoleProprietaire, EcranRoleChauffeur, EcranRoleDechiquetage, EcranEntrepriseSollicitee, EcranRoleChaufferie, EcranRoleReceptionnaire, EcranAutoDeclarationRED, EcranCarte } from "./domains/roles/RoleScreens.jsx";

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
