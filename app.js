
// 1. Configuración e Inicialización de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC99DVmi_sQnsf-AeqQG9Me07trSKlIMSY",
  authDomain: "busqueda-mostachon.firebaseapp.com",
  projectId: "busqueda-mostachon",
  storageBucket: "busqueda-mostachon.firebasestorage.app",
  messagingSenderId: "1095258377495",
  appId: "1:1095258377495:web:fe714669c27d3475143b52"
};

// Inicializar Firebase y Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. Puntos de Interés iniciales en Utrera
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

// Comprobar apodo al cargar
document.addEventListener("DOMContentLoaded", () => {
    if (!jugador.nickname) {
        document.getElementById('nickname-modal').classList.remove('hidden');
    } else {
        actualizarUI();
        guardarEnFirebase();
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
    guardarEnFirebase();
}

// Guardar/Actualizar Puntuación en Firebase en tiempo real
function guardarEnFirebase() {
    if (jugador.nickname) {
        db.collection("ranking").doc(jugador.nickname).set({
            nickname: jugador.nickname,
            puntos: jugador.puntos,
            cazados: jugador.cazados,
            ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .catch(err => console.error("Error guardando en Firebase:", err));
    }
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
    document.getElementById('mostachon-desc').innerText = `Estás en ${mostachon.lugar}. ¡Haz clic para conseguirlo y ganar ${mostachon.puntos} puntos!`;
    document.getElementById('catch-modal').classList.remove('hidden');
}

// Conseguir Mostachón
document.getElementById('catch-btn').addEventListener('click', () => {
    if (mostachonActual) {
        mostachonActual.cazado = true;
        jugador.puntos += mostachonActual.puntos;
        jugador.cazados += 1;

        guardarProgreso();
        actualizarUI();

        mostachonActual.marker.setOpacity(0.4);
        mostachonActual.marker.bindPopup(`<b>${mostachonActual.nombre}</b><br>¡Ya conseguido!`);

        document.getElementById('catch-modal').classList.add('hidden');
        alert(`🎉 ¡Has conseguido el ${mostachonActual.nombre}! +${mostachonActual.puntos} pts`);
    }
});

// 6. Cargar Ranking Real desde Firebase
document.getElementById('btn-ranking-open').addEventListener('click', () => {
    cargarRankingReal();
    document.getElementById('ranking-modal').classList.remove('hidden');
});

document.getElementById('close-ranking-btn').addEventListener('click', () => {
    document.getElementById('ranking-modal').classList.add('hidden');
});

function cargarRankingReal() {
    const rankingList = document.getElementById('ranking-list');
    rankingList.innerHTML = '<p>Cargando clasificaciones...</p>';

    db.collection("ranking").orderBy("puntos", "desc").limit(20).get()
    .then((querySnapshot) => {
        let html = '';
        let index = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let isMe = data.nickname === jugador.nickname ? 'me' : '';
            html += `<div class="ranking-item ${isMe}">
                <span><strong>#${index}</strong> ${data.nickname}</span>
                <span><strong>${data.puntos} pts</strong></span>
            </div>`;
            index++;
        });

        if (html === '') {
            html = '<p>¡Sé el primero en entrar al ranking!</p>';
        }

        rankingList.innerHTML = html;
    })
    .catch((error) => {
        console.error("Error al obtener ranking: ", error);
        rankingList.innerHTML = '<p>Error al cargar el ranking.</p>';
    });
}
