// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import "./interfaces/IMaze.sol";
import "./interfaces/ICore.sol";

import "hardhat/console.sol";

/// @title ERC20 token with RFI logic
/// @dev NOTE: This contract uses the principals of RFI tokens
///            for detailed documentation please see:
///            https://reflect-contract-doc.netlify.app/#a-technical-whitepaper-for-reflect-contracts
contract Maze is ERC20, IMaze, Ownable, Pausable {
    using SafeMath for uint256;

    /// @notice The address of the Core contract
    ICore public core;

    /// @dev RFI-special variables
    uint256 private constant MAX = ~uint256(0);

    /// @dev Used to convert BPs to percents and vice versa
    uint256 private constant percentConverter = 1e4;

    /// @notice List of whitelisted accounts. Whitelisted accounts do not pay fees on token transfers.
    mapping(address => bool) public isWhitelisted;

    /// @notice List of DEX pairs for which a sale fee for the buy and sale of tokens will be taken.
    mapping(address => bool) public isSalePair;

    ISwapRouter public swapRouter;
    uint24 public poolFee = 3000;
    address public USDT;
    address public saleFeeReceiver;

    /// @notice The percentage of transferred tokens to be taken as fee for any token buy or sale in added DEX pairs 
    ///         Fee is swapped to USDT to marketing address
    ///         Expressed in basis points
    uint256 public saleFeeInBP;

    /// @notice Checks that account is not blacklisted
    modifier ifNotBlacklisted(address account) {
        require(!core.checkBlacklisted(account), "Maze: Account is blacklisted");
        _;
    }

    constructor(
        address core_,
        address swapRouter_,
        address usdt_
    ) ERC20("Maze", "MAZE") {
        require(core_ != address(0), "Maze: Core cannot have zero address");
        require(swapRouter_ != address(0), "Maze: SwapRouter cannot have zero address");
        require(usdt_ != address(0), "Maze: USDT cannot have zero address");
        core = ICore(core_);
        swapRouter = ISwapRouter(swapRouter_);
        USDT = usdt_;

        // Whole supply of tokens is assigned to owner
        _mint(msg.sender, 100_000_000 * 1e18);
        saleFeeReceiver = msg.sender;

        setSaleFees(300);
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

    /// @notice See {IMaze-setFees}
    function setSaleFees(uint256 _saleFeeInBP) public whenNotPaused onlyOwner {
        require(_saleFeeInBP < 1e4, "Maze: Sale fee too high");
        saleFeeInBP = _saleFeeInBP;
        emit SetSaleFees(_saleFeeInBP);
    }

    /// @notice See {IMaze-addToWhitelist}
    function addToWhitelist(address account) external whenNotPaused onlyOwner {
        require(!isWhitelisted[account], "Maze: Account already whitelisted");
        isWhitelisted[account] = true;
        emit AddToWhitelist(account);
    }

    /// @notice See {IMaze-removeFromWhitelist}
    function removeFromWhitelist(address account) external whenNotPaused onlyOwner {
        require(isWhitelisted[account], "Maze: Account not whitelisted");
        isWhitelisted[account] = false;
        emit RemoveFromWhitelist(account);
    }

    /// @notice See {IMaze-addToPairlist}
    function addToPairlist(address pair) external whenNotPaused onlyOwner {
        require(!isSalePair[pair], "Maze: Pair already added");
        isSalePair[pair] = true;
        emit AddToPairlist(pair);
    }

    /// @notice See {IMaze-removeFromPairlist}
    function removeFromPairlist(address pair) external whenNotPaused onlyOwner {
        require(isSalePair[pair], "Maze: Pair not added");
        isSalePair[pair] = false;
        emit RemoveFromPairlist(pair);
    }

    function setSaleFeeReceiver(address receiver) external whenNotPaused onlyOwner {
        require(receiver != address(0), "Maze: Cannot include zero address");
        saleFeeReceiver = receiver;
        emit SaleFeeReceiverChanged(receiver);
    }

    function setPoolFee(uint24 poolFee_) external whenNotPaused onlyOwner {
        require(poolFee_ != 0, "Maze: Cannot be zero");
        poolFee = poolFee_;
        emit PoolFeeChanged(poolFee_);
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
        uint256 saleFeeAmount = 0;
        if (isSalePair[to] && !isWhitelisted[from]) {
            saleFeeAmount = amount.mul(saleFeeInBP).div(percentConverter);
        }
        console.log("Sale fee amount", saleFeeAmount);
        console.log("Amount: ", amount);
        console.log("BalanceOf from: ", balanceOf(from));
        console.log("Address from: ", from);
        console.log("Address to: ", to);
        uint256 amountWithFee = amount.add(saleFeeAmount);

        require(balanceOf(from) >= amountWithFee, "Maze: not enough tokens to pay the fee");

        console.log("Before transfer");
        super._transfer(from, to, amount);
        console.log("After transfer");

        if (saleFeeAmount > 0) {
            console.log("Before fee transfer");
            super._transfer(from, address(this), saleFeeAmount);
            console.log("After fee transfer");
            // _processSaleFees(saleFeeAmount);
        }
    }

    function processSaleFees(uint256 saleFeeAmount) external {
        _approve(address(this), address(swapRouter), saleFeeAmount);
        console.log("BalanceOf address this: ", balanceOf(address(this)));
        console.log("Approved: ", allowance(address(this), address(swapRouter)));
        swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
            tokenIn: address(this),
            tokenOut: USDT,
            fee: poolFee,
            recipient: saleFeeReceiver,
            deadline: block.timestamp,
            amountIn: saleFeeAmount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        }));
        console.log("Swapped");
    }
}
