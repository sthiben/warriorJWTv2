import MatchModel from '../models/match.model.js';

class MatchController {

  async createMatch(req, res) {
    try {
      // The admin's ID is extracted from the JWT payload by the verifyToken middleware
      const adminID = req.user.id;
      const result = await MatchModel.create(adminID);

      // The model returns the direct object from the SP.
      // The field name is 'GeneratedPIN' as defined in sp.sql.
      const pin = result.GeneratedPIN;

      if (!pin) {
        console.error("Backend Error: SP 'CreateMatch' did not return 'GeneratedPIN'. Response:", result);
        return res.status(500).json({ error: 'Could not retrieve PIN after creating match.' });
      }

      res.status(201).json({ message: 'Match created successfully', pin: pin });
    } catch (error) {
      console.error('Error creating match:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async joinMatch(req, res) {
    try {
      const { pin } = req.body;
      const playerID = req.user.id; // Player's ID from token

      if (!pin) {
        return res.status(400).json({ error: 'Match PIN is required' });
      }

      const result = await MatchModel.join(playerID, pin);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error joining match:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getMatchStatus(req, res) {
    try {
      const { pin } = req.params;
      if (!pin) {
        return res.status(400).json({ error: 'Match PIN is required' });
      }

      // First, check if the match time is over and update status if necessary
      await MatchModel.checkAndUpdateStatus(pin);

      // Then, get the (potentially updated) match status
      const result = await MatchModel.getStatus(pin);
      
      if (!result || result.Status === 'Partida no encontrada') {
        return res.status(404).json({ error: 'Partida no encontrada' });
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting match status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getRemainingTime(req, res) {
    try {
        const { matchID } = req.params;
        if (!matchID) {
            return res.status(400).json({ error: 'Match ID is required' });
        }
        const result = await MatchModel.getRemainingTime(matchID);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error getting remaining time:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async determineWinner(req, res) {
    try {
      const { matchID } = req.params;
      const result = await MatchModel.determineWinner(matchID);

      // El SP no devuelve un resultado directo, pero podemos confirmar la ejecución
      res.status(200).json({ message: 'Winner determination process initiated.', details: result });

    } catch (error) {
      console.error('Error determining winner:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async cancelMatch(req, res) {
    try {
      const { matchID } = req.params;
      const result = await MatchModel.cancel(matchID);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error cancelling match:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getMatchHistory(req, res) {
    try {
      const history = await MatchModel.getMatchHistory();
      res.status(200).json(history);
    } catch (error) {
      console.error('Error getting match history:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getActiveMatches(req, res) {
    try {
      const activeMatches = await MatchModel.getActiveMatches();
      res.status(200).json(activeMatches);
    } catch (error) {
      console.error('Error getting active matches:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

}

export default new MatchController(); 