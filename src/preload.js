const { contextBridge, ipcRenderer } = require('electron');

// Mở các hàm an toàn cho Frontend
contextBridge.exposeInMainWorld('api', {
    selectFiles: () => ipcRenderer.invoke('select-files'),
    selectDir: () => ipcRenderer.invoke('select-dir'),
    processPdfs: (filePaths, outDir) => ipcRenderer.invoke('process-pdfs', { filePaths, outDir }),
    onLog: (callback) => ipcRenderer.on('log', (_event, data) => callback(data))
});
