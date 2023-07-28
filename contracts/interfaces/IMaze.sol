// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Interface of the ERC20 standard as defined in the EIP.
interface IMaze is IERC20 {
    /// @notice Indicates that sale fee amount has been changed
    event SetSaleFees(uint256 newSaleFeeAmount);

    /// @notice Indicates that user has been added to whitelist
    event AddToWhitelist(address account);

    /// @notice Indicates that user has been removed from whitelist
    event RemoveFromWhitelist(address account);

    /// @notice Indicates that user has been added to sale pair list
    event AddToPairlist(address pair);

    /// @notice Indicates that user has been removed from sale pair list
    event RemoveFromPairlist(address pair);

    /// @notice Indicates that saleFeeReceiver address has been changed
    event SaleFeeReceiverChanged(address receiver);

    /// @notice Indicates that pool fee amount has been changed
    event PoolFeeChanged(uint24 poolFee);

    /// @notice Adds a user to the whitelist
    ///         Whitelisted users do not pay fees
    /// @param account Address of the user
    function addToWhitelist(address account) external;

    /// @notice Remove a user from the whitelist
    ///         Whitelisted users do not pay fees
    /// @param account Address of the user
    function removeFromWhitelist(address account) external;

    /// @notice Adds a user to the sale pair list
    ///         When selling a token in a pair, a sale commission is taken
    /// @param pair Address of the pair
    function addToPairlist(address pair) external;

    /// @notice Remove a user from the sale pair list
    ///         When selling a token in a pair, a sale commission is taken
    /// @param pair Address of the pair
    function removeFromPairlist(address pair) external;

    /// @notice Pause the contract
    function pause() external;

    /// @notice Unpause the contract
    function unpause() external;

    /// @notice Burns tokens of the user
    /// @param amount The amount of tokens to burn
    function burn(uint256 amount) external;
}
