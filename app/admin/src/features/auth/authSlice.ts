import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Which AdminRole the user holds — drives every permission check. */
  roleKey?: string;
  roleName?: string;
  isSuperAdmin?: boolean;
  profileImage?: string;
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
}

/** module key → { view, create, update, delete, export, import }. */
export type PermissionMap = Record<string, Record<string, boolean>>;

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /* Cached alongside the user so a page refresh draws the correct menu on the
   * first paint instead of flashing a full one and then removing items. It is
   * re-fetched from the server on every load — see `loadSession` — so a stale
   * copy can only ever be one render old, and the API enforces the real
   * boundary regardless of what is cached here. */
  permissions: PermissionMap;
  loading: boolean;
  error: string | null;
}

const readCached = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const token = localStorage.getItem('cocoma_token');
const user = readCached<AuthUser | null>('cocoma_user', null);
const permissions = readCached<PermissionMap>('cocoma_permissions', {});

const initialState: AuthState = { user, token, permissions, loading: false, error: null };

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/admin/api/auth/login', credentials);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/admin/api/auth/logout').catch(() => {});
});

/**
 * Re-read the session on app load so a role or permission change made by a
 * Super Admin takes effect on the next refresh. Silent by design: a failure
 * here just leaves the cached copy in place, and the 401 interceptor already
 * handles a session that has actually expired.
 */
export const loadSession = createAsyncThunk(
  'auth/loadSession',
  async (_: void, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/admin/api/profile');
      return data.data;
    } catch (err: any) {
      return rejectWithValue(null);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.permissions = action.payload.permissions || {};
        localStorage.setItem('cocoma_token', action.payload.token);
        localStorage.setItem('cocoma_user', JSON.stringify(action.payload.user));
        localStorage.setItem('cocoma_permissions', JSON.stringify(state.permissions));
        toast.success('Login successful');
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        if (!action.payload) return;
        state.user = action.payload.user;
        state.permissions = action.payload.permissions || {};
        localStorage.setItem('cocoma_user', JSON.stringify(state.user));
        localStorage.setItem('cocoma_permissions', JSON.stringify(state.permissions));
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(action.payload as string);
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.permissions = {};
        localStorage.removeItem('cocoma_token');
        localStorage.removeItem('cocoma_user');
        localStorage.removeItem('cocoma_permissions');
        // Fixed id — react-hot-toast replaces instead of stacking duplicates
        toast.success('Logged out successfully', { id: 'logout-toast' });
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
