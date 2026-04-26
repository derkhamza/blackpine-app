export interface LegalRef {
  article: string;
  title: string;
  summary: string;
  fullText: string;
}

// Map trace event titles to CGI articles
const refs: Record<string, LegalRef> = {
  // Résultat fiscal
  "Chiffre d'affaires": {
    article: "Art. 82 CGI",
    title: "Détermination du revenu professionnel",
    summary: "Le revenu professionnel est déterminé d'après le régime du résultat net réel ou celui du résultat net simplifié.",
    fullText: "Article 82 — Le résultat net réel de chaque exercice comptable est déterminé d'après l'excédent des produits sur les charges de l'exercice, engagées ou supportées pour les besoins de l'activité imposable, en application de la législation et de la réglementation comptable en vigueur.",
  },
  "Total des charges": {
    article: "Art. 10 CGI",
    title: "Charges déductibles",
    summary: "Les charges déductibles comprennent les charges d'exploitation, les charges financières et les charges non courantes.",
    fullText: "Article 10 — Les charges déductibles pour la détermination du résultat fiscal sont celles engagées ou supportées pour les besoins de l'activité imposable. Elles comprennent notamment les achats de matières et fournitures, les charges de personnel, les impôts et taxes, les dotations aux amortissements et les autres charges d'exploitation.",
  },
  "Charges déductibles": {
    article: "Art. 10-I CGI",
    title: "Conditions de déductibilité",
    summary: "Les charges doivent être engagées pour les besoins de l'activité, appuyées de pièces justificatives et comptabilisées.",
    fullText: "Article 10-I — Les charges déductibles comprennent : les achats revendus de marchandises et les achats consommés de matières et fournitures ; les autres charges externes engagées ou supportées pour les besoins de l'exploitation ; les impôts et taxes à la charge de l'entreprise, autres que l'impôt sur les sociétés ; les charges de personnel et assimilées ; les autres charges d'exploitation ; les dotations d'exploitation.",
  },
  "Réintégrations": {
    article: "Art. 11 CGI",
    title: "Charges non déductibles",
    summary: "Certaines charges ne sont pas déductibles et doivent être réintégrées au résultat fiscal.",
    fullText: "Article 11 — Ne sont pas déductibles du résultat fiscal : les amendes, pénalités et majorations de toute nature ; les dons et libéralités excédant 2‰ du chiffre d'affaires ; la fraction des charges mixtes correspondant à l'usage personnel ; les amortissements des véhicules de tourisme au-delà de 300 000 MAD TTC.",
  },
  "Résultat fiscal": {
    article: "Art. 8 CGI",
    title: "Détermination du résultat fiscal",
    summary: "Le résultat fiscal est obtenu en ajoutant au résultat comptable les réintégrations et en retranchant les déductions.",
    fullText: "Article 8 — Le résultat fiscal de chaque exercice comptable est déterminé d'après l'excédent des produits sur les charges de l'exercice. Le résultat comptable est corrigé des réintégrations de charges non déductibles et des déductions des produits non imposables pour obtenir le résultat fiscal.",
  },
  // IR
  "IR brut": {
    article: "Art. 73 CGI",
    title: "Barème de l'impôt sur le revenu",
    summary: "L'IR est calculé selon un barème progressif comportant six tranches de revenu.",
    fullText: "Article 73 — L'impôt sur le revenu est calculé en appliquant au revenu global imposable le barème suivant (LF 2025) :\n• 0 – 40 000 MAD : 0%\n• 40 001 – 60 000 MAD : 10%\n• 60 001 – 80 000 MAD : 20%\n• 80 001 – 100 000 MAD : 30%\n• 100 001 – 180 000 MAD : 34%\n• Au-delà de 180 000 MAD : 37%",
  },
  "Déduction familiale": {
    article: "Art. 74 CGI",
    title: "Réductions pour charges de famille",
    summary: "Une déduction de 500 MAD par personne à charge est appliquée, dans la limite de 6 personnes.",
    fullText: "Article 74 — Il est déduit du montant annuel de l'impôt en raison des charges de famille du contribuable, une somme de 500 MAD par personne à charge, dans la limite de 6 personnes. Sont considérées comme personnes à charge : le conjoint, les enfants légitimes ou légalement recueillis à condition qu'ils ne disposent pas de revenus supérieurs au seuil d'exonération.",
  },
  "Déduction pour charges de famille": {
    article: "Art. 74 CGI",
    title: "Réductions pour charges de famille",
    summary: "Une déduction de 500 MAD par personne à charge est appliquée, dans la limite de 6 personnes.",
    fullText: "Article 74 — Il est déduit du montant annuel de l'impôt en raison des charges de famille du contribuable, une somme de 500 MAD par personne à charge, dans la limite de 6 personnes.",
  },
  // CM
  "Cotisation minimale": {
    article: "Art. 144 CGI",
    title: "Cotisation minimale",
    summary: "La CM est due au taux de 0,50% du chiffre d'affaires, avec un minimum de 1 500 MAD pour les personnes physiques.",
    fullText: "Article 144 — La cotisation minimale est un minimum d'imposition que les contribuables sont tenus de verser même en l'absence de bénéfice. Le taux est fixé à 0,50% de la base constituée par le chiffre d'affaires et les autres produits d'exploitation. Le montant de la cotisation minimale ne peut être inférieur à 1 500 MAD pour les personnes physiques.",
  },
  "Exemption CM": {
    article: "Art. 144-I CGI",
    title: "Exemption de la cotisation minimale",
    summary: "Les contribuables sont exonérés de la CM pendant les 36 premiers mois suivant le début d'activité.",
    fullText: "Article 144-I — La cotisation minimale n'est pas due pendant les trente-six (36) premiers mois suivant la date du début de l'activité professionnelle. Cette exonération cesse de s'appliquer à l'expiration des trente-six mois précités, même si l'exercice n'est pas clôturé.",
  },
  // Comparaison
  "Comparaison IR / CM": {
    article: "Art. 144-II CGI",
    title: "Règle du maximum",
    summary: "Le contribuable paie le montant le plus élevé entre l'IR et la CM.",
    fullText: "Article 144-II — Lorsque le montant de l'impôt sur le revenu dû au titre d'un exercice est inférieur au montant de la cotisation minimale, cette dernière est acquise au Trésor. Lorsque le montant de l'IR est supérieur à la cotisation minimale, seul l'IR est dû.",
  },
  // Régime
  "Régime fiscal": {
    article: "Art. 38-39 CGI",
    title: "Régimes d'imposition",
    summary: "RNR pour CA > 500 000 MAD, RNS pour CA ≤ 500 000 MAD (professions libérales).",
    fullText: "Article 38 — Les contribuables dont le chiffre d'affaires annuel est supérieur à 500 000 MAD pour les prestataires de services sont obligatoirement soumis au régime du résultat net réel (RNR).\n\nArticle 39 — Les contribuables dont le chiffre d'affaires n'excède pas le seuil précité peuvent opter pour le régime du résultat net simplifié (RNS).",
  },
  "Détermination du régime": {
    article: "Art. 38-39 CGI",
    title: "Régimes d'imposition",
    summary: "Le régime est déterminé par le chiffre d'affaires annuel.",
    fullText: "Article 38 — Sont obligatoirement soumis au RNR les contribuables dont le CA dépasse 500 000 MAD (prestations de services). Article 39 — Les contribuables dont le CA est inférieur peuvent opter pour le RNS avec un abattement forfaitaire.",
  },
  // Acomptes
  "Acomptes provisionnels": {
    article: "Art. 175 CGI",
    title: "Versement des acomptes",
    summary: "L'IR est payé en 4 acomptes trimestriels, chacun égal à 25% de l'impôt dû au titre du dernier exercice.",
    fullText: "Article 175 — L'impôt sur le revenu donne lieu au versement de quatre acomptes provisionnels, exigibles chacun au plus tard avant l'expiration des 3ème, 6ème, 9ème et 12ème mois suivant la date d'ouverture de l'exercice comptable en cours. Chaque acompte est égal à 25% du montant de l'impôt dû au titre du dernier exercice clos.",
  },
  // Taxe professionnelle
  "Taxe professionnelle": {
    article: "Art. 5 Loi 47-06",
    title: "Taxe professionnelle",
    summary: "Exonération les 5 premières années pour les nouvelles créations.",
    fullText: "Article 5 — Toute personne exerçant une activité professionnelle au Maroc est assujettie à la taxe professionnelle. Les redevables bénéficient d'une exonération totale durant les 5 premières années à compter de la date de début d'activité.",
  },
};

// Fuzzy match — try exact title first, then partial match
export function findLegalRef(eventTitle: string): LegalRef | null {
  // Exact match
  if (refs[eventTitle]) return refs[eventTitle];

  // Partial match
  const lower = eventTitle.toLowerCase();
  for (const [key, ref] of Object.entries(refs)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return ref;
    }
  }

  // Keyword match
  const keywords: Record<string, string> = {
    "recette": "Chiffre d'affaires",
    "chiffre": "Chiffre d'affaires",
    "charge": "Total des charges",
    "déductib": "Charges déductibles",
    "réintégr": "Réintégrations",
    "résultat fiscal": "Résultat fiscal",
    "résultat net": "Résultat fiscal",
    "barème": "IR brut",
    "ir brut": "IR brut",
    "impôt brut": "IR brut",
    "famille": "Déduction familiale",
    "dépendant": "Déduction familiale",
    "cotisation min": "Cotisation minimale",
    "exemption": "Exemption CM",
    "exempté": "Exemption CM",
    "36 mois": "Exemption CM",
    "comparaison": "Comparaison IR / CM",
    "maximum": "Comparaison IR / CM",
    "régime": "Régime fiscal",
    "rnr": "Régime fiscal",
    "rns": "Régime fiscal",
    "acompte": "Acomptes provisionnels",
    "trimestr": "Acomptes provisionnels",
    "taxe profess": "Taxe professionnelle",
  };

  for (const [kw, refKey] of Object.entries(keywords)) {
    if (lower.includes(kw)) return refs[refKey] || null;
  }

  return null;
}