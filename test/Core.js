const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

describe("Core", () => {
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

        // Set addresses of all contract into core
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
        it("Forbid operations when contract is paused", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);

            await core.connect(ownerAcc).addToBlacklist(clientAcc1.address);

            await core.connect(ownerAcc).pause();

            await expect(
                core.connect(ownerAcc).addToBlacklist(clientAcc1.address)
            ).to.be.revertedWith("Pausable: paused");

            await core.connect(ownerAcc).unpause();

            await core.connect(ownerAcc).addToBlacklist(clientAcc2.address);
        });
        it("Allow check blacklisted when contract is paused", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);

            await core.connect(ownerAcc).addToBlacklist(clientAcc1.address);

            await core.connect(ownerAcc).pause();

            expect(await core.connect(ownerAcc).checkBlacklisted(clientAcc1.address)).to.equal(
                true
            );
        });
    });

    describe("Getters", () => {
        it("Should check that user is in blacklist", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);

            await expect(await core.checkBlacklisted(clientAcc1.address)).to.equal(false);

            await core.connect(ownerAcc).addToBlacklist(clientAcc1.address);

            await expect(await core.checkBlacklisted(clientAcc1.address)).to.equal(true);
        });
    });

    describe("Setters", () => {
        it("Set a new Maze address", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);

            let startMazeAddress = await core.maze();

            await expect(core.setMaze(clientAcc1.address)).to.emit(core, "MazeChanged");

            let endMazeAddress = await core.maze();

            expect(startMazeAddress).not.to.equal(endMazeAddress);
            expect(endMazeAddress).to.equal(clientAcc1.address);
        });
        it("Set a new Vesting address", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);

            let startVestingAddress = await core.vesting();

            await expect(core.setVesting(clientAcc1.address)).to.emit(core, "VestingChanged");

            let endVestingAddress = await core.vesting();

            expect(startVestingAddress).not.to.equal(endVestingAddress);
            expect(endVestingAddress).to.equal(clientAcc1.address);
        });
        it("Set a new Farming address", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);

            let startFarmingAddress = await core.farming();

            await expect(core.setFarming(clientAcc1.address)).to.emit(core, "FarmingChanged");

            let endFarmingAddress = await core.farming();

            expect(startFarmingAddress).not.to.equal(endFarmingAddress);
            expect(endFarmingAddress).to.equal(clientAcc1.address);
        });

        describe("Fails", () => {
            it("Should fail to set zero address Maze", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                await expect(core.setMaze(zeroAddress)).to.be.revertedWith(
                    "Core: Maze cannot have zero address"
                );
            });
            it("Should fail to set zero address Vesting", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                await expect(core.setVesting(zeroAddress)).to.be.revertedWith(
                    "Core: Vesting cannot have zero address"
                );
            });
            it("Should fail to set zero address Farming", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                await expect(core.setFarming(zeroAddress)).to.be.revertedWith(
                    "Core: Farming cannot have zero address"
                );
            });
        });
    });

    describe("Main functions", () => {
        describe("Add to core", () => {
            it("Should add users to core", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                await expect(await core.checkBlacklisted(clientAcc1.address)).to.equal(false);

                await expect(core.connect(ownerAcc).addToBlacklist(clientAcc1.address)).to.emit(
                    core,
                    "AddToBlacklist"
                );

                await expect(await core.checkBlacklisted(clientAcc1.address)).to.equal(true);
            });
            describe("Fails", () => {
                it("Should fail to core already blacklisted account", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await core.connect(ownerAcc).addToBlacklist(clientAcc1.address);

                    await expect(
                        core.connect(ownerAcc).addToBlacklist(clientAcc1.address)
                    ).to.be.revertedWith("Core: Account already in blacklist");
                });
                it("Should fail if user blacklists himself", async () => {
                    let { core } = await loadFixture(deploys);

                    await expect(
                        core.connect(ownerAcc).addToBlacklist(ownerAcc.address)
                    ).to.be.revertedWith("Core: Cannot blacklist yourself");
                });
            });
        });

        describe("Remove from blacklist", () => {
            it("Should remove users from the blacklist", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                await expect(core.connect(ownerAcc).addToBlacklist(clientAcc1.address)).to.emit(
                    core,
                    "AddToBlacklist"
                );

                await expect(
                    core.connect(ownerAcc).removeFromBlacklist(clientAcc1.address)
                ).to.emit(core, "RemoveFromBlacklist");

                await expect(await core.checkBlacklisted(clientAcc1.address)).to.equal(false);
            });
            describe("Fails", () => {
                it("Should fail to remove not blacklisted account", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(
                        core.connect(ownerAcc).removeFromBlacklist(clientAcc1.address)
                    ).to.be.revertedWith("Core: Account not in blacklist");
                });
            });
        });
    });
});
