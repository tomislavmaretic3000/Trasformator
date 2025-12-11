export type Adjustments = {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  threshold: number; // 0 to 100
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalize = (value: number, min: number, max: number) =>
  (value - min) / (max - min);

export function applyAdjustments(
  source: CanvasImageSource,
  target: HTMLCanvasElement,
  adjustments: Adjustments,
  size?: { width: number; height: number }
): ImageData {
  const ctx = target.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  const width = size?.width ?? (source as ImageBitmap).width;
  const height = size?.height ?? (source as ImageBitmap).height;
  target.width = width;
  target.height = height;
  ctx.drawImage(source, 0, 0, width, height);

  const data = ctx.getImageData(0, 0, width, height);
  const { brightness, contrast, threshold } = adjustments;
  const b = clamp(brightness / 100, -1, 1);
  const c = clamp(contrast / 100, -1, 1);

  const factor = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
  const t = clamp(threshold, 0, 100);
  const tValue = (t / 100) * 255;

  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const bl = data.data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * bl;

    let adjusted = factor * (gray - 128) + 128;
    adjusted += b * 255;
    adjusted = clamp(adjusted, 0, 255);

    const binary = adjusted >= tValue ? 255 : 0;
    data.data[i] = binary;
    data.data[i + 1] = binary;
    data.data[i + 2] = binary;
    data.data[i + 3] = 255;
  }

  ctx.putImageData(data, 0, 0);
  return data;
}

export function createMaskCanvas(
  data: ImageData,
  patternOn: "dark" | "light"
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not available");
  }
  const mask = ctx.createImageData(data.width, data.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const value = data.data[i]; // 0 or 255
    const isLight = value === 255;
    const patternArea = patternOn === "dark" ? !isLight : isLight;
    const alpha = patternArea ? 255 : 0;
    mask.data[i] = 0;
    mask.data[i + 1] = 0;
    mask.data[i + 2] = 0;
    mask.data[i + 3] = alpha;
  }
  ctx.putImageData(mask, 0, 0);
  return canvas;
}

