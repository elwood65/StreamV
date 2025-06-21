import { addonBuilder, Manifest, Stream } from "stremio-addon-sdk";
import { getStreamContent, VixCloudStreamInfo } from "./extractor";
import * as fs from 'fs';
import * as path from 'path';

// Base manifest configuration
const baseManifest: Manifest = {
    id: "org.stremio.vixcloud",
    version: "0.1.0",
    name: "StreamViX",
    description: "Addon for Vixsrc streams.", 
    icon: "/public/icon.png",
    background: "/public/backround.png",
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    catalogs: [],
    resources: ["stream"] 
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
                logo: customConfig.addonLogo || baseManifest.logo
            };
        }
    } catch (error) {
        console.error('Error loading custom configuration:', error);
    }
    
    return baseManifest;
}

// Use the configured manifest
const manifest = loadCustomConfig();

const builder = new addonBuilder(manifest);


builder.defineStreamHandler(
  async ({
    id,
    type,
  }): Promise<{
    streams: Stream[];
  }> => {
    try {
      const res: VixCloudStreamInfo[] | null = await getStreamContent(id, type);

      if (!res) {
        return { streams: [] };
      }

      let streams: Stream[] = [];
      for (const st of res) {
        if (st.streamUrl == null) continue;
        
        // Aggiungi questo debug
        console.log(`Adding stream with title: "${st.name}"`);
        
        streams.push({
          title: st.name, // Assicurati che questo campo sia corretto
          name: st.name,  // Prova ad aggiungere anche questo campo
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

export const addon = builder;
export default builder.getInterface();
