import { DoctorProfile, FullTaxComputation, Transaction, getCategoryById } from "blackpine-engine";

interface FilingData {
  profile: DoctorProfile;
  result: FullTaxComputation;
  transactions: Transaction[];
  fiscalYear: number;
}

function fmt(n: number): string {
  if (n === 0) return "";
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function fmtNonZero(n: number): string {
  if (n === 0) return "";
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function catLabel(id: string, year: number): string {
  const cat = getCategoryById(year, id);
  return cat?.labelFr ?? id;
}

function css(): string {
  return `<style>
    @page { margin: 12mm; size: A4; }
    body { font-family: Arial, sans-serif; font-size: 9.5px; color: #000; margin: 0; padding: 8px; }
    .page { page-break-after: always; min-height: 270mm; position: relative; }
    .page:last-child { page-break-after: auto; }
    h2 { font-size: 11px; text-align: center; margin: 4px 0; font-weight: bold; }
    h3 { font-size: 10px; text-align: center; margin: 2px 0; }
    .entity { text-align: right; font-size: 9px; font-weight: bold; margin-bottom: 4px; }
    .exercise { text-align: right; font-size: 9px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 9px; }
    th, td { border: 1px solid #000; padding: 2px 4px; vertical-align: top; }
    th { background: #e0e0e0; font-weight: bold; text-align: center; font-size: 8px; text-transform: uppercase; }
    .section-header { background: #333; color: #fff; text-align: left; font-size: 9px; padding: 3px 5px; font-weight: bold; }
    .section-header-light { background: #f0f0f0; text-align: left; font-size: 9px; padding: 3px 5px; font-weight: bold; }
    .label { text-align: left; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .indent { padding-left: 12px; }
    .indent2 { padding-left: 24px; }
    .total td { font-weight: bold; background: #f5f5f5; }
    .grand-total td { font-weight: bold; background: #e0e0e0; font-size: 10px; }
    .empty { color: #999; }
    .note { font-size: 8px; color: #666; margin-top: 6px; }
    .header-box { border: 2px solid #000; padding: 10px; margin-bottom: 8px; text-align: center; }
    .header-box .kingdom { font-size: 9px; }
    .header-box .title { font-size: 13px; font-weight: bold; margin: 6px 0; }
    .sign-area { margin-top: 20px; display: flex; justify-content: space-between; }
    .sign-box { width: 45%; font-size: 9px; }
    .sign-line { border-top: 1px solid #000; margin-top: 30px; padding-top: 4px; }
    .footer-note { text-align: center; font-size: 7px; color: #999; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 6px; }
    .id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .id-cell { border: 1px solid #000; padding: 3px 5px; font-size: 9px; }
    .id-label { background: #f5f5f5; font-weight: bold; }
  </style>`;
}

function entityHeader(d: FilingData): string {
  return `<div class="entity">À compléter — Raison sociale</div>
    <div class="exercise">EXERCICE CLOS LE 31/12/${d.fiscalYear}</div>`;
}

// ==================== PAGE DE GARDE ====================
function coverPage(d: FilingData): string {
  const { profile, fiscalYear } = d;
  return `<div class="page">
    <div class="header-box">
      <div class="kingdom">ROYAUME DU MAROC</div>
      <div class="kingdom">MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES</div>
      <div class="kingdom">DIRECTION GÉNÉRALE DES IMPÔTS</div>
      <div class="title">IMPÔT SUR LES REVENUS</div>
      <div style="font-size:11px;">PIÈCES ANNEXES À LA DÉCLARATION FISCALE</div>
      <div style="font-size:10px;">(Modèle Comptable Normal)</div>
    </div>

    <table>
      <tr><td style="width:50%">IR Modèle 101 / IR/N</td><td></td></tr>
      <tr><td>Exercice comptable du 01/01/${fiscalYear} au 31/12/${fiscalYear}</td><td></td></tr>
    </table>

    <table>
      <tr><td class="id-label" style="width:35%">Raison sociale</td><td>À compléter</td></tr>
      <tr><td class="id-label">Article I.F.</td><td>À compléter</td></tr>
      <tr><td class="id-label">Taxe professionnelle</td><td>À compléter</td></tr>
      <tr><td class="id-label">ICE</td><td>À compléter</td></tr>
      <tr><td class="id-label">N° CNSS</td><td>À compléter</td></tr>
      <tr><td class="id-label">Adresse</td><td>${profile.commune}</td></tr>
    </table>

    <div style="margin-top:30px;">
      <table style="border:none;">
        <tr>
          <td style="width:50%;border:none;vertical-align:top;">
            <p>Signature</p><br><br>
            <p>À ${profile.commune} LE _______________</p>
          </td>
          <td style="width:50%;border:none;vertical-align:top;">
            <p style="font-weight:bold;">CADRE RÉSERVÉ À L'ADMINISTRATION</p>
            <p>N° d'enregistrement : ....................</p>
            <p>Date : ....................</p>
            <p>Signature</p>
          </td>
        </tr>
      </table>
    </div>

    <p class="note">NB: Les tableaux de 1 à 13 sont conformes aux états prévus par la loi n° 9.88 relative aux obligations comptables des commerçants promulguée par le Dahir n°1.92.138 du 3 joumada II 1413 (15.12.1992)</p>
  </div>`;
}

// ==================== TABLEAU N°1 — BILAN ====================
function bilanPage(d: FilingData): string {
  const { fiscalYear } = d;
  // We don't track assets — generate empty template
  return `<div class="page">
    <h2>Tableau n°1</h2>
    <h3>BILAN (ACTIF)</h3>
    ${entityHeader(d)}

    <table>
      <tr>
        <th style="width:45%">ACTIF</th>
        <th>Brut</th>
        <th>Amortissements<br>et Provisions</th>
        <th>Net</th>
      </tr>
      <tr><td colspan="4" class="section-header">IMMOBILISATION EN NON VALEUR (a)</td></tr>
      <tr><td class="indent">Frais préliminaires</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Charges à répartir sur plusieurs exercices</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">IMMOBILISATIONS INCORPORELLES (b)</td></tr>
      <tr><td class="indent">Brevets, marques, droits et valeurs similaires</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Fonds commercial</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">IMMOBILISATIONS CORPORELLES (c)</td></tr>
      <tr><td class="indent">Terrains</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Constructions</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Installations techniques, matériel et outillage</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Matériel de transport</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Mobiliers, matériel de bureau et aménagements</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">IMMOBILISATIONS FINANCIÈRES (d)</td></tr>
      <tr><td class="indent">Prêts immobilisés</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Autres créances financières</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr class="grand-total"><td>TOTAL I (a+b+c+d)</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">ACTIF CIRCULANT</td></tr>
      <tr><td class="indent">Fournisseurs débiteurs, avances et acomptes</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Clients et comptes rattachés</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">État</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td>TOTAL II</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">TRÉSORERIE — ACTIF</td></tr>
      <tr><td class="indent">Banques, T.G & CP</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Caisses, régies d'avances</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td>TOTAL III</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr class="grand-total"><td>TOTAL GÉNÉRAL I+II+III</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
    </table>

    <p class="note">⚠️ Ce tableau doit être complété par votre expert-comptable avec les données de votre comptabilité.</p>
  </div>`;
}

// ==================== TABLEAU N°2 — CPC ====================
function cpcPage(d: FilingData): string {
  const { result, transactions, fiscalYear } = d;
  const { breakdown } = result;
  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const charges = yearTx.filter(tx => tx.type === "CHARGE");

  // Map charges to PCM accounts
  const pcmMapping: Record<string, string> = {
    consommables_medicaux: "6121", produits_pharmaceutiques: "6121", fournitures_bureau: "6125",
    petit_materiel_medical: "6125", loyer_cabinet: "6131", charges_copropriete: "6131",
    entretien_reparation: "6133", entretien_vehicule: "6133", entretien_nettoyage: "6133",
    assurance_local: "6134", rc_pro: "6134", assurance_vehicule: "6134",
    honoraires_comptable: "6136", honoraires_avocat: "6136",
    carburant: "6142", taxi_visites: "6142", deplacement_missions: "6142",
    telephone_mobile_pro: "6145", internet_telephone: "6145",
    site_web: "6144", publicite_pro: "6144", cadeaux_correspondants: "6148",
    electricite_eau: "6148", blouse_tenue_pro: "6148", logiciel_informatique: "6148",
    taxe_professionnelle: "6161", taxe_services_communaux: "6161",
    salaires_personnel: "6171", menage_declare: "6171",
    cotisations_cnss_employeur: "6174", charges_sociales_personnel: "6174",
    cotisations_cnss_tns: "6174",
    congres_formation: "6148", voyages_congres: "6142",
    interets_emprunt_pro: "6311", frais_bancaires: "6386",
    gros_equipement_medical: "619", vehicule_amortissement: "619",
    ordre_medecins: "6181", abonnements_medicaux: "6181",
    retraite_cimr: "6174", dons_deductibles: "6586",
  };

  // Group by PCM account
  const pcmGroups: Record<string, number> = {};
  charges.forEach(tx => {
    const account = pcmMapping[tx.category] || "6148";
    pcmGroups[account] = (pcmGroups[account] || 0) + tx.amount;
  });

  const achats = (pcmGroups["6121"] || 0) + (pcmGroups["6125"] || 0);
  const autresChargesExternes = (pcmGroups["6131"] || 0) + (pcmGroups["6133"] || 0) +
    (pcmGroups["6134"] || 0) + (pcmGroups["6136"] || 0) + (pcmGroups["6142"] || 0) +
    (pcmGroups["6144"] || 0) + (pcmGroups["6145"] || 0) + (pcmGroups["6148"] || 0);
  const impotsEtTaxes = pcmGroups["6161"] || 0;
  const personnel = (pcmGroups["6171"] || 0) + (pcmGroups["6174"] || 0);
  const dotations = (pcmGroups["619"] || 0);
  const chargesFinancieres = (pcmGroups["6311"] || 0) + (pcmGroups["6386"] || 0);
  const totalExploitation = achats + autresChargesExternes + impotsEtTaxes + personnel + dotations;
  const resultatExpl = breakdown.totalRecettes - totalExploitation;

  return `<div class="page">
    <h2>Tableau n°2</h2>
    <h3>COMPTE DE PRODUITS ET CHARGES (C.P.C)</h3>
    ${entityHeader(d)}

    <table>
      <tr>
        <th style="width:45%"></th>
        <th>Propres à<br>l'exercice (1)</th>
        <th>Concernant les<br>ex. précédents (2)</th>
        <th>Totaux de<br>l'exercice (3=1+2)</th>
      </tr>

      <tr><td colspan="4" class="section-header">I PRODUITS D'EXPLOITATION</td></tr>
      <tr><td class="indent">Ventes de marchandises</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Ventes de biens et services produits</td><td class="right">${fmt(breakdown.totalRecettes)}</td><td class="right"></td><td class="right">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr class="total"><td class="indent bold">* Chiffres d'affaires</td><td class="right bold">${fmt(breakdown.totalRecettes)}</td><td class="right"></td><td class="right bold">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td class="indent">Variation de stock de produits</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Subvention d'exploitation</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Autres produits d'exploitation</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Reprises d'exploitation; transfert de charges</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="grand-total"><td>TOTAL I</td><td class="right">${fmt(breakdown.totalRecettes)}</td><td class="right"></td><td class="right">${fmt(breakdown.totalRecettes)}</td></tr>

      <tr><td colspan="4" class="section-header">II CHARGES D'EXPLOITATION</td></tr>
      <tr><td class="indent">Achats revendus de marchandises</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Achats consommés de matières et fournitures</td><td class="right">${fmtNonZero(achats)}</td><td class="right"></td><td class="right">${fmtNonZero(achats)}</td></tr>
      <tr><td class="indent">Autres charges externes</td><td class="right">${fmtNonZero(autresChargesExternes)}</td><td class="right"></td><td class="right">${fmtNonZero(autresChargesExternes)}</td></tr>
      <tr><td class="indent">Impôts et taxes</td><td class="right">${fmtNonZero(impotsEtTaxes)}</td><td class="right"></td><td class="right">${fmtNonZero(impotsEtTaxes)}</td></tr>
      <tr><td class="indent">Charges de personnel</td><td class="right">${fmtNonZero(personnel)}</td><td class="right"></td><td class="right">${fmtNonZero(personnel)}</td></tr>
      <tr><td class="indent">Autres charges d'exploitation</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Dotations d'exploitation</td><td class="right">${fmtNonZero(dotations)}</td><td class="right"></td><td class="right">${fmtNonZero(dotations)}</td></tr>
      <tr class="grand-total"><td>TOTAL II</td><td class="right">${fmt(totalExploitation)}</td><td class="right"></td><td class="right">${fmt(totalExploitation)}</td></tr>

      <tr class="grand-total"><td>III RÉSULTAT D'EXPLOITATION (I - II)</td><td colspan="3" class="right">${fmt(resultatExpl)}</td></tr>

      <tr><td colspan="4" class="section-header">IV PRODUITS FINANCIERS</td></tr>
      <tr><td class="indent">Produits des titres de participation</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Gains de change</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Intérêts et autres produits financiers</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td>TOTAL IV</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">V CHARGES FINANCIÈRES</td></tr>
      <tr><td class="indent">Charges d'intérêts</td><td class="right">${fmtNonZero(pcmGroups["6311"] || 0)}</td><td class="right"></td><td class="right">${fmtNonZero(pcmGroups["6311"] || 0)}</td></tr>
      <tr><td class="indent">Pertes de change</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Autres charges financières</td><td class="right">${fmtNonZero(pcmGroups["6386"] || 0)}</td><td class="right"></td><td class="right">${fmtNonZero(pcmGroups["6386"] || 0)}</td></tr>
      <tr class="total"><td>TOTAL V</td><td class="right">${fmtNonZero(chargesFinancieres)}</td><td class="right"></td><td class="right">${fmtNonZero(chargesFinancieres)}</td></tr>

      <tr class="total"><td>VI RÉSULTAT FINANCIER (IV - V)</td><td colspan="3" class="right">${chargesFinancieres > 0 ? fmt(-chargesFinancieres) : ""}</td></tr>
      <tr class="grand-total"><td>VII RÉSULTAT COURANT (III + VI)</td><td colspan="3" class="right">${fmt(resultatExpl - chargesFinancieres)}</td></tr>
    </table>

    <p class="note">(1) Variation de stocks : stock final - stock initial ; augmentation (+) ; diminution (-)</p>
  </div>`;
}

function cpcPage2(d: FilingData): string {
  const { result, fiscalYear } = d;
  const { breakdown } = result;
  const resultatCourant = breakdown.totalRecettes - breakdown.totalCharges;

  return `<div class="page">
    <h2>Tableau n°2 (suite)</h2>
    <h3>COMPTE DE PRODUITS ET CHARGES (HORS TAXES) (suite)</h3>
    ${entityHeader(d)}

    <table>
      <tr>
        <th style="width:45%"></th>
        <th>Propres à<br>l'exercice (1)</th>
        <th>Concernant les<br>ex. précédents (2)</th>
        <th>Totaux de<br>l'exercice (3=1+2)</th>
      </tr>
      <tr class="total"><td>VII RÉSULTAT COURANT (Report)</td><td colspan="3" class="right">${fmt(resultatCourant)}</td></tr>

      <tr><td colspan="4" class="section-header">VIII PRODUITS NON COURANTS</td></tr>
      <tr><td class="indent">Produits des cessions d'immobilisations</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Subventions d'équilibre</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Autres produits non courants</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Reprises non courantes; transferts de charges</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td>TOTAL VIII</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">IX CHARGES NON COURANTES</td></tr>
      <tr><td class="indent">Valeurs nettes d'amort. des Immo cédées</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Subventions accordées</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Autres charges non courantes</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Dotations non courantes aux amort. et provisions</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td>TOTAL IX</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr class="total"><td>X RÉSULTAT NON COURANT (VIII - IX)</td><td colspan="3" class="right"></td></tr>
      <tr class="total"><td>XI RÉSULTAT AVANT IMPÔTS (VII + X)</td><td colspan="3" class="right">${fmt(resultatCourant)}</td></tr>
      <tr><td>XII IMPÔTS SUR LES RÉSULTATS</td><td colspan="3" class="right">${fmt(result.tax.taxDue)}</td></tr>
      <tr class="grand-total"><td>XIII RÉSULTAT NET (XI - XII)</td><td colspan="3" class="right">${fmt(resultatCourant - result.tax.taxDue)}</td></tr>
    </table>

    <table style="margin-top:8px;">
      <tr class="total"><td style="width:60%">XIV TOTAL DES PRODUITS (I + IV + VIII)</td><td class="right">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr class="total"><td>XV TOTAL DES CHARGES (II + V + IX + XII)</td><td class="right">${fmt(breakdown.totalCharges + result.tax.taxDue)}</td></tr>
      <tr class="grand-total"><td>XVI RÉSULTAT NET (XIV - XV)</td><td class="right">${fmt(resultatCourant - result.tax.taxDue)}</td></tr>
    </table>
  </div>`;
}

// ==================== TABLEAU N°3 — PASSAGE ====================
function passagePage(d: FilingData): string {
  const { result, fiscalYear } = d;
  const { breakdown } = result;
  const resultatNet = breakdown.totalRecettes - breakdown.totalCharges;
  const isBenefice = breakdown.resultatFiscal > 0;

  return `<div class="page">
    <h2>Tableau n°3</h2>
    <h3>PASSAGE DU RÉSULTAT NET COMPTABLE AU RÉSULTAT NET FISCAL</h3>
    ${entityHeader(d)}

    <table>
      <tr><th style="width:55%">INTITULÉS</th><th>MONTANT</th><th>MONTANT</th></tr>

      <tr><td colspan="3" class="section-header">I. RÉSULTAT NET COMPTABLE</td></tr>
      <tr><td class="indent">* Bénéfice net</td><td class="right">${resultatNet > 0 ? fmt(resultatNet) : ""}</td><td class="right"></td></tr>
      <tr><td class="indent">* Perte nette</td><td class="right"></td><td class="right">${resultatNet <= 0 ? fmt(Math.abs(resultatNet)) : ""}</td></tr>

      <tr><td colspan="3" class="section-header">II. RÉINTÉGRATIONS FISCALES</td></tr>
      <tr><td class="indent">1. Courantes</td><td class="right">${fmtNonZero(breakdown.totalReintegrations)}</td><td class="right"></td></tr>
      <tr><td class="indent">2. Non courantes</td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="3" class="section-header">III. DÉDUCTIONS FISCALES</td></tr>
      <tr><td class="indent">1. Courantes</td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">2. Non courantes</td><td class="right"></td><td class="right"></td></tr>

      <tr class="total"><td>Total</td><td class="right">${fmtNonZero(breakdown.totalReintegrations)}</td><td class="right">${resultatNet <= 0 ? fmt(Math.abs(resultatNet)) : ""}</td></tr>

      <tr><td colspan="3" class="section-header">IV. RÉSULTAT BRUT FISCAL</td></tr>
      <tr><td class="indent">Bénéfice brut si T1 > T2 (A)</td><td colspan="2" class="right">${isBenefice ? fmt(breakdown.resultatFiscal) : ""}</td></tr>
      <tr><td class="indent">Déficit brut fiscal si T2 > T1 (B)</td><td colspan="2" class="right">${!isBenefice ? fmt(Math.abs(breakdown.resultatFiscal)) : ""}</td></tr>

      <tr><td colspan="3" class="section-header">V. REPORTS DÉFICITAIRES IMPUTÉS (C) (1)</td></tr>
      <tr><td class="indent">* Exercice n - 4</td><td colspan="2" class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 3</td><td colspan="2" class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 2</td><td colspan="2" class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 1</td><td colspan="2" class="right"></td></tr>

      <tr><td colspan="3" class="section-header">VI. RÉSULTAT NET FISCAL</td></tr>
      <tr><td class="indent bold">Bénéfice net fiscal (A - C)</td><td colspan="2" class="right bold">${isBenefice ? fmt(breakdown.resultatFiscal) : ""}</td></tr>
      <tr><td class="indent bold">ou Déficit net fiscal (B)</td><td colspan="2" class="right bold">${!isBenefice ? fmt(Math.abs(breakdown.resultatFiscal)) : ""}</td></tr>

      <tr><td colspan="3" class="section-header">VII. CUMUL DES AMORTISSEMENTS FISCALEMENT DIFFÉRÉS</td></tr>
      <tr><td class="indent"></td><td colspan="2" class="right"></td></tr>

      <tr><td colspan="3" class="section-header">VIII. CUMUL DES DÉFICITS FISCAUX RESTANT À REPORTER</td></tr>
      <tr><td class="indent">* Exercice n - 4</td><td colspan="2" class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 3</td><td colspan="2" class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 2</td><td colspan="2" class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 1</td><td colspan="2" class="right"></td></tr>
    </table>

    <p class="note">(1) Dans la limite du montant du bénéfice brut fiscal (A)</p>
  </div>`;
}

// ==================== TABLEAU N°5 — ESG ====================
function esgPage(d: FilingData): string {
  const { result, transactions, fiscalYear } = d;
  const { breakdown } = result;
  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const charges = yearTx.filter(tx => tx.type === "CHARGE");

  const achats = charges.filter(tx => ["consommables_medicaux", "fournitures_bureau", "petit_materiel_medical", "produits_pharmaceutiques"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const autresCharges = charges.filter(tx => !["consommables_medicaux", "fournitures_bureau", "petit_materiel_medical", "produits_pharmaceutiques", "taxe_professionnelle", "taxe_services_communaux", "salaires_personnel", "menage_declare", "cotisations_cnss_employeur", "charges_sociales_personnel", "cotisations_cnss_tns", "retraite_cimr", "gros_equipement_medical", "vehicule_amortissement", "interets_emprunt_pro", "frais_bancaires", "dons_deductibles"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const impots = charges.filter(tx => ["taxe_professionnelle", "taxe_services_communaux"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const personnel = charges.filter(tx => ["salaires_personnel", "menage_declare", "cotisations_cnss_employeur", "charges_sociales_personnel", "cotisations_cnss_tns", "retraite_cimr"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const dotations = charges.filter(tx => ["gros_equipement_medical", "vehicule_amortissement"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const consommation = achats + autresCharges;
  const va = breakdown.totalRecettes - consommation;
  const ebe = va - impots - personnel;
  const resultatExpl = ebe - dotations;

  return `<div class="page">
    <h2>Tableau n°5</h2>
    <h3>ÉTAT DES SOLDES INTERMÉDIAIRES DE GESTION (E.S.G)</h3>
    ${entityHeader(d)}

    <table>
      <tr><th style="width:8%">N°</th><th style="width:55%">NATURE</th><th>EXERCICE</th></tr>

      <tr><td></td><td class="section-header-light">MARGE BRUTE SUR VENTES EN L'ÉTAT</td><td class="right"></td></tr>

      <tr class="total"><td>II</td><td class="bold">+ PRODUCTION DE L'EXERCICE (3+4+5)</td><td class="right bold">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td>3</td><td class="indent">Ventes de biens et services produits</td><td class="right">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td>4</td><td class="indent">Variation de stocks de produits</td><td class="right"></td></tr>
      <tr><td>5</td><td class="indent">Immobilisations produites par l'Ese pour elle-même</td><td class="right"></td></tr>

      <tr class="total"><td>III</td><td class="bold">- CONSOMMATION DE L'EXERCICE (6+7)</td><td class="right bold">${fmt(consommation)}</td></tr>
      <tr><td>6</td><td class="indent">Achats consommés de matières et fournitures</td><td class="right">${fmtNonZero(achats)}</td></tr>
      <tr><td>7</td><td class="indent">Autres charges externes</td><td class="right">${fmtNonZero(autresCharges)}</td></tr>

      <tr class="grand-total"><td>IV</td><td class="bold">= VALEUR AJOUTÉE (I+II-III)</td><td class="right bold">${fmt(va)}</td></tr>

      <tr><td></td><td class="indent">+ Subventions d'exploitation</td><td class="right"></td></tr>
      <tr><td>V</td><td class="indent">9 - Impôts et taxes</td><td class="right">${fmtNonZero(impots)}</td></tr>
      <tr><td></td><td class="indent">10 - Charges de personnel</td><td class="right">${fmtNonZero(personnel)}</td></tr>

      <tr class="grand-total"><td></td><td class="bold">= EXCÉDENT BRUT D'EXPLOITATION (E.B.E)</td><td class="right bold">${fmt(ebe)}</td></tr>

      <tr><td>11</td><td class="indent">+ Autres produits d'exploitation</td><td class="right"></td></tr>
      <tr><td>12</td><td class="indent">- Autres charges d'exploitation</td><td class="right"></td></tr>
      <tr><td>13</td><td class="indent">+ Reprises d'exploitation; transfert de charges</td><td class="right"></td></tr>
      <tr><td>14</td><td class="indent">- Dotations d'exploitation</td><td class="right">${fmtNonZero(dotations)}</td></tr>

      <tr class="grand-total"><td>VI</td><td class="bold">= RÉSULTAT D'EXPLOITATION (+ ou -)</td><td class="right bold">${fmt(resultatExpl)}</td></tr>

      <tr><td>VII</td><td>RÉSULTAT FINANCIER</td><td class="right"></td></tr>
      <tr class="grand-total"><td>VIII</td><td class="bold">= RÉSULTAT COURANT (+ ou -)</td><td class="right bold">${fmt(resultatExpl)}</td></tr>
      <tr><td>IX</td><td>RÉSULTAT NON COURANT (+ ou -)</td><td class="right"></td></tr>
      <tr><td>15</td><td>- Impôts sur les résultats</td><td class="right">${fmt(result.tax.taxDue)}</td></tr>
      <tr class="grand-total"><td>X</td><td class="bold" style="background:#ddd;">= RÉSULTAT NET DE L'EXERCICE (+ ou -)</td><td class="right bold" style="background:#ddd;">${fmt(resultatExpl - result.tax.taxDue)}</td></tr>
    </table>
  </div>`;
}

// ==================== TABLEAU N°6 — DÉTAIL CPC ====================
function detailCPCPage(d: FilingData): string {
  const { transactions, fiscalYear } = d;
  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const charges = yearTx.filter(tx => tx.type === "CHARGE");
  const recettes = yearTx.filter(tx => tx.type === "RECETTE");

  // Group charges by category with amounts
  const chargeDetails = charges.reduce((acc, tx) => {
    const label = catLabel(tx.category, fiscalYear);
    acc[label] = (acc[label] || 0) + tx.amount;
    return acc;
  }, {} as Record<string, number>);

  const chargeRows = Object.entries(chargeDetails)
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => `<tr><td class="indent2">* ${label}</td><td class="right">${fmt(amount)}</td></tr>`)
    .join("");

  const totalCharges = charges.reduce((s, tx) => s + tx.amount, 0);
  const totalRecettes = recettes.reduce((s, tx) => s + tx.amount, 0);

  // Group recettes by category
  const recetteDetails = recettes.reduce((acc, tx) => {
    const label = catLabel(tx.category, fiscalYear);
    acc[label] = (acc[label] || 0) + tx.amount;
    return acc;
  }, {} as Record<string, number>);

  const recetteRows = Object.entries(recetteDetails)
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => `<tr><td class="indent2">* ${label}</td><td class="right">${fmt(amount)}</td></tr>`)
    .join("");

  return `<div class="page">
    <h2>Tableau n°6</h2>
    <h3>DÉTAIL DES POSTES DU C.P.C.</h3>
    ${entityHeader(d)}

    <table>
      <tr><th style="width:65%">POSTE</th><th>EXERCICE</th></tr>

      <tr><td colspan="2" class="section-header">611 CHARGES D'EXPLOITATION</td></tr>
      <tr><td class="section-header-light">612 Achats consommés de matières et fournitures</td><td class="right"></td></tr>
      ${chargeRows}
      <tr class="total"><td class="bold">Total charges d'exploitation</td><td class="right bold">${fmt(totalCharges)}</td></tr>
    </table>

    <table style="margin-top:8px;">
      <tr><th style="width:65%">POSTE</th><th>EXERCICE</th></tr>

      <tr><td colspan="2" class="section-header">PRODUITS D'EXPLOITATION</td></tr>
      <tr><td class="section-header-light">712 Ventes des biens et services produits</td><td class="right"></td></tr>
      ${recetteRows}
      <tr class="total"><td class="bold">Total produits d'exploitation</td><td class="right bold">${fmt(totalRecettes)}</td></tr>
    </table>
  </div>`;
}

// ==================== TABLEAU N°8 — AMORTISSEMENTS ====================
function amortissementsPage(d: FilingData): string {
  return `<div class="page">
    <h2>Tableau n°8</h2>
    <h3>TABLEAU DES AMORTISSEMENTS</h3>
    ${entityHeader(d)}

    <table>
      <tr>
        <th style="width:30%">NATURE</th>
        <th>Cumul début<br>exercice</th>
        <th>Dotation de<br>l'exercice</th>
        <th>Amortissements sur<br>immob. sorties</th>
        <th>Cumul fin<br>exercice</th>
      </tr>

      <tr><td colspan="5" class="section-header">IMMOBILISATION EN NON-VALEURS</td></tr>
      <tr><td class="indent">* Frais préliminaires</td><td class="right"></td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">* Charges à répartir</td><td class="right"></td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="5" class="section-header">IMMOBILISATIONS CORPORELLES</td></tr>
      <tr><td class="indent">* Constructions</td><td class="right"></td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">* Installations techniques, matériel et outillage</td><td class="right"></td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">* Matériel de transport</td><td class="right"></td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">* Mobilier, matériel de bureau</td><td class="right"></td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">* Autres immobilisations corporelles</td><td class="right"></td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr class="grand-total"><td>TOTAL GÉNÉRAL</td><td class="right"></td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
    </table>

    <p class="note">⚠️ Ce tableau doit être complété par votre expert-comptable avec le détail des immobilisations et leurs amortissements.</p>
  </div>`;
}

// ==================== CALCUL IR ====================
function irCalcPage(d: FilingData): string {
  const { profile, result, fiscalYear } = d;
  const { breakdown, tax } = result;
  const quarterAmount = Math.round(tax.taxDue / 4);

  const specialtyLabels: Record<string, string> = {
    medecin_generaliste: "Médecin généraliste", medecin_specialiste: "Médecin spécialiste",
    dentiste: "Dentiste", kinesitherapeute: "Kinésithérapeute",
    sage_femme: "Sage-femme", autre: "Autre profession de santé",
  };

  return `<div class="page">
    <h2>CALCUL DE L'IMPÔT SUR LE REVENU</h2>
    <h3>Exercice ${fiscalYear} — Base légale : Code Général des Impôts</h3>
    ${entityHeader(d)}

    <table>
      <tr><td class="id-label" style="width:35%">Profession</td><td>${specialtyLabels[profile.specialty || ""] || "Professionnel de santé"}</td></tr>
      <tr><td class="id-label">Commune</td><td>${profile.commune} (${profile.communeType === "URBAN" ? "Urbain" : "Rural"})</td></tr>
      <tr><td class="id-label">Régime fiscal</td><td>${tax.regime} (${tax.regime === "RNR" ? "Art. 38 CGI" : "Art. 39 CGI"})</td></tr>
      <tr><td class="id-label">Situation familiale</td><td>${profile.maritalStatus === "MARRIED" ? "Marié(e)" : "Célibataire"} — ${profile.dependentsCount} personne(s) à charge</td></tr>
      <tr><td class="id-label">Date début d'activité</td><td>${new Date(profile.activityStartDate).toLocaleDateString("fr-FR")}</td></tr>
    </table>

    <table style="margin-top:8px;">
      <tr><th style="width:55%">ÉLÉMENTS — Art. 82 CGI</th><th>MONTANT (MAD)</th></tr>
      <tr><td>Chiffre d'affaires (total recettes)</td><td class="right">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td>Total des charges</td><td class="right">${fmt(breakdown.totalCharges)}</td></tr>
      <tr><td>Charges déductibles (Art. 10 CGI)</td><td class="right">${fmt(breakdown.totalChargesDeductibles)}</td></tr>
      <tr><td>Réintégrations fiscales (Art. 11 CGI)</td><td class="right">${fmt(breakdown.totalReintegrations)}</td></tr>
      <tr class="grand-total"><td>Résultat fiscal (Art. 8 CGI)</td><td class="right">${fmt(breakdown.resultatFiscal)}</td></tr>
    </table>

    <table style="margin-top:8px;">
      <tr><th style="width:55%">CALCUL IR — Art. 73 CGI (barème progressif)</th><th>MONTANT (MAD)</th></tr>
      <tr><td>IR brut</td><td class="right">${fmt(tax.ir.grossIR)}</td></tr>
      <tr><td>Déduction pour charges de famille (Art. 74 CGI) — ${profile.dependentsCount} × 500 MAD</td><td class="right">- ${fmt(tax.familyDeduction)}</td></tr>
      <tr><td>IR net</td><td class="right">${fmt(Math.max(0, tax.ir.grossIR - tax.familyDeduction))}</td></tr>
      <tr><td>Cotisation minimale (Art. 144 CGI) — taux ${(tax.cm.cmRate * 100).toFixed(1)}%</td><td class="right">${fmt(tax.cm.cmDue)}${tax.cm.exempted ? " (exemptée — Art. 144-I)" : ""}</td></tr>
      <tr><td>Règle appliquée (Art. 144-II CGI)</td><td class="right">${tax.payableRule}</td></tr>
      <tr class="grand-total"><td>IMPÔT DÛ</td><td class="right">${fmt(tax.taxDue)}</td></tr>
    </table>

    <table style="margin-top:8px;">
      <tr><th style="width:40%">ACOMPTES — Art. 175 CGI</th><th>MONTANT (MAD)</th><th>ÉCHÉANCE</th><th>STATUT</th></tr>
      <tr><td>1er acompte</td><td class="right">${fmt(quarterAmount)}</td><td class="center">31/03/${fiscalYear}</td><td class="center">☐</td></tr>
      <tr><td>2ème acompte</td><td class="right">${fmt(quarterAmount)}</td><td class="center">30/06/${fiscalYear}</td><td class="center">☐</td></tr>
      <tr><td>3ème acompte</td><td class="right">${fmt(quarterAmount)}</td><td class="center">30/09/${fiscalYear}</td><td class="center">☐</td></tr>
      <tr><td>4ème acompte</td><td class="right">${fmt(quarterAmount)}</td><td class="center">31/12/${fiscalYear}</td><td class="center">☐</td></tr>
      <tr class="total"><td>Total</td><td class="right bold">${fmt(quarterAmount * 4)}</td><td></td><td></td></tr>
    </table>

    <div class="sign-area">
      <div class="sign-box"><div class="sign-line">Date : _______________</div></div>
      <div class="sign-box"><div class="sign-line">Signature du contribuable</div></div>
    </div>
  </div>`;
}

// ==================== ASSEMBLY ====================
export function generateLiasseFiscaleHtml(data: FilingData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${css()}</head><body>
    ${coverPage(data)}
    ${bilanPage(data)}
    ${cpcPage(data)}
    ${cpcPage2(data)}
    ${passagePage(data)}
    ${esgPage(data)}
    ${detailCPCPage(data)}
    ${amortissementsPage(data)}
    ${irCalcPage(data)}

    <div style="padding:10px;">
      <div style="background:#FEF5E7; border:1px solid #F39C12; border-radius:6px; padding:10px; font-size:9px; color:#8B6914; text-align:center; margin-bottom:10px;">
        ⚠️ Document pré-rempli par Blackpine Cabinet. Les tableaux du Bilan (T1), des Immobilisations (T4) et des Amortissements (T8) doivent être complétés par votre expert-comptable. Les champs marqués "À compléter" nécessitent vos informations d'identification fiscale. Ce document ne remplace pas les formulaires officiels de la DGI et ne constitue pas un avis fiscal professionnel.
      </div>
      <div class="footer-note">
        Généré le ${new Date().toLocaleDateString("fr-FR")} · Blackpine Cabinet · Exercice ${data.fiscalYear} · Config fiscale ${data.result.configVersion}
      </div>
    </div>
  </body></html>`;
}