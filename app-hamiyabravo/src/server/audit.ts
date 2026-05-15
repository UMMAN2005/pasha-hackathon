import type { Prisma, PrismaClient } from "@prisma/client";

export async function writeAudit(
  tx: Prisma.TransactionClient | PrismaClient,
  a: {
    actorId?: string;
    actorName: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }
) {
  await tx.auditLog.create({
    data: {
      actorId: a.actorId,
      actorName: a.actorName,
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      metadata: a.metadata ? JSON.stringify(a.metadata) : null,
    },
  });
}
