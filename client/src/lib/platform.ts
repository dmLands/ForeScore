import { useState, useEffect, useRef } from 'react';

export type Platform = 'web' | 'ios' | 'android';

let _cachedPlatform: Platform | null = null;

export function getPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'web';
  }

  const w = window as any;

  if (w.__FORESCORE_NATIVE_IOS__ === true) {
    _cachedPlatform = 'ios';
    return 'ios';
  }

  if (w.Capacitor) {
    let isNative = false;

    if (typeof w.Capacitor.isNativePlatform === 'function') {
      isNative = w.Capacitor.isNativePlatform();
    } else if (w.Capacitor.isNative === true) {
      isNative = true;
    }

    if (isNative) {
      const platform = typeof w.Capacitor.getPlatform === 'function'
        ? w.Capacitor.getPlatform()
        : null;
      if (platform === 'ios') { _cachedPlatform = 'ios'; return 'ios'; }
      if (platform === 'android') { _cachedPlatform = 'android'; return 'android'; }
      _cachedPlatform = 'ios';
      return 'ios';
    }
  }

  const envPlatform = import.meta.env.VITE_PLATFORM;
  if (envPlatform === 'ios') { _cachedPlatform = 'ios'; return 'ios'; }
  if (envPlatform === 'android') { _cachedPlatform = 'android'; return 'android'; }

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('forescore-ios') || ua.includes('capacitor-ios')) {
    _cachedPlatform = 'ios';
    return 'ios';
  }

  if (w.webkit?.messageHandlers && /iPhone|iPad|iPod/.test(navigator.userAgent) && !/Safari\//.test(navigator.userAgent)) {
    _cachedPlatform = 'ios';
    return 'ios';
  }

  return 'web';
}

export function isNativeIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isNativeApp(): boolean {
  const platform = getPlatform();
  return platform === 'ios' || platform === 'android';
}

export function isWeb(): boolean {
  return getPlatform() === 'web';
}

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>(() => {
    if (_cachedPlatform) return _cachedPlatform;
    return getPlatform();
  });
  const [platformReady, setPlatformReady] = useState(() => {
    const initial = getPlatform();
    return initial !== 'web' || _cachedPlatform !== null;
  });
  const pollCountRef = useRef(0);

  useEffect(() => {
    const detected = getPlatform();
    if (detected !== platform) {
      setPlatform(detected);
    }
    if (detected !== 'web') {
      setPlatformReady(true);
      return;
    }

    const hasNativeHints = typeof window !== 'undefined' && !!(
      (window as any).webkit?.messageHandlers ||
      /iPhone|iPad|iPod/.test(navigator.userAgent)
    );
    const maxPolls = hasNativeHints ? 40 : 10;

    const poll = setInterval(() => {
      pollCountRef.current++;
      const recheck = getPlatform();
      if (recheck !== 'web') {
        setPlatform(recheck);
        setPlatformReady(true);
        clearInterval(poll);
      } else if (pollCountRef.current >= maxPolls) {
        setPlatformReady(true);
        clearInterval(poll);
      }
    }, 100);

    return () => clearInterval(poll);
  }, []);

  return {
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isNative: platform !== 'web',
    isWeb: platform === 'web',
    platformReady,
  };
}

export function canShowPayments(): boolean {
  return isWeb();
}

export function getApiBaseUrl(): string {
  if (isNativeApp()) {
    return 'https://forescore.xyz';
  }
  return '';
}

export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}
