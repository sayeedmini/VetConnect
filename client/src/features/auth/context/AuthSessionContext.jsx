import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../services/authApi';
import { getAuthSnapshot, logout, saveAuth, subscribeAuth } from '../utils/auth';

const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const [snapshot, setSnapshot] = useState(() => getAuthSnapshot());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    return subscribeAuth(() => {
      setSnapshot(getAuthSnapshot());
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateSession = async () => {
      setIsReady(false);

      try {
        const response = await getMe();

        if (!cancelled) {
          saveAuth(response.user);
        }
      } catch (error) {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    hydrateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user: snapshot.user,
      isLoggedIn: Boolean(snapshot.user),
      isReady,
      saveAuth,
      logout,
    }),
    [isReady, snapshot.user]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSession must be used within an AuthSessionProvider');
  }

  return context;
}
