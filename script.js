// 社团用户与通知数据库
const userDataBase = {
    tanshicheng: {
        password: "tanshicheng0833",
        realName: "谈世承",
        noticeList: [
            "谈世承  请在看到此消息后到社长处领取社费 3 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理新自由社的民风，含传谣等行为进行制止。"
        ]
    },
    weiyeen: {
        password: "weiyeen1322",
        realName: "魏也恩",
        noticeList: [
            "魏也恩 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理 wangjiaqi 和 chenjiajin，并让其发展新自由社团科技。"
        ]
    },
    wangjiaqi: {
        password: "wangjiaqi6837",
        realName: "王家齐",
        noticeList: [
            "王家齐 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：接收weiyeen的正当管理，管理新自由社铁路部门，并让绘制华特轨道交通线路图。具体绘制方式可用手绘制或电脑绘制，电脑绘制网页：https://railmapgen.github.io/rmp/。绘制完成可在右上角的导出图标中导出图片。"
        ]
    },
    chenjiajin: {
        password: "chenjiajin3352",
        realName: "陈家金",
        noticeList: [
            "陈家金 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：接收weiyeen的正当管理，并发展新自由社团科技。"
        ]
    },
    zhanzirui: {
        password: "zhanzirui9838",
        realName: "詹子睿",
        noticeList: [
            "詹子睿 请在看到此消息后到社长处领取社费 双萃一瓶 和 新制地铁路线图，特殊情况请与社长商议。",
            "你的10月工作任务是：和社长一起绘制地铁路线图。"
        ]
    },
    zhangchenming: {
        password: "zhangchenming1983",
        realName: "张宸铭",
        noticeList: [
            "张宸铭 请在看到此消息后到社长处领取社费 1 RMB 或 在商店购买双萃一瓶 并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理wangjiaqi。"
        ]
    },
    zhoukaien: {
        password: "zhoukaien5372",
        realName: "周凯恩",
        noticeList: [
            "周凯恩 请在看到此消息后到社长处领取社费 3 RMB 商店券，并上交社费的 20% 用于公费，特殊情况请与社长商议。",
            "你的10月工作任务是：管理自新社星奇日报。"
        ]
    }
};

// 页面元素获取
const navItems = document.querySelectorAll('.nav-item');
const pageBlocks = document.querySelectorAll('.page-block');
const loginModal = document.getElementById('login-modal');
const loginTrigger = document.querySelector('.login-trigger');
const modalCloseBtn = document.querySelector('.modal-close');
const confirmLoginBtn = document.getElementById('confirm-login');
const logoutBtn = document.getElementById('logout-btn');
const usernameInput = document.getElementById('input-username');
const passwordInput = document.getElementById('input-password');
const userTitle = document.getElementById('current-user-title');
const noticeDisplayArea = document.getElementById('notice-display-area');

let currentActiveUser = null;

// 页面切换功能
navItems.forEach(item => {
    item.addEventListener('click', () => {
        if(item.classList.contains('login-trigger') && !currentActiveUser) return;
        const targetPage = item.dataset.target;
        pageBlocks.forEach(block => block.classList.remove('active'));
        document.getElementById(targetPage).classList.add('active');
    });
});

// 触发登录弹窗
loginTrigger.addEventListener('click', () => {
    loginModal.classList.add('show');
});

// 关闭登录弹窗
modalCloseBtn.addEventListener('click', () => {
    loginModal.classList.remove('show');
});

// 登录校验逻辑
confirmLoginBtn.addEventListener('click', () => {
    const inputName = usernameInput.value.trim();
    const inputPwd = passwordInput.value.trim();
    if(userDataBase[inputName] && userDataBase[inputName].password === inputPwd) {
        currentActiveUser = userDataBase[inputName];
        loginModal.classList.remove('show');
        loginTrigger.textContent = currentActiveUser.realName;
        // 渲染个人通知
        userTitle.innerText = `${currentActiveUser.realName} 的个人通知中心`;
        noticeDisplayArea.innerHTML = '';
        currentActiveUser.noticeList.forEach(noticeText => {
            const newNotice = document.createElement('div');
            newNotice.className = 'notice-item';
            newNotice.innerText = noticeText;
            noticeDisplayArea.appendChild(newNotice);
        });
        // 跳转至个人通知页面
        pageBlocks.forEach(block => block.classList.remove('active'));
        document.getElementById('personal-panel').classList.add('active');
    } else {
        alert('用户名或者密码输入错误，请核对后重新输入');
    }
});

// 退出登录逻辑
logoutBtn.addEventListener('click', () => {
    currentActiveUser = null;
    loginTrigger.textContent = '登录';
    usernameInput.value = '';
    passwordInput.value = '';
    // 返回首页
    pageBlocks.forEach(block => block.classList.remove('active'));
    document.getElementById('home').classList.add('active');
});
