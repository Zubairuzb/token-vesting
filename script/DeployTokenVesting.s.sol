// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TokenVesting} from "../src/TokenVesting.sol";

/// @title DeployTokenVesting
/// @notice Deployment script for the TokenVesting contract
/// @dev Run with: forge script script/DeployTokenVesting.s.sol
///      --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
///      --broadcast --verify --etherscan-api-key $ETHERSCAN_API_KEY

contract DeployTokenVesting is Script {
    function run() external returns (TokenVesting) {
        vm.startBroadcast();
        TokenVesting vestingContract = new TokenVesting();
        vm.stopBroadcast();

        console.log("TokenVesting deployed to:", address(vestingContract));
        console.log("Owner set to:", vestingContract.owner());

        return vestingContract;
    }
}
