export function paintPatternMasked(
  ctx: CanvasRenderingContext2D,
  pattern: CanvasPattern,
  mask: HTMLCanvasElement
) {
  ctx.save();
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, mask.width, mask.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(mask, 0, 0);
  ctx.restore();
}


