import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nilamind.app',
  appName: 'NilaMind',
  webDir: 'dist',
  // 2026-08-05 audit FIX 4 (root cause, not just the generated file): unset `cordova.accessOrigins`
  // makes `npx cap sync` regenerate android/app/src/main/res/xml/config.xml with `<access origin="*" />`
  // every time -- that file is gitignored ("Generated Config files"), so hand-editing it never persists.
  // Restricting the WHITELIST here is the only durable fix. Only the hosts this app's WebView actually
  // needs: huggingface.co (model downloads, modelCatalog.ts), github.com (release assets,
  // onDeviceAssets.ts), api.github.com (opt-in update check, autoUpdate.ts).
  cordova: {
    accessOrigins: ['https://huggingface.co', 'https://github.com', 'https://api.github.com'],
  },
};

export default config;
