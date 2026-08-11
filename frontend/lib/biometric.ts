export type FaceQualityResult = {
  qualityStatus:
    | 'PASS'
    | 'FACE_NOT_DETECTED'
    | 'MULTIPLE_FACES'
    | 'IMAGE_TOO_DARK'
    | 'IMAGE_TOO_BLURRY'
    | 'IMAGE_TOO_SMALL'
    | 'NO_CAMERA';
  faceCount: number;
  brightness: number;
  note?: string;
};

export async function captureVideoFrame(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to access canvas context.');
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export function analyzeFrame(canvas: HTMLCanvasElement): FaceQualityResult {
  const context = canvas.getContext('2d');
  if (!context) {
    return { qualityStatus: 'NO_CAMERA', faceCount: 0, brightness: 0, note: 'Camera frame unavailable.' };
  }

  const { width, height } = canvas;
  if (!width || !height) {
    return { qualityStatus: 'NO_CAMERA', faceCount: 0, brightness: 0, note: 'Camera frame unavailable.' };
  }

  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  let brightness = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    brightness += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
  }
  brightness = brightness / (pixels.length / 4);

  const minDimension = Math.min(width, height);
  if (minDimension < 320) {
    return { qualityStatus: 'IMAGE_TOO_SMALL', faceCount: 0, brightness, note: 'Move closer to the camera.' };
  }
  if (brightness < 45) {
    return { qualityStatus: 'IMAGE_TOO_DARK', faceCount: 0, brightness, note: 'Lighting is too dark.' };
  }

  return { qualityStatus: 'PASS', faceCount: 1, brightness, note: 'Demo quality check passed.' };
}

export async function detectFacesFromCanvas(canvas: HTMLCanvasElement) {
  const detector = typeof window !== 'undefined' ? (window as Window & { FaceDetector?: new () => { detect(image: HTMLCanvasElement): Promise<Array<{ boundingBox: DOMRectReadOnly }>> } }).FaceDetector : undefined;
  if (!detector) {
    return null;
  }
  try {
    const instance = new detector();
    return await instance.detect(canvas);
  } catch {
    return null;
  }
}

export async function runDemoLivenessCheck() {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return { passed: true, label: 'DEMO LIVENESS' as const };
}
