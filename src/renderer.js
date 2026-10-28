let selectedFiles = [];
let selectedConstFiles = [];
let selectedOutDir = localStorage.getItem('savedOutDir') || null;
let selectedConstructionDir = localStorage.getItem('savedConstructionDir') || null;
let selectedPxkDir = localStorage.getItem('savedPxkDir') || null;

const fileInputBtn = document.getElementById('fileInputBtn');
const constFileInputBtn = document.getElementById('constFileInputBtn');
const outDirBtn = document.getElementById('outDirBtn');
const constructionDirBtn = document.getElementById('constructionDirBtn');
const pxkDirBtn = document.getElementById('pxkDirBtn');

const outDirDisplay = document.getElementById('outDirDisplay');
const constructionDirDisplay = document.getElementById('constructionDirDisplay');
const pxkDirDisplay = document.getElementById('pxkDirDisplay');

const fileList = document.getElementById('fileList');
const processBtn = document.getElementById('processBtn');
const processConstBtn = document.getElementById('processConstBtn');
const logTableBody = document.getElementById('logTableBody');
const loadingOverlay = document.getElementById('loadingOverlay');

const extractCompaniesBtn = document.getElementById('extractCompaniesBtn');
const saveAllCompaniesBtn = document.getElementById('saveAllCompaniesBtn');
const companiesTableBody = document.getElementById('companiesTableBody');

function renderCompaniesTable(companies) {
    companiesTableBody.innerHTML = '';
    const entries = Object.entries(companies);
    if (entries.length === 0) {
        companiesTableBody.innerHTML = '<tr><td colspan="2" class="text-center" style="text-align:center;">Chưa có dữ liệu</td></tr>';
        return;
    }
    for (const [name, abbr] of entries) {
        const tr = document.createElement('tr');
        const encodedName = btoa(encodeURIComponent(name)).replace(/=/g, '');
        tr.innerHTML = `
            <td style="word-wrap: break-word; white-space: normal;">${name}</td>
            <td>
                <input type="text" value="${abbr}" data-company-name="${encodeURIComponent(name)}" class="company-abbr-input"
                       style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid var(--border); background: rgba(0,0,0,0.3); color: white;" />
            </td>
        `;
        companiesTableBody.appendChild(tr);
    }
}

saveAllCompaniesBtn.addEventListener('click', async () => {
    const inputs = document.querySelectorAll('.company-abbr-input');
    const newData = {};
    inputs.forEach(input => {
        const name = decodeURIComponent(input.getAttribute('data-company-name'));
        const abbr = input.value.trim();
        if (abbr) {
            newData[name] = abbr;
        }
    });
    
    if (Object.keys(newData).length > 0) {
        saveAllCompaniesBtn.disabled = true;
        saveAllCompaniesBtn.innerHTML = 'Đang lưu...';
        const updatedCompanies = await window.api.updateAllCompanies(newData);
        renderCompaniesTable(updatedCompanies);
        saveAllCompaniesBtn.disabled = false;
        saveAllCompaniesBtn.innerHTML = '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 5px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Lưu Tổng Tất Cả';
        alert('Đã lưu tất cả tên viết tắt thành công!');
    } else {
        alert('Không có dữ liệu để lưu!');
    }
});

extractCompaniesBtn.addEventListener('click', async () => {
    const files = await window.api.selectFiles();
    if (files.length > 0) {
        extractCompaniesBtn.disabled = true;
        extractCompaniesBtn.innerHTML = 'Đang lọc...';
        loadingOverlay.classList.add('visible');
        
        const companies = await window.api.extractCompanies(files);
        renderCompaniesTable(companies);
        
        loadingOverlay.classList.remove('visible');
        extractCompaniesBtn.disabled = false;
        extractCompaniesBtn.innerHTML = '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> Lọc Công Ty từ File PDF';
        alert('Đã lọc xong danh sách công ty từ PDF!');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Load companies
    window.api.getCompanies().then(renderCompaniesTable);
    window.api.onRefreshCompanies(renderCompaniesTable);
    if (selectedOutDir) {
        outDirDisplay.textContent = selectedOutDir;
        outDirDisplay.style.color = 'var(--primary)';
    }
    if (selectedConstructionDir) {
        constructionDirDisplay.textContent = selectedConstructionDir;
        constructionDirDisplay.style.color = 'var(--primary)';
    }
    if (selectedPxkDir) {
        pxkDirDisplay.textContent = selectedPxkDir;
        pxkDirDisplay.style.color = 'var(--primary)';
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

constFileInputBtn.addEventListener('click', async () => {
    const files = await window.api.selectFiles();
    if (files.length > 0) {
        selectedConstFiles = files;
        fileList.innerHTML = '';
        files.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="file-icon">📄</span> [HĐ Thi Công] ${f.split('\\').pop().split('/').pop()}`;
            fileList.appendChild(li);
        });
        if (selectedPxkDir) {
            processConstBtn.disabled = false;
            processConstBtn.classList.add('active');
        } else {
            alert("Vui lòng chọn thêm Thư mục Phiếu Xuất Kho trước khi xử lý.");
        }
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

constructionDirBtn.addEventListener('click', async () => {
    const dir = await window.api.selectDir();
    if (dir) {
        selectedConstructionDir = dir;
        localStorage.setItem('savedConstructionDir', dir);
        constructionDirDisplay.textContent = dir;
        constructionDirDisplay.style.color = 'var(--primary)';
    }
});

pxkDirBtn.addEventListener('click', async () => {
    const dir = await window.api.selectDir();
    if (dir) {
        selectedPxkDir = dir;
        localStorage.setItem('savedPxkDir', dir);
        pxkDirDisplay.textContent = dir;
        pxkDirDisplay.style.color = 'var(--primary)';
        if (selectedConstFiles.length > 0) {
            processConstBtn.disabled = false;
            processConstBtn.classList.add('active');
        }
    }
});

processBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    
    processBtn.disabled = true;
    fileInputBtn.disabled = true;
    outDirBtn.disabled = true;
    constructionDirBtn.disabled = true;
    processBtn.classList.remove('active');
    logTableBody.innerHTML = ''; 
    loadingOverlay.classList.add('visible');

    const res = await window.api.processPdfs(selectedFiles, selectedOutDir, selectedConstructionDir);
    
    loadingOverlay.classList.remove('visible');
    
    if (res.error) {
        alert("Lỗi hệ thống: " + res.error);
    } else {
        alert("Thành công! Các file đã được lưu tại: " + (selectedOutDir || "thư mục Output mặc định"));
    }
    
    processBtn.disabled = false;
    fileInputBtn.disabled = false;
    outDirBtn.disabled = false;
    constructionDirBtn.disabled = false;
    processBtn.classList.add('active');
});

processConstBtn.addEventListener('click', async () => {
    if (selectedConstFiles.length === 0 || !selectedPxkDir) return;
    
    processConstBtn.disabled = true;
    processBtn.disabled = true;
    constFileInputBtn.disabled = true;
    pxkDirBtn.disabled = true;
    processConstBtn.classList.remove('active');
    logTableBody.innerHTML = ''; 
    loadingOverlay.classList.add('visible');

    const res = await window.api.processConstructionPdfs(selectedConstFiles, selectedPxkDir, selectedOutDir);
    
    loadingOverlay.classList.remove('visible');
    
    if (res.error) {
        alert("Lỗi hệ thống: " + res.error);
    } else {
        alert("Thành công! Các file HĐ Thi Công đã được xử lý.");
    }
    
    processConstBtn.disabled = false;
    processBtn.disabled = false;
    constFileInputBtn.disabled = false;
    pxkDirBtn.disabled = false;
    processConstBtn.classList.add('active');
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
