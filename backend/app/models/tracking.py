import numpy as np
import logging
from typing import List, Dict, Optional
from app.models.guard import InferenceReliabilityEngine

logger = logging.getLogger("RoadLabBackend.Tracking")

class TrackingModel:
    """
    Simulates a calibration-aware Multi-Object Tracker (ByteTrack/DeepSORT).
    Processes trajectories in world coordinates (meters) and maps them to pixels
    using the inverse homography matrix.
    """
    def __init__(self):
        # Default homography matrix (pixel -> world) based on standard grid:
        # Src pixels: (300,250), (500,250), (650,500), (150,500)
        # Dst world meters: (0,0), (3.7,0), (3.7,10), (0,10)
        self.default_H = np.array([
            [-2.64285714e-02,  2.85714286e-02,  7.14285714e+00],
            [-6.42857143e-03,  2.35714286e-02,  5.89285714e+00],
            [-1.71428571e-03,  7.14285714e-03,  1.00000000e+00]
        ])
        self.H = self.default_H
        self.H_inv = np.linalg.inv(self.default_H)

    def set_homography(self, H_list: Optional[List[List[float]]]):
        """Sets the active homography matrix and calculates its inverse."""
        if H_list and len(H_list) == 3 and len(H_list[0]) == 3:
            try:
                H = np.array(H_list, dtype=np.float64)
                self.H = H
                self.H_inv = np.linalg.inv(H)
                logger.info("Updated active tracking homography matrix and inverted successfully")
            except Exception as e:
                logger.warning(f"Failed to invert homography matrix: {e}. Using default.")
                self.H = self.default_H
                self.H_inv = np.linalg.inv(self.default_H)
        else:
            self.H = self.default_H
            self.H_inv = np.linalg.inv(self.default_H)

    def world_to_pixel(self, u: float, v: float) -> tuple:
        """Projects a world coordinate (u, v) back to pixel coordinate (x, y)."""
        w_vec = np.array([u, v, 1.0])
        p_vec = self.H_inv @ w_vec
        if abs(p_vec[2]) < 1e-9:
            return 0, 0
        x = p_vec[0] / p_vec[2]
        y = p_vec[1] / p_vec[2]
        return int(x), int(y)

    def pixel_to_world(self, x: float, y: float) -> tuple:
        """Projects a pixel coordinate (x, y) to world coordinate (u, v) in meters."""
        p_vec = np.array([x, y, 1.0])
        w_vec = self.H @ p_vec
        if abs(w_vec[2]) < 1e-9:
            return 0.0, 0.0
        u = w_vec[0] / w_vec[2]
        v = w_vec[1] / w_vec[2]
        return float(u), float(v)

    def predict_tracks(self, frame_idx: int, tracker_type: str, **kwargs) -> dict:
        """
        Simulates vehicle tracking.
        Generates 4 valid trajectories and injects invalid/foliage detections.
        Filters them dynamically using the InferenceReliabilityEngine.
        """
        raw_candidates = []
        events = []

        def get_heading(history):
            if len(history) < 2:
                return 180.0
            p1 = history[-2]
            p2 = history[-1]
            du = p2[0] - p1[0]
            dv = p2[1] - p1[1]
            angle_rad = np.arctan2(du, dv)
            angle_deg = np.degrees(angle_rad)
            return round(float(angle_deg), 1)
            
        fps = 30.0
        dt = 1.0 / fps
        conf_threshold = kwargs.get('conf_threshold', 0.4)
        width = kwargs.get('width', 1280)
        height = kwargs.get('height', 720)

        # Generate Road ROI dynamically
        road_roi = InferenceReliabilityEngine.generate_road_roi(self.H.tolist(), width, height)

        # Ego Vehicle is positioned at (u = 1.85m, v = 0m)
        ego_u, ego_v = 1.85, 0.0

        model_name = kwargs.get('model_name', '')
        is_best_pt = 'best' in model_name.lower()

        # --- Vehicle 101: Car in Ego Lane (Lane 1: u = 1.85) ---
        v1_speed_kph = 145.0 if is_best_pt else 90.0
        v1_speed_ms = v1_speed_kph / 3.6
        v1_start_v = 45.0
        v1_cycle = 45.0 / v1_speed_ms
        v1_frame_cycle = int(v1_cycle * fps)
        v1_progress_idx = frame_idx % v1_frame_cycle
        v1_v = v1_start_v - v1_speed_ms * (v1_progress_idx * dt)
        v1_u = 1.85
        
        v1_accel = 0.0
        if v1_v < 15.0:
            v1_speed_kph = (145.0 if is_best_pt else 90.0) - (15.0 - v1_v) * 2.0
            v1_speed_ms = v1_speed_kph / 3.6
            v1_accel = -2.0
        
        v1_history = []
        for i in range(max(0, v1_progress_idx - 30), v1_progress_idx + 1):
            hist_v = v1_start_v - v1_speed_ms * (i * dt)
            v1_history.append([float(v1_u), float(hist_v)])

        v1_px, v1_py = self.world_to_pixel(v1_u, v1_v)
        scale = max(0.1, 1.0 - (v1_v / 50.0))
        v1_w = int(25 + scale * 220)
        v1_h = int(20 + scale * 170)
        v1_box = [v1_px - v1_w // 2, v1_py - v1_h, v1_px + v1_w // 2, v1_py]

        if v1_v > 1.5:
            raw_candidates.append({
                "id": 101,
                "class": "car",
                "box": v1_box,
                "confidence": 0.94,
                "world_pos": [float(v1_u), float(v1_v)],
                "speed": round(v1_speed_kph, 1),
                "average_speed": 88.2,
                "max_speed": 91.0,
                "acceleration": round(v1_accel, 1),
                "track_age": v1_progress_idx,
                "lane_index": 1,
                "distance_to_ego": round(float(np.sqrt((v1_u - 1.85)**2 + v1_v**2)), 1),
                "heading": get_heading(v1_history),
                "history": v1_history
            })

            if v1_progress_idx == 0:
                events.append({"frame": frame_idx, "type": "entry", "message": "Vehicle #101 entered scene at 45.0m"})
            if v1_accel < -0.5 and v1_progress_idx % 60 == 0:
                events.append({"frame": frame_idx, "type": "deceleration", "message": "Vehicle #101 decelerating suddenly"})

        # --- Vehicle 102: Semi-truck in Left Lane (Lane 2: u = -1.85) ---
        v2_speed_kph = 105.0 if is_best_pt else 72.0
        v2_speed_ms = v2_speed_kph / 3.6
        v2_start_v = 38.0
        v2_cycle = 38.0 / v2_speed_ms
        v2_frame_cycle = int(v2_cycle * fps)
        v2_progress_idx = (frame_idx + 100) % v2_frame_cycle
        v2_v = v2_start_v - v2_speed_ms * (v2_progress_idx * dt)
        v2_u = -1.85
        
        v2_history = []
        for i in range(max(0, v2_progress_idx - 30), v2_progress_idx + 1):
            hist_v = v2_start_v - v2_speed_ms * (i * dt)
            v2_history.append([float(v2_u), float(hist_v)])

        v2_px, v2_py = self.world_to_pixel(v2_u, v2_v)
        scale2 = max(0.1, 1.0 - (v2_v / 50.0))
        v2_w = int(35 + scale2 * 300)
        v2_h = int(45 + scale2 * 340)
        v2_box = [v2_px - v2_w // 2, v2_py - v2_h, v2_px + v2_w // 2, v2_py]

        if v2_v > 2.0:
            raw_candidates.append({
                "id": 102,
                "class": "truck",
                "box": v2_box,
                "confidence": 0.91,
                "world_pos": [float(v2_u), float(v2_v)],
                "speed": round(v2_speed_kph, 1),
                "average_speed": 72.0,
                "max_speed": 72.0,
                "acceleration": 0.0,
                "track_age": v2_progress_idx,
                "lane_index": 2,
                "distance_to_ego": round(float(np.sqrt((v2_u - 1.85)**2 + v2_v**2)), 1),
                "heading": get_heading(v2_history),
                "history": v2_history
            })
            if v2_progress_idx == 0:
                events.append({"frame": frame_idx, "type": "entry", "message": "Vehicle #102 (Truck) entered scene at 38.0m"})

        # --- Vehicle 103: Motorcycle Overtaking / Changing Lanes ---
        v3_speed_kph = 160.0 if is_best_pt else 108.0
        v3_speed_ms = v3_speed_kph / 3.6
        v3_start_v = 50.0
        v3_cycle = 50.0 / v3_speed_ms
        v3_frame_cycle = int(v3_cycle * fps)
        v3_progress_idx = (frame_idx + 40) % v3_frame_cycle
        v3_v = v3_start_v - v3_speed_ms * (v3_progress_idx * dt)
        
        if 22.0 <= v3_v <= 32.0:
            t_lc = (32.0 - v3_v) / 10.0
            v3_u = 1.85 - t_lc * 3.7
            v3_lane = 0
        elif v3_v < 22.0:
            v3_u = -1.85
            v3_lane = 2
        else:
            v3_u = 1.85
            v3_lane = 1

        v3_history = []
        for i in range(max(0, v3_progress_idx - 30), v3_progress_idx + 1):
            hist_v = v3_start_v - v3_speed_ms * (i * dt)
            if 22.0 <= hist_v <= 32.0:
                t_hist = (32.0 - hist_v) / 10.0
                hist_u = 1.85 - t_hist * 3.7
            elif hist_v < 22.0:
                hist_u = -1.85
            else:
                hist_u = 1.85
            v3_history.append([float(hist_u), float(hist_v)])

        v3_px, v3_py = self.world_to_pixel(v3_u, v3_v)
        scale3 = max(0.1, 1.0 - (v3_v / 50.0))
        v3_w = int(12 + scale3 * 80)
        v3_h = int(24 + scale3 * 150)
        v3_box = [v3_px - v3_w // 2, v3_py - v3_h, v3_px + v3_w // 2, v3_py]

        if v3_v > 1.0:
            raw_candidates.append({
                "id": 103,
                "class": "motorcycle",
                "box": v3_box,
                "confidence": 0.88,
                "world_pos": [float(v3_u), float(v3_v)],
                "speed": round(v3_speed_kph, 1),
                "average_speed": 108.0,
                "max_speed": 112.5,
                "acceleration": 0.0,
                "track_age": v3_progress_idx,
                "lane_index": v3_lane,
                "distance_to_ego": round(float(np.sqrt((v3_u - 1.85)**2 + v3_v**2)), 1),
                "heading": get_heading(v3_history),
                "history": v3_history
            })

            if 21.8 <= v3_v <= 22.2:
                events.append({"frame": frame_idx, "type": "lane_change", "message": "Vehicle #103 completed lane change to Left Lane"})
            elif 31.8 <= v3_v <= 32.2:
                events.append({"frame": frame_idx, "type": "lane_change", "message": "Vehicle #103 initiated lane change from Ego Lane"})

        # --- Vehicle 104: Cyclist on Right Shoulder (Lane 3 edge: u = 5.2) ---
        v4_speed_kph = 18.0
        v4_speed_ms = v4_speed_kph / 3.6
        v4_start_v = 22.0
        v4_cycle = 22.0 / v4_speed_ms
        v4_frame_cycle = int(v4_cycle * fps)
        v4_progress_idx = (frame_idx + 180) % v4_frame_cycle
        v4_v = v4_start_v - v4_speed_ms * (v4_progress_idx * dt)
        v4_u = 5.2
        
        v4_history = []
        for i in range(max(0, v4_progress_idx - 30), v4_progress_idx + 1):
            hist_v = v4_start_v - v4_speed_ms * (i * dt)
            v4_history.append([float(v4_u), float(hist_v)])

        v4_px, v4_py = self.world_to_pixel(v4_u, v4_v)
        scale4 = max(0.1, 1.0 - (v4_v / 50.0))
        v4_w = int(10 + scale4 * 70)
        v4_h = int(22 + scale4 * 140)
        v4_box = [v4_px - v4_w // 2, v4_py - v4_h, v4_px + v4_w // 2, v4_py]

        if v4_v > 1.2:
            raw_candidates.append({
                "id": 104,
                "class": "cyclist",
                "box": v4_box,
                "confidence": 0.81,
                "world_pos": [float(v4_u), float(v4_v)],
                "speed": round(v4_speed_kph, 1),
                "average_speed": 18.0,
                "max_speed": 18.0,
                "acceleration": 0.0,
                "track_age": v4_progress_idx,
                "lane_index": 3,
                "distance_to_ego": round(float(np.sqrt((v4_u - 1.85)**2 + v4_v**2)), 1),
                "heading": get_heading(v4_history),
                "history": v4_history
            })

        # --- Inject physically impossible raw model detections ---
        # 1. Fly-away Car high in the sky (above horizon)
        sky_y = int(height * 0.12)
        raw_candidates.append({
            "id": 901,
            "class": "car",
            "box": [int(width * 0.45), sky_y, int(width * 0.52), sky_y + 40],
            "confidence": 0.78,
            "world_pos": [0.0, 75.0],
            "speed": 0.0,
            "average_speed": 0.0,
            "max_speed": 0.0,
            "acceleration": 0.0,
            "track_age": 10,
            "lane_index": 1,
            "distance_to_ego": 75.0,
            "heading": 180.0,
            "history": [[0.0, 75.0]]
        })

        # 2. Vegetation intrusion: random foliage detected as a truck
        tree_y = int(height * 0.32)
        raw_candidates.append({
            "id": 902,
            "class": "truck",
            "box": [20, tree_y, 90, tree_y + 60],
            "confidence": 0.62,
            "world_pos": [-15.0, 32.0],
            "speed": 0.0,
            "average_speed": 0.0,
            "max_speed": 0.0,
            "acceleration": 0.0,
            "track_age": 5,
            "lane_index": 2,
            "distance_to_ego": 32.0,
            "heading": 180.0,
            "history": [[-15.0, 32.0]]
        })

        # 3. Low confidence vehicle inside road boundaries
        raw_candidates.append({
            "id": 903,
            "class": "car",
            "box": [int(width * 0.35), int(height * 0.65), int(width * 0.45), int(height * 0.8)],
            "confidence": 0.15,
            "world_pos": [-1.0, 16.0],
            "speed": 80.0,
            "average_speed": 80.0,
            "max_speed": 80.0,
            "acceleration": 0.0,
            "track_age": 1,
            "lane_index": 2,
            "distance_to_ego": 16.0,
            "heading": 180.0,
            "history": [[-1.0, 16.0]]
        })

        # 4. Aspect Ratio Violator (e.g. narrow pole coordinates on building/shoulder)
        raw_candidates.append({
            "id": 904,
            "class": "car",
            "box": [int(width * 0.93), int(height * 0.5), int(width * 0.94), int(height * 0.85)],
            "confidence": 0.73,
            "world_pos": [9.0, 8.0],
            "speed": 0.0,
            "average_speed": 0.0,
            "max_speed": 0.0,
            "acceleration": 0.0,
            "track_age": 15,
            "lane_index": 3,
            "distance_to_ego": 10.0,
            "heading": 180.0,
            "history": [[9.0, 8.0]]
        })

        # 5. Out of bounds building intrusion (outside road ROI lateral limits)
        raw_candidates.append({
            "id": 905,
            "class": "car",
            "box": [5, int(height * 0.7), 160, int(height * 0.9)],
            "confidence": 0.85,
            "world_pos": [-11.5, 11.0],
            "speed": 0.0,
            "average_speed": 0.0,
            "max_speed": 0.0,
            "acceleration": 0.0,
            "track_age": 50,
            "lane_index": 2,
            "distance_to_ego": 13.0,
            "heading": 180.0,
            "history": [[-11.5, 11.0]]
        })

        # --- Run Validation Engine on all candidates ---
        tracks = []
        detections = []
        rejected_detections = []

        for cand in raw_candidates:
            is_valid, reason, filt_conf, q_score = InferenceReliabilityEngine.validate_vehicle(
                box=cand["box"],
                score=cand["confidence"],
                class_name=cand["class"],
                H_list=self.H.tolist(),
                road_roi=road_roi,
                width=width,
                height=height,
                conf_threshold=conf_threshold
            )
            
            if is_valid:
                cand["confidence"] = round(filt_conf, 2)
                cand["quality_score"] = round(q_score, 1)
                tracks.append(cand)
                detections.append({
                    "id": cand["id"],
                    "class": cand["class"],
                    "box": cand["box"],
                    "confidence": cand["confidence"],
                    "quality_score": cand["quality_score"]
                })
            else:
                rejected_detections.append({
                    "id": cand["id"],
                    "class": cand["class"],
                    "box": cand["box"],
                    "confidence": cand["confidence"],
                    "reason": reason
                })

        # --- Compute gaps based on accepted vehicles ---
        lanes_dict = {1: [], 2: [], 3: []}
        for track in tracks:
            l_idx = track["lane_index"]
            if l_idx in lanes_dict:
                lanes_dict[l_idx].append(track)

        for l_idx in lanes_dict:
            lanes_dict[l_idx].sort(key=lambda t: t["world_pos"][1])

        for l_idx, l_tracks in lanes_dict.items():
            for i, track in enumerate(l_tracks):
                track["gap_front"] = None
                track["gap_rear"] = None
                if i > 0:
                    front_car = l_tracks[i - 1]
                    gap_dist = track["world_pos"][1] - front_car["world_pos"][1]
                    track["gap_front"] = round(float(gap_dist), 1)
                if i < len(l_tracks) - 1:
                    rear_car = l_tracks[i + 1]
                    gap_dist = rear_car["world_pos"][1] - track["world_pos"][1]
                    track["gap_rear"] = round(float(gap_dist), 1)

        for i, track in enumerate(tracks):
            track["gap_lateral"] = None
            min_lat_dist = float('inf')
            t_u, t_v = track["world_pos"]
            for other in tracks:
                if other["id"] == track["id"]:
                    continue
                o_u, o_v = other["world_pos"]
                if abs(t_v - o_v) < 5.0:
                    lat_dist = abs(t_u - o_u)
                    if lat_dist < min_lat_dist:
                        min_lat_dist = lat_dist
            if min_lat_dist < float('inf'):
                track["gap_lateral"] = round(float(min_lat_dist), 1)

        # Identify Lead Vehicle (closest in Ego Lane 1)
        lead_vehicle = None
        ego_lane_tracks = lanes_dict[1]
        if len(ego_lane_tracks) > 0:
            closest_track = ego_lane_tracks[0]
            lead_dist = closest_track["world_pos"][1]
            lead_speed_ms = closest_track["speed"] / 3.6
            headway = lead_dist / lead_speed_ms if lead_speed_ms > 0 else 99.9
            lead_vehicle = {
                "id": closest_track["id"],
                "distance": round(float(lead_dist), 1),
                "relative_speed": round(float(closest_track["speed"] - 80.0), 1),
                "headway": round(float(headway), 2)
            }

        lane_occupancy = {
            "1": len(lanes_dict[1]),
            "2": len(lanes_dict[2]),
            "3": len(lanes_dict[3])
        }

        # Solve stats
        total_raw = len(raw_candidates)
        total_accepted = len(tracks)
        total_rejected = len(rejected_detections)
        acceptance_rate = (total_accepted / total_raw * 100.0) if total_raw > 0 else 100.0
        false_positive_rate = (total_rejected / total_raw * 100.0) if total_raw > 0 else 0.0

        detection_stats = {
            "raw_count": total_raw,
            "accepted_count": total_accepted,
            "rejected_count": total_rejected,
            "acceptance_rate": round(acceptance_rate, 1),
            "false_positive_rate": round(false_positive_rate, 1)
        }

        return {
            "tracks": tracks,
            "detections": detections,
            "rejected_detections": rejected_detections,
            "detection_stats": detection_stats,
            "lead_vehicle": lead_vehicle,
            "lane_occupancy": lane_occupancy,
            "events": events
        }
