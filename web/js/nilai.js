// Grades management functionality
class GradesManager {
    constructor() {
        this.students = [];
        this.gradesData = {};
        this.init();
    }

    init() {
        if (document.getElementById('gradesTable')) {
            this.loadStudents();
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Class filter
        const classFilter = document.getElementById('kelasFilter');
        if (classFilter) {
            classFilter.addEventListener('change', () => {
                this.loadStudents(classFilter.value);
            });
        }

        // Subject filter
        const subjectFilter = document.getElementById('mataPelajaran');
        if (subjectFilter) {
            subjectFilter.addEventListener('change', () => {
                this.loadGradesData();
            });
        }

        // Semester filter
        const semesterFilter = document.getElementById('semester');
        if (semesterFilter) {
            semesterFilter.addEventListener('change', () => {
                this.loadGradesData();
            });
        }

        // Save button
        const saveBtn = document.getElementById('saveGradesBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveGrades();
            });
        }
    }

    async loadStudents(classFilter = '') {
        try {
            const response = await apiService.getStudents(classFilter);
            if (response.success) {
                this.students = response.data;
                this.renderGradesTable();
                this.loadGradesData();
            }
        } catch (error) {
            console.error('Error loading students:', error);
            Utils.showAlert('Gagal memuat data siswa', 'error');
        }
    }

    async loadGradesData() {
        const classFilter = document.getElementById('kelasFilter').value;
        const subject = document.getElementById('mataPelajaran').value;
        const semester = document.getElementById('semester').value;

        try {
            const response = await apiService.getGrades(classFilter, subject, semester);
            if (response.success) {
                // Convert array to object for easy lookup
                this.gradesData = {};
                response.data.forEach(record => {
                    this.gradesData[record.nis] = {
                        nilai: record.nilai,
                        keterangan: record.keterangan || ''
                    };
                });
                
                this.updateGradesTable();
            }
        } catch (error) {
            console.error('Error loading grades data:', error);
            // Don't show error if no grades data exists yet
        }
    }

    renderGradesTable() {
        const tbody = document.getElementById('gradesTableBody');
        
        if (this.students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Tidak ada data siswa</td></tr>';
            return;
        }

        tbody.innerHTML = this.students.map(student => {
            const grade = this.gradesData[student.nis] || { nilai: '', keterangan: '' };
            
            return `
                <tr data-nis="${student.nis}">
                    <td>${student.nis}</td>
                    <td>${student.nama}</td>
                    <td>Kelas ${student.kelas}</td>
                    <td>
                        <input type="number" class="grade-input" 
                               min="0" max="100" step="0.1"
                               value="${grade.nilai}" 
                               placeholder="0-100"
                               data-nis="${student.nis}">
                    </td>
                    <td>
                        <input type="text" class="keterangan-input" 
                               value="${grade.keterangan}" 
                               placeholder="Keterangan (opsional)"
                               data-nis="${student.nis}">
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateGradesTable() {
        this.students.forEach(student => {
            const grade = this.gradesData[student.nis] || { nilai: '', keterangan: '' };
            const row = document.querySelector(`tr[data-nis="${student.nis}"]`);
            
            if (row) {
                const gradeInput = row.querySelector('.grade-input');
                const keteranganInput = row.querySelector('.keterangan-input');
                
                if (gradeInput) gradeInput.value = grade.nilai;
                if (keteranganInput) keteranganInput.value = grade.keterangan;
            }
        });
    }

    collectGradesData() {
        const subject = document.getElementById('mataPelajaran').value;
        const semester = document.getElementById('semester').value;
        const classFilter = document.getElementById('kelasFilter').value;
        
        const gradesRecords = [];
        
        this.students.forEach(student => {
            const row = document.querySelector(`tr[data-nis="${student.nis}"]`);
            if (row) {
                const gradeInput = row.querySelector('.grade-input');
                const keteranganInput = row.querySelector('.keterangan-input');
                
                const nilai = gradeInput ? gradeInput.value : '';
                
                // Only include records with values
                if (nilai !== '') {
                    gradesRecords.push({
                        nis: student.nis,
                        mata_pelajaran: subject,
                        semester: semester,
                        nilai: parseFloat(nilai),
                        keterangan: keteranganInput ? keteranganInput.value : '',
                        kelas: classFilter || student.kelas
                    });
                }
            }
        });
        
        return gradesRecords;
    }

    async saveGrades() {
        const saveBtn = document.getElementById('saveGradesBtn');
        const originalText = saveBtn.innerHTML;
        
        const gradesData = this.collectGradesData();
        
        if (gradesData.length === 0) {
            Utils.showAlert('Tidak ada data nilai untuk disimpan', 'error');
            return;
        }

        // Validate grades
        for (const record of gradesData) {
            if (record.nilai < 0 || record.nilai > 100) {
                Utils.showAlert('Nilai harus antara 0 dan 100', 'error');
                return;
            }
        }

        Utils.showLoading(saveBtn);

        try {
            const response = await apiService.saveGrades(gradesData);
            if (response.success) {
                Utils.showAlert('Nilai berhasil disimpan', 'success');
                this.loadGradesData(); // Reload to confirm save
            }
        } catch (error) {
            console.error('Error saving grades:', error);
            Utils.showAlert('Gagal menyimpan nilai', 'error');
        } finally {
            Utils.hideLoading(saveBtn, originalText);
        }
    }
}

// Initialize grades manager
const gradesManager = new GradesManager();