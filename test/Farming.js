const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { joinSignature } = require("ethers/lib/utils");
const math = require("mathjs");
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;
let toBN = BigNumber.from;
let converter = 1e4;
let initAmount = parseEther("45000000");
let initRate = parseEther("0.003");
const DAY = 60 * 60 * 24;
const EPSILON = parseEther("0.000001");

function calculateReward(initAmount, rate, userAmount, totalSupply, daysPassed) {
    // R = ((1 - (1 - r)^t) * u * init / Ts
    // t - days passed
    // u - user staked amount
    // Ts - total staked amount
    // init - reward pool
    let init = math.bignumber(initAmount / 1e18);
    let r = math.bignumber(rate / 1e18);
    let u = math.bignumber(userAmount / 1e18);
    let ts = math.bignumber(totalSupply / 1e18);
    let _1 = math.bignumber(1);
    let res = _1.sub(r);
    res = _1.sub(res.pow(daysPassed));
    res = res.mul(init).mul(u).div(ts);
    return parseEther(res.toPrecision(18).toString());
}

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
        await maze.excludeFromStakers(ownerAcc.address);
        await maze.excludeFromStakers(clientAcc1.address);
        // Contracts do not pay fees
        await maze.addToWhitelist(farming.address);
        await maze.addToWhitelist(vesting.address);
        await maze.addToWhitelist(ownerAcc.address);

        // Set addresses of all contracts into core
        await core.setMaze(maze.address);
        await core.setFarming(farming.address);
        await core.setVesting(vesting.address);

        // Transfer tokens to pay rewards
        await maze.connect(ownerAcc).transfer(farming.address, initAmount);
        await farming.connect(ownerAcc).notifyRewardAmount(initAmount);

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

                // Transfer some tokens to the client to lock
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, lockAmount);

                await core.connect(ownerAcc).addToBlacklist(clientAcc1.address);
                await expect(farming.connect(clientAcc1).lock(lockAmount)).to.be.revertedWith(
                    "Farming: Account is blacklisted"
                );
            });
        });
        describe("Pause", () => {
            it("Should forbid operations if contract is paused", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, lockAmount);

                await farming.pause();

                await expect(farming.connect(ownerAcc).setMinLockPeriod(555)).to.be.revertedWith(
                    "Pausable: paused"
                );

                await farming.unpause();

                await expect(farming.connect(ownerAcc).setMinLockPeriod(555)).not.to.be.reverted;
            });
        });
        describe("Only Vesting", () => {
            it("Should allow only vesting to lock tokens on someone's behalf", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                await expect(
                    farming
                        .connect(ownerAcc)
                        .lockOnBehalf(ownerAcc.address, clientAcc1.address, parseEther("1"))
                ).to.be.revertedWith("Farming: Caller is not Vesting");
            });
        });
    });

    describe("Deployment", () => {
        it("Should deploy and have correct parameters after", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);
            expect(await farming.core()).to.equal(core.address);
            expect(await farming.minLockPeriod()).to.equal(3600 * 24 * 30);
            expect(await farming.minClaimGap()).to.equal(3600 * 24 * 365);
            expect(await farming.dailyRate()).to.equal(3 * 1e15);
        });
        describe("Fails", () => {
            it("Should fail to deploy with invalid parameters", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let farmingFactory = await ethers.getContractFactory("Farming");

                await expect(farmingFactory.deploy(zeroAddress)).to.be.revertedWith(
                    "Farming: Core cannot have zero address"
                );
            });
        });
    });

    describe("Getters", () => {
        describe("Get farming", () => {
            it("Should get correct info about user's farming", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                // Before any farming was started for the user
                let [lockedAmount1, startTime1, endTime1, reward1] = await farming.getFarming(
                    clientAcc1.address
                );

                expect(lockedAmount1).to.equal(0);
                expect(startTime1).to.equal(0);
                expect(endTime1).to.equal(0);
                expect(reward1).to.equal(0);

                // Lock and start farming
                await farming.connect(clientAcc1).lock(lockAmount);
                let currentTime = await time.latest();

                // Get info about the only one farming
                let [lockedAmount2, startTime2, endTime2, reward2] = await farming.getFarming(
                    clientAcc1.address
                );
                expect(lockedAmount2).to.equal(lockAmount);
                // Farming not claimed and not ended yet
                expect(endTime2).to.equal(currentTime + 30 * DAY);
                // No rewards are assinged to user yet
                expect(reward2).to.equal(0);
            });

            describe("Fails", () => {
                it("Should fail to get farming of zero address user", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(farming.getFarming(zeroAddress)).to.be.revertedWith(
                        "Farming: User cannot have zero address"
                    );
                });
            });
        });
        describe("Get reward", () => {
            it("Should get correct reward of the user", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let reward1 = await farming.getReward(clientAcc1.address);

                // Before start of farming reward must be zero
                expect(reward1).to.equal(0);

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                // Lock and start farming
                await farming.connect(clientAcc1).lock(lockAmount);

                let reward2 = await farming.getReward(clientAcc1.address);

                // Right after farming start reward must be zero
                expect(reward2).to.equal(0);

                let oneDay = 3600 * 24;
                let rate = await farming.dailyRate();
                await time.increase(oneDay);

                let expectedReward3 = calculateReward(
                    initAmount,
                    initRate,
                    lockAmount,
                    lockAmount,
                    math.bignumber(1)
                );
                let reward3 = await farming.getReward(clientAcc1.address);
                expect(reward3).to.equal(expectedReward3);
            });
            describe("Fails", () => {
                it("Should fail to get the reward of the zero address user", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(farming.getReward(zeroAddress)).to.be.revertedWith(
                        "Farming: User cannot have zero address"
                    );
                });
            });
        });
    });

    describe("Setters", () => {
        describe("Set minimum lock period", () => {
            it("Should set new minimum lock period", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let oldPeriod = await farming.minLockPeriod();

                let period = 3600 * 24 * 365;
                await expect(farming.connect(ownerAcc).setMinLockPeriod(period)).to.emit(
                    farming,
                    "MinLockPeriodChanged"
                );

                let newPeriod = await farming.minLockPeriod();

                expect(newPeriod).to.not.equal(oldPeriod);
                expect(newPeriod).to.equal(period);
            });
        });

        describe("Set daily rate", () => {
            it("Should set new daily rate", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let oldRate = await farming.dailyRate();

                let rate = 7500;
                await expect(farming.connect(ownerAcc).setDailyRate(rate)).to.emit(
                    farming,
                    "DailyRateChanged"
                );

                let newRate = await farming.dailyRate();

                expect(newRate).to.not.equal(oldRate);
                expect(newRate).to.equal(rate);
            });
        });
    });

    describe("Main functions", () => {
        describe("Lock on behalf", () => {
            it("Should lock from Vesting on behalf of the user", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let to = clientAcc1.address;
                let amount = parseEther("1");
                let cliffDuration = 3600;
                let cliffUnlock = 1000;
                let claimablePeriods = 5;

                await maze.connect(ownerAcc).approve(farming.address, amount);

                let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                // Start vesting and lock tokens on behalf of client
                await expect(
                    vesting.startVesting(to, amount, cliffDuration, cliffUnlock, claimablePeriods)
                ).to.emit(farming, "LockedOnBehalf");
                let currentTime = await time.latest();

                let [lockedAmount, startTime, endTime, reward] = await farming.getFarming(
                    clientAcc1.address
                );

                expect(lockedAmount).to.equal(amount);
                // Farming not claimed and not ended yet
                expect(endTime).to.equal(currentTime + 30 * DAY);
                // No rewards are assinged to user yet
                expect(reward).to.equal(0);

                let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                expect(ownerEndBalance).to.equal(ownerStartBalance.sub(amount));
                expect(farmingEndBalance).to.equal(farmingStartBalance.add(amount));
            });
            // No tests for Fails here because checks are already done in `startVesting`
        });
        describe("Lock", () => {
            it("Should lock user's tokens and start farming", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await expect(farming.connect(clientAcc1).lock(lockAmount)).to.emit(
                    farming,
                    "Locked"
                );
                let currentTime = await time.latest();

                let [lockedAmount2, startTime2, endTime2, reward2] = await farming.getFarming(
                    clientAcc1.address
                );

                expect(lockedAmount2).to.equal(lockAmount);
                // Farming not claimed and not ended yet
                expect(endTime2).to.equal(currentTime + 30 * DAY);
                // No rewards are assinged to user yet
                expect(reward2).to.equal(0);

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                expect(clientEndBalance).to.equal(clientStartBalance.sub(lockAmount));
                expect(farmingEndBalance).to.equal(farmingStartBalance.add(lockAmount));
            });
            describe("Fails", () => {
                it("Should fail to lock zero amount", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let transferAmount = parseEther("2");
                    let lockAmount = parseEther("0");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                    await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                    await expect(farming.connect(clientAcc1).lock(lockAmount)).be.revertedWith(
                        "Farming: Lock amount cannot be zero"
                    );
                });
            });
        });
        describe("Unlock", () => {
            it("Should unlock some of user's tokens", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                let unlockAmount = lockAmount.div(2);
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await farming.connect(clientAcc1).lock(lockAmount);

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);
                await expect(farming.connect(clientAcc1).unlock(unlockAmount)).to.emit(
                    farming,
                    "Unlocked"
                );

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                expect(clientEndBalance).to.equal(clientStartBalance.sub(unlockAmount));
                expect(farmingEndBalance).to.equal(farmingStartBalance.add(unlockAmount));
            });
            it("Should unlock all user's tokens", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await farming.connect(clientAcc1).lock(lockAmount);

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);
                await expect(farming.connect(clientAcc1).unlock(lockAmount)).to.emit(
                    farming,
                    "Unlocked"
                );

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                expect(clientEndBalance).to.equal(clientStartBalance);
                expect(farmingEndBalance).to.equal(farmingStartBalance);
            });
            describe("Fails", () => {
                it("Should fail to unlock zero amount of tokens", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(farming.connect(clientAcc1).unlock(0)).to.be.revertedWith(
                        "Farming: Unlock amount cannot be zero"
                    );
                });
                it("Should fail to unlock if already unlocked", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let transferAmount = parseEther("2");
                    let lockAmount = parseEther("1");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                    await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);
                    let fiveYears = 3600 * 24 * 365 * 5;
                    await time.increase(fiveYears);
                    await farming.connect(clientAcc1).unlock(lockAmount);
                    // Try to unlock one again
                    await expect(farming.connect(clientAcc1).unlock(5)).to.be.revertedWith(
                        "Farming: Insufficient funds"
                    );
                });
                it("Should fail to unlock if no lock was made", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(farming.connect(clientAcc1).unlock(5)).to.be.revertedWith(
                        "Farming: Insufficient funds"
                    );
                });
                it("Should fail to unlock more than locked", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let transferAmount = parseEther("2");
                    let lockAmount = parseEther("1");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                    await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);
                    await expect(
                        farming.connect(clientAcc1).unlock(lockAmount.mul(2))
                    ).to.be.revertedWith("Farming: Insufficient funds");
                });
                it("Should fail to unlock too early", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    let transferAmount = parseEther("2");
                    let lockAmount = parseEther("1");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                    await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);

                    await expect(farming.connect(clientAcc1).unlock(lockAmount)).to.be.revertedWith(
                        "Farming: Minimum lock period has not passed yet"
                    );
                });
            });
        });
        describe("Unlock all", () => {
            it("Should unlock all user's tokens", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await farming.connect(clientAcc1).lock(lockAmount);

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);
                await expect(farming.connect(clientAcc1).unlockAll()).to.emit(farming, "Unlocked");

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                expect(clientEndBalance).to.equal(clientStartBalance);
                expect(farmingEndBalance).to.equal(farmingStartBalance);
            });
        });
        describe("Unlock from Vesting", () => {
            it("Should unlock user's tokens when called from Vesting", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                let to = clientAcc1.address;
                let amount = parseEther("1");
                let cliffDuration = 3600 * 24 * 30;
                let cliffUnlock = 1000;
                let claimablePeriods = 5;

                await maze.connect(ownerAcc).approve(farming.address, amount);

                let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await expect(
                    vesting.startVesting(to, amount, cliffDuration, cliffUnlock, claimablePeriods)
                ).to.emit(farming, "LockedOnBehalf");

                await time.increase(cliffDuration + 3600 * 24 * 30 * claimablePeriods);

                // Claiming tokens unlocks them from farming
                await vesting.connect(clientAcc1).claimTokens();

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);
                expect(clientEndBalance).to.equal(clientStartBalance.add(amount));
                expect(farmingEndBalance).to.equal(farmingStartBalance);
            });
            describe("Fails", () => {
                it("Should fail to unlock if called not from Vesting", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    await expect(
                        farming
                            .connect(ownerAcc)
                            .unlockFromVesting(clientAcc1.address, parseEther("1"))
                    ).to.be.revertedWith("Farming: Caller is not Vesting");
                });
            });
        });
    });

    describe("Claim", () => {
        it("Should allow user to claim farming rewards", async () => {
            let { core, maze, farming, vesting } = await loadFixture(deploys);

            // Lock tokens and start farming

            let transferAmount = parseEther("2");
            let lockAmount = parseEther("1");
            await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
            await maze.connect(clientAcc1).approve(farming.address, lockAmount);

            await farming.connect(clientAcc1).lock(lockAmount);

            let fiveYears = 3600 * 24 * 365 * 5;
            await time.increase(fiveYears);

            // Unlock all tokens before claiming
            await farming.connect(clientAcc1).unlockAll();

            // Claim #1
            // No tokens should be trasferred
            let farmingStartBalance1 = await maze.balanceOf(farming.address);
            await expect(farming.connect(clientAcc1).claim()).to.emit(farming, "ClaimAttempt");
            let farmingEndBalance1 = await maze.balanceOf(farming.address);
            expect(farmingStartBalance1).to.equal(farmingEndBalance1);

            // Wait for 1 year (min gap between claims)
            let oneYear = 3600 * 24 * 365;
            await time.increase(oneYear);

            // Claim #2
            // Should transfer reward tokens
            let expectedReward = await farming.getReward(clientAcc1.address);
            let clientStartBalance2 = await maze.balanceOf(clientAcc1.address);
            let farmingStartBalance2 = await maze.balanceOf(farming.address);
            await expect(farming.connect(clientAcc1).claim()).to.emit(farming, "Claimed");
            let clientEndBalance2 = await maze.balanceOf(clientAcc1.address);
            let farmingEndBalance2 = await maze.balanceOf(farming.address);

            expect(clientEndBalance2).to.equal(clientStartBalance2.add(expectedReward));
            expect(farmingEndBalance2).to.equal(farmingStartBalance2.sub(expectedReward));
        });

        describe("Fails", () => {
            it("Should fail to claim before full unlock", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Lock tokens and start farming

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                // Lock twice to recalculate reward
                await farming.connect(clientAcc1).lock(lockAmount.div(2));
                await farming.connect(clientAcc1).lock(lockAmount.div(2));

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);

                await expect(farming.connect(clientAcc1).claim()).to.be.revertedWith(
                    "Farming: Unable to claim before full unlock"
                );
            });

            it("Should fail to claim second time too soon", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Lock tokens and start farming

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                await farming.connect(clientAcc1).lock(lockAmount);

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);

                // Unlock all tokens before claiming
                await farming.connect(clientAcc1).unlockAll();

                // Claim #1
                let farmingStartBalance1 = await maze.balanceOf(farming.address);
                await expect(farming.connect(clientAcc1).claim()).to.emit(farming, "ClaimAttempt");
                let farmingEndBalance1 = await maze.balanceOf(farming.address);
                expect(farmingStartBalance1).to.equal(farmingEndBalance1);

                // Claim #2
                await expect(farming.connect(clientAcc1).claim()).to.be.revertedWith(
                    "Farming: Minimum interval between claimes not passed"
                );
            });
        });
    });

    describe("Internal functions", () => {
        describe("Recalculate reward", () => {
            describe("Rate changes", () => {
                it("Rate did not change since start of farming", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    // Start farming

                    let transferAmount = parseEther("20");
                    let lockAmount = parseEther("8");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                    await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);

                    let rate = await farming.dailyRate();

                    // Wait 1 day
                    let oneDay = 3600 * 24;
                    await time.increase(oneDay);

                    let expectedReward = calculateReward(
                        initAmount,
                        initRate,
                        lockAmount,
                        lockAmount,
                        math.bignumber(1)
                    );
                    let reward = await farming.getReward(clientAcc1.address);
                    expect(reward).to.be.closeTo(expectedReward, EPSILON);
                });
                it("Rate changed 1 time per day.", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    // Start farming

                    let transferAmount = parseEther("20");
                    let lockAmount = parseEther("8");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                    await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);

                    // Wait half a day and change rate
                    let oneDay = 3600 * 24;
                    await time.increase(oneDay / 2 - 1);

                    let oldRate = await farming.dailyRate();
                    let newRate = oldRate.mul(3);
                    await farming.setDailyRate(newRate);

                    // Wait another half a day
                    await time.increase(oneDay / 2);

                    let expectedRewardFirstHalf = calculateReward(
                        initAmount,
                        oldRate,
                        lockAmount,
                        lockAmount,
                        math.bignumber(1)
                    ).div("2");
                    let expectedRewardSecondHalf = calculateReward(
                        initAmount.sub(expectedRewardFirstHalf),
                        newRate,
                        lockAmount,
                        lockAmount,
                        math.bignumber(1)
                    ).div("2");
                    let expectedRewardFull = expectedRewardFirstHalf.add(expectedRewardSecondHalf);
                    let reward = await farming.getReward(clientAcc1.address);
                    expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
                });
                it("Rate changed 3 times per day.", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(deploys);

                    // Start farming

                    let transferAmount = parseEther("20");
                    let lockAmount = parseEther("8");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                    await maze.connect(clientAcc1).approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);

                    let oneDay = 3600 * 24;
                    let oneHour = 3600;
                    let initialDailyRate = await farming.dailyRate();
                    let newRate1 = initialDailyRate.mul(2);
                    let newRate2 = initialDailyRate.mul(3);
                    let newRate3 = initialDailyRate.mul(4);

                    // Wait one hour and change rate (change #1)
                    await time.increase(oneHour - 1);
                    await farming.setDailyRate(newRate1);

                    // Wait one hour and change rate (change #2)
                    await time.increase(oneHour - 1);
                    await farming.setDailyRate(newRate2);

                    // Wait one hour and change rate (change #3)
                    await time.increase(oneHour - 1);
                    await farming.setDailyRate(newRate3);

                    // Wait 7 more hours (10 in total)
                    await time.increase(oneHour * 7);

                    let expectedReward1 = calculateReward(
                        initAmount,
                        initialDailyRate,
                        lockAmount,
                        lockAmount,
                        math.bignumber(1)
                    ).div("24");
                    let expectedReward2 = calculateReward(
                        initAmount.sub(expectedReward1),
                        newRate1,
                        lockAmount,
                        lockAmount,
                        math.bignumber(1)
                    ).div("24");
                    let expectedReward3 = calculateReward(
                        initAmount.sub(expectedReward1).sub(expectedReward2),
                        newRate2,
                        lockAmount,
                        lockAmount,
                        math.bignumber(1)
                    ).div("24");
                    let expectedReward4 = calculateReward(
                        initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                        newRate3,
                        lockAmount,
                        lockAmount,
                        math.bignumber(1)
                    )
                        .mul("7")
                        .div("24");
                    let expectedRewardFull = expectedReward1
                        .add(expectedReward2)
                        .add(expectedReward3)
                        .add(expectedReward4);
                    let reward = await farming.getReward(clientAcc1.address);
                    expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
                });
            });
        });

        describe("Lock changes", () => {
            it("Lock changed 1 time per day.", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming

                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let oneDay = 3600 * 24;
                let rate = await farming.dailyRate();

                // Wait half a day and change lock
                await time.increase(oneDay / 2 - 1);
                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait another half a day
                await time.increase(oneDay / 2);

                let expectedReward1 = calculateReward(
                    initAmount,
                    initRate,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("2");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    initRate,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("2");
                let expectedRewardFull = expectedReward1.add(expectedReward2);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
            it("Lock changed 3 times per day.", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming

                let transferAmount = parseEther("20");
                let lockAmount0 = parseEther("8");
                let lockAmount1 = parseEther("2");
                let lockAmount2 = parseEther("5");
                let lockAmount3 = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(
                        farming.address,
                        lockAmount0.add(lockAmount1).add(lockAmount2).add(lockAmount3)
                    );

                await farming.connect(clientAcc1).lock(lockAmount0);

                let oneDay = 3600 * 24;
                let oneHour = 3600;
                let rate = await farming.dailyRate();

                // Wait an hour and change lock (change #1)
                await time.increase(oneHour - 1);
                await farming.connect(clientAcc1).lock(lockAmount1);

                // Wait an hour and change lock (change #2)
                await time.increase(oneHour - 1);
                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait an hour and change lock (change #3)
                await time.increase(oneHour - 1);
                await farming.connect(clientAcc1).lock(lockAmount3);

                // Wait another 7 hours (10 in total)
                await time.increase(oneHour * 7);

                let expectedReward1 = calculateReward(
                    initAmount,
                    initRate,
                    lockAmount0,
                    lockAmount0,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    initRate,
                    lockAmount0.add(lockAmount1),
                    lockAmount0.add(lockAmount1),
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    initRate,
                    lockAmount0.add(lockAmount1).add(lockAmount2),
                    lockAmount0.add(lockAmount1).add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward4 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                    initRate,
                    lockAmount0.add(lockAmount1).add(lockAmount2).add(lockAmount3),
                    lockAmount0.add(lockAmount1).add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                )
                    .mul("7")
                    .div("24");
                let expectedRewardFull = expectedReward1
                    .add(expectedReward2)
                    .add(expectedReward3)
                    .add(expectedReward4);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
        });

        describe("Rate and Lock changes", () => {
            it("In 1 day changed: rate and lock.", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                let rate2 = rate1.mul(3);
                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait another 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate2,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate2,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1.add(expectedReward2).add(expectedReward3);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
            it("In 1 day changed: lock and rate.", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                let rate2 = rate1.mul(3);
                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait another 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate1,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate2,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1.add(expectedReward2).add(expectedReward3);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
            it("In 1 day changed: lock, lock, rate", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                let lockAmount3 = parseEther("5");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2).add(lockAmount3));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                let rate2 = rate1.mul(3);
                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait 1 hour and change lock again
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount3);

                // Wait another 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate1,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate1,
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                ).div("24");
                let expectedReward4 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                    rate2,
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1
                    .add(expectedReward2)
                    .add(expectedReward3)
                    .add(expectedReward4);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
            it("In 1 day changed: rate, rate, lock", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                // 9%
                let rate2 = rate1.mul(3);
                // 36%
                let rate3 = rate2.mul(4);
                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait another 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait 1 hour and change rate again
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate3);

                // Wait 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate2,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate3,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward4 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                    rate3,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1
                    .add(expectedReward2)
                    .add(expectedReward3)
                    .add(expectedReward4);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
            it("In 1 day changed: lock, rate, lock", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                let lockAmount3 = parseEther("5");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2).add(lockAmount3));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                let rate2 = rate1.mul(3);

                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait 1 hour and change lock again
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount3);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate1,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate2,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward4 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                    rate2,
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1
                    .add(expectedReward2)
                    .add(expectedReward3)
                    .add(expectedReward4);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
            it("In 1 days changed: rate, lock, rate", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                // 9%
                let rate2 = rate1.mul(3);
                // 36%
                let rate3 = rate2.mul(4);

                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait 1 hour and change rate again
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate3);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate2,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate2,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward4 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                    rate3,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1
                    .add(expectedReward2)
                    .add(expectedReward3)
                    .add(expectedReward4);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
            it("In 1 days changed: rate, lock, lock, rate", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                let lockAmount3 = parseEther("5");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2).add(lockAmount3));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                // 9%
                let rate2 = rate1.mul(3);
                // 36%
                let rate3 = rate2.mul(4);

                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait 1 hour and change lock again
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount3);

                // Wait 1 hour and change rate again
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate3);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate2,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate2,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward4 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                    rate2,
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                ).div("24");
                let expectedReward5 = calculateReward(
                    initAmount
                        .sub(expectedReward1)
                        .sub(expectedReward2)
                        .sub(expectedReward3)
                        .sub(expectedReward4),
                    rate3,
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1
                    .add(expectedReward2)
                    .add(expectedReward3)
                    .add(expectedReward4)
                    .add(expectedReward5);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
            it("In 1 day changed: lock, rate, rate, lock", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                let lockAmount3 = parseEther("5");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount1.add(lockAmount2).add(lockAmount3));

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                // 9%
                let rate2 = rate1.mul(3);
                // 36%
                let rate3 = rate2.mul(4);

                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait 1 hour and change rate again
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate3);

                // Wait 1 hour and change lock again
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount3);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate1,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate2,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward4 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                    rate3,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward5 = calculateReward(
                    initAmount
                        .sub(expectedReward1)
                        .sub(expectedReward2)
                        .sub(expectedReward3)
                        .sub(expectedReward4),
                    rate3,
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1
                    .add(expectedReward2)
                    .add(expectedReward3)
                    .add(expectedReward4)
                    .add(expectedReward5);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });

            it("In 1 days changed: rate, lock, lock, rate, lock", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                let lockAmount2 = parseEther("2");
                let lockAmount3 = parseEther("5");
                let lockAmount4 = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(
                        farming.address,
                        lockAmount1.add(lockAmount2).add(lockAmount3).add(lockAmount4)
                    );

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate1 = await farming.dailyRate();
                // 9%
                let rate2 = rate1.mul(3);
                // 36%
                let rate3 = rate2.mul(4);

                let oneDay = 3600 * 24;
                let oneHour = 3600;

                // Wait 1 hour and change rate
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate2);

                // Wait 1 hour and change lock
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount2);

                // Wait 1 hour and change lock again
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount3);

                // Wait 1 hour and change rate again
                await time.increase(oneHour - 1);

                await farming.setDailyRate(rate3);

                // Wait 1 hour and change lock again
                await time.increase(oneHour - 1);

                await farming.connect(clientAcc1).lock(lockAmount4);

                // Wait another 1 hour and recalculate reward
                await time.increase(oneHour);

                let expectedReward1 = calculateReward(
                    initAmount,
                    rate1,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward2 = calculateReward(
                    initAmount.sub(expectedReward1),
                    rate2,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(1)
                ).div("24");
                let expectedReward3 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2),
                    rate2,
                    lockAmount1.add(lockAmount2),
                    lockAmount1.add(lockAmount2),
                    math.bignumber(1)
                ).div("24");
                let expectedReward4 = calculateReward(
                    initAmount.sub(expectedReward1).sub(expectedReward2).sub(expectedReward3),
                    rate2,
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                ).div("24");
                let expectedReward5 = calculateReward(
                    initAmount
                        .sub(expectedReward1)
                        .sub(expectedReward2)
                        .sub(expectedReward3)
                        .sub(expectedReward4),
                    rate3,
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    lockAmount1.add(lockAmount2).add(lockAmount3),
                    math.bignumber(1)
                ).div("24");
                let expectedReward6 = calculateReward(
                    initAmount
                        .sub(expectedReward1)
                        .sub(expectedReward2)
                        .sub(expectedReward3)
                        .sub(expectedReward4)
                        .sub(expectedReward5),
                    rate3,
                    lockAmount1.add(lockAmount2).add(lockAmount3).add(lockAmount4),
                    lockAmount1.add(lockAmount2).add(lockAmount3).add(lockAmount4),
                    math.bignumber(1)
                ).div("24");
                let expectedRewardFull = expectedReward1
                    .add(expectedReward2)
                    .add(expectedReward3)
                    .add(expectedReward4)
                    .add(expectedReward5)
                    .add(expectedReward6);
                let reward = await farming.getReward(clientAcc1.address);
                expect(reward).to.be.closeTo(expectedRewardFull, EPSILON);
            });
        });

        describe("Long lock hold", () => {
            it("After full unlock and long wait the reward should stay the same", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount1);

                await farming.connect(clientAcc1).lock(lockAmount1);

                let oneYear = 3600 * 24 * 365;

                // Wait 1 year and unlock all tokens
                await time.increase(oneYear);
                await farming.connect(clientAcc1).unlockAll();
                let reward1 = await farming.getReward(clientAcc1.address);

                // Wait 1 year and check reward
                await time.increase(oneYear);
                let reward2 = await farming.getReward(clientAcc1.address);

                expect(reward1).to.equal(reward2);
            });
            it("Correct reward for one year of holding the same lock", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount1);

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate = await farming.dailyRate();
                let oneYear = 3600 * 24 * 365;
                let oneDay = 3600 * 24;

                // Wait 1 year and recalculate reward
                await time.increase(oneYear);
                let reward = await farming.getReward(clientAcc1.address);

                let expectedReward = calculateReward(
                    initAmount,
                    rate,
                    lockAmount1,
                    lockAmount1,
                    math.bignumber(365)
                );

                expect(reward).to.be.closeTo(expectedReward, EPSILON);
            });
        });

        describe("Rapid recalculations", () => {
            it("Reward should change during one day", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Start farming
                let transferAmount = parseEther("20");
                let lockAmount1 = parseEther("8");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, lockAmount1);

                await farming.connect(clientAcc1).lock(lockAmount1);

                let rate = await farming.dailyRate();
                let oneDay = 3600 * 24;
                let oneHour = 3600;

                let reward1 = await farming.getReward(clientAcc1.address);

                await time.increase(oneHour);

                let reward2 = await farming.getReward(clientAcc1.address);

                await time.increase(oneHour);

                let reward3 = await farming.getReward(clientAcc1.address);

                expect(reward1).not.to.equal(reward2);
                expect(reward1).not.to.equal(reward3);
                expect(reward2).not.to.equal(reward3);
            });
        });

        describe("Farm, claim, farm agaim", () => {
            it("Claim should reset farming. New farming start from scratch", async () => {
                let { core, maze, farming, vesting } = await loadFixture(deploys);

                // Lock tokens and start farming

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);
                await maze.connect(clientAcc1).approve(farming.address, transferAmount);

                await farming.connect(clientAcc1).lock(lockAmount);
                let farmingStart = await farming.farmingStart(clientAcc1.address);
                expect(farmingStart).to.equal(await time.latest());

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);

                // Unlock all tokens before claiming
                await farming.connect(clientAcc1).unlockAll();

                // Claim #1
                await expect(farming.connect(clientAcc1).claim()).to.emit(farming, "ClaimAttempt");

                // Wait for 1 year (min gap between claims)
                let oneYear = 3600 * 24 * 365;
                await time.increase(oneYear);

                await expect(farming.connect(clientAcc1).claim()).to.emit(farming, "Claimed");
                farmingStart = await farming.farmingStart(clientAcc1.address);
                expect(farmingStart).to.equal(0);

                // Do lock-claim routine again
                await farming.connect(clientAcc1).lock(lockAmount);
                farmingStart = await farming.farmingStart(clientAcc1.address);
                expect(farmingStart).to.equal(await time.latest());

                await time.increase(fiveYears);

                // Unlock all tokens before claiming
                await farming.connect(clientAcc1).unlockAll();

                // Claim #1
                await expect(farming.connect(clientAcc1).claim()).to.emit(farming, "ClaimAttempt");

                // Wait for 1 year (min gap between claims)
                await time.increase(oneYear);

                await expect(farming.connect(clientAcc1).claim()).to.emit(farming, "Claimed");
                farmingStart = await farming.farmingStart(clientAcc1.address);
                expect(farmingStart).to.equal(0);
            });
        });
    });
});
