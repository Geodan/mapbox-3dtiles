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
        let response = await fetch(this.url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        let buffer = await response.arrayBuffer();
        let res = await this.parseResponse(buffer);
        return res;
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

        /*
	  console.log('magic: ' + magic);
	  console.log('version: ' + this.version);
	  console.log('featureTableJSONByteLength: ' + featureTableJSONByteLength);
	  console.log('featureTableBinaryByteLength: ' + featureTableBinaryByteLength);
	  console.log('batchTableJsonByteLength: ' + batchTableJsonByteLength);
	  console.log('batchTableBinaryByteLength: ' + batchTableBinaryByteLength);
	  */

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
            let modelUrl = decoder.decode(new Uint8Array(buffer.slice(pos)));
            if (internalGLTFCache.has(modelUrl)) {
                this.binaryData = internalGLTFCache.get(modelUrl);
            } else {
                let response = await fetch(modelUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
                }    
                this.binaryData = await response.arrayBuffer();
                internalGLTFCache.set(modelUrl, this.binaryData);
            }
        }
        return this;
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

let internalGLTFCache = new Map()

export { B3DM, PNTS };
