// Styles for the shadow root. Kept as a JS string because the sheet lives in a
// closed-ish shadow tree — a manifest `css` entry would never reach it, and
// inlining is what keeps host-page CSS from leaking in.
// Palette is copied from lib/tokens.css (itself mirrored from the app's
// _design-tokens.scss). Never invent a colour here.
window.__koboStyles = `
:host {
  --kobo-primary: #a1a09c;
  --kobo-accent-sage: #7c8471;
  --kobo-accent-gold: #d4a574;
  --kobo-success: #8fa68e;
  --kobo-error: #b88b8b;
  --kobo-error-bg: rgba(184, 139, 139, 0.12);
  --kobo-text-primary: #2d2926;
  --kobo-text-secondary: #6b6660;
  --kobo-text-muted: #a39b93;
  --kobo-bg-primary: #ffffff;
  --kobo-bg-secondary: #fbfbf9;
  --kobo-bg-panel: #f5f5f5;
  --kobo-bg-warm: #eae8e5;
  --kobo-border-light: #e0e0e0;
  --kobo-radius-md: 6px;
  --kobo-radius-lg: 8px;
  --kobo-radius-full: 9999px;
  --kobo-shadow-md: 0 2px 4px rgba(45, 41, 38, 0.04), 0 6px 12px -3px rgba(45, 41, 38, 0.06);
  --kobo-shadow-lg: 0 2px 4px rgba(45, 41, 38, 0.04), 0 10px 20px -6px rgba(45, 41, 38, 0.08), 0 20px 36px -12px rgba(45, 41, 38, 0.07);
  --kobo-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --kobo-ease-spring: cubic-bezier(0.2, 0.8, 0.24, 1);

  all: initial;
  font-family: 'Manrope', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* { box-sizing: border-box; }

button, input, textarea, select {
  font: inherit;
  color: inherit;
  margin: 0;
}

/* ---------------------------------------------------------- quick pin ---- */

.quick-pin {
  position: fixed;
  z-index: 2147483000;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: none;
  border-radius: var(--kobo-radius-full);
  background: var(--kobo-text-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: var(--kobo-shadow-md);
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
  pointer-events: none;
  transition: opacity 150ms var(--kobo-ease), transform 220ms var(--kobo-ease-spring);
}

.quick-pin.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.quick-pin:hover { background: #1f1c1a; }
.quick-pin:focus-visible { outline: 2px solid var(--kobo-accent-gold); outline-offset: 2px; }
.quick-pin svg { width: 13px; height: 13px; }

/* -------------------------------------------------------------- sheet ---- */

.scrim {
  position: fixed;
  inset: 0;
  z-index: 2147483100;
  background: rgba(46, 38, 61, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  opacity: 0;
  transition: opacity 150ms var(--kobo-ease);
}

.scrim.visible { opacity: 1; }

.sheet {
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  background: var(--kobo-bg-primary);
  border-radius: var(--kobo-radius-lg);
  box-shadow: var(--kobo-shadow-lg);
  overflow: hidden;
  transform: translateY(8px) scale(0.98);
  transition: transform 220ms var(--kobo-ease-spring);
}

.scrim.visible .sheet { transform: translateY(0) scale(1); }

/* dialog-header convention: icon tile + title left, close button right */
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--kobo-border-light);
  background: var(--kobo-bg-secondary);
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }

.header-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--kobo-radius-md);
  background: var(--kobo-bg-warm);
  color: var(--kobo-text-primary);
}

.header-icon svg { width: 17px; height: 17px; }

.header-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--kobo-text-primary);
  letter-spacing: -0.01em;
}

.header-sub {
  font-size: 11px;
  color: var(--kobo-text-muted);
  margin-top: 1px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  border-radius: var(--kobo-radius-md);
  color: var(--kobo-text-secondary);
  cursor: pointer;
  transition: background 150ms var(--kobo-ease);
}

.icon-btn:hover { background: var(--kobo-bg-warm); }
.icon-btn svg { width: 16px; height: 16px; }

.sheet-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* --------------------------------------------------------- form parts ---- */

.preview {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid var(--kobo-border-light);
  border-radius: var(--kobo-radius-md);
  background: var(--kobo-bg-secondary);
}

.preview img {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: var(--kobo-radius-md);
  border: 1px solid var(--kobo-border-light);
  background: var(--kobo-bg-panel);
}

.preview-meta { min-width: 0; font-size: 11px; color: var(--kobo-text-muted); line-height: 1.5; }
.preview-source { color: var(--kobo-text-secondary); font-weight: 600; }
.preview-url { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--kobo-text-secondary);
}

.field-label .req { color: var(--kobo-error); margin-left: 2px; }

/* custom-input / custom-select house convention */
.custom-input,
.custom-select {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--kobo-border-light);
  border-radius: var(--kobo-radius-md);
  background: var(--kobo-bg-primary);
  color: var(--kobo-text-primary);
  font-size: 13px;
  transition: border-color 150ms var(--kobo-ease), box-shadow 150ms var(--kobo-ease);
}

.custom-input::placeholder { color: var(--kobo-text-muted); }

.custom-input:focus,
.custom-select:focus {
  outline: none;
  border-color: var(--kobo-text-secondary);
  box-shadow: 0 0 0 3px rgba(45, 41, 38, 0.06);
}

.custom-input.invalid { border-color: var(--kobo-error); }

textarea.custom-input { resize: vertical; min-height: 58px; line-height: 1.5; }

.field-error { font-size: 11px; color: var(--kobo-error); }

.field-hint { font-size: 11px; color: var(--kobo-text-muted); }

.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }

/* ---------------------------------------------------------------- tags --- */

.tag-box {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 7px 9px;
  border: 1px solid var(--kobo-border-light);
  border-radius: var(--kobo-radius-md);
  background: var(--kobo-bg-primary);
  cursor: text;
}

.tag-box:focus-within { border-color: var(--kobo-text-secondary); box-shadow: 0 0 0 3px rgba(45, 41, 38, 0.06); }

/* Chips: dark text + dark border, per house convention */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border: 1px solid var(--kobo-text-secondary);
  border-radius: var(--kobo-radius-full);
  background: var(--kobo-bg-warm);
  color: var(--kobo-text-primary);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
}

.chip button {
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  color: var(--kobo-text-secondary);
  font-size: 13px;
  line-height: 1;
}

.chip button:hover { color: var(--kobo-text-primary); }

.tag-input {
  flex: 1;
  min-width: 90px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  padding: 3px 0;
}

/* ------------------------------------------------------------- linking --- */

.link-type { display: inline-flex; padding: 2px; background: var(--kobo-bg-panel); border-radius: var(--kobo-radius-md); }

/* ButtonTabGroup equivalent — never a segmented toggle control */
.link-type button {
  border: none;
  background: transparent;
  padding: 5px 12px;
  border-radius: var(--kobo-radius-sm, 4px);
  font-size: 11px;
  font-weight: 700;
  color: var(--kobo-text-secondary);
  cursor: pointer;
  transition: background 150ms var(--kobo-ease), color 150ms var(--kobo-ease);
}

.link-type button.active { background: var(--kobo-bg-primary); color: var(--kobo-text-primary); box-shadow: var(--kobo-shadow-md); }

.results {
  border: 1px solid var(--kobo-border-light);
  border-radius: var(--kobo-radius-md);
  max-height: 132px;
  overflow-y: auto;
  background: var(--kobo-bg-primary);
}

.result {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  padding: 8px 11px;
  font-size: 12px;
  color: var(--kobo-text-primary);
  cursor: pointer;
  border-bottom: 1px solid var(--kobo-border-light);
}

.result:last-child { border-bottom: none; }
.result:hover { background: var(--kobo-bg-warm); }
.result .muted { color: var(--kobo-text-muted); font-size: 11px; }

.empty { padding: 10px 11px; font-size: 11px; color: var(--kobo-text-muted); }

/* --------------------------------------------------------------- switch -- */

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--kobo-border-light);
  border-radius: var(--kobo-radius-md);
  background: var(--kobo-bg-secondary);
}

.switch-copy { font-size: 12px; color: var(--kobo-text-primary); font-weight: 600; }
.switch-copy span { display: block; font-size: 11px; font-weight: 400; color: var(--kobo-text-muted); margin-top: 2px; }

.switch { position: relative; width: 38px; height: 22px; flex-shrink: 0; }
.switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }

.switch .track {
  position: absolute;
  inset: 0;
  border-radius: var(--kobo-radius-full);
  background: var(--kobo-border-medium, #bdbdbd);
  transition: background 150ms var(--kobo-ease);
  pointer-events: none;
}

.switch .thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--kobo-shadow-md);
  transition: transform 220ms var(--kobo-ease-spring);
  pointer-events: none;
}

.switch input:checked ~ .track { background: var(--kobo-accent-sage); }
.switch input:checked ~ .thumb { transform: translateX(16px); }

/* -------------------------------------------------------------- footer --- */

.sheet-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 13px 20px;
  border-top: 1px solid var(--kobo-border-light);
  background: var(--kobo-bg-secondary);
  flex-shrink: 0;
}

.btn {
  padding: 9px 18px;
  border-radius: var(--kobo-radius-md);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 150ms var(--kobo-ease), border-color 150ms var(--kobo-ease), opacity 150ms var(--kobo-ease);
}

.btn-text { background: transparent; border-color: transparent; color: var(--kobo-text-secondary); }
.btn-text:hover { background: var(--kobo-bg-warm); }

.btn-primary { background: var(--kobo-text-primary); color: #fff; }
.btn-primary:hover { background: #1f1c1a; }
.btn-primary:disabled { opacity: 0.5; cursor: default; background: var(--kobo-text-primary); }

.footer-error {
  margin-right: auto;
  font-size: 11px;
  font-weight: 600;
  color: var(--kobo-error);
  padding: 5px 9px;
  background: var(--kobo-error-bg);
  border-radius: var(--kobo-radius-md);
}

/* --------------------------------------------------------------- toast --- */

.toasts {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.toast {
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: 340px;
  padding: 11px 15px;
  border-radius: var(--kobo-radius-md);
  background: var(--kobo-bg-primary);
  border: 1px solid var(--kobo-border-light);
  border-left: 3px solid var(--kobo-text-secondary);
  box-shadow: var(--kobo-shadow-lg);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--kobo-text-primary);
  opacity: 0;
  transform: translateX(12px);
  transition: opacity 150ms var(--kobo-ease), transform 220ms var(--kobo-ease-spring);
}

.toast.visible { opacity: 1; transform: translateX(0); }
.toast.success { border-left-color: var(--kobo-accent-sage); }
.toast.error { border-left-color: var(--kobo-error); }
.toast a { color: var(--kobo-text-secondary); font-weight: 700; text-decoration: underline; cursor: pointer; }

/* -------------------------------------------------------- area capture --- */

.capture-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483150;
  cursor: crosshair;
  background: rgba(46, 38, 61, 0.35);
}

.capture-rect {
  position: fixed;
  border: 2px solid var(--kobo-accent-gold);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 9999px rgba(46, 38, 61, 0.35);
  pointer-events: none;
}

.capture-hint {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 9px 16px;
  border-radius: var(--kobo-radius-full);
  background: var(--kobo-text-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
}


/* -------------------------------------------------------------- picker --- */

.picker { position: relative; }

.picker-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--kobo-border-light);
  border-radius: var(--kobo-radius-md);
  background: var(--kobo-bg-primary);
  color: var(--kobo-text-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms var(--kobo-ease), box-shadow 150ms var(--kobo-ease);
}

.picker-trigger:hover { border-color: var(--kobo-text-muted); }

.picker-trigger:focus-visible,
.picker.open .picker-trigger {
  outline: none;
  border-color: var(--kobo-text-secondary);
  box-shadow: 0 0 0 3px rgba(45, 41, 38, 0.06);
}

.picker-trigger.invalid { border-color: var(--kobo-error); }

.picker-thumb {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  object-fit: cover;
  border-radius: var(--kobo-radius-sm, 4px);
  border: 1px solid var(--kobo-border-light);
  background: var(--kobo-bg-warm);
  color: var(--kobo-text-muted);
}

.picker-thumb svg { width: 12px; height: 12px; }

.picker-labels { flex: 1; min-width: 0; }
.picker-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.picker-name.placeholder { font-weight: 400; color: var(--kobo-text-muted); }
.picker-count { font-size: 10.5px; color: var(--kobo-text-muted); }

.picker-caret {
  flex-shrink: 0;
  width: 13px;
  height: 13px;
  color: var(--kobo-text-muted);
  transition: transform 220ms var(--kobo-ease-spring);
}

.picker.open .picker-caret { transform: rotate(180deg); }

.picker-panel {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--kobo-bg-primary);
  border: 1px solid var(--kobo-border-light);
  border-radius: var(--kobo-radius-md);
  box-shadow: var(--kobo-shadow-lg);
  overflow: hidden;
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  transition: opacity 150ms var(--kobo-ease), transform 220ms var(--kobo-ease-spring);
}

.picker.open .picker-panel { opacity: 1; transform: translateY(0); pointer-events: auto; }

.picker-search {
  width: 100%;
  padding: 9px 11px;
  border: none;
  border-bottom: 1px solid var(--kobo-border-light);
  outline: none;
  background: var(--kobo-bg-secondary);
  font-size: 12.5px;
}

.picker-search::placeholder { color: var(--kobo-text-muted); }

.picker-list { max-height: 184px; overflow-y: auto; }

.picker-option {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.picker-option:hover,
.picker-option.active { background: var(--kobo-bg-warm); }

.picker-check { width: 14px; height: 14px; flex-shrink: 0; color: var(--kobo-accent-sage); opacity: 0; }
.picker-option[aria-selected="true"] .picker-check { opacity: 1; }

.picker-create {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 11px;
  border: none;
  border-top: 1px solid var(--kobo-border-light);
  background: var(--kobo-bg-secondary);
  color: var(--kobo-text-primary);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.picker-create:hover,
.picker-create.active { background: var(--kobo-bg-warm); }
.picker-create svg { width: 13px; height: 13px; flex-shrink: 0; color: var(--kobo-text-secondary); }
.picker-create span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* The one remaining native select keeps the OS arrow; give it room. */
select.custom-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b6660' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;
  background-size: 13px;
  padding-right: 28px;
}

/* ----------------------------------------------------- reduced motion ---- */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

.hidden { display: none !important; }
`;
