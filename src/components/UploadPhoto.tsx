import React, { useState, useRef } from "react";
import { Upload, AlertCircle, FileImage, ShieldAlert, Sparkles, Check } from "lucide-react";

interface UploadPhotoProps {
  onImageSelected: (dataUrl: string) => void;
  onSampleLoaded: () => void;
}

export default function UploadPhoto({ onImageSelected, onSampleLoaded }: UploadPhotoProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // List of high-quality mock sample portraits for instant testing (using reliable, license-free, human headshots)
  const sampleImages = [
    {
      id: "sample1",
      name: "Sample Portrait",
      gender: "Male",
      url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
      desc: "Perfect lighting, clean features"
    },
    {
      id: "sample2",
      name: "Sample Portrait 2",
      gender: "Female",
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
      desc: "Even lighting, frontal view"
    }
  ];

  const validateAndLoadImage = (file: File) => {
    setError(null);

    // Validate type
    if (!file.type.match("image/(png|jpeg|jpg|webp)")) {
      setError("Please upload a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    // Validate size (max 10MB to avoid freezing)
    if (file.size > 10 * 1024 * 1024) {
      setError("The selected image is too large. Max size allowed is 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setError("Could not read image file.");
        return;
      }

      // Check dimensions (Must be at least 400x400)
      const img = new Image();
      img.onload = () => {
        if (img.width < 400 || img.height < 400) {
          setError(`The uploaded image is too small (${img.width}x${img.height}px). For a clear passport print, please upload an image of at least 400x400 pixels.`);
        } else {
          onImageSelected(dataUrl);
        }
      };
      img.onerror = () => {
        setError("Failed to load image structure. File might be corrupted.");
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setError("An error occurred while reading the file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndLoadImage(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndLoadImage(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Pre-load a selected unsplash image as base64 or fetch it and convert to DataURI
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  const handleSelectSample = async (sampleUrl: string, sampleId: string) => {
    try {
      setLoadingSample(sampleId);
      setError(null);
      
      // Fetch the image and convert to data URI to prevent CORS issues on Canvas
      const response = await fetch(sampleUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onImageSelected(dataUrl);
        setLoadingSample(null);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to load sample image, falling back to direct url: ", err);
      // Fallback
      onImageSelected(sampleUrl);
      setLoadingSample(null);
    }
  };

  return (
    <div className="space-y-6" id="upload-photo-section">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-950">Select Source Photo</h3>
          <p className="text-xs text-slate-500 mt-1">Upload a frontal portrait against a light background for best automatic processing.</p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          id="upload-drag-zone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
            dragActive
              ? "border-blue-600 bg-blue-50/50 scale-[0.99] ring-2 ring-blue-100"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="passport-file-input"
            className="hidden"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleChange}
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-100/50">
            <Upload className="h-6 w-6 stroke-[2]" />
          </div>

          <p className="text-sm font-semibold text-slate-900 text-center">
            Drag and drop your photo here, or <span className="text-blue-600 hover:text-blue-700">browse file</span>
          </p>
          <p className="text-xs text-slate-400 mt-1.5 text-center">Supports JPG, PNG, or WEBP (Max 10MB)</p>
          <p className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-3">Minimum size: 400 x 400 px</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 p-3.5 rounded-xl text-xs text-red-700" id="upload-error-alert">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-normal">{error}</span>
          </div>
        )}

        {/* Demo Samples Section */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>Or use standard demo portraits</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">No photo? Try these!</span>
          </div>
          <div className="grid grid-cols-2 gap-3" id="demo-samples-grid">
            {sampleImages.map((sample) => (
              <button
                key={sample.id}
                id={`btn-load-${sample.id}`}
                disabled={loadingSample !== null}
                onClick={() => handleSelectSample(sample.url, sample.id)}
                className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-150 hover:border-blue-200 bg-slate-50 hover:bg-white text-left transition-all duration-200 group relative overflow-hidden cursor-pointer"
              >
                <div className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0 bg-slate-200">
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {loadingSample === sample.id && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{sample.name}</p>
                  <p className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">{sample.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Guide Card */}
      <div className="bg-slate-100/50 border border-slate-200 rounded-2xl p-5 space-y-4" id="upload-guidelines-box">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">Official Photo Rules</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
            <div>
              <strong className="text-slate-800">Front Facing & Neutral</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">Look straight, mouth closed, neutral expression.</p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
            <div>
              <strong className="text-slate-800">Clear Eyes</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">Do not wear tinted glasses. Eyes must be fully open and visible.</p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
            <div>
              <strong className="text-slate-800">Even Lighting</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">Avoid strong shadows on the face, ears, or background.</p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
            <div>
              <strong className="text-slate-800">Plain Background</strong>
              <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">Background should be a solid light color (white/blue/light grey).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
