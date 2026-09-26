'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function OrderPage({ params }) {
  const { tableNumber } = use(params);

  const [loadingSession, setLoadingSession] = useState(true);
  const [session, setSession] = useState(null); // { id }
  const [notOpen, setNotOpen] = useState(false);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [cart, setCart] = useState([]); // [{ name, price, quantity }]
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const [showBillConfirm, setShowBillConfirm] = useState(false);
  const [billTotal, setBillTotal] = useState(0);
  const [closingBill, setClosingBill] = useState(false);
  const [thankYou, setThankYou] = useState(false);

  useEffect(() => {
    async function loadSession() {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('table_number', parseInt(tableNumber, 10))
        .eq('status', 'open')
        .maybeSingle();

      if (error || !data) {
        setNotOpen(true);
      } else {
        setSession(data);
      }
      setLoadingSession(false);
    }
    loadSession();
  }, [tableNumber]);

  useEffect(() => {
    async function loadMenu() {
      const { data: cats } = await supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      const { data: menuItems } = await supabase.from('menu_items').select('*');

      setCategories(cats || []);
      setItems(menuItems || []);
      if (cats && cats.length > 0) setActiveCategoryId(cats[0].id);
    }
    if (session) loadMenu();
  }, [session]);

  function addToCart(item, quantity) {
    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.name === item.name);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: copy[existingIndex].quantity + quantity,
        };
        return copy;
      }
      return [...prev, { name: item.name, price: item.price, quantity }];
    });
  }

  function removeFromCart(name) {
    setCart((prev) => prev.filter((c) => c.name !== name));
  }

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.price, 0);

  async function handleSendOrder() {
    if (cart.length === 0) return;
    setSending(true);
    try {
      const { error } = await supabase.from('orders').insert({
        session_id: session.id,
        table_number: parseInt(tableNumber, 10),
        items: cart,
        status: 'received',
      });
      if (error) throw error;

      setCart([]);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 2500);
    } catch (err) {
      alert('ส่งออเดอร์ไม่สำเร็จ: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleOpenBill() {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('items')
      .eq('session_id', session.id);

    if (error) {
      alert('คำนวณยอดไม่สำเร็จ: ' + error.message);
      return;
    }

    let total = 0;
    (orders || []).forEach((o) => {
      (o.items || []).forEach((it) => {
        total += it.quantity * it.price;
      });
    });
    setBillTotal(total);
    setShowBillConfirm(true);
  }

  async function handleConfirmBill() {
    setClosingBill(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', session.id);
      if (error) throw error;
      setShowBillConfirm(false);
      setThankYou(true);
    } catch (err) {
      alert('ปิดโต๊ะไม่สำเร็จ: ' + err.message);
    } finally {
      setClosingBill(false);
    }
  }

  if (loadingSession) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (notOpen) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>โต๊ะนี้ยังไม่เปิดใช้งาน</h2>
        <p>กรุณาแจ้งพนักงาน</p>
      </div>
    );
  }

  if (thankYou) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h2>ขอบคุณที่ใช้บริการ ☕</h2>
        <p style={{ fontSize: 20 }}>ยอดรวม {billTotal} บาท</p>
      </div>
    );
  }

  const activeItems = items.filter((i) => i.category_id === activeCategoryId);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24 }}>โต๊ะ {tableNumber}</h1>
        <button className="btn-secondary" onClick={handleOpenBill}>
          เรียกเก็บเงิน
        </button>
      </div>

      {justSent && (
        <div className="card" style={{ background: '#e9f7ec', borderColor: '#4caf50' }}>
          ส่งออเดอร์แล้ว ✓ สั่งเพิ่มได้เลย
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12 }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className={cat.id === activeCategoryId ? 'btn-primary' : 'btn-secondary'}
            style={{ whiteSpace: 'nowrap' }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div>
        {activeItems.map((item) => (
          <MenuItemRow key={item.id} item={item} onAdd={addToCart} />
        ))}
      </div>

      {cartCount > 0 && (
        <div
          className="card"
          style={{
            position: 'sticky',
            bottom: 12,
            border: '2px solid #6f4e37',
          }}
        >
          <div style={{ marginBottom: 10 }}>
            {cart.map((c) => (
              <div
                key={c.name}
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
              >
                <span>
                  {c.name} x{c.quantity}
                </span>
                <span>
                  {c.price * c.quantity} บาท{' '}
                  <button
                    onClick={() => removeFromCart(c.name)}
                    style={{ border: 'none', background: 'none', color: '#d9534f' }}
                  >
                    ลบ
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>รวม {cartCount} รายการ</span>
            <span>{cartTotal} บาท</span>
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 10 }}
            onClick={handleSendOrder}
            disabled={sending}
          >
            {sending ? 'กำลังส่ง...' : 'ส่งออเดอร์'}
          </button>
        </div>
      )}

      {showBillConfirm && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>ยืนยันเรียกเก็บเงิน</h3>
            <p style={{ fontSize: 22, fontWeight: 700 }}>ยอดรวม {billTotal} บาท</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowBillConfirm(false)}
              >
                ยกเลิก
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleConfirmBill}
                disabled={closingBill}
              >
                {closingBill ? 'กำลังปิด...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemRow({ item, onAdd }) {
  const [qty, setQty] = useState(1);
  return (
    <div
      className="card"
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 17 }}>{item.name}</div>
        <div style={{ color: '#7a6a5a' }}>{item.price} บาท</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select value={qty} onChange={(e) => setQty(parseInt(e.target.value, 10))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button className="btn-secondary" onClick={() => onAdd(item, qty)}>
          +
        </button>
      </div>
    </div>
  );
}
