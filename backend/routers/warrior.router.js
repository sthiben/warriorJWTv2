import { Router } from "express";
import WarriorController from '../controllers/warrior.controller.js';
import { verifyToken, hasRole } from '../middleware/authMiddleware.js';

const router = Router();

// PUBLIC ROUTES FOR LOOKUPS
// Get all available warrior types
router.get('/types', WarriorController.getTypes);

// Get all available warrior breeds
router.get('/breeds', WarriorController.getBreeds);


// PLAYER-SPECIFIC ROUTES (require authentication)

// Get all available powers
router.get('/powers', verifyToken, hasRole('Player'), WarriorController.getAllPowers);

// Assign a power to a warrior
router.post('/:warriorID/powers', verifyToken, hasRole('Player'), WarriorController.assignPowerToWarrior);

// Get learned powers for a specific warrior
router.get('/:warriorID/powers', verifyToken, hasRole('Player'), WarriorController.getWarriorPowers);

// Create a new warrior for the logged-in player
router.post('/', verifyToken, hasRole('Player'), WarriorController.create);

// Get all warriors for the logged-in player
router.get('/', verifyToken, hasRole('Player'), WarriorController.getPlayerWarriors);

// Select or deselect a warrior for a match
router.post('/:warriorID/select', verifyToken, hasRole('Player'), WarriorController.selectWarrior);

// Delete a warrior
router.delete('/:warriorID', verifyToken, hasRole('Player'), WarriorController.deleteWarrior);


export default router; 