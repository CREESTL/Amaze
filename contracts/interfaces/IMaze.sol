// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Interface of the ERC20 standard as defined in the EIP.
interface IMaze is IERC20 {
    /// @notice Pause the contract
    function pause() external;

    /// @notice Unpause the contract
    function unpause() external;

    /// @notice Burns tokens of the user
    /// @param amount The amount of tokens to burn
    function burn(uint256 amount) external;
}
