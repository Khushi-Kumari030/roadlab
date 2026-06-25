import asyncio
import json
import logging
import numpy as np
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from datetime import datetime
from app.models.guard import InferenceReliabilityEngine

from app.registry import ModelRegistry
from app.history import InferenceHistory
from app.models.detection import DetectionModel
from app.models.lane import LaneModel
from app.models.segmentation import SegmentationModel
from app.models.tracking import TrackingModel
from app.models.analytics import TrafficAnalyticsModel
from app.models.distress import RoadDistressModel
from app.auth import UserDatabase

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RoadLabBackend")

# Auth Schemas
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    theme: Optional[str] = None
    units: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    user_id: str
    old_password: str
    new_password: str

app = FastAPI(title="RoadLab AI Inference Engine API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite development origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate Database managers
registry = ModelRegistry()
history = InferenceHistory()
auth_db = UserDatabase()

# Instantiate AI simulation processors
detection_engine = DetectionModel()
lane_engine = LaneModel()
segmentation_engine = SegmentationModel()
tracking_engine = TrackingModel()

# Pydantic schemas
class RenameRequest(BaseModel):
    name: str

class StartInferenceRequest(BaseModel):
    model_id: str
    video_name: str
    conf_threshold: float
    iou_threshold: float
    resolution: str
    device: str

# ----------------- 0. Authentication Endpoints -----------------

@app.post("/api/auth/signup")
async def signup(request: SignupRequest):
    user = auth_db.signup(request.name, request.email, request.password)
    if not user:
        raise HTTPException(status_code=400, detail="Email is already registered")
    return {"status": "success", "user": user}

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    user = auth_db.login(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"status": "success", "user": user}

@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    # Mock forgot password flow
    return {"status": "success", "message": "Password reset code sent to your email"}

@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    success = auth_db.reset_password(request.email, request.new_password)
    if not success:
        raise HTTPException(status_code=404, detail="Email address not found")
    return {"status": "success", "message": "Password has been reset successfully"}

@app.post("/api/auth/profile/update")
async def update_profile(request: UpdateProfileRequest):
    success = auth_db.update_profile(
        request.user_id,
        name=request.name,
        email=request.email,
        theme=request.theme,
        units=request.units,
        role=request.role,
        company=request.company,
        old_password=request.currentPassword,
        new_password=request.newPassword
    )
    if not success:
        raise HTTPException(status_code=404, detail="User not found or incorrect password")
    return {"status": "success", "message": "Profile updated"}

@app.post("/api/auth/profile/change-password")
async def change_password(request: ChangePasswordRequest):
    success = auth_db.change_password(request.user_id, request.old_password, request.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Incorrect current password or user not found")
    return {"status": "success", "message": "Password updated"}

# ----------------- 1. AI Models Endpoint -----------------

@app.get("/api/models")
async def list_models(user_id: str):
    return registry.list_models(user_id)

@app.post("/api/models/upload")
async def upload_model(
    name: str = Form(...),
    category: str = Form(...),
    user_id: str = Form(...),
    file_size: str = Form("10 MB"),
    resolution: str = Form("640x640"),
    framework: Optional[str] = Form(None),
    channels: Optional[int] = Form(3),
    normalization: Optional[str] = Form("None"),
    classes: Optional[str] = Form(""),
    outputs: Optional[str] = Form("{}")
):
    try:
        # Save mock weights file
        model_filename = name.replace(" ", "_")
        target_path = f"backend/data/models/{model_filename}"
        with open(target_path, "w") as f:
            f.write("mock_weights_data_placeholder")

        # Parse classes and outputs
        class_list = [c.strip() for c in classes.split(",") if c.strip()] if classes else []
        try:
            outputs_dict = json.loads(outputs) if outputs else {}
        except Exception:
            outputs_dict = {}

        new_model = registry.add_model(
            name=name,
            category=category,
            size=file_size,
            owner_user_id=user_id,
            resolution=resolution,
            framework=framework,
            channels=channels,
            normalization=normalization,
            classes=class_list,
            outputs=outputs_dict
        )
        return {"status": "success", "model": new_model}
    except Exception as e:
        logger.error(f"Failed to upload model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/models/{model_id}/rename")
async def rename_model(model_id: str, request: RenameRequest, user_id: str):
    success = registry.rename_model(model_id, request.name, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Model not found or access denied")
    return {"status": "success", "message": "Model renamed"}

@app.post("/api/models/{model_id}/toggle")
async def toggle_model(model_id: str, user_id: str):
    success = registry.toggle_model_status(model_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Model not found or access denied")
    return {"status": "success", "message": "Model status toggled"}

@app.delete("/api/models/{model_id}")
async def delete_model(model_id: str, user_id: str):
    success = registry.delete_model(model_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Model not found or access denied")
    return {"status": "success", "message": "Model deleted"}

# ----------------- 2. Inference History Endpoint -----------------

@app.get("/api/history")
async def list_history(user_id: str):
    return history.list_jobs(user_id)

@app.delete("/api/history/{job_id}")
async def delete_job(job_id: str, user_id: str):
    success = history.delete_job(job_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or access denied")
    return {"status": "success", "message": "Job deleted"}

# ----------------- 3. Results Export Endpoint -----------------

@app.get("/api/export/{job_id}/{export_format}")
async def export_job(job_id: str, export_format: str):
    """
    Generates and downloads export files: CSV, JSON, XLSX, PDF, or mock MP4.
    """
    export_format = export_format.lower()
    
    # 1. Export PDF Distress & Condition Report
    if export_format == "pdf":
        pdf_data = f"""ROAD INSPECTION & PAVEMENT CONDITION REPORT
===================================================
Job ID: {job_id}
Generated At: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
System: RoadLab Distress Scan v1.0
===================================================

ROAD HEALTH ASSESSMENT SUMMARY:
------------------------------
Road Condition Index (RCI): 82.5 / 100
General Condition rating: GOOD
Total Detected Defects: 3
  - Total Potholes: 1
  - Total Cracks: 2
Total Affected Area: 0.12 sq.m.

MAINTENANCE RECOMMENDATIONS:
---------------------------
1. Emergency Patching Repair: Critical Priority (1 Defect)
2. Crack Filling & Sealing: Medium Priority (2 Defects)

DETAILED DEFECT LOG DATABASE:
-----------------------------
Defect #1: Pothole - Severity: MEDIUM (Score: 55)
  Length: 25.4 cm, Width: 18.2 cm, Area: 0.035 sq.m.
  Distance from camera: 12.5 m
  Recommended Action: Minor Patch Repair

Defect #2: Crack (Longitudinal) - Severity: MODERATE (Score: 50)
  Length: 1.85 m, Width: 8.5 mm, Area: 0.016 sq.m.
  Recommended Action: Crack Filling & Sealing

Defect #3: Crack (Transverse) - Severity: CRITICAL (Score: 90)
  Length: 8.12 m, Width: 32.0 mm, Area: 0.260 sq.m.
  Recommended Action: Full Depth Slab Reconstruction

===================================================
End of Inspection Report. RoadLab Condition Scan.
"""
        def iter_pdf():
            yield pdf_data.encode('utf-8')
            
        return StreamingResponse(
            iter_pdf(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=roadlab-distress-report-{job_id}.pdf"}
        )

    # 2. Export Distress Database CSV / XLSX
    elif export_format in ["distress_csv", "distress_xlsx"]:
        csv_data = "defect_id,class,type_or_details,severity,score,length,width,area_sq_m,distance_m,recommendation,priority\n"
        csv_data += "1,pothole,n/a,medium,55,25.4 cm,18.2 cm,0.035,12.5,Minor Patch Repair,medium\n"
        csv_data += "2,crack,longitudinal,moderate,50,1.85 m,8.5 mm,0.016,8.2,Crack Filling & Sealing,medium\n"
        csv_data += "3,crack,transverse,critical,90,8.12 m,32.0 mm,0.260,3.5,Full Depth Slab Reconstruction,critical\n"
        
        def iter_csv():
            yield csv_data.encode('utf-8')
            
        ext = "csv" if "csv" in export_format else "xlsx"
        mime = "text/csv" if ext == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        
        return StreamingResponse(
            iter_csv(),
            media_type=mime,
            headers={"Content-Disposition": f"attachment; filename=roadlab-distress-database-{job_id}.{ext}"}
        )

    # 3. Export Distress Database JSON
    elif export_format == "distress_json":
        json_data = [
            { "id": 1, "class": "pothole", "type": "n/a", "severity": "medium", "score": 55, "length_cm": 25.4, "width_cm": 18.2, "area_sq_m": 0.035, "distance_m": 12.5, "recommendation": "Minor Patch Repair", "priority": "medium" },
            { "id": 2, "class": "crack", "type": "longitudinal", "severity": "moderate", "score": 50, "length_m": 1.85, "width_mm": 8.5, "area_sq_m": 0.016, "distance_m": 8.2, "recommendation": "Crack Filling & Sealing", "priority": "medium" },
            { "id": 3, "class": "crack", "type": "transverse", "severity": "critical", "score": 90, "length_m": 8.12, "width_mm": 32.0, "area_sq_m": 0.260, "distance_m": 3.5, "recommendation": "Full Depth Slab Reconstruction", "priority": "critical" }
        ]
        def iter_json():
            yield json.dumps(json_data, indent=2).encode('utf-8')
            
        return StreamingResponse(
            iter_json(),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=roadlab-distress-database-{job_id}.json"}
        )
    
    # 4. Export Traffic CSV / XLSX
    elif export_format in ["csv", "xlsx"]:
        csv_data = "frame,object_id,class,confidence,u_pos,v_pos,speed_kph,lane_index,distance_to_ego,front_gap,lateral_gap,density_km,flow_rate_hour,occupancy_pct,queue_len_meters\n"
        for frame in range(300):
            v_101 = max(1.5, 45.0 - 25.0 * (frame * 0.0333))
            csv_data += f"{frame},101,car,0.94,1.85,{v_101:.1f},90.0,1,{v_101:.1f},12.4,3.7,12.0,1440.0,36.5,14.0\n"
            
            v_102 = max(2.0, 38.0 - 20.0 * (frame * 0.0333))
            csv_data += f"{frame},102,truck,0.91,-1.85,{v_102:.1f},72.0,2,{v_102:.1f},null,3.7,12.0,1440.0,36.5,14.0\n"
            
            v_103 = max(1.0, 50.0 - 30.0 * (frame * 0.0333))
            csv_data += f"{frame},103,motorcycle,0.88,1.85,{v_103:.1f},108.0,1,{v_103:.1f},null,3.7,12.0,1440.0,36.5,14.0\n"

        def iter_data():
            yield csv_data

        mime = "text/csv" if export_format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "csv" if export_format == "csv" else "xlsx"

        return StreamingResponse(
            iter_data(),
            media_type=mime,
            headers={"Content-Disposition": f"attachment; filename=roadlab-analytics-{job_id}.{ext}"}
        )
        
    # 5. Export Traffic JSON
    elif export_format == "json":
        json_data = []
        for frame in range(300):
            v_101 = max(1.5, 45.0 - 25.0 * (frame * 0.0333))
            v_102 = max(2.0, 38.0 - 20.0 * (frame * 0.0333))
            v_103 = max(1.0, 50.0 - 30.0 * (frame * 0.0333))
            json_data.append({
                "frame": frame,
                "tracks": [
                    {
                        "id": 101, "class": "car", "confidence": 0.94, "box": [420, 280, 480, 380],
                        "world_pos": [1.85, round(v_101, 2)], "speed": 90.0, "lane_index": 1, "distance_to_ego": round(v_101, 2),
                        "gap_front": 12.4, "gap_lateral": 3.7
                    },
                    {
                        "id": 102, "class": "truck", "confidence": 0.91, "box": [220, 180, 310, 290],
                        "world_pos": [-1.85, round(v_102, 2)], "speed": 72.0, "lane_index": 2, "distance_to_ego": round(v_102, 2),
                        "gap_front": None, "gap_lateral": 3.7
                    },
                    {
                        "id": 103, "class": "motorcycle", "confidence": 0.88, "box": [520, 310, 540, 360],
                        "world_pos": [1.85, round(v_103, 2)], "speed": 108.0, "lane_index": 1, "distance_to_ego": round(v_103, 2),
                        "gap_front": None, "gap_lateral": 3.7
                    }
                ],
                "lead_vehicle": {
                    "id": 101, "distance": round(v_101, 2), "relative_speed": 10.0, "headway": round(v_101 / 25.0, 2)
                },
                "metrics": {
                    "density_km": 12.0,
                    "flow_rate_hour": 1440.0,
                    "occupancy_pct": 36.5,
                    "queue_len_meters": 14.0
                }
            })
            
        def iter_json():
            yield json.dumps(json_data, indent=2)

        return StreamingResponse(
            iter_json(),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=roadlab-analytics-{job_id}.json"}
        )

    # 6. Export annotated video (returns a sample traffic file download)
    elif export_format in ["mp4", "video"]:
        mock_video_path = f"backend/data/exports/roadlab_processed_{job_id}.mp4"
        with open(mock_video_path, "w") as f:
            f.write("mock_video_mp4_binary_stream_placeholder")
            
        return FileResponse(
            mock_video_path,
            media_type="video/mp4",
            filename=f"roadlab-processed-{job_id}.mp4"
        )
        
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format. Choose CSV, JSON, XLSX, PDF or MP4.")

# ----------------- 3a. Video Serving Endpoint -----------------

@app.get("/api/videos/sample")
async def get_sample_video():
    import os
    # Portable path: resolves to <project_root>/public/sample_video.mp4
    # Works locally and on any deployment machine regardless of OS
    base_dir = os.path.dirname(os.path.abspath(__file__))
    video_path = os.path.join(base_dir, "..", "..", "public", "sample_video.mp4")
    video_path = os.path.normpath(video_path)
    if os.path.exists(video_path):
        return FileResponse(video_path, media_type="video/mp4")
    raise HTTPException(status_code=404, detail="Sample video not found")

# ----------------- 4. AI WebSocket Pipeline -----------------

@app.websocket("/api/ws/inference")
async def websocket_inference(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established for AI pipeline")
    
    active_task = None
    state = {"is_paused": False, "is_cancelled": False}
    analytics_engine = TrafficAnalyticsModel()
    distress_engine = RoadDistressModel()

    async def inference_runner(config: dict):
        analytics_engine.reset()
        distress_engine.reset()
        total_frames = 300  # standard mock length
        frame_idx = 0
        target_fps = 30.0
        
        # Resolve model configuration details
        user_id = config.get("user_id", "default_user")
        models = registry.list_models(user_id)
        model_info = next((m for m in models if m["id"] == config.get("model_id")), None)
        model_name = model_info["name"] if model_info else "Unknown Model"
        
        # Validate model properties
        validation_res = {"status": "Compatible", "logs": ["✓ Baseline verification passed."]}
        if model_info:
            from app.models.validation import ModelValidator
            validation_res = ModelValidator.validate(model_info, {
                "resolution": config.get("resolution", "1280x720"),
                "expected_task": config.get("expected_task")
            })

        try:
            # Send model validation status first
            await websocket.send_json({
                "status": "validation",
                "validation": validation_res,
                "logs": [
                    f"[SYSTEM] Loading weights from backend/data/models/{model_name.replace(' ', '_')}...",
                    f"[SYSTEM] Tensor framework: {model_info.get('framework', 'Custom') if model_info else 'Custom'}",
                    f"[SYSTEM] Validating capability checks...",
                    *validation_res["logs"],
                    f"[SYSTEM] Validation completed. Status: {validation_res['status']}"
                ]
            })

            if validation_res["status"] == "Invalid":
                # Block execution if status is Invalid
                await websocket.send_json({
                    "status": "error",
                    "message": f"Inference Rejected: Model validation failed. Details: {', '.join([l for l in validation_res['logs'] if 'Blocked' in l or '✗' in l])}"
                })
                return

            while frame_idx < total_frames and not state["is_cancelled"]:
                if state["is_paused"]:
                    await asyncio.sleep(0.2)
                    continue

                # Run simulated AI predictions
                # Pass frame_idx to simulate moving objects/lanes
                # Create a small blank mock frame for size parameters
                mock_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
                
                # Run simulated AI predictions and tracking
                track_res = tracking_engine.predict_tracks(
                    frame_idx=frame_idx,
                    tracker_type=config.get("tracker", "ByteTrack"),
                    conf_threshold=config.get("conf_threshold", 0.4),
                    width=1280,
                    height=720
                )
                lane_res = lane_engine.predict(mock_frame, frame_idx=frame_idx, H=config.get("homography_matrix"))
                seg_res = segmentation_engine.predict(mock_frame, frame_idx=frame_idx)
                
                # Compute traffic analytics metrics
                analytics_res = analytics_engine.calculate(
                    tracks=track_res["tracks"],
                    lane_occupancy=track_res["lane_occupancy"],
                    frame_idx=frame_idx,
                    fps=target_fps
                )

                # Compute road distress metrics
                distress_res = distress_engine.calculate(
                    segmentation=seg_res["segmentation"],
                    H=config.get("homography_matrix"),
                    frame_idx=frame_idx
                )

                proc_time_ms = float(np.random.uniform(12.0, 24.0))
                debug_roi = InferenceReliabilityEngine.generate_road_roi(config.get("homography_matrix"), 1280, 720)

                # Assemble frame packet
                packet = {
                    "status": "processing",
                    "frame_idx": frame_idx,
                    "total_frames": total_frames,
                    "fps": round(target_fps + np.random.uniform(-1.5, 1.5), 1),
                    "detections": track_res["detections"],
                    "tracks": track_res["tracks"],
                    "lanes": lane_res["lanes"],
                    "rejected_lanes": lane_res.get("rejected_lanes", []),
                    "rejected_detections": track_res.get("rejected_detections", []),
                    "detection_stats": track_res.get("detection_stats", {}),
                    "debug_roi": debug_roi,
                    "segmentation": seg_res["segmentation"],
                    "lead_vehicle": track_res["lead_vehicle"],
                    "lane_occupancy": track_res["lane_occupancy"],
                    "events": track_res["events"],
                    "analytics": analytics_res,
                    "distress": distress_res,
                    "debug": {
                        "load_logs": f"Model {model_name} active.",
                        "tensor_shape": f"[1, 3, {model_info.get('input_resolution', '640x640').replace('x', ', ')}]" if model_info else "[1, 3, 640, 640]",
                        "processing_time_ms": round(proc_time_ms, 1),
                        "inference_log": f"Inference frame {frame_idx} processed in {proc_time_ms:.1f}ms."
                    }
                }
                
                await websocket.send_json(packet)
                frame_idx += 1
                
                # Sync frame rates (30 FPS -> 33.3ms)
                await asyncio.sleep(1.0 / target_fps)
                
            if not state["is_cancelled"]:
                # Save completed run to database log history
                history.add_job(
                    name=f"{config.get('video_name', 'video.mp4').split('.')[0]} AI Trace",
                    model_name=model_name,
                    video_name=config.get("video_name", "video.mp4"),
                    total_frames=total_frames,
                    avg_fps=target_fps,
                    owner_user_id=user_id
                )
                
                # Send completed packet
                await websocket.send_json({
                    "status": "completed",
                    "frame_idx": total_frames,
                    "total_frames": total_frames
                })
                logger.info("Inference completed successfully")
                
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected during inference run")
            state["is_cancelled"] = True
        except Exception as e:
            logger.error(f"Inference pipeline encountered error: {e}")
            await websocket.send_json({"status": "error", "message": str(e)})

    try:
        while True:
            # Wait for message commands from client
            message = await websocket.receive_text()
            data = json.loads(message)
            action = data.get("action")
            
            if action == "start":
                # Start new run
                logger.info(f"Start command received with config: {data.get('config')}")
                state["is_paused"] = False
                state["is_cancelled"] = False
                
                config_dict = data.get("config", {})
                tracking_engine.set_homography(config_dict.get("homography_matrix"))
                
                # Cancel existing run if active
                if active_task and not active_task.done():
                    active_task.cancel()
                    
                active_task = asyncio.create_task(inference_runner(config_dict))
                
            elif action == "pause":
                logger.info("Pause command received")
                state["is_paused"] = True
                await websocket.send_json({"status": "paused"})
                
            elif action == "resume":
                logger.info("Resume command received")
                state["is_paused"] = False
                
            elif action == "stop":
                logger.info("Stop command received")
                state["is_cancelled"] = True
                if active_task and not active_task.done():
                    active_task.cancel()
                await websocket.send_json({"status": "stopped"})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
        state["is_cancelled"] = True
        if active_task and not active_task.done():
            active_task.cancel()

# ----------------- 5. Model Benchmarking Endpoints -----------------

benchmark_results_db = {}

@app.post("/api/models/{model_id}/benchmark")
async def run_model_benchmark(model_id: str, sample_frames: int = 100):
    models = registry.list_models()
    model_info = next((m for m in models if m["id"] == model_id), None)
    if not model_info:
        raise HTTPException(status_code=404, detail="Model not found")
        
    model_name = model_info.get("name", "").lower()
    model_type = model_info.get("type", "Custom")
    
    import random
    is_recommended = False
    if model_type == "Lane Detection" and any(x in model_name for x in ["egolanes", "clrnet", "laneatt"]):
        is_recommended = True
    elif model_type in ["Vehicle Detection", "Tracking"] and any(x in model_name for x in ["yolo", "bytetrack", "deepsort"]):
        is_recommended = True
    elif model_type == "Segmentation" and any(x in model_name for x in ["yolo", "distress"]):
        is_recommended = True
        
    if is_recommended:
        precision = round(random.uniform(0.91, 0.96), 3)
        recall = round(random.uniform(0.88, 0.94), 3)
        fps = round(random.uniform(38.0, 52.0), 1)
        fp = random.randint(15, 35)
        fn = random.randint(20, 45)
    else:
        precision = round(random.uniform(0.72, 0.84), 3)
        recall = round(random.uniform(0.65, 0.78), 3)
        fps = round(random.uniform(22.0, 34.0), 1)
        fp = random.randint(65, 120)
        fn = random.randint(80, 150)
        
    f1 = round(2 * (precision * recall) / (precision + recall + 1e-9), 3)
    det_count = fp + fn + random.randint(150, 300)
    
    vis_quality = round(precision * 10 - random.uniform(0.1, 0.5), 1)
    vis_quality = max(1.0, min(10.0, vis_quality))
    
    result = {
        "model_id": model_id,
        "model_name": model_info.get("name"),
        "type": model_type,
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "detection_count": int(det_count),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "visualization_quality": float(vis_quality),
        "fps": float(fps),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    benchmark_results_db[model_id] = result
    return {"status": "success", "result": result}

@app.get("/api/models/benchmark/results")
async def get_benchmark_results():
    return list(benchmark_results_db.values())
