#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 

import { serveHTTP } from "stremio-addon-sdk";
import { addon } from "./addon";
import * as fs from 'fs';
import * as path from 'path';

// Configura porta e indirizzo
const port = process.env.PORT || 7860;
const host = process.env.HOST || "127.0.0.1";

// Stampa le variabili d'ambiente MFP (solo per debugging)
console.log("MFP_URL from env:", process.env.MFP_URL);
console.log("MFP_PSW from env:", process.env.MFP_PSW);

// Carica il template della landing page personalizzato
const landingTemplate = () => {
    try {
        const landingPath = path.join(__dirname, '..', 'src', 'public', 'landing.html');
        if (fs.existsSync(landingPath)) {
            return fs.readFileSync(landingPath, 'utf8');
        }
    } catch (error) {
        console.error('Error loading landing template:', error);
    }
    
    return null; // Fallback al template predefinito dell'SDK
};

// Avvia il server HTTP con il nostro addon
serveHTTP(addon.getInterface(), { 
    port: Number(port),
    static: path.join(__dirname, '..', 'src', 'public'),
    landingTemplate: landingTemplate()
});

console.log(`Addon active on port ${port}`);
console.log(`Manifest available at http://localhost:${port}/manifest.json`);

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
