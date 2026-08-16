import type { Metadata, Viewport } from "next";
import { Great_Vibes, Poppins } from "next/font/google";
import "./globals.css";
import BottomNav from "@/app/components/layout/BottomNav";
import Header from "@/app/components/layout/Header";
import PendingUploads from "@/app/components/upload/PendingUploads";
import UploadAccessGate from "@/app/components/upload/UploadAccessGate";
import UploadQueueProvider from "@/app/components/upload/UploadQueueProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Wesele Ani i Oskara",
  description: "Podziel się zdjęciami i filmami z naszego wesela",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${poppins.variable} ${greatVibes.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <UploadQueueProvider>
          <UploadAccessGate />
          <Header />
          <div className="flex-1 w-full max-w-2xl mx-auto px-4 pb-28">
            {children}
          </div>
          <PendingUploads />
          <BottomNav />
        </UploadQueueProvider>
      </body>
    </html>
  );
}
