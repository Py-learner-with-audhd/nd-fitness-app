import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from './db/schema';
import StartSessionScreen from './screens/StartSessionScreen';
import ActiveSessionScreen from './screens/ActiveSessionScreen';
import HistoryScreen from './screens/HistoryScreen';
import DashboardScreen from './screens/DashboardScreen';
import { loadActiveSession } from './activeSessionStorage';

type Screen =
  | { name: 'start' }
  | { name: 'active'; sessionId: number; initialSlotIndex?: number }
  | { name: 'history' }
  | { name: 'dashboard' };

export default function App() {
  return (
    <SQLiteProvider databaseName="nd-fitness-v2.db" onInit={migrateDbIfNeeded}>
      <AppContent />
    </SQLiteProvider>
  );
}

// Deliberately a separate component from App, rendered *inside* SQLiteProvider.
// SQLiteProvider memoizes itself on databaseName/onInit/etc but not on children,
// so screen-switching state must live below it, not above — otherwise state
// changes here get silently dropped by that memoization.
function AppContent() {
  // Resume an in-progress session on launch (e.g. after a PWA reload) instead
  // of always starting fresh — see activeSessionStorage.ts.
  const [screen, setScreen] = useState<Screen>(() => {
    const saved = loadActiveSession();
    return saved
      ? { name: 'active', sessionId: saved.sessionId, initialSlotIndex: saved.slotIndex }
      : { name: 'start' };
  });

  return (
    <>
      {screen.name === 'start' && (
        <StartSessionScreen
          onSessionStarted={(sessionId) => setScreen({ name: 'active', sessionId })}
          onViewHistory={() => setScreen({ name: 'history' })}
          onViewDashboard={() => setScreen({ name: 'dashboard' })}
        />
      )}
      {screen.name === 'active' && (
        <ActiveSessionScreen
          sessionId={screen.sessionId}
          initialSlotIndex={screen.initialSlotIndex}
          onSessionComplete={() => setScreen({ name: 'start' })}
        />
      )}
      {screen.name === 'history' && <HistoryScreen onBack={() => setScreen({ name: 'start' })} />}
      {screen.name === 'dashboard' && <DashboardScreen onBack={() => setScreen({ name: 'start' })} />}
      <StatusBar style="light" />
    </>
  );
}
