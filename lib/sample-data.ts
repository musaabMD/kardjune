export type ExamRecord = {
  id: string;
  slug: string;
  title: string;
  role: string;
};

export type BankQuestion = {
  _id: string;
  examId: string;
  subject: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  tags: string[];
};

const REQUESTED_EXAMS: ExamRecord[] = [
  { id: "nclex-rn", slug: "nclex-rn", title: "NCLEX-RN", role: "Registered nurse" },
  { id: "nclex-pn", slug: "nclex-pn", title: "NCLEX-PN", role: "Practical nurse" },
  { id: "ati-teas", slug: "ati-teas", title: "ATI TEAS", role: "Nursing entrance" },
  { id: "hesi-a2", slug: "hesi-a2", title: "HESI A2", role: "Health entrance" },
  { id: "comptia-security-plus", slug: "comptia-security-plus", title: "CompTIA Security+", role: "Cybersecurity" },
  { id: "comptia-a-plus", slug: "comptia-a-plus", title: "CompTIA A+", role: "IT support" },
  { id: "comptia-network-plus", slug: "comptia-network-plus", title: "CompTIA Network+", role: "Networking" },
  { id: "aws-cloud-practitioner", slug: "aws-cloud-practitioner", title: "AWS Cloud Practitioner", role: "Cloud fundamentals" },
  { id: "cisco-ccna", slug: "cisco-ccna", title: "Cisco CCNA", role: "Network associate" },
  { id: "cissp", slug: "cissp", title: "CISSP", role: "Security leadership" },
  { id: "cisa", slug: "cisa", title: "CISA", role: "IT audit" },
  { id: "pmp", slug: "pmp", title: "PMP", role: "Project manager" },
  { id: "capm", slug: "capm", title: "CAPM", role: "Associate project manager" },
  { id: "shrm-cp", slug: "shrm-cp", title: "SHRM-CP", role: "HR professional" },
  { id: "phr", slug: "phr", title: "PHR", role: "HR professional" },
  { id: "cpc", slug: "cpc", title: "CPC", role: "Medical coder" },
  { id: "ptce", slug: "ptce", title: "PTCE", role: "Pharmacy technician" },
  { id: "nha-ccma", slug: "nha-ccma", title: "NHA CCMA", role: "Clinical medical assistant" },
  { id: "nremt-emt", slug: "nremt-emt", title: "NREMT EMT", role: "Emergency medical technician" },
  { id: "nremt-paramedic", slug: "nremt-paramedic", title: "NREMT Paramedic", role: "Paramedic" },
  { id: "fnp", slug: "fnp", title: "FNP", role: "Family nurse practitioner" },
  { id: "cen", slug: "cen", title: "CEN", role: "Emergency nurse" },
  { id: "ccrn", slug: "ccrn", title: "CCRN", role: "Critical care nurse" },
  { id: "nasm-cpt", slug: "nasm-cpt", title: "NASM CPT", role: "Personal trainer" },
  { id: "nsca-cscs", slug: "nsca-cscs", title: "NSCA CSCS", role: "Strength and conditioning" },
  { id: "vtne", slug: "vtne", title: "VTNE", role: "Veterinary technician" },
  { id: "npte-pt", slug: "npte-pt", title: "NPTE PT", role: "Physical therapist" },
  { id: "nbcot-otr", slug: "nbcot-otr", title: "NBCOT OTR", role: "Occupational therapist" },
  { id: "leed-green-associate", slug: "leed-green-associate", title: "LEED Green Associate", role: "Sustainability" },
  { id: "apics-cpim", slug: "apics-cpim", title: "APICS CPIM", role: "Supply chain" },
];

export const SAMPLE_EXAMS: ExamRecord[] = [
  { id: "family-medicine", slug: "family-medicine", title: "Family Medicine", role: "FM" },
  { id: "sdle", slug: "sdle", title: "SDLE", role: "Dentist" },
  { id: "slle", slug: "slle", title: "SLLE", role: "Lab specialist" },
  { id: "smle", slug: "smle", title: "SMLE", role: "Physician" },
  { id: "snle", slug: "snle", title: "SNLE", role: "Nursing" },
  { id: "sple", slug: "sple", title: "SPLE", role: "Pharmacist" },
  ...REQUESTED_EXAMS,
];

const SAMPLE_QUESTION_TEMPLATES = [
  {
    subject: "Anatomy",
    prompt: "Which nerve innervates the diaphragm?",
    options: ["Phrenic nerve", "Vagus nerve", "Intercostal nerves", "Recurrent laryngeal nerve"],
    answerIndex: 0,
    explanation: "The phrenic nerve (C3-C5) provides the sole motor supply to the diaphragm.",
    tags: ["High-yield"],
  },
  {
    subject: "Pharmacology",
    prompt: "First-line treatment for anaphylaxis?",
    options: ["IV fluids", "IM adrenaline", "Oral antihistamine", "Nebulised salbutamol"],
    answerIndex: 1,
    explanation: "Intramuscular adrenaline is first-line because it rapidly treats airway edema, bronchospasm, and hypotension.",
    tags: ["High-yield", "Exam favourites"],
  },
  {
    subject: "Pathology",
    prompt: "Hallmark cell of Hodgkin lymphoma?",
    options: ["Reed-Sternberg cell", "Auer rods", "Smudge cells", "Heinz bodies"],
    answerIndex: 0,
    explanation: "Reed-Sternberg cells are large binucleate cells classically associated with Hodgkin lymphoma.",
    tags: ["Exam favourites"],
  },
  {
    subject: "Physiology",
    prompt: "Resting membrane potential of a neuron is closest to which value?",
    options: ["-40 mV", "-55 mV", "-70 mV", "-90 mV"],
    answerIndex: 2,
    explanation: "A typical neuron rests near -70 mV, largely set by potassium permeability and the sodium-potassium pump.",
    tags: ["High-yield"],
  },
  {
    subject: "Anatomy",
    prompt: "Artery most commonly occluded in an inferior myocardial infarction?",
    options: ["LAD", "Right coronary artery", "Left circumflex", "Left main"],
    answerIndex: 1,
    explanation: "The right coronary artery supplies the inferior wall in most people, so inferior MIs usually involve the RCA.",
    tags: ["Weak spots"],
  },
  {
    subject: "Physiology",
    prompt: "Which hormone raises serum calcium?",
    options: ["Calcitonin", "Parathyroid hormone", "Insulin", "ANP"],
    answerIndex: 1,
    explanation: "Parathyroid hormone raises calcium via bone resorption, renal calcium reabsorption, and activation of vitamin D.",
    tags: ["High-yield"],
  },
];

export function sampleQuestionsForExam(exam: ExamRecord): BankQuestion[] {
  return SAMPLE_QUESTION_TEMPLATES.map((q, index) => ({
    _id: `${exam.slug}-${index + 1}`,
    examId: exam.id,
    ...q,
  }));
}
