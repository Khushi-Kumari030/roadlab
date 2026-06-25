import numpy as np
from app.models.base import BaseModel

class SegmentationModel(BaseModel):
    """
    Semantic Segmentation Model pipeline.
    Runs Road / Pothole / Crack distress segmenters.
    """

    def __init__(self):
        super().__init__()

    def load(self, model_path: str) -> bool:
        self.model_path = model_path
        self.loaded = True
        return True

    def predict(self, frame: np.ndarray, **kwargs) -> dict:
        """
        Predicts segmentation boundaries as polygon coordinates.
        Supports road, pothole, and crack categories.
        """
        frame_idx = kwargs.get('frame_idx', 0)
        model_name = kwargs.get('model_name', '')
        is_rdd = 'rdd' in model_name.lower() or 'pothole' in model_name.lower()
        
        # Get frame dimensions
        height, width = frame.shape[:2] if frame is not None else (720, 1280)
        
        # Horizon height
        horizon_y = int(height * 0.38)
        
        # Curve offset to align with lane markers
        curve_factor = np.sin(frame_idx / 80.0) * 45.0
        
        segmentation = {}
        
        # 1. Base Road Drivable Area Mask
        # A trapezoid that curves with the lanes
        steps = 10
        left_bound = []
        right_bound = []
        
        for i in range(steps):
            t = i / (steps - 1)
            y = int(horizon_y + t * (height - horizon_y))
            sway = curve_factor * (1.0 - t) * 1.2
            
            # Left lane edge
            x_l = (width * 0.47) + (width * 0.15 - width * 0.47) * t + sway
            # Right lane edge
            x_r = (width * 0.53) + (width * 0.85 - width * 0.53) * t + sway
            
            left_bound.append([int(x_l), y])
            right_bound.append([int(x_r), y])
            
        # Combine to create closed loop polygon (Left down, then Right up)
        road_poly = left_bound + right_bound[::-1]
        
        segmentation["road"] = {
            "class": "road",
            "polygons": [road_poly],
            "opacity": 0.3,
            "color": "#0078D4" # Blue
        }

        # 2. Simulate Pothole Detection (appears periodically)
        pothole_cycle = 120 if is_rdd else 200
        pothole_step = (frame_idx + 80) % pothole_cycle if is_rdd else (frame_idx + 120) % pothole_cycle
        if pothole_step < (100 if is_rdd else 100):
            # Starts at horizon and moves down in center of lane
            progress = pothole_step / 100
            y = int(height * 0.4 + progress * (height * 0.5))
            x = int(width * 0.49 + curve_factor * (1.0 - progress) * 1.2)
            
            # Pothole gets larger as it approaches
            rx = int(25 + progress * 80) if is_rdd else int(10 + progress * 50)
            ry = int(15 + progress * 40) if is_rdd else int(6 + progress * 25)
            
            # Generate ellipse approximation coordinates
            ellipse_poly = []
            for angle in range(0, 360, 30):
                rad = np.deg2rad(angle)
                px = int(x + rx * np.cos(rad))
                py = int(y + ry * np.sin(rad))
                ellipse_poly.append([px, py])
                
            segmentation["pothole"] = {
                "class": "pothole",
                "polygons": [ellipse_poly],
                "opacity": 0.6,
                "color": "#D13438" # Red
            }

        # 3. Simulate Crack Distress Detection (long narrow lines)
        crack_cycle = 160
        crack_step = (frame_idx + 40) % crack_cycle
        if crack_step < 90:
            progress = crack_step / 90
            y_start = int(height * 0.45 + progress * (height * 0.45))
            x_start = int(width * 0.53 + curve_factor * (1.0 - progress) * 1.2)
            
            # Draw a jagged crack line coordinates
            crack_poly = []
            length = int(15 + progress * 80)
            for j in range(5):
                t_j = j / 4
                curr_y = int(y_start + t_j * length)
                # Add jagged deviations
                jag = int(np.sin(j * 2.0 + frame_idx) * (2 + progress * 8))
                curr_x = int(x_start + (width * 0.15) * t_j * progress + jag)
                crack_poly.append([curr_x, curr_y])
                
            segmentation["crack"] = {
                "class": "crack",
                "polygons": [crack_poly],
                "opacity": 0.75,
                "color": "#FFB900" # Yellow
            }

        return {"segmentation": segmentation}
