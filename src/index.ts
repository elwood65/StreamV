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

// Funzione per estrarre l'URL originale dal proxy URL
function extractOriginalUrl(proxyUrl: string): string {
  try {
    // Controlla se è un URL proxy
    if (proxyUrl.includes('/proxy/hls/manifest.m3u8')) {
      // Estrai il parametro 'd' che contiene l'URL originale
      const urlObj = new URL(proxyUrl);
      const originalUrl = urlObj.searchParams.get('d');
      if (originalUrl) {
        console.log("Extracted original URL:", originalUrl);
        return originalUrl;
      }
    }
  } catch (e) {
    console.error("Failed to extract original URL:", e);
  }
  
  // Se non riusciamo a estrarre l'URL originale, restituisci quello proxy
  return proxyUrl;
}

// Crea un server HTTP personalizzato
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url || '', true);
  
  console.log(`Received request: ${req.url}`);
  
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
      
      // Content-Type corretto per i file statici
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
    
    // Convert string to proper ContentType - supporta sia movie che series
    const type = typePath === 'series' ? 'series' : 'movie';
    
    if (type && id) {
      // Ottieni il parametro showBothLinks dalla query della richiesta corrente
      const showBothLinksGlobal = parsedUrl.query.showBothLinks === 'true';
      console.log(`Stream request with showBothLinks=${showBothLinksGlobal}`);
      
      // Usa la funzione getStreamContent direttamente
      getStreamContent(id, type as any)
        .then((streamResults) => {
          if (!streamResults) {
            console.log("No stream results found");
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ streams: [] }));
          }
          
          // Ottieni configurazione MFP
          const mfpUrl = process.env.MFP_URL;
          const mfpPsw = process.env.MFP_PSW;
          const hasMfp = !!mfpUrl && !!mfpPsw;
          console.log(`MFP Configuration available: ${hasMfp}`);
          
          const streams = [];
          
          // Processa ogni risultato dello streaming
          for (const st of streamResults) {
            // Ignora i risultati senza URL
            if (!st.streamUrl) {
              console.log("Skipping result without URL");
              continue;
            }
            
            console.log(`Processing stream ${st.name || "unnamed"} with URL ${st.streamUrl}`);
            
            // Usa il titolo originale senza aggiunte
            const contentTitle = st.name ?? "Stream";
            
            // Caso 1: Mostra entrambi i link (originale + proxy/mancante)
            if (showBothLinksGlobal) {
              // Aggiungi lo stream originale - titolo puro senza (Proxy)
              console.log("Adding original stream");
              streams.push({
                title: "StreamViX", // Solo il nome dell'addon 
                name: contentTitle, // Il titolo originale
                url: st.streamUrl,
                behaviorHints: { notWebReady: true }
              });
              
              // Se MFP è configurato, aggiungi lo stream proxy
              if (hasMfp) {
                console.log("Adding MFP proxy stream");
                
                const params = new URLSearchParams({
                  api_password: mfpPsw!,
                  d: st.streamUrl
                });
                
                streams.push({
                  title: "StreamViX (Proxy)", // Nome addon con (Proxy)
                  name: contentTitle, // Il titolo originale
                  url: `${mfpUrl}/proxy/hls/manifest.m3u8?${params.toString()}`,
                  behaviorHints: { notWebReady: false }
                });
              } else {
                // Se MFP non è configurato, aggiungi un link "Proxy mancante"
                console.log("Adding 'Proxy mancante' stream");
                streams.push({
                  title: "StreamViX (Proxy mancante)", // Nome addon con (Proxy mancante)
                  name: contentTitle, // Il titolo originale
                  url: st.streamUrl, // Usa lo stesso URL originale
                  behaviorHints: { notWebReady: true }
                });
              }
            } else {
              // Caso 2: Mostra un solo link
              if (hasMfp) {
                // Se MFP è configurato, mostra solo il proxy
                console.log("Adding only proxy stream");
                
                const params = new URLSearchParams({
                  api_password: mfpPsw!,
                  d: st.streamUrl
                });
                
                streams.push({
                  title: "StreamViX (Proxy)", // Nome addon con (Proxy)
                  name: contentTitle, // Il titolo originale
                  url: `${mfpUrl}/proxy/hls/manifest.m3u8?${params.toString()}`,
                  behaviorHints: { notWebReady: false }
                });
              } else {
                // Se MFP non è configurato, mostra solo l'originale
                console.log("Adding only original stream (no MFP)");
                streams.push({
                  title: "StreamViX", // Solo il nome dell'addon
                  name: contentTitle, // Il titolo originale
                  url: st.streamUrl,
                  behaviorHints: { notWebReady: true }
                });
              }
            }
          }
          
          // Debug
          console.log(`Generated ${streams.length} streams`);
          for (const s of streams) {
            console.log(`Stream: ${s.title}, Name: ${s.name}, URL: ${s.url}`);
          }
          
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
