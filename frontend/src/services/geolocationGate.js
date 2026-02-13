/**
 * Central gate for browser geolocation.
 * When user turns OFF "Allow location access" in-app,
 * the app must NOT be able to read GPS (even if some module accidentally calls navigator.geolocation).
 *
 * Note: This does NOT revoke browser-level permission. It blocks usage inside the app.
 */
const LS_LOCATION = "locationAccessEnabled";

let _inited = false;
let _original = null;

function init() {
  if (_inited) return;
  _inited = true;

  if (typeof navigator === "undefined" || !navigator.geolocation) return;

  // Bind to preserve correct `this`.
  _original = {
    getCurrentPosition: navigator.geolocation.getCurrentPosition.bind(
      navigator.geolocation,
    ),
    watchPosition: navigator.geolocation.watchPosition.bind(navigator.geolocation),
    clearWatch: navigator.geolocation.clearWatch.bind(navigator.geolocation),
  };
}

export function getLocationAllowedFromLS() {
  const v = localStorage.getItem(LS_LOCATION);
  if (v === null) {
    // Backward compatibility with existing project default
    localStorage.setItem(LS_LOCATION, "true");
    return true;
  }
  return v !== "false";
}

function makeDeniedError() {
  return {
    code: 1,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    message: "Location access is disabled in app settings.",
  };
}

/**
 * Apply / remove the in-app block.
 * - allowed=true  => restore original methods
 * - allowed=false => block read attempts
 */
export function setGeolocationAllowed(allowed) {
  init();
  if (!_original || typeof navigator === "undefined" || !navigator.geolocation)
    return;

  if (allowed) {
    navigator.geolocation.getCurrentPosition = _original.getCurrentPosition;
    navigator.geolocation.watchPosition = _original.watchPosition;
    navigator.geolocation.clearWatch = _original.clearWatch;
    return;
  }

  // Block future reads. Any accidental call fails fast.
  navigator.geolocation.getCurrentPosition = (_success, error) => {
    if (typeof error === "function") error(makeDeniedError());
  };
  navigator.geolocation.watchPosition = (_success, error) => {
    if (typeof error === "function") error(makeDeniedError());
    return -1;
  };
  // keep clearWatch working (in case some watch existed before disabling)
  navigator.geolocation.clearWatch = _original.clearWatch;
}

export function getOriginalGetCurrentPosition() {
  init();
  return _original?.getCurrentPosition || null;
}

export function getOriginalWatchPosition() {
  init();
  return _original?.watchPosition || null;
}

export function getOriginalClearWatch() {
  init();
  return _original?.clearWatch || null;
}
