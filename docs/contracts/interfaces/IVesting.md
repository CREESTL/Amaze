# IVesting





Interface of the Vesting contract



## Methods

### claimTokens

```solidity
function claimTokens() external nonpayable
```

Allows a user to claim tokens that were vested by admin for him




### getUserVestings

```solidity
function getUserVestings(address user) external view returns (uint256[])
```

Returns list of IDs of vestings assigned to the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The address of the user |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256[] | The list of IDs of vestings assigned to the user |

### getVesting

```solidity
function getVesting(uint256 id) external view returns (struct IVesting.TokenVesting)
```

Returns information about the vesting by its ID



#### Parameters

| Name | Type | Description |
|---|---|---|
| id | uint256 | The ID of the vesting to get information about |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IVesting.TokenVesting | The complete information about specific vesting |

### pause

```solidity
function pause() external nonpayable
```

Pause the contract




### startVesting

```solidity
function startVesting(address to, uint256 amount, uint256 cliffDuration, uint256 cliffUnlock, uint256 claimablePeriods) external nonpayable
```

Starts vesting for a specific user



#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | The recipient of tokens after cliff |
| amount | uint256 | The total amount of tokens to be vested |
| cliffDuration | uint256 | The duration of cliff period        During that period tokens are locked and cannot be claimed |
| cliffUnlock | uint256 | Percentage of tokens unlocked right after the cliff |
| claimablePeriods | uint256 | The number of periods after cliff in which user can claim tokens |

### unpause

```solidity
function unpause() external nonpayable
```

Unpause the contract






## Events

### TokensClaimed

```solidity
event TokensClaimed(address to, uint256 amount)
```

Indicates that user has claimed vested tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| to  | address | The reciever of vested tokens |
| amount  | uint256 | The amount of tokens claimed |

### VestingStarted

```solidity
event VestingStarted(address to, uint256 amount, uint256 cliffDuration, uint256 cliffUnlock, uint256 claimablePeriods)
```

Indicates that a new vesting has



#### Parameters

| Name | Type | Description |
|---|---|---|
| to  | address | The recipient of tokens after cliff |
| amount  | uint256 | The total amount of tokens to be vested |
| cliffDuration  | uint256 | The duration of cliff period |
| cliffUnlock  | uint256 | Percentage of tokens unlocked right after the cliff |
| claimablePeriods  | uint256 | The number of periods after cliff in which user can claim tokens |



