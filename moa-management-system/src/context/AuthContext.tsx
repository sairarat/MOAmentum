import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInUser: (email: string, pass: string) => Promise<{success: boolean, user?: User, error?: string}>;
  signUpNewUser: (email: string, pass: string, fName: string, lName: string) => Promise<{success: boolean, error?: any}>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInUser = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user };
  };

  const signUpNewUser = async (email: string, password: string, first_name: string, last_name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name } // This sends names to the SQL trigger
      }
    });
    if (error) return { success: false, error };
    return { success: true };
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: { hd: 'neu.edu.ph', prompt: 'select_account' },
      },
    });
  };

  const signOutUser = async () => {
    await supabase.auth.signOut();
    window.location.href = '/signin';
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInUser, signUpNewUser, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('UserAuth must be used inside <AuthProvider>');
  return ctx;
};