import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from './db/schema';
import StartSessionScreen from './screens/StartSessionScreen';
import ActiveSessionScreen from './screens/ActiveSessionScreen';
import HistoryScreen from './screens/HistoryScreen';
import DashboardScreen from './screens/DashboardScreen';

type Screen =
  | { name: 'start' }
  | { name: 'active'; sessionId: number }
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
  const [screen, setScreen] = useState<Screen>({ name: 'start' });

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
          onSessionComplete={() => setScreen({ name: 'start' })}
        />
      )}
      {screen.name === 'history' && <HistoryScreen onBack={() => setScreen({ name: 'start' })} />}
      {screen.name === 'dashboard' && <DashboardScreen onBack={() => setScreen({ name: 'start' })} />}
      <StatusBar style="light" />
    </>
  );
}
