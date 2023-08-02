const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

describe("Vesting contract", () => {
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
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                await core.connect(ownerAcc).addToBlacklist(clientAcc1.address);

                await expect(vesting.connect(clientAcc1).claimTokens()).to.be.revertedWith(
                    "Maze: Account is blacklisted"
                );
                vesting.deployed();
            });
        });
    });

    describe("Deployment", () => {
        it("Should deploy and have correct parameters after", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);
            expect(await vesting.core()).to.equal(core.address);
        });
        describe("Fails", () => {
            it("Should fail to deploy with invalid parameters", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let vestingFactory = await ethers.getContractFactory("Vesting");

                await expect(vestingFactory.deploy(zeroAddress)).to.be.revertedWith(
                    "Vesting: Blacklist cannot have zero address"
                );
            });
        });
    });

    describe("Getters", () => {
        describe("Get list of vestings", () => {
            it("Should get the list of vestings assigned to the user", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let startVestings = await vesting.getUserVestings(clientAcc1.address);
                expect(startVestings.length).to.equal(0);

                let to = clientAcc1.address;
                let amount = parseEther("1");
                let cliffDuration = 3600;
                let cliffUnlock = 1000;
                let claimablePeriods = 5;

                await maze.connect(ownerAcc).approve(farming.address, amount);

                await vesting.startVesting(
                    to,
                    amount,
                    cliffDuration,
                    cliffUnlock,
                    claimablePeriods
                );

                let endVestings = await vesting.getUserVestings(clientAcc1.address);

                expect(endVestings.length).to.equal(1);

                expect(endVestings[0]).to.equal(1);
            });

            describe("Fails", () => {
                it("Should fail to get vestings of zero address user", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(vesting.getUserVestings(zeroAddress)).to.be.revertedWith(
                        "Vesting: User cannot have zero address"
                    );
                });
            });
        });

        describe("Get one vesting", () => {
            it("Should get one vesting assigned to the user", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let to = clientAcc1.address;
                let amount = parseEther("1");
                let cliffDuration = 3600;
                let cliffUnlock = 1000;
                let claimablePeriods = 5;

                await maze.connect(ownerAcc).approve(farming.address, amount);

                await vesting.startVesting(
                    to,
                    amount,
                    cliffDuration,
                    cliffUnlock,
                    claimablePeriods
                );

                let [
                    _id,
                    _status,
                    _to,
                    _amount,
                    _amountClaimed,
                    _startTime,
                    _cliffDuration,
                    _cliffUnlock,
                    _cliffClaimed,
                    _claimablePeriods,
                    _lastClaimedPeriod,
                ] = await vesting.getVesting(1);

                expect(_status).to.equal(0);
                expect(_to).to.equal(to);
                expect(_amount).to.equal(amount);
                expect(_amountClaimed).to.equal(0);
                // Do not startTime here because we don't know it
                expect(_cliffDuration).to.equal(cliffDuration);
                expect(_cliffUnlock).to.equal(cliffUnlock);
                expect(_cliffClaimed).to.equal(false);
                expect(_claimablePeriods).to.equal(claimablePeriods);
                expect(_lastClaimedPeriod).to.equal(0);
            });
            describe("Fails", () => {
                it("Should fail to get the unexisting vesting", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(vesting.getVesting(777)).to.be.revertedWith(
                        "Vesting: Vesting does not exist"
                    );
                });
            });
        });
    });

    describe("Main functions", () => {
        describe("Start vesting", () => {
            it("Should start one vesting for a user", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let to = clientAcc1.address;
                let amount = parseEther("1");
                let cliffDuration = 3600;
                let cliffUnlock = 1000;
                let claimablePeriods = 5;

                await maze.connect(ownerAcc).approve(farming.address, amount);

                let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await expect(
                    vesting.startVesting(to, amount, cliffDuration, cliffUnlock, claimablePeriods)
                ).to.emit(vesting, "VestingStarted");

                let [
                    _id,
                    _status,
                    _to,
                    _amount,
                    _amountClaimed,
                    _startTime,
                    _cliffDuration,
                    _cliffUnlock,
                    _cliffClaimed,
                    _claimablePeriods,
                    _lastClaimedPeriod,
                ] = await vesting.getVesting(1);

                expect(_status).to.equal(0);
                expect(_to).to.equal(to);
                expect(_amount).to.equal(amount);
                expect(_amountClaimed).to.equal(0);
                expect(_cliffDuration).to.equal(cliffDuration);
                expect(_cliffUnlock).to.equal(cliffUnlock);
                expect(_cliffClaimed).to.equal(false);
                expect(_claimablePeriods).to.equal(claimablePeriods);
                expect(_lastClaimedPeriod).to.equal(0);

                let vestings = await vesting.getUserVestings(clientAcc1.address);

                expect(vestings.length).to.equal(1);
                expect(vestings[0]).to.equal(1);

                let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                expect(ownerEndBalance).to.equal(ownerStartBalance.sub(amount));

                expect(farmingEndBalance).to.equal(farmingStartBalance.add(amount));
            });

            it("Should start multiple vestings for a user", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Vesting 1
                let to1 = clientAcc1.address;
                let amount1 = parseEther("1");
                let cliffDuration1 = 3600;
                let cliffUnlock1 = 1000;
                let claimablePeriods1 = 5;

                await maze.connect(ownerAcc).approve(farming.address, amount1);

                await vesting.startVesting(
                    to1,
                    amount1,
                    cliffDuration1,
                    cliffUnlock1,
                    claimablePeriods1
                );

                let [
                    _id1,
                    _status1,
                    _to1,
                    _amount1,
                    _amountClaimed1,
                    _startTime1,
                    _cliffDuration1,
                    _cliffUnlock1,
                    _cliffClaimed1,
                    _claimablePeriods1,
                    _lastClaimedPeriod1,
                ] = await vesting.getVesting(1);

                expect(_status1).to.equal(0);
                expect(_to1).to.equal(to1);
                expect(_amount1).to.equal(amount1);
                expect(_amountClaimed1).to.equal(0);
                expect(_cliffDuration1).to.equal(cliffDuration1);
                expect(_cliffUnlock1).to.equal(cliffUnlock1);
                expect(_cliffClaimed1).to.equal(false);
                expect(_claimablePeriods1).to.equal(claimablePeriods1);
                expect(_lastClaimedPeriod1).to.equal(0);

                // Vesting 2
                let to2 = clientAcc1.address;
                let amount2 = parseEther("2");
                let cliffDuration2 = 1400;
                let cliffUnlock2 = 8000;
                let claimablePeriods2 = 7;

                await maze.connect(ownerAcc).approve(farming.address, amount2);

                await vesting.startVesting(
                    to2,
                    amount2,
                    cliffDuration2,
                    cliffUnlock2,
                    claimablePeriods2
                );

                let [
                    _id2,
                    _status2,
                    _to2,
                    _amount2,
                    _amountClaimed2,
                    _startTime2,
                    _cliffDuration2,
                    _cliffUnlock2,
                    _cliffClaimed2,
                    _claimablePeriods2,
                    _lastClaimedPeriod2,
                ] = await vesting.getVesting(2);

                expect(_status2).to.equal(0);
                expect(_to2).to.equal(to2);
                expect(_amount2).to.equal(amount2);
                expect(_amountClaimed2).to.equal(0);
                expect(_cliffDuration2).to.equal(cliffDuration2);
                expect(_cliffUnlock2).to.equal(cliffUnlock2);
                expect(_cliffClaimed2).to.equal(false);
                expect(_claimablePeriods2).to.equal(claimablePeriods2);
                expect(_lastClaimedPeriod2).to.equal(0);

                let vestings = await vesting.getUserVestings(clientAcc1.address);

                expect(vestings.length).to.equal(2);
                expect(vestings[0]).to.equal(1);
                expect(vestings[1]).to.equal(2);
            });

            describe("Fails", () => {
                it("Should fail to start vesting for zero address user", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let to = zeroAddress;
                    let amount = parseEther("1");
                    let cliffDuration = 3600;
                    let cliffUnlock = 1000;
                    let claimablePeriods = 5;

                    await expect(
                        vesting.startVesting(
                            to,
                            amount,
                            cliffDuration,
                            cliffUnlock,
                            claimablePeriods
                        )
                    ).to.be.revertedWith("Vesting: Reciever cannot be zero address");
                });

                it("Should fail to start vesting with zero amount", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let to = clientAcc1.address;
                    let amount = parseEther("0");
                    let cliffDuration = 3600;
                    let cliffUnlock = 1000;
                    let claimablePeriods = 5;

                    await expect(
                        vesting.startVesting(
                            to,
                            amount,
                            cliffDuration,
                            cliffUnlock,
                            claimablePeriods
                        )
                    ).to.be.revertedWith("Vesting: Amount cannot be zero");
                });

                it("Should fail to start vesting with zero cliff duration", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let to = clientAcc1.address;
                    let amount = parseEther("1");
                    let cliffDuration = 0;
                    let cliffUnlock = 1000;
                    let claimablePeriods = 5;

                    await expect(
                        vesting.startVesting(
                            to,
                            amount,
                            cliffDuration,
                            cliffUnlock,
                            claimablePeriods
                        )
                    ).to.be.revertedWith("Vesting: Cliff duration cannot be zero");
                });
                it("Should fail to start vesting with whole amount unlock at cliff", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let to = clientAcc1.address;
                    let amount = parseEther("1");
                    let cliffDuration = 3600;
                    let cliffUnlock = 10000;
                    let claimablePeriods = 5;

                    await expect(
                        vesting.startVesting(
                            to,
                            amount,
                            cliffDuration,
                            cliffUnlock,
                            claimablePeriods
                        )
                    ).to.be.revertedWith("Vesting: Whole amount cannot be unlocked");
                });
                it("Should fail to start vesting with zero claimable periods", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let to = clientAcc1.address;
                    let amount = parseEther("1");
                    let cliffDuration = 3600;
                    let cliffUnlock = 1000;
                    let claimablePeriods = 0;

                    await expect(
                        vesting.startVesting(
                            to,
                            amount,
                            cliffDuration,
                            cliffUnlock,
                            claimablePeriods
                        )
                    ).to.be.revertedWith("Vesting: Number of periods cannot be zero");
                });
            });
        });
        describe("Claim vesting", () => {
            it("Should claim one vesting periodically", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start 1 vesting
                let to = clientAcc1.address;
                let amount = parseEther("100");
                let cliffDuration = 3600 * 24 * 30;
                // 10% of tokens should be unlocked after 30 days cliff
                // 100 * 0.1 = 10 tokens
                let cliffUnlock = 1000;
                // 100 tokens shuld be unlocked during 2 periods
                // 50 tokens should be unlocked each period
                let claimablePeriods = 2;

                let expectedCliffUnlockAmount = amount.mul(cliffUnlock).div(10000);
                let expectedamountPerPeriod = amount
                    .sub(expectedCliffUnlockAmount)
                    .div(claimablePeriods);

                await maze.connect(ownerAcc).approve(farming.address, amount);

                await vesting.startVesting(
                    to,
                    amount,
                    cliffDuration,
                    cliffUnlock,
                    claimablePeriods
                );

                // Skip cliff
                await time.increase(cliffDuration);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                // Claim right after cliff
                await vesting.connect(clientAcc1).claimTokens();

                let clientEndBalance1 = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance1 = await maze.balanceOf(farming.address);

                // First period hasn't passed yet. Only claim cliff amount
                expect(clientEndBalance1).to.equal(
                    clientStartBalance.add(expectedCliffUnlockAmount)
                );

                expect(farmingEndBalance1).to.equal(
                    farmingStartBalance.sub(expectedCliffUnlockAmount)
                );

                // Skip first period
                await time.increase(3600 * 24 * 30);

                // Claim in 1 period and 10 seconds
                await vesting.connect(clientAcc1).claimTokens();

                let clientEndBalance2 = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance2 = await maze.balanceOf(farming.address);

                // By now user should claim cliff amount and first period amount
                expect(clientEndBalance2).to.equal(
                    clientStartBalance.add(expectedCliffUnlockAmount).add(expectedamountPerPeriod)
                );

                expect(farmingEndBalance2).to.equal(
                    farmingStartBalance.sub(expectedCliffUnlockAmount).sub(expectedamountPerPeriod)
                );

                // Skip second period
                await time.increase(3600 * 24 * 30);

                // Claim in 2 period and 10 seconds
                await vesting.connect(clientAcc1).claimTokens();

                let clientEndBalance3 = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance3 = await maze.balanceOf(farming.address);

                // By now user should claim cliff amount and two periods amounts
                expect(clientEndBalance3).to.equal(
                    clientStartBalance
                        .add(expectedCliffUnlockAmount)
                        .add(expectedamountPerPeriod)
                        .add(expectedamountPerPeriod)
                );

                expect(farmingEndBalance3).to.equal(
                    farmingStartBalance
                        .sub(expectedCliffUnlockAmount)
                        .sub(expectedamountPerPeriod)
                        .sub(expectedamountPerPeriod)
                );

                // In the end farming should have no tokens
                expect(await maze.balanceOf(farming.address)).to.equal(0);
            });

            it("Should claim one vesting after last period", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start 1 vesting
                let to = clientAcc1.address;
                let amount = parseEther("100");
                let cliffDuration = 10;
                // 10% of tokens should be unlocked in 10 second after cliff
                // 100 * 0.1 = 10 tokens
                let cliffUnlock = 1000;
                // 100 tokens shuld be unlocked during 2 periods
                // 50 tokens should be unlocked each period
                let claimablePeriods = 2;

                let expectedCliffUnlockAmount = amount.mul(cliffUnlock).div(10000);
                let expectedamountPerPeriod = amount
                    .sub(expectedCliffUnlockAmount)
                    .div(claimablePeriods);

                await maze.connect(ownerAcc).approve(farming.address, amount);

                await vesting.startVesting(
                    to,
                    amount,
                    cliffDuration,
                    cliffUnlock,
                    claimablePeriods
                );

                // Skip all periods (700 days to make sure)
                await time.increase(3600 * 24 * 700);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await expect(vesting.connect(clientAcc1).claimTokens()).to.emit(
                    vesting,
                    "TokensClaimed"
                );

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                // By now user should claim cliff amount and two periods amounts
                expect(clientEndBalance).to.equal(
                    clientStartBalance
                        .add(expectedCliffUnlockAmount)
                        .add(expectedamountPerPeriod)
                        .add(expectedamountPerPeriod)
                );

                expect(farmingEndBalance).to.equal(
                    farmingStartBalance
                        .sub(expectedCliffUnlockAmount)
                        .sub(expectedamountPerPeriod)
                        .sub(expectedamountPerPeriod)
                );

                // In the end farming should have no tokens
                expect(await maze.balanceOf(farming.address)).to.equal(0);
            });

            it("Should claim multiple vestings. One in process and one after all periods.", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start vesting #1

                let to1 = clientAcc1.address;
                let amount1 = parseEther("500");
                let cliffDuration1 = 10;
                // 25% of tokens should be unlocked after cliff
                // 500 * 0.25 = 125 tokens
                let cliffUnlock1 = 2500;
                // 500 - 125 = 375 tokens shuld be unlocked during 5 periods
                // 75 tokens should be unlocked each period
                let claimablePeriods1 = 5;

                let expectedCliffUnlockAmount1 = amount1.mul(cliffUnlock1).div(10000);
                let expectedamountPerPeriod1 = amount1
                    .sub(expectedCliffUnlockAmount1)
                    .div(claimablePeriods1);

                await maze.connect(ownerAcc).approve(farming.address, amount1);

                await vesting.startVesting(
                    to1,
                    amount1,
                    cliffDuration1,
                    cliffUnlock1,
                    claimablePeriods1
                );

                // Start vesting #2

                let to2 = clientAcc1.address;
                let amount2 = parseEther("720");
                let cliffDuration2 = 60;
                // 9% of tokens should be unlocked after cliff
                // 720 * 0.09 = 65 tokens
                let cliffUnlock2 = 900;
                // 720 - 65 = 655 tokens shuld be unlocked during 3 periods
                // 219 tokens should be unlocked each period
                let claimablePeriods2 = 3;

                let expectedCliffUnlockAmount2 = amount2.mul(cliffUnlock2).div(10000);
                let expectedamountPerPeriod2 = amount2
                    .sub(expectedCliffUnlockAmount2)
                    .div(claimablePeriods2);

                await maze.connect(ownerAcc).approve(farming.address, amount2);

                await vesting.startVesting(
                    to2,
                    amount2,
                    cliffDuration2,
                    cliffUnlock2,
                    claimablePeriods2
                );

                // Skip 4.5 periods. So Vesting #1 is in progress and Vesting #2 is finished
                await time.increase(3600 * 24 * 30 * 4.5);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await vesting.connect(clientAcc1).claimTokens();

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                // By now user should claim:
                // From Vesting #1: 125 (cliff) + 300 (4 periods) = 425 tokens
                // From Vesting #2: 65 (cliff) + 655 (3 periods) =  720 tokens
                expect(clientEndBalance).to.equal(
                    clientStartBalance
                        .add(expectedCliffUnlockAmount1)
                        .add(expectedamountPerPeriod1.mul(4))
                        .add(expectedCliffUnlockAmount2)
                        .add(expectedamountPerPeriod2.mul(3))
                );

                expect(farmingEndBalance).to.equal(
                    farmingStartBalance
                        .sub(expectedCliffUnlockAmount1)
                        .sub(expectedamountPerPeriod1.mul(4))
                        .sub(expectedCliffUnlockAmount2)
                        .sub(expectedamountPerPeriod2.mul(3))
                );

                // In the end farming should have for 5th period of Vesting #1
                expect(await maze.balanceOf(farming.address)).to.equal(expectedamountPerPeriod1);
            });
            it("Should claim multiple vestings. Both after all periods.", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start vesting #1

                let to1 = clientAcc1.address;
                let amount1 = parseEther("500");
                let cliffDuration1 = 10;
                // 25% of tokens should be unlocked after cliff
                // 500 * 0.25 = 125 tokens
                let cliffUnlock1 = 2500;
                // 500 - 125 = 375 tokens shuld be unlocked during 5 periods
                // 75 tokens should be unlocked each period
                let claimablePeriods1 = 5;

                let expectedCliffUnlockAmount1 = amount1.mul(cliffUnlock1).div(10000);
                let expectedamountPerPeriod1 = amount1
                    .sub(expectedCliffUnlockAmount1)
                    .div(claimablePeriods1);

                await maze.connect(ownerAcc).approve(farming.address, amount1);

                await vesting.startVesting(
                    to1,
                    amount1,
                    cliffDuration1,
                    cliffUnlock1,
                    claimablePeriods1
                );

                // Start vesting #2

                let to2 = clientAcc1.address;
                let amount2 = parseEther("720");
                let cliffDuration2 = 60;
                // 9% of tokens should be unlocked after cliff
                // 720 * 0.09 = 65 tokens
                let cliffUnlock2 = 900;
                // 720 - 65 = 655 tokens shuld be unlocked during 3 periods
                // 219 tokens should be unlocked each period
                let claimablePeriods2 = 3;

                let expectedCliffUnlockAmount2 = amount2.mul(cliffUnlock2).div(10000);
                let expectedamountPerPeriod2 = amount2
                    .sub(expectedCliffUnlockAmount2)
                    .div(claimablePeriods2);

                await maze.connect(ownerAcc).approve(farming.address, amount2);

                await vesting.startVesting(
                    to2,
                    amount2,
                    cliffDuration2,
                    cliffUnlock2,
                    claimablePeriods2
                );

                // Skip 6 periods. So both Vestings are finished
                await time.increase(3600 * 24 * 30 * 6);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await vesting.connect(clientAcc1).claimTokens();

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                // By now user should claim:
                // From Vesting #1: 125 (cliff) + 375 (5 periods) = 500 tokens
                // From Vesting #2: 65 (cliff) + 655 (3 periods) =  720 tokens
                expect(clientEndBalance).to.equal(
                    clientStartBalance
                        .add(expectedCliffUnlockAmount1)
                        .add(expectedamountPerPeriod1.mul(5))
                        .add(expectedCliffUnlockAmount2)
                        .add(expectedamountPerPeriod2.mul(3))
                );

                expect(farmingEndBalance).to.equal(
                    farmingStartBalance
                        .sub(expectedCliffUnlockAmount1)
                        .sub(expectedamountPerPeriod1.mul(5))
                        .sub(expectedCliffUnlockAmount2)
                        .sub(expectedamountPerPeriod2.mul(3))
                );

                // In the end farming should have no tokens left
                expect(await maze.balanceOf(farming.address)).to.equal(0);
            });

            it("Should skip claimed vesting", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start vesting #1

                let to1 = clientAcc1.address;
                let amount1 = parseEther("500");
                let cliffDuration1 = 10;
                // 25% of tokens should be unlocked after cliff
                // 500 * 0.25 = 125 tokens
                let cliffUnlock1 = 2500;
                // 500 - 125 = 375 tokens shuld be unlocked during 5 periods
                // 75 tokens should be unlocked each period
                let claimablePeriods1 = 5;

                let expectedCliffUnlockAmount1 = amount1.mul(cliffUnlock1).div(10000);
                let expectedamountPerPeriod1 = amount1
                    .sub(expectedCliffUnlockAmount1)
                    .div(claimablePeriods1);

                await maze.connect(ownerAcc).approve(farming.address, amount1);

                await vesting.startVesting(
                    to1,
                    amount1,
                    cliffDuration1,
                    cliffUnlock1,
                    claimablePeriods1
                );

                // Claim vesting #1
                await time.increase(3600 * 24 * 30 * 6);
                await vesting.connect(clientAcc1).claimTokens();

                // Start vesting #2

                let to2 = clientAcc1.address;
                let amount2 = parseEther("720");
                let cliffDuration2 = 60;
                // 9% of tokens should be unlocked after cliff
                // 720 * 0.09 = 65 tokens
                let cliffUnlock2 = 900;
                // 720 - 65 = 655 tokens shuld be unlocked during 3 periods
                // 219 tokens should be unlocked each period
                let claimablePeriods2 = 3;

                let expectedCliffUnlockAmount2 = amount2.mul(cliffUnlock2).div(10000);
                let expectedamountPerPeriod2 = amount2
                    .sub(expectedCliffUnlockAmount2)
                    .div(claimablePeriods2);

                await maze.connect(ownerAcc).approve(farming.address, amount2);

                await vesting.startVesting(
                    to2,
                    amount2,
                    cliffDuration2,
                    cliffUnlock2,
                    claimablePeriods2
                );

                // Skip 6 periods. So both Vestings are finished
                await time.increase(3600 * 24 * 30 * 6);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                // Claim vesting #2. This should skip vesting #1
                await vesting.connect(clientAcc1).claimTokens();

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                // By now user should claim:
                // From Vesting #2: 65 (cliff) + 655 (3 periods) =  720 tokens
                expect(clientEndBalance).to.equal(
                    clientStartBalance
                        .add(expectedCliffUnlockAmount2)
                        .add(expectedamountPerPeriod2.mul(3))
                );

                expect(farmingEndBalance).to.equal(
                    farmingStartBalance
                        .sub(expectedCliffUnlockAmount2)
                        .sub(expectedamountPerPeriod2.mul(3))
                );
            });

            it("Should finish vesting without claimed amount round down", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start 1 vesting
                let to = clientAcc1.address;
                let amount = parseEther("777");
                let cliffDuration = 150;
                // 20% of tokens should be unlocked in after cliff
                // 777 * 0.2 = 155 tokens
                let cliffUnlock = 2000;
                // 622 tokens shuld be unlocked during 3 periods
                // 207 tokens should be unlocked each period
                let claimablePeriods = 3;

                let expectedCliffUnlockAmount = amount.mul(cliffUnlock).div(10000);
                let expectedamountPerPeriod = amount
                    .sub(expectedCliffUnlockAmount)
                    .div(claimablePeriods);

                await maze.connect(ownerAcc).approve(farming.address, amount);

                await vesting.startVesting(
                    to,
                    amount,
                    cliffDuration,
                    cliffUnlock,
                    claimablePeriods
                );

                // Skip all periods
                await time.increase(3600 * 24 * 30 * 5);

                // Claim tokens
                await vesting.connect(clientAcc1).claimTokens();

                let [
                    _id,
                    _status,
                    _to,
                    _amount,
                    _amountClaimed,
                    _startTime,
                    _cliffDuration,
                    _cliffUnlock,
                    _cliffClaimed,
                    _claimablePeriods,
                    _lastClaimedPeriod,
                ] = await vesting.getVesting(1);

                expect(_amount).to.equal(amount);
                expect(_amountClaimed).to.equal(amount);
                expect(_status).to.equal(1);
            });

            it("Should claim last period instead of all periods", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start 1 vesting
                let to = clientAcc1.address;
                let amount = parseEther("1000");
                let cliffDuration = 150;
                // No tokens are unlocked on cliff
                let cliffUnlock = 0;
                // 1000 tokens shuld be unlocked during 5 periods
                // 200 tokens should be unlocked each period
                let claimablePeriods = 5;

                let expectedCliffUnlockAmount = amount.mul(cliffUnlock).div(10000);
                let expectedamountPerPeriod = amount
                    .sub(expectedCliffUnlockAmount)
                    .div(claimablePeriods);

                await maze.connect(ownerAcc).approve(farming.address, amount);

                await vesting.startVesting(
                    to,
                    amount,
                    cliffDuration,
                    cliffUnlock,
                    claimablePeriods
                );

                // Skip cliff
                await time.increase(150);

                // Claim first 4 periods
                for (let i = 0; i < 4; i++) {
                    await time.increase(3600 * 24 * 30);
                    await vesting.connect(clientAcc1).claimTokens();
                }

                expect(await maze.balanceOf(clientAcc1.address)).to.equal(
                    expectedamountPerPeriod.mul(4)
                );

                // Skip 880 more days. 1000 days since cliff in total
                await time.increase(3600 * 24 * 880);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                // Claim the last (5th) period
                await vesting.connect(clientAcc1).claimTokens();

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                // Only tokens for the 5th period should be transferred
                expect(clientEndBalance).to.equal(clientStartBalance.add(expectedamountPerPeriod));

                let [
                    _id,
                    _status,
                    _to,
                    _amount,
                    _amountClaimed,
                    _startTime,
                    _cliffDuration,
                    _cliffUnlock,
                    _cliffClaimed,
                    _claimablePeriods,
                    _lastClaimedPeriod,
                ] = await vesting.getVesting(1);

                expect(_amount).to.equal(amount);
                expect(_amountClaimed).to.equal(amount);
                expect(_status).to.equal(1);
            });

            describe("Fails", () => {
                it("Should fail to claim if cliff not reached", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let to = clientAcc1.address;
                    let amount = parseEther("500");
                    // Cliff is 10 minutes
                    let cliffDuration = 600;
                    // 25% of tokens should be unlocked after cliff
                    // 500 * 0.25 = 125 tokens
                    let cliffUnlock = 2500;
                    // 500 - 125 = 375 tokens shuld be unlocked during 5 periods
                    // 75 tokens should be unlocked each period
                    let claimablePeriods = 5;

                    let expectedCliffUnlockAmount = amount.mul(cliffUnlock).div(10000);
                    let expectedamountPerPeriod = amount
                        .sub(expectedCliffUnlockAmount)
                        .div(claimablePeriods);

                    await maze.connect(ownerAcc).approve(farming.address, amount);

                    await vesting.startVesting(
                        to,
                        amount,
                        cliffDuration,
                        cliffUnlock,
                        claimablePeriods
                    );

                    // Only skip 5 minutes. Cliff is 10
                    await time.increase(60 * 5);

                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    // This claim should not change users balance
                    await vesting.connect(clientAcc1).claimTokens();

                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    expect(clientEndBalance).to.equal(clientStartBalance);
                });
                it("Should fail to claim in the same period multiple times", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    // Start 1 vesting
                    let to = clientAcc1.address;
                    let amount = parseEther("100");
                    let cliffDuration = 10;
                    // 10% of tokens should be unlocked in 10 second after cliff
                    // 100 * 0.1 = 10 tokens
                    let cliffUnlock = 1000;
                    // 100 tokens shuld be unlocked during 2 periods
                    // 50 tokens should be unlocked each period
                    let claimablePeriods = 2;

                    await maze.connect(ownerAcc).approve(farming.address, amount);

                    await vesting.startVesting(
                        to,
                        amount,
                        cliffDuration,
                        cliffUnlock,
                        claimablePeriods
                    );

                    // Skip 2 periods
                    await time.increase(3600 * 24 * 30 * 2);

                    await vesting.connect(clientAcc1).claimTokens();

                    // The second claim should not change user's balance

                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    await vesting.connect(clientAcc1).claimTokens();

                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    expect(clientEndBalance).to.equal(clientStartBalance);
                });

                it("Should fail to claim if no vestings were started for the user", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(vesting.connect(clientAcc1).claimTokens()).to.be.revertedWith(
                        "Vesting: No vestings for that user"
                    );
                });
            });
        });
    });
});
