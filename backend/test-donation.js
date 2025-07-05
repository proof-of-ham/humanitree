#!/usr/bin/env node

/**
 * Simple test script for USDC donation system
 * Tests the donation functionality with real wallet and tokens
 */

require('dotenv').config();
const { DonationHandler, quickDonate } = require('./donateUSDC');

async function testDonation() {
    console.log('🧪 Testing USDC Donation System...\n');
    
    try {
        // Configuration
        const rpcUrl = process.env.AMOY_RPC_URL;
        const privateKey = process.env.PRIVATE_KEY;
        const usdcContract = process.env.USDC_CONTRACT;
        const recipient = process.env.TEST_RECIPIENT_ADDRESS;
        
        console.log('📋 Configuration:');
        console.log(`- RPC URL: ${rpcUrl ? '✅ Set' : '❌ Missing'}`);
        console.log(`- Private Key: ${privateKey ? '✅ Set' : '❌ Missing'}`);
        console.log(`- USDC Contract: ${usdcContract}`);
        console.log(`- Recipient: ${recipient}`);
        console.log('');
        
        // Check if all required env vars are present
        if (!rpcUrl || !privateKey || !usdcContract || !recipient) {
            throw new Error('Missing required environment variables');
        }
        
        // Create donation handler
        console.log('🔧 Creating donation handler...');
        const handler = new DonationHandler();
        await handler.initialize(rpcUrl, privateKey, usdcContract);
        
        // Get wallet address from the signer
        const walletAddress = handler.signer.address;
        console.log(`👛 Wallet Address: ${walletAddress}`);
        
        // Check balances
        console.log('\n💰 Checking balances...');
        const ethBalance = await handler.getEthBalance();
        const usdcBalance = await handler.getBalance();
        
        console.log(`- POL Balance: ${ethBalance} POL`);
        console.log(`- USDC Balance: ${usdcBalance} USDC`);
        
        // Verify we have enough tokens
        if (parseFloat(ethBalance) < 0.01) {
            console.log('⚠️  Warning: Low POL balance for gas fees');
        }
        
        if (parseFloat(usdcBalance) < 1) {
            console.log('⚠️  Warning: Low USDC balance for donation');
        }
        
        // Get contract info
        console.log('\n📋 Contract Information:');
        const contractInfo = await handler.getContractInfo();
        console.log(`- Token Name: ${contractInfo.name}`);
        console.log(`- Token Symbol: ${contractInfo.symbol}`);
        console.log(`- Decimals: ${contractInfo.decimals}`);
        console.log(`- Contract Address: ${contractInfo.address}`);
        
        // Test small donation (0.1 USDC)
        console.log('\n🚀 Testing small donation (0.1 USDC)...');
        
        const donationAmount = '0.1';
        console.log(`Attempting to donate ${donationAmount} USDC to ${recipient}...`);
        
        const result = await handler.donate(recipient, donationAmount);
        
        if (result.success) {
            console.log('\n✅ Donation successful!');
            console.log(`📜 Transaction Hash: ${result.transactionHash}`);
            console.log(`💸 Amount Donated: ${result.amount} USDC`);
            console.log(`🎯 Recipient: ${result.recipient}`);
            console.log(`⛽ Gas Used: ${result.gasUsed}`);
            console.log(`🌐 Network: ${result.network}`);
            
            // Check new balances
            console.log('\n💰 New balances:');
            const newEthBalance = await handler.getEthBalance();
            const newUsdcBalance = await handler.getBalance();
            
            console.log(`- POL Balance: ${newEthBalance} POL`);
            console.log(`- USDC Balance: ${newUsdcBalance} USDC`);
            
            console.log('\n🎉 All tests passed! Your donation system is working correctly.');
        } else {
            console.error('\n❌ Donation failed:');
            console.error(`Error: ${result.error}`);
            console.error(`Error Code: ${result.errorCode}`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:');
        console.error(`Error: ${error.message}`);
        
        if (error.message.includes('insufficient funds')) {
            console.log('\n💡 Tip: You need more POL for gas fees or more USDC for donations.');
        } else if (error.message.includes('network')) {
            console.log('\n💡 Tip: Check your RPC URL and network connectivity.');
        } else if (error.message.includes('private key')) {
            console.log('\n💡 Tip: Check your private key format in .env file.');
        }
        
        process.exit(1);
    }
}

// Run the test
testDonation(); 