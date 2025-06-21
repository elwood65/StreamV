"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const stremio_addon_sdk_1 = require("stremio-addon-sdk");
const extractor_1 = require("./extractor");
const manifest = {
    id: "xyz.theditor.stremsrc",
    version: "0.1.0",
    catalogs: [],
    resources: [
        {
            name: "stream",
            types: ["movie", "series"],
            idPrefixes: ["tt", "kitsu"],
        },
    ],
    types: ["movie", "series"],
    name: "stremsrc",
    description: "A VidSRC extractor for stremio",
};
const builder = new stremio_addon_sdk_1.addonBuilder(manifest);
builder.defineStreamHandler((_a) => __awaiter(void 0, [_a], void 0, function* ({ id, type, }) {
    var _b;
    try {
        const res = yield (0, extractor_1.getStreamContent)(id, type);
        if (!res) {
            return { streams: [] };
        }
        let streams = [];
        for (const st of res) {
            if (st.stream == null)
                continue;
            streams.push({
                title: (_b = st.name) !== null && _b !== void 0 ? _b : "Unknown",
                url: st.stream,
                behaviorHints: { notWebReady: true },
            });
        }
        return { streams: streams };
    }
    catch (error) {
        console.error('Stream extraction failed:', error);
        return { streams: [] };
    }
}));
exports.default = builder.getInterface();
