import { prisma } from "@/lib/db";
import { GlassCard, SectionTitle, Pill } from "@/components/ui/kit";
import { CheckCircle, XCircle, Package, Truck, TrendingUp, Sparkles, Repeat2, AlertTriangle } from "lucide-react";

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  APPROVE: CheckCircle,
  REJECT: XCircle,
  RESERVE: Package,
  PICK_UP: Truck,
  BID_PLACED: TrendingUp,
  BID_ACCEPTED: Sparkles,
  RECOMMEND: Repeat2,
  CONFIRM: CheckCircle,
};

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-8 space-y-8">
      <SectionTitle
        kicker="Activity log"
        title="System history"
        className="mb-2"
      />

      {logs.length === 0 ? (
        <GlassCard className="p-12 text-center" rise>
          <p className="text-slate-900 text-lg">No records</p>
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

            const Icon = actionIcons[actionType] || AlertTriangle;

            return (
              <div
                key={log.id}
                className={`animate-fade-up ${idx > 5 ? "" : idx === 0 ? "" : idx === 1 ? "delay-1" : idx === 2 ? "delay-2" : "delay-3"}`}
              >
                <GlassCard
                  className="p-4 border border-slate-200 hover:border-slate-300"
                  rise={false}
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <Icon className="h-6 w-6 text-emerald-700" />
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
                          <p className="text-emerald-700 uppercase tracking-widest font-semibold">Entity ID</p>
                          <p className="text-slate-900 font-mono truncate">
                            {log.entityId.substring(0, 12)}...
                          </p>
                        </div>
                        <div>
                          <p className="text-emerald-700 uppercase tracking-widest font-semibold">Type</p>
                          <p className="text-slate-900">{log.entityType}</p>
                        </div>
                        <div>
                          <p className="text-emerald-700 uppercase tracking-widest font-semibold">Actor</p>
                          <p className="text-slate-900 font-medium">{log.actorName}</p>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-emerald-700 whitespace-nowrap font-medium">
                        {new Date(log.createdAt).toLocaleString("en-US", {
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
