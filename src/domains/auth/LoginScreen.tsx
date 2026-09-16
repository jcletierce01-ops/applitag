import { useState, useEffect, useRef } from "react";
import { WallpaperBg } from "./WallpaperBg";
import { Html5Qrcode } from "html5-qrcode";
import { C, BTN_H, INPUT_H, FONT_INPUT, PADDING } from "../../design-system/tokens.js";
import { uid, nowISO, todayS, genCodeAPT } from "../../shared/utils.js";
import { setAuth } from "../../services/auth.service.js";
import { formatPhone } from "../../shared/validators.js";
import { STATUTS_ANNONCE } from "../connect/constants.js";
import { DEFAULT_ENTREPRISE_ID, COMPTE_SESSION_KEY, annoncesLocalGet, annoncesLocalSave, comptesLocalGet, comptesLocalSave } from "../connect/local-storage.js";
import { ordresExplLocalGet, ordresExplLocalSave } from "../exploitation/local-storage.js";
import { apiGet, apiPostPublic, apiPatch, ApiError } from "../../services/api.service.js";

export const LoginScreen = ({onLogin, onLoginOperateur, onLoginDemo}: any) => {
  const [step, setStep] = useState("bienvenue"); // bienvenue | home | scan | pin | operateur | demo | ordre
  const [entrepriseId, setEntrepriseId] = useState("");
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [opNom, setOpNom] = useState("");
  const [opPin, setOpPin] = useState("");
  const [ordreCode, setOrdreCode] = useState("");
  const [ordreTrouve, setOrdreTrouve] = useState<any>(null);
  const [ordreErreur, setOrdreErreur] = useState("");
  const [ordreLoading, setOrdreLoading] = useState(false);

  const handleRechercherOrdre = async () => {
    const code = ordreCode.trim().toUpperCase();
    if (!code) return;
    setOrdreLoading(true); setOrdreErreur(""); setOrdreTrouve(null);
    let found = null;
    try {
      found = await apiGet(`/ordres-exploitation/code/${code}`);
    } catch { /* noop — fallback local storage ci-dessous */ }
    if (!found) found = ordresExplLocalGet().find((o: any)=>o.code===code)||null;
    if (!found) setOrdreErreur("Code introuvable — vérifiez la saisie");
    else setOrdreTrouve(found);
    setOrdreLoading(false);
  };

  const handleValiderOrdre = async (statut: any) => {
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
    ordresExplLocalSave(ordresExplLocalGet().map((o: any)=>o.code===updated.code?updated:o));
    setOrdreTrouve(updated);
    setOrdreLoading(false);
  };

  // ── APPLITAG Connect - Annonces : proposition de bois / offre de service / demande de plaquettes ──
  const [annonceType,     setAnnonceType]    = useState<any>(null); // gisement | service | demande
  // Identité
  const [annoncePrenom,   setAnnoncePrenom]   = useState("");
  const [annonceNom,      setAnnonceNom]      = useState("");
  const [annonceEntreprise,setAnnonceEntreprise]=useState("");
  const [annonceTel,      setAnnonceTel]      = useState("");
  const [annonceEmail,    setAnnonceEmail]    = useState("");
  // Localisation
  const [annonceCommune,  setAnnonceCommune]  = useState("");
  const [annonceCP,       setAnnonceCP]       = useState("");
  const [annonceDept,     setAnnonceDept]     = useState("");
  // Description ressource (gisement)
  const [annonceTypesRessource, setAnnonceTypesRessource] = useState<string[]>([]);
  const [annonceEssences, setAnnonceEssences] = useState("");
  const [annonceVolume,   setAnnonceVolume]   = useState("");
  const [annonceUnite,    setAnnonceUnite]    = useState("tonnes");
  const [annonceAccessibilite, setAnnonceAccessibilite] = useState("");
  // Service (form 419)
  const [annonceSvcRaisonSociale,setAnnonceSvcRaisonSociale] = useState("");
  const [annonceSvcFonction,    setAnnonceSvcFonction]      = useState("");
  const [annonceSvcSiteWeb,     setAnnonceSvcSiteWeb]       = useState("");
  const [annonceSvcProfils,     setAnnonceSvcProfils]       = useState<string[]>([]);
  const [annonceSvcDeptPrincipal,setAnnonceSvcDeptPrincipal]= useState("");
  const [annonceSvcAutresDepts, setAnnonceSvcAutresDepts]   = useState("");
  const [annonceSvcRayon,       setAnnonceSvcRayon]         = useState("");
  const [annonceSvcMoyens,      setAnnonceSvcMoyens]        = useState<string[]>([]);
  const [annonceSvcCapacites,   setAnnonceSvcCapacites]     = useState("");
  const [annonceSvcDisponibilite,setAnnonceSvcDisponibilite]= useState("");
  const [annonceSvcRecherche,   setAnnonceSvcRecherche]     = useState<string[]>([]);
  const [annonceSvcActivite,    setAnnonceSvcActivite]      = useState("");
  // Démo (form 476)
  const [annonceDemoEntreprise, setAnnonceDemoEntreprise]   = useState("");
  const [annonceDemoFonction,   setAnnonceDemoFonction]     = useState("");
  const [annonceDemoProfils,    setAnnonceDemoProfils]      = useState<string[]>([]);
  const [annonceDemoDept,       setAnnonceDemoDept]         = useState("");
  const [annonceDemoVoir,       setAnnonceDemoVoir]         = useState<string[]>([]);
  const [annonceDemoEnjeux,     setAnnonceDemoEnjeux]       = useState<string[]>([]);
  const [annonceDemoActivite,   setAnnonceDemoActivite]     = useState("");
  const [annonceDemoStructure,  setAnnonceDemoStructure]    = useState("");
  const [annonceDemoSuivi,      setAnnonceDemoSuivi]        = useState("");
  const [annonceDemoContexte,   setAnnonceDemoContexte]     = useState("");
  const [annonceDemoFormat,     setAnnonceDemoFormat]       = useState("");
  const [annonceDemoDispos,     setAnnonceDemoDispos]       = useState("");
  // Commun
  const [annoncePhotos,   setAnnoncePhotos]   = useState<any[]>([]);
  const [annonceCommentaire,setAnnonceComment]= useState("");
  const [consentRGPD,     setConsentRGPD]     = useState(false);
  const [consentActus,    setConsentActus]    = useState(false);
  const [annonceEnvoyee,  setAnnonceEnvoyee]  = useState(false);
  const [annonceSaving,   setAnnonceSaving]   = useState(false);

  const toggleTypesRessource = (v: string) => setAnnonceTypesRessource(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);
  const toggleSvcProfil    = (v: string) => setAnnonceSvcProfils(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);
  const toggleSvcMoyen     = (v: string) => setAnnonceSvcMoyens(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);
  const toggleSvcRecherche = (v: string) => setAnnonceSvcRecherche(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);
  const toggleDemoProfil   = (v: string) => setAnnonceDemoProfils(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);
  const toggleDemoVoir     = (v: string) => setAnnonceDemoVoir(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);
  const toggleDemoEnjeux   = (v: string) => setAnnonceDemoEnjeux(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);

  const handleAjouterPhotoAnnonce = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev: any) => setAnnoncePhotos(prev=>[...prev, ev.target.result].slice(0,3));
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const resetAnnonce = () => {
    setAnnonceType(null);
    setAnnoncePrenom(""); setAnnonceNom(""); setAnnonceEntreprise("");
    setAnnonceTel(""); setAnnonceEmail("");
    setAnnonceCommune(""); setAnnonceCP(""); setAnnonceDept("");
    setAnnonceTypesRessource([]); setAnnonceEssences(""); setAnnonceVolume("");
    setAnnonceUnite("tonnes"); setAnnonceAccessibilite("");
    setAnnonceSvcRaisonSociale(""); setAnnonceSvcFonction(""); setAnnonceSvcSiteWeb("");
    setAnnonceSvcProfils([]); setAnnonceSvcDeptPrincipal(""); setAnnonceSvcAutresDepts("");
    setAnnonceSvcRayon(""); setAnnonceSvcMoyens([]); setAnnonceSvcCapacites("");
    setAnnonceSvcDisponibilite(""); setAnnonceSvcRecherche([]); setAnnonceSvcActivite("");
    setAnnonceDemoEntreprise(""); setAnnonceDemoFonction(""); setAnnonceDemoProfils([]);
    setAnnonceDemoDept(""); setAnnonceDemoVoir([]); setAnnonceDemoEnjeux([]);
    setAnnonceDemoActivite(""); setAnnonceDemoStructure(""); setAnnonceDemoSuivi("");
    setAnnonceDemoContexte(""); setAnnonceDemoFormat(""); setAnnonceDemoDispos("");
    setAnnoncePhotos([]); setAnnonceComment("");
    setConsentRGPD(false); setConsentActus(false); setAnnonceEnvoyee(false);
  };

  const handleEnvoyerAnnonce = async () => {
    setError(""); setAnnonceSaving(true);
    let annonce: any = { id: uid(), type: annonceType, statut:"recu", entrepriseId: DEFAULT_ENTREPRISE_ID,
      compteId: (compteSession as any)?.id||null, dateEnvoi: nowISO(), synced:false };
    if (annonceType==="gisement") {
      const nom = `${annoncePrenom} ${annonceNom}`.trim();
      if (!nom) { setError("Indiquez votre prénom et nom"); setAnnonceSaving(false); return; }
      if (!annonceTel.trim()) { setError("Indiquez votre téléphone"); setAnnonceSaving(false); return; }
      if (!annonceEmail.trim()) { setError("Indiquez votre email"); setAnnonceSaving(false); return; }
      if (!annonceCommune.trim()) { setError("Indiquez la commune"); setAnnonceSaving(false); return; }
      if (annonceTypesRessource.length===0) { setError("Sélectionnez au moins un type de ressource"); setAnnonceSaving(false); return; }
      if (!consentRGPD) { setError("Vous devez accepter la politique de confidentialité"); setAnnonceSaving(false); return; }
      annonce = { ...annonce, prenom:annoncePrenom, nom:annonceNom, entreprise:annonceEntreprise,
        telephone:annonceTel, email:annonceEmail, commune:annonceCommune, codePostal:annonceCP, departement:annonceDept,
        typesRessource:annonceTypesRessource, essences:annonceEssences, volume:annonceVolume, unite:annonceUnite,
        accessibilite:annonceAccessibilite, photos:annoncePhotos, commentaire:annonceCommentaire,
        consentRGPD, consentActus };
    } else if (annonceType==="service") {
      if (!annonceSvcRaisonSociale.trim()) { setError("Indiquez la raison sociale"); setAnnonceSaving(false); return; }
      if (!annonceNom.trim()) { setError("Indiquez votre nom"); setAnnonceSaving(false); return; }
      if (!annonceTel.trim()) { setError("Indiquez votre téléphone"); setAnnonceSaving(false); return; }
      if (!annonceEmail.trim()) { setError("Indiquez votre email"); setAnnonceSaving(false); return; }
      if (!consentRGPD) { setError("Vous devez accepter la politique de confidentialité"); setAnnonceSaving(false); return; }
      annonce = { ...annonce, raisonSociale:annonceSvcRaisonSociale, prenom:annoncePrenom, nom:annonceNom,
        fonction:annonceSvcFonction, telephone:annonceTel, email:annonceEmail, siteWeb:annonceSvcSiteWeb,
        profils:annonceSvcProfils, departementPrincipal:annonceSvcDeptPrincipal, autresDepts:annonceSvcAutresDepts,
        rayon:annonceSvcRayon, moyens:annonceSvcMoyens, capacites:annonceSvcCapacites,
        disponibilite:annonceSvcDisponibilite, recherche:annonceSvcRecherche, activite:annonceSvcActivite,
        photos:annoncePhotos, consentRGPD, consentActus };
    } else if (annonceType==="demo") {
      const nom = `${annoncePrenom} ${annonceNom}`.trim();
      if (!nom) { setError("Indiquez votre prénom et nom"); setAnnonceSaving(false); return; }
      if (!annonceDemoEntreprise.trim()) { setError("Indiquez votre entreprise/organisme"); setAnnonceSaving(false); return; }
      if (!annonceEmail.trim()) { setError("Indiquez votre email"); setAnnonceSaving(false); return; }
      if (!consentRGPD) { setError("Vous devez accepter la politique de confidentialité"); setAnnonceSaving(false); return; }
      annonce = { ...annonce, prenom:annoncePrenom, nom:annonceNom, entreprise:annonceDemoEntreprise,
        fonction:annonceDemoFonction, email:annonceEmail, telephone:annonceTel, departement:annonceDemoDept,
        profils:annonceDemoProfils, voirPendant:annonceDemoVoir, enjeux:annonceDemoEnjeux,
        activite:annonceDemoActivite, structure:annonceDemoStructure, suivi:annonceDemoSuivi,
        contexte:annonceDemoContexte, format:annonceDemoFormat, disponibilites:annonceDemoDispos,
        consentRGPD, consentActus };
    }
    try {
      await apiPostPublic(`/annonces`, annonce);
      annonce.synced = true;
    } catch { /* noop — annonce sauvegardée localement */ }
    annoncesLocalSave([annonce, ...annoncesLocalGet()]);
    setAnnonceEnvoyee(true);
    setAnnonceSaving(false);
  };

  // ── APPLITAG Connect - Compte contact (accès gratuit, sans fonction sensible) ──
  const [compteVue,     setCompteVue]    = useState("choix"); // choix | inscription | connexion | espace
  const [compteSession, setCompteSession]= useState(()=>{
    try { return JSON.parse(localStorage.getItem(COMPTE_SESSION_KEY)||"null"); } catch { return null; }
  });
  const [suiviOps, setSuiviOps] = useState<any>(null);
  const suiviOpsIsDemo = useRef(false);
  const [compteNom,      setCompteNom]     = useState("");
  const [compteTel,      setCompteTel]     = useState("");
  const [compteEmail,    setCompteEmail]   = useState("");
  const [compteCodeGenere, setCompteCodeGenere] = useState("");
  const [compteTrancheHoraire, setCompteTrancheHoraire] = useState("");
  const [compteCodePostal,  setCompteCodePostal]  = useState("");
  const [compteNatureDemande, setCompteNatureDemande] = useState<any[]>([]);
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
    if (existants.some((c: any)=>c.telephone===compteTel||(compteEmail&&c.email===compteEmail))) {
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
    } catch { /* noop — compte sauvegardé localement de toute façon */ }
    try {
      const msg = `Bonjour ${compteNom}, votre compte APPLITAG Connect a été créé. Votre code d'accès personnel est : ${codeAPT}. Conservez-le précieusement, il vous sera demandé à chaque connexion.`;
      await apiPostPublic(`/sms`, {to: compteTel, message: msg});
    } catch { /* noop — SMS non critique */ }
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
    const compte: any = comptesLocalGet().find((c: any)=>
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

  const handleMajPrefsCompte = (champ: any, valeur: any) => {
    if (champ==="actus") setComptePrefActus(valeur); else setComptePrefNetwork(valeur);
    const comptes = comptesLocalGet().map((c: any)=>c.id===compteSession.id
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
    ? annoncesLocalGet().filter((a: any)=>a.telephone===compteSession.telephone||(compteSession.email&&a.email===compteSession.email))
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
      const mesLots = Array.isArray(lots) ? lots.filter((l: any)=>l.telephone===tel) : [];
      const lotIds = new Set(mesLots.map((l: any)=>l.id));

      const actsToday = Array.isArray(activites)
        ? activites.filter((a: any)=>lotIds.has(a.lotId) && (a.dateJour||"").startsWith(today))
        : [];

      const abattageM3 = actsToday
        .filter((a: any)=>["abattage","abattage_debardage"].includes(a.typeOperationJour))
        .reduce((s,a: any)=>s+(parseFloat(a.volumeJour)||0), 0);

      const debardageM3 = actsToday
        .filter((a: any)=>["debardage","abattage_debardage"].includes(a.typeOperationJour))
        .reduce((s,a: any)=>s+(parseFloat(a.volumeJour)||0), 0);

      const dechiqToday = Array.isArray(dechiqList)
        ? dechiqList.filter((d: any)=>lotIds.has(d.lotId) && (d.createdAt||d.dateJour||"").startsWith(today))
        : [];
      const dechiqT  = dechiqToday.reduce((s,d: any)=>s+(parseFloat(d.tonnageCharge)||0), 0);
      const dechiqM3 = dechiqToday.reduce((s,d: any)=>s+(parseFloat(d.cubageCharge)||0), 0);

      setSuiviOps({ abattageM3, debardageM3, dechiqT, dechiqM3, nbLots: mesLots.length, today });
    });
  }, [compteVue, compteSession?.telephone]);

  const scannerRef = useRef<any>(null);

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
        else try { scanner.stop().catch(()=>{}); } catch { /* noop */ }
      };
    }
  }, [step]);

  const handlePin = (digit: any) => {
    if (pin.length < 4) setPin(p => p + digit);
  };
  const handleDel = () => setPin(p => p.slice(0,-1));

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiPostPublic(`/auth/login`, { entrepriseId, pin });
      setAuth((data as any).access_token, (data as any).utilisateur, entrepriseId);
      onLogin((data as any).utilisateur);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setError(e.status === 401 || e.status === 400
          ? "PIN incorrect — réessayez"
          : `Erreur serveur (${e.status}) — réessayez`);
      } else {
        setError("Serveur inaccessible — vérifiez votre connexion");
      }
      setPin("");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (pin.length === 4) handleLogin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

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
    } catch {
      setError("Nom ou PIN incorrect — réessayez");
    }
    setLoading(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",
      position:"relative",
      background:"#0F3C22",
      color:"#fff",fontFamily:"Inter,system-ui,-apple-system,sans-serif"}}>
      {/* Fond d'écran */}
      <WallpaperBg/>
      {/* Header */}
      <div style={{padding:"36px 24px 20px",textAlign:"center",position:"relative",zIndex:1}}>
        <img src="/logo.png" alt="APPLITAG" style={{width:72,height:72,objectFit:"contain",marginBottom:14,
          filter:"drop-shadow(0 4px 12px rgba(0,0,0,.35))"}}/>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.16em",color:"rgba(255,255,255,.5)",
          textTransform:"uppercase",marginBottom:6}}>Plateforme bois-énergie</div>
        <div style={{fontSize:26,fontWeight:800,letterSpacing:"-0.01em",fontFamily:"inherit"}}>APPLITAG</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.55)",marginTop:5,lineHeight:1.5,maxWidth:260,margin:"6px auto 0"}}>
          Pilotage, traçabilité et continuité des flux bois-énergie.
        </div>
      </div>

      <div style={{flex:1,padding:PADDING,overflowY:"scroll",
        background:"transparent",position:"relative",zIndex:1}}>

        {/* ── BIENVENUE ── */}
        {step==="bienvenue"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",paddingTop:4}}>
            {/* Proof pills */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:28}}>
              {["Lot unique & traçabilité","Mobile terrain","Logistique & qualité","Reporting conformité"].map(label=>(
                <span key={label} style={{fontSize:11,fontWeight:500,
                  background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.18)",
                  borderRadius:20,padding:"5px 12px",color:"rgba(255,255,255,.8)",whiteSpace:"nowrap"}}>
                  {label}
                </span>
              ))}
            </div>
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {/* Se connecter — en premier */}
              <button onClick={()=>{ setError(""); setStep("home"); }}
                style={{width:"100%",padding:"16px 20px",borderRadius:18,
                  background:"rgba(255,255,255,.18)",border:"1.5px solid rgba(255,255,255,.6)",
                  backdropFilter:"blur(8px)",
                  color:"#fff",fontFamily:"inherit",fontSize:15,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent",
                  display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.2)",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>🔑</div>
                <div>
                  <div style={{fontWeight:700}}>Se connecter</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:400,marginTop:2}}>
                    Lire un code · Scanner un QR code
                  </div>
                </div>
              </button>
              {/* Proposer du bois */}
              <button onClick={()=>{ resetAnnonce(); setAnnonceType("gisement"); setStep("annonce"); }}
                style={{width:"100%",padding:"16px 20px",borderRadius:18,
                  background:"linear-gradient(135deg,rgba(34,85,34,.75),rgba(16,50,20,.85))",
                  border:"1.5px solid rgba(255,255,255,.5)",backdropFilter:"blur(8px)",
                  color:"#fff",fontFamily:"inherit",fontSize:15,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent",
                  display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:"rgba(80,200,80,.25)",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:22}}>🌲</div>
                <div>
                  <div style={{fontWeight:700}}>Proposer du bois</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:400,marginTop:2}}>
                    Déposer un gisement · APPLITAG Connect
                  </div>
                </div>
              </button>
              {/* Proposer un service */}
              <button onClick={()=>{ resetAnnonce(); setAnnonceType("service"); setStep("annonce"); }}
                style={{width:"100%",padding:"16px 20px",borderRadius:18,
                  background:"linear-gradient(135deg,rgba(20,60,100,.75),rgba(10,35,70,.85))",
                  border:"1.5px solid rgba(255,255,255,.5)",backdropFilter:"blur(8px)",
                  color:"#fff",fontFamily:"inherit",fontSize:15,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent",
                  display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:"rgba(80,160,255,.25)",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="28" height="22" viewBox="0 0 28 22" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <rect x="17" y="2" width="9" height="13" rx="1.5"/>
                    <rect x="2" y="9" width="19" height="6" rx="1"/>
                    <circle cx="6" cy="17" r="3.5"/>
                    <circle cx="20" cy="17" r="3.5"/>
                    <circle cx="5"  cy="11.5" r="2" fill="rgba(30,95,185,0.55)"/>
                    <circle cx="9"  cy="11.5" r="2" fill="rgba(30,95,185,0.55)"/>
                    <circle cx="13" cy="11.5" r="2" fill="rgba(30,95,185,0.55)"/>
                    <rect x="24" y="0" width="1.5" height="4" rx="0.75"/>
                  </svg>
                </div>
                <div>
                  <div style={{fontWeight:700}}>Proposer une prestation</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.7)",fontWeight:400,marginTop:2}}>
                    Offre ETF, prestataire · APPLITAG Connect
                  </div>
                </div>
              </button>
              {/* Liens externes */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <button onClick={()=>window.open("https://www.applitag.fr","_blank","noopener noreferrer")}
                  style={{padding:"14px 12px",borderRadius:14,
                    background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.45)",
                    color:"rgba(255,255,255,.9)",fontFamily:"inherit",fontSize:13,fontWeight:500,
                    cursor:"pointer",WebkitTapHighlightColor:"transparent",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <span style={{fontSize:20}}>🌐</span>
                  <span>Site Applitag.fr</span>
                </button>
                <button onClick={()=>{ resetAnnonce(); setAnnonceType("demo"); setStep("annonce"); }}
                  style={{padding:"14px 12px",borderRadius:14,
                    background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.45)",
                    color:"rgba(255,255,255,.9)",fontFamily:"inherit",fontSize:13,fontWeight:500,
                    cursor:"pointer",WebkitTapHighlightColor:"transparent",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <span style={{fontSize:20}}>📋</span>
                  <span>Demander une démo</span>
                </button>
              </div>
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
                {/* ─ helpers locaux ─ */}
                {(() => {
                  const INP: React.CSSProperties = {width:"100%",height:48,padding:"0 14px",borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:15,outline:"none",
                    marginBottom:10,boxSizing:"border-box"};
                  const TA: React.CSSProperties = {width:"100%",padding:14,borderRadius:10,
                    border:"1.5px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.08)",
                    color:"#fff",fontFamily:"inherit",fontSize:14,outline:"none",
                    marginBottom:12,resize:"vertical",boxSizing:"border-box"};
                  const SEC = (t: string) => (
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",
                      color:"rgba(255,255,255,.45)",marginTop:16,marginBottom:10}}>{t}</div>
                  );
                  const chips = (items: string[], selected: string[], toggle: (v:string)=>void) => (
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                      {items.map(v=>(
                        <div key={v} onClick={()=>toggle(v)} style={{
                          padding:"7px 12px",borderRadius:20,fontSize:12,cursor:"pointer",
                          border:`1.5px solid ${selected.includes(v)?"#4CAF50":"rgba(255,255,255,.25)"}`,
                          background:selected.includes(v)?"rgba(76,175,80,.25)":"rgba(255,255,255,.05)",
                          color:"#fff",WebkitTapHighlightColor:"transparent"}}>
                          {v}
                        </div>
                      ))}
                    </div>
                  );
                  const radioGroup = (items: string[], val: string, setVal: (v:string)=>void) => (
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                      {items.map(v=>(
                        <div key={v} onClick={()=>setVal(v)} style={{
                          padding:"10px 14px",borderRadius:10,fontSize:13,cursor:"pointer",
                          border:`1.5px solid ${val===v?"#4CAF50":"rgba(255,255,255,.25)"}`,
                          background:val===v?"rgba(76,175,80,.2)":"rgba(255,255,255,.05)",
                          color:"#fff",WebkitTapHighlightColor:"transparent"}}>
                          {val===v?"● ":"○ "}{v}
                        </div>
                      ))}
                    </div>
                  );
                  const consent = (val: boolean, setter: (v:boolean)=>void, label: string, required=false) => (
                    <div onClick={()=>setter(!val)} style={{display:"flex",alignItems:"flex-start",
                      gap:10,cursor:"pointer",WebkitTapHighlightColor:"transparent",marginBottom:8}}>
                      <span style={{fontSize:16,marginTop:1,flexShrink:0}}>{val?"☑️":"☐"}</span>
                      <span style={{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.5}}>
                        {label}{required&&<span style={{color:C.amber}}> *</span>}
                      </span>
                    </div>
                  );
                  const photoSection = (max=5) => (
                    <>
                      {SEC(`Photos / documents (optionnel — max ${max})`)}
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
                        {annoncePhotos.length<max&&(
                          <div onClick={handleAjouterPhotoAnnonce} style={{width:64,height:64,borderRadius:8,
                            border:"1.5px dashed rgba(255,255,255,.35)",display:"flex",alignItems:"center",
                            justifyContent:"center",cursor:"pointer",fontSize:22,color:"rgba(255,255,255,.6)"}}>
                            📷
                          </div>
                        )}
                      </div>
                    </>
                  );
                  const submitBlock = (label: string) => (
                    <>
                      {error&&(
                        <div style={{color:C.amber,fontSize:13,textAlign:"center",marginBottom:12}}>⚠ {error}</div>
                      )}
                      <button onClick={handleEnvoyerAnnonce} disabled={annonceSaving}
                        style={{width:"100%",height:50,borderRadius:12,
                          background:"rgba(76,175,80,.4)",border:"1px solid rgba(76,175,80,.7)",
                          color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                          WebkitTapHighlightColor:"transparent",marginBottom:10}}>
                        {annonceSaving?"Envoi en cours…":`📤 ${label}`}
                      </button>
                      <button onClick={()=>setStep("bienvenue")}
                        style={{width:"100%",padding:14,borderRadius:12,
                        background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",
                        color:"rgba(255,255,255,.7)",fontFamily:"inherit",fontSize:13,
                        cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                        {"<"} Retour à l'accueil
                      </button>
                    </>
                  );

                  /* ════════════ GISEMENT (form 414) ════════════ */
                  if (annonceType==="gisement") return (
                    <>
                      <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.9)",marginBottom:14}}>
                        🪵 Proposer du bois — APPLITAG Connect
                      </div>
                      {SEC("Votre identité")}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:0}}>
                        <input value={annoncePrenom} onChange={e=>setAnnoncePrenom(e.target.value)}
                          placeholder="Prénom *" style={{...INP,marginBottom:8}}/>
                        <input value={annonceNom} onChange={e=>setAnnonceNom(e.target.value)}
                          placeholder="Nom *" style={{...INP,marginBottom:8}}/>
                      </div>
                      <input value={annonceEntreprise} onChange={e=>setAnnonceEntreprise(e.target.value)}
                        placeholder="Entreprise / exploitation" style={INP}/>
                      <input value={annonceTel} onChange={e=>setAnnonceTel(formatPhone(e.target.value))}
                        placeholder="Téléphone *" type="tel" style={INP}/>
                      <input value={annonceEmail} onChange={e=>setAnnonceEmail(e.target.value)}
                        placeholder="Email *" type="email" style={INP}/>

                      {SEC("Localisation")}
                      <input value={annonceCommune} onChange={e=>setAnnonceCommune(e.target.value)}
                        placeholder="Commune *" style={INP}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <input value={annonceCP} onChange={e=>setAnnonceCP(e.target.value.replace(/\D/g,"").slice(0,5))}
                          placeholder="Code postal" type="tel" maxLength={5} style={{...INP,marginBottom:8}}/>
                        <input value={annonceDept} onChange={e=>setAnnonceDept(e.target.value)}
                          placeholder="Département" style={{...INP,marginBottom:8}}/>
                      </div>

                      {SEC("Type de ressource *")}
                      {chips(["Bois sur pied","Bois bord de route","Houppiers / rémanents","Taillis",
                        "Bois de crise","Connexes de scierie","Plaquettes forestières","Bois déjà stocké","Autre"],
                        annonceTypesRessource, toggleTypesRessource)}

                      {SEC("Description")}
                      <input value={annonceEssences} onChange={e=>setAnnonceEssences(e.target.value)}
                        placeholder="Nature / essences (Chêne, hêtre, résineux…)" style={INP}/>
                      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
                        <input value={annonceVolume} onChange={e=>setAnnonceVolume(e.target.value)}
                          placeholder="Volume estimé" type="number" style={{...INP,marginBottom:8}}/>
                        <select value={annonceUnite} onChange={e=>setAnnonceUnite(e.target.value)}
                          style={{...INP,marginBottom:8,padding:"0 10px"}}>
                          {["m³","tonnes","MAP","Stères","Je ne sais pas"].map(u=>(
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      {SEC("Accessibilité")}
                      {radioGroup(["Accessible aux poids lourds","Accès possible mais à vérifier",
                        "Accès difficile ou limité","Je ne sais pas"],
                        annonceAccessibilite, setAnnonceAccessibilite)}

                      {photoSection(5)}
                      <textarea value={annonceCommentaire} onChange={e=>setAnnonceComment(e.target.value)}
                        placeholder="Informations complémentaires" rows={3} style={TA}/>

                      {SEC("Consentements")}
                      {consent(consentRGPD, setConsentRGPD,
                        "J'ai pris connaissance de la politique de confidentialité et des modalités de traitement des informations transmises avec ma proposition de ressource.", true)}
                      {consent(consentActus, setConsentActus,
                        "Je souhaite recevoir par e-mail les actualités, nouveautés et informations d'APPLITAG.")}
                      <div style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.5,marginBottom:14,fontStyle:"italic"}}>
                        Une proposition de ressource ne constitue ni une promesse d'achat, ni une commande, ni un engagement contractuel.
                      </div>
                      {submitBlock("Envoyer ma proposition")}
                    </>
                  );

                  /* ════════════ SERVICE (form 419) ════════════ */
                  if (annonceType==="service") return (
                    <>
                      <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.9)",marginBottom:14}}>
                        🛠️ Proposer un service professionnel — APPLITAG Connect
                      </div>
                      {SEC("Votre entreprise")}
                      <input value={annonceSvcRaisonSociale} onChange={e=>setAnnonceSvcRaisonSociale(e.target.value)}
                        placeholder="Raison sociale *" style={INP}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <input value={annoncePrenom} onChange={e=>setAnnoncePrenom(e.target.value)}
                          placeholder="Prénom *" style={{...INP,marginBottom:8}}/>
                        <input value={annonceNom} onChange={e=>setAnnonceNom(e.target.value)}
                          placeholder="Nom *" style={{...INP,marginBottom:8}}/>
                      </div>
                      <input value={annonceSvcFonction} onChange={e=>setAnnonceSvcFonction(e.target.value)}
                        placeholder="Fonction" style={INP}/>
                      <input value={annonceTel} onChange={e=>setAnnonceTel(formatPhone(e.target.value))}
                        placeholder="Téléphone *" type="tel" style={INP}/>
                      <input value={annonceEmail} onChange={e=>setAnnonceEmail(e.target.value)}
                        placeholder="Adresse e-mail *" type="email" style={INP}/>
                      <input value={annonceSvcSiteWeb} onChange={e=>setAnnonceSvcSiteWeb(e.target.value)}
                        placeholder="Site internet" type="url" style={INP}/>

                      {SEC("Votre métier — domaine d'intervention")}
                      {chips(["Exploitant forestier","ETF / travaux forestiers","Débardage","Déchiquetage",
                        "Transport bois-énergie","Plateforme de stockage","Scierie / industrie du bois",
                        "Maintenance / mécanique","Contrôle qualité / analyses","Bureau d'études",
                        "Chaufferie / exploitation énergétique","Collectivité territoriale",
                        "Logistique / affrètement","Association / interprofession",
                        "Propriétaire / gestionnaire de ressource","Autre"],
                        annonceSvcProfils, toggleSvcProfil)}

                      {SEC("Zone d'intervention")}
                      <input value={annonceSvcDeptPrincipal} onChange={e=>setAnnonceSvcDeptPrincipal(e.target.value)}
                        placeholder="Département principal" style={INP}/>
                      <textarea value={annonceSvcAutresDepts} onChange={e=>setAnnonceSvcAutresDepts(e.target.value)}
                        placeholder="Autres départements ou régions" rows={2} style={TA}/>
                      <input value={annonceSvcRayon} onChange={e=>setAnnonceSvcRayon(e.target.value)}
                        placeholder="Rayon d'intervention (ex. 150 km autour d'Auxerre)" style={INP}/>

                      {SEC("Machines et moyens disponibles")}
                      {chips(["Abatteuse","Porteur","Déusqueur","Broyeur","Chargeuse","Camion fond mouvant",
                        "Camion benne","Camion ampliroll","Plateforme de stockage","Pont-bascule",
                        "Matériel de contrôle qualité","Autre"],
                        annonceSvcMoyens, toggleSvcMoyen)}
                      <textarea value={annonceSvcCapacites} onChange={e=>setAnnonceSvcCapacites(e.target.value)}
                        placeholder="Capacités ou particularités techniques (débit broyeur, tonnage journalier…)" rows={2} style={TA}/>

                      {SEC("Disponibilité")}
                      {radioGroup(["Disponible régulièrement","Disponible ponctuellement",
                        "Disponibilité saisonnière","À étudier selon les projets"],
                        annonceSvcDisponibilite, setAnnonceSvcDisponibilite)}

                      {SEC("Que recherchez-vous via APPLITAG Connect ?")}
                      {chips(["Nouveaux chantiers","Nouveaux clients","Partenariats avec d'autres professionnels",
                        "Mise à disposition de matériel","Besoins de transport","Besoins de stockage",
                        "Intégrer APPLITAG Network","Découvrir APPLITAG Operations","Autre"],
                        annonceSvcRecherche, toggleSvcRecherche)}

                      {SEC("Présentez votre activité")}
                      <textarea value={annonceSvcActivite} onChange={e=>setAnnonceSvcActivite(e.target.value)}
                        placeholder="Décrivez votre entreprise, vos spécialités, vos zones habituelles, vos références…" rows={4} style={TA}/>

                      {photoSection(5)}

                      {SEC("Consentements")}
                      {consent(consentRGPD, setConsentRGPD,
                        "J'ai pris connaissance de la politique de confidentialité et des modalités de traitement des informations transmises avec la présentation de mon activité.", true)}
                      {consent(consentActus, setConsentActus,
                        "Je souhaite recevoir par e-mail les actualités, nouveautés et informations d'APPLITAG.")}
                      <div style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.5,marginBottom:14,fontStyle:"italic"}}>
                        L'envoi de ce formulaire ne garantit ni un référencement dans APPLITAG Network, ni une mise en relation.
                      </div>
                      {submitBlock("Transmettre ma présentation")}
                    </>
                  );

                  /* ════════════ DÉMO (form 476) ════════════ */
                  return (
                    <>
                      <div style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,.9)",marginBottom:14}}>
                        📋 Demande de démonstration — APPLITAG
                      </div>
                      {SEC("Vos coordonnées")}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <input value={annoncePrenom} onChange={e=>setAnnoncePrenom(e.target.value)}
                          placeholder="Prénom *" style={{...INP,marginBottom:8}}/>
                        <input value={annonceNom} onChange={e=>setAnnonceNom(e.target.value)}
                          placeholder="Nom *" style={{...INP,marginBottom:8}}/>
                      </div>
                      <input value={annonceDemoEntreprise} onChange={e=>setAnnonceDemoEntreprise(e.target.value)}
                        placeholder="Entreprise / organisme *" style={INP}/>
                      <input value={annonceDemoFonction} onChange={e=>setAnnonceDemoFonction(e.target.value)}
                        placeholder="Fonction" style={INP}/>
                      <input value={annonceEmail} onChange={e=>setAnnonceEmail(e.target.value)}
                        placeholder="Adresse e-mail *" type="email" style={INP}/>
                      <input value={annonceTel} onChange={e=>setAnnonceTel(formatPhone(e.target.value))}
                        placeholder="Téléphone" type="tel" style={INP}/>
                      <input value={annonceDemoDept} onChange={e=>setAnnonceDemoDept(e.target.value)}
                        placeholder="Département" style={INP}/>

                      {SEC("Votre profil")}
                      {chips(["Propriétaire / détenteur de ressource","Exploitant forestier","ETF / travaux forestiers",
                        "Déchiqueteur","Transporteur","Scierie / industrie du bois","Plateforme",
                        "Chaufferie / exploitant énergétique","Gestionnaire forestier","Bureau d'études / ingénierie",
                        "Collectivité territoriale","Organisme public / institutionnel","Donneur d'ordre","Autre"],
                        annonceDemoProfils, toggleDemoProfil)}

                      {SEC("Ce que vous souhaitez voir pendant la démonstration")}
                      {chips(["Vue globale d'APPLITAG","APPLITAG Operations","Gestion des ressources et des lots",
                        "Visite terrain et suivi de chantier","Tas et stocks bord de route","Déchiquetage",
                        "Transport et logistique","Réception chaufferie","Traçabilité et documents",
                        "Qualité, humidité et contrôles","APPLITAG Data","RED / GES / conformité",
                        "APPLITAG Connect","APPLITAG Network","Plan d'approvisionnement auditable","Autre"],
                        annonceDemoVoir, toggleDemoVoir)}

                      {SEC("Vos principaux enjeux")}
                      {chips(["Sécuriser les approvisionnements","Améliorer la traçabilité","Réduire les ressaisies",
                        "Mieux suivre les chantiers","Améliorer la logistique","Suivre les stocks",
                        "Fiabiliser les réceptions","Suivre la qualité combustible","Structurer les documents et preuves",
                        "Préparer les contrôles / audits","Suivre RED / GES","Améliorer le reporting",
                        "Piloter plusieurs sites","Autre"],
                        annonceDemoEnjeux, toggleDemoEnjeux)}

                      {SEC("Votre organisation")}
                      <textarea value={annonceDemoActivite} onChange={e=>setAnnonceDemoActivite(e.target.value)}
                        placeholder="Décrivez votre activité" rows={3} style={TA}/>
                      <input value={annonceDemoStructure} onChange={e=>setAnnonceDemoStructure(e.target.value)}
                        placeholder="Nb d'utilisateurs, nb de sites / plateformes / chaufferies" style={INP}/>
                      <textarea value={annonceDemoSuivi} onChange={e=>setAnnonceDemoSuivi(e.target.value)}
                        placeholder="Comment suivez-vous actuellement vos approvisionnements ? (Excel, logiciel, ERP…)" rows={2} style={TA}/>
                      <textarea value={annonceDemoContexte} onChange={e=>setAnnonceDemoContexte(e.target.value)}
                        placeholder="Présentez brièvement votre contexte ou votre projet" rows={2} style={TA}/>

                      {SEC("Format et disponibilités")}
                      {radioGroup(["Visioconférence","Échange téléphonique préalable","Démonstration sur site","À définir ensemble"],
                        annonceDemoFormat, setAnnonceDemoFormat)}
                      <input value={annonceDemoDispos} onChange={e=>setAnnonceDemoDispos(e.target.value)}
                        placeholder="Disponibilités souhaitées (ex. semaine prochaine, matin de préférence…)" style={INP}/>

                      {SEC("Consentements")}
                      {consent(consentRGPD, setConsentRGPD,
                        "J'ai pris connaissance de la politique de confidentialité et des modalités de traitement de ma demande de démonstration.", true)}
                      {consent(consentActus, setConsentActus,
                        "Je souhaite recevoir par e-mail les actualités, nouveautés et informations d'APPLITAG.")}
                      <div style={{fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.5,marginBottom:14,fontStyle:"italic"}}>
                        La demande de démonstration est sans engagement et ne constitue pas une commande.
                      </div>
                      {submitBlock("Demander ma démonstration")}
                    </>
                  );
                })()}
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
                <button onClick={()=>{ resetAnnonce(); setAnnonceType("gisement"); setStep("annonce"); }} style={{
                  width:"100%",padding:16,borderRadius:14,textAlign:"left",
                  background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",
                  color:"#fff",fontFamily:"inherit",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:14,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:24}}>🌲</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>Proposer une ressource</div>
                    <div style={{fontSize:11,opacity:.6,marginTop:2}}>Bois sur pied ou bord de route — sans compte requis</div>
                  </div>
                </button>
                <button onClick={()=>{ resetAnnonce(); setAnnonceType("service"); setStep("annonce"); }} style={{
                  width:"100%",padding:16,borderRadius:14,textAlign:"left",
                  background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",
                  color:"#fff",fontFamily:"inherit",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:14,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:24}}>🛠️</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>Proposer un service</div>
                    <div style={{fontSize:11,opacity:.6,marginTop:2}}>Abattage, débardage, déchiquetage, transport — sans compte requis</div>
                  </div>
                </button>
                <button onClick={()=>{ resetCompteForm(); setCompteVue("inscription"); }} style={{
                  width:"100%",padding:16,borderRadius:14,textAlign:"left",
                  background:"rgba(76,175,80,.2)",border:"1px solid rgba(76,175,80,.5)",
                  color:"#fff",fontFamily:"inherit",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:14,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:24}}>🤝</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>Rejoindre APPLITAG</div>
                    <div style={{fontSize:11,opacity:.6,marginTop:2}}>Créer un compte gratuit — suivre vos propositions</div>
                  </div>
                </button>
                <button onClick={()=>{ resetCompteForm(); setCompteVue("connexion"); }} style={{
                  width:"100%",padding:16,borderRadius:14,textAlign:"left",
                  background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.18)",
                  color:"#fff",fontFamily:"inherit",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:14,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:24}}>🔑</span>
                  <div style={{fontSize:14,fontWeight:600}}>Se connecter</div>
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
                  {([
                    [compteRgpd, setCompteRgpd, "J'accepte la politique de protection des données personnelles (RGPD) *"],
                    [compteCgu,  setCompteCgu,  "J'accepte les conditions générales d'utilisation APPLITAG Connect *"],
                  ] as any[]).map(([val, setter, label]: any, i: number)=>(
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
                    {mesAnnonces.map((a: any)=>{
                      const statutInfo = STATUTS_ANNONCE[a.statut]||STATUTS_ANNONCE.recu;
                      return (
                        <div key={a.id} style={{background:"rgba(255,255,255,.06)",borderRadius:10,
                          padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:12,color:"#fff",fontWeight:600}}>
                              {({"gisement":"🌲 Bois proposé","service":"🛠️ Service proposé",
                                "demande":"🪵 Demande plaquettes"} as Record<string,any>)[a.type]||a.type}
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
                    const ageJ = Math.floor((now.getTime()-new Date(c.date).getTime())/(1000*60*60*24));
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
                          const ageJ = Math.floor((now.getTime()-new Date(c.date).getTime())/(1000*60*60*24));
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
                  setConsentRGPD(false); setError(""); setStep("annonce"); }}
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
            {(()=>{
              const btnBase: React.CSSProperties = {
                aspectRatio:"1",borderRadius:12,
                background:"rgba(255,255,255,.1)",
                border:"1px solid rgba(255,255,255,.15)",
                color:"#fff",fontSize:22,fontWeight:500,
                cursor:"pointer",fontFamily:"inherit",
                WebkitTapHighlightColor:"transparent" as any,
                display:"flex",alignItems:"center",justifyContent:"center",
              };
              return (
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",
                  gap:8,margin:"0 auto",
                  width:"min(280px, 76vw)" as any}}>
                  {[1,2,3,4,5,6,7,8,9].map(d=>(
                    <button key={d} onClick={()=>handlePin(String(d))} style={btnBase}>{d}</button>
                  ))}
                  <div/>
                  <button onClick={()=>handlePin("0")} style={btnBase}>0</button>
                  <button onClick={handleDel} style={{...btnBase,
                    background:"rgba(255,255,255,.08)",
                    border:"1px solid rgba(255,255,255,.1)",
                    fontSize:20}}>⌫</button>
                </div>
              );
            })()}
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
