'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function MenuManagePage() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);

  const [newCategoryName, setNewCategoryName] = useState('');

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState('');

  const [editingItemId, setEditingItemId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  async function loadAll() {
    const { data: cats } = await supabase
      .from('menu_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('*')
      .order('name', { ascending: true });
    setCategories(cats || []);
    setItems(menuItems || []);
    if ((cats || []).length > 0 && !newItemCategoryId) {
      setNewItemCategoryId(String(cats[0].id));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const sortOrder = categories.length + 1;
    const { error } = await supabase
      .from('menu_categories')
      .insert({ name: newCategoryName.trim(), sort_order: sortOrder });
    if (error) {
      alert('เพิ่มหมวดหมู่ไม่สำเร็จ: ' + error.message);
      return;
    }
    setNewCategoryName('');
    loadAll();
  }

  async function deleteCategory(id) {
    const hasItems = items.some((i) => i.category_id === id);
    if (hasItems) {
      alert('ลบไม่ได้ เพราะยังมีเมนูอยู่ในหมวดนี้ กรุณาลบเมนูในหมวดนี้ก่อน');
      return;
    }
    if (!confirm('ยืนยันลบหมวดหมู่นี้?')) return;
    await supabase.from('menu_categories').delete().eq('id', id);
    loadAll();
  }

  async function addItem() {
    const priceNum = parseFloat(newItemPrice);
    if (!newItemName.trim() || !newItemCategoryId || isNaN(priceNum) || priceNum < 0) {
      alert('กรุณากรอกชื่อเมนู ราคา และเลือกหมวดหมู่ให้ครบ');
      return;
    }
    const { error } = await supabase.from('menu_items').insert({
      name: newItemName.trim(),
      price: priceNum,
      category_id: parseInt(newItemCategoryId, 10),
    });
    if (error) {
      alert('เพิ่มเมนูไม่สำเร็จ: ' + error.message);
      return;
    }
    setNewItemName('');
    setNewItemPrice('');
    loadAll();
  }

  function startEdit(item) {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
  }

  async function saveEdit(id) {
    const priceNum = parseFloat(editPrice);
    if (!editName.trim() || isNaN(priceNum) || priceNum < 0) {
      alert('กรุณากรอกชื่อและราคาให้ถูกต้อง');
      return;
    }
    await supabase
      .from('menu_items')
      .update({ name: editName.trim(), price: priceNum })
      .eq('id', id);
    setEditingItemId(null);
    loadAll();
  }

  async function deleteItem(id) {
    if (!confirm('ยืนยันลบเมนูนี้?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    loadAll();
  }

  return (
    <div className="container">
      <h1>จัดการเมนู</h1>

      <div className="card">
        <h3>เพิ่มหมวดหมู่ใหม่</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input-field"
            style={{ marginBottom: 0 }}
            placeholder="ชื่อหมวดหมู่ เช่น กาแฟร้อน"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button className="btn-primary" onClick={addCategory}>
            เพิ่ม
          </button>
        </div>
      </div>

      <div className="card">
        <h3>เพิ่มเมนูใหม่</h3>
        <select
          className="input-field"
          value={newItemCategoryId}
          onChange={(e) => setNewItemCategoryId(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <input
          className="input-field"
          placeholder="ชื่อเมนู เช่น ลาเต้เย็น"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
        />
        <input
          className="input-field"
          type="number"
          placeholder="ราคา (บาท)"
          value={newItemPrice}
          onChange={(e) => setNewItemPrice(e.target.value)}
        />
        <button className="btn-primary" style={{ width: '100%' }} onClick={addItem}>
          เพิ่มเมนู
        </button>
      </div>

      {categories.map((cat) => (
        <div className="card" key={cat.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{cat.name}</h3>
            <button className="btn-danger" onClick={() => deleteCategory(cat.id)}>
              ลบหมวดหมู่
            </button>
          </div>

          {items
            .filter((i) => i.category_id === cat.id)
            .map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #eee',
                  padding: '10px 0',
                }}
              >
                {editingItemId === item.id ? (
                  <>
                    <input
                      className="input-field"
                      style={{ marginBottom: 0, marginRight: 8 }}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <input
                      className="input-field"
                      style={{ marginBottom: 0, marginRight: 8, width: 90 }}
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                    />
                    <button className="btn-primary" onClick={() => saveEdit(item.id)}>
                      บันทึก
                    </button>
                  </>
                ) : (
                  <>
                    <span>{item.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {item.price} บาท
                      <button className="btn-secondary" onClick={() => startEdit(item)}>
                        แก้ไข
                      </button>
                      <button className="btn-danger" onClick={() => deleteItem(item.id)}>
                        ลบ
                      </button>
                    </span>
                  </>
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
