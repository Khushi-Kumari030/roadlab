import numpy as np
from typing import List, Tuple, Dict, Optional

def project_point(p: Tuple[float, float], H: Optional[np.ndarray]) -> Tuple[float, float]:
    """
    Projects pixel point (x, y) into world space (u, v) in meters.
    """
    if H is None:
        return p[0] * 0.05, p[1] * 0.05
        
    w = H[2][0] * p[0] + H[2][1] * p[1] + H[2][2]
    if abs(w) < 1e-9:
        return 0.0, 0.0
        
    u = (H[0][0] * p[0] + H[0][1] * p[1] + H[0][2]) / w
    v = (H[1][0] * p[0] + H[1][1] * p[1] + H[1][2]) / w
    return float(u), float(v)

class InferenceReliabilityEngine:
    """
    Centralized calibration-aware and ROI-aware execution guard.
    Applies analytical horizon filters, class-aware physical dimensions checks,
    and dynamic ROI clipping.
    """

    @staticmethod
    def point_in_polygon(x: float, y: float, poly: List[List[int]]) -> bool:
        """
        Ray-casting algorithm to determine if point (x, y) is inside a polygon.
        """
        if not poly or len(poly) < 3:
            return True # If ROI is empty, default to True (don't filter everything out)
        num = len(poly)
        j = num - 1
        c = False
        for i in range(num):
            if ((poly[i][1] > y) != (poly[j][1] > y)) and \
                    (x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1] + 1e-9) + poly[i][0]):
                c = not c
            j = i
        return c

    @classmethod
    def generate_road_roi(cls, H_list: Optional[List[List[float]]], width: int, height: int) -> List[List[int]]:
        """
        Dynamically generates the Road ROI polygon in pixel space using Homography projection.
        Maps a 20m x 50m world space road grid back to pixel coordinates.
        """
        if H_list and len(H_list) == 3 and len(H_list[0]) == 3:
            try:
                H = np.array(H_list, dtype=np.float64)
                H_inv = np.linalg.inv(H)
                
                # Define road boundaries in world coordinates:
                # Lateral (u): -10m to 10m (total 20m width)
                # Longitudinal (v): 1.5m (close to camera) to 50.0m (distance)
                world_roi = [
                    [-10.0, 1.5],   # Bottom Left
                    [10.0, 1.5],    # Bottom Right
                    [6.0, 50.0],    # Top Right (narrower due to perspective convergence)
                    [-6.0, 50.0]    # Top Left (narrower due to perspective convergence)
                ]
                
                pixel_roi = []
                for pt in world_roi:
                    # Project from world (u, v) -> pixel (x, y)
                    w_vec = np.array([pt[0], pt[1], 1.0])
                    p_vec = H_inv @ w_vec
                    if abs(p_vec[2]) > 1e-9:
                        px = int(p_vec[0] / p_vec[2])
                        py = int(p_vec[1] / p_vec[2])
                        # Clamp to frame boundary margins
                        px = max(-200, min(width + 200, px))
                        py = max(0, min(height, py))
                        pixel_roi.append([px, py])
                
                if len(pixel_roi) == 4:
                    return pixel_roi
            except Exception:
                pass
                
        # Fallback to default trapezoid if no Homography is available
        horizon_y = int(height * 0.38)
        return [
            [int(width * 0.05), height],          # Bottom-Left
            [int(width * 0.95), height],          # Bottom-Right
            [int(width * 0.58), horizon_y + 10],  # Top-Right
            [int(width * 0.42), horizon_y + 10]   # Top-Left
        ]

    @classmethod
    def is_above_horizon(cls, pt: Tuple[float, float], H_list: Optional[List[List[float]]], height: int) -> bool:
        """
        Determines if a pixel point is above the horizon line.
        If Homography is available, utilizes the analytical denominator.
        """
        if H_list and len(H_list) == 3 and len(H_list[0]) == 3:
            # Analytical horizon condition: denominator row w = h31*x + h32*y + h33 <= 0.05
            w = H_list[2][0] * pt[0] + H_list[2][1] * pt[1] + H_list[2][2]
            return w <= 0.05
            
        # Fallback to hardcoded percentage if H is not available
        return pt[1] < height * 0.38

    @classmethod
    def validate_vehicle(
        cls, 
        box: List[int], 
        score: float, 
        class_name: str, 
        H_list: Optional[List[List[float]]], 
        road_roi: List[List[int]], 
        width: int, 
        height: int,
        conf_threshold: float
    ) -> Tuple[bool, str, float, float]:
        """
        Performs vehicle validation.
        Returns (is_valid, reject_reason, filtered_confidence, quality_score).
        """
        # 1. Base threshold checks
        if score < conf_threshold:
            return False, f"Confidence below threshold ({score:.2f} < {conf_threshold:.2f})", 0.0, 0.0
            
        x1, y1, x2, y2 = box
        box_w = x2 - x1
        box_h = y2 - y1
        pixel_area = box_w * box_h
        aspect_ratio = float(box_w) / float(box_h + 1e-9)
        
        # 2. Position checks relative to Horizon
        center_pt = ((x1 + x2) / 2.0, (y1 + y2) / 2.0)
        if cls.is_above_horizon(center_pt, H_list, height):
            return False, "Object detected above the horizon line (sky region)", 0.0, 0.0
            
        # 3. Dynamic Road ROI Membership check
        bottom_center = ((x1 + x2) / 2.0, float(y2))
        if not cls.point_in_polygon(bottom_center[0], bottom_center[1], road_roi):
            # Outside road boundaries is classified as building/vegetation intrusion
            if bottom_center[1] < height * 0.55 and (bottom_center[0] < width * 0.25 or bottom_center[0] > width * 0.75):
                return False, "Object detected outside road ROI (vegetation region)", 0.0, 0.0
            return False, "Object detected outside road ROI (building/shoulder region)", 0.0, 0.0

        # 4. Class-aware size & shape validation
        c_name = class_name.lower()
        
        # Default pixel area limit
        min_pixel_area = 250
        if "truck" in c_name or "bus" in c_name:
            min_pixel_area = 500
        elif "motorcycle" in c_name or "bicycle" in c_name or "cyclist" in c_name:
            min_pixel_area = 120

        if pixel_area < min_pixel_area:
            # Let far-away objects remain valid if they pass the homography world check!
            # If we don't have homography, we reject.
            if not H_list:
                return False, f"Object area too small ({pixel_area}px < {min_pixel_area}px)", 0.0, 0.0

        # 5. Calibration-aware physical width validation
        H = np.array(H_list, dtype=np.float64) if (H_list and len(H_list) == 3) else None
        u_bl, v_bl = project_point((float(x1), float(y2)), H)
        u_br, v_br = project_point((float(x2), float(y2)), H)
        physical_width = float(np.sqrt((u_br - u_bl)**2 + (v_br - v_bl)**2))
        
        # Aspect ratio validation limits
        min_ar, max_ar = 0.3, 3.0
        min_pw, max_pw = 0.5, 3.5 # Physical width limits (meters)
        nominal_width = 1.8
        
        if "truck" in c_name or "bus" in c_name:
            min_ar, max_ar = 0.35, 3.5
            min_pw, max_pw = 1.4, 4.5
            nominal_width = 2.5
        elif "motorcycle" in c_name:
            min_ar, max_ar = 0.15, 1.5
            min_pw, max_pw = 0.2, 1.6
            nominal_width = 0.75
        elif "cyclist" in c_name or "bicycle" in c_name:
            min_ar, max_ar = 0.15, 1.5
            min_pw, max_pw = 0.2, 1.6
            nominal_width = 0.6
        else: # Car
            min_ar, max_ar = 0.4, 2.5
            min_pw, max_pw = 0.8, 3.0
            nominal_width = 1.8
            
        if not (min_ar <= aspect_ratio <= max_ar):
            return False, f"Invalid aspect ratio ({aspect_ratio:.2f} is outside [{min_ar}, {max_ar}])", 0.0, 0.0
            
        if H_list and not (min_pw <= physical_width <= max_pw):
            return False, f"Plausibility failure: physical width {physical_width:.2f}m is outside [{min_pw}, {max_pw}]m", 0.0, 0.0

        # 6. Quality and Confidence Calibration
        # Distant objects (large v_coords) have lower spatial resolution, so we apply a distance calibration factor
        distance_v = max(v_bl, v_br)
        distance_factor = max(0.5, min(1.0, 1.0 - (distance_v / 70.0) * 0.4))
        
        filtered_confidence = score * distance_factor
        
        # Calculate Quality Score (1-10)
        # Penalize if physical width deviates from nominal width
        width_deviation = abs(physical_width - nominal_width) / nominal_width if H_list else 0.0
        geom_score = max(0.0, 10.0 - width_deviation * 15.0)
        
        # Proximity to horizon penalty (if w is close to 0.05, decrease quality)
        w_center = H_list[2][0] * center_pt[0] + H_list[2][1] * center_pt[1] + H_list[2][2] if H_list else 0.5
        roi_score = max(2.0, min(10.0, (w_center / 0.5) * 10.0))
        
        quality_score = (score * 0.4 + (geom_score / 10.0) * 0.3 + (roi_score / 10.0) * 0.3) * 10.0
        quality_score = max(1.0, min(10.0, quality_score))

        return True, "Accepted", float(filtered_confidence), float(quality_score)

    @classmethod
    def validate_lane(
        cls, 
        points: List[List[int]], 
        H_list: Optional[List[List[float]]], 
        road_roi: List[List[int]],
        height: int
    ) -> Tuple[bool, List[List[int]], str]:
        """
        Validates and clips a lane candidate.
        Returns (is_valid, filtered_points, reject_reason).
        """
        filtered_points = []
        for pt in points:
            # Check horizon
            if cls.is_above_horizon((float(pt[0]), float(pt[1])), H_list, height):
                continue
            # Check road ROI membership
            if not cls.point_in_polygon(pt[0], pt[1], road_roi):
                continue
            filtered_points.append(pt)
            
        if len(filtered_points) < 2:
            return False, [], "Lane candidate fails perspective layout: outside road ROI / above horizon"
            
        return True, filtered_points, "Accepted"

    @classmethod
    def validate_distress(
        cls, 
        pixels: List[List[int]], 
        H_list: Optional[List[List[float]]], 
        road_roi: List[List[int]],
        height: int
    ) -> Tuple[bool, List[List[int]], str]:
        """
        Validates and clips pavement distress segment pixels.
        Returns (is_valid, filtered_pixels, reject_reason).
        """
        filtered_pixels = []
        for pt in pixels:
            # Must remain below horizon
            if cls.is_above_horizon((float(pt[0]), float(pt[1])), H_list, height):
                continue
            # Must remain inside Road ROI
            if not cls.point_in_polygon(pt[0], pt[1], road_roi):
                continue
            filtered_pixels.append(pt)
            
        if len(filtered_pixels) < 3:
            return False, [], "Pavement distress segment lies outside drivable surfaces"
            
        return True, filtered_pixels, "Accepted"
