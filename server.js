const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files like HTML, CSS

const LOGS_FILE = path.join(__dirname, 'logs.json');

// Helper function to read logs
function readLogs() {
    if (!fs.existsSync(LOGS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(LOGS_FILE);
    return JSON.parse(data);
}

// Helper function to write logs
function writeLogs(logs) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// --- API Endpoints ---

// Endpoint for staff to clock in/out
app.post('/api/log', (req, res) => {
    const { userId, eventType } = req.body; // eventType should be 'clock-in' or 'clock-out'
    if (!userId || !eventType) {
        return res.status(400).json({ message: 'User ID and event type are required.' });
    }

    const logs = readLogs();
    const newLog = {
        id: Date.now(),
        userId: userId,
        eventType: eventType,
        timestamp: new Date().toISOString()
    };
    logs.push(newLog);
    writeLogs(logs);

    res.status(201).json(newLog);
});

// Endpoint for admin to get all logs
app.get('/api/logs/all', (req, res) => {
    const logs = readLogs();
    res.json(logs);
});

// Endpoint for a staff member to get their own logs (requires authentication implementation)
app.get('/api/logs/my', (req, res) => {
    // For now, we'll simulate getting logs for a specific user via query param
    // In a real app, you'd get the userId from a session or JWT token
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }
    const logs = readLogs();
    const userLogs = logs.filter(log => log.userId === userId);
    res.json(userLogs);
});

// Endpoint for admin to update a log
app.put('/api/logs/:id', (req, res) => {
    const logId = parseInt(req.params.id, 10);
    const updates = req.body;
    
    let logs = readLogs();
    const logIndex = logs.findIndex(log => log.id === logId);

    if (logIndex === -1) {
        return res.status(404).json({ message: 'Log not found.' });
    }

    // Update the log entry
    logs[logIndex] = { ...logs[logIndex], ...updates };
    writeLogs(logs);

    res.json(logs[logIndex]);
});

// Endpoint for admin to delete a log
app.delete('/api/logs/:id', (req, res) => {
    const logId = parseInt(req.params.id, 10);
    
    let logs = readLogs();
    const filteredLogs = logs.filter(log => log.id !== logId);

    if (logs.length === filteredLogs.length) {
        return res.status(404).json({ message: 'Log not found.' });
    }

    writeLogs(filteredLogs);
    res.status(204).send(); // No content
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
