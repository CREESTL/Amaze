// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFarming.sol";
import "./interfaces/ICore.sol";
import "./interfaces/IMaze.sol";

// TODO remove logs.
import "hardhat/console.sol";

/// @title The rewards farming contract
contract Farming is IFarming, Ownable, Pausable {
    using SafeERC20 for ERC20;

    /// @dev Structure representing a single farming
    struct TokenFarming {
        // The amount of tokens locked
        // Gets increased on lock and decreased on unlock
        uint256 lockedAmount;
        // Moments when user's lock was changed
        // Gets reset afteer reward claim
        uint256[] lockChangesTimes;
        // Amounts to which user's lock was changed
        // [timestamp => new lock amount]
        // DOES NOT get reset afteer reward claim
        mapping(uint256 => uint256) lockChanges;
        // The max value of `lockedAmount` during farming
        // The moment farming was started or resumed
        // Gets reset after reward claim
        uint256 startTime;
        // Time of full unlock
        // Gets reset on each lock and after reward claim
        uint256 endTime;
        // The reward for farming
        // Gets reset after reward claim
        uint256 reward;
        // Number of times reward was claimed
        // 2 times are required to claim
        // Gets reset on each lock and after reward claim
        uint256 claimedTimes;
        // Time of first claim
        // Gets reset on each lock and after reward claim
        uint256 firstClaimTime;
    }

    /// @notice The address of the Core contract
    ICore public core;

    /// @notice The minumum lock period.
    ///         During this period after lock users cannot unlock tokens.
    ///         By default period is 1 month.
    //      because cliff can be less than min locking period
    uint256 public minLockPeriod = 1 days * 30;
    /// @notice The minimum gap between two calls of `claim` function.
    ///         After that gap tokens are actually claimed
    uint256 public minClaimGap = 1 days * 365;
    /// @notice The daily rate of rewards
    ///         Is represented in Basis Points
    uint256 public dailyRate = 300;
    /// @dev The initial value of `dailyRate`.
    ///      Used to calculate reward for first period
    uint256 constant initialDailyRate = 300;
    /// @dev Value used to convert between percents and basis points;
    uint256 private _converter = 1e4;

    /// @dev Mapping showing daily rate changes
    // [time => new rate]
    mapping(uint256 => uint256) private _rateChanges;
    /// @dev Array of moments when daily rate was changed.
    ///      Has at least 1 element
    uint256[] private _rateChangesTimes;

    /// @dev Mapping from user to his farming
    mapping(address => TokenFarming) private _usersToFarmings;

    /// @dev Allows only the Vesting contract to call functions
    modifier onlyVesting() {
        require(msg.sender == core.vesting(), "Farming: Caller is not Vesting");
        _;
    }

    /// @notice Checks that account is not blacklisted
    modifier ifNotBlacklisted(address account) {
        require(
            !core.checkBlacklisted(account),
            "Farming: Account is blacklisted"
        );
        _;
    }

    constructor(address core_) {
        require(core_ != address(0), "Farming: Core cannot have zero address");
        core = ICore(core_);
    }

    /// @notice See {IFarming-pause}
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice See {IFarming-unpause}
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice See {IFarming-getFarming}
    function getFarming(
        address user
    ) external view returns (uint256, uint256, uint256, uint256) {
        require(user != address(0), "Farming: User cannot have zero address");
        TokenFarming storage farming = _usersToFarmings[user];
        return (
            farming.lockedAmount,
            farming.startTime,
            farming.endTime,
            farming.reward
        );
    }

    /// @notice See {IFarming-getReward}
    function getReward(address user) external view returns (uint256) {
        require(user != address(0), "Farming: User cannot have zero address");
        console.log("\nIn getReward");
        return _recalculateReward(user);
    }

    /// @notice See {IFarming-setMinLockPeriod}
    function setMinLockPeriod(uint256 period) external onlyOwner whenNotPaused {
        minLockPeriod = period;
        emit MinLockPeriodChanged(period);
    }

    /// @notice See {IFarming-setDailyRate}
    function setDailyRate(uint256 rate) external onlyOwner whenNotPaused {
        dailyRate = rate;

        _rateChanges[block.timestamp] = rate;
        _rateChangesTimes.push(block.timestamp);

        emit DailyRateChanged(rate);
    }

    /// @notice See {IFarming-lockOnBehalf}
    function lockOnBehalf(
        address admin,
        address user,
        uint256 amount
    )
        external
        whenNotPaused
        onlyVesting
        ifNotBlacklisted(msg.sender)
        ifNotBlacklisted(admin)
        ifNotBlacklisted(user)
    {
        _lock(user, amount);

        // Transfer tokens from the admin to this contract
        ERC20(core.maze()).safeTransferFrom(admin, address(this), amount);

        emit LockedOnBehalf(admin, user, amount);
    }

    /// @notice See {IFarming-lock}
    function lock(
        uint256 amount
    ) external whenNotPaused ifNotBlacklisted(msg.sender) {
        _lock(msg.sender, amount);

        // Transfer tokens from the user to this contract
        ERC20(core.maze()).safeTransferFrom(msg.sender, address(this), amount);

        emit Locked(msg.sender, amount);
    }

    /// @notice See {IFarming-unlock}
    function unlock(
        uint256 amount
    ) external whenNotPaused ifNotBlacklisted(msg.sender) {
        _unlock(msg.sender, amount);
        emit Unlocked(msg.sender, amount);
    }

    /// @notice See {IFarming-unlockAll}
    function unlockAll() external whenNotPaused ifNotBlacklisted(msg.sender) {
        uint256 totalLock = _usersToFarmings[msg.sender].lockedAmount;
        _unlock(msg.sender, totalLock);
        emit Unlocked(msg.sender, totalLock);
    }

    /// @notice See {IFarming-unlockFromVesting}
    function unlockFromVesting(
        address user,
        uint256 amount
    )
        external
        onlyVesting
        whenNotPaused
        ifNotBlacklisted(user)
        ifNotBlacklisted(msg.sender)
    {
        _unlock(user, amount);

        emit Unlocked(user, amount);
    }

    /// @notice See {IFarming-claim}
    function claim() external whenNotPaused ifNotBlacklisted(msg.sender) {
        TokenFarming storage farming = _usersToFarmings[msg.sender];


        // If locked amount is zero but start time is not zero, that
        // means that farming has been started some time before, but
        // user unlocked all of his tokens.
        // That is the main condition to allow him to claim reward.
        require(
            farming.lockedAmount == 0 && farming.startTime > 0,
            "Farming: Unable to claim before full unlock"
        );

        // First call of this function does not really claim tokens
        if (farming.claimedTimes == 0) {
            farming.claimedTimes = 1;
            farming.firstClaimTime = block.timestamp;

            emit ClaimAttempt(msg.sender);

            // Claim tokens on the second call
        } else if (farming.claimedTimes == 1) {
            // Check that at least one year has passed since first call
            require(
                block.timestamp >= farming.firstClaimTime + minClaimGap,
                "Farming: Minimum interval between claimes not passed"
            );

            ERC20(core.maze()).safeTransfer(msg.sender, farming.reward);

            // Life cycle of farming ends after claim
            // Reset farming info
            farming.startTime = 0;
            farming.endTime = 0;
            farming.reward = 0;
            farming.claimedTimes = 0;
            farming.firstClaimTime = 0;
            delete farming.lockChangesTimes;

            emit Claimed(msg.sender, farming.reward);
        }
    }

    /// @dev Recalculates user's rewards
    /// @param user The address of the user to recalculate rewards of
    /// @return The new reward of the user
    function _recalculateReward(address user) private view returns (uint256) {
        require(user != address(0), "Farming: User cannot have zero address");

        console.log("===\nIn _recalculateReward");
        TokenFarming storage farming = _usersToFarmings[user];

        // Period to calculate rewards for
        // This is the time from the start of farming till the current moment
        uint256 periodStart = farming.startTime;
        uint256 periodEnd = block.timestamp;
        uint256 period = periodEnd - periodStart;

        console.log("Period starts at: ", periodStart);
        console.log("Period ends at:   ", periodEnd);
        console.log("Period lasts for:  ", period);

        // If farming has just started, no rewards are assigned to the user
        if (period == 0) {
            console.log("Period is 0 seconds. No rewards");
            return 0;
        }

        console.log("Total times rate changed for all users: ", _rateChangesTimes.length);

        // The reward for the whole period
        // Common formula for reward is:
        // reward = (userLock * dailyRate * periodSeconds) / (10_000 * 24)
        uint256 reward;
        // The index of last time rate was changed during the period
        uint256 lastRateChangeIndexInPeriod;

        uint256 lockedAmount;
        uint256 previousRate;
        
        bool firstChangeInPeriodPassed;

        if (_rateChangesTimes.length > 0) {
            // Process all rate changes in period
            for (
                uint256 i = 0;
                i < _rateChangesTimes.length;
                i++
            ) {
                
                console.log("-\nProcessing rate change happened at: ", _rateChangesTimes[i]);

                // TODO Delete it
                if (_rateChangesTimes[i] < periodStart) {
                    console.log("RATE CANT CHANGE BEFORE PERIOD");

                } else if (
                    // Rate was changed during the period
                    _rateChangesTimes[i] >= periodStart &&
                    _rateChangesTimes[i] <= periodEnd
                ) {
                    console.log("Rate was changed inside current period");
                    // Time from the last rate change to the current rate change
                    uint256 timeBeforeRateChange;
                    if (!firstChangeInPeriodPassed) {
                        // If rate was not changed since the start of period,
                        // use time from the start of the period till
                        // the change of rate
                        console.log(
                            "That is the first time rate was changed inside current period"
                        );

                        firstChangeInPeriodPassed = true;
                        
                        timeBeforeRateChange = _rateChangesTimes[i] - periodStart - 1;
                        lockedAmount = _findLockedAmount(user, periodStart, _rateChangesTimes[i]);
                        if (i > 0) {
                            // If rate was changed some time before current period, 
                            // use that value
                            previousRate = _rateChanges[_rateChangesTimes[i - 1]];
                        } else {
                            // If this is the very first rate change ever,
                            // use the default rate
                            previousRate = initialDailyRate;
                        }

                    } else {
                        // If rate has been changed since the start of period,
                        // use time from the previous rate change till
                        // the current rate change
                        console.log("This is *not* the first time rate was changed inside current period");
                        timeBeforeRateChange = _rateChangesTimes[i] - _rateChangesTimes[lastRateChangeIndexInPeriod] - 1;
                        lockedAmount = _findLockedAmount(user, _rateChangesTimes[lastRateChangeIndexInPeriod], _rateChangesTimes[i]);
                        previousRate = _rateChanges[_rateChangesTimes[i - 1]];

                    }
                    console.log("Counting reward 1");
                    console.log("Old reward: ", reward);
                    console.log("Locked amount: ", lockedAmount);
                    console.log("Previous rate: ", previousRate);
                    console.log("Time *before* rate was changed: ", timeBeforeRateChange);
                    reward += (lockedAmount * previousRate * timeBeforeRateChange) / (_converter * 24 hours);
                    console.log("Reward is now: ", reward);

                    // Mark that current rate change time is the last in the period
                    lastRateChangeIndexInPeriod = i;

                    // If it's the last rate change in the period, increase
                    // the reward by the amount from that change till the end of the period
                    // TODO not sure about that
                    console.log("Last change index in period is: ", lastRateChangeIndexInPeriod);
                    console.log("Length is: ", _rateChangesTimes.length);
                    if (lastRateChangeIndexInPeriod == _rateChangesTimes.length - 1) {
                        console.log("Calculating reward until the end of period");
                        // Time from the last rate change to the end of period
                        uint256 timeAfterRateChange = periodEnd - _rateChangesTimes[i];
                        lockedAmount = _findLockedAmount(user, _rateChangesTimes[i], periodEnd);
                        previousRate = _rateChanges[_rateChangesTimes[lastRateChangeIndexInPeriod]];

                        console.log("Counting reward 2");
                        console.log("Old reward: ", reward);
                        console.log("Locked amount: ", lockedAmount);
                        console.log("Previous rate: ", previousRate);
                        console.log("Time *after* rate was changed: ", timeAfterRateChange);
                        reward += (lockedAmount * previousRate * timeAfterRateChange) / (_converter * 24 hours);
                        console.log("Reward is now: ", reward);
                        
                    }
                        

                // TODO delete it
                } else if (_rateChangesTimes[i] > periodEnd) {
                    console.log("RATE CANT CHANGE AFTER PERIOD");
                }

            }
            
        } else {
            // If no rate changes ever happened, calculate reward
            // only based on lock changes
            console.log("No rate changes ever happened after constructor");
            uint256 defaultRate = initialDailyRate;
            for (
                uint256 i = 0;
                i < farming.lockChangesTimes.length;
                i++
            ) {
                if (i > 0) {
                    // If lock was changed after start of farming, process each lock change
                    console.log("Lock was changed some time after constructor");
                    uint256 timeBeforeLockChange = farming.lockChangesTimes[i] - farming.lockChangesTimes[i - 1] - 1;
                    lockedAmount = _findLockedAmount(user, farming.lockChangesTimes[i - 1], farming.lockChangesTimes[i]);
                    console.log("Counting reward 3");
                    console.log("Old reward: ", reward);
                    console.log("Locked amount: ", lockedAmount);
                    console.log("Default rate: ", defaultRate);
                    console.log("Time *before* lock was changed: ", timeBeforeLockChange);
                    reward += (lockedAmount * defaultRate * timeBeforeLockChange) / (_converter * 24 hours);
                    console.log("Reward is now: ", reward);
                    
                    // If this is the latest lock change in the period (and it's not at the end of period),
                    // calculate the reward for time from this lock change till the end of period
                    if (i == farming.lockChangesTimes.length - 1 && farming.lockChangesTimes[i] != periodEnd) {
                        console.log("This is the last lock change in period. Calculate reward till the end of period");
                        uint256 timeAfterLockChange = periodEnd - farming.lockChangesTimes[i];
                        lockedAmount = _findLockedAmount(user, farming.lockChangesTimes[i], periodEnd);
                        console.log("Counting reward 4");
                        console.log("Old reward: ", reward);
                        console.log("Locked amount: ", lockedAmount);
                        console.log("Default rate: ", defaultRate);
                        console.log("Time *after* lock was changed: ", timeAfterLockChange);
                        reward += (lockedAmount * defaultRate * timeAfterLockChange) / (_converter * 24 hours);
                        console.log("Reward is now: ", reward);
                        
                    }
                }
                if (i == 0 && farming.lockChangesTimes.length == 1){
                    // If lock was only set at start of farming, 
                    console.log("Lock was only set at start of farming");
                    uint256 timeAfterLockChange = periodEnd - farming.lockChangesTimes[i];
                    lockedAmount = _findLockedAmount(user, farming.lockChangesTimes[0], periodEnd);
                    console.log("Counting reward 5");
                    console.log("Old reward: ", reward);
                    console.log("Locked amount: ", lockedAmount);
                    console.log("Default rate: ", defaultRate);
                    console.log("Time *after* lock was changed: ", timeAfterLockChange);
                    reward += (lockedAmount * defaultRate * timeAfterLockChange) / (_converter * 24 hours);
                    console.log("Reward is now: ", reward);
                }
            }
        }

        console.log("FINAL REWARD IS: ", reward);
        console.log("===");
        return reward;
    }

    /// @dev Checks farming lock history to find locked amount
    ///      in a specific period.
    /// @param user The user farming tokens
    /// @param periodStart The time period started
    /// @param periodEnd The time period ended
    /// @return Locked amount of the user in the specified period
    function _findLockedAmount(
        address user,
        uint256 periodStart,
        uint256 periodEnd
    ) private view returns (uint256) {
        TokenFarming storage farming = _usersToFarmings[user];
        
        console.log("\nIn _findLockedAmount");

        console.log("Search start: ", periodStart);
        console.log("Search end:   ", periodEnd);
        uint256 lastLock;
        for (uint256 i = 0; i < farming.lockChangesTimes.length; i++) {
            uint256 changeTime = farming.lockChangesTimes[i];

            console.log("Processing lock change time: ", changeTime);
            // If user did not change his lock inside the period, use the last
            // lock before the period
            if (changeTime < periodStart) {
                // TODO is it possible? delete?
                console.log("Lock was changed before search region");
                lastLock = farming.lockChanges[changeTime];
            }
            // If user changed his lock inside the period, use the new lock
            if (changeTime >= periodStart && changeTime < periodEnd) {
                console.log("Lock was changed inside search region");
                lastLock = farming.lockChanges[changeTime];

            }
            
            console.log("Last lock is: ", lastLock);
        }
        
        console.log("FINAL LOCK IS: ", lastLock);
        console.log("\n");

        return lastLock;
    }

    /// @dev Locks tokens of the user
    /// @param user The address of the user who is locking tokens
    /// @param amount The amount of locked tokens
    function _lock(address user, uint256 amount) private {
        require(user != address(0), "Farming: User cannot have zero address");
        require(amount > 0, "Farming: Lock amount cannot be zero");

        console.log("\nIn _lock:");

        TokenFarming storage farming = _usersToFarmings[user];

        // If farming was not started yet - mark the start time
        if (farming.startTime == 0) {
            farming.startTime = block.timestamp;
        }

        // After each lock info about previous claims gets reset
        // Any locked amount forbids user to claim
        // End time also gets reset as farming continues
        farming.claimedTimes = 0;
        farming.firstClaimTime = 0;
        farming.endTime = 0;

        // Increase locked amount
        farming.lockedAmount += amount;

        // Update lock changes history
        farming.lockChangesTimes.push(block.timestamp);
        farming.lockChanges[block.timestamp] = farming.lockedAmount;

        // Recalculate reward using old lock amount
        farming.reward = _recalculateReward(user);


    }

    /// @dev Unlocks tokens of the user
    /// @dev user The address of the user who is unlocking tokens
    /// @dev amount The amount of tokens to unlock
    function _unlock(address user, uint256 amount) private {
        require(user != address(0), "Farming: User cannot have zero address");
        require(amount > 0, "Farming: Unlock amount cannot be zero");

        console.log("\nIn _unlock:");

        TokenFarming storage farming = _usersToFarmings[user];
        require(farming.lockedAmount > 0, "Farming: No tokens to unlock");
        require(
            farming.lockedAmount >= amount,
            "Farming: Unlock greater than lock"
        );

        // If unlock is made from Vesting contract, ignore minimum locking period
        if (msg.sender != core.vesting()) {
            require(
                block.timestamp >= farming.startTime + minLockPeriod,
                "Farming: Minimum lock period has not passed yet"
            );
        }

        console.log("Total locked amount is: ", farming.lockedAmount);
        console.log("Trying to unlock: ", amount);

        // Decrease locked amount
        farming.lockedAmount -= amount;

        // Update lock changes history
        farming.lockChangesTimes.push(block.timestamp);
        farming.lockChanges[block.timestamp] = farming.lockedAmount;

        // Recalculate reward using old lock amount
        farming.reward = _recalculateReward(user);

        // If all tokens have been unlocked - mark that
        if (farming.lockedAmount == 0) {
            farming.endTime = block.timestamp;
        }

        // Transfer tokens straight to the user
        ERC20(core.maze()).safeTransfer(user, amount);
    }
}
