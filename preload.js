// import { contextBridge } from 'electron/renderer'
const { contextBridge, ipcRenderer } = require('electron/renderer')

	contextBridge.exposeInMainWorld('versions', {
	  node: () => process.versions.node,
	  chrome: () => process.versions.chrome,
	  electron: () => process.versions.electron,
	  ping: () => ipcRenderer.invoke('ping')
	  // 除函数之外，我们也可以暴露变量
	})

	contextBridge.exposeInMainWorld('printer', {
	  getPrinters: () => ipcRenderer.invoke('get-printers'),
	  printFile: (filePath, printerName) =>
	    ipcRenderer.invoke('print-file', { filePath, printerName }),
	  selectFiles: () => ipcRenderer.invoke('select-files')
	})