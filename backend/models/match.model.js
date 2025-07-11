import { connect } from '../config/db/connectMysql.js';

class MatchModel {

  static async create(adminID) {
    const [rows] = await connect.query('CALL CreateMatch(?)', [adminID]);
    return rows[0][0]; // Stored procedure returns an array within an array
  }

  static async join(playerID, pin) {
    const [rows] = await connect.query('CALL JoinMatch(?, ?)', [playerID, pin]);
    return rows[0][0];
  }

  static async getStatus(pin) {
    // Este SP devuelve múltiples resultados, hay que manejarlos.
    const [results] = await connect.query('CALL GetMatchStatus(?)', [pin]);
    
    if (!results || results.length === 0) {
      return null;
    }

    // El primer resultado es la información del combate
    const matchInfo = results[0][0];
    if (!matchInfo) {
      return { Status: 'Partida no encontrada' };
    }

    // El segundo y tercer resultado son los guerreros de cada jugador
    const player1Warriors = results.length > 1 ? results[1] : [];
    const player2Warriors = results.length > 2 ? results[2] : [];

    return {
      matchInfo,
      player1Warriors,
      player2Warriors
    };
  }

  static async checkAndUpdateStatus(pin) {
    await connect.query('CALL CheckAndUpdateMatchStatus(?)', [pin]);
    // This procedure doesn't return a value, it just performs an update.
    return;
  }

  static async getRemainingTime(matchID) {
    const [rows] = await connect.query('CALL GetRemainingTime(?)', [matchID]);
    return rows[0][0];
  }

  static async getMatchWarriors(matchID) {
    const [rows] = await connect.query('CALL GetMatchWarriors(?)', [matchID]);
    return rows[0];
  }

  static async determineWinner(matchID) {
    const [result] = await connect.query('CALL DetermineWinner(?)', [matchID]);
    return result;
  }

  static async cancel(matchID) {
    const [result] = await connect.query('CALL CancelMatch(?)', [matchID]);
    return result[0][0]; // SP returns a message
  }

  static async getMatchHistory() {
    const [rows] = await connect.query(`
      SELECT 
        m.matchID,
        m.matchStartTime,
        m.matchEndTime,
        w.username AS winnerName,
        p1.username AS player1Name,
        p2.username AS player2Name
      FROM Matches m
      LEFT JOIN PlayerAccount w ON m.winnerPlayerID = w.playerID
      JOIN PlayerAccount p1 ON m.player1ID = p1.playerID
      JOIN PlayerAccount p2 ON m.player2ID = p2.playerID
      WHERE m.matchStatus = 'Finished'
      ORDER BY m.matchEndTime DESC
    `);
    return rows;
  }

  static async getActiveMatches() {
    const [rows] = await connect.query(`
      SELECT 
        m.matchID,
        m.matchPIN,
        p1.username AS player1Name,
        p2.username AS player2Name,
        m.matchStatus
      FROM Matches m
      LEFT JOIN PlayerAccount p1 ON m.player1ID = p1.playerID
      LEFT JOIN PlayerAccount p2 ON m.player2ID = p2.playerID
      WHERE m.matchStatus IN ('Active', 'TimeOver', 'WaitingForPlayer2')
      ORDER BY m.matchStartTime DESC
    `);
    return rows;
  }
}

export default MatchModel; 