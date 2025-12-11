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

const DEFAULT_PATTERN: PatternOptions = {
  scale: 1,
  stroke: 2,
  rotation: 45
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
  const [status, setStatus] = useState<string>("Load an image to begin");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pattern = useMemo(
    () => createPattern(patternType, patternOptions, "#0f172a"),
    [patternOptions, patternType]
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

  const resetControls = useCallback(() => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setPatternOptions(DEFAULT_PATTERN);
    setPatternType("dots");
    setPatternSide("dark");
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
    ctx.fillStyle = patternSide === "dark" ? "#ffffff" : "#0f172a";
    ctx.fillRect(0, 0, width, height);

    if (pattern) {
      paintPatternMasked(ctx, pattern, maskCanvas);
    } else {
      ctx.save();
      ctx.fillStyle = patternSide === "dark" ? "#0f172a" : "#ffffff";
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }, [adjustments, bitmap, pattern, patternSide]);

  return (
    <div className="app-shell">
      <div className="panel">
        <h2>Image</h2>
        <div className="controls">
          <input type="file" accept="image/*" onChange={onFileChange} />
          <div className="control">
            <label>Presets</label>
            <div className="button-row">
              <button
                onClick={() =>
                  setAdjustments({ brightness: -5, contrast: 10, threshold: 45 })
                }
              >
                Soft
              </button>
              <button
                onClick={() =>
                  setAdjustments({ brightness: 5, contrast: 20, threshold: 60 })
                }
              >
                Bold
              </button>
              <button
                onClick={() =>
                  setAdjustments({ brightness: 0, contrast: 0, threshold: 55 })
                }
              >
                Neutral
              </button>
            </div>
          </div>
          <Slider
            label="Brightness"
            value={adjustments.brightness}
            min={-50}
            max={50}
            onChange={(value) =>
              setAdjustments((prev) => ({ ...prev, brightness: value }))
            }
          />
          <Slider
            label="Contrast"
            value={adjustments.contrast}
            min={-50}
            max={60}
            onChange={(value) =>
              setAdjustments((prev) => ({ ...prev, contrast: value }))
            }
          />
          <Slider
            label="Threshold"
            value={adjustments.threshold}
            min={0}
            max={100}
            onChange={(value) =>
              setAdjustments((prev) => ({ ...prev, threshold: value }))
            }
          />

          <h2>Pattern</h2>
          <div className="option-group">
            {(["dots", "diagonal", "grid", "checker", "crosshatch"] as const).map(
              (type) => (
                <div
                  key={type}
                  className={`chip ${patternType === type ? "active" : ""}`}
                  onClick={() => setPatternType(type)}
                >
                  {type}
                </div>
              )
            )}
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
        <div className="canvas-frame">
          <canvas ref={canvasRef} />
        </div>
        {!bitmap && (
          <div className="hint">
            Drop an image or use the file picker to get started.
          </div>
        )}
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

