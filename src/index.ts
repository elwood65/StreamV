#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 

import { serveHTTP } from "stremio-addon-sdk";
import { addon } from "./addon";
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

// Configura porta e indirizzo
const port = process.env.PORT || 7860;

// Stampa le variabili d'ambiente MFP (solo per debugging)
console.log("MFP_URL from env:", process.env.MFP_URL);
console.log("MFP_PSW from env:", process.env.MFP_PSW);

const addonInterface = addon.getInterface();

// Crea un server personalizzato per intercettare le richieste e gestire la landing page
http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url || '', true);
  
  // Intercetta la richiesta di manifest.json per leggere i parametri della query
  if (parsedUrl.pathname === '/manifest.json') {
    const showBothLinks = parsedUrl.query.showBothLinks === 'true';
    // Passa il parametro all'interfaccia dell'addon
    addonInterface.config = { showBothLinks: String(showBothLinks) };
    
    // Continua con la gestione normale
    return addonInterface.serveHTTP(req, res);
  }
  
  // Gestisci la richiesta per la landing page
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
    try {
      const landingPath = path.join(__dirname, '..', 'src', 'public', 'landing.html');
      if (fs.existsSync(landingPath)) {
        const content = fs.readFileSync(landingPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(content);
      }
    } catch (error) {
      console.error('Error serving landing page:', error);
    }
  }
  
  // Gestisci richieste di file statici
  if (parsedUrl.pathname?.startsWith('/public/')) {
    const filePath = path.join(__dirname, '..', 'src', parsedUrl.pathname);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let contentType = 'text/plain';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      if (ext === '.css') contentType = 'text/css';
      if (ext === '.js') contentType = 'text/javascript';
      
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(content);
    }
  }
  
  // Per tutte le altre richieste, usa l'interfaccia standard dell'addon
  return addonInterface.serveHTTP(req, res);
}).listen(port);

console.log(`Addon active on port ${port}`);
console.log(`Manifest available at http://localhost:${port}/manifest.json`);

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
