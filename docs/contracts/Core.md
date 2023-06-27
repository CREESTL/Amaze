# Core



> Core contract to block users of the Amaze platform





## Methods

### addToBlacklist

```solidity
function addToBlacklist(address account) external nonpayable
```

See {ICore-addToBlacklist}



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### blacklist

```solidity
function blacklist(address) external view returns (bool)
```

Marks that account is blacklisted



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### checkBlacklisted

```solidity
function checkBlacklisted(address account) external view returns (bool)
```

See {ICore-checkBlacklisted}



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### farming

```solidity
function farming() external view returns (address)
```

The address of the Farming contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### maze

```solidity
function maze() external view returns (address)
```

The address of the Maze contract




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

### pause

```solidity
function pause() external nonpayable
```

See {ICore-pause}




### paused

```solidity
function paused() external view returns (bool)
```



*Returns true if the contract is paused, and false otherwise.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |

### removeFromBlacklist

```solidity
function removeFromBlacklist(address account) external nonpayable
```

See {ICore-removeFromBlacklist}



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby disabling any functionality that is only available to the owner.*


### setFarming

```solidity
function setFarming(address farming_) external nonpayable
```

See {ICore-setFarming}



#### Parameters

| Name | Type | Description |
|---|---|---|
| farming_ | address | undefined |

### setMaze

```solidity
function setMaze(address maze_) external nonpayable
```

See {ICore-setMaze}



#### Parameters

| Name | Type | Description |
|---|---|---|
| maze_ | address | undefined |

### setVesting

```solidity
function setVesting(address vesting_) external nonpayable
```

See {ICore-setVesting}



#### Parameters

| Name | Type | Description |
|---|---|---|
| vesting_ | address | undefined |

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

See {ICore-unpause}




### vesting

```solidity
function vesting() external view returns (address)
```

The address of the Vesting contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |



## Events

### AddToBlacklist

```solidity
event AddToBlacklist(address account)
```

Indicates that account has been added to the blacklist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### FarmingChanged

```solidity
event FarmingChanged(address farming)
```

Indicates that new Farming address was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| farming  | address | undefined |

### MazeChanged

```solidity
event MazeChanged(address maze)
```

Indicates that new Maze address was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| maze  | address | undefined |

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

### RemoveFromBlacklist

```solidity
event RemoveFromBlacklist(address account)
```

Indicates that account has been removed from the blacklist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |

### VestingChanged

```solidity
event VestingChanged(address vesting)
```

Indicates that new Vesting address was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| vesting  | address | undefined |



