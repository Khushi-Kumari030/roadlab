export type EventType =
  | 'video_uploaded'
  | 'calibration_applied'
  | 'inference_completed'
  | 'tracking_updated'
  | 'measurement_created'
  | 'analytics_updated'
  | 'report_generated'
  | 'project_changed'
  | 'video_changed'
  | 'save_triggered';

type EventCallback = (data: any) => void;

export class EventBus {
  private static listeners: Record<string, EventCallback[]> = {};

  public static subscribe(event: EventType, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  public static emit(event: EventType, data?: any): void {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
}
export default EventBus;
