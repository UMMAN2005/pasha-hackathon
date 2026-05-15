export const QTY_HIGH = 100;
export type Condition = "GOOD" | "CHECK_REQUIRED" | "UNSAFE";
export type ActionType =
  | "KEEP" | "IN_STORE_DISCOUNT" | "TRANSFER" | "LIST_B2B"
  | "BUNDLE" | "DONATE" | "SUPPLIER_RETURN" | "DISPOSE";

export function discountPercent(risk: number): number {
  if (risk >= 90) return 45;
  if (risk >= 80) return 40;
  if (risk >= 70) return 30;
  if (risk >= 50) return 20;
  return 0;
}

export function listingUnitPrice(retail: number, cost: number, disc: number): number {
  return Math.max(Math.round((retail * (100 - disc)) / 100), cost);
}

export type DecisionInput = {
  riskScore: number;
  quantityOnHand: number;
  category: string;
  condition: Condition;
};

export type Decision = {
  actionType: ActionType;
  priority: number;
  reason: string;
  complianceGate: boolean;
};

export function recommend(i: DecisionInput): Decision {
  const { riskScore: r, quantityOnHand: q, category: c, condition } = i;

  if (condition === "UNSAFE")
    return {
      actionType: "DISPOSE",
      priority: 1,
      complianceGate: false,
      reason: "Təhlükəsizlik riski — satış bloklandı, utilizasiya/yoxlama",
    };

  if (condition === "CHECK_REQUIRED" && r >= 80)
    return {
      actionType: "LIST_B2B",
      priority: 1,
      complianceGate: true,
      reason: "Kritik — əvvəlcə uyğunluq yoxlaması, sonra təcili B2B",
    };

  if (r >= 80 && q >= QTY_HIGH && (c === "Produce" || c === "Bakery"))
    return {
      actionType: "BUNDLE",
      priority: 2,
      complianceGate: false,
      reason: "Yüksək risk — kafelər/çörəkxanalar üçün dəstə təklifi",
    };

  if (r >= 80 && q >= QTY_HIGH)
    return {
      actionType: "LIST_B2B",
      priority: 2,
      complianceGate: false,
      reason: "Bu gün hərəkət lazımdır — restoranlara endirimlə B2B",
    };

  if (r >= 80)
    return {
      actionType: "LIST_B2B",
      priority: 2,
      complianceGate: false,
      reason: "Yüksək risk — B2B siyahıya əlavə et",
    };

  if (r >= 50)
    return {
      actionType: "IN_STORE_DISCOUNT",
      priority: 3,
      complianceGate: false,
      reason: "Orta risk — mağazada endirim, 24 saat izlə",
    };

  return {
    actionType: "KEEP",
    priority: 5,
    complianceGate: false,
    reason: "Sabit — adi satış planı, izləməyə davam",
  };
}
