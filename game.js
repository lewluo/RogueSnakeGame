const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 600;

const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE;

let game = {
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: {},
    score: 0,
    floor: 1,
    lives: 3,
    speed: 150,
    gameRunning: false,
    isPaused: false,
    abilities: [],
    powerUps: [],
    obstacles: [],
    portals: [],
    enemySnakes: [],
    coins: [],
    experience: 0,
    level: 1,
    upgradePoints: 0
};

const ABILITIES = {
    SPEED_BOOST: {
        id: 'speed_boost',
        name: '极速冲刺',
        icon: '⚡',
        description: '移动速度提升50%',
        rarity: 'common',
        effect: () => game.speed *= 0.5
    },
    PHASE_SHIFT: {
        id: 'phase_shift',
        name: '相位穿梭',
        icon: '👻',
        description: '可以穿过墙壁3次',
        rarity: 'rare',
        uses: 3,
        effect: () => game.phaseShift = true
    },
    DOUBLE_POINTS: {
        id: 'double_points',
        name: '积分爆炸',
        icon: '💎',
        description: '获得的分数x3',
        rarity: 'rare',
        effect: () => game.scoreMultiplier = (game.scoreMultiplier || 1) * 3
    },
    SHIELD: {
        id: 'shield',
        name: '护盾',
        icon: '🛡️',
        description: '免疫一次撞击',
        rarity: 'epic',
        uses: 1,
        effect: () => game.hasShield = true
    },
    TIME_SLOW: {
        id: 'time_slow',
        name: '子弹时间',
        icon: '⏱️',
        description: '游戏速度减慢50%',
        rarity: 'common',
        effect: () => game.speed *= 2
    },
    MAGNET: {
        id: 'magnet',
        name: '磁铁',
        icon: '🧲',
        description: '自动吸引附近的食物',
        rarity: 'epic',
        effect: () => game.hasMagnet = true
    },
    FREEZE: {
        id: 'freeze',
        name: '冰冻',
        icon: '❄️',
        description: '冻结敌对蛇3秒',
        rarity: 'rare',
        cooldown: 10,
        effect: () => freezeEnemies()
    },
    EXPLOSIVE_GROWTH: {
        id: 'explosive_growth',
        name: '巨型增长',
        icon: '💥',
        description: '吃食物时额外增长5格',
        rarity: 'epic',
        effect: () => game.extraGrowth = 5
    },
    PORTAL_MASTER: {
        id: 'portal_master',
        name: '传送门大师',
        icon: '🌀',
        description: '创建传送门对',
        rarity: 'legendary',
        effect: () => game.canCreatePortals = true
    },
    INVINCIBLE: {
        id: 'invincible',
        name: '不灭之躯',
        icon: '✨',
        description: '10秒无敌时间',
        rarity: 'legendary',
        cooldown: 20,
        effect: () => activateInvincibility()
    },
    MEGA_MAGNET: {
        id: 'mega_magnet',
        name: '超级磁场',
        icon: '🧲',
        description: '全屏吸引所有食物和金币',
        rarity: 'epic',
        effect: () => game.hasSuperMagnet = true
    },
    VAMPIRE: {
        id: 'vampire',
        name: '吸血鬼',
        icon: '🧛',
        description: '撞墙和障碍物变成食物',
        rarity: 'legendary',
        effect: () => game.isVampire = true
    },
    MULTI_SHOT: {
        id: 'multi_shot',
        name: '多重分身',
        icon: '👥',
        description: '每次吃食物增加2个分身',
        rarity: 'legendary',
        effect: () => game.multiShot = true
    }
};

const FOOD_TYPES = {
    NORMAL: { color: '#10b981', points: 20, icon: '🍎' },
    GOLDEN: { color: '#fbbf24', points: 100, icon: '🌟' },
    POWER: { color: '#a78bfa', points: 60, icon: '💜' },
    LIFE: { color: '#ef4444', points: 40, icon: '❤️' },
    SHRINK: { color: '#60a5fa', points: 30, icon: '💙' }
};

function initGame() {
    console.log('Init: Setting initial snake...');
    game.snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    game.direction = { x: 1, y: 0 };
    game.nextDirection = { x: 1, y: 0 };
    game.score = 0;
    game.floor = 1;
    game.lives = 3;
    game.speed = 80;  // 更快的基础速度
    game.abilities = [];
    game.powerUps = [];
    game.obstacles = [];
    game.portals = [];
    game.enemySnakes = [];
    game.coins = [];
    game.scoreMultiplier = 1;
    game.phaseShift = false;
    game.phaseShiftUses = 0;
    game.hasShield = false;
    game.invincible = false;
    game.hasMagnet = false;
    game.extraGrowth = 0;
    game.canCreatePortals = false;
    game.enemiesFrozen = false;
    
    console.log('Init: Generating level...');
    try {
        generateLevel();
    } catch(e) {
        console.error('Error in generateLevel:', e);
    }
    
    console.log('Init: Spawning food...');
    try {
        spawnFood();
    } catch(e) {
        console.error('Error in spawnFood:', e);
    }
    
    console.log('Init: Updating UI...');
    try {
        updateUI();
    } catch(e) {
        console.error('Error in updateUI:', e);
    }
    
    console.log('Init: Complete');
}

function generateLevel() {
    game.obstacles = [];
    game.portals = [];
    game.enemySnakes = [];
    game.coins = [];
    
    const obstacleCount = Math.min(game.floor * 2, 15);
    for (let i = 0; i < obstacleCount; i++) {
        let obstacle;
        let attempts = 0;
        const maxAttempts = 100;
        do {
            obstacle = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            };
            attempts++;
            if (attempts > maxAttempts) {
                console.warn('Could not place obstacle after', maxAttempts, 'attempts');
                break;
            }
        } while (isOccupied(obstacle.x, obstacle.y));
        if (attempts <= maxAttempts) {
            game.obstacles.push(obstacle);
        }
    }
    
    if (game.floor % 3 === 0) {
        generatePortalPair();
    }
    
    if (game.floor > 5) {
        const enemyCount = Math.min(Math.floor(game.floor / 5), 3);
        for (let i = 0; i < enemyCount; i++) {
            generateEnemySnake();
        }
    }
    
    const coinCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < coinCount; i++) {
        let coin;
        let attempts = 0;
        const maxAttempts = 100;
        do {
            coin = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
                value: 10 * game.floor  // 金币价值翻倍
            };
            attempts++;
            if (attempts > maxAttempts) {
                console.warn('Could not place coin after', maxAttempts, 'attempts');
                break;
            }
        } while (isOccupied(coin.x, coin.y));
        if (attempts <= maxAttempts) {
            game.coins.push(coin);
        }
    }
}

function generatePortalPair() {
    let portal1, portal2;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        portal1 = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            pair: null
        };
        attempts++;
        if (attempts > maxAttempts) return;
    } while (isOccupied(portal1.x, portal1.y));
    
    attempts = 0;
    do {
        portal2 = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            pair: portal1
        };
        attempts++;
        if (attempts > maxAttempts) return;
    } while (isOccupied(portal2.x, portal2.y));
    
    portal1.pair = portal2;
    game.portals.push(portal1, portal2);
}

function generateEnemySnake() {
    let head;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        head = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        attempts++;
        if (attempts > maxAttempts) return;
    } while (isOccupied(head.x, head.y));
    
    const enemy = {
        body: [head],
        direction: { x: 1, y: 0 },
        color: '#ef4444',
        speed: 0
    };
    
    game.enemySnakes.push(enemy);
}

function isOccupied(x, y) {
    // 检查蛇身
    if (game.snake && game.snake.some(segment => segment.x === x && segment.y === y)) return true;
    // 检查障碍物
    if (game.obstacles && game.obstacles.some(obs => obs.x === x && obs.y === y)) return true;
    // 检查食物（只有在食物存在时）
    if (game.food && game.food.x === x && game.food.y === y) return true;
    // 检查传送门
    if (game.portals && game.portals.some(portal => portal.x === x && portal.y === y)) return true;
    // 检查硬币
    if (game.coins && game.coins.some(coin => coin.x === x && coin.y === y)) return true;
    return false;
}

function spawnFood() {
    const foodTypes = Object.keys(FOOD_TYPES);
    const weights = [70, 10, 10, 5, 5];
    const randomValue = Math.random() * 100;
    let accumulator = 0;
    let selectedType = 'NORMAL';
    
    for (let i = 0; i < weights.length; i++) {
        accumulator += weights[i];
        if (randomValue < accumulator) {
            selectedType = foodTypes[i];
            break;
        }
    }
    
    let attempts = 0;
    const maxAttempts = 100;
    do {
        game.food = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
            type: selectedType
        };
        attempts++;
        if (attempts > maxAttempts) {
            console.error('Could not place food!');
            // 强制放置在一个空位置
            game.food = { x: 15, y: 15, type: selectedType };
            break;
        }
    } while (isOccupied(game.food.x, game.food.y));
}

function moveSnake() {
    if (!game.gameRunning || game.isPaused) return;
    
    game.direction = { ...game.nextDirection };
    
    const head = { ...game.snake[0] };
    head.x += game.direction.x;
    head.y += game.direction.y;
    
    if (game.phaseShift && game.phaseShiftUses > 0) {
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            game.phaseShiftUses--;
            head.x = (head.x + GRID_SIZE) % GRID_SIZE;
            head.y = (head.y + GRID_SIZE) % GRID_SIZE;
        }
    } else {
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;
    }
    
    const portal = game.portals.find(p => p.x === head.x && p.y === head.y);
    if (portal && portal.pair) {
        head.x = portal.pair.x + game.direction.x;
        head.y = portal.pair.y + game.direction.y;
        createPortalEffect();
    }
    
    if (checkCollision(head)) {
        if (game.hasShield) {
            game.hasShield = false;
            showNotification('护盾已使用！');
        } else if (!game.invincible) {
            handleDeath();
            return;
        }
    }
    
    game.snake.unshift(head);
    
    const coin = game.coins.find(c => c.x === head.x && c.y === head.y);
    if (coin) {
        game.score += coin.value * (game.scoreMultiplier || 1);
        game.coins = game.coins.filter(c => c !== coin);
        createCoinEffect();
    }
    
    if (head.x === game.food.x && head.y === game.food.y) {
        const foodData = FOOD_TYPES[game.food.type];
        game.score += foodData.points * (game.scoreMultiplier || 1);
        
        if (game.food.type === 'LIFE' && game.lives < 5) {
            game.lives++;
        } else if (game.food.type === 'SHRINK' && game.snake.length > 3) {
            game.snake.pop();
            game.snake.pop();
        } else if (game.food.type === 'POWER') {
            triggerRandomPowerUp();
        }
        
        if (game.extraGrowth) {
            for (let i = 0; i < game.extraGrowth; i++) {
                game.snake.push({ ...game.snake[game.snake.length - 1] });
            }
        }
        
        spawnFood();
        
        if (game.score >= game.floor * 50) {  // 每50分进入下一层，加快进度
            advanceFloor();
        }
    } else {
        game.snake.pop();
    }
    
    if (game.hasMagnet) {
        applyMagnetEffect();
    }
    
    moveEnemySnakes();
    updateUI();
}

function checkCollision(head) {
    if (game.snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
        return true;
    }
    
    if (game.obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
        return true;
    }
    
    for (let enemy of game.enemySnakes) {
        if (enemy.body.some(segment => segment.x === head.x && segment.y === head.y)) {
            return true;
        }
    }
    
    return false;
}

function moveEnemySnakes() {
    if (game.enemiesFrozen) return;
    
    for (let enemy of game.enemySnakes) {
        enemy.speed++;
        if (enemy.speed < 2) continue;
        enemy.speed = 0;
        
        const directions = [
            { x: 0, y: -1 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 }
        ];
        
        const validDirections = directions.filter(dir => {
            const newX = enemy.body[0].x + dir.x;
            const newY = enemy.body[0].y + dir.y;
            return newX >= 0 && newX < GRID_SIZE && 
                   newY >= 0 && newY < GRID_SIZE &&
                   !game.obstacles.some(obs => obs.x === newX && obs.y === newY);
        });
        
        if (validDirections.length > 0) {
            enemy.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
            const newHead = {
                x: enemy.body[0].x + enemy.direction.x,
                y: enemy.body[0].y + enemy.direction.y
            };
            enemy.body.unshift(newHead);
            if (enemy.body.length > 3) {
                enemy.body.pop();
            }
        }
    }
}

function applyMagnetEffect() {
    const head = game.snake[0];
    const magnetRange = game.hasSuperMagnet ? 20 : 5;  // 超级磁场全屏吸引
    
    // 吸引食物
    if (Math.abs(game.food.x - head.x) <= magnetRange && 
        Math.abs(game.food.y - head.y) <= magnetRange) {
        const dx = head.x - game.food.x;
        const dy = head.y - game.food.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            game.food.x += dx > 0 ? 1 : -1;
        } else {
            game.food.y += dy > 0 ? 1 : -1;
        }
    }
    
    // 吸引金币
    if (game.hasSuperMagnet) {
        game.coins.forEach(coin => {
            if (Math.abs(coin.x - head.x) <= magnetRange && 
                Math.abs(coin.y - head.y) <= magnetRange) {
                const dx = head.x - coin.x;
                const dy = head.y - coin.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    coin.x += dx > 0 ? 1 : -1;
                } else {
                    coin.y += dy > 0 ? 1 : -1;
                }
            }
        });
    }
}

function triggerRandomPowerUp() {
    const powerUps = ['SPEED', 'SLOW', 'INVINCIBLE', 'DOUBLE', 'MEGA_GROW'];
    const selected = powerUps[Math.floor(Math.random() * powerUps.length)];
    
    switch(selected) {
        case 'SPEED':
            game.speed *= 0.5;  // 更强的加速
            setTimeout(() => game.speed /= 0.5, 8000);
            showNotification('极速飞行！');
            break;
        case 'SLOW':
            game.speed *= 2;  // 更强的减速
            setTimeout(() => game.speed /= 2, 8000);
            showNotification('子弹时间！');
            break;
        case 'INVINCIBLE':
            activateInvincibility();
            break;
        case 'DOUBLE':
            const temp = game.scoreMultiplier || 1;
            game.scoreMultiplier = temp * 5;  // 5倍积分
            setTimeout(() => game.scoreMultiplier = temp, 15000);
            showNotification('5倍积分！');
            break;
        case 'MEGA_GROW':
            for(let i = 0; i < 10; i++) {
                game.snake.push({...game.snake[game.snake.length - 1]});
            }
            showNotification('巨型生长 +10！');
            break;
    }
}

function activateInvincibility() {
    game.invincible = true;
    showNotification('不灭之躯启动！');
    setTimeout(() => {
        game.invincible = false;
        showNotification('无敌结束');
    }, 10000);  // 10秒无敌
}

function freezeEnemies() {
    game.enemiesFrozen = true;
    showNotification('敌人被冻结！');
    setTimeout(() => {
        game.enemiesFrozen = false;
        showNotification('冻结结束');
    }, 3000);
}

function handleDeath() {
    game.lives--;
    updateUI();
    
    if (game.lives <= 0) {
        gameOver();
    } else {
        showNotification(`剩余生命: ${game.lives}`);
        game.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        game.direction = { x: 1, y: 0 };
        game.nextDirection = { x: 1, y: 0 };
    }
}

function advanceFloor() {
    game.floor++;
    game.speed = Math.max(30, game.speed - 10);  // 每层速度提升更多
    game.lives = Math.min(game.lives + 1, 5);  // 每层恢复1条生命
    showUpgradeModal();
    generateLevel();
    showNotification(`进入第 ${game.floor} 层！生命+1`);
}

function showUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    const optionsDiv = document.getElementById('upgrade-options');
    optionsDiv.innerHTML = '';
    
    const availableAbilities = Object.values(ABILITIES).filter(
        ability => !game.abilities.some(a => a.id === ability.id)
    );
    
    // 提供更多选择，每次给5个选项
    const upgrades = [];
    for (let i = 0; i < 5 && availableAbilities.length > 0; i++) {
        const index = Math.floor(Math.random() * availableAbilities.length);
        upgrades.push(availableAbilities[index]);
        availableAbilities.splice(index, 1);
    }
    
    upgrades.forEach(upgrade => {
        const card = document.createElement('div');
        card.className = `upgrade-card rarity-${upgrade.rarity}`;
        card.innerHTML = `
            <h3>${upgrade.icon} ${upgrade.name}</h3>
            <p>${upgrade.description}</p>
        `;
        card.onclick = () => selectUpgrade(upgrade);
        optionsDiv.appendChild(card);
    });
    
    modal.style.display = 'block';
    game.isPaused = true;
}

function selectUpgrade(ability) {
    game.abilities.push(ability);
    ability.effect();
    updateAbilitiesPanel();
    document.getElementById('upgradeModal').style.display = 'none';
    game.isPaused = false;
}

function updateAbilitiesPanel() {
    const listDiv = document.getElementById('abilities-list');
    listDiv.innerHTML = '';
    
    game.abilities.forEach(ability => {
        const item = document.createElement('div');
        item.className = 'ability-item';
        item.innerHTML = `
            <span class="ability-icon">${ability.icon}</span>
            <span>${ability.name}</span>
        `;
        listDiv.appendChild(item);
    });
}

function gameOver() {
    game.gameRunning = false;
    document.getElementById('finalFloor').textContent = game.floor;
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('collectedAbilities').textContent = game.abilities.length;
    document.getElementById('gameOverModal').style.display = 'block';
}

function restartGame() {
    document.getElementById('gameOverModal').style.display = 'none';
    initGame();
    game.gameRunning = true;
    gameLoop();
}

function startGame() {
    console.log('Starting game...');
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }
    console.log('Initializing game...');
    initGame();
    game.gameRunning = true;
    console.log('Starting game loop...');
    gameLoop();
    console.log('Game started successfully');
}

function updateUI() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('floor').textContent = game.floor;
    document.getElementById('length').textContent = game.snake.length;
    document.getElementById('lives').textContent = '♥'.repeat(game.lives);
}

function draw() {
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }
    
    game.obstacles.forEach(obstacle => {
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(obstacle.x * CELL_SIZE + 2, obstacle.y * CELL_SIZE + 2, 
                    CELL_SIZE - 4, CELL_SIZE - 4);
    });
    
    game.portals.forEach(portal => {
        ctx.save();
        ctx.translate(portal.x * CELL_SIZE + CELL_SIZE/2, portal.y * CELL_SIZE + CELL_SIZE/2);
        ctx.rotate(Date.now() / 200);
        ctx.fillStyle = '#a78bfa';
        ctx.fillRect(-CELL_SIZE/2 + 4, -CELL_SIZE/2 + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        ctx.restore();
    });
    
    game.coins.forEach(coin => {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(coin.x * CELL_SIZE + CELL_SIZE/2, coin.y * CELL_SIZE + CELL_SIZE/2, 
               CELL_SIZE/3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    if (game.food) {
        const foodData = FOOD_TYPES[game.food.type];
        ctx.fillStyle = foodData.color;
        ctx.beginPath();
        ctx.arc(game.food.x * CELL_SIZE + CELL_SIZE/2, 
               game.food.y * CELL_SIZE + CELL_SIZE/2, 
               CELL_SIZE/2 - 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    game.enemySnakes.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        enemy.body.forEach(segment => {
            ctx.fillRect(segment.x * CELL_SIZE + 2, segment.y * CELL_SIZE + 2, 
                        CELL_SIZE - 4, CELL_SIZE - 4);
        });
    });
    
    game.snake.forEach((segment, index) => {
        if (game.invincible) {
            ctx.fillStyle = `hsl(${Date.now() / 10 % 360}, 100%, 50%)`;
        } else if (index === 0) {
            ctx.fillStyle = '#10b981';
        } else {
            ctx.fillStyle = '#059669';
        }
        
        ctx.fillRect(segment.x * CELL_SIZE + 2, segment.y * CELL_SIZE + 2, 
                    CELL_SIZE - 4, CELL_SIZE - 4);
        
        if (index === 0) {
            ctx.fillStyle = 'white';
            const eyeSize = 3;
            if (game.direction.x === 1) {
                ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - 8, segment.y * CELL_SIZE + 6, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - 8, segment.y * CELL_SIZE + CELL_SIZE - 9, eyeSize, eyeSize);
            } else if (game.direction.x === -1) {
                ctx.fillRect(segment.x * CELL_SIZE + 5, segment.y * CELL_SIZE + 6, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + 5, segment.y * CELL_SIZE + CELL_SIZE - 9, eyeSize, eyeSize);
            } else if (game.direction.y === -1) {
                ctx.fillRect(segment.x * CELL_SIZE + 6, segment.y * CELL_SIZE + 5, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - 9, segment.y * CELL_SIZE + 5, eyeSize, eyeSize);
            } else {
                ctx.fillRect(segment.x * CELL_SIZE + 6, segment.y * CELL_SIZE + CELL_SIZE - 8, eyeSize, eyeSize);
                ctx.fillRect(segment.x * CELL_SIZE + CELL_SIZE - 9, segment.y * CELL_SIZE + CELL_SIZE - 8, eyeSize, eyeSize);
            }
        }
    });
    
    if (game.hasShield) {
        const head = game.snake[0];
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(head.x * CELL_SIZE + CELL_SIZE/2, head.y * CELL_SIZE + CELL_SIZE/2, 
               CELL_SIZE, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function gameLoop() {
    if (!game.gameRunning) return;
    
    try {
        moveSnake();
        draw();
    } catch (error) {
        console.error('Game loop error:', error);
        console.error('Stack trace:', error.stack);
        game.gameRunning = false;
        return;
    }
    
    setTimeout(() => gameLoop(), game.speed);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: #fbbf24;
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 24px;
        font-weight: bold;
        z-index: 1000;
        animation: fadeInOut 2s ease-in-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 2000);
}

function createPortalEffect() {
    // 简化版本，不创建DOM元素，避免偏移量问题
    // 可以在canvas上绘制效果
}

function createCoinEffect() {
    // 简化版本，不创建DOM元素，避免偏移量问题
    // 可以在canvas上绘制效果
}

document.addEventListener('keydown', (e) => {
    if (!game.gameRunning || game.isPaused) return;
    
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (game.direction.y === 0) {
                game.nextDirection = { x: 0, y: -1 };
            }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (game.direction.y === 0) {
                game.nextDirection = { x: 0, y: 1 };
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (game.direction.x === 0) {
                game.nextDirection = { x: -1, y: 0 };
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (game.direction.x === 0) {
                game.nextDirection = { x: 1, y: 0 };
            }
            break;
        case ' ':
            if (game.abilities.some(a => a.id === 'freeze' && !a.onCooldown)) {
                const ability = game.abilities.find(a => a.id === 'freeze');
                ability.effect();
                ability.onCooldown = true;
                setTimeout(() => ability.onCooldown = false, ability.cooldown * 1000);
            }
            break;
    }
});

// 等待 DOM 加载完成后绑定事件
console.log('Script loaded');

// 直接绑定，不等待DOMContentLoaded
window.addEventListener('load', () => {
    console.log('Window loaded');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    
    console.log('Start button:', startButton);
    console.log('Restart button:', restartButton);
    
    if (startButton) {
        startButton.addEventListener('click', () => {
            console.log('Start button clicked');
            startGame();
        });
        console.log('Start button listener added');
    }
    
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            console.log('Restart button clicked');
            restartGame();
        });
        console.log('Restart button listener added');
    }
});