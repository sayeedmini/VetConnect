const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

const resolveBrowserOrigin = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return trimTrailingSlash(window.location.origin);
};

const defaultApiBaseUrl = (() => {
  const browserOrigin = resolveBrowserOrigin();

  if (browserOrigin && !/localhost|127\.0\.0\.1/i.test(browserOrigin)) {
    return `${browserOrigin}/api`;
  }

  return 'http://localhost:5000/api';
})();

const defaultSocketUrl = (() => {
  const browserOrigin = resolveBrowserOrigin();

  if (browserOrigin && !/localhost|127\.0\.0\.1/i.test(browserOrigin)) {
    return browserOrigin;
  }

  return 'http://localhost:5000';
})();

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl
);

export const SOCKET_URL = trimTrailingSlash(
  import.meta.env.VITE_SOCKET_URL || defaultSocketUrl
);

export const SOCKET_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_SOCKET_IO === 'true';
