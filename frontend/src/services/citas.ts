import { supabase } from '../lib/supabaseClient';

export interface CitaRecord {
  id: string;
  padreId: string;
  padreNombre: string;
  alumnoId?: string;
  alumnoNombre: string;
  motivo: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  detalles: string;
  estado: 'pendiente' | 'confirmada' | 'reprogramada' | 'cancelada';
  createdAt: string;
  confirmadaPor?: string;
  confirmadaAt?: string;
}

export interface SolicitarCitaParams {
  padreId: string;
  padreNombre: string;
  alumnoId?: string;
  alumnoNombre: string;
  motivo: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  detalles: string;
  plantelId?: string;
}

const STORAGE_PREFIX = 'ssc_citas_orientacion_v2_';

function getStorageKey(plantelId?: string): string {
  return `${STORAGE_PREFIX}${plantelId || 'default'}`;
}

function getLocalCitas(plantelId?: string): CitaRecord[] {
  try {
    const key = getStorageKey(plantelId);
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as CitaRecord[];
  } catch (err) {
    console.warn('[Citas] Error al leer localStorage:', err);
    return [];
  }
}

function saveLocalCitas(citas: CitaRecord[], plantelId?: string): void {
  try {
    const key = getStorageKey(plantelId);
    localStorage.setItem(key, JSON.stringify(citas));
  } catch (err) {
    console.warn('[Citas] Error al guardar en localStorage:', err);
  }
}

/**
 * Solicita una nueva cita de orientación educativa
 * Se guarda en Supabase (seguimientos / notificaciones), se sincroniza localmente
 * y se difunde vía WebSocket Realtime a todos los orientadores y asesores conectados.
 */
export async function solicitarCitaOrientacion(params: SolicitarCitaParams): Promise<CitaRecord> {
  const newCita: CitaRecord = {
    id: `cita_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    padreId: params.padreId,
    padreNombre: params.padreNombre,
    alumnoId: params.alumnoId,
    alumnoNombre: params.alumnoNombre,
    motivo: params.motivo,
    fechaPropuesta: params.fechaPropuesta,
    horaPropuesta: params.horaPropuesta,
    detalles: params.detalles.trim(),
    estado: 'pendiente',
    createdAt: new Date().toISOString(),
  };

  // 1. Guardar en almacenamiento local
  const current = getLocalCitas(params.plantelId);
  const updated = [newCita, ...current.filter(c => c.id !== newCita.id)];
  saveLocalCitas(updated, params.plantelId);

  // 2. Intentar registrar en Supabase (seguimientos si el usuario tiene permisos o se cuenta con sesión activa)
  try {
    if (params.alumnoId) {
      // Buscar orientador del plantel
      const { data: orientadores } = await supabase
        .from('usuarios')
        .select('id')
        .eq('rol', 'orientador')
        .limit(1);

      const orientadorId = orientadores && orientadores.length > 0 ? orientadores[0].id : params.padreId;

      await supabase.from('seguimientos').insert({
        alumno_id: params.alumnoId,
        orientador_id: orientadorId,
        nota: JSON.stringify(newCita),
        tipo: 'cita',
      });
    }
  } catch (err) {
    console.warn('[Citas] Aviso al persistir en seguimientos de Supabase:', err);
  }

  // 3. Difundir vía Supabase Realtime Broadcast a todos los orientadores y asesores
  try {
    const channel = supabase.channel('realtime-ssc-citas-broadcast');
    await channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'nueva_cita',
          payload: { cita: newCita, plantelId: params.plantelId },
        });
      }
    });
  } catch (err) {
    console.warn('[Citas] Aviso al emitir broadcast Realtime:', err);
  }

  // 4. Emitir eventos locales para actualización instantánea en la misma ventana / pestañas
  window.dispatchEvent(new CustomEvent('ssc_cita_creada', { detail: newCita }));
  window.dispatchEvent(new CustomEvent('ssc_data_changed'));

  return newCita;
}

/**
 * Obtener todas las citas de orientación del plantel o del alumno
 */
export async function getCitasOrientacion(plantelId?: string, alumnoId?: string, padreId?: string): Promise<CitaRecord[]> {
  const map = new Map<string, CitaRecord>();

  // 1. Cargar desde Supabase seguimientos
  try {
    let query = supabase
      .from('seguimientos')
      .select('id, nota, created_at, alumno_id')
      .eq('tipo', 'cita')
      .order('created_at', { ascending: false });

    if (alumnoId) {
      query = query.eq('alumno_id', alumnoId);
    }

    const { data: rows, error } = await query;
    if (!error && rows) {
      rows.forEach((r: any) => {
        try {
          if (r.nota && r.nota.startsWith('{')) {
            const parsed = JSON.parse(r.nota) as CitaRecord;
            map.set(parsed.id, parsed);
          }
        } catch {
          // Ignorar notas no JSON
        }
      });
    }
  } catch (err) {
    console.warn('[Citas] Aviso al consultar seguimientos en Supabase:', err);
  }

  // 2. Fusionar con datos locales para redundancia y modo offline
  const local = getLocalCitas(plantelId);
  local.forEach(c => {
    if (!map.has(c.id)) {
      map.set(c.id, c);
    } else {
      // Priorizar estado más reciente
      const existing = map.get(c.id)!;
      if (c.estado !== 'pendiente' && existing.estado === 'pendiente') {
        map.set(c.id, c);
      }
    }
  });

  let result = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (alumnoId) {
    result = result.filter(c => !c.alumnoId || c.alumnoId === alumnoId);
  }

  if (padreId) {
    result = result.filter(c => c.padreId === padreId);
  }

  return result;
}

/**
 * Confirmar una cita por parte del orientador o asesor
 */
export async function confirmarCitaOrientacion(
  citaId: string,
  orientadorId: string,
  orientadorNombre?: string,
  plantelId?: string
): Promise<CitaRecord | null> {
  const current = getLocalCitas(plantelId);
  let updatedRecord: CitaRecord | null = null;

  const updatedList = current.map(c => {
    if (c.id === citaId) {
      updatedRecord = {
        ...c,
        estado: 'confirmada',
        confirmadaPor: orientadorNombre || 'Orientador Educativo',
        confirmadaAt: new Date().toISOString(),
      };
      return updatedRecord;
    }
    return c;
  });

  saveLocalCitas(updatedList, plantelId);

  // 2. Difundir vía Supabase Realtime Broadcast
  try {
    const channel = supabase.channel('realtime-ssc-citas-broadcast');
    await channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'cita_confirmada',
          payload: { citaId, orientadorId, orientadorNombre, updatedRecord },
        });
      }
    });
  } catch (err) {
    console.warn('[Citas] Aviso al emitir broadcast Realtime:', err);
  }

  window.dispatchEvent(new CustomEvent('ssc_cita_actualizada', { detail: { citaId, estado: 'confirmada' } }));
  window.dispatchEvent(new CustomEvent('ssc_data_changed'));

  return updatedRecord;
}
