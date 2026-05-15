"use server";

import { prisma } from "@/lib/db";
import { setSession, roleHome, type Role } from "@/lib/session";
import { redirect } from "next/navigation";

export async function selectUserAction(formData: FormData) {
  const userId = formData.get("userId") as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branch: true, company: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const role = user.role as Role;

  await setSession({
    userId: user.id,
    role,
    companyId: user.companyId,
    branchId: user.branchId,
  });

  redirect(roleHome(role));
}
