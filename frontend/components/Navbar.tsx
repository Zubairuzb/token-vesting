"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export default function Navbar() {
    // useAccount gives us the connected wallet address
    // and connection status
    const { address, isConnected } = useAccount();

    // useConnect gives us the connect function
    // we pass it the connector to use — injected() = MetaMask
    const { connect } = useConnect();

    // useDisconnect gives us the disconnect function
    const { disconnect } = useDisconnect();

    return (
        <nav className="border-b border-gray-800 bg-gray-950 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">

                <Link href="/" className="text-white font-bold text-xl tracking-tight">
                    <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Token Vesting
                    </span>
                    <span className="text-gray-400 text-sm font-normal ml-2">
                        Protocol
                    </span>
                </Link>

                <div className="flex items-center gap-6">
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

                    {/* Show wallet address if connected, connect button if not */}
                    {isConnected ? (
                        <div className="flex items-center gap-3">
                            {/* Truncate address for display — show first 6
                  and last 4 characters with ... in between.
                  Full address is too long for a navbar */}
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
                            onClick={() => connect({ connector: injected() })}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}