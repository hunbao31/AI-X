import './globals.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/lib/theme';

export const metadata = {
  title: 'EduAI — AI Learning Platform',
  description:
    'AI-powered all-in-one learning platform: classes, quizzes, mastery tracking, and gamified practice.',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
