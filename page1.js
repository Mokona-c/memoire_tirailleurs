

const infoBox = document.getElementById('info-box');
const map = new maplibregl.Map({
    container: 'mapid',
    style: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
    center: [-1.5, 12.0],
    zoom: 3
});
let hoveredStateId = null;

// Définitions D3/Catégories (Doivent être globales)
const categories = ['Hauts-de-France', 'Autre Grand Est', 'Autres', 'Marne', 'Meuse'];
const tokensByCat = new Map(categories.map(c => [c, []]));
const featuresByCat = new Map(categories.map(c => [c, []]));

// Constantes des pictogrammes
const PERSON_R = 2;
const RECT_W = 3.5;
const RECT_H = 4.5;
const spacingX = 12; // horizontal
const spacingY = 12; // vertical
const paddingX = 3;
const paddingY = 5;

// D3 Elements
const catsDiv = d3.select('#cats');
const mapPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: true });

// Définition du Tooltip D3 (doit exister dans le DOM)
const tooltipDiv = d3.select("body").append("div")
    .attr("class", "tooltip") // Vous devrez définir un style CSS pour '.tooltip'
    .style("opacity", 0)
    .style("position", "absolute")
    .style("pointer-events", "none") // Important pour ne pas bloquer les clics sous l'infobulle
    .style("background", "white")
    .style("padding", "8px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px");


// Fonction pour classer chaque cimetière par catégorie
function classifier(props) {
    const region = (props.Region || "").trim();
    const dept = (props.Departement || props.Dep2 || "").trim();
    if (dept === 'Marne') return 'Marne';
    if (dept === 'Meuse') return 'Meuse';
    if (region.includes('Hauts-de-France')) return 'Hauts-de-France';
    if (region.includes('Grand Est')) return 'Autre Grand Est';
    return 'Autres';
}

function showPopup(coords, props) {
    let html = `<strong>${props.Nom || props.Nom2 || '—'}</strong><br/>Département: ${props.Departement || props.Dep2 || '—'}<br/>Commune: ${props.Commune || '—'}<br/>Nombre de personnes: ${props.Nb_personnes || '0'}`;
    if (props.image) html += `<br><img class="popup-img" src="${props.image}">`;
    if (coords) html += `<br><a href="https://www.google.com/maps?q=&layer=c&cbll=$${coords[1]},${coords[0]}" target="_blank">Google Street View</a>`;
    let wikiUrl = props.wikipedia || '';
    if (wikiUrl) html += `<br><a href="${wikiUrl}" target="_blank">Wikipedia</a>`;
    mapPopup.setLngLat(coords).setHTML(html).addTo(map);
}

// ##################################################################
// # LOGIQUE DES DONNÉES ET DES FILTRES
// ##################################################################

let globalnecropole = null; // Contient TOUTES les données GeoJSON brutes non filtrées.

/**
 * Fonction de rendu D3 (réutilisée pour le rendu initial ET le rendu après filtre).
 */
function renderCategories() {
    catsDiv.selectAll('.categorie').remove();

    categories.forEach(cat => {
        const tokenGroups = tokensByCat.get(cat);
        
        // Calcul du total basé sur les données actuelles dans tokensByCat/featuresByCat (filtrées ou non)
        const totalPeople = tokenGroups.reduce((sum, g) => sum + g.tokens.reduce((s, t) => s + (t.opacity === 1 ? 1000 : parseInt(g.feature.properties.Nb_personnes) % 1000), 0), 0);

        const card = catsDiv.append('div').attr('class', 'categorie').attr('data-cat', cat);
        const head = card.append('div').attr('class', 'entete-cat');
        head.append('div').attr('class', 'titre-cat').text(cat);

        const totalDiv = head.append('div').attr('class', 'total-personnes').text(totalPeople + ' personnes');
        totalDiv.append('span').attr('class', 'nombre-lieux').text('(' + featuresByCat.get(cat).length + ' lieux)');

        const svg = card.append('svg').attr('class', 'grid-svg');

        let totalTokens = 0;
        tokenGroups.forEach(tg => totalTokens += tg.tokens.length);

        const cols = 25;
        const rows = Math.ceil(totalTokens / cols);

        svg.attr('viewBox', `0 0 ${cols * spacingX + paddingX * 2} ${rows * spacingY + paddingY * 2}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        const g = svg.append('g');
        let tokenIndex = 0;

        tokenGroups.forEach(tg => {
            const graveGroup = g.append('g').attr('class', 'grave-group').style('cursor', 'pointer');

            tg.tokens.forEach((t) => {
                const col = tokenIndex % cols;
                const row = Math.floor(tokenIndex / cols);
                const x = col * spacingX + paddingX;
                const y = row * spacingY + paddingY;

                const person = graveGroup.append('g').attr('transform', `translate(${x},${y})`);
                person.append('circle').attr('r', PERSON_R).attr('cy', -PERSON_R).attr('fill', t.color)
                    .attr('stroke', '#333').attr('stroke-width', 0.2).attr('opacity', t.opacity);
                person.append('rect').attr('x', -RECT_W / 2).attr('y', 0).attr('width', RECT_W).attr('height', RECT_H)
                    .attr('rx', 0.8).attr('fill', t.color).attr('stroke', '#333').attr('stroke-width', 0.2).attr('opacity', t.opacity);
                tokenIndex++;
            });

            // Événements D3 (click/hover)
            graveGroup.on('click', event => {
                const coords = tg.feature.geometry.coordinates;
                const props = tg.feature.properties;
                if (map && coords) {
                    map.flyTo({ center: coords, zoom: 12 });
                    showPopup(coords, props);
                }
                event.stopPropagation();
            });

            graveGroup.on('mouseenter', (event) => {
                graveGroup.selectAll('circle,rect').attr('stroke', '#000').attr('stroke-width', 1.2);
                const props = tg.feature.properties;
                const html = `<strong>${props.Nom || props.Nom2 || '—'}</strong><br/>Commune: ${props.Commune || '—'}<br/>Nombre de personnes: ${props.Nb_personnes || '0'}`;
                tooltipDiv.style('opacity', 1)
                    .html(html)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            });
            graveGroup.on('mouseleave', () => {
                graveGroup.selectAll('circle,rect').attr('stroke', '#333').attr('stroke-width', 0.2);
                tooltipDiv.style('opacity', 0);
            });
        });

        card.append('div').attr('class', 'label-cat').style('display', 'none');

        card.on('click', () => {
            const feats = featuresByCat.get(cat);
            if (!feats.length) return;
            const coords = feats.map(f => f.geometry.coordinates);
            const lons = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);
            const minLon = Math.min(...lons), maxLon = Math.max(...lons);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            map.fitBounds([[minLon, minLat], [maxLon, maxLat]], { padding: 40 });
        });
    });
}


/**
 * 1. Initialise les listes déroulantes des filtres.
 * 2. Prépare les données D3.
 * 3. Cache la couche MapLibre par défaut.
 */
function initializeFiltersAndRender(necropoleData) {
    globalnecropole = necropoleData;

    // Initialisation de Materialize pour les selects
    if (typeof M !== 'undefined' && M.AutoInit) {
        M.AutoInit();
    }

    const deptSelect = document.getElementById('filter-dept');
    const communeSelect = document.getElementById('filter-commune');

    // Vider les options par défaut avant de les remplir
    deptSelect.innerHTML = '<option value="">Tous</option>';
    communeSelect.innerHTML = '<option value="">Tous</option>';

    // Remplir les listes déroulantes Département et Commune
    Array.from(new Set(globalnecropole.features.map(f => f.properties.Departement))).filter(d => d).sort().forEach(d => {
        const o = document.createElement('option');
        o.value = d;
        o.text = d;
        deptSelect.appendChild(o);
    });
    Array.from(new Set(globalnecropole.features.map(f => f.properties.Commune))).filter(c => c).sort().forEach(c => {
        const o = document.createElement('option');
        o.value = c;
        o.text = c;
        communeSelect.appendChild(o);
    });

    // Mettre à jour l'affichage Materialize
    if (typeof M !== 'undefined' && M.FormSelect) {
        M.FormSelect.init(deptSelect);
        M.FormSelect.init(communeSelect);
    }

    renderCategories();
}

// ##################################################################
// # LOGIQUE DE CHARGEMENT ASYNCHRONE ET RENDU D3
// ##################################################################

/**
 * Charge le GeoJSON des nécropoles, classifie les données et rend la grille de pictogrammes D3.
 */
async function loadAndRenderCategories() {
    let necropole;
    try {
        // Chargement ASYNCHRONE des données
        const response = await fetch('./assets/necropole.geojson');
        necropole = await response.json();
    } catch (error) {
        console.error("Erreur lors du chargement de necropole.geojson:", error);
        return;
    }

    // --- DEBUT DU CODE QUI DÉPEND DES DONNÉES NECROPOLE ---

    necropole.features.forEach(f => {
        const p = f.properties || {};
        const cat = classifier(p);
        featuresByCat.get(cat).push(f);

        const n = parseInt(p.Nb_personnes) || 0;
        const fullTokens = Math.floor(n / 1000);
        const remainder = n % 1000;
        const code = p.Code_conflit;

        let color = '#B00000'; // Code 1
        if (code == 2) color = '#FCD3D2';
        if (code == 3) color = '#FA6B64';

        const tokenGroup = [];
        for (let i = 0; i < fullTokens; i++) tokenGroup.push({ color, opacity: 1 });
        if (remainder > 0) tokenGroup.push({ color, opacity: 0.7 });

        tokensByCat.get(cat).push({ feature: f, tokens: tokenGroup });
    });

   initializeFiltersAndRender(necropole);
}

function applyFilters() {
    if (!globalnecropole) return; 

    // 1. Récupérer les valeurs des filtres
    const code = document.getElementById('filter-conflit').value;
    const dept = document.getElementById('filter-dept').value;
    const commune = document.getElementById('filter-commune').value;
    const nb = document.getElementById('filter-nb').value;
    const search = document.getElementById('filter-search').value.toLowerCase();

    // 2. Filtrer les données complètes
    const filteredFeatures = globalnecropole.features.filter(f => {
        const p = f.properties;

        if (code && p.Code_conflit.toString() !== code) return false;
        if (dept && p.Departement !== dept) return false;
        if (commune && p.Commune !== commune) return false;

        if (nb) {
            const n = parseInt(p.Nb_personnes) || 0;
            let [min, max] = nb.split('-');
            min = parseInt(min);
            max = max ? (max.includes('+') ? Infinity : parseInt(max)) : Infinity;

            if (n < min || n > max) return false;
        }

        if (search && !( (p.Nom || '').toLowerCase().includes(search) || (p.Commune || '').toLowerCase().includes(search) )) return false;

        return true;
    });

    // 3. Mettre à jour les données MapLibre (carte)
    const source = map.getSource('necropole'); // Source unique 'necropole'
    if (source) {
        source.setData({ type: 'FeatureCollection', features: filteredFeatures });
    }

    // 4. Mettre à jour les structures de données D3 (pictogrammes)
    categories.forEach(cat => {
        featuresByCat.set(cat, []);
        tokensByCat.set(cat, []);
    });

    // Reclassifier les features filtrées et recréer les tokens
    filteredFeatures.forEach(f => {
        const p = f.properties || {};
        const cat = classifier(p);
        featuresByCat.get(cat).push(f);

        const n = parseInt(p.Nb_personnes) || 0;
        const fullTokens = Math.floor(n / 1000);
        const remainder = n % 1000;
        const code = p.Code_conflit;

        let color = '#B00000';
        if (code == 2) color = '#FCD3D2';
        if (code == 3) color = '#FA6B64';

        const tokenGroup = [];
        for (let i = 0; i < fullTokens; i++) tokenGroup.push({ color, opacity: 1 });
        if (remainder > 0) tokenGroup.push({ color, opacity: 0.7 });

        tokensByCat.get(cat).push({ feature: f, tokens: tokenGroup });
    });

    // 5. Relancer le rendu D3
    renderCategories();
}

// Ajouter l'écouteur d'événement pour le bouton "Enter"
document.addEventListener('DOMContentLoaded', () => {
    const filterGoButton = document.getElementById('filter-go');
    if (filterGoButton) {
        filterGoButton.addEventListener('click', applyFilters);
    }
});

map.on('load', () => {

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
        'data': './assets/aof_limites.geojson'
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
    map.addSource('necropole', {
        'type': 'geojson',
        'data': './assets/necropole_new.geojson'
    });
    map.addLayer({
        'id': 'necropole-circle',
        'type': 'circle',
        'source': 'necropole',
        'layout': {},
        'paint': {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['to-number', ['get', 'Nb_personnes']],
                0, 3,
                1000, 5,
                5000, 8,
                20000, 14,
                50000, 20,
                130000, 30
            ],
            'circle-color': [
                'match',
                ['get', 'Code_conflit'],
                // Mise à jour des couleurs pour les cercles
                1, '#B00000',
                2, '#FCD3D2',
                3, '#FA6B64',
                '#888'
            ],
            'circle-opacity': 0.75,
            'circle-stroke-width': 0.5,
            'circle-stroke-color': '#222',
        },
        layout: {
            // Tri pour que les grands cercles ne soient pas cachés (important !)
            'circle-sort-key': [
                '-', ['to-number', ['get', 'Nb_personnes']]
            ]
        }
    });

    map.on('click', 'necropole-circle', e => {
        const props = e.features[0].properties, coords = e.features[0].geometry.coordinates.slice();
        showPopup(coords, props);
    });
    map.on('mouseenter', 'necropole-circle', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'necropole-circle', () => map.getCanvas().style.cursor = '');

    map.on('mousemove', 'ethnies-fills', (e) => {
        const feature = e.features[0];
        infoBox.innerHTML = `<strong>${feature.properties.Ethnic_g}</strong>`;
        if (e.features.length > 0) {
            if (hoveredStateId) {
                map.setFeatureState(
                    { source: 'ethnies', id: hoveredStateId },
                    { hover: false }
                );
            }
            hoveredStateId = e.features[0].id;
            map.setFeatureState(
                { source: 'ethnies', id: hoveredStateId },
                { hover: true }
            );
        }
    });

    map.on('mouseleave', 'ethnies-fills', () => {
        infoBox.innerHTML = "Survolez une entité…";
        if (hoveredStateId) {
            map.setFeatureState(
                { source: 'ethnies', id: hoveredStateId },
                { hover: false }
            );
        }
        hoveredStateId = null;
    });
    // cercles de recrutement, par clusters
    map.addSource('cercles', {
        type: 'geojson',
        data: './assets/cercles_recrutement.geojson',
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 40
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
            'text-font': ['Arial Unicode MS Bold', 'Open Sans Bold']
        },
        paint: {
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

    map.on('click', 'unclustered-point', async (e) => { /* ... */
        const feature = e.features[0];
        const p = feature.properties;
        const html = `
                <h3 style="margin:0;padding-bottom:4px;">${p.Cercles}</h3>
                <p>Population avant-guerre : ${p["pop_1911/1914"]} habitants</p>
                <p>Population après-guerre : ${p["pop_1921/1922"]} habitants</p>
                <p>Nombre de recrutements : ${p.r_total}</p>
                <p>Dont ${p.r1914} en 1914, ${p.r1916} en 1916, ${p.r1917} en 1917 et ${p.r1918} en 1918 (pas de données pour 1915).</p>
            `;
        new maplibregl.Popup({ maxWidth: "300px" })
            .setLngLat(feature.geometry.coordinates)
            .setHTML(html)
            .addTo(map);
        createOrUpdateChart(p, p.Cercles)
    });

    map.on('mouseenter', 'clusters', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'clusters', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'unclustered-point', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'unclustered-point', () => map.getCanvas().style.cursor = '');
    //map.on('mouseenter', 'necropole-circle', () => map.getCanvas().style.cursor = 'pointer');
    //map.on('mouseleave', 'necropole-circle', () => map.getCanvas().style.cursor = '');

    // C'EST L'APPEL QUI DÉCLENCHE LE RENDU D3
    loadAndRenderCategories();
});


// ##################################################################
// # FONCTIONS CHART.JS
// ##################################################################

let chart;

function createOrUpdateChart(properties, name) {
    const ctx = document.getElementById('pieChart');

    if (chart) {
        chart.destroy();
    }

    const r1914 = Number(properties["r1914"]);
    const r1916 = Number(properties["r1916"]);
    const r1917 = Number(properties["r1917"]);
    const r1918 = Number(properties["r1918"]);

    if (isNaN(r1914) || isNaN(r1916) || isNaN(r1917) || isNaN(r1918)) {
        console.warn(`Données de recrutement incomplètes ou manquantes pour : ${name}`);
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
                data: [r1914, r1916, r1917, r1918],
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
                tooltip: {
                    padding: 12,
                    callbacks: {
                        label: function (context) {
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
                },
                title: {
                    display: true,
                    text: `Recrutement par année pour : ${name}`,
                    font: { size: 18, weight: 'bold' },
                    color: '#ffffffff'
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 13, family: 'Arial' },
                        color: '#000000',
                    },
                }
            }
        }
    });
}
