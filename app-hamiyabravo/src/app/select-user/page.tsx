import { prisma } from "@/lib/db";
import { selectUserAction } from "./actions";
import { GlassCard } from "@/components/ui/kit";

const roleEmojis: Record<string, string> = {
  HQ_ADMIN: "🎯",
  BRANCH_MANAGER: "🏪",
  BUSINESS_BUYER: "🤝",
  INVENTORY_OFFICER: "📦",
  SUPER_ADMIN: "👑",
};

export default async function SelectUserPage() {
  const users = await prisma.user.findMany({
    include: { branch: true, company: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Animated background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 opacity-10 blur-3xl animate-float"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-pink-400 to-violet-600 opacity-10 blur-3xl animate-float" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-3 animate-fade-up">
          <h1 className="text-6xl font-black bg-gradient-to-r from-orange-300 via-pink-300 to-violet-300 bg-clip-text text-transparent">
            HamıyaBravo
          </h1>
          <p className="text-xl text-violet-200">Zəka ilə tezlik zəbulları</p>
        </div>

        {/* User Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up delay-1">
          {users.map((user) => (
            <form key={user.id} action={selectUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="w-full group"
              >
                <GlassCard
                  className="p-6 text-left hover:shadow-2xl transition-all duration-300 group-hover:scale-105 cursor-pointer border border-white/10 hover:border-white/30"
                  rise={false}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{roleEmojis[user.role] || "👤"}</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">
                          {user.name}
                        </h3>
                        <p className="text-sm text-violet-200">
                          {user.role === "HQ_ADMIN" ? "Baş Müdür" :
                           user.role === "BRANCH_MANAGER" ? "Şubə Rəhbəri" :
                           user.role === "BUSINESS_BUYER" ? "Alıcı" :
                           user.role === "INVENTORY_OFFICER" ? "Ehtiyat Xidməti" :
                           "Admin"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <span className="text-xs text-violet-300 font-mono">
                        {user.company?.legalName || user.branch?.name || "—"}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </button>
            </form>
          ))}
        </div>

        {/* Footer hint */}
        <div className="text-center text-sm text-violet-300 animate-fade-up delay-2">
          Rolu seçin və demoyu başlayın
        </div>
      </div>
    </div>
  );
}
