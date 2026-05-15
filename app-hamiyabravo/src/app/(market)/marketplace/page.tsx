import { getPublicListings } from "@/server/services/market";
import { formatAzn } from "@/lib/money";
import Link from "next/link";

export default async function MarketplacePage() {
  const listings = await getPublicListings();

  const totalValue = listings.reduce((sum, l) => sum + l.price * l.qtyAvailable, 0);

  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-200">
        <p className="text-sm text-slate-600 mb-1">Bu gün əlçatan dəyər</p>
        <p className="text-3xl font-bold text-slate-900">
          {formatAzn(totalValue)}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Sifariş et</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/marketplace/${listing.id}`}
              className="block p-4 rounded-lg border border-slate-200 hover:border-blue-400 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900">
                    {listing.publicTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {listing.categoryName} • {listing.branchCity}
                  </p>
                </div>
                {listing.urgent && (
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded">
                    TƏCİLİ
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {formatAzn(listing.price)}
                  </span>
                  <span className="text-sm line-through text-slate-500">
                    {formatAzn(listing.retailStruck)}
                  </span>
                  {listing.discountPercent > 0 && (
                    <span className="text-xs font-semibold text-red-600">
                      −{listing.discountPercent}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  {listing.qtyAvailable} vahid
                </p>
              </div>

              <button className="mt-3 w-full px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Sifariş et
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
