# IFarming





Interface of the Farming contract



## Methods

### lockOnBehalf

```solidity
function lockOnBehalf(address user, uint256 amount) external nonpayable
```

Recieves and locks Maze tokens from Vesting contract to farm         on behalf of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The address of the user to lock on behalf of |
| amount | uint256 | The amount of Maze tokens to lock |

### unlockOnBehalf

```solidity
function unlockOnBehalf(address user, uint256 amount) external nonpayable
```

Unlockes Maze tokens on behalf of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The address of the user to unlock on behalf of |
| amount | uint256 | The amount of Maze tokens to unlock |



## Events

### LockedOnBehalf

```solidity
event LockedOnBehalf(address user, uint256 amount)
```

Indicates that tokens have been locked by the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | The user tokens were locked on behalf of |
| amount  | uint256 | The amount of tokens locked |

### UnlockedOnBehalf

```solidity
event UnlockedOnBehalf(address user, uint256 amount)
```

Indicates that locked amount of the user has decreased



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | The user whos locked amount was decreased |
| amount  | uint256 | The new locked amount of the user |



