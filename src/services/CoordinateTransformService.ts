import { type Point2D, type HomographyMatrix } from '../utils/calibrationMath';
import { HomographyService } from './HomographyService';

export class CoordinateTransformService {
  /**
   * Projects a pixel coordinate (x, y) into world coordinates (u, v) in meters.
   */
  public static pixelToWorld(p: Point2D, H: HomographyMatrix | null): Point2D {
    return HomographyService.projectPoint(p, H);
  }

  /**
   * Projects a world coordinate (u, v) back to pixel coordinate (x, y).
   */
  public static worldToPixel(wp: Point2D, H_inv: HomographyMatrix | null): Point2D {
    return HomographyService.projectWorldToPixel(wp, H_inv);
  }

  /**
   * Scales a meter value to the active display unit.
   */
  public static toActiveUnit(valMeters: number, unit: 'm' | 'cm'): number {
    if (unit === 'cm') {
      return valMeters * 100.0;
    }
    return valMeters;
  }

  /**
   * Converts a display unit value back to meters.
   */
  public static toRealWorldUnit(val: number, unit: 'm' | 'cm'): number {
    if (unit === 'cm') {
      return val / 100.0;
    }
    return val;
  }

  /**
   * Formats a world-meter value as a unit-aware string.
   */
  public static formatValue(valMeters: number, unit: 'm' | 'cm', decimals = 2): string {
    const scaledVal = this.toActiveUnit(valMeters, unit);
    return `${scaledVal.toFixed(decimals)} ${unit}`;
  }

  /**
   * Formats a speed value (given in km/h) as a unit-aware speed string.
   */
  public static formatSpeed(speedKph: number, speedUnit: 'km/h' | 'm/s'): string {
    if (speedUnit === 'm/s') {
      const mps = speedKph / 3.6;
      return `${mps.toFixed(1)} m/s`;
    }
    return `${speedKph.toFixed(1)} km/h`;
  }
}
