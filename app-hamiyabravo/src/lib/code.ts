let counter = 0;

export function resetPickupCodeCounter(): void {
  counter = 0;
}

export function pickupCode(): string {
  if (process.env.NODE_ENV === "test") {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    counter++;
    let code = "";
    let n = counter;
    for (let i = 0; i < 6; i++) {
      code = chars[n % chars.length] + code;
      n = Math.floor(n / chars.length);
    }
    return code.padStart(6, "A");
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
