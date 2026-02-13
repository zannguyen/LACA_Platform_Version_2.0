import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getLocationAllowedFromLS,
  getOriginalClearWatch,
  getOriginalGetCurrentPosition,
  getOriginalWatchPosition,
  setGeolocationAllowed,
} from "../services/geolocationGate";

const LS_LOCATION = "locationAccessEnabled";
const LS_RANGE = "locationRangeKm";

const EVT_LOCATION = "laca:locationAccess";
const EVT_RANGE = "laca:locationRange";

const LocationAccessContext = createContext(null);

const normalizeRange = (n) => ([1, 3, 5].includes(n) ? n : 5);

function readRangeFromLS() {
  const v = localStorage.getItem(LS_RANGE);
  if (!v) {
    localStorage.setItem(LS_RANGE, "5");
    return 5;
  }
  return normalizeRange(Number(v));
}

function wrapGeoError(err) {
  const e = new Error(err?.message || "Failed to get location.");
  e.code = err?.code;
  return e;
}

export function LocationAccessProvider({ children }) {
  const [enabled, setEnabled] = useState(getLocationAllowedFromLS);
  const [rangeKm, setRangeKm] = useState(readRangeFromLS);
  const [permissionState, setPermissionState] = useState("unknown"); // unknown | granted | denied | prompt
  const [lastPosition, setLastPosition] = useState(null); // {lat,lng,ts}
  const [lastError, setLastError] = useState(null);

  const watchIdRef = useRef(null);

  // Apply the in-app gate early and whenever enabled changes.
  useEffect(() => {
    localStorage.setItem(LS_LOCATION, enabled ? "true" : "false");
    setGeolocationAllowed(enabled);

    // Notify legacy listeners (some screens may rely on this custom event)
    window.dispatchEvent(new CustomEvent(EVT_LOCATION, { detail: { enabled } }));

    // When turning OFF: stop any ongoing tracking and wipe in-memory location.
    if (!enabled) {
      const clearWatch = getOriginalClearWatch();
      if (clearWatch && watchIdRef.current != null && watchIdRef.current !== -1) {
        try {
          clearWatch(watchIdRef.current);
        } catch {
          // ignore
        }
      }
      watchIdRef.current = null;
      setLastPosition(null);
      setLastError(null);
      setPermissionState("unknown");
    }
  }, [enabled]);

  useEffect(() => {
    localStorage.setItem(LS_RANGE, String(rangeKm));
    window.dispatchEvent(new CustomEvent(EVT_RANGE, { detail: { km: rangeKm } }));
  }, [rangeKm]);

  // Track browser permission state (best-effort; not supported in all browsers).
  useEffect(() => {
    let cancelled = false;

    async function checkPerm() {
      if (!enabled) return;

      try {
        if (!navigator?.permissions?.query) return;
        const res = await navigator.permissions.query({ name: "geolocation" });
        if (cancelled) return;
        setPermissionState(res.state); // granted | denied | prompt
        res.onchange = () => setPermissionState(res.state);
      } catch {
        // ignore
      }
    }

    checkPerm();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const setRange = useCallback((km) => setRangeKm(normalizeRange(Number(km))), []);

  /**
   * Enable location with a real permission prompt (when needed).
   * - Temporarily opens the geolocation gate for the prompt.
   * - If user denies, it re-blocks and stays disabled.
   */
  const enableLocation = useCallback(
    (opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) =>
      new Promise((resolve, reject) => {
        setLastError(null);

        const originalGet = getOriginalGetCurrentPosition();
        if (!originalGet) {
          const e = new Error("Browser does not support geolocation.");
          setLastError(e);
          reject(e);
          return;
        }

        // Open gate for the permission prompt + first read.
        setGeolocationAllowed(true);

        originalGet(
          (pos) => {
            const next = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              ts: Date.now(),
            };
            setLastPosition(next);
            setPermissionState("granted");
            setEnabled(true);
            resolve(next);
          },
          (err) => {
            const e = wrapGeoError(err);
            setLastError(e);
            if (err?.code === 1) setPermissionState("denied");

            // Re-block and remain disabled
            setEnabled(false);
            setGeolocationAllowed(false);

            reject(e);
          },
          opts,
        );
      }),
    [],
  );

  const disableLocation = useCallback(() => {
    setEnabled(false);
    // gate will be applied by effect
  }, []);

  /**
   * Requests current position one time (only works when enabled=true).
   */
  const requestCurrentPosition = useCallback(
    (opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) =>
      new Promise((resolve, reject) => {
        setLastError(null);

        if (!enabled) {
          const e = new Error("Location is disabled in app settings.");
          setLastError(e);
          reject(e);
          return;
        }

        const originalGet = getOriginalGetCurrentPosition();
        if (!originalGet) {
          const e = new Error("Browser does not support geolocation.");
          setLastError(e);
          reject(e);
          return;
        }

        originalGet(
          (pos) => {
            const next = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              ts: Date.now(),
            };
            setLastPosition(next);
            setPermissionState("granted");
            resolve(next);
          },
          (err) => {
            const e = wrapGeoError(err);
            setLastError(e);
            if (err?.code === 1) setPermissionState("denied");
            reject(e);
          },
          opts,
        );
      }),
    [enabled],
  );

  /**
   * Starts watching position. Returns stop() function.
   */
  const startWatching = useCallback(
    (onUpdate, opts = { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }) => {
      setLastError(null);

      if (!enabled) {
        const e = new Error("Location is disabled in app settings.");
        setLastError(e);
        throw e;
      }

      const originalWatch = getOriginalWatchPosition();
      const clearWatch = getOriginalClearWatch();
      if (!originalWatch || !clearWatch) {
        const e = new Error("Browser does not support geolocation.");
        setLastError(e);
        throw e;
      }

      // clear previous watch
      if (watchIdRef.current != null && watchIdRef.current !== -1) {
        try {
          clearWatch(watchIdRef.current);
        } catch {
          // ignore
        }
      }

      const id = originalWatch(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            ts: Date.now(),
          };
          setLastPosition(next);
          setPermissionState("granted");
          if (typeof onUpdate === "function") onUpdate(next);
        },
        (err) => {
          const e = wrapGeoError(err);
          setLastError(e);
          if (err?.code === 1) setPermissionState("denied");
        },
        opts,
      );

      watchIdRef.current = id;

      return () => {
        if (id != null && id !== -1) {
          try {
            clearWatch(id);
          } catch {
            // ignore
          }
        }
        if (watchIdRef.current === id) watchIdRef.current = null;
      };
    },
    [enabled],
  );

  const value = useMemo(
    () => ({
      enabled,
      enableLocation,
      disableLocation,
      rangeKm,
      setRange,
      permissionState,
      lastPosition,
      lastError,
      requestCurrentPosition,
      startWatching,
    }),
    [
      enabled,
      enableLocation,
      disableLocation,
      rangeKm,
      setRange,
      permissionState,
      lastPosition,
      lastError,
      requestCurrentPosition,
      startWatching,
    ],
  );

  return (
    <LocationAccessContext.Provider value={value}>
      {children}
    </LocationAccessContext.Provider>
  );
}

export function useLocationAccess() {
  const ctx = React.useContext(LocationAccessContext);
  if (!ctx) {
    throw new Error("useLocationAccess must be used inside LocationAccessProvider");
  }
  return ctx;
}
