import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout as googleLogout } from './firebase';

export interface AppSessionUser {
  email: string | null;
  displayName: string | null;
  uid?: string;
  isLocalSession?: boolean;
}

interface AuthContextType {
  user: (User | AppSessionUser) | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, displayName?: string) => void;
  registerWithEmail: (email: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const OFFLINE_SESSION_KEY = 'tunzua_offline_session_v1';

function readCachedSession(): AppSessionUser | null {
  try {
    const raw = localStorage.getItem(OFFLINE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === 'string' && parsed.email.trim()) {
      return {
        email: parsed.email.trim().toLowerCase(),
        displayName: parsed.displayName || parsed.email.split('@')[0],
        uid: parsed.uid || `local-${parsed.email.trim().toLowerCase()}`,
        isLocalSession: !!parsed.isLocalSession,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedSession(session: AppSessionUser | null) {
  try {
    if (!session || !session.email) {
      localStorage.removeItem(OFFLINE_SESSION_KEY);
      return;
    }
    localStorage.setItem(
      OFFLINE_SESSION_KEY,
      JSON.stringify({
        email: session.email.trim().toLowerCase(),
        displayName: session.displayName || session.email.split('@')[0],
        uid: session.uid || `local-${session.email.trim().toLowerCase()}`,
        isLocalSession: !!session.isLocalSession,
      })
    );
  } catch {
    // ignore storage errors
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Restore cached session immediately so launching the installed standalone app offline or cold works instantaneously
  const initialCached = readCachedSession();
  const [user, setUser] = useState<(User | AppSessionUser) | null>(initialCached);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialCached);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        saveCachedSession({
          email: currentUser.email,
          displayName: currentUser.displayName,
          uid: currentUser.uid,
          isLocalSession: false,
        });
        setLoading(false);
      },
      () => {
        // Preserve an explicit local email/offline session if present so installed standalone launches stay signed in
        const cached = readCachedSession();
        if (cached) {
          setUser(cached);
        } else {
          setUser(null);
        }
        setToken(null);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        saveCachedSession({
          email: result.user.email,
          displayName: result.user.displayName,
          uid: result.user.uid,
          isLocalSession: false,
        });
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const loginWithEmail = (email: string, displayName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const session: AppSessionUser = {
      email: cleanEmail,
      displayName: displayName?.trim() || cleanEmail.split('@')[0],
      uid: `local-${cleanEmail}`,
      isLocalSession: true,
    };
    setUser(session);
    saveCachedSession(session);
  };

  const registerWithEmail = async (email: string, displayName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName?.trim() || cleanEmail.split('@')[0];

    // Register user in workspace directory as a standard 'user' without altering the Admin Google Sheet
    try {
      await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail }),
      });
    } catch {
      // Offline registration still works locally
    }

    const session: AppSessionUser = {
      email: cleanEmail,
      displayName: cleanName,
      uid: `local-${cleanEmail}`,
      isLocalSession: true,
    };
    setUser(session);
    saveCachedSession(session);
  };

  const signOut = async () => {
    try {
      saveCachedSession(null);
      await googleLogout().catch(() => {});
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, loginWithGoogle, loginWithEmail, registerWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
