// 1. Puntos de Interés iniciales en Utrera
const mostachones = [
    { id: 1, nombre: "Mostachón de la Plaza", lugar: "Plaza del Altozano", lat: 37.1843, lng: -5.7808, puntos: 10, cazado: false },
    { id: 2, nombre: "Mostachón del Castillo", lugar: "Castillo de Utrera", lat: 37.1822, lng: -5.7836, puntos: 25, cazado: false },
    { id: 3, nombre: "Mostachón Bendito", lugar: "Parroquia de Santiago", lat: 37.1856, lng: -5.7821, puntos: 15, cazado: false },
    { id: 4, nombre: "Mostachón Dorado", lugar: "Santuario de Consolación", lat: 37.1935, lng: -5.7681, puntos: 50, cazado: false }
];

let puntosTotales = 0;
let mostachonesCazadosCount = 0;
let mostachonActual = null;

// 2. Inicializar mapa centrado en Utrera
const map = L.map('map').setView([37.1843, -5.7808], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Marcador de la posición del usuario
let userMarker = null;

// 3. Pintar los mostachones en el mapa
mostachones.forEach(m => {
    m.marker = L.marker([m.lat, m.lng]).addTo(map)
        .bindPopup(`<b>${m.nombre}</b><br>${m.lugar}<br>Puntos: ${m.puntos}`);
});

// 4. Calcular distancia entre dos puntos (Fórmula de Haversine en metros)
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
}

// 5. Rastrear posición del usuario en tiempo real
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(pos => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        // Actualizar o crear marcador del jugador
        if (!userMarker) {
            userMarker = L.circleMarker([userLat, userLng], { color: 'blue', radius: 8 }).addTo(map);
        } else {
            userMarker.setLatLng([userLat, userLng]);
        }

        // Comprobar si está cerca de algún mostachón (menos de 30 metros)
        mostachones.forEach(m => {
            if (!m.cazado) {
                const dist = calcularDistancia(userLat, userLng, m.lat, m.lng);
                if (dist < 30) {
                    abrirModalCaza(m);
                }
            }
        });
    }, err => console.warn("Error GPS:", err), { enableHighAccuracy: true });
}

// 6. Abrir ventana de captura
function abrirModalCaza(mostachon) {
    mostachonActual = mostachon;
    document.getElementById('mostachon-title').innerText = `¡${mostachon.nombre}!`;
    document.getElementById('mostachon-desc').innerText = `Estás en ${mostachon.lugar}. ¡Haz clic para cazarlo y ganar ${mostachon.puntos} puntos!`;
    document.getElementById('catch-modal').classList.remove('hidden');
}

// 7. Acción de cazar
document.getElementById('catch-btn').addEventListener('click', () => {
    if (mostachonActual) {
        mostachonActual.cazado = true;
        puntosTotales += mostachonActual.puntos;
        mostachonesCazadosCount++;

        // Actualizar marcador en mapa
        mostachonActual.marker.setOpacity(0.4);
        mostachonActual.marker.bindPopup(`<b>${mostachonActual.nombre}</b><br>¡Ya cazado!`);

        // Actualizar marcadores
        document.getElementById('score').innerText = puntosTotales;
        document.getElementById('count').innerText = mostachonesCazadosCount;

        // Cerrar modal
        document.getElementById('catch-modal').classList.add('hidden');
        alert(`🎉 ¡Has cazado el ${mostachonActual.nombre}! +${mostachonActual.puntos} pts`);
    }
});
