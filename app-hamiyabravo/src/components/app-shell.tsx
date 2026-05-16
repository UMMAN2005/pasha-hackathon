"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  ShoppingCart,
  ClipboardList,
  Gavel,
  MapPinned,
  LogOut,
  Leaf,
} from "lucide-react";
import { AiChat } from "./ai-chat";
import { AiTicker } from "./ai-ticker";
import { LanguageSelector } from "./language-selector";

interface AppShellProps {
  surface: "admin" | "marketplace";
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
}

export function AppShell({
  surface,
  children,
  userName,
  userRole,
}: AppShellProps) {
  const pathname = usePathname();

  const navItems =
    surface === "admin"
      ? [
          { label: "Overview", icon: LayoutDashboard, href: "/admin" },
          { label: "Risk", icon: AlertTriangle, href: "/admin/inventory" },
          { label: "Branches", icon: MapPinned, href: "/admin/branches" },
          { label: "Auction", icon: Gavel, href: "/admin/listings" },
          { label: "Audit", icon: ClipboardList, href: "/admin/audit" },
        ]
      : [
          { label: "Market", icon: ShoppingCart, href: "/marketplace" },
          {
            label: "My Orders",
            icon: ClipboardList,
            href: "/marketplace/orders",
          },
        ];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="glass-dark relative z-10 flex w-64 flex-col">
        <div className="flex h-20 items-center gap-2 px-6">
          <div className="bg-brand grid h-9 w-9 place-items-center rounded-xl text-white shadow-lg">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-none text-white">
              Hamıya<span className="text-gradient">Bravo</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              AI waste engine
            </p>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const active =
              item.href === "/admin" || item.href === "/marketplace"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  active
                    ? "bg-brand text-white shadow-lg"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          {userName && (
            <div className="mb-2 px-3 py-2">
              <p className="text-sm font-bold text-white">{userName}</p>
              <p className="text-[11px] uppercase tracking-wide text-white/40">
                {userRole}
              </p>
            </div>
          )}
          <Link
            href="/select-user"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Switch role
          </Link>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="glass z-10 flex h-20 items-center justify-between gap-6 px-8">
          <div className="min-w-0 flex-1">
            <AiTicker surface={surface} />
          </div>
          <LanguageSelector />
        </header>

        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>

      {surface === "admin" && <AiChat />}
    </div>
  );
}
