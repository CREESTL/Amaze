# IBlacklist









## Methods

### addToBlacklist

```solidity
function addToBlacklist(address account) external nonpayable
```

Adds a new account to the blacklist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | The account to add to the blacklist |

### checkBlacklisted

```solidity
function checkBlacklisted(address account) external view returns (bool)
```

Checks if account is blacklisted



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | The account to check |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | True if account is blacklisted. Otherwise - false |

### farming

```solidity
function farming() external nonpayable returns (address)
```

Returns the address of the Farming contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | The address of the Farming contract |

### maze

```solidity
function maze() external nonpayable returns (address)
```

Returns the address of the Maze contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | The address of the Maze contract |

### pause

```solidity
function pause() external nonpayable
```

Pause the contract




### removeFromBlacklist

```solidity
function removeFromBlacklist(address account) external nonpayable
```

Removes account from the blacklist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | The account to remove from the blacklist |

### setFarming

```solidity
function setFarming(address farming_) external nonpayable
```

Sets the new address of the Farming contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| farming_ | address | The new address of the Farming contract |

### setMaze

```solidity
function setMaze(address maze_) external nonpayable
```

Sets the new address of the Maze contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| maze_ | address | The new address of the Maze contract |

### setVesting

```solidity
function setVesting(address vesting_) external nonpayable
```

Sets the new address of the Vesting contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| vesting_ | address | The new address of the Vesting contract |

### unpause

```solidity
function unpause() external nonpayable
```

Unpause the contract




### vesting

```solidity
function vesting() external nonpayable returns (address)
```

Returns the address of the Vesting contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | The address of the Vesting contract |



## Events

### AddToBlacklist

```solidity
event AddToBlacklist(address account)
```

Indicates that account has been added to the blacklist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | The account added to the blacklist |

### FarmingChanged

```solidity
event FarmingChanged(address farming)
```

Indicates that new Farming address was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| farming  | address | The new address of the Farming contract |

### MazeChanged

```solidity
event MazeChanged(address maze)
```

Indicates that new Maze address was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| maze  | address | The new address of the Maze token |

### RemoveFromBlacklist

```solidity
event RemoveFromBlacklist(address account)
```

Indicates that account has been removed from the blacklist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | The account removed from the blacklist |

### VestingChanged

```solidity
event VestingChanged(address vesting)
```

Indicates that new Vesting address was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| vesting  | address | The new address of the Vesting contract |



