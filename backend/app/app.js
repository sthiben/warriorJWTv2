/**
 * Author:Diego Casallas
 * Date: 2025-05-27
 * Description: 
*/
import express from 'express';
import cors from 'cors';
/* The routers are imported to handle specific routes in the application.*/
import playerAccountRouter from '../routers/playerAccount.router.js';
import authRouter from '../routers/auth.router.js';
import matchRouter from '../routers/match.router.js';
import warriorRouter from '../routers/warrior.router.js';


const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prefix for all profile routes, facilitating scalability
app.use('/api_v1',playerAccountRouter);	
app.use('/api_v1',authRouter);	
app.use('/api_v1/matches',matchRouter);	
app.use('/api_v1/warriors',warriorRouter);

app.use((req, res, next) => {
  res.status(404).json({
    message: 'Endpoint not found'
  });
});

export default app;