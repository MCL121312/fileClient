const { app, BrowserWindow, ipcMain, dialog } = require("electron/main");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { print: printPdf } = require("pdf-to-printer");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  // 为index.html创建渲染进程
  win.loadFile("index.html");
};

	app.whenReady().then(() => {
	  ipcMain.handle("ping", () => "pong");

	  ipcMain.handle("get-printers", async (event) => {
	    const printers = await event.sender.getPrintersAsync();
	    return printers;
	  });

	  ipcMain.handle("select-files", async () => {
	    const result = await dialog.showOpenDialog({
	      title: "选择待打印文件",
	      properties: ["openFile", "multiSelections"],
	      filters: [
	        { name: "文档", extensions: ["pdf", "html", "htm"] },
	        { name: "所有文件", extensions: ["*"] }
	      ]
	    });

	    if (result.canceled) {
	      return [];
	    }

	    return result.filePaths || [];
	  });

		  ipcMain.handle("print-file", async (_event, { filePath, printerName }) => {
		    if (!filePath) {
		      throw new Error("文件路径不能为空");
		    }

		    const ext = path.extname(filePath).toLowerCase();

		    // 1）PDF 走专门的 pdf-to-printer，绕开 Electron 内置 PDF 预览，避免全黑/全白/带预览窗格等问题
		    if (ext === ".pdf") {
		      const options = {};
		      if (printerName) {
		        options.printer = printerName;
		      }

		      try {
		        await printPdf(filePath, options);
		        return true;
		      } catch (error) {
		        throw new Error(error && error.message ? error.message : "PDF 打印失败");
		      }
		    }

		    // 2）其它类型（如 HTML）仍然用 BrowserWindow + webContents.print，保持原有行为
		    return new Promise((resolve, reject) => {
		      const printWindow = new BrowserWindow({
		        show: false
		      });

		      const targetUrl = pathToFileURL(filePath).toString();

		      printWindow.loadURL(targetUrl);

		      printWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription) => {
		        printWindow.close();
		        reject(new Error(errorDescription || `加载文件失败（代码：${errorCode}）`));
		      });

		      printWindow.webContents.on("did-finish-load", () => {
		        printWindow.webContents.print(
		          {
		            silent: true,
		            deviceName: printerName || undefined,
		            printBackground: false
		          },
		          (success, errorType) => {
		            printWindow.close();
		            if (!success) {
		              reject(new Error(errorType || "打印失败"));
		            } else {
		              resolve(true);
		            }
		          }
		        );
		      });
		    });
		  });

	  createWindow();
	  app.on("activate", () => {
	    if (BrowserWindow.getAllWindows().length === 0) {
	      createWindow();
	    }
	  });
	});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
