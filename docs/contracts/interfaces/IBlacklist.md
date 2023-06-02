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

### unpause

```solidity
function unpause() external nonpayable
```

Unpause the contract






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

### RemoveFromBlacklist

```solidity
event RemoveFromBlacklist(address account)
```

Indicates that account has been removed from the blacklist



#### Parameters

| Name | Type | Description |
|---|---|---|
| account  | address | The account removed from the blacklist |



