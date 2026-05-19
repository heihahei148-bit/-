import { FaceDetector, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const FACE_MIN_SCORE = 0.6;
const HAND_MIN_SCORE = 0.6;
const FACE_BLUR_THRESHOLD = 42;
const HAND_BLUR_THRESHOLD = 36;
const MIN_EDGE = 420;

let visionFilesPromise;
let faceDetectorPromise;
let handLandmarkerPromise;

async function getVisionFiles() {
  if (!visionFilesPromise) {
    visionFilesPromise = FilesetResolver.forVisionTasks(WASM_BASE_URL);
  }

  return visionFilesPromise;
}

async function getFaceDetector() {
  if (!faceDetectorPromise) {
    faceDetectorPromise = (async () => {
      const vision = await getVisionFiles();
      return FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_MODEL_URL
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: FACE_MIN_SCORE,
        minSuppressionThreshold: 0.3
      });
    })();
  }

  return faceDetectorPromise;
}

async function getHandLandmarker() {
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = (async () => {
      const vision = await getVisionFiles();
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HAND_MODEL_URL
        },
        runningMode: 'IMAGE',
        numHands: 1,
        minHandDetectionConfidence: HAND_MIN_SCORE,
        minHandPresenceConfidence: HAND_MIN_SCORE,
        minTrackingConfidence: HAND_MIN_SCORE
      });
    })();
  }

  return handLandmarkerPromise;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败，请重新上传。'));
    };

    image.src = url;
  });
}

function measureSharpness(image) {
  const sampleWidth = Math.min(256, image.naturalWidth || image.width || 256);
  const scale = sampleWidth / (image.naturalWidth || image.width || sampleWidth);
  const sampleHeight = Math.max(1, Math.round((image.naturalHeight || image.height || sampleWidth) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return 0;
  }

  ctx.drawImage(image, 0, 0, sampleWidth, sampleHeight);

  const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const gray = new Float32Array(sampleWidth * sampleHeight);

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  let count = 0;
  let sum = 0;
  let sumSq = 0;

  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const idx = y * sampleWidth + x;
      const lap =
        -gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - sampleWidth] -
        gray[idx + sampleWidth] +
        4 * gray[idx];

      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (!count) {
    return 0;
  }

  const mean = sum / count;
  return sumSq / count - mean * mean;
}

function buildError(kind, reason) {
  const noun = kind === 'face' ? '人脸' : '手掌';
  return {
    ok: false,
    kind,
    message: `${reason} 请重新上传更清晰的${noun}照片。`
  };
}

export async function auditPhoto(file, kind) {
  try {
    const { image, url } = await loadImage(file);

    try {
      const width = image.naturalWidth || image.width || 0;
      const height = image.naturalHeight || image.height || 0;
      const sharpness = measureSharpness(image);
      const blurLimit = kind === 'face' ? FACE_BLUR_THRESHOLD : HAND_BLUR_THRESHOLD;

      if (width < MIN_EDGE || height < MIN_EDGE) {
        return buildError(kind, '图片太小，细节不够');
      }

      if (sharpness < blurLimit) {
        return buildError(kind, '图片有点糊，看不清细节');
      }

      if (kind === 'face') {
        const detector = await getFaceDetector();
        const result = detector.detect(image);
        const detection = result.detections?.[0];
        const score = detection?.categories?.[0]?.score || 0;

        if (!detection || score < FACE_MIN_SCORE) {
          return buildError(kind, '没有识别到清晰的人脸');
        }

        return {
          ok: true,
          kind,
          label: '人脸',
          message: '已识别为清晰人脸',
          width,
          height,
          sharpness,
          score
        };
      }

      const landmarker = await getHandLandmarker();
      const result = landmarker.detect(image);
      const handCount = result.landmarks?.length || 0;
      const score = result.handedness?.[0]?.[0]?.score || 0;

      if (!handCount || score < HAND_MIN_SCORE) {
        return buildError(kind, '没有识别到清晰的手掌');
      }

      return {
        ok: true,
        kind,
        label: '手掌',
        message: '已识别为清晰手掌',
        width,
        height,
        sharpness,
        score
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    return {
      ok: false,
      kind,
      message: error?.message || '图片校验失败，请重新上传。'
    };
  }
}

