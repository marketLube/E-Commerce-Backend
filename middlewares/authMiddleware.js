const jwt = require("jsonwebtoken");
const AppError = require("../utilities/errorHandlings/appError");

const autheticateToken = (allowedRoles) => {
    return (req, res, next) => {
        try {
            // Define token names for each role
            const roleTokenMap = {
                admin: "admin-auth-token",
                seller: "seller-auth-token",
                user: "user-auth-token"
            };

            let token = null;
            let userRole = null;

            // Loop through allowed roles and find the correct token
            for (const role of allowedRoles) {
                if (req.cookies[roleTokenMap[role]]) {
                    token = req.cookies[roleTokenMap[role]];
                    userRole = role;
                    break;
                }
            }

            if (!token) {
                return next(new AppError("JWT NOT FOUND", 401));
            }

            // Verify the token
            const verifiedToken = jwt.verify(token, process.env.JWT_SECRETE);
            if (!verifiedToken) {
                return next(new AppError("User not authorized", 401));
            }

            // Ensure the token role matches one of the allowed roles
            if (!allowedRoles.includes(verifiedToken.role)) {
                return next(new AppError("Access Denied", 403));
            }

            // Attach user info to request
            req.user = verifiedToken.id;
            req.role = verifiedToken.role;
            next();
        } catch (error) {
            return next(new AppError(error.message, 500));
        }
    };
};

module.exports = autheticateToken;
