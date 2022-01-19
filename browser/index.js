let cloud;
let utils;
let transformPoint;
let symbols;
let mapObj;
let clicktimer;
let active = true;
const config = require('../../../config/config.js');

const modalHelp = document.getElementById('aau-help-modal')
const modalElHelp = new mdb.Modal(modalHelp)

module.exports = {

    /**
     *
     * @param o
     * @returns {exports}
     */
    set: function (o) {
        cloud = o.cloud;
        utils = o.utils;
        transformPoint = o.transformPoint;
        symbols = o.extensions.symbols.index;
        return this;
    },

    /**
     *
     */
    init: function () {

        if (config.extensionConfig.symbols.options?.flag === 1) {
            $('#aau-step-modal-body').html(`På dette kort skal du markere, hvor ulykken (fald) skete. Klik næste, når du er klar - og følg vejledningen nedenfor.`);
        } else if (config.extensionConfig.symbols.options?.flag === 2) {

            $('#aau-step-modal-body').html(`På dette kort skal du markere, hvor ulykken (fald) skete og hvorfra du selv kom. Klik næste, når du er klar - og følg vejledningen nedenfor.`);
        } else {
            $('#aau-step-modal-body').html(`På dette kort skal du markere, hvor ulykken skete, hvorfra du selv kom og hvorfra din modpart kom. Klik næste, når du er klar - og følg vejledningen nedenfor.`);
        }
        const modalEl = document.getElementById('aau-step-modal')
        const modal = new mdb.Modal(modalEl)
        modal.show()


        /**
         *
         * Native Leaflet object
         */
        mapObj = cloud.get().map;
        mapObj.on("dblclick", function () {
            clicktimer = undefined;
        });
        mapObj.on("click", function (e) {
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
                        $('#confirm3').show();
                    } else {
                        $('#confirm1').show();
                        const someTabTriggerEl = document.querySelector('#symbol-tab-1');
                        const tab = new mdb.Tab(someTabTriggerEl);
                        tab.show();
                    }

                }, 250);
            }
        });
    }

};
$('#confirm1 button'
).click((e) => {
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
        $('#confirm3').show();
    } else {

        console.log(countSymbols())
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
    if (c < 3) {
        alert(`Du skal placere en pil`);
        return;
    }
    if (c > 3) {
        alert(`Du må kun placere en pil. Slet venligst en eller flere`);
        return;
    }
    $('#confirm2').hide();
    $('#confirm3').show();
    $('.symbols-delete').hide();
})
$('.help-btn button').click(() => {
    modalElHelp.show()
})

const countSymbols = () => {
    const state = symbols.getState();
    return Object.keys(state.symbolState).length;
}
