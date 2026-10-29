"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, Home, Trophy, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/citizen", label: "Home", icon: Home },
  { href: "/citizen/report", label: "Report", icon: Camera },
  { href: "/citizen/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/citizen/rewards", label: "Rewards", icon: Gift },
];

export default function CitizenNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-[#cccccc] bg-white px-4">
        <Link
          href="/"
          className="text-lg font-bold uppercase leading-none tracking-tight text-[#000000]"
        >
          RIVERGUARD
        </Link>
        <span className="hidden text-xs text-[#757575] sm:inline">
          {session?.user?.name || "Citizen"}
        </span>
      </header>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e5e5e5] bg-white">
        <div className="flex h-14">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                  isActive
                    ? "text-[#000000]"
                    : "text-[#757575] hover:text-[#000000]",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-[#76b900]" : "text-[#757575]",
                  )}
                />
                {item.label}
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-8 bg-[#76b900]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
