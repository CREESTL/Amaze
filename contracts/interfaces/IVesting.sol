// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

/// @notice Interface of the Vesting contract
interface IVesting {
    /// @notice Indicates that Maze token address was changed;
    /// @param newMaze The new address of the Maze token
    event MazeChanged(address newMaze);

    /// @notice Indicates that Farming contract address was changed;
    /// @param newFarming The new address of the Farming contract
    event FarmingChanged(address newFarming);

    // TODO not sure about parameters here
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
    event TokensClaimed(address to);

    /// @notice Returns list of IDs of vestings assigned to the user
    /// @param user The address of the user
    /// @return The list of IDs of vestings assigned to the user
    function getUserVestings(
        address user
    ) external view returns (uint256[] memory);

    /// @notice Returns information about the vesting by its ID
    /// @param id The ID of the vesting to get information about
    /// @return The recipient of tokens after cliff
    /// @return The total amount of tokens to be vested
    /// @return The moment vesting was started
    /// @return The duration of cliff period
    /// @return Percentage of tokens unlocked right after the cliff
    /// @return The period after cliff when users can claim their tokens
    function getVesting(
        uint256 id
    )
        external
        view
        returns (
            address, // to
            uint256, // amount
            uint256, // startTime
            uint256, // cliffDuration
            uint256, // cliffUnlock
            uint256 // claimablePeriods
        );

    /// @notice Changes address of the Maze token
    /// @param newMaze The new address of the Maze token
    function setMaze(address newMaze) external;

    /// @notice Changes address of the Farming contract
    /// @param newFarming The new address of the Farming contract
    function setFarming(address newFarming) external;

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
