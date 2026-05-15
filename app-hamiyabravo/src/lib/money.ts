export const azn = (manat: number): number => Math.round(manat * 100);

export function formatAzn(qapik: number): string {
  const sign = qapik < 0 ? "-" : "";
  const abs = Math.abs(qapik);
  const whole = Math.floor(abs / 100);
  const cents = abs % 100;
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return cents === 0 ? `${sign}${grouped} ₼` : `${sign}${grouped},${cents.toString().padStart(2, "0")} ₼`;
}
