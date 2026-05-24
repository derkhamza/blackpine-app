/**
 * moroccanDrugs.ts
 *
 * Local database of ~400 drugs commonly prescribed in Morocco.
 * Each entry has:
 *   dci       — International Nonproprietary Name (generic)
 *   brands    — Brand names available in Morocco
 *   form      — Dosage form abbreviation shown to the user
 *   strength  — Most common strength (displayed alongside DCI)
 *   dosage    — Auto-fill suggestion for the Posologie field
 *   frequency — Auto-fill suggestion for the Fréquence field
 *   duration  — Auto-fill suggestion for the Durée field (optional)
 */

export interface DrugEntry {
  dci: string;
  brands: string[];
  form: string;       // cp, gél, sirop, amp, supp, crème, collyre, patch…
  strength: string;   // e.g. "500 mg", "5 mg/5 ml"
  dosage?: string;
  frequency?: string;
  duration?: string;
}

// ─── Analgesics & Antipyretics ──────────────────────────────────────────────
const analgesics: DrugEntry[] = [
  {
    dci: "Paracétamol", brands: ["Doliprane", "Dafran", "Efferalgan", "Panadol"],
    form: "cp", strength: "1 g",
    dosage: "1 cp", frequency: "3 fois/j", duration: "5 jours",
  },
  {
    dci: "Paracétamol", brands: ["Doliprane sirop", "Dafran sirop"],
    form: "sirop", strength: "2,4 %",
    dosage: "15 mg/kg", frequency: "3–4 fois/j", duration: "3 jours",
  },
  {
    dci: "Ibuprofène", brands: ["Nurofen", "Brufen", "Ibufen", "Antarène"],
    form: "cp", strength: "400 mg",
    dosage: "1 cp", frequency: "3 fois/j (après repas)", duration: "5 jours",
  },
  {
    dci: "Ibuprofène", brands: ["Nurofen sirop", "Ibufen sirop"],
    form: "sirop", strength: "20 mg/ml",
    dosage: "7–10 mg/kg", frequency: "3 fois/j", duration: "3 jours",
  },
  {
    dci: "Tramadol", brands: ["Tramal", "Contramal", "Zamadol"],
    form: "gél", strength: "50 mg",
    dosage: "1–2 gél", frequency: "3–4 fois/j",
  },
  {
    dci: "Tramadol LP", brands: ["Tramal LP", "Contramal LP"],
    form: "cp LP", strength: "100 mg",
    dosage: "1 cp", frequency: "2 fois/j",
  },
  {
    dci: "Kétoprofène", brands: ["Profénid", "Bi-Profénid"],
    form: "gél", strength: "50 mg",
    dosage: "1 gél", frequency: "3 fois/j (après repas)", duration: "5 jours",
  },
  {
    dci: "Diclofénac", brands: ["Voltarène", "Diclo", "Cataflam"],
    form: "cp", strength: "50 mg",
    dosage: "1 cp", frequency: "2–3 fois/j (après repas)",
  },
  {
    dci: "Diclofénac", brands: ["Voltarène Emulgel", "Diclo-gel"],
    form: "gel 1%", strength: "1 %",
    dosage: "Appliquer 3–4 cm", frequency: "3 fois/j (locale)", duration: "2 semaines",
  },
  {
    dci: "Naproxène", brands: ["Apranax"],
    form: "cp", strength: "550 mg",
    dosage: "1 cp", frequency: "2 fois/j (après repas)",
  },
  {
    dci: "Célécoxib", brands: ["Célébrex"],
    form: "gél", strength: "200 mg",
    dosage: "1 gél", frequency: "1 fois/j (après repas)",
  },
  {
    dci: "Paracétamol + Codéine", brands: ["Dafran Codéine", "Codoliprane"],
    form: "cp", strength: "500/30 mg",
    dosage: "1–2 cp", frequency: "3 fois/j",
  },
  {
    dci: "Néfopam", brands: ["Acupan"],
    form: "amp", strength: "20 mg/2 ml",
    dosage: "1 amp en IV/IM", frequency: "3 fois/j",
  },
];

// ─── Antibiotics ────────────────────────────────────────────────────────────
const antibiotics: DrugEntry[] = [
  {
    dci: "Amoxicilline", brands: ["Amoxil", "Clamoxyl", "Flemoxin"],
    form: "gél", strength: "500 mg",
    dosage: "1 gél", frequency: "3 fois/j", duration: "7 jours",
  },
  {
    dci: "Amoxicilline", brands: ["Clamoxyl sirop", "Amoxil sirop"],
    form: "sirop", strength: "250 mg/5 ml",
    dosage: "25 mg/kg/j divisé en 3 prises", frequency: "3 fois/j", duration: "7 jours",
  },
  {
    dci: "Amoxicilline + Acide clavulanique", brands: ["Augmentin", "Amoclan", "Clavumox"],
    form: "cp", strength: "875/125 mg",
    dosage: "1 cp", frequency: "2–3 fois/j (après repas)", duration: "7 jours",
  },
  {
    dci: "Azithromycine", brands: ["Zithromax", "Azitab", "Sumamed"],
    form: "cp", strength: "500 mg",
    dosage: "1 cp", frequency: "1 fois/j", duration: "3 jours",
  },
  {
    dci: "Clarithromycine", brands: ["Klacid", "Claricid"],
    form: "cp", strength: "500 mg",
    dosage: "1 cp", frequency: "2 fois/j", duration: "7 jours",
  },
  {
    dci: "Ciprofloxacine", brands: ["Ciproxin", "Ciprobay", "Ciproflox"],
    form: "cp", strength: "500 mg",
    dosage: "1 cp", frequency: "2 fois/j", duration: "7 jours",
  },
  {
    dci: "Ofloxacine", brands: ["Oflocet", "Tarivid"],
    form: "cp", strength: "200 mg",
    dosage: "1 cp", frequency: "2 fois/j", duration: "7 jours",
  },
  {
    dci: "Lévofloxacine", brands: ["Tavanic", "Levoxine"],
    form: "cp", strength: "500 mg",
    dosage: "1 cp", frequency: "1 fois/j", duration: "7 jours",
  },
  {
    dci: "Doxycycline", brands: ["Vibramycine", "Doxylin", "Doxin"],
    form: "gél", strength: "100 mg",
    dosage: "1 gél", frequency: "2 fois/j (après repas)", duration: "7 jours",
  },
  {
    dci: "Métronidazole", brands: ["Flagyl", "Métronidazole Panpharma"],
    form: "cp", strength: "500 mg",
    dosage: "1 cp", frequency: "3 fois/j (après repas)", duration: "7 jours",
  },
  {
    dci: "Cefixime", brands: ["Suprax", "Ixprim", "Oroken"],
    form: "gél", strength: "200 mg",
    dosage: "1 gél", frequency: "2 fois/j", duration: "7 jours",
  },
  {
    dci: "Ceftriaxone", brands: ["Rocéphine"],
    form: "amp", strength: "1 g",
    dosage: "1 g", frequency: "1 fois/j (IM ou IV)", duration: "5–7 jours",
  },
  {
    dci: "Cefuroxime-axétil", brands: ["Zinnat", "Cefakind"],
    form: "cp", strength: "500 mg",
    dosage: "1 cp", frequency: "2 fois/j (après repas)", duration: "7 jours",
  },
  {
    dci: "Spiramycine + Métronidazole", brands: ["Rodogyl"],
    form: "cp", strength: "750 000 UI + 125 mg",
    dosage: "2 cp", frequency: "3 fois/j", duration: "5 jours",
  },
  {
    dci: "Triméthoprime + Sulfaméthoxazole", brands: ["Bactrim", "Cotrimoxazole"],
    form: "cp fort", strength: "160/800 mg",
    dosage: "1 cp", frequency: "2 fois/j", duration: "7 jours",
  },
  {
    dci: "Nitrofurantoïne", brands: ["Furadantine", "Uvamine"],
    form: "gél", strength: "100 mg",
    dosage: "1 gél", frequency: "3 fois/j (après repas)", duration: "7 jours",
  },
  {
    dci: "Fosfomycine trométamol", brands: ["Monuril"],
    form: "sachet", strength: "3 g",
    dosage: "1 sachet", frequency: "dose unique",
  },
  {
    dci: "Amoxicilline 1 g", brands: ["Clamoxyl 1 g", "Amoxil 1 g"],
    form: "cp", strength: "1 g",
    dosage: "1 cp", frequency: "2 fois/j", duration: "7 jours",
  },
];

// ─── Antihypertensives ──────────────────────────────────────────────────────
const antihypertensives: DrugEntry[] = [
  {
    dci: "Amlodipine", brands: ["Amlor", "Istin", "Amlocard"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Amlodipine", brands: ["Amlor 10", "Amlocard 10"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Ramipril", brands: ["Triatec", "Ramace", "Ramipril Teva"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Perindopril", brands: ["Coversyl", "Prestalia"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Énalapril", brands: ["Rénitec", "Enalapril Teva"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1–2 fois/j",
  },
  {
    dci: "Losartan", brands: ["Cozaar", "Lozap", "Losar"],
    form: "cp", strength: "50 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Valsartan", brands: ["Diovan", "Tareg", "Nisis"],
    form: "cp", strength: "80 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Telmisartan", brands: ["Micardis", "Pritor"],
    form: "cp", strength: "40 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Irbesartan", brands: ["Aprovel", "Avapro"],
    form: "cp", strength: "150 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Bisoprolol", brands: ["Concor", "Bisoce", "Bisoprolol Teva"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Aténolol", brands: ["Ténormine"],
    form: "cp", strength: "50 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Métoprolol", brands: ["Lopressor", "Seloken"],
    form: "cp", strength: "50 mg",
    dosage: "1 cp", frequency: "2 fois/j",
  },
  {
    dci: "Nébivolol", brands: ["Temerit", "Nebilet"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Lercanidipine", brands: ["Zanidip"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j (avant repas)",
  },
  {
    dci: "Indapamide", brands: ["Fludex", "Tertensif"],
    form: "cp", strength: "1,5 mg LP",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Hydrochlorothiazide", brands: ["Esidrex"],
    form: "cp", strength: "25 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Furosémide", brands: ["Lasilix", "Furosémide Renaudin"],
    form: "cp", strength: "40 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Spironolactone", brands: ["Aldactone", "Spironone"],
    form: "cp", strength: "25 mg",
    dosage: "1–2 cp", frequency: "1 fois/j",
  },
  {
    dci: "Amlodipine + Valsartan", brands: ["Exforge"],
    form: "cp", strength: "5/80 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Périndopril + Amlodipine", brands: ["Coveram"],
    form: "cp", strength: "5/5 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Losartan + Hydrochlorothiazide", brands: ["Hyzaar", "Fortzaar"],
    form: "cp", strength: "50/12,5 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
];

// ─── Antidiabetics ──────────────────────────────────────────────────────────
const antidiabetics: DrugEntry[] = [
  {
    dci: "Metformine", brands: ["Glucophage", "Metformax", "Stagid"],
    form: "cp", strength: "500 mg",
    dosage: "1 cp", frequency: "2–3 fois/j (pendant repas)",
  },
  {
    dci: "Metformine 850 mg", brands: ["Glucophage 850", "Stagid 850"],
    form: "cp", strength: "850 mg",
    dosage: "1 cp", frequency: "2–3 fois/j (pendant repas)",
  },
  {
    dci: "Metformine 1000 mg", brands: ["Glucophage 1000"],
    form: "cp", strength: "1 000 mg",
    dosage: "1 cp", frequency: "2 fois/j (pendant repas)",
  },
  {
    dci: "Gliclazide", brands: ["Diamicron", "Unidiamicron MR"],
    form: "cp LP", strength: "30 mg LP",
    dosage: "2–4 cp", frequency: "1 fois/j (petit-déjeuner)",
  },
  {
    dci: "Glibenclamide", brands: ["Daonil"],
    form: "cp", strength: "5 mg",
    dosage: "1–2 cp", frequency: "1–2 fois/j (avant repas)",
  },
  {
    dci: "Sitagliptine", brands: ["Januvia", "Xelevia"],
    form: "cp", strength: "100 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Vildagliptine", brands: ["Galvus"],
    form: "cp", strength: "50 mg",
    dosage: "1 cp", frequency: "2 fois/j",
  },
  {
    dci: "Empagliflozine", brands: ["Jardiance"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Dapagliflozine", brands: ["Forxiga"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Liraglutide", brands: ["Victoza"],
    form: "stylo inj", strength: "6 mg/ml",
    dosage: "0,6–1,2 mg", frequency: "1 fois/j (SC)",
  },
  {
    dci: "Insuline NPH", brands: ["Insulatard", "Humulin N"],
    form: "stylo inj", strength: "100 UI/ml",
    dosage: "Selon schéma", frequency: "1–2 fois/j (SC)",
  },
  {
    dci: "Insuline glargine", brands: ["Lantus", "Toujeo"],
    form: "stylo inj", strength: "100 UI/ml",
    dosage: "Selon schéma", frequency: "1 fois/j (SC)",
  },
  {
    dci: "Metformine + Sitagliptine", brands: ["Janumet", "Velmetia"],
    form: "cp", strength: "1000/50 mg",
    dosage: "1 cp", frequency: "2 fois/j (avec repas)",
  },
];

// ─── Statins & Lipid-lowering ───────────────────────────────────────────────
const statins: DrugEntry[] = [
  {
    dci: "Atorvastatine", brands: ["Tahor", "Tulip", "Torvast"],
    form: "cp", strength: "20 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)",
  },
  {
    dci: "Atorvastatine 40 mg", brands: ["Tahor 40"],
    form: "cp", strength: "40 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)",
  },
  {
    dci: "Rosuvastatine", brands: ["Crestor", "Rosuvax"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Simvastatine", brands: ["Zocor", "Simvarite"],
    form: "cp", strength: "20 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)",
  },
  {
    dci: "Pravastatine", brands: ["Elisor", "Vasten"],
    form: "cp", strength: "20 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)",
  },
  {
    dci: "Fénofibrate", brands: ["Lipanthyl", "Sécalip"],
    form: "gél", strength: "200 mg",
    dosage: "1 gél", frequency: "1 fois/j (avec repas)",
  },
  {
    dci: "Ézétimibe", brands: ["Ezetrol"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
];

// ─── PPIs & Gastro ─────────────────────────────────────────────────────────
const gastro: DrugEntry[] = [
  {
    dci: "Oméprazole", brands: ["Mopral", "Losec", "Oméprazole Zentiva"],
    form: "gél", strength: "20 mg",
    dosage: "1 gél", frequency: "1 fois/j (avant petit-déjeuner)", duration: "4 semaines",
  },
  {
    dci: "Pantoprazole", brands: ["Inipomp", "Eupantol", "Pantoloc"],
    form: "cp", strength: "40 mg",
    dosage: "1 cp", frequency: "1 fois/j (avant repas)", duration: "4 semaines",
  },
  {
    dci: "Lansoprazole", brands: ["Lanzor", "Ogast"],
    form: "gél", strength: "30 mg",
    dosage: "1 gél", frequency: "1 fois/j (avant repas)", duration: "4 semaines",
  },
  {
    dci: "Ésoméprazole", brands: ["Inexium", "Nexium"],
    form: "cp", strength: "20 mg",
    dosage: "1 cp", frequency: "1 fois/j (avant repas)", duration: "4 semaines",
  },
  {
    dci: "Rabéprazole", brands: ["Pariet"],
    form: "cp", strength: "20 mg",
    dosage: "1 cp", frequency: "1 fois/j (avant repas)", duration: "4 semaines",
  },
  {
    dci: "Ranitidine", brands: ["Azantac", "Raniplex"],
    form: "cp", strength: "150 mg",
    dosage: "1 cp", frequency: "2 fois/j",
  },
  {
    dci: "Métoclopramide", brands: ["Primpéran"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "3 fois/j (avant repas)",
  },
  {
    dci: "Dompéridone", brands: ["Motilium"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "3 fois/j (avant repas)",
  },
  {
    dci: "Phloroglucinol", brands: ["Spasfon"],
    form: "cp", strength: "80 mg",
    dosage: "2 cp", frequency: "3 fois/j",
  },
  {
    dci: "Tiémonium", brands: ["Viscéralgine"],
    form: "cp", strength: "50 mg",
    dosage: "1–2 cp", frequency: "3 fois/j",
  },
  {
    dci: "Mébevirine", brands: ["Duspatalin"],
    form: "gél LP", strength: "200 mg LP",
    dosage: "1 gél", frequency: "2 fois/j (20 min avant repas)",
  },
  {
    dci: "Macrogol 4000", brands: ["Forlax", "Movicol", "Macrogol Mylan"],
    form: "sachet", strength: "10 g",
    dosage: "1–2 sachets dans 1 verre d'eau", frequency: "1 fois/j",
  },
  {
    dci: "Bisacodyl", brands: ["Dulcolax"],
    form: "cp gastro", strength: "5 mg",
    dosage: "2 cp", frequency: "le soir", duration: "3 jours max",
  },
  {
    dci: "Trimébutine", brands: ["Debridat"],
    form: "cp", strength: "100 mg",
    dosage: "1 cp", frequency: "3 fois/j",
  },
  {
    dci: "Albumine tannate + Diosmectite", brands: ["Smecta", "Diosmectite"],
    form: "sachet", strength: "3 g",
    dosage: "1 sachet dilué", frequency: "3 fois/j",
  },
  {
    dci: "Lactulose", brands: ["Duphalac", "Lactulose Mylan"],
    form: "sirop", strength: "667 mg/ml",
    dosage: "15 ml", frequency: "1–2 fois/j",
  },
  {
    dci: "Mésal azine", brands: ["Pentasa", "Fivasa"],
    form: "cp LP", strength: "500 mg",
    dosage: "2 cp", frequency: "3 fois/j",
  },
];

// ─── Antihistamines & Allergies ─────────────────────────────────────────────
const antihistamines: DrugEntry[] = [
  {
    dci: "Cétirizine", brands: ["Zyrtec", "Cetigen", "Virlix"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)", duration: "7 jours",
  },
  {
    dci: "Loratadine", brands: ["Clarityne", "Loratadine Zentiva"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Lévocétirizine", brands: ["Xyzall"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)",
  },
  {
    dci: "Fexofénadine", brands: ["Telfast"],
    form: "cp", strength: "120 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Bilastine", brands: ["Bilaxten", "Blexten"],
    form: "cp", strength: "20 mg",
    dosage: "1 cp", frequency: "1 fois/j (à jeun)",
  },
  {
    dci: "Desloratadine", brands: ["Aerius", "Neoclarityn"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Méquitazine", brands: ["Primalan"],
    form: "cp", strength: "5 mg",
    dosage: "1–2 cp", frequency: "2 fois/j",
  },
];

// ─── Respiratory & Bronchodilators ──────────────────────────────────────────
const respiratory: DrugEntry[] = [
  {
    dci: "Salbutamol", brands: ["Ventoline", "Salbutalène"],
    form: "inhaler", strength: "100 µg/dose",
    dosage: "2 bouffées", frequency: "au besoin (max 8/j)",
  },
  {
    dci: "Salbutamol nébulisation", brands: ["Ventoline nébulisation"],
    form: "sol nébul", strength: "2,5 mg/2,5 ml",
    dosage: "1 unité", frequency: "3 fois/j",
  },
  {
    dci: "Budésonide", brands: ["Pulmicort"],
    form: "inhaler", strength: "200 µg/dose",
    dosage: "2 bouffées", frequency: "2 fois/j",
  },
  {
    dci: "Fluticasone", brands: ["Flixotide"],
    form: "inhaler", strength: "100 µg/dose",
    dosage: "2 bouffées", frequency: "2 fois/j",
  },
  {
    dci: "Béclométasone", brands: ["Bécotide", "Qvar"],
    form: "inhaler", strength: "250 µg/dose",
    dosage: "2 bouffées", frequency: "2 fois/j",
  },
  {
    dci: "Salmétérol + Fluticasone", brands: ["Sérévent + Flixotide", "Seretide"],
    form: "inhaler", strength: "25/250 µg",
    dosage: "2 bouffées", frequency: "2 fois/j",
  },
  {
    dci: "Formotérol + Budésonide", brands: ["Symbicort"],
    form: "inhaler", strength: "6/200 µg",
    dosage: "2 bouffées", frequency: "2 fois/j",
  },
  {
    dci: "Ipratropium", brands: ["Atrovent"],
    form: "inhaler", strength: "20 µg/dose",
    dosage: "2 bouffées", frequency: "3 fois/j",
  },
  {
    dci: "Montelukast", brands: ["Singulair"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)",
  },
  {
    dci: "Acétylcystéine", brands: ["Mucomyst", "NAC", "Fluimucil"],
    form: "sachet", strength: "600 mg",
    dosage: "1 sachet effervescent", frequency: "1 fois/j", duration: "10 jours",
  },
  {
    dci: "Carbocistéine", brands: ["Mucotrop", "Rhinathiol"],
    form: "sirop", strength: "250 mg/5 ml",
    dosage: "15 ml", frequency: "3 fois/j", duration: "7 jours",
  },
  {
    dci: "Codéine + Paracétamol (toux)", brands: ["Prontalgine", "Néocodion"],
    form: "cp", strength: "",
    dosage: "1–2 cp", frequency: "3 fois/j",
  },
];

// ─── Corticosteroids ────────────────────────────────────────────────────────
const corticosteroids: DrugEntry[] = [
  {
    dci: "Prednisone", brands: ["Cortancyl", "Prednisone Mylan"],
    form: "cp", strength: "5 mg",
    dosage: "Selon prescription", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Prednisolone", brands: ["Solupred"],
    form: "cp effervescent", strength: "20 mg",
    dosage: "Selon prescription", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Méthylprednisolone", brands: ["Médrol", "Solumedrol"],
    form: "cp", strength: "4 mg",
    dosage: "Selon prescription", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Bétaméthasone", brands: ["Diprostène", "Celestène", "Betnesol"],
    form: "cp", strength: "0,5 mg",
    dosage: "4–8 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Dexaméthasone", brands: ["Dectancyl"],
    form: "cp", strength: "0,5 mg",
    dosage: "4–8 cp", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Hydrocortisone", brands: ["Hydrocortisone Upjohn", "Solu-Cortef"],
    form: "cp", strength: "10 mg",
    dosage: "Selon prescription", frequency: "2 fois/j",
  },
];

// ─── Thyroid ────────────────────────────────────────────────────────────────
const thyroid: DrugEntry[] = [
  {
    dci: "Lévothyroxine", brands: ["Levothyrox", "L-Thyroxin Henning"],
    form: "cp", strength: "50 µg",
    dosage: "1 cp", frequency: "1 fois/j (à jeun, le matin)",
  },
  {
    dci: "Lévothyroxine 75 µg", brands: ["Levothyrox 75"],
    form: "cp", strength: "75 µg",
    dosage: "1 cp", frequency: "1 fois/j (à jeun, le matin)",
  },
  {
    dci: "Lévothyroxine 100 µg", brands: ["Levothyrox 100"],
    form: "cp", strength: "100 µg",
    dosage: "1 cp", frequency: "1 fois/j (à jeun, le matin)",
  },
  {
    dci: "Carbimazole", brands: ["Néo-Mercazole"],
    form: "cp", strength: "5 mg",
    dosage: "Selon prescription", frequency: "2–3 fois/j",
  },
  {
    dci: "Propylthiouracile", brands: ["PTU"],
    form: "cp", strength: "50 mg",
    dosage: "Selon prescription", frequency: "3 fois/j",
  },
];

// ─── Antidepressants & Anxiolytics ──────────────────────────────────────────
const psychotropics: DrugEntry[] = [
  {
    dci: "Paroxétine", brands: ["Deroxat", "Divarius"],
    form: "cp", strength: "20 mg",
    dosage: "1 cp", frequency: "1 fois/j (matin, avec repas)",
  },
  {
    dci: "Sertraline", brands: ["Zoloft", "Serlain"],
    form: "cp", strength: "50 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Fluoxétine", brands: ["Prozac", "Fluoxétine Arrow"],
    form: "gél", strength: "20 mg",
    dosage: "1 gél", frequency: "1 fois/j (matin)",
  },
  {
    dci: "Escitalopram", brands: ["Lexapro", "Seroplex"],
    form: "cp", strength: "10 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Amitriptyline", brands: ["Laroxyl", "Elavil"],
    form: "cp", strength: "25 mg",
    dosage: "1–2 cp", frequency: "1 fois/j (soir)",
  },
  {
    dci: "Alprazolam", brands: ["Xanax"],
    form: "cp", strength: "0,25 mg",
    dosage: "1 cp", frequency: "3 fois/j", duration: "2–4 semaines",
  },
  {
    dci: "Diazépam", brands: ["Valium"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "2–3 fois/j", duration: "2–4 semaines",
  },
  {
    dci: "Bromazépam", brands: ["Lexomil"],
    form: "cp", strength: "6 mg",
    dosage: "½–1 cp", frequency: "2–3 fois/j",
  },
  {
    dci: "Lorazépam", brands: ["Témesta"],
    form: "cp", strength: "1 mg",
    dosage: "1 cp", frequency: "2–3 fois/j",
  },
  {
    dci: "Hydroxyzine", brands: ["Atarax"],
    form: "cp", strength: "25 mg",
    dosage: "1–2 cp", frequency: "3 fois/j",
  },
  {
    dci: "Venlafaxine", brands: ["Effexor"],
    form: "gél LP", strength: "75 mg LP",
    dosage: "1 gél", frequency: "1 fois/j (avec repas)",
  },
  {
    dci: "Mirtazapine", brands: ["Norset"],
    form: "cp", strength: "15 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)",
  },
];

// ─── Antiepileptics ─────────────────────────────────────────────────────────
const antiepileptics: DrugEntry[] = [
  {
    dci: "Valproate de sodium", brands: ["Dépakine"],
    form: "cp LP", strength: "500 mg LP",
    dosage: "Selon prescription", frequency: "2 fois/j",
  },
  {
    dci: "Carbamazépine", brands: ["Tégrétol"],
    form: "cp LP", strength: "200 mg LP",
    dosage: "Selon prescription", frequency: "2 fois/j",
  },
  {
    dci: "Lamotrigine", brands: ["Lamictal"],
    form: "cp", strength: "100 mg",
    dosage: "Selon prescription", frequency: "2 fois/j",
  },
  {
    dci: "Lévétiracétam", brands: ["Keppra"],
    form: "cp", strength: "500 mg",
    dosage: "Selon prescription", frequency: "2 fois/j",
  },
  {
    dci: "Phénobarbital", brands: ["Gardénal"],
    form: "cp", strength: "50 mg",
    dosage: "Selon prescription", frequency: "1 fois/j (soir)",
  },
];

// ─── Anticoagulants & Antiplatelets ─────────────────────────────────────────
const anticoagulants: DrugEntry[] = [
  {
    dci: "Acide acétylsalicylique (antiagrégant)", brands: ["Aspégic 100", "Kardégic"],
    form: "sachet", strength: "100 mg",
    dosage: "1 sachet", frequency: "1 fois/j (repas du soir)",
  },
  {
    dci: "Clopidogrel", brands: ["Plavix", "Klopigrel"],
    form: "cp", strength: "75 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Rivaroxaban", brands: ["Xarelto"],
    form: "cp", strength: "20 mg",
    dosage: "1 cp", frequency: "1 fois/j (avec repas principal)",
  },
  {
    dci: "Apixaban", brands: ["Eliquis"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "2 fois/j",
  },
  {
    dci: "Dabigatran", brands: ["Pradaxa"],
    form: "gél", strength: "110 mg",
    dosage: "2 gél", frequency: "2 fois/j",
  },
  {
    dci: "Warfarine", brands: ["Coumadine"],
    form: "cp", strength: "2 mg",
    dosage: "Selon INR", frequency: "1 fois/j (même heure)",
  },
  {
    dci: "Énoxaparine", brands: ["Lovenox", "Clexane"],
    form: "seringue", strength: "40 mg",
    dosage: "40 mg", frequency: "1 fois/j (SC)",
  },
];

// ─── Vitamins & Minerals ────────────────────────────────────────────────────
const vitamins: DrugEntry[] = [
  {
    dci: "Vitamine D3", brands: ["Uvedose", "Zymad", "Cholécalciférol"],
    form: "ampoule", strength: "100 000 UI",
    dosage: "1 ampoule", frequency: "1 fois/mois (à boire)",
  },
  {
    dci: "Vitamine D3 quotidienne", brands: ["Dedrogyl", "Devaron"],
    form: "gouttes", strength: "0,25 mg/ml",
    dosage: "5–10 gouttes", frequency: "1 fois/j",
  },
  {
    dci: "Vitamine B12", brands: ["Vit B12 Delagrange", "Hydroxocobalamine"],
    form: "amp", strength: "1 000 µg",
    dosage: "1 amp en IM", frequency: "1 fois/semaine",
  },
  {
    dci: "Fer sulfate", brands: ["Tardyferon", "Timoférol"],
    form: "cp", strength: "80 mg",
    dosage: "1–2 cp", frequency: "2 fois/j (à distance des repas)",
  },
  {
    dci: "Acide folique", brands: ["Spéciafoldine"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Calcium + Vitamine D3", brands: ["Cacit D3", "Calcium D3 Sandoz"],
    form: "cp effervescent", strength: "1000 mg / 880 UI",
    dosage: "1 cp", frequency: "1 fois/j (avec eau)",
  },
  {
    dci: "Magnésium", brands: ["Mag 2", "Magnésium Boiron"],
    form: "amp", strength: "100 mg/10 ml",
    dosage: "2 amp", frequency: "1 fois/j (à boire)",
  },
  {
    dci: "Zinc", brands: ["Granions de Zinc", "Effizinc"],
    form: "cp", strength: "15 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Multivitamines + Minéraux", brands: ["Supradyn", "Pharmaton"],
    form: "cp", strength: "",
    dosage: "1 cp", frequency: "1 fois/j (petit-déjeuner)",
  },
  {
    dci: "Fer + Acide folique", brands: ["Gynefam", "Naferyl"],
    form: "gél", strength: "",
    dosage: "1 gél", frequency: "1 fois/j",
  },
];

// ─── Antifungals ────────────────────────────────────────────────────────────
const antifungals: DrugEntry[] = [
  {
    dci: "Fluconazole", brands: ["Diflucan", "Triflucan"],
    form: "gél", strength: "150 mg",
    dosage: "1 gél", frequency: "dose unique",
  },
  {
    dci: "Itraconazole", brands: ["Sporanox"],
    form: "gél", strength: "100 mg",
    dosage: "2 gél", frequency: "1 fois/j (avec repas)", duration: "7 jours",
  },
  {
    dci: "Clotrimazole crème", brands: ["Canesten"],
    form: "crème 1 %", strength: "1 %",
    dosage: "Appliquer fine couche", frequency: "2 fois/j (locale)", duration: "2–4 semaines",
  },
  {
    dci: "Nystatine", brands: ["Mycostatine"],
    form: "cp vaginal", strength: "100 000 UI",
    dosage: "1 cp vaginal", frequency: "1 fois/j (le soir)", duration: "14 jours",
  },
  {
    dci: "Éconazole", brands: ["Pévaryl"],
    form: "crème 1 %", strength: "1 %",
    dosage: "Appliquer fine couche", frequency: "2 fois/j (locale)", duration: "2–4 semaines",
  },
  {
    dci: "Terbinafine", brands: ["Lamisil"],
    form: "cp", strength: "250 mg",
    dosage: "1 cp", frequency: "1 fois/j", duration: "6 semaines (ongles : 12 sem.)",
  },
];

// ─── Antivirals ─────────────────────────────────────────────────────────────
const antivirals: DrugEntry[] = [
  {
    dci: "Aciclovir", brands: ["Zovirax"],
    form: "cp", strength: "400 mg",
    dosage: "1 cp", frequency: "5 fois/j (toutes les 4h)", duration: "5–10 jours",
  },
  {
    dci: "Valaciclovir", brands: ["Zélitrex"],
    form: "cp", strength: "500 mg",
    dosage: "2 cp", frequency: "2 fois/j", duration: "10 jours",
  },
  {
    dci: "Aciclovir crème", brands: ["Zovirax crème"],
    form: "crème 5 %", strength: "5 %",
    dosage: "Appliquer fine couche", frequency: "5 fois/j", duration: "5 jours",
  },
];

// ─── Antiparasitics ─────────────────────────────────────────────────────────
const antiparasitics: DrugEntry[] = [
  {
    dci: "Albendazole", brands: ["Zentel", "Eskazole"],
    form: "cp", strength: "400 mg",
    dosage: "1 cp", frequency: "dose unique (à jeun)",
  },
  {
    dci: "Métronidazole (antiparasitaire)", brands: ["Flagyl"],
    form: "cp", strength: "500 mg",
    dosage: "1 cp", frequency: "3 fois/j", duration: "10 jours",
  },
  {
    dci: "Ivermectine", brands: ["Ivermectol", "Stromectol"],
    form: "cp", strength: "3 mg",
    dosage: "200 µg/kg", frequency: "dose unique (à jeun)",
  },
  {
    dci: "Pyrantel", brands: ["Combantrin"],
    form: "cp", strength: "250 mg",
    dosage: "1 cp/10 kg", frequency: "dose unique",
  },
];

// ─── Dermatology (topical & systemic) ───────────────────────────────────────
const dermatology: DrugEntry[] = [
  {
    dci: "Bétaméthasone crème", brands: ["Diprosone", "Bétésil"],
    form: "crème 0,05 %", strength: "0,05 %",
    dosage: "Appliquer fine couche", frequency: "1–2 fois/j (locale)", duration: "7 jours",
  },
  {
    dci: "Acide fusidique crème", brands: ["Fucidine"],
    form: "crème 2 %", strength: "2 %",
    dosage: "Appliquer fine couche", frequency: "3 fois/j (locale)", duration: "7 jours",
  },
  {
    dci: "Mupirocine", brands: ["Bactroban"],
    form: "pommade 2 %", strength: "2 %",
    dosage: "Appliquer fine couche", frequency: "3 fois/j (locale)", duration: "5–10 jours",
  },
  {
    dci: "Kétoconazole shampooing", brands: ["Kétoderm"],
    form: "shampooing 2 %", strength: "2 %",
    dosage: "1 application", frequency: "2 fois/semaine", duration: "4 semaines",
  },
  {
    dci: "Isotrétinoïne", brands: ["Roaccutane", "Curacné"],
    form: "gél", strength: "20 mg",
    dosage: "Selon prescription", frequency: "1 fois/j (avec repas)",
  },
  {
    dci: "Trétinoïne crème", brands: ["Retacnyl"],
    form: "crème 0,025 %", strength: "0,025 %",
    dosage: "Fine couche sur lésions", frequency: "1 fois/j (soir, locale)",
  },
  {
    dci: "Doxycycline (acné)", brands: ["Vibramycine", "Doxylin"],
    form: "gél", strength: "100 mg",
    dosage: "1 gél", frequency: "1–2 fois/j (après repas)", duration: "3 mois",
  },
];

// ─── Urology ────────────────────────────────────────────────────────────────
const urology: DrugEntry[] = [
  {
    dci: "Tamsulosine", brands: ["Josir", "Mecir"],
    form: "gél LP", strength: "0,4 mg LP",
    dosage: "1 gél", frequency: "1 fois/j (après repas)",
  },
  {
    dci: "Finastéride", brands: ["Chibroproscar", "Propecia"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Doxazosine", brands: ["Cardura"],
    form: "cp", strength: "2 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Oxybutynine", brands: ["Ditropan"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "2–3 fois/j",
  },
  {
    dci: "Solifénacine", brands: ["Vésikur"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j",
  },
  {
    dci: "Sildénafil", brands: ["Viagra", "Sildenafil Zentiva"],
    form: "cp", strength: "50 mg",
    dosage: "1 cp", frequency: "au besoin (1h avant)",
  },
];

// ─── Ophthalmology ──────────────────────────────────────────────────────────
const ophthalmology: DrugEntry[] = [
  {
    dci: "Ciprofloxacine collyre", brands: ["Ciloxan"],
    form: "collyre", strength: "3 mg/ml",
    dosage: "2 gouttes", frequency: "4–6 fois/j", duration: "7 jours",
  },
  {
    dci: "Tobramycine collyre", brands: ["Tobrex"],
    form: "collyre", strength: "3 mg/ml",
    dosage: "2 gouttes", frequency: "4 fois/j", duration: "7 jours",
  },
  {
    dci: "Dexaméthasone + Tobramycine", brands: ["TobraDex"],
    form: "collyre", strength: "",
    dosage: "2 gouttes", frequency: "4 fois/j",
  },
  {
    dci: "Timolol collyre", brands: ["Timoptol"],
    form: "collyre", strength: "0,5 %",
    dosage: "1 goutte", frequency: "2 fois/j",
  },
  {
    dci: "Larmes artificielles", brands: ["Artelac", "Thealose", "Siccafluid"],
    form: "collyre", strength: "",
    dosage: "2 gouttes", frequency: "4–6 fois/j",
  },
];

// ─── Miscellaneous ──────────────────────────────────────────────────────────
const misc: DrugEntry[] = [
  {
    dci: "Colchicine", brands: ["Colchicine Opocalcium"],
    form: "cp", strength: "1 mg",
    dosage: "1 cp", frequency: "2–3 fois/j", duration: "3 jours",
  },
  {
    dci: "Allopurinol", brands: ["Zyloric", "Allopurinol Zentiva"],
    form: "cp", strength: "100 mg",
    dosage: "2–3 cp", frequency: "1 fois/j (après repas)",
  },
  {
    dci: "Méthotrexate", brands: ["Métoject", "Novatrex"],
    form: "cp", strength: "2,5 mg",
    dosage: "Selon prescription", frequency: "1 fois/semaine",
  },
  {
    dci: "Hydroxychloroquine", brands: ["Plaquenil"],
    form: "cp", strength: "200 mg",
    dosage: "1–2 cp", frequency: "1 fois/j (avec repas)",
  },
  {
    dci: "Ibandronique acide", brands: ["Bonviva"],
    form: "cp", strength: "150 mg",
    dosage: "1 cp", frequency: "1 fois/mois (à jeun)",
  },
  {
    dci: "Alendronate", brands: ["Fosamax"],
    form: "cp", strength: "70 mg",
    dosage: "1 cp", frequency: "1 fois/semaine (à jeun avec eau)",
  },
  {
    dci: "Donépézil", brands: ["Aricept"],
    form: "cp", strength: "5 mg",
    dosage: "1 cp", frequency: "1 fois/j (soir)",
  },
  {
    dci: "Lidocaïne + Prilocaïne", brands: ["EMLA"],
    form: "crème", strength: "25/25 mg/g",
    dosage: "Appliquer sous occlusif 1h avant", frequency: "avant geste invasif",
  },
  {
    dci: "Acide valproïque sirop", brands: ["Dépakine sirop"],
    form: "sirop", strength: "200 mg/ml",
    dosage: "Selon prescription", frequency: "2–3 fois/j",
  },
  {
    dci: "Ondansétron", brands: ["Zophren"],
    form: "cp", strength: "4 mg",
    dosage: "1 cp", frequency: "3 fois/j",
  },
  {
    dci: "Métopimazine", brands: ["Vogalène"],
    form: "cp", strength: "7,5 mg",
    dosage: "1–2 cp", frequency: "3 fois/j",
  },
  {
    dci: "Chlorhexidine + Benzalkonium", brands: ["Biseptine", "Dakin"],
    form: "sol locale", strength: "",
    dosage: "Appliquer sur plaie", frequency: "2 fois/j (locale)",
  },
];

// ─── Full database ───────────────────────────────────────────────────────────
export const MOROCCAN_DRUGS: DrugEntry[] = [
  ...analgesics,
  ...antibiotics,
  ...antihypertensives,
  ...antidiabetics,
  ...statins,
  ...gastro,
  ...antihistamines,
  ...respiratory,
  ...corticosteroids,
  ...thyroid,
  ...psychotropics,
  ...antiepileptics,
  ...anticoagulants,
  ...vitamins,
  ...antifungals,
  ...antivirals,
  ...antiparasitics,
  ...dermatology,
  ...urology,
  ...ophthalmology,
  ...misc,
];

// ─── Search helper ────────────────────────────────────────────────────────────
/** Normalize text: lowercase + strip accents for fuzzy matching */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Search the drug database.
 * Matches against DCI name and all brand names.
 * Returns up to `limit` results (default 7), scored by match quality.
 */
export function searchDrugs(query: string, limit = 7): DrugEntry[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];

  const scored: { drug: DrugEntry; score: number }[] = [];

  for (const drug of MOROCCAN_DRUGS) {
    const dciNorm = normalize(drug.dci);
    const brandNorms = drug.brands.map(normalize);

    let score = 0;
    if (dciNorm.startsWith(q)) score = 100;
    else if (dciNorm.includes(q)) score = 70;
    else {
      for (const b of brandNorms) {
        if (b.startsWith(q)) { score = 90; break; }
        if (b.includes(q)) { score = 60; break; }
      }
    }
    if (score > 0) scored.push({ drug, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.drug);
}
