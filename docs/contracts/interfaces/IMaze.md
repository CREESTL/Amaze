# IMaze





Interface of the ERC20 standard as defined in the EIP.



## Methods

### addToWhitelist

```solidity
function addToWhitelist(address account) external nonpayable
```

Adds a user to the whitelist         Whitelisted users do not pay fees



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | Address of the user |

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

Returns the amount of tokens that spender is allowed to spend on behalf of owner



#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | Token owner&#39;s address |
| spender | address | Spender&#39;s address |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### approve

```solidity
function approve(address spender, uint256 amount) external nonpayable returns (bool)
```

Allows spender to spend tokens on behalf of the transaction sender via transferFrom



#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | Spender&#39;s address |
| amount | uint256 | The amount of tokens spender is allowed to spend |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | Boolean value indicating that operation succeded |

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

Returns the balance of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | The address of the user |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### burn

```solidity
function burn(uint256 amount) external nonpayable
```

Burns tokens of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | The amount of tokens to burn |

### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external nonpayable returns (bool)
```

Decrease the amount of tokens to spend on behalf of an owner



#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | Spender&#39;s address |
| subtractedValue | uint256 | Amount of tokens to subtract from allowance |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | Boolean value indicating that operation succeded |

### excludeFromStakers

```solidity
function excludeFromStakers(address account) external nonpayable
```

Exclude the user from the stakers list.         Excluded users do not get shares of fees from tokens transfers



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | The address of the user to exlude from stakers |

### includeIntoStakers

```solidity
function includeIntoStakers(address account) external nonpayable
```

Includes the user to the stakers list.         Included users get shares of fees from tokens transfers



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | The address of the user to include into stakers |

### increaseAllowance

```solidity
function increaseAllowance(address spender, uint256 addedValue) external nonpayable returns (bool)
```

Increases the amount of tokens to spend on behalf of an owner



#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | Spender&#39;s address |
| addedValue | uint256 | Amount of tokens to add to allowance |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | Boolean value indicating that operation succeded |

### pause

```solidity
function pause() external nonpayable
```

Pause the contract




### removeFromWhitelist

```solidity
function removeFromWhitelist(address account) external nonpayable
```

Remove a user from the whitelist         Whitelisted users do not pay fees



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | Address of the user |

### setFees

```solidity
function setFees(uint256 _feeInBP) external nonpayable
```

Set transaction fee amount in basis points



#### Parameters

| Name | Type | Description |
|---|---|---|
| _feeInBP | uint256 | Fee amount in basis points |

### totalFee

```solidity
function totalFee() external view returns (uint256)
```

Returns total collected fee




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

Returns the amount of tokens in existence




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### transfer

```solidity
function transfer(address to, uint256 amount) external nonpayable returns (bool)
```

Transfers tokens to the given address



#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | Recipient&#39;s address |
| amount | uint256 | The amount of tokens to send |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | Boolean value indicating that operation succeded |

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 amount) external nonpayable returns (bool)
```

Transfers tokens to a given address on behalf of the owner



#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | Sender&#39;s address |
| to | address | Recipient&#39;s address |
| amount | uint256 | The amount of tokens to send |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | Boolean value indicating that operation succeded |

### unpause

```solidity
function unpause() external nonpayable
```

Unpause the contract






## Events

### AddToWhitelist

```solidity
event AddToWhitelist(address account)
```

Indicates that user has been added to whitelist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### Approval

```solidity
event Approval(address indexed owner, address indexed spender, uint256 allowance)
```

Indicates that allowance from `owner` for `spender` is now equal to `allowance`



#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |
| spender `indexed` | address | undefined |
| allowance  | uint256 | undefined |

### ExcludeFromStakers

```solidity
event ExcludeFromStakers(address account)
```

Indicates that user has been excluded from stakers



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### IncludeIntoStakers

```solidity
event IncludeIntoStakers(address account)
```

Indicates that user has been included into stakers



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### RemoveFromWhitelist

```solidity
event RemoveFromWhitelist(address account)
```

Indicates that user has been removed from whitelist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### SetFees

```solidity
event SetFees(uint256 newFeeAmount)
```

Indicates that fee amount has been changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| newFeeAmount  | uint256 | undefined |

### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 amount)
```

Indicates that `amount` tokens has been transferred from `from` to `to`



#### Parameters

| Name | Type | Description |
|---|---|---|
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| amount  | uint256 | undefined |



