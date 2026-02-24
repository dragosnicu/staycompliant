const BASE = import.meta.env.VITE_API_URL || '';

export function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export function apiUpload(path, formData) {
  const token = localStorage.getItem('token');
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
}
