// @ts-nocheck
import { useState, useEffect } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { todayS } from "../../shared/utils.js";
import { apiGet, apiPatch } from "../../services/api.service.js";
import { BigBtn, MInput, GridSelect, SectionTitle } from "../../shared/ui.jsx";
import { validatePhone, formatPhone } from "../../shared/validators.js";
import { ORIGINE_OPTS, TYPE_CONTACT_OPTS, TYPE_RESSOURCE_OPTS, STATUT_OPTS } from "../../domains/contacts/constants.js";
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

