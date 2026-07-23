import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';
import toast from 'react-hot-toast';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  permissions: string[];
  ownScope: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const token = localStorage.getItem('cocoma_crm_token');
const user = localStorage.getItem('cocoma_crm_user')
  ? JSON.parse(localStorage.getItem('cocoma_crm_user')!)
  : null;

const initialState: AuthState = { user, token, loading: false, error: null };

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/crm/api/auth/login', credentials);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const setup = createAsyncThunk(
  'auth/setup',
  async (payload: { name: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/crm/api/auth/setup', payload);
      return data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Setup failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/crm/api/auth/logout').catch(() => {});
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    forceLogout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('cocoma_crm_token');
      localStorage.removeItem('cocoma_crm_user');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        localStorage.setItem('cocoma_crm_token', action.payload.token);
        localStorage.setItem('cocoma_crm_user', JSON.stringify(action.payload.user));
        toast.success('Welcome back!');
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(action.payload as string);
      })
      .addCase(setup.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(setup.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        localStorage.setItem('cocoma_crm_token', action.payload.token);
        localStorage.setItem('cocoma_crm_user', JSON.stringify(action.payload.user));
        toast.success('CRM set up — welcome!');
      })
      .addCase(setup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(action.payload as string);
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        localStorage.removeItem('cocoma_crm_token');
        localStorage.removeItem('cocoma_crm_user');
      });
  },
});

export const { clearError, forceLogout } = authSlice.actions;
export default authSlice.reducer;

/** Permission helper used by the UI to hide actions the user can't perform. */
export const can = (user: AuthUser | null, perm: string): boolean => {
  if (!user) return false;
  return user.permissions.includes('*') || user.permissions.includes(perm);
};
