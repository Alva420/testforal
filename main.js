// 配置参数
const CONFIG = {
    white: { name: "普通品质（白色）", base_prob: 31.7, items: [
        "【涂鸦】“噩梦”-彩底", "【涂鸦】“小女孩”-彩底", "【涂鸦】病患-彩底", 
        "【涂鸦】击球手-彩底", "【涂鸦】哭泣小丑-彩底", "【涂鸦】蜡像师-彩底", 
        "【涂鸦】“心理学家”-彩底", "【头像】彩色回忆-勘探员", 
        "【头像】彩色回忆-咒术师", "【头像】彩色回忆 - 26号守卫", 
        "【头像】彩色回忆 - 红夫人"
    ]},
    green: { name: "罕见品质（绿色）", base_prob: 49.8, items: [
        "【时装】红夫人 - 落日黄", "【时装】孽蜥 - 紫乌头", "【时装】杂技演员 - 绯红", 
        "【时装】邮差 - 风度粉", "【个性动作】古董商 - 躺地", "【个性动作】入殓师 - 挑衅", 
        "【个性动作】杂技演员 - 呼喊", "【个性动作】杂技演员 - 躺地", 
        "【等待动作】魔术师 - 小憩", "【等待动作】“慈善家”- 准备", 
        "【等待动作】空军 - 小憩", "【等待动作】律师 - 小憩", 
        "【等待动作】魔术师 - 等待", "【涂鸦】摄影师-个性", 
        "【涂鸦】调酒师-个性", "【涂鸦】舞女-个性", "【涂鸦】宿伞之魂-个性", 
        "【头像】黑白回忆-作曲家", "【头像】黑白回忆-记者", "【头像】黑白回忆-小说家"
    ]},
    blue: { name: "独特品质（蓝色）", base_prob: 10.2, pity_limit: 10, items: [
        "【时装】鹿头-巡视守卫", "【时装】昆虫学者-螫针", "【时装】梦之女巫-银行经理", 
        "【时装】野人-故事迷", "【时装】杂技演员-锢影", "【个性动作】入殓师-起舞", 
        "【个性动作】守夜人-行礼", "【等待动作】“使徒”-示咸", "【等待动作】红夫人-笑颜", 
        "【时装】“杰克”-黑男爵", "【时装】医生-肃静蓝", "【时装】魔术师-葡萄酒", 
        "【时装】机械师-墨黑", "【时装】黄衣之主 - 青苔", "【时装】入殓师 - 休闲黄", 
        "【时装】爱哭鬼 - 白糖"
    ]},
    purple: { name: "奇珍品质（紫色）", base_prob: 2.5, pity_limit: 60, items: [
        "【时装】守墓人-冥契", "【时装】医生-银锑"
    ]},
    golden: { name: "稀世品质（金色）", base_prob: 0.7, pity_limit: 200, items: [
        "【时装】隐士-薄金[限定]"
    ]}
};

const ESSENCE_PER_DRAW = 96;

// 初始化计数器
let pity_blue = 0;
let pity_purple = 0;
let pity_golden = 0;

let total_draws = 0;
let total_essence = 0;

// 品质统计
const quality_counter = {
    "普通品质（白色）": 0,
    "罕见品质（绿色）": 0,
    "独特品质（蓝色）": 0,
    "奇珍品质（紫色）": 0,
    "稀世品质（金色）": 0
};

// 物品统计
const item_counter = {};
for (const quality in CONFIG) {
    CONFIG[quality].items.forEach(item => {
        item_counter[item] = 0;
    });
}

// 抽中记录
const purple_draws = [];
const golden_draws = [];

// 修正后的 PRD 概率曲线函数
function get_purple_probability(pity) {
    if (pity >= CONFIG.purple.pity_limit) return 100.0;
    else if (pity < 15) return 0.67; // 10%/15 ≈ 0.67%
    else if (pity < 30) return 1.27; // (38%-10%)/15 ≈ 1.27%
    else return 2.5 + (pity - 30) * (97.5/(CONFIG.purple.pity_limit-30)); // 线性增长至100%
}

function get_golden_probability(pity) {
    if (pity >= CONFIG.golden.pity_limit) return 100.0;
    else if (pity < 50) return 0.126; // 6.3%/50 ≈ 0.126%
    else if (pity < 100) return 0.376; // (25%-6.3%)/50 ≈ 0.376%
    else if (pity < 150) return 0.7; // (0.7%平均概率推算)
    else return 0.7 + (pity - 150) * (99.3/(CONFIG.golden.pity_limit-150)); // 线性增长至100%
}

// 随机从列表中选择一个物品
function get_random_item(quality) {
    const items = CONFIG[quality].items;
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
}

// 获取当前概率分布（优化版）
function get_current_probabilities() {
    // 基础概率
    let prob_white = CONFIG.white.base_prob;
    let prob_green = CONFIG.green.base_prob;
    let prob_blue = CONFIG.blue.base_prob;
    
    // 保底检查
    if (pity_blue >= CONFIG.blue.pity_limit) {
        prob_blue = 100;
    }
    
    // 动态概率
    const prob_purple = get_purple_probability(pity_purple);
    const prob_golden = get_golden_probability(pity_golden);
    
    // 概率归一化处理
    const total = prob_white + prob_green + prob_blue + prob_purple + prob_golden;
    if (total > 100) {
        const scale = 100 / total;
        prob_white *= scale;
        prob_green *= scale;
        prob_blue *= scale;
    }
    
    // 构建概率区间
    let probabilities = [];
    let start = 0;
    
    // 从高到低添加概率区间
    if (prob_golden > 0) {
        probabilities.push([start, start + prob_golden, "golden"]);
        start += prob_golden;
    }
    if (prob_purple > 0) {
        probabilities.push([start, start + prob_purple, "purple"]);
        start += prob_purple;
    }
    if (prob_blue > 0) {
        probabilities.push([start, start + prob_blue, "blue"]);
        start += prob_blue;
    }
    if (prob_green > 0) {
        probabilities.push([start, start + prob_green, "green"]);
        start += prob_green;
    }
    if (prob_white > 0) {
        probabilities.push([start, start + prob_white, "white"]);
        start += prob_white;
    }
    
    return probabilities;
}

// 获取品质对应的CSS类
function get_quality_css_class(quality) {
    switch(quality) {
        case "white": return "quality-white-text";
        case "green": return "quality-green-text";
        case "blue": return "quality-blue-text";
        case "purple": return "quality-purple-text";
        case "golden": return "quality-golden-text";
        default: return "text-gray-700";
    }
}

// 执行一次抽卡
function draw_card() {
    total_draws++;
    total_essence += ESSENCE_PER_DRAW;
    
    const probabilities = get_current_probabilities();
    const rand_num = Math.random() * 100;
    
    for (const [start, end, quality] of probabilities) {
        if (rand_num >= start && rand_num < end) {
            const item = get_random_item(quality);
            item_counter[item]++;
            
            // 更新保底计数器
            if (quality === "golden") {
                golden_draws.push({draw: total_draws, item: item});
                pity_golden = 0;
                pity_purple = 0;
                pity_blue = 0;
            } else if (quality === "purple") {
                purple_draws.push({draw: total_draws, item: item});
                pity_golden++;
                pity_purple = 0;
                pity_blue++;
            } else if (quality === "blue") {
                pity_golden++;
                pity_purple++;
                pity_blue = 0;
            } else {
                pity_golden++;
                pity_purple++;
                pity_blue++;
            }
            
            // 更新品质统计
            quality_counter[CONFIG[quality].name]++;
            update_gui(quality, item);
            update_stats_labels();
            update_history_list();
            update_pity_progress();
            return;
        }
    }
    
    // 默认返回（理论上不会执行到这里）
    const default_quality = "white";
    const item = get_random_item(default_quality);
    item_counter[item]++;
    quality_counter[CONFIG[default_quality].name]++;
    update_gui(default_quality, item);
    update_stats_labels();
    update_pity_progress();
}

// 更新保底进度条
function update_pity_progress() {
    const golden_progress = (pity_golden / CONFIG.golden.pity_limit) * 100;
    document.getElementById('pity_progress').style.width = `${golden_progress}%`;
}

// 更新 GUI 显示
function update_gui(quality, item) {
    const output = document.getElementById("output");
    const quality_name = CONFIG[quality].name;
    const css_class = get_quality_css_class(quality);
    
    const message = `<span class="${css_class}">第${total_draws}次抽卡：${quality_name} - ${item} | 保底 [蓝:${pity_blue}, 紫:${pity_purple}, 金:${pity_golden}]</span><br>`;
    output.innerHTML += message;
    output.scrollTop = output.scrollHeight;

    document.getElementById("pity_label").innerText =
        `保底计数：蓝(${pity_blue}) | 紫(${pity_purple}) | 金(${pity_golden})`;
}

// 更新统计 Label
function update_stats_labels() {
    for (const quality in CONFIG) {
        const quality_name = CONFIG[quality].name;
        document.getElementById(`${quality}_count`).innerText = 
            `${quality_name}: ${quality_counter[quality_name]} 次`;
    }
}

// 更新历史记录列表
function update_history_list() {
    const purple_history = document.getElementById("purple_history");
    const golden_history = document.getElementById("golden_history");
    
    if (purple_draws.length === 0) {
        purple_history.innerHTML = '<li class="text-gray-500 italic">暂无记录</li>';
    } else {
        purple_history.innerHTML = '';
        purple_draws.forEach(record => {
            const li = document.createElement("li");
            li.className = "quality-purple-text";
            li.innerHTML = `第 <span class="font-medium">${record.draw}</span> 次: ${record.item}`;
            purple_history.appendChild(li);
        });
    }
    
    if (golden_draws.length === 0) {
        golden_history.innerHTML = '<li class="text-gray-500 italic">暂无记录</li>';
    } else {
        golden_history.innerHTML = '';
        golden_draws.forEach(record => {
            const li = document.createElement("li");
            li.className = "quality-golden-text";
            li.innerHTML = `第 <span class="font-medium">${record.draw}</span> 次: ${record.item}`;
            golden_history.appendChild(li);
        });
    }
}

// 抽卡按钮事件
function onSingleDraw() {
    draw_card();
}

function onTenDraws() {
    for (let i = 0; i < 10; i++) {
        setTimeout(draw_card, i * 100); // 100ms间隔
    }
}

function onMaxDraws() {
    const target_draws = CONFIG.golden.pity_limit - pity_golden;
    let delay = 0;
    for (let i = 0; i < target_draws; i++) {
        setTimeout(draw_card, delay);
        delay += i % 10 === 0 ? 100 : 20; // 每10次抽卡间隔100ms，其余间隔20ms
    }
}

// 重置功能
function reset() {
    pity_blue = 0;
    pity_purple = 0;
    pity_golden = 0;

    total_draws = 0;
    total_essence = 0;

    for (const key in quality_counter) {
        quality_counter[key] = 0;
    }
    
    for (const key in item_counter) {
        item_counter[key] = 0;
    }

    purple_draws.length = 0;
    golden_draws.length = 0;

    document.getElementById("output").innerHTML = "";
    document.getElementById("pity_label").innerText = `保底计数：蓝(0) | 紫(0) | 金(0)`;
    document.getElementById("pity_progress").style.width = "0%";
    update_stats_labels();
    update_history_list();
}

// 初始化UI
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('single_draw').addEventListener('click', onSingleDraw);
    document.getElementById('ten_draws').addEventListener('click', onTenDraws);
    document.getElementById('max_draws').addEventListener('click', onMaxDraws);
    document.getElementById('reset').addEventListener('click', reset);
    update_stats_labels();
    update_history_list();
});
