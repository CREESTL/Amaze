// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IMaze.sol";
import "./interfaces/IBlacklist.sol";

// TODO remove it
import "hardhat/console.sol";

/// @title ERC20 token with RFI logic
/// @dev NOTE: This contract uses the principals of RFI tokens
///            for detailed documentation please see:
///            https://reflect-contract-doc.netlify.app/#a-technical-whitepaper-for-reflect-contracts
contract Maze is IMaze, Ownable, Pausable {
    using SafeMath for uint256;

    /// @notice The address of the Blacklist contract
    address public blacklist;

    /// @dev Balances in r-space
    mapping(address => uint256) private _rOwned;
    /// @dev Balances in t-space
    mapping(address => uint256) private _tOwned;
    /// @dev Allowances in t-space
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @notice Marks that account is exluded from staking. Exluded accounts do not
    ///         get shares of distributed fees
    mapping(address => bool) public isExcluded;
    /// @dev The list of all exluded accounts
    address[] private _excluded;

    /// @dev Maximum possible amount of tokens is 100 million
    // TODO make it const if no burn
    uint256 private _tTotal = 100_000_000 * 1e18;

    /// @dev RFI-special variables
    uint256 private constant MAX = ~uint256(0);
    /// @dev _rTotal is multiple of _tTotal
    uint256 private _rTotal = (MAX - (MAX % _tTotal));
    /// @dev Total amount of fees collected in t-space
    uint256 private _tFeeTotal;

    // Basic token info
    string public name = "Maze";
    string public symbol = "MAZE";
    uint8 public decimals = 18;

    /// @dev Used to convert BPs to percents and vice versa
    uint256 private constant percentConverter = 1e4;

    /// @notice List of whitelisted accounts. Whitelisted accounts do not pay fees on token transfers.
    mapping(address => bool) public isWhitelisted;

    /// @notice The percentage of transferred tokens to be taken as fee for any token transfers
    ///         Fee is distributed among token holders
    ///         Expressed in basis points
    uint256 public feeInBP;

    /// @notice Checks that account is not blacklisted
    modifier ifNotBlacklisted(address account) {
        require(
            !IBlacklist(blacklist).checkBlacklisted(account),
            "Maze: Account is blacklisted"
        );
        _;
    }

    constructor(address blacklist_) {
        blacklist = blacklist_;

        // Whole supply of tokens is assigned to owner
        _rOwned[msg.sender] = _rTotal;
        emit Transfer(address(0), msg.sender, _tTotal);

        // Set default fees to 2%
        setFees(200);
    }

    /// @notice See {IMaze-totalSupply}
    function totalSupply() public view returns (uint256) {
        return _tTotal;
    }

    /// @notice See {IMaze-totalFee}
    function totalFee() public view returns (uint256) {
        return _tFeeTotal;
    }

    /// @notice See {IMaze-balanceOf}
    function balanceOf(address account) public view returns (uint256) {
        // console.log("\nIn balanceOf:");
        if (isExcluded[account]) {
            // If user is excluded from stakers, his balance is the amount of t-space tokens he owns
            // console.log("Result is: ",_tOwned[account]);
            return _tOwned[account];
        } else {
            // If users is one of stakers, his balance is calculated using r-space tokens
            uint256 reflectedBalance = _reflectToTSpace(_rOwned[account]);
            // console.log("Result is: ", reflectedBalance);
            return reflectedBalance;
        }
    }

    /// @notice See {IMaze-allowance}
    function allowance(address owner, address spender)
        public
        view
        returns (uint256)
    {
        return _allowances[owner][spender];
    }

    /// @notice See {IMaze-approve}
    function approve(address spender, uint256 amount)
        public
        whenNotPaused
        returns (bool)
    {
        require(spender != address(0), "Maze: Spender cannot be zero address");
        require(amount != 0, "Maze: Allowance cannot be zero");
        _approve(msg.sender, spender, amount);
        return true;
    }

    /// @notice See {IMaze-burn}
    function burn(uint256 amount) public whenNotPaused {
        _burn(msg.sender, amount);
    }

    /// @notice See {IMaze-transfer}
    function transfer(address to, uint256 amount)
        public
        whenNotPaused
        returns (bool)
    {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice See {IMaze-transferFrom}
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public whenNotPaused returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            msg.sender,
            _allowances[sender][msg.sender].sub(
                amount,
                "Maze: Transfer amount exceeds allowance"
            )
        );
        return true;
    }

    /// @notice See {IMaze-increaseAllowance}
    function increaseAllowance(address spender, uint256 addedValue)
        public
        whenNotPaused
        returns (bool)
    {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].add(addedValue)
        );
        return true;
    }

    /// @notice See {IMaze-decreaseAllowance}
    function decreaseAllowance(address spender, uint256 subtractedValue)
        public
        whenNotPaused
        returns (bool)
    {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].sub(
                subtractedValue,
                "Maze: Allowance cannot be below zero"
            )
        );
        return true;
    }

    /// @notice See {IMaze-setFees}
    function setFees(uint256 _feeInBP)
        public
        whenNotPaused
        ifNotBlacklisted(msg.sender)
        onlyOwner
    {
        require(_feeInBP < 1e4, "Maze: Fee too high");
        feeInBP = _feeInBP;
        emit SetFees(_feeInBP);
    }

    /// @notice See {IMaze-addToWhitelist}
    function addToWhitelist(address account)
        public
        whenNotPaused
        ifNotBlacklisted(msg.sender)
        onlyOwner
    {
        require(!isWhitelisted[account], "Maze: Account already whitelisted");
        isWhitelisted[account] = true;
        emit AddToWhitelist(account);
    }

    /// @notice See {IMaze-removeFromWhitelist}
    function removeFromWhitelist(address account)
        public
        whenNotPaused
        ifNotBlacklisted(msg.sender)
        onlyOwner
    {
        require(isWhitelisted[account], "Maze: Account not whitelisted");
        isWhitelisted[account] = false;
        emit RemoveFromWhitelist(account);
    }

    /// @notice See {IMaze-pause}
    function pause() public ifNotBlacklisted(msg.sender) onlyOwner {
        _pause();
    }

    /// @notice See {IMaze-unpause}
    function unpause() public ifNotBlacklisted(msg.sender) onlyOwner {
        _unpause();
    }

    /// @notice See {IMaze-includeIntoStakers}
    function includeIntoStakers(address account)
        public
        whenNotPaused
        ifNotBlacklisted(msg.sender)
        onlyOwner
    {
        require(account != address(0), "Maze: Cannot include zero address");
        require(isExcluded[account], "Maze: Account is already included");
        for (uint256 i = 0; i < _excluded.length; i++) {
            // Remove account from list of exluded
            if (_excluded[i] == account) {
                _excluded[i] = _excluded[_excluded.length - 1];
                _excluded.pop();
                break;
            }
        }
        // T-space balance gets reset when users joins r-space again
        _tOwned[account] = 0;
        isExcluded[account] = false;
        emit IncludeIntoStakers(account);
    }

    /// @notice See {IMaze-excludeFromStakers}
    function excludeFromStakers(address account)
        public
        whenNotPaused
        ifNotBlacklisted(msg.sender)
        onlyOwner
    {
        require(account != address(0), "Maze: Cannot exclude zero address");
        require(!isExcluded[account], "Maze: Account is already excluded");
        // Update owned amount in t-space before excluding
        if (_rOwned[account] > 0) {
            _tOwned[account] = _reflectToTSpace(_rOwned[account]);
        }
        isExcluded[account] = true;
        _excluded.push(account);
        emit ExcludeFromStakers(account);
    }

    /// @notice Reflect twhole amount and fee okens amount from r-space to t-space
    /// @param rAmountWithFee Token amount in r-space
    /// @return The reflected amount of tokens (r-space)
    /// @dev tAmountWithFee = rAmountWithFee / rate
    function _reflectToTSpace(uint256 rAmountWithFee)
        private
        view
        returns (uint256)
    {
        require(
            rAmountWithFee <= _rTotal,
            "Maze: Amount must be less than total reflections"
        );
        // console.log("\nIn _reflectToTSpace:");
        // console.log("rAmountWithFee is: ", rAmountWithFee);
        uint256 rate = _getRate();
        // console.log("Result is: ", rAmountWithFee.div(rate));
        return rAmountWithFee.div(rate);
    }

    /// @dev Calculates 2 t-space and 3 r-space values based on one t-space amount
    /// @param tAmountNoFee The transferred amount without fees (t-space)
    /// @return The whole transferred amount including fees (r-space)
    /// @return Amount of tokens to be transferred to the recipient (r-space)
    /// @return Amount of tokens to be takes as fees (r-space)
    /// @return The whole transferred amount including fees (t-space)
    /// @return Amount of tokens to be taken as fees (t-space)
    function _getValues(uint256 tAmountNoFee)
        private
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        (uint256 tAmountWithFee, uint256 tFee) = _getTValues(tAmountNoFee);
        uint256 rate = _getRate();
        (
            uint256 rAmountWithFee,
            uint256 rAmountNoFee,
            uint256 rFee
        ) = _getRValues(tAmountWithFee, tFee, rate);
        console.log("\nIn _getValues:");
        console.log("tAmountWithFee is: ", tAmountWithFee);
        console.log("tAmountNoFee is  : ", tAmountNoFee);
        console.log("tFee is          : ", tFee);
        console.log("rAmountWithFee is: ", rAmountWithFee);
        console.log("rAmountNoFee is  : ", rAmountNoFee);
        console.log("rFee is          : ", rFee);
        return (rAmountWithFee, rAmountNoFee, rFee, tAmountWithFee, tFee);
    }

    /// @dev Calculates transferred amount and fee amount in t-space
    /// @param tAmountNoFee The transferred amount without fees (t-space)
    /// @return Amount of tokens to be withdrawn from sender including fees (t-space)
    /// @return Amount of tokens to be taken as fees (t-space)
    function _getTValues(uint256 tAmountNoFee)
        private
        view
        returns (uint256, uint256)
    {
        uint256 tFee = 0;
        // Whitelisted users don't pay fees
        if (!isWhitelisted[msg.sender]) {
            tFee = tAmountNoFee.mul(feeInBP).div(percentConverter);
        }
        // Withdrawn amount = whole amount + fees
        uint256 tAmountWithFee = tAmountNoFee.add(tFee);
        return (tAmountWithFee, tFee);
    }

    /// @dev Calculates reflected amounts (from t-space) in r-space
    /// @param tAmountWithFee The whole transferred amount including fees (t-space)
    /// @param tFee Fee amount (t-space)
    /// @param rate Rate of conversion between t-space and r-space
    /// @return The whole transferred amount including fees (r-space)
    /// @return Amount of tokens to be transferred to the recipient (r-space)
    /// @return Amount of tokens to be taken as fees (r-space)
    function _getRValues(
        uint256 tAmountWithFee,
        uint256 tFee,
        uint256 rate
    )
        private
        pure
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        // Reflect whole amount and fee from t-space into r-space
        uint256 rAmountWithFee = tAmountWithFee.mul(rate);
        uint256 rFee = tFee.mul(rate);
        // Received amount = whole amount - fees
        uint256 rAmountNoFee = rAmountWithFee.sub(rFee);
        return (rAmountWithFee, rAmountNoFee, rFee);
    }

    /// @dev Calculates current conversion rate
    /// @return Conversion rate
    function _getRate() private view returns (uint256) {
        // console.log("\nIn _getRate:");
        (uint256 rSupply, uint256 tSupply) = _getSupplies();
        // Rate is a ratio of r-space supply and t-space supply
        // console.log("Result is: ", rSupply.div(tSupply));
        return rSupply.div(tSupply);
    }

    /// @dev Calculates supplies of tokens in r-space and t-space
    ///      Supply is the total amount of tokens in the space minus amount of
    ///      tokens owned by non-stakers (exluded users)
    /// @return Supply of tokens (r-space)
    /// @return Supply of tokens (t-space)
    function _getSupplies() private view returns (uint256, uint256) {
        uint256 rSupply = _rTotal;
        uint256 tSupply = _tTotal;
        // console.log("\nIn _getSupplies:");
        // Decrease supplies by amount owned by non-stakers
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (
                _rOwned[_excluded[i]] > rSupply ||
                _tOwned[_excluded[i]] > tSupply
            ) {
                return (_rTotal, _tTotal);
            }
            rSupply = rSupply.sub(_rOwned[_excluded[i]]);
            tSupply = tSupply.sub(_tOwned[_excluded[i]]);
        }

        if (rSupply < _rTotal.div(_tTotal)) {
            // console.log("Result1 is: ");
            // console.log("\t", _rTotal);
            // console.log("\t", _tTotal);
            return (_rTotal, _tTotal);
        }
        // console.log("Result2 is: ");
        // console.log("\t", rSupply);
        // console.log("\t", tSupply);
        return (rSupply, tSupply);
    }

    /// @dev Allows spender to spend tokens on behalf of the transaction sender via transferFrom
    /// @param owner Owner's address
    /// @param spender Spender's address
    /// @param amount The amount of tokens spender is allowed to spend
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) private ifNotBlacklisted(owner) ifNotBlacklisted(spender) {
        require(owner != address(0), "Maze: Approve from the zero address");
        require(spender != address(0), "Maze: Approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }


    // TODO add mint here???

    /// @dev Burns user's tokens decreasing supply in both t-space and r-space
    /// @param from The address to burn tokens from
    /// @param amount The amount of tokens to burn
    function _burn(
        address from,
        uint256 amount
    ) private ifNotBlacklisted(from) {
        require(from != address(0), "Maze: Burn from the zero address");
        require(balanceOf(from) >= amount, "Maze: Burn amount exceeds balance");
        uint256 rate = _getRate();
        if (isExcluded[from]) {
            // Decrease balances of excluded account in both r-space and t-space
            _rOwned[from] = _rOwned[from].sub(amount.mul(rate));
            _tOwned[from] = _tOwned[from].sub(amount);
        } else {
            // Decrease balance of included account only in r-space
            _rOwned[from] = _rOwned[from].sub(amount.mul(rate));
        }
        // Decrease supplies of tokens in both r-space and t-space
        // This does not distribute burnt tokens like fees
        // because both supplies are reduced and the rate stays the same
        console.log("rTotal before: ", _rTotal);
        _rTotal = _rTotal.sub(amount.mul(rate));
        console.log("rTotal after : ", _rTotal);
        _tTotal = _tTotal.sub(amount);
        emit Transfer(from, address(0), amount);
    }

    /// @dev Transfers tokens to the given address
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param amount The amount of tokens to send without fees
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) private ifNotBlacklisted(from) ifNotBlacklisted(to) {
        require(from != address(0), "Maze: Transfer from the zero address");
        require(amount > 0, "Maze: Transfer amount must be greater than zero");
        require(
            balanceOf(from) >= amount,
            "Maze: Transfer amount exceeds balance"
        );

        console.log("\nIn transfer:");

        // Next transfer logic depends on which accout is excluded (in any)
        // If account is excluded his t-space balance does not change
        if (isExcluded[from] && !isExcluded[to]) {
            console.log("From excluded to included");
            _transferFromExcluded(from, to, amount);
        } else if (!isExcluded[from] && isExcluded[to]) {
            console.log("From included to excluded");
            _transferToExcluded(from, to, amount);
        } else if (!isExcluded[from] && !isExcluded[to]) {
            console.log("From included to included");
            _transferStandard(from, to, amount);
        } else if (isExcluded[from] && isExcluded[to]) {
            console.log("From excluded to excluded");
            _transferBothExcluded(from, to, amount);
        } else {
            _transferStandard(from, to, amount);
        }
    }

    /// @dev Transfers tokens from included account to included account
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param tAmountNoFee The amount of tokens to send without fees
    function _transferStandard(
        address from,
        address to,
        uint256 tAmountNoFee
    ) private {
        (
            uint256 rAmountWithFee,
            uint256 rAmountNoFee,
            uint256 rFee,
            uint256 tAmountWithFee,
            uint256 tFee
        ) = _getValues(tAmountNoFee);
        // Only change sender's and recipient's balances in r-space (they are both included)
        // Sender looses whole amount plus fees
        _rOwned[from] = _rOwned[from].sub(rAmountWithFee);
        // Recipient recieves whole amount (fees are distributed automatically)
        _rOwned[to] = _rOwned[to].add(rAmountNoFee);
        _processFees(rFee, tFee);
        emit Transfer(from, to, tAmountNoFee);
    }

    /// @dev Transfers tokens from included account to excluded account
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param tAmountNoFee The amount of tokens to send without fees
    function _transferToExcluded(
        address from,
        address to,
        uint256 tAmountNoFee
    ) private {
        (
            uint256 rAmountWithFee,
            uint256 rAmountNoFee,
            uint256 rFee,
            uint256 tAmountWithFee,
            uint256 tFee
        ) = _getValues(tAmountNoFee);
        // Only decrease sender's balance in r-space (he is included)
        // Sender looses whole amount plus fees
        _rOwned[from] = _rOwned[from].sub(rAmountWithFee);
        // Increase recipient's balance in both t-space and r-space
        // Recipient recieves whole amount (fees are distributed automatically)
        _tOwned[to] = _tOwned[to].add(tAmountNoFee);
        _rOwned[to] = _rOwned[to].add(rAmountNoFee);
        _processFees(rFee, tFee);
        emit Transfer(from, to, tAmountNoFee);
    }

    /// @dev Transfers tokens from excluded to included account
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param tAmountNoFee The amount of tokens to send without fees
    function _transferFromExcluded(
        address from,
        address to,
        uint256 tAmountNoFee
    ) private {
        (
            uint256 rAmountWithFee,
            uint256 rAmountNoFee,
            uint256 rFee,
            uint256 tAmountWithFee,
            uint256 tFee
        ) = _getValues(tAmountNoFee);
        // Decrease sender's balances in both t-space and r-space
        // Sender looses whole amount plus fees
        _tOwned[from] = _tOwned[from].sub(tAmountWithFee);
        _rOwned[from] = _rOwned[from].sub(rAmountWithFee);
        // Only increase recipient's balance in r-space (he is included)
        // Recipient recieves whole amount (fees are distributed automatically)
        _rOwned[to] = _rOwned[to].add(rAmountNoFee);
        _processFees(rFee, tFee);
        emit Transfer(from, to, tAmountNoFee);
    }

    /// @dev Transfers tokens between two exluced accounts
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param tAmountNoFee The amount of tokens to send without fees
    function _transferBothExcluded(
        address from,
        address to,
        uint256 tAmountNoFee
    ) private {
        (
            uint256 rAmountWithFee,
            uint256 rAmountNoFee,
            uint256 rFee,
            uint256 tAmountWithFee,
            uint256 tFee
        ) = _getValues(tAmountNoFee);
        // Decrease sender's balances in both t-space and r-space
        // Sender looses whole amount plus fees
        _tOwned[from] = _tOwned[from].sub(tAmountWithFee);
        _rOwned[from] = _rOwned[from].sub(rAmountWithFee);
        // Increase recipient's balances in both t-space and r-space
        // Recipient recieves whole amount (fees are distributed automatically)
        _tOwned[to] = _tOwned[to].add(tAmountNoFee);
        _rOwned[to] = _rOwned[to].add(rAmountNoFee);
        _processFees(rFee, tFee);
        emit Transfer(from, to, tAmountNoFee);
    }

    /// @dev Distributes r-space fees among stakers
    /// @param rFee Fee amount (r-space)
    /// @param tFee Fee amount (t-space)
    function _processFees(uint256 rFee, uint256 tFee) private {
        // Decrease the total amount of r-space tokens.
        // This is the fees distribution.
        _rTotal = _rTotal.sub(rFee);
        _tFeeTotal = _tFeeTotal.add(tFee);
    }
}
