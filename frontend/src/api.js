const API_URL = import.meta.env.VITE_API_URL || '/api';

export const getSession = () => JSON.parse(localStorage.getItem('atoz-session') || 'null');
export const saveSession = (session) => session
  ? localStorage.setItem('atoz-session', JSON.stringify(session))
  : localStorage.removeItem('atoz-session');

export async function api(path, options = {}) {
  const session = getSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.token ? { Authorization: 'Bearer ' + session.token } : {}),
      ...options.headers,
    },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

export const uploadImage = async (file) => {
  const form = new FormData();
  form.append('image', file);
  return api('/uploads', { method: 'POST', body: form });
};
