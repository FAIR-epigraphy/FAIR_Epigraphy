const allData = JSON.parse(localStorage.getItem('jsonAllData'));
if (allData !== undefined) {
    //console.log(allData);
    //const myLatLng = { lat: -25.363, lng: 131.044 };
    var legend = document.getElementById("legend");
    var uniqueLanguages = [];
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        //center: myLatLng,
    });
    const infoWindow = new google.maps.InfoWindow({
        content: "",
        disableAutoPan: true,
    });

    //// Show Map
    $('#map').hide();
    $('#legend').hide();
    $('#loader-wrapper').show()
    initMap().then((res) => {
        $('#map').show();
        $('#legend').show();
        $('#loader-wrapper').hide()
    })

    ///////////////////////////////////////////////////////////////
    async function initMap() {
        for (let inscription of allData) {
            if (inscription.geo !== undefined) {
                let lat_lng = inscription.geo.split(',')
                showGoogleMap(lat_lng, inscription);
            }
            else {
                lat_lng = await getLatLng(inscription.foundAt);
                if (lat_lng !== undefined && lat_lng !== null && lat_lng.length > 0) {
                    showGoogleMap(lat_lng, inscription);
                }
            }

            uniqueLanguages.push(inscription.language);
            //break;
        }
        uniqueLanguages = [...new Set(uniqueLanguages)];
        for (let l of uniqueLanguages) {
            const div = document.createElement("div");
            div.innerHTML = '<img src="' + getDisplayIcon(l) + '"> ' + getLanguageName(l);
            legend.appendChild(div);
        }
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
        alert(uniqueLanguages)
    }

    function showGoogleMap(lat_lng, inscription) {
        const myLatLng = { lat: parseFloat(lat_lng[0]), lng: parseFloat(lat_lng[1]) };
        map.setCenter(myLatLng);
        const marker = new google.maps.Marker({
            position: myLatLng,
            map,
            title: inscription.inscriptionLabel,
            icon: {
                url: getDisplayIcon(inscription.language)
            },
        });

        // markers can only be keyboard focusable when they have click listeners
        // open info window when marker is clicked
        marker.addListener("click", () => {
            infoWindow.setContent(`<a href="${inscription.inscriptionURI}" target="_blank" class="text-decoration-none" title="${inscription.inscriptionLabel}">${inscription.inscriptionLabel.length <= 50 ? inscription.inscriptionLabel : inscription.inscriptionLabel.substring(0, 49) + '...'}</a> <br />
              <b>Inscription Id:</b> ${getInscriptionId(inscription.inscriptionId)} <br />
              <b>Trismegistos Id:</b> ${getTrismegistosID(inscription.tmId)} <br />
               `);
            infoWindow.open(map, marker);
        });

    }

    function getDisplayIcon(language) {
        let url = "http://maps.google.com/mapfiles/ms/icons/";

        switch (language) {
            case 'la':
                url += "blue-dot.png";
                break;
            case 'grc':
                url += "green-dot.png";
                break;
            default:
                url += "red-dot.png";
        }

        return url;
    }
}
