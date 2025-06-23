import * as cheerio from "cheerio";

export async function extract(url: string): Promise<string | null> {
    try {
        console.log(`[DoodStream] Extracting: ${url}`);
        
        // Normalizza URL
        const doodUrl = url.replace(/dood\.([a-z]+)\//, 'dood.so/');
        
        // Se è già un URL di streaming diretto (come dood.so/d/xyz), usalo direttamente
        if (doodUrl.includes('/d/')) {
            return doodUrl;
        }
        
        // Ottieni la pagina e trova il token MD5
        const response = await fetch(doodUrl, {
            headers: { 'Referer': 'https://dood.so/' }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch DoodStream page: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Cerca il token nel JavaScript
        const scripts = $('script').map((_, el) => $(el).html()).get();
        const tokenScript = scripts.find(script => script && script.includes('pass_md5'));
        
        if (!tokenScript) {
            throw new Error('Could not find token script');
        }
        
        // Estrai il token MD5
        const tokenMatch = tokenScript.match(/['"]*pass_md5['"]*\s*[:=]\s*['"]([^'"]+)['"]/);
        if (!tokenMatch) {
            throw new Error('Could not extract MD5 token');
        }
        
        const token = tokenMatch[1];
        
        // Estrai l'URL base
        const videoIdMatch = doodUrl.match(/\/(?:e|f)\/([a-zA-Z0-9]+)/);
        if (!videoIdMatch) {
            throw new Error('Could not extract video ID');
        }
        
        const videoId = videoIdMatch[1];
        
        // Costruisci l'URL del file
        const domain = new URL(doodUrl).origin;
        const fileUrl = `${domain}/download/${videoId}?token=${token}`;
        
        // Ottieni l'URL di streaming finale
        const fileResponse = await fetch(fileUrl, {
            headers: { 'Referer': doodUrl }
        });
        
        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch download URL: ${fileResponse.status}`);
        }
        
        const fileHtml = await fileResponse.text();
        const fileDoc = cheerio.load(fileHtml);
        
        // Il link di download diretto è nel pulsante
        const directUrl = fileDoc('a.btn.btn-primary.btn-go').attr('href');
        
        if (!directUrl) {
            throw new Error('Could not find direct download link');
        }
        
        console.log(`[DoodStream] Extracted URL: ${directUrl}`);
        return directUrl;
    } catch (error) {
        console.error('[DoodStream] Extraction error:', error);
        return null;
    }
}
