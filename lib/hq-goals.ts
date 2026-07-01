export type HqGoal = {
  name: string;
  label: string;
  category: HqGoalCategory;
  description: string;
  keep: boolean;
};

export const HQ_GOAL_CATEGORIES = ["Acquisition", "Activation", "Learning", "Revenue", "Retention", "Quality", "Operations", "Analytics"] as const;
export type HqGoalCategory = (typeof HQ_GOAL_CATEGORIES)[number];

export const DRKARD_GOALS: HqGoal[] = [
  {
    name: "app_opened",
    label: "App opened",
    category: "Acquisition",
    description: "A visitor loaded DrKard.",
    keep: true,
  },
  {
    name: "signup_started",
    label: "Signup started",
    category: "Activation",
    description: "A visitor started Clerk signup.",
    keep: true,
  },
  {
    name: "exam_opened",
    label: "Exam opened",
    category: "Activation",
    description: "A user opened an exam bank.",
    keep: true,
  },
  {
    name: "question_bank_loaded",
    label: "Question bank loaded",
    category: "Learning",
    description: "Questions were loaded from the bank endpoint.",
    keep: true,
  },
  {
    name: "practice_started",
    label: "Practice started",
    category: "Learning",
    description: "A user started a quiz or practice session.",
    keep: true,
  },
  {
    name: "practice_session_completed",
    label: "Practice completed",
    category: "Learning",
    description: "A user finished and saved a practice session.",
    keep: true,
  },
  {
    name: "question_reported",
    label: "Question reported",
    category: "Quality",
    description: "A user reported a content issue.",
    keep: true,
  },
  {
    name: "upload_completed",
    label: "Upload completed",
    category: "Activation",
    description: "A user uploaded notes, a link, or a file.",
    keep: true,
  },
  {
    name: "ai_message_sent",
    label: "AI message sent",
    category: "Retention",
    description: "A Pro user sent a message to the AI tutor.",
    keep: true,
  },
  {
    name: "pricing_opened",
    label: "Pricing opened",
    category: "Revenue",
    description: "A user opened pricing or upgrade UI.",
    keep: true,
  },
  {
    name: "checkout_initiated",
    label: "Checkout initiated",
    category: "Revenue",
    description: "A user started Stripe checkout.",
    keep: true,
  },
  {
    name: "subscription_active",
    label: "Subscription active",
    category: "Revenue",
    description: "Stripe marked a subscription active or trialing.",
    keep: true,
  },
];

export const RETIRED_GOAL_PATTERNS = [
  "scroll_to_*",
  "faq_*",
  "check_testimonial_*",
  "leadmagnet_*",
  "course_checkout_initiated",
  "bundle_checkout_initiated",
  "upsell_checkout_initiated",
];

export const ACTIVE_GOAL_NAMES = new Set(DRKARD_GOALS.map((goal) => goal.name));
