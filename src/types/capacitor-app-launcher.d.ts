declare module 'capacitor-app-launcher' {
  export interface AppLauncherOptions {
    uri: string;
    mimeType: string;
  }
  export interface AppLauncherPlugin {
    launchApp(options: AppLauncherOptions): Promise<void>;
  }
  export const AppLauncher: AppLauncherPlugin;
}
