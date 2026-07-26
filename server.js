const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const sessions = {};

// Create a new VCF Session
app.post('/api/create-session', (req, res) => {
    const { limitType, limitValue } = req.body;
    const sessionId = uuidv4().substring(0, 8);
    const password = Math.floor(1000 + Math.random() * 9000).toString();

    let expiresAt = null;
    if (limitType === 'time') {
        const { unit, value } = limitValue;
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
        contacts: []
    };

    res.json({ success: true, sessionId, password, link: `/room.html?id=${sessionId}` });
});

// Check Session Status & Info
app.get('/api/session/:id', (req, res) => {
    const session = sessions[req.params.id];
    if (!session) return res.status(404).json({ error: 'VCF Session not found!' });

    const isTimeExpired = session.limitType === 'time' && Date.now() > session.expiresAt;
    const isNumberReached = session.limitType === 'number' && session.contacts.length >= session.limitValue;

    res.json({
        active: !isTimeExpired && !isNumberReached,
        limitType: session.limitType,
        totalContacts: session.contacts.length,
        limitValue: session.limitValue,
        expiresAt: session.expiresAt,
        message: isTimeExpired ? 'This VCF session has expired!' : isNumberReached ? 'Participant limit has been reached!' : ''
    });
});

// Register Contact
app.post('/api/register', (req, res) => {
    const { sessionId, name, phone } = req.body;
    const session = sessions[sessionId];

    if (!session) return res.status(404).json({ error: 'Session not found.' });

    if (session.limitType === 'time' && Date.now() > session.expiresAt) {
        return res.status(400).json({ error: 'Registration closed: Time is up!' });
    }
    if (session.limitType === 'number' && session.contacts.length >= session.limitValue) {
        return res.status(400).json({ error: 'Registration closed: Maximum number of participants reached!' });
    }

    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone format! Must start with country code (e.g., +2347086057694).' });
    }

    const exists = session.contacts.some(c => c.phone === phone);
    if (exists) {
        return res.status(400).json({ error: 'This number has already been registered.' });
    }

    session.contacts.push({ name: name.trim(), phone: phone.trim() });
    res.json({ success: true, message: 'This number is added successfully!' });
});

// Verify Password & Download VCF
app.post('/api/download-vcf', (req, res) => {
    const { sessionId, password } = req.body;
    const session = sessions[sessionId];

    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.password !== password) {
        return res.status(401).json({ error: 'Incorrect VCF password!' });
    }

    let vcfData = '';
    session.contacts.forEach((contact) => {
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
