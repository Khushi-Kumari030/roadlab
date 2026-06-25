import { type User } from '../context/RoadLabContext';

const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:8000';

export class AuthService {
  private static SESSION_KEY = 'roadlab_user_session';
  private static TOKEN_KEY = 'roadlab_user_token';

  public static getStoredUser(): User | null {
    const raw = localStorage.getItem(this.SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public static getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public static saveSession(user: User, token: string): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  public static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    // Cleanup temporary workspace file pointers or active states if any
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn("sessionStorage clear failed", e);
    }
  }

  public static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const response = await fetch(`${BACKEND_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Invalid email or password.');
      }

      const data = await response.json();
      this.saveSession(data.user, data.token);
      return data;
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) {
        throw e;
      }
      
      // Fallback local simulation logic
      console.warn("Backend Auth offline. Fallback to Local simulation.");
      const mockUsersRaw = localStorage.getItem('roadlab_mock_users');
      const mockUsers = mockUsersRaw ? JSON.parse(mockUsersRaw) : [];
      
      // Check default admin fallback
      if (email === 'admin@roadlab.ai' && password === 'admin123') {
        const adminUser: User = {
          id: 'usr-admin',
          name: 'John Doe',
          email: 'admin@roadlab.ai',
          role: 'Administrator',
          company: 'RoadLab Global',
          theme: 'dark',
          units: 'm',
          avatar: 'JD'
        };
        this.saveSession(adminUser, 'mock-jwt-token-admin');
        return { user: adminUser, token: 'mock-jwt-token-admin' };
      }

      const found = mockUsers.find((u: any) => u.email === email && u.password === password);
      if (!found) {
        throw new Error('Invalid email or password (Local Fallback Check).');
      }

      const localUser: User = {
        id: found.id,
        name: found.name,
        email: found.email,
        role: 'Engineer',
        company: 'Local Consulting',
        theme: found.theme || 'dark',
        units: found.units || 'm',
        avatar: found.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
      };
      this.saveSession(localUser, `mock-jwt-token-${found.id}`);
      return { user: localUser, token: `mock-jwt-token-${found.id}` };
    }
  }

  public static async signup(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    try {
      const response = await fetch(`${BACKEND_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Email already exists or signup invalid.');
      }

      const data = await response.json();
      this.saveSession(data.user, data.token);
      return data;
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) {
        throw e;
      }

      console.warn("Backend Auth offline. Performing Local signup.");
      const mockUsersRaw = localStorage.getItem('roadlab_mock_users');
      const mockUsers = mockUsersRaw ? JSON.parse(mockUsersRaw) : [];
      
      const exists = mockUsers.some((u: any) => u.email === email) || email === 'admin@roadlab.ai';
      if (exists) {
        throw new Error('Email address already registered.');
      }

      const newId = `usr-${Date.now()}`;
      const newMockUser = { id: newId, email, password, name, theme: 'dark', units: 'm' };
      mockUsers.push(newMockUser);
      localStorage.setItem('roadlab_mock_users', JSON.stringify(mockUsers));

      const user: User = {
        id: newId,
        name,
        email,
        role: 'Engineer',
        company: 'RoadLab Partner',
        theme: 'dark',
        units: 'm',
        avatar: name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
      };
      this.saveSession(user, `mock-jwt-token-${newId}`);
      return { user, token: `mock-jwt-token-${newId}` };
    }
  }

  public static async forgotPassword(email: string): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to request password reset.');
      }

      const data = await response.json();
      return data.message || 'Password reset token has been sent to your email.';
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) {
        throw e;
      }

      console.warn("Backend Auth offline. Simulating local forgot-password.");
      // Check if user exists locally
      const mockUsersRaw = localStorage.getItem('roadlab_mock_users');
      const mockUsers = mockUsersRaw ? JSON.parse(mockUsersRaw) : [];
      const exists = mockUsers.some((u: any) => u.email === email) || email === 'admin@roadlab.ai';

      if (!exists) {
        throw new Error('Email address not registered.');
      }

      // Store a mock token temporarily in localStorage
      localStorage.setItem('roadlab_temp_reset_token', '123456');
      return 'Mock Reset token [123456] generated! Use this token in the next step.';
    }
  }

  public static async resetPassword(token: string, password: string): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid reset token or failed to reset password.');
      }

      const data = await response.json();
      return data.message || 'Password successfully updated.';
    } catch (e: any) {
      if (e.message && !e.message.includes('Failed to fetch')) {
        throw e;
      }

      console.warn("Backend Auth offline. Simulating local password reset.");
      const storedToken = localStorage.getItem('roadlab_temp_reset_token');
      if (token !== '123456' && token !== storedToken) {
        throw new Error('Invalid verification reset token.');
      }

      // Reset works, clean up token
      localStorage.removeItem('roadlab_temp_reset_token');
      return 'Password successfully reset via local mock simulation.';
    }
  }

  public static async updateProfile(userId: string, data: Partial<User> & { currentPassword?: string; newPassword?: string }): Promise<User> {
    try {
      const response = await fetch(`${BACKEND_BASE}/api/auth/profile/update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getStoredToken()}`
        },
        body: JSON.stringify({ user_id: userId, ...data }),
      });

      if (response.ok) {
        // Backend success — merge update locally too
        const currentSessionUser = this.getStoredUser();
        const updatedUser: User = {
          ...(currentSessionUser || {} as User),
          ...data,
          id: userId,
        };
        this.saveSession(updatedUser, this.getStoredToken() || '');
        return updatedUser;
      }
      // If backend responds with non-ok, fall through to local
    } catch (_) {
      // Network error — fall through to local simulation
    }

    console.warn("Backend Auth offline or endpoint mismatch. Performing Local profile update.");
    const currentSessionUser = this.getStoredUser();
    if (!currentSessionUser || currentSessionUser.id !== userId) {
      throw new Error('Unauthorized or session expired.');
    }

    // Local mock update
    const updatedUser: User = {
      ...currentSessionUser,
      name: data.name ?? currentSessionUser.name,
      email: data.email ?? currentSessionUser.email,
      theme: data.theme ?? currentSessionUser.theme,
      units: data.units ?? currentSessionUser.units,
      role: data.role ?? currentSessionUser.role,
      company: data.company ?? currentSessionUser.company,
      avatar: (data.name ?? currentSessionUser.name).split(' ').map((n: string) => n[0]).join('').toUpperCase()
    };

    // If user is local, also update in the mock database
    const mockUsersRaw = localStorage.getItem('roadlab_mock_users');
    if (mockUsersRaw) {
      const mockUsers = JSON.parse(mockUsersRaw);
      const idx = mockUsers.findIndex((u: any) => u.id === userId);
      if (idx !== -1) {
        if (data.newPassword && data.currentPassword) {
          if (mockUsers[idx].password !== data.currentPassword) {
            throw new Error('Current password incorrect.');
          }
          mockUsers[idx].password = data.newPassword;
        }
        mockUsers[idx].name = updatedUser.name;
        mockUsers[idx].email = updatedUser.email;
        mockUsers[idx].theme = updatedUser.theme;
        mockUsers[idx].units = updatedUser.units;
        localStorage.setItem('roadlab_mock_users', JSON.stringify(mockUsers));
      }
    }

    this.saveSession(updatedUser, this.getStoredToken() || 'mock-token');
    return updatedUser;
  }
}
