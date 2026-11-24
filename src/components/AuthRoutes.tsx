import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center text-[#1F1D1A] font-sans">
        <Loader2 className="w-6 h-6 animate-spin text-[#1B4D3E] mb-2" />
        <span className="text-xs text-[#6B655C]">Opening Tunzua...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      navigate('/app', { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center text-[#1F1D1A] font-sans">
      <Loader2 className="w-6 h-6 animate-spin text-[#1B4D3E] mb-2" />
      <span className="text-xs text-[#6B655C]">Signing in...</span>
    </div>
  );
};
