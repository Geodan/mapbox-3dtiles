import Subsurface from './Subsurface.mjs';
import TileSet from './TileSet.mjs';
import applyStyle from './Styler.mjs'
import SceneManager from './SceneManager'

export class Mapbox3DTilesLayer {
    constructor(params) {
        if (!params) throw new Error('parameters missing for mapbox 3D tiles layer');
        if (!params.id) throw new Error('id parameter missing for mapbox 3D tiles layer');

        this.id = params.id;
        this.dracoLoader = params.dracoLoader;
        this.subsurfaceLayer = params.subsurface ? params.subsurface : false;
        this.tilesetConfig = params.tilesets;

        this.loadStatus = 0;
        this.type = "custom";
        this.renderingMode = "3d";
    }

    _addSubsurfaceSupport() {
        this.subsurface = new Subsurface(this.scene, this.world, this.cameraSync);
    }

    onAdd(map) {
        this.map = map;
        this.sceneManager = new SceneManager(map, this.dracoLoader);
        this.mapQueryRenderedFeatures = map.queryRenderedFeatures.bind(this.map);
        this.map.queryRenderedFeatures = this.queryRenderedFeatures.bind(this);
        this._createTilesets(this.tilesetConfig);

        /*  if (this.subsurfaceLayer) {
            this._addSubsurfaceSupport();
        } */
    }

    onRemove(map, gl) {
        // todo: (much) more cleanup?
        this.map.queryRenderedFeatures = this.mapQueryRenderedFeatures;
        //this.sceneManager.removeLayer(this);
    }

    _createTilesets(tilesets) {
        for (let i = 0; i < tilesets.length; i++) {
            const tilesetConfig = tilesets[i];
            const style = tilesetConfig.style ? tilesetConfig.style : {};
            const projectToMercator = tilesetConfig.projectToMercator == undefined ? true : projectToMercator;
            const tileset = new TileSet(
                (ts) => {
                    if (ts.loaded) {
                        ts.styleParams = style;
                        this.map.triggerRepaint();
                    }
                },
                () => { this.map.triggerRepaint(); },
                this.sceneManager.loader,
                tilesetConfig.id
            );

            tileset.load(tilesetConfig.url, style, projectToMercator)
                .then(() => {
                    if (tileset.root) {
                        this.loadStatus = 1;
                        this.sceneManager.addTileset(tileset);
                    }
                })
                .catch((error) => {
                    console.error(`${error} (${tilesetConfig.url})`);
                });
        }
    }

    addShadow() {
        this.sceneManager.addShadow();
    }

    removeShadow() {
        this.sceneManager.removeShadow();
    }

    setShadowOpacity(opacity) {
        this.sceneManager.setShadowOpacity(opacity);
    }

    setHemisphereIntensity(intensity) {
        this.sceneManager.setHemisphereIntensity(intensity);
    }

/*     setStyle(style) {
        //WIP
        this.style = style
            ? style
            : {
                color: 0xff00ff
            };
        applyStyle(this.world, this.style);
    } */

    queryRenderedFeatures(geometry, options) {
        let result = this.mapQueryRenderedFeatures(geometry, options);
        return this.sceneManager.queryRenderedFeatures(geometry, options, result);
    }

    render() {
        this.sceneManager.render();
    }

    logChildNodes(node) {
        const children = node.children.filter(child => child.inView);
        if (children.length) {
            const result = []
            for (const child of children) {
                result.push({
                    loaded: child.loaded,
                    geometricError: child.geometricError,
                    content: child.content && child.content.uri.split('/').pop(),
                    children: this.logChildNodes(child)
                })
            }
            return result
        }
    }

    logTileset() {
        let result = []
        result.push({
            url: this.tileset.url,
            geometricEror: this.tileset.geometricError,
            children: this.logChildNodes(this.tileset.root)
        })
        console.log(JSON.stringify(result));
    }
}
