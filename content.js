// Content script for playing notification sounds and visual effects
let audioContext = null;
let notificationContainer = null;

// Initialize audio context on first user interaction
function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Audio context initialized successfully');
            
            // Test if audio context works
            if (audioContext.state === 'running') {
                console.log('Audio context is running');
            } else {
                console.log('Audio context state:', audioContext.state);
            }
        } catch (error) {
            console.log('Audio context creation failed:', error);
        }
    }
    return audioContext !== null;
}

// Create notification container for visual notifications
function createNotificationContainer() {
    if (notificationContainer) return;
    
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'ai-reminder-notifications';
    notificationContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        pointer-events: none;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    `;
    document.body.appendChild(notificationContainer);
}

// Show visual notification overlay
function showVisualNotification(message) {
    createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        margin-bottom: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        pointer-events: auto;
        cursor: pointer;
        transform: translateX(400px);
        transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        max-width: 320px;
        word-wrap: break-word;
        animation: slideIn 0.5s ease-out forwards, fadeOut 0.5s ease-in 4.5s forwards;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">🤖</div>
            <div>
                <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">AI Reminder</div>
                <div style="font-size: 13px; opacity: 0.95;">${message}</div>
            </div>
            <div style="margin-left: auto; cursor: pointer; opacity: 0.7; hover: opacity: 1;" onclick="this.parentElement.parentElement.remove()">✕</div>
        </div>
    `;
    
    // Add click to dismiss
    notification.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    notificationContainer.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
}

// Add CSS animations
function addNotificationStyles() {
    if (document.getElementById('ai-reminder-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'ai-reminder-styles';
    styles.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(400px);
            }
        }
        
        #ai-reminder-notifications > div:hover {
            transform: scale(1.02) !important;
            box-shadow: 0 12px 40px rgba(0,0,0,0.4) !important;
        }
    `;
    document.head.appendChild(styles);
}

// Play multiple notification sounds (more pleasant)
async function playNotificationSounds() {
    try {
        initAudioContext();
        
        if (!audioContext) return;
        
        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // Create a sequence of pleasant notification tones
        const playTone = (frequency, startTime, duration, volume = 0.1) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startTime);
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        
        const now = audioContext.currentTime;
        
        // Pleasant notification sequence: C-E-G chord progression
        playTone(523.25, now, 0.3, 0.08);      // C5
        playTone(659.25, now + 0.1, 0.3, 0.06); // E5
        playTone(783.99, now + 0.2, 0.4, 0.04); // G5
        
        console.log('Notification sound played successfully');
        
    } catch (error) {
        console.log('Audio play error:', error);
        // Fallback audio methods
        await playFallbackSound();
    }
}

// Fallback sound methods
async function playFallbackSound() {
    try {
        // Method 1: HTML5 Audio with data URI
        const audioData = 'data:audio/wav;base64,UklGRhQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YfADAAA/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/v7+/v7+/v7+/v7+/v7+/v39/f39/';
        
        const audio = new Audio(audioData);
        audio.volume = 0.3;
        await audio.play();
        
    } catch (audioError) {
        console.log('HTML5 audio fallback failed:', audioError);
        
        try {
            // Method 2: SpeechSynthesis as last resort
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('ding');
                utterance.volume = 0.1;
                utterance.rate = 3;
                utterance.pitch = 2;
                speechSynthesis.speak(utterance);
            }
        } catch (speechError) {
            console.log('All audio methods failed:', speechError);
        }
    }
}

// Vibrate if supported (mobile devices)
function vibrateDevice() {
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
    }
}

// Main notification function
async function showNotification(message, title = 'AI Reminder') {
    console.log('Showing notification:', message);
    
    // Add styles first
    addNotificationStyles();
    
    // Show visual notification
    showVisualNotification(message);
    
    // Play sound
    await playNotificationSounds();
    
    // Vibrate on mobile
    vibrateDevice();
    
    // Optional: Flash page title
    flashPageTitle(title);
}

// Flash page title for attention
function flashPageTitle(reminderTitle) {
    const originalTitle = document.title;
    let flashCount = 0;
    
    const flashInterval = setInterval(() => {
        document.title = flashCount % 2 === 0 ? `🔔 ${reminderTitle}` : originalTitle;
        flashCount++;
        
        if (flashCount >= 6) {
            document.title = originalTitle;
            clearInterval(flashInterval);
        }
    }, 1000);
}

// Page visibility change handler - play sound when page becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    switch (message.action) {
        case 'playNotificationSound':
            playNotificationSounds().then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // Async response
            
        case 'showNotification':
            showNotification(message.message, message.title).then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                sendResponse({ success: false, error: error.message });
            });
            return true; // Async response
            
        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

// Initialize audio context on user interaction
const initEvents = ['click', 'touchstart', 'keydown', 'scroll'];
initEvents.forEach(event => {
    document.addEventListener(event, initAudioContext, { once: true, passive: true });
});

// Initialize on DOM content loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioContext, { once: true });
} else {
    initAudioContext();
}

// Cleanup function
window.addEventListener('beforeunload', () => {
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
});

console.log('AI Reminder content script loaded completely');