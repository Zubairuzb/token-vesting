import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

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
      <body suppressHydrationWarning={true}>
        {/* ClientLayout handles all browser-only dependencies
            keeping this server component clean */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}