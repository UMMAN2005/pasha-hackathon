import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getEnv } from "./env";
import { ForbiddenError } from "./errors";

export type Role =
  | "HQ_ADMIN"
  | "BRANCH_MANAGER"
  | "WAREHOUSE_MANAGER"
  | "FINANCE_ANALYST"
  | "BUSINESS_BUYER"
  | "LOGISTICS_OPERATOR";

export interface SessionData {
  userId: string;
  role: Role;
  companyId: string | null;
  branchId: string | null;
}

function getSessionOptions() {
  return {
    password: getEnv().SESSION_PASSWORD,
    cookieName: "hb_session",
    cookieOptions: {
      // Demo is served over an HTTP SSH tunnel — a Secure cookie would be
      // dropped by the browser and silently bounce users back to login.
      secure: false,
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 7 * 24 * 60 * 60,
    },
  };
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    getSessionOptions()
  );
  if (!session.userId) {
    return null;
  }
  return {
    userId: session.userId,
    role: session.role,
    companyId: session.companyId ?? null,
    branchId: session.branchId ?? null,
  };
}

export async function setSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    getSessionOptions()
  );
  session.userId = data.userId;
  session.role = data.role;
  session.companyId = data.companyId;
  session.branchId = data.branchId;
  await session.save();
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    getSessionOptions()
  );
  session.destroy();
}

export async function requireRole(...roles: Role[]): Promise<SessionData> {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new ForbiddenError("Insufficient permissions");
  }
  return session;
}

// Pure helpers (importable without next/headers context)

export function isBravoRole(role: Role): boolean {
  const bravoRoles: Role[] = [
    "HQ_ADMIN",
    "BRANCH_MANAGER",
    "WAREHOUSE_MANAGER",
    "FINANCE_ANALYST",
    "LOGISTICS_OPERATOR",
  ];
  return bravoRoles.includes(role);
}

export function isBuyer(role: Role): boolean {
  return role === "BUSINESS_BUYER";
}

export function roleHome(role: Role): string {
  if (isBuyer(role)) {
    return "/marketplace/concierge";
  }
  return "/admin";
}
