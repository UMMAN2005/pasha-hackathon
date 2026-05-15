export const KG_PER_MEAL = 0.42;
export const CO2E_PER_KG = 2.5;

export const UNIT_WEIGHT_KG: Record<string, number> = {
  "DARY-YOG-500": 0.5,
  "MEAT-CHK-1000": 1.0,
  "PROD-BAN-1000": 1.0,
  "BAKE-CRS-6": 0.4,
  "PACK-PST-500": 0.5,
};

export type OrderLine = {
  sku: string;
  quantity: number;
  totalAmount: number;
};

export interface ImpactResult {
  kgSaved: number;
  mealsSaved: number;
  co2eAvoided: number;
  moneyRecovered: number;
  wasteLost: number;
}

export function impact(lines: OrderLine[]): ImpactResult {
  const kgSaved = lines.reduce(
    (a, l) => a + l.quantity * (UNIT_WEIGHT_KG[l.sku] ?? 0.5),
    0
  );

  return {
    kgSaved,
    mealsSaved: Math.floor(kgSaved / KG_PER_MEAL),
    co2eAvoided: Math.round(kgSaved * CO2E_PER_KG * 10) / 10,
    moneyRecovered: lines.reduce((a, l) => a + l.totalAmount, 0),
    wasteLost: 0,
  };
}
