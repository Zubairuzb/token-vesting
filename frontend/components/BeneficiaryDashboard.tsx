"use client";

import { useState } from "react";
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import {
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    TOKEN_ADDRESS,
} from "@/constants/contract";

// Helper function to format seconds into a readable duration.
// Smart contract stores time in seconds — we convert to
// days/months for human readable display
function formatDuration(seconds: bigint): string {
    const days = Number(seconds) / 86400;
    if (days >= 365) {
        return `${(days / 365).toFixed(1)} years`;
    }
    if (days >= 30) {
        return `${(days / 30).toFixed(1)} months`;
    }
    return `${days.toFixed(0)} days`;
}

// Helper to format a Unix timestamp into a readable date string.
// Contract stores startTime as a Unix timestamp in seconds.
// JavaScript Date expects milliseconds so we multiply by 1000
function formatDate(timestamp: bigint): string {
    return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export default function BeneficiaryDashboard() {
    const { address, isConnected } = useAccount();

    // Allow beneficiary to check any address — not just their own.
    // This is useful for checking a schedule before connecting
    const [checkAddress, setCheckAddress] = useState("");

    // The address we actually query — defaults to connected wallet
    // but can be overridden by the input above
    const queryAddress = checkAddress || address;

    // ============================================================
    //                     READ CONTRACT DATA
    // ============================================================

    // Fetch the full vesting schedule for the query address
    const {
        data: schedule,
        isLoading: isScheduleLoading,
        refetch: refetchSchedule,
    } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getVestingSchedule",
        args: [TOKEN_ADDRESS, queryAddress as `0x${string}`],
        query: { enabled: !!queryAddress },
    });

    // Fetch how many tokens are claimable right now
    const {
        data: claimableAmount,
        isLoading: isClaimableLoading,
        refetch: refetchClaimable,
    } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "getClaimableAmount",
        args: [TOKEN_ADDRESS, queryAddress as `0x${string}`],
        query: { enabled: !!queryAddress },
    });

    // ============================================================
    //                    WRITE CONTRACT DATA
    // ============================================================

    const {
        writeContract,
        data: txHash,
        isPending: isWritePending,
        error: writeError,
    } = useWriteContract();

    const { isLoading: isTxLoading, isSuccess: isTxSuccess } =
        useWaitForTransactionReceipt({
            hash: txHash,
            // Refetch data after transaction confirms so UI updates
            // automatically without user needing to refresh
        });

    const handleClaim = () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: "claim",
            args: [TOKEN_ADDRESS],
        });
    };

    // Refetch all data after successful claim
    if (isTxSuccess) {
        refetchSchedule();
        refetchClaimable();
    }

    // ============================================================
    //                    COMPUTED VALUES
    // ============================================================

    // Cast schedule to the correct type so TypeScript is happy.
    // The schedule comes back as unknown from wagmi so we tell
    // TypeScript what shape to expect
    const vestingSchedule = schedule as {
        totalAmount: bigint;
        claimedAmount: bigint;
        startTime: bigint;
        cliffDuration: bigint;
        vestingDuration: bigint;
        revoked: boolean;
    } | undefined;

    // Check if a valid schedule exists — startTime of 0 means
    // no schedule has been created for this address
    const hasSchedule =
        vestingSchedule && vestingSchedule.startTime > BigInt(0);

    // Calculate vesting progress percentage for the progress bar.
    // progress = claimedAmount / totalAmount × 100
    const progressPercentage =
        hasSchedule && vestingSchedule.totalAmount > BigInt(0)
            ? Number(
                (vestingSchedule.claimedAmount * BigInt(100)) /
                vestingSchedule.totalAmount
            )
            : 0;

    // Calculate what percentage has vested so far (including unclaimed)
    const vestedPercentage = hasSchedule
        ? Math.min(
            100,
            Math.floor(
                ((Date.now() / 1000 - Number(vestingSchedule.startTime)) /
                    Number(vestingSchedule.vestingDuration)) *
                100
            )
        )
        : 0;

    // Format token amounts for display
    const formattedTotal = hasSchedule
        ? Number(formatUnits(vestingSchedule.totalAmount, 18)).toFixed(2)
        : "0.00";

    const formattedClaimed = hasSchedule
        ? Number(formatUnits(vestingSchedule.claimedAmount, 18)).toFixed(2)
        : "0.00";

    const formattedClaimable = claimableAmount
        ? Number(formatUnits(claimableAmount as bigint, 18)).toFixed(2)
        : "0.00";

    // Calculate cliff end date for display
    const cliffEndDate =
        hasSchedule
            ? formatDate(
                vestingSchedule.startTime + vestingSchedule.cliffDuration
            )
            : null;

    // Calculate vesting end date for display
    const vestingEndDate =
        hasSchedule
            ? formatDate(
                vestingSchedule.startTime + vestingSchedule.vestingDuration
            )
            : null;

    // ============================================================
    //                          UI
    // ============================================================

    if (!isConnected) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-10">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                    <p className="text-gray-400 text-lg">
                        Connect your wallet to view your vesting schedule
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <h1 className="text-3xl font-bold text-white mb-2">
                Beneficiary Dashboard
            </h1>
            <p className="text-gray-400 mb-8">
                View and claim your vested tokens
            </p>

            {/* Address checker — lets you look up any address */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
                <label className="text-gray-400 text-sm block mb-2">
                    Check Vesting Schedule For Address
                </label>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder={address || "0x..."}
                        value={checkAddress}
                        onChange={(e) => setCheckAddress(e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                    <button
                        onClick={() => setCheckAddress("")}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-3 rounded-lg text-sm transition-colors border border-gray-700"
                    >
                        Reset
                    </button>
                </div>
                <p className="text-gray-600 text-xs mt-2">
                    Leave empty to check your connected wallet
                </p>
            </div>

            {/* Loading state */}
            {isScheduleLoading && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                    <p className="text-gray-400">Loading vesting schedule...</p>
                </div>
            )}

            {/* No schedule found */}
            {!isScheduleLoading && !hasSchedule && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                    <p className="text-gray-400 text-lg mb-2">
                        No vesting schedule found
                    </p>
                    <p className="text-gray-600 text-sm">
                        No vesting schedule exists for this address
                    </p>
                </div>
            )}

            {/* Schedule found — show all details */}
            {hasSchedule && (
                <div className="space-y-6">

                    {/* Revoked warning banner */}
                    {vestingSchedule.revoked && (
                        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
                            <p className="text-red-400 font-medium">
                                ⚠️ This vesting schedule has been revoked
                            </p>
                            <p className="text-red-500 text-sm mt-1">
                                No more tokens can be claimed from this schedule
                            </p>
                        </div>
                    )}

                    {/* Top stats row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <p className="text-gray-400 text-sm mb-1">Total Allocation</p>
                            <p className="text-white text-2xl font-bold">
                                {formattedTotal}
                                <span className="text-gray-400 text-sm font-normal ml-1">
                                    VTT
                                </span>
                            </p>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <p className="text-gray-400 text-sm mb-1">Already Claimed</p>
                            <p className="text-white text-2xl font-bold">
                                {formattedClaimed}
                                <span className="text-gray-400 text-sm font-normal ml-1">
                                    VTT
                                </span>
                            </p>
                        </div>

                        {/* Claimable now — highlighted in green */}
                        <div className="bg-gray-900 border border-green-800 rounded-xl p-6">
                            <p className="text-gray-400 text-sm mb-1">Claimable Now</p>
                            <p className="text-green-400 text-2xl font-bold">
                                {formattedClaimable}
                                <span className="text-gray-400 text-sm font-normal ml-1">
                                    VTT
                                </span>
                            </p>
                        </div>

                    </div>

                    {/* Vesting Progress */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4">
                            Vesting Progress
                        </h2>

                        {/* Progress bar showing claimed vs total */}
                        <div className="mb-2 flex justify-between text-sm">
                            <span className="text-gray-400">Claimed</span>
                            <span className="text-gray-400">{progressPercentage}%</span>
                        </div>

                        {/* Outer bar is total. Inner blue bar is claimed.
                Green section shows vested but unclaimed portion */}
                        <div className="w-full bg-gray-800 rounded-full h-4 mb-4 overflow-hidden">
                            {/* Vested portion (green background) */}
                            <div
                                className="h-4 rounded-full bg-green-800 relative"
                                style={{ width: `${vestedPercentage}%` }}
                            >
                                {/* Claimed portion (blue foreground) */}
                                <div
                                    className="h-4 rounded-full bg-blue-600 absolute top-0 left-0"
                                    style={{
                                        width: `${vestedPercentage > 0
                                                ? (progressPercentage / vestedPercentage) * 100
                                                : 0
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex gap-6 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-blue-600 rounded-full inline-block" />
                                Claimed ({progressPercentage}%)
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-green-800 rounded-full inline-block" />
                                Vested ({vestedPercentage}%)
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 bg-gray-800 rounded-full inline-block" />
                                Locked ({100 - vestedPercentage}%)
                            </span>
                        </div>
                    </div>

                    {/* Schedule Details */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                        <h2 className="text-white font-semibold mb-4">
                            Schedule Details
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-800 rounded-lg p-4">
                                <p className="text-gray-500 text-xs mb-1">Start Date</p>
                                <p className="text-white text-sm">
                                    {formatDate(vestingSchedule.startTime)}
                                </p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <p className="text-gray-500 text-xs mb-1">Cliff Ends</p>
                                <p className="text-white text-sm">{cliffEndDate}</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <p className="text-gray-500 text-xs mb-1">Vesting Duration</p>
                                <p className="text-white text-sm">
                                    {formatDuration(vestingSchedule.vestingDuration)}
                                </p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <p className="text-gray-500 text-xs mb-1">Fully Vested On</p>
                                <p className="text-white text-sm">{vestingEndDate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Claim Button */}
                    {!vestingSchedule.revoked && (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                            <h2 className="text-white font-semibold mb-2">Claim Tokens</h2>
                            <p className="text-gray-400 text-sm mb-4">
                                Claim your currently vested tokens. You can claim
                                multiple times — the contract tracks what you have
                                already received.
                            </p>

                            <button
                                onClick={handleClaim}
                                disabled={
                                    isWritePending ||
                                    isTxLoading ||
                                    !claimableAmount ||
                                    claimableAmount === BigInt(0)
                                }
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                            >
                                {isWritePending || isTxLoading
                                    ? "Claiming..."
                                    : `Claim ${formattedClaimable} VTT`}
                            </button>

                            {/* Transaction feedback */}
                            {isTxLoading && (
                                <p className="text-yellow-400 text-sm text-center mt-3">
                                    ⏳ Waiting for confirmation...
                                </p>
                            )}
                            {isTxSuccess && (
                                <p className="text-green-400 text-sm text-center mt-3">
                                    ✅ Tokens claimed successfully
                                </p>
                            )}
                            {writeError && (
                                <p className="text-red-400 text-sm text-center mt-3">
                                    ❌ {writeError.message.slice(0, 100)}
                                </p>
                            )}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}