import { createClient } from '@supabase/supabase-js' 
 
// REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS 
const supabaseUrl = 'https://kcqvcnqanaermhircipk.supabase.co' 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_KEY_HERE' 
 
export const supabase = createClient(supabaseUrl, supabaseKey) 
