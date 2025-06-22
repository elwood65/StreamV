#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 

import { serveHTTP } from "stremio-addon-sdk";
import { addon, setShowBothLinks } from "./addon";
import { getStreamContent } from "./extractor";
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

// Configura porta e indirizzo
const port = process.env.PORT ? parseInt(process.env.PORT) : 7860;
const staticPath = path.join(__dirname, '..', 'src', 'public');

// Stampa le variabili d'ambiente MFP (solo per debugging)
console.log("MFP_URL from env:", process.env.MFP_URL);
console.log("MFP_PSW from env:", process.env.MFP_PSW);

// Ottieni l'interfaccia addon
const addonInterface = addon.getInterface();

// Crea un server HTTP personalizzato
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url || '', true);
  
  // Intercetta la richiesta di manifest.json per leggere i parametri della query
  if (parsedUrl.pathname === '/manifest.json') {
    // Estrai il parametro showBothLinks
    const showBothLinks = parsedUrl.query.showBothLinks === 'true';
    
    // Imposta la configurazione globale
    setShowBothLinks(showBothLinks);
    
    // Continua con la richiesta normale - serve il manifest.json
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(addonInterface.manifest));
  }
  
  // Gestisci la richiesta per la landing page
  if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
    try {
      const landingPath = path.join(staticPath, 'landing.html');
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
  
  // Per le richieste di stream, gestisci manualmente
  if (parsedUrl.pathname?.startsWith('/stream/')) {
    // Estrai i parametri dalla URL
    const typePath = parsedUrl.pathname.split('/')[2]; // Ottieni il secondo segmento
    let id = parsedUrl.pathname.split('/')[3]; // Ottieni il terzo segmento
    
    // Rimuovi l'estensione .json se presente
    if (id && id.endsWith('.json')) {
      id = id.replace('.json', '');
    }
    
    // Debug
    console.log(`Extracting stream for ${id} (${typePath})`);
    
    // Convert string to proper ContentType
    const type = typePath === 'series' ? 'series' : 'movie';
    
    if (type && id) {
      // Invece di usare addonInterface.methods (che non esiste), 
      // usiamo direttamente la funzione getStreamContent
      getStreamContent(id, type as any)
        .then((streamResults) => {
          if (!streamResults) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ streams: [] }));
          }
          
          // Costruisci lo stesso oggetto di risposta che abbiamo in addon.ts
          const mfpUrl = process.env.MFP_URL;
          const mfpPsw = process.env.MFP_PSW;
          const showBothLinksGlobal = parsedUrl.query.showBothLinks === 'true';
          
          const streams = streamResults.flatMap(st => {
            if (!st.streamUrl) return [];
            
            const result = [];
            
            // Aggiungi sempre lo stream originale
            result.push({
              title: st.name ?? "Original Source",
              url: st.streamUrl,
              behaviorHints: { notWebReady: true }
            });
            
            // Se showBothLinks è true, aggiungi un secondo stream
            if (showBothLinksGlobal) {
              // Se MFP è configurato, usa quello
              if (mfpUrl && mfpPsw) {
                const params = new URLSearchParams({
                  api_password: mfpPsw,
                  d: st.streamUrl
                });
                
                result.push({
                  title: `${st.name ?? "Original Source"} (Proxy)`,
                  url: `${mfpUrl}/proxy/hls/manifest.m3u8?${params.toString()}`,
                  behaviorHints: { notWebReady: false }
                });
              } 
              // Altrimenti aggiungi un link fittizio
              else {
                result.push({
                  title: `${st.name ?? "Original Source"} (Missing Proxy)`,
                  url: st.streamUrl,
                  behaviorHints: { notWebReady: true }
                });
              }
            } 
            // Se MFP è configurato e showBothLinks è false, sostituisci lo stream originale con quello proxy
            else if (mfpUrl && mfpPsw) {
              // Rimuovi lo stream originale
              result.pop();
              
              // Create params here too
              const params = new URLSearchParams({
                api_password: mfpPsw,
                d: st.streamUrl
              });
              
              result.push({
                title: `${st.name ?? "Original Source"} (Proxy)`,
                url: `${mfpUrl}/proxy/hls/manifest.m3u8?${params.toString()}`,
                behaviorHints: { notWebReady: false }
              });
            }
            
            return result;
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ streams }));
        })
        .catch((error: Error) => {
          console.error('Stream handler error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Stream handler failed' }));
        });
      return;
    }
  }
  
  // Per tutte le altre richieste, mostra un 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Avvia il server sulla porta specificata
server.listen(port, () => {
  console.log(`Addon active on port ${port}`);
  console.log(`Manifest available at http://localhost:${port}/manifest.json`);
});

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
