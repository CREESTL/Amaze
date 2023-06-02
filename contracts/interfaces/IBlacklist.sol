// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

interface IBlacklist {
    /// @notice Indicates that account has been added to the blacklist
    /// @param account The account added to the blacklist
    event AddToBlacklist(address account);

    /// @notice Indicates that account has been removed from the blacklist
    /// @param account The account removed from the blacklist
    event RemoveFromBlacklist(address account);

    /// @notice Checks if account is blacklisted
    /// @param account The account to check
    /// @return True if account is blacklisted. Otherwise - false
    function checkBlacklisted(address account) external view returns (bool);

    /// @notice Adds a new account to the blacklist
    /// @param account The account to add to the blacklist
    function addToBlacklist(address account) external;

    /// @notice Removes account from the blacklist
    /// @param account The account to remove from the blacklist
    function removeFromBlacklist(address account) external;

    /// @notice Pause the contract
    function pause() external;

    /// @notice Unpause the contract
    function unpause() external;
}
