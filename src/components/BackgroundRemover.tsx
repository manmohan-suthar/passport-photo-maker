import React, { useState, useEffect, useRef, useCallback } from "react";
import { Wand, Sparkles, Paintbrush, Eraser, Eye, RefreshCw, Check, AlertCircle, Info } from "lucide-react";

interface BackgroundRemoverProps {
  imageSrc: string; // The cropped base64 image
  onComplete: (processedImage: string, backgroundColor: string) => void;
  onBack: () => void;
}

export default function BackgroundRemover({ imageSrc, onComplete, onBack }: BackgroundRemoverProps) {
  const [bgColor, setBgColor] = useState<string>("#ffffff"); // Default standard white background
  const [tolerance, setTolerance] = useState<number>(35); // Tolerance for color removal
  const [feather, setFeather] = useState<number>(3); // Edge smoothing feather radius
  const [isWandMode, setIsWandMode] = useState<boolean>(true); // True = Magic Wand click to erase color, False = manual brush
  const [brushMode, setBrushMode] = useState<"erase" | "restore">("erase");
  const [brushSize, setBrushSize] = useState<number>(15);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isUsingAiModel, setIsUsingAiModel] = useState<boolean>(true);
  const [lastClickPos, setLastClickPos] = useState<{ x: number, y: number } | null>(null);
  
  // Custom Color Selection
  const [customColor, setCustomColor] = useState<string>("#e0f2fe");

  // References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null); // Offscreen canvas to store manual & automatic transparency masks

  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-set background colors
  const presetColors = [
    { id: "white", name: "White", hex: "#ffffff", desc: "US / Europe standard" },
    { id: "blue", name: "Light Blue", hex: "#a6c8ff", desc: "India / Asian passport standard" },
    { id: "grey", name: "Grey", hex: "#e5e7eb", desc: "Alternative passport standard" },
  ];

  // Initialize canvases
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;

      // Create offscreen mask canvas
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      
      const mCtx = maskCanvas.getContext("2d");
      if (mCtx) {
        // Initialize mask canvas to fully opaque (255, 255, 255, 255)
        mCtx.fillStyle = "#ffffff";
        mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
      maskCanvasRef.current = maskCanvas;

      // Perform initial automatic background removal
      autoDetectAndRemove();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Main Canvas Rendering Loop
  const drawMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !img || !maskCanvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match image size
    canvas.width = img.width;
    canvas.height = img.height;

    // Clear main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showOriginal) {
      // Just draw the original image
      ctx.drawImage(img, 0, 0);
      return;
    }

    // 1. Draw target background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Blend original image with mask canvas to create transparent cutout
    // We create a temporary canvas to generate the blended cutout
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext("2d");

    if (tempCtx) {
      // Draw original image on temp canvas
      tempCtx.drawImage(img, 0, 0);

      // Grab image pixels
      const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Grab mask pixels
      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        
        // Update alpha channel based on mask canvas green or brightness channel
        // Opaque is white (255), transparent is black (0)
        for (let i = 0; i < imgData.data.length; i += 4) {
          const maskVal = maskData.data[i]; // Read red channel
          imgData.data[i + 3] = maskVal; // Set image alpha to match mask
        }

        // Apply feather / edge smoothing to alpha channel if feather is set
        if (feather > 0) {
          applyFeatherFilter(imgData, tempCanvas.width, tempCanvas.height, feather);
        }

        // Write pixels back to temp canvas
        tempCtx.putImageData(imgData, 0, 0);
      }
    }

    // 3. Draw cutout on top of background color
    ctx.drawImage(tempCanvas, 0, 0);
  }, [bgColor, showOriginal, feather]);

  // Redraw whenever parameters or states change
  useEffect(() => {
    drawMainCanvas();
  }, [bgColor, showOriginal, hasProcessed, drawMainCanvas]);

  // Apply subtle box-blur to alpha channel for smooth feather edges
  const applyFeatherFilter = (imgData: ImageData, width: number, height: number, radius: number) => {
    const data = imgData.data;
    const length = data.length;
    const alphaCopy = new Uint8Array(width * height);
    
    // Copy original alpha
    for (let i = 0; i < length; i += 4) {
      alphaCopy[i / 4] = data[i + 3];
    }

    // Simple box-blur of alpha channel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          const py = y + ky;
          if (py < 0 || py >= height) continue;

          for (let kx = -radius; kx <= radius; kx++) {
            const px = x + kx;
            if (px < 0 || px >= width) continue;

            sum += alphaCopy[py * width + px];
            count++;
          }
        }

        data[(y * width + x) * 4 + 3] = Math.round(sum / count);
      }
    }
  };

  // High-precision local corner thresholding fallback (100% offline, runs instantly)
  const runLocalFallback = useCallback(() => {
    const img = originalImageRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !maskCanvas) return;

    setIsRemoving(true);
    setProgressMessage("Using instant local corner detector...");
    setIsUsingAiModel(false);

    try {
      const mCtx = maskCanvas.getContext("2d");
      if (!mCtx) return;

      mCtx.fillStyle = "#ffffff";
      mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;

      tempCtx.drawImage(img, 0, 0);
      const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const maskData = mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

      const corners = [
        getPixelColor(imgData, 5, 5),
        getPixelColor(imgData, img.width - 5, 5),
        getPixelColor(imgData, 5, img.height - 5),
        getPixelColor(imgData, img.width - 5, img.height - 5)
      ];

      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const pixelIdx = (y * img.width + x) * 4;
          const r = imgData.data[pixelIdx];
          const g = imgData.data[pixelIdx + 1];
          const b = imgData.data[pixelIdx + 2];

          let minDistance = 500;
          for (const corner of corners) {
            const dist = Math.sqrt(
              Math.pow(r - corner.r, 2) +
              Math.pow(g - corner.g, 2) +
              Math.pow(b - corner.b, 2)
            );
            if (dist < minDistance) {
              minDistance = dist;
            }
          }

          if (minDistance < tolerance) {
            maskData.data[pixelIdx] = 0;
            maskData.data[pixelIdx + 1] = 0;
            maskData.data[pixelIdx + 2] = 0;
            maskData.data[pixelIdx + 3] = 255;
          } else {
            maskData.data[pixelIdx] = 255;
            maskData.data[pixelIdx + 1] = 255;
            maskData.data[pixelIdx + 2] = 255;
            maskData.data[pixelIdx + 3] = 255;
          }
        }
      }
      mCtx.putImageData(maskData, 0, 0);
      setHasProcessed(true);
      drawMainCanvas();
    } catch (fallbackErr) {
      console.error("Fallback failed:", fallbackErr);
      setErrorMessage("Background extraction failed. Please use manual brush tools.");
    } finally {
      setIsRemoving(false);
    }
  }, [imageSrc, tolerance, drawMainCanvas]);

  // Automatic background remover using the server-side ClearBackdrop proxy.
  const autoDetectAndRemove = async () => {
    const img = originalImageRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !maskCanvas) return;

    setIsRemoving(true);
    setErrorMessage(null);
    setProgressMessage("Removing background with ClearBackdrop...");
    setIsUsingAiModel(true);

    try {
      const response = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.details || errorData?.error || "ClearBackdrop request failed");
      }

      const result = await response.json();
      if (!result.image) {
        throw new Error("ClearBackdrop did not return a processed image.");
      }

      setProgressMessage(result.cached ? "Using cached background cutout..." : "Building editable background mask...");
      const outputImg = new Image();
      outputImg.onload = () => {
        const mCtx = maskCanvas.getContext("2d");
        if (mCtx) {
          // Clear and size mask
          mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
          
          // Draw the transparent output image onto a temp canvas to read alpha channel
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = maskCanvas.width;
          tempCanvas.height = maskCanvas.height;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(outputImg, 0, 0, maskCanvas.width, maskCanvas.height);
            const tempData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            
            const maskData = mCtx.createImageData(maskCanvas.width, maskCanvas.height);
            for (let i = 0; i < tempData.data.length; i += 4) {
              const alpha = tempData.data[i + 3];
              // Write alpha to RGB channels of mask (since we read R/G/B channel as alpha in drawMainCanvas)
              maskData.data[i] = alpha;
              maskData.data[i + 1] = alpha;
              maskData.data[i + 2] = alpha;
              maskData.data[i + 3] = 255; // Keep mask canvas fully opaque
            }
            mCtx.putImageData(maskData, 0, 0);
          }
        }
        
        setHasProcessed(true);
        drawMainCanvas();
        setIsRemoving(false);
      };
      outputImg.onerror = () => {
        setErrorMessage("Background was removed, but the processed image could not be loaded.");
        setIsUsingAiModel(false);
        runLocalFallback();
      };
      outputImg.src = result.image;

    } catch (err: any) {
      console.warn("ClearBackdrop background removal failed, falling back to local threshold detector:", err);
      setErrorMessage("ClearBackdrop could not remove this background right now. Using the local remover instead.");
      setIsUsingAiModel(false);
      runLocalFallback();
    }
  };

  const getPixelColor = (imgData: ImageData, x: number, y: number) => {
    const idx = (y * imgData.width + x) * 4;
    return {
      r: imgData.data[idx],
      g: imgData.data[idx + 1],
      b: imgData.data[idx + 2],
      a: imgData.data[idx + 3]
    };
  };

  // Re-apply magic wand mask
  const applyMagicWand = useCallback((clickX: number, clickY: number, currentTolerance: number) => {
    const img = originalImageRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !maskCanvas) return;

    // Create a temporary canvas to get the clicked pixel's original color
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    tempCtx.drawImage(img, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const clickColor = getPixelColor(imgData, clickX, clickY);

    const mCtx = maskCanvas.getContext("2d");
    if (!mCtx) return;
    const maskData = mCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    // Mask all colors matching the selected pixel's color in the whole image
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const pixelIdx = (y * img.width + x) * 4;
        const r = imgData.data[pixelIdx];
        const g = imgData.data[pixelIdx + 1];
        const b = imgData.data[pixelIdx + 2];

        const dist = Math.sqrt(
          Math.pow(r - clickColor.r, 2) +
          Math.pow(g - clickColor.g, 2) +
          Math.pow(b - clickColor.b, 2)
        );

        if (dist < currentTolerance) {
          maskData.data[pixelIdx] = 0;     // Transparent in mask (0)
          maskData.data[pixelIdx + 1] = 0;
          maskData.data[pixelIdx + 2] = 0;
        } else {
          maskData.data[pixelIdx] = 255;   // Opaque
          maskData.data[pixelIdx + 1] = 255;
          maskData.data[pixelIdx + 2] = 255;
        }
      }
    }

    mCtx.putImageData(maskData, 0, 0);
    drawMainCanvas();
  }, [drawMainCanvas]);

  // Automatically re-apply wand or local fallback when tolerance changes
  useEffect(() => {
    if (!hasProcessed) return;

    if (isWandMode && lastClickPos) {
      applyMagicWand(lastClickPos.x, lastClickPos.y, tolerance);
    } else if (!isUsingAiModel) {
      runLocalFallback();
    }
  }, [tolerance, isWandMode, lastClickPos, isUsingAiModel, applyMagicWand, runLocalFallback, hasProcessed]);

  // Magic Wand Tool: Click on canvas to remove clicked color range
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isWandMode) return; // Only process clicks in Magic Wand mode
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !img || !maskCanvas) return;

    const rect = canvas.getBoundingClientRect();
    // Translate click client coordinates to actual canvas pixels
    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);

    // Save click position and switch to local manual mode for live updates
    setLastClickPos({ x: clickX, y: clickY });
    setIsUsingAiModel(false);

    applyMagicWand(clickX, clickY, tolerance);
  };

  // Manual brush painting/erasing logic on mask canvas
  const [isDrawing, setIsDrawing] = useState(false);

  const handleBrushStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isWandMode) return; // Do nothing in Wand mode
    setIsDrawing(true);
    handleBrushMove(e);
  };

  const handleBrushMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!isDrawing || isWandMode || !canvas || !maskCanvas) return;

    const mCtx = maskCanvas.getContext("2d");
    if (!mCtx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    mCtx.beginPath();
    mCtx.arc(x, y, brushSize, 0, Math.PI * 2);
    // Erase brush sets mask to transparent (black, 0)
    // Restore brush sets mask to opaque (white, 255)
    mCtx.fillStyle = brushMode === "erase" ? "rgb(0,0,0)" : "rgb(255,255,255)";
    mCtx.fill();

    drawMainCanvas();
  };

  const handleBrushEnd = () => {
    setIsDrawing(false);
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const finalDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    onComplete(finalDataUrl, bgColor);
  };

  const handlePresetSelect = (hex: string) => {
    setBgColor(hex);
  };

  return (
    <div className="space-y-6" id="background-remover-section">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Controls (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-950">Remove Background</h3>
              <p className="text-xs text-slate-500 mt-1">Erase your backdrop automatically, or fine-tune with precision brushes.</p>
            </div>

            {/* Background color selection presets */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Select Replacement Background</span>
              <div className="grid grid-cols-4 gap-2" id="bg-color-selection-grid">
                {presetColors.map((color) => (
                  <button
                    key={color.id}
                    id={`bg-color-${color.id}`}
                    onClick={() => handlePresetSelect(color.hex)}
                    className={`h-11 rounded-xl border flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer ${
                      bgColor === color.hex
                        ? "border-blue-600 bg-white ring-2 ring-blue-100"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div
                      className="h-5 w-5 rounded-full border border-slate-200 shadow-inner"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[9px] font-bold text-slate-500 mt-1">{color.name}</span>
                    {bgColor === color.hex && (
                      <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[6px]">
                        ✓
                      </span>
                    )}
                  </button>
                ))}

                {/* Custom Color Picker */}
                <button
                  id="bg-color-custom"
                  onClick={() => setBgColor(customColor)}
                  className={`h-11 rounded-xl border flex flex-col items-center justify-center relative transition-all duration-200 cursor-pointer ${
                    bgColor === customColor
                      ? "border-blue-600 bg-white ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div
                    className="h-5 w-5 rounded-full border border-slate-200 shadow-inner overflow-hidden relative flex items-center justify-center"
                    style={{ backgroundColor: customColor }}
                  >
                    <input
                      type="color"
                      id="custom-color-picker-input"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setBgColor(e.target.value);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                    />
                    <span className="text-[10px] text-slate-500 font-bold font-mono">🎨</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 mt-1 truncate max-w-full px-1">{customColor}</span>
                  {bgColor === customColor && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[6px]">
                      ✓
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Smart tools selection tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl" id="removal-tool-tabs">
              <button
                id="tab-wand-tool"
                onClick={() => setIsWandMode(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isWandMode
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Wand className="h-3.5 w-3.5" />
                <span>Magic Wand</span>
              </button>
              <button
                id="tab-brush-tool"
                onClick={() => setIsWandMode(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  !isWandMode
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Paintbrush className="h-3.5 w-3.5" />
                <span>Manual Brush</span>
              </button>
            </div>

            {/* Tool settings depending on current tab */}
            {isWandMode ? (
              <div className="space-y-4 p-4 border border-slate-200 rounded-xl" id="wand-settings">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Wand Similarity Tolerance</span>
                  <span className="font-mono text-slate-500 font-medium">{tolerance}</span>
                </div>
                <input
                  type="range"
                  id="wand-tolerance-slider"
                  min="5"
                  max="120"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-700">Edge Feathering (Smoothness)</span>
                  <span className="font-mono text-slate-500 font-medium">{feather}px</span>
                </div>
                <input
                  type="range"
                  id="wand-feather-slider"
                  min="0"
                  max="10"
                  value={feather}
                  onChange={(e) => setFeather(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <div className="flex gap-2.5 pt-1">
                  <button
                    id="btn-auto-re-detect"
                    disabled={isRemoving}
                    onClick={autoDetectAndRemove}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition duration-150 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>{isRemoving ? "Extracting..." : "Auto-Extract Again"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 border border-slate-200 rounded-xl" id="brush-settings">
                <div className="flex gap-2 bg-slate-50 p-1 rounded-lg">
                  <button
                    id="brush-mode-erase"
                    onClick={() => setBrushMode("erase")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      brushMode === "erase" ? "bg-red-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    <span>Erase Brush</span>
                  </button>
                  <button
                    id="brush-mode-restore"
                    onClick={() => setBrushMode("restore")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold rounded-md transition cursor-pointer ${
                      brushMode === "restore" ? "bg-emerald-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Paintbrush className="h-3.5 w-3.5" />
                    <span>Restore Brush</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Brush Radius</span>
                    <span className="font-mono text-slate-500 font-medium">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    id="brush-size-slider"
                    min="2"
                    max="80"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 p-3 rounded-xl text-xs text-amber-800" id="removal-error-notif">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Quick tips */}
            <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100/50 text-[11px] text-blue-800 space-y-1 flex gap-2">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Pro-tip for background cleaning:</p>
                <p className="text-blue-700/90 mt-0.5 leading-normal">
                  {isWandMode
                    ? "In Magic Wand mode, click any leftover background pixels on the right photo preview to instantly erase that color category."
                    : "Draw with your mouse directly on the right photo preview to carefully restore or erase fine edges."}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Editor Canvas (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-4">
            
            {/* Interactive Image Display Wrapper */}
            <div className="relative border border-slate-200 rounded-xl bg-slate-50 p-6 flex items-center justify-center shadow-inner min-h-80 w-full max-w-sm">
              
              {/* Grid pattern backdrop when background is fully transparent */}
              <div className="absolute inset-0 bg-white" style={{ backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 0)", backgroundSize: "12px 12px" }} />

              {/* Loader */}
              {isRemoving && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 gap-4 z-30 rounded-xl text-center backdrop-blur-xs">
                  <div className="h-9 w-9 border-3 border-white border-t-transparent rounded-full animate-spin shadow" />
                  <div className="space-y-1">
                    <span className="text-white text-xs font-bold tracking-tight block">
                      {progressMessage || "Auto-Extracting Photo..."}
                    </span>
                    <p className="text-slate-300 text-[10px] max-w-xs px-2 leading-relaxed">
                      ClearBackdrop returns a transparent PNG, then this editor turns it into an adjustable mask.
                    </p>
                  </div>
                  <button
                    id="btn-skip-ai"
                    onClick={(e) => {
                      e.stopPropagation();
                      runLocalFallback();
                    }}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/35 active:bg-white/45 text-white border border-white/30 text-[11px] font-bold rounded-lg transition duration-150 cursor-pointer shadow-sm"
                  >
                    ⚡ Skip and Use Fast Local Remover
                  </button>
                </div>
              )}

              {/* Canvas stage */}
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseDown={handleBrushStart}
                onMouseMove={handleBrushMove}
                onMouseUp={handleBrushEnd}
                onMouseLeave={handleBrushEnd}
                className={`relative shadow-md max-h-80 object-contain rounded bg-white transition-shadow duration-300 ${
                  isWandMode ? "cursor-crosshair" : "cursor-none"
                }`}
                style={{ touchAction: "none" }}
              />

              {/* Custom floating brush indicator when in manual brush mode */}
              {!isWandMode && (
                <div className="pointer-events-none absolute text-[10px] bg-black/60 text-white rounded px-2 py-0.5 z-40 top-3 right-3 font-mono">
                  Brush: {brushMode.toUpperCase()}
                </div>
              )}
            </div>

            {/* Toggle visual controls */}
            <div className="flex items-center gap-3">
              <button
                id="btn-toggle-original"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
                onTouchStart={() => setShowOriginal(true)}
                onTouchEnd={() => setShowOriginal(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition active:scale-[0.98] select-none cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Hold to View Original</span>
              </button>
              
              <button
                id="btn-re-sample-bg"
                onClick={() => {
                  const mCtx = maskCanvasRef.current?.getContext("2d");
                  if (mCtx && maskCanvasRef.current) {
                    mCtx.fillStyle = "#ffffff";
                    mCtx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
                    drawMainCanvas();
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Mask</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Step Actions */}
        <div className="flex gap-3 border-t border-slate-100 pt-5 mt-6 justify-between">
          <button
            id="btn-bg-remover-back"
            onClick={onBack}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            ← Back to Crop
          </button>
          
          <button
            id="btn-bg-remover-apply"
            onClick={handleApply}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition active:scale-[0.98] cursor-pointer"
          >
            <span>Next: Arrange A4</span>
            <Check className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
