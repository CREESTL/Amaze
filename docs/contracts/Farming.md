# Farming



> The rewards farming contract





## Methods

### balanceOf

```solidity
function balanceOf(address) external view returns (uint256)
```

Staked amount of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

Daily reward rate 0.3% by default




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### farmingStart

```solidity
function farmingStart(address) external view returns (uint256)
```

First user lock timestamp



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getFarming

```solidity
function getFarming(address staker) external view returns (uint256, uint256, uint256, uint256)
```

See {IFarming-getFarming}



#### Parameters

| Name | Type | Description |
|---|---|---|
| staker | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |
| _1 | uint256 | undefined |
| _2 | uint256 | undefined |
| _3 | uint256 | undefined |

### getReward

```solidity
function getReward(address staker) external view returns (uint256)
```

See {IFarming-getReward}



#### Parameters

| Name | Type | Description |
|---|---|---|
| staker | address | undefined |

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

### lockEnds

```solidity
function lockEnds(address) external view returns (uint256)
```

Time after that unlock is available



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

### notifyRewardAmount

```solidity
function notifyRewardAmount(uint256 amount) external nonpayable
```

See {IFarming-notifyRewardAmount}



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

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


### rewardPerToken

```solidity
function rewardPerToken() external view returns (uint256)
```

See {IFarming-rewardPerToken}




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### rewardPerTokenStored

```solidity
function rewardPerTokenStored() external view returns (uint256)
```

Total reward per token stored at the staking




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### rewards

```solidity
function rewards(address) external view returns (uint256)
```

Rewards of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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

### totalReward

```solidity
function totalReward() external view returns (uint256)
```

Total available reward




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

Total staked




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

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




### unlockCooldown

```solidity
function unlockCooldown(address) external view returns (uint256)
```

Time after full unlock until user can&#39;t claim his rewards



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### unlockFromVesting

```solidity
function unlockFromVesting(address staker, uint256 amount) external nonpayable
```

See {IFarming-unlockFromVesting}



#### Parameters

| Name | Type | Description |
|---|---|---|
| staker | address | undefined |
| amount | uint256 | undefined |

### unpause

```solidity
function unpause() external nonpayable
```

See {IFarming-unpause}




### updatedAt

```solidity
function updatedAt() external view returns (uint256)
```

Last staking state update timestamp




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### userRewardPerTokenPaid

```solidity
function userRewardPerTokenPaid(address) external view returns (uint256)
```

Reward per token paid to the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### vestedAmount

```solidity
function vestedAmount(address) external view returns (uint256)
```

Vested amount of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |



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

### Unpaused

```solidity
event Unpaused(address account)
```



*Emitted when the pause is lifted by `account`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | undefined |



## Errors

### PRBMath_MulDiv18_Overflow

```solidity
error PRBMath_MulDiv18_Overflow(uint256 x, uint256 y)
```

Thrown when the resultant value in {mulDiv18} overflows uint256.



#### Parameters

| Name | Type | Description |
|---|---|---|
| x | uint256 | undefined |
| y | uint256 | undefined |

### PRBMath_MulDiv_Overflow

```solidity
error PRBMath_MulDiv_Overflow(uint256 x, uint256 y, uint256 denominator)
```

Thrown when the resultant value in {mulDiv} overflows uint256.



#### Parameters

| Name | Type | Description |
|---|---|---|
| x | uint256 | undefined |
| y | uint256 | undefined |
| denominator | uint256 | undefined |

### PRBMath_UD60x18_Convert_Overflow

```solidity
error PRBMath_UD60x18_Convert_Overflow(uint256 x)
```

Thrown when converting a basic integer to the fixed-point format overflows UD60x18.



#### Parameters

| Name | Type | Description |
|---|---|---|
| x | uint256 | undefined |

### PRBMath_UD60x18_Exp2_InputTooBig

```solidity
error PRBMath_UD60x18_Exp2_InputTooBig(UD60x18 x)
```

Thrown when taking the binary exponent of a base greater than 192e18.



#### Parameters

| Name | Type | Description |
|---|---|---|
| x | UD60x18 | undefined |

### PRBMath_UD60x18_Log_InputTooSmall

```solidity
error PRBMath_UD60x18_Log_InputTooSmall(UD60x18 x)
```

Thrown when taking the logarithm of a number less than 1.



#### Parameters

| Name | Type | Description |
|---|---|---|
| x | UD60x18 | undefined |


