// ====== 数据层 ======
// 使用 var 避免重复声明报错
var items = [];
var STORAGE_KEY = 'myStockList';
var DATA_FILE = 'data.json';

// ====== 设置数据 ======
var SETTINGS_KEY = 'myStockSettings';

var DEFAULT_SETTINGS = {
    categories: ['个护', '化妆品', '清洁', '药品', '猫咪', '衣物', '厨房', '杂物', '闲置'],
    statuses: ['🟢 正常', '🟡 优先消耗', '🔴 有存货', '🔵 闲置'],
    reasons: ['用完不再买', '优先消耗', '暂不处理', '已送人', '已转卖', '其他'],
    notePresets: ['位置：', '到期日：', '需维修', '已打包', '注意：', '待补充'],
    timer: {
        interval: 5,
        enabled: true
    }
};

var settings = {};

function loadSettings() {
    try {
        var raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            var parsed = JSON.parse(raw);
            settings = { ...DEFAULT_SETTINGS, ...parsed };
        } else {
            settings = { ...DEFAULT_SETTINGS };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        }
    } catch (e) {
        settings = { ...DEFAULT_SETTINGS };
    }
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

loadSettings();

// ====== 字段管理 ======
var DEFAULT_FIELDS = [
    { key: 'name', label: '具体物品', visible: true, builtin: true, type: 'text' },
    { key: 'qty', label: '数量', visible: true, builtin: true, type: 'number' },
    { key: 'category', label: '品类分区', visible: true, builtin: true, type: 'select' },
    { key: 'price', label: '入手价', visible: true, builtin: true, type: 'text' },
    { key: 'spec', label: '色号/规格', visible: true, builtin: true, type: 'text' },
    { key: 'status', label: '状态', visible: true, builtin: true, type: 'select' },
    { key: 'reason', label: '原因', visible: true, builtin: true, type: 'select' },
    { key: 'lastUsed', label: '上次使用日期', visible: false, builtin: true, type: 'date' },
    { key: 'note', label: '备注', visible: true, builtin: true, type: 'textarea' }
];

function getFields() {
    var raw = localStorage.getItem('myStockFields');
    if (raw) {
        try {
            var saved = JSON.parse(raw);
            if (Array.isArray(saved) && saved.length > 0) {
                return saved;
            }
        } catch (e) { }
    }
    // 没有数据时返回默认值
    return DEFAULT_FIELDS;
}

function saveFields(fields) {
    localStorage.setItem('myStockFields', JSON.stringify(fields));
}

function migrateItemsForNewFields() {
    var fields = getFields();
    items.forEach(function (item) {
        var changed = false;
        fields.forEach(function (f) {
            if (!(f.key in item)) {
                item[f.key] = (f.key === 'qty') ? 0 : '无';
                changed = true;
            }
        });
        if (changed) {
            // 已修改
        }
    });
    if (changed) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
}

// ====== 数据加载 ======
function loadData() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.length > 0) {
                items = parsed;
                migrateItemsForNewFields(); // 补全新增字段的默认值
                var label = document.getElementById('dataSourceLabel');
                if (label) {
                    label.textContent = '✅ 缓存';
                    label.style.color = '#16a34a';
                }
                if (typeof render === 'function') {
                    render();
                }
                if (typeof startTimer === 'function') {
                    startTimer();
                }
                return;
            }
        }
    } catch (e) { }

    fetch(DATA_FILE)
        .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function (data) {
            if (Array.isArray(data) && data.length > 0) {
                items = data.map(function (item, i) {
                    return {
                        id: item.id || Date.now() + i,
                        category: item['品类分区'] || '',
                        name: item['具体物品'] || '',
                        qty: item['数量'] || 0,
                        price: item['入手价'] || '',
                        spec: item['色号'] && typeof item['色号'] === 'object' ? JSON.stringify(item['色号']) : (item['色号'] || ''),
                        status: item['状态'] || '待更新',
                        reason: item['原因'] || '',
                        lastUsed: item['上次使用日期'] || '',
                        note: item['备注'] || ''
                    };
                });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
                var label = document.getElementById('dataSourceLabel');
                if (label) {
                    label.textContent = '✅ data.json';
                    label.style.color = '#16a34a';
                }
                if (typeof render === 'function') {
                    render();
                }
                if (typeof startTimer === 'function') {
                    startTimer();
                }
            } else {
                var label = document.getElementById('dataSourceLabel');
                if (label) {
                    label.textContent = '⚠️ 空';
                    label.style.color = '#f59e0b';
                }
                items = [];
                if (typeof render === 'function') {
                    render();
                }
                if (typeof startTimer === 'function') {
                    startTimer();
                }
            }
        })
        .catch(function () {
            var label = document.getElementById('dataSourceLabel');
            if (label) {
                label.textContent = '❌ 未找到';
                label.style.color = '#ef4444';
            }
            items = [];
            if (typeof render === 'function') {
                render();
            }
            if (typeof startTimer === 'function') {
                startTimer();
            }
        });
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (typeof render === 'function') {
        render();
    }
}

// ====== 品类图标 ======
var ICON_POOL = ['🧴', '💄', '🧹', '💊', '🐱', '👗', '🍽️', '📦', '🔵', '🎯', '⭐', '🌟', '💎', '🎨', '🔧', '📌', '✂️', '🖍️', '📎', '🔗', '🧩', '🎮', '📚', '🎵', '🏷️', '🪴', '☕', '🍵', '🧸', '🎈', '🎁', '📿', '🧧', '🖼️', '🎐', '🧨', '🎄', '🎃', '🎆', '🎇', '🧁', '🍰', '🎂', '🍩', '🍪', '🧋', '🍫', '🍬', '🍭', '🧊', '🍉', '🍇', '🍓', '🍑', '🥝', '🍍', '🥥'];
var iconCache = {};

function getCategoryIcon(category) {
    if (!category) return '';

    // 如果已有缓存，直接返回
    if (iconCache[category]) {
        return iconCache[category];
    }

    // 获取所有已使用的图标
    var usedIcons = Object.values(iconCache);

    // 从图标池中找第一个未被使用的
    var assignedIcon = null;
    for (var i = 0; i < ICON_POOL.length; i++) {
        if (!usedIcons.includes(ICON_POOL[i])) {
            assignedIcon = ICON_POOL[i];
            break;
        }
    }

    // 如果图标池已用尽，返回空
    if (!assignedIcon) {
        return '';
    }

    iconCache[category] = assignedIcon;
    return assignedIcon;
}