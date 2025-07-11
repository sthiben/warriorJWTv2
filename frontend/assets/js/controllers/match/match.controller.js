document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('warriorJWT');
    
    // --- Proteger la ruta ---
    if (!token) {
        window.location.href = '../auth/index.html';
        return;
    }

    // --- Obtener PIN de la URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const pin = urlParams.get('pin');
    
    if (!pin) {
        alert('No se ha proporcionado un PIN de combate.');
        window.location.href = '../dashboard/index.html';
        return;
    }
    document.getElementById('matchPin').textContent = pin;

    // --- Referencias a elementos del DOM ---
    const elements = {
        timer: document.getElementById('timer'),
        player1Name: document.getElementById('player1Name'),
        player2Name: document.getElementById('player2Name'),
        player1Warriors: document.getElementById('player1Warriors'),
        player2Warriors: document.getElementById('player2Warriors'),
        matchStatus: document.getElementById('matchStatus')
    };

    // --- Función para cargar y renderizar datos del combate ---
    async function fetchAndRenderMatchData() {
        try {
            const response = await fetch(`http://localhost:3200/api_v1/matches/status/${pin}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('No se pudo cargar la información del combate.');
            }

            const data = await response.json();
            
            // Renderizar datos
            elements.player1Name.textContent = data.matchInfo.Player1Name || 'Esperando...';
            elements.player2Name.textContent = data.matchInfo.Player2Name || 'Esperando...';
            elements.matchStatus.textContent = `Estado: ${data.matchInfo.matchStatus}`;
            
            // Renderizar el temporizador
            updateTimer(data.matchInfo.RemainingSeconds);

            // Renderizar los guerreros de cada jugador
            renderWarriors(data.player1Warriors, elements.player1Warriors);
            renderWarriors(data.player2Warriors, elements.player2Warriors);

        } catch (error) {
            console.error('Error al cargar el combate:', error);
            alert(error.message);
            // Detener el intervalo si hay un error
            if (matchInterval) clearInterval(matchInterval);
        }
    }

    // --- Función para renderizar los guerreros ---
    function renderWarriors(warriors, container) {
        container.innerHTML = ''; // Limpiar el contenedor
        if (!warriors || warriors.length === 0) {
            container.innerHTML = '<p class="text-muted">Ningún guerrero seleccionado.</p>';
            return;
        }

        warriors.forEach(warrior => {
            const warriorCard = `
                <div class="card mb-2">
                    <div class="card-body p-2">
                        <h6 class="card-title">${warrior.warriorName}</h6>
                        <p class="card-text small mb-1">
                            Vida: ${warrior.currentLife} / ${warrior.maxLife}
                        </p>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-danger" role="progressbar" style="width: ${(warrior.currentLife / warrior.maxLife) * 100}%"></div>
                        </div>
                        <p class="card-text small mb-1 mt-2">
                            Energía: ${warrior.currentEnergy} / ${warrior.maxEnergy}
                        </p>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-info" role="progressbar" style="width: ${(warrior.currentEnergy / warrior.maxEnergy) * 100}%"></div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += warriorCard;
        });
    }

    // --- Lógica del Temporizador ---
    function updateTimer(seconds) {
        if (seconds === null || seconds < 0) {
            elements.timer.textContent = 'Tiempo Restante: --:--';
            return;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        elements.timer.textContent = `Tiempo Restante: ${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    // --- Carga inicial y actualización periódica ---
    fetchAndRenderMatchData();
    const matchInterval = setInterval(fetchAndRenderMatchData, 2000); // Actualizar cada 2 segundos
}); 