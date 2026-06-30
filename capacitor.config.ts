import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.labgate.app',
  appName: 'LabGate',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
