// 等待页面加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initNavigation();
    initGroups();
    initFAQ();
    checkChatStatus();
});

// 页面导航功能
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    // 为每个导航按钮添加点击事件
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            
            // 移除所有按钮的激活状态
            navButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的激活状态
            this.classList.add('active');
            
            // 隐藏所有页面
            pages.forEach(page => page.classList.remove('active'));
            // 显示对应的页面
            document.getElementById(`${pageId}-page`).classList.add('active');
            
            // 更新联系按钮文本
            updateContactButton(pageId);
        });
    });
}

// 更新联系按钮文本
function updateContactButton(pageId) {
    const contactBtn = document.querySelector('.contact-btn');
    if (!contactBtn) return;
    
    switch(pageId) {
        case 'account':
            contactBtn.innerHTML = '<i class="fas fa-headset"></i> 立即咨询购买';
            break;
        case 'payment':
            contactBtn.innerHTML = '<i class="fas fa-wallet"></i> 联系客服代付';
            break;
        case 'bot':
            contactBtn.innerHTML = '<i class="fas fa-users"></i> 咨询群组信息';
            break;
        case 'help':
            contactBtn.innerHTML = '<i class="fas fa-question-circle"></i> 联系客服帮助';
            break;
    }
}

// 群组数据
const groupsData = [
    { id: 1, name: 'Telegram中文技术交流', category: 'tech', link: 'https://t.me/chinese_tech' },
    { id: 2, name: 'Telegram资源分享频道', category: 'resource', link: 'https://t.me/resources_channel' },
    { id: 3, name: 'Telegram新闻资讯', category: 'news', link: 'https://t.me/news_updates' },
    { id: 4, name: 'Telegram聊天交友', category: 'chat', link: 'https://t.me/chat_friends' },
    { id: 5, name: 'Telegram编程学习', category: 'tech', link: 'https://t.me/programming_learn' },
    { id: 6, name: 'Telegram软件工具', category: 'resource', link: 'https://t.me/software_tools' },
    { id: 7, name: 'Telegram影视资源', category: 'resource', link: 'https://t.me/movies_tv' },
    { id: 8, name: 'Telegram游戏交流', category: 'chat', link: 'https://t.me/game_chat' }
];

// 初始化群组功能
function initGroups() {
    const groupsContainer = document.getElementById('groups-container');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // 渲染群组列表
    function renderGroups(category = 'all') {
        groupsContainer.innerHTML = '';
        
        const filteredGroups = category === 'all' 
            ? groupsData 
            : groupsData.filter(group => group.category === category);
        
        filteredGroups.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'group-item';
            groupElement.innerHTML = `
                <div class="group-name" onclick="copyToClipboard('${group.link}', this)">
                    ${group.name}
                    <span class="group-category">${getCategoryName(group.category)}</span>
                </div>
                <button class="jump-btn" onclick="openTelegram('${group.link}')">
                    <i class="fas fa-external-link-alt"></i> 跳转
                </button>
            `;
            groupsContainer.appendChild(groupElement);
        });
    }
    
    // 初始渲染
    renderGroups();
    
    // 为筛选按钮添加事件
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的激活状态
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的激活状态
            this.classList.add('active');
            
            // 渲染筛选后的群组
            const category = this.getAttribute('data-category');
            renderGroups(category);
        });
    });
}

// 获取分类中文名
function getCategoryName(category) {
    const categoryMap = {
        'tech': '技术交流',
        'resource': '资源分享',
        'news': '新闻资讯',
        'chat': '聊天交友'
    };
    return categoryMap[category] || category;
}

// 复制到剪贴板
function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
        // 添加成功样式
        element.classList.add('copy-success');
        
        // 3秒后移除样式
        setTimeout(() => {
            element.classList.remove('copy-success');
        }, 1500);
        
    }).catch(err => {
        console.error('复制失败:', err);
        // 备用方法
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        // 即使使用备用方法也显示成功
        element.classList.add('copy-success');
        setTimeout(() => {
            element.classList.remove('copy-success');
        }, 1500);
    });
}

// 打开Telegram链接
function openTelegram(link) {
    // 尝试使用tg协议打开（在Telegram应用中）
    const tgLink = link.replace('https://t.me/', 'tg://resolve?domain=');
    
    // 先尝试打开Telegram应用
    window.open(tgLink, '_blank');
    
    // 如果3秒后还在当前页面，则打开网页版
    setTimeout(() => {
        if (!document.hidden) {
            window.open(link, '_blank');
        }
    }, 3000);
}

// 初始化FAQ功能
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            // 切换当前项目的激活状态
            const isActive = item.classList.contains('active');
            
            // 关闭所有其他FAQ
            faqItems.forEach(faq => {
                faq.classList.remove('active');
            });
            
            // 如果当前没激活，则激活它
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// 增强客服功能
function checkChatStatus() {
    // 检查Tawk.to是否加载完成
    const checkInterval = setInterval(() => {
        if (typeof Tawk_API !== 'undefined' && Tawk_API.getStatus() !== 'loaded') {
            Tawk_API.onLoad = function() {
                console.log('Tawk.to聊天已加载');
                clearInterval(checkInterval);
                
                // 设置聊天窗口自定义样式
                try {
                    Tawk_API.setAttributes({
                        'name': '网站访客',
                        'email': '',
                        'hash': 'hash'
                    }, function(error){});
                } catch(e) {
                    console.log('Tawk.to自定义设置失败:', e);
                }
            };
        } else if (typeof Tawk_API !== 'undefined') {
            clearInterval(checkInterval);
        }
    }, 1000);
}

// 改进的客服打开函数
function openChatWithMessage(page) {
    let message = '';
    
    switch(page) {
        case 'account':
            message = '你好，我想咨询购买Telegram账号';
            break;
        case 'payment':
            message = '你好，我想开通Telegram Premium会员';
            break;
        case 'bot':
            message = '你好，我想了解更多Telegram群组信息';
            break;
        default:
            message = '你好，我有问题需要咨询';
    }
    
    if (typeof Tawk_API !== 'undefined') {
        Tawk_API.maximize();
        // 延迟发送消息，确保聊天窗口已打开
        setTimeout(() => {
            try {
                Tawk_API.sendMessage(message);
            } catch(e) {
                console.log('自动发送消息失败:', e);
            }
        }, 1000);
    } else {
        showNotification('请稍等，聊天功能正在加载中...');
        // 如果Tawk.to未加载，重新检查
        checkChatStatus();
    }
}

// 修改现有的openChat函数，让它更智能
function openChat() {
    const currentPage = document.querySelector('.nav-btn.active').getAttribute('data-page');
    openChatWithMessage(currentPage);
}

// 在线聊天功能
function toggleChat() {
    if (typeof Tawk_API !== 'undefined') {
        Tawk_API.toggle();
    } else {
        showNotification('聊天功能正在初始化，请稍后重试');
    }
}

// 显示通知
function showNotification(message) {
    // 如果已存在通知，先移除
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 2秒后自动移除
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// 添加错误处理
window.addEventListener('error', function(e) {
    console.error('网站发生错误:', e.error);
});

// 添加离线检测
window.addEventListener('offline', function() {
    showNotification('网络已断开，部分功能可能受限');
});

window.addEventListener('online', function() {
    showNotification('网络已恢复');
});

// 页面加载完成后检查聊天状态
window.addEventListener('load', function() {
    checkChatStatus();
});