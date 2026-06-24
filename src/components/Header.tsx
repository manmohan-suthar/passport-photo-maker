import React from "react";
import { Camera, Sparkles, Printer, ShieldCheck } from "lucide-react";
import { StepId } from "../types";

interface HeaderProps {
  currentStep: StepId;
  onStepChange: (step: StepId) => void;
  hasImage: boolean;
}

export default function Header({ currentStep, onStepChange, hasImage }: HeaderProps) {
  const navItems = [
    { id: "upload", label: "Editor" },
    { id: "crop", label: "Crop" },
    { id: "background", label: "Enhance" },
    { id: "layout", label: "Layout" }
  ];

  const handleNavClick = (id: StepId) => {
    if (!hasImage && id !== "upload") return;
    onStepChange(id);
  };

  return (
    <header className="h-16 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8 bg-white border-b border-slate-200 shrink-0 shadow-sm" id="app-header">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onStepChange("upload")}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M8 13h2"/>
              <path d="M8 17h2"/>
              <path d="M14 13h2"/>
              <path d="M14 17h2"/>
            </svg>
          </div>
          <span className="font-sans font-bold text-lg tracking-tight text-slate-900">
            Passport<span className="text-blue-600">Photo</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-500">
          {navItems.map((item) => {
            const isActive = currentStep === item.id;
            const isDisabled = !hasImage && item.id !== "upload";

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNavClick(item.id as StepId)}
                disabled={isDisabled}
                className={`transition-all duration-200 font-semibold cursor-pointer ${
                  isActive
                    ? "text-blue-600 border-b-2 border-blue-600 py-1"
                    : isDisabled
                    ? "text-slate-300 cursor-not-allowed opacity-50 font-normal"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* CTA Button / Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-bold uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>ISO Standard Ready</span>
          </div>

          <button
            id="header-cta-start"
            onClick={() => onStepChange(hasImage ? "crop" : "upload")}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition active:scale-[0.98]"
          >
            {hasImage ? "Edit Photo" : "Start Creating"}
          </button>
        </div>
      </div>
    </header>
  );
}
