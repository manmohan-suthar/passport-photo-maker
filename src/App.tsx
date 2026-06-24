import React, { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import StepProgress from "./components/StepProgress";
import UploadPhoto from "./components/UploadPhoto";
import CropEditor from "./components/CropEditor";
import BackgroundRemover from "./components/BackgroundRemover";
import A4LayoutPreview from "./components/A4LayoutPreview";
import ComplianceChecker from "./components/ComplianceChecker";
import { StepId, PhotoSizePreset, SIZE_PRESETS } from "./types";
import { Camera, Sparkles, Printer, FileText, Upload, ShieldCheck, Check, X, ShieldAlert } from "lucide-react";

export default function App() {
  const [currentStep, setCurrentStep] = useState<StepId>("upload");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [photoPreset, setPhotoPreset] = useState<PhotoSizePreset>(SIZE_PRESETS[0]);
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [showUploadEditor, setShowUploadEditor] = useState<boolean>(false);

  // Step Navigations
  const handleStepChange = (stepId: StepId) => {
    setCurrentStep(stepId);
  };

  // Upload handler
  const handleImageSelected = (dataUrl: string) => {
    setUploadedImage(dataUrl);
    setCroppedImage(null);
    setProcessedImage(null);
    setShowUploadEditor(false);
    setCurrentStep("crop"); // Move to crop step as soon as image is selected
  };

  // Crop Completed handler
  const handleCropComplete = (croppedUrl: string, preset: PhotoSizePreset) => {
    setCroppedImage(croppedUrl);
    setPhotoPreset(preset);
    // Pre-populate processedImage with cropped image as a fallback
    setProcessedImage(croppedUrl);
    setCurrentStep("background");
  };

  // Background Removal completed handler
  const handleBackgroundRemovalComplete = (processedUrl: string, selectedBgColor: string) => {
    setProcessedImage(processedUrl);
    setBgColor(selectedBgColor);
    setCurrentStep("layout");
  };

  // Reset entire workflow
  const handleResetWorkflow = () => {
    setUploadedImage(null);
    setCroppedImage(null);
    setProcessedImage(null);
    setShowUploadEditor(false);
    setCurrentStep("upload");
  };

  // Pre-load a sample portrait for instant demonstration
  const handleLoadDemo = async () => {
    try {
      const demoUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop";
      
      // Fetch the Unsplash photo and convert to DataURI to bypass Canvas CORS security
      const response = await fetch(demoUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        handleImageSelected(dataUrl);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Failed to load demo image:", err);
      // Direct load fallback
      handleImageSelected("https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root">
      {/* Navigation Header */}
      <Header
        currentStep={currentStep}
        onStepChange={handleStepChange}
        hasImage={!!uploadedImage}
      />

      {/* Main Container */}
      <main className="flex-grow mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Landing Hero Section: Only visible when no photo has been selected and we are on the first step */}
        {currentStep === "upload" && !uploadedImage && !showUploadEditor && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-4 lg:py-10" id="hero-banner">
            
            {/* Hero Left Info */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-full border border-blue-100">
                <Sparkles className="h-3.5 w-3.5 fill-blue-100" />
                <span>Next-Gen In-Browser Photo Suite</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 font-sans leading-tight">
                Create Passport Photos <br className="hidden sm:inline" />
                In <span className="text-blue-600">Seconds</span>
              </h2>

              <p className="text-base text-slate-600 max-w-xl leading-relaxed">
                Upload your picture, crop it perfectly, remove the background, and automatically arrange multiple high-quality, 300 DPI print-ready passport-size photos on an A4 sheet.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="hero-btn-upload"
                  onClick={() => {
                    setShowUploadEditor(true);
                    setCurrentStep("upload");
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-lg shadow-blue-100 hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Upload className="h-4.5 w-4.5 stroke-[2.5]" />
                  <span>Upload Your Photo</span>
                </button>
                <button
                  id="hero-btn-demo"
                  onClick={handleLoadDemo}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl hover:shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Sparkles className="h-4.5 w-4.5 text-blue-600" />
                  <span>Try Interactive Demo</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs text-slate-500 font-medium font-sans">
                <div>
                  <h5 className="font-bold text-slate-900 font-sans">100% Privacy</h5>
                  <p className="text-slate-400 text-[10px] mt-0.5">Secure offline processing</p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 font-sans">300 DPI Export</h5>
                  <p className="text-slate-400 text-[10px] mt-0.5">Vector PDF and JPG</p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 font-sans">AI compliance</h5>
                  <p className="text-slate-400 text-[10px] mt-0.5">Instant ICAO verification</p>
                </div>
              </div>
            </div>

            {/* Hero Right: Gorgeous A4 mock visualizer card */}
            <div className="lg:col-span-5 flex justify-center" id="hero-floating-preview">
              <div className="relative bg-white p-6 rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full transform rotate-1 hover:rotate-0 transition-all duration-500">
                <div className="absolute top-4 right-4 bg-blue-50 text-blue-700 font-mono text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border border-blue-100">
                  A4 Print Layout
                </div>
                
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Mock Blueprint</h4>
                <h3 className="text-sm font-bold text-slate-800 mt-1">Pre-Arranged Passport Sheets</h3>
                
                {/* Visual grid sheet simulating passport size photos */}
                <div className="grid grid-cols-4 gap-2 border border-dashed border-slate-200 p-4 rounded-xl mt-4 bg-slate-50/50">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="aspect-[3.5/4.5] bg-white rounded border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center relative group">
                      {/* Avatar silhouettes */}
                      <div className="h-6 w-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                        👤
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 opacity-60" />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-4 text-xs text-slate-500 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                  <Printer className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Prints exactly 12 standard photos on an A4 sheet to save space and printing costs!</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Step Stepper Indicator (Hide when there is no image uploaded yet to keep landing clean) */}
        {uploadedImage && (
          <StepProgress
            currentStep={currentStep}
            onStepChange={handleStepChange}
            hasImage={!!uploadedImage}
          />
        )}

        {/* Primary Editor Workspace Area */}
        {(uploadedImage || showUploadEditor) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="primary-editor-workspace">
            
            {/* Left Column: Active Step Controls (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-6">
              
              {currentStep === "upload" && (
                <UploadPhoto
                  onImageSelected={handleImageSelected}
                  onSampleLoaded={handleLoadDemo}
                />
              )}

              {currentStep === "crop" && (
                <CropEditor
                  imageSrc={uploadedImage}
                  onCropComplete={handleCropComplete}
                  onReset={handleResetWorkflow}
                />
              )}

              {currentStep === "background" && croppedImage && (
                <BackgroundRemover
                  imageSrc={croppedImage}
                  onComplete={handleBackgroundRemovalComplete}
                  onBack={() => setCurrentStep("crop")}
                />
              )}

              {currentStep === "layout" && processedImage && (
                <A4LayoutPreview
                  croppedImage={processedImage}
                  photoPreset={photoPreset}
                  onBack={() => setCurrentStep("background")}
                />
              )}

            </div>

            {/* Right Column: Live Contextual Auditing / Guidelines (5 cols on desktop) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Step 1 Preview Side Panel */}
              {currentStep === "upload" && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4" id="upload-panel-right">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Standard Framing Rulebook</h3>
                  </div>

                  <div className="space-y-4 text-xs text-slate-600">
                    <p className="leading-relaxed">To pass official inspection at airport borders and visa centers, your photos must comply with standard regulations:</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <span className="h-4.5 w-4.5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-black">✓</span>
                          <span>Passed Setup</span>
                        </span>
                        <p className="text-emerald-700/80 text-[11px] leading-snug">Full face in focus, looking forward with plain backdrop.</p>
                      </div>
                      <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl space-y-1.5">
                        <span className="font-bold text-red-900 flex items-center gap-1">
                          <span className="h-4.5 w-4.5 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-[10px] font-black">✗</span>
                          <span>Avoid This</span>
                        </span>
                        <p className="text-red-700/80 text-[11px] leading-snug">Side facing, tilted heads, covered eyes, or shadows.</p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-slate-800">CORS Warning Note</strong>
                        <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">Please ensure to upload files locally from your device. Do not use protected URL links to prevent secure canvas errors.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 & 3 Compliance Checker Panel */}
              {(currentStep === "crop" || currentStep === "background") && (
                <ComplianceChecker
                  imageSrc={croppedImage || uploadedImage}
                />
              )}

            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
