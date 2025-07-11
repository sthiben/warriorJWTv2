import { Router } from "express";
import PlayerAccountController from '../controllers/playerAccount.controller.js';

const router = Router();
const name = '/player';

// Public route for player registration
router.post(`${name}/register`, PlayerAccountController.register);

export default router; 