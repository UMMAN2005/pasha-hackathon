"use client";

import { Download, Printer } from "lucide-react";
import type { ImpactResult } from "@/domain/sustainability";

interface ExportData {
  moneyRecoveredToday: number;
  totalRecovered: number;
  openRecommendations: number;
  recoveryImpact: ImpactResult;
  atRiskCount: number;
}

export function ExportButtons({ data }: { data: ExportData }) {
  const handleExcelExport = () => {
    const html = `
      <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #f0f0f0;">
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Recovered Today</td>
          <td>₼${(data.moneyRecoveredToday / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Total Recovered</td>
          <td>₼${(data.totalRecovered / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td>AI Queue Items</td>
          <td>${data.openRecommendations}</td>
        </tr>
        <tr>
          <td>At Risk Count</td>
          <td>${data.atRiskCount}</td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td colspan="2"><strong>Environmental Impact (Today)</strong></td>
        </tr>
        <tr>
          <td>CO2e Avoided (kg)</td>
          <td>${data.recoveryImpact.co2eAvoided.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Kg Saved</td>
          <td>${data.recoveryImpact.kgSaved.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Meals Saved</td>
          <td>${data.recoveryImpact.mealsSaved}</td>
        </tr>
      </table>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hamiyabravo-dashboard-${new Date().toISOString().split("T")[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePdfExport = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExcelExport}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/20 transition-all text-sm font-semibold"
        title="Export as Excel"
      >
        <Download className="h-4 w-4" />
        Excel
      </button>
      <button
        onClick={handlePdfExport}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-400/30 text-blue-300 hover:bg-blue-500/20 transition-all text-sm font-semibold"
        title="Print / Save as PDF"
      >
        <Printer className="h-4 w-4" />
        PDF
      </button>
    </div>
  );
}
