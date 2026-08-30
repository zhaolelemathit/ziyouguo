// ================================================================
// 1. 导入 Firebase
// ================================================================
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    Timestamp,
    writeBatch,
    limit
} from 'firebase/firestore';

// ================================================================
// 2. Firebase 配置（请替换为你的实际配置）
// ================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDemoKeyPleaseReplaceWithYourOwn",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// 如果未配置，弹出提示（但不会阻断运行）
if (firebaseConfig.apiKey === "AIzaSyDemoKeyPleaseReplaceWithYourOwn") {
    alert(
        '⚠️ 请先配置 Firebase！\n\n' +
        '1. 访问 https://console.firebase.google.com/ 创建项目\n' +
        '2. 启用 Firestore 数据库\n' +
        '3. 在项目设置中复制 Web 配置\n' +
        '4. 替换 script.js 中 firebaseConfig 对象的值\n\n' +
        '详细步骤见代码注释。'
    );
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================================================================
// 3. 全局状态
// ================================================================
const STATE = {
    currentUser: null,
    isAdmin: false,
    isTempAdmin: false,
    adminExpiry: null,
    allUsers: [],
    allNews: [],
    allElections: [],
    allTickets: [],
    allChats: [],
    chatUnsubscribe: null,
};

// ================================================================
// 4. 工具函数
// ================================================================
function $(id) { return document.getElementById(id); }

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = $(id);
    if (el) el.classList.add('active');
}

function formatDate(ts) {
    if (!ts) return '-';
    if (ts.toDate) ts = ts.toDate();
    if (typeof ts === 'string') ts = new Date(ts);
    if (!(ts instanceof Date) || isNaN(ts)) return '-';
    return ts.toLocaleString('zh-CN', { hour12: false });
}

function formatDateShort(ts) {
    if (!ts) return '-';
    if (ts.toDate) ts = ts.toDate();
    if (typeof ts === 'string') ts = new Date(ts);
    if (!(ts instanceof Date) || isNaN(ts)) return '-';
    return ts.toLocaleDateString('zh-CN') + ' ' + ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function timeRemaining(endTs) {
    if (!endTs) return '永久';
    if (endTs.toDate) endTs = endTs.toDate();
    if (typeof endTs === 'string') endTs = new Date(endTs);
    if (!(endTs instanceof Date) || isNaN(endTs)) return '永久';
    const now = new Date();
    const diff = endTs - now;
    if (diff <= 0) return '已过期';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}天${hours}小时`;
    return `${hours}小时`;
}

function getCurrentUser() { return STATE.currentUser; }

function isUserBanned(user) {
    if (!user) return false;
    return user.isBanned === true;
}

function isUserAdminOrTemp(user) {
    if (!user) return false;
    if (user.isBanned) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'temporary_admin' && user.adminExpiry) {
        const expiry = user.adminExpiry.toDate ? user.adminExpiry.toDate() : new Date(user.adminExpiry);
        return expiry > new Date();
    }
    return false;
}

// 硬编码管理员（密码不显示在界面上）
const MASTER_ADMIN = {
    username: 'zhaotianle',
    password: 'ziyouguo1314',
    role: 'admin',
    displayName: '赵天乐',
    isBanned: false,
};

// 预设用户（来自附件）
const PRESET_USERS = [
    { username: 'tanshicheng', password: 'tsc123', displayName: '谭世成' },
    { username: 'yangjiaqi', password: 'wjq456', displayName: '杨家琪' },
    { username: 'weiyeen', password: 'wye789', displayName: '魏亦恩' },
    { username: 'zhangjiarui', password: 'zjr125', displayName: '张嘉瑞' },
    { username: 'zhangchenmin', password: 'zcm368', displayName: '张晨敏' },
    { username: 'yangyanxi', password: 'yyx324', displayName: '杨燕熙' },
    { username: 'yanghaolei', password: 'yhl832', displayName: '杨浩磊' },
];

// ================================================================
// 5. 数据库初始化（预设用户 + 管理员）
// ================================================================
async function initializeDatabase() {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const existing = new Set();
        snapshot.forEach(doc => existing.add(doc.id));

        const batch = writeBatch(db);

        if (!existing.has(MASTER_ADMIN.username)) {
            const docRef = doc(db, 'users', MASTER_ADMIN.username);
            batch.set(docRef, {
                username: MASTER_ADMIN.username,
                password: MASTER_ADMIN.password,
                role: 'admin',
                displayName: MASTER_ADMIN.displayName,
                isBanned: false,
                adminExpiry: null,
                createdAt: serverTimestamp(),
            });
        }

        for (const u of PRESET_USERS) {
            if (!existing.has(u.username)) {
                const docRef = doc(db, 'users', u.username);
                batch.set(docRef, {
                    username: u.username,
                    password: u.password,
                    role: 'user',
                    displayName: u.displayName,
                    isBanned: false,
                    adminExpiry: null,
                    createdAt: serverTimestamp(),
                });
            }
        }

        await batch.commit();
        console.log('✅ 数据库初始化完成');
    } catch (err) {
        console.error('❌ 数据库初始化失败:', err);
    }
}

// ================================================================
// 6. 认证相关
// ================================================================
async function login(username, password) {
    try {
        // 硬编码管理员
        if (username === MASTER_ADMIN.username && password === MASTER_ADMIN.password) {
            const user = {
                username: MASTER_ADMIN.username,
                password: MASTER_ADMIN.password,
                role: 'admin',
                displayName: MASTER_ADMIN.displayName,
                isBanned: false,
                adminExpiry: null,
            };
            STATE.currentUser = user;
            STATE.isAdmin = true;
            STATE.isTempAdmin = false;
            STATE.adminExpiry = null;
            return { success: true, user };
        }

        const docRef = doc(db, 'users', username);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return { success: false, error: '用户名不存在' };
        const userData = docSnap.data();
        if (userData.password !== password) return { success: false, error: '密码错误' };
        if (userData.isBanned) return { success: false, error: '该账号已被封禁' };

        let isAdmin = false,
            isTempAdmin = false,
            adminExpiry = null;
        if (userData.role === 'admin') {
            isAdmin = true;
        } else if (userData.role === 'temporary_admin' && userData.adminExpiry) {
            const expiry = userData.adminExpiry.toDate ? userData.adminExpiry.toDate() : new Date(userData.adminExpiry);
            if (expiry > new Date()) {
                isTempAdmin = true;
                adminExpiry = expiry;
            } else {
                // 过期降级
                await updateDoc(docRef, { role: 'user', adminExpiry: null });
                userData.role = 'user';
                userData.adminExpiry = null;
            }
        }

        const user = {
            username: userData.username,
            password: userData.password,
            role: userData.role,
            displayName: userData.displayName || userData.username,
            isBanned: userData.isBanned || false,
            adminExpiry: userData.adminExpiry || null,
        };
        STATE.currentUser = user;
        STATE.isAdmin = isAdmin;
        STATE.isTempAdmin = isTempAdmin;
        STATE.adminExpiry = adminExpiry;
        return { success: true, user };
    } catch (err) {
        console.error('登录错误:', err);
        return { success: false, error: '网络错误，请重试' };
    }
}

function logout() {
    STATE.currentUser = null;
    STATE.isAdmin = false;
    STATE.isTempAdmin = false;
    STATE.adminExpiry = null;
    if (STATE.chatUnsubscribe) {
        STATE.chatUnsubscribe();
        STATE.chatUnsubscribe = null;
    }
    document.getElementById('app').classList.add('hidden');
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

// ================================================================
// 7. 导航渲染
// ================================================================
function renderNav() {
    const user = getCurrentUser();
    if (!user) return;
    const nav = document.getElementById('navLinks');
    const isAdmin = isUserAdminOrTemp(user);
    const isBanned = isUserBanned(user);

    let html = `<span class="user-info">👋 ${user.displayName || user.username}</span>`;

    const pages = [
        { id: 'newsPage', label: '📰 新闻' },
        { id: 'electionPage', label: '🗳️ 选举' },
        { id: 'ticketPage', label: '🎫 工单' },
        { id: 'chatPage', label: '💬 聊天' },
        { id: 'profileViewPage', label: '👤 我的资料' },
        { id: 'profileSettingsPage', label: '⚙️ 设置' },
    ];
    if (isAdmin && !isBanned) {
        pages.unshift({ id: 'adminPage', label: '📊 管理' });
    }

    for (const p of pages) {
        const active = document.querySelector(`.page.active`)?.id === p.id ? 'active' : '';
        html += `<a class="${active}" data-page="${p.id}">${p.label}</a>`;
    }

    html += `<button class="logout-btn" id="logoutBtn">🚪 退出</button>`;
    nav.innerHTML = html;

    nav.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', () => {
            if (isBanned && el.dataset.page !== 'profileViewPage' && el.dataset.page !== 'profileSettingsPage') {
                alert('⛔ 你已被封禁，仅可查看个人资料。');
                return;
            }
            showPage(el.dataset.page);
            if (el.dataset.page === 'adminPage' && isAdmin) renderAdminDashboard();
            if (el.dataset.page === 'newsPage') renderNews();
            if (el.dataset.page === 'electionPage') renderElections();
            if (el.dataset.page === 'ticketPage') renderTickets();
            if (el.dataset.page === 'chatPage') initChat();
            if (el.dataset.page === 'profileViewPage') renderProfileView();
            if (el.dataset.page === 'profileSettingsPage') renderProfileSettings();
            nav.querySelectorAll('[data-page]').forEach(a => a.classList.remove('active'));
            el.classList.add('active');
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', logout);

    // 管理员计时器
    const timerEl = document.getElementById('adminTimer');
    if (isAdmin && !isBanned) {
        if (user.role === 'temporary_admin' && user.adminExpiry) {
            const expiry = user.adminExpiry.toDate ? user.adminExpiry.toDate() : new Date(user.adminExpiry);
            if (expiry > new Date()) {
                timerEl.classList.remove('hidden');
                timerEl.textContent = `⏳ 临时管理员 (剩余 ${timeRemaining(expiry)})`;
                setInterval(() => {
                    const exp = user.adminExpiry.toDate ? user.adminExpiry.toDate() : new Date(user.adminExpiry);
                    if (exp > new Date()) {
                        timerEl.textContent = `⏳ 临时管理员 (剩余 ${timeRemaining(exp)})`;
                    } else {
                        timerEl.textContent = '⏳ 管理员已过期';
                        timerEl.classList.add('hidden');
                        refreshUserStatus();
                    }
                }, 60000);
            } else {
                timerEl.classList.add('hidden');
            }
        } else {
            timerEl.classList.add('hidden');
        }
    } else {
        timerEl.classList.add('hidden');
    }
}

async function refreshUserStatus() {
    const user = getCurrentUser();
    if (!user) return;
    try {
        const docRef = doc(db, 'users', user.username);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            if (data.role !== 'temporary_admin' || !data.adminExpiry) {
                STATE.isAdmin = false;
                STATE.isTempAdmin = false;
                STATE.currentUser.role = data.role || 'user';
                STATE.currentUser.adminExpiry = null;
                renderNav();
                if (document.querySelector('.page.active')?.id === 'adminPage') {
                    showPage('newsPage');
                    renderNews();
                    document.querySelectorAll('[data-page]').forEach(a => a.classList.remove('active'));
                    document.querySelector('[data-page="newsPage"]')?.classList.add('active');
                }
            }
        }
    } catch (e) { console.error(e); }
}

// ================================================================
// 8. 管理员仪表盘
// ================================================================
async function renderAdminDashboard() {
    if (!isUserAdminOrTemp(getCurrentUser())) return;
    await Promise.all([
        loadUsers(),
        loadNews(),
        loadElections(),
        loadTickets(),
    ]);
    document.getElementById('statUsers').textContent = STATE.allUsers.length;
    document.getElementById('statNews').textContent = STATE.allNews.length;
    document.getElementById('statElections').textContent = STATE.allElections.length;
    document.getElementById('statTickets').textContent = STATE.allTickets.length;

    renderAdminUserList();
    renderAdminNewsList();
    renderAdminElectionList();
    renderAdminTicketList();
}

// --- 加载数据 ---
async function loadUsers() {
    try {
        const q = query(collection(db, 'users'), orderBy('username'));
        const snap = await getDocs(q);
        STATE.allUsers = [];
        snap.forEach(doc => STATE.allUsers.push({ id: doc.id, ...doc.data() }));
    } catch (e) { console.error(e); }
}
async function loadNews() {
    try {
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        STATE.allNews = [];
        snap.forEach(doc => STATE.allNews.push({ id: doc.id, ...doc.data() }));
    } catch (e) { console.error(e); }
}
async function loadElections() {
    try {
        const q = query(collection(db, 'elections'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        STATE.allElections = [];
        snap.forEach(doc => STATE.allElections.push({ id: doc.id, ...doc.data() }));
    } catch (e) { console.error(e); }
}
async function loadTickets() {
    try {
        const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        STATE.allTickets = [];
        snap.forEach(doc => STATE.allTickets.push({ id: doc.id, ...doc.data() }));
    } catch (e) { console.error(e); }
}

// --- 用户列表 ---
function renderAdminUserList() {
    const container = document.getElementById('adminUserList');
    const user = getCurrentUser();
    if (!user) return;
    let html = '';
    for (const u of STATE.allUsers) {
        const isSelf = u.username === user.username;
        const isAdmin = u.role === 'admin';
        const isTemp = u.role === 'temporary_admin';
        const banned = u.isBanned ? '⛔ 已封禁' : '';
        const roleLabel = isAdmin ? '👑 管理员' : isTemp ? '⏳ 临时管理员' : '👤 用户';
        const expiryInfo = isTemp && u.adminExpiry ? ` (到期 ${formatDateShort(u.adminExpiry)})` : '';

        html += `<div class="list-item">
            <div class="flex-between">
                <span><strong>${u.displayName || u.username}</strong> <span class="text-muted text-sm">@${u.username}</span></span>
                <span>
                    <span class="badge ${isAdmin?'badge-admin':isTemp?'badge-temp':'badge'}">${roleLabel}</span>
                    ${banned ? `<span class="badge badge-banned">${banned}</span>` : ''}
                    ${expiryInfo ? `<span class="text-muted text-sm">${expiryInfo}</span>` : ''}
                </span>
            </div>
            <div class="actions">
                ${!isSelf && !isAdmin ? `
                    <button class="btn btn-sm ${u.isBanned ? 'btn-gold' : 'btn-outline'}" data-action="toggleBan" data-user="${u.username}">
                        ${u.isBanned ? '🔓 解封' : '🔒 封禁'}
                    </button>
                    <button class="btn btn-sm btn-primary" data-action="makeTempAdmin" data-user="${u.username}">
                        ⏳ 设为临时管理员 (7天)
                    </button>
                    <button class="btn btn-sm btn-accent" data-action="makeAdmin" data-user="${u.username}">
                        👑 设为永久管理员
                    </button>
                    <button class="btn btn-sm btn-outline" data-action="removeAdmin" data-user="${u.username}">
                        ↘️ 移除管理权限
                    </button>
                ` : ''}
                ${isSelf ? '<span class="text-muted text-sm">(本人)</span>' : ''}
            </div>
        </div>`;
    }
    container.innerHTML = html || '<p class="text-muted">暂无用户</p>';

    container.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', async () => {
            const action = el.dataset.action;
            const targetUser = el.dataset.user;
            await handleAdminUserAction(action, targetUser);
        });
    });
}

async function handleAdminUserAction(action, targetUser) {
    const current = getCurrentUser();
    if (!current || !isUserAdminOrTemp(current)) return;
    if (targetUser === current.username) { alert('不能对自己操作'); return; }
    try {
        const docRef = doc(db, 'users', targetUser);
        const snap = await getDoc(docRef);
        if (!snap.exists()) { alert('用户不存在'); return; }
        const data = snap.data();

        switch (action) {
            case 'toggleBan': {
                const newBan = !data.isBanned;
                await updateDoc(docRef, { isBanned: newBan });
                alert(newBan ? `✅ 已封禁 ${targetUser}` : `✅ 已解封 ${targetUser}`);
                break;
            }
            case 'makeTempAdmin': {
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 7);
                await updateDoc(docRef, { role: 'temporary_admin', adminExpiry: Timestamp.fromDate(expiry) });
                alert(`✅ ${targetUser} 已被设为临时管理员 (有效期7天)`);
                break;
            }
            case 'makeAdmin': {
                await updateDoc(docRef, { role: 'admin', adminExpiry: null });
                alert(`✅ ${targetUser} 已被设为永久管理员`);
                break;
            }
            case 'removeAdmin': {
                await updateDoc(docRef, { role: 'user', adminExpiry: null });
                alert(`✅ ${targetUser} 的管理权限已移除`);
                break;
            }
        }
        await renderAdminDashboard();
    } catch (e) {
        console.error(e);
        alert('操作失败: ' + e.message);
    }
}

// --- 新闻管理 ---
function renderAdminNewsList() {
    const container = document.getElementById('adminNewsList');
    let html = '';
    for (const n of STATE.allNews) {
        html += `<div class="list-item">
            <div class="flex-between">
                <span><strong>${n.title}</strong> <span class="text-muted text-sm">by ${n.author || '未知'}</span></span>
                <span class="text-muted text-sm">${formatDateShort(n.createdAt)}</span>
            </div>
            <div class="text-muted text-sm" style="max-height:40px;overflow:hidden;">${n.content || ''}</div>
            <div class="actions">
                <button class="btn btn-sm btn-outline" data-action="editNews" data-id="${n.id}">✏️ 编辑</button>
                <button class="btn btn-sm btn-accent" data-action="deleteNews" data-id="${n.id}">🗑️ 删除</button>
            </div>
        </div>`;
    }
    container.innerHTML = html || '<p class="text-muted">暂无新闻</p>';

    container.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', async () => {
            const action = el.dataset.action;
            const id = el.dataset.id;
            if (action === 'deleteNews') {
                if (!confirm('确定删除此新闻？')) return;
                try { await deleteDoc(doc(db, 'news', id));
                    await renderAdminDashboard(); } catch (e) { alert('删除失败'); }
            } else if (action === 'editNews') {
                const news = STATE.allNews.find(n => n.id === id);
                if (news) {
                    document.getElementById('adminNewsTitle').value = news.title;
                    document.getElementById('adminNewsContent').value = news.content;
                    const btn = document.getElementById('adminNewsCreate');
                    btn.dataset.editId = id;
                    btn.textContent = '✏️ 更新新闻';
                }
            }
        });
    });
}

// --- 选举管理 ---
function renderAdminElectionList() {
    const container = document.getElementById('adminElectionList');
    let html = '';
    for (const e of STATE.allElections) {
        const status = e.status === 'active' ? '🟢 进行中' : '🔴 已结束';
        html += `<div class="list-item">
            <div><strong>${e.title}</strong> (${e.position || '未指定职位'}) <span class="badge">${status}</span></div>
            <div class="text-muted text-sm">候选人: ${(e.candidates || []).join(', ') || '无'}</div>
            <div class="actions">
                <button class="btn btn-sm btn-accent" data-action="deleteElection" data-id="${e.id}">🗑️ 删除</button>
                ${e.status === 'active' ? `<button class="btn btn-sm btn-outline" data-action="endElection" data-id="${e.id}">⏹️ 结束</button>` : ''}
            </div>
        </div>`;
    }
    container.innerHTML = html || '<p class="text-muted">暂无选举</p>';

    container.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', async () => {
            const action = el.dataset.action;
            const id = el.dataset.id;
            if (action === 'deleteElection') {
                if (!confirm('确定删除此选举？')) return;
                try { await deleteDoc(doc(db, 'elections', id));
                    await renderAdminDashboard(); } catch (e) { alert('删除失败'); }
            } else if (action === 'endElection') {
                try { await updateDoc(doc(db, 'elections', id), { status: 'ended' });
                    await renderAdminDashboard(); } catch (e) { alert('操作失败'); }
            }
        });
    });
}

// --- 工单管理 ---
function renderAdminTicketList() {
    const container = document.getElementById('adminTicketList');
    let html = '';
    for (const t of STATE.allTickets) {
        const statusMap = {
            'open': '<span class="badge badge-open">🟢 待处理</span>',
            'replied': '<span class="badge badge-replied">💬 已回复</span>',
            'closed': '<span class="badge badge-closed">🔒 已关闭</span>',
        };
        const userInfo = STATE.allUsers.find(u => u.username === t.userId);
        const displayName = userInfo?.displayName || t.userId || '未知';

        html += `<div class="list-item">
            <div class="flex-between">
                <span><strong>${t.subject || '无主题'}</strong> <span class="text-muted text-sm">by ${displayName}</span></span>
                <span>${statusMap[t.status] || t.status}</span>
            </div>
            <div class="text-muted text-sm">${t.content ? t.content.slice(0, 60) : ''}${(t.content||'').length>60?'...':''}</div>
            ${t.reply ? `<div class="ticket-reply text-sm"><strong>📨 回复:</strong> ${t.reply}</div>` : ''}
            <div class="actions">
                ${t.status !== 'closed' ? `
                    <button class="btn btn-sm btn-primary" data-action="replyTicket" data-id="${t.id}">💬 回复</button>
                    <button class="btn btn-sm btn-outline" data-action="closeTicket" data-id="${t.id}">🔒 关闭</button>
                ` : ''}
                <button class="btn btn-sm btn-accent" data-action="deleteTicket" data-id="${t.id}">🗑️ 删除</button>
            </div>
        </div>`;
    }
    container.innerHTML = html || '<p class="text-muted">暂无工单</p>';

    container.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', async () => {
            const action = el.dataset.action;
            const id = el.dataset.id;
            if (action === 'deleteTicket') {
                if (!confirm('确定删除此工单？')) return;
                try { await deleteDoc(doc(db, 'tickets', id));
                    await renderAdminDashboard(); } catch (e) { alert('删除失败'); }
            } else if (action === 'closeTicket') {
                try { await updateDoc(doc(db, 'tickets', id), { status: 'closed' });
                    await renderAdminDashboard(); } catch (e) { alert('操作失败'); }
            } else if (action === 'replyTicket') {
                const reply = prompt('请输入回复内容:');
                if (reply !== null && reply.trim()) {
                    try {
                        await updateDoc(doc(db, 'tickets', id), {
                            status: 'replied',
                            reply: reply.trim(),
                            replyBy: getCurrentUser().username,
                            updatedAt: serverTimestamp(),
                        });
                        await renderAdminDashboard();
                    } catch (e) { alert('回复失败'); }
                }
            }
        });
    });
}

// --- 管理员创建新闻 ---
document.getElementById('adminNewsCreate').addEventListener('click', async () => {
    const title = document.getElementById('adminNewsTitle').value.trim();
    const content = document.getElementById('adminNewsContent').value.trim();
    if (!title || !content) { alert('标题和内容不能为空'); return; }
    const user = getCurrentUser();
    const editId = document.getElementById('adminNewsCreate').dataset.editId;
    try {
        if (editId) {
            await updateDoc(doc(db, 'news', editId), { title, content, updatedAt: serverTimestamp() });
            delete document.getElementById('adminNewsCreate').dataset.editId;
            document.getElementById('adminNewsCreate').textContent = '发布新闻';
        } else {
            await addDoc(collection(db, 'news'), {
                title,
                content,
                author: user.displayName || user.username,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
        document.getElementById('adminNewsTitle').value = '';
        document.getElementById('adminNewsContent').value = '';
        await renderAdminDashboard();
    } catch (e) { alert('操作失败: ' + e.message); }
});

// --- 管理员创建选举 ---
document.getElementById('adminElectionCreate').addEventListener('click', async () => {
    const title = document.getElementById('adminElectionTitle').value.trim();
    const position = document.getElementById('adminElectionPosition').value.trim();
    const candidatesStr = document.getElementById('adminElectionCandidates').value.trim();
    const votersStr = document.getElementById('adminElectionVoters').value.trim();
    const endDate = document.getElementById('adminElectionEnd').value;

    if (!title || !position || !candidatesStr) {
        alert('请填写完整信息 (标题、职位、候选人)');
        return;
    }
    if (!endDate) { alert('请选择截止日期'); return; }

    const candidates = candidatesStr.split(',').map(s => s.trim()).filter(Boolean);
    const voters = votersStr ? votersStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    const allUsernames = STATE.allUsers.map(u => u.username);
    const invalidCandidates = candidates.filter(c => !allUsernames.includes(c));
    if (invalidCandidates.length) {
        alert(`以下候选人不存在: ${invalidCandidates.join(', ')}`);
        return;
    }
    const invalidVoters = voters.filter(v => !allUsernames.includes(v));
    if (invalidVoters.length) {
        alert(`以下选民不存在: ${invalidVoters.join(', ')}`);
        return;
    }

    try {
        await addDoc(collection(db, 'elections'), {
            title,
            position,
            candidates,
            voters: voters.length ? voters : [],
            startDate: serverTimestamp(),
            endDate: Timestamp.fromDate(new Date(endDate)),
            status: 'active',
            votes: [],
            createdAt: serverTimestamp(),
        });
        document.getElementById('adminElectionTitle').value = '';
        document.getElementById('adminElectionPosition').value = '';
        document.getElementById('adminElectionCandidates').value = '';
        document.getElementById('adminElectionVoters').value = '';
        document.getElementById('adminElectionEnd').value = '';
        await renderAdminDashboard();
        alert('✅ 选举已创建');
    } catch (e) { alert('创建失败: ' + e.message); }
});

// 刷新按钮
document.getElementById('adminRefreshUsers').addEventListener('click', renderAdminDashboard);
document.getElementById('adminRefreshTickets').addEventListener('click', renderAdminDashboard);
document.getElementById('adminNewsRefresh').addEventListener('click', renderAdminDashboard);

// ================================================================
// 9. 新闻页面
// ================================================================
async function renderNews() {
    await loadNews();
    const container = document.getElementById('newsList');
    let html = '';
    for (const n of STATE.allNews) {
        html += `<div class="list-item">
            <div class="title">${n.title}</div>
            <div class="meta">
                <span>📝 ${n.author || '未知'}</span>
                <span>🕐 ${formatDate(n.createdAt)}</span>
            </div>
            <div class="mt-12" style="white-space:pre-wrap;line-height:1.6;">${n.content || ''}</div>
        </div>`;
    }
    container.innerHTML = html || '<p class="text-muted">暂无新闻</p>';
}
document.getElementById('newsRefresh').addEventListener('click', renderNews);

// ================================================================
// 10. 选举页面
// ================================================================
async function renderElections() {
    await loadElections();
    const container = document.getElementById('electionList');
    const user = getCurrentUser();
    if (!user) return;
    let html = '';
    for (const e of STATE.allElections) {
        const isActive = e.status === 'active';
        const endDate = e.endDate ? formatDateShort(e.endDate) : '无截止日期';
        const candidates = e.candidates || [];
        const voters = e.voters || [];
        const votes = e.votes || [];
        const userVoted = votes.some(v => v.voterId === user.username);
        const isVoter = voters.length === 0 || voters.includes(user.username);

        html += `<div class="election-card">
            <div class="flex-between">
                <h4>${e.title}</h4>
                <span class="badge ${isActive ? 'badge-active' : 'badge-ended'}">${isActive ? '🟢 进行中' : '🔴 已结束'}</span>
            </div>
            <div class="text-muted text-sm">📌 职位: ${e.position || '未指定'}</div>
            <div class="text-muted text-sm">⏳ 截止: ${endDate}</div>
            <div class="mt-12">
                <span class="text-muted text-sm">候选人:</span>
                ${candidates.map(c => `<span class="candidate ${votes.some(v=>v.candidateId===c && v.voterId===user.username) ? 'voted' : ''}">${c} ${votes.some(v=>v.candidateId===c && v.voterId===user.username) ? '✅' : ''}</span>`).join(' ')}
            </div>
            <div class="mt-12">
                ${isActive && isVoter && !userVoted && !isUserBanned(user) ? `
                    <div class="flex gap-8">
                        <select id="voteSelect_${e.id}" class="input" style="width:auto;flex:1;">
                            <option value="">选择候选人...</option>
                            ${candidates.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                        <button class="btn btn-sm btn-primary" data-action="vote" data-id="${e.id}">🗳️ 投票</button>
                    </div>
                ` : ''}
                ${!isActive ? '<span class="text-muted text-sm">⛔ 选举已结束</span>' : ''}
                ${isActive && !isVoter ? '<span class="text-muted text-sm">⛔ 你不在选民名单中</span>' : ''}
                ${isActive && userVoted ? '<span class="text-muted text-sm">✅ 你已投票</span>' : ''}
                ${isUserBanned(user) ? '<span class="text-muted text-sm">⛔ 账号被封禁，无法投票</span>' : ''}
            </div>
            <div class="text-muted text-sm mt-12">🗳️ 已投票: ${votes.length} 人</div>
        </div>`;
    }
    container.innerHTML = html || '<p class="text-muted">暂无选举</p>';

    container.querySelectorAll('[data-action="vote"]').forEach(el => {
        el.addEventListener('click', async () => {
            const id = el.dataset.id;
            const select = document.getElementById(`voteSelect_${id}`);
            const candidate = select?.value;
            if (!candidate) { alert('请选择候选人'); return; }
            const election = STATE.allElections.find(e => e.id === id);
            if (!election) return;
            if (election.status !== 'active') { alert('选举已结束'); return; }
            if (election.votes.some(v => v.voterId === user.username)) { alert('你已投票'); return; }
            if (election.voters.length && !election.voters.includes(user.username)) {
                alert('你不在选民名单中');
                return;
            }
            if (isUserBanned(user)) { alert('账号被封禁'); return; }
            try {
                const newVotes = [...(election.votes || []), { candidateId: candidate, voterId: user.username }];
                await updateDoc(doc(db, 'elections', id), { votes: newVotes });
                await renderElections();
            } catch (e) { alert('投票失败: ' + e.message); }
        });
    });
}
document.getElementById('electionRefresh').addEventListener('click', renderElections);

// ================================================================
// 11. 工单页面
// ================================================================
async function renderTickets() {
    const user = getCurrentUser();
    if (!user) return;
    await loadTickets();
    const container = document.getElementById('ticketList');
    const userTickets = STATE.allTickets.filter(t => t.userId === user.username);
    let html = '';
    for (const t of userTickets) {
        const statusMap = {
            'open': '<span class="badge badge-open">🟢 待处理</span>',
            'replied': '<span class="badge badge-replied">💬 已回复</span>',
            'closed': '<span class="badge badge-closed">🔒 已关闭</span>',
        };
        html += `<div class="list-item">
            <div class="flex-between">
                <span><strong>${t.subject || '无主题'}</strong></span>
                <span>${statusMap[t.status] || t.status}</span>
            </div>
            <div class="text-muted text-sm">${formatDate(t.createdAt)}</div>
            <div style="white-space:pre-wrap;line-height:1.5;">${t.content || ''}</div>
            ${t.reply ? `<div class="ticket-reply"><strong>📨 管理员回复:</strong> ${t.reply}</div>` : ''}
        </div>`;
    }
    container.innerHTML = html || '<p class="text-muted">暂无工单</p>';
}

document.getElementById('ticketNewBtn').addEventListener('click', () => {
    document.getElementById('ticketForm').classList.remove('hidden');
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketContent').value = '';
});
document.getElementById('ticketCancel').addEventListener('click', () => {
    document.getElementById('ticketForm').classList.add('hidden');
});
document.getElementById('ticketSubmit').addEventListener('click', async () => {
    const subject = document.getElementById('ticketSubject').value.trim();
    const content = document.getElementById('ticketContent').value.trim();
    if (!subject || !content) { alert('请填写完整'); return; }
    const user = getCurrentUser();
    try {
        await addDoc(collection(db, 'tickets'), {
            userId: user.username,
            subject,
            content,
            status: 'open',
            reply: '',
            replyBy: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        document.getElementById('ticketForm').classList.add('hidden');
        await renderTickets();
    } catch (e) { alert('提交失败: ' + e.message); }
});

// ================================================================
// 12. 聊天页面 (实时)
// ================================================================
function initChat() {
    const user = getCurrentUser();
    if (!user) return;
    if (STATE.chatUnsubscribe) {
        STATE.chatUnsubscribe();
        STATE.chatUnsubscribe = null;
    }

    const q = query(collection(db, 'chats'), orderBy('timestamp', 'asc'), limit(200));
    STATE.chatUnsubscribe = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        renderChatMessages(messages);
    }, (err) => {
        console.error('聊天监听错误:', err);
    });
}

function renderChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    const user = getCurrentUser();
    if (!user) return;
    let html = '';
    for (const msg of messages) {
        const isAdmin = msg.isAdmin || false;
        const sender = msg.displayName || msg.username || '匿名';
        const time = formatDateShort(msg.timestamp);
        const cls = isAdmin ? 'is-admin' : '';
        html += `<div class="chat-msg ${cls}">
            <span class="sender">${sender} ${isAdmin ? '👑' : ''}</span>
            <span class="time">${time}</span>
            <span class="text">${msg.message || ''}</span>
        </div>`;
    }
    container.innerHTML = html || '<p class="text-muted">暂无消息</p>';
    container.scrollTop = container.scrollHeight;
}

document.getElementById('chatSend').addEventListener('click', async () => {
    const user = getCurrentUser();
    if (!user) return;
    if (isUserBanned(user)) { alert('账号被封禁，无法发送消息'); return; }
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    try {
        await addDoc(collection(db, 'chats'), {
            username: user.username,
            displayName: user.displayName || user.username,
            message: msg,
            isAdmin: isUserAdminOrTemp(user),
            timestamp: serverTimestamp(),
        });
        input.value = '';
    } catch (e) { alert('发送失败: ' + e.message); }
});
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('chatSend').click();
});

// ================================================================
// 13. 个人信息查看
// ================================================================
function renderProfileView() {
    const user = getCurrentUser();
    if (!user) return;
    const container = document.getElementById('profileViewContent');
    const isAdmin = isUserAdminOrTemp(user);
    const banned = user.isBanned ? '⛔ 已封禁' : '✅ 正常';
    const role = user.role === 'admin' ? '👑 管理员' :
        user.role === 'temporary_admin' ? '⏳ 临时管理员' : '👤 普通用户';
    const expiry = user.adminExpiry ? formatDateShort(user.adminExpiry) : '无';
    container.innerHTML = `
        <div class="grid-2" style="max-width:500px;">
            <div><strong>用户名</strong></div><div>${user.username}</div>
            <div><strong>显示名称</strong></div><div>${user.displayName || user.username}</div>
            <div><strong>角色</strong></div><div>${role}</div>
            <div><strong>状态</strong></div><div>${banned}</div>
            ${user.role === 'temporary_admin' ? `<div><strong>管理员有效期</strong></div><div>${expiry}</div>` : ''}
            <div><strong>注册时间</strong></div><div>${formatDate(user.createdAt)}</div>
        </div>
    `;
}

// ================================================================
// 14. 个人信息设置
// ================================================================
function renderProfileSettings() {
    const user = getCurrentUser();
    if (!user) return;
    document.getElementById('profileDisplayName').value = user.displayName || '';
    document.getElementById('profileNewPassword').value = '';
    document.getElementById('profileSettingsMsg').textContent = '';
}

document.getElementById('profileSettingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    const displayName = document.getElementById('profileDisplayName').value.trim() || user.username;
    const newPassword = document.getElementById('profileNewPassword').value.trim();
    try {
        const docRef = doc(db, 'users', user.username);
        const updates = { displayName };
        if (newPassword) updates.password = newPassword;
        await updateDoc(docRef, updates);
        user.displayName = displayName;
        if (newPassword) user.password = newPassword;
        STATE.currentUser = user;
        document.getElementById('profileSettingsMsg').textContent = '✅ 设置已保存';
        document.getElementById('profileSettingsMsg').style.color = '#28a745';
        renderNav();
    } catch (err) {
        document.getElementById('profileSettingsMsg').textContent = '❌ 保存失败: ' + err.message;
        document.getElementById('profileSettingsMsg').style.color = '#e84855';
    }
});

// ================================================================
// 15. 登录逻辑
// ================================================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) {
        document.getElementById('loginError').textContent = '请输入用户名和密码';
        return;
    }
    document.getElementById('loginError').textContent = '登录中...';
    const result = await login(username, password);
    if (!result.success) {
        document.getElementById('loginError').textContent = '❌ ' + result.error;
        return;
    }
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    renderNav();

    showPage('newsPage');
    renderNews();
    document.querySelectorAll('[data-page]').forEach(a => a.classList.remove('active'));
    document.querySelector('[data-page="newsPage"]')?.classList.add('active');

    if (isUserAdminOrTemp(getCurrentUser())) {
        await renderAdminDashboard();
    }
    initChat();
});

// ================================================================
// 16. 启动
// ================================================================
(async function boot() {
    try {
        await initializeDatabase();
        console.log('🚀 应用已启动');
        if (firebaseConfig.apiKey === "AIzaSyDemoKeyPleaseReplaceWithYourOwn") {
            // 提示已显示
        }
    } catch (err) {
        console.error('启动错误:', err);
    }
})();

// 暴露全局用于调试
window.__STATE = STATE;
window.__db = db;
console.log('✅ 新自由民主社团 加载完成');
console.log('📌 管理员账号: zhaotianle (密码在代码中)');
console.log('📌 普通用户: 见 PRESET_USERS');
console.log('⚠️ 请确保 Firebase 配置正确，否则数据无法同步！');
