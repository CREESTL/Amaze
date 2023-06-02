// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IBlacklist.sol";

/// @title Blacklist contract to block users of the Amaze platform
contract Blacklist is IBlacklist, Ownable, Pausable {
    /// @notice Marks that account is blacklisted
    mapping(address => bool) public blacklist;

    /// @notice See {IBlacklist-checkBlacklisted}
    function checkBlacklisted(
        address account
    ) public view whenNotPaused returns (bool) {
        return blacklist[account];
    }

    /// @notice See {IBlacklist-addToBlacklist}
    function addToBlacklist(address account) public whenNotPaused onlyOwner {
        require(!blacklist[account], "Blacklist: account already in blacklist");
        require(msg.sender != account, "Blacklist: cannot blacklist yourself");
        blacklist[account] = true;
        emit AddToBlacklist(account);
    }

    /// @notice See {IBlacklist-removeFromBlacklist}
    function removeFromBlacklist(
        address account
    ) public whenNotPaused onlyOwner {
        require(blacklist[account], "Blacklist: account not in blacklist");
        blacklist[account] = false;
        emit RemoveFromBlacklist(account);
    }

    /// @notice See {IBlacklist-pause}
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice See {IBlacklist-unpause}
    function unpause() public onlyOwner {
        _unpause();
    }
}
