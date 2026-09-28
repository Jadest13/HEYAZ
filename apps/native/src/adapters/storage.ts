import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from '@heyaz/app/services/storage/index';
import type { AppState } from '@heyaz/app/types/index';
export const storage: StateStorage = {
  async load() {
    const raw = await AsyncStorage.getItem('heyaz:v1');
    if (!raw) return null;
    const data = JSON.parse(raw) as AppState;
    if (data.version !== 1) throw new Error('지원되지 않는 데이터');
    return data;
  },
  async save(s) {
    await AsyncStorage.setItem('heyaz:v1', JSON.stringify(s));
  },
};
