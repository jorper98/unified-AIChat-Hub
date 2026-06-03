import './globals.css';

export const metadata = { title: 'Unified Multimodal Sandbox' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-900 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}