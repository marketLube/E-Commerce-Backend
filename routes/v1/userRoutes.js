const { register, login, userLogOut } = require('../../controllers/userController')

const userRouter = require('express').Router()

userRouter.post('/register', register)
userRouter.post('/login', login)
userRouter.post('/logout', userLogOut)




module.exports = userRouter