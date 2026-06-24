import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, Info, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PhotoSizePreset, SIZE_PRESETS } from "../types";

interface CropEditorProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string, preset: PhotoSizePreset) => void;
  onReset: () => void;
}

// Helper to create image objects
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // avoid CORS issues
    image.src = url;
  });

// Helper to translate degrees to radians
function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the cropped image base64 data URL
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  adjustments = { brightness: 100, contrast: 100, saturation: 100 }
): Promise<string> {
  const maxExportSide = 1800;
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of rotated image
  const { width: bWidth, height: bHeight } = {
    width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
    height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
  };

  // set canvas size to match the bounding box
  canvas.width = bWidth;
  canvas.height = bHeight;

  // translate to center of canvas and rotate
  ctx.translate(bWidth / 2, bHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;

  // draw original image
  ctx.drawImage(image, 0, 0);
  ctx.filter = "none";

  // extract the cropped region
  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("No 2d context for cropped canvas");
  }

  const exportScale = Math.min(1, maxExportSide / Math.max(pixelCrop.width, pixelCrop.height));
  const exportWidth = Math.max(1, Math.round(pixelCrop.width * exportScale));
  const exportHeight = Math.max(1, Math.round(pixelCrop.height * exportScale));

  // Set cropped canvas sizes to a bounded, print-safe export size.
  croppedCanvas.width = exportWidth;
  croppedCanvas.height = exportHeight;

  // Draw the cropped image onto the new canvas
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    exportWidth,
    exportHeight
  );

  // Return base64 URL
  return croppedCanvas.toDataURL("image/jpeg", 0.9);
}

export default function CropEditor({ imageSrc, onCropComplete, onReset }: CropEditorProps) {
  const [selectedPreset, setSelectedPreset] = useState<PhotoSizePreset>(SIZE_PRESETS[0]);
  const [customWidth, setCustomWidth] = useState<number>(40);
  const [customHeight, setCustomHeight] = useState<number>(40);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);

  // Cropper states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [cropping, setCropping] = useState(false);

  // Calculate aspect ratio
  const getAspect = () => {
    if (selectedPreset.id === "custom") {
      return customWidth / customHeight;
    }
    return selectedPreset.widthMm / selectedPreset.heightMm;
  };

  const onCropCompleteCallback = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleApplyCrop = async () => {
    if (!croppedAreaPixels) return;
    try {
      setCropping(true);
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, {
        brightness,
        contrast,
        saturation,
      });
      
      const finalPreset = selectedPreset.id === "custom" 
        ? { ...selectedPreset, widthMm: customWidth, heightMm: customHeight }
        : selectedPreset;

      onCropComplete(croppedImage, finalPreset);
    } catch (e) {
      console.error("Cropping failed:", e);
      alert("Failed to crop the image. Please try again.");
    } finally {
      setCropping(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleResetEdits = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const previewFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  const photoEditControls = (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 h-full" id="photo-edit-controls">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
          <span>Photo Edit Controls</span>
        </span>
        <button
          id="btn-reset-photo-edits"
          onClick={handleResetEdits}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Reset Edits</span>
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Brightness</span>
          <span className="font-mono text-slate-500 font-medium">{brightness}%</span>
        </div>
        <input
          type="range"
          id="photo-brightness-slider"
          min="60"
          max="140"
          step="1"
          value={brightness}
          onChange={(e) => setBrightness(parseInt(e.target.value))}
          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Contrast</span>
          <span className="font-mono text-slate-500 font-medium">{contrast}%</span>
        </div>
        <input
          type="range"
          id="photo-contrast-slider"
          min="70"
          max="140"
          step="1"
          value={contrast}
          onChange={(e) => setContrast(parseInt(e.target.value))}
          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Saturation</span>
          <span className="font-mono text-slate-500 font-medium">{saturation}%</span>
        </div>
        <input
          type="range"
          id="photo-saturation-slider"
          min="60"
          max="140"
          step="1"
          value={saturation}
          onChange={(e) => setSaturation(parseInt(e.target.value))}
          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6" id="crop-editor-section">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-950">Crop and Align Photo</h3>
            <p className="text-xs text-slate-500 mt-0.5">Align your head & shoulders within standard guidelines.</p>
          </div>
          <button
            id="btn-crop-reset-all"
            onClick={onReset}
            className="self-start sm:self-center text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-red-100 transition-all duration-150 cursor-pointer"
          >
            Change Photo
          </button>
        </div>

        {/* Preset Selector */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-700">Choose Document Size</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="size-preset-selector-grid">
            {SIZE_PRESETS.map((preset) => {
              const isSelected = selectedPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  id={`preset-${preset.id}`}
                  onClick={() => setSelectedPreset(preset)}
                  className={`p-3 text-left rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/20 shadow-sm"
                      : "border-slate-150 hover:border-slate-300 bg-slate-50/50 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? "text-blue-600" : "text-slate-900"}`}>
                      {preset.name}
                    </span>
                    {isSelected && (
                      <span className="h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal mt-1">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom dimensions inputs if custom selected */}
        {selectedPreset.id === "custom" && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl" id="custom-size-inputs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Width (mm)</label>
              <input
                type="number"
                id="custom-width-input"
                min="10"
                max="200"
                value={customWidth}
                onChange={(e) => setCustomWidth(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Height (mm)</label>
              <input
                type="number"
                id="custom-height-input"
                min="10"
                max="200"
                value={customHeight}
                onChange={(e) => setCustomHeight(Math.max(10, parseInt(e.target.value) || 0))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch" id="crop-preview-edit-grid">
          {/* Cropping Canvas Stage */}
          <div className="relative h-80 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 xl:col-span-8" id="cropper-stage-container">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={getAspect()}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropCompleteCallback}
              showGrid={false}
              style={{
                mediaStyle: {
                  filter: previewFilter,
                },
              }}
            />

            {/* Guidelines Overlay (Passport Standard guides: Head oval & Shoulder guides) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Draw guideline circles using SVG so they scale responsively in the center of the crop frame */}
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Central Oval for Face Guide */}
                <ellipse
                  cx="50"
                  cy="44"
                  rx="18"
                  ry="24"
                  fill="none"
                  stroke="rgba(59, 130, 246, 0.55)"
                  strokeWidth="0.8"
                  strokeDasharray="2 1"
                />
                <line x1="50" y1="20" x2="50" y2="80" stroke="rgba(59, 130, 246, 0.25)" strokeWidth="0.5" strokeDasharray="1 1" />
                <line x1="20" y1="44" x2="80" y2="44" stroke="rgba(59, 130, 246, 0.25)" strokeWidth="0.5" strokeDasharray="1 1" />

                {/* Shoulder Guides */}
                <path
                  d="M 22,82 Q 35,68 50,68 Q 65,68 78,82"
                  fill="none"
                  stroke="rgba(59, 130, 246, 0.45)"
                  strokeWidth="0.8"
                  strokeDasharray="2 1"
                />

                {/* Text guides */}
                <text x="50" y="16" fill="rgba(255, 255, 255, 0.75)" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  TOP OF HEAD GUIDE
                </text>
                <text x="50" y="64" fill="rgba(255, 255, 255, 0.75)" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  BOTTOM OF CHIN
                </text>
              </svg>
            </div>

            {/* Compass indicators / instruction overlay */}
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] text-white flex items-center gap-1">
              <Info className="h-3 w-3 text-blue-400 shrink-0" />
              <span>Align head within the blue oval</span>
            </div>
          </div>

          <div className="xl:col-span-4">
            {photoEditControls}
          </div>
        </div>

        {/* Adjusting Slider Tools */}
        <div className="space-y-4" id="cropper-controls-box">
          {/* Zoom controls */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <ZoomIn className="h-3.5 w-3.5 text-slate-500" />
                <span>Zoom Photo</span>
              </span>
              <span className="font-mono text-slate-500 font-medium">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="btn-zoom-out"
                onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <input
                type="range"
                id="crop-zoom-slider"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                id="btn-zoom-in"
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Rotation controls */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <RotateCw className="h-3.5 w-3.5 text-slate-500" />
                <span>Rotate Alignment</span>
              </span>
              <span className="font-mono text-slate-500 font-medium">{rotation}°</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="btn-rotate-counter"
                onClick={() => setRotation(((rotation - 90 + 180) % 360) - 180)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition text-[11px] font-bold cursor-pointer"
              >
                -90°
              </button>
              <input
                type="range"
                id="crop-rotate-slider"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                id="btn-rotate-clockwise"
                onClick={() => setRotation(((rotation + 90 + 180) % 360) - 180)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition text-[11px] font-bold cursor-pointer"
              >
                +90°
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex gap-3 pt-2">
            <button
              id="btn-crop-reset"
              onClick={handleReset}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all duration-200 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reset Crop</span>
            </button>
            <button
              id="btn-crop-apply"
              disabled={cropping}
              onClick={handleApplyCrop}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl border border-transparent shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              {cropping ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="h-4 w-4 stroke-[2.5]" />
              )}
              <span>Apply & Proceed</span>
            </button>
          </div>
        </div>
      </div>

      {/* standard compliance tips card */}
      <div className="bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-4 flex gap-3 text-xs text-emerald-800" id="crop-compliance-notion">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Important Passport Spec</strong>
          <p className="text-emerald-700/90 leading-relaxed mt-0.5">
            The face must cover roughly 70% to 80% of the photograph height. Scale the image using the zoom slider so the crown (top) of your head and your chin align precisely with the blue guidelines.
          </p>
        </div>
      </div>
    </div>
  );
}
