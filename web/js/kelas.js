// Manajemen Kelas Functions
let currentUser = null;

async function loadManajemenKelas() {
    console.log('👥 Loading manajemen kelas...');
    
    currentUser = checkAuth();
    if (!currentUser) return;
    
    // Display user info
    document.getElementById('userName').textContent = currentUser.nama;
    document.getElementById('userRole').textContent = currentUser.role;
    
    // Auto-select kelas untuk guru kelas
    if (currentUser.role === 'Guru Kelas' && currentUser.kelas_dipegang) {
        const kelasAngka = currentUser.kelas_dipegang.replace('A', '');
        document.getElementById('filterKelas').value = kelasAngka;
        loadSiswa();
    }
}

async function loadSiswa() {
    const selectedKelas = document.getElementById('filterKelas').value;
    
    console.log('📊 Loading siswa for kelas:', selectedKelas);
    
    try {
        let query = supabase.from('siswa').select('*');
        
        // Filter by kelas jika bukan "all"
        if (selectedKelas !== 'all') {
            query = query.eq('kelas', selectedKelas);
        }
        
        const { data: siswa, error } = await query;
        
        if (error) {
            console.error('Error loading siswa:', error);
            return;
        }
        
        console.log('Siswa loaded:', siswa);
        displaySiswa(siswa);
        updateStats(siswa, selectedKelas);
        
    } catch (error) {
        console.error('Error in loadSiswa:', error);
    }
}

function displaySiswa(siswa) {
    const tbody = document.getElementById('siswaTableBody');
    
    if (!siswa || siswa.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="padding: 40px; text-align: center; color: #718096;">
                    📝 Tidak ada data siswa untuk kelas yang dipilih
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = siswa.map(siswa => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px;">${siswa.id_siswa}</td>
            <td style="padding: 12px;">
                <strong>${siswa.nama_siswa}</strong>
            </td>
            <td style="padding: 12px;">
                ${siswa.jk === 'L' ? '👦 Laki-laki' : '👧 Perempuan'}
            </td>
            <td style="padding: 12px;">
                <span class="kelas-badge">Kelas ${siswa.kelas}</span>
            </td>
            <td style="padding: 12px;">
                <span class="status-badge ${siswa.status ? 'active' : 'inactive'}">
                    ${siswa.status ? '✅ Aktif' : '❌ Non-Aktif'}
                </span>
            </td>
            <td style="padding: 12px;">
                <button onclick="editSiswa('${siswa.id_siswa}')" class="btn-edit">
                    ✏️ Edit
                </button>
                <button onclick="deleteSiswa('${siswa.id_siswa}')" class="btn-delete">
                    🗑️ Hapus
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStats(siswa, selectedKelas) {
    const totalSiswa = siswa.length;
    const siswaAktif = siswa.filter(s => s.status).length;
    
    document.getElementById('totalSiswaCount').textContent = totalSiswa;
    document.getElementById('siswaAktifCount').textContent = siswaAktif;
    document.getElementById('kelasTerpilih').textContent = selectedKelas === 'all' ? 'Semua Kelas' : `Kelas ${selectedKelas}`;
}

function editSiswa(idSiswa) {
    alert(`Edit siswa: ${idSiswa} - Fitur dalam pengembangan`);
    // TODO: Implement edit functionality
}

function deleteSiswa(idSiswa) {
    if (confirm('Apakah Anda yakin ingin menghapus siswa ini?')) {
        alert(`Hapus siswa: ${idSiswa} - Fitur dalam pengembangan`);
        // TODO: Implement delete functionality
    }
}

function exportData() {
    alert('📊 Fitur export data dalam pengembangan');
    // TODO: Implement export to Excel/PDF
}

// Load manajemen kelas when page loads
document.addEventListener('DOMContentLoaded', loadManajemenKelas);