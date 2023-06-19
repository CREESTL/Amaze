# Farming



> The rewards farming contract





## Methods

### core

```solidity
function core() external view returns (contract ICore)
```

The address of the Core contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICore | undefined |

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


### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### unlockOnBehalf

```solidity
function unlockOnBehalf(address user, uint256 amount) external nonpayable
```

See {IFarming-unlockOnBehalf}



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |
| amount | uint256 | undefined |



## Events

### LockedOnBehalf

```solidity
event LockedOnBehalf(address user, uint256 amount)
```

Indicates that tokens have been locked by the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user  | address | undefined |
| amount  | uint256 | undefined |

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



