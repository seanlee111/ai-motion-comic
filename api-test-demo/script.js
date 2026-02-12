document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const urlInput = document.getElementById('url');
    const methodSelect = document.getElementById('method');
    const sendBtn = document.getElementById('sendBtn');
    const headersList = document.getElementById('headersList');
    const addHeaderBtn = document.getElementById('addHeaderBtn');
    const requestBody = document.getElementById('requestBody');
    const formatJsonBtn = document.getElementById('formatJsonBtn');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    
    // Response Elements
    const statusSpan = document.getElementById('status');
    const timeSpan = document.getElementById('time');
    const responseBody = document.getElementById('responseBody');
    const responseHeaders = document.getElementById('responseHeaders');
    const clearResultBtn = document.getElementById('clearResultBtn');

    // Tab Switching Logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    document.querySelectorAll('.res-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.res-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.res-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Header Management
    function createHeaderRow(key = '', value = '') {
        const row = document.createElement('div');
        row.className = 'header-row';
        row.innerHTML = `
            <input type="text" class="header-key" placeholder="Key" value="${key}">
            <input type="text" class="header-value" placeholder="Value" value="${value}">
            <button class="danger-btn small-btn remove-header">×</button>
        `;
        row.querySelector('.remove-header').addEventListener('click', () => row.remove());
        headersList.appendChild(row);
    }

    addHeaderBtn.addEventListener('click', () => createHeaderRow());
    
    // Default Header
    createHeaderRow('Content-Type', 'application/json');

    // JSON Formatting
    formatJsonBtn.addEventListener('click', () => {
        try {
            const json = JSON.parse(requestBody.value);
            requestBody.value = JSON.stringify(json, null, 2);
        } catch (e) {
            alert('无效的 JSON 格式');
        }
    });

    // History Management
    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('apiTestHistory') || '[]');
        historyList.innerHTML = '';
        history.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <span><strong>${item.method}</strong> ${item.url}</span>
                <span style="font-size: 0.8rem; color: #666;">${new Date(item.timestamp).toLocaleTimeString()}</span>
            `;
            li.addEventListener('click', () => restoreHistory(item));
            historyList.appendChild(li);
        });
    }

    function saveHistory(config) {
        let history = JSON.parse(localStorage.getItem('apiTestHistory') || '[]');
        config.timestamp = Date.now();
        history.unshift(config);
        if (history.length > 5) history.pop();
        localStorage.setItem('apiTestHistory', JSON.stringify(history));
        loadHistory();
    }

    function restoreHistory(item) {
        urlInput.value = item.url;
        methodSelect.value = item.method;
        requestBody.value = item.body || '';
        
        headersList.innerHTML = '';
        if (item.headers) {
            Object.entries(item.headers).forEach(([k, v]) => createHeaderRow(k, v));
        }
    }

    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('apiTestHistory');
        loadHistory();
    });

    loadHistory();

    // Send Request
    sendBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const method = methodSelect.value;
        
        if (!url) {
            alert('请输入 API URL');
            return;
        }

        // Collect Headers
        const headers = {};
        document.querySelectorAll('.header-row').forEach(row => {
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            if (key) headers[key] = value;
        });

        // Collect Body
        let body = null;
        if (['POST', 'PUT'].includes(method) && requestBody.value.trim()) {
            try {
                // Validate JSON if Content-Type is application/json
                if (headers['Content-Type']?.includes('application/json')) {
                    JSON.parse(requestBody.value);
                }
                body = requestBody.value;
            } catch (e) {
                alert('JSON 格式错误: ' + e.message);
                return;
            }
        }

        // Save to history
        saveHistory({ url, method, headers, body });

        // Reset Display
        statusSpan.className = 'status-tag';
        statusSpan.textContent = 'Status: Loading...';
        timeSpan.textContent = 'Time: -';
        responseBody.textContent = '';
        responseHeaders.textContent = '';
        sendBtn.disabled = true;

        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const res = await fetch(url, {
                method,
                headers,
                body,
                signal: controller.signal
            });

            const duration = Date.now() - startTime;
            clearTimeout(timeoutId);

            // Update Status
            statusSpan.textContent = `Status: ${res.status} ${res.statusText}`;
            statusSpan.classList.add(res.ok ? 'status-success' : 'status-error');
            timeSpan.textContent = `Time: ${duration} ms`;

            // Display Headers
            const resHeadersObj = {};
            res.headers.forEach((v, k) => resHeadersObj[k] = v);
            responseHeaders.textContent = JSON.stringify(resHeadersObj, null, 2);

            // Display Body
            const contentType = res.headers.get('content-type');
            const text = await res.text();
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    const json = JSON.parse(text);
                    responseBody.textContent = JSON.stringify(json, null, 2);
                } catch {
                    responseBody.textContent = text;
                }
            } else {
                responseBody.textContent = text;
            }

        } catch (error) {
            statusSpan.textContent = 'Error: ' + error.message;
            statusSpan.classList.add('status-error');
            responseBody.textContent = error.name === 'AbortError' ? '请求超时 (30s)' : error.stack;
        } finally {
            sendBtn.disabled = false;
        }
    });

    clearResultBtn.addEventListener('click', () => {
        statusSpan.textContent = 'Status: -';
        statusSpan.className = 'status-tag';
        timeSpan.textContent = 'Time: - ms';
        responseBody.textContent = '';
        responseHeaders.textContent = '';
    });
});
