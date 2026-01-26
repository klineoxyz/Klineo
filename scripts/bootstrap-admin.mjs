#!/usr/bin/env node
/**
 * KLINEO Admin Bootstrap Script
 * 
 * One-time script to promote mmxinthi@gmail.com to admin role.
 * Run after migrations: node scripts/bootstrap-admin.mjs
 * 
 * Requires:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - ADMIN_EMAIL (defaults to mmxinthi@gmail.com)
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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mmxinthi@gmail.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function bootstrapAdmin() {
  console.log(`🔧 Bootstrapping admin for: ${ADMIN_EMAIL}`);

  try {
    // Find user by email in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      process.exit(1);
    }

    const user = authUsers.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

    if (!user) {
      console.error(`❌ User not found: ${ADMIN_EMAIL}`);
      console.log('💡 User must sign up first via the app, then run this script.');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id} (${user.email})`);

    // Check current role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      process.exit(1);
    }

    if (!profile) {
      console.error('❌ Profile not found. User may not have completed signup.');
      process.exit(1);
    }

    if (profile.role === 'admin') {
      console.log('✅ User is already an admin. No action needed.');
      return;
    }

    console.log(`📝 Current role: ${profile.role}`);
    console.log(`🔄 Promoting to admin...`);

    // Update role
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Error updating role:', updateError);
      process.exit(1);
    }

    // Log audit (if audit_logs table exists)
    try {
      await supabase.from('audit_logs').insert({
        admin_id: user.id, // Self-promotion
        action_type: 'bootstrap_admin',
        entity_type: 'user',
        entity_id: user.id,
        reason: 'Initial admin bootstrap via script',
        details: { email: ADMIN_EMAIL, previous_role: profile.role, new_role: 'admin' },
      });
    } catch (auditError) {
      console.warn('⚠️  Could not create audit log (table may not exist yet):', auditError.message);
    }

    console.log('✅ Successfully promoted to admin!');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`👤 Role: admin`);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

bootstrapAdmin();
