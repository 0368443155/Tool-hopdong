const { contextBridge, ipcRenderer } = require('electron');

// Mở các hàm an toàn cho Frontend
contextBridge.exposeInMainWorld('api', {
    selectFiles: () => ipcRenderer.invoke('select-files'),
    selectDir: () => ipcRenderer.invoke('select-dir'),
    processPdfs: (filePaths, outDir, constructionDir) => ipcRenderer.invoke('process-pdfs', { filePaths, outDir, constructionDir }),
    processConstructionPdfs: (filePaths, pxkDir, outDir) => ipcRenderer.invoke('process-construction-pdfs', { filePaths, pxkDir, outDir }),
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    updateCompany: (name, abbr) => ipcRenderer.invoke('update-company', { name, abbr }),
    updateAllCompanies: (data) => ipcRenderer.invoke('update-all-companies', data),
    extractCompanies: (filePaths) => ipcRenderer.invoke('extract-companies', filePaths),
    onRefreshCompanies: (callback) => ipcRenderer.on('refresh-companies', (_event, data) => callback(data)),
    onLog: (callback) => ipcRenderer.on('log', (_event, data) => callback(data))
});
