#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 

import { addon, setShowBothLinks } from "./addon";
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

// Configura porta e indirizzo
const port = process.env.PORT ? parseInt(process.env.PORT) : 7860;
const staticPath = path.join(__dirname, '..', 'src', 'public');

// Ottieni l'interfaccia addon
const addonInterface = addon.getInterface();

// Crea un server HTTP personalizzato
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';
  
  console.log(`Received request: ${req.url}`);
  
  // Gestione manifest
  if (pathname === '/manifest.json') {
    const showBothLinks = parsedUrl.query.showBothLinks === 'true';
    setShowBothLinks(showBothLinks); // Imposta la variabile globale in addon.ts
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(addonInterface.manifest));
  }
  
  // Gestione landing page
  if (pathname === '/' || pathname === '') {
    try {
      const landingPath = path.join(staticPath, 'landing.html');
      if (fs.existsSync(landingPath)) {
        const content = fs.readFileSync(landingPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(content);
      }
    } catch (error) {
      console.error('Error serving landing page:', error);
      // Fall through to 404
    }
  }
  
  // Gestione file statici
  if (pathname.startsWith('/public/')) {
    const filename = path.basename(pathname);
    const filePath = path.join(staticPath, filename);

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
    } else {
      console.error(`Static file not found at: ${filePath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
  }
  
  // Gestione richieste di stream (DELEGATO ALL'SDK)
  if (pathname.startsWith('/stream/')) {
    const parts = pathname.split('/');
    const type = parts[2] as 'movie' | 'series';
    const id = parts[3]?.replace('.json', '');

    // Se l'URL non è valido, rispondi come si aspetta Stremio
    if (!type || !id) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ streams: [] }));
    }

    try {
        // Delega la gestione dello stream all'interfaccia standard dell'addon.
        // Questo è il metodo più robusto e usa la logica definita in addon.ts.
        const streamResponse = await addonInterface.get('stream', type, id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(streamResponse || { streams: [] }));
    } catch (error) {
        console.error('Stream handler error:', error);
        // In caso di errore, rispondi sempre con 200 OK e un array vuoto.
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ streams: [] }));
    }
  }
  
  // Per tutte le altre richieste, mostra un 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Avvia il server
server.listen(port, () => {
  console.log(`Addon active on port ${port}`);
  console.log(`Manifest available at http://localhost:${port}/manifest.json`);
});
