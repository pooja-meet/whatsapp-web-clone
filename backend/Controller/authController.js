const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
    try {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith("Bearer ")) {
            return res.status(401).json({ msg: "access denied no token provided." })
        }
        const token = auth.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        // req.user = { id: decoded.userId };
        req.user = { id: decoded.userId || decoded.id || decoded._id };
        next()
    } catch (error) {
        console.error("JWT verification error :", error.message)
        return res.status(403).json({ msg: "invalid or expired token" })
    }
}
module.exports = verifyToken;