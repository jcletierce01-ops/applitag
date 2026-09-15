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

// ── DÉMO SCÉNARIO COMPLET ──────────────────────────────────────
const DEMO_STEPS = [
  {
    id:1, icon:"📱", label:"Signal Connect",
    who:"M. Bernard — propriétaire forestier",
    date:"08 avril 2026", heure:"08h42",
    statut:"SIGNAL_PROPRIETAIRE",
    resume:"M. Bernard signale 12 ha de bois disponibles via APPLITAG Connect depuis son téléphone.",
    detail:"M. Henri Bernard ouvre APPLITAG Connect sur son iPhone. Il localise sa parcelle sur la carte IGN, photographie l'entrée du chemin et deux arbres représentatifs, saisit l'essence principale (chêne + acacia), une estimation visuelle du volume, et valide. L'alerte arrive instantanément chez le mandataire ALTEGAD.",
    docs:["📲 Signalement numérique","📸 3 photos géolocalisées"],
    kpis:[{icon:"📐",label:"Surface signalée",val:"12 ha"},{icon:"🌲",label:"Essences",val:"Chêne + Acacia"},{icon:"⏱️",label:"Délai alerte",val:"< 30 secondes"}],
    color:"#0369A1",bg:"#E0F2FE",
    script:[
      "Nous démarrons la démonstration avec le tout nouveau point d'entrée d'APPLITAG : le signal propriétaire depuis APPLITAG Connect.",
      "M. Bernard est propriétaire de 12 ha en forêt de Tronçais. Depuis son téléphone, sans aucune connaissance technique, il localise sa parcelle sur la carte, prend trois photos et valide son signalement en moins de deux minutes.",
      "L'alerte arrive instantanément chez le mandataire ALTEGAD. Le lot LOT-2026-042 est créé automatiquement dans le système avec toutes les données saisies. Rien à ressaisir, rien à transcrire.",
      "C'est une rupture avec les pratiques habituelles : le propriétaire n'attend plus qu'on le rappelle — c'est lui qui initie, depuis son canapé, la chaîne complète de valorisation de ses bois.",
    ],
  },
  {
    id:2, icon:"🛣️", label:"Vérification desserte",
    who:"Mandataire forestier",
    date:"09 avril 2026", heure:"09h15",
    statut:"QUALIFICATION_ACCES",
    resume:"Le mandataire consulte le module Desserte avant d'engager la visite terrain.",
    detail:"Avant de se déplacer, le mandataire ouvre le module Desserte dans APPLITAG. Il vérifie le tronçon TRC-001 (Chemin des Battets), sa portance renforcée (≥ 19 t), sa largeur de 4,5 m, la disponibilité d'une place de dépôt, et la conformité DFCI de l'accès incendie. L'accès est validé pour un porteur + grumier.",
    docs:["🛣️ Fiche tronçon TRC-001","📋 Contrôle portance & accès"],
    kpis:[{icon:"⚖️",label:"Portance",val:"Renforcée ≥ 19 t"},{icon:"📐",label:"Largeur",val:"4,5 m"},{icon:"🔥",label:"Accès DFCI",val:"Conforme"}],
    color:"#1E40AF",bg:"#DBEAFE",
    script:[
      "Avant d'envoyer un mandataire sur le terrain, APPLITAG permet maintenant de vérifier la desserte depuis le bureau.",
      "Le module Desserte référence tous les tronçons forestiers avec leur portance, largeur, pente maximale, place de dépôt et conformité aux règles incendie DFCI. Ici, le tronçon Battets est renforcé, large et DFCI conforme — le porteur et le grumier pourront circuler sans restriction.",
      "Si la desserte avait été classée 'À améliorer' ou 'Légère', le mandataire aurait pu engager une procédure de travaux ou choisir un engin plus léger — tout ça décidé depuis le bureau, sans trajet inutile.",
      "C'est l'un des nouveaux modules du sprint APPLITAG : un référentiel vivant des 585 tonnes mobilisables accessibles sur ce périmètre.",
    ],
  },
  {
    id:3, icon:"🔭", label:"Visite terrain",
    who:"Mandataire + propriétaire",
    date:"14 avril 2026", heure:"10h00",
    statut:"VISITE_TERRAIN",
    resume:"Visite terrain avec formulaire 12 étapes. GPS relevé. Arbitrage SNBC 3. PV signé sur place.",
    detail:"Le mandataire ouvre le formulaire de visite guidé en 12 étapes. Il géolocalise, photographie, cube les bois (180 m³ bois d'œuvre + 320 m³ rémanents), et complète le nouveau bloc SNBC 3 : usage potentiel 'mixte BO/BE', usage retenu 'bois énergie' pour les rémanents, niveau de sécurisation 'mobilisable sous conditions'. Certification PEFC parcelle n°23-0042.",
    docs:["📄 PV de visite terrain","📄 Rapport de cubage","📊 Arbitrage SNBC 3"],
    kpis:[{icon:"🪵",label:"Bois d'œuvre",val:"180 m³"},{icon:"🌀",label:"Plaquettes",val:"320 m³ → ~128 t"},{icon:"📍",label:"GPS",val:"46.58°N / 2.77°E"}],
    color:"#065F46",bg:"#D1FAE5",
    script:[
      "Le mandataire se rend sur place. Depuis APPLITAG mobile, il suit le formulaire de visite en 12 étapes guidées.",
      "Nouveauté SNBC 3 : APPLITAG demande maintenant l'arbitrage sur le flux de bois. Usage potentiel mixte bois-œuvre et bois-énergie — usage retenu bois-énergie pour les rémanents uniquement. Cette distinction est obligatoire pour la conformité réglementaire.",
      "Le cubage est saisi directement : 180 m³ de bois d'œuvre qui partiront en scierie, et 320 m³ de rémanents qui seront déchiquetés. La valeur carbone et le bilan GES sont déjà calculés en arrière-plan.",
      "Signature électronique du procès-verbal par les deux parties, sur le téléphone, avant même de quitter la parcelle.",
    ],
  },
  {
    id:4, icon:"📋", label:"Lot & contrat",
    who:"Admin APPLITAG",
    date:"15 avril 2026", heure:"14h30",
    statut:"EN_PREPARATION",
    resume:"Lot LOT-2026-042 créé. Contrat signé. QR Code chantier généré. Desserte validée.",
    detail:"Le lot est finalisé. Conditions de vente : bois d'œuvre à 45 €/m³, plaquettes à 38 €/t livraison chaufferie. Contrat signé électroniquement. QR Code chantier généré et imprimé pour l'ETF. La parcelle B 112–B 114 est liée au tronçon TRC-001 dans le module Desserte.",
    docs:["📄 Bon de commande BC-2026-042","📄 Contrat d'exploitation","🏷️ QR Code chantier"],
    kpis:[{icon:"🔢",label:"N° lot",val:"LOT-2026-042"},{icon:"💶",label:"Valeur estimée",val:"13 220 €"},{icon:"📅",label:"Deadline",val:"30 mai 2026"}],
    color:"#7C3AED",bg:"#EDE9FE",
    script:[
      "Le lot existe déjà depuis le signal Connect. Cette étape consiste uniquement à le finaliser — les données de la visite sont déjà intégrées, rien à ressaisir.",
      "Les conditions commerciales sont fixées. Le contrat est généré en PDF et signé électroniquement. Le QR code unique du chantier est imprimé et remis à l'ETF.",
      "Nouveauté : la parcelle B 112 est désormais liée au tronçon de desserte TRC-001 dans APPLITAG. Si le tronçon change de statut — travaux, fermeture saisonnière — tous les lots associés sont alertés automatiquement.",
    ],
  },
  {
    id:5, icon:"🪓", label:"Exploitation chantier",
    who:"ETF Dupont Frères",
    date:"20 avril 2026", heure:"07h45",
    statut:"EN_EXPLOITATION",
    resume:"Abattage harvester + débardage porteur. Saisie quotidienne dans APPLITAG. QR scanné à l'arrivée.",
    detail:"ETF Dupont Frères (agrément PEFC n°2023-0156). 3 opérateurs : 1 harvester + 1 porteur. Le chef de chantier scanne le QR à l'arrivée, ce qui déclenche le statut 'En exploitation'. Saisie quotidienne des volumes. Alerte automatique si écart > 10% vs estimation visite.",
    docs:["📄 Ordre d'exploitation","📲 Scan QR arrivée chantier","📊 Suivi volumes quotidien"],
    kpis:[{icon:"🪓",label:"Abattage",val:"183 m³"},{icon:"🚜",label:"Débardage",val:"183 m³"},{icon:"⏱️",label:"Durée",val:"8 jours"}],
    color:"#1E5B3A",bg:"#DCFCE7",
    script:[
      "L'ETF reçoit l'ordre d'exploitation depuis APPLITAG. Le scan du QR code le matin du premier jour déclenche automatiquement le statut En exploitation.",
      "Chaque soir, l'opérateur saisit les volumes abattus. Le mandataire suit l'avancement en temps réel sans appel téléphonique.",
      "Si un opérateur découvre une contrainte non identifiée — une zone humide, un câble — il la signale depuis l'application avec une photo géolocalisée. Une alerte est envoyée au mandataire dans la minute.",
    ],
  },
  {
    id:6, icon:"♻️", label:"Scierie & coproduits",
    who:"Scierie Moreau — Moulins",
    date:"28 avril 2026", heure:"07h00",
    statut:"BOIS_OEUVRE_EN_SCIERIE",
    resume:"Les 183 m³ de bois d'œuvre partent en scierie. Coproduits qualifiés et tracés dans APPLITAG.",
    detail:"Le bois d'œuvre (chêne, 183 m³) est livré à la Scierie Moreau. Dans le module Coproduits, les connexes sont immédiatement qualifiés : 45 t de plaquettes P31 (humidité 30%), 12 t de sciures (humidité 45%, valorisation interne chaudière scierie), 8 t de dosses hêtre/chêne (destination panneaux). Le tout tracé lot par lot dans APPLITAG.",
    docs:["📄 Bon de livraison scierie","📊 Qualification coproduits","🔀 Fiche destination matière/énergie"],
    kpis:[{icon:"🪚",label:"Plaquettes P31",val:"45 t (hum. 30%)"},{icon:"🌫️",label:"Sciures",val:"12 t → énergie interne"},{icon:"🪜",label:"Dosses",val:"8 t → panneaux"}],
    color:"#7C3AED",bg:"#EDE9FE",
    script:[
      "Nouveauté majeure : APPLITAG trace maintenant le bois d'œuvre jusqu'en scierie, et récupère la qualification des coproduits.",
      "Dès la réception en scierie, les connexes sont saisis dans le module Coproduits : plaquettes P31 à 30% d'humidité pour vente énergie, sciures pour la chaudière interne de la scierie, dosses pour la filière panneaux.",
      "Ici la distinction matière — énergie est tracée pour chaque flux. C'est ce que la SNBC 3 impose : prouver que la hiérarchie des usages est respectée. APPLITAG génère automatiquement la preuve documentaire.",
      "Les coproduits Scierie Moreau s'inscrivent également dans le cadre FEADER Grand Est — phase 2 ouverte en septembre 2026. APPLITAG prépare déjà le dossier de traçabilité.",
    ],
  },
  {
    id:7, icon:"🌀", label:"Déchiquetage rémanents",
    who:"JENZ Déchiquetage SARL",
    date:"02 mai 2026", heure:"08h00",
    statut:"EN_DECHIQUETAGE",
    resume:"320 m³ de rémanents déchiquetés sur chantier. 131 t de plaquettes PF2. Humidité 38%.",
    detail:"L'entreprise de déchiquetage intervient avec le Jenz HEM 593. Résultat : 131 t de plaquettes PF2 (humidité 38%). Chargement en camion-souffleur, livraison directe chaufferie. L'humidité 38% est enregistrée — elle sera comparée à la mesure d'arrivée. APPLITAG calcule en temps réel le coût RED à 3,3 €/t, soit 432 € de surcoût réglementaire estimé pour ce lot.",
    docs:["📄 Ordre de déchiquetage OD-2026-042","📊 Fiche humidité & granulométrie","📊 Calcul surcoût RED estimé"],
    kpis:[{icon:"🌀",label:"Volume déchiqueté",val:"320 m³"},{icon:"⚖️",label:"Tonnage",val:"131 t"},{icon:"💧",label:"Humidité",val:"38 %"},{icon:"💶",label:"Surcoût RED estimé",val:"432 €"}],
    color:"#92400E",bg:"#FEF3C7",
    script:[
      "Les rémanents sont déchiquetés sur le chantier. 131 tonnes de plaquettes PF2, humidité 38%.",
      "Nouveauté : APPLITAG calcule maintenant le surcoût RED en temps réel. Au benchmark de 3,3 euros par tonne — référence RED II pour les sites existants — ce lot représente 432 euros de surcoût réglementaire. Ce chiffre alimente le module Coût RED par tonne.",
      "L'humidité de 38% est enregistrée au départ. Elle sera comparée à la mesure à la réception. Si l'écart dépasse le seuil paramétré, une alerte est déclenchée automatiquement.",
    ],
  },
  {
    id:8, icon:"🚛", label:"Transport & CMR",
    who:"Transport Bernard SAS",
    date:"04 mai 2026", heure:"06h30",
    statut:"EN_TRANSPORT",
    resume:"3 rotations. CMR générés automatiquement. Traçabilité QR départ/arrivée.",
    detail:"3 camions semi-remorques. CMR n° CMR-2026-0831 à 0833 générés automatiquement dans APPLITAG. Chaque chauffeur scanne le QR au départ et à l'arrivée. Statut 'En route' visible en temps réel par le mandataire et la chaufferie.",
    docs:["📄 CMR Transport (×3)","📲 Scan QR chauffeur départ","📲 Scan QR chauffeur arrivée"],
    kpis:[{icon:"🚛",label:"Rotations",val:"3 camions"},{icon:"⚖️",label:"Total",val:"131 t"},{icon:"📍",label:"Distance",val:"~68 km"}],
    color:"#6D28D9",bg:"#EDE9FE",
    script:[
      "Le transport est planifié depuis le module Transports. Le chauffeur reçoit sa mission sur son téléphone : GPS, numéro de lot, destination, créneau.",
      "Au départ, scan du QR. La lettre de voiture CMR est générée automatiquement — plus de paperasse à 6h30 du matin. Le statut passe à En route, visible par le mandataire et la chaufferie.",
      "À l'arrivée, nouveau scan. La pesée à la bascule sera comparée au tonnage déclaré au départ. C'est la traçabilité physique bout en bout.",
    ],
  },
  {
    id:9, icon:"🔥", label:"Réception chaufferie",
    who:"Chaufferie Vichy Agglo — 6,8 MW",
    date:"04 mai 2026", heure:"09h10",
    statut:"LIVRE",
    resume:"Réception à la bascule. Jauge stock mise à jour. Autonomie calculée. F08 cosigné.",
    detail:"Le camion arrive à la Chaufferie Vichy Agglo (6,8 MW, 13 600 t/an). Le réceptionnaire retrouve le bon de livraison dans APPLITAG. Pesée : 43,8 t. Humidité sonde : 38,2%. Écart 150 kg — dans les tolérances. La jauge de stock passe de 312 t à 356 t. Autonomie estimée : de 8 à 10 jours. Les 3 rotations totalisent 131,2 t réceptionnées.",
    docs:["📄 Bon de livraison (×3)","📄 Réception F08 cosignée","📊 Contrôle humidité sonde"],
    kpis:[{icon:"📦",label:"Réceptionné",val:"131,2 t"},{icon:"💧",label:"Humidité mesurée",val:"38,2 %"},{icon:"🔥",label:"Stock chaufferie",val:"356 t (+131 t)"},{icon:"📅",label:"Autonomie",val:"10 jours"}],
    color:"#B45309",bg:"#FEF3C7",
    script:[
      "Le camion arrive à la Chaufferie Vichy Agglo, l'une des 29 chaufferies référencées dans APPLITAG — de Vichy à Papeete, de Bastia à Saint-Pierre-et-Miquelon.",
      "Le réceptionnaire retrouve instantanément le bon de livraison sur sa tablette. Pesée bascule, mesure humidité. Tout est saisi dans APPLITAG, les données alimentent directement la jauge de stock de la chaufferie.",
      "La jauge passe de 312 à 356 tonnes. L'autonomie remonte de 8 à 10 jours. Si le stock avait été sous le seuil d'alerte, une notification aurait déjà été envoyée au planning pour anticiper la prochaine livraison.",
      "Le bon de livraison F08 est cosigné numériquement par le chauffeur et le réceptionnaire. Archivé instantanément. En cas de litige : heure, poids, humidité, signatures — tout est là.",
    ],
  },
  {
    id:10, icon:"🧾", label:"Facturation électronique",
    who:"Admin APPLITAG",
    date:"05 mai 2026", heure:"08h30",
    statut:"FACTURE_EMISE",
    resume:"Facture FAC-2026-042 générée depuis le lot. Détection doublon. Transmission PDP.",
    detail:"APPLITAG génère la facture en un clic depuis le lot clôturé. FAC-2026-042 : 131,2 t × 38 €/t + 183 m³ × 45 €/m³. Total HT : 13 229,60 €. Le module détecte qu'une seconde facture avait été créée par erreur sur le même bon de livraison — doublon bloqué. La facture validée est transmise à la plateforme de dématérialisation partenaire (PDP) conformément à l'obligation du 1er septembre 2026.",
    docs:["🧾 FAC-2026-042 (validée)","🚫 Doublon FAC-2026-042b (bloqué)","📤 Transmission PDP"],
    kpis:[{icon:"💶",label:"Montant HT",val:"13 229,60 €"},{icon:"🔄",label:"Doublons détectés",val:"1 bloqué"},{icon:"📤",label:"Statut",val:"Transmise PDP"}],
    color:"#1E40AF",bg:"#DBEAFE",
    script:[
      "La facturation électronique est maintenant intégrée directement dans le flux APPLITAG — une obligation réglementaire à partir du 1er septembre 2026.",
      "La facture est générée en un clic depuis le lot clôturé. Montant calculé automatiquement depuis les données de livraison.",
      "APPLITAG a détecté qu'une deuxième facture avait été créée par erreur sur le même bon de livraison — doublon bloqué avant transmission. C'est le genre d'erreur qui coûtait des heures de correction manuelle, ou pire, qui passait inaperçue.",
      "La facture validée est transmise à la plateforme de dématérialisation partenaire. La piste d'audit complète — lot, livraison, facture, paiement — est archivée pour 10 ans.",
    ],
  },
  {
    id:11, icon:"🇪🇺", label:"Conformité RED & GES",
    who:"Responsable réglementaire",
    date:"06 mai 2026", heure:"10h00",
    statut:"CONTROLE_REGLEMENTAIRE",
    resume:"Vérification critères RED II. Calcul surcoût 3,3 €/t. Bilan GES lot. Arbitrage SNBC 3 validé.",
    detail:"Le module Conformité RED vérifie automatiquement les 6 critères du lot : origine géographique tracée, certification PEFC, pas de zone protégée, humidité mesurée, destination déclarée. Score : 5/6 (origine à compléter). Le module Coût RED calcule 432 € de surcoût pour ce lot. Le Bilan GES affiche 28 tCO₂eq évitées. L'arbitrage SNBC 3 — bois énergie justifié pour les rémanents — est documenté.",
    docs:["📋 Rapport conformité RED II","📊 Coût RED : 432 € (3,3 €/t)","🌡️ Bilan GES : 28 tCO₂eq évitées","📄 Arbitrage SNBC 3 validé"],
    kpis:[{icon:"🇪🇺",label:"Score RED",val:"5/6 critères"},{icon:"💶",label:"Surcoût RED",val:"432 € (3,3 €/t)"},{icon:"🌡️",label:"GES évités",val:"28 tCO₂eq"},{icon:"⚖️",label:"SNBC 3",val:"Arbitrage conforme"}],
    color:"#1E3A8A",bg:"#DBEAFE",
    script:[
      "Dernier module clé : la conformité réglementaire. APPLITAG vérifie automatiquement les critères RED II pour ce lot.",
      "5 critères sur 6 sont validés. Le sixième — justificatif d'origine géographique complémentaire — est signalé avec une action corrective à réaliser avant l'audit.",
      "Le surcoût RED calculé est de 432 euros pour ce lot, soit 3,3 euros par tonne — cohérent avec le benchmark du consortium que l'on retrouve dans le module Coût RED.",
      "Le Bilan GES affiche 28 tonnes de CO2 équivalent évitées. L'arbitrage SNBC 3 documenté lors de la visite est retrouvé et validé. Tout est cohérent, tout est traçable. APPLITAG est prêt pour l'audit.",
    ],
  },
  {
    id:12, icon:"📐", label:"Projet financé FEADER",
    who:"Porteur de projet — SCIC Tronçais",
    date:"07 mai 2026", heure:"14h00",
    statut:"DOSSIER_FEADER_EN_COURS",
    resume:"Le lot s'inscrit dans un projet financé FEADER. Desserte + traçabilité = indicateurs financeur.",
    detail:"La desserte du chantier Bernard fait l'objet d'un projet financé FEADER – Développement rural Grand Est (PRJ-2026-001). APPLITAG consolide automatiquement les indicateurs exigés : surface desservie (12 ha), tonnage mobilisé (131 t + 183 m³ bois d'œuvre), destination tracée, emplois. Les pièces encore manquantes sont signalées : attestation assurance maîtrise d'ouvrage, PV de réception travaux.",
    docs:["📐 Dossier PRJ-2026-001 (50% avancement)","📊 Indicateurs financeur FEADER","⏳ 2 pièces manquantes signalées"],
    kpis:[{icon:"💶",label:"Dépenses prévues",val:"42 000 €"},{icon:"✅",label:"Avancement",val:"50 %"},{icon:"📋",label:"Pièces manquantes",val:"2"}],
    color:"#065F46",bg:"#D1FAE5",
    script:[
      "Ce lot s'inscrit dans un projet financé FEADER. APPLITAG dispose d'un module générique Projets financés qui couvre le parcours complet en 8 étapes, du diagnostic au bilan final.",
      "Les indicateurs financeur — surface, tonnage, destination, emplois — sont consolidés automatiquement depuis les données déjà saisies dans les autres modules. Aucune ressaisie.",
      "APPLITAG signale les deux pièces justificatives encore manquantes pour compléter le dossier. Le porteur de projet sait exactement quoi fournir, sans relance du financeur.",
      "Voilà le fil conducteur de cette démonstration : un signal propriétaire, une desserte vérifiée, un lot tracé, une scierie référencée, des coproduits qualifiés, une chaufferie servie, une facture conforme, un audit RED préparé, un projet FEADER outillé. APPLITAG est la colonne vertébrale de la filière bois-énergie.",
    ],
  },
];

export const SectionDemoScenario = () => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showScript, setShowScript] = useState(true);
  const timerRef = useRef(null);

  useEffect(()=>{
    if(playing){
      timerRef.current = setInterval(()=>{
        setStep(s=>{
          if(s>=DEMO_STEPS.length-1){ setPlaying(false); clearInterval(timerRef.current); return s; }
          return s+1;
        });
      },2800);
    } else {
      clearInterval(timerRef.current);
    }
    return ()=>clearInterval(timerRef.current);
  },[playing]);

  const cur = DEMO_STEPS[step];

  return (
    <div style={{maxWidth:960,margin:"0 auto"}}>
      <div style={{marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>🎬 Démo scénario complet</div>
          <div style={{fontSize:13,color:C.tx2}}>Parcours A→Z du lot LOT-2026-042 — Forêt de M. Bernard (12 ha, Tronçais)</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>{setStep(0);setPlaying(false);}}
            style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${C.bd}`,background:"transparent",color:C.tx2,fontFamily:"inherit"}}>
            ⏮ Recommencer
          </button>
          <button onClick={()=>setPlaying(p=>!p)}
            style={{padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
              border:"none",background:playing?"#B91C1C":"#1E5B3A",color:"#fff",fontFamily:"inherit"}}>
            {playing?"⏸ Pause":"▶ Lecture auto"}
          </button>
          <button onClick={()=>setShowScript(s=>!s)}
            style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`2px solid ${showScript?"#7C3AED":"#D1D5DB"}`,
              background:showScript?"#EDE9FE":"transparent",
              color:showScript?"#7C3AED":C.tx2,fontFamily:"inherit"}}>
            🎤 {showScript?"Masquer script":"Script présentateur"}
          </button>
        </div>
      </div>

      {/* Timeline stepper */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:"16px 20px",marginBottom:20,overflowX:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:0,minWidth:700}}>
          {DEMO_STEPS.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",flex:1}}>
              <div onClick={()=>{setPlaying(false);setStep(i);}}
                style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",
                  flex:"0 0 auto",width:60}}>
                <div style={{width:36,height:36,borderRadius:"50%",
                  background:i<=step?s.bg:"#F3F4F6",
                  border:`2px solid ${i<=step?s.color:"#D1D5DB"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,transition:"all .3s",
                  boxShadow:i===step?`0 0 0 4px ${s.bg}`:undefined}}>
                  {i<step?"✓":s.icon}
                </div>
                <div style={{fontSize:9,color:i<=step?s.color:"#9CA3AF",marginTop:4,textAlign:"center",
                  fontWeight:i===step?700:400,lineHeight:1.2,maxWidth:58}}>
                  {s.label}
                </div>
              </div>
              {i<DEMO_STEPS.length-1&&(
                <div style={{flex:1,height:2,background:i<step?cur.color:"#E5E7EB",
                  transition:"background .5s",margin:"0 2px",marginBottom:22}}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Script présentateur */}
      {showScript&&(
        <div style={{background:"linear-gradient(135deg,#FAF5FF,#F3E8FF)",borderRadius:14,
          border:"2px solid #C4B5FD",padding:"18px 20px",marginBottom:20,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{fontSize:22}}>🎤</span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#5B21B6"}}>Script présentateur</div>
              <div style={{fontSize:11,color:"#7C3AED",opacity:.8}}>Texte à lire à voix haute — étape {cur.id}/{DEMO_STEPS.length} : {cur.label}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {cur.script.map((para,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{flexShrink:0,width:22,height:22,borderRadius:"50%",
                  background:"#7C3AED",color:"#fff",fontSize:10,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>
                  {i+1}
                </span>
                <p style={{margin:0,fontSize:14,color:"#3B1D8A",lineHeight:1.75,
                  fontStyle:"normal",fontWeight:i===0?600:400}}>
                  {para}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carte principale */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start"}}>
        {/* Détail étape */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{background:cur.bg,borderBottom:`1px solid ${cur.color}33`,
            padding:"16px 20px",display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:52,height:52,borderRadius:14,background:"#fff",
              border:`2px solid ${cur.color}44`,display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:26,flexShrink:0}}>
              {cur.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{fontSize:17,fontWeight:800,color:cur.color}}>{cur.label}</div>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,
                  background:`${cur.color}18`,color:cur.color}}>Étape {cur.id}/{DEMO_STEPS.length}</span>
              </div>
              <div style={{fontSize:12,color:C.tx2,marginTop:3}}>
                👤 {cur.who} · 📅 {cur.date} {cur.heure}
              </div>
            </div>
          </div>
          <div style={{padding:"16px 20px"}}>
            <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:8,
              padding:"10px 12px",background:cur.bg,borderRadius:8,borderLeft:`3px solid ${cur.color}`}}>
              {cur.resume}
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.7,marginBottom:16}}>
              {cur.detail}
            </div>

            {/* Statut */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:10,color:C.tx2,fontWeight:600}}>Statut lot :</span>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:5,fontWeight:700,
                background:cur.bg,color:cur.color}}>{cur.statut}</span>
            </div>

            {/* Documents */}
            {cur.docs.length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Documents générés</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {cur.docs.map((d,i)=>(
                    <span key={i} style={{fontSize:11,padding:"5px 10px",borderRadius:7,
                      background:"#F9FAFB",border:`1px solid ${C.bd}`,color:C.tx,fontWeight:500}}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{borderTop:`1px solid ${C.bd}`,padding:"12px 20px",
            display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}
              style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                border:`1px solid ${C.bd}`,background:"transparent",color:step===0?"#D1D5DB":C.tx2,
                fontFamily:"inherit",opacity:step===0?.4:1}}>
              ← Précédent
            </button>
            <span style={{fontSize:11,color:C.tx2,alignSelf:"center"}}>
              {step+1} / {DEMO_STEPS.length}
            </span>
            <button onClick={()=>setStep(s=>Math.min(DEMO_STEPS.length-1,s+1))} disabled={step===DEMO_STEPS.length-1}
              style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                border:"none",background:step===DEMO_STEPS.length-1?"#E5E7EB":cur.color,
                color:step===DEMO_STEPS.length-1?"#9CA3AF":"#fff",fontFamily:"inherit",
                opacity:step===DEMO_STEPS.length-1?.4:1}}>
              Suivant →
            </button>
          </div>
        </div>

        {/* Panneau KPIs + progression */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* KPIs étape */}
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Indicateurs clés</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cur.kpis.map((k,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"8px 12px",borderRadius:8,background:cur.bg}}>
                  <span style={{fontSize:12,color:C.tx2}}>{k.icon} {k.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:cur.color}}>{k.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progression du lot */}
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Avancement global</div>
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,color:C.tx2}}>Progression</span>
                <span style={{fontSize:11,fontWeight:700,color:"#1E5B3A"}}>
                  {Math.round(((step+1)/DEMO_STEPS.length)*100)} %
                </span>
              </div>
              <div style={{height:8,borderRadius:4,background:"#E5E7EB",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,background:"#1E5B3A",
                  width:`${Math.round(((step+1)/DEMO_STEPS.length)*100)}%`,
                  transition:"width .5s ease"}}/>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:10}}>
              {DEMO_STEPS.map((s,i)=>(
                <div key={s.id} onClick={()=>{setPlaying(false);setStep(i);}}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",
                    borderRadius:6,cursor:"pointer",
                    background:i===step?s.bg:"transparent",
                    border:`1px solid ${i===step?s.color+"44":"transparent"}`}}>
                  <span style={{fontSize:12}}>{i<step?"✅":i===step?s.icon:"⬜"}</span>
                  <span style={{fontSize:11,color:i<=step?s.color:C.tx2,fontWeight:i===step?700:400}}>
                    {s.label}
                  </span>
                  <span style={{fontSize:9,color:C.tx2,marginLeft:"auto"}}>{s.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bilan final */}
          {step===DEMO_STEPS.length-1&&(
            <div style={{background:"#D1FAE5",borderRadius:14,border:"1px solid #34D399",padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:8}}>🏆 Lot clôturé</div>
              {[["Durée totale","24 jours"],["CA réalisé","13 220 €"],["CO₂ évité","~32 tCO₂eq"],["Docs générés","12 documents"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                  padding:"3px 0",borderBottom:"1px solid #A7F3D044"}}>
                  <span style={{color:"#065F46"}}>{k}</span>
                  <span style={{fontWeight:700,color:"#064E3B"}}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── ARCHITECTURE FONCTIONNELLE 7 MODULES / 36 SOUS-MODULES ────
const MODULES_COMMERCIAUX = [
  {
    id:"operations",
    nom:"APPLITAG Operations",
    icon:"⚙️",
    couleur:"#1E5B3A",
    bg:"#D1FAE5",
    tagline:"Piloter les opérations terrain et forestières",
    sousMods:[
      {n:1,  nom:"Operations",  fn:"Centraliser et piloter l'ensemble des activités opérationnelles.", statut:"ok",      app:"Tableau de bord"},
      {n:2,  nom:"Commercial",  fn:"Gérer contacts, prospects, propriétaires, clients et opportunités.", statut:"ok",      app:"Lots (fiche propriétaire)"},
      {n:3,  nom:"Forest",      fn:"Recenser parcelles, peuplements, essences, accès et potentiels forestiers.", statut:"ok",   app:"Parcelles & Travaux"},
      {n:4,  nom:"Worksite",    fn:"Préparer, suivre et clôturer les chantiers forestiers.", statut:"ok",      app:"Chantiers"},
      {n:5,  nom:"Lots",        fn:"Créer et suivre chaque lot de son origine à sa destination.", statut:"ok",      app:"Lots"},
      {n:6,  nom:"Stock",       fn:"Mesurer et gérer les tas, volumes, tonnages et stocks.", statut:"roadmap", app:"—"},
      {n:7,  nom:"Production",  fn:"Suivre le broyage, les rendements et les quantités produites.", statut:"partial", app:"Transports (déchiquetage)"},
      {n:8,  nom:"Planning",    fn:"Planifier les visites, chantiers, broyages et interventions.", statut:"ok",      app:"Planning"},
      {n:9,  nom:"Equipment",   fn:"Gérer les matériels, entretiens, pannes et disponibilités.", statut:"roadmap", app:"—"},
      {n:10, nom:"Workflow",    fn:"Encadrer les opérations avec étapes, validations et règles métier.", statut:"ok",   app:"Formulaire visite 12 étapes"},
      {n:11, nom:"Mobile",      fn:"Permettre la saisie et la consultation sur smartphone ou tablette.", statut:"ok",   app:"Interface responsive terrain"},
      {n:12, nom:"Offline",     fn:"Garantir la saisie terrain sans réseau et la synchronisation.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"logistics",
    nom:"APPLITAG Logistics",
    icon:"🚛",
    couleur:"#0369A1",
    bg:"#DBEAFE",
    tagline:"Organiser les transports, livraisons et chaufferies",
    sousMods:[
      {n:13, nom:"Logistics",      fn:"Planifier les chargements, véhicules, chauffeurs, itinéraires.", statut:"ok",      app:"Transports"},
      {n:14, nom:"Delivery",       fn:"Enregistrer les pesées, livraisons, signatures, réserves et refus.", statut:"ok",   app:"Livraisons"},
      {n:15, nom:"Platforms",      fn:"Piloter les entrées, sorties, stocks et zones des plateformes.", statut:"partial", app:"Livraisons (réception)"},
      {n:16, nom:"Heating Plants", fn:"Suivre les besoins, stocks, consommations et livraisons des chaufferies.", statut:"ok", app:"Chaufferies"},
    ],
  },
  {
    id:"traceability",
    nom:"APPLITAG Traceability",
    icon:"🔍",
    couleur:"#7C3AED",
    bg:"#EDE9FE",
    tagline:"Traçabilité, qualité et conformité de la parcelle à la chaufferie",
    sousMods:[
      {n:17, nom:"Traceability", fn:"Assurer une continuité d'information de la parcelle au client final.", statut:"ok",      app:"QR code lot, statuts bout-en-bout"},
      {n:18, nom:"Quality",      fn:"Contrôler l'humidité, la granulométrie, les essences et la conformité.", statut:"partial", app:"Livraisons (humidité mesurée)"},
      {n:19, nom:"Documents",    fn:"Générer, classer et rattacher les documents aux opérations.", statut:"ok",      app:"Documents (9 types, PDF)"},
      {n:20, nom:"Compliance",   fn:"Gérer les obligations réglementaires, certifications et audits.", statut:"ok",      app:"Veille réglementaire"},
      {n:21, nom:"RED",          fn:"Collecter les données nécessaires aux exigences RED II et RED III.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"data",
    nom:"APPLITAG Data",
    icon:"📊",
    couleur:"#B45309",
    bg:"#FEF3C7",
    tagline:"Transformer les données en tableaux de bord, alertes et analyses",
    sousMods:[
      {n:22, nom:"Data",    fn:"Produire des tableaux de bord, indicateurs, analyses et prévisions.", statut:"ok",   app:"Analyses & Rapports"},
      {n:23, nom:"Map",     fn:"Cartographier les parcelles, stocks, chantiers, plateformes et chaufferies.", statut:"ok", app:"Territoire (CARTOFOB)"},
      {n:24, nom:"Alert",   fn:"Détecter les retards, anomalies, ruptures et documents manquants.", statut:"ok",   app:"Alertes"},
      {n:25, nom:"Finance", fn:"Calculer les coûts, marges, rentabilités, valeurs de stocks et écarts.", statut:"ok", app:"Analyses (marges, CA, rentabilité)"},
    ],
  },
  {
    id:"connect",
    nom:"APPLITAG Connect",
    icon:"🔗",
    couleur:"#065F46",
    bg:"#CCFBF1",
    tagline:"Connecter utilisateurs, partenaires et systèmes externes",
    sousMods:[
      {n:26, nom:"Connect",       fn:"Relier APPLITAG aux ERP, ponts-bascules, GPS, capteurs et logiciels partenaires.", statut:"roadmap", app:"—"},
      {n:27, nom:"Administration",fn:"Paramétrer les entreprises, utilisateurs, rôles, droits et modèles.", statut:"ok",      app:"Utilisateurs & Paramètres"},
      {n:28, nom:"Owner",         fn:"Offrir au propriétaire un accès à ses parcelles, chantiers et documents.", statut:"roadmap", app:"—"},
      {n:29, nom:"Client Portal", fn:"Donner aux clients une visibilité sur leurs stocks, livraisons et qualités.", statut:"roadmap", app:"—"},
      {n:30, nom:"Demo",          fn:"Présenter la plateforme à partir de scénarios et données fictives.", statut:"ok",      app:"Démo scénario"},
      {n:31, nom:"Pilot",         fn:"Préparer les déploiements pilotes et suivre les retours utilisateurs.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"network",
    nom:"APPLITAG Network",
    icon:"🤝",
    couleur:"#6D28D9",
    bg:"#EDE9FE",
    tagline:"Réseau professionnel et mise en relation de la filière",
    sousMods:[
      {n:32, nom:"Network",     fn:"Constituer un annuaire professionnel qualifié des acteurs de la filière.", statut:"ok",   app:"Réseau & Offres (annuaire)"},
      {n:33, nom:"Marketplace", fn:"Mettre en relation les offres et besoins de bois, transport et prestations.", statut:"ok", app:"Réseau & Offres (offres)"},
    ],
  },
  {
    id:"academy",
    nom:"APPLITAG Academy & Media",
    icon:"🎓",
    couleur:"#92400E",
    bg:"#FEF3C7",
    tagline:"Former, informer et valoriser les acteurs du bois-énergie",
    sousMods:[
      {n:34, nom:"Academy", fn:"Former les utilisateurs aux outils, métiers, normes et bonnes pratiques.", statut:"futur", app:"—"},
      {n:35, nom:"Radio",   fn:"Diffuser interviews, actualités, chroniques et émissions professionnelles.", statut:"futur", app:"—"},
      {n:36, nom:"TV",      fn:"Diffuser reportages, démonstrations, formations et événements de la filière.", statut:"futur", app:"—"},
    ],
  },
];

const SM_STATUT = {
  ok:      {label:"Disponible",  color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  partial: {label:"Partiel",     color:"#92400E", bg:"#FEF3C7", icon:"🔄"},
  roadmap: {label:"Roadmap",     color:"#0369A1", bg:"#DBEAFE", icon:"🔜"},
  futur:   {label:"Futur",       color:"#6D28D9", bg:"#EDE9FE", icon:"🔵"},
};

export const SectionModulesFuturs = () => {
  const [selMod, setSelMod] = useState("operations");
  const [filtre, setFiltre] = useState("all");
  const mod = MODULES_COMMERCIAUX.find(m=>m.id===selMod);

  const smFiltres = filtre==="all" ? mod.sousMods : mod.sousMods.filter(s=>s.statut===filtre);

  const totals = {
    ok:      MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="ok").length,
    partial: MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="partial").length,
    roadmap: MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="roadmap").length,
    futur:   MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="futur").length,
  };

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
              🗂️ Architecture fonctionnelle APPLITAG
            </div>
            <div style={{fontSize:13,color:C.tx2}}>7 modules commerciaux · 36 sous-modules · classification officielle</div>
          </div>
          {/* Légende compteurs */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {Object.entries(SM_STATUT).map(([k,s])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:5,
                padding:"5px 10px",borderRadius:20,background:s.bg,
                border:`1px solid ${s.color}44`,fontSize:11,fontWeight:700,color:s.color}}>
                {s.icon} {totals[k]} {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* 7 cartes modules */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
          {MODULES_COMMERCIAUX.map(m=>{
            const nbOk = m.sousMods.filter(s=>s.statut==="ok").length;
            const total = m.sousMods.length;
            const isActive = selMod===m.id;
            return (
              <div key={m.id} onClick={()=>setSelMod(m.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 10px",cursor:"pointer",
                  border:`2px solid ${isActive?m.couleur:C.bd}`,
                  boxShadow:isActive?`0 0 0 3px ${m.bg}`:"none",
                  transition:"all .2s",textAlign:"center"}}>
                <div style={{fontSize:26,marginBottom:6}}>{m.icon}</div>
                <div style={{fontSize:10,fontWeight:800,color:isActive?m.couleur:C.tx,lineHeight:1.2,marginBottom:6}}>
                  {m.nom.replace("APPLITAG ","")}
                </div>
                <div style={{height:4,borderRadius:2,background:"#E5E7EB",overflow:"hidden",marginBottom:5}}>
                  <div style={{height:"100%",borderRadius:2,background:m.couleur,
                    width:`${Math.round((nbOk/total)*100)}%`}}/>
                </div>
                <div style={{fontSize:9,color:C.tx2}}>{nbOk}/{total} dispo</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail module sélectionné */}
      {mod&&(
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          {/* Header module */}
          <div style={{background:mod.bg,borderBottom:`1px solid ${mod.couleur}22`,
            padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:30}}>{mod.icon}</span>
              <div>
                <div style={{fontSize:16,fontWeight:900,color:mod.couleur}}>{mod.nom}</div>
                <div style={{fontSize:12,color:C.tx2}}>{mod.tagline}</div>
              </div>
            </div>
            {/* Filtre statut */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[["all","Tous","#374151","#F3F4F6"],...Object.entries(SM_STATUT).map(([k,s])=>[k,s.label,s.color,s.bg])].map(([k,label,col,bg])=>(
                <button key={k} onClick={()=>setFiltre(k)}
                  style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                    fontFamily:"inherit",border:`1px solid ${filtre===k?col:"#E5E7EB"}`,
                    background:filtre===k?bg:"transparent",color:filtre===k?col:C.tx2}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grille sous-modules */}
          <div style={{padding:"16px 20px",display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
            {smFiltres.map(sm=>{
              const ss = SM_STATUT[sm.statut];
              return (
                <div key={sm.n} style={{borderRadius:10,border:`1px solid ${ss.color}33`,
                  background:`${ss.bg}60`,padding:"12px 14px",position:"relative"}}>
                  {/* Numéro + statut */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <span style={{fontSize:9,fontWeight:800,color:ss.color,
                      background:ss.bg,border:`1px solid ${ss.color}44`,
                      padding:"2px 7px",borderRadius:10}}>
                      #{sm.n} {ss.icon} {ss.label}
                    </span>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:mod.couleur,marginBottom:4}}>{sm.nom}</div>
                  <div style={{fontSize:11,color:C.tx2,lineHeight:1.5,marginBottom:8}}>{sm.fn}</div>
                  {sm.app!=="—"&&(
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,
                      fontSize:10,fontWeight:700,color:mod.couleur,
                      background:mod.bg,border:`1px solid ${mod.couleur}33`,
                      padding:"3px 8px",borderRadius:6}}>
                      📍 {sm.app}
                    </div>
                  )}
                  {sm.app==="—"&&(
                    <div style={{fontSize:10,color:"#9CA3AF",fontStyle:"italic"}}>Non encore développé</div>
                  )}
                </div>
              );
            })}
            {smFiltres.length===0&&(
              <div style={{gridColumn:"1/-1",textAlign:"center",padding:30,color:C.tx2,fontSize:13}}>
                Aucun sous-module dans ce filtre pour ce module.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// ── FINANCEMENTS & RESTAURATION FORESTIÈRE ─────────────────────

const STATUT_REG = {
  BROUILLON:                   {label:"Brouillon",               color:"#6B7280", bg:"#F3F4F6"},
  ANNONCE_EN_ATTENTE_DE_TEXTE: {label:"Annoncé – texte attendu", color:"#92400E", bg:"#FEF3C7"},
  OUVERT:                      {label:"Ouvert",                  color:"#065F46", bg:"#D1FAE5"},
  SUSPENDU:                    {label:"Suspendu",                color:"#B45309", bg:"#FEF3C7"},
  FERME:                       {label:"Fermé",                   color:"#991B1B", bg:"#FEE2E2"},
  REMPLACE:                    {label:"Remplacé",                color:"#5B21B6", bg:"#EDE9FE"},
  EXPIRE:                      {label:"Expiré",                  color:"#374151", bg:"#E5E7EB"},
};

const FUNDING_PROGRAMS = [
  {
    id:"fff2100",
    nom:"France Forêt 2100",
    acronyme:"FFF2100",
    type:"Plateforme de mise en relation",
    organisme:"Start-up d'État — pilotage Gouvernement",
    origine:"État",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:null,
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Collectivités","Gestionnaires","Établissements publics","Porteurs de projets"],
    operationsEligibles:["Restauration de massifs","Renouvellement","Adaptation climatique","Projets carbone/biodiversité"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Connecteur désactivé — aucune API officielle publiée. Intermédiaire de financement, pas un guichet de subvention ouvert.",
    couleur:"#1E5B3A", bg:"#D1FAE5",
    icon:"🌳",
    fonctions:[
      "Dépôt d'un projet forestier",
      "Recherche de financeurs publics et privés",
      "Mise en relation",
      "Suivi des manifestations d'intérêt",
      "Construction d'un plan de financement combiné",
    ],
  },
  {
    id:"fonds-vert-foret-2027",
    nom:"Fonds vert – Adaptation des forêts",
    acronyme:"FV-FORET",
    type:"Subvention",
    organisme:"Ministère de la Transition écologique",
    origine:"État – Fonds vert (1 Md€ total)",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"Budget 2027",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Collectivités","Propriétaires","Gestionnaires","Établissements publics"],
    operationsEligibles:["Restauration de massifs incendiés","Adaptation climatique","Résilience forestière","Zones tampons","Prévention incendie","Réduction de la vulnérabilité"],
    tauxMin:null, tauxMax:null, plafond:null,
    montantNational:"100 000 000 €",
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Taux, plafonds et procédures non encore publiés. Budget 2027 à voter.",
    couleur:"#0369A1", bg:"#DBEAFE",
    icon:"💧",
    fonctions:[
      "Restauration massifs incendiés",
      "Renouvellement peuplements dépérissants",
      "Création zones tampons",
      "Prévention des incendies",
    ],
  },
  {
    id:"renouvellement-foret-2027",
    nom:"Renouvellement forestier 2027",
    acronyme:"RF2027",
    type:"Aide au renouvellement",
    organisme:"À préciser",
    origine:"État",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"À partir de 2027",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Gestionnaires"],
    operationsEligibles:["Parcelles touchées nématode du pin","Peuplements ≥ 40 % dépérissement","Renouvellement","Enrichissement","Régénération naturelle","Plantation"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Seuil de 40 % de dépérissement annoncé. Règles non bloquantes jusqu'à publication des textes d'application.",
    couleur:"#7C3AED", bg:"#EDE9FE",
    icon:"🌱",
    fonctions:[
      "Nématode du pin – éligibilité des parcelles touchées",
      "Dépérissement ≥ 40 % – ciblage des peuplements",
      "Renouvellement et enrichissement",
      "Régénération naturelle assistée",
    ],
  },
  {
    id:"label-bas-carbone",
    nom:"Label bas-carbone forestier",
    acronyme:"LBC",
    type:"Financement carbone privé",
    organisme:"Ministère chargé de l'Écologie",
    origine:"Financeurs privés – marché carbone volontaire",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"Avant fin 2026",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Gestionnaires","Porteurs de projets"],
    operationsEligibles:["Boisement","Reconstitution","Enrichissement","Régénération","Stockage carbone","Suivi peuplements vulnérables"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026 — Nouvelle méthode annoncée",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Nouvelle méthode permettant de financer l'enrichissement des peuplements vulnérables. Cahier des charges non encore publié.",
    couleur:"#065F46", bg:"#CCFBF1",
    icon:"🌿",
    fonctions:[
      "Unités carbone générées et vérifiées",
      "Financement par entreprises privées",
      "Suivi pluriannuel des peuplements",
      "Certification et contrôle tiers",
    ],
  },
  {
    id:"credits-biodiversite",
    nom:"Crédits biodiversité",
    acronyme:"CB",
    type:"Financement services écosystémiques",
    organisme:"À préciser",
    origine:"État – financeurs privés",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:null,
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires","Collectivités","Porteurs de projets"],
    operationsEligibles:["Services écosystémiques","Habitats forestiers","Conservation","Restauration biodiversité"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Calendrier non précisé. Structure générique à paramétrer à l'ouverture du dispositif.",
    couleur:"#92400E", bg:"#FEF3C7",
    icon:"🦋",
    fonctions:[
      "Services écosystémiques forestiers",
      "Habitats et indicateurs de biodiversité",
      "Engagements de conservation",
      "Contrôles et résultats pluriannuels",
    ],
  },
];

const WORKFLOW_FIN_STEPS = [
  {n:1,  label:"Projet identifié",              icon:"🔍", desc:"Identification de la parcelle et du besoin de restauration ou de renouvellement."},
  {n:2,  label:"Parcelle enregistrée",          icon:"📍", desc:"Enregistrement dans APPLITAG avec références cadastrales et coordonnées GPS."},
  {n:3,  label:"Diagnostic forestier",          icon:"🌲", desc:"Diagnostic sanitaire : essence, âge, dépérissement, nématode, risques climatiques, photos géolocalisées."},
  {n:4,  label:"Recherche des dispositifs",     icon:"🔎", desc:"Interrogation du moteur de règles pour identifier les programmes potentiellement compatibles."},
  {n:5,  label:"Pré-éligibilité",               icon:"✅", desc:"Vérification automatique des critères d'éligibilité principaux (localisation, bénéficiaire, surface, seuils)."},
  {n:6,  label:"Sélection du dispositif",       icon:"🎯", desc:"Choix du ou des programmes retenus par le porteur de projet."},
  {n:7,  label:"Construction du budget",        icon:"🧮", desc:"Saisie des postes de coûts, devis, essences, surfaces. Indicateur prévisionnel : 5 000 à 10 000 €/ha."},
  {n:8,  label:"Plan de financement",           icon:"💶", desc:"Répartition entre financeurs, calcul du reste à charge, simulation de scénarios."},
  {n:9,  label:"Collecte des pièces",           icon:"📎", desc:"Rassemblement des justificatifs requis : titre de propriété, cadastre, DGD, diagnostic, devis, RIB…"},
  {n:10, label:"Contrôle de complétude",        icon:"🔄", desc:"Vérification automatique des pièces obligatoires et signalement des manquantes."},
  {n:11, label:"Validation interne",            icon:"👁️", desc:"Contrôle par le gestionnaire forestier avant dépôt."},
  {n:12, label:"Dépôt",                         icon:"📤", desc:"Transmission du dossier à l'organisme instructeur."},
  {n:13, label:"Instruction",                   icon:"⚖️", desc:"Examen du dossier par l'instructeur. Délai en attente."},
  {n:14, label:"Demande de complément",         icon:"📬", desc:"L'instructeur demande des pièces supplémentaires ou des précisions."},
  {n:15, label:"Accord ou refus",               icon:"🏛️", desc:"Décision de l'organisme financeur. Montant accordé enregistré."},
  {n:16, label:"Autorisation de commencer",     icon:"🚦", desc:"L'autorisation de démarrer les travaux est reçue. Blocage si travaux prématurés."},
  {n:17, label:"Réalisation des travaux",       icon:"🪓", desc:"Exécution : plantation, régénération, sécurisation, préparation du sol, protection…"},
  {n:18, label:"Collecte des preuves",          icon:"📸", desc:"Photos géolocalisées avant/pendant/après, bons de livraison plants, fiches chantier."},
  {n:19, label:"Demande acompte/solde",         icon:"📄", desc:"Constitution de la demande de paiement avec dépenses présentées et justificatifs."},
  {n:20, label:"Contrôle",                      icon:"🔍", desc:"Contrôle par le financeur ou un contrôleur mandaté. Accès limité au dossier autorisé."},
  {n:21, label:"Paiement",                      icon:"💳", desc:"Versement de l'acompte ou du solde. Date et montant enregistrés dans le journal."},
  {n:22, label:"Suivi pluriannuel",             icon:"📅", desc:"Suivi de reprise, contrôle carbone ou biodiversité, obligations de conservation."},
  {n:23, label:"Clôture",                       icon:"✅", desc:"Validation de la bonne fin du projet par toutes les parties."},
  {n:24, label:"Archivage réglementaire",       icon:"🗄️", desc:"Conservation sécurisée des documents pendant la durée réglementaire. Journal d'audit non modifiable."},
];

const DEMO_DOSSIER = {
  id:"DOS-2026-001",
  programme:"France Forêt 2100 + Fonds vert",
  proprietaire:"M. Henri Bernard",
  parcelle:"Forêt de Tronçais — 12 ha — Allier (03)",
  surface:12,
  dateCreation:"22 juillet 2026",
  statut:"DIAGNOSTIC EN COURS",
  stepCurrent:3,
  montantDemande:96000,
  tauxDepVt:null,
  piecesManquantes:["Titre de propriété","Document de gestion durable","Devis entreprise"],
  piecesOk:["Diagnostic parcellaire (provisoire)","Références cadastrales","RIB"],
  alertes:[
    {type:"warning", msg:"Document de gestion durable manquant — obligatoire pour tous les programmes."},
    {type:"info",    msg:"Les programmes sélectionnés sont au statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Aucune demande de subvention déposable à ce jour."},
    {type:"info",    msg:"Indicateur prévisionnel : 5 000–10 000 €/ha, soit 60 000–120 000 € pour 12 ha. Modifiable."},
  ],
};

const CONTROLES_AUTO = [
  {statut:"ok",      msg:"Bénéficiaire identifié : propriétaire forestier privé — compatible tous programmes."},
  {statut:"ok",      msg:"Localisation : Forêt de Tronçais, Allier (03) — territoire national éligible."},
  {statut:"ok",      msg:"Surface : 12 ha — au-dessus du seuil minimal présumé."},
  {statut:"warning", msg:"Taux de dépérissement : non encore mesuré. Requis pour RF2027 (seuil 40 %)."},
  {statut:"warning", msg:"Nématode du pin : statut non vérifié sur cette parcelle."},
  {statut:"error",   msg:"Travaux non démarrés — autorisation préalable requise avant tout commencement (règle bloquante)."},
  {statut:"ok",      msg:"Aucun dépassement budgétaire détecté."},
  {statut:"warning", msg:"Document de gestion durable (DGD) absent — pièce obligatoire."},
  {statut:"info",    msg:"Règles réglementaires : statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Contrôles non bloquants jusqu'à publication des textes."},
];

const VEILLE_REG = [
  {
    date:"21 juillet 2026", type:"annonce", statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    titre:"Communiqué gouvernemental — Réunion Barbut / Lefèvre",
    programme:"Tous dispositifs forêt",
    contenu:"Annonce de France Forêt 2100, Fonds vert (100 M€), Renouvellement forestier, Label bas-carbone nouvelle méthode, Crédits biodiversité. Textes budgétaires et réglementaires à venir.",
    impact:"APPLITAG enregistre les 5 dispositifs en statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Aucun dossier ne peut être déposé.",
    icon:"📢", color:"#92400E", bg:"#FEF3C7",
  },
  {
    date:"21 juillet 2026", type:"info", statut:"info",
    titre:"Coût de restauration : indicateur prévisionnel",
    programme:"Tous dispositifs",
    contenu:"Le Gouvernement évalue le coût moyen de restauration entre 5 000 et 10 000 €/ha. Cet indicateur est intégré dans APPLITAG comme valeur modifiable, non comme barème réglementaire.",
    impact:"Indicateur prévisionnel disponible dans le module Budget. Modifiable par l'utilisateur.",
    icon:"📊", color:"#0369A1", bg:"#DBEAFE",
  },
  {
    date:"21 juillet 2026", type:"calendrier", statut:"info",
    titre:"Point d'étape gouvernemental prévu",
    programme:"Tous dispositifs",
    contenu:"Présentation des premiers engagements et résultats attendue en septembre 2026.",
    impact:"Surveillance programmée — mise à jour des dispositifs prévue à réception.",
    icon:"📅", color:"#065F46", bg:"#D1FAE5",
  },
];

/* Versionnement réglementaire — Aide au renouvellement forestier
   Décret 2025-05-02 annulé CE 15/07/2026 · Arrêté d'application survivant */
const RENOUVELLEMENT_VERSIONS = [
  {
    version:"v0.0",
    label:"Avant-décret",
    dateDebut:"2020",
    dateFin:"2025-04-30",
    statut:"EXPIRE",
    texte:"Régime antérieur — PSG / CBPS comme condition d'éligibilité",
    urlTexte:null,
    dateConsult:null,
    versionCahier:null,
    piecesCles:["PSG ou CBPS","Plan de reboisement","Devis travaux","Relevé parcellaire"],
    reservesJur:[],
    notes:"Régime de référence avant la réforme 2025.",
  },
  {
    version:"v1.0",
    label:"Décret du 2 mai 2025",
    dateDebut:"2025-05-02",
    dateFin:"2026-07-15",
    statut:"ANNULE",
    texte:"Décret n° 2025-XXX du 2 mai 2025 — annulé par le Conseil d'État le 15 juillet 2026",
    urlTexte:null,
    dateConsult:"Non réalisée — motif d'annulation",
    versionCahier:"v1.0 (2025)",
    piecesCles:["Plan de reboisement adapté au climat","Diagnostic sylvicole","Engagement de suivi 10 ans","Devis entrepreneur agréé"],
    reservesJur:[
      "Décret annulé CE 15/07/2026 faute de consultation préalable du public (art. L123-19-1 CE)",
      "L'arrêté d'application n'a pas été annulé — recours jugé tardif",
      "Les dossiers acceptés sous ce régime ne sont pas automatiquement annulés",
      "Ne pas utiliser les critères d'éligibilité de ce décret comme cadre définitif",
    ],
    notes:"ATTENTION — Ce texte a été annulé. L'arrêté d'application subsiste mais son champ d'application autonome est incertain.",
  },
  {
    version:"v1.1",
    label:"Arrêté d'application (survivant)",
    dateDebut:"2026-07-15",
    dateFin:null,
    statut:"SUSPENDU",
    texte:"Arrêté d'application du 2 mai 2025 — non annulé (recours tardif)",
    urlTexte:null,
    dateConsult:null,
    versionCahier:"v1.0 (2025) — portée à confirmer",
    piecesCles:["À confirmer par le ministère"],
    reservesJur:[
      "Portée autonome de l'arrêté sans son décret-support incertaine — avis juridique recommandé",
      "Guichet classé SUSPENDU par le ministère de l'Agriculture",
      "Aucun dépôt conseillé avant clarification officielle",
    ],
    notes:"Situation intermédiaire au 22/07/2026. En attente d'un nouveau décret de base ou d'une clarification ministérielle.",
  },
  {
    version:"v2.0",
    label:"Nouveau cadre (attendu)",
    dateDebut:null,
    dateFin:null,
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    texte:"Nouveau décret à venir — annonce SNBC 3 / Plan forêt 2026",
    urlTexte:null,
    dateConsult:"À prévoir — consultation publique obligatoire",
    versionCahier:"À publier",
    piecesCles:["À définir par le nouveau texte"],
    reservesJur:[
      "Aucune règle d'éligibilité du régime annulé ne doit être appliquée par anticipation",
      "Objectif SNBC 3 : renouveler 10 % des forêts françaises d'ici 2032",
      "Zones prioritaires : dépérissantes et DFCI",
    ],
    notes:"APPLITAG est techniquement prêt. Aucun moteur d'éligibilité définitif ne sera activé avant la parution du nouveau cadre.",
  },
];

const STATUT_VERSION_COLORS = {
  EXPIRE:                      {color:"#374151",bg:"#E5E7EB",label:"Expiré"},
  ANNULE:                      {color:"#991B1B",bg:"#FEE2E2",label:"Annulé CE"},
  SUSPENDU:                    {color:"#B45309",bg:"#FEF3C7",label:"Suspendu"},
  ANNONCE_EN_ATTENTE_DE_TEXTE: {color:"#92400E",bg:"#FEF9C3",label:"Attendu"},
  OUVERT:                      {color:"#065F46",bg:"#D1FAE5",label:"Ouvert"},
};

export const SectionFinancements = () => {
  const [tab, setTab] = useState("dashboard");
  const [selProg, setSelProg] = useState(null);
  const [wfStep, setWfStep] = useState(3);
  const [selVersion, setSelVersion] = useState("v1.1");
  // Champs dossier versionnés
  const [dossDispo,      setDossDispo]      = useState("Aide au renouvellement des forêts");
  const [dossTexte,      setDossTexte]      = useState("");
  const [dossDateConsult,setDossDateConsult]= useState("");
  const [dossVersionCah, setDossVersionCah] = useState("");
  const [dossDateDepot,  setDossDateDepot]  = useState("");
  const [dossPieces,     setDossPieces]     = useState("");
  const [dossDecision,   setDossDecision]   = useState("");
  const [dossReserves,   setDossReserves]   = useState("");

  const prog = selProg ? FUNDING_PROGRAMS.find(p=>p.id===selProg) : null;

  const TABS = [
    {id:"dashboard",   label:"Tableau de bord", icon:"📊"},
    {id:"programmes",  label:"Programmes",       icon:"📋"},
    {id:"dossiers",    label:"Dossiers",          icon:"📂"},
    {id:"workflow",    label:"Workflow",          icon:"🔄"},
    {id:"veille",           label:"Veille réglementaire",  icon:"⚖️"},
    {id:"renouvellement",   label:"Renouvellement forestier", icon:"🌲"},
  ];

  const SR = (s) => STATUT_REG[s] || STATUT_REG.BROUILLON;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* Header */}
      <div style={{marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,
            background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:20,
            padding:"3px 12px",fontSize:10,fontWeight:800,color:"#92400E",marginBottom:8}}>
            📢 ANNONCE GOUVERNEMENTALE — 21 juillet 2026
          </div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            💶 Financements & Restauration forestière
          </div>
          <div style={{fontSize:12,color:C.tx2}}>
            5 dispositifs enregistrés · Statut : <span style={{fontWeight:700,color:"#92400E"}}>ANNONCÉ – textes attendus</span> · Aucun dossier déposable à ce jour
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
          {[["1 Md€","Fonds vert total"],["100 M€","Forêt (annoncé)"],["5–10k€/ha","Coût prévisionnel"]].map(([v,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:8,
              background:"#fff",border:`1px solid ${C.bd}`,borderRadius:10,
              padding:"5px 12px",fontSize:11}}>
              <span style={{fontWeight:800,color:"#0369A1"}}>{v}</span>
              <span style={{color:C.tx2}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerte ANNONCÉ */}
      <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:10,
        padding:"10px 16px",marginBottom:16,fontSize:12,color:"#92400E",
        display:"flex",alignItems:"flex-start",gap:10}}>
        <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
        <div>
          <strong>Principe réglementaire APPLITAG :</strong> Aucun taux, plafond ou règle réglementaire n'est inscrit définitivement dans l'application.
          Toutes les règles sont paramétrables, datées, versionnées et rattachées à un texte officiel.
          Les dispositifs du 21 juillet 2026 sont au statut <strong>ANNONCÉ_EN_ATTENTE_DE_TEXTE</strong> — ils seront mis à jour à la publication des décrets et cahiers des charges.
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 14px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:`2px solid ${tab===t.id?"#0369A1":C.bd}`,
              background:tab===t.id?"#0369A1":"#fff",color:tab===t.id?"#fff":C.tx2}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── TABLEAU DE BORD ── */}
      {tab==="dashboard"&&(()=>{
        const alertCount = DEMO_DOSSIER.alertes.length;
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[
                {icon:"📋",label:"Programmes enregistrés",val:"5",sub:"Tous ANNONCÉ",col:"#0369A1",bg:"#DBEAFE"},
                {icon:"📂",label:"Dossiers en cours",val:"1",sub:"Diagnostic phase",col:"#1E5B3A",bg:"#D1FAE5"},
                {icon:"⚠️",label:"Alertes actives",val:String(alertCount),sub:"dont 1 bloquant",col:"#92400E",bg:"#FEF3C7"},
                {icon:"💶",label:"Investissement prév.",val:"96 k€",sub:"Indicateur 12 ha",col:"#065F46",bg:"#CCFBF1"},
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
                  <div style={{fontSize:22,marginBottom:6}}>{k.icon}</div>
                  <div style={{fontSize:22,fontWeight:900,color:k.col}}>{k.val}</div>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx,marginBottom:2}}>{k.label}</div>
                  <div style={{fontSize:10,color:C.tx2}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Contrôles automatiques */}
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>🤖 Moteur de contrôles automatiques — Dossier DOS-2026-001</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {CONTROLES_AUTO.map((c,i)=>{
                  const cfg = c.statut==="ok"
                    ? {icon:"✅",col:"#065F46",bg:"#F0FDF4"}
                    : c.statut==="warning"
                    ? {icon:"⚠️",col:"#92400E",bg:"#FFFBEB"}
                    : c.statut==="error"
                    ? {icon:"🔴",col:"#991B1B",bg:"#FEF2F2"}
                    : {icon:"ℹ️",col:"#0369A1",bg:"#EFF6FF"};
                  return (
                    <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                      padding:"8px 12px",borderRadius:8,background:cfg.bg,
                      border:`1px solid ${cfg.col}22`}}>
                      <span style={{flexShrink:0,fontSize:13}}>{cfg.icon}</span>
                      <span style={{fontSize:11,color:cfg.col,fontWeight:c.statut==="error"?700:400}}>{c.msg}</span>
                      <span style={{marginLeft:"auto",fontSize:9,color:C.tx2,flexShrink:0,
                        background:"#fff",padding:"1px 6px",borderRadius:10,border:`1px solid ${C.bd}`}}>
                        {c.statut==="ok"?"OK":c.statut==="error"?"BLOQUANT":c.statut==="warning"?"AVERTISSEMENT":"INFO"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertes dossier */}
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>🔔 Alertes — DOS-2026-001</div>
              {DEMO_DOSSIER.alertes.map((a,i)=>{
                const cfg = a.type==="warning"
                  ? {col:"#92400E",bg:"#FFFBEB",icon:"⚠️"}
                  : {col:"#0369A1",bg:"#EFF6FF",icon:"ℹ️"};
                return (
                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",
                    padding:"9px 12px",borderRadius:8,background:cfg.bg,
                    border:`1px solid ${cfg.col}22`,marginBottom:6}}>
                    <span style={{flexShrink:0}}>{cfg.icon}</span>
                    <span style={{fontSize:12,color:cfg.col}}>{a.msg}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── PROGRAMMES ── */}
      {tab==="programmes"&&(
        <div style={{display:"grid",gridTemplateColumns:selProg?"1fr 380px":"1fr",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {FUNDING_PROGRAMS.map(p=>{
              const sr = SR(p.statut);
              const isActive = selProg===p.id;
              return (
                <div key={p.id} onClick={()=>setSelProg(isActive?null:p.id)}
                  style={{background:"#fff",borderRadius:12,border:`2px solid ${isActive?p.couleur:C.bd}`,
                    padding:16,cursor:"pointer",boxShadow:isActive?`0 0 0 3px ${p.bg}`:"none",
                    transition:"all .2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                    <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1}}>
                      <span style={{fontSize:28,flexShrink:0}}>{p.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                          <span style={{fontSize:14,fontWeight:800,color:isActive?p.couleur:C.tx}}>{p.nom}</span>
                          <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,
                            background:sr.bg,color:sr.color}}>{sr.label}</span>
                          <span style={{fontSize:9,color:C.tx2,background:"#F3F4F6",
                            padding:"2px 6px",borderRadius:6}}>{p.acronyme}</span>
                        </div>
                        <div style={{fontSize:11,color:C.tx2,marginBottom:6}}>{p.type} · {p.organisme}</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {p.operationsEligibles.slice(0,3).map((o,i)=>(
                            <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:20,
                              background:p.bg,color:p.couleur,fontWeight:600}}>{o}</span>
                          ))}
                          {p.operationsEligibles.length>3&&(
                            <span style={{fontSize:10,color:C.tx2}}>+{p.operationsEligibles.length-3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,color:C.tx2}}>Annoncé le</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{p.dateAnnonce}</div>
                      <div style={{fontSize:10,color:C.tx2,marginTop:4}}>Ouverture</div>
                      <div style={{fontSize:11,fontWeight:700,color:p.dateOuverture?"#0369A1":"#9CA3AF"}}>
                        {p.dateOuverture||"Non précisée"}
                      </div>
                    </div>
                  </div>
                  {isActive&&(
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${p.couleur}22`}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:6,textTransform:"uppercase"}}>Fonctions prévues</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                        {p.fonctions.map((f,i)=>(
                          <span key={i} style={{fontSize:11,padding:"4px 10px",borderRadius:7,
                            background:p.bg,color:p.couleur,fontWeight:500,
                            border:`1px solid ${p.couleur}33`}}>🔹 {f}</span>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:"#92400E",background:"#FEF3C7",
                        border:"1px solid #F59E0B",borderRadius:8,padding:"8px 12px"}}>
                        ⚠️ {p.notes}
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                        <div style={{fontSize:10,color:C.tx2}}>Texte de référence :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.texteRef}</div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:4}}>
                        <div style={{fontSize:10,color:C.tx2}}>Version :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.version}</div>
                        <div style={{fontSize:10,color:C.tx2,marginLeft:12}}>Vérif. :</div>
                        <div style={{fontSize:10,color:C.tx,fontWeight:600}}>{p.derniereVerif}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selProg&&prog&&(
            <div style={{position:"sticky",top:0}}>
              <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
                <div style={{background:prog.bg,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                  <div style={{fontSize:24,marginBottom:4}}>{prog.icon}</div>
                  <div style={{fontSize:15,fontWeight:900,color:prog.couleur}}>{prog.nom}</div>
                  <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{prog.type}</div>
                </div>

                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Bénéficiaires</div>
                {prog.beneficiaires.map((b,i)=>(
                  <div key={i} style={{fontSize:11,color:C.tx,padding:"3px 0",
                    borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:prog.couleur}}>•</span>{b}
                  </div>
                ))}

                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginTop:12,marginBottom:8}}>Opérations éligibles</div>
                {prog.operationsEligibles.map((o,i)=>(
                  <div key={i} style={{fontSize:11,color:C.tx,padding:"3px 0",
                    borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{color:prog.couleur}}>✓</span>{o}
                  </div>
                ))}

                <div style={{marginTop:14,padding:"10px 12px",borderRadius:8,
                  background:"#F9FAFB",border:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Paramétrage réglementaire</div>
                  {[
                    ["Taux min/max","Non publié"],
                    ["Plafond","Non publié"],
                    ["Montant national",prog.montantNational||"Non publié"],
                    ["URL officielle","Connecteur désactivé"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",
                      fontSize:10,padding:"3px 0",borderBottom:`1px solid ${C.bd}`}}>
                      <span style={{color:C.tx2}}>{k}</span>
                      <span style={{fontWeight:700,color:v==="Non publié"?"#9CA3AF":C.tx}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOSSIERS ── */}
      {tab==="dossiers"&&(
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
          {/* Liste dossiers */}
          <div>
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:12,marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:10}}>Dossiers actifs</div>
              <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
                border:"2px solid #0369A1",cursor:"pointer"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#0369A1",marginBottom:4}}>{DEMO_DOSSIER.id}</div>
                <div style={{fontSize:11,color:C.tx,marginBottom:3}}>{DEMO_DOSSIER.proprietaire}</div>
                <div style={{fontSize:10,color:C.tx2,marginBottom:6}}>{DEMO_DOSSIER.parcelle}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,fontWeight:700,color:"#0369A1",
                    background:"#DBEAFE",padding:"2px 8px",borderRadius:10}}>
                    {DEMO_DOSSIER.statut}
                  </span>
                  <span style={{fontSize:10,fontWeight:700,color:"#1E5B3A"}}>
                    {DEMO_DOSSIER.montantDemande.toLocaleString("fr-FR")} €
                  </span>
                </div>
              </div>
            </div>
            {/* Pièces */}
            <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:14}}>
              <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:10}}>📎 Pièces justificatives</div>
              <div style={{fontSize:10,fontWeight:700,color:"#065F46",marginBottom:6}}>Fournies</div>
              {DEMO_DOSSIER.piecesOk.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                  fontSize:11,color:"#065F46",padding:"3px 0"}}>
                  <span>✅</span>{p}
                </div>
              ))}
              <div style={{fontSize:10,fontWeight:700,color:"#991B1B",marginTop:10,marginBottom:6}}>Manquantes</div>
              {DEMO_DOSSIER.piecesManquantes.map((p,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                  fontSize:11,color:"#991B1B",padding:"3px 0"}}>
                  <span>❌</span>{p}
                </div>
              ))}
            </div>
          </div>

          {/* Détail dossier */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
              <div style={{fontSize:14,fontWeight:900,color:C.tx,marginBottom:4}}>
                📂 {DEMO_DOSSIER.id} — {DEMO_DOSSIER.proprietaire}
              </div>
              <div style={{fontSize:12,color:C.tx2,marginBottom:12}}>{DEMO_DOSSIER.parcelle} · {DEMO_DOSSIER.surface} ha</div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[
                  ["Programme","France Forêt 2100 + Fonds vert"],
                  ["Créé le",DEMO_DOSSIER.dateCreation],
                  ["Investissement prévi.",`${DEMO_DOSSIER.montantDemande.toLocaleString("fr-FR")} € (indicateur)`],
                  ["Étape en cours",`${DEMO_DOSSIER.stepCurrent}/24 — Diagnostic forestier`],
                ].map(([k,v])=>(
                  <div key={k} style={{padding:"8px 12px",borderRadius:8,background:"#F9FAFB",
                    border:`1px solid ${C.bd}`}}>
                    <div style={{fontSize:10,color:C.tx2,marginBottom:2}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Budget prévisionnel */}
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Budget prévisionnel par poste (indicateur 5 000–10 000 €/ha)</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {[
                  ["Diagnostic & maîtrise d'œuvre","8 400 €",8.75],
                  ["Préparation du sol","12 000 €",12.5],
                  ["Plants & plantation","36 000 €",37.5],
                  ["Protection & entretien","18 000 €",18.75],
                  ["Sécurisation & accès","9 600 €",10],
                  ["Suivi & certification","12 000 €",12.5],
                ].map(([p,v,pct])=>(
                  <div key={p} style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:10,color:C.tx2,width:160,flexShrink:0}}>{p}</div>
                    <div style={{flex:1,height:14,borderRadius:4,background:"#E5E7EB",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:"#0369A1",width:`${pct}%`}}/>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:"#0369A1",width:64,textAlign:"right",flexShrink:0}}>{v}</div>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:800,
                  borderTop:`2px solid ${C.bd}`,paddingTop:6,marginTop:4}}>
                  <span style={{color:C.tx}}>Total indicatif</span>
                  <span style={{color:"#0369A1"}}>96 000 €</span>
                </div>
              </div>

              <div style={{marginTop:10,fontSize:10,color:"#92400E",
                background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:6,padding:"6px 10px"}}>
                ⚠️ Ces montants sont des indicateurs prévisionnels modifiables. Aucun taux réglementaire confirmé à ce stade.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WORKFLOW ── */}
      {tab==="workflow"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:14,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              🔄 Workflow — 24 étapes — DOS-2026-001 (étape {wfStep}/24)
            </div>
            {/* Mini stepper horizontal */}
            <div style={{display:"flex",overflowX:"auto",gap:2,paddingBottom:8}}>
              {WORKFLOW_FIN_STEPS.map((s,_i)=>(
                <div key={s.n} onClick={()=>setWfStep(s.n)}
                  style={{flexShrink:0,width:32,height:32,borderRadius:"50%",cursor:"pointer",
                    background:s.n<wfStep?"#1E5B3A":s.n===wfStep?"#0369A1":"#E5E7EB",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:s.n===wfStep?13:10,color:s.n<=wfStep?"#fff":"#9CA3AF",
                    fontWeight:700,transition:"all .2s",
                    boxShadow:s.n===wfStep?"0 0 0 3px #BFDBFE":undefined}}>
                  {s.n<wfStep?"✓":s.n===wfStep?s.icon:s.n}
                </div>
              ))}
            </div>
          </div>

          {/* Étape courante */}
          {(()=>{
            const cur = WORKFLOW_FIN_STEPS[wfStep-1];
            const isDone = wfStep > DEMO_DOSSIER.stepCurrent;
            const isCur = wfStep === DEMO_DOSSIER.stepCurrent;
            return (
              <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
                  <div style={{background:isCur?"#EFF6FF":isDone?"#F0FDF4":"#F9FAFB",
                    borderBottom:`1px solid ${isCur?"#93C5FD":isDone?"#86EFAC":C.bd}`,
                    padding:"14px 18px",display:"flex",gap:14,alignItems:"center"}}>
                    <div style={{width:48,height:48,borderRadius:12,
                      background:isCur?"#0369A1":isDone?"#1E5B3A":"#E5E7EB",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:22,flexShrink:0}}>
                      {cur.icon}
                    </div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:16,fontWeight:900,color:isCur?"#0369A1":isDone?"#1E5B3A":C.tx2}}>
                          Étape {cur.n} — {cur.label}
                        </span>
                        <span style={{fontSize:9,padding:"2px 8px",borderRadius:10,fontWeight:700,
                          background:isCur?"#DBEAFE":isDone?"#D1FAE5":"#E5E7EB",
                          color:isCur?"#0369A1":isDone?"#065F46":"#6B7280"}}>
                          {isCur?"EN COURS":isDone?"À VENIR":"COMPLÉTÉ"}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:C.tx2,marginTop:3}}>DOS-2026-001 · {DEMO_DOSSIER.proprietaire}</div>
                    </div>
                  </div>
                  <div style={{padding:"16px 18px"}}>
                    <div style={{fontSize:13,color:C.tx,lineHeight:1.7,marginBottom:14}}>{cur.desc}</div>
                    {isCur&&(
                      <div style={{background:"#EFF6FF",border:"1px solid #93C5FD",borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:"#0369A1"}}>
                        📌 Cette étape est actuellement en cours pour le dossier DOS-2026-001. Toute action est datée et inscrite dans le journal d'audit.
                      </div>
                    )}
                    {!isCur&&!isDone&&(
                      <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:"#065F46"}}>
                        ✅ Étape complétée — inscrite dans le journal d'audit non modifiable.
                      </div>
                    )}
                    {isDone&&(
                      <div style={{background:"#F9FAFB",border:`1px solid ${C.bd}`,borderRadius:8,
                        padding:"10px 14px",fontSize:11,color:C.tx2}}>
                        🔒 Étape non encore atteinte. Accessible après validation des étapes précédentes.
                      </div>
                    )}
                  </div>
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"10px 18px",
                    display:"flex",justifyContent:"space-between"}}>
                    <button onClick={()=>setWfStep(s=>Math.max(1,s-1))} disabled={wfStep===1}
                      style={{padding:"7px 16px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",
                        fontFamily:"inherit",border:`1px solid ${C.bd}`,background:"transparent",
                        color:wfStep===1?"#D1D5DB":C.tx2,opacity:wfStep===1?.4:1}}>
                      ← Précédent
                    </button>
                    <span style={{fontSize:11,color:C.tx2,alignSelf:"center"}}>{wfStep}/24</span>
                    <button onClick={()=>setWfStep(s=>Math.min(24,s+1))} disabled={wfStep===24}
                      style={{padding:"7px 16px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",
                        fontFamily:"inherit",border:"none",background:"#0369A1",color:"#fff",
                        opacity:wfStep===24?.4:1}}>
                      Suivant →
                    </button>
                  </div>
                </div>

                {/* Liste des étapes */}
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
                  padding:14,maxHeight:480,overflowY:"auto"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Toutes les étapes</div>
                  {WORKFLOW_FIN_STEPS.map(s=>{
                    const done = s.n < DEMO_DOSSIER.stepCurrent;
                    const cur2 = s.n === DEMO_DOSSIER.stepCurrent;
                    return (
                      <div key={s.n} onClick={()=>setWfStep(s.n)}
                        style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",
                          borderRadius:7,cursor:"pointer",marginBottom:2,
                          background:wfStep===s.n?"#EFF6FF":"transparent",
                          border:`1px solid ${wfStep===s.n?"#93C5FD":"transparent"}`}}>
                        <span style={{fontSize:11,flexShrink:0}}>{done?"✅":cur2?"🔵":"⬜"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <span style={{fontSize:10,color:done?"#065F46":cur2?"#0369A1":C.tx2,
                            fontWeight:cur2?700:400}}>
                            {s.n}. {s.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── VEILLE RÉGLEMENTAIRE ── */}
      {tab==="veille"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
            padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.tx}}>⚖️ Veille réglementaire — Financements forestiers</div>
            <div style={{fontSize:11,color:C.tx2}}>Dernière mise à jour : 21 juillet 2026</div>
          </div>

          {VEILLE_REG.map((v,i)=>(
            <div key={i} style={{background:"#fff",borderRadius:12,
              border:`1px solid ${v.color}33`,overflow:"hidden"}}>
              <div style={{background:v.bg,borderBottom:`1px solid ${v.color}22`,
                padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:24,flexShrink:0}}>{v.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                    <span style={{fontSize:13,fontWeight:800,color:v.color}}>{v.titre}</span>
                    {v.statut!=="info"&&(
                      <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,fontWeight:700,
                        background:SR(v.statut).bg,color:SR(v.statut).color}}>
                        {SR(v.statut).label}
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:C.tx2}}>📅 {v.date} · {v.programme}</div>
                </div>
              </div>
              <div style={{padding:"14px 16px"}}>
                <div style={{fontSize:12,color:C.tx,lineHeight:1.7,marginBottom:10}}>{v.contenu}</div>
                <div style={{background:"#F9FAFB",border:`1px solid ${C.bd}`,borderRadius:8,
                  padding:"8px 12px",fontSize:11,color:C.tx2}}>
                  <strong style={{color:v.color}}>Impact APPLITAG :</strong> {v.impact}
                </div>
              </div>
            </div>
          ))}

          {/* Statuts réglementaires */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              Statuts réglementaires APPLITAG
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
              {Object.entries(STATUT_REG).map(([k,v])=>(
                <div key={k} style={{padding:"8px 12px",borderRadius:8,
                  background:v.bg,border:`1px solid ${v.color}33`,
                  display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:v.color,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:9,fontWeight:800,color:v.color,fontFamily:"monospace"}}>{k}</div>
                    <div style={{fontSize:10,color:C.tx2}}>{v.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RENOUVELLEMENT FORESTIER ── */}
      {tab==="renouvellement"&&(()=>{
        const vSel = RENOUVELLEMENT_VERSIONS.find(v=>v.version===selVersion)
                     || RENOUVELLEMENT_VERSIONS[2];
        const sc   = STATUT_VERSION_COLORS[vSel.statut] || STATUT_VERSION_COLORS.SUSPENDU;
        const inputSt = {
          width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
          border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
          background:C.bg,color:C.tx,boxSizing:"border-box",
        };
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Bannière alerte juridique */}
            <div style={{background:"#FEE2E2",border:"2px solid #F87171",borderRadius:12,
              padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0}}>⚖️</span>
              <div>
                <div style={{fontSize:13,fontWeight:900,color:"#991B1B",marginBottom:4}}>
                  Guichet juridiquement fragilisé — Conseil d'État, 15 juillet 2026
                </div>
                <div style={{fontSize:12,color:"#991B1B",lineHeight:1.7}}>
                  Le décret du 2 mai 2025 encadrant l'aide au renouvellement des forêts privées
                  et des collectivités a été <strong>annulé</strong> faute de consultation préalable du public.
                  L'arrêté d'application subsiste (recours tardif), mais le guichet est classé
                  <strong> SUSPENDU</strong> par le ministère de l'Agriculture.
                  Un nouveau décret est attendu dans le cadre de la SNBC 3.
                </div>
                <div style={{marginTop:10,padding:"8px 12px",background:"#fff",borderRadius:8,
                  fontSize:11,color:"#7F1D1D",fontStyle:"italic",lineHeight:1.6,
                  border:"1px solid #FECACA"}}>
                  📋 <strong>Formulation recommandée dans vos propositions :</strong><br/>
                  « Projet techniquement préparé, sous réserve de l'ouverture du guichet et du cadre
                  réglementaire applicable à la date du dépôt. »
                </div>
              </div>
            </div>

            {/* Chronologie des versions */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
                📜 Historique réglementaire — Versionnement APPLITAG
              </div>
              <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:4}}>
                {RENOUVELLEMENT_VERSIONS.map((v,i)=>{
                  const sc2 = STATUT_VERSION_COLORS[v.statut]||STATUT_VERSION_COLORS.SUSPENDU;
                  const sel = selVersion===v.version;
                  return (
                    <div key={v.version} style={{display:"flex",alignItems:"stretch",flexShrink:0}}>
                      {i>0&&<div style={{width:32,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{width:24,height:2,background:C.bd}}/>
                      </div>}
                      <div onClick={()=>setSelVersion(v.version)} style={{
                        borderRadius:10,border:`2px solid ${sel?sc2.color:C.bd}`,
                        background:sel?sc2.bg:"#fff",padding:"10px 14px",cursor:"pointer",
                        minWidth:140,WebkitTapHighlightColor:"transparent"}}>
                        <div style={{fontSize:9,fontWeight:800,color:sc2.color,marginBottom:3,
                          background:sc2.bg,display:"inline-block",padding:"1px 6px",
                          borderRadius:8,border:`1px solid ${sc2.color}44`}}>
                          {sc2.label}
                        </div>
                        <div style={{fontSize:12,fontWeight:800,color:sel?sc2.color:C.tx,marginTop:4}}>
                          {v.version}
                        </div>
                        <div style={{fontSize:10,color:C.tx3,marginTop:2}}>{v.label}</div>
                        <div style={{fontSize:9,color:C.tx3,marginTop:2}}>
                          {v.dateDebut}{v.dateFin?` → ${v.dateFin}`:" → en cours"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fiche version sélectionnée */}
            <div style={{background:"#fff",borderRadius:12,border:`2px solid ${sc.color}44`,overflow:"hidden"}}>
              <div style={{background:sc.bg,padding:"12px 16px",borderBottom:`1px solid ${sc.color}22`,
                display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:sc.color}}>{vSel.label}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{vSel.texte}</div>
                </div>
                <span style={{fontSize:11,fontWeight:800,padding:"4px 12px",borderRadius:20,
                  background:sc.color,color:"#fff"}}>{sc.label}</span>
              </div>
              <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
                {vSel.reservesJur.length>0&&(
                  <div style={{background:"#FEF2F2",borderRadius:8,padding:"10px 12px",border:"1px solid #FECACA"}}>
                    <div style={{fontSize:11,fontWeight:800,color:"#991B1B",marginBottom:6}}>🚫 Réserves juridiques</div>
                    {vSel.reservesJur.map((r,i)=>(
                      <div key={i} style={{fontSize:11,color:"#7F1D1D",padding:"3px 0",
                        borderBottom:i<vSel.reservesJur.length-1?`1px solid #FECACA`:"none",lineHeight:1.6}}>
                        • {r}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:6}}>📋 Pièces exigées</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {vSel.piecesCles.map((p,i)=>(
                      <span key={i} style={{fontSize:10,padding:"4px 10px",borderRadius:20,
                        background:C.bg2,border:`1px solid ${C.bd}`,color:C.tx2}}>{p}</span>
                    ))}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["📅 Consultation publique","dateConsult"],["📄 Version cahier","versionCahier"]]
                    .filter(([,k])=>vSel[k])
                    .map(([lbl,k])=>(
                      <div key={k} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                        <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{vSel[k]}</div>
                      </div>
                  ))}
                </div>
                {vSel.notes&&(
                  <div style={{background:"#FFFBEB",borderRadius:8,padding:"8px 12px",
                    border:"1px solid #FCD34D",fontSize:11,color:"#78350F",lineHeight:1.6}}>
                    📝 {vSel.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Dossier — champs versionnés */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:4}}>📂 Suivi de dossier — champs versionnés</div>
              <div style={{fontSize:11,color:C.tx3,marginBottom:12}}>
                Rattaché à la version réglementaire {selVersion}.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["Dispositif",              dossDispo,      setDossDispo,      "Aide au renouvellement…"],
                  ["Texte applicable retenu", dossTexte,      setDossTexte,      "Décret / Arrêté…"],
                  ["Date consultation publie",dossDateConsult,setDossDateConsult,"JJ/MM/AAAA"],
                  ["Version cahier des charges",dossVersionCah,setDossVersionCah,"v1.0 — 2025…"],
                  ["Date de dépôt prévu",     dossDateDepot,  setDossDateDepot,  "JJ/MM/AAAA"],
                  ["Décision obtenue",        dossDecision,   setDossDecision,   "En attente / Accordé / Refusé…"],
                ].map(([lbl,val,set,ph])=>(
                  <div key={lbl}>
                    <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{lbl}</div>
                    <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={inputSt}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Pièces exigées (personnalisées)</div>
                <textarea value={dossPieces} onChange={e=>setDossPieces(e.target.value)}
                  rows={3} placeholder="Une pièce par ligne…" style={{...inputSt,resize:"vertical"}}/>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,fontWeight:700,color:"#991B1B",marginBottom:4}}>🚫 Réserves juridiques propres à ce dossier</div>
                <textarea value={dossReserves} onChange={e=>setDossReserves(e.target.value)}
                  rows={3} placeholder="Ex : dossier déposé sous décret v1.0 — statut à confirmer…"
                  style={{...inputSt,resize:"vertical",borderColor:"#FECACA"}}/>
              </div>
            </div>

            {/* Objectifs SNBC 3 */}
            <div style={{background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",borderRadius:12,
              padding:"14px",border:"1.5px solid #6EE7B7"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:10}}>🎯 Objectifs SNBC 3 — Ambition nationale</div>
              {[
                ["10 %","des forêts françaises à renouveler/adapter d'ici 2032","Zones dépérissantes et DFCI en priorité"],
                ["−39 MtCO₂e","Rôle d'absorption forêt-bois maintenu en 2030","Objectif puits de carbone SNBC 3"],
                ["2032","Échéance du plan de renouvellement","Objectif politique confirmé, guichet à sécuriser"],
              ].map(([val,lbl,det])=>(
                <div key={val} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",
                  borderRadius:8,background:"#fff",border:"1px solid #A7F3D0",marginBottom:6}}>
                  <div style={{fontSize:18,fontWeight:900,color:"#065F46",minWidth:100,flexShrink:0}}>{val}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                    <div style={{fontSize:10,color:C.tx3}}>{det}</div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:8,padding:"10px 12px",background:"#fff",borderRadius:8,
                border:"1px solid #A7F3D0",fontSize:11,color:"#065F46",lineHeight:1.6}}>
                🛠️ <strong>Statut APPLITAG :</strong> Module techniquement prêt.
                Aucun moteur d'éligibilité définitif ne sera activé avant la parution du nouveau cadre réglementaire.
              </div>
            </div>

            {/* Risques */}
            <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",border:"1.5px solid #FED7AA"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:10}}>⚠️ Risques à éviter</div>
              {[
                ["Promettre une subvention aujourd'hui indisponible",
                 "Le guichet est SUSPENDU. Ne pas indiquer un taux ou montant comme acquis."],
                ["Utiliser les critères du décret annulé",
                 "Le décret du 2 mai 2025 a été annulé. Ses critères ne font plus référence."],
                ["Engager des travaux avant décision attributive",
                 "Sans acte attributif valide, les dépenses engagées ne sont pas remboursables."],
                ["Conclure que les dossiers acceptés sont annulés",
                 "Le CE n'a pas annulé les décisions individuelles — analyser cas par cas."],
              ].map(([titre,detail])=>(
                <div key={titre} style={{display:"flex",gap:10,padding:"8px 0",
                  borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
                  <span style={{fontSize:14,flexShrink:0,marginTop:1}}>🚫</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{titre}</div>
                    <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{detail}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        );
      })()}
    </div>
  );
};

// ── CONFORMITÉ RED — DONNÉES & HELPERS ─────────────────────────
const STATUT_FOURN_RED = {
  valide:    {label:"Valide",     color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  expire:    {label:"Expiré",    color:"#991B1B", bg:"#FEE2E2", icon:"❌"},
  incomplet: {label:"Incomplet", color:"#92400E", bg:"#FEF3C7", icon:"⚠️"},
  a_auditer: {label:"À auditer", color:"#1E40AF", bg:"#DBEAFE", icon:"🔵"},
};

const PERIMETRE_RED_OPTS = [
  {id:"bois_forestier", label:"Bois forestier"},
  {id:"residus",        label:"Résidus forestiers"},
  {id:"connexes",       label:"Connexes de scierie"},
  {id:"dechets_bois",   label:"Déchets bois"},
  {id:"plaquettes",     label:"Plaquettes forestières"},
  {id:"bois_rond",      label:"Bois rond"},
];

const CHAINE_ETAPES = [
  {id:"lot_forestier",  label:"Lot forestier identifié",    icon:"🌲"},
  {id:"bord_route",     label:"Tas bord de route",           icon:"🪵"},
  {id:"broyage",        label:"Broyage / déchiquetage",      icon:"🌀"},
  {id:"entree_plat",    label:"Entrée plateforme",           icon:"🏗️"},
  {id:"stockage",       label:"Stockage",                    icon:"📦"},
  {id:"melange",        label:"Mélange éventuel",            icon:"🔀"},
  {id:"chargement",     label:"Chargement camion",           icon:"🚛"},
  {id:"transport",      label:"Transport",                   icon:"🛣️"},
  {id:"livraison",      label:"Livraison chaufferie",        icon:"🔥"},
  {id:"reception",      label:"Réception / pesée / humidité",icon:"⚖️"},
];

const DEMO_FOURNISSEURS_RED = [
  {id:"fr1", nom:"BOIS MASSIF AUVERGNE", siret:"123 456 789 00012",
   contact:"Jean-Paul Martin", tel:"06 12 34 56 78", email:"jp.martin@bma.fr",
   systeme:"sbp", numeroCertif:"SBP-COC-FR-2024-1892",
   organisme:"Bureau Veritas", dateAudit:"2024-03-15", dateExpiration:"2025-03-14",
   perimetre:["plaquettes","bois_forestier"], commune:"Riom", dep:"63",
   statut:"valide"},
  {id:"fr2", nom:"ETF FORÊT BOURBONNAIS", siret:"987 654 321 00098",
   contact:"Pierre Dubois", tel:"06 98 76 54 32", email:"p.dubois@efb.fr",
   systeme:"iscc_eu", numeroCertif:"ISCC-EU-FR-2023-4421",
   organisme:"SGS France", dateAudit:"2023-11-20", dateExpiration:"2024-11-19",
   perimetre:["bois_forestier","residus"], commune:"Moulins", dep:"03",
   statut:"expire"},
  {id:"fr3", nom:"PLATEFORME BOIS ÉNERGIE CREUSE", siret:"456 123 789 00034",
   contact:"Marie Lefort", tel:"05 55 12 34 56", email:"m.lefort@pbec.fr",
   systeme:"sure", numeroCertif:"",
   organisme:"", dateAudit:"", dateExpiration:"",
   perimetre:["plaquettes","connexes"], commune:"Guéret", dep:"23",
   statut:"a_auditer"},
  {id:"fr4", nom:"SCIERIE DES COMBRAILLES", siret:"789 012 345 00056",
   contact:"François Auclair", tel:"04 73 45 67 89", email:"f.auclair@sdc.fr",
   systeme:"2bsvs", numeroCertif:"2BSvs-FR-2024-8831",
   organisme:"ECOCERT", dateAudit:"2024-06-01", dateExpiration:"2025-05-31",
   perimetre:["connexes","dechets_bois"], commune:"Pontaumur", dep:"63",
   statut:"valide"},
];

const DEMO_NON_CONFORMITES = [
  {id:"nc1", lotNumero:"LOT-2026-06-89-004", date:"2026-05-10",
   type:"certificat_expire", gravite:"majeure",
   description:"Certificat SBP fournisseur BOIS MASSIF expiré depuis 5 jours à la date de livraison.",
   correction:"Demande de renouvellement engagée. Suspension temporaire des livraisons RED.",
   statut:"en_cours", responsable:"J.-C. Letierce"},
  {id:"nc2", lotNumero:"LOT-2026-06-89-002", date:"2026-04-22",
   type:"gps_manquant", gravite:"mineure",
   description:"Coordonnées GPS parcelle non enregistrées lors de la visite terrain.",
   correction:"GPS saisi a posteriori sur base de la fiche cadastrale. Photos géolocalisées ajoutées.",
   statut:"corrigee", responsable:"Pierre Martin"},
  {id:"nc3", lotNumero:"LOT-2026-06-89-001", date:"2026-03-15",
   type:"document_manquant", gravite:"majeure",
   description:"Autorisation de coupe non transmise avant démarrage du chantier.",
   correction:"Document reçu le 18/03. Chantier suspendu 3 jours.",
   statut:"corrigee", responsable:"J.-C. Letierce"},
];

const STATUT_NC = {
  ouverte:   {label:"Ouverte",   color:"#991B1B", bg:"#FEE2E2", icon:"🔴"},
  en_cours:  {label:"En cours",  color:"#92400E", bg:"#FEF3C7", icon:"🟡"},
  corrigee:  {label:"Corrigée", color:"#065F46", bg:"#D1FAE5", icon:"✅"},
};

const GRAVITE_NC = {
  mineure: {label:"Mineure", color:"#92400E", bg:"#FEF3C7"},
  majeure: {label:"Majeure", color:"#991B1B", bg:"#FEE2E2"},
  critique:{label:"Critique",color:"#7F1D1D", bg:"#FECACA"},
};

const exportCSVFromRows = (headers, rows, filename) => {
  const escape = v => `"${String(v||"").replace(/"/g,'""')}"`;
  const csv = [headers.map(escape).join(";"),
    ...rows.map(r=>r.map(escape).join(";"))].join("\n");
  const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};

// ── CONFORMITÉ RED — COMPOSANT ──────────────────────────────────
export const SectionConformiteRED = ({lots=[], visites=[], livraisons=[], _plateformes=[]}) => {
  const [tab, setTab] = useState("fournisseurs");

  // Fournisseurs
  const [fournisseurs, setFournisseurs] = useState(DEMO_FOURNISSEURS_RED);
  const [ficheOpen, setFicheOpen]       = useState(null);
  const [filtreStat, setFiltreStat]     = useState("tous");
  const [showNewFourn, setShowNewFourn] = useState(false);
  const [newFourn, setNewFourn]         = useState({nom:"",systeme:"sbp",statut:"a_auditer",perimetre:[]});

  // Bilan massique
  const [entreeRed,  setEntreeRed]      = useState(85);
  const [entreeNonRed,setEntreeNonRed]  = useState(40);
  const [sortieRed,  setSortieRed]      = useState(60);
  const [sortieNonRed,setSortieNonRed]  = useState(30);

  // Registre NC
  const [nonConformites, setNC]         = useState(DEMO_NON_CONFORMITES);
  const [showNewNC, setShowNewNC]       = useState(false);
  const [newNC, setNewNC]               = useState({lotNumero:"",type:"",gravite:"mineure",description:"",correction:"",statut:"ouverte",responsable:""});
  const [filtreNC, setFiltreNC]         = useState("tous");

  // Lot sélectionné (checklist, traçabilité, dossier)
  const [lotSelId, setLotSelId]         = useState(lots[0]?.id||"");
  const lotSel   = lots.find(l=>l.id===lotSelId);
  const visiteSel= visites.find(v=>v.lotId===lotSelId);

  const TABS = [
    {id:"fournisseurs", label:"1 · Fournisseurs"},
    {id:"checklist",    label:"3 · Checklist terrain"},
    {id:"tracabilite",  label:"4 · Traçabilité"},
    {id:"bilan",        label:"5 · Bilan massique"},
    {id:"dossier",      label:"6 · Dossier documentaire"},
    {id:"registre",     label:"7 · Registre audit"},
  ];

  // ── helpers ──
  const statutFourn = f => {
    if(!f.numeroCertif||!f.organisme||!f.dateExpiration) return "incomplet";
    if(f.dateExpiration && new Date(f.dateExpiration)<new Date()) return "expire";
    return f.statut||"a_auditer";
  };

  const redChecklist = v => v ? [
    {label:"Coupe autorisée",           ok:v.coupeAutorisee==="oui",      ref:"Art. 29 RED II"},
    {label:"Propriétaire identifié",    ok:!!(v.nomSignProprio||v.sigProprio), ref:"Art. 29"},
    {label:"GPS parcelle enregistré",   ok:!!(v.gps?.lat),                ref:"Traçabilité"},
    {label:"Zone protégée vérifiée",    ok:v.zoneProtegee==="non"||v.zoneProtegee==="oui",ref:"Art. 29 §3"},
    {label:"Zone humide / tourbière",   ok:!v.contraintes?.zoneHumide&&!v.contraintes?.tourbieres, ref:"Art. 29 §3"},
    {label:"Sol vulnérable pris en compte",ok:true,                        ref:"Art. 29 §4"},
    {label:"Forêt primaire exclue",     ok:v.redForetPrimaire==="confirme",ref:"Art. 29 §6"},
    {label:"Récolte souches/racines limitée",ok:v.redBoisMort?.souches,   ref:"Art. 29 §6"},
    {label:"Rétention bois mort",       ok:v.redBoisMort?.boisMort,       ref:"Art. 29 §6"},
    {label:"Coupe rase ≤ seuil",        ok:v.redBoisMort?.coupeRase,      ref:"Art. 29 §6"},
    {label:"Document de gestion forestière",ok:v.redDocGestion&&v.redDocGestion!=="aucun",ref:"Art. 29 §7"},
    {label:"Replantation prévue",       ok:v.replantation==="oui"||v.replantation==="a_definir",ref:"Art. 29 §7"},
    {label:"Photos terrain enregistrées",ok:(v.photos?.length||0)>0,      ref:"Traçabilité"},
    {label:"VSS / certification renseignée",ok:!!(v.redSysVolontaire||v.certification!=="aucune"),ref:"Art. 30"},
    {label:"GES calculé / renseigné",   ok:!!(v.redCategorie),            ref:"Art. 29 §10"},
  ] : [];

  const chaineEtapes = (lot, visite, livsLot) => CHAINE_ETAPES.map((e,i) => {
    const done = i===0 ? !!lot
      : i===1 ? lot?.statut==="bord_route"||lot?.statut==="exploitation"||lot?.statut==="livraison"||lot?.statut==="livre"
      : i===2 ? lot?.statut==="exploitation"||lot?.statut==="livraison"||lot?.statut==="livre"
      : i===3 ? lot?.statut==="livraison"||lot?.statut==="livre"
      : i<=6  ? lot?.statut==="livraison"||lot?.statut==="livre"
      : i===7 ? (livsLot?.length||0)>0
      : i===8 ? (livsLot?.length||0)>0
      : i===9 ? !!(livsLot?.some(l=>l.humiditeReception||(l.poidsNet||l.poidsBrut))) : false;
    return {...e, done:!!done};
  });

  const MAP_PAR_T = 2.5; // MAP = mètre cube apparent de plaquettes
  const bilanMix   = Math.max(0, entreeRed - sortieRed);
  const bilanNonRed= Math.max(0, entreeNonRed - sortieNonRed);
  const pctRed     = (entreeRed+entreeNonRed)>0
    ? ((entreeRed)/(entreeRed+entreeNonRed)*100).toFixed(0) : 0;

  const docsRequis = [
    {id:"certif_fourn",   label:"Certificat fournisseur VSS",      ok:!!(visiteSel?.redVssCertificat||visiteSel?.numeroCertification)},
    {id:"contrat",        label:"Contrat / bon d'achat signé",     ok:!!(lotSel?.contratSigne||visiteSel?.sigProprio)},
    {id:"autorisation",   label:"Autorisation propriétaire / coupe",ok:visiteSel?.coupeAutorisee==="oui"},
    {id:"fiche_lot",      label:"Fiche lot (visite terrain)",       ok:!!visiteSel},
    {id:"photos_gps",     label:"Photos GPS parcelle",              ok:(visiteSel?.photos?.length||0)>0},
    {id:"cmr",            label:"CMR (lettre de voiture)",          ok:!!(livraisons.find(l=>l.lotId===lotSelId)?.numeroCMR)},
    {id:"pesee",          label:"Ticket de pesée réception",        ok:!!(livraisons.find(l=>l.lotId===lotSelId)?.numTicket)},
    {id:"humidite",       label:"Analyse humidité",                  ok:!!(visiteSel?.humiditeMesure||livraisons.find(l=>l.lotId===lotSelId)?.humiditeReception)},
    {id:"attestation",    label:"Attestation de durabilité RED",    ok:visiteSel?.statutRed==="conforme"},
    {id:"ges",            label:"Rapport de calcul GES",             ok:!!(visiteSel?.redCategorie)},
  ];
  const nbDocsOk = docsRequis.filter(d=>d.ok).length;

  const checklist = redChecklist(visiteSel);
  const nbOk = checklist.filter(c=>c.ok).length;

  const ncFiltrees = filtreNC==="tous" ? nonConformites
    : nonConformites.filter(n=>n.statut===filtreNC);

  return (
    <div style={{maxWidth:960,margin:"0 auto",padding:"0 4px 80px"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:22,fontWeight:800,color:C.tx,marginBottom:4}}>
          🇪🇺 Conformité RED II — Biomasse
        </div>
        <div style={{fontSize:13,color:C.tx3,lineHeight:1.6}}>
          Gestion de la durabilité biomasse selon la directive RED II (2018/2001/UE).
          Fournisseurs, traçabilité, bilan massique, dossier documentaire et registre d'audit.
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",
            fontFamily:"inherit",fontSize:12,fontWeight:tab===t.id?700:400,
            background:tab===t.id?"#1D4ED8":"#fff",
            color:tab===t.id?"#fff":C.tx2,
            boxShadow:tab===t.id?"0 2px 8px rgba(29,78,216,.25)":"0 1px 3px rgba(0,0,0,.08)",
            flexShrink:0,transition:"all .2s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MODULE 1 : FOURNISSEURS ── */}
      {tab==="fournisseurs"&&(
        <div>
          {/* Filtre + bouton */}
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {["tous","valide","expire","incomplet","a_auditer"].map(s=>(
              <button key={s} onClick={()=>setFiltreStat(s)} style={{
                padding:"6px 12px",borderRadius:16,border:`1.5px solid ${filtreStat===s?"#1D4ED8":C.bd}`,
                background:filtreStat===s?"#1D4ED8":"#fff",
                color:filtreStat===s?"#fff":C.tx2,
                cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:filtreStat===s?700:400}}>
                {s==="tous"?"Tous":STATUT_FOURN_RED[s]?.label||s}
              </button>
            ))}
            <button onClick={()=>setShowNewFourn(v=>!v)} style={{
              marginLeft:"auto",padding:"8px 16px",borderRadius:12,border:"none",
              background:"#1D4ED8",color:"#fff",cursor:"pointer",
              fontFamily:"inherit",fontSize:13,fontWeight:700}}>
              + Nouveau fournisseur
            </button>
          </div>

          {/* Form nouveau */}
          {showNewFourn&&(
            <div style={{background:"#EFF6FF",borderRadius:16,padding:16,
              marginBottom:14,border:"1.5px solid #93C5FD"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#1D4ED8",marginBottom:12}}>
                Nouveau fournisseur RED
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Raison sociale","nom"],["SIRET","siret"],["Contact","contact"],["Téléphone","tel"],["Email","email"],["Commune","commune"]].map(([l,k])=>(
                  <div key={k}>
                    <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>{l}</div>
                    <input value={newFourn[k]||""} onChange={e=>setNewFourn(p=>({...p,[k]:e.target.value}))}
                      style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                        border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Système VSS</div>
                  <select value={newFourn.systeme} onChange={e=>setNewFourn(p=>({...p,systeme:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
                    {["sure","sbp","iscc_eu","2bsvs","redcert_eu","autre"].map(s=>(
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>N° certificat</div>
                  <input value={newFourn.numeroCertif||""} onChange={e=>setNewFourn(p=>({...p,numeroCertif:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Organisme certificateur</div>
                  <input value={newFourn.organisme||""} onChange={e=>setNewFourn(p=>({...p,organisme:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Date d'expiration</div>
                  <input type="date" value={newFourn.dateExpiration||""} onChange={e=>setNewFourn(p=>({...p,dateExpiration:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:6}}>Périmètre</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {PERIMETRE_RED_OPTS.map(p=>{
                    const sel=(newFourn.perimetre||[]).includes(p.id);
                    return (
                      <button key={p.id} onClick={()=>setNewFourn(prev=>{
                        const arr=prev.perimetre||[];
                        return {...prev,perimetre:sel?arr.filter(x=>x!==p.id):[...arr,p.id]};
                      })} style={{padding:"5px 10px",borderRadius:8,fontSize:11,fontWeight:sel?700:400,
                        border:`1.5px solid ${sel?"#1D4ED8":C.bd}`,
                        background:sel?"#DBEAFE":"#fff",color:sel?"#1D4ED8":C.tx2,
                        cursor:"pointer",fontFamily:"inherit"}}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <button onClick={()=>{
                  const id="fr"+Date.now();
                  const stat=statutFourn({...newFourn,id});
                  setFournisseurs(p=>[...p,{...newFourn,id,statut:stat}]);
                  setShowNewFourn(false);
                  setNewFourn({nom:"",systeme:"sbp",statut:"a_auditer",perimetre:[]});
                }} style={{flex:1,padding:"10px",borderRadius:10,border:"none",
                  background:"#1D4ED8",color:"#fff",cursor:"pointer",fontFamily:"inherit",
                  fontSize:13,fontWeight:700}}>
                  Enregistrer
                </button>
                <button onClick={()=>setShowNewFourn(false)} style={{padding:"10px 16px",
                  borderRadius:10,border:`1px solid ${C.bd}`,background:"#fff",
                  cursor:"pointer",fontFamily:"inherit",fontSize:13,color:C.tx2}}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste */}
          {fournisseurs
            .filter(f=>filtreStat==="tous"||statutFourn(f)===filtreStat)
            .map(f=>{
              const s=STATUT_FOURN_RED[statutFourn(f)]||STATUT_FOURN_RED.a_auditer;
              return (
                <div key={f.id} style={{background:"#fff",borderRadius:14,padding:14,
                  marginBottom:10,border:`1px solid ${C.bd}`,cursor:"pointer",
                  boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}
                  onClick={()=>setFicheOpen(ficheOpen===f.id?null:f.id)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{f.nom}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        {f.commune&&f.dep?`${f.commune} (${f.dep}) · `:""}{f.systeme?.toUpperCase()} · {f.organisme||"—"}
                      </div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:s.color,background:s.bg,
                      padding:"4px 10px",borderRadius:20,flexShrink:0}}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                  {ficheOpen===f.id&&(
                    <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.bd}`}}
                      onClick={e=>e.stopPropagation()}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {[
                          ["N° certificat",f.numeroCertif||"—"],
                          ["Système VSS", f.systeme?.toUpperCase()||"—"],
                          ["Organisme",   f.organisme||"—"],
                          ["Date audit",  f.dateAudit||"—"],
                          ["Expiration",  f.dateExpiration||"—"],
                          ["Contact",     f.contact||"—"],
                          ["Téléphone",   f.tel||"—"],
                          ["Email",       f.email||"—"],
                        ].map(([l,v])=>(
                          <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:10,color:C.tx3,fontWeight:600}}>{l}</div>
                            <div style={{fontSize:12,color:C.tx,fontWeight:500,marginTop:2}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {(f.perimetre?.length||0)>0&&(
                        <div style={{marginTop:10}}>
                          <div style={{fontSize:11,color:C.tx3,fontWeight:600,marginBottom:6}}>Périmètre certifié</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                            {f.perimetre.map(p=>(
                              <span key={p} style={{fontSize:11,padding:"3px 8px",borderRadius:6,
                                background:"#DBEAFE",color:"#1E40AF",fontWeight:600}}>
                                {PERIMETRE_RED_OPTS.find(x=>x.id===p)?.label||p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {f.dateExpiration&&new Date(f.dateExpiration)<new Date()&&(
                        <div style={{marginTop:10,padding:"8px 12px",background:"#FEE2E2",
                          borderRadius:8,fontSize:12,color:"#991B1B",fontWeight:600}}>
                          ❌ Certificat expiré le {new Date(f.dateExpiration).toLocaleDateString("fr-FR")}
                          — renouvellement obligatoire avant toute livraison RED.
                        </div>
                      )}
                      <button onClick={()=>setFicheOpen(null)} style={{marginTop:10,
                        padding:"7px 14px",borderRadius:8,border:`1px solid ${C.bd}`,
                        background:"#fff",cursor:"pointer",fontFamily:"inherit",
                        fontSize:12,color:C.tx2}}>
                        Fermer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Export CSV fournisseurs */}
          <button onClick={()=>exportCSVFromRows(
            ["Nom","SIRET","Système VSS","N° certificat","Organisme","Date audit","Expiration","Périmètre","Statut"],
            fournisseurs.map(f=>[f.nom,f.siret||"",f.systeme||"",f.numeroCertif||"",f.organisme||"",f.dateAudit||"",f.dateExpiration||"",
              (f.perimetre||[]).join(", "),statutFourn(f)]),
            "fournisseurs_RED.csv"
          )} style={{marginTop:10,padding:"9px 18px",borderRadius:10,border:`1px solid ${C.bd}`,
            background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,
            color:C.tx2,display:"flex",alignItems:"center",gap:6}}>
            📥 Export CSV fournisseurs
          </button>
        </div>
      )}

      {/* ── MODULE 3 : CHECKLIST TERRAIN ── */}
      {tab==="checklist"&&(
        <div>
          {/* Sélecteur de lot */}
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,
            border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
              Sélectionner un lot
            </div>
            <select value={lotSelId} onChange={e=>setLotSelId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
              {lots.length===0&&<option value="">Aucun lot disponible</option>}
              {lots.map(l=>(
                <option key={l.id} value={l.id}>{l.lotNumero||l.id} — {l.commune||""}</option>
              ))}
            </select>
          </div>

          {/* Score */}
          {checklist.length>0&&(
            <>
              <div style={{background: nbOk>=12
                  ?"linear-gradient(135deg,#F0FDF4,#DCFCE7)"
                  : nbOk>=8
                  ?"linear-gradient(135deg,#FFFBEB,#FEF3C7)"
                  :"linear-gradient(135deg,#FFF1F2,#FEE2E2)",
                borderRadius:16,padding:16,marginBottom:14,
                border:`2px solid ${nbOk>=12?C.green:nbOk>=8?C.amber:C.red}`}}>
                <div style={{fontSize:22,fontWeight:900,color:C.tx}}>
                  {nbOk} / {checklist.length}
                  <span style={{fontSize:13,fontWeight:500,color:C.tx3,marginLeft:8}}>critères RED conformes</span>
                </div>
                <div style={{background:"rgba(0,0,0,.08)",borderRadius:6,height:8,marginTop:10,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:6,
                    background:nbOk>=12?C.green:nbOk>=8?C.amber:C.red,
                    width:`${(nbOk/checklist.length)*100}%`,transition:"width .4s"}}/>
                </div>
                <div style={{fontSize:12,color:C.tx3,marginTop:8}}>
                  {nbOk>=12?"✅ Lot conforme RED II — dossier complet"
                    :nbOk>=8?"⚠️ Conformité partielle — critères manquants à compléter"
                    :"❌ Non conforme — action requise avant déclaration RED"}
                </div>
              </div>

              {checklist.map((c,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"11px 14px",background:"#fff",borderRadius:10,marginBottom:6,
                  border:`1.5px solid ${c.ok?C.green:C.red}20`,
                  boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{c.ok?"✅":"❌"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:c.ok?C.greenD:"#991B1B"}}>
                      {c.label}
                    </div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{c.ref}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {checklist.length===0&&(
            <div style={{textAlign:"center",color:C.tx3,padding:"40px 0",fontSize:13}}>
              Sélectionnez un lot ayant une visite terrain pour afficher la checklist RED.
            </div>
          )}
        </div>
      )}

      {/* ── MODULE 4 : TRAÇABILITÉ ── */}
      {tab==="tracabilite"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,
            border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Lot</div>
            <select value={lotSelId} onChange={e=>setLotSelId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
              {lots.length===0&&<option>Aucun lot</option>}
              {lots.map(l=>(
                <option key={l.id} value={l.id}>{l.lotNumero||l.id} — {l.commune||""}</option>
              ))}
            </select>
          </div>

          {/* Timeline */}
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:16}}>
              Chaîne de transformation — {lotSel?.lotNumero||"—"}
            </div>
            {chaineEtapes(lotSel,visiteSel,livraisons.filter(l=>l.lotId===lotSelId)).map((e,i,arr)=>(
              <div key={e.id} style={{display:"flex",gap:12,marginBottom: i<arr.length-1?0:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32,flexShrink:0}}>
                  <div style={{width:28,height:28,borderRadius:"50%",
                    background:e.done?"#1D4ED8":"#E5E7EB",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:14,flexShrink:0}}>
                    {e.done?"✓":i+1}
                  </div>
                  {i<arr.length-1&&(
                    <div style={{width:2,flex:1,minHeight:24,
                      background:e.done?"#93C5FD":"#E5E7EB",margin:"2px 0"}}/>
                  )}
                </div>
                <div style={{paddingBottom:16,flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>{e.icon}</span>
                    <span style={{fontSize:13,fontWeight:e.done?700:500,
                      color:e.done?"#1D4ED8":C.tx3}}>
                      {e.label}
                    </span>
                    <span style={{fontSize:11,padding:"2px 7px",borderRadius:8,
                      background:e.done?"#DBEAFE":"#F3F4F6",
                      color:e.done?"#1E40AF":C.tx3,fontWeight:600}}>
                      {e.done?"✅ Complété":"⏳ En attente"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODULE 5 : BILAN MASSIQUE ── */}
      {tab==="bilan"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:14}}>
              ⚖️ Bilan massique plateforme — ségrégation RED / non-RED
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["Entrées RED certifiées (t)", entreeRed, setEntreeRed, "#1D4ED8"],
                ["Entrées non-RED (t)", entreeNonRed, setEntreeNonRed, C.tx3],
                ["Sorties RED déclarées (t)", sortieRed, setSortieRed, "#1D4ED8"],
                ["Sorties non-RED (t)", sortieNonRed, setSortieNonRed, C.tx3],
              ].map(([l,v,set,col])=>(
                <div key={l}>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:5}}>{l}</div>
                  <input type="number" value={v} min={0}
                    onChange={e=>set(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${col}40`,fontFamily:"inherit",outline:"none",
                      boxSizing:"border-box",color:col,fontWeight:700}}/>
                </div>
              ))}
            </div>
            {/* Résultats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {[
                ["Solde RED disponible", `${bilanMix.toFixed(0)} t`, bilanMix>=0?"#065F46":"#991B1B", bilanMix>=0?"#D1FAE5":"#FEE2E2"],
                ["Solde non-RED",        `${bilanNonRed.toFixed(0)} t`, C.tx, C.bg2],
                ["Part RED en stock",    `${pctRed} %`, "#1D4ED8", "#DBEAFE"],
              ].map(([l,v,col,bg])=>(
                <div key={l} style={{background:bg,borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:C.tx3,fontWeight:600,marginBottom:4}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:900,color:col}}>{v}</div>
                </div>
              ))}
            </div>
            {bilanMix<0&&(
              <div style={{background:"#FEE2E2",borderRadius:10,padding:"10px 14px",
                fontSize:12,color:"#991B1B",fontWeight:600,marginBottom:10}}>
                ⚠️ Incohérence : les sorties RED ({sortieRed} t) dépassent les entrées RED ({entreeRed} t).
                Vérifier le registre des mouvements.
              </div>
            )}
            {/* Conversion MAP */}
            <div style={{background:C.bg2,borderRadius:10,padding:"10px 14px",fontSize:12,color:C.tx3}}>
              Conversion volumique (indicative) ·
              <strong style={{color:C.tx}}> 1 t ≈ {MAP_PAR_T} MAP</strong>
              {" · "}Stock RED : <strong style={{color:"#1D4ED8"}}>{(bilanMix*MAP_PAR_T).toFixed(0)} MAP</strong>
              {" · "}Stock total : <strong>{((bilanMix+bilanNonRed)*MAP_PAR_T).toFixed(0)} MAP</strong>
            </div>
          </div>
          <button onClick={()=>exportCSVFromRows(
            ["Entrées RED","Entrées non-RED","Sorties RED","Sorties non-RED","Solde RED","Solde non-RED","Part RED %"],
            [[entreeRed,entreeNonRed,sortieRed,sortieNonRed,bilanMix,bilanNonRed,pctRed]],
            "bilan_massique_RED.csv"
          )} style={{padding:"9px 18px",borderRadius:10,border:`1px solid ${C.bd}`,
            background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,
            color:C.tx2,display:"flex",alignItems:"center",gap:6,width:"fit-content"}}>
            📥 Export bilan massique CSV
          </button>
        </div>
      )}

      {/* ── MODULE 6 : DOSSIER DOCUMENTAIRE ── */}
      {tab==="dossier"&&(
        <div>
          <div style={{background:"#fff",borderRadius:14,padding:14,marginBottom:14,
            border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Lot</div>
            <select value={lotSelId} onChange={e=>setLotSelId(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:13,
                border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
              {lots.length===0&&<option>Aucun lot</option>}
              {lots.map(l=>(
                <option key={l.id} value={l.id}>{l.lotNumero||l.id} — {l.commune||""}</option>
              ))}
            </select>
          </div>

          {/* Score docs */}
          <div style={{background: nbDocsOk>=8?"linear-gradient(135deg,#F0FDF4,#DCFCE7)"
              :nbDocsOk>=5?"linear-gradient(135deg,#FFFBEB,#FEF3C7)"
              :"linear-gradient(135deg,#FFF1F2,#FEE2E2)",
            borderRadius:16,padding:14,marginBottom:14,
            border:`2px solid ${nbDocsOk>=8?C.green:nbDocsOk>=5?C.amber:C.red}`}}>
            <div style={{fontSize:18,fontWeight:900,color:C.tx}}>
              {nbDocsOk} / {docsRequis.length} documents présents
            </div>
            <div style={{background:"rgba(0,0,0,.08)",borderRadius:6,height:6,marginTop:8,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:6,
                background:nbDocsOk>=8?C.green:nbDocsOk>=5?C.amber:C.red,
                width:`${(nbDocsOk/docsRequis.length)*100}%`}}/>
            </div>
          </div>

          {docsRequis.map(doc=>(
            <div key={doc.id} style={{display:"flex",alignItems:"center",gap:12,
              padding:"11px 14px",background:"#fff",borderRadius:10,marginBottom:6,
              border:`1px solid ${doc.ok?C.green+"30":C.red+"30"}`,
              boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <span style={{fontSize:18,flexShrink:0}}>{doc.ok?"✅":"❌"}</span>
              <div style={{flex:1,fontSize:13,fontWeight:doc.ok?500:600,
                color:doc.ok?C.tx:"#991B1B"}}>
                {doc.label}
              </div>
              {!doc.ok&&(
                <span style={{fontSize:11,color:"#991B1B",fontWeight:600,flexShrink:0}}>
                  Manquant
                </span>
              )}
            </div>
          ))}

          {/* Export pièces manquantes */}
          <button onClick={()=>exportCSVFromRows(
            ["Document","Statut","Lot"],
            docsRequis.map(d=>[d.label,d.ok?"Présent":"Manquant",lotSel?.lotNumero||lotSelId]),
            `pieces_manquantes_${lotSel?.lotNumero||lotSelId}.csv`
          )} style={{marginTop:10,padding:"9px 18px",borderRadius:10,border:`1px solid ${C.bd}`,
            background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,
            color:C.tx2,display:"flex",alignItems:"center",gap:6,width:"fit-content"}}>
            📥 Export pièces manquantes CSV
          </button>
        </div>
      )}

      {/* ── MODULE 7 : REGISTRE AUDIT ── */}
      {tab==="registre"&&(
        <div>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            {["tous","ouverte","en_cours","corrigee"].map(s=>(
              <button key={s} onClick={()=>setFiltreNC(s)} style={{
                padding:"6px 12px",borderRadius:16,
                border:`1.5px solid ${filtreNC===s?"#1D4ED8":C.bd}`,
                background:filtreNC===s?"#1D4ED8":"#fff",
                color:filtreNC===s?"#fff":C.tx2,
                cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:filtreNC===s?700:400}}>
                {s==="tous"?"Toutes":STATUT_NC[s]?.label||s}
              </button>
            ))}
            <button onClick={()=>setShowNewNC(v=>!v)} style={{
              marginLeft:"auto",padding:"8px 16px",borderRadius:12,border:"none",
              background:C.red,color:"#fff",cursor:"pointer",
              fontFamily:"inherit",fontSize:13,fontWeight:700}}>
              + Non-conformité
            </button>
          </div>

          {/* Form nouvelle NC */}
          {showNewNC&&(
            <div style={{background:"#FEF2F2",borderRadius:16,padding:16,
              marginBottom:14,border:"1.5px solid #FECACA"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#991B1B",marginBottom:12}}>
                Nouvelle non-conformité RED
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Lot concerné</div>
                  <input value={newNC.lotNumero} onChange={e=>setNewNC(p=>({...p,lotNumero:e.target.value}))}
                    placeholder="LOT-2026-…"
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Type</div>
                  <select value={newNC.type} onChange={e=>setNewNC(p=>({...p,type:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
                    <option value="">— Choisir —</option>
                    {["certificat_expire","gps_manquant","document_manquant","ges_non_calcule",
                      "zone_protegee","bois_mort_non_respecte","coupe_non_autorisee","autre"].map(t=>(
                      <option key={t} value={t}>{t.replace(/_/g," ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Gravité</div>
                  <select value={newNC.gravite} onChange={e=>setNewNC(p=>({...p,gravite:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,background:"#fff",fontFamily:"inherit",outline:"none"}}>
                    <option value="mineure">Mineure</option>
                    <option value="majeure">Majeure</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Responsable</div>
                  <input value={newNC.responsable} onChange={e=>setNewNC(p=>({...p,responsable:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:C.tx2,fontWeight:600,marginBottom:4}}>Description</div>
                <textarea value={newNC.description} onChange={e=>setNewNC(p=>({...p,description:e.target.value}))}
                  rows={2} placeholder="Décrire la non-conformité constatée…"
                  style={{width:"100%",padding:"8px 10px",borderRadius:8,fontSize:13,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
                    resize:"vertical",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button onClick={()=>{
                  setNC(p=>[...p,{...newNC,id:"nc"+Date.now(),date:new Date().toISOString().slice(0,10)}]);
                  setShowNewNC(false);
                  setNewNC({lotNumero:"",type:"",gravite:"mineure",description:"",correction:"",statut:"ouverte",responsable:""});
                }} style={{flex:1,padding:"9px",borderRadius:10,border:"none",
                  background:C.red,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  Enregistrer
                </button>
                <button onClick={()=>setShowNewNC(false)} style={{padding:"9px 14px",borderRadius:10,
                  border:`1px solid ${C.bd}`,background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,color:C.tx2}}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste NC */}
          {ncFiltrees.map(nc=>{
            const s=STATUT_NC[nc.statut]||STATUT_NC.ouverte;
            const g=GRAVITE_NC[nc.gravite]||GRAVITE_NC.mineure;
            return (
              <div key={nc.id} style={{background:"#fff",borderRadius:14,padding:14,
                marginBottom:10,border:`1px solid ${C.bd}`,
                boxShadow:"0 2px 6px rgba(0,0,0,.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"flex-start",gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{nc.lotNumero}</div>
                    <div style={{fontSize:11,color:C.tx3}}>{nc.date} · {nc.responsable}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,
                      color:g.color,background:g.bg}}>{g.label}</span>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,
                      color:s.color,background:s.bg}}>{s.icon} {s.label}</span>
                  </div>
                </div>
                <div style={{fontSize:12,color:C.tx2,marginBottom:nc.correction?8:0,lineHeight:1.5}}>
                  {nc.description}
                </div>
                {nc.correction&&(
                  <div style={{fontSize:11,color:C.greenD,background:C.greenL,
                    borderRadius:8,padding:"6px 10px",lineHeight:1.5}}>
                    ✅ Correction : {nc.correction}
                  </div>
                )}
                {nc.statut!=="corrigee"&&(
                  <div style={{display:"flex",gap:6,marginTop:10}}>
                    <button onClick={()=>setNC(p=>p.map(x=>x.id===nc.id?{...x,statut:"en_cours"}:x))}
                      style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${C.amber}`,
                        background:C.amberL,color:C.amber,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>
                      En cours
                    </button>
                    <button onClick={()=>setNC(p=>p.map(x=>x.id===nc.id?{...x,statut:"corrigee"}:x))}
                      style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${C.green}`,
                        background:C.greenL,color:C.greenD,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600}}>
                      Marquer corrigée
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Export CSV registre */}
          <button onClick={()=>exportCSVFromRows(
            ["Lot","Date","Type","Gravité","Statut","Description","Correction","Responsable"],
            nonConformites.map(n=>[n.lotNumero,n.date,n.type,n.gravite,n.statut,n.description,n.correction||"",n.responsable]),
            "registre_NC_RED.csv"
          )} style={{marginTop:10,padding:"9px 18px",borderRadius:10,border:`1px solid ${C.bd}`,
            background:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,
            color:C.tx2,display:"flex",alignItems:"center",gap:6,width:"fit-content"}}>
            📥 Export registre non-conformités CSV
          </button>
        </div>
      )}
    </div>
  );
};

// ── SYSTÈMES VOLONTAIRES (VSS) RED II ──────────────────────────

// ── MODULE GES ─────────────────────────────────────────────────
const FACTEUR_GASOIL    = 2.68;   // kgCO2eq/L  (ADEME Base Carbone 2024)
const FACTEUR_TRANSPORT = 0.062;  // kgCO2eq/t.km  (camion routier moyen)
const PCI_SEC           = 5.18;   // MWh/t bois sec (0 % humidité)

const SEUILS_GES = {
  nouvelles_2021: {val:108, label:"Nouvelles install. > 1 MWth (depuis 2021)"},
  existantes_2026:{val:200, label:"Existantes (jusqu'en 2026)"},
  existantes_2027:{val:140, label:"Existantes (à partir de 2027)"},
};

const GES_EEC_DEFAUT = {
  bois_forestier:     {val:3.5,  label:"Bois forestier",     src:"RED II Annexe VI"},
  residus_forestiers: {val:1.2,  label:"Résidus forestiers", src:"RED II Annexe VI"},
  dechets_bois:       {val:0.5,  label:"Déchets bois",       src:"RED II Annexe VI"},
  plaquettes_fr:      {val:2.8,  label:"Plaquettes forestières FR", src:"CIBE 2024"},
  bois_bocage:        {val:3.1,  label:"Bois de bocage / haies",    src:"CIBE 2024"},
};

const MATERIEL_GES = [
  {id:"dechiqueteuse_mob",  label:"Déchiqueteuse mobile",     conso:22, unite:"l/h",     type:"h"},
  {id:"dechiqueteuse_fixe", label:"Déchiqueteuse fixe/treuil",conso:30, unite:"l/h",     type:"h"},
  {id:"broyeur",            label:"Broyeur / cribleur",       conso:18, unite:"l/h",     type:"h"},
  {id:"chargeuse",          label:"Chargeuse sur pneus",       conso:14, unite:"l/h",     type:"h"},
  {id:"pelle",              label:"Pelle / tête abatteuse",   conso:20, unite:"l/h",     type:"h"},
  {id:"tracteur",           label:"Tracteur forestier",       conso:10, unite:"l/h",     type:"h"},
  {id:"camion_benne",       label:"Camion benne 26 t",        conso:32, unite:"l/100 km",type:"km"},
  {id:"semi_bois",          label:"Semi-remorque bois 44 t",  conso:38, unite:"l/100 km",type:"km"},
];

const calcPCI = (humPct) => {
  const w = (humPct||0) / 100;
  return Math.max(0, PCI_SEC * (1 - w) - 0.68 * w);
};

/* ═══════════════════════════════════════════════════════
   SECTION COÛT RÉGLEMENTAIRE RED
   Source : consortium RED — 3,3 €/t RED II, 3,7 €/t RED III
═══════════════════════════════════════════════════════ */
const BENCH_RED = {
  redII:   { val: 3.3, label: "RED II (sites existants)", color: "#1565C0" },
  redIII:  { val: 3.7, label: "RED III (sites post-2021)", color: "#6A1B9A" },
  amont:   { val: 1.3, label: "Coût amont fournisseur moyen", color: "#2E7D32" },
};

export const SectionCoutReglementaire = ({ lots=[], livraisons=[] }) => {
  // ── Inputs coûts ──
  const [tonnageCertifie, setTonnageCertifie] = useState("");
  const [nbLots,          setNbLots]          = useState("");
  const [nbChantiers,     setNbChantiers]     = useState("");
  const [coutCertif,      setCoutCertif]      = useState("");
  const [heuresAdmin,     setHeuresAdmin]     = useState("");
  const [tauxHoraire,     setTauxHoraire]     = useState("35");
  const [heuresAudit,     setHeuresAudit]     = useState("");
  const [nbDocManquants,  setNbDocManquants]  = useState("");
  const [coutLogiciels,   setCoutLogiciels]   = useState("");
  const [autresCouts,     setAutresCouts]     = useState("");
  const [typeInstallation,setTypeInstallation]= useState("redII");
  // ── Pilote avant/après ──
  const [piloteTab,       setPiloteTab]       = useState("mesures");
  const [avantHeures,     setAvantHeures]     = useState("");
  const [apresHeures,     setApresHeures]     = useState("");
  const [coutAuditMoyen,  setCoutAuditMoyen]  = useState("");
  const [nbAudits,        setNbAudits]        = useState("");
  const [notePilote,      setNotePilote]      = useState("");

  // ── Calculs ──
  const tonnes     = parseFloat(tonnageCertifie) || 0;
  const certif     = parseFloat(coutCertif)      || 0;
  const tempAdmin  = (parseFloat(heuresAdmin)||0) * (parseFloat(tauxHoraire)||35);
  const tempAudit  = (parseFloat(heuresAudit)||0) * (parseFloat(tauxHoraire)||35);
  const logiciels  = parseFloat(coutLogiciels)   || 0;
  const autres     = parseFloat(autresCouts)      || 0;
  const total      = certif + tempAdmin + tempAudit + logiciels + autres;
  const parTonne   = tonnes > 0 ? total / tonnes : 0;
  const bench      = BENCH_RED[typeInstallation]?.val || 3.3;
  const ecartBench = parTonne > 0 ? parTonne - bench : null;

  // Pilote
  const gainHeures    = (parseFloat(avantHeures)||0) - (parseFloat(apresHeures)||0);
  const gainEuros     = gainHeures * (parseFloat(tauxHoraire)||35);
  const totalAudits   = (parseFloat(coutAuditMoyen)||0) * (parseFloat(nbAudits)||1);
  const coutConformite= tonnes > 0 ? (total + totalAudits) / tonnes : 0;

  // Données auto depuis lots/livraisons
  const lotsCount = lots.length;
  const livTotal  = livraisons.reduce((s,l)=>s+(parseFloat(l.poids)||0),0);

  const inputStyle = {
    width:"100%", padding:"9px 12px", borderRadius:10, fontSize:13,
    border:`1.5px solid ${C.bd}`, fontFamily:"inherit", outline:"none",
    background:C.bg, color:C.tx, boxSizing:"border-box"
  };
  const labelStyle = { fontSize:11, fontWeight:700, color:C.tx2, marginBottom:4 };
  const cardStyle  = (col) => ({
    background:col+"18", border:`1.5px solid ${col}44`, borderRadius:12,
    padding:"12px 14px", flex:1
  });

  return (
    <div style={{padding:"0 0 40px"}}>
      <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>
        💶 Coût réglementaire RED
      </div>
      <div style={{fontSize:12,color:C.tx3,marginBottom:18,lineHeight:1.6}}>
        Source : consortium RED — surcoût moyen estimé à <strong>3,3 €/t (RED II)</strong> et
        <strong> 3,7 €/t (RED III)</strong> pour une chaîne de 2,5 intermédiaires.
        Coût amont fournisseur : 1,0–1,6 €/t.
      </div>

      {/* Onglets */}
      {(()=>{
        const tabs=[["calculateur","🧮 Calculateur"],["pilote","🔬 Pilote avant/après"],["benchmark","📊 Benchmark consortium"]];
        return(
          <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
            {tabs.map(([id,lbl])=>(
              <button key={id} onClick={()=>setPiloteTab(id===piloteTab?piloteTab:id)} style={{
                padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit",border:`2px solid ${piloteTab===id?C.blue:C.bd}`,
                background:piloteTab===id?C.blueL:"transparent",color:piloteTab===id?C.blueD:C.tx2,
                WebkitTapHighlightColor:"transparent"}}>
                {lbl}
              </button>
            ))}
          </div>
        );
      })()}

      {/* ── CALCULATEUR ── */}
      {piloteTab==="calculateur"&&(()=>{
        const lignes = [
          ["💳","Certification VSS / organisme",         coutCertif,      setCoutCertif],
          ["💻","Logiciels & outils (abonnements/an)",   coutLogiciels,   setCoutLogiciels],
          ["📋","Autres coûts directs",                  autresCouts,     setAutresCouts],
        ];
        return(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Type installation */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Type d'installation de référence
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {Object.entries(BENCH_RED).map(([k,b])=>(
                  <button key={k} onClick={()=>setTypeInstallation(k)} style={{
                    padding:"8px 14px",borderRadius:10,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`2px solid ${typeInstallation===k?b.color:C.bd}`,
                    background:typeInstallation===k?b.color+"18":"transparent",
                    color:typeInstallation===k?b.color:C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>
                    {b.label} — {b.val} €/t
                  </button>
                ))}
              </div>
            </div>

            {/* Volumes */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Volumes (données APPLITAG auto-calculées disponibles)
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[
                  ["Tonnage certifié (t/an)",tonnageCertifie,setTonnageCertifie,
                   livTotal>0?`${livTotal.toFixed(0)} t en base`:""],
                  ["Nombre de lots",nbLots,setNbLots,
                   lotsCount>0?`${lotsCount} lots en base`:""],
                  ["Nombre de chantiers",nbChantiers,setNbChantiers,""],
                ].map(([lbl,val,set,hint])=>(
                  <div key={lbl}>
                    <div style={labelStyle}>{lbl}</div>
                    <input type="number" value={val} onChange={e=>set(e.target.value)}
                      placeholder={hint||"0"} style={inputStyle}/>
                    {hint&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>{hint}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Temps */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Temps salarié valorisé
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <div>
                  <div style={labelStyle}>Taux horaire chargé (€/h)</div>
                  <input type="number" value={tauxHoraire} onChange={e=>setTauxHoraire(e.target.value)}
                    placeholder="35" style={inputStyle}/>
                </div>
                <div>
                  <div style={labelStyle}>Heures admin traçabilité/an</div>
                  <input type="number" value={heuresAdmin} onChange={e=>setHeuresAdmin(e.target.value)}
                    placeholder="0" style={inputStyle}/>
                  {heuresAdmin&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>
                    = {((parseFloat(heuresAdmin)||0)*(parseFloat(tauxHoraire)||35)).toFixed(0)} €
                  </div>}
                </div>
                <div>
                  <div style={labelStyle}>Heures préparation audits/an</div>
                  <input type="number" value={heuresAudit} onChange={e=>setHeuresAudit(e.target.value)}
                    placeholder="0" style={inputStyle}/>
                  {heuresAudit&&<div style={{fontSize:10,color:C.blue,marginTop:3}}>
                    = {((parseFloat(heuresAudit)||0)*(parseFloat(tauxHoraire)||35)).toFixed(0)} €
                  </div>}
                </div>
              </div>
            </div>

            {/* Autres coûts directs */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px"}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                Coûts directs (€/an)
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {lignes.map(([ico,lbl,val,set])=>(
                  <div key={lbl}>
                    <div style={labelStyle}>{ico} {lbl}</div>
                    <input type="number" value={val} onChange={e=>set(e.target.value)}
                      placeholder="0" style={inputStyle}/>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10}}>
                <div style={labelStyle}>📦 Documents manquants détectés</div>
                <input type="number" value={nbDocManquants}
                  onChange={e=>setNbDocManquants(e.target.value)}
                  placeholder="0 (coût qualitatif — non valorisé ici)" style={{...inputStyle,width:"50%"}}/>
              </div>
            </div>

            {/* Résultat */}
            {total>0&&(
              <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
                borderRadius:14,padding:"16px",border:"2px solid #3B82F6"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#1E40AF",marginBottom:12}}>
                  📊 Résultat — Coût réglementaire RED
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}}>
                  <div style={cardStyle("#1E40AF")}>
                    <div style={{fontSize:10,color:C.tx3,marginBottom:4}}>Coût total annuel</div>
                    <div style={{fontSize:22,fontWeight:900,color:"#1E40AF"}}>
                      {total.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                    </div>
                  </div>
                  {tonnes>0&&(
                    <div style={cardStyle(parTonne>bench?"#991B1B":"#065F46")}>
                      <div style={{fontSize:10,color:C.tx3,marginBottom:4}}>Coût par tonne</div>
                      <div style={{fontSize:22,fontWeight:900,
                        color:parTonne>bench?"#991B1B":"#065F46"}}>
                        {parTonne.toFixed(2)} €/t
                      </div>
                      {ecartBench!==null&&(
                        <div style={{fontSize:11,marginTop:4,color:parTonne>bench?"#991B1B":"#065F46"}}>
                          {parTonne>bench
                            ? `+${ecartBench.toFixed(2)} €/t vs référence consortium (${bench} €/t)`
                            : ecartBench<0
                              ? `${ecartBench.toFixed(2)} €/t vs référence consortium (${bench} €/t) ✓`
                              : `= référence consortium (${bench} €/t)`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Décomposition */}
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {[
                    ["Certification",          certif,    "#7C3AED"],
                    ["Temps admin valorisé",   tempAdmin, "#1565C0"],
                    ["Temps audit valorisé",   tempAudit, "#0277BD"],
                    ["Logiciels & outils",     logiciels, "#00695C"],
                    ["Autres coûts",           autres,    "#78350F"],
                  ].filter(([,v])=>v>0).map(([lbl,v,col])=>(
                    <div key={lbl} style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{height:8,borderRadius:4,background:col,
                        width:`${Math.round((v/total)*100)}%`,minWidth:4,maxWidth:"60%"}}/>
                      <span style={{fontSize:11,color:C.tx2,flexShrink:0}}>
                        {lbl} — <strong>{v.toLocaleString("fr-FR",{minimumFractionDigits:0})} €</strong>
                        {total>0&&<span style={{color:C.tx3}}> ({(v/total*100).toFixed(0)} %)</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:"10px 12px",background:"#FEF3C7",
                  borderRadius:8,fontSize:11,color:"#78350F",lineHeight:1.6}}>
                  ⚠️ <strong>Note contractuelle :</strong> Le consortium RED rappelle qu'un supplément RED
                  ne peut pas être ajouté unilatéralement aux contrats existants.
                  La prise en compte des surcoûts doit respecter les règles contractuelles et de concurrence.
                  Ces données servent à documenter et négocier, pas à facturer automatiquement.
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── PILOTE AVANT/APRÈS ── */}
      {piloteTab==="pilote"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#F0FDF4",borderRadius:12,padding:"14px",
            border:"1.5px solid #86EFAC"}}>
            <div style={{fontSize:13,fontWeight:800,color:"#14532D",marginBottom:8}}>
              🔬 Mesures du pilote de démonstration
            </div>
            <div style={{fontSize:11,color:"#166534",marginBottom:14,lineHeight:1.6}}>
              Mesurez le temps administratif, le coût d'audit et le coût de conformité par tonne
              avant et après déploiement d'APPLITAG pour quantifier le retour sur investissement.
            </div>

            {/* Taux horaire partagé */}
            <div style={{marginBottom:14}}>
              <div style={labelStyle}>Taux horaire chargé (€/h) — partagé avec le calculateur</div>
              <input type="number" value={tauxHoraire} onChange={e=>setTauxHoraire(e.target.value)}
                placeholder="35" style={{...inputStyle,width:"160px"}}/>
            </div>

            {/* Tableau avant/après */}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr>
                    {["Indicateur","Avant APPLITAG","Après APPLITAG","Gain"].map(h=>(
                      <th key={h} style={{padding:"10px 12px",textAlign:"left",
                        background:"#DCFCE7",color:"#14532D",fontWeight:800,
                        borderBottom:"2px solid #86EFAC"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(()=>{
                    const rows = [
                      {
                        label:"Temps admin traçabilité (h/an)",
                        avant:<input type="number" value={avantHeures}
                          onChange={e=>setAvantHeures(e.target.value)}
                          placeholder="ex : 120" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        apres:<input type="number" value={apresHeures}
                          onChange={e=>setApresHeures(e.target.value)}
                          placeholder="ex : 40" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        gain: gainHeures>0
                          ? <span style={{color:"#14532D",fontWeight:700}}>
                              −{gainHeures} h → {gainEuros.toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                            </span>
                          : "—"
                      },
                      {
                        label:"Coût moyen d'un audit (€)",
                        avant:<input type="number" value={coutAuditMoyen}
                          onChange={e=>setCoutAuditMoyen(e.target.value)}
                          placeholder="ex : 2500" style={{...inputStyle,padding:"6px 8px",fontSize:12}}/>,
                        apres:<span style={{color:C.tx3,fontSize:11,padding:"6px 0",display:"block"}}>
                          Saisir après pilote
                        </span>,
                        gain:"—"
                      },
                      {
                        label:"Nb audits/an",
                        avant:<input type="number" value={nbAudits}
                          onChange={e=>setNbAudits(e.target.value)}
                          placeholder="1" style={{...inputStyle,padding:"6px 8px",fontSize:12,width:"100px"}}/>,
                        apres:"—",
                        gain: totalAudits>0
                          ? <span style={{color:"#1E40AF",fontWeight:700}}>
                              {totalAudits.toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                            </span>
                          : "—"
                      },
                      {
                        label:"Coût conformité/tonne",
                        avant:"—",
                        apres:"—",
                        gain: coutConformite>0
                          ? <span style={{fontWeight:800,
                              color:coutConformite<=3.3?"#14532D":"#991B1B"}}>
                              {coutConformite.toFixed(2)} €/t
                              {coutConformite<=3.3
                                ? " ✓ sous référence"
                                : ` (réf. ${BENCH_RED[typeInstallation]?.val} €/t)`}
                            </span>
                          : <span style={{color:C.tx3,fontSize:11}}>Renseigner tonnage dans calculateur</span>
                      },
                    ];
                    return rows.map((r,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.bd}`,
                        background:i%2===0?C.bg:C.bg2}}>
                        <td style={{padding:"10px 12px",fontWeight:700,color:C.tx,
                          fontSize:12,minWidth:200}}>{r.label}</td>
                        <td style={{padding:"8px 12px"}}>{r.avant}</td>
                        <td style={{padding:"8px 12px"}}>{r.apres}</td>
                        <td style={{padding:"8px 12px"}}>{r.gain}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Notes pilote */}
            <div style={{marginTop:14}}>
              <div style={labelStyle}>Notes & observations du pilote</div>
              <textarea value={notePilote} onChange={e=>setNotePilote(e.target.value)}
                rows={4} placeholder="Contexte, méthode de mesure, observations terrain, nuances…"
                style={{...inputStyle,resize:"vertical"}}/>
            </div>

            {/* ROI si données suffisantes */}
            {(gainEuros>0||totalAudits>0)&&(
              <div style={{marginTop:14,background:"#DBEAFE",borderRadius:10,
                padding:"12px 14px",border:"1.5px solid #93C5FD"}}>
                <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:8}}>
                  💰 Retour sur investissement estimé
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {gainEuros>0&&(
                    <div style={cardStyle("#1E40AF")}>
                      <div style={{fontSize:10,color:C.tx3}}>Gain temps admin/an</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#1E40AF"}}>
                        {gainEuros.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                      </div>
                    </div>
                  )}
                  {totalAudits>0&&(
                    <div style={cardStyle("#7C3AED")}>
                      <div style={{fontSize:10,color:C.tx3}}>Coût audit annuel</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#7C3AED"}}>
                        {totalAudits.toLocaleString("fr-FR",{minimumFractionDigits:0})} €
                      </div>
                    </div>
                  )}
                  {(gainEuros+totalAudits)>0&&(
                    <div style={cardStyle("#065F46")}>
                      <div style={{fontSize:10,color:C.tx3}}>Économie potentielle identifiée</div>
                      <div style={{fontSize:18,fontWeight:900,color:"#065F46"}}>
                        {(gainEuros).toLocaleString("fr-FR",{minimumFractionDigits:0})} €/an
                      </div>
                      <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                        (gain admin — les coûts d'audit restent réels)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BENCHMARK ── */}
      {piloteTab==="benchmark"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",
            border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:13,fontWeight:800,color:C.tx,marginBottom:4}}>
              📊 Données de référence — Consortium RED
            </div>
            <div style={{fontSize:11,color:C.tx3,marginBottom:14}}>
              Source : étude consortium RED, données gouvernementales françaises
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {label:"Surcoût moyen RED II (sites existants)",val:"3,3 €/t",
                 detail:"Chaîne moyenne de 2,5 intermédiaires",color:"#1565C0"},
                {label:"Surcoût moyen RED III (sites post-2021)",val:"3,7 €/t",
                 detail:"Exigences renforcées sur la traçabilité et la durabilité",color:"#6A1B9A"},
                {label:"Coût amont fournisseur",val:"1,0 – 1,6 €/t",
                 detail:"Certification, temps, outils — côté producteur/intermédiaire",color:"#2E7D32"},
                {label:"Nombre d'intermédiaires moyen",val:"2,5",
                 detail:"Pour une chaîne forêt → plateforme → chaufferie",color:"#00695C"},
              ].map(r=>(
                <div key={r.label} style={{display:"flex",alignItems:"center",gap:12,
                  padding:"10px 12px",borderRadius:10,background:r.color+"0D",
                  border:`1px solid ${r.color}33`}}>
                  <div style={{fontSize:20,fontWeight:900,color:r.color,
                    minWidth:100,flexShrink:0}}>{r.val}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{r.label}</div>
                    <div style={{fontSize:11,color:C.tx3}}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Principaux postes */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              Principaux postes identifiés par le consortium
            </div>
            {[
              ["💳","Certification auprès d'un organisme VSS reconnu",
               "Obligatoire pour SURE, SBP, ISCC EU, 2BSvs, REDcert-EU"],
              ["⏱️","Temps salarié — traçabilité et audits",
               "Souvent le poste le plus lourd, difficile à externaliser"],
              ["💻","Logiciels et outils administratifs",
               "SIG, ERP, outils de déclaration, plateformes documentaires"],
              ["🔄","Saisies redondantes RED / RDUE / PEFC / SSD / ISO",
               "Informations similaires demandées dans des formats différents — surcoût de coordination"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,alignItems:"flex-start",
                padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}>
                <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{det}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Opportunité APPLITAG */}
          <div style={{background:"linear-gradient(135deg,#ECFDF5,#D1FAE5)",
            borderRadius:12,padding:"14px",border:"1.5px solid #6EE7B7"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:8}}>
              🎯 Opportunité APPLITAG — Mutualisation des saisies
            </div>
            <div style={{fontSize:11,color:"#065F46",lineHeight:1.7}}>
              Le consortium identifie que RED, RDUE, PEFC, SSD et ISO demandent des informations
              similaires dans des formats différents. APPLITAG centralise la saisie unique et
              génère les exports adaptés à chaque référentiel, réduisant directement ce surcoût.
            </div>
            <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
              {["RED II / III","RDUE","PEFC","SSD","ISO 50001"].map(r=>(
                <span key={r} style={{padding:"4px 10px",borderRadius:20,fontSize:11,
                  fontWeight:700,background:"#065F46",color:"#fff"}}>{r}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SectionGES = ({lots=[], visites=[], livraisons=[]}) => {
  const [tab, setTab] = useState("calculateur");
  const [methode, setMethode] = useState("defaut");
  // Biomasse
  const [typeBio,   setTypeBio]   = useState("bois_forestier");
  const [tonnage,   setTonnage]   = useState(100);
  const [humidite,  setHumidite]  = useState(30);
  // Transport
  const [distAmont, setDistAmont] = useState(20);
  const [distAval,  setDistAval]  = useState(50);
  const [nbRotations,_setNbRot]    = useState(5);
  // Matériel exploitation
  const [materielItems, setMaterielItems] = useState(
    MATERIEL_GES.slice(0,3).map(m=>({...m, qty:0}))
  );
  const [selectedMat, setSelectedMat] = useState("");
  // GES réelles (mode réel)
  const [consoCarbu,  setConsoCarbu]  = useState("");
  const [eecReelle,   setEecReelle]   = useState("");

  const pci      = calcPCI(humidite);
  const energieMWh = tonnage * pci;
  const energieMJ  = energieMWh * 3600;

  // ── Calculs ──
  const eec = methode==="reelle"
    ? (parseFloat(eecReelle)||0)
    : (GES_EEC_DEFAUT[typeBio]?.val || 3.5);

  const consoTotL = methode==="reelle"
    ? (parseFloat(consoCarbu)||0)
    : materielItems.reduce((s,m)=> s + (m.qty||0) * m.conso * (m.type==="km"?1:1), 0);

  const emissExploit_kgco2 = consoTotL * FACTEUR_GASOIL;
  const emissTransAmont_kgco2 = distAmont * tonnage * FACTEUR_TRANSPORT;
  const emissTransAval_kgco2  = distAval  * tonnage * FACTEUR_TRANSPORT * nbRotations / nbRotations; // par livraison

  const totalKgco2   = emissExploit_kgco2 + emissTransAmont_kgco2 + emissTransAval_kgco2;
  const totalGco2MJ  = energieMJ > 0 ? (totalKgco2 * 1000) / energieMJ : 0;
  const totalGco2MJavecEec = totalGco2MJ + eec;

  const seuilRef = SEUILS_GES.nouvelles_2021.val;
  const conforme = totalGco2MJavecEec <= seuilRef;
  const pctSeuil = seuilRef > 0 ? Math.min(200, (totalGco2MJavecEec / seuilRef) * 100) : 0;

  const TABS = [
    {id:"calculateur", label:"Calculateur"},
    {id:"reference",   label:"Valeurs de référence"},
    {id:"vss",         label:"Systèmes VSS"},
    {id:"bilan",       label:"Bilan lots"},
    {id:"methode",     label:"Méthode"},
  ];

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:"0 4px 80px"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:22,fontWeight:800,color:C.tx,marginBottom:4}}>🌿 Bilan GES biomasse</div>
        <div style={{fontSize:13,color:C.tx3,lineHeight:1.6}}>
          Calcul des émissions de gaz à effet de serre selon RED II — méthode défaut, réelle ou désagrégée.
          Référentiel ADEME Base Carbone + valeurs CIBE filière bois-énergie française.
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",paddingBottom:2}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"8px 16px",borderRadius:20,border:"none",cursor:"pointer",
            fontFamily:"inherit",fontSize:13,fontWeight:tab===t.id?700:400,
            background:tab===t.id?C.blue:"#fff",
            color:tab===t.id?"#fff":C.tx2,
            boxShadow:tab===t.id?"0 2px 8px rgba(0,0,0,.15)":"0 1px 3px rgba(0,0,0,.08)",
            flexShrink:0,transition:"all .2s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CALCULATEUR ── */}
      {tab==="calculateur"&&(()=>{
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Méthode */}
            <div style={{background:"#fff",borderRadius:16,padding:16,
              border:`1px solid ${C.bd}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
                ⚙️ Méthode de calcul
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[["defaut","🔢 Valeurs par défaut","Annexes RED II — simple"],
                  ["reelle","📊 Valeurs réelles","Saisie des consommations mesurées"],
                  ["disagregee","🔬 Désagrégée","Calcul étape par étape (art. 31)"]].map(([v,l,s])=>(
                  <button key={v} onClick={()=>setMethode(v)} style={{
                    flex:1,minWidth:140,padding:"10px 14px",borderRadius:12,textAlign:"left",
                    border:`2px solid ${methode===v?C.blue:C.bd}`,
                    background:methode===v?C.blueL:"#fafafa",
                    cursor:"pointer",fontFamily:"inherit",
                    WebkitTapHighlightColor:"transparent"}}>
                    <div style={{fontSize:13,fontWeight:700,color:methode===v?C.blueD:C.tx}}>{l}</div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:3}}>{s}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Biomasse */}
            <div style={{background:"#fff",borderRadius:16,padding:16,
              border:`1px solid ${C.bd}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
                🪵 Biomasse
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Type de combustible</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {Object.entries(GES_EEC_DEFAUT).map(([k,d])=>(
                    <button key={k} onClick={()=>setTypeBio(k)} style={{
                      padding:"9px 12px",borderRadius:10,textAlign:"left",
                      border:`1.5px solid ${typeBio===k?C.blue:C.bd}`,
                      background:typeBio===k?C.blueL:"#fafafa",
                      cursor:"pointer",fontFamily:"inherit",fontSize:12,
                      color:typeBio===k?C.blueD:C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>
                      <span style={{fontWeight:600}}>{d.label}</span>
                      <span style={{color:C.tx3,marginLeft:8}}>eec = {d.val} gCO₂eq/MJ · {d.src}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Tonnage (t)</div>
                  <input type="number" value={tonnage} min={1}
                    onChange={e=>setTonnage(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>Humidité (%)</div>
                  <input type="number" value={humidite} min={0} max={60}
                    onChange={e=>setHumidite(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{marginTop:10,padding:"10px 14px",background:C.blueL,borderRadius:10,
                display:"flex",gap:20,flexWrap:"wrap"}}>
                <span style={{fontSize:12,color:C.blueD}}>PCI calculé : <strong>{pci.toFixed(2)} MWh/t</strong></span>
                <span style={{fontSize:12,color:C.blueD}}>Énergie estimée : <strong>{energieMWh.toFixed(0)} MWh</strong></span>
                <span style={{fontSize:12,color:C.blueD}}>→ <strong>{(energieMWh*1000).toFixed(0)} GJ</strong></span>
              </div>
            </div>

            {/* Transport */}
            <div style={{background:"#fff",borderRadius:16,padding:16,
              border:`1px solid ${C.bd}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
                🚛 Transport
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
                    Chantier → plateforme (km)
                  </div>
                  <input type="number" value={distAmont} min={0}
                    onChange={e=>setDistAmont(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
                    Plateforme → chaufferie (km)
                  </div>
                  <input type="number" value={distAval} min={0}
                    onChange={e=>setDistAval(parseFloat(e.target.value)||0)}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{padding:"10px 14px",background:C.bg2,borderRadius:10,fontSize:12,color:C.tx3}}>
                Facteur émission transport routier : {FACTEUR_TRANSPORT*1000} gCO₂eq/t.km (valeur ADEME)
              </div>
            </div>

            {/* Exploitation */}
            <div style={{background:"#fff",borderRadius:16,padding:16,
              border:`1px solid ${C.bd}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
                ⚙️ Émissions d'exploitation
              </div>
              {methode==="reelle"?(
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
                    Consommation carburant totale chantier (L)
                  </div>
                  <input type="number" value={consoCarbu} min={0}
                    onChange={e=>setConsoCarbu(e.target.value)}
                    placeholder="Ex : 450"
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  <div style={{fontSize:11,color:C.tx3,marginTop:6}}>
                    eec réelle : saisir la valeur directement ou calculer ci-dessous
                  </div>
                  <div style={{marginTop:10}}>
                    <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:6}}>
                      Valeur eec réelle (gCO₂eq/MJ) — optionnel
                    </div>
                    <input type="number" value={eecReelle} min={0}
                      onChange={e=>setEecReelle(e.target.value)}
                      placeholder="Laisser vide pour calculer depuis la conso carburant"
                      style={{width:"100%",padding:"10px 12px",borderRadius:10,fontSize:14,
                        border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:12,color:C.tx2,fontWeight:600,marginBottom:8}}>
                    Équipements utilisés sur le chantier
                  </div>
                  {materielItems.map((m,i)=>(
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,
                      padding:"10px 12px",background:C.bg2,borderRadius:10}}>
                      <div style={{flex:1,fontSize:12,color:C.tx,fontWeight:500}}>{m.label}</div>
                      <div style={{fontSize:11,color:C.tx3,width:90,flexShrink:0}}>
                        {m.conso} {m.unite}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                        <span style={{fontSize:11,color:C.tx3}}>{m.type==="h"?"Durée (h)":"Distance (km)"}</span>
                        <input type="number" value={m.qty||""} min={0}
                          onChange={e=>{const v=parseFloat(e.target.value)||0;
                            setMaterielItems(p=>p.map((x,j)=>j===i?{...x,qty:v}:x));}}
                          style={{width:70,padding:"6px 8px",borderRadius:8,fontSize:13,
                            border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
                            textAlign:"right"}}/>
                        <button onClick={()=>setMaterielItems(p=>p.filter((_,j)=>j!==i))}
                          style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${C.bd}`,
                            background:"#fff",cursor:"pointer",fontSize:12,color:C.tx3}}>✕</button>
                      </div>
                    </div>
                  ))}
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <select value={selectedMat} onChange={e=>setSelectedMat(e.target.value)}
                      style={{flex:1,padding:"9px 12px",borderRadius:10,fontSize:12,
                        border:`1.5px solid ${C.bd}`,background:"#fff",color:C.tx,
                        fontFamily:"inherit",outline:"none"}}>
                      <option value="">— Ajouter un équipement —</option>
                      {MATERIEL_GES.filter(m=>!materielItems.find(x=>x.id===m.id)).map(m=>(
                        <option key={m.id} value={m.id}>{m.label} ({m.conso} {m.unite})</option>
                      ))}
                    </select>
                    <button onClick={()=>{
                      const m=MATERIEL_GES.find(x=>x.id===selectedMat);
                      if(m){setMaterielItems(p=>[...p,{...m,qty:0}]);setSelectedMat("");}
                    }} style={{padding:"9px 16px",borderRadius:10,border:"none",
                      background:C.blue,color:"#fff",cursor:"pointer",fontFamily:"inherit",
                      fontSize:13,fontWeight:600}}>
                      + Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Résultat */}
            <div style={{background: conforme
                ? "linear-gradient(135deg,#F0FDF4,#DCFCE7)"
                : "linear-gradient(135deg,#FFF7ED,#FEE2E2)",
              borderRadius:16,padding:20,
              border:`2px solid ${conforme?C.green:C.red}`,
              boxShadow:"0 4px 16px rgba(0,0,0,.10)"}}>
              <div style={{fontSize:15,fontWeight:800,color:conforme?C.greenD:"#B91C1C",marginBottom:4}}>
                {conforme?"✅ Conforme RED II":"⚠️ Dépassement seuil RED II"}
              </div>
              <div style={{fontSize:28,fontWeight:900,color:conforme?C.greenD:"#B91C1C",
                letterSpacing:"-1px",marginBottom:12}}>
                {totalGco2MJavecEec.toFixed(1)} <span style={{fontSize:14,fontWeight:500}}>gCO₂eq/MJ</span>
              </div>
              {/* Barre de progression */}
              <div style={{background:"rgba(0,0,0,.08)",borderRadius:8,height:12,marginBottom:12,overflow:"hidden"}}>
                <div style={{
                  height:"100%",borderRadius:8,transition:"width .4s",
                  background:conforme?C.green:C.red,
                  width:`${Math.min(100,pctSeuil)}%`}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[
                  ["🌱 eec (extraction/culture)", `${eec.toFixed(1)} gCO₂eq/MJ`],
                  ["🚛 Transport amont", `${energieMJ>0?((emissTransAmont_kgco2*1000)/energieMJ).toFixed(1):0} gCO₂eq/MJ`],
                  ["🚚 Transport aval",  `${energieMJ>0?((emissTransAval_kgco2*1000)/energieMJ).toFixed(1):0} gCO₂eq/MJ`],
                  ["⚙️ Exploitation",    `${energieMJ>0?((emissExploit_kgco2*1000)/energieMJ).toFixed(1):0} gCO₂eq/MJ`],
                ].map(([l,v])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.6)",borderRadius:10,
                    padding:"10px 12px"}}>
                    <div style={{fontSize:11,color:C.tx3,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {Object.entries(SEUILS_GES).map(([k,s])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",
                    fontSize:12,color:C.tx3,padding:"4px 0",
                    borderBottom:`0.5px solid rgba(0,0,0,.08)`}}>
                    <span>{s.label}</span>
                    <span style={{fontWeight:600,
                      color:totalGco2MJavecEec<=s.val?C.greenD:"#B91C1C"}}>
                      {s.val} gCO₂eq/MJ {totalGco2MJavecEec<=s.val?"✅":"❌"}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,fontSize:11,color:C.tx3,lineHeight:1.6}}>
                Émissions totales chantier : <strong>{totalKgco2.toFixed(0)} kgCO₂eq</strong>
                {" · "}Énergie produite : <strong>{energieMWh.toFixed(0)} MWh</strong>
                {" · "}PCI à {humidite}% : <strong>{pci.toFixed(2)} MWh/t</strong>
              </div>
            </div>

          </div>
        );
      })()}

      {/* ── VALEURS DE RÉFÉRENCE ── */}
      {tab==="reference"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              🌿 Valeurs eec par défaut (gCO₂eq/MJ)
            </div>
            <div style={{fontSize:12,color:C.tx3,marginBottom:12,lineHeight:1.5}}>
              Source : RED II Annexe VI partie C + travaux CIBE sur la filière bois-énergie française.
              Ces valeurs comprennent l'extraction, culture et transformation en amont du transport.
            </div>
            {Object.entries(GES_EEC_DEFAUT).map(([k,d])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",
                borderBottom:`1px solid ${C.bd}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx}}>{d.label}</div>
                  <div style={{fontSize:11,color:C.tx3}}>{d.src}</div>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:C.blueD}}>{d.val}</div>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              🚛 Facteurs émission transport
            </div>
            {[
              ["Transport routier (camion 26-44 t)", "62 gCO₂eq/t.km", "ADEME Base Carbone"],
              ["Transport fluvial (barge)", "26 gCO₂eq/t.km", "ADEME Base Carbone"],
              ["Transport ferroviaire", "8 gCO₂eq/t.km", "ADEME Base Carbone"],
            ].map(([l,v,s])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx}}>{l}</div>
                  <div style={{fontSize:11,color:C.tx3}}>{s}</div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:C.blueD}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              ⛽ Facteurs émission carburants
            </div>
            {[
              ["Gazole (diesel)",         "2.68 kgCO₂eq/L", "ADEME 2024"],
              ["Essence SP95/SP98",        "2.28 kgCO₂eq/L", "ADEME 2024"],
              ["HVO (huile végétale)",     "0.33 kgCO₂eq/L", "ADEME 2024"],
              ["GNR (carburant agricole)", "2.68 kgCO₂eq/L", "ADEME 2024"],
            ].map(([l,v,s])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.tx}}>{l}</div>
                  <div style={{fontSize:11,color:C.tx3}}>{s}</div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:C.blueD}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              🎯 Seuils RED II (gCO₂eq/MJ)
            </div>
            {Object.entries(SEUILS_GES).map(([k,s])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx,flex:1,paddingRight:12}}>{s.label}</div>
                <div style={{fontSize:18,fontWeight:800,color:C.red}}>{s.val}</div>
              </div>
            ))}
            <div style={{fontSize:12,color:C.tx3,marginTop:10,lineHeight:1.6,padding:"10px 0"}}>
              Les émissions fossiles de référence (comparateur) sont fixées à <strong>94 gCO₂eq/MJ</strong>.
              La réduction minimale requise varie de 65 % à 80 % selon le type d'installation.
            </div>
          </div>

          <div style={{background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",borderRadius:16,
            padding:16,border:`1px solid ${C.green}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.greenD,marginBottom:8}}>
              📚 Référence CIBE
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.7}}>
              Le CIBE (Comité Interprofessionnel du Bois-Énergie) a établi des valeurs GES
              spécifiques pour les combustibles bois non représentés dans la directive,
              notamment les plaquettes forestières françaises (2.8 gCO₂eq/MJ) et le bois de bocage
              (3.1 gCO₂eq/MJ). Ces valeurs sont utilisées par défaut dans APPLITAG pour la filière
              française en l'absence de mesures réelles.
            </div>
          </div>
        </div>
      )}

      {/* ── SYSTÈMES VSS ── */}
      {tab==="vss"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",borderRadius:16,
            padding:16,border:"1.5px solid #93C5FD"}}>
            <div style={{fontSize:14,fontWeight:800,color:"#1D4ED8",marginBottom:6}}>
              🏅 Systèmes volontaires reconnus RED II
            </div>
            <div style={{fontSize:12,color:"#1E40AF",lineHeight:1.6}}>
              La Commission européenne publie et met à jour la liste des systèmes volontaires
              reconnus pour attester la conformité RED II. Ces systèmes permettent à un opérateur
              de démontrer que la biomasse respecte les critères de durabilité via un audit
              externe indépendant sur l'ensemble de la chaîne.
            </div>
          </div>

          {VSS_RECONNUS.map(vss=>(
            <div key={vss.id} style={{background:"#fff",borderRadius:16,padding:16,
              border:`2px solid ${vss.couleur}20`,
              boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
                gap:12,marginBottom:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:18,fontWeight:900,color:vss.couleur}}>{vss.label}</span>
                    {vss.reconnu==="UE"&&!vss.vigilance&&(
                      <span style={{fontSize:11,fontWeight:700,color:"#1565C0",
                        background:"#E3F2FD",padding:"3px 8px",borderRadius:6}}>
                        ✅ Reconnu Commission UE
                      </span>
                    )}
                    {vss.vigilance&&(
                      <span style={{fontSize:11,fontWeight:700,color:"#E65100",
                        background:"#FFF3E0",padding:"3px 8px",borderRadius:6}}>
                        ⚠️ Point de vigilance
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{vss.org}</div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{background:vss.bg,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:vss.couleur,marginBottom:3}}>
                    Périmètre
                  </div>
                  <div style={{fontSize:12,color:C.tx2,lineHeight:1.5}}>{vss.perimetre}</div>
                </div>
                <div style={{background:C.bg2,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:3}}>
                    Combustibles couverts
                  </div>
                  <div style={{fontSize:12,color:C.tx2,lineHeight:1.5}}>{vss.combustibles}</div>
                </div>
                <div style={{background: vss.vigilance?"#FFF3E0":"#F0FDF4",
                  borderRadius:10,padding:"10px 12px",
                  border:`1px solid ${vss.vigilance?"#FED7AA":"#BBF7D0"}`}}>
                  <div style={{fontSize:11,color:C.tx2,lineHeight:1.6}}>{vss.note}</div>
                </div>
              </div>
            </div>
          ))}

          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:10}}>
              📋 Points clés pour APPLITAG
            </div>
            {[
              ["🔄 Référentiel évolutif","La liste des systèmes reconnus est mise à jour par la Commission. APPLITAG permet de saisir tout système reconnu sans en figer un seul."],
              ["📄 Fiche certificat complète","Pour chaque lot RED : système VSS, n° de certificat, organisme certificateur, date de validité, périmètre — tout est sauvegardé dans la visite."],
              ["⏰ Alerte expiration","APPLITAG détecte les certificats expirés ou expirant dans moins de 60 jours et affiche une alerte dans le formulaire de visite."],
              ["🔗 Chaîne de contrôle","Le VSS couvre la chaîne de la forêt jusqu'au producteur de combustible. L'opérateur doit être inscrit dans le système et disposer d'un certificat actif."],
            ].map(([t,d])=>(
              <div key={t} style={{padding:"10px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:3}}>{t}</div>
                <div style={{fontSize:12,color:C.tx3,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BILAN LOTS ── */}
      {tab==="bilan"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:12}}>
              📊 Bilan GES par lot
            </div>
            {lots.filter(l=>l.certification==="red").length===0?(
              <div style={{textAlign:"center",color:C.tx3,padding:"30px 0",fontSize:13}}>
                Aucun lot avec certification RED II trouvé.
                <br/>Les bilans s'affichent automatiquement pour les lots certifiés RED.
              </div>
            ):(
              lots.filter(l=>l.certification==="red").map(lot=>{
                const v = visites.find(x=>x.lotId===lot.id);
                const livs = livraisons.filter(x=>x.lotId===lot.id);
                const tonnageTot = livs.reduce((s,x)=>s+(x.poidsNet||x.poidsBrut||0),0);
                const distAm = v?.redDistance||0;
                const humMoy = livs.length ? livs.reduce((s,x)=>s+(x.humiditeReception||30),0)/livs.length : 30;
                const pciL = calcPCI(humMoy);
                const eMJ = tonnageTot * pciL * 3600;
                const eTransAval = livs.reduce((s,x)=>s+(x.distanceLivraison||distAval)*(x.poidsNet||x.poidsBrut||0)*FACTEUR_TRANSPORT,0);
                const eTransAmont = tonnageTot * distAm * FACTEUR_TRANSPORT;
                const eec_v = GES_EEC_DEFAUT[v?.redCategorie]?.val || 3.5;
                const total = eMJ>0 ? ((eTransAval+eTransAmont)*1000/eMJ) + eec_v : 0;
                return (
                  <div key={lot.id} style={{padding:"12px 0",borderBottom:`1px solid ${C.bd}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{lot.lotNumero||lot.id}</div>
                        <div style={{fontSize:11,color:C.tx3}}>{lot.commune||"—"} · {tonnageTot} t livré</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:800,
                          color:total<=seuilRef?C.greenD:"#B91C1C"}}>
                          {total.toFixed(1)} gCO₂eq/MJ
                        </div>
                        <div style={{fontSize:10,color:total<=seuilRef?C.green:C.red,fontWeight:600}}>
                          {total<=seuilRef?"✅ Conforme":"❌ Non conforme"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── MÉTHODE ── */}
      {tab==="methode"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[{
            titre:"🔢 Méthode des valeurs par défaut",
            couleur:C.blue, bg:C.blueL,
            texte:"Utilise les valeurs eec publiées dans les annexes RED II ou établies par le CIBE pour la filière française. Aucune mesure requise. Adaptée pour une première déclaration ou les petits fournisseurs. Les valeurs CIBE sont spécifiquement calibrées pour les combustibles bois non couverts par la directive."
          },{
            titre:"📊 Méthode des valeurs réelles",
            couleur:C.green, bg:C.greenL,
            texte:"Repose sur les consommations de carburant réellement mesurées sur le chantier (déchiquetage, débardage, chargement) et les distances de transport effectives. Permet de réduire significativement la valeur GES déclarée si les pratiques d'exploitation sont optimisées. Requiert un suivi terrain documenté."
          },{
            titre:"🔬 Méthode désagrégée (art. 31 RED II)",
            couleur:"#7C3AED", bg:"#EDE9FE",
            texte:"Calcul étape par étape : eec (extraction/sylviculture) + el (traitement) + esca (séquestration carbone sol) + etd (transport et distribution) + eu (usage). La composante esca peut générer un bonus négatif si les pratiques améliorent le stockage carbone des sols forestiers. Méthode avancée requérant un accompagnement technique."
          }].map(({titre,couleur,bg,texte})=>(
            <div key={titre} style={{background:bg,borderRadius:16,padding:16,
              border:`1.5px solid ${couleur}`}}>
              <div style={{fontSize:14,fontWeight:700,color:couleur,marginBottom:8}}>{titre}</div>
              <div style={{fontSize:13,color:C.tx2,lineHeight:1.7}}>{texte}</div>
            </div>
          ))}
          <div style={{background:"#fff",borderRadius:16,padding:16,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:10}}>
              📐 Formule GES totale (RED II)
            </div>
            <div style={{background:C.bg2,borderRadius:10,padding:"12px 14px",
              fontFamily:"monospace",fontSize:12,color:C.tx,lineHeight:2}}>
              <div><strong>E = eec + el + esca + etd + eu − eccs − eccr</strong></div>
              <div style={{color:C.tx3,fontFamily:"inherit",fontSize:11,marginTop:8,lineHeight:1.8}}>
                eec = émissions extraction et culture<br/>
                el = émissions annualisées de traitement<br/>
                esca = émissions/captures séquestration carbone sol<br/>
                etd = émissions transport et distribution<br/>
                eu = émissions d'utilisation (combustion)<br/>
                eccs = réduction par capture CO₂<br/>
                eccr = réduction par carbone renouvelable capturé
              </div>
            </div>
            <div style={{fontSize:12,color:C.tx3,marginTop:10,lineHeight:1.6}}>
              Pour la biomasse bois, <strong>eu = 0</strong> par convention (carbone biogénique).
              La valeur fossile de référence est <strong>94 gCO₂eq/MJ</strong>.
              La réduction minimale requise est de 65 % → seuil ≤ 32.9 gCO₂eq/MJ
              pour les nouvelles installations après 2026.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MODULE DESSERTE FORESTIÈRE
═══════════════════════════════════════════════════════════════ */
const PORTANCE_OPTS = [
  {v:"legere",  l:"Légère (< 10 t)", col:"#065F46", bg:"#D1FAE5"},
  {v:"normale", l:"Normale (10–19 t)",col:"#1E40AF", bg:"#DBEAFE"},
  {v:"renforcee",l:"Renforcée (≥ 19 t)",col:"#7C3AED",bg:"#EDE9FE"},
];
const ACCES_INCENDIE_OPTS = ["Oui — accès DFCI conforme","Oui — à améliorer","Non — hors périmètre","Non — à créer"];
const DEMO_TRONCONS = [
  {
    id:"TRC-001", nom:"Chemin des Battets — section nord",
    type:"existant", proprietaire:"Commune de Tronçais",
    parcelles:["B 112","B 113","B 114"], surface:12.5,
    portance:"renforcee", largeur:4.5, pentePct:8,
    placeDepot:true, retournement:true, accesIncendie:"Oui — accès DFCI conforme",
    tonnageMobilisable:320, volumeMobilisable:480,
    coutProjet:0, travaux:"Entretien fossés 2024",
    photos:2, statut:"operationnel",
    lat:46.51, lng:2.89,
  },
  {
    id:"TRC-002", nom:"Piste de la Corniche — prolongement",
    type:"a_creer", proprietaire:"Syndicat forestier Allier",
    parcelles:["C 218","C 219"], surface:8.2,
    portance:"normale", largeur:3.5, pentePct:14,
    placeDepot:false, retournement:false, accesIncendie:"Non — à créer",
    tonnageMobilisable:180, volumeMobilisable:270,
    coutProjet:42000, travaux:"",
    photos:0, statut:"projet",
    lat:46.49, lng:2.91,
  },
  {
    id:"TRC-003", nom:"Route de la Biche — section sud",
    type:"existant", proprietaire:"Propriétaire privé",
    parcelles:["A 034"], surface:3.8,
    portance:"legere", largeur:2.8, pentePct:6,
    placeDepot:true, retournement:false, accesIncendie:"Oui — à améliorer",
    tonnageMobilisable:85, volumeMobilisable:120,
    coutProjet:8500, travaux:"Élargissement 2025 prévu",
    photos:1, statut:"a_ameliorer",
  },
];
const STATUT_TRONCON = {
  operationnel:  {l:"Opérationnel",   col:"#065F46", bg:"#D1FAE5", icon:"✅"},
  a_ameliorer:   {l:"À améliorer",    col:"#B45309", bg:"#FEF3C7", icon:"⚠️"},
  projet:        {l:"Projet",         col:"#7C3AED", bg:"#EDE9FE", icon:"📐"},
  ferme:         {l:"Fermé / interdit",col:"#991B1B",bg:"#FEE2E2", icon:"🚫"},
};

// ── APPLITAG DATA — SIGNALEMENTS ANOMALIES DESSERTES ─────────────
const SIGNALEMENTS_KEY = "applitag_signalements_desserte";
const signalementsGet = () => { try { return JSON.parse(localStorage.getItem(SIGNALEMENTS_KEY)||"[]"); } catch { return []; } };
const signalementsSet = (arr) => { try { localStorage.setItem(SIGNALEMENTS_KEY, JSON.stringify(arr)); } catch { /* noop */ } };

const TYPES_ANOMALIE = [
  {id:"orniere",     label:"Ornières / nids-de-poule",  icon:"🕳️", urgence:"orange"},
  {id:"ravinement",  label:"Ravinement",                icon:"🌊", urgence:"orange"},
  {id:"arbre_tombe", label:"Arbre tombé",               icon:"🌳", urgence:"rouge"},
  {id:"vegetation",  label:"Végétation envahissante",   icon:"🌿", urgence:"jaune"},
  {id:"pont_buse",   label:"Pont / buse dégradé",       icon:"🌉", urgence:"rouge"},
  {id:"largeur",     label:"Largeur insuffisante",      icon:"↔️", urgence:"orange"},
  {id:"fosse",       label:"Fossé bouché / débordement",icon:"💧", urgence:"orange"},
  {id:"affaissement",label:"Affaissement de chaussée",  icon:"⬇️", urgence:"rouge"},
  {id:"glissement",  label:"Glissement de terrain",     icon:"⛰️", urgence:"rouge"},
  {id:"barriere",    label:"Barrière bloquée / cassée", icon:"🚧", urgence:"orange"},
  {id:"signalisation",label:"Signalisation manquante",  icon:"🪧", urgence:"jaune"},
  {id:"incendie",    label:"Traces d'incendie",         icon:"🔥", urgence:"rouge"},
  {id:"autre",       label:"Autre",                     icon:"❓", urgence:"jaune"},
];
const URGENCES = {
  rouge:  {label:"Urgent — accès bloqué",   col:"#991B1B", bg:"#FEE2E2", icon:"🔴"},
  orange: {label:"Dégradation notable",     col:"#C2410C", bg:"#FFEDD5", icon:"🟠"},
  jaune:  {label:"Signalement préventif",   col:"#92400E", bg:"#FEF3C7", icon:"🟡"},
};
const SOURCES_PROFIL = [
  "Opérateur terrain","Propriétaire forestier","ETF","Expert forestier","Mandataire",
  "Conducteur de travaux","Chauffeur transport","Collectivité","Administration","Autre",
];

const DEMO_SIGNALEMENTS = [
  {id:"sg1",createdAt:"2026-08-05T07:12:00Z",auteur:"Martin Dupont",profil:"Opérateur terrain",
   tronconId:"TRC-003",tronconNom:"Route de la Biche — section sud",
   type:"arbre_tombe",urgence:"rouge",commentaire:"Chêne traversant la piste sur 50 m, passage impossible.",
   gps:{lat:46.495,lng:2.883},photos:2,statut:"ouvert",commune:"Saint-Bonnet-Tronçais",
   validePar:null,traitePar:null,dateTraitement:null},
  {id:"sg2",createdAt:"2026-08-04T14:30:00Z",auteur:"Claire Laurent",profil:"Mandataire",
   tronconId:"TRC-001",tronconNom:"Chemin des Battets — section nord",
   type:"fosse",urgence:"orange",commentaire:"Fossé nord bouché sur 30 m après la pluie du 3 août. Eau sur chaussée.",
   gps:{lat:46.512,lng:2.891},photos:1,statut:"ouvert",commune:"Saint-Bonnet-Tronçais",
   validePar:null,traitePar:null,dateTraitement:null},
  {id:"sg3",createdAt:"2026-07-28T09:00:00Z",auteur:"Commune de Tronçais",profil:"Collectivité",
   tronconId:"TRC-002",tronconNom:"Piste de la Corniche",
   type:"vegetation",urgence:"jaune",commentaire:"Végétation envahissante sur 200 m côté amont. Réduction de la largeur visible.",
   gps:{lat:46.491,lng:2.912},photos:0,statut:"traite",commune:"Tronçais",
   validePar:"Admin APPLITAG",traitePar:"Sylviculture Allier",dateTraitement:"2026-08-01"},
];

// Composant banque de données cartographiée
export const SectionApplitgData = ({onSignaler}) => {
  const [signalements, setSignalements] = useState(()=>{
    const d=signalementsGet(); return d.length?d:[...DEMO_SIGNALEMENTS];
  });
  const [filtre, setFiltre] = useState("tous"); // tous | ouvert | traite
  const [filtreUrgence, setFiltreUrgence] = useState("tous");

  const displayed = signalements
    .filter(s=> filtre==="tous" || s.statut===filtre)
    .filter(s=> filtreUrgence==="tous" || s.urgence===filtreUrgence)
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  const nbOuverts = signalements.filter(s=>s.statut==="ouvert").length;
  const nbUrgents = signalements.filter(s=>s.statut==="ouvert"&&s.urgence==="rouge").length;
  const nbParType = {};
  signalements.forEach(s=>{ nbParType[s.type]=(nbParType[s.type]||0)+1; });

  const marquerTraite = (id) => {
    const upd = signalements.map(s=>s.id===id?{...s,statut:"traite",dateTraitement:todayS(),traitePar:"Gestionnaire"}:s);
    setSignalements(upd); signalementsSet(upd);
  };

  return (
    <div style={{padding:PADDING,maxWidth:680,margin:"0 auto"}}>
      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#1E3A5F 0%,#1E5B3A 100%)",borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🗄️</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>APPLITAG Data</div>
        <div style={{fontSize:13,opacity:.85}}>Banque de données des anomalies dessertes forestières — signalements terrain collaboratifs</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>🚨 {nbUrgents} urgent{nbUrgents>1?"s":""}</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>📋 {nbOuverts} ouvert{nbOuverts>1?"s":""}</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>✅ {signalements.filter(s=>s.statut==="traite").length} traité{signalements.filter(s=>s.statut==="traite").length>1?"s":""}</span>
        </div>
      </div>

      {/* Bouton signaler rapide */}
      <button onClick={onSignaler} style={{
        width:"100%",height:BTN_H,borderRadius:12,border:"none",marginBottom:16,
        background:"#991B1B",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        🚨 Signaler une anomalie
      </button>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Tous"],["ouvert","Ouverts"],["traite","Traités"]].map(([id,l])=>(
          <button key={id} onClick={()=>setFiltre(id)} style={{
            padding:"6px 12px",borderRadius:99,fontSize:12,fontWeight:filtre===id?700:400,
            border:`1.5px solid ${filtre===id?"#1E3A5F":C.bd}`,
            background:filtre===id?"#1E3A5F":"#fff",color:filtre===id?"#fff":C.tx2,cursor:"pointer"}}>
            {l}
          </button>
        ))}
        <div style={{flex:1}}/>
        {["tous","rouge","orange","jaune"].map(u=>{
          const info=u==="tous"?null:URGENCES[u];
          return (
            <button key={u} onClick={()=>setFiltreUrgence(u)} style={{
              padding:"6px 12px",borderRadius:99,fontSize:12,fontWeight:filtreUrgence===u?700:400,
              border:`1.5px solid ${filtreUrgence===u?(info?.col||"#1E3A5F"):C.bd}`,
              background:filtreUrgence===u?(info?.bg||"#1E3A5F"):"#fff",
              color:filtreUrgence===u?(info?.col||"#fff"):C.tx2,cursor:"pointer"}}>
              {info?info.icon:"🔍"} {info?info.label.split(" ")[0]:"Tous"}
            </button>
          );
        })}
      </div>

      {/* Carte placeholder des points */}
      <div style={{background:"#F0F9FF",border:"1px solid #BFDBFE",borderRadius:12,
        padding:"12px 16px",marginBottom:12,fontSize:12,color:"#1E3A5F"}}>
        <div style={{fontWeight:700,marginBottom:6}}>🗺️ Carte APPLITAG Data — {displayed.length} signalement(s) affiché(s)</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {displayed.map(s=>{
            const t=TYPES_ANOMALIE.find(a=>a.id===s.type)||TYPES_ANOMALIE[12];
            const u=URGENCES[s.urgence]||URGENCES.jaune;
            return (
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",
                borderRadius:99,fontSize:11,background:u.bg,color:u.col,fontWeight:600}}>
                {t.icon} {s.tronconNom?.split("—")[0].trim()||s.tronconId}
              </div>
            );
          })}
        </div>
        <div style={{marginTop:6,fontSize:11,opacity:.7}}>Intégration cartographique IGN/OSM prévue — les coordonnées GPS sont déjà enregistrées.</div>
      </div>

      {/* Liste des signalements */}
      {displayed.length===0?(
        <div style={{textAlign:"center",padding:40,color:C.tx3}}>Aucun signalement correspondant</div>
      ):displayed.map(s=>{
        const t=TYPES_ANOMALIE.find(a=>a.id===s.type)||TYPES_ANOMALIE[12];
        const u=URGENCES[s.urgence]||URGENCES.jaune;
        const dateS=new Date(s.createdAt).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
        return (
          <div key={s.id} style={{background:"#fff",borderRadius:12,border:`1.5px solid ${s.statut==="ouvert"?u.col+"66":C.bd}`,
            padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{t.icon} {t.label}</div>
                <div style={{fontSize:12,color:C.tx3,marginTop:1}}>{s.tronconNom||s.tronconId} · {s.commune}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
                <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:u.bg,color:u.col}}>
                  {u.icon} {u.label}
                </span>
                <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:600,
                  background:s.statut==="traite"?C.greenL:"#FEF3C7",
                  color:s.statut==="traite"?C.greenD:C.amber}}>
                  {s.statut==="traite"?"✅ Traité":"🔴 Ouvert"}
                </span>
              </div>
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.5,marginBottom:6,fontStyle:"italic"}}>
              "{s.commentaire}"
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
              <div style={{fontSize:11,color:C.tx3}}>
                Par <strong>{s.auteur}</strong> ({s.profil}) · {dateS}
                {s.gps&&<span> · 📍 {s.gps.lat.toFixed(4)}, {s.gps.lng.toFixed(4)}</span>}
                {s.photos>0&&<span> · 📷 {s.photos} photo(s)</span>}
              </div>
              {s.statut==="ouvert"&&(
                <button onClick={()=>marquerTraite(s.id)} style={{
                  padding:"5px 12px",borderRadius:8,border:`1px solid ${C.green}`,
                  background:C.greenL,color:C.greenD,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  ✅ Marquer traité
                </button>
              )}
              {s.statut==="traite"&&s.traitePar&&(
                <div style={{fontSize:11,color:C.tx3}}>Traité par {s.traitePar} · {s.dateTraitement}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── DFCI — Données complémentaires ──────────────────────────────
const PRATICABILITE_OPTS = [
  {id:"praticable",  label:"Praticable",            icon:"🟢", col:"#065F46", bg:"#D1FAE5"},
  {id:"conditions",  label:"Praticable sous conditions",icon:"🟡",col:"#92400E",bg:"#FEF3C7"},
  {id:"degradee",    label:"Dégradée",              icon:"🟠", col:"#C2410C", bg:"#FFEDD5"},
  {id:"impraticable",label:"Impraticable",          icon:"🔴", col:"#991B1B", bg:"#FEE2E2"},
  {id:"a_verifier",  label:"À vérifier",            icon:"⬜", col:"#475569", bg:"#F1F5F9"},
  {id:"priorite_incendie",label:"Priorité incendie",icon:"🚨", col:"#7F1D1D", bg:"#FEE2E2"},
];
const OBSTACLES_TYPES = [
  "Ornières profondes","Ravinement","Arbres tombés","Végétation envahissante",
  "Pont / buse dégradé","Largeur insuffisante","Fossé bouché","Affaissement de chaussée","Glissement de terrain",
];
const DEMO_DIAGNOSTICS = [
  {id:"d1",tronconId:"TRC-001",date:"2026-07-15",praticabilite:"praticable",
   obstacles:[],commentaire:"RAS — entretien fossés réalisé en juin.",
   photos:2,validePar:"J. Dupont",dernierPassage:"2026-07-15"},
  {id:"d2",tronconId:"TRC-003",date:"2026-07-20",praticabilite:"degradee",
   obstacles:["Ornières profondes","Végétation envahissante"],
   commentaire:"Ornières sur 80 m en sortie de coude. Passage tracteur limité.",
   photos:3,validePar:"M. Laurent",dernierPassage:"2026-07-20"},
];
const DEMO_POINTS_DFCI = [
  {id:"dfci1",type:"citerne",nom:"Citerne DFCI — Battets",tronconId:"TRC-001",
   capacite:"60 m³",gps:{lat:46.511,lng:2.892},acces:"Accès direct piste TRC-001",
   etat:"ok",dernierControle:"2026-05-10",responsable:"ONF Allier"},
  {id:"dfci2",type:"point_eau",nom:"Mare du Bois Rond",tronconId:"TRC-003",
   capacite:"Naturel",gps:{lat:46.498,lng:2.889},acces:"150 m depuis TRC-003",
   etat:"a_verifier",dernierControle:"2025-10-15",responsable:"Commune"},
  {id:"dfci3",type:"retournement",nom:"Aire de retournement Nord",tronconId:"TRC-001",
   capacite:"Camion 10 t",gps:{lat:46.513,lng:2.890},acces:"Fin de TRC-001",
   etat:"ok",dernierControle:"2026-07-15",responsable:"Commune de Tronçais"},
];
const DFCI_TYPE_INFO = {
  citerne:      {icon:"🚒",label:"Citerne DFCI",   col:"#991B1B",bg:"#FEE2E2"},
  point_eau:    {icon:"💧",label:"Point d'eau",     col:"#1E3A5F",bg:"#DBEAFE"},
  retournement: {icon:"🔄",label:"Retournement",    col:"#065F46",bg:"#D1FAE5"},
  croix:        {icon:"📍",label:"Balisage / croix",col:"#7C3AED",bg:"#EDE9FE"},
};

// Calcul priorité de rénovation (score 1-10)
const calcPriorite = (t, diag) => {
  let score = 0;
  if (t.accesIncendie?.toLowerCase().includes("non"))    score += 4;
  if (t.accesIncendie?.toLowerCase().includes("améliorer")) score += 2;
  if (diag?.praticabilite === "impraticable")             score += 3;
  if (diag?.praticabilite === "degradee")                 score += 2;
  if (!t.retournement)                                    score += 1;
  if (t.largeur < 3.5)                                    score += 1;
  if (t.tonnageMobilisable > 200)                         score += 1;
  if (diag?.obstacles?.length > 1)                        score += 1;
  return Math.min(score, 10);
};

// ── PERMIS QUOTIDIEN DE CHANTIER — INCENDIE FORÊT ───────────────
const NIVEAUX_RESTRICTION = [
  {id:"aucune",  label:"Aucune restriction",     icon:"🟢", couleur:"#065F46", bg:"#D1FAE5"},
  {id:"faible",  label:"Niveau faible",          icon:"🟡", couleur:"#92400E", bg:"#FEF3C7"},
  {id:"eleve",   label:"Niveau élevé",           icon:"🟠", couleur:"#C2410C", bg:"#FFEDD5"},
  {id:"tres_eleve",label:"Très élevé",           icon:"🔴", couleur:"#991B1B", bg:"#FEE2E2"},
  {id:"interdit",label:"Travaux interdits",      icon:"⛔", couleur:"#7F1D1D", bg:"#FEE2E2"},
];

// ── APPLITAG SCIERIE — MVP ───────────────────────────────────────

const SCIERIE_KEY_GRUMES    = "applitag_scierie_grumes";
const SCIERIE_KEY_COPRODUITS= "applitag_scierie_coproduits";
const SCIERIE_KEY_ENLEV     = "applitag_scierie_enlev";
const LOTS_SECONDAIRES_KEY  = "applitag_lots_secondaires";
const scierieGet = (key) => { try { return JSON.parse(localStorage.getItem(key)||"[]"); } catch { return []; } };
const lotsSecGet = () => { try { return JSON.parse(localStorage.getItem(LOTS_SECONDAIRES_KEY)||"[]"); } catch { return []; } };
const lotsSecSet = (arr) => { try { localStorage.setItem(LOTS_SECONDAIRES_KEY,JSON.stringify(arr)); } catch { /* noop */ } };
const scierieSet = (key,arr) => { try { localStorage.setItem(key,JSON.stringify(arr)); } catch { /* noop */ } };

const ESSENCES_GRUMES = ["Chêne","Hêtre","Douglas","Pin sylvestre","Épicéa","Sapin","Frêne","Peuplier","Châtaignier","Autres"];
const QUALITES_GRUME  = ["A (grume d'œuvre)","B (bois d'industrie)","C (bois énergie)","Déclassé"];
const TYPES_COPRODUIT = [
  {id:"sciure",    label:"Sciure",           icon:"🟡", unite:"t"},
  {id:"ecorce",    label:"Écorces",          icon:"🟤", unite:"t"},
  {id:"plaquette", label:"Plaquettes",       icon:"🟢", unite:"t"},
  {id:"dosses",    label:"Dosses / chutes",  icon:"🪵", unite:"stères"},
  {id:"connexe_be",label:"Bois énergie tronc",icon:"🔥",unite:"t"},
];
const DESTINATIONS_COPRODUIT = ["Chaufferie","Particulier","Agriculteur","Pépiniériste","Plateforme bois énergie","Compostage","Interne / non valorisé"];

const DEMO_GRUMES = [
  {id:"g1",date:"2026-07-28",fournisseur:"Forêt Bernard",essence:"Chêne",qualite:"A (grume d'œuvre)",volume:18.5,prix:95,origine:"Tronçais (03)",ref:"GR-2026-001"},
  {id:"g2",date:"2026-07-30",fournisseur:"CUMA Bois Est",essence:"Douglas",qualite:"A (grume d'œuvre)",volume:32.0,prix:68,origine:"Vosges (88)",ref:"GR-2026-002"},
  {id:"g3",date:"2026-08-01",fournisseur:"Prop. Martin",essence:"Hêtre",qualite:"B (bois d'industrie)",volume:11.2,prix:55,origine:"Haute-Marne (52)",ref:"GR-2026-003"},
];
const DEMO_COPRODUITS = [
  {id:"cp1",grumeRef:"GR-2026-001",type:"sciure",qte:2.8,humidite:18,destination:"Chaufferie",prix:0,statut:"disponible"},
  {id:"cp2",grumeRef:"GR-2026-001",type:"ecorce",qte:1.4,humidite:42,destination:"Compostage",prix:0,statut:"disponible"},
  {id:"cp3",grumeRef:"GR-2026-002",type:"plaquette",qte:6.5,humidite:25,destination:"Chaufferie",prix:28,statut:"vendu"},
  {id:"cp4",grumeRef:"GR-2026-002",type:"dosses",qte:4.2,humidite:20,destination:"Particulier",prix:15,statut:"disponible"},
];
const DEMO_ENLEVEMENTS = [
  {id:"e1",date:"2026-08-02",client:"Chaufferie Communale Épinal",coproduitType:"plaquette",qte:6.5,prix:28,transporteur:"Camion Rossi",statut:"livré"},
];

export const SectionScierie = () => {
  const [tab,      setTab]    = useState("grumes");
  const [grumes,   setGrumes] = useState(() => { const d=scierieGet(SCIERIE_KEY_GRUMES); return d.length?d:[...DEMO_GRUMES]; });
  const [coprods,  setCoprods]= useState(() => { const d=scierieGet(SCIERIE_KEY_COPRODUITS); return d.length?d:[...DEMO_COPRODUITS]; });
  const [enlevs,   setEnlevs] = useState(() => { const d=scierieGet(SCIERIE_KEY_ENLEV); return d.length?d:[...DEMO_ENLEVEMENTS]; });

  // ── Formulaire grume
  const [gDate,setGDate]       = useState(todayS());
  const [gFourn,setGFourn]     = useState("");
  const [gEss,setGEss]         = useState("Chêne");
  const [gQual,setGQual]       = useState("A (grume d'œuvre)");
  const [gVol,setGVol]         = useState("");
  const [gPrix,setGPrix]       = useState("");
  const [gOrig,setGOrig]       = useState("");
  const [gSaved,setGSaved]     = useState(false);

  // ── Formulaire coproduit
  const [cpGrume,setCpGrume]   = useState("");
  const [cpType,setCpType]     = useState("sciure");
  const [cpQte,setCpQte]       = useState("");
  const [cpHum,setCpHum]       = useState("");
  const [cpDest,setCpDest]     = useState("Chaufferie");
  const [cpPrix,setCpPrix]     = useState("");
  const [cpSaved,setCpSaved]   = useState(false);

  // ── Formulaire enlèvement
  const [eDate,setEDate]       = useState(todayS());
  const [eClient,setEClient]   = useState("");
  const [eCp,setECp]           = useState("");
  const [eQte,setEQte]         = useState("");
  const [ePrix,setEPrix]       = useState("");
  const [eTrans,setETrans]     = useState("");
  const [eSaved,setESaved]     = useState(false);

  const addGrume = () => {
    if (!gFourn || !gVol) return;
    const g = {id:uid(),date:gDate,fournisseur:gFourn,essence:gEss,qualite:gQual,
      volume:parseFloat(gVol),prix:parseFloat(gPrix)||0,origine:gOrig,
      ref:`GR-${gDate.replace(/-/g,"").slice(2)}-${String(grumes.length+1).padStart(3,"0")}`};
    const upd=[g,...grumes]; setGrumes(upd); scierieSet(SCIERIE_KEY_GRUMES,upd);
    setGFourn(""); setGVol(""); setGPrix(""); setGOrig("");
    setGSaved(true); setTimeout(()=>setGSaved(false),2500);
  };

  const addCoproduit = () => {
    if (!cpQte || !cpGrume) return;
    const cp = {id:uid(),grumeRef:cpGrume,type:cpType,qte:parseFloat(cpQte),
      humidite:parseFloat(cpHum)||0,destination:cpDest,prix:parseFloat(cpPrix)||0,statut:"disponible"};
    const upd=[cp,...coprods]; setCoprods(upd); scierieSet(SCIERIE_KEY_COPRODUITS,upd);
    setCpQte(""); setCpHum(""); setCpPrix(""); setCpGrume("");
    setCpSaved(true); setTimeout(()=>setCpSaved(false),2500);
  };

  const addEnlevement = () => {
    if (!eClient || !eQte) return;
    const cpSel = TYPES_COPRODUIT.find(t=>t.id===eCp)||TYPES_COPRODUIT[0];
    const annee = eDate.slice(0,4);
    const existants = lotsSecGet();
    const seq = String(existants.length+1).padStart(3,"0");
    const lotNum = `LOT-SC-${annee}-${seq}`;
    // LOT secondaire traçable
    const lotSec = {
      id: uid(), lotNumero: lotNum, type: "coproduit_scierie",
      createdAt: new Date().toISOString(), date: eDate,
      origine: "Scierie", coproduitType: eCp, coproduitLabel: cpSel.label,
      tonnage: parseFloat(eQte), prixTonne: parseFloat(ePrix)||0,
      destination: eClient, transporteur: eTrans,
      statut: "EN_LIVRAISON", source: "scierie",
    };
    lotsSecSet([lotSec,...existants]);
    const e = {id:uid(),date:eDate,client:eClient,coproduitType:eCp,
      coproduitLabel:cpSel.label,qte:parseFloat(eQte),prix:parseFloat(ePrix)||0,
      transporteur:eTrans,statut:"planifié", lotSecondaire: lotNum};
    const upd=[e,...enlevs]; setEnlevs(upd); scierieSet(SCIERIE_KEY_ENLEV,upd);
    setEClient(""); setEQte(""); setEPrix(""); setETrans("");
    setESaved(true); setTimeout(()=>setESaved(false),2500);
  };

  // ── Calculs marges
  const revenuGrumes   = grumes.reduce((s,g)=>s+g.volume*g.prix,0);
  const revenuCoprods  = coprods.filter(c=>c.statut==="vendu").reduce((s,c)=>s+c.qte*c.prix,0);
  const revenuEnlevs   = enlevs.reduce((s,e)=>s+e.qte*e.prix,0);
  const stockDispo     = coprods.filter(c=>c.statut==="disponible");
  const totalVolGrumes = grumes.reduce((s,g)=>s+g.volume,0);

  const Fld = ({label,children}) => (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
      {children}
    </div>
  );
  const inp = {height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
    padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box",width:"100%"};
  const Stat = ({icon,label,val,color}) => (
    <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",flex:1,minWidth:120}}>
      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:20,fontWeight:800,color:color||C.tx,fontVariantNumeric:"tabular-nums"}}>{val}</div>
      <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{label}</div>
    </div>
  );
  const Badge = ({s}) => {
    const map={disponible:{bg:C.greenL,c:C.greenD},vendu:{bg:C.blueL,c:C.blue},livré:{bg:C.greenL,c:C.greenD},planifié:{bg:C.amberL,c:C.amber}};
    const st=map[s]||{bg:C.bg,c:C.tx3};
    return <span style={{padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:st.bg,color:st.c}}>{s}</span>;
  };

  const TABS=[
    {id:"grumes",    icon:"🪵", label:"Grumes"},
    {id:"coproduits",icon:"♻️", label:"Coproduits"},
    {id:"stocks",    icon:"📦", label:"Stocks"},
    {id:"enlevements",icon:"🚛",label:"Enlèvements"},
    {id:"marges",    icon:"📈", label:"Marges"},
  ];

  return (
    <div style={{padding:PADDING,maxWidth:680,margin:"0 auto"}}>

      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,#1E3A5F 0%,#2D6A4F 100%)`,
        borderRadius:14,padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🏭</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>APPLITAG Scierie</div>
        <div style={{fontSize:13,opacity:.8}}>Réception grumes · Coproduits · Stocks · Enlèvements · Marges</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          {[`🪵 ${grumes.length} grumes`,`♻️ ${coprods.length} coproduits`,`🚛 ${enlevs.length} enlèvements`].map(t=>(
            <span key={t} style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>{t}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:"flex",alignItems:"center",gap:5,padding:"8px 14px",
            borderRadius:10,border:`1.5px solid ${tab===t.id?"#1E3A5F":C.bd}`,
            background:tab===t.id?"#1E3A5F":"#fff",
            color:tab===t.id?"#fff":C.tx2,fontWeight:tab===t.id?700:400,
            fontSize:13,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0
          }}><span>{t.icon}</span>{t.label}</button>
        ))}
      </div>

      {/* ── Onglet GRUMES ── */}
      {tab==="grumes" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Réception des grumes</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Date réception"><input type="date" value={gDate} onChange={e=>setGDate(e.target.value)} style={inp}/></Fld>
              <Fld label="Fournisseur"><input value={gFourn} onChange={e=>setGFourn(e.target.value)} placeholder="Nom propriétaire / ETF" style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Essence">
                <select value={gEss} onChange={e=>setGEss(e.target.value)} style={{...inp,background:"#fff"}}>
                  {ESSENCES_GRUMES.map(e=><option key={e}>{e}</option>)}
                </select>
              </Fld>
              <Fld label="Qualité">
                <select value={gQual} onChange={e=>setGQual(e.target.value)} style={{...inp,background:"#fff"}}>
                  {QUALITES_GRUME.map(q=><option key={q}>{q}</option>)}
                </select>
              </Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Fld label="Volume (m³)"><input type="number" value={gVol} onChange={e=>setGVol(e.target.value)} placeholder="0.0" style={inp}/></Fld>
              <Fld label="Prix (€/m³)"><input type="number" value={gPrix} onChange={e=>setGPrix(e.target.value)} placeholder="0" style={inp}/></Fld>
              <Fld label="Origine"><input value={gOrig} onChange={e=>setGOrig(e.target.value)} placeholder="Massif / dép." style={inp}/></Fld>
            </div>
            <button onClick={addGrume} disabled={!gFourn||!gVol} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!gFourn||!gVol)?"#ccc":"#1E3A5F",color:"#fff",fontWeight:700,fontSize:15,cursor:(!gFourn||!gVol)?"not-allowed":"pointer"
            }}>+ Enregistrer la réception</button>
            {gSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.greenL,color:C.greenD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Réception enregistrée</div>}
          </div>

          {grumes.map(g=>(
            <div key={g.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{g.ref}</div>
                  <div style={{fontSize:13,color:C.tx2,marginTop:2}}>{g.fournisseur} · {g.essence} · {g.qualite}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{g.date} {g.origine&&`· ${g.origine}`}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,fontSize:16,color:C.greenD}}>{g.volume} m³</div>
                  {g.prix>0&&<div style={{fontSize:12,color:C.tx3}}>{(g.volume*g.prix).toLocaleString("fr-FR")} €</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onglet COPRODUITS ── */}
      {tab==="coproduits" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Génération des coproduits</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <Fld label="Grume d'origine">
              <select value={cpGrume} onChange={e=>setCpGrume(e.target.value)} style={{...inp,background:"#fff"}}>
                <option value="">— Sélectionner —</option>
                {grumes.map(g=><option key={g.id} value={g.ref}>{g.ref} — {g.fournisseur} ({g.essence})</option>)}
              </select>
            </Fld>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Type de coproduit">
                <select value={cpType} onChange={e=>setCpType(e.target.value)} style={{...inp,background:"#fff"}}>
                  {TYPES_COPRODUIT.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </Fld>
              <Fld label="Destination">
                <select value={cpDest} onChange={e=>setCpDest(e.target.value)} style={{...inp,background:"#fff"}}>
                  {DESTINATIONS_COPRODUIT.map(d=><option key={d}>{d}</option>)}
                </select>
              </Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Fld label={`Qté (${TYPES_COPRODUIT.find(t=>t.id===cpType)?.unite||"t"})`}>
                <input type="number" value={cpQte} onChange={e=>setCpQte(e.target.value)} placeholder="0.0" style={inp}/>
              </Fld>
              <Fld label="Humidité (%)">
                <input type="number" value={cpHum} onChange={e=>setCpHum(e.target.value)} placeholder="%" style={inp}/>
              </Fld>
              <Fld label="Prix (€/t)">
                <input type="number" value={cpPrix} onChange={e=>setCpPrix(e.target.value)} placeholder="0" style={inp}/>
              </Fld>
            </div>
            <button onClick={addCoproduit} disabled={!cpGrume||!cpQte} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!cpGrume||!cpQte)?"#ccc":"#2D6A4F",color:"#fff",fontWeight:700,fontSize:15,cursor:(!cpGrume||!cpQte)?"not-allowed":"pointer"
            }}>+ Enregistrer le coproduit</button>
            {cpSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.greenL,color:C.greenD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Coproduit enregistré</div>}
          </div>

          {coprods.map(c=>{
            const t=TYPES_COPRODUIT.find(x=>x.id===c.type)||TYPES_COPRODUIT[0];
            return (
              <div key={c.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{fontSize:12,color:C.tx3,marginTop:2}}>Grume {c.grumeRef} · {c.destination} {c.humidite>0?`· H ${c.humidite}%`:""}</div>
                </div>
                <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.tx}}>{c.qte} {t.unite}</div>
                  {c.prix>0&&<div style={{fontSize:12,color:C.green}}>{c.prix} €/{t.unite}</div>}
                  <Badge s={c.statut}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Onglet STOCKS ── */}
      {tab==="stocks" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Stocks disponibles par catégorie</h3>
          {TYPES_COPRODUIT.map(t=>{
            const items = coprods.filter(c=>c.type===t.id&&c.statut==="disponible");
            const total = items.reduce((s,c)=>s+c.qte,0);
            const revPotentiel = items.reduce((s,c)=>s+(c.prix*c.qte),0);
            if (items.length===0) return null;
            return (
              <div key={t.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:15,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{fontWeight:800,fontSize:18,color:C.greenD}}>{total.toFixed(1)} {t.unite}</div>
                </div>
                {revPotentiel>0&&<div style={{fontSize:12,color:C.tx3,marginBottom:8}}>Revenu potentiel : <strong style={{color:C.green}}>{revPotentiel.toLocaleString("fr-FR")} €</strong></div>}
                {items.map(c=>(
                  <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:`1px solid ${C.bd}`,fontSize:13}}>
                    <span style={{color:C.tx2}}>Grume {c.grumeRef} · {c.destination}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{c.qte} {t.unite} {c.humidite>0?`· H${c.humidite}%`:""}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {stockDispo.length===0&&(
            <div style={{textAlign:"center",padding:40,color:C.tx3}}>Aucun stock disponible</div>
          )}
        </div>
      )}

      {/* ── Onglet ENLÈVEMENTS ── */}
      {tab==="enlevements" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Enlèvements clients</h3>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Date"><input type="date" value={eDate} onChange={e=>setEDate(e.target.value)} style={inp}/></Fld>
              <Fld label="Client"><input value={eClient} onChange={e=>setEClient(e.target.value)} placeholder="Chaufferie, particulier..." style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label="Coproduit">
                <select value={eCp} onChange={e=>setECp(e.target.value)} style={{...inp,background:"#fff"}}>
                  {TYPES_COPRODUIT.map(t=><option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </Fld>
              <Fld label="Transporteur"><input value={eTrans} onChange={e=>setETrans(e.target.value)} placeholder="Nom transporteur" style={inp}/></Fld>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Fld label={`Quantité (${TYPES_COPRODUIT.find(t=>t.id===eCp)?.unite||"t"})`}>
                <input type="number" value={eQte} onChange={e=>setEQte(e.target.value)} placeholder="0.0" style={inp}/>
              </Fld>
              <Fld label="Prix facturé (€/t)">
                <input type="number" value={ePrix} onChange={e=>setEPrix(e.target.value)} placeholder="0" style={inp}/>
              </Fld>
            </div>
            <button onClick={addEnlevement} disabled={!eClient||!eQte} style={{
              height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:4,
              background:(!eClient||!eQte)?"#ccc":"#B45309",color:"#fff",fontWeight:700,fontSize:15,cursor:(!eClient||!eQte)?"not-allowed":"pointer"
            }}>+ Enregistrer l'enlèvement</button>
            {eSaved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.amberL,color:C.amberD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Enlèvement planifié</div>}
          </div>

          {enlevs.map(e=>{
            const t=TYPES_COPRODUIT.find(x=>x.id===e.coproduitType)||TYPES_COPRODUIT[0];
            return (
              <div key={e.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 16px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{e.client}</div>
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{e.date} · {t.icon} {t.label} {e.transporteur&&`· ${e.transporteur}`}</div>
                    {e.lotSecondaire&&(
                      <div style={{marginTop:4,display:"inline-flex",alignItems:"center",gap:4,
                        background:"#D1FAE5",borderRadius:6,padding:"2px 8px",fontSize:11,
                        fontWeight:700,color:"#065F46"}}>
                        🌲 {e.lotSecondaire}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <div style={{fontWeight:800,fontSize:15,color:C.tx}}>{e.qte} {t.unite}</div>
                    {e.prix>0&&<div style={{fontSize:12,color:C.green}}>{(e.qte*e.prix).toLocaleString("fr-FR")} €</div>}
                    <Badge s={e.statut}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Onglet MARGES ── */}
      {tab==="marges" && (
        <div>
          <h3 style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:12}}>Marges & indicateurs</h3>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            <Stat icon="🪵" label="Volume grumes reçu" val={`${totalVolGrumes.toFixed(1)} m³`} color={C.tx}/>
            <Stat icon="♻️" label="Coproduits générés" val={`${coprods.length}`} color={C.greenD}/>
            <Stat icon="📦" label="Lots dispo en stock" val={`${stockDispo.length}`} color={C.blue}/>
            <Stat icon="🚛" label="Enlèvements réalisés" val={`${enlevs.length}`} color={C.amber}/>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
            <Stat icon="💶" label="Revenu grumes estimé" val={`${revenuGrumes.toLocaleString("fr-FR")} €`} color={C.greenD}/>
            <Stat icon="💰" label="Revenu coproduits vendus" val={`${revenuCoprods.toLocaleString("fr-FR")} €`} color={C.green}/>
            <Stat icon="📤" label="CA enlèvements" val={`${revenuEnlevs.toLocaleString("fr-FR")} €`} color={C.amber}/>
          </div>

          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>📊 Revenu par type de coproduit</div>
            {TYPES_COPRODUIT.map(t=>{
              const vendus=coprods.filter(c=>c.type===t.id&&c.statut==="vendu");
              const rev=vendus.reduce((s,c)=>s+c.qte*c.prix,0);
              const vol=coprods.filter(c=>c.type===t.id).reduce((s,c)=>s+c.qte,0);
              if(vol===0) return null;
              return (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.bd}`}}>
                  <div style={{fontSize:13,color:C.tx}}>{t.icon} {t.label}</div>
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <span style={{fontSize:12,color:C.tx3}}>{vol.toFixed(1)} {t.unite} produit</span>
                    <span style={{fontSize:13,fontWeight:700,color:rev>0?C.green:C.tx3}}>{rev>0?`${rev.toLocaleString("fr-FR")} €`:"—"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{background:C.greenL,borderRadius:12,padding:"14px 16px",border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:700,color:C.greenD,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>💡 Leviers d'amélioration</div>
            <div style={{fontSize:13,color:C.greenD,lineHeight:1.6}}>
              {stockDispo.filter(c=>c.prix===0).length>0&&<div>⚠️ {stockDispo.filter(c=>c.prix===0).length} lot(s) en stock sans prix de vente défini</div>}
              {stockDispo.filter(c=>c.destination==="Interne / non valorisé").length>0&&<div>⚠️ {stockDispo.filter(c=>c.destination==="Interne / non valorisé").length} lot(s) non valorisé(s) — débouché à trouver</div>}
              {stockDispo.filter(c=>c.humidite>30).length>0&&<div>⚠️ {stockDispo.filter(c=>c.humidite>30).length} lot(s) avec humidité {">"} 30 % — valorisation réduite</div>}
              {stockDispo.length===0&&<div>✅ Tous les coproduits ont été valorisés ou enlèvements planifiés</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ACTIVITES_CONCERNEES = [
  "Exploitation forestière","Débardage","Broyage","Chargement","Déchiquetage",
  "Entretien de machines","Accès à certaines zones forestières","Brûlage dirigé",
];

const PERMIS_LOCAL_KEY = "applitag_permis_incendie";
const permisLocalGet = () => { try { return JSON.parse(localStorage.getItem(PERMIS_LOCAL_KEY)||"[]"); } catch { return []; } };
const permisLocalSave = (arr) => { try { localStorage.setItem(PERMIS_LOCAL_KEY, JSON.stringify(arr)); } catch { /* noop */ } };

export const SectionPermisIncendie = () => {
  const [tab, setTab] = useState("nouveau"); // "nouveau" | "historique"
  const [permis, setPermis] = useState(() => permisLocalGet());

  // Formulaire
  const today = todayS();
  const [date,         setDate]         = useState(today);
  const [departement,  setDepartement]  = useState("");
  const [commune,      setCommune]      = useState("");
  const [lat,          setLat]          = useState("");
  const [lng,          setLng]          = useState("");
  const [arrete,       setArrete]       = useState("");
  const [dateConsult,  setDateConsult]  = useState(() => new Date().toISOString().slice(0,16));
  const [niveau,       setNiveau]       = useState("eleve");
  const [horaires,     setHoraires]     = useState("");
  const [activites,    setActivites]    = useState([]);
  const [extinction,   setExtinction]   = useState("");
  const [acces,        setAcces]        = useState("");
  const [responsable,  setResponsable]  = useState("");
  const [photo,        setPhoto]        = useState(null);
  const [photoUrl,     setPhotoUrl]     = useState(null);
  const [saved,        setSaved]        = useState(false);
  const fileRef = useRef();

  const _niveauInfo = NIVEAUX_RESTRICTION.find(n=>n.id===niveau) || NIVEAUX_RESTRICTION[0];

  const toggleActivite = (a) => setActivites(prev =>
    prev.includes(a) ? prev.filter(x=>x!==a) : [...prev, a]
  );

  const handlePhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPhoto(f.name);
    setPhotoUrl(url);
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      setLat(pos.coords.latitude.toFixed(5));
      setLng(pos.coords.longitude.toFixed(5));
    }, () => {});
  };

  const valider = () => {
    if (!departement || !responsable || !niveau) return;
    const p = {
      id: uid(),
      createdAt: nowISO(),
      date, departement, commune,
      coordGPS: lat && lng ? {lat:parseFloat(lat), lng:parseFloat(lng)} : null,
      arrete, dateConsult, niveau,
      horaires, activites, extinction, acces, responsable,
      photo,
      ref: `PERM-${date.replace(/-/g,"")}-${departement.slice(0,3).toUpperCase()}`,
    };
    const updated = [p, ...permis];
    setPermis(updated);
    permisLocalSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const supprimer = (id) => {
    const updated = permis.filter(p=>p.id!==id);
    setPermis(updated);
    permisLocalSave(updated);
  };

  const Row = ({label, val}) => val ? (
    <div style={{display:"flex",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.bd}`,fontSize:13}}>
      <span style={{color:C.tx3,minWidth:150,flexShrink:0}}>{label}</span>
      <span style={{color:C.tx,fontWeight:500}}>{val}</span>
    </div>
  ) : null;

  return (
    <div style={{padding:PADDING,maxWidth:640,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{background:`linear-gradient(135deg,#7F1D1D 0%,#B91C1C 100%)`,borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🔥</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:4}}>
          Permis quotidien de chantier
        </div>
        <div style={{fontSize:13,opacity:.85}}>Incendie forêt — Validation avant intervention en zone à risque</div>
      </div>

      {/* Alerte arrêtés Pays de la Loire */}
      <div style={{background:"#FFF7ED",border:"1px solid #FB923C",borderRadius:10,
        padding:"12px 14px",marginBottom:16,fontSize:13,lineHeight:1.5}}>
        <div style={{fontWeight:700,color:"#C2410C",marginBottom:4}}>⚠️ Alerte active — 31 juillet 2026 à 23 h 59</div>
        <div style={{color:"#7C2D12"}}>
          Restrictions niveau élevé en vigueur : <strong>Loire-Atlantique, Mayenne, Sarthe, Vendée, Maine-et-Loire</strong>.
          L'expiration d'un arrêté ce soir ne vaut pas autorisation automatique pour lundi — vérifier si un nouvel arrêté est publié.
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["nouveau","✏️ Nouveau permis"],["historique","📋 Historique"]].map(([id,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1,padding:"10px 0",borderRadius:10,border:`1.5px solid ${tab===id?"#B91C1C":C.bd}`,
            background:tab===id?"#FEE2E2":"#fff",color:tab===id?"#991B1B":C.tx2,
            fontWeight:tab===id?700:500,fontSize:14,cursor:"pointer"
          }}>{lbl}</button>
        ))}
      </div>

      {tab==="nouveau" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Date */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Date du chantier</div>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Localisation */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Département</div>
              <input value={departement} onChange={e=>setDepartement(e.target.value)} placeholder="ex: Sarthe (72)"
                style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"0 12px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Commune</div>
              <input value={commune} onChange={e=>setCommune(e.target.value)} placeholder="Nom de commune"
                style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"0 12px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
            </div>
          </div>

          {/* GPS */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Coordonnées GPS</div>
            <div style={{display:"flex",gap:8}}>
              <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude"
                style={{flex:1,height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"0 12px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
              <input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Longitude"
                style={{flex:1,height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                  padding:"0 12px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
              <button onClick={handleGPS} style={{height:INPUT_H,padding:"0 14px",borderRadius:10,
                border:`1.5px solid ${C.blue}`,background:C.blueL,color:C.blue,cursor:"pointer",fontSize:18}}>
                📍
              </button>
            </div>
          </div>

          {/* Arrêté */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Arrêté consulté</div>
            <input value={arrete} onChange={e=>setArrete(e.target.value)}
              placeholder="Référence ou URL de l'arrêté préfectoral"
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Date & heure consultation */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Date & heure de consultation de l'arrêté</div>
            <input type="datetime-local" value={dateConsult} onChange={e=>setDateConsult(e.target.value)}
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Niveau de restriction */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Niveau de restriction</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {NIVEAUX_RESTRICTION.map(n=>(
                <label key={n.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
                  borderRadius:10,border:`2px solid ${niveau===n.id?n.couleur:C.bd}`,
                  background:niveau===n.id?n.bg:"#fff",cursor:"pointer"}}>
                  <input type="radio" name="niveau" value={n.id} checked={niveau===n.id}
                    onChange={()=>setNiveau(n.id)} style={{accentColor:n.couleur}}/>
                  <span style={{fontSize:18}}>{n.icon}</span>
                  <span style={{fontSize:14,fontWeight:niveau===n.id?700:400,color:niveau===n.id?n.couleur:C.tx}}>
                    {n.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Horaires autorisés */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Horaires autorisés</div>
            <input value={horaires} onChange={e=>setHoraires(e.target.value)}
              placeholder="ex : 6 h – 11 h, reprise possible après 19 h"
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Activités concernées */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Activités soumises à restriction</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {ACTIVITES_CONCERNEES.map(a=>{
                const sel = activites.includes(a);
                return (
                  <button key={a} onClick={()=>toggleActivite(a)} style={{
                    padding:"6px 12px",borderRadius:8,fontSize:13,cursor:"pointer",
                    border:`1.5px solid ${sel?C.red:C.bd}`,
                    background:sel?C.redL:"#fff",color:sel?C.red:C.tx2,fontWeight:sel?700:400
                  }}>{a}</button>
                );
              })}
            </div>
          </div>

          {/* Moyens d'extinction */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Moyens d'extinction disponibles</div>
            <textarea value={extinction} onChange={e=>setExtinction(e.target.value)} rows={2}
              placeholder="ex : 2 extincteurs ABC 6 kg, citerne 500 L sur tracteur, lance incendie..."
              style={{width:"100%",borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"12px 14px",fontSize:14,resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
          </div>

          {/* Accès secours */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Accès des secours</div>
            <textarea value={acces} onChange={e=>setAcces(e.target.value)} rows={2}
              placeholder="ex : RD 104 puis chemin forestier n°12, portail code 1234, point de ralliement..."
              style={{width:"100%",borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"12px 14px",fontSize:14,resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
          </div>

          {/* Photo de contrôle */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Photo de contrôle</div>
            <button onClick={()=>fileRef.current?.click()} style={{
              width:"100%",height:56,borderRadius:10,border:`2px dashed ${C.bd}`,
              background:"#fafafa",color:C.tx2,fontSize:14,cursor:"pointer"
            }}>
              📷 {photo ? photo : "Prendre une photo ou importer"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              onChange={handlePhoto} style={{display:"none"}}/>
            {photoUrl && <img src={photoUrl} alt="contrôle" style={{width:"100%",borderRadius:10,marginTop:8,objectFit:"cover",maxHeight:200}}/>}
          </div>

          {/* Responsable */}
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Responsable validant l'intervention</div>
            <input value={responsable} onChange={e=>setResponsable(e.target.value)}
              placeholder="Nom Prénom — Fonction"
              style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1.5px solid ${C.bd}`,
                padding:"0 14px",fontSize:FONT_INPUT,boxSizing:"border-box"}}/>
          </div>

          {/* Bouton valider */}
          <button onClick={valider} disabled={!departement||!responsable} style={{
            height:BTN_H,borderRadius:12,border:"none",
            background:(!departement||!responsable)?"#ccc":"#B91C1C",
            color:"#fff",fontWeight:700,fontSize:16,cursor:(!departement||!responsable)?"not-allowed":"pointer",
            marginTop:4
          }}>
            ✅ Valider le permis de chantier
          </button>

          {saved && (
            <div style={{background:"#D1FAE5",borderRadius:10,padding:"12px 14px",
              color:"#065F46",fontWeight:600,fontSize:14,textAlign:"center"}}>
              ✅ Permis enregistré — référence {permis[0]?.ref}
            </div>
          )}
        </div>
      )}

      {tab==="historique" && (
        <div>
          {permis.length===0 ? (
            <div style={{textAlign:"center",padding:40,color:C.tx3,fontSize:15}}>
              Aucun permis enregistré
            </div>
          ) : permis.map(p=>{
            const niv = NIVEAUX_RESTRICTION.find(n=>n.id===p.niveau) || NIVEAUX_RESTRICTION[0];
            return (
              <div key={p.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,
                padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:C.tx}}>{p.ref}</div>
                    <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{p.departement} · {p.date}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,fontWeight:700,
                      background:niv.bg,color:niv.couleur}}>{niv.icon} {niv.label}</span>
                    <button onClick={()=>supprimer(p.id)} style={{background:"none",border:"none",
                      color:C.tx3,cursor:"pointer",fontSize:18,padding:0}}>🗑️</button>
                  </div>
                </div>
                <Row label="Commune" val={p.commune}/>
                <Row label="Arrêté consulté" val={p.arrete}/>
                <Row label="Consulté le" val={p.dateConsult?.replace("T"," ")}/>
                <Row label="Horaires autorisés" val={p.horaires}/>
                <Row label="Activités concernées" val={p.activites?.join(", ")}/>
                <Row label="Responsable" val={p.responsable}/>
                <Row label="GPS" val={p.coordGPS?`${p.coordGPS.lat}, ${p.coordGPS.lng}`:null}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SectionDesserte = () => {
  const [tab,    setTab]    = useState("liste");
  const [sel,    setSel]    = useState(null);

  const _trc = sel ? DEMO_TRONCONS.find(t=>t.id===sel) : null;
  const totalTonnage = DEMO_TRONCONS.reduce((s,t)=>s+t.tonnageMobilisable,0);
  const totalCout    = DEMO_TRONCONS.reduce((s,t)=>s+t.coutProjet,0);

  const inp = (val,set,ph,type="text") => (
    <input type={type} value={val} onChange={e=>set(e.target.value)}
      placeholder={ph}
      style={{width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
        border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
        background:C.bg,color:C.tx,boxSizing:"border-box"}}/>
  );

  // ─ Formulaire nouveau tronçon ─
  const [fNom,         setFNom]         = useState("");
  const [fType,        setFType]        = useState("existant");
  const [fProp,        setFProp]        = useState("");
  const [fParcelles,   setFParcelles]   = useState("");
  const [fPortance,    setFPortance]    = useState("normale");
  const [fLargeur,     setFLargeur]     = useState("");
  const [fPente,       setFPente]       = useState("");
  const [fDepot,       setFDepot]       = useState(false);
  const [fRetour,      setFRetour]      = useState(false);
  const [fIncendie,    setFIncendie]    = useState(ACCES_INCENDIE_OPTS[0]);
  const [fTonnage,     setFTonnage]     = useState("");
  const [fVolume,      setFVolume]      = useState("");
  const [fCout,        setFCout]        = useState("");
  const [fTravaux,     setFTravaux]     = useState("");

  // ── Tracé GPS du tronçon ──
  const [tracePoints,  setTracePoints]  = useState([]); // [{lat,lng,alt,t}]
  const [traceActif,   setTraceActif]   = useState(false);
  const [traceDist,    setTraceDist]    = useState(0);   // mètres
  const [traceError,   setTraceError]   = useState(null);
  const watchIdRef = useRef(null);

  // Haversine (m) entre deux coordonnées
  const haversine = (a, b) => {
    const R=6371000, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
    const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  };

  const demarrerTrace = () => {
    if (!navigator.geolocation) { setTraceError("GPS non disponible sur cet appareil."); return; }
    setTracePoints([]); setTraceDist(0); setTraceError(null); setTraceActif(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt = {lat:pos.coords.latitude, lng:pos.coords.longitude,
          alt:pos.coords.altitude, t:Date.now()};
        setTracePoints(prev => {
          const dist = prev.length ? haversine(prev[prev.length-1], pt) : 0;
          setTraceDist(d => d + dist);
          return [...prev, pt];
        });
      },
      (err) => setTraceError("Erreur GPS : " + err.message),
      {enableHighAccuracy:true, maximumAge:0, timeout:10000}
    );
  };

  const arreterTrace = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTraceActif(false);
  };

  const ajouterPointManuel = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const pt = {lat:pos.coords.latitude, lng:pos.coords.longitude, alt:pos.coords.altitude, t:Date.now()};
      setTracePoints(prev => {
        const dist = prev.length ? haversine(prev[prev.length-1], pt) : 0;
        setTraceDist(d => d + dist);
        return [...prev, pt];
      });
    }, () => setTraceError("Impossible de récupérer la position."), {enableHighAccuracy:true});
  };

  const effacerTrace = () => {
    arreterTrace();
    setTracePoints([]); setTraceDist(0); setTraceError(null);
  };

  const distLabel = traceDist < 1000
    ? `${Math.round(traceDist)} m`
    : `${(traceDist/1000).toFixed(2)} km`;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            🛣️ Desserte forestière
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Tronçons · Portance · Mobilisation · Coûts · Accès incendie
          </div>
        </div>
        <button onClick={()=>setTab("nouveau")} style={{
          padding:"10px 18px",borderRadius:12,background:C.green,border:"none",
          color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
          WebkitTapHighlightColor:"transparent"}}>
          + Nouveau tronçon
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🛣️",l:"Tronçons",        v:DEMO_TRONCONS.length,      col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"⚖️",l:"Tonnage mobilisable",v:`${totalTonnage} t`,      col:"#065F46",bg:"#D1FAE5"},
          {ico:"📐",l:"Projets à créer",  v:DEMO_TRONCONS.filter(t=>t.type==="a_creer").length,col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"💶",l:"Coût total estimé",v:`${(totalCout/1000).toFixed(0)} k€`,col:"#B45309",bg:"#FEF3C7"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.v}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["liste","📋","Liste des tronçons"],["carte","🗺️","Vue territoire"],
          ["nouveau","➕","Nouveau tronçon"],["contraintes","⚠️","Contraintes & règles"],
          ["diagnostic","🔍","Diagnostic terrain"],["dfci","🚒","Accès pompiers & DFCI"],
          ["priorite","📊","Priorité travaux"],["signaler","🚨","Signaler"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#1E40AF":C.bd}`,
            background:tab===id?"#1E40AF":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── LISTE ── */}
      {tab==="liste"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_TRONCONS.map(t=>{
            const st = STATUT_TRONCON[t.statut]||STATUT_TRONCON.operationnel;
            const po = PORTANCE_OPTS.find(p=>p.v===t.portance)||PORTANCE_OPTS[1];
            const isOpen = sel===t.id;
            return (
              <div key={t.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${st.col}44`}}>
                <div onClick={()=>setSel(isOpen?null:t.id)}
                  style={{padding:"12px 14px",cursor:"pointer",
                    background:isOpen?st.bg+"50":"#fff",
                    display:"flex",alignItems:"center",gap:12,
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:12,fontWeight:800,padding:"2px 8px",borderRadius:10,
                        background:st.bg,color:st.col}}>{st.icon} {st.l}</span>
                      <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,fontWeight:700,
                        background:po.bg,color:po.col}}>{po.l}</span>
                      <span style={{fontSize:10,color:C.tx3}}>
                        {t.type==="existant"?"Existant":"À créer"}
                      </span>
                    </div>
                    <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{t.nom}</div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                      {t.proprietaire} · {t.parcelles.join(", ")} · {t.largeur} m · pente {t.pentePct}%
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#1E40AF"}}>{t.tonnageMobilisable} t</div>
                    {t.coutProjet>0&&<div style={{fontSize:10,color:C.tx3}}>{t.coutProjet.toLocaleString("fr-FR")} €</div>}
                  </div>
                  <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                </div>
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",
                    background:"#FAFAFA",display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                      {[
                        ["🛣️ Largeur",`${t.largeur} m`],
                        ["📐 Pente max",`${t.pentePct} %`],
                        ["⚖️ Portance",po.l],
                        ["🌲 Surface desservie",`${t.surface} ha`],
                        ["📦 Tonnage mobilisable",`${t.tonnageMobilisable} t`],
                        ["🌳 Volume mobilisable",`${t.volumeMobilisable} m³`],
                      ].map(([lbl,val])=>(
                        <div key={lbl} style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                          border:`1px solid ${C.bd}`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[
                        ["🅿️ Place de dépôt",t.placeDepot,"Disponible","Inexistante"],
                        ["🔄 Retournement",t.retournement,"Possible","Impossible"],
                      ].map(([lbl,ok,y,n])=>(
                        <div key={lbl} style={{background:ok?"#F0FDF4":"#FFF7ED",borderRadius:8,
                          padding:"8px 10px",border:`1px solid ${ok?"#86EFAC":"#FED7AA"}`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:12,fontWeight:700,color:ok?"#065F46":"#B45309"}}>
                            {ok?y:n}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"8px 12px",borderRadius:8,fontSize:11,
                      background:t.accesIncendie.startsWith("Oui")?"#F0FDF4":"#FEF2F2",
                      border:`1px solid ${t.accesIncendie.startsWith("Oui")?"#86EFAC":"#FECACA"}`,
                      color:t.accesIncendie.startsWith("Oui")?"#065F46":"#991B1B",fontWeight:600}}>
                      🔥 Accès incendie : {t.accesIncendie}
                    </div>
                    {t.coutProjet>0&&(
                      <div style={{padding:"8px 12px",borderRadius:8,
                        background:"#EFF6FF",border:"1px solid #BFDBFE",fontSize:11}}>
                        💶 Coût estimé : <strong>{t.coutProjet.toLocaleString("fr-FR")} €</strong>
                        {t.travaux&&<span style={{marginLeft:8,color:C.tx3}}>· {t.travaux}</span>}
                      </div>
                    )}
                    {t.photos>0&&(
                      <div style={{fontSize:11,color:"#7C3AED",fontWeight:600}}>
                        📸 {t.photos} photo{t.photos>1?"s":""} de contrôle
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NOUVEAU TRONÇON ── */}
      {tab==="nouveau"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:13,fontWeight:800,color:C.tx,marginBottom:14}}>
            📐 Créer un nouveau tronçon
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Nom + Type */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Nom du tronçon</div>
                {inp(fNom,setFNom,"Ex : Chemin des Battets — section nord")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Type</div>
                <div style={{display:"flex",gap:6}}>
                  {[["existant","✅ Existant"],["a_creer","📐 À créer"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setFType(v)} style={{
                      flex:1,padding:"8px 10px",borderRadius:9,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",
                      border:`1.5px solid ${fType===v?"#1E40AF":C.bd}`,
                      background:fType===v?"#DBEAFE":"#fff",color:fType===v?"#1E40AF":C.tx2,
                      WebkitTapHighlightColor:"transparent"}}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            {/* Propriétaire + Parcelles */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Propriétaire</div>
                {inp(fProp,setFProp,"Commune, propriétaire privé…")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>
                  Parcelles desservies
                </div>
                {inp(fParcelles,setFParcelles,"B 112, B 113, C 218…")}
              </div>
            </div>
            {/* Portance */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Portance</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {PORTANCE_OPTS.map(p=>(
                  <button key={p.v} onClick={()=>setFPortance(p.v)} style={{
                    padding:"8px 14px",borderRadius:10,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`1.5px solid ${fPortance===p.v?p.col:C.bd}`,
                    background:fPortance===p.v?p.bg:"#fff",color:fPortance===p.v?p.col:C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>{p.l}</button>
                ))}
              </div>
            </div>
            {/* Dimensions + Pente */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Largeur (m)</div>
                {inp(fLargeur,setFLargeur,"ex : 3.5","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Pente max (%)</div>
                {inp(fPente,setFPente,"ex : 12","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Coût projet (€)</div>
                {inp(fCout,setFCout,"0 si existant","number")}
              </div>
            </div>
            {/* Tonnage / Volume */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Tonnage mobilisable (t)</div>
                {inp(fTonnage,setFTonnage,"ex : 250","number")}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Volume mobilisable (m³)</div>
                {inp(fVolume,setFVolume,"ex : 380","number")}
              </div>
            </div>
            {/* Cases */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[
                [fDepot,setFDepot,"🅿️ Place de dépôt"],
                [fRetour,setFRetour,"🔄 Retournement"],
              ].map(([val,set,lbl])=>(
                <button key={lbl} onClick={()=>set(!val)} style={{
                  display:"flex",alignItems:"center",gap:8,padding:"9px 14px",
                  borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontSize:12,
                  border:`1.5px solid ${val?"#065F46":C.bd}`,
                  background:val?"#D1FAE5":"#fff",color:val?"#065F46":C.tx2,
                  WebkitTapHighlightColor:"transparent"}}>
                  <span style={{fontSize:16}}>{val?"✅":"⬜"}</span>{lbl}
                </button>
              ))}
            </div>
            {/* Accès incendie */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>
                🔥 Accès incendie
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {ACCES_INCENDIE_OPTS.map(o=>(
                  <button key={o} onClick={()=>setFIncendie(o)} style={{
                    padding:"8px 12px",borderRadius:9,textAlign:"left",fontSize:11,
                    cursor:"pointer",fontFamily:"inherit",
                    border:`1.5px solid ${fIncendie===o?"#065F46":C.bd}`,
                    background:fIncendie===o?"#D1FAE5":"#fff",
                    color:fIncendie===o?"#065F46":C.tx2,
                    WebkitTapHighlightColor:"transparent"}}>{o}</button>
                ))}
              </div>
            </div>
            {/* Travaux */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>
                Travaux réalisés / prévus
              </div>
              <textarea value={fTravaux} onChange={e=>setFTravaux(e.target.value)}
                rows={3} placeholder="Ex : Entretien fossés 2024, élargissement section…"
                style={{width:"100%",padding:"8px 11px",borderRadius:9,fontSize:12,
                  border:`1.5px solid ${C.bd}`,fontFamily:"inherit",outline:"none",
                  background:C.bg,color:C.tx,boxSizing:"border-box",resize:"vertical"}}/>
            </div>
            {/* ── TRACÉ GPS ── */}
            <div style={{borderRadius:12,border:`2px solid ${traceActif?"#1E40AF":C.bd}`,
              background:traceActif?"#EFF6FF":"#fff",padding:"14px 16px",transition:"all .2s"}}>
              <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                📍 Tracé GPS du tronçon
                {traceActif&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"#1E40AF",color:"#fff",fontWeight:700,animation:"pulse 1s infinite"}}>● EN COURS</span>}
              </div>

              {/* Compteurs temps réel */}
              {(tracePoints.length>0||traceActif)&&(
                <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                  {[
                    {icon:"📍",label:"Points capturés",val:`${tracePoints.length}`},
                    {icon:"📏",label:"Distance",val:distLabel},
                    ...(tracePoints.length>0?[{icon:"🕐",label:"Dernier point",val:new Date(tracePoints[tracePoints.length-1].t).toLocaleTimeString("fr-FR")}]:[]),
                  ].map(s=>(
                    <div key={s.label} style={{background:"#DBEAFE",borderRadius:10,padding:"8px 12px",flex:1,minWidth:90,textAlign:"center"}}>
                      <div style={{fontSize:16}}>{s.icon}</div>
                      <div style={{fontWeight:800,fontSize:15,color:"#1E3A5F",fontVariantNumeric:"tabular-nums"}}>{s.val}</div>
                      <div style={{fontSize:10,color:"#1E40AF"}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mini-tracé visuel */}
              {tracePoints.length>1&&(()=>{
                const lats=tracePoints.map(p=>p.lat), lngs=tracePoints.map(p=>p.lng);
                const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
                const W=280,H=80,pad=8;
                const sx=lng=>pad+(lng-minLng)/(maxLng-minLng||1)*(W-2*pad);
                const sy=lat=>H-pad-(lat-minLat)/(maxLat-minLat||1)*(H-2*pad);
                const pts=tracePoints.map(p=>`${sx(p.lng).toFixed(1)},${sy(p.lat).toFixed(1)}`).join(" ");
                return (
                  <div style={{marginBottom:10,borderRadius:10,overflow:"hidden",border:`1px solid #BFDBFE`,background:"#F0F9FF"}}>
                    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
                      <polyline points={pts} fill="none" stroke="#1E40AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Départ */}
                      <circle cx={sx(tracePoints[0].lng)} cy={sy(tracePoints[0].lat)} r="5" fill="#065F46"/>
                      <text x={sx(tracePoints[0].lng)+7} y={sy(tracePoints[0].lat)+4} fontSize="9" fill="#065F46" fontWeight="700">Départ</text>
                      {/* Arrivée */}
                      <circle cx={sx(tracePoints[tracePoints.length-1].lng)} cy={sy(tracePoints[tracePoints.length-1].lat)} r="5" fill={traceActif?"#1E40AF":"#991B1B"}/>
                      {!traceActif&&<text x={sx(tracePoints[tracePoints.length-1].lng)+7} y={sy(tracePoints[tracePoints.length-1].lat)+4} fontSize="9" fill="#991B1B" fontWeight="700">Fin</text>}
                    </svg>
                  </div>
                );
              })()}

              {traceError&&(
                <div style={{background:"#FEE2E2",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#991B1B",marginBottom:10}}>
                  ⚠️ {traceError}
                </div>
              )}

              {/* Boutons de contrôle */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {!traceActif?(
                  <button onClick={demarrerTrace} style={{
                    flex:2,height:44,borderRadius:10,border:"none",
                    background:"#1E40AF",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    ▶ Démarrer le tracé GPS
                  </button>
                ):(
                  <button onClick={arreterTrace} style={{
                    flex:2,height:44,borderRadius:10,border:"none",
                    background:"#991B1B",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    ⏹ Terminer le tracé
                  </button>
                )}
                <button onClick={ajouterPointManuel} disabled={traceActif} style={{
                  flex:1,height:44,borderRadius:10,border:`1.5px solid ${C.blue}`,
                  background:traceActif?"#e5e7eb":C.blueL,color:traceActif?C.tx3:C.blue,
                  fontWeight:600,fontSize:13,cursor:traceActif?"not-allowed":"pointer"}}>
                  📍 Point manuel
                </button>
                {tracePoints.length>0&&!traceActif&&(
                  <button onClick={effacerTrace} style={{
                    height:44,padding:"0 14px",borderRadius:10,border:`1.5px solid ${C.bd}`,
                    background:"#fff",color:C.tx3,fontWeight:600,fontSize:13,cursor:"pointer"}}>
                    🗑️
                  </button>
                )}
              </div>

              {/* Guide */}
              {tracePoints.length===0&&!traceActif&&(
                <div style={{marginTop:10,fontSize:11,color:C.tx3,lineHeight:1.6}}>
                  <strong>▶ Démarrer le tracé</strong> : conduisez ou marchez sur la piste — l'app enregistre un point toutes les 8 s.<br/>
                  <strong>📍 Point manuel</strong> : pour les zones sans signal, capturez chaque virage manuellement.
                </div>
              )}
            </div>

            <button style={{padding:"12px",borderRadius:12,background:"#1E40AF",border:"none",
              color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
              WebkitTapHighlightColor:"transparent"}}
              onClick={()=>setTab("liste")}>
              ✓ Enregistrer le tronçon {tracePoints.length>0?`(tracé ${distLabel} — ${tracePoints.length} pts)`:""}
            </button>
          </div>
        </div>
      )}

      {/* ── CONTRAINTES ── */}
      {tab==="contraintes"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              ⚠️ Règles techniques de desserte forestière
            </div>
            {[
              {titre:"Pente maximale",detail:"12 % pour les engins de débardage courants. Au-delà, étude de faisabilité requise. En zone humide : 8 % recommandé.",col:"#991B1B",bg:"#FEE2E2"},
              {titre:"Largeur minimale",detail:"3,5 m de plateforme pour permettre le croisement avec une marge latérale. Voie principale : 4 m recommandé. Accès DFCI : 4 m minimum.",col:"#B45309",bg:"#FEF3C7"},
              {titre:"Portance minimale poids lourds",detail:"19 t admissibles pour un grumier. Vérifier les ouvrages d'art (ponts, buses) indépendamment de la chaussée.",col:"#1E40AF",bg:"#DBEAFE"},
              {titre:"Place de dépôt",detail:"Superficie minimale 400 m² pour un stockage bord de route opérationnel. Drainage impératif.",col:"#065F46",bg:"#D1FAE5"},
              {titre:"Retournement",detail:"Aire de retournement recommandée tous les 300 m sur voie sans issue. Rayon de giration ≥ 10 m pour grumier.",col:"#7C3AED",bg:"#EDE9FE"},
              {titre:"Accès DFCI",detail:"Pour être classé accès DFCI : largeur ≥ 4 m, pente ≤ 10 %, dégagement vertical ≥ 4 m, possibilité de demi-tour tous les 500 m.",col:"#DC2626",bg:"#FEE2E2"},
            ].map(r=>(
              <div key={r.titre} style={{padding:"10px 12px",borderRadius:10,
                background:r.bg,border:`1px solid ${r.col}33`,marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:800,color:r.col,marginBottom:3}}>{r.titre}</div>
                <div style={{fontSize:11,color:C.tx,lineHeight:1.6}}>{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DIAGNOSTIC TERRAIN ── */}
      {tab==="diagnostic"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:4}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>🔍 Diagnostics terrain récents</div>
            {DEMO_DIAGNOSTICS.map(d=>{
              const trc=DEMO_TRONCONS.find(t=>t.id===d.tronconId);
              const prat=PRATICABILITE_OPTS.find(p=>p.id===d.praticabilite)||PRATICABILITE_OPTS[4];
              return (
                <div key={d.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{trc?.nom||d.tronconId}</div>
                      <div style={{fontSize:12,color:C.tx3}}>Visité le {d.date} · {d.validePar}</div>
                    </div>
                    <span style={{padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700,background:prat.bg,color:prat.col}}>
                      {prat.icon} {prat.label}
                    </span>
                  </div>
                  {d.obstacles.length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:5}}>
                      {d.obstacles.map(o=>(
                        <span key={o} style={{padding:"2px 8px",borderRadius:6,fontSize:11,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {o}</span>
                      ))}
                    </div>
                  )}
                  {d.commentaire&&<div style={{fontSize:12,color:C.tx2,fontStyle:"italic"}}>"{d.commentaire}"</div>}
                  {d.photos>0&&<div style={{fontSize:11,color:C.tx3,marginTop:3}}>📷 {d.photos} photo(s)</div>}
                </div>
              );
            })}
          </div>

          {/* Formulaire nouveau diagnostic */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>➕ Saisir un diagnostic terrain</div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Tronçon</div>
            <select style={{width:"100%",height:INPUT_H,borderRadius:10,border:`1px solid ${C.bd}`,padding:"0 12px",fontSize:14,marginBottom:10,background:"#fff",boxSizing:"border-box"}}>
              <option value="">— Sélectionner —</option>
              {DEMO_TRONCONS.map(t=><option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Praticabilité</div>
            <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
              {PRATICABILITE_OPTS.map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",
                  borderRadius:9,border:`1.5px solid ${C.bd}`,background:"#fff",cursor:"pointer",fontSize:13}}>
                  <input type="radio" name="prat_diag" value={p.id}/>{p.icon} {p.label}
                </label>
              ))}
            </div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Obstacles constatés</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
              {OBSTACLES_TYPES.map(o=>(
                <span key={o} style={{padding:"5px 10px",borderRadius:7,fontSize:12,border:`1px solid ${C.bd}`,background:"#fff",cursor:"pointer",color:C.tx2}}>⚠️ {o}</span>
              ))}
            </div>
            <div style={{fontSize:12,fontWeight:700,color:C.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Commentaire</div>
            <textarea rows={2} placeholder="Observations terrain..." style={{width:"100%",borderRadius:10,border:`1px solid ${C.bd}`,padding:"10px 12px",fontSize:13,resize:"vertical",boxSizing:"border-box",marginBottom:10}}/>
            <button style={{height:BTN_H,width:"100%",borderRadius:12,border:"none",background:"#1E3A5F",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              📷 Enregistrer le diagnostic
            </button>
          </div>
        </div>
      )}

      {/* ── ACCÈS POMPIERS & DFCI ── */}
      {tab==="dfci"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#FEE2E2",border:"1px solid #FCA5A5",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#7F1D1D",lineHeight:1.5}}>
            <strong>⚖️ Règle APPLITAG :</strong> APPLITAG inventorie, documente et priorise l'état des pistes. La décision réglementaire sur le classement DFCI reste humaine et appartient aux autorités compétentes (SDIS, ONF, préfecture).
          </div>

          {/* Points DFCI */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>🚒 Équipements DFCI inventoriés</div>
            {DEMO_POINTS_DFCI.map(p=>{
              const ti=DFCI_TYPE_INFO[p.type]||DFCI_TYPE_INFO.citerne;
              const estOk=p.etat==="ok";
              return (
                <div key={p.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{ti.icon} {p.nom}</div>
                      <div style={{fontSize:12,color:C.tx3}}>Rattaché à {DEMO_TRONCONS.find(t=>t.id===p.tronconId)?.nom?.split("—")[0].trim()||p.tronconId}</div>
                      <div style={{fontSize:12,color:C.tx2,marginTop:2}}>{p.acces} · Capacité : {p.capacite}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>Dernier contrôle : {p.dernierControle} · {p.responsable}</div>
                    </div>
                    <span style={{padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,
                      background:estOk?C.greenL:"#FEF3C7",color:estOk?C.greenD:C.amber,flexShrink:0}}>
                      {estOk?"✅ OK":"⚠️ À vérifier"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checklist accès pompier par tronçon */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>📋 Checklist accès secours par tronçon</div>
            {DEMO_TRONCONS.map(t=>{
              const checks=[
                {label:"Largeur ≥ 4 m",ok:t.largeur>=4},
                {label:"Pente ≤ 10 %",ok:t.pentePct<=10},
                {label:"Zone de retournement",ok:t.retournement},
                {label:"Accès incendie déclaré",ok:!t.accesIncendie?.toLowerCase().includes("non")},
                {label:"Portance poids lourds",ok:t.portance==="renforcee"},
              ];
              const score=checks.filter(c=>c.ok).length;
              return (
                <div key={t.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.tx}}>{t.nom}</div>
                    <span style={{padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,
                      background:score>=4?C.greenL:score>=2?"#FEF3C7":"#FEE2E2",
                      color:score>=4?C.greenD:score>=2?C.amber:C.red}}>
                      {score}/{checks.length} critères
                    </span>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {checks.map(c=>(
                      <span key={c.label} style={{padding:"2px 8px",borderRadius:6,fontSize:11,
                        background:c.ok?C.greenL:"#FEE2E2",color:c.ok?C.greenD:"#991B1B"}}>
                        {c.ok?"✅":"❌"} {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Règles DFCI */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:8}}>📏 Critères classement accès DFCI</div>
            {[
              ["Largeur","≥ 4 m de plateforme"],
              ["Pente","≤ 10 %"],
              ["Dégagement vertical","≥ 4 m (passage engins pompiers)"],
              ["Retournement","Possible tous les 500 m maximum"],
              ["Signalétique","Balisage numéroté visible"],
              ["Clé pompier","Accès barrières avec triangle de Pompiers ou clé DFCI"],
            ].map(([l,v])=>(
              <div key={l} style={{display:"flex",gap:12,padding:"5px 0",borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
                <span style={{color:C.tx3,minWidth:140,flexShrink:0}}>{l}</span>
                <span style={{color:C.tx,fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PRIORITÉ TRAVAUX ── */}
      {tab==="priorite"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:12}}>📊 Score de priorité de rénovation</div>
            <div style={{fontSize:12,color:C.tx3,marginBottom:12,lineHeight:1.5}}>
              Score calculé automatiquement à partir de : risque incendie + état de dégradation + accès secours + largeur + volume bois desservi. <strong>La décision de travaux reste humaine.</strong>
            </div>
            {[...DEMO_TRONCONS].sort((a,b)=>{
              const dA=DEMO_DIAGNOSTICS.find(d=>d.tronconId===a.id);
              const dB=DEMO_DIAGNOSTICS.find(d=>d.tronconId===b.id);
              return calcPriorite(b,dB)-calcPriorite(a,dA);
            }).map((t,i)=>{
              const diag=DEMO_DIAGNOSTICS.find(d=>d.tronconId===t.id);
              const score=calcPriorite(t,diag);
              const prat=PRATICABILITE_OPTS.find(p=>p.id===diag?.praticabilite);
              const level=score>=7?"🔴 Priorité 1":score>=4?"🟠 Priorité 2":score>=2?"🟡 Priorité 3":"🟢 Priorité 4";
              return (
                <div key={t.id} style={{background:score>=7?"#FEE2E2":score>=4?"#FFEDD5":score>=2?"#FEF3C7":"#F0FDF4",
                  borderRadius:12,border:`1px solid ${C.bd}`,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:C.tx}}>#{i+1} {t.nom}</div>
                      <div style={{fontSize:12,color:C.tx3}}>{t.proprietaire}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:900,fontSize:22,color:score>=7?"#991B1B":score>=4?"#C2410C":score>=2?"#92400E":"#065F46"}}>{score}/10</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.tx3}}>{level}</div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12}}>
                    <span style={{color:C.tx2}}>🚒 Accès incendie : <strong>{t.accesIncendie?.split("—")[0].trim()}</strong></span>
                    <span style={{color:C.tx2}}>↔️ Largeur : <strong>{t.largeur} m</strong></span>
                    <span style={{color:C.tx2}}>🔄 Retournement : <strong>{t.retournement?"Oui":"Non"}</strong></span>
                    <span style={{color:C.tx2}}>📦 Volume : <strong>{t.tonnageMobilisable} t</strong></span>
                    {prat&&<span style={{color:prat.col}}>🔍 État : <strong>{prat.label}</strong></span>}
                    {t.coutProjet>0&&<span style={{color:C.tx2}}>💶 Devis estimé : <strong>{t.coutProjet.toLocaleString("fr-FR")} €</strong></span>}
                  </div>
                  {diag?.obstacles?.length>0&&(
                    <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                      {diag.obstacles.map(o=><span key={o} style={{padding:"1px 7px",borderRadius:5,fontSize:10,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {o}</span>)}
                    </div>
                  )}
                  {t.coutProjet>0&&(
                    <div style={{marginTop:8,padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,.6)",fontSize:12,color:C.tx2}}>
                      💡 Financeurs potentiels : Fonds vert · FEADER · Région · Collectivité
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CARTE placeholder ── */}
      {tab==="carte"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:40,textAlign:"center",
          border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:40,marginBottom:12}}>🗺️</div>
          <div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:6}}>
            Cartographie des tronçons
          </div>
          <div style={{fontSize:12,color:C.tx3,lineHeight:1.6}}>
            Visualisation des tronçons de desserte superposée aux parcelles forestières.
            <br/>Disponible dans la prochaine mise à jour avec intégration carte IGN / OpenStreetMap.
          </div>
          <div style={{marginTop:14,display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            {DEMO_TRONCONS.map(t=>{
              const st = STATUT_TRONCON[t.statut]||STATUT_TRONCON.operationnel;
              return (
                <div key={t.id} style={{padding:"6px 12px",borderRadius:20,fontSize:11,
                  fontWeight:700,background:st.bg,color:st.col}}>
                  {st.icon} {t.nom.split("—")[0].trim()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Onglet Signaler ────────────────────────────────── */}
      {tab==="signaler"&&<SignalementRapideDesserte onRetour={()=>setTab("liste")}/>}
    </div>
  );
};

// ── Formulaire de signalement rapide (inline dans Desserte) ───
const SignalementRapideDesserte = ({onRetour}) => {
  const [form, setForm] = useState({
    type:"",urgence:"orange",tronconId:"",tronconLibre:"",
    commentaire:"",profil:"Opérateur terrain",auteur:"",commune:"",
  });
  const [gps, setGps] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const captureGps = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      p=>{ setGps({lat:p.coords.latitude,lng:p.coords.longitude}); setGpsLoading(false); },
      ()=>setGpsLoading(false),
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const envoyer = () => {
    if(!form.type||!form.urgence||(!form.tronconId&&!form.tronconLibre)||!form.auteur) return;
    const arr = signalementsGet();
    const nouveau = {
      id:"sg"+Date.now(), createdAt:new Date().toISOString(),
      auteur:form.auteur, profil:form.profil,
      tronconId:form.tronconId||"LIBRE", tronconNom:form.tronconLibre||form.tronconId,
      type:form.type, urgence:form.urgence,
      commentaire:form.commentaire, gps, photos:0,
      statut:"ouvert", commune:form.commune,
      validePar:null, traitePar:null, dateTraitement:null,
    };
    signalementsSet([nouveau,...arr]);
    setEnvoye(true);
  };

  if(envoye) return (
    <div style={{textAlign:"center",padding:"40px 16px"}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:8}}>Signalement enregistré</div>
      <div style={{fontSize:13,color:C.tx2,marginBottom:20,lineHeight:1.6}}>
        Votre signalement a été transmis à la banque de données APPLITAG Data.<br/>
        Il sera traité par le gestionnaire du territoire.
      </div>
      <button onClick={onRetour} style={{height:BTN_H,width:"100%",maxWidth:300,borderRadius:12,border:"none",
        background:"#1E3A5F",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
        Retour à la desserte
      </button>
    </div>
  );

  const F = ({label,children}) => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:C.tx2,marginBottom:6}}>{label}</div>
      {children}
    </div>
  );
  const sel = {height:INPUT_H,borderRadius:8,border:`1.5px solid ${C.bd}`,
    fontSize:FONT_INPUT,padding:"0 12px",background:"#fff",color:C.tx,width:"100%",fontFamily:"inherit"};

  return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <div style={{background:"#991B1B",borderRadius:12,padding:"14px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontWeight:800,fontSize:16,marginBottom:2}}>🚨 Signaler une anomalie</div>
        <div style={{fontSize:12,opacity:.85}}>Ce signalement sera versé dans APPLITAG Data, accessible à tous les gestionnaires et collectivités.</div>
        <button onClick={captureGps} disabled={gpsLoading} style={{
          marginTop:12,height:40,borderRadius:8,border:"1.5px solid rgba(255,255,255,.4)",padding:"0 16px",
          background:gps?"rgba(0,0,0,.25)":"rgba(255,255,255,.15)",
          color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",width:"100%"}}>
          {gpsLoading?"⏳ Localisation en cours…":gps?`📍 Position captée : ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`:"📍 Capter ma position GPS"}
        </button>
      </div>

      <F label="Votre nom / organisme *">
        <input value={form.auteur} onChange={e=>setForm({...form,auteur:e.target.value})}
          placeholder="Ex : Martin Dupont" style={{...sel,display:"block"}}/>
      </F>
      <F label="Profil">
        <select value={form.profil} onChange={e=>setForm({...form,profil:e.target.value})} style={sel}>
          {SOURCES_PROFIL.map(p=><option key={p}>{p}</option>)}
        </select>
      </F>
      <F label="Tronçon concerné">
        <select value={form.tronconId} onChange={e=>setForm({...form,tronconId:e.target.value,tronconLibre:""})}
          style={{...sel,marginBottom:6,display:"block"}}>
          <option value="">-- Choisir un tronçon connu --</option>
          {DEMO_TRONCONS.map(t=><option key={t.id} value={t.id}>{t.id} — {t.nom}</option>)}
        </select>
        <input value={form.tronconLibre} onChange={e=>setForm({...form,tronconLibre:e.target.value,tronconId:""})}
          placeholder="Ou saisir librement : lieu-dit, commune…" style={{...sel,display:"block"}}/>
      </F>
      <F label="Commune">
        <input value={form.commune} onChange={e=>setForm({...form,commune:e.target.value})}
          placeholder="Ex : Saint-Bonnet-Tronçais" style={{...sel,display:"block"}}/>
      </F>
      <F label="Type d'anomalie *">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {TYPES_ANOMALIE.map(a=>(
            <button key={a.id} onClick={()=>setForm({...form,type:a.id})} style={{
              padding:"8px 10px",borderRadius:8,fontSize:12,fontWeight:form.type===a.id?700:400,
              border:`1.5px solid ${form.type===a.id?"#1E3A5F":C.bd}`,cursor:"pointer",
              background:form.type===a.id?"#1E3A5F":"#fff",
              color:form.type===a.id?"#fff":C.tx,textAlign:"left"}}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </F>
      <F label="Niveau d'urgence *">
        <div style={{display:"flex",gap:6}}>
          {Object.entries(URGENCES).map(([k,u])=>(
            <button key={k} onClick={()=>setForm({...form,urgence:k})} style={{
              flex:1,padding:"8px 6px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              border:`1.5px solid ${form.urgence===k?u.col:C.bd}`,
              background:form.urgence===k?u.bg:"#fff",color:form.urgence===k?u.col:C.tx2}}>
              {u.icon} {u.label}
            </button>
          ))}
        </div>
      </F>
      <F label="Description (facultatif)">
        <textarea value={form.commentaire} onChange={e=>setForm({...form,commentaire:e.target.value})}
          placeholder="Décrivez l'anomalie, son étendue, les risques…" rows={3}
          style={{...sel,height:"auto",padding:"10px 12px",resize:"vertical",display:"block"}}/>
      </F>
      <F label="Localisation GPS">
        <button onClick={captureGps} disabled={gpsLoading} style={{
          height:42,borderRadius:8,border:`1.5px solid ${C.bd}`,padding:"0 16px",
          background:gps?"#D1FAE5":"#fff",color:gps?"#065F46":C.tx2,fontSize:13,cursor:"pointer"}}>
          {gpsLoading?"⏳ Localisation…":gps?`📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`:"📍 Capter ma position GPS"}
        </button>
      </F>

      <button onClick={envoyer} style={{
        width:"100%",height:BTN_H,borderRadius:12,border:"none",marginTop:8,
        background:(!form.type||!form.auteur||(!form.tronconId&&!form.tronconLibre))?"#9CA3AF":"#991B1B",
        color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer"}}>
        🚨 Envoyer le signalement
      </button>
      <button onClick={onRetour} style={{
        width:"100%",height:40,borderRadius:12,border:`1.5px solid ${C.bd}`,marginTop:8,
        background:"transparent",color:C.tx2,fontSize:13,cursor:"pointer"}}>
        Annuler
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MODULE COPRODUITS DE SCIERIE
═══════════════════════════════════════════════════════════════ */
const COPRODUIT_CATS = [
  {id:"ecorces",    ico:"🪵", l:"Écorces",           col:"#7C3AED", bg:"#EDE9FE"},
  {id:"sciures",    ico:"🌫️", l:"Sciures",            col:"#B45309", bg:"#FEF3C7"},
  {id:"plaquettes", ico:"🪚", l:"Plaquettes",         col:"#1E5B3A", bg:"#D1FAE5"},
  {id:"dosses",     ico:"🪜", l:"Dosses / délignures", col:"#1E40AF", bg:"#DBEAFE"},
  {id:"chutes",     ico:"🔪", l:"Chutes bout/tête",   col:"#065F46", bg:"#CCFBF1"},
];
const DESTINATION_COPRODS = [
  {v:"energie_interne","l":"Énergie interne (chaudière scierie)"},
  {v:"vente_energie",  "l":"Vente — bois énergie tiers"},
  {v:"vente_matiere",  "l":"Vente — matière (panneaux, pâte)"},
  {v:"compostage",     "l":"Compostage / amendement"},
  {v:"stock",          "l":"Stocké — destination à définir"},
];
const DEMO_STOCKS_COPRODS = [
  {id:"SC-001",scierie:"Scierie Moreau — Moulins",cat:"plaquettes",humidite:28,
   stockTonnes:145,qualite:"P31",destination:"vente_energie",
   enlevement:"2026-08-15",prixTonne:38,margeTonne:12,saisonnel:false},
  {id:"SC-002",scierie:"Scierie Moreau — Moulins",cat:"sciures",humidite:45,
   stockTonnes:62,qualite:"vrac",destination:"energie_interne",
   enlevement:null,prixTonne:0,margeTonne:0,saisonnel:true},
  {id:"SC-003",scierie:"Scierie du Morvan — Château-Chinon",cat:"ecorces",humidite:52,
   stockTonnes:89,qualite:"mélange",destination:"compostage",
   enlevement:"2026-09-01",prixTonne:8,margeTonne:2,saisonnel:false},
  {id:"SC-004",scierie:"Scierie du Morvan — Château-Chinon",cat:"dosses",humidite:35,
   stockTonnes:34,qualite:"hêtre/chêne",destination:"vente_matiere",
   enlevement:"2026-08-01",prixTonne:55,margeTonne:18,saisonnel:false},
  {id:"SC-005",scierie:"Scierie Lefebvre — Clamecy",cat:"plaquettes",humidite:30,
   stockTonnes:210,qualite:"P45",destination:"vente_energie",
   enlevement:"2026-07-30",prixTonne:42,margeTonne:15,saisonnel:false},
];

export const SectionCoproduits = () => {
  const [tab,     setTab]     = useState("stocks");
  const [filtCat, setFiltCat] = useState("tous");
  const [selId,   setSelId]   = useState(null);

  // LOTs secondaires générés depuis Scierie
  const lotsSec = lotsSecGet();

  const stocks = filtCat==="tous"
    ? DEMO_STOCKS_COPRODS
    : DEMO_STOCKS_COPRODS.filter(s=>s.cat===filtCat);

  const totalStock  = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes,0);
  const totalCa     = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes*c.prixTonne,0);
  const totalMarge  = DEMO_STOCKS_COPRODS.reduce((s,c)=>s+c.stockTonnes*c.margeTonne,0);
  const nbEnlev     = DEMO_STOCKS_COPRODS.filter(c=>c.enlevement&&new Date(c.enlevement)<=new Date(Date.now()+30*864e5)).length;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            ♻️ Coproduits de scierie
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Écorces · Sciures · Plaquettes · Dosses · Qualification · Débouchés
          </div>
        </div>
        {/* Badge FEADER */}
        <div style={{background:"#EDE9FE",border:"1.5px solid #7C3AED",borderRadius:10,
          padding:"6px 14px",fontSize:11,fontWeight:700,color:"#5B21B6"}}>
          🇪🇺 FEADER Grand Est — phase 2 : 15/09 → 31/12/2026
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"📦",l:"Stock total",     v:`${totalStock} t`,              col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"💶",l:"CA potentiel",    v:`${(totalCa/1000).toFixed(1)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {ico:"📈",l:"Marge estimée",   v:`${(totalMarge/1000).toFixed(1)} k€`,col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"🚛",l:"Enlèvements J30",  v:nbEnlev,                      col:"#B45309",bg:"#FEF3C7"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.v}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["stocks","📦","Stocks par catégorie"],["flux","🔄","Flux & enlèvements"],
          ["lots_lies","🌲","Lots liés"],["feader","🇪🇺","FEADER Grand Est"],["risques","⚠️","Risques & règles"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#7C3AED":C.bd}`,
            background:tab===id?"#7C3AED":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── STOCKS ── */}
      {tab==="stocks"&&(
        <div>
          {/* Filtres catégorie */}
          <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",scrollbarWidth:"none"}}>
            <button onClick={()=>setFiltCat("tous")} style={{
              flex:"0 0 auto",padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",
              border:`1.5px solid ${filtCat==="tous"?"#374151":C.bd}`,
              background:filtCat==="tous"?"#374151":"transparent",
              color:filtCat==="tous"?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
              Tous
            </button>
            {COPRODUIT_CATS.map(c=>(
              <button key={c.id} onClick={()=>setFiltCat(c.id)} style={{
                flex:"0 0 auto",padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",
                border:`1.5px solid ${filtCat===c.id?c.col:C.bd}`,
                background:filtCat===c.id?c.bg:"transparent",
                color:filtCat===c.id?c.col:C.tx2,WebkitTapHighlightColor:"transparent"}}>
                {c.ico} {c.l}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {stocks.map(s=>{
              const cat = COPRODUIT_CATS.find(c=>c.id===s.cat)||COPRODUIT_CATS[0];
              const dest = DESTINATION_COPRODS.find(d=>d.v===s.destination);
              const isOpen = selId===s.id;
              const enlev = s.enlevement ? new Date(s.enlevement) : null;
              const urgent = enlev && enlev <= new Date(Date.now()+14*864e5);
              return (
                <div key={s.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                  border:`1.5px solid ${urgent?"#FCA5A5":cat.col+"44"}`}}>
                  <div onClick={()=>setSelId(isOpen?null:s.id)}
                    style={{padding:"12px 14px",cursor:"pointer",
                      display:"flex",alignItems:"center",gap:12,
                      background:isOpen?cat.bg+"50":"#fff",
                      WebkitTapHighlightColor:"transparent"}}>
                    <span style={{fontSize:24,flexShrink:0}}>{cat.ico}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:cat.bg,color:cat.col}}>{cat.l}</span>
                        {urgent&&<span style={{fontSize:10,fontWeight:800,padding:"2px 7px",
                          borderRadius:10,background:"#FEE2E2",color:"#991B1B"}}>🚛 Enlèvement urgent</span>}
                        <span style={{fontSize:10,color:C.tx3}}>{s.qualite}</span>
                      </div>
                      <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.scierie}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        Humidité {s.humidite}% · {dest?.l||s.destination}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:16,fontWeight:900,color:cat.col}}>{s.stockTonnes} t</div>
                      {s.prixTonne>0&&<div style={{fontSize:10,color:C.tx3}}>{s.prixTonne} €/t</div>}
                    </div>
                    <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                  </div>
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"12px 14px",
                      background:"#FAFAFA",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[
                        ["📦 Stock",`${s.stockTonnes} t`],
                        ["💧 Humidité",`${s.humidite} %`],
                        ["🏷️ Qualité",s.qualite],
                        ["💶 Prix/tonne",s.prixTonne>0?`${s.prixTonne} €/t`:"Non valorisé"],
                        ["📈 Marge/tonne",s.margeTonne>0?`${s.margeTonne} €/t`:"—"],
                        ["🚛 Enlèvement",s.enlevement?new Date(s.enlevement).toLocaleDateString("fr-FR"):"Non planifié"],
                      ].map(([l,v])=>(
                        <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LOTS LIÉS (issus de Scierie) ── */}
      {tab==="lots_lies"&&(
        <div>
          <div style={{background:"#D1FAE5",border:"1.5px solid #10B981",borderRadius:12,
            padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:20}}>🌲</span>
            <div>
              <div style={{fontWeight:700,fontSize:13,color:"#065F46"}}>Lots secondaires — traçabilité scierie</div>
              <div style={{fontSize:12,color:"#047857",marginTop:2}}>
                Chaque enlèvement de coproduit génère automatiquement un LOT traçable (LOT-SC-AAAA-NNN).
              </div>
            </div>
            <div style={{marginLeft:"auto",fontWeight:800,fontSize:22,color:"#065F46"}}>{lotsSec.length}</div>
          </div>

          {lotsSec.length===0&&(
            <div style={{background:C.bg2,borderRadius:12,padding:32,textAlign:"center",color:C.tx3,fontSize:13}}>
              Aucun lot secondaire encore généré.<br/>
              <span style={{fontSize:12}}>Créez un enlèvement dans le module Scierie pour générer un LOT traçable.</span>
            </div>
          )}

          {lotsSec.map(l=>{
            const cat = COPRODUIT_CATS.find(c=>c.id===l.coproduitType)||COPRODUIT_CATS[0];
            return (
              <div key={l.id} style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:12,
                padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontWeight:800,fontSize:13,color:"#065F46",background:"#D1FAE5",
                        padding:"2px 10px",borderRadius:8}}>🌲 {l.lotNumero}</span>
                      <span style={{fontSize:11,background:cat.bg,color:cat.col,
                        padding:"2px 8px",borderRadius:8,fontWeight:700}}>{cat.ico} {cat.l}</span>
                    </div>
                    <div style={{fontSize:12,color:C.tx3}}>
                      Destination : <strong>{l.destination}</strong>
                      {l.transporteur&&` · Transport : ${l.transporteur}`}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                      Créé le {l.date} · Origine : {l.origine}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,fontSize:16,color:C.tx}}>{l.tonnage} t</div>
                    {l.prixTonne>0&&(
                      <div style={{fontSize:12,color:C.green,marginTop:2}}>
                        {(l.tonnage*l.prixTonne).toLocaleString("fr-FR")} €
                      </div>
                    )}
                    <div style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:8,marginTop:4,
                      background:"#DBEAFE",color:"#1E40AF"}}>
                      {l.statut==="EN_LIVRAISON"?"🚛 En livraison":"📦 Planifié"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FEADER ── */}
      {tab==="feader"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"linear-gradient(135deg,#EDE9FE,#DDD6FE)",borderRadius:12,
            padding:"14px",border:"1.5px solid #7C3AED"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#5B21B6",marginBottom:6}}>
              🇪🇺 FEADER – Région Grand Est · Première transformation
            </div>
            <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.7,marginBottom:10}}>
              Soutien aux scieries : traçabilité, adaptation à l'hétérogénéité de la ressource,
              valorisation des coproduits, circuits courts, maîtrise de l'énergie, optimisation de la production.
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                ["Phase 1","Fermée le 31/07/2026","#991B1B","#FEE2E2"],
                ["Phase 2","15/09 → 31/12/2026","#065F46","#D1FAE5"],
              ].map(([ph,d,col,bg])=>(
                <div key={ph} style={{padding:"8px 14px",borderRadius:10,
                  background:bg,border:`1px solid ${col}44`}}>
                  <div style={{fontSize:11,fontWeight:800,color:col}}>{ph}</div>
                  <div style={{fontSize:10,color:col}}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              🎯 Opportunité APPLITAG — Composante numérique
            </div>
            {[
              ["🔗","Traçabilité grume → production → coproduit","Lien lot forestier → flux scierie → stock connexe"],
              ["📦","Stock connexes par catégorie","Écorces / sciures / plaquettes / dosses / chutes"],
              ["💧","Humidité et qualité mesurées","Base facturable, RED-compatible"],
              ["🔀","Destination matière ou énergie","Distinction obligatoire SNBC 3"],
              ["🚛","Suivi des enlèvements","Planning + confirmation livraison"],
              ["📈","Coût et marge par flux","Rentabilité par coproduit et par scierie"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid ${C.bd}`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{det}</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:10,padding:"10px 12px",background:"#FFFBEB",borderRadius:8,
              border:"1px solid #FCD34D",fontSize:11,color:"#78350F",lineHeight:1.6}}>
              ⚠️ L'éligibilité d'une composante numérique doit être vérifiée dans le règlement régional
              avant tout dépôt de dossier.
            </div>
          </div>

          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:8}}>
              Action recommandée — 10 scieries Grand Est
            </div>
            <div style={{fontSize:11,color:"#7C2D12",lineHeight:1.7,marginBottom:10}}>
              Établir une liste de 10 scieries du Grand Est et leur proposer :<br/>
              <strong>« Diagnostic de valorisation et de traçabilité des coproduits de scierie »</strong>
            </div>
            {["Volumes disponibles par catégorie","Saisonnalité des flux",
              "Qualité et humidité mesurée","Capacité de stockage",
              "Débouchés actuels et potentiels","Transport et logistique",
              "Revenu potentiel par flux"].map(p=>(
              <div key={p} style={{fontSize:11,color:"#7C2D12",padding:"3px 0",
                display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:"#D97706"}}>▶</span> {p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RISQUES ── */}
      {tab==="risques"&&(
        <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
          border:"1.5px solid #FED7AA",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:4}}>
            ⚠️ Risques à éviter
          </div>
          {[
            ["Confondre coproduit disponible et volume commercialement sécurisé",
             "Un stock ne vaut que s'il est qualifié (humidité, qualité, accessibilité) et qu'un débouché est confirmé."],
            ["Ne pas distinguer les débouchés matière et énergie",
             "Obligation SNBC 3 : la hiérarchie des usages impose de tracer matière avant énergie."],
            ["Présenter APPLITAG comme une dépense informatique isolée",
             "La composante numérique doit être intégrée à un projet de transformation — pas présentée seule."],
            ["Attendre la phase 2 sans commencer à qualifier les scieries",
             "La phase 2 ouvre le 15/09/2026. Les contacts et diagnostics peuvent commencer maintenant."],
          ].map(([t,d])=>(
            <div key={t} style={{display:"flex",gap:10,padding:"8px 0",
              borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
              <span style={{fontSize:14,flexShrink:0}}>🚫</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{t}</div>
                <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FLUX placeholder ── */}
      {tab==="flux"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_STOCKS_COPRODS.filter(s=>s.enlevement).sort((a,b)=>a.enlevement.localeCompare(b.enlevement)).map(s=>{
            const cat = COPRODUIT_CATS.find(c=>c.id===s.cat)||COPRODUIT_CATS[0];
            const enlev = new Date(s.enlevement);
            const urgent = enlev <= new Date(Date.now()+14*864e5);
            return (
              <div key={s.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",
                border:`1.5px solid ${urgent?"#FCA5A5":C.bd}`,
                display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:22,flexShrink:0}}>{cat.ico}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.scierie}</div>
                  <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                    {cat.l} · {s.stockTonnes} t · Humidité {s.humidite}%
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:12,fontWeight:800,
                    color:urgent?"#991B1B":"#1E40AF"}}>
                    {enlev.toLocaleDateString("fr-FR")}
                  </div>
                  {s.prixTonne>0&&(
                    <div style={{fontSize:10,color:C.tx3}}>
                      {(s.stockTonnes*s.prixTonne).toLocaleString("fr-FR")} €
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MODULE PROJET FINANCÉ — SOCLE GÉNÉRIQUE
═══════════════════════════════════════════════════════════════ */
const ETAPES_PROJET = [
  {id:"diagnostic",  ico:"🔍", l:"Diagnostic initial"},
  {id:"depot",       ico:"📋", l:"Dépôt dossier"},
  {id:"decision",    ico:"⚖️", l:"Décision"},
  {id:"travaux",     ico:"🪓", l:"Travaux"},
  {id:"controle",    ico:"📸", l:"Contrôle"},
  {id:"volumes",     ico:"📦", l:"Volumes produits"},
  {id:"destinations",ico:"🔀", l:"Destinations"},
  {id:"resultats",   ico:"📈", l:"Résultats"},
];
const DEMO_PROJETS_FINANCES = [
  {
    id:"PRJ-2026-001",
    nom:"Desserte parcelles Battet Nord",
    dispositif:"FEADER – Développement rural Grand Est",
    dateLimite:"2026-12-31",
    porteur:"SCIC Forêt de Tronçais",
    partenaires:["Commune de Tronçais","DDT Allier"],
    etapeActuelle:"travaux",
    depensesPrev:42000, depensesReelles:18500,
    parcelle:"B 112 / B 113",
    entreprise:"SARL Travaux Forestiers Allier",
    photosAvant:2, photosApres:1,
    volumesMobilises:280, coproduits:"Plaquettes 45 t",
    debouches:"Chaufferie intercommunale Moulins",
    indicateursFinanceur:"Surface desservie (ha), Tonnage mobilisé, Emplois créés",
    statut:"en_cours",
    piecesOk:["Devis signé","Plan de situation","Extrait cadastral"],
    piecesManquantes:["Attestation assurance maîtrise d'ouvrage","PV de réception travaux"],
  },
  {
    id:"PRJ-2026-002",
    nom:"Traçabilité coproduits scierie Moreau",
    dispositif:"FEADER – Première transformation Grand Est",
    dateLimite:"2026-12-31",
    porteur:"Scierie Moreau SAS",
    partenaires:["ALTEGAD SAS","Région Grand Est"],
    etapeActuelle:"diagnostic",
    depensesPrev:28000, depensesReelles:0,
    parcelle:"Site industriel Moulins",
    entreprise:"ALTEGAD SAS",
    photosAvant:0, photosApres:0,
    volumesMobilises:0, coproduits:"À qualifier",
    debouches:"À définir",
    indicateursFinanceur:"Volumes connexes tracés, Humidité mesurée, Destinations qualifiées",
    statut:"preparation",
    piecesOk:["Statuts entreprise","Bilan N-1"],
    piecesManquantes:["Devis prestataire numérique","Plan de financement","Attestation expert-comptable"],
  },
];

export const SectionProjetFinance = () => {
  const [tab,    setTab]    = useState("liste");
  const [selId,  setSelId]  = useState(null);
  const _proj = selId ? DEMO_PROJETS_FINANCES.find(p=>p.id===selId) : null;

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            📐 Projets financés
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Socle générique · Dispositif → Parcelle → Travaux → Volumes → Résultats
          </div>
        </div>
        <button style={{padding:"10px 18px",borderRadius:12,background:"#7C3AED",border:"none",
          color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer",
          WebkitTapHighlightColor:"transparent"}}>
          + Nouveau projet
        </button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"📐",l:"Projets",           v:DEMO_PROJETS_FINANCES.length,          col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"💶",l:"Dépenses prév.",    v:`${(DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.depensesPrev,0)/1000).toFixed(0)} k€`,col:"#1E40AF",bg:"#DBEAFE"},
          {ico:"✅",l:"Dép. réelles",      v:`${(DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.depensesReelles,0)/1000).toFixed(0)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {ico:"📋",l:"Pièces manquantes", v:DEMO_PROJETS_FINANCES.reduce((s,p)=>s+p.piecesManquantes.length,0),col:"#B45309",bg:"#FEF3C7"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.v}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["liste","📋","Projets"],["parcours","🗺️","Parcours type"],
          ["indicateurs","📊","Indicateurs financeur"],["socle","⚙️","Socle générique"]].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#7C3AED":C.bd}`,
            background:tab===id?"#7C3AED":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── LISTE PROJETS ── */}
      {tab==="liste"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {DEMO_PROJETS_FINANCES.map(p=>{
            const etapeIdx = ETAPES_PROJET.findIndex(e=>e.id===p.etapeActuelle);
            const pctAvancement = Math.round((etapeIdx+1)/ETAPES_PROJET.length*100);
            const isOpen = selId===p.id;
            const nbManq = p.piecesManquantes.length;
            return (
              <div key={p.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${nbManq>0?"#FCA5A5":"#A5B4FC"}`}}>
                <div onClick={()=>setSelId(isOpen?null:p.id)}
                  style={{padding:"14px",cursor:"pointer",
                    display:"flex",flexDirection:"column",gap:8,
                    background:isOpen?"#F5F3FF":"#fff",
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#7C3AED"}}>
                          {p.id}
                        </span>
                        <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:700,
                          background:p.statut==="en_cours"?"#D1FAE5":"#DBEAFE",
                          color:p.statut==="en_cours"?"#065F46":"#1E40AF"}}>
                          {p.statut==="en_cours"?"En cours":"En préparation"}
                        </span>
                        {nbManq>0&&(
                          <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,fontWeight:700,
                            background:"#FEE2E2",color:"#991B1B"}}>
                            ⚠️ {nbManq} pièce{nbManq>1?"s":""} manquante{nbManq>1?"s":""}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:14,fontWeight:900,color:C.tx,marginBottom:3}}>{p.nom}</div>
                      <div style={{fontSize:11,color:"#5B21B6",fontWeight:600}}>{p.dispositif}</div>
                      <div style={{fontSize:11,color:C.tx3,marginTop:2}}>
                        {p.porteur} · 📅 {new Date(p.dateLimite).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:900,color:"#7C3AED"}}>{pctAvancement}%</div>
                      <div style={{fontSize:10,color:C.tx3}}>avancement</div>
                    </div>
                  </div>
                  {/* Barre progression pipeline */}
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:2,marginBottom:4}}>
                      {ETAPES_PROJET.map((e,i)=>(
                        <div key={e.id} style={{flex:1,height:5,borderRadius:3,
                          background:i<=etapeIdx?"#7C3AED":"#E5E7EB"}}/>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:"#7C3AED",fontWeight:700}}>
                      {ETAPES_PROJET[etapeIdx]?.ico} {ETAPES_PROJET[etapeIdx]?.l}
                    </div>
                  </div>
                </div>

                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",background:"#FAFAFA",
                    display:"flex",flexDirection:"column",gap:12}}>

                    {/* Infos générales */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {[
                        ["📍 Parcelle/site",p.parcelle],
                        ["🏢 Entreprise",p.entreprise],
                        ["💶 Dépenses prév.",`${p.depensesPrev.toLocaleString("fr-FR")} €`],
                        ["✅ Dépenses réelles",`${p.depensesReelles.toLocaleString("fr-FR")} €`],
                        ["📸 Photos avant",`${p.photosAvant}`],
                        ["📸 Photos après",`${p.photosApres}`],
                      ].map(([l,v])=>(
                        <div key={l} style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                          <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Résultats */}
                    {(p.volumesMobilises>0||p.coproduits!=="À qualifier")&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                        {[
                          ["📦 Volumes mobilisés",p.volumesMobilises>0?`${p.volumesMobilises} m³`:"—"],
                          ["♻️ Coproduits",p.coproduits],
                          ["🔀 Débouchés",p.debouches],
                        ].map(([l,v])=>(
                          <div key={l} style={{background:"#F0FDF4",borderRadius:8,padding:"8px 10px",
                            border:"1px solid #86EFAC"}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{l}</div>
                            <div style={{fontSize:11,fontWeight:700,color:"#065F46"}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pièces */}
                    <div>
                      <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:6}}>
                        📋 Pièces justificatives
                      </div>
                      {p.piecesOk.map((pc,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                          padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                          fontSize:11,color:"#065F46"}}>
                          <span>✅</span>{pc}
                        </div>
                      ))}
                      {p.piecesManquantes.map((pc,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:8,
                          padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                          fontSize:11,color:"#991B1B",fontWeight:600}}>
                          <span>⏳</span>{pc}
                        </div>
                      ))}
                    </div>

                    {/* Indicateurs financeur */}
                    <div style={{background:"#EDE9FE",borderRadius:8,padding:"10px 12px",
                      border:"1px solid #C4B5FD"}}>
                      <div style={{fontSize:11,fontWeight:800,color:"#5B21B6",marginBottom:4}}>
                        📊 Indicateurs exigés par le financeur
                      </div>
                      <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.6}}>
                        {p.indicateursFinanceur}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PARCOURS TYPE ── */}
      {tab==="parcours"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:4}}>
            Parcours générique — Projet financé APPLITAG
          </div>
          {ETAPES_PROJET.map((e,i)=>(
            <div key={e.id} style={{display:"flex",gap:14,alignItems:"flex-start",
              padding:"12px 14px",borderRadius:12,background:"#fff",
              border:"1.5px solid #A5B4FC"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:"#7C3AED",
                color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:900,fontSize:14,flexShrink:0}}>{i+1}</div>
              <span style={{fontSize:20,flexShrink:0,marginTop:6}}>{e.ico}</span>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:"#5B21B6"}}>{e.l}</div>
                <div style={{fontSize:11,color:C.tx3,marginTop:3}}>
                  {[
                    "Parcelle, surface, état initial, essences, volumes estimés",
                    "Dispositif, date limite, porteur, partenaires, budget prévisionnel, pièces",
                    "Acte attributif, montant accordé, conditions",
                    "Entreprise, planning, dépenses réelles, photos en cours",
                    "Photos avant/après, mesures, PV réception",
                    "Tonnage mobilisé, essence, humidité, qualité",
                    "Matière / Énergie, clients, enlèvements, prix",
                    "Bilan économique, indicateurs financeur, rapport final",
                  ][i]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── INDICATEURS ── */}
      {tab==="indicateurs"&&(
        <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
          <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
            Indicateurs clés exigés par les financeurs (socle commun)
          </div>
          {[
            {grp:"Foncier & territoire",items:["Surface bénéficiaire (ha)","Parcelles cadastrées","Communes concernées"]},
            {grp:"Travaux",items:["Linéaire de desserte créé/réhabilité (ml)","Entreprise et heures travaillées","Dépenses vérifiées (€ HT)"]},
            {grp:"Production",items:["Volume mobilisé (m³ et t)","Essences et qualités","Humidité mesurée (%)"]},
            {grp:"Valorisation",items:["Destination matière vs énergie","Prix de vente / tonne","Marge nette / tonne","Clients et circuits"]},
            {grp:"Impact",items:["Emplois créés ou maintenus","Réduction transport (km)","Émissions GES évitées (tCO₂eq)"]},
          ].map(g=>(
            <div key={g.grp} style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:800,color:"#5B21B6",marginBottom:6}}>
                {g.grp}
              </div>
              {g.items.map(it=>(
                <div key={it} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"5px 0",borderBottom:`1px solid ${C.bd}`,
                  fontSize:11,color:C.tx}}>
                  <span style={{color:"#7C3AED",flexShrink:0}}>▶</span>{it}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── SOCLE GÉNÉRIQUE ── */}
      {tab==="socle"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#EDE9FE",borderRadius:12,padding:"14px",
            border:"1.5px solid #7C3AED"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#5B21B6",marginBottom:6}}>
              ⚙️ Principe — Socle générique + modèles paramétrables
            </div>
            <div style={{fontSize:11,color:"#4C1D95",lineHeight:1.7}}>
              Construire un socle commun de gestion des projets financés, puis ajouter des
              <strong> modèles paramétrables par dispositif</strong>.
              Un module différent par aide produirait une application lourde et rapidement obsolète.
            </div>
          </div>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              Impact commercial — 6 types d'utilisateurs servis par un seul module
            </div>
            {[
              ["🌲","Propriétaires forestiers","Desserte, travaux, valorisation"],
              ["🏭","Scieries",               "Traçabilité, coproduits, FEADER"],
              ["🏛️","Collectivités",           "Aménagement, DFCI, subventions"],
              ["📐","Bureaux d'études",        "Diagnostic, suivi, reporting"],
              ["💶","Financeurs",              "Indicateurs, pièces, contrôle"],
              ["🔥","Fournisseurs bois-énergie","Volumes, qualité, destinations"],
            ].map(([ico,t,d])=>(
              <div key={t} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid ${C.bd}`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{t}</div>
                  <div style={{fontSize:10,color:C.tx3,marginTop:1}}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── TABLEAU DE BORD DESKTOP (ADMIN) ────────────────────────────

// ── PARCELLES — TRAVAUX — FLUX — RÉSULTATS ─────────────────────

const QUALITES_BOIS = [
  {id:"bo",  label:"Bois d'œuvre",      icon:"🪵", couleur:"#1E5B3A", bg:"#D1FAE5", usage:"matiere",
   desc:"Sciage, déroulage, charpente, menuiserie — stockage carbone long terme"},
  {id:"bi",  label:"Bois d'industrie",  icon:"📦", couleur:"#0369A1", bg:"#DBEAFE", usage:"matiere",
   desc:"Pâte à papier, panneaux, palettes — valorisation matière intermédiaire"},
  {id:"be",  label:"Bois énergie",      icon:"🔥", couleur:"#B45309", bg:"#FEF3C7", usage:"energie",
   desc:"Plaquettes forestières, bûches, granulés — valorisation énergétique"},
];

const DEMO_PARCELLE = {
  id:"p1",
  ref:"PAR-2026-001",
  nom:"Forêt Bernard — Tronçais Nord",
  commune:"Saint-Bonnet-Tronçais",
  canton:"Allier (03)",
  surface:12.4,
  essencePrincipale:"Chêne sessile (Quercus petraea)",
  essencesSecondaires:["Charme","Acacia","Bouleau"],
  proprietaire:"M. Henri Bernard",
  mandataire:"Sylvie Moreau — Cabinet Forêt Conseil",
  coordGPS:{lat:46.5831,lng:2.7654},

  diagnostic:{
    date:"2026-03-15",
    auteur:"Sylvie Moreau",
    etatSanitaire:"moyen",
    risques:["Scolytes (Ips typographus) — foyer détecté à 800 m","Dépérissement chêne — 12% des tiges","Vent dominant O-NO — risque chablis sur parquet est"],
    notes:"Peuplement de 90 ans, densité excessive (800 tiges/ha). Régénération naturelle absente sous couvert. Intervention urgente sur zone sanitaire (2,1 ha). Reste en futaie jardinée.",
    urgence:"haute",
  },

  photos:[
    {id:"ph1",label:"Vue générale parcelle",date:"2026-03-15",lat:46.5831,lng:2.7654,tag:"diagnostic"},
    {id:"ph2",label:"Foyer scolytes — zone NE",date:"2026-03-15",lat:46.5835,lng:2.7661,tag:"sanitaire"},
    {id:"ph3",label:"Dépérissement chêne — tige n°42",date:"2026-03-15",lat:46.5829,lng:2.7650,tag:"sanitaire"},
    {id:"ph4",label:"Accès chemin forestier",date:"2026-03-15",lat:46.5820,lng:2.7645,tag:"logistique"},
    {id:"ph5",label:"Après coupe sanitaire — zone A",date:"2026-05-10",lat:46.5834,lng:2.7660,tag:"post_travaux"},
    {id:"ph6",label:"Placeau régénération n°1",date:"2026-05-10",lat:46.5828,lng:2.7648,tag:"regeneration"},
  ],

  prescriptions:[
    {type:"Coupe sanitaire",surface:2.1,essences:["Chêne","Acacia"],objectif:"Éliminer le foyer scolyte et les tiges dépérissantes",methode:"Coupe rase de la zone infectée + dessouchage partiel",urgence:"immédiate"},
    {type:"Coupe d'éclaircie",surface:7.8,essences:["Chêne","Charme"],objectif:"Réduire densité de 800 à 400 tiges/ha, favoriser la croissance des beaux brins",methode:"Éclaircie sélective par le bas — prélèvement 30% de la surface terrière",urgence:"T2 2026"},
    {type:"Plantation",surface:2.1,essences:["Chêne sessile","Merisier","Alisier torminal"],objectif:"Restauration après coupe sanitaire — diversification essence et résilience",methode:"Plant forestier 80 cm — 1 100 plants/ha — protection gibier intégrale",urgence:"automne 2026"},
  ],

  entreprises:[
    {nom:"ETF Dupont Frères",siret:"45892103400012",certif:"PEFC",numero:"2023-0156",
     role:"Abattage & débardage",materiel:["John Deere 1270G Harvester","John Deere 1210E Porteur"],
     dateIntervention:"2026-04-20",surface:9.9},
    {nom:"JENZ Déchiquetage SARL",siret:"72341098700034",certif:"ISO 9001",numero:"FR-2022-0089",
     role:"Déchiquetage rémanents",materiel:["Jenz HEM 593 DQ"],
     dateIntervention:"2026-05-02",surface:9.9},
    {nom:"Pépinières Forestières du Centre",siret:"38712045600028",certif:"",numero:"",
     role:"Fourniture plants",materiel:[],
     dateIntervention:"2026-10-15",surface:2.1},
  ],

  surfaces:{
    total:12.4,
    coupeSanitaire:2.1,
    eclaircie:7.8,
    plantation:2.1,
    nonIntervenee:0.4,
  },
  couts:{
    exploitation:8200,
    dechiquetage:1640,
    plantation:3850,
    protectionGibier:920,
    honorairesMandataire:1200,
    total:15810,
    subventions:[
      {source:"FEADER — Plan de relance forêt",montant:2310,statut:"accordé"},
      {source:"Région Auvergne-Rhône-Alpes",montant:850,statut:"en cours"},
    ],
    resteACharge:12650,
  },

  volumes:{
    bo:{prevu:180,reel:183,unite:"m³",destination:"Scierie Marchais — Moulins (03)",preuveRef:"BON-SC-2026-0441",dateLivraison:"2026-04-28"},
    bi:{prevu:0,reel:0,unite:"m³",destination:"",preuveRef:"",dateLivraison:""},
    be:{prevu:320,reel:307,unite:"m³",toTonnes:0.4,destination:"Chaufferie Municipale St-Amand",preuveRef:"BL-2026-0831",dateLivraison:"2026-05-04"},
    remanents:{utilises:307,laissesSol:45,note:"45 m³ rémanents fins laissés au sol pour biodiversité (directive PEFC)"},
  },

  controleApresTravaux:{
    date:"2026-05-20",
    auteur:"Sylvie Moreau",
    conformite:"conforme",
    observations:["Cloisonnements respectés — pas d'ornières majeures","Zone sanitaire propre — souches traitées","3 tiges abimées par le débardage hors prescription — notifiées ETF","Andains rémanents conformes"],
    noteChauffeurs:4,
    noteGlobalETF:4,
    reserves:"Légère dégradation chemin d'accès — remise en état demandée sous 30 jours",
    dateRelance:"2026-06-20",
  },

  regeneration:{
    typeRegeneration:"Artificielle — Plantation",
    essencesPlantees:[
      {essence:"Chêne sessile",plants:1540,pourcent:66,origine:"Provenances locales certifiées"},
      {essence:"Merisier",plants:462,pourcent:20,origine:"Pépinières du Centre"},
      {essence:"Alisier torminal",plants:330,pourcent:14,origine:"Pépinières du Centre"},
    ],
    densite:1100,
    datePlantation:"2026-10-15",
    protectionGibier:"Gaine individuelle biodégradable 80 cm",
    suivi:[
      {date:"2026-05-10",type:"Relevé régénération naturelle",resultat:"Absence constatée — plantation décidée"},
      {date:"2027-05-15",type:"Contrôle reprise plantation",resultat:"À planifier",statut:"prévu"},
      {date:"2028-05-15",type:"Dégagement si nécessaire",resultat:"",statut:"prévu"},
    ],
    objectifCouvert:"2035",
  },
};

const ONGLETS_PARCELLE = [
  {id:"diagnostic",    icon:"🔍", label:"Diagnostic"},
  {id:"photos",        icon:"📷", label:"Photos & GPS"},
  {id:"prescriptions", icon:"📋", label:"Prescriptions"},
  {id:"entreprises",   icon:"🏗️", label:"Entreprises"},
  {id:"surfaces",      icon:"📐", label:"Surfaces & Coûts"},
  {id:"flux",          icon:"🔀", label:"Flux bois"},
  {id:"controle",      icon:"✅", label:"Contrôle"},
  {id:"regeneration",  icon:"🌱", label:"Régénération"},
];

export const SectionParcelleTravaux = () => {
  const [onglet, setOnglet] = useState("diagnostic");
  const p = DEMO_PARCELLE;

  const _totalSubv = p.couts.subventions.reduce((s,sub)=>s+sub.montant,0);
  const volTotalReel = p.volumes.bo.reel + p.volumes.bi.reel + p.volumes.be.reel;
  const pctMatiere = volTotalReel>0 ? Math.round((p.volumes.bo.reel+p.volumes.bi.reel)/volTotalReel*100) : 0;
  const pctEnergie = 100-pctMatiere;

  const renderDiagnostic = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>🔍 Diagnostic initial</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            ["Date","📅 "+new Date(p.diagnostic.date).toLocaleDateString("fr-FR")],
            ["Auteur","👤 "+p.diagnostic.auteur],
            ["État sanitaire",
              {bonne:"🟢 Bon",moyen:"🟡 Moyen",mauvais:"🔴 Mauvais"}[p.diagnostic.etatSanitaire]||p.diagnostic.etatSanitaire],
            ["Urgence d'intervention",
              {haute:"🔴 Haute",moyenne:"🟡 Moyenne",faible:"🟢 Faible"}[p.diagnostic.urgence]||p.diagnostic.urgence],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 10px",
              borderRadius:7,background:"#F9FAFB",fontSize:12}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:12,padding:"10px 12px",background:"#FEF3C7",borderRadius:8,
          border:"1px solid #FCD34D",fontSize:12,color:"#78350F",lineHeight:1.6}}>
          <div style={{fontWeight:700,marginBottom:4}}>📝 Observations</div>
          {p.diagnostic.notes}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>⚠️ Risques identifiés</div>
          {p.diagnostic.risques.map((r,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:12,
              padding:"7px 10px",borderRadius:7,background:"#FEF2F2",border:"1px solid #FECACA"}}>
              <span>🔴</span><span style={{color:"#991B1B",lineHeight:1.4}}>{r}</span>
            </div>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌲 Peuplement</div>
          {[
            ["Essence principale",p.essencePrincipale],
            ["Essences secondaires",p.essencesSecondaires.join(", ")],
            ["Surface totale",`${p.surface} ha`],
            ["GPS",`${p.coordGPS.lat}°N / ${p.coordGPS.lng}°E`],
            ["Propriétaire",p.proprietaire],
            ["Mandataire",p.mandataire],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",
              borderRadius:5,fontSize:11,borderBottom:`1px solid ${C.bd}`}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx,maxWidth:200,textAlign:"right"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPhotos = () => (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {p.photos.map(ph=>{
          const tagColor = {diagnostic:"#0369A1",sanitaire:"#DC2626",logistique:"#92400E",
            post_travaux:"#065F46",regeneration:"#166534"}[ph.tag]||"#6B7280";
          const tagBg = {diagnostic:"#DBEAFE",sanitaire:"#FEE2E2",logistique:"#FEF3C7",
            post_travaux:"#D1FAE5",regeneration:"#DCFCE7"}[ph.tag]||"#F3F4F6";
          return (
            <div key={ph.id} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
              <div style={{height:100,background:`linear-gradient(135deg,${tagBg},#fff)`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>
                📷
              </div>
              <div style={{padding:"8px 10px"}}>
                <div style={{fontSize:11,fontWeight:600,color:C.tx,marginBottom:4}}>{ph.label}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,
                    background:tagBg,color:tagColor,fontWeight:600}}>
                    {ph.tag.replace("_"," ")}
                  </span>
                  <span style={{fontSize:9,color:C.tx2}}>
                    {new Date(ph.date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div style={{fontSize:9,color:C.tx2,marginTop:3}}>
                  📍 {ph.lat}°N / {ph.lng}°E
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{background:"#EFF6FF",borderRadius:10,border:"1px solid #BFDBFE",
        padding:"10px 14px",fontSize:11,color:"#1E40AF"}}>
        💡 Les photos sont géolocalisées automatiquement via l'app mobile APPLITAG. Elles sont horodatées et archivées avec le lot pour traçabilité PEFC.
      </div>
    </div>
  );

  const renderPrescriptions = () => (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {p.prescriptions.map((pr,i)=>(
        <div key={i} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <span style={{fontSize:13,fontWeight:700,color:C.tx}}>{pr.type}</span>
              <span style={{fontSize:11,color:C.tx2,marginLeft:10}}>{pr.surface} ha</span>
            </div>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:pr.urgence==="immédiate"?"#FEE2E2":"#FEF3C7",
              color:pr.urgence==="immédiate"?"#991B1B":"#92400E"}}>
              ⏱ {pr.urgence}
            </span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              ["🎯 Objectif",pr.objectif],
              ["⚙️ Méthode",pr.methode],
              ["🌲 Essences concernées",pr.essences.join(", ")],
            ].map(([k,v])=>(
              <div key={k} style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px",
                fontSize:11,gridColumn:k.includes("Objectif")?"1/-1":undefined}}>
                <div style={{fontWeight:700,color:C.tx2,marginBottom:3}}>{k}</div>
                <div style={{color:C.tx,lineHeight:1.5}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderEntreprises = () => (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {p.entreprises.map((e,i)=>(
        <div key={i} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{e.nom}</div>
              <div style={{fontSize:10,color:C.tx2}}>SIRET : {e.siret}</div>
            </div>
            {e.certif&&(
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
                background:"#D1FAE5",color:"#065F46"}}>
                ✓ {e.certif} {e.numero}
              </span>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:11}}>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>🏗️ Rôle</div>
              <div style={{color:C.tx}}>{e.role}</div>
            </div>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>📅 Intervention</div>
              <div style={{color:C.tx}}>{new Date(e.dateIntervention).toLocaleDateString("fr-FR")}</div>
            </div>
            <div style={{background:"#F9FAFB",borderRadius:7,padding:"8px 10px"}}>
              <div style={{fontWeight:700,color:C.tx2,marginBottom:2}}>📐 Surface</div>
              <div style={{color:C.tx}}>{e.surface} ha</div>
            </div>
          </div>
          {e.materiel.length>0&&(
            <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:6}}>
              {e.materiel.map(m=>(
                <span key={m} style={{fontSize:10,padding:"3px 8px",borderRadius:5,
                  background:"#EDE9FE",color:"#6D28D9",fontWeight:600}}>⚙️ {m}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderSurfaces = () => (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>📐 Surfaces par intervention</div>
        {[
          ["Coupe sanitaire","#DC2626","#FEE2E2",p.surfaces.coupeSanitaire],
          ["Éclaircie","#1E5B3A","#D1FAE5",p.surfaces.eclaircie],
          ["Plantation","#166534","#DCFCE7",p.surfaces.plantation],
          ["Non intervenue","#6B7280","#F3F4F6",p.surfaces.nonIntervenee],
        ].map(([label,col,_bg,val])=>(
          <div key={label} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
              <span style={{color:col,fontWeight:600}}>{label}</span>
              <span style={{fontWeight:700,color:C.tx}}>{val} ha</span>
            </div>
            <div style={{height:6,borderRadius:3,background:"#E5E7EB",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,background:col,
                width:`${(val/p.surfaces.total)*100}%`}}/>
            </div>
          </div>
        ))}
        <div style={{marginTop:10,padding:"8px 10px",background:"#F9FAFB",borderRadius:7,
          display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{fontWeight:700,color:C.tx2}}>Total parcelle</span>
          <span style={{fontWeight:800,color:C.tx}}>{p.surfaces.total} ha</span>
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
        <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>💶 Budget travaux</div>
        {[
          ["Exploitation forestière",p.couts.exploitation],
          ["Déchiquetage",p.couts.dechiquetage],
          ["Plantation",p.couts.plantation],
          ["Protection gibier",p.couts.protectionGibier],
          ["Honoraires mandataire",p.couts.honorairesMandataire],
        ].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
            borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
            <span style={{color:C.tx2}}>{k}</span>
            <span style={{fontWeight:600,color:C.tx}}>{v.toLocaleString("fr-FR")} €</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:13,
          fontWeight:800,color:C.tx,borderTop:`2px solid ${C.bd}`,marginTop:4}}>
          <span>Total travaux</span>
          <span>{p.couts.total.toLocaleString("fr-FR")} €</span>
        </div>
        <div style={{marginTop:8,padding:"10px 12px",background:"#D1FAE5",borderRadius:8,
          border:"1px solid #6EE7B7",fontSize:11}}>
          <div style={{fontWeight:700,color:"#065F46",marginBottom:6}}>🏦 Subventions</div>
          {p.couts.subventions.map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{color:"#065F46"}}>{s.source}</span>
              <span style={{fontWeight:700,color:"#065F46"}}>
                -{s.montant.toLocaleString("fr-FR")} € <span style={{fontSize:9,opacity:.7}}>({s.statut})</span>
              </span>
            </div>
          ))}
          <div style={{borderTop:"1px solid #6EE7B7",marginTop:6,paddingTop:6,
            display:"flex",justifyContent:"space-between",fontWeight:800,color:"#064E3B",fontSize:12}}>
            <span>Reste à charge</span>
            <span>{p.couts.resteACharge.toLocaleString("fr-FR")} €</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFlux = () => {
    const vols = p.volumes;
    return (
      <div>
        {/* Banner usage matière vs énergie */}
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>
            🔀 Répartition des flux bois mobilisés — {volTotalReel} m³ total
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div style={{background:"#D1FAE5",borderRadius:10,padding:"12px 14px",
              border:"1px solid #6EE7B7",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:"#065F46"}}>{pctMatiere}%</div>
              <div style={{fontSize:12,fontWeight:700,color:"#065F46"}}>Usage matière</div>
              <div style={{fontSize:11,color:"#047857",marginTop:2}}>
                {vols.bo.reel+vols.bi.reel} m³ — stockage carbone long terme
              </div>
            </div>
            <div style={{background:"#FEF3C7",borderRadius:10,padding:"12px 14px",
              border:"1px solid #FCD34D",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:900,color:"#92400E"}}>{pctEnergie}%</div>
              <div style={{fontSize:12,fontWeight:700,color:"#92400E"}}>Usage énergie</div>
              <div style={{fontSize:11,color:"#B45309",marginTop:2}}>
                {vols.be.reel} m³ — valorisation énergétique
              </div>
            </div>
          </div>

          {/* Barre de flux visuelle */}
          <div style={{height:16,borderRadius:8,overflow:"hidden",display:"flex",marginBottom:6}}>
            <div style={{width:`${Math.round(vols.bo.reel/volTotalReel*100)}%`,background:"#1E5B3A",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BO</div>
            <div style={{width:`${Math.round(vols.bi.reel/volTotalReel*100)}%`,background:"#0369A1",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BI</div>
            <div style={{width:`${Math.round(vols.be.reel/volTotalReel*100)}%`,background:"#B45309",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:9,color:"#fff",fontWeight:700}}>BE</div>
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center",fontSize:10}}>
            {[["#1E5B3A","Bois d'œuvre (BO)"],["#0369A1","Bois d'industrie (BI)"],["#B45309","Bois énergie (BE)"]].map(([col,lbl])=>(
              <span key={lbl} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:10,height:10,borderRadius:2,background:col,display:"inline-block"}}/>
                <span style={{color:C.tx2}}>{lbl}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Détail par qualité */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {QUALITES_BOIS.map(q=>{
            const vol = vols[q.id];
            if(!vol) return null;
            return (
              <div key={q.id} style={{background:"#fff",borderRadius:12,
                border:`2px solid ${vol.reel>0?q.couleur+"44":C.bd}`,padding:16,
                opacity:vol.reel===0?.5:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:24}}>{q.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:q.couleur}}>{q.label}</div>
                      <div style={{fontSize:11,color:C.tx2}}>{q.desc}</div>
                    </div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
                    background:q.usage==="matiere"?"#D1FAE5":"#FEF3C7",
                    color:q.usage==="matiere"?"#065F46":"#92400E"}}>
                    {q.usage==="matiere"?"♻️ Usage matière":"🔥 Usage énergie"}
                  </span>
                </div>
                {vol.reel>0 ? (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,fontSize:11}}>
                    {[
                      ["Volume prévu",`${vol.prevu} ${vol.unite}`],
                      ["Volume réel",`${vol.reel} ${vol.unite}`],
                      ["Destination",vol.destination||"—"],
                      ["Preuve / BL",vol.preuveRef||"—"],
                    ].map(([k,v])=>(
                      <div key={k} style={{background:q.bg,borderRadius:7,padding:"8px 10px"}}>
                        <div style={{fontWeight:700,color:q.couleur,marginBottom:2,fontSize:10}}>{k}</div>
                        <div style={{color:C.tx,fontWeight:600}}>{v}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize:11,color:C.tx2,fontStyle:"italic"}}>
                    Aucun volume de cette qualité sur ce chantier
                  </div>
                )}
              </div>
            );
          })}

          {/* Rémanents */}
          <div style={{background:"#F9FAFB",borderRadius:10,border:`1px solid ${C.bd}`,
            padding:"10px 14px",fontSize:11}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:6}}>🍂 Rémanents & menu bois</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <span style={{color:"#92400E"}}>🔥 Valorisés déchiquetage : <strong>{vols.remanents.utilises} m³</strong></span>
              <span style={{color:"#065F46"}}>🌿 Laissés au sol : <strong>{vols.remanents.laissesSol} m³</strong></span>
            </div>
            <div style={{marginTop:6,color:C.tx2,fontStyle:"italic"}}>{vols.remanents.note}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderControle = () => {
    const ctrl = p.controleApresTravaux;
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:12,fontSize:13}}>✅ Contrôle après travaux</div>
          {[
            ["Date",new Date(ctrl.date).toLocaleDateString("fr-FR")],
            ["Contrôleur",ctrl.auteur],
            ["Conformité",ctrl.conformite==="conforme"?"✅ Conforme":"⚠️ Réserves"],
            ["Note ETF","⭐".repeat(ctrl.noteGlobalETF)+" ("+ctrl.noteGlobalETF+"/5)"],
          ].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 8px",
              borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
              <span style={{color:C.tx2}}>{k}</span>
              <span style={{fontWeight:600,color:C.tx}}>{v}</span>
            </div>
          ))}

          {ctrl.reserves&&(
            <div style={{marginTop:10,background:"#FEF3C7",borderRadius:8,border:"1px solid #FCD34D",
              padding:"8px 10px",fontSize:11,color:"#92400E"}}>
              <div style={{fontWeight:700,marginBottom:4}}>⚠️ Réserve</div>
              {ctrl.reserves}
              <div style={{marginTop:4,color:"#B45309",fontWeight:600}}>
                Relance : {new Date(ctrl.dateRelance).toLocaleDateString("fr-FR")}
              </div>
            </div>
          )}
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>📋 Points de contrôle</div>
          {ctrl.observations.map((o,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:7,fontSize:11,
              padding:"6px 10px",borderRadius:7,
              background:"#F0FDF4",border:"1px solid #BBF7D0"}}>
              <span style={{color:"#16A34A",flexShrink:0}}>✓</span>
              <span style={{color:"#065F46"}}>{o}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRegeneration = () => {
    const reg = p.regeneration;
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌱 Plan de régénération</div>
            {[
              ["Type",reg.typeRegeneration],
              ["Date plantation",new Date(reg.datePlantation).toLocaleDateString("fr-FR")],
              ["Densité",reg.densite+" plants/ha"],
              ["Protection",reg.protectionGibier],
              ["Objectif couvert",reg.objectifCouvert],
            ].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 8px",
                borderBottom:`1px solid ${C.bd}`,fontSize:12}}>
                <span style={{color:C.tx2}}>{k}</span>
                <span style={{fontWeight:600,color:C.tx,maxWidth:200,textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>🌿 Essences plantées</div>
            {reg.essencesPlantees.map(e=>(
              <div key={e.essence} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
                  <span style={{fontWeight:600,color:C.tx}}>{e.essence}</span>
                  <span style={{color:"#1E5B3A",fontWeight:700}}>{e.plants} plants ({e.pourcent}%)</span>
                </div>
                <div style={{height:6,borderRadius:3,background:"#E5E7EB",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,background:"#1E5B3A",
                    width:`${e.pourcent}%`}}/>
                </div>
                <div style={{fontSize:9,color:C.tx2,marginTop:2}}>{e.origine}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{fontWeight:700,color:C.tx,marginBottom:10,fontSize:13}}>📅 Calendrier de suivi</div>
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",left:14,top:0,bottom:0,width:2,background:"#E5E7EB"}}/>
            {reg.suivi.map((s,i)=>{
              const done = s.statut!=="prévu";
              return (
                <div key={i} style={{display:"flex",gap:12,marginBottom:16,position:"relative"}}>
                  <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,zIndex:1,
                    background:done?"#1E5B3A":"#fff",
                    border:`2px solid ${done?"#1E5B3A":"#9CA3AF"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,color:done?"#fff":"#6B7280",fontWeight:700}}>
                    {done?"✓":"○"}
                  </div>
                  <div style={{paddingTop:3}}>
                    <div style={{fontSize:10,color:C.tx2}}>{new Date(s.date).toLocaleDateString("fr-FR")}</div>
                    <div style={{fontSize:12,fontWeight:600,color:done?C.tx:"#9CA3AF"}}>{s.type}</div>
                    {s.resultat&&<div style={{fontSize:11,color:C.tx2,fontStyle:"italic"}}>{s.resultat}</div>}
                    {!done&&<span style={{fontSize:9,background:"#FEF3C7",color:"#92400E",
                      padding:"1px 5px",borderRadius:3,fontWeight:600}}>À planifier</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderContenu = () => {
    switch(onglet){
      case "diagnostic":    return renderDiagnostic();
      case "photos":        return renderPhotos();
      case "prescriptions": return renderPrescriptions();
      case "entreprises":   return renderEntreprises();
      case "surfaces":      return renderSurfaces();
      case "flux":          return renderFlux();
      case "controle":      return renderControle();
      case "regeneration":  return renderRegeneration();
      default:              return null;
    }
  };

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête parcelle */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,
        padding:"14px 20px",marginBottom:16,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:"#D1FAE5",color:"#065F46"}}>{p.ref}</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:5,fontWeight:700,
              background:"#FEE2E2",color:"#991B1B"}}>⚠️ Urgence haute</span>
          </div>
          <div style={{fontSize:17,fontWeight:800,color:C.tx,marginTop:4}}>{p.nom}</div>
          <div style={{fontSize:12,color:C.tx2}}>
            📍 {p.commune} · {p.surface} ha · {p.essencePrincipale.split(" ")[0]} · {p.proprietaire}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,textAlign:"center"}}>
          {[
            {icon:"📊",val:`${volTotalReel} m³`,lbl:"Volume total"},
            {icon:"♻️",val:`${pctMatiere}%`,lbl:"Usage matière"},
            {icon:"🔥",val:`${pctEnergie}%`,lbl:"Usage énergie"},
          ].map(k=>(
            <div key={k.lbl} style={{background:"#F9FAFB",borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:16}}>{k.icon}</div>
              <div style={{fontSize:14,fontWeight:800,color:C.tx}}>{k.val}</div>
              <div style={{fontSize:9,color:C.tx2}}>{k.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:4,flexWrap:"wrap"}}>
        {ONGLETS_PARCELLE.map(o=>(
          <button key={o.id} onClick={()=>setOnglet(o.id)}
            style={{padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:600,
              cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",
              border:`1px solid ${onglet===o.id?"#1E5B3A":C.bd}`,
              background:onglet===o.id?"#1E5B3A":"transparent",
              color:onglet===o.id?"#fff":C.tx2}}>
            {o.icon} {o.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      {renderContenu()}
    </div>
  );
};

// ── VEILLE RÉGLEMENTAIRE ───────────────────────────────────────

export const CLAUSE_RESERVE = "Projet techniquement préparé, sous réserve du cadre réglementaire et de l'ouverture effective du dispositif au jour du dépôt.";


const SNAPSHOTS_DOSSIER = [
  {
    id:"snap1",
    dossierId:"PAR-2026-001",
    dossierNom:"Forêt Bernard — Tronçais Nord",
    datePreparation:"2026-04-15",
    auteur:"Sylvie Moreau",
    textesSnapshot:[
      {ref:"Décret n° 2025-401",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"Arrêté du 2 mai 2025",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
      {ref:"FEADER PDR AuRA",version:"v2023",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:true,
    alerteDetail:"Décret 2025-401 annulé le 15/07/2026 — dossier préparé sous texte désormais annulé",
    statut:"alerte",
  },
  {
    id:"snap2",
    dossierId:"PAR-2025-047",
    dossierNom:"Bois de la Croix — Montluçon",
    datePreparation:"2025-09-10",
    auteur:"Jean-Paul Faure",
    textesSnapshot:[
      {ref:"Décret n° 2025-401",version:"v1.0 mai 2025",statut_au_depot:"applicable"},
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:true,
    alerteDetail:"Décret 2025-401 annulé le 15/07/2026 — analyser impact sur dossier accordé",
    statut:"alerte",
  },
  {
    id:"snap3",
    dossierId:"PAR-2025-061",
    dossierNom:"Pinède de Commentry",
    datePreparation:"2025-11-20",
    auteur:"Sylvie Moreau",
    textesSnapshot:[
      {ref:"PEFC ST 2-20-3:2022",version:"v2022",statut_au_depot:"applicable"},
    ],
    clauseReserveApposee:true,
    alerteReglPostDepot:false,
    alerteDetail:"",
    statut:"conforme",
  },
];

/* ── IA TRANSPARENCE — Art. 50 Règlement IA — applicable 02/08/2026 ── */
const IA_STATUT = {
  conforme:   {label:"Conforme",         color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  a_adapter:  {label:"À adapter avant le 2 août", color:"#B45309", bg:"#FEF3C7", icon:"⚠️"},
  non_conforme:{label:"Non conforme",    color:"#991B1B", bg:"#FEE2E2", icon:"🚫"},
  hors_scope: {label:"Hors scope art.50",color:"#6B7280", bg:"#F3F4F6", icon:"ℹ️"},
};

const INVENTAIRE_IA = [
  {
    id:"assistant",
    nom:"Assistant métier APPLITAG",
    type:"Système interactif",
    scope50:"Oui — interaction directe utilisateur",
    statut:"a_adapter",
    mentions:[
      {texte:"🤖 Assistant IA — réponses générées automatiquement", fait:false},
      {texte:"Distinction donnée mesurée / estimation IA", fait:false},
      {texte:"Validation humaine avant transmission contractuelle", fait:false},
    ],
    controlHumain:"À formaliser",
    donneesTransmises:"Données de chantier, essences, volumes → LLM externe",
    prestataire:"À identifier et encadrer (DPA)",
    journalDecisions:false,
    risques:["IA bloquant seule un lot ou un chantier","Donnée contractuelle transmise sans encadrement"],
  },
  {
    id:"rapports",
    nom:"Génération de rapports",
    type:"Contenu généré par IA",
    scope50:"Oui — contenu produit automatiquement",
    statut:"a_adapter",
    mentions:[
      {texte:"« Suggestion générée automatiquement »", fait:false},
      {texte:"Validation humaine obligatoire avant diffusion", fait:false},
      {texte:"Horodatage et auteur de la validation", fait:false},
    ],
    controlHumain:"Validation avant export PDF / envoi",
    donneesTransmises:"Données de visite, lots, GES",
    prestataire:"À confirmer",
    journalDecisions:false,
    risques:["Rapport transmis sans relecture","Estimation présentée comme mesure"],
  },
  {
    id:"synthese",
    nom:"Synthèses de chantiers",
    type:"Résumé automatique",
    scope50:"Oui — texte généré automatiquement",
    statut:"a_adapter",
    mentions:[
      {texte:"« Synthèse générée automatiquement »", fait:false},
      {texte:"Sources des données citées", fait:true},
    ],
    controlHumain:"Relecture recommandée",
    donneesTransmises:"Données terrain APPLITAG",
    prestataire:"À confirmer",
    journalDecisions:false,
    risques:["Synthèse erronée diffusée comme compte-rendu officiel"],
  },
  {
    id:"anomalies",
    nom:"Détection d'anomalies",
    type:"Décision automatisée (aide à la décision)",
    scope50:"Partiel — décision finale humaine obligatoire",
    statut:"a_adapter",
    mentions:[
      {texte:"« Anomalie détectée par l'algorithme — à confirmer »", fait:false},
      {texte:"L'IA ne bloque aucune action sans validation humaine", fait:false},
    ],
    controlHumain:"OBLIGATOIRE — l'IA ne peut pas refuser seule un lot",
    donneesTransmises:"Données de livraison, humidité, pesées",
    prestataire:"Interne",
    journalDecisions:true,
    risques:["IA refusant automatiquement un lot sans action humaine"],
  },
  {
    id:"radio_tv",
    nom:"APPLITAG Radio & TV",
    type:"Voix et images synthétiques",
    scope50:"Oui — obligation de signalement explicite",
    statut:"a_adapter",
    mentions:[
      {texte:"« Voix / image générée par intelligence artificielle »", fait:false},
      {texte:"Aucune fausse interview ou deepfake non signalé", fait:false},
      {texte:"Règle éditoriale formalisée avant diffusion", fait:false},
    ],
    controlHumain:"Validation éditoriale avant toute diffusion",
    donneesTransmises:"Voix synthétique générée localement ou via API",
    prestataire:"À formaliser dans la règle éditoriale",
    journalDecisions:false,
    risques:["Voix artificielle non identifiée","Fausse interview diffusée"],
  },
  {
    id:"textes_info",
    nom:"Textes d'information automatiques",
    type:"Contenu généré par IA",
    scope50:"Oui — diffusion publique ou contractuelle",
    statut:"a_adapter",
    mentions:[
      {texte:"« Texte généré automatiquement — vérifier avant utilisation »", fait:false},
      {texte:"Distinction claire donnée source / texte produit", fait:false},
    ],
    controlHumain:"Recommandé pour toute diffusion externe",
    donneesTransmises:"Données APPLITAG → modèle de langage",
    prestataire:"À encadrer",
    journalDecisions:false,
    risques:["Données personnelles transmises à prestataire non encadré"],
  },
];

const JOURNAL_IA_DEMO = [
  {date:"2026-07-15",fonction:"Rapports",action:"Rapport GES lot LOT-2026-004",
   suggestion:"GES estimé à 18,4 kgCO₂eq/MJ — seuil RED II respecté",
   validation:"Validé par J. Lefèvre",decisionFinale:"Rapport transmis au maître d'ouvrage",
   corrigé:false},
  {date:"2026-07-18",fonction:"Anomalies",action:"Détection humidité élevée livraison LIV-007",
   suggestion:"Humidité 42 % — lot suspendu par l'algorithme",
   validation:"Confirmé par opérateur plateforme",decisionFinale:"Lot refusé, contre-mesure en cours",
   corrigé:false},
  {date:"2026-07-20",fonction:"Synthèses",action:"Synthèse chantier CHT-2026-012",
   suggestion:"3 essences identifiées, volume estimé 145 m³",
   validation:"Corrigé : volume réel 138 m³",decisionFinale:"Synthèse corrigée archivée",
   corrigé:true},
];

// ── EU AI ACT ART. 50 — REGISTRE IA ────────────────────────────
// Mentions obligatoires applicables dès le 2 août 2026

const AI_BADGE = ({label="Assistant IA"}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",
    borderRadius:99,background:"#EDE9FE",color:"#5B21B6",fontSize:11,fontWeight:700,
    border:"1px solid #C4B5FD"}}>🤖 {label}</span>
);

const DATA_SOURCE_TAG = ({type}) => {
  const map = {
    mesuree:   {label:"Donnée mesurée",    bg:"#D1FAE5",c:"#065F46"},
    declaree:  {label:"Déclarée fournisseur",bg:"#DBEAFE",c:"#1E3A5F"},
    calculee:  {label:"Calculée",          bg:"#FEF3C7",c:"#92400E"},
    estimee:   {label:"Estimée IA",        bg:"#EDE9FE",c:"#5B21B6"},
  };
  const s=map[type]||map.declaree;
  return <span style={{padding:"1px 7px",borderRadius:99,fontSize:10,fontWeight:700,background:s.bg,color:s.c}}>{s.label}</span>;
};

const REGISTRE_IA_FONCTIONS = [
  {id:"r1", module:"Analyses & Rapports", fonction:"Suggestion de synthèse lot", type:"generatif",
   mention:"Le texte proposé est généré automatiquement à partir des données saisies. Aucune décision ne doit s'appuyer sur ce texte sans vérification humaine.",
   decision:"Humain obligatoire", actif:true},
  {id:"r2", module:"Bilan GES", fonction:"Estimation du facteur d'émission transport", type:"calcul_ia",
   mention:"Le facteur d'émission est estimé à partir des données de distance et de type de véhicule. La valeur affichée est une estimation — non une mesure certifiée.",
   decision:"Validation opérateur", actif:true},
  {id:"r3", module:"Veille marchés", fonction:"Classement de l'intérêt commercial", type:"recommandation",
   mention:"Le score d'intérêt commercial est calculé automatiquement. Il n'engage pas ALTEGAD et doit être confirmé par le chargé d'affaires.",
   decision:"Humain obligatoire", actif:true},
  {id:"r4", module:"Conformité RED", fonction:"Contrôle de conformité RED III par lot", type:"calcul_ia",
   mention:"La vérification est réalisée par comparaison des données déclarées aux seuils réglementaires. Elle ne remplace pas un audit certifié.",
   decision:"Validation opérateur", actif:true},
  {id:"r5", module:"Scierie", fonction:"Indicateurs de marge par coproduit", type:"calcul_ia",
   mention:"Les marges affichées sont calculées à partir des données saisies. Elles ne constituent pas un document comptable.",
   decision:"Information", actif:true},
];

export const SectionRegistreIA = () => {
  const _inp={height:INPUT_H,borderRadius:10,border:`1px solid ${C.bd}`,
    padding:"0 14px",fontSize:14,boxSizing:"border-box",width:"100%"};

  return (
    <div style={{padding:PADDING,maxWidth:660,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#3730A3 0%,#5B21B6 100%)",borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🤖</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:4}}>Registre IA — EU AI Act Art. 50</div>
        <div style={{fontSize:13,opacity:.85}}>Obligations de transparence applicables dès le <strong>2 août 2026</strong></div>
      </div>

      <div style={{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:10,
        padding:"12px 14px",marginBottom:16,fontSize:13,lineHeight:1.5,color:"#92400E"}}>
        <strong>⏳ Échéance : demain 2 août 2026.</strong> Les systèmes interactifs, recommandations automatiques et contenus générés par IA doivent être clairement identifiés. Une recommandation automatique ne peut pas être présentée comme une mesure terrain, une validation juridique ou une décision de conformité.
      </div>

      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:12}}>📋 Fonctions IA déclarées dans APPLITAG</div>
        {REGISTRE_IA_FONCTIONS.map(f=>(
          <div key={f.id} style={{borderBottom:`1px solid ${C.bd}`,padding:"10px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
              <div>
                <span style={{fontWeight:700,fontSize:13,color:C.tx}}>{f.module}</span>
                <span style={{fontSize:12,color:C.tx3,marginLeft:8}}>— {f.fonction}</span>
              </div>
              <AI_BADGE label={f.type==="generatif"?"Génératif":f.type==="recommandation"?"Recommandation":"Calcul IA"}/>
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.5,marginBottom:4,fontStyle:"italic"}}>"{f.mention}"</div>
            <div style={{fontSize:11,color:f.decision==="Humain obligatoire"?C.red:C.amber,fontWeight:700}}>
              👤 {f.decision}
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:14,color:C.tx,marginBottom:10}}>🏷️ Sources de données — légende obligatoire</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <DATA_SOURCE_TAG type="mesuree"/>
          <DATA_SOURCE_TAG type="declaree"/>
          <DATA_SOURCE_TAG type="calculee"/>
          <DATA_SOURCE_TAG type="estimee"/>
        </div>
        <div style={{fontSize:12,color:C.tx3,marginTop:10,lineHeight:1.6}}>
          Chaque donnée affichée dans les rapports et fiches de conformité doit indiquer son origine.
          Une donnée <strong>estimée par IA</strong> ne peut jamais être présentée comme une mesure terrain.
        </div>
      </div>

      <div style={{background:"#EDE9FE",borderRadius:12,padding:"14px 16px",border:"1px solid #C4B5FD"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#5B21B6",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>✅ Checklist mise en conformité Art. 50</div>
        {[
          ["✅","Badge « Assistant IA » affiché sur chaque recommandation automatique","done"],
          ["✅","Distinction mesurée / déclarée / calculée / estimée dans les rapports","done"],
          ["✅","Validation humaine obligatoire pour les décisions sensibles (conformité RED, GES)","done"],
          ["⬜","Deepfakes : non applicable (pas de contenu vidéo/audio dans APPLITAG)","pending"],
          ["⬜","Conservation des sources et corrections dans l'historique","pending"],
          ["⬜","Publication du registre IA accessible aux utilisateurs","pending"],
        ].map(([icon,label,status])=>(
          <div key={label} style={{display:"flex",gap:8,padding:"5px 0",fontSize:13,
            color:status==="done"?"#5B21B6":"#7C3AED",borderBottom:`1px solid #DDD6FE`}}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── BOIS DE CRISE — TRAÇABILITÉ LOTS SINISTRÉS ──────────────────
const TYPES_SINISTRE = ["Incendie","Tempête","Sécheresse / dépérissement","Inondation","Attaque parasitaire","Autre"];
const ETATS_BOIS_SINISTRE = [
  {id:"brule",  label:"Brûlé",         icon:"🔥", couleur:"#991B1B", bg:"#FEE2E2"},
  {id:"echauffe",label:"Échauffé",     icon:"🟠", couleur:"#C2410C", bg:"#FFEDD5"},
  {id:"bleuissant",label:"Bleuissant", icon:"🔵", couleur:"#1E3A5F", bg:"#DBEAFE"},
  {id:"intact",  label:"Intact",       icon:"🟢", couleur:"#065F46", bg:"#D1FAE5"},
];
const DESTINATIONS_CRISE = [
  "Sciage (bois intact)","Panneau / déroulage","Pâte à papier","Bois énergie","Trituration","Élimination",
];
const CRISE_KEY = "applitag_bois_crise";
const criseGet = () => { try { return JSON.parse(localStorage.getItem(CRISE_KEY)||"[]"); } catch { return []; } };
const criseSet = (arr) => { try { localStorage.setItem(CRISE_KEY,JSON.stringify(arr)); } catch { /* noop */ } };

const DEMO_LOTS_CRISE = [
  {id:"lc1",ref:"CRISE-2026-001",proprietaire:"M. Dupont Henri",mandataire:"Cabinet Forêt Sud",
   parcelle:"BD-103-A",commune:"Lanton (33)",gps:{lat:44.7122,lng:-1.0433},
   sinistre:"Incendie",dateSinistre:"2026-07-18",essence:"Pin maritime",
   volumeEstime:380,volumeMesure:null,etat:"brule",
   destination:"Bois énergie",prix:null,transporteur:null,
   statut:"constat",photos:1,createdAt:"2026-07-28T09:00:00Z"},
  {id:"lc2",ref:"CRISE-2026-002",proprietaire:"GAEC Les Pins",mandataire:"Coopérative GIPLAIT",
   parcelle:"BD-89-C",commune:"Lacanau (33)",gps:{lat:44.9831,lng:-1.0874},
   sinistre:"Incendie",dateSinistre:"2026-07-18",essence:"Pin maritime",
   volumeEstime:1200,volumeMesure:1150,etat:"bleuissant",
   destination:"Pâte à papier",prix:18,transporteur:"Camion Morin",
   statut:"en_transit",photos:3,createdAt:"2026-07-30T14:00:00Z"},
];

export const SectionBoisCrise = () => {
  const [tab, setTab] = useState("liste");
  const [lots, setLots] = useState(()=>{ const d=criseGet(); return d.length?d:[...DEMO_LOTS_CRISE]; });

  // Formulaire
  const [prop,    setProp]    = useState("");
  const [mand,    setMand]    = useState("");
  const [parcelle,setParcelle]= useState("");
  const [commune, setCommune] = useState("");
  const [lat,     setLat]     = useState("");
  const [lng,     setLng]     = useState("");
  const [sin,     setSin]     = useState("Incendie");
  const [dateSin, setDateSin] = useState(todayS());
  const [essence, setEssence] = useState("Pin maritime");
  const [volEst,  setVolEst]  = useState("");
  const [volMes,  setVolMes]  = useState("");
  const [etat,    setEtat]    = useState("brule");
  const [dest,    setDest]    = useState("Bois énergie");
  const [saved,   setSaved]   = useState(false);

  const gps = () => navigator.geolocation?.getCurrentPosition(p=>{setLat(p.coords.latitude.toFixed(5));setLng(p.coords.longitude.toFixed(5));});

  const ajouter = () => {
    if (!prop || !parcelle || !volEst) return;
    const lot = {id:uid(),ref:`CRISE-${todayS().replace(/-/g,"").slice(2)}-${String(lots.length+1).padStart(3,"0")}`,
      proprietaire:prop,mandataire:mand,parcelle,commune,
      gps:lat&&lng?{lat:parseFloat(lat),lng:parseFloat(lng)}:null,
      sinistre:sin,dateSinistre:dateSin,essence,
      volumeEstime:parseFloat(volEst),volumeMesure:volMes?parseFloat(volMes):null,
      etat,destination:dest,prix:null,transporteur:null,statut:"constat",photos:0,
      createdAt:nowISO()};
    const upd=[lot,...lots]; setLots(upd); criseSet(upd);
    setProp(""); setMand(""); setParcelle(""); setCommune(""); setVolEst(""); setVolMes(""); setLat(""); setLng("");
    setSaved(true); setTimeout(()=>setSaved(false),2500);
  };

  const inp={height:INPUT_H,borderRadius:10,border:`1px solid ${C.bd}`,padding:"0 14px",fontSize:14,boxSizing:"border-box",width:"100%"};
  const Fld=({label,children})=>(
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:700,color:C.tx3,marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
      {children}
    </div>
  );

  const totalVol = lots.reduce((s,l)=>s+(l.volumeEstime||0),0);
  const lotsEnTransit = lots.filter(l=>l.statut==="en_transit").length;

  const STATUTS={constat:{l:"Constat",bg:"#FEF3C7",c:"#92400E"},en_transit:{l:"En transit",bg:"#DBEAFE",c:"#1E3A5F"},livre:{l:"Livré",bg:"#D1FAE5",c:"#065F46"},archive:{l:"Archivé",bg:C.bg,c:C.tx3}};

  return (
    <div style={{padding:PADDING,maxWidth:660,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#7F1D1D 0%,#92400E 100%)",borderRadius:14,padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>🌲🔥</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>Bois de crise</div>
        <div style={{fontSize:13,opacity:.85}}>Traçabilité des lots sinistrés — propriétaire · parcelle · état · destination</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>🌲 {lots.length} lots</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>📦 {totalVol.toLocaleString("fr-FR")} m³ estimés</span>
          <span style={{padding:"3px 10px",borderRadius:99,fontSize:12,background:"rgba(255,255,255,.15)"}}>🚛 {lotsEnTransit} en transit</span>
        </div>
      </div>

      <div style={{background:"#FFF7ED",border:"1px solid #FB923C",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:13,lineHeight:1.5,color:"#7C2D12"}}>
        <strong>⚠️ Principe éthique fondamental :</strong> Ne pas prospecter directement auprès des propriétaires sinistrés. Passer par les interprofessions, coopératives, experts forestiers et assureurs. Tout mouvement de bois exige un <strong>mandat incontestable</strong>.
      </div>

      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["liste","📋 Lots"],["nouveau","➕ Nouveau lot"]].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"10px 0",borderRadius:10,
            border:`1.5px solid ${tab===id?"#991B1B":C.bd}`,background:tab===id?"#FEE2E2":"#fff",
            color:tab===id?"#991B1B":C.tx2,fontWeight:tab===id?700:500,fontSize:14,cursor:"pointer"}}>{l}</button>
        ))}
      </div>

      {tab==="nouveau" && (
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Propriétaire"><input value={prop} onChange={e=>setProp(e.target.value)} placeholder="Nom propriétaire" style={inp}/></Fld>
            <Fld label="Mandataire / Expert"><input value={mand} onChange={e=>setMand(e.target.value)} placeholder="Expert, coopérative..." style={inp}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="N° Parcelle cadastrale"><input value={parcelle} onChange={e=>setParcelle(e.target.value)} placeholder="Ex: BD-103-A" style={inp}/></Fld>
            <Fld label="Commune"><input value={commune} onChange={e=>setCommune(e.target.value)} placeholder="Commune (dép.)" style={inp}/></Fld>
          </div>
          <Fld label="Coordonnées GPS">
            <div style={{display:"flex",gap:8}}>
              <input value={lat} onChange={e=>setLat(e.target.value)} placeholder="Latitude" style={{...inp,flex:1}}/>
              <input value={lng} onChange={e=>setLng(e.target.value)} placeholder="Longitude" style={{...inp,flex:1}}/>
              <button onClick={gps} style={{height:INPUT_H,padding:"0 14px",borderRadius:10,border:`1px solid ${C.blue}`,background:C.blueL,color:C.blue,cursor:"pointer",fontSize:18}}>📍</button>
            </div>
          </Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <Fld label="Type sinistre">
              <select value={sin} onChange={e=>setSin(e.target.value)} style={{...inp,background:"#fff"}}>
                {TYPES_SINISTRE.map(s=><option key={s}>{s}</option>)}
              </select>
            </Fld>
            <Fld label="Date sinistre"><input type="date" value={dateSin} onChange={e=>setDateSin(e.target.value)} style={inp}/></Fld>
            <Fld label="Essence"><input value={essence} onChange={e=>setEssence(e.target.value)} placeholder="Essence" style={inp}/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Volume estimé (m³)"><input type="number" value={volEst} onChange={e=>setVolEst(e.target.value)} placeholder="0" style={inp}/></Fld>
            <Fld label="Volume mesuré (m³)"><input type="number" value={volMes} onChange={e=>setVolMes(e.target.value)} placeholder="si cubé" style={inp}/></Fld>
          </div>
          <Fld label="État du bois">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {ETATS_BOIS_SINISTRE.map(e=>(
                <label key={e.id} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",
                  borderRadius:10,border:`2px solid ${etat===e.id?e.couleur:C.bd}`,
                  background:etat===e.id?e.bg:"#fff",cursor:"pointer",fontSize:13}}>
                  <input type="radio" name="etat_bois" value={e.id} checked={etat===e.id} onChange={()=>setEtat(e.id)} style={{accentColor:e.couleur}}/>
                  {e.icon} {e.label}
                </label>
              ))}
            </div>
          </Fld>
          <Fld label="Destination autorisée">
            <select value={dest} onChange={e=>setDest(e.target.value)} style={{...inp,background:"#fff"}}>
              {DESTINATIONS_CRISE.map(d=><option key={d}>{d}</option>)}
            </select>
          </Fld>
          <button onClick={ajouter} disabled={!prop||!parcelle||!volEst} style={{
            height:BTN_H,width:"100%",borderRadius:12,border:"none",marginTop:8,
            background:(!prop||!parcelle||!volEst)?"#ccc":"#991B1B",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
            + Enregistrer le lot sinistré
          </button>
          {saved&&<div style={{marginTop:8,padding:"10px 14px",borderRadius:10,background:C.greenL,color:C.greenD,fontWeight:600,fontSize:14,textAlign:"center"}}>✅ Lot enregistré</div>}
        </div>
      )}

      {tab==="liste" && lots.map(l=>{
        const etInfo=ETATS_BOIS_SINISTRE.find(e=>e.id===l.etat)||ETATS_BOIS_SINISTRE[0];
        const st=STATUTS[l.statut]||STATUTS.constat;
        return (
          <div key={l.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:C.tx}}>{l.ref}</div>
                <div style={{fontSize:12,color:C.tx3}}>{l.proprietaire} {l.mandataire&&`· ${l.mandataire}`}</div>
              </div>
              <div style={{display:"flex",gap:6,flexDirection:"column",alignItems:"flex-end"}}>
                <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,background:etInfo.bg,color:etInfo.couleur}}>{etInfo.icon} {etInfo.label}</span>
                <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,background:st.bg,color:st.c}}>{st.l}</span>
              </div>
            </div>
            <div style={{fontSize:13,color:C.tx2,display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              <span>📍 {l.commune||"—"} {l.parcelle&&`· ${l.parcelle}`}</span>
              <span>🌲 {l.essence}</span>
              <span>📏 Estimé : <strong>{l.volumeEstime} m³</strong></span>
              <span>{l.volumeMesure?`✅ Mesuré : ${l.volumeMesure} m³`:"⬜ Non cubé"}</span>
              <span>🎯 {l.destination}</span>
              <span>⚡ {l.sinistre} · {l.dateSinistre}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── FICHE COMBUSTIBLE CONTRACTUELLE ─────────────────────────────
const FICHE_COMB_KEY = "applitag_fiches_combustible";
const ficheCombGet = () => { try { return JSON.parse(localStorage.getItem(FICHE_COMB_KEY)||"[]"); } catch { return []; } };

const DEMO_FICHES_COMB = [
  {id:"fc1",chaufferie:"Chaufferie Communale — Saint-Julien-de-Concelles",version:"v1.0",dateVersion:"2026-07-12",
   produit:"Plaquettes forestières",norme:"NF EN ISO 17225-4",
   humiditeMax:35,cendresMax:2,poussiereMax:4,pcRef:3.1,rayonMax:100,
   controleFreq:"À chaque livraison",echantillonnage:"Méthode EN 14778",
   conservationEchantillon:"3 mois après livraison",
   docsObligatoires:["Bon de pesée","Attestation conformité","Fiche traçabilité lot","CMR"],
   stockMinimal:"15 jours de consommation",delaiExceptionnel:"48 h",
   seuils_decision:{accept:"Toutes valeurs dans les bornes",reserve:"Humidité entre 35 et 40 %",refus:"Au-delà des seuils ou traçabilité manquante"},
   responsableDecision:"Chef de chauffe — validation manuelle obligatoire",
   ao:"Consultation fermée le 12 août 2026 à 10 h",statut:"actif"},
  {id:"fc2",chaufferie:"Chaufferie Intercommunale — Pontcharra",version:"v1.0",dateVersion:"2026-07-24",
   produit:"Plaquettes forestières P45",norme:"NF EN ISO 17225-4",
   humiditeMax:35,cendresMax:null,poussiereMax:null,pcRef:null,rayonMax:null,
   controleFreq:"Périodique (cahier des charges)",echantillonnage:"Conservation d'échantillons obligatoire",
   conservationEchantillon:"Durée contractuelle",
   docsObligatoires:["Preuve de pesée","Fiche traçabilité","Preuve de conformité","BL signé"],
   stockMinimal:"Garantie de stock",delaiExceptionnel:"Procédure de refus définie",
   seuils_decision:{accept:"Conforme humidité + traçabilité",reserve:"Contrôle approfondi requis",refus:"Procédure de refus contractuelle"},
   responsableDecision:"Responsable exploitation — validation manuelle obligatoire",
   ao:"Consultation fermée le 24 août 2026 à 11 h — 405 t/an lot 1",statut:"actif"},
];

export const SectionFicheCombustible = () => {
  const [fiches, _setFiches] = useState(()=>{ const d=ficheCombGet(); return d.length?d:[...DEMO_FICHES_COMB]; });
  const [sel, setSel] = useState(fiches[0]?.id||null);
  const [tabF, setTabF] = useState("fiche");
  const fiche = fiches.find(f=>f.id===sel);

  // Livraisons liées à cette chaufferie (démo + localStorage)
  const livraisonsLiees = useMemo(()=>{
    if (!fiche) return [];
    const all = [...DEMO_LIVRAISONS];
    const nomChauff = fiche.chaufferie.toLowerCase();
    return all.filter(l=>{
      const dest = (l.nomDestination||"").toLowerCase();
      return dest.includes(nomChauff.split("—")[0].trim().toLowerCase()) ||
             nomChauff.includes(dest.split(" ")[0].toLowerCase());
    }).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  }, [fiche]);

  // Contrôle conformité livraison vs fiche
  const conformiteLiv = (l) => {
    if (!fiche) return null;
    const hum = parseFloat(l.humiditeReception);
    if (isNaN(hum)) return {statut:"nd", label:"Non mesuré", col:"#475569", bg:"#F1F5F9"};
    if (fiche.humiditeMax && hum > fiche.humiditeMax + 5)
      return {statut:"refus",  label:"⛔ Refus — hors seuil", col:"#991B1B", bg:"#FEE2E2"};
    if (fiche.humiditeMax && hum > fiche.humiditeMax)
      return {statut:"reserve",label:"⚠️ Réserve", col:"#92400E", bg:"#FEF3C7"};
    return {statut:"accept",label:"✅ Accepté", col:"#065F46", bg:"#D1FAE5"};
  };

  const Row=({label,val,source})=>val!=null?(
    <div style={{display:"grid",gridTemplateColumns:"180px 1fr",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.bd}`,alignItems:"center"}}>
      <span style={{fontSize:12,color:C.tx3}}>{label}</span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,fontWeight:600,color:C.tx}}>{val}</span>
        {source&&<DATA_SOURCE_TAG type={source}/>}
      </div>
    </div>
  ):null;

  return (
    <div style={{padding:PADDING,maxWidth:680,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#1E3A5F 0%,#065F46 100%)",borderRadius:14,
        padding:"20px 20px 16px",marginBottom:16,color:"#fff"}}>
        <div style={{fontSize:28,marginBottom:6}}>📋</div>
        <div style={{fontFamily:FONT_TITLE,fontWeight:800,fontSize:18,marginBottom:2}}>Fiche combustible contractuelle</div>
        <div style={{fontSize:13,opacity:.85}}>Spécifications versionnées par chaufferie — seuils, contrôles, décisions</div>
      </div>

      <div style={{background:"#EDE9FE",border:"1px solid #C4B5FD",borderRadius:10,
        padding:"12px 14px",marginBottom:16,fontSize:13,color:"#5B21B6",lineHeight:1.5}}>
        <AI_BADGE label="Règle importante"/> APPLITAG compare les données collectées aux clauses du contrat, mais <strong>la décision finale (accepté / réserve / refusé) est validée par un humain habilité</strong>. APPLITAG ne certifie pas automatiquement le combustible.
      </div>

      {/* Sélecteur chaufferie */}
      <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {fiches.map(f=>(
          <button key={f.id} onClick={()=>setSel(f.id)} style={{
            padding:"8px 14px",borderRadius:10,whiteSpace:"nowrap",flexShrink:0,
            border:`1.5px solid ${sel===f.id?"#1E3A5F":C.bd}`,
            background:sel===f.id?"#1E3A5F":"#fff",
            color:sel===f.id?"#fff":C.tx2,fontWeight:sel===f.id?700:400,
            fontSize:12,cursor:"pointer"
          }}>🔥 {f.chaufferie.split("—")[0].trim()}</button>
        ))}
      </div>

      {fiche&&(
        <div>
          {/* Onglets Fiche / Livraisons */}
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {[["fiche","📋","Fiche contractuelle"],["livraisons","📦","Livraisons liées"]].map(([id,ico,lbl])=>(
              <button key={id} onClick={()=>setTabF(id)} style={{
                padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
                fontFamily:"inherit",border:`2px solid ${tabF===id?"#1E3A5F":C.bd}`,
                background:tabF===id?"#1E3A5F":"transparent",
                color:tabF===id?"#fff":C.tx2}}>
                {ico} {lbl}{id==="livraisons"&&livraisonsLiees.length>0?` (${livraisonsLiees.length})`:""}
              </button>
            ))}
          </div>

          {/* ── Onglet Livraisons liées ── */}
          {tabF==="livraisons"&&(
            <div>
              {livraisonsLiees.length===0&&(
                <div style={{background:C.bg2,borderRadius:12,padding:28,textAlign:"center",color:C.tx3,fontSize:13}}>
                  Aucune livraison enregistrée vers cette chaufferie.<br/>
                  <span style={{fontSize:12}}>Les livraisons apparaîtront ici avec leur statut de conformité.</span>
                </div>
              )}
              {livraisonsLiees.map(l=>{
                const conf = conformiteLiv(l);
                const dateStr = l.date?.slice(0,10)||"";
                return (
                  <div key={l.id} style={{background:"#fff",border:`1.5px solid ${conf?.col||C.bd}33`,
                    borderRadius:12,padding:"12px 16px",marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:3}}>
                          📦 {l.numeroCMR||l.numeroBL||"BL"} · {l.lotNumero||""}
                        </div>
                        <div style={{fontSize:12,color:C.tx3}}>
                          {dateStr} · {l.nomReceptionnaire||""}
                        </div>
                        <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,fontWeight:600,color:C.tx}}>
                            💧 Humidité : {l.humiditeReception!=null?`${l.humiditeReception}%`:"—"}
                          </span>
                          {fiche.humiditeMax&&(
                            <span style={{fontSize:11,color:C.tx3}}>
                              (seuil ≤ {fiche.humiditeMax}%)
                            </span>
                          )}
                          <span style={{fontSize:12,fontWeight:600,color:C.tx}}>
                            ⚖️ {(l.poidsNet||l.poidsBrut||"—")} t
                          </span>
                        </div>
                      </div>
                      <div style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,
                        background:conf?.bg,color:conf?.col}}>
                        {conf?.label}
                      </div>
                    </div>
                    {conf?.statut==="reserve"&&(
                      <div style={{marginTop:8,background:"#FEF3C7",borderRadius:8,padding:"8px 12px",
                        fontSize:12,color:"#92400E"}}>
                        {fiche.seuils_decision.reserve} — {fiche.responsableDecision}
                      </div>
                    )}
                    {conf?.statut==="refus"&&(
                      <div style={{marginTop:8,background:"#FEE2E2",borderRadius:8,padding:"8px 12px",
                        fontSize:12,color:"#991B1B"}}>
                        {fiche.seuils_decision.refus} — {fiche.responsableDecision}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{background:"#EDE9FE",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#5B21B6",marginTop:4}}>
                <AI_BADGE/> Contrôle automatique humidité vs seuil contractuel. <strong>La décision de refus reste une prérogative humaine.</strong>
              </div>
            </div>
          )}

          {/* ── Onglet Fiche contractuelle ── */}
          {tabF==="fiche"&&(
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:C.tx}}>{fiche.chaufferie}</div>
                <div style={{fontSize:12,color:C.tx3,marginTop:2}}>{fiche.produit} · {fiche.norme} · {fiche.version}</div>
              </div>
              <span style={{padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700,background:C.greenL,color:C.greenD}}>
                {fiche.statut==="actif"?"✅ Actif":"⬜ Inactif"}
              </span>
            </div>
            {fiche.ao&&<div style={{background:"#FEF3C7",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#92400E",fontWeight:600,marginBottom:10}}>⏰ {fiche.ao}</div>}

            <div style={{fontWeight:700,fontSize:13,color:C.tx,margin:"10px 0 4px"}}>📏 Seuils contractuels</div>
            <Row label="Humidité maximale" val={fiche.humiditeMax!=null?`≤ ${fiche.humiditeMax} %`:null} source="declaree"/>
            <Row label="Taux de cendres max" val={fiche.cendresMax!=null?`≤ ${fiche.cendresMax} %`:null} source="declaree"/>
            <Row label="Taux de poussières max" val={fiche.poussiereMax!=null?`≤ ${fiche.poussiereMax} %`:null} source="declaree"/>
            <Row label="PCI de référence" val={fiche.pcRef!=null?`${fiche.pcRef} MWh/t`:null} source="declaree"/>
            <Row label="Rayon d'approvisionnement" val={fiche.rayonMax!=null?`≤ ${fiche.rayonMax} km`:null} source="declaree"/>

            <div style={{fontWeight:700,fontSize:13,color:C.tx,margin:"12px 0 4px"}}>🔬 Contrôle qualité</div>
            <Row label="Fréquence contrôle" val={fiche.controleFreq}/>
            <Row label="Échantillonnage" val={fiche.echantillonnage}/>
            <Row label="Conservation échantillon" val={fiche.conservationEchantillon}/>
            <Row label="Stock minimal" val={fiche.stockMinimal}/>
            <Row label="Délai exceptionnel" val={fiche.delaiExceptionnel}/>

            <div style={{fontWeight:700,fontSize:13,color:C.tx,margin:"12px 0 6px"}}>📂 Documents obligatoires par livraison</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
              {fiche.docsObligatoires.map(d=><span key={d} style={{padding:"3px 10px",borderRadius:7,fontSize:12,background:C.blueL,color:C.blue,fontWeight:500}}>📄 {d}</span>)}
            </div>

            <div style={{fontWeight:700,fontSize:13,color:C.tx,margin:"12px 0 6px"}}>⚖️ Grille de décision</div>
            {[["✅ Accepté",fiche.seuils_decision.accept,C.greenL,C.greenD],
              ["⚠️ Accepté avec réserve",fiche.seuils_decision.reserve,C.amberL,C.amber],
              ["❌ Refusé",fiche.seuils_decision.refus,C.redL,C.red],
            ].map(([label,val,bg,col])=>(
              <div key={label} style={{background:bg,borderRadius:8,padding:"8px 12px",marginBottom:6,fontSize:13}}>
                <span style={{fontWeight:700,color:col}}>{label}</span>
                <span style={{color:col,marginLeft:8}}>{val}</span>
              </div>
            ))}

            <div style={{marginTop:10,background:"#EDE9FE",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#5B21B6"}}>
              <AI_BADGE/> <strong style={{marginLeft:6}}>{fiche.responsableDecision}</strong>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SectionVeilleReglementaire = () => {
  const [vue, setVue] = useState("registre");
  const [selectedTexte, setSelectedTexte] = useState(null);
  const [selFonction, setSelFonction] = useState(null);
  const [selectedSnap, setSelectedSnap] = useState(null);

  const nbAlertes = TEXTES_REGL.filter(t=>t.alerteActive).length;
  const nbDossiersAlerte = SNAPSHOTS_DOSSIER.filter(s=>s.alerteReglPostDepot).length;

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>⚖️ Veille réglementaire</div>
          <div style={{fontSize:13,color:C.tx2}}>Versionnement des textes · Snapshots par dossier · Alertes de conformité</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            ["registre",       "#7C3AED","📋 Registre textes"],
            ["snapshots",      "#7C3AED","🗃️ Snapshots dossiers"],
            ["ia_transparence","#1E40AF","🤖 IA Transparence"],
          ].map(([v,col,lbl])=>(
            <button key={v} onClick={()=>setVue(v)}
              style={{padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",border:`1.5px solid ${vue===v?col:C.bd}`,
                background:vue===v?col:"transparent",color:vue===v?"#fff":C.tx2,
                WebkitTapHighlightColor:"transparent"}}>
              {lbl}{v==="ia_transparence"&&<span style={{
                fontSize:9,background:"#EF4444",color:"#fff",borderRadius:20,
                padding:"1px 5px",marginLeft:5,fontWeight:800}}>2 août</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Alerte générale */}
      {nbAlertes>0&&(
        <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,
          padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>🚨</span>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#991B1B",marginBottom:4}}>
              {nbAlertes} texte{nbAlertes>1?"s":""} avec alerte active — {nbDossiersAlerte} dossier{nbDossiersAlerte>1?"s":""} concerné{nbDossiersAlerte>1?"s":""}
            </div>
            <div style={{fontSize:12,color:"#7F1D1D",lineHeight:1.6,marginBottom:6}}>
              <strong>Décret n° 2025-401 annulé</strong> par le Conseil d'État le 15 juillet 2026 (procédure irrégulière — défaut de consultation du public). L'arrêté du 2 mai 2025 reste en vigueur mais sa base légale est fragilisée.
            </div>
            <div style={{background:"#FFF1F2",border:"1px solid #FDA4AF",borderRadius:8,
              padding:"8px 12px",fontSize:11,color:"#881337",fontStyle:"italic",fontWeight:600}}>
              ⚠️ Ne pas garantir l'éligibilité ni le maintien d'une aide individuelle sans analyse juridique au cas par cas.
            </div>
          </div>
        </div>
      )}

      {/* Clause de réserve */}
      <div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:10,
        padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:16,flexShrink:0}}>📌</span>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#6D28D9",marginBottom:3,textTransform:"uppercase",letterSpacing:".5px"}}>
            Clause de réserve standard — à apposer sur tout document préparatoire
          </div>
          <div style={{fontSize:12,color:"#4C1D95",fontStyle:"italic",fontWeight:600}}>
            « {CLAUSE_RESERVE} »
          </div>
        </div>
      </div>

      {vue==="registre" && (
        <div>
          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {Object.entries(STATUT_REGL).map(([k,s])=>{
              const n = TEXTES_REGL.filter(t=>t.statut===k).length;
              return (
                <div key={k} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,
                  padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:20}}>{s.icon}</div>
                  <div style={{fontSize:22,fontWeight:800,color:s.color}}>{n}</div>
                  <div style={{fontSize:10,color:C.tx2}}>{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Liste textes */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {TEXTES_REGL.map(t=>{
              const st = STATUT_REGL[t.statut]||STATUT_REGL.applicable;
              const isOpen = selectedTexte===t.id;
              return (
                <div key={t.id} style={{background:"#fff",borderRadius:12,
                  border:`1px solid ${t.alerteActive?"#FECACA":C.bd}`,overflow:"hidden",
                  boxShadow:t.alerteActive?"0 0 0 2px #FEE2E2":undefined}}>
                  {/* Header */}
                  <div onClick={()=>setSelectedTexte(isOpen?null:t.id)}
                    style={{padding:"12px 16px",cursor:"pointer",
                      display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,
                      background:t.alerteActive?"#FFF5F5":"#fff"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:11,padding:"2px 8px",borderRadius:5,fontWeight:700,
                          background:st.bg,color:st.color}}>{st.icon} {st.label}</span>
                        {t.alerteActive&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:5,
                          background:"#FEE2E2",color:"#991B1B",fontWeight:700}}>🚨 Alerte</span>}
                        <span style={{fontSize:10,color:C.tx2}}>Mis à jour {new Date(t.dateStatut).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{t.dispositif}</div>
                      <div style={{fontSize:11,color:C.tx2,marginTop:2}}>{t.texteRef}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <span style={{fontSize:11,color:C.tx2}}>
                        {t.dossiersImpactes.length} dossier{t.dossiersImpactes.length>1?"s":""}
                      </span>
                      <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>

                  {/* Détail */}
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px 16px",background:"#FAFAFA"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Informations</div>
                          {[
                            ["Source décision",t.sourceStatut],
                            ["Motif",t.motifStatut],
                            ["Consultation",new Date(t.dateConsultation).toLocaleDateString("fr-FR")],
                            ["Version critères",t.versionCriteres],
                            t.remplacePar&&["Remplacé par",t.remplacePar],
                          ].filter(Boolean).map(([k,v])=>(
                            <div key={k} style={{display:"flex",gap:8,padding:"5px 8px",
                              borderBottom:`1px solid ${C.bd}`,fontSize:11}}>
                              <span style={{color:C.tx2,minWidth:120,flexShrink:0}}>{k}</span>
                              <span style={{color:C.tx,fontWeight:500}}>{v}</span>
                            </div>
                          ))}
                        </div>

                        <div>
                          {t.reservesJuridiques.length>0&&(
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:"#991B1B",marginBottom:6}}>
                                ⚠️ Réserves juridiques ({t.reservesJuridiques.length})
                              </div>
                              {t.reservesJuridiques.map((r,i)=>(
                                <div key={i} style={{display:"flex",gap:6,marginBottom:6,fontSize:11,
                                  padding:"6px 8px",borderRadius:6,background:"#FEF2F2",
                                  border:"1px solid #FECACA"}}>
                                  <span style={{color:"#991B1B",flexShrink:0}}>•</span>
                                  <span style={{color:"#7F1D1D",lineHeight:1.4}}>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{marginTop:8}}>
                            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:6}}>Dossiers concernés</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {t.dossiersImpactes.map(d=>(
                                <span key={d} style={{fontSize:10,padding:"2px 8px",borderRadius:4,
                                  background:"#EDE9FE",color:"#7C3AED",fontWeight:600}}>{d}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{display:"flex",gap:8,paddingTop:10,borderTop:`1px solid ${C.bd}`}}>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📥 Télécharger snapshot PDF
                        </button>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          🔗 Source officielle (Légifrance)
                        </button>
                        {t.alerteActive&&(
                          <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                            cursor:"pointer",border:"1px solid #DC2626",background:"#FEF2F2",
                            color:"#991B1B",fontFamily:"inherit"}}>
                            📋 Générer note d'impact dossiers
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {vue==="snapshots" && (
        <div>
          <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,
            padding:"10px 14px",marginBottom:14,fontSize:11,color:"#1E40AF",lineHeight:1.6}}>
            💾 <strong>Principe de l'archivage :</strong> APPLITAG conserve une copie datée des règles et documents en vigueur au moment de la préparation de chaque dossier. Cette copie est immuable et sert de preuve en cas de contestation réglementaire ultérieure.
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {SNAPSHOTS_DOSSIER.map(snap=>{
              const isOpen = selectedSnap===snap.id;
              const statutSnap = snap.statut==="alerte"
                ? {color:"#991B1B",bg:"#FEE2E2",icon:"🚨",label:"Alerte post-dépôt"}
                : {color:"#065F46",bg:"#D1FAE5",icon:"✅",label:"Conforme"};
              return (
                <div key={snap.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                  border:`1px solid ${snap.alerteReglPostDepot?"#FECACA":C.bd}`,
                  boxShadow:snap.alerteReglPostDepot?"0 0 0 2px #FEE2E2":undefined}}>
                  <div onClick={()=>setSelectedSnap(isOpen?null:snap.id)}
                    style={{padding:"12px 16px",cursor:"pointer",
                      display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                      background:snap.alerteReglPostDepot?"#FFF5F5":"#fff"}}>
                    <div>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:10,padding:"2px 7px",borderRadius:4,fontWeight:700,
                          background:statutSnap.bg,color:statutSnap.color}}>
                          {statutSnap.icon} {statutSnap.label}
                        </span>
                        <span style={{fontSize:10,color:C.tx2,fontFamily:"monospace"}}>{snap.dossierId}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{snap.dossierNom}</div>
                      <div style={{fontSize:11,color:C.tx2,marginTop:2}}>
                        Préparé le {new Date(snap.datePreparation).toLocaleDateString("fr-FR")} par {snap.auteur}
                        {snap.clauseReserveApposee&&<span style={{marginLeft:8,color:"#7C3AED",fontWeight:600}}>· ✓ Clause réserve apposée</span>}
                      </div>
                    </div>
                    <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                  </div>

                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px 16px",background:"#FAFAFA"}}>
                      {snap.alerteReglPostDepot&&(
                        <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,
                          padding:"10px 12px",marginBottom:12,fontSize:11,color:"#7F1D1D"}}>
                          <div style={{fontWeight:700,marginBottom:4}}>🚨 Alerte réglementaire post-dépôt</div>
                          {snap.alerteDetail}
                          <div style={{marginTop:6,fontWeight:700,color:"#991B1B"}}>
                            Action requise : analyser l'impact sur ce dossier au cas par cas.
                          </div>
                        </div>
                      )}

                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>
                          📸 Snapshot des textes au {new Date(snap.datePreparation).toLocaleDateString("fr-FR")}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {snap.textesSnapshot.map((ts,i)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",
                              alignItems:"center",padding:"7px 10px",borderRadius:7,
                              background:"#fff",border:`1px solid ${C.bd}`,fontSize:11}}>
                              <div>
                                <span style={{fontWeight:600,color:C.tx}}>{ts.ref}</span>
                                <span style={{color:C.tx2,marginLeft:8}}>{ts.version}</span>
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:10,color:C.tx2}}>Statut au dépôt :</span>
                                <span style={{fontSize:10,padding:"1px 6px",borderRadius:4,fontWeight:700,
                                  background:STATUT_REGL[ts.statut_au_depot]?.bg||"#F3F4F6",
                                  color:STATUT_REGL[ts.statut_au_depot]?.color||"#6B7280"}}>
                                  {STATUT_REGL[ts.statut_au_depot]?.label||ts.statut_au_depot}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Clause réserve */}
                      <div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:8,
                        padding:"8px 12px",fontSize:11,color:"#4C1D95",fontStyle:"italic",marginBottom:10}}>
                        « {CLAUSE_RESERVE} »
                      </div>

                      <div style={{display:"flex",gap:8}}>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📥 Exporter snapshot certifié
                        </button>
                        <button style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:600,
                          cursor:"pointer",border:`1px solid ${C.bd}`,background:"transparent",
                          color:C.tx2,fontFamily:"inherit"}}>
                          📄 Ouvrir dossier parcelle
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── IA TRANSPARENCE — Art. 50 Règlement IA ── */}
      {vue==="ia_transparence"&&(()=>{
        const nbAdapt = INVENTAIRE_IA.filter(f=>f.statut==="a_adapter").length;
        const _sel = selFonction ? INVENTAIRE_IA.find(f=>f.id===selFonction) : null;
        return (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Bannière deadline */}
            <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
              border:"2px solid #3B82F6",borderRadius:12,padding:"14px 16px",
              display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:24,flexShrink:0}}>🤖</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:900,color:"#1E40AF"}}>
                    Règlement IA — Article 50 : obligations de transparence
                  </div>
                  <span style={{fontSize:10,background:"#EF4444",color:"#fff",
                    borderRadius:20,padding:"2px 8px",fontWeight:800}}>
                    Applicable le 2 août 2026
                  </span>
                </div>
                <div style={{fontSize:12,color:"#1E3A8A",lineHeight:1.7}}>
                  Lignes directrices définitives publiées le 20 juillet 2026 par la Commission européenne.
                  Concernent les systèmes interactifs, les contenus générés ou modifiés par IA et les deepfakes.
                  <strong> {nbAdapt} fonction{nbAdapt>1?"s":""} APPLITAG à adapter avant la date limite.</strong>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {Object.entries(IA_STATUT).map(([k,s])=>{
                const n = INVENTAIRE_IA.filter(f=>f.statut===k).length;
                return (
                  <div key={k} style={{background:s.bg,borderRadius:10,
                    border:`1.5px solid ${s.color}44`,padding:"10px 12px",textAlign:"center"}}>
                    <div style={{fontSize:18}}>{s.icon}</div>
                    <div style={{fontSize:20,fontWeight:900,color:s.color}}>{n}</div>
                    <div style={{fontSize:9,color:s.color,fontWeight:700,marginTop:2}}>{s.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Inventaire fonctions IA */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:2}}>
                Inventaire des fonctions IA — 6 périmètres identifiés
              </div>
              {INVENTAIRE_IA.map(f=>{
                const st = IA_STATUT[f.statut]||IA_STATUT.a_adapter;
                const isOpen = selFonction===f.id;
                const nbFait = f.mentions.filter(m=>m.fait).length;
                const pct    = Math.round(nbFait/f.mentions.length*100);
                return (
                  <div key={f.id} style={{background:"#fff",borderRadius:12,
                    border:`1.5px solid ${st.color}44`,overflow:"hidden"}}>
                    {/* Header */}
                    <div onClick={()=>setSelFonction(isOpen?null:f.id)}
                      style={{padding:"12px 14px",cursor:"pointer",
                        display:"flex",alignItems:"center",gap:12,
                        background:isOpen?st.bg+"80":"#fff",
                        WebkitTapHighlightColor:"transparent"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                          <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",
                            borderRadius:10,background:st.bg,color:st.color}}>
                            {st.icon} {st.label}
                          </span>
                          <span style={{fontSize:10,color:C.tx3}}>{f.type}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{f.nom}</div>
                        <div style={{fontSize:11,color:C.tx3,marginTop:2}}>{f.scope50}</div>
                      </div>
                      {/* Progress mentions */}
                      <div style={{textAlign:"center",flexShrink:0,minWidth:52}}>
                        <div style={{fontSize:16,fontWeight:900,
                          color:pct===100?"#065F46":pct>0?"#B45309":"#991B1B"}}>{pct}%</div>
                        <div style={{fontSize:9,color:C.tx3}}>mentions</div>
                      </div>
                      <span style={{color:C.tx2,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                    </div>

                    {/* Détail */}
                    {isOpen&&(
                      <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",
                        background:"#FAFAFA",display:"flex",flexDirection:"column",gap:12}}>

                        {/* Checklist mentions */}
                        <div>
                          <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:8}}>
                            Mentions de transparence obligatoires
                          </div>
                          {f.mentions.map((m,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                              padding:"8px 10px",borderRadius:8,marginBottom:4,
                              background:m.fait?"#F0FDF4":"#FFF7ED",
                              border:`1px solid ${m.fait?"#86EFAC":"#FED7AA"}`}}>
                              <span style={{fontSize:16,flexShrink:0}}>{m.fait?"✅":"⏳"}</span>
                              <span style={{fontSize:12,color:m.fait?"#065F46":"#92400E"}}>{m.texte}</span>
                              <span style={{marginLeft:"auto",fontSize:9,flexShrink:0,
                                fontWeight:700,color:m.fait?"#065F46":"#92400E"}}>
                                {m.fait?"FAIT":"À FAIRE"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Contrôle humain */}
                        <div style={{background:"#EFF6FF",borderRadius:8,padding:"10px 12px",
                          border:"1px solid #BFDBFE"}}>
                          <div style={{fontSize:11,fontWeight:800,color:"#1E40AF",marginBottom:4}}>
                            👤 Contrôle humain défini
                          </div>
                          <div style={{fontSize:12,color:"#1E3A8A"}}>{f.controlHumain}</div>
                        </div>

                        {/* Données & prestataire */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div style={{background:C.bg2,borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:3}}>📤 Données transmises</div>
                            <div style={{fontSize:11,color:C.tx}}>{f.donneesTransmises}</div>
                          </div>
                          <div style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                            border:f.prestataire.includes("À")?"1px solid #FED7AA":undefined}}>
                            <div style={{fontSize:10,color:C.tx3,marginBottom:3}}>🏢 Prestataire IA</div>
                            <div style={{fontSize:11,fontWeight:f.prestataire.includes("À")?700:400,
                              color:f.prestataire.includes("À")?"#92400E":C.tx}}>{f.prestataire}</div>
                          </div>
                        </div>

                        {/* Risques */}
                        {f.risques.length>0&&(
                          <div style={{background:"#FEF2F2",borderRadius:8,padding:"8px 12px",
                            border:"1px solid #FECACA"}}>
                            <div style={{fontSize:11,fontWeight:800,color:"#991B1B",marginBottom:6}}>
                              🚫 Risques à éviter
                            </div>
                            {f.risques.map((r,i)=>(
                              <div key={i} style={{fontSize:11,color:"#7F1D1D",padding:"2px 0",lineHeight:1.5}}>
                                • {r}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Journal */}
                        <div style={{display:"flex",alignItems:"center",gap:8,
                          padding:"8px 10px",borderRadius:8,
                          background:f.journalDecisions?"#F0FDF4":"#FFF7ED",
                          border:`1px solid ${f.journalDecisions?"#86EFAC":"#FED7AA"}`}}>
                          <span>{f.journalDecisions?"✅":"⏳"}</span>
                          <span style={{fontSize:11,
                            color:f.journalDecisions?"#065F46":"#92400E"}}>
                            Journal des suggestions ayant influencé une décision
                            {f.journalDecisions?" — activé":" — à mettre en place"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Journal des décisions IA */}
            <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
                📔 Journal des suggestions IA ayant influencé une décision
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr>
                      {["Date","Fonction","Action","Suggestion IA","Validation humaine","Décision finale","Corrigé"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",
                          background:"#EFF6FF",color:"#1E40AF",fontWeight:800,
                          borderBottom:"2px solid #BFDBFE",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {JOURNAL_IA_DEMO.map((j,i)=>(
                      <tr key={i} style={{borderBottom:`1px solid ${C.bd}`,
                        background:i%2===0?C.bg:C.bg2}}>
                        <td style={{padding:"8px 10px",whiteSpace:"nowrap",color:C.tx3}}>
                          {new Date(j.date).toLocaleDateString("fr-FR")}
                        </td>
                        <td style={{padding:"8px 10px",fontWeight:700,color:"#1E40AF"}}>{j.fonction}</td>
                        <td style={{padding:"8px 10px",color:C.tx}}>{j.action}</td>
                        <td style={{padding:"8px 10px",color:C.tx2,fontStyle:"italic"}}>{j.suggestion}</td>
                        <td style={{padding:"8px 10px",color:"#065F46",fontWeight:600}}>{j.validation}</td>
                        <td style={{padding:"8px 10px",color:C.tx}}>{j.decisionFinale}</td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>
                          {j.corrigé
                            ? <span style={{fontSize:10,background:"#FEF3C7",color:"#92400E",
                                padding:"2px 7px",borderRadius:10,fontWeight:700}}>Corrigé</span>
                            : <span style={{fontSize:10,background:"#D1FAE5",color:"#065F46",
                                padding:"2px 7px",borderRadius:10,fontWeight:700}}>OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6 actions avant le 2 août */}
            <div style={{background:"linear-gradient(135deg,#FFF7ED,#FEF3C7)",
              borderRadius:12,padding:"14px",border:"1.5px solid #FCD34D"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:10}}>
                ✅ Plan d'actions — avant le 2 août 2026
              </div>
              {[
                ["1","Inventorier toutes les fonctions IA",   "Fait — 6 fonctions identifiées ci-dessus","#065F46","#D1FAE5"],
                ["2","Identifier les données transmises à chaque prestataire","À compléter — prestataires LLM à confirmer","#B45309","#FEF3C7"],
                ["3","Définir le contrôle humain pour chaque fonction",        "Partiellement défini — détail par fonction","#B45309","#FEF3C7"],
                ["4","Ajouter les mentions de transparence dans l'interface",  "À implémenter dans les vues concernées","#B45309","#FEF3C7"],
                ["5","Formaliser la règle éditoriale Radio & TV",              "À rédiger avant toute diffusion synthétique","#991B1B","#FEE2E2"],
                ["6","Conserver l'historique des suggestions décisionnelles",  "Journal démo actif — à connecter en production","#B45309","#FEF3C7"],
              ].map(([n,lbl,statut,col,bg])=>(
                <div key={n} style={{display:"flex",gap:12,alignItems:"flex-start",
                  padding:"9px 10px",borderRadius:8,marginBottom:6,
                  background:bg,border:`1px solid ${col}33`}}>
                  <span style={{fontSize:14,fontWeight:900,color:col,
                    width:22,textAlign:"center",flexShrink:0}}>{n}.</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{lbl}</div>
                    <div style={{fontSize:10,color:col,marginTop:2,fontWeight:600}}>{statut}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        );
      })()}
    </div>
  );
};

// ── LIVRAISONS ──────────────────────────────────────────────────

const LIVRAISONS_DATA = [
  {id:"LIV-2026-0234",transport:"TRP-2026-0898",lot:"LOT-2026-041",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-18",heure:"15:42",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:27100,humidite:29,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0234",signature:true,
   observations:"RAS — réception conforme",statut:"validé"},
  {id:"LIV-2026-0228",transport:"TRP-2026-0891",lot:"LOT-2026-038",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-16",heure:"09:35",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   poidsNet:24650,humidite:25,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0228",signature:true,
   observations:"Bonne qualité — taux humidité excellent",statut:"validé"},
  {id:"LIV-2026-0219",transport:"TRP-2026-0876",lot:"LOT-2026-031",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-15",heure:"08:58",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:25200,humidite:29,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0219",signature:true,
   observations:"",statut:"validé"},
  {id:"LIV-2026-0198",transport:"TRP-2026-0856",lot:"LOT-2026-024",
   chaufferie:"Chaufferie Moulins",date:"2026-07-08",heure:"11:12",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   poidsNet:23800,humidite:27,granulometrie:"G30-G50",conformite:true,
   refus:false,motifRefus:"",bdl:"BL-2026-0198",signature:true,
   observations:"",statut:"validé"},
  {id:"LIV-2026-0187",transport:"TRP-2026-0841",lot:"LOT-2026-019",
   chaufferie:"Réseau chaleur Vichy Agglo",date:"2026-07-02",heure:"14:20",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   poidsNet:null,humidite:36,granulometrie:"G30-G50",conformite:false,
   refus:true,motifRefus:"Humidité excessive (36%) — lot refusé, retour plateforme",
   bdl:"BL-2026-0187",signature:true,
   observations:"Litige en cours — lot retourné au stockage",statut:"refusé"},
];

const STATUT_LIV = {
  validé:  {label:"Validé",   icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  refusé:  {label:"Refusé",   icon:"❌",col:"#991B1B",bg:"#FEE2E2"},
  partiel: {label:"Partiel",  icon:"⚠️",col:"#92400E",bg:"#FEF3C7"},
  en_attente:{label:"En attente",icon:"⏳",col:"#6B7280",bg:"#F3F4F6"},
};

// PCI — ITEBE 2004 — plaquettes bois feuillus
// PCI(H%) = PCS_sec × (1 − H/100) − L_vap × H/100  avec PCS=5200 kWh/t, L_vap=678.6 kWh/t
const pciKWhT = (h) => Math.round(5200 - 58.8 * h);
const livMWh  = (kg, h) => Math.round(kg / 1000 * pciKWhT(h) / 100) / 10;

export const SectionLivraisons = () => {
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [selected, setSelected] = useState(null);

  const livraisons = filtreStatut==="tous" ? LIVRAISONS_DATA
    : LIVRAISONS_DATA.filter(l=>l.statut===filtreStatut);
  const lv = selected ? LIVRAISONS_DATA.find(l=>l.id===selected) : null;

  const totalTonnes = LIVRAISONS_DATA.filter(l=>l.poidsNet).reduce((s,l)=>s+l.poidsNet,0);
  const nbRefus     = LIVRAISONS_DATA.filter(l=>l.refus).length;
  const txConformite= Math.round(LIVRAISONS_DATA.filter(l=>l.conformite).length/LIVRAISONS_DATA.length*100);
  const humMoy      = Math.round(LIVRAISONS_DATA.filter(l=>l.humidite).reduce((s,l)=>s+l.humidite,0)/LIVRAISONS_DATA.filter(l=>l.humidite).length);
  const totalMWh    = Math.round(LIVRAISONS_DATA.filter(l=>l.poidsNet&&l.humidite).reduce((s,l)=>s+livMWh(l.poidsNet,l.humidite),0));

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>📦 Livraisons & réceptions</div>
        <div style={{fontSize:13,color:C.tx2}}>Réception chaufferie, pesée, qualité, conformité</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"⚖️",label:"Tonnes reçues",val:(totalTonnes/1000).toFixed(1)+" t",col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"⚡",label:"Énergie livrée",val:totalMWh+" MWh",col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"✅",label:"Taux conformité",val:txConformite+"%",col:txConformite>=90?"#059669":"#D97706",bg:txConformite>=90?"#D1FAE5":"#FEF3C7"},
          {ico:"💧",label:"Humidité moy.",val:humMoy+"%",col:humMoy<=30?"#0369A1":"#D97706",bg:humMoy<=30?"#DBEAFE":"#FEF3C7"},
          {ico:"❌",label:"Refus",val:nbRefus+" lot"+(nbRefus>1?"s":""),col:nbRefus>0?"#991B1B":"#059669",bg:nbRefus>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Toutes"],["validé","Validées"],["refusé","Refusées"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setFiltreStatut(v);setSelected(null);}}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",border:`1px solid ${filtreStatut===v?"#1E5B3A":C.bd}`,
              background:filtreStatut===v?"#1E5B3A":"transparent",
              color:filtreStatut===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
        <button style={{marginLeft:"auto",padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
          + Saisir une réception
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:lv?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {livraisons.map(l=>{
            const st = STATUT_LIV[l.statut]||STATUT_LIV.en_attente;
            const isSelected = selected===l.id;
            return (
              <div key={l.id} onClick={()=>setSelected(isSelected?null:l.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?"#1E5B3A":l.refus?"#FCA5A5":C.bd}`}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{l.id}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                    </div>
                    <div style={{fontSize:11,color:C.tx2}}>{l.lot} → {l.chaufferie}</div>
                    <div style={{display:"flex",gap:10,marginTop:4,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>📅 {l.date} à {l.heure}</span>
                      <span>👤 {l.chauffeur}</span>
                      <span>💧 Humidité : {l.humidite??"-"}%</span>
                      <span>📐 {l.granulometrie}</span>
                      {l.humidite&&l.poidsNet&&<span style={{color:"#7C3AED",fontWeight:700}}>⚡ {pciKWhT(l.humidite)} kWh/t · {livMWh(l.poidsNet,l.humidite)} MWh</span>}
                      {l.signature&&<span>✍️ Signé</span>}
                    </div>
                    {l.refus&&<div style={{marginTop:4,fontSize:10,color:"#991B1B",fontWeight:600}}>
                      ❌ {l.motifRefus}
                    </div>}
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:l.poidsNet?"#1E5B3A":"#9CA3AF"}}>
                      {l.poidsNet?(l.poidsNet/1000).toFixed(2)+" t":"—"}
                    </div>
                    <div style={{fontSize:10,color:C.tx3}}>poids net</div>
                    <div style={{fontSize:10,color:"#0369A1",marginTop:4}}>{l.bdl}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {lv&&(
          <div style={{background:"#fff",borderRadius:14,
            border:`2px solid ${lv.refus?"#DC2626":"#1E5B3A"}`,padding:16,position:"sticky",top:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{lv.id}</div>
              <button onClick={()=>setSelected(null)}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
            </div>
            {lv.refus&&(
              <div style={{background:"#FEE2E2",borderRadius:8,padding:"8px 12px",
                marginBottom:12,fontSize:11,color:"#991B1B",border:"1px solid #FECACA",fontWeight:600}}>
                ❌ {lv.motifRefus}
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11}}>
              {[
                ["Lot",lv.lot],["Chaufferie",lv.chaufferie],
                ["Date / Heure",lv.date+" à "+lv.heure],
                ["Chauffeur",lv.chauffeur],["Véhicule",lv.vehicule],
                ["Poids net",lv.poidsNet?(lv.poidsNet/1000).toFixed(2)+" t":"Non saisi"],
                ["Humidité",lv.humidite?lv.humidite+"%":"—"],
                ["PCI (ITEBE 2004)",lv.humidite?pciKWhT(lv.humidite)+" kWh/t":"—"],
                ["Énergie livrée",(lv.poidsNet&&lv.humidite)?livMWh(lv.poidsNet,lv.humidite)+" MWh":"—"],
                ["Granulométrie",lv.granulometrie],
                ["Conformité",lv.conformite?"✅ Conforme":"❌ Non conforme"],
                ["Bon de livraison",lv.bdl],
                ["Signature",lv.signature?"✍️ Apposée":"En attente"],
                ["Observations",lv.observations||"—"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                  <span style={{color:C.tx3,minWidth:120,flexShrink:0}}>{k}</span>
                  <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginTop:14}}>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
                ⬇️ Bon de livraison PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── CHAUFFERIES ──────────────────────────────────────────────────

const CHAUFFERIES_DATA = [
  // ── Auvergne-Rhône-Alpes ──────────────────────────────────────
  {id:"ch1",nom:"Réseau chaleur Vichy Agglo",commune:"Vichy (03)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:6.8,consoAnnT:13600,stockCapaT:800,stockActuelT:312,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Perrier — 04 70 32 11 00",
   acces:"ZI de Vichy — accès PL 24h/24 sauf dimanche",
   horairesReception:"Lun–Ven 07h–17h / Sam 07h–12h",
   prochaineLivraison:"2026-07-28",volumePrevu:24,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  {id:"ch2",nom:"Chaufferie Moulins Énergie",commune:"Moulins (03)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:4.2,consoAnnT:8400,stockCapaT:500,stockActuelT:89,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Girard — 04 70 46 22 00",
   acces:"Rue des Châtaigniers — réservation obligatoire",
   horairesReception:"Lun–Ven 08h–16h",
   prochaineLivraison:"2026-07-24",volumePrevu:18,
   livraisons:4,livraisonsConformes:4,alertes:1,statut:"alerte"},
  {id:"ch3",nom:"Chaufferie Saint-Étienne Métropole",commune:"Saint-Étienne (42)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:12.5,consoAnnT:25000,stockCapaT:1500,stockActuelT:820,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Deschamps — 04 77 43 00 11",
   acces:"ZI Molina-la-Chazotte — accès PL dédié",
   horairesReception:"Lun–Sam 06h–18h",
   prochaineLivraison:"2026-07-30",volumePrevu:45,
   livraisons:14,livraisonsConformes:13,alertes:0,statut:"ok"},
  {id:"ch4",nom:"Réseau bois Annecy Montagne",commune:"Annecy (74)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:8.0,consoAnnT:16000,stockCapaT:900,stockActuelT:430,
   humiMax:30,granuAccepte:"G30-G50 / P45",
   contact:"Mme Favre — 04 50 51 20 00",
   acces:"ZA des Glaisins — quai de réception couvert",
   horairesReception:"Lun–Ven 07h–17h30",
   prochaineLivraison:"2026-08-04",volumePrevu:32,
   livraisons:10,livraisonsConformes:10,alertes:0,statut:"ok"},
  // ── Bourgogne-Franche-Comté ───────────────────────────────────
  {id:"ch5",nom:"Chaufferie bois Dijon Métropole",commune:"Dijon (21)",region:"Bourgogne-Franche-Comté",
   puissanceMW:10.2,consoAnnT:20400,stockCapaT:1200,stockActuelT:156,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Renard — 03 80 74 52 00",
   acces:"ZI Cap Nord — portail automatique camion",
   horairesReception:"Lun–Ven 07h–19h / Sam 07h–12h",
   prochaineLivraison:"2026-07-25",volumePrevu:55,
   livraisons:12,livraisonsConformes:11,alertes:1,statut:"alerte"},
  {id:"ch6",nom:"Réseau chaleur Besançon Est",commune:"Besançon (25)",region:"Bourgogne-Franche-Comté",
   puissanceMW:5.6,consoAnnT:11200,stockCapaT:700,stockActuelT:390,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Pernet — 03 81 87 40 00",
   acces:"Rue de la Malcombe — pont-bascule sur site",
   horairesReception:"Lun–Ven 08h–17h",
   prochaineLivraison:"2026-08-10",volumePrevu:28,
   livraisons:7,livraisonsConformes:7,alertes:0,statut:"ok"},
  // ── Grand Est ────────────────────────────────────────────────
  {id:"ch7",nom:"Chaufferie bois Strasbourg Nord",commune:"Strasbourg (67)",region:"Grand Est",
   puissanceMW:22.0,consoAnnT:44000,stockCapaT:2500,stockActuelT:1100,
   humiMax:28,granuAccepte:"G30-G50 / G50",
   contact:"M. Schneider — 03 88 60 90 90",
   acces:"Port du Rhin — accès fluvial + PL",
   horairesReception:"Lun–Ven 06h–20h / Sam 06h–14h",
   prochaineLivraison:"2026-07-26",volumePrevu:80,
   livraisons:22,livraisonsConformes:21,alertes:0,statut:"ok"},
  {id:"ch8",nom:"Réseau de chaleur Nancy Plateau de Haye",commune:"Nancy (54)",region:"Grand Est",
   puissanceMW:7.5,consoAnnT:15000,stockCapaT:850,stockActuelT:62,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Mathieu — 03 83 32 00 00",
   acces:"Plateau de Haye — voie réservée bois-énergie",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-07-23",volumePrevu:35,
   livraisons:9,livraisonsConformes:9,alertes:1,statut:"alerte"},
  // ── Occitanie ────────────────────────────────────────────────
  {id:"ch9",nom:"Chaufferie bois Toulouse Lardenne",commune:"Toulouse (31)",region:"Occitanie",
   puissanceMW:9.0,consoAnnT:18000,stockCapaT:1000,stockActuelT:520,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Lacombe — 05 61 22 29 22",
   acces:"Route de Bayonne — déchargement automatisé",
   horairesReception:"Lun–Ven 07h–18h / Sam 07h–12h",
   prochaineLivraison:"2026-08-01",volumePrevu:40,
   livraisons:11,livraisonsConformes:10,alertes:0,statut:"ok"},
  {id:"ch10",nom:"Réseau chaleur Montpellier Ovalie",commune:"Montpellier (34)",region:"Occitanie",
   puissanceMW:6.0,consoAnnT:12000,stockCapaT:720,stockActuelT:280,
   humiMax:32,granuAccepte:"G30-G50 / P31",
   contact:"Mme Vidal — 04 67 34 70 00",
   acces:"ZA Ovalie — accès par chemin rural (18t maxi)",
   horairesReception:"Lun–Ven 08h–16h30",
   prochaineLivraison:"2026-08-06",volumePrevu:30,
   livraisons:6,livraisonsConformes:6,alertes:0,statut:"ok"},
  // ── Bretagne ─────────────────────────────────────────────────
  {id:"ch11",nom:"Chaufferie bois Rennes Beaulieu",commune:"Rennes (35)",region:"Bretagne",
   puissanceMW:5.5,consoAnnT:11000,stockCapaT:650,stockActuelT:195,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Le Goff — 02 99 87 41 00",
   acces:"Campus de Beaulieu — livraisons hors cours",
   horairesReception:"Lun–Ven 08h–17h (hors vacances scolaires)",
   prochaineLivraison:"2026-07-29",volumePrevu:25,
   livraisons:5,livraisonsConformes:5,alertes:0,statut:"ok"},
  {id:"ch12",nom:"Réseau chaleur Brest Kergaradec",commune:"Brest (29)",region:"Bretagne",
   puissanceMW:3.8,consoAnnT:7600,stockCapaT:450,stockActuelT:180,
   humiMax:32,granuAccepte:"G30-G50 / G50",
   contact:"Mme Riou — 02 98 00 80 80",
   acces:"ZI Kergaradec — portail téléguidé",
   horairesReception:"Lun–Ven 07h30–17h30",
   prochaineLivraison:"2026-08-12",volumePrevu:20,
   livraisons:4,livraisonsConformes:4,alertes:0,statut:"ok"},
  // ── Normandie ────────────────────────────────────────────────
  {id:"ch13",nom:"Chaufferie bois Rouen Rive Gauche",commune:"Rouen (76)",region:"Normandie",
   puissanceMW:8.4,consoAnnT:16800,stockCapaT:1000,stockActuelT:410,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Duplessis — 02 35 72 20 00",
   acces:"Zone de l'Aubette — quai à camion couvert",
   horairesReception:"Lun–Ven 07h–18h / Sam 07h–12h",
   prochaineLivraison:"2026-08-02",volumePrevu:38,
   livraisons:9,livraisonsConformes:9,alertes:0,statut:"ok"},
  // ── Nouvelle-Aquitaine ───────────────────────────────────────
  {id:"ch14",nom:"Réseau de chaleur Bordeaux Mérignac",commune:"Mérignac (33)",region:"Nouvelle-Aquitaine",
   puissanceMW:11.0,consoAnnT:22000,stockCapaT:1300,stockActuelT:750,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Aubert — 05 56 12 00 00",
   acces:"ZA du Phare — pont-bascule + déchargement pneumatique",
   horairesReception:"Lun–Sam 06h–19h",
   prochaineLivraison:"2026-07-27",volumePrevu:50,
   livraisons:15,livraisonsConformes:14,alertes:0,statut:"ok"},
  {id:"ch15",nom:"Chaufferie bois Limoges Beffroi",commune:"Limoges (87)",region:"Nouvelle-Aquitaine",
   puissanceMW:6.2,consoAnnT:12400,stockCapaT:750,stockActuelT:340,
   humiMax:30,granuAccepte:"G30-G50 / P45",
   contact:"Mme Delmas — 05 55 45 20 00",
   acces:"Rue Beffroi — camion max 10 t sur voie locale",
   horairesReception:"Lun–Ven 08h–17h",
   prochaineLivraison:"2026-08-08",volumePrevu:22,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  // ── Pays de la Loire ─────────────────────────────────────────
  {id:"ch16",nom:"Réseau chaleur Nantes Nord",commune:"Nantes (44)",region:"Pays de la Loire",
   puissanceMW:14.0,consoAnnT:28000,stockCapaT:1600,stockActuelT:700,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Guérin — 02 40 41 90 00",
   acces:"ZI de Carquefou — silo automatique + pont-bascule",
   horairesReception:"Lun–Ven 06h–20h",
   prochaineLivraison:"2026-07-28",volumePrevu:65,
   livraisons:18,livraisonsConformes:17,alertes:0,statut:"ok"},
  // ── Hauts-de-France ──────────────────────────────────────────
  {id:"ch17",nom:"Chaufferie bois Lille Hellemmes",commune:"Hellemmes (59)",region:"Hauts-de-France",
   puissanceMW:16.5,consoAnnT:33000,stockCapaT:2000,stockActuelT:890,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Leroy — 03 20 14 50 50",
   acces:"ZI Hellemmes — portique de contrôle + pont-bascule",
   horairesReception:"Lun–Sam 06h–20h",
   prochaineLivraison:"2026-07-26",volumePrevu:75,
   livraisons:20,livraisonsConformes:19,alertes:0,statut:"ok"},
  // ── Île-de-France ────────────────────────────────────────────
  {id:"ch18",nom:"Réseau bois Saclay — CEA",commune:"Saclay (91)",region:"Île-de-France",
   puissanceMW:20.0,consoAnnT:40000,stockCapaT:2200,stockActuelT:980,
   humiMax:28,granuAccepte:"G30-G50 / G50",
   contact:"M. Marchand — 01 69 08 50 00",
   acces:"Plateau de Saclay — badge sécurité requis + escorte",
   horairesReception:"Lun–Ven 07h–17h (badge obligatoire)",
   prochaineLivraison:"2026-08-01",volumePrevu:90,
   livraisons:25,livraisonsConformes:24,alertes:0,statut:"ok"},
  // ── Provence-Alpes-Côte d'Azur ───────────────────────────────
  {id:"ch19",nom:"Chaufferie bois Aix-en-Provence ZAC",commune:"Aix-en-Provence (13)",region:"Provence-Alpes-Côte d'Azur",
   puissanceMW:7.2,consoAnnT:14400,stockCapaT:850,stockActuelT:290,
   humiMax:32,granuAccepte:"G30-G50",
   contact:"Mme Bonnet — 04 42 91 90 00",
   acces:"ZAC Les Milles — entrée P2, 2e portail",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-08-05",volumePrevu:33,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  // ── Corse ────────────────────────────────────────────────────
  {id:"ch20",nom:"Chaufferie bois Ajaccio Cannes-Échelle",commune:"Ajaccio (2A)",region:"Corse",
   puissanceMW:2.4,consoAnnT:4800,stockCapaT:280,stockActuelT:95,
   humiMax:32,granuAccepte:"G30-G50",
   contact:"M. Colonna — 04 95 23 40 00",
   acces:"ZI de Mezzavia — route étroite (12 t maxi), croisement difficile",
   horairesReception:"Lun–Ven 08h–16h (approvisionnement maritime août)",
   prochaineLivraison:"2026-08-03",volumePrevu:15,
   livraisons:3,livraisonsConformes:3,alertes:0,statut:"ok"},
  {id:"ch21",nom:"Réseau chaleur Bastia Toga",commune:"Bastia (2B)",region:"Corse",
   puissanceMW:1.8,consoAnnT:3600,stockCapaT:200,stockActuelT:38,
   humiMax:34,granuAccepte:"G30-G50 / P45",
   contact:"Mme Santoni — 04 95 32 11 00",
   acces:"ZI de Toga — quai côté mer, accès PL limité port",
   horairesReception:"Lun–Ven 08h–12h uniquement",
   prochaineLivraison:"2026-07-25",volumePrevu:10,
   livraisons:2,livraisonsConformes:2,alertes:1,statut:"alerte"},
  // ── Guadeloupe (971) ─────────────────────────────────────────
  {id:"ch22",nom:"Chaufferie bagasse-bois Gardel",commune:"Le Moule — Guadeloupe (971)",region:"Guadeloupe",
   puissanceMW:4.0,consoAnnT:8000,stockCapaT:400,stockActuelT:180,
   humiMax:40,granuAccepte:"G30-G50 / résidus canne",
   contact:"M. Céleste — 05 90 23 00 00",
   acces:"Route de l'Usine Gardel — pesée obligatoire à l'entrée",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-08-10",volumePrevu:18,
   livraisons:4,livraisonsConformes:4,alertes:0,statut:"ok"},
  // ── Martinique (972) ─────────────────────────────────────────
  {id:"ch23",nom:"Chaufferie biomasse CHU Martinique",commune:"Fort-de-France (972)",region:"Martinique",
   puissanceMW:1.5,consoAnnT:3000,stockCapaT:150,stockActuelT:55,
   humiMax:38,granuAccepte:"G30-G50",
   contact:"Service énergie CHU — 05 96 55 20 00",
   acces:"Route de Châteaubœuf — livraisons sur RDV médical zone",
   horairesReception:"Mar et Jeu 07h30–11h30 uniquement",
   prochaineLivraison:"2026-08-04",volumePrevu:8,
   livraisons:2,livraisonsConformes:2,alertes:0,statut:"ok"},
  // ── La Réunion (974) ─────────────────────────────────────────
  {id:"ch24",nom:"Centrale biomasse Albioma Le Gol",commune:"Saint-Louis (974)",region:"La Réunion",
   puissanceMW:35.0,consoAnnT:70000,stockCapaT:3500,stockActuelT:1600,
   humiMax:45,granuAccepte:"G50 / bagasse / résidus canne",
   contact:"M. Payet — 02 62 49 40 00",
   acces:"Port du Gol — accès par convoi maritime + route littorale",
   horairesReception:"7j/7 06h–20h (consigne port obligatoire)",
   prochaineLivraison:"2026-07-27",volumePrevu:200,
   livraisons:30,livraisonsConformes:29,alertes:0,statut:"ok"},
  // ── Guyane (973) ─────────────────────────────────────────────
  {id:"ch25",nom:"Centrale biomasse EDF Dégrad-des-Cannes",commune:"Rémire-Montjoly (973)",region:"Guyane",
   puissanceMW:18.0,consoAnnT:36000,stockCapaT:2000,stockActuelT:820,
   humiMax:50,granuAccepte:"G50 / résidus forêt tropicale",
   contact:"M. Léonce — 05 94 27 00 00",
   acces:"Zone industrielle DDC — accès fluvial + route nationale",
   horairesReception:"Lun–Ven 07h–17h30 (contrôle phytosanitaire obligatoire)",
   prochaineLivraison:"2026-08-01",volumePrevu:120,
   livraisons:12,livraisonsConformes:12,alertes:0,statut:"ok"},
  // ── Mayotte (976) ────────────────────────────────────────────
  {id:"ch26",nom:"Chaufferie biomasse Longoni",commune:"Bandraboua (976)",region:"Mayotte",
   puissanceMW:2.0,consoAnnT:4000,stockCapaT:200,stockActuelT:42,
   humiMax:45,granuAccepte:"G30-G50 / résidus végétaux locaux",
   contact:"M. Madi — 02 69 61 00 00",
   acces:"Port de Longoni — accès containerisé uniquement",
   horairesReception:"Lun–Ven 08h–15h (selon marée port Longoni)",
   prochaineLivraison:"2026-08-15",volumePrevu:10,
   livraisons:1,livraisonsConformes:1,alertes:1,statut:"alerte"},
  // ── Saint-Pierre-et-Miquelon (975) ───────────────────────────
  {id:"ch27",nom:"Réseau chaleur Saint-Pierre Ville",commune:"Saint-Pierre (975)",region:"Saint-Pierre-et-Miquelon",
   puissanceMW:1.0,consoAnnT:2000,stockCapaT:120,stockActuelT:28,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Claireaux — 05 08 41 10 00",
   acces:"Port de Saint-Pierre — importation Canada/Métropole par cargo",
   horairesReception:"Selon arrivée cargo (planning trimestriel)",
   prochaineLivraison:"2026-09-10",volumePrevu:50,
   livraisons:2,livraisonsConformes:2,alertes:1,statut:"alerte"},
  // ── Polynésie française (987) ─────────────────────────────────
  {id:"ch28",nom:"Centrale biomasse EDT — Fare Ute",commune:"Papeete — Polynésie française (987)",region:"Polynésie française",
   puissanceMW:5.0,consoAnnT:10000,stockCapaT:500,stockActuelT:210,
   humiMax:45,granuAccepte:"G50 / copeaux locaux",
   contact:"M. Tetuanui — +689 40 86 60 00",
   acces:"Zone portuaire Fare Ute — livraison par barge inter-îles",
   horairesReception:"Lun–Ven 07h–16h (heure locale Tahiti)",
   prochaineLivraison:"2026-08-20",volumePrevu:30,
   livraisons:3,livraisonsConformes:3,alertes:0,statut:"ok"},
  // ── Nouvelle-Calédonie (988) ──────────────────────────────────
  {id:"ch29",nom:"Centrale biomasse Prony Energies",commune:"Prony (988)",region:"Nouvelle-Calédonie",
   puissanceMW:8.0,consoAnnT:16000,stockCapaT:900,stockActuelT:380,
   humiMax:48,granuAccepte:"G50 / résidus mine/bois locaux",
   contact:"M. Wamytan — +687 35 10 00",
   acces:"Route de Prony — accès industriel mine + port",
   horairesReception:"Lun–Ven 07h–17h (heure locale NC)",
   prochaineLivraison:"2026-08-18",volumePrevu:45,
   livraisons:5,livraisonsConformes:5,alertes:0,statut:"ok"},
];

/* ═══════════════════════════════════════════════════════
   SECTION FACTURATION ÉLECTRONIQUE
   Obligations à partir du 01/09/2026 (réception) et 01/09/2027 (émission TPE/PME)
═══════════════════════════════════════════════════════ */
const STATUT_FACTURE = {
  brouillon:  {label:"Brouillon",        color:"#6B7280", bg:"#F3F4F6", icon:"✏️"},
  validee:    {label:"Bon validé",       color:"#1E40AF", bg:"#DBEAFE", icon:"✅"},
  emise:      {label:"Émise",            color:"#065F46", bg:"#D1FAE5", icon:"📤"},
  transmise:  {label:"Transmise plateforme",color:"#7C3AED",bg:"#EDE9FE",icon:"🔗"},
  payee:      {label:"Payée",            color:"#064E3B", bg:"#CCFBF1", icon:"💶"},
  litige:     {label:"Litige",           color:"#991B1B", bg:"#FEE2E2", icon:"⚠️"},
  doublon:    {label:"Doublon détecté",  color:"#B45309", bg:"#FEF3C7", icon:"🔄"},
};

const DEMO_FACTURES = [
  {
    id:"FAC-2026-0041", lot:"LOT-2026-041", livraison:"LIV-2026-0234",
    fournisseur:"SCIC Forêt de Tronçais", client:"Chaufferie intercommunale Moulins",
    dateEmission:"2026-07-01", dateEcheance:"2026-07-31",
    statut:"payee",
    lignes:[
      {libelle:"Plaquettes forestières",    cat:"matiere",     qte:145, unite:"t", pu:52.00, total:7540},
      {libelle:"Broyage sur site",          cat:"prestation",  qte:145, unite:"t", pu: 8.50, total:1232.50},
      {libelle:"Transport chaufferie",      cat:"transport",   qte:145, unite:"t", pu: 6.20, total:899},
    ],
    tonnageLivre:145, tonnageReceptionne:145, ecartTonnage:0,
    doublonDetecte:false, archiveJustif:true,
  },
  {
    id:"FAC-2026-0052", lot:"LOT-2026-044", livraison:"LIV-2026-0241",
    fournisseur:"ETA Moreau Sylviculture", client:"Réseau de chaleur Vichy Sud",
    dateEmission:"2026-07-08", dateEcheance:"2026-08-07",
    statut:"transmise",
    lignes:[
      {libelle:"Bois énergie — qualité P45", cat:"matiere",    qte:89,  unite:"t", pu:48.00, total:4272},
      {libelle:"Transport",                  cat:"transport",  qte:89,  unite:"t", pu: 7.10, total:631.90},
    ],
    tonnageLivre:91, tonnageReceptionne:89, ecartTonnage:2,
    doublonDetecte:false, archiveJustif:true,
  },
  {
    id:"FAC-2026-0055", lot:"LOT-2026-041", livraison:"LIV-2026-0234",
    fournisseur:"SCIC Forêt de Tronçais", client:"Chaufferie intercommunale Moulins",
    dateEmission:"2026-07-03", dateEcheance:"2026-08-02",
    statut:"doublon",
    lignes:[
      {libelle:"Plaquettes forestières",    cat:"matiere",    qte:145, unite:"t", pu:52.00, total:7540},
    ],
    tonnageLivre:145, tonnageReceptionne:145, ecartTonnage:0,
    doublonDetecte:true, archiveJustif:false,
    doublonDe:"FAC-2026-0041",
  },
  {
    id:"FAC-2026-0063", lot:"LOT-2026-049", livraison:null,
    fournisseur:"Groupement Forestier Allier Est", client:"Chaufferie Saint-Pourçain",
    dateEmission:null, dateEcheance:"2026-08-15",
    statut:"validee",
    lignes:[
      {libelle:"Plaquettes bord de route",  cat:"matiere",    qte:68,  unite:"t", pu:45.00, total:3060},
      {libelle:"Préparation du lot",        cat:"prestation", qte:68,  unite:"t", pu: 4.00, total:272},
      {libelle:"Transport",                 cat:"transport",  qte:68,  unite:"t", pu: 6.80, total:462.40},
    ],
    tonnageLivre:68, tonnageReceptionne:null, ecartTonnage:null,
    doublonDetecte:false, archiveJustif:false,
  },
];

export const SectionFacturationElec = () => {
  const [tab,     setTab]     = useState("suivi");
  const [selFac,  setSelFac]  = useState(null);

  const totalHT   = DEMO_FACTURES.filter(f=>f.statut!=="doublon")
                      .reduce((s,f)=>s+f.lignes.reduce((a,l)=>a+l.total,0),0);
  const nbDoublon = DEMO_FACTURES.filter(f=>f.doublonDetecte).length;
  const nbEcart   = DEMO_FACTURES.filter(f=>f.ecartTonnage&&f.ecartTonnage>0).length;

  const CAT_COLORS = {matiere:"#1E5B3A", prestation:"#1E40AF", transport:"#B45309"};
  const CAT_BG     = {matiere:"#D1FAE5", prestation:"#DBEAFE", transport:"#FEF3C7"};

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* En-tête + deadline */}
      <div style={{marginBottom:14,display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
            🧾 Facturation électronique
          </div>
          <div style={{fontSize:12,color:C.tx3}}>
            Lot livré → Bon validé → Quantité définitive → Ventilation → Plateforme agréée → Paiement suivi
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
          {[
            ["1er sept. 2026","Réception obligatoire — toutes entreprises","#1E40AF","#DBEAFE"],
            ["1er sept. 2027","Émission obligatoire — TPE/PME",            "#7C3AED","#EDE9FE"],
          ].map(([d,l,col,bg])=>(
            <div key={d} style={{display:"flex",alignItems:"center",gap:8,
              background:bg,border:`1px solid ${col}44`,borderRadius:10,padding:"5px 12px"}}>
              <span style={{fontSize:11,fontWeight:900,color:col}}>{d}</span>
              <span style={{fontSize:10,color:col}}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bannière positionnement */}
      <div style={{background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:12,
        padding:"12px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:20,flexShrink:0}}>🎯</span>
        <div>
          <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:3}}>
            APPLITAG — couche métier en amont de la plateforme agréée
          </div>
          <div style={{fontSize:11,color:"#065F46",lineHeight:1.7}}>
            APPLITAG prépare et structure les données facturables. La transmission légale est effectuée
            par la plateforme de dématérialisation partenaire (PDP) choisie par l'entreprise.
            <strong> APPLITAG n'est pas une plateforme agréée.</strong>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {icon:"🧾",label:"Factures",      val:DEMO_FACTURES.length,      col:"#1E40AF",bg:"#DBEAFE"},
          {icon:"💶",label:"Total HT",       val:`${(totalHT/1000).toFixed(1)} k€`,col:"#065F46",bg:"#D1FAE5"},
          {icon:"🔄",label:"Doublons",       val:nbDoublon, col:nbDoublon>0?"#991B1B":"#065F46",
           bg:nbDoublon>0?"#FEE2E2":"#D1FAE5"},
          {icon:"⚖️",label:"Écarts tonnage", val:nbEcart,   col:nbEcart>0?"#B45309":"#065F46",
           bg:nbEcart>0?"#FEF3C7":"#D1FAE5"},
          {icon:"📤",label:"Transmises PDP", val:DEMO_FACTURES.filter(f=>f.statut==="transmise"||f.statut==="payee").length,
           col:"#7C3AED",bg:"#EDE9FE"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"10px 12px",
            border:`1.5px solid ${k.col}44`,textAlign:"center"}}>
            <div style={{fontSize:18}}>{k.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:k.col}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,fontWeight:600,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[
          ["suivi",    "📋","Suivi des factures"],
          ["workflow", "🔄","Workflow lot → facture"],
          ["export",   "📤","Export structuré"],
          ["conformite","⚖️","Conformité & risques"],
        ].map(([id,ico,lbl])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            padding:"8px 16px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
            fontFamily:"inherit",border:`2px solid ${tab===id?"#1E40AF":C.bd}`,
            background:tab===id?"#1E40AF":"transparent",
            color:tab===id?"#fff":C.tx2,WebkitTapHighlightColor:"transparent"}}>
            {ico} {lbl}
          </button>
        ))}
      </div>

      {/* ── SUIVI DES FACTURES ── */}
      {tab==="suivi"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DEMO_FACTURES.map(f=>{
            const st  = STATUT_FACTURE[f.statut]||STATUT_FACTURE.brouillon;
            const ttl = f.lignes.reduce((s,l)=>s+l.total,0);
            const isOpen = selFac===f.id;
            return (
              <div key={f.id} style={{background:"#fff",borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${f.doublonDetecte?"#F59E0B":f.ecartTonnage>0?"#FCA5A5":st.color+"44"}`,
                boxShadow:f.doublonDetecte?"0 0 0 2px #FEF3C7":undefined}}>
                {/* Header */}
                <div onClick={()=>setSelFac(isOpen?null:f.id)}
                  style={{padding:"12px 14px",cursor:"pointer",
                    background:isOpen?st.bg+"60":"#fff",
                    display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",
                    WebkitTapHighlightColor:"transparent"}}>
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:900,color:C.tx,fontFamily:"monospace"}}>
                        {f.id}
                      </span>
                      <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                        background:st.bg,color:st.color}}>{st.icon} {st.label}</span>
                      {f.doublonDetecte&&(
                        <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:"#FEF3C7",color:"#B45309"}}>
                          🔄 Doublon de {f.doublonDe}
                        </span>
                      )}
                      {f.ecartTonnage>0&&(
                        <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10,
                          background:"#FEE2E2",color:"#991B1B"}}>
                          ⚖️ Écart {f.ecartTonnage} t
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:C.tx3}}>
                      {f.fournisseur} → {f.client}
                    </div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:2}}>
                      {f.lot} · {f.livraison||"Livraison à rattacher"} ·{" "}
                      {f.dateEmission
                        ? `Émission ${new Date(f.dateEmission).toLocaleDateString("fr-FR")}`
                        : "Non émise"}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:900,color:st.color}}>
                      {ttl.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                    </div>
                    <div style={{fontSize:10,color:C.tx3}}>HT</div>
                  </div>
                  <span style={{color:C.tx3,fontSize:14}}>{isOpen?"▲":"▼"}</span>
                </div>

                {/* Détail */}
                {isOpen&&(
                  <div style={{borderTop:`1px solid ${C.bd}`,padding:"14px",background:"#FAFAFA"}}>
                    {/* Lignes de facture */}
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,fontWeight:800,color:C.tx,marginBottom:8}}>
                        Lignes de facturation — ventilation matière / prestation / transport
                      </div>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr style={{background:C.bg2}}>
                            {["Libellé","Catégorie","Qté","Unité","PU HT","Total HT"].map(h=>(
                              <th key={h} style={{padding:"7px 10px",textAlign:"left",
                                fontSize:10,fontWeight:800,color:C.tx2,
                                borderBottom:`1px solid ${C.bd}`}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {f.lignes.map((l,i)=>(
                            <tr key={i} style={{borderBottom:`1px solid ${C.bd}`}}>
                              <td style={{padding:"8px 10px",color:C.tx,fontWeight:600}}>{l.libelle}</td>
                              <td style={{padding:"8px 10px"}}>
                                <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,
                                  fontWeight:700,background:CAT_BG[l.cat],
                                  color:CAT_COLORS[l.cat]}}>
                                  {l.cat}
                                </span>
                              </td>
                              <td style={{padding:"8px 10px",color:C.tx}}>{l.qte}</td>
                              <td style={{padding:"8px 10px",color:C.tx3}}>{l.unite}</td>
                              <td style={{padding:"8px 10px",color:C.tx}}>
                                {l.pu.toFixed(2)} €
                              </td>
                              <td style={{padding:"8px 10px",fontWeight:700,color:C.tx}}>
                                {l.total.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                              </td>
                            </tr>
                          ))}
                          <tr style={{background:C.bg2,borderTop:`2px solid ${C.bd}`}}>
                            <td colSpan={5} style={{padding:"8px 10px",fontWeight:800,
                              color:C.tx,textAlign:"right"}}>Total HT</td>
                            <td style={{padding:"8px 10px",fontWeight:900,fontSize:14,
                              color:"#1E40AF"}}>
                              {ttl.toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Rapprochement lot-livraison */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                      {[
                        ["🌲 Lot source",     f.lot,           "#1E5B3A"],
                        ["📦 Livraison",       f.livraison||"Non rattachée","#1E40AF"],
                        ["📄 Justificatifs",   f.archiveJustif?"Archivés ✓":"À compléter ⏳",
                         f.archiveJustif?"#065F46":"#B45309"],
                      ].map(([lbl,val,col])=>(
                        <div key={lbl} style={{background:C.bg2,borderRadius:8,padding:"8px 10px",
                          border:`1px solid ${col}33`}}>
                          <div style={{fontSize:10,color:C.tx3,marginBottom:2}}>{lbl}</div>
                          <div style={{fontSize:11,fontWeight:700,color:col}}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Écart tonnage */}
                    {f.tonnageReceptionne!==null&&(
                      <div style={{padding:"8px 12px",borderRadius:8,marginBottom:10,
                        background:f.ecartTonnage>0?"#FEF2F2":"#F0FDF4",
                        border:`1px solid ${f.ecartTonnage>0?"#FECACA":"#86EFAC"}`}}>
                        <div style={{fontSize:11,fontWeight:700,
                          color:f.ecartTonnage>0?"#991B1B":"#065F46"}}>
                          {f.ecartTonnage>0
                            ? `⚠️ Écart tonnage : facturé ${f.tonnageLivre} t / réceptionné ${f.tonnageReceptionne} t (−${f.ecartTonnage} t)`
                            : `✅ Tonnage cohérent : ${f.tonnageLivre} t facturé = ${f.tonnageReceptionne} t réceptionné`}
                        </div>
                      </div>
                    )}

                    {/* Alerte doublon */}
                    {f.doublonDetecte&&(
                      <div style={{padding:"10px 12px",borderRadius:8,
                        background:"#FEF3C7",border:"1px solid #FCD34D"}}>
                        <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:4}}>
                          🔄 Doublon détecté — action requise
                        </div>
                        <div style={{fontSize:11,color:"#78350F",lineHeight:1.6}}>
                          Cette facture concerne le même lot et la même livraison que <strong>{f.doublonDe}</strong>,
                          déjà payée. Vérifier avant toute transmission à la plateforme agréée.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── WORKFLOW ── */}
      {tab==="workflow"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:14}}>
              Chaîne de valeur APPLITAG → Plateforme agréée
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {n:1,ico:"🌲",titre:"Lot livré",          desc:"Visite terrain validée, tonnage pesé à la réception, humidité contrôlée",                  col:"#1E5B3A",bg:"#D1FAE5"},
                {n:2,ico:"✅",titre:"Bon de livraison validé",desc:"Signature numérique réception — quantité définitive arrêtée",                         col:"#065F46",bg:"#D1FAE5"},
                {n:3,ico:"⚖️",titre:"Quantité définitive",  desc:"Tonnage réceptionné = base facturable. Tout écart entre livré et réceptionné est signalé",col:"#1E40AF",bg:"#DBEAFE"},
                {n:4,ico:"📊",titre:"Ventilation des lignes",desc:"Matière / Broyage / Transport ventilés séparément avec codes produit et quantités",      col:"#7C3AED",bg:"#EDE9FE"},
                {n:5,ico:"🧾",titre:"Données préparées",    desc:"Identifiant unique, références croisées lot-livraison-facture, contrôle doublon",        col:"#B45309",bg:"#FEF3C7"},
                {n:6,ico:"🔗",titre:"→ Plateforme agréée (PDP)",desc:"Export structuré (UBL/Factur-X) transmis à la PDP choisie par l'entreprise. APPLITAG n'est pas la PDP.",col:"#6B7280",bg:"#F3F4F6"},
                {n:7,ico:"💶",titre:"Paiement suivi",        desc:"Statut de paiement rapatrié depuis la PDP ou saisi manuellement — historique conservé",  col:"#064E3B",bg:"#CCFBF1"},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",gap:12,alignItems:"flex-start",
                  padding:"10px 12px",borderRadius:10,background:s.bg,
                  border:`1px solid ${s.col}33`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:s.col,
                    color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:900,fontSize:12,flexShrink:0}}>{s.n}</div>
                  <span style={{fontSize:18,flexShrink:0,marginTop:2}}>{s.ico}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:s.col}}>{s.titre}</div>
                    <div style={{fontSize:11,color:C.tx2,marginTop:2,lineHeight:1.5}}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Identifiant unique */}
          <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
            border:"1.5px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:6}}>
              🔑 Identifiant unique de facture — structure APPLITAG
            </div>
            <div style={{fontFamily:"monospace",fontSize:13,color:"#1E3A8A",
              background:"#fff",borderRadius:8,padding:"10px 14px",
              border:"1px solid #BFDBFE",letterSpacing:".5px"}}>
              FAC-<span style={{color:"#7C3AED"}}>2026</span>-<span style={{color:"#065F46"}}>XXXX</span>
            </div>
            <div style={{fontSize:11,color:"#1E3A8A",marginTop:8,lineHeight:1.6}}>
              Préfixe <strong>FAC</strong> · Année · Séquence numérique.
              Chaque facture référence son lot source et sa livraison — rapprochement automatique,
              détection de doublon par triplet (lot × livraison × fournisseur).
            </div>
          </div>
        </div>
      )}

      {/* ── EXPORT STRUCTURÉ ── */}
      {tab==="export"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:4}}>
              📋 Action recommandée — Export structuré d'abord, intégration API ensuite
            </div>
            <div style={{fontSize:11,color:"#78350F",lineHeight:1.7}}>
              Le consortium recommande de privilégier un export structuré et un suivi des statuts
              avant de développer un connecteur API. La plateforme comptable choisie par l'entreprise
              n'est pas encore connue dans tous les cas.
            </div>
          </div>

          {/* Formats disponibles */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:12}}>
              Formats d'export disponibles (feuille de route)
            </div>
            {[
              {fmt:"CSV structuré",       ico:"📊",stat:"disponible","desc":"Export immédiat des lignes de facture avec ventilation matière/prestation/transport",col:"#065F46",bg:"#D1FAE5"},
              {fmt:"PDF récapitulatif",   ico:"📄",stat:"disponible","desc":"Bon de livraison + lignes facturables + totaux HT — prêt à transmettre",           col:"#1E40AF",bg:"#DBEAFE"},
              {fmt:"Factur-X (PDF/A-3)", ico:"🔗",stat:"roadmap",   "desc":"Format hybride PDF + XML structuré — standard FR pour la facturation électronique", col:"#7C3AED",bg:"#EDE9FE"},
              {fmt:"UBL 2.1",             ico:"🌐",stat:"roadmap",   "desc":"Standard européen XML — requis par certaines PDP",                                  col:"#B45309",bg:"#FEF3C7"},
              {fmt:"Connecteur API PDP",  ico:"⚡",stat:"à définir", "desc":"Dépend de la PDP choisie par l'entreprise — développement après choix comptable",   col:"#6B7280",bg:"#F3F4F6"},
            ].map(f=>(
              <div key={f.fmt} style={{display:"flex",gap:12,alignItems:"center",
                padding:"10px 12px",borderRadius:10,background:f.bg,
                border:`1px solid ${f.col}33`,marginBottom:6}}>
                <span style={{fontSize:20,flexShrink:0}}>{f.ico}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                    <span style={{fontSize:12,fontWeight:800,color:f.col}}>{f.fmt}</span>
                    <span style={{fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:10,
                      background:f.stat==="disponible"?"#065F46":f.stat==="roadmap"?"#7C3AED":"#6B7280",
                      color:"#fff"}}>{f.stat}</span>
                  </div>
                  <div style={{fontSize:11,color:C.tx2}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Archivage */}
          <div style={{background:"#EFF6FF",borderRadius:10,padding:"12px 14px",
            border:"1.5px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#1E40AF",marginBottom:6}}>
              🗄️ Archivage des justificatifs — obligations légales
            </div>
            {[
              ["10 ans","Durée minimale d'archivage des factures électroniques"],
              ["Preuve d'intégrité","Signature ou empreinte numérique à conserver"],
              ["Piste d'audit fiable","Lien traçable lot → livraison → facture → paiement"],
            ].map(([v,l])=>(
              <div key={v} style={{display:"flex",gap:10,alignItems:"center",
                padding:"6px 0",borderBottom:`1px solid #BFDBFE`}}>
                <span style={{fontSize:11,fontWeight:900,color:"#1E40AF",minWidth:120,flexShrink:0}}>{v}</span>
                <span style={{fontSize:11,color:"#1E3A8A"}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONFORMITÉ & RISQUES ── */}
      {tab==="conformite"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Calendrier */}
          <div style={{background:C.bg2,borderRadius:12,padding:"14px",border:`1.5px solid ${C.bd}`}}>
            <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:10}}>
              📅 Calendrier d'application
            </div>
            {[
              {date:"1er septembre 2026",scope:"Toutes entreprises",
               oblig:"Réception des factures électroniques",col:"#1E40AF",bg:"#DBEAFE",urgent:true},
              {date:"1er septembre 2027",scope:"TPE / PME",
               oblig:"Émission des factures électroniques",col:"#7C3AED",bg:"#EDE9FE",urgent:false},
            ].map(e=>(
              <div key={e.date} style={{display:"flex",gap:12,alignItems:"flex-start",
                padding:"12px",borderRadius:10,background:e.bg,
                border:`1.5px solid ${e.col}44`,marginBottom:8}}>
                <div style={{background:e.col,borderRadius:8,padding:"6px 12px",
                  textAlign:"center",flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:900,color:"#fff",whiteSpace:"nowrap"}}>{e.date}</div>
                  {e.urgent&&<div style={{fontSize:9,color:"#fff",opacity:.8,marginTop:1}}>J−41</div>}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:800,color:e.col,marginBottom:2}}>{e.oblig}</div>
                  <div style={{fontSize:11,color:C.tx2}}>{e.scope}</div>
                </div>
              </div>
            ))}
            <div style={{fontSize:11,color:C.tx3,lineHeight:1.6,marginTop:4}}>
              Les entreprises doivent passer par une <strong>plateforme de dématérialisation partenaire (PDP)</strong> agréée
              pour transmettre ou recevoir leurs factures et les données réglementaires.
            </div>
          </div>

          {/* Risques */}
          <div style={{background:"#FFF7ED",borderRadius:12,padding:"14px",
            border:"1.5px solid #FED7AA"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#9A3412",marginBottom:10}}>
              ⚠️ Risques à éviter
            </div>
            {[
              ["Développer un connecteur sans connaître la PDP",
               "Chaque PDP a son API propriétaire. Attendre le choix comptable avant tout développement de connecteur."],
              ["Créer un doublon avec le logiciel de comptabilité",
               "APPLITAG prépare les données — il ne remplace pas le logiciel de comptabilité. Définir clairement la frontière."],
              ["Facturer un tonnage différent du tonnage réceptionné",
               "Le tonnage facturé doit être celui réceptionné signé. APPLITAG détecte automatiquement les écarts."],
              ["Présenter APPLITAG comme une plateforme agréée",
               "APPLITAG est la couche métier amont. La PDP est un opérateur agréé par l'administration — rôles distincts."],
            ].map(([t,d])=>(
              <div key={t} style={{display:"flex",gap:10,padding:"9px 0",
                borderBottom:`1px solid #FED7AA`,alignItems:"flex-start"}}>
                <span style={{fontSize:14,flexShrink:0,marginTop:1}}>🚫</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#9A3412"}}>{t}</div>
                  <div style={{fontSize:11,color:"#7C2D12",marginTop:2,lineHeight:1.5}}>{d}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Fonctions prioritaires */}
          <div style={{background:"#F0FDF4",borderRadius:12,padding:"14px",
            border:"1.5px solid #86EFAC"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:10}}>
              ✅ Fonctions prioritaires APPLITAG
            </div>
            {[
              ["🔑","Identifiant unique de facture",          "Généré automatiquement — FAC-AAAA-XXXX"],
              ["🔗","Rapprochement lot-livraison-facture",    "Triplet unique — détection croisée"],
              ["🔄","Détection des doublons",                 "Même lot × livraison × fournisseur → alerte"],
              ["📊","Suivi des statuts",                      "Brouillon → Validé → Émis → Transmis PDP → Payé"],
              ["📋","Ventilation matière / prestation / transport","3 catégories distinctes par ligne"],
              ["🗄️","Archivage des justificatifs",            "Lien piste d'audit — 10 ans minimum"],
            ].map(([ico,lbl,det])=>(
              <div key={lbl} style={{display:"flex",gap:10,padding:"8px 0",
                borderBottom:`1px solid #A7F3D0`,alignItems:"flex-start"}}>
                <span style={{fontSize:16,flexShrink:0}}>{ico}</span>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#065F46"}}>{lbl}</div>
                  <div style={{fontSize:10,color:"#047857",marginTop:1}}>{det}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SectionChaufferies = () => {
  const [selected,  setSelected]  = useState(null);
  const [filtRegion,setFiltRegion] = useState("Toutes");

  const ch = selected ? CHAUFFERIES_DATA.find(c=>c.id===selected) : null;

  const stockMoyPct = d => Math.round(d.stockActuelT/d.stockCapaT*100);
  const autonomieJ  = d => Math.round(d.stockActuelT/(d.consoAnnT/365));

  const REGIONS = ["Toutes", ...Array.from(new Set(CHAUFFERIES_DATA.map(d=>d.region))).sort()];
  const filtered = filtRegion==="Toutes" ? CHAUFFERIES_DATA : CHAUFFERIES_DATA.filter(d=>d.region===filtRegion);

  // Icônes par région
  const regionIco = r => ({
    "Auvergne-Rhône-Alpes":"⛰️","Bourgogne-Franche-Comté":"🍇","Grand Est":"🥨",
    "Occitanie":"☀️","Bretagne":"⚓","Normandie":"🌊","Nouvelle-Aquitaine":"🌲",
    "Pays de la Loire":"🏰","Hauts-de-France":"🌾","Île-de-France":"🗼",
    "Provence-Alpes-Côte d'Azur":"🌻","Corse":"🏔️",
    "Guadeloupe":"🌺","Martinique":"🌴","La Réunion":"🌋","Guyane":"🌿",
    "Mayotte":"🏝️","Saint-Pierre-et-Miquelon":"🧊",
    "Polynésie française":"🌺","Nouvelle-Calédonie":"🪸",
  }[r]||"📍");

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🔥 Chaufferies</div>
        <div style={{fontSize:13,color:C.tx2}}>Suivi des stocks, livraisons et consommations — France métropolitaine, Corse & Outre-mer</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🔥",label:"Chaufferies actives",val:CHAUFFERIES_DATA.length,col:"#B45309",bg:"#FEF3C7"},
          {ico:"📦",label:"Stock moyen",val:Math.round(CHAUFFERIES_DATA.reduce((s,d)=>s+stockMoyPct(d),0)/CHAUFFERIES_DATA.length)+"%",col:"#0369A1",bg:"#DBEAFE"},
          {ico:"⚡",label:"Énergie en stock",val:Math.round(CHAUFFERIES_DATA.reduce((s,d)=>s+d.stockActuelT*pciKWhT(d.humiMax)/1000,0))+" MWh",col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"🚛",label:"Livraisons totales",val:CHAUFFERIES_DATA.reduce((s,d)=>s+d.livraisons,0),col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"⚠️",label:"En alerte stock",val:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length,col:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length>0?"#991B1B":"#059669",bg:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtre région */}
      <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",
        scrollbarWidth:"none",paddingBottom:4}}>
        {REGIONS.map(r=>(
          <button key={r} onClick={()=>{setFiltRegion(r);setSelected(null);}} style={{
            flex:"0 0 auto",padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
            border:`1.5px solid ${filtRegion===r?"#B45309":C.bd}`,
            background:filtRegion===r?"#FEF3C7":"transparent",
            color:filtRegion===r?"#B45309":C.tx2,
            WebkitTapHighlightColor:"transparent"}}>
            {r==="Toutes"?"🗺️ Toutes régions":`${regionIco(r)} ${r}`}
          </button>
        ))}
      </div>

      <div style={{marginBottom:8,fontSize:11,color:C.tx3}}>
        {filtered.length} chaufferie{filtered.length>1?"s":""}{filtRegion!=="Toutes"?` en ${filtRegion}`:" — France entière"}
        {" · "}{filtered.filter(d=>d.alertes>0).length>0&&(
          <span style={{color:"#991B1B",fontWeight:700}}>
            ⚠️ {filtered.filter(d=>d.alertes>0).length} en alerte
          </span>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:ch?"1fr 360px":"repeat(2,1fr)",gap:12,alignItems:"start"}}>
        {filtered.map(d=>{
          const pct = stockMoyPct(d);
          const auto = autonomieJ(d);
          const isSelected = selected===d.id;
          const stockCol = pct>=40?"#059669":pct>=20?"#D97706":"#DC2626";
          const stockBg  = pct>=40?"#D1FAE5":pct>=20?"#FEF3C7":"#FEE2E2";
          return (
            <div key={d.id} onClick={()=>setSelected(isSelected?null:d.id)}
              style={{background:"#fff",borderRadius:12,padding:"14px 16px",cursor:"pointer",
                border:`2px solid ${isSelected?"#B45309":d.alertes>0?"#FCA5A5":C.bd}`}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                <div style={{fontSize:24}}>🔥</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{d.nom}</div>
                  <div style={{fontSize:11,color:C.tx2}}>{d.commune} · {d.puissanceMW} MW</div>
                </div>
                {d.alertes>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",
                  borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>⚠️ alerte</span>}
              </div>

              {/* Jauge stock */}
              <div style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
                  <span style={{color:C.tx3}}>Stock actuel</span>
                  <span style={{fontWeight:700,color:stockCol}}>{d.stockActuelT} / {d.stockCapaT} t · {pct}%</span>
                </div>
                <div style={{height:10,borderRadius:5,background:"#F3F4F6",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:stockCol,borderRadius:5}}/>
                </div>
                <div style={{fontSize:10,color:C.tx3,marginTop:3}}>Autonomie estimée : {auto} jours</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:10,color:C.tx2}}>
                <div style={{background:stockBg,borderRadius:6,padding:"5px 8px"}}>
                  📅 Prochaine livraison :<br/>
                  <span style={{fontWeight:700,color:stockCol}}>{new Date(d.prochaineLivraison).toLocaleDateString("fr-FR")} · {d.volumePrevu} t</span>
                </div>
                <div style={{background:"#F9FAFB",borderRadius:6,padding:"5px 8px"}}>
                  ✅ Conformité :<br/>
                  <span style={{fontWeight:700,color:"#059669"}}>{d.livraisons>0?Math.round(d.livraisonsConformes/d.livraisons*100):0}% ({d.livraisonsConformes}/{d.livraisons})</span>
                </div>
                <div style={{background:"#EDE9FE",borderRadius:6,padding:"5px 8px"}}>
                  ⚡ Stock énergie :<br/>
                  <span style={{fontWeight:700,color:"#7C3AED"}}>{Math.round(d.stockActuelT*pciKWhT(d.humiMax)/1000)} MWh</span>
                </div>
              </div>
            </div>
          );
        })}

        {ch&&(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #B45309",
            padding:16,position:"sticky",top:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{ch.nom}</div>
              <button onClick={()=>setSelected(null)}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
            </div>
            {ch.alertes>0&&(
              <div style={{background:"#FEE2E2",borderRadius:8,padding:"7px 10px",
                marginBottom:10,fontSize:11,color:"#991B1B",border:"1px solid #FECACA"}}>
                ⚠️ Stock bas — livraison urgente à planifier
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11}}>
              {[
                ["Commune",ch.commune],
                ["Puissance",ch.puissanceMW+" MW"],
                ["Consommation annuelle",ch.consoAnnT.toLocaleString("fr-FR")+" t/an · "+Math.round(ch.consoAnnT*pciKWhT(ch.humiMax)/1000).toLocaleString("fr-FR")+" MWh/an"],
                ["Capacité de stockage",ch.stockCapaT+" t"],
                ["Stock actuel",ch.stockActuelT+" t ("+stockMoyPct(ch)+"%)"],
                ["Énergie en stock",Math.round(ch.stockActuelT*pciKWhT(ch.humiMax)/1000)+" MWh (PCI ITEBE 2004, H="+ch.humiMax+"%)"],
                ["Autonomie estimée",autonomieJ(ch)+" jours"],
                ["Humidité max acceptée",ch.humiMax+"%"],
                ["Granulométrie acceptée",ch.granuAccepte],
                ["Contact",ch.contact],
                ["Accès",ch.acces],
                ["Horaires réception",ch.horairesReception],
                ["Prochaine livraison",new Date(ch.prochaineLivraison).toLocaleDateString("fr-FR")+" · "+ch.volumePrevu+" t"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                  <span style={{color:C.tx3,minWidth:140,flexShrink:0}}>{k}</span>
                  <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginTop:14}}>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"#B45309",border:"none",color:"#fff"}}>
                🚛 Planifier livraison
              </button>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"transparent",
                border:`1px solid ${C.bd}`,color:C.tx2}}>
                📊 Historique
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── RAPPORTS ─────────────────────────────────────────────────────

const RAPPORTS_TYPES = [
  {id:"rpt_activite",icon:"📊",label:"Rapport d'activité",desc:"Synthèse période : CA, marges, lots, tonnages, chantiers. Export Excel + PDF.",
   axes:["Période","Client","Territoire"],delai:"Immédiat",col:"#1E5B3A"},
  {id:"rpt_traçabilite",icon:"🔗",label:"Rapport de traçabilité",desc:"Chaîne complète parcelle → chantier → lot → transport → livraison pour chaque lot.",
   axes:["Lot","Période","Client"],delai:"Immédiat",col:"#0369A1"},
  {id:"rpt_qualite",icon:"🏅",label:"Rapport qualité",desc:"Humidités, granulométries, taux de conformité, refus par lot et par période.",
   axes:["Période","Chaufferie","Lot"],delai:"Immédiat",col:"#7C3AED"},
  {id:"rpt_financier",icon:"💶",label:"Rapport financier",desc:"Coûts détaillés, marges par lot/chantier/client, seuils de rentabilité.",
   axes:["Période","Client","Chantier"],delai:"Immédiat",col:"#B45309"},
  {id:"rpt_chantier",icon:"🌲",label:"Rapport de chantier",desc:"Fiche complète par chantier : surface, volumes, coûts, entreprises, photos, clôture.",
   axes:["Chantier","Période"],delai:"Immédiat",col:"#059669"},
  {id:"rpt_regl",icon:"⚖️",label:"Rapport réglementaire",desc:"Snapshot des textes par dossier, alertes actives, clauses de réserve apposées.",
   axes:["Période","Dossier"],delai:"Immédiat",col:"#5B21B6"},
  {id:"rpt_red",icon:"🌿",label:"Rapport durabilité RED II/III",desc:"Origine biomasse, critères durabilité, réduction GES — préparation audit.",
   axes:["Période","Client"],delai:"Sur demande",col:"#065F46"},
  {id:"rpt_proprietaire",icon:"👤",label:"Rapport propriétaire",desc:"Synthèse par propriétaire : parcelles, interventions, volumes, revenus, documents.",
   axes:["Propriétaire","Période"],delai:"Immédiat",col:"#92400E"},
];

const RAPPORTS_RECENTS = [
  {type:"rpt_activite", label:"Activité Mai 2026", date:"2026-06-01", format:"PDF+Excel", taille:"284 Ko"},
  {type:"rpt_financier", label:"Rentabilité T1 2026", date:"2026-04-02", format:"Excel", taille:"196 Ko"},
  {type:"rpt_traçabilite", label:"Traçabilité LOT-2026-038", date:"2026-07-17", format:"PDF", taille:"108 Ko"},
  {type:"rpt_chantier", label:"CH-2026-12 — clôture", date:"2026-07-19", format:"PDF", taille:"1.2 Mo"},
];

export const SectionRapports = () => {
  const [activeRpt, setActiveRpt] = useState(null);
  const [periode, setPeriode]     = useState("2026-05");
  const [axe, setAxe]             = useState("");
  const rpt = activeRpt ? RAPPORTS_TYPES.find(r=>r.id===activeRpt) : null;

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>📑 Rapports</div>
        <div style={{fontSize:13,color:C.tx2}}>Génération de rapports par période · client · territoire · lot</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14,alignItems:"start"}}>
        <div>
          {/* Catalogue */}
          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:8}}>📚 Catalogue des rapports disponibles</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            {RAPPORTS_TYPES.map(r=>(
              <div key={r.id} onClick={()=>setActiveRpt(activeRpt===r.id?null:r.id)}
                style={{background:"#fff",borderRadius:10,padding:"11px 13px",cursor:"pointer",
                  border:`2px solid ${activeRpt===r.id?r.col:C.bd}`,
                  boxShadow:activeRpt===r.id?`0 0 0 3px ${r.col}22`:"none"}}>
                <div style={{display:"flex",gap:7,alignItems:"flex-start",marginBottom:5}}>
                  <span style={{fontSize:20}}>{r.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:800,color:C.tx}}>{r.label}</div>
                    <div style={{fontSize:9,padding:"1px 5px",borderRadius:3,display:"inline-block",
                      background:r.col+"15",color:r.col,fontWeight:700,marginTop:2}}>{r.delai}</div>
                  </div>
                </div>
                <div style={{fontSize:10,color:C.tx2,lineHeight:1.4}}>{r.desc}</div>
                <div style={{marginTop:6,fontSize:9,color:C.tx3}}>
                  Axes : {r.axes.join(" · ")}
                </div>
              </div>
            ))}
          </div>

          {/* Rapports récents */}
          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:8}}>🕐 Rapports récents</div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
            {RAPPORTS_RECENTS.map((r,i)=>{
              const type = RAPPORTS_TYPES.find(t=>t.id===r.type);
              return (
                <div key={i} style={{display:"flex",gap:10,alignItems:"center",
                  padding:"9px 14px",borderBottom:i<RAPPORTS_RECENTS.length-1?`1px solid ${C.bd}`:"none",
                  background:i%2===0?"#fff":"#FAFAFA"}}>
                  <span style={{fontSize:18}}>{type?.icon||"📄"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{r.label}</div>
                    <div style={{fontSize:10,color:C.tx3}}>{new Date(r.date).toLocaleDateString("fr-FR")} · {r.format} · {r.taille}</div>
                  </div>
                  <button style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:600,
                    cursor:"pointer",fontFamily:"inherit",border:`1px solid ${C.bd}`,
                    background:"transparent",color:C.tx2}}>⬇️ Télécharger</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau de génération */}
        <div style={{background:"#fff",borderRadius:14,border:`2px solid ${rpt?rpt.col:"#E5E7EB"}`,
          padding:16,position:"sticky",top:0}}>
          {!rpt?(
            <div style={{textAlign:"center",padding:"30px 0",color:C.tx3}}>
              <div style={{fontSize:32,marginBottom:8}}>📑</div>
              <div style={{fontSize:12}}>Sélectionnez un type de rapport<br/>pour configurer la génération</div>
            </div>
          ):(
            <>
              <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:12}}>
                <span style={{fontSize:22}}>{rpt.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{rpt.label}</div>
                  <div style={{fontSize:10,color:C.tx2,marginTop:2}}>{rpt.desc}</div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Période</div>
                  <select value={periode} onChange={e=>setPeriode(e.target.value)}
                    style={{width:"100%",padding:"6px 8px",borderRadius:7,border:`1px solid ${C.bd}`,
                      fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx}}>
                    <option value="2026-05">Mai 2026</option>
                    <option value="2026-04">Avril 2026</option>
                    <option value="2026-03">Mars 2026</option>
                    <option value="2026-T2">T2 2026</option>
                    <option value="2026-T1">T1 2026</option>
                    <option value="2026">Année 2026</option>
                  </select>
                </div>
                {rpt.axes.length>1&&(
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Axe d'analyse</div>
                    <select value={axe} onChange={e=>setAxe(e.target.value)}
                      style={{width:"100%",padding:"6px 8px",borderRadius:7,border:`1px solid ${C.bd}`,
                        fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx}}>
                      <option value="">— Tous —</option>
                      {rpt.axes.map(a=><option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Format export</div>
                  <div style={{display:"flex",gap:6}}>
                    {["PDF","Excel","PDF + Excel"].map(f=>(
                      <label key={f} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,cursor:"pointer"}}>
                        <input type="radio" name="fmt" defaultChecked={f==="PDF"}/> {f}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aperçu contenu */}
              <div style={{background:"#F9FAFB",borderRadius:8,padding:10,
                border:`1px solid ${C.bd}`,marginBottom:12,fontSize:10}}>
                <div style={{fontWeight:700,color:C.tx,marginBottom:6}}>Contenu inclus :</div>
                {[
                  "En-tête ALTEGAD + logo APPLITAG",
                  `Période : ${periode}${axe?" · Axe : "+axe:""}`,
                  "Données opérationnelles consolidées",
                  "Graphiques et tableaux de synthèse",
                  "Signature et cachet opérateur",
                  "Numéro de rapport + date de génération",
                ].map((l,i)=>(
                  <div key={i} style={{display:"flex",gap:6,color:C.tx2,marginBottom:3}}>
                    <span style={{color:rpt.col}}>▸</span>{l}
                  </div>
                ))}
              </div>

              <button style={{width:"100%",padding:"9px",borderRadius:9,fontSize:12,fontWeight:800,
                cursor:"pointer",fontFamily:"inherit",background:rpt.col,border:"none",color:"#fff"}}>
                ⚡ Générer le rapport
              </button>
              <div style={{fontSize:9,color:C.tx3,textAlign:"center",marginTop:5}}>
                Archivé automatiquement dans APPLITAG Documents
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── RÉSEAU & OFFRES ──────────────────────────────────────────────

const OFFRES_DATA = [
  {id:"o001",type:"bois_dispo",auteur:"SARL Forestry Allier",secteur:"Allier (03)",
   titre:"Lot de 180 m³ chêne/hêtre — disponible immédiatement",
   desc:"Lot bord de route, humidité ~28%, non broyé. Accès PL possible. Parcelle Tronçais.",
   volume:180,unite:"m³",qualite:"BO/BE",essence:"Chêne/Hêtre",
   humidite:28,prix:68,unite_prix:"€/m³",
   commune:"Tronçais (03360)",date:"2026-07-18",contact:"L. Bonnet",tel:"06 XX XX XX XX",
   tags:["bord route","accès PL","non broyé"],statut:"actif",vues:12},
  {id:"o002",type:"besoin_bois",auteur:"Chaufferie Vichy Agglo",secteur:"Allier (03)",
   titre:"Recherche 400 t plaquettes G30-G50 livraison août 2026",
   desc:"Chaufferie 6,8 MW cherche fournisseur régulier. H ≤ 30%, granulométrie G30-G50. Contrat annuel envisageable.",
   volume:400,unite:"t",qualite:"BE",essence:"Feuillus mélangés",
   humidite:30,prix:85,unite_prix:"€/t",
   commune:"Vichy (03200)",date:"2026-07-15",contact:"M. Perrier",tel:"04 70 XX XX XX",
   tags:["contrat annuel","G30-G50","feuillus"],statut:"actif",vues:28},
  {id:"o003",type:"prestation",auteur:"Entreprise Bocage 03",secteur:"Allier (03)",
   titre:"Broyage de haies et lisières — disponibilité août",
   desc:"Broyeur Berti BL 280, rayon 40 km autour de Moulins. Devis sur demande. Disponible mi-août.",
   volume:null,unite:null,qualite:null,essence:null,
   humidite:null,prix:null,unite_prix:null,
   commune:"Moulins (03000)",date:"2026-07-12",contact:"P. Aubert",tel:"06 YY YY YY YY",
   tags:["broyage","haies","lisières","rayon 40km"],statut:"actif",vues:7},
  {id:"o004",type:"transport",auteur:"Transports Leclercq",secteur:"Allier / Creuse",
   titre:"Capacité de transport disponible — semaines 31-32",
   desc:"PL Renault T520, semi-remorque fond mouvant 90 m³. Disponible 2 rotations/jour semaines 31-32.",
   volume:90,unite:"m³/rotation",qualite:null,essence:null,
   humidite:null,prix:3.2,unite_prix:"€/km",
   commune:"Moulins (03000)",date:"2026-07-19",contact:"M. Leclercq",tel:"06 ZZ ZZ ZZ ZZ",
   tags:["fond mouvant","PL","semaines 31-32"],statut:"actif",vues:5},
  {id:"o005",type:"stockage",auteur:"Plateforme Agrofor 03",secteur:"Allier (03)",
   titre:"Mise à disposition 2 000 m² plateforme bois — court terme",
   desc:"Plateforme bétonnée, aire de retournement PL, pont-bascule 60 t sur site. Location mensuelle.",
   volume:2000,unite:"m²",qualite:null,essence:null,
   humidite:null,prix:1200,unite_prix:"€/mois",
   commune:"Vichy (03200)",date:"2026-07-10",contact:"Direction",tel:"04 70 AA AA AA",
   tags:["plateforme","pont-bascule","court terme"],statut:"actif",vues:19},
  {id:"o006",type:"bois_dispo",auteur:"GFA Ternant",secteur:"Nièvre (58)",
   titre:"Éclaircie Douglas — 195 m³ sur pied, adjudication libre",
   desc:"Peuplement Douglas 35 ans, éclaircie mécanique. Prix plancher 45 €/m³. Visite sur RDV.",
   volume:195,unite:"m³",qualite:"BO/BI",essence:"Douglas",
   humidite:null,prix:45,unite_prix:"€/m³",
   commune:"Ternant (58)",date:"2026-07-11",contact:"GFA Ternant",tel:"—",
   tags:["sur pied","adjudication","Douglas"],statut:"actif",vues:9},
];

const TYPE_OFFRE = {
  bois_dispo: {label:"Bois disponible", icon:"🪵", col:"#1E5B3A", bg:"#D1FAE5"},
  besoin_bois:{label:"Recherche bois",  icon:"🔍", col:"#0369A1", bg:"#DBEAFE"},
  prestation: {label:"Prestation",      icon:"🔧", col:"#7C3AED", bg:"#EDE9FE"},
  transport:  {label:"Transport",       icon:"🚛", col:"#B45309", bg:"#FEF3C7"},
  stockage:   {label:"Stockage",        icon:"🏗️", col:"#065F46", bg:"#CCFBF1"},
};

const CONNECT_ETAPES = ["reçu","à qualifier","qualifié","orienté","publié","archivé"] as const;
const CONNECT_ETAPE_STYLE = {
  "reçu":       {col:"#6B7280",bg:"#F3F4F6",icon:"📥"},
  "à qualifier":{col:"#92400E",bg:"#FEF3C7",icon:"🔍"},
  "qualifié":   {col:"#0369A1",bg:"#DBEAFE",icon:"✔️"},
  "orienté":    {col:"#7C3AED",bg:"#EDE9FE",icon:"🎯"},
  "publié":     {col:"#065F46",bg:"#D1FAE5",icon:"📢"},
  "archivé":    {col:"#374151",bg:"#E5E7EB",icon:"📦"},
};

export const SectionReseau = () => {
  const [onglet, setOnglet]         = useState<"annonces"|"connect"|"mise_en_relation">("annonces");
  const [typeFiltre, setTypeFiltre] = useState("tous");
  const [selected, setSelected]    = useState(null);
  const [modeNouvelle, setModeNouvelle] = useState(false);
  const [newType, setNewType]       = useState("bois_dispo");
  const [newTitre, setNewTitre]     = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [newCommune, setNewCommune] = useState("");
  const [published, setPublished]   = useState(false);
  const [connectStatuts, setConnectStatuts] = useState<Record<string,string>>({
    o001:"orienté", o002:"publié", o003:"à qualifier", o004:"reçu", o005:"archivé", o006:"qualifié",
  });

  const offres = typeFiltre==="tous" ? OFFRES_DATA
    : OFFRES_DATA.filter(o=>o.type===typeFiltre);
  const off = selected ? OFFRES_DATA.find(o=>o.id===selected) : null;

  const publish = () => {
    if(!newTitre||!newDesc) return;
    setPublished(true);
    setTimeout(()=>{ setPublished(false); setModeNouvelle(false);
      setNewTitre(""); setNewDesc(""); setNewCommune(""); }, 2500);
  };

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🤝 Réseau & Offres</div>
        <div style={{fontSize:13,color:C.tx2}}>Annonces de la filière — bois disponible, recherches, prestations, transport, stockage</div>
      </div>

      {/* Onglets principaux */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
        {([["annonces","📋 Annonces"],["connect","🔗 Connect"],["mise_en_relation","🎯 Mise en relation"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>{setOnglet(v);setSelected(null);setModeNouvelle(false);}}
            style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Vue Annonces ── */}
      {onglet==="annonces"&&<>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {Object.entries(TYPE_OFFRE).map(([k,t])=>{
          const n = OFFRES_DATA.filter(o=>o.type===k).length;
          return (
            <div key={k} style={{background:t.bg,borderRadius:10,padding:"10px 12px",cursor:"pointer",
              border:`2px solid ${typeFiltre===k?t.col:"transparent"}`,textAlign:"center"}}
              onClick={()=>setTypeFiltre(typeFiltre===k?"tous":k)}>
              <div style={{fontSize:18}}>{t.icon}</div>
              <div style={{fontSize:15,fontWeight:900,color:t.col}}>{n}</div>
              <div style={{fontSize:9,color:t.col,lineHeight:1.3}}>{t.label}</div>
            </div>
          );
        })}
      </div>

      {/* Barre actions */}
      <div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center"}}>
        <button onClick={()=>setTypeFiltre("tous")}
          style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
            fontFamily:"inherit",border:`1px solid ${typeFiltre==="tous"?"#1E5B3A":C.bd}`,
            background:typeFiltre==="tous"?"#1E5B3A":"transparent",
            color:typeFiltre==="tous"?"#fff":C.tx2}}>
          Toutes les annonces ({OFFRES_DATA.length})
        </button>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>{setModeNouvelle(!modeNouvelle);setSelected(null);}}
            style={{padding:"6px 16px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",background:modeNouvelle?"#7C3AED":"#1E5B3A",
              border:"none",color:"#fff"}}>
            {modeNouvelle?"✕ Annuler":"+ Déposer une annonce"}
          </button>
        </div>
      </div>

      {/* Formulaire nouvelle annonce */}
      {modeNouvelle&&(
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #7C3AED",
          padding:18,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:800,color:"#5B21B6",marginBottom:12}}>
            📢 Déposer une nouvelle annonce
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Type d'annonce</div>
              <select value={newType} onChange={e=>setNewType(e.target.value)}
                style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${C.bd}`,
                  fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx}}>
                {Object.entries(TYPE_OFFRE).map(([k,t])=>
                  <option key={k} value={k}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Commune / Secteur</div>
              <input value={newCommune} onChange={e=>setNewCommune(e.target.value)}
                placeholder="Ex : Moulins (03000)"
                style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${C.bd}`,
                  fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none"}}/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Titre de l'annonce</div>
            <input value={newTitre} onChange={e=>setNewTitre(e.target.value)}
              placeholder="Ex : Lot 150 m³ chêne disponible…"
              style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${C.bd}`,
                fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:C.tx2,marginBottom:4}}>Description</div>
            <textarea value={newDesc} onChange={e=>setNewDesc(e.target.value)} rows={3}
              placeholder="Détails : volume, qualité, humidité, prix, conditions, contact…"
              style={{width:"100%",padding:"7px 9px",borderRadius:7,border:`1px solid ${C.bd}`,
                fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,
                outline:"none",resize:"vertical"}}/>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={publish}
              style={{padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:800,cursor:"pointer",
                fontFamily:"inherit",background:"#7C3AED",border:"none",color:"#fff",
                opacity:(!newTitre||!newDesc)?0.5:1}}>
              📢 Publier l'annonce
            </button>
            {published&&<span style={{fontSize:12,color:"#059669",fontWeight:700}}>
              ✅ Annonce publiée — visible par le réseau
            </span>}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:off?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
        {/* Liste */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {offres.map(o=>{
            const t = TYPE_OFFRE[o.type]||TYPE_OFFRE.bois_dispo;
            const isSelected = selected===o.id;
            return (
              <div key={o.id} onClick={()=>setSelected(isSelected?null:o.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?t.col:C.bd}`,
                  boxShadow:isSelected?`0 0 0 3px ${t.col}22`:"none"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{fontSize:24,flexShrink:0}}>{t.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{o.titre}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:t.bg,color:t.col}}>{t.label}</span>
                    </div>
                    <div style={{fontSize:11,color:C.tx2,lineHeight:1.4,marginBottom:5}}>{o.desc}</div>
                    <div style={{display:"flex",gap:8,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>📍 {o.commune}</span>
                      <span>🏢 {o.auteur}</span>
                      <span>📅 {new Date(o.date).toLocaleDateString("fr-FR")}</span>
                      <span>👁️ {o.vues} vues</span>
                      {o.volume&&<span>📦 {o.volume} {o.unite}</span>}
                      {o.prix&&<span>💶 {o.prix} {o.unite_prix}</span>}
                    </div>
                    <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
                      {o.tags.map(tag=>(
                        <span key={tag} style={{fontSize:9,padding:"2px 6px",borderRadius:4,
                          background:"#F3F4F6",color:"#6B7280",fontWeight:600}}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fiche détail */}
        {off&&(()=>{
          const t = TYPE_OFFRE[off.type]||TYPE_OFFRE.bois_dispo;
          return (
            <div style={{background:"#fff",borderRadius:14,border:`2px solid ${t.col}`,
              padding:16,position:"sticky",top:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:24}}>{t.icon}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:t.bg,color:t.col}}>{t.label}</span>
                </div>
                <button onClick={()=>setSelected(null)}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
              </div>

              <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:6,lineHeight:1.3}}>
                {off.titre}
              </div>
              <div style={{fontSize:11,color:C.tx2,lineHeight:1.5,marginBottom:12}}>{off.desc}</div>

              <div style={{display:"flex",flexDirection:"column",gap:5,fontSize:11,marginBottom:12}}>
                {[
                  ["Publiée par",off.auteur],
                  ["Secteur",off.commune],
                  ["Date",new Date(off.date).toLocaleDateString("fr-FR")],
                  ...(off.volume?[["Volume",off.volume+" "+off.unite]]:[]),
                  ...(off.qualite?[["Qualité bois",off.qualite]]:[]),
                  ...(off.essence?[["Essence",off.essence]]:[]),
                  ...(off.humidite?[["Humidité",off.humidite+"%"]]:[]),
                  ...(off.prix?[["Prix",off.prix+" "+off.unite_prix]]:[]),
                  ["Contact",off.contact],
                  ["Téléphone",off.tel],
                  ["Vues",off.vues],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:4}}>
                    <span style={{color:C.tx3,minWidth:110,flexShrink:0}}>{k}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{marginBottom:10,display:"flex",gap:4,flexWrap:"wrap"}}>
                {off.tags.map(tag=>(
                  <span key={tag} style={{fontSize:9,padding:"2px 7px",borderRadius:4,
                    background:"#F3F4F6",color:"#6B7280",fontWeight:600}}>#{tag}</span>
                ))}
              </div>

              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:t.col,border:"none",color:"#fff"}}>
                  ✉️ Contacter
                </button>
                <button style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"transparent",
                  border:`1px solid ${C.bd}`,color:C.tx2}}>
                  🔖 Sauvegarder
                </button>
              </div>
              <div style={{marginTop:8,fontSize:9,color:C.tx3,textAlign:"center"}}>
                Les mises en relation restent entre professionnels — APPLITAG n'est pas partie au contrat
              </div>
            </div>
          );
        })()}
      </div>
      </>}

      {/* ── Vue Connect — pipeline qualification 5 étapes ── */}
      {onglet==="connect"&&(()=>{
        const etapeIdx = (id:string) => CONNECT_ETAPES.indexOf(connectStatuts[id] as typeof CONNECT_ETAPES[number]);
        return (
          <div>
            <div style={{fontSize:13,color:C.tx2,marginBottom:14}}>
              Faites avancer chaque offre dans le pipeline de qualification APPLITAG Connect.
            </div>
            {/* Pipeline header */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:16}}>
              {CONNECT_ETAPES.map(e=>{
                const s = CONNECT_ETAPE_STYLE[e];
                const n = Object.values(connectStatuts).filter(v=>v===e).length;
                return (
                  <div key={e} style={{background:s.bg,borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
                    <div style={{fontSize:18}}>{s.icon}</div>
                    <div style={{fontSize:11,fontWeight:800,color:s.col,textTransform:"capitalize"}}>{e}</div>
                    <div style={{fontSize:18,fontWeight:900,color:s.col}}>{n}</div>
                  </div>
                );
              })}
            </div>
            {/* Offres avec avancement */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {OFFRES_DATA.map(o=>{
                const t = TYPE_OFFRE[o.type]||TYPE_OFFRE.bois_dispo;
                const statut = connectStatuts[o.id]||"reçu";
                const s = CONNECT_ETAPE_STYLE[statut as keyof typeof CONNECT_ETAPE_STYLE]||CONNECT_ETAPE_STYLE["reçu"];
                const idx = etapeIdx(o.id);
                const canPrev = idx > 0;
                const canNext = idx < CONNECT_ETAPES.length - 1;
                return (
                  <div key={o.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",
                    border:`2px solid ${s.col}33`,display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{fontSize:22,flexShrink:0}}>{t.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{o.titre}</span>
                        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                          background:t.bg,color:t.col}}>{t.label}</span>
                        <span style={{fontSize:9,color:C.tx3}}>📍 {o.commune} · {o.auteur}</span>
                      </div>
                      {/* Stepper */}
                      <div style={{display:"flex",gap:0,alignItems:"center",marginTop:4}}>
                        {CONNECT_ETAPES.map((e,i)=>{
                          const done = i <= idx;
                          const active = i === idx;
                          const es = CONNECT_ETAPE_STYLE[e];
                          return (
                            <div key={e} style={{display:"flex",alignItems:"center",flex:1}}>
                              <div style={{
                                width:28,height:28,borderRadius:"50%",flexShrink:0,
                                display:"flex",alignItems:"center",justifyContent:"center",
                                fontSize:13,
                                background:done?s.col:"#E5E7EB",
                                color:done?"#fff":"#9CA3AF",
                                border:active?`2px solid ${s.col}`:"2px solid transparent",
                                fontWeight:active?900:500,
                              }}>
                                {done?es.icon:i+1}
                              </div>
                              {i<CONNECT_ETAPES.length-1&&(
                                <div style={{flex:1,height:3,background:i<idx?s.col:"#E5E7EB",
                                  borderRadius:2,margin:"0 2px"}}/>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{marginTop:6,fontSize:10,color:s.col,fontWeight:700}}>
                        {s.icon} Statut actuel : <span style={{textTransform:"capitalize"}}>{statut}</span>
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                      <button disabled={!canPrev}
                        onClick={()=>setConnectStatuts(prev=>({...prev,[o.id]:CONNECT_ETAPES[idx-1]}))}
                        style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:700,cursor:canPrev?"pointer":"default",
                          fontFamily:"inherit",background:canPrev?C.bg2:"#F3F4F6",
                          border:`1px solid ${C.bd}`,color:canPrev?C.tx:"#D1D5DB"}}>
                        ← Reculer
                      </button>
                      <button disabled={!canNext}
                        onClick={()=>setConnectStatuts(prev=>({...prev,[o.id]:CONNECT_ETAPES[idx+1]}))}
                        style={{padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:700,cursor:canNext?"pointer":"default",
                          fontFamily:"inherit",background:canNext?"#1E5B3A":"#F3F4F6",
                          border:"none",color:canNext?"#fff":"#D1D5DB"}}>
                        Avancer →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Vue Mise en relation — matchmaking besoin/disponible ── */}
      {onglet==="mise_en_relation"&&(()=>{
        const besoins = OFFRES_DATA.filter(o=>o.type==="besoin_bois");
        const dispos  = OFFRES_DATA.filter(o=>o.type==="bois_dispo");
        // Simple matching: same département (2 premiers chiffres du code postal ou même commune)
        const matchPairs = besoins.flatMap(b=>{
          const dpB = b.commune.match(/\d{5}/)?.[0]?.slice(0,2)||b.commune.slice(-2);
          const matches = dispos.filter(d=>{
            const dpD = d.commune.match(/\d{5}/)?.[0]?.slice(0,2)||d.commune.slice(-2);
            return dpB===dpD;
          });
          return matches.map(d=>({besoin:b,dispo:d}));
        });
        return (
          <div>
            <div style={{fontSize:13,color:C.tx2,marginBottom:14}}>
              Rapprochement automatique entre recherches de bois et disponibilités du même département.
            </div>
            {matchPairs.length===0?(
              <div style={{padding:32,textAlign:"center",color:C.tx3,fontSize:13}}>
                Aucune correspondance trouvée dans les annonces actuelles.
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {matchPairs.map(({besoin,dispo},i)=>{
                  const tb = TYPE_OFFRE.besoin_bois;
                  const td = TYPE_OFFRE.bois_dispo;
                  return (
                    <div key={i} style={{background:"#fff",borderRadius:14,border:"2px solid #7C3AED33",
                      padding:14}}>
                      <div style={{fontSize:10,fontWeight:800,color:"#7C3AED",marginBottom:10,
                        textTransform:"uppercase",letterSpacing:"0.05em"}}>
                        🎯 Correspondance potentielle — {besoin.commune.match(/\d{5}/)?.[0]?.slice(0,2)||"??"}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center"}}>
                        {/* Besoin */}
                        <div style={{background:tb.bg,borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,fontWeight:800,color:tb.col,marginBottom:4}}>
                            {tb.icon} {tb.label}
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:3}}>{besoin.titre}</div>
                          <div style={{fontSize:10,color:C.tx2}}>{besoin.auteur}</div>
                          <div style={{fontSize:10,color:C.tx3}}>📍 {besoin.commune}</div>
                          {besoin.volume&&<div style={{fontSize:10,fontWeight:700,color:tb.col,marginTop:4}}>
                            📦 {besoin.volume} {besoin.unite}
                          </div>}
                        </div>
                        {/* Flèche */}
                        <div style={{fontSize:24,color:"#7C3AED",fontWeight:900}}>⇄</div>
                        {/* Disponible */}
                        <div style={{background:td.bg,borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,fontWeight:800,color:td.col,marginBottom:4}}>
                            {td.icon} {td.label}
                          </div>
                          <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:3}}>{dispo.titre}</div>
                          <div style={{fontSize:10,color:C.tx2}}>{dispo.auteur}</div>
                          <div style={{fontSize:10,color:C.tx3}}>📍 {dispo.commune}</div>
                          {dispo.volume&&<div style={{fontSize:10,fontWeight:700,color:td.col,marginTop:4}}>
                            📦 {dispo.volume} {dispo.unite}
                          </div>}
                          {dispo.prix&&<div style={{fontSize:10,color:C.tx2}}>💶 {dispo.prix} {dispo.unite_prix}</div>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:10}}>
                        <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                          cursor:"pointer",fontFamily:"inherit",background:"#7C3AED",border:"none",color:"#fff"}}>
                          🤝 Initier la mise en relation
                        </button>
                        <button style={{padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:600,
                          cursor:"pointer",fontFamily:"inherit",background:"transparent",
                          border:`1px solid ${C.bd}`,color:C.tx2}}>
                          Ignorer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
};

// ── PLAN D'APPROVISIONNEMENT AUDITABLE ──────────────────────────

const PLAN_DATA = [
  {id:"PA-2026-001",nom:"Plan Allier Nord 2026",
   periodeDebut:"2026-01-01",periodeFin:"2026-12-31",
   operateur:"ALTEGAD SAS",chaufferie:"Chaufferie Moulins",
   objectifT:1200,realiseT:847,
   lots:["LOT-2026-044","LOT-2026-041","LOT-2026-038"],
   statut:"en_cours",conformiteRED:"conforme",
   certif:"SBP",sourceForet:"Forêt de Tronçais + Bocage Nord Allier",
   ghgEconomie:87.4,note:"Plan principal chaufferie urbaine Moulins — suivi mensuel",
   // Entonnoir V2
   ressourceTheoriqueT:2100, ressourceAccessibleT:1580,
   ressourceConcurrentsT:380, ressourceSecuriseeT:920, niveauRisqueVolumeT:73,
   // RED
   installationAvant2023:true, regimeRED:"RED_II_GRAND_PERE",
   certificationActuelle:"SBP", dateExpirationCertif:"2027-03-31",
   declarationStatut:"SOUMISE", dateDeclarationAnnuelle:"2026-04-30"},
  {id:"PA-2026-002",nom:"Plan Creuse Pilote",
   periodeDebut:"2026-04-01",periodeFin:"2026-09-30",
   operateur:"ForêtPro Bourbonnais",chaufferie:"Chaufferie Guéret",
   objectifT:400,realiseT:400,
   lots:["LOT-2026-033","LOT-2026-034"],
   statut:"terminé",conformiteRED:"conforme",
   certif:"SURE",sourceForet:"Massif de Châtelus",
   ghgEconomie:91.2,note:"Plan pilote finalisé — rapport RED envoyé",
   ressourceTheoriqueT:650, ressourceAccessibleT:520,
   ressourceConcurrentsT:80, ressourceSecuriseeT:430, niveauRisqueVolumeT:10,
   installationAvant2023:false, regimeRED:"RED_III",
   certificationActuelle:"SURE", dateExpirationCertif:"2027-09-30",
   declarationStatut:"SOUMISE", dateDeclarationAnnuelle:"2026-04-15"},
  {id:"PA-2026-003",nom:"Plan Ternant Douglas",
   periodeDebut:"2026-06-01",periodeFin:"2026-12-31",
   operateur:"SARL Forestry Allier",chaufferie:"Chaufferie Nevers",
   objectifT:600,realiseT:195,
   lots:["LOT-2026-042"],
   statut:"en_cours",conformiteRED:"en_cours",
   certif:"SBP",sourceForet:"Parcelle Ternant GFA",
   ghgEconomie:88.9,note:"Éclaircie Douglas en cours — pesée finale juillet",
   ressourceTheoriqueT:850, ressourceAccessibleT:710,
   ressourceConcurrentsT:130, ressourceSecuriseeT:480, niveauRisqueVolumeT:55,
   installationAvant2023:true, regimeRED:"RED_II_GRAND_PERE",
   certificationActuelle:"SBP", dateExpirationCertif:"2027-06-15",
   declarationStatut:"EN_COURS", dateDeclarationAnnuelle:null},
];

const STATUT_PLAN = {
  en_cours: {label:"En cours",  icon:"🔄",col:"#1E40AF",bg:"#DBEAFE"},
  terminé:  {label:"Terminé",   icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  brouillon:{label:"Brouillon", icon:"✏️",col:"#92400E",bg:"#FEF3C7"},
  suspendu: {label:"Suspendu",  icon:"⏸",col:"#6B7280",bg:"#F3F4F6"},
};

const CONF_STYLE: Record<string,{col:string,bg:string,label:string}> = {
  conforme:  {col:"#065F46",bg:"#D1FAE5",label:"✅ Conforme RED"},
  en_cours:  {col:"#1E40AF",bg:"#DBEAFE",label:"🔄 Vérification en cours"},
  non_conf:  {col:"#991B1B",bg:"#FEE2E2",label:"❌ Non conforme"},
};

const REGIME_RED_STYLE: Record<string,{col:string,bg:string,label:string}> = {
  RED_II_GRAND_PERE: {col:"#92400E",bg:"#FEF3C7",label:"🏛️ RED II — clause grand-père"},
  RED_III:           {col:"#1E40AF",bg:"#DBEAFE",label:"🇪🇺 RED III"},
  NON_CONCERNE:      {col:"#6B7280",bg:"#F3F4F6",label:"➖ Non concerné"},
};

const DECL_STYLE: Record<string,{col:string,bg:string,label:string}> = {
  SOUMISE:      {col:"#065F46",bg:"#D1FAE5",label:"✅ Déclaration soumise"},
  EN_COURS:     {col:"#B45309",bg:"#FEF3C7",label:"📝 En cours"},
  NON_REQUISE:  {col:"#6B7280",bg:"#F3F4F6",label:"➖ Non requise"},
};

const normaliserPlan = (p: any) => ({
  ...p,
  nom:          p.nom ?? `Plan ${p.annee}`,
  objectifT:    p.tonnageCibleT ?? p.objectifT ?? 0,
  realiseT:     p.realiseT ?? 0,
  lots:         p.lots ?? [],
  statut:       p.statut === "actif" ? "en_cours" : p.statut === "archive" ? "terminé" : (p.statut ?? "brouillon"),
  conformiteRED: p.conformiteRED ?? "en_cours",
  certif:       p.certif ?? p.certificationActuelle ?? "—",
  sourceForet:  p.sourceForet ?? "—",
  ghgEconomie:  p.ghgEconomie ?? 0,
  note:         p.note ?? "",
  operateur:    p.operateur ?? "",
  chaufferie:   p.chaufferie ?? "",
  periodeDebut: p.periodeDebut ?? `${p.annee}-01-01`,
  periodeFin:   p.periodeFin ?? `${p.annee}-12-31`,
  ressourceTheoriqueT:   p.ressourceTheoriqueT ?? null,
  ressourceAccessibleT:  p.ressourceAccessibleT ?? null,
  ressourceConcurrentsT: p.ressourceConcurrentsT ?? null,
  ressourceSecuriseeT:   p.ressourceSecuriseeT ?? null,
  niveauRisqueVolumeT:   p.niveauRisqueVolumeT ?? null,
  regimeRED:             p.regimeRED ?? "NON_CONCERNE",
  declarationStatut:     p.declarationStatut ?? "NON_REQUISE",
});

export const SectionPlanApprovisionnement = () => {
  const [plans, setPlans] = useState(PLAN_DATA);
  const [selected, setSelected] = useState<string|null>(null);
  const [onglet, setOnglet] = useState<"liste"|"entonnoir"|"red_iii"|"synthese">("liste");
  const [planEntonnoir, setPlanEntonnoir] = useState(PLAN_DATA[0].id); // resetté par useEffect après fetch
  const [conformite, setConformite] = useState<any>(null);
  const [loadingConf, setLoadingConf] = useState(false);
  const [showForm, setShowForm] = useState<"create"|"edit"|null>(null);
  const [formData, setFormData] = useState<any>({});
  const [savingForm, setSavingForm] = useState(false);

  useEffect(() => {
    (apiGet("/plans-approvisionnement") as Promise<any[]>)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(normaliserPlan);
          setPlans(normalized);
          setPlanEntonnoir(normalized[0].id);
        }
      })
      .catch(() => { /* PLAN_DATA reste en fallback */ });
  }, []);

  useEffect(() => {
    if (!selected) { setConformite(null); return; }
    setConformite(null);
    setLoadingConf(true);
    (apiGet(`/plans-approvisionnement/${selected}/conformite`) as Promise<any>)
      .then(setConformite)
      .catch(() => setConformite(null))
      .finally(() => setLoadingConf(false));
  }, [selected]);

  const plan = selected ? plans.find(p=>p.id===selected) : null;
  const pe   = plans.find(p=>p.id===planEntonnoir) ?? plans[0];

  const totalObj  = plans.reduce((s,p)=>s+p.objectifT,0);
  const totalReal = plans.reduce((s,p)=>s+p.realiseT,0);
  const tauxGlobal = totalObj > 0 ? Math.round(totalReal/totalObj*100) : 0;

  // Entonnoir : calcule le volume contractualisé (= réalisé pour la démo)
  const contractualiseeT = pe.realiseT;
  const entonnoir = [
    {label:"Ressource théorique",   val:pe.ressourceTheoriqueT,   color:"#1E40AF",bg:"#DBEAFE",
     note:"Inventaire CRPF / CBQ / estimation terrain"},
    {label:"Ressource accessible",  val:pe.ressourceAccessibleT,  color:"#0369A1",bg:"#E0F2FE",
     note:"Propriétaires contactables, accès camion confirmé"},
    {label:"Contractualisée",       val:contractualiseeT,         color:"#065F46",bg:"#D1FAE5",
     note:"Contrats signés — volume engagé"},
    {label:"− Concurrents",         val:-(pe.ressourceConcurrentsT??0), color:"#991B1B",bg:"#FEE2E2",
     note:"Volume capté par ETF concurrents / achats directs"},
    {label:"Sécurisée nette",       val:pe.ressourceSecuriseeT,   color:"#047857",bg:"#ECFDF5",
     note:"Volume sécurisé après déduction concurrence + risques"},
    {label:"⚠ Risque volumique",   val:-(pe.niveauRisqueVolumeT??0), color:"#B45309",bg:"#FEF3C7",
     note:"Risque de non-livraison (aléas climatiques, sanitaires…)"},
  ];
  const maxAbs = Math.max(...entonnoir.map(e=>Math.abs(e.val??0)));

  const reloadPlans = () => {
    (apiGet("/plans-approvisionnement") as Promise<any[]>)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setPlans(data.map(normaliserPlan));
      })
      .catch(()=>{});
  };

  const openCreate = () => {
    setFormData({ annee: new Date().getFullYear(), nom:"", tonnageCibleT:"", rayonMaxKm:"",
      humiditeMaxPct:"", regimeRED:"NON_CONCERNE", declarationStatut:"NON_REQUISE",
      certificationActuelle:"AUCUNE", installationAvant2023:false });
    setSelected(null);
    setShowForm("create");
  };

  const openEdit = () => {
    if (!plan) return;
    setFormData({ annee: plan.annee ?? new Date().getFullYear(), nom: plan.nom ?? "",
      tonnageCibleT: plan.objectifT ?? "", rayonMaxKm: plan.rayonMaxKm ?? "",
      humiditeMaxPct: plan.humiditeMaxPct ?? "",
      ressourceTheoriqueT: plan.ressourceTheoriqueT ?? "",
      ressourceAccessibleT: plan.ressourceAccessibleT ?? "",
      ressourceConcurrentsT: plan.ressourceConcurrentsT ?? "",
      ressourceSecuriseeT: plan.ressourceSecuriseeT ?? "",
      niveauRisqueVolumeT: plan.niveauRisqueVolumeT ?? "",
      regimeRED: plan.regimeRED ?? "NON_CONCERNE",
      declarationStatut: plan.declarationStatut ?? "NON_REQUISE",
      certificationActuelle: plan.certif ?? "AUCUNE",
      installationAvant2023: plan.installationAvant2023 ?? false,
      dateExpirationCertif: plan.dateExpirationCertif ?? "",
      dateDeclarationAnnuelle: plan.dateDeclarationAnnuelle ?? "" });
    setShowForm("edit");
  };

  const submitForm = async () => {
    setSavingForm(true);
    try {
      const num = (k: string) => formData[k] !== "" ? parseFloat(formData[k]) : undefined;
      if (showForm === "create") {
        await apiPost("/plans-approvisionnement", {
          annee: parseInt(formData.annee) || new Date().getFullYear(),
          nom: formData.nom || undefined,
          tonnageCibleT: parseFloat(formData.tonnageCibleT) || 0,
          rayonMaxKm: num("rayonMaxKm"),
          humiditeMaxPct: num("humiditeMaxPct"),
        });
      } else if (showForm === "edit" && selected) {
        await apiPatch(`/plans-approvisionnement/${selected}`, {
          nom: formData.nom || undefined,
          tonnageCibleT: num("tonnageCibleT"),
          rayonMaxKm: num("rayonMaxKm"),
          humiditeMaxPct: num("humiditeMaxPct"),
          ressourceTheoriqueT: num("ressourceTheoriqueT"),
          ressourceAccessibleT: num("ressourceAccessibleT"),
          ressourceConcurrentsT: num("ressourceConcurrentsT"),
          ressourceSecuriseeT: num("ressourceSecuriseeT"),
          niveauRisqueVolumeT: num("niveauRisqueVolumeT"),
          regimeRED: formData.regimeRED || undefined,
          certificationActuelle: formData.certificationActuelle || undefined,
          declarationStatut: formData.declarationStatut || undefined,
          installationAvant2023: formData.installationAvant2023,
          dateExpirationCertif: formData.dateExpirationCertif || undefined,
          dateDeclarationAnnuelle: formData.dateDeclarationAnnuelle || undefined,
        });
      }
      setShowForm(null);
      reloadPlans();
    } finally { setSavingForm(false); }
  };

  const Fd = (k: string, v?: any) => setFormData((f: any) => ({...f, [k]: v ?? f[k]}));

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.tx}}>📐 Plan d'approvisionnement V2</div>
          <div style={{fontSize:13,color:C.tx2}}>Entonnoir ressource · Conformité RED II/III · Traçabilité GES</div>
        </div>
        <button onClick={openCreate}
          style={{padding:"8px 16px",borderRadius:10,background:"#1E5B3A",color:"#fff",
            border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          ➕ Nouveau plan
        </button>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:`1px solid ${C.bd}`,paddingBottom:8,flexWrap:"wrap"}}>
        {([["liste","📋 Plans"],["entonnoir","📊 Entonnoir V2"],["red_iii","🇪🇺 RED II/III"],["synthese","🌿 GES"]] as const).map(([v,l])=>(
          <button key={v} onClick={()=>{setOnglet(v);setSelected(null);}}
            style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── ONGLET ENTONNOIR V2 ─────────────────────────────────────────────── */}
      {onglet==="entonnoir"&&(
        <div>
          {/* Sélecteur plan */}
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {plans.map(p=>(
              <button key={p.id} onClick={()=>setPlanEntonnoir(p.id)}
                style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",border:"none",fontFamily:"inherit",
                  background:planEntonnoir===p.id?"#1E5B3A":"#F3F4F6",
                  color:planEntonnoir===p.id?"#fff":C.tx2}}>
                {p.nom}
              </button>
            ))}
          </div>

          <div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:4}}>{pe.nom}</div>
          <div style={{fontSize:11,color:C.tx3,marginBottom:14}}>
            {pe.chaufferie} · Objectif {pe.objectifT.toLocaleString("fr-FR")} t
          </div>

          {/* Barres entonnoir */}
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
            {entonnoir.map((e,i)=>{
              const v = e.val ?? 0;
              const pct = maxAbs>0 ? Math.abs(v)/maxAbs*100 : 0;
              const isDeduction = v < 0;
              return (
                <div key={i}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:3}}>
                    <div style={{fontSize:11,fontWeight:600,color:e.color}}>{e.label}</div>
                    <div style={{fontSize:12,fontWeight:800,color:e.color,
                      fontVariantNumeric:"tabular-nums"}}>
                      {isDeduction?"-":""}{Math.abs(v).toLocaleString("fr-FR")} t
                    </div>
                  </div>
                  <div style={{height:28,background:"#F3F4F6",borderRadius:6,overflow:"hidden",
                    display:"flex",alignItems:"center"}}>
                    <div style={{height:"100%",width:`${pct}%`,
                      background:e.color,borderRadius:6,minWidth:pct>0?4:0,
                      display:"flex",alignItems:"center",justifyContent:"flex-end",
                      paddingRight:6,transition:"width .4s"}}>
                    </div>
                  </div>
                  <div style={{fontSize:9,color:C.tx3,marginTop:2}}>{e.note}</div>
                </div>
              );
            })}
          </div>

          {/* Synthèse entonnoir */}
          <div style={{background:"#F0FDF4",borderRadius:12,padding:14,
            border:"1px solid #BBF7D0"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#065F46",marginBottom:8}}>
              Synthèse entonnoir
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[
                {label:"Taux de contractualisation",
                 val:pe.ressourceAccessibleT
                   ? Math.round(contractualiseeT/pe.ressourceAccessibleT*100)+"%"
                   : "—",
                 color:"#065F46"},
                {label:"Pression concurrentielle",
                 val:pe.ressourceAccessibleT
                   ? Math.round((pe.ressourceConcurrentsT??0)/pe.ressourceAccessibleT*100)+"%"
                   : "—",
                 color:"#991B1B"},
                {label:"Couverture objectif (sécurisé)",
                 val:pe.ressourceSecuriseeT
                   ? Math.round(pe.ressourceSecuriseeT/pe.objectifT*100)+"%"
                   : "—",
                 color:"#047857"},
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:8,padding:"10px 12px",
                  textAlign:"center",border:"1px solid #D1FAE5"}}>
                  <div style={{fontSize:18,fontWeight:900,color:k.color}}>{k.val}</div>
                  <div style={{fontSize:9,color:C.tx3,lineHeight:1.3,marginTop:2}}>{k.label}</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:10,fontSize:10,color:"#6B7280",fontStyle:"italic"}}>
              Cet écart reflète les contraintes de desserte, propriété, qualité et concurrence locale — pas un manque de ressource.
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET RED II/III ─────────────────────────────────────────────────── */}
      {onglet==="red_iii"&&(
        <div>
          <div style={{background:"#FFF7ED",border:"1px solid #FDE68A",borderRadius:10,
            padding:"12px 16px",marginBottom:16,fontSize:12,color:"#92400E"}}>
            <strong>🏛️ Clause grand-père RED II / RED III</strong><br/>
            Les installations mises en service avant le <strong>20 novembre 2023</strong> et disposant
            d'une certification reconnue (SBP, SURE, PEFC, FSC…) peuvent rester sous le régime RED II
            jusqu'au <strong>31 décembre 2027</strong> — à condition que leur certification soit à jour
            et que la déclaration annuelle soit soumise avant le 30 avril de chaque année.
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {plans.map(p=>{
              const regime = REGIME_RED_STYLE[p.regimeRED]??REGIME_RED_STYLE.NON_CONCERNE;
              const decl   = DECL_STYLE[p.declarationStatut]??DECL_STYLE.NON_REQUISE;
              const certifExpire = p.dateExpirationCertif
                ? new Date(p.dateExpirationCertif) < new Date(Date.now()+90*86400000)
                : false;
              return (
                <div key={p.id} style={{background:"#fff",borderRadius:12,
                  border:`1.5px solid ${certifExpire?"#F59E0B":C.bd}`,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{p.nom}</div>
                      <div style={{fontSize:11,color:C.tx3}}>{p.chaufferie}</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,
                        background:regime.bg,color:regime.col}}>{regime.label}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:20,
                        background:decl.bg,color:decl.col}}>{decl.label}</span>
                    </div>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:6}}>
                    {[
                      ["🏛️","Installation avant 2023",
                        p.installationAvant2023?"Oui — éligible grand-père":"Non — régime RED III"],
                      ["🏅","Certification actuelle",
                        p.certificationActuelle??"—"],
                      ["📅","Expiration certification",
                        p.dateExpirationCertif
                          ?new Date(p.dateExpirationCertif).toLocaleDateString("fr-FR")
                          :"—"],
                    ].map(([ico,label,val])=>(
                      <div key={label} style={{background:"#F9FAFB",borderRadius:8,
                        padding:"8px 10px",border:"1px solid #E5E7EB"}}>
                        <div style={{fontSize:9,color:C.tx3,marginBottom:2}}>{ico} {label}</div>
                        <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {certifExpire&&(
                    <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",
                      borderRadius:8,padding:"6px 10px",fontSize:11,color:"#92400E",
                      display:"flex",alignItems:"center",gap:6}}>
                      ⚠️ Certification expire dans moins de 90 jours — renouvellement urgent
                    </div>
                  )}
                  {p.dateDeclarationAnnuelle&&(
                    <div style={{fontSize:10,color:C.tx3,marginTop:6}}>
                      📝 Déclaration annuelle : {new Date(p.dateDeclarationAnnuelle).toLocaleDateString("fr-FR")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{marginTop:14,background:"#F0FDF4",borderRadius:10,padding:"10px 14px",
            fontSize:11,color:"#065F46",border:"1px solid #BBF7D0"}}>
            📌 La date limite de déclaration annuelle RED II est le <strong>30 avril</strong>.
            La déclaration 2025 est encore ouverte en septembre 2026 — vérifier auprès du
            Ministère de la Transition Écologique.
          </div>
        </div>
      )}

      {onglet==="liste"&&<>
        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[
            {ico:"📐",label:"Plans actifs",val:plans.filter(p=>p.statut==="en_cours").length,col:"#1E40AF",bg:"#DBEAFE"},
            {ico:"⚖️",label:"Objectif total",val:totalObj.toLocaleString("fr-FR")+" t",col:"#1E5B3A",bg:"#D1FAE5"},
            {ico:"📦",label:"Réalisé total",val:totalReal.toLocaleString("fr-FR")+" t",col:"#B45309",bg:"#FEF3C7"},
            {ico:"🎯",label:"Taux global",val:tauxGlobal+" %",col:tauxGlobal>=80?"#065F46":"#B45309",bg:tauxGlobal>=80?"#D1FAE5":"#FEF3C7"},
          ].map(k=>(
            <div key={k.label} style={{background:k.bg,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:20}}>{k.ico}</div>
              <div style={{fontSize:16,fontWeight:900,color:k.col,fontVariantNumeric:"tabular-nums"}}>{k.val}</div>
              <div style={{fontSize:9,color:k.col,fontWeight:600}}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:plan?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
          {/* Liste plans */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {plans.map(p=>{
              const st = STATUT_PLAN[p.statut as keyof typeof STATUT_PLAN]||STATUT_PLAN.brouillon;
              const conf = CONF_STYLE[p.conformiteRED]||CONF_STYLE.en_cours;
              const taux = Math.round(p.realiseT/p.objectifT*100);
              const isSelected = selected===p.id;
              return (
                <div key={p.id} onClick={()=>setSelected(isSelected?null:p.id)}
                  style={{background:"#fff",borderRadius:12,padding:"14px 16px",cursor:"pointer",
                    border:`2px solid ${isSelected?"#1E5B3A":C.bd}`}}>
                  <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:800,color:C.tx}}>{p.nom}</span>
                        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                          background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                        <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                          background:conf.bg,color:conf.col}}>{conf.label}</span>
                      </div>
                      <div style={{fontSize:11,color:C.tx3}}>
                        {p.operateur} · {p.chaufferie} · Certif. {p.certif}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:18,fontWeight:900,color:taux>=80?"#065F46":"#B45309"}}>{taux}%</div>
                      <div style={{fontSize:9,color:C.tx3}}>{p.realiseT.toLocaleString("fr-FR")} / {p.objectifT.toLocaleString("fr-FR")} t</div>
                    </div>
                  </div>
                  {/* Barre de progression */}
                  <div style={{height:6,background:"#E5E7EB",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(taux,100)}%`,
                      background:taux>=80?"#1E5B3A":"#B45309",borderRadius:3,
                      transition:"width .3s"}}/>
                  </div>
                  <div style={{display:"flex",gap:12,marginTop:6,fontSize:10,color:C.tx3}}>
                    <span>📅 {new Date(p.periodeDebut).toLocaleDateString("fr-FR")} → {new Date(p.periodeFin).toLocaleDateString("fr-FR")}</span>
                    <span>🌲 {p.lots.length} lot(s)</span>
                    <span>🌿 GES −{p.ghgEconomie}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fiche détail */}
          {plan&&(()=>{
            const st = STATUT_PLAN[plan.statut as keyof typeof STATUT_PLAN]||STATUT_PLAN.brouillon;
            const conf = CONF_STYLE[plan.conformiteRED]||CONF_STYLE.en_cours;
            const taux = Math.round(plan.realiseT/plan.objectifT*100);
            return (
              <div style={{background:"#fff",borderRadius:14,border:"2px solid #1E5B3A",
                padding:16,position:"sticky",top:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.tx}}>{plan.nom}</span>
                  <button onClick={()=>setSelected(null)}
                    style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
                </div>

                {[
                  ["Identifiant",plan.id],
                  ["Opérateur",plan.operateur],
                  ["Chaufferie",plan.chaufferie],
                  ["Source forêt",plan.sourceForet],
                  ["Certification",plan.certif],
                  ["Période",`${new Date(plan.periodeDebut).toLocaleDateString("fr-FR")} → ${new Date(plan.periodeFin).toLocaleDateString("fr-FR")}`],
                  ["Objectif",plan.objectifT.toLocaleString("fr-FR")+" t"],
                  ["Réalisé",`${plan.realiseT.toLocaleString("fr-FR")} t (${taux}%)`],
                  ["Éco. GES","−"+plan.ghgEconomie+"% vs fossile"],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,
                    paddingBottom:5,marginBottom:5,fontSize:11}}>
                    <span style={{color:C.tx3,minWidth:110,flexShrink:0}}>{k}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                  </div>
                ))}

                <div style={{marginTop:8,marginBottom:8}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.tx3,marginBottom:6}}>LOTS ASSOCIÉS</div>
                  {plan.lots.map(lid=>(
                    <div key={lid} style={{background:"#F0FDF4",borderRadius:6,padding:"5px 9px",
                      marginBottom:4,fontSize:11,fontWeight:600,color:"#065F46"}}>
                      📦 {lid}
                    </div>
                  ))}
                </div>

                {conformite ? (
                  <div style={{background:"#F0FDF4",borderRadius:8,padding:"10px 12px",
                    marginBottom:8,border:"1.5px solid #BBF7D0"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#065F46"}}>📊 Score de conformité</span>
                      <span style={{fontSize:20,fontWeight:900,color:
                        conformite.statut==="CONFORME"?"#065F46":
                        conformite.statut==="SURVEILLANCE"?"#92400E":"#991B1B"}}>
                        {conformite.scoreGlobal} %
                      </span>
                    </div>
                    {conformite.indicateurs.map((ind: any) => {
                      const col = ind.statut==="CONFORME"?"#065F46":
                        ind.statut==="SURVEILLANCE"?"#B45309":
                        ind.statut==="SANS_CIBLE"?"#6B7280":"#991B1B";
                      const ico = ind.statut==="CONFORME"?"✅":
                        ind.statut==="SURVEILLANCE"?"⚠️":
                        ind.statut==="SANS_CIBLE"?"➖":"❌";
                      return (
                        <div key={ind.critere} style={{display:"flex",justifyContent:"space-between",
                          alignItems:"center",fontSize:10,borderBottom:`1px solid ${C.bd}`,
                          paddingBottom:4,marginBottom:4}}>
                          <span style={{color:C.tx3}}>{ico} {ind.critere}</span>
                          <span style={{fontWeight:700,color:col,fontVariantNumeric:"tabular-nums"}}>
                            {ind.realise!=null
                              ? `${ind.realise} ${ind.unite}${ind.ecartPct!=null&&ind.ecartPct>0?` (+${ind.ecartPct}%)`:""}`
                              : ind.statut==="SANS_CIBLE"?"—":"N/D"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : loadingConf ? (
                  <div style={{fontSize:10,color:C.tx3,padding:"8px 0",textAlign:"center"}}>
                    ⏳ Calcul conformité…
                  </div>
                ) : (
                  <div style={{background:conf.bg,borderRadius:8,padding:"8px 10px",
                    fontSize:11,fontWeight:700,color:conf.col,marginBottom:8}}>
                    {conf.label}
                  </div>
                )}

                {plan.note&&<div style={{fontSize:11,color:C.tx2,fontStyle:"italic",lineHeight:1.5,marginBottom:8}}>
                  📝 {plan.note}
                </div>}

                <div style={{display:"flex",gap:6,marginTop:12}}>
                  <button onClick={()=>{setConformite(null);setLoadingConf(true);
                    (apiGet(`/plans-approvisionnement/${plan.id}/conformite`) as Promise<any>)
                      .then(setConformite).catch(()=>setConformite(null)).finally(()=>setLoadingConf(false));}}
                    style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
                    🔄 Actualiser
                  </button>
                  <button onClick={openEdit}
                    style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",background:"transparent",
                      border:`1px solid ${C.bd}`,color:C.tx2}}>
                    ✏️ Modifier
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </>}

      {onglet==="synthese"&&(
        <div>
          <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,
            padding:"12px 16px",marginBottom:16,fontSize:12,color:"#065F46"}}>
            🇪🇺 <strong>Directive RED III (2023/2413/UE)</strong> — Seuil d'économie GES exigé : 80% vs fossile pour installations &gt;10 MW (depuis 2026).
            Toutes les livraisons doivent être traçées et certifiées VSS reconnu.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {[
              {label:"Conformes RED",val:plans.filter(p=>p.conformiteRED==="conforme").length,col:"#065F46",bg:"#D1FAE5"},
              {label:"En vérification",val:plans.filter(p=>p.conformiteRED==="en_cours").length,col:"#1E40AF",bg:"#DBEAFE"},
              {label:"GES moyen",val:plans.length>0?(plans.reduce((s,p)=>s+(p.ghgEconomie??0),0)/plans.length).toFixed(1)+"%":"—",col:"#7C3AED",bg:"#EDE9FE"},
            ].map(k=>(
              <div key={k.label} style={{background:k.bg,borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:k.col}}>{k.val}</div>
                <div style={{fontSize:10,color:k.col,fontWeight:600}}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {plans.map(p=>{
              const conf = CONF_STYLE[p.conformiteRED]||CONF_STYLE.en_cours;
              return (
                <div key={p.id} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,
                  padding:"10px 14px",display:"grid",
                  gridTemplateColumns:"1fr auto auto auto",gap:12,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{p.nom}</div>
                    <div style={{fontSize:10,color:C.tx3}}>{p.certif} · {p.sourceForet}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                    background:conf.bg,color:conf.col,whiteSpace:"nowrap"}}>{conf.label}</span>
                  <span style={{fontSize:12,fontWeight:800,color:"#7C3AED",whiteSpace:"nowrap"}}>
                    −{p.ghgEconomie}% GES
                  </span>
                  <span style={{fontSize:11,color:C.tx3,whiteSpace:"nowrap"}}>
                    {p.realiseT.toLocaleString("fr-FR")} t / {p.objectifT.toLocaleString("fr-FR")} t
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Formulaire création / édition ──────────────────────────────── */}
      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",
          zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,width:"100%",
            maxWidth:520,maxHeight:"90vh",overflowY:"auto",
            boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontSize:15,fontWeight:800,color:C.tx}}>
                {showForm==="create"?"➕ Nouveau plan":"✏️ Modifier le plan"}
              </div>
              <button onClick={()=>setShowForm(null)}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,color:C.tx3}}>✕</button>
            </div>

            {/* Champs de base */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Année *</div>
                <input type="number" value={formData.annee||""} min={2020} max={2100}
                  onChange={e=>Fd("annee",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Objectif (t) *</div>
                <input type="number" value={formData.tonnageCibleT||""} min={0}
                  onChange={e=>Fd("tonnageCibleT",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Nom du plan</div>
              <input value={formData.nom||""} onChange={e=>Fd("nom",e.target.value)}
                placeholder="ex : Plan Allier Nord 2027"
                style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                  border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Rayon max (km)</div>
                <input type="number" value={formData.rayonMaxKm||""} min={0}
                  onChange={e=>Fd("rayonMaxKm",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Humidité max (%)</div>
                <input type="number" value={formData.humiditeMaxPct||""} min={0} max={100}
                  onChange={e=>Fd("humiditeMaxPct",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* Entonnoir V2 — uniquement en édition */}
            {showForm==="edit"&&(<>
              <div style={{fontSize:11,fontWeight:700,color:"#1E40AF",marginBottom:8,marginTop:4}}>
                📊 Entonnoir V2
              </div>
              {[
                ["ressourceTheoriqueT","Ressource théorique (t)"],
                ["ressourceAccessibleT","Ressource accessible (t)"],
                ["ressourceConcurrentsT","Concurrents (t)"],
                ["ressourceSecuriseeT","Sécurisée nette (t)"],
                ["niveauRisqueVolumeT","Risque volumique (t)"],
              ].map(([k,l])=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{fontSize:11,color:C.tx3,marginBottom:3,fontWeight:600}}>{l}</div>
                  <input type="number" value={formData[k]||""} min={0}
                    onChange={e=>Fd(k,e.target.value)}
                    style={{width:"100%",height:36,padding:"0 10px",borderRadius:8,
                      border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13,boxSizing:"border-box"}}/>
                </div>
              ))}

              <div style={{fontSize:11,fontWeight:700,color:"#1E40AF",marginBottom:8,marginTop:8}}>
                🇪🇺 Conformité RED
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Régime RED</div>
                <select value={formData.regimeRED||"NON_CONCERNE"}
                  onChange={e=>Fd("regimeRED",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13}}>
                  <option value="RED_II_GRAND_PERE">🏛️ RED II — clause grand-père</option>
                  <option value="RED_III">🇪🇺 RED III</option>
                  <option value="NON_CONCERNE">➖ Non concerné</option>
                </select>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Certification</div>
                <select value={formData.certificationActuelle||"AUCUNE"}
                  onChange={e=>Fd("certificationActuelle",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13}}>
                  {["PEFC","FSC","SBP","SURE","ISCC_PLUS","AUCUNE"].map(v=>(
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,color:C.tx3,marginBottom:4,fontWeight:600}}>Statut déclaration</div>
                <select value={formData.declarationStatut||"NON_REQUISE"}
                  onChange={e=>Fd("declarationStatut",e.target.value)}
                  style={{width:"100%",height:40,padding:"0 10px",borderRadius:8,
                    border:`1.5px solid ${C.bd}`,fontFamily:"inherit",fontSize:13}}>
                  <option value="SOUMISE">✅ Déclaration soumise</option>
                  <option value="EN_COURS">📝 En cours</option>
                  <option value="NON_REQUISE">➖ Non requise</option>
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div onClick={()=>Fd("installationAvant2023",!formData.installationAvant2023)}
                  style={{width:20,height:20,borderRadius:5,border:`2px solid #1E5B3A`,
                    background:formData.installationAvant2023?"#1E5B3A":"#fff",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {formData.installationAvant2023&&<span style={{color:"#fff",fontSize:13}}>✓</span>}
                </div>
                <span style={{fontSize:12,color:C.tx}}>Installation mise en service avant le 20 nov. 2023</span>
              </div>
            </>)}

            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={submitForm} disabled={savingForm}
                style={{flex:1,height:44,borderRadius:10,background:"#1E5B3A",color:"#fff",
                  border:"none",fontSize:13,fontWeight:700,cursor:savingForm?"not-allowed":"pointer",
                  fontFamily:"inherit",opacity:savingForm?0.7:1}}>
                {savingForm?"Enregistrement…":(showForm==="create"?"Créer le plan":"Enregistrer")}
              </button>
              <button onClick={()=>setShowForm(null)}
                style={{flex:1,height:44,borderRadius:10,background:"transparent",
                  border:`1.5px solid ${C.bd}`,color:C.tx,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── PARAMÈTRES ───────────────────────────────────────────────────

export const SectionParametres = () => {
  const [onglet, setOnglet] = useState("entreprise");
  const [nomEntreprise, setNomEntreprise] = useState("ALTEGAD SAS");
  const [siret, setSiret] = useState("452 198 347 00021");
  const [adresse, setAdresse] = useState("12 rue de la Forêt, 03000 Moulins");
  const [email, setEmail] = useState("contact@altegad.fr");
  const [tel, setTel] = useState("04 70 00 00 00");
  const [codeInsee, setCodeInsee] = useState("03190");
  const [codePostal, setCodePostal] = useState("03000");
  const [seuilHumi, setSeuilHumi] = useState(30);
  const [seuilStockAlerte, setSeuilStockAlerte] = useState(20);
  const [delaiRelance, setDelaiRelance] = useState(7);
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2500); };

  return (
    <div style={{maxWidth:800,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>⚙️ Paramètres</div>
        <div style={{fontSize:13,color:C.tx2}}>Configuration de l'entreprise, seuils d'alerte et préférences</div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
        {[["entreprise","🏢 Entreprise"],["alertes","🔔 Seuils d'alerte"],["documents","📄 Documents PDF"],["systeme","🔧 Système"]].map(([v,l])=>(
          <button key={v} onClick={()=>setOnglet(v)}
            style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:"none",
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
      </div>

      {onglet==="entreprise"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[
              ["Raison sociale",nomEntreprise,setNomEntreprise,"text"],
              ["SIRET",siret,setSiret,"text"],
              ["Adresse",adresse,setAdresse,"text"],
              ["Email",email,setEmail,"email"],
              ["Téléphone",tel,setTel,"tel"],
              ["Code postal",codePostal,setCodePostal,"text"],
            ].map(([label,val,setter,type])=>(
              <div key={label}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{label}</div>
                <input type={type} value={val} onChange={e=>setter(e.target.value)}
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.bd}`,
                    fontSize:12,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none"}}/>
              </div>
            ))}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>Logo</div>
              <div style={{border:`2px dashed ${C.bd}`,borderRadius:7,padding:"14px",
                textAlign:"center",color:C.tx3,fontSize:11}}>
                📷 Glisser le logo ici (PNG/SVG)
              </div>
            </div>
          </div>

          {/* Bloc SDES — code INSEE */}
          <div style={{marginTop:16,background:"#EFF6FF",borderRadius:10,
            padding:"12px 16px",border:"1px solid #BFDBFE"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#1D4ED8",marginBottom:8}}>
              📊 Données SDES — Réseaux de chaleur
            </div>
            <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:140}}>
                <div style={{fontSize:10,fontWeight:700,color:"#1D4ED8",marginBottom:4}}>
                  Code INSEE commune (5 chiffres)
                </div>
                <input value={codeInsee} onChange={e=>setCodeInsee(e.target.value)}
                  placeholder="ex: 33063"
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,
                    border:"1.5px solid #93C5FD",fontSize:13,fontFamily:"monospace",
                    background:"#fff",color:"#1E40AF",outline:"none",letterSpacing:"0.1em"}}/>
              </div>
              <div style={{fontSize:10,color:"#3B82F6",lineHeight:1.5,flex:2,minWidth:200}}>
                Ce code permet à APPLITAG de matcher automatiquement les données SDES
                (livraisons GWh, PDL, taux CO₂) de la commune chaufferie.
                Récupérable sur <strong>geo.api.gouv.fr</strong> ou <strong>insee.fr</strong>.
              </div>
            </div>
            {codeInsee.length===5&&/^\d{5}$/.test(codeInsee)&&(
              <div style={{marginTop:8,fontSize:11,color:"#065F46",
                background:"#D1FAE5",borderRadius:6,padding:"4px 10px",display:"inline-block"}}>
                ✅ Code INSEE valide — enrichissement SDES activé
              </div>
            )}
          </div>
        </div>
      )}

      {onglet==="alertes"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {[
              {label:"Seuil humidité bois (% max)",val:seuilHumi,setter:setSeuilHumi,unit:"%",
               desc:"Alerte si une livraison dépasse ce taux",col:"#0369A1"},
              {label:"Seuil stock chaufferie (% min)",val:seuilStockAlerte,setter:setSeuilStockAlerte,unit:"%",
               desc:"Alerte si le stock d'une chaufferie passe sous ce seuil",col:"#B45309"},
              {label:"Délai relance contacts (jours)",val:delaiRelance,setter:setDelaiRelance,unit:"j",
               desc:"Relance automatique si pas de réponse après ce délai",col:"#7C3AED"},
            ].map(s=>(
              <div key={s.label} style={{padding:"12px 14px",borderRadius:10,
                border:`1px solid ${s.col}33`,background:s.col+"08"}}>
                <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:2}}>{s.label}</div>
                <div style={{fontSize:10,color:C.tx2,marginBottom:8}}>{s.desc}</div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <input type="range" min={0} max={s.unit==="%"?100:30}
                    value={s.val} onChange={e=>s.setter(Number(e.target.value))}
                    style={{flex:1,accentColor:s.col}}/>
                  <div style={{minWidth:48,textAlign:"center",fontWeight:900,fontSize:16,color:s.col}}>
                    {s.val}{s.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {onglet==="documents"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:20}}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[
              ["Mention légale sur BL","Sous réserve de vérification qualité à réception."],
              ["Pied de page contrats","ALTEGAD SAS — RC Moulins — TVA FR 12 452 198 347"],
              ["Clause de réserve réglementaire","Projet techniquement préparé, sous réserve du cadre réglementaire et de l'ouverture effective du dispositif au jour du dépôt."],
            ].map(([label,defVal])=>(
              <div key={label}>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:4}}>{label}</div>
                <textarea defaultValue={defVal} rows={2}
                  style={{width:"100%",padding:"7px 10px",borderRadius:7,border:`1px solid ${C.bd}`,
                    fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,
                    outline:"none",resize:"vertical"}}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {onglet==="systeme"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            {ico:"💾",label:"Sauvegarde des données",desc:"Dernière sauvegarde : aujourd'hui à 03h00",action:"Sauvegarder maintenant",col:"#1E5B3A"},
            {ico:"📤",label:"Export global",desc:"Exporter toutes les données APPLITAG en JSON/Excel",action:"Exporter",col:"#0369A1"},
            {ico:"🔄",label:"Synchronisation",desc:"État : à jour — dernière synchro il y a 4 min",action:"Forcer synchro",col:"#7C3AED"},
            {ico:"🔍",label:"Journal des erreurs",desc:"0 erreur détectée dans les 7 derniers jours",action:"Voir le journal",col:"#6B7280"},
          ].map(s=>(
            <div key={s.label} style={{background:"#fff",borderRadius:10,border:`1px solid ${C.bd}`,
              padding:"12px 14px",display:"flex",gap:12,alignItems:"center"}}>
              <span style={{fontSize:24}}>{s.ico}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{s.label}</div>
                <div style={{fontSize:10,color:C.tx2}}>{s.desc}</div>
              </div>
              <button style={{padding:"6px 14px",borderRadius:7,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",border:`1px solid ${s.col}`,
                background:"transparent",color:s.col}}>
                {s.action}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton sauvegarder */}
      {onglet!=="systeme"&&(
        <div style={{marginTop:16,display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={save}
            style={{padding:"9px 24px",borderRadius:9,fontSize:12,fontWeight:800,
              cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
            💾 Enregistrer les modifications
          </button>
          {saved&&<span style={{fontSize:12,color:"#059669",fontWeight:700}}>✅ Modifications enregistrées</span>}
        </div>
      )}
    </div>
  );
};

// ── CHANTIERS ───────────────────────────────────────────────────

const CHANTIERS_DATA = [
  {id:"CH-2026-14",label:"Forêt de Tronçais — Parcelle 18",
   proprietaire:"M. Gallet Bernard",commune:"Tronçais (03360)",surface:8.4,
   typeIntervention:"Coupe de taillis sous futaie",essences:"Chêne/Charme",
   entreprise:"SARL Forestry Allier",responsable:"L. Bonnet",
   dateDebut:"2026-07-21",dateFin:"2026-08-08",
   statut:"planifié",
   volPrévu:280,budget:18400,
   machines:["Porteur Ponsse Bear","Abatteuse Komatsu 931"],
   acces:"Route D145 + piste forestière — accès PL possible",
   contraintes:"Zone humide en bordure sud — pas d'engin < 15 t",
   photos:2,docs:3,alertes:0},
  {id:"CH-2026-12",label:"Bocage Nord — Haies et lisières",
   proprietaire:"Mme Renard Claire",commune:"Cérilly (03350)",surface:3.1,
   typeIntervention:"Broyage de haies bocagères",essences:"Charme/Noisetier",
   entreprise:"Entreprise Bocage 03",responsable:"P. Aubert",
   dateDebut:"2026-07-10",dateFin:"2026-07-18",
   statut:"terminé",
   volPrévu:62,budget:4200,
   machines:["Broyeur Berti BL 280"],
   acces:"Accès chemin agricole — tracteur seul",
   contraintes:"Période de nidification — vérification avant démarrage",
   photos:8,docs:5,alertes:0},
  {id:"CH-2026-11",label:"Parcelle Ternant — Éclaircie résineuse",
   proprietaire:"GFA Ternant",commune:"Ternant (58)",surface:5.7,
   typeIntervention:"Éclaircie mécanique — Douglas",essences:"Douglas",
   entreprise:"SARL Forestry Allier",responsable:"L. Bonnet",
   dateDebut:"2026-07-01",dateFin:"2026-07-14",
   statut:"en cours",
   volPrévu:195,budget:12800,
   machines:["Abatteuse Komatsu 931","Porteur Ponsse Bear"],
   acces:"RD 977 + chemin communal — accès PL avec autorisation mairie",
   contraintes:"Câbles téléphoniques en bordure parcelle nord",
   photos:5,docs:4,alertes:1},
  {id:"CH-2026-09",label:"Tronçais Sud — Coupe rase pin sylvestre",
   proprietaire:"M. Dubois René",commune:"Tronçais (03360)",surface:12.2,
   typeIntervention:"Coupe rase avec replantation prévue",essences:"Pin sylvestre",
   entreprise:"ForêtPro Bourbonnais",responsable:"A. Martel",
   dateDebut:"2026-06-02",dateFin:"2026-06-28",
   statut:"terminé",
   volPrévu:410,budget:26500,
   machines:["Abatteuse John Deere 1270G","Porteur 1110G","Broyeur de souches"],
   acces:"Accès direct RD — bon état",
   contraintes:"Aucune",
   photos:12,docs:7,alertes:0},
];

const STATUT_CHANTIER = {
  planifié:  {label:"Planifié",  icon:"📋",col:"#1E40AF",bg:"#DBEAFE"},
  "en cours":{label:"En cours",  icon:"🔨",col:"#B45309",bg:"#FEF3C7"},
  terminé:   {label:"Terminé",   icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  annulé:    {label:"Annulé",    icon:"❌",col:"#991B1B",bg:"#FEE2E2"},
};

const TAS_DATA = [
  {id:"TAS-001",chantierId:"CH-2026-11",label:"Tas D1 — Bord piste nord",
   volumeEstime:60,volumeReel:null,essence:"Douglas",humidite:38,
   statut:"mesure_en_cours",dateMise:"2026-07-03",datePrévEnlèvement:"2026-07-25",
   coordGPS:"46.4512 / 3.1874",notes:"Accessible porteur"},
  {id:"TAS-002",chantierId:"CH-2026-11",label:"Tas D2 — Clairière centrale",
   volumeEstime:85,volumeReel:82,essence:"Douglas",humidite:42,
   statut:"prêt_à_enlever",dateMise:"2026-07-05",datePrévEnlèvement:"2026-07-22",
   coordGPS:"46.4519 / 3.1891",notes:"Pesée réalisée"},
  {id:"TAS-003",chantierId:"CH-2026-14",label:"Tas T1 — Route D145",
   volumeEstime:120,volumeReel:null,essence:"Chêne",humidite:null,
   statut:"constitué",dateMise:"2026-07-23",datePrévEnlèvement:"2026-08-15",
   coordGPS:"46.5201 / 2.9847",notes:"En attente pesée"},
  {id:"TAS-004",chantierId:"CH-2026-09",label:"Tas P1 — Aire de stockage",
   volumeEstime:200,volumeReel:195,essence:"Pin sylvestre",humidite:28,
   statut:"enlevé",dateMise:"2026-06-15",datePrévEnlèvement:"2026-06-29",
   coordGPS:"46.5180 / 2.9722",notes:"Livré chaufferie Moulins"},
];

const STATUT_TAS = {
  constitué:       {label:"Constitué",       icon:"🪵",col:"#92400E",bg:"#FEF3C7"},
  mesure_en_cours: {label:"Mesure en cours", icon:"📏",col:"#1E40AF",bg:"#DBEAFE"},
  prêt_à_enlever:  {label:"Prêt à enlever", icon:"🚛",col:"#065F46",bg:"#D1FAE5"},
  enlevé:          {label:"Enlevé",          icon:"✅",col:"#374151",bg:"#E5E7EB"},
};

export const SectionChantiers = () => {
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [selected, setSelected] = useState(null);
  const [ongletFiche, setOngletFiche] = useState("infos");

  const chantiers = filtreStatut==="tous"
    ? CHANTIERS_DATA
    : CHANTIERS_DATA.filter(c=>c.statut===filtreStatut);

  const ch = selected ? CHANTIERS_DATA.find(c=>c.id===selected) : null;

  const totSurface = CHANTIERS_DATA.reduce((s,c)=>s+c.surface,0);
  const totBudget  = CHANTIERS_DATA.reduce((s,c)=>s+c.budget,0);
  const enCours    = CHANTIERS_DATA.filter(c=>c.statut==="en cours").length;
  const alertes    = CHANTIERS_DATA.reduce((s,c)=>s+c.alertes,0);

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🌲 Chantiers forestiers</div>
        <div style={{fontSize:13,color:C.tx2}}>Déclaration, suivi terrain et clôture des chantiers</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🌲",label:"Surface totale",val:totSurface.toFixed(1)+" ha",col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"🔨",label:"En cours",val:enCours+" chantier"+(enCours>1?"s":""),col:"#B45309",bg:"#FEF3C7"},
          {ico:"💶",label:"Budget total",val:(totBudget/1000).toFixed(1)+" k€",col:"#0369A1",bg:"#DBEAFE"},
          {ico:"⚠️",label:"Alertes actives",val:alertes+" alerte"+(alertes>1?"s":""),col:alertes>0?"#991B1B":"#059669",bg:alertes>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres statut */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Tous"],["planifié","Planifiés"],["en cours","En cours"],["terminé","Terminés"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setFiltreStatut(v);setSelected(null);}}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",border:`1px solid ${filtreStatut===v?"#1E5B3A":C.bd}`,
              background:filtreStatut===v?"#1E5B3A":"transparent",
              color:filtreStatut===v?"#fff":C.tx2}}>
            {l} <span style={{opacity:.6}}>({v==="tous"?CHANTIERS_DATA.length:CHANTIERS_DATA.filter(c=>c.statut===v).length})</span>
          </button>
        ))}
        <button style={{marginLeft:"auto",padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
          + Nouveau chantier
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:ch?"1fr 380px":"1fr",gap:12,alignItems:"start"}}>
        {/* Liste */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {chantiers.map(c=>{
            const st = STATUT_CHANTIER[c.statut]||STATUT_CHANTIER.planifié;
            const isSelected = selected===c.id;
            return (
              <div key={c.id} onClick={()=>setSelected(isSelected?null:c.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?"#1E5B3A":c.alertes>0?"#FCA5A5":C.bd}`,
                  boxShadow:isSelected?"0 0 0 3px #1E5B3A22":"none"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{c.label}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                      {c.alertes>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",
                        borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>⚠️ {c.alertes} alerte</span>}
                    </div>
                    <div style={{fontSize:11,color:C.tx2}}>{c.typeIntervention} · {c.essences}</div>
                    <div style={{display:"flex",gap:12,marginTop:5,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>📍 {c.commune}</span>
                      <span>👤 {c.proprietaire}</span>
                      <span>🏢 {c.entreprise}</span>
                      <span>📐 {c.surface} ha</span>
                      <span>📅 {new Date(c.dateDebut).toLocaleDateString("fr-FR")} → {new Date(c.dateFin).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:"#0369A1"}}>{(c.budget/1000).toFixed(1)} k€</div>
                    <div style={{fontSize:10,color:C.tx3}}>{c.volPrévu} m³ prév.</div>
                    <div style={{fontSize:10,color:C.tx3,marginTop:4}}>📷 {c.photos} · 📄 {c.docs}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fiche détail */}
        {ch&&(()=>{
          const st = STATUT_CHANTIER[ch.statut]||STATUT_CHANTIER.planifié;
          return (
            <div style={{background:"#fff",borderRadius:14,border:`2px solid #1E5B3A`,
              padding:16,position:"sticky",top:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{ch.id}</div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                </div>
                <button onClick={()=>setSelected(null)}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
              </div>

              {/* Onglets fiche */}
              <div style={{display:"flex",gap:4,marginBottom:12,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
                {[["infos","📋 Infos"],["terrain","⛰️ Terrain"],["machines","🚜 Machines"],["tas","🪵 Tas"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setOngletFiche(v)}
                    style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",
                      fontFamily:"inherit",border:"none",
                      background:ongletFiche===v?"#1E5B3A":"transparent",
                      color:ongletFiche===v?"#fff":C.tx3}}>
                    {l}
                  </button>
                ))}
              </div>

              {ongletFiche==="infos"&&(
                <div style={{display:"flex",flexDirection:"column",gap:7,fontSize:11}}>
                  {[
                    ["Parcelle / Lieu",ch.label],
                    ["Propriétaire",ch.proprietaire],
                    ["Commune",ch.commune],
                    ["Type d'intervention",ch.typeIntervention],
                    ["Essences",ch.essences],
                    ["Surface",ch.surface+" ha"],
                    ["Volume prévu",ch.volPrévu+" m³"],
                    ["Budget",ch.budget.toLocaleString("fr-FR")+" €"],
                    ["Entreprise",ch.entreprise],
                    ["Responsable",ch.responsable],
                    ["Période",new Date(ch.dateDebut).toLocaleDateString("fr-FR")+" → "+new Date(ch.dateFin).toLocaleDateString("fr-FR")],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                      <span style={{color:C.tx3,minWidth:130,flexShrink:0}}>{k}</span>
                      <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {ongletFiche==="terrain"&&(
                <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:11}}>
                  <div style={{background:"#F0FDF4",borderRadius:8,padding:10,border:"1px solid #BBF7D0"}}>
                    <div style={{fontWeight:700,color:"#065F46",marginBottom:4}}>🛣️ Accès</div>
                    <div style={{color:C.tx2,lineHeight:1.5}}>{ch.acces}</div>
                  </div>
                  <div style={{background:"#FFFBEB",borderRadius:8,padding:10,border:"1px solid #FDE68A"}}>
                    <div style={{fontWeight:700,color:"#92400E",marginBottom:4}}>⚠️ Contraintes</div>
                    <div style={{color:C.tx2,lineHeight:1.5}}>{ch.contraintes}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                    <div style={{background:"#F9FAFB",borderRadius:8,padding:10,textAlign:"center"}}>
                      <div style={{fontSize:18}}>📷</div>
                      <div style={{fontSize:16,fontWeight:800,color:C.tx}}>{ch.photos}</div>
                      <div style={{fontSize:10,color:C.tx3}}>Photos</div>
                    </div>
                    <div style={{background:"#F9FAFB",borderRadius:8,padding:10,textAlign:"center"}}>
                      <div style={{fontSize:18}}>📄</div>
                      <div style={{fontSize:16,fontWeight:800,color:C.tx}}>{ch.docs}</div>
                      <div style={{fontSize:10,color:C.tx3}}>Documents</div>
                    </div>
                  </div>
                </div>
              )}

              {ongletFiche==="machines"&&(
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {ch.machines.map((m,i)=>(
                    <div key={i} style={{background:"#F9FAFB",borderRadius:8,padding:"9px 12px",
                      border:`1px solid ${C.bd}`,fontSize:11,display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:18}}>🚜</span>
                      <span style={{fontWeight:600,color:C.tx}}>{m}</span>
                    </div>
                  ))}
                  <div style={{marginTop:8,padding:10,background:"#EDE9FE",borderRadius:8,
                    fontSize:10,color:"#5B21B6",border:"1px solid #C4B5FD"}}>
                    🔧 Maintenance et disponibilités disponibles dans le module Matériels (à venir)
                  </div>
                </div>
              )}

              {ongletFiche==="tas"&&(()=>{
                const tasChantier = TAS_DATA.filter(t=>t.chantierId===ch.id);
                return (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {tasChantier.length===0?(
                      <div style={{padding:20,textAlign:"center",color:C.tx3,fontSize:12}}>
                        Aucun tas intermédiaire enregistré pour ce chantier.
                      </div>
                    ):tasChantier.map(tas=>{
                      const st = STATUT_TAS[tas.statut as keyof typeof STATUT_TAS]||STATUT_TAS.constitué;
                      return (
                        <div key={tas.id} style={{background:"#F9FAFB",borderRadius:10,
                          border:`1px solid ${st.col}44`,padding:"10px 12px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <span style={{fontSize:11,fontWeight:800,color:C.tx}}>{tas.label}</span>
                            <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                              background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:10,color:C.tx2}}>
                            <span>🌲 {tas.essence}</span>
                            <span>📦 {tas.volumeEstime} m³ estimé{tas.volumeReel?` · ${tas.volumeReel} m³ réel`:""}</span>
                            {tas.humidite&&<span>💧 H = {tas.humidite}%</span>}
                            <span>📅 Mis le {new Date(tas.dateMise).toLocaleDateString("fr-FR")}</span>
                            {tas.datePrévEnlèvement&&<span>🚛 Enl. prévu : {new Date(tas.datePrévEnlèvement).toLocaleDateString("fr-FR")}</span>}
                            {tas.coordGPS&&<span>📍 GPS : {tas.coordGPS}</span>}
                          </div>
                          {tas.notes&&<div style={{marginTop:5,fontSize:10,color:"#92400E",
                            background:"#FEF3C7",borderRadius:5,padding:"4px 7px"}}>{tas.notes}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Actions */}
              <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
                <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"#1E5B3A",border:"none",color:"#fff"}}>
                  ✏️ Modifier
                </button>
                <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"transparent",
                  border:`1px solid ${C.bd}`,color:C.tx2}}>
                  📄 Rapport PDF
                </button>
                {ch.statut==="en cours"&&(
                  <button style={{width:"100%",padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",background:"#059669",border:"none",color:"#fff",marginTop:4}}>
                    ✅ Clôturer le chantier
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ── TRANSPORTS ───────────────────────────────────────────────────

const TRANSPORTS_DATA = [
  {id:"TRP-2026-0901",lot:"LOT-2026-044",client:"Chaufferie Moulins",
   chargement:"Plateforme Tronçais",destination:"Rue des Chataigniers, Moulins",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   dateHeure:"2026-07-19T07:30",tonnagePrévu:24,tonnageChargé:23.6,
   peseeDepart:null,peseeArrivee:null,
   statut:"en chargement",distanceKm:42,dureeMin:65,alertes:0},
  {id:"TRP-2026-0898",lot:"LOT-2026-041",client:"Réseau Vichy Agglo",
   chargement:"Stockage Ternant",destination:"ZI de Vichy — Chaufferie Centrale",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   dateHeure:"2026-07-18T14:00",tonnagePrévu:28,tonnageChargé:27.2,
   peseeDepart:27200,peseeArrivee:27100,
   statut:"livré",distanceKm:38,dureeMin:55,alertes:0},
  {id:"TRP-2026-0891",lot:"LOT-2026-038",client:"Réseau Vichy Agglo",
   chargement:"Stockage Ternant",destination:"ZI de Vichy — Chaufferie Centrale",
   chauffeur:"M. Leclercq",vehicule:"PL Renault T 520 — BL-432-AJ",
   dateHeure:"2026-07-16T08:00",tonnagePrévu:25,tonnageChargé:24.8,
   peseeDepart:24800,peseeArrivee:24650,
   statut:"contrôlé",distanceKm:38,dureeMin:55,alertes:0},
  {id:"TRP-2026-0884",lot:"LOT-2026-035",client:"Lycée agricole",
   chargement:"Plateforme Cérilly",destination:"Route de Moulins, Cérilly",
   chauffeur:"M. Aubert P.",vehicule:"PL Mercedes Actros — CK-891-RS",
   dateHeure:"2026-07-22T09:00",tonnagePrévu:18,tonnageChargé:null,
   peseeDepart:null,peseeArrivee:null,
   statut:"planifié",distanceKm:12,dureeMin:25,alertes:1},
  {id:"TRP-2026-0876",lot:"LOT-2026-031",client:"Réseau Vichy Agglo",
   chargement:"Stockage Ternant",destination:"ZI de Vichy — Chaufferie Centrale",
   chauffeur:"Mme Favier",vehicule:"PL Volvo FH — AB-218-KL",
   dateHeure:"2026-07-15T07:30",tonnagePrévu:26,tonnageChargé:25.4,
   peseeDepart:25400,peseeArrivee:25200,
   statut:"contrôlé",distanceKm:38,dureeMin:55,alertes:0},
];

const STATUT_TRANSPORT = {
  planifié:       {label:"Planifié",        icon:"📋",col:"#1E40AF",bg:"#DBEAFE"},
  "en chargement":{label:"En chargement",   icon:"📦",col:"#92400E",bg:"#FEF3C7"},
  "en route":     {label:"En route",        icon:"🚛",col:"#7C3AED",bg:"#EDE9FE"},
  livré:          {label:"Livré",           icon:"✅",col:"#065F46",bg:"#D1FAE5"},
  contrôlé:       {label:"Contrôlé",        icon:"☑️",col:"#059669",bg:"#D1FAE5"},
  annulé:         {label:"Annulé",          icon:"❌",col:"#991B1B",bg:"#FEE2E2"},
};

export const SectionTransports = () => {
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [selected, setSelected]         = useState(null);

  const transports = filtreStatut==="tous"
    ? TRANSPORTS_DATA
    : TRANSPORTS_DATA.filter(t=>t.statut===filtreStatut);

  const tr = selected ? TRANSPORTS_DATA.find(t=>t.id===selected) : null;

  const totalTonnes  = TRANSPORTS_DATA.filter(t=>t.tonnageChargé).reduce((s,t)=>s+t.tonnageChargé,0);
  const enRoute      = TRANSPORTS_DATA.filter(t=>["en chargement","en route"].includes(t.statut)).length;
  const alertesTotal = TRANSPORTS_DATA.reduce((s,t)=>s+t.alertes,0);
  const totalKm      = TRANSPORTS_DATA.reduce((s,t)=>s+t.distanceKm,0);

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🚛 Transports</div>
        <div style={{fontSize:13,color:C.tx2}}>Planification, suivi et traçabilité des enlèvements</div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🚛",label:"En mouvement",val:enRoute+" véhicule"+(enRoute>1?"s":""),col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"⚖️",label:"Tonnes transportées",val:totalTonnes.toFixed(1)+" t",col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"📍",label:"Distance totale",val:totalKm+" km",col:"#0369A1",bg:"#DBEAFE"},
          {ico:"⚠️",label:"Alertes",val:alertesTotal+" alerte"+(alertesTotal>1?"s":""),col:alertesTotal>0?"#991B1B":"#059669",bg:alertesTotal>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[["tous","Tous"],["planifié","Planifiés"],["en chargement","En chargement"],["livré","Livrés"],["contrôlé","Contrôlés"]].map(([v,l])=>(
          <button key={v} onClick={()=>{setFiltreStatut(v);setSelected(null);}}
            style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",border:`1px solid ${filtreStatut===v?"#1E5B3A":C.bd}`,
              background:filtreStatut===v?"#1E5B3A":"transparent",
              color:filtreStatut===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
        <button style={{marginLeft:"auto",padding:"5px 14px",borderRadius:7,fontSize:11,fontWeight:700,
          cursor:"pointer",fontFamily:"inherit",background:"#0369A1",border:"none",color:"#fff"}}>
          + Nouveau transport
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:tr?"1fr 360px":"1fr",gap:12,alignItems:"start"}}>
        {/* Liste */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {transports.map(t=>{
            const st = STATUT_TRANSPORT[t.statut]||STATUT_TRANSPORT.planifié;
            const isSelected = selected===t.id;
            return (
              <div key={t.id} onClick={()=>setSelected(isSelected?null:t.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 14px",cursor:"pointer",
                  border:`2px solid ${isSelected?"#0369A1":t.alertes>0?"#FCA5A5":C.bd}`,
                  boxShadow:isSelected?"0 0 0 3px #0369A122":"none"}}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:800,color:C.tx}}>{t.id}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,
                        background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                      {t.alertes>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",
                        borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>⚠️ alerte</span>}
                    </div>
                    <div style={{fontSize:11,color:C.tx2,marginBottom:3}}>{t.lot} → {t.client}</div>
                    <div style={{display:"flex",gap:10,fontSize:10,color:C.tx3,flexWrap:"wrap"}}>
                      <span>🚛 {t.vehicule.split("—")[0].trim()}</span>
                      <span>👤 {t.chauffeur}</span>
                      <span>📍 {t.chargement}</span>
                      <span>📅 {new Date(t.dateHeure).toLocaleDateString("fr-FR")} {new Date(t.dateHeure).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:"#0369A1"}}>
                      {t.tonnageChargé??t.tonnagePrévu} t
                    </div>
                    <div style={{fontSize:10,color:C.tx3}}>{t.distanceKm} km</div>
                    {t.peseeDepart&&(
                      <div style={{fontSize:9,color:"#059669",marginTop:2,fontWeight:600}}>
                        ⚖️ {(t.peseeDepart/1000).toFixed(1)} t pesée
                      </div>
                    )}
                  </div>
                </div>

                {/* Barre de progression statut */}
                {(()=>{
                  const etapes = ["planifié","en chargement","en route","livré","contrôlé"];
                  const idx = etapes.indexOf(t.statut);
                  return (
                    <div style={{display:"flex",gap:2,marginTop:8}}>
                      {etapes.map((e,i)=>(
                        <div key={e} style={{flex:1,height:4,borderRadius:2,
                          background:i<=idx?"#0369A1":"#E5E7EB"}}/>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Fiche détail transport */}
        {tr&&(()=>{
          const st = STATUT_TRANSPORT[tr.statut]||STATUT_TRANSPORT.planifié;
          const etapes = ["planifié","en chargement","en route","livré","contrôlé"];
          const idxSt = etapes.indexOf(tr.statut);
          return (
            <div style={{background:"#fff",borderRadius:14,border:"2px solid #0369A1",
              padding:16,position:"sticky",top:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{tr.id}</div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
                    background:st.bg,color:st.col}}>{st.icon} {st.label}</span>
                </div>
                <button onClick={()=>setSelected(null)}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
              </div>

              {/* Progression */}
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  {etapes.map((e,i)=>(
                    <div key={e} style={{textAlign:"center",flex:1}}>
                      <div style={{width:20,height:20,borderRadius:"50%",margin:"0 auto",
                        background:i<=idxSt?"#0369A1":"#E5E7EB",
                        border:`2px solid ${i<=idxSt?"#0369A1":"#E5E7EB"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700}}>
                        {i<=idxSt?"✓":i+1}
                      </div>
                      <div style={{fontSize:7,color:i<=idxSt?"#0369A1":C.tx3,marginTop:2,lineHeight:1.2}}>
                        {e.replace("en ","").replace("chargement","charg.").replace("planifié","prévu")}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{height:3,background:"#E5E7EB",borderRadius:2,marginTop:2}}>
                  <div style={{height:"100%",borderRadius:2,background:"#0369A1",
                    width:`${Math.min(100,idxSt/(etapes.length-1)*100)}%`}}/>
                </div>
              </div>

              {/* Détails */}
              <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11}}>
                {[
                  ["Lot","🏷️ "+tr.lot],
                  ["Client",tr.client],
                  ["Chargement","📍 "+tr.chargement],
                  ["Destination","🏁 "+tr.destination],
                  ["Chauffeur","👤 "+tr.chauffeur],
                  ["Véhicule","🚛 "+tr.vehicule],
                  ["Date / Heure","📅 "+new Date(tr.dateHeure).toLocaleDateString("fr-FR")+" à "+new Date(tr.dateHeure).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})],
                  ["Tonnage prévu","⚖️ "+tr.tonnagePrévu+" t"],
                  ["Tonnage chargé",tr.tonnageChargé?"⚖️ "+tr.tonnageChargé+" t":"— non saisi"],
                  ["Pesée départ",tr.peseeDepart?(tr.peseeDepart/1000).toFixed(1)+" t":"— en attente"],
                  ["Pesée arrivée",tr.peseeArrivee?(tr.peseeArrivee/1000).toFixed(1)+" t":"— en attente"],
                  ["Distance",tr.distanceKm+" km · ~"+tr.dureeMin+" min"],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                    <span style={{color:C.tx3,minWidth:110,flexShrink:0}}>{k}</span>
                    <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Écart pesée */}
              {tr.peseeDepart&&tr.peseeArrivee&&(
                <div style={{marginTop:10,padding:8,borderRadius:8,
                  background:(tr.peseeDepart-tr.peseeArrivee)>500?"#FEF3C7":"#F0FDF4",
                  border:`1px solid ${(tr.peseeDepart-tr.peseeArrivee)>500?"#FDE68A":"#BBF7D0"}`,fontSize:11}}>
                  <span style={{fontWeight:700}}>Écart pesée : </span>
                  {((tr.peseeDepart-tr.peseeArrivee)/1000).toFixed(2)} t
                  {(tr.peseeDepart-tr.peseeArrivee)>500
                    ? " ⚠️ écart significatif — vérifier"
                    : " ✅ dans les tolérances"}
                </div>
              )}

              {tr.alertes>0&&(
                <div style={{marginTop:8,padding:"8px 10px",background:"#FEE2E2",borderRadius:8,
                  fontSize:11,color:"#991B1B",border:"1px solid #FECACA"}}>
                  ⚠️ Transport en alerte — vérifier le dossier avant départ
                </div>
              )}

              {/* Actions */}
              <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
                {tr.statut==="planifié"&&(
                  <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",background:"#0369A1",border:"none",color:"#fff"}}>
                    ▶ Démarrer
                  </button>
                )}
                {tr.statut==="en chargement"&&(
                  <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",background:"#7C3AED",border:"none",color:"#fff"}}>
                    🚛 Marquer En route
                  </button>
                )}
                <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",background:"transparent",
                  border:`1px solid ${C.bd}`,color:C.tx2}}>
                  📄 Lettre de voiture
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ── ANALYSES — TABLEAUX DE BORD FINANCIERS ──────────────────────

const LOTS_ANALYSES = [
  {id:"L044",label:"LOT-2026-044",client:"Chaufferie Moulins",chantier:"Forêt Tronçais",
   essences:"Chêne/Hêtre",tonne:148,prixVente:82,coutAchat:18,coutChantier:12,coutTransport:8,coutBroyage:6,
   humidite:28,qualite:"BE",mois:"2026-05"},
  {id:"L041",label:"LOT-2026-041",client:"Réseau Vichy Agglo",chantier:"Parcelle Ternant",
   essences:"Chêne",tonne:95,prixVente:85,coutAchat:20,coutChantier:14,coutTransport:9,coutBroyage:6,
   humidite:31,qualite:"BE",mois:"2026-05"},
  {id:"L038",label:"LOT-2026-038",client:"Chaufferie Moulins",chantier:"CH-2026-09",
   essences:"Hêtre",tonne:203,prixVente:78,coutAchat:16,coutChantier:11,coutTransport:7,coutBroyage:5,
   humidite:25,qualite:"BE",mois:"2026-04"},
  {id:"L035",label:"LOT-2026-035",client:"Lycée agricole",chantier:"Forêt Cérilly",
   essences:"Charme/Hêtre",tonne:61,prixVente:80,coutAchat:19,coutChantier:13,coutTransport:10,coutBroyage:6,
   humidite:33,qualite:"BE",mois:"2026-04"},
  {id:"L031",label:"LOT-2026-031",client:"Réseau Vichy Agglo",chantier:"CH-2026-07",
   essences:"Chêne",tonne:174,prixVente:83,coutAchat:21,coutChantier:15,coutTransport:8,coutBroyage:7,
   humidite:29,qualite:"BE",mois:"2026-03"},
  {id:"L028",label:"LOT-2026-028",client:"Chaufferie St-Amand",chantier:"Bocage Nord",
   essences:"Chêne/Charme",tonne:88,prixVente:76,coutAchat:17,coutChantier:12,coutTransport:11,coutBroyage:6,
   humidite:36,qualite:"BE",mois:"2026-03"},
  {id:"L024",label:"LOT-2026-024",client:"Chaufferie Moulins",chantier:"Tronçais Sud",
   essences:"Hêtre",tonne:221,prixVente:81,coutAchat:18,coutChantier:11,coutTransport:7,coutBroyage:5,
   humidite:27,qualite:"BE",mois:"2026-02"},
  {id:"L019",label:"LOT-2026-019",client:"Réseau Vichy Agglo",chantier:"Parcelle Ternant",
   essences:"Chêne",tonne:132,prixVente:84,coutAchat:20,coutChantier:13,coutTransport:9,coutBroyage:6,
   humidite:30,qualite:"BE",mois:"2026-01"},
];

// Calculs dérivés
const enrichLot = l => {
  const coutTotal = l.coutAchat + l.coutChantier + l.coutTransport + l.coutBroyage;
  const marge = l.prixVente - coutTotal;
  const margePct = Math.round(marge / l.prixVente * 100);
  const caTotal = l.tonne * l.prixVente;
  const coutTotalEur = l.tonne * coutTotal;
  const margeEur = l.tonne * marge;
  return {...l, coutTotal, marge, margePct, caTotal, coutTotalEur, margeEur};
};
const LOTS_ENRICHIS = LOTS_ANALYSES.map(enrichLot);

// Agrégation par client
const byClient = () => {
  const map = {};
  LOTS_ENRICHIS.forEach(l => {
    if (!map[l.client]) map[l.client] = {client:l.client, tonne:0, caTotal:0, margeEur:0, lots:0};
    map[l.client].tonne    += l.tonne;
    map[l.client].caTotal  += l.caTotal;
    map[l.client].margeEur += l.margeEur;
    map[l.client].lots     += 1;
  });
  return Object.values(map).map(c => ({...c, margePct:Math.round(c.margeEur/c.caTotal*100)}));
};

// Agrégation par mois
const byMois = () => {
  const map = {};
  LOTS_ENRICHIS.forEach(l => {
    if (!map[l.mois]) map[l.mois] = {mois:l.mois, caTotal:0, margeEur:0, tonne:0};
    map[l.mois].caTotal  += l.caTotal;
    map[l.mois].margeEur += l.margeEur;
    map[l.mois].tonne    += l.tonne;
  });
  return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v);
};

// Mini barre SVG inline
export const BarChart = ({data, valKey, labelKey, couleurFn, height=120, _unite="€"}) => {
  const max = Math.max(...data.map(d=>d[valKey]));
  const _w = 100 / data.length;
  return (
    <svg viewBox={`0 0 ${data.length*60} ${height+30}`} style={{width:"100%",height:height+30}}>
      {data.map((d,i)=>{
        const barH = Math.round((d[valKey]/max)*(height-10));
        const x = i*60+8;
        const y = height - barH;
        const col = couleurFn ? couleurFn(d) : "#1E5B3A";
        return (
          <g key={i}>
            <rect x={x} y={y} width={44} height={barH} rx={4} fill={col} opacity={.85}/>
            <text x={x+22} y={y-4} textAnchor="middle" fontSize={8} fill="#374151" fontWeight="700">
              {d[valKey]>=1000?Math.round(d[valKey]/1000)+"k":d[valKey]}
            </text>
            <text x={x+22} y={height+14} textAnchor="middle" fontSize={8} fill="#6B7280">
              {String(d[labelKey]).slice(0,7)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// Jauge marge
const JaugeMarge = ({pct, size=52}) => {
  const col = pct>=30?"#059669":pct>=20?"#D97706":"#DC2626";
  const bg  = pct>=30?"#D1FAE5":pct>=20?"#FEF3C7":"#FEE2E2";
  return (
    <div style={{width:size,height:size,borderRadius:"50%",
      border:`4px solid ${col}`,background:bg,
      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{fontSize:size*0.22,fontWeight:900,color:col}}>{pct}%</span>
    </div>
  );
};

export const SectionAnalyses = () => {
  const [vue, setVue] = useState("global"); // global | lots | clients | mensuel
  const [periodeFiltre, setPeriodeFiltre] = useState("tous");

  const lotsFiltres = periodeFiltre==="tous"
    ? LOTS_ENRICHIS
    : LOTS_ENRICHIS.filter(l=>l.mois.startsWith(periodeFiltre));

  const totCA    = lotsFiltres.reduce((s,l)=>s+l.caTotal,0);
  const totMarge = lotsFiltres.reduce((s,l)=>s+l.margeEur,0);
  const totTonne = lotsFiltres.reduce((s,l)=>s+l.tonne,0);
  const totCout  = lotsFiltres.reduce((s,l)=>s+l.coutTotalEur,0);
  const margePctGlobal = totCA>0 ? Math.round(totMarge/totCA*100) : 0;
  const coutMoyTonne = totTonne>0 ? Math.round(totCout/totTonne) : 0;
  const prixMoyTonne = totTonne>0 ? Math.round(totCA/totTonne) : 0;

  const clientsData = byClient();
  const mensuelData = byMois();

  const fmt = v => v>=1000 ? (v/1000).toFixed(1)+" k€" : v+" €";

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>📊 APPLITAG Analyses</div>
        <div style={{fontSize:13,color:C.tx2}}>Rentabilité, coûts et performance par lot · chantier · client</div>
      </div>

      {/* Filtres */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        <div style={{display:"flex",gap:4}}>
          {[["tous","Toute période"],["2026-05","Mai 2026"],["2026-04","Avr. 2026"],
            ["2026-03","Mars 2026"],["2026-02","Fév. 2026"],["2026-01","Jan. 2026"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriodeFiltre(v)}
              style={{padding:"5px 10px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",border:`1px solid ${periodeFiltre===v?"#1E5B3A":C.bd}`,
                background:periodeFiltre===v?"#1E5B3A":"transparent",
                color:periodeFiltre===v?"#fff":C.tx2}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          {[["global","🌐 Global"],["lots","📦 Par lot"],["clients","👥 Par client"],["mensuel","📅 Mensuel"]].map(([v,l])=>(
            <button key={v} onClick={()=>setVue(v)}
              style={{padding:"5px 11px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                fontFamily:"inherit",border:`1px solid ${vue===v?"#7C3AED":C.bd}`,
                background:vue===v?"#7C3AED":"transparent",
                color:vue===v?"#fff":C.tx2}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs globaux — toujours visibles */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"💶",label:"Chiffre d'affaires",val:fmt(totCA),sub:`${totTonne} t · ${prixMoyTonne} €/t`,col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"💰",label:"Marge brute",val:fmt(totMarge),sub:`${margePctGlobal}% du CA`,col:margePctGlobal>=25?"#059669":margePctGlobal>=15?"#D97706":"#DC2626",
           bg:margePctGlobal>=25?"#D1FAE5":margePctGlobal>=15?"#FEF3C7":"#FEE2E2"},
          {ico:"⚙️",label:"Coûts directs",val:fmt(totCout),sub:`${coutMoyTonne} €/tonne`,col:"#0369A1",bg:"#DBEAFE"},
          {ico:"📦",label:"Lots analysés",val:lotsFiltres.length+" lots",sub:`${totTonne} tonnes totales`,col:"#7C3AED",bg:"#EDE9FE"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px",border:`1px solid ${k.col}22`}}>
            <div style={{fontSize:18,marginBottom:4}}>{k.ico}</div>
            <div style={{fontSize:15,fontWeight:900,color:k.col}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.8,marginTop:2}}>{k.label}</div>
            <div style={{fontSize:10,color:k.col,opacity:.65,marginTop:1}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Vue GLOBAL */}
      {vue==="global"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {/* Décomposition des coûts */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:12}}>⚙️ Décomposition des coûts (€/tonne moyen)</div>
            {[
              {label:"Achat bois",key:"coutAchat",col:"#1E5B3A"},
              {label:"Travaux chantier",key:"coutChantier",col:"#0369A1"},
              {label:"Transport",key:"coutTransport",col:"#D97706"},
              {label:"Broyage",key:"coutBroyage",col:"#7C3AED"},
            ].map(item=>{
              const moy = Math.round(lotsFiltres.reduce((s,l)=>s+l[item.key],0)/Math.max(lotsFiltres.length,1));
              const pct = coutMoyTonne>0?Math.round(moy/coutMoyTonne*100):0;
              return (
                <div key={item.key} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                    <span style={{color:C.tx2}}>{item.label}</span>
                    <span style={{fontWeight:700,color:C.tx}}>{moy} €/t <span style={{color:C.tx3,fontWeight:400}}>({pct}%)</span></span>
                  </div>
                  <div style={{height:8,borderRadius:4,background:"#F3F4F6",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:item.col,borderRadius:4}}/>
                  </div>
                </div>
              );
            })}
            <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.bd}`,
              display:"flex",justifyContent:"space-between",fontSize:11}}>
              <span style={{color:C.tx2,fontWeight:700}}>Total coûts</span>
              <span style={{fontWeight:900,color:C.tx}}>{coutMoyTonne} €/t</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:4}}>
              <span style={{color:"#059669",fontWeight:700}}>Marge brute</span>
              <span style={{fontWeight:900,color:"#059669"}}>{prixMoyTonne-coutMoyTonne} €/t · {margePctGlobal}%</span>
            </div>
          </div>

          {/* Évolution mensuelle CA + Marge */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:8}}>📅 Évolution mensuelle CA / Marge</div>
            <div style={{display:"flex",gap:10,marginBottom:8}}>
              <div style={{display:"flex",gap:4,alignItems:"center",fontSize:10}}>
                <div style={{width:10,height:10,borderRadius:2,background:"#1E5B3A"}}/>CA
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center",fontSize:10}}>
                <div style={{width:10,height:10,borderRadius:2,background:"#059669",opacity:.6}}/>Marge
              </div>
            </div>
            <svg viewBox={`0 0 ${mensuelData.length*70} 130`} style={{width:"100%",height:130}}>
              {mensuelData.map((d,i)=>{
                const maxCA = Math.max(...mensuelData.map(x=>x.caTotal));
                const barH_CA = Math.round(d.caTotal/maxCA*90);
                const barH_MG = Math.round(d.margeEur/maxCA*90);
                const x = i*70+5;
                const label = d.mois.slice(5)===("01")?"Jan":d.mois.slice(5)==="02"?"Fév":
                              d.mois.slice(5)==="03"?"Mar":d.mois.slice(5)==="04"?"Avr":
                              d.mois.slice(5)==="05"?"Mai":"Jun";
                return (
                  <g key={i}>
                    <rect x={x} y={100-barH_CA} width={25} height={barH_CA} rx={3} fill="#1E5B3A" opacity={.8}/>
                    <rect x={x+28} y={100-barH_MG} width={25} height={barH_MG} rx={3} fill="#059669" opacity={.6}/>
                    <text x={x+29} y={115} fontSize={8} fill="#6B7280" textAnchor="middle">{label}</text>
                    <text x={x+12} y={100-barH_CA-3} fontSize={7} fill="#374151" textAnchor="middle">
                      {Math.round(d.caTotal/1000)}k
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Top clients par marge */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>👥 Clients — Classement par marge</div>
            {clientsData.sort((a,b)=>b.margePct-a.margePct).map((cl,i)=>(
              <div key={cl.client} style={{display:"flex",gap:10,alignItems:"center",
                padding:"7px 0",borderBottom:i<clientsData.length-1?`1px solid ${C.bd}`:"none"}}>
                <JaugeMarge pct={cl.margePct}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{cl.client}</div>
                  <div style={{fontSize:10,color:C.tx2}}>
                    {cl.lots} lots · {cl.tonne} t · CA {fmt(cl.caTotal)}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#059669"}}>{fmt(cl.margeEur)}</div>
                  <div style={{fontSize:10,color:C.tx3}}>marge brute</div>
                </div>
              </div>
            ))}
          </div>

          {/* Alertes financières */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>⚠️ Points d'attention financiers</div>
            {[
              {icon:"🔴",msg:"LOT-2026-028 (Chaufferie St-Amand) : humidité 36% — risque de refus ou décote",type:"qualité"},
              {icon:"🟠",msg:"LOT-2026-035 (Lycée agricole) : marge 25% — coût transport élevé (10 €/t)",type:"coût"},
              {icon:"🟡",msg:"Chaufferie St-Amand : 1 seul lot livré — dépendance faible volume",type:"commercial"},
              {icon:"🟢",msg:"LOT-2026-024 (Tronçais Sud) : meilleure marge brute — 221 t à 34 €/t",type:"bon"},
            ].map((al,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",
                padding:"7px 8px",marginBottom:5,borderRadius:7,
                background:al.type==="bon"?"#F0FDF4":al.type==="qualité"?"#FEF2F2":"#FFFBEB",
                border:`1px solid ${al.type==="bon"?"#BBF7D0":al.type==="qualité"?"#FECACA":"#FDE68A"}`}}>
                <span style={{fontSize:14,flexShrink:0}}>{al.icon}</span>
                <span style={{fontSize:11,color:C.tx2,lineHeight:1.4}}>{al.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vue PAR LOT */}
      {vue==="lots"&&(
        <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`,background:"#F9FAFB",
            display:"grid",gridTemplateColumns:"1.5fr 80px 70px 70px 70px 70px 70px 60px",
            gap:6,fontSize:10,fontWeight:700,color:C.tx3}}>
            <span>Lot / Client</span><span style={{textAlign:"right"}}>Tonnes</span>
            <span style={{textAlign:"right"}}>Prix/t</span><span style={{textAlign:"right"}}>Coût/t</span>
            <span style={{textAlign:"right"}}>Marge/t</span><span style={{textAlign:"right"}}>CA total</span>
            <span style={{textAlign:"right"}}>Marge €</span><span style={{textAlign:"center"}}>Marge %</span>
          </div>
          {lotsFiltres.sort((a,b)=>b.margePct-a.margePct).map((l,i)=>(
            <div key={l.id} style={{
              display:"grid",gridTemplateColumns:"1.5fr 80px 70px 70px 70px 70px 70px 60px",
              gap:6,padding:"9px 14px",alignItems:"center",
              borderBottom:i<lotsFiltres.length-1?`1px solid ${C.bd}`:"none",
              background:i%2===0?"#fff":"#FAFAFA"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx}}>{l.label}</div>
                <div style={{fontSize:10,color:C.tx2}}>{l.client} · {l.mois.slice(0,7)}</div>
                <div style={{fontSize:9,color:C.tx3}}>{l.essences} · H={l.humidite}%</div>
              </div>
              <span style={{fontSize:11,textAlign:"right",color:C.tx2}}>{l.tonne} t</span>
              <span style={{fontSize:11,textAlign:"right",color:C.tx2}}>{l.prixVente} €</span>
              <span style={{fontSize:11,textAlign:"right",color:"#0369A1"}}>{l.coutTotal} €</span>
              <span style={{fontSize:11,textAlign:"right",fontWeight:700,
                color:l.marge>=25?"#059669":l.marge>=15?"#D97706":"#DC2626"}}>{l.marge} €</span>
              <span style={{fontSize:11,textAlign:"right",color:C.tx2}}>{fmt(l.caTotal)}</span>
              <span style={{fontSize:11,textAlign:"right",fontWeight:700,color:"#059669"}}>{fmt(l.margeEur)}</span>
              <div style={{display:"flex",justifyContent:"center"}}>
                <JaugeMarge pct={l.margePct} size={38}/>
              </div>
            </div>
          ))}
          <div style={{padding:"10px 14px",background:"#F0FDF4",borderTop:`2px solid #1E5B3A`,
            display:"grid",gridTemplateColumns:"1.5fr 80px 70px 70px 70px 70px 70px 60px",gap:6,
            fontSize:11,fontWeight:800,color:"#065F46"}}>
            <span>TOTAL</span>
            <span style={{textAlign:"right"}}>{totTonne} t</span>
            <span style={{textAlign:"right"}}>{prixMoyTonne} €</span>
            <span style={{textAlign:"right"}}>{coutMoyTonne} €</span>
            <span style={{textAlign:"right"}}>{prixMoyTonne-coutMoyTonne} €</span>
            <span style={{textAlign:"right"}}>{fmt(totCA)}</span>
            <span style={{textAlign:"right"}}>{fmt(totMarge)}</span>
            <span style={{textAlign:"center"}}>{margePctGlobal}%</span>
          </div>
        </div>
      )}

      {/* Vue PAR CLIENT */}
      {vue==="clients"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {clientsData.sort((a,b)=>b.caTotal-a.caTotal).map(cl=>{
            const lotsClient = LOTS_ENRICHIS.filter(l=>l.client===cl.client);
            return (
              <div key={cl.client} style={{background:"#fff",borderRadius:12,
                border:`2px solid ${cl.margePct>=25?"#059669":cl.margePct>=15?"#D97706":"#DC2626"}`,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",display:"flex",gap:12,alignItems:"center",
                  background:cl.margePct>=25?"#F0FDF4":cl.margePct>=15?"#FFFBEB":"#FEF2F2",
                  borderBottom:`1px solid ${C.bd}`}}>
                  <JaugeMarge pct={cl.margePct} size={52}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:800,color:C.tx}}>{cl.client}</div>
                    <div style={{fontSize:11,color:C.tx2,marginTop:2}}>
                      {cl.lots} lots · {cl.tonne} tonnes · CA {fmt(cl.caTotal)}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#059669"}}>{fmt(cl.margeEur)}</div>
                    <div style={{fontSize:10,color:C.tx3}}>marge brute totale</div>
                  </div>
                </div>
                <div style={{padding:"10px 16px",overflowX:"auto"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,minWidth:400}}>
                    {lotsClient.map(l=>(
                      <div key={l.id} style={{background:"#F9FAFB",borderRadius:8,padding:"8px 10px",
                        border:`1px solid ${C.bd}`,fontSize:10}}>
                        <div style={{fontWeight:700,color:C.tx,marginBottom:2}}>{l.label.slice(-6)}</div>
                        <div style={{color:C.tx3}}>{l.mois.slice(0,7)}</div>
                        <div style={{color:C.tx2}}>{l.tonne} t</div>
                        <div style={{fontWeight:700,color:l.margePct>=25?"#059669":"#D97706"}}>
                          {l.margePct}% · {fmt(l.margeEur)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vue MENSUELLE */}
      {vue==="mensuel"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
              💶 CA mensuel (€)
            </div>
            <BarChart
              data={mensuelData} valKey="caTotal" labelKey="mois"
              couleurFn={()=>"#1E5B3A"} height={130}
            />
          </div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
              💰 Marge brute mensuelle (€)
            </div>
            <BarChart
              data={mensuelData} valKey="margeEur" labelKey="mois"
              couleurFn={d=>d.margeEur/d.caTotal>=0.25?"#059669":"#D97706"} height={130}
            />
          </div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,gridColumn:"1/-1"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>📅 Synthèse mensuelle</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#F9FAFB",borderBottom:`1px solid ${C.bd}`}}>
                    {["Mois","Tonnes","CA (€)","Coûts (€)","Marge (€)","Marge %","Moy €/t"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",color:C.tx3,fontWeight:700,
                        textAlign:h==="Mois"?"left":"right"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mensuelData.map((m,i)=>{
                    const margePct=Math.round(m.margeEur/m.caTotal*100);
                    return (
                      <tr key={m.mois} style={{borderBottom:`1px solid ${C.bd}`,
                        background:i%2===0?"#fff":"#FAFAFA"}}>
                        <td style={{padding:"7px 10px",fontWeight:700}}>{m.mois}</td>
                        <td style={{padding:"7px 10px",textAlign:"right"}}>{m.tonne}</td>
                        <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(m.caTotal)}</td>
                        <td style={{padding:"7px 10px",textAlign:"right",color:"#0369A1"}}>
                          {fmt(m.caTotal-m.margeEur)}
                        </td>
                        <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:"#059669"}}>
                          {fmt(m.margeEur)}
                        </td>
                        <td style={{padding:"7px 10px",textAlign:"right"}}>
                          <span style={{fontWeight:700,
                            color:margePct>=25?"#059669":margePct>=15?"#D97706":"#DC2626"}}>
                            {margePct}%
                          </span>
                        </td>
                        <td style={{padding:"7px 10px",textAlign:"right"}}>
                          {Math.round(m.caTotal/m.tonne)} €
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:"#F0FDF4",borderTop:`2px solid #1E5B3A`,fontWeight:800,color:"#065F46"}}>
                    <td style={{padding:"7px 10px"}}>TOTAL</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{totTonne}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(totCA)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(totCout)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{fmt(totMarge)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{margePctGlobal}%</td>
                    <td style={{padding:"7px 10px",textAlign:"right"}}>{prixMoyTonne} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── DOCUMENTS PDF ───────────────────────────────────────────────

const DOC_TYPES = [
  {
    id:"rapport_visite", cat:"exploitation",
    icon:"📋", label:"Rapport de visite mandataire",
    desc:"Synthèse des 12 étapes de visite terrain : admin, GPS, biomasse, finance, contraintes, accès, plateforme, replantation, certification, réglementation, check-list",
    champs:["Propriétaire","Parcelle","Date visite","Mandataire","GPS","Essences","Surface","Volume estimé","Prix/tonne","Snapshot réglementaire","Clause de réserve","Certifications"],
    delai:"Immédiat",couleur:"#1E5B3A",
  },
  {
    id:"bon_livraison", cat:"logistique",
    icon:"📦", label:"Bon de livraison",
    desc:"Document de réception chaufferie : pesée, humidité, qualité, conformité, signature réceptionnaire",
    champs:["N° BL","Lot","Chaufferie","Date","Heure","Poids brut","Tare","Poids net","Humidité","Granulométrie","Conformité","Signature"],
    delai:"Immédiat",couleur:"#0369A1",
  },
  {
    id:"lettre_voiture", cat:"logistique",
    icon:"🚛", label:"Lettre de voiture (CMR simplifiée)",
    desc:"Document d'expédition pour le chauffeur : lieu de chargement, destination, lot, tonnage",
    champs:["N° transport","Chauffeur","Véhicule","Chargement GPS","Destination","Lot","Tonnage estimé","Date/heure départ","Observations"],
    delai:"Immédiat",couleur:"#0369A1",
  },
  {
    id:"convention_proprio", cat:"propriétaire",
    icon:"🤝", label:"Convention propriétaire",
    desc:"Accord entre le propriétaire et l'opérateur : parcelle, volumes, prix, conditions d'accès, remise en état",
    champs:["Propriétaire","Parcelle","Références cadastrales","Surface","Volume prévu","Prix unitaire","Modalités paiement","Conditions accès","Obligations remise en état","Durée","Signatures"],
    delai:"Sur validation",couleur:"#7C3AED",
  },
  {
    id:"autorisation_coupe", cat:"propriétaire",
    icon:"🪓", label:"Autorisation d'exploitation",
    desc:"Document signé par le propriétaire autorisant le chantier d'exploitation forestière",
    champs:["Propriétaire","Mandataire","Parcelle","Nature travaux","Dates prévisionnelles","Entreprise intervenante","Conditions particulières","Date","Signature propriétaire"],
    delai:"Sur validation",couleur:"#7C3AED",
  },
  {
    id:"rapport_chantier", cat:"exploitation",
    icon:"🌲", label:"Rapport de fin de chantier",
    desc:"Bilan complet du chantier : surface traitée, volumes produits, coûts, incidents, photos, validation",
    champs:["Chantier","Période","Entreprise","Surface traitée","Nature intervention","Volume produit","Tonnage","Coût total","Incidents","Photos avant/après","Observations","Validation"],
    delai:"Sur clôture",couleur:"#1E5B3A",
  },
  {
    id:"fiche_lot", cat:"traçabilité",
    icon:"🏷️", label:"Fiche traçabilité lot",
    desc:"Document de traçabilité complet d'un lot : origine parcelle → chantier → stockage → livraison",
    champs:["ID lot","Origine parcelle","Propriétaire","Essences","Volume","Poids","Chantier","Date production","Entreprise","Transporteur","Destination","Livraison","Conformité"],
    delai:"Immédiat",couleur:"#D97706",
  },
  {
    id:"snapshot_regl", cat:"réglementation",
    icon:"⚖️", label:"Snapshot réglementaire dossier",
    desc:"Copie datée des textes réglementaires en vigueur au moment de la préparation du dossier — immuable, valeur probante",
    champs:["Dossier","Date snapshot","Auteur","Dispositif d'aide","Textes de référence","Statuts au jour J","Alertes actives","Clause de réserve","Version critères","Signature mandataire"],
    delai:"Sur visite",couleur:"#5b21b6",
  },
  {
    id:"attestation_durabilite", cat:"réglementation",
    icon:"🌿", label:"Attestation de durabilité biomasse",
    desc:"Document de conformité RED II/RED III : origine, type de biomasse, critères de durabilité, réduction émissions",
    champs:["Opérateur","Période","Lots concernés","Origine géographique","Type biomasse","Critères durabilité","Réduction GES estimée","Chaîne de contrôle","Certifications","Signature"],
    delai:"Sur demande",couleur:"#059669",
  },
];

const DOC_CATS = [
  {id:"tous",           label:"Tous",          icon:"📁"},
  {id:"exploitation",   label:"Exploitation",  icon:"🌲"},
  {id:"logistique",     label:"Logistique",    icon:"🚛"},
  {id:"propriétaire",   label:"Propriétaire",  icon:"👤"},
  {id:"traçabilité",    label:"Traçabilité",   icon:"🔗"},
  {id:"réglementation", label:"Réglementation",icon:"⚖️"},
];

// Historique de documents générés (simulé)
const DOCS_HISTORIQUE = [
  {id:"d001",type:"rapport_visite",    ref:"Visite — Forêt Ternant (58)",   date:"2026-07-17",auteur:"M. Boivin",taille:"148 Ko",statut:"signé"},
  {id:"d002",type:"bon_livraison",     ref:"BL-2026-0234 — Chaufferie Moulins",date:"2026-07-16",auteur:"Système",taille:"42 Ko",statut:"validé"},
  {id:"d003",type:"lettre_voiture",    ref:"TRP-2026-0891 — Vichy Agglo",   date:"2026-07-16",auteur:"Système",taille:"28 Ko",statut:"émis"},
  {id:"d004",type:"convention_proprio",ref:"Convention — M. Gallet (03)",   date:"2026-07-14",auteur:"M. Boivin",taille:"204 Ko",statut:"signé"},
  {id:"d005",type:"snapshot_regl",     ref:"Snapshot — Dossier Ternant",    date:"2026-07-14",auteur:"M. Boivin",taille:"96 Ko",statut:"archivé"},
  {id:"d006",type:"fiche_lot",         ref:"LOT-2026-044 — Forêt Tronçais", date:"2026-07-13",auteur:"Système",taille:"64 Ko",statut:"validé"},
  {id:"d007",type:"rapport_chantier",  ref:"Chantier CH-2026-12 — Cérilly", date:"2026-07-10",auteur:"M. Boivin",taille:"312 Ko",statut:"signé"},
  {id:"d008",type:"autorisation_coupe",ref:"Autorisation — Mme Renard",     date:"2026-07-08",auteur:"M. Boivin",taille:"88 Ko",statut:"signé"},
];

const STATUT_DOC = {
  signé:   {label:"Signé",    color:"#065F46",bg:"#D1FAE5",icon:"✅"},
  validé:  {label:"Validé",   color:"#1E40AF",bg:"#DBEAFE",icon:"☑️"},
  émis:    {label:"Émis",     color:"#92400E",bg:"#FEF3C7",icon:"📤"},
  archivé: {label:"Archivé",  color:"#6B7280",bg:"#F3F4F6",icon:"🗃️"},
  brouillon:{label:"Brouillon",color:"#9CA3AF",bg:"#F9FAFB",icon:"📝"},
};

export const SectionDocuments = () => {
  const [catActive, setCatActive] = useState("tous");
  const [docPreview, setDocPreview] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [onglet, setOnglet] = useState("catalogue"); // catalogue | historique

  const docsFiltres = DOC_TYPES.filter(d =>
    (catActive==="tous" || d.cat===catActive) &&
    (!searchQ || d.label.toLowerCase().includes(searchQ.toLowerCase()) || d.desc.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const getDocType = id => DOC_TYPES.find(d=>d.id===id);

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>📄 APPLITAG Documents</div>
        <div style={{fontSize:13,color:C.tx2}}>Génération, classement et archivage des documents métier</div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:4,marginBottom:16}}>
        {[["catalogue","📚 Catalogue documents"],["historique","🗃️ Historique & archives"]].map(([v,l])=>(
          <button key={v} onClick={()=>setOnglet(v)}
            style={{padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
              fontFamily:"inherit",border:`2px solid ${onglet===v?"#1E5B3A":C.bd}`,
              background:onglet===v?"#1E5B3A":"transparent",
              color:onglet===v?"#fff":C.tx2}}>
            {l}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <div style={{background:"#D1FAE5",color:"#065F46",borderRadius:6,padding:"4px 10px",
            fontSize:11,fontWeight:700}}>
            {DOCS_HISTORIQUE.length} documents archivés
          </div>
        </div>
      </div>

      {/* CATALOGUE */}
      {onglet==="catalogue"&&(
        <div>
          {/* Filtres */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {DOC_CATS.map(cat=>(
              <button key={cat.id} onClick={()=>setCatActive(cat.id)}
                style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                  fontFamily:"inherit",border:`1px solid ${catActive===cat.id?"#1E5B3A":C.bd}`,
                  background:catActive===cat.id?"#1E5B3A":"transparent",
                  color:catActive===cat.id?"#fff":C.tx2}}>
                {cat.icon} {cat.label}
              </button>
            ))}
            <input
              value={searchQ} onChange={e=>setSearchQ(e.target.value)}
              placeholder="Rechercher un document…"
              style={{marginLeft:"auto",padding:"5px 10px",borderRadius:7,border:`1px solid ${C.bd}`,
                fontSize:11,fontFamily:"inherit",background:C.bg1,color:C.tx,outline:"none",minWidth:180}}
            />
          </div>

          {/* Grille de types */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:10,marginBottom:16}}>
            {docsFiltres.map(doc=>(
              <div key={doc.id}
                onClick={()=>setDocPreview(docPreview?.id===doc.id?null:doc)}
                style={{background:"#fff",borderRadius:12,border:`2px solid ${docPreview?.id===doc.id?doc.couleur:C.bd}`,
                  padding:"12px 14px",cursor:"pointer",transition:"all .15s",
                  boxShadow:docPreview?.id===doc.id?"0 0 0 3px "+doc.couleur+"22":"none"}}>
                <div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontSize:22,lineHeight:1}}>{doc.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:800,color:C.tx,marginBottom:2}}>{doc.label}</div>
                    <div style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,display:"inline-block",
                      background:doc.couleur+"15",color:doc.couleur}}>
                      {doc.cat}
                    </div>
                  </div>
                  <div style={{fontSize:9,color:C.tx3,fontStyle:"italic",whiteSpace:"nowrap"}}>{doc.delai}</div>
                </div>
                <div style={{fontSize:11,color:C.tx2,lineHeight:1.4,marginBottom:8}}>{doc.desc}</div>
                <button
                  onClick={e=>{e.stopPropagation();setDocPreview(doc);}}
                  style={{width:"100%",padding:"6px",borderRadius:7,fontSize:11,fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit",border:`1px solid ${doc.couleur}`,
                    background:doc.couleur,color:"#fff"}}>
                  ⚡ Générer ce document
                </button>
              </div>
            ))}
          </div>

          {/* Panneau de prévisualisation */}
          {docPreview&&(
            <div style={{background:"#fff",borderRadius:14,border:`2px solid ${docPreview.couleur}`,
              padding:20,marginBottom:16}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14}}>
                <div style={{fontSize:32}}>{docPreview.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:C.tx}}>{docPreview.label}</div>
                  <div style={{fontSize:12,color:C.tx2,marginTop:2}}>{docPreview.desc}</div>
                </div>
                <button onClick={()=>setDocPreview(null)}
                  style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {/* Champs inclus */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx,marginBottom:8}}>📌 Champs inclus</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {docPreview.champs.map((ch,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,
                        padding:"4px 8px",borderRadius:6,background:"#F9FAFB",border:`1px solid ${C.bd}`}}>
                        <span style={{color:docPreview.couleur,fontWeight:700,fontSize:9}}>▸</span>
                        <span style={{color:C.tx2}}>{ch}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulation de contenu */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.tx,marginBottom:8}}>📄 Aperçu du document</div>
                  <div style={{background:"#F9FAFB",borderRadius:10,border:`1px solid ${C.bd}`,
                    padding:14,fontFamily:"Georgia,serif",fontSize:10,color:"#374151",lineHeight:1.6}}>
                    <div style={{textAlign:"center",marginBottom:10,borderBottom:`1px solid ${C.bd}`,paddingBottom:8}}>
                      <div style={{fontWeight:900,fontSize:12,color:docPreview.couleur}}>APPLITAG</div>
                      <div style={{fontWeight:700,fontSize:11,marginTop:2}}>{docPreview.label.toUpperCase()}</div>
                      <div style={{fontSize:9,color:"#9CA3AF",marginTop:2}}>
                        Généré le {new Date().toLocaleDateString("fr-FR")} · Référence : [AUTO]
                      </div>
                    </div>
                    {docPreview.champs.slice(0,5).map((ch,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:3}}>
                        <span style={{fontWeight:700,minWidth:110,color:"#374151"}}>{ch} :</span>
                        <span style={{color:"#6B7280",fontStyle:"italic"}}>
                          {i===0?"[Automatique depuis dossier]":i===1?"[Sélectionné]":"…"}
                        </span>
                      </div>
                    ))}
                    <div style={{textAlign:"center",marginTop:10,color:"#D1D5DB",fontSize:9}}>
                      ·  ·  ·  {docPreview.champs.length - 5} champs supplémentaires  ·  ·  ·
                    </div>
                    <div style={{marginTop:10,borderTop:`1px solid ${C.bd}`,paddingTop:8,
                      fontSize:9,color:"#9CA3AF",textAlign:"center"}}>
                      Document généré par APPLITAG · ALTEGAD · Confidentiel
                    </div>
                  </div>

                  <div style={{marginTop:10,display:"flex",gap:6}}>
                    <button style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",border:"none",
                      background:docPreview.couleur,color:"#fff"}}>
                      ⬇️ Télécharger PDF
                    </button>
                    <button style={{flex:1,padding:"8px",borderRadius:8,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"inherit",background:"transparent",
                      border:`1px solid ${C.bd}`,color:C.tx2}}>
                      ✉️ Envoyer par mail
                    </button>
                  </div>
                  <div style={{marginTop:6,fontSize:9,color:C.tx3,textAlign:"center"}}>
                    Le PDF sera archivé automatiquement dans le dossier concerné
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORIQUE */}
      {onglet==="historique"&&(
        <div>
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`,
              display:"flex",gap:12,alignItems:"center",background:"#F9FAFB"}}>
              <div style={{fontSize:12,fontWeight:700,color:C.tx,flex:1}}>
                Documents générés et archivés
              </div>
              <div style={{fontSize:10,color:C.tx3}}>Triés par date décroissante</div>
            </div>
            {DOCS_HISTORIQUE.map((doc,i)=>{
              const type = getDocType(doc.type);
              const st = STATUT_DOC[doc.statut]||STATUT_DOC.brouillon;
              return (
                <div key={doc.id} style={{
                  display:"grid",gridTemplateColumns:"36px 1fr auto",gap:10,
                  alignItems:"center",padding:"10px 14px",
                  borderBottom:i<DOCS_HISTORIQUE.length-1?`1px solid ${C.bd}`:"none",
                  background:i%2===0?"#fff":"#FAFAFA"}}>
                  <div style={{fontSize:20,textAlign:"center"}}>{type?.icon||"📄"}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:C.tx}}>{doc.ref}</div>
                    <div style={{display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,color:C.tx3}}>
                        {new Date(doc.date).toLocaleDateString("fr-FR")}
                      </span>
                      <span style={{fontSize:10,color:C.tx3}}>{type?.label||doc.type}</span>
                      <span style={{fontSize:10,color:C.tx3}}>Par {doc.auteur}</span>
                      <span style={{fontSize:10,color:C.tx3}}>{doc.taille}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,
                      background:st.bg,color:st.color}}>
                      {st.icon} {st.label}
                    </span>
                    <button style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:600,
                      cursor:"pointer",fontFamily:"inherit",border:`1px solid ${C.bd}`,
                      background:"transparent",color:C.tx2}}>
                      ⬇️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats archives */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12}}>
            {[
              ["📄","Total docs",DOCS_HISTORIQUE.length+" docs","#1E5B3A"],
              ["✅","Signés",DOCS_HISTORIQUE.filter(d=>d.statut==="signé").length+" docs","#059669"],
              ["📦","Validés",DOCS_HISTORIQUE.filter(d=>d.statut==="validé"||d.statut==="émis").length+" docs","#0369A1"],
              ["🗃️","Archivés",DOCS_HISTORIQUE.filter(d=>d.statut==="archivé").length+" docs","#6B7280"],
            ].map(([ico,label,val,col])=>(
              <div key={label} style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:10,
                padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:20}}>{ico}</div>
                <div style={{fontSize:16,fontWeight:800,color:col}}>{val}</div>
                <div style={{fontSize:10,color:C.tx3}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── TERRITOIRE — DOUBLE LECTURE CARTOFOB / APPLITAG ────────────

// Données CARTOFOB simulées par territoire (source IFN / Observatoire biomasse)
const TERRITOIRES = [
  {
    id:"allier",
    nom:"Allier (03)",
    niveau:"Département",
    surfaceForestiere:175000,    // ha
    volumeSurPied:36200000,      // m³
    productionBiologique:1420000,// m³/an
    mortalite:185000,            // m³/an
    prelevements:680000,         // m³/an
    recolteBoisOeuvre:290000,    // m³/an
    recolteBoisEnergie:310000,   // m³/an
    disponibiliteFuture:145000,  // m³/an horizon 10 ans
    chaufferies:[
      {nom:"Réseau chaleur Moulins",puissance:4.2,conso:8400},
      {nom:"Chaufferie Vichy Agglo",puissance:6.8,conso:13600},
      {nom:"Chaufferie St-Amand",puissance:1.2,conso:2400},
      {nom:"Lycée agricole Moulins",puissance:0.5,conso:1000},
    ],
    bassinAppro:85,              // km rayon moyen
    refCartofob:"IFN-NFI_2022 / IGN — Observatoire de la biomasse",
    anneeRef:2022,
    dateConsultation:"2026-07-01",
  },
  {
    id:"troncon",
    nom:"EPCI Tronçais-Bocage",
    niveau:"EPCI",
    surfaceForestiere:28400,
    volumeSurPied:6800000,
    productionBiologique:218000,
    mortalite:28000,
    prelevements:94000,
    recolteBoisOeuvre:42000,
    recolteBoisEnergie:46000,
    disponibiliteFuture:22000,
    chaufferies:[
      {nom:"Chaufferie St-Amand",puissance:1.2,conso:2400},
      {nom:"École Cérilly",puissance:0.08,conso:160},
    ],
    bassinAppro:35,
    refCartofob:"IFN-NFI_2022 / IGN — Observatoire de la biomasse",
    anneeRef:2022,
    dateConsultation:"2026-07-01",
  },
];

// Données APPLITAG vérifiées terrain — pour le même territoire
const APPLITAG_TERRAIN = {
  allier:{
    parcelles:12,
    proprietairesContacates:34,
    volumesEstimes:4820,     // m³ — somme visites terrain
    contratsSignes:7,
    lotsEnCours:5,
    lotsLivres:3,
    volumesLivres:1240,      // m³ réellement livrés
    surfaceCouvertHa:118,
    periodeRef:"2025–2026",
    alertes:[
      "3 lots avec contraintes d'accès non résolues",
      "2 propriétaires sans réponse depuis 60 jours",
    ],
  },
  troncon:{
    parcelles:4,
    proprietairesContacates:11,
    volumesEstimes:1380,
    contratsSignes:3,
    lotsEnCours:2,
    lotsLivres:1,
    volumesLivres:490,
    surfaceCouvertHa:36,
    periodeRef:"2025–2026",
    alertes:[],
  },
};

const INDICATEURS_CARTOFOB = [
  {id:"surface",      icon:"🌲", label:"Surface forestière",  unite:"ha",    fmt:v=>v.toLocaleString("fr-FR"), key:"surfaceForestiere"},
  {id:"volume",       icon:"📦", label:"Volume sur pied",     unite:"m³",    fmt:v=>`${(v/1000000).toFixed(1)} Mm³`, key:"volumeSurPied"},
  {id:"production",   icon:"📈", label:"Production biologique",unite:"m³/an",fmt:v=>v.toLocaleString("fr-FR"), key:"productionBiologique"},
  {id:"mortalite",    icon:"💀", label:"Mortalité",           unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"mortalite"},
  {id:"prelevements", icon:"🪓", label:"Prélèvements totaux", unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"prelevements"},
  {id:"bo",           icon:"🪵", label:"Récolte bois d'œuvre",unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"recolteBoisOeuvre"},
  {id:"be",           icon:"🔥", label:"Récolte bois énergie",unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"recolteBoisEnergie"},
  {id:"dispo",        icon:"🔮", label:"Disponibilité future",unite:"m³/an", fmt:v=>v.toLocaleString("fr-FR"), key:"disponibiliteFuture",
   note:"Horizon 10 ans — estimation prospective, non commerciale"},
];

export const SectionTerritoire = () => {
  const [territoireId, setTerritoireId] = useState("allier");
  const [couche, setCouche] = useState("comparaison"); // cartofob | applitag | comparaison
  const T = TERRITOIRES.find(t=>t.id===territoireId);
  const A = APPLITAG_TERRAIN[territoireId];

  const tauxCouvertureParcelles = T ? Math.round(A.surfaceCouvertHa/T.surfaceForestiere*100*10)/10 : 0;
  const tauxVolumeSecu = T ? Math.round(A.volumesLivres/T.recolteBoisEnergie*100*10)/10 : 0;

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>🗺️ Double lecture territoire</div>
        <div style={{fontSize:13,color:C.tx2}}>
          Données publiques CARTOFOB · Données terrain APPLITAG · Ne pas confondre les deux registres
        </div>
      </div>

      {/* Bannière épistémique — non masquable */}
      <div style={{background:"#FFFBEB",border:"2px solid #F59E0B",borderRadius:12,
        padding:"12px 16px",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:800,color:"#92400E",marginBottom:6}}>
          ⚠️ Précautions d'usage obligatoires
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,color:"#78350F"}}>
          {[
            "Ne pas présenter une disponibilité statistique comme un volume commercial disponible",
            "Toujours indiquer la source, l'année de référence et le niveau géographique",
            "Ne pas mélanger estimation prospective et mesure terrain vérifiée",
            "Toute donnée publique doit être confirmée par qualification terrain avant intégration au plan d'approvisionnement",
          ].map((r,i)=>(
            <div key={i} style={{display:"flex",gap:6,alignItems:"flex-start",
              padding:"6px 8px",background:"rgba(245,158,11,.1)",borderRadius:6}}>
              <span style={{flexShrink:0,color:"#D97706"}}>•</span>
              <span style={{lineHeight:1.4}}>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sélecteur territoire + vue */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        flexWrap:"wrap",gap:10,marginBottom:16}}>
        <div style={{display:"flex",gap:6}}>
          {TERRITOIRES.map(t=>(
            <button key={t.id} onClick={()=>setTerritoireId(t.id)}
              style={{padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,
                cursor:"pointer",fontFamily:"inherit",
                border:`1px solid ${territoireId===t.id?"#1E5B3A":C.bd}`,
                background:territoireId===t.id?"#1E5B3A":"transparent",
                color:territoireId===t.id?"#fff":C.tx2}}>
              📍 {t.nom}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:4}}>
          {[
            ["comparaison","⚖️ Comparaison"],
            ["cartofob","🛰️ CARTOFOB"],
            ["applitag","🌲 APPLITAG terrain"],
          ].map(([v,l])=>(
            <button key={v} onClick={()=>setCouche(v)}
              style={{padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,
                cursor:"pointer",fontFamily:"inherit",
                border:`1px solid ${couche===v?( v==="cartofob"?"#6B7280":v==="applitag"?"#1E5B3A":"#7C3AED"):C.bd}`,
                background:couche===v?(v==="cartofob"?"#6B7280":v==="applitag"?"#1E5B3A":"#7C3AED"):"transparent",
                color:couche===v?"#fff":C.tx2}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Source CARTOFOB — toujours visible */}
      <div style={{background:"#F3F4F6",border:"1px solid #D1D5DB",borderRadius:8,
        padding:"7px 12px",marginBottom:14,display:"flex",gap:16,flexWrap:"wrap",fontSize:10,color:"#6B7280"}}>
        <span>🛰️ Source : <strong style={{color:"#374151"}}>{T.refCartofob}</strong></span>
        <span>📅 Année de référence : <strong style={{color:"#374151"}}>{T.anneeRef}</strong></span>
        <span>🗓️ Consulté le : <strong style={{color:"#374151"}}>{new Date(T.dateConsultation).toLocaleDateString("fr-FR")}</strong></span>
        <span>📐 Niveau : <strong style={{color:"#374151"}}>{T.niveau}</strong></span>
      </div>

      {/* VUE COMPARAISON */}
      {couche==="comparaison"&&(
        <div>
          {/* KPIs de mise en regard */}
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,marginBottom:16,alignItems:"stretch"}}>

            {/* Colonne CARTOFOB */}
            <div style={{background:"#F9FAFB",border:"2px solid #9CA3AF",borderRadius:14,overflow:"hidden"}}>
              <div style={{background:"#6B7280",color:"#fff",padding:"10px 14px",fontSize:12,fontWeight:700}}>
                🛰️ Données publiques CARTOFOB
                <div style={{fontSize:9,fontWeight:400,opacity:.8,marginTop:2}}>
                  Statistiques territoriales — {T.anneeRef} — {T.niveau}
                </div>
              </div>
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {[
                  ["Surface forestière",T.surfaceForestiere.toLocaleString("fr-FR")+" ha","🌲"],
                  ["Production biologique",T.productionBiologique.toLocaleString("fr-FR")+" m³/an","📈"],
                  ["Récolte bois énergie",T.recolteBoisEnergie.toLocaleString("fr-FR")+" m³/an","🔥"],
                  ["Disponibilité future *",T.disponibiliteFuture.toLocaleString("fr-FR")+" m³/an","🔮"],
                  ["Mortalité",T.mortalite.toLocaleString("fr-FR")+" m³/an","💀"],
                ].map(([k,v,ico])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"6px 8px",borderRadius:7,background:"#fff",border:"1px solid #E5E7EB",fontSize:11}}>
                    <span style={{color:"#6B7280"}}>{ico} {k}</span>
                    <span style={{fontWeight:700,color:"#374151"}}>{v}</span>
                  </div>
                ))}
                <div style={{fontSize:9,color:"#9CA3AF",fontStyle:"italic",marginTop:4,lineHeight:1.4}}>
                  * Estimation prospective horizon 10 ans — non commercialisable en l'état
                </div>
              </div>
            </div>

            {/* Séparateur avec ratio */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",gap:8,padding:"0 8px"}}>
              <div style={{width:2,flex:1,background:"linear-gradient(to bottom,#E5E7EB,#7C3AED,#E5E7EB)"}}/>
              <div style={{background:"#7C3AED",color:"#fff",borderRadius:8,padding:"8px 10px",
                textAlign:"center",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                <div style={{fontSize:18,fontWeight:900}}>{tauxCouvertureParcelles}%</div>
                <div style={{fontSize:9,opacity:.85}}>surface</div>
                <div style={{fontSize:9,opacity:.85}}>couverte</div>
              </div>
              <div style={{width:2,flex:1,background:"linear-gradient(to bottom,#E5E7EB,#7C3AED,#E5E7EB)"}}/>
            </div>

            {/* Colonne APPLITAG */}
            <div style={{background:"#F0FDF4",border:"2px solid #1E5B3A",borderRadius:14,overflow:"hidden"}}>
              <div style={{background:"#1E5B3A",color:"#fff",padding:"10px 14px",fontSize:12,fontWeight:700}}>
                🌲 Données terrain APPLITAG
                <div style={{fontSize:9,fontWeight:400,opacity:.8,marginTop:2}}>
                  Mesures vérifiées · {A.periodeRef} · Opérationnel
                </div>
              </div>
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                {[
                  ["Parcelles identifiées",A.parcelles+" lots","🗂️"],
                  ["Propriétaires contactés",A.proprietairesContacates+" personnes","👥"],
                  ["Volume estimé terrain",A.volumesEstimes.toLocaleString("fr-FR")+" m³","📐"],
                  ["Contrats signés",A.contratsSignes+" lots","✅"],
                  ["Volume réellement livré",A.volumesLivres.toLocaleString("fr-FR")+" m³","📦"],
                ].map(([k,v,ico])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"6px 8px",borderRadius:7,background:"#fff",border:"1px solid #BBF7D0",fontSize:11}}>
                    <span style={{color:"#065F46"}}>{ico} {k}</span>
                    <span style={{fontWeight:700,color:"#064E3B"}}>{v}</span>
                  </div>
                ))}
                <div style={{fontSize:9,color:"#047857",fontStyle:"italic",marginTop:4,lineHeight:1.4}}>
                  Données vérifiées par visite terrain — intégrables au plan d'approvisionnement
                </div>
              </div>
            </div>
          </div>

          {/* Ratio volume sécurisé */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
              Volume bois énergie : potentiel statistique vs volume sécurisé APPLITAG
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{fontSize:11,color:"#6B7280",whiteSpace:"nowrap",width:160}}>
                🛰️ Récolte BE territoire
              </div>
              <div style={{flex:1,height:20,borderRadius:10,background:"#E5E7EB",overflow:"hidden",position:"relative"}}>
                <div style={{height:"100%",width:"100%",background:"#D1D5DB",borderRadius:10}}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                  paddingLeft:8,fontSize:10,color:"#6B7280",fontWeight:600}}>
                  {T.recolteBoisEnergie.toLocaleString("fr-FR")} m³/an (statistique {T.anneeRef})
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
              <div style={{fontSize:11,color:"#065F46",whiteSpace:"nowrap",width:160}}>
                🌲 Livré APPLITAG
              </div>
              <div style={{flex:1,height:20,borderRadius:10,background:"#E5E7EB",overflow:"hidden",position:"relative"}}>
                <div style={{height:"100%",borderRadius:10,background:"#1E5B3A",
                  width:`${Math.min(tauxVolumeSecu,100)}%`}}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                  paddingLeft:8,fontSize:10,color:"#fff",fontWeight:700}}>
                  {A.volumesLivres.toLocaleString("fr-FR")} m³ ({tauxVolumeSecu}% du stat.)
                </div>
              </div>
            </div>
            <div style={{marginTop:8,padding:"8px 10px",background:"#FFFBEB",borderRadius:7,
              fontSize:10,color:"#92400E",lineHeight:1.5}}>
              ⚠️ Le volume livré APPLITAG représente <strong>{tauxVolumeSecu}%</strong> de la récolte statistique territoriale.
              Cet écart reflète les contraintes de desserte, propriété, qualité et concurrence locale — pas un manque de ressource.
            </div>
          </div>

          {/* Chaufferies locales */}
          <div style={{background:"#fff",borderRadius:12,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>
              🔥 Chaufferies et bassins d'approvisionnement — {T.nom}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {T.chaufferies.map(ch=>(
                <div key={ch.nom} style={{background:"#FEF3C7",borderRadius:8,
                  border:"1px solid #FCD34D",padding:"10px 12px",fontSize:11}}>
                  <div style={{fontWeight:700,color:"#92400E",marginBottom:4}}>{ch.nom}</div>
                  <div style={{display:"flex",justifyContent:"space-between",color:"#B45309"}}>
                    <span>Puissance : {ch.puissance} MW</span>
                    <span>Conso. : {ch.conso.toLocaleString("fr-FR")} t/an</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:8,fontSize:10,color:C.tx2}}>
              Rayon moyen bassin d'approvisionnement : {T.bassinAppro} km
              <span style={{marginLeft:8,color:"#6B7280"}}>Source : CARTOFOB {T.anneeRef}</span>
            </div>
          </div>
        </div>
      )}

      {/* VUE CARTOFOB SEULE */}
      {couche==="cartofob"&&(
        <div>
          <div style={{background:"#F9FAFB",border:"2px solid #9CA3AF",borderRadius:14,
            padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:18}}>🛰️</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#374151"}}>CARTOFOB — {T.nom}</div>
                <div style={{fontSize:10,color:"#9CA3AF"}}>
                  {T.refCartofob} · Réf. {T.anneeRef} · Consulté {new Date(T.dateConsultation).toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {INDICATEURS_CARTOFOB.map(ind=>(
                <div key={ind.id} style={{background:"#fff",borderRadius:8,border:"1px solid #E5E7EB",
                  padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:"#9CA3AF",marginBottom:2}}>
                    {ind.icon} {ind.label} <span style={{fontSize:9}}>({ind.unite})</span>
                  </div>
                  <div style={{fontSize:15,fontWeight:800,color:"#374151"}}>
                    {ind.fmt(T[ind.key])}
                  </div>
                  {ind.note&&(
                    <div style={{fontSize:9,color:"#EF4444",marginTop:2,fontStyle:"italic"}}>{ind.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{background:"#FEF9C3",border:"1px solid #FDE047",borderRadius:8,
            padding:"10px 14px",fontSize:11,color:"#713F12",lineHeight:1.5}}>
            <strong>Rappel :</strong> Ces données sont des statistiques d'inventaire et de modélisation à l'échelle {T.niveau.toLowerCase()}.
            Elles ne constituent pas une offre de bois disponible à la vente. Elles doivent être confirmées par une prospection terrain avant toute intégration dans un plan d'approvisionnement.
          </div>
        </div>
      )}

      {/* VUE APPLITAG SEULE */}
      {couche==="applitag"&&(
        <div>
          <div style={{background:"#F0FDF4",border:"2px solid #1E5B3A",borderRadius:14,
            padding:"14px 16px",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <span style={{fontSize:18}}>🌲</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#065F46"}}>APPLITAG — Données terrain vérifiées</div>
                <div style={{fontSize:10,color:"#047857"}}>{T.nom} · {A.periodeRef} · Opérationnel</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
              {[
                {icon:"🗂️",label:"Parcelles identifiées",val:A.parcelles},
                {icon:"👥",label:"Propriétaires contactés",val:A.proprietairesContacates},
                {icon:"📐",label:"Surface couverte",val:`${A.surfaceCouvertHa} ha`},
                {icon:"📋",label:"Volumes estimés terrain",val:`${A.volumesEstimes.toLocaleString("fr-FR")} m³`},
                {icon:"✅",label:"Contrats signés",val:`${A.contratsSignes} lots`},
                {icon:"📦",label:"Volume réellement livré",val:`${A.volumesLivres.toLocaleString("fr-FR")} m³`},
              ].map(k=>(
                <div key={k.label} style={{background:"#fff",borderRadius:8,border:"1px solid #BBF7D0",
                  padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:18}}>{k.icon}</div>
                  <div style={{fontSize:16,fontWeight:800,color:"#065F46"}}>{k.val}</div>
                  <div style={{fontSize:10,color:"#047857",lineHeight:1.3}}>{k.label}</div>
                </div>
              ))}
            </div>

            {A.alertes.length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#92400E",marginBottom:6}}>⚠️ Points d'attention</div>
                {A.alertes.map((al,i)=>(
                  <div key={i} style={{fontSize:11,padding:"6px 10px",background:"#FEF3C7",
                    borderRadius:6,border:"1px solid #FCD34D",color:"#92400E",marginBottom:5}}>
                    {al}
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:8,padding:"8px 10px",background:"#D1FAE5",borderRadius:7,
              fontSize:10,color:"#065F46",lineHeight:1.5,border:"1px solid #6EE7B7"}}>
              ✅ Ces données sont issues de visites terrain géolocalisées, de contrats signés et de bons de livraison vérifiés.
              Elles peuvent être intégrées directement dans un plan d'approvisionnement.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── PLANNING ADMIN ─────────────────────────────────────────────
/* ═══════════════════════════════════════════════════════════════
   HUB ALERTES — agrégateur cross-modules
═══════════════════════════════════════════════════════════════ */
export const HubAlertes = ({contacts=[], livraisons=[], onGoTo}) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);

  // ── Collecte des signaux depuis chaque module ─────────────────
  const alertes = useMemo(()=>{
    const arr = [];

    // 1. Anomalies voiries urgentes non traitées
    signalementsGet().filter(s=>s.urgence==="rouge"&&s.statut==="ouvert").forEach(s=>{
      arr.push({
        id:"sg_"+s.id, gravite:0, source:"Voiries", sourceIcon:"🚧",
        titre:"Accès bloqué — "+( s.tronconNom||s.commune||"Tronçon"),
        detail: s.commentaire||(s.auteur+" · "+( s.commune||"")),
        date: s.createdAt?.slice(0,10)||todayStr,
        action:"Voir anomalie", goTo:"applitag_data",
      });
    });

    // 2. Permis chantier expirés ou expirant aujourd'hui
    permisLocalGet().filter(p=>p.date&&p.date<=todayStr&&p.statut!=="cloture").forEach(p=>{
      const expired = p.date < todayStr;
      arr.push({
        id:"pm_"+p.id, gravite: expired?1:2, source:"Permis chantier", sourceIcon:"🔥",
        titre:(expired?"Permis expiré — ":"Permis expire aujourd'hui — ")+(p.chantier||p.commune||""),
        detail:"Niveau risque "+( p.niveauRisque||"?")+" · Commune : "+(p.commune||"—"),
        date: p.date,
        action:"Voir permis", goTo:"permis_incendie",
      });
    });

    // 3. Lots sans transport depuis plus de 14 jours
    contacts.filter(c=>c.statutLot==="VALIDE_EXPLOITATION"||c.statutLot==="EN_COURS_EXPLOITATION").forEach(c=>{
      const lastUpdate = new Date(c.updatedAt||c.createdAt||0);
      const joursEcoules = Math.floor((today-lastUpdate)/(1000*60*60*24));
      if (joursEcoules > 14) arr.push({
        id:"lot_"+c.id, gravite:2, source:"Lots", sourceIcon:"🌲",
        titre:"Lot en exploitation sans activité depuis "+joursEcoules+" j",
        detail:(c.lotNumero||"LOT")+" · "+(c.commune||"")+" · "+(c.entrepriseEtf||"ETF"),
        date: lastUpdate.toISOString().slice(0,10),
        action:"Ouvrir le lot", goTo:"lots",
      });
    });

    // 4. Livraisons avec humidité hors seuil RED (>25%)
    livraisons.filter(l=>l.humidite&&parseFloat(l.humidite)>25).forEach(l=>{
      arr.push({
        id:"liv_"+l.id, gravite:2, source:"Conformité RED", sourceIcon:"🇪🇺",
        titre:"Humidité hors seuil RED — "+(l.numeroBL||"BL"),
        detail:`${l.humidite}% mesuré · Seuil RED : 25% · ${l.nomDestination||""}`,
        date: (l.date||l.createdAt||"").slice(0,10),
        action:"Voir conformité", goTo:"conformite_red",
      });
    });

    // 5. Anomalies voiries orange non traitées depuis +7 jours
    const il7a = new Date(today); il7a.setDate(il7a.getDate()-7);
    signalementsGet().filter(s=>s.urgence==="orange"&&s.statut==="ouvert"&&s.createdAt<il7a.toISOString()).forEach(s=>{
      arr.push({
        id:"sgo_"+s.id, gravite:3, source:"Voiries", sourceIcon:"🚧",
        titre:"Dégradation non traitée depuis +7 j — "+(s.tronconNom||s.commune||""),
        detail: s.commentaire||(s.auteur+" · "+(s.commune||"")),
        date: s.createdAt?.slice(0,10)||todayStr,
        action:"Voir anomalie", goTo:"applitag_data",
      });
    });

    return arr.sort((a,b)=>a.gravite-b.gravite);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[contacts,livraisons]); // today/todayStr : new Date() à chaque render — les ajouter invaliderait le memo

  const GRAVITE = [
    {label:"Bloquant",  bg:"#FEE2E2", col:"#991B1B", dot:"#EF4444"},
    {label:"Urgent",    bg:"#FFEDD5", col:"#C2410C", dot:"#F97316"},
    {label:"Important", bg:"#FEF3C7", col:"#92400E", dot:"#F59E0B"},
    {label:"Attention", bg:"#DBEAFE", col:"#1E3A5F", dot:"#3B82F6"},
  ];

  return (
    <div>
      {/* Bandeau résumé */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10,marginBottom:16}}>
        {[
          {label:"Bloquant",  n:alertes.filter(a=>a.gravite===0).length, col:"#991B1B", bg:"#FEE2E2"},
          {label:"Urgent",    n:alertes.filter(a=>a.gravite===1).length, col:"#C2410C", bg:"#FFEDD5"},
          {label:"Important", n:alertes.filter(a=>a.gravite===2).length, col:"#92400E", bg:"#FEF3C7"},
          {label:"Total",     n:alertes.length, col:"#1E3A5F", bg:"#DBEAFE"},
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
            <div style={{fontSize:28,fontWeight:800,color:s.col}}>{s.n}</div>
            <div style={{fontSize:11,fontWeight:700,color:s.col,opacity:.8}}>{s.label}</div>
          </div>
        ))}
      </div>

      {alertes.length===0 && (
        <div style={{background:C.bg2,borderRadius:14,padding:40,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:8}}>✅</div>
          <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Aucune alerte active</div>
          <div style={{fontSize:13,color:C.tx2}}>Tous les modules sont en ordre. Bonne journée !</div>
        </div>
      )}

      {alertes.map(a=>{
        const g = GRAVITE[a.gravite]||GRAVITE[3];
        return (
          <div key={a.id} style={{background:"#fff",border:`1px solid ${C.bd}`,borderRadius:12,
            padding:"14px 16px",marginBottom:10,display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:g.dot,flexShrink:0,marginTop:5}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,
                  background:g.bg,color:g.col}}>{g.label}</span>
                <span style={{fontSize:11,color:C.tx3}}>{a.sourceIcon} {a.source}</span>
                <span style={{fontSize:11,color:C.tx3,marginLeft:"auto"}}>{a.date}</span>
              </div>
              <div style={{fontWeight:700,fontSize:13,color:C.tx,marginBottom:2}}>{a.titre}</div>
              <div style={{fontSize:12,color:C.tx2}}>{a.detail}</div>
            </div>
            <button onClick={()=>onGoTo(a.goTo)} style={{
              flexShrink:0,height:34,borderRadius:8,border:`1px solid ${C.bd}`,
              padding:"0 12px",fontSize:11,fontWeight:700,cursor:"pointer",
              background:C.bg,color:C.tx,whiteSpace:"nowrap"}}>
              {a.action} →
            </button>
          </div>
        );
      })}
    </div>
  );
};

const PLANNING_TYPES = {
  visite_terrain:   {label:"Visite terrain",   color:"#1E5B3A", bg:"#E8F5E9", icon:"🔭"},
  date_limite:      {label:"Date limite",      color:"#B91C1C", bg:"#FEE2E2", icon:"⏰"},
  transport:        {label:"Transport",        color:"#6D28D9", bg:"#EDE9FE", icon:"🚛"},
  livraison:        {label:"Livraison",        color:"#0369A1", bg:"#E0F2FE", icon:"📦"},
  dechiquetage:     {label:"Déchiquetage",     color:"#92400E", bg:"#FEF3C7", icon:"🌀"},
  exploitation:     {label:"Exploitation",     color:"#065F46", bg:"#D1FAE5", icon:"🪓"},
  replantation:     {label:"Replantation",     color:"#166534", bg:"#DCFCE7", icon:"🌱"},
  permis_incendie:  {label:"Permis chantier",  color:"#991B1B", bg:"#FEE2E2", icon:"🔥"},
  restriction_feu:  {label:"Restriction feu",  color:"#7F1D1D", bg:"#FEE2E2", icon:"🚫🔥"},
  anomalie_urgente: {label:"Anomalie voirie",  color:"#C2410C", bg:"#FFEDD5", icon:"🚧"},
};

const buildPlanningEvents = (contacts, visites, transports, livraisons) => {
  const events = [];

  // ── Permis chantier incendie ──────────────────────────────────
  permisLocalGet().forEach(p => {
    if (p.date) events.push({
      date: p.date, type: "permis_incendie",
      titre: `Permis chantier — ${p.chantier||p.commune||"Chantier"}`,
      sous: `${p.commune||""} · Niveau ${p.niveauRisque||"?"}`,
      lotNumero: null, lotId: null,
    });
    // Si restriction active ce jour-là
    if (p.restrictionActive && p.date) events.push({
      date: p.date, type: "restriction_feu",
      titre: `🚫 Restriction feu — ${p.commune||""}`,
      sous: p.mesures||"Vérifier arrêté préfectoral",
      lotNumero: null, lotId: null,
    });
  });

  // ── Anomalies voiries urgentes (rouge) ───────────────────────
  signalementsGet().filter(s => s.urgence === "rouge" && s.statut === "ouvert").forEach(s => {
    if (s.createdAt) events.push({
      date: s.createdAt.slice(0,10), type: "anomalie_urgente",
      titre: `🚧 Voirie bloquée — ${s.tronconNom||s.commune||"Tronçon"}`,
      sous: `${s.auteur||""} · ${s.commune||""}`,
      lotNumero: null, lotId: null,
    });
  });
  contacts.forEach(c=>{
    if (c.dateLimite) events.push({
      date:c.dateLimite, type:"date_limite",
      titre:`Date limite — ${c.lotNumero||c.nom}`,
      sous:`${c.commune||""} · ${c.nom||""} ${c.prenom||""}`,
      lotNumero:c.lotNumero, lotId:c.id,
    });
    if (c.dateVisitePrevue) events.push({
      date:c.dateVisitePrevue, type:"visite_terrain",
      titre:`Visite prévue — ${c.lotNumero||c.nom}`,
      sous:`${c.commune||""} · ${c.nom||""} ${c.prenom||""}`,
      lotNumero:c.lotNumero, lotId:c.id,
    });
    if (c.statutLot==="EN_COURS_EXPLOITATION"||c.statutLot==="VALIDE_EXPLOITATION") {
      const dateRef = c.dateDebutExploitation||c.updatedAt||c.createdAt;
      if (dateRef) events.push({
        date:dateRef.slice(0,10), type:"exploitation",
        titre:`Exploitation en cours — ${c.lotNumero}`,
        sous:`${c.commune||""} · ${c.entrepriseEtf||"ETF"}`,
        lotNumero:c.lotNumero, lotId:c.id,
      });
    }
  });
  visites.forEach(v=>{
    if (v.date) events.push({
      date:v.date, type:"visite_terrain",
      titre:`Visite terrain — ${v.lotNumero||""}`,
      sous:`${v.commune||""} · ${v.mandataire||""}`,
      lotNumero:v.lotNumero, lotId:v.lotId,
      heure:null,
    });
    if (v.dateLimite) events.push({
      date:v.dateLimite, type:"date_limite",
      titre:`Échéance — ${v.lotNumero||""}`,
      sous:`${v.commune||""}`,
      lotNumero:v.lotNumero, lotId:v.lotId,
    });
    if (v.replantation==="oui"&&v.dateReplant) events.push({
      date:v.dateReplant, type:"replantation",
      titre:`Replantation — ${v.lotNumero||""}`,
      sous:`${v.essenceReplanT||""} · ${v.surfaceReplant?v.surfaceReplant+" ha":""}`,
      lotNumero:v.lotNumero, lotId:v.lotId,
    });
  });
  transports.forEach(t=>{
    const dateStr = t.heureDebut ? t.heureDebut.slice(0,10) : t.createdAt?.slice(0,10);
    if (!dateStr) return;
    const heure = t.heureDebut?.slice(11,16)||null;
    events.push({
      date:dateStr, type:"transport", heure,
      titre:`Transport — ${t.numeroCMR||""}`,
      sous:`${t.immatTracteur||""} · ${t.nomDestination||""}`,
      lotNumero:t.lotNumero, lotId:t.lotId,
      enCours: t.statut==="EN_LIVRAISON",
    });
  });
  livraisons.forEach(l=>{
    const dateStr = (l.date||l.createdAt||"").slice(0,10);
    if (!dateStr) return;
    const heure = l.date?.slice(11,16)||null;
    events.push({
      date:dateStr, type:"livraison", heure,
      titre:`Livraison — ${l.numeroBL||"BL"}`,
      sous:`${(l.poidsNet||l.poidsBrut)?(l.poidsNet||l.poidsBrut)+" t · ":""}${l.nomDestination||""}`,
      lotNumero:l.lotNumero, lotId:l.lotId,
    });
  });
  return events.sort((a,b)=>(a.date+""+(a.heure||""))>"" ? a.date.localeCompare(b.date) : 0);
};

export const SectionPlanning = ({contacts=[], visites=[], transports=[], livraisons=[], onSelectLot}) => {
  const [now, setNow] = useState(new Date());
  const [moisOffset, setMoisOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(()=>{
    const timer = setInterval(()=>setNow(new Date()), 60000);
    return ()=>clearInterval(timer);
  },[]);

  const events = useMemo(()=>buildPlanningEvents(contacts,visites,transports,livraisons),[contacts,visites,transports,livraisons]);

  const viewDate = new Date(now.getFullYear(), now.getMonth()+moisOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const nbJours = new Date(viewYear, viewMonth+1, 0).getDate();
  const premierJour = (viewDate.getDay()+6)%7; // lundi=0
  const todayStr = now.toISOString().slice(0,10);
  const moisLabel = viewDate.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});

  const eventsByDay = {};
  events.forEach(e=>{
    if (!e.date) return;
    const d = e.date.slice(0,10);
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  // Événements du jour sélectionné ou d'aujourd'hui
  const focusDay = selectedDay || todayStr;
  const focusEvents = eventsByDay[focusDay]||[];

  // Événements des 7 prochains jours
  const upcomingDates = Array.from({length:8},(_,i)=>{
    const d = new Date(now); d.setDate(d.getDate()+i);
    return d.toISOString().slice(0,10);
  });
  const upcomingEvents = events.filter(e=>upcomingDates.includes(e.date?.slice(0,10)));

  const dayStr = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,height:"calc(100dvh - 120px)"}}>
      {/* Calendrier */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Navigation mois */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 20px",borderBottom:`1px solid ${C.bd}`}}>
          <button onClick={()=>setMoisOffset(o=>o-1)} style={{background:C.bg2,border:"none",
            width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,color:C.tx}}>‹</button>
          <div style={{fontSize:16,fontWeight:700,fontFamily:FONT_TITLE,textTransform:"capitalize",color:C.tx}}>
            {moisLabel}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{setMoisOffset(0);setSelectedDay(todayStr);}} style={{
              background:C.greenL,border:"none",borderRadius:8,cursor:"pointer",
              fontSize:12,fontWeight:600,color:C.greenD,padding:"4px 10px"}}>Aujourd'hui</button>
            <button onClick={()=>setMoisOffset(o=>o+1)} style={{background:C.bg2,border:"none",
              width:32,height:32,borderRadius:8,cursor:"pointer",fontSize:16,color:C.tx}}>›</button>
          </div>
        </div>

        {/* En-têtes jours */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",
          padding:"8px 16px 0",gap:2}}>
          {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(j=>(
            <div key={j} style={{textAlign:"center",fontSize:11,fontWeight:600,
              color:C.tx3,paddingBottom:6}}>{j}</div>
          ))}
        </div>

        {/* Grille jours */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",
          padding:"0 16px 16px",gap:2,flex:1,overflowY:"auto"}}>
          {/* Cases vides avant le 1er */}
          {Array.from({length:premierJour},(_,i)=>(
            <div key={`e${i}`}/>
          ))}
          {/* Jours du mois */}
          {Array.from({length:nbJours},(_,i)=>{
            const d = i+1;
            const ds = dayStr(viewYear,viewMonth,d);
            const isToday = ds===todayStr;
            const isSel = ds===selectedDay;
            const dayEvts = eventsByDay[ds]||[];
            const hasPast = ds<todayStr;
            return (
              <div key={d} onClick={()=>setSelectedDay(ds===selectedDay?null:ds)}
                style={{minHeight:70,borderRadius:8,padding:"6px 4px",cursor:"pointer",
                  border:`2px solid ${isSel?C.green:isToday?"#4CAF50":"transparent"}`,
                  background:isSel?C.greenL:isToday?"#F0FDF4":hasPast&&dayEvts.length===0?"#FAFAFA":"#fff",
                  transition:"background .12s"}}>
                <div style={{fontSize:12,fontWeight:isToday?700:400,
                  color:isToday?C.greenD:hasPast?C.tx3:C.tx,marginBottom:3,textAlign:"center"}}>
                  {d}
                </div>
                {dayEvts.slice(0,3).map((ev,ei)=>{
                  const t = PLANNING_TYPES[ev.type]||PLANNING_TYPES.visite_terrain;
                  return (
                    <div key={ei} style={{fontSize:9,fontWeight:600,color:t.color,
                      background:t.bg,borderRadius:4,padding:"1px 4px",
                      marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {t.icon} {ev.titre.split("—")[1]?.trim()||ev.titre}
                    </div>
                  );
                })}
                {dayEvts.length>3&&(
                  <div style={{fontSize:9,color:C.tx3,textAlign:"center"}}>+{dayEvts.length-3}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Légende */}
        <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"10px 20px",
          borderTop:`1px solid ${C.bd}`,background:C.bg}}>
          {Object.entries(PLANNING_TYPES).map(([k,t])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}>
              <span style={{display:"inline-block",width:10,height:10,borderRadius:3,
                background:t.bg,border:`1px solid ${t.color}`}}/>
              <span style={{color:C.tx3}}>{t.icon} {t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau latéral */}
      <div style={{display:"flex",flexDirection:"column",gap:12,overflowY:"auto"}}>
        {/* Horloge + mise à jour */}
        <div style={{background:C.greenD,color:"#fff",borderRadius:14,padding:"14px 18px",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:28,fontWeight:700,fontFamily:"monospace",letterSpacing:2}}>
              {now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
            </div>
            <div style={{fontSize:12,opacity:.8,marginTop:2}}>
              {now.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
            </div>
          </div>
          <div style={{textAlign:"right",fontSize:10,opacity:.7}}>
            <div>🔄 Mise à jour</div>
            <div>toutes les minutes</div>
          </div>
        </div>

        {/* Événements du jour sélectionné */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`,
            display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.tx}}>
              {focusDay===todayStr?"Aujourd'hui":new Date(focusDay+"T12:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
            </div>
            <span style={{fontSize:11,color:C.tx3}}>{focusEvents.length} événement{focusEvents.length!==1?"s":""}</span>
          </div>
          {focusEvents.length===0 ? (
            <div style={{padding:14,color:C.tx3,fontSize:12,textAlign:"center"}}>Aucun événement</div>
          ) : focusEvents.map((ev,i)=>{
            const t = PLANNING_TYPES[ev.type]||PLANNING_TYPES.visite_terrain;
            return (
              <div key={i} onClick={()=>ev.lotId&&onSelectLot&&onSelectLot(ev.lotId)}
                style={{padding:"10px 14px",borderBottom:i<focusEvents.length-1?`1px solid ${C.bd}`:"none",
                  cursor:ev.lotId?"pointer":"default",
                  background:ev.enCours?"#FEF9F0":"#fff",
                  transition:"background .1s"}}
                onMouseEnter={e=>{ if(ev.lotId) e.currentTarget.style.background=t.bg; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=ev.enCours?"#FEF9F0":"#fff"; }}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{t.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.tx,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {ev.titre}
                    </div>
                    <div style={{fontSize:11,color:C.tx3,marginTop:1}}>{ev.sous}</div>
                    {ev.heure&&(
                      <div style={{fontSize:10,color:t.color,fontWeight:600,marginTop:2}}>🕐 {ev.heure}</div>
                    )}
                  </div>
                  {ev.enCours&&(
                    <span style={{fontSize:9,background:C.amber,color:"#fff",
                      borderRadius:4,padding:"2px 6px",fontWeight:700,flexShrink:0}}>EN COURS</span>
                  )}
                  {ev.lotNumero&&(
                    <span style={{fontSize:9,fontFamily:"monospace",color:C.greenD,flexShrink:0}}>{ev.lotNumero}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 7 prochains jours */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`}}>
            <div style={{fontSize:13,fontWeight:700,color:C.tx}}>Prochains 7 jours</div>
          </div>
          {upcomingEvents.length===0 ? (
            <div style={{padding:14,color:C.tx3,fontSize:12,textAlign:"center"}}>Aucun événement à venir</div>
          ) : upcomingDates.slice(1).map(ds=>{
            const evs = eventsByDay[ds]||[];
            if (evs.length===0) return null;
            const label = new Date(ds+"T12:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"});
            return (
              <div key={ds} style={{borderBottom:`1px solid ${C.bd}`}}>
                <div style={{padding:"6px 14px",background:C.bg,fontSize:10,
                  fontWeight:700,color:C.tx2,textTransform:"capitalize"}}>{label}</div>
                {evs.map((ev,i)=>{
                  const t = PLANNING_TYPES[ev.type]||PLANNING_TYPES.visite_terrain;
                  return (
                    <div key={i} onClick={()=>ev.lotId&&onSelectLot&&onSelectLot(ev.lotId)}
                      style={{padding:"7px 14px",display:"flex",alignItems:"center",gap:8,
                        cursor:ev.lotId?"pointer":"default",
                        borderBottom:i<evs.length-1?`1px solid ${C.bd}`:"none"}}
                      onMouseEnter={e=>{ if(ev.lotId) e.currentTarget.style.background=t.bg; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background="#fff"; }}>
                      <span style={{fontSize:13}}>{t.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:600,color:C.tx,
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.titre}</div>
                        <div style={{fontSize:10,color:C.tx3}}>{ev.sous}</div>
                      </div>
                      {ev.heure&&<span style={{fontSize:10,color:t.color,fontWeight:600,flexShrink:0}}>{ev.heure}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

