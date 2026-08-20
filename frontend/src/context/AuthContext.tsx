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

  async function hidratarPerfil(user: { id: string; user_metadata?: Record<string, any>; email?: string }) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('rol, nombre, plantel_id, activo, bloqueado_hasta')
      .eq('id', user.id)
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
    } else if (user.user_metadata?.rol || user.email === 'admin@conalep.edu.mx') {
      // Respaldo resiliente desde Auth metadata
      const metaRol = user.user_metadata?.rol || (user.email === 'admin@conalep.edu.mx' ? 'administrador' : null);
      const metaNombre = user.user_metadata?.nombre || (user.email === 'admin@conalep.edu.mx' ? 'Ing. Carlos Mendoza' : null);
      const metaPlantel = user.user_metadata?.plantel_id || 'b5cde2a6-38d5-450f-90db-3367c3bb1b51';
      setRol(metaRol);
      setNombre(metaNombre);
      setPlantelId(metaPlantel);
      setActivo(true);
      setBloqueadoHasta(null);
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
        await hidratarPerfil(session.user);
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

  // ── Temporizador Estricto de Inactividad (15 Minutos) ──────────────────────
  useEffect(() => {
    if (!session) return;

    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos
    let timer: ReturnType<typeof setTimeout>;

    const handleInactivity = async () => {
      console.warn('Cierre de sesión automático ejecutado por 15 minutos de inactividad.');
      await supabase.auth.signOut();
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleInactivity, INACTIVITY_TIMEOUT_MS);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [session]);

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
