// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { C, BTN_H, INPUT_H, FONT_INPUT, FONT_TITLE, PADDING } from "../../design-system/tokens.js";
import { VSS_RECONNUS, STATUT_REGL, TEXTES_REGL } from "./sections.constants.js";
import { DEMO_LIVRAISONS } from "../../demo/demoData.js";
import { todayS, nowISO, uid } from "../../shared/utils.js";
import { MInput } from "../../shared/ui.jsx";
import { apiGet, apiPost, apiPatch } from "../../services/api.service.js";
const ROLES_DEF = [
  {id:"super_editeur",  label:"Éditeur souverain — APPLITAG", icon:"🏢", color:"#111827"},
  {id:"admin",          label:"Administrateur",        icon:"⚙️",  color:"#1E5B3A"},
  {id:"manager_region", label:"Responsable régional",  icon:"🗺️",  color:"#1D4ED8"},
  {id:"manager_dept",   label:"Responsable départemental",icon:"🏛️",color:"#0369A1"},
  {id:"mandataire",     label:"Mandataire",            icon:"📋",  color:"#7C3AED"},
  {id:"entreprise",     label:"ETF / Sous-traitant",   icon:"🪓",  color:"#92400E"},
  {id:"operateur",      label:"Opérateur terrain",     icon:"👷",  color:"#065F46"},
  {id:"dechiquetage",   label:"Déchiquetage",          icon:"🌀",  color:"#D97706"},
  {id:"plateforme",     label:"Responsable plateforme", icon:"🏭", color:"#9D174D"},
  {id:"receptionnaire", label:"Réceptionnaire",        icon:"📥",  color:"#6B21A8"},
  {id:"entreprise_transport",label:"Entreprise transport",icon:"🚚",color:"#4338CA"},
  {id:"chauffeur",      label:"Chauffeur",             icon:"🚛",  color:"#6D28D9"},
  {id:"chaufferie",     label:"Responsable chaufferie", icon:"🔥", color:"#B45309"},
  {id:"collectivite",   label:"Collectivité / EPCI",   icon:"🏛️", color:"#065F46"},
  {id:"bet",            label:"Bureau d'études",        icon:"📐", color:"#1E40AF"},
  {id:"etf",            label:"ETF (Travaux forestiers)",icon:"🪓",color:"#78350F"},
  {id:"association",    label:"Association / Interpro", icon:"🤝", color:"#0369A1"},
  {id:"institutionnel", label:"Institutionnel (DDT…)",  icon:"🏛️", color:"#1E3A5F"},
  {id:"financeur",      label:"Financeur / Partenaire", icon:"💶", color:"#134E4A"},
];

const PERMISSIONS_DEF = [
  {id:"contacts",    label:"Contacts / Propriétaires", icon:"👤"},
  {id:"lots",        label:"Fiches lots",              icon:"🌲"},
  {id:"visites",     label:"Visites terrain",          icon:"🔭"},
  {id:"exploitation",label:"Exploitation",             icon:"🪓"},
  {id:"dechiquetage",label:"Déchiquetage",             icon:"🌀"},
  {id:"transport",   label:"Transport / CMR",          icon:"🚛"},
  {id:"livraisons",  label:"Livraisons",               icon:"📦"},
  {id:"chaufferies", label:"Chaufferies",              icon:"🔥"},
  {id:"documents",   label:"Documents PDF",            icon:"📄"},
  {id:"utilisateurs",label:"Gestion utilisateurs",     icon:"👥"},
  {id:"rapports",    label:"Rapports / Analyses",      icon:"📈"},
  {id:"facturation", label:"Facturation / Coûts",      icon:"💶"},
];

const ZONES_GEO = ["National","Région","Département","Ville"];

const PERMS_PAR_ROLE = {
  admin:          ["contacts","lots","visites","exploitation","dechiquetage","transport","livraisons","chaufferies","documents","utilisateurs","rapports","facturation"],
  manager_region: ["contacts","lots","visites","exploitation","dechiquetage","transport","livraisons","chaufferies","documents","utilisateurs","rapports"],
  manager_dept:   ["contacts","lots","visites","exploitation","dechiquetage","transport","livraisons","chaufferies","documents","utilisateurs"],
  mandataire:     ["contacts","lots","visites","documents"],
  entreprise:     ["lots","exploitation","documents"],
  operateur:      ["lots","exploitation"],
  dechiquetage:   ["lots","dechiquetage"],
  plateforme:     ["livraisons","chaufferies","documents"],
  receptionnaire: ["livraisons"],
  entreprise_transport:["transport","livraisons","documents","utilisateurs"],
  chauffeur:      ["transport","livraisons"],
  chaufferie:     ["livraisons","chaufferies","rapports"],
  collectivite:   ["livraisons","chaufferies","rapports","facturation"],
  bet:            ["contacts","lots","visites","documents","rapports"],
  etf:            ["lots","exploitation","dechiquetage","documents"],
  association:    ["contacts","rapports","documents"],
  institutionnel: ["contacts","lots","documents","rapports"],
  financeur:      ["rapports","facturation","documents","chaufferies"],
};

const DEMO_HIERARCHY = [
  // ── Niveau 0 : APPLITAG — distributeur souverain des droits ──
  {id:"u-applitag", parentId:null, nom:"APPLITAG", prenom:"", role:"super_editeur",
   email:"admin@applitag.fr", telephone:"", region:"National",
   departement:"", ville:"Paris", codePostal:"75000", pin:"", actif:true, codeGenere:null,
   nomEntreprise:"APPLITAG by ALTEGAD SAS",
   badge:"Éditeur souverain — distribue les licences et droits à ses clients",
   perms:PERMS_PAR_ROLE.admin},

  // ── Niveau 1 : Jean-Christophe Letierce — Titulaire de la licence ALTEGAD ──
  {id:"u-admin", parentId:"u-applitag", nom:"Letierce", prenom:"Jean-Christophe", role:"admin",
   email:"jcletierce01@gmail.com", telephone:"0600000001", region:"National",
   departement:"", ville:"", codePostal:"", pin:"1406", actif:true, codeGenere:"ALTEGAD-2026",
   nomEntreprise:"ALTEGAD SAS — Happy Tag",
   badge:"Titulaire de la licence — distribue les droits à ses clients et collaborateurs",
   perms:PERMS_PAR_ROLE.admin},

  // Responsables régionaux
  {id:"u-rr-bfc", parentId:"u-admin", nom:"Durand", prenom:"Jean-Marc", role:"manager_region",
   email:"jm.durand@applitag.fr", telephone:"0611111101", region:"Bourgogne-Franche-Comté",
   departement:"", ville:"", codePostal:"21000", pin:"", actif:true, codeGenere:"BFC-2026",
   perms:PERMS_PAR_ROLE.manager_region},
  {id:"u-rr-cvl", parentId:"u-admin", nom:"Martin", prenom:"Sophie", role:"manager_region",
   email:"s.martin@applitag.fr", telephone:"0611111102", region:"Centre-Val de Loire",
   departement:"", ville:"", codePostal:"45000", pin:"", actif:true, codeGenere:"CVL-2026",
   perms:PERMS_PAR_ROLE.manager_region},
  {id:"u-rr-ara", parentId:"u-admin", nom:"Blanc", prenom:"Thierry", role:"manager_region",
   email:"t.blanc@applitag.fr", telephone:"0611111103", region:"Auvergne-Rhône-Alpes",
   departement:"", ville:"", codePostal:"69000", pin:"", actif:true, codeGenere:"ARA-2026",
   perms:PERMS_PAR_ROLE.manager_region},

  // Responsables départementaux (sous BFC)
  {id:"u-rd-89", parentId:"u-rr-bfc", nom:"Perrin", prenom:"Pierre", role:"manager_dept",
   email:"p.perrin@applitag.fr", telephone:"0622222201", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"", actif:true, codeGenere:"Y89-2026",
   perms:PERMS_PAR_ROLE.manager_dept},
  {id:"u-rd-21", parentId:"u-rr-bfc", nom:"Leblanc", prenom:"Marie", role:"manager_dept",
   email:"m.leblanc@applitag.fr", telephone:"0622222202", region:"Bourgogne-Franche-Comté",
   departement:"Côte-d'Or (21)", ville:"Dijon", codePostal:"21000", pin:"", actif:true, codeGenere:"CD21-2026",
   perms:PERMS_PAR_ROLE.manager_dept},

  // Mandataires (sous rd-89)
  {id:"u-mand-1", parentId:"u-rd-89", nom:"Laurent", prenom:"Claire", role:"mandataire",
   email:"c.laurent@applitag.fr", telephone:"0633333301", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Joigny", codePostal:"89300", pin:"6666", actif:true, codeGenere:"MAND-001",
   perms:PERMS_PAR_ROLE.mandataire},
  {id:"u-mand-2", parentId:"u-rd-89", nom:"Faure", prenom:"Antoine", role:"mandataire",
   email:"a.faure@applitag.fr", telephone:"0633333302", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Sens", codePostal:"89100", pin:"", actif:true, codeGenere:"MAND-002",
   perms:PERMS_PAR_ROLE.mandataire},

  // ETF sous-traitantes (sous rd-89)
  {id:"u-etf-1", parentId:"u-rd-89", nom:"Gaillard", prenom:"Henri", role:"entreprise",
   email:"etf@gaillard.fr", telephone:"0644444401", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"9999",
   nomEntreprise:"ETF Gaillard SARL", actif:true, codeGenere:"ETF-001",
   perms:PERMS_PAR_ROLE.entreprise},
  {id:"u-etf-2", parentId:"u-rd-89", nom:"Mercier", prenom:"Bruno", role:"entreprise",
   email:"bm.foret@gmail.com", telephone:"0644444402", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Sens", codePostal:"89100",
   nomEntreprise:"Mercier Forêt EURL", actif:true, codeGenere:"ETF-002",
   perms:PERMS_PAR_ROLE.entreprise},

  // Opérateurs terrain (sous ETF Gaillard)
  {id:"u-op-1", parentId:"u-etf-1", nom:"Dupont", prenom:"Martin", role:"operateur",
   email:"", telephone:"0655555501", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"1111", actif:true, codeGenere:"OP-001",
   perms:PERMS_PAR_ROLE.operateur},
  {id:"u-op-2", parentId:"u-etf-1", nom:"Renard", prenom:"Luc", role:"operateur",
   email:"", telephone:"0655555502", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"", actif:true, codeGenere:"OP-002",
   perms:PERMS_PAR_ROLE.operateur},

  // Déchiquetage (sous rd-89)
  {id:"u-dechi-1", parentId:"u-rd-89", nom:"Forestier", prenom:"François", role:"dechiquetage",
   email:"foret89@gmail.com", telephone:"0666666601", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Joigny", codePostal:"89300", pin:"4444",
   nomEntreprise:"ForestChip 89", actif:true, codeGenere:"DECHI-001",
   perms:PERMS_PAR_ROLE.dechiquetage},

  // Plateformes (sous rd-89)
  {id:"u-plat-1", parentId:"u-rd-89", nom:"Dubois", prenom:"Nathalie", role:"plateforme",
   email:"n.dubois@plateforme-auxerre.fr", telephone:"0677777701",
   region:"Bourgogne-Franche-Comté", departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000",
   nomEntreprise:"Plateforme Auxerre Bois Énergie", actif:true, codeGenere:"PLAT-001",
   perms:PERMS_PAR_ROLE.plateforme},
  {id:"u-recep-1", parentId:"u-plat-1", nom:"Plateau", prenom:"Nathalie", role:"receptionnaire",
   email:"", telephone:"0677777702", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"7777", actif:true, codeGenere:"REC-001",
   perms:PERMS_PAR_ROLE.receptionnaire},

  // Transport (sous rd-89)
  {id:"u-transp-1", parentId:"u-rd-89", nom:"Auxerre Logistique", prenom:"", role:"entreprise_transport",
   email:"contact@auxerre-logistique.fr", telephone:"0688888801",
   region:"Bourgogne-Franche-Comté", departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000",
   nomEntreprise:"Auxerre Logistique SAS", actif:true, codeGenere:"TRANSP-001",
   perms:PERMS_PAR_ROLE.entreprise_transport},
  {id:"u-chauf-1", parentId:"u-transp-1", nom:"Robert", prenom:"Pierre", role:"chauffeur",
   email:"", telephone:"0699999901", region:"Bourgogne-Franche-Comté",
   departement:"Yonne (89)", ville:"Auxerre", codePostal:"89000", pin:"3333", actif:true, codeGenere:"CHAUF-001",
   perms:PERMS_PAR_ROLE.chauffeur},

  // Chaufferies (sous rd-89)
  {id:"u-chauf-aub", parentId:"u-rd-89", nom:"Migennes Énergie", prenom:"", role:"chaufferie",
   email:"contact@migennes-energie.fr", telephone:"0386561234",
   region:"Bourgogne-Franche-Comté", departement:"Yonne (89)", ville:"Migennes", codePostal:"89400",
   nomEntreprise:"Chaufferie Migennes Énergie", actif:true, codeGenere:"CHAUF-ENE-001",
   perms:PERMS_PAR_ROLE.chaufferie},
  {id:"u-resp-chauf-1", parentId:"u-chauf-aub", nom:"Énergie", prenom:"Sophie", role:"chaufferie",
   email:"s.energie@migennes.fr", telephone:"0386561235",
   region:"Bourgogne-Franche-Comté", departement:"Yonne (89)", ville:"Migennes", codePostal:"89400",
   pin:"5555", actif:true, codeGenere:"RESP-CHAUF-001",
   perms:PERMS_PAR_ROLE.chaufferie},

  // ── Acteurs filière ARA — nouveaux rôles ──
  {id:"u-coll-1", parentId:"u-rr-ara", nom:"Moulins Communauté", prenom:"", role:"collectivite",
   email:"energie@moulins-communaute.fr", telephone:"0470441234",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Moulins", codePostal:"03000",
   nomEntreprise:"CC Moulins Communauté (Allier Nord)", actif:true, codeGenere:"COLL-001",
   perms:PERMS_PAR_ROLE.collectivite},

  {id:"u-bet-1", parentId:"u-rr-ara", nom:"FORÊT CONSEIL", prenom:"Auvergne", role:"bet",
   email:"contact@foret-conseil-auvergne.fr", telephone:"0470556789",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Moulins", codePostal:"03000",
   nomEntreprise:"FORÊT CONSEIL Auvergne", actif:true, codeGenere:"BET-001",
   perms:PERMS_PAR_ROLE.bet},

  {id:"u-etf-ara-1", parentId:"u-rr-ara", nom:"BOIS SERVICE", prenom:"ETF", role:"etf",
   email:"contact@etf-bois-service.fr", telephone:"0470334455",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Vichy", codePostal:"03200",
   nomEntreprise:"ETF BOIS SERVICE Allier", actif:true, codeGenere:"ETF-ARA-001",
   perms:PERMS_PAR_ROLE.etf},

  {id:"u-asso-1", parentId:"u-rr-ara", nom:"FIBOIS Auvergne", prenom:"Délégation Allier", role:"association",
   email:"allier@fibois-aura.fr", telephone:"0470221133",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Moulins", codePostal:"03000",
   nomEntreprise:"FIBOIS Auvergne-Rhône-Alpes", actif:true, codeGenere:"ASSO-001",
   perms:PERMS_PAR_ROLE.association},

  {id:"u-instit-1", parentId:"u-rr-ara", nom:"DDT Allier", prenom:"Service Forêt", role:"institutionnel",
   email:"ddt-foret@allier.gouv.fr", telephone:"0470481234",
   region:"Auvergne-Rhône-Alpes", departement:"Allier (03)", ville:"Moulins", codePostal:"03000",
   nomEntreprise:"DDT de l'Allier — Direction Départementale des Territoires", actif:true, codeGenere:"INSTIT-001",
   perms:PERMS_PAR_ROLE.institutionnel},

  {id:"u-fin-1", parentId:"u-rr-ara", nom:"ADEME AURA", prenom:"Fonds Bois-Énergie", role:"financeur",
   email:"biomasse@ademe.fr", telephone:"0472831234",
   region:"Auvergne-Rhône-Alpes", departement:"", ville:"Lyon", codePostal:"69000",
   nomEntreprise:"ADEME Auvergne-Rhône-Alpes", actif:true, codeGenere:"FIN-001",
   perms:PERMS_PAR_ROLE.financeur},
];

export const SectionAcces = ({_isDemo=false}) => {
  const [utilisateurs, setUtilisateurs] = useState(DEMO_HIERARCHY);
  const [vue, setVue] = useState("organigramme"); // organigramme | tableau | ajouter
  const [selectedUser, setSelectedUser] = useState(null);
  const [editPerms, setEditPerms] = useState(null);
  const [newUser, setNewUser] = useState({
    nom:"",prenom:"",role:"operateur",email:"",telephone:"",
    parentId:"u-admin",region:"",departement:"",ville:"",codePostal:"",
    zoneGeo:"Département",perms:[],nomEntreprise:"",
  });
  const [smsSimule, setSmsSimule] = useState(null);

  const rolesDef = Object.fromEntries(ROLES_DEF.map(r=>[r.id,r]));

  const getChildren = (parentId) => utilisateurs.filter(u=>u.parentId===parentId);

  const handleAjouter = () => {
    if (!newUser.nom||!newUser.telephone) return;
    const code = `${newUser.role.toUpperCase().slice(0,4)}-${Date.now().toString().slice(-4)}`;
    const u = {...newUser, id:`u-new-${Date.now()}`, actif:true, codeGenere:code,
      perms:newUser.perms.length>0?newUser.perms:PERMS_PAR_ROLE[newUser.role]||[]};
    setUtilisateurs(prev=>[...prev,u]);
    setSmsSimule({nom:u.prenom+" "+u.nom, telephone:u.telephone, code, role:rolesDef[u.role]?.label});
    setVue("organigramme");
    setNewUser({nom:"",prenom:"",role:"operateur",email:"",telephone:"",parentId:"u-admin",
      region:"",departement:"",ville:"",codePostal:"",zoneGeo:"Département",perms:[],nomEntreprise:""});
  };

  const renderOrgNode = (userId, depth=0) => {
    const u = utilisateurs.find(x=>x.id===userId);
    if (!u) return null;
    const children = getChildren(u.id);
    const rd = rolesDef[u.role]||{icon:"👤",color:C.tx3,label:u.role};
    const isSelected = selectedUser?.id===u.id;
    return (
      <div key={u.id} style={{marginLeft:depth===0?0:20}}>
        <div onClick={()=>setSelectedUser(isSelected?null:u)}
          style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",
            borderRadius:8,cursor:"pointer",marginBottom:4,
            border:`1.5px solid ${isSelected?rd.color:C.bd}`,
            background:isSelected?`${rd.color}18`:"#fff",
            boxShadow:isSelected?`0 0 0 2px ${rd.color}44`:"none",
            transition:"all .12s"}}>
          {depth>0&&<div style={{width:16,height:1,background:C.bd,flexShrink:0}}/>}
          <span style={{fontSize:16,flexShrink:0}}>{rd.icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {u.prenom?`${u.prenom} ${u.nom}`:u.nom||u.nomEntreprise}
            </div>
            <div style={{fontSize:10,color:rd.color,fontWeight:600}}>{rd.label}</div>
            {(u.departement||u.region)&&(
              <div style={{fontSize:9,color:C.tx3}}>{u.departement||u.region}</div>
            )}
          </div>
          {u.codeGenere&&(
            <span style={{fontSize:9,fontFamily:"monospace",background:C.bg2,
              color:C.tx3,borderRadius:4,padding:"2px 5px",flexShrink:0}}>{u.codeGenere}</span>
          )}
          {!u.actif&&<span style={{fontSize:9,color:C.red,flexShrink:0}}>⛔</span>}
        </div>
        {children.length>0&&(
          <div style={{borderLeft:`2px solid ${C.bd}`,paddingLeft:4,marginLeft:14,marginBottom:4}}>
            {children.map(c=>renderOrgNode(c.id,depth+1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:16,height:"calc(100dvh - 120px)"}}>
      {/* Panneau gauche */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
        overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* Onglets de vue */}
        <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.bd}`,padding:"0 16px"}}>
          {[["organigramme","🏗️ Organigramme"],["tableau","📋 Tableau"],["ajouter","➕ Ajouter"]].map(([v,l])=>(
            <button key={v} onClick={()=>setVue(v)} style={{
              background:"none",border:"none",borderBottom:`2.5px solid ${vue===v?C.green:"transparent"}`,
              padding:"12px 14px",cursor:"pointer",fontSize:13,fontWeight:vue===v?700:400,
              color:vue===v?C.greenD:C.tx3,fontFamily:"inherit",
              transition:"all .12s"}}>
              {l}
            </button>
          ))}
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4}}>
            <span style={{fontSize:11,color:C.tx3}}>{utilisateurs.length} utilisateurs</span>
          </div>
        </div>

        {/* ── VUE ORGANIGRAMME ── */}
        {vue==="organigramme"&&(
          <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:16}}>
            {renderOrgNode("u-applitag")}
          </div>
        )}

        {/* ── VUE TABLEAU ── */}
        {vue==="tableau"&&(
          <div data-scrollable="1" style={{flex:1,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:C.greenD,color:"#fff",fontSize:11}}>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Utilisateur</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Rôle</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Zone</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Contact</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Code</th>
                  <th style={{padding:"9px 12px",textAlign:"left",fontWeight:600}}>Accès</th>
                </tr>
              </thead>
              <tbody>
                {utilisateurs.map((u,i)=>{
                  const rd = rolesDef[u.role]||{icon:"👤",color:C.tx3,label:u.role};
                  return (
                    <tr key={u.id} onClick={()=>setSelectedUser(selectedUser?.id===u.id?null:u)}
                      style={{background:selectedUser?.id===u.id?`${rd.color}12`:i%2===0?"#fff":"#FAFAFA",
                        cursor:"pointer",borderBottom:`1px solid ${C.bd}`}}>
                      <td style={{padding:"8px 12px"}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.tx}}>
                          {u.prenom?`${u.prenom} ${u.nom}`:u.nom||u.nomEntreprise}
                        </div>
                        {u.nomEntreprise&&u.prenom&&<div style={{fontSize:10,color:C.tx3}}>{u.nomEntreprise}</div>}
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <span style={{fontSize:10,color:rd.color,fontWeight:700,
                          background:`${rd.color}18`,borderRadius:4,padding:"2px 7px"}}>
                          {rd.icon} {rd.label}
                        </span>
                      </td>
                      <td style={{padding:"8px 12px",fontSize:11,color:C.tx3}}>
                        {u.departement||u.region||"National"}
                      </td>
                      <td style={{padding:"8px 12px",fontSize:11,color:C.tx3}}>
                        {u.telephone||"—"}
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <span style={{fontFamily:"monospace",fontSize:10,color:C.greenD,
                          background:C.greenL,borderRadius:4,padding:"2px 6px"}}>
                          {u.codeGenere||"—"}
                        </span>
                      </td>
                      <td style={{padding:"8px 12px",fontSize:10,color:C.tx3}}>
                        {(u.perms||[]).length} droits
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── VUE AJOUTER ── */}
        {vue==="ajouter"&&(
          <div data-scrollable="1" style={{flex:1,overflowY:"auto",padding:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <MInput label="Prénom" value={newUser.prenom} onChange={v=>setNewUser(p=>({...p,prenom:v}))} required/>
              <MInput label="Nom / Raison sociale" value={newUser.nom} onChange={v=>setNewUser(p=>({...p,nom:v}))} required/>
              <MInput label="Téléphone" value={newUser.telephone} onChange={v=>setNewUser(p=>({...p,telephone:v}))} type="tel" required/>
              <MInput label="Email" value={newUser.email} onChange={v=>setNewUser(p=>({...p,email:v}))} type="email"/>
              <MInput label="Code postal" value={newUser.codePostal} onChange={v=>setNewUser(p=>({...p,codePostal:v}))}/>
              <MInput label="Ville" value={newUser.ville} onChange={v=>setNewUser(p=>({...p,ville:v}))}/>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Rôle</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                {ROLES_DEF.filter(r=>r.id!=="admin").map(r=>(
                  <div key={r.id} onClick={()=>setNewUser(p=>({...p,role:r.id,perms:PERMS_PAR_ROLE[r.id]||[]}))}
                    style={{padding:"7px 10px",borderRadius:8,cursor:"pointer",
                      border:`1.5px solid ${newUser.role===r.id?r.color:C.bd}`,
                      background:newUser.role===r.id?`${r.color}18`:"#fff",fontSize:11,
                      display:"flex",alignItems:"center",gap:6}}>
                    <span>{r.icon}</span>
                    <span style={{fontWeight:newUser.role===r.id?700:400,color:newUser.role===r.id?r.color:C.tx}}>
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Rattachement</div>
              <select value={newUser.parentId} onChange={e=>setNewUser(p=>({...p,parentId:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.bd}`,
                  fontSize:12,fontFamily:"inherit",background:"#fff",color:C.tx}}>
                {utilisateurs.map(u=>(
                  <option key={u.id} value={u.id}>
                    {(u.prenom?u.prenom+" ":"")+u.nom||u.nomEntreprise} — {(rolesDef[u.role]||{}).label||u.role}
                  </option>
                ))}
              </select>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Zone géographique</div>
              <div style={{display:"flex",gap:6}}>
                {ZONES_GEO.map(z=>(
                  <div key={z} onClick={()=>setNewUser(p=>({...p,zoneGeo:z}))}
                    style={{flex:1,padding:"7px 4px",textAlign:"center",borderRadius:8,cursor:"pointer",
                      border:`1.5px solid ${newUser.zoneGeo===z?C.green:C.bd}`,fontSize:11,
                      background:newUser.zoneGeo===z?C.greenL:"#fff",
                      color:newUser.zoneGeo===z?C.greenD:C.tx,fontWeight:newUser.zoneGeo===z?700:400}}>
                    {z}
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:C.tx2,marginBottom:6}}>Droits d'accès</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {PERMISSIONS_DEF.map(p=>{
                  const checked = (newUser.perms||[]).includes(p.id);
                  return (
                    <div key={p.id} onClick={()=>setNewUser(prev=>({...prev,
                      perms:checked?prev.perms.filter(x=>x!==p.id):[...prev.perms,p.id]}))}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
                        borderRadius:8,cursor:"pointer",border:`1px solid ${checked?C.green:C.bd}`,
                        background:checked?C.greenL:"#fff"}}>
                      <div style={{width:14,height:14,borderRadius:3,
                        border:`2px solid ${checked?C.green:C.tx3}`,
                        background:checked?C.green:"#fff",display:"flex",alignItems:"center",
                        justifyContent:"center",flexShrink:0}}>
                        {checked&&<span style={{color:"#fff",fontSize:9,fontWeight:700}}>✓</span>}
                      </div>
                      <span style={{fontSize:11}}>{p.icon}</span>
                      <span style={{fontSize:11,color:checked?C.greenD:C.tx}}>{p.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={handleAjouter}
              style={{width:"100%",padding:"12px",borderRadius:10,
                background:newUser.nom&&newUser.telephone?C.green:"#ccc",
                color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit"}}>
              ✅ Créer l'accès &amp; envoyer le code SMS
            </button>
          </div>
        )}
      </div>

      {/* Panneau droit — détail utilisateur */}
      <div style={{display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>

        {/* Notification SMS simulée */}
        {smsSimule&&(
          <div style={{background:C.greenL,border:`1.5px solid ${C.green}`,borderRadius:12,padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:6}}>📱 SMS envoyé</div>
            <div style={{fontSize:11,color:C.greenD,lineHeight:1.7}}>
              À : {smsSimule.telephone} ({smsSimule.nom})<br/>
              "Bonjour, votre accès APPLITAG ({smsSimule.role}) a été créé.<br/>
              Code d'accès : <strong>{smsSimule.code}</strong><br/>
              Téléchargez l'app : play.google.com/applitag"
            </div>
            <button onClick={()=>setSmsSimule(null)}
              style={{marginTop:8,background:"none",border:"none",color:C.greenD,
                fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Fermer</button>
          </div>
        )}

        {/* Fiche utilisateur sélectionné */}
        {selectedUser ? (()=>{
          const rd = rolesDef[selectedUser.role]||{icon:"👤",color:C.tx3,label:selectedUser.role};
          const parent = utilisateurs.find(u=>u.id===selectedUser.parentId);
          const children = getChildren(selectedUser.id);
          const permsUser = selectedUser.perms||[];
          return (
            <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${rd.color}`,overflow:"hidden"}}>
              {/* En-tête */}
              <div style={{background:rd.color,color:"#fff",padding:"14px 18px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:28}}>{rd.icon}</span>
                  <div>
                    <div style={{fontSize:16,fontWeight:700}}>
                      {selectedUser.prenom?`${selectedUser.prenom} ${selectedUser.nom}`:selectedUser.nom||selectedUser.nomEntreprise}
                    </div>
                    <div style={{fontSize:11,opacity:.85}}>{rd.label}</div>
                    {selectedUser.nomEntreprise&&selectedUser.prenom&&(
                      <div style={{fontSize:10,opacity:.75}}>{selectedUser.nomEntreprise}</div>
                    )}
                  </div>
                  {selectedUser.codeGenere&&(
                    <div style={{marginLeft:"auto",textAlign:"right"}}>
                      <div style={{fontSize:9,opacity:.75}}>Code d'accès</div>
                      <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,letterSpacing:2}}>
                        {selectedUser.codeGenere}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Infos */}
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                  {selectedUser.telephone&&<div>📞 {selectedUser.telephone}</div>}
                  {selectedUser.email&&<div>📧 {selectedUser.email}</div>}
                  {selectedUser.departement&&<div>🏛️ {selectedUser.departement}</div>}
                  {selectedUser.region&&<div>🗺️ {selectedUser.region}</div>}
                  {selectedUser.ville&&<div>📍 {selectedUser.ville} {selectedUser.codePostal}</div>}
                  {selectedUser.pin&&<div>🔑 PIN: <strong>{selectedUser.pin}</strong></div>}
                </div>
                {parent&&(
                  <div style={{marginTop:8,fontSize:11,color:C.tx3}}>
                    Rattaché à : <strong style={{color:C.tx}}>{parent.prenom?`${parent.prenom} ${parent.nom}`:parent.nom}</strong>
                    {" · "}{(rolesDef[parent.role]||{}).label||parent.role}
                  </div>
                )}
              </div>
              {/* Droits d'accès */}
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2}}>
                    Droits d'accès ({permsUser.length}/{PERMISSIONS_DEF.length})
                  </div>
                  {editPerms?.id===selectedUser.id ? (
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>{
                        setUtilisateurs(prev=>prev.map(u=>u.id===selectedUser.id?{...u,perms:editPerms.perms}:u));
                        setSelectedUser(prev=>({...prev,perms:editPerms.perms}));
                        setEditPerms(null);
                      }} style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:"none",
                        background:C.green,color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>
                        ✓ Enregistrer
                      </button>
                      <button onClick={()=>setEditPerms(null)}
                        style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:`1px solid ${C.bd}`,
                          background:"#fff",color:C.tx3,cursor:"pointer",fontFamily:"inherit"}}>
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button onClick={()=>setEditPerms({id:selectedUser.id,perms:[...permsUser]})}
                      style={{fontSize:11,padding:"3px 10px",borderRadius:6,border:`1px solid ${rd.color}`,
                        background:`${rd.color}18`,color:rd.color,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>
                      ✏️ Modifier
                    </button>
                  )}
                </div>

                {editPerms?.id===selectedUser.id ? (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                    {PERMISSIONS_DEF.map(p=>{
                      const checked = editPerms.perms.includes(p.id);
                      return (
                        <div key={p.id} onClick={()=>setEditPerms(prev=>({...prev,
                          perms:checked?prev.perms.filter(x=>x!==p.id):[...prev.perms,p.id]}))}
                          style={{display:"flex",alignItems:"center",gap:7,padding:"6px 8px",
                            borderRadius:7,cursor:"pointer",
                            border:`1.5px solid ${checked?rd.color:C.bd}`,
                            background:checked?`${rd.color}12`:"#fff"}}>
                          <div style={{width:14,height:14,borderRadius:3,flexShrink:0,
                            border:`2px solid ${checked?rd.color:C.tx3}`,
                            background:checked?rd.color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {checked&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}
                          </div>
                          <span style={{fontSize:11}}>{p.icon}</span>
                          <span style={{fontSize:11,color:checked?rd.color:C.tx,fontWeight:checked?600:400}}>
                            {p.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {PERMISSIONS_DEF.map(p=>{
                      const has = permsUser.includes(p.id);
                      return (
                        <span key={p.id} style={{fontSize:10,padding:"3px 8px",borderRadius:5,
                          background:has?rd.color+"22":C.bg2,color:has?rd.color:C.tx3,
                          fontWeight:has?600:400,border:`1px solid ${has?rd.color:C.bd}`}}>
                          {p.icon} {p.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Sous-utilisateurs */}
              {children.length>0&&(
                <div style={{padding:"12px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>
                    Utilisateurs désignés ({children.length})
                  </div>
                  {children.map(c=>{
                    const cr = rolesDef[c.role]||{icon:"👤",color:C.tx3};
                    return (
                      <div key={c.id} onClick={()=>setSelectedUser(c)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",
                          borderRadius:8,cursor:"pointer",marginBottom:4,
                          border:`1px solid ${C.bd}`,background:C.bg}}>
                        <span style={{fontSize:14}}>{cr.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:C.tx}}>
                            {c.prenom?`${c.prenom} ${c.nom}`:c.nom||c.nomEntreprise}
                          </div>
                          <div style={{fontSize:10,color:cr.color}}>{cr.label}</div>
                        </div>
                        <span style={{fontSize:9,fontFamily:"monospace",color:C.tx3}}>{c.codeGenere||""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })() : (
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:32,textAlign:"center",color:C.tx3}}>
            <div style={{fontSize:32,marginBottom:10}}>👥</div>
            <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>Sélectionner un utilisateur</div>
            <div style={{fontSize:11}}>Cliquez sur un nœud de l'organigramme ou une ligne du tableau pour voir ses droits et ses sous-utilisateurs</div>
          </div>
        )}

        {/* Légende des rôles */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:14}}>
          <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Rôles disponibles</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {ROLES_DEF.map(r=>(
              <span key={r.id} style={{fontSize:10,padding:"3px 8px",borderRadius:5,
                background:`${r.color}18`,color:r.color,fontWeight:600,border:`1px solid ${r.color}44`}}>
                {r.icon} {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── SUIVI DES ABONNEMENTS ───────────────────────────────────────
const DEMO_ABONNEMENTS = [
  {id:"ab1",org:"SYLVA ENERGIE SARL",contact:"Marc Dujardin",email:"m.dujardin@sylva.fr",
   plan:"Pro",debut:"2025-09-01",fin:"2026-08-31",prix:490,statut:"actif",
   modules:["lots","transports","livraisons","documents"],users:4},
  {id:"ab2",org:"BOIS ÉNERGIE CENTRE",contact:"Sophie Marchand",email:"s.marchand@bec.fr",
   plan:"Essential",debut:"2026-01-15",fin:"2027-01-14",prix:290,statut:"actif",
   modules:["lots","documents"],users:2},
  {id:"ab3",org:"CHAUFFERIE MUNICIPALE ST-AMAND",contact:"Régie Technique",email:"regie@stamand.fr",
   plan:"Starter",debut:"2025-06-01",fin:"2026-05-31",prix:0,statut:"expire",
   modules:["lots"],users:1},
  {id:"ab4",org:"ETF DUPONT FRÈRES",contact:"Jean Dupont",email:"j.dupont@etf-dupont.fr",
   plan:"Pro",debut:"2026-04-01",fin:"2027-03-31",prix:490,statut:"actif",
   modules:["lots","transports","livraisons","documents","analyses"],users:6},
  {id:"ab5",org:"COMMUNE DE CHÂTILLON-SUR-INDRE",contact:"Service forêts",email:"forets@chatillon36.fr",
   plan:"Starter",debut:"2026-07-01",fin:"2026-09-30",prix:0,statut:"essai",
   modules:["lots"],users:1},
];

const PLANS_INFO = {
  Starter:   {color:"#6B7280",bg:"#F3F4F6"},
  Essential: {color:"#0369A1",bg:"#E0F2FE"},
  Pro:       {color:"#7C3AED",bg:"#EDE9FE"},
};

export const SectionAbonnements = () => {
  const [filtre,   setFiltre]   = useState("tous");
  const [selected, setSelected] = useState(null);
  const abos = DEMO_ABONNEMENTS.filter(a=>filtre==="tous"||a.statut===filtre);
  const now = new Date();
  const totMRR = DEMO_ABONNEMENTS.filter(a=>a.statut==="actif").reduce((s,a)=>s+Math.round(a.prix/12),0);
  const totActifs = DEMO_ABONNEMENTS.filter(a=>a.statut==="actif").length;
  const expiresBientot = DEMO_ABONNEMENTS.filter(a=>{
    const daysLeft = Math.ceil((new Date(a.fin)-now)/(1000*60*60*24));
    return a.statut==="actif" && daysLeft<=60;
  });

  return (
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>💳 Suivi des abonnements</div>
        <div style={{fontSize:13,color:C.tx2}}>Gestion des licences et des renouvellements</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {icon:"💼",label:"Abonnés actifs",val:totActifs,color:"#1E5B3A"},
          {icon:"💰",label:"MRR estimé",val:`${totMRR} €`,color:"#0369A1"},
          {icon:"⚠️",label:"Expire < 60 j",val:expiresBientot.length,color:"#B45309"},
          {icon:"🆓",label:"Essais en cours",val:DEMO_ABONNEMENTS.filter(a=>a.statut==="essai").length,color:"#7C3AED"},
        ].map(k=>(
          <div key={k.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
            padding:"14px 16px",textAlign:"center"}}>
            <div style={{fontSize:22}}>{k.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:k.color,lineHeight:1.2}}>{k.val}</div>
            <div style={{fontSize:10,color:C.tx2,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alerte expirations */}
      {expiresBientot.length>0&&(
        <div style={{background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:10,
          padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:20}}>⏰</span>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#92400E",marginBottom:4}}>Renouvellements proches</div>
            <div style={{fontSize:11,color:"#78350F",lineHeight:1.5}}>
              {expiresBientot.map(a=>{
                const daysLeft = Math.ceil((new Date(a.fin)-now)/(1000*60*60*24));
                return `${a.org} (J-${daysLeft})`;
              }).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[["tous","Tous"],["actif","Actifs"],["essai","Essais"],["expire","Expirés"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltre(v)}
            style={{padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${filtre===v?"#1E5B3A":C.bd}`,
              background:filtre===v?"#1E5B3A":"transparent",
              color:filtre===v?"#fff":C.tx2,fontFamily:"inherit"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{background:"#F9FAFB",borderBottom:`1px solid ${C.bd}`}}>
                {["Organisation","Plan","Début","Fin","J restants","Prix/an","Statut","Actions"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:C.tx2,
                    whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {abos.map((a,i)=>{
                const daysLeft = Math.ceil((new Date(a.fin)-now)/(1000*60*60*24));
                const pi = PLANS_INFO[a.plan]||PLANS_INFO.Starter;
                const statutColor = {actif:"#065F46",essai:"#7C3AED",expire:"#991B1B"}[a.statut]||"#6B7280";
                const statutBg   = {actif:"#D1FAE5",essai:"#EDE9FE",expire:"#FEE2E2"}[a.statut]||"#F3F4F6";
                return (
                  <tr key={a.id} onClick={()=>setSelected(selected?.id===a.id?null:a)}
                    style={{borderBottom:`1px solid ${C.bd}`,cursor:"pointer",
                      background:selected?.id===a.id?"#F0FDF4":i%2===0?"#fff":"#FAFAFA"}}>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{fontWeight:700,color:C.tx}}>{a.org}</div>
                      <div style={{fontSize:10,color:C.tx2}}>{a.contact}</div>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:5,fontWeight:600,
                        background:pi.bg,color:pi.color}}>{a.plan}</span>
                    </td>
                    <td style={{padding:"10px 12px",color:C.tx2,whiteSpace:"nowrap"}}>
                      {new Date(a.debut).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={{padding:"10px 12px",color:C.tx2,whiteSpace:"nowrap"}}>
                      {new Date(a.fin).toLocaleDateString("fr-FR")}
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"center",
                      fontWeight:700,color:daysLeft<0?"#991B1B":daysLeft<60?"#B45309":"#065F46"}}>
                      {daysLeft<0?"Expiré":`J-${daysLeft}`}
                    </td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:C.tx}}>
                      {a.prix===0?"Gratuit":`${a.prix} €`}
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
                        background:statutBg,color:statutColor}}>
                        {{actif:"✅ Actif",essai:"🆓 Essai",expire:"❌ Expiré"}[a.statut]}
                      </span>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:600,
                          cursor:"pointer",border:`1px solid #1E5B3A`,background:"transparent",
                          color:"#1E5B3A",fontFamily:"inherit"}}
                          onClick={e=>{e.stopPropagation();}}>
                          ✉️ Contacter
                        </button>
                        {(a.statut==="expire"||a.statut==="essai")&&(
                          <button style={{padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:600,
                            cursor:"pointer",border:`1px solid #7C3AED`,background:"transparent",
                            color:"#7C3AED",fontFamily:"inherit"}}
                            onClick={e=>{e.stopPropagation();}}>
                            🔄 Renouveler
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Panneau détail */}
        {selected&&(
          <div style={{borderTop:`1px solid ${C.bd}`,padding:16,background:"#F0FDF4"}}>
            <div style={{fontWeight:700,color:"#1E5B3A",marginBottom:8,fontSize:13}}>
              📋 Détail — {selected.org}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
              {[
                ["Contact",selected.contact],
                ["Email",selected.email],
                ["Utilisateurs",`${selected.users} compte${selected.users>1?"s":""}`],
                ["Modules actifs",selected.modules.join(", ")],
              ].map(([k,v])=>(
                <div key={k} style={{background:"#fff",borderRadius:8,padding:"8px 12px",
                  border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:10,color:C.tx2,marginBottom:2}}>{k}</div>
                  <div style={{fontWeight:600,color:C.tx}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
