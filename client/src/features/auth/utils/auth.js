export const AUTH_CHANGE_EVENT = 'vetconnect-auth-change';

let authSnapshot = {
  user: null,
};

const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const getAuthSnapshot = () => authSnapshot;

export const subscribeAuth = (callback) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(AUTH_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
  };
};

export const saveAuth = (user) => {
  authSnapshot = {
    user: user || null,
  };
  notifyAuthChange();
};

export const getUser = () => authSnapshot.user;

export const logout = () => {
  authSnapshot = {
    user: null,
  };
  notifyAuthChange();
};

export const isLoggedIn = () => Boolean(authSnapshot.user);
