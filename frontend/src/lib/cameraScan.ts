export type QrScanResult = {
  rawValue: string;
  parsed: Record<string, unknown> | null;
};

export type TextScanResult = {
  rawText: string;
  parsed: Record<string, unknown> | null;
};

export type StructuredImageScanResult = {
  source: "qr" | "ocr";
  rawValue: string;
  parsed: Record<string, unknown> | null;
};

type FoodRiskEstimate = {
  alert: "green" | "yellow" | "red";
  confidence: number;
  reasons: string[];
};

type BarcodeDetectorLike = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

type TextDetectorLike = new () => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

const toImageElement = async (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = dataUrl;
  });

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const parseKeyValueText = (raw: string): Record<string, unknown> => {
  const rows = raw
    .split(/\r?\n|;|,/)
    .map((row) => row.trim())
    .filter(Boolean);

  const parsed: Record<string, unknown> = {};
  for (const row of rows) {
    const parts = row.split(/[:=]/);
    if (parts.length < 2) continue;
    const key = parts[0]?.trim().toLowerCase().replace(/\s+/g, "_");
    const value = collapseWhitespace(parts.slice(1).join(":"));
    if (!key || !value) continue;
    parsed[key] = value;
  }
  return parsed;
};

const mergeParsed = (base: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> => {
  const merged = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null || value === undefined) continue;
    const normalized = collapseWhitespace(String(value));
    if (!normalized) continue;
    if (!(key in merged)) {
      merged[key] = normalized;
    }
  }
  return merged;
};

const parseCommonPatterns = (raw: string): Record<string, unknown> => {
  const parsed: Record<string, unknown> = {};
  const assign = (key: string, value: string | undefined) => {
    if (!value) return;
    const normalized = collapseWhitespace(value);
    if (!normalized) return;
    if (!(key in parsed)) {
      parsed[key] = normalized;
    }
  };

  const ageMatch = raw.match(/\bage\s*[:\-]?\s*(\d{1,3})\b/i);
  assign("age", ageMatch?.[1]);

  const bpMatch = raw.match(/\b(?:bp|blood\s*pressure)\s*[:\-]?\s*(\d{2,3})\s*[/\-]\s*(\d{2,3})\b/i);
  if (bpMatch) {
    assign("systolic_bp", bpMatch[1]);
    assign("diastolic_bp", bpMatch[2]);
    assign("bp", `${bpMatch[1]}/${bpMatch[2]}`);
  }

  const heartRateMatch = raw.match(/\b(?:heart\s*rate|pulse|hr)\s*[:\-]?\s*(\d{2,3})\b/i);
  assign("heart_rate", heartRateMatch?.[1]);

  const spo2Match = raw.match(/\b(?:spo2|oxygen(?:\s*saturation)?)\s*[:\-]?\s*(\d{2,3})\s*%?\b/i);
  assign("spo2", spo2Match?.[1]);

  const glucoseMatch = raw.match(/\b(?:glucose|blood\s*sugar|sugar)\s*[:\-]?\s*(\d{2,3})\b/i);
  assign("glucose", glucoseMatch?.[1]);

  const cholesterolMatch = raw.match(/\b(?:cholesterol|chol)\s*[:\-]?\s*(\d{2,3})\b/i);
  assign("cholesterol", cholesterolMatch?.[1]);

  const aqiMatch = raw.match(/\baqi\s*[:\-]?\s*(\d{1,3})\b/i);
  assign("aqi", aqiMatch?.[1]);

  const heightMatch =
    raw.match(/\b(?:height|ht)\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:cm|centimeter|centimetre)?\b/i) ??
    raw.match(/\b(\d{2,3}(?:\.\d+)?)\s*cm\b/i);
  assign("height_cm", heightMatch?.[1]);

  const weightMatch =
    raw.match(/\b(?:weight|wt)\s*[:\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)?\b/i) ??
    raw.match(/\b(\d{2,3}(?:\.\d+)?)\s*kg\b/i);
  assign("weight_kg", weightMatch?.[1]);

  const genderLine = raw.match(/\b(?:gender|sex)\s*[:\-]?\s*(male|female|other|m|f)\b/i)?.[1];
  if (genderLine) {
    const gender = genderLine.toLowerCase();
    if (gender === "m" || gender === "male") {
      assign("gender", "male");
      assign("sex", "1");
    } else if (gender === "f" || gender === "female") {
      assign("gender", "female");
      assign("sex", "0");
    } else {
      assign("gender", "other");
    }
  }

  const activityMatch = raw.match(/\bactivity(?:_level)?\s*[:\-]?\s*(low|moderate|high)\b/i)?.[1];
  assign("activity_level", activityMatch?.toLowerCase());
  assign("activity", activityMatch?.toLowerCase());

  const stressMatch = raw.match(/\bstress\s*[:\-]?\s*(low|medium|high)\b/i)?.[1];
  assign("stress", stressMatch?.toLowerCase());

  const smokingLine = raw.match(/\b(?:smoker|smoking(?:_status)?)\s*[:\-]?\s*(yes|no|daily|never|former|occasionally)\b/i)?.[1];
  if (smokingLine) {
    const value = smokingLine.toLowerCase();
    if (["yes", "daily", "occasionally"].includes(value)) {
      assign("smoker", "yes");
      assign("smoking_status", value === "yes" ? "daily" : value);
    } else {
      assign("smoker", "no");
      assign("smoking_status", value === "no" ? "never" : value);
    }
  }

  const dishMatch = raw.match(/\b(?:dish|dish_name|food|food_name|meal|item)\s*[:\-]?\s*([a-z0-9][^\n,;]{1,80})/i)?.[1];
  if (dishMatch) {
    assign("dish_name", dishMatch);
    assign("food_name", dishMatch);
    assign("meal", dishMatch);
    assign("item", dishMatch);
  }

  return parsed;
};

const parseStructuredText = (rawValue: string): Record<string, unknown> | null => {
  const raw = rawValue.trim();
  if (!raw) return null;

  let parsed: Record<string, unknown> = {};

  try {
    const jsonParsed = JSON.parse(raw);
    if (jsonParsed && typeof jsonParsed === "object" && !Array.isArray(jsonParsed)) {
      parsed = mergeParsed(parsed, jsonParsed as Record<string, unknown>);
    }
  } catch {
    // Continue with text parsing.
  }

  parsed = mergeParsed(parsed, parseKeyValueText(raw));
  parsed = mergeParsed(parsed, parseCommonPatterns(raw));

  return Object.keys(parsed).length ? parsed : null;
};

export const scanQrDataFromImage = async (dataUrl: string): Promise<QrScanResult | null> => {
  const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorLike }).BarcodeDetector;
  if (!detectorConstructor) {
    return null;
  }

  try {
    const detector = new detectorConstructor({ formats: ["qr_code"] });
    const image = await toImageElement(dataUrl);
    const detections = await detector.detect(image);
    const rawValue = detections[0]?.rawValue?.trim();
    if (!rawValue) return null;
    return {
      rawValue,
      parsed: parseStructuredText(rawValue),
    };
  } catch {
    return null;
  }
};

const createCanvasFromImage = (image: HTMLImageElement): HTMLCanvasElement => {
  const maxWidth = 1600;
  const scale = image.naturalWidth > maxWidth ? maxWidth / image.naturalWidth : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(image, 0, 0, width, height);
  return canvas;
};

const cloneCanvas = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.drawImage(source, 0, 0);
  return canvas;
};

const applyGrayscaleContrast = (canvas: HTMLCanvasElement): void => {
  const context = canvas.getContext("2d");
  if (!context) return;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = 1.35;
  const intercept = 128 * (1 - contrast);

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const gray = (r * 0.299 + g * 0.587 + b * 0.114) * contrast + intercept;
    const value = Math.max(0, Math.min(255, gray));
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);
};

const applyThreshold = (canvas: HTMLCanvasElement): void => {
  const context = canvas.getContext("2d");
  if (!context) return;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const threshold = 142;

  for (let index = 0; index < data.length; index += 4) {
    const tone = data[index] ?? 0;
    const value = tone >= threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);
};

const extractTextFromDetections = (detections: Array<{ rawValue?: string }>): string[] => {
  const chunks = detections
    .map((entry) => collapseWhitespace(entry.rawValue ?? ""))
    .filter((value) => value.length > 1);
  return Array.from(new Set(chunks));
};

const runTextDetectorOnImage = async (image: HTMLImageElement): Promise<string> => {
  const detectorConstructor = (window as Window & { TextDetector?: TextDetectorLike }).TextDetector;
  if (!detectorConstructor) return "";

  const detector = new detectorConstructor();
  const base = createCanvasFromImage(image);
  const grayscale = cloneCanvas(base);
  applyGrayscaleContrast(grayscale);
  const threshold = cloneCanvas(grayscale);
  applyThreshold(threshold);

  const candidates: CanvasImageSource[] = [base, grayscale, threshold];
  const chunks: string[] = [];
  for (const candidate of candidates) {
    try {
      const detections = await detector.detect(candidate);
      chunks.push(...extractTextFromDetections(detections));
    } catch {
      // Continue with next variant.
    }
  }

  return Array.from(new Set(chunks)).join("\n").trim();
};

export const scanTextDataFromImage = async (dataUrl: string): Promise<TextScanResult | null> => {
  try {
    const image = await toImageElement(dataUrl);
    const rawText = await runTextDetectorOnImage(image);
    if (!rawText) return null;
    return {
      rawText,
      parsed: parseStructuredText(rawText),
    };
  } catch {
    return null;
  }
};

export const scanStructuredDataFromImage = async (dataUrl: string): Promise<StructuredImageScanResult | null> => {
  const qr = await scanQrDataFromImage(dataUrl);
  if (qr?.rawValue) {
    return {
      source: "qr",
      rawValue: qr.rawValue,
      parsed: qr.parsed,
    };
  }

  const text = await scanTextDataFromImage(dataUrl);
  if (!text?.rawText) {
    return null;
  }

  return {
    source: "ocr",
    rawValue: text.rawText,
    parsed: text.parsed,
  };
};

export const estimateFoodRiskFromImage = async (dataUrl: string): Promise<FoodRiskEstimate> => {
  const image = await toImageElement(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 120;
  canvas.height = 120;
  const context = canvas.getContext("2d");
  if (!context) {
    return {
      alert: "yellow",
      confidence: 0.45,
      reasons: ["Unable to read image pixels clearly."],
    };
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalSaturation = 0;
  let sampledPixels = 0;

  for (let index = 0; index < data.length; index += 16) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    totalR += r;
    totalG += g;
    totalB += b;
    totalSaturation += saturation;
    sampledPixels += 1;
  }

  const avgR = totalR / Math.max(sampledPixels, 1);
  const avgG = totalG / Math.max(sampledPixels, 1);
  const avgB = totalB / Math.max(sampledPixels, 1);
  const avgSaturation = totalSaturation / Math.max(sampledPixels, 1);
  const brightness = (avgR + avgG + avgB) / 3;

  if (avgR > avgG + 18 && avgR > avgB + 16 && avgSaturation > 0.34 && brightness > 80) {
    return {
      alert: "red",
      confidence: 0.74,
      reasons: ["High red/oily tone detected.", "Looks like fried or heavy-sauce food in image."],
    };
  }

  if (avgG > avgR + 10 && avgG > avgB + 6 && avgSaturation > 0.2) {
    return {
      alert: "green",
      confidence: 0.69,
      reasons: ["Green/fresh tone detected.", "Likely lighter vegetable-focused plate."],
    };
  }

  return {
    alert: "yellow",
    confidence: 0.58,
    reasons: ["Mixed food colors detected.", "Moderate caution until exact dish details are confirmed."],
  };
};
