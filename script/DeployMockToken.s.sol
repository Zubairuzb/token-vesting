// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockToken} from "../src/MockToken.sol";

contract DeployMockToken is Script {
    function run() external returns (MockToken) {
        // Load private key from .env file
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the token
        MockToken token = new MockToken();

        vm.stopBroadcast();

        // Log the address
        console.log("MockToken deployed to:", address(token));
        console.log("Total supply:", token.totalSupply());

        return token;
    }
}
