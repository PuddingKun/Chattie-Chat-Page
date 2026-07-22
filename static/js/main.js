let currentBot = '';
let botColor = '';
let userName = '';
let chatSessions = {};

// DOM Elements
const selectionScreen = document.getElementById('selection-screen');
const onboardingStep = document.getElementById('onboarding-step');
const botSelectionStep = document.getElementById('bot-selection-step');
const chatLayout = document.getElementById('chat-layout');
const headerBotName = document.getElementById('bot-name');
const headerEmoji = document.getElementById('header-emoji');
const headerPfp = document.getElementById('header-pfp');
const messageList = document.getElementById('message-list');
const historyList = document.getElementById('chat-history-list');
const userInput = document.getElementById('user-input');
const displayNameInput = document.getElementById('display-name-input');
const userNameSidebar = document.getElementById('user-name-sidebar');
const userPfpSidebar = document.getElementById('user-pfp-sidebar');

function toggleOnboardingButton() {
    const btn = document.getElementById('start-btn');
    if (displayNameInput.value.trim().length > 0) {
        gsap.to(btn, { duration: 0.5, opacity: 1, y: 0, pointerEvents: "auto", ease: "back.out(1.7)" });
    } else {
        gsap.to(btn, { duration: 0.3, opacity: 0, y: 10, pointerEvents: "none" });
    }
}

function showBotSelection() {
    userName = displayNameInput.value.trim();
    if (!userName) return;

    gsap.to(onboardingStep, {
        duration: 0.4, opacity: 0, y: -20, ease: "power2.in",
        onComplete: () => {
            onboardingStep.classList.add('hidden');
            botSelectionStep.classList.remove('hidden');
            gsap.fromTo(botSelectionStep, { opacity: 0, y: 20 }, { duration: 0.6, opacity: 1, y: 0, ease: "power3.out" });
        }
    });
}

function selectBot(botName, color) {
    currentBot = botName;
    botColor = color;
    userName = displayNameInput.value.trim() || 'Guest';

    // Load History for this specific user
    const storageKey = `chattie_sessions_${userName}`;
    chatSessions = JSON.parse(localStorage.getItem(storageKey)) || {};

    // Update Sidebar & Header
    headerBotName.innerText = botName;
    headerEmoji.innerText = getEmoji(botName);
    headerPfp.style.backgroundColor = color;
    userNameSidebar.innerText = userName;
    userPfpSidebar.innerText = userName.substring(0, 2).toUpperCase();
    userInput.placeholder = `Message ${botName}...`;
    
    // TRANSITION
    selectionScreen.classList.add('hidden');
    chatLayout.classList.remove('hidden');
    gsap.fromTo(chatLayout, {opacity: 0}, {duration: 0.6, opacity: 1});
    
    loadChat(botName);
    updateSidebar();
    setTimeout(() => userInput.focus(), 100);
}

function loadChat(botName) {
    messageList.innerHTML = '';
    const history = chatSessions[botName] || [];
    if (history.length === 0) {
        renderWelcome(botName);
    } else {
        history.forEach(msg => renderMessage(msg.role === 'user' ? 'user' : 'bot', msg.content));
    }
    scrollToBottom();
}

function renderWelcome(botName) {
    const welcome = document.createElement('div');
    welcome.className = 'flex flex-col items-center justify-center py-20 opacity-20';
    welcome.innerHTML = `<div class="text-6xl mb-4">${getEmoji(botName)}</div><p class="text-sm font-bold uppercase tracking-widest">Start of conversation</p>`;
    messageList.appendChild(welcome);
}

function renderMessage(sender, text) {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full items-start gap-4 ${sender === 'user' ? 'flex-row-reverse' : 'flex-row'} message-entry mb-8`;
    
    const pfp = document.createElement('div');
    pfp.className = `w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg text-[10px] font-bold`;
    if (sender === 'user') {
        pfp.className += " bg-gradient-to-tr from-[#7C69FF] to-[#D1FF4D] text-black";
        pfp.innerText = userName.substring(0, 2).toUpperCase();
    } else {
        pfp.style.backgroundColor = botColor;
        pfp.innerText = getEmoji(currentBot);
    }

    const bubble = document.createElement('div');
    bubble.className = `max-w-[80%] p-4 text-sm font-medium leading-relaxed ${sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`;
    bubble.innerText = text;
    
    wrapper.appendChild(pfp);
    wrapper.appendChild(bubble);
    messageList.appendChild(wrapper);
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Remove welcome if exists
    const welcomes = messageList.querySelectorAll('.opacity-20');
    welcomes.forEach(w => w.remove());

    userInput.value = '';
    renderMessage('user', text);
    scrollToBottom();
    
    if (!chatSessions[currentBot]) chatSessions[currentBot] = [];
    chatSessions[currentBot].push({ role: 'user', content: text });
    
    showTyping();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bot: currentBot, messages: chatSessions[currentBot] })
        });

        const data = await response.json();
        removeTyping();
        
        if (data.reply) {
            renderMessage('bot', data.reply);
            chatSessions[currentBot].push({ role: 'assistant', content: data.reply });
            const storageKey = `chattie_sessions_${userName}`;
            localStorage.setItem(storageKey, JSON.stringify(chatSessions));
            updateSidebar();
        }
    } catch (e) {
        removeTyping();
        renderMessage('bot', "Connection Error.");
    }
    scrollToBottom();
    userInput.focus();
}

function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'flex items-start gap-4 flex-row mb-8';
    typingDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg text-xs" style="background-color: ${botColor}">${getEmoji(currentBot)}</div>
        <div class="chat-bubble-bot p-4 flex gap-1.5"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
    `;
    messageList.appendChild(typingDiv);
}

function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function updateSidebar() {
    const storageKey = `chattie_sessions_${userName}`;
    const sessions = JSON.parse(localStorage.getItem(storageKey)) || {};
    
    historyList.innerHTML = '<p class="px-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">History</p>';
    Object.keys(sessions).forEach(bot => {
        if (sessions[bot].length === 0) return;
        const item = document.createElement('div');
        item.className = `history-item p-3 rounded-xl cursor-pointer flex items-center gap-3 transition-all ${currentBot === bot ? 'active' : ''}`;
        item.onclick = () => selectBot(bot, getBotColor(bot));
        item.innerHTML = `
            <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0" style="background: ${getBotColor(bot)}">${getEmoji(bot)}</div>
            <div class="truncate"><p class="text-[11px] font-bold">${bot}</p><p class="text-[10px] text-gray-600 truncate">${sessions[bot][sessions[bot].length-1].content}</p></div>
        `;
        historyList.appendChild(item);
    });
}

function getBotColor(name) {
    const colors = { 'Mochi': '#FF7A60', 'Uncle Byte': '#7C69FF', 'Nyx': '#D1FF4D' };
    return colors[name] || '#FFF';
}

function getEmoji(name) {
    const emojis = { 'Mochi': '🐱', 'Uncle Byte': '🤖', 'Nyx': '👑' };
    return emojis[name] || '👤';
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function createNewChat() {
    chatSessions[currentBot] = [];
    const storageKey = `chattie_sessions_${userName}`;
    localStorage.setItem(storageKey, JSON.stringify(chatSessions));
    loadChat(currentBot);
    updateSidebar();
}

function logout() {
    document.getElementById('custom-modal').classList.remove('hidden');
    gsap.fromTo("#custom-modal > div", {scale: 0.9, opacity: 0}, {duration: 0.4, scale: 1, opacity: 1, ease: "back.out(1.7)"});
}

function closeModal() {
    gsap.to("#custom-modal > div", {duration: 0.3, scale: 0.9, opacity: 0, ease: "power2.in", onComplete: () => {
        document.getElementById('custom-modal').classList.add('hidden');
    }});
}

function confirmLogout() {
    const storageKey = `chattie_sessions_${userName}`;
    localStorage.removeItem(storageKey);
    window.location.reload();
}

function backToSelection() {
    chatLayout.classList.add('hidden');
    selectionScreen.classList.remove('hidden');
    onboardingStep.classList.remove('hidden');
    onboardingStep.style.opacity = "1";
    botSelectionStep.classList.add('hidden');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}
