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

// True for a load-unpacked install, false for one installed from the Web Store.
// getSelf() needs no "management" permission. Used to keep the staging/local
// environment switcher out of customer builds — shipping a "Local dev" option
// to a real user is how someone ends up pinning into a server that isn't there.
export async function isDevelopmentBuild() {
  try {
    const self = await chrome.management.getSelf();

    return self.installType === 'development';
  } catch {
    return false;
  }
}

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

  if (environment !== DEFAULT_ENVIRONMENT && !(await isDevelopmentBuild())) {
    return ENVIRONMENTS[DEFAULT_ENVIRONMENT];
  }

  return ENVIRONMENTS[environment] || ENVIRONMENTS[DEFAULT_ENVIRONMENT];
}
