const infoBox = document.getElementById('info-box');
    const map = new maplibregl.Map({
        container: 'mapid',
        style: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
        center: [-1.5, 12.0],
        zoom: 3
    });
    let hoveredStateId = null;

    map.on('load', () => {
        // ethnies : polygones, avec survol et affichage dans un coin du nom de l'ethnie
        map.addSource('ethnies', {
            'type': 'geojson',
            'data': './assets/ethnies_web.geojson',
            'generateId': true
        });
        map.addLayer({
            'id': 'ethnies-fills',
            'type': 'fill',
            'source': 'ethnies',
            'layout': {},
            'paint': {
                'fill-color': '#627BC1',
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ]
            }
        });
        // AJOUTER une couche SYMBOL pour afficher les étiquettes d'ethnies
        map.addLayer({
            'id': 'ethnies-labels',
            'type': 'symbol',
            'source': 'ethnies',
            'layout': {
             // Le champ de texte à afficher (propriété du GeoJSON)
             'text-field': ['get', 'Ethnic_g'], 
             // Taille du texte
             'text-size': 10,
             // Positionnement (si vous utilisez des polygones)
             'text-anchor': 'center',
             // Empêche les étiquettes de se chevaucher
             'text-allow-overlap': false
             },
            'paint': {
            // Couleur du texte
            'text-color': '#000000', 
            // Ajout d'une lueur (halo) pour rendre le texte lisible sur n'importe quel fond
            'text-halo-color': '#FFFFFF', 
            'text-halo-width': 1.5,
            'text-opacity': 0.8
            }
        });
        map.addSource('aof', {
            'type': 'geojson',
            'data':
                './assets/aof_limites.geojson'
        });
        map.addLayer({
            'id': 'aof_line',
            'type': 'line',
            'source': 'aof',
            'layout': {},
            'paint': {
                'line-color': '#627BC1',
                'line-width': 2
            }
        });
        map.on('mousemove', 'ethnies-fills', (e) => {
            const feature = e.features[0];
            infoBox.innerHTML = `<strong>${feature.properties.Ethnic_g}</strong>`;
            if (e.features.length > 0) {
                if (hoveredStateId) {
                    map.setFeatureState(
                        {source: 'ethnies', id: hoveredStateId},
                        {hover: false}
                    );
                }
                hoveredStateId = e.features[0].id;
                map.setFeatureState(
                    {source: 'ethnies', id: hoveredStateId},
                    {hover: true}
                );
            }
        });
        map.on('mouseleave', 'ethnies-fills', () => {
            infoBox.innerHTML = "Survolez une entité…";
            if (hoveredStateId) {
                map.setFeatureState(
                    {source: 'ethnies', id: hoveredStateId},
                    {hover: false}
                );
            }
            hoveredStateId = null;
        });
        // cercles de recrutement, par clusters
        map.addSource('cercles', {
            type: 'geojson',
            data: './assets/cercles_recrutement.geojson',
            cluster: true,
            clusterMaxZoom: 8,   // Max zoom to cluster points
            clusterRadius: 40    // Radius of each cluster
        });
        map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'cercles',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': '#1f78b4',
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,   // size for 0–49 pts
                    50, 30,   // size for 50–99 pts
                    100, 40   // 100+ pts
                ],
                'circle-opacity': 0.7
            }
        });
        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'cercles',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count}',
                'text-size': 12,
                'text-font':['Arial Unicode MS Bold', 'Open Sans Bold']
            },
            paint:{
                'text-color': '#ffffff'
            }
        });
        map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'cercles',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': '#555599',
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
            }
        });
        map.on('click', 'clusters', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            const clusterId = features[0].properties.cluster_id;
            map.getSource('cercles').getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return;
                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            });
        });
        map.on('click', 'unclustered-point', async (e) => {
            const feature = e.features[0];
            const p = feature.properties;
            const html = `
                <h3 style="margin:0;padding-bottom:4px;">${p.Cercles}</h3>
                <p>Population avant-guerre : ${p["pop_1911/1914"]} habitants</p>
                <p>Population après-guerre : ${p["pop_1921/1922"]} habitants</p>
                <p>Nombre de recrutements : ${p.r_total}</p>
                <p>Dont ${p.r1914} en 1914, ${p.r1916} en 1916, ${p.r1917} en 1917 et ${p.r1918} en 1918 (pas de données pour 1915).</p>
            `;
                new maplibregl.Popup({maxWidth: "300px"})
                    .setLngLat(feature.geometry.coordinates)
                    .setHTML(html)
                    .addTo(map);
                createOrUpdateChart ( p, p.Cercles)
        });
        map.on('mouseenter', 'clusters', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'clusters', () => map.getCanvas().style.cursor = '');
        map.on('mouseenter', 'unclustered-point', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'unclustered-point', () => map.getCanvas().style.cursor = '');

});
// ... (votre code MapLibre GL jusqu'à la fin de map.on('load', ...))

// Variable pour stocker les données une fois chargées (plus nécessaire si tout est dans GeoJSON, mais on la garde au cas où)
let recruitmentData = null; 

// La fonction getRecruitmentData peut être conservée si vous en avez besoin ailleurs, 
// mais elle n'est plus utilisée par l'événement de clic si les données sont dans le GeoJSON.
async function getRecruitmentData() {
    if (recruitmentData) {
        return recruitmentData;
    }
    try {
        const response = await fetch('./assets/data_recrutement.json'); // Assurez-vous que ce chemin est correct
        recruitmentData = await response.json();
        return recruitmentData;
    } catch (error) {
        console.error("Erreur lors du chargement des données de recrutement :", error);
        return [];
    }
}

let chart;

/**
 * Crée ou met à jour le graphique en secteurs (Pie Chart) avec les données d'une entité.
 * @param {object} properties - Les propriétés de l'entité GeoJSON sélectionnée.
 * @param {string} name - Le nom de l'entité (par exemple, le cercle de recrutement).
 */
// 🎯 CORRECTION 1 : Uniformisation du nom de la fonction à 'createOrUpdateChart'
function createOrUpdateChart(properties, name) { 
    const ctx = document.getElementById('pieChart');

    if (chart) { 
       chart.destroy(); // DÉTUIT l'ancien graphique (Très bien !)
    }

    // 🎯 CORRECTION 2 : Utilisation correcte du paramètre 'properties' 
    // (qui remplace 'region' et contient les données)
    // On utilise Number() pour s'assurer que les valeurs sont des nombres pour Chart.js.
    const r1914 = Number(properties["r1914"]);
    const r1916 = Number(properties["r1916"]);
    const r1917 = Number(properties["r1917"]);
    const r1918 = Number(properties["r1918"]); // Assumant r1818 était une faute de frappe

    // Vérifier si les données sont valides
    if (isNaN(r1914) || isNaN(r1916) || isNaN(r1917) || isNaN(r1918)) { 
        console.warn(`Données de recrutement incomplètes ou manquantes pour : ${name}`);
        // Effacer le canvas
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }

    // Création du graphique Chart.js
    chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Recrutement 1914', 'Recrutement 1916', 'Recrutement 1917', 'Recrutement 1918'],
            datasets: [{
                label: `Recrutement par année - ${name}`,
                data: [r1914, r1916, r1917, r1918], // Utilisation des données converties
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)', 
                    'rgba(54, 162, 235, 0.6)', 
                    'rgba(255, 206, 86, 0.6)', 
                    'rgba(75, 192, 192, 0.6)'  
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
       options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                title: {
                    display: true,
                    text: `Recrutement par année pour : ${name}`
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1) + '%';
                                label += `${value} (${percentage})`;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}
