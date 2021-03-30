class TileLoader {
    // This class contains the common code to load tile content, such as b3dm and pnts files.
    // It is not to be used directly. Instead, subclasses are used to implement specific
    // content loaders for different tile types.
    constructor(url) {
        this.url = url;
        this.type = url.slice(-4);
        this.version = null;
        this.byteLength = null;
        this.featureTableJSON = null;
        this.featureTableBinary = null;
        this.batchTableJson = null;
        this.batchTableBinary = null;
        this.binaryData = null;
    }

    // TileLoader.load
    async load() {
        this.abortController = new AbortController();
        let response = await fetch(this.url, { signal: this.abortController.signal });
        this.abortController = null;
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        let buffer = await response.arrayBuffer();
        let res = await this.parseResponse(buffer);
        return res;
    }

    abortLoad() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            return true;
        }
        return false;
    }

    async parseResponse(buffer) {
        let header = new Uint32Array(buffer.slice(0, 32));
        let decoder = new TextDecoder();
        let magic = decoder.decode(new Uint8Array(buffer.slice(0, 4)));
        
        if (magic != this.type) {
            throw new Error(`Invalid magic string, expected '${this.type}', got '${this.magic}'`);
        }

        this.version = header[1];
        this.byteLength = header[2];
        let featureTableJSONByteLength = header[3];
        let featureTableBinaryByteLength = header[4];
        let batchTableJsonByteLength = header[5];
        let batchTableBinaryByteLength = header[6];
        let gltfFormat = magic === 'i3dm' ? header[7] : 1;

        let pos = magic === 'i3dm' ? 32 : 28; // header length
        if (featureTableJSONByteLength > 0) {
            this.featureTableJSON = JSON.parse(
                decoder.decode(new Uint8Array(buffer.slice(pos, pos + featureTableJSONByteLength)))
            );
            pos += featureTableJSONByteLength;
        } else {
            this.featureTableJSON = {};
        }

        this.featureTableBinary = buffer.slice(pos, pos + featureTableBinaryByteLength);
        pos += featureTableBinaryByteLength;
        if (batchTableJsonByteLength > 0) {
            this.batchTableJson = JSON.parse(
                decoder.decode(new Uint8Array(buffer.slice(pos, pos + batchTableJsonByteLength)))
            );
            pos += batchTableJsonByteLength;
        } else {
            this.batchTableJson = {};
        }

        this.batchTableBinary = buffer.slice(pos, pos + batchTableBinaryByteLength);
        pos += batchTableBinaryByteLength;

        if (gltfFormat === 1) {
            this.binaryData = buffer.slice(pos);
        } else {
            // load binary data from url at pos
            this.modelUrl = decoder.decode(new Uint8Array(buffer.slice(pos)));
            if (internalGLTFCache.has(this.modelUrl)) {
                this.binaryData = internalGLTFCache.get(this.modelUrl);
            } else {
                let response = await fetch(this.modelUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
                }
                this.binaryData = await response.arrayBuffer();
                internalGLTFCache.set(this.modelUrl, this.binaryData);
            }
        }

        return this;
    }

    copy() {
        return {
            url: this.url,
            type: this.type,
            version: this.version,
            byteLength: this.byteLength,
            featureTableJSON: this.featureTableJSON,
            featureTableBinary: this.featureTableBinary.slice(0),
            batchTableJson: [...this.batchTableJson.attr],
            batchTableBinary: this.batchTableBinary.slice(0),
            binaryData: this.binaryData.slice(0),
        };
     }
}

class B3DM extends TileLoader {
    constructor(url) {
        super(url);
        this.glbData = null;
    }
    async parseResponse(buffer) {
        await super.parseResponse(buffer);
        this.glbData = this.binaryData;
        return this;
    }

    copy() {
        const copy = super.copy();
        copy.glbData = this.glbData.slice(0);
        return copy;
    }
}

class CMPT extends TileLoader {
    constructor(url) {
        super(url);
    }
    async parseResponse(buffer) {
        let header = new Uint32Array(buffer.slice(0, 4 * 4));
        let decoder = new TextDecoder();
        let magic = decoder.decode(new Uint8Array(buffer.slice(0, 4)));
        if (magic != this.type) {
            throw new Error(`Invalid magic string, expected '${this.type}', got '${this.magic}'`);
        }
        this.version = header[1];
        this.byteLength = header[2];
        this.tilesLength = header[3];
        let innerTiles = [];
        let tileStart = 16;
        for (let i = 0; i < this.tilesLength; i++) {
            let tileHeader = new Uint32Array(buffer.slice(tileStart, tileStart + 3 * 4));
            let tileMagic = decoder.decode(new Uint8Array(buffer.slice(tileStart, tileStart + 4)));
            //console.log(`innerTile: ${i}, magic: ${tileMagic}`);
            let tileByteLength = tileHeader[2];
            let tileData = buffer.slice(tileStart, tileStart + tileByteLength);
            innerTiles.push({ type: tileMagic, data: tileData });
            tileStart += tileByteLength;
        }
        return innerTiles;
    }
}

class PNTS extends TileLoader {
    constructor(url) {
        super(url);
        this.points = new Float32Array();
        this.rgba = null;
        this.rgb = null;
    }

    parseResponse(buffer) {
        super.parseResponse(buffer);
        if (this.featureTableJSON.POINTS_LENGTH && this.featureTableJSON.POSITION) {
            let len = this.featureTableJSON.POINTS_LENGTH;
            let pos = this.featureTableJSON.POSITION.byteOffset;
            this.points = new Float32Array(
                this.featureTableBinary.slice(pos, pos + len * Float32Array.BYTES_PER_ELEMENT * 3)
            );
            this.rtc_center = this.featureTableJSON.RTC_CENTER;
            if (this.featureTableJSON.RGBA) {
                pos = this.featureTableJSON.RGBA.byteOffset;
                let colorInts = new Uint8Array(
                    this.featureTableBinary.slice(pos, pos + len * Uint8Array.BYTES_PER_ELEMENT * 4)
                );
                let rgba = new Float32Array(colorInts.length);
                for (let i = 0; i < colorInts.length; i++) {
                    rgba[i] = colorInts[i] / 255.0;
                }
                this.rgba = rgba;
            } else if (this.featureTableJSON.RGB) {
                pos = this.featureTableJSON.RGB.byteOffset;
                let colorInts = new Uint8Array(
                    this.featureTableBinary.slice(pos, pos + len * Uint8Array.BYTES_PER_ELEMENT * 3)
                );
                let rgb = new Float32Array(colorInts.length);
                for (let i = 0; i < colorInts.length; i++) {
                    rgb[i] = colorInts[i] / 255.0;
                }
                this.rgb = rgb;
            } else if (this.featureTableJSON.RGB565) {
                console.error('RGB565 is currently not supported in pointcloud tiles.');
            }
        }
        return this;
    }
}

let internalGLTFCache = new Map();

export { B3DM, PNTS, CMPT, internalGLTFCache };
