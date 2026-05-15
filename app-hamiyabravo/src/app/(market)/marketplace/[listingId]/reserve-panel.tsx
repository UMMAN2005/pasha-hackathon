"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reserveAction } from "@/server/actions/reserve";
import { formatAzn } from "@/lib/money";

interface ReservePanelProps {
  listingId: string;
  price: number;
  qtyAvailable: number;
}

export function ReservePanel({
  listingId,
  price,
  qtyAvailable,
}: ReservePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleReserve = async () => {
    setLoading(true);
    setError(null);
    const result = await reserveAction({ listingId, quantity });
    setLoading(false);
    if (result.ok && result.pickupCode) {
      setPickupCode(result.pickupCode);
    } else {
      setError(result.error || "Xəta baş verdi");
    }
  };

  if (pickupCode) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
        <h2 className="text-lg font-bold text-green-900 mb-2">
          Sifariş qəbul edildi!
        </h2>
        <p className="text-sm text-green-700 mb-4">
          Aşağıdakı kodunuz üçün baxın:
        </p>
        <div
          className="text-4xl font-mono font-bold text-green-900 bg-white p-4 rounded border-2 border-green-300"
          data-testid="pickup-code"
        >
          {pickupCode}
        </div>
        <p className="text-xs text-green-600 mt-4 mb-6">
          Qaldırış zamanı bu kodu göstərin
        </p>
        <button
          onClick={() => router.push("/marketplace/orders")}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Sifariş siyahısına git
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-900">Miqdar</span>
        <input
          type="number"
          min={1}
          max={qtyAvailable}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
        />
      </label>
      <div className="bg-slate-50 p-3 rounded-lg">
        <p className="text-xs text-slate-500">Cəmi qiymət</p>
        <p className="text-xl font-bold text-slate-900">
          {formatAzn(price * quantity)}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleReserve}
        disabled={loading}
        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300"
      >
        {loading ? "Emallanır..." : "Sifariş et"}
      </button>
    </div>
  );
}
