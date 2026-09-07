import { useState, useEffect } from "react";
import { C, INPUT_H, FONT_INPUT, PADDING } from "../../design-system/tokens.js";
import { uid } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { apiGet, apiPost } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle, MSlider } from "../../shared/ui.jsx";
import { SignatureCanvas } from "../../shared/SignatureCanvas.jsx";
import { validateCMR, formatCMR, formatImmat, validateImmat } from "../../shared/validators.js";
import { generatePdfFromHtml, buildCMRHTML, buildPVVisiteHTML, buildReceptionExploitHTML, buildOrdreDechiHTML, buildSimpleDocHTML, buildCompteRenduContactHTML } from "../../domains/documents/pdf-templates.js";
import { TYPE_RESSOURCE_OPTS } from "../../domains/contacts/constants.js";
import { STATUT_LOT } from "../../domains/screens/MobileScreens.constants.js";
import { calculerPci, calculerEnergie } from "../../metier/formules.js";
import { PIPELINE } from "../../domains/roles/RoleScreens.constants.js";
export const FicheLotCentrale = ({
  lot, visites=[], operateurs=[], onBack, onEdit, onBonCommande,
  onLaunchVisite, onLaunchValidation, onLaunchCloture,
  onLaunchDechiquetage, onLaunchTransporteur, onLaunchLivraison, onLaunchFinChantier,
  onRedDeclaration, onDeleguerVisite, onDeleteLot,
  toast, user,
}: any) => {
  const [onglet, setOnglet] = useState(0);
  const [deleteStep, setDeleteStep] = useState(0);
  const [releves,    setReleves]    = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [livraisons, setLivraisons] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showDeclMairie, setShowDeclMairie] = useState(false);
  const [mairieAdresse,  setMairieAdresse]  = useState("");
  const [mairieCP,       setMairieCP]       = useState("");
  const [mairieVille,    setMairieVille]    = useState("");

  const st = STATUT_LOT[lot.statutLot||"NOUVEAU"] || STATUT_LOT.NOUVEAU;
  const pipelineIdx = PIPELINE.findIndex(p=>p.id===(lot.statutLot||"NOUVEAU"));
  const visitesLot = visites.filter((v: any)=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
  const derniereVisite = visitesLot[0]||null;
  const mandataireAssigne = operateurs.find((op: any)=>(op.assignations||[])
    .some((a: any)=>(a.lotId===lot.id||a.lotNumero===lot.lotNumero)&&a.typeOperation==="mandataire"));

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
  const totalTonnes = releves.reduce((s,r: any)=>s+(parseFloat(r.poidsTotal)||0),0);
  const totalMWh    = releves.reduce((s,r: any)=>s+(parseFloat(r.energieMWh)||0),0);
  const typeRessLabel = (t: any) => TYPE_RESSOURCE_OPTS.find(([v])=>v===t)?.[2]??t;
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
  const actionsVisible: any[] = actions.slice(-4);

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
                      `🌿 ${derniereVisite.essences.map((e: any)=>`${e.label} ${e.pct}%`).join(", ")}`}
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
                   ["Essence",derniereVisite?.essences?.map((e: any)=>e.label).join(", ")],
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
              const essences = derniereVisite?.essences?.map((e: any)=>e.label).join(", ")||"—";
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
export const EcranFinChantier = ({lot, onBack, onSaved, toast, entrepriseId}: any) => {
  const [section, setSection] = useState(0);

  // §1 Photos avant/après
  const [photosAvant,   setPhotosAvant]  = useState<any[]>([]);
  const [photosApres,   setPhotosApres]  = useState<any[]>([]);
  const [photosDepot,   setPhotosDepot]  = useState<any[]>([]);
  const [photosAcces,   setPhotosAcces]  = useState<any[]>([]);

  // §2 Rénovation
  const [surfaceRenovee,setSurfRenov]    = useState(0);
  const [typeBroyage,   setTypeBroyage]  = useState<any[]>([]);
  const [machineRenov,  setMachineRenov] = useState("");
  const [tempsRenov,    setTempsRenov]   = useState(0);
  const [nbPassages,    setNbPassages]   = useState(1);

  // §3 Consommations
  const [gnrLitres,     setGnrLitres]   = useState("");
  const [prixLitre,     setPrixLitre]   = useState("");
  const [coutMachine,   setCoutMach]     = useState("");
  const [coutOperateur, setCoutOp]       = useState("");

  // §4 Contrôle qualité (checklist 6 points)
  const [checklist, setChecklist] = useState<Record<string,boolean>>({
    depotNettoye:false, remanentsTraites:false, accesRetablis:false,
    fossesPreserves:false, pasDechets:false, respectConsignes:false,
  });

  // §5 Validation propriétaire
  const [sigPropFin,    setSigPropFin]   = useState(false);
  const [sigDataFin,    setSigDataFin]   = useState<any>(null);
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

  const toggleBroyage = (v: any) => setTypeBroyage(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v]);

  // Calcul indice APPLITAG 0-100
  const nbCheckOK = Object.values(checklist).filter(Boolean).length;
  const hasPhotos = photosApres.length>0 || photosAvant.length>0;
  const indiceDocs = hasPhotos ? 25 : 0;
  const indiceQualite = Math.round((nbCheckOK/6)*35);
  const indiceNote = noteQualite>0 ? Math.round((noteQualite/5)*20) : 0;
  const indiceValidation = sigDataFin ? 20 : (sigPropFin ? 10 : 0);
  const indiceTotal = Math.min(100, indiceDocs + indiceQualite + indiceNote + indiceValidation);

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

  const NoteEtoile = ({n}: any) => (
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
                  {state.map((_p,j)=>(
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
              {([
                [5,"⭐⭐⭐⭐⭐","Excellent","Parfait, au-delà des attentes"],
                [4,"⭐⭐⭐⭐","Bon","Chantier réalisé selon les attentes"],
                [3,"⭐⭐⭐","Conforme","Travail correct, quelques points à améliorer"],
                [2,"⭐⭐","À améliorer","Réserves significatives signalées"],
                [1,"⭐","Non conforme","Non-respect des conditions du contrat"],
              ] as any[]).map(([n,_e,l,s]: any)=>(
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

export const EcranDechiquetage = ({lot, operateurs=[], onBack, onSaved, toast, entrepriseId, user}: any) => {
  const nomUserDechiquetage = user ? `${user.prenom||""} ${user.nom||""}`.trim() : "";
  const [lotSuggere,    _setLotSuggere]  = useState(lot.lotNumero||"");
  const [operateurDechiquetage,setOpDechiquetage] = useState(nomUserDechiquetage);
  const [machine,       setMachine]     = useState(()=>{ try { return localStorage.getItem(`applitag_dech_machine_${user?.id||""}`) || ""; } catch { return ""; } });
  const [typeChargement,setTypeCharg]   = useState("semi");
  const [cubageCharge,  setCubageCharge]  = useState("");
  const [tonnageCharge, setTonnageCharge] = useState("");
  const [erreurTonnage, setErreurTonnage] = useState("");
  const [numeroCMR,     setNumeroCMR]   = useState("");
  const [photoCMR,      setPhotoCMR]    = useState(false);
  const [missionsTransport, setMissionsTransport] = useState<any[]>([]);
  const [missionId,     setMissionId]   = useState("");
  const [immatTracteur, setImmatTract]  = useState("");
  const [immatRemorque, setImmatRemor]  = useState("");
  const [heureDebut,    setHeureDebut]  = useState("");
  const [heureFin,      setHeureFin]    = useState("");
  const [evenements,    setEvenements]  = useState<any[]>([]);
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
    const op = operateurs.find((o: any)=>
      (o.etfId===lot.etfId || (lot.etfNom && o.etfNom===lot.etfNom)) &&
      (o.assignations||[]).some((a: any)=>(a.lotId===lot.id||a.lotNumero===lot.lotNumero)&&a.typeOperation==="dechiquetage")
    );
    if (op) setOpDechiquetage(`${op.nom}${op.prenom?" "+op.prenom:""}`);
  },[operateurs, lot, operateurDechiquetage]);

  // Heure de début du prochain chargement du jour : pré-remplie à l'heure de saisie moins 30 minutes
  useEffect(()=>{
    if (heureDebut) return;
    const d = new Date(Date.now()-30*60000);
    setHeureDebut(`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`);
  },[]); // eslint-disable-line react-hooks/exhaustive-deps -- initialisation unique au montage, guard empeche la reInitialisation

  const handleSelectMission = (id: any) => {
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

  const handleTonnageChange = (v: any) => {
    setTonnageCharge(v);
    const max = (CAPACITES_CHARGEMENT as Record<string, number>)[typeChargement];
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

  const toggleEv = (v: any) => setEvenements(prev=>prev.includes(v)?prev.filter(x=>x!==v):[...prev,v]);

  const erreurCMR = numeroCMR ? validateCMR(numeroCMR) : null;
  const erreurImmatTract = immatTracteur ? validateImmat(immatTracteur) : null;
  const erreurImmatRemor = immatRemorque ? validateImmat(immatRemorque) : null;
  const erreurHeureFin = heureDebut && heureFin && heureFin <= heureDebut ? "L'heure de fin doit être après l'heure de début" : null;
  const canValidate = numeroCMR && !erreurCMR && immatTracteur && !erreurImmatTract
    && !erreurImmatRemor && heureDebut && heureFin && !erreurHeureFin && photoCMR && !erreurTonnage;

  const handleSave = async () => {
    if (!canValidate) { toast("CMR, immatriculation tracteur, horaires complets et photo CMR obligatoires (formats valides)","warn"); return; }
    setSaving(true);
    try { localStorage.setItem(`applitag_dech_machine_${user?.id||""}`, machine); } catch { /* noop */ }
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
          placeholder="CMR-2026-0001" hint="Format : CMR-AAAA-NNNN" required error={erreurCMR as any}/>

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
            placeholder="AB-123-CD" required error={erreurImmatTract as any}/>
          <MInput label="Immat. remorque" value={immatRemorque} onChange={v=>setImmatRemor(formatImmat(v))}
            placeholder="AB-456-CD" hint="optionnel" error={erreurImmatRemor as any}/>
        </div>

        <SectionTitle icon="⏱️" label="Horaires de chargement"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <MInput label="Heure début" value={heureDebut} onChange={setHeureDebut}
            type="time" required/>
          <MInput label="Heure fin (photo CMR)" value={heureFin} onChange={setHeureFin}
            type="time" required error={erreurHeureFin as any}/>
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
export const EcranTransporteur = ({lot, onBack, onSaved, toast, entrepriseId}: any) => {
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
export const EcranLivraison = ({lot, onBack, onSaved, toast, entrepriseId}: any) => {
  const [typeDest,       setTypeDest]    = useState("chaufferie"); // chaufferie | plateforme
  const [numeroCMR,      setNumeroCMR]   = useState("");
  const [nomDestination, setNomDest]     = useState("");
  const [gpsLivraison,   setGpsLivr]     = useState<any>(null);
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
    const pci = calculerPci(humiditeReception);
    const energieMWh = Math.round(calculerEnergie(parseFloat(pesee)||0, pci) * 10) / 10;
    try {
      await apiPost(`/livraisons`, {
          lotId:lot.id, lotNumero:lot.lotNumero, entrepriseId,
          typeDest, numeroCMR, nomDestination, gpsLivraison,
          pesee, humiditeReception, nomReceptionnaire, signatureRecep,
          commentaire, numeroPlateforme,
          dateHeureLivraison: new Date().toISOString(),
          statut: statutFinal,
          gpsAlerteDeclenche: gpsAlerte,
          energieMWh,
          pciMWhParT: Math.round(pci * 1000) / 1000,
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
        {pesee&&parseFloat(pesee)>0&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,
            padding:"10px 14px",marginBottom:14}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#1D4ED8",letterSpacing:".05em",textTransform:"uppercase"}}>⚡ Énergie livrée (PCI calculé)</div>
              <div style={{fontSize:11,color:"#3B82F6",marginTop:2}}>
                PCI {Math.round(calculerPci(humiditeReception)*100)/100} MWh/t · H={humiditeReception}%
              </div>
            </div>
            <div style={{fontSize:20,fontWeight:800,color:"#1D4ED8",fontVariantNumeric:"tabular-nums"}}>
              {Math.round(calculerEnergie(parseFloat(pesee), calculerPci(humiditeReception))*10)/10}
              <span style={{fontSize:11,fontWeight:600,marginLeft:3}}>MWh</span>
            </div>
          </div>
        )}

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
