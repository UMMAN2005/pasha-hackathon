export function getToday(): Date {
  const v = process.env.DEMO_TODAY;
  if (!v) throw new Error("DEMO_TODAY not set");
  return new Date(`${v}T00:00:00.000Z`);
}

export function daysBetween(target: Date, from: Date): number {
  return Math.floor((target.getTime() - from.getTime()) / 86_400_000);
}
