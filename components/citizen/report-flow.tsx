"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, X } from "lucide-react";

interface ReportFlowProps {
  zones: Array<{ id: string; name: string }>;
}

export default function ReportFlow({ zones }: ReportFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedZone, setSelectedZone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    report_id: string;
    points_earned: number;
    photo_ai_score: number;
    ai_analysis: Record<string, unknown>;
  } | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone,
          photo_url: photoUrl || "/uploads/mock.jpg",
          lat: 10.7769,
          lng: 106.7009,
          description,
        }),
      });
      const data = await res.json();
      setResult(data);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 px-4 py-6 bg-white">
        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-sm ${
                s <= step ? "bg-[#76b900]" : "bg-[#e5e5e5]"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="mb-4 text-2xl font-bold uppercase leading-[1.1] text-[#000000]">
              Select Zone
            </h2>
            <div className="space-y-2">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => {
                    setSelectedZone(z.id);
                    setStep(2);
                  }}
                  className={`flex w-full items-center justify-between border p-3 text-left transition-colors rounded-sm ${
                    selectedZone === z.id
                      ? "border-[#76b900] bg-[#f7f7f7]"
                      : "border-[#e5e5e5] hover:bg-[#f7f7f7]/50"
                  }`}
                >
                  <span className="text-sm text-[#000000]">{z.name}</span>
                  <span className="text-xs text-[#757575]">Select</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-4 text-2xl font-bold uppercase leading-[1.1] text-[#000000]">
              Add Photo
            </h2>
            <div className="mb-4 border-2 border-dashed border-[#cccccc] p-8 text-center rounded-sm">
              <p className="text-sm text-[#757575] mb-2">
                Tap to take a photo or choose from gallery
              </p>
              <input
                type="text"
                placeholder="Or paste a photo URL..."
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full rounded-sm border border-[#cccccc] bg-[#f7f7f7] px-4 py-2 text-sm text-[#000000] outline-none focus:border-[#76b900] focus:ring-1 focus:ring-[#76b900]"
              />
            </div>
            <button
              onClick={() => setStep(3)}
              disabled={!photoUrl}
              className="flex h-11 w-full items-center justify-center rounded-sm bg-[#76b900] text-sm font-bold text-black disabled:opacity-50 transition-all hover:bg-[#5a8d00] active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-4 text-2xl font-bold uppercase leading-[1.1] text-[#000000]">
              Describe
            </h2>
            <textarea
              placeholder="What do you see? (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mb-4 w-full resize-none border border-[#cccccc] bg-[#f7f7f7] p-3 text-sm text-[#000000] outline-none focus:border-[#76b900] focus:ring-1 focus:ring-[#76b900] rounded-sm"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center rounded-sm bg-[#76b900] text-sm font-bold text-black disabled:opacity-50 transition-all hover:bg-[#5a8d00] active:scale-[0.98]"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        )}

        {step === 4 && result && (
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-sm bg-[#3f8500]/10">
              <Check className="h-8 w-8 text-[#3f8500]" />
            </div>
            <h2 className="mb-2 text-2xl font-bold uppercase leading-[1.1] text-[#000000]">
              Submitted!
            </h2>
            <p className="mb-6 text-sm text-[#757575]">
              +{result.points_earned} points earned
            </p>

            {/* AI Score */}
            <div className="mb-4 text-left">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#757575]">
                  AI Confidence
                </span>
                <span className="text-xs font-bold text-[#000000]">
                  {Math.round((result.photo_ai_score ?? 0) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-[#e5e5e5]">
                <div
                  className="h-full bg-[#76b900] transition-all duration-700"
                  style={{ width: `${Math.round((result.photo_ai_score ?? 0) * 100)}%` }}
                />
              </div>
            </div>

            {/* Analysis Results */}
            <div className="mb-6 border border-[#cccccc] bg-[#f7f7f7] text-left rounded-sm">
              <div className="border-b border-[#e5e5e5] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[#757575]">
                  Photo AI Analysis
                </p>
              </div>
              <div className="divide-y divide-[#e5e5e5]">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#000000]">Water scene</span>
                  {(result.ai_analysis as any)?.is_water_scene ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3f8500]">
                      <Check className="h-3.5 w-3.5" />
                      Detected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#e52020]">
                      <X className="h-3.5 w-3.5" />
                      None
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#000000]">Floating trash</span>
                  {(result.ai_analysis as any)?.floating_trash ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ef9100]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Visible
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3f8500]">
                      <Check className="h-3.5 w-3.5" />
                      Clear
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#000000]">Water turbidity</span>
                  {(result.ai_analysis as any)?.turbid_water ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ef9100]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Turbid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3f8500]">
                      <Check className="h-3.5 w-3.5" />
                      Clear
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#000000]">Severity</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-[#000000]">
                    {(result.ai_analysis as any)?.severity_level || "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/citizen"
              className="inline-flex h-11 items-center justify-center rounded-sm bg-[#76b900] px-8 text-sm font-bold text-black hover:bg-[#5a8d00] active:scale-[0.98]"
            >
              Done
            </Link>
          </div>
        )}
    </main>
  );
}
