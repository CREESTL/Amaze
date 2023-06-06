// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

/// @notice Interface of the ERC20 standard as defined in the EIP.
interface IMaze {
    /// @notice Indicates that `amount` tokens has been transferred from `from` to `to`
    event Transfer(address indexed from, address indexed to, uint256 amount);

    /// @notice Indicates that allowance from `owner` for `spender` is now equal to `allowance`
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 allowance
    );

    /// @notice Indicates that fee amount has been changed
    event SetFees(uint256 newFeeAmount);

    /// @notice Indicates that user has been added to whitelist
    event AddToWhitelist(address account);

    /// @notice Indicates that user has been removed from whitelist
    event RemoveFromWhitelist(address account);

    /// @notice Indicates that user has been included into stakers
    event IncludeIntoStakers(address account);

    /// @notice Indicates that user has been excluded from stakers
    event ExcludeFromStakers(address account);

    /// @notice Returns the amount of tokens in existence
    function totalSupply() external view returns (uint256);

    /// @notice Returns total collected fee
    function totalFee() external view returns (uint256);

    /// @notice Returns the balance of the user
    /// @param account The address of the user
    function balanceOf(address account) external view returns (uint256);

    /// @notice Returns the amount of tokens that spender is allowed to spend on behalf of owner
    /// @param owner Token owner's address
    /// @param spender Spender's address
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /// @notice Allows spender to spend tokens on behalf of the transaction sender via transferFrom
    /// @param spender Spender's address
    /// @param amount The amount of tokens spender is allowed to spend
    /// @return Boolean value indicating that operation succeded
    function approve(address spender, uint256 amount) external returns (bool);

    /// @notice Increases the amount of tokens to spend on behalf of an owner
    /// @param spender Spender's address
    /// @param addedValue Amount of tokens to add to allowance
    /// @return Boolean value indicating that operation succeded
    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) external returns (bool);

    /// @notice Decrease the amount of tokens to spend on behalf of an owner
    /// @param spender Spender's address
    /// @param subtractedValue Amount of tokens to subtract from allowance
    /// @return Boolean value indicating that operation succeded
    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) external returns (bool);

    /// @notice Transfers tokens to the given address
    /// @param to Recipient's address
    /// @param amount The amount of tokens to send
    /// @return Boolean value indicating that operation succeded
    function transfer(address to, uint256 amount) external returns (bool);

    /// @notice Transfers tokens to a given address on behalf of the owner
    /// @param from Sender's address
    /// @param to Recipient's address
    /// @param amount The amount of tokens to send
    /// @return Boolean value indicating that operation succeded
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    /// @notice Set transaction fee amount in basis points
    /// @param _feeInBP Fee amount in basis points
    function setFees(uint256 _feeInBP) external;

    /// @notice Adds a user to the whitelist
    ///         Whitelisted users do not pay fees
    /// @param account Address of the user
    function addToWhitelist(address account) external;

    /// @notice Remove a user from the whitelist
    ///         Whitelisted users do not pay fees
    /// @param account Address of the user
    function removeFromWhitelist(address account) external;

    /// @notice Pause the contract
    function pause() external;

    /// @notice Unpause the contract
    function unpause() external;

    /// @notice Includes the user to the stakers list.
    ///         Included users get shares of fees from tokens transfers
    /// @param account The address of the user to include into stakers
    function includeIntoStakers(address account) external;

    /// @notice Exclude the user from the stakers list.
    ///         Excluded users do not get shares of fees from tokens transfers
    /// @param account The address of the user to exlude from stakers
    function excludeFromStakers(address account) external;

    /// @notice Burns tokens of the user
    /// @param amount The amount of tokens to burn
    function burn(uint256 amount) external;
}
