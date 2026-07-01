import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { cloudflareEnv } from "@/lib/cloudflare-store";
import { listLstTasks } from "@/lib/lst-tasks";
import LstBoard from "./LstBoard";

export const dynamic = "force-dynamic";

const LST_OWNER_EMAIL = "mousab.r@gmail.com";

export const metadata: Metadata = {
  title: "Admin Center IT · LST",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function LstPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/lst");

  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (email !== LST_OWNER_EMAIL) notFound();

  const env = await cloudflareEnv();
  const tasks = await listLstTasks(env.DRKARD_DB);

  return <LstBoard initialTasks={tasks} />;
}
