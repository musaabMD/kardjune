export const DEFAULT_EXAM_TAB = "learn";

export type AppRoute = {
  page: "home" | "exam" | "dashboard";
  tab: "browse" | "upload";
  examSlug: string | null;
  examTab: string;
  flashSlug: string | null;
  quizSlug: string | null;
  quizResult: boolean;
  aiThreadId: string | null;
  practiceSlug: string | null;
  flashTest: boolean;
  noteSlug: string | null;
};

const emptyExamFields = {
  flashSlug: null as string | null,
  quizSlug: null as string | null,
  quizResult: false,
  aiThreadId: null as string | null,
  practiceSlug: null as string | null,
  flashTest: false,
  noteSlug: null as string | null,
};

export function pathFromState(
  page: AppRoute["page"],
  tab: AppRoute["tab"],
  examSlug: string | null,
  examTab: string,
  flashSlug: string | null,
  quizSlug: string | null,
  quizResult: boolean,
  aiThreadId: string | null,
  practiceSlug: string | null,
  flashTest: boolean,
  noteSlug: string | null,
) {
  if (page === "exam" && examSlug) {
    if (quizSlug) return `/exam/${examSlug}/quiz/${quizSlug}${quizResult ? "/results" : ""}`;
    if (flashSlug && flashTest) return `/exam/${examSlug}/cards/${flashSlug}/test`;
    if (flashSlug) return `/exam/${examSlug}/cards/${flashSlug}`;
    if (practiceSlug) return `/exam/${examSlug}/practice/${encodeURIComponent(practiceSlug)}`;
    if (noteSlug) return `/exam/${examSlug}/learn/notes/${encodeURIComponent(noteSlug)}`;
    if (examTab === "ask" && aiThreadId) return `/exam/${examSlug}/ask/${encodeURIComponent(aiThreadId)}`;
    return examTab && examTab !== DEFAULT_EXAM_TAB ? `/exam/${examSlug}/${examTab}` : `/exam/${examSlug}`;
  }
  if (page === "dashboard") return "/dashboard";
  return tab === "upload" ? "/upload" : "/";
}

export function stateFromPath(path: string): AppRoute {
  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "dashboard") {
    return { page: "dashboard", tab: "browse", examSlug: null, examTab: DEFAULT_EXAM_TAB, ...emptyExamFields };
  }
  if (seg[0] === "exam" && seg[1]) {
    const examSlug = decodeURIComponent(seg[1]);
    const isCards = seg[2] === "cards";
    const isQuiz = seg[2] === "quiz";
    const isAskThread = seg[2] === "ask" && Boolean(seg[3]);
    const isPractice = seg[2] === "practice" && Boolean(seg[3]);
    const isNote = seg[2] === "learn" && seg[3] === "notes" && Boolean(seg[4]);
    const flashTest = isCards && seg[4] === "test";
    return {
      page: "exam",
      tab: "browse",
      examSlug,
      examTab: isCards
        ? "learn"
        : isQuiz
          ? "exam"
          : isAskThread
            ? "ask"
            : isPractice
              ? "practice"
              : isNote
                ? "learn"
                : seg[2] || DEFAULT_EXAM_TAB,
      flashSlug: isCards && seg[3] && seg[3] !== "test" ? decodeURIComponent(seg[3]) : null,
      quizSlug: isQuiz && seg[3] ? decodeURIComponent(seg[3]) : null,
      quizResult: isQuiz && seg[4] === "results",
      aiThreadId: isAskThread ? decodeURIComponent(seg[3]) : null,
      practiceSlug: isPractice ? decodeURIComponent(seg[3]) : null,
      flashTest,
      noteSlug: isNote ? decodeURIComponent(seg[4]) : null,
    };
  }
  if (seg[0] === "upload") {
    return { page: "home", tab: "upload", examSlug: null, examTab: DEFAULT_EXAM_TAB, ...emptyExamFields };
  }
  return { page: "home", tab: "browse", examSlug: null, examTab: DEFAULT_EXAM_TAB, ...emptyExamFields };
}

export function findExamBySlug<T extends { slug?: string; title: string }>(pool: T[], slug: string | null) {
  if (!slug) return null;
  return pool.find((exam) => exam.slug === slug || slugify(exam.title) === slug) ?? null;
}

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
