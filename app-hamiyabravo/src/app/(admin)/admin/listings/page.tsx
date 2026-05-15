"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPickupAction } from "@/server/actions/confirm-pickup";

export default function ListingsPage() {
  const [loading, setLoading] = useState(false);
  const [pickupCode, setPickupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleConfirmPickup = async () => {
    if (!pickupCode.trim()) {
      setError("Qaldırış kodunu daxil edin");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await confirmPickupAction({ pickupCode });

    if (result.ok) {
      setSuccess(`Qaldırış qəbul edildi: ${pickupCode}`);
      setPickupCode("");
      router.refresh();
    } else {
      setError(result.error || "Xəta baş verdi");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Marketplace Nəzarəti
        </h1>

        <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">
            Qaldırışı Təsdiqlə
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Qaldırış kodu (məs: ABC123)"
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md font-mono"
            />
            <button
              onClick={handleConfirmPickup}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-300"
            >
              {loading ? "Emallanır..." : "Təsdiqlə"}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 mt-2">{success}</p>
          )}
        </div>
      </div>

      <div className="text-center py-8 text-slate-500">
        <p>Siyahı yüklənir...</p>
        <p className="text-xs mt-2">
          Gerçek implementasiyada, burada fəal siyahılar və onların sifarişləri göstəriləcək
        </p>
      </div>
    </div>
  );
}
