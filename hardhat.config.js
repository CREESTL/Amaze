require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-tracer");
require("hardhat-contract-sizer");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("@primitivefi/hardhat-dodoc");

const { ETHERSCAN_API_KEY, INFURA_API_KEY, ACC_PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    ethereum_mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [ACC_PRIVATE_KEY],
    },
    ethereum_testnet: {
      url: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [ACC_PRIVATE_KEY],
    },
  },
  mocha: {
    timeout: 20000000000,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  skipFiles: ["node_modules"],
  gasReporter: {
    enabled: true,
    url: "http://localhost:8545",
  },
  dodoc: {
    exclude: ["mocks", "lin", "errors"],
    runOnCompile: false,
    freshOutput: true,
    outputDir: "./docs/contracts",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: true,
    strict: true,
    runOnCompile: false,
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      goerli: ETHERSCAN_API_KEY,
    },
  },
};
