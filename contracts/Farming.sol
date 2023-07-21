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
    /// @notice Mapping: user => struct storing all delayedWithdrawal info
    mapping(address => StakerDelayedWithdrawals) internal _stakerWithdrawals;
    /// @notice Delay for completing any unlockDdelayedWithdrawal
    uint256 public unlockWithdrawalDelay = DAY * 21;
    uint256 public claimWithdrawalDelay = DAY * 365;

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
        // rate 0.03%
        dailyRate = 3 * 10**14; // 100% - 1e18, 10% - 1e17, 1% - 1e16
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
    function getFarming(address staker) external view returns (uint256, uint256) {
        require(staker != address(0), "Farming: User cannot have zero address");
        return (balanceOf[staker], rewards[staker]);
    }

    /// @notice See {IFarming-getReward}
    function getReward(address staker) public view returns (uint256) {
        require(staker != address(0), "Farming: User cannot have zero address");
        return
            ((balanceOf[staker] * (rewardPerToken() - userRewardPerTokenPaid[staker])) / 1e18) +
            rewards[staker];
    }

    /// @notice See {IFarming-getStakerUnlockDelayedWithdrawalByIndex}
    function getStakerUnlockDelayedWithdrawalByIndex(
        address staker,
        uint256 index
    ) external view returns (
        DelayedWithdrawal memory
    ) {
        return _stakerWithdrawals[staker].unlockDelayedWithdrawals[index];
    }

    /// @notice See {IFarming-getStakerUnlockWithdrawalsLength}
    function getStakerUnlockWithdrawalsLength(address staker) external view returns (uint256) {
        return _stakerWithdrawals[staker].unlockDelayedWithdrawals.length;
    }

    /// @notice See {IFarming-getStakerClaimDelayedWithdrawalByIndex}
    function getStakerClaimDelayedWithdrawalByIndex(
        address staker,
        uint256 index
    ) external view returns (
        DelayedWithdrawal memory
    ) {
        return _stakerWithdrawals[staker].claimDelayedWithdrawals[index];
    }

    /// @notice See {IFarming-getStakerClaimWithdrawalsLength}
    function getStakerClaimWithdrawalsLength(address staker) external view returns (uint256) {
        return _stakerWithdrawals[staker].claimDelayedWithdrawals.length;
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

    function withdrawDelayedUnlock() whenNotPaused ifNotBlacklisted(msg.sender) external {
        DelayedWithdrawal[] memory delayedWithdrawals = _stakerWithdrawals[msg.sender].unlockDelayedWithdrawals;
        
        (
            uint256 amountToSend,
            uint256 newDelayedWithdrawalsCompletedBefore
        ) = _calcDelayedWithdrawals(
            delayedWithdrawals,
            _stakerWithdrawals[msg.sender].unlockDelayedWithdrawalsCompleted,
            unlockWithdrawalDelay
        );

        if (amountToSend != 0) {
            _stakerWithdrawals[msg.sender].unlockDelayedWithdrawalsCompleted += newDelayedWithdrawalsCompletedBefore;
            ERC20(core.maze()).safeTransfer(msg.sender, amountToSend);
        }

        emit DelayedUnlockWithdrawed(msg.sender, amountToSend);
    }

    /// @notice See {IFarming-unlockFromVesting}
    function withdrawDelayedClaim() whenNotPaused ifNotBlacklisted(msg.sender) external {
        DelayedWithdrawal[] memory delayedWithdrawals = _stakerWithdrawals[msg.sender].claimDelayedWithdrawals;
        
        (
            uint256 amountToSend,
            uint256 newDelayedWithdrawalsCompletedBefore
        ) = _calcDelayedWithdrawals(
            delayedWithdrawals,
            _stakerWithdrawals[msg.sender].claimDelayedWithdrawalsCompleted,
            claimWithdrawalDelay
        );

        if (amountToSend != 0) {
            _stakerWithdrawals[msg.sender].claimDelayedWithdrawalsCompleted += newDelayedWithdrawalsCompletedBefore;
            ERC20(core.maze()).safeTransfer(msg.sender, amountToSend);
        }

        emit DelayedClaimWithdrawed(msg.sender, amountToSend);
    }

    /// @notice See {IFarming-claim}
    function claim() external whenNotPaused updateReward(msg.sender) ifNotBlacklisted(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(
            reward > 0,
            "Farming: No reward to claim"
        );

        rewards[msg.sender] = 0;

        DelayedWithdrawal memory delayedWithdrawal = DelayedWithdrawal({
            amount: reward,
            timeCreated: block.timestamp
        });
        _stakerWithdrawals[msg.sender].claimDelayedWithdrawals.push(delayedWithdrawal);

        emit Claimed(msg.sender, reward);
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

        if(msg.sender == core.vesting()) {
            ERC20(core.maze()).safeTransfer(staker, amount);
        } else {
            DelayedWithdrawal memory delayedWithdrawal = DelayedWithdrawal({
                amount: amount,
                timeCreated: block.timestamp
            });
            _stakerWithdrawals[staker].unlockDelayedWithdrawals.push(delayedWithdrawal);
        }

        balanceOf[staker] -= amount;
        totalSupply -= amount;

        emit Unlocked(staker, amount);
    }

    function _calcDelayedWithdrawals(
        DelayedWithdrawal[] memory delayedWithdrawals,
        uint256 delayedWithdrawalsCompletedBefore,
        uint256 withdrawalDelay
    ) internal view returns (uint256, uint256) {
        uint256 amountToSend = 0;
        uint256 _stakerWithdrawalsLength = delayedWithdrawals.length;
        uint256 i = 0;
        while ((delayedWithdrawalsCompletedBefore + i) < _stakerWithdrawalsLength) {
            // copy delayedWithdrawal from storage to memory
            DelayedWithdrawal memory delayedWithdrawal = delayedWithdrawals[delayedWithdrawalsCompletedBefore + i];
            // check if delayedWithdrawal can be claimed. break the loop as soon as a delayedWithdrawal cannot be claimed
            if (block.timestamp < delayedWithdrawal.timeCreated + withdrawalDelay) {
                break;
            }
            // otherwise, the delayedWithdrawal can be claimed, in which case we increase the amountToSend and increment i
            amountToSend += delayedWithdrawal.amount;
            // increment i to account for the delayedWithdrawal being claimed
            unchecked {
                ++i;
            }
        }

        return (amountToSend, i);
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
