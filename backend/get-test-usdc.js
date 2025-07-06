#!/usr/bin/env node

/**
 * Get Test USDC for Polygon Amoy Testnet
 * This script helps you get test USDC for contract: 0x8B0180f2101c8260d49339abfEe87927412494B4
 */

require('dotenv').config();
const { ethers } = require('ethers');

// Polygon Amoy testnet configuration
const POLYGON_AMOY_RPC = 'https://rpc-amoy.polygon.technology';
const USDC_CONTRACT = '0x8B0180f2101c8260d49339abfEe87927412494B4';
const USDC_DECIMALS = 6;

// Test wallet address (your address)
const TEST_WALLET_ADDRESS = '0xfb52765c16aC1760Ceb83332796271d1362139c4';

// USDC ABI for balance checking
const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
];

async function main() {
  console.log('🌍 Polygon Amoy Testnet - Test USDC Helper');
  console.log('==========================================');
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC);
  
  try {
    // Check network
    const network = await provider.getNetwork();
    console.log(`📡 Connected to: ${network.name} (Chain ID: ${network.chainId})`);
    
    // Create contract instance
    const usdcContract = new ethers.Contract(USDC_CONTRACT, USDC_ABI, provider);
    
    // Get contract info
    console.log('\n🏦 USDC Contract Information:');
    console.log(`   Address: ${USDC_CONTRACT}`);
    
    try {
      const name = await usdcContract.name();
      const symbol = await usdcContract.symbol();
      const decimals = await usdcContract.decimals();
      
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
    } catch (error) {
      console.log(`   ⚠️  Could not fetch contract details: ${error.message}`);
    }
    
    // Check wallet balance
    console.log('\n💰 Checking Wallet Balance:');
    console.log(`   Wallet: ${TEST_WALLET_ADDRESS}`);
    
    try {
      // Check MATIC balance
      const maticBalance = await provider.getBalance(TEST_WALLET_ADDRESS);
      console.log(`   MATIC Balance: ${ethers.formatEther(maticBalance)} MATIC`);
      
      // Check USDC balance
      const usdcBalance = await usdcContract.balanceOf(TEST_WALLET_ADDRESS);
      const usdcFormatted = Number(usdcBalance) / Math.pow(10, USDC_DECIMALS);
      console.log(`   USDC Balance: ${usdcFormatted} USDC`);
      
      if (usdcFormatted > 0) {
        console.log('   ✅ You already have test USDC!');
      } else {
        console.log('   ❌ No USDC found - need to get test tokens');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check balance: ${error.message}`);
    }
    
    // Display faucet information
    console.log('\n🚰 How to Get Test USDC on Polygon Amoy:');
    console.log('==========================================');
    
    console.log('\n1. Get Test MATIC (for gas fees):');
    console.log('   • Polygon Faucet: https://faucet.polygon.technology/');
    console.log('   • Alchemy Faucet: https://www.alchemy.com/faucets/polygon-amoy');
    console.log('   • Your wallet: ' + TEST_WALLET_ADDRESS);
    
    console.log('\n2. Get Test USDC:');
    console.log('   • Aave Faucet: https://app.aave.com/faucet/');
    console.log('   • Circle Faucet: https://faucet.circle.com/');
    console.log('   • Uniswap Faucet: https://faucet.quicknode.com/polygon/amoy');
    console.log('   • Your wallet: ' + TEST_WALLET_ADDRESS);
    
    console.log('\n3. Alternative - Use a DEX:');
    console.log('   • Get test USDC from Uniswap on Amoy');
    console.log('   • Swap test MATIC for test USDC');
    console.log('   • Use QuickSwap on Amoy testnet');
    
    console.log('\n4. Verify Contract on Explorer:');
    console.log(`   • Polygonscan Amoy: https://amoy.polygonscan.com/address/${USDC_CONTRACT}`);
    console.log(`   • Check if it's a legitimate USDC contract`);
    
    console.log('\n🔍 Important Notes:');
    console.log('   • Make sure you select "Polygon Amoy" network in your wallet');
    console.log('   • You need MATIC for gas fees before getting USDC');
    console.log('   • Some faucets require social media verification');
    console.log('   • Test with small amounts first');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
main().catch(console.error); 