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
app.listen(PORT, () => console.log(`VCF Dynamic Engine online on port ${PORT}`));
