import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [sessionsData, rulesData] = await Promise.all([
        api.getSessions(),
        api.getRules()
      ]);
      setSessions(sessionsData);
      setRules(rulesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const value = {
    sessions,
    rules,
    loading,
    refreshSessions: () => api.getSessions().then(setSessions),
    refreshRules: () => api.getRules().then(setRules),
    refreshAll: loadData
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
