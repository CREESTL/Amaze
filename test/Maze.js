const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

describe("Maze token", () => {

    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        // Deploy blacklist
        let blacklistFactory = await ethers.getContractFactory("Blacklist");
        let blacklist = await blacklistFactory.deploy();
        await blacklist.deployed();

        // Deploy token
        // TODO add Vesting, Farming, etc. in excluded here
        let mazeFactory = await ethers.getContractFactory("Maze");
        let maze = await mazeFactory.deploy(blacklist.address);
        await maze.deployed();

        return {
            blacklist,
            maze
        };
    }

    describe("Deployment", () => {
        it("Should have a correct name", async () => {
            let { maze, blacklist } = await loadFixture(
                deploys
            );
            expect(await maze.name()).to.equal("Maze");
        });

        it("Should have a correct symbol", async () => {
            let { maze, blacklist } = await loadFixture(
                deploys
            );
            expect(await maze.symbol()).to.equal("MAZE");
        });

        it("Should have correct decimals", async () => {
            let { maze, blacklist } = await loadFixture(
                deploys
            );
            expect(await maze.decimals()).to.equal(18);
        });

        it("Should have correct current supply", async () => {
            let { maze, blacklist } = await loadFixture(
                deploys
            );
            expect(await maze.totalSupply()).to.equal(parseEther("100000000"));
        });

        it("Should have correct fee percentage", async () => {
            let { maze, blacklist } = await loadFixture(
                deploys
            );
            expect(await maze.feeInBP()).to.equal(200);
        });

        it("Should have correct blacklist address", async () => {
            let { maze, blacklist } = await loadFixture(
                deploys
            );
            expect(await maze.blacklist()).to.equal(blacklist.address);
        });

    });

    describe("Transfer", () => {
        describe("Included accounts", () => {
            it("Should transfer some tokens from one address to the other", async () => {
            });

            it("Should not increase the number of holders when transfering to the same account", async () => {
            });

            it("Should delete account from holders if all of its tokens get transferred", async () => {
            });

            it("Should keep address a holder if he transferes tokens and gets them back", async () => {
            });

            it("Should not allow a user to transfer tokens to himself", async () => {
            });

            it("Should fail to transfer tokens if receiver has zero address", async () => {
            });

            it("Should fail to transfer tokens if sender has no tokens", async () => {
            });
        });
        describe("Excluded accounts", () => {
            it("Should transfer some tokens from one address to the other", async () => {
            });

            it("Should not increase the number of holders when transfering to the same account", async () => {
            });

            it("Should delete account from holders if all of its tokens get transferred", async () => {
            });

            it("Should keep address a holder if he transferes tokens and gets them back", async () => {
            });

            it("Should not allow a user to transfer tokens to himself", async () => {
            });

            it("Should fail to transfer tokens if receiver has zero address", async () => {
            });

            it("Should fail to transfer tokens if sender has no tokens", async () => {
            });
        });
    });
});
