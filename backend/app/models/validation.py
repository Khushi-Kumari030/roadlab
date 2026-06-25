import os
from typing import Dict, Tuple, List

class ModelValidator:
    """
    Validation Engine to check AI model properties against footage configuration
    and output tensor expectations prior to running inference.
    """
    @staticmethod
    def validate(model_info: Dict, video_info: Dict) -> Dict:
        """
        Validates the model configuration parameters against the video footage properties.
        Returns validation status ('Compatible', 'Warning', 'Invalid'), logs, and a compatibility score.
        """
        logs = []
        status = "Compatible"
        
        # 1. Validate Model Type and Task Verification
        model_type = model_info.get("type", "Custom")
        expected_task = video_info.get("expected_task")
        
        supported_types = ["Object Detection", "Vehicle Detection", "Segmentation", "Lane Detection", "Tracking", "Classification", "Custom", "Custom Models"]
        if model_type not in supported_types:
            status = "Invalid"
            logs.append(f"✗ Model type '{model_type}' is not supported by standard workflows.")
        else:
            logs.append(f"✓ Model type '{model_type}' is verified.")

        # Task verification: block mismatch execution
        if expected_task:
            if expected_task in ["Vehicle Detection", "Tracking"] and model_type == "Lane Detection":
                status = "Invalid"
                logs.append("✗ Execution Blocked: A Lane Detection model cannot be executed as a Vehicle Detector/Tracker.")
            elif expected_task == "Lane Detection" and model_type == "Segmentation":
                status = "Invalid"
                logs.append("✗ Execution Blocked: A Segmentation model cannot be executed as a Lane Detector.")
            elif expected_task != model_type and not (expected_task == "Vehicle Detection" and model_type == "Tracking") and not (expected_task == "Tracking" and model_type == "Vehicle Detection") and not (expected_task == "Vehicle Detection" and model_type == "Object Detection"):
                # If they are completely different
                if model_type in ["Lane Detection", "Segmentation", "Vehicle Detection", "Tracking"] or expected_task in ["Lane Detection", "Segmentation", "Vehicle Detection", "Tracking"]:
                    status = "Invalid"
                    logs.append(f"✗ Execution Blocked: Selected task '{expected_task}' is incompatible with loaded model type '{model_type}'.")
            else:
                logs.append(f"✓ Selected Task verification passed: running '{expected_task}' with '{model_type}' model.")

        # 2. Validate Inputs (Dimensions, channels, normalization)
        input_res = model_info.get("input_resolution", "640x640")
        channels = model_info.get("channels", 3)
        
        if channels != 3:
            if status != "Invalid":
                status = "Warning"
            logs.append(f"⚠ Warning: Expected 3 RGB channels, but model expects {channels}. Image normalizer will pad dummy layers.")
        else:
            logs.append(f"✓ Input tensor channels verified (3 RGB layers).")

        try:
            m_w, m_h = map(int, input_res.split('x'))
            logs.append(f"✓ Model input size registered: {m_w}x{m_h}.")
        except Exception:
            status = "Invalid"
            logs.append("✗ Invalid model input resolution. Must be formatted as WIDTHxHEIGHT (e.g. 640x640).")
            m_w, m_h = 640, 640

        # Video aspect ratio/dimension checks
        vid_res = video_info.get("resolution", "1280x720")
        try:
            v_w, v_h = map(int, vid_res.split('x'))
            # Check aspect ratio deviation
            v_ratio = v_w / v_h
            m_ratio = m_w / m_h
            if abs(v_ratio - m_ratio) > 0.15:
                if status != "Invalid":
                    status = "Warning"
                logs.append(f"⚠ Warning: Video aspect ratio ({v_w}:{v_h}) differs from model ({m_w}:{m_h}). Pre-processing will apply scaling padding which might affect detection accuracy.")
            else:
                logs.append(f"✓ Aspect ratio check passed (Video ratio: {v_ratio:.2f}, Model ratio: {m_ratio:.2f}).")
        except Exception:
            if status != "Invalid":
                status = "Warning"
            logs.append("⚠ Warning: Unable to parse video resolution dimensions.")

        # 3. Class definitions
        classes = model_info.get("classes", [])
        if not classes and model_type in ["Object Detection", "Vehicle Detection", "Segmentation", "Classification"]:
            if status != "Invalid":
                status = "Warning"
            logs.append("⚠ Warning: No classes metadata list uploaded. Engine will use default COCO/RoadDamage categories.")
        else:
            logs.append(f"✓ Class labels mapped: {len(classes)} labels found.")

        # 4. Output Tensor Checks
        framework = model_info.get("framework", "ONNX")
        name = model_info.get("name", "")
        ext = name.split('.')[-1].lower() if name else ""

        if ext in ["pt", "pth"] and framework != "PyTorch":
            if status != "Invalid":
                status = "Warning"
            logs.append(f"⚠ Warning: Extension is '.{ext}' but framework is set to '{framework}'.")
        elif ext == "onnx" and framework != "ONNX":
            if status != "Invalid":
                status = "Warning"
            logs.append(f"⚠ Warning: Extension is '.onnx' but framework is set to '{framework}'.")
        elif ext == "engine" and framework != "TensorRT":
            if status != "Invalid":
                status = "Warning"
            logs.append(f"⚠ Warning: Extension is '.engine' but framework is set to '{framework}'.")
        else:
            logs.append(f"✓ File extension matches framework category ({framework}).")

        # 5. Normalization config verification
        normalization = model_info.get("normalization", "None")
        logs.append(f"✓ Input tensor normalization strategy set: {normalization}.")

        # 6. Built-In Recommended Model Verification
        recommended_warning = None
        c_name = name.lower()
        if model_type == "Lane Detection":
            if not any(x in c_name for x in ["egolanes", "clrnet", "laneatt"]):
                recommended_warning = "For Lane Detection, EgoLanes, CLRNet, or LaneATT models are recommended."
                logs.append(f"⚠ Recommendation Note: {recommended_warning}")
        elif model_type in ["Vehicle Detection", "Tracking", "Object Detection"]:
            if not any(x in c_name for x in ["yolo", "bytetrack", "deepsort"]):
                recommended_warning = "For Vehicle Detection / Tracking, YOLOv8, YOLOv11, ByteTrack, or DeepSORT are recommended."
                logs.append(f"⚠ Recommendation Note: {recommended_warning}")
        elif model_type == "Segmentation":
            if not any(x in c_name for x in ["yolo", "distress"]):
                recommended_warning = "For Distress Segmentation, YOLO Segmentation or Road Distress models are recommended."
                logs.append(f"⚠ Recommendation Note: {recommended_warning}")

        # 7. Compatibility Score (0 - 100%)
        compatibility_score = 100
        if status == "Invalid":
            compatibility_score = 0
        else:
            # Deduct points for warnings
            if ext in ["pt", "pth"] and framework != "PyTorch": compatibility_score -= 15
            elif ext == "onnx" and framework != "ONNX": compatibility_score -= 15
            elif ext == "engine" and framework != "TensorRT": compatibility_score -= 15
            
            try:
                m_w, m_h = map(int, input_res.split('x'))
                v_w, v_h = map(int, vid_res.split('x'))
                if abs((v_w / v_h) - (m_w / m_h)) > 0.15:
                    compatibility_score -= 20
            except Exception:
                compatibility_score -= 10
                
            if not classes:
                compatibility_score -= 15
                
            if recommended_warning:
                compatibility_score -= 10

        compatibility_score = max(10, compatibility_score)

        return {
            "status": status,
            "logs": logs,
            "compatibility_score": compatibility_score,
            "recommended_warning": recommended_warning
        }
