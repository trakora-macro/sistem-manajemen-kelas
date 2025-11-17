<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/supabase-config.js"></script>
<script src="../js/auth.js"></script>
<script>
    // Absensi Functions
    let currentUser = null;
    let currentData = {
        siswa: [],
        absensiExisting: {},
        tanggal: new Date().toISOString().split('T')[0]
    };

    // Status kehadiran
    const STATUS_KEHADIRAN = [
        { id: 'H', nama: 'Hadir', color: 'status-hadir', icon: '✅' },
        { id: 'I', nama: 'Izin', color: 'status-izin', icon: '📝' },
        { id: 'S', nama: 'Sakit', color: 'status-sakit', icon: '🤒' },
        { id: 'A', nama: 'Alpha', color: 'status-alpha', icon: '❌' }
    ];

    async function loadAbsensi() {
        console.log('✅ Loading absensi system...');
        
        currentUser = checkAuth();
        if (!currentUser) {
            console.log('❌ User not authenticated, redirecting...');
            window.location.href = '../index.html';
            return;
        }
        
        console.log('✅ User authenticated:', currentUser);
        
        // Display user info
        document.getElementById('userName').textContent = currentUser.nama;
        document.getElementById('userRole').textContent = currentUser.role;
        
        // Setup filter berdasarkan role
        setupFilterByRole();
        
        // Set tanggal default ke hari ini
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('filterTanggal').value = today;
        currentData.tanggal = today;
        
        document.getElementById('tanggalHariIni').textContent = formatTanggal(new Date());
        
        // Set bulan dan tahun default
        const now = new Date();
        document.getElementById('filterBulan').value = now.getMonth() + 1;
        document.getElementById('filterTahun').value = now.getFullYear();
        document.getElementById('infoBulan').textContent = getNamaBulan(now.getMonth() + 1);
        
        // Auto-load data jika guru kelas
        if (currentUser.role === 'Guru Kelas' && currentUser.kelas_dipegang) {
            console.log('🔄 Auto-loading data for guru kelas...');
            setTimeout(() => {
                loadAbsensiHariIni();
            }, 1000);
        }
    }

    function setupFilterByRole() {
        const filterKelas = document.getElementById('filterKelas');
        
        if (currentUser.role === 'Guru Kelas' && currentUser.kelas_dipegang) {
            const kelasAngka = currentUser.kelas_dipegang.replace('A', '');
            filterKelas.value = kelasAngka;
            filterKelas.disabled = true;
            filterKelas.classList.add('filter-disabled');
            console.log('🎯 Guru kelas - auto select class:', kelasAngka);
        }
    }

    async function loadAbsensiHariIni() {
        const kelas = document.getElementById('filterKelas').value;
        const tanggal = document.getElementById('filterTanggal').value;
        
        if (!kelas) {
            showNotification('❌ Harap pilih Kelas terlebih dahulu', 'error');
            return;
        }
        
        if (!tanggal) {
            showNotification('❌ Harap pilih Tanggal terlebih dahulu', 'error');
            return;
        }
        
        // Show loading
        const btnLoad = document.getElementById('btnLoadAbsensi');
        const btnLoadText = document.getElementById('btnLoadText');
        const btnLoadLoading = document.getElementById('btnLoadLoading');
        
        btnLoad.disabled = true;
        btnLoadText.style.display = 'none';
        btnLoadLoading.style.display = 'inline-block';
        
        try {
            console.log('📊 Loading absensi...', { kelas, tanggal });
            
            // 1. Load data siswa
            const { data: siswa, error: errorSiswa } = await supabase
                .from('siswa')
                .select('*')
                .eq('kelas', kelas)
                .eq('status', true)
                .order('nama_siswa');
            
            if (errorSiswa) {
                console.error('❌ Error loading siswa:', errorSiswa);
                throw errorSiswa;
            }
            
            currentData.siswa = siswa || [];
            currentData.tanggal = tanggal;
            
            console.log('✅ Siswa loaded:', currentData.siswa.length);
            
            // 2. Load absensi untuk tanggal yang dipilih
            await loadAbsensiExisting(kelas, tanggal);
            
            // Update UI
            updateStats();
            displayAbsensiTable();
            document.getElementById('btnSimpan').disabled = false;
            document.getElementById('progressInfo').style.display = 'block';
            
            showNotification(`✅ Data ${currentData.siswa.length} siswa berhasil dimuat`, 'success');
            
        } catch (error) {
            console.error('❌ Error loading absensi:', error);
            showNotification('Gagal memuat data absensi: ' + error.message, 'error');
            
            // Show error state
            const tbody = document.getElementById('absensiTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">❌</div>
                            <p>Gagal memuat data absensi</p>
                            <small>${error.message}</small>
                        </div>
                    </td>
                </tr>
            `;
        } finally {
            // Hide loading
            btnLoad.disabled = false;
            btnLoadText.style.display = 'inline-block';
            btnLoadLoading.style.display = 'none';
        }
    }

    async function loadAbsensiExisting(kelas, tanggal) {
        try {
            console.log('📋 Loading existing absensi...');
            
            const { data: absensi, error } = await supabase
                .from('absensi')
                .select('*')
                .eq('kelas', kelas)
                .eq('tanggal', tanggal);
            
            if (error) {
                console.error('❌ Error loading existing absensi:', error);
                throw error;
            }
            
            // Organize data by siswa_id
            currentData.absensiExisting = {};
            
            if (absensi && absensi.length > 0) {
                absensi.forEach(absen => {
                    currentData.absensiExisting[absen.siswa_id] = absen;
                });
                console.log('✅ Existing absensi loaded:', absensi.length, 'records');
            } else {
                console.log('ℹ️ No existing absensi found for this date');
            }
            
        } catch (error) {
            console.error('❌ Error in loadAbsensiExisting:', error);
            // Continue without existing data
            currentData.absensiExisting = {};
        }
    }

    function displayAbsensiTable() {
        const tbody = document.getElementById('absensiTableBody');
        
        if (!currentData.siswa || currentData.siswa.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <div class="empty-state-icon">👥</div>
                            <p>Tidak ada siswa di kelas ini</p>
                            <small>Silakan pilih kelas lain</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const tanggal = document.getElementById('filterTanggal').value;
        
        tbody.innerHTML = currentData.siswa.map((siswa, index) => {
            const existingAbsen = currentData.absensiExisting[siswa.id_siswa];
            const status = existingAbsen ? existingAbsen.status : 'H'; // Default Hadir
            const keterangan = existingAbsen ? existingAbsen.keterangan : '';
            const lastUpdate = existingAbsen ? existingAbsen.updated_at : null;
            
            return `
                <tr>
                    <td style="padding: 12px; text-align: center;">${index + 1}</td>
                    <td style="padding: 12px;">
                        <div class="student-id">${siswa.id_siswa}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div class="student-name">${siswa.nama_siswa}</div>
                        <div style="font-size: 12px; color: #718096;">
                            ${siswa.jk === 'L' ? '👦' : '👧'} ${siswa.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                    </td>
                    <td style="padding: 12px;">
                        <div class="radio-group">
                            ${STATUS_KEHADIRAN.map(statusItem => `
                                <label class="radio-label">
                                    <input type="radio" 
                                           name="status_${siswa.id_siswa}" 
                                           value="${statusItem.id}"
                                           ${status === statusItem.id ? 'checked' : ''}
                                           onchange="updateStatus('${siswa.id_siswa}', '${statusItem.id}')">
                                    <span class="radio-custom"></span>
                                    <span>${statusItem.icon} ${statusItem.nama}</span>
                                </label>
                            `).join('')}
                        </div>
                    </td>
                    <td style="padding: 12px;">
                        <input type="text" 
                               class="filter-input" 
                               style="width: 100%; padding: 8px; font-size: 12px;"
                               placeholder="Keterangan (opsional)"
                               value="${keterangan}"
                               data-siswa-id="${siswa.id_siswa}"
                               onchange="updateKeterangan('${siswa.id_siswa}', this.value)"
                               onblur="updateKeterangan('${siswa.id_siswa}', this.value)">
                    </td>
                    <td style="padding: 12px;">
                        ${lastUpdate ? `
                            <span style="font-size: 12px; color: #718096;">
                                ${new Date(lastUpdate).toLocaleDateString('id-ID')}
                                <br>
                                <small>${new Date(lastUpdate).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</small>
                            </span>
                        ` : '<span style="color: #a0aec0; font-size: 12px;">-</span>'}
                    </td>
                    <td style="padding: 12px;">
                        <button onclick="simpanAbsensi('${siswa.id_siswa}')" 
                                class="btn-success" 
                                style="padding: 6px 12px; font-size: 12px; border: none; border-radius: 5px; cursor: pointer;">
                            💾 Simpan
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        updateTableInfo();
        updateProgress();
    }

    function updateStatus(siswaId, status) {
        console.log(`🔄 Update status ${siswaId} to ${status}`);
    }

    function updateKeterangan(siswaId, keterangan) {
        console.log(`📝 Update keterangan ${siswaId}: ${keterangan}`);
    }

    async function simpanAbsensi(siswaId) {
        const statusRadio = document.querySelector(`input[name="status_${siswaId}"]:checked`);
        const keteranganInput = document.querySelector(`input[data-siswa-id="${siswaId}"]`);
        
        if (!statusRadio) {
            showNotification('❌ Harap pilih status kehadiran terlebih dahulu', 'error', 3000);
            return;
        }
        
        const status = statusRadio.value;
        const keterangan = keteranganInput ? keteranganInput.value : '';
        const kelas = document.getElementById('filterKelas').value;
        const tanggal = document.getElementById('filterTanggal').value;
        
        // Validasi data
        if (!siswaId || !kelas || !tanggal) {
            showNotification('❌ Data tidak lengkap. Harap muat ulang halaman.', 'error', 3000);
            return;
        }
        
        // Show loading state on button
        const saveButton = document.querySelector(`button[onclick="simpanAbsensi('${siswaId}')"]`);
        const originalText = saveButton.innerHTML;
        const originalBackground = saveButton.style.background;
        saveButton.innerHTML = '⏳ Menyimpan...';
        saveButton.disabled = true;
        
        try {
            console.log('💾 Saving absensi:', { 
                siswaId, status, keterangan, kelas, tanggal 
            });
            
            const absensiData = {
                siswa_id: siswaId,
                kelas: kelas,
                tanggal: tanggal,
                status: status,
                keterangan: keterangan,
                created_by: currentUser.id_guru,
                updated_at: new Date().toISOString()
            };
            
            // Cek apakah absensi sudah ada
            const existingAbsen = currentData.absensiExisting[siswaId];
            
            let result;
            let isUpdate = false;
            
            if (existingAbsen && existingAbsen.id) {
                // Update existing
                console.log('🔄 Updating existing absensi...');
                isUpdate = true;
                result = await supabase
                    .from('absensi')
                    .update(absensiData)
                    .eq('id', existingAbsen.id);
            } else {
                // Insert new
                console.log('🆕 Inserting new absensi...');
                absensiData.created_at = new Date().toISOString();
                result = await supabase
                    .from('absensi')
                    .insert([absensiData]);
            }
            
            if (result.error) {
                console.error('❌ Database error:', result.error);
                
                // Handle specific errors
                if (result.error.code === '23505') { // Unique violation
                    console.log('⚠️ Data sudah ada, mencoba update...');
                    // Try to update using composite key
                    const updateResult = await supabase
                        .from('absensi')
                        .update(absensiData)
                        .eq('siswa_id', siswaId)
                        .eq('tanggal', tanggal);
                    
                    if (updateResult.error) throw updateResult.error;
                    result = updateResult;
                    isUpdate = true;
                } else {
                    throw result.error;
                }
            }
            
            // FIX: Handle null result.data dengan safe check
            let newId;
            if (isUpdate) {
                newId = existingAbsen ? existingAbsen.id : null;
            } else {
                // Safe check untuk result.data[0]
                newId = result.data && Array.isArray(result.data) && result.data.length > 0 ? result.data[0].id : null;
            }
            
            // Show success feedback
            const successMessage = `✅ Absensi ${getStatusName(status)} berhasil disimpan!`;
            console.log(successMessage);
            
            // Update button dengan feedback visual
            saveButton.innerHTML = '✅ Tersimpan';
            saveButton.style.background = '#48bb78';
            
            // Update local data
            currentData.absensiExisting[siswaId] = { 
                ...absensiData, 
                id: newId
            };
            
            updateProgress();
            updateStats();
            
            // Show success notification (akan auto hilang)
            showNotification(successMessage, 'success', 2000);
            
            // Reset button setelah 2 detik
            setTimeout(() => {
                saveButton.innerHTML = originalText;
                saveButton.style.background = originalBackground;
                saveButton.disabled = false;
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error saving absensi:', error);
            
            // Show error feedback on button
            saveButton.innerHTML = '❌ Gagal';
            saveButton.style.background = '#e53e3e';
            
            // Show notification instead of alert (akan auto hilang)
            let errorMessage = 'Gagal menyimpan absensi: ';
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage += 'Koneksi internet bermasalah';
            } else if (error.message.includes('JWT')) {
                errorMessage += 'Sesi login habis, silakan login kembali';
            } else if (error.message.includes('null') && error.message.includes('0')) {
                errorMessage += 'Terjadi kesalahan sistem. Data mungkin tidak tersimpan dengan benar.';
            } else {
                errorMessage += error.message;
            }
            
            showNotification(errorMessage, 'error', 4000);
            
            // Reset button setelah 3 detik
            setTimeout(() => {
                saveButton.innerHTML = originalText;
                saveButton.style.background = originalBackground;
                saveButton.disabled = false;
            }, 3000);
        }
    }

    async function simpanSemuaAbsensi() {
        if (!currentData.siswa || currentData.siswa.length === 0) {
            showNotification('❌ Tidak ada data siswa untuk disimpan', 'error', 3000);
            return;
        }
        
        // Gunakan custom confirm yang lebih baik
        const userConfirmed = await showConfirm(
            'Simpan Semua Absensi',
            '💾 Simpan semua absensi yang telah diinput?\n\nSistem akan menyimpan data untuk semua siswa.',
            'Simpan Semua',
            'Batal'
        );
        
        if (!userConfirmed) {
            return;
        }
        
        const btnSimpan = document.getElementById('btnSimpan');
        const originalText = btnSimpan.innerHTML;
        const originalBackground = btnSimpan.style.background;
        
        try {
            btnSimpan.disabled = true;
            btnSimpan.innerHTML = '⏳ Menyimpan...';
            btnSimpan.style.background = '#ed8936';
            
            let successCount = 0;
            let errorCount = 0;
            const totalSiswa = currentData.siswa.length;
            
            // Show progress notification
            showNotification(`⏳ Menyimpan data ${totalSiswa} siswa...`, 'info', 0); // 0 = no auto-hide
            
            // Simpan satu per satu
            for (let i = 0; i < currentData.siswa.length; i++) {
                const siswa = currentData.siswa[i];
                
                // Update progress notification
                if (i % 5 === 0) { // Update setiap 5 siswa
                    updateProgressNotification(`⏳ Menyimpan data... (${i}/${totalSiswa})`, i, totalSiswa);
                }
                
                try {
                    await simpanAbsensiIndividu(siswa.id_siswa);
                    successCount++;
                } catch (error) {
                    console.error(`❌ Gagal menyimpan absensi ${siswa.nama_siswa}:`, error);
                    errorCount++;
                }
                
                // Small delay antara penyimpanan
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Hide progress notification
            hideProgressNotification();
            
            // Show result notification
            let message = `✅ Penyimpanan selesai! Berhasil: ${successCount}/${totalSiswa} siswa`;
            let type = 'success';
            
            if (errorCount > 0) {
                message += ` (Gagal: ${errorCount})`;
                type = 'warning';
            }
            
            showNotification(message, type, 4000);
            
            // Refresh data
            await loadAbsensiHariIni();
            
        } catch (error) {
            console.error('❌ Error in simpanSemuaAbsensi:', error);
            hideProgressNotification();
            showNotification('Terjadi kesalahan saat menyimpan semua data: ' + error.message, 'error', 5000);
        } finally {
            btnSimpan.disabled = false;
            btnSimpan.innerHTML = originalText;
            btnSimpan.style.background = originalBackground;
        }
    }

    // Fungsi simpan individu tanpa feedback visual untuk bulk save
    async function simpanAbsensiIndividu(siswaId) {
        const statusRadio = document.querySelector(`input[name="status_${siswaId}"]:checked`);
        const keteranganInput = document.querySelector(`input[data-siswa-id="${siswaId}"]`);
        
        if (!statusRadio) return;
        
        const status = statusRadio.value;
        const keterangan = keteranganInput ? keteranganInput.value : '';
        const kelas = document.getElementById('filterKelas').value;
        const tanggal = document.getElementById('filterTanggal').value;
        
        const absensiData = {
            siswa_id: siswaId,
            kelas: kelas,
            tanggal: tanggal,
            status: status,
            keterangan: keterangan,
            created_by: currentUser.id_guru,
            updated_at: new Date().toISOString()
        };
        
        const existingAbsen = currentData.absensiExisting[siswaId];
        
        let result;
        let isUpdate = false;
        
        if (existingAbsen && existingAbsen.id) {
            result = await supabase
                .from('absensi')
                .update(absensiData)
                .eq('id', existingAbsen.id);
            isUpdate = true;
        } else {
            absensiData.created_at = new Date().toISOString();
            result = await supabase
                .from('absensi')
                .insert([absensiData]);
        }
        
        if (result.error) {
            if (result.error.code === '23505') {
                const updateResult = await supabase
                    .from('absensi')
                    .update(absensiData)
                    .eq('siswa_id', siswaId)
                    .eq('tanggal', tanggal);
                if (updateResult.error) throw updateResult.error;
                result = updateResult;
                isUpdate = true;
            } else {
                throw result.error;
            }
        }
        
        // Safe update local data
        let newId;
        if (isUpdate) {
            newId = existingAbsen ? existingAbsen.id : null;
        } else {
            newId = result.data && Array.isArray(result.data) && result.data.length > 0 ? result.data[0].id : null;
        }
        
        currentData.absensiExisting[siswaId] = { 
            ...absensiData, 
            id: newId
        };
    }

    function updateStats() {
        const kelas = document.getElementById('filterKelas').value;
        const totalSiswa = currentData.siswa.length;
        
        if (totalSiswa === 0) {
            document.getElementById('totalSiswa').textContent = '0';
            document.getElementById('infoKelas').textContent = 'Pilih kelas';
            document.getElementById('hadirHariIni').textContent = '0';
            document.getElementById('tidakHadir').textContent = '0';
            document.getElementById('persentaseHadir').textContent = '0%';
            return;
        }
        
        // Hitung statistik
        let hadir = 0, izin = 0, sakit = 0, alpha = 0;
        
        currentData.siswa.forEach(siswa => {
            const absen = currentData.absensiExisting[siswa.id_siswa];
            if (absen) {
                switch (absen.status) {
                    case 'H': hadir++; break;
                    case 'I': izin++; break;
                    case 'S': sakit++; break;
                    case 'A': alpha++; break;
                    default: hadir++;
                }
            } else {
                hadir++;
            }
        });
        
        const tidakHadir = izin + sakit + alpha;
        const persentaseHadir = totalSiswa > 0 ? Math.round((hadir / totalSiswa) * 100) : 0;
        
        document.getElementById('totalSiswa').textContent = totalSiswa;
        document.getElementById('infoKelas').textContent = `Kelas ${kelas}`;
        document.getElementById('hadirHariIni').textContent = hadir;
        document.getElementById('tidakHadir').textContent = tidakHadir;
        document.getElementById('persentaseHadir').textContent = `${persentaseHadir}%`;
    }

    function updateProgress() {
        if (!currentData.siswa || currentData.siswa.length === 0) return;
        
        const totalSiswa = currentData.siswa.length;
        let completed = 0;
        
        currentData.siswa.forEach(siswa => {
            if (currentData.absensiExisting[siswa.id_siswa]) {
                completed++;
            }
        });
        
        const percentage = Math.round((completed / totalSiswa) * 100);
        
        document.getElementById('progressBar').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = 
            `${completed} dari ${totalSiswa} siswa sudah diinput`;
        document.getElementById('progressPercentage').textContent = `${percentage}%`;
    }

    function updateTableInfo() {
        const kelas = document.getElementById('filterKelas').value;
        const tanggal = document.getElementById('filterTanggal').value;
        
        document.getElementById('tableTitle').textContent = `Absensi Kelas ${kelas}`;
        document.getElementById('tableDescription').textContent = 
            `Tanggal: ${formatTanggal(new Date(tanggal))} - ${currentData.siswa.length} siswa`;
    }

    async function generateRekapBulanan() {
        const kelas = document.getElementById('filterKelas').value;
        const bulan = document.getElementById('filterBulan').value;
        const tahun = document.getElementById('filterTahun').value;
        
        if (!kelas || !bulan || !tahun) {
            showNotification('❌ Harap pilih Kelas, Bulan, dan Tahun terlebih dahulu', 'error', 3000);
            return;
        }
        
        showNotification('📊 Sedang membuat rekap bulanan...', 'info', 2000);
    }

    function exportAbsensi() {
        const kelas = document.getElementById('filterKelas').value;
        const tanggal = document.getElementById('filterTanggal').value;
        
        if (!kelas || !tanggal) {
            showNotification('❌ Harap pilih Kelas dan Tanggal terlebih dahulu', 'error', 3000);
            return;
        }
        
        showNotification('📤 Sedang menyiapkan data untuk export...', 'info', 2000);
    }

    function resetAbsensi() {
        showConfirm(
            'Reset Form Absensi',
            '🔄 Reset semua input absensi?\n\nSemua perubahan yang belum disimpan akan hilang.',
            'Reset',
            'Batal'
        ).then(confirmed => {
            if (confirmed) {
                // Reset semua radio button ke Hadir
                const radios = document.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    if (radio.value === 'H') {
                        radio.checked = true;
                    }
                });
                
                // Reset semua input keterangan
                const inputs = document.querySelectorAll('input[type="text"]');
                inputs.forEach(input => {
                    input.value = '';
                });
                
                showNotification('🔄 Form absensi telah direset', 'info', 2000);
            }
        });
    }

    // Custom Notification System
    function showNotification(message, type = 'info', duration = 4000) {
        // Hapus notifikasi sebelumnya jika ada
        const existingNotification = document.getElementById('custom-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Buat element notifikasi
        const notification = document.createElement('div');
        notification.id = 'custom-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            cursor: pointer;
        `;
        
        // Set warna berdasarkan type
        const colors = {
            success: '#48bb78',
            error: '#e53e3e',
            warning: '#ed8936',
            info: '#4299e1'
        };
        
        notification.style.background = colors[type] || colors.info;
        
        // Tambahkan icon berdasarkan type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 16px;">${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;
        
        // Tambahkan ke body
        document.body.appendChild(notification);
        
        // Click to close
        notification.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-hide jika duration > 0
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
        
        // Tambahkan CSS animations
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        return notification;
    }

    // Progress Notification untuk bulk operations
    function updateProgressNotification(message, current, total) {
        let progressNotification = document.getElementById('progress-notification');
        if (!progressNotification) {
            progressNotification = showNotification(message, 'info', 0);
            progressNotification.id = 'progress-notification';
            progressNotification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; width: 300px;">
                    <span style="font-size: 16px;">⏳</span>
                    <div style="flex: 1;">
                        <div>${message}</div>
                        <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; margin-top: 5px;">
                            <div style="height: 100%; background: white; border-radius: 2px; width: ${(current / total) * 100}%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            progressNotification.querySelector('div > div:first-child').textContent = message;
            progressNotification.querySelector('div > div > div > div').style.width = `${(current / total) * 100}%`;
        }
    }

    function hideProgressNotification() {
        const progressNotification = document.getElementById('progress-notification');
        if (progressNotification) {
            progressNotification.remove();
        }
    }

    // Custom Confirm Dialog
    function showConfirm(title, message, confirmText = 'Ya', cancelText = 'Tidak') {
        return new Promise((resolve) => {
            // Hapus confirm dialog sebelumnya jika ada
            const existingConfirm = document.getElementById('custom-confirm-dialog');
            if (existingConfirm) {
                existingConfirm.remove();
            }
            
            // Buat overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Buat dialog
            const dialog = document.createElement('div');
            dialog.id = 'custom-confirm-dialog';
            dialog.style.cssText = `
                background: white;
                padding: 24px;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                max-width: 400px;
                width: 90%;
                animation: fadeIn 0.3s ease;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin: 0 0 12px 0; color: #2d3748; font-size: 18px;">${title}</h3>
                <p style="margin: 0 0 20px 0; color: #4a5568; line-height: 1.5; white-space: pre-line;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="confirm-cancel" style="padding: 10px 20px; border: 1px solid #e2e8f0; background: white; color: #4a5568; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        ${cancelText}
                    </button>
                    <button id="confirm-ok" style="padding: 10px 20px; border: none; background: #667eea; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;">
                        ${confirmText}
                    </button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Event listeners
            document.getElementById('confirm-ok').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });
            
            document.getElementById('confirm-cancel').addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });
            
            // Tambahkan CSS animations
            if (!document.getElementById('confirm-styles')) {
                const style = document.createElement('style');
                style.id = 'confirm-styles';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.9); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }

    // Utility functions
    function formatTanggal(date) {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function getNamaBulan(bulan) {
        const bulanNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return bulanNames[parseInt(bulan) - 1] || '';
    }

    function getStatusName(status) {
        const statusItem = STATUS_KEHADIRAN.find(s => s.id === status);
        return statusItem ? statusItem.nama : 'Tidak Diketahui';
    }

    function logout() {
        console.log('🚪 Logging out...');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        window.location.href = '../index.html';
    }

    // Event listeners
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 Absensi page loaded');
        
        document.getElementById('filterTanggal').addEventListener('change', function() {
            const kelas = document.getElementById('filterKelas').value;
            if (kelas) {
                loadAbsensiHariIni();
            }
        });
        
        document.getElementById('filterKelas').addEventListener('change', function() {
            const tanggal = document.getElementById('filterTanggal').value;
            if (tanggal) {
                loadAbsensiHariIni();
            }
        });
        
        loadAbsensi();
    });

    console.log('✅ Absensi JavaScript loaded successfully');
</script>