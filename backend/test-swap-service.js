const { swapService, getSwapQuote, swapWLDtoUSDC, getPoolInfo } = require('./swapService');

/**
 * Test the SwapService functionality
 */
async function testSwapService() {
    console.log('🧪 Testing SwapService functionality...\n');
    
    try {
        // Test 1: Get pool information
        console.log('📊 Test 1: Pool Information');
        console.log('─'.repeat(40));
        const poolInfo = await getPoolInfo();
        console.log('Pool Info:', poolInfo);
        console.log('Pool Health:', poolInfo.isHealthy ? '✅ Healthy' : '❌ Unhealthy');
        console.log('');
        
        // Test 2: Get swap quotes for different amounts
        console.log('💱 Test 2: Swap Quotes');
        console.log('─'.repeat(40));
        
        const testAmounts = [1, 10, 50, 100];
        
        for (const amount of testAmounts) {
            try {
                const quote = await getSwapQuote(amount);
                console.log(`${amount} WLD → ${quote.expectedOutput} USDC (Rate: ${quote.exchangeRate})`);
                console.log(`  Price Impact: ${Number(quote.priceImpact) / 100}%`);
                console.log(`  Min Output: ${quote.minOutput} USDC (${Number(quote.slippage) / 100}% slippage)`);
            } catch (error) {
                console.log(`❌ Failed to get quote for ${amount} WLD: ${error.message}`);
            }
        }
        console.log('');
        
        // Test 3: Execute a small swap (if we have balance)
        console.log('🔄 Test 3: Execute Small Swap');
        console.log('─'.repeat(40));
        
        try {
            const swapAmount = 1; // 1 WLD
            console.log(`Attempting to swap ${swapAmount} WLD...`);
            
            const swapResult = await swapWLDtoUSDC(swapAmount);
            
            if (swapResult.success) {
                console.log('✅ Swap executed successfully!');
                console.log(`Transaction: ${swapResult.transactionHash}`);
                console.log(`WLD Used: ${swapResult.swap.inputAmount}`);
                console.log(`USDC Received: ${swapResult.swap.outputAmount}`);
                console.log(`Gas Cost: ${swapResult.transactionCost} POL`);
            } else {
                console.log('❌ Swap failed:', swapResult.error);
            }
        } catch (error) {
            console.log('❌ Swap test failed:', error.message);
        }
        console.log('');
        
        // Test 4: Gas estimation
        console.log('⛽ Test 4: Gas Estimation');
        console.log('─'.repeat(40));
        
        try {
            // Use a dummy address for gas estimation
            const dummyAddress = '0x742d35Cc6e6B5E8C1E3F34d7d5B69A5e1e2c3a4b';
            const gasEstimate = await swapService.estimateSwapGas(10, dummyAddress);
            console.log('Gas Estimate for 10 WLD swap:');
            console.log(`  Gas Limit: ${gasEstimate.gasLimit}`);
            console.log(`  With Buffer: ${gasEstimate.gasLimitWithBuffer}`);
            console.log(`  Estimated Cost: ${gasEstimate.estimatedCost} POL`);
        } catch (error) {
            console.log('❌ Gas estimation failed:', error.message);
        }
        console.log('');
        
        console.log('🎉 SwapService tests completed!');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }
}

// Test specific quote accuracy against our known pool state
async function testQuoteAccuracy() {
    console.log('\n🎯 Testing Quote Accuracy...\n');
    
    try {
        const poolInfo = await getPoolInfo();
        console.log('Current Pool State:');
        console.log(`  WLD Reserve: ${poolInfo.wldReserve}`);
        console.log(`  USDC Reserve: ${poolInfo.usdcReserve}`);
        console.log(`  Exchange Rate: ${poolInfo.exchangeRate}`);
        console.log('');
        
        // Test quote for 10 WLD
        const quote = await getSwapQuote(10);
        
        // Manual calculation using constant product formula
        const wldReserveWei = BigInt(Math.floor(parseFloat(poolInfo.wldReserve) * 1e18));
        const usdcReserveWei = BigInt(Math.floor(parseFloat(poolInfo.usdcReserve) * 1e6));
        const inputWei = BigInt(10 * 1e18);
        
        // x*y=k formula with 0.3% fee
        const feeAdjustedInput = inputWei * 997n / 1000n; // 0.3% fee
        const numerator = feeAdjustedInput * usdcReserveWei;
        const denominator = wldReserveWei * 1000n + feeAdjustedInput;
        const expectedOutputWei = numerator / denominator;
        
        const manualCalculation = Number(expectedOutputWei) / 1e6;
        const serviceQuote = parseFloat(quote.expectedOutput);
        
        console.log('Quote Accuracy Test:');
        console.log(`  Service Quote: ${serviceQuote} USDC`);
        console.log(`  Manual Calc: ${manualCalculation.toFixed(6)} USDC`);
        console.log(`  Difference: ${Math.abs(serviceQuote - manualCalculation).toFixed(6)} USDC`);
        console.log(`  Accuracy: ${((1 - Math.abs(serviceQuote - manualCalculation) / serviceQuote) * 100).toFixed(2)}%`);
        
    } catch (error) {
        console.error('❌ Quote accuracy test failed:', error);
    }
}

// Run tests
if (require.main === module) {
    testSwapService()
        .then(() => testQuoteAccuracy())
        .then(() => {
            console.log('\n✅ All tests completed!');
        })
        .catch((error) => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testSwapService, testQuoteAccuracy }; 