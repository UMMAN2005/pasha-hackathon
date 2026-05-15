import { getPublicListing } from "@/server/services/market";
import { formatAzn } from "@/lib/money";
import { ReservePanel } from "./reserve-panel";

interface PageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingPage({ params }: PageProps) {
  const { listingId } = await params;
  const listing = await getPublicListing(listingId);

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

      <ReservePanel
        listingId={listingId}
        price={listing.price}
        qtyAvailable={listing.qtyAvailable}
      />
    </div>
  );
}
