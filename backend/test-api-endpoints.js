const axios = require('axios');

/**
 * Test all swap API endpoints
 */
async function testAPIEndpoints() {
    console.log('🧪 Testing Swap API Endpoints...\n');
    
    const baseURL = 'http://localhost:3000';
    const testAddress = '0xfb52765c16aC1760Ceb83332796271d1362139c4'; // Our test wallet
    
    try {
        // Test 1: Root endpoint
        console.log('📋 Test 1: Root Endpoint');
        console.log('─'.repeat(40));
        try {
            const response = await axios.get(`${baseURL}/`);
            console.log('✅ Root endpoint accessible');
            console.log('Available endpoints:', response.data.endpoints);
        } catch (error) {
            console.log('❌ Root endpoint failed:', error.message);
        }
        console.log('');
        
        // Test 2: Health check
        console.log('🏥 Test 2: Health Check');
        console.log('─'.repeat(40));
        try {
            const response = await axios.get(`${baseURL}/health`);
            console.log('✅ Health check passed');
            console.log('Status:', response.data.status);
            console.log('Services:', response.data.services);
        } catch (error) {
            console.log('❌ Health check failed:', error.message);
        }
        console.log('');
        
        // Test 3: Pool information
        console.log('📊 Test 3: Pool Information');
        console.log('─'.repeat(40));
        try {
            const response = await axios.get(`${baseURL}/api/swap/pool-info`);
            if (response.data.success) {
                console.log('✅ Pool info retrieved successfully');
                console.log('WLD Reserve:', response.data.data.wldReserve);
                console.log('USDC Reserve:', response.data.data.usdcReserve);
                console.log('Exchange Rate:', response.data.data.exchangeRate);
                console.log('Pool Health:', response.data.data.isHealthy ? '✅ Healthy' : '❌ Unhealthy');
            } else {
                console.log('❌ Pool info failed:', response.data.error);
            }
        } catch (error) {
            console.log('❌ Pool info request failed:', error.message);
        }
        console.log('');
        
        // Test 4: Swap quotes
        console.log('💱 Test 4: Swap Quotes');
        console.log('─'.repeat(40));
        const testAmounts = [1, 10, 50];
        
        for (const amount of testAmounts) {
            try {
                const response = await axios.get(`${baseURL}/api/swap/quote?amount=${amount}&slippage=150`);
                if (response.data.success) {
                    const quote = response.data.data;
                    console.log(`✅ Quote for ${amount} WLD: ${quote.expectedOutput} USDC`);
                    console.log(`   Rate: ${quote.exchangeRate} USDC/WLD, Impact: ${Number(quote.priceImpact) / 100}%`);
                } else {
                    console.log(`❌ Quote for ${amount} WLD failed:`, response.data.error);
                }
            } catch (error) {
                console.log(`❌ Quote request for ${amount} WLD failed:`, error.message);
            }
        }
        console.log('');
        
        // Test 5: Gas estimation
        console.log('⛽ Test 5: Gas Estimation');
        console.log('─'.repeat(40));
        try {
            const response = await axios.get(`${baseURL}/api/swap/gas-estimate?amount=10&userAddress=${testAddress}`);
            if (response.data.success) {
                const gasData = response.data.data;
                console.log('✅ Gas estimation successful');
                console.log(`Gas Limit: ${gasData.gasLimit}`);
                console.log(`With Buffer: ${gasData.gasLimitWithBuffer}`);
                console.log(`Estimated Cost: ${gasData.estimatedCost} POL`);
            } else {
                console.log('❌ Gas estimation failed:', response.data.error);
            }
        } catch (error) {
            console.log('❌ Gas estimation request failed:', error.message);
        }
        console.log('');
        
        // Test 6: Invalid requests (error handling)
        console.log('🛡️  Test 6: Error Handling');
        console.log('─'.repeat(40));
        
        // Test invalid amount
        try {
            const response = await axios.get(`${baseURL}/api/swap/quote?amount=invalid`);
            console.log('❌ Should have failed for invalid amount');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Invalid amount properly rejected');
            } else {
                console.log('❌ Unexpected error for invalid amount:', error.message);
            }
        }
        
        // Test missing amount
        try {
            const response = await axios.get(`${baseURL}/api/swap/quote`);
            console.log('❌ Should have failed for missing amount');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Missing amount properly rejected');
            } else {
                console.log('❌ Unexpected error for missing amount:', error.message);
            }
        }
        
        // Test invalid transaction hash
        try {
            const response = await axios.get(`${baseURL}/api/swap/status/invalid-hash`);
            console.log('❌ Should have failed for invalid hash');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Invalid transaction hash properly rejected');
            } else {
                console.log('❌ Unexpected error for invalid hash:', error.message);
            }
        }
        
        console.log('');
        console.log('🎉 API endpoint tests completed!');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
    }
}

// Test specific endpoint for debugging
async function testSpecificEndpoint(endpoint) {
    console.log(`🔍 Testing specific endpoint: ${endpoint}\n`);
    
    const baseURL = 'http://localhost:3000';
    
    try {
        const response = await axios.get(`${baseURL}${endpoint}`);
        console.log('✅ Response received');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Request failed');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Check if server is running
async function checkServerStatus() {
    const baseURL = 'http://localhost:3000';
    
    try {
        const response = await axios.get(`${baseURL}/health`, { timeout: 3000 });
        console.log('✅ Server is running and accessible');
        return true;
    } catch (error) {
        console.log('❌ Server is not accessible:');
        if (error.code === 'ECONNREFUSED') {
            console.log('   Server is not running. Please start with: npm start');
        } else if (error.code === 'ENOTFOUND') {
            console.log('   DNS resolution failed. Check server address.');
        } else {
            console.log('   Error:', error.message);
        }
        return false;
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // Test specific endpoint
        testSpecificEndpoint(args[0]);
    } else {
        // Full test suite
        checkServerStatus()
            .then(isRunning => {
                if (isRunning) {
                    return testAPIEndpoints();
                } else {
                    console.log('\n💡 To test the endpoints, first start the server:');
                    console.log('   cd backend && npm start');
                    console.log('\n   Then run this test again:');
                    console.log('   node test-api-endpoints.js');
                }
            })
            .catch(error => {
                console.error('❌ Test execution failed:', error);
                process.exit(1);
            });
    }
}

module.exports = { testAPIEndpoints, testSpecificEndpoint, checkServerStatus }; 