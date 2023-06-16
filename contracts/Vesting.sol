// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IVesting.sol";
import "./interfaces/IFarming.sol";
import "./interfaces/IMaze.sol";
import "./interfaces/ICore.sol";

// TODO remove logs
import "hardhat/console.sol";

/// @title The contract for Maze tokens vesting
contract Vesting is IVesting, Ownable, Pausable {
    using SafeERC20 for ERC20;
    using EnumerableSet for EnumerableSet.UintSet;
    using Counters for Counters.Counter;

    /// @notice Address of the Core contract
    ICore public core;

    /// @dev Used to convert from BPs to percents and vice versa
    uint256 private constant _converter = 1e4;

    /// @dev IDs of vestings
    Counters.Counter private _vestingIds;

    /// @dev Mapping from user to IDs of vestings assigned to him
    ///      Each user can have multiple vestings assigned to him
    mapping(address => EnumerableSet.UintSet) private _usersToIds;

    /// @dev Mapping from vesting ID to the vesting itself
    mapping(uint256 => TokenVesting) private _idsToVestings;

    /// @dev Numbers of periods user has claimed in the vesting
    ///      [User address => vesting ID => period number => bool]
    ///      Used to skip periods that user has already claimed
    mapping(address => mapping(uint256 => mapping(uint256 => bool)))
        private _claimedPeriodsInId;

    /// @notice Checks that account is not blacklisted
    modifier ifNotBlacklisted(address account) {
        require(
            !core.checkBlacklisted(account),
            "Maze: Account is blacklisted"
        );
        _;
    }

    constructor(address core_) {
        require(
            core_ != address(0),
            "Vesting: Blacklist cannot have zero address"
        );
        core = ICore(core_);
    }

    /// @notice See {IVesting-getUsersVestings}
    function getUserVestings(
        address user
    ) external view returns (uint256[] memory) {
        require(user != address(0), "Vesting: User cannot have zero address");
        return _usersToIds[user].values();
    }

    /// @notice See {IVesting-getVesting}
    function getVesting(
        uint256 id
    )
        external
        view
        returns (
            VestingStatus, // status
            address, // to
            uint256, // amount
            uint256, //amountClaimed
            uint256, // startTime
            uint256, // cliffDuration
            uint256, // cliffUnlock
            bool, // cliffClaimed
            uint256, // claimablePeriods
            uint256 // lastClaimedPeriod
        )
    {
        require(id <= _vestingIds.current(), "Vesting: Vesting does not exist");

        TokenVesting memory vesting = _idsToVestings[id];

        return (
            vesting.status,
            vesting.to,
            vesting.amount,
            vesting.amountClaimed,
            vesting.startTime,
            vesting.cliffDuration,
            vesting.cliffUnlock,
            vesting.cliffClaimed,
            vesting.claimablePeriods,
            vesting.lastClaimedPeriod
        );
    }

    /// @notice See {IVesting-startVesting}
    function startVesting(
        address to,
        uint256 amount,
        uint256 cliffDuration,
        uint256 cliffUnlock,
        uint256 claimablePeriods
    ) external onlyOwner ifNotBlacklisted(to) {
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
        ERC20(core.maze()).safeTransferFrom(msg.sender, address(this), amount);

        // Vesting IDs start with 1
        _vestingIds.increment();
        uint256 id = _vestingIds.current();

        // Create a new vesting
        TokenVesting memory vesting = TokenVesting({
            id: id,
            status: VestingStatus.InProgress,
            to: to,
            startTime: block.timestamp,
            amount: amount,
            amountClaimed: 0,
            cliffDuration: cliffDuration,
            cliffUnlock: cliffUnlock,
            cliffClaimed: false,
            claimablePeriods: claimablePeriods,
            lastClaimedPeriod: 0
        });

        // Mark that this vesting is assigned to the user
        _usersToIds[to].add(id);

        // Link vesting with its ID
        _idsToVestings[id] = vesting;

        // Transfer tokens to the Farming contract
        ERC20(core.maze()).approve(core.farming(), amount);
        IFarming(core.farming()).lockOnBehalf(to, amount);

        emit VestingStarted(
            to,
            amount,
            cliffDuration,
            cliffUnlock,
            claimablePeriods
        );
    }

    /// @notice See {IVesting-claimVesting}
    function claimTokens() external ifNotBlacklisted(msg.sender) {
        // Calculate the vested amount using the schedule
        uint256 vestedAmount = _calculateVestedAmount(msg.sender);

        if (vestedAmount > 0) {
            // Transfer vested tokens from Farming to the user
            // NOTE: This does not claim the reward for Farming.
            IFarming(core.farming()).unlockOnBehalf(msg.sender, vestedAmount);

            emit TokensClaimed(msg.sender, vestedAmount);
        }
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
            TokenVesting storage vesting = _idsToVestings[vestingId];

            // Skip claimed vestings
            if (vesting.status == VestingStatus.Claimed) {
                console.log("Vesting has been claimed. Skip it");
                continue;
            }

            // If cliff of the current vesting was not reached - skip this vesting
            if (vesting.startTime + vesting.cliffDuration > block.timestamp) {
                continue;
            }
            console.log("Cliff reached");

            // If cliff was reached, cliff amount is claimed
            uint256 amountUnlockedOnCliff = (vesting.amount *
                vesting.cliffUnlock) / _converter;
            uint256 amount = vesting.amount - amountUnlockedOnCliff;
            console.log("Amount unlocked on cliff: ", amountUnlockedOnCliff);

            // If cliff amount was not claimed - claim it
            if (!vesting.cliffClaimed) {
                console.log("Cliff was not claimed. Claim it");
                // If cliff was reached, some part of total amount is available
                totalAvailableAmount += amountUnlockedOnCliff;
                // Mark that user has claimed specific amount in the current vesting
                vesting.amountClaimed += amountUnlockedOnCliff;
                // Mark that cliff was claimed
                vesting.cliffClaimed = true;
                console.log(
                    "Available amount after cliff is: ",
                    totalAvailableAmount
                );
            }

            // Each period the same amount is vested
            uint256 amountPerPeriod = amount / vesting.claimablePeriods;
            console.log("Amount per period is: ", amountPerPeriod);

            // Calculate the number of periods since cliff
            uint256 timeSinceCliff = block.timestamp -
                (vesting.startTime + vesting.cliffDuration);
            // Each claim period is one period. Cannot be changed
            uint256 onePeriod = 1 days * 30;
            console.log("Time since cliff: ", timeSinceCliff);
            uint256 periodsSinceCliff = timeSinceCliff / onePeriod;

            console.log("Periods since cliff: ", periodsSinceCliff);

            // If user has already claimed current vesting in current period - skip this vesting
            if (_claimedPeriodsInId[user][vestingId][periodsSinceCliff]) {
                continue;
            }

            // If it's zero - user hasn't claimed any periods yet
            uint256 unclaimedPeriods = 0;
            // If user has already claimed some part of this vesting (several periods),
            // calculate the difference between the current period and the period he claimed
            // The resulting amount of periods will be used to calculate the available amount
            if (periodsSinceCliff > vesting.lastClaimedPeriod) {
                unclaimedPeriods =
                    periodsSinceCliff -
                    vesting.lastClaimedPeriod;
                console.log("Periods to claim for: ", unclaimedPeriods);
                // If there are too many unclaimed periods (user hasn't claimed
                // for a long time), decrease them. They cannot be greater than
                // the number of periods from last claimed period to
                // the last claimable period
                if (unclaimedPeriods > vesting.claimablePeriods) {
                    console.log(
                        "Periods passed greater than number of periods. Decrease periods to claim for"
                    );
                    unclaimedPeriods =
                        vesting.claimablePeriods -
                        vesting.lastClaimedPeriod;
                    console.log("Now Periods to claim for: ", unclaimedPeriods);
                }
            }

            // Mark that user has claimed all periods since cliff to the current period
            _claimedPeriodsInId[user][vestingId][periodsSinceCliff] = true;

            // Mark the last period user has claimed vestings
            vesting.lastClaimedPeriod += unclaimedPeriods;

            // Mark that user has claimed specific amount in the current vesting
            vesting.amountClaimed += unclaimedPeriods * amountPerPeriod;

            // Increment total claimed amount
            // Use only unclaimed periods
            totalAvailableAmount += unclaimedPeriods * amountPerPeriod;

            // If user has claimed the last period, the whole vesting was claimed
            if (vesting.lastClaimedPeriod == vesting.claimablePeriods) {
                console.log("Last period claimed. Vesting finished.");
                vesting.status = VestingStatus.Claimed;
            }

            console.log("CLAIMED IN ONE VESTING: ", totalAvailableAmount);
            console.log("Vesting amount is:", vesting.amount);
        }

        console.log("TOTAL CLAIMED: ", totalAvailableAmount);

        return totalAvailableAmount;
    }
}
