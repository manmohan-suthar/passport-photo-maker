export interface PhotoSizePreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const SIZE_PRESETS: PhotoSizePreset[] = [
  {
    id: "india",
    name: "India Passport (35 x 45 mm)",
    widthMm: 35,
    heightMm: 45,
    description: "Standard size for Indian passport, visa, and OCI applications."
  },
  {
    id: "visa_us",
    name: "US / Visa Photo (2 x 2 inch)",
    widthMm: 50.8,
    heightMm: 50.8,
    description: "2x2 inches. Required for US visa, DS-160, and passport."
  },
  {
    id: "eu",
    name: "Europe / UK Passport (35 x 45 mm)",
    widthMm: 35,
    heightMm: 45,
    description: "Standard Schengen, UK, and European union passport size."
  },
  {
    id: "custom",
    name: "Custom Dimensions",
    widthMm: 40,
    heightMm: 40,
    description: "Specify your own custom width and height in millimeters."
  }
];

export interface ComplianceFactor {
  status: boolean;
  message: string;
}

export interface ComplianceReport {
  neutralBackground: ComplianceFactor;
  headCentered: ComplianceFactor;
  eyesOpenAndVisible: ComplianceFactor;
  appropriateLighting: ComplianceFactor;
  neutralExpression: ComplianceFactor;
  compliesOverall: boolean;
  score: number;
  recommendation: string;
}

export interface SheetConfig {
  presetId: string;
  customWidthMm: number;
  customHeightMm: number;
  copies: number;
  marginMm: number;
  gapMm: number;
  backgroundColor: string; // hex or common string e.g., "#ffffff"
  orientation: "portrait" | "landscape";
}

export type StepId = "upload" | "crop" | "background" | "layout";

export interface Step {
  id: StepId;
  label: string;
  description: string;
}

export const STEPS: Step[] = [
  { id: "upload", label: "Upload Photo", description: "Select or drag and drop your photo" },
  { id: "crop", label: "Crop Face", description: "Align your face with passport standards" },
  { id: "background", label: "Remove Background", description: "Erase or replace background color" },
  { id: "layout", label: "A4 Layout", description: "Arrange & download print sheet" }
];
