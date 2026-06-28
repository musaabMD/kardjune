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

export const SAMPLE_EXAMS: ExamRecord[] = [
  { id: "family-medicine", slug: "family-medicine", title: "Family Medicine", role: "FM" },
  { id: "sdle", slug: "sdle", title: "SDLE", role: "Dentist" },
  { id: "slle", slug: "slle", title: "SLLE", role: "Lab specialist" },
  { id: "smle", slug: "smle", title: "SMLE", role: "Physician" },
  { id: "snle", slug: "snle", title: "SNLE", role: "Nursing" },
  { id: "sple", slug: "sple", title: "SPLE", role: "Pharmacist" },
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
