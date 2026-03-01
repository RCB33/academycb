import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = envContent.split('\n').reduce((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) {
            acc[key.trim()] = value.trim();
        }
        return acc;
    }, {} as Record<string, string>);

    supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
    supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
} catch (e) {
    console.error('Error reading .env.local:', e);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_USER_EMAIL = 'familia.test@academy.com';
const TEST_USER_PASSWORD = 'password123';

async function main() {
    // 1. Sign Up / Sign In
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
    });

    let user = authData.user;

    if (authError) {
        if (authError.message.includes('already registered')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD,
            });
            if (signInError) {
                console.error('Error signing in:', signInError);
                return;
            }
            user = signInData.user;
        } else {
            console.error('Error signing up:', authError);
            return;
        }
    }

    if (user) {
        console.log(`USER_ID:${user.id}`);
    } else {
        console.error('No user returned');
    }
}

main();
