"use client";

import { Suspense } from "react";
import { getSession, signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const getDefaultRedirectByRole = (role?: string) => {
    if (role === "PUBLIC") return "/citizen";
    return "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const callbackUrl = searchParams.get("callbackUrl") || undefined;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (res?.error) {
      setError("Invalid email or password");
      return;
    }

    if (!res?.ok) {
      setError("Unable to sign in. Please try again.");
      return;
    }

    if (callbackUrl) {
      router.push(callbackUrl);
      return;
    }

    const session = await getSession();
    const role = session?.user?.role;
    router.push(getDefaultRedirectByRole(role));
  };

  const registered = searchParams.get("registered") === "1";

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 border border-[#cccccc] p-6 rounded-sm"
    >
      <h1 className="text-2xl font-bold uppercase leading-[0.95] text-[#000000]">
        Sign In
      </h1>
      {registered && (
        <p className="text-sm text-[#3f8500]">
          Account created. Please sign in.
        </p>
      )}
      {error && (
        <p className="text-sm text-[#e52020]">{error}</p>
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-sm border border-[#cccccc] bg-[#f7f7f7] px-4 py-2 text-sm text-[#000000] outline-none focus:border-[#76b900] focus:ring-1 focus:ring-[#76b900]"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-sm border border-[#cccccc] bg-[#f7f7f7] px-4 py-2 text-sm text-[#000000] outline-none focus:border-[#76b900] focus:ring-1 focus:ring-[#76b900]"
        required
      />
      <button
        type="submit"
        className="flex h-11 w-full items-center justify-center rounded-sm bg-[#76b900] text-sm font-bold text-black transition-all hover:bg-[#5a8d00] active:scale-[0.98]"
      >
        Sign In
      </button>
      <p className="text-center text-xs text-[#757575]">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="underline text-[#000000]">
          Register
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <Link
        href="/"
        className="mb-6 text-2xl font-bold uppercase leading-none tracking-tight text-[#000000]"
      >
        RIVERGUARD AI
      </Link>
      <Suspense
        fallback={
          <div className="w-full max-w-sm space-y-4 border border-[#cccccc] p-6 rounded-sm">
            <div className="h-8 w-32 animate-pulse rounded bg-[#e5e5e5]" />
            <div className="h-10 w-full animate-pulse rounded bg-[#e5e5e5]" />
            <div className="h-10 w-full animate-pulse rounded bg-[#e5e5e5]" />
            <div className="h-11 w-full animate-pulse rounded bg-[#e5e5e5]" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
