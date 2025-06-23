import { addonBuilder, Manifest, StreamHandlerArgs } from 'stremio-addon-sdk';
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

// Aggiungi il tipo 'StreamHandlerArgs' per risolvere l'errore 'implicitly has an any type'
builder.defineStreamHandler(async (args: StreamHandlerArgs) => {
    console.log(`Handler chiamato per ${args.type} ${args.id}. Flag showBothLinks: ${showBothLinksGlobal}`);
    const streams = await getStreamContent(args.id, args.type as ('movie' | 'series'), showBothLinksGlobal);
    return { streams };
});

export default builder.getInterface();
