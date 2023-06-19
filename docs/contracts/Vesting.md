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
function getVesting(uint256 id) external view returns (enum IVesting.VestingStatus, address, uint256, uint256, uint256, uint256, uint256, bool, uint256, uint256)
```

See {IVesting-getVesting}



#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | enum IVesting.VestingStatus | undefined |
| _1 | address | undefined |
| _2 | uint256 | undefined |
| _3 | uint256 | undefined |
| _4 | uint256 | undefined |
| _5 | uint256 | undefined |
| _6 | uint256 | undefined |
| _7 | bool | undefined |
| _8 | uint256 | undefined |
| _9 | uint256 | undefined |

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

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



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.*


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
| to  | address | undefined |
| amount  | uint256 | undefined |

### Unpaused

```solidity
event Unpaused(address account)
```





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
| to  | address | undefined |
| amount  | uint256 | undefined |
| cliffDuration  | uint256 | undefined |
| cliffUnlock  | uint256 | undefined |
| claimablePeriods  | uint256 | undefined |



