// 数据持久化：从本地存储读取博客数据
let blogList = JSON.parse(localStorage.getItem('nf_community_blogs')) || [];

// 页面初始化
document.addEventListener('DOMContentLoaded', () => {
    renderAllBlogs();
    updateBlogCount();
    bindAllEvents();
});

// 绑定所有交互事件
function bindAllEvents() {
    // 编辑器开关事件
    document.getElementById('open-editor-btn').addEventListener('click', openBlogEditor);
    document.getElementById('hero-editor-btn').addEventListener('click', openBlogEditor);
    document.getElementById('close-editor-btn').addEventListener('click', closeBlogEditor);
    document.getElementById('cancel-editor-btn').addEventListener('click', closeBlogEditor);
    
    // 编辑器工具栏事件
    document.getElementById('btn-bold').addEventListener('click', () => document.execCommand('bold'));
    document.getElementById('btn-italic').addEventListener('click', () => document.execCommand('italic'));
    document.getElementById('btn-insert-img').addEventListener('click', insertBlogImage);
    document.getElementById('btn-list').addEventListener('click', () => document.execCommand('insertUnorderedList'));
    
    // 保存博客事件
    document.getElementById('save-blog-btn').addEventListener('click', saveBlogPost);
}

// 渲染所有博客卡片
function renderAllBlogs() {
    const container = document.getElementById('blog-container');
    if (blogList.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16 text-gray-500">
                <i class="fas fa-file-alt text-5xl mb-4 opacity-30"></i>
                <p class="text-lg">暂无博客文章，点击上方按钮发布第一篇内容吧</p>
            </div>
        `;
        return;
    }

    container.innerHTML = blogList.map(blog => `
        <div class="blog-card bg-white rounded-xl shadow-md overflow-hidden">
            <img src="${blog.coverImg}" alt="文章封面" class="w-full h-48 object-cover">
            <div class="p-6">
                <h3 class="text-xl font-bold mb-3 text-gray-800 line-clamp-2">${blog.title}</h3>
                <p class="text-gray-600 mb-4 line-clamp-3">${stripHtmlTags(blog.content)}</p>
                <div class="flex justify-between items-center text-sm text-gray-500">
                    <span><i class="fas fa-calendar-alt mr-1"></i> ${blog.publishDate}</span>
                    <span><i class="fas fa-user mr-1"></i> ${blog.author}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 去除HTML标签，用于纯文本摘要展示
function stripHtmlTags(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// 更新博客总数显示
function updateBlogCount() {
    document.getElementById('blog-count').textContent = blogList.length;
}

// 打开博客编辑器
function openBlogEditor() {
    document.getElementById('blog-editor-modal').classList.remove('hidden');
}

// 关闭博客编辑器
function closeBlogEditor() {
    document.getElementById('blog-editor-modal').classList.add('hidden');
    // 清空编辑器内容
    document.getElementById('blog-title').value = '';
    document.getElementById('blog-content').innerHTML = '';
}

// 插入图片到编辑器
function insertBlogImage() {
    const imgUrl = prompt('请输入图片的URL地址：');
    if (imgUrl && imgUrl.trim()) {
        document.execCommand('insertHTML', false, `<img src="${imgUrl.trim()}" class="max-w-full my-4 rounded-lg shadow-sm">`);
    }
}

// 保存并发布博客文章
function saveBlogPost() {
    const title = document.getElementById('blog-title').value.trim();
    const content = document.getElementById('blog-content').innerHTML.trim();

    if (!title || !content) {
        alert('文章标题和内容不能为空，请补充完整后再发布');
        return;
    }

    // 生成新的博客对象
    const newBlog = {
        id: Date.now(),
        title: title,
        content: content,
        author: '社团成员',
        publishDate: new Date().toLocaleDateString('zh-CN'),
        // 生成随机封面图
        coverImg: `https://picsum.photos/seed/${Date.now()}/600/300`
    };

    // 添加到博客列表头部
    blogList.unshift(newBlog);
    // 持久化保存到本地存储
    localStorage.setItem('nf_community_blogs', JSON.stringify(blogList));
    
    // 刷新页面显示
    renderAllBlogs();
    updateBlogCount();
    closeBlogEditor();
    alert('文章发布成功！');
}
