export function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  connections: Array<[number, number]>,
  options?: { color?: string; lineWidth?: number; visibilityMin?: number }
) {
  const g = typeof window !== 'undefined' ? (window as any) : null;
  if (g && typeof g.drawConnectors === 'function') {
    return g.drawConnectors(ctx, landmarks, connections, options);
  }

  if (!landmarks || !connections || !ctx) return;
  const color = options?.color || '#00FF00';
  const lineWidth = options?.lineWidth || 1;
  const visibilityMin = options?.visibilityMin ?? 0.5;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  for (const [startIdx, endIdx] of connections) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (!start || !end) continue;
    if ((start.visibility ?? 1) < visibilityMin || (end.visibility ?? 1) < visibilityMin) continue;

    ctx.beginPath();
    ctx.moveTo(start.x * w, start.y * h);
    ctx.lineTo(end.x * w, end.y * h);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  options?: { color?: string; fillColor?: string; lineWidth?: number; radius?: number; visibilityMin?: number }
) {
  const g = typeof window !== 'undefined' ? (window as any) : null;
  if (g && typeof g.drawLandmarks === 'function') {
    return g.drawLandmarks(ctx, landmarks, options);
  }

  if (!landmarks || !ctx) return;
  const color = options?.color || '#FF0000';
  const radius = options?.radius || 2;
  const visibilityMin = options?.visibilityMin ?? 0.5;

  ctx.save();
  ctx.fillStyle = color;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < visibilityMin) continue;
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

export function drawRectangle(ctx: any, rect: any, options: any) {
  const g = typeof window !== 'undefined' ? (window as any) : null;
  if (g && typeof g.drawRectangle === 'function') {
    return g.drawRectangle(ctx, rect, options);
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default {
  drawConnectors,
  drawLandmarks,
  drawRectangle,
  lerp,
  clamp,
};
