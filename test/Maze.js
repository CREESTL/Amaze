const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { Token } = require('@uniswap/sdk-core')
const { Pool, Position, nearestUsableTick } = require('@uniswap/v3-sdk')
const zeroAddress = ethers.constants.AddressZero;
const parseEther = ethers.utils.parseEther;

let BigNumber = ethers.BigNumber;

const poolFee = 3000;

const testUsdtAddress = "0x509Ee0d083DdF8AC028f2a56731412edD63223B9";

const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const uniswapV3FactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const nonFungiblePositionManagerAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

const artifacts = {
    UniswapV3Factory: require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json"),
    UniswapV3Pool: require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json'),
    NonfungiblePositionManager: require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json"),
    SwapRouter: require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"),
};

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
        let maze = await mazeFactory.deploy(
            core.address,
            swapRouterAddress,
            testUsdtAddress
        );
        await maze.deployed();

        // Set addresses of all contract into core
        await core.setMaze(maze.address);

        return {
            core,
            maze,
        };
    }

    // Deploy all contracts and configure uniswap
    async function deploysWithUniswap() {
        [ownerAcc, clientAcc1, clientAcc2] = await ethers.getSigners();
        let usdtAmountToMint = parseEther("100000");
        let mazeAmountToMint = parseEther("100000");

        // Deploy core
        let coreFactory = await ethers.getContractFactory("Core");
        let core = await coreFactory.deploy();
        await core.deployed();

        // Deploy mock USDT
        let mockTokenFactory = await ethers.getContractFactory("MockERC20");
        let mockUSDT = await mockTokenFactory.deploy();
        await mockUSDT.deployed();

        // Deploy token
        let mazeFactory = await ethers.getContractFactory("Maze");
        let maze = await mazeFactory.deploy(
            core.address,
            swapRouterAddress,
            mockUSDT.address
        );
        await maze.deployed();

        // Set addresses of all contract into core
        await core.setMaze(maze.address);

        let uniswapFactory = await ethers.getContractAt(artifacts.UniswapV3Factory.abi, uniswapV3FactoryAddress);
        await uniswapFactory.createPool(
            maze.address,
            mockUSDT.address,
            poolFee
        );

        let swapRouter = await ethers.getContractAt(artifacts.SwapRouter.abi, swapRouterAddress);

        let pool = await ethers.getContractAt(artifacts.UniswapV3Pool.abi, await uniswapFactory.getPool(maze.address, mockUSDT.address, poolFee));
        let priceSqrtX92 = Math.sqrt((usdtAmountToMint / mazeAmountToMint)) * Math.pow(2, 96);
        await pool.initialize(BigNumber.from("79228162514264337593543950336"));

        const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
            pool.tickSpacing(),
            pool.fee(),
            pool.liquidity(),
            pool.slot0(),
        ]);
        const sqrtPriceX96 = slot0[0];
        const tick = slot0[1];

        params = {
            token0: mockUSDT.address,
            token1: maze.address,
            fee: fee,
            tickLower: nearestUsableTick(tick, tickSpacing) - tickSpacing * 2,
            tickUpper: nearestUsableTick(tick, tickSpacing) + tickSpacing * 2,
            amount0Desired: usdtAmountToMint,
            amount1Desired: mazeAmountToMint,
            amount0Min: 0,
            amount1Min: 0,
            recipient: ownerAcc.address,
            deadline: Math.floor(Date.now() / 1000) + (60 * 10)
          }

        let nonFungiblePositionManager = await ethers.getContractAt(artifacts.NonfungiblePositionManager.abi, nonFungiblePositionManagerAddress);

        await maze.approve(nonFungiblePositionManager.address, mazeAmountToMint);
        await mockUSDT.mint(ownerAcc.address, usdtAmountToMint);
        await mockUSDT.approve(nonFungiblePositionManager.address, usdtAmountToMint);

        await nonFungiblePositionManager.mint(params, { gasLimit: '1000000' });

        return {
            core,
            maze,
            pool,
            mockUSDT,
            nonFungiblePositionManager,
            swapRouter,
            uniswapFactory
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
            expect(await maze.saleFeeInBP()).to.equal(300);
        });

        it("Should have correct core address", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.core()).to.equal(core.address);
        });

        it("Should have correct swapRouter address", async () => {
            let { maze, core } = await loadFixture(deploys);
            expect(await maze.swapRouter()).to.equal(swapRouterAddress);
        });

        describe("Fails", () => {
            it("Should fail to deploy with zero core address", async () => {
                let mazeFactory = await ethers.getContractFactory("Maze");
                await expect(mazeFactory.deploy(zeroAddress, swapRouterAddress, testUsdtAddress)).to.be.revertedWith(
                    "Maze: Core cannot have zero address"
                );
            });

            it("Should fail to deploy with zero swapRouter address", async () => {
                let { core } = await loadFixture(deploys);
                let mazeFactory = await ethers.getContractFactory("Maze");
                await expect(mazeFactory.deploy(core.address, zeroAddress, testUsdtAddress)).to.be.revertedWith(
                    "Maze: SwapRouter cannot have zero address"
                );
            });

            it("Should fail to deploy with zero usdt address", async () => {
                let { core } = await loadFixture(deploys);
                let mazeFactory = await ethers.getContractFactory("Maze");
                await expect(mazeFactory.deploy(core.address, swapRouterAddress, zeroAddress)).to.be.revertedWith(
                    "Maze: USDT cannot have zero address"
                );
            });
        });
    });

    describe("Modifiers", () => {
        describe("Blacklisted", () => {
            it("Should check that user is not blacklisted in transfer", async () => {
                let { maze, core } = await loadFixture(deploys);

                // Transfer tokens to client
                await maze.connect(ownerAcc).transfer(clientAcc1.address, parseEther("0.5"));
                await maze.connect(ownerAcc).transfer(clientAcc2.address, parseEther("0.5"));

                // This should work ok
                await maze.connect(clientAcc1).transfer(clientAcc2.address, parseEther("0.1"));
                await maze.connect(clientAcc2).transfer(clientAcc1.address, parseEther("0.1"));

                // Core reciever
                await core.addToBlacklist(clientAcc2.address);

                // This should fail now
                await expect(
                    maze.connect(clientAcc1).transfer(clientAcc2.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
                await expect(
                    maze.connect(clientAcc2).transfer(clientAcc1.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
            });

            it("Should check that user is not blacklisted in approve", async () => {
                let { maze, core } = await loadFixture(deploys);

                // Transfer tokens to client
                await maze.connect(ownerAcc).transfer(clientAcc1.address, parseEther("0.5"));

                // This should work ok
                await maze.connect(clientAcc1).approve(clientAcc2.address, parseEther("0.1"));
                await maze.connect(clientAcc2).approve(clientAcc1.address, parseEther("0.1"));

                // Core reciever
                await core.addToBlacklist(clientAcc1.address);

                // This should fail now
                await expect(
                    maze.connect(clientAcc1).approve(clientAcc2.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
                await expect(
                    maze.connect(clientAcc2).approve(clientAcc1.address, parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
            });

            it("Should check that user is not blacklisted in burn", async () => {
                let { maze, core } = await loadFixture(deploys);

                // Transfer tokens to client
                await maze.connect(ownerAcc).transfer(clientAcc1.address, parseEther("0.5"));

                // This should work ok
                await maze.connect(clientAcc1).burn(parseEther("0.1"));

                // Core reciever
                await core.addToBlacklist(clientAcc1.address);

                // This should fail now
                await expect(
                    maze.connect(clientAcc1).burn(parseEther("0.1"))
                ).to.be.revertedWith("Maze: Account is blacklisted");
            });
        });

        describe("Paused", () => {
            it("Should reverted if paused by not owner", async () => {
                let { maze, core } = await loadFixture(deploys);

                await expect(maze.connect(clientAcc1).pause()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });

            it("Should reverted if unpaused by not owner", async () => {
                let { maze, core } = await loadFixture(deploys);

                await expect(maze.connect(clientAcc1).unpause()).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });

            it("Should forbid any operations when contract is paused", async () => {
                let { maze, core } = await loadFixture(deploys);

                let burnAmount = parseEther("0.1");

                await maze.connect(ownerAcc).pause();

                await expect(maze.connect(ownerAcc).burn(burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).approve(clientAcc1.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).transfer(clientAcc1.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).transferFrom(clientAcc1.address, ownerAcc.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).increaseAllowance(clientAcc1.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).decreaseAllowance(clientAcc1.address, burnAmount)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).setSaleFees(100)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).addToWhitelist(clientAcc1.address)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).removeFromWhitelist(clientAcc1.address)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).addToPairlist(clientAcc1.address)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).removeFromPairlist(clientAcc1.address)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).setSaleFeeReceiver(clientAcc1.address)).to.be.revertedWith(
                    "Pausable: paused"
                );
                await expect(maze.connect(ownerAcc).setPoolFee(5)).to.be.revertedWith(
                    "Pausable: paused"
                );

                await maze.connect(ownerAcc).unpause();

                await maze.connect(ownerAcc).burn(burnAmount);
            });
        });
    });

    describe("Main functions", () => {
        describe("Approve", () => {
            it("Should approve transfer of tokens to another user", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(0);

                let transferAmount = parseEther("0.1");
                await expect(
                    maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount)
                ).to.emit(maze, "Approval");

                expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(
                    transferAmount
                );
            });

            it("Should fail to approve for zero address spender", async () => {
                let { maze, core } = await loadFixture(deploys);

                let transferAmount = parseEther("0.1");
                await expect(
                    maze.connect(ownerAcc).approve(zeroAddress, transferAmount)
                ).to.be.revertedWith("ERC20: approve to the zero address");
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
            describe("Fails", () => {
                it("Should fail to burn more tokens that user has", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let burnAmount = parseEther("1000000000000000");

                    await expect(maze.connect(ownerAcc).burn(burnAmount)).to.be.revertedWith(
                        "ERC20: burn amount exceeds balance"
                    );
                });
            });
        });

        // describe("Transfer", () => {
        //     describe("From included to included", () => {
        //         it("Should transfer tokens between two users", async () => {
        //             let { maze, core } = await loadFixture(deploys);
        //         });
        //     });
        // });

        describe("TransferFrom", () => {
            it("Should decrease allowance after transfer", async () => {
                let { maze, core } = await loadFixture(deploys);

                let transferAmount = parseEther("1");
                let feeAmount = transferAmount.div(100).mul(2);
                await maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount);

                let startAllowance = await maze.allowance(ownerAcc.address, clientAcc1.address);

                let client2StartBalance = await maze.balanceOf(clientAcc2.address);
                await maze
                    .connect(clientAcc1)
                    .transferFrom(ownerAcc.address, clientAcc2.address, transferAmount);
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

                    await maze
                        .connect(ownerAcc)
                        .increaseAllowance(clientAcc1.address, transferAmount);

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(
                        transferAmount
                    );
                });
            });
            describe("Decrease allowance", () => {
                it("Should decrease allowance", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    let transferAmount = parseEther("1");

                    await maze.connect(ownerAcc).approve(clientAcc1.address, transferAmount);

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(
                        transferAmount
                    );

                    await maze
                        .connect(ownerAcc)
                        .decreaseAllowance(clientAcc1.address, transferAmount.div(2));

                    expect(await maze.allowance(ownerAcc.address, clientAcc1.address)).to.equal(
                        transferAmount.div(2)
                    );
                });
            });
        });

        describe("Set fees", () => {
            it("Should set new sale fee percentage", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.saleFeeInBP()).to.equal(300);

                await expect(maze.connect(ownerAcc).setSaleFees(100)).to.emit(maze, "SetSaleFees");

                expect(await maze.saleFeeInBP()).to.equal(100);
            });

            describe("Fails", () => {
                it("Should fail to set to high fee", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await expect(
                        maze.connect(ownerAcc).setSaleFees(BigNumber.from("1000000000"))
                    ).to.be.revertedWith("Maze: Sale fee too high");
                });

                it("Should fail to set by not owner", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await expect(
                        maze.connect(clientAcc1).setSaleFees(100)
                    ).to.be.revertedWith("Ownable: caller is not the owner");
                });
            });
        });

        describe("Set sale fee receiver", () => {
            it("Should set new sale fee receiver", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.saleFeeReceiver()).to.equal(ownerAcc.address);

                await expect(maze.connect(ownerAcc).setSaleFeeReceiver(clientAcc1.address)).to.emit(maze, "SaleFeeReceiverChanged");

                expect(await maze.saleFeeReceiver()).to.equal(clientAcc1.address);
            });

            describe("Fails", () => {
                it("Should fail to set zero address", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await expect(
                        maze.connect(ownerAcc).setSaleFeeReceiver(zeroAddress)
                    ).to.be.revertedWith("Maze: Cannot include zero address");
                });

                it("Should fail to set by not owner", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await expect(
                        maze.connect(clientAcc1).setSaleFeeReceiver(clientAcc1.address)
                    ).to.be.revertedWith("Ownable: caller is not the owner");
                });
            });
        });

        describe("Set pool fee", () => {
            it("Should set new pool fee", async () => {
                let { maze, core } = await loadFixture(deploys);

                expect(await maze.poolFee()).to.equal(3000);

                await expect(maze.connect(ownerAcc).setPoolFee(10)).to.emit(maze, "PoolFeeChanged");

                expect(await maze.poolFee()).to.equal(10);
            });

            describe("Fails", () => {
                it("Should fail to set zero", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await expect(
                        maze.connect(ownerAcc).setPoolFee(0)
                    ).to.be.revertedWith("Maze: Cannot be zero");
                });

                it("Should fail to set by not owner", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await expect(
                        maze.connect(clientAcc1).setPoolFee(10)
                    ).to.be.revertedWith("Ownable: caller is not the owner");
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

                        await expect(
                            maze.connect(ownerAcc).addToWhitelist(clientAcc1.address)
                        ).to.be.revertedWith("Maze: Account already whitelisted");
                    });

                    it("Should fail to add to whitelist by not owner", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await expect(
                            maze.connect(clientAcc1).addToWhitelist(clientAcc1.address)
                        ).to.be.revertedWith("Ownable: caller is not the owner");
                    });
                });
            });

            describe("Remove from whitelist", () => {
                it("Should remove from whitelist", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await maze.connect(ownerAcc).addToWhitelist(clientAcc1.address);

                    expect(await maze.isWhitelisted(clientAcc1.address)).to.equal(true);

                    await expect(
                        maze.connect(ownerAcc).removeFromWhitelist(clientAcc1.address)
                    ).to.emit(maze, "RemoveFromWhitelist");

                    expect(await maze.isWhitelisted(clientAcc1.address)).to.equal(false);
                });

                describe("Fails", () => {
                    it("Should fail to add to whitelist", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await expect(
                            maze.connect(ownerAcc).removeFromWhitelist(clientAcc1.address)
                        ).to.be.revertedWith("Maze: Account not whitelisted");
                    });

                    it("Should fail to remove from whitelist by not owner", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await maze.connect(ownerAcc).addToWhitelist(clientAcc1.address);

                        await expect(
                            maze.connect(clientAcc1).removeFromWhitelist(clientAcc1.address)
                        ).to.be.revertedWith("Ownable: caller is not the owner");
                    });
                });
            });
        });

        describe("Pairlist", () => {
            describe("Add to pairlist", () => {
                it("Should add to pairlist", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    expect(await maze.isSalePair(clientAcc1.address)).to.equal(false);

                    await expect(maze.connect(ownerAcc).addToPairlist(clientAcc1.address)).to.emit(
                        maze,
                        "AddToPairlist"
                    );

                    expect(await maze.isSalePair(clientAcc1.address)).to.equal(true);
                });

                describe("Fails", () => {
                    it("Should fail to add to pairlist", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await maze.connect(ownerAcc).addToPairlist(clientAcc1.address);

                        await expect(
                            maze.connect(ownerAcc).addToPairlist(clientAcc1.address)
                        ).to.be.revertedWith("Maze: Pair already added");
                    });

                    it("Should fail to add to pairlist by not owner", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await expect(
                            maze.connect(clientAcc1).addToPairlist(clientAcc1.address)
                        ).to.be.revertedWith("Ownable: caller is not the owner");
                    });
                });
            });

            describe("Remove from pairlist", () => {
                it("Should remove from pairlist", async () => {
                    let { maze, core } = await loadFixture(deploys);

                    await maze.connect(ownerAcc).addToPairlist(clientAcc1.address);

                    expect(await maze.isSalePair(clientAcc1.address)).to.equal(true);

                    await expect(
                        maze.connect(ownerAcc).removeFromPairlist(clientAcc1.address)
                    ).to.emit(maze, "RemoveFromPairlist");

                    expect(await maze.isSalePair(clientAcc1.address)).to.equal(false);
                });

                describe("Fails", () => {
                    it("Should fail to add to pairlist", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await expect(
                            maze.connect(ownerAcc).removeFromPairlist(clientAcc1.address)
                        ).to.be.revertedWith("Maze: Pair not added");
                    });

                    it("Should fail to remove from pairlist by not owner", async () => {
                        let { maze, core } = await loadFixture(deploys);

                        await maze.connect(ownerAcc).addToPairlist(clientAcc1.address);

                        await expect(
                            maze.connect(clientAcc1).removeFromPairlist(clientAcc1.address)
                        ).to.be.revertedWith("Ownable: caller is not the owner");
                    });
                });
            });
        });

        describe("Sale fee", () => {
            describe("Get sale fee", () => {
                it("Should get sale fee", async () => {
                    let { maze, core, pool, mockUSDT, swapRouter } = await loadFixture(deploysWithUniswap);

                    await maze.setSaleFeeReceiver(clientAcc2.address);
                    await maze.addToPairlist(pool.address);
                    await maze.addToWhitelist(maze.address);

                    let amount = (await maze.balanceOf(ownerAcc.address)).div(BigNumber.from(1000000));
                    let amountToSwap = amount.div(BigNumber.from(2));
                    await maze.transfer(clientAcc1.address, amount);

                    await maze.connect(clientAcc1).approve(swapRouter.address, amountToSwap);

                    console.log("Client address: ", clientAcc1.address);
                    console.log("Swap router address: ", swapRouter.address);
                    console.log("Pool address: ", pool.address);

                    let params = {
                        tokenIn: maze.address,
                        tokenOut: mockUSDT.address,
                        fee: poolFee,
                        recipient: clientAcc1.address,
                        deadline: Math.floor(Date.now() / 1000) + (60 * 10),
                        amountIn: amountToSwap,
                        amountOutMinimum: 0,
                        sqrtPriceLimitX96: 0
                    };

                    // The call to `exactInputSingle` executes the swap.
                    await swapRouter.connect(clientAcc1).exactInputSingle(params);

                    // await maze.processSaleFees(await maze.balanceOf(maze.address));
                });
            });

            describe("Fails", () => {

            });
        });
    });
});
