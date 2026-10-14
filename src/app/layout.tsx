import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChogSignal Arena — StockVibe × Chog × vibe/vibe',
  description: 'On-chain forensic market investigation arena powered by verified vibe/vibe curves and Monad Chog Genesis NFT authentication.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b0c10] text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
