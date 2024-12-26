window.addEventListener('DOMContentLoaded', async () => {
    
    console.log("Renderer process loaded successfully.");
    const executeButton = document.getElementById('execute-query');
    const resultArea = document.getElementById('result');
    const databaseNameElement = document.getElementById('database-name');
    const clearButton = document.getElementById('clear-screen');
    const connectBtn = document.getElementById('connect-btn');
    const loadingMask = document.getElementById('loading-mask');

    if (window.location.pathname.includes("query.html")) {
        // 如果是 query.html 頁面，顯示 "連線成功" 的 snackbar
        showSnackbar("資料庫連線成功", "success");
    }

    // 連線資料庫
    connectBtn?.addEventListener('click', async () => {
        connectBtn.disabled = true;
        connectBtn.style.backgroundColor = "#ddd";
        loadingMask.classList.remove('hidden');

        // 取得使用者輸入的 Server IP 或名稱和 Port（在同一欄位中）
        const serverIpPort = document.getElementById('server-ip-port').value.trim();  // 假設這是合併的輸入欄位
        const [server, port] = serverIpPort.split(',').map(item => item.trim());

        if (!server) {
            showSnackbar("請輸入有效的 Server IP 或名稱", 'error');
            connectBtn.disabled = false;
            connectBtn.style.backgroundColor = "#4CAF50";
            loadingMask.classList.add('hidden');
            return;
        }

        // 設置 port，如果沒有輸入則使用預設值 1433
        const portNumber = port ? parseInt(port) : 1433;
        if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
            showSnackbar("請輸入有效的 Port（1-65535）", 'error');
            connectBtn.disabled = false;
            connectBtn.style.backgroundColor = "#4CAF50";
            loadingMask.classList.add('hidden');
            return;
        }


        const dbConfig = {
            server: server,  // 使用解析出的 server
            port: portNumber,  // 使用解析出的 port
            database: document.getElementById('database').value,
            options: {
                encrypt: false,
                instanceName: document.getElementById('instanceName').value
            },
            authentication: {
                options: {
                    userName: document.getElementById('userName').value,
                    password: document.getElementById('password').value
                }
            }
        };

        //儲存設定
        const saveResult = await window.api.saveDbConfig(dbConfig);
        if (!saveResult.success) {
            showSnackbar(`連線設定失敗: ${saveResult.message}`, 'error');
            connectBtn.style.backgroundColor = "#4CAF50";
            connectBtn.disabled = false;
            loadingMask.classList.add('hidden');
            return;
        } else {
            showSnackbar(`連線設定成功, 正在連線中...`, 'loading');
        }

        //測試連線
        const connectResult = await window.api.connectToDatabase(dbConfig);
        if (connectResult.success) {
            window.api.navigateToQueryPage();
        } else {
            showSnackbar(`連線失敗: ${connectResult.message}`, 'error');
            connectBtn.style.backgroundColor = "#4CAF50";
            connectBtn.disabled = false;
            loadingMask.classList.add('hidden');
        }
    });

    // 查詢按鈕事件
    executeButton?.addEventListener('click', async () => {
        resultArea.innerHTML = `
            <div class="loading-spinner">
            <div class="spinner"></div>
            執行中...
            </div>
        `;

        const query = `
        SELECT r.session_id,
                r.status AS [指令狀態],
                r.command AS [指令類型],
                r.wait_time/1000.0 AS [等待時間(秒)],
                s.client_interface_name AS [連線資料庫的驅動程式],
                s.host_name AS [電腦名稱],
                s.program_name AS [執行程式名稱],
                t.text AS [執行的SQL語法],
                r.blocking_session_id AS [被鎖定卡住的session_id]
            FROM sys.dm_exec_requests r
        INNER JOIN sys.dm_exec_sessions s
                ON r.session_id = s.session_id
        CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
            WHERE s.is_user_process = 1;
        `;

        try {
            const results = await window.api.executeQuery(query);
            // 畫面顯示資料庫名稱
            const databaseName = await window.api.getDatabaseName();
            if (databaseNameElement) databaseNameElement.innerText = databaseName;
            resultArea.innerHTML = generateTable(results);
        } catch (error) {
            resultArea.innerText = '錯誤: ' + error.message;
        }
    });

    // 清除查詢結果
    clearButton?.addEventListener('click', () => {
        resultArea.innerHTML = '';
    });

    // 展開/隱藏長文字
    resultArea?.addEventListener('click', (event) => {
        if (event.target.classList.contains('expand-btn')) {
            const btn = event.target;
            const cell = btn.parentElement;
            const shortText = cell.querySelector('.short-text');
            const fullText = cell.querySelector('.full-text');

            shortText.classList.toggle('hidden');
            fullText.classList.toggle('hidden');
            btn.innerText = fullText.classList.contains('hidden') ? '顯示更多' : '隱藏';
        }
    });

    // 監聽 Kill Session 按鈕事件
    resultArea?.addEventListener('click', async (event) => {
        if (event.target.classList.contains('kill-session-btn')) {
            const sessionId = event.target.dataset.sessionId;

            const confirmation = confirm(`確定要終止 Session ${sessionId} 嗎？`);
            if (!confirmation) return;

            try {
                const result = await window.api.killSession(sessionId);
                if (result.success) {
                    showSnackbar(result.message, 'success');
                    event.target.closest('tr').remove(); // 刪除該行
                } else {
                    showSnackbar(result.message, 'error');
                }
            } catch (error) {
                showSnackbar(`終止失敗: ${error.message}`, 'error');
            }
        }
    });

    // 生成結果表格
    function generateTable(data) {
        if (!data || data.length === 0) return '<p>沒有查詢結果</p>';

        let table = '<div class="result-table-container"><table class="result-table"><thead><tr>';
        const headers = Object.keys(data[0]);
        headers.forEach(header => {
            table += `<th>${header}</th>`;
        });
        table += '<th>操作</th>'; // 增加操作列
        table += '</tr></thead><tbody>';

        data.forEach(row => {
            table += '<tr>';
            headers.forEach(header => {
                const cellData = row[header] != null ? row[header].toString() : ""; // 確保空值不會出錯
                const shortenedData = cellData.length > 20 ? cellData.slice(0, 20) + "..." : cellData;

                table += `<td>
                            <span class="short-text">${shortenedData}</span>
                            ${cellData.length > 20 ? `<button class="expand-btn">顯示更多</button>` : ""}
                            <span class="full-text hidden">${cellData}</span>
                          </td>`;
            });
            // 新增 Kill Session 按鈕
            table += `<td><button class="kill-session-btn" data-session-id="${row.session_id}">Kill Session</button></td>`;
            table += '</tr>';
        });

        table += '</tbody></table></div>';
        return table;
    }

    // 顯示 Snackbar 訊息
    function showSnackbar(message, type) {
        const snackbar = document.getElementById('snackbar');
        snackbar.textContent = message;

        // 根據 type 設定不同的顏色
        if (type === 'success') {
            snackbar.style.backgroundColor = '#4CAF50';  // 綠色
        } else if (type === 'error') {
            snackbar.style.backgroundColor = '#f44336';  // 紅色
        } else if (type === 'loading') {
            snackbar.style.backgroundColor = '#f5af36';  // 橘色
        }

        // 顯示 Snackbar
        snackbar.className = 'show';

        // 5 秒後隱藏
        setTimeout(() => {
            snackbar.className = snackbar.className.replace('show', '');
        }, 5000);
    }

});
