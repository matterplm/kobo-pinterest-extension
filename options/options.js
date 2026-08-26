import { getSettings, saveSettings, isDevelopmentBuild, ENVIRONMENTS, DEFAULT_ENVIRONMENT } from '../lib/config.js';

const $ = id => document.getElementById(id);

function send(action, data) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action, data }, response =>
      resolve(chrome.runtime.lastError ? { success: false } : response || { success: false }),
    );
  });
}

function flashSaved() {
  const note = $('savedNote');
  note.textContent = 'Saved';
  note.classList.add('show');
  setTimeout(() => note.classList.remove('show'), 1400);
}

async function persist(patch) {
  await saveSettings(patch);
  flashSaved();
}

async function init() {
  const settings = await getSettings();

  $('version').textContent = `v${chrome.runtime.getManifest().version}`;

  /* environment — the switcher exists only in unpacked/dev installs */
  const envSelect = $('environment');
  const isDev = await isDevelopmentBuild();
  const available = isDev
    ? Object.entries(ENVIRONMENTS)
    : Object.entries(ENVIRONMENTS).filter(([key]) => key === DEFAULT_ENVIRONMENT);

  envSelect.innerHTML = available.map(([key, env]) => `<option value="${key}">${env.label}</option>`).join('');
  envSelect.value = isDev ? settings.environment : DEFAULT_ENVIRONMENT;
  envSelect.disabled = !isDev;

  if (!isDev) {
    document.querySelector('label[for="environment"]').closest('.setting').classList.add('hidden');
  }
  $('envWarning').classList.toggle('hidden', settings.environment === DEFAULT_ENVIRONMENT);

  envSelect.addEventListener('change', async () => {
    // Tokens are environment-specific: keeping one across a switch would send a
    // staging JWT to production and produce a confusing 401 on the next action.
    await send('signOut');
    await persist({ environment: envSelect.value, defaultBoardId: null });
    $('envWarning').classList.toggle('hidden', envSelect.value === DEFAULT_ENVIRONMENT);
    loadBoards(null);
  });

  /* toggles */
  const toggles = ['showQuickPinButton', 'quickPinSkipsSheet', 'autoTag'];
  toggles.forEach(key => {
    const input = $(key);
    input.checked = Boolean(settings[key]);
    input.addEventListener('change', () => {
      persist({ [key]: input.checked });
      syncOneClickAvailability();
    });
  });

  /* default board */
  $('defaultBoard').addEventListener('change', () => {
    const value = $('defaultBoard').value;
    persist({ defaultBoardId: value ? Number(value) : null });
    syncOneClickAvailability();
  });

  loadBoards(settings.defaultBoardId);
  loadShortcuts();
}

// One-click save silently does nothing without a default board, so the toggle
// is disabled until one is picked rather than failing at pin time.
function syncOneClickAvailability() {
  const hasDefault = Boolean($('defaultBoard').value);
  const toggle = $('quickPinSkipsSheet');

  toggle.disabled = !hasDefault;

  if (!hasDefault && toggle.checked) {
    toggle.checked = false;
    saveSettings({ quickPinSkipsSheet: false });
  }
}

async function loadBoards(selectedId) {
  const select = $('defaultBoard');
  const session = await send('getSession');

  if (!session.success || !session.data?.token) {
    select.innerHTML = '<option value="">Sign in to choose a board</option>';
    select.disabled = true;
    syncOneClickAvailability();

    return;
  }

  const response = await send('getBoards');

  if (!response.success) {
    select.innerHTML = '<option value="">Could not load boards</option>';
    select.disabled = true;
    syncOneClickAvailability();

    return;
  }

  select.disabled = false;
  select.innerHTML =
    '<option value="">Most recent board</option>' +
    (response.data || [])
      .map(board => `<option value="${board.id}">${board.name}</option>`)
      .join('');

  if (selectedId) select.value = String(selectedId);
  syncOneClickAvailability();
}

async function loadShortcuts() {
  const list = $('shortcutList');
  const commands = await chrome.commands.getAll();

  list.innerHTML = '';
  commands.forEach(command => {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = command.description || command.name;

    const value = document.createElement('dd');
    value.textContent = command.shortcut || 'Not set';
    if (!command.shortcut) value.className = 'unset';

    row.append(term, value);
    list.appendChild(row);
  });
}

$('shortcutsLink').addEventListener('click', event => {
  event.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

init();
