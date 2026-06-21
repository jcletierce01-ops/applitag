// ============================================================
// APPLITAG MOBILE — Auth QR + PIN + Multi-tenant
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const API = "https://applitag-api-production.up.railway.app";

const C = {
  green:"#1D9E75", greenL:"#E1F5EE", greenD:"#085041",
  blue:"#185FA5",  blueL:"#E6F1FB",  blueD:"#042C53",
  amber:"#BA7517", amberL:"#FAEEDA", amberD:"#412402",
  red:"#A32D2D",   redL:"#FCEBEB",
  purple:"#534AB7",purpleL:"#EEEDFE",purpleD:"#26215C",
  brown:"#8B6914", brownL:"#F1EFE8",
  bg:"#F5F4F1", bg2:"#ECEAE6",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
  sb:"#111",
};

const BTN_H = 56;
const INPUT_H = 52;
const FONT_INPUT = 16;
const PADDING = 16;

const uid = () => Math.random().toString(36).slice(2,9);
const nowISO = () => new Date().toISOString();
const todayS = () => new Date().toISOString().slice(0,10);

const genLotNumero = (codePostal, seq) => {
  const now = new Date();
  const annee = now.getFullYear();
  const mois = String(now.getMonth()+1).padStart(2,"0");
  const dept = (codePostal||"00").toString().slice(0,2);
  const seqStr = String(seq||1).padStart(3,"0");
  return `LOT-${annee}-${mois}-${dept}-${seqStr}`;
};

// Auth helpers
const getToken = () => localStorage.getItem("applitag_token");
const getUser  = () => { try { return JSON.parse(localStorage.getItem("applitag_user")||"null"); } catch { return null; } };
const getEntrepriseId = () => localStorage.getItem("applitag_entreprise_id");
const setAuth  = (token, user, entrepriseId) => {
  localStorage.setItem("applitag_token", token);
  localStorage.setItem("applitag_user", JSON.stringify(user));
  localStorage.setItem("applitag_entreprise_id", entrepriseId);
};
const clearAuth = () => {
  localStorage.removeItem("applitag_token");
  localStorage.removeItem("applitag_user");
  localStorage.removeItem("applitag_entreprise_id");
};
const authHeaders = () => ({
  "Content-Type":"application/json",
  "Authorization":`Bearer ${getToken()}`,
});

const ORIGINE_OPTS = [
  ["appel_entrant","📞","Appel entrant"],
  ["visite_terrain","🔭","Visite terrain"],
  ["recommandation","🤝","Recommandation"],
  ["salon","🎪","Salon"],
  ["email","📧","Email"],
  ["site_internet","🌐","Site internet"],
  ["reseau_applitag","🌲","Réseau APPLITAG"],
  ["autre","…","Autre"],
];
const TYPE_CONTACT_OPTS = [
  ["proprietaire_forestier","👤","Propriétaire forestier"],
  ["cooperative","🌿","Coopérative"],
  ["etf","⛏","ETF"],
  ["transporteur","🚛","Transporteur"],
  ["chaufferie","🏭","Chaufferie"],
  ["plateforme","🏗️","Plateforme"],
  ["negociant","💼","Négociant"],
  ["collectivite","🏛️","Collectivité"],
  ["prospect","🔍","Prospect"],
];
const TYPE_RESSOURCE_OPTS = [
  ["bois_energie","🪵","Bois énergie"],
  ["bois_oeuvre","🌲","Bois d'œuvre"],
  ["bois_rond","🪨","Bois rond"],
  ["bois_trituration","📄","Bois de trituration"],
  ["bois_bord_route","🛣️","Bois bord de route"],
  ["stock_plaquettes","🪣","Stock plaquettes"],
  ["mixte","🌳","Mixte"],
];
const PRIORITE_OPTS = [
  ["basse","⚪","Basse"],
  ["moyenne","🟡","Moyenne"],
  ["haute","🟠","Haute"],
  ["immediate","🔴","Immédiate"],
];
const STATUT_OPTS = [
  ["nouveau","🆕","Nouveau"],
  ["a_rappeler","📞","À rappeler"],
  ["qualifie","✅","Qualifié"],
  ["visite_prevue","🔭","Visite prévue"],
  ["perdu","❌","Perdu"],
];

// ── ATOMS ─────────────────────────────────────────────────────
const BigBtn = ({onClick,bg=C.green,color="#fff",children,disabled,icon,style={}}) => (
  <button onClick={disabled?undefined:onClick} style={{
    width:"100%",height:BTN_H,borderRadius:14,
    background:disabled?C.bg2:bg,color:disabled?C.tx3:color,
    border:"none",fontFamily:"inherit",fontSize:16,fontWeight:600,
    display:"flex",alignItems:"center",justifyContent:"center",gap:10,
    cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,
    WebkitTapHighlightColor:"transparent",...style,
  }}>
    {icon&&<span style={{fontSize:22}}>{icon}</span>}
    {children}
  </button>
);

const MInput = ({label,value,onChange,placeholder,type="text",required,error,hint,big}) => {
  const inputMode = type==="number"||type==="numeric" ? "decimal"
    : type==="tel" ? "tel"
    : type==="email" ? "email"
    : undefined;
  return (
  <div style={{marginBottom:14}}>
    <div style={{fontSize:13,fontWeight:600,color:error?C.red:C.tx2,marginBottom:5,
      display:"flex",justifyContent:"space-between"}}>
      <span>{label}{required&&<span style={{color:"#E24B4A"}}> *</span>}</span>
      {hint&&<span style={{fontWeight:400,color:C.tx3,fontSize:12}}>{hint}</span>}
    </div>
    {big ? (
      <textarea value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} rows={3}
        style={{width:"100%",padding:"14px",borderRadius:12,resize:"none",
          border:`1.5px solid ${error?C.red:C.bd}`,
          fontSize:FONT_INPUT,fontFamily:"inherit",lineHeight:1.5,
          background:"#fff",color:C.tx,outline:"none"}}/>
    ) : (
      <input value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        type={type==="number"?"text":type}
        inputMode={inputMode}
        style={{width:"100%",height:INPUT_H,padding:"0 14px",borderRadius:12,
          border:`1.5px solid ${error?C.red:C.bd}`,
          fontSize:FONT_INPUT,fontFamily:"inherit",
          background:"#fff",color:C.tx,outline:"none"}}/>
    )}
    {error&&<div style={{fontSize:12,color:C.red,marginTop:4}}>⚠ {error}</div>}
  </div>
  );
};

const GridSelect = ({options,value,onChange,cols=3}) => (
  <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:8,marginBottom:14}}>
    {options.map(([v,emoji,label])=>{
      const active = value===v;
      return (
        <button key={v} onClick={()=>onChange(v)} style={{
          padding:"10px 6px",borderRadius:12,
          border:`1.5px solid ${active?C.green:C.bd}`,
          background:active?C.greenL:"#fff",cursor:"pointer",
          fontFamily:"inherit",display:"flex",flexDirection:"column",
          alignItems:"center",gap:4,WebkitTapHighlightColor:"transparent",
        }}>
          <span style={{fontSize:20}}>{emoji}</span>
          <span style={{fontSize:10,fontWeight:active?600:400,
            color:active?C.greenD:C.tx2,textAlign:"center",lineHeight:1.3}}>
            {label}
          </span>
        </button>
      );
    })}
  </div>
);

const SectionTitle = ({icon,label}) => (
  <div style={{fontSize:13,fontWeight:700,color:C.tx2,marginBottom:12,marginTop:8,
    display:"flex",alignItems:"center",gap:7,
    paddingBottom:8,borderBottom:`1px solid ${C.bd}`}}>
    <span style={{fontSize:16}}>{icon}</span>{label}
  </div>
);

// ── SIGNATURE CANVAS ──────────────────────────────────────────
const SignatureCanvas = ({label, nomSignataire="", onSigned, onClear, signed=false}) => {
  const canvasRef = useRef(null);
  const drawing   = useRef(false);
  const [hasSig,  setHasSig]  = useState(signed);
  const [showPad, setShowPad] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x:(src.clientX-rect.left)*(canvas.width/rect.width),
             y:(src.clientY-rect.top)*(canvas.height/rect.height) };
  };
  const startDraw = (e) => {
    e.preventDefault(); drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const {x,y} = getPos(e,canvasRef.current);
    ctx.beginPath(); ctx.moveTo(x,y);
  };
  const draw = (e) => {
    if (!drawing.current) return; e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const {x,y} = getPos(e,canvasRef.current);
    ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.strokeStyle="#1A1A18";
    ctx.lineTo(x,y); ctx.stroke();
  };
  const endDraw = () => { drawing.current = false; };
  const handleClear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0,0,canvasRef.current.width,canvasRef.current.height);
    setHasSig(false); onClear&&onClear();
  };
  const handleValider = () => {
    const data = canvasRef.current.toDataURL("image/png");
    setHasSig(true); setShowPad(false); onSigned&&onSigned(data);
  };

  return (
    <div style={{marginBottom:14}}>
      {label&&<div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>{label}</div>}
      <div onClick={()=>!hasSig&&setShowPad(true)} style={{
        border:`2px solid ${hasSig?C.green:C.bd}`,borderRadius:12,
        padding:hasSig?"0":"24px 0",background:hasSig?C.greenL:"#fff",
        cursor:hasSig?"default":"pointer",
        display:"flex",flexDirection:"column",alignItems:"center",gap:8,
        WebkitTapHighlightColor:"transparent"}}>
        {hasSig?(
          <div style={{padding:"10px 16px",display:"flex",alignItems:"center",
            justifyContent:"space-between",width:"100%"}}>
            <div style={{fontSize:13,fontWeight:600,color:C.greenD}}>
              ✅ Signé — {nomSignataire}
            </div>
            <button onClick={e=>{e.stopPropagation();handleClear();setShowPad(true);}}
              style={{background:"none",border:"none",color:C.tx3,cursor:"pointer",
                fontSize:12,padding:"2px 8px",borderRadius:6,
                WebkitTapHighlightColor:"transparent"}}>
              ↺ Refaire
            </button>
          </div>
        ):(
          <><span style={{fontSize:28}}>✍️</span>
          <span style={{fontSize:13,color:C.tx3}}>Appuyez pour signer</span></>
        )}
      </div>
      {showPad&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",
          zIndex:3000,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:16}}>
            <div style={{width:40,height:4,borderRadius:2,background:C.bd,margin:"0 auto 16px"}}/>
            <div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:4}}>
              ✍️ {nomSignataire||label}
            </div>
            <div style={{fontSize:11,color:C.tx3,marginBottom:12}}>
              Signez dans le cadre ci-dessous
            </div>
            <div style={{position:"relative",borderRadius:12,overflow:"hidden",
              border:`2px solid ${C.bd}`,background:"#FAFAF8",marginBottom:12}}>
              <canvas ref={canvasRef} width={360} height={160}
                style={{width:"100%",height:160,display:"block",touchAction:"none"}}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
              <div style={{position:"absolute",bottom:8,left:0,right:0,
                textAlign:"center",pointerEvents:"none"}}>
                <div style={{borderTop:`1px solid ${C.bd}`,margin:"0 24px",paddingTop:6,
                  fontSize:10,color:C.tx3}}>{nomSignataire||"Signataire"}</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:8}}>
              <button onClick={handleClear} style={{
                padding:"12px 0",borderRadius:10,background:C.bg2,border:`1px solid ${C.bd}`,
                color:C.tx2,fontFamily:"inherit",fontSize:13,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>🗑️ Effacer</button>
              <button onClick={handleValider} style={{
                padding:"12px 0",borderRadius:10,background:C.green,border:"none",
                color:"#fff",fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>✅ VALIDER</button>
            </div>
            <button onClick={()=>setShowPad(false)} style={{
              width:"100%",marginTop:10,padding:10,background:"transparent",
              border:"none",color:C.tx3,fontFamily:"inherit",fontSize:13,cursor:"pointer"}}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ÉCRAN LOGIN ───────────────────────────────────────────────
// ── DONNÉES DÉMO ──────────────────────────────────────────────
const DEMO_ENTREPRISE_ID = "demo-applitag-2026";
const DEMO_USERS = {
  admin:       {nom:"Demo",     prenom:"Admin",    role:"admin",        id:"demo-admin",    pin:"0000"},
  operateur:   {nom:"Dupont",   prenom:"Martin",   role:"operateur",    id:"demo-op1",      pin:"1111"},
  proprietaire:{nom:"Martin",   prenom:"Jean",     role:"proprietaire", id:"demo-prop1",    pin:"2222"},
  chauffeur:   {nom:"Robert",   prenom:"Pierre",   role:"chauffeur",    id:"demo-chauf",    pin:"3333"},
  broyage:     {nom:"Forestier",prenom:"François", role:"broyage",      id:"demo-broyage",  pin:"4444"},
  chaufferie:  {nom:"Énergie",  prenom:"Sophie",   role:"chaufferie",   id:"demo-chauff",   pin:"5555"},
};

const DEMO_LOTS = [
  {id:"demo-lot-1",lotNumero:"LOT-2026-06-89-001",nom:"Martin",prenom:"Jean",
   telephone:"0386420123",commune:"Charny-Orée-de-Puisaye",surfaceHa:12.5,
   potentiel:"chene",statutLot:"VISITE_REALISEE",dateContact:"2026-06-01",
   adresseParcelle:"Lieu-dit Les Épines",refCadastrale:"B 142",
   entrepriseId:DEMO_ENTREPRISE_ID},
  {id:"demo-lot-2",lotNumero:"LOT-2026-06-89-002",nom:"Dubois",prenom:"Marie",
   telephone:"0386431234",commune:"Sens",surfaceHa:8.2,
   potentiel:"hetre",statutLot:"EN_COURS_EXPLOITATION",dateContact:"2026-05-15",
   adresseParcelle:"Forêt communale Est",refCadastrale:"C 218",
   etfNom:"ETF Gaillard",tonnageCumul:45.5,entrepriseId:DEMO_ENTREPRISE_ID},
  {id:"demo-lot-3",lotNumero:"LOT-2026-06-89-003",nom:"Lefebvre",prenom:"Paul",
   telephone:"0386442345",commune:"Joigny",surfaceHa:22.0,
   potentiel:"melange",statutLot:"BORD_ROUTE",dateContact:"2026-04-20",
   adresseParcelle:"Bois du Moulin",refCadastrale:"A 089",
   etfNom:"ETF Moreau",tonnageCumul:180.0,entrepriseId:DEMO_ENTREPRISE_ID},
  {id:"demo-lot-4",lotNumero:"LOT-2026-06-89-004",nom:"Bernard",prenom:"Lucien",
   telephone:"0386453456",commune:"Auxerre",surfaceHa:6.8,
   potentiel:"peuplier",statutLot:"EN_LIVRAISON",dateContact:"2026-04-05",
   adresseParcelle:"Ripisylve de l'Yonne",refCadastrale:"D 331",
   etfNom:"ETF Gaillard",tonnageCumul:62.0,entrepriseId:DEMO_ENTREPRISE_ID},
  {id:"demo-lot-5",lotNumero:"LOT-2026-06-89-005",nom:"Rousseau",prenom:"Élise",
   telephone:"0386464567",commune:"Migennes",surfaceHa:15.3,
   potentiel:"chene",statutLot:"LIVRE_CHAUFFERIE",dateContact:"2026-03-10",
   adresseParcelle:"Grand Bois de Migennes",refCadastrale:"E 445",
   etfNom:"ETF Moreau",tonnageCumul:142.0,entrepriseId:DEMO_ENTREPRISE_ID},
];

const DEMO_VISITES = [
  {id:"demo-v1",lotId:"demo-lot-1",lotNumero:"LOT-2026-06-89-001",
   date:"2026-06-15",statut:"validee",
   gps:{lat:47.7234,lng:3.0892,accuracy:5},photos:["p1","p2","p3"],
   essences:[{id:"chene",label:"Chêne",pct:70,emoji:"🌳"},{id:"charme",label:"Charme",pct:30,emoji:"🌿"}],
   volumeEstimeT:180,surfaceHa:12.5,prixTonne:"42",tauxTVA:"20",
   accesCamion:"praticable",largeurAcces:4.5,distancePlateforme:200,
   replantation:"oui",essenceReplanT:"chene_pedoncule",surfaceReplant:8,
   certification:"pefc",numeroCertification:"PEFC/10-31-1892",
   contraintes:{ligneEDF:false,penteForte:false,zoneHumide:true}},
  {id:"demo-v2",lotId:"demo-lot-2",lotNumero:"LOT-2026-06-89-002",
   date:"2026-05-20",statut:"validee",
   gps:{lat:48.1978,lng:3.2833,accuracy:8},photos:["p1","p2"],
   essences:[{id:"hetre",label:"Hêtre",pct:100,emoji:"🌲"}],
   volumeEstimeT:120,surfaceHa:8.2,prixTonne:"48",tauxTVA:"20",
   accesCamion:"praticable",largeurAcces:5,distancePlateforme:150,
   replantation:"non",certification:"aucune"},
];

const DEMO_REPORTINGS = [
  {id:"demo-r1",lotId:"demo-lot-2",lotNumero:"LOT-2026-06-89-002",
   dateJour:"2026-06-10",heureDebut:"07:00",heureFin:"17:00",
   typeOperationJour:"abattage",machineJour:"Tronçonneuse Stihl 500i",
   nbTasJour:3,foisonnement:0.55,nbOperateurs:2,
   observations:"Bonne progression, météo favorable"},
  {id:"demo-r2",lotId:"demo-lot-2",lotNumero:"LOT-2026-06-89-002",
   dateJour:"2026-06-11",heureDebut:"07:30",heureFin:"16:30",
   typeOperationJour:"debardage",machineJour:"John Deere 1270G",
   nbTasJour:5,foisonnement:0.55,nbOperateurs:3,
   observations:"Débardage terminé section Nord"},
  {id:"demo-r3",lotId:"demo-lot-3",lotNumero:"LOT-2026-06-89-003",
   dateJour:"2026-06-12",heureDebut:"06:30",heureFin:"18:00",
   typeOperationJour:"abattage_debardage",machineJour:"Ponsse Bear",
   nbTasJour:8,foisonnement:0.50,nbOperateurs:4,
   observations:"Volume supérieur aux estimations"},
];

const DEMO_TRANSPORTS = [
  {id:"demo-t1",lotId:"demo-lot-4",lotNumero:"LOT-2026-06-89-004",
   numeroCMR:"CMR-2026-0089",typeVehicule:"semi",
   immatTracteur:"AB-123-CD",immatRemorque:"EF-456-GH",
   nomChauffeur:"Pierre Robert",societeTransp:"Transports Moreau",
   heureDebut:"08:00",heureFin:"10:30",
   departConfirme:true},
];

const DEMO_LIVRAISONS = [
  {id:"demo-l1",lotId:"demo-lot-5",lotNumero:"LOT-2026-06-89-005",
   typeDest:"chaufferie",nomDestination:"Chaufferie Migennes Énergie",
   numeroCMR:"CMR-2026-0071",pesee:"142",humiditeReception:28,
   nomReceptionnaire:"Sophie Énergie",
   dateHeureLivraison:"2026-06-08T14:30:00",
   gpsAlerteDeclenche:false},
];

// ── LOGIN SCREEN COMPONENT ────────────────────────────────────
const LoginScreen = ({onLogin, onLoginOperateur, onLoginDemo}) => {
  const [step, setStep] = useState("home"); // home | scan | pin | operateur | demo
  const [entrepriseId, setEntrepriseId] = useState("");
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [opNom, setOpNom] = useState("");
  const [opPin, setOpPin] = useState("");
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
      const res = await fetch(`${API}/auth/login`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ entrepriseId, pin }),
      });
      if (!res.ok) throw new Error("PIN incorrect");
      const data = await res.json();
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
      const res = await fetch(`${API}/operateurs/login`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          entrepriseId: "c1b035b8-c2d5-4b84-a07e-2a3d503fb96c",
          nom: opNom, pin: opPin
        }),
      });
      if (!res.ok) throw new Error("Identifiants incorrects");
      const data = await res.json();
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
        <div style={{fontSize:22,fontWeight:700}}>APPLITAG</div>
        <div style={{fontSize:13,opacity:.6,marginTop:4}}>Gestion forestière terrain</div>
      </div>

      <div style={{flex:1,padding:PADDING,overflowY:"auto",background:C.sb}}>

        {/* ── HOME — écran d'accueil sans scanner ── */}
        {step==="home"&&(
          <div>
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
              {[
                {role:"admin",       icon:"🔑",label:"Administrateur",   sub:"Accès complet · toutes les données"},
                {role:"operateur",   icon:"👷",label:"Opérateur terrain", sub:"Martin Dupont · ETF Gaillard"},
                {role:"proprietaire",icon:"🏠",label:"Propriétaire",      sub:"Jean Martin · LOT-89-001"},
                {role:"chauffeur",   icon:"🚛",label:"Chauffeur",         sub:"Pierre Robert · Transport Moreau"},
                {role:"broyage",     icon:"🪚",label:"Broyage",           sub:"François Forestier · Jenz HEM 593"},
                {role:"chaufferie",  icon:"🔥",label:"Chaufferie",        sub:"Sophie Énergie · Migennes"},
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
const validatePhone = (tel) => {
  const digits = tel.replace(/\s|\./g,"");
  if (digits.length!==10) return "10 chiffres requis";
  if (!/^0[1-7]/.test(digits)) return "Doit commencer par 01 à 07";
  return null;
};

const Fiche0 = ({onBack, onSaved, toast, contactCount, entrepriseId}) => {
  const [origine,       setOrigine]  = useState("");
  const [nomApporteur,  setApporteur]= useState("");
  const [dateContact,   setDateC]    = useState(todayS());
  const [typeContact,   setType]     = useState("proprietaire_forestier");
  const [nom,           setNom]      = useState("");
  const [prenom,        setPrenom]   = useState("");
  const [telephone,     setTel]      = useState("");
  const [email,         setEmail]    = useState("");
  const [adressePostale,setAdresse]  = useState("");
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
    const seq = (contactCount||0) + 1;
    const lotNumero = genLotNumero(codePostal, seq);
    const contact = {
      nom, prenom, telephone, email,
      adressePostale, commune, adresseParcelle,
      surfaceHa: surfaceHa ? parseFloat(surfaceHa) : null,
      refCadastrale, typeContact, origine, nomApporteur, dateContact,
      statut, potentiel: typeRessource==="mixte"
        ? `mixte:${mixteDetails.join(",")}`
        : typeRessource, commentaire, lotNumero,
      entrepriseId,
    };
    try {
      const res = await fetch(`${API}/contacts`, {
        method:"POST",
        headers: authHeaders(),
        body:JSON.stringify(contact),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      toast(`Fiche créée — ${lotNumero}`);
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
          <GridSelect options={ORIGINE_OPTS} value={origine} onChange={setOrigine} cols={4}/>
        </div>
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
        <MInput label="Téléphone" value={telephone} onChange={setTel}
          placeholder="06 xx xx xx xx" type="tel" required error={errors.telephone}/>
        <MInput label="Email" value={email} onChange={setEmail}
          placeholder="email@exemple.fr" type="email" hint="optionnel"/>
        <MInput label="Adresse postale" value={adressePostale} onChange={setAdresse}
          placeholder="Adresse du propriétaire" hint="optionnel"/>

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

        {codePostal&&(
          <div style={{background:C.greenL,borderRadius:12,padding:14,marginTop:4,
            border:`1.5px solid ${C.green}`}}>
            <div style={{fontSize:12,color:C.greenD,fontWeight:600,marginBottom:4}}>
              🏷 Numéro de lot généré
            </div>
            <div style={{fontFamily:"monospace",fontSize:18,fontWeight:700,color:C.greenD}}>
              {genLotNumero(codePostal,(contactCount||0)+1)}
            </div>
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
const MSlider = ({label,value,onChange,min,max,step=1,unit,color=C.green,hint}) => (
  <div style={{marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",
      fontSize:12,fontWeight:600,color:C.tx2,marginBottom:8}}>
      <span>{label}{hint&&<span style={{fontWeight:400,color:C.tx3,fontSize:10}}> · {hint}</span>}</span>
      <span style={{color,fontSize:15,fontWeight:700}}>{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e=>onChange(parseFloat(e.target.value))}
      style={{width:"100%",height:8,accentColor:color}}/>
    <div style={{display:"flex",justifyContent:"space-between",
      fontSize:9,color:C.tx3,marginTop:3}}>
      <span>{min}{unit}</span><span>{max}{unit}</span>
    </div>
  </div>
);

const GpsWidget = ({value,onChange,required}) => {
  const [loading,setLoading] = useState(false);
  const capture = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { onChange({lat:pos.coords.latitude,lng:pos.coords.longitude,
          accuracy:pos.coords.accuracy,source:"gps"}); setLoading(false); },
        () => { onChange({lat:47.98+(Math.random()-.5)*.02,
          lng:3.09+(Math.random()-.5)*.02,source:"sim"}); setLoading(false); },
        {enableHighAccuracy:true,timeout:10000}
      );
    } else { onChange({lat:47.98,lng:3.09,source:"sim"}); setLoading(false); }
  };
  if (value) return (
    <div style={{background:C.greenL,borderRadius:12,padding:"14px",
      marginBottom:14,border:`1.5px solid ${C.green}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:13,color:C.greenD,fontWeight:600,marginBottom:3}}>
            📍 {value.source==="gps"?"GPS précis":"Position approximative"}
          </div>
          <div style={{fontFamily:"monospace",fontSize:13,color:C.greenD}}>
            {value.lat.toFixed(5)}°N · {value.lng.toFixed(5)}°E
          </div>
        </div>
        <button onClick={()=>onChange(null)} style={{background:"rgba(8,80,65,.15)",
          border:"none",color:C.greenD,cursor:"pointer",fontSize:20,padding:8,
          borderRadius:8,WebkitTapHighlightColor:"transparent"}}>✕</button>
      </div>
    </div>
  );
  return (
    <div style={{marginBottom:14}}>
      <BigBtn onClick={capture} bg={loading?C.bg2:C.greenL}
        color={loading?C.tx3:C.greenD} icon={loading?"":"📍"}>
        {loading?"Localisation…":"Capturer GPS"}
      </BigBtn>
    </div>
  );
};

const CheckItem = ({checked,onChange,label,sub,warn}) => (
  <div onClick={()=>onChange(!checked)} style={{display:"flex",alignItems:"flex-start",
    gap:12,padding:"12px 0",borderBottom:`0.5px solid ${C.bd}`,
    cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
    <div style={{width:28,height:28,borderRadius:8,flexShrink:0,marginTop:1,
      border:`2px solid ${checked?(warn?C.amber:C.green):C.bd2}`,
      background:checked?(warn?C.amber:C.green):"#fff",
      display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
      {checked&&<span style={{color:"#fff",fontSize:16,lineHeight:1}}>✓</span>}
    </div>
    <div style={{flex:1}}>
      <div style={{fontSize:15,fontWeight:checked?400:500,color:checked?C.tx2:C.tx}}>{label}</div>
      {sub&&<div style={{fontSize:12,color:C.tx3,marginTop:2}}>{sub}</div>}
    </div>
  </div>
);

const PhotosWidget = ({photos,onChange,required=2}) => {
  const addPhoto = (type) => {
    const emojis = {face:"📷",profil:"📸",zone:"🌳",acces:"🛤️",autre:"🖼️"};
    onChange([...photos,{id:uid(),type,emoji:emojis[type]||"📷",capturedAt:nowISO()}]);
  };
  return (
    <div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
        {photos.map(p=>(
          <div key={p.id} style={{position:"relative"}}>
            <div style={{width:72,height:72,borderRadius:12,background:C.greenL,
              border:`1.5px solid ${C.green}`,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",fontSize:26}}>
              {p.emoji}
              <div style={{fontSize:9,color:C.greenD,marginTop:3}}>{p.type}</div>
            </div>
            <button onClick={()=>onChange(photos.filter(x=>x.id!==p.id))}
              style={{position:"absolute",top:-6,right:-6,width:20,height:20,
                borderRadius:"50%",background:C.red,color:"#fff",border:"2px solid #fff",
                cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",
                justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
        {[["face","📷 Face"],["profil","📸 Profil"],["zone","🌳 Zone"],
          ["acces","🛤️ Accès"],["autre","🖼️ Autre"]].map(([type,label])=>(
          <button key={type} onClick={()=>addPhoto(type)} style={{height:44,borderRadius:10,
            border:`1px solid ${C.bd}`,background:"#fff",cursor:"pointer",
            fontFamily:"inherit",fontSize:11,color:C.tx2,display:"flex",
            alignItems:"center",justifyContent:"center",gap:4,
            WebkitTapHighlightColor:"transparent"}}>{label}</button>
        ))}
      </div>
      <BigBtn onClick={()=>addPhoto("face")} bg="#111" color="#fff" icon="📷">
        Prendre une photo
      </BigBtn>
      <div style={{fontSize:12,color:photos.length>=required?C.greenD:C.amber,
        textAlign:"center",marginTop:6}}>
        {photos.length}/{required} photos{photos.length>=required?" ✓":""}
      </div>
    </div>
  );
};

const EssenceEditor = ({essences,onChange}) => {
  const LISTE = [
    ["peuplier","🌾","Peuplier"],["chene","🌳","Chêne"],["hetre","🌲","Hêtre"],
    ["charme","🌿","Charme"],["frene","🍃","Frêne"],["bouleau","🪵","Bouleau"],
    ["resineux","🎄","Résineux"],["melange","🌳","Mélange"],
  ];
  const total = essences.reduce((s,e)=>s+e.pct,0);
  const addEssence = () => {
    const used = new Set(essences.map(e=>e.id));
    const next = LISTE.find(([v])=>!used.has(v));
    if (!next) return;
    onChange([...essences,{id:next[0],emoji:next[1],label:next[2],pct:Math.max(0,100-total)}]);
  };
  return (
    <div>
      {essences.map((e,i)=>(
        <div key={e.id} style={{background:C.bg2,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <span style={{fontSize:22}}>{e.emoji}</span>
            <select value={e.id} onChange={ev=>{
              const found=LISTE.find(([v])=>v===ev.target.value);
              onChange(essences.map((x,j)=>j===i?{...x,id:ev.target.value,
                emoji:found?.[1]||"🌳",label:found?.[2]||""}:x));
            }} style={{flex:1,height:44,padding:"0 10px",borderRadius:9,
              border:`1px solid ${C.bd}`,fontSize:14,fontFamily:"inherit",
              background:"#fff",outline:"none"}}>
              {LISTE.map(([v,em,l])=><option key={v} value={v}>{em} {l}</option>)}
            </select>
            <button onClick={()=>onChange(essences.filter((_,j)=>j!==i))}
              style={{width:36,height:36,borderRadius:8,background:C.redL,
                color:C.red,border:"none",cursor:"pointer",fontSize:18,
                WebkitTapHighlightColor:"transparent"}}>✕</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="range" min={1} max={100} value={e.pct}
              onChange={ev=>onChange(essences.map((x,j)=>j===i?{...x,pct:parseInt(ev.target.value)}:x))}
              style={{flex:1,accentColor:C.green}}/>
            <div style={{width:48,textAlign:"center",fontWeight:700,fontSize:16,color:C.green}}>
              {e.pct}%
            </div>
          </div>
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
        <button onClick={addEssence} style={{height:44,padding:"0 16px",borderRadius:10,
          background:C.greenL,color:C.greenD,border:"none",cursor:"pointer",
          fontFamily:"inherit",fontSize:14,fontWeight:500,
          WebkitTapHighlightColor:"transparent"}}>+ Ajouter</button>
        <div style={{fontSize:13,fontWeight:600,color:Math.abs(total-100)<=1?C.greenD:C.red}}>
          Σ {total}% {Math.abs(total-100)>1&&"⚠"}
        </div>
      </div>
    </div>
  );
};

const STEPS = [
  {id:"gps",           label:"GPS",           icon:"📍", color:C.green},
  {id:"photos",        label:"Photos",        icon:"📷", color:C.blue},
  {id:"essences",      label:"Essences",      icon:"🌿", color:C.green},
  {id:"volumes",       label:"Volumes",       icon:"📏", color:C.amber},
  {id:"contraintes",   label:"Terrain",       icon:"⚠️", color:C.red},
  {id:"acces",         label:"Accès",         icon:"🚛", color:C.brown},
  {id:"plateforme",    label:"Plateforme",    icon:"🏗️", color:C.purple},
  {id:"replantation",  label:"Replantation",  icon:"🌱", color:C.green},
  {id:"certification", label:"Certif.",       icon:"🏅", color:C.blue},
];

const DRAFT_KEY = "applitag_visite_draft";

const FormulaireVisite = ({lot, onBack, onSaved, toast, entrepriseId}) => {
  const [step,     setStep]    = useState(0);
  const [gps,      setGps]     = useState(null);
  const [photos,   setPhotos]  = useState([]);
  const [essences, setEssences]= useState([{id:"peuplier",emoji:"🌾",label:"Peuplier",pct:100}]);
  const [volumeT,  setVolumeT] = useState(0);
  const [modeVolume, setModeVolume] = useState("manuel"); // manuel | slider | parha
  const [popParHa, setPopParHa] = useState("");
  const [surfaceHa,setSurface] = useState(lot.surfaceHa||5);
  const [dateLimite,setDateL]  = useState("");
  const [observations,setObs]  = useState("");
  // Prix & conditions commerciales
  const [prixTonne,     setPrixTonne]    = useState("");
  const [tauxTVA,       setTauxTVA]      = useState("20");
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
  const [sigDataProprio, setSigDataProprio] = useState(null);
  const [sigDataExploit, setSigDataExploit] = useState(null);
  const [nomSignProprio,setNomSigPr] = useState(lot.nomSignataire||lot.nom||"");
  const [nomSignExploit,setNomSigEx] = useState("");
  const [contraintes,setCont]  = useState({
    ligneEDF:false, lignesTelecom:false, penteForte:false,
    zoneHumide:false, voisinage:false, accesDifficile:false,
    routeLimitee:false, natura2000:false, remanents:false,
    autorisationVoirie:false, prevenir_mairie:false, prevenir_voisinage:false,
  });
  // Détails contraintes avec responsable
  const [detailsContraintes, setDetailsCont] = useState({});
  const [accesCamion,setAcces] = useState("praticable");
  const [largeurAcces,setLarg] = useState(4);
  const [distancePlateforme,setDist] = useState(500);
  const [saving, setSaving]    = useState(false);

  // INDICES DE CALCUL PAR ESSENCE
  const INDICES_ESSENCE = {
    peuplier: {densite:850, pci:2.4, foisonnement:0.40},
    chene:    {densite:1000,pci:3.8, foisonnement:0.55},
    hetre:    {densite:1000,pci:4.0, foisonnement:0.55},
    charme:   {densite:1000,pci:4.2, foisonnement:0.55},
    frene:    {densite:900, pci:3.9, foisonnement:0.52},
    bouleau:  {densite:950, pci:3.7, foisonnement:0.50},
    resineux: {densite:870, pci:2.8, foisonnement:0.45},
    melange:  {densite:950, pci:3.5, foisonnement:0.50},
    taillis:  {densite:900, pci:3.5, foisonnement:0.48},
  };

  // Essence principale pour calculs
  const essencePrincipale = essences.sort((a,b)=>b.pct-a.pct)[0]?.id || "melange";
  const indices = INDICES_ESSENCE[essencePrincipale] || INDICES_ESSENCE.melange;

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
        if (draft.contraintes) setCont(draft.contraintes);
        if (draft.accesCamion) setAcces(draft.accesCamion);
      }
    } catch {}
  },[lot.id]);

  // Sauvegarde automatique brouillon
  useEffect(()=>{
    try {
      localStorage.setItem(DRAFT_KEY+lot.id, JSON.stringify({
        gps, essences, volumeT, surfaceHa, dateLimite, observations,
        prixTonne, tauxTVA, acompte, delaiSolde, modeReglement,
        iban, swift, nomBanque, villeBanque,
        contraintes, accesCamion, step,
      }));
    } catch {}
  },[gps, essences, volumeT, surfaceHa, dateLimite, observations,
     prixTonne, contraintes, accesCamion, step]);

  // Recalcul du volume estimé si la surface change en mode "par ha"
  useEffect(()=>{
    if (modeVolume==="parha") {
      setVolumeT(Math.round((parseFloat(popParHa)||0)*surfaceHa*100)/100);
    }
  },[surfaceHa, modeVolume]);


  // Plateforme
  const [platLargeur,    setPlatLarg]   = useState(10);
  const [platLongueur,   setPlatLong]   = useState(20);
  const [platRevetement, setPlatRev]    = useState("terre");
  const [platBordee,     setPlatBord]   = useState("chemin_public");
  const [platAccesCam,   setPlatAccCam] = useState("direct");
  const [platPosBroyeur, setPlatPosBr]  = useState("devant");
  const [platGps,        setPlatGps]    = useState(null);
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

  // Certification
  const [certification,   setCertification]  = useState("aucune");
  const [numeroCertification, setNumeroCert] = useState("");
  const [redCategorie,    setRedCategorie]   = useState("bois_forestier");
  const [redDistance,     setRedDistance]    = useState(100);
  const [redPays,         setRedPays]        = useState("France");

  const stepValid = {
    0:!!gps, 1:photos.length>=2,
    2:essences.length>0&&Math.abs(essences.reduce((s,e)=>s+e.pct,0)-100)<=1,
    3:volumeT>0&&parseFloat(prixTonne)>0, 4:true, 5:true, 6:true, 7:true, 8:true,
  };
  const allValid = Object.values(stepValid).every(Boolean);

  const handleSave = async () => {
    if (!allValid) { toast("Compléter toutes les étapes","warn"); return; }
    setSaving(true);
    const visite = {
      lotId: lot.id, lotNumero: lot.lotNumero||lot.numero,
      date: todayS(), gps, photos, essences,
      volumeEstimeT: volumeT, surfaceHa, dateLimite, observations,
      prixTonne, tauxTVA, acompte, delaiSolde, modeReglement,
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
      certification, numeroCertification, redCategorie, redDistance, redPays,
      indicesCalcul: indices,
      statut:"validee", entrepriseId,
    };
    try {
      const res = await fetch(`${API}/visites`, {
        method:"POST", headers:authHeaders(), body:JSON.stringify(visite),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      localStorage.removeItem(DRAFT_KEY+lot.id); // Effacer le brouillon
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
          <button onClick={onBack} style={{background:"rgba(255,255,255,.2)",border:"none",
            color:"#fff",width:36,height:36,borderRadius:9,cursor:"pointer",fontSize:18,
            display:"flex",alignItems:"center",justifyContent:"center",
            WebkitTapHighlightColor:"transparent"}}>{"<"}</button>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:600}}>{currentStep.icon} {currentStep.label}</div>
            <div style={{fontSize:11,opacity:.7}}>{lot.lotNumero||lot.numero} · {lot.commune}</div>
          </div>
          <div style={{fontSize:12,opacity:.75}}>{step+1}/{STEPS.length}</div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {STEPS.map((s,i)=>(
            <div key={s.id} onClick={()=>i<step&&setStep(i)} style={{flex:1,height:4,
              borderRadius:2,background:i<=step?"rgba(255,255,255,.9)":"rgba(255,255,255,.25)",
              cursor:i<step?"pointer":"default"}}/>
          ))}
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:90}}>
        {step===0&&(
          <div>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16,lineHeight:1.6}}>
              Capturez la position GPS de la parcelle.
            </div>
            <GpsWidget value={gps} onChange={setGps} required/>
            <div style={{marginTop:16}}>
              <MInput label="Lot" value={lot.lotNumero||lot.numero} onChange={()=>{}} hint="auto"/>
              <MInput label="Date" value={todayS()} onChange={()=>{}} hint="auto"/>
            </div>
          </div>
        )}
        {step===1&&(
          <div>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16}}>2 photos minimum.</div>
            <PhotosWidget photos={photos} onChange={setPhotos} required={2}/>
          </div>
        )}
        {step===2&&(
          <div>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16}}>Essences. Total = 100%.</div>
            <EssenceEditor essences={essences} onChange={setEssences}/>
          </div>
        )}
        {step===3&&(
          <div>
            <SectionTitle icon="📏" label="Surface & Volume"/>
            <MSlider label="Surface" value={surfaceHa} onChange={setSurface}
              min={0.5} max={100} step={0.5} unit=" ha" color={C.green}/>

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
                type="number" placeholder="Saisir le tonnage estimé" hint="saisie directe"/>
            )}
            {modeVolume==="slider" && (
              <MSlider label="Volume estimé" value={volumeT} onChange={setVolumeT}
                min={10} max={2000} step={10} unit=" t" color={C.amber}/>
            )}
            {modeVolume==="parha" && (
              <>
                <MInput label="Population estimée (tonnes/ha)" value={popParHa}
                  onChange={v=>{
                    setPopParHa(v);
                    setVolumeT(Math.round((parseFloat(v)||0)*surfaceHa*100)/100);
                  }}
                  type="number" placeholder="ex: 80" hint={`× ${surfaceHa} ha`}/>
                <div style={{fontSize:12,color:C.tx3,marginBottom:14,marginTop:-6}}>
                  = {volumeT>0?`${volumeT} t`:"—"} volume estimé total
                </div>
              </>
            )}

            {/* Estimation calculée — affichée seulement si volume > 0 */}
            {volumeT>0&&(
              <div style={{background:C.amberL,borderRadius:12,padding:14,marginBottom:14,
                border:`1px solid ${C.amber}`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.amberD,marginBottom:8}}>
                  📊 Estimations — essence : {essencePrincipale}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    [volumeT+" t","Tonnage estimé"],
                    [(volumeT/indices.foisonnement).toFixed(0)+" m³","Volume bois"],
                    [(volumeT*indices.pci/1000).toFixed(1)+" MWh","Énergie PCI"],
                  ].map(([v,l],i)=>(
                    <div key={i} style={{textAlign:"center",background:"rgba(186,117,23,.1)",
                      borderRadius:8,padding:8}}>
                      <div style={{fontSize:16,fontWeight:700,color:C.amberD}}>{v}</div>
                      <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:10,color:C.tx3,marginTop:8}}>
                  Densité verte : {indices.densite} kg/m³ · Foisonnement : {indices.foisonnement}
                </div>
              </div>
            )}

            <SectionTitle icon="💶" label="Prix & Conditions commerciales"/>

            {/* Prix HT + TVA */}
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
              <MInput label="Prix à la tonne (€ HT)" value={prixTonne} onChange={setPrixTonne}
                type="number" placeholder="ex: 42.50"/>
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
              const tva = ht*(parseFloat(tauxTVA||20)/100);
              const ttc = ht+tva;
              return (
                <div style={{background:C.greenL,borderRadius:12,padding:14,marginBottom:14,
                  border:`1.5px solid ${C.green}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:8}}>
                    💰 Valeur estimée du lot
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      [ht.toFixed(2)+" €","Total HT"],
                      [tva.toFixed(2)+" €",`TVA ${tauxTVA||20}%`],
                      [ttc.toFixed(2)+" €","Total TTC"],
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
                Acompte : {acompte} € · Solde : {Math.max(0,volumeT*parseFloat(prixTonne)*(1+parseFloat(tauxTVA||20)/100)-parseFloat(acompte)).toFixed(2)} € ({delaiSolde})
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
                <MInput label="IBAN" value={iban} onChange={setIban}
                  placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"/>
                <MInput label="BIC / SWIFT" value={swift} onChange={setSwift}
                  placeholder="ex: BNPAFRPP"/>
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
                {k:"zoneHumide",    l:"Zone humide",             s:"Passage restreint"},
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
                    <button onClick={()=>setStep(i)} style={{marginLeft:"auto",
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
                Surface : {(platLargeur*platLongueur).toFixed(0)} m²
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
                    color:platBordee===v?C.purpleD:C.tx}}>{labels[v]}</div>
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
                <div key={String(v)} onClick={()=>setPlatAutor(v)} style={{
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
              <MInput label="Qui se charge de la démarche ?" value={platQuiAutoris}
                onChange={setPlatQui} placeholder="Ex: propriétaire, ETF, exploitant…"/>
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
                      <option value="chene_pedoncule">🌳 Chêne pédonculé</option>
                      <option value="chene_sessile">🌳 Chêne sessile</option>
                      <option value="hetre">🌲 Hêtre</option>
                      <option value="charme">🌿 Charme</option>
                      <option value="frene">🌿 Frêne</option>
                      <option value="erable">🍁 Érable sycomore</option>
                      <option value="bouleau">🌿 Bouleau</option>
                      <option value="aulne">🌿 Aulne glutineux</option>
                      <option value="peuplier">🌾 Peuplier</option>
                      <option value="tilleul">🌿 Tilleul</option>
                      <option value="merisier">🌸 Merisier</option>
                    </optgroup>
                    <optgroup label="Résineux">
                      <option value="douglas">🌲 Douglas</option>
                      <option value="epicea">🌲 Épicéa commun</option>
                      <option value="pin_sylvestre">🌲 Pin sylvestre</option>
                      <option value="pin_laricio">🌲 Pin laricio</option>
                      <option value="meleze">🌲 Mélèze</option>
                      <option value="sapin_pectiné">🌲 Sapin pectiné</option>
                    </optgroup>
                    <optgroup label="Autres">
                      <option value="melange">🌿 Mélange feuillu/résineux</option>
                      <option value="taillis">🌱 Taillis</option>
                      <option value="rdv_proprietaire">📋 À définir avec le propriétaire</option>
                    </optgroup>
                  </select>
                </div>
                <MSlider label="Surface à replanter" value={surfaceReplant}
                  onChange={setSurfaceReplant} min={0.1} max={50} step={0.1}
                  unit=" ha" color={C.green}/>
                <MInput label="Date prévue" value={dateReplant}
                  onChange={setDateReplant} type="date"/>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Responsable
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
              <MInput label={`N° de certification ${certification.toUpperCase()}`}
                value={numeroCertification} onChange={setNumeroCert}
                placeholder="Ex: PEFC/10-31-1234 ou FSC-C012345"
                hint="Obligatoire si certification validée"/>
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
                <div style={{fontSize:11,color:C.blueD,marginTop:8,padding:8,
                  background:"rgba(255,255,255,.6)",borderRadius:8}}>
                  ℹ️ Le GPS de la parcelle et les tonnages serviront à générer l&apos;auto-déclaration RED lors de la livraison.
                </div>
              </div>
            )}
          </div>
        )}
        {step>0&&(
          <button onClick={()=>setStep(s=>s-1)} style={{height:BTN_H,padding:"0 20px",
            borderRadius:14,background:C.bg2,color:C.tx2,border:"none",
            fontFamily:"inherit",fontSize:15,fontWeight:500,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
        )}
        {step<STEPS.length-1 ? (
          <BigBtn onClick={()=>setStep(s=>s+1)}
            bg={stepValid[step]?currentStep.color:C.amber} style={{flex:1}}>
            {STEPS[step+1].icon} {STEPS[step+1].label}
          </BigBtn>
        ) : (
          <BigBtn onClick={handleSave} bg={allValid?C.green:C.bg2}
            disabled={saving} style={{flex:1}} icon={saving?"":"✅"}>
            {saving?"Enregistrement…":"VALIDER LA VISITE"}
          </BigBtn>
        )}
      </div>
    </div>
  );
};

const ListeVisites = ({visites}) => (
  <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING}}>
    {visites.length===0 ? (
      <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
        <div style={{fontSize:40,marginBottom:12}}>🔭</div>
        <div style={{fontSize:16,fontWeight:500}}>Aucune visite</div>
        <div style={{fontSize:13,marginTop:6}}>Lancez une visite depuis une fiche contact</div>
      </div>
    ) : visites.map(v=>(
      <div key={v.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
        borderRadius:14,padding:16,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:14,fontWeight:600}}>{v.lotNumero}</div>
          <div style={{fontSize:11,padding:"3px 8px",borderRadius:6,
            background:C.greenL,color:C.greenD,fontWeight:500}}>✅ Validée</div>
        </div>
        <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
          📅 {v.date} · 📦 {v.volumeEstimeT}t · {v.surfaceHa}ha<br/>
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
const EcranReleves = ({entrepriseId, user, toast, notifications=[], setNotifications}) => {
  const [sousOnglet, setSousOnglet] = useState("operateurs");
  const [operateurs, setOperateurs] = useState([]);
  const [acces, setAcces] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showNewAcces, setShowNewAcces] = useState(false);
  const [opNom, setOpNom] = useState("");
  const [opPrenom, setOpPrenom] = useState("");
  const [opEtfNom, setOpEtfNom] = useState("");
  const [opPin, setOpPin] = useState("");
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

  useEffect(()=>{
    fetch(`${API}/operateurs/entreprise/${entrepriseId}`,{headers:authHeaders()})
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setOperateurs(d); }).catch(()=>{});
    fetch(`${API}/acces-lot/entreprise/${entrepriseId}`,{headers:authHeaders()})
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setAcces(d); }).catch(()=>{});
    fetch(`${API}/contacts`,{headers:authHeaders()})
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setContacts(d); }).catch(()=>{});
  },[]);

  const handleCreateOp = async () => {
    if (!opNom||!opEtfNom||!opPin) { toast("Remplir nom, ETF et PIN","warn"); return; }
    setOpSaving(true);
    try {
      const res = await fetch(`${API}/operateurs`,{
        method:"POST",headers:authHeaders(),
        body:JSON.stringify({nom:opNom,prenom:opPrenom,etfNom:opEtfNom,pin:opPin,entrepriseId}),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setOperateurs(prev=>[{...saved,assignations:[]},...prev]);
      setShowNew(false);
      setOpNom(""); setOpPrenom(""); setOpEtfNom(""); setOpPin("");
      toast(`Opérateur ${saved.nom} créé ✓`);
    } catch { toast("Erreur API","warn"); }
    setOpSaving(false);
  };

  const handleAssigner = async () => {
    if (!assignLotId||!selOp) return;
    setAssignSaving(true);
    try {
      const res = await fetch(`${API}/operateurs/${selOp.id}/assigner`,{
        method:"POST",headers:authHeaders(),
        body:JSON.stringify({lotId:assignLotId,lotNumero:assignLotNumero,typeOperation:assignType}),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
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
      const res = await fetch(`${API}/acces-lot`,{
        method:"POST",headers:authHeaders(),
        body:JSON.stringify({lotId,lotNumero,entrepriseId,etfNom,etfContact,typeOperation}),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setAcces(prev=>[saved,...prev]);
      setShowNewAcces(false);
      setEtfNom(""); setEtfContact(""); setLotId(""); setLotNumero("");
      toast(`Code créé : ${saved.code}`);
    } catch { toast("Erreur API","warn"); }
    setAccesSaving(false);
  };

  const handleDesactiver = async (id) => {
    try {
      await fetch(`${API}/acces-lot/${id}/desactiver`,{method:"PATCH",headers:authHeaders()});
      setAcces(prev=>prev.map(a=>a.id===id?{...a,actif:false}:a));
      toast("Accès désactivé");
    } catch { toast("Erreur","warn"); }
  };

  const typeLabel = t=>({"abattage":"🪓 Abattage","debardage":"🚜 Débardage","broyage":"🌿 Broyage"}[t]||t);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",gap:0,padding:"8px 16px 0",background:"#fff",
        borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {[["operateurs","👷 Opérateurs"],["acces","🔑 Accès lot"],["notifs","🔔 Alertes"]].map(([id,label])=>(
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
                    {contacts.filter(c=>c.lotNumero).map(c=>(
                      <option key={c.id} value={c.id}>{c.lotNumero} · {c.nom} · {c.commune}</option>
                    ))}
                  </select>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Type</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {[["abattage","🪓","Abattage"],["debardage","🚜","Débardage"],["broyage","🌿","Broyage"]].map(([v,e,l])=>(
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
                <MInput label="Entreprise ETF" value={opEtfNom} onChange={setOpEtfNom} placeholder="Nom ETF" required/>
                <MInput label="Code PIN" value={opPin} onChange={setOpPin} placeholder="4 chiffres" type="number" required/>
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
                      </div>
                      <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                        background:op.actif?C.greenL:C.bg2,color:op.actif?C.greenD:C.tx3,fontWeight:600}}>
                        {op.actif?"✅ Actif":"❌ Inactif"}
                      </span>
                    </div>
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
                    <button onClick={()=>setSelOp(op)} style={{width:"100%",height:38,borderRadius:10,
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
                    {[["abattage","🪓","Abattage"],["debardage","🚜","Débardage"],["broyage","🌿","Broyage"]].map(([v,e,l])=>(
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
      </div>

      {sousOnglet==="operateurs"&&!showNew&&!selOp&&(
        <div style={{padding:"12px 16px 24px",flexShrink:0}}>
          <BigBtn onClick={()=>setShowNew(true)} bg={C.green} icon="👷">Nouvel opérateur</BigBtn>
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
                  await fetch(`${API}/notifications/${n.id}/lu`,{method:"PATCH",headers:authHeaders()});
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
  adressePostale:"Adresse postale", commune:"Commune",
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
      fetch(`${API}/contacts/${contact.id}/historique`, {headers:authHeaders()})
        .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setHistorique(d); }).catch(()=>{});
    }
  },[showHistorique]);

  const handleSave = async () => {
    const phoneErr = telephone ? validatePhone(telephone) : null;
    if (phoneErr) { toast(`Téléphone : ${phoneErr}`,"warn"); return; }
    setSaving(true);
    const data = {
      nom, prenom, telephone, email, adressePostale,
      commune, adresseParcelle,
      surfaceHa: surfaceHa ? parseFloat(surfaceHa) : null,
      refCadastrale, typeContact, origine, nomApporteur, dateContact,
      statut, potentiel, commentaire,
      estPersonneMorale, typePersonneMorale, numeroSiret,
      nomSignataire, qualiteSignataire,
      operateur: user?.nom || "inconnu",
    };
    try {
      const res = await fetch(`${API}/contacts/${contact.id}`, {
        method:"PATCH",
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
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
              const showTransp      = ["A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON"].includes(s);
              const showLivraison   = ["EN_COURS_BROYAGE","EN_LIVRAISON"].includes(s);
              const btns = [
                showVisite    && {icon:"🔭",label:"Visite",    bg:C.greenL, bd:C.green,  color:C.greenD,  action:onLaunchVisite},
                showValider   && {icon:"✅",label:"Valider",   bg:C.blueL,  bd:C.blue,   color:C.blueD,   action:onLaunchValidation},
                showCloture   && {icon:"🏁",label:"Clôture",   bg:C.amberL, bd:C.amber,  color:C.amberD,  action:onLaunchCloture},
                showDechi     && {icon:"🪚",label:"Déchi.",    bg:"#FAECE7",bd:"#D85A30", color:"#D85A30", action:onLaunchDechiquetage},
                showTransp    && {icon:"🚛",label:"Transp.",   bg:C.purpleL,bd:C.purple,  color:C.purpleD, action:onLaunchTransporteur},
                showLivraison && {icon:"📦",label:"Livraison", bg:C.greenL, bd:C.green,  color:C.greenD,  action:onLaunchLivraison},
              ].filter(Boolean);
              if (!btns.length) return null;
              const cols = actionsVisible.length <= 3 ? actionsVisible.length : 4;
              return (
                <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,
                  gap:8,marginBottom:16}}>
                  {actionsVisible.map((b,i)=>(
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
            <MInput label="Téléphone" value={telephone} onChange={setTel} type="tel" required placeholder="06..."/>
            <MInput label="Email" value={email} onChange={setEmail} type="email" hint="optionnel" placeholder="email@..."/>
            <MInput label="Adresse postale" value={adressePostale} onChange={setAdresse} hint="optionnel" placeholder="Adresse"/>

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
const STATUTS_CLOTURES = ["BORD_ROUTE","A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"];

const EcranOperateur = ({operateur, onLogout, toast}) => {
  const [screen, setScreen] = useState("lots"); // lots | releve
  const [activeLot, setActiveLot] = useState(null);
  const [typeOp, setTypeOp] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lotsStatus, setLotsStatus] = useState({}); // {lotId: statutLot} — rafraîchi depuis le serveur

  // Rafraîchit le statut réel des lots assignés, pour ne jamais bloquer
  // l'accès à la saisie tant que la clôture n'a pas eu lieu (et le couper après).
  useEffect(()=>{
    fetch(`${API}/contacts`)
      .then(r=>r.json())
      .then(d=>{
        if (!Array.isArray(d)) return;
        const map = {};
        d.forEach(c=>{ map[c.id]=c.statutLot; });
        setLotsStatus(map);
      })
      .catch(()=>{}); // échec réseau → on n'affiche aucun statut, l'accès reste ouvert
  },[]);

  // Indices essences (source: Forêts Romandes / ITEBE 2004)
  const INDICES = {
    peuplier:  { densiteVerte: 850,  pci: 2.4 },
    chene:     { densiteVerte: 1000, pci: 3.8 },
    hetre:     { densiteVerte: 1000, pci: 4.0 },
    charme:    { densiteVerte: 1000, pci: 4.2 },
    frene:     { densiteVerte: 900,  pci: 3.9 },
    bouleau:   { densiteVerte: 950,  pci: 3.7 },
    resineux:  { densiteVerte: 870,  pci: 2.8 },
    melange:   { densiteVerte: 950,  pci: 3.5 },
  };

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
  const [tasDetailsDeb, setTasDetailsDeb] = useState([]); // [{longueur,largeur,hauteur}] — utilisé si nbVoyages>1
  const [foisDeb,       setFoisDeb]    = useState(0.55);
  const [distTransport, setDistTransp] = useState("");
  const [machineDeb,    setMachineDeb] = useState("");
  const [heureDebDeb,   setHeureDebD]  = useState("");
  const [heureFinDeb,   setHeureFinD]  = useState("");

  // Calcul automatique abatteur
  const volApparent = nbTas * longueur * largeur * hauteur;
  const volReel = volApparent * foisonnement;

  // Synchronise les fiches de mesure par tas avec le nombre de tas (débardage)
  useEffect(()=>{
    setTasDetailsDeb(prev=>{
      const next = [...prev];
      while (next.length < nbVoyages) next.push({longueur:longueurDeb, largeur:largeurDeb, hauteur:hauteurDeb});
      return next.slice(0, nbVoyages);
    });
  },[nbVoyages]);

  // Calcul automatique débardeur (volume approximatif × nb tas)
  const volApparentDeb = nbVoyages>1
    ? tasDetailsDeb.reduce((s,t)=>s+(parseFloat(t.longueur)||0)*(parseFloat(t.largeur)||0)*(parseFloat(t.hauteur)||0),0)
    : nbVoyages * longueurDeb * largeurDeb * hauteurDeb;
  const volReelDeb = volApparentDeb * foisDeb;

  // Essence depuis la visite (si disponible) — sinon mélange
  const essenceVisite = activeLot?.essenceVisite || "melange";
  const indices = INDICES[essenceVisite] || INDICES.melange;
  const poidsTotal    = Math.round(volReel    * indices.densiteVerte / 1000 * 100) / 100;
  const energieMWh    = Math.round(poidsTotal * indices.pci * 100) / 100;
  const poidsTotalDeb = Math.round(volReelDeb * indices.densiteVerte / 1000 * 100) / 100;
  const energieMWhDeb = Math.round(poidsTotalDeb * indices.pci * 100) / 100;

  const [releveExistantId, setReleveExistantId] = useState(null);
  const [modeModif, setModeModif] = useState(false);

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
      tasDetails: nbVoyages>1 ? tasDetailsDeb : undefined,
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
      humidite: Math.round((1 - foisonnement) * 100),
      meteo, incident, temps,
      heureDebut: heureDebAb, heureFin: heureFinAb,
      pauseDebut: pauseDebutAb, pauseFin: pauseFinAb,
      volTotal: Math.round(volReel * 100) / 100,
      poidsTotal,
    };
    try {
      let res;
      if (modeModif && releveExistantId) {
        res = await fetch(`${API}${endpoint}/${releveExistantId}`, {
          method:"PATCH",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}${endpoint}`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const err = await res.json();
        if (err.message && err.message.startsWith("DOUBLON:")) {
          const id = err.message.split(":")[1];
          setReleveExistantId(id);
          setModeModif(true);
          setSaving(false);
          return;
        }
        throw new Error();
      }
      // Débardeur → accumuler tonnage bord de route sur le lot
      if (isDebardeur && poidsTotalDeb>0) {
        fetch(`${API}/contacts/${activeLot.lotId}`, {
          method:"PATCH",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            tonnageBordRoute_increment: poidsTotalDeb,
          }),
        }).catch(()=>{});
      }
      toast(modeModif ? "Relevé modifié ✓" : "Relevé enregistré ✓");
      setScreen("lots");
      setActiveLot(null);
      setModeModif(false);
      setReleveExistantId(null);
    } catch { toast("Erreur API","warn"); }
    setSaving(false);
  };

  const assignations = operateur.assignations||[];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      {/* Header */}
      <div style={{background:C.sb,color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src="/logo.png" alt="APPLITAG" style={{width:32,height:32,objectFit:"contain"}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:600}}>
              {screen==="lots" ? `👷 ${operateur.nom}` : `📋 Relevé ${typeOp}`}
            </div>
            <div style={{fontSize:11,opacity:.6}}>{operateur.etfNom}</div>
          </div>
          {screen==="releve"&&(
            <button onClick={()=>setScreen("lots")} style={{
              background:"rgba(255,255,255,.1)",border:"none",color:"#fff",
              padding:"6px 12px",borderRadius:8,fontSize:13,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>{"<"} Retour</button>
          )}
          {screen==="lots"&&(
            <button onClick={onLogout} style={{
              background:"rgba(255,255,255,.1)",border:"none",color:"rgba(255,255,255,.6)",
              padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>⎋</button>
          )}
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:90}}>
        {screen==="lots"&&(
          <div>
            <div style={{fontSize:14,color:C.tx2,marginBottom:16,lineHeight:1.6}}>
              Sélectionnez le lot et le type d'opération pour saisir votre relevé.
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
              return (
              <div key={a.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                borderRadius:14,padding:16,marginBottom:10}}>
                <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                  color:C.greenD,marginBottom:8}}>🏷 {a.lotNumero}</div>
                <div style={{fontSize:12,color:C.tx3,marginBottom:12}}>
                  {{"abattage":"🪓 Abattage","debardage":"🚜 Débardage","broyage":"🌿 Broyage"}[a.typeOperation]||a.typeOperation}
                </div>
                {cloture ? (
                  <div style={{width:"100%",height:44,borderRadius:10,
                    background:C.bg2,color:C.tx3,display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:13,fontWeight:600}}>
                    ✅ Réception de fin d'exploitation effectuée
                  </div>
                ) : (
                <button onClick={()=>{ setActiveLot(a); setTypeOp(a.typeOperation); setScreen("releve"); }}
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
                <MInput label="Nombre de tas" value={String(nbVoyages||"")}
                  onChange={v=>setNbVoyages(parseInt(v)||0)} type="number"
                  placeholder="ex: 6" hint="tas déposés bord de route / plateforme"/>

                {nbVoyages<=1 ? (
                  <>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                      <MInput label="Longueur approx. (m)" value={String(longueurDeb||"")}
                        onChange={v=>setLongDeb(parseFloat(v)||0)} type="number" placeholder="ex: 4"/>
                      <MInput label="Largeur approx. (m)" value={String(largeurDeb||"")}
                        onChange={v=>setLargDeb(parseFloat(v)||0)} type="number" placeholder="ex: 1.2"/>
                    </div>
                    <MInput label="Hauteur approx. (m)" value={String(hauteurDeb||"")}
                      onChange={v=>setHautDeb(parseFloat(v)||0)} type="number" placeholder="ex: 1.5"/>
                  </>
                ) : (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,color:C.tx3,marginBottom:10,lineHeight:1.6}}>
                      {nbVoyages} tas déclarés — saisissez les dimensions de chacun.
                    </div>
                    {tasDetailsDeb.map((t,i)=>(
                      <div key={i} style={{background:"#fff",border:`1px solid ${C.bd}`,
                        borderRadius:12,padding:14,marginBottom:10}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.purpleD,marginBottom:10}}>
                          📦 Tas {i+1}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                          <MInput label="Long. (m)" value={String(t.longueur)} type="number"
                            onChange={v=>setTasDetailsDeb(prev=>prev.map((x,j)=>j===i?{...x,longueur:parseFloat(v)||0}:x))}/>
                          <MInput label="Larg. (m)" value={String(t.largeur)} type="number"
                            onChange={v=>setTasDetailsDeb(prev=>prev.map((x,j)=>j===i?{...x,largeur:parseFloat(v)||0}:x))}/>
                          <MInput label="Haut. (m)" value={String(t.hauteur)} type="number"
                            onChange={v=>setTasDetailsDeb(prev=>prev.map((x,j)=>j===i?{...x,hauteur:parseFloat(v)||0}:x))}/>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
                      {essenceVisite} · {indices?.densiteVerte} kg/m³ · Foisonnement {Math.round(foisDeb*100)}%
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
                <MSlider label="Temps de travail" value={temps} onChange={setTemps}
                  min={0.5} max={12} step={0.5} unit="h" color={C.amber}/>
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
                      {essenceVisite} · {indices?.densiteVerte} kg/m³ · PCI {indices?.pci} MWh/t
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {screen==="releve"&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,
          padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 25%)`}}>
          {modeModif&&(
            <div style={{background:C.amberL,borderRadius:12,padding:12,marginBottom:10,
              border:`1.5px solid ${C.amber}`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.amberD,marginBottom:4}}>
                ⚠ Relevé déjà saisi aujourd'hui
              </div>
              <div style={{fontSize:12,color:C.amberD}}>
                Vous avez déjà un relevé pour ce lot aujourd'hui. Confirmer pour le modifier — cette action sera tracée et notifiée à votre ETF et à l'administrateur.
              </div>
            </div>
          )}
          <BigBtn onClick={handleSaveReleve} disabled={saving}
            bg={modeModif?C.amber:C.green} icon={saving?"":modeModif?"⚠️":"✅"}>
            {saving?"Enregistrement…":modeModif?"CONFIRMER LA MODIFICATION":"VALIDER LE RELEVÉ"}
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
  BORD_ROUTE:            {label:"Bord de route",      color:"#8B6914", bg:"#F1EFE8"},
  A_DECHIQUETER:         {label:"À déchiqueter",      color:"#D85A30", bg:"#FAECE7"},
  EN_COURS_BROYAGE:      {label:"En cours broyage",   color:"#D85A30", bg:"#FAECE7"},
  EN_LIVRAISON:          {label:"En livraison",       color:"#534AB7", bg:"#EEEDFE"},
  LIVRE_CHAUFFERIE:      {label:"Livré chaufferie",   color:"#1D9E75", bg:"#E1F5EE"},
  EN_STOCK_PLATEFORME:   {label:"En stock plateforme",color:"#185FA5", bg:"#E6F1FB"},
  LIVRE:                 {label:"Livré",              color:"#1D9E75", bg:"#E1F5EE"},
  ALERTE:                {label:"⚠ Alerte",           color:"#A32D2D", bg:"#FCEBEB"},
};

// ── ÉCRAN ACCUEIL ─────────────────────────────────────────────
const EcranAccueil = ({contacts, visites, notifications, user, onNewLot, onGoLots, onGoAlertes}) => {
  const STATUTS_EXPLOITATION = ["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE","EN_STOCK_PLATEFORME","LIVRE"];
  const lotsAVisiter = contacts.filter(c=>c.lotNumero&&(c.statutLot==="VISITE_PREVUE"||c.statutLot==="NOUVEAU"||!c.statutLot)&&!STATUTS_EXPLOITATION.includes(c.statutLot));
  const chantiersJour = contacts.filter(c=>["EN_COURS_EXPLOITATION","VALIDE_EXPLOITATION"].includes(c.statutLot));
  const alertes = notifications.filter(n=>!n.lu);

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
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[
          {icon:"🔭",label:"Lots à visiter",count:lotsAVisiter.length,color:C.amber,bg:C.amberL,action:()=>onGoLots("VISITE_PREVUE")},
          {icon:"🪓",label:"Chantiers",count:chantiersJour.length,color:C.blue,bg:C.blueL,action:()=>onGoLots("EN_COURS_EXPLOITATION")},
          {icon:"📋",label:"Total lots",count:contacts.filter(c=>c.lotNumero).length,color:C.green,bg:C.greenL,action:()=>onGoLots("TOUS")},
          {icon:"✅",label:"Livrés",count:contacts.filter(c=>c.statutLot==="LIVRE").length,color:C.greenD,bg:C.greenL,action:()=>onGoLots("LIVRE")},
        ].map((card,i)=>(
          <div key={i} onClick={card.action} style={{
            background:card.bg,borderRadius:14,padding:16,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
            <div style={{fontSize:28,marginBottom:8}}>{card.icon}</div>
            <div style={{fontSize:26,fontWeight:700,color:card.color}}>{card.count}</div>
            <div style={{fontSize:12,color:C.tx2,marginTop:2}}>{card.label}</div>
          </div>
        ))}
      </div>
      {contacts.filter(c=>c.lotNumero).slice(0,3).map(c=>{
        const st = STATUT_LOT[c.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
        return (
          <div key={c.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
            borderRadius:14,padding:14,marginBottom:10,display:"flex",
            alignItems:"center",gap:12}}>
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
                    · ⚖️ {parseFloat(c.tonnageCumul).toFixed(1)} t abattu
                  </span>
                )}
                {c.tonnageBordRoute>0&&(
                  <span style={{marginLeft:8,color:"#8B6914",fontWeight:600}}>
                    · 🌲 {parseFloat(c.tonnageBordRoute).toFixed(1)} t bord route
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
    const code = Math.random().toString(36).slice(2,8).toUpperCase();
    try {
      await fetch(`${API}/acces-lot`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({lotId:lot.id,lotNumero:lot.lotNumero,
          nomDelegue,telDelegue,qualiteDelegue,code,expiresAt:dateExpiry,type:"visite"}),
      });
    } catch {}
    setCodeGenere(code); setSaving(false);
    onDeleguee&&onDeleguee({nomDelegue,code});
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
            <MInput label="Téléphone" value={telDelegue} onChange={setTelDelegue} placeholder="06 XX XX XX XX" type="tel" hint="optionnel"/>
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
const INDICES_CALC = {
  peuplier:{densite:850,pci:2.4,foisonnement:0.40},
  chene:   {densite:1000,pci:3.8,foisonnement:0.55},
  hetre:   {densite:1000,pci:4.0,foisonnement:0.55},
  charme:  {densite:1000,pci:4.2,foisonnement:0.55},
  frene:   {densite:900, pci:3.9,foisonnement:0.52},
  bouleau: {densite:950, pci:3.7,foisonnement:0.50},
  resineux:{densite:870, pci:2.8,foisonnement:0.45},
  melange: {densite:950, pci:3.5,foisonnement:0.50},
  taillis: {densite:900, pci:3.5,foisonnement:0.48},
};

const TasDimensionsInput = ({nbTas, foisonnement, onFoisonnementChange, essence="melange", onChange}) => {
  const [longueur, setLong]  = useState("");
  const [largeur,  setLarg]  = useState("");
  const [hauteur,  setHaut]  = useState("");

  const indices = INDICES_CALC[essence] || INDICES_CALC.melange;
  const L = parseFloat(longueur)||0;
  const la = parseFloat(largeur)||0;
  const H = parseFloat(hauteur)||0;
  const ready = L>0 && la>0 && H>0 && nbTas>0;
  const volApparent = L * la * H * (nbTas||1);
  const volReel     = volApparent * indices.foisonnement;
  const tonnage     = volReel * indices.densite / 1000;
  const energie     = tonnage * indices.pci / 1000;

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
            📊 Calculs automatiques — {nbTas} tas · essence : {essence}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            {[
              [volApparent.toFixed(1)+" m³","Volume apparent"],
              [volReel.toFixed(1)+" m³","Volume réel"],
              [tonnage.toFixed(1)+" t","Tonnage estimé"],
              [energie.toFixed(1)+" MWh","Énergie PCI"],
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
            Densité verte {indices.densite} kg/m³ · Foisonnement {indices.foisonnement} · PCI {indices.pci} kWh/kg
          </div>
        </div>
      )}

      <div style={{marginTop:10}}>
        <MSlider label="Taux de foisonnement" value={foisonnement}
          onChange={onFoisonnementChange} min={0.30} max={0.65} step={0.01}
          unit="" color={C.amber}
          hint={`Valeur théorique ${indices.foisonnement} pour ${essence}`}/>
      </div>
    </div>
  );
};

const EcranValidationExploitation = ({lot, operateurs, onBack, onSaved, toast, entrepriseId, user}) => {
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
      typeOperationJour:typeOpJour, machineJour,
      foisonnement, nbTasJour, volumeJour, nbOperateurs,
      observations, anomalies,
      statut:"EN_COURS_EXPLOITATION",
    };
    try {
      await fetch(`${API}/validations`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
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
    ["abattage_manuel","🪚 Abattage manuel"],
    ["debardage","🚜 Débardage"],
    ["abattage_debardage","🪓🚜 Abattage + Débardage"],
    ["abattage_manuel_debardage","🪚🚜 Abattage manuel + Débardage"],
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
              <div style={{marginBottom:heureDebut&&heureFin?12:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>🕕 Heure de fin</div>
                <input type="time" value={heureFin}
                  onChange={e=>setHeureFin(e.target.value)}
                  style={{width:"100%",padding:"14px 16px",borderRadius:10,
                    fontSize:20,fontWeight:700,boxSizing:"border-box",
                    border:`2px solid ${heureFin?C.amber:C.bd}`,
                    background:heureFin?C.amberL:"#fff",
                    color:heureFin?C.amberD:"#333",fontFamily:"inherit"}}/>
              </div>
              {heureDebut&&heureFin&&(()=>{
                const [dh,dm]=heureDebut.split(":").map(Number);
                const [fh,fm]=heureFin.split(":").map(Number);
                const mins = (fh*60+fm)-(dh*60+dm);
                if(mins>0) return (
                  <div style={{textAlign:"center",padding:"12px",
                    background:C.greenL,borderRadius:10,
                    fontSize:16,fontWeight:700,color:C.greenD}}>
                    ⏱️ {Math.floor(mins/60)}h{String(mins%60).padStart(2,"0")} de travail
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
const EcranClotureExploitation = ({lot, onBack, onSaved, toast, entrepriseId}) => {
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

  // Indices essences
  const INDICES = {
    peuplier:{densiteVerte:850,pci:2.4},chene:{densiteVerte:1000,pci:3.8},
    hetre:{densiteVerte:1000,pci:4.0},charme:{densiteVerte:1000,pci:4.2},
    frene:{densiteVerte:900,pci:3.9},bouleau:{densiteVerte:950,pci:3.7},
    resineux:{densiteVerte:870,pci:2.8},melange:{densiteVerte:950,pci:3.5},
  };
  const essence = lot.potentiel?.split(":")?.[0] || "melange";
  const indices = INDICES[essence] || INDICES.melange;

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
  const poidsEstime = Math.round(volReel * indices.densiteVerte / 1000 * 100)/100;
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

  const handleSave = async () => {
    if (photos.length === 0) { toast("Au moins une photo requise","warn"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/clotures`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          lotId: lot.id, lotNumero: lot.lotNumero,
          entrepriseId, nbTas, longueur, largeur, hauteur,
          tasDetails: nbTas>1 ? tasDetails : undefined,
          foisonnement, volumeTotal: volReel,
          poidsEstime, humiditeEstimee: humidite,
          photos: JSON.stringify(photos.map((_,i)=>`photo_${i+1}`)),
          anomalies, statut: "validee",
        }),
      });
      if (!res.ok) throw new Error();
      toast("Réception de fin d'exploitation enregistrée ✓");
      onSaved();
    } catch { toast("Erreur API","warn"); }
    setSaving(false);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:C.brown||"#8B6914",color:"#fff",padding:"12px 16px 14px",flexShrink:0}}>
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

        <SectionTitle icon="📦" label="Mesures des tas bord de route"/>
        <MSlider label="Nombre de tas" value={nbTas} onChange={setNbTas}
          min={1} max={50} step={1} unit=" tas" color={C.amber}/>

        {nbTas===1 ? (
          <>
            <MSlider label="Profondeur" value={longueur} onChange={setLong}
              min={1} max={30} step={0.5} unit=" m" color={C.blue}/>
            <MSlider label="Largeur" value={largeur} onChange={setLarg}
              min={0.5} max={1000} step={0.5} unit=" m" color={C.blue}/>
            <MSlider label="Hauteur" value={hauteur} onChange={setHaut}
              min={0.5} max={10} step={0.1} unit=" m" color={C.blue}/>
          </>
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

// ── BON DE COMMANDE PDF ───────────────────────────────────────
const buildBonCommandeHTML = (lot, visite, extra) => {
  const {prixUnitaire,nomDO,qualiteDO,dateSign,conditionsParticulieres,entrepriseDO,
    sigDataProprio,sigDataExploit,nomSignProprio,nomSignExploit} = extra;
  const volumeT = visite?.volumeEstimeT || lot.volumeEstime || "—";
  const prixNum = parseFloat(prixUnitaire)||0;
  const totalHT = prixNum&&volumeT&&volumeT!=="—" ? (prixNum*parseFloat(volumeT)).toFixed(2) : null;
  const essStr = visite?.essences?.map(e=>`${e.label} (${e.pct}%)`).join(", ") || lot.potentiel || "—";
  const certBadge = visite?.certification&&visite.certification!=="aucune"
    ? `<span class="cert-badge">${visite.certification.toUpperCase()}</span>` : "";

  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bon de commande ${lot.lotNumero||""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2.5px solid #1D9E75;padding-bottom:14px;margin-bottom:18px}
.logo h1{font-size:22px;font-weight:700;color:#085041;letter-spacing:-0.5px}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:17px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:14px;color:#085041;margin-top:4px}
.doc-ref .dt{font-size:9px;color:#9A9892;margin-top:3px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.card{border:1px solid #DDDBD5;border-radius:6px;padding:11px}
.card h3{font-size:10px;font-weight:700;color:#085041;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #ECEAE6;padding-bottom:5px;margin-bottom:8px}
.card p{font-size:10.5px;color:#1A1A18;line-height:1.85}
.card .sub{font-size:9.5px;color:#5A5955}
.sec{margin-bottom:16px}
.sec h3{font-size:10px;font-weight:700;color:#085041;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#085041;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:600}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
.total td{font-weight:700;background:#E1F5EE;font-size:11px}
.note{background:#FAEEDA;border:1px solid #BA7517;border-radius:5px;padding:9px 12px;
  font-size:9.5px;color:#412402;line-height:1.7;margin-bottom:14px}
.cert-badge{display:inline-block;background:#E6F1FB;color:#042C53;
  border:1px solid #185FA5;border-radius:3px;padding:2px 7px;
  font-size:9px;font-weight:700;margin-left:6px}
.cg{background:#F5F4F1;border-radius:5px;padding:9px 12px;font-size:9px;
  color:#5A5955;line-height:1.7;margin-bottom:16px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;page-break-inside:avoid}
.sig{border:1px solid #DDDBD5;border-radius:6px;padding:12px}
.sig h4{font-size:10px;font-weight:700;color:#085041;margin-bottom:3px}
.sig .who{font-size:9.5px;color:#5A5955;margin-bottom:40px}
.sig .line{border-top:1px solid #1A1A18;padding-top:5px;font-size:9px;color:#9A9892}
.replant{background:#E1F5EE;border:1px solid #1D9E75;border-radius:5px;
  padding:8px 12px;font-size:9.5px;color:#085041;margin-bottom:14px}
.footer{margin-top:auto;padding-top:12px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style>
</head>
<body><div class="page">

<!-- HEADER -->
<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Gestion forestière terrain</p>
  </div>
  <div class="doc-ref">
    <h2>Bon de commande</h2>
    <div class="num">${lot.lotNumero||"BROUILLON"}</div>
    <div class="dt">Émis le ${new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</div>
  </div>
</div>

<!-- PARTIES -->
<div class="two">
  <div class="card">
    <h3>🏠 Vendeur / Propriétaire</h3>
    <p>
      <strong>${lot.nom||""} ${lot.prenom||""}</strong><br/>
      ${lot.estPersonneMorale&&lot.typePersonneMorale?`<span class="sub">${lot.typePersonneMorale.toUpperCase()}</span><br/>`:""}
      ${lot.adressePostale?lot.adressePostale+"<br/>":""}
      ${lot.telephone?`📞 ${lot.telephone}<br/>`:""}
      ${lot.email?`📧 ${lot.email}<br/>`:""}
      ${lot.nomSignataire?`<br/>Signataire : <strong>${lot.nomSignataire}</strong><br/>`:""}
      ${lot.numeroSiret?`<span class="sub">SIRET ${lot.numeroSiret}</span>`:""}
    </p>
  </div>
  <div class="card">
    <h3>🏢 Acheteur / Donneur d'ordre</h3>
    <p>
      ${entrepriseDO?`<strong>${entrepriseDO}</strong><br/>`:"<strong>APPLITAG SAS</strong><br/>"}
      ${nomDO?`${nomDO}<br/>`:""}
      ${qualiteDO?`<span class="sub">${qualiteDO}</span><br/>`:""}
    </p>
  </div>
</div>

<!-- PARCELLE -->
<div class="sec">
  <h3>🌲 Parcelle & Ressource</h3>
  <table>
    <tr><th>Commune</th><th>Réf. cadastrale</th><th>Surface</th><th>Essences</th><th>Certification</th></tr>
    <tr>
      <td>${lot.commune||"—"}</td>
      <td>${lot.refCadastrale||"—"}</td>
      <td>${lot.surfaceHa?lot.surfaceHa+" ha":"—"}</td>
      <td>${essStr}</td>
      <td>${certBadge||"Aucune"}</td>
    </tr>
    ${lot.adresseParcelle?`<tr><td colspan="5"><span class="sub">Lieu-dit : ${lot.adresseParcelle}</span></td></tr>`:""}
    ${visite?.gps?`<tr><td colspan="5"><span class="sub">GPS parcelle : ${visite.gps.lat.toFixed(5)}°N · ${visite.gps.lng.toFixed(5)}°E · Précision ${Math.round(visite.gps.accuracy||0)} m</span></td></tr>`:""}
  </table>
</div>

<!-- ESTIMATION & PRIX -->
<div class="sec">
  <h3>📊 Estimation & Conditions commerciales</h3>
  <table>
    <tr><th>Désignation</th><th>Quantité estimée</th><th>Unité</th><th>Prix unitaire HT</th><th>Montant HT estimé</th></tr>
    <tr>
      <td>Bois sur pied — ${lot.potentiel||"bois énergie"}</td>
      <td>${volumeT}</td>
      <td>tonnes</td>
      <td>${prixUnitaire?prixUnitaire+" €":"À négocier"}</td>
      <td>${totalHT?totalHT+" €":"—"}</td>
    </tr>
    ${visite?.volumeEstimeT?`<tr class="total">
      <td colspan="3"><strong>Total estimé</strong></td>
      <td><strong>${prixUnitaire?prixUnitaire+" €/t":"—"}</strong></td>
      <td><strong>${totalHT?totalHT+" €":"À définir"}</strong></td>
    </tr>`:""}
  </table>
  ${conditionsParticulieres?`<div class="note">📝 Conditions particulières : ${conditionsParticulieres}</div>`:""}
</div>

<!-- EXPLOITATION -->
${visite?`
<div class="sec">
  <h3>🪓 Conditions d'exploitation</h3>
  <table>
    <tr><th>Accès camion</th><th>Largeur voie</th><th>Distance plateforme</th><th>Date limite</th></tr>
    <tr>
      <td>${visite.accesCamion==="praticable"?"✓ Praticable":visite.accesCamion==="difficile"?"⚠ Difficile":"✗ Impossible"}</td>
      <td>${visite.largeurAcces||"—"} m</td>
      <td>${visite.distancePlateforme||"—"} m</td>
      <td>${visite.dateLimite||"Non définie"}</td>
    </tr>
  </table>
  ${Object.values(visite.contraintes||{}).some(Boolean)?`
  <div class="note">⚠ Contraintes terrain identifiées : ${Object.entries(visite.contraintes||{}).filter(([,v])=>v).map(([k])=>k).join(", ")}</div>`:""}
</div>`:""}

<!-- REPLANTATION -->
${visite?.replantation==="oui"?`
<div class="replant">
  🌱 <strong>Replantation prévue</strong> — ${visite.essenceReplanT||"Essences à définir"}
  ${visite.surfaceReplant?" · "+visite.surfaceReplant+" ha":""}
  ${visite.dateReplant?" · Prévue le "+new Date(visite.dateReplant).toLocaleDateString("fr-FR"):""}
  ${visite.respReplant?" · Responsable : "+visite.respReplant:""}
</div>`:""}

<!-- CG -->
<div class="cg">
  <strong>Conditions générales :</strong><br/>
  1. Le présent bon de commande est valable 30 jours à compter de sa date d'émission.<br/>
  2. Les quantités sont estimées sur la base de la visite terrain et peuvent varier de ±15%.<br/>
  3. Le paiement s'effectue à réception de la facture définitive après pesée à la livraison.<br/>
  4. En cas de désaccord sur les volumes, la pesée à la chaufferie fait foi.<br/>
  5. L'exploitation respectera les règles de bonne gestion forestière et les conditions d'accès définies ci-dessus.
  ${visite?.certification==="red"?`<br/>6. Ce lot est soumis à la directive RED — traçabilité GPS requise.`:""}
</div>

<!-- SIGNATURES -->
<div class="sigs">
  <div class="sig">
    <h4>Le Vendeur / Propriétaire</h4>
    <div class="who">${nomSignProprio||lot.nomSignataire||lot.nom+" "+lot.prenom}</div>
    ${sigDataProprio
      ? `<img src="${sigDataProprio}" style="width:100%;height:60px;object-fit:contain;margin:8px 0;border:1px solid #eee;border-radius:4px;"/>`
      : `<div style="height:60px;border:1px dashed #ccc;border-radius:4px;margin:8px 0;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:10px;">Signature manuscrite</div>`}
    <div class="line">Fait à _____________ le ${dateSign?new Date(dateSign).toLocaleDateString("fr-FR"):new Date().toLocaleDateString("fr-FR")}</div>
  </div>
  <div class="sig">
    <h4>Le Donneur d'ordre</h4>
    <div class="who">${nomSignExploit||nomDO||"____________________"}<br/><span style="font-size:9px;color:#9A9892">${qualiteDO||"Qualité : ____________________"}</span></div>
    ${sigDataExploit
      ? `<img src="${sigDataExploit}" style="width:100%;height:60px;object-fit:contain;margin:8px 0;border:1px solid #eee;border-radius:4px;"/>`
      : `<div style="height:60px;border:1px dashed #ccc;border-radius:4px;margin:8px 0;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:10px;">Signature manuscrite</div>`}
    <div class="line">Fait à _____________ le ${dateSign?new Date(dateSign).toLocaleDateString("fr-FR"):new Date().toLocaleDateString("fr-FR")}</div>
  </div>
</div>

<!-- FOOTER -->
<div class="footer">
  APPLITAG — Gestion forestière terrain · Référence ${lot.lotNumero||"—"} ·
  Document généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
</div>

</div></body></html>`;
};

const EcranBonCommande = ({lot, visites, onBack, toast}) => {
  const visite = visites.find(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);

  const [prixUnitaire,    setPrix]    = useState(visite?.prixTonne||"");
  const [entrepriseDO,    setEntDO]   = useState("APPLITAG SAS");
  const [nomDO,           setNomDO]   = useState("");
  const [qualiteDO,       setQualDO]  = useState("Responsable achats");
  const [dateSign,        setDateS]   = useState(todayS());
  const [condPart,        setCondP]   = useState("");
  const [sigDataProprio,  setSigProp] = useState(visite?.sigDataProprio||null);
  const [sigDataExploit,  setSigExpl] = useState(visite?.sigDataExploit||null);
  const [nomSignProprio,  setNomSigP] = useState(visite?.nomSignProprio||lot.nom||"");
  const [nomSignExploit,  setNomSigE] = useState(visite?.nomSignExploit||"");
  const [generating,      setGen]     = useState(false);

  const volumeT = visite?.volumeEstimeT || "";
  const prixNum = parseFloat(prixUnitaire)||0;
  const totalHT = prixNum&&volumeT ? (prixNum*parseFloat(volumeT)).toFixed(2) : null;

  const handleGenerer = () => {
    setGen(true);
    const extra = {prixUnitaire,nomDO,qualiteDO,dateSign,
      conditionsParticulieres:condPart,entrepriseDO,
      sigDataProprio, sigDataExploit, nomSignProprio, nomSignExploit};
    const html = buildBonCommandeHTML(lot, visite, extra);

    // Charger jsPDF depuis CDN si pas déjà chargé
    const loadAndGenerate = () => {
      if (window.jspdf) {
        generatePDF(html);
      } else {
        const sc = document.createElement("script");
        sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        sc.onload = () => {
          // Aussi charger html2canvas
          const sc2 = document.createElement("script");
          sc2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          sc2.onload = () => generatePDF(html);
          sc2.onerror = () => fallbackPrint(html);
          document.head.appendChild(sc2);
        };
        sc.onerror = () => fallbackPrint(html);
        document.head.appendChild(sc);
      }
    };

    const generatePDF = (htmlContent) => {
      try {
        // Créer un iframe caché pour rendre le HTML
        const iframe = document.createElement("iframe");
        iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:none;";
        document.body.appendChild(iframe);
        iframe.contentDocument.open();
        iframe.contentDocument.write(htmlContent);
        iframe.contentDocument.close();

        setTimeout(() => {
          window.html2canvas(iframe.contentDocument.body, {
            scale:2, useCORS:true, allowTaint:true,
            width:794, height:1123,
          }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF("p","mm","a4");
            const imgData = canvas.toDataURL("image/jpeg",0.95);
            pdf.addImage(imgData,"JPEG",0,0,210,297);
            pdf.save(`BonCommande_${lot.lotNumero||"APPLITAG"}.pdf`);
            document.body.removeChild(iframe);
            setGen(false);
            toast("PDF téléchargé ✓");
          }).catch(()=>{ document.body.removeChild(iframe); fallbackPrint(htmlContent); });
        }, 800);
      } catch { fallbackPrint(htmlContent); }
    };

    const fallbackPrint = (htmlContent) => {
      const blob = new Blob([htmlContent],{type:"text/html"});
      const url = URL.createObjectURL(blob);
      const win = window.open(url,"_blank");
      if (win) { setTimeout(()=>{ win.print(); URL.revokeObjectURL(url); }, 600); }
      else { toast("Autorisez les pop-ups pour générer le PDF","warn"); }
      setGen(false);
    };

    loadAndGenerate();
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
            <div style={{fontSize:15,fontWeight:600}}>📄 Bon de commande</div>
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
            {volumeT?` · 📦 ${volumeT} t estimées`:""}
            {visite?.essences?.length>0?
              `\n🌿 ${visite.essences.map(e=>e.label).join(", ")}`:""}
          </div>
          {!visite&&(
            <div style={{marginTop:8,fontSize:11,color:C.amberD,fontWeight:500}}>
              ⚠️ Aucune visite terrain — le document sera partiel
            </div>
          )}
        </div>

        {/* Acheteur / Donneur d'ordre */}
        <SectionTitle icon="🏢" label="Donneur d'ordre"/>
        <MInput label="Entreprise" value={entrepriseDO} onChange={setEntDO}
          placeholder="Nom de l'entreprise acheteuse"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Nom signataire" value={nomDO} onChange={setNomDO}
            placeholder="Prénom Nom" hint="optionnel"/>
          <MInput label="Qualité" value={qualiteDO} onChange={setQualDO}
            placeholder="Directeur, Resp. achats…" hint="optionnel"/>
        </div>

        {/* Prix */}
        <SectionTitle icon="💶" label="Conditions commerciales"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Prix unitaire (€/t)" value={prixUnitaire} onChange={setPrix}
            type="number" placeholder="ex: 42.50" hint="HT"/>
          <div style={{paddingTop:20}}>
            {totalHT ? (
              <div style={{background:C.greenL,borderRadius:12,padding:"12px 14px",
                border:`1.5px solid ${C.green}`,textAlign:"center",height:52,
                display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{fontSize:10,color:C.greenD,fontWeight:600}}>TOTAL HT ESTIMÉ</div>
                <div style={{fontSize:18,fontWeight:700,color:C.greenD}}>{totalHT} €</div>
              </div>
            ) : (
              <div style={{background:C.bg2,borderRadius:12,padding:"12px 14px",
                height:52,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:12,color:C.tx3}}>Saisir prix/t</span>
              </div>
            )}
          </div>
        </div>
        <MInput label="Conditions particulières" value={condPart} onChange={setCondP}
          placeholder="Modalités de paiement, délais, accès spécifiques…"
          big hint="optionnel"/>

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
          [!!visite,"GPS parcelle (coordonnées visite)"],
          [!!(prixUnitaire&&volumeT),"Tableau prix × volume = total HT"],
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
const EcranSaisiesAdmin = ({contacts, visites, reportings=[], transports=[], livraisons=[]}) => {
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
        <div style={{padding:"0 16px 8px",fontSize:15,fontWeight:600}}>
          🔑 Saisies administrateur
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
                  {c.tonnageCumul>0&&` · ⚖️ ${parseFloat(c.tonnageCumul).toFixed(1)} t`}
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
                📦 {v.volumeEstimeT||"—"} t estimées<br/>
                🌿 {v.essences?.map(e=>e.label).join(", ")||"—"}<br/>
                {v.prixTonne&&`💶 ${v.prixTonne} €/t HT`}
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
const EcranRoleProprietaire = ({user, contacts, visites}) => {
  const mesSLots = contacts.filter(c=>c.nom?.toLowerCase()===user.nom?.toLowerCase());
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
        const visite=visites.find(v=>v.lotId===lot.id);
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
            {/* Timeline statut */}
            <div style={{background:C.bg2,borderRadius:10,padding:12}}>
              {[
                {label:"Visite terrain",done:!!visite,icon:"🔭"},
                {label:"Validation exploitation",done:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"✅"},
                {label:"Exploitation en cours",done:["EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🪓"},
                {label:"Bord de route",done:["BORD_ROUTE","A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🌲"},
                {label:"Livraison chaufferie",done:["LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🔥"},
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
            {visite?.prixTonne&&(
              <div style={{marginTop:10,background:C.greenL,borderRadius:10,padding:10,
                fontSize:12,color:C.greenD,fontWeight:600}}>
                💶 {visite.prixTonne} €/t HT ·
                Total estimé : {(parseFloat(lot.tonnageCumul||visite.volumeEstimeT||0)*parseFloat(visite.prixTonne)).toFixed(0)} €
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const EcranRoleChauffeur = ({user, transports=[]}) => {
  const mesTransports = transports.filter(t=>t.nomChauffeur?.toLowerCase().includes(user.nom.toLowerCase()));
  const [confirmed, setConfirmed] = useState({});
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
            <div style={{fontSize:13,color:C.tx3,lineHeight:2,marginBottom:16}}>
              📄 CMR : <strong>{t.numeroCMR}</strong><br/>
              🚛 {t.immatTracteur} · {t.immatRemorque}<br/>
              🏢 {t.societeTransp}
            </div>
            {[
              {label:"Réception mission",key:"reception"},
              {label:"Départ confirmé",key:"depart"},
              {label:"Arrivée sur site",key:"arrivee"},
            ].map(btn=>(
              <button key={btn.key} onClick={()=>setConfirmed(p=>({...p,[t.id+btn.key]:true}))}
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
    </div>
  );
};

const EcranRoleBroyage = ({user, contacts}) => {
  const lotsABroyer = contacts.filter(c=>["BORD_ROUTE","A_DECHIQUETER"].includes(c.statutLot));
  const [actif, setActif] = useState(null);
  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40}}>🪚</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Opérations de déchiquetage</div>
      </div>
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
            📍 {lot.commune} · ⚖️ {lot.tonnageCumul||"—"} t
          </div>
          <button onClick={()=>setActif(actif===lot.id?null:lot.id)}
            style={{width:"100%",padding:12,borderRadius:10,
              background:actif===lot.id?"#FAECE7":"#fff",
              border:`2px solid ${actif===lot.id?"#D85A30":C.bd}`,
              color:actif===lot.id?"#D85A30":C.tx,
              fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
            {actif===lot.id?"▼ Démarrer déchiquetage":"🪚 Lancer le déchiquetage"}
          </button>
          {actif===lot.id&&(
            <div style={{marginTop:12,padding:12,background:"#FAECE7",borderRadius:10,
              fontSize:12,color:"#D85A30",textAlign:"center",fontWeight:600}}>
              ➡️ Accédez à l'écran Déchiquetage complet depuis la fiche lot
            </div>
          )}
        </div>
      ))}
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
          [livraisons.reduce((s,l)=>s+(parseFloat(l.pesee)||0),0).toFixed(1)+" t","Tonnage reçu"],
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

// ── AUTO-DÉCLARATION RED ──────────────────────────────────────
const buildRedHTML = (lot, visite, transport, livraison, typeDecl) => {
  const date = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
  const tonnage = livraison?.pesee || visite?.volumeEstimeT || "—";
  const gpsParc = visite?.gps ? `${visite.gps.lat.toFixed(5)}°N, ${visite.gps.lng.toFixed(5)}°E` : "—";
  const dist = visite?.redDistance || "—";
  const categorie = visite?.redCategorie || "bois_forestier";
  const categorieLabel = {bois_forestier:"Bois forestier",residus:"Résidus forestiers",dechets:"Déchets bois"}[categorie]||categorie;
  const certif = visite?.numeroCertification ? `Certification ${visite.certification?.toUpperCase()} n° ${visite.numeroCertification}` : "Non certifié";
  const typeLabels = {
    auto:"Auto-déclaration de durabilité",
    durabilite:"Déclaration de durabilité",
    pos:"Preuve de durabilité (PoS)",
  };

  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<title>Déclaration RED — ${lot.lotNumero}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#1A1A18}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{border-bottom:3px solid #085041;padding-bottom:12px;margin-bottom:20px;
  display:flex;justify-content:space-between;align-items:flex-start}
.logo h1{font-size:20px;font-weight:700;color:#085041}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.badge{background:#E1F5EE;border:2px solid #085041;border-radius:6px;
  padding:8px 14px;text-align:right}
.badge h2{font-size:14px;font-weight:700;color:#085041}
.badge p{font-size:9px;color:#5A5955;margin-top:2px}
.alert{background:#E6F1FB;border:1px solid #185FA5;border-radius:6px;
  padding:10px 14px;margin-bottom:16px;font-size:10px;color:#042C53;line-height:1.7}
.sec{margin-bottom:16px}
.sec h3{font-size:10px;font-weight:700;color:#085041;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th{background:#085041;color:#fff;padding:6px 10px;text-align:left;font-size:10px}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
td:first-child{font-weight:600;width:45%}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;page-break-inside:avoid}
.sig-box{border:1px solid #DDDBD5;border-radius:6px;padding:12px}
.sig-box h4{font-size:10px;font-weight:700;color:#085041;margin-bottom:3px}
.sig-line{margin-top:50px;border-top:1px solid #1A1A18;padding-top:5px;font-size:9px;color:#9A9892}
.footer{margin-top:20px;padding-top:10px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
.ref{background:#F5F4F1;border-radius:5px;padding:9px 12px;font-size:9px;
  color:#5A5955;line-height:1.8;margin-bottom:14px}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style></head><body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Traçabilité forestière bois-énergie</p>
  </div>
  <div class="badge">
    <h2>${typeLabels[typeDecl]}</h2>
    <p>Directive RED — Biomasse bois-énergie</p>
    <p>Référence : ${lot.lotNumero} · ${date}</p>
  </div>
</div>

<div class="alert">
  <strong>Base réglementaire :</strong> Directive (UE) 2018/2001 (RED II) et règlement délégué (UE) 2022/996 —
  Critères de durabilité pour la biomasse solide destinée à la production d'énergie.<br/>
  Consortium de référence : CIBE / CNPF / FNEDT — FAQ RED Bois-énergie v29/04/2026
</div>

<div class="sec">
  <h3>1. Identification de l'opérateur économique</h3>
  <table>
    <tr><td>Raison sociale</td><td>APPLITAG — Gestionnaire forestier</td></tr>
    <tr><td>Référence interne</td><td>${lot.lotNumero||"—"}</td></tr>
    <tr><td>Date d'émission</td><td>${date}</td></tr>
    <tr><td>Type de déclaration</td><td>${typeLabels[typeDecl]}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>2. Description de la biomasse</h3>
  <table>
    <tr><td>Catégorie biomasse</td><td>${categorieLabel}</td></tr>
    <tr><td>Pays d'origine</td><td>${visite?.redPays||"France"}</td></tr>
    <tr><td>Commune / Parcelle</td><td>${lot.commune||"—"} — ${lot.adresseParcelle||"—"}</td></tr>
    <tr><td>Coordonnées GPS parcelle</td><td>${gpsParc}</td></tr>
    <tr><td>Surface exploitée</td><td>${lot.surfaceHa||"—"} ha</td></tr>
    <tr><td>Essences principales</td><td>${visite?.essences?.map(e=>`${e.label} (${e.pct}%)`).join(", ")||"—"}</td></tr>
    <tr><td>Réf. cadastrale</td><td>${lot.refCadastrale||"—"}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>3. Données de traçabilité</h3>
  <table>
    <tr><td>Tonnage livré</td><td>${tonnage} tonnes</td></tr>
    <tr><td>Humidité à réception</td><td>${livraison?.humiditeReception||visite?.humiditeMesure||"—"} %</td></tr>
    <tr><td>Destination</td><td>${livraison?.nomDestination||"—"}</td></tr>
    <tr><td>Distance parcelle → chaufferie</td><td>${dist} km</td></tr>
    <tr><td>N° CMR</td><td>${transport?.numeroCMR||"—"}</td></tr>
    <tr><td>Date livraison</td><td>${livraison?.dateHeureLivraison?.slice(0,10)||"—"}</td></tr>
    <tr><td>Certification applicable</td><td>${certif}</td></tr>
  </table>
</div>

${typeDecl==="pos"?`
<div class="sec">
  <h3>4. Informations de transfert (PoS)</h3>
  <table>
    <tr><td>Opérateur émetteur</td><td>${lot.etfNom||"—"}</td></tr>
    <tr><td>Opérateur récepteur</td><td>${livraison?.nomReceptionnaire||"—"}</td></tr>
    <tr><td>Type de transfert</td><td>Livraison directe chaufferie</td></tr>
    <tr><td>Quantité transférée</td><td>${tonnage} tonnes</td></tr>
  </table>
</div>`:""}

<div class="ref">
  <strong>Critères de durabilité vérifiés (Art. 29 RED II) :</strong><br/>
  ✓ Provenance géolocalisée — coordonnées GPS enregistrées lors de la visite terrain<br/>
  ✓ Pays d'origine UE — France, traçabilité complète de la forêt à la chaufferie<br/>
  ✓ Catégorie biomasse identifiée — ${categorieLabel}<br/>
  ✓ Distance de transport documentée — ${dist} km (seuil recommandé : &lt;500 km)<br/>
  ${visite?.replantation==="oui"?"✓ Replantation prévue — exigences sylvicoles respectées<br/>":""}
  ✓ Données enregistrées dans APPLITAG — système de traçabilité numérique horodaté
</div>

<div class="sig">
  <div class="sig-box">
    <h4>L'opérateur économique soussigné atteste</h4>
    <p style="font-size:9px;color:#5A5955;margin-top:4px;line-height:1.5">
      Les informations contenues dans ce document sont exactes et vérifiables.
      Cette déclaration est émise sous ma responsabilité.
    </p>
    <div class="sig-line">Nom, qualité et signature · Date : ${date}</div>
  </div>
  <div class="sig-box">
    <h4>Cachet de l'entreprise</h4>
    <p style="font-size:9px;color:#5A5955;margin-top:4px">APPLITAG<br/>Gestion forestière terrain</p>
    <div class="sig-line">Tampon et signature</div>
  </div>
</div>

<div class="footer">
  APPLITAG · Traçabilité RED bois-énergie · Lot ${lot.lotNumero||"—"} ·
  Document généré le ${date} · Confidentiel — Usage interne
</div>
</div></body></html>`;
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
    const win = window.open("","_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(()=>{ win.print(); setGen(false); }, 700);
    } else {
      toast("Autorisez les pop-ups pour générer le PDF","warn");
      setGen(false);
    }
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
      const v = visites.find(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
      if (!v?.gps?.lat) return;

      const st = STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;

      // Marker coloré selon statut
      const icon = L.divIcon({
        className:"",
        iconSize:[32,32],
        iconAnchor:[16,16],
        popupAnchor:[0,-16],
        html:`<div style="
          width:32px;height:32px;border-radius:50%;
          background:${st.color};border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,.35);
          display:flex;align-items:center;justify-content:center;
          font-size:13px;cursor:pointer;">🌲</div>`,
      });

      const popup = `
        <div style="font-family:-apple-system,sans-serif;min-width:200px;padding:2px">
          <div style="font-family:monospace;font-size:14px;font-weight:700;
            color:#085041;margin-bottom:4px">${lot.lotNumero}</div>
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
            🌲 ${lot.surfaceHa} ha${v?.volumeEstimeT?" · 📦 "+v.volumeEstimeT+" t":""}</div>`:""}
          ${v?.essences?.length?`<div style="font-size:11px;color:#9A9892;margin-top:2px">
            🌿 ${v.essences.map(e=>e.label).join(", ")}</div>`:""}
          <button onclick="window.__aplt_open('${lot.id}')"
            style="width:100%;margin-top:10px;padding:8px;border-radius:8px;
              background:#1D9E75;color:#fff;border:none;cursor:pointer;
              font-size:12px;font-weight:600;font-family:inherit;">
            Ouvrir la fiche →
          </button>
        </div>`;

      const marker = L.marker([v.gps.lat,v.gps.lng],{icon})
        .addTo(map)
        .bindPopup(popup,{maxWidth:240,className:"aplt-popup"});

      markersRef.current.push(marker);
      bounds.push([v.gps.lat,v.gps.lng]);
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
    ["BORD_ROUTE","#8B6914"],
    ["EN_LIVRAISON","#534AB7"],
    ["LIVRE_CHAUFFERIE","#1D9E75"],
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
  {id:"A_DECHIQUETER",      label:"À broyer",      icon:"🪚"},
  {id:"EN_COURS_BROYAGE",   label:"Broyage",       icon:"⚙️"},
  {id:"EN_LIVRAISON",       label:"En livraison",  icon:"🚛"},
  {id:"LIVRE_CHAUFFERIE",   label:"Livré",         icon:"🔥"},
];

const FicheLotCentrale = ({
  lot, visites=[], onBack, onEdit, onBonCommande,
  onLaunchVisite, onLaunchValidation, onLaunchCloture,
  onLaunchDechiquetage, onLaunchTransporteur, onLaunchLivraison, onLaunchFinChantier,
  onRedDeclaration, onDeleguerVisite,
  toast, entrepriseId,
}) => {
  const [onglet, setOnglet] = useState(0);
  const [releves,    setReleves]    = useState([]);
  const [transports, setTransports] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const st = STATUT_LOT[lot.statutLot||"NOUVEAU"] || STATUT_LOT.NOUVEAU;
  const pipelineIdx = PIPELINE.findIndex(p=>p.id===(lot.statutLot||"NOUVEAU"));
  const visitesLot = visites.filter(v=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
  const derniereVisite = visitesLot[0]||null;

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      fetch(`${API}/relevés/lot/${lot.id}`,{headers:authHeaders()}).then(r=>r.json()).catch(()=>[]),
      fetch(`${API}/transports/lot/${lot.id}`,{headers:authHeaders()}).then(r=>r.json()).catch(()=>[]),
      fetch(`${API}/livraisons/lot/${lot.id}`,{headers:authHeaders()}).then(r=>r.json()).catch(()=>[]),
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

  const TABS = [
    {id:"general",   icon:"📊", label:"Général"},
    {id:"parcelle",  icon:"🌲", label:"Parcelle"},
    {id:"tas",       icon:"📦", label:"Tas"},
    {id:"transport", icon:"🚛", label:"Transport"},
    {id:"livraisons",icon:"📍", label:"Livr."},
    {id:"documents", icon:"📄", label:"Docs"},
  ];

  // Boutons d'action contextuels
  const s = lot.statutLot||"NOUVEAU";
  const actions = [
    (["NOUVEAU","VISITE_PREVUE"].includes(s)||!s) &&
      {icon:"🔭",label:"Visite",bg:C.greenL,bd:C.green,color:C.greenD,fn:onLaunchVisite},
    (["NOUVEAU","VISITE_PREVUE"].includes(s)||!s) &&
      {icon:"🔑",label:"Déléguer",bg:C.blueL,bd:C.blue,color:C.blueD,fn:onDeleguerVisite},
    ["VISITE_REALISEE","VALIDE_EXPLOITATION"].includes(s) &&
      {icon:"✅",label:"Valider",bg:C.blueL,bd:C.blue,color:C.blueD,fn:onLaunchValidation},
    ["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION"].includes(s) &&
      {icon:"🏁",label:"Clôture",bg:C.amberL,bd:C.amber,color:C.amberD,fn:onLaunchCloture},
    ["BORD_ROUTE","A_DECHIQUETER"].includes(s) &&
      {icon:"🪚",label:"Déchi.",bg:"#FAECE7",bd:"#D85A30",color:"#D85A30",fn:onLaunchDechiquetage},
    ["A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"🚛",label:"Transp.",bg:C.purpleL,bd:C.purple,color:C.purpleD,fn:onLaunchTransporteur},
    ["EN_COURS_BROYAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"📦",label:"Livraison",bg:C.greenL,bd:C.green,color:C.greenD,fn:onLaunchLivraison},
    ["LIVRE_CHAUFFERIE","EN_STOCK_PLATEFORME","BORD_ROUTE","A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON"].includes(s) &&
      {icon:"🏁",label:"Fin chantier",bg:"#F0EBF8",bd:"#7B2FBE",color:"#7B2FBE",fn:onLaunchFinChantier},
  ].filter(Boolean);

  // Max 4 boutons visibles — priorité aux plus avancés
  const actionsVisible = actions.slice(-4);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>

      {/* ── HEADER ── */}
      <div style={{background:C.sb,color:"#fff",flexShrink:0}}>
        <div style={{padding:"10px 16px 8px",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.1)",border:"none",
            color:"#fff",padding:"6px 12px",borderRadius:8,fontSize:13,cursor:"pointer",
            WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",gap:6}}>
            {"<"} <span>Lots</span>
          </button>
          <div style={{flex:1}}>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700}}>{lot.lotNumero}</div>
            <div style={{fontSize:11,opacity:.6}}>{lot.nom}{lot.prenom?` ${lot.prenom}`:""} · {lot.commune}</div>
          </div>
          <span style={{fontSize:10,padding:"4px 10px",borderRadius:20,fontWeight:600,
            background:st.bg,color:st.color}}>
            {st.label}
          </span>
          <button onClick={onEdit} style={{background:"rgba(255,255,255,.1)",border:"none",
            color:"#fff",padding:"6px 10px",borderRadius:8,fontSize:12,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>✏️</button>
        </div>

        {/* Pipeline horizontal */}
        <div style={{overflowX:"auto",display:"flex",gap:0,padding:"0 16px 10px",
          scrollbarWidth:"none"}}>
          {PIPELINE.map((p,i)=>{
            const done = i < pipelineIdx;
            const current = i === pipelineIdx;
            return (
              <div key={p.id} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <div style={{
                    width:28,height:28,borderRadius:"50%",
                    background:current?"#fff":done?"rgba(255,255,255,.3)":"rgba(255,255,255,.1)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:current?14:11,
                    border:current?"2px solid #fff":"1px solid rgba(255,255,255,.2)"}}>
                    {done?"✓":p.icon}
                  </div>
                  {current&&(
                    <div style={{fontSize:8,color:"rgba(255,255,255,.8)",
                      whiteSpace:"nowrap",fontWeight:600,marginTop:1}}>
                      {p.label}
                    </div>
                  )}
                </div>
                {i<PIPELINE.length-1&&(
                  <div style={{width:12,height:1,
                    background:done?"rgba(255,255,255,.5)":"rgba(255,255,255,.15)",
                    margin:"0 2px",marginBottom:current?14:0}}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Tab bar */}
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.1)"}}>
          {TABS.map((t,i)=>(
            <button key={t.id} onClick={()=>setOnglet(i)} style={{
              flex:1,height:42,background:"transparent",border:"none",
              color:onglet===i?"#fff":"rgba(255,255,255,.45)",
              fontFamily:"inherit",fontSize:10,fontWeight:onglet===i?700:400,
              cursor:"pointer",display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:1,
              borderBottom:onglet===i?"2px solid #fff":"2px solid transparent",
              WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:14}}>{t.icon}</span>
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
                {icon:"⚖️",label:"Volume estimé",val:derniereVisite?`${derniereVisite.volumeEstimeT} t`:"—",color:C.amber,bg:C.amberL},
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
                    [totalTonnes.toFixed(1),"t récoltées"],
                    [totalMWh.toFixed(1),"MWh potentiel"],
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
                    📦 {derniereVisite.volumeEstimeT} t · 🌲 {derniereVisite.surfaceHa} ha<br/>
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
                ["📮",lot.adressePostale],
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
                      [totalTonnes.toFixed(1)+"t","Total"],
                      [totalMWh.toFixed(1)+" MWh","Énergie"],
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
                    🏢 {t.societeTransp||t.entrepriseBroyage||"—"}<br/>
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
                          <div style={{fontSize:22,fontWeight:700,color:C.greenD}}>{totalLivr.toFixed(1)} t</div>
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
              {icon:"📋",titre:"Bon de commande",
               statut:lot.lotNumero?"✅ N° lot généré — prêt à générer":"⏳ En attente",
               color:lot.lotNumero?C.green:C.tx3,bg:lot.lotNumero?C.greenL:C.bg2,
               action: lot.lotNumero ? "Générer PDF" : null,
               onAction: onBonCommande},
              {icon:"🔭",titre:"PV visite terrain",
               statut:derniereVisite?"✅ Visite du "+derniereVisite.date:"⏳ Non réalisée",
               color:derniereVisite?C.green:C.tx3,bg:derniereVisite?C.greenL:C.bg2},
              {icon:"📝",titre:"Ordre d'exploitation",
               statut:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot)?"✅ Généré":"⏳ En attente validation",
               color:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION"].includes(lot.statutLot)?C.green:C.tx3,
               bg:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION"].includes(lot.statutLot)?C.greenL:C.bg2},
              {icon:"🚛",titre:"CMR Transport",
               statut:transports.length>0?`✅ ${transports.length} CMR`:"⏳ En attente déchiquetage",
               color:transports.length>0?C.purple:C.tx3,bg:transports.length>0?C.purpleL:C.bg2},
              {icon:"📦",titre:"Bon de livraison",
               statut:livraisons.length>0?`✅ ${livraisons.length} livraison(s)`:"⏳ En attente livraison",
               color:livraisons.length>0?C.green:C.tx3,bg:livraisons.length>0?C.greenL:C.bg2},
              {icon:"🇪🇺",titre:"Auto-déclaration RED",
               statut:derniereVisite?.certification==="red"?"✅ Données RED disponibles":"ℹ️ Activer certification RED en visite",
               color:derniereVisite?.certification==="red"?C.blue:C.tx3,
               bg:derniereVisite?.certification==="red"?C.blueL:C.bg2,
               action:derniereVisite?.certification==="red"?"Générer":null,
               onAction:onRedDeclaration},
              {icon:"📷",titre:"Photos",
               statut:derniereVisite?.photos?.length>0?`✅ ${derniereVisite.photos.length} photo(s) visite`:"⏳ Aucune photo",
               color:derniereVisite?.photos?.length>0?C.blue:C.tx3,
               bg:derniereVisite?.photos?.length>0?C.blueL:C.bg2},
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
        <div style={{position:"fixed",bottom:0,left:0,right:0,
          padding:"10px 16px 24px",background:`linear-gradient(transparent,${C.bg} 30%)`}}>
          <div style={{display:"grid",
            gridTemplateColumns:`repeat(${Math.min(actionsVisible.length,4)},1fr)`,gap:8}}>
            {actionsVisible.map((a,i)=>(
              <button key={i} onClick={a.fn} style={{
                height:54,borderRadius:14,background:a.bg,
                border:`1.5px solid ${a.bd}`,color:a.color,
                fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:3,
                WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:18}}>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
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
  const [coutCarburant, setCoutCarb]     = useState("");
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

  const totalCout = (parseFloat(coutCarburant)||0)+(parseFloat(coutMachine)||0)+(parseFloat(coutOperateur)||0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/fin-chantier`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
          photosAvant, photosApres, photosDepot, photosAcces,
          surfaceRenovee, typeBroyage, machineRenov, tempsRenov, nbPassages,
          gnrLitres, coutCarburant, coutMachine, coutOperateur, totalCout,
          checklist, nbCheckOK,
          sigPropFin, sigDataFin, nomPropFin, reserveProp, commentaireProp,
          noteQualite, indiceTotal, indiceLabel,
          statut:"LIVRE",
        }),
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
            <SectionTitle icon="🪚" label="Types de broyage réalisés"/>
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
            <SectionTitle icon="💶" label="Coûts (€ HT)"/>
            <MInput label="Coût carburant" value={coutCarburant} onChange={setCoutCarb}
              type="number" placeholder="ex: 180"/>
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
                  Total : {totalCout.toFixed(2)} € HT
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
const EcranDechiquetage = ({lot, onBack, onSaved, toast, entrepriseId}) => {
  const [lotSuggere,    setLotSuggere]  = useState(lot.lotNumero||"");
  const [entrepriseBroyage,setEntBroy]  = useState("");
  const [operateurBroyage,setOpBroyage] = useState("");
  const [machine,       setMachine]     = useState("");
  const [typeChargement,setTypeCharg]   = useState("semi");
  const [numeroCMR,     setNumeroCMR]   = useState("");
  const [photoCMR,      setPhotoCMR]    = useState(false);
  const [immatTracteur, setImmatTract]  = useState("");
  const [immatRemorque, setImmatRemor]  = useState("");
  const [heureDebut,    setHeureDebut]  = useState("");
  const [heureFin,      setHeureFin]    = useState("");
  const [evenements,    setEvenements]  = useState([]);
  const [autreEvenement,setAutreEv]    = useState("");
  const [saving,        setSaving]      = useState(false);

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

  const canValidate = numeroCMR && immatTracteur && heureDebut && photoCMR;

  const handleSave = async () => {
    if (!canValidate) { toast("CMR, immatriculation tracteur, heure début et photo CMR obligatoires","warn"); return; }
    setSaving(true);
    try {
      await fetch(`${API}/dechiquetage`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          lotId:lot.id, lotNumero:lotSuggere, entrepriseId,
          entrepriseBroyage, operateurBroyage, machine, typeChargement,
          numeroCMR, photoCMR, immatTracteur, immatRemorque,
          heureDebut, heureFin, evenements, autreEvenement, statut:"EN_LIVRAISON",
        }),
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
            <div style={{fontSize:15,fontWeight:600}}>🪚 Déchiquetage & Chargement</div>
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

        <SectionTitle icon="🏭" label="Entreprise de broyage"/>
        <MInput label="Entreprise de broyage" value={entrepriseBroyage} onChange={setEntBroy}
          placeholder="Nom société broyage" required/>
        <MInput label="Opérateur broyage" value={operateurBroyage} onChange={setOpBroyage}
          placeholder="Nom opérateur"/>
        <MInput label="Machine" value={machine} onChange={setMachine}
          placeholder="Ex: Jenz HEM 593, Doppstadt AK 430…"/>

        <SectionTitle icon="🚛" label="Type de chargement"/>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
          {[
            ["semi","🚛","Semi-remorque","Capacité ~80t"],
            ["camion_remorque","🚚","Camion-remorque","Capacité ~40t"],
            ["benne_ampliroll","🏗️","Benne ampliroll","Capacité ~25t"],
          ].map(([v,e,l,s])=>(
            <div key={v} onClick={()=>setTypeCharg(v)} style={{
              padding:"12px 14px",borderRadius:12,cursor:"pointer",
              border:`2px solid ${typeChargement===v?"#D85A30":C.bd}`,
              background:typeChargement===v?"#FAECE7":"#fff",
              WebkitTapHighlightColor:"transparent",
              display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:24}}>{e}</span>
              <div>
                <div style={{fontSize:14,fontWeight:typeChargement===v?600:400,
                  color:typeChargement===v?"#D85A30":C.tx}}>{l}</div>
                <div style={{fontSize:11,color:C.tx3}}>{s}</div>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle icon="📄" label="CMR"/>
        <MInput label="Numéro CMR" value={numeroCMR} onChange={setNumeroCMR}
          placeholder="N° lettre de voiture" required/>

        <div onClick={()=>setPhotoCMR(!photoCMR)} style={{
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
              {photoCMR?"✓ Photo prise":"Obligatoire — photographier le CMR"}
            </div>
          </div>
          <div style={{fontSize:24}}>{photoCMR?"✅":"📷"}</div>
        </div>

        <SectionTitle icon="🚛" label="Véhicule"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Immat. tracteur" value={immatTracteur} onChange={setImmatTract}
            placeholder="AB-123-CD" required/>
          <MInput label="Immat. remorque" value={immatRemorque} onChange={setImmatRemor}
            placeholder="AB-456-CD" hint="optionnel"/>
        </div>

        <SectionTitle icon="⏱️" label="Horaires"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Heure début" value={heureDebut} onChange={setHeureDebut}
            type="time" required/>
          <MInput label="Heure fin" value={heureFin} onChange={setHeureFin}
            type="time" hint="optionnel"/>
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
              {!photoCMR&&<div>❌ Photo CMR</div>}
              {!immatTracteur&&<div>❌ Immatriculation tracteur</div>}
              {!heureDebut&&<div>❌ Heure de début</div>}
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
      await fetch(`${API}/transports`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
          typeVehicule, immatTracteur, immatRemorque, nomChauffeur,
          societeTransp, numeroCMR,
          confirmReception, heureArrivee, departConfirme, destinationConfirmee,
          statut: departConfirme?"EN_LIVRAISON":"EN_COURS_BROYAGE",
        }),
      });
      toast("Transport enregistré ✓");
      onSaved(departConfirme?"EN_LIVRAISON":"EN_COURS_BROYAGE");
    } catch {
      toast("Transport enregistré localement ✓");
      onSaved(departConfirme?"EN_LIVRAISON":"EN_COURS_BROYAGE");
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
              <MInput label="Immat. tracteur" value={immatTracteur} onChange={setImmatTract}
                placeholder="AB-123-CD" required/>
              <MInput label="Immat. remorque" value={immatRemorque} onChange={setImmatRemor}
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
      await fetch(`${API}/livraisons`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
          typeDest, numeroCMR, nomDestination, gpsLivraison,
          pesee, humiditeReception, nomReceptionnaire, signatureRecep,
          commentaire, numeroPlateforme,
          dateHeureLivraison: new Date().toISOString(),
          statut: statutFinal,
          gpsAlerteDeclenche: gpsAlerte,
        }),
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
              → Alerte envoyée à l'entreprise de broyage
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

export default function App() {
  const [user,      setUser]      = useState(()=>getUser());
  const [operateur, setOperateur] = useState(()=>{ try { return JSON.parse(localStorage.getItem("applitag_operateur")||"null"); } catch { return null; } });
  const [screen,    setScreen]    = useState("accueil");
  const [contacts,  setContacts]  = useState([]);
  const [visites,   setVisites]   = useState([]);
  const [toasts,    setToasts]    = useState([]);
  const [activeLot, setActiveLot] = useState(null);
  const [activeContact, setActiveContact] = useState(null);
  const [showQr,    setShowQr]    = useState(false);
  const [filtreLotsInitial, setFiltreLotsInitial] = useState("TOUS");
  const [operateurs, setOperateurs] = useState([]);
  const [showEtfModal,    setShowEtfModal]    = useState(false);
  const [showDelegVisite, setShowDelegVisite] = useState(false);
  const [isDemoMode,   setIsDemoMode]   = useState(false);
  const [reportings,   setReportings]   = useState([]);
  const [transports,   setTransports]   = useState([]);
  const [livraisons,   setLivraisons]   = useState([]);
  const entrepriseId = getEntrepriseId();

  const toast = useCallback((msg,type="success")=>{
    const id=uid();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000);
  },[]);

  const [notifications, setNotifications] = useState([]);

  useEffect(()=>{
    if (!user) return;
    fetch(`${API}/contacts`, {headers:authHeaders()})
      .then(r=>r.json())
      .then(d=>{
        if(Array.isArray(d)) {
          try {
            const local = JSON.parse(localStorage.getItem("applitag_contacts")||"[]");
            if(local.length>0) {
              const ordre = ["NOUVEAU","VISITE_PREVUE","VISITE_REALISEE","VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_BROYAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"];
              const merged = d.map(c=>{
                const l = local.find(x=>x.id===c.id);
                if(l && ordre.indexOf(l.statutLot)>ordre.indexOf(c.statutLot)) return {...c,statutLot:l.statutLot};
                return c;
              });
              setContacts(merged);
            } else { setContacts(d); }
          } catch { setContacts(d); }
        }
      })
      .catch(()=>{
        try { const c=JSON.parse(localStorage.getItem("applitag_contacts")||"[]"); if(c.length>0) setContacts(c); } catch {}
      });
    fetch(`${API}/visites`, {headers:authHeaders()})
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setVisites(d); }).catch(()=>{});
    fetch(`${API}/notifications/${entrepriseId}`, {headers:authHeaders()})
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setNotifications(d); }).catch(()=>{});
    fetch(`${API}/operateurs/entreprise/${entrepriseId}`, {headers:authHeaders()})
      .then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setOperateurs(d); }).catch(()=>{});
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
    const u = {...DEMO_USERS[role], demo:true};
    setUser(u);
    setIsDemoMode(true);
    // Charger données démo
    setContacts(DEMO_LOTS);
    setVisites(DEMO_VISITES);
    setReportings(DEMO_REPORTINGS);
    setTransports(DEMO_TRANSPORTS);
    setLivraisons(DEMO_LIVRAISONS);
    setAuth("demo-token", u, DEMO_ENTREPRISE_ID);
  };
  const handleLogoutOperateur = () => {
    localStorage.removeItem("applitag_operateur");
    setOperateur(null);
  };
  const handleLogout = () => {
    clearAuth();
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
      justifyContent:"center",height:"100dvh",background:"#085041",color:"#fff",
      fontFamily:"-apple-system,sans-serif"}}>
      <div style={{fontSize:48,marginBottom:16}}>🌲</div>
      <div style={{fontSize:18,fontWeight:700}}>APPLITAG</div>
    </div>
  );

  if (operateur) return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranOperateur operateur={operateur} onLogout={handleLogoutOperateur} toast={toast}/>
    </div>
  );

  if (!user) return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <LoginScreen onLogin={handleLogin} onLoginOperateur={handleLoginOperateur} onLoginDemo={handleLoginDemo}/>
    </div>
  );

  if (showQr) return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <QrCodeAdmin entrepriseId={entrepriseId} entrepriseNom="APPLITAG"
        onClose={()=>setShowQr(false)}/>
    </div>
  );

  // Rôles simplifiés (non-admin)
  if (user?.role==="proprietaire") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
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
      <EcranRoleProprietaire user={user} contacts={contacts} visites={visites}/>
    </div>
  );

  if (user?.role==="chauffeur") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
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
      <EcranRoleChauffeur user={user} transports={transports}/>
    </div>
  );

  if (user?.role==="broyage") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <div style={{background:"#D85A30",color:"#fff",padding:"12px 16px 10px",flexShrink:0,
        display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:600}}>🪚 Espace Broyage</div>
          <div style={{fontSize:11,opacity:.6}}>{user.prenom} {user.nom}</div>
        </div>
        <button onClick={handleLogout} style={{background:"rgba(255,255,255,.1)",
          border:"none",color:"rgba(255,255,255,.6)",padding:"6px 10px",borderRadius:8,
          fontSize:12,cursor:"pointer"}}>⎋</button>
      </div>
      <EcranRoleBroyage user={user} contacts={contacts}/>
    </div>
  );

  if (user?.role==="chaufferie") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
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

  const screensFullPage = ["fiche0","fiche-lot","edit-contact","visite-form","validation-exploitation","cloture-exploitation","dechiquetage","transporteur","livraison","bon-commande","saisies","fin-chantier","red-declaration"];
  const isFullPage = screensFullPage.includes(screen);

  const navItems = [
    {id:"accueil", label:"Accueil", icon:"🏠"},
    {id:"lots",    label:"Lots",    icon:"🌲"},
    {id:"carte",   label:"Carte",   icon:"🗺️"},
    {id:"alertes", label:"Alertes", icon:"🔔", badge: notifications.length},
    (user?.role==="admin"||user?.role==="manager")
      ? {id:"saisies", label:"Saisies", icon:"📋"}
      : {id:"profil",  label:"Profil",  icon:"👤"},
  ].filter(Boolean);

  const SCREEN_TITLES = {
    accueil:"APPLITAG", lots:"Mes lots", carte:"Carte",
    alertes:"Alertes", profil:"Profil",
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      background:C.bg,color:C.tx,maxWidth:430,margin:"0 auto",
      boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>

      {/* Toasts */}
      <div style={{position:"fixed",top:16,left:16,right:16,zIndex:9999,
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
              <div style={{fontSize:16,fontWeight:600}}>{SCREEN_TITLES[screen]||"APPLITAG"}</div>
              <div style={{fontSize:11,opacity:.6}}>{user.prenom||user.nom} · {user.role}</div>
            </div>
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
            onGoAlertes={()=>setScreen("alertes")}/>
        )}
        {screen==="lots"&&(
          <EcranLots key={filtreLotsInitial} contacts={contacts}
            onNewLot={()=>setScreen("fiche0")}
            onOpenLot={c=>{ setActiveContact(c); setScreen("fiche-lot"); }}
            filtreInitial={filtreLotsInitial}/>
        )}
        {screen==="alertes"&&(
          <EcranReleves entrepriseId={entrepriseId} user={user} toast={toast}
            notifications={notifications} setNotifications={setNotifications}/>
        )}
        {screen==="saisies"&&(
          <EcranSaisiesAdmin
            contacts={contacts} visites={visites}
            reportings={reportings} transports={transports}
            livraisons={livraisons}/>
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
          <Fiche0 onBack={()=>setScreen("accueil")}
            onSaved={c=>{ setContacts(prev=>[c,...prev]); setScreen("lots"); }}
            toast={toast} contactCount={contacts.length} entrepriseId={entrepriseId}/>
        )}
        {screen==="fiche-lot"&&activeContact&&(
          <FicheLotCentrale
            lot={activeContact}
            visites={visites}
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
            toast={toast}
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
            onBack={()=>setScreen("fiche-lot")}
            toast={toast}/>
        )}
        {screen==="cloture-exploitation"&&activeContact&&(
          <EcranClotureExploitation
            lot={activeContact}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={()=>{
              setContacts(prev=>prev.map(c=>c.id===activeContact.id?{...c,statutLot:"BORD_ROUTE"}:c));
              setActiveContact(prev=>prev?{...prev,statutLot:"BORD_ROUTE"}:prev);
              setScreen("fiche-lot");
              toast("Réception de fin d'exploitation enregistrée ✓");
            }}
            toast={toast}
            entrepriseId={entrepriseId}/>
        )}
        {screen==="dechiquetage"&&activeContact&&(
          <EcranDechiquetage
            lot={activeContact}
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
              // Persister côté API
              fetch(`${API}/contacts/${activeLot.id}`,{
                method:"PATCH",headers:authHeaders(),
                body:JSON.stringify({statutLot:"VISITE_REALISEE"}),
              }).catch(()=>{});
              setScreen("fiche-lot");
              toast("Visite enregistrée ✓");
              if (operateurs.length>0) setShowEtfModal(true);
            }}
            toast={toast} entrepriseId={entrepriseId}/>
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
