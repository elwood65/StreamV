import { addonBuilder, Manifest, Stream } from "stremio-addon-sdk";
import { getStreamContent, VixCloudStreamInfo } from "./extractor";
import * as fs from 'fs';
import { landingTemplate } from './landingPage'; // Import the new landingTemplate
import * as path from 'path';

// Interfaccia per la configurazione URL
interface AddonConfig {
  mediaFlowProxyUrl?: string;
  mediaFlowProxyPassword?: string;
  tmdbApiKey?: string;
  bothLinks?: string;
  [key: string]: any;
}

// Base manifest configuration
const baseManifest: Manifest = {
    id: "org.stremio.vixcloud",
    version: "1.0.1",
    name: "StreamViX",
    description: "Addon for Vixsrc streams.", 
    icon: "/public/icon.png",
    background: "/public/backround.png",
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    catalogs: [],
    resources: ["stream", "landingTemplate"],
    behaviorHints: {
        configurable: true
    },
    config: [
        {
            key: "tmdbApiKey",
            title: "TMDB API Key",
            type: "password",
            required: false
        },
        {
            key: "mediaFlowProxyUrl", 
            title: "MediaFlow Proxy URL (Optional)",
            type: "text",
            required: false
        },
        {
            key: "mediaFlowProxyPassword",
            title: "MediaFlow Proxy Password (Optional)", 
            type: "password",
            required: false
        },
        {
            key: "bothLinks",
            title: "Show Both Links (Proxy and Direct)",
            type: "checkbox",
            required: false
        }
    ]
};

// Load custom configuration if available
function loadCustomConfig(): Manifest {
    try {
        const configPath = path.join(__dirname, '..', 'addon-config.json');
        
        if (fs.existsSync(configPath)) {
            const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            return {
                ...baseManifest,
                id: customConfig.addonId || baseManifest.id,
                name: customConfig.addonName || baseManifest.name,
                description: customConfig.addonDescription || baseManifest.description,
                version: customConfig.addonVersion || baseManifest.version,
                logo: customConfig.addonLogo || baseManifest.logo,
                icon: customConfig.addonLogo || baseManifest.icon,
                background: baseManifest.background
            };
        }
    } catch (error) {
        console.error('Error loading custom configuration:', error);
    }
    
    return baseManifest;
}

// Funzione per parsare la configurazione dall'URL
function parseConfigFromArgs(args: any): AddonConfig {
    const config: AddonConfig = {};
    
    // Se args è una stringa, prova a decodificarla come JSON
    if (typeof args === 'string') {
        try {
            const decoded = decodeURIComponent(args);
            const parsed = JSON.parse(decoded);
            return parsed;
        } catch (error) {
            console.error('Error parsing config from URL:', error);
            return {};
        }
    }
    
    // Se args è già un oggetto, usalo direttamente
    if (typeof args === 'object' && args !== null) {
        return args;
    }
    
    return config;
}

// Funzione per creare il builder con configurazione dinamica
function createBuilder(config: AddonConfig = {}) {
    // Use the configured manifest
    const manifest = loadCustomConfig();
    
    // Modifica il manifest in base alla configurazione
    if (config.mediaFlowProxyUrl || config.bothLinks || config.tmdbApiKey) {
        manifest.name += ' (Configured)';
    }
    
    const builder = new addonBuilder(manifest);

    builder.defineStreamHandler(
        async ({
            id,
            type,
        }): Promise<{
            streams: Stream[];
        }> => {
            try {
                // Salva le variabili d'ambiente originali
                const originalMfpUrl = process.env.MFP_URL;
                const originalMfpPsw = process.env.MFP_PSW;
                const originalBothLink = process.env.BOTHLINK;
                const originalTmdbKey = process.env.TMDB_API_KEY;
                
                // Override delle variabili d'ambiente con i valori dalla configurazione URL
                if (config.mediaFlowProxyUrl) {
                    process.env.MFP_URL = config.mediaFlowProxyUrl;
                }
                if (config.mediaFlowProxyPassword) {
                    process.env.MFP_PSW = config.mediaFlowProxyPassword;
                }
                if (config.tmdbApiKey) {
                    process.env.TMDB_API_KEY = config.tmdbApiKey;
                }
                // Il valore di una checkbox dal form è 'on' se spuntata.
                // Lo convertiamo in una stringa 'true' o 'false'.
                if (config.bothLinks) {
                    process.env.BOTHLINK = config.bothLinks === 'on' ? 'true' : 'false';
                }
                
                const res: VixCloudStreamInfo[] | null = await getStreamContent(id, type);

                // Ripristina le variabili d'ambiente originali
                process.env.MFP_URL = originalMfpUrl;
                process.env.MFP_PSW = originalMfpPsw;
                process.env.BOTHLINK = originalBothLink;
                process.env.TMDB_API_KEY = originalTmdbKey;

                if (!res) {
                    return { streams: [] };
                }

                let streams: Stream[] = [];
                for (const st of res) {
                    if (st.streamUrl == null) continue;
                    
                    console.log(`Adding stream with title: "${st.name}"`);

                    const streamName = st.source === 'proxy' ? 'StreamViX (Proxy)' : 'StreamViX';
                    
                    streams.push({
                        title: st.name,
                        name: streamName,
                        url: st.streamUrl,
                        behaviorHints: {
                            notWebReady: true,
                        },
                        proxyHeaders: { "request": { "Referer": st.referer } }
                    } as Stream);
                }
                return { streams: streams };
            } catch (error) {
                console.error('Stream extraction failed:', error);
                return { streams: [] };
            }
        }
    );

    return builder;
}

// Export per l'uso normale (senza configurazione)
export const addon = createBuilder();
export default addon.getInterface();

// Export per l'uso con configurazione dinamica
export function createConfiguredAddon(configString: string) {
    const config = parseConfigFromArgs(configString);
    console.log('Creating addon with config:', {
        ...config,
        tmdbApiKey: config.tmdbApiKey ? '[PROVIDED]' : '[NOT PROVIDED]',
        mediaFlowProxyPassword: config.mediaFlowProxyPassword ? '[PROVIDED]' : '[NOT PROVIDED]'
    });
    return createBuilder(config);
}
