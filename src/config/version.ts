export const APP_VERSION = "1.0.1";
export const APP_BUILD_DATE = "17 de septiembre, 2026";
export const APP_BUILD_TIMESTAMP = "2026-09-17T18:00:00Z";
export const APP_RELEASE_NOTES = "Actualización PWA v1.0.1: Detección automática de versiones, ciclo controlado skipWaiting, nombres de caché versionados y retención de solicitudes.";

export interface AppVersionInfo {
  version: string;
  buildDate: string;
  buildTimestamp: string;
  releaseNotes: string;
}

export function getAppVersionInfo(): AppVersionInfo {
  return {
    version: APP_VERSION,
    buildDate: APP_BUILD_DATE,
    buildTimestamp: APP_BUILD_TIMESTAMP,
    releaseNotes: APP_RELEASE_NOTES,
  };
}
