import { type FullProject } from './ProjectService';
import { type Calibration } from '../utils/calibrationMath';
import { type Model } from '../context/RoadLabContext';

export class WorkspaceInitializer {
  /**
   * Generates a isolated starter workspace for a newly registered user.
   */
  public static generateStarterWorkspace(userId: string): FullProject[] {
    const starterCalibration: Calibration = {
      id: `cal-starter-${userId}`,
      name: 'Standard Dashcam Grid (12m x 3.6m)',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      image_points: [
        { x: 380, y: 280 }, { x: 900, y: 280 }, { x: 1100, y: 640 }, { x: 180, y: 640 }
      ],
      world_points: [
        { x: 0, y: 0 }, { x: 3.6, y: 0 }, { x: 3.6, y: 12 }, { x: 0, y: 12 }
      ],
      gridWidth: 3.6,
      gridHeight: 12
    };

    const starterModels: Model[] = [
      { id: `m1-${userId}`, name: 'YOLOv8n-RoadDamage.onnx', type: 'Segmentation', framework: 'ONNX', input_resolution: '640x640', fileSize: '12.4 MB', uploadDate: '2026-06-23 15:40', status: 'Active', category: 'Segmentation' },
      { id: `m2-${userId}`, name: 'ResNet50-LaneDetection.pt', type: 'Lane Detection', framework: 'PyTorch', input_resolution: '1280x720', fileSize: '98.2 MB', uploadDate: '2026-06-22 11:20', status: 'Inactive', category: 'Lane Detection' },
      { id: `m3-${userId}`, name: 'ByteTrack-Vehicle.engine', type: 'Tracking', framework: 'TensorRT', input_resolution: '1920x1080', fileSize: '45.1 MB', uploadDate: '2026-06-21 09:12', status: 'Active', category: 'Tracking' }
    ];

    const starterProject: FullProject = {
      id: `proj-starter-${userId}`,
      name: 'RoadLab Starter Project',
      dateModified: new Date().toISOString().replace('T', ' ').substring(0, 16),
      thumbnail: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=60',
      description: 'Default isolated workspace project seeded for testingperspectives and distress annotations.',
      videos: [],
      calibrations: [starterCalibration],
      models: starterModels,
      activeVideoId: null,
      settings: {
        theme: 'dark',
        units: 'm',
        exportFormat: 'CSV',
        storageUsed: '0 GB / 25 GB'
      }
    };

    return [starterProject];
  }
}
