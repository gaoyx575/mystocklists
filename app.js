// ====== 筛选 ======
function setStatusFilter(status) {
    document.getElementById('statusFilter').value = status;
    render();
}

function setCategoryFilter(category) {
    document.getElementById('filterCategory').value = category;
    render();
}

function clearFilters() {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterKeyword').value = '';
    document.getElementById('statusFilter').value = '';
    render();
}

// ====== 删除 ======
function deleteItem(id) {
    if (!confirm('确定要删除吗？')) return;
    items = items.filter(i => i.id !== id);
    saveData();
}

// ====== 渲染 ======
function render() {
    // 获取字段配置
    const fields = getFields();
    const visibleFields = fields.filter(f => f.visible && f.key !== 'classification');
    // 右上角总件数 + 囤货率 + 闲置率
    const total = items.length;
    const idle = items.filter(i => i.status && i.status.includes('🔵')).length;
    const idleRate = total > 0 ? Math.round((idle / total) * 100) : 0;
    const stockCount = items.filter(i => i.status && i.status.includes('🔴')).length;
    const stockRate = total > 0 ? Math.round((stockCount / total) * 100) : 0;
    document.getElementById('countBadge').textContent = items.length + ' 件 ｜ 囤货率 ' + stockRate + '% ｜ 闲置率 ' + idleRate + '%';

    // ====== 动态生成状态下拉 ======
    const statusSelect = document.getElementById('statusFilter');
    const currentStatusVal = statusSelect.value;
    const statusList = settings?.statuses || [];
    let statusOptions = '<option value="">全部状态</option>';
    statusList.forEach(s => {
        const selected = s === currentStatusVal ? 'selected' : '';
        statusOptions += `<option value="${s}" ${selected}>${s}</option>`;
    });
    statusSelect.innerHTML = statusOptions;

    // ====== 动态生成统计卡片 ======
    const currentStatus = document.getElementById('statusFilter').value;
    let statsHtml = `<div class="stat-item ${currentStatus === '' ? 'active' : ''}" onclick="setStatusFilter('')">📦总数<span>${total}</span></div>`;
    statusList.forEach(s => {
        const count = items.filter(i => i.status === s).length;
        statsHtml += `<div class="stat-item ${currentStatus === s ? 'active' : ''}" onclick="setStatusFilter('${s}')">${s}<span>${count}</span></div>`;
    });
    document.getElementById('statsContainer').innerHTML = statsHtml;

    // ====== 动态生成品类下拉 ======
    // ====== 动态生成品类下拉 ======
    const catSelect = document.getElementById('filterCategory');
    const currentCatVal = catSelect.value;
    const catList = settings?.categories || [];
    let catOptions = '<option value="">全部</option>';
    catList.forEach(c => {
        const selected = c === currentCatVal ? 'selected' : '';
        const icon = getCategoryIcon(c);
        const displayName = icon ? `${icon} ${c}` : c;
        catOptions += `<option value="${c}" ${selected}>${displayName}</option>`;
    });
    catSelect.innerHTML = catOptions;

    // ====== 筛选 ======
    const cat = document.getElementById('filterCategory').value;
    const kw = document.getElementById('filterKeyword').value.trim().toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let filtered = items.filter(item => {
        if (cat && item.category !== cat) return false;
        if (kw && !item.name.toLowerCase().includes(kw)) return false;
        if (statusFilter && item.status !== statusFilter) return false;
        return true;
    });

    filtered.sort((a, b) => {
        const catA = a.category || '';
        const catB = b.category || '';
        const nameA = a.name || '';
        const nameB = b.name || '';
        return catA.localeCompare(catB) || nameA.localeCompare(nameB);
    });

    // ====== 品类标签 ======
    // ====== 品类标签 ======
    const currentCat = document.getElementById('filterCategory').value;

    const oldTag = document.querySelector('.category-tags');
    if (oldTag) oldTag.remove();

    if (catList.length > 0) {
        let tagHtml = `<div class="category-tags">`;
        tagHtml += `<span class="cat-tag ${currentCat === '' ? 'active' : ''}" onclick="setCategoryFilter('')">📋 全部</span>`;
        catList.forEach(c => {
            const count = items.filter(i => i.category === c).length;
            const activeClass = currentCat === c ? 'active' : '';
            const safeCat = c.replace(/'/g, "\\'");
            const icon = getCategoryIcon(c);
            const displayName = icon ? `${icon} ${c}` : c;
            tagHtml += `<span class="cat-tag ${activeClass}" onclick="setCategoryFilter('${safeCat}')">${displayName} <span class="count">${count}</span></span>`;
        });
        tagHtml += `</div>`;
        const filterBar = document.querySelector('.filter-bar');
        if (filterBar) {
            filterBar.insertAdjacentHTML('beforebegin', tagHtml);
        }
    }

    // ====== 渲染列表 ======
    const container = document.getElementById('itemList');
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty">📭 没有匹配的物品</div>`;
        return;
    }

    let html = '';
    filtered.forEach(item => {
        const catIcon = getCategoryIcon(item.category);

        // 名称字号自适应（根据名称长度）
        const nameLen = (item.name || '').length;
        let nameFontSize = 14;
        if (nameLen > 4) nameFontSize = 13;
        if (nameLen > 8) nameFontSize = 12;
        if (nameLen > 12) nameFontSize = 11;
        if (nameLen > 16) nameFontSize = 10;

        // 根据状态确定卡片底色
        let cardBg = '#ffffff';
        if (item.status && item.status.includes('🟢')) cardBg = '#E8F5E9';
        else if (item.status && item.status.includes('🟡')) cardBg = '#FFF3E0';
        else if (item.status && item.status.includes('🔴')) cardBg = '#E3F2FD';
        else if (item.status && item.status.includes('🔵')) cardBg = '#F5F5F5';

        // ====== 获取可见字段 ======
        const fields = getFields();
        const visibleFields = fields.filter(f => f.visible && f.key !== 'classification');

        // ====== 动态生成卡片内容 ======
        let infoHtml = '';
        visibleFields.forEach(f => {
            if (f.key === 'name') return;
            if (f.key === 'category' || f.key === 'status') return;
            const value = item[f.key];
            let displayValue = (value === undefined || value === null || value === '') ? '<span style="color:#ef4444;">未填</span>' : value;
            if (f.key === 'qty') {
                displayValue = '×' + (value || 0);
            } else if (f.key === 'price') {
                displayValue = '💰 ' + (value || '0');
            } else if (f.key === 'lastUsed' && value) {
                displayValue = '📅 ' + value;
            }
            infoHtml += `<span class="meta-item">${displayValue}</span>`;
        });
        const nameDisplay = `<span class="name" style="font-size:${nameFontSize}px !important;">${item.name || '未命名'}</span>`;
        html += `
            <div class="item-card" style="background:${cardBg};">
                <div class="card-inner">
                    <div class="card-icon">
                        <span class="icon-emoji">${catIcon}</span>
                    </div>
                    <div class="card-content">
                        <div class="info-row">
                            ${nameDisplay}
                            ${infoHtml}
                        </div>
                        <div class="actions">
                            <button class="btn btn-outline btn-sm" onclick="openEditModal(${item.id})">✏️</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}