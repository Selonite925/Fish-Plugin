// 鱼池数据配置文件。
// 尺寸单位为 cm，重量单位为 kg；范围按常见成体或可钓获个体估算。
// 自定义说明：
// 1. 想增加鱼种，就往对应稀有度数组里添加 { name, size, weight }。
// 2. 彩蛋鱼的稀有度 key 是 “？”，概率仍在 rarityWeights 里调。
// 3. 新增 legendary 鱼时，记得去 lib/messages.js 的 legendaryMessages 补专属出场文本。

export const commonFish = [
  { name: '鲫鱼', size: { min: 10, max: 35 }, weight: { min: 0.05, max: 1.2 } },
  { name: '鲤鱼', size: { min: 25, max: 90 }, weight: { min: 0.5, max: 12 } },
  { name: '草鱼', size: { min: 45, max: 130 }, weight: { min: 2, max: 35 } },
  { name: '鲢鱼', size: { min: 35, max: 110 }, weight: { min: 1, max: 18 } },
  { name: '鳙鱼', size: { min: 45, max: 130 }, weight: { min: 2, max: 30 } },
  { name: '白条', size: { min: 8, max: 22 }, weight: { min: 0.01, max: 0.15 } },
  { name: '麦穗鱼', size: { min: 4, max: 12 }, weight: { min: 0.005, max: 0.04 } },
  { name: '泥鳅', size: { min: 8, max: 25 }, weight: { min: 0.01, max: 0.2 } },
  { name: '黄颡鱼', size: { min: 12, max: 35 }, weight: { min: 0.05, max: 0.8 } },
  { name: '罗非鱼', size: { min: 15, max: 50 }, weight: { min: 0.15, max: 4 } },
  { name: '鲮鱼', size: { min: 18, max: 60 }, weight: { min: 0.2, max: 4 } },
  { name: '鳊鱼', size: { min: 20, max: 55 }, weight: { min: 0.3, max: 4 } },
  { name: '小黄鱼', size: { min: 15, max: 40 }, weight: { min: 0.08, max: 1 } },
  { name: '带鱼', size: { min: 50, max: 150 }, weight: { min: 0.3, max: 5 } },
  { name: '秋刀鱼', size: { min: 20, max: 35 }, weight: { min: 0.08, max: 0.3 } },
  { name: '沙丁鱼', size: { min: 10, max: 25 }, weight: { min: 0.02, max: 0.18 } },
  { name: '鲱鱼', size: { min: 18, max: 40 }, weight: { min: 0.08, max: 0.8 } },
  { name: '凤尾鱼', size: { min: 8, max: 18 }, weight: { min: 0.005, max: 0.06 } },
  { name: '鲻鱼', size: { min: 25, max: 80 }, weight: { min: 0.4, max: 7 } },
  { name: '鲐鱼', size: { min: 25, max: 55 }, weight: { min: 0.25, max: 2 } },
  { name: '蓝鳃太阳鱼', size: { min: 8, max: 25 }, weight: { min: 0.03, max: 0.6 } },
  { name: '白鲦', size: { min: 7, max: 18 }, weight: { min: 0.005, max: 0.08 } },
  { name: '棘鳅', size: { min: 10, max: 30 }, weight: { min: 0.02, max: 0.25 } },
  { name: '银鲴', size: { min: 15, max: 40 }, weight: { min: 0.1, max: 1.2 } },
  { name: '鳑鲏', size: { min: 4, max: 10 }, weight: { min: 0.002, max: 0.02 } },
  { name: '棒花鱼', size: { min: 6, max: 18 }, weight: { min: 0.005, max: 0.06 } },
  { name: '青鳉', size: { min: 2, max: 5 }, weight: { min: 0.001, max: 0.005 } },
  { name: '马口鱼', size: { min: 10, max: 25 }, weight: { min: 0.02, max: 0.2 } },
  { name: '子陵吻虾虎', size: { min: 4, max: 12 }, weight: { min: 0.003, max: 0.03 } },
  { name: '大西洋鲭', size: { min: 25, max: 60 }, weight: { min: 0.3, max: 2.5 } },
  { name: '赤眼鳟', size: { min: 20, max: 60 }, weight: { min: 0.2, max: 3 } },
  { name: '花骨鱼', size: { min: 12, max: 35 }, weight: { min: 0.05, max: 0.8 } },
  { name: '蛇鮈', size: { min: 8, max: 20 }, weight: { min: 0.01, max: 0.12 } },
  { name: '银鮈', size: { min: 6, max: 18 }, weight: { min: 0.005, max: 0.08 } },
  { name: '似鳊', size: { min: 15, max: 35 }, weight: { min: 0.1, max: 0.8 } },
  { name: '圆吻鲴', size: { min: 15, max: 40 }, weight: { min: 0.15, max: 1.5 } },
  { name: '中华鳑鲏', size: { min: 4, max: 9 }, weight: { min: 0.002, max: 0.02 } },
  { name: '中华花鳅', size: { min: 6, max: 15 }, weight: { min: 0.005, max: 0.04 } },
  { name: '中华斗鱼', size: { min: 4, max: 8 }, weight: { min: 0.002, max: 0.015 } },
  { name: '食蚊鱼', size: { min: 2, max: 7 }, weight: { min: 0.001, max: 0.01 } },
  { name: '孔雀鱼', size: { min: 2, max: 6 }, weight: { min: 0.001, max: 0.008 } },
  { name: '斑马鱼', size: { min: 3, max: 5 }, weight: { min: 0.001, max: 0.005 } },
  { name: '高体鳑鲏', size: { min: 5, max: 10 }, weight: { min: 0.003, max: 0.025 } },
  { name: '棒花鮈', size: { min: 6, max: 16 }, weight: { min: 0.005, max: 0.05 } },
  { name: '黄鲫', size: { min: 8, max: 20 }, weight: { min: 0.02, max: 0.15 } },
  { name: '梅童鱼', size: { min: 10, max: 25 }, weight: { min: 0.03, max: 0.3 } },
  { name: '龙头鱼', size: { min: 15, max: 40 }, weight: { min: 0.05, max: 0.5 } },
  { name: '玉筋鱼', size: { min: 10, max: 25 }, weight: { min: 0.01, max: 0.08 } },
  { name: '毛鳞鱼', size: { min: 12, max: 25 }, weight: { min: 0.02, max: 0.1 } },
  { name: '蓝圆鲹', size: { min: 15, max: 35 }, weight: { min: 0.08, max: 0.6 } },
  { name: '竹荚鱼', size: { min: 18, max: 40 }, weight: { min: 0.1, max: 0.8 } },
  { name: '金线鱼', size: { min: 15, max: 35 }, weight: { min: 0.08, max: 0.6 } },
  { name: '黄姑鱼', size: { min: 20, max: 50 }, weight: { min: 0.2, max: 2 } },
  { name: '斑鰶', size: { min: 12, max: 28 }, weight: { min: 0.05, max: 0.4 } },
  { name: '褐篮子鱼', size: { min: 15, max: 35 }, weight: { min: 0.1, max: 0.8 } },
  { name: '鲬鱼', size: { min: 15, max: 40 }, weight: { min: 0.08, max: 0.7 } },
  { name: '黄鳍鲷', size: { min: 15, max: 45 }, weight: { min: 0.15, max: 2 } },
  { name: '斑马石鲷', size: { min: 15, max: 35 }, weight: { min: 0.1, max: 1 } },
  { name: '日本鳀', size: { min: 8, max: 15 }, weight: { min: 0.005, max: 0.03 } },
  { name: '鳀鱼', size: { min: 8, max: 20 }, weight: { min: 0.005, max: 0.05 } }
];

export const uncommonFish = [
  { name: '河鲈', size: { min: 15, max: 55 }, weight: { min: 0.1, max: 3 } },
  { name: '鲈鱼', size: { min: 25, max: 80 }, weight: { min: 0.5, max: 8 } },
  { name: '鳜鱼', size: { min: 25, max: 75 }, weight: { min: 0.5, max: 8 } },
  { name: '青鱼', size: { min: 60, max: 170 }, weight: { min: 5, max: 80 } },
  { name: '鲶鱼', size: { min: 40, max: 160 }, weight: { min: 1, max: 45 } },
  { name: '黑鱼', size: { min: 30, max: 100 }, weight: { min: 0.5, max: 10 } },
  { name: '翘嘴', size: { min: 35, max: 100 }, weight: { min: 0.5, max: 15 } },
  { name: '大黄鱼', size: { min: 30, max: 80 }, weight: { min: 0.6, max: 8 } },
  { name: '银鲳', size: { min: 20, max: 60 }, weight: { min: 0.3, max: 4 } },
  { name: '海鲈鱼', size: { min: 40, max: 110 }, weight: { min: 1, max: 12 } },
  { name: '真鲷', size: { min: 25, max: 100 }, weight: { min: 0.5, max: 10 } },
  { name: '牙鲆', size: { min: 30, max: 100 }, weight: { min: 0.8, max: 12 } },
  { name: '星鲽', size: { min: 25, max: 70 }, weight: { min: 0.4, max: 5 } },
  { name: '大西洋鳕', size: { min: 40, max: 140 }, weight: { min: 1, max: 35 } },
  { name: '狗鱼', size: { min: 40, max: 130 }, weight: { min: 1, max: 25 } },
  { name: '梭鱼', size: { min: 35, max: 100 }, weight: { min: 0.8, max: 10 } },
  { name: '军曹鱼', size: { min: 60, max: 160 }, weight: { min: 3, max: 45 } },
  { name: '红鼓鱼', size: { min: 40, max: 130 }, weight: { min: 1, max: 30 } },
  { name: '斑点叉尾鮰', size: { min: 30, max: 100 }, weight: { min: 0.8, max: 15 } },
  { name: '鳡鱼', size: { min: 50, max: 150 }, weight: { min: 2, max: 40 } },
  { name: '鳤鱼', size: { min: 40, max: 110 }, weight: { min: 1, max: 15 } },
  { name: '圆口铜鱼', size: { min: 25, max: 70 }, weight: { min: 0.4, max: 5 } },
  { name: '鲥鱼', size: { min: 30, max: 60 }, weight: { min: 0.5, max: 4 } },
  { name: '刀鲚', size: { min: 18, max: 40 }, weight: { min: 0.05, max: 0.5 } },
  { name: '松江鲈', size: { min: 12, max: 25 }, weight: { min: 0.04, max: 0.3 } },
  { name: '星点东方鲀', size: { min: 20, max: 45 }, weight: { min: 0.2, max: 2 } },
  { name: '虹鳟', size: { min: 30, max: 80 }, weight: { min: 0.5, max: 8 } },
  { name: '欧洲鳗鲡', size: { min: 40, max: 120 }, weight: { min: 0.5, max: 6 } },
  { name: '鲣鱼', size: { min: 40, max: 110 }, weight: { min: 2, max: 25 } },
  { name: '马鲛鱼', size: { min: 50, max: 150 }, weight: { min: 2, max: 45 } },
  { name: '乌鳢', size: { min: 30, max: 100 }, weight: { min: 0.5, max: 10 } },
  { name: '月鳢', size: { min: 20, max: 60 }, weight: { min: 0.3, max: 4 } },
  { name: '鲮鲤', size: { min: 25, max: 70 }, weight: { min: 0.5, max: 5 } },
  { name: '江鳕', size: { min: 30, max: 100 }, weight: { min: 0.5, max: 10 } },
  { name: '哲罗鲑', size: { min: 60, max: 150 }, weight: { min: 5, max: 60 } },
  { name: '细鳞鲑', size: { min: 30, max: 80 }, weight: { min: 0.8, max: 8 } },
  { name: '大口黑鲈', size: { min: 25, max: 75 }, weight: { min: 0.5, max: 10 } },
  { name: '小口黑鲈', size: { min: 25, max: 65 }, weight: { min: 0.5, max: 6 } },
  { name: '黄鳍棘鲷', size: { min: 25, max: 70 }, weight: { min: 0.5, max: 6 } },
  { name: '黑鲷', size: { min: 25, max: 70 }, weight: { min: 0.5, max: 6 } },
  { name: '条石鲷', size: { min: 30, max: 80 }, weight: { min: 1, max: 8 } },
  { name: '黄尾鰤', size: { min: 40, max: 120 }, weight: { min: 2, max: 40 } },
  { name: '平鲉', size: { min: 25, max: 70 }, weight: { min: 0.5, max: 5 } },
  { name: '许氏平鲉', size: { min: 25, max: 65 }, weight: { min: 0.5, max: 5 } },
  { name: '红笛鲷', size: { min: 30, max: 90 }, weight: { min: 1, max: 12 } }
];

export const rareFish = [
  { name: '金龙鱼', size: { min: 45, max: 90 }, weight: { min: 2, max: 8 } },
  { name: '银龙鱼', size: { min: 50, max: 100 }, weight: { min: 2, max: 7 } },
  { name: '中华鲟', size: { min: 100, max: 300 }, weight: { min: 30, max: 300 } },
  { name: '胭脂鱼', size: { min: 30, max: 100 }, weight: { min: 0.8, max: 10 } },
  { name: '石斑鱼', size: { min: 40, max: 150 }, weight: { min: 2, max: 60 } },
  { name: '黄鳍金枪鱼', size: { min: 80, max: 240 }, weight: { min: 15, max: 200 } },
  { name: '长鳍金枪鱼', size: { min: 60, max: 140 }, weight: { min: 5, max: 40 } },
  { name: '鲯鳅', size: { min: 70, max: 180 }, weight: { min: 5, max: 40 } },
  { name: '狼鳗', size: { min: 80, max: 240 }, weight: { min: 5, max: 25 } },
  { name: '匙吻鲟', size: { min: 100, max: 220 }, weight: { min: 10, max: 90 } },
  { name: '巨暹罗鲤', size: { min: 80, max: 200 }, weight: { min: 20, max: 150 } },
  { name: '裸盖鱼', size: { min: 60, max: 120 }, weight: { min: 5, max: 40 } },
  { name: '六须鲶鱼', size: { min: 80, max: 250 }, weight: { min: 20, max: 160 } },
  { name: '大西洋鲑', size: { min: 60, max: 150 }, weight: { min: 3, max: 45 } },
  { name: '雀鳝', size: { min: 60, max: 200 }, weight: { min: 5, max: 80 } },
  { name: '白鲟', size: { min: 150, max: 500 }, weight: { min: 50, max: 500 } },
  { name: '长江鲟', size: { min: 80, max: 250 }, weight: { min: 10, max: 120 } },
  { name: '达氏鳇', size: { min: 150, max: 400 }, weight: { min: 50, max: 500 } },
  { name: '大头鳕', size: { min: 60, max: 180 }, weight: { min: 5, max: 80 } },
  { name: '雪斑裸胸鳝', size: { min: 80, max: 180 }, weight: { min: 5, max: 30 } },
  { name: '巨型海鲈', size: { min: 100, max: 250 }, weight: { min: 40, max: 250 } },
  { name: '南方蓝鳍金枪鱼', size: { min: 120, max: 250 }, weight: { min: 50, max: 260 } },
  { name: '欧鲇', size: { min: 100, max: 300 }, weight: { min: 20, max: 200 } },
  { name: '鳄雀鳝', size: { min: 100, max: 300 }, weight: { min: 20, max: 150 } },
  { name: '白斑狗鱼', size: { min: 70, max: 180 }, weight: { min: 5, max: 30 } }
];

export const epicFish = [
  { name: '帝王鲑', size: { min: 80, max: 160 }, weight: { min: 10, max: 60 } },
  { name: '剑鱼', size: { min: 180, max: 450 }, weight: { min: 50, max: 650 } },
  { name: '旗鱼', size: { min: 180, max: 350 }, weight: { min: 40, max: 120 } },
  { name: '蓝鳍金枪鱼', size: { min: 180, max: 450 }, weight: { min: 100, max: 680 } },
  { name: '姥鲨', size: { min: 500, max: 1000 }, weight: { min: 1000, max: 6000 } },
  { name: '锤头鲨', size: { min: 250, max: 600 }, weight: { min: 80, max: 450 } },
  { name: '虎鲨', size: { min: 300, max: 550 }, weight: { min: 200, max: 900 } },
  { name: '巨型石斑鱼', size: { min: 150, max: 270 }, weight: { min: 80, max: 400 } },
  { name: '苏眉鱼', size: { min: 100, max: 230 }, weight: { min: 30, max: 190 } },
  { name: '尼罗河鲈', size: { min: 120, max: 200 }, weight: { min: 40, max: 200 } },
  { name: '湄公河巨鲤', size: { min: 120, max: 250 }, weight: { min: 50, max: 300 } },
  { name: '太平洋大比目鱼', size: { min: 120, max: 260 }, weight: { min: 30, max: 250 } },
  { name: '狗牙金枪鱼', size: { min: 100, max: 230 }, weight: { min: 30, max: 130 } },
  { name: '大西洋蓝枪鱼', size: { min: 200, max: 500 }, weight: { min: 100, max: 800 } },
  { name: '淡水巨魟', size: { min: 180, max: 430 }, weight: { min: 100, max: 600 } },
  { name: '大西洋庸鲽', size: { min: 120, max: 300 }, weight: { min: 50, max: 320 } },
  { name: '巨型黄貂鱼', size: { min: 160, max: 400 }, weight: { min: 80, max: 350 } },
  { name: '大西洋鲟', size: { min: 150, max: 430 }, weight: { min: 80, max: 370 } },
  { name: '短尾真鲨', size: { min: 180, max: 400 }, weight: { min: 80, max: 500 } },
  { name: '澳洲肺鱼', size: { min: 80, max: 180 }, weight: { min: 10, max: 45 } }
];

export const legendaryFish = [
  // 原版传说鱼：保留你之前配置过专属出场文本的全部鱼种。
  { name: '美人鱼', size: { min: 150, max: 180 }, weight: { min: 45, max: 65 } },
  { name: '龙宫使者', size: { min: 200, max: 350 }, weight: { min: 100, max: 300 } },
  { name: '深海霸主', size: { min: 300, max: 500 }, weight: { min: 200, max: 600 } },
  { name: '远古巨鲨', size: { min: 400, max: 800 }, weight: { min: 500, max: 2000 } },
  { name: '神龙', size: { min: 500, max: 1000 }, weight: { min: 800, max: 3000 } },
  { name: '鲲', size: { min: 1000, max: 9999 }, weight: { min: 5000, max: 50000 } },
  { name: '凤凰鱼', size: { min: 180, max: 300 }, weight: { min: 80, max: 250 } },
  { name: '麒麟鱼', size: { min: 200, max: 350 }, weight: { min: 100, max: 300 } },
  { name: '巨型乌贼', size: { min: 800, max: 1500 }, weight: { min: 2000, max: 8000 } },
  { name: '巨齿鲨', size: { min: 1000, max: 1800 }, weight: { min: 5000, max: 15000 } },
  { name: '海皇波塞冬', size: { min: 2000, max: 5000 }, weight: { min: 10000, max: 50000 } },
  { name: '利维坦', size: { min: 3000, max: 8000 }, weight: { min: 20000, max: 100000 } },
  { name: '哥斯拉...？', size: { min: 3000, max: 11978 }, weight: { min: 200000, max: 1000000 } },

  // 新增现实传说鱼：数量少于 epic，保持 legendary 稀有感。
  { name: '欧洲鳇', size: { min: 300, max: 700 }, weight: { min: 300, max: 1500 } },
  { name: '湄公河巨鲶', size: { min: 180, max: 300 }, weight: { min: 100, max: 300 } },
  { name: '巨骨舌鱼', size: { min: 180, max: 300 }, weight: { min: 80, max: 200 } },
  { name: '皇带鱼', size: { min: 300, max: 800 }, weight: { min: 50, max: 270 } },
  { name: '翻车鱼', size: { min: 180, max: 330 }, weight: { min: 300, max: 2300 } },
  { name: '格陵兰鲨', size: { min: 300, max: 700 }, weight: { min: 400, max: 1200 } },
  { name: '大白鲨', size: { min: 450, max: 650 }, weight: { min: 900, max: 2200 } },
  { name: '鲸鲨', size: { min: 600, max: 1200 }, weight: { min: 3000, max: 19000 } },

  // 程序员梗传说鱼：编码污染与调试填充值合体，保持 legendary 稀有感。
  { name: '锟斤拷烫烫鱼', size: { min: 256, max: 1024 }, weight: { min: 404, max: 4096 } }
];

// 彩蛋鱼类 - 稀有度文本为 “？”，高于 legendary。每人最多亲自钓到一次。
// 增删彩蛋鱼只改这个数组，整体出现率仍由 rarityWeights['？'] 控制。
export const mysteryFish = [
  { name: '愿望锦鲤', size: { min: 88, max: 188 }, weight: { min: 8.88, max: 18.88 } },
  { name: '月光玻璃鱼', size: { min: 12, max: 28 }, weight: { min: 0.02, max: 0.18 } },
  { name: '星尘飞鱼', size: { min: 20, max: 45 }, weight: { min: 0.2, max: 1.2 } },
  { name: '时间沙漏鱼', size: { min: 30, max: 60 }, weight: { min: 0.8, max: 3.6 } },
  { name: '反方向的鱼', size: { min: 18, max: 50 }, weight: { min: 0.3, max: 2.4 } },
  { name: '不存在的鱼', size: { min: 1, max: 999 }, weight: { min: 0.01, max: 99.99 } },
  { name: '空指针鲤', size: { min: 0, max: 1 }, weight: { min: 0, max: 0.01 } }
];

export const fishTypes = {
  common: commonFish,
  uncommon: uncommonFish,
  rare: rareFish,
  epic: epicFish,
  legendary: legendaryFish,
  '？': mysteryFish
};

export const fishRarityByName = Object.fromEntries(
  Object.entries(fishTypes).flatMap(([rarity, list]) =>
    (list || []).map(fish => [fish.name, rarity])
  )
);

export const fishTemplateByName = Object.fromEntries(
  Object.values(fishTypes).flatMap(list =>
    (list || []).map(fish => [fish.name, fish])
  )
);

export const legacyFishAliases = {
  鲴鱼: '银鲴',
  鲂鱼: '鳊鱼',
  鲅鱼: '马鲛鱼',
  船丁鱼: '棒花鱼',
  溪石斑: '石斑鱼',
  花鳅: '泥鳅',
  银鱼: '凤尾鱼',
  长麦穗鱼: '麦穗鱼',
  鲳鱼: '银鲳',
  鲷鱼: '真鲷',
  比目鱼: '牙鲆',
  鲽鱼: '星鲽',
  鳕鱼: '大西洋鳕',
  鳗鱼: '欧洲鳗鲡',
  金枪鱼: '黄鳍金枪鱼',
  巨型魟鱼: '淡水巨魟',
  巨型鲶王: '六须鲶鱼'
};

// 这里是“钓到鱼之后”的稀有度分布，总和建议保持为 1。
// legendary: 0.006 = 0.6%，'？': 0.001 = 0.1%。
export const rarityWeights = {
  common: 0.604,
  uncommon: 0.25,
  rare: 0.1,
  epic: 0.039,
  legendary: 0.006,
  '？': 0.001
};

export const trashItems = [
  '破鞋', '塑料袋', '易拉罐', '海藻', '木头',
  '轮胎', '破渔网', '生锈的铁钩', '烂木板',
  '废弃的手机', '破雨伞', '旧报纸', '空瓶子', '破衣服'
];

export const randomEvents = [
  '鱼切线了，可恶，一定是巨物！',
  '鱼饵被偷走了，不是，怎么这么没树枝？',
  '钓竿折断了！',
  '你不小心滑倒了，摔进了水里！',
  '一只水鸟叼走了你的鱼饵！',
  '鱼钩被水草缠住了！',
  '你打了个瞌睡，鱼跑了！',
  '突然下起了大雨，你只好收竿！',
  '一条大鱼咬钩了，但挣脱逃走了！',
  '你的鱼漂被水流冲走了！',
  '鱼钩挂在底部...你只好剪断了鱼线',
  '一只螃蟹夹住了你的手指！',
  '你被蚊子咬得受不了，只好撤退！',
  '鱼饵还没入水就被岸边的猫叼走了！',
  '你的影子吓跑了所有的鱼！',
  '一阵海浪打湿了你的衣服！',
  '一只海鸥在你头上拉了一坨！'
];

export const lostItemEvents = [
  { itemName: '手机', message: '钓鱼的时候手机掉水里了！' },
  { itemName: '钱包', message: '你的钱包不小心掉进水里了！' },
  { itemName: '钥匙', message: '糟糕！你的钥匙掉进水里了！' },
  { itemName: '手表', message: '你的手表滑落掉进了水里！' },
  { itemName: '太阳镜', message: '一阵风吹走了你的太阳镜，它掉进了水里！' },
  { itemName: '帽子', message: '你的帽子被风吹进水里了！' },
  { itemName: '鱼竿', message: '你的鱼竿脱手掉进水里了！' },
  { itemName: '水杯', message: '刚打算喝水，你的水杯就滚进了水里！' },
  { itemName: '雨伞', message: '一阵大风吹走了你的雨伞！' }
];

export function generateFish(rarity) {
  const fishList = fishTypes[rarity];
  const fishData = fishList[Math.floor(Math.random() * fishList.length)];
  const length = getRandomNumber(fishData.size.min, fishData.size.max, 1);
  const weight = getRandomNumber(fishData.weight.min, fishData.weight.max, 2);
  return {
    name: fishData.name,
    rarity,
    length,
    weight
  };
}

function getRandomNumber(min, max, decimals = 0) {
  const number = Math.random() * (max - min) + min;
  return Number(number.toFixed(decimals));
}
