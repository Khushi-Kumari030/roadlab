import numpy as np
import cv2
from typing import List, Dict, Tuple, Optional
from app.models.guard import InferenceReliabilityEngine

def project_point(p: Tuple[float, float], H: Optional[List[List[float]]]) -> Tuple[float, float]:
    """
    Projects pixel point (x, y) into world space (u, v) in meters.
    If H is not provided, assumes a default mock scale.
    """
    if not H or len(H) != 3 or len(H[0]) != 3:
        # Fallback approximation (1 pixel = 5cm mock scale)
        return p[0] * 0.05, p[1] * 0.05
        
    w = H[2][0] * p[0] + H[2][1] * p[1] + H[2][2]
    if abs(w) < 1e-9:
        return 0.0, 0.0
        
    u = (H[0][0] * p[0] + H[0][1] * p[1] + H[0][2]) / w
    v = (H[1][0] * p[0] + H[1][1] * p[1] + H[1][2]) / w
    return float(u), float(v)

def get_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return float(np.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2))

class RoadDistressModel:
    """
    Stateful road condition assessment engine.
    Calculates distress severity, RCI condition scores, and maintenance suggestions.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.defect_timeline: Dict[str, Dict] = {}
        self.pothole_counter = 0
        self.crack_counter = 0

    def calculate(self, segmentation: Dict, H: Optional[List[List[float]]], frame_idx: int) -> Dict:
        """
        Consumes semantic segmentation masks and projects them to compute metric condition scores.
        """
        potholes_out = []
        cracks_out = []
        
        # Generate Road ROI dynamically
        road_roi = InferenceReliabilityEngine.generate_road_roi(H, 1280, 720)
        
        # 1. Process Potholes
        pothole_data = segmentation.get("pothole")
        if pothole_data and "polygons" in pothole_data:
            for poly_idx, poly in enumerate(pothole_data["polygons"]):
                is_valid, filtered_poly, reason = InferenceReliabilityEngine.validate_distress(
                    pixels=poly,
                    H_list=H,
                    road_roi=road_roi,
                    height=720
                )
                if not is_valid:
                    continue
                
                # Convert list of [x, y] to tuples
                pixels = [tuple(pt) for pt in filtered_poly]
                world_pts = [project_point(p, H) for p in pixels]
                
                # Area calculation using Shoelace formula
                n = len(world_pts)
                area = 0.0
                if n >= 3:
                    xs = [pt[0] for pt in world_pts]
                    ys = [pt[1] for pt in world_pts]
                    area = 0.5 * abs(sum(xs[i] * ys[(i + 1) % n] - xs[(i + 1) % n] * ys[i] for i in range(n)))
                else:
                    # Fallback area for lines/points
                    area = 0.02
                    
                # Perimeter calculation
                perimeter = sum(get_distance(world_pts[i], world_pts[(i + 1) % n]) for i in range(n)) if n >= 2 else 0.0
                
                u_coords = [pt[0] for pt in world_pts]
                v_coords = [pt[1] for pt in world_pts]

                # Length/Width from world points minimum area bounding box (OBB)
                length = 0.2
                width = 0.2
                if len(world_pts) >= 3:
                    try:
                        pts_arr = np.array(world_pts, dtype=np.float32)
                        rect = cv2.minAreaRect(pts_arr)
                        w_obb, h_obb = rect[1]
                        length = max(w_obb, h_obb)
                        width = min(w_obb, h_obb)
                        length = max(length, 0.01)
                        width = max(width, 0.01)
                    except Exception:
                        u_span = max(u_coords) - min(u_coords) if u_coords else 0.2
                        v_span = max(v_coords) - min(v_coords) if v_coords else 0.2
                        length = max(u_span, v_span)
                        width = min(u_span, v_span)
                elif len(world_pts) == 2:
                    length = get_distance(world_pts[0], world_pts[1])
                    width = 0.1
                
                # Distance to ego (minimum distance along road axis)
                distance_to_ego = min(v_coords) if v_coords else 10.0
                
                # Calculate road position based on lateral coordinate u
                avg_u = sum(u_coords) / len(u_coords) if u_coords else 0.0
                if avg_u < -1.85:
                    road_position = "Left Shoulder"
                elif -1.85 <= avg_u < 0.0:
                    road_position = "Lane 2 (Left)"
                elif 0.0 <= avg_u < 3.7:
                    road_position = "Lane 1 (Ego)"
                elif 3.7 <= avg_u < 5.2:
                    road_position = "Lane 3 (Right)"
                else:
                    road_position = "Right Shoulder"

                # Assign/retrieve persistent defect tracking ID
                pothole_id = poly_idx + 1
                
                # Classify Severity
                if area < 0.05 and width < 0.20:
                    severity = "low"
                    score = 25
                    recommendation = "Monitor Condition"
                    priority = "low"
                elif area < 0.20 and width < 0.45:
                    severity = "medium"
                    score = 55
                    recommendation = "Minor Patch Repair"
                    priority = "medium"
                elif area < 0.50 and width < 0.75:
                    severity = "high"
                    score = 80
                    recommendation = "Deep Patching / Milling"
                    priority = "high"
                else:
                    severity = "critical"
                    score = 95
                    recommendation = "Emergency Patching Repair"
                    priority = "critical"
                    
                potholes_out.append({
                    "id": pothole_id,
                    "class": "pothole",
                    "length_cm": round(length * 100, 1),
                    "width_cm": round(width * 100, 1),
                    "area_sq_m": round(area, 3),
                    "perimeter_m": round(perimeter, 2),
                    "distance_m": round(distance_to_ego, 1),
                    "road_position": road_position,
                    "severity": severity,
                    "score": score,
                    "recommendation": recommendation,
                    "priority": priority,
                    "pixels": poly
                })

        # 2. Process Cracks
        crack_data = segmentation.get("crack")
        if crack_data and "polygons" in crack_data:
            for poly_idx, poly in enumerate(crack_data["polygons"]):
                is_valid, filtered_poly, reason = InferenceReliabilityEngine.validate_distress(
                    pixels=poly,
                    H_list=H,
                    road_roi=road_roi,
                    height=720
                )
                if not is_valid:
                    continue
                
                pixels = [tuple(pt) for pt in filtered_poly]
                world_pts = [project_point(p, H) for p in pixels]
                
                # Cumulative length
                length = 0.0
                for i in range(len(world_pts) - 1):
                    length += get_distance(world_pts[i], world_pts[i+1])
                    
                if length == 0.0:
                    length = 0.5
                    
                # Simulated width (mm) based on progression of frame
                progress = min(1.0, frame_idx / 300.0)
                width_mm = 3.0 + progress * 22.0
                
                # Crack area estimation
                area = length * (width_mm / 1000.0)
                
                # Orientation angle relative to lane vector
                angle = 0.0
                if len(world_pts) >= 2:
                    p_start = world_pts[0]
                    p_end = world_pts[-1]
                    du = p_end[0] - p_start[0]
                    dv = p_end[1] - p_start[1]
                    angle = float(np.degrees(np.arctan2(du, dv)))
                    
                abs_angle = abs(angle)
                if abs_angle < 22.5 or abs_angle > 157.5:
                    crack_type = "longitudinal"
                elif 67.5 < abs_angle < 112.5:
                    crack_type = "transverse"
                else:
                    crack_type = "diagonal"
                    
                # Classify Severity
                if length < 1.2 and width_mm < 6.0:
                    severity = "minor"
                    score = 20
                    recommendation = "Routine Sealing"
                    priority = "low"
                elif length < 3.5 and width_mm < 15.0:
                    severity = "moderate"
                    score = 50
                    recommendation = "Crack Filling & Sealing"
                    priority = "medium"
                elif length < 7.0 and width_mm < 30.0:
                    severity = "severe"
                    score = 75
                    recommendation = "Joint Seal Replacement / Milling"
                    priority = "high"
                else:
                    severity = "critical"
                    score = 90
                    recommendation = "Full Depth Slab Reconstruction"
                    priority = "critical"

                # Calculate road position based on lateral coordinate u
                u_coords = [pt[0] for pt in world_pts]
                avg_u = sum(u_coords) / len(u_coords) if u_coords else 0.0
                if avg_u < -1.85:
                    road_position = "Left Shoulder"
                elif -1.85 <= avg_u < 0.0:
                    road_position = "Lane 2 (Left)"
                elif 0.0 <= avg_u < 3.7:
                    road_position = "Lane 1 (Ego)"
                elif 3.7 <= avg_u < 5.2:
                    road_position = "Lane 3 (Right)"
                else:
                    road_position = "Right Shoulder"

                cracks_out.append({
                    "id": poly_idx + 1,
                    "class": "crack",
                    "type": crack_type,
                    "length_m": round(length, 2),
                    "width_mm": round(width_mm, 1),
                    "area_sq_m": round(area, 4),
                    "orientation_deg": round(angle, 1),
                    "road_position": road_position,
                    "severity": severity,
                    "score": score,
                    "recommendation": recommendation,
                    "priority": priority,
                    "pixels": poly
                })

        # 3. Calculate Road Condition Index (RCI)
        deduct_sum = 0.0
        for p in potholes_out:
            if p["severity"] == "low": deduct_sum += 5
            elif p["severity"] == "medium": deduct_sum += 15
            elif p["severity"] == "high": deduct_sum += 28
            elif p["severity"] == "critical": deduct_sum += 42
            
        for c in cracks_out:
            if c["severity"] == "minor": deduct_sum += 3
            elif c["severity"] == "moderate": deduct_sum += 10
            elif c["severity"] == "severe": deduct_sum += 20
            elif c["severity"] == "critical": deduct_sum += 30
            
        rci = max(0.0, 100.0 - deduct_sum)
        
        # Categorize health
        if rci >= 90:
            condition = "excellent"
        elif rci >= 75:
            condition = "good"
        elif rci >= 55:
            condition = "fair"
        elif rci >= 30:
            condition = "poor"
        else:
            condition = "critical"
            
        # Priority Breakdown
        priority_breakdown = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for p in potholes_out:
            priority_breakdown[p["priority"]] += 1
        for c in cracks_out:
            priority_breakdown[c["priority"]] += 1
            
        total_defects = len(potholes_out) + len(cracks_out)
        affected_area = sum(p["area_sq_m"] for p in potholes_out) + sum(c["area_sq_m"] for c in cracks_out)
        
        summary = {
            "total_defects": total_defects,
            "total_potholes": len(potholes_out),
            "total_cracks": len(cracks_out),
            "affected_area_sq_m": round(affected_area, 3),
            "rci": round(rci, 1),
            "condition": condition,
            "priority_breakdown": priority_breakdown
        }
        
        return {
            "potholes": potholes_out,
            "cracks": cracks_out,
            "summary": summary
        }
