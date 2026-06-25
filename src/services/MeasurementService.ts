import { type Point2D, type HomographyMatrix } from '../utils/calibrationMath';
import { HomographyService } from './HomographyService';
import { CalibrationService } from './CalibrationService';

export class MeasurementService {
  /**
   * Calculates Euclidean distance in pixel space.
   */
  public static getPixelDistance(p1: Point2D, p2: Point2D): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Calculates real distance in world space (meters) between two pixel coordinates.
   */
  public static getLineDistance(p1: Point2D, p2: Point2D, H: HomographyMatrix | null): number {
    if (!H) {
      // Pixel fallback (1px = 5cm)
      return this.getPixelDistance(p1, p2) * 0.05;
    }
    const wp1 = HomographyService.projectPoint(p1, H);
    const wp2 = HomographyService.projectPoint(p2, H);
    return Math.sqrt(Math.pow(wp2.x - wp1.x, 2) + Math.pow(wp2.y - wp1.y, 2));
  }

  /**
   * Computes the world-space area (sq meters), perimeter (meters), and bounding box of a polygon.
   */
  public static getPolygonAreaAndPerimeter(
    points: Point2D[],
    H: HomographyMatrix | null
  ): { area: number; perimeter: number; bbox: { minX: number; minY: number; maxX: number; maxY: number } } {
    if (points.length < 3) {
      return {
        area: 0,
        perimeter: 0,
        bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 }
      };
    }

    const worldPoints = points.map(pt => HomographyService.projectPoint(pt, H));

    // 1. Perimeter
    let perimeter = 0;
    for (let i = 0; i < worldPoints.length; i++) {
      const nextIdx = (i + 1) % worldPoints.length;
      const p1 = worldPoints[i];
      const p2 = worldPoints[nextIdx];
      perimeter += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    // 2. Shoelace Area
    let areaSum = 0;
    for (let i = 0; i < worldPoints.length; i++) {
      const nextIdx = (i + 1) % worldPoints.length;
      areaSum += worldPoints[i].x * worldPoints[nextIdx].y - worldPoints[nextIdx].x * worldPoints[i].y;
    }
    const area = Math.abs(areaSum) / 2.0;

    // 3. Bounding Box (in world coordinates)
    const xs = worldPoints.map(p => p.x);
    const ys = worldPoints.map(p => p.y);
    const bbox = {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys)
    };

    return { area, perimeter, bbox };
  }

  /**
   * Computes metric dimensions (width, height, area in meters) of a rectangle defined by two corner pixels.
   */
  public static getRectangleDimensions(
    p1: Point2D,
    p2: Point2D,
    H: HomographyMatrix | null
  ): { width: number; height: number; area: number } {
    // Determine 4 pixel corners of the aligned rectangle
    const tl = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) };
    const tr = { x: Math.max(p1.x, p2.x), y: Math.min(p1.y, p2.y) };
    const bl = { x: Math.min(p1.x, p2.x), y: Math.max(p1.y, p2.y) };

    if (!H) {
      // Mock resolution (1px = 5cm)
      const wPx = Math.abs(p2.x - p1.x);
      const hPx = Math.abs(p2.y - p1.y);
      const width = wPx * 0.05;
      const height = hPx * 0.05;
      return {
        width,
        height,
        area: width * height
      };
    }

    // Project corners to world space
    const wTl = HomographyService.projectPoint(tl, H);
    const wTr = HomographyService.projectPoint(tr, H);
    const wBl = HomographyService.projectPoint(bl, H);

    // Compute width and height in meters
    const width = Math.sqrt(Math.pow(wTr.x - wTl.x, 2) + Math.pow(wTr.y - wTl.y, 2));
    const height = Math.sqrt(Math.pow(wBl.x - wTl.x, 2) + Math.pow(wBl.y - wTl.y, 2));

    return {
      width,
      height,
      area: width * height
    };
  }

  /**
   * Calculates the angle in degrees between three points (p1-p2-p3, vertex at p2).
   */
  public static getAngle(p1: Point2D, p2: Point2D, p3: Point2D): number {
    const d12 = this.getPixelDistance(p1, p2);
    const d23 = this.getPixelDistance(p2, p3);
    const d13 = this.getPixelDistance(p1, p3);

    if (d12 === 0 || d23 === 0) return 0;

    let cosTheta = (Math.pow(d12, 2) + Math.pow(d23, 2) - Math.pow(d13, 2)) / (2 * d12 * d23);
    cosTheta = Math.max(-1, Math.min(1, cosTheta));
    
    return (Math.acos(cosTheta) * 180.0) / Math.PI;
  }

  /**
   * Resolves the spatial confidence score for a measurement based on its longitudinal depth (v axis).
   */
  public static getMeasurementConfidence(points: Point2D[], H: HomographyMatrix | null): number {
    if (points.length === 0) return 100.0;
    
    // Project all points to find the average depth (y coordinate representing world depth)
    let sumV = 0;
    points.forEach(pt => {
      const worldPt = HomographyService.projectPoint(pt, H);
      sumV += worldPt.y; // v value
    });
    
    const avgV = sumV / points.length;
    return CalibrationService.getSpatialResolutionDecay(avgV);
  }
}
