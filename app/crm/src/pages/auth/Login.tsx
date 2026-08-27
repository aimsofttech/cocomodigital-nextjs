import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { login, setup } from '@/features/auth/authSlice';
import { get } from '@/services/api';

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading } = useAppSelector((s) => s.auth);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    get<{ needsSetup: boolean }>('/crm/api/auth/setup-status')
      .then(({ data }) => setNeedsSetup(data.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const action = needsSetup ? setup({ name, email, password }) : login({ email, password });
    const res = await dispatch(action as any);
    if (login.fulfilled.match(res) || setup.fulfilled.match(res)) navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-lg font-extrabold text-white">C</div>
          <h1 className="text-lg font-bold">Cocoma <span className="text-primary-600">CRM</span></h1>
          <p className="text-xs text-gray-400">
            {needsSetup ? 'Create the first admin account' : 'Sign in to your workspace'}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {needsSetup && (
            <div>
              <label className="label">Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              className="input" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required autoFocus={!needsSetup}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={needsSetup ? 6 : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button className="btn-primary w-full justify-center" disabled={loading || needsSetup === null}>
            {loading ? 'Please wait…' : needsSetup ? 'Create admin account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
