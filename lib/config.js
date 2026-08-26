// Environment + persisted-settings helpers shared by the worker, popup and options page.

export const ENVIRONMENTS = {
  production: {
    label: 'Production',
    api: 'https://api.kobolabs.io/api',
    app: 'https://app.kobolabs.io',
  },
  staging: {
    label: 'Staging',
    api: 'https://phplaravel-1373325-5782615.cloudwaysapps.com/api',
    app: 'https://app.kobolabs.io',
  },
  local: {
    label: 'Local dev',
    api: 'http://localhost:8000/api',
    app: 'http://localhost:3000',
  },
};

export const DEFAULT_ENVIRONMENT = 'production';

// app_type sent on login. Must be one of config/session-management.php
// valid_app_types on the server or login returns 400.
export const APP_TYPE = 'chrome_extension';

export const DEFAULT_SETTINGS = {
  environment: DEFAULT_ENVIRONMENT,
  defaultBoardId: null,
  showQuickPinButton: true,
  autoTag: true,
  quickPinSkipsSheet: false,
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(['settings']);

  return { ...DEFAULT_SETTINGS, ...(stored.settings || {}) };
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings: next });

  return next;
}

export async function getEnvironment() {
  const { environment } = await getSettings();

  return ENVIRONMENTS[environment] || ENVIRONMENTS[DEFAULT_ENVIRONMENT];
}
