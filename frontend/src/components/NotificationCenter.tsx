import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'critical' | 'warning' | 'info';
  link?: string;
}

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function fetchNotifications() {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('usuario_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const mapped: NotificationItem[] = data.map(item => ({
          id: item.id,
          title: item.titulo || 'Notificación Conductual',
          message: item.mensaje || '',
          time: new Date(item.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          type: item.tipo === 'alerta_conductual' ? 'critical' : 'warning',
          link: '/director/inicio',
        }));
        setNotifications(mapped);
      }
    }

    fetchNotifications();

    // Suscripción WebSocket en Tiempo Real a la tabla notificaciones del usuario
    const channel = supabase
      .channel(`realtime-notif-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${session.user.id}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const unreadCount = notifications.length;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        title="Notificaciones"
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          padding: '6px',
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>notifications</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #ffffff',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 140 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: 0,
              width: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              zIndex: 150,
              padding: '12px 0',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                padding: '0 16px 10px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#204785' }}>notifications_active</span>
                Centro de Avisos
              </h4>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{unreadCount} Nuevas</span>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '8px', display: 'block' }}>notifications_off</span>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>No tienes notificaciones pendientes</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.link) navigate(n.link);
                      setIsOpen(false);
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f8fafc',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '18px',
                        color: n.type === 'critical' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#204785',
                        marginTop: '2px',
                      }}
                    >
                      {n.type === 'critical' ? 'error' : n.type === 'warning' ? 'warning' : 'info'}
                    </span>
                    <div>
                      <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{n.title}</p>
                      <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#475569', lineHeight: 1.3 }}>{n.message}</p>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
