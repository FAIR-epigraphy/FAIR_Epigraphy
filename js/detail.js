//localStorage.removeItem('jsonObj');
const inscription = JSON.parse(localStorage.getItem('jsonObj'));
$('#ins_id').html(`<a class="text-decoration-none" href="${inscription.inscriptionURI}" target="_blank">${getInscriptionId(inscription.inscriptionId)}: ${inscription.inscriptionLabel}</a>`);
$('#tmId').html(`${getTrismegistosID(inscription.tmId)}`);
$('#material').html(`${getMaterial(inscription.materialLink, inscription.material)}`);
$('#objectType').html(`${getObjectType(inscription.objTypeLink, inscription.objectType)}`);
$('#language').html(`${getLanguageName(inscription.language)}`);
$('#inc_text').html(`<pre>${inscription.inscriptionText.replace('Text', '')}</pre>`);
////////////////////////////////////////////////////////////
/// Show/Hide Inscription Text
$('#btnText').click(() => {
    if ($('#divInsText').attr('style') === 'display: none;') {
        $('#divInsText').show('fade');
        $('#btnText').html('Hide Inscription Text')
    }
    else {
        $('#divInsText').hide('fade');
        $('#btnText').html('Show Inscription Text')
    }
})
//////////////////////////////////////////////////////////
/// Get Relations
getRelations(inscription.tmId);
///////////////////////////////////////////////////////////////////////
//// Show Map
initMap();

async function initMap() {
    if (inscription.geo !== undefined) {
        let lat_lng = inscription.geo.split(',')
        showGoogleMap(lat_lng);
    }
    else {
        lat_lng = await getLatLng(inscription.foundAt);
        if (lat_lng !== undefined && lat_lng !== null && lat_lng.length > 0) {
            showGoogleMap(lat_lng);
        }
        else {
            setTimeout(() => {
                var map = new Microsoft.Maps.Map('#map');
                let searchManager;
                loadModuleMap(searchManager, map);
            }, 400)
        }
    }
}

function loadModuleMap(searchManager, map) {
    if (!searchManager) {
        Microsoft.Maps.loadModule('Microsoft.Maps.Search', function () {
            searchManager = new Microsoft.Maps.Search.SearchManager(map);
            loadModuleMap(searchManager, map);
        })
    }
    else {
        //let map = new Microsoft.Maps.Map('#map');
        map.entities.clear();
        let searchRequest = {
            where: inscription.geoName,
            callback: function (r) {
                if (r.results) {

                    let pin = new Microsoft.Maps.Pushpin(r.results[0].location);
                    map.entities.push(pin);
                    map.setView({
                        bounds: r.results[0].bestView,
                        //zoom: 9
                    });
                    //map.setView({ zoom: 10 });
                }
            }
        };

        searchManager.geocode(searchRequest);
    }
}

function showGoogleMap(lat_lng) {
    const myLatLng = { lat: parseFloat(lat_lng[0]), lng: parseFloat(lat_lng[1]) };
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: myLatLng,
    });

    new google.maps.Marker({
        position: myLatLng,
        map,
        title: "Hello World!",
    });

    let interval = setInterval(() => {
        if (map !== undefined) {
            google.maps.event.trigger(map, 'resize')
            clearInterval(interval);
        }
    }, 500);
}