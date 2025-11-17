// Authentication functions dengan debug lengkap
async function login(username, password) {
    console.log('🔐 Attempting login for:', username, password);
    
    try {
        // Step 1: Query SEMUA data guru untuk debugging
        console.log('📊 Querying ALL users...');
        const { data: allUsers, error: allError } = await supabase
            .from('guru')
            .select('*');

        if (allError) {
            console.error('❌ Error querying all users:', allError);
            return { 
                success: false, 
                message: 'Error database: ' + allError.message 
            };
        }

        console.log('📋 ALL USERS IN DATABASE:', allUsers);
        console.log('Total users:', allUsers.length);
        
        // Tampilkan semua username dan password yang ada
        console.log('👥 Available users:', allUsers.map(u => ({
            username: u.username,
            password: u.password,
            nama: u.nama
        })));

        // Step 2: Cari user yang match
        const foundUser = allUsers.find(user => {
            const usernameMatch = user.username === username;
            const passwordMatch = user.password === password;
            console.log(`Checking user: ${user.username} - username match: ${usernameMatch}, password match: ${passwordMatch}`);
            return usernameMatch && passwordMatch;
        });

        console.log('🔍 Found user:', foundUser);

        if (!foundUser) {
            console.log('❌ No matching user found');
            console.log('Available usernames:', allUsers.map(u => u.username));
            console.log('Available passwords:', allUsers.map(u => u.password));
            return { 
                success: false, 
                message: 'Username atau password salah. Coba username: ' + allUsers.map(u => u.username).join(', ')
            };
        }

        console.log('✅ Login successful:', foundUser.nama);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(foundUser));
        localStorage.setItem('isLoggedIn', 'true');
        
        return { success: true, user: foundUser };
        
    } catch (error) {
        console.error('💥 Login error:', error);
        return { 
            success: false, 
            message: 'Terjadi kesalahan: ' + error.message 
        };
    }
}

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');
    
    console.log('🔒 Auth check - Logged in:', isLoggedIn);
    
    if (!isLoggedIn || !userData) {
        console.log('🚫 Not authenticated');
        if (!window.location.href.includes('index.html')) {
            window.location.href = '../index.html';
        }
        return null;
    }
    
    try {
        return JSON.parse(userData);
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

function logout() {
    console.log('🚪 Logging out...');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    window.location.href = '../index.html';
}