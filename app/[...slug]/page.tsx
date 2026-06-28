import type { Metadata } from "next";
import { DrKardApp } from "@/components/DrKardApp";

// Known exams keep their proper casing (acronyms stay uppercase).
const EXAM_NAMES: Record<string, string> = {
  "family-medicine": "Family Medicine",
  sdle: "SDLE",
  slle: "SLLE",
  smle: "SMLE",
  snle: "SNLE",
  sple: "SPLE",
};
const titleCase = (slug: string) =>
  EXAM_NAMES[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Distinct, crawlable metadata per URL so /upload and /exam/<slug> aren't all
// indexed as the same page. The body is the single client app shell, which maps
// the URL to the matching screen on the client.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await params;

  if (slug[0] === "upload") {
    return {
      title: "Upload your study material — DrKard",
      description:
        "Drop a PDF, image, or paste notes and DrKard turns it into practice questions and flashcards.",
      alternates: { canonical: "/upload" },
    };
  }

  if (slug[0] === "dashboard") {
    return {
      title: "Dashboard — DrKard",
      description: "Review your DrKard library and uploaded study content.",
      alternates: { canonical: "/dashboard" },
    };
  }

  if (slug[0] === "exam" && slug[1]) {
    const name = titleCase(slug[1]);
    const isCards = slug[2] === "cards";
    const tab = isCards && slug[3] ? ` · Cards · ${titleCase(slug[3])}` : slug[2] ? ` · ${titleCase(slug[2])}` : "";
    const path = isCards && slug[3] ? `/exam/${slug[1]}/cards/${slug[3]}` : slug[2] ? `/exam/${slug[1]}/${slug[2]}` : `/exam/${slug[1]}`;
    return {
      title: `${name}${tab} — DrKard`,
      description: isCards && slug[3]
        ? `Study the ${titleCase(slug[3])} flashcard deck for ${name} on DrKard.`
        : `Practice ${name} exam questions with flashcards, mock exams, analytics, and an AI study assistant on DrKard.`,
      alternates: { canonical: path },
    };
  }

  return {
    title: "DrKard — Study smarter, pass exams",
    description:
      "Real exam questions for every medical specialty. Practice, flashcards, mock exams, and an AI study assistant.",
  };
}

export default async function CatchAllAppRoute({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  return <DrKardApp initialPath={`/${slug.join("/")}`} />;
}
