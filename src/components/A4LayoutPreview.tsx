import React, { useState, useEffect, useRef } from "react";
import { Download, Printer, Settings, Layers, Sliders, Layout, CheckCircle, Info } from "lucide-react";
import { PhotoSizePreset, SheetConfig } from "../types";
import { jsPDF } from "jspdf";

interface A4LayoutPreviewProps {
  croppedImage: string; // The cutout base64 image
  photoPreset: PhotoSizePreset;
  onBack: () => void;
}

export default function A4LayoutPreview({ croppedImage, photoPreset, onBack }: A4LayoutPreviewProps) {
  // A4 Layout States
  const [copies, setCopies] = useState<number>(6);
  const [marginMm, setMarginMm] = useState<number>(10);
  const [gapMm, setGapMm] = useState<number>(5);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // References
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Print DPI (Standard high-quality printing is 300 DPI)
  const DPI = 300;
  const MM_TO_INCH = 25.4;

  // A4 physical dimensions in millimeters
  const A4_W_MM = orientation === "portrait" ? 210 : 297;
  const A4_H_MM = orientation === "portrait" ? 297 : 210;

  // Calculate A4 dimensions in pixels at 300 DPI (2480 x 3508 px for portrait)
  const A4_W_PX = Math.round((A4_W_MM / MM_TO_INCH) * DPI);
  const A4_H_PX = Math.round((A4_H_MM / MM_TO_INCH) * DPI);

  // Calculate coordinates and grid sizing
  const marginPx = Math.round((marginMm / MM_TO_INCH) * DPI);
  const gapPx = Math.round((gapMm / MM_TO_INCH) * DPI);

  // Dimensions of single photo in pixels
  let photoW_PX = Math.round((photoPreset.widthMm / MM_TO_INCH) * DPI);
  let photoH_PX = Math.round((photoPreset.heightMm / MM_TO_INCH) * DPI);

  // Auto-scale photo size down if it's too wide to fit at least 6 photos per row
  const usableW = A4_W_PX - (2 * marginPx);
  const maxAllowedPhotoW = Math.floor((usableW - (5 * gapPx)) / 6);
  if (photoW_PX > maxAllowedPhotoW) {
    const scaleRatio = maxAllowedPhotoW / photoW_PX;
    photoW_PX = maxAllowedPhotoW;
    photoH_PX = Math.round(photoH_PX * scaleRatio);
  }

  // Calculated fit values
  const [gridCols, setGridCols] = useState(0);
  const [gridRows, setGridRows] = useState(0);
  const [maxFit, setMaxFit] = useState(0);

  // Recalculate grid capacities
  useEffect(() => {
    const usableW = A4_W_PX - (2 * marginPx);
    const usableH = A4_H_PX - (2 * marginPx);

    // Columns calculation: (width + gap) / (photoW + gap)
    const cols = Math.floor((usableW + gapPx) / (photoW_PX + gapPx));
    const rows = Math.floor((usableH + gapPx) / (photoH_PX + gapPx));

    const calculatedCols = Math.max(1, cols);
    const calculatedRows = Math.max(1, rows);
    const totalFit = calculatedCols * calculatedRows;

    setGridCols(calculatedCols);
    setGridRows(calculatedRows);
    setMaxFit(totalFit);

    // Auto-adjust copies if it exceeds maximum possible fit
    if (copies > totalFit) {
      setCopies(totalFit);
    }
  }, [orientation, marginMm, gapMm, photoPreset, copies]);

  // Render the high-resolution A4 page onto the preview canvas
  const renderA4Canvas = async (targetCanvas: HTMLCanvasElement, scale: number = 1): Promise<void> => {
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    // Scale canvas sizes
    targetCanvas.width = A4_W_PX * scale;
    targetCanvas.height = A4_H_PX * scale;

    // Fill background (pure print white)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

    // Load photo image
    const img = new Image();
    img.src = croppedImage;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // Helper conversion variables scaled
    const sMargin = marginPx * scale;
    const sGap = gapPx * scale;
    const sPhotoW = photoW_PX * scale;
    const sPhotoH = photoH_PX * scale;
    const photoBorderWidth = Math.max(1.5, 2.5 * scale);

    // Draw alignment frame (faint grey border representing physical borders of A4)
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, targetCanvas.width, targetCanvas.height);

    // Calculate actual active rows and cols to center them perfectly on the page
    const activeCols = Math.min(gridCols, copies);
    const activeRows = Math.ceil(copies / gridCols);

    const totalGridW = (activeCols * sPhotoW) + ((activeCols - 1) * sGap);
    const totalGridH = (activeRows * sPhotoH) + ((activeRows - 1) * sGap);

    const offsetX = Math.max(sMargin, (targetCanvas.width - totalGridW) / 2);
    const offsetY = sMargin;

    // Calculate grid positions and draw photos
    let drawnCount = 0;
    
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (drawnCount >= copies) break;

        const posX = offsetX + (c * (sPhotoW + sGap));
        const posY = offsetY + (r * (sPhotoH + sGap));

        // Draw image cutout
        ctx.drawImage(img, posX, posY, sPhotoW, sPhotoH);

        // Draw visible cutting border around each passport photo.
        const inset = photoBorderWidth / 2;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.55)";
        ctx.lineWidth = photoBorderWidth;
        ctx.strokeRect(posX + inset, posY + inset, sPhotoW - photoBorderWidth, sPhotoH - photoBorderWidth);

        // Add small corner ticks so borders remain visible on light backgrounds.
        const tickLength = Math.min(sPhotoW, sPhotoH) * 0.08;
        ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
        ctx.lineWidth = photoBorderWidth;
        ctx.beginPath();
        ctx.moveTo(posX + inset, posY + tickLength);
        ctx.lineTo(posX + inset, posY + inset);
        ctx.lineTo(posX + tickLength, posY + inset);
        ctx.moveTo(posX + sPhotoW - tickLength, posY + inset);
        ctx.lineTo(posX + sPhotoW - inset, posY + inset);
        ctx.lineTo(posX + sPhotoW - inset, posY + tickLength);
        ctx.moveTo(posX + inset, posY + sPhotoH - tickLength);
        ctx.lineTo(posX + inset, posY + sPhotoH - inset);
        ctx.lineTo(posX + tickLength, posY + sPhotoH - inset);
        ctx.moveTo(posX + sPhotoW - tickLength, posY + sPhotoH - inset);
        ctx.lineTo(posX + sPhotoW - inset, posY + sPhotoH - inset);
        ctx.lineTo(posX + sPhotoW - inset, posY + sPhotoH - tickLength);
        ctx.stroke();

        drawnCount++;
      }
      if (drawnCount >= copies) break;
    }
  };

  // Redraw preview whenever copies, layout settings change
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (canvas && gridCols > 0) {
      // Scale down preview by a factor of 0.15 to fit nicely on the screen
      renderA4Canvas(canvas, 0.14);
    }
  }, [orientation, copies, marginMm, gapMm, photoPreset, gridCols, gridRows, croppedImage]);

  // Export functions
  const handleExport = async (format: "png" | "jpeg" | "pdf") => {
    try {
      setIsGenerating(true);
      setExportSuccess(null);

      // 1. Create fully uncompromised offscreen high-res canvas at full 300 DPI
      const offscreenCanvas = document.createElement("canvas");
      await renderA4Canvas(offscreenCanvas, 1);

      const filename = `passport_photos_${photoPreset.id}_${Date.now()}`;

      if (format === "png") {
        const dataUrl = offscreenCanvas.toDataURL("image/png");
        downloadFile(dataUrl, `${filename}.png`);
        setExportSuccess("Successfully downloaded high-resolution print-ready PNG (300 DPI)!");
      } else if (format === "jpeg") {
        const dataUrl = offscreenCanvas.toDataURL("image/jpeg", 0.98);
        downloadFile(dataUrl, `${filename}.jpg`);
        setExportSuccess("Successfully downloaded high-resolution print-ready JPEG (300 DPI)!");
      } else if (format === "pdf") {
        const dataUrl = offscreenCanvas.toDataURL("image/jpeg", 0.95);
        
        // Initialize PDF: A4 size matching orientation
        const pdf = new jsPDF({
          orientation: orientation,
          unit: "mm",
          format: "a4"
        });

        // Add the image to fill the exact full bounds of the A4 page (210 x 297 mm)
        pdf.addImage(dataUrl, "JPEG", 0, 0, A4_W_MM, A4_H_MM);
        pdf.save(`${filename}.pdf`);
        setExportSuccess("Successfully saved print-ready vector PDF document!");
      }

    } catch (err: any) {
      console.error("Export failure:", err);
      alert("Failed to export. Please check the image format or reduce copies.");
    } finally {
      setIsGenerating(false);
      // Auto-clear success message after 5 seconds
      setTimeout(() => setExportSuccess(null), 5000);
    }
  };

  const handlePrint = async () => {
    try {
      setIsGenerating(true);
      
      // We render full 300 DPI print canvas
      const printCanvas = document.createElement("canvas");
      await renderA4Canvas(printCanvas, 1);
      
      const imgDataUrl = printCanvas.toDataURL("image/png");
      
      // Open a print window and inject the image with printable CSS styling
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Pop-up blocker is preventing the print dialog. Please allow popups or use the PDF download option.");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Print Passport Photos</title>
            <style>
              body, html {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: white;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                width: auto;
                height: auto;
                object-fit: contain;
              }
              @page {
                size: A4 ${orientation};
                margin: 0;
              }
            </style>
          </head>
          <body>
            <img src="${imgDataUrl}" />
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 300);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

    } catch (err) {
      console.error("Print execution failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="a4-layout-preview-section">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-950">A4 Page Settings</h3>
              <p className="text-xs text-slate-500 mt-1">Configure layout, copies, margins, and download high-quality files.</p>
            </div>

            {/* Layout parameters */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200" id="layout-controls">
              
              {/* Orientation selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Paper Orientation</span>
                <div className="flex gap-2">
                  <button
                    id="orientation-portrait"
                    onClick={() => setOrientation("portrait")}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      orientation === "portrait"
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-slate-250 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Portrait (210 x 297mm)
                  </button>
                  <button
                    id="orientation-landscape"
                    onClick={() => setOrientation("landscape")}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      orientation === "landscape"
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-slate-250 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Landscape (297 x 210mm)
                  </button>
                </div>
              </div>

              {/* copies count slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Number of Copies</span>
                  <span className="font-mono text-slate-500 font-medium">{copies} / {maxFit} photos</span>
                </div>
                <input
                  type="range"
                  id="copies-slider"
                  min="1"
                  max={maxFit || 1}
                  value={copies}
                  onChange={(e) => setCopies(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>1 photo</span>
                  <span>Max for layout: {maxFit}</span>
                </div>
                {copies === 6 && (
                  <p className="text-[10px] text-blue-600 font-bold bg-blue-50/75 p-1.5 rounded border border-blue-100 flex items-center gap-1 mt-1">
                    ✨ Perfectly aligned: 6 photos in 1 single row
                  </p>
                )}
              </div>

              {/* Margins Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Page Margins (mm)</span>
                  <span className="font-mono text-slate-500 font-medium">{marginMm}mm</span>
                </div>
                <input
                  type="range"
                  id="margins-slider"
                  min="5"
                  max="25"
                  value={marginMm}
                  onChange={(e) => setMarginMm(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Gaps Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Gap Between Photos (mm)</span>
                  <span className="font-mono text-slate-500 font-medium">{gapMm}mm</span>
                </div>
                <input
                  type="range"
                  id="gaps-slider"
                  min="1"
                  max="15"
                  value={gapMm}
                  onChange={(e) => setGapMm(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

            </div>

            {/* Live Stats */}
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5 text-xs text-blue-900" id="layout-stats">
              <span className="font-bold text-blue-950 block">Layout Calculations</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-blue-800 font-medium">
                <div>Single Photo:</div>
                <div className="font-mono text-right text-blue-950 font-semibold">{photoPreset.widthMm} x {photoPreset.heightMm} mm</div>
                <div>Photos per Row:</div>
                <div className="font-mono text-right text-blue-950 font-semibold">{gridCols}</div>
                <div>Photos per Col:</div>
                <div className="font-mono text-right text-blue-950 font-semibold">{gridRows}</div>
                <div>Max capacity:</div>
                <div className="font-mono text-right text-blue-950 font-semibold">{maxFit} photos</div>
              </div>
            </div>

            {/* Export buttons block */}
            <div className="space-y-2.5 pt-2" id="export-actions">
              <span className="text-xs font-bold text-slate-700 block">Download Print-Ready Assets</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  id="btn-export-pdf"
                  disabled={isGenerating}
                  onClick={() => handleExport("pdf")}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 transition cursor-pointer"
                >
                  <Download className="h-4.5 w-4.5 mb-1 text-red-500" />
                  <span className="text-[10px] font-bold">PDF Vector</span>
                </button>
                <button
                  id="btn-export-png"
                  disabled={isGenerating}
                  onClick={() => handleExport("png")}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition cursor-pointer"
                >
                  <Download className="h-4.5 w-4.5 mb-1 text-blue-500" />
                  <span className="text-[10px] font-bold">PNG Image</span>
                </button>
                <button
                  id="btn-export-jpg"
                  disabled={isGenerating}
                  onClick={() => handleExport("jpeg")}
                  className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 hover:border-amber-200 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 transition cursor-pointer"
                >
                  <Download className="h-4.5 w-4.5 mb-1 text-amber-500" />
                  <span className="text-[10px] font-bold">JPG Print</span>
                </button>
              </div>

              <button
                id="btn-direct-print"
                disabled={isGenerating}
                onClick={handlePrint}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm hover:shadow-md transition active:scale-[0.98] cursor-pointer"
              >
                <Printer className="h-4.5 w-4.5" />
                <span>Direct Print (A4 Printer)</span>
              </button>
            </div>

            {/* Success message popup notification */}
            {exportSuccess && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-800" id="export-success-notif">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{exportSuccess}</span>
              </div>
            )}

          </div>

          {/* Right Live Preview Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Live A4 Sheet Preview</span>
            
            {/* The 3D shadowed realistic paper frame */}
            <div className="relative bg-slate-50 hover:bg-slate-100/60 p-6 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center w-full max-w-sm overflow-hidden min-h-[380px]">
              <div className="absolute inset-0 bg-white" style={{ backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 0)", backgroundSize: "16px 16px" }} />

              {/* Loader */}
              {isGenerating && (
                <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 z-25 rounded-2xl">
                  <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-800">Compiling 300 DPI layout...</span>
                </div>
              )}

              {/* Paper shadow canvas card */}
              <div className="relative shadow-[0_15px_30px_rgba(0,0,0,0.08)] rounded-md border border-slate-200 overflow-hidden bg-white transition-transform duration-300 hover:scale-[1.01]">
                <canvas ref={previewCanvasRef} className="block max-w-full" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Info className="h-3.5 w-3.5" />
              <span>Preview displays thin gray lines for cutting references.</span>
            </div>
          </div>

        </div>

        {/* Action Row */}
        <div className="flex gap-3 border-t border-slate-100 pt-5 mt-6">
          <button
            id="btn-layout-back"
            onClick={onBack}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            ← Back to Background Changer
          </button>
        </div>
      </div>
    </div>
  );
}
