import { Capacitor } from '@capacitor/core';

export const usePlatform = () => {
  const platform = {
    isNative: Capacitor.isNativePlatform(),
    isIOS: Capacitor.getPlatform() === 'ios',
    isAndroid: Capacitor.getPlatform() === 'android',
    isWeb: Capacitor.getPlatform() === 'web',
    platform: Capacitor.getPlatform(),
  };

  return platform;
};