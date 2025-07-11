import { connect } from '../config/db/connectMysql.js';

class WarriorModel {

  static async create({ name, typeID, breedID, ownerPlayerID }) {
    
    // Base stats
    let maxLife = 80;
    let maxEnergy = 70;
    let baseDamage = 10;

    // Apply bonuses based on Type (typeID: 1=Guerrero, 2=Mago, 3=Arquero)
    switch (typeID) {
      case 1: // Guerrero
        maxLife += 30;
        baseDamage += 5;
        break;
      case 2: // Mago
        maxEnergy += 40;
        baseDamage -= 2;
        break;
      case 3: // Arquero
        baseDamage += 10;
        maxLife -= 10;
        break;
    }

    // Apply bonuses based on Breed (breedID: 1=Humano, 2=Elfo, 3=Orco)
    switch (breedID) {
      case 1: // Humano
        maxLife += 10;
        maxEnergy += 10;
        break;
      case 2: // Elfo
        maxEnergy += 20;
        break;
      case 3: // Orco
        maxLife += 20;
        baseDamage += 3;
        break;
    }

    const currentLife = maxLife;
    const currentEnergy = maxEnergy;

    const [result] = await connect.query(
      'INSERT INTO Warriors (warriorName, typeID, breedID, ownerPlayerID, maxLife, currentLife, maxEnergy, currentEnergy, baseDamage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, typeID, breedID, ownerPlayerID, maxLife, currentLife, maxEnergy, currentEnergy, baseDamage]
    );
    return { id: result.insertId };
  }

  static async findByPlayer(playerID) {
    const [rows] = await connect.query(
      `SELECT w.warriorID, w.warriorName, t.typeName, b.breedName, w.isSelected
       FROM Warriors w
       JOIN TypeOfWarriors t ON w.typeID = t.typeID
       JOIN Breed b ON w.breedID = b.breedID
       WHERE w.ownerPlayerID = ?`,
      [playerID]
    );
    return rows;
  }
  
  static async findById(warriorID) {
    const [rows] = await connect.query(
      'SELECT * FROM Warriors WHERE warriorID = ?',
      [warriorID]
    );
    return rows[0];
  }
  
  static async selectForMatch(playerID, warriorID) {
    const connection = await connect.getConnection();
    try {
      await connection.beginTransaction();

      // Check current selection status of the target warrior
      const [warriorRows] = await connection.query(
        'SELECT isSelected FROM Warriors WHERE warriorID = ? AND ownerPlayerID = ?',
        [warriorID, playerID]
      );

      if (warriorRows.length === 0) {
        throw new Error('Warrior not found or does not belong to the player.');
      }
      const isCurrentlySelected = warriorRows[0].isSelected;

      if (isCurrentlySelected) {
        // If already selected, deselect it
        await connection.query('UPDATE Warriors SET isSelected = FALSE WHERE warriorID = ?', [warriorID]);
        await connection.commit();
        return { success: true, message: 'Warrior deselected.' };
      } else {
        // If not selected, check the count of currently selected warriors
        const [countRows] = await connection.query(
          'SELECT COUNT(*) as selectedCount FROM Warriors WHERE ownerPlayerID = ? AND isSelected = TRUE',
          [playerID]
        );
        const selectedCount = countRows[0].selectedCount;

        if (selectedCount >= 2) {
          await connection.rollback(); // No changes needed, but good practice
          return { success: false, message: 'You can only select a maximum of 2 warriors.' };
        }

        // If less than 2, select the new one
        await connection.query('UPDATE Warriors SET isSelected = TRUE WHERE warriorID = ?', [warriorID]);
        await connection.commit();
        return { success: true, message: 'Warrior selected.' };
      }
    } catch (error) {
      await connection.rollback();
      console.error("Error in transaction, rolled back.", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getTypes() {
    const [rows] = await connect.query('SELECT typeID, typeName FROM TypeOfWarriors ORDER BY typeName');
    return rows;
  }

  static async getBreeds() {
    const [rows] = await connect.query('SELECT breedID, breedName FROM Breed ORDER BY breedName');
    return rows;
  }

  static async getAllPowers() {
    const [rows] = await connect.query('CALL GetAllPowers()');
    return rows[0]; 
  }

  static async assignPower(warriorID, powerID) {
    const [result] = await connect.query('CALL AssignWarriorPower(?, ?)', [warriorID, powerID]);
    return result[0][0]; 
  }

  static async getLearnedPowers(warriorID) {
    const [rows] = await connect.query('CALL GetWarriorLearnedPowers(?)', [warriorID]);
    return rows[0];
  }

  static async delete(playerID, warriorID) {
    const [result] = await connect.query('CALL DeleteWarrior(?, ?)', [playerID, warriorID]);
    return result[0][0]; // The SP returns a single row with status and message
  }
}

export default WarriorModel; 