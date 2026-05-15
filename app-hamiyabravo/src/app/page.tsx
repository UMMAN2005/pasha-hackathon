import { getSession, roleHome } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect(roleHome(session.role));
  }
  redirect("/select-user");
}
