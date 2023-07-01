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
let converter = 1e4;

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

        // Transfer tokens to pay rewards
        await maze
            .connect(ownerAcc)
            .transfer(farming.address, parseEther("45000000"));

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

                await expect(farming.connect(ownerAcc).setMinLockPeriod(555))
                    .not.to.be.reverted;
            });
        });
        describe("Only Vesting", () => {
            it("Should allow only vesting to lock tokens on someone's behalf", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                await expect(
                    farming
                        .connect(ownerAcc)
                        .lockOnBehalf(
                            ownerAcc.address,
                            clientAcc1.address,
                            parseEther("1")
                        )
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
                ).to.be.revertedWith("Farming: Core cannot have zero address");
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
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount);

                // Before any farming was started for the user
                let [lockedAmount1, startTime1, endTime1, reward1] =
                    await farming.getFarming(clientAcc1.address);

                expect(lockedAmount1).to.equal(0);
                expect(startTime1).to.equal(0);
                expect(endTime1).to.equal(0);
                expect(reward1).to.equal(0);

                // Lock and start farming
                await farming.connect(clientAcc1).lock(lockAmount);

                // Get info about the only one farming
                let [lockedAmount2, startTime2, endTime2, reward2] =
                    await farming.getFarming(clientAcc1.address);

                expect(lockedAmount2).to.equal(lockAmount);
                // Farming not claimed and not ended yet
                expect(endTime2).to.equal(0);
                // No rewards are assinged to user yet
                expect(reward2).to.equal(0);
            });

            describe("Fails", () => {
                it("Should fail to get farming of zero address user", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    await expect(
                        farming.getFarming(zeroAddress)
                    ).to.be.revertedWith(
                        "Farming: User cannot have zero address"
                    );
                });
            });
        });
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
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount);

                // Lock and start farming
                await farming.connect(clientAcc1).lock(lockAmount);

                let reward2 = await farming.getReward(clientAcc1.address);

                // Right after farming start reward must be zero
                expect(reward2).to.equal(0);

                // TODO add here part when reward changes (after all tests for _recalculateReward)
            });
            describe("Fails", () => {
                it("Should fail to get the reward of the zero address user", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    await expect(
                        farming.getReward(zeroAddress)
                    ).to.be.revertedWith(
                        "Farming: User cannot have zero address"
                    );
                });
            });
        });
    });

    describe("Setters", () => {
        describe("Set minimum lock period", () => {
            it("Should set new minimum lock period", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let oldPeriod = await farming.minLockPeriod();

                let period = 3600 * 24 * 365;
                await expect(
                    farming.connect(ownerAcc).setMinLockPeriod(period)
                ).to.emit(farming, "MinLockPeriodChanged");

                let newPeriod = await farming.minLockPeriod();

                expect(newPeriod).to.not.equal(oldPeriod);
                expect(newPeriod).to.equal(period);
            });
        });

        describe("Set daily rate", () => {
            it("Should set new daily rate", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let oldRate = await farming.dailyRate();

                let rate = 7500;
                await expect(
                    farming.connect(ownerAcc).setDailyRate(rate)
                ).to.emit(farming, "DailyRateChanged");

                let newRate = await farming.dailyRate();

                expect(newRate).to.not.equal(oldRate);
                expect(newRate).to.equal(rate);
            });
        });
    });

    describe("Main functions", () => {
        describe("Lock on behalf", () => {
            it("Should lock from Vesting on behalf of the user", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

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
                    vesting.startVesting(
                        to,
                        amount,
                        cliffDuration,
                        cliffUnlock,
                        claimablePeriods
                    )
                ).to.emit(farming, "LockedOnBehalf");

                let [lockedAmount, startTime, endTime, reward] =
                    await farming.getFarming(clientAcc1.address);

                expect(lockedAmount).to.equal(amount);
                // Farming not claimed and not ended yet
                expect(endTime).to.equal(0);
                // No rewards are assinged to user yet
                expect(reward).to.equal(0);

                let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                expect(ownerEndBalance).to.equal(ownerStartBalance.sub(amount));
                expect(farmingEndBalance).to.equal(
                    farmingStartBalance.add(amount)
                );
            });
            // No tests for Fails here because checks are already done in `startVesting`
        });
        describe("Lock", () => {
            it("Should lock user's tokens and start farming", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount);

                let clientStartBalance = await maze.balanceOf(
                    clientAcc1.address
                );
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await expect(
                    farming.connect(clientAcc1).lock(lockAmount)
                ).to.emit(farming, "Locked");

                let [lockedAmount2, startTime2, endTime2, reward2] =
                    await farming.getFarming(clientAcc1.address);

                expect(lockedAmount2).to.equal(lockAmount);
                // Farming not claimed and not ended yet
                expect(endTime2).to.equal(0);
                // No rewards are assinged to user yet
                expect(reward2).to.equal(0);

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                expect(clientEndBalance).to.equal(
                    clientStartBalance.sub(lockAmount)
                );
                expect(farmingEndBalance).to.equal(
                    farmingStartBalance.add(lockAmount)
                );
            });
            describe("Fails", () => {
                it("Should fail to lock zero amount", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    let transferAmount = parseEther("2");
                    let lockAmount = parseEther("0");
                    await maze
                        .connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);
                    await maze
                        .connect(clientAcc1)
                        .approve(farming.address, lockAmount);

                    await expect(
                        farming.connect(clientAcc1).lock(lockAmount)
                    ).be.revertedWith("Farming: Lock amount cannot be zero");
                });
            });
        });
        describe("Unlock", () => {
            it("Should unlock some of user's tokens", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                let unlockAmount = lockAmount.div(2);
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount);

                let clientStartBalance = await maze.balanceOf(
                    clientAcc1.address
                );
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await farming.connect(clientAcc1).lock(lockAmount);

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);
                await expect(
                    farming.connect(clientAcc1).unlock(unlockAmount)
                ).to.emit(farming, "Unlocked");

                // TODO right now there are bugs in _recalculate function.
                // so i have to user .gt(clientStartBalance) below because I dont
                // know the exact reward user should receive
                // TODO after debug of _recaulcate function use this reward in expects below
                // let expectedReward = await farming.getReward(clientAcc1.address);

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                // TODO here and in all places like that
                // expect(clientEndBalance)
                //     .to.equal(clientStartBalance
                //         .add(expectedReward));
                // expect(farmingEndBalance)
                //     .to.equal(farmingStartBalance
                //         .sub(expectedReward));
            });
            it("Should unlock all user's tokens", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount);

                let clientStartBalance = await maze.balanceOf(
                    clientAcc1.address
                );
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await farming.connect(clientAcc1).lock(lockAmount);

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);
                await expect(
                    farming.connect(clientAcc1).unlock(lockAmount)
                ).to.emit(farming, "Unlocked");

                // TODO
                let expectedReward = await farming.getReward(
                    clientAcc1.address
                );

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                // expect(clientEndBalance).to.equal(clientStartBalance.add(expectedReward));
                // expect(farmingEndBalance).to.equal(farmingStartBalance.sub(expectedReward));
            });
            describe("Fails", () => {
                it("Should fail to unlock zero amount of tokens", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    await expect(
                        farming.connect(clientAcc1).unlock(0)
                    ).to.be.revertedWith(
                        "Farming: Unlock amount cannot be zero"
                    );
                });
                it("Should fail to unlock if already unlocked", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    let transferAmount = parseEther("2");
                    let lockAmount = parseEther("1");
                    await maze
                        .connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);
                    await maze
                        .connect(clientAcc1)
                        .approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);
                    let fiveYears = 3600 * 24 * 365 * 5;
                    await time.increase(fiveYears);
                    await farming.connect(clientAcc1).unlock(lockAmount);
                    // Try to unlock one again
                    await expect(
                        farming.connect(clientAcc1).unlock(5)
                    ).to.be.revertedWith("Farming: No tokens to unlock");
                });
                it("Should fail to unlock if no lock was made", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    await expect(
                        farming.connect(clientAcc1).unlock(5)
                    ).to.be.revertedWith("Farming: No tokens to unlock");
                });
                it("Should fail to unlock more than locked", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    let transferAmount = parseEther("2");
                    let lockAmount = parseEther("1");
                    await maze
                        .connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);
                    await maze
                        .connect(clientAcc1)
                        .approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);
                    await expect(
                        farming.connect(clientAcc1).unlock(lockAmount.mul(2))
                    ).to.be.revertedWith("Farming: Unlock greater than lock");
                });
                it("Should fail to unlock too early", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    let transferAmount = parseEther("2");
                    let lockAmount = parseEther("1");
                    await maze
                        .connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);
                    await maze
                        .connect(clientAcc1)
                        .approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);

                    await expect(
                        farming.connect(clientAcc1).unlock(lockAmount)
                    ).to.be.revertedWith(
                        "Farming: Minimum lock period has not passed yet"
                    );
                });
            });
        });
        describe("Unlock all", () => {
            it("Should unlock all user's tokens", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount);

                let clientStartBalance = await maze.balanceOf(
                    clientAcc1.address
                );
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await farming.connect(clientAcc1).lock(lockAmount);

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);
                await expect(farming.connect(clientAcc1).unlockAll()).to.emit(
                    farming,
                    "Unlocked"
                );

                // TODO
                let expectedReward = await farming.getReward(
                    clientAcc1.address
                );

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                // expect(clientEndBalance).to.equal(clientStartBalance.add(expectedReward));
                // expect(farmingEndBalance).to.equal(farmingStartBalance.sub(expectedReward));
            });
        });
        describe("Unlock from Vesting", () => {
            it("Should unlock user's tokens when called from Vesting", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                let to = clientAcc1.address;
                let amount = parseEther("1");
                let cliffDuration = 3600;
                let cliffUnlock = 1000;
                let claimablePeriods = 5;

                await maze.connect(ownerAcc).approve(farming.address, amount);

                let clientStartBalance = await maze.balanceOf(
                    clientAcc1.address
                );
                let farmingStartBalance = await maze.balanceOf(farming.address);

                await expect(
                    vesting.startVesting(
                        to,
                        amount,
                        cliffDuration,
                        cliffUnlock,
                        claimablePeriods
                    )
                ).to.emit(farming, "LockedOnBehalf");

                // Claiming tokens unlocks them from farming
                await vesting.connect(clientAcc1).claimTokens();

                // TODO
                let expectedReward = await farming.getReward(
                    clientAcc1.address
                );

                let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                let farmingEndBalance = await maze.balanceOf(farming.address);

                // expect(clientEndBalance).to.equal(clientStartBalance.add(expectedReward));
                // expect(farmingEndBalance).to.equal(farmingStartBalance.sub(expectedReward));
            });
            describe("Fails", () => {
                it("Should fail to unlock if called not from Vesting", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    await expect(
                        farming
                            .connect(ownerAcc)
                            .unlockFromVesting(
                                clientAcc1.address,
                                parseEther("1")
                            )
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
            await maze
                .connect(ownerAcc)
                .transfer(clientAcc1.address, transferAmount);
            await maze.connect(clientAcc1).approve(farming.address, lockAmount);

            await farming.connect(clientAcc1).lock(lockAmount);

            let fiveYears = 3600 * 24 * 365 * 5;
            await time.increase(fiveYears);

            // Unlock all tokens before claiming
            await farming.connect(clientAcc1).unlockAll();

            // Claim #1
            // No tokens should be trasferred
            let farmingStartBalance1 = await maze.balanceOf(farming.address);
            await expect(farming.connect(clientAcc1).claim()).to.emit(
                farming,
                "ClaimAttempt"
            );
            let farmingEndBalance1 = await maze.balanceOf(farming.address);
            expect(farmingStartBalance1).to.equal(farmingEndBalance1);

            // Wait for 1 year (min gap between claims)
            let oneYear = 3600 * 24 * 365;
            await time.increase(oneYear);

            // Claim #2
            // Should transfer reward tokens
            // TODO
            // let expectedReward = await farming.getReward(clientAcc1.address);
            let clientStartBalance2 = await maze.balanceOf(clientAcc1.address);
            let farmingStartBalance2 = await maze.balanceOf(farming.address);
            await expect(farming.connect(clientAcc1).claim()).to.emit(
                farming,
                "Claimed"
            );
            let clientEndBalance2 = await maze.balanceOf(clientAcc1.address);
            let farmingEndBalance2 = await maze.balanceOf(farming.address);

            // TODO
            // expect(clientEndBalance2).to.equal(clientStartBalance2.add(expectedReward))
            // expect(farmingEndBalance2).to.equal(farmingStartBalance2.sub(expectedReward));
        });

        // TODO add other tests here after tests for recalc function
        it("Should claim different rewards", async () => {});

        describe("Fails", () => {
            it("Should fail to claim before full unlock", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                // Lock tokens and start farming

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount);

                // Lock twice to recalculate reward
                await farming.connect(clientAcc1).lock(lockAmount.div(2));
                await farming.connect(clientAcc1).lock(lockAmount.div(2));

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);

                await expect(
                    farming.connect(clientAcc1).claim()
                ).to.be.revertedWith(
                    "Farming: Unable to claim before full unlock"
                );
            });

            it("Should fail to claim second time too soon", async () => {
                let { core, maze, farming, vesting } = await loadFixture(
                    deploys
                );

                // Lock tokens and start farming

                let transferAmount = parseEther("2");
                let lockAmount = parseEther("1");
                await maze
                    .connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);
                await maze
                    .connect(clientAcc1)
                    .approve(farming.address, lockAmount);

                await farming.connect(clientAcc1).lock(lockAmount);

                let fiveYears = 3600 * 24 * 365 * 5;
                await time.increase(fiveYears);

                // Unlock all tokens before claiming
                await farming.connect(clientAcc1).unlockAll();

                // Claim #1
                let farmingStartBalance1 = await maze.balanceOf(
                    farming.address
                );
                await expect(farming.connect(clientAcc1).claim()).to.emit(
                    farming,
                    "ClaimAttempt"
                );
                let farmingEndBalance1 = await maze.balanceOf(farming.address);
                expect(farmingStartBalance1).to.equal(farmingEndBalance1);

                // Claim #2
                await expect(
                    farming.connect(clientAcc1).claim()
                ).to.be.revertedWith(
                    "Farming: Minimum interval between claimes not passed"
                );
            });
        });
    });

    describe("Internal functions", () => {
        describe("Recalculate reward", () => {

            describe("Rate changes", () => {
                it("Rate did not change since start of farming", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    // Start farming
                    
                    let transferAmount = parseEther("20");
                    let lockAmount = parseEther("8");
                    await maze
                        .connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);
                    await maze
                        .connect(clientAcc1)
                        .approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);
                    
                    let rate = await farming.dailyRate();

                    // Wait 1 day
                    let oneDay = 3600 * 24;
                    await time.increase(oneDay);

                    let expectedReward = lockAmount.mul(rate).mul(oneDay).div(converter * oneDay);
                    let reward = await farming.getReward(clientAcc1.address);
                    expect(reward).to.equal(expectedReward);

                    
                })
                it("Rate changed 1 time per day. Recalculate after 1 day", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    // Start farming
                    
                    let transferAmount = parseEther("20");
                    let lockAmount = parseEther("8");
                    await maze
                        .connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);
                    await maze
                        .connect(clientAcc1)
                        .approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);

                    // Wait half a day and change rate
                    let oneDay = 3600 * 24;
                    await time.increase(oneDay / 2);

                    let oldRate = await farming.dailyRate();
                    let newRate = oldRate.mul(3);
                    await farming.setDailyRate(newRate);

                    // Wait another half a day
                    await time.increase(oneDay / 2);

                    let expectedRewardFirstHalf = lockAmount.mul(oldRate).mul(oneDay / 2).div(converter * oneDay);
                    let expectedRewardSecondHalf = lockAmount.mul(newRate).mul(oneDay / 2).div(converter * oneDay);
                    let expectedRewardFull = expectedRewardFirstHalf.add(expectedRewardSecondHalf);
                    let reward = await farming.getReward(clientAcc1.address);
                    expect(reward).to.equal(expectedRewardFull);

                })
                it("Rate changed 3 times per day. Recalculate after 1 day", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    // Start farming
                    
                    let transferAmount = parseEther("20");
                    let lockAmount = parseEther("8");
                    await maze
                        .connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);
                    await maze
                        .connect(clientAcc1)
                        .approve(farming.address, lockAmount);

                    await farming.connect(clientAcc1).lock(lockAmount);
                    
                    let oneDay = 3600 * 24;
                    let oneHour = 3600;
                    let defaultRate = await farming.dailyRate();
                    let newRate1 = defaultRate.mul(2);
                    let newRate2 = defaultRate.mul(3);
                    let newRate3 = defaultRate.mul(4);

                    // Wait one hour and change rate (change #1)
                    await time.increase(oneHour);
                    await farming.setDailyRate(newRate1);

                    // Wait one hour and change rate (change #2)
                    await time.increase(oneHour);
                    await farming.setDailyRate(newRate2);

                    // Wait one hour and change rate (change #3)
                    await time.increase(oneHour);
                    await farming.setDailyRate(newRate3);
                    
                    // Wait 7 more hours (10 in total)
                    await time.increase(oneHour * 7);

                    let expectedReward1 = lockAmount.mul(defaultRate).mul(oneHour).div(converter * oneDay);
                    let expectedReward2 = lockAmount.mul(newRate1).mul(oneHour).div(converter * oneDay);
                    let expectedReward3 = lockAmount.mul(newRate2).mul(oneHour).div(converter * oneDay);
                    let expectedReward4 = lockAmount.mul(newRate3).mul(oneHour * 7).div(converter * oneDay);
                    let expectedRewardFull = 
                        expectedReward1
                        .add(expectedReward2)
                        .add(expectedReward3)
                        .add(expectedReward4);
                    let reward = await farming.getReward(clientAcc1.address);
                    expect(reward).to.equal(expectedRewardFull);

                })
                })
            })

            describe("Lock changes", () => {
                it("Lock changed 1 time per day. Recalculate after 1 day", async () => {
                    let { core, maze, farming, vesting } = await loadFixture(
                        deploys
                    );

                    // Start farming
                    
                    let transferAmount = parseEther("20");
                    let lockAmount1 = parseEther("8");
                    let lockAmount2 = parseEther("2");
                    await maze
                        .connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);
                    await maze
                        .connect(clientAcc1)
                        .approve(farming.address, lockAmount1.add(lockAmount2));

                    await farming.connect(clientAcc1).lock(lockAmount1);

                    let oneDay = 3600 * 24;
                    let rate = await farming.dailyRate();
                    
                    // Wait half a day and change lock
                    await time.increase(oneDay / 2);
                    await farming.connect(clientAcc1).lock(lockAmount2);

                    // Wait another half a day
                    await time.increase(oneDay / 2);

                    let expectedReward1 = lockAmount1.mul(rate).mul(oneDay / 2).div(converter * oneDay);
                    let expectedReward2 = lockAmount2.mul(rate).mul(oneDay / 2).div(converter * oneDay);
                    let expectedRewardFull = expectedReward1.add(expectedReward2);
                    let reward = await farming.getReward(clientAcc1.address);
                    expect(reward).to.equal(expectedRewardFull);


                })
                it("Lock changed 3 times per day. Recalculate after 1 day", async () => {

                })
            })
            
            describe("Rate and Lock changes", () => {
                it("In 1 day changed: rate and lock. Recalculate after 1 day", async () => {

                })
                it("In 1 day changed: lock and rate. Recalculate after 1 day", async () => {

                })
                it("In 1 day changed: lock, rate, rate, lock. Recalculate after 1 day", async () => {

                })
                it("In 3 days changed: lock, rate, rate, lock. Recalculate after 5 day", async () => {

                })
                
            })
            
            describe("Long lock hold", () => {
                it("After full unlock and long wait the reward should stay the same", async () => {

                })
                it("Correct reward for one year of holding the same lock", async () => {

                })
            })
            
            describe("Rapid recalculations", () => {
                it("Reward should not change during one day", async () => {

                })
            })
            
            describe("Rewards of multiple users", () => {
                it("Correct reward for each of two users. One has started farming earlier", async () => {
                    
                })
                
            })

            describe("Fails", () => {});
        });

        // TODO Do I need this? It's already tested in recalc
        describe("Find locked amount", () => {
            describe("Fails", () => {});
        });
});
