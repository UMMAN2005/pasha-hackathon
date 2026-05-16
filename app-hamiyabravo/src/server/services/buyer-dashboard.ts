import { prisma } from "@/lib/db";
import { nearestBranch, type BranchDistance } from "./location";

export interface BuyerDashboard {
  activeBids: number;
  leadingBids: number;
  wonOrders: number;
  totalSpent: number; // qəpik
  pendingPickups: number;
  reliability: number;
  nearest: BranchDistance | null;
}

export async function getBuyerDashboard(
  companyId: string
): Promise<BuyerDashboard> {
  const [company, bids, orders, nearest] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.bid.findMany({ where: { buyerCompanyId: companyId } }),
    prisma.order.findMany({ where: { buyerCompanyId: companyId } }),
    nearestBranch(companyId),
  ]);

  return {
    activeBids: bids.filter(
      (b) => b.status === "LEADING" || b.status === "OUTBID"
    ).length,
    leadingBids: bids.filter((b) => b.status === "LEADING").length,
    wonOrders: orders.length,
    totalSpent: orders.reduce((s, o) => s + o.totalAmount, 0),
    pendingPickups: orders.filter((o) => o.status === "RESERVED").length,
    reliability: company?.reliabilityScore ?? 0,
    nearest,
  };
}
