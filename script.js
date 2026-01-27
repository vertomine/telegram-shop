import os
import sqlite3
import asyncio
import random
import string
import re
import threading
import time
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, make_response, session, redirect
from flask_cors import CORS
from telethon import TelegramClient, events
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

# 加载 .env 配置文件
load_dotenv()

# ================= 配置区 =================
api_ids = os.getenv("TG_API_IDS", "24217451").split(',')
api_hashes = os.getenv("TG_API_HASHES", "a2ecc569a31fd9bf3cdbb42d9aca8fba").split(',')
idx = random.randint(0, len(api_ids) - 1)

API_ID = int(api_ids[idx])
API_HASH = api_hashes[idx]
DB_PATH = 'data.db'
SESSION_DIR = 'sessions'

ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASS", "xiao19890413.")

# Telegram Bot 配置
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

if not os.path.exists(SESSION_DIR): os.makedirs(SESSION_DIR)

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET", "super-secret-key")

# 1. 优先配置 CORS (必须在路由之前)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "ngrok-skip-browser-warning"]
    },
    r"/admin/*": {"origins": "*"}
}, supports_credentials=True)

# 2. 核心修复：拦截所有 API 的 OPTIONS 请求并立即通过
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ngrok-skip-browser-warning'
        response.headers['Access-Control-Max-Age'] = '86400'  # 预检结果缓存24小时
        return response

# 3. 统一添加 ngrok 跳过警告的 Header
@app.after_request
def add_header(response):
    # 再次确保跨域头存在
    response.headers['Access-Control-Allow-Origin'] = '*'
    # 针对 ngrok 的关键设置
    response.headers['ngrok-skip-browser-warning'] = 'true'
    return response

# 兼容性路由处理
@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options_route(path):
    return handle_preflight()

live_codes = {}

# ================= Telegram 通知函数 =================
def send_telegram_notification(message):
    """发送 Telegram 通知"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ Telegram Bot未配置，跳过通知")
        return False
    
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "HTML"
        }
        response = requests.post(url, json=data, timeout=10)
        if response.status_code == 200:
            print("✅ Telegram通知发送成功")
            return True
        else:
            print(f"❌ Telegram通知发送失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Telegram通知异常: {e}")
        return False

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. 账号表 (accounts)
    # status 含义：0=待审核仓库, 1=在售, 2=已激活使用, 3=已下架
    c.execute('''CREATE TABLE IF NOT EXISTS accounts 
                 (phone TEXT PRIMARY KEY, 
                  category TEXT DEFAULT "A", 
                  status INTEGER DEFAULT 0, 
                  password TEXT DEFAULT "", 
                  note TEXT DEFAULT "")''')

    # 2. 卡密表 (cards)
    c.execute('''CREATE TABLE IF NOT EXISTS cards 
                 (code TEXT PRIMARY KEY, 
                  category TEXT, 
                  used INTEGER DEFAULT 0, 
                  phone TEXT, 
                  note TEXT DEFAULT "", 
                  expire_time TEXT)''')
    
    # 3. 新增：红包购卡订单表 (redpacket_orders)
    # status 含义：0=等待后台确认, 1=已发放卡密并完成
    c.execute('''CREATE TABLE IF NOT EXISTS redpacket_orders
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  qq TEXT,
                  packet_code TEXT,
                  amount TEXT,
                  card_secret TEXT DEFAULT "",
                  status INTEGER DEFAULT 0,
                  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # --- 物理字段补丁 (防止旧数据库缺少字段报错) ---
    try: c.execute('ALTER TABLE accounts ADD COLUMN note TEXT DEFAULT ""')
    except: pass
    
    try: c.execute('ALTER TABLE cards ADD COLUMN note TEXT DEFAULT ""')
    except: pass
    
    try: c.execute('ALTER TABLE cards ADD COLUMN expire_time TEXT')
    except: pass

    conn.commit()
    conn.close()
    print("✅ 数据库初始化/更新成功！")

# ================= API接口 =================

# 红包提交接口 - 简化版，让CORS中间件处理
@app.route('/api/submit_packet', methods=['POST', 'OPTIONS'])
def submit_packet():
    # 统一处理预检请求
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response

    try:
        data = request.json
        qq = data.get('qq')
        amount = data.get('amount')
        
        if not qq or not amount:
            return jsonify({"status": "error", "msg": "参数不完整"}), 400
            
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        # 保持你原有的逻辑：插入订单
        c.execute("INSERT INTO packet_orders (qq, amount, time, status) VALUES (?, ?, ?, 0)",
                  (qq, amount, now))
        conn.commit()
        conn.close()
        
        # --- 保持你原有的 Telegram 通知功能 ---
        try:
            msg = f"💰 新红包购卡订单\nQQ: {qq}\n金额: {amount}\n时间: {now}"
            send_telegram_notification(msg)
        except:
            pass
            
        return jsonify({"status": "ok"})
    except Exception as e:
        print(f"提交错误: {str(e)}")
        return jsonify({"status": "error", "msg": str(e)}), 500

# 查询红包订单接口
@app.route('/api/query_packet', methods=['GET'])
def query_packet():
    qq = request.args.get('qq')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT card_secret, status, create_time FROM redpacket_orders WHERE qq = ? ORDER BY create_time DESC", (qq,))
    rows = c.fetchall()
    conn.close()
    
    if not rows: 
        return jsonify({"status": "empty"})
    
    res = []
    for r in rows:
        res.append({"card": r[0], "status": r[1], "time": r[2]})
    return jsonify(res)

# --- 后台接口：获取待处理订单 ---
@app.route('/api/admin/pending_packets')
def get_pending_packets():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, qq, packet_code, amount, create_time FROM redpacket_orders WHERE status = 0 ORDER BY create_time DESC")
    orders = c.fetchall()
    conn.close()
    
    result = []
    for r in orders:
        # 格式化时间
        create_time = r[4]
        if create_time:
            try:
                dt = datetime.strptime(create_time, '%Y-%m-%d %H:%M:%S')
                # 计算相对时间
                now = datetime.now()
                diff = now - dt
                if diff.days > 0:
                    time_str = f"{diff.days}天前"
                elif diff.seconds > 3600:
                    time_str = f"{diff.seconds // 3600}小时前"
                elif diff.seconds > 60:
                    time_str = f"{diff.seconds // 60}分钟前"
                else:
                    time_str = "刚刚"
            except:
                time_str = create_time
        else:
            time_str = "未知"
        
        result.append({
            "id": r[0], 
            "qq": r[1], 
            "code": r[2], 
            "amount": r[3],
            "time": time_str
        })
    
    return jsonify(result)

def is_logged_in():
    return session.get('logged_in') == True

# ================= 自动清理过期线程 =================
def auto_cleanup_task():
    while True:
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            now = datetime.now()
            c.execute("SELECT code, phone, expire_time FROM cards WHERE used=1 AND expire_time IS NOT NULL")
            rows = c.fetchall()
            for code, phone, exp_str in rows:
                try:
                    expire_dt = datetime.strptime(exp_str, '%Y-%m-%d %H:%M:%S')
                    if now > expire_dt:
                        c.execute("DELETE FROM cards WHERE code=?", (code,))
                        if phone:
                            c.execute("DELETE FROM accounts WHERE phone=?", (phone,))
                            file_path = os.path.join(SESSION_DIR, f"{phone}.session")
                            if os.path.exists(file_path): os.remove(file_path)
                        print(f"✨ [清理] 卡密 {code} 已到期，已注销号码: {phone}")
                except Exception as e:
                    print(f"日期解析跳过: {e}")
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"清理线程异常: {e}")
        time.sleep(1800)

# ================= 登录管理 =================
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = request.form.get('username')
        pwd = request.form.get('password')
        if user == ADMIN_USER and pwd == ADMIN_PASS:
            session['logged_in'] = True
            return redirect('/admin')
        return "密码错误！<a href='/login'>返回重试</a>"
    return '''
        <div style="max-width:300px; margin:100px auto; padding:20px; border:1px solid #ccc; border-radius:10px; font-family:sans-serif;">
            <h2 style="text-align:center;">🔒 后台登录</h2>
            <form method="post">
                账号: <input type="text" name="username" style="width:100%;margin-bottom:10px;"><br>
                密码: <input type="password" name="password" style="width:100%;margin-bottom:20px;"><br>
                <input type="submit" value="登录" style="width:100%;padding:10px;background:#1a73e8;color:white;border:none;border-radius:5px;cursor:pointer;">
            </form>
        </div>
    '''

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect('/login')

# ================= 管理后台 =================
@app.route('/admin')
def admin_page():
    if not is_logged_in(): return redirect('/login')
    
    view_st = request.args.get('st', 'ALL')
    conn = sqlite3.connect(DB_PATH)
    
    # 修改这部分查询，确保能查到所有账号
    if view_st == '0':
        accounts = conn.execute("SELECT phone, category, status, password, note FROM accounts WHERE status=0").fetchall()
    elif view_st == '1':
        accounts = conn.execute("SELECT phone, category, status, password, note FROM accounts WHERE status=1").fetchall()
    elif view_st == '2':
        accounts = conn.execute("SELECT phone, category, status, password, note FROM accounts WHERE status=2").fetchall()
    elif view_st == '3':
        accounts = conn.execute("SELECT phone, category, status, password, note FROM accounts WHERE status=3").fetchall()
    else:
        accounts = conn.execute("SELECT phone, category, status, password, note FROM accounts").fetchall()

    stats = conn.execute("SELECT category, COUNT(*) FROM accounts WHERE status=1 GROUP BY category").fetchall()
    pending_count = conn.execute("SELECT COUNT(*) FROM accounts WHERE status=0").fetchone()[0]
    cards = conn.execute("SELECT code, category, used, phone, note, expire_time FROM cards ORDER BY used ASC").fetchall()
    
    # --- 新增：查询待处理红包订单 ---
    packet_orders = conn.execute("SELECT id, qq, packet_code, amount, create_time FROM redpacket_orders WHERE status=0").fetchall()
    conn.close()
    
    stats_dict = {s[0]: s[1] for s in stats}
    stats_html = "".join([f"<div style='background:#e3f2fd;padding:10px;margin-right:10px;border-radius:5px;display:inline-block;'><b>{label}档</b> 在售: {stats_dict.get(label, 0)}</div>" for label in ['A', 'B', 'C', 'D']])
    stats_html += f"<div style='background:#fff3e0;padding:10px;border-radius:5px;display:inline-block;color:#e65100;'><b>📦 仓库待审: {pending_count}</b></div>"

    acc_rows = ""
    for acc in accounts:
        st_map = {0: "📦 仓库中", 1: "✅ 在售中", 2: "🔴 已售出", 3: "⚪ 已下架"}
        status_text = st_map.get(acc[2], "未知")
        
        toggle_btn = ""
        if acc[2] == 0 or acc[2] == 3:
            toggle_btn = f"<button style='background:#34a853;color:white;' onclick=\"changeStatus('{acc[0]}', 1)\">上架</button>"
        elif acc[2] == 1:
            toggle_btn = f"<button style='background:#fbbc05;color:white;' onclick=\"changeStatus('{acc[0]}', 3)\">下架</button>"

        options = "".join([f"<option value='{v}' {'selected' if acc[1]==v else ''}>{v}档</option>" for v in ['A', 'B', 'C', 'D']])
        
        phone_color = "green" if acc[0].startswith('+') else "red"
        # 核心修改：在手机号 input 下方增加备注 textarea
        acc_rows += f"""<tr>
            <td>
                <input type='text' id='phone_input_{acc[0]}' value='{acc[0]}' style='color:{phone_color};font-weight:bold;width:140px;' placeholder='需包含+区号'>
                <textarea id='note_{acc[0]}' style='width:140px;display:block;margin-top:5px;font-size:12px;color:#666;' placeholder='账号备注信息...'>{acc[4] or ''}</textarea>
            </td>
            <td><select id='cat_{acc[0]}'>{options}</select></td>
            <td><input type='text' id='pwd_{acc[0]}' value='{acc[3]}' style='width:100px;'></td>
            <td>{status_text}</td>
            <td>
                <button onclick="updateAcc('{acc[0]}')">保存修改</button> 
                {toggle_btn}
                <button style='background:#f44336;color:white;' onclick="resetAcc('{acc[0]}')">重置</button>
                <button style='background:#000;color:white;' onclick="delAcc('{acc[0]}')">注销</button>
            </td>
        </tr>"""


    card_rows = ""
    for c in cards:
        if c[2] == 1:
            status_tag = f"<span style='color:red'>有效期至: {c[5]}</span>" if c[5] else "<span style='color:orange'>激活中...</span>"
        else:
            status_tag = "<span style='color:green'>未使用</span>"
        phone_info = c[3] if c[3] else "-"
        note_info = c[4] if c[4] else "<span style='color:#ccc'>无备注</span>"
        card_rows += f"<tr><td><code>{c[0]}</code></td><td>{c[1]}档</td><td>{note_info}</td><td>{status_tag}</td><td>{phone_info}</td><td><button style='background:#666;color:white;' onclick=\"delCard('{c[0]}')\">删除</button></td></tr>"

    # --- 新增：红包订单行构建 ---
    packet_rows = ""
    for p in packet_orders:
        packet_rows += f"""<tr>
            <td>{p[4]}</td>
            <td><b>{p[1]}</b></td>
            <td><code style='background:#fff3e0;padding:4px;'>{p[2]}</code></td>
            <td>{p[3]}元</td>
            <td><input type='text' id='scard_{p[0]}' placeholder='粘贴卡密' style='width:180px;'></td>
            <td><button onclick='approvePacket({p[0]})' style='background:#10b981;color:white;'>发放</button></td>
        </tr>"""

    return f'''
<!DOCTYPE html><html><head><title>管理后台</title><meta charset="utf-8">
<style>
    body{{font-family:sans-serif;padding:20px;background:#f0f2f5;}} 
    .card{{background:white;padding:20px;border-radius:10px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}} 
    table{{width:100%;border-collapse:collapse;margin-top:10px;}} 
    th,td{{border:1px solid #eee;padding:10px;text-align:left;font-size:14px;vertical-align:top;}}
    th{{background:#f8f9fa;}}
    .scroll-table{{max-height:600px;overflow-y:auto;display:block;}}
    button{{cursor:pointer;padding:5px 10px;border:none;border-radius:3px;background:#1a73e8;color:white;margin-right:2px;}}
    input, select, textarea{{padding:5px; border:1px solid #ccc; border-radius:4px;}}
    .upload-box{{background:#f8f9fa; padding:15px; border:2px dashed #ccc; border-radius:8px;}}
    .filter-nav {{margin-bottom: 15px;}}
    .filter-nav a {{margin-right: 15px; text-decoration: none; color: #1a73e8; font-size: 14px; font-weight: bold;}}
    .notification-badge {{
        background: #ff4757;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        margin-left: 5px;
    }}
    @keyframes pulse {{
        0% {{ box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }}
        70% {{ box-shadow: 0 0 0 10px rgba(255, 71, 87, 0); }}
        100% {{ box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }}
    }}
    .pulse {{
        animation: pulse 1.5s infinite;
    }}
</style>
</head><body>
<h2>🔒 接码管理系统 <span id="order-count-badge" class="notification-badge">{len(packet_orders)}</span> 
    <a href="/logout" style="font-size:14px; margin-left:20px;">[退出]</a>
</h2>

<div class="card" style="border: 2px solid #ff4d4f;">
    <h3 style="color:#ff4d4f;">🧧 4. 待处理红包订单 <span id="pending-count">{len(packet_orders)}</span>个</h3>
    <div id="order-alert" style="display:none; background:#ff6b6b; color:white; padding:10px; border-radius:5px; margin-bottom:10px; text-align:center;">
        🆕 有新订单啦！
    </div>
    <div class="scroll-table">
        <table id="orders-table">
            <thead><tr><th>提交时间</th><th>联系QQ</th><th>红包口令</th><th>金额</th><th>发放卡密</th><th>操作</th></tr></thead>
            <tbody>{packet_rows}</tbody>
        </table>
    </div>
</div>

<div class="card">
    <h3>📂 批量上传账号 (默认存入仓库)</h3>
    <div class="upload-box">
        选择档位: <select id="up_cat"><option value="A">A档</option><option value="B">B档</option><option value="C">C档</option><option value="D">D档</option></select>
        <input type="file" id="up_file" multiple accept=".session">
        <button onclick="uploadFiles()" style="background:#34a853;">开始上传</button>
    </div>
</div>

<div class="card"><h3>📊 库存概览</h3>{stats_html}</div>

<div class="card">
    <h3>1. 账号管理</h3>
    <div class="filter-nav">
        <a href="?st=ALL">显示全部</a>
        <a href="?st=0" style="color:orange;">📦 只看仓库待审</a>
        <a href="?st=1" style="color:green;">✅ 只看在售账号</a>
    </div>
    <div class="scroll-table">
        <table><thead><tr><th>手机号与备注</th><th>档位</th><th>二级密码</th><th>状态</th><th>操作</th></tr></thead><tbody>{acc_rows}</tbody></table>
    </div>
</div>

<div class="card">
    <h3>2. 生成卡密</h3>
    档位: <select id="c_cat"><option value="A">A档</option><option value="B">B档</option><option value="C">C档</option><option value="D">D档</option></select>
    数量: <input type="number" id="c_num" value="5" style="width:60px">
    备注: <input type="text" id="c_note" placeholder="如：客户A" style="width:150px">
    <button onclick="genCard()">批量生产</button>
</div>

<div class="card">
    <h3>3. 卡密列表</h3>
    <div class="scroll-table">
        <table><thead><tr><th>卡密内容</th><th>类型</th><th>备注</th><th>状态</th><th>绑定手机</th><th>操作</th></tr></thead><tbody>{card_rows}</tbody></table>
    </div>
</div>

<script>
// 全局变量
let lastOrderCount = {len(packet_orders)};
let notificationPermission = Notification.permission;
let pageRefreshInterval = 10 * 60 * 1000; // 10分钟刷新一次页面

// 1. 请求通知权限
function requestNotificationPermission() {{
    if ("Notification" in window && notificationPermission === "default") {{
        Notification.requestPermission().then(function(permission) {{
            notificationPermission = permission;
            if (permission === "granted") {{
                console.log("✅ 通知权限已开启");
                showNotification("通知权限已开启", "有新订单时会收到通知");
            }}
        }});
    }}
}}

// 2. 显示浏览器通知
function showNotification(title, body) {{
    if (notificationPermission === "granted") {{
        const options = {{
            body: body,
            icon: "/static/favicon.ico",
            tag: "new-order"
        }};
        
        const notification = new Notification(title, options);
        
        // 点击通知
        notification.onclick = function(event) {{
            event.preventDefault();
            window.focus();
            this.close();
        }};
        
        // 4秒后自动关闭
        setTimeout(() => notification.close(), 4000);
        
        return notification;
    }}
}}

// 3. 播放提示音
function playNotificationSound() {{
    try {{
        // 使用简单的哔声
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }} catch(e) {{
        console.log("提示音播放失败:", e);
    }}
}}

// 4. 显示浮动提示
function showFloatingAlert(count) {{
    // 移除现有的浮动提示
    const existingAlert = document.getElementById("floating-order-alert");
    if (existingAlert) existingAlert.remove();
    
    // 创建新的浮动提示
    const alertDiv = document.createElement("div");
    alertDiv.id = "floating-order-alert";
    alertDiv.innerHTML = `
        <div style="position: fixed; top: 10px; right: 10px; background: linear-gradient(135deg, #ff6b6b, #ff4757); 
            color: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
            z-index: 9999; animation: slideIn 0.5s ease; min-width: 250px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 24px;">🆕</div>
                <div>
                    <div style="font-weight: bold; font-size: 16px;">有新订单啦！</div>
                    <div style="font-size: 14px; opacity: 0.9;">有 <b>' + count + '</b> 个新订单等待处理</div>
                </div>
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button onclick="location.reload()" style="flex:1; background: white; color: #ff4757; border: none; 
                    padding: 8px; border-radius: 5px; cursor: pointer; font-weight: bold;">立即查看</button>
                <button onclick="this.parentElement.parentElement.remove()" style="background: rgba(255,255,255,0.2); 
                    color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer;">忽略</button>
            </div>
        </div>
        <style>
            @keyframes slideIn {{
                from {{ transform: translateX(100%); opacity: 0; }}
                to {{ transform: translateX(0); opacity: 1; }}
            }}
        </style>
    `;
    
    document.body.appendChild(alertDiv);
    
    // 5秒后自动消失
    setTimeout(() => {{
        if (alertDiv.parentNode) {{
            alertDiv.style.transition = "all 0.5s ease";
            alertDiv.style.opacity = "0";
            alertDiv.style.transform = "translateX(100%)";
            setTimeout(() => {{
                if (alertDiv.parentNode) alertDiv.remove();
            }}, 500);
        }}
    }}, 5000);
}}

// 5. 检查新订单
function checkNewOrders() {{
    fetch("/api/admin/pending_packets")
        .then(res => res.json())
        .then(data => {{
            const newOrderCount = data.length;
            
            // 如果有新订单
            if (newOrderCount > lastOrderCount) {{
                const newOrders = newOrderCount - lastOrderCount;
                
                console.log("🆕 发现 " + newOrders + " 个新订单");
                
                // 播放提示音
                playNotificationSound();
                
                // 显示浏览器通知
                showNotification("📦 有新订单！", "有 " + newOrders + " 个新订单等待处理");
                
                // 显示浮动提示
                showFloatingAlert(newOrders);
                
                // 更新订单数量显示
                updateOrderCount(newOrderCount);
                
                // 动态更新订单列表（不刷新整个页面）
                updateOrdersTable(data);
                
                lastOrderCount = newOrderCount;
            }} else if (newOrderCount < lastOrderCount) {{
                // 订单减少（已处理）
                lastOrderCount = newOrderCount;
                updateOrderCount(newOrderCount);
            }}
        }})
        .catch(err => console.log("轮询错误:", err));
}}

// 6. 更新订单数量显示
function updateOrderCount(count) {{
    const badge = document.getElementById("order-count-badge");
    const pendingCount = document.getElementById("pending-count");
    
    if (badge) {{
        badge.textContent = count;
        if (count > 0) {{
            badge.classList.add("pulse");
        }} else {{
            badge.classList.remove("pulse");
        }}
    }}
    
    if (pendingCount) {{
        pendingCount.textContent = count;
    }}
}}

// 7. 动态更新订单表格
function updateOrdersTable(orders) {{
    const tbody = document.querySelector("#orders-table tbody");
    if (!tbody) return;
    
    let newRows = "";
    orders.forEach(p => {{
        newRows +=
            '<tr>' +
                '<td>' + p.time + '</td>' +
                '<td><b>' + p.qq + '</b></td>' +
                '<td><code style="background:#fff3e0;padding:4px;">' + p.code + '</code></td>' +
                '<td>' + p.amount + '元</td>' +
                '<td><input type="text" id="scard_' + p.id + '" placeholder="粘贴卡密" style="width:180px;"></td>' +
                '<td><button onclick="approvePacket(' + p.id + ')" style="background:#10b981;color:white;">发放</button></td>' +
            '</tr>';
    }}); // 这里删掉了原有的 `; 符号
    
    tbody.innerHTML = newRows;
}}

// 8. 页面初始化
document.addEventListener("DOMContentLoaded", function() {{
    console.log("✅ 后台管理系统已加载");
    console.log("⏰ 页面将在10分钟后自动刷新");
    console.log("🔔 新订单提醒功能已启用");
    
    // 请求通知权限
    requestNotificationPermission();
    
    // 开始检查新订单（每10秒检查一次）
    setInterval(checkNewOrders, 10000);
    
    // 10分钟后自动刷新页面（600000毫秒）
    setTimeout(() => {{
        console.log("🔄 10分钟已到，自动刷新页面...");
        location.reload();
    }}, pageRefreshInterval);
    
    // 显示刷新倒计时
    let minutesLeft = 10;
    let secondsLeft = 0;
    setInterval(() => {{
        secondsLeft--;
        if (secondsLeft < 0) {{
            minutesLeft--;
            secondsLeft = 59;
        }}
        
        if (minutesLeft >= 0) {{
            document.title = "管理后台 (" + minutesLeft + ":" + secondsLeft.toString().padStart(2, "0") + "后刷新)";
        }}
    }}, 1000);
}});

// 页面不可见时停止轮询，可见时恢复
document.addEventListener("visibilitychange", function() {{
    if (document.hidden) {{
        document.title = "管理后台 (" + lastOrderCount + "个待处理)";
    }}
}});

// ================= 原有函数 =================
function approvePacket(id) {{
    const card = document.getElementById("scard_"+id).value;
    if(!card) return alert("请先输入卡密");
    fetch("/api/admin/approve_packet", {{
        method:"POST",
        headers:{{"Content-Type":"application/json"}},
        body:JSON.stringify({{id: id, card: card}})
    }}).then(res=>res.json()).then(data=>{{
        alert("发放成功！");
        location.reload();
    }});
}}

function uploadFiles(){{
    const files = document.getElementById("up_file").files;
    const cat = document.getElementById("up_cat").value;
    if(files.length === 0) return alert("请先选择文件");
    const formData = new FormData();
    formData.append("cat", cat);
    for(let i=0; i<files.length; i++) formData.append("files", files[i]);
    fetch("/admin/upload", {{method:"POST", body:formData}})
    .then(res=>res.json()).then(data=>{{ alert("成功上传 "+data.count+" 个账号至仓库"); location.reload(); }});
}}
function changeStatus(phone, st){{
    if(st === 1 && !phone.startsWith("+")) return alert("错误：号码必须带区号+才能上架！请先修改手机号并保存。");
    fetch("/admin/update_status",{{method:"POST",headers:{{"Content-Type":"application/json"}},
    body:JSON.stringify({{phone:phone, status:st}})}}).then(()=>location.reload());
}}
function updateAcc(oldPhone){{
    const newPhone = document.getElementById("phone_input_"+oldPhone).value;
    const cat = document.getElementById("cat_"+oldPhone).value;
    const pwd = document.getElementById("pwd_"+oldPhone).value;
    const note = document.getElementById("note_"+oldPhone).value;
    fetch("/admin/update_acc",{{method:"POST",headers:{{"Content-Type":"application/json"}},
    body:JSON.stringify({{old_phone:oldPhone, new_phone:newPhone, cat:cat, pwd:pwd, note:note}})}})
    .then(res=>res.json()).then(data=>{{ location.reload(); }});
}}
function resetAcc(phone){{
    if(confirm("确定要重置吗？")) fetch("/admin/reset_acc",{{method:"POST",headers:{{"Content-Type":"application/json"}},body:JSON.stringify({{phone:phone}})}}).then(()=>location.reload());
}}
function delAcc(phone){{
    if(confirm("彻底删除？")) fetch("/admin/del_acc",{{method:"POST",headers:{{"Content-Type":"application/json"}},body:JSON.stringify({{phone:phone}})}}).then(()=>location.reload());
}}
function genCard(){{
    fetch("/admin/gen",{{method:"POST",headers:{{"Content-Type":"application/json"}},
    body:JSON.stringify({{cat:document.getElementById("c_cat").value, num:document.getElementById("c_num").value, note:document.getElementById("c_note").value}})}})
    .then(()=>{{ alert("生成成功！"); location.reload(); }});
}}
function delCard(code){{
    if(confirm("确定删除？")) fetch("/admin/del_card",{{method:"POST",headers:{{"Content-Type":"application/json"}},body:JSON.stringify({{code:code}})}}).then(()=>location.reload());
}}
</script></body></html>
    '''


@app.route('/api/admin/approve_packet', methods=['POST'])
def approve_packet():
    if not is_logged_in(): return jsonify({"status":"err"}), 403
    data = request.json
    order_id = data.get('id')
    card_secret = data.get('card')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # 更新订单状态为 1 (已发放)，并填入卡密
    c.execute("UPDATE redpacket_orders SET card_secret=?, status=1 WHERE id=?", (card_secret, order_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

# ================= 账号管理接口 =================

@app.route('/admin/upload', methods=['POST'])
def upload():
    if not is_logged_in(): return jsonify({"status":"err"}), 403
    cat = request.form.get('cat', 'A')
    files = request.files.getlist('files')
    count = 0
    conn = sqlite3.connect(DB_PATH)
    for f in files:
        if f.filename.endswith('.session'):
            filename = secure_filename(f.filename)
            f.save(os.path.join(SESSION_DIR, filename))
            phone = filename.replace('.session', '')
            conn.execute("INSERT OR REPLACE INTO accounts (phone, category, status, password) VALUES (?, ?, 0, '')", (phone, cat))
            count += 1
    conn.commit()
    conn.close()
    return jsonify({"status":"ok", "count": count})

@app.route('/admin/update_status', methods=['POST'])
def update_status():
    if not is_logged_in(): return jsonify({"status":"err"}), 403
    data = request.json
    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE accounts SET status=? WHERE phone=?", (data['status'], data['phone']))
    conn.commit(); conn.close()
    return jsonify({"status":"ok"})

@app.route('/admin/del_acc', methods=['POST'])
def del_acc():
    if not is_logged_in(): return jsonify({"status":"err"}), 403
    phone = request.json.get('phone')
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM accounts WHERE phone=?", (phone,))
    conn.commit(); conn.close()
    file_path = os.path.join(SESSION_DIR, f"{phone}.session")
    if os.path.exists(file_path): os.remove(file_path)
    return jsonify({"status":"ok"})

@app.route('/admin/update_acc', methods=['POST'])
def update_acc():
    if not is_logged_in(): return jsonify({"status":"err"}), 403
    data = request.json
    old_p = data.get('old_phone')
    new_p = data.get('new_phone')
    cat = data.get('cat')
    pwd = data.get('pwd')
    note = data.get('note', '') # 获取新增的备注
    
    conn = sqlite3.connect(DB_PATH)
    try:
        if old_p != new_p:
            old_path = os.path.join(SESSION_DIR, f"{old_p}.session")
            new_path = os.path.join(SESSION_DIR, f"{new_p}.session")
            if os.path.exists(old_path):
                os.rename(old_path, new_path)
            
            c = conn.cursor()
            c.execute("SELECT status FROM accounts WHERE phone=?", (old_p,))
            old_status = c.fetchone()[0]
            c.execute("DELETE FROM accounts WHERE phone=?", (old_p,))
            # 插入时包含备注
            c.execute("INSERT INTO accounts (phone, category, status, password, note) VALUES (?, ?, ?, ?, ?)", 
                      (new_p, cat, old_status, pwd, note))
        else:
            # 更新时包含备注
            conn.execute("UPDATE accounts SET category=?, password=?, note=? WHERE phone=?", (cat, pwd, note, old_p))
        
        conn.commit()
        return jsonify({"status":"ok"})
    except Exception as e:
        return jsonify({"status":"err", "msg": str(e)})
    finally:
        conn.close()

@app.route('/admin/reset_acc', methods=['POST'])
def reset_acc():
    if not is_logged_in(): return jsonify({"status":"err"}), 403
    phone = request.json.get('phone')
    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE accounts SET status=0 WHERE phone=?", (phone,))
    conn.execute("UPDATE cards SET used=0, phone=NULL, expire_time=NULL WHERE phone=?", (phone,))
    conn.commit(); conn.close()
    return jsonify({"status":"ok"})

# ================= 卡密与接码接口 =================

@app.route('/admin/gen', methods=['POST'])
def gen():
    if not is_logged_in(): return jsonify({"status":"err"}), 403
    data = request.json
    cat, num, note = data.get('cat', 'A'), data.get('num', 1), data.get('note', '')
    conn = sqlite3.connect(DB_PATH)
    for _ in range(int(num)):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=16))
        conn.execute("INSERT INTO cards (code, category, used, phone, note, expire_time) VALUES (?, ?, 0, NULL, ?, NULL)", (code, cat, note))
    conn.commit(); conn.close()
    return jsonify({"status":"ok"})

@app.route('/admin/del_card', methods=['POST'])
def del_card():
    if not is_logged_in(): return jsonify({"status":"err"}), 403
    code = request.json.get('code')
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM cards WHERE code=?", (code,))
    conn.commit(); conn.close()
    return jsonify({"status":"ok"})

@app.route('/api/verify', methods=['POST'])
def verify():
    data = request.json
    code = data.get('code')
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # 步骤 1: 查卡密信息
    c.execute("SELECT category, used, phone, expire_time FROM cards WHERE code=?", (code,))
    res = c.fetchone()
    if not res: 
        conn.close()
        return jsonify({"status":"err", "msg":"卡密不存在"})
    
    cat, used, card_phone, expire_time = res
    resp_phone = ""
    resp_pwd = ""
    resp_note = "" # 增加备注变量

    if not used:
        # 步骤 2: 分配新账号 - 注意这里增加了 note 的查询
        c.execute("SELECT phone, password, note FROM accounts WHERE category=? AND status=1 LIMIT 1", (cat,))
        acc = c.fetchone()
        if not acc: 
            conn.close()
            return jsonify({"status":"err", "msg":f"【{cat}档】在售库存不足"})
        
        target_phone = acc[0]
        resp_phone, resp_pwd, resp_note = acc[0], acc[1], acc[2] # 获取数据库里的备注
        
        expire_dt = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S')
        c.execute("UPDATE cards SET used=1, phone=?, expire_time=? WHERE code=?", (target_phone, expire_dt, code))
        c.execute("UPDATE accounts SET status=2 WHERE phone=?", (target_phone,))
        conn.commit()
    else:
        # 步骤 3: 已使用卡密，再次查询该号的档位、密码和备注
        c.execute("SELECT phone, password, note, category FROM accounts WHERE phone=?", (card_phone,))
        acc_info = c.fetchone()
        if acc_info:
            resp_phone, resp_pwd, resp_note, cat = acc_info[0], acc_info[1], acc_info[2], acc_info[3]
        else:
            resp_phone, resp_pwd, resp_note = card_phone, "未知", "账号信息同步中"

    conn.close()
    
    # 启动监听线程
    threading.Thread(target=run_async_listener, args=(resp_phone,)).start()
    
    # --- 关键：必须把 category 和 note 返回给前端 ---
    return jsonify({
        "status": "ok", 
        "phone": resp_phone, 
        "password": resp_pwd or "未设置",
        "category": cat,      # 给前端显示档位
        "note": resp_note or "" # 给前端显示备注
    })
    
def run_async_listener(phone):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_single_listen(phone))

async def start_single_listen(phone):
    clean_phone = re.sub(r'\D', '', phone)
    client = TelegramClient(f"{SESSION_DIR}/{phone}", API_ID, API_HASH)
    try:
        await client.connect()
        if not await client.is_user_authorized(): 
            return
        @client.on(events.NewMessage(from_users=777000))
        async def handler(event):
            found = re.search(r'\b\d{5}\b', event.raw_text)
            if found:
                live_codes[clean_phone] = found.group()
        await asyncio.sleep(1200) 
        await client.disconnect()
    except: pass

@app.route('/api/get_code')
def get_code():
    clean_id = re.sub(r'\D', '', request.args.get('id', ''))
    return jsonify({"code": live_codes.get(clean_id, "⏳ 等待中")})

if __name__ == '__main__':
    init_db()
    threading.Thread(target=auto_cleanup_task, daemon=True).start()
    print("=" * 50)
    print("🚀 Telegram账号商店后台系统已启动")
    print("📊 访问地址: http://139.177.187.30:5000/admin")
    print("🔑 登录账号: admin")
    print("🔒 登录密码: xiao19890413.")
    print("=" * 50)
    
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        print("✅ Telegram通知功能已启用")
        send_telegram_notification("📱 后台系统启动成功！")
    else:
        print("⚠️  Telegram通知未配置，请在.env文件中设置TELEGRAM_BOT_TOKEN和TELEGRAM_CHAT_ID")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
