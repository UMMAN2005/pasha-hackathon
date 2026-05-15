import { prisma } from "@/lib/db";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Audit Qeydləri</h1>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Qeyd yoxdur</div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Vaxt
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Fəaliyyət
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Bir Sayda
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Cisimlə
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-700">
                  Aktyor
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs text-slate-600">
                    {log.createdAt.toLocaleString("az")}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-700 font-mono text-xs">
                    {log.entityId.substring(0, 8)}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {log.entityType}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {log.actorName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
