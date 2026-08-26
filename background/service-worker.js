// Kobo Inspiration extension — background service worker.
//
// This is the ONLY place that talks to the Kobo API. Content scripts and the
// popup send messages here; fetches from an MV3 worker are exempt from CORS
// under host_permissions, whereas a content-script fetch would be blocked.

import * as api from '../lib/api.js';
import * as session from '../lib/session.js';
import { getSettings, getEnvironment } from '../lib/config.js';

const CONTEXT_MENUS = {
  pinImage: 'kobo-pin-image',
  pinSelection: 'kobo-pin-selection',
  pinPage: 'kobo-pin-page',
};

/* ------------------------------------------------------------- lifecycle -- */

chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus();
  syncBadge();
});

chrome.runtime.onStartup.addListener(() => {
  registerContextMenus();
  syncBadge();
});

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENUS.pinImage,
      title: 'Pin image to Kōbō',
      contexts: ['image'],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENUS.pinSelection,
      title: 'Pin selection to Kōbō',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: CONTEXT_MENUS.pinPage,
      title: 'Pin this page to Kōbō',
      contexts: ['page'],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === CONTEXT_MENUS.pinImage && info.srcUrl) {
    openSheet(tab.id, { imageUrl: info.srcUrl, sourceUrl: info.pageUrl });
  }

  if (info.menuItemId === CONTEXT_MENUS.pinSelection) {
    openSheet(tab.id, {
      sourceUrl: info.pageUrl,
      description: info.selectionText,
      needsPageImage: true,
    });
  }

  if (info.menuItemId === CONTEXT_MENUS.pinPage) {
    openSheet(tab.id, { sourceUrl: info.pageUrl, captureDataUrl: await captureVisibleTab() });
  }
});

chrome.commands?.onCommand.addListener(async command => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === 'capture-area') {
    sendToTab(tab.id, { action: 'startAreaCapture' });
  }

  if (command === 'pin-page') {
    const dataUrl = await captureVisibleTab();
    openSheet(tab.id, { sourceUrl: tab.url, captureDataUrl: dataUrl });
  }
});

// Tabs that were already open when the extension was installed or reloaded have
// no content script, so sendMessage rejects with "Receiving end does not exist".
// Inject on demand and retry rather than leaving the user with a menu item that
// appears to do nothing.
async function sendToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/styles.js', 'content/content-script.js'],
      });
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.warn('Kōbō: cannot reach this page', error);
    }
  }
}

function openSheet(tabId, payload) {
  sendToTab(tabId, { action: 'openSaveSheet', data: payload });
}

async function captureVisibleTab() {
  return chrome.tabs.captureVisibleTab(null, { format: 'png' });
}

/* --------------------------------------------------------------- routing -- */

// Each handler receives the message payload and returns a value that becomes
// `{ success: true, data }`. Throwing produces `{ success: false, error }`.
const handlers = {
  getSession: () => session.getSession(),

  signIn: data => session.signIn(data),

  signOut: () => session.signOut(),

  getBoards: () => api.getBoards(),

  setActiveBrand: ({ brandId }) => session.setActiveBrand(brandId),

  createBoard: data => api.createBoard(data),

  getCollections: ({ boardId }) => api.getBoardCollections(boardId),

  savePin: data => savePin(data),

  searchLinkables: async ({ type, query }) =>
    type === 'component' ? api.searchComponents(query) : api.searchStyles(query),

  getStats: async () => {
    const [stats, savedToday] = await Promise.all([api.getStats(), session.getSavedToday()]);

    return { ...(stats || {}), saved_today: savedToday };
  },

  getSettings: () => getSettings(),

  getEnvironment: () => getEnvironment(),

  captureVisibleTab: () => captureVisibleTab(),

  // The popup can't safely sendMessage to a tab itself (the content script may
  // not be there), so it delegates both of its tab actions here.
  startAreaCapture: ({ tabId }) => sendToTab(tabId, { action: 'startAreaCapture' }),

  pinVisibleTab: async ({ tabId, sourceUrl, title }) => {
    openSheet(tabId, { captureDataUrl: await captureVisibleTab(), sourceUrl, title });
  },
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = handlers[message?.action];

  if (!handler) {
    sendResponse({ success: false, error: `Unknown action: ${message?.action}` });

    return false;
  }

  Promise.resolve(handler(message.data || {}, sender))
    .then(data => sendResponse({ success: true, data }))
    .catch(async error => {
      if (error?.status === 401) {
        await session.clearExpiredSession();
        sendResponse({ success: false, error: 'Session expired. Please sign in again.', authExpired: true });

        return;
      }

      sendResponse({ success: false, error: error?.message || 'Something went wrong' });
    });

  return true; // response is async
});

/* ------------------------------------------------------------------ save -- */

async function savePin({
  boardId,
  collectionId,
  title,
  description,
  imageUrl,
  captureDataUrl,
  sourceUrl,
  tags,
  links,
  extractColours,
}) {
  let pin;

  if (captureDataUrl) {
    pin = await api.createPinFromBlob({
      boardId,
      title,
      description,
      sourceUrl,
      tags,
      blob: await dataUrlToBlob(captureDataUrl),
    });
  } else {
    pin = await api.createPin({ boardId, title, description, imageUrl, sourceUrl, tags });
  }

  // Everything below is enrichment — a failure here shouldn't lose the pin, so
  // each step is reported back rather than thrown.
  const warnings = [];

  if (collectionId) {
    try {
      await api.movePinToCollection(pin.id, collectionId);
    } catch (error) {
      warnings.push(`Saved, but couldn't file it in the collection: ${error.message}`);
    }
  }

  for (const link of links || []) {
    try {
      await api.linkPin(pin.id, link);
    } catch (error) {
      warnings.push(`Saved, but couldn't link ${link.linkableType}: ${error.message}`);
    }
  }

  if (extractColours) {
    try {
      await api.extractPinColours(pin.id);
    } catch {
      warnings.push('Saved, but colour extraction could not be queued.');
    }
  }

  await session.recordSave();
  await syncBadge();

  return { pin, warnings };
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);

  return response.blob();
}

// The badge counts today's saves. getSavedToday() is date-keyed, so this also
// clears yesterday's number on the first wake-up of a new day.
async function syncBadge() {
  const count = await session.getSavedToday();
  await chrome.action.setBadgeText({ text: count ? String(count) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#7c8471' });
}
