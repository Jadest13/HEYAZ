import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../types';
import type { StateStorage } from '../services/storage';
import { fillDemoData, initialState } from '../mocks/initial';
interface Store {
  state: AppState;
  update: (fn: (previous: AppState) => AppState) => void;
  error: string;
  clearError: () => void;
}
const Context = createContext<Store | null>(null);
export function AppProvider({ storage, children }: { storage: StateStorage; children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let live = true;
    storage
      .load()
      .then((data) => {
        if (live) {
          if (data) setState(fillDemoData(data));
          setReady(true);
        }
      })
      .catch(() => {
        if (live) setError('저장된 데이터를 읽지 못했습니다. 새로고침 후 다시 시도해주세요.');
      });
    return () => {
      live = false;
    };
  }, [storage]);
  useEffect(() => {
    if (ready) {
      queue.current = queue.current
        .then(() => storage.save(state))
        .catch(() => setError('저장하지 못했습니다. 저장 공간을 확인해주세요.'));
    }
  }, [state, ready, storage]);
  if (!ready)
    return (
      <Context.Provider value={{ state, update: () => {}, error, clearError: () => setError('') }}>
        {error ? children : null}
      </Context.Provider>
    );
  return (
    <Context.Provider
      value={{ state, update: (fn) => setState(fn), error, clearError: () => setError('') }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error('AppProvider is required');
  return context;
}
