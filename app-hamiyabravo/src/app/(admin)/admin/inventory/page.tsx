import Link from "next/link";
import { listBatches } from "@/server/services/inventory";
import { RiskBadge } from "@/components/risk-badge";
import { formatAzn } from "@/lib/money";

export default async function InventoryListPage() {
  const batches = await listBatches({});

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Risk Siyahısı</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                Məhsul
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                Şubə
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                Miqdar
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                Müddət
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                İtki
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                Tövsiyə
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {batches.map((batch) => (
              <tr
                key={batch.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  <Link
                    href={`/admin/inventory/${batch.id}`}
                    className="hover:text-blue-600"
                  >
                    {batch.product}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {batch.sku}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {batch.branch}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {batch.quantity}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {batch.daysToExpiry} gün
                </td>
                <td className="px-6 py-4 text-sm">
                  <RiskBadge score={batch.riskScore} />
                </td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                  {formatAzn(batch.expectedLoss)}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {batch.recommendedAction.substring(0, 40)}...
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
