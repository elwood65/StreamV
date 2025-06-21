import { addonBuilder, Manifest, Stream } from "stremio-addon-sdk";
import { getStreamContent, VixCloudStreamInfo } from "./extractor";

const manifest: Manifest = {
    id: "org.stremio.vixcloud",
    version: "0.1.0",
    name: "StreamViX",
    description: "Addon for Vixsrc streams.", 
    icon: "/public/icon.png", // Aggiungi questa riga con il percorso della tua icona
    background: "/public/backround.png", // Aggiungi /public/ qui
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    catalogs: [],
    // Usa la forma abbreviata per le risorse
    resources: ["stream"] 
};

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
