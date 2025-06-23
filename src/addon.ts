import { addonBuilder, Manifest } from 'stremio-addon-sdk';
import { getStreamContent } from './extractor';
import config from '../addon-config.json';

let showBothLinksGlobal = false;

export function setShowBothLinks(value: boolean) {
    showBothLinksGlobal = value;
}

// Usa i valori dal file JSON, con la struttura corretta
const manifest: Manifest = {
    id: config.addonId,
    version: config.addonVersion,
    name: config.addonName,
    description: config.addonDescription,
    logo: config.addonLogo,
    background: "https://raw.githubusercontent.com/qwertyuiop8899/StreamV/refs/heads/main/public/backround.png",
    resources: [ // <-- CORRETTO: Array di oggetti
        {
            name: "stream",
            types: ["movie", "series"],
            idPrefixes: ["tt", "kitsu"],
        }
    ],
    types: ["movie", "series"],
    catalogs: []
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`Handler chiamato per ${type} ${id}. Flag showBothLinks: ${showBothLinksGlobal}`);
    const streams = await getStreamContent(id, type as ('movie' | 'series'), showBothLinksGlobal);
    return { streams };
});

export default builder.getInterface();
