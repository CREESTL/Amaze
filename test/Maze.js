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

    describe("Modifiers", () => {
        // TODO add here check for blacklisted admin
        describe("Blacklisted", () => {
            it("Should check that user is not blacklisted", async () => {
                let { maze, blacklist } = await loadFixture(
                    deploys
                );

                // Transfer tokens to client
                await maze.connect(ownerAcc)
                    .transfer(clientAcc1.address, parseEther("0.5"));

                // This should work ok
                await maze.connect(clientAcc1)
                    .transfer(clientAcc2.address, parseEther("0.1"));

                // Blacklist reciever
                await blacklist.addToBlacklist(clientAcc2.address);

                // This should fail now
                await expect(maze.connect(clientAcc1)
                    .transfer(clientAcc2.address, parseEther("0.1")))
                    .to.be.revertedWith("Maze: account is blacklisted");

            })
        })

        describe("Paused", () => {
            it("Should forbid any operations when contract is paused", async () => {
                let { maze, blacklist } = await loadFixture(
                    deploys
                );

                let burnAmount = parseEther("0.1");

                await maze.connect(ownerAcc).burn(burnAmount);

                await maze.connect(ownerAcc).pause();

                await expect(maze.connect(ownerAcc).burn(burnAmount))
                    .to.be.revertedWith("Pausable: paused");

                await maze.connect(ownerAcc).unpause();

                await maze.connect(ownerAcc).burn(burnAmount);
            })
        })
    });

    describe("Getters", () => {
        describe("Total fee", () => {
            it("Should return total fee", async () => {
                let { maze, blacklist } = await loadFixture(
                    deploys
                );

                expect(await maze.totalFee()).to.equal(0);

                let transferAmount = parseEther("0.1");

                await maze.connect(ownerAcc)
                    .transfer(clientAcc1.address, transferAmount);

                // 2% of transfer amount should be collected as fees
                let feeAmount = transferAmount.div(100).mul(2);

                expect(await maze.totalFee()).to.equal(feeAmount);
            })
        })

        describe("Balances", () => {
            describe("Included users", () => {
                // In this case after tokens transfers owner and client balance change
                // not only by transfer amount, but also bu some fee amount
                it("Should return balance of the user", async () => {
                    let { maze, blacklist } = await loadFixture(
                        deploys
                    );

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    expect(ownerStartBalance)
                        .to.equal(parseEther("100000000"));
                    expect(clientStartBalance)
                        .to.equal(parseEther("0"));

                    let transferAmount = parseEther("0.5");
                    await maze.connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    // Both owner and user get distributed fees as well
                    // TODO calculate distributed fees here precisely
                    // Owner loses transfer amount but recieves fees
                    expect(ownerEndBalance)
                        .to.be.gt(
                            ownerStartBalance
                            .sub(transferAmount)
                        );
                    expect(ownerEndBalance)
                        .to.be.lt(
                            ownerStartBalance
                        );
                    // Client recieves both transfer amount minus fees
                    expect(clientEndBalance)
                        .to.be.gt(
                            clientStartBalance
                        );
                    expect(clientEndBalance)
                        .to.be.lt(
                            clientStartBalance.add(transferAmount)
                        );
                })
            })
            describe("Excluded users", () => {
                // In this case after tokens transfers owner and client balance change
                // only for transfer amount without fee distribution
                it("Should return balance of the user", async () => {
                    let { maze, blacklist } = await loadFixture(
                        deploys
                    );

                    // Exclude both owner and client
                    await maze.connect(ownerAcc).excludeFromStakers(ownerAcc.address);
                    await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    expect(ownerStartBalance)
                        .to.equal(parseEther("100000000"));
                    expect(clientStartBalance)
                        .to.equal(parseEther("0"));

                    let transferAmount = parseEther("0.5");
                    await maze.connect(ownerAcc)
                        .transfer(clientAcc1.address, transferAmount);

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    let feeAmount = transferAmount.div(100).mul(2)

                    expect(ownerEndBalance)
                        .to.equal(ownerStartBalance.sub(transferAmount));
                    // 2% of fees get subtracted from transfer amount
                    expect(clientEndBalance)
                        .to.equal(
                            clientStartBalance
                            .add(transferAmount
                                .sub(feeAmount)
                            )
                        );

                })
            })
        })

        describe("Allowances", () => {
            it("Should return correct allowance for user", async () => {

                let { maze, blacklist } = await loadFixture(
                    deploys
                );

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address))
                    .to.equal(0);

                let transferAmount = parseEther("0.1");
                await maze.connect(ownerAcc)
                    .approve(clientAcc1.address, transferAmount);

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address))
                    .to.equal(transferAmount);

                await maze.connect(ownerAcc)
                    .decreaseAllowance(clientAcc1.address, transferAmount.div(2));

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address))
                    .to.equal(transferAmount.div(2));
            })
        })
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
