import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface PostgresSubscription {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  table: string;
  filter?: string;
}

interface BroadcastSubscription {
  event: string;
}

type SubscriptionConfig =
  | { type: 'postgres_changes'; config: PostgresSubscription; callback: (payload: RealtimePostgresChangesPayload<any>) => void }
  | { type: 'broadcast'; config: BroadcastSubscription; callback: (payload: any) => void };

interface UseSupabaseSubscriptionOptions {
  /** Unique channel name for this subscription */
  channelName: string;
  /** Array of subscriptions to set up on this channel */
  subscriptions: SubscriptionConfig[];
  /** Optional window events to also listen for (e.g., 'ssc_data_changed') */
  windowEvents?: string[];
  /** Callback invoked when any window event fires */
  onWindowEvent?: () => void;
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook reutilizable para suscripciones Supabase Realtime.
 * Centraliza la lógica de creación/limpieza de canales WebSocket
 * y eventos de ventana, evitando duplicación entre componentes.
 *
 * @example
 * useSupabaseSubscription({
 *   channelName: `realtime-alumno-${userId}`,
 *   subscriptions: [
 *     { type: 'postgres_changes', config: { event: '*', table: 'incidencias' }, callback: () => reload() },
 *   ],
 *   windowEvents: ['ssc_data_changed'],
 *   onWindowEvent: () => reload(),
 * });
 */
export function useSupabaseSubscription({
  channelName,
  subscriptions,
  windowEvents = [],
  onWindowEvent,
  enabled = true,
}: UseSupabaseSubscriptionOptions): void {
  useEffect(() => {
    if (!enabled) return;

    let channel: RealtimeChannel = supabase.channel(channelName);

    for (const sub of subscriptions) {
      if (sub.type === 'postgres_changes') {
        channel = channel.on(
          'postgres_changes',
          { event: sub.config.event, schema: sub.config.schema || 'public', table: sub.config.table, filter: sub.config.filter } as any,
          sub.callback
        );
      } else if (sub.type === 'broadcast') {
        channel = channel.on(
          'broadcast',
          { event: sub.config.event },
          sub.callback
        );
      }
    }

    channel.subscribe();

    const windowHandler = onWindowEvent || (() => {});
    for (const evt of windowEvents) {
      window.addEventListener(evt, windowHandler);
    }

    return () => {
      supabase.removeChannel(channel);
      for (const evt of windowEvents) {
        window.removeEventListener(evt, windowHandler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled]);
}
