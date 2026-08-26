import { getSettings, ENVIRONMENTS, DEFAULT_ENVIRONMENT } from '../lib/config.js';

const $ = id => document.getElementById(id);

let appOrigin = ENVIRONMENTS[DEFAULT_ENVIRONMENT].app;

function send(action, data) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action, data }, response => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: 'Reload the extension and try again.' });

        return;
      }
      resolve(response || { success: false, error: 'No response from the extension.' });
    });
  });
}

function toast(message, type = 'info') {
  const node = $('toast');
  node.textContent = message;
  node.className = `toast ${type} show`;

  setTimeout(() => (node.className = 'toast'), 3200);
}

function show(view) {
  $('loginView').classList.toggle('hidden', view !== 'login');
  $('mainView').classList.toggle('hidden', view !== 'main');
}

/* ------------------------------------------------------------------ init -- */

async function init() {
  const settings = await getSettings();
  appOrigin = (ENVIRONMENTS[settings.environment] || ENVIRONMENTS[DEFAULT_ENVIRONMENT]).app;

  // A non-production API is easy to forget about and produces baffling
  // "where did my pins go" moments — say so plainly on the sign-in screen.
  if (settings.environment !== DEFAULT_ENVIRONMENT) {
    const notice = $('envNotice');
    notice.textContent = `Connected to ${ENVIRONMENTS[settings.environment]?.label || settings.environment}`;
    notice.classList.remove('hidden');
  }

  const session = await send('getSession');

  if (session.success && session.data?.token) {
    renderAccount(session.data);
    show('main');
    loadStats();
    loadBoards();
  } else {
    show('login');
  }
}

function renderAccount(session) {
  const name = session.name || session.email?.split('@')[0] || 'Kōbō user';
  $('userName').textContent = name;
  $('userCompany').textContent = session.companyName || session.email || '';
  $('userInitial').textContent = name.charAt(0).toUpperCase();

  renderBrandPicker(session);
}

// Only worth showing to multi-brand users — a single-brand account has no
// choice to make, and the row would just be noise.
function renderBrandPicker(session) {
  const brands = session.brands || [];
  const row = $('brandRow');

  if (brands.length < 2) {
    row.classList.add('hidden');

    return;
  }

  const select = $('brandSelect');
  select.innerHTML = brands
    .map(brand => `<option value="${brand.id}">${brand.name}</option>`)
    .join('');

  const active = session.activeBrandId ?? session.selectedBrandId;
  if (active) select.value = String(active);

  row.classList.remove('hidden');

  select.onchange = async () => {
    const response = await send('setActiveBrand', { brandId: Number(select.value) });

    if (!response.success) {
      toast(response.error, 'error');

      return;
    }

    toast(`Now pinning into ${select.selectedOptions[0].textContent}`, 'success');
    loadBoards();
  };
}

async function loadStats() {
  const response = await send('getStats');
  if (!response.success) return;

  const stats = response.data || {};
  $('savedToday').textContent = stats.saved_today ?? 0;
  $('totalPins').textContent = stats.total_pins ?? 0;
  $('totalBoards').textContent = stats.total_boards ?? 0;
}

async function loadBoards() {
  const list = $('boardList');
  const response = await send('getBoards');

  if (!response.success) {
    list.innerHTML = `<div class="empty">${response.error}</div>`;

    return;
  }

  const boards = response.data || [];

  if (!boards.length) {
    list.innerHTML = '<div class="empty">No boards yet. Create your first one in Kōbō, or from the save sheet when you pin an image.</div>';

    return;
  }

  list.innerHTML = '';
  boards.forEach(board => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'board';

    const cover = document.createElement('img');
    cover.className = 'board-cover';
    cover.alt = '';
    if (board.cover_image) cover.src = board.cover_image;

    const meta = document.createElement('div');
    meta.className = 'board-meta';

    const name = document.createElement('div');
    name.className = 'board-name';
    name.textContent = board.name;

    const count = document.createElement('div');
    count.className = 'board-count';
    count.textContent = `${board.pins_count ?? 0} pin${board.pins_count === 1 ? '' : 's'}`;

    meta.append(name, count);
    row.append(cover, meta);

    if (board.visibility && board.visibility !== 'private') {
      const badge = document.createElement('span');
      badge.className = 'board-badge';
      badge.textContent = board.visibility;
      row.appendChild(badge);
    }

    row.addEventListener('click', () => {
      chrome.tabs.create({ url: `${appOrigin}/inspiration-boards/${board.id}` });
      window.close();
    });

    list.appendChild(row);
  });
}

/* --------------------------------------------------------------- actions -- */

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();

  const button = $('loginBtn');
  const error = $('loginError');
  error.classList.add('hidden');

  const email = $('email').value.trim();
  const password = $('password').value;

  if (!email || !password) {
    error.textContent = 'Enter your email and password.';
    error.classList.remove('hidden');

    return;
  }

  button.disabled = true;
  button.textContent = 'Signing in…';

  const response = await send('signIn', { email, password });

  button.disabled = false;
  button.textContent = 'Sign in';

  if (!response.success) {
    error.textContent = response.error;
    error.classList.remove('hidden');

    return;
  }

  $('password').value = '';
  renderAccount(response.data);
  show('main');
  loadStats();
  loadBoards();
});

$('signOutBtn').addEventListener('click', async () => {
  await send('signOut');
  $('email').value = '';
  $('password').value = '';
  show('login');
  toast('Signed out');
});

$('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());

$('openAppBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: `${appOrigin}/inspiration-boards` });
  window.close();
});

$('forgotLink').addEventListener('click', event => {
  event.preventDefault();
  chrome.tabs.create({ url: `${appOrigin}/forget-password` });
});

$('registerLink').addEventListener('click', event => {
  event.preventDefault();
  chrome.tabs.create({ url: `${appOrigin}/register` });
});

// The popup can't inject into restricted pages (chrome://, the Web Store,
// PDFs), so say why rather than failing silently.
async function withActiveTab(callback) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !/^https?:/.test(tab.url || '')) {
    toast('Kōbō can’t capture from this page.', 'error');

    return;
  }

  callback(tab);
}

$('captureBtn').addEventListener('click', () =>
  withActiveTab(async tab => {
    await send('startAreaCapture', { tabId: tab.id });
    window.close();
  }),
);

$('pinPageBtn').addEventListener('click', () =>
  withActiveTab(async tab => {
    const response = await send('pinVisibleTab', { tabId: tab.id, sourceUrl: tab.url, title: tab.title });

    if (!response.success) {
      toast(response.error, 'error');

      return;
    }

    window.close();
  }),
);

init();
