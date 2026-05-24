/**
 * Client-side translations for blackpine-engine trace events.
 * The engine always emits French text; this module maps known titles and
 * detail strings to English and Arabic equivalents.
 */

type Lang = "fr" | "en" | "ar";

// ── Title dictionary ──────────────────────────────────────────────────────────

const TITLE_MAP: Record<string, { en: string; ar: string }> = {
  // resultatFiscalCalculator
  "Total des recettes":                { en: "Total revenue",                       ar: "إجمالي الإيرادات" },
  "Total des charges engagées":        { en: "Total expenses",                      ar: "إجمالي المصاريف" },
  "Charges effectivement déductibles": { en: "Deductible expenses",                 ar: "المصاريف القابلة للخصم" },
  "Réintégrations fiscales":           { en: "Tax reintegrations",                  ar: "إعادة الإدماج الجبائي" },
  "Résultat fiscal":                   { en: "Taxable income",                      ar: "النتيجة الجبائية" },
  // irCalculator
  "Résultat fiscal négatif":           { en: "Negative taxable income",             ar: "نتيجة جبائية سالبة" },
  "Calcul de l'IR brut":               { en: "Gross income tax calculation",        ar: "حساب الضريبة الإجمالية" },
  // taxOrchestrator
  "Pratique mixte détectée":           { en: "Mixed practice detected",             ar: "ممارسة مختلطة مكتشفة" },
  "Déduction pour charges de famille": { en: "Family allowance deduction",          ar: "الخصم العائلي" },
  "Comparaison IR / CM":               { en: "Income tax vs. min. contribution",    ar: "مقارنة الضريبة والحد الأدنى" },
  "Impôt à payer":                     { en: "Tax due",                             ar: "الضريبة المستحقة" },
  // cmCalculator
  "Exemption de cotisation minimale":  { en: "Minimum contribution exemption",      ar: "إعفاء من الحد الأدنى للاشتراك" },
  "Calcul de la cotisation minimale":  { en: "Minimum contribution calculation",    ar: "حساب الحد الأدنى للاشتراك" },
  "Plancher de cotisation appliqué":   { en: "Contribution floor applied",          ar: "تطبيق الحد الأدنى للاشتراك" },
};

/** Translate a trace-event title from French to the given language. */
export function translateTraceTitle(frTitle: string, lang: Lang): string {
  if (lang === "fr") return frTitle;
  const l = lang as "en" | "ar";

  // Static lookup
  if (TITLE_MAP[frTitle]) return TITLE_MAP[frTitle][l];

  // Dynamic: "Tranche d'imposition 20%"
  const trancheMatch = frTitle.match(/^Tranche d'imposition (\d+(?:[.,]\d+)?)%$/);
  if (trancheMatch) {
    const rate = trancheMatch[1];
    return l === "en" ? `Tax bracket ${rate}%` : `الشريحة الضريبية ${rate}%`;
  }

  // Dynamic: "Régime fiscal : RNS" / "Régime fiscal : RNR"
  const regimeMatch = frTitle.match(/^Régime fiscal : (.+)$/);
  if (regimeMatch) {
    const regime = regimeMatch[1];
    return l === "en" ? `Tax regime: ${regime}` : `النظام الضريبي: ${regime}`;
  }

  return frTitle; // fallback: keep French
}

// ── Detail dictionary ─────────────────────────────────────────────────────────

const DETAIL_MAP: Record<string, { en: string; ar: string }> = {
  "Votre résultat fiscal est négatif. L'impôt sur le revenu est automatiquement mis à zéro.": {
    en: "Your taxable income is negative. Income tax is automatically set to zero.",
    ar: "نتيجتك الجبائية سالبة. تُضبط الضريبة على الدخل تلقائياً على الصفر.",
  },
  "Formule rapide : base d'imposition multipliée par le taux de la tranche, moins la somme à déduire propre à cette tranche.": {
    en: "Quick formula: taxable base × bracket rate − bracket-specific deduction.",
    ar: "الصيغة: الوعاء الضريبي × معدل الشريحة − المبلغ المخصوم الخاص بالشريحة.",
  },
  "Vous exercez à la fois en cabinet et en clinique. La retenue à la source des cliniques doit être traitée séparément ; consultez votre comptable.": {
    en: "You practice both privately and in a clinic. Clinic withholding tax must be handled separately — consult your accountant.",
    ar: "تمارس في عيادة خاصة ومصحة معاً. يُعالج الاقتطاع في المصدر للمصحة بشكل منفصل — استشر محاسبك.",
  },
  "Réduction directe de l'impôt, pas de la base imposable.": {
    en: "Direct reduction of the tax amount, not of the taxable base.",
    ar: "خصم مباشر من مبلغ الضريبة، لا من الوعاء الضريبي.",
  },
  "Somme des charges après application des taux de déductibilité (100% pour la plupart, 60% pour le carburant mixte, etc.).": {
    en: "Sum of expenses after applying deductibility ratios (100% for most, 60% for mixed-use fuel, etc.).",
    ar: "مجموع المصاريف بعد تطبيق نسب القابلية للخصم (100% في الغالب، 60% لوقود الاستخدام المختلط، إلخ).",
  },
  "Part des charges non déductibles (usage personnel, catégories exclues). Ajoutée au résultat fiscal.": {
    en: "Non-deductible portion of expenses (personal use, excluded categories). Added back to taxable income.",
    ar: "الجزء غير القابل للخصم من المصاريف (استخدام شخصي، فئات مستبعدة). يُضاف إلى النتيجة الجبائية.",
  },
  "Base qui servira de point de départ pour le calcul de l'IR.": {
    en: "The starting base for the income tax calculation.",
    ar: "القاعدة الأساسية لحساب الضريبة على الدخل.",
  },
};

/** Translate a trace-event detail string from French to the given language. */
export function translateTraceDetail(frDetail: string | undefined, lang: Lang): string | undefined {
  if (!frDetail || lang === "fr") return frDetail;
  const l = lang as "en" | "ar";

  // Static lookup
  if (DETAIL_MAP[frDetail]) return DETAIL_MAP[frDetail][l];

  // Dynamic: "Votre résultat fiscal tombe dans la tranche … taxée à X%."
  const trancheDetail = frDetail.match(/^Votre résultat fiscal tombe dans la tranche (.+), taxée à (\d+(?:[.,]\d+)?)%\.$/);
  if (trancheDetail) {
    const rate = trancheDetail[2];
    if (l === "en") {
      const range = trancheDetail[1]
        .replace(/^de /, "from ").replace(/ à /, " to ").replace(/^au-delà de /, "above ");
      return `Your taxable income falls in the ${range} bracket, taxed at ${rate}%.`;
    }
    return `نتيجتك الجبائية تقع ضمن الشريحة الضريبية بمعدل ${rate}%.`;
  }

  // Dynamic: "Le contribuable paie le plus élevé des deux : IR net = X MAD, CM = Y MAD. Résultat : Z."
  const comparisonDetail = frDetail.match(
    /^Le contribuable paie le plus élevé des deux : IR net = (.+?) MAD, CM = (.+?) MAD\. Résultat : (IR|CM)\.$/
  );
  if (comparisonDetail) {
    const [, irNet, cm, rule] = comparisonDetail;
    if (l === "en") return `The taxpayer pays the higher of the two: net IR = ${irNet} MAD, CM = ${cm} MAD. Result: ${rule}.`;
    return `يُدفع الأعلى من القيمتين: الضريبة الصافية = ${irNet} درهم، الحد الأدنى = ${cm} درهم. النتيجة: ${rule}.`;
  }

  // Dynamic: "Calculé sur la base de …"
  if (frDetail.startsWith("Calculé sur la base de")) {
    if (l === "en") return frDetail.includes("cotisation minimale")
      ? "Calculated based on the minimum contribution."
      : "Calculated based on the net income tax.";
    return frDetail.includes("cotisation minimale")
      ? "محسوب على أساس الحد الأدنى للاشتراك."
      : "محسوب على أساس الضريبة الصافية على الدخل.";
  }

  // Dynamic: "Vous exercez depuis X mois. La cotisation minimale s'applique à partir de Y mois."
  const exemptionDetail = frDetail.match(
    /^Vous exercez depuis (\d+) mois\. La cotisation minimale s'applique à partir de (\d+) mois d'activité\.$/
  );
  if (exemptionDetail) {
    const [, months, threshold] = exemptionDetail;
    if (l === "en") return `You have been practicing for ${months} months. The minimum contribution applies after ${threshold} months of activity.`;
    return `تمارس منذ ${months} شهراً. يُطبَّق الحد الأدنى للاشتراك بعد ${threshold} شهراً من النشاط.`;
  }

  // Dynamic: "Les médecins paient X% de leur chiffre d'affaires au titre de la cotisation minimale."
  const cmRateDetail = frDetail.match(
    /^Les médecins paient (\d+(?:[.,]\d+)?)% de leur chiffre d'affaires au titre de la cotisation minimale\.$/
  );
  if (cmRateDetail) {
    const rate = cmRateDetail[1];
    if (l === "en") return `Doctors pay ${rate}% of their revenue as the minimum contribution.`;
    return `يدفع الأطباء ${rate}% من رقم أعمالهم كحد أدنى للاشتراك.`;
  }

  // Dynamic: "La CM calculée (X MAD) est inférieure au plancher légal de Y MAD. C'est le plancher qui s'applique."
  const floorDetail = frDetail.match(
    /^La CM calculée \((.+?) MAD\) est inférieure au plancher légal de (.+?) MAD\. C'est le plancher qui s'applique\.$/
  );
  if (floorDetail) {
    const [, calculated, floor] = floorDetail;
    if (l === "en") return `The calculated contribution (${calculated} MAD) is below the legal floor of ${floor} MAD. The floor amount applies.`;
    return `الاشتراك المحسوب (${calculated} درهم) أقل من الحد الأدنى القانوني (${floor} درهم). يُطبَّق الحد الأدنى.`;
  }

  return frDetail; // fallback: keep French
}
