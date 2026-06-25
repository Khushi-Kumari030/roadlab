import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type Point2D, type HomographyMatrix, type Calibration, computeHomography, invertMatrix, projectPoint, projectWorldToPixel, lineSegmentsIntersect, getCrossingDirection } from '../utils/calibrationMath';
import { CalibrationService } from '../services/CalibrationService';
import { ProjectService, type FullProject, type ProjectVideoData } from '../services/ProjectService';
import { EventBus } from '../services/EventBus';
import { AuthService } from '../services/AuthService';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  theme?: 'light' | 'dark' | 'system';
  units?: 'm' | 'cm';
  avatar?: string;
}


export type ActiveView = 'dashboard' | 'workspace' | 'calibration' | 'measurements' | 'models' | 'settings' | 'analytics' | 'distress' | 'profile';
export type ToolType = 'select' | 'grid' | 'point' | 'line' | 'polygon' | 'rectangle' | 'angle' | 'counting_line' | 'direction_line' | 'roi' | 'pothole_poly' | 'crack_line' | 'coordinate' | 'left_boundary' | 'right_boundary' | 'road_poly';

export interface Project {
  id: string;
  name: string;
  dateModified: string;
  thumbnail: string;
  description: string;
}

export interface Measurement {
  id: string;
  name: string;
  type: 'point' | 'line' | 'polygon' | 'angle' | 'rectangle' | 'coordinate';
  points: Point2D[];
  value: string;
}

export interface Model {
  id: string;
  name: string;
  type: string;
  framework: 'PyTorch' | 'ONNX' | 'TensorRT' | 'Custom';
  input_resolution: string;
  channels?: number;
  normalization?: string;
  classes?: string[];
  outputs?: {
    masks?: boolean;
    lanes?: boolean;
    keypoints?: boolean;
    custom?: boolean;
  };
  fileSize: string;
  uploadDate: string;
  status: 'Active' | 'Inactive';
  category: 'Lane Detection' | 'Vehicle Detection' | 'Segmentation' | 'Tracking' | 'Custom Models' | 'Classification';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface JobHistoryItem {
  id: string;
  name: string;
  model_name: string;
  video_name: string;
  date: string;
  status: 'Completed' | 'Processing' | 'Cancelled' | 'Failed';
  total_frames: number;
  avg_fps: number;
}

export interface Track {
  id: number;
  class: string;
  box: [number, number, number, number];
  confidence: number;
  world_pos: [number, number];
  speed: number;
  average_speed: number;
  max_speed: number;
  acceleration: number;
  track_age: number;
  lane_index: number;
  distance_to_ego: number;
  gap_front: number | null;
  gap_rear: number | null;
  gap_lateral: number | null;
  history: [number, number][];
}

export interface LeadVehicle {
  id: number;
  distance: number;
  relative_speed: number;
  headway: number;
}

export interface EventLogItem {
  frame: number;
  type: string;
  message: string;
}

export interface DistressItem {
  id: string | number;
  class: 'pothole' | 'crack';
  type?: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'minor' | 'moderate' | 'severe';
  score: number;
  length_cm?: number;
  length_m?: number;
  width_cm?: number;
  width_mm?: number;
  area_sq_m: number;
  perimeter_m?: number;
  distance_m: number;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  pixels: Point2D[];
}

export interface DistressSummary {
  total_defects: number;
  total_potholes: number;
  total_cracks: number;
  affected_area_sq_m: number;
  rci: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  priority_breakdown: Record<string, number>;
}

export interface TrafficLine {
  id: string;
  name: string;
  type: 'counting' | 'direction';
  points: Point2D[];
  upstreamCount: number;
  downstreamCount: number;
}

export interface TrafficROI {
  id: string;
  name: string;
  points: Point2D[];
}

export interface TrafficAnalyticsData {
  counts: {
    total: number;
    class_wise: Record<string, number>;
    lane_wise: Record<string, number>;
  };
  density: {
    area_density_km: number;
    area_density_lane_km: number;
    area_density_sq_km: number;
    lane_density: Record<string, number>;
  };
  flow: {
    vehicles_per_min: number;
    vehicles_per_hour: number;
    vehicles_per_lane_hour: number;
    peak_flow: number;
    avg_flow: number;
  };
  occupancy: {
    overall_occupancy: number;
    lane_occupancy: Record<string, number>;
    utilization: number;
  };
  headway: {
    avg_headway_time: number;
    min_headway_time: number;
    max_headway_time: number;
    avg_headway_dist: number;
    min_headway_dist: number;
    max_headway_dist: number;
  };
  queue: {
    current_queue_len_meters: number;
    current_queue_len_vehicles: number;
    max_queue_len_meters: number;
    max_queue_len_vehicles: number;
    avg_queue_len_meters: number;
    avg_queue_len_vehicles: number;
    is_congested: boolean;
  };
  congestion: {
    status: 'free_flow' | 'moderate' | 'heavy' | 'congested';
    level: 'green' | 'yellow' | 'orange' | 'red';
  };
  lane_level: Array<{
    lane_id: number;
    occupancy: number;
    density: number;
    flow: number;
    speed: number;
  }>;
}

export interface InferenceResults {
  detections: Array<{
    id: number;
    class: string;
    box: [number, number, number, number];
    confidence: number;
  }>;
  tracks?: Track[];
  lead_vehicle?: LeadVehicle | null;
  lane_occupancy?: Record<string, number>;
  events?: EventLogItem[];
  analytics?: TrafficAnalyticsData;
  distress?: {
    potholes: DistressItem[];
    cracks: DistressItem[];
    summary: DistressSummary;
  };
  lanes: Array<{
    points: Point2D[];
    is_ego: boolean;
    confidence: number;
  }>;
  segmentation: {
    road?: { class: string; polygons: Point2D[][]; opacity: number; color: string };
    pothole?: { class: string; polygons: Point2D[][]; opacity: number; color: string };
    crack?: { class: string; polygons: Point2D[][]; opacity: number; color: string };
  };
}

export interface ModelConfig {
  confThreshold: number;
  iouThreshold: number;
  inputResolution: '640x640' | '1280x720' | '1920x1080';
  device: 'CPU' | 'CUDA';
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  units: 'm' | 'cm';
  exportFormat: 'PNG' | 'JPG' | 'CSV';
  storageUsed: string;
}

interface RoadLabContextType {
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  
  projects: FullProject[];
  activeProject: FullProject | null;
  setActiveProject: (project: FullProject | null) => void;
  createNewProject: (name: string, description: string) => FullProject;
  saveCurrentProjectState: () => void;

  videos: ProjectVideoData[];
  activeVideo: ProjectVideoData | null;
  setActiveVideo: (video: ProjectVideoData | null) => void;
  addVideoToProject: (name: string, fileOrUrl: File | string) => void;
  removeVideoFromProject: (id: string) => void;
  
  currentVideo: {
    url: string | null;
    name: string | null;
    resolution: string | null;
    duration: number;
    fps: number;
    totalFrames: number;
  };
  setVideoFile: (file: File | string) => void;
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  zoomScale: number;
  setZoomScale: (scale: number) => void;
  panOffset: Point2D;
  setPanOffset: (offset: Point2D) => void;
  
  calibrations: Calibration[];
  activeCalibration: Calibration | null;
  setActiveCalibration: (calibration: Calibration | null) => void;
  saveCalibration: (name: string, imagePoints: Point2D[], gridW: number, gridH: number) => Calibration;
  deleteCalibration: (id: string) => void;
  homographyMatrix: HomographyMatrix | null;

  measurements: Measurement[];
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>;
  addMeasurement: (measurement: Omit<Measurement, 'id'>) => void;
  deleteMeasurement: (id: string) => void;
  clearMeasurements: () => void;

  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  models: Model[];
  addModel: (
    name: string,
    category: Model['category'],
    fileSize: string,
    resolution?: string,
    framework?: string,
    channels?: number,
    normalization?: string,
    classes?: string[],
    outputs?: any
  ) => Promise<void>;
  deleteModel: (id: string) => void;
  toggleModelStatus: (id: string) => void;
  renameModel: (id: string, name: string) => void;

  modelConfig: ModelConfig;
  setModelConfig: React.Dispatch<React.SetStateAction<ModelConfig>>;
  updateModelConfig: (updates: Partial<ModelConfig>) => void;

  inferenceRunning: boolean;
  inferencePaused: boolean;
  inferenceFPS: number;
  inferenceProcessedFrames: number;
  activeInferenceModel: Model | null;
  setActiveInferenceModel: (model: Model | null) => void;
  inferenceResults: InferenceResults;
  
  startInference: () => void;
  pauseInference: () => void;
  resumeInference: () => void;
  stopInference: () => void;

  overlayVisibility: {
    boundingBoxes: boolean;
    lanes: boolean;
    segmentation: boolean;
    keypoints: boolean;
  };
  updateOverlayVisibility: (key: 'boundingBoxes' | 'lanes' | 'segmentation' | 'keypoints', value: boolean) => void;
  overlayOpacity: number;
  setOverlayOpacity: (opacity: number) => void;
  overlayColors: {
    boundingBoxes: string;
    lanes: string;
    road: string;
    pothole: string;
    crack: string;
  };
  updateOverlayColor: (key: 'boundingBoxes' | 'lanes' | 'road' | 'pothole' | 'crack', color: string) => void;

  historyJobs: JobHistoryItem[];
  loadHistoryJobs: () => void;
  deleteHistoryJob: (id: string) => void;

  activeTracker: 'ByteTrack' | 'DeepSORT';
  setActiveTracker: (tracker: 'ByteTrack' | 'DeepSORT') => void;
  selectedTrackId: number | null;
  setSelectedTrackId: (id: number | null) => void;
  bevSplitEnabled: boolean;
  setBevSplitEnabled: (enabled: boolean) => void;
  speedUnit: 'km/h' | 'm/s';
  setSpeedUnit: (unit: 'km/h' | 'm/s') => void;
  distanceUnit: 'm' | 'cm';
  setDistanceUnit: (unit: 'm' | 'cm') => void;
  trailLength: 10 | 30 | 900;
  setTrailLength: (length: 10 | 30 | 900) => void;
  eventLog: EventLogItem[];
  setEventLog: React.Dispatch<React.SetStateAction<EventLogItem[]>>;
  clearEventLog: () => void;

  trafficLines: TrafficLine[];
  setTrafficLines: React.Dispatch<React.SetStateAction<TrafficLine[]>>;
  addTrafficLine: (line: Omit<TrafficLine, 'id' | 'upstreamCount' | 'downstreamCount'>) => void;
  editTrafficLine: (id: string, updates: Partial<TrafficLine>) => void;
  deleteTrafficLine: (id: string) => void;
  trafficROIs: TrafficROI[];
  setTrafficROIs: React.Dispatch<React.SetStateAction<TrafficROI[]>>;
  addTrafficROI: (roi: Omit<TrafficROI, 'id'>) => void;
  deleteTrafficROI: (id: string) => void;
  analyticsHistory: TrafficAnalyticsData[];
  setAnalyticsHistory: React.Dispatch<React.SetStateAction<TrafficAnalyticsData[]>>;
  currentAnalytics: TrafficAnalyticsData | null;
  setCurrentAnalytics: (analytics: TrafficAnalyticsData | null) => void;

  distressItems: DistressItem[];
  setDistressItems: React.Dispatch<React.SetStateAction<DistressItem[]>>;
  addDistressItem: (item: { class: 'pothole' | 'crack'; pixels: Point2D[]; type?: string }) => void;
  deleteDistressItem: (id: string | number) => void;
  distressSummary: DistressSummary | null;
  setDistressSummary: React.Dispatch<React.SetStateAction<DistressSummary | null>>;
  distressHistory: DistressSummary[];
  setDistressHistory: React.Dispatch<React.SetStateAction<DistressSummary[]>>;

  importWorkspaceData: (jsonData: string) => boolean;
  exportWorkspaceData: () => string;

  selectedMeasurementId: string | null;
  setSelectedMeasurementId: (id: string | null) => void;
  undoStack: any[];
  redoStack: any[];
  pushActionToUndo: (action: { type: string; data: any }) => void;
  undoLastAction: () => void;
  redoLastAction: () => void;
  validationStatus: { status: 'Compatible' | 'Warning' | 'Invalid'; logs: string[] } | null;
  setValidationStatus: (val: any) => void;
  debugLogs: string[];
  setDebugLogs: React.Dispatch<React.SetStateAction<string[]>>;
  visualizationConfig: {
    boxThickness: number;
    labelSize: number;
    maskOpacity: number;
    laneOpacity: number;
    overlayToggle: boolean;
    classColors: Record<string, string>;
  };
  setVisualizationConfig: React.Dispatch<React.SetStateAction<any>>;
  hiddenObjectIds: string[];
  lockedObjectIds: string[];
  toggleHideObject: (id: string) => void;
  toggleLockObject: (id: string) => void;
  duplicateObject: (id: string, type: string) => void;
  renameObject: (id: string, type: string, newName: string) => void;
  calibrationDiagnostics: {
    accuracy: number;
    gridQuality: string;
    scaleConsistency: number;
    homographyError: number;
    confidence: string;
    score: number;
  } | null;
  crossedVehicles: Record<string, number[]>;
  activeVisualizationLayers: {
    rawModelOutput: boolean;
    postprocessedLane: boolean;
    calibrationROI: boolean;
    homographyGrid: boolean;
    finalProjectedLane: boolean;
  };
  setActiveVisualizationLayers: React.Dispatch<React.SetStateAction<{
    rawModelOutput: boolean;
    postprocessedLane: boolean;
    calibrationROI: boolean;
    homographyGrid: boolean;
    finalProjectedLane: boolean;
  }>>;
  leftRoadBoundary: Point2D[];
  setLeftRoadBoundary: React.Dispatch<React.SetStateAction<Point2D[]>>;
  rightRoadBoundary: Point2D[];
  setRightRoadBoundary: React.Dispatch<React.SetStateAction<Point2D[]>>;
  roadPolygon: Point2D[];
  setRoadPolygon: React.Dispatch<React.SetStateAction<Point2D[]>>;
  clearManualRoadBoundaries: () => void;
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
  updateProfile: (data: Partial<User> & { currentPassword?: string; newPassword?: string }) => Promise<void>;
  notifications: NotificationItem[];
  addNotification: (title: string, message: string) => void;
  clearNotifications: () => void;
  markNotificationsAsRead: () => void;
}

const BACKEND_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

const RoadLabContext = createContext<RoadLabContextType | undefined>(undefined);

export const RoadLabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ActiveView>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Projects State
  const [projects, setProjects] = useState<FullProject[]>([]);
  const [activeProject, setActiveProject] = useState<FullProject | null>(null);

  // Video State
  const [videos, setVideos] = useState<ProjectVideoData[]>([]);
  const [activeVideo, setActiveVideo] = useState<ProjectVideoData | null>(null);

  const [currentVideo, setCurrentVideo] = useState<RoadLabContextType['currentVideo']>({
    url: null,
    name: null,
    resolution: null,
    duration: 0,
    fps: 30,
    totalFrames: 0
  });
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Canvas Interactions
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<Point2D>({ x: 0, y: 0 });

  // Calibration State
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [activeCalibration, setActiveCalibration] = useState<Calibration | null>(null);
  const [homographyMatrix, setHomographyMatrix] = useState<HomographyMatrix | null>(null);

  // Measurements State
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // Models State
  const [models, setModels] = useState<Model[]>([]);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    units: 'm',
    exportFormat: 'CSV',
    storageUsed: '2.4 GB / 25 GB'
  });

  // Model Config State
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    confThreshold: 0.25,
    iouThreshold: 0.45,
    inputResolution: '640x640',
    device: 'CPU'
  });

  // Inference Status State
  const [inferenceRunning, setInferenceRunning] = useState(false);
  const [inferencePaused, setInferencePaused] = useState(false);
  const [inferenceFPS, setInferenceFPS] = useState(0);
  const [inferenceProcessedFrames, setInferenceProcessedFrames] = useState(0);
  const [activeInferenceModel, setActiveInferenceModel] = useState<Model | null>(null);
  const [inferenceResults, setInferenceResults] = useState<InferenceResults>({
    detections: [],
    lanes: [],
    segmentation: {}
  });

  // UI/UX States
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [validationStatus, setValidationStatus] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [hiddenObjectIds, setHiddenObjectIds] = useState<string[]>([]);
  const [calibrationDiagnostics, setCalibrationDiagnostics] = useState<RoadLabContextType['calibrationDiagnostics']>(null);
  const [lockedObjectIds, setLockedObjectIds] = useState<string[]>([]);
  const [visualizationConfig, setVisualizationConfig] = useState({
    boxThickness: 2.5,
    labelSize: 11,
    maskOpacity: 0.45,
    laneOpacity: 0.5,
    overlayToggle: true,
    classColors: {
      car: '#00BCF2',
      truck: '#D13438',
      bus: '#107C10',
      motorcycle: '#FFB900',
      bicycle: '#8B5CF6',
      pothole: '#D13438',
      crack: '#FFB900',
      lane: '#00BCF2'
    }
  });

  const [activeVisualizationLayers, setActiveVisualizationLayers] = useState({
    rawModelOutput: true,
    postprocessedLane: true,
    calibrationROI: true,
    homographyGrid: true,
    finalProjectedLane: true
  });
  const [leftRoadBoundary, setLeftRoadBoundary] = useState<Point2D[]>([]);
  const [rightRoadBoundary, setRightRoadBoundary] = useState<Point2D[]>([]);
  const [roadPolygon, setRoadPolygon] = useState<Point2D[]>([]);
  const clearManualRoadBoundaries = () => {
    setLeftRoadBoundary([]);
    setRightRoadBoundary([]);
    setRoadPolygon([]);
  };

  const [overlayVisibility, setOverlayVisibility] = useState({
    boundingBoxes: true,
    lanes: true,
    segmentation: true,
    keypoints: false
  });
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5);
  const [overlayColors, setOverlayColors] = useState({
    boundingBoxes: '#00BCF2',
    lanes: '#107C10',
    road: '#0078D4',
    pothole: '#D13438',
    crack: '#FFB900'
  });

  // Tracking & Analytics State
  const [activeTracker, setActiveTracker] = useState<'ByteTrack' | 'DeepSORT'>('ByteTrack');
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [bevSplitEnabled, setBevSplitEnabled] = useState<boolean>(false);
  const [speedUnit, setSpeedUnit] = useState<'km/h' | 'm/s'>('km/h');
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'cm'>('m');
  const [trailLength, setTrailLength] = useState<10 | 30 | 900>(30);
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);

  const clearEventLog = () => setEventLog([]);

  // Traffic Analytics Setup
  const [trafficLines, setTrafficLines] = useState<TrafficLine[]>([]);
  const [trafficROIs, setTrafficROIs] = useState<TrafficROI[]>([]);
  const [analyticsHistory, setAnalyticsHistory] = useState<TrafficAnalyticsData[]>([]);
  const [currentAnalytics, setCurrentAnalytics] = useState<TrafficAnalyticsData | null>(null);

  // Road Distress States
  const [distressItems, setDistressItems] = useState<DistressItem[]>([]);
  const [distressSummary, setDistressSummary] = useState<DistressSummary | null>(null);
  const [distressHistory, setDistressHistory] = useState<DistressSummary[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = (title: string, message: string) => {
    const newAlert: NotificationItem = {
      id: `alert-${Date.now()}`,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => {
      const updated = [newAlert, ...prev];
      if (user) {
        localStorage.setItem(`roadlab_alerts_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    if (user) {
      localStorage.setItem(`roadlab_alerts_${user.id}`, JSON.stringify([]));
    }
  };

  const markNotificationsAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user) {
        localStorage.setItem(`roadlab_alerts_${user.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Bootstrap user session on initial mount
  useEffect(() => {
    const storedUser = AuthService.getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
      if (storedUser.theme) {
        setSettings(prev => ({ ...prev, theme: storedUser.theme || 'dark' }));
      }
      // Load notifications
      const storedAlerts = localStorage.getItem(`roadlab_alerts_${storedUser.id}`);
      if (storedAlerts) {
        try {
          setNotifications(JSON.parse(storedAlerts));
        } catch (e) {
          console.error(e);
        }
      } else {
        // Seed default initial alerts
        const defaultAlerts = [
          { id: 'a1', title: 'Calibration Loaded', message: 'Standard Lane Grid (10m x 3.7m) successfully initialized.', timestamp: 'Just now', read: false },
          { id: 'a2', title: 'Model Upload Complete', message: 'YOLOv8n-RoadDamage.onnx added to libraries.', timestamp: '1 hour ago', read: true }
        ];
        setNotifications(defaultAlerts);
        localStorage.setItem(`roadlab_alerts_${storedUser.id}`, JSON.stringify(defaultAlerts));
      }
    }
  }, []);

  // Load project store when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProjects([]);
      setActiveProject(null);
      return;
    }
    const rawList = ProjectService.loadProjectsForUser(user.id);
    const list = rawList.map(p => {
      const defaultModels = [
        { id: 'm1', name: 'YOLOv8n-RoadDamage.onnx', type: 'Segmentation', framework: 'ONNX', input_resolution: '640x640', fileSize: '12.4 MB', uploadDate: '2026-06-23 15:40', status: 'Active', category: 'Segmentation' },
        { id: 'm2', name: 'ResNet50-LaneDetection.pt', type: 'Lane Detection', framework: 'PyTorch', input_resolution: '1280x720', fileSize: '98.2 MB', uploadDate: '2026-06-22 11:20', status: 'Inactive', category: 'Lane Detection' },
        { id: 'm3', name: 'ByteTrack-Vehicle.engine', type: 'Tracking', framework: 'TensorRT', input_resolution: '1920x1080', fileSize: '45.1 MB', uploadDate: '2026-06-21 09:12', status: 'Active', category: 'Tracking' },
        { id: 'm4', name: 'best.pt', type: 'Tracking', framework: 'PyTorch', input_resolution: '640x640', fileSize: '25.5 MB', uploadDate: '2026-06-25 11:23', status: 'Active', category: 'Tracking' },
        { id: 'm5', name: 'RDD_data_potholes.pt', type: 'Segmentation', framework: 'PyTorch', input_resolution: '640x640', fileSize: '48.2 MB', uploadDate: '2026-06-25 11:23', status: 'Active', category: 'Segmentation' }
      ] as Model[];

      const existingIds = (p.models || []).map(m => m.id);
      const mergedModels = [...(p.models || [])];
      defaultModels.forEach(dm => {
        if (!existingIds.includes(dm.id)) {
          mergedModels.push(dm);
        }
      });

      return {
        ...p,
        videos: p.videos.filter(v => v.id !== 'v1-default'),
        activeVideoId: p.activeVideoId === 'v1-default' ? null : p.activeVideoId,
        models: mergedModels
      };
    });
    setProjects(list);
    if (list.length > 0) {
      const active = list[0];
      setActiveProject(active);
      setCalibrations(active.calibrations);
      setModels(active.models);
      setSettings(active.settings);
      setVideos(active.videos);
      if (active.videos.length > 0) {
        const v = active.videos.find(x => x.id === active.activeVideoId) || active.videos[0];
        setActiveVideo(v);
      }
    }
  }, [isAuthenticated, user]);

  // Update active video metrics
  useEffect(() => {
    if (!activeVideo) {
      setCurrentVideo({ url: null, name: null, resolution: null, duration: 0, fps: 30, totalFrames: 0 });
      setMeasurements([]);
      setDistressItems([]);
      setInferenceResults({ detections: [], lanes: [], segmentation: {} });
      setEventLog([]);
      return;
    }
    setCurrentVideo({
      url: activeVideo.url,
      name: activeVideo.name,
      resolution: activeVideo.resolution,
      duration: activeVideo.duration,
      fps: activeVideo.fps,
      totalFrames: activeVideo.totalFrames
    });
    setMeasurements(activeVideo.measurements || []);
    setDistressItems(activeVideo.distressItems || []);
    setInferenceResults(activeVideo.inferenceResults || { detections: [], lanes: [], segmentation: {} });
    setEventLog(activeVideo.eventLog || []);
    setLeftRoadBoundary(activeVideo.leftRoadBoundary || []);
    setRightRoadBoundary(activeVideo.rightRoadBoundary || []);
    setRoadPolygon(activeVideo.roadPolygon || []);
    
    if (activeVideo.calibrationId) {
      const cal = calibrations.find(c => c.id === activeVideo.calibrationId);
      setActiveCalibration(cal || null);
    } else {
      setActiveCalibration(calibrations[0] || null);
    }
  }, [activeVideo, calibrations]);

  // Save current project state
  const saveCurrentProjectState = () => {
    if (!activeProject || !user) return;
    const updatedVideos = videos.map(v => {
      if (v.id === activeVideo?.id) {
        return {
          ...v,
          measurements,
          distressItems,
          inferenceResults,
          eventLog,
          calibrationId: activeCalibration?.id || null,
          modelId: activeInferenceModel?.id || null,
          leftRoadBoundary,
          rightRoadBoundary,
          roadPolygon
        };
      }
      return v;
    });

    const updatedProjects = projects.map(p => {
      if (p.id === activeProject.id) {
        return {
          ...p,
          videos: updatedVideos,
          calibrations,
          models,
          settings,
          activeVideoId: activeVideo?.id || null
        };
      }
      return p;
    });

    setProjects(updatedProjects);
    ProjectService.saveProjectsForUser(updatedProjects, user.id);
  };

  // Auto trigger save on state changes
  useEffect(() => {
    if (activeProject) {
      saveCurrentProjectState();
    }
  }, [measurements, distressItems, inferenceResults, eventLog, activeCalibration, activeInferenceModel, calibrations, models, settings, activeVideo, leftRoadBoundary, rightRoadBoundary, roadPolygon]);

  const addVideoToProject = (name: string, fileOrUrl: File | string) => {
    if (!activeProject) return;
    const isUrl = typeof fileOrUrl === 'string';
    const url = isUrl ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const size = typeof fileOrUrl === 'string' ? 5000000 : fileOrUrl.size;
    const resolution = '1280x720';
    const totalFrames = 900;
    const uploadDate = new Date().toISOString().replace('T', ' ').substring(0, 10);
    
    // Compute simple video metadata hash
    let computedHashValue = 0;
    const hashSeed = `${name}-${size}-${totalFrames}`;
    for (let i = 0; i < hashSeed.length; i++) {
      const char = hashSeed.charCodeAt(i);
      computedHashValue = (computedHashValue << 5) - computedHashValue + char;
      computedHashValue |= 0;
    }
    const computedHash = `vhash-${Math.abs(computedHashValue)}`;

    // Compare Video Hash, Resolution, Frame Count, and Metadata
    const matchedIndex = videos.findIndex(v => 
      v.hash === computedHash || 
      (v.name === name && v.resolution === resolution && v.totalFrames === totalFrames)
    );

    if (matchedIndex !== -1) {
      const existingVideo = videos[matchedIndex];
      const confirmReconnect = window.confirm(
        `Reconnect previous calibration and analysis results for "${name}"?`
      );

      if (confirmReconnect) {
        // Reconnect results: keep existing measurements and calibration but bind the new video URL
        const updatedVideos = videos.map((v, idx) => 
          idx === matchedIndex ? { ...v, url, hash: computedHash, uploadDate } : v
        );
        setVideos(updatedVideos);
        setActiveVideo({ ...existingVideo, url, hash: computedHash, uploadDate });
        return;
      }
    }

    const newVideo: ProjectVideoData = {
      id: `v-${Date.now()}`,
      name,
      url,
      resolution,
      duration: 30,
      fps: 30,
      totalFrames,
      calibrationId: calibrations[0]?.id || null,
      modelId: models[0]?.id || null,
      measurements: [],
      distressItems: [],
      inferenceResults: { detections: [], lanes: [], segmentation: {} },
      eventLog: [],
      hash: computedHash,
      uploadDate
    };

    const updatedVideos = [...videos, newVideo];
    setVideos(updatedVideos);
    setActiveVideo(newVideo);
    addNotification('Video Uploaded', `Source footage "${name}" uploaded to project.`);
  };

  const removeVideoFromProject = (id: string) => {
    const updated = videos.filter(v => v.id !== id);
    setVideos(updated);
    if (activeVideo?.id === id) {
      setActiveVideo(updated[0] || null);
    }
  };

  const createNewProject = (name: string, description: string): FullProject => {
    const newProj: FullProject = {
      id: `p-${Date.now()}`,
      name,
      dateModified: new Date().toISOString().replace('T', ' ').substring(0, 16),
      thumbnail: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=60',
      description,
      videos: [],
      calibrations: [...MOCK_CALIBRATIONS],
      models: [...models],
      activeVideoId: null,
      settings: { ...settings }
    };
    
    const updatedList = [newProj, ...projects];
    setProjects(updatedList);
    setActiveProject(newProj);
    setVideos([]);
    setActiveVideo(null);
    setCurrentView('workspace');
    addNotification('Project Created', `Project "${name}" was successfully initialized.`);
    if (user) {
      ProjectService.saveProjectsForUser(updatedList, user.id);
    }
    return newProj;
  };

  // Calibration Diagnostics Sync
  useEffect(() => {
    if (activeCalibration) {
      const H = computeHomography(
        activeCalibration.image_points,
        activeCalibration.world_points
      );
      setHomographyMatrix(H);
      if (H) {
        const diag = CalibrationService.getDiagnostics(activeCalibration, H);
        setCalibrationDiagnostics(diag);
      } else {
        setCalibrationDiagnostics(null);
      }
    } else {
      setHomographyMatrix(null);
      setCalibrationDiagnostics(null);
    }
  }, [activeCalibration]);

  // Sync theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const setVideoFile = (fileOrUrl: File | string) => {
    const name = typeof fileOrUrl === 'string' ? fileOrUrl.substring(fileOrUrl.lastIndexOf('/') + 1) : fileOrUrl.name;
    addVideoToProject(name, fileOrUrl);
    setCurrentView('workspace');
  };

  const saveCalibration = (name: string, imagePoints: Point2D[], gridW: number, gridH: number): Calibration => {
    const worldPoints: Point2D[] = [
      { x: 0, y: 0 }, { x: gridW, y: 0 }, { x: gridW, y: gridH }, { x: 0, y: gridH }
    ];
    const newCal: Calibration = {
      id: `cal-${Date.now()}`,
      name,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      image_points: imagePoints,
      world_points: worldPoints,
      gridWidth: gridW,
      gridHeight: gridH
    };
    setCalibrations(prev => [newCal, ...prev]);
    setActiveCalibration(newCal);
    addNotification('Calibration Grid Saved', `Grid "${name}" saved and loaded.`);
    return newCal;
  };

  const deleteCalibration = (id: string) => {
    setCalibrations(prev => prev.filter(c => c.id !== id));
    if (activeCalibration?.id === id) {
      setActiveCalibration(null);
    }
  };

  const addMeasurement = (measurement: Omit<Measurement, 'id'>) => {
    const newMeas: Measurement = {
      id: `meas-${Date.now()}`,
      ...measurement
    };
    setMeasurements(prev => [...prev, newMeas]);
    pushActionToUndo({ type: 'add_measurement', data: newMeas });
  };

  const deleteMeasurement = (id: string) => {
    const found = measurements.find(m => m.id === id);
    if (found) {
      setMeasurements(prev => prev.filter(m => m.id !== id));
      pushActionToUndo({ type: 'delete_measurement', data: found });
    }
  };

  const clearMeasurements = () => {
    setMeasurements([]);
  };

  const pushActionToUndo = (action: { type: string; data: any }) => {
    setUndoStack(prev => [...prev, action]);
    setRedoStack([]);
  };

  const undoLastAction = () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);

    if (action.type === 'add_measurement') {
      setMeasurements(prev => prev.filter(m => m.id !== action.data.id));
    } else if (action.type === 'delete_measurement') {
      setMeasurements(prev => [...prev, action.data]);
    }
  };

  const redoLastAction = () => {
    if (redoStack.length === 0) return;
    const action = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);

    if (action.type === 'add_measurement') {
      setMeasurements(prev => [...prev, action.data]);
    } else if (action.type === 'delete_measurement') {
      setMeasurements(prev => prev.filter(m => m.id !== action.data.id));
    }
  };

  const addTrafficLine = (line: Omit<TrafficLine, 'id' | 'upstreamCount' | 'downstreamCount'>) => {
    const newLine: TrafficLine = {
      id: `line-${Date.now()}`,
      ...line,
      upstreamCount: 0,
      downstreamCount: 0
    };
    setTrafficLines(prev => [...prev, newLine]);
  };

  const editTrafficLine = (id: string, updates: Partial<TrafficLine>) => {
    setTrafficLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteTrafficLine = (id: string) => {
    setTrafficLines(prev => prev.filter(l => l.id !== id));
  };

  const addTrafficROI = (roi: Omit<TrafficROI, 'id'>) => {
    const newROI: TrafficROI = {
      id: `roi-${Date.now()}`,
      ...roi
    };
    setTrafficROIs(prev => [...prev, newROI]);
  };

  const deleteTrafficROI = (id: string) => {
    setTrafficROIs(prev => prev.filter(r => r.id !== id));
  };

  const addDistressItem = (item: { class: 'pothole' | 'crack'; pixels: Point2D[]; type?: string }) => {
    const worldPts = item.pixels.map(p => projectPoint(p, homographyMatrix));
    const n = worldPts.length;
    let area = 0.0;
    if (n >= 3) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        sum += worldPts[i].x * worldPts[next].y - worldPts[next].x * worldPts[i].y;
      }
      area = Math.abs(sum) * 0.5;
    } else {
      area = 0.02;
    }

    const u_coords = worldPts.map(pt => pt.x);
    const v_coords = worldPts.map(pt => pt.y);
    const u_span = u_coords.length ? Math.max(...u_coords) - Math.min(...u_coords) : 0.2;
    const v_span = v_coords.length ? Math.max(...v_coords) - Math.min(...v_coords) : 0.2;

    const length = Math.max(u_span, v_span);
    const width = Math.min(u_span, v_span);
    const distance_m = v_coords.length ? Math.min(...v_coords) : 10.0;

    let severity: DistressItem['severity'] = 'low';
    let score = 25;
    let recommendation = 'Monitor Condition';
    let priority: DistressItem['priority'] = 'low';

    if (item.class === 'pothole') {
      if (area < 0.05 && width < 0.20) {
        severity = 'low'; score = 25; recommendation = 'Monitor Condition'; priority = 'low';
      } else if (area < 0.20 && width < 0.45) {
        severity = 'medium'; score = 55; recommendation = 'Minor Patch Repair'; priority = 'medium';
      } else if (area < 0.50 && width < 0.75) {
        severity = 'high'; score = 80; recommendation = 'Deep Patching / Milling'; priority = 'high';
      } else {
        severity = 'critical'; score = 95; recommendation = 'Emergency Patching Repair'; priority = 'critical';
      }
    } else {
      const crack_length = n >= 2 ? worldPts.reduce((acc, curr, idx) => {
        if (idx === 0) return 0;
        const prev = worldPts[idx - 1];
        return acc + Math.sqrt((curr.x - prev.x)**2 + (curr.y - prev.y)**2);
      }, 0) : 0.5;

      const width_mm = 8.0;
      area = crack_length * (width_mm / 1000.0);
      
      if (crack_length < 1.2 && width_mm < 6.0) {
        severity = 'minor'; score = 20; recommendation = 'Routine Sealing'; priority = 'low';
      } else if (crack_length < 3.5 && width_mm < 15.0) {
        severity = 'moderate'; score = 50; recommendation = 'Crack Filling & Sealing'; priority = 'medium';
      } else if (crack_length < 7.0 && width_mm < 30.0) {
        severity = 'severe'; score = 75; recommendation = 'Joint Seal Replacement / Milling'; priority = 'high';
      } else {
        severity = 'critical'; score = 90; recommendation = 'Full Depth Slab Reconstruction'; priority = 'critical';
      }
    }

    const newItem: DistressItem = {
      id: `manual-defect-${Date.now()}`,
      class: item.class,
      type: item.type || 'longitudinal',
      severity,
      score,
      length_cm: item.class === 'pothole' ? Math.round(length * 100) : undefined,
      length_m: item.class === 'crack' ? Math.round(length * 10) / 10 : undefined,
      width_cm: item.class === 'pothole' ? Math.round(width * 100) : undefined,
      width_mm: item.class === 'crack' ? 8.0 : undefined,
      area_sq_m: Math.round(area * 1000) / 1000,
      perimeter_m: Math.round((worldPts.reduce((acc, curr, idx) => {
        const next = worldPts[(idx + 1) % n];
        return acc + Math.sqrt((next.x - curr.x)**2 + (next.y - curr.y)**2);
      }, 0)) * 100) / 100,
      distance_m: Math.round(distance_m * 10) / 10,
      recommendation,
      priority,
      pixels: item.pixels
    };

    setDistressItems(prev => [...prev, newItem]);
  };

  const deleteDistressItem = (id: string | number) => {
    setDistressItems(prev => prev.filter(defect => defect.id !== id));
  };

  // Model registry endpoints
  const loadModelsFromBackend = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/models`);
      if (res.ok) {
        const data = await res.json();
        setModels(data);
        const activeItem = data.find((m: Model) => m.status === 'Active');
        if (activeItem) setActiveInferenceModel(activeItem);
      }
    } catch (e) {
      console.warn("FastAPI backend offline, loading mock models.");
      const defaults: Model[] = [
        { id: 'm1', name: 'YOLOv8n-RoadDamage.onnx', type: 'Segmentation', framework: 'ONNX', input_resolution: '640x640', fileSize: '12.4 MB', uploadDate: '2026-06-23 15:40', status: 'Active', category: 'Segmentation' },
        { id: 'm2', name: 'ResNet50-LaneDetection.pt', type: 'Lane Detection', framework: 'PyTorch', input_resolution: '1280x720', fileSize: '98.2 MB', uploadDate: '2026-06-22 11:20', status: 'Inactive', category: 'Lane Detection' },
        { id: 'm3', name: 'ByteTrack-Vehicle.engine', type: 'Tracking', framework: 'TensorRT', input_resolution: '1920x1080', fileSize: '45.1 MB', uploadDate: '2026-06-21 09:12', status: 'Active', category: 'Tracking' }
      ];
      setModels(defaults);
      setActiveInferenceModel(defaults[0]);
    }
  };

  const [historyJobs, setHistoryJobs] = useState<JobHistoryItem[]>([]);
  const loadHistoryJobs = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryJobs(data);
      }
    } catch (e) {
      setHistoryJobs([
        { id: 'job-101', name: 'US-101 Lane Trace', model_name: 'ResNet50-LaneDetection.pt', video_name: 'highway_traffic.mp4', date: '2026-06-22 14:15', status: 'Completed', total_frames: 1200, avg_fps: 32.4 },
        { id: 'job-102', name: 'Pothole Scan Run 2', model_name: 'YOLOv8n-RoadDamage.onnx', video_name: 'pavement_distress_clip.mp4', date: '2026-06-23 11:10', status: 'Completed', total_frames: 840, avg_fps: 41.2 }
      ]);
    }
  };

  const addModel = async (
    name: string,
    category: Model['category'],
    fileSize: string,
    resolution = "640x640",
    framework?: string,
    channels = 3,
    normalization = "None",
    classes: string[] = [],
    outputs: any = {}
  ) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('file_size', fileSize);
      formData.append('resolution', resolution);
      if (framework) formData.append('framework', framework);
      formData.append('channels', String(channels));
      formData.append('normalization', normalization);
      formData.append('classes', classes.join(','));
      formData.append('outputs', JSON.stringify(outputs));

      const res = await fetch(`${BACKEND_BASE}/api/models/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        loadModelsFromBackend();
        addNotification('Model Added', `AI Model weights "${name}" registered successfully.`);
      }
    } catch (e) {
      const ext = name.split('.').pop()?.toUpperCase() || 'ONNX';
      const newModel: Model = {
        id: `model-${Date.now()}`,
        name,
        type: category,
        framework: (framework || (ext === 'PT' || ext === 'PTH' ? 'PyTorch' : ext === 'ENGINE' ? 'TensorRT' : 'ONNX')) as any,
        input_resolution: resolution,
        channels,
        normalization,
        classes,
        outputs,
        fileSize,
        uploadDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Inactive',
        category
      };
      setModels(prev => [newModel, ...prev]);
      addNotification('Model Added', `AI Model weights "${name}" registered successfully.`);
    }
  };

  const deleteModel = async (id: string) => {
    try {
      await fetch(`${BACKEND_BASE}/api/models/${id}`, { method: 'DELETE' });
      loadModelsFromBackend();
    } catch (e) {
      setModels(prev => prev.filter(m => m.id !== id));
    }
  };

  const toggleModelStatus = async (id: string) => {
    try {
      await fetch(`${BACKEND_BASE}/api/models/${id}/toggle`, { method: 'POST' });
      loadModelsFromBackend();
    } catch (e) {
      setModels(prev =>
        prev.map(m => (m.id === id ? { ...m, status: m.status === 'Active' ? 'Inactive' : 'Active' } : m))
      );
    }
  };

  const renameModel = async (id: string, name: string) => {
    try {
      await fetch(`${BACKEND_BASE}/api/models/${id}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      loadModelsFromBackend();
    } catch (e) {
      setModels(prev => prev.map(m => (m.id === id ? { ...m, name } : m)));
    }
  };

  const updateModelConfig = (updates: Partial<ModelConfig>) => {
    setModelConfig(prev => ({ ...prev, ...updates }));
  };

  const deleteHistoryJob = async (id: string) => {
    try {
      await fetch(`${BACKEND_BASE}/api/history/${id}`, { method: 'DELETE' });
      loadHistoryJobs();
    } catch (e) {
      setHistoryJobs(prev => prev.filter(j => j.id !== id));
    }
  };

  // WebSocket inference
  const wsRef = useRef<WebSocket | null>(null);
  const [crossedVehicles, setCrossedVehicles] = useState<Record<string, number[]>>({});

  const processFrameAnalytics = (tracks: Track[], _laneOccupancy: Record<string, number>, frameIdx: number, incomingAnalytics?: TrafficAnalyticsData) => {
    const H_inv = invertMatrix(homographyMatrix);
    if (tracks.length > 0 && H_inv && trafficLines.length > 0) {
      trafficLines.forEach(line => {
        if (line.points.length !== 2) return;
        const [lp1, lp2] = line.points;
        tracks.forEach(track => {
          if (!track.history || track.history.length < 2) return;
          const lastPt = track.history[track.history.length - 1];
          const prevPt = track.history[track.history.length - 2];
          const pCurr = projectWorldToPixel({ x: lastPt[0], y: lastPt[1] }, H_inv);
          const pPrev = projectWorldToPixel({ x: prevPt[0], y: prevPt[1] }, H_inv);

          if (lineSegmentsIntersect(lp1, lp2, pPrev, pCurr)) {
            setCrossedVehicles(prev => {
              const lineCrossedList = prev[line.id] || [];
              if (lineCrossedList.includes(track.id)) return prev;
              const direction = getCrossingDirection(lp1, lp2, pPrev, pCurr);
              setTrafficLines(currLines => currLines.map(cl => {
                if (cl.id === line.id) {
                  return direction > 0
                    ? { ...cl, upstreamCount: cl.upstreamCount + 1 }
                    : { ...cl, downstreamCount: cl.downstreamCount + 1 };
                }
                return cl;
              }));
              return { ...prev, [line.id]: [...lineCrossedList, track.id] };
            });
          }
        });
      });
    }

    let finalAnalytics = incomingAnalytics;
    if (!finalAnalytics) {
      const totalVehicles = tracks.length;
      const classWise = { car: 0, truck: 0, bus: 0, motorcycle: 0, bicycle: 0 };
      const laneWise = { "1": 0, "2": 0, "3": 0 };
      
      tracks.forEach(t => {
        const cls = t.class.toLowerCase();
        if (cls.includes('truck')) classWise.truck++;
        else if (cls.includes('bus')) classWise.bus++;
        else if (cls.includes('motorcycle')) classWise.motorcycle++;
        else if (cls.includes('cyclist') || cls.includes('bike')) classWise.bicycle++;
        else classWise.car++;

        const lIdx = String(t.lane_index);
        if (lIdx in laneWise) laneWise[lIdx as '1' | '2' | '3']++;
      });

      const densityKm = totalVehicles / 0.05;
      const flowHour = Math.min(1800, (totalVehicles + 12) * 90);
      const occupancyPct = Math.min(100.0, (totalVehicles * 4.5 / 50.0) * 100.0);

      finalAnalytics = {
        counts: { total: totalVehicles + (frameIdx > 50 ? 5 : 2), class_wise: classWise, lane_wise: laneWise },
        density: {
          area_density_km: parseFloat(densityKm.toFixed(1)),
          area_density_lane_km: parseFloat((densityKm / 3.0).toFixed(1)),
          area_density_sq_km: parseFloat((totalVehicles / 0.000555).toFixed(1)),
          lane_density: {
            "1": parseFloat((laneWise["1"] / 0.05).toFixed(1)),
            "2": parseFloat((laneWise["2"] / 0.05).toFixed(1)),
            "3": parseFloat((laneWise["3"] / 0.05).toFixed(1))
          }
        },
        flow: {
          vehicles_per_min: parseFloat((flowHour / 60.0).toFixed(1)),
          vehicles_per_hour: flowHour,
          vehicles_per_lane_hour: parseFloat((flowHour / 3.0).toFixed(1)),
          peak_flow: 1620.0,
          avg_flow: 1350.0
        },
        occupancy: {
          overall_occupancy: parseFloat(occupancyPct.toFixed(1)),
          lane_occupancy: {
            "1": parseFloat(((laneWise["1"] * 4.5 / 50.0) * 100.0).toFixed(1)),
            "2": parseFloat(((laneWise["2"] * 12.0 / 50.0) * 100.0).toFixed(1)),
            "3": parseFloat(((laneWise["3"] * 2.0 / 50.0) * 100.0).toFixed(1))
          },
          utilization: parseFloat((occupancyPct / 100.0).toFixed(2))
        },
        headway: {
          avg_headway_time: 2.1, min_headway_time: 1.1, max_headway_time: 4.5,
          avg_headway_dist: 48.2, min_headway_dist: 22.0, max_headway_dist: 95.0
        },
        queue: {
          current_queue_len_meters: 0.0, current_queue_len_vehicles: 0,
          max_queue_len_meters: 15.0, max_queue_len_vehicles: 2,
          avg_queue_len_meters: 7.5, avg_queue_len_vehicles: 1,
          is_congested: false
        },
        congestion: { status: 'free_flow', level: 'green' },
        lane_level: [
          { lane_id: 1, occupancy: parseFloat(((laneWise["1"] * 4.5 / 50.0) * 100.0).toFixed(1)), density: parseFloat((laneWise["1"] / 0.05).toFixed(1)), flow: parseFloat((flowHour / 3.0).toFixed(1)), speed: 90.0 },
          { lane_id: 2, occupancy: parseFloat(((laneWise["2"] * 12.0 / 50.0) * 100.0).toFixed(1)), density: parseFloat((laneWise["2"] / 0.05).toFixed(1)), flow: parseFloat((flowHour / 3.0).toFixed(1)), speed: 72.0 },
          { lane_id: 3, occupancy: parseFloat(((laneWise["3"] * 2.0 / 50.0) * 100.0).toFixed(1)), density: parseFloat((laneWise["3"] / 0.05).toFixed(1)), flow: parseFloat((flowHour / 3.0).toFixed(1)), speed: 18.0 }
        ]
      };
    }
    setCurrentAnalytics(finalAnalytics);
    setAnalyticsHistory(prev => [...prev, finalAnalytics!]);
    EventBus.emit('analytics_updated', finalAnalytics);
    return finalAnalytics;
  };

  const startInference = () => {
    if (!currentVideo.name || !activeInferenceModel) {
      alert("Please load a video and select an active model to start inference.");
      return;
    }
    setInferenceRunning(true);
    setInferencePaused(false);
    setInferenceProcessedFrames(0);
    setEventLog([]);
    setAnalyticsHistory([]);
    setCurrentAnalytics(null);
    setCrossedVehicles({});
    setTrafficLines(prev => prev.map(l => ({ ...l, upstreamCount: 0, downstreamCount: 0 })));
    setDistressItems([]);
    setDistressSummary(null);
    setDistressHistory([]);
    setIsPlaying(false);

    const ws = new WebSocket(`${WS_BASE}/api/ws/inference`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'start',
        config: {
          model_id: activeInferenceModel.id,
          video_name: currentVideo.name,
          conf_threshold: modelConfig.confThreshold,
          iou_threshold: modelConfig.iouThreshold,
          resolution: modelConfig.inputResolution,
          device: modelConfig.device,
          tracker: activeTracker,
          homography_matrix: homographyMatrix
        }
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.status === 'validation') {
        setValidationStatus(data.validation);
        if (data.logs) setDebugLogs(data.logs);
      } else if (data.status === 'processing') {
        setInferenceProcessedFrames(data.frame_idx);
        setInferenceFPS(data.fps);
        setCurrentFrame(data.frame_idx);
        if (data.debug) {
          setDebugLogs(prev => {
            const logs = [...prev];
            if (data.debug.inference_log) logs.push(`[SYSTEM] [Frame ${data.frame_idx}] ${data.debug.inference_log}`);
            if (logs.length > 300) logs.shift();
            return logs;
          });
        }
        const finalAnalytics = processFrameAnalytics(data.tracks || [], data.lane_occupancy || {}, data.frame_idx, data.analytics);
        const resultsObj = {
          detections: data.detections || [],
          tracks: data.tracks || [],
          lead_vehicle: data.lead_vehicle || null,
          lane_occupancy: data.lane_occupancy || {},
          events: data.events || [],
          lanes: data.lanes || [],
          segmentation: data.segmentation || {},
          analytics: finalAnalytics,
          distress: data.distress || undefined
        };
        setInferenceResults(resultsObj);
        EventBus.emit('inference_completed', resultsObj);

        if (data.distress) {
          setDistressSummary(data.distress.summary);
          setDistressHistory(prev => {
            if (prev.length > 200) prev.shift();
            return [...prev, data.distress.summary];
          });
        }
        if (data.events && data.events.length > 0) {
          setEventLog(prev => {
            const newEvents = data.events.filter((e: EventLogItem) => !prev.some(p => p.message === e.message && p.frame === e.frame));
            return [...prev, ...newEvents];
          });
        }
      } else if (data.status === 'paused') {
        setInferencePaused(true);
      } else if (data.status === 'stopped') {
        setInferenceRunning(false);
        setInferencePaused(false);
      } else if (data.status === 'completed') {
        setInferenceRunning(false);
        setInferencePaused(false);
        alert('Inference job completed successfully!');
        loadHistoryJobs();
      } else if (data.status === 'error') {
        setInferenceRunning(false);
        alert(`Inference failed: ${data.message}`);
      }
    };

    ws.onerror = () => {
      runMockInferenceFrontend();
    };

    ws.onclose = () => {
      setInferenceRunning(false);
      wsRef.current = null;
    };
  };

  const runMockInferenceFrontend = () => {
    alert("Running standalone frontend simulation.");
    setInferenceRunning(true);
    setInferencePaused(false);
    setEventLog([]);
    setAnalyticsHistory([]);
    setCurrentAnalytics(null);
    setCrossedVehicles({});
    setTrafficLines(prev => prev.map(l => ({ ...l, upstreamCount: 0, downstreamCount: 0 })));
    setDistressItems([]);
    setDistressSummary(null);
    setDistressHistory([]);

    let current = 0;
    const total = 300;
    const interval = setInterval(() => {
      if (!inferenceRunning) {
        clearInterval(interval);
        return;
      }
      current++;
      setInferenceProcessedFrames(current);
      setCurrentFrame(current);
      setInferenceFPS(30);

      const mockTracks: Track[] = [];
      const mockEvents: EventLogItem[] = [];
      const v_prog = Math.max(1.5, 45.0 - 25.0 * (current * 0.0333));
      const v1_history: [number, number][] = [];
      for (let i = Math.max(0, current - 30); i <= current; i++) {
        v1_history.push([1.85, Math.max(1.5, 45.0 - 25.0 * (i * 0.0333))]);
      }
      mockTracks.push({
        id: 101, class: "car", box: [420, 280, 480, 380], confidence: 0.94,
        world_pos: [1.85, v_prog], speed: 90.0, average_speed: 88.2, max_speed: 91.0,
        acceleration: 0.0, track_age: current, lane_index: 1, distance_to_ego: v_prog,
        gap_front: 12.4, gap_rear: null, gap_lateral: 3.7, history: v1_history
      });

      if (current === 1) mockEvents.push({ frame: current, type: "entry", message: "Vehicle #101 entered scene at 45.0m" });

      const finalAnalytics = processFrameAnalytics(mockTracks, { "1": 1, "2": 0, "3": 0 }, current);
      const hasPothole = current > 50 && current < 150;
      const hasCrack = current > 120 && current < 250;
      const mockPotholes: DistressItem[] = [];
      const mockCracks: DistressItem[] = [];
      
      if (hasPothole) {
        mockPotholes.push({
          id: 501, class: 'pothole', severity: current > 100 ? 'high' : 'medium', score: current > 100 ? 80 : 55,
          length_cm: 32.5, width_cm: 22.0, area_sq_m: 0.056, perimeter_m: 0.98,
          distance_m: Math.max(2.5, 35.0 - 15.0 * ((current - 50) * 0.0333)),
          recommendation: current > 100 ? 'Deep Patching / Milling' : 'Minor Patch Repair',
          priority: current > 100 ? 'high' : 'medium', pixels: [[420, 360], [450, 370], [430, 390], [400, 380]].map(pt => ({ x: pt[0], y: pt[1] }))
        });
      }
      if (hasCrack) {
        mockCracks.push({
          id: 502, class: 'crack', type: 'longitudinal', severity: 'moderate', score: 50,
          length_m: 2.45, width_mm: 8.5, area_sq_m: 0.021,
          distance_m: Math.max(3.0, 42.0 - 20.0 * ((current - 120) * 0.0333)),
          recommendation: 'Crack Filling & Sealing', priority: 'medium', pixels: [[550, 410], [560, 430], [580, 460], [600, 490]].map(pt => ({ x: pt[0], y: pt[1] }))
        });
      }

      const totalDefects = mockPotholes.length + mockCracks.length;
      const affectedArea = (hasPothole ? 0.056 : 0) + (hasCrack ? 0.021 : 0);
      const mockRci = Math.max(0, 100 - (hasPothole ? (current > 100 ? 28 : 15) : 0) - (hasCrack ? 10 : 0));
      const mockSummary: DistressSummary = {
        total_defects: totalDefects, total_potholes: mockPotholes.length, total_cracks: mockCracks.length,
        affected_area_sq_m: affectedArea, rci: mockRci, condition: (mockRci >= 90 ? 'excellent' : mockRci >= 75 ? 'good' : mockRci >= 55 ? 'fair' : 'poor') as any,
        priority_breakdown: { low: 0, medium: (hasPothole && current <= 100 ? 1 : 0) + (hasCrack ? 1 : 0), high: (hasPothole && current > 100 ? 1 : 0), critical: 0 }
      };

      const finalDistress = { potholes: mockPotholes, cracks: mockCracks, summary: mockSummary };
      const resultsObj = {
        detections: [{ id: 101, class: "car", box: [420, 280, 480, 380] as [number, number, number, number], confidence: 0.94 }],
        tracks: mockTracks,
        lead_vehicle: { id: 101, distance: v_prog, relative_speed: 10.0, headway: v_prog / 25.0 },
        lane_occupancy: { "1": 1, "2": 0, "3": 0 },
        events: mockEvents,
        lanes: [{ points: [{ x: 300, y: 250 }, { x: 150, y: 500 }], is_ego: true, confidence: 0.94 }],
        segmentation: {
          road: { class: 'road', polygons: [[[300, 250], [500, 250], [650, 500], [150, 500]].map(pt => ({ x: pt[0], y: pt[1] }))], opacity: 0.3, color: '#0078D4' },
          ...(hasPothole ? { pothole: { class: 'pothole', polygons: [[[420, 360], [450, 370], [430, 390], [400, 380]].map(pt => ({ x: pt[0], y: pt[1] }))], opacity: 0.6, color: '#D13438' } } : {}),
          ...(hasCrack ? { crack: { class: 'crack', polygons: [[[550, 410], [560, 430], [580, 460], [600, 490]].map(pt => ({ x: pt[0], y: pt[1] }))], opacity: 0.75, color: '#FFB900' } } : {})
        },
        analytics: finalAnalytics,
        distress: finalDistress
      };

      setInferenceResults(resultsObj);
      EventBus.emit('inference_completed', resultsObj);
      setDistressSummary(mockSummary);
      setDistressHistory(prev => [...prev, mockSummary]);
      if (mockEvents.length > 0) setEventLog(prev => [...prev, ...mockEvents]);
      if (current >= total) {
        clearInterval(interval);
        setInferenceRunning(false);
      }
    }, 33.3);
  };

  const pauseInference = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'pause' }));
    }
    setInferencePaused(true);
  };

  const resumeInference = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'resume' }));
    }
    setInferencePaused(false);
  };

  const stopInference = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'stop' }));
    }
    setInferenceRunning(false);
    setInferencePaused(false);
    setInferenceResults({ detections: [], lanes: [], segmentation: {} });
  };

  const updateOverlayVisibility = (key: 'boundingBoxes' | 'lanes' | 'segmentation' | 'keypoints', value: boolean) => {
    setOverlayVisibility(prev => ({ ...prev, [key]: value }));
  };

  const updateOverlayColor = (key: 'boundingBoxes' | 'lanes' | 'road' | 'pothole' | 'crack', color: string) => {
    setOverlayColors(prev => ({ ...prev, [key]: color }));
  };

  const exportWorkspaceData = (): string => {
    return JSON.stringify({ projects, calibrations, measurements, models, settings, modelConfig }, null, 2);
  };

  const importWorkspaceData = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.projects) setProjects(parsed.projects);
      if (parsed.calibrations) setCalibrations(parsed.calibrations);
      if (parsed.measurements) setMeasurements(parsed.measurements);
      if (parsed.models) setModels(parsed.models);
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.modelConfig) setModelConfig(parsed.modelConfig);
      return true;
    } catch (e) {
      return false;
    }
  };

  const toggleHideObject = (id: string) => {
    setHiddenObjectIds(prev => prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]);
  };

  const toggleLockObject = (id: string) => {
    setLockedObjectIds(prev => prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]);
  };

  const duplicateObject = (id: string, type: string) => {
    if (type === 'measurement') {
      const found = measurements.find(m => m.id === id);
      if (found) {
        const duplicated: Measurement = { ...found, id: `meas-${Date.now()}`, name: `${found.name} (Copy)` };
        setMeasurements(prev => [...prev, duplicated]);
      }
    }
  };

  const renameObject = (id: string, type: string, newName: string) => {
    if (type === 'measurement') {
      setMeasurements(prev => prev.map(m => m.id === id ? { ...m, name: newName } : m));
    } else if (type === 'calibration') {
      setCalibrations(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    }
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const nextSettings = { ...prev, ...updates };
      if (user) {
        updateProfile({
          theme: nextSettings.theme as any,
          units: nextSettings.units as any
        }).catch(err => console.error('Failed to sync setting to profile', err));
      }
      return nextSettings;
    });
  };

  // Auth actions
  const login = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await AuthService.login(email, password);
      setUser(data.user);
      setIsAuthenticated(true);
      if (data.user.theme) {
        setSettings(prev => ({ ...prev, theme: data.user.theme || 'dark' }));
      }
    } catch (err: any) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await AuthService.signup(email, password, name);
      setUser(data.user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || 'Signup failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      stopInference();
      AuthService.clearSession();
      setUser(null);
      setIsAuthenticated(false);
      
      // Clean up workspace cache & items for multi-user isolation
      setProjects([]);
      setActiveProject(null);
      setVideos([]);
      setActiveVideo(null);
      setCurrentVideo({ url: null, name: null, resolution: null, duration: 0, fps: 30, totalFrames: 0 });
      setMeasurements([]);
      setCalibrations([]);
      setActiveCalibration(null);
      setModels([]);
      setTrafficLines([]);
      setTrafficROIs([]);
      setAnalyticsHistory([]);
      setCurrentAnalytics(null);
      setDistressItems([]);
      setDistressSummary(null);
      setDistressHistory([]);
      setLeftRoadBoundary([]);
      setRightRoadBoundary([]);
      setRoadPolygon([]);
      setEventLog([]);
      setHiddenObjectIds([]);
      setLockedObjectIds([]);
      setZoomScale(1);
      setPanOffset({ x: 0, y: 0 });
      setInferenceResults({ detections: [], lanes: [], segmentation: {} });
      
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      return await AuthService.forgotPassword(email);
    } catch (err: any) {
      setAuthError(err.message || 'Forgot password request failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      return await AuthService.resetPassword(token, password);
    } catch (err: any) {
      setAuthError(err.message || 'Reset password request failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User> & { currentPassword?: string; newPassword?: string }) => {
    if (!user) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const updatedUser = await AuthService.updateProfile(user.id, data);
      setUser(updatedUser);
      if (data.theme) {
        setSettings(prev => ({ ...prev, theme: data.theme || 'dark' }));
      }
    } catch (err: any) {
      setAuthError(err.message || 'Profile update failed.');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <RoadLabContext.Provider
      value={{
        currentView, setCurrentView,
        sidebarExpanded, setSidebarExpanded,
        projects, activeProject, setActiveProject, createNewProject, saveCurrentProjectState,
        videos, activeVideo, setActiveVideo, addVideoToProject, removeVideoFromProject,
        currentVideo, setVideoFile, currentFrame, setCurrentFrame, isPlaying, setIsPlaying,
        activeTool, setActiveTool, zoomScale, setZoomScale, panOffset, setPanOffset,
        calibrations, activeCalibration, setActiveCalibration, saveCalibration, deleteCalibration, homographyMatrix,
        measurements, setMeasurements, addMeasurement, deleteMeasurement, clearMeasurements,
        models, addModel, deleteModel, toggleModelStatus, renameModel,
        modelConfig, setModelConfig, updateModelConfig,
        inferenceRunning, inferencePaused, inferenceFPS, inferenceProcessedFrames, activeInferenceModel, setActiveInferenceModel, inferenceResults,
        startInference, pauseInference, resumeInference, stopInference,
        overlayVisibility, updateOverlayVisibility, overlayOpacity, setOverlayOpacity, overlayColors, updateOverlayColor,
        historyJobs, loadHistoryJobs, deleteHistoryJob,
        activeTracker, setActiveTracker, selectedTrackId, setSelectedTrackId,
        bevSplitEnabled, setBevSplitEnabled, speedUnit, setSpeedUnit, distanceUnit, setDistanceUnit, trailLength, setTrailLength,
        eventLog, setEventLog, clearEventLog,
        trafficLines, setTrafficLines, addTrafficLine, editTrafficLine, deleteTrafficLine,
        trafficROIs, setTrafficROIs, addTrafficROI, deleteTrafficROI,
        analyticsHistory, setAnalyticsHistory, currentAnalytics, setCurrentAnalytics,
        distressItems, setDistressItems, addDistressItem, deleteDistressItem, distressSummary, setDistressSummary, distressHistory, setDistressHistory,
        settings, updateSettings, importWorkspaceData, exportWorkspaceData,
        selectedMeasurementId, setSelectedMeasurementId, undoStack, redoStack, pushActionToUndo, undoLastAction, redoLastAction,
        validationStatus, setValidationStatus, debugLogs, setDebugLogs, visualizationConfig, setVisualizationConfig,
        hiddenObjectIds, lockedObjectIds, toggleHideObject, toggleLockObject, duplicateObject, renameObject, calibrationDiagnostics, crossedVehicles,
        activeVisualizationLayers, setActiveVisualizationLayers,
        leftRoadBoundary, setLeftRoadBoundary,
        rightRoadBoundary, setRightRoadBoundary,
        roadPolygon, setRoadPolygon,
        clearManualRoadBoundaries,
        user, isAuthenticated, authLoading, authError,
        login, signup, logout, forgotPassword, resetPassword, updateProfile,
        notifications, addNotification, clearNotifications, markNotificationsAsRead
      }}
    >
      {children}
    </RoadLabContext.Provider>
  );
};

export const useRoadLab = () => {
  const context = useContext(RoadLabContext);
  if (context === undefined) throw new Error('useRoadLab must be used within a RoadLabProvider');
  return context;
};
export default RoadLabContext;

const MOCK_CALIBRATIONS: Calibration[] = [
  {
    id: 'cal-default',
    name: 'Standard Lane Grid (10m x 3.7m)',
    created_at: '2026-06-23 12:00',
    image_points: [
      { x: 300, y: 250 }, { x: 500, y: 250 }, { x: 650, y: 500 }, { x: 150, y: 500 }
    ],
    world_points: [
      { x: 0, y: 0 }, { x: 3.7, y: 0 }, { x: 3.7, y: 10 }, { x: 0, y: 10 }
    ],
    gridWidth: 3.7,
    gridHeight: 10
  }
];
