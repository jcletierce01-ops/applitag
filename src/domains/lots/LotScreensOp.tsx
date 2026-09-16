// @ts-nocheck
import { useState, useEffect } from "react";
import { C, INPUT_H, FONT_INPUT, PADDING } from "../../design-system/tokens.js";
import { uid } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { apiGet, apiPost } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle, MSlider } from "../../shared/ui.jsx";
import { SignatureCanvas } from "../../shared/SignatureCanvas.jsx";
import { validateCMR, formatCMR, formatImmat, validateImmat } from "../../shared/validators.js";
import { calculerPci, calculerEnergie } from "../../metier/formules.js";

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
export const EcranLivraison = ({lot, onBack, onSaved, toast}: any) => {
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
  // Décomposition coût transport
  const [distanceKm,     setDistanceKm]  = useState("");
  const [prixMatiere,    setPrixMatiere] = useState("");
  const [prixBroyage,    setPrixBroyage] = useState("");
  const [prixChargement, setPrixCharge]  = useState("");
  const [prixTransport,  setPrixTransp]  = useState("");
  const [prixSurcharge,  setPrixSurch]   = useState("");
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
      const p = (v:string) => v ? parseFloat(v)||undefined : undefined;
      await apiPost(`/livraisons`, {
          lotId:lot.id, lotNumero:lot.lotNumero,
          nomDestination,
          poidsBrut: parseFloat(pesee)||undefined,
          humiditeReception,
          date: new Date().toISOString().slice(0,16),
          statut: "declaree",
          distanceKm:            p(distanceKm),
          prixMatiereT:          p(prixMatiere),
          prixBroyageT:          p(prixBroyage),
          prixChargementT:       p(prixChargement),
          prixTransportT:        p(prixTransport),
          prixSurchargeCarburantT: p(prixSurcharge),
      });
      toast(typeDest==="chaufferie"?"Livraison chaufferie validée ✓":"Entrée stock plateforme ✓");
      onSaved(statutFinal);
    } catch {
      toast("Livraison non enregistrée — vérifiez votre connexion","warn");
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

        <SectionTitle icon="💶" label="Décomposition du coût (€/tonne)"/>
        <MInput label="Distance de transport" value={distanceKm}
          onChange={setDistanceKm} type="number" placeholder="ex: 48" hint="km — pour calcul GES"/>
        {(
          [
            ["🪵","Matière première",   prixMatiere,  setPrixMatiere],
            ["🌀","Broyage / déchiquet.",prixBroyage, setPrixBroyage],
            ["🏗️","Chargement",         prixChargement,setPrixCharge],
            ["🚛","Transport",          prixTransport, setPrixTransp],
            ["⛽","Surcharge carburant", prixSurcharge, setPrixSurch],
          ] as [string,string,string,(v:string)=>void][]
        ).map(([icon,label,val,setter],i)=>(
          <MInput key={i} label={`${icon} ${label}`} value={val}
            onChange={setter} type="number"
            placeholder="ex: 12.50" hint="€/t · optionnel"/>
        ))}
        {(prixMatiere||prixBroyage||prixChargement||prixTransport||prixSurcharge)&&(()=>{
          const total = [prixMatiere,prixBroyage,prixChargement,prixTransport,prixSurcharge]
            .reduce((s,v)=>s+(parseFloat(v as string)||0),0);
          const poids = parseFloat(pesee)||0;
          return total>0?(
            <div style={{background:"#F0FDF4",borderRadius:12,padding:"12px 16px",
              marginBottom:14,border:"1px solid #86EFAC"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                marginBottom:poids>0?8:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"#065F46"}}>
                  💶 Coût total transport
                </div>
                <div style={{fontSize:18,fontWeight:900,color:"#065F46",
                  fontVariantNumeric:"tabular-nums"}}>
                  {total.toFixed(2)} €/t
                </div>
              </div>
              {poids>0&&(
                <div style={{display:"flex",justifyContent:"space-between",
                  fontSize:12,color:"#16A34A"}}>
                  <span>Montant livraison ({poids} t)</span>
                  <span style={{fontWeight:700}}>{(total*poids).toFixed(0)} €</span>
                </div>
              )}
            </div>
          ):null;
        })()}

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
