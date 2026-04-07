// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockToken
/// @author Zubairu Musa
/// @notice A simple ERC20 token for testing the vesting protocol
/// @dev This token has a public mint function so anyone can
/// get tokens for testing.
contract MockToken is ERC20, Ownable {
    constructor() ERC20("Vesting Test Token", "VTT") Ownable(msg.sender) {
        // Mint 1,000,000 tokens to the deployer on launch
        // 1e24 = 1,000,000 tokens with 18 decimals
        _mint(msg.sender, 1_000_000e18);
    }

    /// @notice Anyone can mint tokens for testing purposes
    /// @param to — address to mint tokens to
    /// @param amount — how many tokens to mint
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
