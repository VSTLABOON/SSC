/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  rol: string | null;
  nombre: string | null;
  plantelId: string | null;
  activo: boolean | null;
  bloqueadoHasta: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [plantelId, setPlantelId] = useState<string | null>(null);
  const [activo, setActivo] = useState<boolean | null>(null);
  const [bloqueadoHasta, setBloqueadoHasta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function hidratarPerfil(userId: string) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('rol, nombre, plantel_id, activo, bloqueado_hasta')
      .eq('id', userId)
      .single();

    if (!error && data) {
      // MEDIO-1: Verificar bloqueado_hasta
      const ahora = new Date();
      const bloqueado = data.bloqueado_hasta && new Date(data.bloqueado_hasta) > ahora;

      // Si la cuenta está desactivada o bloqueada por intentos fallidos, tratarla como pendiente
      setRol(bloqueado || !data.activo ? 'pendiente' : data.rol);
      setNombre(data.nombre);
      setPlantelId(data.plantel_id);
      setActivo(data.activo);
      setBloqueadoHasta(data.bloqueado_hasta);
    } else {
      setRol(null);
      setNombre(null);
      setPlantelId(null);
      setActivo(null);
      setBloqueadoHasta(null);
    }
  }

  useEffect(() => {
    // LOW-06: Se recomienda usar únicamente onAuthStateChange para evitar llamadas paralelas
    // y race conditions con getSession durante el montaje inicial
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await hidratarPerfil(session.user.id);
      } else {
        setRol(null);
        setNombre(null);
        setPlantelId(null);
        setActivo(null);
        setBloqueadoHasta(null);
      }
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, rol, nombre, plantelId, activo, bloqueadoHasta, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
