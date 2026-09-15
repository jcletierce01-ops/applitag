import { fmtNum } from "../../shared/format.js";
import { TYPE_CONTACT_OPTS, ORIGINE_OPTS, TYPE_RESSOURCE_OPTS } from "../contacts/constants.js";

// ── Types CDN globaux ─────────────────────────────────────────────────────────

interface JsPdfInstance {
  addImage(data: string, format: string, x: number, y: number, w: number, h: number): void;
  save(filename: string): void;
}

declare global {
  interface Window {
    jspdf?: { jsPDF: new (orientation: string, unit: string, format: string) => JsPdfInstance };
    html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  }
}

// ── Interfaces métier ─────────────────────────────────────────────────────────

interface EssenceDoc { label: string; pct: number; id?: string; emoji?: string; }
interface GpsDoc { lat: number; lng: number; accuracy?: number; }

interface VisiteDoc {
  date?: string; certification?: string; numeroCertification?: string;
  contraintes?: Record<string, boolean>; essences?: EssenceDoc[];
  volumeEstimeT?: string | number; popParHa?: string | number; diametreMoyen?: string | number;
  accesCamion?: string; largeurAcces?: string | number; distancePlateforme?: string | number;
  notesAcces?: string; replantation?: string; essenceReplanT?: string;
  surfaceReplant?: string | number; dateReplant?: string; respReplant?: string;
  gps?: GpsDoc; surfaceHa?: string | number; observations?: string; notes?: string;
  adressePlateforme?: string; cpPlateforme?: string; villePlateforme?: string;
  surfacePlateforme?: string | number; dateLimite?: string;
  tauxTVA?: string | number; acompte?: string | number; iban?: string;
  nomBanque?: string; villeBanque?: string;
  redDistance?: string | number; redCategorie?: string; redPays?: string;
  humiditeMesure?: string | number;
}

interface LotDoc {
  lotNumero?: string; nom?: string; prenom?: string;
  adressePostale?: string; complementAdresse?: string;
  commune?: string; adresseParcelle?: string; refCadastrale?: string;
  surfaceHa?: string | number; telephone?: string; email?: string;
  codePostal?: string; certification?: string; potentiel?: string;
  tonnageCumul?: number; tonnageBordRoute?: string | number; volumeEstime?: string | number;
  typeTravaux?: string; estPersonneMorale?: boolean; typePersonneMorale?: string;
  nomSignataire?: string; numeroSiret?: string; etfNom?: string;
}

interface TransportDoc {
  numeroCMR?: string; heureDebut?: string; heureFin?: string;
  societeTransport?: string; immatTracteur?: string; immatRemorque?: string;
  nomChauffeur?: string; nomDestination?: string;
  tonnageNet?: string | number; tonnageCharge?: string | number; cubage?: string | number;
  peage?: string | number; fraisAccessoires?: string | number; observations?: string;
}

interface LivraisonDoc {
  heureArrivee?: string; date?: string;
  nomDestination?: string; adresseDestination?: string; nomReceptionnaire?: string;
  poidsNet?: number | null; poidsBrut?: number | null;
  granulometrie?: string; humiditeReception?: string | number | null;
}

interface UserDoc { nom?: string; prenom?: string; }

interface DechiDoc {
  doNom?: string; doAdresse?: string; entrepriseNom?: string; entrepriseAdresse?: string;
  operateur?: string; machine?: string; datePrevue?: string; granulometrie?: string;
}

export interface DocSection {
  icon: string; label: string; rows: [string, string | null | undefined][];
}

interface EntrepriseObj {
  nom?: string; adressePostale?: string; complementAdresse?: string;
  codePostal?: string; commune?: string; siret?: string; telephone?: string; email?: string;
}

export interface BonCommandeExtra {
  modePrix?: string; prixGlobal?: string | number; prixHoraire?: string | number;
  typeTravaux?: string; entrepriseObj?: EntrepriseObj;
  nomDO?: string; qualiteDO?: string; dateSign?: string;
  conditionsParticulieres?: string; modeReglementBC?: string; delaiReglementBC?: string;
  dateReception?: string; observationsBC?: string;
  sigDataProprio?: string; sigDataExploit?: string; nomSignProprio?: string; nomSignExploit?: string;
}

interface OrdreExploitation {
  lotNumero?: string; doNom?: string; doAdresse?: string;
  doCP?: string; doCommune?: string; doSiret?: string; doEmail?: string;
  missionLabel?: string; entrepriseNom?: string; entrepriseAdresse?: string;
  entrepriseComplement?: string; entrepriseCP?: string; entrepriseCommune?: string;
  entrepriseSiret?: string; lotCommune?: string; lotRefCadastrale?: string;
  lotAdresse?: string; lotSurfaceHa?: string | number;
  volumeEstime?: string | number; delaiExecution?: string; description?: string; code?: string;
}

interface ContactDoc {
  typeContact?: string; origine?: string; potentiel?: string;
  lotNumero?: string; nomApporteur?: string; dateContact?: string;
  nom?: string; prenom?: string; telephone?: string; email?: string;
  adressePostale?: string; complementAdresse?: string;
  commune?: string; adresseParcelle?: string; refCadastrale?: string;
  surfaceHa?: string | number; commentaire?: string;
  conclusion?: string; exploitationAutorisee?: string; redacteur?: string;
}

// ── GÉNÉRATION PDF GÉNÉRIQUE (jsPDF + html2canvas via CDN) ────────────────────

export const generatePdfFromHtml = (htmlContent: string, filename: string, toast: (msg: string) => void, onDone?: () => void): void => {
  const finish = () => onDone && onDone();

  const fallbackPrint = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.pdf$/i, ".html");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Document téléchargé (HTML) — ouvrez-le pour imprimer en PDF");
    finish();
  };

  const renderPdf = () => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:none;";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        window.html2canvas!(doc.body, {
          scale: 2, useCORS: true, allowTaint: true,
          width: 794, height: 1123,
        }).then(canvas => {
          const { jsPDF } = window.jspdf!;
          const pdf = new jsPDF("p", "mm", "a4");
          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
          pdf.save(filename);
          document.body.removeChild(iframe);
          toast("PDF téléchargé ✓");
          finish();
        }).catch(() => { document.body.removeChild(iframe); fallbackPrint(); });
      }, 800);
    } catch { fallbackPrint(); }
  };

  if (window.jspdf && window.html2canvas) {
    renderPdf();
  } else {
    const sc = document.createElement("script");
    sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    sc.onload = () => {
      const sc2 = document.createElement("script");
      sc2.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      sc2.onload = renderPdf;
      sc2.onerror = fallbackPrint;
      document.head.appendChild(sc2);
    };
    sc.onerror = fallbackPrint;
    document.head.appendChild(sc);
  }
};

// ── COMPTE RENDU DE CONTACT PDF ───────────────────────────────────────────────

export const buildCompteRenduContactHTML = (contact: ContactDoc): string => {
  const typeLabel = TYPE_CONTACT_OPTS.find(([v]) => v === contact.typeContact)?.[2] || contact.typeContact || "—";
  const origineLabel = ORIGINE_OPTS.find(([v]) => v === contact.origine)?.[2] || contact.origine || "—";
  const ressourceLabel = TYPE_RESSOURCE_OPTS.find(([v]) => v === contact.potentiel)?.[2] || contact.potentiel || "—";

  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>Compte rendu de contact ${contact.lotNumero || ""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2.5px solid #4CAF50;padding-bottom:14px;margin-bottom:18px}
.logo h1{font-size:22px;font-weight:700;color:#1E5B3A;letter-spacing:-0.5px}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:17px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:14px;color:#1E5B3A;margin-top:4px}
.doc-ref .dt{font-size:9px;color:#9A9892;margin-top:3px}
.sec{margin-bottom:16px}
.sec h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
td.k{color:#5A5955;width:40%}
td.v{font-weight:600}
.note{background:#F5F4F1;border-radius:5px;padding:9px 12px;font-size:10px;
  color:#1A1A18;line-height:1.7;margin-bottom:14px;min-height:40px}
.footer{margin-top:30px;padding-top:12px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style>
</head>
<body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Gestion forestière terrain</p>
  </div>
  <div class="doc-ref">
    <h2>Compte rendu de contact</h2>
    <div class="num">${contact.lotNumero || "BROUILLON"}</div>
    <div class="dt">Émis le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>
</div>

<div class="sec">
  <h3>📡 Origine du contact</h3>
  <table>
    <tr><td class="k">Source</td><td class="v">${origineLabel}</td></tr>
    <tr><td class="k">Apporteur</td><td class="v">${contact.nomApporteur || "—"}</td></tr>
    <tr><td class="k">Date du contact</td><td class="v">${contact.dateContact || "—"}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>👤 Contact</h3>
  <table>
    <tr><td class="k">Nom / Type</td><td class="v">${contact.nom || ""} ${contact.prenom || ""} — ${typeLabel}</td></tr>
    <tr><td class="k">Téléphone</td><td class="v">${contact.telephone || "—"}</td></tr>
    <tr><td class="k">Email</td><td class="v">${contact.email || "—"}</td></tr>
    <tr><td class="k">Adresse</td><td class="v">${contact.adressePostale || "—"}${contact.complementAdresse ? " — " + contact.complementAdresse : ""}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>🌲 Parcelle</h3>
  <table>
    <tr><td class="k">N° lot</td><td class="v">${contact.lotNumero || "—"}</td></tr>
    <tr><td class="k">Commune</td><td class="v">${contact.commune || "—"}</td></tr>
    <tr><td class="k">Adresse parcelle</td><td class="v">${contact.adresseParcelle || "—"}</td></tr>
    <tr><td class="k">Référence cadastrale</td><td class="v">${contact.refCadastrale || "—"}</td></tr>
    <tr><td class="k">Surface</td><td class="v">${contact.surfaceHa ? contact.surfaceHa + " ha" : "—"}</td></tr>
    <tr><td class="k">Type de ressource</td><td class="v">${ressourceLabel}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>📝 Commentaire</h3>
  <div class="note">${contact.commentaire || "—"}</div>
</div>

${contact.conclusion || contact.exploitationAutorisee ? `
<div class="sec">
  <h3>✅ Conclusion de l'entretien</h3>
  <table>
    ${contact.conclusion ? `<tr><td class="k">Conclusion</td><td class="v">${({ rendez_vous: "📅 Rendez-vous fixé", visite_prevue: "🔭 Visite prévue", a_rappeler: "📞 À rappeler", en_reflexion: "🤔 En réflexion", echec: "❌ Sans suite" } as Record<string, string>)[contact.conclusion] || contact.conclusion}</td></tr>` : ""}
    ${contact.exploitationAutorisee ? `<tr><td class="k">Exploitation autorisée</td><td class="v">${({ oui: "✅ Oui — accord verbal", non: "❌ Non", en_cours: "⏳ À confirmer" } as Record<string, string>)[contact.exploitationAutorisee] || contact.exploitationAutorisee}</td></tr>` : ""}
  </table>
</div>` : ""}

<div class="footer">
  ${contact.redacteur ? `Rédigé par <strong>${contact.redacteur}</strong> — ` : ""}Document généré par APPLITAG
  <span style="float:right;opacity:.4;font-size:7.5px">APPLITAG © ${new Date().getFullYear()}</span>
</div>

</div></body></html>`;
};

// ── CMR TRANSPORT ─────────────────────────────────────────────────────────────

export const buildCMRHTML = (lot: LotDoc, transport: TransportDoc | null | undefined, livraison: LivraisonDoc | null | undefined): string => {
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const heureDepart = transport?.heureDebut || "—";
  const heureArrivee = livraison?.heureArrivee || livraison?.date?.slice(11, 16) || "—";
  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>CMR ${transport?.numeroCMR || lot.lotNumero || ""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:10mm 12mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:3px solid #1E5B3A;padding-bottom:10px;margin-bottom:12px}
.logo h1{font-size:18px;font-weight:700;color:#1E5B3A}
.logo p{font-size:8px;color:#9A9892;margin-top:2px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:15px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:13px;color:#1E5B3A;margin-top:3px}
.doc-ref .dt{font-size:8.5px;color:#9A9892;margin-top:2px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px}
.box{border:1px solid #DDDBD5;border-radius:5px;padding:9px}
.box h3{font-size:9px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.4px;border-bottom:1px solid #ECEAE6;padding-bottom:4px;margin-bottom:7px}
.box p{font-size:10px;color:#1A1A18;line-height:1.75}
.box .sub{font-size:8.5px;color:#5A5955}
.full{border:1px solid #DDDBD5;border-radius:5px;padding:9px;margin-bottom:10px}
.full h3{font-size:9px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.4px;border-bottom:1px solid #ECEAE6;padding-bottom:4px;margin-bottom:7px}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th{background:#1E5B3A;color:#fff;padding:6px 8px;text-align:left;font-size:9px;font-weight:600}
td{padding:6px 8px;border-bottom:1px solid #ECEAE6;font-size:9.5px}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px}
.sig{border:1px solid #DDDBD5;border-radius:5px;padding:9px}
.sig h4{font-size:9px;font-weight:700;color:#1E5B3A;margin-bottom:3px}
.sig .who{font-size:8.5px;color:#5A5955;margin-bottom:36px}
.sig .line{border-top:1px solid #888;padding-top:4px;font-size:8px;color:#9A9892}
.reserve{background:#FFF3CD;border:1px solid #FFC107;border-radius:5px;
  padding:7px 10px;font-size:9px;color:#856404;margin-bottom:10px;min-height:40px}
.footer{margin-top:12px;padding-top:8px;border-top:1px solid #DDDBD5;
  font-size:7.5px;color:#9A9892;text-align:center;line-height:1.5}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:8mm 10mm}
}
</style>
</head>
<body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Lettre de voiture — Convention relative au contrat de transport international de marchandises par route (CMR)</p>
  </div>
  <div class="doc-ref">
    <h2>CMR — Lettre de voiture</h2>
    <div class="num">${transport?.numeroCMR || "CMR-—"}</div>
    <div class="dt">Date : ${date}</div>
  </div>
</div>

<div class="grid">
  <div class="box">
    <h3>1. Expéditeur (chargeur)</h3>
    <p>
      <strong>${lot.nom || ""} ${lot.prenom || ""}</strong><br/>
      ${lot.adressePostale || "—"}<br/>
      ${[lot.codePostal, lot.commune].filter(Boolean).join(" ") || lot.commune || "—"}<br/>
      ${lot.telephone ? `📞 ${lot.telephone}` : ""}
    </p>
  </div>
  <div class="box">
    <h3>2. Destinataire</h3>
    <p>
      <strong>${livraison?.nomDestination || transport?.nomDestination || "—"}</strong><br/>
      ${livraison?.adresseDestination || "—"}<br/>
      ${livraison?.nomReceptionnaire ? `Réceptionnaire : ${livraison.nomReceptionnaire}` : ""}
    </p>
  </div>
</div>

<div class="grid">
  <div class="box">
    <h3>3. Lieu de prise en charge</h3>
    <p>
      <strong>${lot.commune || "—"}</strong><br/>
      ${lot.adresseParcelle || lot.adressePostale || "—"}<br/>
      ${lot.refCadastrale ? `Réf. cad. : ${lot.refCadastrale}` : ""}
    </p>
  </div>
  <div class="box">
    <h3>4. Lieu de livraison</h3>
    <p>
      <strong>${livraison?.nomDestination || transport?.nomDestination || "—"}</strong><br/>
      ${livraison?.adresseDestination || "—"}
    </p>
  </div>
</div>

<div class="full">
  <h3>5. Désignation de la marchandise</h3>
  <table>
    <tr><th>Nature</th><th>Nb colis / Unité</th><th>Poids brut (t)</th><th>Volume (m³)</th><th>Granulométrie</th></tr>
    <tr>
      <td>Plaquettes forestières / Bois énergie</td>
      <td>1 chargement complet</td>
      <td>${transport?.tonnageNet || transport?.tonnageCharge || livraison?.poidsNet || livraison?.poidsBrut || "—"}</td>
      <td>${transport?.cubage || "—"}</td>
      <td>${livraison?.granulometrie || "P45"}</td>
    </tr>
  </table>
  <table>
    <tr><th>Référence lot</th><th>Certification</th><th>Instructions spéciales</th></tr>
    <tr>
      <td>${lot.lotNumero || "—"}</td>
      <td>${lot.certification || "—"}</td>
      <td>Manipulation avec précaution — ne pas mouiller</td>
    </tr>
  </table>
</div>

<div class="grid3">
  <div class="box">
    <h3>6. Transporteur</h3>
    <p>
      <strong>${transport?.societeTransport || "—"}</strong><br/>
      Tracteur : ${transport?.immatTracteur || "—"}<br/>
      Remorque : ${transport?.immatRemorque || "—"}<br/>
      Chauffeur : ${transport?.nomChauffeur || "—"}
    </p>
  </div>
  <div class="box">
    <h3>7. Horaires</h3>
    <p>
      Départ chargement : <strong>${heureDepart}</strong><br/>
      Arrivée destination : <strong>${heureArrivee}</strong><br/>
      Date : ${date}
    </p>
  </div>
  <div class="box">
    <h3>8. Frais de transport</h3>
    <p>
      Péage : ${transport?.peage || "—"}<br/>
      Frais acc. : ${transport?.fraisAccessoires || "—"}<br/>
      <span class="sub">Port payé / À payer selon accord</span>
    </p>
  </div>
</div>

<div class="reserve">
  <strong>9. Réserves et observations du transporteur à la prise en charge :</strong><br/>
  ${transport?.observations || "Aucune réserve."}
</div>

<div class="sigs">
  <div class="sig">
    <h4>Expéditeur</h4>
    <div class="who">${lot.nom || ""} ${lot.prenom || ""}</div>
    <div class="line">Signature &amp; cachet — le ${date}</div>
  </div>
  <div class="sig">
    <h4>Transporteur</h4>
    <div class="who">${transport?.societeTransport || "—"}<br/>${transport?.nomChauffeur || ""}</div>
    <div class="line">Signature &amp; cachet — le ${date}</div>
  </div>
  <div class="sig">
    <h4>Destinataire</h4>
    <div class="who">${livraison?.nomDestination || "—"}<br/>${livraison?.nomReceptionnaire || ""}</div>
    <div class="line">Signature &amp; cachet à la livraison</div>
  </div>
</div>

<div class="footer">
  Document établi conformément à la Convention relative au contrat de transport international de marchandises par route (CMR) — Genève 19 mai 1956.
  Référence APPLITAG : ${lot.lotNumero || "—"} · CMR ${transport?.numeroCMR || "—"} · Généré le ${date}
</div>

</div></body></html>`;
};

// ── RÉCEPTION DE FIN D'EXPLOITATION (F08) ────────────────────────────────────

export const buildReceptionExploitHTML = (lot: LotDoc, visite: VisiteDoc | null | undefined, user: UserDoc | null | undefined): string => {
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const proprietaireNom = `${lot.nom || ""} ${lot.prenom || ""}`.trim();
  const receptionnaire = user?.nom || user?.prenom ? `${user?.prenom || ""} ${user?.nom || ""}`.trim() : "L'administrateur";
  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>Réception de fin d'exploitation ${lot.lotNumero || ""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2.5px solid #4CAF50;padding-bottom:14px;margin-bottom:18px}
.logo h1{font-size:20px;font-weight:700;color:#1E5B3A}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:16px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:13px;color:#1E5B3A;margin-top:4px}
.doc-ref .dt{font-size:9px;color:#9A9892;margin-top:3px}
.prop-banner{background:#1E5B3A;color:#fff;border-radius:8px;padding:14px 18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center}
.prop-banner .name{font-size:16px;font-weight:700}
.prop-banner .sub{font-size:10px;opacity:.8;margin-top:3px}
.prop-banner .lot{font-family:monospace;font-size:18px;font-weight:700}
.sec{margin-bottom:14px}
.sec h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
td.k{color:#5A5955;width:42%}
td.v{font-weight:600}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
.sig{border:1px solid #DDDBD5;border-radius:6px;padding:14px}
.sig h4{font-size:10.5px;font-weight:700;color:#1E5B3A;margin-bottom:4px}
.sig .who{font-size:10px;color:#1A1A18;font-weight:600;margin-bottom:48px}
.sig .line{border-top:1.5px solid #1A1A18;padding-top:6px;font-size:9px;color:#9A9892}
.footer{margin-top:24px;padding-top:12px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style>
</head>
<body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Gestion forestière terrain</p>
  </div>
  <div class="doc-ref">
    <h2>Réception de fin d'exploitation</h2>
    <div class="num">${lot.lotNumero || "BROUILLON"}</div>
    <div class="dt">Émis le ${date}</div>
  </div>
</div>

<div class="prop-banner">
  <div>
    <div class="name">🏠 ${proprietaireNom || "—"}</div>
    <div class="sub">${lot.adressePostale || lot.commune || "—"}${lot.telephone ? ` · ${lot.telephone}` : ""}</div>
  </div>
  <div class="lot">${lot.lotNumero || "—"}</div>
</div>

<div class="sec">
  <h3>🌲 Informations du chantier</h3>
  <table>
    <tr><td class="k">Commune</td><td class="v">${lot.commune || "—"}</td></tr>
    <tr><td class="k">Adresse parcelle</td><td class="v">${lot.adresseParcelle || lot.adressePostale || "—"}</td></tr>
    <tr><td class="k">Référence cadastrale</td><td class="v">${lot.refCadastrale || "—"}</td></tr>
    <tr><td class="k">Surface</td><td class="v">${lot.surfaceHa ? lot.surfaceHa + " ha" : "—"}</td></tr>
    <tr><td class="k">Type de travaux</td><td class="v">${lot.typeTravaux || "Abattage / Débardage"}</td></tr>
    <tr><td class="k">Date de visite terrain</td><td class="v">${visite?.date || "—"}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>📊 Résultats de l'exploitation</h3>
  <table>
    <tr><td class="k">Tonnage total réceptionné</td><td class="v">${lot.tonnageCumul ? fmtNum(lot.tonnageCumul, 1) + " t" : "—"}</td></tr>
    <tr><td class="k">Volume bord de route</td><td class="v">${visite?.volumeEstimeT ? visite.volumeEstimeT + " t" : "—"}</td></tr>
    <tr><td class="k">Essences</td><td class="v">${visite?.essences?.map(e => `${e.label} (${e.pct}%)`).join(", ") || lot.potentiel || "—"}</td></tr>
    <tr><td class="k">Date de réception</td><td class="v">${date}</td></tr>
    <tr><td class="k">Réceptionné par</td><td class="v">${receptionnaire}</td></tr>
  </table>
</div>

<div class="sigs">
  <div class="sig">
    <h4>Le Propriétaire</h4>
    <div class="who">${proprietaireNom || "____________________"}</div>
    <div class="line">Lu et approuvé — Fait à _____________ le ${date}</div>
  </div>
  <div class="sig">
    <h4>Le Réceptionneur</h4>
    <div class="who">${receptionnaire}</div>
    <div class="line">Signature — Fait à _____________ le ${date}</div>
  </div>
</div>

<div class="footer">
  Document généré automatiquement par APPLITAG · Référence ${lot.lotNumero || "—"} · ${date}
</div>

</div></body></html>`;
};

// ── PV DE VISITE TERRAIN ──────────────────────────────────────────────────────

export const buildPVVisiteHTML = (lot: LotDoc, visite: VisiteDoc | null | undefined, redacteur: string | null | undefined): string => {
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const certBadge = visite?.certification && visite.certification !== "aucune"
    ? `${visite.certification.toUpperCase()}${visite.numeroCertification ? " n° " + visite.numeroCertification : ""}` : "Aucune";
  const contraintesStr = Object.entries(visite?.contraintes || {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "Aucune contrainte identifiée";
  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>PV de visite terrain ${lot.lotNumero || ""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2.5px solid #4CAF50;padding-bottom:14px;margin-bottom:18px}
.logo h1{font-size:20px;font-weight:700;color:#1E5B3A}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:16px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:13px;color:#1E5B3A;margin-top:4px}
.doc-ref .dt{font-size:9px;color:#9A9892;margin-top:3px}
.sec{margin-bottom:14px}
.sec h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
td.k{color:#5A5955;width:40%}
td.v{font-weight:600}
.cert-badge{display:inline-block;background:#E6F1FB;color:#042C53;
  border:1px solid #185FA5;border-radius:3px;padding:2px 7px;font-size:9px;font-weight:700}
.note{background:#F5F4F1;border-radius:5px;padding:9px 12px;font-size:10px;
  color:#1A1A18;line-height:1.7;margin-bottom:12px;min-height:36px}
.photos-placeholder{border:2px dashed #DDDBD5;border-radius:8px;padding:16px;text-align:center;
  color:#9A9892;font-size:10px;margin-bottom:14px;min-height:60px;display:flex;align-items:center;justify-content:center}
.sig{border:1px solid #DDDBD5;border-radius:6px;padding:12px;margin-top:20px}
.sig h4{font-size:10px;font-weight:700;color:#1E5B3A;margin-bottom:4px}
.sig .who{font-size:9.5px;color:#5A5955;margin-bottom:44px}
.sig .line{border-top:1px solid #1A1A18;padding-top:5px;font-size:9px;color:#9A9892}
.footer{margin-top:20px;padding-top:12px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style>
</head>
<body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Gestion forestière terrain</p>
  </div>
  <div class="doc-ref">
    <h2>PV de visite de terrain</h2>
    <div class="num">${lot.lotNumero || "BROUILLON"}</div>
    <div class="dt">Visite du ${visite?.date || date} · Rédigé le ${date}</div>
  </div>
</div>

<div class="sec">
  <h3>👤 Mandataire / Rédacteur</h3>
  <table>
    <tr><td class="k">Nom du rédacteur</td><td class="v">${redacteur || "—"}</td></tr>
    <tr><td class="k">Date de la visite</td><td class="v">${visite?.date || "—"}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>🏠 Propriétaire</h3>
  <table>
    <tr><td class="k">Nom</td><td class="v">${lot.nom || ""} ${lot.prenom || ""}</td></tr>
    <tr><td class="k">Téléphone</td><td class="v">${lot.telephone || "—"}</td></tr>
    <tr><td class="k">Adresse</td><td class="v">${lot.adressePostale || "—"}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>🌲 Parcelle</h3>
  <table>
    <tr><td class="k">Commune</td><td class="v">${lot.commune || "—"}</td></tr>
    <tr><td class="k">Adresse parcelle / Lieu-dit</td><td class="v">${lot.adresseParcelle || "—"}</td></tr>
    <tr><td class="k">Référence cadastrale</td><td class="v">${lot.refCadastrale || "—"}</td></tr>
    <tr><td class="k">Surface visitée</td><td class="v">${visite?.surfaceHa ? visite.surfaceHa + " ha" : lot.surfaceHa ? lot.surfaceHa + " ha" : "—"}</td></tr>
    <tr><td class="k">Coordonnées GPS</td><td class="v">${visite?.gps ? `${visite.gps.lat.toFixed(5)}°N · ${visite.gps.lng.toFixed(5)}°E (±${Math.round(visite.gps.accuracy || 0)} m)` : "—"}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>🌿 Bois sur pied</h3>
  <table>
    <tr><td class="k">Essences</td><td class="v">${visite?.essences?.map(e => `${e.label} (${e.pct}%)`).join(", ") || "—"}</td></tr>
    <tr><td class="k">Volume estimé</td><td class="v">${visite?.volumeEstimeT ? visite.volumeEstimeT + " t" : "—"}</td></tr>
    <tr><td class="k">Population</td><td class="v">${visite?.popParHa ? visite.popParHa + " tiges/ha" : "—"}</td></tr>
    <tr><td class="k">Diamètre moyen (1,20 m)</td><td class="v">${visite?.diametreMoyen ? visite.diametreMoyen + " cm" : "—"}</td></tr>
    <tr><td class="k">Certification</td><td class="v">${certBadge === "Aucune" ? certBadge : `<span class="cert-badge">${certBadge}</span>`}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>🚛 Accès et logistique</h3>
  <table>
    <tr><td class="k">Accès camion</td><td class="v">${visite?.accesCamion === "praticable" ? "✓ Praticable" : visite?.accesCamion === "difficile" ? "⚠ Difficile" : visite?.accesCamion === "impossible" ? "✗ Impossible" : "—"}</td></tr>
    <tr><td class="k">Largeur accès</td><td class="v">${visite?.largeurAcces ? visite.largeurAcces + " m" : "—"}</td></tr>
    <tr><td class="k">Distance plateforme</td><td class="v">${visite?.distancePlateforme ? visite.distancePlateforme + " m" : "—"}</td></tr>
    <tr><td class="k">Contraintes terrain</td><td class="v">${contraintesStr}</td></tr>
  </table>
</div>

${visite?.replantation === "oui" ? `
<div class="sec">
  <h3>🌱 Replantation</h3>
  <table>
    <tr><td class="k">Replantation prévue</td><td class="v">Oui</td></tr>
    <tr><td class="k">Essences</td><td class="v">${visite.essenceReplanT || "—"}</td></tr>
    <tr><td class="k">Surface</td><td class="v">${visite.surfaceReplant ? visite.surfaceReplant + " ha" : "—"}</td></tr>
    <tr><td class="k">Date prévue</td><td class="v">${visite.dateReplant ? new Date(visite.dateReplant).toLocaleDateString("fr-FR") : "—"}</td></tr>
    <tr><td class="k">Responsable</td><td class="v">${visite.respReplant || "—"}</td></tr>
  </table>
</div>` : ""}

<div class="sec">
  <h3>📷 Photos terrain</h3>
  <div class="photos-placeholder">📷 Photos jointes lors de la visite — disponibles dans APPLITAG · Réf. ${lot.lotNumero || "—"}</div>
</div>

<div class="sec">
  <h3>📝 Observations</h3>
  <div class="note">${visite?.observations || visite?.notes || "—"}</div>
</div>

<div class="sig">
  <h4>Mandataire — Rédacteur du PV</h4>
  <div class="who">${redacteur || "____________________"}</div>
  <div class="line">Signature — Fait à _____________ le ${date}</div>
</div>

<div class="footer">
  PV de visite terrain généré par APPLITAG · Référence ${lot.lotNumero || "—"} · ${date}
</div>

</div></body></html>`;
};

// ── ORDRE DE DÉCHIQUETAGE ─────────────────────────────────────────────────────

export const buildOrdreDechiHTML = (lot: LotDoc, visite: VisiteDoc | null | undefined, dechi: DechiDoc | null | undefined): string => {
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>Ordre de déchiquetage ${lot.lotNumero || ""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2.5px solid #4CAF50;padding-bottom:14px;margin-bottom:18px}
.logo h1{font-size:20px;font-weight:700;color:#1E5B3A}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:16px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:13px;color:#1E5B3A;margin-top:4px}
.doc-ref .dt{font-size:9px;color:#9A9892;margin-top:3px}
.objet{background:#E8F5E9;border-left:4px solid #4CAF50;padding:10px 14px;margin-bottom:16px;border-radius:0 6px 6px 0}
.objet .lbl{font-size:9px;color:#1E5B3A;text-transform:uppercase;font-weight:700;margin-bottom:3px}
.objet .val{font-size:12px;font-weight:700;color:#1A1A18}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.card{border:1px solid #DDDBD5;border-radius:6px;padding:11px}
.card h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #ECEAE6;padding-bottom:5px;margin-bottom:8px}
.card p{font-size:10.5px;color:#1A1A18;line-height:1.85}
.sec{margin-bottom:14px}
.sec h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th{background:#1E5B3A;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:600}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
.sig{border:1px solid #DDDBD5;border-radius:6px;padding:12px}
.sig h4{font-size:10px;font-weight:700;color:#1E5B3A;margin-bottom:3px}
.sig .who{font-size:9.5px;color:#5A5955;margin-bottom:44px}
.sig .line{border-top:1px solid #1A1A18;padding-top:5px;font-size:9px;color:#9A9892}
.footer{margin-top:24px;padding-top:12px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style>
</head>
<body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 ${dechi?.doNom || "APPLITAG SAS"}</h1>
    <p>${dechi?.doAdresse || "Gestion des flux bois énergie"}</p>
  </div>
  <div class="doc-ref">
    <h2>Ordre de déchiquetage</h2>
    <div class="num">Réf. ${lot.lotNumero || "BROUILLON"}</div>
    <div class="dt">Émis le ${date}</div>
  </div>
</div>

<div class="objet">
  <div class="lbl">Objet</div>
  <div class="val">Ordre de déchiquetage — Bois bord de route · Lot ${lot.lotNumero || "—"}</div>
</div>

<div class="two">
  <div class="card">
    <h3>🏢 Destinataire (Entreprise de déchiquetage)</h3>
    <p>
      <strong>${dechi?.entrepriseNom || "—"}</strong><br/>
      ${dechi?.entrepriseAdresse || "—"}<br/>
      ${dechi?.operateur ? `Opérateur : ${dechi.operateur}` : ""}
    </p>
  </div>
  <div class="card">
    <h3>📍 Chantier — Lot ${lot.lotNumero || ""}</h3>
    <p>
      ${lot.commune || "—"}${lot.refCadastrale ? ` · ${lot.refCadastrale}` : ""}<br/>
      ${lot.adresseParcelle || lot.adressePostale || "—"}
    </p>
  </div>
</div>

<div class="sec">
  <h3>🌀 Désignation des travaux</h3>
  <table>
    <tr><th>Prestation</th><th>Tonnage bord de route estimé</th><th>Machine assignée</th><th>Date prévue</th></tr>
    <tr>
      <td>Déchiquetage de bois bord de route</td>
      <td>${lot.tonnageBordRoute ? fmtNum(lot.tonnageBordRoute, 1) + " t" : visite?.volumeEstimeT ? visite.volumeEstimeT + " t" : "—"}</td>
      <td>${dechi?.machine || "—"}</td>
      <td>${dechi?.datePrevue || "—"}</td>
    </tr>
  </table>
  <table>
    <tr><th>Essences</th><th>Granulométrie cible</th><th>Certification</th></tr>
    <tr>
      <td>${visite?.essences?.map(e => e.label).join(", ") || lot.potentiel || "—"}</td>
      <td>${dechi?.granulometrie || "P45"}</td>
      <td>${visite?.certification && visite.certification !== "aucune" ? visite.certification.toUpperCase() : "Aucune"}</td>
    </tr>
  </table>
</div>

<div class="sigs">
  <div class="sig">
    <h4>Le Donneur d'ordre</h4>
    <div class="who">${dechi?.doNom || "APPLITAG SAS"}</div>
    <div class="line">Signature &amp; cachet — le ${date}</div>
  </div>
  <div class="sig">
    <h4>L'Entreprise de déchiquetage (bon pour accord)</h4>
    <div class="who">${dechi?.entrepriseNom || "____________________"}</div>
    <div class="line">Signature &amp; cachet — le ________________</div>
  </div>
</div>

<div class="footer">
  APPLITAG — Référence ${lot.lotNumero || "—"} · Document généré le ${date}
</div>

</div></body></html>`;
};

// ── DOCUMENT GÉNÉRIQUE ────────────────────────────────────────────────────────

export const buildSimpleDocHTML = (lot: LotDoc, title: string, sections: DocSection[], footerNote?: string | null): string => {
  const sectionsHtml = sections.map(s => `
<div class="sec">
  <h3>${s.icon} ${s.label}</h3>
  <table>
    ${s.rows.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v ?? "—"}</td></tr>`).join("")}
  </table>
</div>`).join("");

  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title} ${lot.lotNumero || ""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2.5px solid #4CAF50;padding-bottom:14px;margin-bottom:18px}
.logo h1{font-size:22px;font-weight:700;color:#1E5B3A;letter-spacing:-0.5px}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:17px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:14px;color:#1E5B3A;margin-top:4px}
.doc-ref .dt{font-size:9px;color:#9A9892;margin-top:3px}
.sec{margin-bottom:16px}
.sec h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
td.k{color:#5A5955;width:40%}
td.v{font-weight:600}
.footer{margin-top:30px;padding-top:12px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style>
</head>
<body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Gestion forestière terrain</p>
  </div>
  <div class="doc-ref">
    <h2>${title}</h2>
    <div class="num">${lot.lotNumero || "BROUILLON"}</div>
    <div class="dt">Émis le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>
</div>

${sectionsHtml}

<div class="footer">${footerNote || "Document généré automatiquement par APPLITAG."}</div>

</div></body></html>`;
};

// ── BON DE COMMANDE PDF ───────────────────────────────────────────────────────

const TYPE_TRAVAUX_OPTS: Record<string, string> = {
  abattage_debardage:   "Abattage et débardage",
  dechiquetage:         "Déchiquetage",
  abattage_manuel:      "Abattage manuel",
  faconnage_manuel:     "Façonnage manuel",
  nettoyage_plateforme: "Nettoyage de plateforme",
  main_oeuvre:          "Main d'œuvre",
  autre:                "Autre",
};

const MODE_REGLEMENT_BC_OPTS: Record<string, string> = { cheque: "📝 Chèque", virement: "🏦 Virement", traite: "📃 Traite" };
const DELAI_REGLEMENT_BC_OPTS: Record<string, string> = { comptant: "Comptant", "30j": "30 jours", "60j": "60 jours", "90j": "90 jours" };

export const buildBonCommandeHTML = (lot: LotDoc, visite: VisiteDoc | null | undefined, extra: BonCommandeExtra): string => {
  const { modePrix, prixGlobal, prixHoraire, typeTravaux, entrepriseObj, nomDO, qualiteDO, dateSign,
    conditionsParticulieres, modeReglementBC, delaiReglementBC, dateReception, observationsBC,
    sigDataProprio, sigDataExploit, nomSignProprio, nomSignExploit } = extra;
  const volumeT = visite?.volumeEstimeT || lot.volumeEstime || "—";
  const essStr = visite?.essences?.map(e => `${e.label} (${e.pct}%)`).join(", ") || lot.potentiel || "—";
  const certBadge = visite?.certification && visite.certification !== "aucune"
    ? `<span class="cert-badge">${visite.certification.toUpperCase()}</span>` : "";
  const designation = (typeTravaux ? TYPE_TRAVAUX_OPTS[typeTravaux] : undefined) || "À préciser";
  const certifStr = visite?.certification && visite.certification !== "aucune"
    ? ` — Certification ${visite.certification.toUpperCase()}${visite.numeroCertification ? " n° " + visite.numeroCertification : ""}` : "";
  const plateformeStr = [visite?.adressePlateforme, visite?.cpPlateforme, visite?.villePlateforme].filter(Boolean).join(", ") || "—";
  const surfacePlatStr = visite?.surfacePlateforme ? visite.surfacePlateforme + " m²" : "—";
  const prixLabel = modePrix === "horaire"
    ? (prixHoraire ? `${fmtNum(prixHoraire, 2)} €/h HT` : "À négocier")
    : (prixGlobal ? `${fmtNum(prixGlobal, 2)} € HT` : "À négocier");
  const prixTitre = modePrix === "horaire" ? "Tarif horaire unitaire" : "Prix global forfaitaire";

  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bon de commande de travaux ${lot.lotNumero || ""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2.5px solid #4CAF50;padding-bottom:14px;margin-bottom:18px}
.logo h1{font-size:22px;font-weight:700;color:#1E5B3A;letter-spacing:-0.5px}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:17px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:14px;color:#1E5B3A;margin-top:4px}
.doc-ref .dt{font-size:9px;color:#9A9892;margin-top:3px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.card{border:1px solid #DDDBD5;border-radius:6px;padding:11px}
.card h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #ECEAE6;padding-bottom:5px;margin-bottom:8px}
.card p{font-size:10.5px;color:#1A1A18;line-height:1.85}
.card .sub{font-size:9.5px;color:#5A5955}
.sec{margin-bottom:16px}
.sec h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{background:#1E5B3A;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:600}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
.total td{font-weight:700;background:#E8F5E9;font-size:11px}
.note{background:#FAEEDA;border:1px solid #BA7517;border-radius:5px;padding:9px 12px;
  font-size:9.5px;color:#412402;line-height:1.7;margin-bottom:14px}
.cert-badge{display:inline-block;background:#E6F1FB;color:#042C53;
  border:1px solid #185FA5;border-radius:3px;padding:2px 7px;
  font-size:9px;font-weight:700;margin-left:6px}
.cg{background:#F5F4F1;border-radius:5px;padding:9px 12px;font-size:9px;
  color:#5A5955;line-height:1.7;margin-bottom:16px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;page-break-inside:avoid}
.sig{border:1px solid #DDDBD5;border-radius:6px;padding:12px}
.sig h4{font-size:10px;font-weight:700;color:#1E5B3A;margin-bottom:3px}
.sig .who{font-size:9.5px;color:#5A5955;margin-bottom:40px}
.sig .line{border-top:1px solid #1A1A18;padding-top:5px;font-size:9px;color:#9A9892}
.replant{background:#E8F5E9;border:1px solid #4CAF50;border-radius:5px;
  padding:8px 12px;font-size:9.5px;color:#1E5B3A;margin-bottom:14px}
.footer{margin-top:auto;padding-top:12px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style>
</head>
<body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Gestion forestière terrain</p>
  </div>
  <div class="doc-ref">
    <h2>Bon de commande de travaux</h2>
    <div class="num">${lot.lotNumero || "BROUILLON"}</div>
    <div class="dt">Émis le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
  </div>
</div>

<div class="two">
  <div class="card">
    <h3>🏠 Vendeur / Propriétaire</h3>
    <p>
      <strong>${lot.nom || ""} ${lot.prenom || ""}</strong><br/>
      ${lot.estPersonneMorale && lot.typePersonneMorale ? `<span class="sub">${lot.typePersonneMorale.toUpperCase()}</span><br/>` : ""}
      ${lot.adressePostale ? lot.adressePostale + "<br/>" : ""}
      ${lot.complementAdresse ? lot.complementAdresse + "<br/>" : ""}
      ${lot.telephone ? `📞 ${lot.telephone}<br/>` : ""}
      ${lot.email ? `📧 ${lot.email}<br/>` : ""}
      ${lot.nomSignataire ? `<br/>Signataire : <strong>${lot.nomSignataire}</strong><br/>` : ""}
      ${lot.numeroSiret ? `<span class="sub">SIRET ${lot.numeroSiret}</span>` : ""}
    </p>
  </div>
  <div class="card">
    <h3>🏢 Acheteur / Donneur d'ordre</h3>
    <p>
      <strong>${entrepriseObj?.nom || "APPLITAG SAS"}</strong><br/>
      ${entrepriseObj?.adressePostale ? entrepriseObj.adressePostale + "<br/>" : ""}
      ${entrepriseObj?.complementAdresse ? entrepriseObj.complementAdresse + "<br/>" : ""}
      ${[entrepriseObj?.codePostal, entrepriseObj?.commune].filter(Boolean).join(" ") ? [entrepriseObj?.codePostal, entrepriseObj?.commune].filter(Boolean).join(" ") + "<br/>" : ""}
      ${entrepriseObj?.siret ? `<span class="sub">SIRET ${entrepriseObj.siret}</span><br/>` : ""}
      ${entrepriseObj?.telephone ? `📞 ${entrepriseObj.telephone}<br/>` : ""}
      ${entrepriseObj?.email ? `📧 ${entrepriseObj.email}<br/>` : ""}
      ${nomDO ? `<br/>Signataire : ${nomDO}<br/>` : ""}
      ${qualiteDO ? `<span class="sub">${qualiteDO}</span>` : ""}
    </p>
  </div>
</div>

<div class="sec">
  <h3>🌲 Parcelle &amp; Ressource</h3>
  <table>
    <tr><th>Commune</th><th>Réf. cadastrale</th><th>Surface</th><th>Essences</th><th>Certification</th></tr>
    <tr>
      <td>${lot.commune || "—"}</td>
      <td>${lot.refCadastrale || "—"}</td>
      <td>${lot.surfaceHa ? lot.surfaceHa + " ha" : "—"}</td>
      <td>${essStr}</td>
      <td>${certBadge || "Aucune"}</td>
    </tr>
    ${lot.adresseParcelle ? `<tr><td colspan="5"><span class="sub">Lieu-dit : ${lot.adresseParcelle}</span></td></tr>` : ""}
    ${visite?.gps ? `<tr><td colspan="5"><span class="sub">GPS parcelle : ${visite.gps.lat.toFixed(5)}°N · ${visite.gps.lng.toFixed(5)}°E · Précision ${Math.round(visite.gps.accuracy || 0)} m</span></td></tr>` : ""}
  </table>
</div>

<div class="sec">
  <h3>🪓 Désignation</h3>
  <table>
    <tr><th>Type de travaux</th><th>Certifications</th></tr>
    <tr><td>${designation}</td><td>${certifStr ? certifStr.replace(" — ", "") : "Aucune"}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>🏗️ Conditions de stockage et accès logistique</h3>
  <table>
    <tr><th>Emplacement plateforme</th><th>Surface</th><th>Accès camion</th><th>Largeur accès</th></tr>
    <tr>
      <td>${plateformeStr}</td>
      <td>${surfacePlatStr}</td>
      <td>${visite?.accesCamion === "praticable" ? "✓ Praticable" : visite?.accesCamion === "difficile" ? "⚠ Difficile" : visite?.accesCamion === "impossible" ? "✗ Impossible" : "—"}</td>
      <td>${visite?.largeurAcces ? visite.largeurAcces + " m" : "—"}</td>
    </tr>
  </table>
  ${visite?.notesAcces ? `<div class="note">📝 Modalités d'accès : ${visite.notesAcces}</div>` : ""}
</div>

<div class="sec">
  <h3>📊 Estimation &amp; Conditions commerciales</h3>
  <table>
    <tr><th>Désignation</th><th>Volume estimé</th><th>${prixTitre}</th></tr>
    <tr>
      <td>${designation} — ${lot.potentiel || "bois énergie"}</td>
      <td>${fmtNum(volumeT)} t</td>
      <td><strong>${prixLabel}</strong></td>
    </tr>
  </table>
  ${conditionsParticulieres ? `<div class="note">📝 Conditions particulières : ${conditionsParticulieres}</div>` : ""}
</div>

<div class="sec">
  <h3>💳 Conditions de paiement</h3>
  <table>
    <tr><th>Mode de règlement</th><th>Délai de règlement</th></tr>
    <tr>
      <td>${(modeReglementBC ? MODE_REGLEMENT_BC_OPTS[modeReglementBC] : undefined) || "—"}</td>
      <td>${(delaiReglementBC ? DELAI_REGLEMENT_BC_OPTS[delaiReglementBC] : undefined) || "—"}</td>
    </tr>
  </table>
  ${visite && (visite.tauxTVA || visite.acompte || visite.iban) ? `
  <table>
    <tr><th>TVA</th><th>Acompte</th><th>IBAN</th><th>Banque</th></tr>
    <tr>
      <td>${visite.tauxTVA ? visite.tauxTVA + " %" : "—"}</td>
      <td>${visite.acompte ? visite.acompte + " €" : "—"}</td>
      <td>${visite.iban || "—"}</td>
      <td>${[visite.nomBanque, visite.villeBanque].filter(Boolean).join(" · ") || "—"}</td>
    </tr>
  </table>` : ""}
</div>

<div class="sec">
  <h3>📅 Réception de la commande</h3>
  <table>
    <tr><th>Date de réception</th><th>Observations</th></tr>
    <tr>
      <td>${dateReception ? new Date(dateReception).toLocaleDateString("fr-FR") : "—"}</td>
      <td>${observationsBC || "—"}</td>
    </tr>
  </table>
</div>

${visite ? `
<div class="sec">
  <h3>🪓 Conditions d'exploitation</h3>
  <table>
    <tr><th>Accès camion</th><th>Largeur voie</th><th>Distance plateforme</th><th>Date limite</th></tr>
    <tr>
      <td>${visite.accesCamion === "praticable" ? "✓ Praticable" : visite.accesCamion === "difficile" ? "⚠ Difficile" : "✗ Impossible"}</td>
      <td>${visite.largeurAcces || "—"} m</td>
      <td>${visite.distancePlateforme || "—"} m</td>
      <td>${visite.dateLimite || "Non définie"}</td>
    </tr>
  </table>
  ${Object.values(visite.contraintes || {}).some(Boolean) ? `
  <div class="note">⚠ Contraintes terrain identifiées : ${Object.entries(visite.contraintes || {}).filter(([, v]) => v).map(([k]) => k).join(", ")}</div>` : ""}
</div>` : ""}

${visite?.replantation === "oui" ? `
<div class="replant">
  🌱 <strong>Replantation prévue</strong> — ${visite.essenceReplanT || "Essences à définir"}
  ${visite.surfaceReplant ? " · " + visite.surfaceReplant + " ha" : ""}
  ${visite.dateReplant ? " · Prévue le " + new Date(visite.dateReplant).toLocaleDateString("fr-FR") : ""}
  ${visite.respReplant ? " · Responsable : " + visite.respReplant : ""}
</div>` : ""}

<div class="cg">
  <strong>Conditions générales :</strong><br/>
  1. Le présent bon de commande est valable 30 jours à compter de sa date d'émission.<br/>
  2. Les quantités indiquées sont estimées sur la base de la visite terrain.<br/>
  3. Le paiement s'effectue à réception de la facture définitive après pesée à la livraison.<br/>
  4. En cas de désaccord sur les volumes, la pesée à la chaufferie fait foi.<br/>
  5. L'exploitation respectera les règles de bonne gestion forestière et les conditions d'accès définies ci-dessus.
  ${visite?.certification === "red" ? `<br/>6. Ce lot est soumis à la directive RED — traçabilité GPS requise.` : ""}
</div>

<div class="sigs">
  <div class="sig">
    <h4>Le Vendeur / Propriétaire</h4>
    <div class="who">${nomSignProprio || lot.nomSignataire || (lot.nom || "") + " " + (lot.prenom || "")}</div>
    ${sigDataProprio
      ? `<img src="${sigDataProprio}" style="width:100%;height:60px;object-fit:contain;margin:8px 0;border:1px solid #eee;border-radius:4px;"/>`
      : `<div style="height:60px;border:1px dashed #ccc;border-radius:4px;margin:8px 0;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:10px;">Signature manuscrite</div>`}
    <div class="line">Fait à _____________ le ${dateSign ? new Date(dateSign).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}</div>
  </div>
  <div class="sig">
    <h4>Le Donneur d'ordre</h4>
    <div class="who">${nomSignExploit || nomDO || "____________________"}<br/><span style="font-size:9px;color:#9A9892">${qualiteDO || "Qualité : ____________________"}</span></div>
    ${sigDataExploit
      ? `<img src="${sigDataExploit}" style="width:100%;height:60px;object-fit:contain;margin:8px 0;border:1px solid #eee;border-radius:4px;"/>`
      : `<div style="height:60px;border:1px dashed #ccc;border-radius:4px;margin:8px 0;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:10px;">Signature manuscrite</div>`}
    <div class="line">Fait à _____________ le ${dateSign ? new Date(dateSign).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR")}</div>
  </div>
</div>

<div class="footer">
  APPLITAG — Gestion forestière terrain · Référence ${lot.lotNumero || "—"} ·
  Document généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
</div>

<div class="page" style="page-break-before:always">
<div style="border-bottom:2.5px solid #4CAF50;padding-bottom:10px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center">
  <div style="font-size:18px;font-weight:700;color:#1E5B3A">Conditions générales d'achats et de prestations</div>
  <div style="font-size:9px;color:#9A9892">Réf. ${lot.lotNumero || "—"}</div>
</div>
<div style="font-size:10px;color:#1A1A18;line-height:1.8;columns:2;column-gap:20px">
<p style="font-weight:700;font-size:10.5px;margin-bottom:6px">Article 1 — Objet</p>
<p style="margin-bottom:10px">Les présentes conditions régissent tout achat de bois ou toute commande de prestation de services forestiers passée par le Donneur d'ordre (ci-après "DO") auprès du Prestataire ou du Vendeur (ci-après "Prestataire"), sauf accord écrit contraire.</p>
<p style="font-weight:700;font-size:10.5px;margin-bottom:6px">Article 2 — Prix et règlement</p>
<p style="margin-bottom:10px">Les prix sont fermes et non révisables pour la durée du bon de commande. Le règlement s'effectue selon les modalités précisées en page 1. Tout retard de paiement entraîne des pénalités au taux légal majoré de 5 points.</p>
<p style="font-weight:700;font-size:10.5px;margin-bottom:6px">Article 3 — Volumes et pesées</p>
<p style="margin-bottom:10px">Les volumes sont estimatifs. La pesée sur pont-bascule homologué à la destination finale fait foi pour la facturation définitive. En cas de contestation, une contre-expertise contradictoire peut être demandée dans les 48 h suivant la livraison.</p>
<p style="font-weight:700;font-size:10.5px;margin-bottom:6px">Article 4 — Qualité et conformité</p>
<p style="margin-bottom:10px">Le bois livré doit être conforme aux spécifications du bon de commande (essence, humidité, granulométrie). Tout défaut de conformité constaté à la réception doit être signalé dans les 24 h par écrit au DO.</p>
<p style="font-weight:700;font-size:10.5px;margin-bottom:6px">Article 5 — Sécurité et réglementation</p>
<p style="margin-bottom:10px">Le Prestataire est seul responsable de la sécurité de ses salariés et engins sur le chantier. Il respecte la réglementation en vigueur (Code forestier, Code du travail, règles de bonne sylviculture). Il doit posséder toutes les assurances obligatoires.</p>
<p style="font-weight:700;font-size:10.5px;margin-bottom:6px">Article 6 — Traçabilité et durabilité</p>
<p style="margin-bottom:10px">Pour les lots soumis à la Directive RED II (2018/2001/UE), le Prestataire garantit la traçabilité GPS, la légalité de la récolte et la gestion durable certifiée. Les justificatifs (auto-déclaration, certificats) doivent être fournis avant la livraison.</p>
<p style="font-weight:700;font-size:10.5px;margin-bottom:6px">Article 7 — Résiliation</p>
<p style="margin-bottom:10px">En cas d'inexécution non remédiée dans un délai de 8 jours après mise en demeure, le DO pourra résilier le bon de commande de plein droit, sans préjudice de tout dommage et intérêt.</p>
<p style="font-weight:700;font-size:10.5px;margin-bottom:6px">Article 8 — Litiges</p>
<p style="margin-bottom:10px">Tout litige sera soumis à la compétence exclusive des tribunaux du siège social du Donneur d'ordre. Le droit applicable est le droit français.</p>
</div>
<div style="margin-top:20px;padding-top:10px;border-top:1px solid #DDDBD5;font-size:8.5px;color:#9A9892;text-align:center">
  APPLITAG — Conditions générales d'achats et de prestations · Version en vigueur à la date d'émission du document
</div>
</div>

</div></body></html>`;
};

// ── ORDRE D'EXPLOITATION ──────────────────────────────────────────────────────

export const buildOrdreExploitationHTML = (ordre: OrdreExploitation): string => {
  const delaiFmt = ordre.delaiExecution
    ? new Date(ordre.delaiExecution).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "À préciser";
  const dateDoc = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  return `<!DOCTYPE html><html lang="fr">
<head>
<meta charset="UTF-8">
<title>Ordre d'exploitation ${ordre.lotNumero || ""}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1A1A18;background:#fff}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;
  border-bottom:2.5px solid #4CAF50;padding-bottom:14px;margin-bottom:18px}
.logo h1{font-size:20px;font-weight:700;color:#1E5B3A;letter-spacing:-0.5px}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.doc-ref{text-align:right}
.doc-ref h2{font-size:16px;font-weight:700;color:#1A1A18;text-transform:uppercase}
.doc-ref .num{font-family:monospace;font-size:13px;color:#1E5B3A;margin-top:4px}
.doc-ref .dt{font-size:9px;color:#9A9892;margin-top:3px}
.objet{background:#E8F5E9;border-left:4px solid #4CAF50;padding:10px 14px;margin-bottom:16px;border-radius:0 6px 6px 0}
.objet .lbl{font-size:9px;color:#1E5B3A;text-transform:uppercase;font-weight:700;margin-bottom:3px}
.objet .val{font-size:12px;font-weight:700;color:#1A1A18}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}
.card{border:1px solid #DDDBD5;border-radius:6px;padding:11px}
.card h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #ECEAE6;padding-bottom:5px;margin-bottom:8px}
.card p{font-size:10.5px;color:#1A1A18;line-height:1.85}
.card .sub{font-size:9.5px;color:#5A5955}
.sec{margin-bottom:14px}
.sec h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th{background:#1E5B3A;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:600}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
.note{background:#FAEEDA;border:1px solid #BA7517;border-radius:5px;padding:9px 12px;
  font-size:9.5px;color:#412402;line-height:1.7;margin-bottom:14px}
.code-box{background:#E8F5E9;border:2px solid #4CAF50;border-radius:8px;padding:12px 16px;
  display:flex;align-items:center;gap:16px;margin-bottom:16px}
.code-box .lbl{font-size:9.5px;color:#1E5B3A;font-weight:600}
.code-box .code{font-family:monospace;font-size:26px;font-weight:800;color:#1E5B3A;letter-spacing:6px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
.sig{border:1px solid #DDDBD5;border-radius:6px;padding:12px}
.sig h4{font-size:10px;font-weight:700;color:#1E5B3A;margin-bottom:4px}
.sig .who{font-size:9.5px;color:#5A5955;margin-bottom:40px}
.sig .line{border-top:1px solid #1A1A18;padding-top:5px;font-size:9px;color:#9A9892}
.footer{margin-top:24px;padding-top:12px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style>
</head>
<body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 ${ordre.doNom || "APPLITAG SAS"}</h1>
    <p>${ordre.doAdresse || ""}${ordre.doCP || ordre.doCommune ? ` · ${[ordre.doCP, ordre.doCommune].filter(Boolean).join(" ")}` : ""}</p>
    <p style="margin-top:2px">${ordre.doSiret ? `SIRET ${ordre.doSiret} — ` : ""}${ordre.doEmail || ""}</p>
  </div>
  <div class="doc-ref">
    <h2>Ordre d'exploitation</h2>
    <div class="num">Réf. ${ordre.lotNumero || "BROUILLON"}</div>
    <div class="dt">Émis le ${dateDoc}</div>
  </div>
</div>

<div class="objet">
  <div class="lbl">Objet</div>
  <div class="val">Ordre d'exploitation forestière — ${ordre.missionLabel || "Abattage / Débardage"}</div>
</div>

<div class="two">
  <div class="card">
    <h3>🏢 Destinataire (Sous-traitant)</h3>
    <p>
      <strong>${ordre.entrepriseNom || "—"}</strong><br/>
      ${ordre.entrepriseAdresse ? ordre.entrepriseAdresse + "<br/>" : ""}
      ${ordre.entrepriseComplement ? ordre.entrepriseComplement + "<br/>" : ""}
      ${[ordre.entrepriseCP, ordre.entrepriseCommune].filter(Boolean).join(" ") || ""}
      ${ordre.entrepriseSiret ? `<br/><span class="sub">SIRET ${ordre.entrepriseSiret}</span>` : ""}
    </p>
  </div>
  <div class="card">
    <h3>📍 Chantier — Lot ${ordre.lotNumero || ""}</h3>
    <p>
      ${ordre.lotCommune || "—"}${ordre.lotRefCadastrale ? ` · Réf. cad. ${ordre.lotRefCadastrale}` : ""}<br/>
      ${ordre.lotAdresse ? ordre.lotAdresse + "<br/>" : ""}
      ${ordre.lotSurfaceHa ? `🌲 Surface : ${ordre.lotSurfaceHa} ha` : ""}
    </p>
  </div>
</div>

<div class="sec">
  <h3>🪓 Désignation des travaux</h3>
  <table>
    <tr><th>Prestation</th><th>Volume estimé</th><th>Délai d'exécution</th></tr>
    <tr>
      <td>${ordre.missionLabel || "Abattage et débardage"}</td>
      <td>${ordre.volumeEstime ? ordre.volumeEstime + " t" : "—"}</td>
      <td>${delaiFmt}</td>
    </tr>
  </table>
  ${ordre.description ? `<div class="note">📝 ${ordre.description}</div>` : ""}
</div>

<div class="code-box">
  <div>
    <div class="lbl">Code de validation APPLITAG</div>
    <div style="font-size:9px;color:#5A5955;margin-top:3px">À saisir dans l'application pour confirmer l'acceptation du chantier</div>
  </div>
  <div class="code">${ordre.code || "------"}</div>
</div>

<div class="sigs">
  <div class="sig">
    <h4>Le Donneur d'ordre</h4>
    <div class="who">${ordre.doNom || "APPLITAG SAS"}</div>
    <div class="line">Fait à _____________ le ${dateDoc}</div>
  </div>
  <div class="sig">
    <h4>Le Sous-traitant (bon pour accord)</h4>
    <div class="who">${ordre.entrepriseNom || "____________________"}</div>
    <div class="line">Fait à _____________ le ________________</div>
  </div>
</div>

<div class="footer">
  APPLITAG — Gestion des flux bois énergie · Référence ${ordre.lotNumero || "—"} ·
  Document généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
</div>

</div></body></html>`;
};

// ── AUTO-DÉCLARATION RED ──────────────────────────────────────────────────────

export const buildRedHTML = (lot: LotDoc, visite: VisiteDoc | null | undefined, transport: TransportDoc | null | undefined, livraison: LivraisonDoc | null | undefined, typeDecl: string): string => {
  const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const tonnage = livraison?.poidsNet || livraison?.poidsBrut || visite?.volumeEstimeT || "—";
  const gpsParc = visite?.gps ? `${visite.gps.lat.toFixed(5)}°N, ${visite.gps.lng.toFixed(5)}°E` : "—";
  const dist = visite?.redDistance || "—";
  const categorie = visite?.redCategorie || "bois_forestier";
  const categorieLabel = ({ bois_forestier: "Bois forestier", residus: "Résidus forestiers", dechets: "Déchets bois" } as Record<string, string>)[categorie] || categorie;
  const certif = visite?.numeroCertification ? `Certification ${visite.certification?.toUpperCase()} n° ${visite.numeroCertification}` : "Non certifié";
  const typeLabels: Record<string, string> = {
    auto: "Auto-déclaration de durabilité",
    durabilite: "Déclaration de durabilité",
    pos: "Preuve de durabilité (PoS)",
  };

  return `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<title>Déclaration RED — ${lot.lotNumero}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:11px;color:#1A1A18}
.page{width:210mm;min-height:297mm;padding:14mm 16mm;margin:0 auto}
.header{border-bottom:3px solid #1E5B3A;padding-bottom:12px;margin-bottom:20px;
  display:flex;justify-content:space-between;align-items:flex-start}
.logo h1{font-size:20px;font-weight:700;color:#1E5B3A}
.logo p{font-size:9px;color:#9A9892;margin-top:3px}
.badge{background:#E8F5E9;border:2px solid #1E5B3A;border-radius:6px;
  padding:8px 14px;text-align:right}
.badge h2{font-size:14px;font-weight:700;color:#1E5B3A}
.badge p{font-size:9px;color:#5A5955;margin-top:2px}
.alert{background:#E6F1FB;border:1px solid #185FA5;border-radius:6px;
  padding:10px 14px;margin-bottom:16px;font-size:10px;color:#042C53;line-height:1.7}
.sec{margin-bottom:16px}
.sec h3{font-size:10px;font-weight:700;color:#1E5B3A;text-transform:uppercase;
  letter-spacing:.5px;border-bottom:1px solid #DDDBD5;padding-bottom:5px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
th{background:#1E5B3A;color:#fff;padding:6px 10px;text-align:left;font-size:10px}
td{padding:7px 10px;border-bottom:1px solid #ECEAE6;font-size:10.5px}
td:first-child{font-weight:600;width:45%}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;page-break-inside:avoid}
.sig-box{border:1px solid #DDDBD5;border-radius:6px;padding:12px}
.sig-box h4{font-size:10px;font-weight:700;color:#1E5B3A;margin-bottom:3px}
.sig-line{margin-top:50px;border-top:1px solid #1A1A18;padding-top:5px;font-size:9px;color:#9A9892}
.footer{margin-top:20px;padding-top:10px;border-top:1px solid #DDDBD5;
  font-size:8.5px;color:#9A9892;text-align:center;line-height:1.6}
.ref{background:#F5F4F1;border-radius:5px;padding:9px 12px;font-size:9px;
  color:#5A5955;line-height:1.8;margin-bottom:14px}
@media print{
  body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  @page{size:A4;margin:0}
  .page{padding:12mm 14mm}
}
</style></head><body><div class="page">

<div class="header">
  <div class="logo">
    <h1>🌲 APPLITAG</h1>
    <p>Traçabilité forestière bois-énergie</p>
  </div>
  <div class="badge">
    <h2>${typeLabels[typeDecl] || typeDecl}</h2>
    <p>Directive RED — Biomasse bois-énergie</p>
    <p>Référence : ${lot.lotNumero} · ${date}</p>
  </div>
</div>

<div class="alert">
  <strong>Base réglementaire :</strong> Directive (UE) 2018/2001 (RED II) et règlement délégué (UE) 2022/996 —
  Critères de durabilité pour la biomasse solide destinée à la production d'énergie.<br/>
  Consortium de référence : CIBE / CNPF / FNEDT — FAQ RED Bois-énergie v29/04/2026
</div>

<div class="sec">
  <h3>1. Identification de l'opérateur économique</h3>
  <table>
    <tr><td>Raison sociale</td><td>APPLITAG — Gestionnaire forestier</td></tr>
    <tr><td>Référence interne</td><td>${lot.lotNumero || "—"}</td></tr>
    <tr><td>Date d'émission</td><td>${date}</td></tr>
    <tr><td>Type de déclaration</td><td>${typeLabels[typeDecl] || typeDecl}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>2. Description de la biomasse</h3>
  <table>
    <tr><td>Catégorie biomasse</td><td>${categorieLabel}</td></tr>
    <tr><td>Pays d'origine</td><td>${visite?.redPays || "France"}</td></tr>
    <tr><td>Commune / Parcelle</td><td>${lot.commune || "—"} — ${lot.adresseParcelle || "—"}</td></tr>
    <tr><td>Coordonnées GPS parcelle</td><td>${gpsParc}</td></tr>
    <tr><td>Surface exploitée</td><td>${lot.surfaceHa || "—"} ha</td></tr>
    <tr><td>Essences principales</td><td>${visite?.essences?.map(e => `${e.label} (${e.pct}%)`).join(", ") || "—"}</td></tr>
    <tr><td>Réf. cadastrale</td><td>${lot.refCadastrale || "—"}</td></tr>
  </table>
</div>

<div class="sec">
  <h3>3. Données de traçabilité</h3>
  <table>
    <tr><td>Tonnage livré</td><td>${tonnage} tonnes</td></tr>
    <tr><td>Humidité à réception</td><td>${livraison?.humiditeReception || visite?.humiditeMesure || "—"} %</td></tr>
    <tr><td>Destination</td><td>${livraison?.nomDestination || "—"}</td></tr>
    <tr><td>Distance parcelle → chaufferie</td><td>${dist} km</td></tr>
    <tr><td>N° CMR</td><td>${transport?.numeroCMR || "—"}</td></tr>
    <tr><td>Date livraison</td><td>${livraison?.date?.slice(0, 10) || "—"}</td></tr>
    <tr><td>Certification applicable</td><td>${certif}</td></tr>
  </table>
</div>

${typeDecl === "pos" ? `
<div class="sec">
  <h3>4. Informations de transfert (PoS)</h3>
  <table>
    <tr><td>Opérateur émetteur</td><td>${lot.etfNom || "—"}</td></tr>
    <tr><td>Opérateur récepteur</td><td>${livraison?.nomReceptionnaire || "—"}</td></tr>
    <tr><td>Type de transfert</td><td>Livraison directe chaufferie</td></tr>
    <tr><td>Quantité transférée</td><td>${tonnage} tonnes</td></tr>
  </table>
</div>` : ""}

<div class="ref">
  <strong>Critères de durabilité vérifiés (Art. 29 RED II) :</strong><br/>
  ✓ Provenance géolocalisée — coordonnées GPS enregistrées lors de la visite terrain<br/>
  ✓ Pays d'origine UE — France, traçabilité complète de la forêt à la chaufferie<br/>
  ✓ Catégorie biomasse identifiée — ${categorieLabel}<br/>
  ✓ Distance de transport documentée — ${dist} km (seuil recommandé : &lt;500 km)<br/>
  ${visite?.replantation === "oui" ? "✓ Replantation prévue — exigences sylvicoles respectées<br/>" : ""}
  ✓ Données enregistrées dans APPLITAG — système de traçabilité numérique horodaté
</div>

<div class="sig">
  <div class="sig-box">
    <h4>L'opérateur économique soussigné atteste</h4>
    <p style="font-size:9px;color:#5A5955;margin-top:4px;line-height:1.5">
      Les informations contenues dans ce document sont exactes et vérifiables.
      Cette déclaration est émise sous ma responsabilité.
    </p>
    <div class="sig-line">Nom, qualité et signature · Date : ${date}</div>
  </div>
  <div class="sig-box">
    <h4>Cachet de l'entreprise</h4>
    <p style="font-size:9px;color:#5A5955;margin-top:4px">APPLITAG<br/>Gestion forestière terrain</p>
    <div class="sig-line">Tampon et signature</div>
  </div>
</div>

<div class="footer">
  APPLITAG · Traçabilité RED bois-énergie · Lot ${lot.lotNumero || "—"} ·
  Document généré le ${date} · Confidentiel — Usage interne
</div>
</div></body></html>`;
};

// ── DOSSIER DE TRAÇABILITÉ PREUVE — livraison unique ─────────────────────────

export interface DossierTracabiliteData {
  livraison: {
    id: string; lotNumero: string; date?: string; nomDestination?: string;
    numeroBL?: string; poidsBrut?: number | null; tare?: number | null;
    poidsNet?: number | null; humiditeReception?: number | null;
    numTicket?: string | null; peseeVerifiee?: boolean;
    distanceKm?: number | null; prixMatiereT?: number | null;
    prixBroyageT?: number | null; prixChargementT?: number | null;
    prixTransportT?: number | null; prixSurchargeCarburantT?: number | null;
    statut?: string;
  };
  contact?: {
    nom?: string; prenom?: string; commune?: string; surfaceHa?: number | null;
    refCadastrale?: string | null; lotNumero?: string | null; potentiel?: string | null;
    adresseParcelle?: string | null;
  } | null;
  gesKgCO2e?: number | null;
  gesSource?: string;
  facteurEmissionKgCO2eTKm?: number;
  generatedAt?: string;
  entrepriseNom?: string;
}

export const buildDossierTracabiliteHTML = (d: DossierTracabiliteData): string => {
  const { livraison: l, contact: c } = d;
  const dateGen = d.generatedAt ? new Date(d.generatedAt).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR");
  const prixTotal = [l.prixMatiereT, l.prixBroyageT, l.prixChargementT, l.prixTransportT, l.prixSurchargeCarburantT]
    .reduce((s: number, v) => s + (v ?? 0), 0);
  const gesTonnes = d.gesKgCO2e != null ? (d.gesKgCO2e / 1000).toFixed(4) : null;

  const row = (label: string, value: string | number | null | undefined) =>
    value != null && value !== ""
      ? `<tr><td class="lbl">${label}</td><td>${value}</td></tr>`
      : "";

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Dossier traçabilité — ${l.lotNumero}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px;
         color: #333; background: #fff; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #1E5B3A; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 18px; font-weight: 900; color: #1E5B3A; letter-spacing: -0.5px; }
  .brand span { font-weight: 400; color: #4CAF50; }
  .doc-type { font-size: 10px; color: #5A5955; margin-top: 2px; }
  .lot-badge { background: #E8F5E9; color: #1E5B3A; font-size: 16px; font-weight: 800;
               padding: 6px 14px; border-radius: 8px; border: 2px solid #1E5B3A; }
  h3 { font-size: 11px; font-weight: 700; color: #1E5B3A; text-transform: uppercase;
       letter-spacing: 0.5px; margin: 14px 0 6px; padding-bottom: 4px;
       border-bottom: 1px solid #E8F5E9; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td { padding: 4px 6px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  td.lbl { color: #5A5955; width: 48%; font-weight: 500; }
  .ges-box { background: #E6F1FB; border: 1.5px solid #185FA5; border-radius: 8px;
             padding: 12px 16px; margin: 14px 0; }
  .ges-main { font-size: 22px; font-weight: 900; color: #042C53; }
  .ges-unit { font-size: 13px; font-weight: 600; color: #185FA5; }
  .ges-note { font-size: 9px; color: #5A5955; margin-top: 4px; line-height: 1.4; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px;
           font-size: 10px; font-weight: 600; }
  .badge-ok  { background: #E8F5E9; color: #1E5B3A; }
  .badge-ko  { background: #FCEBEB; color: #A32D2D; }
  .badge-dec { background: #FAEEDA; color: #BA7517; }
  .prix-grid { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0; }
  .prix-item { background: #F3F4F6; border-radius: 6px; padding: 3px 8px;
               font-size: 10px; color: #333; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #DDDBD5;
            font-size: 9px; color: #9A9892; text-align: center; line-height: 1.6; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media print { body { padding: 10mm; } }
</style>
</head><body>

<div class="header">
  <div>
    <div class="brand">APPLITAG<span> Connect</span></div>
    <div class="doc-type">Dossier de preuve — Traçabilité livraison bois-énergie</div>
    <div class="doc-type">Généré le ${dateGen}${d.entrepriseNom ? ` · ${d.entrepriseNom}` : ""}</div>
  </div>
  <div class="lot-badge">Lot ${l.lotNumero}</div>
</div>

<div class="two-col">
<div>
<h3>📦 Livraison</h3>
<table>
  ${row("Date", l.date)}
  ${row("Destination", l.nomDestination)}
  ${row("N° BL / CMR", l.numeroBL)}
  ${row("Statut", l.statut === "verifiee" ? "✅ Pesée vérifiée" : l.statut === "litigieuse" ? "⚠️ Litigieuse" : "📋 Déclarée")}
</table>

<h3>⚖️ Pesée</h3>
<table>
  ${row("Poids brut (kg)", l.poidsBrut?.toLocaleString("fr-FR") ?? null)}
  ${row("Tare (kg)", l.tare?.toLocaleString("fr-FR") ?? null)}
  ${row("Poids net (kg)", l.poidsNet?.toLocaleString("fr-FR") ?? null)}
  ${row("Humidité réception (%)", l.humiditeReception != null ? `${l.humiditeReception} %` : null)}
  ${row("N° ticket balance", l.numTicket)}
  ${row("Pesée vérifiée", l.peseeVerifiee
    ? '<span class="badge badge-ok">✓ Oui — justificatif reçu</span>'
    : '<span class="badge badge-dec">En attente de confirmation</span>')}
</table>
</div>

<div>
<h3>🌲 Lot d'origine</h3>
<table>
  ${row("N° lot", c?.lotNumero)}
  ${row("Propriétaire", c ? `${c.nom ?? ""}${c.prenom ? " " + c.prenom : ""}`.trim() : null)}
  ${row("Commune", c?.commune)}
  ${row("Parcelle", c?.adresseParcelle)}
  ${row("Réf. cadastrale", c?.refCadastrale)}
  ${row("Surface (ha)", c?.surfaceHa != null ? `${c.surfaceHa} ha` : null)}
  ${row("Type ressource", c?.potentiel)}
</table>

<h3>🚛 Transport</h3>
<table>
  ${row("Distance (km)", l.distanceKm != null ? `${l.distanceKm} km` : null)}
  ${row("Coût total (/t)", prixTotal > 0 ? `${prixTotal.toFixed(2)} €/t` : null)}
</table>
${prixTotal > 0 ? `
<div class="prix-grid">
  ${l.prixMatiereT  ? `<div class="prix-item">🪵 ${l.prixMatiereT.toFixed(2)} €/t matière</div>`  : ""}
  ${l.prixBroyageT  ? `<div class="prix-item">🌀 ${l.prixBroyageT.toFixed(2)} €/t broyage</div>`  : ""}
  ${l.prixChargementT ? `<div class="prix-item">🏗️ ${l.prixChargementT.toFixed(2)} €/t charg.</div>` : ""}
  ${l.prixTransportT ? `<div class="prix-item">🚛 ${l.prixTransportT.toFixed(2)} €/t transp.</div>` : ""}
  ${l.prixSurchargeCarburantT ? `<div class="prix-item">⛽ ${l.prixSurchargeCarburantT.toFixed(2)} €/t carbu.</div>` : ""}
</div>` : ""}
</div>
</div>

<h3>🌍 Bilan GES transport — calcul ADEME</h3>
${d.gesKgCO2e != null
  ? `<div class="ges-box">
  <span class="ges-main">${d.gesKgCO2e.toFixed(3)}</span>
  <span class="ges-unit"> kgCO₂e</span>
  &nbsp;·&nbsp;
  <span class="ges-main">${gesTonnes}</span>
  <span class="ges-unit"> tCO₂e</span>
  <div class="ges-note">
    Formule : (${l.poidsNet?.toLocaleString("fr-FR") ?? "—"} kg / 1 000) × ${l.distanceKm} km × ${d.facteurEmissionKgCO2eTKm ?? 0.096} kgCO₂e/t.km<br/>
    Source : ${d.gesSource ?? "ADEME Base Carbone v25.0 — Transport routier marchandises (code 1.5.1)"}<br/>
    Mode : Transport routier, poids lourd diesel, charge complète
  </div>
</div>`
  : `<p style="color:#9A9892;font-style:italic">
      GES non calculable — poids net ou distance non renseignés sur cette livraison.
    </p>`
}

<div class="footer">
  APPLITAG · Dossier de preuve traçabilité · Lot ${l.lotNumero} · Livraison du ${l.date || "—"} ·
  Généré le ${dateGen} — Document confidentiel, usage interne et réglementaire (RED, marchés publics)
</div>

</body></html>`;
};
