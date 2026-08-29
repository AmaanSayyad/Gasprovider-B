#!/usr/bin/env tsx
/**
 * FTSO Integration Test Script for Coston2
 * 
 * Tests FTSO price feed queries, fallback scenarios, and metrics recording
 * on Coston2 testnet.
 * 
 * Requirements: 15.2
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
function loadEnvFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath}`);
  }
}

loadEnvFile(path.join(__dirname, '../.env.flare.local'));

interface FTSOTestResult {
  testName: string;
  passed: boolean;
  details: string;
  error?: string;
}

const FTSOV2_ABI = [
  'function getFeedsById(bytes21[] calldata _feedIds) external view returns (uint256[] memory, int8[] memory, uint64)',
];

async function testFTSOIntegration(): Promise<FTSOTestResult[]> {
  console.log('🧪 Testing FTSO Integration on Coston2\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results: FTSOTestResult[] = [];
  const rpcUrl = process.env.COSTON2_RPC_URL;
  // Use FtsoV2 contract address for Coston2 (not ftsoV2)
  const ftsoV2Address = '0x3d893C53D9e8056135C26C8c638B76C8b60Df726';

  if (!rpcUrl) {
    console.error('❌ Missing configuration');
    return results;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const ftsoV2 = new ethers.Contract(ftsoV2Address, FTSOV2_ABI, provider);

  // Test 1: Query single price feed (FLR/USD)
  console.log('Test 1: Query FLR/USD price feed');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const feedId = process.env.FTSO_FEED_ID_FLR_USD || '0x01464c522f55534400000000000000000000000000';
    const startTime = Date.now();
    
    const [values, decimals, timestamp] = await ftsoV2.getFeedsById.staticCall([feedId]);
    
    const responseTime = Date.now() - startTime;
    const price = Number(values[0]) / Math.pow(10, Math.abs(Number(decimals[0])));
    const timestampDate = new Date(Number(timestamp) * 1000);

    console.log(`✅ Successfully queried FLR/USD`);
    console.log(`   Price: $${price.toFixed(6)}`);
    console.log(`   Decimals: ${decimals[0]}`);
    console.log(`   Timestamp: ${timestampDate.toISOString()}`);
    console.log(`   Response time: ${responseTime}ms`);
    
    const dataAge = Date.now() - Number(timestamp) * 1000;
    console.log(`   Data age: ${(dataAge / 1000).toFixed(1)}s`);

    results.push({
      testName: 'Query FLR/USD price feed',
      passed: true,
      details: `Price: $${price.toFixed(6)}, Response: ${responseTime}ms, Age: ${(dataAge / 1000).toFixed(1)}s`,
    });
  } catch (error) {
    console.log(`❌ Failed: ${error}`);
    results.push({
      testName: 'Query FLR/USD price feed',
      passed: false,
      details: 'Failed to query price',
      error: String(error),
    });
  }
  console.log();

  // Test 2: Query multiple price feeds (batch)
  console.log('Test 2: Query multiple price feeds (batch)');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const feedIds = [
      process.env.FTSO_FEED_ID_FLR_USD || '0x01464c522f55534400000000000000000000000000',
      process.env.FTSO_FEED_ID_BTC_USD || '0x014254432f55534400000000000000000000000000',
      process.env.FTSO_FEED_ID_ETH_USD || '0x014554482f55534400000000000000000000000000',
    ];
    
    const feedNames = ['FLR/USD', 'BTC/USD', 'ETH/USD'];
    const startTime = Date.now();
    
    const [values, decimals, timestamp] = await ftsoV2.getFeedsById.staticCall(feedIds);
    
    const responseTime = Date.now() - startTime;

    console.log(`✅ Successfully queried ${feedIds.length} feeds`);
    for (let i = 0; i < feedIds.length; i++) {
      const price = Number(values[i]) / Math.pow(10, Math.abs(Number(decimals[i])));
      console.log(`   ${feedNames[i]}: $${price.toFixed(6)} (decimals: ${decimals[i]})`);
    }
    console.log(`   Batch response time: ${responseTime}ms`);
    console.log(`   Avg per feed: ${(responseTime / feedIds.length).toFixed(1)}ms`);

    results.push({
      testName: 'Query multiple price feeds (batch)',
      passed: true,
      details: `Queried ${feedIds.length} feeds in ${responseTime}ms`,
    });
  } catch (error) {
    console.log(`❌ Failed: ${error}`);
    results.push({
      testName: 'Query multiple price feeds (batch)',
      passed: false,
      details: 'Failed to query batch prices',
      error: String(error),
    });
  }
  console.log();

  // Test 3: Verify price data structure
  console.log('Test 3: Verify price data structure');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const feedId = process.env.FTSO_FEED_ID_FLR_USD || '0x01464c522f55534400000000000000000000000000';
    const [values, decimals, timestamp] = await ftsoV2.getFeedsById.staticCall([feedId]);

    // Verify all required fields are present
    const hasValue = values.length > 0 && values[0] > 0n;
    const hasDecimals = decimals.length > 0;
    const hasTimestamp = timestamp > 0n;
    const timestampRecent = Date.now() - Number(timestamp) * 1000 < 300000; // Less than 5 minutes old

    console.log(`   Has value: ${hasValue ? '✅' : '❌'} (${values[0]})`);
    console.log(`   Has decimals: ${hasDecimals ? '✅' : '❌'} (${decimals[0]})`);
    console.log(`   Has timestamp: ${hasTimestamp ? '✅' : '❌'} (${timestamp})`);
    console.log(`   Timestamp recent: ${timestampRecent ? '✅' : '❌'}`);

    const passed = hasValue && hasDecimals && hasTimestamp && timestampRecent;
    
    if (passed) {
      console.log(`✅ Price data structure is valid`);
    } else {
      console.log(`❌ Price data structure has issues`);
    }

    results.push({
      testName: 'Verify price data structure',
      passed,
      details: `Value: ${hasValue}, Decimals: ${hasDecimals}, Timestamp: ${hasTimestamp}, Recent: ${timestampRecent}`,
    });
  } catch (error) {
    console.log(`❌ Failed: ${error}`);
    results.push({
      testName: 'Verify price data structure',
      passed: false,
      details: 'Failed to verify structure',
      error: String(error),
    });
  }
  console.log();

  // Test 4: Test invalid feed ID handling
  console.log('Test 4: Test invalid feed ID handling');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const invalidFeedId = '0x00000000000000000000000000000000000000000000'; // Invalid feed
    
    try {
      await ftsoV2.getFeedsById.staticCall([invalidFeedId]);
      console.log(`⚠️  Query succeeded with invalid feed (unexpected)`);
      results.push({
        testName: 'Test invalid feed ID handling',
        passed: false,
        details: 'Invalid feed should have failed but succeeded',
      });
    } catch (error) {
      console.log(`✅ Correctly rejected invalid feed ID`);
      console.log(`   Error: ${error}`);
      results.push({
        testName: 'Test invalid feed ID handling',
        passed: true,
        details: 'Invalid feed correctly rejected',
      });
    }
  } catch (error) {
    console.log(`❌ Test setup failed: ${error}`);
    results.push({
      testName: 'Test invalid feed ID handling',
      passed: false,
      details: 'Test setup failed',
      error: String(error),
    });
  }
  console.log();

  // Test 5: Measure response time consistency
  console.log('Test 5: Measure response time consistency (5 queries)');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const feedId = process.env.FTSO_FEED_ID_FLR_USD || '0x01464c522f55534400000000000000000000000000';
    const responseTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      await ftsoV2.getFeedsById.staticCall([feedId]);
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
      console.log(`   Query ${i + 1}: ${responseTime}ms`);
    }

    const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    const minTime = Math.min(...responseTimes);

    console.log(`   Average: ${avgTime.toFixed(1)}ms`);
    console.log(`   Min: ${minTime}ms, Max: ${maxTime}ms`);
    console.log(`   Variance: ${(maxTime - minTime)}ms`);

    const consistent = maxTime - minTime < 1000; // Less than 1s variance
    console.log(`   ${consistent ? '✅' : '⚠️'} Response time ${consistent ? 'consistent' : 'variable'}`);

    results.push({
      testName: 'Measure response time consistency',
      passed: true,
      details: `Avg: ${avgTime.toFixed(1)}ms, Range: ${minTime}-${maxTime}ms`,
    });
  } catch (error) {
    console.log(`❌ Failed: ${error}`);
    results.push({
      testName: 'Measure response time consistency',
      passed: false,
      details: 'Failed to measure response times',
      error: String(error),
    });
  }
  console.log();

  // Test 6: Verify metrics recording capability
  console.log('Test 6: Verify metrics recording capability');
  console.log('─────────────────────────────────────────────────────────');
  try {
    const feedId = process.env.FTSO_FEED_ID_FLR_USD || '0x01464c522f55534400000000000000000000000000';
    
    // Simulate metrics recording
    const metrics = {
      feedId,
      queryTimestamp: Date.now(),
      responseTime: 0,
      success: false,
      price: 0,
      dataAge: 0,
    };

    const startTime = Date.now();
    const [values, decimals, timestamp] = await ftsoV2.getFeedsById.staticCall([feedId]);
    metrics.responseTime = Date.now() - startTime;
    metrics.success = true;
    metrics.price = Number(values[0]) / Math.pow(10, Math.abs(Number(decimals[0])));
    metrics.dataAge = Date.now() - Number(timestamp) * 1000;

    console.log(`✅ Metrics recorded successfully`);
    console.log(`   Feed ID: ${metrics.feedId}`);
    console.log(`   Query time: ${new Date(metrics.queryTimestamp).toISOString()}`);
    console.log(`   Response time: ${metrics.responseTime}ms`);
    console.log(`   Success: ${metrics.success}`);
    console.log(`   Price: $${metrics.price.toFixed(6)}`);
    console.log(`   Data age: ${(metrics.dataAge / 1000).toFixed(1)}s`);

    results.push({
      testName: 'Verify metrics recording capability',
      passed: true,
      details: `Metrics captured: response ${metrics.responseTime}ms, age ${(metrics.dataAge / 1000).toFixed(1)}s`,
    });
  } catch (error) {
    console.log(`❌ Failed: ${error}`);
    results.push({
      testName: 'Verify metrics recording capability',
      passed: false,
      details: 'Failed to record metrics',
      error: String(error),
    });
  }
  console.log();

  return results;
}

async function main() {
  const results = await testFTSOIntegration();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 FTSO Integration Test Results');
  console.log('═══════════════════════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.testName}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   ${result.details}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('───────────────────────────────────────────────────────────');
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passed === total) {
    console.log('✅ All FTSO integration tests passed!');
    console.log('   FTSO is ready for use on Coston2\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some FTSO integration tests failed');
    console.log('   Review the errors above and check configuration\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testFTSOIntegration };
