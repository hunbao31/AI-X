import './globals.css';
import 'katex/dist/katex.min.css';
import { Be_Vietnam_Pro } from 'next/font/google';
import { ThemeProvider } from '@/lib/theme';
import { UserProvider } from '@/lib/user-context';

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata = {
  title: 'AI-X — Học tập chưa bao giờ thú vị như lúc này!!!',
  description:
    'Quản lý lớp, ra đề trắc nghiệm, xem học sinh học tới đâu. Giáo viên đỡ mất công soạn bài, học sinh học đỡ chán.',
};

// Applies the saved theme before first paint so light-mode users don't get
// a dark flash (and vice versa). Runs before hydration; must stay tiny.
const themeInitScript = `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={beVietnamPro.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <UserProvider>{children}</UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
