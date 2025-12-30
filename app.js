// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И КОНСТАНТЫ ====================
const DIFFICULTY_POINTS = {1: 10, 2: 20, 3: 30, 4: 40, 5: 50};
const STORAGE_KEY = 'familyArbitratorData';

// Начальные данные для примера
const INITIAL_DATA = {
    familyName: "Семья Ивановых",
    users: [
        {id: 1, name: "Папа", role: "adult", points: 150, completedTasks: 5},
        {id: 2, name: "Мама", role: "adult", points: 180, completedTasks: 6},
        {id: 3, name: "Катя", role: "teen", points: 90, completedTasks: 8},
        {id: 4, name: "Аня", role: "child", points: 60, completedTasks: 6}
    ],
    tasks: [
        {id: 1, name: "Помыть посуду", difficulty: 2, assignedTo: null, completed: false, dateAssigned: null},
        {id: 2, name: "Вынести мусор", difficulty: 1, assignedTo: null, completed: false, dateAssigned: null},
        {id: 3, name: "Пропылесосить в зале", difficulty: 3, assignedTo: null, completed: false, dateAssigned: null},
        {id: 4, name: "Помыть полы на кухне", difficulty: 3, assignedTo: null, completed: false, dateAssigned: null},
        {id: 5, name: "Приготовить ужин", difficulty: 4, assignedTo: null, completed: false, dateAssigned: null},
        {id: 6, name: "Собрать игрушки", difficulty: 1, assignedTo: null, completed: false, dateAssigned: null},
        {id: 7, name: "Полить цветы", difficulty: 2, assignedTo: null, completed: false, dateAssigned: null},
        {id: 8, name: "Сходить за хлебом", difficulty: 2, assignedTo: null, completed: false, dateAssigned: null}
    ],
    rewards: [
        {id: 1, name: "Выбор фильма на вечер", cost: 100, purchased: []},
        {id: 2, name: "+30 минут за компьютером", cost: 150, purchased: []},
        {id: 3, name: "Освобождение от 1 задачи", cost: 200, purchased: []},
        {id: 4, name: "Любимое мороженое", cost: 80, purchased: []},
        {id: 5, name: "Поход в кино", cost: 400, purchased: []},
        {id: 6, name: "Поездка в парк аттракционов", cost: 600, purchased: []}
    ],
    purchases: [],
    nextId: {users: 5, tasks: 9, rewards: 7}
};

// ==================== УПРАВЛЕНИЕ ДАННЫМИ ====================
let appData = loadData();

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateUI();
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        return JSON.parse(saved);
    } else {
        // Если данных нет, сохраняем начальные данные
        saveData();
        return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
}

function resetData() {
    if (confirm("Вы уверены? Все данные будут удалены!")) {
        localStorage.removeItem(STORAGE_KEY);
        appData = JSON.parse(JSON.stringify(INITIAL_DATA));
        saveData();
        showNotification("Данные сброшены!", "success");
    }
}

function exportData() {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `семейный_арбитр_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification("Данные экспортированы!", "success");
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            appData = importedData;
            saveData();
            showNotification("Данные успешно импортированы!", "success");
        } catch (error) {
            showNotification("Ошибка при импорте файла", "error");
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ ====================
function getCurrentUserId() {
    const userSelect = document.getElementById('userSelect');
    return userSelect ? parseInt(userSelect.value) : 1;
}

function getUserById(id) {
    return appData.users.find(user => user.id === id);
}

function getTaskById(id) {
    return appData.tasks.find(task => task.id === id);
}

function getRewardById(id) {
    return appData.rewards.find(reward => reward.id === id);
}

function assignTaskToUser(taskId, userId) {
    const task = getTaskById(taskId);
    if (task) {
        task.assignedTo = userId;
        task.completed = false;
        task.dateAssigned = new Date().toISOString().split('T')[0];
        saveData();
    }
}

function completeTask(taskId) {
    const task = getTaskById(taskId);
    const user = getUserById(task.assignedTo);
    
    if (task && user && !task.completed) {
        task.completed = true;
        const pointsEarned = DIFFICULTY_POINTS[task.difficulty];
        user.points += pointsEarned;
        user.completedTasks = (user.completedTasks || 0) + 1;
        
        saveData();
        showNotification(`${user.name} получил ${pointsEarned} баллов за задачу "${task.name}"!`, "success");
        return true;
    }
    return false;
}

function purchaseReward(userId, rewardId) {
    const user = getUserById(userId);
    const reward = getRewardById(rewardId);
    
    if (!user || !reward) return false;
    
    if (user.points >= reward.cost) {
        user.points -= reward.cost;
        reward.purchased.push({
            userId: userId,
            date: new Date().toISOString().split('T')[0]
        });
        
        appData.purchases.push({
            userId: userId,
            rewardId: rewardId,
            date: new Date().toISOString().split('T')[0]
        });
        
        saveData();
        showNotification(`${user.name} купил(а) "${reward.name}" за ${reward.cost} баллов!`, "success");
        return true;
    } else {
        showNotification(`Недостаточно баллов! Нужно ещё ${reward.cost - user.points}`, "warning");
        return false;
    }
}

function drawRandomTaskForUser(userId) {
    const user = getUserById(userId);
    if (!user) return null;
    
    // Определяем максимальную сложность по возрасту
    let maxDifficulty = 5;
    if (user.role === 'child') maxDifficulty = 2;
    if (user.role === 'teen') maxDifficulty = 3;
    
    // Находим нераспределенные задачи подходящей сложности
    const availableTasks = appData.tasks.filter(task => 
        task.assignedTo === null && task.difficulty <= maxDifficulty
    );
    
    if (availableTasks.length === 0) return null;
    
    // Выбираем случайную задачу
    const randomIndex = Math.floor(Math.random() * availableTasks.length);
    const selectedTask = availableTasks[randomIndex];
    
    assignTaskToUser(selectedTask.id, userId);
    return selectedTask;
}

function drawTasksForAll() {
    const results = [];
    const shuffledUsers = [...appData.users].sort(() => Math.random() - 0.5);
    
    for (const user of shuffledUsers) {
        const task = drawRandomTaskForUser(user.id);
        if (task) {
            results.push({userId: user.id, taskId: task.id});
        }
    }
    
    if (results.length > 0) {
        showNotification(`Задачи распределены для ${results.length} членов семьи!`, "success");
    }
    
    return results;
}

// ==================== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ====================
function updateUI() {
    updateUserSelect();
    updateUserTasks();
    updatePointsDisplay();
    updateDrawResults();
    updateRewardsList();
    updatePurchaseHistory();
    updateStatistics();
    updateLeaderboard();
    updateUsersList();
    updateTasksList();
    updateRewardsAdminList();
    updateFamilyName();
}

function updateFamilyName() {
    document.getElementById('familyNameDisplay').textContent = appData.familyName;
}

function updateUserSelect() {
    const userSelect = document.getElementById('userSelect');
    if (!userSelect) return;
    
    userSelect.innerHTML = '';
    appData.users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.name} (${user.points} баллов)`;
        userSelect.appendChild(option);
    });
    
    // Выбираем первого пользователя по умолчанию
    if (appData.users.length > 0 && !userSelect.value) {
        userSelect.value = appData.users[0].id;
    }
}

function updateUserTasks() {
    const userId = getCurrentUserId();
    const tasksContainer = document.getElementById('userTasks');
    if (!tasksContainer) return;
    
    const userTasks = appData.tasks.filter(task => 
        task.assignedTo === userId && !task.completed
    );
    
    if (userTasks.length === 0) {
        tasksContainer.innerHTML = '<div class="empty-state">У вас нет задач на сегодня! 🎉</div>';
        return;
    }
    
    tasksContainer.innerHTML = '';
    userTasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
            <div class="task-info">
                <h4>${task.name}</h4>
                <span class="task-difficulty difficulty-${task.difficulty}">${'★'.repeat(task.difficulty)}</span>
                <span class="task-date">Назначена: ${task.dateAssigned || 'сегодня'}</span>
            </div>
            <div class="task-points">+${DIFFICULTY_POINTS[task.difficulty]} баллов</div>
            <div class="task-actions">
                <button class="task-complete" data-task-id="${task.id}">Выполнено</button>
                <button class="task-skip" data-task-id="${task.id}">Пропустить</button>
            </div>
        `;
        tasksContainer.appendChild(taskElement);
    });
    
    // Добавляем обработчики событий
    document.querySelectorAll('.task-complete').forEach(button => {
        button.addEventListener('click', function() {
            const taskId = parseInt(this.dataset.taskId);
            completeTask(taskId);
        });
    });
    
    document.querySelectorAll('.task-skip').forEach(button => {
        button.addEventListener('click', function() {
            const taskId = parseInt(this.dataset.taskId);
            const task = getTaskById(taskId);
            if (task) {
                task.assignedTo = null;
                saveData();
                showNotification("Задача отменена", "warning");
            }
        });
    });
}

function updatePointsDisplay() {
    const userId = getCurrentUserId();
    const user = getUserById(userId);
    const pointsElement = document.getElementById('userPoints');
    
    if (pointsElement && user) {
        pointsElement.textContent = user.points;
    }
}

function updateDrawResults() {
    const resultsContainer = document.getElementById('drawResults');
    if (!resultsContainer) return;
    
    // Находим задачи, распределенные сегодня
    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = appData.tasks.filter(task => 
        task.assignedTo !== null && task.dateAssigned === today && !task.completed
    );
    
    if (todaysTasks.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state">Сегодня задачи ещё не распределялись.</div>';
        return;
    }
    
    resultsContainer.innerHTML = '';
    todaysTasks.forEach(task => {
        const user = getUserById(task.assignedTo);
        if (!user) return;
        
        const resultElement = document.createElement('div');
        resultElement.className = 'draw-result-item';
        resultElement.innerHTML = `
            <div>
                <strong>${user.name}</strong> → ${task.name}
            </div>
            <div class="task-difficulty difficulty-${task.difficulty}">
                ${'★'.repeat(task.difficulty)}
            </div>
        `;
        resultsContainer.appendChild(resultElement);
    });
}

function updateRewardsList() {
    const rewardsContainer = document.getElementById('rewardsList');
    if (!rewardsContainer) return;
    
    const userId = getCurrentUserId();
    const user = getUserById(userId);
    
    rewardsContainer.innerHTML = '';
    appData.rewards.forEach(reward => {
        const canBuy = user && user.points >= reward.cost;
        const rewardElement = document.createElement('div');
        rewardElement.className = 'reward-item';
        rewardElement.innerHTML = `
            <h4>${reward.name}</h4>
            <div class="reward-cost">${reward.cost} баллов</div>
            <p>Куплено: ${reward.purchased.length} раз</p>
            <button class="reward-buy" data-reward-id="${reward.id}" ${canBuy ? '' : 'disabled'}>
                ${canBuy ? 'Купить' : 'Недостаточно баллов'}
            </button>
        `;
        rewardsContainer.appendChild(rewardElement);
    });
    
    // Добавляем обработчики событий
    document.querySelectorAll('.reward-buy').forEach(button => {
        button.addEventListener('click', function() {
            const rewardId = parseInt(this.dataset.rewardId);
            purchaseReward(userId, rewardId);
        });
    });
}

function updatePurchaseHistory() {
    const historyContainer = document.getElementById('purchaseHistory');
    if (!historyContainer) return;
    
    const recentPurchases = [...appData.purchases]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
    if (recentPurchases.length === 0) {
        historyContainer.innerHTML = '<div class="empty-state">Покупок ещё не было.</div>';
        return;
    }
    
    historyContainer.innerHTML = '';
    recentPurchases.forEach(purchase => {
        const user = getUserById(purchase.userId);
        const reward = getRewardById(purchase.rewardId);
        
        if (!user || !reward) return;
        
        const historyElement = document.createElement('div');
        historyElement.className = 'purchase-history-item';
        historyElement.innerHTML = `
            <div><strong>${user.name}</strong> → ${reward.name}</div>
            <div class="purchase-date">${purchase.date}</div>
        `;
        historyContainer.appendChild(historyElement);
    });
}

function updateStatistics() {
    // Общие баллы семьи
    const totalPoints = appData.users.reduce((sum, user) => sum + user.points, 0);
    document.getElementById('totalFamilyPoints').textContent = totalPoints;
    
    // Выполнено задач за неделю
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const weeklyCompleted = appData.tasks.filter(task => 
        task.completed && task.dateAssigned && task.dateAssigned >= weekAgoStr
    ).length;
    
    document.getElementById('weeklyCompleted').textContent = weeklyCompleted;
    
    // Самая популярная награда
    if (appData.rewards.length > 0) {
        const popularReward = [...appData.rewards].sort((a, b) => 
            b.purchased.length - a.purchased.length
        )[0];
        
        document.getElementById('popularReward').textContent = 
            `${popularReward.name} (куплена ${popularReward.purchased.length} раз)`;
    }
}

function updateLeaderboard() {
    const leaderboardBody = document.querySelector('#leaderboardTable tbody');
    if (!leaderboardBody) return;
    
    const sortedUsers = [...appData.users].sort((a, b) => b.points - a.points);
    
    leaderboardBody.innerHTML = '';
    sortedUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${user.name}</strong></td>
            <td>${user.points}</td>
            <td>${user.completedTasks || 0}</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

function updateUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    appData.users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'list-item';
        userElement.innerHTML = `
            <div>
                <strong>${user.name}</strong>
                <div class="user-details">
                    ${getRoleName(user.role)} • ${user.points} баллов
                </div>
            </div>
            <div class="list-item-actions">
                <button class="delete-btn" data-user-id="${user.id}">Удалить</button>
            </div>
        `;
        usersList.appendChild(userElement);
    });
    
    // Добавляем обработчики событий
    document.querySelectorAll('#usersList .delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = parseInt(this.dataset.userId);
            if (appData.users.length <= 1) {
                showNotification("Нельзя удалить последнего пользователя!", "error");
                return;
            }
            
            if (confirm(`Удалить пользователя ${getUserById(userId).name}?`)) {
                appData.users = appData.users.filter(user => user.id !== userId);
                saveData();
                showNotification("Пользователь удален", "success");
            }
        });
    });
}

function updateTasksList() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;
    
    tasksList.innerHTML = '';
    appData.tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'list-item';
        taskElement.innerHTML = `
            <div>
                <strong>${task.name}</strong>
                <div class="task-details">
                    Сложность: ${'★'.repeat(task.difficulty)} • ${DIFFICULTY_POINTS[task.difficulty]} баллов
                    ${task.assignedTo ? ` • Назначена: ${getUserById(task.assignedTo)?.name}` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="delete-btn" data-task-id="${task.id}">Удалить</button>
            </div>
        `;
        tasksList.appendChild(taskElement);
    });
    
    // Добавляем обработчики событий
    document.querySelectorAll('#tasksList .delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const taskId = parseInt(this.dataset.taskId);
            if (confirm("Удалить эту задачу?")) {
                appData.tasks = appData.tasks.filter(task => task.id !== taskId);
                saveData();
                showNotification("Задача удалена", "success");
            }
        });
    });
}

function updateRewardsAdminList() {
    const rewardsList = document.getElementById('rewardsAdminList');
    if (!rewardsList) return;
    
    rewardsList.innerHTML = '';
    appData.rewards.forEach(reward => {
        const rewardElement = document.createElement('div');
        rewardElement.className = 'list-item';
        rewardElement.innerHTML = `
            <div>
                <strong>${reward.name}</strong>
                <div class="reward-details">
                    ${reward.cost} баллов • Куплена: ${reward.purchased.length} раз
                </div>
            </div>
            <div class="list-item-actions">
                <button class="delete-btn" data-reward-id="${reward.id}">Удалить</button>
            </div>
        `;
        rewardsList.appendChild(rewardElement);
    });
    
    // Добавляем обработчики событий
    document.querySelectorAll('#rewardsAdminList .delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const rewardId = parseInt(this.dataset.rewardId);
            if (confirm("Удалить эту награду?")) {
                appData.rewards = appData.rewards.filter(reward => reward.id !== rewardId);
                saveData();
                showNotification("Награда удалена", "success");
            }
        });
    });
}

function getRoleName(role) {
    const roles = {
        'child': 'Ребенок',
        'teen': 'Подросток',
        'adult': 'Взрослый'
    };
    return roles[role] || role;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = 'notification show ' + type;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ==================== АНИМАЦИЯ КОЛЕСА ====================
function spinWheel() {
    const wheel = document.getElementById('wheel');
    if (!wheel) return;
    
    wheel.classList.add('spinning');
    
    // Случайным образом выбираем пользователя и задачу
    const availableUsers = appData.users.filter(user => 
        user.role !== 'child' || Math.random() > 0.5
    );
    
    if (availableUsers.length === 0) return;
    
    const randomUserIndex = Math.floor(Math.random() * availableUsers.length);
    const selectedUser = availableUsers[randomUserIndex];
    const task = drawRandomTaskForUser(selectedUser.id);
    
    setTimeout(() => {
        wheel.classList.remove('spinning');
        
        if (task) {
            showNotification(`${selectedUser.name} получает задачу: "${task.name}"!`, "success");
            // Обновляем интерфейс после анимации
            setTimeout(updateUI, 500);
        }
    }, 3000);
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ И ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    // Переключение вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Убираем активный класс у всех вкладок и контента
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Добавляем активный класс выбранной вкладке и контенту
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Обновляем данные на активной вкладке
            updateUI();
        });
    });
    
    // Выбор пользователя
    const userSelect = document.getElementById('userSelect');
    if (userSelect) {
        userSelect.addEventListener('change', updateUI);
    }
    
    // Жребий: распределить для одного
    document.getElementById('drawSingle').addEventListener('click', function() {
        const userId = getCurrentUserId();
        const task = drawRandomTaskForUser(userId);
        
        if (task) {
            const user = getUserById(userId);
            showNotification(`${user.name} получает задачу: "${task.name}"`, "success");
            updateUI();
        } else {
            showNotification("Нет доступных задач для этого пользователя", "warning");
        }
    });
    
    // Жребий: распределить для всех
    document.getElementById('drawAll').addEventListener('click', function() {
        drawTasksForAll();
        updateUI();
    });
    
    // Очистить распределение
    document.getElementById('clearDraw').addEventListener('click', function() {
        if (confirm("Очистить все распределенные задачи?")) {
            appData.tasks.forEach(task => {
                task.assignedTo = null;
                task.completed = false;
            });
            saveData();
            showNotification("Распределение очищено", "success");
        }
    });
    
    // Крутить колесо
    document.getElementById('spinWheel').addEventListener('click', spinWheel);
    
    // Управление: добавление пользователя
    document.getElementById('addUser').addEventListener('click', function() {
        const nameInput = document.getElementById('newUserName');
        const roleSelect = document.getElementById('newUserRole');
        
        const name = nameInput.value.trim();
        const role = roleSelect.value;
        
        if (!name) {
            showNotification("Введите имя пользователя", "error");
            return;
        }
        
        const newUser = {
            id: appData.nextId.users++,
            name: name,
            role: role,
            points: 0,
            completedTasks: 0
        };
        
        appData.users.push(newUser);
        saveData();
        
        nameInput.value = '';
        showNotification(`Пользователь ${name} добавлен`, "success");
    });
    
    // Управление: добавление задачи
    document.getElementById('addTask').addEventListener('click', function() {
        const nameInput = document.getElementById('newTaskName');
        const difficultySelect = document.getElementById('newTaskDifficulty');
        
        const name = nameInput.value.trim();
        const difficulty = parseInt(difficultySelect.value);
        
        if (!name) {
            showNotification("Введите название задачи", "error");
            return;
        }
        
        const newTask = {
            id: appData.nextId.tasks++,
            name: name,
            difficulty: difficulty,
            assignedTo: null,
            completed: false,
            dateAssigned: null
        };
        
        appData.tasks.push(newTask);
        saveData();
        
        nameInput.value = '';
        showNotification(`Задача "${name}" добавлена`, "success");
    });
    
    // Управление: добавление награды
    document.getElementById('addReward').addEventListener('click', function() {
        const nameInput = document.getElementById('newRewardName');
        const costInput = document.getElementById('newRewardCost');
        
        const name = nameInput.value.trim();
        const cost = parseInt(costInput.value);
        
        if (!name) {
            showNotification("Введите название награды", "error");
            return;
        }
        
        if (isNaN(cost) || cost < 10 || cost > 5000) {
            showNotification("Стоимость должна быть от 10 до 5000 баллов", "error");
            return;
        }
        
        const newReward = {
            id: appData.nextId.rewards++,
            name: name,
            cost: cost,
            purchased: []
        };
        
        appData.rewards.push(newReward);
        saveData();
        
        nameInput.value = '';
        costInput.value = '100';
        showNotification(`Награда "${name}" добавлена`, "success");
    });
    
    // Управление: сброс данных
    document.getElementById('resetData').addEventListener('click', resetData);
    
    // Управление: экспорт данных
    document.getElementById('exportData').addEventListener('click', exportData);
    
    // Управление: импорт данных
    document.getElementById('importData').addEventListener('click', function() {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            importData(e.target.files[0]);
            e.target.value = ''; // Сбрасываем значение input
        }
    });
    
    // Инициализация приложения
    updateUI();
    
    // Показываем приветственное сообщение при первом запуске
    if (!localStorage.getItem(STORAGE_KEY)) {
        setTimeout(() => {
            showNotification("Добро пожаловать в Семейный Арбитр! Начните с добавления задач в разделе Управление.", "success");
        }, 1000);
    }
});
