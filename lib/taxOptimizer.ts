import { DoctorProfile, FullTaxComputation, Transaction, getCategoriesByType, loadFiscalYearConfig } from "blackpine-engine";

export interface Recommendation {
  id: string;
  priority: "high" | "medium" | "low";
  category: "deduction" | "timing" | "regime" | "structure" | "compliance";
  title: string;
  description: string;
  potentialSavings: number | null;
  action: string;
}

export function analyzeOptimizations(
  profile: DoctorProfile,
  result: FullTaxComputation,
  transactions: Transaction[],
  fiscalYear: number
): Recommendation[] {
  const recs: Recommendation[] = [];
  const { breakdown, tax } = result;
  const yearTx = transactions.filter(tx => tx.date.startsWith(String(fiscalYear)));
  const charges = yearTx.filter(tx => tx.type === "CHARGE");
  const recettes = yearTx.filter(tx => tx.type === "RECETTE");

  // 1. Check for missing common deductions
  const chargeCategories = new Set(charges.map(c => c.category));
  const commonDeductions = [
    { id: "loyer_cabinet", label: "Loyer du cabinet", typical: 36000 },
    { id: "assurance_rc_pro", label: "Assurance RC professionnelle", typical: 5000 },
    { id: "rc_pro", label: "Assurance RC professionnelle", typical: 5000 },
    { id: "telephone_internet", label: "Téléphone et internet", typical: 6000 },
    { id: "eau_electricite", label: "Eau et électricité", typical: 12000 },
    { id: "fournitures_bureau", label: "Fournitures de bureau", typical: 3000 },
    { id: "consommables_medicaux", label: "Consommables médicaux", typical: 15000 },
    { id: "honoraires_comptable", label: "Honoraires comptable", typical: 12000 },
    { id: "entretien_reparation", label: "Entretien et réparations", typical: 5000 },
  ];

  const missingDeductions = commonDeductions.filter(
    d => !chargeCategories.has(d.id) && !chargeCategories.has(d.id.replace("_", ""))
  );

  if (missingDeductions.length > 0) {
    const totalMissing = missingDeductions.reduce((s, d) => s + d.typical, 0);
    const topMissing = missingDeductions.slice(0, 3).map(d => d.label).join(", ");
    const savings = Math.round(totalMissing * (tax.ir.effectiveRate || 0.3));

    recs.push({
      id: "missing_deductions",
      priority: missingDeductions.length >= 3 ? "high" : "medium",
      category: "deduction",
      title: "Charges déductibles manquantes",
      description: `Vous n'avez pas déclaré : ${topMissing}${missingDeductions.length > 3 ? ` et ${missingDeductions.length - 3} autres` : ""}. Ces charges sont courantes pour les professionnels de santé et réduisent votre résultat fiscal.`,
      potentialSavings: savings,
      action: "Ajoutez ces charges dans l'onglet Transactions pour réduire votre base imposable.",
    });
  }

  // 2. Check partial deductibility — suggest increasing professional ratio
  const partialCharges = charges.filter(
    tx => tx.deductibilityStatus === "PARTIALLY_DEDUCTIBLE" && (tx.professionalUseRatio || 0) < 0.8
  );
  if (partialCharges.length > 0) {
    const totalPartial = partialCharges.reduce((s, tx) => s + tx.amount, 0);
    const currentDeductible = partialCharges.reduce((s, tx) => s + tx.amount * (tx.professionalUseRatio || 0.5), 0);
    const maxDeductible = totalPartial * 0.8;
    const extraDeduction = maxDeductible - currentDeductible;
    const savings = Math.round(extraDeduction * (tax.ir.effectiveRate || 0.3));

    recs.push({
      id: "partial_ratio",
      priority: "medium",
      category: "deduction",
      title: "Optimiser la part professionnelle",
      description: `${partialCharges.length} charge(s) ont une part professionnelle inférieure à 80%. Si l'usage professionnel réel est plus élevé, ajustez le ratio pour augmenter la déduction.`,
      potentialSavings: savings,
      action: "Révisez le ratio professionnel de vos charges mixtes (véhicule, téléphone, etc.).",
    });
  }

  // 3. Regime comparison — RNR vs RNS
  if (breakdown.totalRecettes > 0 && breakdown.totalRecettes <= 500000) {
    const rnsAbattement = tax.regime === "RNS" ? 0.4 : 0.4;
    const rnsBase = breakdown.totalRecettes * (1 - rnsAbattement);
    const rnrBase = breakdown.resultatFiscal;

    if (rnsBase < rnrBase && tax.regime === "RNR") {
      const savings = Math.round((rnrBase - rnsBase) * (tax.ir.effectiveRate || 0.3));
      recs.push({
        id: "regime_rns",
        priority: "high",
        category: "regime",
        title: "Le régime RNS pourrait être avantageux",
        description: `Avec le RNS (abattement forfaitaire de 40%), votre base imposable serait de ${Math.round(rnsBase).toLocaleString("fr-FR")} MAD au lieu de ${Math.round(rnrBase).toLocaleString("fr-FR")} MAD en RNR.`,
        potentialSavings: savings,
        action: "Consultez votre comptable pour évaluer le passage au RNS avant la prochaine déclaration.",
      });
    } else if (rnrBase < rnsBase && tax.regime === "RNS") {
      const savings = Math.round((rnsBase - rnrBase) * (tax.ir.effectiveRate || 0.3));
      recs.push({
        id: "regime_rnr",
        priority: "high",
        category: "regime",
        title: "Le régime RNR pourrait être avantageux",
        description: `Vos charges réelles dépassent l'abattement forfaitaire de 40%. En RNR, votre base imposable serait de ${Math.round(rnrBase).toLocaleString("fr-FR")} MAD au lieu de ${Math.round(rnsBase).toLocaleString("fr-FR")} MAD.`,
        potentialSavings: savings,
        action: "Consultez votre comptable pour évaluer le passage au RNR.",
      });
    }
  }

  // 4. CM vs IR — if paying CM, suggest increasing deductions
  if (tax.payableRule === "CM" && !tax.cm.exempted) {
    const irNet = Math.max(0, tax.ir.grossIR - tax.familyDeduction);
    const gap = tax.cm.cmDue - irNet;
    recs.push({
      id: "cm_higher",
      priority: "medium",
      category: "structure",
      title: "Vous payez la cotisation minimale",
      description: `Votre CM (${Math.round(tax.cm.cmDue).toLocaleString("fr-FR")} MAD) est supérieure à votre IR (${Math.round(irNet).toLocaleString("fr-FR")} MAD). Augmenter vos charges déductibles ne réduira pas votre impôt tant que l'IR reste en dessous de la CM.`,
      potentialSavings: null,
      action: "Concentrez-vous sur l'augmentation du chiffre d'affaires plutôt que sur les déductions supplémentaires.",
    });
  }

  // 5. Family deduction optimization
  if (profile.maritalStatus === "SINGLE" && profile.dependentsCount === 0) {
    recs.push({
      id: "family_status",
      priority: "low",
      category: "structure",
      title: "Déduction pour charges de famille",
      description: "Vous êtes déclaré(e) célibataire sans personne à charge. Si vous avez des personnes à charge (parents, enfants), vous pouvez bénéficier d'une réduction de 500 MAD par personne (max 6).",
      potentialSavings: 500,
      action: "Mettez à jour votre situation familiale dans le Profil si vous avez des personnes à charge.",
    });
  }

  // 6. Check if CM exemption is about to expire
  const startDate = new Date(profile.activityStartDate);
  const endOfYear = new Date(`${fiscalYear}-12-31`);
  const monthsActive = (endOfYear.getFullYear() - startDate.getFullYear()) * 12 + endOfYear.getMonth() - startDate.getMonth();
  
  if (monthsActive >= 30 && monthsActive < 36 && tax.cm.exempted) {
    recs.push({
      id: "cm_expiring",
      priority: "high",
      category: "compliance",
      title: "Exemption CM expire bientôt",
      description: `Votre exemption de cotisation minimale expire dans ${36 - monthsActive} mois. À partir du mois ${36}, la CM de ${(loadFiscalYearConfig(fiscalYear).cotisationMinimale.rateMedical * 100).toFixed(1)}% sera applicable sur votre chiffre d'affaires.`,
      potentialSavings: null,
      action: "Anticipez le coût de la CM dans votre trésorerie. Consultez votre comptable pour optimiser le timing.",
    });
  }

  // 7. Quarterly acompte reminder
  const now = new Date();
  if (now.getFullYear() === fiscalYear) {
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const quarterAmount = Math.round(tax.taxDue / 4);
    if (quarterAmount > 0) {
      recs.push({
        id: "acompte_reminder",
        priority: "medium",
        category: "compliance",
        title: `Acompte Q${quarter} à prévoir`,
        description: `L'acompte du ${quarter}ème trimestre est estimé à ${quarterAmount.toLocaleString("fr-FR")} MAD. Assurez-vous de provisionner ce montant.`,
        potentialSavings: null,
        action: "Vérifiez les dates limites de paiement dans l'onglet Déclarations.",
      });
    }
  }

  // 8. High charge ratio warning
  const chargeRatio = breakdown.totalCharges / (breakdown.totalRecettes || 1);
  if (chargeRatio > 0.7 && breakdown.totalRecettes > 100000) {
    recs.push({
      id: "high_charges",
      priority: "medium",
      category: "compliance",
      title: "Ratio charges/recettes élevé",
      description: `Vos charges représentent ${Math.round(chargeRatio * 100)}% de vos recettes. Un ratio supérieur à 70% peut attirer l'attention de l'administration fiscale lors d'un contrôle.`,
      potentialSavings: null,
      action: "Assurez-vous de conserver tous les justificatifs de vos charges. Consultez votre comptable.",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recs;
}