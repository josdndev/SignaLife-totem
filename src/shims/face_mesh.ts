export const FACEMESH_FACE_OVAL: Array<[number, number]> = [
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
  [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
  [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
  [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
  [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10]
];

export const FACEMESH_LIPS: Array<[number, number]> = [
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405],
  [405, 321], [321, 375], [375, 291], [61, 185], [185, 40], [40, 39], [39, 37],
  [37, 0], [0, 267], [267, 269], [269, 270], [270, 409], [409, 291], [78, 95],
  [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318],
  [318, 324], [324, 308], [78, 191], [191, 80], [80, 81], [81, 82], [82, 13],
  [13, 312], [312, 311], [311, 310], [310, 415], [415, 308]
];

export interface FaceMeshOptions {
  locateFile?: (file: string) => string;
  maxNumFaces?: number;
  refineLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

export class FaceMesh {
  private delegate: any = null;
  private pendingOptions: FaceMeshOptions | null = null;
  private resultsCallback: ((results: any) => void) | null = null;

  constructor(options?: FaceMeshOptions) {
    this.pendingOptions = options || null;
    this.initDelegate();
  }

  private initDelegate() {
    const g = typeof window !== 'undefined' ? (window as any) : null;
    const NativeFaceMesh = g?.FaceMesh;
    if (typeof NativeFaceMesh === 'function') {
      try {
        this.delegate = new NativeFaceMesh(this.pendingOptions || undefined);
        if (this.resultsCallback) {
          this.delegate.onResults(this.resultsCallback);
        }
      } catch (err) {
        console.warn("Aviso al instanciar NativeFaceMesh:", err);
      }
    }
  }

  setOptions(options: FaceMeshOptions) {
    if (!this.delegate) {
      this.initDelegate();
    }
    if (this.delegate && typeof this.delegate.setOptions === 'function') {
      this.delegate.setOptions(options);
    }
  }

  onResults(callback: (results: any) => void) {
    this.resultsCallback = callback;
    if (!this.delegate) {
      this.initDelegate();
    }
    if (this.delegate && typeof this.delegate.onResults === 'function') {
      this.delegate.onResults(callback);
    }
  }

  async send(data: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }) {
    if (!this.delegate) {
      this.initDelegate();
    }
    if (this.delegate && typeof this.delegate.send === 'function') {
      return this.delegate.send(data);
    }
    return Promise.resolve();
  }

  close() {
    if (this.delegate && typeof this.delegate.close === 'function') {
      this.delegate.close();
    }
    this.delegate = null;
    this.resultsCallback = null;
  }

  reset() {
    if (this.delegate && typeof this.delegate.reset === 'function') {
      this.delegate.reset();
    }
  }
}

export default {
  FaceMesh,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
};
