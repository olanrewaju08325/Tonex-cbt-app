// Unit test script for Proration Engine
import { calculateUpgradeProration } from './proration';

function runTests() {
  console.log("=== RUNNING PRORATION ENGINE TESTS ===");

  const now = new Date('2026-06-19T12:00:00Z');
  
  // Test 1: New subscription (no active subscription)
  {
    const result = calculateUpgradeProration('free', 'monthly', null, null, now);
    console.assert(result.amountToPay === 2500, "Test 1 Failed: New subscription amount should be 2500");
    console.assert(result.unusedValue === 0, "Test 1 Failed: Unused value should be 0");
    console.log("✅ Test 1 Passed: New subscription calculations correct.");
  }

  // Test 2: Upgrade from Monthly to Quarterly, exactly halfway through (15 days used, 15 days left)
  {
    const startsAt = new Date('2026-06-04T12:00:00Z'); // 15 days ago
    const expiresAt = new Date('2026-07-04T12:00:00Z'); // 15 days from now
    const result = calculateUpgradeProration('monthly', 'quarterly', startsAt, expiresAt, now);
    
    // Monthly plan is 2500. 50% unused is 1250.
    // Quarterly plan is 6500.
    // Amount to pay should be 6500 - 1250 = 5250.
    console.assert(result.unusedDays === 15, `Test 2 Failed: Unused days should be 15, got ${result.unusedDays}`);
    console.assert(result.unusedValue === 1250, `Test 2 Failed: Unused value should be 1250, got ${result.unusedValue}`);
    console.assert(result.amountToPay === 5250, `Test 2 Failed: Amount to pay should be 5250, got ${result.amountToPay}`);
    console.log("✅ Test 2 Passed: Half-used Monthly to Quarterly calculations correct.");
  }

  // Test 3: Upgrade from Monthly to Yearly, 90% through (27 days used, 3 days left)
  {
    const startsAt = new Date('2026-05-23T12:00:00Z'); // 27 days ago
    const expiresAt = new Date('2026-06-22T12:00:00Z'); // 3 days from now
    const result = calculateUpgradeProration('monthly', 'yearly', startsAt, expiresAt, now);
    
    // Monthly plan is 2500. 10% unused is 250.
    // Yearly plan is 25000.
    // Amount to pay should be 25000 - 250 = 24750.
    console.assert(result.unusedDays === 3, `Test 3 Failed: Unused days should be 3, got ${result.unusedDays}`);
    console.assert(result.unusedValue === 250, `Test 3 Failed: Unused value should be 250, got ${result.unusedValue}`);
    console.assert(result.amountToPay === 24750, `Test 3 Failed: Amount to pay should be 24750, got ${result.amountToPay}`);
    console.log("✅ Test 3 Passed: 90%-used Monthly to Yearly calculations correct.");
  }

  // Test 4: Current subscription already expired
  {
    const startsAt = new Date('2026-05-10T12:00:00Z');
    const expiresAt = new Date('2026-06-09T12:00:00Z'); // Expired 10 days ago
    const result = calculateUpgradeProration('monthly', 'quarterly', startsAt, expiresAt, now);
    
    console.assert(result.amountToPay === 6500, "Test 4 Failed: Expired subscription should not receive discount");
    console.assert(result.unusedValue === 0, "Test 4 Failed: Expired subscription unused value should be 0");
    console.log("✅ Test 4 Passed: Expired subscription handled correctly.");
  }

  console.log("=== ALL PRORATION ENGINE TESTS COMPLETED ===");
}

// Run the tests if executing via ts-node / node
if (typeof process !== 'undefined') {
  runTests();
}
