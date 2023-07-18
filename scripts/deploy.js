const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const delay = require("delay");
require("dotenv").config();

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

let contractName;
let amountToFarming = 44500000 * 1e18; //44.5 mil

async function main() {
    console.log(`[NOTICE!] Chain of deployment: ${network.name}`);

    // ====================================================

    // Contract #1: Core

    contractName = "Core";
    console.log(`[${contractName}]: Start of Deployment...`);
    let coreFactory = await ethers.getContractFactory(contractName);
    const core = await coreFactory.deploy();
    await core.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = core.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "ethereum_mainnet") {
        url = "https://etherscan.io/address/" + core.address + "#code";
    } else if (network.name === "ethereum_testnet") {
        url = "https://sepolia.etherscan.io/address/" + core.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: core.address,
            constructorArguments: [],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ====================================================

    // Contract #2: Maze

    contractName = "Maze";
    console.log(`[${contractName}]: Start of Deployment...`);
    let mazeFactory = await ethers.getContractFactory(contractName);
    const maze = await mazeFactory.deploy(core.address);
    await maze.deployed();

    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = maze.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "ethereum_mainnet") {
        url = "https://etherscan.io/address/" + maze.address + "#code";
    } else if (network.name === "ethereum_testnet") {
        url = "https://sepolia.etherscan.io/address/" + maze.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: maze.address,
            constructorArguments: [core.address],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ====================================================

    // Contract #3: Farming

    contractName = "Farming";
    console.log(`[${contractName}]: Start of Deployment...`);
    let farmingFactory = await ethers.getContractFactory(contractName);
    const farming = await farmingFactory.deploy(core.address);
    await farming.deployed();

    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = farming.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "ethereum_mainnet") {
        url = "https://etherscan.io/address/" + farming.address + "#code";
    } else if (network.name === "ethereum_testnet") {
        url = "https://sepolia.etherscan.io/address/" + farming.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: farming.address,
            constructorArguments: [core.address],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ====================================================

    // Contract #4: Vesting

    contractName = "Vesting";
    console.log(`[${contractName}]: Start of Deployment...`);
    let vestingFactory = await ethers.getContractFactory(contractName);
    const vesting = await vestingFactory.deploy(core.address);
    await vesting.deployed();

    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = vesting.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "ethereum_mainnet") {
        url = "https://etherscan.io/address/" + vesting.address + "#code";
    } else if (network.name === "ethereum_testnet") {
        url = "https://sepolia.etherscan.io/address/" + vesting.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: vesting.address,
            constructorArguments: [core.address],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ==========NOTICE=============

    // Exlude contracts from stakers
    await maze.excludeFromStakers(farming.address);
    await maze.excludeFromStakers(vesting.address);

    // Contracts do not pay fees
    await maze.addToWhitelist(farming.address);
    await maze.addToWhitelist(vesting.address);

    // Core contract is not added anywhere because it
    // cannot process tokens

    // Set addresses of all contract into core
    await core.setMaze(maze.address);
    await core.setFarming(farming.address);
    await core.setVesting(vesting.address);

    // Transfer 45M tokens to the farming
    await maze.transfer(farming.address, amountToFarming);
    await farming.notifyRewardAmount(amountToFarming);

    // ============================

    // ====================================================

    fs.writeFileSync(path.resolve(__dirname, fileName), JSON.stringify(OUTPUT_DEPLOY, null, "  "));

    console.log(
        `\n***Deployment and verification are completed!***\n***See Results in "${
            __dirname + fileName
        }" file***`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
