import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import GoalsEditor from "./GoalsEditor";
import { cloudflareEnv } from "@/lib/cloudflare-store";
import { HQ_GOAL_CATEGORIES } from "@/lib/hq-goals";
import { HQ_OWNER_EMAIL } from "@/lib/hq-admin";
import { listD1Tables, listHqGoals, sourceCountForGoal } from "@/lib/hq-goals-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DrKard HQ Goals",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HqGoalsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/hq/goals");

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (email !== HQ_OWNER_EMAIL) notFound();

  const env = await cloudflareEnv();
  const tables = await listD1Tables(env.DRKARD_DB);
  const goals = await listHqGoals(env.DRKARD_DB);
  const goalsWithCounts = await Promise.all(
    goals.map(async (goal) => ({
      ...goal,
      sourceCount: (await sourceCountForGoal(env.DRKARD_DB, goal, tables)) ?? undefined,
    })),
  );

  return <GoalsEditor initialGoals={goalsWithCounts} tables={tables} categories={HQ_GOAL_CATEGORIES} />;
}
