import React, { useState, useEffect } from "react";
import { ShieldCheck, AlertCircle, Sparkles, Check, X, RefreshCw } from "lucide-react";
import { ComplianceReport } from "../types";

interface ComplianceCheckerProps {
  imageSrc: string;
}

export default function ComplianceChecker({ imageSrc }: ComplianceCheckerProps) {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const performAudit = async () => {
    if (!imageSrc) return;
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/check-compliance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageSrc }),
      });

      if (!response.ok) {
        throw new Error("Failed to communicate with compliance checker service.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setReport(data);
    } catch (err: any) {
      console.error("Compliance audit error:", err);
      setError(err?.message || "An error occurred during compliance checking.");
    } finally {
      setLoading(false);
    }
  };

  // Re-run audit when image source changes (e.g. after fresh upload or fresh crop)
  useEffect(() => {
    performAudit();
  }, [imageSrc]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4" id="compliance-checker-card">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">AI Studio Inspector</h3>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">ICAO Passport Compliance Audit</h4>
          </div>
        </div>
        <button
          id="btn-re-audit"
          disabled={loading}
          onClick={performAudit}
          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
          title="Re-run Compliance Audit"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {loading && (
        <div className="py-6 flex flex-col items-center justify-center space-y-3" id="audit-loading-state">
          <div className="relative flex items-center justify-center">
            <div className="h-10 w-10 border-2 border-blue-50 border-t-blue-600 rounded-full animate-spin" />
            <Sparkles className="absolute h-4 w-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-slate-900">Auditing photo compliance...</p>
            <p className="text-[10px] text-slate-400 font-mono">Analyzing background, framing, expression & eyes</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-1.5" id="audit-error-state">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Inspection Service Unreachable</span>
          </div>
          <p className="text-[11px] text-red-600 leading-normal">
            We couldn't reach the AI verification server. The system is operating in high-quality manual mode. You can still crop, remove backgrounds, and arrange layouts perfectly.
          </p>
        </div>
      )}

      {report && !loading && !error && (
        <div className="space-y-4" id="audit-success-report">
          {/* Compatibility score ring */}
          <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="relative h-14 w-14 shrink-0 flex items-center justify-center bg-white rounded-full border-2 border-slate-100 shadow-sm">
              <span className={`text-sm font-black font-mono ${report.score >= 80 ? "text-emerald-600" : report.score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                {report.score}%
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Audit Score</span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {report.compliesOverall ? "✓ Approved Passport Photo" : "⚠ Alignment Optimization Recommended"}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">{report.recommendation}</p>
            </div>
          </div>

          {/* Compliance Checklist factors */}
          <div className="space-y-2.5 text-xs" id="audit-factor-checklist">
            {[
              { label: "Neutral Plain Background", factor: report.neutralBackground },
              { label: "Head Centered & Straight", factor: report.headCentered },
              { label: "Eyes Open & Clear", factor: report.eyesOpenAndVisible },
              { label: "Even Face Lighting", factor: report.appropriateLighting },
              { label: "Neutral Expression", factor: report.neutralExpression },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                {item.factor.status ? (
                  <span className="h-5 w-5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                ) : (
                  <span className="h-5 w-5 bg-amber-50 border border-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <X className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                )}
                <div>
                  <span className="font-bold text-slate-800 block leading-tight">{item.label}</span>
                  <span className="text-[11px] text-slate-500 leading-normal mt-0.5 block">{item.factor.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
