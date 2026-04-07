"use client";

import dynamic from "next/dynamic";
import Navbar from "./Navbar";

const Providers = dynamic(() => import("./Providers"), {
    ssr: false,
    loading: () => null,
});

export default function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Providers>
            <Navbar />
            <main className="min-h-screen bg-gray-950 text-white">
                {children}
            </main>
        </Providers>
    );
}