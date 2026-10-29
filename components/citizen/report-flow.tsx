"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, X } from "lucide-react";

interface ReportFlowProps {
  zones: Array<{ id: string; name: string }>;
}

function getBooleanValue(data: Record<string, unknown>, key: string) {
  return data[key] === true;
}

function getNumberValue(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "number" ? value : 0;
}

function getStringValue(data: Record<string, unknown>, key: string, fallback = "Unknown") {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function getStringListValue(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function ReportFlow({ zones }: ReportFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<{
    report_id: string;
    points_earned: number;
    photo_ai_score: number;
    ai_analysis: Record<string, unknown>;
  } | null>(null);
  const [agentResult, setAgentResult] = useState<Record<string, unknown> | null>(null);
  const [agentError, setAgentError] = useState("");
  const aiAnalysis = result?.ai_analysis ?? {};
  const photoAiScore = result?.photo_ai_score ?? 0;
  const modelConfidence = getNumberValue(aiAnalysis, "confidence");
  const qualityScore = getNumberValue(aiAnalysis, "quality_score");
  const severityScore = getNumberValue(aiAnalysis, "severity_score");
  const qualityIssues = getStringListValue(aiAnalysis, "quality_issues");
  const needsReview = getBooleanValue(aiAnalysis, "needs_review");

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone_id: selectedZone,
          photo_url: photoUrl || "/uploads/mock.jpg",
          lat: 13.0067,
          lng: 80.2206,
          description: `[${selectedCategory || "General"}] ${description}`,
          pollution_type: selectedCategory || "General",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(
          typeof data?.error === "string" ? data.error : "Failed to submit report",
        );
        return;
      }
            setResult(data);

      try {
        const selectedRiver =
          zones.find((zone) => zone.id === selectedZone)?.name ?? "Unknown river";

        const pollutionType = selectedCategory || "general pollution";

        const agentResponse = await fetch("/api/v1/river-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            report_id: data.report_id,
            river_name: selectedRiver,
            pollution_type: pollutionType,
            description,
          }),
        });

        const agentData = await agentResponse.json();

        if (agentResponse.ok) {
          setAgentResult(agentData);
        } else {
          setAgentError("Agent analysis is currently unavailable.");
        }
      } catch {
        setAgentError("Agent analysis is currently unavailable.");
      }

      setStep(4);
    } catch {
      setSubmitError("Failed to submit report");
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
              Pollution Category
            </h2>
            <p className="mb-4 text-sm text-[#757575]">Select the type of pollution you observed</p>
            <div className="space-y-2">
              {["Chemical Waste", "Sewage/Drainage", "Oil Spill", "Plastic/Trash", "Turbidity/Muddy Water", "Other"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setStep(3);
                  }}
                  className={`flex w-full items-center justify-between border p-3 text-left transition-colors rounded-sm ${
                    selectedCategory === cat
                      ? "border-[#76b900] bg-[#f7f7f7]"
                      : "border-[#e5e5e5] hover:bg-[#f7f7f7]/50"
                  }`}
                >
                  <span className="text-sm text-[#000000]">{cat}</span>
                  <span className="text-xs text-[#757575]">Select</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-4 text-2xl font-bold uppercase leading-[1.1] text-[#000000]">
              Report Details
            </h2>
            <div className="mb-4 border-2 border-dashed border-[#cccccc] p-6 text-center rounded-sm">
              <p className="text-sm text-[#757575] mb-2">Add a photo (optional)</p>
              <input
                type="text"
                placeholder="Paste a photo URL..."
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full rounded-sm border border-[#cccccc] bg-[#f7f7f7] px-4 py-2 text-sm text-[#000000] outline-none focus:border-[#76b900] focus:ring-1 focus:ring-[#76b900]"
              />
            </div>
            <textarea
              placeholder="Describe the pollution you observed..."
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
            {submitError && (
              <p className="mt-3 text-sm text-[#e52020]">{submitError}</p>
            )}
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
                         {/* RiverGuard Agent Analysis */}
            <div className="mb-6 rounded-lg border border-[#b7d8d0] bg-[#f0faf7] p-4 text-left">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#14594c]">
                RiverGuard Agent Analysis
              </h3>

              {agentResult ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-[#374151]">Priority</span>
                    <span className="rounded px-3 py-1 text-xs font-bold uppercase text-white bg-[#14594c]">
                      {getStringValue(agentResult, "priority", "Pending")}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase text-[#6b7280]">
                      River
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {getStringValue(agentResult, "river_name", "Unknown river")}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase text-[#6b7280]">
                      Recommended Action
                    </p>
                    <p className="mt-1 text-sm text-[#111827]">
                      {getStringValue(
                        agentResult,
                        "recommended_action",
                        "Awaiting further assessment.",
                      )}
                    </p>
                  </div>

                  <p className="text-xs text-[#6b7280]">
                    Status: {getStringValue(agentResult, "status", "Awaiting review")}
                  </p>
                  <p className="mt-2 text-xs text-[#6b7280]">
                    Demo rule-based assessment. Officer verification is required.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#374151]">
                  {agentError || "Agent analysis is not available for this report."}
                </p>
              )}
            </div>
            <div className="mb-4 text-left">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#757575]">
                  Photo AI Score
                </span>
                <span className="text-xs font-bold text-[#000000]">
                  {formatPercent(photoAiScore)}
                </span>
              </div>
              <div className="h-2 w-full bg-[#e5e5e5]">
                <div
                  className="h-full bg-[#76b900] transition-all duration-700"
                  style={{ width: formatPercent(photoAiScore) }}
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
              <div className="grid grid-cols-3 divide-x divide-[#e5e5e5] border-b border-[#e5e5e5] bg-white">
                <div className="px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#757575]">
                    Model Confidence
                  </p>
                  <p className="mt-1 text-lg font-bold text-[#000000]">
                    {formatPercent(modelConfidence)}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#757575]">
                    Image Quality
                  </p>
                  <p className="mt-1 text-lg font-bold capitalize text-[#000000]">
                    {formatLabel(getStringValue(aiAnalysis, "image_quality"))}
                  </p>
                  <p className="text-xs text-[#757575]">
                    {formatPercent(qualityScore)}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#757575]">
                    Review Status
                  </p>
                  <p
                    className={`mt-1 text-lg font-bold uppercase ${
                      needsReview ? "text-[#ef9100]" : "text-[#3f8500]"
                    }`}
                  >
                    {needsReview ? "Review" : "Accepted"}
                  </p>
                </div>
              </div>
              <div className="divide-y divide-[#e5e5e5]">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#000000]">Water scene</span>
                  {getBooleanValue(aiAnalysis, "is_water_scene") ? (
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
                  {getBooleanValue(aiAnalysis, "floating_trash") ? (
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
                  {getBooleanValue(aiAnalysis, "turbid_water") ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ef9100]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {formatLabel(getStringValue(aiAnalysis, "turbidity_level", "Turbid"))}
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
                    {getStringValue(aiAnalysis, "severity_level")} ({formatPercent(severityScore)})
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#000000]">Water color</span>
                  <span className="text-xs font-bold capitalize tracking-wide text-[#000000]">
                    {formatLabel(getStringValue(aiAnalysis, "water_color"))}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#000000]">Quality issues</span>
                  <span className="max-w-[65%] text-right text-xs font-bold capitalize tracking-wide text-[#000000]">
                    {qualityIssues.length > 0
                      ? qualityIssues.map(formatLabel).join(", ")
                      : "None"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-[#000000]">Model source</span>
                  <span className="max-w-[65%] text-right text-xs font-bold tracking-wide text-[#000000]">
                    {getStringValue(aiAnalysis, "source")}
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
