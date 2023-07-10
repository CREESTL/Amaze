# IFarming





Interface of the Farming contract



## Methods

### claim

```solidity
function claim() external nonpayable
```

Claims user&#39;s rewards for farming.         Two calls of this function are required to claim.         Claim is only possible after full unlock.




### getFarming

```solidity
function getFarming(address user) external view returns (uint256, uint256, uint256, uint256)
```

Returns information about user&#39;s farming



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user who is farming tokens |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The current locked amount |
| _1 | uint256 | The time lock has started |
| _2 | uint256 | The time lock will end |
| _3 | uint256 | The reward for farming |

### getReward

```solidity
function getReward(address user) external nonpayable returns (uint256)
```

Returns the farming reward of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user to get the reward of |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | Farming reward of the user |

### lock

```solidity
function lock(uint256 amount) external nonpayable
```

Locks user&#39;s tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | The amount of tokens to lock |

### lockOnBehalf

```solidity
function lockOnBehalf(address admin, address user, uint256 amount) external nonpayable
```

Recieves tokens from the admin and locks them         on behalf of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| admin | address | The address of the admin to receive tokens from |
| user | address | The address of the user to lock on behalf of |
| amount | uint256 | The amount of tokens to lock |

### notifyRewardAmount

```solidity
function notifyRewardAmount(uint256 amount) external nonpayable
```

Notify contract of the avalable reward amount

*Before a staking contract could distribute rewards to the stakers the admin should send tokens to it and call this function*

#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | amount sent to the staking |

### pause

```solidity
function pause() external nonpayable
```

Pause the contract




### rewardPerToken

```solidity
function rewardPerToken() external view returns (uint256)
```

Reward amount for each token stored by the user




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### setDailyRate

```solidity
function setDailyRate(uint256 rate) external nonpayable
```

Sets new daily period



#### Parameters

| Name | Type | Description |
|---|---|---|
| rate | uint256 | The new rate to set. Represented in Basis Points 1e18 - 100% 1e17 - 10% 1e16 - 1% etc |

### setMinLockPeriod

```solidity
function setMinLockPeriod(uint256 period) external nonpayable
```

Sets a new minimum locking period



#### Parameters

| Name | Type | Description |
|---|---|---|
| period | uint256 | A new locking period in seconds |

### unlock

```solidity
function unlock(uint256 amount) external nonpayable
```

Unlocks user&#39;s tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | The amount of tokens to unlock |

### unlockAll

```solidity
function unlockAll() external nonpayable
```

Unlocks all user&#39;s locked tokense




### unlockFromVesting

```solidity
function unlockFromVesting(address user, uint256 amount) external nonpayable
```

Unlocks tokens for Vesting contract.         Ignores minimum locking period



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user to send unlocked tokens to |
| amount | uint256 | The amount of tokens to unlock |

### unpause

```solidity
function unpause() external nonpayable
```

Unpause the contract






## Events

### ClaimAttempt

```solidity
event ClaimAttempt(address user)
```

Indicates that first call to claim function was made



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | The user who is trying to claim tokens |

### Claimed

```solidity
event Claimed(address user, uint256 amount)
```

Indicates that tokens were claimed by the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | The user who claimed the tokens |
| amount  | uint256 | The amount of claimed tokens |

### DailyRateChanged

```solidity
event DailyRateChanged(uint256 rate)
```

Indicates that a new daily rate was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| rate  | uint256 | The new daily rate |

### FundsAdded

```solidity
event FundsAdded(uint256 amount)
```

Indicates that funds were added to the staking for distribution



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount  | uint256 | Token amount added |

### Locked

```solidity
event Locked(address user, uint256 amount)
```

Indicates that tokens have been locked by the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | The user tokens were locked on behalf of |
| amount  | uint256 | The amount of tokens locked |

### LockedOnBehalf

```solidity
event LockedOnBehalf(address admin, address user, uint256 amount)
```

Indicates that tokens have been locked by the admin         on behalf of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| admin  | address | The admin who locked the tokens |
| user  | address | The user who is considered to be a locker |
| amount  | uint256 | The amount of tokens locked |

### MinLockPeriodChanged

```solidity
event MinLockPeriodChanged(uint256 period)
```

Indicates that a new minimum locking period was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| period  | uint256 | A new locking period in seconds |

### Unlocked

```solidity
event Unlocked(address user, uint256 newLock)
```

Indicates that tokens were unlocked by the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | The user who unlocked tokens |
| newLock  | uint256 | The new locked amount of the user |

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



