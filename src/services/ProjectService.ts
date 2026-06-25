import { type Project, type Measurement, type Model } from '../context/RoadLabContext';
import { type Calibration } from '../utils/calibrationMath';
import { EventBus } from './EventBus';
import { WorkspaceInitializer } from './WorkspaceInitializer';

export interface ProjectVideoData {
  id: string;
  name: string;
  url: string | null;
  resolution: string | null;
  duration: number;
  fps: number;
  totalFrames: number;
  calibrationId: string | null;
  modelId: string | null;
  measurements: Measurement[];
  distressItems: any[];
  inferenceResults: any;
  eventLog: any[];
  leftRoadBoundary?: any[];
  rightRoadBoundary?: any[];
  roadPolygon?: any[];
  hash?: string;
  uploadDate?: string;
}

export interface FullProject extends Project {
  videos: ProjectVideoData[];
  calibrations: Calibration[];
  models: Model[];
  activeVideoId: string | null;
  settings: any;
}

export class ProjectService {
  public static loadProjectsForUser(userId: string): FullProject[] {
    const userKey = `roadlab_projects_${userId}`;
    const raw = localStorage.getItem(userKey);
    if (!raw) {
      // First login experience: populate initial default project structure isolated to this user ID
      const starter = WorkspaceInitializer.generateStarterWorkspace(userId);
      this.saveProjectsForUser(starter, userId);
      return starter;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error loading projects for user', e);
      return [];
    }
  }

  public static saveProjectsForUser(projects: FullProject[], userId: string): void {
    const cleanedProjects = projects.map(p => ({
      ...p,
      videos: p.videos.map(v => ({
        ...v,
        url: null // Do not permanently store original video binary
      }))
    }));
    localStorage.setItem(`roadlab_projects_${userId}`, JSON.stringify(cleanedProjects));
    EventBus.emit('save_triggered');
  }
}
export default ProjectService;
