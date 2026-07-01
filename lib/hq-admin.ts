import { currentUser } from "@clerk/nextjs/server";

export const HQ_OWNER_EMAIL = "mousab.r@gmail.com";

export async function isHqOwner() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  return email === HQ_OWNER_EMAIL;
}
