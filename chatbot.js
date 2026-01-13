document.addEventListener("DOMContentLoaded", () => {
    const chatbotHTML = `
        <div class="chatbot">
            <div class="chatbot-header">
                <div class="chatbot-header-content">
                    <div class="chatbot-avatar">
                        <img src="https://i.pinimg.com/1200x/e6/3d/d6/e63dd677ab1e4c25e3ffa5659a87ac5a.jpg" alt="AI avatar" />
                    </div>
                    <div class="chatbot-header-title">
                        <h2>NestWork AI</h2>
                        <p>Trợ lý học tập</p>
                    </div>
                </div>
                <div class="chatbot-header-controls">
                    <span class="material-symbols-outlined" id="minimize-chatbot">expand_more</span>
                    <span class="material-symbols-outlined" id="close-chatbot">close</span>
                </div>
            </div>
            <ul class="chatbox">
                <!-- Messages will be dynamically added here -->
            </ul>
            <div class="chatbot-input">
                <button id="cancel-session-btn" style="display: none;">Hủy phiên học</button>
            </div>
        </div>
        <button class="chatbot-toggler">
            <span class="material-symbols-outlined">mode_comment</span>
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const closeBtn = document.querySelector("#close-chatbot");
    const minimizeBtn = document.querySelector("#minimize-chatbot");
    const chatbox = document.querySelector(".chatbox");
    const cancelBtn = document.querySelector("#cancel-session-btn");

    let timerInterval;
    let sessionTimeoutId = null; // To hold the setTimeout ID for upcoming sessions

    const addMessage = (message, type = 'system', extraClass = '') => {
        const li = document.createElement("li");
        li.classList.add("chat", type);
        if (extraClass) li.classList.add(extraClass);
        
        let chatContent = `<div class="chat-details"><p>${message}</p></div>`;
        if (type === 'system') {
            chatContent = `
                <div class="chat-details">
                <img class="bot-msg-avatar" src="https://i.pinimg.com/1200x/e6/3d/d6/e63dd677ab1e4c25e3ffa5659a87ac5a.jpg" alt="AI">
                <p>${message}</p>
                </div>
            `;
}

        
        li.innerHTML = chatContent;
        chatbox.appendChild(li);
        chatbox.scrollTo(0, chatbox.scrollHeight);
    };
    
    const getOrders = () => {
        try {
            return JSON.parse(localStorage.getItem("orders") || "[]");
        } catch (e) {
            console.error("Failed to parse orders from localStorage", e);
            return [];
        }
    };

    const saveOrders = (orders) => {
        try {
            localStorage.setItem("orders", JSON.stringify(orders));
        } catch (e) {
            console.error("Failed to save orders to localStorage", e);
        }
    };

    const parseDurationToSeconds = (durationStr) => {
        if (!durationStr) return 0;
        
        const match = durationStr.match(/(\d+)/);
        if (!match) return 0;
        
        const value = parseInt(match[0], 10);
        
        if (durationStr.includes("giờ")) {
            return value * 3600;
        } else if (durationStr.includes("Nửa ngày")) {
            return 4 * 3600; // Assumption: Nửa ngày is 4 hours
        } else if (durationStr.includes("Cả ngày")) {
            return 8 * 3600; // Assumption: Cả ngày is 8 hours
        }
        return 0;
    };

    const parseDateTime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return null;
        const [day, month, year] = dateStr.split('/');
        const [hours, minutes] = timeStr.split(':');
        // Month is 0-indexed in JavaScript Date
        return new Date(year, month - 1, day, hours, minutes);
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const playSound = () => {
        console.log("Playing bell sound...");
        // In a real scenario, you'd have an <audio> element or use new Audio('path/to/bell.mp3').play();
    };

    const startTimer = (durationInSeconds) => {
        if (timerInterval) clearInterval(timerInterval);
        if (sessionTimeoutId) clearTimeout(sessionTimeoutId); // Clear any pending scheduled start

        let timeRemaining = durationInSeconds;
        
        addMessage("Bắt đầu tính giờ học nhé!");
        cancelBtn.style.display = 'none'; // Hide cancel button once timer starts
        
        const timerMessage = document.createElement("li");
        timerMessage.classList.add("chat", "system");
        timerMessage.innerHTML = `<div class="chat-details"><span class="material-symbols-outlined">timer</span><p class="timer-display">${formatTime(timeRemaining)}</p></div>`;
        chatbox.appendChild(timerMessage);
        const timerDisplay = timerMessage.querySelector(".timer-display");

        timerInterval = setInterval(() => {
            timeRemaining--;
            if (timerDisplay) {
                timerDisplay.textContent = formatTime(timeRemaining);
            }

            if (timeRemaining === 300) { // 5 minutes left
                addMessage("Còn 5 phút nữa là hết giờ học rồi.", 'system', 'warning-message');
            }

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                addMessage("Hết giờ! Bạn đã hoàn thành phiên học tập rồi.", 'system', 'times-up-message');
                playSound();
            }
        }, 1000);
    };

    const cancelSession = (orderId) => {
        if (confirm("Bạn có chắc muốn hủy phiên học này không?")) {
            if (sessionTimeoutId) {
                clearTimeout(sessionTimeoutId);
                sessionTimeoutId = null;
            }

            const orders = getOrders();
            const orderIndex = orders.findIndex(order => order.id === parseInt(orderId));
            if (orderIndex !== -1) {
                orders[orderIndex].status = "Đã hủy";
                saveOrders(orders);
            }
            
            addMessage("Bạn đã học xong rồi sao, cảm ơn và hẹn gặp lại nha!");
            cancelBtn.style.display = 'none'; // Hide the cancel button after cancellation
        }
    };

    const findAndScheduleNextSession = () => {
        const orders = getOrders();
        // NOTE: Assuming "Hoàn thành" or "Đã duyệt" is the approved status from admin.
        const approvedOrders = orders.filter(o => o.status === 'Hoàn thành' || o.status === 'Đã duyệt');
        
        const now = new Date();
        let activeSession = null;
        let nextUpcomingSession = null;

        cancelBtn.style.display = 'none'; // Hide cancel button by default

        for (const order of approvedOrders) {
            const startTime = parseDateTime(order.date, order.time);
            if (!startTime) continue;

            const durationSeconds = parseDurationToSeconds(order.duration);
            if (durationSeconds === 0) continue;

            const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

            // Check if a session is currently active
            if (now >= startTime && now < endTime) {
                activeSession = {
                    ...order,
                    startTime,
                    endTime,
                    durationSeconds,
                    timeRemaining: Math.round((endTime - now) / 1000)
                };
                break; // Found an active session, no need to look further
            }

            // Check for the next upcoming session
            if (startTime > now) {
                if (!nextUpcomingSession || startTime < nextUpcomingSession.startTime) {
                    nextUpcomingSession = { ...order, startTime, durationSeconds, id: order.id };
                }
            }
        }

        if (activeSession) {
            addMessage(`Phiên học của bạn đang diễn ra. Chúc bạn học tập hiệu quả!`);
            startTimer(activeSession.timeRemaining);
        } else if (nextUpcomingSession) {
            const delay = nextUpcomingSession.startTime - now;
            const startTimeFormatted = nextUpcomingSession.startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            addMessage(`Phiên học tiếp theo của bạn sẽ bắt đầu lúc ${startTimeFormatted}.`);
            
            // Store the timeout ID and order ID for potential cancellation
            sessionTimeoutId = setTimeout(() => {
                startTimer(nextUpcomingSession.durationSeconds);
            }, delay);

            cancelBtn.style.display = 'block'; // Show cancel button for upcoming session
            cancelBtn.dataset.orderId = nextUpcomingSession.id;
        } else {
            addMessage("Xin chào! 👋<br>Hiện tại bạn không có phiên học nào được lên lịch hoặc đã duyệt. Tôi sẽ tự động bắt đầu khi đến giờ.");
        }
    };
    
    const toggleChatbot = () => {
        document.body.classList.toggle("show-chatbot");
    };

    chatbotToggler.addEventListener("click", toggleChatbot);
    closeBtn.addEventListener("click", toggleChatbot);
    minimizeBtn.addEventListener("click", toggleChatbot);
    cancelBtn.addEventListener("click", () => cancelSession(cancelBtn.dataset.orderId));
    
    // Initialize the logic
    findAndScheduleNextSession();
});
