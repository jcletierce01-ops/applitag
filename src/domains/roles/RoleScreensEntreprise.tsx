// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { fmtNum } from "../../shared/format.js";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle } from "../../shared/ui.jsx";
import { generatePdfFromHtml, buildRedHTML } from "../../domains/documents/pdf-templates.js";
import { STATUT_LOT } from "../../domains/screens/MobileScreens.constants.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── ENTREPRISE SOLLICITÉE ─────────────────────────────────────────────────────
const FONCTIONS_ETF = [
  {value:"abattage",     label:"Opérateur abattage"},
  {value:"debardage",    label:"Porteur / débardeur"},
  {value:"dechiquetage", label:"Broyeur / déchiqueteur"},
  {value:"chargement",   label:"Chargeur / grutier"},
  {value:"chauffeur",    label:"Chauffeur camion"},
  {value:"stockage",     label:"Gestionnaire plateforme"},
  {value:"controle",     label:"Contrôle / pesée"},
];

export const EcranEntrepriseSollicitee = ({user, lots=[], toast}: any) => {
  const storageKey = `applitag_etf_operateurs_${user.id}`;
  const [operateurs, setOperateurs] = useState<any[]>(()=>{
    try{const s=localStorage.getItem(storageKey);return s?JSON.parse(s):[]}catch{return[]}
  });
  const [showForm,   setShowForm]   = useState(false);
  const [ajoutSaving,setAjoutSaving]= useState(false);
  const [pinModal,   setPinModal]   = useState<{nom:string;prenom:string;pin:string}|null>(null);
  const [nom,        setNom]        = useState("");
  const [prenom,     setPrenom]     = useState("");
  const [fonction,   setFonction]   = useState("abattage");
  const [lotId,      setLotId]      = useState("");

  useEffect(() => {
    apiGet('/operateurs-etf').then((r: any) => {
      if (Array.isArray(r) && r.length > 0) {
        setOperateurs(r);
        try { localStorage.setItem(storageKey, JSON.stringify(r)); } catch { /* noop */ }
      }
    }).catch(() => {});
  }, [storageKey]);

  const lotsEtf = lots.filter((l: any)=>
    l.etfNom===(user.nomEntreprise||user.nom) ||
    l.etfId===user.id
  );

  const save = (list: any[]) => {
    setOperateurs(list);
    try{localStorage.setItem(storageKey,JSON.stringify(list))} catch { /* noop */ }
  };

  const handleAjouter = async () => {
    if(!nom.trim()||!prenom.trim()||!lotId){
      toast("Renseignez nom, prénom et lot assigné","warn"); return;
    }
    setAjoutSaving(true);
    const lotNumero = lots.find((l: any)=>l.id===lotId)?.lotNumero||lotId;
    try {
      const result: any = await apiPost('/operateurs-etf', {
        nom: nom.trim(), prenom: prenom.trim(),
        etfNom: user.nomEntreprise||user.nom||"",
        lotId,
      });
      const saved = {
        ...result, fonction, lotId, lotNumero,
        dateCreation: new Date().toLocaleDateString("fr-FR"),
      };
      save([...operateurs, saved]);
      if (result.pinClair) setPinModal({ nom: result.nom, prenom: result.prenom, pin: result.pinClair });
      else toast("Opérateur ajouté ✓");
    } catch {
      // Hors ligne : enregistrement local sans PIN ; le PIN sera généré à la reconnexion
      const nouvel = {
        id: Date.now().toString(),
        nom: nom.trim(), prenom: prenom.trim(),
        fonction, lotId, lotNumero,
        dateCreation: new Date().toLocaleDateString("fr-FR"),
      };
      save([...operateurs, nouvel]);
      toast("Opérateur ajouté localement — PIN généré à la reconnexion","warn");
    }
    setNom(""); setPrenom(""); setFonction("abattage"); setLotId("");
    setShowForm(false);
    setAjoutSaving(false);
  };

  const handleSupprimer = (id: any) => {
    save(operateurs.filter((o: any)=>o.id!==id));
    apiDelete(`/operateurs-etf/${id}`).catch(() => {});
  };

  const fonctionLabel = (v: any) => FONCTIONS_ETF.find(f=>f.value===v)?.label||v;

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40,marginBottom:8}}>🏢</div>
        <div style={{fontSize:18,fontWeight:700}}>{user.nomEntreprise||user.prenom+" "+user.nom}</div>
        <div style={{fontSize:12,color:C.tx3,marginTop:4,lineHeight:1.6,maxWidth:300,margin:"6px auto 0"}}>
          Espace réservé aux entreprises de travaux forestiers mandatées pour intervenir sur chantier.
          Déléguez vos missions à vos opérateurs.
        </div>
      </div>

      {/* Lots attribués */}
      {lotsEtf.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:C.tx2,marginBottom:8,textTransform:"uppercase",letterSpacing:".5px"}}>
            Lots attribués à votre entreprise
          </div>
          {lotsEtf.map((lot: any)=>(
            <div key={lot.id} style={{background:"#fff",borderRadius:12,padding:"10px 14px",
              marginBottom:8,border:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.purpleD}}>{lot.lotNumero}</div>
                <div style={{fontSize:11,color:C.tx3,marginTop:2}}>📍 {lot.commune} · {lot.surfaceHa} ha</div>
              </div>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:6,
                background:"#EDE7F6",color:C.purpleD,fontWeight:600}}>
                {operateurs.filter((o: any)=>o.lotId===lot.id).length} opér.
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Liste opérateurs */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.tx2,textTransform:"uppercase",letterSpacing:".5px"}}>
          Opérateurs créés ({operateurs.length})
        </div>
        <button onClick={()=>setShowForm(s=>!s)}
          style={{padding:"6px 14px",borderRadius:20,border:"none",
            background:C.purpleD,color:"#fff",fontSize:12,fontWeight:600,
            cursor:"pointer",fontFamily:"inherit"}}>
          {showForm?"✕ Annuler":"+ Ajouter"}
        </button>
      </div>

      {/* Formulaire ajout */}
      {showForm&&(
        <div style={{background:"#F3F0FF",borderRadius:14,padding:16,marginBottom:16,
          border:"1.5px solid #B39DDB"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.purpleD,marginBottom:12}}>
            Nouvel opérateur
          </div>
          <MInput label="Prénom" value={prenom} onChange={setPrenom} placeholder="ex : Pierre"/>
          <MInput label="Nom" value={nom} onChange={setNom} placeholder="ex : Dupont"/>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Fonction</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {FONCTIONS_ETF.map(f=>(
                <button key={f.value} onClick={()=>setFonction(f.value)}
                  style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${fonction===f.value?C.purpleD:C.bd}`,
                    background:fonction===f.value?"#EDE7F6":"#fff",
                    color:fonction===f.value?C.purpleD:C.tx,
                    fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Lot assigné</div>
            <select value={lotId} onChange={e=>setLotId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,
                border:`1.5px solid ${C.bd}`,background:"#fff",
                fontFamily:"inherit",fontSize:13,color:C.tx}}>
              <option value="">— Choisir un lot —</option>
              {lotsEtf.length>0
                ? lotsEtf.map((l: any)=><option key={l.id} value={l.id}>{l.lotNumero} · {l.commune}</option>)
                : lots.map((l: any)=><option key={l.id} value={l.id}>{l.lotNumero} · {l.commune}</option>)
              }
            </select>
          </div>
          <button onClick={handleAjouter} disabled={ajoutSaving}
            style={{width:"100%",padding:13,borderRadius:12,border:"none",
              background:ajoutSaving?"#9575CD":C.purpleD,color:"#fff",fontSize:14,fontWeight:700,
              cursor:ajoutSaving?"not-allowed":"pointer",fontFamily:"inherit"}}>
            {ajoutSaving?"⏳ Création…":"✅ Créer l'opérateur"}
          </button>
        </div>
      )}

      {/* Modal PIN — affiché une seule fois après création */}
      {pinModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:3000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"#fff",borderRadius:20,padding:24,maxWidth:320,width:"100%",
            boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36,marginBottom:8}}>🔑</div>
              <div style={{fontSize:16,fontWeight:800}}>PIN de {pinModal.prenom} {pinModal.nom}</div>
              <div style={{fontSize:12,color:C.tx3,marginTop:6,lineHeight:1.5}}>
                Communiquez ce code à l'opérateur.<br/>
                <strong style={{color:"#B71C1C"}}>Il ne sera affiché qu'une seule fois.</strong>
              </div>
            </div>
            <div style={{background:"#F3F0FF",borderRadius:14,padding:20,textAlign:"center",
              border:"2px solid #B39DDB",marginBottom:20}}>
              <div style={{fontFamily:"monospace",fontSize:44,fontWeight:900,
                color:C.purpleD,letterSpacing:10}}>{pinModal.pin}</div>
            </div>
            <button onClick={()=>setPinModal(null)}
              style={{width:"100%",padding:14,borderRadius:12,border:"none",
                background:C.purpleD,color:"#fff",fontSize:14,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit"}}>
              ✓ J'ai noté le PIN
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {operateurs.length===0?(
        <div style={{background:C.bg2,borderRadius:14,padding:20,textAlign:"center",color:C.tx3,fontSize:13}}>
          Aucun opérateur créé pour l'instant.<br/>Appuyez sur "+ Ajouter" pour commencer.
        </div>
      ):operateurs.map((op: any)=>(
        <div key={op.id} style={{background:"#fff",borderRadius:14,padding:"12px 14px",
          marginBottom:10,border:`1px solid ${C.bd}`,
          display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:20,background:"#EDE7F6",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,flexShrink:0}}>
            👷
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700}}>{op.prenom} {op.nom}</div>
            <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
              {fonctionLabel(op.fonction)} · {op.lotNumero}
            </div>
          </div>
          <button onClick={()=>handleSupprimer(op.id)}
            style={{background:"none",border:"none",color:"#EF9A9A",
              fontSize:18,cursor:"pointer",padding:4}}>
            ✕
          </button>
        </div>
      ))}
      <div style={{height:32}}/>
    </div>
  );
};

export const EcranRoleChaufferie = ({user, livraisons=[], toast, onRefresh}: any) => {
  const [onglet, setOnglet]   = useState<"attente"|"verifiees">("attente");
  // État local des vérifications en cours : {[id]: {numTicket, sending, done, error}}
  const [pesees, setPesees]   = useState<Record<string,any>>({});

  const enAttente  = livraisons.filter((l: any) => !l.peseeVerifiee && l.statut !== "verifiee");
  const verifiees  = livraisons.filter((l: any) => l.peseeVerifiee || l.statut === "verifiee");
  const tonnageTotal    = livraisons.reduce((s: any, l: any) => s + (l.poidsNet ?? l.poidsBrut ?? 0), 0);
  const tonnageVerifie  = verifiees.reduce((s: any, l: any) => s + (l.poidsNet ?? l.poidsBrut ?? 0), 0);

  const humBadge = (h: number | null) => {
    if (h === null || h === undefined) return {bg:C.bg2, tx:C.tx3, label:"Humidité NC"};
    if (h <= 30) return {bg:C.greenL, tx:C.greenD, label:`💧 ${h}% — Conforme`};
    if (h <= 45) return {bg:C.amberL, tx:C.amberD, label:`💧 ${h}% — Élevée`};
    return {bg:"#FEE2E2", tx:"#991B1B", label:`💧 ${h}% — Hors normes`};
  };

  const handleConfirmer = async (l: any) => {
    const ticket = pesees[l.id]?.numTicket ?? "";
    setPesees(p => ({...p, [l.id]: {...p[l.id], sending:true, error:undefined}}));
    try {
      await apiPatch(`/livraisons/${l.id}/pesee`, {peseeVerifiee: true, numTicket: ticket || undefined});
      setPesees(p => ({...p, [l.id]: {...p[l.id], sending:false, done:true}}));
      toast?.("Pesée vérifiée ✓");
      onRefresh?.();
    } catch (e: any) {
      setPesees(p => ({...p, [l.id]: {...p[l.id], sending:false, error: e?.message ?? "Erreur réseau"}}));
    }
  };

  const renderCard = (l: any) => {
    const poids  = l.poidsNet ?? (l.poidsBrut && l.tare ? l.poidsBrut - l.tare : l.poidsBrut);
    const hum    = humBadge(l.humiditeReception);
    const done   = pesees[l.id]?.done || l.peseeVerifiee || l.statut === "verifiee";
    const p      = pesees[l.id] ?? {};
    return (
      <div key={l.id} style={{background:"#fff",borderRadius:14,padding:16,marginBottom:10,
        border:`1.5px solid ${done ? C.green : C.bd}`}}>
        {/* En-tête lot + date */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD}}>{l.lotNumero}</div>
          <div style={{fontSize:11,color:C.tx3}}>{l.date?.slice(0,10)}</div>
        </div>
        {/* Infos livraison */}
        <div style={{fontSize:12,color:C.tx2,lineHeight:1.9,marginBottom:8}}>
          {l.nomDestination && <div>📍 {l.nomDestination}</div>}
          {l.numeroBL       && <div>📄 BL / CMR : {l.numeroBL}</div>}
          <div>⚖️ Brut {fmtNum(l.poidsBrut ?? 0)} t · Tare {fmtNum(l.tare ?? 0)} t
            {poids ? <> · <strong>Net {fmtNum(poids)} t</strong></> : ""}</div>
          {l.numTicket      && <div>🎫 Ticket : {l.numTicket}</div>}
        </div>
        {/* Badge humidité */}
        <div style={{padding:"6px 10px",borderRadius:8,fontSize:11,fontWeight:600,
          background:hum.bg, color:hum.tx, marginBottom:done ? 0 : 10}}>
          {hum.label}
        </div>
        {/* Formulaire confirmation (seulement si pas encore vérifiée) */}
        {!done && (
          <>
            <div style={{marginTop:10, marginBottom:8}}>
              <MInput label="N° ticket chaufferie (optionnel)"
                value={p.numTicket ?? ""}
                onChange={(v: string) => setPesees(prev => ({...prev, [l.id]: {...prev[l.id], numTicket:v}}))}/>
            </div>
            {p.error && (
              <div style={{fontSize:11,color:"#DC2626",marginBottom:8,padding:"6px 10px",
                background:"#FEF2F2",borderRadius:6}}>⚠ {p.error}</div>
            )}
            <button onClick={() => handleConfirmer(l)}
              disabled={p.sending}
              style={{width:"100%",padding:12,borderRadius:10,
                background:p.sending ? C.tx3 : C.green, color:"#fff", border:"none",
                fontFamily:"inherit", fontSize:13, fontWeight:600,
                cursor:p.sending ? "not-allowed" : "pointer",
                WebkitTapHighlightColor:"transparent"}}>
              {p.sending ? "Envoi…" : "✅ Confirmer la pesée"}
            </button>
          </>
        )}
        {done && (
          <div style={{marginTop:8,fontSize:12,color:C.greenD,fontWeight:600,
            background:C.greenL,borderRadius:8,padding:"6px 10px",textAlign:"center"}}>
            ✓ Pesée vérifiée
          </div>
        )}
      </div>
    );
  };

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      {/* En-tête */}
      <div style={{textAlign:"center",padding:"20px 0 14px"}}>
        <div style={{fontSize:36}}>🔥</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:6}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:12,color:C.tx3,marginTop:3}}>Réception chaufferie</div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[
          [enAttente.length+" lot"+(enAttente.length!==1?"s":""), "En attente", C.amberL, C.amberD],
          [fmtNum(tonnageTotal,1)+" t",   "Total reçu",    C.bg2,   C.tx2],
          [fmtNum(tonnageVerifie,1)+" t", "Vérifié",       C.greenL, C.greenD],
        ].map(([v,l,bg,tx],i)=>(
          <div key={i} style={{background:bg,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:tx}}>{v}</div>
            <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {([["attente","En attente",enAttente.length],["verifiees","Vérifiées",verifiees.length]] as const).map(([id,label,n])=>(
          <button key={id} onClick={()=>setOnglet(id)} style={{
            flex:1, padding:"9px 0", borderRadius:10, fontSize:12, fontWeight:onglet===id?700:400,
            background:onglet===id?"#fff":C.bg2, color:onglet===id?C.tx:C.tx3,
            border:`1.5px solid ${onglet===id?C.bd:"transparent"}`,
            cursor:"pointer", fontFamily:"inherit"}}>
            {label}{n>0?<> <span style={{background:onglet===id?C.greenL:C.bg,color:onglet===id?C.greenD:C.tx3,
              borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700}}>{n}</span></>:""}
          </button>
        ))}
      </div>

      {/* Listes */}
      {onglet==="attente" && (
        enAttente.length===0
          ? <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>✅</div>
              <div style={{marginTop:8,fontSize:13}}>Toutes les pesées sont vérifiées</div>
            </div>
          : enAttente.map(renderCard)
      )}
      {onglet==="verifiees" && (
        verifiees.length===0
          ? <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>⏳</div>
              <div style={{marginTop:8,fontSize:13}}>Aucune pesée vérifiée pour l'instant</div>
            </div>
          : verifiees.map(renderCard)
      )}
    </div>
  );
};

// ── RÉCEPTIONNAIRE PLATEFORME DE STOCKAGE ─────────────────────
export const EcranRoleReceptionnaire = ({user, livraisons=[], contacts=[], visites=[], toast, refresh}: any) => {
  const [onglet, setOnglet] = useState("attente"); // "attente" | "stock" | "historique"
  const [humidite, setHumidite] = useState<Record<string,any>>({});
  const [numTickets, setNumTickets] = useState<Record<string,string>>({});
  const [confirmes, setConfirmes] = useState<Record<string,any>>({});
  const [saving, setSaving] = useState<Record<string,boolean>>({});
  const [lotStockSelec, setLotStockSelec] = useState<any>(null); // lot contact ouvert dans "En stock"
  const [rechercheHisto, setRechercheHisto] = useState("");

  const platLivs = livraisons; // toutes les livraisons de ce réceptionnaire (filtrées par l'API)
  const enAttente = platLivs.filter((l: any)=>!l.statut||l.statut==="declaree");
  const recues    = platLivs.filter((l: any)=>l.statut==="verifiee"||confirmes[l.id]);
  const enStock   = contacts.filter((c: any)=>["BORD_ROUTE","A_DECHIQUETER","EN_STOCK_PLATEFORME"].includes(c.statutLot));
  const tonnageStock = platLivs.filter((l: any)=>l.statut==="verifiee"||confirmes[l.id]).reduce((s: any,l: any)=>s+((l.poidsNet||l.poidsBrut)||0),0);
  const tonnageRecus = recues.reduce((s: any,l: any)=>s+((l.poidsNet||l.poidsBrut)||0),0);

  const handleConfirmer = async (l: any) => {
    const h = humidite[l.id];
    if (!h) return;
    setSaving(p=>({...p,[l.id]:true}));
    try {
      await apiPatch(`/livraisons/${l.id}/pesee`, {
        peseeVerifiee: true,
        humiditeReception: parseFloat(h),
        ...(numTickets[l.id] ? { numTicket: numTickets[l.id] } : {}),
      });
      setConfirmes(p=>({...p,[l.id]:true}));
      toast("Réception enregistrée ✓");
      if (refresh) refresh();
    } catch (e: any) {
      toast("Erreur : " + (e.message || "impossible de confirmer"));
    } finally {
      setSaving(p=>({...p,[l.id]:false}));
    }
  };

  const enAttenteVisibles = enAttente.filter((l: any)=>!confirmes[l.id]);
  const tabs = [
    {id:"attente",   label:"En attente",  badge:enAttenteVisibles.length},
    {id:"stock",     label:"En stock",    badge:enStock.length},
    {id:"historique",label:"Historique",  badge:null},
  ];

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"20px 0 14px"}}>
        <div style={{fontSize:36}}>🏗️</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:6}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:12,color:C.tx3,marginTop:3}}>Plateforme de stockage bois énergie</div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[
          [enAttenteVisibles.length+" lot"+(enAttenteVisibles.length>1?"s":""),"En attente","#E3F2FD","#1565C0"],
          [fmtNum(tonnageStock,1)+" t","En stock","#E8F5E9",C.greenD],
          [fmtNum(tonnageRecus,1)+" t","Reçu total",C.amberL,C.amberD],
        ].map(([v,l,bg,tc],i)=>(
          <div key={i} style={{background:bg,borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:tc}}>{v}</div>
            <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setOnglet(t.id)} style={{
            flex:1,padding:"9px 0",borderRadius:10,fontSize:12,fontWeight:onglet===t.id?700:400,
            border:`1.5px solid ${onglet===t.id?"#1565C0":C.bd}`,
            background:onglet===t.id?"#E3F2FD":"#fff",
            color:onglet===t.id?"#1565C0":C.tx2,
            cursor:"pointer",fontFamily:"inherit",position:"relative",
            WebkitTapHighlightColor:"transparent"}}>
            {t.label}
            {t.badge>0&&<span style={{position:"absolute",top:-5,right:-5,
              background:"#1565C0",color:"#fff",fontSize:9,fontWeight:700,
              borderRadius:"50%",width:16,height:16,display:"flex",
              alignItems:"center",justifyContent:"center"}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Livraisons en attente */}
      {onglet==="attente"&&(
        <div>
          {enAttente.length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>✅</div>
              <div style={{marginTop:8}}>Aucune livraison en attente</div>
            </div>
          )}
          {enAttente.filter((l: any)=>!confirmes[l.id]).map((l: any,i: any)=>{
            const h = humidite[l.id]||"";
            const visite = visites.find((v: any)=>v.lotId===l.lotId);
            const isRed = visite?.certification==="red";
            return (
              <div key={l.id||i} style={{background:"#fff",borderRadius:14,padding:16,
                marginBottom:12,border:`2px solid ${isRed?"#E65100":"#1565C0"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                      color:isRed?"#E65100":"#1565C0"}}>
                      {l.lotNumero}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:1}}>🌿 Plaquettes forestières</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {isRed&&(
                      <div style={{background:"#FFF3E0",color:"#E65100",padding:"3px 8px",
                        borderRadius:6,fontSize:10,fontWeight:700,
                        border:"1px solid #E65100"}}>⚡ RED</div>
                    )}
                    {!isRed&&visite&&(
                      <div style={{background:C.bg2,color:C.tx3,padding:"3px 8px",
                        borderRadius:6,fontSize:10,fontWeight:600}}>Hors RED</div>
                    )}
                    <div style={{background:"#E3F2FD",color:"#1565C0",padding:"3px 8px",
                      borderRadius:6,fontSize:10,fontWeight:600}}>⏳ En attente</div>
                  </div>
                </div>
                {isRed&&(
                  <div style={{background:"#FFF3E0",border:"1px solid #E65100",borderRadius:8,
                    padding:"8px 10px",marginBottom:10,fontSize:11,color:"#BF360C",lineHeight:1.5}}>
                    ⚡ <strong>Lot soumis à la directive RED</strong> — traçabilité renforcée requise.
                    Conservez le CMR et les documents de durabilité.
                    {visite?.numeroCertification&&<> · Certif. {visite.certification?.toUpperCase()} n° {visite.numeroCertification}</>}
                  </div>
                )}
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.9,marginBottom:12}}>
                  {l.nomDestination&&<>🏭 {l.nomDestination}<br/></>}
                  🚛 BL : {l.numeroBL||"—"}<br/>
                  ⚖️ Pesée transport : <strong style={{color:C.tx}}>{(l.poidsNet||l.poidsBrut||0)} t</strong><br/>
                  📅 {new Date(l.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:6}}>
                    🎫 N° ticket chaufferie (optionnel)
                  </div>
                  <input type="text" value={numTickets[l.id]||""}
                    onChange={e=>setNumTickets(p=>({...p,[l.id]:e.target.value}))}
                    placeholder="Ex : TK-2026-001"
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:13,
                      border:`1.5px solid ${numTickets[l.id]?C.green:C.bd}`,fontFamily:"inherit",
                      background:"#fff",boxSizing:"border-box"}}/>
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:6}}>
                    💧 Taux d'humidité à réception (%) *
                  </div>
                  <input type="number" min={0} max={100} value={h}
                    onChange={e=>setHumidite(p=>({...p,[l.id]:e.target.value}))}
                    placeholder="Ex : 28"
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${h?C.green:C.bd}`,fontFamily:"inherit",
                      background:"#fff",boxSizing:"border-box"}}/>
                  {h&&(
                    <div style={{fontSize:11,marginTop:4,fontWeight:600,
                      color:h<=30?C.greenD:h<=45?C.amberD:C.red}}>
                      {h<=30?"✅ Conforme":h<=45?"⚠️ Humidité élevée":"🔴 Hors normes (>45%)"}
                    </div>
                  )}
                </div>
                <button onClick={()=>handleConfirmer(l)}
                  disabled={!h||saving[l.id]}
                  style={{width:"100%",padding:13,borderRadius:10,
                    background:h&&!saving[l.id]?"#1565C0":C.bg2,
                    color:h&&!saving[l.id]?"#fff":C.tx3,
                    border:"none",fontFamily:"inherit",fontSize:14,fontWeight:700,
                    cursor:h&&!saving[l.id]?"pointer":"not-allowed",
                    WebkitTapHighlightColor:"transparent"}}>
                  {saving[l.id]?"⏳ Enregistrement…":"✅ Confirmer la réception"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Lots en stock */}
      {onglet==="stock"&&!lotStockSelec&&(
        <div>
          {enStock.length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>📦</div>
              <div style={{marginTop:8}}>Aucun lot en stock actuellement</div>
            </div>
          )}
          {enStock.map((c: any)=>{
            const entrees = platLivs.filter((l: any)=>l.lotId===c.id&&(l.statut==="verifiee"||confirmes[l.id]));
            const tonnageLot = entrees.reduce((s: any,l: any)=>s+((l.poidsNet||l.poidsBrut)||0),0);
            return (
              <div key={c.id} onClick={()=>setLotStockSelec(c)}
                style={{background:"#fff",borderRadius:14,padding:14,marginBottom:10,
                  border:`1.5px solid ${C.bd}`,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div>
                    <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:C.greenD}}>
                      {c.lotNumero}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:1}}>🌿 Plaquettes forestières</div>
                  </div>
                  <span style={{fontSize:18,color:C.tx3}}>›</span>
                </div>
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.8}}>
                  👤 {c.prenom} {c.nom} · 📍 {c.commune}<br/>
                  📦 {entrees.length} entrée{entrees.length>1?"s":""} · ⚖️ {fmtNum(tonnageLot||c.tonnageCumul||0,1)} t stockées
                </div>
              </div>
            );
          })}
          <div style={{background:C.greenL,borderRadius:12,padding:"12px 14px",
            border:`1px solid ${C.green}`,textAlign:"center",marginTop:4}}>
            <div style={{fontSize:15,fontWeight:700,color:C.greenD}}>{fmtNum(tonnageStock,1)} t</div>
            <div style={{fontSize:11,color:C.tx3,marginTop:2}}>Tonnage total en stock plateforme</div>
          </div>
        </div>
      )}

      {/* Détail entrées d'un lot en stock */}
      {onglet==="stock"&&lotStockSelec&&(
        <div>
          <button onClick={()=>setLotStockSelec(null)}
            style={{background:"none",border:"none",color:"#1565C0",cursor:"pointer",
              fontSize:13,fontWeight:600,padding:"0 0 12px",fontFamily:"inherit"}}>
            ← Retour au stock
          </button>
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:12,
            border:`1.5px solid ${C.green}`}}>
            <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.greenD,marginBottom:4}}>
              {lotStockSelec.lotNumero}
            </div>
            <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
              🌿 Plaquettes forestières<br/>
              👤 {lotStockSelec.prenom} {lotStockSelec.nom} · 📍 {lotStockSelec.commune}<br/>
              🌲 {lotStockSelec.surfaceHa} ha
            </div>
          </div>
          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
            Historique des entrées
          </div>
          {platLivs.filter((l: any)=>l.lotId===lotStockSelec.id&&(l.statut==="verifiee"||confirmes[l.id])).length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"24px 0",fontSize:13}}>
              Aucune entrée enregistrée pour ce lot
            </div>
          )}
          {platLivs.filter((l: any)=>l.lotId===lotStockSelec.id&&(l.statut==="verifiee"||confirmes[l.id])).map((l: any,i: any)=>(
            <div key={l.id||i} style={{background:"#fff",borderRadius:12,padding:14,
              marginBottom:8,border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tx}}>Entrée {i+1}</div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.tx3}}>
                    {new Date(l.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx2}}>
                    {new Date(l.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                ⚖️ {(l.poidsNet||l.poidsBrut||0)} t · 💧 {l.humiditeReception??humidite[l.id]??"—"}%<br/>
                📄 BL : {l.numeroBL||"—"}
              </div>
              <div style={{marginTop:6,fontSize:11,fontWeight:600,
                color:(l.humiditeReception||humidite[l.id])<=30?C.greenD
                  :(l.humiditeReception||humidite[l.id])<=45?C.amberD:C.red}}>
                {(l.humiditeReception||humidite[l.id])<=30?"✅ Conforme"
                  :(l.humiditeReception||humidite[l.id])<=45?"⚠️ Humidité élevée":"🔴 Hors normes"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historique */}
      {onglet==="historique"&&(
        <div>
          <div style={{position:"relative",marginBottom:12}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",
              fontSize:15,pointerEvents:"none"}}>🔍</span>
            <input
              type="text"
              value={rechercheHisto}
              onChange={e=>setRechercheHisto(e.target.value)}
              placeholder="Rechercher par n° de lot…"
              style={{width:"100%",padding:"10px 12px 10px 36px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${rechercheHisto?C.green:C.bd}`,fontFamily:"inherit",
                background:"#fff",boxSizing:"border-box",color:C.tx}}/>
            {rechercheHisto&&(
              <button onClick={()=>setRechercheHisto("")}
                style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",cursor:"pointer",fontSize:15,color:C.tx3,
                  padding:0,lineHeight:1}}>✕</button>
            )}
          </div>
          {recues.filter((l: any)=>!rechercheHisto||l.lotNumero?.toLowerCase().includes(rechercheHisto.toLowerCase())).length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
              <div style={{fontSize:32}}>{rechercheHisto?"🔍":"📋"}</div>
              <div style={{marginTop:8}}>{rechercheHisto?"Aucun lot trouvé":"Aucune réception enregistrée"}</div>
            </div>
          )}
          {recues.filter((l: any)=>!rechercheHisto||l.lotNumero?.toLowerCase().includes(rechercheHisto.toLowerCase())).map((l: any,i: any)=>(
            <div key={l.id||i} style={{background:"#fff",borderRadius:12,padding:14,
              marginBottom:8,border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.greenD}}>
                  {l.lotNumero}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.tx3}}>
                    {new Date(l.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx2,marginTop:1}}>
                    {new Date(l.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                ⚖️ {(l.poidsNet||l.poidsBrut||0)} t · 💧 {l.humiditeReception??humidite[l.id]??"—"}% · 📄 {l.numeroBL||"—"}
              </div>
              <div style={{marginTop:6,fontSize:11,fontWeight:600,
                color:(l.humiditeReception||humidite[l.id])<=30?C.greenD:(l.humiditeReception||humidite[l.id])<=45?C.amberD:C.red}}>
                {(l.humiditeReception||humidite[l.id])<=30?"✅ Conforme":(l.humiditeReception||humidite[l.id])<=45?"⚠️ Humidité élevée":"🔴 Hors normes"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const EcranAutoDeclarationRED = ({lot, visites, transports=[], livraisons=[], onBack, toast}: any) => {
  const visite    = visites.find((v: any)=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);
  const transport = transports.find((t: any)=>t.lotId===lot.id||t.lotNumero===lot.lotNumero);
  const livraison = livraisons.find((l: any)=>l.lotId===lot.id||l.lotNumero===lot.lotNumero);

  const tonnage = parseFloat((livraison?.poidsNet||livraison?.poidsBrut||visite?.volumeEstimeT||0) as any);
  // Seuil 500 t/an → auto-déclaration, sinon déclaration durabilité
  const typeAuto = tonnage<=500 ? "auto" : "durabilite";
  const [typeDecl, setTypeDecl] = useState(typeAuto);
  const [generating, setGen]    = useState(false);

  const handleGenerer = () => {
    setGen(true);
    const html = buildRedHTML(lot, visite, transport, livraison, typeDecl);
    generatePdfFromHtml(html, `AutoDeclarationRED_${lot.lotNumero||"APPLITAG"}.pdf`, toast, ()=>setGen(false));
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
          ].map(([v,e,l,s,recommande]: any)=>(
            <div key={v as any} onClick={()=>setTypeDecl(v as any)} style={{
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
          [!!(visite?.volumeEstimeT||livraison?.poidsNet||livraison?.poidsBrut),"Tonnage renseigné"],
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

// Centroïdes département (fallback carte sans GPS visite)
const DEPT_CENTROIDS = {
  "01":[46.20,5.23],"02":[49.55,3.63],"03":[46.34,3.08],"04":[44.09,6.24],
  "05":[44.66,6.46],"06":[43.93,7.10],"07":[44.75,4.54],"08":[49.69,4.73],
  "09":[42.95,1.60],"10":[48.30,4.08],"11":[43.12,2.35],"12":[44.35,2.57],
  "13":[43.53,5.45],"14":[49.09,-0.37],"15":[45.05,2.63],"16":[45.69,0.16],
  "17":[45.75,-0.74],"18":[47.07,2.40],"19":[45.27,1.77],"21":[47.32,5.04],
  "22":[48.45,-2.90],"23":[46.00,2.02],"24":[45.15,0.72],"25":[47.24,6.02],
  "26":[44.72,5.05],"27":[49.03,1.15],"28":[48.44,1.49],"29":[48.23,-4.10],
  "2A":[41.86,9.01],"2B":[42.37,9.28],"30":[43.96,4.18],"31":[43.60,1.44],
  "32":[43.67,0.59],"33":[44.84,-0.58],"34":[43.61,3.88],"35":[48.11,-1.68],
  "36":[46.81,1.69],"37":[47.24,0.69],"38":[45.19,5.72],"39":[46.67,5.56],
  "40":[44.00,-0.75],"41":[47.59,1.33],"42":[45.44,4.39],"43":[45.04,3.89],
  "44":[47.24,-1.56],"45":[47.90,2.06],"46":[44.62,1.67],"47":[44.35,0.46],
  "48":[44.50,3.50],"49":[47.47,-0.55],"50":[49.11,-1.31],"51":[49.04,4.36],
  "52":[48.11,5.14],"53":[48.07,-0.77],"54":[48.69,6.18],"55":[48.99,5.38],
  "56":[47.83,-2.75],"57":[49.04,6.46],"58":[47.07,3.66],"59":[50.52,3.08],
  "60":[49.40,2.44],"61":[48.43,0.08],"62":[50.52,2.63],"63":[45.77,3.08],
  "64":[43.29,-0.37],"65":[43.23,0.08],"66":[42.70,2.89],"67":[48.58,7.75],
  "68":[47.75,7.34],"69":[45.76,4.83],"70":[47.63,6.16],"71":[46.64,4.52],
  "72":[47.99,0.19],"73":[45.48,6.56],"74":[46.06,6.39],"75":[48.86,2.35],
  "76":[49.44,1.09],"77":[48.62,2.99],"78":[48.80,1.98],"79":[46.65,-0.41],
  "80":[49.92,2.30],"81":[43.93,2.15],"82":[44.01,1.35],"83":[43.47,6.15],
  "84":[43.95,5.05],"85":[46.67,-1.43],"86":[46.58,0.34],"87":[45.83,1.26],
  "88":[48.17,6.46],"89":[47.80,3.56],"90":[47.64,6.85],"91":[48.63,2.26],
  "92":[48.86,2.25],"93":[48.92,2.46],"94":[48.78,2.46],"95":[49.05,2.10],
};
const gpsByDept = (cp: any) => {
  if (!cp) return null;
  const dept = String(cp).slice(0,2).toUpperCase();
  const c = (DEPT_CENTROIDS as Record<string,any>)[dept];
  return c ? {lat:c[0],lng:c[1]} : null;
};

// ── DONNÉES DÉMO CARTE ──────────────────────────────────────
const CHAUFFERIES_CARTE = [
  {id:"CF-001",label:"Chaufferie Moulins Urbaine",lat:46.5657,lng:3.3340,puissanceMW:12,statut:"en_service"},
  {id:"CF-002",label:"Chaufferie Vichy Réseau",lat:46.1290,lng:3.4267,puissanceMW:6,statut:"en_service"},
  {id:"CF-003",label:"Chaufferie Montluçon Bois",lat:46.3438,lng:2.6036,puissanceMW:8,statut:"maintenance"},
  {id:"CF-004",label:"Chaufferie Clermont-Ferrand Centre",lat:45.7766,lng:3.0870,puissanceMW:15,statut:"en_service"},
  {id:"CF-005",label:"Chaufferie Nevers Est",lat:46.9872,lng:3.1591,puissanceMW:4,statut:"en_service"},
];
const CHANTIERS_CARTE = [
  {id:"CH-2026-14",label:"Tronçais Est — Chêne/Charme",lat:46.6234,lng:2.7101,essence:"Chêne",statut:"en_cours",volumeT:95},
  {id:"CH-2026-12",label:"Bocage Nord — Haies Charme",lat:46.6812,lng:2.8934,essence:"Charme/Noisetier",statut:"terminé",volumeT:42},
  {id:"CH-2026-11",label:"Ternant — Douglas Éclaircie",lat:47.0341,lng:3.5821,essence:"Douglas",statut:"en_cours",volumeT:60},
  {id:"CH-2026-09",label:"Tronçais Sud — Pin sylvestre",lat:46.5912,lng:2.6892,essence:"Pin sylvestre",statut:"terminé",volumeT:185},
];
const TAS_INTER_CARTE = [
  {id:"TAS-001",label:"Tas Tronçais — Bord RD2144",lat:46.6112,lng:2.7298,
   commune:"Tronçais (03360)",essences:"Chêne/Charme",volumeT:78,humidite:34,
   dateConstitution:"2026-07-08",statut:"en_sechage",lots:["LOT-2026-044"],etf:"ETF BOIS SERVICE"},
  {id:"TAS-002",label:"Tas Cérilly — Route Forêt",lat:46.6543,lng:2.8701,
   commune:"Cérilly (03350)",essences:"Charme/Noisetier",volumeT:42,humidite:22,
   dateConstitution:"2026-06-29",statut:"pret",lots:["LOT-2026-038"],etf:"ETF BOIS SERVICE"},
  {id:"TAS-003",label:"Tas Ternant — Douglas",lat:47.0201,lng:3.5634,
   commune:"Ternant (58250)",essences:"Douglas",volumeT:55,humidite:28,
   dateConstitution:"2026-07-15",statut:"pret",lots:["LOT-2026-051"],etf:"Bois Val d'Allier"},
  {id:"TAS-004",label:"Tas Villefranche — Pin",lat:46.5788,lng:2.6645,
   commune:"Villefranche-d'Allier (03430)",essences:"Pin sylvestre",volumeT:120,humidite:18,
   dateConstitution:"2026-06-10",statut:"livre",lots:["LOT-2026-031"],etf:"ETF BOIS SERVICE"},
];

// ── ÉCRAN CARTE (Leaflet / OpenStreetMap) ────────────────────
export const EcranCarte = ({contacts, visites, onOpenLot}: any) => {
  const mapRef     = useRef<any>(null);
  const mapInst    = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const cfMarkersRef = useRef<any[]>([]);
  const chMarkersRef = useRef<any[]>([]);
  const tasMarkersRef = useRef<any[]>([]);
  const effisLayerRef  = useRef<any>(null);
  const tileLayerRef   = useRef<any>(null);
  const [filtre,       setFiltre]     = useState("TOUS");
  const [nbLots,       setNbLots]     = useState(0);
  const [couches,      setCouches]    = useState({lots:true,chaufferies:true,chantiers:true,tas:true,effis:false});
  const [effisCouche,  setEffisCouche] = useState<"fires"|"danger"|"perimeters">("fires");
  const [fondCarte,    setFondCarte]  = useState<"plan"|"satellite">("plan");
  const [tilesErreur,  setTilesErreur] = useState(false);

  const FONDS: Record<string,{url:string,attr:string,maxZoom:number}> = {
    plan: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attr: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributeurs',
      maxZoom: 19,
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attr: "© Esri, Maxar, Earthstar Geographics",
      maxZoom: 18,
    },
  };

  // ── Init carte ──
  useEffect(()=>{
    if (!mapRef.current || mapInst.current) return;
    // Fix icônes Leaflet en prod (Vite supprime _getIconUrl)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
      iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
      shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
    });
    const map = L.map(mapRef.current,{
      center:[46.8,2.5], zoom:6,
      zoomControl:true,
    });
    map.attributionControl.setPrefix('');
    const fond = FONDS.plan;
    const tl = L.tileLayer(fond.url,{
      attribution: fond.attr,
      maxZoom: fond.maxZoom,
    });
    tl.on("tileerror", ()=>setTilesErreur(true));
    tl.on("tileload",  ()=>setTilesErreur(false));
    tileLayerRef.current = tl;
    tl.addTo(map);
    mapInst.current = map;
    return ()=>{ map.remove(); mapInst.current=null; tileLayerRef.current=null; };
  },[]);

  // ── Permutation fond de carte ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const fond = FONDS[fondCarte];
    setTilesErreur(false);
    const tl = L.tileLayer(fond.url,{
      attribution: fond.attr,
      maxZoom: fond.maxZoom,
    });
    tl.on("tileerror", ()=>setTilesErreur(true));
    tl.on("tileload",  ()=>setTilesErreur(false));
    tileLayerRef.current = tl;
    tl.addTo(map);
  },[fondCarte]);

  // ── Callback popup → fiche lot ──
  useEffect(()=>{
    (window as any).__aplt_open = (id: any)=>{
      const lot = contacts.find((c: any)=>c.id===id);
      if (lot) onOpenLot(lot);
    };
    return ()=>{ delete (window as any).__aplt_open; };
  },[contacts, onOpenLot]);


  // ── Mise à jour des markers ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;

    // Supprimer anciens markers
    markersRef.current.forEach(m=>map.removeLayer(m));
    markersRef.current = [];

    if (!couches.lots) { setNbLots(0); return; }

    const bounds: any[] = [];
    let count = 0;

    contacts.forEach((lot: any)=>{
      if (!lot.lotNumero) return;
      if (filtre!=="TOUS" && lot.statutLot!==filtre) return;
      const v = visites.find((vi: any)=>vi.lotId===lot.id||vi.lotNumero===lot.lotNumero);
      const gpsExact = lot.gps?.lat ? lot.gps : (v?.gps?.lat ? v.gps : null);
      const gps = gpsExact || gpsByDept(lot.codePostal);
      if (!gps?.lat) return;
      const approx = !gpsExact;

      const st = STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;

      const icon = L.divIcon({
        className:"",
        iconSize:[32,32],
        iconAnchor:[16,16],
        popupAnchor:[0,-16],
        html:`<div style="width:32px;height:32px;border-radius:50%;background:${st.color};border:3px solid ${approx?"rgba(255,255,255,.5)":"#fff"};opacity:${approx?0.75:1};box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;">${approx?"📍":"🌲"}</div>`,
      });

      const popup = `
        <div style="font-family:-apple-system,sans-serif;min-width:200px;padding:2px">
          <div style="font-family:monospace;font-size:14px;font-weight:700;
            color:#1E5B3A;margin-bottom:4px">${lot.lotNumero}</div>
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
            🌲 ${lot.surfaceHa} ha${v?.volumeEstimeT?" · 📦 "+fmtNum(v.volumeEstimeT)+" t":""}</div>`:""}
          ${v?.essences?.length?`<div style="font-size:11px;color:#9A9892;margin-top:2px">
            🌿 ${v.essences.map((e: any)=>e.label).join(", ")}</div>`:""}
          <button onclick="window.__aplt_open('${lot.id}')"
            style="width:100%;margin-top:10px;padding:8px;border-radius:8px;
              background:#4CAF50;color:#fff;border:none;cursor:pointer;
              font-size:12px;font-weight:600;font-family:inherit;">
            Ouvrir la fiche →
          </button>
        </div>`;

      const marker = L.marker([gps.lat, gps.lng],{icon})
        .addTo(map)
        .bindPopup(popup,{maxWidth:240,className:"aplt-popup"});

      markersRef.current.push(marker);
      bounds.push([gps.lat, gps.lng]);
      count++;
    });

    setNbLots(count);
    if (bounds.length>0) {
      map.fitBounds(bounds,{padding:[40,40],maxZoom:13});
    }
  },[contacts, visites, filtre, couches.lots]);

  // ── Couche Chaufferies ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    cfMarkersRef.current.forEach(m=>map.removeLayer(m));
    cfMarkersRef.current = [];
    if (!couches.chaufferies) return;
    CHAUFFERIES_CARTE.forEach(cf=>{
      const icon = L.divIcon({
        className:"",iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-18],
        html:`<div style="width:34px;height:34px;border-radius:50%;background:#DC2626;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;">🔥</div>`,
      });
      const popup = `<div style="font-family:-apple-system,sans-serif;min-width:180px;padding:4px">
        <div style="font-weight:700;font-size:12px;color:#DC2626;margin-bottom:4px">🔥 Chaufferie</div>
        <div style="font-weight:600;font-size:13px">${cf.label}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">Puissance : <strong>${cf.puissanceMW} MW</strong></div>
        <div style="margin-top:6px"><span style="font-size:10px;padding:3px 8px;border-radius:12px;background:${cf.statut==="en_service"?"#D1FAE5":"#FEF3C7"};color:${cf.statut==="en_service"?"#065F46":"#92400E"};font-weight:600">${cf.statut==="en_service"?"✅ En service":"⚠️ Maintenance"}</span></div>
      </div>`;
      cfMarkersRef.current.push(L.marker([cf.lat,cf.lng],{icon}).addTo(map).bindPopup(popup,{maxWidth:220,className:"aplt-popup"}));
    });
  },[couches.chaufferies]);

  // ── Couche Chantiers ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    chMarkersRef.current.forEach(m=>map.removeLayer(m));
    chMarkersRef.current = [];
    if (!couches.chantiers) return;
    CHANTIERS_CARTE.forEach(ch=>{
      const enCours = ch.statut==="en_cours";
      const icon = L.divIcon({
        className:"",iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-18],
        html:`<div style="width:32px;height:32px;border-radius:8px;background:${enCours?"#92400E":"#6B7280"};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;">🪓</div>`,
      });
      const popup = `<div style="font-family:-apple-system,sans-serif;min-width:180px;padding:4px">
        <div style="font-weight:700;font-size:12px;color:#92400E;margin-bottom:4px">🪓 Chantier</div>
        <div style="font-weight:600;font-size:13px">${ch.label}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">🌿 ${ch.essence} · 📦 ${ch.volumeT} t</div>
        <div style="margin-top:6px"><span style="font-size:10px;padding:3px 8px;border-radius:12px;background:${enCours?"#FEF3C7":"#E5E7EB"};color:${enCours?"#92400E":"#374151"};font-weight:600">${enCours?"🔧 En cours":"✅ Terminé"}</span></div>
      </div>`;
      chMarkersRef.current.push(L.marker([ch.lat,ch.lng],{icon}).addTo(map).bindPopup(popup,{maxWidth:220,className:"aplt-popup"}));
    });
  },[couches.chantiers]);

  // ── Couche Tas intermédiaires ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    tasMarkersRef.current.forEach(m=>map.removeLayer(m));
    tasMarkersRef.current = [];
    if (!couches.tas) return;
    const STATUT_TAS: Record<string,{bg:string,col:string,label:string,dot:string}> = {
      en_sechage:{bg:"#FEF3C7",col:"#92400E",label:"🌬️ En séchage",dot:"#F59E0B"},
      pret:       {bg:"#D1FAE5",col:"#065F46",label:"✅ Prêt",dot:"#10B981"},
      livre:      {bg:"#E5E7EB",col:"#374151",label:"📬 Livré",dot:"#6B7280"},
    };
    TAS_INTER_CARTE.forEach(tas=>{
      const st = STATUT_TAS[tas.statut]||STATUT_TAS.en_sechage;
      const icon = L.divIcon({
        className:"",iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-18],
        html:`<div style="width:30px;height:30px;border-radius:4px;background:${st.dot};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;">📦</div>`,
      });
      const popup = `<div style="font-family:-apple-system,sans-serif;min-width:190px;padding:4px">
        <div style="font-weight:700;font-size:12px;color:#92400E;margin-bottom:4px">📦 Tas intermédiaire</div>
        <div style="font-weight:600;font-size:13px">${tas.label}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">📍 ${tas.commune}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">🌿 ${tas.essences} · ⚖️ ${tas.volumeT} t</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">💧 Humidité : <strong>${tas.humidite}%</strong> · 🏭 ${tas.etf}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">📅 Constitué : ${new Date(tas.dateConstitution).toLocaleDateString("fr-FR")}</div>
        <div style="margin-top:6px"><span style="font-size:10px;padding:3px 8px;border-radius:12px;background:${st.bg};color:${st.col};font-weight:600">${st.label}</span></div>
      </div>`;
      tasMarkersRef.current.push(L.marker([tas.lat,tas.lng],{icon}).addTo(map).bindPopup(popup,{maxWidth:220,className:"aplt-popup"}));
    });
  },[couches.tas]);

  // ── Couche EFFIS WMS (feux actifs / danger / périmètres) ──
  useEffect(()=>{
    if (!mapInst.current) return;
    const map = mapInst.current;
    // Retire l'ancienne couche WMS quelle qu'elle soit
    if (effisLayerRef.current) {
      map.removeLayer(effisLayerRef.current);
      effisLayerRef.current = null;
    }
    if (!couches.effis) return;
    // URLs Copernicus GWIS (remplace l'ancien endpoint JRC ies-ows.jrc.ec.europa.eu)
    const EFFIS_ENDPOINTS: Record<string,{url:string,layer:string}> = {
      fires:      { url:"https://maps.effis.emergency.copernicus.eu/gwis",
                    layer:"activefires.viirs.fire" },
      danger:     { url:"https://maps.effis.emergency.copernicus.eu/gwis",
                    layer:"ecmwf.fwi" },
      perimeters: { url:"https://maps.effis.emergency.copernicus.eu/effis",
                    layer:"fireperimeters.recent" },
    };
    const ep = EFFIS_ENDPOINTS[effisCouche];
    const wms = L.tileLayer.wms(ep.url, {
      layers:      ep.layer,
      format:      "image/png",
      transparent: true,
      opacity:     0.70,
      version:     "1.3.0",
      attribution: "© <a href='https://effis.emergency.copernicus.eu/'>EFFIS / Copernicus</a>",
    });
    wms.addTo(map);
    effisLayerRef.current = wms;
  },[couches.effis, effisCouche]);

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
    ["BORD_ROUTE","#A66A2E"],
    ["EN_LIVRAISON","#534AB7"],
    ["LIVRE_CHAUFFERIE","#4CAF50"],
    ["ALERTE","#A32D2D"],
  ];
  const LEGENDE_TAS = [
    {color:"#F59E0B",label:"Tas en séchage",shape:"4px"},
    {color:"#10B981",label:"Tas prêt",shape:"4px"},
    {color:"#6B7280",label:"Tas livré",shape:"4px"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>

      {/* Couches */}
      <div style={{display:"flex",gap:5,padding:"5px 12px",overflowX:"auto",
        flexShrink:0,background:"#F9FAFB",borderBottom:`1px solid ${C.bd}`,
        alignItems:"center",scrollbarWidth:"none"}}>
        <span style={{fontSize:9,color:C.tx3,flexShrink:0,fontWeight:700,
          textTransform:"uppercase",letterSpacing:"0.06em"}}>Couches</span>
        {([ ["lots","🌲","Lots"],["chaufferies","🔥","Chaufferies"],["chantiers","🪓","Chantiers"],["tas","📦","Tas"] ] as [keyof typeof couches,string,string][]).map(([k,icon,label])=>(
          <button key={k} onClick={()=>setCouches(c=>({...c,[k]:!c[k]}))} style={{
            height:24,padding:"0 9px",borderRadius:12,whiteSpace:"nowrap",flexShrink:0,
            border:`1.5px solid ${couches[k]?C.green:C.bd}`,
            background:couches[k]?"#D1FAE5":"#fff",
            color:couches[k]?"#065F46":C.tx3,
            fontFamily:"inherit",fontSize:10,fontWeight:600,cursor:"pointer",
            display:"flex",alignItems:"center",gap:3,
            WebkitTapHighlightColor:"transparent"}}>
            <span>{icon}</span>{label}
          </button>
        ))}
        {/* Séparateur */}
        <div style={{width:1,height:18,background:C.bd,flexShrink:0,alignSelf:"center"}}/>
        {/* Toggle Plan / Satellite */}
        <div style={{display:"flex",borderRadius:12,overflow:"hidden",
          border:`1.5px solid ${C.bd}`,flexShrink:0}}>
          {([ ["plan","🗺️","Plan"], ["satellite","🛰️","Satellite"] ] as ["plan"|"satellite",string,string][]).map(([k,icon,label])=>(
            <button key={k} onClick={()=>setFondCarte(k)} style={{
              height:24,padding:"0 8px",whiteSpace:"nowrap",border:"none",
              background:fondCarte===k?"#1A3A5C":"#fff",
              color:fondCarte===k?"#fff":C.tx3,
              fontFamily:"inherit",fontSize:10,fontWeight:fondCarte===k?700:500,
              cursor:"pointer",display:"flex",alignItems:"center",gap:3,
              WebkitTapHighlightColor:"transparent"}}>
              {icon} {label}
            </button>
          ))}
        </div>
        {/* Séparateur */}
        <div style={{width:1,height:18,background:C.bd,flexShrink:0,alignSelf:"center"}}/>
        {/* Toggle EFFIS */}
        <button onClick={()=>setCouches(c=>({...c,effis:!c.effis}))} style={{
          height:24,padding:"0 9px",borderRadius:12,whiteSpace:"nowrap",flexShrink:0,
          border:`1.5px solid ${couches.effis?"#EF4444":C.bd}`,
          background:couches.effis?"#FEE2E2":"#fff",
          color:couches.effis?"#B91C1C":C.tx3,
          fontFamily:"inherit",fontSize:10,fontWeight:600,cursor:"pointer",
          display:"flex",alignItems:"center",gap:3,
          WebkitTapHighlightColor:"transparent"}}>
          🔥 EFFIS
        </button>
        {/* Sous-sélecteur couche EFFIS */}
        {couches.effis&&([
          ["fires","🔴","Feux actifs"],
          ["danger","⚠️","Danger"],
          ["perimeters","📐","Périmètres"],
        ] as ["fires"|"danger"|"perimeters",string,string][]).map(([k,icon,label])=>(
          <button key={k} onClick={()=>setEffisCouche(k)} style={{
            height:24,padding:"0 8px",borderRadius:12,whiteSpace:"nowrap",flexShrink:0,
            border:`1.5px solid ${effisCouche===k?"#EF4444":"#FECACA"}`,
            background:effisCouche===k?"#DC2626":"#FEF2F2",
            color:effisCouche===k?"#fff":"#B91C1C",
            fontFamily:"inherit",fontSize:10,fontWeight:effisCouche===k?700:500,
            cursor:"pointer",display:"flex",alignItems:"center",gap:3,
            WebkitTapHighlightColor:"transparent"}}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Filtres statut lots */}
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
        <div ref={mapRef} style={{width:"100%",height:"100%"}}/>

        {/* Badge nb lots */}
        <div style={{position:"absolute",top:10,right:10,zIndex:1000,
          background:"#fff",borderRadius:20,padding:"5px 12px",
          boxShadow:"0 2px 8px rgba(0,0,0,.2)",fontSize:12,fontWeight:600,
          color:C.tx,border:`1px solid ${C.bd}`}}>
          {nbLots} lot{nbLots!==1?"s":""} {filtre!=="TOUS"?"filtré"+(nbLots>1?"s":""):""}
        </div>
        {/* Alerte fond de carte inaccessible */}
        {tilesErreur&&(
          <div style={{position:"absolute",bottom:10,left:"50%",transform:"translateX(-50%)",
            zIndex:1000,background:"rgba(0,0,0,.7)",borderRadius:12,padding:"6px 14px",
            fontSize:11,color:"#fff",whiteSpace:"nowrap",pointerEvents:"none"}}>
            ⚠️ Fond de carte inaccessible (réseau)
          </div>
        )}
        {/* Badge EFFIS actif */}
        {couches.effis&&(
          <div style={{position:"absolute",top:10,left:10,zIndex:1000,
            background:"#DC2626",borderRadius:20,padding:"5px 12px",
            boxShadow:"0 2px 8px rgba(0,0,0,.3)",fontSize:11,fontWeight:700,
            color:"#fff",display:"flex",alignItems:"center",gap:5}}>
            🔥 EFFIS —&nbsp;
            {effisCouche==="fires"?"Feux actifs (VIIRS)":
             effisCouche==="danger"?"Danger incendie":
             "Périmètres récents"}
          </div>
        )}
      </div>

      {/* Légende */}
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
          {couches.tas&&<>
            <div style={{width:1,background:C.bd,flexShrink:0,margin:"0 2px"}}/>
            {LEGENDE_TAS.map(t=>(
              <div key={t.label} style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:t.shape,background:t.color,
                  border:"1.5px solid #fff",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                <span style={{fontSize:10,color:C.tx3,whiteSpace:"nowrap"}}>{t.label}</span>
              </div>
            ))}
          </>}
        </div>
    </div>
  );
};

