import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function signUp() {
  const { data, error } = await supabase.auth.signUp({
    email: 'familia@test.com',
    password: 'password123'
  });
  
  if (error) {
    if (error.message.includes('already registered')) {
        // Try to log in to get the ID
        const { data: signData } = await supabase.auth.signInWithPassword({
            email: 'familia@test.com',
            password: 'password123'
        });
        if (signData?.user) {
            console.log('USER_ID:', signData.user.id);
        } else {
            console.log('Error:', error.message);
        }
    } else {
        console.log('Error:', error.message);
    }
  } else if (data?.user) {
    console.log('USER_ID:', data.user.id);
  }
}

signUp();
