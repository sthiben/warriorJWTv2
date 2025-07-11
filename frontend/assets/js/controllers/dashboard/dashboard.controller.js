document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('warriorJWT');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutButton = document.getElementById('logoutBtn');
    const dynamicContent = document.getElementById('dynamicContent');

    // --- 1. Proteger la ruta ---
    if (!token) {
        // Si no hay token, no se puede estar aquí. Redirigir al login.
        window.location.href = '../auth/index.html';
        return; // Detener la ejecución del script
    }

    // --- 2. Decodificar el token para obtener los datos del usuario ---
    function decodeJwt(token) {
        try {
            const base64Url = token.split('.')[1]; // Obtener el payload
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Error al decodificar el token:', e);
            return null;
        }
    }

    const userData = decodeJwt(token);

    if (userData && userData.username) {
        // --- 3. Mostrar el mensaje de bienvenida ---
        welcomeMessage.textContent = `¡Bienvenido, ${userData.username}!`;

        // --- Lógica de roles ---
        const roleID = userData.role;
        if (roleID === 1) { // Asumiendo que 1 es Admin
            dynamicContent.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Panel de Administrador</h5>
                        <p class="card-text">Desde aquí puedes gestionar los combates.</p>
                        <button class="btn btn-primary" id="createMatchBtn">Crear Nuevo Combate</button>
                    </div>
                </div>
                <div class="card mt-4">
                    <div class="card-body">
                        <h5 class="card-title">Combates Activos</h5>
                        <ul class="list-group" id="activeMatchesList">
                            <!-- Lista de combates activos se inyectará aquí -->
                        </ul>
                    </div>
                </div>
                <div class="card mt-4">
                    <div class="card-body">
                        <h5 class="card-title">Historial de Partidas</h5>
                        <ul class="list-group" id="matchHistoryList">
                            <!-- El historial se inyectará aquí -->
                        </ul>
                    </div>
                </div>
            `;
            // --- Lógica para el panel del Admin ---

            // Botón para crear combate
            const createMatchBtn = document.getElementById('createMatchBtn');
            createMatchBtn.addEventListener('click', async () => {
                createMatchBtn.disabled = true;
                try {
                    const response = await fetch('http://localhost:3200/api_v1/matches', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || 'Error al crear el combate.');
                    alert(`¡Combate creado con éxito!\\nEl PIN para unirse es: ${result.pin}`);
                    fetchActiveMatches(); // Recargar la lista de combates
                } catch (error) {
                    alert(`Error: ${error.message}`);
                } finally {
                    createMatchBtn.disabled = false;
                }
            });

            // Función para obtener y renderizar combates activos
            const activeMatchesList = document.getElementById('activeMatchesList');
            const matchHistoryList = document.getElementById('matchHistoryList');
            const fetchActiveMatches = async () => {
                try {
                    const response = await fetch('http://localhost:3200/api_v1/matches/active', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const matches = await response.json();
                    
                    activeMatchesList.innerHTML = ''; // Limpiar
                    if (matches.length === 0) {
                        activeMatchesList.innerHTML = '<li class="list-group-item">No hay combates activos.</li>';
                        return;
                    }
                    matches.forEach(match => {
                        const matchItem = document.createElement('li');
                        matchItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                        matchItem.innerHTML = `
                            <div>
                                <strong>PIN: ${match.matchPIN}</strong><br>
                                <small>${match.player1Name || 'P1'} vs ${match.player2Name || 'P2'} | Estado: ${match.matchStatus}</small>
                            </div>
                            <button class="btn btn-sm btn-warning determine-winner-btn" data-match-id="${match.matchID}" ${match.matchStatus !== 'TimeOver' ? 'disabled' : ''}>
                                Determinar Ganador
                            </button>
                            <button class="btn btn-sm btn-danger cancel-match-btn" data-match-id="${match.matchID}" ${match.matchStatus === 'Finished' || match.matchStatus === 'TimeOver' ? 'disabled' : ''}>
                                Cancelar
                            </button>
                        `;
                        activeMatchesList.appendChild(matchItem);
                    });

                    // Listeners para los botones de determinar ganador
                    document.querySelectorAll('.determine-winner-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            const matchId = e.target.getAttribute('data-match-id');
                            e.target.disabled = true;
                            try {
                                const winResponse = await fetch(`http://localhost:3200/api_v1/matches/${matchId}/determine_winner`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const winResult = await winResponse.json();
                                if (!winResponse.ok) throw new Error(winResult.error || 'Error al determinar ganador.');
                                alert(winResult.message);
                                fetchActiveMatches(); // Recargar lista de activos
                                fetchMatchHistory(); // Recargar historial
                            } catch (error) {
                                alert(error.message);
                                e.target.disabled = false;
                            }
                        });
                    });

                    // Listeners para el nuevo botón de cancelar
                    document.querySelectorAll('.cancel-match-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            const matchId = e.target.getAttribute('data-match-id');
                            
                            if (!confirm('¿Estás seguro de que quieres cancelar este combate? Esta acción es irreversible.')) {
                                return;
                            }

                            e.target.disabled = true;
                            try {
                                const response = await fetch(`http://localhost:3200/api_v1/matches/${matchId}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const result = await response.json();
                                if (!response.ok) throw new Error(result.error || 'Error al cancelar el combate.');
                                alert(result.Message);
                                fetchActiveMatches();
                                fetchMatchHistory();
                            } catch (error) {
                                alert(error.message);
                                e.target.disabled = false;
                            }
                        });
                    });

                } catch (error) {
                    console.error('Error cargando combates activos:', error);
                }
            };

            const fetchMatchHistory = async () => {
                try {
                    const response = await fetch('http://localhost:3200/api_v1/matches/history', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const history = await response.json();
                    matchHistoryList.innerHTML = ''; // Limpiar
                    if (history.length === 0) {
                        matchHistoryList.innerHTML = '<li class="list-group-item">No hay partidas finalizadas.</li>';
                        return;
                    }
                    history.forEach(match => {
                        const winner = match.winnerName ? `Ganador: <strong>${match.winnerName}</strong>` : 'Resultado: Empate';
                        const matchItem = document.createElement('li');
                        matchItem.className = 'list-group-item';
                        matchItem.innerHTML = `
                            ${match.player1Name} vs ${match.player2Name} | ${winner}
                        `;
                        matchHistoryList.appendChild(matchItem);
                    });
                } catch (error) {
                    console.error('Error cargando el historial:', error);
                }
            };
            
            // Carga inicial de combates activos e historial
            fetchActiveMatches();
            fetchMatchHistory();
            
        } else if (roleID === 2) { // Asumiendo que 2 es Player
            dynamicContent.innerHTML = `
                <div class="row">
                    <!-- Columna de Guerreros -->
                    <div class="col-md-7">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Tus Guerreros</h5>
                                <p class="card-text">Aquí puedes ver, crear y seleccionar tus guerreros para el combate.</p>
                                <ul class="list-group" id="warriorsList">
                                    <!-- La lista de guerreros se inyectará aquí -->
                                </ul>
                            </div>
                        </div>
                        <div class="card mt-4">
                            <div class="card-body">
                                <h5 class="card-title">Crear Nuevo Guerrero</h5>
                                <form id="createWarriorForm">
                                    <div class="mb-3">
                                        <label for="warriorName" class="form-label">Nombre del Guerrero</label>
                                        <input type="text" class="form-control" id="warriorName" required>
                                    </div>
                                    <div class="row">
                                        <div class="col">
                                            <label for="typeID" class="form-label">Tipo</label>
                                            <select class="form-select" id="typeID" required>
                                                <option value="">Cargando...</option>
                                            </select>
                                        </div>
                                        <div class="col">
                                            <label for="breedID" class="form-label">Raza</label>
                                            <select class="form-select" id="breedID" required>
                                                <option value="">Cargando...</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-primary mt-3">Crear Guerrero</button>
                                </form>
                            </div>
                        </div>
                    </div>
                    <!-- Columna de Combate -->
                    <div class="col-md-5">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Unirse a un Combate</h5>
                                <p>Introduce el PIN del combate para unirte.</p>
                                <div class="input-group">
                                    <input type="text" class="form-control" placeholder="PIN del Combate" id="matchPinInput">
                                    <button class="btn btn-success" type="button" id="joinMatchBtn">Unirse</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal para Administrar Poderes -->
                <div class="modal fade" id="powersModal" tabindex="-1" aria-labelledby="powersModalLabel" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="powersModalLabel">Administrar Poderes para </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <h6>Poderes Aprendidos</h6>
                                <ul class="list-group mb-3" id="learnedPowersList">
                                    <!-- Poderes aprendidos se listarán aquí -->
                                </ul>
                                <hr>
                                <h6>Asignar Nuevo Poder</h6>
                                <div class="input-group">
                                    <select class="form-select" id="availablePowersSelect">
                                        <option selected>Elige un poder...</option>
                                    </select>
                                    <button class="btn btn-primary" type="button" id="assignPowerBtn">Asignar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // --- Lógica para el panel del Jugador ---
            const warriorsList = document.getElementById('warriorsList');
            const createWarriorForm = document.getElementById('createWarriorForm');
            const typeSelect = document.getElementById('typeID');
            const breedSelect = document.getElementById('breedID');

            // --- Lógica de Carga de Datos para Formularios ---
            const populateSelect = (selectElement, items, valueField, nameField) => {
                selectElement.innerHTML = `<option value="">Selecciona una opción</option>`;
                items.forEach(item => {
                    selectElement.innerHTML += `<option value="${item[valueField]}">${item[nameField]}</option>`;
                });
            };

            const loadFormData = async () => {
                try {
                    const [typesResponse, breedsResponse] = await Promise.all([
                        fetch('http://localhost:3200/api_v1/warriors/types'),
                        fetch('http://localhost:3200/api_v1/warriors/breeds')
                    ]);
                    if (!typesResponse.ok || !breedsResponse.ok) {
                        throw new Error('Failed to fetch game data.');
                    }
                    const types = await typesResponse.json();
                    const breeds = await breedsResponse.json();
                    populateSelect(typeSelect, types, 'typeID', 'typeName');
                    populateSelect(breedSelect, breeds, 'breedID', 'breedName');
                } catch (error) {
                    console.error('Error cargando datos para el formulario:', error);
                    typeSelect.innerHTML = `<option value="">Error al cargar</option>`;
                    breedSelect.innerHTML = `<option value="">Error al cargar</option>`;
                }
            };
            
            // Cargar datos para los selects
            loadFormData();

            // Función para renderizar los guerreros
            const renderWarriors = (warriors) => {
                warriorsList.innerHTML = ''; // Limpiar lista
                if (warriors.length === 0) {
                    warriorsList.innerHTML = '<li class="list-group-item">No tienes guerreros. ¡Crea uno!</li>';
                    return;
                }
                warriors.forEach(warrior => {
                    const warriorItem = document.createElement('li');
                    warriorItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                    
                    const isSelected = warrior.isSelected;
                    const buttonClass = isSelected ? 'btn-danger' : 'btn-outline-primary';
                    const buttonText = isSelected ? 'Deseleccionar' : 'Seleccionar';

                    warriorItem.innerHTML = `
                        <span>
                            <i class="fa ${isSelected ? 'fa-check-square' : 'fa-square'}" style="color: ${isSelected ? 'green' : 'grey'};"></i>
                            ${warrior.warriorName} (${warrior.typeName}, ${warrior.breedName})
                        </span>
                        <div>
                            <button class="btn btn-sm btn-info manage-powers-btn" data-warrior-id="${warrior.warriorID}" data-warrior-name="${warrior.warriorName}">Poderes</button>
                            <button class="btn btn-sm ${buttonClass} select-warrior-btn" data-warrior-id="${warrior.warriorID}">
                                ${buttonText}
                            </button>
                            <button class="btn btn-sm btn-danger delete-warrior-btn" data-warrior-id="${warrior.warriorID}">Eliminar</button>
                        </div>
                    `;
                    warriorsList.appendChild(warriorItem);
                });

                // Añadir listeners a los botones recién creados
                addSelectWarriorListeners();
                addManagePowersListeners();
                addDeleteWarriorListeners();
            };

            const addSelectWarriorListeners = () => {
                document.querySelectorAll('.select-warrior-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const warriorId = e.target.getAttribute('data-warrior-id');
                        const originalButtonHTML = e.target.innerHTML;
                        e.target.disabled = true;
                        e.target.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

                        try {
                            const response = await fetch(`http://localhost:3200/api_v1/warriors/${warriorId}/select`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            const result = await response.json();

                            if (!response.ok) {
                                throw new Error(result.error || 'Ocurrió un error.');
                            }
                            
                            fetchAndRenderWarriors();
                        
                        } catch (error) {
                            alert(error.message);
                            e.target.disabled = false;
                            e.target.innerHTML = originalButtonHTML;
                        }
                    });
                });
            };

            // Función para obtener y renderizar los guerreros
            const fetchAndRenderWarriors = async () => {
                try {
                    const response = await fetch('http://localhost:3200/api_v1/warriors', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('No se pudieron cargar tus guerreros.');
                    const warriors = await response.json();
                    renderWarriors(warriors);
                } catch (error) {
                    alert(error.message);
                }
            };
            
            // Carga inicial de guerreros
            fetchAndRenderWarriors();

            // Event listener para el formulario de creación de guerreros
            createWarriorForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('warriorName').value;
                const typeID = document.getElementById('typeID').value;
                const breedID = document.getElementById('breedID').value;

                if (!typeID || !breedID) {
                    alert('Por favor, selecciona un tipo y una raza para tu guerrero.');
                    return;
                }
                
                try {
                    const response = await fetch('http://localhost:3200/api_v1/warriors', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ name, typeID, breedID })
                    });
                    if (!response.ok) {
                         const errorData = await response.json();
                         throw new Error(errorData.error || 'No se pudo crear el guerrero.');
                    }
                    alert('¡Guerrero creado con éxito!');
                    createWarriorForm.reset();
                    fetchAndRenderWarriors(); // Recargar la lista
                } catch (error) {
                    alert(error.message);
                }
            });

            // --- Lógica para unirse al combate (ya existente) ---
            const joinMatchBtn = document.getElementById('joinMatchBtn');
            const matchPinInput = document.getElementById('matchPinInput');
            joinMatchBtn.addEventListener('click', async () => {
                const pin = matchPinInput.value.trim();
                if (!pin) {
                    alert('Por favor, introduce el PIN de un combate.');
                    return;
                }
                try {
                    const response = await fetch('http://localhost:3200/api_v1/matches/join', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ pin: pin })
                    });
                    if (!response.ok) {
                         const errorData = await response.json();
                         throw new Error(errorData.message || 'Error al unirse al combate.');
                    }
                    alert('¡Te has unido al combate con éxito!');
                    window.location.href = `../match/index.html?pin=${pin}`;
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            });

            // --- LÓGICA PARA GESTIONAR PODERES ---
            const addManagePowersListeners = () => {
                const powersModal = new bootstrap.Modal(document.getElementById('powersModal'));
                const modalTitle = document.getElementById('powersModalLabel');
                const learnedList = document.getElementById('learnedPowersList');
                const availableSelect = document.getElementById('availablePowersSelect');
                const assignBtn = document.getElementById('assignPowerBtn');

                // Clonar y reemplazar el botón para limpiar listeners antiguos
                const newAssignBtn = assignBtn.cloneNode(true);
                assignBtn.parentNode.replaceChild(newAssignBtn, assignBtn);

                let currentWarriorId = null;

                // Listener para el botón de asignar poder
                newAssignBtn.addEventListener('click', async () => {
                    if (!currentWarriorId || !availableSelect.value) {
                        alert('Error: No se ha seleccionado un guerrero o poder.');
                        return;
                    }

                    const powerID = availableSelect.value;
                    newAssignBtn.disabled = true;
                    newAssignBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Asignando...`;

                    try {
                        const response = await fetch(`http://localhost:3200/api_v1/warriors/${currentWarriorId}/powers`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ powerID: powerID })
                        });

                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error || 'Error al asignar el poder.');
                        
                        alert(result.message);
                        powersModal.hide();
                        fetchAndRenderWarriors();
                        
                    } catch (error) {
                        alert(error.message);
                    } finally {
                        newAssignBtn.disabled = false;
                        newAssignBtn.innerHTML = 'Asignar';
                    }
                });

                // Listeners para todos los botones "Poderes" de la lista
                document.querySelectorAll('.manage-powers-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        currentWarriorId = e.target.getAttribute('data-warrior-id');
                        const warriorName = e.target.getAttribute('data-warrior-name');
                        modalTitle.textContent = `Poderes de ${warriorName}`;
                        
                        // Limpiar estado anterior
                        learnedList.innerHTML = '<li>Cargando...</li>';
                        availableSelect.innerHTML = '<option>Cargando...</option>';
                        newAssignBtn.disabled = true;

                        try {
                            // Fetch de poderes aprendidos y disponibles en paralelo
                            const [learnedResponse, availableResponse] = await Promise.all([
                                fetch(`http://localhost:3200/api_v1/warriors/${currentWarriorId}/powers`, { headers: { 'Authorization': `Bearer ${token}` } }),
                                fetch(`http://localhost:3200/api_v1/warriors/powers`, { headers: { 'Authorization': `Bearer ${token}` } })
                            ]);

                            if (!learnedResponse.ok || !availableResponse.ok) {
                                throw new Error('Error al cargar los datos de poderes.');
                            }

                            const learnedPowers = await learnedResponse.json();
                            const availablePowers = await availableResponse.json();
                            
                            // Renderizar poderes aprendidos
                            learnedList.innerHTML = '';
                            if (learnedPowers.length > 0) {
                                learnedPowers.forEach(power => {
                                    const li = document.createElement('li');
                                    li.className = 'list-group-item';
                                    const damage = power.damageValue || power.powerDamage || power.power_damage || power.PowerDamage || power.damage;
                                    li.textContent = `${power.powerName} (Daño: ${damage})`;
                                    learnedList.appendChild(li);
                                });
                            } else {
                                learnedList.innerHTML = '<li class="list-group-item">Este guerrero aún no ha aprendido ningún poder.</li>';
                            }

                            // Si el guerrero ya tiene 2 poderes, deshabilitar el formulario de asignación
                            if (learnedPowers.length >= 2) {
                                availableSelect.disabled = true;
                                newAssignBtn.disabled = true;
                                availableSelect.innerHTML = '<option>Límite de poderes alcanzado</option>';
                                return; // Detener para no poblar con poderes disponibles
                            } else {
                                availableSelect.disabled = false;
                                newAssignBtn.disabled = false;
                            }

                            // Poblar el select con poderes disponibles
                            availableSelect.innerHTML = '<option value="">Elige un poder...</option>';
                            if (availablePowers) {
                                availablePowers.forEach(power => {
                                    const option = document.createElement('option');
                                    option.value = power.powerID;
                                    const damage = power.damageValue || power.powerDamage || power.power_damage || power.PowerDamage || power.damage;
                                    option.textContent = `${power.powerName} (Daño: ${damage})`;
                                    availableSelect.appendChild(option);
                                });
                            }

                        } catch (error) {
                            learnedList.innerHTML = `<li class="list-group-item text-danger">${error.message}</li>`;
                        } finally {
                            newAssignBtn.disabled = false;
                            powersModal.show();
                        }
                    });
                });
            };

            const addDeleteWarriorListeners = () => {
                document.querySelectorAll('.delete-warrior-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        const warriorId = e.target.getAttribute('data-warrior-id');
                        
                        // Pedir confirmación al usuario
                        if (!confirm('¿Estás seguro de que quieres eliminar este guerrero? Esta acción es irreversible.')) {
                            return; // Si el usuario cancela, no hacer nada
                        }

                        try {
                            const response = await fetch(`http://localhost:3200/api_v1/warriors/${warriorId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            const result = await response.json();

                            if (!response.ok) {
                                throw new Error(result.error || 'Ocurrió un error al eliminar.');
                            }
                            
                            alert(result.message); // Mostrar mensaje de éxito
                            fetchAndRenderWarriors(); // Recargar la lista para reflejar el cambio
                        
                        } catch (error) {
                            alert(error.message);
                        }
                    });
                });
            };
        }

    } else {
        // Si el token es inválido o no tiene username, mejor cerrar sesión.
        localStorage.removeItem('warriorJWT');
        window.location.href = '../auth/index.html';
    }
    
    // --- 4. Manejar el evento de logout ---
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('warriorJWT');
        alert('Has cerrado la sesión.');
        window.location.href = '../auth/index.html';
    });
});