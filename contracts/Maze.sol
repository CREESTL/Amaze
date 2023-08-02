// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IMaze.sol";
import "./interfaces/ICore.sol";

/// @title ERC20 token with RFI logic
/// @dev NOTE: This contract uses the principals of RFI tokens
///            for detailed documentation please see:
///            https://reflect-contract-doc.netlify.app/#a-technical-whitepaper-for-reflect-contracts
contract Maze is ERC20, IMaze, Ownable, Pausable {
    /// @notice The address of the Core contract
    ICore public core;

    /// @dev RFI-special variables
    uint256 private constant MAX = ~uint256(0);

    /// @dev Used to convert BPs to percents and vice versa
    uint256 private constant percentConverter = 1e4;

    /// @notice Checks that account is not blacklisted
    modifier ifNotBlacklisted(address account) {
        require(!core.checkBlacklisted(account), "Maze: Account is blacklisted");
        _;
    }

    constructor(
        address core_
    ) ERC20("Maze", "MAZE") {
        require(core_ != address(0), "Maze: Core cannot have zero address");
        core = ICore(core_);

        // Whole supply of tokens is assigned to owner
        _mint(msg.sender, 100_000_000 * 1e18);
    }

    /// @notice See {IMaze-approve}
    function approve(address spender, uint256 amount) public override(ERC20, IERC20) whenNotPaused returns (bool) {
        return super.approve(spender, amount);
    }

    /// @notice See {IMaze-burn}
    function burn(uint256 amount) external whenNotPaused {
        _burn(msg.sender, amount);
    }

    /// @notice See {IMaze-transfer}
    function transfer(address to, uint256 amount) public override(ERC20, IERC20) whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }

    /// @notice See {IMaze-transferFrom}
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override(ERC20, IERC20) whenNotPaused returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }

    /// @notice See {IMaze-increaseAllowance}
    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public override whenNotPaused returns (bool) {
        return super.increaseAllowance(spender, addedValue);
    }

    /// @notice See {IMaze-decreaseAllowance}
    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public override whenNotPaused returns (bool) {
        return super.decreaseAllowance(spender, subtractedValue);
    }

    /// @notice See {IMaze-pause}
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice See {IMaze-unpause}
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Allows spender to spend tokens on behalf of the transaction sender via transferFrom
    /// @param owner Owner's address
    /// @param spender Spender's address
    /// @param amount The amount of tokens spender is allowed to spend
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal override ifNotBlacklisted(owner) ifNotBlacklisted(spender) {
        super._approve(owner, spender, amount);
    }

    /// @dev Burns user's tokens decreasing supply in both t-space and r-space
    /// @param from The address to burn tokens from
    /// @param amount The amount of tokens to burn
    function _burn(address from, uint256 amount) internal override ifNotBlacklisted(from) {
        super._burn(from, amount);
    }

    /// @dev Transfers tokens to the given address
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param amount The amount of tokens to send without fees
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override ifNotBlacklisted(from) ifNotBlacklisted(to) {
        super._transfer(from, to, amount);
    }
}
