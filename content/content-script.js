// Kobo Inspiration — in-page UI.
//
// Everything renders inside one shadow root so the host page's CSS can never
// reach it (and ours can never leak out). The previous version wrapped every
// <img> in a positioned div, which mutated page layout on sites using grid or
// object-fit; the quick-pin button is now a free-floating overlay instead.

(() => {
  if (window.__koboInspirationLoaded) return;
  window.__koboInspirationLoaded = true;

  const MIN_IMAGE_SIZE = 140;

  let shadow = null;
  let layers = {};
  let settings = { showQuickPinButton: true, autoTag: true, quickPinSkipsSheet: false, defaultBoardId: null };
  // Resolved from lib/config.js via the worker on init. Deliberately null until
  // then: a hardcoded fallback here is how the old build ended up pointing at
  // localhost in production.
  let appOrigin = null;
  let hoveredImage = null;
  let hideTimer = null;

  /* ----------------------------------------------------------- bootstrap -- */

  function send(action, data) {
    return new Promise(resolve => {
      if (!chrome.runtime?.id) {
        resolve({ success: false, error: 'Extension was updated — please refresh the page.' });

        return;
      }

      chrome.runtime.sendMessage({ action, data }, response => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: 'Extension was updated — please refresh the page.' });

          return;
        }
        resolve(response || { success: false, error: 'No response from the extension.' });
      });
    });
  }

  function ensureRoot() {
    if (shadow) return;

    const host = document.createElement('div');
    host.id = 'kobo-inspiration-root';
    // Never `all: initial` here. An inline style beats the :host rule, so it
    // resets font-family to the initial value — a serif — and the entire shadow
    // tree inherits Times no matter what :host declares. That bug shipped once
    // already. The :host block resets inherited properties explicitly instead;
    // this only neutralises the host's own box.
    host.style.cssText = 'position:static;display:block;width:0;height:0;margin:0;padding:0;border:0;';
    (document.body || document.documentElement).appendChild(host);

    shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = window.__koboStyles;
    shadow.appendChild(style);

    layers.quickPin = buildQuickPin();
    layers.sheetHost = document.createElement('div');
    layers.captureHost = document.createElement('div');
    layers.toasts = document.createElement('div');
    layers.toasts.className = 'toasts';
    layers.toasts.setAttribute('role', 'status');
    layers.toasts.setAttribute('aria-live', 'polite');

    shadow.append(layers.quickPin, layers.sheetHost, layers.captureHost, layers.toasts);
  }

  const ICONS = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V16a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.3A7 7 0 0 0 12 2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    caret: '<svg class="picker-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>',
    check: '<svg class="picker-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  };

  function buildQuickPin() {
    const button = document.createElement('button');
    button.className = 'quick-pin';
    button.type = 'button';
    button.innerHTML = `${ICONS.pin}<span>Save to Kōbō</span>`;

    button.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    button.addEventListener('mouseleave', scheduleHide);
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (!hoveredImage) return;

      const image = hoveredImage;
      hideQuickPin();
      handleQuickPin(image);
    });

    return button;
  }

  /* ----------------------------------------------------- quick pin hover -- */

  function isPinnable(node) {
    if (!(node instanceof HTMLImageElement)) return false;
    if (!node.currentSrc && !node.src) return false;

    const rect = node.getBoundingClientRect();

    return rect.width >= MIN_IMAGE_SIZE && rect.height >= MIN_IMAGE_SIZE;
  }

  function positionQuickPin(image) {
    const rect = image.getBoundingClientRect();
    layers.quickPin.style.top = `${Math.max(8, rect.top + 10)}px`;
    layers.quickPin.style.left = `${Math.max(8, rect.right - 118)}px`;
  }

  function showQuickPin(image) {
    if (!settings.showQuickPinButton) return;

    clearTimeout(hideTimer);
    hoveredImage = image;
    positionQuickPin(image);
    layers.quickPin.classList.add('visible');
  }

  function hideQuickPin() {
    layers.quickPin.classList.remove('visible');
    hoveredImage = null;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideQuickPin, 260);
  }

  document.addEventListener(
    'mouseover',
    event => {
      if (!shadow || isSheetOpen()) return;

      const image = event.target;
      if (isPinnable(image)) {
        showQuickPin(image);
      } else if (hoveredImage && !layers.quickPin.contains(event.target)) {
        scheduleHide();
      }
    },
    true,
  );

  window.addEventListener(
    'scroll',
    () => {
      if (hoveredImage) positionQuickPin(hoveredImage);
    },
    true,
  );

  /* ------------------------------------------------------------- actions -- */

  async function handleQuickPin(image) {
    const context = {
      imageUrl: image.currentSrc || image.src,
      sourceUrl: location.href,
      title: image.alt?.trim() || document.title,
      description: image.title?.trim() || '',
    };

    if (settings.quickPinSkipsSheet && settings.defaultBoardId) {
      toast('Saving…');
      const result = await send('savePin', {
        ...context,
        boardId: settings.defaultBoardId,
        tags: settings.autoTag ? autoTags() : [],
      });

      if (result.success) {
        reportSaved(result.data);
      } else {
        toast(result.error, 'error');
      }

      return;
    }

    openSheet(context);
  }

  // Auto-tags come from the page's own keywords/og:type metadata — deliberately
  // conservative, since a wrong tag is worse than no tag.
  function autoTags() {
    const meta = name =>
      document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || '';

    const raw = `${meta('keywords')},${meta('article:tag')}`;

    return [...new Set(
      raw
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 2 && tag.length < 30),
    )].slice(0, 5);
  }

  function cleanTitle(raw) {
    const title = (raw || '').trim();
    const match = title.match(/^(.{12,})\s+[|\u2013\u2014\u00b7-]\s+[^|\u2013\u2014\u00b7-]{2,40}$/);

    return (match ? match[1] : title).trim();
  }

  function reportSaved(data) {
    const link = appOrigin
      ? ` <a data-href="${escapeHtml(`${appOrigin}/inspiration-boards/${data.pin.board_id}`)}">View board</a>`
      : '';

    toast(`Pinned to your board.${link}`, 'success');
    (data.warnings || []).forEach(warning => toast(warning, 'error'));
  }

  /* --------------------------------------------------------------- toast -- */

  function toast(message, type = 'info') {
    ensureRoot();

    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.innerHTML = message;
    node.querySelector('a[data-href]')?.addEventListener('click', event => {
      window.open(event.target.dataset.href, '_blank', 'noopener');
    });

    layers.toasts.appendChild(node);
    requestAnimationFrame(() => node.classList.add('visible'));

    setTimeout(() => {
      node.classList.remove('visible');
      setTimeout(() => node.remove(), 200);
    }, type === 'error' ? 6000 : 4000);
  }

  /* --------------------------------------------------------------- sheet -- */

  function isSheetOpen() {
    return Boolean(layers.sheetHost?.firstChild);
  }

  function closeSheet() {
    const scrim = layers.sheetHost.firstChild;
    if (!scrim) return;

    scrim.classList.remove('visible');
    setTimeout(() => (layers.sheetHost.innerHTML = ''), 180);
    document.removeEventListener('keydown', onSheetKeydown, true);
  }

  function onSheetKeydown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeSheet();
    }
  }

  async function openSheet(context) {
    ensureRoot();
    if (isSheetOpen()) closeSheet();

    const session = await send('getSession');
    if (!session.success || !session.data?.token) {
      toast('Sign in to Kōbō from the extension icon first.', 'error');

      return;
    }

    renderSheet(context, session.data);
    document.addEventListener('keydown', onSheetKeydown, true);
  }

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;

    return node;
  }

  // Searchable board picker with inline creation. Replaces a native <select>
  // plus a window.prompt() — the prompt was an OS dialog dropped into the middle
  // of a designed sheet, and the select couldn't show the cover thumbnail and
  // pin count that the app's own board picker does.
  function buildBoardPicker({ onChange, onCreate }) {
    let boards = [];
    let selectedId = null;
    let activeIndex = -1;
    let filtered = [];

    const root = el('div', 'picker');

    const trigger = el(
      'button',
      'picker-trigger',
      `<span class="picker-thumb">${ICONS.bulb}</span>
       <span class="picker-labels">
         <span class="picker-name placeholder">Loading boards…</span>
         <span class="picker-count"></span>
       </span>
       ${ICONS.caret}`,
    );
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const panel = el('div', 'picker-panel');
    const search = el('input', 'picker-search');
    search.type = 'text';
    search.placeholder = 'Search boards…';
    search.setAttribute('aria-label', 'Search boards');

    const list = el('div', 'picker-list');
    list.setAttribute('role', 'listbox');

    const create = el('button', 'picker-create', `${ICONS.plus}<span>Create a new board</span>`);
    create.type = 'button';

    panel.append(search, list, create);
    root.append(trigger, panel);

    function selected() {
      return boards.find(board => board.id === selectedId) || null;
    }

    function renderTrigger() {
      const board = selected();
      const name = trigger.querySelector('.picker-name');
      const count = trigger.querySelector('.picker-count');
      const thumb = trigger.querySelector('.picker-thumb');

      if (!board) {
        name.textContent = boards.length ? 'Choose a board' : 'No boards yet — click to create one';
        name.classList.add('placeholder');
        count.textContent = '';

        return;
      }

      name.textContent = board.name;
      name.classList.remove('placeholder');
      count.textContent = `${board.pins_count ?? 0} pin${board.pins_count === 1 ? '' : 's'}`;

      if (board.cover_image) {
        const image = document.createElement('img');
        image.className = 'picker-thumb';
        image.src = board.cover_image;
        image.alt = '';
        thumb.replaceWith(image);
      }
    }

    function renderList() {
      const query = search.value.trim().toLowerCase();
      filtered = query ? boards.filter(board => board.name.toLowerCase().includes(query)) : boards;
      activeIndex = -1;
      list.innerHTML = '';

      if (!filtered.length) {
        list.appendChild(el('div', 'empty', boards.length ? 'No board matches that.' : 'You have no boards yet.'));
      }

      filtered.forEach(board => {
        const option = el(
          'button',
          'picker-option',
          `${
            board.cover_image
              ? `<img class="picker-thumb" src="${escapeHtml(board.cover_image)}" alt="">`
              : `<span class="picker-thumb">${ICONS.bulb}</span>`
          }
           <span class="picker-labels">
             <span class="picker-name">${escapeHtml(board.name)}</span>
             <span class="picker-count">${board.pins_count ?? 0} pin${board.pins_count === 1 ? '' : 's'}</span>
           </span>
           ${ICONS.check}`,
        );
        option.type = 'button';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(board.id === selectedId));
        option.addEventListener('click', () => pick(board.id));
        list.appendChild(option);
      });

      const query_ = search.value.trim();
      create.querySelector('span').textContent = query_ ? `Create “${query_}”` : 'Create a new board';
    }

    function setActive(index) {
      const options = [...list.querySelectorAll('.picker-option'), create];
      activeIndex = (index + options.length) % options.length;
      options.forEach((option, position) => option.classList.toggle('active', position === activeIndex));
      options[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }

    function open() {
      root.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      search.value = '';
      renderList();
      setTimeout(() => search.focus(), 60);
    }

    function close() {
      root.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function pick(id) {
      selectedId = id;
      renderTrigger();
      close();
      trigger.focus();
      onChange?.(id);
    }

    trigger.addEventListener('click', () => (root.classList.contains('open') ? close() : open()));

    search.addEventListener('input', renderList);

    search.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive(activeIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(activeIndex - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const options = [...list.querySelectorAll('.picker-option'), create];
        (activeIndex >= 0 ? options[activeIndex] : filtered.length ? options[0] : create).click();
      } else if (event.key === 'Escape') {
        // Swallow it — Escape closes the dropdown, not the whole sheet.
        event.preventDefault();
        event.stopPropagation();
        close();
        trigger.focus();
      }
    });

    create.addEventListener('click', async () => {
      const name = search.value.trim();

      if (!name) {
        search.placeholder = 'Type a name for the new board first';
        search.focus();

        return;
      }

      create.querySelector('span').textContent = 'Creating…';
      const board = await onCreate(name);
      create.querySelector('span').textContent = 'Create a new board';

      if (!board) return;

      boards = [board, ...boards];
      pick(board.id);
    });

    return {
      element: root,
      trigger,
      close,
      setBoards(next, preferredId) {
        boards = next;
        if (!next.length) create.classList.add('active');
        selectedId = next.some(board => board.id === preferredId) ? preferredId : next[0]?.id ?? null;
        renderTrigger();
        renderList();
        if (selectedId) onChange?.(selectedId);
      },
      get value() {
        return selectedId;
      },
      markInvalid(invalid) {
        trigger.classList.toggle('invalid', invalid);
      },
    };
  }

  function renderSheet(context, session) {
    const state = {
      boards: [],
      collections: [],
      tags: settings.autoTag ? autoTags() : [],
      links: [],
      linkType: 'style',
      extractColours: false,
      saving: false,
    };

    const scrim = el('div', 'scrim');
    const sheet = el('div', 'sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Save to inspiration board');
    scrim.appendChild(sheet);

    // Without this, Tab walks straight out of the sheet and into the host page
    // sitting behind the scrim.
    sheet.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;

      const focusable = [...sheet.querySelectorAll('button, input, textarea, select, [tabindex]:not([tabindex="-1"])')]
        .filter(node => node.offsetParent !== null && !node.disabled);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = shadow.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    });

    scrim.addEventListener('mousedown', event => {
      if (event.target === scrim && !state.saving) closeSheet();
    });

    sheet.addEventListener('mousedown', event => {
      if (!boardPicker.element.contains(event.target)) boardPicker.close();
    });

    /* header */
    const header = el('div', 'sheet-header');
    header.append(
      el(
        'div',
        'header-left',
        `<div class="header-icon">${ICONS.bulb}</div>
         <div>
           <div class="header-title">Save to inspiration board</div>
           <div class="header-sub">${escapeHtml(session.name || session.email || '')}</div>
         </div>`,
      ),
    );

    const closeBtn = el('button', 'icon-btn', ICONS.close);
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', () => closeSheet());
    header.appendChild(closeBtn);

    /* body */
    const body = el('div', 'sheet-body');

    const previewSrc = context.captureDataUrl || context.imageUrl || '';
    const sourceHost = safeHost(context.sourceUrl);
    body.appendChild(
      el(
        'div',
        'preview',
        `<img src="${escapeHtml(previewSrc)}" alt="">
         <div class="preview-meta">
           <div class="preview-source">${escapeHtml(sourceHost || 'Captured image')}</div>
           <span class="preview-url">${escapeHtml(context.sourceUrl || '')}</span>
         </div>`,
      ),
    );

    /* board + collection */
    const boardField = el('div', 'field');
    boardField.append(el('label', 'field-label', 'Board<span class="req">*</span>'));

    const boardPicker = buildBoardPicker({
      onChange: boardId => loadCollections(boardId),
      onCreate: async name => {
        const response = await send('createBoard', { name, brandId: session.selectedBrandId });

        if (!response.success) {
          toast(response.error, 'error');

          return null;
        }

        toast(`Board “${response.data.name}” created.`, 'success');

        return response.data;
      },
    });

    const boardError = el('div', 'field-error hidden');
    boardField.append(boardPicker.element, boardError);

    const collectionField = el('div', 'field');
    collectionField.append(el('label', 'field-label', 'Collection'));
    const collectionSelect = el('select', 'custom-select');
    collectionSelect.innerHTML = '<option value="">No collection</option>';
    collectionField.appendChild(collectionSelect);

    const boardRow = el('div', 'row');
    boardRow.append(boardField, collectionField);
    body.appendChild(boardRow);

    /* title */
    const titleField = el('div', 'field');
    titleField.append(el('label', 'field-label', 'Title<span class="req">*</span>'));
    const titleInput = el('input', 'custom-input');
    titleInput.type = 'text';
    titleInput.placeholder = 'Give this pin a name';
    titleInput.maxLength = 255;
    titleInput.value = cleanTitle(context.title || document.title).slice(0, 255);
    const titleError = el('div', 'field-error hidden');
    titleField.append(titleInput, titleError);
    body.appendChild(titleField);

    /* description */
    const descField = el('div', 'field');
    descField.append(el('label', 'field-label', 'Notes'));
    const descInput = el('textarea', 'custom-input');
    descInput.placeholder = 'What caught your eye?';
    descInput.value = context.description || '';
    descField.appendChild(descInput);
    body.appendChild(descField);

    /* tags */
    const tagField = el('div', 'field');
    tagField.append(el('label', 'field-label', 'Tags'));
    const tagBox = el('div', 'tag-box');
    const tagInput = el('input', 'tag-input');
    tagInput.type = 'text';
    tagInput.placeholder = 'Add a tag, press Enter';
    tagBox.appendChild(tagInput);
    tagBox.addEventListener('click', () => tagInput.focus());
    tagField.append(tagBox, el('div', 'field-hint', 'Enter or comma to add. Backspace on an empty box removes the last one.'));
    body.appendChild(tagField);

    function renderTags() {
      tagBox.querySelectorAll('.chip').forEach(chip => chip.remove());
      state.tags.forEach(tag => {
        const chip = el('span', 'chip', `${escapeHtml(tag)}<button type="button" aria-label="Remove ${escapeHtml(tag)}">×</button>`);
        chip.querySelector('button').addEventListener('click', () => {
          state.tags = state.tags.filter(item => item !== tag);
          renderTags();
        });
        tagBox.insertBefore(chip, tagInput);
      });
    }

    function commitTag() {
      const value = tagInput.value.trim().toLowerCase().replace(/,$/, '');
      if (value && !state.tags.includes(value)) {
        state.tags.push(value);
        renderTags();
      }
      tagInput.value = '';
    }

    tagInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        commitTag();
      }
      if (event.key === 'Backspace' && !tagInput.value && state.tags.length) {
        state.tags.pop();
        renderTags();
      }
    });
    tagInput.addEventListener('blur', commitTag);
    renderTags();

    /* linking — the server accepts style|component only (linkPin validation) */
    const linkField = el('div', 'field');
    const linkLabelRow = el('div', 'label-row');
    linkLabelRow.append(el('label', 'field-label', 'Link to'));
    const linkToggle = el('div', 'link-type');
    ['style', 'component'].forEach(type => {
      const button = el('button', type === state.linkType ? 'active' : '', `${type[0].toUpperCase()}${type.slice(1)}s`);
      button.type = 'button';
      button.dataset.type = type;
      button.addEventListener('click', () => {
        state.linkType = type;
        linkToggle.querySelectorAll('button').forEach(other => other.classList.toggle('active', other.dataset.type === type));
        linkSearch.value = '';
        results.classList.add('hidden');
      });
      linkToggle.appendChild(button);
    });
    linkLabelRow.appendChild(linkToggle);

    const linkSearch = el('input', 'custom-input');
    linkSearch.type = 'text';
    linkSearch.placeholder = 'Search by name or code…';
    const results = el('div', 'results hidden');
    const linkChips = el('div', 'tag-box hidden');

    linkField.append(linkLabelRow, linkSearch, results, linkChips);
    body.appendChild(linkField);

    function renderLinks() {
      linkChips.innerHTML = '';
      linkChips.classList.toggle('hidden', state.links.length === 0);
      state.links.forEach(link => {
        const chip = el('span', 'chip', `${escapeHtml(link.label)}<button type="button" aria-label="Remove link">×</button>`);
        chip.querySelector('button').addEventListener('click', () => {
          state.links = state.links.filter(item => item !== link);
          renderLinks();
        });
        linkChips.appendChild(chip);
      });
    }

    let searchTimer = null;
    linkSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      const query = linkSearch.value.trim();

      if (query.length < 2) {
        results.classList.add('hidden');

        return;
      }

      searchTimer = setTimeout(async () => {
        const response = await send('searchLinkables', { type: state.linkType, query });
        results.classList.remove('hidden');

        if (!response.success) {
          results.innerHTML = `<div class="empty">${escapeHtml(response.error)}</div>`;

          return;
        }

        const items = (response.data || []).slice(0, 20);
        if (!items.length) {
          results.innerHTML = `<div class="empty">No ${state.linkType}s match “${escapeHtml(query)}”.</div>`;

          return;
        }

        results.innerHTML = '';
        // The worker normalises both endpoints to { id, label, code }.
        items.forEach(item => {
          const button = el(
            'button',
            'result',
            `${escapeHtml(item.label)}${item.code ? ` <span class="muted">${escapeHtml(item.code)}</span>` : ''}`,
          );
          button.type = 'button';
          button.addEventListener('click', () => {
            if (!state.links.some(link => link.linkableType === state.linkType && link.linkableId === item.id)) {
              state.links.push({ linkableType: state.linkType, linkableId: item.id, label: item.code || item.label });
              renderLinks();
            }
            linkSearch.value = '';
            results.classList.add('hidden');
          });
          results.appendChild(button);
        });
      }, 280);
    });

    /* colour extraction */
    const colourRow = el(
      'div',
      'switch-row',
      `<div class="switch-copy">Extract colour palette<span>Pull the dominant colours off this image into the pin.</span></div>`,
    );
    const colourSwitch = el('label', 'switch', '<input type="checkbox"><span class="track"></span><span class="thumb"></span>');
    colourSwitch.querySelector('input').addEventListener('change', event => {
      state.extractColours = event.target.checked;
    });
    colourRow.appendChild(colourSwitch);
    body.appendChild(colourRow);

    /* footer */
    const footer = el('div', 'sheet-footer');
    const footerError = el('div', 'footer-error hidden');
    const cancelBtn = el('button', 'btn btn-text', 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', () => closeSheet());
    const saveBtn = el('button', 'btn btn-primary', 'Save pin');
    saveBtn.type = 'button';
    footer.append(footerError, cancelBtn, saveBtn);

    sheet.append(header, body, footer);
    layers.sheetHost.appendChild(scrim);
    requestAnimationFrame(() => scrim.classList.add('visible'));

    /* board loading */
    (async () => {
      const response = await send('getBoards');

      if (!response.success) {
        showError(boardError, response.error);

        return;
      }

      state.boards = response.data || [];
      boardPicker.setBoards(state.boards, settings.defaultBoardId);
    })();

    async function loadCollections(boardId) {
      collectionSelect.innerHTML = '<option value="">No collection</option>';
      if (!boardId) return;

      const response = await send('getCollections', { boardId });
      if (!response.success) return;

      (response.data || []).forEach(collection => {
        const option = document.createElement('option');
        option.value = collection.id;
        option.textContent = collection.name;
        collectionSelect.appendChild(option);
      });
    }

    /* save */
    saveBtn.addEventListener('click', async () => {
      hide(footerError);
      hide(titleError);
      hide(boardError);

      const title = titleInput.value.trim();
      const boardId = boardPicker.value;
      let invalid = false;

      boardPicker.markInvalid(!boardId);

      if (!boardId) {
        showError(boardError, 'Pick a board.');
        invalid = true;
      }

      if (!title) {
        showError(titleError, 'A title is required.');
        titleInput.classList.add('invalid');
        invalid = true;
      } else {
        titleInput.classList.remove('invalid');
      }

      if (invalid) return;

      commitTag();
      state.saving = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      const response = await send('savePin', {
        boardId,
        collectionId: collectionSelect.value ? Number(collectionSelect.value) : null,
        title,
        description: descInput.value.trim(),
        imageUrl: context.imageUrl,
        captureDataUrl: context.captureDataUrl,
        sourceUrl: context.sourceUrl,
        tags: state.tags,
        links: state.links.map(({ linkableType, linkableId }) => ({ linkableType, linkableId })),
        extractColours: state.extractColours,
      });

      state.saving = false;

      if (!response.success) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save pin';
        showError(footerError, response.error);

        return;
      }

      saveBtn.textContent = 'Saved';
      reportSaved(response.data);
      setTimeout(closeSheet, 400);
    });

    sheet.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        saveBtn.click();
      }
    });

    footer.querySelector('.btn-primary').title = 'Save pin (⌘/Ctrl + Enter)';

    setTimeout(() => titleInput.focus(), 240);
  }

  function showError(node, message) {
    node.textContent = message;
    node.classList.remove('hidden');
  }

  function hide(node) {
    node.classList.add('hidden');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
    );
  }

  function safeHost(url) {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  }

  /* -------------------------------------------------------- area capture -- */

  function startAreaCapture() {
    ensureRoot();
    if (layers.captureHost.firstChild) return;

    const overlay = el('div', 'capture-overlay');
    const rect = el('div', 'capture-rect hidden');
    const hint = el('div', 'capture-hint', 'Drag to select an area · Esc to cancel');
    layers.captureHost.append(overlay, rect, hint);

    let start = null;

    const cleanup = () => {
      layers.captureHost.innerHTML = '';
      document.removeEventListener('keydown', onKey, true);
    };

    const onKey = event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        cleanup();
      }
    };

    document.addEventListener('keydown', onKey, true);

    overlay.addEventListener('mousedown', event => {
      start = { x: event.clientX, y: event.clientY };
      rect.classList.remove('hidden');
    });

    overlay.addEventListener('mousemove', event => {
      if (!start) return;

      const box = boxFrom(start, { x: event.clientX, y: event.clientY });
      Object.assign(rect.style, {
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      });
    });

    overlay.addEventListener('mouseup', async event => {
      if (!start) return;

      const box = boxFrom(start, { x: event.clientX, y: event.clientY });
      cleanup();

      if (box.width < 12 || box.height < 12) {
        toast('That selection was too small.', 'error');

        return;
      }

      // The worker screenshots the whole visible tab; cropping happens here
      // because only the page knows its own devicePixelRatio.
      const shot = await send('captureVisibleTab');
      if (!shot.success) {
        toast(shot.error, 'error');

        return;
      }

      const cropped = await crop(shot.data, box);
      openSheet({ captureDataUrl: cropped, sourceUrl: location.href, title: document.title });
    });
  }

  function boxFrom(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(a.x - b.x),
      height: Math.abs(a.y - b.y),
    };
  }

  async function crop(dataUrl, box) {
    const ratio = window.devicePixelRatio || 1;
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const canvas = new OffscreenCanvas(box.width * ratio, box.height * ratio);
    const context = canvas.getContext('2d');

    context.drawImage(
      bitmap,
      box.x * ratio,
      box.y * ratio,
      box.width * ratio,
      box.height * ratio,
      0,
      0,
      box.width * ratio,
      box.height * ratio,
    );

    const blob = await canvas.convertToBlob({ type: 'image/png' });

    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  /* ------------------------------------------------------------ messages -- */

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openSaveSheet') {
      ensureRoot();

      // "Pin selection" has no image of its own — screenshot the page instead.
      if (message.data?.needsPageImage) {
        send('captureVisibleTab').then(shot => {
          openSheet({ ...message.data, captureDataUrl: shot.success ? shot.data : undefined });
        });
      } else {
        openSheet(message.data || {});
      }
    }

    if (message.action === 'startAreaCapture') {
      startAreaCapture();
    }

    sendResponse({ received: true });

    return false;
  });

  chrome.storage.onChanged.addListener(changes => {
    if (changes.settings) {
      settings = { ...settings, ...changes.settings.newValue };
    }
  });

  /* ---------------------------------------------------------------- init -- */

  (async () => {
    const [loadedSettings, environment] = await Promise.all([send('getSettings'), send('getEnvironment')]);
    if (loadedSettings.success) settings = { ...settings, ...loadedSettings.data };
    if (environment.success) appOrigin = environment.data.app;

    ensureRoot();
  })();
})();
