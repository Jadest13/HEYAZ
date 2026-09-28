import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@heyaz/app/hooks/useApp';
import NativeApplication from '@heyaz/app/navigation/NativeApplication.native';
import { storage } from './adapters/storage';
export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider storage={storage}>
        <NativeApplication />
      </AppProvider>
    </SafeAreaProvider>
  );
}
