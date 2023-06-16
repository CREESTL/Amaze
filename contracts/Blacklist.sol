// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IBlacklist.sol";

/// @title Blacklist contract to block users of the Amaze platform
contract Blacklist is IBlacklist, Ownable, Pausable {
    /// @notice Marks that account is blacklisted
    mapping(address => bool) public blacklist;

    /// @notice The address of the Maze contract
    address public maze;
    /// @notice The address of the Vesting contract
    address public vesting;
    /// @notice The address of the Farming contract
    address public farming;

    /// @notice See {IBlacklist-checkBlacklisted}
    function checkBlacklisted(address account) external view returns (bool) {
        return blacklist[account];
    }

    /// @notice See {IBlacklist-setMaze}
    function setMaze(address maze_) external whenNotPaused onlyOwner {
        require(
            maze_ != address(0),
            "Blacklist: Maze cannot have zero address"
        );

        maze = maze_;

        emit MazeChanged(maze_);
    }

    /// @notice See {IBlacklist-setVesting}
    function setVesting(address vesting_) external whenNotPaused onlyOwner {
        require(
            vesting_ != address(0),
            "Blacklist: Vesting cannot have zero address"
        );

        vesting = vesting_;

        emit VestingChanged(vesting_);
    }

    /// @notice See {IBlacklist-setFarming}
    function setFarming(address farming_) external whenNotPaused onlyOwner {
        require(
            farming_ != address(0),
            "Blacklist: Farming cannot have zero address"
        );

        farming = farming_;

        emit FarmingChanged(farming_);
    }

    /// @notice See {IBlacklist-addToBlacklist}
    function addToBlacklist(address account) external whenNotPaused onlyOwner {
        require(!blacklist[account], "Blacklist: Account already in blacklist");
        require(msg.sender != account, "Blacklist: Cannot blacklist yourself");
        blacklist[account] = true;
        emit AddToBlacklist(account);
    }

    /// @notice See {IBlacklist-removeFromBlacklist}
    function removeFromBlacklist(
        address account
    ) external whenNotPaused onlyOwner {
        require(blacklist[account], "Blacklist: Account not in blacklist");
        blacklist[account] = false;
        emit RemoveFromBlacklist(account);
    }

    /// @notice See {IBlacklist-pause}
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice See {IBlacklist-unpause}
    function unpause() external onlyOwner {
        _unpause();
    }
}
