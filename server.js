const express = require('express');
const vCardsJS = require('vcards-js');
const fs = require('fs');
const path = require('path'); // Core Node module to handle folder paths
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CRITICAL: This line tells Node to serve your index.html out of the public folder automatically
app.use(express.static(path.join(__dirname, 'public')));

const FILE_PATH = './campaigns_store.json';
const WHATSAPP_CHANNEL_LINK = "https://whatsapp.com/channel/0029VbCxwJeEgGfFhMx4zg3q";

// ... Keep all your existing functions (loadData, saveData) and API routes exactly as they are ...

// Make sure the port is dynamic so Render can control it
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.const express = require('express');
const vCardsJS = require('vcards-js');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

const FILE_PATH = './campaigns_store.json';
const WHATSAPP_CHANNEL_LINK = "https://whatsapp.com/channel/0029VbCxwJeEgGfFhMx4zg3q";

// Helper function to load data and automatically create the campaign if missing
function loadData() {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            const defaultData = {
                "sample-campaign": {
                    id: "sample-campaign",
                    creatorId: "admin123",
                    title: "Big Boss Net 🚀",
                    limitType: "target", 
                    targetLimit: 100,
                    expiryTime: null,
                    downloadVisibility: "public",
                    contacts: []
                }
            };
            fs.writeFileSync(FILE_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
            return defaultData;
        }
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        let parsed = JSON.parse(data);
        
        // Safety check: If the file exists but doesn't have our campaign, inject it
        if (!parsed["sample-campaign"]) {
            parsed["sample-campaign"] = {
                id: "sample-campaign",
                creatorId: "admin123",
                title: "Big Boss Net 🚀",
                limitType: "target", 
                targetLimit: 100,
                expiryTime: null,
                downloadVisibility: "public",
                contacts: []
            };
            fs.writeFileSync(FILE_PATH, JSON.stringify(parsed, null, 2), 'utf8');
        }
        return parsed;
    } catch (err) {
        console.error("Error with database file store:", err);
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// 1. REGISTRATION ENDPOINT
app.post('/api/campaign/:id/register', (req, res) => {
    let campaigns = loadData();
    const campaign = campaigns[req.params.id];
    
    if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
    }

    // Enforce Time Limit
    if (campaign.limitType === 'time' && campaign.expiryTime && Date.now() > campaign.expiryTime) {
        return res.status(400).json({ error: "This VCF campaign has expired!" });
    }

    // Enforce Target Limit
    if (campaign.limitType === 'target' && campaign.contacts.length >= campaign.targetLimit) {
        return res.status(400).json({ error: "Target capacity reached! No more entries allowed." });
    }

    const { name, phone } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ error: "Name and Phone Number are required." });
    }

    if (!phone.startsWith('+') || phone.length < 10) {
        return res.status(400).json({ error: "Phone number must include a valid country code (e.g., +234...)" });
    }

    // Rule: Same phone number cannot register twice
    const phoneExists = campaign.contacts.some(c => c.phone === phone);
    if (phoneExists) {
        return res.status(400).json({ error: "This phone number is already registered." });
    }

    // Rule: Same name can be used for different numbers
    campaign.contacts.push({ name, phone });
    saveData(campaigns);

    res.json({ 
        success: true, 
        message: "Successfully registered! Redirecting to channel...",
        redirectUrl: WHATSAPP_CHANNEL_LINK
    });
});

// 2. DOWNLOAD ENDPOINT
app.get('/api/campaign/:id/download', (req, res) => {
    let campaigns = loadData();
    const campaign = campaigns[req.params.id];
    if (!campaign) return res.status(404).send("Campaign not found");

    if (campaign.contacts.length === 0) {
        return res.status(400).send("No contacts have registered yet.");
    }

    let masterVcfString = "";

    campaign.contacts.forEach((contact) => {
        const vCard = vCardsJS();
        vCard.firstName = contact.name; 
        vCard.cellPhone = contact.phone;
        vCard.organization = campaign.title;
        masterVcfString += vCard.getFormattedString() + "\n";
    });

    res.set({
        'Content-Type': 'text/vcard; charset=utf-8; name="compiled_contacts.vcf"',
        'Content-Disposition': `attachment; filename="${campaign.id}_contacts.vcf"`
    });

    res.send(masterVcfString);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VCF Platform active on port ${PORT}`));
(`VCF Dynamic Engine online on port ${PORT}`));
