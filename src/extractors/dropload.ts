import * as cheerio from "cheerio";

export async function extract(url: string): Promise<string | null> {
    try {
        console.log(`[Dropload] Extracting: ${url}`);
        
        // Normalizza URL
        const droploadUrl = url.replace(/^\/\//, 'https://');
        
        // Ottieni la pagina
        const response = await fetch(droploadUrl, {
            headers: { 'Referer': 'https://dropload.io/' }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Dropload page: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Cerca il link diretto nel JavaScript
        const $ = cheerio.load(html);
        let directUrl = '';
        
        // Esamina tutti gli script per cercare l'URL del video
        $('script').each((_, script) => {
            const scriptContent = $(script).html() || '';
            
            // Dropload utilizza diversi formati, proviamo i più comuni
            const patterns = [
                /sources\s*:\s*\[\s*{\s*src\s*:\s*['"](https?:[^'"]+)['"]/,
                /sources\s*:\s*\[\s*{\s*file\s*:\s*['"](https?:[^'"]+)['"]/,
                /file\s*:\s*['"](https?:[^'"]+)['"]/
            ];
            
            for (const pattern of patterns) {
                const match = scriptContent.match(pattern);
                if (match && match[1]) {
                    directUrl = match[1];
                    return false; // break the loop
                }
            }
        });
        
        if (directUrl) {
            console.log(`[Dropload] Extracted URL: ${directUrl}`);
            return directUrl;
        }
        
        throw new Error('Could not extract video URL from Dropload');
    } catch (error) {
        console.error('[Dropload] Extraction error:', error);
        return null;
    }
}
