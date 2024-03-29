# Vesting



> The contract for Maze tokens vesting





## Methods

### claimTokens

```solidity
function claimTokens() external nonpayable
```

See {IVesting-claimVesting}




### core

```solidity
function core() external view returns (contract ICore)
```

Address of the Core contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICore | undefined |

### getUserVestings

```solidity
function getUserVestings(address user) external view returns (uint256[])
```

See {IVesting-getUsersVestings}



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256[] | undefined |

### getVesting

```solidity
function getVesting(uint256 id) external view returns (struct IVesting.TokenVesting)
```

See {IVesting-getVesting}



#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IVesting.TokenVesting | undefined |

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

See {IVesting-pause}




### paused

```solidity
function paused() external view returns (bool)
```



*Returns true if the contract is paused, and false otherwise.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality that is only available to the owner.*


### startVesting

```solidity
function startVesting(address to, uint256 amount, uint256 cliffDuration, uint256 cliffUnlock, uint256 claimablePeriods) external nonpayable
```

See {IVesting-startVesting}



#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| amount | uint256 | undefined |
| cliffDuration | uint256 | undefined |
| cliffUnlock | uint256 | undefined |
| claimablePeriods | uint256 | undefined |

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

See {IVesting-unpause}






## Events

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

### TokensClaimed

```solidity
event TokensClaimed(address to, uint256 amount)
```

Indicates that user has claimed vested tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| to  | address | The reciever of vested tokens |
| amount  | uint256 | The amount of tokens claimed |

### Unpaused

```solidity
event Unpaused(address account)
```



*Emitted when the pause is lifted by `account`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### VestingStarted

```solidity
event VestingStarted(address to, uint256 amount, uint256 cliffDuration, uint256 cliffUnlock, uint256 claimablePeriods)
```

Indicates that a new vesting has



#### Parameters

| Name | Type | Description |
|---|---|---|
| to  | address | The recipient of tokens after cliff |
| amount  | uint256 | The total amount of tokens to be vested |
| cliffDuration  | uint256 | The duration of cliff period |
| cliffUnlock  | uint256 | Percentage of tokens unlocked right after the cliff |
| claimablePeriods  | uint256 | The number of periods after cliff in which user can claim tokens |



