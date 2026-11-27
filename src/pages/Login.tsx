import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../components/Logo';
import { PWAInstallButton } from '../components/PWAInstallButton';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithEmail, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      toast.success('Signed in with Google.');
      navigate('/app', { replace: true });
    } catch (err: any) {
      toast.error(`Sign in failed: ${err.message || 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setLoading(true);
    loginWithEmail(email);
    toast.success(`Welcome back, ${email}`);
    navigate('/app', { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo size={44} className="mx-auto rounded-lg mb-4" />
        <h1 className="font-display text-3xl font-semibold text-[#1F1D1A] tracking-tight">
          Tunzua
        </h1>
        <p className="mt-1.5 text-sm text-[#6B655C]">
          Simple double-entry ledger & asset tracking
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFDF9] border border-[#E5E0D5] py-8 px-6 sm:px-9 rounded-xl space-y-6">
          <form className="space-y-4" onSubmit={handleStandardSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="name@tunzua.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F6F1] border border-[#E5E0D5] text-[#1F1D1A] text-sm rounded-lg focus:border-[#1B4D3E] focus:bg-[#FFFDF9] focus:outline-none transition-colors placeholder:text-[#968E82]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F6F1] border border-[#E5E0D5] text-[#1F1D1A] text-sm rounded-lg focus:border-[#1B4D3E] focus:bg-[#FFFDF9] focus:outline-none transition-colors placeholder:text-[#968E82]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-[#FFFDF9] bg-[#1B4D3E] hover:bg-[#143B2F] transition-colors cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E0D5]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#FFFDF9] text-[#968E82]">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full inline-flex items-center justify-center bg-[#F8F6F1] hover:bg-[#F2EFE9] text-[#1F1D1A] text-sm px-4 py-2.5 rounded-lg border border-[#E5E0D5] font-medium cursor-pointer transition-colors gap-2.5"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 block">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <p className="text-center text-xs text-[#6B655C]">
            New to Tunzua?{' '}
            <Link to="/register" className="font-semibold text-[#1B4D3E] hover:underline">
              Create an account
            </Link>
          </p>

          <PWAInstallButton variant="login" />
        </div>
      </div>
    </div>
  );
};

export default Login;
