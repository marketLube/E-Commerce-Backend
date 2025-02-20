const { addLabel, getLabels } = require('../../controllers/labelController')
const autheticateToken = require('../../middlewares/authMiddleware')

const labelRouter = require('express').Router()


labelRouter.get("/getlabels", getLabels)
labelRouter.post("/addlabel", autheticateToken(["admin"]), addLabel)
// labelRouter.post("/addlabel", autheticateToken(["admin"]), addLabel)







module.exports = labelRouter