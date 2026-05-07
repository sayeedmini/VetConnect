import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../services/authApi';
import { getAuthSnapshot, logout, saveAuth, subscribeAuth } from '../utils/auth';

const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const [snapshot, setSnapshot] = useState(() => getAuthSnapshot());
  const [isReady, setIsReady] = useState(() => !getAuthSnapshot().token);

  useEffect(() => {
    return subscribeAuth(() => {
      setSnapshot(getAuthSnapshot());
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateSession = async () => {
      if (!snapshot.token) {
        setIsReady(true);
        return;
      }

      setIsReady(false);

      try {
        const response = await getMe(snapshot.token);

        if (!cancelled) {
          saveAuth(snapshot.token, response.user);
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
  }, [snapshot.token]);

  const value = useMemo(
    () => ({
      token: snapshot.token,
      user: snapshot.user,
      isLoggedIn: Boolean(snapshot.token),
      isReady,
      saveAuth,
      logout,
    }),
    [isReady, snapshot.token, snapshot.user]
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
