"use client";

// Redirect NGO analytics to the unified analytics page
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NgoPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/analytics");
  }, [router]);
  return (
    <div className="flex h-screen items-center justify-center bg-[#0a1628]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0d9488] border-t-transparent" />
    </div>
  );
}
