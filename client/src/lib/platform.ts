import { useState, useEffect } from 'react';

export type Platform = 'web' | 'ios' | 'android';

export function getPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'web';
  }

  const w = window as any;

  if (w.__FORESCORE_NATIVE_IOS__ === true) {
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
      if (platform === 'ios') return 'ios';
      if (platform === 'android') return 'android';
      return 'ios';
    }
  }

  const envPlatform = import.meta.env.VITE_PLATFORM;
  if (envPlatform === 'ios') return 'ios';
  if (envPlatform === 'android') return 'android';

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('forescore-ios') || ua.includes('capacitor-ios')) {
    return 'ios';
  }

  if (w.webkit?.messageHandlers && /iPhone|iPad|iPod/.test(navigator.userAgent) && !/Safari\//.test(navigator.userAgent)) {
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
  const [platform, setPlatform] = useState<Platform>(() => getPlatform());

  useEffect(() => {
    const detected = getPlatform();
    if (detected !== platform) {
      setPlatform(detected);
    }

    if (detected === 'web') {
      const timer = setTimeout(() => {
        const recheck = getPlatform();
        if (recheck !== 'web') {
          setPlatform(recheck);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isNative: platform !== 'web',
    isWeb: platform === 'web',
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
