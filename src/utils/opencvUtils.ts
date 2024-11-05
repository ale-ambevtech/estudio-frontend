import cv from '@techstark/opencv-js';

let isOpenCVInitialized = false;

export async function initOpenCV(timeout = 30000) {
  // Return immediately if already initialized
  if (isOpenCVInitialized) {
    console.log('OpenCV already initialized');
    return Promise.resolve();
  }

  // Check if cv.Mat is already available
  if (cv.Mat) {
    console.log('OpenCV is ready');
    isOpenCVInitialized = true;
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    console.log('Starting OpenCV initialization');
    
    // Set initialization flag before timeout
    cv.onRuntimeInitialized = () => {
      console.log('OpenCV runtime initialized');
      isOpenCVInitialized = true;
      resolve();
    };

    // Set timeout after onRuntimeInitialized
    setTimeout(() => {
      if (!isOpenCVInitialized) {
        console.error('OpenCV initialization timed out');
        reject(new Error('OpenCV initialization timed out'));
      }
    }, timeout);
  });
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function colorSegmentation(
  inputMat: cv.Mat,
  lowerColor: [number, number, number],
  upperColor: [number, number, number],
  minArea = 100,
  maxArea = 1000
): { resultMat: cv.Mat; boundingBoxes: BoundingBox[] } {
  const hsvMat = new cv.Mat();
  cv.cvtColor(inputMat, hsvMat, cv.COLOR_RGB2HSV);

  const lowerBound = new cv.Mat(1, 3, cv.CV_8UC3, new cv.Scalar(...lowerColor));
  const upperBound = new cv.Mat(1, 3, cv.CV_8UC3, new cv.Scalar(...upperColor));

  const mask = new cv.Mat();
  cv.inRange(hsvMat, lowerBound, upperBound, mask);

  // Apply morphological operations to remove noise
  const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
  const morphed = new cv.Mat();
  cv.morphologyEx(mask, morphed, cv.MORPH_CLOSE, kernel);
  cv.morphologyEx(morphed, morphed, cv.MORPH_OPEN, kernel);

  // Find contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(morphed, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const boundingBoxes: BoundingBox[] = [];

  // Filter contours based on area and create bounding boxes
  for (let i = 0; i < contours.size(); ++i) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);

    if (area >= minArea && area <= maxArea) {
      const rect = cv.boundingRect(cnt);
      boundingBoxes.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    }

    cnt.delete();
  }

  const result = new cv.Mat();
  cv.bitwise_and(inputMat, inputMat, result, morphed);

  // Clean up
  hsvMat.delete();
  lowerBound.delete();
  upperBound.delete();
  mask.delete();
  kernel.delete();
  morphed.delete();
  contours.delete();
  hierarchy.delete();

  return { resultMat: result, boundingBoxes };
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  const s = max === 0 ? 0 : (max - min) / max;
  const v = max;

  const d = max - min;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h! /= 6;
  }

  return [Math.round(h! * 180), Math.round(s * 255), Math.round(v * 255)];
}

// Add this new utility function
export function createOffscreenCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof window !== 'undefined' && 'OffscreenCanvas' in window) {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function detectShapes(
  inputMat: cv.Mat,
  shapes: string[],
  minArea: number,
  maxArea: number,
  shapeTolerance: number
): { resultMat: cv.Mat; boundingBoxes: BoundingBox[] } {
  const grayMat = new cv.Mat();
  cv.cvtColor(inputMat, grayMat, cv.COLOR_RGBA2GRAY);

  const blurredMat = new cv.Mat();
  cv.GaussianBlur(grayMat, blurredMat, new cv.Size(5, 5), 0);

  const edges = new cv.Mat();
  cv.Canny(blurredMat, edges, 50, 150);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const boundingBoxes: BoundingBox[] = [];
  const resultMat = inputMat.clone();

  for (let i = 0; i < contours.size(); ++i) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);

    if (area >= minArea && area <= maxArea) {
      const peri = cv.arcLength(cnt, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, shapeTolerance * peri, true);

      let shapeType = '';
      if (approx.rows === 3 && shapes.includes('triangle')) {
        shapeType = 'Triangle';
      } else if (approx.rows === 4 && shapes.includes('rectangle')) {
        shapeType = 'Rectangle';
      } else if (approx.rows > 4 && shapes.includes('circle')) {
        shapeType = 'Circle';
      }

      if (shapeType) {
        const rect = cv.boundingRect(cnt);
        boundingBoxes.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });

        // Draw the contour and label the shape
        cv.drawContours(resultMat, contours, i, new cv.Scalar(0, 255, 0), 2);
        cv.putText(
          resultMat,
          shapeType,
          new cv.Point(rect.x, rect.y - 5),
          cv.FONT_HERSHEY_SIMPLEX,
          0.5,
          new cv.Scalar(0, 255, 0),
          1
        );
      }

      approx.delete();
    }

    cnt.delete();
  }

  grayMat.delete();
  blurredMat.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();

  return { resultMat, boundingBoxes };
}

export function templateMatching(
  inputMat: cv.Mat,
  templateMat: cv.Mat,
  threshold: number = 0.8
): BoundingBox[] {
  if (!templateMat || templateMat.empty()) {
    console.warn('Template image is not valid');
    return [];
  }

  const result = new cv.Mat();
  const mask = new cv.Mat();
  
  cv.matchTemplate(inputMat, templateMat, result, cv.TM_CCOEFF_NORMED, mask);
  
  const boundingBoxes: BoundingBox[] = [];
  
  for (let y = 0; y < result.rows; y++) {
    for (let x = 0; x < result.cols; x++) {
      const value = result.floatAt(y, x);
      if (value > threshold) {
        boundingBoxes.push({
          x: x,
          y: y,
          width: templateMat.cols,
          height: templateMat.rows
        });
      }
    }
  }
  
  result.delete();
  mask.delete();
  
  return boundingBoxes;
}

export function detectPeople(
  inputMat: cv.Mat,
  minArea: number = 1000,
  maxArea: number = 100000
): { resultMat: cv.Mat; boundingBoxes: BoundingBox[] } {
  console.log('Iniciando detectPeople');
  const resultMat = inputMat.clone();
  const boundingBoxes: BoundingBox[] = [];

  try {
    // Converter para escala de cinza
    const gray = new cv.Mat();
    cv.cvtColor(inputMat, gray, cv.COLOR_RGBA2GRAY);

    // Criar o detector HOG
    const hog = new cv.HOGDescriptor();
    hog.setSVMDetector((cv as any).HOGDescriptor_getDefaultPeopleDetector());

    // Detectar pessoas
    const foundLocations = new cv.RectVector();
    const foundWeights = new cv.FloatVector();
    hog.detectMultiScale(gray, foundLocations, foundWeights);

    // Processar as detecções
    for (let i = 0; i < foundLocations.size(); i++) {
      const rect = foundLocations.get(i);
      const area = rect.width * rect.height;
      
      if (area >= minArea && area <= maxArea) {
        boundingBoxes.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        });

        // Desenhar o bounding box
        cv.rectangle(resultMat, 
          new cv.Point(rect.x, rect.y),
          new cv.Point(rect.x + rect.width, rect.y + rect.height),
          new cv.Scalar(0, 255, 0, 255), // Verde
          2 // Espessura da linha
        );
      }
    }

    console.log(`Pessoas detectadas: ${boundingBoxes.length}`);

    // Liberar memória
    gray.delete();
    foundLocations.delete();
    foundWeights.delete();

  } catch (error) {
    console.error('Erro em detectPeople:', error);
  }

  return { resultMat, boundingBoxes };
}
