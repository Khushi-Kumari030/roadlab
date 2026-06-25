// Homography / Perspective projection math utilities for RoadLab

export interface Point2D {
  x: number;
  y: number;
}

export type HomographyMatrix = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export interface Calibration {
  id: string;
  name: string;
  created_at: string;
  image_points: Point2D[];
  world_points: Point2D[];
  gridWidth: number; // in meters
  gridHeight: number; // in meters
}

/**
 * Solves a system of 8 linear equations using Gaussian elimination.
 * A * h = B
 */
function solveLinearSystem(A: number[][], B: number[]): number[] | null {
  const n = 8;
  const M: number[][] = [];
  
  // Construct the augmented matrix [A | B]
  for (let i = 0; i < n; i++) {
    M.push([...A[i], B[i]]);
  }

  for (let i = 0; i < n; i++) {
    // Search for maximum pivot element in this column
    let maxEl = Math.abs(M[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxEl) {
        maxEl = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    // Check if pivot is zero (or near-zero) -> system is singular
    if (Math.abs(M[maxRow][i]) < 1e-9) {
      return null;
    }

    // Swap maximum row with current row
    const temp = M[maxRow];
    M[maxRow] = M[i];
    M[i] = temp;

    // Eliminate column elements in lower rows
    for (let k = i + 1; k < n; k++) {
      const c = -M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        if (i === j) {
          M[k][j] = 0;
        } else {
          M[k][j] += c * M[i][j];
        }
      }
    }
  }

  // Back substitution to solve
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let k = i - 1; k >= 0; k--) {
      M[k][n] -= M[k][i] * x[i];
    }
  }
  return x;
}

/**
 * Computes the 3x3 homography matrix mapping source points (pixels) to destination points (world meters).
 * @param src 4 corner points in pixel coordinates (clockwise from top-left)
 * @param dst 4 corner points in world coordinates (clockwise from top-left)
 */
export function computeHomography(src: Point2D[], dst: Point2D[]): HomographyMatrix | null {
  if (src.length !== 4 || dst.length !== 4) return null;

  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];

    // u_i = (h00*x + h01*y + h02) / (h20*x + h21*y + 1)
    // v_i = (h10*x + h11*y + h12) / (h20*x + h21*y + 1)
    // Row 2i: h00*x + h01*y + h02 - h20*x*u - h21*y*u = u
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    B.push(u);

    // Row 2i+1: h10*x + h11*y + h12 - h20*x*v - h21*y*v = v
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    B.push(v);
  }

  const h = solveLinearSystem(A, B);
  if (!h) return null;

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0]
  ];
}

/**
 * Projects a pixel point (x, y) into world coordinates using a homography matrix.
 */
export function projectPoint(p: Point2D, H: HomographyMatrix | null): Point2D {
  if (!H) return p; // Fallback to pixel units if matrix is not resolved
  
  const [row0, row1, row2] = H;
  const w = row2[0] * p.x + row2[1] * p.y + row2[2];
  
  // Guard against divide-by-zero
  if (Math.abs(w) < 1e-9) return { x: 0, y: 0 };
  
  const u = (row0[0] * p.x + row0[1] * p.y + row0[2]) / w;
  const v = (row1[0] * p.x + row1[1] * p.y + row1[2]) / w;
  
  return { x: u, y: v };
}

/**
 * Calculates Euclidean distance between two points.
 */
export function getDistance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculates the distance in world space.
 */
export function getRealDistance(p1: Point2D, p2: Point2D, H: HomographyMatrix | null): number {
  if (!H) {
    // Simple pixel-to-meter scaling if homography doesn't exist
    return getDistance(p1, p2) * 0.05; // 1 pixel = 5cm mock scale
  }
  const wp1 = projectPoint(p1, H);
  const wp2 = projectPoint(p2, H);
  return getDistance(wp1, wp2);
}

/**
 * Calculates the polygon perimeter and area in world units.
 */
export function getPolygonMetrics(points: Point2D[], H: HomographyMatrix | null): { perimeter: number; area: number } {
  if (points.length < 3) return { perimeter: 0, area: 0 };

  const worldPoints = points.map(p => projectPoint(p, H));
  
  // Perimeter
  let perimeter = 0;
  for (let i = 0; i < worldPoints.length; i++) {
    const nextIdx = (i + 1) % worldPoints.length;
    perimeter += getDistance(worldPoints[i], worldPoints[nextIdx]);
  }

  // Shoelace formula for area
  let areaSum = 0;
  for (let i = 0; i < worldPoints.length; i++) {
    const nextIdx = (i + 1) % worldPoints.length;
    areaSum += worldPoints[i].x * worldPoints[nextIdx].y - worldPoints[nextIdx].x * worldPoints[i].y;
  }
  const area = Math.abs(areaSum) / 2.0;

  return { perimeter, area };
}

/**
 * Calculates the angle between three points (p1-p2-p3, where p2 is the vertex).
 * Returns angle in degrees.
 */
export function getAngle(p1: Point2D, p2: Point2D, p3: Point2D): number {
  const d12 = getDistance(p1, p2);
  const d23 = getDistance(p2, p3);
  const d13 = getDistance(p1, p3);

  if (d12 === 0 || d23 === 0) return 0;

  // Law of Cosines: c^2 = a^2 + b^2 - 2ab * cos(C)
  // cos(C) = (a^2 + b^2 - c^2) / 2ab
  let cosTheta = (Math.pow(d12, 2) + Math.pow(d23, 2) - Math.pow(d13, 2)) / (2 * d12 * d23);
  
  // Bound check for safety
  cosTheta = Math.max(-1, Math.min(1, cosTheta));
  
  const rad = Math.acos(cosTheta);
  return (rad * 180) / Math.PI;
}

/**
 * Inverts a 3x3 homography matrix.
 */
export function invertMatrix(M: HomographyMatrix | null): HomographyMatrix | null {
  if (!M) return null;
  const a = M[0][0], b = M[0][1], c = M[0][2];
  const d = M[1][0], e = M[1][1], f = M[1][2];
  const g = M[2][0], h = M[2][1], i = M[2][2];

  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1.0 / det;
  return [
    [
      (e * i - f * h) * invDet,
      (c * h - b * i) * invDet,
      (b * f - c * e) * invDet
    ],
    [
      (f * g - d * i) * invDet,
      (a * i - g * c) * invDet,
      (c * d - a * f) * invDet
    ],
    [
      (d * h - e * g) * invDet,
      (g * b - a * h) * invDet,
      (a * e - b * d) * invDet
    ]
  ];
}

/**
 * Projects a world coordinate (u, v) back to pixel coordinate (x, y).
 */
export function projectWorldToPixel(wp: { x: number; y: number }, H_inv: HomographyMatrix | null): Point2D {
  if (!H_inv) return wp; // Fallback
  const [row0, row1, row2] = H_inv;
  const w = row2[0] * wp.x + row2[1] * wp.y + row2[2];
  if (Math.abs(w) < 1e-9) return { x: 0, y: 0 };
  const x = (row0[0] * wp.x + row0[1] * wp.y + row0[2]) / w;
  const y = (row1[0] * wp.x + row1[1] * wp.y + row1[2]) / w;
  return { x, y };
}

function ccw(A: Point2D, B: Point2D, C: Point2D): boolean {
  return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

export function lineSegmentsIntersect(A: Point2D, B: Point2D, C: Point2D, D: Point2D): boolean {
  return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

export function getCrossingDirection(lp1: Point2D, lp2: Point2D, pPrev: Point2D, pCurr: Point2D): number {
  const lx = lp2.x - lp1.x;
  const ly = lp2.y - lp1.y;
  const nx = -ly;
  const ny = lx;
  const mx = pCurr.x - pPrev.x;
  const my = pCurr.y - pPrev.y;
  const dot = mx * nx + my * ny;
  return dot > 0 ? 1 : -1;
}
