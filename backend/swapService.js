const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * SwapService - Handles WLD to USDC conversions using SimpleDEX
 * Designed for seamless tree donation user experience
 */
class SwapService {
    constructor() {
        // Contract addresses (from our deployment)
        this.MOCK_WLD_ADDRESS = process.env.MOCK_WLD_CONTRACT || '0xF99885B2C5284825e735Bc920E314dd01Ae2E17a';
        this.USDC_ADDRESS = '0x8B0180f2101c8260d49339abfEe87927412494B4'; // USDC on Amoy
        this.SIMPLE_DEX_ADDRESS = process.env.SIMPLE_DEX_CONTRACT || '0x869442b25732C5FCC4c2315df4d6B09229B8B051';
        
        // Initialize provider
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        
        // Load contract ABIs
        this.simpleDexABI = this.loadABI('./deployments/simple-dex-deployment.json');
        this.mockWldABI = this.loadABI('./deployments/mock-wld-deployment.json');
        
        // Simple ERC20 ABI for USDC
        this.erc20ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ];
        
        // Default settings
        this.DEFAULT_SLIPPAGE = 150; // 1.5% in basis points
        this.DEFAULT_DEADLINE = 10 * 60; // 10 minutes
    }
    
    /**
     * Load contract ABI from deployment file
     */
    loadABI(deploymentPath) {
        try {
            const fullPath = path.join(__dirname, deploymentPath);
            const deployment = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            return deployment.abi;
        } catch (error) {
            console.error(`Failed to load ABI from ${deploymentPath}:`, error);
            throw new Error(`Could not load contract ABI: ${deploymentPath}`);
        }
    }
    
    /**
     * Create a signer from private key
     */
    createSigner(privateKey = null) {
        const pk = privateKey || process.env.USER_WALLET_PK;
        if (!pk) {
            throw new Error('No private key provided');
        }
        return new ethers.Wallet(pk, this.provider);
    }
    
    /**
     * Get current pool state and health information
     */
    async getPoolInfo() {
        try {
            const simpleDex = new ethers.Contract(this.SIMPLE_DEX_ADDRESS, this.simpleDexABI, this.provider);
            
            const [reserve0, reserve1, totalLiquidity] = await Promise.all([
                simpleDex.reserve0(),
                simpleDex.reserve1(),
                simpleDex.totalLiquidity()
            ]);
            
            return {
                wldReserve: ethers.formatEther(reserve0),
                usdcReserve: ethers.formatUnits(reserve1, 6),
                totalLiquidity: ethers.formatEther(totalLiquidity),
                exchangeRate: reserve0 > 0 ? ethers.formatUnits((reserve1 * ethers.parseEther('1')) / reserve0, 6) : '0',
                k: (reserve0 * reserve1).toString(), // Convert BigInt to string for JSON serialization
                isHealthy: reserve0 > 0 && reserve1 > 0
            };
        } catch (error) {
            console.error('Failed to get pool info:', error);
            throw new Error('Could not fetch pool information');
        }
    }
    
    /**
     * Get swap quote without executing transaction
     * Perfect for UX previews in the tree donation flow
     */
    async getSwapQuote(wldAmount, slippageBasisPoints = this.DEFAULT_SLIPPAGE) {
        try {
            console.log(`🔍 Getting swap quote for ${wldAmount} WLD...`);
            
            const simpleDex = new ethers.Contract(this.SIMPLE_DEX_ADDRESS, this.simpleDexABI, this.provider);
            const wldAmountWei = ethers.parseEther(wldAmount.toString());
            
            // Get current reserves
            const [reserve0, reserve1] = await Promise.all([
                simpleDex.reserve0(),
                simpleDex.reserve1()
            ]);
            
            // Calculate expected output using SimpleDEX formula
            const expectedOutput = await simpleDex.getAmountOut(wldAmountWei, reserve0, reserve1);
            
            // Calculate minimum output with slippage protection
            const minOutput = expectedOutput * (10000n - BigInt(slippageBasisPoints)) / 10000n;
            
            // Calculate price impact (price = USDC per WLD) - handle potential BigInt issues
            const currentPrice = (reserve1 * ethers.parseEther('1')) / reserve0; // USDC per WLD
            let priceImpact = 0n;
            try {
                const newReserve0 = reserve0 + wldAmountWei;
                const newReserve1 = reserve1 - expectedOutput;
                
                // Prevent negative reserves
                if (newReserve1 > 0) {
                    const newPrice = (newReserve1 * ethers.parseEther('1')) / newReserve0;
                    priceImpact = reserve0 > 0 ? ((currentPrice - newPrice) * 10000n) / currentPrice : 0n;
                    
                    // Clamp price impact to reasonable bounds (0-100%)
                    if (priceImpact < 0n) priceImpact = 0n;
                    if (priceImpact > 10000n) priceImpact = 10000n;
                } else {
                    priceImpact = 10000n; // 100% if trade would drain pool
                }
            } catch (error) {
                console.warn('Price impact calculation failed:', error.message);
                priceImpact = 0n;
            }
            
            const quote = {
                inputAmount: wldAmount,
                inputAmountWei: wldAmountWei.toString(),
                expectedOutput: ethers.formatUnits(expectedOutput, 6),
                expectedOutputWei: expectedOutput.toString(),
                minOutput: ethers.formatUnits(minOutput, 6),
                minOutputWei: minOutput.toString(),
                exchangeRate: ethers.formatUnits(currentPrice, 6),
                priceImpact: priceImpact.toString(), // basis points
                slippage: slippageBasisPoints,
                timestamp: Date.now(),
                poolReserves: {
                    wld: ethers.formatEther(reserve0),
                    usdc: ethers.formatUnits(reserve1, 6)
                }
            };
            
            console.log('📊 Swap Quote Generated:');
            console.log(`   ${quote.inputAmount} WLD → ${quote.expectedOutput} USDC`);
            console.log(`   Rate: 1 WLD = ${quote.exchangeRate} USDC`);
            console.log(`   Price Impact: ${Number(quote.priceImpact) / 100}%`);
            
            return quote;
            
        } catch (error) {
            console.error('Failed to get swap quote:', error);
            throw new Error(`Could not generate swap quote: ${error.message}`);
        }
    }
    
    /**
     * Execute WLD to USDC swap for tree donations
     * Returns detailed transaction information for UX tracking
     */
    async swapWLDtoUSDC(wldAmount, userPrivateKey = null, slippageBasisPoints = this.DEFAULT_SLIPPAGE) {
        try {
            console.log(`🔄 Executing swap: ${wldAmount} WLD → USDC...`);
            
            // Create signer
            const signer = this.createSigner(userPrivateKey);
            console.log(`💰 Wallet: ${signer.address}`);
            
            // Get swap quote first
            const quote = await this.getSwapQuote(wldAmount, slippageBasisPoints);
            
            // Create contract instances with signer
            const mockWLD = new ethers.Contract(this.MOCK_WLD_ADDRESS, this.mockWldABI, signer);
            const usdc = new ethers.Contract(this.USDC_ADDRESS, this.erc20ABI, signer);
            const simpleDex = new ethers.Contract(this.SIMPLE_DEX_ADDRESS, this.simpleDexABI, signer);
            
            // Check user balances
            const [wldBalance, usdcBalanceBefore] = await Promise.all([
                mockWLD.balanceOf(signer.address),
                usdc.balanceOf(signer.address)
            ]);
            
            console.log(`💰 WLD Balance: ${ethers.formatEther(wldBalance)} WLD`);
            console.log(`💰 USDC Balance: ${ethers.formatUnits(usdcBalanceBefore, 6)} USDC`);
            
            // Verify sufficient balance
            if (wldBalance < ethers.parseEther(wldAmount.toString())) {
                throw new Error(`Insufficient WLD balance. Required: ${wldAmount}, Available: ${ethers.formatEther(wldBalance)}`);
            }
            
            // Check and approve WLD spending if needed
            const allowance = await mockWLD.allowance(signer.address, this.SIMPLE_DEX_ADDRESS);
            const requiredAmount = ethers.parseEther(wldAmount.toString());
            
            if (allowance < requiredAmount) {
                console.log('✅ Approving WLD spending...');
                const approveTx = await mockWLD.approve(this.SIMPLE_DEX_ADDRESS, requiredAmount);
                await approveTx.wait();
                console.log('   WLD approval confirmed');
            }
            
            // Execute swap
            console.log('🔄 Executing swap transaction...');
            const swapTx = await simpleDex.swapToken0ForToken1(
                requiredAmount,
                quote.minOutputWei,
                signer.address,
                {
                    gasLimit: 300000 // Set reasonable gas limit
                }
            );
            
            console.log(`⏳ Transaction sent: ${swapTx.hash}`);
            console.log('⏳ Waiting for confirmation...');
            
            const receipt = await swapTx.wait();
            console.log('✅ Swap completed successfully!');
            
            // Get updated balances
            const [wldBalanceAfter, usdcBalanceAfter] = await Promise.all([
                mockWLD.balanceOf(signer.address),
                usdc.balanceOf(signer.address)
            ]);
            
            const actualWldUsed = wldBalance - wldBalanceAfter;
            const actualUsdcReceived = usdcBalanceAfter - usdcBalanceBefore;
            
            const result = {
                success: true,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: ethers.formatUnits(receipt.gasPrice, 'gwei'),
                transactionCost: ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
                swap: {
                    inputAmount: ethers.formatEther(actualWldUsed),
                    outputAmount: ethers.formatUnits(actualUsdcReceived, 6),
                    expectedOutput: quote.expectedOutput,
                    slippageUsed: ((BigInt(quote.expectedOutputWei) - actualUsdcReceived) * 10000n / BigInt(quote.expectedOutputWei)).toString(),
                    effectiveRate: ethers.formatUnits(actualUsdcReceived * ethers.parseEther('1') / actualWldUsed, 6)
                },
                balances: {
                    wldBefore: ethers.formatEther(wldBalance),
                    wldAfter: ethers.formatEther(wldBalanceAfter),
                    usdcBefore: ethers.formatUnits(usdcBalanceBefore, 6),
                    usdcAfter: ethers.formatUnits(usdcBalanceAfter, 6)
                },
                timestamp: Date.now(),
                quote: quote
            };
            
            console.log('📊 Swap Results:');
            console.log(`   WLD Used: ${result.swap.inputAmount} WLD`);
            console.log(`   USDC Received: ${result.swap.outputAmount} USDC`);
            console.log(`   Effective Rate: 1 WLD = ${result.swap.effectiveRate} USDC`);
            console.log(`   Gas Cost: ${result.transactionCost} POL`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Swap failed:', error);
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }
    
    /**
     * Get transaction status for tracking donation progress
     */
    async getTransactionStatus(txHash) {
        try {
            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            if (!receipt) {
                return { status: 'pending', confirmations: 0 };
            }
            
            const currentBlock = await this.provider.getBlockNumber();
            const confirmations = currentBlock - receipt.blockNumber;
            
            return {
                status: receipt.status === 1 ? 'confirmed' : 'failed',
                confirmations,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            console.error('Failed to get transaction status:', error);
            return { status: 'error', error: error.message };
        }
    }
    
    /**
     * Estimate gas for a swap transaction
     */
    async estimateSwapGas(wldAmount, userAddress) {
        try {
            const signer = new ethers.VoidSigner(userAddress, this.provider);
            const simpleDex = new ethers.Contract(this.SIMPLE_DEX_ADDRESS, this.simpleDexABI, signer);
            const quote = await this.getSwapQuote(wldAmount);
            
            const gasEstimate = await simpleDex.swapToken0ForToken1.estimateGas(
                quote.inputAmountWei,
                quote.minOutputWei,
                userAddress
            );
            
            return {
                gasLimit: gasEstimate.toString(),
                gasLimitWithBuffer: (gasEstimate * 120n / 100n).toString(), // 20% buffer
                estimatedCost: ethers.formatEther(gasEstimate * await this.provider.getFeeData().then(f => f.gasPrice))
            };
        } catch (error) {
            console.error('Failed to estimate gas:', error);
            return {
                gasLimit: '300000', // fallback
                gasLimitWithBuffer: '360000',
                estimatedCost: '0.02' // rough estimate
            };
        }
    }
}

// Export singleton instance
const swapService = new SwapService();

// Export individual functions for easier testing
module.exports = {
    SwapService,
    swapService,
    getSwapQuote: (wldAmount, slippage) => swapService.getSwapQuote(wldAmount, slippage),
    swapWLDtoUSDC: (wldAmount, privateKey, slippage) => swapService.swapWLDtoUSDC(wldAmount, privateKey, slippage),
    getPoolInfo: () => swapService.getPoolInfo(),
    getTransactionStatus: (txHash) => swapService.getTransactionStatus(txHash),
    estimateSwapGas: (wldAmount, userAddress) => swapService.estimateSwapGas(wldAmount, userAddress)
}; 