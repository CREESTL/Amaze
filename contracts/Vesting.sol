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
import "./interfaces/IBlacklist.sol";

// TODO remove logs
import "hardhat/console.sol";

/// @title The contract for Maze tokens vesting
contract Vesting is IVesting, Ownable, Pausable {
    using EnumerableSet for EnumerableSet.UintSet;
    using Counters for Counters.Counter;

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
        // The number of periods in which user can claim tokens
        uint256 claimablePeriods;
    }

    /// @notice Address of the Maze token
    address public maze;
    /// @notice Address of the Farming contract
    address public farming;
    /// @notice Address of the Blacklist contract
    address public blacklist;

    /// @dev Used to convert from BPs to percents and vice versa
    uint256 private constant _converter = 1e4;

    /// @dev IDs of vestings
    Counters.Counter private _vestingIds;

    /// @dev Mapping from user to IDs of vestings assigned to him
    ///      Each user can have multiple vestings assigned to him
    mapping(address => EnumerableSet.UintSet) private _usersToIds;

    /// @dev Mapping from vesting ID to the vesting itself
    mapping(uint256 => TokenVesting) private _idsToVestings;

    /// @dev Last month number when user claimed tokens
    mapping(address => mapping(uint256 => uint256)) private _lastClaimMonth;

    /// @dev Amount of tokens claimed by the user in each vesting
    ///      Used to check that user has claimed the whole vesting
    mapping(address => mapping(uint256 => uint256)) private _claimedAmountInId;

    /// @dev IDs of vestings in which user has claimed cliff amount
    ///      Used to prevent user from claiming cliff multiple times
    mapping(address => mapping(uint256 => bool)) private _claimedCliffInId;

    /// @dev Numbers of periods user has claimed in the vesting
    ///      [User address => vesting ID => month number => bool]
    ///      Used to skip periods that user has already claimed
    mapping(address => mapping(uint256 => mapping(uint256 => bool)))
        private _claimedMonthsInId;

    /// @notice Checks that account is not blacklisted
    modifier ifNotBlacklisted(address account) {
        require(
            !IBlacklist(blacklist).checkBlacklisted(account),
            "Maze: Account is blacklisted"
        );
        _;
    }

    constructor(address maze_, address farming_, address blacklist_) {
        require(maze_ != address(0), "Vesting: Maze cannot have zero address");
        require(
            farming_ != address(0),
            "Vesting: Farming cannot have zero address"
        );
        require(
            blacklist_ != address(0),
            "Vesting: Blacklist cannot have zero address"
        );
        maze = maze_;
        farming = farming_;
        blacklist = blacklist_;
    }

    /// @notice See {IVesting-getUsersVestings}
    function getUserVestings(
        address user
    ) public view returns (uint256[] memory) {
        require(user != address(0), "Vesting: User cannot have zero address");
        return _usersToIds[user].values();
    }

    /// @notice See {IVesting-getVesting}
    function getVesting(
        uint256 id
    )
        public
        view
        returns (
            address, // to
            uint256, // amount
            uint256, // startTime
            uint256, // cliffDuration
            uint256, // cliffUnlock
            uint256 // claimablePeriods
        )
    {
        require(id <= _vestingIds.current(), "Vesting: Vesting does not exist");

        TokenVesting memory vesting = _idsToVestings[id];

        return (
            vesting.to,
            vesting.amount,
            vesting.startTime,
            vesting.cliffDuration,
            vesting.cliffUnlock,
            vesting.claimablePeriods
        );
    }

    /// @notice See {IVesting-setMaze}
    function setMaze(
        address newMaze
    ) public onlyOwner ifNotBlacklisted(msg.sender) {
        require(
            newMaze != address(0),
            "Vesting: Token cannot have zero address"
        );

        maze = newMaze;

        emit MazeChanged(newMaze);
    }

    /// @notice See {IVesting-setFarming}
    function setFarming(
        address newFarming
    ) public onlyOwner ifNotBlacklisted(msg.sender) {
        require(
            newFarming != address(0),
            "Vesting: Farming cannot have zero address"
        );

        farming = newFarming;

        emit FarmingChanged(newFarming);
    }

    /// @notice See {IVesting-startVesting}
    function startVesting(
        address to,
        uint256 amount,
        uint256 cliffDuration,
        uint256 cliffUnlock,
        uint256 claimablePeriods
    ) public onlyOwner ifNotBlacklisted(msg.sender) ifNotBlacklisted(to) {
        require(to != address(0), "Vesting: Reciever cannot be zero address");
        require(amount != 0, "Vesting: Amount cannot be zero");
        require(cliffDuration > 0, "Vesting: Cliff duration cannot be zero");
        require(cliffUnlock < 1e4, "Vesting: Whole amount cannot be unlocked");
        require(
            claimablePeriods > 0,
            "Vesting: Number of periods cannot be zero"
        );

        // NOTICE: User must approve this transfer first

        // Transfer all tokens to the Vesting contract first
        IMaze(maze).transferFrom(msg.sender, address(this), amount);

        // Vesting IDs start with 1
        _vestingIds.increment();
        uint256 id = _vestingIds.current();

        // Create a new vesting
        TokenVesting memory vesting = TokenVesting({
            id: id,
            to: to,
            startTime: block.timestamp,
            amount: amount,
            cliffDuration: cliffDuration,
            cliffUnlock: cliffUnlock,
            claimablePeriods: claimablePeriods
        });

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
            claimablePeriods
        );
    }

    /// @notice See {IVesting-claimVesting}
    function claimTokens() public ifNotBlacklisted(msg.sender) {
        // Calculate the vested amount using the schedule
        uint256 vestedAmount = _calculateVestedAmount(msg.sender);

        // Transfer vested tokens from Farming to the user
        // NOTE: This does not claim the reward for Farming.
        IFarming(farming).unlockOnBehalf(msg.sender, vestedAmount);

        emit TokensClaimed(msg.sender);
    }

    /// @dev Calculates amount of vested tokens available for claim for the user
    /// @param user The address of the user to calculated vested tokens for
    function _calculateVestedAmount(address user) private returns (uint256) {
        console.log("\nIn _calculateVestedAmount:");
        // Total amount available for the user
        uint256 totalAvailableAmount;

        console.log("Number of vestings: ", _usersToIds[user].length());
        // Iterate over all vestings assigned to the user
        // and calculate vested amount for each of them
        for (uint256 i = 0; i < _usersToIds[user].length(); i++) {
            uint256 vestingId = _usersToIds[user].at(i);

            console.log("Processing vesting: ", vestingId);
            TokenVesting memory vesting = _idsToVestings[vestingId];
            // If claimed amount for the current vesting is equal to
            // its total amount, user has claimed the vesting completely
            if (_claimedAmountInId[user][vestingId] == vesting.amount) {
                console.log("Vesting has been claimed. Skip it");
                continue;
            }
            require(
                vesting.startTime + vesting.cliffDuration < block.timestamp,
                "Vesting: Cliff not reached"
            );
            console.log("Cliff reached");

            // If cliff was reached, cliff amount is claimed
            uint256 amountUnlockedOnCliff = (vesting.amount *
                vesting.cliffUnlock) / _converter;
            uint256 amount = vesting.amount - amountUnlockedOnCliff;
            console.log("Amount unlocked on cliff: ", amountUnlockedOnCliff);

            // If cliff amount was not claimed - claim it
            if (!_claimedCliffInId[user][vestingId]) {
                console.log("Cliff was not claimed. Claim it");
                _claimedCliffInId[user][vestingId] = true;
                // If cliff was reached, some part of total amount is available
                totalAvailableAmount += amountUnlockedOnCliff;
                // Mark that user has claimed specific amount in the current vesting
                _claimedAmountInId[user][vestingId] += amountUnlockedOnCliff;
                console.log(
                    "Available amount after cliff is: ",
                    totalAvailableAmount
                );
            }

            // Each month the same amount is vested
            uint256 amountPerMonth = amount / vesting.claimablePeriods;
            console.log("Amount per month is: ", amountPerMonth);

            // Calculate the number of months since cliff
            uint256 timeSinceCliff = block.timestamp -
                (vesting.startTime + vesting.cliffDuration);
            // Each claim period is one month. Cannot be changed
            uint256 oneMonth = 1 days * 30;
            uint256 monthsSinceCliff = timeSinceCliff / oneMonth;

            console.log("Months since cliff: ", monthsSinceCliff);

            // Check if user has already claimed in the current month
            require(
                !_claimedMonthsInId[user][vestingId][monthsSinceCliff],
                "Vesting: Cannot claim in this month anymore"
            );

            // If it's zero - user hasn't claimed any months yet
            uint256 unclaimedMonths = 0;
            // If user has already claimed some part of this vesting (several months),
            // calculate the difference between the current month and the month he claimed
            // The resulting amount of months will be used to calculate the available amount
            if (monthsSinceCliff > _lastClaimMonth[user][vestingId]) {
                unclaimedMonths =
                    monthsSinceCliff -
                    _lastClaimMonth[user][vestingId];
            }

            console.log("Months to claim for: ", unclaimedMonths);

            // Maximum number of months to claim for is
            // the number of periods of vesting
            if (unclaimedMonths > vesting.claimablePeriods) {
                console.log("Months passed greater than number of periods");
                unclaimedMonths = vesting.claimablePeriods;
            }

            // Mark that user has claimed all months since cliff to the current month
            _claimedMonthsInId[user][vestingId][monthsSinceCliff] = true;

            // Mark the last month user has claimed vestings
            _lastClaimMonth[user][vestingId] = monthsSinceCliff;

            // Mark that user has claimed specific amount in the current vesting
            _claimedAmountInId[user][vestingId] +=
                unclaimedMonths *
                amountPerMonth;

            // Increment total claimed amount
            // Use only unclaimed months
            totalAvailableAmount += unclaimedMonths * amountPerMonth;

            console.log(
                "Available amount after claim of all months is: ",
                totalAvailableAmount
            );
            console.log("Vesting amount is:", vesting.amount);
        }

        console.log(
            "After all pariods total available amount is: ",
            totalAvailableAmount
        );

        return totalAvailableAmount;
    }
}
