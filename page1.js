const infoBox = document.getElementById('info-box');
    const map = new maplibregl.Map({
        container: 'mapid',
        style: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
        center: [-1.5, 10.0],
        zoom: 4
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
                'text-size': 12
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
        map.on('click', 'unclustered-point', (e) => {
            const feature = e.features[0];
            p = feature.properties;
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
        });
        map.on('mouseenter', 'clusters', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'clusters', () => map.getCanvas().style.cursor = '');
        map.on('mouseenter', 'unclustered-point', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'unclustered-point', () => map.getCanvas().style.cursor = '');

    });
