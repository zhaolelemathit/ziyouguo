
/**
 * 新自由民主共和国官方网站 - 核心逻辑
 * 使用 localStorage 模拟后端数据库
 */

const app = {
    // 配置常量
    ADMIN_USER: 'zhaotianle',
    ADMIN_PASS: 'ziyouguo1314',
    
    // 状态
    currentUser: null,
    tempRegData: null, // 注册临时数据
    currentChatTarget: 'public',

    // 初始化
    init: function() {
        this.loadData();
        this.checkLoginStatus();
        this.setupEventListeners();
        this.renderNews();
        this.renderElections();
        
        // 如果是管理员，预加载管理员数据
        if (this.currentUser && this.currentUser.role === 'admin') {
            this.renderAdminUsers();
            this.renderAdminNewsList();
            this.renderAdminCandList();
        }
    },

    // 数据加载与初始化
    loadData: function() {
        if (!localStorage.getItem('nld_users')) {
            // 初始化管理员账号
            const admin = {
                username: this.ADMIN_USER,
                password: this.ADMIN_PASS,
                role: 'admin',
                realName: '赵天乐',
                idNumber: '110101202600000001',
                address: '首都行政区中心大道1号'
            };
            localStorage.setItem('nld_users', JSON.stringify([admin]));
        }
        if (!localStorage.getItem('nld_news')) {
            const initialNews = [
                { id: 1, title: '新自由民主共和国成立五周年庆典圆满举行', content: '全国上下洋溢着喜庆的气氛...', date: '2026-07-15' },
                { id: 2, title: '关于加强网络安全管理的若干规定', content: '为了保障公民信息安全...', date: '2026-07-10' }
            ];
            localStorage.setItem('nld_news', JSON.stringify(initialNews));
        }
        if (!localStorage.getItem('nld_elections')) {
            const initialCands = [
                { id: 1, name: '李明', position: '市政厅长', votes: 120, desc: '致力于城市基础设施建设' },
                { id: 2, name: '王芳', position: '市政厅长', votes: 95, desc: '关注教育与环境保护' }
            ];
            localStorage.setItem('nld_elections', JSON.stringify(initialCands));
        }
        if (!localStorage.getItem('nld_chats')) {
            localStorage.setItem('nld_chats', JSON.stringify([]));
        }
    },

    // 获取数据存储
    getUsers: () => JSON.parse(localStorage.getItem('nld_users') || '[]'),
    getNews: () => JSON.parse(localStorage.getItem('nld_news') || '[]'),
    getElections: () => JSON.parse(localStorage.getItem('nld_elections') || '[]'),
    getChats: () => JSON.parse(localStorage.getItem('nld_chats') || '[]'),

    // 保存数据存储
    saveUsers: (data) => localStorage.setItem('nld_users', JSON.stringify(data)),
    saveNews: (data) => localStorage.setItem('nld_news', JSON.stringify(data)),
    saveElections: (data) => localStorage.setItem('nld_elections', JSON.stringify(data)),
    saveChats: (data) => localStorage.setItem('nld_chats', JSON.stringify(data)),

    // 路由导航
    navigate: function(pageId) {
        // 隐藏所有页面
        document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
        // 显示目标页面
        const target = document.getElementById('page-' + pageId);
        if (target) {
            target.classList.add('active');
        }
        
        // 更新导航高亮
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        const navLink = document.querySelector(`nav a[href="#${pageId}"]`);
        if (navLink) navLink.classList.add('active');

        // 页面特定逻辑
        if (pageId === 'citizens') this.renderCitizens();
        if (pageId === 'chat') this.renderChat();
        if (pageId === 'admin' && this.currentUser?.role !== 'admin') {
            alert('无权访问');
            this.navigate('home');
        }
        if (pageId === 'profile') this.renderProfile();
    },

    // 检查登录状态
    checkLoginStatus: function() {
        const userStr = sessionStorage.getItem('nld_current_user');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
            this.updateUIForLoggedInUser();
        } else {
            this.updateUIForLoggedOutUser();
        }
    },

    // 更新UI：已登录
    updateUIForLoggedInUser: function() {
        const navHtml = `
            <ul>
                <li><a href="#home" onclick="app.navigate('home')">首页</a></li>
                <li><a href="#election" onclick="app.navigate('election')">公务员选举</a></li>
                <li><a href="#citizens" onclick="app.navigate('citizens')">公民广场</a></li>
                <li><a href="#chat" onclick="app.navigate('chat')">在线交流</a></li>
                ${this.currentUser.role === 'admin' ? '<li><a href="#admin" onclick="app.navigate(\'admin\')">政务管理</a></li>' : ''}
                <li><a href="#profile" onclick="app.navigate('profile')">个人中心</a></li>
            </ul>
        `;
        document.getElementById('nav-menu').innerHTML = navHtml;
        document.getElementById('user-status').innerHTML = `<span><i class="fa-solid fa-user"></i> ${this.currentUser.realName || this.currentUser.username}</span>`;
        
        // 默认跳回首页
        this.navigate('home');
    },

    // 更新UI：未登录
    updateUIForLoggedOutUser: function() {
        const navHtml = `
            <ul>
                <li><a href="#home" onclick="app.navigate('home')">首页</a></li>
                <li><a href="#login" onclick="app.navigate('login')">登录</a></li>
                <li><a href="#register" onclick="app.navigate('register')">注册</a></li>
            </ul>
        `;
        document.getElementById('nav-menu').innerHTML = navHtml;
        document.getElementById('user-status').innerHTML = `<span>游客</span>`;
        this.navigate('home');
    },

    // 事件监听设置
    setupEventListeners: function() {
        // 登录表单
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            this.handleLogin(username, password);
        });

        // 注册表单 Step 1
        document.getElementById('register-form-step1').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            
            // 检查用户名是否存在
            const users = this.getUsers();
            if (users.find(u => u.username === username)) {
                alert('用户名已存在');
                return;
            }

            this.tempRegData = { username, password };
            this.navigate('identity'); // 跳转到身份证页面
        });

        // 实名认证表单 Step 2
        document.getElementById('identity-form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (!this.tempRegData) {
                alert('注册流程错误，请重新注册');
                this.navigate('register');
                return;
            }

            const realName = document.getElementById('id-realname').value;
            const idNumber = document.getElementById('id-number').value;
            const address = document.getElementById('id-address').value;

            // 简单校验身份证长度
            if (idNumber.length !== 18) {
                alert('请输入有效的18位身份证号码');
                return;
            }

            const newUser = {
                ...this.tempRegData,
                realName,
                idNumber,
                address,
                role: 'user',
                registerDate: new Date().toLocaleDateString()
            };

            const users = this.getUsers();
            users.push(newUser);
            this.saveUsers(users);

            alert('注册成功！请登录。');
            this.tempRegData = null;
            this.navigate('login');
        });

        // 管理员新闻表单
        document.getElementById('admin-news-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveNews();
        });

        // 管理员选举表单
        document.getElementById('admin-election-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddCandidate();
        });
        
        // 公民搜索
        document.getElementById('citizen-search').addEventListener('input', (e) => {
            this.renderCitizens(e.target.value);
        });
    },

    // --- 业务逻辑功能 ---

    handleLogin: function(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            this.currentUser = user;
            sessionStorage.setItem('nld_current_user', JSON.stringify(user));
            this.updateUIForLoggedInUser();
        } else {
            alert('用户名或密码错误');
        }
    },

    logout: function() {
        this.currentUser = null;
        sessionStorage.removeItem('nld_current_user');
        this.updateUIForLoggedOutUser();
    },

    renderProfile: function() {
        if (!this.currentUser) return;
        document.getElementById('profile-name').textContent = this.currentUser.realName || this.currentUser.username;
        document.getElementById('profile-role').textContent = this.currentUser.role === 'admin' ? '政府管理员' : '普通公民';
        document.getElementById('profile-id').textContent = this.currentUser.idNumber || '未认证';
        document.getElementById('profile-address').textContent = this.currentUser.address || '未填写';
    },

    // --- 新闻模块 ---
    renderNews: function() {
        const newsList = this.getNews();
        const container = document.getElementById('news-list-container');
        container.innerHTML = newsList.map(n => `
            <div class="news-item">
                <h4>${n.title}</h4>
                <p>${n.content.substring(0, 100)}...</p>
                <span class="date">${n.date}</span>
            </div>
        `).join('');
    },

    handleSaveNews: function() {
        const title = document.getElementById('news-title').value;
        const content = document.getElementById('news-content').value;
        const editId = document.getElementById('edit-news-id').value;
        
        let newsList = this.getNews();
        
        if (editId) {
            // 编辑
            const index = newsList.findIndex(n => n.id == editId);
            if (index !== -1) {
                newsList[index].title = title;
                newsList[index].content = content;
                newsList[index].date = new Date().toLocaleDateString();
            }
        } else {
            // 新增
            const newId = newsList.length > 0 ? Math.max(...newsList.map(n => n.id)) + 1 : 1;
            newsList.unshift({
                id: newId,
                title,
                content,
                date: new Date().toLocaleDateString()
            });
        }
        
        this.saveNews(newsList);
        this.resetNewsForm();
        this.renderNews();
        this.renderAdminNewsList();
        alert('新闻已保存');
    },

    resetNewsForm: function() {
        document.getElementById('admin-news-form').reset();
        document.getElementById('edit-news-id').value = '';
    },

    renderAdminNewsList: function() {
        const newsList = this.getNews();
        const listEl = document.getElementById('admin-news-list');
        listEl.innerHTML = newsList.map(n => `
            <li>
                <span>${n.title} (${n.date})</span>
                <div>
                    <button class="btn-secondary" style="width:auto; padding:5px 10px;" onclick="app.editNews(${n.id})">编辑</button>
                    <button class="btn-danger" style="width:auto; padding:5px 10px;" onclick="app.deleteNews(${n.id})">删除</button>
                </div>
            </li>
        `).join('');
    },

    editNews: function(id) {
        const news = this.getNews().find(n => n.id === id);
        if (news) {
            document.getElementById('news-title').value = news.title;
            document.getElementById('news-content').value = news.content;
            document.getElementById('edit-news-id').value = news.id;
        }
    },

    deleteNews: function(id) {
        if(confirm('确定删除这条新闻吗？')) {
            let newsList = this.getNews().filter(n => n.id !== id);
            this.saveNews(newsList);
            this.renderNews();
            this.renderAdminNewsList();
        }
    },

    // --- 选举模块 ---
    renderElections: function() {
        const cands = this.getElections();
        const container = document.getElementById('election-list');
        container.innerHTML = cands.map(c => `
            <div class="candidate-card">
                <h3>${c.name}</h3>
                <p style="color:#666; font-size:0.9rem;">竞选职位：${c.position}</p>
                <p style="margin:10px 0;">${c.desc}</p>
                <p style="font-weight:bold; color:var(--primary-color);">当前票数：${c.votes}</p>
                <button class="vote-btn" onclick="app.vote(${c.id})">投票</button>
            </div>
        `).join('');
    },

    vote: function(id) {
        if (!this.currentUser) {
            alert('请先登录');
            this.navigate('login');
            return;
        }
        
        // 简单防止重复投票（实际项目应更严格）
        const votedKey = `voted_${this.currentUser.username}_${id}`;
        if (sessionStorage.getItem(votedKey)) {
            alert('您已投过票');
            return;
        }

        let cands = this.getElections();
        const cand = cands.find(c => c.id === id);
        if (cand) {
            cand.votes++;
            this.saveElections(cands);
            sessionStorage.setItem(votedKey, 'true');
            this.renderElections();
            this.renderAdminCandList();
            alert('投票成功！');
        }
    },

    handleAddCandidate: function() {
        const name = document.getElementById('cand-name').value;
        const position = document.getElementById('cand-position').value;
        const desc = document.getElementById('cand-desc').value;
        
        let cands = this.getElections();
        const newId = cands.length > 0 ? Math.max(...cands.map(c => c.id)) + 1 : 1;
        cands.push({ id: newId, name, position, desc, votes: 0 });
        
        this.saveElections(cands);
        document.getElementById('admin-election-form').reset();
        this.renderElections();
        this.renderAdminCandList();
        alert('候选人添加成功');
    },

    renderAdminCandList: function() {
        const cands = this.getElections();
        document.getElementById('admin-cand-list').innerHTML = cands.map(c => `
            <li>${c.name} - ${c.position} (票数: ${c.votes})</li>
        `).join('');
    },

    // --- 公民广场 ---
    renderCitizens: function(filter = '') {
        const users = this.getUsers().filter(u => u.role !== 'admin'); // 不显示管理员
        const container = document.getElementById('citizen-list');
        
        const filtered = users.filter(u => 
            u.username.includes(filter) || 
            (u.realName && u.realName.includes(filter))
        );

        container.innerHTML = filtered.map(u => `
            <div class="citizen-card">
                <img src="https://picsum.photos/100/100?random=${u.username}" alt="${u.realName || u.username}的头像">
                <h4>${u.realName || u.username}</h4>
                <p style="font-size:0.8rem; color:#888;">@${u.username}</p>
                <button class="btn-primary" style="margin-top:10px; font-size:0.8rem;" onclick="app.startPrivateChat('${u.username}')">
                    <i class="fa-solid fa-comment"></i> 私信
                </button>
            </div>
        `).join('');
    },

    // --- 聊天模块 ---
    startPrivateChat: function(targetUsername) {
        if (!this.currentUser) {
            alert('请先登录');
            return;
        }
        this.currentChatTarget = targetUsername;
        this.navigate('chat');
        this.renderChat();
    },

    loadChat: function(target) {
        this.currentChatTarget = target;
        document.querySelectorAll('.chat-sidebar li').forEach(li => li.classList.remove('active'));
        // 简单处理高亮，实际应根据ID匹配
        event.currentTarget.classList.add('active');
        this.renderChat();
    },

    renderChat: function() {
        const chats = this.getChats();
        const container = document.getElementById('chat-messages');
        const header = document.getElementById('chat-header');
        
        if (this.currentChatTarget === 'public') {
            header.textContent = '公共频道';
        } else {
            header.textContent = `与 ${this.currentChatTarget} 的私聊`;
        }

        // 过滤消息
        const relevantChats = chats.filter(c => {
            if (this.currentChatTarget === 'public') {
                return c.target === 'public';
            } else {
                // 私聊：我是发送者且目标是对方，或者我是接收者且对方是发送者
                return (c.sender === this.currentUser.username && c.target === this.currentChatTarget) ||
                       (c.sender === this.currentChatTarget && c.target === this.currentUser.username);
            }
        });

        container.innerHTML = relevantChats.map(c => {
            const isSelf = c.sender === this.currentUser.username;
            return `
                <div class="message ${isSelf ? 'self' : 'other'}">
                    <span class="sender">${c.sender}</span>
                    <div>${c.content}</div>
                </div>
            `;
        }).join('');
        
        // 滚动到底部
        container.scrollTop = container.scrollHeight;
        
        // 更新侧边栏会话列表（简单实现）
        this.updateChatSidebar();
    },

    updateChatSidebar: function() {
        // 这里可以动态获取所有和我聊过天的人，简化起见只保留公共频道和手动添加的
    },

    sendMessage: function() {
        if (!this.currentUser) {
            alert('请先登录');
            return;
        }
        
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;

        const chats = this.getChats();
        const newMsg = {
            sender: this.currentUser.username,
            target: this.currentChatTarget,
            content: content,
            time: new Date().toISOString()
        };
        
        chats.push(newMsg);
        this.saveChats(chats);
        input.value = '';
        this.renderChat();
    },

    // --- 管理员：用户管理 ---
    renderAdminUsers: function() {
        const users = this.getUsers();
        const tbody = document.getElementById('admin-user-table');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.username}</td>
                <td>${u.realName || '-'}</td>
                <td>${u.idNumber || '-'}</td>
                <td>${u.address || '-'}</td>
                <td>
                    ${u.role !== 'admin' ? `<button class="btn-danger" style="padding:2px 5px; font-size:0.8rem;" onclick="app.deleteUser('${u.username}')">注销</button>` : '超级管理员'}
                </td>
            </tr>
        `).join('');
    },

    deleteUser: function(username) {
        if (confirm(`确定要注销用户 ${username} 吗？此操作不可恢复。`)) {
            let users = this.getUsers().filter(u => u.username !== username);
            this.saveUsers(users);
            this.renderAdminUsers();
            alert('用户已注销');
        }
    },

    // 切换管理员Tab
    switchAdminTab: function(tabName) {
        document.querySelectorAll('.admin-panel').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById('admin-tab-' + tabName).style.display = 'block';
        event.target.classList.add('active');
    }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
