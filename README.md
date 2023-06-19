# Amaze Project Smart Contracts

#### Table of Contents

[Prereqiusites](#preqs)  
[Build](#build)  
[Test](#tests)  
[Run Scripts](#run)  
[Deploy](#deploy)  
[Networks](#networks)  
[Wallets](#wallets)  
[Structure of Deploy Output File](#output)  
[Logic](#logic)  
[[Known Issues]](#issues)

<a name="preqs">

## Prerequisites

- Install [Git](https://git-scm.com/)
- Install [Node.js](https://nodejs.org/en/download/)
- Clone this repository
- Navigate to the directory with the cloned code
- Install Hardhat with `npm install --save-dev hardhat`
- Install all required dependencies with `npm install`
- Create a file called `.env` in the root of the project with the same contents as `.env.example`
- Place your secret API keys, private keys, etc. to the `.env` file

  :warning:**DO NOT SHARE YOUR .env FILE IN ANY WAY OR YOU RISK TO LOSE ALL YOUR FUNDS**:warning:

<a name="build"/>

## Build

```
npx hardhat compile
```

<a name="tests"/>

## Test

```
npx hardhat test --network hardhat
```

<a name="run"/>

## Run Scripts

```
npx hardhat run <script file name here> --network <network name here>
```

<a name="deploy"/>

## Deploy

```
npx hardhat run scripts/deploy.js --network <network name here>
```

Deployment script takes about 5 minutes to complete. Please, be patient!  
After the contracts get deployed you can find their _addresses_ and code verification _URLs_ in the `scripts/deployOutput.json` file (see [Structure of Deploy Output File](#output)).  
Note that this file only refreshes the addresses of contracts that have been successfully deployed (or redeployed). If you deploy only a single contract then its address would get updated and all other addresses would remain untouched and would link to _old_ contracts.  
Please, **do not** write anything to `deployOutput.json` file yourself! It is a read-only file.  
All deployed contracts _are verified_ on Etherscan.

<a name="networks"/>

## Networks

а) **Test** network  
Make sure you have _enough test tokens_ for testnet.

```
npx hardhat run <script name here> --network ethereum_testnet
```

b) **Main** network  
Make sure you have _enough real tokens_ in your wallet. Deployment to the mainnet costs money!

```
npx hardhat run <script name here> --network ethereum_mainnet
```

c) **Local** network

- Run Hardhat node locally:

```
npx hardhat node
```

- Run sripts on the node

```
npx hardhat run <script name here> --network localhost
```

<a name="wallets"/>

## Wallets

For deployment you will need to use either _your existing wallet_ or _a generated one_.

### Using an Existing Wallet

If you choose to use your existing wallet, then you will need to be able to export (copy/paste) its private key. For example, you can export private key from your MetaMask wallet.  
Wallet's address and private key should be pasted into the `.env` file (see [Prerequisites](#preqs)).

### Creating a New Wallet

If you choose to create a fresh wallet for this project, you should use `createWallet` script from `scripts/` directory.

```
node scripts/createWallet.js
```

This will generate a single new wallet and show its address and private key. **Save** them somewhere else!
A new wallet _does not_ hold any tokens. You have to provide it with tokens of your choice.  
Wallet's address and private key should be pasted into the `.env` file (see [Prerequisites](#preqs)).

<a name="output"/>

## Structure of Deploy Output File

This file contains the result of contracts deployment.

It is separated in 2 parts. Each of them represents deployment to testnet or mainnet.  
Each part contains information about all deployed contracts:

- The address of the contract (`address`)
- The URL for Etherscan page with verified code of the contract (`verification`)

<a name="logic"/>

## Logic

### Terms

Admin: Owner (deployer) of all contracts  
RFI: Reflection mechanism for token distribution. See [official docs](https://reflect-contract-doc.netlify.app/) for more.

### Logic Flow

#### Blacklist

This contract is meant to restrict specific addressed from using other contracts` functions.  
Admin can:

- Add users to the blacklist
- Remove users from the blacklist

#### Maze

_RFI_  
This is an ERC20 token with RFI logic. On each transaction 2% of transfer amount is taken as fees. These fees are distributed among all Maze token holders.

_Mint_  
It _does not_ have a `mint` function due to restrictions of RFI logic. But it _does_ have a `burn` function.  
The total supply of 100 000 000 Maze tokens is minted to the Admin address at deployment. Admin is free to handle these tokens however he wishes. No tokens are assinged to `Vesting`(TBD) or `Farming`(TBD) contracts by default.

#### Vesting

The main purpose of this contract is to unlock Maze tokens for users with specific frequency.

**Admin side:**  
The Admin creates a vesting for a user. He spicifies the following parameters of the vesting:

- `reciever`: The user to get vested tokens
- `amount`: The amount of vested tokens
- `cliffDuration`: Duration of cliff period in seconds. During cliff period no claiming of tokens is allowed.
- `cliffUnlock`: The percentage (in Basis Points) of `amount` that will be unlocked right after cliff
- `claimablePeriods`: The number of periods after cliff. At the end of each period unlocked amount for the `reciever` is increased.
  - Each period is exactly **30 days**

After vesting is created, all vested tokens are transferred from Admin to the Vesting contract (and Farming afterwards, TBD).  
The `amount` is evenly distributed between periods.

**User side:**  
If Admin creates a vesting and assigns it to the user, the user becomes a reciever of vested tokens. He can claim tokens either during vesting periods or after all of them (in the second case he will recieve all vested tokens at once). Claiming before the end of the first period will only get him the amount of tokens unlocked on cliff.  
Unlocked (claimable) amount is increased only at the end of each period. For example, if Alice claimed 500 Maze tokens after 6-th month and is supposed to claim 500 more after 7-th month, but she would try to claim them any time _during the 7-th month_, she will recieve no tokens.  
Each user might have multiple vestings assigned to him. When claiming, he will recieve vested tokens from _all_ of these vestings at once.  
Waiting for a longer period than the number of `claimablePeriods` will not increase user's vested amount. For example, if there are only 5 periods (5 months) and the user waits for a year and claims tokens afterwards, he will only recieve the amount for 5 months.

#### All Contracts

All contracts are [Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable) and [Ownable](https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable).

---

<a name="issues"/>

**[Known Issues]**
