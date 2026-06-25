import os
import json
from datetime import datetime

class InferenceHistory:
    """
    Manages the database of past inference jobs.
    Stored in backend/data/history.json
    """

    def __init__(self, data_dir="backend/data"):
        self.data_dir = data_dir
        self.file_path = os.path.join(data_dir, "history.json")
        os.makedirs(os.path.join(data_dir, "exports"), exist_ok=True)

        if not os.path.exists(self.file_path):
            self._write_db(self._get_defaults())

    def _get_defaults(self):
        return [
            {
                "id": "job-101",
                "name": "US-101 Lane Trace",
                "model_name": "ResNet50-LaneDetection.pt",
                "video_name": "highway_traffic.mp4",
                "date": "2026-06-22 14:15",
                "status": "Completed",
                "total_frames": 1200,
                "avg_fps": 32.4
            },
            {
                "id": "job-102",
                "name": "Pothole Scan Run 2",
                "model_name": "YOLOv8n-RoadDamage.onnx",
                "video_name": "pavement_distress_clip.mp4",
                "date": "2026-06-23 11:10",
                "status": "Completed",
                "total_frames": 840,
                "avg_fps": 41.2
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

    def list_jobs(self, owner_user_id: str):
        db = self._read_db()
        # Filter by owner_user_id (jobs loaded or seeded default jobs)
        user_jobs = [j for j in db if j.get("owner_user_id") == owner_user_id]
        if not user_jobs and owner_user_id:
            # Seed default job history for new user
            defaults = self._get_defaults()
            for d in defaults:
                d["owner_user_id"] = owner_user_id
                d["id"] = f"{owner_user_id}-{d['id']}"
                db.append(d)
            self._write_db(db)
            user_jobs = [j for j in db if j.get("owner_user_id") == owner_user_id]
        return user_jobs

    def add_job(self, name: str, model_name: str, video_name: str, total_frames: int, avg_fps: float, owner_user_id: str) -> dict:
        db = self._read_db()
        new_job = {
            "id": f"job-{int(datetime.now().timestamp())}",
            "name": name or f"Job {datetime.now().strftime('%y%m%d-%H%M%S')}",
            "model_name": model_name,
            "video_name": video_name,
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "status": "Completed",
            "total_frames": total_frames,
            "avg_fps": round(avg_fps, 1),
            "owner_user_id": owner_user_id
        }
        db.append(new_job)
        self._write_db(db)
        return new_job

    def delete_job(self, job_id: str, owner_user_id: str) -> bool:
        db = self._read_db()
        initial_len = len(db)
        # Validate ownership
        db = [j for j in db if not (j["id"] == job_id and j.get("owner_user_id") == owner_user_id)]
        self._write_db(db)
        return len(db) < initial_len
