import { type Point2D, type HomographyMatrix, getRealDistance, getPolygonMetrics, getAngle, projectPoint, projectWorldToPixel } from '../utils/calibrationMath';

export interface UnifiedGeometry {
  id: string;
  image_coordinates: Point2D[];
  world_coordinates: Point2D[];
  measurement_data: {
    length?: number;
    width?: number;
    area?: number;
    perimeter?: number;
    angle?: number;
    speed?: number;
    acceleration?: number;
    heading?: number;
    distance_to_ego?: number;
    lane_position?: number;
  };
  metadata: {
    name: string;
    class_type: string; // 'vehicle' | 'lane' | 'distress' | 'measurement'
    [key: string]: any;
  };
}

export class GeometryService {
  /**
   * Projects a list of pixel points to world coordinates (in meters).
   */
  public static projectPoints(points: Point2D[], H: HomographyMatrix | null): Point2D[] {
    return points.map(pt => projectPoint(pt, H));
  }

  /**
   * Projects a list of world coordinates back to pixel coordinates.
   */
  public static worldToPixelPoints(points: Point2D[], H_inv: HomographyMatrix | null): Point2D[] {
    return points.map(pt => projectWorldToPixel(pt, H_inv));
  }

  /**
   * Compute world Euclidean distance between two pixel coordinates.
   */
  public static computeDistance(p1: Point2D, p2: Point2D, H: HomographyMatrix | null): number {
    return getRealDistance(p1, p2, H);
  }

  /**
   * Compute world Area and Perimeter for a set of polygon pixels.
   */
  public static computePolygonMetrics(points: Point2D[], H: HomographyMatrix | null): { area: number; perimeter: number } {
    return getPolygonMetrics(points, H);
  }

  /**
   * Compute Angle in degrees between three pixel coordinates.
   */
  public static computeAngle(p1: Point2D, p2: Point2D, p3: Point2D): number {
    return getAngle(p1, p2, p3);
  }

  /**
   * Convert pixel coordinates to world coordinates.
   */
  public static pixelToWorld(p: Point2D, H: HomographyMatrix | null): Point2D {
    return projectPoint(p, H);
  }

  /**
   * Convert world coordinates back to pixels.
   */
  public static worldToPixel(wp: Point2D, H_inv: HomographyMatrix | null): Point2D {
    return projectWorldToPixel(wp, H_inv);
  }

  /**
   * Transforms various RoadLab objects into the UnifiedGeometry format.
   */
  public static toUnifiedGeometry(
    object: any,
    classType: 'vehicle' | 'lane' | 'distress' | 'measurement',
    H: HomographyMatrix | null
  ): UnifiedGeometry {
    const id = String(object.id || `geom-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
    let image_coordinates: Point2D[] = [];
    let world_coordinates: Point2D[] = [];
    const measurement_data: UnifiedGeometry['measurement_data'] = {};
    const metadata: UnifiedGeometry['metadata'] = {
      name: object.name || `${classType}-${id}`,
      class_type: classType
    };

    if (classType === 'vehicle') {
      const box = object.box || [0, 0, 0, 0];
      image_coordinates = [
        { x: box[0], y: box[1] },
        { x: box[2], y: box[1] },
        { x: box[2], y: box[3] },
        { x: box[0], y: box[3] }
      ];

      const bottomCenterPixel = {
        x: (box[0] + box[2]) / 2.0,
        y: box[3]
      };
      
      const worldPos = object.world_pos || [0.0, 0.0];
      const worldPt = H 
        ? projectPoint(bottomCenterPixel, H)
        : { x: worldPos[0], y: worldPos[1] };

      world_coordinates = [worldPt];

      measurement_data.speed = object.speed || 0.0;
      measurement_data.acceleration = object.acceleration || 0.0;
      measurement_data.distance_to_ego = object.distance_to_ego || worldPt.y;
      measurement_data.lane_position = object.lane_index || 0;

      if (object.history && object.history.length >= 2) {
        const hist = object.history;
        const pStart = hist[hist.length - 2];
        const pEnd = hist[hist.length - 1];
        const du = pEnd[0] - pStart[0];
        const dv = pEnd[1] - pStart[1];
        measurement_data.heading = Math.round((Math.atan2(du, dv) * 180.0) / Math.PI);
      } else {
        measurement_data.heading = 0.0;
      }

      metadata.class = object.class || 'car';
      metadata.confidence = object.confidence || 1.0;
      metadata.history = object.history || [];

    } else if (classType === 'lane') {
      image_coordinates = (object.points || []).map((pt: any) => 
        Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt
      );
      world_coordinates = this.projectPoints(image_coordinates, H);

      let len = 0;
      for (let i = 0; i < world_coordinates.length - 1; i++) {
        const p1 = world_coordinates[i];
        const p2 = world_coordinates[i + 1];
        len += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      }
      
      measurement_data.length = len;
      measurement_data.width = object.lane_width || 3.7;

      metadata.is_ego = !!object.is_ego;
      metadata.confidence = object.confidence || 0.9;

    } else if (classType === 'distress') {
      image_coordinates = (object.pixels || []).map((pt: any) => 
        Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt
      );
      world_coordinates = this.projectPoints(image_coordinates, H);

      measurement_data.area = object.area_sq_m || 0.0;
      measurement_data.length = object.length_m || (object.length_cm ? object.length_cm / 100.0 : 0.0);
      measurement_data.width = object.width_mm ? object.width_mm / 1000.0 : (object.width_cm ? object.width_cm / 100.0 : 0.0);
      measurement_data.distance_to_ego = object.distance_m || 10.0;

      metadata.class = object.class || 'pothole';
      metadata.severity = object.severity || 'medium';
      metadata.recommendation = object.recommendation || '';
      metadata.priority = object.priority || 'medium';
      metadata.score = object.score || 0;
      metadata.type = object.type || '';

    } else if (classType === 'measurement') {
      image_coordinates = object.points || [];
      world_coordinates = this.projectPoints(image_coordinates, H);

      metadata.type = object.type || 'line';
      metadata.value = object.value || '';
    }

    return {
      id,
      image_coordinates,
      world_coordinates,
      measurement_data,
      metadata
    };
  }
}
export default GeometryService;
