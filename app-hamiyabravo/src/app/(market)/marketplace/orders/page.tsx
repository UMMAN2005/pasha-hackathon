import { getBuyerOrders } from "@/server/services/market";
import { requireRole } from "@/lib/session";
import { formatAzn } from "@/lib/money";

export default async function OrdersPage() {
  const user = await requireRole("BUSINESS_BUYER", "HQ_ADMIN");

  if (!user.companyId) {
    return <div className="text-center py-8 text-slate-500">Şirkət seçilməyib</div>;
  }

  const orders = await getBuyerOrders(user.companyId);

  const categories = Array.from(
    new Set(orders.map((o) => o.productTitle))
  ).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Sifarişlər
        </h1>

        {orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Hələ sifariş yoxdur
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-2 text-left font-medium text-slate-700">
                    Məhsul
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">
                    Miqdar
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">
                    Cəmi
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">
                    Kod
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">
                    Qaldırış
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {order.productTitle}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{order.quantity}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {formatAzn(order.totalAmount)}
                    </td>
                    <td className="px-4 py-2 font-mono font-semibold text-blue-600">
                      {order.pickupCode}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          order.status === "RESERVED"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {order.status === "RESERVED" ? "Gözləmə" : "Qaldırıldı"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {order.pickupStart.toLocaleDateString("az")} —{" "}
                      {order.pickupEnd.toLocaleDateString("az")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-3">
            Tövsiyə olunan kateqoriyalar
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="inline-block px-3 py-1 text-xs bg-white border border-blue-200 rounded-full text-slate-700"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
