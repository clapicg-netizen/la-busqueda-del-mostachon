
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

// Variable para el lector QR
let html5QrCode = null;

// 2. Icono personalizado con tu imagen mostachon.png
const mostachonIcon = L.icon({
    iconUrl: 'mostachon.png',
    iconSize: [40, 40],      // Ancho y alto de la imagen en píxeles
    iconAnchor: [20, 40],    // Punto de apoyo en el mapa
    popupAnchor: [0, -40]    // Posición del bocadillo informativo
});

// 3. Puntos de Interés en Utrera (GPS y QR)
const mostachones = [
    // Puntos por GPS (Monumentos y Plazas)
    { id: 1, tipo: 'gps', nombre: "Mostachón de la Plaza", lugar: "Plaza del Altozano", lat: 37.1843, lng: -5.7808, puntos: 10, cazado: false },
    { id: 2, tipo: 'gps', nombre: "Mostachón del Castillo", lugar: "Castillo de Utrera", lat: 37.1822, lng: -5.7836, puntos: 25, cazado: false },
    { id: 3, tipo: 'gps', nombre: "Mostachón Bendito", lugar: "Parroquia de Santiago", lat: 37.1856, lng: -5.7821, puntos: 15, cazado: false },
    { id: 4, tipo: 'gps', nombre: "Mostachón Dorado", lugar: "Santuario de Consolación", lat: 37.1935, lng: -5.7681, puntos: 50, cazado: false },

    // Puntos por Código QR (Comercios y Bares)
    { id: 5, tipo: 'qr', codigoQR: "MOSTACHON_BAR_ALONSI", nombre: "Mostachón Tapero", lugar: "Bar Alonsi", lat: 37.1835, lng: -5.7812, puntos: 30, cazado: false },
    { id: 6, tipo: 'qr', codigoQR: "MOSTACHON_LA_CHANA", nombre: "Mostachón Flamenco", lugar: "La Chana", lat: 37.1848, lng: -5.7819, puntos: 30, cazado: false },
    { id: 7, tipo: 'qr', codigoQR: "MOSTACHON_CASA_FUENTES", nombre: "Mostachón Gourmet", lugar: "Abacería Casa Fuentes", lat: 37.1839, lng: -5.7803, puntos: 30, cazado: false }
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

// 4. Inicializar mapa y colocar iconos personalizados
const map = L.map('map').setView([37.1843, -5.7808], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

let userMarker = null;

mostachones.forEach(m => {
    const etiquetaTipo = m.tipo === 'qr' ? ' 📷 [Escanear QR en el local]' : ' 📍 [Ubicación GPS]';
    m.marker = L.marker([m.lat, m.lng], { icon: mostachonIcon }).addTo(map)
        .bindPopup(`<b>${m.nombre}</b><br>${m.lugar}<br>Puntos: ${m.puntos}<br><i>${etiquetaTipo}</i>`);
});

// 5. Haversine GPS
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

// 6. Rastrear posición GPS
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
    
    const containerQR = document.getElementById('qr-reader-container');
    const catchBtn = document.getElementById('catch-btn');

    if (mostachon.tipo === 'qr') {
        document.getElementById('mostachon-desc').innerText = `Estás en ${mostachon.lugar}. ¡Busca el cartel oficial en la barra o mostrador y escanea el código QR!`;
        containerQR.classList.remove('hidden');
        catchBtn.classList.add('hidden');
        iniciarEscanerQR();
    } else {
        document.getElementById('mostachon-desc').innerText = `Estás en ${mostachon.lugar}. ¡Haz clic para conseguirlo y ganar ${mostachon.puntos} puntos!`;
        containerQR.classList.add('hidden');
        catchBtn.classList.remove('hidden');
    }

    document.getElementById('catch-modal').classList.remove('hidden');
}

// Iniciar cámara para QR
function iniciarEscanerQR() {
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }
    
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 200 },
        (decodedText) => {
            if (mostachonActual && decodedText === mostachonActual.codigoQR) {
                completarBusqueda();
                detenerEscanerQR();
            } else {
                alert("Código QR no válido para este mostachón.");
            }
        },
        (errorMessage) => { /* Escaneando... */ }
    ).catch(err => console.error("Error iniciando cámara QR:", err));
}

function detenerEscanerQR() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById('qr-reader-container').classList.add('hidden');
        }).catch(err => console.error(err));
    }
}

// Conseguir Mostachón GPS
document.getElementById('catch-btn').addEventListener('click', () => {
    if (mostachonActual && mostachonActual.tipo === 'gps') {
        completarBusqueda();
    }
});

// Cerrar modal
document.getElementById('cancel-catch-btn').addEventListener('click', () => {
    detenerEscanerQR();
    document.getElementById('catch-modal').classList.add('hidden');
});

function completarBusqueda() {
    mostachonActual.cazado = true;
    jugador.puntos += mostachonActual.puntos;
    jugador.cazados += 1;

    guardarProgreso();
    actualizarUI();

    mostachonActual.marker.setOpacity(0.4);
    mostachonActual.marker.bindPopup(`<b>${mostachonActual.nombre}</b><br>¡Ya conseguido!`);

    detenerEscanerQR();
    document.getElementById('catch-modal').classList.add('hidden');
    alert(`🎉 ¡Has conseguido el ${mostachonActual.nombre}! +${mostachonActual.puntos} pts`);
}

// 7. Cargar Ranking Real desde Firebase
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
