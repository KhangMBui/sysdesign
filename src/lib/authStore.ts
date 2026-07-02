export interface AuthUser {
  id: string;
  email: string;
  createdAt: number;
}

let _user: AuthUser | null = null;
const _listeners = new Set<() => void>();

export function setCurrentUser(user: AuthUser | null): void {
  _user = user;
  _listeners.forEach((fn) => fn());
}

export function getCurrentUser(): AuthUser | null {
  return _user;
}

export function subscribeAuthChange(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
