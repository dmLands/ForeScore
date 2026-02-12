import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

export function getPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'web';
  }

  try {
    const isNative = Capacitor.isNativePlatform();
    const capPlatform = Capacitor.getPlatform();
    console.log('[Platform] Capacitor detection: isNative=', isNative, 'platform=', capPlatform);
    if (isNative) {
      if (capPlatform === 'ios') return 'ios';
      if (capPlatform === 'android') return 'android';
    }
  } catch (e) {
    console.log('[Platform] Capacitor detection failed:', e);
  }

  const envPlatform = import.meta.env.VITE_PLATFORM;
  if (envPlatform === 'ios') return 'ios';
  if (envPlatform === 'android') return 'android';

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('forescore-ios') || ua.includes('capacitor-ios')) {
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
