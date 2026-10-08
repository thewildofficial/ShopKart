// The browser stores and sends the HttpOnly cookie. JavaScript never reads the JWT.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/customers${path}`, {
      method,
      credentials: 'include',
      signal,
      ...(body && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Unable to reach ShopKart. Please try again.', 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', response.status);
  }
  if (!data) throw new ApiError('ShopKart returned an unexpected response. Please try again.', response.status);
  return data;
}

export const api = {
  register: (details) => request('/register', { method: 'POST', body: details }),
  login: (details) => request('/login', { method: 'POST', body: details }),
  me: (signal) => request('/me', { signal }),
  logout: () => request('/logout', { method: 'POST' }),
};
