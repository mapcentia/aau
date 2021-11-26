let cloud;
let utils;
let transformPoint;
let symbols;
let mapObj;
let clicktimer;
let active = true;
const config = require('../../../config/config.js');

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

        $('#aau-step-modal-body').html(`Det første som du skal gøre er at zoome ind på kortet ved brug af knapperne til højre og placere en rød prik på kortet, hvor din trafikulykke skete. Den røde prik placeres på kortet ved et klik eller tryk på ulykkesstedet.`);
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

                    $('#aau-step-modal-body').html('Nu skal du markere på kortet, hvor du kom fra eller hvad du gjorde i ulykkessituationen. Det sker ved at trække pilene ind i kortet fra højre. Man rotere pilene inde i kortet.')

                    const modalEl = document.getElementById('aau-step-modal')
                    const modal = new mdb.Modal(modalEl)
                    modal.show();
                    $('#confirm1').show();
                    const someTabTriggerEl = document.querySelector('#symbol-tab-1');
                    const tab = new mdb.Tab(someTabTriggerEl);
                    tab.show();
                    $('#aau-step-modal').find('button').html('Placér pil')

                }, 250);
            }
        });
    }

};
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
        $('#confirm3').show();
    } else {

        console.log(countSymbols())
        $('#confirm1').hide();
        $('#confirm2').show();
        $('#aau-step-modal-body').html(`Til sidst skal du markere på kortet, hvor din modpart kom fra eller hvad modparten gjorde ved at trække en pil eller et symbol ind fra højre.`);
        const modalEl = document.getElementById('aau-step-modal')
        const modal = new mdb.Modal(modalEl)
        modal.show()
        const someTabTriggerEl = document.querySelector('#symbol-tab-2');
        const tab = new mdb.Tab(someTabTriggerEl);
        tab.show();
    }
    $('.symbols-delete').hide();
    $('#aau-step-modal').find('button').html('Placér pil eller symbol')
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

const countSymbols = () => {
    const state = symbols.getState();
    return Object.keys(state.symbolState).length;
}
