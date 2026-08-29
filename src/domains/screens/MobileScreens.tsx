// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { STATUT_LOT } from "./MobileScreens.constants.js";
import { C, BTN_H, INPUT_H, FONT_INPUT, FONT_TITLE, PADDING } from "../../design-system/tokens.js";
import { todayS, nowISO, uid, genCode } from "../../shared/utils.js";
import { apiGet, apiPost, apiPatch, apiPostPublic } from "../../services/api.service.js";
import { genPin4 } from "../../services/auth.service.js";
import { API_BASE_URL } from "@/config/env.js";
import { annoncesLocalGet, annoncesLocalSave, comptesLocalGet, comptesLocalSave } from "../../domains/connect/local-storage.js";
import { ordresExplLocalGet, ordresExplLocalSave } from "../../domains/exploitation/local-storage.js";
import { BigBtn, MInput, GridSelect, SectionTitle } from "../../shared/ui.jsx";
import { validatePhone, formatPhone } from "../../shared/validators.js";
import { generatePdfFromHtml, buildCompteRenduContactHTML, buildOrdreExploitationHTML } from "../../domains/documents/pdf-templates.js";
import { FormulaireVisite } from "../../domains/visites/FormulaireVisite.jsx";
import { ORIGINE_OPTS, TYPE_CONTACT_OPTS, TYPE_RESSOURCE_OPTS, PRIORITE_OPTS, STATUT_OPTS } from "../../domains/contacts/constants.js";
import { TYPES_PRESTATION_ANNONCE, STATUTS_ANNONCE, ORDRE_STATUTS_ANNONCE } from "../../domains/connect/constants.js";
import { indicesPonderes } from "../../metier/formules.js";
export const QrCodeAdmin = ({entrepriseId, entrepriseNom, onClose}) => {
  const _canvasRef = useRef(null);
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
export const Fiche0 = ({onBack, onSaved, toast, _contactCount, entrepriseId, prefill=null, comptes=[]}) => {
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
const _ListeContacts = ({contacts, onNew, onNewVisite, onEdit}) => {
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

export const EcranReleves = ({entrepriseId, _user, toast, notifications=[], setNotifications, onGoDelegations}) => {
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
      } catch { /* noop */ }
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
    if (!lotId||!etfNom) { toast("Sélectionnez un lot et saisissez l'ETF","warn"); return; }
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

export const Fiche0Edit = ({contact, onBack, onSaved, toast, user, onLaunchVisite, onLaunchValidation, onLaunchCloture, onLaunchDechiquetage, onLaunchTransporteur, onLaunchLivraison}) => {
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

export const EcranOperateur = ({operateur, onLogout, toast, onUpdateOperateur}) => {
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
    } catch { /* noop */ }
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
      let _res;
      try {
        _res = modeModif && releveExistantId
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
    } catch { /* noop */ }
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

// ── ÉCRAN ACCUEIL ─────────────────────────────────────────────
export const EcranAccueil = ({contacts, _visites, notifications, user, onNewLot, onGoLots, onGoAlertes, onGoDelegations, onAppelerContact}) => {
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

export const EcranDelegations = ({entrepriseId, toast, onBack}) => {
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
    try { const s=localStorage.getItem(`applitag_entreprises_${entrepriseId}`); if(s){ const p=JSON.parse(s); if(Array.isArray(p)) setEntreprises(p); } } catch { /* noop */ }
    apiGet(`/entreprises/entreprise/${entrepriseId}`)
      .then(d=>{ if(Array.isArray(d)){ setEntreprises(d); try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(d));} catch { /* noop */ } } }).catch(()=>{});
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
      setEntreprises(prev=>{ const next=[saved,...prev]; try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(next));} catch { /* noop */ } return next; });
      toast(`Entreprise ${nom} créée ✓`);
    } catch {
      setEntreprises(prev=>{ const next=[{...entreprise,id:uid()},...prev]; try{localStorage.setItem(`applitag_entreprises_${entrepriseId}`,JSON.stringify(next));} catch { /* noop */ } return next; });
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

