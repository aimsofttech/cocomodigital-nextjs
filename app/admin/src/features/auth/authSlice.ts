import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const token = localStorage.getItem('cocoma_token');
const user = localStorage.getItem('cocoma_user') ? JSON.parse(localStorage.getItem('cocoma_user')!) : null;

const initialState: AuthState = { user, token, loading: false, error: null };

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
        localStorage.setItem('cocoma_token', action.payload.token);
        localStorage.setItem('cocoma_user', JSON.stringify(action.payload.user));
        toast.success('Login successful');
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(action.payload as string);
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        localStorage.removeItem('cocoma_token');
        localStorage.removeItem('cocoma_user');
        // Fixed id — react-hot-toast replaces instead of stacking duplicates
        toast.success('Logged out successfully', { id: 'logout-toast' });
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
