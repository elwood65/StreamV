import * as cheerio from "cheerio";

export async function extract(url: string): Promise<string | null> {
    try {
        console.log(`[SuperVideo] Extracting: ${url}`);
        
        // Assicurati che l'URL usi il protocollo HTTPS
        const supervideoUrl = url.replace(/^\/\//, 'https://');
        
        // Ottieni la pagina
        const response = await fetch(supervideoUrl, {
            headers: { 'Referer': 'https://supervideo.tv/' }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch SuperVideo page: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Cerca il link diretto nel JavaScript
        const sourceMatch = html.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*['"](https?:[^'"]+)['"]/);
        if (sourceMatch && sourceMatch[1]) {
            const directUrl = sourceMatch[1];
            console.log(`[SuperVideo] Extracted URL: ${directUrl}`);
            return directUrl;
        }
        
        // Se non trovato con regex, prova con cheerio
        const $ = cheerio.load(html);
        let directUrl = '';
        
        // Esamina tutti gli script per cercare l'URL del player
        $('script').each((_, script) => {
            const scriptContent = $(script).html() || '';
            if (scriptContent.includes('sources') && scriptContent.includes('file')) {
                const match = scriptContent.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*['"](https?:[^'"]+)['"]/);
                if (match && match[1]) {
                    directUrl = match[1];
                    return false; // break the loop
                }
            }
        });
        
        if (directUrl) {
            console.log(`[SuperVideo] Extracted URL: ${directUrl}`);
            return directUrl;
        }
        
        throw new Error('Could not extract video URL from SuperVideo');
    } catch (error) {
        console.error('[SuperVideo] Extraction error:', error);
        return null;
    }
}
