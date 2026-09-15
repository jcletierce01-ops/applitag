// ============================================================
// APPLITAG MOBILE — Auth QR + PIN + Multi-tenant
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { IS_DEMO_BUILD } from "./config/env.js";
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
import { C, FONT_TITLE, FONT_BODY, PADDING } from "./design-system/tokens.js";
import { uid } from "./shared/utils.js";
import { getUser, getEntrepriseId, setAuth, clearAuth } from "./services/auth.service.js";
import { deletedLotsGet, deletedLotsAdd } from "./domains/lots/local-storage.js";
import { comptesLocalGet } from "./domains/connect/local-storage.js";
import { countPendingSync, resyncPendingRecords } from "./domains/sync/legacy-sync.js";
import { apiGet, apiPost, apiDelete } from "./services/api.service.js";
import { BigBtn, SectionTitle } from "./shared/ui.jsx";
import { FormulaireVisite } from "./domains/visites/FormulaireVisite.jsx";
import { EcranDashboardPC } from "./domains/dashboard/EcranDashboardPC.jsx";
import { FicheLotCentrale, EcranFinChantier, EcranDechiquetage, EcranTransporteur, EcranLivraison } from "./domains/lots/LotScreens.jsx";
import { EcranRoleMandataire, EcranRoleProprietaire, EcranRoleChauffeur, EcranRoleDechiquetage, EcranEntrepriseSollicitee, EcranRoleChaufferie, EcranRoleReceptionnaire, EcranAutoDeclarationRED, EcranCarte, EcranRoleCollectivite, EcranRoleBET, EcranRoleETF, EcranRoleAssociation, EcranRoleInstitutionnel, EcranRoleFinanceur, EcranRoleLogistique, EcranRoleGestionnaire, EcranRoleScierie } from "./domains/roles/RoleScreens.jsx";
import { QrCodeAdmin, EcranReleves, EcranOperateur, EcranAccueil, EcranDelegations, Fiche0, Fiche0Edit } from "./domains/screens/MobileScreens.jsx";
import { EcranLots, ModalDelegationVisite, ModalSuggestionETF, EcranValidationExploitation, EcranClotureExploitation, EcranBonCommande, EcranSaisiesAdmin } from "./domains/exploitation/ExploitationScreens.jsx";
import { LoginScreen } from "./domains/auth/LoginScreen.jsx";
import { EcranProfilEntreprise } from "./domains/entreprise/EcranProfilEntreprise.jsx";

export default function App() {
  const [user,      setUser]      = useState<any>(()=>getUser());
  const [operateur, setOperateur] = useState<any>(()=>{ try { return JSON.parse(localStorage.getItem("applitag_operateur")||"null"); } catch { return null; } });
  const [screen,    setScreen]    = useState("accueil");
  const [fiche0Prefill, setFiche0Prefill] = useState<any>(null);
  const [roleChoisi, setRoleChoisi] = useState<any>(null);
  const [contacts,  setContacts]  = useState<any[]>(()=>getUser()?.demo ? DEMO_LOTS : []);
  const [visites,   setVisites]   = useState<any[]>(()=>getUser()?.demo ? DEMO_VISITES : []);
  const [toasts,    setToasts]    = useState<{ id: string; msg: string; type: string }[]>([]);
  const [activeLot, setActiveLot] = useState<any>(null);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [showQr,    setShowQr]    = useState(false);
  const [filtreLotsInitial, setFiltreLotsInitial] = useState("TOUS");
  const [operateurs, setOperateurs] = useState<any[]>([]);
  const [showEtfModal,    setShowEtfModal]    = useState(false);
  const [showDelegVisite, setShowDelegVisite] = useState(false);
  const [isDemoMode,   setIsDemoMode]   = useState(()=>!!(getUser()?.demo));
  const [reportings,   setReportings]   = useState<any[]>(()=>getUser()?.demo ? DEMO_REPORTINGS : []);
  const [transports,   setTransports]   = useState<any[]>(()=>getUser()?.demo ? DEMO_TRANSPORTS : []);
  const [livraisons,   setLivraisons]   = useState<any[]>(()=>getUser()?.demo ? DEMO_LIVRAISONS : []);
  const [dechiquetages,setDechiquetages] = useState<any[]>(()=>getUser()?.demo ? DEMO_DECHIQUETAGES : []);
  const [avisArrivee,  setAvisArrivee]   = useState<any>(()=>{try{const s=sessionStorage.getItem("applitag_avis_arrivee");return s?JSON.parse(s):{}}catch{return{}}});
  const [camionsPartis,setCamionsPartis] = useState<any>(()=>{try{const s=sessionStorage.getItem("applitag_camions_partis");return s?JSON.parse(s):{}}catch{return{}}});
  const [gpsChantier,  setGpsChantier]  = useState<any>({}); // {[lotId]: {lat,lng,heure}}
  const entrepriseId = getEntrepriseId();

  // Bascule vers le tableau de bord desktop (admin) sur grand écran
  const [forcePCView, setForcePCView] = useState(()=>{ try{return localStorage.getItem("applitag_force_pc")==="1";}catch{return false;} });
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

  const toast = useCallback((msg: string, type = "success")=>{
    const id=uid();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000);
  },[]);

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(()=>{
    if (!user || isDemoMode) return;
    apiGet(`/contacts`)
      .then(d=>{
        if(Array.isArray(d)) {
          try {
            const deleted = deletedLotsGet();
            const filtered = d.filter((c: any)=>!deleted.includes(c.id));
            const local = JSON.parse(localStorage.getItem("applitag_contacts")||"[]");
            if(local.length>0) {
              const ordre = ["NOUVEAU","VISITE_PREVUE","VISITE_REALISEE","VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"];
              const merged = filtered.map((c: any)=>{
                const l = local.find((x: any)=>x.id===c.id);
                if(l && ordre.indexOf(l.statutLot)>ordre.indexOf(c.statutLot)) return {...c,statutLot:l.statutLot};
                return c;
              });
              setContacts(merged);
            } else { setContacts(filtered); }
          } catch { setContacts(d); }
        }
      })
      .catch(()=>{
        try { const c=JSON.parse(localStorage.getItem("applitag_contacts")||"[]"); if(c.length>0) setContacts(c); } catch { /* noop */ }
      });
    apiGet(`/visites`).then(d=>{ if(Array.isArray(d)) setVisites(d); }).catch(()=>{});
    apiGet(`/notifications/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setNotifications(d); }).catch(()=>{});
    apiGet(`/operateurs/entreprise/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setOperateurs(d); }).catch(()=>{});
    apiGet(`/reportings`).then(d=>{ if(Array.isArray(d)) setReportings(d); }).catch(()=>{});
    apiGet(`/transports`).then(d=>{ if(Array.isArray(d)) setTransports(d); }).catch(()=>{});
    apiGet(`/livraisons`).then(d=>{ if(Array.isArray(d)) setLivraisons(d); }).catch(()=>{});
    apiGet(`/dechiquetage`).then(d=>{ if(Array.isArray(d)) setDechiquetages(d); }).catch(()=>{});
  },[user, entrepriseId, isDemoMode]);

  const refreshLivraisons = useCallback(()=>{
    if (!isDemoMode) apiGet("/livraisons").then(d=>{ if(Array.isArray(d)) setLivraisons(d); }).catch(()=>{});
  }, [isDemoMode]);

  const [transitioning, setTransitioning] = useState(false);

  // Auto-save contacts to localStorage
  useEffect(()=>{
    if(contacts.length>0 && !isDemoMode) {
      try { localStorage.setItem("applitag_contacts", JSON.stringify(contacts)); } catch { /* noop */ }
    }
  },[contacts, isDemoMode]);

  const handleLogin = (u: any) => {
    setTransitioning(true);
    setUser(u);
    setTimeout(()=>setTransitioning(false), 50);
  };
  const handleLoginOperateur = (op: any) => {
    setOperateur(op);
    try { localStorage.setItem("applitag_operateur", JSON.stringify(op)); } catch { /* noop */ }
  };
  const handleLoginDemo = (role: string) => {
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
    setAuth("demo-token", u, DEMO_ENTREPRISE_ID ?? "");
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
    document.querySelectorAll('[data-scrollable]').forEach(el=>{ (el as HTMLElement).scrollTop=0; });
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
        onUpdateOperateur={(op: any)=>{ setOperateur(op); try{localStorage.setItem("applitag_operateur",JSON.stringify(op));} catch { /* noop */ } }}/>
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
    const ROLE_INFO: Record<string, {icon: string; label: string; desc: string}> = {
      admin:        {icon:"⚙️", label:"Administration",      desc:"Gestion complète de l'application"},
      manager:      {icon:"📊", label:"Manager",              desc:"Supervision et rapports"},
      proprietaire: {icon:"🏠", label:"Espace Propriétaire",  desc:"Mes lots et suivis"},
      mandataire:   {icon:"🤝", label:"Mandataire",           desc:"Visites terrain déléguées"},
      operateur:    {icon:"👷", label:"Opérateur terrain",    desc:"Saisies et opérations"},
      dechiquetage: {icon:"🔧", label:"Déchiquetage",         desc:"Chantiers à traiter"},
      chauffeur:    {icon:"🚛", label:"Chauffeur",            desc:"Transports assignés"},
      chaufferie:      {icon:"🏭", label:"Chaufferie",           desc:"Livraisons reçues"},
      collectivite:    {icon:"🏛️", label:"Collectivité",         desc:"Suivi chaufferies & RED"},
      bet:             {icon:"📐", label:"Bureau d'études",       desc:"Études & plans de gestion"},
      etf:             {icon:"🪓", label:"ETF",                   desc:"Travaux forestiers"},
      association:     {icon:"🤝", label:"Interprofession",       desc:"Filière & membres"},
      institutionnel:  {icon:"🏛️", label:"Institutionnel",        desc:"Dossiers DDT/DRAAF"},
      financeur:       {icon:"💶", label:"Financeur",             desc:"Projets & indicateurs"},
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
          {tousRoles.map((r: any)=>{
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
          onSaved={(v: any)=>{
            setVisites(prev=>[v,...prev]);
            setContacts(prev=>prev.map((c: any)=>c.id===activeLot.id?{...c,statutLot:"VISITE_REALISEE"}:c));
            apiPost(`/contacts/${activeLot.id}/transition`, {action:"validerVisite"}).catch(()=>{});
            setScreen("mandataire-lots"); setActiveLot(null);
            toast("Visite enregistrée ✓");
          }}
          toast={toast} entrepriseId={entrepriseId} user={user}/>
      ) : (
        <EcranRoleMandataire user={user} contacts={contacts} onSelectLot={(lot: any)=>{
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
        _contactCount={contacts.length}
        entrepriseId={entrepriseId}
        prefill={user ? ({
          nom:       user.nom       ?? "",
          prenom:    user.prenom    ?? "",
          telephone: user.telephone ?? "",
          email:     user.email     ?? "",
          id:        user.id        ?? "",
        } as any) : null}
        comptes={[] as any}
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
      <EcranRoleProprietaire user={user} contacts={contacts as any} visites={visites as any}
        reportings={reportings as any} livraisons={livraisons as any} dechiquetages={dechiquetages as any}/>
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
      <EcranEntrepriseSollicitee user={user} lots={contacts as any} toast={toast}/>
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
      <EcranRoleChauffeur user={user} transports={transports as any} dechiquetages={dechiquetages as any}
        gpsChantier={gpsChantier}
        onValiderArrivee={(lotId: any,h: any,nomChauffeur: any,capaciteM3: any)=>setAvisArrivee((p: any)=>{const next={...p,[lotId]:{heure:h,nomChauffeur:nomChauffeur.trim(),capaciteM3}};try{sessionStorage.setItem("applitag_avis_arrivee",JSON.stringify(next))} catch { /* noop */ }return next;})}
        onValiderDepart={(lotId: any,info: any)=>setCamionsPartis((p: any)=>{const next={...p,[lotId]:info};try{sessionStorage.setItem("applitag_camions_partis",JSON.stringify(next))} catch { /* noop */ }return next;})}/>
    </div>
  );

  if (roleEffectif==="dechiquetage") {
    if (activeLot) return (
      <div style={{display:"flex",flexDirection:"column",height:"100dvh",
        fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
        <EcranDechiquetage
          lot={activeLot}
          operateurs={operateurs as any}
          onBack={()=>setActiveLot(null)}
          onSaved={(newStatut: any)=>{
            setContacts(prev=>prev.map((c: any)=>c.id===activeLot.id?{...c,statutLot:newStatut}:c));
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
          _onLaunchDechiquetage={(lot: any)=>setActiveLot(lot)}
          avisArrivee={avisArrivee}
          camionsPartis={camionsPartis}
          toast={toast}
          onArriveeChantier={(lotId: any,heure: any,coords: any)=>setGpsChantier((p: any)=>({...p,[lotId]:{heure,coords}}))}/>
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
      <EcranRoleChaufferie user={user} livraisons={livraisons as any} toast={toast} onRefresh={refreshLivraisons}/>
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
      <EcranRoleReceptionnaire user={user} livraisons={livraisons as any} contacts={contacts as any} visites={visites as any} toast={toast}/>
    </div>
  );

  if (roleEffectif==="collectivite") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleCollectivite user={user}/>
    </div>
  );

  if (roleEffectif==="bet") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleBET user={user}/>
    </div>
  );

  if (roleEffectif==="etf") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleETF user={user}/>
    </div>
  );

  if (roleEffectif==="association") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleAssociation user={user}/>
    </div>
  );

  if (roleEffectif==="institutionnel") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleInstitutionnel user={user}/>
    </div>
  );

  if (roleEffectif==="financeur") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleFinanceur user={user}/>
    </div>
  );

  if (roleEffectif==="logistique") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleLogistique user={user}/>
    </div>
  );

  if (roleEffectif==="gestionnaire") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleGestionnaire user={user}/>
    </div>
  );

  if (roleEffectif==="scierie") return (
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",
      fontFamily:FONT_BODY,maxWidth:430,margin:"0 auto",boxShadow:"0 0 40px rgba(0,0,0,.15)"}}>
      <EcranRoleScierie user={user}/>
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

  const SCREEN_TITLES: Record<string, string> = {
    accueil:"APPLITAG", lots:"Mes lots", carte:"Carte",
    alertes:"Alertes", profil:"Profil",
  };

  if (roleEffectif==="admin" && (isWideScreen||forcePCView)) return (
    <EcranDashboardPC user={user} contacts={contacts} visites={visites}
      notifications={notifications} transports={transports} livraisons={livraisons}
      dechiquetages={dechiquetages} pendingSyncCount={pendingSyncCount}
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
          <EcranAccueil contacts={contacts} _visites={visites as any}
            notifications={notifications} user={user}
            onNewLot={()=>setScreen("fiche0")}
            onGoLots={(f: any)=>{ setFiltreLotsInitial(f); setScreen("lots"); }}
            onGoAlertes={()=>setScreen("alertes")}
            onGoDelegations={()=>setScreen("delegations")}
            onAppelerContact={(c: any)=>{ setFiche0Prefill(c); setScreen("fiche0"); }}/>
        )}
        {screen==="delegations"&&(
          <EcranDelegations entrepriseId={entrepriseId} toast={toast}
            onBack={()=>setScreen("accueil")}/>
        )}
        {screen==="lots"&&(
          <EcranLots key={filtreLotsInitial} contacts={contacts}
            onNewLot={()=>setScreen("fiche0")}
            onOpenLot={(c: any)=>{ setActiveContact(c); setScreen("fiche-lot"); }}
            filtreInitial={filtreLotsInitial}/>
        )}
        {screen==="alertes"&&(
          <EcranReleves entrepriseId={entrepriseId} _user={user} toast={toast}
            notifications={notifications as any} setNotifications={setNotifications as any}
            onGoDelegations={()=>setScreen("delegations")}/>
        )}
        {screen==="saisies"&&(
          <EcranSaisiesAdmin
            contacts={contacts as any} visites={visites as any}
            reportings={reportings as any} transports={transports as any}
            livraisons={livraisons as any}
            onBack={()=>setScreen("accueil")}/>
        )}
        {screen==="profil"&&(
          <div style={{paddingBottom:80}}>
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
              {(roleEffectif==="admin"||roleEffectif==="manager")&&(
                <div style={{marginBottom:12}}>
                  <button onClick={()=>{
                    const next=!forcePCView;
                    setForcePCView(next);
                    try{localStorage.setItem("applitag_force_pc",next?"1":"0");}catch{}
                  }} style={{width:"100%",height:48,borderRadius:12,
                    background:forcePCView?"#1a237e":"#fff",
                    color:forcePCView?"#fff":C.tx,
                    border:`1.5px solid ${forcePCView?"#1a237e":C.bd}`,
                    fontFamily:"inherit",fontSize:14,fontWeight:600,
                    cursor:"pointer",display:"flex",alignItems:"center",
                    justifyContent:"center",gap:8,WebkitTapHighlightColor:"transparent"}}>
                    🖥️ {forcePCView?"Quitter le mode PC":"Basculer vers l'écran PC admin"}
                  </button>
                </div>
              )}
              <BigBtn onClick={handleLogout} bg={C.red} icon="⎋">Se déconnecter</BigBtn>
            </div>
            {!isDemoMode&&(
              <EcranProfilEntreprise user={user} toast={toast}/>
            )}
          </div>
        )}
        {screen==="carte"&&(
          <EcranCarte
            contacts={contacts}
            visites={visites}
            onOpenLot={(c: any)=>{ setActiveContact(c); setScreen("fiche-lot"); }}/>
        )}
        {screen==="fiche0"&&(
          <Fiche0 onBack={()=>{ setFiche0Prefill(null); setScreen("accueil"); }}
            onSaved={(c: any)=>{ setFiche0Prefill(null); setContacts(prev=>[c,...prev]); setScreen("lots"); }}
            onAddRdv={(evt: any)=>setNotifications(prev=>[evt,...prev])}
            toast={toast} _contactCount={contacts.length} entrepriseId={entrepriseId}
            user={user}
            prefill={fiche0Prefill as any} comptes={comptesLocalGet() as any}/>
        )}
        {screen==="fiche-lot"&&activeContact&&(
          <FicheLotCentrale
            lot={activeContact}
            visites={visites as any}
            operateurs={operateurs as any}
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
            onDeleteLot={(user?.role==="admin"||user?.role==="manager")?async (lot: any)=>{
              deletedLotsAdd(lot.id);
              try {
                await apiDelete(`/contacts/${lot.id}`);
              } catch { /* noop */ }
              setContacts(prev=>prev.filter((c: any)=>c.id!==lot.id));
              setActiveContact(null);
              setScreen("lots");
              toast(`Lot ${lot.lotNumero} supprimé`,"warn");
            }:undefined}
            toast={toast}
            user={user}
            _entrepriseId={entrepriseId}/>
        )}
        {screen==="red-declaration"&&activeContact&&(
          <EcranAutoDeclarationRED
            lot={activeContact}
            visites={visites as any}
            transports={transports as any}
            livraisons={livraisons as any}
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
            visites={visites as any}
            entrepriseId={entrepriseId}
            onBack={()=>setScreen("fiche-lot")}
            onGoDelegations={()=>setScreen("delegations")}
            toast={toast}/>
        )}
        {screen==="cloture-exploitation"&&activeContact&&(
          <EcranClotureExploitation
            lot={activeContact}
            visites={visites as any}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={()=>{
              setContacts(prev=>prev.map((c: any)=>c.id===activeContact.id?{...c,statutLot:"BORD_ROUTE"}:c));
              setActiveContact((prev: any)=>prev?{...prev,statutLot:"BORD_ROUTE"}:prev);
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
            operateurs={operateurs as any}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={(newStatut: any)=>{
              setContacts(prev=>prev.map((c: any)=>c.id===activeContact.id?{...c,statutLot:newStatut}:c));
              setScreen("fiche-lot");
              toast("Déchiquetage enregistré — transport créé ✓");
            }}
            toast={toast}
            entrepriseId={entrepriseId}
            user={user}/>
        )}
        {screen==="transporteur"&&activeContact&&(
          <EcranTransporteur
            lot={activeContact}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={(newStatut: any)=>{
              setContacts(prev=>prev.map((c: any)=>c.id===activeContact.id?{...c,statutLot:newStatut}:c));
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
            onSaved={(newStatut: any)=>{
              setContacts(prev=>prev.map((c: any)=>c.id===activeContact.id?{...c,statutLot:newStatut}:c));
              setScreen("fiche-lot");
              toast(newStatut==="LIVRE_CHAUFFERIE"?"Livraison chaufferie validée ✓":"Entrée stock plateforme ✓");
            }}
            toast={toast}
            entrepriseId={entrepriseId}/>
        )}
        {screen==="validation-exploitation"&&activeContact&&(
          <EcranValidationExploitation
            lot={activeContact}
            visites={visites as any}
            operateurs={operateurs as any}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={(data: any)=>{
              const lotId = activeContact.id;
              const newStatut = "EN_COURS_EXPLOITATION";
              const tonnageAjout = data?.tonnage||0;
              setContacts(prev=>prev.map((c: any)=>c.id===lotId?{
                ...c,
                statutLot: newStatut,
                tonnageCumul: (parseFloat(c.tonnageCumul)||0) + tonnageAjout,
                etfNom: data?.etfNom||c.etfNom,
              }:c));
              setActiveContact((prev: any)=>prev&&prev.id===lotId?{
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
          <Fiche0Edit contact={activeContact as any}
            onBack={()=>setScreen("fiche-lot")}
            onSaved={(c: any)=>{ setContacts(prev=>prev.map((x: any)=>x.id===c.id?c:x)); setScreen("fiche-lot"); toast("Fiche mise à jour ✓"); }}
            toast={toast} user={user}
            onLaunchVisite={()=>{ setActiveLot(activeContact); setScreen("visite-form"); }}
            onLaunchValidation={()=>setScreen("validation-exploitation")}
            onLaunchCloture={()=>setScreen("cloture-exploitation")}
            onLaunchDechiquetage={()=>setScreen("dechiquetage")}
            onLaunchTransporteur={()=>setScreen("transporteur")}
            onLaunchLivraison={()=>setScreen("livraison")}/>
        )}
        {screen==="visite-form"&&activeLot&&(
          <FormulaireVisite lot={activeLot as any} onBack={()=>setScreen("fiche-lot")}
            onSaved={(v: any)=>{
              setVisites(prev=>[v,...prev]);
              setContacts(prev=>prev.map((c: any)=>c.id===activeLot.id
                ?{...c,statutLot:"VISITE_REALISEE"}:c));
              setActiveContact((prev: any)=>prev?.id===activeLot.id
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
          onDeleguee={(d: any)=>{ toast(`Code ${d.code} généré pour ${d.nomDelegue} ✓`); }}
          onIgnorer={()=>setShowDelegVisite(false)}/>
      )}

      {/* Modal suggestion ETF */}
      {showEtfModal&&activeContact&&(
        <ModalSuggestionETF
          lot={activeContact}
          visites={visites}
          operateurs={operateurs}
          rayon={100}
          onChoisir={(etfNom: any)=>{
            setContacts(prev=>prev.map((c: any)=>c.id===activeContact.id?{...c,etfNom}:c));
            setActiveContact((prev: any)=>prev?{...prev,etfNom}:prev);
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
          {navItems.map((item: any)=>(
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
              {(item.badge??0)>0&&(
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
