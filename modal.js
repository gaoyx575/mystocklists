// ====== 弹窗逻辑 ======
let editingId = null;
let isNewMode = false;

// 兜底默认值，防止 settings 未定义
const DEFAULT_CATEGORIES = ['个护', '化妆品', '清洁', '药品', '猫咪', '衣物', '厨房', '杂物', '闲置'];
const DEFAULT_STATUSES = ['🟢 正常', '🟡 优先消耗', '🔴 有存货', '🔵 闲置'];
const DEFAULT_REASONS = ['用完不再买', '优先消耗', '暂不处理', '已送人', '已转卖', '其他'];

function getCategoryOptions(selected) {
    const cats = (typeof settings !== 'undefined' && settings?.categories) ? settings.categories : DEFAULT_CATEGORIES;
    let html = '';
    cats.forEach(c => {
        const sel = c === selected ? 'selected' : '';
        const icon = getCategoryIcon(c);
        const displayText = icon ? `${icon} ${c}` : c;
        html += `<option value="${c}" ${sel}>${displayText}</option>`;
    });
    return html;
}

function getStatusOptions(selected) {
    const statuses = (typeof settings !== 'undefined' && settings?.statuses) ? settings.statuses : DEFAULT_STATUSES;
    let html = '';
    statuses.forEach(s => {
        const sel = s === selected ? 'selected' : '';
        html += `<option value="${s}" ${sel}>${s}</option>`;
    });
    return html;
}

function getReasonOptions(selected) {
    const reasons = (typeof settings !== 'undefined' && settings?.reasons) ? settings.reasons : DEFAULT_REASONS;
    let html = '<option value="">— 请选择 —</option>';
    reasons.forEach(r => {
        const sel = r === selected ? 'selected' : '';
        html += `<option value="${r}" ${sel}>${r}</option>`;
    });
    return html;
}

// ====== 根据字段配置生成表单 ======
function getFieldOptions(fieldKey, selected) {
    let options = [];
    if (fieldKey === 'category') {
        options = settings?.categories || [];
    } else if (fieldKey === 'status') {
        options = settings?.statuses || [];
    } else if (fieldKey === 'reason') {
        options = settings?.reasons || [];
    } else {
        options = settings?.[fieldKey + '_options'] || [];
    }
    let html = '';
    options.forEach(o => {
        let value = o;
        let label = o;
        if (typeof o === 'object' && o !== null) {
            value = o.name || o;
            label = o.icon ? `${o.icon} ${o.name}` : o.name;
        }
        // 添加图标
        var icon = getCategoryIcon(value);
        var displayLabel = icon ? icon + ' ' + label : label;
        const sel = value === selected ? 'selected' : '';
        html += '<option value="' + value + '" ' + sel + '>' + displayLabel + '</option>';
    });
    return html;
}

function buildFormFromFields(itemData) {
    const fields = getFields();
    const visibleFields = fields.filter(f => f.visible);
    const rows = [];
    let currentRow = [];

    visibleFields.forEach((f, index) => {
        const value = itemData ? (itemData[f.key] || '') : '';
        const inputId = 'm_' + f.key;

        let inputHtml = '';
        if (f.type === 'select') {
            const optHtml = getFieldOptions(f.key, value);
            inputHtml = `<select id="${inputId}">${optHtml}</select>`;
        } else if (f.type === 'number') {
            inputHtml = `<input type="number" id="${inputId}" value="${value || 0}" step="1">`;
        } else if (f.type === 'date') {
            inputHtml = `<input type="date" id="${inputId}" value="${value}">`;
        } else if (f.type === 'textarea') {
            inputHtml = `<textarea id="${inputId}" rows="2" style="width:100%;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;font-family:inherit;">${value}</textarea>`;
        } else {
            inputHtml = `<input type="text" id="${inputId}" value="${value}" placeholder="请输入${f.label}">`;
        }

        currentRow.push(`
            <div>
                <label>${f.label}</label>
                ${inputHtml}
            </div>
        `);

        if (currentRow.length >= 4 || index === visibleFields.length - 1) {
            rows.push(`<div class="form-row">${currentRow.join('')}</div>`);
            currentRow = [];
        }
    });

    return rows.join('');
}

function openAddModal() {
    isNewMode = true;
    editingId = null;
    document.getElementById('modalTitle').textContent = '＋ 新增物品';
    document.getElementById('modalSaveBtn').textContent = '💾 添加';
    document.getElementById('modalEditHint').textContent = '';

    const container = document.querySelector('.modal-box .form-rows-container');
    if (container) {
        container.innerHTML = buildFormFromFields(null);
    }

    document.getElementById('editModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        const firstInput = document.querySelector('.modal-box input:not([type="hidden"]), .modal-box select, .modal-box textarea');
        if (firstInput) firstInput.focus();
    }, 300);
}

function openEditModal(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    isNewMode = false;
    editingId = id;
    document.getElementById('modalTitle').textContent = '✏️ 编辑：' + item.name;
    document.getElementById('modalSaveBtn').textContent = '💾 保存修改';
    document.getElementById('modalEditHint').textContent = '';

    const container = document.querySelector('.modal-box .form-rows-container');
    if (container) {
        container.innerHTML = buildFormFromFields(item);
    }

    document.getElementById('editModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        const firstInput = document.querySelector('.modal-box input:not([type="hidden"]), .modal-box select, .modal-box textarea');
        if (firstInput) firstInput.focus();
    }, 300);
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    document.body.style.overflow = '';
    editingId = null;
    isNewMode = false;
}

function saveModalItem() {
    const fields = getFields();
    const visibleFields = fields.filter(f => f.visible);
    const itemData = {};
    let hasName = false;

    visibleFields.forEach(f => {
        const inputId = 'm_' + f.key;
        const el = document.getElementById(inputId);
        if (!el) return;
        let value = el.value;
        if (f.type === 'number') {
            value = parseFloat(value) || 0;
        } else {
            value = value.trim();
        }
        itemData[f.key] = value;
        if (f.key === 'name' && value) hasName = true;
    });

    if (!hasName) { alert('请填写物品名称'); return; }

    if (isNewMode) {
        items.push({ id: Date.now(), ...itemData });
    } else {
        const idx = items.findIndex(i => i.id === editingId);
        if (idx === -1) { alert('数据异常'); return; }
        items[idx] = { ...items[idx], ...itemData };
    }
    saveData();
    closeModal();
}