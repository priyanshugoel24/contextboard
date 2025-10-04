export { ablyConfig } from './ably';
export { analyticsConfig } from './analytics';
export { apiConfig } from './api';
export { appConfig } from './app';
export { authConfig } from './auth';
export { cardConfig } from './cards';
export { channelsConfig } from './channels';
export { databaseConfig } from './database';
export { environmentConfig } from './environment';
export { focusModeConfig } from './focusMode';
export * from './animations';
export { geminiConfig } from './gemini';
export { middlewareConfig } from './middleware';
export { paginationConfig } from './pagination';
export { cspConfig } from './security';
export { statusConfig } from './status';
export { supabaseConfig } from './supabase';
export { timeConfig } from './time';
export { uiConfig } from './ui';
export { validationConfig } from './validation';

// Re-export common configurations for convenience
export const config = {
  ably: () => import('./ably').then(m => m.ablyConfig),
  analytics: () => import('./analytics').then(m => m.analyticsConfig),
  api: () => import('./api').then(m => m.apiConfig),
  app: () => import('./app').then(m => m.appConfig),
  auth: () => import('./auth').then(m => m.authConfig),
  cards: () => import('./cards').then(m => m.cardConfig),
  channels: () => import('./channels').then(m => m.channelsConfig),
  database: () => import('./database').then(m => m.databaseConfig),
  focusMode: () => import('./focusMode').then(m => m.focusModeConfig),
  gemini: () => import('./gemini').then(m => m.geminiConfig),
  pagination: () => import('./pagination').then(m => m.paginationConfig),
  status: () => import('./status').then(m => m.statusConfig),
  time: () => import('./time').then(m => m.timeConfig),
  ui: () => import('./ui').then(m => m.uiConfig),
  validation: () => import('./validation').then(m => m.validationConfig),
} as const;
