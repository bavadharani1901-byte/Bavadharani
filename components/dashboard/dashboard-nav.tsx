"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, User } from "lucide-react";

interface DashboardNavProps {
  role: "government" | "ngo";
  loading?: boolean;
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`relative px-1 py-4 text-sm font-bold transition-colors ${
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#76b900]" />
      )}
    </Link>
  );
}

export default function DashboardNav({ role, loading }: DashboardNavProps) {
  return (
    <nav className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="text-xl font-bold uppercase leading-none tracking-tight"
        >
          RIVERGUARD AI
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <div className="hidden items-center gap-1 md:flex">
          <NavLink href="/dashboard">Dashboard</NavLink>
          {role === "government" && <NavLink href="/dashboard/reports">Reports Review</NavLink>}
          {role === "ngo" && <NavLink href="/dashboard/ngo">Analytics</NavLink>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {loading ? (
          <span className="hidden h-4 w-20 animate-pulse rounded bg-muted md:inline" />
        ) : (
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <User className="h-3.5 w-3.5" />
            {role === "government" ? "Government" : "NGO"}
          </span>
        )}
        <Separator orientation="vertical" className="mx-1 hidden h-6 md:block" />
        <Button variant="outline" size="sm" asChild className="h-8 text-xs">
          <Link href="/citizen">Citizen</Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="h-8 gap-1.5 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </nav>
  );
}

