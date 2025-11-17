async function loadDashboard() {
    console.log('📊 Loading dashboard...');
    
    const user = checkAuth();
    if (!user) {
        console.log('❌ User not authenticated');
        return;
    }
    
    console.log('✅ User authenticated:', user);
    
    // Display user info dengan greeting yang dinamis
    displayUserInfo(user);
    
    // Load statistics
    await loadStudentStats(user);
    await loadDashboardStats(user);
}

function displayUserInfo(user) {
    const now = new Date();
    const hour = now.getHours();
    let greeting = 'Selamat Datang';
    
    if (hour < 12) greeting = 'Selamat Pagi';
    else if (hour < 15) greeting = 'Selamat Siang';
    else if (hour < 19) greeting = 'Selamat Sore';
    else greeting = 'Selamat Malam';

    document.getElementById('greetingMessage').textContent = `${greeting}, ${user.nama}!`;
    document.getElementById('welcomeMessage').textContent = `Dashboard ${user.role}`;
    document.getElementById('userName').textContent = user.nama;
    document.getElementById('userRole').textContent = user.role;
    document.getElementById('kelasDipegang').textContent = user.kelas_dipegang || '-';
    document.getElementById('mapelDipegang').textContent = user.mapel_dipegang || '-';
    
    // User info text yang lebih informatif
    let infoText = `Sistem Manajemen Kelas SDN Karangsari`;
    if (user.kelas_dipegang) {
        infoText = `Anda mengampu ${user.kelas_dipegang} - SDN Karangsari`;
    } else if (user.mapel_dipegang) {
        infoText = `Anda mengajar ${user.mapel_dipegang} - SDN Karangsari`;
    }
    document.getElementById('userInfoText').textContent = infoText;
}

async function loadStudentStats(user) {
    try {
        console.log('👥 Loading student stats...');
        
        let query = supabase.from('siswa').select('id_siswa', { count: 'exact' });
        
        if (user.role === 'Guru Kelas' && user.kelas_dipegang) {
            const kelasAngka = user.kelas_dipegang.replace('A', '');
            query = query.eq('kelas', kelasAngka);
            console.log('Filtering by class:', kelasAngka);
        }
        
        const { count, error } = await query;
        
        if (error) {
            console.error('Error loading students:', error);
        } else {
            console.log('Student count:', count);
            document.getElementById('totalSiswa').textContent = count || 0;
        }
    } catch (error) {
        console.error('Error in loadStudentStats:', error);
    }
}

async function loadDashboardStats(user) {
    // Additional stats bisa ditambahkan di sini
    console.log('Loading additional dashboard stats...');
}

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add loading animation to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});