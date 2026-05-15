import { execSync } from "child_process";

async function globalSetup() {
  process.env.AI_ENABLED = "false";
  process.env.DEMO_TODAY = "2026-05-15";

  console.log("Seeding database...");
  try {
    execSync("node_modules/.bin/prisma db seed", { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to seed database:", error);
    throw error;
  }
}

export default globalSetup;
