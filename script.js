// 社团用户数据库
const userDatabase = {
    tanshicheng: {
        password: "tanshicheng0833",
        realName: "谈世承",
        notices: [
            "谈世承 请在看到此消息后到社长处领取社费 3 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理新自由社的民风，含传谣等行为进行制止。"
        ]
    },
    weiyeen: {
        password: "weiyeen1322",
        realName: "魏也恩",
        notices: [
            "魏也恩 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理 wangjiaqi 和 chenjiajin，并让其发展新自由社团科技。"
        ]
    },
    wangjiaqi: {
        password: "wangjiaqi6837",
        realName: "王家齐",
        notices: [
            "王家齐 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：接收weiyeen的正当管理，管理新自由社铁路部门，并让绘制华特轨道交通线路图。具体绘制方式可用手绘制或电脑绘制，电脑绘制网页：https://railmapgen.github.io/rmp/。绘制完成可在右上角的导出图标中导出图片。"
        ]
    },
    chenjiajin: {
        password: "chenjiajin3352",
        realName: "陈家金",
        notices: [
            "陈家金 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：接收weiyeen的正当管理，并发展新自由社团科技。"
        ]
    },
    zhanzirui: {
        password: "zhanzirui9838",
        realName: "詹子睿",
        notices: [
            "詹子睿 请在看到此消息后到社长处领取社费 双萃一瓶 和 新制地铁路线图，特殊情况请与社长商议。",
            "你的10月工作任务是：和社长一起绘制地铁路线图。"
        ]
    },
    zhangchenming: {
        password: "zhangchenming1983",
        realName: "张宸铭",
        notices: [
            "张宸铭 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理wangjiaqi。"
        ]
    },
    zhoukaien: {
        password: "zhoukaien5372",
        realName: "周凯恩",
        notices: [
            "周凯恩 请在看到此消息后到社长处领取社费 3 RMB 商店券，并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理自新社星奇日报。"
        ]
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素引用
    const navLinks = document.querySelectorAll('.nav-links li:not(.btn-login)');
    const pages = document.querySelectorAll('.page');
    const loginBtn = document.getElementById('login-btn');
    const modal = document.getElementById('login-modal');
    const closeModal = document.querySelector('.close-modal');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const errorMsg = document.getElementById('login-error');
    
    let currentUser = null;

    // 页面切换函数
    window.switchPage = (pageId) => {
        pages.forEach(p => p.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));
        
        const target = document.getElementById(pageId);
        if (target) {
            target.classList.add('active');
            // 同步导航高亮
            const activeNav = Array.from(navLinks).find(l => l.dataset.page === pageId);
            if (activeNav) activeNav.classList.add('active');
        }
    };

    // 导航点击事件
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            switchPage(link.dataset.page);
        });
    });

    // 登录弹窗控制
    loginBtn.addEventListener('click', () => {
        if (currentUser) {
            switchPage('profile');
        } else {
            modal.classList.add('show');
            errorMsg.textContent = '';
        }
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // 登录逻辑
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (userDatabase[username] && userDatabase[username].password === password) {
            currentUser = userDatabase[username];
            modal.classList.remove('show');
            updateProfileUI();
            switchPage('profile');
            loginBtn.textContent = currentUser.realName;
            loginBtn.classList.add('logged-in');
        } else {
            errorMsg.textContent = '用户名或密码错误，请重试';
        }
    });

    // 更新个人中心UI
    function updateProfileUI() {
        if (!currentUser) return;
        document.getElementById('user-name-display').textContent = currentUser.realName;
        const noticeList = document.getElementById('notice-list');
        noticeList.innerHTML = '';
        
        currentUser.notices.forEach(notice => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `<p>${notice}</p>`;
            noticeList.appendChild(div);
        });
    }

    // 退出登录
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        loginBtn.textContent = '登录';
        loginBtn.classList.remove('logged-in');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        switchPage('home');
    });

    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('show');
    });
});
