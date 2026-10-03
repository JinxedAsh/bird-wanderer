export interface AuthUser { id: string; name: string; email: string }

async function request(path: string, body?: object): Promise<AuthUser | null> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach Bird Wanderer. Check your connection and try again.');
  }
  if (path === 'me' && response.status === 401) return null;
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The server is unavailable. Please try again.');
  if (!data.user) throw new Error('Unexpected server response. Please try again.');
  return data.user;
}

export const auth = {
  me: () => request('me'),
  login: (email: string, password: string) => request('login', { email, password }),
  register: (name: string, email: string, password: string) => request('register', { name, email, password }),
  logout: () => request('logout', {}),
};
