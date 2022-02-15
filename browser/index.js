let cloud;
let utils;
let transformPoint;
let symbols;
let mapObj;
let clicktimer;
let active = true;
let currentZoom;
const cookie = require('js-cookie');
const urlparser = require('../../../browser/modules/urlparser');
const config = require('../../../config/config.js');

const modalHelp = document.getElementById('aau-help-modal');
const modalElHelp = new mdb.Modal(modalHelp);
const SWITCH_LEVEL = 19;

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
        symbols = o.extensions.symbols.index;
        return this;
    },

    /**
     *
     */
    init: function () {

        if (config.extensionConfig.symbols.options?.flag === 1) {
            $('#aau-step-modal-body').html(`På dette kort skal du markere, hvor du faldt. Klik næste, når du er klar - og følg vejledningen nedenfor.`);
        } else if (config.extensionConfig.symbols.options?.flag === 2) {

            $('#aau-step-modal-body').html(`På dette kort skal du markere, hvor ulykken (fald) skete og hvorfra du selv kom. Klik næste, når du er klar - og følg vejledningen nedenfor.`);
        } else {
            $('#aau-step-modal-body').html(`På dette kort skal du markere, hvor ulykken skete, hvorfra du selv kom og hvorfra din modpart kom. Klik næste, når du er klar - og følg vejledningen nedenfor.`);
        }
        const modalEl = document.getElementById('aau-step-modal')
        const modal = new mdb.Modal(modalEl)
        modal.show()

        // Set browserId eq to the survey-xact user id
        const userId = urlparser.urlVars?.userid;
        if (userId) {
            cookie.set('vidi-state-tracker', userId, {expires: 365});
        }

        /**
         *
         * Native Leaflet object
         */
        mapObj = cloud.get().map;
        mapObj.on('dblclick', function () {
            clicktimer = undefined;
        });
        mapObj.on('click', function (e) {
            let event = new geocloud.clickEvent(e, cloud);
            if (clicktimer) {
                clearTimeout(clicktimer);
            } else {
                if (active === false) {
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
                    active = false;
                    if (config?.extensionConfig?.symbols?.files?.length === 1) {
                        $('#confirm2').show();
                    } else if(config?.extensionConfig?.symbols?.files?.length === 2) {
                        $('#confirm2').show();
                        const someTabTriggerEl = document.querySelector('#symbol-tab-1');
                        const tab = new mdb.Tab(someTabTriggerEl);
                        tab.show();

                    } else {
                        $('#confirm1').show();
                        const someTabTriggerEl = document.querySelector('#symbol-tab-1');
                        const tab = new mdb.Tab(someTabTriggerEl);
                        tab.show();
                    }

                }, 250);
            }
        });
        mapObj.on('zoomend', () => {
            const z = mapObj.getZoom();
            switchBaseLayer(z);
            currentZoom = z;
        });
        const z = mapObj.getZoom();
        currentZoom = z;
        // switchBaseLayer(z, true);
    }

};
const switchBaseLayer = (z, init = false) => {
    if (z > SWITCH_LEVEL && (currentZoom <= SWITCH_LEVEL || init)) {
        setBaseLayer.init('geodanmark_2020_12_5cm');
    }

    if (z <= SWITCH_LEVEL && (currentZoom > SWITCH_LEVEL || init)) {
        setBaseLayer.init('osm');
    }
}

$('#confirm1 button').click((e) => {
    const c = countSymbols();
    if (c < 2) {
        alert(`Du skal placere en pil`);
        return;
    }
    if (c > 2) {
        alert(`Du må kun placere en pil. Slet venligst en eller flere`);
        return;
    }

    if (config?.extensionConfig?.symbols?.files?.length === 2) {
        $('#confirm1').hide();
        $('#confirm2').show();
    } else {
        $('#confirm1').hide();
        $('#confirm2').show();
        const someTabTriggerEl = document.querySelector('#symbol-tab-2');
        const tab = new mdb.Tab(someTabTriggerEl);
        tab.show();
    }
    $('.symbols-delete').hide();
    $('#aau-step-modal').find('button').html('Næste')
})


$('#confirm2 button').click(() => {
    const c = countSymbols();
    if (c < 1) {
        alert(`Du skal placere en pil`);
        return;
    }
    if (c > 3) {
        alert(`Du må kun placere en pil. Slet venligst en eller flere`);
        return;
    }
    $('#confirm2').show();
    $('.symbols-delete').hide();
})
$('.help-btn button').click(() => {
    modalElHelp.show()
})
$('.reset-btn button').click(() => {
    if (confirm("Er du sikker på, at du vil starte forfra med registrering i kortet?")) {
        location.hash = '';
        location.reload();
    }
})

const countSymbols = () => {
    const state = symbols.getState();
    return Object.keys(state.symbolState).length;
}
