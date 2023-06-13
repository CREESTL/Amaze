// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

/// @notice Interface of the Farming contract
interface IFarming {

    /// @notice Indicates that tokens have been locked by the user
    /// @param user The user tokens were locked on behalf of
    /// @param amount The amount of tokens locked
    event LockedOnBehalf(address user, uint256 amount);

    /// @notice Indicates that locked amount of the user has decreased
    /// @param user The user whos locked amount was decreased
    /// @param amount The new locked amount of the user
    event UnlockedOnBehalf(address user, uint256 amount);

    /// @notice Recieves and locks Maze tokens from Vesting contract to farm
    ///         on behalf of the user
    /// @param user The address of the user to lock on behalf of
    /// @param amount The amount of Maze tokens to lock
    function lockOnBehalf(address user, uint256 amount) external;

    /// @notice Unlockes Maze tokens on behalf of the user
    /// @param user The address of the user to unlock on behalf of
    /// @param amount The amount of Maze tokens to unlock
    function unlockOnBehalf(address user, uint256 amount) external;

}

