// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/ICore.sol";

/// @title Core contract to block users of the Amaze platform
contract Core is ICore, Ownable, Pausable {
    /// @notice Marks that account is blacklisted
    mapping(address => bool) public blacklist;

    /// @notice The address of the Maze contract
    address public maze;
    /// @notice The address of the Vesting contract
    address public vesting;
    /// @notice The address of the Farming contract
    address public farming;

    /// @notice See {ICore-checkBlacklisted}
    function checkBlacklisted(address account) external view returns (bool) {
        return blacklist[account];
    }

    /// @notice See {ICore-setMaze}
    function setMaze(address maze_) external whenNotPaused onlyOwner {
        require(maze_ != address(0), "Core: Maze cannot have zero address");

        maze = maze_;

        emit MazeChanged(maze_);
    }

    /// @notice See {ICore-setVesting}
    function setVesting(address vesting_) external whenNotPaused onlyOwner {
        require(vesting_ != address(0), "Core: Vesting cannot have zero address");

        vesting = vesting_;

        emit VestingChanged(vesting_);
    }

    /// @notice See {ICore-setFarming}
    function setFarming(address farming_) external whenNotPaused onlyOwner {
        require(farming_ != address(0), "Core: Farming cannot have zero address");

        farming = farming_;

        emit FarmingChanged(farming_);
    }

    /// @notice See {ICore-addToBlacklist}
    function addToBlacklist(address account) external whenNotPaused onlyOwner {
        require(!blacklist[account], "Core: Account already in blacklist");
        require(msg.sender != account, "Core: Cannot blacklist yourself");
        blacklist[account] = true;
        emit AddToBlacklist(account);
    }

    /// @notice See {ICore-removeFromBlacklist}
    function removeFromBlacklist(address account) external whenNotPaused onlyOwner {
        require(blacklist[account], "Core: Account not in blacklist");
        blacklist[account] = false;
        emit RemoveFromBlacklist(account);
    }

    /// @notice See {ICore-pause}
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice See {ICore-unpause}
    function unpause() external onlyOwner {
        _unpause();
    }
}
