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

