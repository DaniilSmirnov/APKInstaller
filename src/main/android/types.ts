export type PermissionState = 'granted' | 'denied' | 'unsupported' | 'unknown';
export interface AndroidPermission { permission: string; state: PermissionState }
export interface DisplaySettings { physicalDensity: number | null; overrideDensity: number | null; physicalSize: { width: number; height: number } | null; overrideSize: { width: number; height: number } | null }
