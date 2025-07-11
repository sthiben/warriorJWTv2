import { connect } from '../config/db/connectMysql.js';

class PlayerAccountModel {

  static async create({ username, passwordHash, roleID = 2 }) { // Default roleID 2 for 'Player'
    const [result] = await connect.query(
      'INSERT INTO PlayerAccount (username, passwordHash, roleID) VALUES (?, ?, ?)',
      [username, passwordHash, roleID]
    );
    return { id: result.insertId };
  }

  static async findById(id) {
    const [rows] = await connect.query(
      'SELECT * FROM PlayerAccount WHERE playerID = ?',
      [id]
    );
    return rows[0];
  }

  static async findByName(username) {
    const [rows] = await connect.query(
      'SELECT playerID, username, passwordHash, roleID FROM PlayerAccount WHERE username = ?',
      [username]
    );
    return rows[0];
  }

}

export default PlayerAccountModel; 