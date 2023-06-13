// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IVesting.sol";
import "./interfaces/IFarming.sol";
import "./interfaces/IMaze.sol";

/// @title The contract for Maze tokens vesting
contract Vesting is IVesting, Ownable, Pausable {

    using EnumerableSet for EnumerableSet.UintSet;
    using Counters for Counters.Counter;

    /// @notice Address of the Maze token
    address public maze;
    /// @notice Address of the Farming contract
    address public farming;

    /// @dev Used to convert from BPs to percents and vice versa
    uint256 private constant _converter = 1e4;

    /// @dev IDs of vestings
    Counters.Counter private _vestingIds;

    /// @dev Structure representing a single vesting
    struct TokenVesting {
        // The unique ID of the vesting
        uint256 id;
        // The recipient of tokens after cliff
        address to;
        // The total amount of tokens to be vested
        uint256 amount;
        // The moment vesting was started
        uint256 startTime;
        // The duration of cliff period
        uint256 cliffDuration;
        // The percentage of tokens unlocked right after the cliff
        uint256 cliffUnlock;
        // The period after cliff when users can claim their tokens
        uint256 claimablePeriod;
    }

    /// @dev Mapping from user to IDs of vestings assigned to him
    ///      Each user can have multiple vestings assigned to him
    mapping(address => EnumerableSet.UintSet) private _usersToIds ;

    /// @dev Mapping from vesting ID to the vesting itself
    mapping(uint256 => TokenVesting) private _idsToVestings;

    constructor(address maze_, address farming_) {
        maze = maze_;
        farming = farming_;
    }

    /// @notice See {IVesting-getUsersVestings}
    function getUserVestings(address user) public view returns (uint256[] memory) {
        return _usersToIds[user].values();
    }

    /// @notice See {IVesting-getVesting}
    function getVesting(uint256 id) public view returns (
        address, // to
        uint256, // amount
        uint256, // startTime
        uint256, // cliffDuration
        uint256, // cliffUnlock
        uint256  // claimablePeriod
    ) {
        TokenVesting memory vesting = _idsToVestings[id];

        return (
            vesting.to,
            vesting.startTime,
            vesting.amount,
            vesting.cliffDuration,
            vesting.cliffUnlock,
            vesting.claimablePeriod
        );
    }

    /// @notice See {IVesting-setMaze}
    function setMaze(address newMaze) public onlyOwner {
        require(newMaze != address(0), "Vesting: Token cannot have zero address");

        maze = newMaze;

        emit MazeChanged(newMaze);

    }

    /// @notice See {IVesting-setFarming}
    function setFarming(address newFarming) public onlyOwner {
        require(newFarming != address(0), "Vesting: Farming cannot have zero address");

        farming = newFarming;

        emit FarmingChanged(newFarming);

    }

    /// @notice See {IVesting-startVesting}
    function startVesting(
        address to,
        uint256 amount,
        uint256 cliffDuration,
        uint256 cliffUnlock,
        uint256 claimablePeriod
    ) public onlyOwner {

        require(to != address(0), "Vesting: Reciever cannot be zero address");
        require(amount != 0, "Vesting: Amount cannot be zero");
        require(cliffDuration > 0, "Vesting: Cliff duration cannot be zero");
        require(cliffUnlock < 1e4, "Vesting: Whole amount cannot be unlocked");
        require(claimablePeriod > 0, "Vesting: Claimable period cannot be zero seconds");

        // NOTICE: User must approve this transfer first

        // Transfer all tokens to the Vesting contract first
        IMaze(maze).transferFrom(msg.sender, address(this), amount);

        // Vesting IDs start with 1
        _vestingIds.increment();
        uint256 id = _vestingIds.current();

        // Create a new vesting
        TokenVesting memory vesting = TokenVesting (
            {
                id: id,
                to: to,
                startTime: block.timestamp,
                amount: amount,
                cliffDuration: cliffDuration,
                cliffUnlock: cliffUnlock,
                claimablePeriod: claimablePeriod
            }
        );

        // Mark that this vesting is assigned to the user
        _usersToIds[to].add(id);

        // Link vesting with its ID
        _idsToVestings[id] = vesting;

        // Transfer tokens to the Farming contract
        IMaze(maze).approve(farming, amount);
        IFarming(farming).lockOnBehalf(to, amount);

        emit VestingStarted(
            to,
            amount,
            cliffDuration,
            cliffUnlock,
            claimablePeriod
        );

    }

    /// @notice See {IVesting-claimVesting}
    function claimTokens() public {

        // Calculate the vested amount using the schedule
        uint256 vestedAmount = _calculateVestedAmount(msg.sender);

        // TODO can vested amount be greater than locked on Farming?

        // Transfer vested tokens from Farming to the user
        // NOTE: This does not claim the reward for Farming.
        IFarming(farming).unlockOnBehalf(msg.sender, vestedAmount);

        emit TokensClaimed(msg.sender);
    }

    /// @dev Calculates amount of vested tokens available for claim for the user
    /// @param user The address of the user to calculated vested tokens for
    function _calculateVestedAmount(address user)
        private
        view
        returns (uint256)
    {

        // Total amount available for the user
        uint256 totalVestedAmount;

        // Iterate over all vestings assigned to the user
        // and calculate vested amount for each of them
        for (uint256 i = 0; i < _usersToIds[user].length(); i++) {
            uint256 vestingId = _usersToIds[user].at(i);
            TokenVesting memory vesting = _idsToVestings[vestingId];
            require(
                vesting.startTime + vesting.cliffDuration < block.timestamp,
                "Vesting: Cliff not reached"
            );
            require(
                block.timestamp < vesting.claimablePeriod,
                "Vesting: Claimable period ended"
            );
            // If cliff was reached, cliffUnlock is available
            totalVestedAmount += vesting.cliffUnlock;
            // Each claim period is one month. Cannot be changed
            // TODO 31 or 30 days here?
            uint256 oneMonth = 1 days * 31;

            // Calculate the number of months in claimable period in total after cliff
            uint256 monthsInClaimablePeriod = vesting.claimablePeriod / oneMonth;
            // Each month the same amount is vested
            uint256 amountPerMonth = vesting.amount / monthsInClaimablePeriod;

            // Calculate the number of months since cliff
            uint256 timeSinceCliff =
                block.timestamp - (
                    vesting.startTime + vesting.cliffDuration
                );
            uint256 monthsSinceCliff = timeSinceCliff / oneMonth;

            // Increment vested amount
            totalVestedAmount += monthsSinceCliff * amountPerMonth;
        }

        return totalVestedAmount;

    }





}
