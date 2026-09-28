export type NotificationType = 'WORKOUT_REMINDER' | 'BURNING_DAY' | 'BODY_CHECK' | 'AI_COACH';
export interface NotificationService {
  requestPermission(): Promise<boolean>;
  schedule(request: {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    at: number;
  }): Promise<void>;
  cancel(id: string): Promise<void>;
}
