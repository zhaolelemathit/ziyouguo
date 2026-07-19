// ============================================================
//  1. GitHub 配置（首次使用弹窗输入，保存在 sessionStorage）
// ============================================================
let GITHUB_CONFIG = null;

function loadGitHubConfig() {
    const stored = sessionStorage.getItem('github_config');
    if (stored) {
        try {
            GITHUB_CONFIG = JSON.parse(stored);
            return true;
        } catch(e) {}
    }
    return false;
}

function saveGitHubConfig(owner, repo, path, token) {
    GITHUB_CONFIG = { owner, repo, path, token };
    sessionStorage.setItem('github_config', JSON.stringify(GITHUB_CONFIG));
}

function promptGitHubConfig() {
    const owner = prompt('请输入 GitHub 仓库所有者（用户名或组织）:');
    if (!owner) return false;
    const repo = prompt('请输入 GitHub 仓库名称:');
    if (!repo) return false;
    const path = prompt('请输入数据文件路径（默认 data.json）:', 'data.json') || 'data.json';
    const token = prompt('请输入 Personal Access Token（需 repo 权限）:');
    if (!token) return false;
    saveGitHubConfig(owner, repo, path, token);
    return true;
}

// ============================================================
//  2. GitHub API 读写操作
// ============================================================
async function githubReadData() {
    if (!GITHUB_CONFIG) return null;
    const { owner, repo, path, token } = GITHUB_CONFIG;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (response.status === 404) {
        // 文件不存在，返回空对象
        return {};
    }
    if (!response.ok) {
        throw new Error(`GitHub API 错误: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const content = atob(data.content);
    return JSON.parse(content);
}

async function githubWriteData(data) {
    if (!GITHUB_CONFIG) return;
    const { owner, repo, path, token } = GITHUB_CONFIG;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    // 先获取当前文件的 SHA（用于更新）
    let sha = null;
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (response.ok) {
            const info = await response.json();
            sha = info.sha;
        }
    } catch(e) {}

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const body = {
        message: 'Update data via website',
        content: content,
        sha: sha
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        throw new Error(`GitHub 写入失败: ${response.status} ${response.statusText}`);
    }
}

// ============================================================
//  3. 全局状态
// ============================================================
let currentUser = null;
let chatTarget = null;
let profileViewingUser = null;
let allData = null; // 缓存所有数据

// ============================================================
//  4. 工具函数
// ============================================================
function toast(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s';
        setTimeout(() => div.remove(), 300);
    }, 2800);
}

function getToday() { return new Date().toISOString().slice(0,10); }
function getNow() { return new Date().toISOString(); }

function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function getUserDisplayName(username) {
    if (!allData || !allData.users) return username;
    const u = allData.users[username];
    return u ? (u.name || username) : username;
}

function getPositionDisplay(username) {
    if (!allData || !allData.users) return '';
    const u = allData.users[username];
    return u ? (u.position || '') : '';
}

function getChatKey(a, b) {
    return [a, b].sort().join('-');
}

function isAdmin(user) {
    return user === 'zhaotianle';
}

// ============================================================
//  5. 数据初始化（确保预设用户存在）
// ============================================================
async function ensureInitialData() {
    try {
        let data = await githubReadData();
        if (!data || typeof data !== 'object') data = {};
        let modified = false;

        // 预设用户列表（附件中的四个 + 管理员）
        const presetUsers = {
            'tanshicheng': { password: 'tanshicheng0833', name: '谭世成', idNumber: '110101199001011234', address: '北京市朝阳区', role: 'user', position: '' },
            'weiyeen': { password: 'weiyeen1322', name: '魏恩', idNumber: '110101199002022345', address: '上海市浦东新区', role: 'user', position: '' },
            'wangjiaqi': { password: 'wangjiaqi6837', name: '王佳琪', idNumber: '110101199003033456', address: '广州市天河区', role: 'user', position: '' },
            'yangyanxi': { password: 'yangyanxi5467', name: '杨燕熙', idNumber: '110101199004044567', address: '深圳市南山区', role: 'user', position: '' },
            'zhaotianle': { password: 'ziyouguo1314', name: '赵天乐', idNumber: '110101198505055678', address: '北京市海淀区', role: 'admin', position: '系统管理员' }
        };

        if (!data.users) {
            data.users = {};
            modified = true;
        }
        for (let u in presetUsers) {
            if (!data.users[u]) {
                data.users[u] = presetUsers[u];
                modified = true;
            }
        }

        if (!data.news) { data.news = []; modified = true; }
        if (!data.elections) { data.elections = []; modified = true; }
        if (!data.chats) { data.chats = {}; modified = true; }

        if (modified) {
            await githubWriteData(data);
        }
        allData = data;
        return data;
    } catch (err) {
        toast('数据初始化失败: ' + err.message, 'error');
        throw err;
    }
}

// ============================================================
//  6. 导航
// ============================================================
function navigateTo(page) {
    if (!currentUser && !['home','login','register'].includes(page)) {
        toast('请先登录', 'error');
        navigateTo('login');
        return;
    }
    if (page === 'admin' && !isAdmin(currentUser)) {
        toast('您没有管理员权限', 'error');
        return;
    }
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-links button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    updateNavButtons();

    if (page === 'home') renderHome();
    else if (page === 'news') renderNewsList();
    else if (page === 'elections') renderElections();
    else if (page === 'chat') loadChatUsers();
    else if (page === 'users') renderUserGrid();
    else if (page === 'idcard') renderIdCard();
    else if (page === 'admin') renderAdmin();
}

function updateNavButtons() {
    const loggedIn = !!currentUser;
    document.getElementById('loginNavBtn').style.display = loggedIn ? 'none' : 'inline-block';
    document.getElementById('registerNavBtn').style.display = loggedIn ? 'none' : 'inline-block';
    document.getElementById('adminNavBtn').style.display = isAdmin(currentUser) ? 'inline-block' : 'none';
    document.getElementById('userBadge').style.display = loggedIn ? 'flex' : 'none';
    if (loggedIn && allData && allData.users) {
        const u = allData.users[currentUser] || {};
        document.getElementById('userAvatar').textContent = (u.name || currentUser).charAt(0).toUpperCase();
        document.getElementById('userNameDisplay').textContent = u.name || currentUser;
        document.getElementById('adminTag').style.display = isAdmin(currentUser) ? 'inline-block' : 'none';
    }
    const newsAddBtn = document.getElementById('newsAddBtn');
    const electionAddBtn = document.getElementById('electionAddBtn');
    if (newsAddBtn) newsAddBtn.style.display = isAdmin(currentUser) ? 'inline-block' : 'none';
    if (electionAddBtn) electionAddBtn.style.display = isAdmin(currentUser) ? 'inline-block' : 'none';
}

// ============================================================
//  7. 登录 / 注册
// ============================================================
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) { toast('请填写完整信息', 'error'); return false; }

    if (!allData || !allData.users) {
        toast('数据未加载，请刷新重试', 'error');
        return false;
    }
    const user = allData.users[username];
    if (!user) { toast('用户名不存在', 'error'); return false; }
    if (user.password !== password) { toast('密码错误', 'error'); return false; }

    currentUser = username;
    toast(`欢迎回来，${user.name || username}！`, 'success');
    updateNavButtons();
    navigateTo('home');
    return false;
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const password2 = document.getElementById('regPassword2').value.trim();
    const name = document.getElementById('regName').value.trim();
    const idNumber = document.getElementById('regIdNumber').value.trim();
    const address = document.getElementById('regAddress').value.trim();

    if (!username || !password || !password2 || !name || !idNumber) {
        toast('请填写所有必填字段', 'error'); return false;
    }
    if (password !== password2) { toast('两次密码不一致', 'error'); return false; }
    if (password.length < 4) { toast('密码至少4位', 'error'); return false; }

    if (!allData) allData = { users: {}, news: [], elections: [], chats: {} };
    if (allData.users[username]) { toast('用户名已存在', 'error'); return false; }

    allData.users[username] = {
        password: password,
        name: name,
        idNumber: idNumber,
        address: address || '',
        role: 'user',
        position: ''
    };

    try {
        await githubWriteData(allData);
        currentUser = username;
        toast(`注册成功！欢迎 ${name}！`, 'success');
        updateNavButtons();
        navigateTo('home');
    } catch (err) {
        toast('注册失败: ' + err.message, 'error');
    }
    return false;
}

function logout() {
    currentUser = null;
    toast('已退出', 'info');
    updateNavButtons();
    navigateTo('home');
}

// ============================================================
//  8. 首页
// ============================================================
function renderHome() {
    if (!allData) return;
    const users = allData.users || {};
    const news = allData.news || [];
    const elections = allData.elections || [];
    const chats = allData.chats || {};

    const container = document.getElementById('homeNewsList');
    if (news.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>暂无新闻</p></div>`;
    } else {
        container.innerHTML = news.slice(0,5).map(n => `
            <div class="news-item" style="cursor:pointer;" onclick="viewNewsDetail('${n.id}')">
                <div class="title">${n.title}</div>
                <div class="meta">
                    <span>📅 ${n.date}</span>
                    <span>👤 ${getUserDisplayName(n.author)}</span>
                    <span>💬 ${(n.comments||[]).length} 条回复</span>
                </div>
                <div class="summary">${(n.content||'').slice(0,120)}${(n.content||'').length>120?'...':''}</div>
            </div>
        `).join('');
    }

    document.getElementById('totalUsers').textContent = Object.keys(users).length;
    document.getElementById('totalNews').textContent = news.length;
    document.getElementById('totalElections').textContent = elections.filter(e => e.status === 'active').length;
    let chatCount = 0;
    for (let k in chats) chatCount += chats[k].length;
    document.getElementById('totalChats').textContent = chatCount;
}

// ============================================================
//  9. 新闻
// ============================================================
function renderNewsList() {
    if (!allData) return;
    const news = allData.news || [];
    const container = document.getElementById('newsListContainer');
    if (news.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>暂无新闻</p></div>`;
    } else {
        container.innerHTML = news.map(n => `
            <div class="news-item">
                <div class="title" onclick="viewNewsDetail('${n.id}')">${n.title}</div>
                <div class="meta">
                    <span>📅 ${n.date}</span>
                    <span>👤 ${getUserDisplayName(n.author)}</span>
                    <span>💬 ${(n.comments||[]).length} 条回复</span>
                </div>
                <div class="summary">${(n.content||'').slice(0,150)}${(n.content||'').length>150?'...':''}</div>
                <div class="actions">
                    <button class="btn btn-outline btn-sm" onclick="viewNewsDetail('${n.id}')">阅读全文</button>
                    ${isAdmin(currentUser) ? `<button class="btn btn-danger btn-sm" onclick="deleteNews('${n.id}')">删除</button>` : ''}
                </div>
            </div>
        `).join('');
    }
    document.getElementById('newsDetailContainer').style.display = 'none';
    document.getElementById('newsListContainer').style.display = 'block';
}

function showNewsEditor(editId = null) {
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return; }
    const editor = document.getElementById('newsEditor');
    editor.style.display = 'block';
    document.getElementById('newsEditorTitle').textContent = editId ? '✏️ 编辑新闻' : '📝 新建新闻';
    document.getElementById('newsListContainer').style.display = 'none';
    document.getElementById('newsDetailContainer').style.display = 'none';

    if (editId && allData) {
        const item = allData.news.find(n => n.id === editId);
        if (item) {
            document.getElementById('newsEditId').value = editId;
            document.getElementById('newsTitle').value = item.title || '';
            document.getElementById('newsContent').value = item.content || '';
        }
    } else {
        document.getElementById('newsEditId').value = '';
        document.getElementById('newsTitle').value = '';
        document.getElementById('newsContent').value = '';
    }
    editor.scrollIntoView({ behavior: 'smooth' });
}

function cancelNewsEditor() {
    document.getElementById('newsEditor').style.display = 'none';
    document.getElementById('newsListContainer').style.display = 'block';
    renderNewsList();
}

async function handleNewsSubmit(e) {
    e.preventDefault();
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return false; }
    const id = document.getElementById('newsEditId').value;
    const title = document.getElementById('newsTitle').value.trim();
    const content = document.getElementById('newsContent').value.trim();
    if (!title || !content) { toast('请填写完整', 'error'); return false; }

    if (!allData) allData = { users: {}, news: [], elections: [], chats: {} };

    if (id) {
        const idx = allData.news.findIndex(n => n.id === id);
        if (idx !== -1) {
            allData.news[idx].title = title;
            allData.news[idx].content = content;
            toast('新闻已更新', 'success');
        }
    } else {
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        allData.news.push({
            id: newId,
            title,
            content,
            date: getToday(),
            author: currentUser,
            comments: []
        });
        toast('新闻发布成功', 'success');
    }

    try {
        await githubWriteData(allData);
        cancelNewsEditor();
        renderNewsList();
        if (document.getElementById('page-home').classList.contains('active')) renderHome();
    } catch (err) {
        toast('保存失败: ' + err.message, 'error');
    }
    return false;
}

async function deleteNews(id) {
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return; }
    if (!confirm('确定要删除此新闻吗？')) return;
    if (!allData) return;
    allData.news = allData.news.filter(n => n.id !== id);
    try {
        await githubWriteData(allData);
        toast('新闻已删除', 'info');
        renderNewsList();
        if (document.getElementById('page-home').classList.contains('active')) renderHome();
    } catch (err) {
        toast('删除失败: ' + err.message, 'error');
    }
}

function viewNewsDetail(id) {
    if (!allData) return;
    const item = allData.news.find(n => n.id === id);
    if (!item) { toast('新闻不存在', 'error'); return; }

    document.getElementById('newsListContainer').style.display = 'none';
    document.getElementById('newsEditor').style.display = 'none';
    const container = document.getElementById('newsDetailContainer');
    container.style.display = 'block';
    document.getElementById('newsDetailTitle').textContent = `📄 ${item.title}`;

    let commentsHtml = '';
    if (item.comments && item.comments.length > 0) {
        commentsHtml = item.comments.map(c => `
            <div style="padding:8px 0;border-bottom:1px solid #f0f2f5;">
                <strong>${getUserDisplayName(c.user)}</strong>
                <span class="text-muted" style="font-size:12px;margin-left:8px;">${formatDate(c.date)}</span>
                <p style="margin:4px 0 0;color:#333;">${c.text}</p>
            </div>
        `).join('');
    } else {
        commentsHtml = `<div class="text-muted" style="padding:8px 0;">暂无回复</div>`;
    }
    document.getElementById('newsComments').innerHTML = commentsHtml;

    document.getElementById('newsDetailContent').innerHTML = `
        <div style="margin-bottom:12px;color:#888;font-size:14px;">
            📅 ${item.date} &nbsp;|&nbsp; 👤 ${getUserDisplayName(item.author)}
        </div>
        <div style="line-height:1.8;font-size:15px;white-space:pre-wrap;">${item.content}</div>
    `;
    container.dataset.newsId = id;
    container.scrollIntoView({ behavior: 'smooth' });
}

function closeNewsDetail() {
    document.getElementById('newsDetailContainer').style.display = 'none';
    document.getElementById('newsListContainer').style.display = 'block';
    renderNewsList();
}

async function submitNewsComment() {
    if (!currentUser) { toast('请先登录', 'error'); return; }
    const container = document.getElementById('newsDetailContainer');
    const newsId = container.dataset.newsId;
    if (!newsId) { toast('请先打开新闻', 'error'); return; }
    const input = document.getElementById('newsCommentInput');
    const text = input.value.trim();
    if (!text) { toast('请输入内容', 'error'); return; }

    if (!allData) return;
    const item = allData.news.find(n => n.id === newsId);
    if (!item) { toast('新闻不存在', 'error'); return; }
    if (!item.comments) item.comments = [];
    item.comments.push({ user: currentUser, text, date: getNow() });

    try {
        await githubWriteData(allData);
        input.value = '';
        toast('回复成功', 'success');
        viewNewsDetail(newsId);
    } catch (err) {
        toast('回复失败: ' + err.message, 'error');
    }
}

// ============================================================
//  10. 选举
// ============================================================
function renderElections() {
    if (!allData) return;
    const elections = allData.elections || [];
    const container = document.getElementById('electionListContainer');
    if (elections.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">🗳️</div><p>暂无选举</p></div>`;
        return;
    }
    container.innerHTML = elections.map(e => {
        const isActive = e.status === 'active';
        const statusLabel = isActive ? '进行中' : (e.status === 'ended' ? '已结束' : '待开始');
        const statusClass = isActive ? 'active' : (e.status === 'ended' ? 'ended' : 'pending');
        const candidatesHtml = (e.candidates||[]).map(c => {
            const voteCount = (e.votes && e.votes[c]) ? e.votes[c] : 0;
            const isWinner = e.winner === c;
            return `<span class="cand">${getUserDisplayName(c)} ${isWinner ? '🏆' : ''} <span class="votes">${voteCount} 票</span></span>`;
        }).join('');

        let resultHtml = '';
        if (e.status === 'ended' && e.winner) {
            resultHtml = `<div class="e-result">🏆 当选者：<strong>${getUserDisplayName(e.winner)}</strong> 成功当选「${e.position}」</div>`;
        } else if (e.status === 'active') {
            resultHtml = `<div style="margin-top:10px;"><button class="btn btn-primary btn-sm" onclick="voteElection('${e.id}')">🗳️ 投票</button></div>`;
        }

        const canManage = isAdmin(currentUser);
        return `
            <div class="election-card">
                <div class="flex-between">
                    <div>
                        <span class="e-title">${e.position}</span>
                        <span class="e-status ${statusClass}">${statusLabel}</span>
                    </div>
                    ${canManage ? `<div style="display:flex;gap:6px;">
                        ${isActive ? `<button class="btn btn-danger btn-sm" onclick="endElection('${e.id}')">结束选举</button>` : ''}
                        <button class="btn btn-outline btn-sm" onclick="editElection('${e.id}')">编辑</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteElection('${e.id}')">删除</button>
                    </div>` : ''}
                </div>
                <div class="e-desc">${e.description || '暂无描述'}</div>
                <div class="e-candidates">${candidatesHtml}</div>
                ${resultHtml}
                ${canManage ? `<div style="margin-top:8px;font-size:13px;color:#888;">候选人：${(e.candidates||[]).join(', ')}</div>` : ''}
            </div>
        `;
    }).join('');
}

function showElectionEditor(editId = null) {
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return; }
    const editor = document.getElementById('electionEditor');
    editor.style.display = 'block';
    document.getElementById('electionEditorTitle').textContent = editId ? '✏️ 编辑选举' : '📝 新建选举';
    document.getElementById('electionListContainer').style.display = 'none';

    if (editId && allData) {
        const e = allData.elections.find(el => el.id === editId);
        if (e) {
            document.getElementById('electionEditId').value = editId;
            document.getElementById('electionPosition').value = e.position || '';
            document.getElementById('electionDescription').value = e.description || '';
            document.getElementById('electionCandidates').value = (e.candidates||[]).join(',');
        }
    } else {
        document.getElementById('electionEditId').value = '';
        document.getElementById('electionPosition').value = '';
        document.getElementById('electionDescription').value = '';
        document.getElementById('electionCandidates').value = '';
    }
    editor.scrollIntoView({ behavior: 'smooth' });
}

function cancelElectionEditor() {
    document.getElementById('electionEditor').style.display = 'none';
    document.getElementById('electionListContainer').style.display = 'block';
    renderElections();
}

async function handleElectionSubmit(e) {
    e.preventDefault();
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return false; }
    const id = document.getElementById('electionEditId').value;
    const position = document.getElementById('electionPosition').value.trim();
    const description = document.getElementById('electionDescription').value.trim();
    const candidatesStr = document.getElementById('electionCandidates').value.trim();

    if (!position || !candidatesStr) { toast('请填写职位和候选人', 'error'); return false; }
    const candidates = candidatesStr.split(',').map(s => s.trim()).filter(s => s);
    if (candidates.length < 2) { toast('至少需要2位候选人', 'error'); return false; }

    if (!allData) allData = { users: {}, news: [], elections: [], chats: {} };

    // 验证候选人是否存在
    for (let c of candidates) {
        if (!allData.users[c]) {
            toast(`候选人 "${c}" 不存在，请先注册`, 'error');
            return false;
        }
    }

    if (id) {
        const idx = allData.elections.findIndex(el => el.id === id);
        if (idx !== -1) {
            const old = allData.elections[idx];
            const votes = old.votes || {};
            for (let k in votes) {
                if (!candidates.includes(k)) delete votes[k];
            }
            for (let c of candidates) {
                if (!(c in votes)) votes[c] = 0;
            }
            allData.elections[idx] = {
                ...old,
                position,
                description,
                candidates,
                votes
            };
            toast('选举已更新', 'success');
        }
    } else {
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        const votes = {};
        for (let c of candidates) votes[c] = 0;
        allData.elections.push({
            id: newId,
            position,
            description,
            candidates,
            votes,
            status: 'active',
            winner: null
        });
        toast('选举创建成功', 'success');
    }

    try {
        await githubWriteData(allData);
        cancelElectionEditor();
        renderElections();
    } catch (err) {
        toast('操作失败: ' + err.message, 'error');
    }
    return false;
}

function editElection(id) {
    showElectionEditor(id);
}

async function deleteElection(id) {
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return; }
    if (!confirm('确定要删除此选举吗？')) return;
    if (!allData) return;
    allData.elections = allData.elections.filter(e => e.id !== id);
    try {
        await githubWriteData(allData);
        toast('选举已删除', 'info');
        renderElections();
    } catch (err) {
        toast('删除失败: ' + err.message, 'error');
    }
}

async function voteElection(id) {
    if (!currentUser) { toast('请先登录', 'error'); return; }
    if (!allData) return;
    const e = allData.elections.find(el => el.id === id);
    if (!e) { toast('选举不存在', 'error'); return; }
    if (e.status !== 'active') { toast('选举已结束', 'error'); return; }

    if (!e.candidates.includes(currentUser)) {
        if (confirm('您不是候选人，是否报名参加此选举？')) {
            e.candidates.push(currentUser);
            e.votes[currentUser] = 0;
            try {
                await githubWriteData(allData);
                toast('报名成功！您已加入候选人列表', 'success');
                renderElections();
            } catch (err) {
                toast('报名失败: ' + err.message, 'error');
            }
            return;
        }
        return;
    }

    const candidateList = e.candidates.filter(c => c !== currentUser);
    if (candidateList.length === 0) { toast('没有其他候选人可投票', 'error'); return; }
    const choice = prompt(`请选择您要投票的候选人 (输入用户名):\n${candidateList.join(', ')}`);
    if (!choice) return;
    const target = choice.trim();
    if (!e.candidates.includes(target)) { toast('候选人不存在', 'error'); return; }
    if (target === currentUser) { toast('不能投给自己', 'error'); return; }
    e.votes[target] = (e.votes[target] || 0) + 1;

    try {
        await githubWriteData(allData);
        toast(`投票成功！已投给 ${getUserDisplayName(target)}`, 'success');
        renderElections();
    } catch (err) {
        toast('投票失败: ' + err.message, 'error');
    }
}

async function endElection(id) {
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return; }
    if (!confirm('确定要结束此选举并公布结果吗？')) return;
    if (!allData) return;
    const e = allData.elections.find(el => el.id === id);
    if (!e) { toast('选举不存在', 'error'); return; }
    if (e.status !== 'active') { toast('选举已结束', 'error'); return; }

    let maxVotes = -1;
    let winner = null;
    for (let c in e.votes) {
        if (e.votes[c] > maxVotes) {
            maxVotes = e.votes[c];
            winner = c;
        }
    }
    if (winner) {
        e.winner = winner;
        e.status = 'ended';
        if (allData.users[winner]) {
            allData.users[winner].position = e.position;
        }
        toast(`选举结束！${getUserDisplayName(winner)} 以 ${maxVotes} 票当选「${e.position}」`, 'success');
    } else {
        e.status = 'ended';
        toast('选举结束，但无有效票数', 'info');
    }

    try {
        await githubWriteData(allData);
        renderElections();
        if (document.getElementById('page-home').classList.contains('active')) renderHome();
    } catch (err) {
        toast('结束选举失败: ' + err.message, 'error');
    }
}

// ============================================================
//  11. 聊天
// ============================================================
function loadChatUsers() {
    if (!currentUser || !allData) return;
    const users = allData.users || {};
    const select = document.getElementById('chatUserSelect');
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- 选择聊天对象 --</option>';
    for (let u in users) {
        if (u === currentUser) continue;
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = getUserDisplayName(u);
        select.appendChild(opt);
    }
    if (currentVal && users[currentVal]) {
        select.value = currentVal;
    }
    if (select.value) {
        chatTarget = select.value;
        loadChatMessages(chatTarget);
        document.getElementById('chatTargetName').textContent = getUserDisplayName(chatTarget);
    } else {
        chatTarget = null;
        document.getElementById('chatTargetName').textContent = '选择用户';
        document.getElementById('chatMessages').innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="icon">💬</div><p>选择一位用户开始聊天</p></div>`;
    }
}

function switchChatUser() {
    const select = document.getElementById('chatUserSelect');
    chatTarget = select.value || null;
    if (chatTarget) {
        document.getElementById('chatTargetName').textContent = getUserDisplayName(chatTarget);
        loadChatMessages(chatTarget);
    } else {
        document.getElementById('chatTargetName').textContent = '选择用户';
        document.getElementById('chatMessages').innerHTML = `<div class="empty-state" style="padding:30px 0;"><div class="icon">💬</div><p>选择一位用户开始聊天</p></div>`;
    }
}

function loadChatMessages(target) {
    if (!currentUser || !target || !allData) return;
    const key = getChatKey(currentUser, target);
    const messages = (allData.chats && allData.chats[key]) || [];
    const container = document.getElementById('chatMessages');
    if (messages.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:20px 0;"><div class="icon">💬</div><p>暂无消息，开始聊天吧</p></div>`;
        return;
    }
    container.innerHTML = messages.map(m => {
        const isMe = m.from === currentUser;
        return `<div class="msg ${isMe ? 'me' : 'other'}">
                    <strong>${isMe ? '我' : getUserDisplayName(m.from)}</strong>
                    ${m.message}
                    <span class="time">${formatDate(m.timestamp)}</span>
                </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    if (!currentUser) { toast('请先登录', 'error'); return; }
    if (!chatTarget) { toast('请选择聊天对象', 'error'); return; }
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) { toast('请输入消息', 'error'); return; }

    const key = getChatKey(currentUser, chatTarget);
    if (!allData.chats) allData.chats = {};
    if (!allData.chats[key]) allData.chats[key] = [];
    allData.chats[key].push({
        from: currentUser,
        to: chatTarget,
        message: text,
        timestamp: getNow()
    });

    try {
        await githubWriteData(allData);
        input.value = '';
        loadChatMessages(chatTarget);
        if (document.getElementById('page-home').classList.contains('active')) renderHome();
    } catch (err) {
        toast('发送失败: ' + err.message, 'error');
    }
}

// ============================================================
//  12. 公民名录
// ============================================================
function renderUserGrid() {
    if (!allData) return;
    const users = allData.users || {};
    const container = document.getElementById('userGridContainer');
    const keys = Object.keys(users);
    if (keys.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">👤</div><p>暂无公民</p></div>`;
        return;
    }
    container.innerHTML = keys.map(u => {
        const info = users[u] || {};
        const pos = info.position || '';
        const role = info.role === 'admin' ? '管理员' : '公民';
        return `
            <div class="user-card" onclick="viewUserProfile('${u}')">
                <div class="u-avatar">${(info.name || u).charAt(0).toUpperCase()}</div>
                <div class="u-name">${info.name || u}</div>
                <div class="u-info">@${u}</div>
                ${pos ? `<div class="u-badge">${pos}</div>` : ''}
                <div style="font-size:11px;color:#999;margin-top:4px;">${role}</div>
            </div>
        `;
    }).join('');
    document.getElementById('userProfileContainer').style.display = 'none';
    document.getElementById('userGridContainer').style.display = 'grid';
}

function viewUserProfile(username) {
    profileViewingUser = username;
    if (!allData) return;
    const user = allData.users[username];
    if (!user) { toast('用户不存在', 'error'); return; }
    document.getElementById('userGridContainer').style.display = 'none';
    const container = document.getElementById('userProfileContainer');
    container.style.display = 'block';
    document.getElementById('profileUserName').textContent = `👤 ${user.name || username}`;

    const pos = user.position || '无';
    const role = user.role === 'admin' ? '管理员' : '公民';
    document.getElementById('profileContent').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:480px;">
            <div><strong>用户名</strong><br>${username}</div>
            <div><strong>真实姓名</strong><br>${user.name || '-'}</div>
            <div><strong>职位</strong><br>${pos}</div>
            <div><strong>角色</strong><br>${role}</div>
            <div style="grid-column:1/-1;"><strong>身份证号</strong><br>${user.idNumber || '-'}</div>
            <div style="grid-column:1/-1;"><strong>住址</strong><br>${user.address || '-'}</div>
        </div>
    `;
    const chatBtn = document.getElementById('profileChatBtn');
    chatBtn.style.display = 'inline-block';
    if (isAdmin(currentUser) && username !== currentUser) {
        const posHtml = `
            <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <span style="font-weight:500;">管理员操作：</span>
                <input type="text" id="adminSetPosition" placeholder="设置职位" value="${user.position||''}" style="padding:6px 12px;border:1.5px solid #dde0e8;border-radius:30px;font-size:13px;width:160px;" />
                <button class="btn btn-primary btn-sm" onclick="adminSetPosition('${username}')">设置职位</button>
                <button class="btn btn-danger btn-sm" onclick="adminRemovePosition('${username}')">撤销职位</button>
            </div>
        `;
        document.getElementById('profileContent').innerHTML += posHtml;
    }
    container.scrollIntoView({ behavior: 'smooth' });
}

function closeUserProfile() {
    document.getElementById('userProfileContainer').style.display = 'none';
    document.getElementById('userGridContainer').style.display = 'grid';
    renderUserGrid();
}

function chatWithUser() {
    if (!profileViewingUser) return;
    if (!currentUser) { toast('请先登录', 'error'); return; }
    if (currentUser === profileViewingUser) { toast('不能和自己聊天', 'error'); return; }
    navigateTo('chat');
    setTimeout(() => {
        const select = document.getElementById('chatUserSelect');
        select.value = profileViewingUser;
        switchChatUser();
    }, 100);
}

async function adminSetPosition(username) {
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return; }
    const pos = document.getElementById('adminSetPosition').value.trim();
    if (!pos) { toast('请输入职位名称', 'error'); return; }
    if (!allData || !allData.users[username]) { toast('用户不存在', 'error'); return; }
    allData.users[username].position = pos;
    try {
        await githubWriteData(allData);
        toast(`已为 ${getUserDisplayName(username)} 设置职位：${pos}`, 'success');
        viewUserProfile(username);
        renderUserGrid();
        if (document.getElementById('page-admin').classList.contains('active')) renderAdmin();
    } catch (err) {
        toast('操作失败: ' + err.message, 'error');
    }
}

async function adminRemovePosition(username) {
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return; }
    if (!confirm(`确定要撤销 ${getUserDisplayName(username)} 的职位吗？`)) return;
    if (!allData || !allData.users[username]) { toast('用户不存在', 'error'); return; }
    allData.users[username].position = '';
    try {
        await githubWriteData(allData);
        toast(`已撤销 ${getUserDisplayName(username)} 的职位`, 'info');
        viewUserProfile(username);
        renderUserGrid();
        if (document.getElementById('page-admin').classList.contains('active')) renderAdmin();
    } catch (err) {
        toast('操作失败: ' + err.message, 'error');
    }
}

// ============================================================
//  13. 身份证
// ============================================================
function renderIdCard() {
    if (!currentUser || !allData) return;
    const info = allData.users[currentUser] || {};
    document.getElementById('idUsername').textContent = currentUser;
    document.getElementById('idName').textContent = info.name || '-';
    document.getElementById('idNumber').textContent = info.idNumber || '-';
    document.getElementById('idAddress').textContent = info.address || '-';
    document.getElementById('idRole').textContent = info.role === 'admin' ? '管理员' : '公民';
    document.getElementById('idPosition').textContent = info.position || '无';
    document.getElementById('idCardEditor').style.display = 'none';
}

function editMyIdCard() {
    if (!currentUser || !allData) return;
    const info = allData.users[currentUser] || {};
    document.getElementById('idEditName').value = info.name || '';
    document.getElementById('idEditNumber').value = info.idNumber || '';
    document.getElementById('idEditAddress').value = info.address || '';
    document.getElementById('idCardEditor').style.display = 'block';
    document.getElementById('idCardEditor').scrollIntoView({ behavior: 'smooth' });
}

function cancelIdCardEdit() {
    document.getElementById('idCardEditor').style.display = 'none';
    renderIdCard();
}

async function handleIdCardUpdate(e) {
    e.preventDefault();
    if (!currentUser || !allData) { toast('请先登录', 'error'); return false; }
    const name = document.getElementById('idEditName').value.trim();
    const idNumber = document.getElementById('idEditNumber').value.trim();
    const address = document.getElementById('idEditAddress').value.trim();
    if (!name || !idNumber) { toast('姓名和身份证号不能为空', 'error'); return false; }

    allData.users[currentUser].name = name;
    allData.users[currentUser].idNumber = idNumber;
    allData.users[currentUser].address = address || '';

    try {
        await githubWriteData(allData);
        toast('身份证信息已更新', 'success');
        cancelIdCardEdit();
        renderIdCard();
        updateNavButtons();
    } catch (err) {
        toast('更新失败: ' + err.message, 'error');
    }
    return false;
}

// ============================================================
//  14. 管理员面板
// ============================================================
function renderAdmin() {
    if (!isAdmin(currentUser) || !allData) return;
    document.getElementById('adminNameDisplay').textContent = allData.users.zhaotianle?.name || '赵天乐';
    switchAdminTab('admin-news');
}

function switchAdminTab(tabId) {
    document.querySelectorAll('.admin-panel').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.admin-tabs button').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    const btn = document.querySelector(`.admin-tabs button[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');

    if (tabId === 'admin-news') renderAdminNews();
    else if (tabId === 'admin-elections') renderAdminElections();
    else if (tabId === 'admin-users') renderAdminUsers();
}

function renderAdminNews() {
    if (!allData) return;
    const news = allData.news || [];
    const container = document.getElementById('adminNewsList');
    if (news.length === 0) {
        container.innerHTML = `<div class="text-muted">暂无新闻</div>`;
        return;
    }
    container.innerHTML = news.map(n => `
        <div style="padding:10px 0;border-bottom:1px solid #f0f2f5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
                <strong>${n.title}</strong>
                <span class="text-muted" style="font-size:12px;margin-left:10px;">${n.date}</span>
            </div>
            <div style="display:flex;gap:6px;">
                <button class="btn btn-outline btn-sm" onclick="showNewsEditor('${n.id}')">编辑</button>
                <button class="btn btn-danger btn-sm" onclick="deleteNews('${n.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

function renderAdminElections() {
    if (!allData) return;
    const elections = allData.elections || [];
    const container = document.getElementById('adminElectionList');
    if (elections.length === 0) {
        container.innerHTML = `<div class="text-muted">暂无选举</div>`;
        return;
    }
    container.innerHTML = elections.map(e => {
        const statusLabel = e.status === 'active' ? '进行中' : (e.status === 'ended' ? '已结束' : '待开始');
        return `
            <div style="padding:10px 0;border-bottom:1px solid #f0f2f5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                    <strong>${e.position}</strong>
                    <span class="tag">${statusLabel}</span>
                    <span class="text-muted" style="font-size:12px;margin-left:8px;">候选人：${(e.candidates||[]).join(', ')}</span>
                    ${e.winner ? `<span style="background:#d4af37;padding:0 10px;border-radius:30px;font-size:12px;font-weight:600;color:#0b1a3a;">🏆 ${getUserDisplayName(e.winner)}</span>` : ''}
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-outline btn-sm" onclick="editElection('${e.id}')">编辑</button>
                    ${e.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="endElection('${e.id}')">结束</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteElection('${e.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAdminUsers() {
    if (!allData) return;
    const users = allData.users || {};
    const container = document.getElementById('adminUserList');
    const list = Object.keys(users);
    if (list.length === 0) {
        container.innerHTML = `<div class="text-muted">暂无用户</div>`;
        return;
    }
    container.innerHTML = list.map(u => {
        const info = users[u] || {};
        return `
            <div style="padding:8px 0;border-bottom:1px solid #f0f2f5;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                <div>
                    <strong>${info.name || u}</strong>
                    <span class="text-muted" style="font-size:12px;margin-left:8px;">@${u}</span>
                    ${info.position ? `<span class="badge badge-admin">${info.position}</span>` : ''}
                    ${info.role === 'admin' ? '<span class="badge" style="background:#d4af37;color:#0b1a3a;">管理员</span>' : ''}
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-outline btn-sm" onclick="viewUserProfile('${u}')">查看</button>
                    ${u !== 'zhaotianle' ? `<button class="btn btn-danger btn-sm" onclick="adminDeleteUser('${u}')">删除</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function adminDeleteUser(username) {
    if (!isAdmin(currentUser)) { toast('需要管理员权限', 'error'); return; }
    if (username === 'zhaotianle') { toast('不能删除管理员账号', 'error'); return; }
    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可恢复！`)) return;
    if (!allData) return;

    delete allData.users[username];
    // 删除相关聊天记录
    for (let k in allData.chats) {
        if (k.includes(username)) delete allData.chats[k];
    }
    // 从选举中移除
    for (let e of allData.elections) {
        e.candidates = (e.candidates||[]).filter(c => c !== username);
        if (e.votes) delete e.votes[username];
        if (e.winner === username) e.winner = null;
    }

    try {
        await githubWriteData(allData);
        toast(`已删除用户 ${username}`, 'info');
        renderAdminUsers();
        renderUserGrid();
        if (document.getElementById('page-home').classList.contains('active')) renderHome();
    } catch (err) {
        toast('删除失败: ' + err.message, 'error');
    }
}

// ============================================================
//  15. 数据导入/导出（管理员）
// ============================================================
function exportAllData() {
    if (!allData) { toast('没有数据可导出', 'error'); return; }
    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfr_data_${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('数据导出成功', 'success');
}

function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.users || !data.news || !data.elections) {
                toast('无效的数据文件', 'error');
                return;
            }
            if (!confirm('导入将覆盖当前所有数据，确定继续吗？')) return;
            allData = data;
            await githubWriteData(allData);
            toast('数据导入成功，页面将刷新', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (err) {
            toast('数据解析失败: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function clearAllData() {
    if (!confirm('确定要清除所有数据吗？此操作不可恢复！')) return;
    if (!confirm('再次确认：清除所有数据？')) return;
    const emptyData = {
        users: {
            zhaotianle: {
                password: 'ziyouguo1314',
                name: '赵天乐',
                idNumber: '110101198505055678',
                address: '北京市海淀区',
                role: 'admin',
                position: '系统管理员'
            }
        },
        news: [],
        elections: [],
        chats: {}
    };
    try {
        await githubWriteData(emptyData);
        allData = emptyData;
        toast('所有数据已清除', 'info');
        setTimeout(() => location.reload(), 500);
    } catch (err) {
        toast('清除失败: ' + err.message, 'error');
    }
}

// ============================================================
//  16. 初始化
// ============================================================
// 暴露全局函数
window.navigateTo = navigateTo;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.renderHome = renderHome;
window.renderNewsList = renderNewsList;
window.renderElections = renderElections;
window.renderUserGrid = renderUserGrid;
window.renderIdCard = renderIdCard;
window.renderAdmin = renderAdmin;
window.viewNewsDetail = viewNewsDetail;
window.closeNewsDetail = closeNewsDetail;
window.submitNewsComment = submitNewsComment;
window.showNewsEditor = showNewsEditor;
window.cancelNewsEditor = cancelNewsEditor;
window.handleNewsSubmit = handleNewsSubmit;
window.deleteNews = deleteNews;
window.showElectionEditor = showElectionEditor;
window.cancelElectionEditor = cancelElectionEditor;
window.handleElectionSubmit = handleElectionSubmit;
window.editElection = editElection;
window.deleteElection = deleteElection;
window.voteElection = voteElection;
window.endElection = endElection;
window.loadChatUsers = loadChatUsers;
window.switchChatUser = switchChatUser;
window.sendChatMessage = sendChatMessage;
window.viewUserProfile = viewUserProfile;
window.closeUserProfile = closeUserProfile;
window.chatWithUser = chatWithUser;
window.adminSetPosition = adminSetPosition;
window.adminRemovePosition = adminRemovePosition;
window.adminDeleteUser = adminDeleteUser;
window.switchAdminTab = switchAdminTab;
window.editMyIdCard = editMyIdCard;
window.cancelIdCardEdit = cancelIdCardEdit;
window.handleIdCardUpdate = handleIdCardUpdate;
window.exportAllData = exportAllData;
window.importAllData = importAllData;
window.clearAllData = clearAllData;
window.getUserDisplayName = getUserDisplayName;

document.addEventListener('DOMContentLoaded', async function() {
    // 1. 检查 GitHub 配置
    if (!loadGitHubConfig()) {
        const ok = promptGitHubConfig();
        if (!ok) {
            toast('必须配置 GitHub 才能使用本系统', 'error');
            return;
        }
    }

    // 2. 加载数据（并初始化预设用户）
    try {
        allData = await ensureInitialData();
    } catch (err) {
        toast('数据加载失败，请检查配置: ' + err.message, 'error');
        return;
    }

    // 3. 设置导航事件
    document.querySelectorAll('.nav-links button[data-page]').forEach(btn => {
        btn.addEventListener('click', function() {
            navigateTo(this.dataset.page);
        });
    });
    document.querySelectorAll('.admin-tabs button').forEach(btn => {
        btn.addEventListener('click', function() {
            switchAdminTab(this.dataset.tab);
        });
    });

    // 4. 显示首页
    navigateTo('home');
});
