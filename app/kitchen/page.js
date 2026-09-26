'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function loadOrders() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['received', 'cooking'])
        .order('created_at', { ascending: true });
      setOrders(data || []);
    }
    loadOrders();

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders((prev) => [...prev, payload.new]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders((prev) => {
            if (payload.new.status === 'served') {
              return prev.filter((o) => o.id !== payload.new.id);
            }
            return prev.map((o) => (o.id === payload.new.id ? payload.new : o));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markCooking(id) {
    await supabase.from('orders').update({ status: 'cooking' }).eq('id', id);
  }

  async function markServed(id) {
    await supabase.from('orders').update({ status: 'served' }).eq('id', id);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>จอบาริสต้า</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        {orders.map((order) => (
          <div
            key={order.id}
            className="card"
            style={{
              background: order.status === 'cooking' ? '#fff3cd' : '#fff',
              border: '2px solid #6f4e37',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800 }}>โต๊ะ {order.table_number}</div>
            <div style={{ color: '#7a6a5a', marginBottom: 8 }}>
              {new Date(order.created_at).toLocaleTimeString('th-TH')}
            </div>
            <ul style={{ fontSize: 18, paddingLeft: 20 }}>
              {(order.items || []).map((it, idx) => (
                <li key={idx}>
                  {it.name} x{it.quantity}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {order.status === 'received' && (
                <button className="btn-secondary" onClick={() => markCooking(order.id)}>
                  เริ่มทำ
                </button>
              )}
              <button className="btn-primary" onClick={() => markServed(order.id)}>
                จัดเสิร์ฟแล้ว
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
