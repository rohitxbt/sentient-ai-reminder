document.addEventListener('DOMContentLoaded', function() {
    const taskInput = document.getElementById('taskInput');
    const contextInput = document.getElementById('contextInput');
    const addTaskBtn = document.getElementById('addTask');
    const loading = document.getElementById('loading');
    const status = document.getElementById('status');
    const tasksList = document.getElementById('tasksList');
    const testNotificationBtn = document.getElementById('testNotification');
    const clearAllBtn = document.getElementById('clearAll');

    // Load existing tasks
    loadTasks();

    // Add task button handler
    addTaskBtn.addEventListener('click', async function() {
        const taskText = taskInput.value.trim();
        
        if (!taskText) {
            showStatus('Kuch toh likh diye task!', 'error');
            return;
        }

        setLoading(true);
        
        try {
            // Send to background script for AI processing
            const response = await chrome.runtime.sendMessage({
                action: 'processTask',
                task: taskText,
                context: contextInput.value.trim()
            });

            if (response.success) {
                showStatus('✅ AI ne samaj liya! Reminders set kar diye', 'success');
                taskInput.value = '';
                contextInput.value = '';
                loadTasks();
            } else {
                throw new Error(response.error);
            }
        } catch (error) {
            console.error('Task processing error:', error);
            showStatus('❌ Error: ' + error.message, 'error');
        }
        
        setLoading(false);
    });

    // Test notification
    testNotificationBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({
            action: 'testNotification'
        });
        showStatus('🔔 Test notification bhej diya!', 'success');
    });

    // Clear all tasks
    clearAllBtn.addEventListener('click', function() {
        if (confirm('Sare reminders delete kar dena hai?')) {
            chrome.runtime.sendMessage({
                action: 'clearAllTasks'
            });
            loadTasks();
            showStatus('🗑️ Sab clear kar diya!', 'success');
        }
    });

    // Enter key handler for textarea
    taskInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            addTaskBtn.click();
        }
    });

    function setLoading(isLoading) {
        if (isLoading) {
            loading.classList.add('show');
            addTaskBtn.disabled = true;
            addTaskBtn.querySelector('span').textContent = 'AI soch raha hai...';
        } else {
            loading.classList.remove('show');
            addTaskBtn.disabled = false;
            addTaskBtn.querySelector('span').textContent = '🎯 AI ko Task De';
        }
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status-message ${type}`;
        
        setTimeout(() => {
            status.classList.remove(type);
            status.style.display = 'none';
        }, 4000);
    }

    async function loadTasks() {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getTasks'
            });

            if (response && response.tasks) {
                displayTasks(response.tasks);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    function displayTasks(tasks) {
        tasksList.innerHTML = '';
        
        if (!tasks || tasks.length === 0) {
            tasksList.innerHTML = '<div class="no-tasks">No active reminders</div>';
            return;
        }

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            
            const nextReminder = task.reminders.find(r => r.time > Date.now());
            const timeText = nextReminder ? 
                `Next: ${new Date(nextReminder.time).toLocaleString('hi-IN')}` : 
                'Completed';
            
            taskElement.innerHTML = `
                <div class="task-text">${task.originalText}</div>
                <div class="task-time">${timeText}</div>
            `;
            
            tasksList.appendChild(taskElement);
        });
    }

    // Listen for updates from background script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'tasksUpdated') {
            loadTasks();
        }
    });
});