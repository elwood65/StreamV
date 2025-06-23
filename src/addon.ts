import { addonBuilder, Manifest } from "stremio-addon-sdk";
import { getStreamContent } from "./extractor";
import config from '../addon-config.json'; // 1. Importa la configurazione

// 2. Variabile per lo stato del flag
let showBothLinksGlobal = false;

// 3. Funzione per cambiare lo stato
export function setShowBothLinks(value: boolean) {
    console.log(`Stato showBothLinks aggiornato a: ${value}`);
    showBothLinksGlobal = value;
}

// Base manifest configuration
const baseManifest: Manifest = {
    id: "org.prisonmike.streamvix",
    version: "1.2.0",
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

// Usa i valori dal file JSON, risolvendo il problema originale
const manifest = {
    id: config.addonId,
    version: config.addonVersion,
    name: config.addonName,
    description: config.addonDescription,
    logo: config.addonLogo,
    background: "https://raw.githubusercontent.com/qwertyuiop8899/StreamV/refs/heads/main/public/backround.png",
    resources: ["stream"],
    types: ["movie", "series"],
    idPrefixes: ["tt", "kitsu"],
    catalogs: []
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(
  async ({
    id,
    type
  }) => {
    console.log(`Handler chiamato per ${type} ${id}. Flag showBothLinks: ${showBothLinksGlobal}`);
    const streams = await getStreamContent(type, id, showBothLinksGlobal);
    return { streams: streams || [] };
  }
);

export const addon = builder;
export default builder.getInterface();
