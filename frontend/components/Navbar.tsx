"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";

export default function Navbar() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();

    // Mobile menu open/close state
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className="border-b border-gray-800 bg-gray-950 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">

                {/* Logo */}
                <Link href="/" className="text-white font-bold text-xl tracking-tight">
                    <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Token Vesting
                    </span>
                    <span className="text-gray-400 text-sm font-normal ml-2 hidden sm:inline">
                        Protocol
                    </span>
                </Link>

                {/* Desktop nav — hidden on mobile */}
                <div className="hidden md:flex items-center gap-6">
                    <Link
                        href="/owner"
                        className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        Owner
                    </Link>
                    <Link
                        href="/beneficiary"
                        className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        Beneficiary
                    </Link>

                    {isConnected ? (
                        <div className="flex items-center gap-3">
                            <span className="text-gray-300 text-sm bg-gray-800 px-3 py-2 rounded-lg">
                                {address?.slice(0, 6)}...{address?.slice(-4)}
                            </span>
                            <button
                                onClick={() => disconnect()}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                // Check if window.ethereum exists — means MetaMask is installed.
                                // If yes use injected connector (desktop MetaMask).
                                // If no use WalletConnect (mobile wallets, QR code)
                                if (typeof window !== "undefined" && window.ethereum) {
                                    connect({ connector: injected() });
                                } else {
                                    connect({
                                        connector: walletConnect({
                                            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
                                        }),
                                    });
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Connect Wallet
                        </button>
                    )}
                </div>

                {/* Mobile hamburger button — visible only on mobile */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="md:hidden text-gray-400 hover:text-white p-2"
                >
                    {/* Show X when open, hamburger when closed */}
                    {menuOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile menu — slides down when hamburger is clicked.
          Only visible on mobile when menuOpen is true */}
            {menuOpen && (
                <div className="md:hidden mt-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
                    <Link
                        href="/owner"
                        onClick={() => setMenuOpen(false)}
                        className="block text-gray-400 hover:text-white transition-colors text-sm font-medium py-2"
                    >
                        Owner Dashboard
                    </Link>
                    <Link
                        href="/beneficiary"
                        onClick={() => setMenuOpen(false)}
                        className="block text-gray-400 hover:text-white transition-colors text-sm font-medium py-2"
                    >
                        Beneficiary Dashboard
                    </Link>

                    <div className="pt-2">

                        {isConnected ? (
                            <div className="flex items-center gap-3">
                                <span className="text-gray-300 text-sm bg-gray-800 px-3 py-2 rounded-lg">
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </span>
                                <button
                                    onClick={() => disconnect()}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    if (typeof window !== "undefined" && window.ethereum) {
                                        connect({ connector: injected() });
                                    } else {
                                        connect({
                                            connector: walletConnect({
                                                projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
                                            }),
                                        });
                                    }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}