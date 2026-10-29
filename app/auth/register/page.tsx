"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed");
      return;
    }

    router.push("/auth/login?registered=1");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <Link
        href="/"
        className="mb-6 text-2xl font-bold uppercase leading-none tracking-tight text-[#000000]"
      >
        WAVE
      </Link>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 border border-[#cccccc] p-6 rounded-sm"
      >
        <h1 className="text-2xl font-bold uppercase leading-[0.95] text-[#000000]">
          Register
        </h1>
        {error && (
          <p className="text-sm text-[#e52020]">{error}</p>
        )}
        <input
          type="text"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-sm border border-[#cccccc] bg-[#f7f7f7] px-4 py-2 text-sm text-[#000000] outline-none focus:border-[#76b900] focus:ring-1 focus:ring-[#76b900]"
        />
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
          Create Account
        </button>
        <p className="text-center text-xs text-[#757575]">
          Already have an account?{" "}
          <Link href="/auth/login" className="underline text-[#000000]">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
