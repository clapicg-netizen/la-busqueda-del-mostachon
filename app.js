
// 1. Puntos de Interés iniciales en Utrera
const mostachones = [
    { id: 1, nombre: "Mostachón de la Plaza", lugar: "Plaza del Altozano", lat: 37.1843, lng: -5.7808, puntos: 10, cazado: false },
    { id: 2, nombre: "Mostachón del Castillo", lugar: "Castillo de Utrera", lat: 37.1822, lng: -5.7836, puntos: 25, cazado: false },
    { id: 3, nombre: "Mostachón Bendito", lugar: "Parroquia de Santiago", lat: 37.1856, lng: -5.7821, puntos: 15, cazado: false },
    { id: 4, nombre: "Mostachón Dorado", lugar: "Santuario de Consolación", lat: 37.1935, lng: -5.7681, puntos: 50, cazado: false }
];

// Perfil de jugador en LocalStorage
let jugador = JSON.parse(localStorage.getItem('mostachon_user')) || {
    nickname: '',
    puntos: 0,
    cazados: 0
};

let mostachonActual = null;

// 2. Comprobar si ya tiene apodo al cargar
document.addEventListener("DOMContentLoaded", () => {
    if (!jugador.nickname) {
        document.getElementById('nickname-modal').classList.remove('hidden');
    } else {
        actualizarUI();
    }
});

// Guardar Apodo
document.getElementById('save-nickname-btn').addEventListener('click', () => {
    const nickInput = document.getElementById('nickname-input').value.trim();
    if (nickInput) {
        jugador.nickname = nickInput;
        guardarProgreso();
        document.getElementById('nickname-modal').classList.add('hidden');
        actualizarUI();
    } else {
        alert("Por favor, introduce un apodo válido.");
    }
});

function guardarProgreso() {
    localStorage.setItem('mostachon_user', JSON.stringify(jugador));
}

function actualizarUI() {
    document.getElementById('player-nickname').innerText = jugador.nickname;
    document.getElementById('score').innerText = jugador.puntos;
    document.getElementById('count').innerText = jugador.cazados;
}

// 3. Inicializar mapa
const map = L.map('map').setView([37.1843, -5.7808], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let userMarker = null;

mostachones.forEach(m => {
    m.marker = L.marker([m.lat, m.lng]).addTo(map)
        .bindPopup(`<b>${m.nombre}</b><br>${m.lugar}<br>Puntos: ${m.puntos}`);
});

// 4. Haversine GPS
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

// 5. Rastrear posición GPS
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(pos => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        if (!userMarker) {
            userMarker = L.circleMarker([userLat, userLng], { color: 'blue', radius: 8 }).addTo(map);
        } else {
            userMarker.setLatLng([userLat, userLng]);
        }

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

function abrirModalCaza(mostachon) {
    mostachonActual = mostachon;
    document.getElementById('mostachon-title').innerText = `¡${mostachon.nombre}!`;
    document.getElementById('mostachon-desc').innerText = `Estás en ${mostachon.lugar}. ¡Haz clic para cazarlo y ganar ${mostachon.puntos} puntos!`;
    document.getElementById('catch-modal').classList.remove('hidden');
}

// Cazar Mostachón
document.getElementById('catch-btn').addEventListener('click', () => {
    if (mostachonActual) {
        mostachonActual.cazado = true;
        jugador.puntos += mostachonActual.puntos;
        jugador.cazados += 1;

        guardarProgreso();
        actualizarUI();

        mostachonActual.marker.setOpacity(0.4);
        mostachonActual.marker.bindPopup(`<b>${mostachonActual.nombre}</b><br>¡Ya cazado!`);

        document.getElementById('catch-modal').classList.add('hidden');
        alert(`🎉 ¡Has cazado el ${mostachonActual.nombre}! +${mostachonActual.puntos} pts`);
    }
});

// 6. Ranking Modal
document.getElementById('btn-ranking-open').addEventListener('click', () => {
    cargarRanking();
    document.getElementById('ranking-modal').classList.remove('hidden');
});

document.getElementById('close-ranking-btn').addEventListener('click', () => {
    document.getElementById('ranking-modal').classList.add('hidden');
});

function cargarRanking() {
    // Lista simulada del Ranking de Utrera + Tu usuario
    let rankingData = [
        { name: "Manolo_Altozano", pts: 100 },
        { name: "Mari_Consolacion", pts: 75 },
        { name: "Curro_Utrera", pts: 50 }
    ];

    // Añadir o actualizar usuario actual en la lista
    if (jugador.nickname) {
        let existe = rankingData.find(r => r.name === jugador.nickname);
        if (existe) {
            existe.pts = jugador.puntos;
        } else {
            rankingData.push({ name: jugador.nickname, pts: jugador.puntos });
        }
    }

    // Ordenar de mayor a menor
    rankingData.sort((a, b) => b.pts - a.pts);

    let html = '';
    rankingData.forEach((r, index) => {
        let isMe = r.name === jugador.nickname ? 'me' : '';
        html += `<div class="ranking-item ${isMe}">
            <span><strong>#${index + 1}</strong> ${r.name}</span>
            <span><strong>${r.pts} pts</strong></span>
        </div>`;
    });

    document.getElementById('ranking-list').innerHTML = html;
}
