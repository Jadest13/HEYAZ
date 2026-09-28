export type WorkoutGoal = 'strength' | 'fat-loss' | 'fitness';
export interface Profile {
  name: string;
  goal: WorkoutGoal;
  height: number;
  weight: number;
  targetWeight: number;
  experience: 'beginner' | 'intermediate' | 'advanced';
  days: number[];
  minutes: number;
  location: string;
  equipment: string;
  excluded: string;
  notifications: boolean;
  onboarded: boolean;
}
export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  kind: 'strength' | 'timed';
  met: number;
  targets?: string[];
  cardio?: boolean;
}
export interface PlannedExercise {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  duration: number;
  restSeconds: number;
}
export interface WorkoutDay {
  id: string;
  dayOfWeek: number;
  startTime: string;
  title: string;
  estimatedDuration: number;
  exercises: PlannedExercise[];
}
export interface WorkoutPlan {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  days: WorkoutDay[];
  goal: WorkoutGoal;
  createdBy: 'AI' | 'USER';
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export interface SetRecord {
  id: string;
  exerciseId: string;
  set: number;
  reps: number;
  weight: number;
  duration: number;
  rpe?: number;
  status: 'completed' | 'skipped';
  completedAt: string;
}
export interface WorkoutSession {
  id: string;
  date: string;
  startedAt: string;
  endedAt?: string;
  planRevision: number;
  day: WorkoutDay;
  records: SetRecord[];
  status: 'active' | 'completed' | 'partial';
  restUntil?: number;
}
export interface BodyMetric {
  id: string;
  date: string;
  weight: number;
  height: number;
  bmi: number;
  bodyFatPercentage?: number;
  skeletalMuscleMass?: number;
}
export interface BurningEvent {
  id: string;
  scheduledAt: number;
  exerciseId: string;
  reps: number;
  duration: number;
  status: 'pending' | 'completed' | 'partial' | 'skipped';
}
export interface BurningDaySession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  interval: number;
  pool: string[];
  events: BurningEvent[];
  status: 'active' | 'ended';
}
export interface PlanChangeProposal {
  presentation?: 'week' | 'day' | 'change';
  focusWeekday?: number;
  id: string;
  baseRevision: number;
  before: WorkoutPlan;
  after: WorkoutPlan;
  status: 'pending' | 'applied' | 'rejected';
  reason: string;
}
export type AIComponent =
  | { type: 'INSIGHT'; text: string }
  | { type: 'PLAN_CHANGE'; proposal: PlanChangeProposal }
  | { type: 'CHOICE'; options: string[] };
export interface AIMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  components: AIComponent[];
  outcome?: 'answer' | 'off-topic' | 'clarification';
}
export interface CoachUsage {
  free: { start: number; used: number };
  paid: { start: number; used: number };
  corrections: number;
  canCorrect: boolean;
}
export interface FitnessAssessment {
  id: string;
  date: string;
  records: PlannedExercise[];
  summary: string;
}
export interface AppState {
  version: 1;
  demoDataVersion?: number;
  customExercises?: Exercise[];
  profile: Profile;
  plan: WorkoutPlan;
  sessions: WorkoutSession[];
  metrics: BodyMetric[];
  burning: BurningDaySession[];
  messages: AIMessage[];
  activeSessionId?: string;
  paidPlan?: boolean;
  coachUsage?: CoachUsage;
  assessments?: FitnessAssessment[];
}
