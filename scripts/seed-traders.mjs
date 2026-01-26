#!/usr/bin/env node
/**
 * KLINEO Seed Script - Demo Traders
 * 
 * Inserts 5 demo traders with performance data for development.
 * 
 * ⚠️  NEVER RUN IN PRODUCTION
 * 
 * Run: pnpm run seed
 * 
 * Requires:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - At least one user in user_profiles (sign up via app first)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Safety check: never run in production
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Error: Seed script cannot run in production');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const demoTraders = [
  {
    display_name: 'ProTrader_XYZ',
    slug: 'protrader-xyz',
    bio: 'Professional crypto trader with 5+ years experience. Focus on BTC/ETH spot and futures.',
    exchange: 'Binance',
    roi: 24.3,
    drawdown: -8.2,
    daysActive: 156,
    followers: 342,
    winRate: 67.4,
    sharpeRatio: 1.84,
  },
  {
    display_name: 'AlphaStrategist',
    slug: 'alpha-strategist',
    bio: 'Quantitative trading strategies with focus on risk management.',
    exchange: 'Binance',
    roi: 18.7,
    drawdown: -5.4,
    daysActive: 203,
    followers: 587,
    winRate: 72.1,
    sharpeRatio: 2.14,
  },
  {
    display_name: 'QuantMaster_Pro',
    slug: 'quantmaster-pro',
    bio: 'Algorithmic trading expert specializing in high-frequency strategies.',
    exchange: 'Binance',
    roi: 31.2,
    drawdown: -12.1,
    daysActive: 89,
    followers: 198,
    winRate: 61.8,
    sharpeRatio: 1.52,
  },
  {
    display_name: 'SwingKing_Elite',
    slug: 'swingking-elite',
    bio: 'Swing trading specialist with focus on medium-term positions.',
    exchange: 'Binance',
    roi: 15.9,
    drawdown: -6.8,
    daysActive: 267,
    followers: 423,
    winRate: 69.5,
    sharpeRatio: 1.98,
  },
  {
    display_name: 'Momentum_Trader',
    slug: 'momentum-trader',
    bio: 'Momentum-based trading strategies with quick entries and exits.',
    exchange: 'Binance',
    roi: 28.4,
    drawdown: -10.3,
    daysActive: 112,
    followers: 256,
    winRate: 64.2,
    sharpeRatio: 1.67,
  },
];

async function seedTraders() {
  console.log('🌱 Starting seed script...');

  try {
    // Get first user (or use a specific user ID if needed)
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .limit(1);

    if (usersError || !users || users.length === 0) {
      console.error('❌ No users found. Please sign up via the app first.');
      process.exit(1);
    }

    const userId = users[0].id;
    console.log(`✅ Using user: ${users[0].email} (${userId})`);

    // Check if traders already exist
    const { data: existingTraders } = await supabase
      .from('traders')
      .select('slug')
      .in('slug', demoTraders.map((t) => t.slug));

    if (existingTraders && existingTraders.length > 0) {
      console.log('⚠️  Some traders already exist. Skipping duplicates...');
    }

    // Insert traders
    const tradersToInsert = demoTraders.map((trader) => ({
      user_id: userId,
      display_name: trader.display_name,
      slug: trader.slug,
      bio: trader.bio,
      exchange: trader.exchange,
      status: 'approved',
      verified_at: new Date().toISOString(),
    }));

    const { data: insertedTraders, error: tradersError } = await supabase
      .from('traders')
      .upsert(tradersToInsert, { onConflict: 'slug' })
      .select('id, slug, display_name');

    if (tradersError) {
      console.error('❌ Error inserting traders:', tradersError);
      process.exit(1);
    }

    console.log(`✅ Inserted ${insertedTraders?.length || 0} traders`);

    // Insert performance data for each trader
    const now = new Date();
    for (const trader of insertedTraders || []) {
      const traderData = demoTraders.find((t) => t.slug === trader.slug);
      if (!traderData) continue;

      // Generate performance points (last 30 days, weekly intervals)
      const performancePoints = [];
      for (let i = 4; i >= 0; i--) {
        const periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() - i * 7);
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - 7);

        // Simulate some variance in performance
        const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
        const pnlPct = traderData.roi / 5 * (1 + variance);
        const pnl = 1000 * pnlPct; // Assume $1000 base
        const volume = 10000 + Math.random() * 5000;
        const drawdownPct = traderData.drawdown * (1 + variance);

        performancePoints.push({
          trader_id: trader.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          pnl: pnl.toFixed(8),
          pnl_pct: pnlPct.toFixed(4),
          volume: volume.toFixed(8),
          drawdown_pct: drawdownPct.toFixed(4),
        });
      }

      const { error: perfError } = await supabase
        .from('trader_performance')
        .upsert(performancePoints, { onConflict: 'id' });

      if (perfError) {
        console.warn(`⚠️  Error inserting performance for ${trader.display_name}:`, perfError.message);
      } else {
        console.log(`  ✅ Added performance data for ${trader.display_name}`);
      }
    }

    console.log('✅ Seed complete!');
    console.log(`📊 Created ${insertedTraders?.length || 0} traders with performance data`);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

seedTraders();
