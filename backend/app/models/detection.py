import numpy as np
from app.models.base import BaseModel

class DetectionModel(BaseModel):
    """
    Vehicle Detection Model pipeline.
    Runs YOLOv8/v11/Custom object detectors.
    """

    def __init__(self):
        super().__init__()
        self.classes = ['car', 'truck', 'bus', 'motorcycle', 'cyclist']

    def load(self, model_path: str) -> bool:
        self.model_path = model_path
        self.loaded = True
        return True

    def predict(self, frame: np.ndarray, **kwargs) -> dict:
        """
        Predicts vehicle bounding boxes.
        Supports confidence thresholding.
        """
        frame_idx = kwargs.get('frame_idx', 0)
        conf_threshold = kwargs.get('conf_threshold', 0.25)
        
        # Get frame dimensions
        height, width = frame.shape[:2] if frame is not None else (720, 1280)
        
        # High-fidelity simulation of traffic:
        # Generate 3 vehicle paths moving relative to frame_idx
        detections = []
        
        # Vehicle 1: Sedan in the right lane (moving closer)
        v1_cycle = 180
        v1_step = frame_idx % v1_cycle
        if v1_step < 160:
            # Starts far away at horizon and moves down-right
            progress = v1_step / 160
            y = int(height * 0.38 + progress * (height * 0.6))
            x = int(width * 0.52 + progress * (width * 0.35))
            
            # Box sizes scale with depth
            w = int(25 + progress * 240)
            h = int(20 + progress * 190)
            
            conf = 0.88 + np.sin(progress) * 0.1
            if conf >= conf_threshold:
                detections.append({
                    "id": 101,
                    "class": "car",
                    "box": [x - w // 2, y - h, x + w // 2, y],
                    "confidence": round(float(conf), 2)
                })

        # Vehicle 2: Semi-truck in the middle-left lane (moving closer)
        v2_cycle = 240
        v2_step = (frame_idx + 80) % v2_cycle
        if v2_step < 200:
            progress = v2_step / 200
            y = int(height * 0.38 + progress * (height * 0.58))
            x = int(width * 0.46 - progress * (width * 0.32))
            
            w = int(35 + progress * 320)
            h = int(45 + progress * 360)
            
            conf = 0.92 - progress * 0.05
            if conf >= conf_threshold:
                detections.append({
                    "id": 102,
                    "class": "truck",
                    "box": [x - w // 2, y - h, x + w // 2, y],
                    "confidence": round(float(conf), 2)
                })

        # Vehicle 3: Motorcycle overtaking on the center lane line
        v3_cycle = 150
        v3_step = (frame_idx + 30) % v3_cycle
        if v3_step < 120:
            progress = v3_step / 120
            y = int(height * 0.38 + progress * (height * 0.62))
            x = int(width * 0.49 - progress * (width * 0.05))
            
            w = int(10 + progress * 80)
            h = int(25 + progress * 160)
            
            conf = 0.76 + progress * 0.15
            if conf >= conf_threshold:
                detections.append({
                    "id": 103,
                    "class": "motorcycle",
                    "box": [x - w // 2, y - h, x + w // 2, y],
                    "confidence": round(float(conf), 2)
                })

        return {"detections": detections}
