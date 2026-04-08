"use client";

import { useState } from "react";
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI, TOKEN_ADDRESS, ERC20_ABI } from "@/constants/contract";

export default function OwnerDashboard() {
    const { address, isConnected } = useAccount();

    // Form state — controlled inputs for the create schedule form
    const [beneficiary, setBeneficiary] = useState("");
    const [amount, setAmount] = useState("");
    const [cliffDays, setCliffDays] = useState("");
    const [vestingDays, setVestingDays] = useState("");

    // Revoke form state
    const [revokeBeneficiary, setRevokeBeneficiary] = useState("");

    const [step, setStep] = useState<"approve" | "create">("approve");

    // Read owner's token balance
    const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
        // query.enabled prevents the hook from running when
        // wallet is not connected — avoids unnecessary errors
        query: { enabled: !!address },
    });

    // Read how many tokens the owner has approved for the
    // vesting contract to spend. 
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address as `0x${string}`, CONTRACT_ADDRESS],
        query: { enabled: !!address },
    });


    const {
        writeContract,
        data: txHash,
        isPending: isWritePending,
        error: writeError,
    } = useWriteContract();

    // useWaitForTransactionReceipt watches a transaction hash
    // and tells us when it has been mined and confirmed.
    // This is how we know when to move from approve to create
    const { isLoading: isTxLoading, isSuccess: isTxSuccess } =
        useWaitForTransactionReceipt({ hash: txHash });

    // ============================================================
    //                      HANDLERS
    // ============================================================

    const handleApprove = () => {
        if (!amount) return;

        // Convert amount to token units with 18 decimals
        const amountInUnits = parseUnits(amount, 18);

        writeContract({
            address: TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CONTRACT_ADDRESS, amountInUnits],
        });

        // Move to create step after approval
        setStep("create");
    };

    const handleCreateSchedule = () => {
        if (!beneficiary || !amount || !cliffDays || !vestingDays) return;

        const amountInUnits = parseUnits(amount, 18);

        // Convert days to seconds — smart contract uses seconds.
        // 86400 = number of seconds in one day
        const cliffSeconds = BigInt(Number(cliffDays) * 86400);
        const vestingSeconds = BigInt(Number(vestingDays) * 86400);

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "createVestingSchedule",
            args: [
                TOKEN_ADDRESS,
                beneficiary as `0x${string}`,
                // Contract expects uint128 — we cast using BigInt
                BigInt(amountInUnits),
                // Contract expects uint64 for durations
                cliffSeconds,
                vestingSeconds,
            ],
        });
    };

    const handleRevoke = () => {
        if (!revokeBeneficiary) return;

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "revoke",
            args: [TOKEN_ADDRESS, revokeBeneficiary as `0x${string}`],
        });
    };


    // Format balance for display — convert from 18 decimals to
    // a readable number with 2 decimal places
    const formattedBalance = tokenBalance
        ? Number(formatUnits(tokenBalance as bigint, 18)).toFixed(2)
        : "0.00";

    // ============================================================
    //                         UI
    // ============================================================

    // Show message if wallet not connected
    if (!isConnected) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-10">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                    <p className="text-gray-400 text-lg">
                        Connect your wallet to access the Owner Dashboard
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold text-white mb-2">Owner Dashboard</h1>
            <p className="text-gray-400 mb-8">
                Create and manage token vesting schedules
            </p>

            {/* Token Balance Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
                <p className="text-gray-400 text-sm mb-1">Your VTT Token Balance</p>
                <p className="text-white text-3xl font-bold">
                    {formattedBalance}
                    <span className="text-gray-400 text-lg font-normal ml-2">VTT</span>
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Create Vesting Schedule Form */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h2 className="text-white text-xl font-semibold mb-6">
                        Create Vesting Schedule
                    </h2>

                    {/* Step indicator — shows which transaction step we are on */}
                    <div className="flex gap-3 mb-6">
                        <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${step === "approve"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400"
                            }`}>
                            <span>1</span>
                            <span>Approve Tokens</span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${step === "create"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-400"
                            }`}>
                            <span>2</span>
                            <span>Create Schedule</span>
                        </div>
                    </div>

                    <div className="space-y-4">

                        {/* Beneficiary Address Input */}
                        <div>
                            <label className="text-gray-400 text-sm block mb-1">
                                Beneficiary Address
                            </label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={beneficiary}
                                onChange={(e) => setBeneficiary(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                            />
                        </div>

                        {/* Token Amount Input */}
                        <div>
                            <label className="text-gray-400 text-sm block mb-1">
                                Amount (VTT)
                            </label>
                            <input
                                type="number"
                                placeholder="1000"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                            />
                        </div>

                        {/* Cliff Duration Input */}
                        <div>
                            <label className="text-gray-400 text-sm block mb-1">
                                Cliff Period (days)
                            </label>
                            <input
                                type="number"
                                placeholder="90"
                                value={cliffDays}
                                onChange={(e) => setCliffDays(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                            />
                        </div>

                        {/* Vesting Duration Input */}
                        <div>
                            <label className="text-gray-400 text-sm block mb-1">
                                Vesting Duration (days)
                            </label>
                            <input
                                type="number"
                                placeholder="365"
                                value={vestingDays}
                                onChange={(e) => setVestingDays(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                            />
                        </div>

                        {/* Step 1 — Approve Button */}
                        {step === "approve" && (
                            <button
                                onClick={handleApprove}
                                disabled={isWritePending || isTxLoading || !amount}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                            >
                                {isWritePending || isTxLoading
                                    ? "Approving..."
                                    : "Step 1: Approve Tokens"}
                            </button>
                        )}

                        {/* Step 2 — Create Schedule Button */}
                        {step === "create" && (
                            <button
                                onClick={handleCreateSchedule}
                                disabled={isWritePending || isTxLoading}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                            >
                                {isWritePending || isTxLoading
                                    ? "Creating..."
                                    : "Step 2: Create Schedule"}
                            </button>
                        )}

                        {/* Reset step button */}
                        {step === "create" && (
                            <button
                                onClick={() => setStep("approve")}
                                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 rounded-lg text-sm transition-colors"
                            >
                                ← Start Over
                            </button>
                        )}

                        {/* Transaction status messages */}
                        {isTxLoading && (
                            <p className="text-yellow-400 text-sm text-center">
                                ⏳ Waiting for transaction confirmation...
                            </p>
                        )}
                        {isTxSuccess && (
                            <p className="text-green-400 text-sm text-center">
                                ✅ Transaction confirmed successfully
                            </p>
                        )}
                        {writeError && (
                            <p className="text-red-400 text-sm text-center">
                                ❌ {writeError.message.slice(0, 100)}
                            </p>
                        )}

                    </div>
                </div>

                {/* Revoke Schedule Form */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h2 className="text-white text-xl font-semibold mb-6">
                        Revoke Vesting Schedule
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">
                        Cancels a vesting schedule. Vested tokens stay with the
                        beneficiary. Unvested tokens return to you.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-sm block mb-1">
                                Beneficiary Address
                            </label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={revokeBeneficiary}
                                onChange={(e) => setRevokeBeneficiary(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                            />
                        </div>

                        <button
                            onClick={handleRevoke}
                            disabled={isWritePending || isTxLoading || !revokeBeneficiary}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                        >
                            {isWritePending || isTxLoading
                                ? "Revoking..."
                                : "Revoke Schedule"}
                        </button>
                    </div>

                    {/* Info box */}
                    <div className="mt-6 bg-gray-800 rounded-lg p-4">
                        <p className="text-gray-400 text-xs leading-relaxed">
                            ⚠️ This action cannot be undone. Make sure you have the
                            correct beneficiary address before revoking.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}