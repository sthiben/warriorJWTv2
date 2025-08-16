/**
 * Author:Diego Casallas
 * Date: 2025-05-19
 * Description: This is the main server file for the backend of the application.
*/
import app from './app/app.js';
import dotenv from 'dotenv';


dotenv.config();
const PORT = process.env.PORT || 3200; // Allow dynamic port configuration via environment variable

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
