const jwt = require("jsonwebtoken")
const maxAge = 3 * 24 * 60 * 60

const createToken = (id, role = "user") => {
    return jwt.sign({ id, role }, process.env.JWT_SECRETE, {
        expiresIn: maxAge
    })
}

module.exports =  createToken 