// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

/// @notice Interface of the Farming contract
interface IFarming {
    /// @notice Indicates that tokens have been locked by the admin
    ///         on behalf of the user
    /// @param admin The admin who locked the tokens
    /// @param user The user who is considered to be a locker
    /// @param amount The amount of tokens locked
    event LockedOnBehalf(address admin, address user, uint256 amount);

    /// @notice Indicates that tokens have been locked by the user
    /// @param user The user tokens were locked on behalf of
    /// @param amount The amount of tokens locked
    event Locked(address user, uint256 amount);

    /// @notice Indicates that tokens were unlocked by the user
    /// @param user The user who unlocked tokens
    /// @param newLock The new locked amount of the user
    event Unlocked(address user, uint256 newLock);

    /// @notice Indicates that first call to claim function was made
    /// @param user The user who is trying to claim tokens
    event ClaimAttempt(address user);

    /// @notice Indicates that tokens were claimed by the user
    /// @param user The user who claimed the tokens
    /// @param amount The amount of claimed tokens
    event Claimed(address user, uint256 amount);

    /// @notice Indicates that a new minimum locking period was set
    /// @param period A new locking period in seconds
    event MinLockPeriodChanged(uint256 period);

    /// @notice Indicates that a new daily rate was set
    /// @param rate The new daily rate
    event DailyRateChanged(uint256 rate);

    /// @notice Indicates that funds were added to the staking for distribution
    /// @param amount Token amount added
    event FundsAdded(uint256 amount);

    /// @notice Indicates that locked amount of the user has decreased
    /// @param user The user whos locked amount was decreased
    /// @param amount The new locked amount of the user
    event UnlockedOnBehalf(address user, uint256 amount);

    /// @notice Pause the contract
    function pause() external;

    /// @notice Unpause the contract
    function unpause() external;

    /// @notice Returns information about user's farming
    /// @param user The user who is farming tokens
    /// @return The current locked amount
    /// @return The time lock has started
    /// @return The reward for farming
    function getFarming(address user) external view returns (uint256, uint256, uint256);

    /// @notice Returns the farming reward of the user
    /// @param user The user to get the reward of
    /// @return Farming reward of the user
    function getReward(address user) external returns (uint256);

    /// @notice Sets new daily period
    /// @param rate The new rate to set. Represented in Basis Points
    /// 1e18 - 100%
    /// 1e17 - 10%
    /// 1e16 - 1%
    /// etc
    function setDailyRate(uint256 rate) external;

    /// @notice Notify contract of the avalable reward amount
    /// @dev Before a staking contract could distribute rewards to the stakers the admin should send
    /// tokens to it and call this function
    /// @param amount amount sent to the staking
    function notifyRewardAmount(uint256 amount) external;

    /// @notice Recieves tokens from the admin and locks them
    ///         on behalf of the user
    /// @param admin The address of the admin to receive tokens from
    /// @param user The address of the user to lock on behalf of
    /// @param amount The amount of tokens to lock
    function lockOnBehalf(address admin, address user, uint256 amount) external;

    /// @notice Locks user's tokens
    /// @param amount The amount of tokens to lock
    function lock(uint256 amount) external;

    /// @notice Unlocks user's tokens
    /// @param amount The amount of tokens to unlock
    function unlock(uint256 amount) external;

    /// @notice Unlocks all user's locked tokense
    function unlockAll() external;

    /// @notice Unlocks tokens for Vesting contract.
    ///         Ignores minimum locking period
    /// @param user The user to send unlocked tokens to
    /// @param amount The amount of tokens to unlock
    function unlockFromVesting(address user, uint256 amount) external;

    /// @notice Claims user's rewards for farming.
    ///         Two calls of this function are required to claim.
    ///         Claim is only possible after full unlock.
    function claim() external;

    /// @notice Reward amount for each token stored by the user
    function rewardPerToken() external view returns (uint);
}
