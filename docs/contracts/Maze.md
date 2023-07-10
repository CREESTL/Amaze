# Maze



> ERC20 token with RFI logic



*NOTE: This contract uses the principals of RFI tokens            for detailed documentation please see:            https://reflect-contract-doc.netlify.app/#a-technical-whitepaper-for-reflect-contracts*

## Methods

### addToWhitelist

```solidity
function addToWhitelist(address account) external nonpayable
```

See {IMaze-addToWhitelist}



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

See {IMaze-allowance}



#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined |
| spender | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### approve

```solidity
function approve(address spender, uint256 amount) external nonpayable returns (bool)
```

See {IMaze-approve}



#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

See {IMaze-balanceOf}



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### burn

```solidity
function burn(uint256 amount) external nonpayable
```

See {IMaze-burn}



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### core

```solidity
function core() external view returns (contract ICore)
```

The address of the Core contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICore | undefined |

### decimals

```solidity
function decimals() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined |

### decreaseAllowance

```solidity
function decreaseAllowance(address spender, uint256 subtractedValue) external nonpayable returns (bool)
```

See {IMaze-decreaseAllowance}



#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined |
| subtractedValue | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### excludeFromStakers

```solidity
function excludeFromStakers(address account) external nonpayable
```

See {IMaze-excludeFromStakers}



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### feeInBP

```solidity
function feeInBP() external view returns (uint256)
```

The percentage of transferred tokens to be taken as fee for any token transfers         Fee is distributed among token holders         Expressed in basis points




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### includeIntoStakers

```solidity
function includeIntoStakers(address account) external nonpayable
```

See {IMaze-includeIntoStakers}



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### increaseAllowance

```solidity
function increaseAllowance(address spender, uint256 addedValue) external nonpayable returns (bool)
```

See {IMaze-increaseAllowance}



#### Parameters

| Name | Type | Description |
|---|---|---|
| spender | address | undefined |
| addedValue | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### isExcluded

```solidity
function isExcluded(address) external view returns (bool)
```

Marks that account is exluded from staking. Exluded accounts do not         get shares of distributed fees



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### isWhitelisted

```solidity
function isWhitelisted(address) external view returns (bool)
```

List of whitelisted accounts. Whitelisted accounts do not pay fees on token transfers.



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### name

```solidity
function name() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### pause

```solidity
function pause() external nonpayable
```

See {IMaze-pause}




### paused

```solidity
function paused() external view returns (bool)
```



*Returns true if the contract is paused, and false otherwise.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### removeFromWhitelist

```solidity
function removeFromWhitelist(address account) external nonpayable
```

See {IMaze-removeFromWhitelist}



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality that is only available to the owner.*


### setFees

```solidity
function setFees(uint256 _feeInBP) external nonpayable
```

See {IMaze-setFees}



#### Parameters

| Name | Type | Description |
|---|---|---|
| _feeInBP | uint256 | undefined |

### symbol

```solidity
function symbol() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined |

### totalFee

```solidity
function totalFee() external view returns (uint256)
```

See {IMaze-totalFee}




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

See {IMaze-totalSupply}




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### transfer

```solidity
function transfer(address to, uint256 amount) external nonpayable returns (bool)
```

See {IMaze-transfer}



#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### transferFrom

```solidity
function transferFrom(address sender, address recipient, uint256 amount) external nonpayable returns (bool)
```

See {IMaze-transferFrom}



#### Parameters

| Name | Type | Description |
|---|---|---|
| sender | address | undefined |
| recipient | address | undefined |
| amount | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### unpause

```solidity
function unpause() external nonpayable
```

See {IMaze-unpause}






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

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### Paused

```solidity
event Paused(address account)
```



*Emitted when the pause is triggered by `account`.*

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

### Unpaused

```solidity
event Unpaused(address account)
```



*Emitted when the pause is lifted by `account`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |



