import { prisma } from "@/lib/db";
import { GlassCard, SectionTitle, Pill } from "@/components/ui/kit";

const actionIcons: Record<string, string> = {
  APPROVE: "✅",
  REJECT: "❌",
  RESERVE: "📦",
  PICK_UP: "🚚",
  BID_PLACED: "💰",
  BID_ACCEPTED: "✦",
  RECOMMEND: "🤖",
  CONFIRM: "✓",
};

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-8 space-y-8">
      <SectionTitle
        kicker="📝 Activity Feed"
        title="Sistem Tarixçəsi"
        className="mb-2"
      />

      {logs.length === 0 ? (
        <GlassCard className="p-12 text-center" rise>
          <p className="text-white text-lg">Qeyd yoxdur</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {logs.map((log, idx) => {
            const actionType =
              log.action.includes("APPROVE") ? "APPROVE" :
              log.action.includes("REJECT") ? "REJECT" :
              log.action.includes("RESERVE") ? "RESERVE" :
              log.action.includes("PICK") ? "PICK_UP" :
              log.action.includes("BID_PLACED") ? "BID_PLACED" :
              log.action.includes("BID_ACCEPTED") ? "BID_ACCEPTED" :
              log.action.includes("RECOMMEND") ? "RECOMMEND" :
              "CONFIRM";

            return (
              <div
                key={log.id}
                className={`animate-fade-up ${idx > 5 ? "" : idx === 0 ? "" : idx === 1 ? "delay-1" : idx === 2 ? "delay-2" : "delay-3"}`}
              >
                <GlassCard
                  className="p-4 border border-white/10 hover:border-white/20"
                  rise={false}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="text-3xl flex-shrink-0">
                      {actionIcons[actionType] || "📌"}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Pill
                          tone={
                            actionType === "APPROVE" ? "ok" :
                            actionType === "REJECT" ? "bad" :
                            actionType === "BID_ACCEPTED" ? "ok" :
                            "violet"
                          }
                        >
                          {log.action.replace(/_/g, " ")}
                        </Pill>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
                        <div>
                          <p className="text-violet-400 uppercase tracking-widest">Entity</p>
                          <p className="text-white font-mono truncate">
                            {log.entityId.substring(0, 12)}...
                          </p>
                        </div>
                        <div>
                          <p className="text-violet-400 uppercase tracking-widest">Type</p>
                          <p className="text-white">{log.entityType}</p>
                        </div>
                        <div>
                          <p className="text-violet-400 uppercase tracking-widest">Actor</p>
                          <p className="text-white font-medium">{log.actorName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-violet-300 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("az-AZ", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
