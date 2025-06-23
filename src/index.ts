#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 

import { addon, setShowBothLinks } from "./addon";
import { getStreamContent } from "./extractor";
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

// Configura porta e indirizzo
const port = process.env.PORT ? parseInt(process.env.PORT) : 7860;
const staticPath = path.join(__dirname, '..', 'src', 'public');

// API key per TMDB
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'f090bb54758cabf231fb605d3e3e0468';

// Stampa le variabili d'ambiente MFP (solo per debugging)
console.log("MFP_URL from env:", process.env.MFP_URL);
console.log("MFP_PSW from env:", process.env.MFP_PSW);

// Ottieni l'interfaccia addon
const addonInterface = addon.getInterface();

// Definizione dell'interfaccia per i dati delle serie
interface SeriesData {
  tmdbId: number;
  type: string;
  title: string;
  season?: number;
  episode?: number;
}


/**
 * Estrae l'URL originale se l'URL fornito è un link proxy di questo addon.
 * @param {string} proxyUrl L'URL potenzialmente proxato.
 * @returns {string} L'URL originale.
 */
function extractOriginalUrl(proxyUrl: string): string {
  try {
    const urlObj = new URL(proxyUrl);
    // Controlla se è un URL proxy e ha il parametro 'd'
    if (proxyUrl.includes('/proxy/hls/manifest.m3u8') && urlObj.searchParams.has('d')) {
      const originalUrl = urlObj.searchParams.get('d');
      if (originalUrl) {
        console.log("Extracted original URL from proxy link:", originalUrl);
        return originalUrl;
      }
    }
  } catch (e) {
    // Non è un URL valido o non è un proxy, quindi lo trattiamo come originale.
  }
  // Se non è un link proxy, restituiscilo così com'è.
  return proxyUrl;
}


// Crea un server HTTP personalizzato
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';
  
  console.log(`Received request: ${req.url}`);
  
  // Gestione manifest
  if (pathname === '/manifest.json') {
    const showBothLinks = parsedUrl.query.showBothLinks === 'true';
    setShowBothLinks(showBothLinks);
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
    }
  }
  
  // Gestione file statici
  if (pathname.startsWith('/public/')) {
    // CORREZIONE: Usa la variabile 'staticPath' già definita per costruire un percorso affidabile.
    const filename = path.basename(pathname);
    const filePath = path.join(staticPath, filename);

    console.log(`Attempting to serve static file: ${filePath}`); // Log per debug

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
  
  // Gestione richieste di stream
  if (pathname.startsWith('/stream/')) {
    const parts = pathname.split('/');
    const type = parts[2] as 'movie' | 'series';
    let id = parts[3]?.replace('.json', '');

    if (!type || !id) {
        res.writeHead(200, { 'Content-Type': 'application/json' }); // Rispondi 200 OK
        return res.end(JSON.stringify({ streams: [] })); // Con un array di stream vuoto
    }

    id = decodeURIComponent(id);
    console.log(`Extracting stream for id: ${id}, type: ${type}`);

    const showBothLinksGlobal = parsedUrl.query.showBothLinks === 'true';
    let streamResults: { name: string, streamUrl: string }[] | null = [];

    try {
        // Semplifichiamo: getStreamContent gestisce già correttamente sia film che serie,
        // inclusa la logica per ottenere il titolo corretto.
        streamResults = await getStreamContent(id, type);

        if (!streamResults || streamResults.length === 0) {
            console.log("No stream results found for:", id);
            res.writeHead(200, { 'Content-Type': 'application/json' }); // CORREZIONE: Rispondi sempre con 200 OK
            return res.end(JSON.stringify({ streams: [] })); // Invia un array vuoto
        }

        const mfpUrl = process.env.MFP_URL;
        const mfpPsw = process.env.MFP_PSW;
        const hasMfp = !!mfpUrl && !!mfpPsw;
        const streams = [];

        for (const st of streamResults) {
            if (!st.streamUrl) {
                console.log('Stream result skipped, no streamUrl');
                continue;
            }

            const originalUrl = extractOriginalUrl(st.streamUrl);
            const contentTitle = st.name ?? "Stream"; // Es. "The Last of Us S01E01"
            
            console.log(`Processing stream: "${contentTitle}". Received URL: ${st.streamUrl}. Deduced Original URL: ${originalUrl}`);
            console.log(`Config: showBothLinks=${showBothLinksGlobal}, hasMfp=${hasMfp}`);

            const mfpProxyUrl = hasMfp 
                ? `${mfpUrl}/proxy/hls/manifest.m3u8?${new URLSearchParams({ api_password: mfpPsw!, d: originalUrl })}`
                : null;

            if (showBothLinksGlobal) {
                // --- LINK 1: Originale (NON PROXY) ---
                streams.push({
                    name: "StreamViX",
                    title: contentTitle,
                    url: originalUrl,
                    behaviorHints: { notWebReady: true }
                });

                // --- LINK 2: Proxy o Placeholder ---
                if (mfpProxyUrl) {
                    streams.push({
                        name: "StreamViX (Proxy)",
                        title: contentTitle,
                        url: mfpProxyUrl,
                        behaviorHints: { notWebReady: false }
                    });
                } else {
                    streams.push({
                        name: "StreamViX (Proxy Mancante)",
                        title: contentTitle,
                        url: originalUrl,
                        behaviorHints: { notWebReady: true }
                    });
                }
            } else {
                // --- Mostra solo un link ---
                if (mfpProxyUrl) {
                    streams.push({
                        name: "StreamViX (Proxy)",
                        title: contentTitle,
                        url: mfpProxyUrl,
                        behaviorHints: { notWebReady: false }
                    });
                } else {
                    streams.push({
                        name: "StreamViX",
                        title: contentTitle,
                        url: originalUrl,
                        behaviorHints: { notWebReady: true }
                    });
                }
            }
        }

        console.log(`Generated ${streams.length} streams for ${id}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ streams }));

    } catch (error) {
        console.error('Stream handler error:', error);
        // CORREZIONE CRITICA: Rispondi sempre con 200 OK e un array di stream vuoto in caso di errore.
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
