import type { Metadata } from 'next'
import './globals.css'
import MiniKitProvider from '@/components/minikit-provider'

export const metadata: Metadata = {
  title: 'HumaniTree - Plant Trees with World ID',
  description: 'Verify your humanity and plant trees to fight climate change. Every verified human can plant one tree per day!',
  generator: 'v0.dev',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  themeColor: '#16a34a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HumaniTree',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'HumaniTree',
    'application-name': 'HumaniTree',
    'msapplication-TileColor': '#16a34a',
    'msapplication-tap-highlight': 'no',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HumaniTree" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="HumaniTree" />
        <meta name="msapplication-TileColor" content="#16a34a" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        <meta name="referrer" content="no-referrer-when-downgrade" />
        
        <meta name="world-app-mini-app" content="true" />
        <meta name="world-app-embedded" content="true" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Detect if we're running in World App
              (function() {
                const isInWorldApp = window.location.href.includes('worldapp') || 
                                   window.location.href.includes('world.co') ||
                                   navigator.userAgent.includes('WorldApp') ||
                                   window.parent !== window ||
                                   document.referrer.includes('worldapp');
                
                if (isInWorldApp) {
                  console.log('Running in World App Mini App environment');
                  // Prevent external redirects
                  window.addEventListener('beforeunload', function(e) {
                    if (!window.location.href.includes('worldapp') && 
                        !window.location.href.includes('world.co')) {
                      e.preventDefault();
                      e.returnValue = '';
                    }
                  });
                } else {
                  console.log('Running in external browser - should be opened in World App');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <MiniKitProvider>
          {children}
        </MiniKitProvider>
      </body>
    </html>
  );
}
