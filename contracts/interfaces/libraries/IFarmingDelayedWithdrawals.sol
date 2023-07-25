// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

interface IFarmingDelayedWithdrawals {
    struct DelayedWithdrawal {
        uint256 amount;
        uint256 timeCreated;
    }

    /// @dev struct used to store a single stakers delayedWithdrawal data
    struct StakerDelayedWithdrawals {
        uint256 unlockDelayedWithdrawalsCompleted;
        uint256 claimDelayedWithdrawalsCompleted;
        DelayedWithdrawal[] unlockDelayedWithdrawals;
        DelayedWithdrawal[] claimDelayedWithdrawals;
    }

    /// @notice Indicates that delayed unlock tokens were withdrawed by the user
    /// @param user The user who unlocked tokens
    /// @param amount The amount withdrawed by user
    event DelayedUnlockWithdrawed(address user, uint256 amount);

    /// @notice Indicates that delayed claim tokens were withdrawed by the user
    /// @param user The user who unlocked tokens
    /// @param amount The amount withdrawed by user
    event DelayedClaimWithdrawed(address user, uint256 amount);

    /// @notice Getter function for fetching the delayedWithdrawal at the `index`th entry from the `_stakerWithdrawals[user].unlockDelayedWithdrawals` array
    /// @param user The user to get the unlockDelayedWithdrawal of
    /// @param index Index in unlockDelayedWithdrawals array
    function getStakerUnlockDelayedWithdrawalByIndex(
        address user,
        uint256 index
    ) external view returns (
        DelayedWithdrawal memory
    );

    /// @notice Getter function for fetching the length of the unlock delayedWithdrawals array of a specific user
    function getStakerUnlockWithdrawalsLength(address user) external view returns (uint256);

    /// @notice Getter function for fetching the delayedWithdrawal at the `index`th entry from the `_stakerWithdrawals[user].claimDelayedWithdrawals` array
    /// @param user The user to get the claimDelayedWithdrawal of
    /// @param index Index in unlockDelayedWithdrawals array
    function getStakerClaimDelayedWithdrawalByIndex(
        address user,
        uint256 index
    ) external view returns (
        DelayedWithdrawal memory
    );

    /// @notice Getter function for fetching the length of the claim delayedWithdrawals array of a specific user
    function getStakerClaimWithdrawalsLength(address user) external view returns (uint256);
}