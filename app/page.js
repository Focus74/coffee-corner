import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container" style={{ textAlign: 'center', paddingTop: 60 }}>
      <h1 style={{ fontSize: 40 }}>☕ คาเฟ่ ชิลชิล</h1>
      <p style={{ fontSize: 18, color: '#7a6a5a' }}>
        ระบบสั่งเครื่องดื่มด้วย QR Code
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 40 }}>
        <Link href="/generate-qr" className="btn-primary" style={{ textDecoration: 'none' }}>
          สร้าง QR เปิดโต๊ะ (พนักงาน)
        </Link>
        <Link href="/kitchen" className="btn-secondary" style={{ textDecoration: 'none' }}>
          จอบาริสต้า (หลังร้าน)
        </Link>
        <Link href="/menu" className="btn-secondary" style={{ textDecoration: 'none' }}>
          จัดการเมนู (พนักงาน)
        </Link>
      </div>
    </div>
  );
}
