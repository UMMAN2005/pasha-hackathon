"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPublicListing, PublicListing } from "@/server/services/market";
import { reserveAction } from "@/server/actions/reserve";
import { formatAzn } from "@/lib/money";

interface PageProps {
  params: Promise<{ listingId: string }>;
}

export default function ListingPage({ params }: PageProps) {
  const [listing, setListing] = useState<PublicListing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    params.then(({ listingId }) => {
      setListingId(listingId);
      getPublicListing(listingId).then(setListing);
    });
  }, [params]);

  const handleReserve = async () => {
    if (!listingId) return;
    setLoading(true);
    setError(null);
    const result = await reserveAction({
      listingId,
      quantity,
    });
    setLoading(false);

    if (result.ok && result.pickupCode) {
      setPickupCode(result.pickupCode);
    } else {
      setError(result.error || "Xəta baş verdi");
    }
  };

  if (!listing) {
    return <div className="text-center py-8">Yüklənir...</div>;
  }

  if (pickupCode) {
    return (
      <div className="max-w-md mx-auto py-8 space-y-6">
        <div className="rounded-lg bg-green-50 border border-green-200 p-6 text-center">
          <h2 className="text-lg font-bold text-green-900 mb-2">
            Sifariş qəbul edildi!
          </h2>
          <p className="text-sm text-green-700 mb-4">
            Aşağıdakı kodunuz üçün baxın:
          </p>
          <div className="text-4xl font-mono font-bold text-green-900 bg-white p-4 rounded border-2 border-green-300">
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
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {listing.publicTitle}
        </h1>
        <p className="text-slate-500 mt-1">
          {listing.categoryName} • {listing.branchCity}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500 mb-1">Qiymət (hər vahid)</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatAzn(listing.price)}
          </p>
          {listing.retailStruck > listing.price && (
            <p className="text-sm line-through text-slate-400 mt-1">
              {formatAzn(listing.retailStruck)}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs text-slate-500 mb-1">Mövcud miqdar</p>
          <p className="text-2xl font-bold text-slate-900">
            {listing.qtyAvailable}
          </p>
        </div>
      </div>

      {listing.discountPercent > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>Endirim:</strong> {listing.discountPercent}%
          </p>
        </div>
      )}

      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-xs text-slate-500 mb-2">Qaldırış pəncərəsi</p>
        <p className="text-sm text-slate-900">
          {listing.pickupStart.toLocaleDateString("az")} —{" "}
          {listing.pickupEnd.toLocaleDateString("az")}
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-900">Miqdar</span>
          <input
            type="number"
            min={1}
            max={listing.qtyAvailable}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
          />
        </label>
        <div className="bg-slate-50 p-3 rounded-lg">
          <p className="text-xs text-slate-500">Cəmi qiymət</p>
          <p className="text-xl font-bold text-slate-900">
            {formatAzn(listing.price * quantity)}
          </p>
        </div>
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
