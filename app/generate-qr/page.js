'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function GenerateQrPage() {
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [staleSession, setStaleSession] = useState(null); // { id, created_at }
  const [showConfirm, setShowConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  const [result, setResult] = useState(null); // { tableNumber, url }
  const [copied, setCopied] = useState(false);

  function siteOrigin() {
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }

  function minutesAgo(createdAt) {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }

  async function handleOpenTable() {
    setErrorMsg('');
    const num = parseInt(tableNumber, 10);
    if (!num || num <= 0) {
      setErrorMsg('กรุณากรอกเลขโต๊ะให้ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const { data: existing, error: findError } = await supabase
        .from('sessions')
        .select('id, created_at')
        .eq('table_number', num)
        .eq('status', 'open')
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        setStaleSession(existing);
        setLoading(false);
        return;
      }

      const { data: created, error: insertError } = await supabase
        .from('sessions')
        .insert({ table_number: num, status: 'open' })
        .select()
        .single();

      if (insertError) throw insertError;

      const url = `${siteOrigin()}/order/${num}`;
      setResult({ tableNumber: num, url, sessionId: created.id });
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCloseOld() {
    if (!staleSession) return;
    setClosing(true);
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', staleSession.id)
        .eq('status', 'open');

      if (error) throw error;

      setShowConfirm(false);
      setStaleSession(null);
    } catch (err) {
      setErrorMsg('ปิดออเดอร์เดิมไม่สำเร็จ: ' + err.message);
    } finally {
      setClosing(false);
    }
  }

  function handleNewTable() {
    setTableNumber('');
    setResult(null);
    setStaleSession(null);
    setShowConfirm(false);
    setErrorMsg('');
  }

  async function handleCopyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  }

  const qrImageUrl = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(result.url)}`
    : null;

  return (
    <div className="container">
      <h1>สร้าง QR เปิดโต๊ะ</h1>

      {!result && (
        <div className="card">
          <label style={{ fontSize: 16, fontWeight: 600 }}>เลขโต๊ะ</label>
          <input
            className="input-field"
            type="number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="เช่น 7"
          />

          {errorMsg && <p style={{ color: '#d9534f' }}>{errorMsg}</p>}

          {staleSession && (
            <div className="warning-box">
              <p style={{ fontWeight: 600, margin: 0 }}>
                โต๊ะนี้มีลูกค้าอยู่ระหว่างสั่งเครื่องดื่ม กรุณาปิดออเดอร์เดิมก่อน
              </p>
              <button
                className="btn-danger"
                style={{ marginTop: 12 }}
                onClick={() => setShowConfirm(true)}
              >
                ปิดออเดอร์เดิม
              </button>
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={handleOpenTable}
            disabled={loading}
          >
            {loading ? 'กำลังเปิดโต๊ะ...' : 'เปิดโต๊ะ'}
          </button>
        </div>
      )}

      {showConfirm && staleSession && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>ยืนยันปิดออเดอร์เดิม</h3>
            <p>
              โต๊ะ {tableNumber} · เปิดมาแล้ว {minutesAgo(staleSession.created_at)} นาที
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowConfirm(false)}
              >
                ยกเลิก
              </button>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={handleConfirmCloseOld}
                disabled={closing}
              >
                {closing ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะเดิม'}
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="card" style={{ textAlign: 'center' }}>
          <img src={qrImageUrl} alt={`QR โต๊ะ ${result.tableNumber}`} width={260} height={260} />
          <p style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>
            โต๊ะ {result.tableNumber}
          </p>
          <p style={{ wordBreak: 'break-all', color: '#7a6a5a' }}>{result.url}</p>
          <button className="btn-secondary" onClick={handleCopyLink}>
            {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}
          </button>
          <div style={{ marginTop: 16 }}>
            <button className="btn-primary" onClick={handleNewTable}>
              เปิดโต๊ะใหม่
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
