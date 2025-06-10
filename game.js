// Game Constants
const BOARD_SIZE = 100;
const HIGH_VALUE_PERCENTAGE = 0.1;
const INITIAL_RESOURCES = 10;
const EXPANSION_COST = 2;
const UPGRADE_COST_MULTIPLIER = 4;
const MECH_COST = 80;
const MECH_MAINTENANCE = 3;
const MECH_INITIAL_HEALTH = 100;
const MECH_MOVEMENT_RADIUS = 5;
const MECH_ATTACK_COST = 3;
const MECH_SALVAGE_VALUE = 40; // 增加回收价值，使回收更有价值
const MAX_UPGRADE_LEVEL = 2;

// Game State
let gameBoard = [];
let tribes = [];
let mechs = [];
let gameRunning = false;
let gamePaused = false;
let turnCounter = 0;
let gameSpeed = 5;
let gameInterval;
let historyData = {
    territory: [[], [], [], []],
    resources: [[], [], [], []],
    mechs: [[], [], [], []]
};

// DOM Elements
const gameBoardElement = document.getElementById('game-board');
const startButton = document.getElementById('start-btn');
const pauseButton = document.getElementById('pause-btn');
const continueButton = document.getElementById('continue-btn');
const resetButton = document.getElementById('reset-btn');
const gameSpeedSlider = document.getElementById('game-speed');
const turnCounterElement = document.getElementById('turn-counter');
const logContent = document.getElementById('log-content');

// Charts
let territoryChart;
let resourcesChart;
let mechsChart;

// Initialize the game
function initGame() {
    // Create tribes
    tribes = [
        { id: 0, name: '部落1', color: '#ff5252', territory: 1, resources: INITIAL_RESOURCES, income: 1, expenses: 0 },
        { id: 1, name: '部落2', color: '#2196f3', territory: 1, resources: INITIAL_RESOURCES, income: 1, expenses: 0 },
        { id: 2, name: '部落3', color: '#4caf50', territory: 1, resources: INITIAL_RESOURCES, income: 1, expenses: 0 },
        { id: 3, name: '部落4', color: '#9c27b0', territory: 1, resources: INITIAL_RESOURCES, income: 1, expenses: 0 }
    ];
    
    // Reset mechs
    mechs = [];
    
    // Create game board
    createGameBoard();
    
    // Initialize charts
    initCharts();
    
    // Update UI
    updateUI();
    
    // Reset turn counter
    turnCounter = 0;
    turnCounterElement.textContent = turnCounter;
    
    // Reset history data
    historyData = {
        territory: [[], [], [], []],
        resources: [[], [], [], []],
        mechs: [[], [], [], []]
    };
    
    // Clear log
    logContent.innerHTML = '';
    
    // Add initial log entry
    addLogEntry('游戏初始化完成', -1);
}

// Create the game board
function createGameBoard() {
    gameBoard = [];
    gameBoardElement.innerHTML = '';
    
    // Create empty board
    for (let y = 0; y < BOARD_SIZE; y++) {
        const row = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            row.push({
                x,
                y,
                owner: null,
                highValue: false,
                level: 0
            });
        }
        gameBoard.push(row);
    }
    
    // Set tribe starting positions (corners)
    gameBoard[0][0].owner = 0;
    gameBoard[0][0].highValue = true;
    gameBoard[0][0].level = 2;
    
    gameBoard[0][BOARD_SIZE - 1].owner = 1;
    gameBoard[0][BOARD_SIZE - 1].highValue = true;
    gameBoard[0][BOARD_SIZE - 1].level = 2;
    
    gameBoard[BOARD_SIZE - 1][0].owner = 2;
    gameBoard[BOARD_SIZE - 1][0].highValue = true;
    gameBoard[BOARD_SIZE - 1][0].level = 2;
    
    gameBoard[BOARD_SIZE - 1][BOARD_SIZE - 1].owner = 3;
    gameBoard[BOARD_SIZE - 1][BOARD_SIZE - 1].highValue = true;
    gameBoard[BOARD_SIZE - 1][BOARD_SIZE - 1].level = 2;
    
    // Generate high value cells (random 10%)
    const totalCells = BOARD_SIZE * BOARD_SIZE;
    const highValueCount = Math.floor(totalCells * HIGH_VALUE_PERCENTAGE) - 4; // Subtract the 4 starting positions
    
    let highValueCellsCreated = 0;
    while (highValueCellsCreated < highValueCount) {
        const x = Math.floor(Math.random() * BOARD_SIZE);
        const y = Math.floor(Math.random() * BOARD_SIZE);
        const cell = gameBoard[y][x];
        
        // Skip if already high value or is a starting position
        if (cell.highValue || cell.owner !== null) {
            continue;
        }
        
        cell.highValue = true;
        highValueCellsCreated++;
    }
    
    // Render board
    renderBoard();
}

// Render the game board
function renderBoard() {
    // 每10回合才完全重绘棋盘，其他回合只更新变化的部分
    if (turnCounter % 10 === 0 || turnCounter === 1) {
        // 完全重绘
        gameBoardElement.innerHTML = '';
        
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                const cell = gameBoard[y][x];
                const cellElement = document.createElement('div');
                cellElement.className = 'cell';
                cellElement.dataset.x = x;
                cellElement.dataset.y = y;
                
                if (cell.highValue) {
                    cellElement.classList.add('high-value');
                }
                
                if (cell.owner !== null) {
                    cellElement.classList.add(`tribe-${cell.owner}`);
                    
                    if (cell.level > 1) {
                        const levelElement = document.createElement('span');
                        levelElement.className = 'level';
                        levelElement.textContent = cell.level;
                        cellElement.appendChild(levelElement);
                    }
                }
                
                gameBoardElement.appendChild(cellElement);
            }
        }
    } else {
        // 只更新变化的部分
        // 获取所有单元格元素
        const cellElements = gameBoardElement.querySelectorAll('.cell');
        
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                const cell = gameBoard[y][x];
                const index = y * BOARD_SIZE + x;
                const cellElement = cellElements[index];
                
                // 确保元素存在
                if (!cellElement) continue;
                
                // 更新所有者
                for (let i = 0; i < 4; i++) {
                    cellElement.classList.remove(`tribe-${i}`);
                }
                if (cell.owner !== null) {
                    cellElement.classList.add(`tribe-${cell.owner}`);
                }
                
                // 更新等级
                const levelElement = cellElement.querySelector('.level');
                if (cell.level > 1) {
                    if (levelElement) {
                        levelElement.textContent = cell.level;
                    } else {
                        const newLevelElement = document.createElement('span');
                        newLevelElement.className = 'level';
                        newLevelElement.textContent = cell.level;
                        cellElement.appendChild(newLevelElement);
                    }
                } else if (levelElement) {
                    cellElement.removeChild(levelElement);
                }
            }
        }
    }
    
    // Render mechs
    renderMechs();
}

// Render all mechs
function renderMechs() {
    // 移除现有高达元素
    const existingMechs = document.querySelectorAll('.mech');
    existingMechs.forEach(mech => mech.remove());
    
    // 如果高达数量超过一定阈值，使用更高效的渲染方式
    if (mechs.length > 50) {
        // 创建文档片段，一次性添加所有高达元素
        const fragment = document.createDocumentFragment();
        const cellWidth = gameBoardElement.clientWidth / BOARD_SIZE;
        const cellHeight = gameBoardElement.clientHeight / BOARD_SIZE;
        const mechSize = 16; // 高达元素的尺寸
        
        // 按部落分组高达，减少DOM操作
        const mechsByTribe = [[], [], [], []];
        mechs.forEach(mech => {
            mechsByTribe[mech.owner].push(mech);
        });
        
        // 为每个部落创建高达元素
        for (let tribeId = 0; tribeId < 4; tribeId++) {
            const tribeMechs = mechsByTribe[tribeId];
            
            tribeMechs.forEach(mech => {
                const mechElement = document.createElement('div');
                mechElement.className = `mech tribe-${mech.owner}`;
                mechElement.textContent = mech.health;
                mechElement.style.left = `${mech.x * cellWidth + cellWidth/2 - mechSize/2}px`;
                mechElement.style.top = `${mech.y * cellHeight + cellHeight/2 - mechSize/2}px`;
                fragment.appendChild(mechElement);
            });
        }
        
        gameBoardElement.appendChild(fragment);
    } else {
        // 高达数量较少时使用原来的方式
        const cellWidth = gameBoardElement.clientWidth / BOARD_SIZE;
        const cellHeight = gameBoardElement.clientHeight / BOARD_SIZE;
        const mechSize = 16;
        
        mechs.forEach(mech => {
            const mechElement = document.createElement('div');
            mechElement.className = `mech tribe-${mech.owner}`;
            mechElement.textContent = mech.health;
            mechElement.style.left = `${mech.x * cellWidth + cellWidth/2 - mechSize/2}px`;
            mechElement.style.top = `${mech.y * cellHeight + cellHeight/2 - mechSize/2}px`;
            gameBoardElement.appendChild(mechElement);
        });
    }
}

// Initialize charts using ECharts
function initCharts() {
    // 设置淡色主题
    const lightTheme = {
        backgroundColor: '#ffffff',
        textStyle: {
            color: '#333333'
        },
        title: {
            textStyle: {
                color: '#333333',
                fontWeight: 'normal'
            },
            left: 'center'
        },
        legend: {
            textStyle: {
                color: '#333333'
            },
            top: 25
        },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#ccc',
            textStyle: {
                color: '#333'
            },
            axisPointer: {
                lineStyle: {
                    color: '#aaa'
                }
            }
        },
        grid: {
            left: '5%',
            right: '5%',
            bottom: '10%',
            top: 70,
            containLabel: true
        },
        xAxis: {
            axisLine: {
                lineStyle: {
                    color: '#aaa'
                }
            },
            axisLabel: {
                color: '#333333'
            },
            splitLine: {
                lineStyle: {
                    color: '#eee',
                    type: 'dashed'
                }
            }
        },
        yAxis: {
            axisLine: {
                lineStyle: {
                    color: '#aaa'
                }
            },
            axisLabel: {
                color: '#333333'
            },
            splitLine: {
                lineStyle: {
                    color: '#eee',
                    type: 'dashed'
                }
            }
        }
    };

    // 先销毁已存在的图表实例
    if (territoryChart) {
        territoryChart.dispose();
    }
    if (resourcesChart) {
        resourcesChart.dispose();
    }
    if (mechsChart) {
        mechsChart.dispose();
    }

    // Territory chart
    territoryChart = echarts.init(document.getElementById('territory-chart'));
    territoryChart.setOption({
        ...lightTheme,
        title: { text: '地盘数量' },
        tooltip: { 
            trigger: 'axis',
            formatter: function(params) {
                let result = `回合 ${params[0].name}<br/>`;
                params.forEach(param => {
                    result += `${param.seriesName}: <b>${param.value}</b> 格<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['部落1', '部落2', '部落3', '部落4']
        },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [
            { 
                name: '部落1', 
                type: 'line', 
                data: [], 
                color: '#ff5252',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(255, 82, 82, 0.5)' }
                }
            },
            { 
                name: '部落2', 
                type: 'line', 
                data: [], 
                color: '#2196f3',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(33, 150, 243, 0.5)' }
                }
            },
            { 
                name: '部落3', 
                type: 'line', 
                data: [], 
                color: '#4caf50',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(76, 175, 80, 0.5)' }
                }
            },
            { 
                name: '部落4', 
                type: 'line', 
                data: [], 
                color: '#9c27b0',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(156, 39, 176, 0.5)' }
                }
            }
        ]
    });
    
    // Resources chart
    resourcesChart = echarts.init(document.getElementById('resources-chart'));
    resourcesChart.setOption({
        ...lightTheme,
        title: { text: '资源数量' },
        tooltip: { 
            trigger: 'axis',
            formatter: function(params) {
                let result = `回合 ${params[0].name}<br/>`;
                params.forEach(param => {
                    result += `${param.seriesName}: <b>${param.value.toFixed(1)}</b> 资源<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['部落1', '部落2', '部落3', '部落4']
        },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [
            { 
                name: '部落1', 
                type: 'line', 
                data: [], 
                color: '#ff5252',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(255, 82, 82, 0.5)' }
                }
            },
            { 
                name: '部落2', 
                type: 'line', 
                data: [], 
                color: '#2196f3',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(33, 150, 243, 0.5)' }
                }
            },
            { 
                name: '部落3', 
                type: 'line', 
                data: [], 
                color: '#4caf50',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(76, 175, 80, 0.5)' }
                }
            },
            { 
                name: '部落4', 
                type: 'line', 
                data: [], 
                color: '#9c27b0',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(156, 39, 176, 0.5)' }
                }
            }
        ]
    });
    
    // Mechs chart
    mechsChart = echarts.init(document.getElementById('mechs-chart'));
    mechsChart.setOption({
        ...lightTheme,
        title: { text: '高达数量' },
        tooltip: { 
            trigger: 'axis',
            formatter: function(params) {
                let result = `回合 ${params[0].name}<br/>`;
                params.forEach(param => {
                    result += `${param.seriesName}: <b>${param.value}</b> 台高达<br/>`;
                });
                return result;
            }
        },
        legend: {
            data: ['部落1', '部落2', '部落3', '部落4']
        },
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [
            { 
                name: '部落1', 
                type: 'line', 
                data: [], 
                color: '#ff5252',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(255, 82, 82, 0.5)' }
                }
            },
            { 
                name: '部落2', 
                type: 'line', 
                data: [], 
                color: '#2196f3',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(33, 150, 243, 0.5)' }
                }
            },
            { 
                name: '部落3', 
                type: 'line', 
                data: [], 
                color: '#4caf50',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(76, 175, 80, 0.5)' }
                }
            },
            { 
                name: '部落4', 
                type: 'line', 
                data: [], 
                color: '#9c27b0',
                lineStyle: { width: 3 },
                symbolSize: 7,
                emphasis: { 
                    lineStyle: { width: 5 },
                    itemStyle: { shadowBlur: 10, shadowColor: 'rgba(156, 39, 176, 0.5)' }
                }
            }
        ]
    });
}

// Update UI with latest game state
function updateUI() {
    // Update tribe stats
    tribes.forEach(tribe => {
        document.getElementById(`territory-${tribe.id}`).textContent = tribe.territory;
        document.getElementById(`resources-${tribe.id}`).textContent = tribe.resources.toFixed(1);
        document.getElementById(`mechs-${tribe.id}`).textContent = mechs.filter(m => m.owner === tribe.id).length;
        document.getElementById(`income-${tribe.id}`).textContent = tribe.income.toFixed(1);
        document.getElementById(`expenses-${tribe.id}`).textContent = tribe.expenses.toFixed(1);
    });
    
    // Update charts data
    updateCharts();
}

// Update chart data and redraw
function updateCharts() {
    // 减少图表更新频率，从每5回合更新一次改为每20回合更新一次
    if (turnCounter % 20 === 0) {
        // 限制历史数据长度，避免数据过多导致性能问题
        const maxHistoryLength = 100; // 最多保存100个数据点
        
        // 如果历史数据超过限制，移除最早的数据
        if (historyData.territory[0].length >= maxHistoryLength) {
            tribes.forEach(tribe => {
                historyData.territory[tribe.id].shift();
                historyData.resources[tribe.id].shift();
                historyData.mechs[tribe.id].shift();
            });
        }
        
        // Record history
        tribes.forEach(tribe => {
            historyData.territory[tribe.id].push(tribe.territory);
            historyData.resources[tribe.id].push(tribe.resources);
            historyData.mechs[tribe.id].push(mechs.filter(m => m.owner === tribe.id).length);
        });
        
        // Generate x-axis data (turn numbers)
        // 使用当前回合数减去历史数据长度*20来计算起始回合
        const startTurn = turnCounter - (historyData.territory[0].length - 1) * 20;
        const xAxisData = Array.from({ length: historyData.territory[0].length }, (_, i) => startTurn + i * 20);
        
        try {
            // Update territory chart
            territoryChart.setOption({
                xAxis: { data: xAxisData },
                series: [
                    { 
                        name: '部落1', 
                        type: 'line',
                        data: historyData.territory[0],
                        color: '#ff5252',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落2', 
                        type: 'line',
                        data: historyData.territory[1],
                        color: '#2196f3',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落3', 
                        type: 'line',
                        data: historyData.territory[2],
                        color: '#4caf50',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落4', 
                        type: 'line',
                        data: historyData.territory[3],
                        color: '#9c27b0',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    }
                ]
            });
            
            // Update resources chart
            resourcesChart.setOption({
                xAxis: { data: xAxisData },
                series: [
                    { 
                        name: '部落1', 
                        type: 'line',
                        data: historyData.resources[0],
                        color: '#ff5252',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落2', 
                        type: 'line',
                        data: historyData.resources[1],
                        color: '#2196f3',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落3', 
                        type: 'line',
                        data: historyData.resources[2],
                        color: '#4caf50',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落4', 
                        type: 'line',
                        data: historyData.resources[3],
                        color: '#9c27b0',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    }
                ]
            });
            
            // Update mechs chart
            mechsChart.setOption({
                xAxis: { data: xAxisData },
                series: [
                    { 
                        name: '部落1', 
                        type: 'line',
                        data: historyData.mechs[0],
                        color: '#ff5252',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落2', 
                        type: 'line',
                        data: historyData.mechs[1],
                        color: '#2196f3',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落3', 
                        type: 'line',
                        data: historyData.mechs[2],
                        color: '#4caf50',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    },
                    { 
                        name: '部落4', 
                        type: 'line',
                        data: historyData.mechs[3],
                        color: '#9c27b0',
                        lineStyle: { width: 3 },
                        symbolSize: 7
                    }
                ]
            });
        } catch (error) {
            console.error("图表更新错误:", error);
            // 尝试重新初始化图表
            try {
                initCharts();
            } catch (e) {
                console.error("图表重新初始化失败:", e);
            }
        }
    }
}

// Add a log entry
function addLogEntry(message, tribeId) {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    if (tribeId >= 0) {
        logEntry.classList.add(`tribe-${tribeId}`);
        logEntry.textContent = `[回合 ${turnCounter}] [${tribes[tribeId].name}] ${message}`;
    } else {
        logEntry.textContent = `[回合 ${turnCounter}] ${message}`;
    }
    
    logContent.appendChild(logEntry);
    
    // 限制日志条目数量，保留最新的200条
    const maxLogEntries = 200;
    while (logContent.childElementCount > maxLogEntries) {
        logContent.removeChild(logContent.firstChild);
    }
    
    logContent.scrollTop = logContent.scrollHeight;
}

// Start the game
function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    gamePaused = false;
    
    startButton.disabled = true;
    pauseButton.disabled = false;
    continueButton.disabled = true;
    resetButton.disabled = false;
    
    addLogEntry('游戏开始', -1);
    
    // Start game loop
    gameInterval = setInterval(gameTick, 1000 / gameSpeed);
}

// Pause the game
function pauseGame() {
    if (!gameRunning || gamePaused) return;
    
    gamePaused = true;
    
    pauseButton.disabled = true;
    continueButton.disabled = false;
    
    clearInterval(gameInterval);
    
    addLogEntry('游戏暂停', -1);
}

// Continue the game
function continueGame() {
    if (!gameRunning || !gamePaused) return;
    
    gamePaused = false;
    
    pauseButton.disabled = false;
    continueButton.disabled = true;
    
    addLogEntry('游戏继续', -1);
    
    // Restart game loop
    gameInterval = setInterval(gameTick, 1000 / gameSpeed);
}

// Reset the game
function resetGame() {
    gameRunning = false;
    gamePaused = false;
    
    clearInterval(gameInterval);
    
    startButton.disabled = false;
    pauseButton.disabled = true;
    continueButton.disabled = true;
    resetButton.disabled = false;
    
    initGame();
    
    addLogEntry('游戏重置', -1);
}

// Game tick - one turn of the game
function gameTick() {
    turnCounter++;
    turnCounterElement.textContent = turnCounter;
    
    // Reset turn actions
    resetTurnActions();
    
    // Reset tribe expenses for this turn
    tribes.forEach(tribe => {
        tribe.expenses = mechs.filter(m => m.owner === tribe.id).length * MECH_MAINTENANCE;
    });
    
    // Generate resources from high value cells
    generateResources();
    
    // AI turns
    tribes.forEach(tribe => {
        aiTurn(tribe);
    });
    
    // Move mechs
    moveMechs();
    
    // Update UI
    updateUI();
    
    // 减少渲染频率，提高性能
    // 每回合更新UI数据，但只在特定回合渲染棋盘
    if (turnCounter % 3 === 0 || turnCounter < 20) {
        // 渲染棋盘
        renderBoard();
    }
}

// Generate resources from high value cells
function generateResources() {
    // Reset tribe income for this turn
    tribes.forEach(tribe => {
        tribe.income = 0;
    });
    
    // Loop through all cells
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = gameBoard[y][x];
            
            if (cell.highValue && cell.owner !== null && cell.level > 0) {
                const resourceAmount = cell.level;
                tribes[cell.owner].resources += resourceAmount;
                tribes[cell.owner].income += resourceAmount;
            }
        }
    }
    
    // Subtract mech maintenance costs
    tribes.forEach(tribe => {
        tribe.expenses = mechs.filter(m => m.owner === tribe.id).length * MECH_MAINTENANCE;
        tribe.resources -= tribe.expenses;
        
        // 检查经济状况，主动回收高达以避免破产
        checkAndRecycleMechs(tribe.id);
        
        // If tribe still runs out of resources, destroy mechs until maintenance costs can be covered
        if (tribe.resources < 0) {
            const tribeMechs = mechs.filter(m => m.owner === tribe.id);
            while (tribe.resources < 0 && tribeMechs.length > 0) {
                // Remove a mech
                const mechToRemove = tribeMechs.pop();
                const mechIndex = mechs.findIndex(m => m === mechToRemove);
                
                if (mechIndex !== -1) {
                    mechs.splice(mechIndex, 1);
                    tribe.resources += MECH_SALVAGE_VALUE / 2; // Partial salvage value
                    addLogEntry(`由于资源不足，高达被强制拆解，回收 ${MECH_SALVAGE_VALUE / 2} 点资源`, tribe.id);
                }
            }
            
            // Reset expenses
            tribe.expenses = mechs.filter(m => m.owner === tribe.id).length * MECH_MAINTENANCE;
        }
    });
}

// AI turn for a tribe
function aiTurn(tribe) {
    // 如果领地为0，跳过AI回合
    if (tribe.territory === 0) {
        return;
    }
    
    // Calculate available resources
    const availableResources = tribe.resources;
    const mechMaintenance = mechs.filter(m => m.owner === tribe.id).length * MECH_MAINTENANCE;
    const effectiveResources = availableResources - mechMaintenance;
    
    // 如果有效资源为负数，跳过AI回合
    if (effectiveResources < 0) {
        return;
    }
    
    // 缓存高价值点和可扩张点
    const ownedHighValueCells = [];
    const upgradableCells = [];
    const expandableCells = [];
    
    // 减少遍历次数，只检查部落领地周围的格子
    const cellsToCheck = new Set();
    
    // 首先找到所有己方领地
    const ownedCells = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = gameBoard[y][x];
            if (cell.owner === tribe.id) {
                ownedCells.push({x, y});
                
                // 对于己方高价值点，检查是否可升级
                if (cell.highValue) {
                    ownedHighValueCells.push(cell);
                    if (cell.level < MAX_UPGRADE_LEVEL) {
                        upgradableCells.push(cell);
                    }
                }
                
                // 将周围的格子加入待检查集合
                getNeighbors(x, y).forEach(n => {
                    cellsToCheck.add(`${n.x},${n.y}`);
                });
            }
        }
    }
    
    // 检查可扩张的格子
    cellsToCheck.forEach(coordStr => {
        const [x, y] = coordStr.split(',').map(Number);
        const cell = gameBoard[y][x];
        
        // 如果不是己方领地，检查是否可扩张
        if (cell.owner !== tribe.id) {
            // 检查是否相邻己方领地
            const neighbors = getNeighbors(x, y);
            const canExpand = neighbors.some(n => {
                const neighborCell = gameBoard[n.y][n.x];
                return neighborCell.owner === tribe.id;
            });
            
            if (canExpand) {
                expandableCells.push(cell);
            }
        }
    });
    
    // Find high value cells that can be reached
    const reachableHighValueCells = expandableCells.filter(cell => cell.highValue);
    
    // 只在需要时计算复杂指标
    let metrics = null;
    
    // 根据当前回合和资源情况决定是否进行完整的状态评估
    // 回合数越大，评估频率越低，以提高性能
    const shouldEvaluateState = turnCounter % Math.max(1, Math.min(10, Math.floor(turnCounter / 200))) === 0;
    
    if (shouldEvaluateState) {
        // 计算部落排名（基于领地大小）
        const tribeRanking = calculateTribeRanking(tribe.id);
        
        // 计算领地受到威胁的程度
        const territoryUnderThreat = calculateTerritoryThreat(tribe.id);
        
        // 计算领地损失速度
        const territoryLossRate = calculateTerritoryLossRate(tribe.id);
        
        // 计算资源增长率
        const resourceGrowthRate = calculateResourceGrowthRate(tribe.id);
        
        // 计算收入/支出比
        const incomeExpenseRatio = tribe.income / (tribe.expenses > 0 ? tribe.expenses : 1);
        
        // 计算高达数量
        const mechCount = mechs.filter(m => m.owner === tribe.id).length;
        
        // 计算敌方高达数量
        const enemyMechCount = mechs.filter(m => m.owner !== tribe.id).length;
        
        // 检查是否最近失去了高达
        const recentlyLostMech = tribe.territory >= 30 && mechCount === 0;
        
        metrics = {
            territoryUnderThreat,
            territoryLossRate,
            resourceGrowthRate,
            incomeExpenseRatio,
            mechCount,
            enemyMechCount,
            tribeRanking,
            recentlyLostMech,
            ownedHighValueCellCount: ownedHighValueCells.length
        };
        
        // 判断部落当前状态
        const tribeState = determineTribeState(tribe.id, metrics);
        tribe.state = tribeState; // 存储状态以便复用
    } else {
        // 复用上一次的状态评估
        if (!tribe.state) {
            tribe.state = 'BALANCED'; // 默认平衡状态
        }
    }
    
    // 获取当前高达数量
    const mechCount = mechs.filter(m => m.owner === tribe.id).length;
    
    // 根据部落状态调整策略
    switch(tribe.state) {
        case 'EMERGENCY':
            // 紧急状态：优先防御，制造高达，保护领地
            handleEmergencyState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, ownedHighValueCells);
            break;
            
        case 'DEFENSIVE':
            // 防御状态：平衡发展和防御
            handleDefensiveState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells);
            break;
            
        case 'ECONOMIC_GROWTH':
            // 经济优先扩张状态：平衡经济发展和领土扩张，优先考虑资源积累
            handleEconomicGrowthState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells);
            break;
            
        case 'EXPANSION':
            // 扩张状态：优先扩张领地
            handleExpansionState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells);
            break;
            
        case 'ECONOMIC':
            // 经济状态：优先发展经济
            handleEconomicState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells);
            break;
            
        default:
            // 平衡状态：均衡发展
            handleBalancedState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells);
    }
}

// 计算部落领地损失速度
function calculateTerritoryLossRate(tribeId) {
    // 如果历史数据不足，返回0
    if (historyData.territory[tribeId].length < 2) {
        return 0;
    }
    
    // 计算最近5个历史记录点的平均变化率
    const dataPoints = Math.min(5, historyData.territory[tribeId].length);
    let totalChange = 0;
    
    for (let i = 1; i < dataPoints; i++) {
        const currentIndex = historyData.territory[tribeId].length - i;
        const previousIndex = historyData.territory[tribeId].length - i - 1;
        
        if (currentIndex >= 0 && previousIndex >= 0) {
            const current = historyData.territory[tribeId][currentIndex];
            const previous = historyData.territory[tribeId][previousIndex];
            totalChange += (current - previous);
        }
    }
    
    // 返回平均变化率，负值表示损失
    return totalChange / dataPoints;
}

// 计算资源增长率
function calculateResourceGrowthRate(tribeId) {
    // 如果历史数据不足，返回0
    if (historyData.resources[tribeId].length < 2) {
        return 0;
    }
    
    // 计算最近5个历史记录点的平均变化率
    const dataPoints = Math.min(5, historyData.resources[tribeId].length);
    let totalChange = 0;
    
    for (let i = 1; i < dataPoints; i++) {
        const currentIndex = historyData.resources[tribeId].length - i;
        const previousIndex = historyData.resources[tribeId].length - i - 1;
        
        if (currentIndex >= 0 && previousIndex >= 0) {
            const current = historyData.resources[tribeId][currentIndex];
            const previous = historyData.resources[tribeId][previousIndex];
            totalChange += (current - previous);
        }
    }
    
    // 返回平均变化率
    return totalChange / dataPoints;
}

// 计算部落排名
function calculateTribeRanking(tribeId) {
    // 根据领地大小对部落进行排名
    const tribesByTerritory = [...tribes].sort((a, b) => b.territory - a.territory);
    return tribesByTerritory.findIndex(t => t.id === tribeId) + 1; // 排名从1开始
}

// 确定部落当前状态
function determineTribeState(tribeId, metrics) {
    const {
        territoryUnderThreat,
        territoryLossRate,
        resourceGrowthRate,
        incomeExpenseRatio,
        mechCount,
        enemyMechCount,
        tribeRanking,
        recentlyLostMech,
        ownedHighValueCellCount
    } = metrics;
    
    // 紧急状态条件
    if (
        (territoryUnderThreat > 0.7) || // 领地受到严重威胁
        (territoryLossRate < -3) || // 领地快速减少
        (recentlyLostMech) || // 最近失去高达
        (tribeRanking === 4 && tribes[tribeId].territory < 10) // 排名最后且领地很少
    ) {
        addLogEntry(`进入紧急状态：检测到严重威胁或领地快速减少`, tribeId);
        return 'EMERGENCY';
    }
    
    // 防御状态条件
    if (
        (territoryUnderThreat > 0.4) || // 领地受到中度威胁
        (territoryLossRate < -1) || // 领地缓慢减少
        (enemyMechCount > mechCount * 1.5) // 敌方高达数量明显多于己方
    ) {
        return 'DEFENSIVE';
    }
    
    // 经济优先扩张状态条件
    if (
        (tribeRanking <= 2) || // 排名前两名
        (incomeExpenseRatio > 2.5 && resourceGrowthRate > 0) || // 经济状况良好且资源增长为正
        (tribes[tribeId].territory >= 30 && ownedHighValueCellCount >= 3) // 领地规模适中且拥有多个高价值点
    ) {
        return 'ECONOMIC_GROWTH';
    }
    
    // 扩张状态条件
    if (
        (tribeRanking > 2 && resourceGrowthRate > 0) || // 排名不是前两名但资源增长良好
        (incomeExpenseRatio > 3 && tribes[tribeId].territory < 50) // 经济状况良好且领地中等
    ) {
        return 'EXPANSION';
    }
    
    // 经济状态条件
    if (
        (resourceGrowthRate < 0) || // 资源增长为负
        (incomeExpenseRatio < 2) || // 收入/支出比低
        (ownedHighValueCellCount < 3) // 高价值点太少
    ) {
        return 'ECONOMIC';
    }
    
    // 默认为平衡状态
    return 'BALANCED';
}

// 处理紧急状态
function handleEmergencyState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, ownedHighValueCells) {
    // 紧急状态下，先检查是否需要回收高达来获取资源
    if (tribe.resources < EXPANSION_COST && mechCount > 1) {
        // 回收一个高达以获取资源
        const tribeMechs = mechs.filter(m => m.owner === tribe.id);
        if (tribeMechs.length > 0) {
            // 选择生命值最低的高达回收
            tribeMechs.sort((a, b) => a.health - b.health);
            const mechToRecycle = tribeMechs[0];
            const mechIndex = mechs.indexOf(mechToRecycle);
            
            if (mechIndex !== -1) {
                mechs.splice(mechIndex, 1);
                tribe.resources += MECH_SALVAGE_VALUE;
                addLogEntry(`紧急状态：主动回收生命值为 ${mechToRecycle.health} 的高达，获得 ${MECH_SALVAGE_VALUE} 资源`, tribe.id);
                return;
            }
        }
    }
    
    // 紧急状态下，优先制造高达进行防御
    if (tribe.resources >= MECH_COST && tribe.territory >= 15) {
        createMech(tribe.id);
        addLogEntry(`紧急状态：制造高达进行防御`, tribe.id);
        return;
    }
    
    // 如果资源不足以制造高达，尝试升级高价值点以提高收入
    if (upgradableCells.length > 0) {
        // 优先升级低等级的高价值点
        upgradableCells.sort((a, b) => a.level - b.level);
        
        const cellToUpgrade = upgradableCells[0];
        const upgradeCost = Math.pow(UPGRADE_COST_MULTIPLIER, cellToUpgrade.level);
        
        if (effectiveResources >= upgradeCost) {
            upgradeCell(tribe.id, cellToUpgrade.x, cellToUpgrade.y);
            addLogEntry(`紧急状态：升级高价值点以提高收入`, tribe.id);
            return;
        }
    }
    
    // 如果无法升级，尝试扩张到可防御性更高的位置
    if (expandableCells.length > 0 && effectiveResources > EXPANSION_COST) {
        // 优先选择能提高领地连通性的格子
        expandableCells.sort((a, b) => {
            const aConnectivity = countAdjacentOwnedCells(a.x, a.y, tribe.id);
            const bConnectivity = countAdjacentOwnedCells(b.x, b.y, tribe.id);
            return bConnectivity - aConnectivity;
        });
        
        expandToCell(tribe.id, expandableCells[0].x, expandableCells[0].y);
        addLogEntry(`紧急状态：扩张到更易防守的位置`, tribe.id);
    }
}

// 处理防御状态
function handleDefensiveState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells) {
    // 防御状态下，平衡发展经济和防御能力
    
    // 如果高达数量不足，考虑制造高达
    if (mechCount < Math.max(1, Math.floor(tribe.territory / 25)) && 
        tribe.resources >= MECH_COST * 1.2 && 
        tribe.territory >= 20) {
        createMech(tribe.id);
        addLogEntry(`防御状态：制造高达加强防御`, tribe.id);
        return;
    }
    
    // 尝试升级高价值点
    if (upgradableCells.length > 0) {
        upgradableCells.sort((a, b) => a.level - b.level);
        
        const cellToUpgrade = upgradableCells[0];
        const upgradeCost = Math.pow(UPGRADE_COST_MULTIPLIER, cellToUpgrade.level);
        
        if (effectiveResources >= upgradeCost) {
            upgradeCell(tribe.id, cellToUpgrade.x, cellToUpgrade.y);
            return;
        }
    }
    
    // 尝试扩张到高价值点
    if (reachableHighValueCells.length > 0 && effectiveResources > EXPANSION_COST * 1.5) {
        reachableHighValueCells.sort((a, b) => {
            const aDistance = getMinDistanceToOwnedCells(a.x, a.y, tribe.id);
            const bDistance = getMinDistanceToOwnedCells(b.x, b.y, tribe.id);
            return aDistance - bDistance;
        });
        
        expandToCell(tribe.id, reachableHighValueCells[0].x, reachableHighValueCells[0].y);
        return;
    }
    
    // 普通扩张，优先选择能提高领地连通性的格子
    if (expandableCells.length > 0 && effectiveResources > EXPANSION_COST) {
        expandableCells.sort((a, b) => {
            const aConnectivity = countAdjacentOwnedCells(a.x, a.y, tribe.id);
            const bConnectivity = countAdjacentOwnedCells(b.x, b.y, tribe.id);
            return bConnectivity - aConnectivity;
        });
        
        expandToCell(tribe.id, expandableCells[0].x, expandableCells[0].y);
    }
}

// 处理扩张状态
function handleExpansionState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells) {
    // 扩张状态下，优先扩张领地
    
    // 首先尝试扩张到高价值点
    if (reachableHighValueCells.length > 0 && effectiveResources > EXPANSION_COST) {
        reachableHighValueCells.sort((a, b) => {
            const aDistance = getMinDistanceToOwnedCells(a.x, a.y, tribe.id);
            const bDistance = getMinDistanceToOwnedCells(b.x, b.y, tribe.id);
            return aDistance - bDistance;
        });
        
        expandToCell(tribe.id, reachableHighValueCells[0].x, reachableHighValueCells[0].y);
        addLogEntry(`扩张状态：扩张到高价值点`, tribe.id);
        return;
    }
    
    // 然后尝试普通扩张，尽可能多地扩张
    if (expandableCells.length > 0 && effectiveResources > EXPANSION_COST) {
        // 计算可以扩张的最大数量
        const maxExpansions = Math.min(
            expandableCells.length,
            Math.floor(Math.log2(effectiveResources / EXPANSION_COST) * 2) // 扩张状态下增加扩张能力
        );
        
        if (maxExpansions > 0) {
            // 优先扩张到高价值点和能提高领地连通性的格子
            expandableCells.sort((a, b) => {
                if (a.highValue && !b.highValue) return -1;
                if (!a.highValue && b.highValue) return 1;
                
                const aConnectivity = countAdjacentOwnedCells(a.x, a.y, tribe.id);
                const bConnectivity = countAdjacentOwnedCells(b.x, b.y, tribe.id);
                
                return bConnectivity - aConnectivity;
            });
            
            // 扩张到多个格子
            const numExpansions = Math.min(5, Math.floor(Math.random() * maxExpansions) + 3); // 扩张状态下增加每回合扩张数量
            let expansionCost = 0;
            
            for (let i = 0; i < numExpansions && i < expandableCells.length; i++) {
                const cell = expandableCells[i];
                const thisCost = Math.pow(2, i);
                
                if (effectiveResources >= thisCost + expansionCost) {
                    expandToCell(tribe.id, cell.x, cell.y);
                    expansionCost += thisCost;
                } else {
                    break;
                }
            }
            
            addLogEntry(`扩张状态：积极扩张领地`, tribe.id);
            return;
        }
    }
    
    // 如果无法扩张，尝试升级高价值点
    if (upgradableCells.length > 0) {
        upgradableCells.sort((a, b) => a.level - b.level);
        
        const cellToUpgrade = upgradableCells[0];
        const upgradeCost = Math.pow(UPGRADE_COST_MULTIPLIER, cellToUpgrade.level);
        
        if (effectiveResources >= upgradeCost) {
            upgradeCell(tribe.id, cellToUpgrade.x, cellToUpgrade.y);
            return;
        }
    }
    
    // 如果资源充足，考虑制造高达
    if (tribe.resources >= MECH_COST * 1.5 && 
        tribe.territory >= 25 && 
        mechCount < Math.floor(tribe.territory / 30)) {
        createMech(tribe.id);
    }
}

// 处理经济状态
function handleEconomicState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells) {
    // 经济状态下，优先发展经济
    
    // 首先尝试升级现有高价值点
    if (upgradableCells.length > 0) {
        // 优先升级低等级的高价值点以获得更好的投资回报
        upgradableCells.sort((a, b) => a.level - b.level);
        
        const cellToUpgrade = upgradableCells[0];
        const upgradeCost = Math.pow(UPGRADE_COST_MULTIPLIER, cellToUpgrade.level);
        
        if (effectiveResources >= upgradeCost) {
            upgradeCell(tribe.id, cellToUpgrade.x, cellToUpgrade.y);
            addLogEntry(`经济状态：升级高价值点提高收入`, tribe.id);
            return;
        }
    }
    
    // 然后尝试扩张到高价值点
    if (reachableHighValueCells.length > 0 && effectiveResources > EXPANSION_COST) {
        reachableHighValueCells.sort((a, b) => {
            const aDistance = getMinDistanceToOwnedCells(a.x, a.y, tribe.id);
            const bDistance = getMinDistanceToOwnedCells(b.x, b.y, tribe.id);
            return aDistance - bDistance;
        });
        
        expandToCell(tribe.id, reachableHighValueCells[0].x, reachableHighValueCells[0].y);
        addLogEntry(`经济状态：扩张到高价值点增加收入`, tribe.id);
        return;
    }
    
    // 如果无法扩张到高价值点，尝试普通扩张但数量有限
    if (expandableCells.length > 0 && effectiveResources > EXPANSION_COST) {
        // 经济状态下限制扩张数量
        const maxExpansions = Math.min(
            expandableCells.length,
            Math.floor(Math.log2(effectiveResources / EXPANSION_COST))
        );
        
        if (maxExpansions > 0) {
            // 优先扩张到高价值点
            expandableCells.sort((a, b) => {
                if (a.highValue && !b.highValue) return -1;
                if (!a.highValue && b.highValue) return 1;
                
                const aConnectivity = countAdjacentOwnedCells(a.x, a.y, tribe.id);
                const bConnectivity = countAdjacentOwnedCells(b.x, b.y, tribe.id);
                
                return bConnectivity - aConnectivity;
            });
            
            // 限制扩张数量，经济状态下更保守
            const numExpansions = Math.min(2, Math.floor(Math.random() * maxExpansions) + 1);
            let expansionCost = 0;
            
            for (let i = 0; i < numExpansions && i < expandableCells.length; i++) {
                const cell = expandableCells[i];
                const thisCost = Math.pow(2, i);
                
                if (effectiveResources >= thisCost + expansionCost) {
                    expandToCell(tribe.id, cell.x, cell.y);
                    expansionCost += thisCost;
                } else {
                    break;
                }
            }
            
            return;
        }
    }
    
    // 经济状态下一般不考虑制造高达，除非资源非常充足
    if (tribe.resources >= MECH_COST * 2.5 && 
        tribe.territory >= 30 && 
        incomeExpenseRatio >= 4.0 &&
        mechCount < Math.floor(tribe.territory / 40)) {
        createMech(tribe.id);
        addLogEntry(`经济状态：资源充足，制造高达`, tribe.id);
    }
}

// 处理平衡状态
function handleBalancedState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells) {
    // 平衡状态下，均衡发展
    
    // 首先考虑升级高价值点
    if (upgradableCells.length > 0) {
        upgradableCells.sort((a, b) => a.level - b.level);
        
        const cellToUpgrade = upgradableCells[0];
        const upgradeCost = Math.pow(UPGRADE_COST_MULTIPLIER, cellToUpgrade.level);
        
        if (effectiveResources >= upgradeCost) {
            upgradeCell(tribe.id, cellToUpgrade.x, cellToUpgrade.y);
            return;
        }
    }
    
    // 然后考虑扩张到高价值点
    if (reachableHighValueCells.length > 0 && effectiveResources > EXPANSION_COST * 1.5) {
        reachableHighValueCells.sort((a, b) => {
            const aDistance = getMinDistanceToOwnedCells(a.x, a.y, tribe.id);
            const bDistance = getMinDistanceToOwnedCells(b.x, b.y, tribe.id);
            return aDistance - bDistance;
        });
        
        expandToCell(tribe.id, reachableHighValueCells[0].x, reachableHighValueCells[0].y);
        return;
    }
    
    // 考虑普通扩张
    if (expandableCells.length > 0 && effectiveResources > EXPANSION_COST) {
        const maxExpansions = Math.min(
            expandableCells.length,
            Math.floor(Math.log2(effectiveResources / EXPANSION_COST) * 1.5)
        );
        
        if (maxExpansions > 0) {
            expandableCells.sort((a, b) => {
                if (a.highValue && !b.highValue) return -1;
                if (!a.highValue && b.highValue) return 1;
                
                const aConnectivity = countAdjacentOwnedCells(a.x, a.y, tribe.id);
                const bConnectivity = countAdjacentOwnedCells(b.x, b.y, tribe.id);
                
                return bConnectivity - aConnectivity;
            });
            
            const numExpansions = Math.min(3, Math.floor(Math.random() * maxExpansions) + 2);
            let expansionCost = 0;
            
            for (let i = 0; i < numExpansions && i < expandableCells.length; i++) {
                const cell = expandableCells[i];
                const thisCost = Math.pow(2, i);
                
                if (effectiveResources >= thisCost + expansionCost) {
                    expandToCell(tribe.id, cell.x, cell.y);
                    expansionCost += thisCost;
                } else {
                    break;
                }
            }
            
            return;
        }
    }
    
    // 最后考虑制造高达
    if (tribe.resources >= MECH_COST * 1.5 && 
        tribe.territory >= 25 && 
        incomeExpenseRatio >= 3.0 &&
        mechCount < Math.floor(tribe.territory / 25)) {
        createMech(tribe.id);
    }
}

// Move and control all mechs
function moveMechs() {
    // 如果高达数量很多，使用批处理方式
    if (mechs.length > 50) {
        // 每回合只移动一部分高达，避免性能问题
        const mechsToMove = Math.min(mechs.length, 20 + Math.floor(Math.random() * 10));
        const mechIndices = Array.from({ length: mechs.length }, (_, i) => i);
        
        // 随机选择要移动的高达
        for (let i = 0; i < mechIndices.length; i++) {
            const j = Math.floor(Math.random() * mechIndices.length);
            [mechIndices[i], mechIndices[j]] = [mechIndices[j], mechIndices[i]];
        }
        
        // 只移动选中的高达
        for (let i = 0; i < mechsToMove; i++) {
            const mech = mechs[mechIndices[i]];
            
            // Skip if this mech has already moved this turn
            if (mech.hasMoved) {
                mech.hasMoved = false;
                continue;
            }
            
            // AI for mech movement
            aiMoveMech(mech);
        }
        
        // 重置其余高达的hasMoved标志
        for (let i = mechsToMove; i < mechs.length; i++) {
            mechs[mechIndices[i]].hasMoved = false;
        }
    } else {
        // 高达数量少时正常移动所有高达
        mechs.forEach(mech => {
            // Skip if this mech has already moved this turn
            if (mech.hasMoved) {
                mech.hasMoved = false;
                return;
            }
            
            // AI for mech movement
            aiMoveMech(mech);
        });
    }
}

// AI for mech movement
function aiMoveMech(mech) {
    const tribe = tribes[mech.owner];
    
    // 如果部落已经没有领地，高达自毁
    if (tribe.territory === 0) {
        const mechIndex = mechs.indexOf(mech);
        if (mechIndex !== -1) {
            mechs.splice(mechIndex, 1);
        }
        return;
    }
    
    // 缓存搜索范围内的格子，避免重复计算
    const cellsInRange = new Map();
    const enemyMechsInRange = [];
    
    // 计算搜索范围
    const minX = Math.max(0, mech.x - MECH_MOVEMENT_RADIUS);
    const maxX = Math.min(BOARD_SIZE - 1, mech.x + MECH_MOVEMENT_RADIUS);
    const minY = Math.max(0, mech.y - MECH_MOVEMENT_RADIUS);
    const maxY = Math.min(BOARD_SIZE - 1, mech.y + MECH_MOVEMENT_RADIUS);
    
    // Find enemy cells within movement range that are adjacent to own territory
    const enemyCells = [];
    
    // 预先计算所有己方领地的位置
    const ownTerritories = new Set();
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (gameBoard[y][x].owner === mech.owner) {
                ownTerritories.add(`${x},${y}`);
            }
        }
    }
    
    // 在移动范围内搜索敌方格子和高达
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const cell = gameBoard[y][x];
            const distance = Math.sqrt(Math.pow(x - mech.x, 2) + Math.pow(y - mech.y, 2));
            
            // 缓存范围内的格子
            cellsInRange.set(`${x},${y}`, { cell, distance });
            
            if (distance <= MECH_MOVEMENT_RADIUS) {
                // 检查敌方格子
                if (cell.owner !== null && cell.owner !== mech.owner) {
                    // 检查是否相邻己方领地
                    const neighbors = getNeighbors(x, y);
                    const isAdjacentToOwnTerritory = neighbors.some(n => {
                        return ownTerritories.has(`${n.x},${n.y}`);
                    });
                    
                    // 只添加与己方领地相邻的敌方格子
                    if (isAdjacentToOwnTerritory) {
                        // 计算战略价值
                        const strategicValue = calculateCellStrategicValue(x, y, cell, mech.owner);
                        enemyCells.push({ x, y, cell, distance, strategicValue });
                    }
                }
                
                // 检查敌方高达
                const enemyMechAtLocation = mechs.find(m => m.x === x && m.y === y && m.owner !== mech.owner);
                if (enemyMechAtLocation) {
                    // 计算胜率
                    const winProbability = mech.health / (mech.health + enemyMechAtLocation.health);
                    
                    // 只考虑胜率至少40%的目标
                    if (winProbability >= 0.4) {
                        // 计算战略价值
                        const strategicValue = calculateMechTargetValue(enemyMechAtLocation, cell, winProbability);
                        
                        enemyMechsInRange.push({ 
                            x, 
                            y, 
                            mech: enemyMechAtLocation, 
                            distance,
                            winProbability,
                            strategicValue
                        });
                    }
                }
            }
        }
    }
    
    // 决定是攻击格子还是敌方高达
    let targetType = null;
    let target = null;
    
    if (enemyCells.length > 0) {
        // 按战略价值排序（最高在前）
        enemyCells.sort((a, b) => b.strategicValue - a.strategicValue);
        target = enemyCells[0];
        targetType = 'cell';
    }
    
    if (enemyMechsInRange.length > 0) {
        // 按战略价值排序（最高在前）
        enemyMechsInRange.sort((a, b) => b.strategicValue - a.strategicValue);
        
        // 如果最佳高达目标比最佳格子目标更有价值，或者没有格子目标
        if (!target || (enemyMechsInRange[0].strategicValue > target.strategicValue)) {
            target = enemyMechsInRange[0];
            targetType = 'mech';
        }
    }
    
    // 如果有目标，攻击它
    if (target) {
        // 移动高达
        mech.x = target.x;
        mech.y = target.y;
        mech.hasMoved = true;
        
        if (targetType === 'mech') {
            // 高达间战斗
            const enemyMech = target.mech;
            const totalHealth = mech.health + enemyMech.health;
            const winProbability = mech.health / totalHealth;
            
            if (Math.random() < winProbability) {
                // 此高达获胜
                const enemyTribe = tribes[enemyMech.owner];
                
                // 移除敌方高达
                const enemyMechIndex = mechs.indexOf(enemyMech);
                mechs.splice(enemyMechIndex, 1);
                
                // 占领格子
                captureCell(mech.owner, target.x, target.y);
                
                // 添加回收价值
                tribe.resources += MECH_SALVAGE_VALUE;
                
                addLogEntry(`高达击败了敌方高达并占领了 (${target.x},${target.y})`, mech.owner);
            } else {
                // 敌方高达获胜
                const enemyTribe = tribes[enemyMech.owner];
                
                // 移除此高达
                const mechIndex = mechs.indexOf(mech);
                mechs.splice(mechIndex, 1);
                
                // 添加回收价值给敌方部落
                enemyTribe.resources += MECH_SALVAGE_VALUE;
                
                addLogEntry(`高达在与敌方高达的战斗中被击毁`, mech.owner);
            }
        } else {
            // 没有敌方高达，占领格子
            mech.health -= MECH_ATTACK_COST;
            captureCell(mech.owner, target.x, target.y);
            
            addLogEntry(`高达占领了 (${target.x},${target.y})`, mech.owner);
            
            // 如果高达生命值降至0，销毁它
            if (mech.health <= 0) {
                const mechIndex = mechs.indexOf(mech);
                mechs.splice(mechIndex, 1);
                
                addLogEntry(`高达因损耗过大被摧毁`, mech.owner);
            }
        }
    } else {
        // 范围内没有可行目标，移动向最近的战略目标
        // 减少调用findBestMechTarget的频率，提高性能
        if (Math.random() < 0.7) { // 30%的概率跳过寻找目标
            const nearestTarget = findBestMechTarget(mech.x, mech.y, mech.owner);
            
            if (nearestTarget) {
                // 计算移动方向
                const dx = nearestTarget.x - mech.x;
                const dy = nearestTarget.y - mech.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > MECH_MOVEMENT_RADIUS) {
                    // 向目标移动
                    const moveDistance = MECH_MOVEMENT_RADIUS;
                    const ratio = moveDistance / distance;
                    
                    const newX = Math.floor(mech.x + dx * ratio);
                    const newY = Math.floor(mech.y + dy * ratio);
                    
                    // 确保在棋盘边界内
                    mech.x = Math.max(0, Math.min(BOARD_SIZE - 1, newX));
                    mech.y = Math.max(0, Math.min(BOARD_SIZE - 1, newY));
                    mech.hasMoved = true;
                    
                    // 减少日志输出，提高性能
                    if (Math.random() < 0.2) {
                        addLogEntry(`高达移动到 (${mech.x},${mech.y})`, mech.owner);
                    }
                } else {
                    // 可以直接到达目标
                    mech.x = nearestTarget.x;
                    mech.y = nearestTarget.y;
                    mech.hasMoved = true;
                    
                    // 如果是敌方格子且相邻己方领地，占领它
                    const cell = gameBoard[nearestTarget.y][nearestTarget.x];
                    if (cell.owner !== null && cell.owner !== mech.owner) {
                        // 检查是否相邻己方领地
                        const isAdjacentToOwnTerritory = getNeighbors(nearestTarget.x, nearestTarget.y).some(n => {
                            const neighborCell = gameBoard[n.y][n.x];
                            return neighborCell.owner === mech.owner;
                        });
                        
                        if (isAdjacentToOwnTerritory) {
                            // 占领格子
                            mech.health -= MECH_ATTACK_COST;
                            captureCell(mech.owner, nearestTarget.x, nearestTarget.y);
                            
                            addLogEntry(`高达占领了 (${nearestTarget.x},${nearestTarget.y})`, mech.owner);
                            
                            // 如果高达生命值降至0，销毁它
                            if (mech.health <= 0) {
                                const mechIndex = mechs.indexOf(mech);
                                mechs.splice(mechIndex, 1);
                                
                                addLogEntry(`高达因损耗过大被摧毁`, mech.owner);
                            }
                        } else if (Math.random() < 0.2) { // 减少日志输出
                            addLogEntry(`高达移动到 (${mech.x},${mech.y})`, mech.owner);
                        }
                    } else if (Math.random() < 0.2) { // 减少日志输出
                        addLogEntry(`高达移动到 (${mech.x},${mech.y})`, mech.owner);
                    }
                }
            }
        }
    }
}

// Calculate strategic value of a cell for mech targeting
function calculateCellStrategicValue(x, y, cell, tribeId) {
    let value = 10; // Base value
    
    // High value cells are worth more
    if (cell.highValue) {
        value += 30 + (cell.level * 10);
    }
    
    // Cells that connect to more of our own territory are more valuable
    const ownNeighborCount = countAdjacentOwnedCells(x, y, tribeId);
    value += ownNeighborCount * 5;
    
    // Cells owned by tribes with more territory are more valuable targets
    if (cell.owner !== null) {
        const enemyTribe = tribes[cell.owner];
        value += Math.min(30, Math.sqrt(enemyTribe.territory) * 3);
    }
    
    // Cells near the center of the board are slightly more valuable
    const distanceToCenter = Math.sqrt(
        Math.pow(x - BOARD_SIZE/2, 2) + 
        Math.pow(y - BOARD_SIZE/2, 2)
    );
    value += Math.max(0, 10 - distanceToCenter/10);
    
    return value;
}

// Calculate strategic value of targeting an enemy mech
function calculateMechTargetValue(enemyMech, cell, winProbability) {
    let value = 20; // Base value for targeting a mech
    
    // Higher win probability means higher value
    value += winProbability * 30;
    
    // Higher health enemy mechs are more valuable targets
    value += enemyMech.health / 10;
    
    // If the mech is on a high value cell, it's a more valuable target
    if (cell.highValue) {
        value += 20 + (cell.level * 5);
    }
    
    // Mechs owned by tribes with more territory are more valuable targets
    const enemyTribe = tribes[enemyMech.owner];
    value += Math.min(20, Math.sqrt(enemyTribe.territory) * 2);
    
    return value;
}

// Find the best target for a mech to move towards
function findBestMechTarget(x, y, tribeId) {
    // First, look for enemy cells adjacent to our territory
    const adjacentEnemyCell = findNearestAdjacentEnemyCell(x, y, tribeId);
    
    // Next, look for enemy mechs
    let bestEnemyMech = null;
    let bestMechScore = -1;
    
    mechs.forEach(enemyMech => {
        if (enemyMech.owner !== tribeId) {
            // Calculate distance
            const distance = Math.sqrt(
                Math.pow(enemyMech.x - x, 2) + 
                Math.pow(enemyMech.y - y, 2)
            );
            
            // Check if this mech is adjacent to our territory
            const cell = gameBoard[enemyMech.y][enemyMech.x];
            const isAdjacentToOwnTerritory = getNeighbors(enemyMech.x, enemyMech.y).some(n => {
                const neighborCell = gameBoard[n.y][n.x];
                return neighborCell.owner === tribeId;
            });
            
            if (isAdjacentToOwnTerritory) {
                // Score based on distance and strategic value
                const score = 1000 / (distance + 1);
                
                if (score > bestMechScore) {
                    bestMechScore = score;
                    bestEnemyMech = { x: enemyMech.x, y: enemyMech.y };
                }
            }
        }
    });
    
    // Return the best target (either cell or mech)
    if (adjacentEnemyCell && bestEnemyMech) {
        // Calculate distances to both targets
        const cellDistance = Math.sqrt(
            Math.pow(adjacentEnemyCell.x - x, 2) + 
            Math.pow(adjacentEnemyCell.y - y, 2)
        );
        
        const mechDistance = Math.sqrt(
            Math.pow(bestEnemyMech.x - x, 2) + 
            Math.pow(bestEnemyMech.y - y, 2)
        );
        
        // Prefer the closer target with a bias towards mechs
        return (mechDistance * 0.8 <= cellDistance) ? bestEnemyMech : adjacentEnemyCell;
    }
    
    // Return whichever target we found, or null if none
    return adjacentEnemyCell || bestEnemyMech;
}

// Find the nearest enemy cell that is adjacent to any owned cell
function findNearestAdjacentEnemyCell(x, y, tribeId) {
    let nearestCell = null;
    let minDistance = Infinity;
    
    for (let cy = 0; cy < BOARD_SIZE; cy++) {
        for (let cx = 0; cx < BOARD_SIZE; cx++) {
            const cell = gameBoard[cy][cx];
            
            if (cell.owner !== null && cell.owner !== tribeId) {
                // Check if the cell is adjacent to any cell owned by this tribe
                const isAdjacentToOwnTerritory = getNeighbors(cx, cy).some(n => {
                    const neighborCell = gameBoard[n.y][n.x];
                    return neighborCell.owner === tribeId;
                });
                
                if (isAdjacentToOwnTerritory) {
                    const distance = Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2));
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCell = { x: cx, y: cy };
                    }
                }
            }
        }
    }
    
    return nearestCell;
}

// Find the nearest enemy cell from a position
function findNearestEnemyCell(x, y, tribeId) {
    let nearestCell = null;
    let minDistance = Infinity;
    
    for (let cy = 0; cy < BOARD_SIZE; cy++) {
        for (let cx = 0; cx < BOARD_SIZE; cx++) {
            const cell = gameBoard[cy][cx];
            
            if (cell.owner !== null && cell.owner !== tribeId) {
                const distance = Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2));
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestCell = { x: cx, y: cy };
                }
            }
        }
    }
    
    return nearestCell;
}

// Get minimum distance from a position to any owned high value cell of a tribe
function getMinDistanceToOwnedCells(x, y, tribeId) {
    let minDistance = Infinity;
    
    for (let cy = 0; cy < BOARD_SIZE; cy++) {
        for (let cx = 0; cx < BOARD_SIZE; cx++) {
            const cell = gameBoard[cy][cx];
            
            if (cell.owner === tribeId) {
                const distance = Math.sqrt(Math.pow(cx - x, 2) + Math.pow(cy - y, 2));
                minDistance = Math.min(minDistance, distance);
            }
        }
    }
    
    return minDistance;
}

// Get neighboring cells
function getNeighbors(x, y) {
    const neighbors = [];
    
    // Check only 4 directions (up, down, left, right)
    const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 },  // right
        { dx: 0, dy: 1 }   // down
    ];
    
    directions.forEach(dir => {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
            neighbors.push({ x: nx, y: ny });
        }
    });
    
    return neighbors;
}

// Expand to a cell
function expandToCell(tribeId, x, y) {
    const tribe = tribes[tribeId];
    const cell = gameBoard[y][x];
    
    // Calculate expansion cost
    // Get count of expansions already done this turn
    const expansionsThisTurn = turnActions.get(tribeId)?.expansions || 0;
    const expansionCost = Math.pow(EXPANSION_COST, expansionsThisTurn + 1);
    
    // Check if tribe has enough resources
    if (tribe.resources < expansionCost) {
        return false;
    }
    
    // Check if cell is already owned by this tribe
    if (cell.owner === tribeId) {
        return false;
    }
    
    // Check if cell is owned by another tribe
    if (cell.owner !== null) {
        return false;
    }
    
    // Check if cell is adjacent to an owned cell
    const neighbors = getNeighbors(x, y);
    const isAdjacent = neighbors.some(n => {
        const neighborCell = gameBoard[n.y][n.x];
        return neighborCell.owner === tribeId;
    });
    
    if (!isAdjacent) {
        return false;
    }
    
    // Expand to cell
    cell.owner = tribeId;
    tribe.resources -= expansionCost;
    tribe.territory++;
    
    // Initialize cell level if it's a high value cell
    if (cell.highValue) {
        cell.level = 2;
        addLogEntry(`占领了一个高价值点 (${x},${y})`, tribeId);
    } else {
        addLogEntry(`扩张到了 (${x},${y})`, tribeId);
    }
    
    // Track expansion count for this turn
    if (!turnActions.has(tribeId)) {
        turnActions.set(tribeId, { expansions: 0 });
    }
    turnActions.get(tribeId).expansions = (turnActions.get(tribeId).expansions || 0) + 1;
    
    return true;
}

// Track actions per turn for each tribe
let turnActions = new Map();

// Reset turn actions at the beginning of each turn
function resetTurnActions() {
    turnActions = new Map();
}

// Upgrade a cell
function upgradeCell(tribeId, x, y) {
    const tribe = tribes[tribeId];
    const cell = gameBoard[y][x];
    
    // Check if cell is owned by this tribe
    if (cell.owner !== tribeId) {
        return false;
    }
    
    // Check if cell is a high value cell
    if (!cell.highValue) {
        return false;
    }
    
    // Check if cell is already at max level
    if (cell.level >= MAX_UPGRADE_LEVEL) {
        return false;
    }
    
    // Calculate upgrade cost - 修正为UPGRADE_COST_MULTIPLIER的cell.level次方
    const upgradeCost = Math.pow(UPGRADE_COST_MULTIPLIER, cell.level);
    
    // Check if tribe has enough resources
    if (tribe.resources < upgradeCost) {
        return false;
    }
    
    // Upgrade cell
    cell.level++;
    tribe.resources -= upgradeCost;
    
    addLogEntry(`将高价值点 (${x},${y}) 升级到 ${cell.level} 级，消耗 ${upgradeCost.toFixed(1)} 资源`, tribeId);
    
    return true;
}

// Capture a cell (for mechs)
function captureCell(tribeId, x, y) {
    const tribe = tribes[tribeId];
    const cell = gameBoard[y][x];
    
    // Capture the cell
    const previousOwner = cell.owner;
    
    if (previousOwner !== null && previousOwner !== tribeId) {
        tribes[previousOwner].territory--;
    }
    
    if (cell.owner !== tribeId) {
        tribe.territory++;
    }
    
    cell.owner = tribeId;
    
    // Initialize cell level if it's a high value cell and wasn't already captured
    if (cell.highValue && previousOwner === null) {
        cell.level = 2; // 与expandToCell函数保持一致，设为2级
    }
    
    return true;
}

// Create a mech for a tribe
function createMech(tribeId) {
    const tribe = tribes[tribeId];
    
    // Check if tribe has enough resources
    if (tribe.resources < MECH_COST) {
        return false;
    }
    
    // Find a high value cell to deploy the mech
    const highValueCells = [];
    
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            const cell = gameBoard[y][x];
            
            if (cell.owner === tribeId && cell.highValue) {
                highValueCells.push({ x, y });
            }
        }
    }
    
    if (highValueCells.length === 0) {
        return false;
    }
    
    // Choose a random high value cell
    const deployCell = highValueCells[Math.floor(Math.random() * highValueCells.length)];
    
    // Create mech
    const mech = {
        owner: tribeId,
        x: deployCell.x,
        y: deployCell.y,
        health: MECH_INITIAL_HEALTH,
        hasMoved: false
    };
    
    mechs.push(mech);
    tribe.resources -= MECH_COST;
    
    addLogEntry(`在 (${deployCell.x},${deployCell.y}) 创建了一具高达`, tribeId);
    
    return true;
}

// Event listeners
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);
continueButton.addEventListener('click', continueGame);
resetButton.addEventListener('click', resetGame);

gameSpeedSlider.addEventListener('input', () => {
    gameSpeed = parseInt(gameSpeedSlider.value);
    
    if (gameRunning && !gamePaused) {
        clearInterval(gameInterval);
        gameInterval = setInterval(gameTick, 1000 / gameSpeed);
    }
});

// Window resize event for charts
window.addEventListener('resize', () => {
    // 使用防抖函数，避免频繁调整大小导致性能问题
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        if (territoryChart && resourcesChart && mechsChart) {
            try {
                territoryChart.resize();
                resourcesChart.resize();
                mechsChart.resize();
            } catch (e) {
                console.error("图表调整大小失败:", e);
                // 尝试重新初始化图表
                initCharts();
            }
        }
        
        // 重新渲染棋盘以更新高达位置
        renderBoard();
    }, 300); // 300毫秒延迟
});

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // 确保图表在加载完成后调整大小
    window.setTimeout(() => {
        try {
            if (territoryChart && resourcesChart && mechsChart) {
                territoryChart.resize();
                resourcesChart.resize();
                mechsChart.resize();
            }
        } catch (e) {
            console.error("初始化图表大小失败:", e);
            // 尝试重新初始化图表
            initCharts();
        }
    }, 300);
});

// 计算部落领地受到威胁的程度（0-1）
function calculateTerritoryThreat(tribeId) {
    // 减少计算频率，使用缓存的威胁值
    // 如果该部落有缓存的威胁值且缓存未过期，直接返回
    if (tribes[tribeId].cachedThreat && 
        tribes[tribeId].threatCacheTime && 
        turnCounter - tribes[tribeId].threatCacheTime < 10) {
        return tribes[tribeId].cachedThreat;
    }
    
    // 计算敌方高达与我方领地的接近程度
    let threatLevel = 0;
    
    // 如果没有领地，威胁为0
    if (tribes[tribeId].territory === 0) {
        tribes[tribeId].cachedThreat = 0;
        tribes[tribeId].threatCacheTime = turnCounter;
        return 0;
    }
    
    // 找到所有敌方高达
    const enemyMechs = mechs.filter(m => m.owner !== tribeId);
    
    // 如果没有敌方高达，威胁为0
    if (enemyMechs.length === 0) {
        tribes[tribeId].cachedThreat = 0;
        tribes[tribeId].threatCacheTime = turnCounter;
        return 0;
    }
    
    // 收集所有己方领地单元格的边界点
    // 只检查边界点可以大幅减少计算量
    const boundaryPoints = [];
    
    // 如果高达数量和领地数量都很多，使用抽样方法
    if (enemyMechs.length > 10 && tribes[tribeId].territory > 50) {
        // 收集所有己方领地
        const ownedCells = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (gameBoard[y][x].owner === tribeId) {
                    // 检查是否为边界点（至少有一个相邻点不属于己方）
                    const neighbors = getNeighbors(x, y);
                    const isBoundary = neighbors.some(n => {
                        const neighborCell = gameBoard[n.y][n.x];
                        return neighborCell.owner !== tribeId;
                    });
                    
                    if (isBoundary) {
                        ownedCells.push({ x, y });
                    }
                }
            }
        }
        
        // 随机抽取最多30个边界点
        const sampleSize = Math.min(30, ownedCells.length);
        for (let i = 0; i < sampleSize; i++) {
            const randomIndex = Math.floor(Math.random() * ownedCells.length);
            boundaryPoints.push(ownedCells[randomIndex]);
            ownedCells.splice(randomIndex, 1);
        }
    } else {
        // 收集所有边界点
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (gameBoard[y][x].owner === tribeId) {
                    // 检查是否为边界点
                    const neighbors = getNeighbors(x, y);
                    const isBoundary = neighbors.some(n => {
                        const neighborCell = gameBoard[n.y][n.x];
                        return neighborCell.owner !== tribeId;
                    });
                    
                    if (isBoundary) {
                        boundaryPoints.push({ x, y });
                    }
                }
            }
        }
    }
    
    // 如果敌方高达数量很多，只考虑最近的10个
    let mechsToCheck = enemyMechs;
    if (enemyMechs.length > 10) {
        // 对每个边界点，找到最近的敌方高达
        const mechDistances = new Map(); // 存储每个高达的最小距离
        
        boundaryPoints.forEach(point => {
            enemyMechs.forEach(mech => {
                const dist = Math.sqrt(Math.pow(mech.x - point.x, 2) + Math.pow(mech.y - point.y, 2));
                const currentMin = mechDistances.get(mech) || Infinity;
                mechDistances.set(mech, Math.min(currentMin, dist));
            });
        });
        
        // 根据最小距离排序高达
        mechsToCheck = Array.from(mechDistances.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, 10)
            .map(entry => entry[0]);
    }
    
    // 计算每个敌方高达与最近的己方边界点的距离
    mechsToCheck.forEach(mech => {
        let minDist = Infinity;
        boundaryPoints.forEach(point => {
            const dist = Math.sqrt(Math.pow(mech.x - point.x, 2) + Math.pow(mech.y - point.y, 2));
            minDist = Math.min(minDist, dist);
        });
        
        // 根据距离计算威胁度
        // 距离小于15的高达构成威胁，距离越小威胁越大
        if (minDist < 15) {
            // 距离为0时威胁为1，距离为15时威胁为0
            const mechThreat = Math.max(0, (15 - minDist) / 15);
            // 累加威胁，但给予一定衰减以避免多个远距离高达导致过高威胁
            threatLevel += mechThreat * mechThreat;
        }
    });
    
    // 标准化威胁度到0-1范围
    const normalizedThreat = Math.min(1, threatLevel);
    
    // 缓存计算结果
    tribes[tribeId].cachedThreat = normalizedThreat;
    tribes[tribeId].threatCacheTime = turnCounter;
    
    return normalizedThreat;
}

// 计算部落领地紧凑度
function calculateTerritoryCompactness(tribeId) {
    let ownedCells = [];
    
    // Find all cells owned by this tribe
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (gameBoard[y][x].owner === tribeId) {
                ownedCells.push({ x, y });
            }
        }
    }
    
    if (ownedCells.length <= 1) {
        return 1; // Maximum compactness for a single cell
    }
    
    // Calculate center of mass
    let centerX = 0;
    let centerY = 0;
    
    ownedCells.forEach(cell => {
        centerX += cell.x;
        centerY += cell.y;
    });
    
    centerX /= ownedCells.length;
    centerY /= ownedCells.length;
    
    // Calculate average distance from center of mass
    let totalDistance = 0;
    
    ownedCells.forEach(cell => {
        const distance = Math.sqrt(Math.pow(cell.x - centerX, 2) + Math.pow(cell.y - centerY, 2));
        totalDistance += distance;
    });
    
    const avgDistance = totalDistance / ownedCells.length;
    
    // Normalize compactness: smaller average distance means more compact territory
    // Use a simple inverse relationship with a cap
    return Math.min(1, Math.sqrt(ownedCells.length) / (avgDistance + 1));
}

// Count how many adjacent cells are owned by the same tribe
function countAdjacentOwnedCells(x, y, tribeId) {
    const neighbors = getNeighbors(x, y);
    let count = 0;
    
    neighbors.forEach(n => {
        const cell = gameBoard[n.y][n.x];
        if (cell.owner === tribeId) {
            count++;
        }
    });
    
    return count;
}

// 创建一个新的经济优先扩张策略函数
function handleEconomicGrowthState(tribe, effectiveResources, mechCount, upgradableCells, expandableCells, reachableHighValueCells, ownedHighValueCells) {
    // 经济优先扩张策略：平衡经济发展和领土扩张，优先考虑高价值点和资源收入
    
    // 第一优先级：升级现有高价值点到最高等级
    // 先升级等级较高的点，因为它们能提供更多收入
    if (upgradableCells.length > 0) {
        // 按等级从高到低排序，优先升级接近最高等级的点
        upgradableCells.sort((a, b) => b.level - a.level);
        
        // 找出接近最高等级的点
        const highLevelCells = upgradableCells.filter(cell => cell.level >= MAX_UPGRADE_LEVEL - 1);
        
        if (highLevelCells.length > 0) {
            const cellToUpgrade = highLevelCells[0];
            const upgradeCost = Math.pow(UPGRADE_COST_MULTIPLIER, cellToUpgrade.level);
            
            if (effectiveResources >= upgradeCost) {
                upgradeCell(tribe.id, cellToUpgrade.x, cellToUpgrade.y);
                addLogEntry(`经济优先：将高价值点升级到最高等级`, tribe.id);
                return;
            }
        }
        
        // 如果没有接近最高等级的点，则升级任何可升级的点
        // 此时按等级从低到高排序，优先升级低等级点(投资回报率更高)
        upgradableCells.sort((a, b) => a.level - b.level);
        const cellToUpgrade = upgradableCells[0];
        const upgradeCost = Math.pow(UPGRADE_COST_MULTIPLIER, cellToUpgrade.level);
        
        if (effectiveResources >= upgradeCost * 1.2) { // 保留一些资源用于扩张
            upgradeCell(tribe.id, cellToUpgrade.x, cellToUpgrade.y);
            addLogEntry(`经济优先：升级低等级高价值点提高收入`, tribe.id);
            return;
        }
    }
    
    // 第二优先级：扩张到附近的高价值点
    if (reachableHighValueCells.length > 0 && effectiveResources > EXPANSION_COST) {
        // 按距离和潜在价值排序
        reachableHighValueCells.sort((a, b) => {
            // 首先考虑距离
            const aDistance = getMinDistanceToOwnedCells(a.x, a.y, tribe.id);
            const bDistance = getMinDistanceToOwnedCells(b.x, b.y, tribe.id);
            
            // 如果距离相差不大，优先考虑周围有更多空格的高价值点（有更大扩张潜力）
            if (Math.abs(aDistance - bDistance) <= 2) {
                const aEmptyNeighbors = getNeighbors(a.x, a.y).filter(n => 
                    gameBoard[n.y][n.x].owner === null
                ).length;
                
                const bEmptyNeighbors = getNeighbors(b.x, b.y).filter(n => 
                    gameBoard[n.y][n.x].owner === null
                ).length;
                
                return bEmptyNeighbors - aEmptyNeighbors;
            }
            
            return aDistance - bDistance;
        });
        
        expandToCell(tribe.id, reachableHighValueCells[0].x, reachableHighValueCells[0].y);
        addLogEntry(`经济优先：扩张到高价值点增加收入`, tribe.id);
        return;
    }
    
    // 第三优先级：战略性扩张，优先考虑能形成更紧凑领地的格子
    if (expandableCells.length > 0 && effectiveResources > EXPANSION_COST * 1.5) {
        // 计算当前领地的紧凑度
        const currentCompactness = calculateTerritoryCompactness(tribe.id);
        
        // 按照以下标准对可扩张格子进行排序：
        // 1. 高价值点优先
        // 2. 能提高领地紧凑度的优先
        // 3. 与更多己方格子相邻的优先
        expandableCells.sort((a, b) => {
            // 高价值点优先
            if (a.highValue && !b.highValue) return -1;
            if (!a.highValue && b.highValue) return 1;
            
            // 计算连通性
            const aConnectivity = countAdjacentOwnedCells(a.x, a.y, tribe.id);
            const bConnectivity = countAdjacentOwnedCells(b.x, b.y, tribe.id);
            
            // 高连通性优先
            return bConnectivity - aConnectivity;
        });
        
        // 计算可以扩张的数量，保守扩张以保持资源积累
        const maxExpansions = Math.min(
            expandableCells.length,
            Math.floor(Math.log2(effectiveResources / EXPANSION_COST))
        );
        
        if (maxExpansions > 0) {
            // 扩张数量根据资源情况动态调整，但保持保守
            const numExpansions = Math.min(2, Math.ceil(maxExpansions / 2));
            let expansionCost = 0;
            
            for (let i = 0; i < numExpansions && i < expandableCells.length; i++) {
                const cell = expandableCells[i];
                const thisCost = Math.pow(2, i);
                
                if (effectiveResources >= thisCost + expansionCost + EXPANSION_COST) { // 保留一些资源
                    expandToCell(tribe.id, cell.x, cell.y);
                    expansionCost += thisCost;
                } else {
                    break;
                }
            }
            
            addLogEntry(`经济优先：战略性扩张，保持资源积累`, tribe.id);
            return;
        }
    }
    
    // 第四优先级：积累资源，为未来大规模升级或扩张做准备
    // 如果资源较少或没有好的扩张/升级选择，就保存资源
    if (effectiveResources < MECH_COST * 0.8 || 
        (upgradableCells.length === 0 && reachableHighValueCells.length === 0)) {
        addLogEntry(`经济优先：积累资源为未来发展做准备`, tribe.id);
        return;
    }
    
    // 第五优先级：在资源充足且没有好的扩张/升级选择时，考虑制造高达
    if (tribe.resources >= MECH_COST * 2.0 && 
        tribe.territory >= 30 && 
        tribe.income / (tribe.expenses + MECH_MAINTENANCE) >= 3.0 &&
        mechCount < Math.floor(tribe.territory / 40)) {
        createMech(tribe.id);
        addLogEntry(`经济优先：资源充足，制造高达保护领地`, tribe.id);
    }
}

// 主动检查并回收高达以避免经济破产
function checkAndRecycleMechs(tribeId) {
    const tribe = tribes[tribeId];
    const tribeMechs = mechs.filter(m => m.owner === tribeId);
    
    // 如果没有高达，无需回收
    if (tribeMechs.length === 0) {
        return;
    }
    
    // 计算经济指标
    const incomePerTurn = tribe.income;
    const expensesPerTurn = tribe.expenses;
    const resourceBalance = tribe.resources;
    const turnsUntilBankrupt = resourceBalance > 0 ? resourceBalance / Math.max(1, (expensesPerTurn - incomePerTurn)) : 0;
    
    // 经济危机判断条件
    const isEconomicCrisis = 
        (incomePerTurn < expensesPerTurn && resourceBalance < expensesPerTurn * 3) || // 入不敷出且资源少于3回合支出
        (turnsUntilBankrupt > 0 && turnsUntilBankrupt < 5) || // 5回合内将破产
        (resourceBalance < 0); // 已经破产
    
    // 经济警戒判断条件
    const isEconomicWarning =
        (incomePerTurn < expensesPerTurn && resourceBalance < expensesPerTurn * 8) || // 入不敷出且资源少于8回合支出
        (turnsUntilBankrupt > 0 && turnsUntilBankrupt < 10); // 10回合内将破产
    
    if (isEconomicCrisis) {
        // 经济危机：回收多个高达以立即恢复经济
        const mechsToRecycle = Math.min(
            tribeMechs.length, 
            Math.ceil(tribeMechs.length * 0.4) // 回收约40%的高达
        );
        
        if (mechsToRecycle > 0) {
            // 按照生命值排序，优先回收生命值较低的高达
            tribeMechs.sort((a, b) => a.health - b.health);
            
            for (let i = 0; i < mechsToRecycle; i++) {
                const mechToRecycle = tribeMechs[i];
                const mechIndex = mechs.indexOf(mechToRecycle);
                
                if (mechIndex !== -1) {
                    mechs.splice(mechIndex, 1);
                    tribe.resources += MECH_SALVAGE_VALUE;
                    addLogEntry(`经济危机！主动回收生命值为 ${mechToRecycle.health} 的高达，获得 ${MECH_SALVAGE_VALUE} 资源`, tribe.id);
                }
            }
            
            // 更新支出
            tribe.expenses = mechs.filter(m => m.owner === tribe.id).length * MECH_MAINTENANCE;
        }
    } else if (isEconomicWarning && tribeMechs.length >= 3) {
        // 经济警戒：回收少量高达作为预防措施
        const mechsToRecycle = Math.min(
            tribeMechs.length - 2, // 至少保留2个高达
            Math.ceil(tribeMechs.length * 0.2) // 回收约20%的高达
        );
        
        if (mechsToRecycle > 0) {
            // 按照生命值排序，优先回收生命值较低的高达
            tribeMechs.sort((a, b) => a.health - b.health);
            
            for (let i = 0; i < mechsToRecycle; i++) {
                const mechToRecycle = tribeMechs[i];
                const mechIndex = mechs.indexOf(mechToRecycle);
                
                if (mechIndex !== -1) {
                    mechs.splice(mechIndex, 1);
                    tribe.resources += MECH_SALVAGE_VALUE;
                    addLogEntry(`经济警戒！主动回收生命值为 ${mechToRecycle.health} 的高达，获得 ${MECH_SALVAGE_VALUE} 资源`, tribe.id);
                }
            }
            
            // 更新支出
            tribe.expenses = mechs.filter(m => m.owner === tribe.id).length * MECH_MAINTENANCE;
        }
    }
}