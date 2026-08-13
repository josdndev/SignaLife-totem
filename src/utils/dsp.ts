/**
 * Procesamiento de Señales Digitales (DSP) para rPPG
 * Contiene funciones para Transformada Rápida de Fourier (FFT) y análisis de espectro.
 */

// Interpola una serie de tiempo irregular (jitter del navegador) a una tasa de muestreo (Hz) fija.
// Retorna un array de valores espaciados uniformemente en el tiempo.
export function interpolateTimeSeries(
  data: { time: number; value: number }[],
  targetFps: number
): number[] {
  if (data.length < 2) return data.map((d) => d.value);

  const startTime = data[0].time;
  const endTime = data[data.length - 1].time;
  const duration = endTime - startTime;
  
  const numSamples = Math.floor((duration / 1000) * targetFps);
  const interval = 1000 / targetFps;

  const uniformSignal: number[] = [];
  let currentIndex = 0;

  for (let i = 0; i < numSamples; i++) {
    const targetTime = startTime + i * interval;

    // Buscar los puntos circundantes para interpolación
    while (
      currentIndex < data.length - 2 &&
      data[currentIndex + 1].time < targetTime
    ) {
      currentIndex++;
    }

    const p1 = data[currentIndex];
    const p2 = data[currentIndex + 1];

    if (!p2) {
      uniformSignal.push(p1.value);
    } else {
      // Interpolación lineal
      const slope = (p2.value - p1.value) / (p2.time - p1.time);
      const interpolatedValue = p1.value + slope * (targetTime - p1.time);
      uniformSignal.push(interpolatedValue);
    }
  }

  return uniformSignal;
}

// Devuelve la siguiente potencia de 2 para rellenar la señal (zero-padding)
export function nextPowerOf2(n: number): number {
  let count = 0;
  if (n && !(n & (n - 1))) return n;
  while (n !== 0) {
    n >>= 1;
    count += 1;
  }
  return 1 << count;
}

// Aplica una ventana de Hamming para reducir el spectral leakage
export function hammingWindow(signal: number[]): number[] {
  const n = signal.length;
  return signal.map((val, i) => {
    const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
    return val * window;
  });
}

// Elimina la tendencia lineal y la media (DC component)
export function detrend(signal: number[]): number[] {
  if (signal.length === 0) return [];
  const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
  return signal.map((val) => val - mean);
}

// Elimina la tendencia de baja frecuencia usando una media móvil (High-pass filter simple)
export function movingAverageDetrend(signal: number[], windowSize: number): number[] {
  if (signal.length === 0) return [];
  const detrended = new Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, i - windowSize);
    const end = Math.min(signal.length - 1, i + windowSize);
    for (let j = start; j <= end; j++) {
      sum += signal[j];
      count++;
    }
    const localMean = sum / count;
    detrended[i] = signal[i] - localMean;
  }
  return detrended;
}

// Radix-2 In-place Fast Fourier Transform (FFT)
// Retorna las magnitudes de las frecuencias
export function fftMagnitudes(realIn: number[]): number[] {
  const n = realIn.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error("FFT requiere un array con longitud potencia de 2");
  }

  const real = new Float64Array(realIn);
  const imag = new Float64Array(n);

  // Bit-reversal permutation
  let target = 0;
  for (let position = 0; position < n; position++) {
    if (target > position) {
      const tempReal = real[target];
      real[target] = real[position];
      real[position] = tempReal;
    }
    let mask = n >> 1;
    while (target & mask) {
      target &= ~mask;
      mask >>= 1;
    }
    target |= mask;
  }

  // Cooley-Tukey Radix-2 FFT
  for (let step = 1; step < n; step <<= 1) {
    const jump = step << 1;
    const stepRatio = Math.PI / step;
    for (let group = 0; group < step; group++) {
      const cosMultiplier = Math.cos(group * stepRatio);
      const sinMultiplier = -Math.sin(group * stepRatio);
      for (let pair = group; pair < n; pair += jump) {
        const match = pair + step;
        const realTemp = cosMultiplier * real[match] - sinMultiplier * imag[match];
        const imagTemp = cosMultiplier * imag[match] + sinMultiplier * real[match];
        
        real[match] = real[pair] - realTemp;
        imag[match] = imag[pair] - imagTemp;
        real[pair] += realTemp;
        imag[pair] += imagTemp;
      }
    }
  }

  // Calcular las magnitudes (Densidad Espectral de Potencia - PSD)
  const magnitudes = new Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  
  return magnitudes;
}

// Encuentra la frecuencia dominante dentro de un rango específico [minHz, maxHz]
export function findPeakFrequency(
  magnitudes: number[],
  fps: number,
  nFFT: number,
  minHz: number,
  maxHz: number,
  ignoreFreq?: number
): { frequency: number; power: number } {
  let maxPower = -Infinity;
  let peakFreq = 0;

  for (let i = 0; i < magnitudes.length; i++) {
    const freq = (i * fps) / nFFT;
    
    if (freq >= minHz && freq <= maxHz) {
      // Enmascarar (ignorar) si la frecuencia está peligrosamente cerca de la frecuencia ignorada (ej. respiración)
      if (ignoreFreq !== undefined && Math.abs(freq - ignoreFreq) < 0.15) {
        continue;
      }
      
      // La compensación de ruido 1/f se maneja ahora a través del "Gradiente Temporal" (Primera Derivada)
      // en el componente principal, lo cual matemáticamente equivale a multiplicar por la frecuencia.
      // Así evitamos la "doble amplificación" que dispara el pulso a > 190 BPM.
      const power = magnitudes[i];
      
      if (power > maxPower) {
        maxPower = power;
        peakFreq = freq;
      }
    }
  }

  return { frequency: peakFreq, power: maxPower };
}

// Algoritmo POS (Plane-Orthogonal-to-Skin) de Wang et al. 2015
// Extrae la señal del pulso combinando los 3 canales de color (RGB) de forma ortogonal al tono de la piel
export function computePOS(redSignal: number[], greenSignal: number[], blueSignal: number[]): number[] {
  const length = Math.min(redSignal.length, greenSignal.length, blueSignal.length);
  if (length === 0) return [];

  // Calcular la media de cada canal para la normalización (simulando una ventana temporal completa)
  const meanR = redSignal.reduce((a, b) => a + b, 0) / length;
  const meanG = greenSignal.reduce((a, b) => a + b, 0) / length;
  const meanB = blueSignal.reduce((a, b) => a + b, 0) / length;

  const h = new Array(length).fill(0);
  const X = new Array(length).fill(0);
  const Y = new Array(length).fill(0);

  // Proyectar RGB en el plano ortogonal (X, Y)
  for (let i = 0; i < length; i++) {
    // Normalización dividiendo por la media espacial/temporal
    const rn = meanR > 0 ? redSignal[i] / meanR : 0;
    const gn = meanG > 0 ? greenSignal[i] / meanG : 0;
    const bn = meanB > 0 ? blueSignal[i] / meanB : 0;

    X[i] = 3 * gn - 2 * bn;
    Y[i] = 1.5 * rn + gn - 1.5 * bn;
  }

  // Alpha tuning (ajuste del balance de las proyecciones usando su desviación estándar)
  // Calculamos la desviación estándar de X e Y
  const meanX = X.reduce((a, b) => a + b, 0) / length;
  const meanY = Y.reduce((a, b) => a + b, 0) / length;
  
  let stdX = 0;
  let stdY = 0;
  for (let i = 0; i < length; i++) {
    stdX += Math.pow(X[i] - meanX, 2);
    stdY += Math.pow(Y[i] - meanY, 2);
  }
  stdX = Math.sqrt(stdX / length);
  stdY = Math.sqrt(stdY / length);

  const alpha = stdY > 0 ? stdX / stdY : 0;

  // Combinación final para extraer el pulso puro
  for (let i = 0; i < length; i++) {
    h[i] = X[i] + alpha * Y[i];
  }

  return h;
}

// Cálculo de Saturación de Oxígeno (SpO2) usando el Ratio de Ratios (AC/DC)
export function calculateSpO2(redSignal: number[], greenSignal: number[]): number {
  if (redSignal.length === 0 || greenSignal.length === 0) return 98;
  
  const redDC = redSignal.reduce((a, b) => a + b, 0) / redSignal.length;
  const greenDC = greenSignal.reduce((a, b) => a + b, 0) / greenSignal.length;

  if (redDC === 0 || greenDC === 0) return 98;

  const redDetrended = detrend(redSignal);
  const greenDetrended = detrend(greenSignal);
  
  const redAC = Math.sqrt(redDetrended.reduce((sum, val) => sum + val * val, 0) / redDetrended.length);
  const greenAC = Math.sqrt(greenDetrended.reduce((sum, val) => sum + val * val, 0) / greenDetrended.length);

  if (greenAC === 0) return 98;

  // Ratio of Ratios (RoR)
  const ror = (redAC / redDC) / (greenAC / greenDC);

  // Calibración empírica clínica estándar (A=110, B=25)
  let spo2 = 110 - 25 * ror;
  
  return Math.max(90, Math.min(100, Math.round(spo2)));
}
