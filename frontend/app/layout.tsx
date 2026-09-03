import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#2e7d32",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "AI Irrigation Management System",
  description: "Predictive water scheduling and crop optimization system using AI, weather telemetry, and regional voice controls.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kisan AI",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
  }
};

import Navbar from "@/components/Navbar";
import Header from "@/components/Header";
import VoiceAssistant from "@/components/VoiceAssistant";
import InstallPrompt from "@/components/InstallPrompt";
import NetworkStatus from "@/components/NetworkStatus";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LanguageProvider>
            <div className="flex flex-col md:flex-row min-h-screen bg-neutral-950 text-neutral-100 pb-[env(safe-area-inset-bottom)]">
              <Navbar />
              <main className="flex-1 flex flex-col min-h-screen overflow-y-auto pb-16 md:pb-0">
                <NetworkStatus />
                <Header />
                <div className="flex-1">
                  {children}
                </div>
              </main>
              <VoiceAssistant />
              <InstallPrompt />
            </div>
          </LanguageProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                // Register listener for real-time messages from SW
                navigator.serviceWorker.addEventListener('message', function(event) {
                  if (event.data && event.data.type === 'notification-received') {
                    window.dispatchEvent(new CustomEvent('notification-received', { detail: event.data.payload }));
                  }
                });

                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('ServiceWorker registered:', reg.scope);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
