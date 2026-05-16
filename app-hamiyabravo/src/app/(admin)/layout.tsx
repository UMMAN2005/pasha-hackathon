import { requireRole } from "@/lib/session";
import { ForbiddenError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireRole(
      "HQ_ADMIN",
      "BRANCH_MANAGER",
      "WAREHOUSE_MANAGER",
      "FINANCE_ANALYST",
      "LOGISTICS_OPERATOR"
    );
  } catch (err) {
    if (err instanceof ForbiddenError) {
      redirect("/select-user");
    }
    throw err;
  }

  const [user, queueCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    prisma.recommendation.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <AppShell
      surface="admin"
      userName={user.name}
      userRole={user.role}
      queueCount={queueCount}
    >
      {children}
    </AppShell>
  );
}
