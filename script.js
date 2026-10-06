// 预定义全部用户账号与通知数据
const userDatabase = {
    tanshicheng: {
        password: "tanshicheng0833",
        name: "谈世承",
        notices: [
            "谈世承  请在看到此消息后到社长处领取社费 3 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理新自由社的民风，含传谣等行为进行制止。"
        ]
    },
    weiyeen: {
        password: "weiyeen1322",
        name: "魏也恩",
        notices: [
            "魏也恩 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理 wangjiaqi 和 chenjiajin，并让其发展新自由社团科技。"
        ]
    },
    wangjiaqi: {
        password: "wangjiaqi6837",
        name: "王家齐",
        notices: [
            "王家齐 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：接收weiyeen的正当管理，管理新自由社铁路部门，并让绘制华特轨道交通线路图。具体绘制方式可用手绘制或电脑绘制，电脑绘制网页：https://railmapgen.github.io/rmp/。绘制完成可在右上角的导出图标中导出图片。"
        ]
    },
    chenjiajin: {
        password: "chenjiajin3352",
        name: "陈家金",
        notices: [
            "陈家金 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：接收weiyeen的正当管理，并发展新自由社团科技。"
        ]
    },
    zhanzirui: {
        password: "zhanzirui9838",
        name: "詹子睿",
        notices: [
            "詹子睿 请在看到此消息后到社长处领取社费 双萃一瓶 和 新制地铁路线图，特殊情况请与社长商议。",
            "你的10月工作任务是：和社长一起绘制地铁路线图。"
        ]
    },
    zhangchenming: {
        password: "zhangchenming1983",
        name: "张宸铭",
        notices: [
            "张宸铭 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理wangjiaqi。"
        ]
    },
    zhoukaien: {
        password: "zhoukaien5372",
        name: "周凯恩",
        notices: [
            "周凯恩 请在看到此消息后到社长处领取社费 3 RMB 商店券，并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理自新社星奇日报。"
        ]
    }
};

// 获取页面元素
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const loginModal = document.getElementById('loginModal');
const userArea = document.getElementById('userArea');
const closeBtn = document.querySelector('.close-btn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const welcomeUser = document.getElementById('welcomeUser');
const userNoticeBox = document.getElementById('userNoticeBox');

let currentLoginUser = null;

// 页面切换逻辑
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const targetId = link.getAttribute('href').substring(1);
        pageSections.forEach(section => {
            section.classList.remove('active-section');
            if(section.id === targetId) {
                section.classList.add('active-section');
            }
        });
    });
});

// 打开登录弹窗
userArea.addEventListener('click', () => {
    if(!currentLoginUser) loginModal.classList.add('show');
});

// 关闭登录弹窗
closeBtn.addEventListener('click', () => {
    loginModal.classList.remove('show');
});

// 登录校验逻辑
loginBtn.addEventListener('click', () => {
    const inputUser = usernameInput.value.trim();
    const inputPwd = passwordInput.value.trim();
    if(userDatabase[inputUser] && userDatabase[inputUser].password === inputPwd) {
        currentLoginUser = userDatabase[inputUser];
        loginModal.classList.remove('show');
        userArea.textContent = currentLoginUser.name;
        // 加载用户个人通知
        welcomeUser.textContent = `${currentLoginUser.name} 的个人通知中心`;
        userNoticeBox.innerHTML = '';
        currentLoginUser.notices.forEach(notice => {
            const noticeEl = document.createElement('div');
            noticeEl.className = 'notice-item';
            noticeEl.textContent = notice;
            userNoticeBox.appendChild(noticeEl);
        });
        // 跳转至个人通知页面
        navLinks.forEach(l => l.classList.remove('active'));
        pageSections.forEach(section => section.classList.remove('active-section'));
        document.getElementById('personalPanel').classList.add('active-section');
    } else {
        alert('用户名或密码错误，请重新输入！');
    }
});

// 退出登录逻辑
logoutBtn.addEventListener('click', () => {
    currentLoginUser = null;
    userArea.textContent = '登录';
    usernameInput.value = '';
    passwordInput.value = '';
    // 跳转回首页
    navLinks.click();
});
