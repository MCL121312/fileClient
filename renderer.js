	const information = document.getElementById("info");
	information.innerText = `This app is using Chrome (v${window.versions.chrome()}), Node.js (v${window.versions.node()}), and Electron (v${window.versions.electron()})`;

	const func = async () => {
	  const response = await window.versions.ping();
	  console.log(response); // 打印 'pong'
	};

	func();

	const printerSelect = document.getElementById("printerSelect");
	const btnLoadPrinters = document.getElementById("btnLoadPrinters");
	const btnSelectFiles = document.getElementById("btnSelectFiles");
	const btnClearAll = document.getElementById("btnClearAll");
	const btnPrint = document.getElementById("btnPrint");
	const printStatus = document.getElementById("printStatus");
	const pendingFileList = document.getElementById("pendingFileList");

	let pendingFiles = [];

	const renderPendingFiles = () => {
	  if (!pendingFileList) return;
	  pendingFileList.innerHTML = "";
	  if (pendingFiles.length === 0) {
	    const li = document.createElement("li");
	    li.textContent = "（无待打印文件）";
	    pendingFileList.appendChild(li);
	    return;
	  }
	  pendingFiles.forEach((filePath, index) => {
	    const li = document.createElement("li");
	    const fileName = filePath.split(/[/\\]/).pop() || filePath;

	    const textSpan = document.createElement("span");
	    textSpan.textContent = `${index + 1}. ${fileName}`;
	    textSpan.title = filePath;
	    li.appendChild(textSpan);

	    const deleteBtn = document.createElement("button");
	    deleteBtn.textContent = "删除";
	    deleteBtn.addEventListener("click", (event) => {
	      event.stopPropagation();
	      pendingFiles.splice(index, 1);
	      renderPendingFiles();
	      if (printStatus) {
	        if (pendingFiles.length === 0) {
	          printStatus.textContent = "当前无待打印文件";
	        } else {
	          printStatus.textContent = `当前 ${pendingFiles.length} 个待打印文件`;
	        }
	      }
	    });
	    li.appendChild(deleteBtn);

	    pendingFileList.appendChild(li);
	  });
	};

	if (pendingFileList) {
	  renderPendingFiles();
	}

	if (btnLoadPrinters && printerSelect && printStatus && window.printer) {
	  const loadPrinters = async () => {
	    printStatus.textContent = "正在获取打印机列表...";
	    try {
	      const printers = await window.printer.getPrinters();
	      printerSelect.innerHTML = "";
	      printers.forEach((printer) => {
	        const option = document.createElement("option");
	        option.value = printer.name;
	        option.textContent = printer.displayName || printer.name;
	        printerSelect.appendChild(option);
	      });
	      if (printers.length === 0) {
	        printStatus.textContent = "未找到可用的打印机";
	      } else {
	        printStatus.textContent = `已获取 ${printers.length} 台打印机`;
	      }
	    } catch (error) {
	      console.error(error);
	      printStatus.textContent = `获取打印机失败：${error.message || error}`;
	    }
	  };

	  // 点击按钮刷新列表
	  btnLoadPrinters.addEventListener("click", loadPrinters);

	  // 启动程序后默认刷新一次列表
	  loadPrinters();
	}

	if (btnSelectFiles && pendingFileList && printStatus && window.printer) {
	  btnSelectFiles.addEventListener("click", async () => {
	    try {
	      const files = await window.printer.selectFiles();
	      if (!files || files.length === 0) {
	        printStatus.textContent = "未选择任何文件";
	        return;
	      }
	      const existing = new Set(pendingFiles);
	      files.forEach((filePath) => {
	        if (!existing.has(filePath)) {
	          pendingFiles.push(filePath);
	        }
	      });
	      renderPendingFiles();
	      printStatus.textContent = `已添加 ${files.length} 个文件到待打印列表`;
	    } catch (error) {
	      console.error(error);
	      printStatus.textContent = `选择文件失败：${error.message || error}`;
	    }
	  });
	}

	if (btnClearAll && pendingFileList && printStatus) {
	  btnClearAll.addEventListener("click", () => {
	    if (!pendingFiles || pendingFiles.length === 0) {
	      printStatus.textContent = "当前没有待清空的文件";
	      return;
	    }
	    pendingFiles = [];
	    renderPendingFiles();
	    printStatus.textContent = "已清空待打印列表";
	  });
	}

	if (btnPrint && printerSelect && printStatus && window.printer) {
	  btnPrint.addEventListener("click", async () => {
	    const printerName = printerSelect.value;
	    if (!printerName) {
	      printStatus.textContent = "请先选择打印机";
	      return;
	    }

	    if (!pendingFiles || pendingFiles.length === 0) {
	      printStatus.textContent = "请先选择要打印的文件";
	      return;
	    }

	    const filesToPrint = [...pendingFiles];
	    printStatus.textContent = "正在按顺序打印...";
	    try {
	      for (let i = 0; i < filesToPrint.length; i++) {
	        const filePath = filesToPrint[i];
	        printStatus.textContent = `正在打印 (${i + 1}/${filesToPrint.length})：${filePath}`;
	        // 逐个等待，保证顺序打印
	        await window.printer.printFile(filePath, printerName);
	      }
	      printStatus.textContent = `已完成 ${filesToPrint.length} 个文件的打印`;
	      pendingFiles = [];
	      renderPendingFiles();
	    } catch (error) {
	      console.error(error);
	      printStatus.textContent = `打印失败：${error.message || error}`;
	    }
	  });
	}