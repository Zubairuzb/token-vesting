import Link from "next/link";

// This is a server component — no "use client" needed.
// Server components render on the server and send
// pure HTML to the browser — faster initial load.
// Since this page has no wallet interaction or state,
// it does not need to be a client component
export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-20">

      {/* Hero section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-6">
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Token Vesting Protocol
          </span>
        </h1>

        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10">
          A decentralized protocol for managing token vesting schedules
          on Ethereum. Lock tokens for your team and release them
          gradually over time.
        </p>

        {/* CTA buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/owner"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Owner Dashboard
          </Link>
          <Link
            href="/beneficiary"
            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-medium transition-colors border border-gray-700"
          >
            Beneficiary Dashboard
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* md:grid-cols-3 means 3 columns on medium screens and above.
            On mobile (default) it stacks to 1 column.
            This is responsive design using Tailwind breakpoints */}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-blue-400 text-2xl mb-3">🔒</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            Token Locking
          </h3>
          <p className="text-gray-400 text-sm">
            Lock ERC20 tokens for beneficiaries with customizable
            cliff and vesting periods.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-purple-400 text-2xl mb-3">📈</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            Linear Vesting
          </h3>
          <p className="text-gray-400 text-sm">
            Tokens unlock gradually and linearly over time.
            Beneficiaries can claim at any point after the cliff.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="text-green-400 text-2xl mb-3">⚡</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            Gas Optimized
          </h3>
          <p className="text-gray-400 text-sm">
            Struct packing and custom errors minimize gas costs
            on every interaction with the protocol.
          </p>
        </div>

      </div>
    </div>
  );
}