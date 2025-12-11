const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
    center: [-15.97, 12.82],
    zoom: 10
});

map.on('style.load', () => {
    map.setProjection({
        type: 'globe', // Set projection to globe
    });
});

const chapters = {
    'naissance': {
        center: [-15.97, 12.82],
        zoom: 10
    },
    '1939': {
        center: [1.43, 44.43],
        zoom: 10
    },
    'combats': {
        center: [2.52, 49.87],
        zoom: 10
    },
    'stalag': {
        center: [13.4, 52.62],
        zoom: 10
    },
    'transfert': {
        center: [-0.98, 43.73],
        zoom: 10
    },
    'evasion': {
        center: [-17.45, 14.72],
        zoom: 10
    },
    'debarquement': {
        center: [5.92, 43.12],
        zoom: 10
    },
    'indochine': {
        center: [105.58, 21.3],
        zoom: 10
    },
    'suez': {
        center: [32.55, 29.97],
        zoom: 10
    },
    'algerie': {
        center: [2.51, 36.2],
        zoom: 10
    },
    'fin': {
        center: [2.36, 48.98],
        zoom: 10
    }
};
const m_naissance = new maplibregl.Marker()
    .setLngLat([-15.97, 12.82])
    .addTo(map);
const m_1939 = new maplibregl.Marker()
    .setLngLat([1.43, 44.43])
    .addTo(map);
const m_combats = new maplibregl.Marker()
    .setLngLat([2.52, 49.87])
    .addTo(map);
const m_stalag = new maplibregl.Marker()
    .setLngLat([13.4, 52.62])
    .addTo(map);
const m_transfert = new maplibregl.Marker()
    .setLngLat([-0.98, 43.73])
    .addTo(map);
const m_evasion = new maplibregl.Marker()
    .setLngLat([-17.45, 14.72])
    .addTo(map);
const m_debarquement = new maplibregl.Marker()
    .setLngLat([5.92, 43.12])
    .addTo(map);
const m_indochine = new maplibregl.Marker()
    .setLngLat([105.58, 21.3])
    .addTo(map);
const m_suez = new maplibregl.Marker()
    .setLngLat([32.55, 29.97])
    .addTo(map);
const m_algerie = new maplibregl.Marker()
    .setLngLat([2.51, 36.2])
    .addTo(map);
const m_fin = new maplibregl.Marker()
    .setLngLat([2.36, 48.98])
    .addTo(map);

// On every scroll event, check which element is on screen
window.onscroll = function () {
    const chapterNames = Object.keys(chapters);
    for (let i = 0; i < chapterNames.length; i++) {
        const chapterName = chapterNames[i];
        if (isElementOnScreen(chapterName)) {
            setActiveChapter(chapterName);
            break;
        }
    }
};

let activeChapterName = 'naissance';
function setActiveChapter(chapterName) {
    if (chapterName === activeChapterName) return;

    map.flyTo(chapters[chapterName]);

    document.getElementById(chapterName).setAttribute('class', 'active');
    document.getElementById(activeChapterName).setAttribute('class', '');

    activeChapterName = chapterName;
}

function isElementOnScreen(id) {
    const element = document.getElementById(id);
    const bounds = element.getBoundingClientRect();
    return bounds.top < window.innerHeight && bounds.bottom > 0;
}
