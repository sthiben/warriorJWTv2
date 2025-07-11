-- Procedimientos almacenados para simular el flujo del juego

DELIMITER //

-- Procedimiento para que un administrador cree una partida con PIN aleatorio
CREATE PROCEDURE CreateMatch(IN adminID INT)
BEGIN
    DECLARE pinNumber VARCHAR(6);
    
    -- Generar un PIN aleatorio de 6 dígitos
    SET pinNumber = LPAD(FLOOR(RAND() * 1000000), 6, '0');
    
    -- Verificar si el PIN ya existe y regenerarlo si es necesario
    WHILE EXISTS (SELECT 1 FROM Matches WHERE matchPIN = pinNumber) DO
        SET pinNumber = LPAD(FLOOR(RAND() * 1000000), 6, '0');
    END WHILE;
    
    -- Insertar la partida con el PIN generado
    INSERT INTO Matches (matchPIN, adminID, matchStatus)
    VALUES (pinNumber, adminID, 'Created');
    
    -- Devolver el PIN generado
    SELECT pinNumber AS GeneratedPIN, 'Partida creada exitosamente' AS Message;
END //

-- Procedimiento para que un jugador se una a una partida usando el PIN
CREATE PROCEDURE JoinMatch(IN playerID INT, IN pin VARCHAR(6))
BEGIN
    DECLARE matchExists INT;
    DECLARE currentMatch INT;
    DECLARE playerPosition VARCHAR(10);
    
    -- Verificar si la partida existe
    SELECT matchID INTO currentMatch FROM Matches WHERE matchPIN = pin;
    
    IF currentMatch IS NULL THEN
        SELECT 'PIN de partida inválido' AS Message;
    ELSE
        -- Verificar el estado de la partida
        SELECT 
            matchID,
            CASE 
                WHEN player1ID IS NULL THEN 'player1'
                WHEN player2ID IS NULL THEN 'player2'
                ELSE 'full'
            END AS Position
        INTO 
            matchExists, playerPosition
        FROM 
            Matches 
        WHERE 
            matchPIN = pin AND matchStatus IN ('Created', 'WaitingForPlayer2');
        
        IF matchExists IS NULL THEN
            SELECT 'La partida ya está completa o ha finalizado' AS Message;
        ELSE
            -- Asignar al jugador a la posición disponible
            IF playerPosition = 'player1' THEN
                UPDATE Matches SET player1ID = playerID, matchStatus = 'WaitingForPlayer2' WHERE matchID = matchExists;
                SELECT 'Te has unido como Jugador 1' AS Message;
            ELSEIF playerPosition = 'player2' THEN
                UPDATE Matches 
                SET player2ID = playerID, 
                    matchStatus = 'Active', 
                    matchStartTime = CURRENT_TIMESTAMP, 
                    matchEndTime = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 MINUTE)
                WHERE matchID = matchExists;
                
                -- Cargar los guerreros seleccionados de ambos jugadores a la partida
                CALL LoadWarriorsToMatch(matchExists);
                
                SELECT 'Te has unido como Jugador 2. ¡La partida ha comenzado!' AS Message;
            ELSE
                SELECT 'La partida ya está completa' AS Message;
            END IF;
        END IF;
    END IF;
END //

-- Procedimiento para cargar los guerreros seleccionados de ambos jugadores a una partida
CREATE PROCEDURE LoadWarriorsToMatch(IN matchID INT)
BEGIN
    DECLARE player1 INT;
    DECLARE player2 INT;
    
    -- Obtener los IDs de los jugadores
    SELECT player1ID, player2ID INTO player1, player2 
    FROM Matches 
    WHERE matchID = matchID;
    
    -- Insertar guerreros seleccionados del jugador 1
    INSERT INTO MatchWarriors (matchID, warriorID, playerID, currentLife, currentEnergy)
    SELECT 
        matchID, 
        warriorID, 
        ownerPlayerID,
        currentLife,
        currentEnergy
    FROM 
        Warriors
    WHERE 
        ownerPlayerID = player1 AND isSelected = TRUE;
    
    -- Insertar guerreros seleccionados del jugador 2
    INSERT INTO MatchWarriors (matchID, warriorID, playerID, currentLife, currentEnergy)
    SELECT 
        matchID, 
        warriorID, 
        ownerPlayerID,
        currentLife,
        currentEnergy
    FROM 
        Warriors
    WHERE 
        ownerPlayerID = player2 AND isSelected = TRUE;
END //

-- Procedimiento para mostrar los guerreros de un jugador en una partida
CREATE PROCEDURE GetPlayerWarriorsInMatch(IN matchID INT, IN playerID INT)
BEGIN
    SELECT 
        w.warriorID,
        w.warriorName,
        t.typeName AS WarriorType,
        b.breedName AS WarriorBreed,
        mw.currentLife,
        w.maxLife,
        mw.currentEnergy,
        w.maxEnergy,
        w.baseDamage
    FROM 
        MatchWarriors mw
    JOIN 
        Warriors w ON mw.warriorID = w.warriorID
    JOIN 
        TypeOfWarriors t ON w.typeID = t.typeID
    JOIN 
        Breed b ON w.breedID = b.breedID
    WHERE 
        mw.matchID = matchID AND mw.playerID = playerID;
END //

-- Procedimiento para obtener el tiempo restante de la partida
CREATE PROCEDURE GetMatchRemainingTime(IN matchID INT)
BEGIN
    DECLARE startTime TIMESTAMP;
    DECLARE endTime TIMESTAMP;
    DECLARE remainingSeconds INT;
    
    SELECT matchStartTime, matchEndTime 
    INTO startTime, endTime
    FROM Matches
    WHERE matchID = matchID;
    
    IF startTime IS NULL THEN
        SELECT 'La partida aún no ha comenzado' AS Status, NULL AS RemainingSeconds;
    ELSE
        SET remainingSeconds = TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, endTime);
        
        IF remainingSeconds <= 0 THEN
            UPDATE Matches SET matchStatus = 'TimeOver' WHERE matchID = matchID AND matchStatus = 'Active';
            SELECT 'Tiempo agotado' AS Status, 0 AS RemainingSeconds;
        ELSE
            SELECT 'En progreso' AS Status, remainingSeconds AS RemainingSeconds;
        END IF;
    END IF;
END //

-- Procedimiento para mostrar el estado completo de una partida
CREATE PROCEDURE GetMatchStatus(IN pin VARCHAR(6))
BEGIN
    DECLARE currentMatchID INT;
    
    -- Obtener ID de la partida
    SELECT matchID INTO currentMatchID FROM Matches WHERE matchPIN = pin;
    
    IF currentMatchID IS NULL THEN
        SELECT 'Partida no encontrada' AS Status;
    ELSE
        -- Información general de la partida
        SELECT 
            m.matchID,
            m.matchPIN,
            admin.username AS AdminName,
            p1.username AS Player1Name,
            p2.username AS Player2Name,
            m.matchStatus,
            m.matchStartTime,
            m.matchEndTime,
            CASE 
                WHEN m.matchStartTime IS NULL THEN NULL
                ELSE TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, m.matchEndTime)
            END AS RemainingSeconds
        FROM 
            Matches m
        JOIN 
            PlayerAccount admin ON m.adminID = admin.playerID
        LEFT JOIN 
            PlayerAccount p1 ON m.player1ID = p1.playerID
        LEFT JOIN 
            PlayerAccount p2 ON m.player2ID = p2.playerID
        WHERE 
            m.matchID = currentMatchID;
            
        -- Si la partida está activa o finalizada, mostrar los guerreros de ambos jugadores
        IF EXISTS (SELECT 1 FROM Matches WHERE matchID = currentMatchID AND matchStatus IN ('Active', 'TimeOver', 'Player1Won', 'Player2Won')) THEN
            -- Guerreros del jugador 1
            SELECT 
                'Guerreros del Jugador 1' AS Section;
                
            SELECT 
                w.warriorID,
                w.warriorName,
                t.typeName AS WarriorType,
                b.breedName AS WarriorBreed,
                mw.currentLife,
                w.maxLife,
                mw.currentEnergy,
                w.maxEnergy,
                w.baseDamage
            FROM 
                MatchWarriors mw
            JOIN 
                Warriors w ON mw.warriorID = w.warriorID
            JOIN 
                TypeOfWarriors t ON w.typeID = t.typeID
            JOIN 
                Breed b ON w.breedID = b.breedID
            JOIN
                Matches m ON mw.matchID = m.matchID
            WHERE 
                mw.matchID = currentMatchID AND mw.playerID = m.player1ID;
                
            -- Guerreros del jugador 2
            SELECT 
                'Guerreros del Jugador 2' AS Section;
                
            SELECT 
                w.warriorID,
                w.warriorName,
                t.typeName AS WarriorType,
                b.breedName AS WarriorBreed,
                mw.currentLife,
                w.maxLife,
                mw.currentEnergy,
                w.maxEnergy,
                w.baseDamage
            FROM 
                MatchWarriors mw
            JOIN 
                Warriors w ON mw.warriorID = w.warriorID
            JOIN 
                TypeOfWarriors t ON w.typeID = t.typeID
            JOIN 
                Breed b ON w.breedID = b.breedID
            JOIN
                Matches m ON mw.matchID = m.matchID
            WHERE 
                mw.matchID = currentMatchID AND mw.playerID = m.player2ID;
        END IF;
    END IF;
END //

DELIMITER ;

-- Ejemplos de uso:

-- 1. Un administrador crea una partida (usando el ID 1 del admin)
-- CALL CreateMatch(1);

-- 2. Jugador 1 se une a una partida con el PIN generado (suponiendo PIN = '123456')
-- CALL JoinMatch(2, '123456');

-- 3. Jugador 2 se une a la misma partida
-- CALL JoinMatch(3, '123456');

-- 4. Ver el estado completo de la partida
-- CALL GetMatchStatus('123456');

-- 5. Ver el tiempo restante de la partida
-- CALL GetMatchRemainingTime(1);