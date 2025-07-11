import PlayerAccountModel from '../models/playerAccount.model.js';
import { encryptPassword } from '../library/appBcrypt.js';
import dotenv from 'dotenv';
dotenv.config();

class PlayerAccountController {

  async register(req, res) {
    try {
      const { username, password, roleID } = req.body;
      // Basic validation
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      // Additional validation
      if (password.length < 8) {
        return res.status(400).json({
          error: 'The password must be at least 8 characters long.'
        });
      }
      // Verify if the Player already exists
      const existingPlayer = await PlayerAccountModel.findByName(username);
      if (existingPlayer) {
        return res.status(409).json({
          error: 'The username is already in use'
        });
      }
      const passwordHash = await encryptPassword(password);
      const newPlayer = await PlayerAccountModel.create({
        username,
        passwordHash,
        roleID: roleID || 2 // Default to Player (roleID 2) if not provided
      });
      
      res.status(201).json({
        message: 'Player account created successfully',
        id: newPlayer.id
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

}

export default new PlayerAccountController(); 