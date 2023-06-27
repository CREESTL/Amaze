const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {
    loadFixture,
    time,
} = require("@nomicfoundation/hardhat-network-helpers");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

describe("Farming contract", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        // Deploy core
        let coreFactory = await ethers.getContractFactory("Core");
        let core = await coreFactory.deploy();
        await core.deployed();

        // Deploy token
        let mazeFactory = await ethers.getContractFactory("Maze");
        let maze = await mazeFactory.deploy(core.address);
        await maze.deployed();

        // Deploy farming
        let farmingFactory = await ethers.getContractFactory("Farming");
        let farming = await farmingFactory.deploy(core.address);
        await farming.deployed();

        // Deploy vesting
        let vestingFactory = await ethers.getContractFactory("Vesting");
        let vesting = await vestingFactory.deploy(core.address);
        await vesting.deployed();

        // Exlude contracts from stakers
        await maze.excludeFromStakers(farming.address);
        await maze.excludeFromStakers(vesting.address);
        // Contracts do not pay fees
        await maze.addToWhitelist(farming.address);
        await maze.addToWhitelist(vesting.address);

        // Set addresses of all contracts into core
        await core.setMaze(maze.address);
        await core.setFarming(farming.address);
        await core.setVesting(vesting.address);

        return {
            core,
            maze,
            farming,
            vesting,
        };
    }

    describe("Modifiers", () => {
        describe("Blacklisted", () => {
            it("Should forbid operations if user is blacklisted", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                // Transfer some tokens to the client to lock
                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, lockAmount);

                await core.connect(ownerAcc).addToBlacklist(clientAcc1.address);
                await expect(
                    farming.connect(clientAcc1).lock(lockAmount)
                ).to.be.revertedWith("Farming: Account is blacklisted");
            });
        });
    });

    describe("Deployment", () => {
        it("Should deploy and have correct parameters after", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);
            expect(await farming.core()).to.equal(core.address);
        });
        describe("Fails", () => {
            it("Should fail to deploy with invalid parameters", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let farmingFactory = await ethers.getContractFactory("Farming");

                await expect(
                    farmingFactory.deploy(zeroAddress)
                ).to.be.revertedWith(
                    "Farming: Core cannot have zero address"
                );
            });
        });
    });

    describe("Getters", () => {});

    describe("Main functions", () => {});
});
