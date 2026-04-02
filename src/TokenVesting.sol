// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title TokenVesting
/// @author Zubairu Musa
/// @notice This contract locks ERC20 tokens for beneficiaries
/// and releases them gradually over a vesting period
/// @dev Uses struct packing for gas optimization and OpenZeppelin
/// for security. Supports multiple tokens and multiple beneficiaries

contract TokenVesting is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    /// @dev Thrown when trying to create a schedule for an address
    /// that already has one for the same token
    error TokenVesting__ScheduleAlreadyExists();

    /// @dev Thrown when owner tries to deposit zero tokens
    error TokenVesting__AmountMustBeGreaterThanZero();

    /// @dev Thrown when cliff duration is longer than total vesting
    error TokenVesting__CliffLongerThanVestingDuration();

    /// @dev Thrown when beneficiary tries to claim but cliff
    /// period has not passed yet
    error TokenVesting__CliffNotReached();

    /// @dev Thrown when beneficiary calls claim() but has
    /// nothing available to claim at this moment
    error TokenVesting__NothingToClaim();

    /// @dev Thrown when trying to interact with a schedule
    /// that does not exist
    error TokenVesting__ScheduleDoesNotExist();

    /// @dev Thrown when owner tries to revoke an already
    /// revoked schedule
    error TokenVesting__AlreadyRevoked();
    error TokenVesting__AmountExceedsMaximum();

    struct VestingSchedule {
        uint128 totalAmount;
        uint128 claimedAmount;
        uint64 startTime;
        uint64 cliffDuration;
        uint64 vestingDuration;
        bool revoked;
    }

    // forge-lint: disable-next-line(mixed-case-variable)
    mapping(address token => mapping(address beneficiary => VestingSchedule))
        private s_vestingSchedules;

    // forge-lint: disable-next-line(mixed-case-variable)
    mapping(address token => uint256 totalLocked) private s_totalLockedTokens;

    /// @notice Emitted when owner creates a new vesting schedule
    event VestingScheduleCreated(
        address indexed token,
        address indexed beneficiary,
        uint256 totalAmount,
        uint64 cliffDuration,
        uint64 vestingDuration
    );

    /// @notice Emitted when a beneficiary successfully claims tokens
    event TokensClaimed(
        address indexed token,
        address indexed beneficiary,
        uint256 amount
    );

    /// @notice Emitted when owner revokes a vesting schedule
    event VestingScheduleRevoked(
        address indexed token,
        address indexed beneficiary,
        uint256 unvestedAmount
    );

    constructor() Ownable(msg.sender) {}

    /// @notice Owner creates a vesting schedule for a beneficiary
    /// @param token — the ERC20 token address to vest
    /// @param beneficiary — the wallet that will receive tokens
    /// @param totalAmount — total tokens to vest (in wei units)
    /// @param cliffDuration — seconds before any tokens unlock
    /// @param vestingDuration — total seconds of the vesting period
    function createVestingSchedule(
        address token,
        address beneficiary,
        uint128 totalAmount,
        uint64 cliffDuration,
        uint64 vestingDuration
    ) external {
        // Check that amount is not zero.
        // No point creating a schedule for zero tokens
        if (totalAmount == 0) {
            revert TokenVesting__AmountMustBeGreaterThanZero();
        }

        // Cliff cannot be longer than the total vesting period.
        // Example: You cannot have a 2 year cliff on a 1 year vest
        if (cliffDuration > vestingDuration) {
            revert TokenVesting__CliffLongerThanVestingDuration();
        }

        // Check if a schedule already exists for this
        // token + beneficiary combination.
        // We check startTime because a new schedule always has
        // startTime = 0 before creation
        if (s_vestingSchedules[token][beneficiary].startTime != 0) {
            revert TokenVesting__ScheduleAlreadyExists();
        }

        IERC20(token).safeTransferFrom(
            msg.sender, // from: the owner's wallet
            address(this), // to: this contract holds the tokens
            totalAmount // amount: total tokens to lock up
        );

        s_vestingSchedules[token][beneficiary] = VestingSchedule({
            totalAmount: totalAmount,
            claimedAmount: 0, // nothing claimed yet
            startTime: uint64(block.timestamp),
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revoked: false
        });

        emit VestingScheduleCreated(
            token,
            beneficiary,
            totalAmount,
            cliffDuration,
            vestingDuration
        );
    }

    /// @notice Beneficiary calls this to claim their vested tokens
    /// @param token — which token to claim from
    function claim(address token) external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = s_vestingSchedules[token][
            msg.sender
        ];

        // Schedule must exist — startTime of 0 means it was never created
        if (schedule.startTime == 0) {
            revert TokenVesting__ScheduleDoesNotExist();
        }

        // Cannot claim from a revoked schedule
        if (schedule.revoked) {
            revert TokenVesting__NothingToClaim();
        }

        // Cliff check — no tokens before cliff period passes
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            revert TokenVesting__CliffNotReached();
        }

        // Calculate how many tokens are claimable right now.
        // This is a pure calculation function we define below
        uint256 claimable = _calculateClaimable(schedule);

        // If claimable is zero there is nothing to do
        if (claimable == 0) {
            revert TokenVesting__NothingToClaim();
        }

        if (claimable > type(uint128).max)
            revert TokenVesting__AmountExceedsMaximum();
        schedule.claimedAmount += uint128(claimable);
        s_totalLockedTokens[token] -= claimable;

        // NOW we do the external call (transfer tokens out)
        // after state is already updated
        IERC20(token).safeTransfer(msg.sender, claimable);

        emit TokensClaimed(token, msg.sender, claimable);
    }

    /// @notice Owner can cancel a vesting schedule
    /// @param token — the token address of the schedule
    /// @param beneficiary — whose schedule to revoke
    function revoke(address token, address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = s_vestingSchedules[token][
            beneficiary
        ];

        if (schedule.startTime == 0) {
            revert TokenVesting__ScheduleDoesNotExist();
        }
        if (schedule.revoked) {
            revert TokenVesting__AlreadyRevoked();
        }

        uint256 vested = _calculateVested(schedule);

        uint256 unvested = schedule.totalAmount - vested;

        schedule.revoked = true;
        s_totalLockedTokens[token] -= unvested;

        // Return unvested tokens to owner
        if (unvested > 0) {
            IERC20(token).safeTransfer(owner(), unvested);
        }

        emit VestingScheduleRevoked(token, beneficiary, unvested);
    }

    /// @notice Owner can pause the contract in emergencies
    function pause() external onlyOwner {
        _pause(); // OpenZeppelin's internal pause function
    }

    /// @notice Owner can unpause the contract
    function unpause() external onlyOwner {
        _unpause(); // OpenZeppelin's internal unpause function
    }

    /// @notice Returns the full vesting schedule for a beneficiary
    /// @param token — the token address
    /// @param beneficiary — the wallet to check
    function getVestingSchedule(
        address token,
        address beneficiary
    ) external view returns (VestingSchedule memory) {
        return s_vestingSchedules[token][beneficiary];
    }

    /// @notice Returns how many tokens are claimable right now
    /// @param token — the token address
    /// @param beneficiary — the wallet to check
    function getClaimableAmount(
        address token,
        address beneficiary
    ) external view returns (uint256) {
        VestingSchedule storage schedule = s_vestingSchedules[token][
            beneficiary
        ];

        if (schedule.startTime == 0 || schedule.revoked) {
            return 0;
        }

        // Return 0 if cliff not reached yet
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        return _calculateClaimable(schedule);
    }

    /// @notice Returns total tokens locked for a given token
    function getTotalLocked(address token) external view returns (uint256) {
        return s_totalLockedTokens[token];
    }

    /// @notice Calculates how many tokens have vested so far
    /// @param schedule — the vesting schedule to calculate for
    /// @return uint256 — total vested amount including already claimed
    function _calculateVested(
        VestingSchedule storage schedule
    ) internal view returns (uint256) {
        // If we are past the full vesting period,
        // everything is vested — return the total
        if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount;
        }

        // How many seconds have passed since vesting started
        uint256 elapsed = block.timestamp - schedule.startTime;

        return
            (uint256(schedule.totalAmount) * elapsed) /
            schedule.vestingDuration;
    }

    /// @notice Calculates claimable tokens (vested minus already claimed)
    /// @param schedule — the vesting schedule to calculate for
    /// @return uint256 — tokens available to claim right now
    function _calculateClaimable(
        VestingSchedule storage schedule
    ) internal view returns (uint256) {
        uint256 vested = _calculateVested(schedule);

        return vested - schedule.claimedAmount;
    }
}
