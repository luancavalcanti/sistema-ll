"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export type UserRole = 'admin' | 'user' | 'consulta' | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isConsulta: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isAdmin: false,
  isUser: false,
  isConsulta: false
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async (currentUser: User) => {
      try {
        const { data } = await supabase.from('users').select('role').eq('id', currentUser.id).single();
        setRole((data?.role as UserRole) || 'user');
      } catch (error) {
        setRole('user');
      }
    };

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserRole(session.user);
      }
      setLoading(false);
    };

    initializeAuth();

    // 👇 A MÁGICA ACONTECE AQUI
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => { // 1. Removemos o 'async' daqui
        
        // 2. Envolvemos TUDO em um setTimeout(..., 0) para evitar o Deadlock de abas!
        setTimeout(async () => {
          if (session?.user) {
            setUser(session.user);
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
              await fetchUserRole(session.user); // Agora esse await está seguro!
            }
          } else {
            setUser(null);
            setRole(null);
            if (event === 'SIGNED_OUT') {
              router.replace('/login');
            }
          }
          setLoading(false);
        }, 0);
        
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const value = { 
    user, 
    role, 
    loading, 
    isAdmin: role === 'admin',
    isUser: role === 'user',
    isConsulta: role === 'consulta'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);