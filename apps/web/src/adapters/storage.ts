import type { StateStorage } from '@heyaz/app/services/storage/index';
import type { AppState } from '@heyaz/app/types/index';
import { planSchema } from '@heyaz/app/schemas/index';
export const storage: StateStorage = {
  async load() {
    const raw = localStorage.getItem('heyaz:v1');
    if (!raw) return null;
    const data = JSON.parse(raw) as AppState;
    if (
      data.version !== 1 ||
      !Array.isArray(data.sessions) ||
      !Array.isArray(data.metrics) ||
      !data.profile ||
      !Array.isArray(data.messages) ||
      !Array.isArray(data.burning)
    )
      throw new Error('Invalid storage');
    planSchema.parse(data.plan);
    return data;
  },
  async save(state) {
    localStorage.setItem('heyaz:v1', JSON.stringify(state));
  },
};
