// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@prb/math/src/UD60x18.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFarming.sol";
import "./interfaces/ICore.sol";
import "./interfaces/IMaze.sol";

/// @title The rewards farming contract
contract Farming is IFarming, Ownable, Pausable {
    using SafeERC20 for ERC20;
    uint256 constant DAY = 1 days;

    /// @notice The address of the Core contract
    ICore public core;
    /// @notice Total available reward
    uint256 public totalReward;
    /// @notice Daily reward rate 0.3% by default
    uint256 public dailyRate;
    /// @notice Last staking state update timestamp
    uint256 public updatedAt;
    /// @notice Total reward per token stored at the staking
    uint256 public rewardPerTokenStored;
    /// @notice Reward per token paid to the user
    mapping(address => uint256) public userRewardPerTokenPaid;
    /// @notice Rewards of the user
    mapping(address => uint256) public rewards;

    /// @notice Total staked
    uint256 public totalSupply;
    /// @notice Staked amount of the user
    mapping(address => uint256) public balanceOf;
    /// @notice Vested amount of the user
    mapping(address => uint256) public vestedAmount;
    /// @notice Time after full unlock until user can't claim his rewards
    mapping(address => uint256) public unlockCooldown;
    /// @notice Time after that unlock is available
    mapping(address => uint256) public lockEnds;
    /// @notice First user lock timestamp
    mapping(address => uint256) public farmingStart;

    /// @notice The minumum lock period.
    ///         During this period after lock users cannot unlock tokens.
    ///         By default period is 1 month.
    uint256 public minLockPeriod = DAY * 30;
    /// @notice The minimum gap between two calls of `claim` function.
    ///         After that gap tokens are actually claimed
    uint256 public minClaimGap = DAY * 365;

    /// @dev Allows only the Vesting contract to call functions
    modifier onlyVesting() {
        require(msg.sender == core.vesting(), "Farming: Caller is not Vesting");
        _;
    }

    /// @notice Checks that account is not blacklisted
    modifier ifNotBlacklisted(address account) {
        require(!core.checkBlacklisted(account), "Farming: Account is blacklisted");
        _;
    }

    /// @dev Updates staking contract state
    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();
        if (totalSupply != 0)
            totalReward =
                totalReward -
                (totalReward * _calcCompound(block.timestamp - updatedAt)) /
                1e18;
        updatedAt = block.timestamp;

        if (_account != address(0)) {
            rewards[_account] = getReward(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(address core_) {
        require(core_ != address(0), "Farming: Core cannot have zero address");
        core = ICore(core_);
        // default rate 0.3%
        dailyRate = 0.003 ether; // 100% - 1e18, 10% - 1e17, 1% - 1e16
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
    function getFarming(address staker) external view returns (uint256, uint256, uint256, uint256) {
        require(staker != address(0), "Farming: User cannot have zero address");
        return (balanceOf[staker], farmingStart[staker], lockEnds[staker], rewards[staker]);
    }

    /// @notice See {IFarming-getReward}
    function getReward(address staker) public view returns (uint256) {
        require(staker != address(0), "Farming: User cannot have zero address");
        return
            ((balanceOf[staker] * (rewardPerToken() - userRewardPerTokenPaid[staker])) / 1e18) +
            rewards[staker];
    }

    /// @notice See {IFarming-rewardPerToken}
    function rewardPerToken() public view returns (uint) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        uint256 compound = _calcCompound(block.timestamp - updatedAt);
        return rewardPerTokenStored + (totalReward * compound) / totalSupply;
    }

    /// @notice See {IFarming-notifyRewardAmount}
    function notifyRewardAmount(
        uint256 amount
    ) external onlyOwner whenNotPaused updateReward(address(0)) {
        totalReward += amount;
        emit FundsAdded(amount);
    }

    /// @notice See {IFarming-setMinLockPeriod}
    function setMinLockPeriod(uint256 period) external onlyOwner whenNotPaused {
        minLockPeriod = period;
        emit MinLockPeriodChanged(period);
    }

    /// @notice See {IFarming-setDailyRate}
    function setDailyRate(uint256 rate) external onlyOwner whenNotPaused updateReward(address(0)) {
        require(rate < 1e18, "Farming: rate cannot be bigger than 1e18");
        dailyRate = rate;
        emit DailyRateChanged(rate);
    }

    /// @notice See {IFarming-lock}
    function lock(uint256 amount) external {
        _lock(msg.sender, msg.sender, amount);
        emit Locked(msg.sender, amount);
    }

    /// @notice See {IFarming-lockOnBehalf}
    function lockOnBehalf(address admin, address user, uint256 amount) external onlyVesting {
        vestedAmount[user] += amount;
        _lock(admin, user, amount);
        emit LockedOnBehalf(admin, user, amount);
    }

    /// @notice See {IFarming-unlock}
    function unlock(uint256 amount) external {
        require(
            vestedAmount[msg.sender] == 0 || vestedAmount[msg.sender] < balanceOf[msg.sender],
            "Farming: No free funds"
        );
        uint256 freeAmount = balanceOf[msg.sender] - vestedAmount[msg.sender];
        require(freeAmount >= amount, "Farming: Insufficient funds");
        _unlock(msg.sender, amount);
    }

    /// @notice See {IFarming-unlockAll}
    function unlockAll() external {
        require(
            vestedAmount[msg.sender] == 0 || vestedAmount[msg.sender] < balanceOf[msg.sender],
            "Farming: No free funds"
        );
        uint256 freeAmount = balanceOf[msg.sender] - vestedAmount[msg.sender];
        _unlock(msg.sender, freeAmount);
    }

    /// @notice See {IFarming-unlockFromVesting}
    function unlockFromVesting(address staker, uint256 amount) external onlyVesting {
        vestedAmount[staker] -= amount;
        _unlock(staker, amount);
    }

    /// @notice See {IFarming-claim}
    function claim() external whenNotPaused updateReward(msg.sender) ifNotBlacklisted(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(
            balanceOf[msg.sender] == 0 && farmingStart[msg.sender] > 0,
            "Farming: Unable to claim before full unlock"
        );

        if (unlockCooldown[msg.sender] == 0) {
            unlockCooldown[msg.sender] = block.timestamp + minClaimGap;
            emit ClaimAttempt(msg.sender);
            return;
        }

        if (unlockCooldown[msg.sender] != 0 && unlockCooldown[msg.sender] <= block.timestamp) {
            rewards[msg.sender] = 0;
            ERC20(core.maze()).safeTransfer(msg.sender, reward);
            unlockCooldown[msg.sender] = 0;
            farmingStart[msg.sender] = 0;
            emit Claimed(msg.sender, reward);
        } else revert("Farming: Minimum interval between claimes not passed");
    }

    function _lock(
        address payer,
        address staker,
        uint256 amount
    ) internal whenNotPaused updateReward(staker) ifNotBlacklisted(payer) ifNotBlacklisted(staker) {
        require(staker != address(0), "Farming: User cannot have zero address");
        require(amount > 0, "Farming: Lock amount cannot be zero");
        balanceOf[staker] += amount;
        totalSupply += amount;

        if (lockEnds[staker] == 0) {
            farmingStart[staker] = block.timestamp;
            lockEnds[staker] = block.timestamp + minLockPeriod;
        } else lockEnds[staker] += minLockPeriod;

        ERC20(core.maze()).safeTransferFrom(payer, address(this), amount);
    }

    function _unlock(
        address staker,
        uint256 amount
    )
        internal
        whenNotPaused
        updateReward(staker)
        ifNotBlacklisted(msg.sender)
        ifNotBlacklisted(staker)
    {
        require(staker != address(0), "Farming: User cannot have zero address");
        require(amount > 0, "Farming: Unlock amount cannot be zero");
        require(balanceOf[staker] > 0, "Farming: No tokens to unlock");
        require(balanceOf[staker] >= amount, "Farming: Unlock greater than lock");
        require(
            lockEnds[staker] <= block.timestamp,
            "Farming: Minimum lock period has not passed yet"
        );
        balanceOf[staker] -= amount;
        totalSupply -= amount;
        ERC20(core.maze()).safeTransfer(staker, amount);

        if (balanceOf[staker] == 0) lockEnds[staker] = 0;

        emit Unlocked(staker, amount);
    }

    // calculate (1 - (1 - r)^t),
    // r - current daily rate
    // t - days passed
    function _calcCompound(uint256 duration) internal view returns (uint256) {
        uint256 daysPassed = duration / DAY;
        uint256 remainder = duration % DAY;
        UD60x18 x = ud(1e18);
        UD60x18 y = ud(dailyRate);
        UD60x18 z = convert(daysPassed);
        UD60x18 res = x.sub(y).pow(z);
        res = x.sub(res);

        uint256 intraday = _calcIntradayReward(remainder);
        return intoUint256(res) + intraday;
    }

    // calculate fraction of the daily reward,
    // r * d / t
    // r - current daily rate
    // d - seconds in day
    // t - seconds passed
    function _calcIntradayReward(uint256 timeInsideDay) internal view returns (uint256) {
        if (timeInsideDay == 0) return 0;
        UD60x18 x = convert(timeInsideDay);
        UD60x18 y = convert(DAY);
        UD60x18 z = ud(dailyRate);
        UD60x18 res = y.div(x);
        res = z.div(res);
        return intoUint256(res);
    }
}
