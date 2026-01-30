// 資料庫
let contacts = [];
let currentFilter = '全部';
let editingId = null;
let capturedImage = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadContacts();
    renderContacts();
    renderFilterChips();
    
    // 搜尋功能
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderContacts(e.target.value);
    });

    // 註冊 Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
});

// 從 localStorage 載入聯絡人
function loadContacts() {
    const saved = localStorage.getItem('contacts');
    if (saved) {
        contacts = JSON.parse(saved);
    }
}

// 儲存到 localStorage
function saveContacts() {
    localStorage.setItem('contacts', JSON.stringify(contacts));
}

// 渲染聯絡人列表
function renderContacts(searchQuery = '') {
    const container = document.getElementById('contactList');
    
    let filtered = contacts;
    
    // 分類篩選
    if (currentFilter !== '全部') {
        filtered = filtered.filter(c => c.category === currentFilter);
    }
    
    // 搜尋篩選
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(query) ||
            (c.company && c.company.toLowerCase().includes(query)) ||
            (c.phone && c.phone.includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query))
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10-4h2v6h-2z"/>
                </svg>
                <p>${searchQuery ? '找不到符合的聯絡人' : '尚無聯絡人<br>點擊右下角按鈕掃描名片'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(contact => `
        <div class="contact-card" onclick="viewContact(${contact.id})">
            <div class="contact-header">
                <div class="contact-avatar">
                    ${contact.image ? `<img src="${contact.image}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : contact.name[0].toUpperCase()}
                </div>
                <div class="contact-info">
                    <div class="contact-name">${contact.name}</div>
                    <div class="contact-details">
                        ${contact.company ? `<div>🏢 ${contact.company}</div>` : ''}
                        ${contact.jobTitle ? `<div>💼 ${contact.jobTitle}</div>` : ''}
                        ${contact.phone ? `<div>📞 ${contact.phone}</div>` : ''}
                    </div>
                    ${contact.category ? `<span class="contact-category">${contact.category}</span>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// 渲染分類篩選
function renderFilterChips() {
    const categories = ['全部', ...new Set(contacts.map(c => c.category).filter(Boolean))];
    const container = document.getElementById('filterChips');
    
    container.innerHTML = categories.map(cat => `
        <div class="chip ${cat === currentFilter ? 'active' : ''}" onclick="filterByCategory('${cat}')">
            ${cat}
        </div>
    `).join('');
}

// 分類篩選
function filterByCategory(category) {
    currentFilter = category;
    renderFilterChips();
    renderContacts(document.getElementById('searchInput').value);
}

// 清除搜尋
function clearSearch() {
    document.getElementById('searchInput').value = '';
    renderContacts();
}

// 開啟相機
async function openCamera() {
    const cameraView = document.getElementById('camera-view');
    const video = document.getElementById('video');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = stream;
        cameraView.classList.add('active');
    } catch (err) {
        alert('無法開啟相機: ' + err.message + '\n\n請確認已允許相機權限');
    }
}

// 關閉相機
function closeCamera() {
    const cameraView = document.getElementById('camera-view');
    const video = document.getElementById('video');
    
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    
    cameraView.classList.remove('active');
}

// 拍照
async function takePicture() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    // 設定 canvas 大小
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 繪製影像
    context.drawImage(video, 0, 0);
    
    // 轉換為 base64
    capturedImage = canvas.toDataURL('image/jpeg', 0.8);
    
    // 關閉相機
    closeCamera();
    
    // 直接開啟編輯視窗（不做 OCR，讓使用者手動輸入）
    openEditModal({
        notes: '📸 名片已拍攝，請手動輸入資訊'
    });
}

// 開啟編輯 Modal
function openEditModal(data = {}) {
    const modal = document.getElementById('editModal');
    const preview = document.getElementById('previewImage');
    
    // 清空表單
    document.getElementById('contactForm').reset();
    editingId = null;
    
    // 填入資料
    if (data.name) document.getElementById('name').value = data.name;
    if (data.company) document.getElementById('company').value = data.company;
    if (data.jobTitle) document.getElementById('jobTitle').value = data.jobTitle;
    if (data.phone) document.getElementById('phone').value = data.phone;
    if (data.email) document.getElementById('email').value = data.email;
    if (data.address) document.getElementById('address').value = data.address;
    if (data.website) document.getElementById('website').value = data.website;
    if (data.category) document.getElementById('category').value = data.category;
    if (data.notes) document.getElementById('notes').value = data.notes;
    
    // 顯示圖片
    if (capturedImage || data.image) {
        preview.src = capturedImage || data.image;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
    
    // 設定標題
    document.getElementById('modalTitle').textContent = data.id ? '編輯聯絡人' : '新增聯絡人';
    editingId = data.id || null;
    
    modal.classList.add('active');
}

// 關閉編輯 Modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    capturedImage = null;
}

// 儲存聯絡人
function saveContact(event) {
    event.preventDefault();
    
    const contact = {
        id: editingId || Date.now(),
        name: document.getElementById('name').value,
        company: document.getElementById('company').value,
        jobTitle: document.getElementById('jobTitle').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        website: document.getElementById('website').value,
        category: document.getElementById('category').value,
        notes: document.getElementById('notes').value,
        image: capturedImage || (editingId ? contacts.find(c => c.id === editingId)?.image : null),
        createdAt: editingId ? contacts.find(c => c.id === editingId)?.createdAt : new Date().toISOString()
    };
    
    if (editingId) {
        // 更新
        const index = contacts.findIndex(c => c.id === editingId);
        contacts[index] = contact;
    } else {
        // 新增
        contacts.unshift(contact);
    }
    
    saveContacts();
    renderContacts();
    renderFilterChips();
    closeEditModal();
    
    // 顯示成功訊息
    showToast('✅ 聯絡人已儲存');
}

// 檢視聯絡人
function viewContact(id) {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    
    const action = confirm(`${contact.name}\n\n點擊「確定」編輯\n點擊「取消」刪除`);
    
    if (action) {
        // 編輯
        openEditModal(contact);
    } else {
        // 刪除
        if (confirm(`確定要刪除 ${contact.name} 嗎？`)) {
            contacts = contacts.filter(c => c.id !== id);
            saveContacts();
            renderContacts();
            renderFilterChips();
            showToast('🗑️ 聯絡人已刪除');
        }
    }
}

// 顯示提示訊息
function showToast(message) {
    // 創建 toast 元素
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        z-index: 9999;
        animation: fadeInOut 2s ease-in-out;
    `;
    
    document.body.appendChild(toast);
    
    // 2 秒後移除
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// 加入 CSS 動畫
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        10% { opacity: 1; transform: translateX(-50%) translateY(0); }
        90% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);
