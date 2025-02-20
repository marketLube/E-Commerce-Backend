const v1Router = require('./v1')

const apiRouter = require('express').Router()

apiRouter.use("/v1", v1Router)



module.exports = apiRouter