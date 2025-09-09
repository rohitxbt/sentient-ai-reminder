// Fireworks AI Configuration
const FIREWORKS_API_KEY = 'fw_3ZPqaBC8L78Zuc5V2TjrWQqM';
const FIREWORKS_MODEL = 'accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new';
const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';

// Sound for notifications
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcATuF1/LCdSoFKXPH8+CRQAMUV7Tp7adVFAdIo+LyvmEbATuE1vLDdioFKXPH8+CRSAY...';

class AIReminderService {
    constructor() {
        this.tasks = [];
        this.activeAlarms = new Set();
        this.initializeService();
    }

    async initializeService() {
        // Load saved tasks
        const result = await chrome.storage.local.get(['reminderTasks']);
        this.tasks = result.reminderTasks || [];
        
        // Set up existing alarms
        this.setupExistingAlarms();
        
        console.log('AI Reminder Service initialized');
    }

    async processTask(taskText, context = '') {
        try {
            const aiResponse = await this.callFireworksAI(taskText, context);
            const taskData = this.parseAIResponse(aiResponse, taskText);
            
            if (taskData) {
                await this.createReminders(taskData);
                return { success: true, data: taskData };
            } else {
                throw new Error('AI response parsing failed');
            }
        } catch (error) {
            console.error('Task processing failed:', error);
            throw error;
        }
    }

    async callFireworksAI(taskText, context) {
        const currentTime = new Date().toLocaleString('hi-IN');
        const currentDay = new Date().toLocaleDateString('hi-IN', { weekday: 'long' });
        
        const prompt = `आप एक बहुत ही समझदार AI assistant हैं जो user के tasks को समझकर reminder times suggest करते हैं।

Current Time: ${currentTime}
Current Day: ${currentDay}

User ने कहा: "${taskText}"
Context: ${context}

कृपया इस task को analyze करके निम्नलिखित JSON format में response दें:

{
    "tasks": [
        {
            "title": "task का short title",
            "description": "detailed description",
            "reminders": [
                {
                    "time": "YYYY-MM-DD HH:MM:SS",
                    "message": "reminder message",
                    "type": "beforehand/exact/followup"
                }
            ],
            "priority": "high/medium/low"
        }
    ]
}

Rules:
1. Time को current time से relative calculate करें
2. Important tasks के लिए multiple reminders set करें (beforehand + exact time)
3. Time format: YYYY-MM-DD HH:MM:SS (24-hour format)
4. Reminders को smart तरीके से set करें - meeting से 15-30 min पहले, deadlines के लिए day before भी
5. Message Hindi-English mix में natural लगना चाहिए
6. केवल JSON response दें, कोई extra text नहीं`;

        const response = await fetch(FIREWORKS_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIREWORKS_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: FIREWORKS_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`Fireworks AI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    parseAIResponse(aiResponse, originalText) {
        try {
            // Clean the response to extract JSON
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            // Add original text and ID to each task
            if (parsed.tasks) {
                parsed.tasks.forEach(task => {
                    task.id = Date.now() + Math.random();
                    task.originalText = originalText;
                    task.createdAt = Date.now();
                    
                    // Convert reminder times to timestamps
                    task.reminders.forEach(reminder => {
                        reminder.time = new Date(reminder.time).getTime();
                        reminder.id = Date.now() + Math.random();
                    });
                });
            }
            
            return parsed;
        } catch (error) {
            console.error('AI response parsing error:', error);
            console.log('AI Response:', aiResponse);
            throw new Error('AI response format गलत है');
        }
    }

    async createReminders(taskData) {
        // Add tasks to storage
        this.tasks.push(...taskData.tasks);
        await this.saveTasks();
        
        // Create chrome alarms for each reminder
        for (const task of taskData.tasks) {
            for (const reminder of task.reminders) {
                await this.createAlarm(task, reminder);
            }
        }
        
        // Notify popup about task update
        this.notifyTasksUpdated();
    }

    async createAlarm(task, reminder) {
        const alarmName = `reminder_${task.id}_${reminder.id}`;
        const when = reminder.time;
        
        if (when > Date.now()) {
            await chrome.alarms.create(alarmName, {
                when: when
            });
            
            this.activeAlarms.add(alarmName);
            
            console.log(`Alarm created: ${alarmName} at ${new Date(when).toLocaleString()}`);
        }
    }

    async handleAlarm(alarmName) {
        if (!alarmName.startsWith('reminder_')) return;
        
        // Parse alarm name to get task and reminder IDs
        const parts = alarmName.split('_');
        const taskId = parseFloat(parts[1]);
        const reminderId = parseFloat(parts[2]);
        
        // Find the task and reminder
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const reminder = task.reminders.find(r => r.id === reminderId);
        if (!reminder) return;
        
        // Show notification with sound
        await this.showNotificationWithSound(task, reminder);
        
        // Remove from active alarms
        this.activeAlarms.delete(alarmName);
    }

    async showNotificationWithSound(task, reminder) {
        // Create browser notification
        await chrome.notifications.create(`reminder_${task.id}_${reminder.id}`, {
            type: 'basic',
            iconUrl: 'icon48.png',
            title: '🤖 AI Reminder',
            message: reminder.message,
            priority: task.priority === 'high' ? 2 : 1,
            requireInteraction: task.priority === 'high'
        });
        
        // Also show in-page notification with sound
        await this.showInPageNotification(reminder.message);
        
        console.log(`Notification sent: ${reminder.message}`);
    }

    async showInPageNotification(message) {
        try {
            // Get all tabs and send notification to each
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'showNotification',
                        message: message,
                        title: 'AI Reminder'
                    });
                } catch (error) {
                    // Content script might not be loaded on this tab
                    console.log(`Could not send to tab ${tab.id}:`, error.message);
                }
            }
        } catch (error) {
            console.log('In-page notification error:', error);
        }
    }

    async playNotificationSound() {
        try {
            const tabs = await chrome.tabs.query({});
            
            for (const tab of tabs) {
                try {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'playNotificationSound'
                    });
                } catch (error) {
                    // Content script not available on this tab
                    console.log(`Sound not sent to tab ${tab.id}`);
                }
            }
        } catch (error) {
            console.log('Sound play error:', error);
        }
    }

    async testNotification() {
        const testTask = {
            id: 'test',
            title: 'Test Notification',
            priority: 'medium'
        };
        
        const testReminder = {
            id: 'test',
            message: '🎯 Test reminder working! Sound should also play.',
            type: 'test'
        };
        
        await this.showNotificationWithSound(testTask, testReminder);
        
        // Also try to play sound directly
        await this.playNotificationSound();
    }

    async getTasks() {
        return this.tasks.filter(task => 
            task.reminders.some(reminder => reminder.time > Date.now())
        );
    }

    async clearAllTasks() {
        // Clear all alarms
        const alarms = await chrome.alarms.getAll();
        for (const alarm of alarms) {
            if (alarm.name.startsWith('reminder_')) {
                chrome.alarms.clear(alarm.name);
            }
        }
        
        // Clear tasks
        this.tasks = [];
        this.activeAlarms.clear();
        await this.saveTasks();
        this.notifyTasksUpdated();
    }

    async saveTasks() {
        await chrome.storage.local.set({ reminderTasks: this.tasks });
    }

    async setupExistingAlarms() {
        // Re-create alarms for existing tasks
        for (const task of this.tasks) {
            for (const reminder of task.reminders) {
                if (reminder.time > Date.now()) {
                    await this.createAlarm(task, reminder);
                }
            }
        }
    }

    notifyTasksUpdated() {
        chrome.runtime.sendMessage({
            action: 'tasksUpdated'
        }).catch(() => {
            // Popup might not be open
        });
    }
}

// Initialize service
const aiReminderService = new AIReminderService();

// Message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'processTask':
            aiReminderService.processTask(message.task, message.context)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ 
                    success: false, 
                    error: error.message 
                }));
            return true; // Async response
            
        case 'getTasks':
            aiReminderService.getTasks()
                .then(tasks => sendResponse({ tasks }))
                .catch(error => sendResponse({ error: error.message }));
            return true;
            
        case 'testNotification':
            aiReminderService.testNotification();
            sendResponse({ success: true });
            break;
            
        case 'clearAllTasks':
            aiReminderService.clearAllTasks()
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ error: error.message }));
            return true;
    }
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
    aiReminderService.handleAlarm(alarm.name);
});

// Notification click handler
chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.notifications.clear(notificationId);
});

console.log('AI Reminder background script loaded');