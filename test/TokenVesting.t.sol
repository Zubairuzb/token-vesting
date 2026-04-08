// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {console} from "forge-std/console.sol";
import {TokenVesting} from "../src/TokenVesting.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ============================================================
//                      MOCK TOKEN
// ============================================================
// A mock is a simplified fake version of something real.
// We create a mock ERC20 token so we can:
// 1. Mint as many tokens as we need for testing
// 2. Control everything without needing a real deployed token
// 3. Test without spending real money
//
// This contract lives inside the test file because it is
// only needed for testing — not part of the real project
contract MockERC20 is ERC20 {
    // Constructor takes name and symbol just like any ERC20
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    // mint() lets us create tokens out of thin air for testing.
    // In a real token this would not exist — but for tests
    // we need to give wallets tokens without buying them
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// ============================================================
//                      TEST CONTRACT
// ============================================================

contract TokenVestingTest is Test {
    // ============================================================
    //                      STATE VARIABLES
    // ============================================================

    // The contract we are testing
    TokenVesting public vestingContract;

    // Our fake token for testing
    MockERC20 public token;

    // Test addresses — makeAddr() creates deterministic fake
    // addresses from a string. Better than using random addresses
    // because the name makes tests readable
    address public owner;
    address public beneficiary;
    address public stranger;

    // Vesting parameters we will reuse across multiple tests.
    // Defining them here once means if we need to change a value
    // we change it in one place not twenty places
    uint128 public constant TOTAL_AMOUNT = 1000e18; // 1000 tokens
    uint64 public constant CLIFF_DURATION = 90 days; // 3 months
    uint64 public constant VESTING_DURATION = 365 days; // 1 year

    // ============================================================
    //                         SETUP
    // ============================================================

    function setUp() public {
        // makeAddr() creates a fake address from a label string.
        // The address is deterministic — same string always gives
        // same address.
        owner = makeAddr("owner");
        beneficiary = makeAddr("beneficiary");
        stranger = makeAddr("stranger");

        vm.startPrank(owner);

        // Deploy a fresh vesting contract as the owner
        vestingContract = new TokenVesting();

        // Deploy a fresh mock token
        token = new MockERC20("Mock Token", "MTK");

        // Mint tokens to the owner so they can fund vesting schedules
        token.mint(owner, TOTAL_AMOUNT * 10); // mint 10x for multiple tests

        // Stop pretending to be owner
        vm.stopPrank();
    }

    // ============================================================
    //                      HELPER FUNCTION
    // ============================================================
    function _createSchedule() internal {
        // Switch to owner context
        vm.startPrank(owner);

        token.approve(address(vestingContract), TOTAL_AMOUNT);

        // Now create the schedule
        vestingContract.createVestingSchedule(
            address(token),
            beneficiary,
            TOTAL_AMOUNT,
            CLIFF_DURATION,
            VESTING_DURATION
        );

        vm.stopPrank();
    }

    // ============================================================
    //                    DEPLOYMENT TESTS
    // ============================================================

    /// @notice Verify the contract deploys with correct initial state
    function test_DeploymentSetsOwnerCorrectly() public view {
        assertEq(vestingContract.owner(), owner);
    }

    /// @notice Contract should not be paused on deployment
    function test_ContractIsNotPausedOnDeployment() public view {
        assertEq(vestingContract.paused(), false);
    }

    // ============================================================
    //               CREATE VESTING SCHEDULE TESTS
    // ============================================================

    /// @notice Happy path — schedule creates successfully
    function test_CreateVestingSchedule_Success() public {
        _createSchedule();

        // Read the schedule back from the contract
        TokenVesting.VestingSchedule memory schedule = vestingContract
            .getVestingSchedule(address(token), beneficiary);

        // Verify every field was stored correctly
        assertEq(schedule.totalAmount, TOTAL_AMOUNT);
        assertEq(schedule.claimedAmount, 0);
        assertEq(schedule.cliffDuration, CLIFF_DURATION);
        assertEq(schedule.vestingDuration, VESTING_DURATION);
        assertEq(schedule.revoked, false);
    }

    /// @notice Tokens should move from owner to contract on creation
    function test_CreateVestingSchedule_TransfersTokensToContract() public {
        uint256 ownerBalanceBefore = token.balanceOf(owner);

        _createSchedule();

        // Owner balance should decrease by TOTAL_AMOUNT
        assertEq(token.balanceOf(owner), ownerBalanceBefore - TOTAL_AMOUNT);

        // Contract balance should increase by TOTAL_AMOUNT
        assertEq(token.balanceOf(address(vestingContract)), TOTAL_AMOUNT);
    }

    /// @notice Only owner should be able to create schedules
    function test_CreateVestingSchedule_RevertsIfNotOwner() public {
        vm.expectRevert();

        // stranger tries to create a schedule — should revert
        vm.prank(stranger); // prank is single-transaction version of startPrank
        vestingContract.createVestingSchedule(
            address(token),
            beneficiary,
            TOTAL_AMOUNT,
            CLIFF_DURATION,
            VESTING_DURATION
        );
    }

    /// @notice Should revert if amount is zero
    function test_CreateVestingSchedule_RevertsIfAmountIsZero() public {
        vm.expectRevert(
            TokenVesting.TokenVesting__AmountMustBeGreaterThanZero.selector
        );

        vm.prank(owner);
        vestingContract.createVestingSchedule(
            address(token),
            beneficiary,
            0, // zero amount
            CLIFF_DURATION,
            VESTING_DURATION
        );
    }

    /// @notice Should revert if cliff is longer than vesting duration
    function test_CreateVestingSchedule_RevertsIfCliffLongerThanVesting()
        public
    {
        vm.expectRevert(
            TokenVesting.TokenVesting__CliffLongerThanVestingDuration.selector
        );

        vm.prank(owner);
        vestingContract.createVestingSchedule(
            address(token),
            beneficiary,
            TOTAL_AMOUNT,
            365 days, // cliff = 1 year
            90 days // vesting = 3 months — cliff longer than vesting
        );
    }

    /// @notice Should revert if schedule already exists
    function test_CreateVestingSchedule_RevertsIfAlreadyExists() public {
        _createSchedule(); // create first schedule

        // Mint more tokens to owner so the second attempt
        // does not fail on insufficient balance before
        // reaching our duplicate check
        token.mint(owner, TOTAL_AMOUNT);

        // Try to create a second schedule for same token + beneficiary
        vm.startPrank(owner);

        token.approve(address(vestingContract), TOTAL_AMOUNT);
        vm.expectRevert(
            TokenVesting.TokenVesting__ScheduleAlreadyExists.selector
        );
        vestingContract.createVestingSchedule(
            address(token),
            beneficiary,
            TOTAL_AMOUNT,
            CLIFF_DURATION,
            VESTING_DURATION
        );
        vm.stopPrank();
    }

    // ============================================================
    //                       CLAIM TESTS
    // ============================================================

    /// @notice Cannot claim before cliff period ends
    function test_Claim_RevertsBeforeCliff() public {
        _createSchedule();

        // vm.warp() moves blockchain time forward to a specific
        // timestamp. This is how we test time-dependent logic
        // without actually waiting 90 days.
        // Here we move time forward by 89 days — just before cliff
        vm.warp(block.timestamp + 89 days);

        vm.expectRevert(TokenVesting.TokenVesting__CliffNotReached.selector);

        vm.prank(beneficiary);
        vestingContract.claim(address(token));
    }

    /// @notice Should be able to claim exactly at cliff
    function test_Claim_SucceedsAtCliff() public {
        _createSchedule();

        // Move time to exactly when cliff ends
        vm.warp(block.timestamp + CLIFF_DURATION);

        vm.prank(beneficiary);
        vestingContract.claim(address(token));

        // Beneficiary should have received some tokens
        // At cliff (90/365 days) they should have roughly 24.6% vested
        uint256 beneficiaryBalance = token.balanceOf(beneficiary);
        assertGt(beneficiaryBalance, 0); // assertGt = assert greater than
    }

    /// @notice Full amount claimable after vesting period ends
    function test_Claim_FullAmountAfterVestingPeriod() public {
        _createSchedule();

        // Move time past the full vesting period
        vm.warp(block.timestamp + VESTING_DURATION + 1);

        vm.prank(beneficiary);
        vestingContract.claim(address(token));

        // Beneficiary should have received all tokens
        assertEq(token.balanceOf(beneficiary), TOTAL_AMOUNT);
    }

    /// @notice Claiming twice should give correct cumulative amount
    function test_Claim_MultipleClaims_GivesCorrectTotal() public {
        _createSchedule();

        // First claim — halfway through vesting
        vm.warp(block.timestamp + VESTING_DURATION / 2);
        vm.prank(beneficiary);
        vestingContract.claim(address(token));

        uint256 balanceAfterFirstClaim = token.balanceOf(beneficiary);

        // Second claim — at end of vesting
        vm.warp(block.timestamp + VESTING_DURATION);
        vm.prank(beneficiary);
        vestingContract.claim(address(token));

        uint256 balanceAfterSecondClaim = token.balanceOf(beneficiary);

        // Second claim should have given more tokens
        assertGt(balanceAfterSecondClaim, balanceAfterFirstClaim);

        // Total received should equal total promised
        assertEq(balanceAfterSecondClaim, TOTAL_AMOUNT);
    }

    /// @notice Cannot claim from nonexistent schedule
    function test_Claim_RevertsIfScheduleDoesNotExist() public {
        vm.expectRevert(
            TokenVesting.TokenVesting__ScheduleDoesNotExist.selector
        );

        vm.prank(beneficiary);
        vestingContract.claim(address(token));
    }

    // ============================================================
    //                       REVOKE TESTS
    // ============================================================

    /// @notice Owner can revoke and unvested tokens return to owner
    function test_Revoke_ReturnsUnvestedTokensToOwner() public {
        _createSchedule();

        // Move halfway through vesting
        vm.warp(block.timestamp + VESTING_DURATION / 2);

        uint256 ownerBalanceBefore = token.balanceOf(owner);

        vm.prank(owner);
        vestingContract.revoke(address(token), beneficiary);

        // Owner should have received back the unvested tokens
        // At halfway, 50% is vested so 50% should return to owner
        assertGt(token.balanceOf(owner), ownerBalanceBefore);
    }

    /// @notice Beneficiary can still claim vested amount after revocation
    function test_Revoke_BeneficiaryCanClaimVestedAmount() public {
        _createSchedule();

        // Move halfway through vesting — 50% vested
        vm.warp(block.timestamp + VESTING_DURATION / 2);

        // Owner revokes
        vm.prank(owner);
        vestingContract.revoke(address(token), beneficiary);

        // Beneficiary should revert when trying to claim
        // because schedule is marked revoked
        vm.expectRevert(TokenVesting.TokenVesting__NothingToClaim.selector);
        vm.prank(beneficiary);
        vestingContract.claim(address(token));
    }

    /// @notice Cannot revoke twice
    function test_Revoke_RevertsIfAlreadyRevoked() public {
        _createSchedule();

        vm.startPrank(owner);
        vestingContract.revoke(address(token), beneficiary);

        vm.expectRevert(TokenVesting.TokenVesting__AlreadyRevoked.selector);

        // Try to revoke again
        vestingContract.revoke(address(token), beneficiary);
        vm.stopPrank();
    }

    /// @notice Only owner can revoke
    function test_Revoke_RevertsIfNotOwner() public {
        _createSchedule();

        vm.expectRevert();

        vm.prank(stranger);
        vestingContract.revoke(address(token), beneficiary);
    }

    // ============================================================
    //                       PAUSE TESTS
    // ============================================================

    /// @notice Cannot create schedule when paused
    function test_Pause_RevertsCreateWhenPaused() public {
        // Pause the contract first
        vm.prank(owner);
        vestingContract.pause();

        // Approve separately before pranking for the vesting call
        vm.prank(owner);
        token.approve(address(vestingContract), TOTAL_AMOUNT);

        // Now expect the revert on the actual vesting call
        vm.expectRevert();
        vm.prank(owner);
        vestingContract.createVestingSchedule(
            address(token),
            beneficiary,
            TOTAL_AMOUNT,
            CLIFF_DURATION,
            VESTING_DURATION
        );
    }

    /// @notice Cannot claim when paused
    function test_Pause_RevertsClaimWhenPaused() public {
        _createSchedule();

        vm.warp(block.timestamp + VESTING_DURATION);

        vm.prank(owner);
        vestingContract.pause();

        vm.expectRevert();

        vm.prank(beneficiary);
        vestingContract.claim(address(token));
    }

    // ============================================================
    //                       FUZZ TESTS
    // ============================================================

    /// @notice Claimable amount should never exceed total amount
    /// This is the most critical invariant of the whole contract
    function testFuzz_ClaimableNeverExceedsTotalAmount(
        uint256 timeElapsed
    ) public {
        _createSchedule();

        // bound() constrains the random input to a valid range.
        // Without bound(), timeElapsed could be 0 or astronomically
        // large — both would cause issues unrelated to our logic.
        // We test from cliff all the way to 10x the vesting duration
        timeElapsed = bound(timeElapsed, CLIFF_DURATION, VESTING_DURATION * 10);

        vm.warp(block.timestamp + timeElapsed);

        uint256 claimable = vestingContract.getClaimableAmount(
            address(token),
            beneficiary
        );

        // This must ALWAYS be true — no matter what time it is,
        // claimable should never exceed what was promised
        assertLe(claimable, TOTAL_AMOUNT); // assertLe = assert less than or equal
    }

    /// @notice Total claimed after full vesting should equal total amount
    function testFuzz_TotalClaimedEqualsTotal(
        uint64 cliffDuration,
        uint64 vestingDuration
    ) public {
        cliffDuration = uint64(bound(cliffDuration, 1 days, 365 days));
        vestingDuration = uint64(
            bound(vestingDuration, cliffDuration, 4 * 365 days)
        );

        vm.startPrank(owner);
        token.approve(address(vestingContract), TOTAL_AMOUNT);
        vestingContract.createVestingSchedule(
            address(token),
            beneficiary,
            TOTAL_AMOUNT,
            cliffDuration,
            vestingDuration
        );
        vm.stopPrank();

        // Move past full vesting period
        vm.warp(block.timestamp + vestingDuration + 1);

        // Claim everything
        vm.prank(beneficiary);
        vestingContract.claim(address(token));

        // Use assertApproxEqAbs instead of assertEq
        // assertApproxEqAbs checks that values are equal within
        // a small tolerance (1 wei here) to account for integer
        // division rounding in the vesting formula
        assertApproxEqAbs(token.balanceOf(beneficiary), TOTAL_AMOUNT, 1);
    }

    /// @notice Claiming multiple times should give same total as claiming once
    function testFuzz_MultipleClaimsEqualSingleClaim(
        uint8 numberOfClaims
    ) public {
        // Between 2 and 10 claims
        numberOfClaims = uint8(bound(numberOfClaims, 2, 10));

        _createSchedule();

        // Divide vesting period into equal chunks based on claim count
        uint256 timePerClaim = VESTING_DURATION / numberOfClaims;

        // Make multiple claims at equal intervals
        for (uint8 i = 1; i <= numberOfClaims; i++) {
            vm.warp(block.timestamp + timePerClaim);

            uint256 claimable = vestingContract.getClaimableAmount(
                address(token),
                beneficiary
            );

            if (claimable > 0) {
                vm.prank(beneficiary);
                vestingContract.claim(address(token));
            }
        }

        // Move past vesting end and claim any remainder
        vm.warp(block.timestamp + VESTING_DURATION);
        uint256 remaining = vestingContract.getClaimableAmount(
            address(token),
            beneficiary
        );
        if (remaining > 0) {
            vm.prank(beneficiary);
            vestingContract.claim(address(token));
        }

        // No matter how many times they claimed, total should equal promised
        assertEq(token.balanceOf(beneficiary), TOTAL_AMOUNT);
    }
}
