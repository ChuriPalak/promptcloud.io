import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptCloud - Proxmox Cloud Marketplace",
  description: "Book Proxmox instances, deploy VMs and LXC containers, manage your wallet, and receive OTP via Telegram.",
  keywords: "proxmox, cloud marketplace, vm booking, lxc containers, telegram otp, cloud wallet, instance deployment",
  openGraph: {
    title: "PromptCloud - Proxmox Cloud Marketplace",
    description: "Book cloud instances, deploy infrastructure, pay via wallet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ width: '100%', minWidth: '100vw', minHeight: '100vh', margin: 0, padding: 0 }}>
      <body
        className="antialiased"
        style={{ width: '100%', minWidth: '100vw', minHeight: '100vh', margin: 0, padding: 0, background: '#0a0a0f', color: '#e0e0ff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
