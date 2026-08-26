// Kobo API client. Every endpoint here is verified against server/routes/api/inspiration.php
// and server/app/Http/Controllers/InspirationController.php — do not add speculative endpoints.

import { getEnvironment, APP_TYPE } from './config.js';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  get isAuthError() {
    return this.status === 401;
  }
}

async function baseUrl() {
  return (await getEnvironment()).api;
}

async function getSessionRecord() {
  const { koboSession } = await chrome.storage.local.get(['koboSession']);

  return koboSession || null;
}

// Tenant context headers, mirroring client/plugins/axios.ts. The backend
// resolver reads X-Tenant-* first and falls back to the user's
// selected_brand_id setting — without these the extension would silently pin
// into whichever brand the user last picked in the web app, which is not
// necessarily the one they have chosen here.
async function tenantHeaders(session) {
  const headers = {};
  if (!session) return headers;

  if (session.companyId) {
    headers['X-Company-ID'] = String(session.companyId);
    headers['X-Tenant-Company'] = String(session.companyId);
  }

  const brandId = session.activeBrandId ?? session.selectedBrandId;

  if (brandId && brandId > 0) {
    headers['X-Brand-ID'] = String(brandId);
    headers['X-Tenant-Brand'] = String(brandId);
  }

  return headers;
}

// Laravel returns validation errors as { message, errors: { field: [msg] } }.
// Surface the first field message — it's far more useful than "The given data was invalid."
function readableError(body, fallback) {
  if (body?.errors && typeof body.errors === 'object') {
    const first = Object.values(body.errors)[0];
    if (Array.isArray(first) && first[0]) {
      return first[0];
    }
  }

  return body?.message || body?.error || fallback;
}

async function request(path, { method = 'GET', body, auth = true, isForm = false } = {}) {
  const headers = { Accept: 'application/json' };

  if (auth) {
    const session = await getSessionRecord();
    if (!session?.token) {
      throw new ApiError('Please sign in to Kobo first', 401, null);
    }
    headers.Authorization = `Bearer ${session.token}`;
    Object.assign(headers, await tenantHeaders(session));
  }

  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${await baseUrl()}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      readableError(payload, `Request failed (${response.status})`),
      response.status,
      payload,
    );
  }

  return payload;
}

/* ---------------------------------------------------------------- auth ---- */

export async function login({ email, password, remember = true }) {
  const data = await request('/login', {
    method: 'POST',
    auth: false,
    body: { email, password, remember, app_type: APP_TYPE },
  });

  if (!data?.access_token) {
    throw new ApiError('No authentication token received', 500, data);
  }

  return {
    token: data.access_token,
    userId: data.user?.user_id,
    name: data.user?.name,
    email: data.user?.email,
    companyId: data.user?.company_id,
    companyName: data.user?.company_name,
    avatarUrl: data.user?.avatar_url,
    permissions: data.user?.permissions || [],
    selectedBrandId: data.selectedBrand,
    activeBrandId: data.selectedBrand,
    brands: data.brands || [],
  };
}

export async function logout() {
  // Best-effort: blacklist the JWT server-side. A failure here must not block
  // the local sign-out, so callers should catch and continue.
  return request('/logout', { method: 'POST' });
}

/* -------------------------------------------------------------- boards ---- */

export async function getBoards() {
  const data = await request('/inspiration/boards');

  return data?.data || [];
}

export async function createBoard({ name, description, visibility = 'private', brandId }) {
  const data = await request('/inspiration/boards', {
    method: 'POST',
    body: { name, description, visibility, brand_id: brandId ?? null },
  });

  return data?.data;
}

// Returns { board, pins } — the server nests both under `data`.
export async function getBoardPins(boardId) {
  const data = await request(`/inspiration/boards/${boardId}/pins`);

  return { board: data?.data?.board || null, pins: data?.data?.pins || [] };
}

export async function getBoardCollections(boardId) {
  const data = await request(`/inspiration/boards/${boardId}/collections`);

  return data?.data || [];
}

/* ---------------------------------------------------------------- pins ---- */

export async function createPin({ boardId, title, description, imageUrl, sourceUrl, tags }) {
  const data = await request('/inspiration/pins', {
    method: 'POST',
    body: {
      board_id: boardId,
      title,
      description: description || null,
      image_url: imageUrl,
      source_url: sourceUrl || null,
      tags: tags || [],
    },
  });

  return data?.data;
}

// Uploads a blob (screenshot / area capture) as a multipart pin.
export async function createPinFromBlob({ boardId, title, description, blob, sourceUrl, tags }) {
  const form = new FormData();
  form.append('board_id', boardId);
  form.append('title', title);
  if (description) form.append('description', description);
  if (sourceUrl) form.append('source_url', sourceUrl);
  (tags || []).forEach(tag => form.append('tags[]', tag));
  form.append('image', blob, 'capture.png');

  const data = await request('/inspiration/pins', { method: 'POST', body: form, isForm: true });

  return data?.data;
}

export async function movePinToCollection(pinId, collectionId) {
  return request(`/inspiration/pins/${pinId}/collection`, {
    method: 'PUT',
    body: { collection_id: collectionId },
  });
}

// linkable_type is restricted to style|component server-side (InspirationController::linkPin).
export async function linkPin(pinId, { linkableType, linkableId, notes }) {
  return request(`/inspiration/pins/${pinId}/link`, {
    method: 'POST',
    body: { linkable_type: linkableType, linkable_id: linkableId, notes: notes || null },
  });
}

export async function extractPinColours(pinId) {
  return request(`/inspiration/pins/${pinId}/extract-colours`, { method: 'POST' });
}

export async function searchPins({ query, boardId } = {}) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (boardId) params.set('board_id', boardId);

  const data = await request(`/inspiration/search?${params}`);

  return data?.data || [];
}

// { total_boards, total_pins, favorite_pins, recent_boards[] }.
// The server has no "saved today" concept — the popup tracks that locally.
export async function getStats() {
  const data = await request('/inspiration/stats');

  return data?.data || null;
}

/* -------------------------------------------------------------- linking --- */

// Index paths are prefixed — `/styles` and `/components` are NOT routes.
// Both endpoints return a fat lookup payload rather than a plain list, and
// neither item carries a `name`, so both are normalised to { id, label, code }
// here and nowhere else. Verified against live responses, not the route file.

export async function searchStyles(search) {
  const data = await request(`/product-development/styles?search=${encodeURIComponent(search)}`);

  return (data?.styles || []).map(style => ({
    id: style.id,
    label: style.style_name || `Style #${style.id}`,
    code: style.style_code || '',
  }));
}

export async function searchComponents(search) {
  const data = await request(`/supply-chain/components?search=${encodeURIComponent(search)}`);

  // Grouped by category: [{ category_name, components: [] }].
  return (data?.component || [])
    .flatMap(group => group.components || [])
    .map(component => ({
      id: component.id,
      label: component.variant_name || component.component_type || `Component #${component.id}`,
      code: component.ref || component.internal_ref || '',
    }));
}
