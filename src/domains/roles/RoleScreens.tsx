import { useState, useEffect, useRef } from "react";
import { C, PADDING } from "../../design-system/tokens.js";
import { todayS } from "../../shared/utils.js";
import { fmtNum } from "../../shared/format.js";
import { apiPost, apiPostPublic, apiPatch } from "../../services/api.service.js";
import { BigBtn, MInput, SectionTitle } from "../../shared/ui.jsx";
import { generatePdfFromHtml, buildRedHTML } from "../../domains/documents/pdf-templates.js";
import { validateCMR, formatCMR, formatImmat, validateImmat } from "../../shared/validators.js";
import { STATUT_LOT } from "../../domains/screens/MobileScreens.constants.js";
export const EcranRoleMandataire = ({user, contacts, onSelectLot}: any) => {
  const mesLots = contacts.filter((c: any)=>c.mandataireId===user.id);
  const [selLot, setSelLot] = useState<any>(null);

  if (selLot) {
    const st = STATUT_LOT[selLot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
    return (
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
        <button onClick={()=>setSelLot(null)} style={{background:"none",border:"none",
          color:C.greenD,fontSize:13,cursor:"pointer",padding:"0 0 16px",fontFamily:"inherit",
          display:"flex",alignItems:"center",gap:6}}>
          ← Retour à mes lots
        </button>
        <div style={{background:"#fff",borderRadius:16,padding:20,border:`1px solid ${C.bd}`,
          borderLeft:`4px solid ${st.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:C.greenD}}>
              {selLot.lotNumero}
            </div>
            <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
              background:st.bg,color:st.color,fontWeight:600}}>{st.label}</span>
          </div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>
            👤 {selLot.nom} {selLot.prenom}
          </div>
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            📞 {selLot.telephone}
          </div>
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            📍 {selLot.commune}{selLot.adresseParcelle?` — ${selLot.adresseParcelle}`:""}
          </div>
          {selLot.refCadastrale&&(
            <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
              📋 Réf. cadastrale : {selLot.refCadastrale}
            </div>
          )}
          <div style={{fontSize:13,color:C.tx2,marginBottom:4}}>
            🌲 Surface : {selLot.surfaceHa} ha
          </div>
          {selLot.dateVisite&&(
            <div style={{background:C.amberL,borderRadius:10,padding:"10px 14px",
              marginTop:12,border:`1px solid ${C.amber}`,fontSize:13,color:C.amberD,fontWeight:600}}>
              📅 Visite prévue le {new Date(selLot.dateVisite).toLocaleDateString("fr-FR")}
            </div>
          )}
          <div style={{marginTop:16}}>
            <button onClick={()=>onSelectLot&&onSelectLot(selLot)} style={{
              width:"100%",height:50,borderRadius:12,
              background:C.green,border:"none",color:"#fff",
              fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
              ✏️ Saisir la visite terrain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 20px"}}>
        <div style={{fontSize:40}}>🔭</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Lots à visiter qui vous sont attribués</div>
      </div>
      {mesLots.length===0 ? (
        <div style={{textAlign:"center",color:C.tx3,padding:"32px 0"}}>
          <div style={{fontSize:32}}>📋</div>
          <div style={{marginTop:8}}>Aucun lot attribué pour le moment</div>
        </div>
      ) : mesLots.map((lot: any)=>{
        const st = STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
        return (
          <div key={lot.id} onClick={()=>setSelLot(lot)}
            style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12,
              border:`1px solid ${C.bd}`,borderLeft:`4px solid ${st.color}`,
              cursor:"pointer",WebkitTapHighlightColor:"transparent",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,
                color:C.greenD,marginBottom:4}}>{lot.lotNumero}</div>
              <div style={{fontSize:14,fontWeight:600,color:C.tx,marginBottom:2}}>
                👤 {lot.nom} {lot.prenom}
              </div>
              <div style={{fontSize:12,color:C.tx2}}>
                📍 {lot.commune} · 🌲 {lot.surfaceHa} ha
              </div>
              {lot.dateVisite&&(
                <div style={{fontSize:11,color:C.amberD,marginTop:4,fontWeight:600}}>
                  📅 Visite le {new Date(lot.dateVisite).toLocaleDateString("fr-FR")}
                </div>
              )}
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
                background:st.bg,color:st.color,fontWeight:600,whiteSpace:"nowrap"}}>
                {st.label}
              </span>
              <span style={{fontSize:18,color:C.tx3}}>›</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const EcranRoleProprietaire = ({user, contacts, visites, reportings=[], livraisons=[], dechiquetages=[]}: any) => {
  const mesSLots = contacts.filter((c: any)=>c.nom?.toLowerCase()===user.nom?.toLowerCase());

  const today = todayS();

  const dateDebutOperation = (lot: any, typeMatch: any) => {
    const dates = reportings
      .filter((r: any)=>(r.lotId===lot.id||r.lotNumero===lot.lotNumero)&&typeMatch(r.typeOperationJour||""))
      .map((r: any)=>r.dateJour).filter(Boolean).sort();
    return dates[0]||null;
  };

  const suiviJour = (lot: any) => {
    const rToday = reportings.filter((r: any)=>
      (r.lotId===lot.id||r.lotNumero===lot.lotNumero) && (r.dateJour||"").startsWith(today));
    const abattageM3 = rToday
      .filter((r: any)=>["abattage","abattage_debardage"].includes(r.typeOperationJour))
      .reduce((s: any,r: any)=>s+(parseFloat(r.volumeJour)||0), 0);
    const debardageM3 = rToday
      .filter((r: any)=>["debardage","abattage_debardage"].includes(r.typeOperationJour))
      .reduce((s: any,r: any)=>s+(parseFloat(r.volumeJour)||0), 0);
    const dToday = dechiquetages.filter((d: any)=>
      (d.lotId===lot.id||d.lotNumero===lot.lotNumero) &&
      ((d.dateJour||d.createdAt||"").startsWith(today)));
    const dechiqT  = dToday.reduce((s: any,d: any)=>s+(parseFloat(d.tonnageCharge)||0), 0);
    const dechiqM3 = dToday.reduce((s: any,d: any)=>s+(parseFloat(d.cubageCharge)||0), 0);
    return {abattageM3, debardageM3, dechiqT, dechiqM3, hasData: abattageM3>0||debardageM3>0||dechiqT>0||dechiqM3>0};
  };

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
      ):mesSLots.map((lot: any)=>{
        const st=STATUT_LOT[lot.statutLot||"NOUVEAU"]||STATUT_LOT.NOUVEAU;
        const visite=visites.find((v: any)=>v.lotId===lot.id||v.lotNumero===lot.lotNumero);

        const livraisonsChaufferie = livraisons
          .filter((l: any)=>l.lotId===lot.id||l.lotNumero===lot.lotNumero)
          .sort((a: any,b: any)=>(a.date||"").localeCompare(b.date||""));
        const poidsNet = (l: any) => l.poidsNet ?? Math.max(0, (l.poidsBrut??0)-(l.tare??0));
        const poidsCumule = livraisonsChaufferie.reduce((s: any,l: any)=>s+poidsNet(l),0);
        const prixTonne = parseFloat(visite?.prixTonne)||0;
        const sommeDue = poidsCumule*prixTonne;

        // Niveau de traçabilité APPLITAG (1/2/3)
        const hasVisite = !!visite;
        const hasLivraisons = livraisonsChaufferie.length > 0;
        const hasPeseeVerifiee = livraisonsChaufferie.some((l: any)=>!!l.peseeVerifiee);
        const niveauTracabilite = hasPeseeVerifiee ? 3 : hasLivraisons ? 2 : hasVisite ? 1 : 0;
        const NIVEAUX_TRACABILITE = [
          null,
          {label:"Niveau 1 — Suivi chantier",       color:"#1E5B3A", bg:"#D1FAE5", desc:"Visite, opérations et clôture documentées par l'ETF"},
          {label:"Niveau 2 — Traçabilité aval",      color:"#1D4ED8", bg:"#DBEAFE", desc:"Chargements, CMR et destination déclarés par les opérateurs"},
          {label:"Niveau 3 — Pesées vérifiées",      color:"#7C3AED", bg:"#EDE9FE", desc:"Justificatifs de pesée reçus et rapprochés avec le lot"},
        ];
        const niv = NIVEAUX_TRACABILITE[niveauTracabilite];

        // Statut de preuve par opération
        const statutPreuve = (hasData: boolean, hasJustif: boolean, hasVerif: boolean) =>
          hasVerif ? "✓✓" : hasJustif ? "✓" : hasData ? "◐" : "○";

        const MODELE_LABEL: Record<string,string> = {
          forfaitaire:      "🤝 Vente forfaitaire",
          poids_bord_route: "🌲 Au poids bord de route",
          poids_livre:      "🔥 Au poids livré (destination)",
          prestation:       "🛠️ Prestation de travaux",
        };

        const dateAbattage = dateDebutOperation(lot, (t: any)=>t.startsWith("abattage"));
        const dateDebardage = dateDebutOperation(lot, (t: any)=>t.includes("debardage"));
        const dechiq = dechiquetages.find((d: any)=>d.lotId===lot.id||d.lotNumero===lot.lotNumero);
        const dateDechiquetage = dechiq?.dateJour||dechiq?.date||null;

        return (
          <div key={lot.id} style={{background:"#fff",borderRadius:16,padding:20,
            marginBottom:14,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${st.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:C.greenD}}>
                {lot.lotNumero}
              </div>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:8,
                background:st.bg,color:st.color,fontWeight:600}}>{st.label}</span>
            </div>
            {/* Badge niveau de traçabilité APPLITAG */}
            {niv&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,
                padding:"7px 12px",borderRadius:10,
                background:niv.bg,border:`1px solid ${niv.color}22`}}>
                <span style={{fontSize:16}}>
                  {niveauTracabilite===3?"🔐":niveauTracabilite===2?"🔗":"📋"}
                </span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:niv.color}}>{niv.label}</div>
                  <div style={{fontSize:10,color:niv.color,opacity:.8,marginTop:1}}>{niv.desc}</div>
                </div>
                <div style={{fontSize:20,fontWeight:800,color:niv.color}}>
                  {niveauTracabilite}/3
                </div>
              </div>
            )}
            <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>
              📍 {lot.commune} · 🌲 {lot.surfaceHa} ha
            </div>

            {/* Informations recueillies lors de la visite terrain */}
            {visite&&(
              <div style={{background:C.greenL,borderRadius:10,padding:12,marginBottom:10,
                fontSize:12,color:C.tx,lineHeight:1.8}}>
                <div style={{fontWeight:700,color:C.greenD,marginBottom:4}}>🔭 Visite terrain — {visite.date}</div>
                {visite.essences?.length>0&&<>🌿 {visite.essences.map((e: any)=>`${e.label} (${e.pct}%)`).join(", ")}<br/></>}
                ⚖️ Volume estimé : {fmtNum(visite.volumeEstimeT||0)} t<br/>
                {visite.gps?.lat&&<>🛰️ GPS : {visite.gps.lat.toFixed(5)}°N · {visite.gps.lng.toFixed(5)}°E<br/></>}
                🚛 Accès : {visite.accesCamion==="praticable"?"Praticable":visite.accesCamion==="difficile"?"Difficile":visite.accesCamion||"—"}
              </div>
            )}

            {/* Contrat signé — non modifiable */}
            {(visite?.sigDataProprio||visite?.nomSignProprio)&&(
              <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
                <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:6}}>
                  📄 Contrat signé {prixTonne?`— ${fmtNum(prixTonne,2)} €/t HT`:""}
                </div>
                {visite.modeleContractuel&&(
                  <div style={{fontSize:11,fontWeight:600,color:C.amber,
                    background:"#FFFBEB",borderRadius:6,padding:"4px 8px",marginBottom:6,
                    border:`1px solid #F59E0B44`}}>
                    {MODELE_LABEL[visite.modeleContractuel]||visite.modeleContractuel}
                  </div>
                )}
                {visite.sigDataProprio&&(
                  <img src={visite.sigDataProprio} style={{width:120,height:40,objectFit:"contain",
                    background:"#fff",border:`1px solid ${C.bd}`,borderRadius:6}}/>
                )}
                <div style={{fontSize:11,color:C.tx3,marginTop:4}}>
                  Signataire : {visite.nomSignProprio||lot.nom+" "+(lot.prenom||"")}
                </div>
              </div>
            )}

            {/* Dates de début par opération */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:6}}>📅 Démarrage des opérations</div>
              {[
                ["🪓 Abattage",dateAbattage],
                ["🚜 Débardage",dateDebardage],
                ["🌀 Déchiquetage",dateDechiquetage],
              ].map(([l,d])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0"}}>
                  <span style={{color:C.tx2}}>{l}</span>
                  <span style={{fontWeight:600,color:d?C.tx:C.tx3}}>
                    {d?new Date(d).toLocaleDateString("fr-FR"):"Non démarré"}
                  </span>
                </div>
              ))}
            </div>

            {/* Suivi des opérations du jour */}
            {(()=>{
              const s = suiviJour(lot);
              return (
                <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
                  <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:2}}>
                    ⚙️ Suivi des opérations du jour
                  </div>
                  <div style={{fontSize:10,color:C.tx3,fontStyle:"italic",marginBottom:8}}>
                    * Toutes les valeurs sont des estimations
                  </div>
                  {[
                    {icon:"🪓",label:"Abattage",    val:s.abattageM3>0?`${s.abattageM3.toFixed(1)} m³ *`:null, sub:"Volume abattu estimé"},
                    {icon:"🚜",label:"Débardage",   val:s.debardageM3>0?`${s.debardageM3.toFixed(1)} m³ *`:null, sub:"Volume sorti estimé"},
                    {icon:"⚙️",label:"Déchiquetage",
                      val:(s.dechiqT>0||s.dechiqM3>0)
                        ? [s.dechiqT>0&&`${s.dechiqT.toFixed(1)} t`,s.dechiqM3>0&&`${s.dechiqM3.toFixed(1)} m³`].filter(Boolean).join(" · ")+" *"
                        : null,
                      sub:"Tonnage & cubage chargés estimés"},
                  ].map(({icon,label,val,sub})=>(
                    <div key={label} style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",fontSize:12,padding:"5px 0",
                      borderBottom:`1px solid ${C.bd}`}}>
                      <div>
                        <span style={{color:C.tx2}}>{icon} {label}</span>
                        <div style={{fontSize:10,color:C.tx3}}>{sub}</div>
                      </div>
                      <span style={{fontWeight:600,color:val?C.greenD:C.tx3}}>{val||"—"}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Timeline statut */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              {[
                {label:"Visite terrain",done:!!visite,icon:"🔭"},
                {label:"Validation exploitation",done:["VALIDE_EXPLOITATION","EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"✅"},
                {label:"Exploitation en cours",done:["EN_COURS_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🪓"},
                {label:"Bord de route",done:["BORD_ROUTE","A_DECHIQUETER","EN_COURS_DECHIQUETAGE","EN_LIVRAISON","LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🌲"},
                {label:"Lot entièrement livré",done:["LIVRE_CHAUFFERIE"].includes(lot.statutLot),icon:"🔥"},
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

            {/* Suivi des poids livrés en chaufferie */}
            <div style={{background:C.bg2,borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontWeight:700,color:C.tx2,fontSize:12,marginBottom:4}}>
                🔥 Poids livrés en chaufferie
              </div>
              <div style={{fontSize:10,color:C.tx3,marginBottom:8,lineHeight:1.5}}>
                Légende : ○ prévue · ◐ déclarée · ✓ justificatif reçu · ✓✓ vérifiée par rapprochement · ! preuve manquante
              </div>
              {livraisonsChaufferie.length===0?(
                <div style={{fontSize:12,color:C.tx3}}>Aucune livraison enregistrée à ce jour</div>
              ):livraisonsChaufferie.map((l: any,i: any)=>{
                const pn      = poidsNet(l);
                const verifiee = !!l.peseeVerifiee;
                const statut  = statutPreuve(pn>0, !!l.numTicket||verifiee, verifiee);
                const isManquante = pn===0 && !verifiee;
                const dateAff = l.date ? new Date(l.date).toLocaleDateString("fr-FR") : "—";
                return (
                  <div key={l.id||i} style={{padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13,color:isManquante?"#DC2626":verifiee?"#7C3AED":pn>0?"#1E5B3A":C.tx3}}>
                          {isManquante?"!":statut}
                        </span>
                        <span style={{color:C.tx2}}>{dateAff}</span>
                        {l.nomDestination&&<span style={{color:C.tx3,fontSize:10}}> · {l.nomDestination}</span>}
                      </div>
                      <span style={{fontWeight:700,color:isManquante?"#DC2626":verifiee?"#7C3AED":C.tx}}>
                        {pn>0?fmtNum(pn)+" t":"—"}
                      </span>
                    </div>
                    {(l.poidsBrut>0||l.tare>0)&&(
                      <div style={{fontSize:10,color:C.tx3,paddingLeft:20}}>
                        Brut : {fmtNum(l.poidsBrut??0)} t · Tare : {fmtNum(l.tare??0)} t
                      </div>
                    )}
                    {l.humiditeReception&&(
                      <div style={{fontSize:10,color:C.tx3,paddingLeft:20}}>
                        Humidité mesurée : {l.humiditeReception} %
                      </div>
                    )}
                    {verifiee?(
                      <div style={{fontSize:10,color:"#7C3AED",paddingLeft:20,fontWeight:600}}>
                        Pesée enregistrée sur justificatif transmis par la destination
                      </div>
                    ):pn>0?(
                      <div style={{fontSize:10,color:C.tx3,paddingLeft:20,fontStyle:"italic"}}>
                        Pesée déclarée par l'opérateur — justificatif non encore reçu
                      </div>
                    ):null}
                  </div>
                );
              })}
            </div>

            {/* Total cumulé et somme due */}
            {(poidsCumule>0||prixTonne>0)&&(
              <div style={{background:C.greenL,borderRadius:10,padding:12,
                fontSize:12,color:C.greenD}}>
                {/* Modèle contractuel — détermine la base de calcul */}
                {visite?.modeleContractuel&&(
                  <div style={{fontSize:10,color:C.greenD,opacity:.75,marginBottom:6,
                    fontStyle:"italic"}}>
                    Base de calcul : {MODELE_LABEL[visite.modeleContractuel]||visite.modeleContractuel}
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span>Poids cumulé livré</span>
                  <strong>{fmtNum(poidsCumule)} t</strong>
                </div>
                {livraisonsChaufferie.some((l: any)=>l.peseeVerifiee)&&(
                  <div style={{fontSize:10,color:C.greenD,opacity:.7,marginBottom:4,paddingLeft:4}}>
                    dont ✓✓ {fmtNum(livraisonsChaufferie.filter((l: any)=>l.peseeVerifiee).reduce((s: any,l: any)=>s+poidsNet(l),0))} t vérifiées par justificatif
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span>Prix d'achat</span>
                  <strong>{prixTonne?fmtNum(prixTonne,2)+" €/t HT":"—"}</strong>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:6,
                  borderTop:`1px solid ${C.green}`,fontSize:14,fontWeight:700}}>
                  <span>Total dû à ce jour</span>
                  <span>{fmtNum(sommeDue,2)} €</span>
                </div>
                {visite?.modeleContractuel==="poids_livre"&&!livraisonsChaufferie.some((l: any)=>l.peseeVerifiee)&&(
                  <div style={{fontSize:10,color:"#92400E",background:"#FEF3C7",
                    borderRadius:6,padding:"6px 8px",marginTop:8,lineHeight:1.5}}>
                    ⚠️ Contrat au poids livré : les justificatifs de pesée de la destination ne sont pas encore reçus. Ce total est provisoire.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const EcranRoleChauffeur = ({user, transports=[], dechiquetages=[], gpsChantier={}, onValiderArrivee, onValiderDepart}: any) => {
  const mesTransports = transports.filter((t: any)=>t.nomChauffeur?.toLowerCase().includes(user.nom.toLowerCase()));
  const [confirmed, setConfirmed] = useState<Record<string,any>>({});
  const [heuresArriveeEst, setHeuresArriveeEst] = useState<Record<string,any>>({});
  const [heuresValidees, setHeuresValidees] = useState<Record<string,any>>({});
  const [heuresArriveSite, setHeuresArriveSite] = useState<Record<string,any>>({});
  const [heuresDebutCharg, setHeuresDebutCharg] = useState<Record<string,any>>({});
  const [heuresFinCharg, setHeuresFinCharg] = useState<Record<string,any>>({});
  const [justifModal, setJustifModal] = useState<any>(null); // {tid, dureeMin}
  const [justifChoix, setJustifChoix] = useState("");
  const [justifTexte, setJustifTexte] = useState("");
  const [justifValidees, setJustifValidees] = useState<Record<string,any>>({});

  // Prise de poste : capacité véhicule
  const storageKey = `applitag_capacite_${user.id||user.nom}`;
  const [capaciteM3, setCapaciteM3] = useState(()=>{try{return localStorage.getItem(storageKey)||""}catch{return ""}});
  const [capaciteSaisie, setCapaciteSaisie] = useState("");
  const [posteValide, setPosteValide] = useState(()=>{try{return !!localStorage.getItem(storageKey)}catch{return false}});

  // Bloquer le retour arrière navigateur quand "DÉBUT DE CHARGEMENT" est en attente
  const blockingTransportId = mesTransports.find((t: any)=>confirmed[t.id+"arrivePlace"]&&!heuresDebutCharg[t.id])?.id||null;
  useEffect(()=>{
    if(!blockingTransportId) return;
    window.history.pushState({chargBloque:true},"");
    const handler=(e: any)=>{
      if(e.state?.chargBloque===undefined){
        window.history.pushState({chargBloque:true},"");
      }
    };
    window.addEventListener("popstate",handler);
    return ()=>window.removeEventListener("popstate",handler);
  },[blockingTransportId]);

  const getNow=()=>{const n=new Date();return String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");};
  const diffMin=(h1: any,h2: any)=>{
    const [ah,am]=h1.split(":").map(Number);
    const [bh,bm]=h2.split(":").map(Number);
    return (bh*60+bm)-(ah*60+am);
  };

  // Écran prise de poste si capacité pas encore validée
  if (!posteValide) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:24,background:C.bg}}>
      <div style={{fontSize:48,marginBottom:12}}>🚛</div>
      <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>Prise de poste</div>
      <div style={{fontSize:14,color:C.tx3,marginBottom:28,textAlign:"center"}}>
        Bonjour {user.prenom} — avant de commencer,<br/>
        renseignez la capacité de votre véhicule.
      </div>
      <div style={{width:"100%",maxWidth:320}}>
        <div style={{fontSize:13,fontWeight:600,color:C.tx2,marginBottom:8}}>
          Capacité de chargement (m³)
        </div>
        <input
          type="number" inputMode="decimal" min="1" max="200" step="0.5"
          value={capaciteSaisie}
          onChange={e=>setCapaciteSaisie(e.target.value)}
          placeholder="Ex : 85"
          style={{width:"100%",height:54,padding:"0 16px",borderRadius:14,
            border:`2px solid ${capaciteSaisie?C.green:C.bd}`,
            fontFamily:"inherit",fontSize:22,fontWeight:700,outline:"none",
            boxSizing:"border-box",textAlign:"center",color:C.tx}}/>
        <div style={{fontSize:11,color:C.tx3,textAlign:"center",marginTop:6,marginBottom:20}}>
          Cette valeur sera transmise à l'opérateur de déchiquetage.
        </div>
        <button
          disabled={!capaciteSaisie||parseFloat(capaciteSaisie)<=0}
          onClick={()=>{
            const val=capaciteSaisie.trim();
            setCapaciteM3(val);
            try{localStorage.setItem(storageKey,val)} catch { /* noop */ }
            setPosteValide(true);
          }}
          style={{width:"100%",height:52,borderRadius:14,
            background:capaciteSaisie&&parseFloat(capaciteSaisie)>0?C.green:"#ccc",
            border:"none",color:"#fff",fontFamily:"inherit",fontSize:16,fontWeight:700,
            cursor:capaciteSaisie&&parseFloat(capaciteSaisie)>0?"pointer":"default",
            WebkitTapHighlightColor:"transparent"}}>
          ✅ Valider et commencer
        </button>
      </div>
    </div>
  );

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
        mesTransports.map((t: any)=>(
          <div key={t.id} style={{background:"#fff",borderRadius:16,padding:20,marginBottom:14,
            border:`2px solid ${C.green}`}}>
            <div style={{fontFamily:"monospace",fontSize:16,fontWeight:700,color:C.greenD,marginBottom:12}}>
              {t.lotNumero}
            </div>
            <div style={{fontSize:13,color:C.tx3,lineHeight:2,marginBottom:12}}>
              📄 CMR : <strong>{t.numeroCMR}</strong><br/>
              🚛 {t.immatTracteur} · {t.immatRemorque}<br/>
              🏢 {t.societeTransp}
            </div>
            {(()=>{
              const dech = dechiquetages.find((d: any)=>d.lotId===t.lotId && d.operateurDechiquetage);
              return (t.adresse||t.codePostal||t.commune||t.departement||dech)&&(
                <div style={{background:C.bg2,borderRadius:10,padding:"10px 14px",
                  marginBottom:16,border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,
                    textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>
                    📍 Adresse de chargement
                  </div>
                  {t.adresse&&(
                    <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:2}}>
                      {t.adresse}
                    </div>
                  )}
                  {(t.codePostal||t.commune)&&(
                    <div style={{fontSize:13,color:C.tx}}>
                      {[t.codePostal,t.commune].filter(Boolean).join(" ")}
                    </div>
                  )}
                  {t.departement&&(
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>
                      {t.departement}
                    </div>
                  )}
                  {dech&&(
                    <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.bd}`}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.tx2,
                        textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>
                        🪓 Opérateur de déchiquetage
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:2}}>
                        {dech.operateurDechiquetage}
                      </div>
                      {dech.telOperateur&&(
                        <a href={`tel:${dech.telOperateur.replace(/\s/g,"")}`}
                          style={{fontSize:13,color:C.green,fontWeight:600,
                            textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                          📞 {dech.telOperateur}
                        </a>
                      )}
                      {(()=>{
                        const gps = gpsChantier[t.lotId];
                        if(!gps) return null;
                        const mapsUrl = gps.coords
                          ? `https://maps.google.com/?q=${gps.coords.lat},${gps.coords.lng}`
                          : null;
                        return (
                          <div style={{marginTop:8,paddingTop:8,borderTop:`1px dashed ${C.bd}`}}>
                            <div style={{fontSize:11,fontWeight:700,color:C.tx2,
                              textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
                              📡 Position chantier
                            </div>
                            {gps.coords?(
                              <a href={mapsUrl||undefined} target="_blank" rel="noreferrer"
                                style={{fontSize:12,color:C.green,fontWeight:600,
                                  textDecoration:"none",display:"flex",alignItems:"center",gap:4}}>
                                🗺️ Ouvrir dans Maps (±{gps.coords.precision} m)
                              </a>
                            ):(
                              <div style={{fontSize:12,color:C.tx3}}>
                                Position GPS non disponible — contactez l'opérateur
                              </div>
                            )}
                            <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                              Enregistrée à {gps.heure} par {dech.operateurDechiquetage}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}
            <button onClick={()=>setConfirmed(p=>({...p,[t.id+"reception"]:true}))}
              disabled={confirmed[t.id+"reception"]}
              style={{width:"100%",padding:14,borderRadius:12,marginBottom:8,
                background:confirmed[t.id+"reception"]?C.greenL:"#fff",
                border:`2px solid ${confirmed[t.id+"reception"]?C.green:C.bd}`,
                color:confirmed[t.id+"reception"]?C.greenD:C.tx,
                fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
              {confirmed[t.id+"reception"]?"✅ Réception mission":"Réception mission"}
            </button>

            {confirmed[t.id+"reception"]&&(
              <div style={{marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>
                  🕐 Heure d'arrivée estimée
                </div>
                <input type="time" value={heuresArriveeEst[t.id]||""}
                  onChange={e=>setHeuresArriveeEst(p=>({...p,[t.id]:e.target.value}))}
                  disabled={!!heuresValidees[t.id]}
                  style={{width:"100%",height:46,padding:"0 14px",borderRadius:10,
                    border:`1.5px solid ${heuresValidees[t.id]?C.green:C.bd}`,
                    background:heuresValidees[t.id]?C.greenL:"#fff",
                    color:C.tx,fontFamily:"inherit",fontSize:15,outline:"none"}}/>
                {!heuresValidees[t.id]&&(
                  <button
                    onClick={()=>{
                      const h=heuresArriveeEst[t.id];
                      if(!h) return;
                      setHeuresValidees(p=>({...p,[t.id]:h}));
                      onValiderArrivee&&onValiderArrivee(t.lotId, h, (user.prenom||"")+" "+(user.nom||""), capaciteM3);
                    }}
                    disabled={!heuresArriveeEst[t.id]}
                    style={{width:"100%",marginTop:8,padding:13,borderRadius:12,
                      background:heuresArriveeEst[t.id]?C.green:"#eee",
                      border:"none",color:"#fff",
                      fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                      opacity:heuresArriveeEst[t.id]?1:0.5,
                      WebkitTapHighlightColor:"transparent"}}>
                    ✉️ Valider et notifier l'opérateur
                  </button>
                )}
                {heuresValidees[t.id]&&(
                  <div style={{marginTop:8,padding:"10px 14px",borderRadius:10,
                    background:C.greenL,border:`1px solid ${C.green}`,
                    fontSize:13,color:C.greenD,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                    ✅ Heure {heuresValidees[t.id]} transmise à l'opérateur de déchiquetage
                  </div>
                )}
              </div>
            )}

            {heuresValidees[t.id]&&!confirmed[t.id+"arrivePlace"]&&(
              <button onClick={()=>{
                  const now=new Date();
                  const hh=String(now.getHours()).padStart(2,"0");
                  const mm=String(now.getMinutes()).padStart(2,"0");
                  setHeuresArriveSite(p=>({...p,[t.id]:`${hh}:${mm}`}));
                  setConfirmed(p=>({...p,[t.id+"arrivePlace"]:true}));
                }}
                style={{width:"100%",padding:14,borderRadius:12,marginBottom:8,
                  background:"#fff",border:`2px solid ${C.bd}`,color:C.tx,
                  fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                📍 Arrivé sur site de chargement
              </button>
            )}
            {confirmed[t.id+"arrivePlace"]&&(
              <div style={{padding:"10px 14px",borderRadius:10,marginBottom:8,
                background:C.greenL,border:`1px solid ${C.green}`,
                fontSize:13,color:C.greenD,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                ✅ Arrivé sur site à {heuresArriveSite[t.id]}
              </div>
            )}
            {confirmed[t.id+"arrivePlace"]&&!heuresDebutCharg[t.id]&&(
              <style>{`@keyframes pulse-charg{0%,100%{opacity:1;box-shadow:0 4px 18px rgba(255,111,0,.45)}50%{opacity:.88;box-shadow:0 6px 28px rgba(255,111,0,.75)}}`}</style>
            )}
            {/* Bouton fixe en bas — visible depuis n'importe où sur la page */}
            {confirmed[t.id+"arrivePlace"]&&!heuresDebutCharg[t.id]&&(
              <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:8888,
                padding:"10px 16px 28px",
                background:"linear-gradient(transparent,rgba(0,0,0,.18) 30%,rgba(0,0,0,.35))"}}>
                <button onClick={()=>{
                    const now=new Date();
                    const hh=String(now.getHours()).padStart(2,"0");
                    const mm=String(now.getMinutes()).padStart(2,"0");
                    setHeuresDebutCharg(p=>({...p,[t.id]:`${hh}:${mm}`}));
                  }}
                  style={{width:"100%",padding:18,borderRadius:16,
                    background:"linear-gradient(135deg,#FF6F00,#FF8F00)",
                    border:"none",color:"#fff",
                    fontFamily:"inherit",fontSize:18,fontWeight:800,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",letterSpacing:.5,
                    boxShadow:"0 4px 18px rgba(255,111,0,.45)",
                    animation:"pulse-charg 1.4s ease-in-out infinite"}}>
                  🟠 DÉBUT DE CHARGEMENT
                </button>
              </div>
            )}
            {heuresDebutCharg[t.id]&&(
              <div style={{padding:"10px 14px",borderRadius:10,marginBottom:8,
                background:"#FFF3E0",border:`1px solid #FF8F00`,
                fontSize:13,color:"#E65100",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                🟠 Chargement démarré à {heuresDebutCharg[t.id]}
              </div>
            )}

            {/* FIN DE CHARGEMENT */}
            {heuresDebutCharg[t.id]&&!heuresFinCharg[t.id]&&(
              <button onClick={()=>{
                  const fin=getNow();
                  const duree=diffMin(heuresDebutCharg[t.id],fin);
                  setHeuresFinCharg(p=>({...p,[t.id]:fin}));
                  if(duree<5) setJustifModal({tid:t.id,dureeMin:duree});
                }}
                style={{width:"100%",padding:14,borderRadius:12,marginBottom:8,
                  background:"#fff",border:`2px solid ${C.bd}`,color:C.tx,
                  fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent"}}>
                🏁 Fin de chargement
              </button>
            )}
            {heuresFinCharg[t.id]&&(
              <div style={{padding:"10px 14px",borderRadius:10,marginBottom:8,
                background:C.greenL,border:`1px solid ${C.green}`,
                fontSize:13,color:C.greenD,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                ✅ Chargement terminé à {heuresFinCharg[t.id]}
                {justifValidees[t.id]&&<span style={{fontSize:11,fontWeight:400,marginLeft:4,color:C.tx3}}>· {justifValidees[t.id]}</span>}
              </div>
            )}

            {/* Départ et déchargement — uniquement après fin de chargement validée */}
            {heuresFinCharg[t.id]&&(justifModal?.tid!==t.id)&&(!justifModal||justifValidees[t.id])&&[
              {label:"Départ confirmé",key:"depart"},
              {label:"Arrivé sur site déchargement",key:"arrivee"},
            ].map(btn=>(
              <button key={btn.key} onClick={()=>{
                  setConfirmed(p=>({...p,[t.id+btn.key]:true}));
                  if(btn.key==="depart"&&onValiderDepart){
                    const now=new Date();
                    const hh=String(now.getHours()).padStart(2,"0");
                    const mm=String(now.getMinutes()).padStart(2,"0");
                    onValiderDepart(t.lotId||t.id,{
                      nomChauffeur:((user.prenom||"")+" "+(user.nom||"")).trim(),
                      capaciteM3,
                      lotNumero:t.lotNumero,
                      heureDebutCharg:heuresDebutCharg[t.id]||"—",
                      heureFinCharg:heuresFinCharg[t.id]||"—",
                      heureDepart:`${hh}:${mm}`
                    });
                  }
                }}
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

      {/* Modal justification chargement court */}
      {justifModal&&!justifValidees[justifModal.tid]&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,
          display:"flex",alignItems:"flex-end"}}>
          <div style={{background:"#fff",width:"100%",borderRadius:"20px 20px 0 0",
            padding:"24px 20px 36px"}}>
            <div style={{fontSize:22,textAlign:"center",marginBottom:8}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:700,textAlign:"center",marginBottom:4}}>
              Chargement court détecté
            </div>
            <div style={{fontSize:13,color:C.tx3,textAlign:"center",marginBottom:20}}>
              Durée : <strong>{justifModal.dureeMin} min</strong> — inférieure à 5 minutes.<br/>
              Veuillez indiquer la raison.
            </div>
            {[
              {val:"Manque de produits",icon:"📦"},
              {val:"Chargement annulé",icon:"🚫"},
              {val:"Erreur de mission",icon:"📋"},
            ].map(opt=>(
              <button key={opt.val} onClick={()=>setJustifChoix(opt.val)}
                style={{width:"100%",padding:"12px 16px",borderRadius:12,marginBottom:8,
                  background:justifChoix===opt.val?"#E3F2FD":"#fff",
                  border:`2px solid ${justifChoix===opt.val?C.blue:C.bd}`,
                  color:justifChoix===opt.val?C.blue:C.tx,
                  fontFamily:"inherit",fontSize:14,fontWeight:600,
                  cursor:"pointer",textAlign:"left",
                  WebkitTapHighlightColor:"transparent"}}>
                {opt.icon} {opt.val}
              </button>
            ))}
            <button onClick={()=>setJustifChoix("autre")}
              style={{width:"100%",padding:"12px 16px",borderRadius:12,marginBottom:justifChoix==="autre"?8:16,
                background:justifChoix==="autre"?"#E3F2FD":"#fff",
                border:`2px solid ${justifChoix==="autre"?C.blue:C.bd}`,
                color:justifChoix==="autre"?C.blue:C.tx,
                fontFamily:"inherit",fontSize:14,fontWeight:600,
                cursor:"pointer",textAlign:"left",
                WebkitTapHighlightColor:"transparent"}}>
              ✏️ Autre raison
            </button>
            {justifChoix==="autre"&&(
              <textarea value={justifTexte} onChange={e=>setJustifTexte(e.target.value)}
                placeholder="Décrivez la raison..."
                rows={3}
                style={{width:"100%",borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"10px 12px",fontFamily:"inherit",fontSize:14,
                  resize:"none",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
            )}
            <button
              disabled={!justifChoix||(justifChoix==="autre"&&!justifTexte.trim())}
              onClick={()=>{
                const raison=justifChoix==="autre"?justifTexte.trim():justifChoix;
                setJustifValidees(p=>({...p,[justifModal.tid]:raison}));
                setJustifModal(null);
                setJustifChoix("");
                setJustifTexte("");
              }}
              style={{width:"100%",padding:14,borderRadius:14,
                background:(!justifChoix||(justifChoix==="autre"&&!justifTexte.trim()))?"#ccc":C.blue,
                border:"none",color:"#fff",fontFamily:"inherit",
                fontSize:15,fontWeight:700,cursor:"pointer",
                WebkitTapHighlightColor:"transparent",
                opacity:(!justifChoix||(justifChoix==="autre"&&!justifTexte.trim()))?0.6:1}}>
              Valider la justification
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Flux déchiquetage multi-camions (espace opérateur rôle) ────────────────
const FluxDechiquetageRole = ({lot, user, onFinChantier, onRetour, toast}: any) => {
  // phase: demarrage | en_cours | saisie_fin | entre_camions | cloture
  const [phase,        setPhase]       = useState("demarrage");
  const [machine,      setMachine]     = useState(()=>{ try { return localStorage.getItem(`applitag_dech_machine_${user?.id||""}`)||""; } catch { return ""; } });
  const [heureDebut,   setHeureDebut]  = useState("");
  const [dateDebut,    setDateDebut]   = useState("");
  const [chargements,  setChargements] = useState<any[]>([]); // [{type,cubage,tonnage,cmr,immatTract,immatRemor,heureFin}]
  // Saisie fin de chargement
  const [typeCharg,    setTypeCharg]   = useState("semi");
  const [cubage,       setCubage]      = useState("");
  const [tonnage,      setTonnage]     = useState("");
  const [cmr,          setCmr]         = useState("");
  const [immatTract,   setImmatTract]  = useState("");
  const [immatRemor,   setImmatRemor]  = useState("");
  const [heureFin,     setHeureFin]    = useState("");
  const [saving,       setSaving]      = useState(false);

  const [chrono,       setChrono]       = useState(0); // secondes écoulées
  const chronoRef = useRef<any>(null);

  useEffect(()=>{
    if(phase==="en_cours"){
      chronoRef.current = setInterval(()=>setChrono(s=>s+1), 1000);
    } else {
      clearInterval(chronoRef.current);
      if(phase==="demarrage") setChrono(0);
    }
    return ()=>clearInterval(chronoRef.current);
  },[phase]);

  const fmtChrono = (s: any) => {
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    return h>0
      ? `${h}h ${String(m).padStart(2,"0")}min ${String(sec).padStart(2,"0")}s`
      : `${String(m).padStart(2,"0")}min ${String(sec).padStart(2,"0")}s`;
  };

  const operateurNom = `${user.prenom||""} ${user.nom||""}`.trim();
  const entreprise   = user.etfNom || "—";

  const hNow = () => { const d=new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

  const resetFinCharg = () => { setTypeCharg("semi"); setCubage(""); setTonnage(""); setCmr(""); setImmatTract(""); setImmatRemor(""); setHeureFin(""); };

  const handleDemarrer = () => {
    if (!machine.trim()) { toast&&toast("Veuillez indiquer le nom de la machine","warn"); return; }
    try { localStorage.setItem(`applitag_dech_machine_${user?.id||""}`, machine); } catch { /* noop */ }
    const now = new Date();
    setHeureDebut(hNow());
    setDateDebut(now.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}));
    setPhase("en_cours");
  };

  const handleValiderChargement = () => {
    const errCMR = validateCMR(cmr);
    if (!cmr || errCMR) { toast&&toast("Numéro CMR invalide — format CMR-AAAA-NNNN","warn"); return; }
    if (!tonnage) { toast&&toast("Tonnage obligatoire","warn"); return; }
    if (!heureFin) { toast&&toast("Heure de fin obligatoire","warn"); return; }
    const dureeMin = Math.round(chrono / 60); // chrono = secondes depuis le début de ce chargement
    const entry = { type:typeCharg, cubage:parseFloat(cubage)||0, tonnage:parseFloat(tonnage)||0, cmr, immatTract, immatRemor, heureDebut, heureFin, dureeMin };
    setChargements(p=>[...p, entry]);
    resetFinCharg();
    setChrono(0);
    setPhase("entre_camions");
  };

  const handleFinChantier = async () => {
    setSaving(true);
    const payload = {
      lotId: lot.id, lotNumero: lot.lotNumero,
      entrepriseDechiquetage: entreprise,
      operateurDechiquetage: operateurNom,
      machine, heureDebut,
      chargements,
      nbCamions: chargements.length,
      tonnageTotal: chargements.reduce((s,c)=>s+c.tonnage,0),
      cubageTotal:  chargements.reduce((s,c)=>s+c.cubage,0),
      statut:"RECEPTION_A_EFFECTUER",
      dateJour: new Date().toISOString().slice(0,10),
    };
    try {
      await apiPost(`/dechiquetage`, payload);
      await apiPost(`/contacts/${lot.id}/transition`, {action:"terminerDechiquetage"});
      await apiPostPublic(`/messages-admin`, { type:"fin_chantier_dechiquetage", lotId:lot.id, lotNumero:lot.lotNumero,
        operateurDechiquetage:operateurNom, machine,
        nbCamions:chargements.length,
        tonnageTotal:payload.tonnageTotal.toFixed(1),
        message:`Chantier de déchiquetage terminé sur le lot ${lot.lotNumero}. ${chargements.length} camion(s) chargé(s), ${payload.tonnageTotal.toFixed(1)} t au total. Réception à effectuer.`,
        date:new Date().toISOString() });
    } catch(e) {
      toast&&toast(`Erreur enregistrement chantier — ${(e as any).message||"vérifiez la connexion"}`, "warn");
      setSaving(false);
      return;
    }
    setSaving(false);
    setPhase("cloture");
    onFinChantier&&onFinChantier(lot.id);
  };

  // ── Phase : cloture ──────────────────────────────────────────────────────
  if (phase==="cloture") return (
    <div style={{padding:PADDING,paddingBottom:40}}>
      <div style={{textAlign:"center",padding:"32px 0 24px"}}>
        <div style={{fontSize:48,marginBottom:12}}>🏁</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:6}}>Chantier clôturé</div>
        {(()=>{
          const avecDuree   = chargements.filter(c=>c.dureeMin!=null);
          const avecTonnage = chargements.filter(c=>c.tonnage>0);
          const moy    = avecDuree.length   ? Math.round(avecDuree.reduce((s,c)=>s+c.dureeMin,0)/avecDuree.length)           : null;
          const moyTon = avecTonnage.length ? (avecTonnage.reduce((s,c)=>s+c.tonnage,0)/avecTonnage.length).toFixed(1)        : null;
          return (
            <div style={{fontSize:13,color:C.tx3,lineHeight:1.8}}>
              {chargements.length} camion(s) · {chargements.reduce((s,c)=>s+c.tonnage,0).toFixed(1)} t chargées
              {moy!=null&&<><br/>⏱ Temps moyen de chargement : <strong style={{color:C.tx}}>{moy} min</strong></>}
              {moyTon!=null&&<><br/>⚖️ Tonnage moyen par camion : <strong style={{color:C.tx}}>{moyTon} t</strong></>}
            </div>
          );
        })()}
      </div>
      <div style={{background:"#E8F5E9",borderRadius:14,padding:16,border:"1px solid #A5D6A7",marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:"#2E7D32",marginBottom:6}}>✅ Statut mis à jour</div>
        <div style={{fontSize:12,color:"#388E3C",lineHeight:1.7}}>
          Le lot <strong>{lot.lotNumero}</strong> est classifié <strong>Réception à effectuer</strong>.<br/>
          La personne missionnée a été notifiée. L'administrateur voit la mise à jour en temps réel.
        </div>
      </div>
      <button onClick={onRetour} style={{width:"100%",padding:14,borderRadius:12,
        background:C.green,border:"none",color:"#fff",
        fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer"}}>
        ← Retour à mes lots
      </button>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <div style={{background:"#D85A30",color:"#fff",padding:"12px 16px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onRetour} style={{background:"rgba(255,255,255,.15)",border:"none",
            color:"#fff",padding:"5px 10px",borderRadius:8,fontSize:13,cursor:"pointer"}}>
            ← Retour
          </button>
          <div>
            <div style={{fontSize:14,fontWeight:600}}>🌀 Chantier de déchiquetage</div>
            <div style={{fontSize:11,opacity:.7}}>{lot.lotNumero} · {lot.commune}</div>
          </div>
        </div>
      </div>

      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,paddingBottom:40}}>

        {/* Recap auto */}
        <div style={{background:"#fff",borderRadius:12,padding:14,marginBottom:16,
          border:`1px solid ${C.bd}`}}>
          <div style={{fontSize:11,fontWeight:700,color:C.tx2,textTransform:"uppercase",
            letterSpacing:".06em",marginBottom:8}}>Informations chantier</div>
          <div style={{fontSize:13,color:C.tx,lineHeight:1.9}}>
            🏭 <strong>{entreprise}</strong><br/>
            👷 {operateurNom}
            {dateDebut&&<><br/>📅 {dateDebut}</>}
            {heureDebut&&<><br/>⏱ Début : {heureDebut}</>}
          </div>
        </div>

        {/* ── Phase : démarrage ── */}
        {phase==="demarrage"&&(<>
          <MInput label="Machine utilisée" value={machine} onChange={setMachine}
            placeholder="Ex : Jenz HEM 593, Doppstadt AK 430…"/>
          <BigBtn onClick={handleDemarrer} bg="#D85A30" icon="▶">
            DÉMARRER LE CHANTIER
          </BigBtn>
        </>)}

        {/* ── Phase : en cours ── */}
        {phase==="en_cours"&&(
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:36,marginBottom:10}}>⚙️</div>
            <div style={{fontSize:16,fontWeight:700,color:"#D85A30",marginBottom:4}}>
              Chantier en cours
            </div>
            <div style={{fontSize:13,color:C.tx3,marginBottom:20}}>
              Démarré à {heureDebut} · {machine}
            </div>
            {/* Chronomètre */}
            <div style={{background:"#1C2B23",borderRadius:16,padding:"18px 24px",
              marginBottom:20,display:"inline-block",minWidth:200}}>
              <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",
                textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>
                Durée de déchiquetage
              </div>
              <div style={{fontSize:36,fontWeight:700,color:"#4CAF50",
                fontVariantNumeric:"tabular-nums",letterSpacing:".04em",
                fontFamily:"ui-monospace,'SF Mono',monospace"}}>
                {fmtChrono(chrono)}
              </div>
            </div>
            {chargements.length>0&&(
              <div style={{background:C.greenL,borderRadius:10,padding:12,marginBottom:16,
                border:`1px solid ${C.green}`,fontSize:13,color:C.greenD}}>
                ✅ {chargements.length} chargement(s) enregistré(s)
              </div>
            )}
            <BigBtn onClick={()=>{ setHeureFin(hNow()); setPhase("saisie_fin"); }} bg="#D85A30" icon="🏁">
              FIN DE CHARGEMENT CAMION
            </BigBtn>
          </div>
        )}

        {/* ── Phase : saisie fin de chargement ── */}
        {phase==="saisie_fin"&&(<>
          <div style={{fontSize:14,fontWeight:700,color:"#D85A30",marginBottom:14}}>
            🚛 Chargement n°{chargements.length+1} — informations
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:8}}>Type de chargement</div>
            {[["semi","🚛","Semi-remorque"],["camion_remorque","🚚","Camion-remorque"],["benne_ampliroll","🏗️","Benne ampliroll"]].map(([v,e,l])=>(
              <div key={v} onClick={()=>setTypeCharg(v)}
                style={{padding:"11px 14px",borderRadius:10,cursor:"pointer",marginBottom:6,
                  border:`2px solid ${typeCharg===v?"#D85A30":C.bd}`,
                  background:typeCharg===v?"#FAECE7":"#fff",
                  display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{e}</span>
                <span style={{fontSize:13,fontWeight:typeCharg===v?600:400,
                  color:typeCharg===v?"#D85A30":C.tx}}>{l}</span>
              </div>
            ))}
          </div>
          <MInput label="Tonnage estimé chargé (t)" value={tonnage} onChange={setTonnage} type="number" placeholder="ex: 28" required/>
          <MInput label="Cubage chargé estimé (m³)" value={cubage} onChange={setCubage} type="number" placeholder="ex: 85"/>
          <MInput label="Numéro CMR" value={cmr} onChange={v=>setCmr(formatCMR(v))} placeholder="CMR-2026-0001" hint="CMR-AAAA-NNNN" required error={cmr?validateCMR(cmr) as any:undefined}/>
          <MInput label="Immat. tracteur" value={immatTract} onChange={v=>setImmatTract(formatImmat(v))} placeholder="AB-123-CD" error={immatTract?validateImmat(immatTract) as any:undefined}/>
          <MInput label="Immat. remorque" value={immatRemor} onChange={v=>setImmatRemor(formatImmat(v))} placeholder="EF-456-GH" error={immatRemor?validateImmat(immatRemor) as any:undefined}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Heure début chargement</div>
              <input type="time" value={heureDebut} disabled
                style={{width:"100%",height:46,padding:"0 12px",borderRadius:10,
                  border:`1.5px solid ${C.bd}`,background:"#f5f5f5",
                  color:C.tx3,fontFamily:"inherit",fontSize:14,outline:"none"}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Heure fin chargement</div>
              <input type="time" value={heureFin} onChange={e=>setHeureFin(e.target.value)}
                style={{width:"100%",height:46,padding:"0 12px",borderRadius:10,
                  border:`1.5px solid ${C.bd}`,background:"#fff",
                  color:C.tx,fontFamily:"inherit",fontSize:14,outline:"none"}}/>
            </div>
          </div>
          <BigBtn onClick={handleValiderChargement} bg={C.green} icon="✅">
            VALIDER CE CHARGEMENT
          </BigBtn>
        </>)}

        {/* ── Phase : entre deux camions ── */}
        {phase==="entre_camions"&&(
          <div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{fontSize:36,marginBottom:10}}>✅</div>
            <div style={{fontSize:15,fontWeight:700,color:C.greenD,marginBottom:4}}>
              Chargement {chargements.length} validé
            </div>
            <div style={{fontSize:13,color:C.tx3,marginBottom:20}}>
              {chargements.reduce((s,c)=>s+c.tonnage,0).toFixed(1)} t chargées au total
            </div>
            {/* Récap chargements */}
            {chargements.map((c,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:10,padding:"10px 14px",
                marginBottom:8,border:`1px solid ${C.bd}`,textAlign:"left",fontSize:12,color:C.tx3}}>
                <strong style={{color:C.tx}}>Camion {i+1}</strong> · {c.tonnage} t · {c.cmr} · {c.heureFin}
                {c.dureeMin!=null&&<span style={{color:C.green,marginLeft:6}}>({c.dureeMin} min)</span>}
              </div>
            ))}
            {(()=>{
              const avecDuree   = chargements.filter(c=>c.dureeMin!=null);
              const avecTonnage = chargements.filter(c=>c.tonnage>0);
              if(avecDuree.length<2&&avecTonnage.length<2) return null;
              const moy    = avecDuree.length>1   ? Math.round(avecDuree.reduce((s,c)=>s+c.dureeMin,0)/avecDuree.length)     : null;
              const moyTon = avecTonnage.length>1 ? (avecTonnage.reduce((s,c)=>s+c.tonnage,0)/avecTonnage.length).toFixed(1) : null;
              return (
                <div style={{background:C.bg2,borderRadius:10,padding:"10px 14px",
                  marginBottom:16,border:`1px solid ${C.bd}`,fontSize:12,color:C.tx2,lineHeight:1.8}}>
                  {moy!=null&&<div>⏱ Durée moyenne de chargement : <strong style={{color:C.tx}}>{moy} min</strong></div>}
                  {moyTon!=null&&<div>⚖️ Tonnage moyen par camion : <strong style={{color:C.tx}}>{moyTon} t</strong></div>}
                </div>
              );
            })()}
            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:10}}>
              <BigBtn onClick={()=>{ setHeureDebut(hNow()); setPhase("en_cours"); }} bg="#D85A30" icon="🔄">
                PROCHAIN CAMION
              </BigBtn>
              <button onClick={handleFinChantier} disabled={saving}
                style={{width:"100%",padding:14,borderRadius:12,
                  background:"#1C2B23",border:"none",color:"#fff",
                  fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer",
                  opacity:saving?0.6:1}}>
                {saving?"Clôture en cours…":"🏁 FIN DU CHANTIER"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
export const EcranRoleDechiquetage = ({user, contacts, avisArrivee={}, camionsPartis={}, onArriveeChantier, toast}: any) => {
  const lotsABroyer = contacts.filter((c: any)=>["BORD_ROUTE","A_DECHIQUETER"].includes(c.statutLot));
  const [actif, _setActif] = useState<any>(null);
  const [avisLus, setAvisLus] = useState<Record<string,any>>({});
  const arriveeKey = `applitag_arrivee_op_${user.id||user.nom}`;
  const [arriveeGlobale, setArriveeGlobale] = useState(()=>{try{const s=localStorage.getItem(arriveeKey);return s?JSON.parse(s):null}catch{return null}});
  const [recapOuvert, setRecapOuvert] = useState<any>(null); // "enRoute" | "partis" | null
  const [lotActif, setLotActif] = useState<any>(null); // lot en cours de déchiquetage

  // ── Rendu du flux multi-camions si un lot est actif ──────────────────────
  if (lotActif) return (
    <FluxDechiquetageRole
      lot={lotActif}
      user={user}
      toast={toast}
      onFinChantier={(_lotId: any)=>{
        // Retirer le lot de la liste locale (statut mis à jour côté API)
        setLotActif(null);
      }}
      onRetour={()=>setLotActif(null)}
    />
  );

  const handleArriveeGlobale = () => {
    const h = new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    const val = {heure:h,gpsStatut:"acquisition"};
    setArriveeGlobale(val);
    try{localStorage.setItem(arriveeKey,JSON.stringify(val))} catch { /* noop */ }
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          const coords = {lat:pos.coords.latitude, lng:pos.coords.longitude, precision:Math.round(pos.coords.accuracy)};
          const v2 = {heure:h,gpsStatut:"ok",coords};
          setArriveeGlobale(v2);
          try{localStorage.setItem(arriveeKey,JSON.stringify(v2))} catch { /* noop */ }
          onArriveeChantier&&onArriveeChantier("global", h, coords);
        },
        ()=>{
          const v2 = {heure:h,gpsStatut:"erreur"};
          setArriveeGlobale(v2);
          try{localStorage.setItem(arriveeKey,JSON.stringify(v2))} catch { /* noop */ }
          onArriveeChantier&&onArriveeChantier("global", h, null);
        },
        {enableHighAccuracy:true, timeout:10000}
      );
    } else {
      const v2 = {heure:h,gpsStatut:"indisponible"};
      setArriveeGlobale(v2);
      try{localStorage.setItem(arriveeKey,JSON.stringify(v2))} catch { /* noop */ }
      onArriveeChantier&&onArriveeChantier("global", h, null);
    }
  };
  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{textAlign:"center",padding:"24px 0 16px"}}>
        <div style={{fontSize:40}}>🌀</div>
        <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Bonjour {user.prenom}</div>
        <div style={{fontSize:13,color:C.tx3,marginTop:4}}>Opérations de déchiquetage</div>
      </div>
      {/* ── Boutons récap ── */}
      {(()=>{
        const nbEnRoute = Object.keys(avisArrivee).length;
        const nbPartis  = Object.keys(camionsPartis).length;
        if(nbEnRoute===0&&nbPartis===0) return null;
        return (
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {nbEnRoute>0&&(
              <button onClick={()=>setRecapOuvert((r: any)=>r==="enRoute"?null:"enRoute")}
                style={{flex:1,padding:"10px 8px",borderRadius:12,border:"none",fontFamily:"inherit",
                  fontSize:12,fontWeight:700,cursor:"pointer",
                  background:recapOuvert==="enRoute"?"#FFC107":"#FFF8E1",
                  color:"#E65100"}}>
                🚛 En route ({nbEnRoute})
              </button>
            )}
            {nbPartis>0&&(
              <button onClick={()=>setRecapOuvert((r: any)=>r==="partis"?null:"partis")}
                style={{flex:1,padding:"10px 8px",borderRadius:12,border:"none",fontFamily:"inherit",
                  fontSize:12,fontWeight:700,cursor:"pointer",
                  background:recapOuvert==="partis"?"#A5D6A7":"#E8F5E9",
                  color:"#2E7D32"}}>
                ✅ Chargés &amp; partis ({nbPartis})
              </button>
            )}
          </div>
        );
      })()}

      {/* ── Récap camions en route ── */}
      {recapOuvert==="enRoute"&&(
        <div style={{background:"#FFFDE7",borderRadius:14,padding:14,marginBottom:14,
          border:"1.5px solid #FFE082"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#E65100",marginBottom:10}}>
            🚛 Camions en route vers ce chantier
          </div>
          {Object.entries(avisArrivee).map(([lotId,avis])=>{
            const heure     = avis!=null&&typeof avis==="object" ? (avis as any).heure      : avis;
            const chauffeur = avis!=null&&typeof avis==="object" ? (avis as any).nomChauffeur : "—";
            const capacite  = avis!=null&&typeof avis==="object" ? (avis as any).capaciteM3  : null;
            const lot = contacts.find((c: any)=>c.id===lotId||c.lotId===lotId);
            return (
              <div key={lotId} style={{display:"flex",gap:10,alignItems:"flex-start",
                padding:"8px 0",borderBottom:"1px solid #FFE082"}}>
                <span style={{fontSize:18}}>🚛</span>
                <div style={{flex:1,fontSize:12,lineHeight:1.6}}>
                  <strong>{chauffeur}</strong>
                  {lot&&<span> · lot <strong>{lot.lotNumero}</strong></span>}
                  <br/>
                  Arrivée prévue <strong>{heure}</strong>
                  {capacite&&<span> · <strong>{capacite} m³</strong></span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Récap camions chargés et partis ── */}
      {recapOuvert==="partis"&&(
        <div style={{background:"#F1F8E9",borderRadius:14,padding:14,marginBottom:14,
          border:"1.5px solid #A5D6A7"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#2E7D32",marginBottom:10}}>
            ✅ Camions chargés et partis
          </div>
          {Object.entries(camionsPartis).map(([lotId,info]: any)=>(
            <div key={lotId} style={{display:"flex",gap:10,alignItems:"flex-start",
              padding:"8px 0",borderBottom:"1px solid #C8E6C9"}}>
              <span style={{fontSize:18}}>✅</span>
              <div style={{flex:1,fontSize:12,lineHeight:1.6}}>
                <strong>{info.nomChauffeur||"—"}</strong>
                {info.lotNumero&&<span> · lot <strong>{info.lotNumero}</strong></span>}
                <br/>
                Départ <strong>{info.heureDepart||"—"}</strong>
                {info.capaciteM3&&<span> · <strong>{info.capaciteM3} m³</strong></span>}
                {info.heureDebutCharg&&info.heureFinCharg&&
                  <span style={{color:"#558B2F"}}> · chargement {info.heureDebutCharg}→{info.heureFinCharg}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(avisArrivee).map(([lotId,avis])=>{
        const heure = avis!=null&&typeof avis==="object" ? (avis as any).heure : avis;
        const nomChauffeur = avis!=null&&typeof avis==="object" ? (avis as any).nomChauffeur : "Le chauffeur";
        const capacite = avis!=null&&typeof avis==="object" ? (avis as any).capaciteM3 : null;
        const lot = contacts.find((c: any)=>c.id===lotId||c.lotId===lotId);
        const lu = !!avisLus[lotId];
        return lu ? (
          /* Trace archivée après "Compris" */
          <div key={lotId} style={{background:"#F9FBE7",borderRadius:12,padding:"10px 14px",
            marginBottom:12,border:"1px solid #C5E1A5",
            display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>✅</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#558B2F"}}>
                Avis reçu — {nomChauffeur}
              </div>
              <div style={{fontSize:11,color:"#5D4037",marginTop:2}}>
                Arrivée prévue à <strong>{heure}</strong> · lot <strong>{lot?.lotNumero||lotId}</strong>
                {capacite&&<span> · <strong>{capacite} m³</strong></span>}
              </div>
            </div>
          </div>
        ) : (
          /* Notification active */
          <div key={lotId} style={{background:"#FFF8E1",borderRadius:14,padding:16,
            marginBottom:14,border:"2px solid #FFC107",position:"relative"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#E65100",marginBottom:6}}>
              🚛 Camion en route — arrivée estimée {heure}{capacite?` · capacité ${capacite} m³`:""}
            </div>
            <div style={{fontSize:12,color:"#5D4037",lineHeight:1.6}}>
              <strong>{nomChauffeur}</strong> a confirmé son arrivée sur le lot{lot?" ":""}
              <strong>{lot?.lotNumero||lotId}</strong> pour <strong>{heure}</strong>.
              {capacite&&<span> Capacité véhicule : <strong>{capacite} m³</strong>.</span>}
              {" "}Préparez le chargement.
            </div>
            <button onClick={()=>setAvisLus(p=>({...p,[lotId]:true}))}
              style={{marginTop:10,padding:"7px 14px",borderRadius:8,border:"none",
                background:"#FF8F00",color:"#fff",fontSize:12,fontWeight:600,
                cursor:"pointer",fontFamily:"inherit"}}>
              ✓ Compris
            </button>
          </div>
        );
      })}
      {lotsABroyer.length===0?(
        <div style={{background:C.bg2,borderRadius:14,padding:20,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>✅</div>
          <div style={{fontSize:14,color:C.tx3}}>Aucun lot à déchiqueter actuellement</div>
        </div>
      ):lotsABroyer.map((lot: any)=>(
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
            📍 {lot.commune} · ⚖️ {lot.tonnageCumul?fmtNum(lot.tonnageCumul,1):"—"} t
          </div>
          <button onClick={()=>{ if(arriveeGlobale) setLotActif(lot); }}
            disabled={!arriveeGlobale}
            style={{width:"100%",padding:12,borderRadius:10,
              background:arriveeGlobale?"#FAECE7":"#f5f5f5",
              border:`2px solid ${arriveeGlobale?"#D85A30":C.bd}`,
              color:arriveeGlobale?"#D85A30":C.tx3,
              fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",
              opacity:arriveeGlobale?1:0.5,
              WebkitTapHighlightColor:"transparent"}}>
            🌀 Démarrer le déchiquetage
          </button>
        </div>
      ))}

      {/* ── Bouton arrivée sur chantier (une seule fois) ou fin du chantier ── */}
      {!arriveeGlobale?(
        <div style={{marginTop:8,marginBottom:24}}>
          <button onClick={handleArriveeGlobale}
            style={{width:"100%",padding:14,borderRadius:12,
              background:C.greenL,border:`2px solid ${C.green}`,color:C.greenD,
              fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}>
            📍 Arrivé sur chantier
          </button>
        </div>
      ):(()=>{
        const a = arriveeGlobale;
        return (
          <div style={{marginTop:8,marginBottom:24}}>
            {a.gpsStatut==="acquisition"&&(
              <div style={{padding:"8px 12px",borderRadius:8,marginBottom:8,
                background:"#E3F2FD",border:"1px solid #90CAF9",
                fontSize:12,color:"#1565C0",display:"flex",alignItems:"center",gap:6}}>
                <span>📡</span>Acquisition GPS en cours…
              </div>
            )}
            {a.gpsStatut==="ok"&&a.coords&&(
              <div style={{padding:"8px 12px",borderRadius:8,marginBottom:8,
                background:"#E8F5E9",border:"1px solid #A5D6A7",
                fontSize:12,color:"#2E7D32",display:"flex",alignItems:"center",gap:6}}>
                <span>✅</span>Position GPS transmise aux chauffeurs (±{a.coords.precision} m)
              </div>
            )}
            {(a.gpsStatut==="erreur"||a.gpsStatut==="indisponible")&&(
              <div style={{padding:"8px 12px",borderRadius:8,marginBottom:8,
                background:"#FFF8E1",border:"1px solid #FFD54F",
                fontSize:12,color:"#F57F17"}}>
                ⚠️ GPS non disponible — chauffeurs notifiés sans coordonnées
              </div>
            )}
            <button onClick={()=>{
                setArriveeGlobale(null);
                try{localStorage.removeItem(arriveeKey)} catch { /* noop */ }
              }}
              style={{width:"100%",padding:14,borderRadius:12,
                background:"#FFEBEE",border:"2px solid #EF9A9A",color:"#C62828",
                fontFamily:"inherit",fontSize:14,fontWeight:700,cursor:"pointer",
                WebkitTapHighlightColor:"transparent"}}>
              🏁 Fin du chantier
            </button>
          </div>
        );
      })()}
    </div>
  );
};

// ── ENTREPRISE SOLLICITÉE ─────────────────────────────────────────────────────
const FONCTIONS_ETF = [
  {value:"abattage",      label:"Opérateur abattage"},
  {value:"debardage",     label:"Porteur / débardage"},
  {value:"dechiquetage",  label:"Opérateur déchiquetage"},
  {value:"chauffeur",     label:"Chauffeur camion"},
];

export const EcranEntrepriseSollicitee = ({user, lots=[], toast}: any) => {
  const storageKey = `applitag_etf_operateurs_${user.id}`;
  const [operateurs, setOperateurs] = useState(()=>{
    try{const s=localStorage.getItem(storageKey);return s?JSON.parse(s):[]}catch{return[]}
  });
  const [showForm, setShowForm] = useState(false);
  const [nom,      setNom]      = useState("");
  const [prenom,   setPrenom]   = useState("");
  const [fonction, setFonction] = useState("abattage");
  const [lotId,    setLotId]    = useState("");

  const lotsEtf = lots.filter((l: any)=>
    l.etfNom===(user.nomEntreprise||user.nom) ||
    l.etfId===user.id
  );

  const save = (list: any) => {
    setOperateurs(list);
    try{localStorage.setItem(storageKey,JSON.stringify(list))} catch { /* noop */ }
  };

  const handleAjouter = () => {
    if(!nom.trim()||!prenom.trim()||!lotId){
      toast("Renseignez nom, prénom et lot assigné","warn"); return;
    }
    const nouvel = {
      id: Date.now().toString(),
      nom: nom.trim(), prenom: prenom.trim(),
      fonction, lotId,
      lotNumero: lots.find((l: any)=>l.id===lotId)?.lotNumero||lotId,
      dateCreation: new Date().toLocaleDateString("fr-FR"),
    };
    save([...operateurs, nouvel]);
    setNom(""); setPrenom(""); setFonction("abattage"); setLotId("");
    setShowForm(false);
    toast("Opérateur ajouté ✓");
  };

  const handleSupprimer = (id: any) => save(operateurs.filter((o: any)=>o.id!==id));

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
          <button onClick={handleAjouter}
            style={{width:"100%",padding:13,borderRadius:12,border:"none",
              background:C.purpleD,color:"#fff",fontSize:14,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit"}}>
            ✅ Créer l'opérateur
          </button>
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
export const EcranRoleReceptionnaire = ({user, livraisons=[], contacts=[], visites=[], toast}: any) => {
  const [onglet, setOnglet] = useState("attente"); // "attente" | "stock" | "historique"
  const [humidite, setHumidite] = useState<Record<string,any>>({});
  const [confirmes, setConfirmes] = useState<Record<string,any>>({});
  const [lotStockSelec, setLotStockSelec] = useState<any>(null); // lot contact ouvert dans "En stock"
  const [rechercheHisto, setRechercheHisto] = useState("");

  const platLivs = livraisons.filter((l: any)=>l.typeDest==="plateforme");
  const enAttente = platLivs.filter((l: any)=>!l.statut||l.statut==="en_attente");
  const recues    = platLivs.filter((l: any)=>l.statut==="recu"||confirmes[l.id]);
  const enStock   = contacts.filter((c: any)=>["BORD_ROUTE","A_DECHIQUETER","EN_STOCK_PLATEFORME"].includes(c.statutLot));
  const tonnageStock = platLivs.filter((l: any)=>l.statut==="recu"||confirmes[l.id]).reduce((s: any,l: any)=>s+(parseFloat(l.pesee)||0),0);
  const tonnageRecus = recues.reduce((s: any,l: any)=>s+(parseFloat(l.pesee)||0),0);

  const handleConfirmer = (l: any) => {
    setConfirmes(p=>({...p,[l.id]:true}));
    toast("Réception enregistrée ✓");
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
                  🚛 CMR : {l.numeroCMR||"—"}<br/>
                  ⚖️ Pesée transport : <strong style={{color:C.tx}}>{l.pesee} t</strong><br/>
                  📅 {new Date(l.dateHeureLivraison).toLocaleDateString("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx,marginBottom:6}}>
                    💧 Taux d'humidité à réception (%)
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
                  disabled={!h}
                  style={{width:"100%",padding:13,borderRadius:10,
                    background:h?"#1565C0":C.bg2,color:h?"#fff":C.tx3,
                    border:"none",fontFamily:"inherit",fontSize:14,fontWeight:700,
                    cursor:h?"pointer":"not-allowed",
                    WebkitTapHighlightColor:"transparent"}}>
                  ✅ Confirmer la réception
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
            const entrees = platLivs.filter((l: any)=>l.lotId===c.id&&(l.statut==="recu"||confirmes[l.id]));
            const tonnageLot = entrees.reduce((s: any,l: any)=>s+(parseFloat(l.pesee)||0),0);
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
          {platLivs.filter((l: any)=>l.lotId===lotStockSelec.id&&(l.statut==="recu"||confirmes[l.id])).length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"24px 0",fontSize:13}}>
              Aucune entrée enregistrée pour ce lot
            </div>
          )}
          {platLivs.filter((l: any)=>l.lotId===lotStockSelec.id&&(l.statut==="recu"||confirmes[l.id])).map((l: any,i: any)=>(
            <div key={l.id||i} style={{background:"#fff",borderRadius:12,padding:14,
              marginBottom:8,border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tx}}>Entrée {i+1}</div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:C.tx3}}>
                    {new Date(l.dateHeureLivraison).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx2}}>
                    {new Date(l.dateHeureLivraison).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                ⚖️ {l.pesee} t · 💧 {l.humiditeReception??humidite[l.id]??"—"}%<br/>
                📄 CMR : {l.numeroCMR||"—"}
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
                    {new Date(l.dateHeureLivraison).toLocaleDateString("fr-FR")}
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx2,marginTop:1}}>
                    {new Date(l.dateHeureLivraison).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                  </div>
                </div>
              </div>
              <div style={{fontSize:12,color:C.tx3,lineHeight:1.7}}>
                ⚖️ {l.pesee} t · 💧 {l.humiditeReception??humidite[l.id]??"—"}% · 📄 {l.numeroCMR}
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

  const tonnage = parseFloat(livraison?.pesee||visite?.volumeEstimeT||0);
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
  const [loaded,   setLoaded]  = useState(!!(window as any).L);
  const [filtre,   setFiltre]  = useState("TOUS");
  const [nbLots,   setNbLots]  = useState(0);
  const [couches,  setCouches] = useState({lots:true,chaufferies:true,chantiers:true,tas:true});

  // ── Chargement Leaflet depuis CDN ──
  useEffect(()=>{
    if ((window as any).L) { setLoaded(true); return; }
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
    const L = (window as any).L;
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
    (window as any).__aplt_open = (id: any)=>{
      const lot = contacts.find((c: any)=>c.id===id);
      if (lot) onOpenLot(lot);
    };
    return ()=>{ delete (window as any).__aplt_open; };
  },[contacts, onOpenLot]);


  // ── Mise à jour des markers ──
  useEffect(()=>{
    if (!loaded || !mapInst.current) return;
    const L = (window as any).L;
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
  },[loaded, contacts, visites, filtre, couches.lots]);

  // ── Couche Chaufferies ──
  useEffect(()=>{
    if (!loaded || !mapInst.current) return;
    const L = (window as any).L;
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
  },[loaded, couches.chaufferies]);

  // ── Couche Chantiers ──
  useEffect(()=>{
    if (!loaded || !mapInst.current) return;
    const L = (window as any).L;
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
  },[loaded, couches.chantiers]);

  // ── Couche Tas intermédiaires ──
  useEffect(()=>{
    if (!loaded || !mapInst.current) return;
    const L = (window as any).L;
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
  },[loaded, couches.tas]);

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
      )}
    </div>
  );
};

// ── GESTIONNAIRE FORESTIER ──────────────────────────────────────────
// Vue: parcelles + chantiers liés + lots en gestion

const GESTIONNAIRE_PARCELLES = [
  {id:"PARC-001",label:"Forêt de Tronçais — Parcelle 18",commune:"Tronçais (03360)",
   surface:8.4,essence:"Chêne/Charme",proprietaire:"M. Gallet Bernard",
   dernierPassage:"2026-07-21",chantiers:["CH-2026-14"],lots:["LOT-2026-044","LOT-2026-041"],
   statut:"chantier_en_cours",notes:"Coupe de taillis — suivi contrat 2026"},
  {id:"PARC-002",label:"Bocage Nord — Haies",commune:"Cérilly (03350)",
   surface:3.1,essence:"Charme/Noisetier",proprietaire:"Mme Renard Claire",
   dernierPassage:"2026-07-18",chantiers:["CH-2026-12"],lots:["LOT-2026-038"],
   statut:"terminé",notes:"Broyage bocager terminé — reboisement à planifier 2027"},
  {id:"PARC-003",label:"Parcelle Ternant — Douglas",commune:"Ternant (58)",
   surface:5.7,essence:"Douglas",proprietaire:"GFA Ternant",
   dernierPassage:"2026-07-14",chantiers:["CH-2026-11"],lots:["LOT-2026-042"],
   statut:"chantier_en_cours",notes:"Éclaircie mécanique en cours — prochaine visite à planifier"},
  {id:"PARC-004",label:"Tronçais Sud — Pin sylvestre",commune:"Tronçais (03360)",
   surface:12.2,essence:"Pin sylvestre",proprietaire:"M. Dubois René",
   dernierPassage:"2026-06-28",chantiers:["CH-2026-09"],lots:["LOT-2026-033","LOT-2026-034"],
   statut:"terminé",notes:"Coupe rase terminée — plan de reboisement déposé DRAAF"},
];

const STATUT_PARC = {
  chantier_en_cours:{label:"Chantier en cours",icon:"🔨",col:"#B45309",bg:"#FEF3C7"},
  planifié:         {label:"Chantier planifié",icon:"📋",col:"#1E40AF",bg:"#DBEAFE"},
  terminé:          {label:"Terminé",          icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  libre:            {label:"Libre",            icon:"🌿",col:"#6B7280",bg:"#F3F4F6"},
};

export const EcranRoleGestionnaire = (_props: any) => {
  const [selected, setSelected] = useState<string|null>(null);

  const parc = selected ? GESTIONNAIRE_PARCELLES.find(p=>p.id===selected) : null;

  if (parc) {
    const st = STATUT_PARC[parc.statut as keyof typeof STATUT_PARC]||STATUT_PARC.libre;
    return (
      <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
        <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",
          color:"#1E5B3A",fontSize:13,cursor:"pointer",padding:"0 0 14px",fontFamily:"inherit",
          display:"flex",alignItems:"center",gap:6}}>
          ← Retour aux parcelles
        </button>
        <div style={{background:C.bg,borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{fontSize:14,fontWeight:800,color:C.tx,flex:1}}>{parc.label}</div>
            <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,
              background:st.bg,color:st.col,flexShrink:0}}>{st.icon} {st.label}</span>
          </div>
          {[
            ["Propriétaire",parc.proprietaire],
            ["Commune",parc.commune],
            ["Surface",parc.surface+" ha"],
            ["Essence(s)",parc.essence],
            ["Dernier passage",new Date(parc.dernierPassage).toLocaleDateString("fr-FR")],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,
              paddingBottom:5,marginBottom:5,fontSize:12}}>
              <span style={{color:C.tx3,minWidth:130,flexShrink:0}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx}}>{v}</span>
            </div>
          ))}
          {parc.notes&&(
            <div style={{marginTop:8,background:"#F0FDF4",borderRadius:8,padding:10,
              fontSize:11,color:"#065F46",border:"1px solid #BBF7D0"}}>
              📝 {parc.notes}
            </div>
          )}
        </div>

        <div style={{marginBottom:10,fontSize:11,fontWeight:700,color:C.tx}}>
          🔨 Chantiers liés ({parc.chantiers.length})
        </div>
        {parc.chantiers.map(cid=>(
          <div key={cid} style={{background:C.bg,borderRadius:10,padding:"9px 12px",
            marginBottom:6,fontSize:11,border:`1px solid ${C.bd}`,
            display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>🔨</span>
            <span style={{fontWeight:600,color:C.tx}}>{cid}</span>
          </div>
        ))}
        <div style={{marginTop:10,marginBottom:10,fontSize:11,fontWeight:700,color:C.tx}}>
          📦 Lots en gestion ({parc.lots.length})
        </div>
        {parc.lots.map(lid=>(
          <div key={lid} style={{background:C.bg,borderRadius:10,padding:"9px 12px",
            marginBottom:6,fontSize:11,border:`1px solid ${C.bd}`,
            display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>📦</span>
            <span style={{fontWeight:600,color:C.tx}}>{lid}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:C.tx}}>🌲 Gestionnaire forestier</div>
        <div style={{fontSize:12,color:C.tx2}}>Parcelles, chantiers et lots en gestion</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🌳",label:"Parcelles",val:GESTIONNAIRE_PARCELLES.length,col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"🔨",label:"En cours",val:GESTIONNAIRE_PARCELLES.filter(p=>p.statut==="chantier_en_cours").length,col:"#B45309",bg:"#FEF3C7"},
          {ico:"📦",label:"Lots gérés",val:GESTIONNAIRE_PARCELLES.reduce((s,p)=>s+p.lots.length,0),col:"#0369A1",bg:"#DBEAFE"},
        ].map(kpi=>(
          <div key={kpi.label} style={{background:kpi.bg,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:18}}>{kpi.ico}</div>
            <div style={{fontSize:18,fontWeight:900,color:kpi.col}}>{kpi.val}</div>
            <div style={{fontSize:9,color:kpi.col}}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Liste parcelles */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {GESTIONNAIRE_PARCELLES.map(p=>{
          const st = STATUT_PARC[p.statut as keyof typeof STATUT_PARC]||STATUT_PARC.libre;
          return (
            <div key={p.id} onClick={()=>setSelected(p.id)}
              style={{background:C.bg,borderRadius:12,padding:"12px 14px",cursor:"pointer",
                border:`1px solid ${C.bd}`,display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{fontSize:22,flexShrink:0}}>🌲</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{p.label}</span>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                </div>
                <div style={{fontSize:10,color:C.tx3,marginBottom:4}}>
                  📍 {p.commune} · {p.surface} ha · {p.essence}
                </div>
                <div style={{fontSize:10,color:C.tx2}}>👤 {p.proprietaire}</div>
                <div style={{display:"flex",gap:8,marginTop:5,fontSize:10,color:C.tx3}}>
                  <span>🔨 {p.chantiers.length} chantier(s)</span>
                  <span>📦 {p.lots.length} lot(s)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── SCIERIE / INDUSTRIE DU BOIS ─────────────────────────────────
// Vue mobile : coproduits disponibles + enlèvements du jour

const SCIERIE_COPRODS_DEMO = [
  {id:"cp1",ref:"GR-2026-001",type:"Sciure",qte:2.8,humidite:18,destination:"Chaufferie",prix:0,statut:"disponible"},
  {id:"cp2",ref:"GR-2026-001",type:"Écorces",qte:1.4,humidite:42,destination:"Compostage",prix:0,statut:"disponible"},
  {id:"cp3",ref:"GR-2026-002",type:"Plaquettes",qte:6.5,humidite:25,destination:"Chaufferie",prix:28,statut:"vendu"},
  {id:"cp4",ref:"GR-2026-002",type:"Dosses/chutes",qte:4.2,humidite:20,destination:"Particulier",prix:15,statut:"disponible"},
];
const SCIERIE_ENLEVS_DEMO = [
  {id:"e1",date:"2026-09-06",client:"Chaufferie Communale Épinal",type:"Plaquettes",qte:6.5,prix:28,transporteur:"Camion Rossi",statut:"livré"},
];

const COPROD_STATUT = {
  disponible:{label:"Disponible",col:"#065F46",bg:"#D1FAE5"},
  vendu:     {label:"Vendu",     col:"#6B7280",bg:"#F3F4F6"},
  reservé:   {label:"Réservé",   col:"#1E40AF",bg:"#DBEAFE"},
};

export const EcranRoleScierie = (_props: any) => {
  const [onglet, setOnglet] = useState<"coprods"|"enlevements">("coprods");

  const dispo = SCIERIE_COPRODS_DEMO.filter(c=>c.statut==="disponible");
  const qteDispoT = dispo.reduce((s,c)=>s+c.qte,0);

  return (
    <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:PADDING,background:C.bg}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:C.tx}}>🏭 Scierie — Coproduits</div>
        <div style={{fontSize:12,color:C.tx2}}>Gestion des coproduits bois et enlèvements</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        <div style={{background:"#D1FAE5",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:900,color:"#065F46"}}>{dispo.length}</div>
          <div style={{fontSize:9,color:"#065F46",fontWeight:600}}>Coproduits disponibles</div>
        </div>
        <div style={{background:"#DBEAFE",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:900,color:"#1E40AF"}}>{qteDispoT.toFixed(1)} t</div>
          <div style={{fontSize:9,color:"#1E40AF",fontWeight:600}}>Volume disponible</div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:12,borderBottom:`1px solid ${C.bd}`,paddingBottom:6}}>
        {([["coprods","♻️ Coproduits"],["enlevements","🚛 Enlèvements"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>setOnglet(v)}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {onglet==="coprods"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {SCIERIE_COPRODS_DEMO.map(cp=>{
            const st = COPROD_STATUT[cp.statut as keyof typeof COPROD_STATUT]||COPROD_STATUT.disponible;
            return (
              <div key={cp.id} style={{background:C.bg,borderRadius:12,padding:"11px 13px",
                border:`1px solid ${C.bd}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:800,color:C.tx}}>♻️ {cp.type}</span>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:st.bg,color:st.col}}>{st.label}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10,color:C.tx2}}>
                  <span>📦 {cp.qte} t</span>
                  <span>💧 H = {cp.humidite}%</span>
                  <span>📬 {cp.destination}</span>
                  <span>🔗 {cp.ref}</span>
                  {cp.prix>0&&<span>💶 {cp.prix} €/t</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onglet==="enlevements"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {SCIERIE_ENLEVS_DEMO.map(e=>(
            <div key={e.id} style={{background:C.bg,borderRadius:12,padding:"11px 13px",
              border:`1px solid ${C.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:800,color:C.tx}}>🚛 {e.type}</span>
                <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                  background:"#D1FAE5",color:"#065F46"}}>{e.statut}</span>
              </div>
              <div style={{fontSize:10,color:C.tx2,display:"flex",flexDirection:"column",gap:2}}>
                <span>👤 {e.client}</span>
                <span>📦 {e.qte} t · {e.prix > 0 ? e.prix+" €/t" : "gratuit"}</span>
                <span>🚚 {e.transporteur}</span>
                <span>📅 {new Date(e.date).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          ))}
          {SCIERIE_ENLEVS_DEMO.length===0&&(
            <div style={{padding:24,textAlign:"center",color:C.tx3,fontSize:13}}>
              Aucun enlèvement enregistré aujourd'hui.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── COLLECTIVITÉ TERRITORIALE ──────────────────────────────────
const COLLECTIVITE_DEMO = {
  nom: "Moulins Communauté (CC Allier Nord)",
  territoire: "Allier (03)",
  nbCommunes: 32,
  chaufferies: [
    {id:"CF-MC-01",label:"Chaufferie Moulins Centre",puissanceMW:12,
     consoAnnuelT:1450,energieMWh:6900,certif:"SBP",ghgEco:89,coutTonne:97,statut:"en_service",
     fournisseurs:["ALTEGAD SAS","Bois Énergie Allier"]},
    {id:"CF-MC-02",label:"Chaufferie Moulins Nord",puissanceMW:6,
     consoAnnuelT:720,energieMWh:3350,certif:"SBP",ghgEco:87,coutTonne:101,statut:"en_service",
     fournisseurs:["ALTEGAD SAS"]},
    {id:"CF-MC-03",label:"Chaufferie Yzeure",puissanceMW:4,
     consoAnnuelT:480,energieMWh:2210,certif:"SURE",ghgEco:85,coutTonne:93,statut:"maintenance",
     fournisseurs:["Bois Énergie Allier"]},
  ],
};

export const EcranRoleCollectivite = (_props: any) => {
  const [onglet, setOnglet] = useState<"synthese"|"chaufferies"|"conformite">("synthese");
  const demo = COLLECTIVITE_DEMO;

  const totalT   = demo.chaufferies.reduce((s,c)=>s+c.consoAnnuelT,0);
  const totalMWh = demo.chaufferies.reduce((s,c)=>s+c.energieMWh,0);
  const avgCout  = Math.round(demo.chaufferies.reduce((s,c)=>s+c.coutTonne,0)/demo.chaufferies.length);
  const avgGhg   = Math.round(demo.chaufferies.reduce((s,c)=>s+c.ghgEco,0)/demo.chaufferies.length);

  const KPIS = [
    {icon:"🔥",val:demo.chaufferies.length,label:"Chaufferies"},
    {icon:"🌲",val:(totalT/1000).toFixed(1)+"k t",label:"Conso annuelle"},
    {icon:"⚡",val:(totalMWh/1000).toFixed(1)+" GWh",label:"Énergie produite"},
    {icon:"💶",val:avgCout+" €/t",label:"Coût moyen"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg,fontFamily:"inherit"}}>

      {/* Header */}
      <div style={{background:"#065F46",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🏛️ Collectivité · {demo.territoire}</div>
        <div style={{fontSize:17,fontWeight:800,lineHeight:1.2}}>{demo.nom}</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>{demo.nbCommunes} communes · {demo.chaufferies.length} chaufferies biomasse</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {KPIS.map((k,i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{k.icon}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#065F46"}}>{k.val}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["synthese","📊 Synthèse"],["chaufferies","🔥 Chaufferies"],["conformite","🌿 RED/GES"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{
            flex:1,padding:"11px 4px",border:"none",cursor:"pointer",fontFamily:"inherit",
            fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #065F46":"3px solid transparent",
            color:onglet===k?"#065F46":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>

        {/* Synthèse */}
        {onglet==="synthese"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,padding:14,border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>📈 Bilan territorial annuel</div>
              {demo.chaufferies.map(cf=>(
                <div key={cf.id} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                    <span style={{fontWeight:600,color:C.tx}}>{cf.label}</span>
                    <span style={{color:C.tx3}}>{cf.consoAnnuelT} t</span>
                  </div>
                  <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:4,background:"#059669",
                      width:`${Math.round(cf.consoAnnuelT/totalT*100)}%`}}/>
                  </div>
                  <div style={{fontSize:9,color:C.tx3,marginTop:2}}>
                    {Math.round(cf.consoAnnuelT/totalT*100)}% · {cf.energieMWh} MWh · {cf.coutTonne} €/t
                  </div>
                </div>
              ))}
              <div style={{borderTop:`1px solid ${C.bd}`,paddingTop:10,marginTop:4,
                display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:700}}>
                <span>Total</span>
                <span>{totalT.toLocaleString("fr-FR")} t · {(totalMWh/1000).toFixed(1)} GWh</span>
              </div>
            </div>
            <div style={{background:"#fff",borderRadius:12,padding:14,border:`1px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:8}}>🌿 Impact carbone moyen</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:28,fontWeight:900,color:"#059669"}}>{avgGhg}<span style={{fontSize:14}}>%</span></div>
                  <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>Économie GES</div>
                  <div style={{fontSize:9,color:C.tx3}}>vs. fossile</div>
                </div>
                <div style={{flex:1,fontSize:11,color:C.tx2,lineHeight:1.6}}>
                  Économie de {Math.round(totalT*avgGhg/100*0.265)} tCO₂ vs. combustible fossile. Conforme au seuil RED III (≥ 70 %).
                </div>
              </div>
            </div>
          </>
        )}

        {/* Chaufferies */}
        {onglet==="chaufferies"&&demo.chaufferies.map(cf=>(
          <div key={cf.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${cf.statut==="en_service"?"#059669":"#D97706"}`,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{fontWeight:800,fontSize:13,color:C.tx}}>{cf.label}</div>
              <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,
                background:cf.statut==="en_service"?"#D1FAE5":"#FEF3C7",
                color:cf.statut==="en_service"?"#065F46":"#92400E"}}>
                {cf.statut==="en_service"?"✅ En service":"⚠️ Maintenance"}
              </span>
            </div>
            {([
              ["⚡","Puissance",`${cf.puissanceMW} MW`],
              ["🌲","Conso annuelle",`${cf.consoAnnuelT.toLocaleString("fr-FR")} t`],
              ["💡","Énergie",`${cf.energieMWh.toLocaleString("fr-FR")} MWh`],
              ["💶","Coût moyen",`${cf.coutTonne} €/t`],
              ["📜","Certification",cf.certif],
            ] as [string,string,string][]).map(([ic,lb,v])=>(
              <div key={lb} style={{display:"flex",justifyContent:"space-between",
                fontSize:11,paddingBlock:4,borderBottom:`1px solid ${C.bd}`}}>
                <span style={{color:C.tx2}}>{ic} {lb}</span>
                <span style={{fontWeight:600,color:C.tx}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:8,fontSize:10,color:C.tx3}}>
              Fournisseurs : {cf.fournisseurs.join(", ")}
            </div>
          </div>
        ))}

        {/* Conformité RED */}
        {onglet==="conformite"&&(
          <>
            <div style={{background:"#D1FAE5",borderRadius:12,padding:12,
              border:"1px solid #6EE7B7",fontSize:11,color:"#065F46",lineHeight:1.6}}>
              🇪🇺 <strong>Directive RED III</strong> — Seuil GES ≥ 70 % pour installations &gt; 5 MW.
              Toutes les chaufferies de la CC dépassent ce seuil.
            </div>
            {demo.chaufferies.map(cf=>(
              <div key={cf.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
                <div style={{fontWeight:700,fontSize:12,marginBottom:8}}>{cf.label}</div>
                {([
                  ["🌿","Économie GES",`${cf.ghgEco} %`,"#059669"],
                  ["📜","Système certif.",cf.certif,"#0369A1"],
                  ["⚖️","Statut RED III",cf.ghgEco>=70?"✅ Conforme":"❌ Non conforme",cf.ghgEco>=70?"#059669":"#DC2626"],
                ] as [string,string,string,string][]).map(([ic,lb,v,col])=>(
                  <div key={lb} style={{display:"flex",justifyContent:"space-between",
                    fontSize:11,paddingBlock:4,borderBottom:`1px solid ${C.bd}`}}>
                    <span style={{color:C.tx2}}>{ic} {lb}</span>
                    <span style={{fontWeight:700,color:col}}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

// ── BUREAU D'ÉTUDES / INGÉNIERIE FORESTIÈRE ───────────────────
const BET_ETUDES_DEMO = [
  {id:"ET-001",label:"Plan de gestion — Forêt de Tronçais (03)",client:"GFA Tronçais",
   surface:245,essence:"Chêne/Pin sylvestre",statut:"en_cours",
   dateDebut:"2026-06-01",dateFin:"2026-12-15",avancement:62,
   certifVise:"PEFC",notes:"Phase 2 — inventaires dendrométriques terminés"},
  {id:"ET-002",label:"Étude éligibilité RED — Chaufferie Moulins",client:"CC Moulins Communauté",
   surface:null,essence:null,statut:"en_cours",
   dateDebut:"2026-08-01",dateFin:"2026-09-30",avancement:85,
   certifVise:"SBP",notes:"Vérification traçabilité amont — SURE vs SBP"},
  {id:"ET-003",label:"Diagnostic bocager — Cérilly",client:"Commune de Cérilly (03)",
   surface:48,essence:"Charme/Noisetier",statut:"livré",
   dateDebut:"2026-04-01",dateFin:"2026-06-30",avancement:100,
   certifVise:null,notes:"Rapport remis — suivi plantations à prévoir 2027"},
];
const BET_RAPPORTS_DEMO = [
  {id:"R-2026-08",titre:"Plan de gestion Tronçais — Phase 1",client:"GFA Tronçais",date:"2026-07-15",pages:34,format:"PDF"},
  {id:"R-2026-07",titre:"Rapport d'éligibilité PEFC — Bocage Vichy",client:"SAFER Allier",date:"2026-06-28",pages:18,format:"PDF"},
  {id:"R-2026-05",titre:"Étude desserte — Piste forestière nord",client:"ONF Allier",date:"2026-05-10",pages:12,format:"PDF+SIG"},
];

export const EcranRoleBET = (_props: any) => {
  const [onglet, setOnglet] = useState<"etudes"|"rapports"|"agenda">("etudes");
  const enCours = BET_ETUDES_DEMO.filter(e=>e.statut==="en_cours");
  const haTotal = BET_ETUDES_DEMO.filter(e=>e.surface).reduce((s,e)=>s+(e.surface||0),0);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#1E40AF",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>📐 Bureau d'Études · Ingénierie forestière</div>
        <div style={{fontSize:17,fontWeight:800}}>FORÊT CONSEIL Auvergne</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Allier (03) · PEFC · SBP · SURE</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["📋",enCours.length,"Études en cours"],["🌲",haTotal+" ha","Ha traités"],["📄",BET_RAPPORTS_DEMO.length,"Rapports"],["👥","12","Clients actifs"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#1E40AF"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["etudes","📋 Études"],["rapports","📄 Rapports"],["agenda","📅 Agenda"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #1E40AF":"3px solid transparent",
            color:onglet===k?"#1E40AF":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="etudes"&&BET_ETUDES_DEMO.map(et=>(
          <div key={et.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${et.statut==="livré"?"#6B7280":"#1E40AF"}`,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontWeight:800,fontSize:12,color:C.tx,flex:1,paddingRight:8}}>{et.label}</div>
              <span style={{fontSize:9,padding:"3px 7px",borderRadius:12,fontWeight:700,flexShrink:0,
                background:et.statut==="livré"?"#E5E7EB":"#DBEAFE",
                color:et.statut==="livré"?"#374151":"#1E40AF"}}>
                {et.statut==="livré"?"✅ Livré":"🔧 En cours"}
              </span>
            </div>
            <div style={{fontSize:11,color:C.tx3,marginBottom:8}}>👤 {et.client}{et.surface?` · 🌲 ${et.surface} ha`:""}</div>
            <div style={{background:C.bg,borderRadius:4,height:6,marginBottom:4,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,background:"#1E40AF",width:`${et.avancement}%`}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.tx3}}>
              <span>{et.avancement}% avancé</span>
              {et.certifVise&&<span>🎯 Certif. : {et.certifVise}</span>}
            </div>
            {et.notes&&<div style={{fontSize:10,color:C.tx2,marginTop:6,fontStyle:"italic"}}>{et.notes}</div>}
          </div>
        ))}
        {onglet==="rapports"&&BET_RAPPORTS_DEMO.map(r=>(
          <div key={r.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>{r.titre}</div>
            <div style={{fontSize:11,color:C.tx3,display:"flex",gap:12,flexWrap:"wrap"}}>
              <span>👤 {r.client}</span>
              <span>📅 {new Date(r.date).toLocaleDateString("fr-FR")}</span>
              <span>📄 {r.pages} p. · {r.format}</span>
            </div>
          </div>
        ))}
        {onglet==="agenda"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📅 Prochaines visites terrain</div>
            {[
              {date:"2026-09-10",label:"Inventaire dendrométrique — Tronçais Est",duree:"journée"},
              {date:"2026-09-15",label:"Réunion restitution — CC Moulins",duree:"2h"},
              {date:"2026-09-22",label:"Visite terrain — Bocage Cérilly",duree:"demi-journée"},
            ].map((ev,i)=>(
              <div key={i} style={{display:"flex",gap:10,paddingBlock:8,
                borderBottom:i<2?`1px solid ${C.bd}`:"none"}}>
                <div style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:"#1E40AF",flexShrink:0}}>
                  {new Date(ev.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx}}>{ev.label}</div>
                  <div style={{fontSize:10,color:C.tx3}}>⏱ {ev.duree}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── ETF — ENTREPRENEUR DE TRAVAUX FORESTIERS ──────────────────
const ETF_CHANTIERS_DEMO = [
  {id:"ETF-CH-01",label:"Abattage mécanique — Tronçais Est",commune:"Tronçais (03)",
   dateDebut:"2026-09-08",dateFin:"2026-09-19",machines:["Abatteuse Komatsu 931XC","Débardeur Ponsse"],
   essence:"Chêne",surfaceHa:12,volumeEstimeM3:380,statut:"en_cours",avancement:35,
   chef:"M. Bernard R.",contact:"06 12 34 56 78"},
  {id:"ETF-CH-02",label:"Broyage bocager — Cérilly Nord",commune:"Cérilly (03)",
   dateDebut:"2026-09-06",dateFin:"2026-09-10",machines:["Broyeur forestier Seppi M500"],
   essence:"Charme/Noisetier",surfaceHa:4.5,volumeEstimeM3:90,statut:"en_cours",avancement:70,
   chef:"Mme Dupont L.",contact:"06 98 76 54 32"},
];
const ETF_MATERIEL_DEMO = [
  {id:"M-01",label:"Abatteuse Komatsu 931XC",type:"Abattage",statut:"actif",chantier:"ETF-CH-01"},
  {id:"M-02",label:"Débardeur Ponsse Buffalo King",type:"Débardage",statut:"actif",chantier:"ETF-CH-01"},
  {id:"M-03",label:"Broyeur forestier Seppi M500",type:"Broyage",statut:"actif",chantier:"ETF-CH-02"},
  {id:"M-04",label:"Tracteur John Deere 6175R",type:"Polyvalent",statut:"disponible",chantier:null},
];

export const EcranRoleETF = (_props: any) => {
  const [onglet, setOnglet] = useState<"chantiers"|"planning"|"materiel">("chantiers");
  const totalM3 = ETF_CHANTIERS_DEMO.reduce((s,c)=>s+Math.round(c.volumeEstimeM3*c.avancement/100),0);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#78350F",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🌲 ETF · Travaux forestiers</div>
        <div style={{fontSize:17,fontWeight:800}}>ETF BOIS SERVICE Allier</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Abattage · Débardage · Broyage bocager</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["🪓",ETF_CHANTIERS_DEMO.length,"Chantiers actifs"],["📦",totalM3+" m³","Produits (estim.)"],["👥","6","Équipe"],["🚜",ETF_MATERIEL_DEMO.length,"Machines"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#78350F"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["chantiers","🪓 Chantiers"],["planning","📅 Planning"],["materiel","🚜 Matériel"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #78350F":"3px solid transparent",
            color:onglet===k?"#78350F":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="chantiers"&&ETF_CHANTIERS_DEMO.map(ch=>(
          <div key={ch.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:"4px solid #78350F",padding:14}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:4,color:C.tx}}>{ch.label}</div>
            <div style={{fontSize:11,color:C.tx3,marginBottom:8}}>📍 {ch.commune} · 🌿 {ch.essence} · {ch.surfaceHa} ha</div>
            <div style={{background:C.bg,borderRadius:4,height:6,marginBottom:4,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,background:"#78350F",width:`${ch.avancement}%`}}/>
            </div>
            <div style={{fontSize:9,color:C.tx3,marginBottom:8}}>{ch.avancement}% · ~{ch.volumeEstimeM3} m³ estimés</div>
            <div style={{fontSize:10,color:C.tx2,display:"flex",flexDirection:"column",gap:2}}>
              <span>👤 Chef : {ch.chef} · 📞 {ch.contact}</span>
              <span>🚜 {ch.machines.join(" · ")}</span>
              <span>📅 {new Date(ch.dateDebut).toLocaleDateString("fr-FR")} → {new Date(ch.dateFin).toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
        ))}
        {onglet==="planning"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📅 Semaine S36 — sept. 2026</div>
            {ETF_CHANTIERS_DEMO.map(ch=>(
              <div key={ch.id} style={{paddingBlock:8,borderBottom:`1px solid ${C.bd}`}}>
                <div style={{fontWeight:700,fontSize:12,color:C.tx,marginBottom:2}}>{ch.label}</div>
                <div style={{fontSize:10,color:C.tx2}}>📅 Fin prévue : {new Date(ch.dateFin).toLocaleDateString("fr-FR")} · {ch.avancement}% ✓</div>
                <div style={{fontSize:10,color:C.tx3,marginTop:2}}>🚜 {ch.machines[0]}</div>
              </div>
            ))}
            <div style={{paddingTop:10,fontSize:11,color:"#1E40AF",fontWeight:600}}>
              📋 Prochain chantier : Ternant (58) — démarrage 22 sept.
            </div>
          </div>
        )}
        {onglet==="materiel"&&ETF_MATERIEL_DEMO.map(m=>(
          <div key={m.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            borderLeft:`4px solid ${m.statut==="actif"?"#059669":"#6B7280"}`,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:12,color:C.tx}}>{m.label}</div>
                <div style={{fontSize:10,color:C.tx3,marginTop:2}}>🔧 {m.type}</div>
              </div>
              <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,
                background:m.statut==="actif"?"#D1FAE5":"#F3F4F6",
                color:m.statut==="actif"?"#065F46":"#6B7280"}}>
                {m.statut==="actif"?"⚙️ En chantier":"✅ Disponible"}
              </span>
            </div>
            {m.chantier&&<div style={{fontSize:10,color:C.tx2,marginTop:6}}>Sur : {ETF_CHANTIERS_DEMO.find(c=>c.id===m.chantier)?.label||m.chantier}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── ASSOCIATION / INTERPROFESSION ─────────────────────────────
const ASSO_MEMBRES_DEMO = [
  {id:"M-01",nom:"ALTEGAD SAS",type:"Négociant-gestionnaire",lots:48,statut:"adhérent"},
  {id:"M-02",nom:"Bois Énergie Allier",type:"Négociant",lots:31,statut:"adhérent"},
  {id:"M-03",nom:"ETF BOIS SERVICE",type:"ETF",lots:0,statut:"adhérent"},
  {id:"M-04",nom:"CC Moulins Communauté",type:"Collectivité",lots:0,statut:"adhérent"},
  {id:"M-05",nom:"Chaufferie Clermont-Ferrand",type:"Chaufferie",lots:0,statut:"adhérent"},
  {id:"M-06",nom:"GFA Tronçais",type:"Propriétaire forestier",lots:22,statut:"observateur"},
];

export const EcranRoleAssociation = (_props: any) => {
  const [onglet, setOnglet] = useState<"membres"|"ressources"|"activite">("membres");

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#0369A1",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🤝 Interprofession filière bois-énergie</div>
        <div style={{fontSize:17,fontWeight:800}}>FIBOIS Auvergne — Délégation Allier</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>{ASSO_MEMBRES_DEMO.length} membres · Allier (03) · AURA</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["🤝",ASSO_MEMBRES_DEMO.length,"Membres"],["🌲","28.4k t","Tonnage suivi"],["🗺️","186k ha","Forêt territoire"],["📅","6","Événements 2026"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#0369A1"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["membres","🤝 Membres"],["ressources","📋 Ressources"],["activite","📈 Activité"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #0369A1":"3px solid transparent",
            color:onglet===k?"#0369A1":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {onglet==="membres"&&ASSO_MEMBRES_DEMO.map(m=>(
          <div key={m.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px"}}>
            <div>
              <div style={{fontWeight:700,fontSize:12,color:C.tx}}>{m.nom}</div>
              <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{m.type}{m.lots>0?` · ${m.lots} lots`:""}</div>
            </div>
            <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,
              background:m.statut==="adhérent"?"#DBEAFE":"#F3F4F6",
              color:m.statut==="adhérent"?"#1E40AF":"#6B7280"}}>
              {m.statut}
            </span>
          </div>
        ))}
        {onglet==="ressources"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📋 Ressources partagées</div>
            {[
              {ic:"📊",titre:"Tableau de bord filière Allier 2026",type:"Rapport",date:"2026-07-01"},
              {ic:"⚖️","titre":"Guide conformité RED III — biomasse forestière",type:"Guide",date:"2026-05-15"},
              {ic:"🗺️",titre:"Cartographie ressources bois-énergie 03",type:"SIG",date:"2026-03-20"},
              {ic:"📋",titre:"Modèle plan d'approvisionnement SBP",type:"Template",date:"2026-01-10"},
            ].map((r,i)=>(
              <div key={i} style={{paddingBlock:8,borderBottom:i<3?`1px solid ${C.bd}`:"none",
                display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:18,flexShrink:0}}>{r.ic}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:C.tx}}>{r.titre}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{r.type} · {new Date(r.date).toLocaleDateString("fr-FR",{month:"short",year:"numeric"})}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {onglet==="activite"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📈 Statistiques filière 2026</div>
              {[
                ["🌲","Tonnage mobilisé","28 420 t"],
                ["⚡","Énergie produite","132 GWh"],
                ["🌿","Économie GES","87 %"],
                ["💶","Prix moyen","96 €/t"],
                ["🪓","ETF actifs","12 entreprises"],
                ["🔥","Chaufferies suivies","18 sites"],
              ].map(([ic,lb,v],i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                  paddingBlock:5,borderBottom:i<5?`1px solid ${C.bd}`:"none"}}>
                  <span style={{color:C.tx2}}>{ic} {lb}</span>
                  <span style={{fontWeight:700,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#DBEAFE",borderRadius:12,padding:12,
              border:"1px solid #93C5FD",fontSize:11,color:"#1E40AF",lineHeight:1.6}}>
              📅 <strong>Prochain événement</strong> — Journée filière bois-énergie Allier<br/>
              18 septembre 2026 · Moulins · 9h–17h
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── INSTITUTIONNEL — DDT / DRAAF / COLLECTIVITÉ PUBLIQUE ──────
const INSTIT_DOSSIERS_DEMO = [
  {id:"DOS-2026-041",titre:"Déclaration coupe rase — GFA Tronçais",surface:24,commune:"Tronçais (03)",
   statut:"instruit",dateDepot:"2026-07-12",essence:"Chêne",type:"coupe_rase",délai:"30j"},
  {id:"DOS-2026-038",titre:"PSG validé — Forêt communale Cérilly",surface:145,commune:"Cérilly (03)",
   statut:"validé",dateDepot:"2026-06-28",essence:"Mixte",type:"psg",délai:null},
  {id:"DOS-2026-035",titre:"Défrichement — Projet éolien Ternant",surface:4.2,commune:"Ternant (58)",
   statut:"refusé",dateDepot:"2026-05-15",essence:"Pin sylvestre",type:"defrichement",délai:null},
  {id:"DOS-2026-029",titre:"Boisement compensateur — Voie ferrée",surface:8,commune:"Moulins (03)",
   statut:"en_instruction",dateDepot:"2026-04-03",essence:"Feuillus",type:"boisement",délai:"60j"},
];
const STATUT_INSTIT_COLOR: Record<string,{bg:string,tx:string,lbl:string}> = {
  instruit:      {bg:"#FEF9C3",tx:"#92400E",lbl:"📋 En instruction"},
  validé:        {bg:"#D1FAE5",tx:"#065F46",lbl:"✅ Validé"},
  refusé:        {bg:"#FEE2E2",tx:"#991B1B",lbl:"❌ Refusé"},
  en_instruction:{bg:"#DBEAFE",tx:"#1E40AF",lbl:"🔍 À instruire"},
};

export const EcranRoleInstitutionnel = (_props: any) => {
  const [onglet, setOnglet] = useState<"dossiers"|"territoire"|"controles">("dossiers");
  const enCours = INSTIT_DOSSIERS_DEMO.filter(d=>d.statut==="instruit"||d.statut==="en_instruction");

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#1E3A5F",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>🏛️ Organisme institutionnel · DDT / DRAAF</div>
        <div style={{fontSize:17,fontWeight:800}}>DDT de l'Allier — Service Forêt</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Allier (03) · Direction Départementale des Territoires</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["📂",INSTIT_DOSSIERS_DEMO.length,"Dossiers"],["⏳",enCours.length,"En cours"],["🌲","186k ha","Forêt 03"],["🏘️","320","Communes"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#1E3A5F"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["dossiers","📂 Dossiers"],["territoire","🗺️ Territoire"],["controles","🔍 Contrôles"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #1E3A5F":"3px solid transparent",
            color:onglet===k?"#1E3A5F":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="dossiers"&&INSTIT_DOSSIERS_DEMO.map(d=>{
          const s = STATUT_INSTIT_COLOR[d.statut]||{bg:C.bg,tx:C.tx3,lbl:d.statut};
          return (
            <div key={d.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:8}}>
                <div style={{fontWeight:700,fontSize:12,color:C.tx,flex:1}}>{d.titre}</div>
                <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,
                  flexShrink:0,background:s.bg,color:s.tx}}>{s.lbl}</span>
              </div>
              <div style={{fontSize:10,color:C.tx3,display:"flex",gap:10,flexWrap:"wrap"}}>
                <span>📍 {d.commune}</span>
                <span>🌲 {d.surface} ha · {d.essence}</span>
                <span>📅 {new Date(d.dateDepot).toLocaleDateString("fr-FR")}</span>
                {d.délai&&<span style={{color:"#92400E",fontWeight:600}}>⏱ Délai : {d.délai}</span>}
              </div>
              <div style={{fontSize:9,color:C.tx3,marginTop:6,fontFamily:"monospace"}}>{d.id}</div>
            </div>
          );
        })}
        {onglet==="territoire"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>🗺️ Bilan territorial Allier</div>
            {[
              ["🌲","Surface forestière totale","186 000 ha"],
              ["📊","Taux de boisement","31 %"],
              ["🌿","Forêts publiques","28 400 ha"],
              ["🏘️","Forêts communales","14 200 ha"],
              ["⚡","Bois-énergie mobilisé","28 420 t/an"],
              ["🎯","PSG en vigueur","342 plans"],
              ["📋","Dossiers traités (2026)","41 dossiers"],
            ].map(([ic,lb,v],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                paddingBlock:5,borderBottom:i<6?`1px solid ${C.bd}`:"none"}}>
                <span style={{color:C.tx2}}>{ic} {lb}</span>
                <span style={{fontWeight:700,color:C.tx}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {onglet==="controles"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>🔍 Contrôles planifiés S37–S40</div>
              {[
                {date:"2026-09-09",label:"Vérification coupe DOS-2026-041 — Tronçais",statut:"planifié"},
                {date:"2026-09-17",label:"Suivi reboisement compensation A719",statut:"planifié"},
                {date:"2026-09-24",label:"Contrôle inopiné ETF BOIS SERVICE",statut:"à confirmer"},
                {date:"2026-10-02",label:"Bilan annuel chaufferies SBP/SURE",statut:"planifié"},
              ].map((c,i)=>(
                <div key={i} style={{display:"flex",gap:10,paddingBlock:8,
                  borderBottom:i<3?`1px solid ${C.bd}`:"none"}}>
                  <div style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:"#1E3A5F",flexShrink:0}}>
                    {new Date(c.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:C.tx,fontWeight:600}}>{c.label}</div>
                    <div style={{fontSize:9,marginTop:2,color:c.statut==="planifié"?"#065F46":"#92400E",fontWeight:700}}>
                      {c.statut==="planifié"?"✅ Planifié":"⚠️ À confirmer"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:"#FEF9C3",borderRadius:12,padding:12,
              border:"1px solid #FDE68A",fontSize:11,color:"#92400E",lineHeight:1.6}}>
              ⚠️ <strong>Délai réglementaire</strong> — 2 dossiers coupe rase atteignent leur délai d'instruction avant le 30 sept.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── FINANCEUR — ADEME / RÉGION / PARTENAIRE BANCAIRE ──────────
const FINANCEUR_PROJETS_DEMO = [
  {id:"FIN-2026-012",label:"Modernisation chaufferie Moulins Centre",porteur:"CC Moulins Communauté",
   montantTotalK:480,montantEngagéK:192,tauxAide:40,type:"ADEME",statut:"en_cours",
   livrableAttendu:"2026-12-31",thematique:"Efficacité énergétique"},
  {id:"FIN-2026-009",label:"Structuration filière bois bocager Allier",porteur:"FIBOIS Auvergne",
   montantTotalK:125,montantEngagéK:125,tauxAide:100,type:"Région AURA",statut:"soldé",
   livrableAttendu:"2026-06-30",thematique:"Filière / structuration"},
  {id:"FIN-2026-007",label:"Certification SBP — ALTEGAD SAS",porteur:"ALTEGAD SAS",
   montantTotalK:38,montantEngagéK:18,tauxAide:47,type:"ADEME",statut:"en_cours",
   livrableAttendu:"2026-10-15",thematique:"Certification / traçabilité"},
  {id:"FIN-2026-003",label:"Prêt matériel abattage — ETF BOIS SERVICE",porteur:"ETF BOIS SERVICE",
   montantTotalK:220,montantEngagéK:220,tauxAide:0,type:"Banque",statut:"remboursement",
   livrableAttendu:"2028-03-01",thematique:"Investissement matériel"},
];

export const EcranRoleFinanceur = (_props: any) => {
  const [onglet, setOnglet] = useState<"projets"|"dossiers"|"indicateurs">("projets");
  const enCours = FINANCEUR_PROJETS_DEMO.filter(p=>p.statut==="en_cours");
  const totalEngagéK = FINANCEUR_PROJETS_DEMO.reduce((s,p)=>s+p.montantEngagéK,0);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg}}>
      <div style={{background:"#134E4A",color:"#fff",padding:"16px 16px 12px"}}>
        <div style={{fontSize:11,opacity:.75,marginBottom:3}}>💶 Financeur · Partenaire institutionnel</div>
        <div style={{fontSize:17,fontWeight:800}}>ADEME Auvergne-Rhône-Alpes</div>
        <div style={{fontSize:10,opacity:.7,marginTop:4}}>Délégation régionale · Fonds bois-énergie</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.bd,flexShrink:0}}>
        {([["📁",FINANCEUR_PROJETS_DEMO.length,"Projets"],["⚙️",enCours.length,"En cours"],[
          "💶",`${totalEngagéK}k€`,"Engagés"],["📊","43 %","Taux moyen"]] as [string,any,string][]).map(([ic,v,lb],i)=>(
          <div key={i} style={{background:"#fff",padding:"10px 6px",textAlign:"center"}}>
            <div style={{fontSize:14,marginBottom:2}}>{ic}</div>
            <div style={{fontSize:14,fontWeight:800,color:"#134E4A"}}>{v}</div>
            <div style={{fontSize:9,color:C.tx3,fontWeight:600}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"#fff",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
        {([["projets","📁 Projets"],["dossiers","📋 Dossiers"],["indicateurs","📊 Indicateurs"]] as [typeof onglet,string][]).map(([k,lbl])=>(
          <button key={k} onClick={()=>setOnglet(k)} style={{flex:1,padding:"11px 4px",border:"none",
            cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700,background:"transparent",
            borderBottom:onglet===k?"3px solid #134E4A":"3px solid transparent",
            color:onglet===k?"#134E4A":C.tx3}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        {onglet==="projets"&&FINANCEUR_PROJETS_DEMO.map(p=>{
          const pct = Math.round(p.montantEngagéK/p.montantTotalK*100);
          const scol = p.statut==="soldé"?"#6B7280":p.statut==="remboursement"?"#7C3AED":"#134E4A";
          return (
            <div key={p.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
              borderLeft:`4px solid ${scol}`,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:8}}>
                <div style={{fontWeight:700,fontSize:12,color:C.tx,flex:1}}>{p.label}</div>
                <span style={{fontSize:9,padding:"3px 7px",borderRadius:12,fontWeight:700,flexShrink:0,
                  background:p.statut==="soldé"?"#F3F4F6":p.statut==="remboursement"?"#EDE9FE":"#D1FAE5",
                  color:scol}}>
                  {p.statut==="soldé"?"✅ Soldé":p.statut==="remboursement"?"🔄 Remboursement":"⚙️ En cours"}
                </span>
              </div>
              <div style={{fontSize:10,color:C.tx3,marginBottom:8,display:"flex",gap:10,flexWrap:"wrap"}}>
                <span>👤 {p.porteur}</span>
                <span>🏷 {p.type}</span>
                <span>🎯 {p.thematique}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4}}>
                <span style={{color:C.tx2}}>💶 {p.montantEngagéK}k€ / {p.montantTotalK}k€</span>
                {p.tauxAide>0&&<span style={{color:C.tx2}}>Aide : {p.tauxAide}%</span>}
              </div>
              <div style={{background:C.bg,borderRadius:4,height:6,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,background:scol,width:`${pct}%`}}/>
              </div>
              <div style={{fontSize:9,color:C.tx3,marginTop:4}}>
                {pct}% consommé · échéance {new Date(p.livrableAttendu).toLocaleDateString("fr-FR")}
              </div>
            </div>
          );
        })}
        {onglet==="dossiers"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
            <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📋 Pièces justificatives en attente</div>
            {[
              {id:"FIN-2026-007",doc:"Rapport d'audit certification SBP",délai:"2026-09-15",statut:"en_attente"},
              {id:"FIN-2026-012",doc:"Bilan intermédiaire travaux chaufferie",délai:"2026-09-30",statut:"reçu"},
              {id:"FIN-2026-012",doc:"Factures équipements — lot 2",délai:"2026-10-15",statut:"en_attente"},
            ].map((d,i)=>(
              <div key={i} style={{paddingBlock:8,borderBottom:i<2?`1px solid ${C.bd}`:"none",
                display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:C.tx}}>{d.doc}</div>
                  <div style={{fontSize:9,color:C.tx3,marginTop:1}}>{d.id} · ⏱ {new Date(d.délai).toLocaleDateString("fr-FR")}</div>
                </div>
                <span style={{fontSize:9,padding:"3px 8px",borderRadius:12,fontWeight:700,flexShrink:0,
                  background:d.statut==="reçu"?"#D1FAE5":"#FEF9C3",
                  color:d.statut==="reçu"?"#065F46":"#92400E"}}>
                  {d.statut==="reçu"?"✅ Reçu":"⏳ Attendu"}
                </span>
              </div>
            ))}
          </div>
        )}
        {onglet==="indicateurs"&&(
          <>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:12,fontWeight:800,marginBottom:10,color:C.tx}}>📊 Impact portefeuille 2026</div>
              {[
                ["🌿","Émissions GES évitées","2 840 tCO₂eq"],
                ["⚡","Énergie renouvelable soutenue","132 GWh"],
                ["💶","Levier financier","1 : 3.2"],
                ["🌲","Biomasse mobilisée","28 420 t"],
                ["🏗️","Emplois filière soutenus","~48 ETP"],
              ].map(([ic,lb,v],i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                  paddingBlock:5,borderBottom:i<4?`1px solid ${C.bd}`:"none"}}>
                  <span style={{color:C.tx2}}>{ic} {lb}</span>
                  <span style={{fontWeight:700,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#D1FAE5",borderRadius:12,padding:12,
              border:"1px solid #6EE7B7",fontSize:11,color:"#065F46",lineHeight:1.6}}>
              🎯 <strong>Objectif 2027</strong> — Doublement du soutien bois-énergie prévu<br/>
              Appel à projets ADEME biomasse forestière · ouverture T1 2027
            </div>
          </>
        )}
      </div>
    </div>
  );
};
