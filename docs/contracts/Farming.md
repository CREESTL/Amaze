# Farming



> The rewards farming contract





## Methods

### claim

```solidity
function claim() external nonpayable
```

See {IFarming-claim}




### core

```solidity
function core() external view returns (contract ICore)
```

The address of the Core contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICore | undefined |

### dailyRate

```solidity
function dailyRate() external view returns (uint256)
```

The daily rate of rewards         Is represented in Basis Points




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getFarming

```solidity
function getFarming(address user) external view returns (uint256, uint256, uint256, uint256)
```

See {IFarming-getFarming}



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |
| _1 | uint256 | undefined |
| _2 | uint256 | undefined |
| _3 | uint256 | undefined |

### getReward

```solidity
function getReward(address user) external view returns (uint256)
```

See {IFarming-getReward}



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### lock

```solidity
function lock(uint256 amount) external nonpayable
```

See {IFarming-lock}



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### lockOnBehalf

```solidity
function lockOnBehalf(address admin, address user, uint256 amount) external nonpayable
```

See {IFarming-lockOnBehalf}



#### Parameters

| Name | Type | Description |
|---|---|---|
| admin | address | undefined |
| user | address | undefined |
| amount | uint256 | undefined |

### minClaimGap

```solidity
function minClaimGap() external view returns (uint256)
```

The minimum gap between two calls of `claim` function.         After that gap tokens are actually claimed




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### minLockPeriod

```solidity
function minLockPeriod() external view returns (uint256)
```

The minumum lock period.         During this period after lock users cannot unlock tokens.         By default period is 1 month.




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

See {IFarming-pause}




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


### setDailyRate

```solidity
function setDailyRate(uint256 rate) external nonpayable
```

See {IFarming-setDailyRate}



#### Parameters

| Name | Type | Description |
|---|---|---|
| rate | uint256 | undefined |

### setMinLockPeriod

```solidity
function setMinLockPeriod(uint256 period) external nonpayable
```

See {IFarming-setMinLockPeriod}



#### Parameters

| Name | Type | Description |
|---|---|---|
| period | uint256 | undefined |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### unlock

```solidity
function unlock(uint256 amount) external nonpayable
```

See {IFarming-unlock}



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### unlockAll

```solidity
function unlockAll() external nonpayable
```

See {IFarming-unlockAll}




### unlockFromVesting

```solidity
function unlockFromVesting(address user, uint256 amount) external nonpayable
```

See {IFarming-unlockFromVesting}



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |
| amount | uint256 | undefined |

### unpause

```solidity
function unpause() external nonpayable
```

See {IFarming-unpause}






## Events

### ClaimAttempt

```solidity
event ClaimAttempt(address user)
```

Indicates that first call to claim function was made



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | undefined |

### Claimed

```solidity
event Claimed(address user, uint256 amount)
```

Indicates that tokens were claimed by the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | undefined |
| amount  | uint256 | undefined |

### DailyRateChanged

```solidity
event DailyRateChanged(uint256 rate)
```

Indicates that a new daily rate was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| rate  | uint256 | undefined |

### Locked

```solidity
event Locked(address user, uint256 amount)
```

Indicates that tokens have been locked by the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | undefined |
| amount  | uint256 | undefined |

### LockedOnBehalf

```solidity
event LockedOnBehalf(address admin, address user, uint256 amount)
```

Indicates that tokens have been locked by the admin         on behalf of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| admin  | address | undefined |
| user  | address | undefined |
| amount  | uint256 | undefined |

### MinLockPeriodChanged

```solidity
event MinLockPeriodChanged(uint256 period)
```

Indicates that a new minimum locking period was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| period  | uint256 | undefined |

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

### Unlocked

```solidity
event Unlocked(address user, uint256 newLock)
```

Indicates that tokens were unlocked by the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | undefined |
| newLock  | uint256 | undefined |

### UnlockedOnBehalf

```solidity
event UnlockedOnBehalf(address user, uint256 amount)
```

Indicates that locked amount of the user has decreased



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | undefined |
| amount  | uint256 | undefined |

### Unpaused

```solidity
event Unpaused(address account)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |



