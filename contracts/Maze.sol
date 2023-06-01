// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IMaze.sol";

/// @title ERC20 token with RFI logi
/// @dev NOTE: This contract uses the principals of RFI tokens
///            for detailed documentation please see:
///            https://reflect-contract-doc.netlify.app/#a-technical-whitepaper-for-reflect-contracts
contract Maze is Context, IMaze, Ownable, Pausable {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    // TODO What is farming pool?
    /// @notice Address of the Farming Pool contract
    address public _farming;

    /// @dev Balances in r-space
    mapping(address => uint256) private _rOwned;
    /// @dev Balances in t-space
    mapping(address => uint256) private _tOwned;
    /// @dev Allowances in t-space
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @notice Marks that account is exluded from staking. Exluded accounts do not
    ///         get shares of distributed fees
    mapping(address => bool) public _isExcluded;
    /// @dev The list of all exluded accounts
    address[] private _excluded;

    /// @dev Maximum possible amount of tokens is 100 million
    uint256 private constant _tTotal = 100_000_000 * 1e18;
    /// @dev RFI-special variables
    uint256 private constant MAX = ~uint256(0);
    uint256 private _rTotal = (MAX - (MAX % _tTotal));
    /// @dev Total amount of fees collected in t-space
    uint256 public _tFeeTotal;

    // Basic token info
    string public name = "Maze";
    string public symbol = "MAZE";
    uint8 public decimals = 18;

    /// @dev Used to convert BPs to percents and vice versa
    uint256 private constant percentConverter = 1e4;

    /// @notice 44.5% of tokens have to be transferred to the farming address after deploy
    uint256 public percentsToFarming = 4450;
    /// @notice 55.5% of tokens have to be transferred to the owner address after deploy
    uint256 public percentsToOwner = percentConverter.sub(percentsToFarming);

    /// @notice List of whitelisted accounts. Whitelisted accounts do not pay fees on token transfers.
    mapping(address => bool) public whitelist;

    /// @notice The percentage of transferred tokens to be taken as fee for any token transfers
    ///         Fee is distributed among token holders
    ///         Expressed in basis points
    uint256 public feeInBP;

    constructor(address farming_) {
        // Here rate can be calculated as ratio of total amounts of tokens rather than ratio of supplies
        // because no excluded users exist yet
        uint256 rate = _rTotal.div(_tTotal);

        _farming = farming_;

        // 44.5% are allocated to the farming pool
        uint256 _toFarming = _tTotal.mul(percentsToFarming).div(
            percentConverter
        );
        _rOwned[_farming] = _toFarming.mul(rate);
        emit Transfer(address(0), _farming, _toFarming);

        // 55.5% are allocated to the owner
        uint256 _toOwner = _tTotal.mul(percentsToOwner).div(percentConverter);
        _rOwned[msg.sender] = _toOwner.mul(rate);
        emit Transfer(address(0), msg.sender, _toOwner);

        // TODO why no t-space transfers are done here?

        // Set default fees to 2%
        setFees(200);
    }

    /// @notice See {IMaze-maxTotalSupply}
    function maxTotalSupply() public view returns (uint256) {
        return _tTotal;
    }

    // TODO for now max supply in equal to totalsupply right away. That should be
    // changed after adding mint function
    /// @notice See {IMaze-totalSupply}
    function totalSupply() public view returns (uint256) {
        return _tTotal;
    }

    /// @notice See {IMaze-balanceOf}
    function balanceOf(address account) public view override returns (uint256) {
        if (_isExcluded[account]) {
            // If user is excluded from stakers, his balance is the amount of t-space tokens he owns
            return _tOwned[account];
        } else {
            // If users is one of stakers, his balance is calculated using r-space tokens
            return reflectToTSpace(_rOwned[account]);
        }
    }

    /// @notice See {IMaze-allowance}
    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @notice See {IMaze-approve}
    function approve(
        address spender,
        uint256 amount
    ) public override whenNotPaused {
        _approve(msg.sender, spender, amount);
    }

    /// @notice See {IMaze-transfer}
    function transfer(
        address to,
        uint256 amount
    ) public override whenNotPaused {
        _transfer(msg.sender, to, amount);
    }

    /// @notice See {IMaze-transferFrom}
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public whenNotPaused {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            msg.sender,
            _allowances[sender][msg.sender].sub(
                amount,
                "Maze: transfer amount exceeds allowance"
            )
        );
    }

    /// @notice See {IMaze-increaseAllowance}
    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public whenNotPaused {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].add(addedValue)
        );
    }

    /// @notice See {IMaze-decreaseAllowance}
    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public whenNotPaused {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].sub(
                subtractedValue,
                "Maze: decreased allowance below zero"
            )
        );
    }

    /// @notice See {IMaze-setFees}
    function setFees(uint256 _feeInBP) public whenNotPaused onlyOwner {
        // TODO any other limits here?
        require(_feeInBP <= 15, "Maze: 0% >= TRANSACTION FEE <= 15%");
        feeInBP = _feeInBP;
        emit SetFees(_feeInBP);
    }

    /// @notice See {IMaze-addToWhitelist}
    function addToWhitelist(address account) public whenNotPaused onlyOwner {
        whitelist[account] = true;
        emit AddToWhitelist(account);
    }

    /// @notice See {IMaze-removeFromWhitelist}
    function removeFromWhitelist(address account) public whenNotPaused onlyOwner {
        whitelist[account] = false;
        emit RemoveFromWhitelist(account);
    }

    /// @notice See {IMaze-pause}
    function pause() public {
        _pause();
    }

    /// @notice See {IMaze-unpause}
    function unpause() public {
        _unpause();
    }

    /// @notice See {IMaze-includeIntoStakers}
    function includeIntoStakers(
        address account
    ) public whenNotPaused onlyOwner {
        require(_isExcluded[account], "Maze: Account is already included");
        for (uint256 i = 0; i < _excluded.length; i++) {
            // Remove account from list of exluded
            if (_excluded[i] == account) {
                _excluded[i] = _excluded[_excluded.length - 1];
                _excluded.pop();
                break;
            }
        }
        // TODO what's that for?
        _tOwned[account] = 0;
        _isExcluded[account] = false;
        emit IncludeIntoStakers(account);
    }

    /// @notice See {IMaze-excludeFromStakers}
    function excludeFromStakers(
        address account
    ) public whenNotPaused onlyOwner {
        require(!_isExcluded[account], "Maze: Account is already excluded");
        // Update owned amount in t-space before excluding
        if (_rOwned[account] > 0) {
            _tOwned[account] = reflectToTSpace(_rOwned[account]);
        }
        _isExcluded[account] = true;
        _excluded.push(account);
        emit ExcludeFromStakers(account);
    }

    /// @notice Reflect tokens amount from r-space to t-space
    /// @param rAmount Token amount in r-space
    /// @return The reflected amount of tokens (r-space)
    /// @dev tAmount = rAmount / rate
    function reflectToTSpace(uint256 rAmount) private view returns (uint256) {
        require(
            rAmount <= _rTotal,
            "Maze: Amount must be less than total reflections"
        );
        uint256 rate = _getRate();
        return rAmount.div(rate);
    }

    /// @dev Calculates 2 t-space and 3 r-space values based on one t-space amount
    /// @param tAmount The whole transferred amount including fees (t-space)
    /// @return Amount of tokens to be transferred to the recipient (t-space)
    /// @return Amount of tokens to be taken as fees (t-space)
    /// @return The whole transferred amount including fees (r-space)
    /// @return Amount of tokens to be transferred to the recipient (r-space)
    /// @return Amount of tokens to be takes as fees (r-space)
    function _getValues(
        uint256 tAmount
    ) private view returns (uint256, uint256, uint256, uint256, uint256) {
        (uint256 tTransferAmount, uint256 tFee) = _getTValues(tAmount);
        uint256 rate = _getRate();
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee) = _getRValues(
            tAmount,
            tFee,
            rate
        );
        return (rAmount, rTransferAmount, rFee, tTransferAmount, tFee);
    }

    /// @dev Calculates transferred amount and fee amount in t-space
    /// @param tAmount The whole transferred amount including fees (t-space)
    /// @return Amount of tokens to be transferred to the recipient (t-space)
    /// @return Amount of tokens to be taken as fees (t-space)
    function _getTValues(
        uint256 tAmount
    ) private view returns (uint256, uint256) {
        uint256 tFee = 0;
        // Whitelisted users don't pay fees
        if (!whitelist[msg.sender]) {
            tFee = tAmount.mul(feeInBP).div(percentConverter);
        }
        // Received amount = whole amount - fees
        uint256 tTransferAmount = tAmount.sub(tFee);
        return (tTransferAmount, tFee);
    }

    /// @dev Calculates reflected amounts (from t-space) in r-space
    /// @param tAmount The whole transferred amount including fees (t-space)
    /// @param tFee Fee amount (t-space)
    /// @param rate Rate of conversion between t-space and r-space
    /// @return The whole transferred amount including fees (r-space)
    /// @return Amount of tokens to be transferred to the recipient (r-space)
    /// @return Amount of tokens to be taken as fees (r-space)
    function _getRValues(
        uint256 tAmount,
        uint256 tFee,
        uint256 rate
    ) private view returns (uint256, uint256, uint256) {
        // Reflect from t-space into r-space
        uint256 rAmount = tAmount.mul(rate);
        uint256 rFee = tFee.mul(rate);
        // Received amount = whole amount - fees
        uint256 rTransferAmount = rAmount.sub(rFee);
        return (rAmount, rTransferAmount, rFee);
    }

    /// @dev Calculates current conversion rate
    /// @return Conversion rate
    function _getRate() private view returns (uint256) {
        (uint256 rSupply, uint256 tSupply) = _getSupplies();
        // Rate is a ratio of r-space supply and t-space supply
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
        // Decrease supplies by amount owned by non-stakers
        for (uint256 i = 0; i < _excluded.length; i++) {
            // TODO how is it possible?
            if (
                _rOwned[_excluded[i]] > rSupply ||
                _tOwned[_excluded[i]] > tSupply
            ) {
                return (_rTotal, _tTotal);
            }
            rSupply = rSupply.sub(_rOwned[_excluded[i]]);
            tSupply = tSupply.sub(_tOwned[_excluded[i]]);
        }
        // TODO what's that for?
        if (rSupply < _rTotal.div(_tTotal)) {
            return (_rTotal, _tTotal);
        }
        return (rSupply, tSupply);
    }

    /// @dev Allows spender to spend tokens on behalf of the transaction sender via transferFrom
    /// @param owner Owner's address
    /// @param spender Spender's address
    /// @param amount The amount of tokens spender is allowed to spend
    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "Maze: approve from the zero address");
        require(spender != address(0), "Maze: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /// @dev Transfers tokens to the given address
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param amount The amount of tokens to send
    function _transfer(address from, address to, uint256 amount) private {
        require(from != address(0), "Maze: transfer from the zero address");
        require(to != address(0), "Maze: transfer to the zero address");
        require(amount > 0, "Maze: Transfer amount must be greater than zero");

        // Next transfer logic depends on which accout is excluded (in any)
        // If account is excluded his t-space balance does not change
        if (_isExcluded[from] && !_isExcluded[to]) {
            _transferFromExcluded(from, to, amount);
        } else if (!_isExcluded[from] && _isExcluded[to]) {
            _transferToExcluded(from, to, amount);
        } else if (!_isExcluded[from] && !_isExcluded[to]) {
            _transferStandard(from, to, amount);
        } else if (_isExcluded[from] && _isExcluded[to]) {
            _transferBothExcluded(from, to, amount);
        } else {
            // TODO Do I need it? It's the same as case when both are not exluded
            _transferStandard(from, to, amount);
        }
    }

    /// @dev Transfers tokens from included account to included account
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param tAmount The amount of tokens to send
    function _transferStandard(
        address from,
        address to,
        uint256 tAmount
    ) private {
        (
            uint256 rAmount,
            uint256 rTransferAmount,
            uint256 rFee,
            uint256 tTransferAmount,
            uint256 tFee
        ) = _getValues(tAmount);
        // Only change sender's and recipient's balances in r-space (they are both included)
        _rOwned[from] = _rOwned[from].sub(rAmount);
        _rOwned[to] = _rOwned[to].add(rTransferAmount);
        _processFees(rFee, tFee);
        emit Transfer(from, to, tTransferAmount);
    }

    /// @dev Transfers tokens from included account to excluded account
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param tAmount The amount of tokens to send
    function _transferToExcluded(
        address from,
        address to,
        uint256 tAmount
    ) private {
        (
            uint256 rAmount,
            uint256 rTransferAmount,
            uint256 rFee,
            uint256 tTransferAmount,
            uint256 tFee
        ) = _getValues(tAmount);
        // Only decrease sender's balance in r-space (he is included)
        _rOwned[from] = _rOwned[from].sub(rAmount);
        // Increase recipient's balance in both t-space and r-space
        _tOwned[to] = _tOwned[to].add(tTransferAmount);
        _rOwned[to] = _rOwned[to].add(rTransferAmount);
        _processFees(rFee, tFee);
        emit Transfer(from, to, tTransferAmount);
    }

    /// @dev Transfers tokens from excluded to included account
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param tAmount The amount of tokens to send
    function _transferFromExcluded(
        address from,
        address to,
        uint256 tAmount
    ) private {
        (
            uint256 rAmount,
            uint256 rTransferAmount,
            uint256 rFee,
            uint256 tTransferAmount,
            uint256 tFee
        ) = _getValues(tAmount);
        // Decrease sender's balances in both t-space and r-space
        _tOwned[from] = _tOwned[from].sub(tAmount);
        _rOwned[from] = _rOwned[from].sub(rAmount);
        // Only increase recipient's balance in r-space (he is included)
        _rOwned[to] = _rOwned[to].add(rTransferAmount);
        _processFees(rFee, tFee);
        emit Transfer(from, to, tTransferAmount);
    }

    /// @dev Transfers tokens between two exluced accounts
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param tAmount The amount of tokens to send
    function _transferBothExcluded(
        address from,
        address to,
        uint256 tAmount
    ) private {
        (
            uint256 rAmount,
            uint256 rTransferAmount,
            uint256 rFee,
            uint256 tTransferAmount,
            uint256 tFee
        ) = _getValues(tAmount);
        // Decrease sender's balances in both t-space and r-space
        _tOwned[from] = _tOwned[from].sub(tAmount);
        _rOwned[from] = _rOwned[from].sub(rAmount);
        // Increase recipient's balances in both t-space and r-space
        _tOwned[to] = _tOwned[to].add(tTransferAmount);
        _rOwned[to] = _rOwned[to].add(rTransferAmount);
        _processFees(rFee, tFee);
        emit Transfer(from, to, tTransferAmount);
    }

    /// @dev Distributes r-space fees among stakers
    /// @param rFee Fee amount (r-space)
    /// @param tFee Fee amount (t-space)
    function _processFees(uint256 rFee, uint256 tFee) private {
        // TODO check if logic correct here
        // Calculate the amount of r-space tokens to distribute among holders
        uint256 rToHolders = rFee.mul(feeInBP).div(percentConverter);
        // Decrease the total amount of r-space tokens.
        // This is the fees distribution.
        _rTotal = _rTotal.sub(rToHolders);
        _tFeeTotal = _tFeeTotal.add(tFee);
    }
}
