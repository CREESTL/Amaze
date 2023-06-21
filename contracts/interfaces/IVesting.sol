// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

/// @notice Interface of the Vesting contract
interface IVesting {
    enum VestingStatus {
        InProgress,
        Claimed
    }

    /// @dev Structure representing a single vesting
    struct TokenVesting {
        // The unique ID of the vesting
        uint256 id;
        // The status of vesting
        VestingStatus status;
        // The recipient of tokens after cliff
        address to;
        // The total amount of tokens to be vested
        uint256 amount;
        // The amount of claimed tokens.
        uint256 amountClaimed;
        // The moment vesting was started
        uint256 startTime;
        // The duration of cliff period
        uint256 cliffDuration;
        // The percentage of tokens unlocked right after the cliff
        uint256 cliffUnlock;
        // Indicates that cliff amount was claimed
        bool cliffClaimed;
        // The number of periods in which user can claim tokens
        uint256 claimablePeriods;
        // The number of the last period a user has claimed tokens
        uint256 lastClaimedPeriod;
    }

    /// @notice Indicates that a new vesting has
    /// @param to The recipient of tokens after cliff
    /// @param amount The total amount of tokens to be vested
    /// @param cliffDuration The duration of cliff period
    /// @param cliffUnlock Percentage of tokens unlocked right after the cliff
    /// @param claimablePeriods The number of periods after cliff in which user can claim tokens
    event VestingStarted(
        address to,
        uint256 amount,
        uint256 cliffDuration,
        uint256 cliffUnlock,
        uint256 claimablePeriods
    );

    /// @notice Indicates that user has claimed vested tokens
    /// @param to The reciever of vested tokens
    /// @param amount The amount of tokens claimed
    event TokensClaimed(address to, uint256 amount);

    /// @notice Pause the contract
    function pause() external;

    /// @notice Unpause the contract
    function unpause() external;

    /// @notice Returns list of IDs of vestings assigned to the user
    /// @param user The address of the user
    /// @return The list of IDs of vestings assigned to the user
    function getUserVestings(
        address user
    ) external view returns (uint256[] memory);

    /// @notice Returns information about the vesting by its ID
    /// @param id The ID of the vesting to get information about
    /// @return The status of vesting
    /// @return The recipient of tokens after cliff
    /// @return The total amount of tokens to be vested
    /// @return The total amount of claimed tokens
    /// @return The moment vesting was started
    /// @return The duration of cliff period
    /// @return Percentage of tokens unlocked right after the cliff
    /// @return True if cliff amount was claimed. Otherwise - false
    /// @return The number of periods after cliff when user can claim his tokens
    /// @return The number of the last period when user has claimed his tokens
    function getVesting(
        uint256 id
    )
        external
        view
        returns (
            VestingStatus, // status
            address, // to
            uint256, // amount
            uint256, // amountClaimed
            uint256, // startTime
            uint256, // cliffDuration
            uint256, // cliffUnlock
            bool, // cliffClaimed
            uint256, // claimablePeriods
            uint256 // lastClaimedPeriod
        );

    /// @notice Starts vesting for a specific user
    /// @param to The recipient of tokens after cliff
    /// @param amount The total amount of tokens to be vested
    /// @param cliffDuration The duration of cliff period
    ///        During that period tokens are locked and cannot be claimed
    /// @param cliffUnlock Percentage of tokens unlocked right after the cliff
    /// @param claimablePeriods The number of periods after cliff in which user can claim tokens
    function startVesting(
        address to,
        uint256 amount,
        uint256 cliffDuration,
        uint256 cliffUnlock,
        uint256 claimablePeriods
    ) external;

    /// @notice Allows a user to claim tokens that were vested by admin for him
    function claimTokens() external;
}
