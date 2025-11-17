// Supabase Configuration - PASTIKAN INI BENAR!
const SUPABASE_URL = 'https://bdayrrfcvpxnxxlpyzes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkYXlycmZjdnB4bnh4bHB5emVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDc1NzYsImV4cCI6MjA3ODkyMzU3Nn0.jRCEWh5UEp1ACwyKKWpPRlSUVg6BbxPmtWSU70K223w';

console.log('🔧 Initializing Supabase with URL:', SUPABASE_URL);

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase initialized successfully');

// Test connection
async function testSupabaseConnection() {
    try {
        console.log('🔗 Testing Supabase connection...');
        const { data, error } = await supabase.from('guru').select('count');
        if (error) {
            console.error('❌ Supabase connection failed:', error);
            return false;
        } else {
            console.log('✅ Supabase connected successfully. Data count:', data);
            return true;
        }
    } catch (err) {
        console.error('❌ Connection test error:', err);
        return false;
    }
}

// Test connection on load
window.addEventListener('load', () => {
    setTimeout(testSupabaseConnection, 500);
});