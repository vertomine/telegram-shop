
// 等待页面加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initNavigation();
    initGroups();
    initFAQ();
    initChatButton();
});

// 初始化聊天按钮
function initChatButton() {
    // 如果是本地环境，显示备用聊天按钮
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const localChatBtn = document.getElementById('local-chat-btn');
        if (localChatBtn) {
            localChatBtn.style.display = 'block';
        }
    }
}

// 本地环境打开聊天
function openLocalChat() {
    const currentPage = document.querySelector('.nav-btn.active')?.getAttribute('data-page') || 'account';
    const message = getChatMessage(currentPage);
    
    // 显示联系信息
    showLocalChatModal(message);
}

// 获取聊天消息
function getChatMessage(page) {
    switch(page) {
        case 'account': return '你好，我想咨询购买Telegram账号';
        case 'payment': return '你好，我想开通Telegram Premium会员';
        case 'bot': return '你好，我想了解更多Telegram群组信息';
        case 'help': return '你好，我需要Telegram账号问题解决服务';
        default: return '你好，我有问题需要咨询';
    }
}

// 显示本地聊天模态框
function showLocalChatModal(message) {
    // 移除现有的模态框
    const existingModal = document.querySelector('.local-chat-modal');
    if (existingModal) existingModal.remove();
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'local-chat-modal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div style="background: #1e293b; border-radius: 15px; padding: 30px; max-width: 500px; width: 90%; border: 1px solid #334155;">
                <h3 style="color: #60a5fa; margin-bottom: 20px; text-align: center;"><i class="fas fa-comments"></i> 联系客服</h3>
                
                <div style="background: #0f172a; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #334155;">
                    <p style="color: #cbd5e1; margin-bottom: 10px;"><strong>您的咨询内容：</strong></p>
                    <p style="color: #fbbf24; padding: 10px; background: rgba(251, 191, 36, 0.1); border-radius: 8px;">${message}</p>
                </div>
                
                <div style="background: #0f172a; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #334155;">
                    <p style="color: #cbd5e1; margin-bottom: 10px;"><strong>请通过以下方式联系我们：</strong></p>
                    <ul style="color: #94a3b8; padding-left: 20px;">
                        <li>Telegram: <strong style="color: #60a5fa;">@bnbkuan</strong></li>
                        <li>工作时间: <strong style="color: #60a5fa;">13:00-23:00</strong></li>
                        <li>QQ: <strong style="color: #60a5fa;">请咨询Telegram客服</strong></li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="copyToTelegram('${message}')" style="flex: 1; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer;">
                        <i class="fab fa-telegram"></i> 复制到Telegram
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #64748b; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer;">
                        关闭
                    </button>
                </div>
                
                <p style="color: #94a3b8; font-size: 12px; margin-top: 15px; text-align: center;">
                    <i class="fas fa-info-circle"></i> 上线后将自动显示在线聊天窗口
                </p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 复制到Telegram
function copyToTelegram(message) {
    const text = `${message}\n\n---\n请联系 @bnbkuan 获取帮助`;
    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板！请打开Telegram粘贴给客服。');
    });
}

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

// 统一打开聊天函数
function openChat() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        openLocalChat();
    } else if (typeof Tawk_API !== 'undefined') {
        const currentPage = document.querySelector('.nav-btn.active')?.getAttribute('data-page') || 'account';
        const message = getChatMessage(currentPage);
        
        Tawk_API.maximize();
        setTimeout(() => {
            try {
                Tawk_API.sendMessage(message);
            } catch(e) {
                console.log('自动发送消息失败:', e);
            }
        }, 1000);
    } else {
        openLocalChat(); // 如果Tawk.to未加载，使用本地聊天
    }
}

// 群组数据
const groupsData = [
    { id: 101, name: '机场推荐 -cutecloud老牌机场', category: 'tech', link: 'https://www.cutecloud.net/#/register?code=HClqYn9m' },
    { id: 311, name: '搞笑视频 吃瓜群众', category: 'resource', link: 'https://t.me/lsd62' },
    { id: 312, name: '少女实在是太美好了', category: 'resource', link: 'https://t.me/tastegirl' },
    { id: 313, name: '查询telegram的注册时间', category: 'resource', link: 'https://t.me/joined_date_bot' },
    { id: 314, name: '每天60秒早间阅读－早报', category: 'resource', link: 'https://t.me/NEWSPJAPK' },
    { id: 315, name: '7×24即时新闻报道', category: 'resource', link: 'https://t.me/tnews365' },
    { id: 316, name: ' 今天你想跑路了吗？', category: 'resource', link: 'https://t.me/getoutforchina' },
    { id: 411, name: '搜书神器：搜书 | 推书| 求书', category: 'resource', link: 'https://t.me/voyla' },
    { id: 412, name: '搜书神器：深夜书架', category: 'resource', link: 'https://t.me/BookLogChannel' },
    { id: 413, name: '一起搜电影', category: 'resource', link: 'https://t.me/Cctv365bot' },
    { id: 314, name: '人人影视资源搜索', category: 'resource', link: 'https://t.me/yyets_bot' },
    { id: 415, name: '下载网易云歌曲', category: 'resource', link: 'https://t.me/Music163bot' },
    { id: 316, name: '抖音Tiktok去水印', category: 'resource', link: 'https://t.me/DouYintg_bot' },
    { id: 317, name: 'AI在线解析总结视频', category: 'resource', link: 'https://t.me/bilibiliparse_bot' },
    { id: 318, name: '妙妙小工具Beta', category: 'resource', link: 'https://t.me/GLBetabot' },
    { id: 319, name: '媒体下载机器人', category: 'resource', link: 'https://t.me/download_it_bot' },
    { id: 320, name: '推特视频下载', category: 'resource', link: 'https://t.me/xx_video_download_bot' },
    { id: 301, name: '极搜机器人', category: 'news', link: 'https://t.me/jisou' },
    { id: 302, name: '极搜1', category: 'news', link: 'https://t.me/jiso' },
    { id: 302, name: '极搜2', category: 'news', link: 'https://t.me/jisou' },
    { id: 303, name: 'SOSO机器人', category: 'news', link: 'https://t.me/sosoo' },
    { id: 304, name: '快搜', category: 'news', link: 'https://t.me/super' },
    { id: 305, name: 'Super搜索', category: 'news', link: 'https://t.me/super' },
    { id: 306, name: 'TG鉴黄师', category: 'news', link: 'https://t.me/TGJHS_BOT' },
    { id: 401, name: '电报客服', category: 'chat', link: 'https://t.me/bnbkuan' },
    { id: 402, name: '无极互助交流群-资源共享', category: 'chat', link: 'https://t.me/wujiflow_a' }
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
        'tech': '福利',
        'resource': '资源',
        'news': '资讯',
        'chat': '售后'
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

// 卡密兑换函数
function redeemCard() {
    const cardCode = document.getElementById('cardInput').value.trim();
    const msgLabel = document.getElementById('redeemMsg');
    
    if (cardCode.length !== 16) {
        msgLabel.style.color = "#ef4444";
        msgLabel.innerText = "❌ 请输入16位有效卡密";
        return;
    }

    msgLabel.style.color = "#3b82f6";
    msgLabel.innerText = "正在验证卡密，请稍后...";

    fetch('https://sapremic-unnumerously-joaquin.ngrok-free.dev/api/verify', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cardCode })
    })
    .then(response => {
        if (!response.ok) throw new Error('网络响应异常');
        return response.json();
    })
    .then(data => {
        if (data.status === 'ok') {
            const possibleContainers = ['.card-redemption', '.redeem-box', '.redemption-container', '#redeemForm'];
            let container = null;
            for (let selector of possibleContainers) {
                if (document.querySelector(selector)) {
                    container = document.querySelector(selector);
                    break;
                }
            }
            if (!container) container = document.getElementById('cardInput').parentElement;

            // --- 第一阶段：显示准备中倒计时 ---
            container.innerHTML = `
                <div id="preparing-box" style="text-align:center; padding:30px; background:#ffffff; border-radius:12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div class="loader-circle" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto 15px;"></div>
                    <h3 style="color:#2563eb; margin-bottom:10px;">🛡️ 正在为您准备安全线路...</h3>
                    <p style="color:#64748b; font-size:14px; margin-bottom:15px;">系统正在连接加密通道，请稍候</p>
                    <div id="countdown-timer" style="font-size:36px; font-weight:bold; color:#3b82f6; font-family: monospace;">30</div>
                    <p style="color:#94a3b8; font-size:12px; margin-top:10px;">请勿刷新或关闭页面</p>
                </div>
                <style>
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            `;

            let timeLeft = 30;
            const timer = setInterval(() => {
                timeLeft--;
                const timerEl = document.getElementById('countdown-timer');
                if (timerEl) timerEl.innerText = timeLeft;
                
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    // --- 第二阶段：显示最终提货结果 (带备注显示) ---
                    showLiveCodeUI(container, data);
                }
            }, 1000);

        } else {
            msgLabel.style.color = "#ef4444";
            msgLabel.innerText = "❌ " + data.msg;
        }
    })
    .catch(err => {
        console.error(err);
        msgLabel.style.color = "#ef4444";
        msgLabel.innerText = "❌ 无法连接服务器，请检查后端";
    });
}

function showLiveCodeUI(container, data) {
    // 准备备注 HTML (只有当有备注时才显示)
    const noteHTML = data.note ? `
        <div style="margin-top:15px; padding:12px; background:#fff7ed; border:1px solid #ffedd5; border-radius:8px; text-align: left;">
            <b style="color:#9a3412; font-size:14px;"><i class="fas fa-info-circle"></i> 提示:</b>
            <div style="color:#c2410c; font-size: 14px; margin-top:5px; line-height:1.4;">
                ${data.note}
            </div>
        </div>
    ` : '';

    // 准备档位 HTML
    const categoryHTML = data.category ? `
        <div style="margin-bottom:10px; font-size: 16px;">
            <b>所属档位:</b> 
            <span style="background:#e0e7ff; color:#4338ca; padding:2px 8px; border-radius:4px; font-weight:bold; margin-left:8px;">
                ${data.category} 套餐
            </span>
        </div>
    ` : '';

    container.innerHTML = `
        <div style="text-align:left; background:#ffffff; padding:20px; border-radius:12px; border:1px solid #e2e8f0; color:#333; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h3 style="color:#10b981; margin:0 0 15px 0; font-size: 18px;">✅ 提货成功</h3>
            
            ${categoryHTML}

            <div style="margin-bottom:10px; font-size: 16px;">
                <b>手机号:</b> 
                <span style="color:#2563eb; font-weight:bold; margin-left:8px;">${data.phone}</span>
            </div>
            
            <div style="margin-bottom:15px; font-size: 16px;">
                <b>二级密码:</b> 
                <span style="color:#dc2626; font-weight:bold; margin-left:8px;">${data.password}</span>
            </div>

            ${noteHTML}
            
            <div style="background:#f8fafc; padding:20px; border-radius:10px; text-align:center; border:1px dashed #cbd5e1; margin-top: 15px;">
                <div style="font-size:13px; color:#64748b; font-weight: bold;">Telegram 实时验证码</div>
                <h1 id="live-tg-code" style="font-size:60px; color:#1d4ed8; margin:15px 0; font-family: 'Courier New', monospace; letter-spacing: 5px;">⏳</h1>
                <p style="font-size:12px; color:#94a3b8;">现在可以去 App 中请求验证码了</p>
            </div>
        </div>
    `;

    // 开启轮询
    const pollCode = () => {
        const cleanId = data.phone.replace(/\D/g, ''); 
        fetch(`https://sapremic-unnumerously-joaquin.ngrok-free.dev/api/get_code?id=${encodeURIComponent(cleanId)}`)
        .then(r => r.json())
        .then(res => {
            const codeEl = document.getElementById('live-tg-code');
            if (codeEl && res.code && /^\d{5}$/.test(res.code)) {
                codeEl.innerText = res.code;
                codeEl.style.color = "#059669";
            }
        })
        .catch(err => console.error("轮询出错:", err));
    };

    setInterval(pollCode, 3000);
}

// 红包购卡提交函数
function submitPacket() {
    const qq = document.getElementById('packetQQ').value;
    const type = document.getElementById('packetType').value;
    const code = document.getElementById('packetCode').value;

    if (!qq || !code) { 
        alert('请完整填写QQ号和红包口令！'); 
        return; 
    }

    const statusDiv = document.getElementById('packetStatus');
    statusDiv.style.color = "#3b82f6";
    statusDiv.innerText = "正在提交订单...";

    fetch('http://139.177.187.30:5000/api/submit_packet', { 
        method: 'POST',
        mode: 'cors',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ qq: qq, amount: type, code: code })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('网络请求失败');
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'ok') {
            statusDiv.style.color = "#10b981";
            statusDiv.innerText = "✅ 提交成功！管理员将在30分钟内审核，请稍后查询卡密。";
            // 清空输入框
            document.getElementById('packetQQ').value = '';
            document.getElementById('packetCode').value = '';
        } else {
            statusDiv.style.color = "#ef4444";
            statusDiv.innerText = "❌ " + (data.msg || '提交失败');
        }
    })
    .catch(err => {
        console.error('提交错误:', err);
        statusDiv.style.color = "#ef4444";
        statusDiv.innerText = "❌ 连接服务器失败，请检查网络或联系管理员";
    });
}

// 查询红包卡密函数
function queryByQQ() {
    const qq = document.getElementById('packetQQ').value;
    if (!qq) { 
        alert('请输入QQ号'); 
        return; 
    }

    const statusDiv = document.getElementById('packetStatus');
    statusDiv.style.color = "#3b82f6";
    statusDiv.innerText = "正在查询...";

    fetch(`http://139.177.187.30:5000/api/query_packet?qq=${qq}`)
    .then(response => response.json())
    .then(data => {
        if (data.status === 'empty') {
            statusDiv.style.color = "#f59e0b";
            statusDiv.innerText = "⚠️ 未找到该QQ号的订单记录";
        } else {
            let resultHTML = "<h4 style='color:#60a5fa; margin-bottom:10px;'>查询结果：</h4>";
            
            data.forEach((order, index) => {
                resultHTML += `
                    <div style="background:#1e293b; padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid #334155;">
                        <div style="color:#cbd5e1; font-size:12px;">提交时间: ${order.time}</div>
                        <div style="color:#${order.status === 1 ? '10b981' : 'f59e0b'}; margin:5px 0;">
                            状态: ${order.status === 1 ? '✅ 已发放' : '⏳ 处理中'}
                        </div>
                        ${order.card ? `<div style="color:#60a5fa; font-weight:bold; margin-top:5px;">卡密: ${order.card}</div>` : ''}
                    </div>
                `;
            });
            
            statusDiv.innerHTML = resultHTML;
        }
    })
    .catch(err => {
        console.error('查询错误:', err);
        statusDiv.style.color = "#ef4444";
        statusDiv.innerText = "❌ 查询失败，请检查网络";
    });
}

// 每隔10秒检查新订单（后台功能）
function checkNewRedPackets() {
    fetch('http://139.177.187.30:5000/api/admin/pending_packets')
    .then(res => res.json())
    .then(data => {
        if(data.length > 0) {
            // 如果有新订单，播放提示音
            try {
                let msg = new SpeechSynthesisUtterance("您有新的红包订单，请及时处理");
                window.speechSynthesis.speak(msg);
            } catch(e) {
                console.log('语音提醒失败:', e);
            }
        }
    });
}

// 页面加载完成后开始检查新订单（仅管理员页面）
if (window.location.pathname.includes('admin')) {
    setInterval(checkNewRedPackets, 10000);
}
