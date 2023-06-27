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
        describe("Pause", () => {
            it("Should forbid operations if contract is paused", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, lockAmount);

                await farming.pause();

                await expect(
                    farming.connect(ownerAcc).setMinLockPeriod(555)
                ).to.be.revertedWith("Pausable: paused");
                
                await farming.unpause();

                await expect(
                    farming.connect(ownerAcc).setMinLockPeriod(555)
                ).not.to.be.reverted;
            })
        })
    });

    describe("Deployment", () => {
        it("Should deploy and have correct parameters after", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);
            expect(await farming.core()).to.equal(core.address);
            expect(await farming.minLockPeriod()).to.equal(3600 * 24 * 30);
            expect(await farming.minClaimGap()).to.equal(3600 * 24 * 365);
            expect(await farming.dailyRate()).to.equal(300);
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

    describe("Getters", () => {
        describe("Get farming", () => {
            it("Should get correct info about user's farming", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                // Before any farming was started for the user
                let [
                    lockedAmount1,
                    startTime1,
                    endTime1,
                    reward1
                ] = await farming.getFarming(clientAcc1.address);
                
                expect(lockedAmount1).to.equal(0);
                expect(startTime1).to.equal(0);
                expect(endTime1).to.equal(0);
                expect(reward1).to.equal(0);
                

                // Lock and start farming
                await farming.connect(clientAcc1).lock(lockAmount);

                // Get info about the only one farming
                let [
                    lockedAmount2,
                    startTime2,
                    endTime2,
                    reward2
                ] = await farming.getFarming(clientAcc1.address);


                let expectedStartTime = 0
                expect(lockedAmount2).to.equal(lockAmount);
                // TODO change expected time
                // expect(startTime2).to.equal(expectedStartTime);
                // Farming not claimed and not ended yet
                expect(endTime2).to.equal(0); 
                // No rewards are assinged to user yet
                expect(reward2).to.equal(0);
                
            })
            
            describe("Fails", () => {
                it("Should fail to get farming of zero address user", async() => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );
                
                    await expect(farming.getFarming(zeroAddress))
                        .to.be.revertedWith("Farming: User cannot have zero address");
                })
            })
        })
        describe("Get reward", () => {
            it("Should get correct reward of the user", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let reward1 = await farming.getReward(clientAcc1.address);

                // Before start of farming reward must be zero
                expect(reward1).to.equal(0);

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                // Lock and start farming
                await farming.connect(clientAcc1).lock(lockAmount);

                let reward2 = await farming.getReward(clientAcc1.address);

                // Right after farming start reward must be zero
                expect(reward2).to.equal(0);

                // TODO add here part when reward changes (after all tests for _recalculateRewards)

            })
            describe("Fails", () => {
                it("Should fail to get the reward of the zero address user", async () => {

                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    await expect(farming.getReward(zeroAddress))
                        .to.be.revertedWith("Farming: User cannot have zero address");

                })
            })
        })
    });
    
    describe("Setters", () => {
        
        describe("Set minimum lock period", () => {
            
            it("Should set new minimum lock period", async () => {

                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let oldPeriod = await farming.minLockPeriod();
                
                let period = 3600 * 24 * 365;
                await expect(farming.connect(ownerAcc).setMinLockPeriod(period))
                    .to.emit(farming, "MinLockPeriodChanged");

                let newPeriod = await farming.minLockPeriod();
                
                expect(newPeriod).to.not.equal(oldPeriod);
                expect(newPeriod).to.equal(period);
                
            })
            
        })

        describe("Set daily rate", () => {
            
            it("Should set new daily rate", async () => {

                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let oldRate = await farming.dailyRate();
                
                let rate = 7500;
                await expect(farming.connect(ownerAcc).setDailyRate(rate))
                .to.emit(farming, "DailyRateChanged");

                let newRate = await farming.dailyRate();
                
                expect(newRate).to.not.equal(oldRate);
                expect(newRate).to.equal(rate);
                
            })
            
        })

    })

    describe("Main functions", () => {});
});
