/**
 * Safe API fetch helper for dashboard components.
 *
 * Validates:
 *  - Response status is successful
 *  - Content-Type is application/json
 *  - Response JSON can be parsed
 *
 * On failure: logs a structured warning (Endpoint, Status, Body, Error) and
 * returns a user-friendly error message — never raw backend errors.
 */

const USER_FRIENDLY_ERROR = 'Unable to load dashboard data. Please try again.';

/**
 * Safely parse a fetch response, validating content-type and status.
 *
 * @param {Response} res - Fetch Response object
 * @param {string} label - Human-readable label for logging (e.g. "Coupons API")
 * @returns {Promise<{ok: boolean, data: object|null, error: string|null}>}
 */
export async function safeFetchJson(res, label = 'API') {
  const endpoint = res.url;
  const status = res.status;

  // 1. Validate content-type
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    console.warn(`${label}: Expected JSON, got "${ct}" | Endpoint: ${endpoint} | Status: ${status}`);
    return { ok: false, data: null, error: USER_FRIENDLY_ERROR };
  }

  // 2. Parse JSON
  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    console.warn(`${label}: JSON parse error | Endpoint: ${endpoint} | Status: ${status} | Error: ${parseErr.message}`);
    return { ok: false, data: null, error: USER_FRIENDLY_ERROR };
  }

  // 3. Validate status
  if (!res.ok) {
    console.warn(`${label}: HTTP ${status} | Endpoint: ${endpoint} | Body:`, data);
    return { ok: false, data, error: data?.error || USER_FRIENDLY_ERROR };
  }

  return { ok: true, data, error: null };
}

/**
 * Same as safeFetchJson but for endpoints that return a known data shape.
 * Validates that the response has the expected key and that its value matches
 * the expected type.
 *
 * @param {Response} res - Fetch Response object
 * @param {string} label - Human-readable label for logging
 * @param {object} shapeValidation - e.g. { coupons: 'array', summary: 'object' }
 * @returns {Promise<{ok: boolean, data: object|null, error: string|null}>}
 */
export async function safeFetchShape(res, label = 'API', shapeValidation = {}) {
  const result = await safeFetchJson(res, label);
  if (!result.ok) return result;

  // Validate expected keys / shapes
  for (const [key, expectedType] of Object.entries(shapeValidation)) {
    const value = result.data?.[key];
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    void actualType;

    if (value === undefined || value === null) {
      console.warn(`${label}: Missing key "${key}" in response | Endpoint: ${res.url}`);
      return { ok: false, data: result.data, error: USER_FRIENDLY_ERROR };
    }

    if (expectedType === 'array' && !Array.isArray(value)) {
      console.warn(`${label}: Expected "${key}" to be array, got ${typeof value} | Endpoint: ${res.url}`, value);
      return { ok: false, data: result.data, error: USER_FRIENDLY_ERROR };
    }

    if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      console.warn(`${label}: Expected "${key}" to be object, got ${typeof value} | Endpoint: ${res.url}`, value);
      return { ok: false, data: result.data, error: USER_FRIENDLY_ERROR };
    }
  }

  return result;
}

export default safeFetchJson;
