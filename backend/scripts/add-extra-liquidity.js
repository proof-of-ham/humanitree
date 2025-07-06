const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const MOCK_WLD_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function mint(address to, uint256 amount) returns (bool)'
];

const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

const SIMPLE_DEX_ABI = [
  'function addLiquidity(uint256 amount0, uint256 amount1, address to) external returns (uint256 liquidity)',
  'function removeLiquidity(uint256 liquidity) external returns (uint256 amount0, uint256 amount1)',
  'function swapWLDForUSDC(uint256 wldAmount, uint256 minUSDCOut, address to) external returns (uint256 usdcOut)',
  'function swapUSDCForWLD(uint256 usdcAmount, uint256 minWLDOut, address to) external returns (uint256 wldOut)',
  'function reserve0() view returns (uint256)',
  'function reserve1() view returns (uint256)',
  'function getSwapAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) view returns (uint256 amountOut)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)'
];

// Contract addresses
const mockWldAddress = '0xF99885B2C5284825e735Bc920E314dd01Ae2E17a';
const usdcAddress = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'; // Updated to user's USDC contract
const simpleDexAddress = '0x869442b25732C5FCC4c2315df4d6B09229B8B051';

// Use public Polygon Amoy RPC (no rate limits)
const rpcUrl = 'https://rpc-amoy.polygon.technology/';

async function addExtraLiquidity() {
  console.log('🏊 Adding 10 USDC + proportional WLD liquidity...');
  
  // Get private key from environment
  const privateKey = process.env.USER_WALLET_PK;
  if (!privateKey) {
    console.error('❌ Please set USER_WALLET_PK in your .env file');
    return;
  }

  try {
    // Connect to network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    
    console.log('🔗 Connected to Polygon Amoy via public RPC');
    console.log('👤 Using wallet:', signer.address);
    
    // Get contract instances
    const mockWld = new ethers.Contract(mockWldAddress, MOCK_WLD_ABI, signer);
    const usdc = new ethers.Contract(usdcAddress, USDC_ABI, signer);
    const simpleDex = new ethers.Contract(simpleDexAddress, SIMPLE_DEX_ABI, signer);
    
    // Get current pool reserves
    const wldReserve = await simpleDex.reserve0();
    const usdcReserve = await simpleDex.reserve1();
    console.log('💰 Current Pool Reserves:');
    console.log('- WLD:', ethers.formatEther(wldReserve));
    console.log('- USDC:', ethers.formatUnits(usdcReserve, 6));
    
    // Calculate proportional amounts
    const additionalUSDC = ethers.parseUnits('10', 6); // 10 USDC
    const proportionalWLD = (additionalUSDC * wldReserve) / usdcReserve;
    
    console.log('🧮 Calculating proportional amounts:');
    console.log('- Adding USDC:', ethers.formatUnits(additionalUSDC, 6));
    console.log('- Required WLD:', ethers.formatEther(proportionalWLD));
    
    // Check balances
    const wldBalance = await mockWld.balanceOf(signer.address);
    const usdcBalance = await usdc.balanceOf(signer.address);
    
    console.log('💰 Current Balances:');
    console.log('- WLD:', ethers.formatEther(wldBalance));
    console.log('- USDC:', ethers.formatUnits(usdcBalance, 6));
    
    // Check if we have enough balances
    if (wldBalance < proportionalWLD) {
      console.log('⚠️  Insufficient WLD balance. Minting required WLD...');
      const mintTx = await mockWld.mint(signer.address, proportionalWLD);
      await mintTx.wait();
      console.log('✅ Minted WLD tokens');
    }
    
    if (usdcBalance < additionalUSDC) {
      console.error('❌ Insufficient USDC balance. You need', ethers.formatUnits(additionalUSDC, 6), 'USDC');
      return;
    }
    
    // Approve tokens for the DEX
    console.log('🔓 Approving tokens for DEX...');
    
    const wldAllowance = await mockWld.allowance(signer.address, simpleDexAddress);
    if (wldAllowance < proportionalWLD) {
      console.log('- Approving WLD...');
      const approveWldTx = await mockWld.approve(simpleDexAddress, proportionalWLD);
      await approveWldTx.wait();
      console.log('✅ WLD approved');
    }
    
    const usdcAllowance = await usdc.allowance(signer.address, simpleDexAddress);
    if (usdcAllowance < additionalUSDC) {
      console.log('- Approving USDC...');
      const approveUsdcTx = await usdc.approve(simpleDexAddress, additionalUSDC);
      await approveUsdcTx.wait();
      console.log('✅ USDC approved');
    }
    
    // Add liquidity
    console.log('🏊 Adding liquidity to pool...');
    const addLiquidityTx = await simpleDex.addLiquidity(proportionalWLD, additionalUSDC, signer.address);
    console.log('⏳ Transaction submitted:', addLiquidityTx.hash);
    
    const receipt = await addLiquidityTx.wait();
    console.log('✅ Liquidity added successfully!');
    console.log('🧾 Transaction confirmed:', receipt.transactionHash);
    
    // Check new reserves
    const newWldReserve = await simpleDex.reserve0();
    const newUsdcReserve = await simpleDex.reserve1();
    console.log('🏊 New Pool Reserves:');
    console.log('- WLD:', ethers.formatEther(newWldReserve));
    console.log('- USDC:', ethers.formatUnits(newUsdcReserve, 6));
    
    // Calculate price impact improvement
    const oldPriceImpact = (10 * Number(ethers.formatUnits(usdcReserve, 6))) / (Number(ethers.formatEther(wldReserve)) + 10) * 100;
    const newPriceImpact = (10 * Number(ethers.formatUnits(newUsdcReserve, 6))) / (Number(ethers.formatEther(newWldReserve)) + 10) * 100;
    
    console.log('📊 Price Impact Improvement for 10 WLD swap:');
    console.log('- Before:', oldPriceImpact.toFixed(2) + '%');
    console.log('- After:', newPriceImpact.toFixed(2) + '%');
    console.log('- Improvement:', (oldPriceImpact - newPriceImpact).toFixed(2) + '% reduction');
    
  } catch (error) {
    console.error('❌ Error adding liquidity:', error.message);
    if (error.code === 'CALL_EXCEPTION') {
      console.error('💡 This might be due to insufficient allowance or balance');
    }
  }
}

// Run the script
if (require.main === module) {
  addExtraLiquidity();
}

module.exports = { addExtraLiquidity }; 