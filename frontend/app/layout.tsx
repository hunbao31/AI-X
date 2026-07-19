import './globals.css';

export const metadata = {
  title: 'Math Learning Platform',
  description: 'AI-powered mathematics learning platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
