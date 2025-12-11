export type PatternType = "dots" | "diagonal" | "grid" | "checker" | "crosshatch";

export type PatternOptions = {
  scale: number; // 0.5 - 3
  stroke: number; // 0.5 - 6
  rotation: number; // degrees
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function createPattern(
  type: PatternType,
  options: PatternOptions,
  color = "#0f172a"
): CanvasPattern | null {
  const tile = document.createElement("canvas");
  const baseSize = 80;
  const size = Math.max(24, baseSize * options.scale);
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext("2d");
  if (!ctx) return null;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = options.stroke;
  ctx.lineCap = "round";

  switch (type) {
    case "dots": {
      const radius = Math.max(1, (size / 12) * options.scale);
      const spacing = size / 3.2;
      for (let y = spacing / 2; y < size; y += spacing) {
        for (let x = spacing / 2; x < size; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "diagonal": {
      const spacing = size / 3.2;
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(toRad(options.rotation));
      ctx.translate(-size / 2, -size / 2);
      for (let x = -size; x < size * 2; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + size, size);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case "grid": {
      const spacing = size / 4;
      for (let i = 0; i <= size; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
      break;
    }
    case "checker": {
      const cells = 4;
      const cell = size / cells;
      for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillRect(x * cell, y * cell, cell, cell);
          }
        }
      }
      break;
    }
    case "crosshatch": {
      const spacing = size / 4;
      for (let x = -size; x < size * 2; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + size, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + size, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }

  return ctx.createPattern(tile, "repeat");
}


