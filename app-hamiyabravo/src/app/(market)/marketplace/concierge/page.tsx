import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ConciergeChat } from "@/components/concierge-chat";

export const dynamic = "force-dynamic";

export default async function ConciergePage() {
  const session = await getSession();
  if (!session) redirect("/select-user");

  let buyerName = "there";
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    if (user?.name) buyerName = user.name.split(" ")[0];
  } catch {
    /* keep default */
  }

  return <ConciergeChat buyerName={buyerName} />;
}
