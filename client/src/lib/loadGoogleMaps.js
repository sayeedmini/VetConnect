let googleMapsPromise;

const GOOGLE_MAPS_SCRIPT_ID = 'vetconnect-google-maps-script';
export const DEFAULT_MAP_CENTER = { lat: 23.8103, lng: 90.4125 };
export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

export const loadGoogleMaps = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error('Missing VITE_GOOGLE_MAPS_API_KEY. Add it in client/.env before using the map picker.')
    );
  }

  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google));
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const callbackName = '__vetconnectGoogleMapsInit';
    window[callbackName] = () => {
      resolve(window.google);
      delete window[callbackName];
    };

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=marker&loading=async&callback=${callbackName}`;
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps'));
      delete window[callbackName];
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};
