import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { getBatchDetail } from "@/server/services/inventory";
import { RiskBadge } from "@/components/risk-badge";
import { formatAzn } from "@/lib/money";
import { BatchDetailClient } from "./client";

interface DetailPageProps {
  params: Promise<{ batchId: string }>;
}

export default async function BatchDetailPage(props: DetailPageProps) {
  const params = await props.params;
  const batch = await getBatchDetail(params.batchId);

  const confidenceWords =
    batch.confidence >= 0.8
      ? "yüksək"
      : batch.confidence >= 0.6
        ? "orta"
        : "aşağı";

  const chartData = batch.salesTrendData.map((qty: number, idx: number) => ({
    day: idx,
    qty,
  }));

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {batch.product}
            </h1>
            <p className="text-slate-600">{batch.branch}</p>
          </div>
          <div className="text-right space-y-2">
            <div className="text-4xl font-bold text-slate-900">
              {batch.quantity}
            </div>
            <p className="text-sm text-slate-600">{batch.daysToExpiry} gün</p>
            <div className="text-sm text-slate-600">
              Vəziyyət:{" "}
              <span className="font-semibold">
                {batch.conditionStatus === "GOOD"
                  ? "Yaxşı"
                  : batch.conditionStatus === "CHECK_REQUIRED"
                    ? "Yoxlanılmalı"
                    : "Təhlükəli"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Sparkline */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Satış Meyli (14 gün)
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis dataKey="day" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Line
              type="monotone"
              dataKey="qty"
              stroke="#2563eb"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-sm text-slate-600 mt-4">
          Orta gündəlik satış: <span className="font-semibold">{batch.avgDailySales}</span>
        </p>
      </div>

      {/* Risk Panel */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Risk</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-slate-600 mb-1">Risk sürətləndirici</p>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-slate-900">
                {batch.riskScore}
              </div>
              <RiskBadge score={batch.riskScore} />
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Gözlənilən əlində</p>
            <p className="text-2xl font-bold text-slate-900">
              {batch.expectedUnsoldQty}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Gözlənilən itki</p>
            <p className="text-2xl font-bold text-red-600">
              {formatAzn(batch.expectedLoss)}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          İnam: <span className="font-semibold">{confidenceWords}</span>
        </p>
      </div>

      {/* Explanation */}
      {batch.recommendation && (
        <BatchDetailClient
          batchId={params.batchId}
          recommendation={batch.recommendation}
          product={batch.product}
          quantity={batch.quantity}
          daysToExpiry={batch.daysToExpiry}
          riskScore={batch.riskScore}
          expectedLoss={batch.expectedLoss}
        />
      )}

      {/* Action History */}
      {batch.auditLogs.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Fəaliyyət Tarixçəsi
          </h2>
          <div className="space-y-3">
            {batch.auditLogs.map((log: any) => (
              <div
                key={log.id}
                className="flex items-start justify-between border-b border-slate-100 pb-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{log.action}</p>
                  <p className="text-xs text-slate-500">{log.actorName}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString("az-AZ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
