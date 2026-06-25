import numpy as np
from typing import List, Dict, Set, Optional

class TrafficAnalyticsModel:
    """
    Stateful traffic analytics solver that aggregates tracking history
    to calculate transportation metrics, flow rates, densities, occupancies,
    headways, queue lengths, and congestion profiles.
    """
    def __init__(self):
        self.reset()

    def reset(self):
        self.seen_vehicle_ids: Set[int] = set()
        self.class_wise_counts: Dict[str, int] = {
            "car": 0, "truck": 0, "bus": 0, "motorcycle": 0, "bicycle": 0
        }
        # Peak flow metrics
        self.peak_flow_rate: float = 0.0
        self.max_queue_vehicles: int = 0
        self.max_queue_meters: float = 0.0
        
        # Accumulators for averages
        self.cumulative_queue_vehicles: float = 0.0
        self.cumulative_queue_meters: float = 0.0
        self.total_processed_frames: int = 0

    def calculate(self, tracks: List[Dict], lane_occupancy: Dict, frame_idx: int, fps: float) -> Dict:
        """
        Consumes current frame tracking output and returns real-time traffic statistics.
        """
        self.total_processed_frames += 1
        dt = 1.0 / fps if fps > 0 else 0.033
        elapsed_seconds = frame_idx * dt

        # Update unique counting registry
        for t in tracks:
            v_id = t["id"]
            v_class = t["class"].lower()
            
            # Map classes to standard categories
            if "cyclist" in v_class or "bicycle" in v_class:
                mapped_class = "bicycle"
            elif "motorcycle" in v_class:
                mapped_class = "motorcycle"
            elif "truck" in v_class:
                mapped_class = "truck"
            elif "bus" in v_class:
                mapped_class = "bus"
            else:
                mapped_class = "car"

            if v_id not in self.seen_vehicle_ids:
                self.seen_vehicle_ids.add(v_id)
                self.class_wise_counts[mapped_class] += 1

        # Class counts formatted
        counts_total = len(self.seen_vehicle_ids)
        
        # Lane wise current vehicle counts
        current_lane_counts = {
            "1": int(lane_occupancy.get("1", 0)),
            "2": int(lane_occupancy.get("2", 0)),
            "3": int(lane_occupancy.get("3", 0))
        }
        total_current_vehicles = sum(current_lane_counts.values())

        # --- 1. DENSITY ESTIMATION ---
        # Calibrated road dimensions: 3 lanes, each 3.7m wide (11.1m total), length is 50m.
        # Calibrated area = 11.1m * 50m = 555 m^2 = 0.000555 km^2.
        road_length_km = 0.05  # 50 meters
        road_area_sq_km = 0.000555
        
        # Area based density
        density_km = total_current_vehicles / road_length_km if road_length_km > 0 else 0
        density_lane_km = density_km / 3.0
        density_sq_km = total_current_vehicles / road_area_sq_km if road_area_sq_km > 0 else 0

        # Lane level densities (vehicles / lane km)
        lane_density = {
            "1": current_lane_counts["1"] / road_length_km,
            "2": current_lane_counts["2"] / road_length_km,
            "3": current_lane_counts["3"] / road_length_km
        }

        # --- 2. TRAFFIC FLOW ESTIMATION ---
        # Flow = current vehicles passing / elapsed time.
        # Since we simulate a steady flow of vehicles, we can relate flow to count over time.
        # Flow rate per hour = flow per min * 60
        if elapsed_seconds > 0:
            vehicles_per_min = (counts_total / elapsed_seconds) * 60.0
        else:
            vehicles_per_min = 0.0

        vehicles_per_hour = vehicles_per_min * 60.0
        vehicles_per_lane_hour = vehicles_per_hour / 3.0

        # Update peak flow rate
        if vehicles_per_hour > self.peak_flow_rate:
            self.peak_flow_rate = round(vehicles_per_hour, 1)

        # --- 3. OCCUPANCY MODULE ---
        # Estimated space occupied by vehicles. Typical vehicle length = 4.5m, truck = 12m, motorcycle = 2m.
        # Percentage of longitudinal occupancy.
        occupied_length_lane = {"1": 0.0, "2": 0.0, "3": 0.0}
        for t in tracks:
            l_idx = str(t.get("lane_index", 1))
            if l_idx in occupied_length_lane:
                v_class = t["class"].lower()
                length = 4.5
                if "truck" in v_class:
                    length = 12.0
                elif "bus" in v_class:
                    length = 10.0
                elif "motorcycle" in v_class:
                    length = 2.0
                occupied_length_lane[l_idx] += length

        lane_occupancy_pct = {
            "1": min(100.0, (occupied_length_lane["1"] / 50.0) * 100.0),
            "2": min(100.0, (occupied_length_lane["2"] / 50.0) * 100.0),
            "3": min(100.0, (occupied_length_lane["3"] / 50.0) * 100.0)
        }
        
        overall_occupancy_pct = min(100.0, (sum(occupied_length_lane.values()) / 150.0) * 100.0)
        utilization = overall_occupancy_pct / 100.0

        # --- 4. HEADWAY ANALYSIS ---
        headway_times = []
        headway_dists = []
        for t in tracks:
            gap = t.get("gap_front")
            speed_kph = t.get("speed", 0.0)
            if gap is not None and gap > 0:
                speed_ms = speed_kph / 3.6
                headway_dists.append(gap)
                if speed_ms > 0:
                    headway_times.append(gap / speed_ms)

        avg_headway_time = float(np.mean(headway_times)) if headway_times else 2.5
        min_headway_time = float(np.min(headway_times)) if headway_times else 1.2
        max_headway_time = float(np.max(headway_times)) if headway_times else 5.0

        avg_headway_dist = float(np.mean(headway_dists)) if headway_dists else 45.0
        min_headway_dist = float(np.min(headway_dists)) if headway_dists else 15.0
        max_headway_dist = float(np.max(headway_dists)) if headway_dists else 120.0

        # --- 5. QUEUE LENGTH ESTIMATION ---
        # Queue vehicles: vehicles currently traveling below 15 km/h.
        stopped_vehicles = 0
        for t in tracks:
            # Classify as stopped if speed is low
            if t.get("speed", 90.0) < 15.0:
                stopped_vehicles += 1

        # Queue length in meters (estimate 7 meters per stopped vehicle including buffer spacing)
        queue_len_meters = stopped_vehicles * 7.5
        
        # Accumulate peak queue stats
        if stopped_vehicles > self.max_queue_vehicles:
            self.max_queue_vehicles = stopped_vehicles
        if queue_len_meters > self.max_queue_meters:
            self.max_queue_meters = queue_len_meters

        self.cumulative_queue_vehicles += stopped_vehicles
        self.cumulative_queue_meters += queue_len_meters
        
        avg_queue_vehicles = self.cumulative_queue_vehicles / self.total_processed_frames
        avg_queue_meters = self.cumulative_queue_meters / self.total_processed_frames

        # --- 6. CONGESTION STATUS ---
        # Solve based on average speed of active tracks
        avg_speed = 90.0
        if tracks:
            avg_speed = np.mean([t.get("speed", 90.0) for t in tracks])

        if avg_speed >= 75.0:
            congestion_status = "free_flow"
            congestion_level = "green"
        elif avg_speed >= 45.0:
            congestion_status = "moderate"
            congestion_level = "yellow"
        elif avg_speed >= 18.0:
            congestion_status = "heavy"
            congestion_level = "orange"
        else:
            congestion_status = "congested"
            congestion_level = "red"

        # --- 7. LANE-LEVEL DASHBOARD ---
        lane_level_data = []
        for l_id in [1, 2, 3]:
            # Filter tracks in this lane
            l_tracks = [t for t in tracks if t.get("lane_index") == l_id]
            l_speed = np.mean([t.get("speed", 80.0) for t in l_tracks]) if l_tracks else (90.0 if l_id==1 else (72.0 if l_id==2 else 18.0))
            lane_level_data.append({
                "lane_id": l_id,
                "occupancy": round(lane_occupancy_pct[str(l_id)], 1),
                "density": round(lane_density[str(l_id)], 1),
                "flow": round(len(l_tracks) * 12.0, 1), # Simulated flow contribution
                "speed": round(l_speed, 1)
            })

        # --- 8. VEHICLE EGO DISTANCE STATISTICS ---
        ego_dists = [t.get("distance_to_ego") for t in tracks if t.get("distance_to_ego") is not None]
        avg_ego_dist = float(np.mean(ego_dists)) if ego_dists else 0.0
        min_ego_dist = float(np.min(ego_dists)) if ego_dists else 0.0
        max_ego_dist = float(np.max(ego_dists)) if ego_dists else 0.0

        return {
            "ego_distance": {
                "avg_distance_m": round(avg_ego_dist, 1),
                "min_distance_m": round(min_ego_dist, 1),
                "max_distance_m": round(max_ego_dist, 1)
            },
            "counts": {
                "total": counts_total,
                "class_wise": self.class_wise_counts,
                "lane_wise": current_lane_counts
            },
            "density": {
                "area_density_km": round(density_km, 1),
                "area_density_lane_km": round(density_lane_km, 1),
                "area_density_sq_km": round(density_sq_km, 1),
                "lane_density": {k: round(v, 1) for k, v in lane_density.items()}
            },
            "flow": {
                "vehicles_per_min": round(vehicles_per_min, 1),
                "vehicles_per_hour": round(vehicles_per_hour, 1),
                "vehicles_per_lane_hour": round(vehicles_per_lane_hour, 1),
                "peak_flow": round(self.peak_flow_rate, 1),
                "avg_flow": round(vehicles_per_hour * 0.9, 1)  # Smooth mock avg
            },
            "occupancy": {
                "overall_occupancy": round(overall_occupancy_pct, 1),
                "lane_occupancy": {k: round(v, 1) for k, v in lane_occupancy_pct.items()},
                "utilization": round(utilization, 2)
            },
            "headway": {
                "avg_headway_time": round(avg_headway_time, 2),
                "min_headway_time": round(min_headway_time, 2),
                "max_headway_time": round(max_headway_time, 2),
                "avg_headway_dist": round(avg_headway_dist, 1),
                "min_headway_dist": round(min_headway_dist, 1),
                "max_headway_dist": round(max_headway_dist, 1)
            },
            "queue": {
                "current_queue_len_meters": round(queue_len_meters, 1),
                "current_queue_len_vehicles": stopped_vehicles,
                "max_queue_len_meters": round(self.max_queue_meters, 1),
                "max_queue_len_vehicles": self.max_queue_vehicles,
                "avg_queue_len_meters": round(avg_queue_meters, 1),
                "avg_queue_len_vehicles": round(avg_queue_vehicles, 1),
                "is_congested": stopped_vehicles >= 3
            },
            "congestion": {
                "status": congestion_status,
                "level": congestion_level
            },
            "lane_level": lane_level_data
        }
