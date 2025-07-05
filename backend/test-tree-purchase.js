/**
 * Tree Purchase Service Test Script
 * Test the complete tree donation flow
 */

const axios = require('axios');
require('dotenv').config();

const baseURL = 'http://localhost:3000';
const testDonorAddress = '0xfb52765c16aC1760Ceb83332796271d1362139c4';
const testPrivateKey = process.env.USER_WALLET_PK;

async function testTreePurchaseFlow() {
  console.log('🌳 Testing Tree Purchase Flow\n');
  
  try {
    // Test 1: Get overall statistics (should be empty initially)
    console.log('📊 Test 1: Getting overall statistics...');
    const statsResponse = await axios.get(`${baseURL}/api/trees/stats`);
    console.log('Stats:', JSON.stringify(statsResponse.data.data.globalStats, null, 2));
    console.log('Foundation Info:', JSON.stringify(statsResponse.data.data.foundationInfo, null, 2));
    console.log('✅ Stats retrieved successfully\n');

    // Test 2: Calculate impact preview for different amounts
    console.log('🧮 Test 2: Testing impact calculations...');
    const testAmounts = [1, 5, 10, 25, 100];
    
    for (const amount of testAmounts) {
      const impactResponse = await axios.get(`${baseURL}/api/trees/impact?amount=${amount}`);
      const impact = impactResponse.data.data;
      console.log(`$${amount} USDC Impact:`, {
        trees: impact.treesPlanted,
        acres: impact.acresProtected,
        co2: impact.co2Offset,
        statement: impact.impactStatement
      });
    }
    console.log('✅ Impact calculations working\n');

    // Test 3: Check donation history (should be empty initially)
    console.log('📜 Test 3: Checking donation history...');
    const historyResponse = await axios.get(`${baseURL}/api/trees/history/${testDonorAddress}`);
    console.log('Initial History:', {
      totalDonations: historyResponse.data.data.totalDonations,
      totalAmount: historyResponse.data.data.totalAmount,
      totalTrees: historyResponse.data.data.totalTrees
    });
    console.log('✅ History retrieved successfully\n');

    // Test 4: Execute tree donations
    console.log('💰 Test 4: Executing tree donations...');
    const donationAmounts = [1, 5, 10]; // Test with different amounts
    const donationRecords = [];

    for (const amount of donationAmounts) {
      try {
        console.log(`  🌱 Donating $${amount} USDC...`);
        
        const donationResponse = await axios.post(`${baseURL}/api/trees/donate`, {
          amount: amount,
          donorAddress: testDonorAddress,
          privateKey: testPrivateKey,
          message: `Test donation of $${amount} for tree planting`
        });

        const donation = donationResponse.data.data.donation;
        const receipt = donationResponse.data.data.receipt;
        
        console.log(`     ✅ Donation ID: ${donation.id}`);
        console.log(`     🌳 Trees planted: ${donation.impact.treesPlanted}`);
        console.log(`     🌍 Acres protected: ${donation.impact.acresProtected}`);
        console.log(`     💨 CO2 offset: ${donation.impact.co2Offset} lbs`);
        console.log(`     🧾 Receipt ID: ${receipt.receiptId}`);
        console.log(`     💬 Thank you: ${receipt.thankYouMessage}`);
        
        donationRecords.push(donation);
        
        // Wait a bit between donations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`     ❌ Donation of $${amount} failed:`, error.response?.data?.message || error.message);
      }
    }
    console.log(`✅ Completed ${donationRecords.length} donations\n`);

    // Test 5: Retrieve receipts
    console.log('🧾 Test 5: Retrieving donation receipts...');
    for (const donation of donationRecords) {
      try {
        const receiptResponse = await axios.get(`${baseURL}/api/trees/receipt/${donation.id}`);
        const receipt = receiptResponse.data.data;
        
        console.log(`  Receipt ${donation.id}:`, {
          date: receipt.date,
          amount: receipt.amount,
          impact: receipt.impactStatement,
          foundation: receipt.foundationInfo.name
        });
      } catch (error) {
        console.error(`  ❌ Failed to get receipt for ${donation.id}:`, error.response?.data?.message || error.message);
      }
    }
    console.log('✅ Receipts retrieved successfully\n');

    // Test 6: Check updated donation history
    console.log('📈 Test 6: Checking updated donation history...');
    const updatedHistoryResponse = await axios.get(`${baseURL}/api/trees/history/${testDonorAddress}`);
    const updatedHistory = updatedHistoryResponse.data.data;
    
    console.log('Updated History:', {
      totalDonations: updatedHistory.totalDonations,
      totalAmount: updatedHistory.totalAmount,
      totalTrees: updatedHistory.totalTrees,
      donations: updatedHistory.donations.map(d => ({
        id: d.id,
        amount: d.amount,
        trees: d.impact.treesPlanted,
        date: new Date(d.timestamp).toLocaleDateString()
      }))
    });
    console.log('✅ Updated history retrieved successfully\n');

    // Test 7: Check updated overall statistics
    console.log('🌍 Test 7: Checking updated global statistics...');
    const updatedStatsResponse = await axios.get(`${baseURL}/api/trees/stats`);
    const updatedStats = updatedStatsResponse.data.data.globalStats;
    const recentDonations = updatedStatsResponse.data.data.recentDonations;
    
    console.log('Updated Global Stats:', {
      totalDonations: updatedStats.totalDonations,
      totalAmount: `$${updatedStats.totalAmount}`,
      totalTrees: updatedStats.totalTrees,
      totalAcres: updatedStats.totalAcres,
      totalCO2: `${updatedStats.totalCO2} lbs`,
      averageDonation: `$${updatedStats.averageDonation}`
    });
    
    console.log('Recent Donations:', recentDonations.map(d => ({
      id: d.id,
      amount: `$${d.amount}`,
      trees: d.impact.treesPlanted,
      date: new Date(d.timestamp).toLocaleDateString()
    })));
    console.log('✅ Updated stats retrieved successfully\n');

    // Test 8: Error handling tests
    console.log('🚨 Test 8: Testing error handling...');
    
    // Test invalid amount
    try {
      await axios.get(`${baseURL}/api/trees/impact?amount=invalid`);
    } catch (error) {
      console.log('  ✅ Invalid amount error handled:', error.response.data.message);
    }
    
    // Test invalid address
    try {
      await axios.get(`${baseURL}/api/trees/history/invalid_address`);
    } catch (error) {
      console.log('  ✅ Invalid address error handled:', error.response.data.message);
    }
    
    // Test non-existent receipt
    try {
      await axios.get(`${baseURL}/api/trees/receipt/NON_EXISTENT_ID`);
    } catch (error) {
      console.log('  ✅ Non-existent receipt error handled:', error.response.data.message);
    }
    
    console.log('✅ Error handling tests completed\n');

    console.log('🎉 All Tree Purchase Flow tests completed successfully!');
    console.log(`💰 Total donated: $${updatedStats.totalAmount}`);
    console.log(`🌳 Total trees planted: ${updatedStats.totalTrees}`);
    console.log(`🌍 Total acres protected: ${updatedStats.totalAcres}`);
    console.log(`💨 Total CO2 offset: ${updatedStats.totalCO2} lbs`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test individual functions
async function testImpactCalculation() {
  console.log('🧮 Testing Impact Calculation Only...\n');
  
  try {
    const testAmounts = [0.5, 1, 2.5, 5, 10, 25, 50, 100];
    
    for (const amount of testAmounts) {
      const response = await axios.get(`${baseURL}/api/trees/impact?amount=${amount}`);
      const impact = response.data.data;
      
      console.log(`$${amount} USDC → ${impact.treesPlanted} trees, ${impact.acresProtected} acres, ${impact.co2Offset} lbs CO2`);
      console.log(`  Statement: ${impact.impactStatement}`);
    }
    
    console.log('\n✅ Impact calculation test completed!');
  } catch (error) {
    console.error('❌ Impact calculation test failed:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  const testType = process.argv[2];
  
  switch (testType) {
    case 'impact':
      await testImpactCalculation();
      break;
    case 'full':
    default:
      await testTreePurchaseFlow();
      break;
  }
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testTreePurchaseFlow,
  testImpactCalculation
}; 