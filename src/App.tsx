import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Adjustments, applyAdjustments, createMaskCanvas } from "./lib/imageOps";
import { createPattern, PatternOptions, PatternType } from "./lib/patterns";
import { paintPatternMasked } from "./lib/compositor";

type PatternSide = "dark" | "light";

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  threshold: 55
};

const PRESETS: { id: string; label: string; adjustments: Adjustments }[] = [
  {
    id: "neutral",
    label: "Neutral",
    adjustments: { brightness: 0, contrast: 0, threshold: 55 }
  },
  {
    id: "soft",
    label: "Soft",
    adjustments: { brightness: -5, contrast: 10, threshold: 45 }
  },
  {
    id: "bold",
    label: "Bold",
    adjustments: { brightness: 5, contrast: 20, threshold: 60 }
  },
  {
    id: "high-contrast",
    label: "High contrast",
    adjustments: { brightness: -10, contrast: 35, threshold: 65 }
  },
  {
    id: "film",
    label: "Film",
    adjustments: { brightness: 8, contrast: 12, threshold: 50 }
  }
];

const DEFAULT_PATTERN: PatternOptions = {
  scale: 0.8,
  stroke: 1.5,
  rotation: 45
};

const DEFAULT_COLORS = {
  pattern: "#0f172a",
  background: "#ffffff"
};

function formatValue(value: number) {
  return Math.round(value);
}

export default function App() {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [adjustments, setAdjustments] = useState<Adjustments>(
    DEFAULT_ADJUSTMENTS
  );
  const [patternType, setPatternType] = useState<PatternType>("dots");
  const [patternSide, setPatternSide] = useState<PatternSide>("dark");
  const [patternOptions, setPatternOptions] =
    useState<PatternOptions>(DEFAULT_PATTERN);
  const [invertColors, setInvertColors] = useState(false);
  const [patternColor, setPatternColor] = useState<string>(DEFAULT_COLORS.pattern);
  const [backgroundColor, setBackgroundColor] = useState<string>(
    DEFAULT_COLORS.background
  );
  const [status, setStatus] = useState<string>("Load an image to begin");
  const [presetId, setPresetId] = useState<string>("neutral");
  const [zoom, setZoom] = useState<number>(100);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const effectivePatternColor = invertColors ? backgroundColor : patternColor;
  const effectiveBackgroundColor = invertColors ? patternColor : backgroundColor;
  const pattern = useMemo(
    () => createPattern(patternType, patternOptions, effectivePatternColor),
    [patternOptions, patternType, effectivePatternColor]
  );

  const handleFile = useCallback(async (file: File) => {
    setStatus("Loading image…");
    const imageBitmap = await createImageBitmap(file);
    setBitmap(imageBitmap);
    setFileName(file.name);
    setStatus("Adjust and preview");
  }, []);

  const onFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await handleFile(file);
    },
    [handleFile]
  );

  const onPresetChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (event.target.value === "custom") {
        setPresetId("custom");
        return;
      }
      const nextPreset = PRESETS.find((preset) => preset.id === event.target.value);
      if (!nextPreset) return;
      setPresetId(nextPreset.id);
      setAdjustments(nextPreset.adjustments);
    },
    []
  );

  const onDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    },
    []
  );

  const onDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setIsDragging(false);
      }
    },
    []
  );

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setStatus("Please drop an image file");
        return;
      }
      await handleFile(file);
    },
    [handleFile]
  );

  const resetControls = useCallback(() => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setPresetId("neutral");
    setPatternOptions(DEFAULT_PATTERN);
    setPatternType("dots");
    setPatternSide("dark");
    setPatternColor(DEFAULT_COLORS.pattern);
    setBackgroundColor(DEFAULT_COLORS.background);
    setInvertColors(false);
    setZoom(100);
  }, []);

  const downloadImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = fileName ? `${fileName}-pattern.png` : "pattern-output.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [fileName]);

  useEffect(() => {
    if (!bitmap) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maxSize = 1280;
    const scale = Math.min(
      maxSize / bitmap.width,
      maxSize / bitmap.height,
      1
    );
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const working = document.createElement("canvas");
    const processed = applyAdjustments(bitmap, working, adjustments, {
      width,
      height
    });
    const maskCanvas = createMaskCanvas(processed, patternSide);

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = effectiveBackgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (pattern) {
      paintPatternMasked(ctx, pattern, maskCanvas);
    } else {
      ctx.save();
      ctx.fillStyle = effectivePatternColor;
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }, [
    adjustments,
    bitmap,
    effectiveBackgroundColor,
    effectivePatternColor,
    invertColors,
    pattern,
    patternSide
  ]);

  return (
    <div className="app-shell">
      <div className="panel">
        <h2>Image</h2>
        <div className="controls">
          <input type="file" accept="image/*" onChange={onFileChange} />
          <div className="control">
            <label>Presets</label>
            <select value={presetId} onChange={onPresetChange}>
              {PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </div>
          <Slider
            label="Brightness"
            value={adjustments.brightness}
            min={-50}
            max={50}
            onChange={(value) =>
              setAdjustments((prev) => {
                setPresetId("custom");
                return { ...prev, brightness: value };
              })
            }
          />
          <Slider
            label="Contrast"
            value={adjustments.contrast}
            min={-50}
            max={60}
            onChange={(value) =>
              setAdjustments((prev) => {
                setPresetId("custom");
                return { ...prev, contrast: value };
              })
            }
          />
          <Slider
            label="Threshold"
            value={adjustments.threshold}
            min={0}
            max={100}
            onChange={(value) =>
              setAdjustments((prev) => {
                setPresetId("custom");
                return { ...prev, threshold: value };
              })
            }
          />

          <h2>Pattern</h2>
          <div className="control">
            <label>Pattern type</label>
            <select
              value={patternType}
              onChange={(e) => setPatternType(e.target.value as PatternType)}
            >
              <option value="dots">Dots</option>
              <option value="diagonal">Diagonal lines</option>
              <option value="grid">Grid</option>
              <option value="checker">Checkers</option>
              <option value="crosshatch">Crosshatch</option>
            </select>
          </div>
          <div className="control">
            <label>
              <span>Pattern color</span>
              <input
                type="color"
                value={patternColor}
                onChange={(e) => setPatternColor(e.target.value)}
                aria-label="Pattern color"
                style={{ width: 48, height: 28, padding: 0, border: "1px solid #cbd2d9" }}
              />
            </label>
          </div>
          <div className="control">
            <label>
              <span>Background color</span>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                aria-label="Background color"
                style={{ width: 48, height: 28, padding: 0, border: "1px solid #cbd2d9" }}
              />
            </label>
          </div>
          <div className="control">
            <label>
              <span>Invert colors</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={invertColors}
                onChange={(e) => setInvertColors(e.target.checked)}
              />
              <span className="hint">Swap pattern & background colors</span>
            </label>
          </div>

          <div className="button-row">
            <button
              className={patternSide === "dark" ? "primary" : ""}
              onClick={() => setPatternSide("dark")}
            >
              Pattern on dark
            </button>
            <button
              className={patternSide === "light" ? "primary" : ""}
              onClick={() => setPatternSide("light")}
            >
              Pattern on light
            </button>
          </div>

          <Slider
            label="Pattern scale"
            value={patternOptions.scale}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(value) =>
              setPatternOptions((prev) => ({ ...prev, scale: value }))
            }
          />
          <Slider
            label="Pattern stroke"
            value={patternOptions.stroke}
            min={0.5}
            max={6}
            step={0.25}
            onChange={(value) =>
              setPatternOptions((prev) => ({ ...prev, stroke: value }))
            }
          />
          <Slider
            label="Line angle"
            value={patternOptions.rotation}
            min={0}
            max={180}
            step={5}
            onChange={(value) =>
              setPatternOptions((prev) => ({ ...prev, rotation: value }))
            }
          />

          <div className="button-row">
            <button onClick={resetControls}>Reset</button>
            <button className="primary" onClick={downloadImage}>
              Download PNG
            </button>
          </div>
          <div className="hint">{status}</div>
        </div>
      </div>

      <div className="panel preview-wrapper">
        <h2>Preview</h2>
        <div
          className={`drop-zone ${isDragging ? "dragging" : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div
            className="canvas-frame"
            style={{ background: effectiveBackgroundColor }}
          >
            <canvas
              ref={canvasRef}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top left"
              }}
            />
          </div>
          {!bitmap && (
            <div className="hint">
              Drop an image here or use the file picker to get started.
            </div>
          )}
        </div>
        <div className="control">
          <label>
            <span>Zoom</span>
            <span>{formatValue(zoom)}%</span>
          </label>
          <div className="button-row">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
            >
              - Zoom out
            </button>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(200, prev + 10))}
            >
              + Zoom in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

function Slider({ label, value, min, max, step = 1, onChange }: SliderProps) {
  return (
    <div className="control">
      <label>
        <span>{label}</span>
        <span>{formatValue(value)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

