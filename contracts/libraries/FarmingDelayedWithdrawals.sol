// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/libraries/IFarmingDelayedWithdrawals.sol";

abstract contract FarmingDelayedWithdrawals is IFarmingDelayedWithdrawals {
    using SafeERC20 for ERC20;

    /// @notice Mapping: user => struct storing all delayedWithdrawal info
    mapping(address => StakerDelayedWithdrawals) internal _stakerWithdrawals;
    /// @notice Delay for completing any unlockDdelayedWithdrawal
    uint256 public unlockWithdrawalDelay = 1 days * 21;
    uint256 public claimWithdrawalDelay = 1 days * 365;

    /// @notice See {IFarmingDelayedWithdrawals-getStakerUnlockDelayedWithdrawalByIndex}
    function getStakerUnlockDelayedWithdrawalByIndex(
        address staker,
        uint256 index
    ) external view returns (
        DelayedWithdrawal memory
    ) {
        return _stakerWithdrawals[staker].unlockDelayedWithdrawals[index];
    }

    /// @notice See {IFarmingDelayedWithdrawals-getStakerUnlockWithdrawalsLength}
    function getStakerUnlockWithdrawalsLength(address staker) external view returns (uint256) {
        return _stakerWithdrawals[staker].unlockDelayedWithdrawals.length;
    }

    /// @notice See {IFarmingDelayedWithdrawals-getStakerClaimDelayedWithdrawalByIndex}
    function getStakerClaimDelayedWithdrawalByIndex(
        address staker,
        uint256 index
    ) external view returns (
        DelayedWithdrawal memory
    ) {
        return _stakerWithdrawals[staker].claimDelayedWithdrawals[index];
    }

    /// @notice See {IFarmingDelayedWithdrawals-getStakerClaimWithdrawalsLength}
    function getStakerClaimWithdrawalsLength(address staker) external view returns (uint256) {
        return _stakerWithdrawals[staker].claimDelayedWithdrawals.length;
    }

    function getUserUnlockDelayedWithdrawals(address staker) external view returns (DelayedWithdrawal[] memory) {
        return _getUserDelayedWithdrawals(
            _stakerWithdrawals[staker].unlockDelayedWithdrawals,
            _stakerWithdrawals[staker].unlockDelayedWithdrawalsCompleted
        );
    }

    function getUserClaimDelayedWithdrawals(address staker) external view returns (DelayedWithdrawal[] memory) {
        return _getUserDelayedWithdrawals(
            _stakerWithdrawals[staker].claimDelayedWithdrawals,
            _stakerWithdrawals[staker].claimDelayedWithdrawalsCompleted
        );
    }

    function _createUnlockDelayedWithdraw(address staker, uint256 amount) internal {
        DelayedWithdrawal memory delayedWithdrawal = DelayedWithdrawal({
            amount: amount,
            timeCreated: block.timestamp
        });
        _stakerWithdrawals[staker].unlockDelayedWithdrawals.push(delayedWithdrawal);
    }

    function _createClaimDelayedWithdraw(address staker, uint256 amount) internal {
        DelayedWithdrawal memory delayedWithdrawal = DelayedWithdrawal({
            amount: amount,
            timeCreated: block.timestamp
        });
        _stakerWithdrawals[staker].claimDelayedWithdrawals.push(delayedWithdrawal);
    }

    function _withdrawDelayedUnlock(
        uint256 maxNumberOfDelayedWithdrawalsToClaim,
        address token,
        address staker
        ) internal {
        DelayedWithdrawal[] memory delayedWithdrawals = _stakerWithdrawals[msg.sender].unlockDelayedWithdrawals;
        
        (
            uint256 amountToSend,
            uint256 newDelayedWithdrawalsCompletedBefore
        ) = _calcDelayedWithdrawals(
            delayedWithdrawals,
            maxNumberOfDelayedWithdrawalsToClaim,
            _stakerWithdrawals[msg.sender].unlockDelayedWithdrawalsCompleted,
            unlockWithdrawalDelay
        );

        if (amountToSend != 0) {
            _stakerWithdrawals[msg.sender].unlockDelayedWithdrawalsCompleted += newDelayedWithdrawalsCompletedBefore;
            ERC20(token).safeTransfer(staker, amountToSend);
        }

        emit DelayedUnlockWithdrawed(msg.sender, amountToSend);
    }

    function _withdrawDelayedClaim(
        uint256 maxNumberOfDelayedWithdrawalsToClaim,
        address token,
        address staker
    ) internal {
        DelayedWithdrawal[] memory delayedWithdrawals = _stakerWithdrawals[msg.sender].claimDelayedWithdrawals;
        
        (
            uint256 amountToSend,
            uint256 newDelayedWithdrawalsCompletedBefore
        ) = _calcDelayedWithdrawals(
            delayedWithdrawals,
            maxNumberOfDelayedWithdrawalsToClaim,
            _stakerWithdrawals[msg.sender].claimDelayedWithdrawalsCompleted,
            claimWithdrawalDelay
        );

        if (amountToSend != 0) {
            _stakerWithdrawals[msg.sender].claimDelayedWithdrawalsCompleted += newDelayedWithdrawalsCompletedBefore;
            ERC20(token).safeTransfer(staker, amountToSend);
        }

        emit DelayedClaimWithdrawed(msg.sender, amountToSend);
    }

    function _calcDelayedWithdrawals(
        DelayedWithdrawal[] memory delayedWithdrawals,
        uint256 maxNumberOfDelayedWithdrawalsToClaim,
        uint256 delayedWithdrawalsCompletedBefore,
        uint256 withdrawalDelay
    ) internal view returns (uint256, uint256) {
        uint256 amountToSend = 0;
        uint256 _stakerWithdrawalsLength = delayedWithdrawals.length;
        uint256 i = 0;
        while (i < maxNumberOfDelayedWithdrawalsToClaim && (delayedWithdrawalsCompletedBefore + i) < _stakerWithdrawalsLength) {
            // copy delayedWithdrawal from storage to memory
            DelayedWithdrawal memory delayedWithdrawal = delayedWithdrawals[delayedWithdrawalsCompletedBefore + i];
            // check if delayedWithdrawal can be claimed. break the loop as soon as a delayedWithdrawal cannot be claimed
            if (block.timestamp < delayedWithdrawal.timeCreated + withdrawalDelay) {
                break;
            }
            // otherwise, the delayedWithdrawal can be claimed, in which case we increase the amountToSend and increment i
            amountToSend += delayedWithdrawal.amount;
            // increment i to account for the delayedWithdrawal being claimed
            unchecked {
                ++i;
            }
        }

        return (amountToSend, i);
    }

    function _getUserDelayedWithdrawals(
        DelayedWithdrawal[] memory delayedWithdrawals,
        uint256 delayedWithdrawalsCompleted
    ) internal pure returns (DelayedWithdrawal[] memory) {
        uint256 totalDelayedWithdrawals = delayedWithdrawals.length;
        uint256 userDelayedWithdrawalsLength = totalDelayedWithdrawals - delayedWithdrawalsCompleted;
        DelayedWithdrawal[] memory userDelayedWithdrawals = new DelayedWithdrawal[](userDelayedWithdrawalsLength);
        for (uint256 i = 0; i < userDelayedWithdrawalsLength; i++) {
            userDelayedWithdrawals[i] = delayedWithdrawals[delayedWithdrawalsCompleted + i];
        }
        return userDelayedWithdrawals;
    }

    function _getClaimableUserDelayedWithdrawals(
        DelayedWithdrawal[] memory delayedWithdrawals,
        uint256 delayedWithdrawalsCompleted,
        uint256 withdrawalDelay
    ) internal view returns (DelayedWithdrawal[] memory) {
        uint256 totalDelayedWithdrawals = delayedWithdrawals.length;
        uint256 userDelayedWithdrawalsLength = totalDelayedWithdrawals - delayedWithdrawalsCompleted;

        uint256 firstNonClaimableWithdrawalIndex = userDelayedWithdrawalsLength;

        for (uint256 i = 0; i < userDelayedWithdrawalsLength; i++) {
            DelayedWithdrawal memory delayedWithdrawal = delayedWithdrawals[delayedWithdrawalsCompleted + i];
            // check if delayedWithdrawal can be claimed. break the loop as soon as a delayedWithdrawal cannot be claimed
            if (block.timestamp < delayedWithdrawal.timeCreated + withdrawalDelay) {
                firstNonClaimableWithdrawalIndex = i;
                break;
            }
        }
        uint256 numberOfClaimableWithdrawals = firstNonClaimableWithdrawalIndex;
        DelayedWithdrawal[] memory claimableDelayedWithdrawals = new DelayedWithdrawal[](numberOfClaimableWithdrawals);
        
        if(numberOfClaimableWithdrawals != 0) {
            for (uint256 i = 0; i < numberOfClaimableWithdrawals; i++) {
                claimableDelayedWithdrawals[i] = delayedWithdrawals[delayedWithdrawalsCompleted + i];
            }
        }
        return claimableDelayedWithdrawals;
    }
}