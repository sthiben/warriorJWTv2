import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Middleware to verify the token
export const verifyToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) return res.status(401).json({ error: "Access denied, token required" });

  try {
    const token = authHeader.replace("Bearer ", "");
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // The decoded payload is attached to the request
    next();
  } catch (err) {
    res.status(400).json({ error: "Invalid or expired token" });
  }
};

// Middleware to check for specific roles
export const hasRole = (...roles) => {
  return (req, res, next) => {
    // verifyToken middleware must be used before this
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userRole = req.user.role; // Role is stored in the token
    
    // In our DB, 1=Admin, 2=Player. The SP for creating a match requires an Admin.
    // Let's assume the role names are 'Admin' and 'Player' for clarity.
    // The migration sets roleID, so we'll check against that.
    const roleMap = { 1: 'Admin', 2: 'Player' };
    const userRoleName = roleMap[userRole];

    if (!roles.includes(userRoleName)) {
      return res.status(403).json({ error: `Forbidden: You must have one of the following roles: ${roles.join(', ')}` });
    }

    next();
  };
};