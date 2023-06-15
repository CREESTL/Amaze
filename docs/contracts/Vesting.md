# Vesting



> The contract for Maze tokens vesting





## Methods

### blacklist

```solidity
function blacklist() external view returns (address)
```

Address of the Blacklist contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### claimTokens

```solidity
function claimTokens() external nonpayable
```

See {IVesting-claimVesting}




### farming

```solidity
function farming() external view returns (address)
```

Address of the Farming contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

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
function getVesting(uint256 id) external view returns (address, uint256, uint256, uint256, uint256, uint256)
```

See {IVesting-getVesting}



#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |
| _1 | uint256 | undefined |
| _2 | uint256 | undefined |
| _3 | uint256 | undefined |
| _4 | uint256 | undefined |
| _5 | uint256 | undefined |

### maze

```solidity
function maze() external view returns (address)
```

Address of the Maze token




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

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


### setFarming

```solidity
function setFarming(address newFarming) external nonpayable
```

See {IVesting-setFarming}



#### Parameters

| Name | Type | Description |
|---|---|---|
| newFarming | address | undefined |

### setMaze

```solidity
function setMaze(address newMaze) external nonpayable
```

See {IVesting-setMaze}



#### Parameters

| Name | Type | Description |
|---|---|---|
| newMaze | address | undefined |

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

### FarmingChanged

```solidity
event FarmingChanged(address newFarming)
```

Indicates that Farming contract address was changed;



#### Parameters

| Name | Type | Description |
|---|---|---|
| newFarming  | address | undefined |

### MazeChanged

```solidity
event MazeChanged(address newMaze)
```

Indicates that Maze token address was changed;



#### Parameters

| Name | Type | Description |
|---|---|---|
| newMaze  | address | undefined |

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
event TokensClaimed(address to)
```

Indicates that user has claimed vested tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| to  | address | undefined |

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



