// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

interface ICore {
    /// @notice Indicates that account has been added to the blacklist
    /// @param account The account added to the blacklist
    event AddToBlacklist(address account);

    /// @notice Indicates that account has been removed from the blacklist
    /// @param account The account removed from the blacklist
    event RemoveFromBlacklist(address account);

    /// @notice Indicates that new Maze address was set
    /// @param maze The new address of the Maze token
    event MazeChanged(address maze);

    /// @notice Indicates that new Vesting address was set
    /// @param vesting The new address of the Vesting contract
    event VestingChanged(address vesting);

    /// @notice Indicates that new Farming address was set
    /// @param farming The new address of the Farming contract
    event FarmingChanged(address farming);

    /// @notice Checks if account is blacklisted
    /// @param account The account to check
    /// @return True if account is blacklisted. Otherwise - false
    function checkBlacklisted(address account) external view returns (bool);

    /// @notice Returns the address of the Maze contract
    /// @return The address of the Maze contract
    function maze() external returns (address);

    /// @notice Returns the address of the Vesting contract
    /// @return The address of the Vesting contract
    function vesting() external returns (address);

    /// @notice Returns the address of the Farming contract
    /// @return The address of the Farming contract
    function farming() external returns (address);

    /// @notice Sets the new address of the Maze contract
    /// @param maze_ The new address of the Maze contract
    function setMaze(address maze_) external;

    /// @notice Sets the new address of the Vesting contract
    /// @param vesting_ The new address of the Vesting contract
    function setVesting(address vesting_) external;

    /// @notice Sets the new address of the Farming contract
    /// @param farming_ The new address of the Farming contract
    function setFarming(address farming_) external;

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
