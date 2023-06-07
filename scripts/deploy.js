const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const delay = require("delay");
require("dotenv").config();

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

let contractName;

async function main() {
  console.log(`[NOTICE!] Chain of deployment: ${network.name}`);

  // ====================================================

  // Contract #1: Blacklist

  contractName = "Blacklist";
  console.log(`[${contractName}]: Start of Deployment...`);
  let blacklistFactory = await ethers.getContractFactory(contractName);
  const blacklist = await blacklistFactory.deploy();
  await blacklist.deployed();
  console.log(`[${contractName}]: Deployment Finished!`);
  OUTPUT_DEPLOY[network.name][contractName].address = blacklist.address;

  // Verify
  console.log(`[${contractName}]: Start of Verification...`);

  await delay(90000);

  if (network.name === "ethereum_mainnet") {
    url = "https://etherscan.io/address/" + blacklist.address + "#code";
  } else if (network.name === "ethereum_testnet") {
    url = "https://sepolia.etherscan.io/address/" + blacklist.address + "#code";
  }

  OUTPUT_DEPLOY[network.name][contractName].verification = url;

  try {
    await hre.run("verify:verify", {
      address: blacklist.address,
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
  const maze = await mazeFactory.deploy(blacklist.address);
  await maze.deployed();

  // TODO add Vesting, Farming, etc. in excluded here to follow RFI logic

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
      constructorArguments: [blacklist.address],
    });
  } catch (error) {
    console.error(error);
  }
  console.log(`[${contractName}]: Verification Finished!`);

  // ====================================================

  fs.writeFileSync(
    path.resolve(__dirname, fileName),
    JSON.stringify(OUTPUT_DEPLOY, null, "  ")
  );

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
