import React from "react";
import { Upload, Crop, Sparkles, FileText, Check } from "lucide-react";
import { STEPS, StepId } from "../types";

interface StepProgressProps {
  currentStep: StepId;
  onStepChange: (stepId: StepId) => void;
  hasImage: boolean;
}

export default function StepProgress({ currentStep, onStepChange, hasImage }: StepProgressProps) {
  const stepIcons = {
    upload: Upload,
    crop: Crop,
    background: Sparkles,
    layout: FileText
  };

  const getStepIndex = (stepId: StepId) => STEPS.findIndex((s) => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full bg-white border-b border-slate-200 py-4 px-4 sm:px-8 shrink-0" id="step-progress-container">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-center justify-between">
          {/* Background Connecting Line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 -z-10" />

          {/* Active Connecting Line Overlay */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-500 ease-out -z-10"
            style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
          />

          {STEPS.map((step, idx) => {
            const Icon = stepIcons[step.id];
            const isCompleted = idx < currentIndex;
            const isActive = step.id === currentStep;
            const isDisabled = !hasImage && step.id !== "upload";

            return (
              <button
                key={step.id}
                id={`step-indicator-${step.id}`}
                onClick={() => !isDisabled && onStepChange(step.id)}
                disabled={isDisabled}
                className="flex flex-col items-center group relative outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg cursor-pointer"
              >
                {/* Step Circle */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-blue-600 border-blue-600 text-white shadow-md"
                      : isActive
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm ring-4 ring-blue-50"
                      : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-400 group-hover:text-slate-600"
                  } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[2.5]" /> : <Icon className="h-3.5 w-3.5" />}
                </div>

                {/* Step Label (Hidden on small mobile screen, visible above) */}
                <span
                  className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 hidden sm:block ${
                    isActive ? "text-blue-600" : isCompleted ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>

                {/* Hover Tooltip for Mobile Screens */}
                <span className="absolute -bottom-8 scale-0 group-hover:scale-100 transition-transform duration-150 bg-slate-900 text-white text-[10px] py-1 px-2 rounded font-medium whitespace-nowrap z-50 sm:hidden">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
