import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (username: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("signIn called with:", { email, password: password.length + " chars" });
    
    // Check for fake login credentials
    if (email === "technibussiness@gmail.com" && password === "ARI2884EL3125966!0812") {
      console.log("FAKE LOGIN DETECTED - bypassing Supabase");
      
      // Create a fake user and session for the demo account
      const fakeUser = {
        id: 'fake-user-123',
        email: 'technibussiness@gmail.com',
        user_metadata: { username: 'Demo User' },
        app_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: null,
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_change_sent_at: null,
        new_email: null,
        new_phone: null,
        invited_at: null,
        action_link: null,
        phone: null,
        last_sign_in_at: new Date().toISOString()
      } as User;
      
      const fakeSession = {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: fakeUser
      } as Session;
      
      // Set the fake session and user immediately
      console.log("Setting fake user and session");
      setSession(fakeSession);
      setUser(fakeUser);
      
      return { error: null };
    }

    console.log("Not fake login, proceeding with Supabase auth");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, username?: string) => {
    // Check for fake login credentials
    if (email === "technibussiness@gmail.com" && password === "ARI2884EL3125966!0812") {
      // Create a fake user and session for the demo account
      const fakeUser = {
        id: 'fake-user-123',
        email: 'technibussiness@gmail.com',
        user_metadata: { username: username || 'Demo User' },
        app_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: null,
        confirmation_sent_at: null,
        recovery_sent_at: null,
        email_change_sent_at: null,
        new_email: null,
        new_phone: null,
        invited_at: null,
        action_link: null,
        phone: null,
        last_sign_in_at: new Date().toISOString()
      } as User;
      
      const fakeSession = {
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: fakeUser
      } as Session;
      
      // Set the fake session and user
      setSession(fakeSession);
      setUser(fakeUser);
      
      return { error: null };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || ''
        }
      }
    });

    // If signup successful and we have a username, update profile
    if (!error && username) {
      setTimeout(() => {
        updateProfile(username);
      }, 100);
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (username: string) => {
    if (!user) return { error: 'No user logged in' };

    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('user_id', user.id);

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}