import PlayerAccountModel from '../models/playerAccount.model.js';
import { comparePassword } from '../library/appBcrypt.js';
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
dotenv.config();

class AuthController {

  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const player = await PlayerAccountModel.findByName(username);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const isPasswordValid = await comparePassword(password, player.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      const token = jwt.sign(
        { id: player.playerID, username: player.username, role: player.roleID },
        process.env.JWT_SECRET,
        { expiresIn: "1h", algorithm: "HS256" }
      );

      res.status(200).json({
        message: 'Login successful',
        token: token
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default new AuthController(); 