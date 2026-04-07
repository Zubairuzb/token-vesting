export const CONTRACT_ADDRESS =
    "0xbbfb8927ceec395cf0de1715811335998802e7ae" as `0x${string}`;

export const TOKEN_ADDRESS = "0x8137da44326e5486e0d1cab0f794a990b470dd76" as `0x${string}`;

export const CONTRACT_ABI = [
    {
        name: "createVestingSchedule",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "token", type: "address" },
            { name: "beneficiary", type: "address" },
            { name: "totalAmount", type: "uint128" },
            { name: "cliffDuration", type: "uint64" },
            { name: "vestingDuration", type: "uint64" },
        ],
        outputs: [],
    },
    {
        name: "claim",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "token", type: "address" }],
        outputs: [],
    },
    {
        name: "revoke",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "token", type: "address" },
            { name: "beneficiary", type: "address" },
        ],
        outputs: [],
    },
    {
        name: "getVestingSchedule",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "token", type: "address" },
            { name: "beneficiary", type: "address" },
        ],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "totalAmount", type: "uint128" },
                    { name: "claimedAmount", type: "uint128" },
                    { name: "startTime", type: "uint64" },
                    { name: "cliffDuration", type: "uint64" },
                    { name: "vestingDuration", type: "uint64" },
                    { name: "revoked", type: "bool" },
                ],
            },
        ],
    },
    {
        name: "getClaimableAmount",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "token", type: "address" },
            { name: "beneficiary", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "pause",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
    },
    {
        name: "unpause",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
    },
    {
        name: "VestingScheduleCreated",
        type: "event",
        inputs: [
            { name: "token", type: "address", indexed: true },
            { name: "beneficiary", type: "address", indexed: true },
            { name: "totalAmount", type: "uint256", indexed: false },
            { name: "cliffDuration", type: "uint64", indexed: false },
            { name: "vestingDuration", type: "uint64", indexed: false },
        ],
    },
    {
        name: "TokensClaimed",
        type: "event",
        inputs: [
            { name: "token", type: "address", indexed: true },
            { name: "beneficiary", type: "address", indexed: true },
            { name: "amount", type: "uint256", indexed: false },
        ],
    },
    {
        name: "VestingScheduleRevoked",
        type: "event",
        inputs: [
            { name: "token", type: "address", indexed: true },
            { name: "beneficiary", type: "address", indexed: true },
            { name: "unvestedAmount", type: "uint256", indexed: false },
        ],
    },
] as const;