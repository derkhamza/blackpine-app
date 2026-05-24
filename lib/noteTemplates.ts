/**
 * Consultation note templates
 *
 * Built-in templates cover the most common presentations seen in Moroccan
 * general / specialist practice. All text is in French (the working language
 * of Moroccan clinical medicine).
 *
 * Custom templates are persisted per-user in AsyncStorage.
 */

export interface NoteTemplate {
  id: string;
  label: string;
  category: string;
  motif?: string;
  examination?: string;
  diagnosis?: string;
  treatment?: string;
  isCustom?: boolean;
}

// ── Category list (order determines display order) ─────────────────────────

export const TEMPLATE_CATEGORIES = [
  "Tous",
  "Général",
  "Cardio / HTA",
  "Diabète",
  "Respiratoire",
  "Digestif",
  "Rhumatologie",
  "Neurologie",
  "Infectieux",
  "Gynéco",
  "Pédiatrie",
  "Psy",
  "Personnalisés",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

// ── Built-in templates ─────────────────────────────────────────────────────

export const BUILT_IN_TEMPLATES: NoteTemplate[] = [
  // ── Général ─────────────────────────────────────────────────────────────
  {
    id: "gen_soap",
    label: "Trame SOAP vierge",
    category: "Général",
    motif: "",
    examination: "Examen général : bon état général, conscient, orienté.\nConstantes : TA _/_ mmHg, FC _ bpm, T° _°C, SpO₂ _%, poids _ kg.",
    diagnosis: "",
    treatment: "",
  },
  {
    id: "gen_prevention",
    label: "Consultation préventive",
    category: "Général",
    motif: "Bilan de santé / consultation préventive annuelle.",
    examination: "Examen clinique complet sans anomalie notable.\nTA _/_ mmHg, FC _ bpm, IMC : _.",
    diagnosis: "Bilan de santé satisfaisant.",
    treatment: "Conseils hygiéno-diététiques.\nMise à jour du carnet vaccinal.\nBilan biologique de contrôle annuel prescrit.",
  },
  {
    id: "gen_preop",
    label: "Bilan pré-opératoire",
    category: "Général",
    motif: "Consultation pré-opératoire pour _.",
    examination: "Examen clinique sans contre-indication anesthésique apparente.\nTA _/_ mmHg, FC _ bpm. Auscultation cardio-pulmonaire normale.",
    diagnosis: "Aptitude à l'anesthésie générale / locorégionale.",
    treatment: "NFS, coagulation, groupe sanguin, ionogramme, ECG, Rx thorax prescrits.\nAvis anesthésiste si nécessaire.",
  },
  {
    id: "gen_normal",
    label: "Examen général normal",
    category: "Général",
    motif: "Consultation de routine.",
    examination: "Bon état général. Patient eupnéique, apyrétique.\nTA _/_ mmHg. Auscultation cardio-pulmonaire normale. Abdomen souple, indolore. Pas d'œdème des membres inférieurs.",
    diagnosis: "Examen clinique dans les limites de la normale.",
    treatment: "Pas de modification thérapeutique. Prochain contrôle dans _ mois.",
  },

  // ── Cardio / HTA ─────────────────────────────────────────────────────────
  {
    id: "hta_controle",
    label: "Contrôle HTA équilibrée",
    category: "Cardio / HTA",
    motif: "Consultation de suivi hypertension artérielle.",
    examination: "Patient sous traitement antihypertenseur. TA _/_ mmHg (objectif atteint). FC _ bpm. Pas de signe d'atteinte des organes cibles. Pas d'œdème.",
    diagnosis: "HTA essentielle équilibrée sous traitement.",
    treatment: "Maintien du traitement en cours.\nRégime peu salé, activité physique régulière.\nContrôle dans _ mois. Bilan biologique annuel.",
  },
  {
    id: "hta_desiquilibree",
    label: "HTA mal contrôlée",
    category: "Cardio / HTA",
    motif: "Consultation pour HTA mal contrôlée malgré traitement.",
    examination: "TA _/_ mmHg au repos après _ minutes. FC _ bpm.\nPas de signes d'urgence hypertensive.\nCompliance au traitement vérifiée.",
    diagnosis: "HTA essentielle résistante / insuffisamment contrôlée.",
    treatment: "Adaptation thérapeutique : _.\nConseils hygiéno-diététiques renforcés.\nContrôle tensionnel à _ semaines.\nBilan d'organes cibles.",
  },
  {
    id: "hta_crise",
    label: "Urgence hypertensive",
    category: "Cardio / HTA",
    motif: "Céphalées et TA très élevée.",
    examination: "TA _/_ mmHg. FC _ bpm. Conscience normale. Pas de déficit neurologique. Fond d'œil non réalisé.",
    diagnosis: "Urgence hypertensive sans atteinte viscérale immédiate.",
    treatment: "Antihypertenseur per os : _.\nSurveillance tensionnelle horaire.\nRecontrôle en urgence si persistance ou signes d'alerte. Bilan biologique en urgence.",
  },

  // ── Diabète ──────────────────────────────────────────────────────────────
  {
    id: "diab_bilan",
    label: "Bilan annuel diabète",
    category: "Diabète",
    motif: "Bilan annuel diabète type 2.",
    examination: "Examen des pieds : _ . Sensibilité : _. Examen cardiovasculaire : _. Fond d'œil : _. IMC : _.",
    diagnosis: "Diabète type 2 sous traitement.",
    treatment: "HbA1c objectif < _%. Renouvellement ordonnance.\nBilan bio annuel prescrit (HbA1c, bilan rénal, lipidique, ECBU).\nAvis ophtalmologue / cardiologue si indiqué.",
  },
  {
    id: "diab_desiquilibre",
    label: "Déséquilibre glycémique",
    category: "Diabète",
    motif: "Glycémie à jeun élevée, HbA1c > _%. Déséquilibre du diabète.",
    examination: "Poids _ kg, IMC _. TA _/_ mmHg. Pas de signes de complication aiguë.",
    diagnosis: "Diabète type 2 déséquilibré.",
    treatment: "Optimisation thérapeutique : _.\nRégime diabétique renforcé.\nAuto-surveillance glycémique quotidienne.\nContrôle HbA1c dans 3 mois.",
  },

  // ── Respiratoire ─────────────────────────────────────────────────────────
  {
    id: "rhino",
    label: "Rhinopharyngite aiguë",
    category: "Respiratoire",
    motif: "Rhinorrhée, obstruction nasale, toux sèche depuis _ jours. Pas de fièvre élevée.",
    examination: "T° _ °C. Gorge : muqueuse érythémateuse, pas d'angine. Rhinorrhée claire/purulente. Auscultation pulmonaire normale.",
    diagnosis: "Rhinopharyngite aiguë d'allure virale.",
    treatment: "Traitement symptomatique : lavage nasal, paracétamol.\nPas d'antibiotique indiqué.\nConsulter si fièvre > 38,5°C persistante ou aggravation > 5 jours.",
  },
  {
    id: "angine",
    label: "Angine",
    category: "Respiratoire",
    motif: "Odynophagie, fièvre _ °C depuis _ jours.",
    examination: "T° _ °C. Amygdales érythémateuses / avec exsudat. Adénopathies cervicales. Score de Mac Isaac : _.",
    diagnosis: "Angine érythémateuse / érythémato-pultacée.",
    treatment: "TDR : positif / négatif.\nAmoxicilline 1g × 2/j × 6 jours si TDR+ / Amoxicilline-acide clavulanique si non répondeur.\nAntipyrétique, antalgique.\nReevaluation à 48h si pas d'amélioration.",
  },
  {
    id: "bronchite",
    label: "Bronchite aiguë",
    category: "Respiratoire",
    motif: "Toux productive depuis _ jours, expectorations _.",
    examination: "T° _ °C. Auscultation : ronchi diffus / sibilants. Pas de syndrome de condensation. SpO₂ _ %.",
    diagnosis: "Bronchite aiguë.",
    treatment: "Traitement symptomatique : antitussif / mucolytique.\nBronchodilatateur si bronchospasme.\nPas d'antibiotique sauf si surinfection bactérienne documentée.\nReevaluation à 7 jours.",
  },
  {
    id: "asthme_pousse",
    label: "Poussée d'asthme",
    category: "Respiratoire",
    motif: "Dyspnée sifflante, crise d'asthme depuis _ heures.",
    examination: "FR _ /min. SpO₂ _ %. Sibilants expiratoires diffus. DEP _ % théorique. Pas de tirage.",
    diagnosis: "Poussée d'asthme légère / modérée.",
    treatment: "Bronchodilatateur de courte durée d'action : salbutamol _ bouffées.\nCorticoïde systémique si crise modérée à sévère.\nRéévaluation après 20 minutes.\nConsulter urgences si pas d'amélioration.",
  },

  // ── Digestif ──────────────────────────────────────────────────────────────
  {
    id: "gastro",
    label: "Gastro-entérite aiguë",
    category: "Digestif",
    motif: "Diarrhée aqueuse, nausées / vomissements depuis _ heures. Pas de sang dans les selles.",
    examination: "T° _ °C. Abdomen souple, sensible en fosse iliaque droite / diffus. Pas de défense. Bon état d'hydratation.",
    diagnosis: "Gastro-entérite aiguë d'allure virale.",
    treatment: "Réhydratation orale : SRO.\nRégime sans résidu.\nAntiémétique si vomissements invalidants.\nPas d'antibiotique.\nConsulter si signes de déshydratation ou sang dans les selles.",
  },
  {
    id: "rge",
    label: "Reflux gastro-œsophagien",
    category: "Digestif",
    motif: "Pyrosis, régurgitations acides. Évolution depuis _.",
    examination: "Abdomen souple, épigastre légèrement sensible. Pas de masse palpable.",
    diagnosis: "Reflux gastro-œsophagien / RGO.",
    treatment: "IPP : oméprazole 20 mg/j pendant 4 semaines.\nRègles hygiéno-diététiques : éviter café, alcool, aliments gras, repas tardifs.\nSurélévation de la tête du lit.\nEndoscopie si résistance au traitement ou symptômes d'alarme.",
  },

  // ── Rhumatologie ─────────────────────────────────────────────────────────
  {
    id: "lombalgie_aigue",
    label: "Lombalgie aiguë",
    category: "Rhumatologie",
    motif: "Douleur lombaire aiguë depuis _ jours. Pas de signe neurologique.",
    examination: "Raideur lombaire. Contracture paravertébrale. Lasègue négatif. Pas de déficit neurologique. Pas de signe d'alarme.",
    diagnosis: "Lombalgie aiguë commune.",
    treatment: "Antalgiques palier 1-2.\nAINS : ibuprofène _ mg × 3/j si pas de contre-indication.\nMyorelaxant si contracture importante.\nMaintien d'une activité physique adaptée. Repos strict déconseillé.\nKinésithérapie si persistance > 6 semaines.",
  },
  {
    id: "arthrose_genou",
    label: "Arthrose genou",
    category: "Rhumatologie",
    motif: "Douleur du genou, dérouillage matinal < 30 min. Évolution chronique.",
    examination: "Genu varum / valgum. Crépitements à la mobilisation. Épanchement _ . Pas d'arthrite inflammatoire.",
    diagnosis: "Gonarthrose.",
    treatment: "Antalgiques selon palier.\nAINS local (gel diclofénac) si douleur localisée.\nKinésithérapie : renforcement quadriceps.\nPerte de poids si surpoids.\nAvis chirurgical si handicap fonctionnel majeur.",
  },

  // ── Neurologie ────────────────────────────────────────────────────────────
  {
    id: "cephalee",
    label: "Céphalée de tension",
    category: "Neurologie",
    motif: "Céphalées diffuses, bilatérales, sans pulsatilité, sans nausées.",
    examination: "Examen neurologique normal. Raideur cervicale. Pas de signes méningés. Fond d'œil normal.",
    diagnosis: "Céphalée de tension.",
    treatment: "Paracétamol / AINS en prise unique.\nTechniques de relaxation, gestion du stress.\nConsulter si céphalée inaugurale, brutale (en coup de tonnerre) ou avec fièvre.",
  },
  {
    id: "migraine",
    label: "Migraine",
    category: "Neurologie",
    motif: "Céphalée unilatérale pulsatile, nausées, photophobie. Évolution par crises.",
    examination: "Examen neurologique normal entre les crises. Pas de signe déficitaire.",
    diagnosis: "Migraine sans / avec aura.",
    treatment: "Traitement de crise : triptan (sumatriptan 50 mg) + antiémétique.\nÉviter les déclencheurs identifiés.\nAgenda des crises.\nTraitement de fond si > 4 crises/mois : propranolol / amitriptyline / valproate (selon CI).",
  },

  // ── Infectieux ────────────────────────────────────────────────────────────
  {
    id: "inf_urinaire",
    label: "Infection urinaire basse",
    category: "Infectieux",
    motif: "Brûlures mictionnelles, pollakiurie, urgenturie depuis _ jours.",
    examination: "T° _ °C. Pas de douleur lombaire. Bandelette urinaire : leucocytes + / nitrites + .",
    diagnosis: "Cystite aiguë non compliquée.",
    treatment: "Fosfomycine trométamol 3 g en dose unique.\nCBU avant traitement si doute diagnostique.\nHydratation abondante.\nConsulter si fièvre ou douleur lombaire (suspicion PNA).",
  },
  {
    id: "inf_peau",
    label: "Infection cutanée",
    category: "Infectieux",
    motif: "Plaie / lésion cutanée avec signes d'infection locale.",
    examination: "Lésion _ cm, érythème, chaleur, œdème. Pas d'adénopathie satellite. Pas de traînée lymphangitique. T° _ °C.",
    diagnosis: "Infection cutanée localisée (impétigo / furoncle / cellulite débutante).",
    treatment: "Nettoyage antiseptique local.\nAmoxicilline-acide clavulanique _ mg × 3/j × 7 jours.\nSurveillance à 48h.\nConsulter en urgence si extension ou fièvre élevée.",
  },

  // ── Gynéco ────────────────────────────────────────────────────────────────
  {
    id: "grossesse_suivi",
    label: "Suivi de grossesse",
    category: "Gynéco",
    motif: "Consultation de suivi grossesse, _ SA.",
    examination: "Poids _ kg (prise pondérale : _ kg). TA _/_ mmHg. HU _ cm. BDC fœtaux : _ bpm. Présentation : _. Pas de contractions.",
    diagnosis: "Grossesse évolutive _ SA, bien tolérée.",
    treatment: "Renouvellement supplémentation : acide folique / fer / vitamine D.\nEchographie _ SA prescrite.\nBilan sanguin du _ trimestre prescrit.\nProchain RDV à _ SA.",
  },

  // ── Pédiatrie ─────────────────────────────────────────────────────────────
  {
    id: "pedia_fievre",
    label: "Fièvre de l'enfant",
    category: "Pédiatrie",
    motif: "Fièvre _ °C chez enfant de _ ans depuis _ heures.",
    examination: "T° _ °C. Bon état général. Gorge : _. Oreilles : _. Auscultation : _. Abdomen : souple. Pas de raideur méningée.",
    diagnosis: "Fièvre d'origine virale probable (rhinopharyngite / otite / angine).",
    treatment: "Paracétamol _ mg/kg/prise toutes les 6h.\nDéshabillage, hydratation.\nPas d'antibiotique sauf indication clinique.\nConsulter en urgence si : fièvre > 38,5°C chez < 3 mois, convulsions, altération de l'état général.",
  },
  {
    id: "pedia_routine",
    label: "Consultation pédiatrique de routine",
    category: "Pédiatrie",
    motif: "Consultation de routine / suivi de croissance.",
    examination: "Poids _ kg (_° percentile). Taille _ cm (_° percentile). Développement psychomoteur adapté à l'âge. Examen cardio-pulmonaire normal. Abdomen normal.",
    diagnosis: "Enfant en bonne santé. Développement normal.",
    treatment: "Mise à jour vaccinations selon calendrier.\nConseils alimentaires adaptés à l'âge.\nProchain bilan à _ mois.",
  },

  // ── Psy ───────────────────────────────────────────────────────────────────
  {
    id: "anxiete",
    label: "Syndrome anxieux",
    category: "Psy",
    motif: "Anxiété, tension intérieure, troubles du sommeil. Évolution depuis _.",
    examination: "Conscience normale. Pas d'idées suicidaires. Insight conservé. Score HAD-A : _.",
    diagnosis: "Trouble anxieux généralisé / Syndrome anxieux.",
    treatment: "Psychothérapie de soutien.\nHygiène de vie : exercice physique, sommeil régulier.\nAnxiolytique à courte durée si nécessaire.\nSuivi régulier. Avis psychiatrique si résistance.",
  },
  {
    id: "depression",
    label: "Épisode dépressif",
    category: "Psy",
    motif: "Tristesse, anhédonie, asthénie, insomnie depuis _ semaines.",
    examination: "Ralentissement psychomoteur. Pas d'idées suicidaires actives. Score PHQ-9 : _.",
    diagnosis: "Épisode dépressif caractérisé léger / modéré.",
    treatment: "ISRS : sertraline 50 mg/j (délai d'action 2-4 semaines).\nSoutien psychologique.\nActivité physique régulière.\nRéévaluation à 4 semaines. Suivi rapproché.",
  },
];

// ── AsyncStorage helpers ───────────────────────────────────────────────────

function getAS() {
  return require("@react-native-async-storage/async-storage").default;
}

const customKey = (uid: string) => `blackpine.cab.note-templates.v1.${uid}`;

export async function loadCustomTemplates(userId: string): Promise<NoteTemplate[]> {
  try {
    const raw = await getAS().getItem(customKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomTemplates(
  templates: NoteTemplate[],
  userId: string,
): Promise<void> {
  await getAS().setItem(customKey(userId), JSON.stringify(templates));
}
