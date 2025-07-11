import WarriorModel from '../models/warrior.model.js';

class WarriorController {

  async create(req, res) {
    try {
      const { name, typeID, breedID } = req.body;
      const ownerPlayerID = req.user.id; // From verifyToken middleware

      if (!name || !typeID || !breedID) {
        return res.status(400).json({ error: 'Name, typeID, and breedID are required' });
      }

      const newWarrior = await WarriorModel.create({ name, typeID, breedID, ownerPlayerID });
      res.status(201).json({ message: 'Warrior created successfully', warriorId: newWarrior.id });

    } catch (error) {
      console.error('Error creating warrior:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getPlayerWarriors(req, res) {
    try {
      const playerID = req.user.id;
      const warriors = await WarriorModel.findByPlayer(playerID);
      res.status(200).json(warriors);
    } catch (error) {
      console.error('Error getting player warriors:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async selectWarrior(req, res) {
    try {
      const { warriorID } = req.params;
      const playerID = req.user.id;

      const warrior = await WarriorModel.findById(warriorID);
      if (!warrior || warrior.ownerPlayerID !== playerID) {
        return res.status(404).json({ error: 'Warrior not found or you do not own this warrior' });
      }

      const result = await WarriorModel.selectForMatch(playerID, warriorID);

      if (result.success) {
        res.status(200).json({ message: result.message });
      } else {
        // Handle the case where the warrior limit is reached
        res.status(400).json({ error: result.message });
      }

    } catch (error) {
      console.error('Error selecting warrior:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getTypes(req, res) {
    try {
      const types = await WarriorModel.getTypes();
      res.status(200).json(types);
    } catch (error) {
      console.error('Error getting warrior types:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getBreeds(req, res) {
    try {
      const breeds = await WarriorModel.getBreeds();
      res.status(200).json(breeds);
    } catch (error) {
      console.error('Error getting warrior breeds:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getAllPowers(req, res) {
    try {
      const powers = await WarriorModel.getAllPowers();
      res.status(200).json(powers);
    } catch (error) {
      console.error('Error getting all powers:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async assignPowerToWarrior(req, res) {
    try {
      const { warriorID } = req.params;
      const { powerID } = req.body;

      // 1. Verificar el límite de poderes antes de intentar asignar
      const learnedPowers = await WarriorModel.getLearnedPowers(warriorID);

      if (learnedPowers.length >= 2) {
        return res.status(400).json({ error: 'Límite de 2 poderes alcanzado para este guerrero.' });
      }
      
      // 2. Comprobar si el guerrero ya conoce el poder
      if (learnedPowers.some(p => p.powerID === powerID)) {
          return res.status(400).json({ error: 'Este guerrero ya conoce este poder.' });
      }

      // 3. Si las validaciones pasan, asignar el poder
      const result = await WarriorModel.assignPower(warriorID, powerID);

      res.status(200).json(result);
    } catch (error) {
      console.error('Error assigning power to warrior:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async getWarriorPowers(req, res) {
    try {
      const { warriorID } = req.params;
      const powers = await WarriorModel.getLearnedPowers(warriorID);
      res.status(200).json(powers);
    } catch (error) {
      console.error('Error getting warrior powers:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async deleteWarrior(req, res) {
    try {
      const playerID = req.user.id;
      const { warriorID } = req.params;
      
      const result = await WarriorModel.delete(playerID, warriorID);

      if (result.status === 'error') {
        return res.status(400).json({ error: result.message });
      }

      res.status(200).json({ message: result.message });

    } catch (error) {
      console.error('Error deleting warrior:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

}

export default new WarriorController(); 