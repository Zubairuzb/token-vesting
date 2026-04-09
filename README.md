# Token Vesting Protocol

A full-stack decentralized token vesting protocol built on Ethereum. Enables organizations to lock ERC20 tokens for team members and investors with customizable cliff periods and linear vesting schedules.

🔗 **Live Demo:** https://token-vesting-mocha.vercel.app/

📄 **Contract:** https://sepolia.etherscan.io/address/0xbbfb8927ceec395cf0de1715811335998802e7ae

🪙 **Test Token:** https://sepolia.etherscan.io/address/0x8137da44326e5486e0d1cab0f794a990b470dd76

---

## Overview

Token vesting is a mechanism used by Web3 startups to lock tokens for employees, founders, and investors — releasing them gradually over time to ensure long-term commitment. This protocol implements a production-ready vesting system entirely on-chain with no trusted intermediaries.

---

## Tech Stack

**Smart Contract**
- Solidity 0.8.24
- Foundry (testing and deployment)
- OpenZeppelin (security libraries)

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- wagmi + viem (blockchain interaction)
- Tailwind CSS

---

## Features

**Smart Contract**
- Create vesting schedules for multiple beneficiaries
- Configurable cliff period — no tokens before cliff ends
- Linear vesting — tokens unlock gradually after cliff
- Owner can revoke unvested tokens fairly
- Emergency pause/unpause mechanism
- Supports multiple ERC20 tokens

**Frontend**
- Owner dashboard — create and revoke schedules
- Beneficiary dashboard — view and claim vested tokens
- Real-time vesting progress visualization
- MetaMask wallet integration
- Deployed on Sepolia testnet

---

## Architecture

token-vesting/
├── src/
│   ├── TokenVesting.sol     — main vesting contract
│   └── MockToken.sol        — ERC20 token for testing
├── test/
│   └── TokenVesting.t.sol   — 22 unit and fuzz tests
├── script/
│   ├── Deploy.s.sol         — vesting contract deployment
│   └── DeployMockToken.s.sol — token deployment
└── frontend/
├── app/                 — Next.js pages
├── components/          — React components
└── constants/           — contract ABI and addresses

---

## Security Considerations

**Reentrancy Protection**
The `claim()` function uses OpenZeppelin's `ReentrancyGuard` and follows the Checks-Effects-Interactions pattern — state updates happen before any token transfers. This prevents recursive call exploits like the 2016 DAO hack.

**Access Control**
`createVestingSchedule()`, `revoke()`, `pause()`, and `unpause()` are all protected with OpenZeppelin's `Ownable` modifier ensuring only the contract deployer can call sensitive functions.

**SafeERC20**
All token transfers use OpenZeppelin's `SafeERC20` library instead of raw `transfer()` calls. This handles non-standard tokens that do not return a bool, preventing silent failures.

**Integer Arithmetic**
The linear vesting formula multiplies before dividing to avoid precision loss from integer division. Vested amounts are capped at `totalAmount` to prevent underflow from rounding edge cases.

**Emergency Pause**
The contract inherits OpenZeppelin's `Pausable` — the owner can halt all operations instantly if a vulnerability is discovered post-deployment.

---

## Gas Optimizations

**Struct Packing**
Vesting schedule storage is carefully packed into two 32-byte slots instead of six:

```solidity
struct VestingSchedule {
    uint128 totalAmount;    // } slot 1
    uint128 claimedAmount;  // }
    uint64 startTime;       // } slot 2
    uint64 cliffDuration;   // }
    uint64 vestingDuration; // }
    bool revoked;           // }
}
```

**Custom Errors**
All revert reasons use custom errors instead of require strings. Custom errors cost significantly less gas because they do not store string data on-chain.

**Named Imports**
All OpenZeppelin imports use named imports to avoid loading unnecessary code into the compilation.

---

## Gas Report

| Function | Gas Used |
|----------|----------|
| createVestingSchedule | ~107,000 |
| claim | ~52,000 |
| revoke | ~34,000 |
| getClaimableAmount | ~0 (view) |

---

## Test Coverage

22 tests — all passing

Unit Tests
├── Deployment state verification
├── Create schedule — success and all revert cases
├── Claim — success, cliff enforcement, multiple claims
├── Revoke — success, double revoke, access control
└── Pause — create and claim blocked when paused
Fuzz Tests
├── Claimable amount never exceeds total allocation
├── Total claimed always equals total after full vesting
└── Multiple claims equal single claim regardless of frequency

Run tests:
```bash
forge test -vv
```

Run gas snapshot:
```bash
forge snapshot
```

---

## Local Development

**Prerequisites**
- Foundry
- Node.js 20+
- pnpm

**Smart Contract**
```bash
# Clone the repository
git clone https://github.com/zubairuzb/token-vesting.git
cd token-vesting

# Install dependencies
forge install

# Run tests
forge test -vv

# Deploy to Sepolia
source .env
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

**Frontend**
```bash
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:3000

---

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| TokenVesting | 0xbbfb8927ceec395cf0de1715811335998802e7ae |
| MockToken (VTT) | 0x8137da44326e5486e0d1cab0f794a990b470dd76 |

---

## How To Test The Live Demo

1. Install MetaMask and switch to Sepolia testnet
2. Get Sepolia ETH from https://sepoliafaucet.com
3. Visit the live demo link
4. Connect your wallet
5. Go to Owner Dashboard — use token address `0x8137da44326e5486e0d1cab0f794a990b470dd76`
6. Mint test tokens by calling `mint()` on the token contract via Etherscan
7. Create a vesting schedule for any address
8. Switch to Beneficiary Dashboard to view and claim

---

## Known Limitations

- Vesting schedule cannot be modified after creation
- Does not support fee-on-transfer tokens
- Single token per beneficiary per schedule
- No support for non-linear vesting curves

---

## Author

Built by Zubairu Musa  
[GitHub](https://github.com/zubairuzb) · [LinkedIn](https://linkedin.com/in/zubairu-musa-a97108160)