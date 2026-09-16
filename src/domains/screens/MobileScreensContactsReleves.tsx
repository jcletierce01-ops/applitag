// @ts-nocheck
import { useState, useEffect } from "react";
import { C, BTN_H, INPUT_H, FONT_INPUT, FONT_TITLE, PADDING } from "../../design-system/tokens.js";
import { todayS } from "../../shared/utils.js";
import { apiGet, apiPost, apiPatch, ApiError } from "../../services/api.service.js";
import { genPin4 } from "../../services/auth.service.js";
import { API_BASE_URL } from "@/config/env.js";
import { annoncesLocalGet, annoncesLocalSave } from "../../domains/connect/local-storage.js";
import { BigBtn, MInput, GridSelect, SectionTitle } from "../../shared/ui.jsx";
import { validatePhone, formatPhone } from "../../shared/validators.js";
import { ORIGINE_OPTS, TYPE_CONTACT_OPTS, TYPE_RESSOURCE_OPTS, STATUT_OPTS } from "../../domains/contacts/constants.js";
import { TYPES_PRESTATION_ANNONCE, STATUTS_ANNONCE, ORDRE_STATUTS_ANNONCE } from "../../domains/connect/constants.js";
export const EcranReleves = ({entrepriseId, _user, toast, notifications=[], setNotifications}: any) => {
  const [sousOnglet, setSousOnglet] = useState("notifs");
  const [operateurs, setOperateurs] = useState<any[]>([]);
  const [acces, setAcces] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [entreprises, setEntreprises] = useState<any[]>([]);
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [annonceContacter, setAnnonceContacter] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);
  const [showNewAcces, setShowNewAcces] = useState(false);
  const [opNom, setOpNom] = useState("");
  const [opPrenom, setOpPrenom] = useState("");
  const [opPin, setOpPin] = useState("");
  const [opRoles, setOpRoles] = useState(["abattage","debardage"]);
  const [opSaving, setOpSaving] = useState(false);
  const [selOp, setSelOp] = useState<any>(null);
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
  const [regenLoading, setRegenLoading] = useState<Record<string,boolean>>({});

  // Lots déjà assignés à un opérateur (tous opérateurs confondus) — à exclure du menu d'assignation
  const lotsDejaAssignes = new Set(
    operateurs.flatMap((op: any)=>(op.assignations||[]).map((a: any)=>a.lotId))
  );

  useEffect(()=>{
    apiGet(`/operateurs/entreprise/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setOperateurs(d); }).catch(()=>{});
    apiGet(`/acces-lot/entreprise/${entrepriseId}`).then(d=>{ if(Array.isArray(d)) setAcces(d); }).catch(()=>{});
    apiGet(`/contacts`).then(d=>{ if(Array.isArray(d)) setContacts(d); }).catch(()=>{});
    try { const s=localStorage.getItem(`applitag_entreprises_${entrepriseId}`); if(s){const p=JSON.parse(s); if(Array.isArray(p)) setEntreprises(p);} } catch { /* noop */ }
    apiGet(`/entreprises/entreprise/${entrepriseId}`).then(d=>{ if(Array.isArray(d)){ setEntreprises(d); try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(d));}catch{/*noop*/} } }).catch(()=>{});
    (async () => {
      let fromApi = [];
      try {
        const d = await apiGet(`/annonces/entreprise/${entrepriseId}`);
        if (Array.isArray(d)) fromApi = d;
      } catch { /* noop */ }
      const fromLocal = (annoncesLocalGet() as any[]).filter((a: any)=>a.entrepriseId===entrepriseId);
      const ids = new Set(fromApi.map((a: any)=>a.id));
      setAnnonces([...fromApi, ...fromLocal.filter((a: any)=>!ids.has(a.id))]
        .sort((a: any,b: any)=>+new Date(b.dateEnvoi)-+new Date(a.dateEnvoi)));
    })();
  },[entrepriseId]);

  const handleTraiterAnnonce = async (annonce: any, statut: any) => {
    try {
      await apiPatch(`/annonces/${annonce.id}`, { statut });
    } catch {
      toast("Pas de connexion — statut mis à jour localement","warn");
    }
    annoncesLocalSave((annoncesLocalGet() as any[]).map((a: any)=>a.id===annonce.id?{...a,statut}:a));
    setAnnonces(prev=>prev.map((a: any)=>a.id===annonce.id?{...a,statut}:a));
  };

  const handleCreerLotDepuisAnnonce = async (annonce: any) => {
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

  const annoncesNouvelles = annonces.filter(a=>a.statut==="recu"||a.statut==="nouvelle"||!a.statut);

  const handleCreateOp = async () => {
    if (!opNom||!opPin) { toast("Remplir le nom et le PIN","warn"); return; }
    if (opProfil==="charge_mission"&&opMandate&&!opEntrepriseMandanteId) { toast("Sélectionnez l'entreprise mandante","warn"); return; }
    setOpSaving(true);
    const entrepriseMandante = opMandate ? entreprises.find(e=>e.id===opEntrepriseMandanteId) : null;
    try {
      const saved: any = await apiPost(`/operateurs`, {nom:opNom,prenom:opPrenom,pin:opPin});
      setOperateurs(prev=>[{...saved,roles:opRoles,profil:opProfil,
        entrepriseMandanteId:entrepriseMandante?.id||null,entrepriseMandanteNom:entrepriseMandante?.nom||null,assignations:[]},...prev]);
      setShowNew(false);
      setOpNom(""); setOpPrenom(""); setOpPin(""); setOpRoles(["abattage","debardage"]); setOpProfil("terrain");
      setOpMandate(false); setOpEntrepriseMandanteId("");
      toast(`Opérateur ${saved.nom} créé — PIN : ${opPin}`);
    } catch(e: unknown) {
      const msg = e instanceof ApiError
        ? (e.status === 400 ? "Données invalides — vérifiez le formulaire" : `Erreur serveur (${e.status})`)
        : "Serveur inaccessible — vérifiez votre connexion";
      toast(msg,"warn");
    }
    setOpSaving(false);
  };

  const handleAssigner = async () => {
    if (!assignLotId||!selOp) return;
    setAssignSaving(true);
    try {
      const saved: any = await apiPost(`/operateurs/${selOp.id}/assigner`, {lotId:assignLotId,lotNumero:assignLotNumero,typeOperation:assignType});
      setOperateurs(prev=>prev.map((op: any)=>op.id===selOp.id?
        {...op,assignations:[...(op.assignations||[]),saved]}:op));
      setSelOp(null);
      setAssignLotId(""); setAssignLotNumero("");
      toast("Lot assigné ✓");
    } catch { toast("Erreur API","warn"); }
    setAssignSaving(false);
  };

  const handleCreateAcces = async () => {
    if (!lotId||!etfNom) { toast("Sélectionnez un lot et saisissez l'ETF","warn"); return; }
    setAccesSaving(true);
    try {
      const saved: any = await apiPost(`/acces-lot`, {lotId,lotNumero,entrepriseId,etfNom,etfContact,typeOperation});
      setAcces(prev=>[saved,...prev]);
      setShowNewAcces(false);
      setEtfNom(""); setEtfContact(""); setLotId(""); setLotNumero("");
      toast(`Code créé : ${saved.code}`);
    } catch { toast("Erreur API","warn"); }
    setAccesSaving(false);
  };

  const handleDesactiver = async (id: any) => {
    try {
      await apiPatch(`/acces-lot/${id}/desactiver`);
      setAcces(prev=>prev.map((a: any)=>a.id===id?{...a,actif:false}:a));
      toast("Accès désactivé");
    } catch { toast("Erreur","warn"); }
  };

  const handleRenvoyer = (a: any) => {
    const tel = a.etfContact?.replace(/\s/g,"");
    const expiry = new Date(a.expiresAt).toLocaleDateString("fr-FR");
    const body = `Votre code d'accès APPLITAG : ${a.code} — Lot ${a.lotNumero}. Valide jusqu'au ${expiry}.`;
    if (/^0[67]\d{8}$/.test(tel||"")) {
      window.open(`sms:${tel}?body=${encodeURIComponent(body)}`);
    } else if (navigator.share) {
      navigator.share({title:"Code accès APPLITAG",text:body}).catch(()=>{});
    } else {
      toast(`Code : ${a.code} (copiez et envoyez manuellement)`,"warn");
    }
  };

  const handleNouveauCode = async (a: any) => {
    setRegenLoading(prev=>({...prev,[a.id]:true}));
    try {
      await apiPatch(`/acces-lot/${a.id}/desactiver`);
      const nouveau: any = await apiPost(`/acces-lot`,{
        lotId:a.lotId, lotNumero:a.lotNumero, entrepriseId:a.entrepriseId,
        etfNom:a.etfNom, etfContact:a.etfContact, typeOperation:a.typeOperation,
      });
      setAcces(prev=>prev.map((x: any)=>x.id===a.id?{...x,actif:false}:x).concat([nouveau]));
      toast(`Nouveau code : ${nouveau.code}`);
    } catch { toast("Erreur lors du renouvellement","warn"); }
    setRegenLoading(prev=>({...prev,[a.id]:false}));
  };

  const typeLabel = (t: any)=>({"mandataire":"🔭 Visite terrain","abattage":"🪓 Abattage","debardage":"🚜 Débardage","dechiquetage":"🌀 Déchiquetage"} as Record<string,any>)[t]||t;
  const PROFILS_OPERATEUR = {
    terrain:        {label:"Opérateur terrain",  icon:"👷", desc:"Saisie abattage et débardage uniquement", roles:["abattage","debardage"]},
    charge_mission: {label:"Chargé de mission",  icon:"🔭", desc:"Visite terrain uniquement",               roles:["mandataire"]},
    dechiquetage:   {label:"Déchiqueteur",        icon:"🌀", desc:"Saisie déchiquetage uniquement",          roles:["dechiquetage"]},
  };
  const [opProfil, setOpProfil] = useState("terrain");
  const choisirProfilOp = (p: any) => { setOpProfil(p); setOpRoles((PROFILS_OPERATEUR as Record<string,any>)[p].roles); if(p!=="charge_mission"){ setOpMandate(false); setOpEntrepriseMandanteId(""); } };
  const [opMandate, setOpMandate] = useState(false); // chargé de mission nommé par une entreprise tierce
  const [opEntrepriseMandanteId, setOpEntrepriseMandanteId] = useState("");

  if (annonceContacter) {
    return (
      <Fiche0
        onBack={()=>setAnnonceContacter(null)}
        onSaved={async (saved: any)=>{
          await handleTraiterAnnonce(annonceContacter, "a_qualifier");
          setContacts((prev: any[])=>[saved,...prev]);
          setAnnonceContacter(null);
          setSousOnglet("agenda");
        }}
        toast={toast}
        entrepriseId={entrepriseId}
        prefill={{nom: annonceContacter.nom||"", prenom: annonceContacter.prenom||"", telephone: annonceContacter.telephone||"", email: annonceContacter.email||""}}
        comptes={[]}
        user={_user}
      />
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",gap:0,padding:"8px 16px 0",background:"#fff",
        borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {[["operateurs","👷 Opérateurs"],["acces","🔑 Accès lot"],
          ["annonces",`📢 Connect${annoncesNouvelles.length>0?` (${annoncesNouvelles.length})`:""}`],
          ["agenda","📅 Agenda"],
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
                  <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
                    Code PIN <span style={{fontWeight:400,color:C.tx3}}>(généré automatiquement)</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10,height:INPUT_H,
                    padding:"0 14px",borderRadius:12,border:`1.5px solid ${C.bd}`,background:C.bg2}}>
                    <span style={{flex:1,fontFamily:"monospace",fontSize:20,fontWeight:700,
                      letterSpacing:6,color:C.tx}}>{opPin}</span>
                    <button onClick={async()=>{ try{setOpPin(await genPin4(API_BASE_URL));}catch{toast("Erreur génération PIN — réessayez","warn");} }} style={{
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
                          Entreprise pour le compte de laquelle ce chargé de mission intervient — distincte de son propre employeur.
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
                          {(PROFILS_OPERATEUR as Record<string,any>)[op.profil||(op.roles?.includes("mandataire")?"charge_mission":"terrain")]?.icon}{" "}
                          {(PROFILS_OPERATEUR as Record<string,any>)[op.profil||(op.roles?.includes("mandataire")?"charge_mission":"terrain")]?.label}
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
                        {op.roles.map((r: any)=>(
                          <span key={r} style={{fontSize:10,padding:"3px 8px",borderRadius:6,
                            background:C.bg2,color:C.tx2,fontWeight:500}}>{typeLabel(r)}</span>
                        ))}
                      </div>
                    )}
                    {op.assignations&&op.assignations.length>0&&(
                      <div style={{marginBottom:10}}>
                        {op.assignations.map((a: any)=>(
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
                    {a.actif&&(
                      <div style={{display:"flex",gap:8,marginTop:8}}>
                        <button onClick={()=>handleRenvoyer(a)} style={{flex:1,padding:"8px 10px",
                          borderRadius:8,background:C.bg2,color:C.tx2,border:`1px solid ${C.bd}`,
                          fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:500,
                          WebkitTapHighlightColor:"transparent"}}>📨 Renvoyer par SMS</button>
                        <button onClick={()=>handleNouveauCode(a)} disabled={!!regenLoading[a.id]}
                          style={{flex:1,padding:"8px 10px",borderRadius:8,
                          background:regenLoading[a.id]?C.bg2:C.amberL,
                          color:C.amberD,border:`1px solid ${C.amberD}`,
                          fontFamily:"inherit",fontSize:12,cursor:"pointer",fontWeight:600,
                          WebkitTapHighlightColor:"transparent"}}>
                          {regenLoading[a.id]?"⏳ Génération…":"🔄 Nouveau code"}
                        </button>
                      </div>
                    )}
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
            ) : annonces.map((a: any)=>{
              const meta = ({
                gisement:{icon:"🌲",label:"Proposition de bois",bg:C.greenL,color:C.greenD},
                service:{icon:"🛠️",label:"Offre de service",bg:C.blueL,color:C.blueD},
                demande:{icon:"🪵",label:"Demande de plaquettes",bg:C.amberL,color:C.amberD},
              } as Record<string,any>)[a.type]||{icon:"📢",label:a.type,bg:C.bg2,color:C.tx3};
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
                    {a.prestations?.length>0&&<><br/>🛠️ {a.prestations.map((p: any)=>TYPES_PRESTATION_ANNONCE.find(([v])=>v===p)?.[2]||p).join(", ")}</>}
                    {a.commentaire&&<><br/>💬 {a.commentaire}</>}
                  </div>
                  {a.photos?.length>0&&(
                    <div style={{display:"flex",gap:6,marginBottom:10}}>
                      {a.photos.map((p: any, i: any)=>(
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
                    {a.type==="gisement"&&(
                      <button onClick={()=>{ setSousOnglet("annonces"); setAnnonceContacter(a); }} style={{height:36,padding:"0 12px",
                        borderRadius:8,background:C.purple,color:"#fff",border:"none",
                        fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",
                        WebkitTapHighlightColor:"transparent",whiteSpace:"nowrap"}}>📋 Appeler</button>
                    )}
                    {a.type==="gisement"&&a.statut!=="valide"&&a.statut!=="lot_cree"&&(
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
        {sousOnglet==="agenda"&&(()=>{
          const CONCL_LABEL: Record<string,{icon:string,label:string,color:string,bg:string}> = {
            rendez_vous:  {icon:"📅",label:"Rendez-vous",  color:C.purple, bg:"#F3E5F5"},
            visite_prevue:{icon:"🔭",label:"Visite prévue",color:C.blue,   bg:C.blueL},
            a_rappeler:   {icon:"📞",label:"À rappeler",   color:C.amber,  bg:C.amberL},
            en_reflexion: {icon:"🤔",label:"En réflexion", color:C.tx3,    bg:C.bg2},
          };
          const rdvContacts = contacts
            .filter((c: any)=>c.conclusion&&CONCL_LABEL[c.conclusion])
            .sort((a: any,b: any)=>{
              const da=a.dateRdv||a.dateContact||"", db=b.dateRdv||b.dateContact||"";
              return da<db?-1:da>db?1:0;
            });
          const today=new Date().toISOString().slice(0,10);
          const passes = rdvContacts.filter((c: any)=>(c.dateRdv||c.dateContact||"")<today);
          const avenir = rdvContacts.filter((c: any)=>(c.dateRdv||c.dateContact||"")>=today);
          const RDVCard = (c: any)=>{
            const meta=CONCL_LABEL[c.conclusion]||{icon:"📋",label:c.conclusion,color:C.tx3,bg:C.bg2};
            const dateAff=c.dateRdv?new Date(c.dateRdv).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"}):"—";
            return (
              <div key={c.id} style={{background:"#fff",border:`1px solid ${C.bd}`,borderLeft:`4px solid ${meta.color}`,
                borderRadius:14,padding:14,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:11,padding:"3px 8px",borderRadius:6,fontWeight:600,
                    background:meta.bg,color:meta.color}}>{meta.icon} {meta.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:meta.color}}>{dateAff}</span>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:2}}>
                  {c.prenom?`${c.prenom} ${c.nom}`:c.nom}
                </div>
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                  {c.telephone&&<div>📞 <a href={`tel:${c.telephone}`} style={{color:C.blue,textDecoration:"none"}}>{c.telephone}</a></div>}
                  {c.commune&&<div>📍 {c.commune}{c.codePostal?` (${c.codePostal})`:""}</div>}
                  {c.potentiel&&<div>🌲 {c.potentiel}</div>}
                  {c.delaiExecution&&<div>🗓️ {c.delaiExecution}</div>}
                  {c.commentaire&&<div style={{marginTop:4,fontStyle:"italic"}}>💬 {c.commentaire.slice(0,120)}{c.commentaire.length>120?"…":""}</div>}
                </div>
                {c.lotNumero&&(
                  <div style={{marginTop:8,fontFamily:"monospace",fontSize:11,fontWeight:600,
                    color:C.greenD,background:C.greenL,padding:"2px 8px",borderRadius:6,display:"inline-block"}}>
                    🏷️ {c.lotNumero}
                  </div>
                )}
              </div>
            );
          };
          return (
            <div>
              <div style={{fontSize:16,fontWeight:700,color:C.tx,marginBottom:4,fontFamily:FONT_TITLE}}>
                📅 Agenda — Rendez-vous & suivis
              </div>
              <div style={{fontSize:12,color:C.tx3,marginBottom:16}}>Contacts avec une suite planifiée</div>
              {rdvContacts.length===0&&(
                <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                  <div style={{fontSize:40,marginBottom:12}}>📅</div>
                  <div style={{fontSize:16,fontWeight:500}}>Aucun rendez-vous</div>
                  <div style={{fontSize:13,marginTop:4}}>Les fiches avec RDV, visite ou rappel apparaîtront ici</div>
                </div>
              )}
              {avenir.length>0&&(
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>
                    À venir ({avenir.length})
                  </div>
                  {avenir.map(RDVCard)}
                </div>
              )}
              {passes.length>0&&(
                <div style={{marginTop:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>
                    Passés ({passes.length})
                  </div>
                  {passes.map(RDVCard)}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {sousOnglet==="operateurs"&&!showNew&&!selOp&&(
        <div style={{padding:"12px 16px 24px",flexShrink:0}}>
          <BigBtn onClick={async()=>{ try{const p=await genPin4(API_BASE_URL);setOpPin(p);setShowNew(true);}catch{toast("Erreur génération PIN — réessayez","warn");} }} bg={C.green} icon="👷">Nouvel opérateur</BigBtn>
        </div>
      )}
      {sousOnglet==="notifs"&&(
          <div>
            {notifications.length===0 ? (
              <div style={{textAlign:"center",padding:"48px 0",color:C.tx3}}>
                <div style={{fontSize:40,marginBottom:12}}>🔔</div>
                <div style={{fontSize:16,fontWeight:500}}>Aucune notification</div>
              </div>
            ) : notifications.map((n: any)=>(
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
                  setNotifications((prev: any)=>prev.filter((x: any)=>x.id!==n.id));
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

export const Fiche0Edit = ({contact, onBack, onSaved, toast, user, onLaunchVisite, onLaunchValidation, onLaunchCloture, onLaunchDechiquetage, onLaunchTransporteur, onLaunchLivraison}: any) => {
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
  const [lineaireHaieM, setLineaireHaieM]   = useState(contact.lineaireHaieM||"");
  const [proprietaireHaie,setProprietaireHaie] = useState(contact.proprietaireHaie||"");
  const [cbqPlus,       setCbqPlus]          = useState(contact.cbqPlus||false);
  const [saving, setSaving] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [historique, setHistorique] = useState<any[]>([]);

  useEffect(()=>{
    if (showHistorique) {
      apiGet(`/contacts/${contact.id}/historique`)
        .then((d: any)=>{ if(Array.isArray(d)) setHistorique(d); }).catch(()=>{});
    }
  },[showHistorique, contact.id]);

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
      lineaireHaieM: potentiel==="haie_bocager" && lineaireHaieM ? parseFloat(String(lineaireHaieM)) : undefined,
      proprietaireHaie: potentiel==="haie_bocager" && proprietaireHaie ? proprietaireHaie : undefined,
      cbqPlus: potentiel==="haie_bocager" ? cbqPlus : undefined,
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
            ) : historique.map((h: any)=>(
              <div key={h.id} style={{background:"#fff",border:`1px solid ${C.bd}`,
                borderRadius:12,padding:12,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.tx}}>
                    {(CHAMP_LABELS as Record<string,any>)[h.champ]||h.champ}
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
              ].filter(Boolean) as any[];
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

            <div onClick={()=>setEstPM((v: any)=>!v)} style={{
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
            {potentiel==="haie_bocager"&&(
              <div style={{background:"#F0FDF4",borderRadius:12,padding:14,marginBottom:14,
                border:"1px solid #BBF7D0"}}>
                <div style={{fontSize:13,fontWeight:600,color:"#166534",marginBottom:10}}>
                  🌿 Détail bois bocager
                </div>
                <MInput label="Linéaire de haie (m)" value={String(lineaireHaieM||"")}
                  onChange={setLineaireHaieM} type="number" placeholder="ex: 450" hint="optionnel"/>
                <MInput label="Propriétaire de la haie" value={proprietaireHaie}
                  onChange={setProprietaireHaie}
                  placeholder="Nom si différent du contact" hint="optionnel"/>
                <div onClick={()=>setCbqPlus((v:boolean)=>!v)} style={{display:"flex",alignItems:"center",
                  gap:10,padding:"10px 14px",background:"#fff",borderRadius:10,
                  border:"1px solid #D1FAE5",cursor:"pointer",marginBottom:4,
                  WebkitTapHighlightColor:"transparent"}}>
                  <div style={{width:22,height:22,borderRadius:6,flexShrink:0,
                    border:`2px solid ${cbqPlus?"#16A34A":"#D1D5DB"}`,
                    background:cbqPlus?"#16A34A":"#fff",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {cbqPlus&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:"#166534"}}>Éligible CBQ+</div>
                    <div style={{fontSize:10,color:"#6B7280"}}>
                      Combustible Bois de Qualité+ — filière bocagère structurée
                    </div>
                  </div>
                </div>
              </div>
            )}

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

