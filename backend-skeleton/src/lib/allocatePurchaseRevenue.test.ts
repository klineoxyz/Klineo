/**
 * Unit tests for purchase allocation math and behavior.
 * Run: pnpm test
 */
import { computeAllocationAmounts, LEVEL_PCT } from './allocatePurchaseRevenue.js';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}
function strictEqual<T>(a: T, b: T, msg: string) {
  if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`);
}

// LEVEL_PCT sums to 70%
const levelSum = LEVEL_PCT.reduce((a, b) => a + b, 0);
strictEqual(levelSum, 70, 'Level percentages must sum to 70');

// Full 7-level chain: total equals 100% of purchase (within 1 cent)
const amount1 = 1000;
const { levelAmounts, platformAmount, marketingAmount } = computeAllocationAmounts(amount1);
const referralTotal = levelAmounts.reduce((a, b) => a + b, 0);
const total = referralTotal + platformAmount + marketingAmount;
const diff = Math.abs(total - amount1);
assert(diff <= 0.01, `Total ${total} should equal amount ${amount1} within 0.01, diff=${diff}`);

// Platform is 20% of purchase (rounded to cents)
const amount2 = 100;
const { platformAmount: platform100 } = computeAllocationAmounts(amount2);
strictEqual(platform100, 20, 'Platform share of 100 should be 20');

// Level amounts use 30/20/10/8/6/4/2 weights for 70% pool
const amount3 = 1000;
const { levelAmounts: levels1000 } = computeAllocationAmounts(amount3);
strictEqual(levels1000[0], 262.5, 'L1 should be 262.50 for 1000');
strictEqual(levels1000[1], 175, 'L2 should be 175.00');
strictEqual(levels1000[6], 17.5, 'L7 should be 17.50');

// Remainder goes to marketing: odd amount totals 100%
const amount4 = 99.99;
const r4 = computeAllocationAmounts(amount4);
const total4 = r4.levelAmounts.reduce((a, b) => a + b, 0) + r4.platformAmount + r4.marketingAmount;
assert(Math.abs(total4 - 99.99) < 0.02, `Total must equal 99.99, got ${total4}`);

// Each share rounded to 2 decimals
const amount5 = 33.33;
const r5 = computeAllocationAmounts(amount5);
const all = [...r5.levelAmounts, r5.platformAmount, r5.marketingAmount];
for (const v of all) {
  const rounded = Math.round(v * 100) / 100;
  strictEqual(v, rounded, `Value ${v} should have at most 2 decimal places`);
}

console.log('All allocation tests passed.');
