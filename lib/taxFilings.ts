import { DoctorProfile, FullTaxComputation, Transaction } from "blackpine-engine";

interface FilingData {
  profile: DoctorProfile;
  result: FullTaxComputation;
  transactions: Transaction[];
  fiscalYear: number;
}

function fmt(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function css(): string {
  return `<style>
    @page { margin: 15mm; size: A4; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #000; margin: 0; padding: 10px; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    h2 { font-size: 12px; text-align: center; margin: 4px 0; }
    h3 { font-size: 11px; margin: 8px 0 4px; }
    .header { text-align: center; border: 1px solid #000; padding: 10px; margin-bottom: 10px; }
    .header .kingdom { font-size: 9px; }
    .header .title { font-size: 14px; font-weight: bold; margin: 6px 0; }
    .header .subtitle { font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    th, td { border: 1px solid #000; padding: 3px 5px; }
    th { background: #e8e8e8; font-weight: bold; text-align: center; font-size: 9px; }
    .section-header { background: #333; color: #fff; text-align: left; font-size: 10px; padding: 4px 6px; }
    .label { text-align: left; }
    .value { text-align: right; font-weight: bold; }
    .total td { font-weight: bold; background: #f0f0f0; }
    .indent { padding-left: 20px; }
    .indent2 { padding-left: 35px; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 8px; color: #666; }
    .sign-block { display: flex; justify-content: space-between; margin-top: 30px; }
    .sign-box { width: 40%; border-top: 1px solid #000; padding-top: 4px; font-size: 9px; }
    .note { font-size: 8px; color: #666; margin-top: 10px; font-style: italic; }
    .id-table td { border: 1px solid #000; padding: 2px 4px; font-size: 10px; }
    .id-table .k { width: 35%; background: #f5f5f5; }
  </style>`;
}

function coverPage(d: FilingData): string {
  const { profile, fiscalYear } = d;
  return `<div class="page">
    <div class="header">
      <div class="kingdom">ROYAUME DU MAROC</div>
      <div class="kingdom">MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES</div>
      <div class="kingdom">DIRECTION GÉNÉRALE DES IMPÔTS</div>
      <div class="title">IMPÔT SUR LES REVENUS</div>
      <div class="subtitle">PIÈCES ANNEXES À LA DÉCLARATION FISCALE</div>
      <div class="subtitle">(Modèle Comptable Normal)</div>
    </div>
    <table style="margin-top: 20px;">
      <tr><td class="label" style="width:50%">IR Modèle 101 / IR/N</td><td></td></tr>
      <tr><td class="label">Exercice comptable du 01/01/${fiscalYear} au 31/12/${fiscalYear}</td><td></td></tr>
    </table>
    <table class="id-table">
      <tr><td class="k">Raison sociale</td><td>À compléter</td></tr>
      <tr><td class="k">Article I.F.</td><td>À compléter</td></tr>
      <tr><td class="k">Taxe professionnelle</td><td>À compléter</td></tr>
      <tr><td class="k">Adresse</td><td>${profile.commune}</td></tr>
    </table>
    <div style="margin-top: 40px;">
      <table>
        <tr>
          <td style="width:50%; border:none; vertical-align: top;">
            <p>Signature</p>
            <br><br>
            <p>À ${profile.commune} LE _______________</p>
          </td>
          <td style="width:50%; border:none; vertical-align: top;">
            <p style="font-weight:bold;">CADRE RÉSERVÉ À L'ADMINISTRATION</p>
            <p>Numéro d'enregistrement : ..................</p>
            <p>Date : ..................</p>
            <p>Signature</p>
          </td>
        </tr>
      </table>
    </div>
    <p class="small">NB: Les tableaux de 1 à 13 sont conformes aux états prévus par la loi n° 9.88 relative aux obligations comptables des commerçants.</p>
  </div>`;
}

function cpcPage(d: FilingData): string {
  const { result, transactions, fiscalYear } = d;
  const { breakdown } = result;
  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const charges = yearTx.filter(tx => tx.type === "CHARGE");

  // Categorize charges
  const achats = charges.filter(tx => ["consommables_medicaux", "fournitures_bureau", "petit_equipement"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const autresCharges = charges.filter(tx => ["loyer_cabinet", "eau_electricite", "telephone_internet", "entretien_reparation", "assurance_rc_pro", "carburant", "deplacement_missions"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const impots = charges.filter(tx => ["taxe_professionnelle", "taxe_services_communaux"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const personnel = charges.filter(tx => ["salaires_personnel", "charges_sociales_personnel"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const dotations = charges.filter(tx => ["amortissement_materiel", "amortissement_vehicule"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const honoraires = charges.filter(tx => ["honoraires_comptable", "honoraires_avocat"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const totalCharges = breakdown.totalCharges;
  const resultatExploitation = breakdown.totalRecettes - totalCharges;

  return `<div class="page">
    <h2>Tableau n°2</h2>
    <h3>COMPTE DE PRODUITS ET CHARGES (C.P.C)</h3>
    <p class="small" style="text-align:right;">EXERCICE CLOS LE 31/12/${fiscalYear}</p>
    <table>
      <tr>
        <th style="width:50%">OPÉRATIONS</th>
        <th>Propres à l'exercice (1)</th>
        <th>Concernant les ex. précédents (2)</th>
        <th>Totaux de l'exercice (3=1+2)</th>
      </tr>
      <tr><td colspan="4" class="section-header">I PRODUITS D'EXPLOITATION</td></tr>
      <tr><td class="indent">Ventes de marchandises</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Ventes de biens et services produits</td><td class="right">${fmt(breakdown.totalRecettes)}</td><td class="right"></td><td class="right">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr class="total"><td class="indent">* Chiffres d'affaires</td><td class="right">${fmt(breakdown.totalRecettes)}</td><td class="right"></td><td class="right bold">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td class="indent">Variation de stock de produits</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Immobilisations produites pour l'Ese p/elle-même</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Subvention d'exploitation</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Autres produits d'exploitation</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Reprises d'exploitation; transfert de charges</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td class="bold">TOTAL I</td><td class="right">${fmt(breakdown.totalRecettes)}</td><td class="right"></td><td class="right bold">${fmt(breakdown.totalRecettes)}</td></tr>

      <tr><td colspan="4" class="section-header">II CHARGES D'EXPLOITATION</td></tr>
      <tr><td class="indent">Achats revendus de marchandises</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Achats consommés de matières et de fournitures</td><td class="right">${fmt(achats)}</td><td class="right"></td><td class="right">${fmt(achats)}</td></tr>
      <tr><td class="indent">Autres charges externes</td><td class="right">${fmt(autresCharges + honoraires)}</td><td class="right"></td><td class="right">${fmt(autresCharges + honoraires)}</td></tr>
      <tr><td class="indent">Impôts et taxes</td><td class="right">${fmt(impots)}</td><td class="right"></td><td class="right">${fmt(impots)}</td></tr>
      <tr><td class="indent">Charges de personnel</td><td class="right">${fmt(personnel)}</td><td class="right"></td><td class="right">${fmt(personnel)}</td></tr>
      <tr><td class="indent">Autres charges d'exploitation</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Dotations d'exploitation</td><td class="right">${fmt(dotations)}</td><td class="right"></td><td class="right">${fmt(dotations)}</td></tr>
      <tr class="total"><td class="bold">TOTAL II</td><td class="right">${fmt(totalCharges)}</td><td class="right"></td><td class="right bold">${fmt(totalCharges)}</td></tr>

      <tr class="total"><td class="bold">III RÉSULTAT D'EXPLOITATION (I - II)</td><td colspan="3" class="right bold">${fmt(resultatExploitation)}</td></tr>

      <tr><td colspan="4" class="section-header">IV PRODUITS FINANCIERS</td></tr>
      <tr><td class="indent">Produits des titres de participation</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Gains de change</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Intérêts et autres produits financiers</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td class="bold">TOTAL IV</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">V CHARGES FINANCIÈRES</td></tr>
      <tr><td class="indent">Charges d'intérêts</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Pertes de change</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td class="bold">TOTAL V</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr class="total"><td class="bold">VI RÉSULTAT FINANCIER (IV - V)</td><td colspan="3" class="right"></td></tr>
      <tr class="total"><td class="bold">VII RÉSULTAT COURANT (III + VI)</td><td colspan="3" class="right bold">${fmt(resultatExploitation)}</td></tr>
    </table>
  </div>`;
}

function cpcPage2(d: FilingData): string {
  const { result, fiscalYear } = d;
  const { breakdown } = result;
  const resultatExploitation = breakdown.totalRecettes - breakdown.totalCharges;

  return `<div class="page">
    <h2>Tableau n°2 (suite)</h2>
    <h3>COMPTE DE PRODUITS ET CHARGES (HORS TAXES) (suite)</h3>
    <p class="small" style="text-align:right;">EXERCICE CLOS LE 31/12/${fiscalYear}</p>
    <table>
      <tr>
        <th style="width:50%">OPÉRATIONS</th>
        <th>Propres à l'exercice (1)</th>
        <th>Concernant les ex. précédents (2)</th>
        <th>Totaux de l'exercice (3=1+2)</th>
      </tr>
      <tr class="total"><td class="bold">VII RÉSULTAT COURANT (Report)</td><td colspan="3" class="right bold">${fmt(resultatExploitation)}</td></tr>

      <tr><td colspan="4" class="section-header">VIII PRODUITS NON COURANTS</td></tr>
      <tr><td class="indent">Produits des cessions d'immobilisations</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Subventions d'équilibre</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Autres produits non courants</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td class="bold">TOTAL VIII</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr><td colspan="4" class="section-header">IX CHARGES NON COURANTES</td></tr>
      <tr><td class="indent">Valeurs nettes d'amort. des Immo cédées</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Subventions accordées</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr><td class="indent">Autres charges non courantes</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>
      <tr class="total"><td class="bold">TOTAL IX</td><td class="right"></td><td class="right"></td><td class="right"></td></tr>

      <tr class="total"><td class="bold">X RÉSULTAT NON COURANT (VIII - IX)</td><td colspan="3" class="right"></td></tr>
      <tr class="total"><td class="bold">XI RÉSULTAT AVANT IMPÔTS (VII + X)</td><td colspan="3" class="right bold">${fmt(resultatExploitation)}</td></tr>
      <tr><td class="bold">XII IMPÔTS SUR LES RÉSULTATS</td><td colspan="3" class="right">${fmt(result.tax.taxDue)}</td></tr>
      <tr class="total"><td class="bold" style="background:#ddd;">XIII RÉSULTAT NET (XI - XII)</td><td colspan="3" class="right bold">${fmt(resultatExploitation - result.tax.taxDue)}</td></tr>
    </table>

    <table style="margin-top:10px;">
      <tr class="total"><td style="width:50%">XIV TOTAL DES PRODUITS (I + IV + VIII)</td><td class="right bold">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr class="total"><td>XV TOTAL DES CHARGES (II + V + IX + XII)</td><td class="right bold">${fmt(breakdown.totalCharges + result.tax.taxDue)}</td></tr>
      <tr class="total"><td style="background:#ddd;">XVI RÉSULTAT NET (XIV - XV)</td><td class="right bold" style="background:#ddd;">${fmt(resultatExploitation - result.tax.taxDue)}</td></tr>
    </table>
  </div>`;
}

function passagePage(d: FilingData): string {
  const { result, fiscalYear } = d;
  const { breakdown } = result;
  const resultatNet = breakdown.totalRecettes - breakdown.totalCharges;
  const reintegrations = breakdown.totalReintegrations;
  const resultatFiscal = breakdown.resultatFiscal;
  const isBenefice = resultatFiscal > 0;

  return `<div class="page">
    <h2>Tableau n°3</h2>
    <h3>PASSAGE DU RÉSULTAT NET COMPTABLE AU RÉSULTAT NET FISCAL</h3>
    <p class="small" style="text-align:right;">EXERCICE CLOS LE 31/12/${fiscalYear}</p>
    <table>
      <tr><th style="width:60%">INTITULÉS</th><th>MONTANT</th></tr>

      <tr><td colspan="2" class="section-header">I. RÉSULTAT NET COMPTABLE</td></tr>
      <tr><td class="indent">* Bénéfice net</td><td class="right">${resultatNet > 0 ? fmt(resultatNet) : ""}</td></tr>
      <tr><td class="indent">* Perte nette</td><td class="right">${resultatNet <= 0 ? fmt(Math.abs(resultatNet)) : ""}</td></tr>

      <tr><td colspan="2" class="section-header">II. RÉINTÉGRATIONS FISCALES</td></tr>
      <tr><td class="indent">1. Courantes</td><td class="right">${fmt(reintegrations)}</td></tr>
      <tr><td class="indent">2. Non courantes</td><td class="right"></td></tr>

      <tr><td colspan="2" class="section-header">III. DÉDUCTIONS FISCALES</td></tr>
      <tr><td class="indent">1. Courantes</td><td class="right"></td></tr>
      <tr><td class="indent">2. Non courantes</td><td class="right"></td></tr>

      <tr class="total"><td colspan="2"></td></tr>

      <tr><td colspan="2" class="section-header">IV. RÉSULTAT BRUT FISCAL</td></tr>
      <tr><td class="indent">Bénéfice brut si T1 > T2 (A)</td><td class="right">${isBenefice ? fmt(resultatFiscal) : ""}</td></tr>
      <tr><td class="indent">Déficit brut fiscal si T2 > T1 (B)</td><td class="right">${!isBenefice ? fmt(Math.abs(resultatFiscal)) : ""}</td></tr>

      <tr><td colspan="2" class="section-header">V. REPORTS DÉFICITAIRES IMPUTÉS (C)</td></tr>
      <tr><td class="indent">* Exercice n - 4</td><td class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 3</td><td class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 2</td><td class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 1</td><td class="right"></td></tr>

      <tr><td colspan="2" class="section-header">VI. RÉSULTAT NET FISCAL</td></tr>
      <tr><td class="indent bold">Bénéfice net fiscal (A - C)</td><td class="right bold">${isBenefice ? fmt(resultatFiscal) : ""}</td></tr>
      <tr><td class="indent bold">ou Déficit net fiscal (B)</td><td class="right bold">${!isBenefice ? fmt(Math.abs(resultatFiscal)) : ""}</td></tr>

      <tr><td colspan="2" class="section-header">VII. CUMUL DES AMORTISSEMENTS FISCALEMENT DIFFÉRÉS</td></tr>
      <tr><td class="indent"></td><td class="right"></td></tr>

      <tr><td colspan="2" class="section-header">VIII. CUMUL DES DÉFICITS FISCAUX RESTANT À REPORTER</td></tr>
      <tr><td class="indent">* Exercice n - 4</td><td class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 3</td><td class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 2</td><td class="right"></td></tr>
      <tr><td class="indent">* Exercice n - 1</td><td class="right"></td></tr>
    </table>
    <p class="small">(1) Dans la limite du montant du bénéfice brut fiscal (A)</p>
  </div>`;
}

function esgPage(d: FilingData): string {
  const { result, transactions, fiscalYear } = d;
  const { breakdown } = result;
  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const charges = yearTx.filter(tx => tx.type === "CHARGE");

  const achats = charges.filter(tx => ["consommables_medicaux", "fournitures_bureau", "petit_equipement"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const autresCharges = charges.filter(tx => ["loyer_cabinet", "eau_electricite", "telephone_internet", "entretien_reparation", "assurance_rc_pro", "carburant", "deplacement_missions", "honoraires_comptable", "honoraires_avocat"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const impots = charges.filter(tx => ["taxe_professionnelle", "taxe_services_communaux"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const personnel = charges.filter(tx => ["salaires_personnel", "charges_sociales_personnel"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const dotations = charges.filter(tx => ["amortissement_materiel", "amortissement_vehicule"].includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
  const consommation = achats + autresCharges;
  const va = breakdown.totalRecettes - consommation;
  const ebe = va - impots - personnel;
  const resultatExploitation = ebe - dotations;

  return `<div class="page">
    <h2>Tableau n°5</h2>
    <h3>ÉTAT DES SOLDES INTERMÉDIAIRES DE GESTION (E.S.G)</h3>
    <p class="small" style="text-align:right;">EXERCICE CLOS LE 31/12/${fiscalYear}</p>
    <table>
      <tr><th style="width:10%">N°</th><th style="width:60%">NATURE</th><th>EXERCICE</th></tr>

      <tr><td>II</td><td class="bold">+ PRODUCTION DE L'EXERCICE (3+4+5)</td><td class="right bold">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td>3</td><td class="indent">Ventes de biens et services produits</td><td class="right">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td>4</td><td class="indent">Variation de stocks de produits</td><td class="right"></td></tr>
      <tr><td>5</td><td class="indent">Immobilisations produites par l'Ese pour elle-même</td><td class="right"></td></tr>

      <tr><td>III</td><td class="bold">- CONSOMMATION DE L'EXERCICE (6+7)</td><td class="right bold">${fmt(consommation)}</td></tr>
      <tr><td>6</td><td class="indent">Achats consommés de matières et fournitures</td><td class="right">${fmt(achats)}</td></tr>
      <tr><td>7</td><td class="indent">Autres charges externes</td><td class="right">${fmt(autresCharges)}</td></tr>

      <tr class="total"><td>IV</td><td class="bold">= VALEUR AJOUTÉE (I+II-III)</td><td class="right bold">${fmt(va)}</td></tr>

      <tr><td></td><td class="indent">+ Subventions d'exploitation</td><td class="right"></td></tr>
      <tr><td>V</td><td class="indent">9 - Impôts et taxes</td><td class="right">${fmt(impots)}</td></tr>
      <tr><td></td><td class="indent">10 - Charges de personnel</td><td class="right">${fmt(personnel)}</td></tr>

      <tr class="total"><td></td><td class="bold">= EXCÉDENT BRUT D'EXPLOITATION (E.B.E)</td><td class="right bold">${fmt(ebe)}</td></tr>

      <tr><td>11</td><td class="indent">+ Autres produits d'exploitation</td><td class="right"></td></tr>
      <tr><td>12</td><td class="indent">- Autres charges d'exploitation</td><td class="right"></td></tr>
      <tr><td>13</td><td class="indent">+ Reprises d'exploitation; transfert de charges</td><td class="right"></td></tr>
      <tr><td>14</td><td class="indent">- Dotations d'exploitation</td><td class="right">${fmt(dotations)}</td></tr>

      <tr class="total"><td>VI</td><td class="bold">= RÉSULTAT D'EXPLOITATION (+ ou -)</td><td class="right bold">${fmt(resultatExploitation)}</td></tr>

      <tr><td>VII</td><td>RÉSULTAT FINANCIER</td><td class="right"></td></tr>
      <tr class="total"><td>VIII</td><td class="bold">= RÉSULTAT COURANT (+ ou -)</td><td class="right bold">${fmt(resultatExploitation)}</td></tr>
      <tr><td>IX</td><td>RÉSULTAT NON COURANT (+ ou -)</td><td class="right"></td></tr>
      <tr><td>15</td><td>- Impôts sur les résultats</td><td class="right">${fmt(result.tax.taxDue)}</td></tr>
      <tr class="total"><td>X</td><td class="bold" style="background:#ddd;">= RÉSULTAT NET DE L'EXERCICE (+ ou -)</td><td class="right bold" style="background:#ddd;">${fmt(resultatExploitation - result.tax.taxDue)}</td></tr>
    </table>
  </div>`;
}

function detailCPCPage(d: FilingData): string {
  const { transactions, fiscalYear } = d;
  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const charges = yearTx.filter(tx => tx.type === "CHARGE");
  const recettes = yearTx.filter(tx => tx.type === "RECETTE");

  // Group charges by category
  const chargeGroups: Record<string, number> = {};
  charges.forEach(tx => {
    chargeGroups[tx.category] = (chargeGroups[tx.category] || 0) + tx.amount;
  });

  const catLabels: Record<string, string> = {
    loyer_cabinet: "Locations et charges locatives",
    eau_electricite: "Eau et électricité",
    telephone_internet: "Téléphone et internet",
    entretien_reparation: "Entretien et réparations",
    assurance_rc_pro: "Primes d'assurances",
    rc_pro: "Primes d'assurances",
    honoraires_comptable: "Rémunérations d'intermédiaires et honoraires",
    honoraires_avocat: "Rémunérations d'intermédiaires et honoraires",
    carburant: "Transports",
    deplacement_missions: "Déplacements, missions et réceptions",
    consommables_medicaux: "Achats non stockés de matières et fournitures",
    fournitures_bureau: "Achats de matières et fournitures consommables",
    petit_equipement: "Achats de matières et fournitures consommables",
    salaires_personnel: "Rémunération du personnel",
    charges_sociales_personnel: "Charges sociales",
    taxe_professionnelle: "Impôts et taxes",
    taxe_services_communaux: "Impôts et taxes",
  };

  // Group by CPC label
  const cpcGroups: Record<string, number> = {};
  charges.forEach(tx => {
    const label = catLabels[tx.category] || "Reste du poste des autres charges externes";
    cpcGroups[label] = (cpcGroups[label] || 0) + tx.amount;
  });

  const chargeRows = Object.entries(cpcGroups)
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => `<tr><td class="indent2">* ${label}</td><td class="right">${fmt(amount)}</td></tr>`)
    .join("");

  const totalRecettes = recettes.reduce((s, tx) => s + tx.amount, 0);
  const totalCharges = charges.reduce((s, tx) => s + tx.amount, 0);

  return `<div class="page">
    <h2>Tableau n°6</h2>
    <h3>DÉTAIL DES POSTES DU C.P.C.</h3>
    <p class="small" style="text-align:right;">EXERCICE CLOS LE 31/12/${fiscalYear}</p>

    <table>
      <tr><th style="width:70%">POSTE</th><th>EXERCICE</th></tr>

      <tr><td colspan="2" class="section-header">CHARGES D'EXPLOITATION</td></tr>
      ${chargeRows}
      <tr class="total"><td class="bold">Total charges d'exploitation</td><td class="right bold">${fmt(totalCharges)}</td></tr>
    </table>

    <table style="margin-top:10px;">
      <tr><th style="width:70%">POSTE</th><th>EXERCICE</th></tr>

      <tr><td colspan="2" class="section-header">PRODUITS D'EXPLOITATION</td></tr>
      <tr><td class="indent">Ventes des services au Maroc</td><td class="right">${fmt(totalRecettes)}</td></tr>
      <tr class="total"><td class="bold">Total produits d'exploitation</td><td class="right bold">${fmt(totalRecettes)}</td></tr>
    </table>
  </div>`;
}

function irCalcPage(d: FilingData): string {
  const { profile, result, fiscalYear } = d;
  const { breakdown, tax } = result;
  const quarterAmount = Math.round(tax.taxDue / 4);

  return `<div class="page">
    <h2>CALCUL DE L'IMPÔT SUR LE REVENU</h2>
    <p class="small" style="text-align:right;">EXERCICE CLOS LE 31/12/${fiscalYear}</p>

    <table class="id-table" style="margin-bottom:15px;">
      <tr><td class="k">Profession</td><td>${profile.specialty || "Professionnel de santé"}</td></tr>
      <tr><td class="k">Commune</td><td>${profile.commune} (${profile.communeType === "URBAN" ? "Urbain" : "Rural"})</td></tr>
      <tr><td class="k">Régime fiscal</td><td>${tax.regime}</td></tr>
      <tr><td class="k">Situation familiale</td><td>${profile.maritalStatus === "MARRIED" ? "Marié(e)" : "Célibataire"}</td></tr>
      <tr><td class="k">Personnes à charge</td><td>${profile.dependentsCount}</td></tr>
      <tr><td class="k">Date début d'activité</td><td>${new Date(profile.activityStartDate).toLocaleDateString("fr-FR")}</td></tr>
    </table>

    <table>
      <tr><th style="width:60%">ÉLÉMENTS</th><th>MONTANT (MAD)</th></tr>
      <tr><td>Chiffre d'affaires (total recettes)</td><td class="right">${fmt(breakdown.totalRecettes)}</td></tr>
      <tr><td>Total des charges</td><td class="right">${fmt(breakdown.totalCharges)}</td></tr>
      <tr><td>Charges déductibles</td><td class="right">${fmt(breakdown.totalChargesDeductibles)}</td></tr>
      <tr><td>Réintégrations fiscales</td><td class="right">${fmt(breakdown.totalReintegrations)}</td></tr>
      <tr class="total"><td class="bold">Résultat fiscal</td><td class="right bold">${fmt(breakdown.resultatFiscal)}</td></tr>
    </table>

    <table style="margin-top:10px;">
      <tr><th style="width:60%">CALCUL IR</th><th>MONTANT (MAD)</th></tr>
      <tr><td>IR brut (barème progressif)</td><td class="right">${fmt(tax.ir.grossIR)}</td></tr>
      <tr><td>Déduction pour charges de famille</td><td class="right">- ${fmt(tax.familyDeduction)}</td></tr>
      <tr><td>IR net</td><td class="right">${fmt(Math.max(0, tax.ir.grossIR - tax.familyDeduction))}</td></tr>
      <tr><td>Cotisation minimale (taux ${(tax.cm.cmRate * 100).toFixed(1)}%)</td><td class="right">${fmt(tax.cm.cmDue)}${tax.cm.exempted ? " (exemptée)" : ""}</td></tr>
      <tr><td>Règle appliquée</td><td class="right">${tax.payableRule}</td></tr>
      <tr class="total"><td class="bold" style="background:#ddd;">IMPÔT DÛ</td><td class="right bold" style="background:#ddd;">${fmt(tax.taxDue)}</td></tr>
    </table>

    <table style="margin-top:10px;">
      <tr><th style="width:60%">ACOMPTES PROVISIONNELS</th><th>MONTANT (MAD)</th><th>ÉCHÉANCE</th></tr>
      <tr><td>1er acompte</td><td class="right">${fmt(quarterAmount)}</td><td class="center">31/03/${fiscalYear}</td></tr>
      <tr><td>2ème acompte</td><td class="right">${fmt(quarterAmount)}</td><td class="center">30/06/${fiscalYear}</td></tr>
      <tr><td>3ème acompte</td><td class="right">${fmt(quarterAmount)}</td><td class="center">30/09/${fiscalYear}</td></tr>
      <tr><td>4ème acompte</td><td class="right">${fmt(quarterAmount)}</td><td class="center">31/12/${fiscalYear}</td></tr>
      <tr class="total"><td class="bold">Total</td><td class="right bold">${fmt(quarterAmount * 4)}</td><td></td></tr>
    </table>

    <div class="sign-block">
      <div class="sign-box">Date : _______________</div>
      <div class="sign-box">Signature du contribuable</div>
    </div>
  </div>`;
}

export function generateLiasseFiscaleHtml(data: FilingData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">${css()}</head><body>
    ${coverPage(data)}
    ${cpcPage(data)}
    ${cpcPage2(data)}
    ${passagePage(data)}
    ${esgPage(data)}
    ${detailCPCPage(data)}
    ${irCalcPage(data)}
    <p class="note">Document pré-rempli par Blackpine Cabinet. Les champs "À compléter" doivent être renseignés par le contribuable. Ce document ne remplace pas les formulaires officiels de la DGI.</p>
    <div style="text-align:center; font-size:9px; color:#999; margin-top:20px;">
      Généré le ${new Date().toLocaleDateString("fr-FR")} · Blackpine Cabinet · Exercice ${data.fiscalYear}
    </div>
  </body></html>`;
}