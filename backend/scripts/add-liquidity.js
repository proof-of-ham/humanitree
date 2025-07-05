const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Add initial liquidity to SimpleDEX contract
 */
async function addLiquidity() {
    console.log('💧 Adding initial liquidity to SimpleDEX...\n');
    
    // Check environment variables
    if (!process.env.RPC_URL) {
        throw new Error('RPC_URL not found in environment variables');
    }
    if (!process.env.USER_WALLET_PK) {
        throw new Error('USER_WALLET_PK not found in environment variables');
    }
    if (!process.env.MOCK_WLD_CONTRACT) {
        throw new Error('MOCK_WLD_CONTRACT not found in environment variables');
    }
    if (!process.env.SIMPLE_DEX_CONTRACT) {
        throw new Error('SIMPLE_DEX_CONTRACT not found in environment variables');
    }
    
    // Contract addresses
    const mockWldAddress = process.env.MOCK_WLD_CONTRACT;
    const usdcAddress = '0x8B0180f2101c8260d49339abfEe87927412494B4'; // USDC on Amoy
    const simpleDexAddress = process.env.SIMPLE_DEX_CONTRACT;
    
    console.log('📋 Liquidity Configuration:');
    console.log('   Mock WLD Token:', mockWldAddress);
    console.log('   USDC Token:', usdcAddress);
    console.log('   SimpleDEX Contract:', simpleDexAddress);
    console.log('');
    
    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const signer = new ethers.Wallet(process.env.USER_WALLET_PK, provider);
    
    console.log('📡 Network:', await provider.getNetwork());
    console.log('💰 Wallet:', signer.address);
    
    // Check POL balance
    const polBalance = await provider.getBalance(signer.address);
    console.log('💰 POL Balance:', ethers.formatEther(polBalance), 'POL');
    console.log('');
    
    // Load contract ABIs
    const simpleDexDeployment = JSON.parse(fs.readFileSync(path.join(__dirname, '../deployments/simple-dex-deployment.json'), 'utf8'));
    const mockWldDeployment = JSON.parse(fs.readFileSync(path.join(__dirname, '../deployments/mock-wld-deployment.json'), 'utf8'));
    
    // Create contract instances
    const mockWLD = new ethers.Contract(mockWldAddress, mockWldDeployment.abi, signer);
    const simpleDex = new ethers.Contract(simpleDexAddress, simpleDexDeployment.abi, signer);
    
    // Simple ERC20 ABI for USDC
    const erc20ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
    ];
    
    const usdc = new ethers.Contract(usdcAddress, erc20ABI, signer);
    
    // Check current token balances
    console.log('💰 Current Token Balances:');
    const wldBalance = await mockWLD.balanceOf(signer.address);
    const usdcBalance = await usdc.balanceOf(signer.address);
    console.log('   WLD:', ethers.formatEther(wldBalance), 'WLD');
    console.log('   USDC:', ethers.formatUnits(usdcBalance, 6), 'USDC');
    console.log('');
    
    // If no WLD, get some from faucet
    if (wldBalance == 0) {
        console.log('🚰 Getting WLD from faucet...');
        const faucetTx = await mockWLD.faucet();
        await faucetTx.wait();
        console.log('✅ WLD faucet claimed');
        
        // Check new balance
        const newWldBalance = await mockWLD.balanceOf(signer.address);
        console.log('   New WLD Balance:', ethers.formatEther(newWldBalance), 'WLD');
        console.log('');
    }
    
    // For demo purposes, if no USDC, we'll proceed with whatever we have
    // In a real scenario, you would need to acquire USDC from a faucet or exchange
    if (usdcBalance == 0) {
        console.log('⚠️  No USDC balance detected. For demo purposes, we\'ll add uneven liquidity.');
        console.log('   In production, you would need to acquire USDC from a faucet or exchange.');
        console.log('');
    }
    
    // Define liquidity amounts (use available balance)
    const wldAmount = ethers.parseEther('1000'); // 1000 WLD
    const availableUsdc = usdcBalance > 0 ? usdcBalance : ethers.parseUnits('0', 6);
    const usdcAmount = availableUsdc > ethers.parseUnits('1', 6) ? 
        availableUsdc - ethers.parseUnits('0.1', 6) : // Leave 0.1 USDC as buffer
        availableUsdc; // Use all if less than 1 USDC
    
    console.log('💧 Liquidity Amounts:');
    console.log('   WLD Amount:', ethers.formatEther(wldAmount), 'WLD');
    console.log('   USDC Amount:', ethers.formatUnits(usdcAmount, 6), 'USDC');
    console.log('');
    
    // Check current allowances
    console.log('🔍 Checking token allowances...');
    const wldAllowance = await mockWLD.allowance(signer.address, simpleDexAddress);
    const usdcAllowance = await usdc.allowance(signer.address, simpleDexAddress);
    console.log('   WLD Allowance:', ethers.formatEther(wldAllowance), 'WLD');
    console.log('   USDC Allowance:', ethers.formatUnits(usdcAllowance, 6), 'USDC');
    console.log('');
    
    // Approve tokens if needed
    if (wldAllowance < wldAmount) {
        console.log('✅ Approving WLD spending...');
        const approveTx = await mockWLD.approve(simpleDexAddress, wldAmount);
        await approveTx.wait();
        console.log('   WLD approved:', ethers.formatEther(wldAmount), 'WLD');
    }
    
    if (usdcAmount > 0 && usdcAllowance < usdcAmount) {
        console.log('✅ Approving USDC spending...');
        const approveTx = await usdc.approve(simpleDexAddress, usdcAmount);
        await approveTx.wait();
        console.log('   USDC approved:', ethers.formatUnits(usdcAmount, 6), 'USDC');
    }
    console.log('');
    
    // Add liquidity
    console.log('💧 Adding liquidity to SimpleDEX...');
    const addLiquidityTx = await simpleDex.addLiquidity(
        wldAmount,
        usdcAmount,
        signer.address,
        {
            gasLimit: 500000 // Set a reasonable gas limit
        }
    );
    
    console.log('⏳ Transaction sent:', addLiquidityTx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await addLiquidityTx.wait();
    console.log('✅ Liquidity added successfully!');
    console.log('');
    
    // Check pool state after adding liquidity
    console.log('🔍 Checking pool state...');
    const reserve0 = await simpleDex.reserve0();
    const reserve1 = await simpleDex.reserve1();
    const totalLiquidity = await simpleDex.totalLiquidity();
    const userLiquidity = await simpleDex.liquidity(signer.address);
    
    console.log('📊 Pool State:');
    console.log('   Reserve0 (WLD):', ethers.formatEther(reserve0), 'WLD');
    console.log('   Reserve1 (USDC):', ethers.formatUnits(reserve1, 6), 'USDC');
    console.log('   Total Liquidity:', ethers.formatEther(totalLiquidity), 'LP tokens');
    console.log('   Your Liquidity:', ethers.formatEther(userLiquidity), 'LP tokens');
    console.log('');
    
    // Calculate initial price
    if (reserve0 > 0 && reserve1 > 0) {
        const price = (reserve1 * ethers.parseUnits('1', 18)) / (reserve0 * ethers.parseUnits('1', 6));
        console.log('💰 Initial Price: 1 WLD =', ethers.formatEther(price), 'USDC');
    }
    console.log('');
    
    // Display transaction details
    console.log('📋 Transaction Details:');
    console.log('   Transaction Hash:', receipt.hash);
    console.log('   Block Number:', receipt.blockNumber);
    console.log('   Gas Used:', receipt.gasUsed.toString());
    console.log('   Gas Price:', ethers.formatUnits(receipt.gasPrice, 'gwei'), 'gwei');
    console.log('   Transaction Cost:', ethers.formatEther(receipt.gasUsed * receipt.gasPrice), 'POL');
    console.log('');
    
    return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        reserves: {
            wld: ethers.formatEther(reserve0),
            usdc: ethers.formatUnits(reserve1, 6)
        },
        liquidityTokens: {
            total: ethers.formatEther(totalLiquidity),
            user: ethers.formatEther(userLiquidity)
        }
    };
}

// Run the script
if (require.main === module) {
    addLiquidity()
        .then((result) => {
            console.log('🎉 Liquidity addition completed successfully!');
            console.log('📊 Final Pool State:');
            console.log('   WLD Reserve:', result.reserves.wld, 'WLD');
            console.log('   USDC Reserve:', result.reserves.usdc, 'USDC');
            console.log('   LP Tokens:', result.liquidityTokens.user, 'LP tokens');
        })
        .catch((error) => {
            console.error('❌ Liquidity addition failed:', error);
            process.exit(1);
        });
}

module.exports = { addLiquidity }; 