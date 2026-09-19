// @ts-nocheck
import { useState, useEffect } from "react";
import { STATUT_LOT } from "./MobileScreens.constants.js";
import { C, BTN_H, INPUT_H, FONT_INPUT, FONT_TITLE, PADDING } from "../../design-system/tokens.js";
import { todayS, nowISO, uid, genCode } from "../../shared/utils.js";
import { apiGet, apiPost, apiPatch, apiPostPublic, ApiError } from "../../services/api.service.js";
import { genPin4, getToken } from "../../services/auth.service.js";
import { API_BASE_URL } from "@/config/env.js";
import { annoncesLocalGet, annoncesLocalSave, comptesLocalGet, comptesLocalSave } from "../../domains/connect/local-storage.js";
import { BigBtn, MInput, GridSelect, SectionTitle } from "../../shared/ui.jsx";
import { validatePhone, formatPhone } from "../../shared/validators.js";
import { generatePdfFromHtml, buildCompteRenduContactHTML } from "../../domains/documents/pdf-templates.js";
import { ORIGINE_OPTS, TYPE_CONTACT_OPTS, TYPE_RESSOURCE_OPTS, PRIORITE_OPTS, STATUT_OPTS } from "../../domains/contacts/constants.js";
import { TYPES_PRESTATION_ANNONCE, STATUTS_ANNONCE, ORDRE_STATUTS_ANNONCE } from "../../domains/connect/constants.js";

export const QrCodeAdmin = ({entrepriseId, entrepriseNom, onClose}: any) => {
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
export const Fiche0 = ({onBack, onSaved, toast, entrepriseId, prefill=null, comptes=[], onAddRdv, user}: any) => {
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
  const [geoLoading,    setGeoLoading] = useState(false);
  const [refCadastrale, setRef]      = useState("");
  const [typeRessource, setRessource]= useState("");
  const [mixteDetails,  setMixteD]   = useState<any[]>([]);
  const [lineaireHaie,  setLineaireHaie]     = useState("");
  const [proprietaireHaie, setProprietaireHaie] = useState("");
  const [cbqPlus,       setCbqPlus]           = useState(false);
  const [priorite,      setPriorite] = useState("moyenne");
  const [statut,        setStatut]   = useState("nouveau");
  const [commentaire,   setComment]  = useState("");
  const [redacteur,     setRedacteur]= useState(()=>[user?.prenom,user?.nom].filter(Boolean).join(" "));
  const [conclusion,    setConclusion]=useState("");
  const [dateRdv,       setDateRdv]  = useState("");
  const [delaiExecutionFiche, setDelaiExecutionFiche] = useState("");
  const [delaiRappel,   setDelaiRappel]= useState<number>(()=>{
    try { return parseInt(localStorage.getItem("applitag_rappel_delai")||"30",10)||30; } catch { return 30; }
  });
  const [exploitationAutorisee, setExploitAuth] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState<Record<string,any>>({});

  const validate = () => {
    const e: Record<string,any> = {};
    if (!nom.trim())        e.nom = "Obligatoire";
    if (!telephone.trim())  e.telephone = "Obligatoire";
    else { const err=validatePhone(telephone); if(err) e.telephone=err; }
    if (!commune.trim())    e.commune = "Obligatoire";
    if (!codePostal.trim()) e.codePostal = "Obligatoire pour le n° de lot";
    if (!typeRessource)     e.typeRessource = "Sélectionner une nature";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Email invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { toast("Compléter les champs obligatoires","warn"); return; }
    setSaving(true);
    const contact = {
      nom, prenom, telephone,
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(adressePostale ? { adressePostale } : {}),
      ...(complementAdresse ? { complementAdresse } : {}),
      ...(cpProprietaire ? { cpProprietaire } : {}),
      ...(villeProprietaire ? { villeProprietaire } : {}),
      commune, adresseParcelle,
      surfaceHa: surfaceHa ? parseFloat(surfaceHa) : undefined,
      refCadastrale, typeContact,
      ...(origine ? { origine } : {}),
      nomApporteur, dateContact,
      statut, potentiel: typeRessource==="mixte"
        ? `mixte:${mixteDetails.join(",")}`
        : typeRessource,
      ...(commentaire ? { commentaire } : {}),
      codePostal,
      // entrepriseId omis : le controller le prend de req.user.entrepriseId
      ...(redacteur ? { redacteur } : {}),
      ...(conclusion ? { conclusion } : {}),
      ...(exploitationAutorisee ? { exploitationAutorisee } : {}),
      delaiExecution: delaiExecutionFiche || undefined,
      dateRdv: (["rendez_vous","visite_prevue","a_rappeler"].includes(conclusion) && dateRdv) ? dateRdv : undefined,
      lineaireHaieM: typeRessource==="haie_bocager" && lineaireHaie ? parseFloat(lineaireHaie) : undefined,
      proprietaireHaie: typeRessource==="haie_bocager" && proprietaireHaie ? proprietaireHaie : undefined,
      cbqPlus: typeRessource==="haie_bocager" ? cbqPlus : undefined,
      // lotNumero omis volontairement : généré côté serveur (P0.5)
    };
    try {
      const saved: any = await apiPost(`/contacts`, contact);
      const lotNumero = saved.lotNumero;
      toast(`Fiche créée — ${lotNumero}`);
      const html = buildCompteRenduContactHTML(saved);
      generatePdfFromHtml(html, `CompteRenduContact_${lotNumero}.pdf`, toast);
      const nomContact = `${nom} ${prenom}`.trim();
      const LABELS_CONCL: Record<string,string> = {rendez_vous:"📅 RDV",visite_prevue:"🔭 Visite prévue",a_rappeler:"📞 Rappel"};
      if (["rendez_vous","visite_prevue","a_rappeler"].includes(conclusion) && dateRdv) {
        const label = LABELS_CONCL[conclusion];
        onAddRdv?.({id:`local-${uid()}`,conclusion,date:dateRdv,contact:nomContact,
          message:`${label} — ${nomContact} — ${dateRdv.split("-").reverse().join("/")}`,local:true});
      } else if (conclusion==="en_reflexion") {
        const d=new Date(); d.setDate(d.getDate()+delaiRappel);
        const dateRappel=d.toISOString().slice(0,10);
        onAddRdv?.({id:`local-${uid()}`,conclusion:"en_reflexion",date:dateRappel,contact:nomContact,
          message:`🤔 Relance — ${nomContact} — dans ${delaiRappel}j (${dateRappel.split("-").reverse().join("/")})`,local:true});
      }
      onSaved(saved);
    } catch (e: any) {
      toast(`Erreur API : ${e?.message ?? "inconnue"}`, "warn");
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
            {comptes.filter((c: any)=>!c.rapportAppel).length===0&&(
              <div style={{fontSize:13,color:C.tx3}}>Aucun contact en attente de rappel</div>
            )}
            {comptes.filter((c: any)=>!c.rapportAppel).length>0&&(
              <select value={compteSelec}
                onChange={e=>{
                  const id=e.target.value;
                  setCompteSelec(id);
                  const c=comptes.find((x: any)=>x.id===id);
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
                {comptes.filter((c: any)=>!c.rapportAppel).map((c: any)=>(
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.trancheHoraire?`(${c.trancheHoraire})`:""}
                  </option>
                ))}
              </select>
            )}
            {compteSelec&&comptes.find((x: any)=>x.id===compteSelec)&&(
              <div style={{background:"rgba(255,255,255,.6)",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#5D4037",marginTop:4}}>
                {comptes.find((x: any)=>x.id===compteSelec).natureDemande?.length>0&&(
                  <div style={{marginBottom:4}}>
                    <span style={{fontWeight:600}}>Demande(s) : </span>
                    {comptes.find((x: any)=>x.id===compteSelec).natureDemande.join(" · ")}
                  </div>
                )}
                {comptes.find((x: any)=>x.id===compteSelec).trancheHoraire&&(
                  <div><span style={{fontWeight:600}}>Rappel souhaité : </span>{comptes.find((x: any)=>x.id===compteSelec).trancheHoraire}</div>
                )}
                {comptes.find((x: any)=>x.id===compteSelec).email&&(
                  <div style={{marginTop:4}}><span style={{fontWeight:600}}>Email : </span>{comptes.find((x: any)=>x.id===compteSelec).email}</div>
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
        <button
          type="button"
          disabled={geoLoading}
          onClick={async () => {
            if (!navigator.geolocation) { toast("Géolocalisation non disponible sur cet appareil", "warn"); return; }
            setGeoLoading(true);
            navigator.geolocation.getCurrentPosition(
              async pos => {
                try {
                  const r: any = await apiGet(
                    `/geoplateforme/context?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
                  );
                  if (r?.commune)   setCommune(r.commune);
                  if (r?.codePostal) setCP(r.codePostal);
                  if (r?.parcelleId && !adresseParcelle) setParc(`Parcelle cadastrale : ${r.parcelleId}`);
                  toast("📍 Commune et code postal récupérés depuis votre position");
                } catch {
                  toast("Impossible d'identifier la commune — vérifiez votre connexion", "warn");
                } finally {
                  setGeoLoading(false);
                }
              },
              () => { toast("Accès à la position refusé", "warn"); setGeoLoading(false); },
              { timeout: 10000, maximumAge: 60000 }
            );
          }}
          style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",
            borderRadius:10,border:`1.5px solid ${C.green}`,background:C.greenL,
            color:C.greenD,fontFamily:"inherit",fontSize:13,fontWeight:600,
            cursor:geoLoading?"wait":"pointer",marginBottom:12,
            WebkitTapHighlightColor:"transparent",width:"100%",justifyContent:"center"}}>
          {geoLoading ? "📡 Localisation en cours…" : "📍 Géolocaliser la parcelle"}
        </button>
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

        {typeRessource==="haie_bocager"&&(
          <div style={{background:"#F0FDF4",borderRadius:12,padding:14,marginBottom:14,
            border:"1px solid #BBF7D0"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#166534",marginBottom:10}}>
              🌿 Détail bois bocager
            </div>
            <MInput label="Linéaire de haie (m)" value={lineaireHaie}
              onChange={setLineaireHaie} type="number" placeholder="ex: 450" hint="optionnel"/>
            <MInput label="Propriétaire de la haie" value={proprietaireHaie}
              onChange={setProprietaireHaie}
              placeholder="Nom si différent du contact" hint="optionnel"/>
            <div onClick={()=>setCbqPlus(v=>!v)} style={{display:"flex",alignItems:"center",
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
        <MInput label="Rédacteur de ce compte rendu" value={redacteur} onChange={setRedacteur}
          placeholder="Nom Prénom" hint="optionnel"/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>Conclusion de l'entretien</div>
          <GridSelect options={[
            ["rendez_vous","📅","Rendez-vous fixé"],
            ["visite_prevue","🔭","Visite prévue"],
            ["a_rappeler","📞","À rappeler"],
            ["en_reflexion","🤔","En réflexion"],
            ["echec","❌","Sans suite"],
          ]} value={conclusion} onChange={v=>{setConclusion(v);setDateRdv("");}} cols={3}/>
        </div>
        {["rendez_vous","visite_prevue","a_rappeler"].includes(conclusion)&&(
          <MInput
            label={conclusion==="rendez_vous"?"📅 Date du rendez-vous":conclusion==="visite_prevue"?"🔭 Date de la visite prévue":"📞 Date de rappel"}
            value={dateRdv} onChange={setDateRdv} type="date"/>
        )}
        {conclusion==="rendez_vous"&&(
          <MInput
            label="📋 Délai d'exécution des travaux contractualisé"
            value={delaiExecutionFiche} onChange={setDelaiExecutionFiche}
            type="date" hint="Date butoir convenue avec le propriétaire"/>
        )}
        {conclusion==="en_reflexion"&&(
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
            background:"#FFF8E1",borderRadius:10,border:"1px solid #FFD54F",marginBottom:14}}>
            <span style={{fontSize:13,color:C.tx2}}>🔔 Rappel dans</span>
            <input type="number" min={1} max={365} value={delaiRappel}
              onChange={e=>{const v=parseInt(e.target.value,10)||30;setDelaiRappel(v);try{localStorage.setItem("applitag_rappel_delai",String(v));}catch{/*noop*/}}}
              style={{width:60,height:34,borderRadius:8,border:`1.5px solid ${C.bd}`,fontFamily:"inherit",
                fontSize:14,textAlign:"center",outline:"none",padding:"0 6px"}}/>
            <span style={{fontSize:13,color:C.tx2}}>jours <span style={{fontSize:11,color:C.tx3}}>(réglage conservé)</span></span>
          </div>
        )}
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

// ── VISITE TERRAIN ────────────────────────────────────────────
// MSlider importé depuis ./shared/ui.jsx

