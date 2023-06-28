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
        mapping(uint256 => uint256) lockChangesAmounts;
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
        // Time of the recalculation of rewards
        // Gets reset after reward claim
        uint256 lastRewardRecalcTime;
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
    // TODO which default value to use?
    uint256 public dailyRate = 300; // 3%
    /// @dev Value used to convert between percents and basis points
    uint256 private _converter = 1e4;

    /// @dev Mapping showing daily rate changes
    // [time => new rate]
    mapping(uint256 => uint256) private _rateChanges;
    /// @dev Array of moments when daily rate was changed.
    ///      Has at least 1 element
    uint256[] private _rateChangesTimes;
    /// @dev The index of the latest element of `_rateChangesTimes`
    ///      that was used to calculate the reward of a user.
    ///      Has at least one key-value pair.
    // [user address => index of rate change in `_rateChangesTimes`]
    mapping(address => uint256) private _lastProcessedChangeTime;

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

        // Mark that rate was initialized
        // This timestamp counts as the zero second
        _rateChangesTimes.push(0);
        _rateChanges[0] = dailyRate;
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
        return _usersToFarmings[user].reward;
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

        require(farming.reward > 0, "Farming: Already claimed");

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
            // lockedAmount is already zero by now
            farming.startTime = 0;
            farming.endTime = 0;
            farming.reward = 0;
            farming.claimedTimes = 0;
            farming.firstClaimTime = 0;
            farming.lastRewardRecalcTime = 0;
            delete farming.lockChangesTimes;

            emit Claimed(msg.sender, farming.reward);
        }
    }

    /// @dev Recalculates user's rewards
    /// @param user The address of the user to recalculate rewards of
    /// @return The new reward of the user
    function _recalculateRewards(address user) private returns (uint256) {
        require(user != address(0), "Farming: User cannot have zero address");

        console.log("\nIn _recalculateRewards");
        TokenFarming storage farming = _usersToFarmings[user];

        // The period to calculate rewards for
        uint256 period;
        uint256 periodStart;
        uint256 periodEnd = block.timestamp;
        // If no recalculations have been done yet, period counts since
        // the start of the farming amount 
        if (farming.lastRewardRecalcTime == 0) {
            period = block.timestamp - farming.startTime;
            periodStart = farming.startTime;
            // In other case, period counts from last recalculation time
        } else {
            period = block.timestamp - farming.lastRewardRecalcTime;
            periodStart = farming.lastRewardRecalcTime;
        }
        
        console.log("Period started at: ", periodStart);
        console.log("Period ended at:   ", periodEnd);
        console.log("Period lasts for:  ", period);
        
        // If it's the first recalculation (first lock), no rewards are assigned to user
        if (period == 0) {
            console.log("Period is 0 seconds. No rewards");
            return 0;
        }

        // The reward for the whole period
        // Common formula for reward is:
        // reward = (userLock * dailyRate / 10000) * (hoursSinceLastRecalc / 24)
        uint256 reward;
        // The index of last time rate was changed during the period
        uint256 lastChangeIndexInPeriod;

        console.log("Total times rate changed: ", _rateChangesTimes.length);
        // Check if rate was changed during the period
        for (
            uint256 i = _lastProcessedChangeTime[user];
            i < _rateChangesTimes.length;
            i++
        ) {
            // Result of `lockedAmount * dailyRate / 10000`
            // First part of formula to calculate reward
            uint256 lockMulRate;
            if (i == 0) {
                // If rate was only changed once (in constructor), use that value
                console.log("Rate was changed only once in constructor");
                lockMulRate =
                    (_findLockedAmount(user, periodStart, periodEnd) *
                        _rateChanges[0]) /
                    _converter;
            } else {
                console.log("Rate was changed some time after the constructor");
                // Else use the previous rate
                lockMulRate =
                    (_findLockedAmount(user, periodStart, periodEnd) *
                        _rateChanges[_rateChangesTimes[i - 1]]) /
                    _converter;
            }
            
            // Rate was changed before the period
            // It also might start at the very first second of the period
            if (_rateChangesTimes[i] <= periodStart) {
                console.log("Rate was changed before the period");

                // Time in days from the last rate change to the current moment
                uint256 timeInDaysAfterChange = (periodEnd - _rateChangesTimes[i]) /
                    24 hours;
                console.log("Days *after* rate was changed: ", timeInDaysAfterChange);

                // Increase reward by the amount from last rate change till the end of the period
                reward +=
                    ((farming.lockedAmount *
                        _rateChanges[_rateChangesTimes[i]]) / _converter) *
                    timeInDaysAfterChange;
                console.log("Reward is now: ", reward);
                
            // Rate was changed during the period
            } else if (
                _rateChangesTimes[i] > periodStart &&
                _rateChangesTimes[i] < periodEnd
            ) {
                
                console.log("Rate was changed inside the period");
                // Time in days from the last rate change to the current one.
                // Second part of formula to calculate reward
                uint256 timeInDaysBeforeChange;
                // If rate was not changed since the start of period,
                // use time from the start of the period till
                // the change of rate
                if (lastChangeIndexInPeriod == 0) {
                    console.log("That is the first time rate was changed inside the period");
                    timeInDaysBeforeChange =
                        (_rateChangesTimes[i] - periodStart) /
                        24 hours;
                    // Else use time from the previous rate change time till
                    // the current rate change time
                    // Rate can change multiple times in one period
                } else {
                    timeInDaysBeforeChange =
                        (_rateChangesTimes[i] -
                            _rateChangesTimes[lastChangeIndexInPeriod]) /
                        24 hours;
                }

                console.log("Days *before* rate was changed: ", timeInDaysBeforeChange);
                // Increase reward by the amount for the part of period before rate change
                reward += lockMulRate * timeInDaysBeforeChange;
                console.log("Reward is now: ", reward);

                // Time in days from the last rate change to the end of period
                uint256 timeInDaysAfterChange = (periodEnd -
                    _rateChangesTimes[lastChangeIndexInPeriod]) /
                    24 hours;
                console.log("Days *after* rate was changed: ", timeInDaysAfterChange);

                // Increase reward by the amount for the part of period after rate change
                // Use latest rate
                // Use different amount than `lockMulRate`
                reward +=
                    ((farming.lockedAmount *
                        _rateChanges[_rateChangesTimes[i]]) / _converter) *
                    timeInDaysAfterChange;
                console.log("Reward is now: ", reward);

            // Rate was changed after the period
            } else if (_rateChangesTimes[i] > periodEnd) {
                console.log("Rate was changed after the period");
                reward += (lockMulRate * period) / 24 hours;
                console.log("Reward is now: ", reward);
            }

            lastChangeIndexInPeriod = i;
        }

        // Update the last processed rate change time
        _lastProcessedChangeTime[user] = lastChangeIndexInPeriod;

        // Update time when this calculation was made
        farming.lastRewardRecalcTime = block.timestamp;

        console.log("FINAL REWARD IS: ", reward);
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

        uint256 lastLock;
        for (uint256 i = 0; i < farming.lockChangesTimes.length; i++) {
            uint256 changeTime = farming.lockChangesTimes[i];

            // If user did not change his lock inside the period, use the last
            // lock before the period
            if (changeTime < periodStart) {
                lastLock = farming.lockChangesAmounts[changeTime];
            }
            // If user changed his lock inside the period, use the new lock
            if (changeTime > periodStart && changeTime < periodEnd) {
                lastLock = farming.lockChangesAmounts[changeTime];
            }
        }

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

        // Recalculate reward using old lock amount
        farming.reward = _recalculateRewards(user);

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
        farming.lockChangesAmounts[block.timestamp] = farming.lockedAmount;

        // If farming was not started yet - mark the start time
        if (farming.startTime == 0) {
            farming.startTime = block.timestamp;
        }

        console.log("Total locked amount is: ", farming.lockedAmount);
    }

    /// @dev Unlocks tokens of the user
    /// @dev user The address of the user who is unlocking tokens
    /// @dev amount The amount of tokens to unlock
    function _unlock(address user, uint256 amount) private {
        require(user != address(0), "Farming: User cannot have zero address");
        require(amount > 0, "Farming: Unlock amount cannot be zero");

        console.log("\nIn _unlock:");

        TokenFarming storage farming = _usersToFarmings[user];
        require(
            farming.lockedAmount > 0,
            "Farming: No tokens to unlock"
        );
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

        // Recalculate reward using old lock amount
        farming.reward = _recalculateRewards(user);

        // Decrease locked amount
        farming.lockedAmount -= amount;

        // Update lock changes history
        farming.lockChangesTimes.push(block.timestamp);
        farming.lockChangesAmounts[block.timestamp] = farming.lockedAmount;

        // If all tokens have been unlocked - mark that
        if (farming.lockedAmount == 0) {
            farming.endTime = block.timestamp;
        }

        // Transfer tokens straight to the user
        ERC20(core.maze()).safeTransfer(user, amount);
    }
}
