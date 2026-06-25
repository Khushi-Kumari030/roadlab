import { type Point2D, type HomographyMatrix } from '../utils/calibrationMath';

export class HomographyService {
  /**
   * Solves a system of 8 linear equations using Gaussian elimination.
   */
  private static solveLinearSystem(A: number[][], B: number[]): number[] | null {
    const n = 8;
    const M: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      M.push([...A[i], B[i]]);
    }

    for (let i = 0; i < n; i++) {
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      if (Math.abs(M[maxRow][i]) < 1e-9) {
        return null;
      }

      const temp = M[maxRow];
      M[maxRow] = M[i];
      M[i] = temp;

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
   */
  public static compute(src: Point2D[], dst: Point2D[]): HomographyMatrix | null {
    if (src.length !== 4 || dst.length !== 4) return null;

    const A: number[][] = [];
    const B: number[] = [];

    for (let i = 0; i < 4; i++) {
      const { x, y } = src[i];
      const { x: u, y: v } = dst[i];

      A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
      B.push(u);

      A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
      B.push(v);
    }

    const h = this.solveLinearSystem(A, B);
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
  public static projectPoint(p: Point2D, H: HomographyMatrix | null): Point2D {
    if (!H) return { ...p };
    
    const [row0, row1, row2] = H;
    const w = row2[0] * p.x + row2[1] * p.y + row2[2];
    
    if (Math.abs(w) < 1e-9) return { x: 0, y: 0 };
    
    const u = (row0[0] * p.x + row0[1] * p.y + row0[2]) / w;
    const v = (row1[0] * p.x + row1[1] * p.y + row1[2]) / w;
    
    return { x: u, y: v };
  }

  /**
   * Projects a world coordinate (u, v) back to pixel coordinate (x, y).
   */
  public static projectWorldToPixel(wp: Point2D, H_inv: HomographyMatrix | null): Point2D {
    if (!H_inv) return { ...wp };
    const [row0, row1, row2] = H_inv;
    const w = row2[0] * wp.x + row2[1] * wp.y + row2[2];
    if (Math.abs(w) < 1e-9) return { x: 0, y: 0 };
    const x = (row0[0] * wp.x + row0[1] * wp.y + row0[2]) / w;
    const y = (row1[0] * wp.x + row1[1] * wp.y + row1[2]) / w;
    return { x, y };
  }

  /**
   * Inverts a 3x3 homography matrix.
   */
  public static invert(M: HomographyMatrix | null): HomographyMatrix | null {
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
}
