// Session storage + the local "saved today" counter the popup shows.

import * as api from './api.js';

export async function getSession() {
  const { koboSession } = await chrome.storage.local.get(['koboSession']);

  return koboSession || null;
}

export async function signIn(credentials) {
  const session = await api.login(credentials);
  await chrome.storage.local.set({ koboSession: session });

  return session;
}

export async function signOut() {
  try {
    await api.logout();
  } catch {
    // A dead/expired token still signs out locally — never block on this.
  }

  await chrome.storage.local.remove(['koboSession', 'stats', 'boardCache']);
}

// Called when any request comes back 401 so the UI can drop straight to login
// instead of failing every subsequent action with a confusing error.
export async function clearExpiredSession() {
  await chrome.storage.local.remove(['koboSession', 'stats', 'boardCache']);
}

// Switching brand invalidates the cached board list: boards are created against
// a brand, so the picker must re-fetch rather than show the previous brand's.
export async function setActiveBrand(brandId) {
  const session = await getSession();
  if (!session) return null;

  const next = { ...session, activeBrandId: brandId };
  await chrome.storage.local.set({ koboSession: next });
  await chrome.storage.local.remove(['boardCache']);

  return next;
}

function today() {
  return new Date().toDateString();
}

export async function recordSave() {
  const { savedCounter } = await chrome.storage.local.get(['savedCounter']);
  const next =
    savedCounter?.date === today()
      ? { date: today(), count: savedCounter.count + 1 }
      : { date: today(), count: 1 };

  await chrome.storage.local.set({ savedCounter: next });

  return next.count;
}

export async function getSavedToday() {
  const { savedCounter } = await chrome.storage.local.get(['savedCounter']);

  return savedCounter?.date === today() ? savedCounter.count : 0;
}
