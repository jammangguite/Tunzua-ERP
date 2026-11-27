import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../components/Logo';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { user, registerWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !companyName) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(email, companyName);
      toast.success(`Welcome to Tunzua, ${email}. Your data saves to the Admin’s linked Google Sheet.`);
      navigate('/app', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo size={44} className="mx-auto rounded-lg mb-4" />
        <h1 className="font-display text-3xl font-semibold text-[#1F1D1A] tracking-tight">
          Create your Tunzua Ledger
        </h1>
        <p className="mt-1.5 text-sm text-[#6B655C]">
          Set up a calm, organized accounting workspace in seconds
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFDF9] border border-[#E5E0D5] py-8 px-6 sm:px-9 rounded-xl space-y-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="company" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Business or Ledger Name
              </label>
              <input
                id="company"
                type="text"
                required
                placeholder="Tunzua Studio"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F6F1] border border-[#E5E0D5] text-[#1F1D1A] text-sm rounded-lg focus:border-[#1B4D3E] focus:bg-[#FFFDF9] focus:outline-none transition-colors placeholder:text-[#968E82]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Email Address
              </label>
              <input
                id="email"
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
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F6F1] border border-[#E5E0D5] text-[#1F1D1A] text-sm rounded-lg focus:border-[#1B4D3E] focus:bg-[#FFFDF9] focus:outline-none transition-colors placeholder:text-[#968E82]"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-[#6B655C] mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F8F6F1] border border-[#E5E0D5] text-[#1F1D1A] text-sm rounded-lg focus:border-[#1B4D3E] focus:bg-[#FFFDF9] focus:outline-none transition-colors placeholder:text-[#968E82]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-[#FFFDF9] bg-[#1B4D3E] hover:bg-[#143B2F] transition-colors cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-[#6B655C]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#1B4D3E] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
