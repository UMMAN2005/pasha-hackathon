import { prisma } from "@/lib/db";
import { selectUserAction } from "./actions";
import { GlassCard } from "@/components/ui/kit";
import { LanguageSelector } from "@/components/language-selector";
import { ShieldCheck, Store, ArrowRight, Leaf } from "lucide-react";

export default async function SelectUserPage() {
  const admin =
    (await prisma.user.findFirst({ where: { role: "HQ_ADMIN" } })) ??
    (await prisma.user.findFirst({ where: { role: "BRANCH_MANAGER" } }));
  const buyer = await prisma.user.findFirst({
    where: { role: "BUSINESS_BUYER" },
    include: { company: true },
  });

  const options = [
    {
      id: admin?.id,
      icon: ShieldCheck,
      title: "Bravo Admin",
      subtitle: "Operations & AI control center",
      desc: "Predict waste, run auctions, supervise Bravo AI.",
    },
    {
      id: buyer?.id,
      icon: Store,
      title: "Restaurant / Buyer",
      subtitle: buyer?.company?.legalName ?? "B2B partner",
      desc: "Browse live surplus auctions and place bids.",
    },
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6">
      <div className="absolute right-6 top-6">
        <div className="glass-dark rounded-2xl p-1">
          <LanguageSelector />
        </div>
      </div>

      <div className="w-full max-w-3xl space-y-12">
        <div className="animate-fade-up space-y-4 text-center">
          <div className="bg-brand mx-auto grid h-16 w-16 place-items-center rounded-2xl text-white shadow-xl">
            <Leaf className="h-8 w-8" />
          </div>
          <h1 className="text-6xl font-black">
            Hamıya<span className="text-gradient">Bravo</span>
          </h1>
          <p className="text-lg font-medium text-[var(--ink-soft)]">
            AI that turns supermarket waste into recovered money, meals and
            saved CO₂.
          </p>
        </div>

        <div className="grid animate-fade-up gap-6 delay-1 md:grid-cols-2">
          {options.map((o) => (
            <form key={o.title} action={selectUserAction}>
              <input type="hidden" name="userId" value={o.id ?? ""} />
              <button type="submit" className="group block w-full text-left">
                <GlassCard className="card-rise h-full p-8">
                  <div className="bg-brand mb-6 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg">
                    <o.icon className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-[var(--ink)]">
                    {o.title}
                  </h2>
                  <p className="mt-1 text-sm font-bold uppercase tracking-wide text-emerald-600">
                    {o.subtitle}
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink-soft)]">
                    {o.desc}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--ink)] transition-transform group-hover:translate-x-1">
                    Enter <ArrowRight className="h-4 w-4" />
                  </span>
                </GlassCard>
              </button>
            </form>
          ))}
        </div>

        <p className="animate-fade-up text-center text-sm text-[var(--ink-soft)] delay-2">
          Choose a role to start the demo
        </p>
      </div>
    </div>
  );
}
