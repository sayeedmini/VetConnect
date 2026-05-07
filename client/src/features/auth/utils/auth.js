export const TOKEN_KEY = 'vetconnect_token';
export const USER_KEY = 'vetconnect_user';
export const AUTH_CHANGE_EVENT = 'vetconnect-auth-change';

const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const getAuthSnapshot = () => {
  if (typeof localStorage === 'undefined') {
    return {
      token: '',
      user: null,
    };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  if (!rawUser) {
    return {
      token,
      user: null,
    };
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser),
    };
  } catch (error) {
    localStorage.removeItem(USER_KEY);
    return {
      token,
      user: null,
    };
  }
};

export const subscribeAuth = (callback) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event) => {
    if (!event.key || event.key === TOKEN_KEY || event.key === USER_KEY) {
      callback();
    }
  };

  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
};

export const saveAuth = (token, user) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
};

export const getToken = () => {
  return typeof localStorage === 'undefined' ? '' : localStorage.getItem(TOKEN_KEY);
};

export const getUser = () => {
  return getAuthSnapshot().user;
};

export const logout = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange();
};

export const isLoggedIn = () => {
  return !!getAuthSnapshot().token;
};
