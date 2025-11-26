document.addEventListener("DOMContentLoaded", function () {
    // CHARGEMENT DU GEOJSON
    fetch('assets/region_PIB.json')
        .then(res => res.json())
        .then(reg_PIB => {
            var geojson = L.geoJson(reg_PIB, {
                style: style1,
                onEachFeature: onEachFeature
            }).addTo(mymap);

            // Légende
            var legend = L.control({ position: 'bottomright' });

            legend.onAdd = function (map) {
                var div = L.DomUtil.create('div', 'info legend'),
                    grades = [30022, 30316, 32711];

                div.innerHTML += '<i style="background:' + getColor(grades[0] - 1) + '"></i> < ' + grades[0] + '<br>';

                for (var i = 0; i < grades.length; i++) {
                    div.innerHTML +=
                        '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                        grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
                }

                return div;
            };

            legend.addTo(mymap);
        })
        .catch(error => console.error("Erreur lors du chargement du GeoJSON :", error));

    var mymap = L.map('mapid', {
        center: [47.00, 2.00],
        zoom: 5
    });


    L.control.scale().addTo(mymap);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(mymap);

    var baselayers = {
        OSM: L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }),
        Topo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'),
        Sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
    };

    baselayers.OSM.addTo(mymap);
    L.control.layers(baselayers, null, { position: 'topright', collapsed: false }).addTo(mymap);

});


// Fonctions de style
function getColor(d) {
    return d > 32711 ? '#238443' :
        d > 30316 ? '#78c679' :
            d > 30022 ? '#c2e699' :
                '#ffffcc';
}

function style1(feature) {
    return {
        fillColor: getColor(feature.properties.PIB_hab2021),
        weight: 2,
        opacity: 1,
        color: 'black',
        dashArray: '3',
        fillOpacity: 0.7
    };
}


let chart;

function onEachFeature(feature, layer) {
    layer.on({
        click: async function (e) {
            const props = feature.properties;
            const content = "<strong>" + props.NOM + "</strong><br>" +
                "PIB par habitant en 2021 : " + props.PIB_hab2021.toLocaleString() + " €";
            layer.bindPopup(content).openPopup();

            // get region data
            const name = props.NOM;
            const list = await fetch('assets/data_pop.json');
            const data = await list.json();
            const region = data.find((e) => e.Région === name);

            // destroy chart if already exist
            if (chart) chart.destroy();

            // or create it
            createChart(region);
        }
    });
}

function createChart(region) {
    // get chart from dom
    const ctx = document.getElementById('pieChart');

    // check if region exist
    if (!region || region["Actifs Femmes"] === "N/A") {
        console.warn("Données non disponibles pour cette région :", name);
        return;
    }

    // mock data key
    const tauxFemmesact = region["Actifs Femmes"];
    const tauxHommesact = region["Actifs Hommes"];
    const tauxFemmesinact = region["Inactifs Femmes"];
    const tauxHommesinact = region["Inactifs Hommes"];


    // create chart
    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Actif Femmes', 'Inactifs Femmes', 'Inactifs Hommes', 'Actifs Hommes'],
            datasets: [{
                label: `Proportion d'actif - ${name}`,
                data: [tauxFemmesact, tauxFemmesinact, tauxHommesinact, tauxHommesact],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 0, 55, 0.6)',
                    'rgba(0, 73, 122, 0.6)',
                    'rgba(54, 162, 235, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 0, 55, 0.6)',
                    'rgba(0, 73, 122, 0.6)',
                    'rgba(54, 162, 235, 0.6)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: `Part des actifs par région : ${name}`
                }
            }
        }
    });
}

function openPopup() {
    document.getElementById('popup').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

function closePopup() {
    document.getElementById('popup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}