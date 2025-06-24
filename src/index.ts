#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 

import express from 'express';
import addonInterface, { createConfiguredAddon } from './addon';
import { ContentType } from 'stremio-addon-sdk'; // Aggiungi questa importazione

const app = express();
const port = parseInt(process.env.PORT || '7860', 10);

// Middleware per servire file statici
app.use('/public', express.static('public'));

const serveLandingPage = async (req: express.Request, res: express.Response) => {
    try {
        // Aggiungi extra: {} per soddisfare il tipo Args
        const landingHTML = await addonInterface.get({ 
            resource: 'landingTemplate' as any,
            type: 'movie' as ContentType, 
            id: 'landing',
            extra: {} as any // Aggiunto extra per soddisfare il tipo Args
        });
        res.setHeader('Content-Type', 'text/html');
        res.send(landingHTML);
    } catch (error) {
        console.error('Landing page error:', error);
        // Se la landing page non può essere generata, mostra un errore semplice.
        // Evitiamo un 500 per non bloccare Stremio.
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send('<h1>Addon Error</h1><p>Could not generate addon landing page. Please check server logs.</p>');
    }
};

// Rotta per la landing page
app.get('/', serveLandingPage);

// Rotta per il manifest senza configurazione
app.get('/manifest.json', async (req, res) => {
    // Se la richiesta proviene da un browser, mostra la landing page
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return serveLandingPage(req, res);
    }
    res.json(addonInterface.manifest);
});

// Rotta per lo stream senza configurazione
app.get('/stream/:type/:id.json', async (req, res) => {
    try {
        const { type, id } = req.params;
        // Aggiungi extra: {} per soddisfare il tipo Args
        const result = await addonInterface.get({ 
            resource: 'stream', 
            type: type as ContentType, 
            id,
            extra: {} as any // Aggiunto extra per soddisfare il tipo Args
        });
        res.json(result);
    } catch (error) {
        console.error('Stream error:', error);
        // Rispondi con un array vuoto per evitare errori in Stremio
        res.json({ streams: [] });
    }
});

// Rotta per il manifest con configurazione
app.get('/:config/manifest.json', (req, res) => {
    try {
        const configuredAddon = createConfiguredAddon(req.params.config);
        res.json(configuredAddon.getInterface().manifest);
    } catch (error) {
        console.error('Config error:', error);
        // Se la configurazione è invalida, Stremio non potrà installare l'addon.
        // Inviare un JSON di errore con status 200 è un'opzione per evitare un blocco di rete.
        res.status(200).json({ err: 'invalid configuration', manifest: null });
    }
});

// Rotta per lo stream con configurazione
app.get('/:config/stream/:type/:id.json', async (req, res) => {
    try {
        const { config, type, id } = req.params;
        const configuredAddon = createConfiguredAddon(config);
        // Aggiungi extra: {} per soddisfare il tipo Args
        const result = await configuredAddon.getInterface().get({ 
            resource: 'stream', 
            type: type as ContentType, 
            id,
            extra: {} as any // Aggiunto extra per soddisfare il tipo Args
        });
        res.json(result);
    } catch (error) {
        console.error('Configured stream error:', error);
        // Rispondi con un array vuoto per evitare errori in Stremio
        res.json({ streams: [] });
    }
});

app.listen(port, () => {
    console.log(`Addon server running on port ${port}`);
    console.log(`Landing page available at http://localhost:${port}/`);
});
