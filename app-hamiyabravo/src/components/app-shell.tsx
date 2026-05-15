"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  AlertTriangle,
  ShoppingCart,
  ClipboardList,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { useState } from "react";

interface AppShellProps {
  surface: "admin" | "marketplace";
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
}

export function AppShell({ surface, children, userName, userRole }: AppShellProps) {
  const [chatOpen, setChatOpen] = useState(false);

  const navItems =
    surface === "admin"
      ? [
          { label: "Baxış", icon: LayoutDashboard, href: "/admin" },
          {
            label: "Risk",
            icon: AlertTriangle,
            href: "/admin/inventory",
          },
          {
            label: "Bazar nəzarəti",
            icon: ShoppingCart,
            href: "/admin/listings",
          },
          {
            label: "Audit",
            icon: ClipboardList,
            href: "/admin/audit",
          },
        ]
      : [
          { label: "Bazar", icon: ShoppingCart, href: "/marketplace" },
          {
            label: "Sifarişlərim",
            icon: ClipboardList,
            href: "/marketplace/orders",
          },
        ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 shadow-sm">
        <div className="h-16 border-b border-slate-200 flex items-center px-6">
          <h1 className="font-bold text-xl text-slate-900">HamıyaBravo</h1>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 w-64 border-t border-slate-200 p-4 space-y-2">
          <Link
            href="/select-user"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Rol dəyişdir</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            {userName && userRole && (
              <div>
                <p className="text-sm font-medium text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500">{userRole}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium">AI köməkçi</span>
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
