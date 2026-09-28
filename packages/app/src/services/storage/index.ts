import type { AppState } from '../../types';
export interface StateStorage {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
}
export interface DataRepository<T> {
  list(): Promise<T[]>;
  save(value: T): Promise<void>;
  remove(id: string): Promise<void>;
}
