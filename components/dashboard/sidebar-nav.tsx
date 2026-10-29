"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Map,
  FileText,
  Shield,
  BarChart3,
  Bot,
  LogOut,
  Droplets,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/map", label: "Map View", icon: Map },
  { href: "/dashboard/reports", label: "Reports Review", icon: FileText },
  { href: "/dashboard/officer", label: "Officer Mgmt", icon: Shield },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/ai-workflow", label: "AI Workflow", icon: Bot },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "PUBLIC";

  return (
    <div className="flex h-full flex-col bg-[#0a1628]">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#1a2d4a]">
        <Link href="/" className="flex items-center gap-2.5">
          <Droplets className="h-6 w-6 text-[#0d9488]" />
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#0d9488] uppercase">RiverGuard</p>
            <p className="text-[10px] text-white/40 -mt-0.5">AI Monitoring System</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <p className="px-3 pb-2 text-[10px] font-bold tracking-widest text-white/30 uppercase">Navigation</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors mb-0.5",
                isActive
                  ? "bg-[#0f1d32] text-[#0d9488] border-l-2 border-[#0d9488]"
                  : "text-white/60 hover:bg-[#0f1d32] hover:text-white border-l-2 border-transparent"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#1a2d4a] p-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d9488]/20">
            <Shield className="h-4 w-4 text-[#0d9488]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{session?.user?.name || "Officer"}</p>
            <p className="text-[10px] text-white/40">{role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-xs text-white/50 hover:bg-[#0f1d32] hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
        <Link
          href="/citizen"
          className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-[#0d9488]/30 px-3 py-2 text-xs text-[#0d9488] hover:bg-[#0d9488]/10 transition-colors"
        >
          Citizen Portal
        </Link>
      </div>
    </div>
  );
}

export default function SidebarNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 flex-col border-r border-[#1a2d4a]">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-0 left-0 z-50 flex h-12 w-full items-center border-b border-[#1a2d4a] bg-[#0a1628] px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white/70 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="ml-3 flex items-center gap-2">
          <Droplets className="h-5 w-5 text-[#0d9488]" />
          <span className="text-sm font-bold text-[#0d9488]">RIVERGUARD AI</span>
        </Link>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-64 h-full">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
