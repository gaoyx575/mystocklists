// ====== 备份定时器 ======
let timerInterval = null;
let countdownSeconds = 180;
let currentCountdown = 180;

function getTimerConfig() {
    const timer = settings?.timer;
    return timer;
}

function startTimer() {
    const config = getTimerConfig();
    const interval = config.interval;

    // 如果元素不存在，等待一下再执行
    if (!document.getElementById('countdownDisplay')) {
        setTimeout(startTimer, 300);
        return;
    }
    // 安全加载设置
    try {
        if (typeof loadSettings === 'function') {
            loadSettings();
        }
    } catch (e) {
        console.warn('加载设置失败：', e);
    }

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // 如果 settings 还没定义，直接读取 localStorage
    if (typeof settings === 'undefined' || !settings) {
        try {
            const raw = localStorage.getItem('myStockSettings');
            if (raw) {
                window.settings = JSON.parse(raw);
            }
        } catch (e) { }
    }

    if (!config.enabled) {
        const dot = document.getElementById('timerDot');
        if (dot) dot.className = 'status-dot';
        document.getElementById('timerLabel').textContent = '⏱ 备份提醒已关闭';
        document.getElementById('countdownDisplay').textContent = '--:--';
        return;
    }

    countdownSeconds = (config.interval) * 60;
    currentCountdown = countdownSeconds;
    updateTimerDisplay();
    document.getElementById('timerLabel').textContent = '⏱ 每' + (config.interval) + '分钟提醒备份';
    const dot = document.getElementById('timerDot');
    if (dot) dot.className = 'status-dot running';

    if (timerInterval) {
        clearInterval(timerInterval);
    }
    timerInterval = setInterval(function () {
        currentCountdown--;
        updateTimerDisplay();
        if (currentCountdown <= 0) {
            triggerBackupReminder();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const el = document.getElementById('countdownDisplay');
    if (!el) return;
    const minutes = Math.floor(currentCountdown / 60);
    const seconds = currentCountdown % 60;
    el.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function resetTimer() {
    const config = getTimerConfig();
    const interval = config.interval || 3;
    // 重新设置倒计时秒数
    countdownSeconds = interval * 60;
    currentCountdown = countdownSeconds;
    updateTimerDisplay();
    const dot = document.getElementById('timerDot');
    if (dot) dot.className = 'status-dot running';
    document.getElementById('timerLabel').textContent = '⏱ 每' + interval + '分钟提醒备份';
}

function triggerBackupReminder() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (items.length === 0) {
        resetTimer();
        startTimer();
        return;
    }

    const dot = document.getElementById('timerDot');
    if (dot) dot.className = 'status-dot saving';
    document.getElementById('timerLabel').textContent = '💾 准备备份...';

    const now = new Date();
    const timeStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + '-' +
        String(now.getMinutes()).padStart(2, '0');
    const fileName = '囤货清单_' + timeStr + '.json';

    alert(
        '📤 即将备份当前数据\n\n' +
        '📄 文件名：' + fileName + '\n' +
        '📦 数据条数：' + items.length + ' 条'
    );

    doBackupWithName(fileName);
}

function doBackupWithName(fileName) {
    try {
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

        document.getElementById('timerLabel').textContent = '✅ 已备份：' + fileName;
        resetTimer();
        startTimer();
    } catch (e) {
        alert('备份失败：' + e.message);
        resetTimer();
        startTimer();
    }
}

// ====== 供设置页调用重启定时器 ======
function restartTimer() {
    startTimer();
}

// ====== 导入 ======
function importFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) {
                alert('文件格式错误：根数据必须是数组');
                return;
            }
            if (data.length === 0) {
                alert('文件中没有数据');
                return;
            }
            if (!data[0].hasOwnProperty('name') && !data[0].hasOwnProperty('具体物品')) {
                alert('数据格式不匹配：缺少 "name" 或 "具体物品" 字段');
                return;
            }
            const newItems = data.map((item, i) => ({
                id: item.id || Date.now() + i,
                category: item['品类分区'] || item.category || '',
                name: item['具体物品'] || item.name || '',
                qty: item['数量'] !== undefined ? item['数量'] : (item.qty || 0),
                price: item['入手价'] || item.price || '',
                spec: item['色号'] && typeof item['色号'] === 'object' ? JSON.stringify(item['色号']) : (item['色号'] || item.spec || ''),
                status: item['状态'] || item.status || '待更新',
                reason: item['原因'] || item.reason || '',
                lastUsed: item['上次使用日期'] || item.lastUsed || '',
                note: item['备注'] || item.note || ''
            }));
            items = newItems;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            render();
            alert(`✅ 导入成功！共 ${items.length} 条数据`);
            document.getElementById('fileInput').value = '';
            document.getElementById('timerLabel').textContent = '✅ 数据已更新';
            resetTimer();
            startTimer();
        } catch (error) {
            alert('❌ 文件解析失败：' + error.message);
            resetTimer();
            startTimer();
        }
    };
    reader.readAsText(file, 'UTF-8');
}

// ====== 导出 ======
function exportData() {
    if (items.length === 0) { alert('没有数据可导出'); return; }
    const now = new Date();
    const timeStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + '-' +
        String(now.getMinutes()).padStart(2, '0');
    const fileName = '囤货清单_' + timeStr + '.json';
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}