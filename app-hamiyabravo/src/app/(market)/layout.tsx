import { requireRole } from "@/lib/session";
import { ForbiddenError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";

export default async function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireRole("BUSINESS_BUYER", "HQ_ADMIN");
  } catch (err) {
    if (err instanceof ForbiddenError) {
      redirect("/select-user");
    }
    throw err;
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
  });

  return (
    <AppShell
      surface="marketplace"
      userName={user.name}
      userRole={user.role}
    >
      {children}
    </AppShell>
  );
}
