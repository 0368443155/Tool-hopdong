let selectedFiles = [];
let selectedOutDir = localStorage.getItem('savedOutDir') || null;

const fileInputBtn = document.getElementById('fileInputBtn');
const outDirBtn = document.getElementById('outDirBtn');
const outDirDisplay = document.getElementById('outDirDisplay');
const fileList = document.getElementById('fileList');
const processBtn = document.getElementById('processBtn');
const logTableBody = document.getElementById('logTableBody');
const loadingOverlay = document.getElementById('loadingOverlay');

document.addEventListener('DOMContentLoaded', () => {
    if (selectedOutDir) {
        outDirDisplay.textContent = selectedOutDir;
        outDirDisplay.style.color = 'var(--primary)';
    }
});

fileInputBtn.addEventListener('click', async () => {
    const files = await window.api.selectFiles();
    if (files.length > 0) {
        selectedFiles = files;
        fileList.innerHTML = '';
        files.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="file-icon">📄</span> ${f.split('\\').pop().split('/').pop()}`;
            fileList.appendChild(li);
        });
        processBtn.disabled = false;
        processBtn.classList.add('active');
    }
});

outDirBtn.addEventListener('click', async () => {
    const dir = await window.api.selectDir();
    if (dir) {
        selectedOutDir = dir;
        localStorage.setItem('savedOutDir', dir);
        outDirDisplay.textContent = dir;
        outDirDisplay.style.color = 'var(--primary)';
    }
});

processBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    
    processBtn.disabled = true;
    fileInputBtn.disabled = true;
    outDirBtn.disabled = true;
    processBtn.classList.remove('active');
    logTableBody.innerHTML = ''; 
    loadingOverlay.classList.add('visible');

    const res = await window.api.processPdfs(selectedFiles, selectedOutDir);
    
    loadingOverlay.classList.remove('visible');
    
    if (res.error) {
        alert("Lỗi hệ thống: " + res.error);
    } else {
        alert("Thành công! Các file đã được lưu tại: " + (selectedOutDir || "thư mục Output mặc định"));
    }
    
    processBtn.disabled = false;
    fileInputBtn.disabled = false;
    outDirBtn.disabled = false;
    processBtn.classList.add('active');
});

// Cập nhật trạng thái realtime từ Backend
window.api.onLog((data) => {
    const existingRow = document.getElementById(`log-${data.file}`);
    let statusClass = 'status-processing';
    if (data.status === 'Thành công') statusClass = 'status-success';
    if (data.status.startsWith('Lỗi')) statusClass = 'status-error';

    if (existingRow) {
        if (data.outFile) {
            existingRow.cells[0].textContent = data.outFile;
        }
        existingRow.cells[1].innerHTML = `<span class="badge ${statusClass}">${data.status}</span>`;
    } else {
        const tr = document.createElement('tr');
        tr.id = `log-${data.file}`;
        
        tr.innerHTML = `
            <td class="font-medium">${data.outFile || data.file}</td>
            <td><span class="badge ${statusClass}">${data.status}</span></td>
        `;
        logTableBody.prepend(tr); // Thêm lên đầu danh sách
    }
});
