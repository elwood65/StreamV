#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 

import express from 'express';
import { publishToCentral } from 'stremio-addon-sdk';
import addonInterface, { createConfiguredAddon } from './addon';

const app = express();
const port = parseInt(process.env.PORT || '7860', 10);

// Middleware per servire file statici
app.use('/public', express.static('public'));

// Rotta per l'addon senza configurazione
app.get('/manifest.json', (req, res) => {
    res.json(addonInterface.manifest);
});

app.get('/stream/:type/:id.json', async (req, res) => {
    try {
        const result = await addonInterface.get(req);
        res.json(result);
    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rotte per l'addon con configurazione dinamica
app.get('/:config/manifest.json', (req, res) => {
    try {
        const configuredAddon = createConfiguredAddon(req.params.config);
        res.json(configuredAddon.getInterface().manifest);
    } catch (error) {
        console.error('Config error:', error);
        res.status(500).json({ error: 'Invalid configuration' });
    }
});

app.get('/:config/stream/:type/:id.json', async (req, res) => {
    try {
        const configuredAddon = createConfiguredAddon(req.params.config);
        const result = await configuredAddon.getInterface().get(req);
        res.json(result);
    } catch (error) {
        console.error('Configured stream error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Rotta per la landing page
app.get('/', async (req, res) => {
    try {
        const result = await addonInterface.get({ url: req.url, headers: req.headers });
        if (typeof result === 'string') {
            res.send(result); // HTML della landing page
        } else {
            res.json(result); // JSON response
        }
    } catch (error) {
        console.error('Landing page error:', error);
        res.status(500).send('Error loading landing page');
    }
});

app.listen(port, () => {
    console.log(`Addon server running on port ${port}`);
    console.log(`Manifest available at http://localhost:${port}/manifest.json`);
    console.log(`Landing page will be generated automatically by stremio-addon-sdk`);
});

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
