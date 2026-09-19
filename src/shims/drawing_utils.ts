import '@mediapipe/drawing_utils/drawing_utils.js';

const g = typeof window !== 'undefined' ? (window as any) : (globalThis as any);

export const drawConnectors = g.drawConnectors;
export const drawLandmarks = g.drawLandmarks;
export const drawRectangle = g.drawRectangle;
export const lerp = g.lerp;
export const clamp = g.clamp;

export default {
  drawConnectors: g.drawConnectors,
  drawLandmarks: g.drawLandmarks,
  drawRectangle: g.drawRectangle,
  lerp: g.lerp,
  clamp: g.clamp,
};
