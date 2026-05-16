import { prisma } from "@/lib/db";
import { haversineKm } from "@/lib/geo";

export interface BranchDistance {
  id: string;
  name: string;
  city: string;
  distanceKm: number | null;
  etaMin: number | null; // rough drive estimate
}

const AVG_KMH = 38; // city driving average for ETA estimate

export async function getNearbyBranches(
  companyId: string
): Promise<{ buyerCity: string | null; branches: BranchDistance[] }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  const haveBuyer =
    company?.latitude != null && company?.longitude != null;

  const rows: BranchDistance[] = branches.map((b) => {
    let distanceKm: number | null = null;
    if (haveBuyer && b.latitude != null && b.longitude != null) {
      distanceKm = haversineKm(
        { lat: company!.latitude!, lng: company!.longitude! },
        { lat: b.latitude, lng: b.longitude }
      );
    }
    return {
      id: b.id,
      name: b.name,
      city: b.city,
      distanceKm,
      etaMin:
        distanceKm == null ? null : Math.max(3, Math.round((distanceKm / AVG_KMH) * 60)),
    };
  });

  rows.sort((x, y) => (x.distanceKm ?? 1e9) - (y.distanceKm ?? 1e9));
  return { buyerCity: company?.city ?? null, branches: rows };
}

export async function nearestBranch(
  companyId: string
): Promise<BranchDistance | null> {
  const { branches } = await getNearbyBranches(companyId);
  return branches[0] ?? null;
}
