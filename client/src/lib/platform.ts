import { useState, useEffect } from 'react';

export type Platform = 'web' | 'ios' | 'android';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

export function getPlatform(): Platform {
  if (typeof window === 'undefined') {
    return 'web';
  }

  // Check for Capacitor native platform
  if (window.Capacitor?.isNativePlatform()) {
    const platform = window.Capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }

  // Check for VITE_PLATFORM environment variable (build-time override)
  const envPlatform = import.meta.env.VITE_PLATFORM;
  if (envPlatform === 'ios') return 'ios';
  if (envPlatform === 'android') return 'android';

  // Check user agent as fallback for testing in browser
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
  const [platform, setPlatform] = useState<Platform>('web');

  useEffect(() => {
    setPlatform(getPlatform());
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
