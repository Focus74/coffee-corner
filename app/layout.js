import './globals.css';

export const metadata = {
  title: 'คาเฟ่ ชิลชิล',
  description: 'ระบบสั่งเครื่องดื่มด้วย QR Code',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
