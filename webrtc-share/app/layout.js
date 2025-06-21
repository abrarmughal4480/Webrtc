import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import { UserProvider } from "@/provider/UserProvider";
import DialogProvider from "@/provider/DilogsProvider";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Videodesk.co.uk",
  description: "Connect , engage and support your customers with an instant video link",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider>
          <DialogProvider>
            {children}
            <Toaster className="bg-white" />
          </DialogProvider>
        </UserProvider>
      </body>
    </html>
  );
}
