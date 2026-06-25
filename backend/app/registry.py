import os
import json
from datetime import datetime

class ModelRegistry:
    """
    Manages the local database of registered AI model weights.
    Stored as JSON metadata in backend/data/registry.json
    """

    def __init__(self, data_dir="backend/data"):
        self.data_dir = data_dir
        self.file_path = os.path.join(data_dir, "registry.json")
        os.makedirs(os.path.join(data_dir, "models"), exist_ok=True)
        
        # Initialize default database if missing
        if not os.path.exists(self.file_path):
            self._write_db(self._get_defaults())

    def _get_defaults(self):
        return [
            {
                "id": "m1",
                "name": "YOLOv8n-RoadDamage.onnx",
                "type": "Segmentation",
                "framework": "ONNX",
                "input_resolution": "640x640",
                "channels": 3,
                "normalization": "0-1 Norm",
                "classes": ["pothole", "crack"],
                "outputs": {"masks": True, "lanes": False},
                "fileSize": "12.4 MB",
                "uploadDate": "2026-06-23 15:40",
                "status": "Active"
            },
            {
                "id": "m2",
                "name": "ResNet50-LaneDetection.pt",
                "type": "Lane Detection",
                "framework": "PyTorch",
                "input_resolution": "1280x720",
                "channels": 3,
                "normalization": "Mean-Std Norm",
                "classes": ["lane_line"],
                "outputs": {"masks": False, "lanes": True},
                "fileSize": "98.2 MB",
                "uploadDate": "2026-06-22 11:20",
                "status": "Inactive"
            },
            {
                "id": "m3",
                "name": "ByteTrack-Vehicle.engine",
                "type": "Tracking",
                "framework": "TensorRT",
                "input_resolution": "1920x1080",
                "channels": 3,
                "normalization": "None",
                "classes": ["car", "truck", "bus", "motorcycle", "bicycle"],
                "outputs": {"masks": False, "lanes": False},
                "fileSize": "45.1 MB",
                "uploadDate": "2026-06-21 09:12",
                "status": "Active"
            },
            {
                "id": "m4",
                "name": "best.pt",
                "type": "Tracking",
                "framework": "PyTorch",
                "input_resolution": "640x640",
                "channels": 3,
                "normalization": "0-1 Norm",
                "classes": ["car", "truck", "bus", "motorcycle", "bicycle"],
                "outputs": {"masks": False, "lanes": False},
                "fileSize": "25.5 MB",
                "uploadDate": "2026-06-25 11:23",
                "status": "Active"
            },
            {
                "id": "m5",
                "name": "RDD_data_potholes.pt",
                "type": "Segmentation",
                "framework": "PyTorch",
                "input_resolution": "640x640",
                "channels": 3,
                "normalization": "0-1 Norm",
                "classes": ["pothole", "crack"],
                "outputs": {"masks": True, "lanes": False},
                "fileSize": "48.2 MB",
                "uploadDate": "2026-06-25 11:23",
                "status": "Active"
            }
        ]

    def _read_db(self):
        try:
            with open(self.file_path, 'r') as f:
                return json.load(f)
        except Exception:
            return self._get_defaults()

    def _write_db(self, db):
        with open(self.file_path, 'w') as f:
            json.dump(db, f, indent=2)

    def list_models(self, owner_user_id: str):
        db = self._read_db()
        # Seed default models for user if none exist for them
        user_models = [m for m in db if m.get("owner_user_id") == owner_user_id]
        if not user_models:
            defaults = self._get_defaults()
            for d in defaults:
                d["owner_user_id"] = owner_user_id
                # Generate unique ID for each user's models to isolate them
                d["id"] = f"m-{owner_user_id}-{d['id']}"
                db.append(d)
            self._write_db(db)
            user_models = [m for m in db if m.get("owner_user_id") == owner_user_id]
        return user_models

    def add_model(self, name: str, category: str, size: str, owner_user_id: str, resolution="640x640", framework=None, channels=3, normalization="None", classes=None, outputs=None) -> dict:
        db = self._read_db()
        
        # Deduce framework from extension if not specified
        ext = name.split('.')[-1].lower()
        if not framework:
            framework = "Custom"
            if ext in ['pt', 'pth']:
                framework = "PyTorch"
            elif ext == 'onnx':
                framework = "ONNX"
            elif ext == 'engine':
                framework = "TensorRT"

        new_model = {
            "id": f"model-{int(datetime.now().timestamp())}-{uuid_snippet(owner_user_id)}",
            "name": name,
            "type": category,
            "framework": framework,
            "input_resolution": resolution,
            "channels": int(channels),
            "normalization": normalization,
            "classes": classes or [],
            "outputs": outputs or {},
            "fileSize": size,
            "uploadDate": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "status": "Inactive",
            "owner_user_id": owner_user_id
        }
        db.append(new_model)
        self._write_db(db)
        return new_model

    def delete_model(self, model_id: str, owner_user_id: str) -> bool:
        db = self._read_db()
        initial_len = len(db)
        # Validate ownership before delete
        db = [m for m in db if not (m["id"] == model_id and m.get("owner_user_id") == owner_user_id)]
        self._write_db(db)
        return len(db) < initial_len

    def toggle_model_status(self, model_id: str, owner_user_id: str) -> bool:
        db = self._read_db()
        success = False
        for m in db:
            if m["id"] == model_id and m.get("owner_user_id") == owner_user_id:
                m["status"] = "Active" if m["status"] == "Inactive" else "Inactive"
                success = True
        self._write_db(db)
        return success

    def rename_model(self, model_id: str, new_name: str, owner_user_id: str) -> bool:
        db = self._read_db()
        success = False
        for m in db:
            if m["id"] == model_id and m.get("owner_user_id") == owner_user_id:
                m["name"] = new_name
                success = True
        self._write_db(db)
        return success

def uuid_snippet(user_id: str) -> str:
    return user_id.split("-")[-1] if "-" in user_id else user_id[:4]
