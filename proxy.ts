import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isNgoAnalytics = nextUrl.pathname === "/dashboard/ngo";

  if (isDashboard) {
    // Block unauthenticated or non-Gov/NGO from all dashboard routes
    if (!isLoggedIn || (role !== "GOVERNMENT" && role !== "NGO")) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }

    // Block non-NGO users from the NGO analytics page
    if (isNgoAnalytics && role !== "NGO") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
