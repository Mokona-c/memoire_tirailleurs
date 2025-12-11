const map = new maplibregl.Map({
        container: 'map',
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [-15.97, 12.82],
        zoom: 10
    });

    const chapters = {
        'naissance': { center: [-15.97, 12.82], zoom: 10 },
        'france': { center: [1.43, 44.43], zoom: 10 },
        'combats': { center: [2.52, 49.87], zoom: 10 },
        'stalag': { center: [9.1, 53.38], zoom: 10 },
        'transfert': { center: [-0.98, 43.73], zoom: 10 },
        'evasion': { center: [-17.45, 14.72], zoom: 10 },
        'debarquement': { center: [5.92, 43.12], zoom: 10 },
        'indochine': { center: [105.58, 21.3], zoom: 10 },
        'suez': { center: [32.55, 29.97], zoom: 10 },
        'algerie': { center: [2.51, 36.2], zoom: 10 },
        'fin': { center: [2.36, 48.98], zoom: 10 }
    };

    const chapterNames = Object.keys(chapters);
    const lineCoords = chapterNames.map(name => chapters[name].center);

    let activeChapterId = 'naissance';

    // Add markers
    chapterNames.forEach(name => {
        new maplibregl.Marker().setLngLat(chapters[name].center).addTo(map);
    });

    // Add line source and layer on map load
    map.on('load', () => {
        map.setProjection({ type: 'globe' });

        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: [lineCoords[0]] } // start with first point
            }
        });

        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#555599', 'line-width': 1 }
        });
    });

    function setActiveChapter(chapterName) {
        if (chapterName === activeChapterId) return;

        const index = chapterNames.indexOf(chapterName);

        const route = map.getSource('route');
        if (route) {
            route.setData({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: lineCoords.slice(0, index + 1) }
            });
        }

        map.flyTo(chapters[chapterName]);

        document.getElementById(chapterName).classList.add('active');
        document.getElementById(activeChapterId).classList.remove('active');

        activeChapterId = chapterName;
    }

    function isElementOnScreen(id) {
        const el = document.getElementById(id);
        const bounds = el.getBoundingClientRect();
        return bounds.top < window.innerHeight && bounds.bottom > 0;
    }

    window.addEventListener('scroll', () => {
        for (const name of chapterNames) {
            if (isElementOnScreen(name)) {
                setActiveChapter(name);
                break;
            }
        }
    });
