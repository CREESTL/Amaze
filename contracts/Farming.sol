// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFarming.sol";
import "./interfaces/IBlacklist.sol";

// TODO remove logs.
import "hardhat/console.sol";

/// @title The rewards farming contract
contract Farming is IFarming, Ownable, Pausable {
    using SafeERC20 for ERC20;

    /// @notice The address /of the Blacklist contract
    address public blacklist;

    /// @notice Locked balances of users
    mapping(address => uint256) private _lockedAmounts;

    /// @dev Allows only the Vesting contract to call functions
    modifier onlyVesting() {
        require(
            msg.sender == IBlacklist(blacklist).vesting(),
            "Farming: Caller is not Vesting"
        );
        _;
    }

    /// @notice Checks that account is not blacklisted
    modifier ifNotBlacklisted(address account) {
        require(
            !IBlacklist(blacklist).checkBlacklisted(account),
            "Maze: Account is blacklisted"
        );
        _;
    }

    constructor(address blacklist_) {
        require(
            blacklist_ != address(0),
            "Farming: Blacklist cannot have zero address"
        );
        blacklist = blacklist_;
    }

    /// @notice See {IFarming-lockOnBehalf}
    function lockOnBehalf(
        address user,
        uint256 amount
    ) external onlyVesting ifNotBlacklisted(msg.sender) ifNotBlacklisted(user) {
        require(user != address(0), "Farming: Locker cannot have zero address");
        require(amount > 0, "Farming: Lock amount cannot be zero");

        // Mark that user has locked tokens
        _lockedAmounts[user] += amount;

        console.log("\nIn lockOnBehalf:");
        console.log("Locked amount is: ", _lockedAmounts[user]);

        // Transfer tokens from Vesting here
        ERC20(IBlacklist(blacklist).maze()).safeTransferFrom(
            IBlacklist(blacklist).vesting(),
            address(this),
            amount
        );

        emit LockedOnBehalf(user, amount);
    }

    /// @notice See {IFarming-unlockOnBehalf}
    function unlockOnBehalf(
        address user,
        uint256 amount
    ) external onlyVesting ifNotBlacklisted(msg.sender) ifNotBlacklisted(user) {
        require(user != address(0), "Farming: Locker cannot have zero address");
        require(amount > 0, "Farming: Unlock amount cannot be zero");

        console.log("\nIn unlockOnBehalf:");
        console.log("Locked amount is: ", _lockedAmounts[user]);
        console.log("Trying to unlock: ", amount);

        require(
            _lockedAmounts[user] >= amount,
            "Farming: Unlock greater than lock"
        );

        // Decrease locked amount
        _lockedAmounts[user] -= amount;

        // Transfer tokens straight to the user
        ERC20(IBlacklist(blacklist).maze()).safeTransfer(user, amount);

        emit UnlockedOnBehalf(user, _lockedAmounts[user]);

        _recalculateRewards(user);
    }

    /// @dev Recalculates user's rewards after his lock amount was updated
    /// @param user The address of the user to recalculate rewards of
    function _recalculateRewards(address user) private {
        require(user != address(0), "Farming: Locker cannot have zero address");
        // TODO not sure about this
        require(_lockedAmounts[user] >= 0, "Farming: No locked tokens");
        // TODO
    }
}
