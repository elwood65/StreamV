#!/usr/bin/env node

import express from 'express';
import dotenv from 'dotenv';
import addonInterface, { setShowBothLinks } from './addon';

// Carica le variabili d'ambiente dal file .env
dotenv.config();

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 7680;

// Middleware per gestire il prefisso di configurazione e riscrivere l'URL
app.use((req, res, next) => {
    // Controlla se il percorso della richiesta inizia con il prefisso /both/
    if (req.path.startsWith('/both/')) {
        console.log(`Rilevato prefisso /both per la richiesta: ${req.path}`);
        // Imposta il flag globale a true
        setShowBothLinks(true);
        
        // Riscrive l'URL per renderlo comprensibile all'SDK di Stremio
        // rimuovendo il prefisso '/both'.
        // Esempio: /both/stream/movie/tt123.json -> /stream/movie/tt123.json
        req.url = req.url.substring(5);
        
        // Gestisce il caso in cui l'URL era solo '/both/' -> '/'
        if (req.url === '') {
            req.url = '/';
        }
        console.log(`URL riscritto a: ${req.url}`);
    } else {
        // Per qualsiasi altra richiesta, si assicura che il flag sia false
        setShowBothLinks(false);
    }
    
    // Passa il controllo al prossimo middleware (quello dell'addon SDK)
    next();
});

// Usa il middleware dell'SDK di Stremio per gestire tutte le richieste dell'addon.
// Ora riceverà l'URL corretto.
app.use(addonInterface.middleware);

// Avvia il server
app.listen(port, () => {
    console.log(`Server addon avviato con Express sulla porta ${port}`);
    console.log(`Installa da: http://127.0.0.1:${port}/manifest.json`);
    console.log(`Installa con entrambi i link attivi: http://127.0.0.1:${port}/both/manifest.json`);
});
