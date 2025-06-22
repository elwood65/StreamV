import { addonBuilder, Manifest, Stream } from "stremio-addon-sdk";
import { getStreamContent, VixCloudStreamInfo } from "./extractor";
import * as fs from 'fs';
import * as path from 'path';

// Base manifest configuration
const baseManifest: Manifest = {
    id: "org.prisonmike.streamvix",
    version: "1.0.0",
    catalogs: [],
    resources: [
        {
            name: "stream",
            types: ["movie", "series"],
            idPrefixes: ["tt", "kitsu"],
        },
    ],
    types: ["movie", "series"],
    name: "StreamViX",
    description: "A custom VixSrc extractor for Stremio",
    logo: "https://raw.githubusercontent.com/qwertyuiop8899/StreamV/refs/heads/main/public/icon.png",
    background: "https://raw.githubusercontent.com/qwertyuiop8899/StreamV/refs/heads/main/public/backround.png"
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
    extra
  }): Promise<{
    streams: Stream[];
  }> => {
    try {
      const res = await getStreamContent(id, type);
      
      if (!res) {
        return { streams: [] };
      }

      let streams: Stream[] = [];
      const showBothLinks = extra && extra.showBothLinks === "true";
      const mfpUrl = process.env.MFP_URL;
      const mfpPsw = process.env.MFP_PSW;
      
      for (const st of res) {
        if (st.stream == null) continue;
        
        // Aggiungi sempre lo stream originale
        streams.push({
          title: st.name ? `${st.name}` : "Original Source",
          url: st.stream,
          behaviorHints: { notWebReady: true },
        } as Stream);
        
        // Se showBothLinks è true, aggiungi un secondo stream
        if (showBothLinks) {
          // Se MFP è configurato, usa quello
          if (mfpUrl && mfpPsw) {
            const params = new URLSearchParams({
              api_password: mfpPsw,
              d: st.stream
            });
            
            streams.push({
              title: st.name ? `${st.name} (Proxy)` : "Proxy Source",
              url: `${mfpUrl}/proxy/hls/manifest.m3u8?${params.toString()}`,
              behaviorHints: { notWebReady: false },
            } as Stream);
          } 
          // Altrimenti aggiungi un link fittizio
          else {
            streams.push({
              title: st.name ? `${st.name} (Missing Proxy)` : "Missing Proxy",
              url: st.stream,
              behaviorHints: { notWebReady: true },
            } as Stream);
          }
        } 
        // Se MFP è configurato e showBothLinks è false, sostituisci lo stream originale con quello proxy
        else if (mfpUrl && mfpPsw) {
          const params = new URLSearchParams({
            api_password: mfpPsw,
            d: st.stream
          });
          
          // Rimuovi lo stream originale
          streams.pop();
          
          streams.push({
            title: st.name ? `${st.name} (Proxy)` : "Proxy Source",
            url: `${mfpUrl}/proxy/hls/manifest.m3u8?${params.toString()}`,
            behaviorHints: { notWebReady: false },
          } as Stream);
        }
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
