import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Bundled web assets (dist/) — safer for App Review than a remote URL shell.
 * Deep links: io.unwrapt.app:// and https://app.unwrapt.io (Universal Links).
 */
const config: CapacitorConfig = {
  appId: 'io.unwrapt.app',
  appName: 'Unwrapt',
  webDir: 'dist',
  // Cream behind the web view, so launch never flashes black in dark mode.
  backgroundColor: '#EDE6D8',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'app.unwrapt.io',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#EDE6D8',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#EDE6D8',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Unwrapt',
  },
};

export default config;
