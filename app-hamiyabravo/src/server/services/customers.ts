import { prisma } from "@/lib/db";

export interface CustomerRow {
  id: string;
  name: string;
  city: string | null;
  reliability: number;
  verification: string;
  totalBids: number;
  activeBids: number;
  wonOrders: number;
  totalSpent: number; // qəpik
  lastActivity: Date | null;
}

export async function getCustomers(): Promise<CustomerRow[]> {
  const companies = await prisma.company.findMany({
    where: { type: "BUYER" },
    include: {
      bids: true,
      orders: true,
    },
    orderBy: { reliabilityScore: "desc" },
  });

  return companies.map((c) => {
    const activeBids = c.bids.filter(
      (b) => b.status === "LEADING" || b.status === "OUTBID"
    ).length;
    const wonOrders = c.orders.length;
    const totalSpent = c.orders.reduce((s, o) => s + o.totalAmount, 0);
    const dates = [
      ...c.bids.map((b) => b.createdAt),
      ...c.orders.map((o) => o.createdAt),
    ].sort((a, b) => b.getTime() - a.getTime());
    return {
      id: c.id,
      name: c.legalName,
      city: c.city,
      reliability: c.reliabilityScore,
      verification: c.verificationStatus,
      totalBids: c.bids.length,
      activeBids,
      wonOrders,
      totalSpent,
      lastActivity: dates[0] ?? null,
    };
  });
}
