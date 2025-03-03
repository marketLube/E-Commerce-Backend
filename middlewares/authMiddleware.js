const jwt = require("jsonwebtoken");
const AppError = require("../utilities/errorHandlings/appError");

const autheticateToken = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Define token names for each role
      const roleTokenMap = {
        admin: "admin-auth-token",
        seller: "seller-auth-token",
        user: "user-auth-token",
      };

      let token = null;
      let userRole = null;

      // First check Authorization header for Bearer token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }

      // If no Bearer token, check cookies
      if (!token) {
        // Loop through allowed roles and find the correct token in cookies
        for (const role of allowedRoles) {
          if (req.cookies[roleTokenMap[role]]) {
            token = req.cookies[roleTokenMap[role]];
            userRole = role;
            break;
          }
        }
      }

      if (!token) {
        return next(new AppError("Authentication token not found", 401));
      }

      // Verify the token
      const verifiedToken = jwt.verify(token, process.env.JWT_SECRETE);
      if (!verifiedToken) {
        return next(new AppError("Invalid token", 401));
      }

      // Ensure the token role matches one of the allowed roles
      if (!allowedRoles.includes(verifiedToken.role)) {
        return next(
          new AppError("Access Denied: Insufficient permissions", 403)
        );
      }

      // Attach user info to request
      req.user = verifiedToken.id;
      req.role = verifiedToken.role;
      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return next(new AppError("Invalid token", 401));
      }
      if (error.name === "TokenExpiredError") {
        return next(new AppError("Token has expired", 401));
      }
      return next(new AppError(error.message, 500));
    }
  };
};

module.exports = autheticateToken;
