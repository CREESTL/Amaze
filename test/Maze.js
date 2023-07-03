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

        // Deploy core
        let coreFactory = await ethers.getContractFactory("Core");
        let core = await coreFactory.deploy();
        await core.deployed();

        // Deploy token
        let mazeFactory = await ethers.getContractFactory("Maze");
        let maze = await mazeFactory.deploy(core.address);
        await maze.deployed();

        // Set addresses of all contract into core
        await core.setMaze(maze.address);

        return {
            core,
            maze,
        };
    }

    describe("Deployment", () => {
        it("Should have a correct name", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.name()).to.equal("Maze");
        });

        it("Should have a correct symbol", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.symbol()).to.equal("MAZE");
        });

        it("Should have correct decimals", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.decimals()).to.equal(18);
        });

        it("Should have correct current supply", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.totalSupply()).to.equal(parseEther("100000000"));
        });

        it("Should have correct fee percentage", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.feeInBP()).to.equal(200);
        });

        it("Should have correct core address", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.core()).to.equal(core.address);
        });

        describe("Fails", () => {
            it("Should fail to deploy with zero core address", async () => {
                let mazeFactory = await ethers.getContractFactory("Maze");
                await expect(mazeFactory.deploy(zeroAddress)).to.be.revertedWith("Maze: Core cannot have zero address");
            });
        });
    });

    describe("Modifiers", () => {
        describe("Blacklisted", () => {
            it("Should check that user is not blacklisted", async () => {
                let { maze, core } = await loadFixture(deploys);

                // Transfer tokens to client
                await maze.connect(ownerAcc).transfer(clientAcc1.address, parseEther("0.5"));

                // This should work ok
                await maze.connect(clientAcc1).transfer(clientAcc2.address, parseEther("0.1"));

                // Core reciever
                await core.addToBlacklist(clientAcc2.address);

                // This should fail now
                await expect(
                    maze.connect(clientAcc1).transfer(clientAcc2.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
            });
        });

        describe("Paused", () => {
            it("Should forbid any operations when contract is paused", async () => {
                let { maze, core } = await loadFixture(deploys);

                let burnAmount = parseEther("0.1");

                await maze.connect(ownerAcc).burn(burnAmount);

                await maze.connect(ownerAcc).pause();

                await expect(maze.connect(ownerAcc).burn(burnAmount)).to.be.revertedWith("Pausable: paused");

                await maze.connect(ownerAcc).unpause();

                await maze.connect(ownerAcc).burn(burnAmount);
            });
        });
    });

    describe("Getters", () => {
        describe("Total fee", () => {
            it("Should return total fee", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.totalFee()).to.equal(0);

                let transferAmount = parseEther("0.1");

                await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);

                // 2% of transfer amount should be collected as fees
                let feeAmount = transferAmount.div(100).mul(2);

                expect(await maze.totalFee()).to.equal(feeAmount);
            });
        });

        describe("Balances", () => {
            describe("Included users", () => {
                // In this case after tokens transfers owner and client balance change
                // not only by transfer amount, but also bu some fee amount
                it("Should return balance of the user", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    expect(ownerStartBalance).to.equal(parseEther("100000000"));
                    expect(clientStartBalance).to.equal(parseEther("0"));

                    let transferAmount = parseEther("0.5");
                    let feeAmount = transferAmount.div(100).mul(2);

                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    // Both owner and user get distributed fees as well
                    // Owner loses transfer amount and feeAmount
                    // but recieves some share of fee amount
                    expect(ownerEndBalance).to.be.gt(ownerStartBalance.sub(transferAmount).sub(feeAmount));
                    // Client recieves whole transfer amount and some share of fees
                    expect(clientEndBalance).to.be.gt(clientStartBalance.add(transferAmount));
                });
            });
            describe("Excluded users", () => {
                // In this case after tokens transfers owner and client balance change
                // only for transfer amount without fee distribution
                it("Should return balance of the user", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    // Exclude both owner and client
                    await maze.connect(ownerAcc).excludeFromStakers(ownerAcc.address);
                    await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    expect(ownerStartBalance).to.equal(parseEther("100000000"));
                    expect(clientStartBalance).to.equal(parseEther("0"));

                    let transferAmount = parseEther("0.5");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    let feeAmount = transferAmount.div(100).mul(2);

                    // Owner looses both transfer amount and fee amount
                    // and recieves no fees
                    // He is excluded
                    expect(ownerEndBalance).to.equal(ownerStartBalance.sub(transferAmount).sub(feeAmount));

                    // Client recieves whole transfer amount and no fees
                    // He is excluded
                    expect(clientEndBalance).to.equal(clientStartBalance.add(transferAmount));
                });
            });
        });

        describe("Allowances", () => {
            it("Should return correct allowance for user", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(0);

                let transferAmount = parseEther("0.1");
                await maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount);

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(transferAmount);

                await maze.connect(ownerAcc).decreaseAllowance(clientAcc1.address, transferAmount.div(2));

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(transferAmount.div(2));
            });
        });
    });

    describe("Main functions", () => {
        describe("Approve", () => {
            it("Should approve transfer of tokens to another user", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(0);

                let transferAmount = parseEther("0.1");
                await expect(maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount)).to.emit(
                    maze,
                    "Approval"
                );

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(transferAmount);
            });

            it("Should fail to approve for zero address spender", async () => {
                let { maze, core } = await loadFixture(deploys);

                let transferAmount = parseEther("0.1");
                await expect(maze.connect(ownerAcc).approve(zeroAddress, transferAmount)).to.be.revertedWith(
                    "Maze: Approve to the zero address"
                );
            });
        });

        describe("Burn", () => {
            describe("From included accounts", () => {
                it("Should burn tokens of the user", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    // Transfer some tokens to the client
                    let transferAmount = parseEther("0.2");
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                    let startTotalSupply = await maze.totalSupply();

                    let burnAmount = parseEther("0.1");

                    await expect(maze.connect(ownerAcc).burn(burnAmount)).to.emit(maze, "Transfer");

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                    let endTotalSupply = await maze.totalSupply();

                    expect(ownerEndBalance).to.equal(ownerStartBalance.sub(burnAmount));
                    expect(endTotalSupply).to.equal(startTotalSupply.sub(burnAmount));
                    // Client's balance should not change. Burnt tokens are
                    // not distributed
                    expect(clientEndBalance).to.equal(clientStartBalance);
                    // Burnt tokens are not sent to the zero address
                    expect(await maze.balanceOf(zeroAddress)).to.equal(0);
                });
            });
            describe("From excluded accounts", () => {
                it("Should burn tokens of the user", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    // Exclude owner
                    await maze.connect(ownerAcc).excludeFromStakers(ownerAcc.address);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let startTotalSupply = await maze.totalSupply();

                    let burnAmount = parseEther("0.1");

                    await expect(maze.connect(ownerAcc).burn(burnAmount)).to.emit(maze, "Transfer");

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let endTotalSupply = await maze.totalSupply();

                    expect(ownerEndBalance).to.equal(ownerStartBalance.sub(burnAmount));
                    expect(endTotalSupply).to.equal(startTotalSupply.sub(burnAmount));
                });
            });
            describe("Fails", () => {
                it("Should fail to burn more tokens that user has", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let burnAmount = parseEther("1000000000000000");

                    await expect(maze.connect(ownerAcc).burn(burnAmount)).to.be.revertedWith(
                        "Maze: Burn amount exceeds balance"
                    );
                });
            });
        });

        describe("Transfer", () => {
            describe("From included to included", () => {
                it("Should transfer tokens between two users", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    let transferAmount = parseEther("0.1");
                    let feeAmount = transferAmount.div(100).mul(2);

                    await expect(maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount)).to.emit(
                        maze,
                        "Transfer"
                    );

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    // Owner looses both transfer amount and fee amount but
                    // recieves some share of fees
                    expect(ownerEndBalance).to.be.gt(ownerStartBalance.sub(transferAmount).sub(feeAmount));

                    // Client recieves whole transfer amount and some share of fees
                    expect(clientEndBalance).to.be.gt(clientStartBalance.add(transferAmount));
                });
            });
            describe("From included to excluded", () => {
                it("Should transfer tokens between two users", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    // Exclude client
                    await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    let transferAmount = parseEther("0.1");
                    let feeAmount = transferAmount.div(100).mul(2);

                    await expect(maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount)).to.emit(
                        maze,
                        "Transfer"
                    );

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    // Owner looses both transfer amount and fee amount but
                    // then recieves whole fee amount back, because he's
                    // the only included staker
                    expect(ownerEndBalance).to.equal(
                        ownerStartBalance
                            .sub(transferAmount)
                            .sub(feeAmount)
                            // Explicitly show it
                            .add(feeAmount)
                    );

                    // Client recieves whole transfer amount and NO fees
                    expect(clientEndBalance).to.equal(clientStartBalance.add(transferAmount));
                });
            });
            describe("From excluded to included", () => {
                it("Should transfer tokens between two users", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    // Exclude owner
                    await maze.connect(ownerAcc).excludeFromStakers(ownerAcc.address);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    let transferAmount = parseEther("0.1");
                    let feeAmount = transferAmount.div(100).mul(2);

                    await expect(maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount)).to.emit(
                        maze,
                        "Transfer"
                    );

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    // Owner looses both transfer amount and fee amount
                    // and he gets no fee shares back
                    expect(ownerEndBalance).to.equal(ownerStartBalance.sub(transferAmount).sub(feeAmount));

                    // Client recieves whole transfer amount and whole fee
                    // because he is the only staker
                    expect(clientEndBalance).to.equal(clientStartBalance.add(transferAmount).add(feeAmount));
                });
            });

            describe("From excluded to excluded", () => {
                it("Should transfer tokens between two users", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    // Exclude both accounts
                    await maze.connect(ownerAcc).excludeFromStakers(ownerAcc.address);
                    await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);

                    let ownerStartBalance = await maze.balanceOf(ownerAcc.address);
                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);

                    let transferAmount = parseEther("0.1");
                    let feeAmount = transferAmount.div(100).mul(2);

                    await expect(maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount)).to.emit(
                        maze,
                        "Transfer"
                    );

                    let ownerEndBalance = await maze.balanceOf(ownerAcc.address);
                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);

                    // Owner looses both transfer amount and fee amount
                    // and he gets no fee shares back
                    expect(ownerEndBalance).to.equal(ownerStartBalance.sub(transferAmount).sub(feeAmount));

                    // Client recieves whole transfer and no fees
                    expect(clientEndBalance).to.equal(clientStartBalance.add(transferAmount));
                });
            });

            describe("Fails", () => {
                it("Should fail to transfer if not enough tokens for the transfer", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let transferAmount = parseEther("1000000000000000");

                    await expect(
                        maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount)
                    ).to.be.revertedWith("Maze: Transfer amount exceeds balance");
                });
                it("Should fail to transfer if not enough tokens for transfer and fee for both included", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let transferAmount = parseEther("0.1");

                    // Transfer tokens from owner to client. Owner has enough tokens
                    // to pay the fee for the transfer
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);

                    // Try to transfer the same amount of tokens from client back to
                    // the owner. Client has no tokens to pay the fee
                    await expect(
                        maze.connect(clientAcc1).transfer(ownerAcc.address, transferAmount)
                    ).to.be.revertedWith("Maze: not enough tokens to pay the fee");
                });
                it("Should fail to transfer if not enough tokens for transfer and fee for both exluded", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    // Exclude both accounts
                    await maze.connect(ownerAcc).excludeFromStakers(ownerAcc.address);
                    await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);

                    let transferAmount = parseEther("0.1");

                    // Transfer tokens from owner to client. Owner has enough tokens
                    // to pay the fee for the transfer
                    await maze.connect(ownerAcc).transfer(clientAcc1.address, transferAmount);

                    // Try to transfer the same amount of tokens from client back to
                    // the owner. Client has no tokens to pay the fee
                    await expect(
                        maze.connect(clientAcc1).transfer(ownerAcc.address, transferAmount)
                    ).to.be.revertedWith("Maze: not enough tokens to pay the fee");
                });
            });
        });

        describe("TransferFrom", () => {
            it("Should decrease allowance after transfer", async () => {
                let { maze, core } = await loadFixture(deploys);

                // Exclude all accounts to make it easier
                await maze.connect(ownerAcc).excludeFromStakers(ownerAcc.address);
                await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);
                await maze.connect(ownerAcc).excludeFromStakers(clientAcc2.address);

                let transferAmount = parseEther("1");
                let feeAmount = transferAmount.div(100).mul(2);
                await maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount);

                let startAllowance = await maze.allowance(ownerAcc.address, clientAcc1.address);

                let client2StartBalance = await maze.balanceOf(clientAcc2.address);
                await maze.connect(clientAcc1).transferFrom(ownerAcc.address, clientAcc2.address, transferAmount);
                let client2EndBalance = await maze.balanceOf(clientAcc2.address);
                expect(client2EndBalance).to.equal(client2StartBalance.add(transferAmount));

                let endAllowance = await maze.allowance(ownerAcc.address, clientAcc1.address);
                expect(endAllowance).to.equal(startAllowance.sub(transferAmount));
            });
        });

        describe("Allowance", () => {
            describe("Increase allowance", () => {
                it("Should increase allowance", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let transferAmount = parseEther("1");

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(0);

                    await maze.connect(ownerAcc).increaseAllowance(clientAcc1.address, transferAmount);

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(transferAmount);
                });
            });
            describe("Decrease allowance", () => {
                it("Should decrease allowance", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let transferAmount = parseEther("1");

                    await maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount);

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(transferAmount);

                    await maze.connect(ownerAcc).decreaseAllowance(clientAcc1.address, transferAmount.div(2));

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(transferAmount.div(2));
                });
            });
        });

        describe("Set fees", () => {
            it("Should set new fee percentage", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.feeInBP()).to.equal(200);

                await expect(maze.connect(ownerAcc).setFees(100)).to.emit(maze, "SetFees");

                expect(await maze.feeInBP()).to.equal(100);
            });

            describe("Fails", () => {
                it("Should fail to set to high fee", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await expect(maze.connect(ownerAcc).setFees(BigNumber.from("1000000000"))).to.be.revertedWith(
                        "Maze: Fee too high"
                    );
                });
            });
        });

        describe("Whitelist", () => {
            describe("Add to whitelist", () => {
                it("Should add to whitelist", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    expect(await maze.isWhitelisted(clientAcc1.address)).to.equal(false);

                    await expect(maze.connect(ownerAcc).addToWhitelist(clientAcc1.address)).to.emit(
                        maze,
                        "AddToWhitelist"
                    );

                    expect(await maze.isWhitelisted(clientAcc1.address)).to.equal(true);
                });

                describe("Fails", () => {
                    it("Should fail to add to whitelist", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await maze.connect(ownerAcc).addToWhitelist(clientAcc1.address);

                        await expect(maze.connect(ownerAcc).addToWhitelist(clientAcc1.address)).to.be.revertedWith(
                            "Maze: Account already whitelisted"
                        );
                    });
                });
            });

            describe("Remove from whitelist", () => {
                it("Should remove from whitelist", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await maze.connect(ownerAcc).addToWhitelist(clientAcc1.address);

                    expect(await maze.isWhitelisted(clientAcc1.address)).to.equal(true);

                    await expect(maze.connect(ownerAcc).removeFromWhitelist(clientAcc1.address)).to.emit(
                        maze,
                        "RemoveFromWhitelist"
                    );

                    expect(await maze.isWhitelisted(clientAcc1.address)).to.equal(false);
                });

                describe("Fails", () => {
                    it("Should fail to add to whitelist", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await expect(maze.connect(ownerAcc).removeFromWhitelist(clientAcc1.address)).to.be.revertedWith(
                            "Maze: Account not whitelisted"
                        );
                    });
                });
            });
        });

        // Tests for `pause` and `unpause` were made in "Paused" section
        // Skip them here

        describe("Stakers", () => {
            describe("Exclude from stakers", () => {
                it("Should exclude account from stakers", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                    expect(await maze.isExcluded(clientAcc1.address)).to.equal(false);

                    await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);

                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                    expect(await maze.isExcluded(clientAcc1.address)).to.equal(true);

                    // User's balance doesn't change when he gets excluded
                    expect(clientEndBalance).to.equal(clientStartBalance);
                });

                describe("Fails", () => {
                    it("Should fail to exclude not included account", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);

                        await expect(maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address)).to.be.revertedWith(
                            "Maze: Account is already excluded"
                        );
                    });

                    it("Should fail to exclude zero address account", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await expect(maze.connect(ownerAcc).excludeFromStakers(zeroAddress)).to.be.revertedWith(
                            "Maze: Cannot exclude zero address"
                        );
                    });
                });
            });
            describe("Include into stakers", () => {
                it("Should include account into stakers", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await maze.connect(ownerAcc).excludeFromStakers(clientAcc1.address);

                    let clientStartBalance = await maze.balanceOf(clientAcc1.address);
                    expect(await maze.isExcluded(clientAcc1.address)).to.equal(true);

                    await expect(maze.connect(ownerAcc).includeIntoStakers(clientAcc1.address)).to.emit(
                        maze,
                        "IncludeIntoStakers"
                    );

                    let clientEndBalance = await maze.balanceOf(clientAcc1.address);
                    expect(await maze.isExcluded(clientAcc1.address)).to.equal(false);

                    // User's balance doesn't change when he gets included
                    expect(clientEndBalance).to.equal(clientStartBalance);
                });

                describe("Fails", () => {
                    it("Should fail to include already included account", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await expect(maze.connect(ownerAcc).includeIntoStakers(clientAcc1.address)).to.be.revertedWith(
                            "Maze: Account is already included"
                        );
                    });

                    it("Should fail to include zero address account", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await expect(maze.connect(ownerAcc).includeIntoStakers(zeroAddress)).to.be.revertedWith(
                            "Maze: Cannot include zero address"
                        );
                    });
                });
            });
        });
    });
});
