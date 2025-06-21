#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config(); 

import { serveHTTP } from 'stremio-addon-sdk';
import addonInterface from './addon'; // Importa l'interfaccia predefinita da addon.ts

const port = parseInt(process.env.PORT || '7860', 10); // Hugging Face usa PORT

serveHTTP(addonInterface, { port: port, static: '/public' }); 
console.log(`Addon server running on port ${port}`);
console.log(`Manifest available at http://localhost:${port}/manifest.json`);

// when you've deployed your addon, un-comment this line
// publishToCentral("https://my-addon.awesome/manifest.json")
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
