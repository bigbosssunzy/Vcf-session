const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory database simulation (Use MongoDB/SQL for production persistence)
// Sessions structure: { sessionId: { limitType, limitValue, createdAt, password, contacts: Set/Array } }
const sessions = {};

// 1. Create a new VCF Session
app.post('/api/create-session', (req, res) => {
    const { limitType, limitValue } = req.body; // limitType: 'time' or 'number'
    const sessionId = uuidv4().substring(0, 8);
    const password = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit secure code

    let expiresAt = null;
    if (limitType === 'time') {
        const { unit, value } = limitValue; // unit: hours, days, weeks, months
        const multipliers = {
            hours: 60 * 60 * 1000,
            days: 24 * 60 * 60 * 1000,
            weeks: 7 * 24 * 60 * 60 * 1000,
            months: 30 * 24 * 60 * 60 * 1000
        };
        expiresAt = Date.now() + (value * (multipliers[unit] || multipliers.days));
    }

    sessions[sessionId] = {
        limitType,
        limitValue: limitType === 'number' ? parseInt(limitValue.max) : null,
        expiresAt,
        password,
        contacts: [] // Array of { name, phone }
    };

    res.json({ success: true, sessionId, password, link: `/room.html?id=${sessionId}` });
});

// 2. Check Session Status & Info
app.get('/api/session/:id', (req, res) => {
    const session = sessions[req.params.id];
    if (!session) return res.status(404).json({ error: 'VCF Session not found!' });

    // Check if time expired
    if (session.limitType === 'time' && Date.now() > session.expiresAt) {
        return res.json({ active: false, message: 'This VCF session has expired!' });
    }
    // Check if number limit reached
    if (session.limitType === 'number' && session.contacts.length >= session.limitValue) {
        return res.json({ active: false, message: 'Participant limit has been reached!' });
    }

    res.json({ active: true, totalContacts: session.contacts.length });
});

// 3. Register Contact
app.post('/api/register', (req, res) => {
    const { sessionId, name, phone } = req.body;
    const session = sessions[sessionId];

    if (!session) return res.status(404).json({ error: 'Session not found.' });

    // Expiration checks
    if (session.limitType === 'time' && Date.now() > session.expiresAt) {
        return res.status(400).json({ error: 'Registration closed: Time is up!' });
    }
    if (session.limitType === 'number' && session.contacts.length >= session.limitValue) {
        return res.status(400).json({ error: 'Registration closed: Maximum number of participants reached!' });
    }

    // Validate phone format (+countrycode)
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone format! Must start with country code (e.g., +2347086057694).' });
    }

    // Check duplicate number
    const exists = session.contacts.some(c => c.phone === phone);
    if (exists) {
        return res.status(400).json({ error: 'This number has already been registered.' });
    }

    session.contacts.push({ name: name.trim(), phone: phone.trim() });
    res.json({ success: true, message: 'This number is added successfully!' });
});

// 4. Verify Password & Download VCF
app.post('/api/download-vcf', (req, res) => {
    const { sessionId, password } = req.body;
    const session = sessions[sessionId];

    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.password !== password) {
        return res.status(401).json({ error: 'Incorrect VCF password!' });
    }

    // Generate VCF Content
    let vcfData = '';
    session.contacts.forEach((contact, index) => {
        vcfData += 'BEGIN:VCARD\n';
        vcfData += 'VERSION:3.0\n';
        vcfData += `FN:${contact.name}\n`;
        vcfData += `TEL;TYPE=CELL:${contact.phone}\n`;
        vcfData += 'END:VCARD\n\n';
    });

    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', `attachment; filename="WhatsApp_Contacts_${sessionId}.vcf"`);
    res.send(vcfData);
});

app.listen(PORT, () => {
    console.log(`VCF Server running on http://localhost:${PORT}`);
});