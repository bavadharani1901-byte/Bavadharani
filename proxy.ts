import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isDashboard = nextUrl.pathname.startsWith("/dashboard");
  const isNgoAnalytics = nextUrl.pathname === "/dashboard/ngo";

  if (isDashboard) {
    if (!isLoggedIn || (role !== "GOVERNMENT" && role !== "NGO")) {
      return NextResponse.redirect(new URL("/auth/login", nextUrl));
    }

    if (isNgoAnalytics && role !== "NGO") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
