import { Router } from "express";
import MatchController from '../controllers/match.controller.js';
import { verifyToken, hasRole } from '../middleware/authMiddleware.js';

const router = Router();

// Route for admins to create a match
router.post('/', verifyToken, hasRole('Admin'), MatchController.createMatch);

// Route for admins to get active matches
router.get('/active', verifyToken, hasRole('Admin'), MatchController.getActiveMatches);

// Route for players to join a match
router.post('/join', verifyToken, hasRole('Player', 'Admin'), MatchController.joinMatch);

// Route to get the history of finished matches
router.get('/history', verifyToken, MatchController.getMatchHistory);

// Route to get the status of a match by its PIN
router.get('/status/:pin', verifyToken, MatchController.getMatchStatus);

// Route to get remaining time by matchID
router.get('/time/:matchID', verifyToken, MatchController.getRemainingTime);

// Route to calculate and set the winner for a finished match
router.post('/:matchID/determine_winner', verifyToken, hasRole('Admin'), MatchController.determineWinner);

// Route for an admin to cancel/delete a match
router.delete('/:matchID', verifyToken, hasRole('Admin'), MatchController.cancelMatch);

export default router; 