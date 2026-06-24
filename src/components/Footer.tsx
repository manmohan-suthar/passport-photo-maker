import React from "react";
import { Camera, ShieldCheck, Printer, FileText } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200" id="app-footer">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Camera className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-sans text-sm font-semibold tracking-tight text-slate-900">Passport Photo Maker</span>
              <p className="text-xs text-slate-500">Made for quick, professional passport photo printing.</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-500 font-medium font-sans">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>ICAO Compliance Checker</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-500" />
              <span>Exact A4 Layout Math</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Printer className="h-4 w-4 text-purple-500" />
              <span>300 DPI Print-Ready Output</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 text-xs text-slate-400 font-mono">
          <span>&copy; {new Date().getFullYear()} Passport Photo Maker. All rights reserved.</span>
          <div className="flex gap-4">
            <span>Standard: ISO/IEC 19794-5</span>
            <span>&bull;</span>
            <span>Privacy Secure: Local Image Processing</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
