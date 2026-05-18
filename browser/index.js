let cloud;
let utils;
let transformPoint;
let symbols;
let mapObj;
let clicktimer;
let active = true;
let currentZoom;
let modalHelp;
let modalElHelp;
let layerTree;
let backboneEvents;
let switchLayer;
const urlparser = require('../../../browser/modules/urlparser');
const config = require('../../../config/config.js');

const SWITCH_LEVEL = 18;

let setBaseLayer;
module.exports = {

    /**
     *
     * @param o
     * @returns {exports}
     */
    set: function (o) {
        cloud = o.cloud;
        utils = o.utils;
        setBaseLayer = o.setBaseLayer;
        transformPoint = o.transformPoint;
        backboneEvents = o.backboneEvents;
        layerTree = o.layerTree;
        switchLayer = o.switchLayer;
        symbols = o.extensions.symbols.index;
        return this;
    },

    /**
     *
     */
    init: function () {
        let redDotIsSet = false;
        const switchBaseLayer = (z, init = false) => {
            const b = 'orto_foraar_webm';
            if (z > SWITCH_LEVEL && (currentZoom <= SWITCH_LEVEL || init)) {
                setBaseLayer.init(b);
            }
            if (z <= SWITCH_LEVEL && (currentZoom > SWITCH_LEVEL || init)) {
                setBaseLayer.init('osm');
            }
        }

        const switchSymbolsCover = (z) => {
            let opacity = '100%';
            let pointerEvents = 'none';
            let display = 'inline';
            if (z > SWITCH_LEVEL) {
                opacity = '100%'
                pointerEvents = 'auto';
                display = 'none';
            } else {
                opacity = '10%'
                pointerEvents = 'none';
                display = 'inline';
            }
            const poll = () => {
                const e = $('.symbols-cover');
                const t = $('.symbols-cover-text');

                if (e.length > 0 && t.length > 0) {
                    e.css('opacity', opacity);
                    e.css('pointer-events', pointerEvents);
                    t.css('display', display);
                } else {
                    setTimeout(() => {
                        poll();
                    }, 50)
                }
            }
            poll();
        }

        $('#vidi-symbols-store').on('click', () => {
            symbols.store('f').then((e) => {
                    symbols.lock();
                    $('#vidi-symbols-store').attr('disabled', true);
                    $('#aau-reset-confirm').attr('disabled', true);
                    $('#aau-help').attr('disabled', true);
                    window.parent.postMessage({type: "doneCallback", symbolState: symbols.getState().symbolState}, "*");
                },
                (e) => {
                    console.log("Error", e);
                    alert("Noget gik galt - prøv igen");
                }
            )
        });
        $('#confirm1').click((e) => {
            const c = countSymbols();
            if (c < 1) {
                alert(`Du skal placere en pil`);
                return;
            }
            if (c > 1) {
                alert(`Du må kun placere en pil. Slet venligst en eller flere`);
                return;
            }

            if (config?.extensionConfig?.symbols?.files?.length === 1) {
                $('#confirm1').hide();
                $('#confirm2').show();
            } else {
                $('#confirm1').hide();
                $('#confirm2').show();
                const someTabTriggerEl = document.querySelector('#symbol-tab-1');
                const tab = new bootstrap.Tab(someTabTriggerEl);
                tab.show();
            }
            $('.symbols-delete').hide();
            $('#aau-step-modal').find('button').html('Næste');
            symbols.store('i2');
        })


        $('#confirm2').click(() => {
            const c = countSymbols();
            if (c < 1) {
                alert(`Du skal placere en pil`);
                return;
            }
            if (c > 2) {
                alert(`Du må kun placere en pil. Slet venligst en eller flere`);
                return;
            }
            $('#confirm2').show();
            $('.symbols-delete').hide();
        })

        $('#aau-help').click(() => {
            modalElHelp.show()
        })

        $('#aau-reset-confirm').click(() => {
            new bootstrap.Modal('#restartConfirm').show();
        })

        $('#aau-reset').click(() => {
                location.hash = '';
                location.reload();
        })

        const countSymbols = () => {
            const state = symbols.getState();
            return Object.keys(state.symbolState).length;
        }

        const elId = urlparser.urlVars?.start === '1' ? 'aau-help-modal-1': 'aau-help-modal-2';
        modalHelp = document.getElementById(elId);
        modalElHelp = new bootstrap.Modal(modalHelp);
        let startText;
        if (urlparser.urlVars?.start === '1') {
            startText = "Zoom ind, indtil kortet skifter til et luftfoto. Klik eller tryk på kortet for at angive stedet. Flyt prikken ved at trykke og holde, mens du flytter den.";
        }
        else {
            startText = "Følg vejledningen nederst på siden. Klik næste, når du er klar til at begynde.";
        }
        $('#aau-step-modal-body').html(startText);
        const modalEl = document.getElementById('aau-step-modal')
        const modal = new bootstrap.Modal(modalEl)
        modal.show()

        // Override browser and user id
        window._browserId = urlparser.urlVars?.userid || 'Ikke registreret';
        window._userId = urlparser.urlVars?.gr || 'Ikke registreret';
        // Try to set props
        try {
            if (urlparser.urlVars?.props) {
                window._props = JSON.parse(urlparser.urlVars.props);
            }
        } catch (e) {
            console.info("Error in props json - setting it to null");
            window._props = null;
        }

        /**
         *
         * Native Leaflet object
         */
        mapObj = cloud.get().map;
        mapObj.on('dblclick', function () {
            clicktimer = undefined;
        });
        let q;
        if (urlparser.urlVars?.start === '1') {
            q = `SELECT id as gid, rotation, scale, zoom, svg, browserid, anonymous, file,
                                       userid AS usergr, tag, properties,
                                   st_asgeojson(the_geom)::json AS the_geom
                            FROM settings.symbols
                            WHERE browserid = '${urlparser.urlVars.userid}' AND deleted = false and file = 'red_dot.svg'`;

            $('#confirm2').show();
            mapObj.on('click', function (e) {
                if (redDotIsSet) return;
                let event = new geocloud.clickEvent(e, cloud);
                if (clicktimer) {
                    clearTimeout(clicktimer);
                } else {
                    if (active === false) {
                        return;
                    }
                    if (currentZoom <= SWITCH_LEVEL) {
                        new bootstrap.Modal('#zoomWarn').show();
                        return;
                    }
                    clicktimer = setTimeout(function () {
                        let coords = event.getCoordinate(), p, url;
                        p = utils.transform("EPSG:3857", "EPSG:4326", coords);
                        clicktimer = undefined;

                        let file = 'red_dot.svg';
                        let innerHtml = $(`[data-file='${file}']`).clone().html();
                        let id = symbols.createId();
                        symbols.createSymbol(innerHtml, id, [p.y, p.x], 0, 0, mapObj.getZoom(), file);
                        symbols.store('i1');
                        active = false;
                        $('.symbols-cover-text').css('opacity', '100%');
                        if (currentZoom <= SWITCH_LEVEL) $('.symbols-cover-text').show();

                    }, 250);
                }
            });
        } else {
            q = `SELECT id as gid, rotation, scale, zoom, svg, browserid, anonymous, file,
                                       userid AS usergr, tag, properties,
                                   st_asgeojson(the_geom)::json AS the_geom
                            FROM settings.symbols
                            WHERE browserid = '${urlparser.urlVars.userid}' AND deleted = false and file != 'red_dot.svg'`;

            let flag = false
            backboneEvents.get().on(`layerTree:ready`, (loadedLayerName) => {
                if (!flag) {
                    let filters =
                        {
                            "match": "all",
                            "columns": [
                                {
                                    "fieldname": "browserid",
                                    "expression": "=",
                                    "value": urlparser.urlVars.userid,
                                    "restriction": false
                                },
                                {
                                    "fieldname": "usergr",
                                    "expression": "=",
                                    "value": urlparser.urlVars.gr,
                                    "restriction": false
                                },
                                {
                                    "fieldname": "file",
                                    "expression": "=",
                                    "value": "red_dot.svg",
                                    "restriction": false
                                }
                            ]
                        }
                    layerTree.onApplyArbitraryFiltersHandler({layerKey: 'public.symbols', filters});
                    switchLayer.init('v:public.symbols', true);
                    backboneEvents.get().once("allDoneLoading:layers", function (e) {
                        const map = cloud.get();
                        const layer = map.getLayersByName('v:public.symbols');
                        map.map.fitBounds(layer.getBounds(), {maxZoom: 20})
                    });
                    flag = true;
                }
            })
            if (config.extensionConfig.symbols.options?.flag === 2) {
                $('#confirm2').show();
            } else {
                $('#confirm1').show();
            }
        }

        fetch('/api/sql/survey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q, format: 'json' , srs: 4326 })
        }).then(response => response.json()).then(data => {
            const symbolState = {};
            if (data.data.length > 0) {
                redDotIsSet = true;
                $('#confirm1').hide();
                data.data.forEach(d => {
                    if (urlparser.urlVars?.start === '1' && d.file === 'red_dot.svg' ) {
                        setTimeout(() => {
                            cloud.get().map.setView([d.the_geom.coordinates[1], d.the_geom.coordinates[0]], 19);
                        }, 100);
                    }
                    symbolState[d.gid] = {
                        svg: d.svg,
                        file: d.file,
                        coord: {lat: d.the_geom.coordinates[1], lng: d.the_geom.coordinates[0]},
                        scale: d.scale, rotation: d.rotation, zoomLevel: d.zoom, group: d.usergr,
                    };
                })
                window.api.setSymbol({
                    locked: false,
                    autoScale: false,
                    symbolState,
                })
            }
            if (data.data.length > 1) {
                $('#confirm2').show();
                $('.symbols-delete').hide();
                $('#vidi_symbols').hide();

            }
        })

        mapObj.on('zoomend', () => {
            const z = mapObj.getZoom();
            switchBaseLayer(z);
            switchSymbolsCover(z);
            currentZoom = z;
        });
        const z = mapObj.getZoom();
        currentZoom = z;
        // switchBaseLayer(z, true);
        switchSymbolsCover(z);
    }

};
