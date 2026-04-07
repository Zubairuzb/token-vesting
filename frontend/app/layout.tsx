import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Token Vesting Protocol",
  description: "A decentralized token vesting protocol built on Ethereum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Providers wraps everything so wallet state is
            available on every page of the app */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}