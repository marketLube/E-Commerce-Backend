const { addStore, editStore, getStoreDetails } = require('../../controllers/storeController')
const authRole = require('../../middlewares/authMiddleware')

const storeRouter = require('express').Router()

storeRouter.post("/addstore", authRole("admin"), addStore)
storeRouter.patch("/editstore", authRole("admin"), editStore)
storeRouter.get("/getstore-details", authRole("admin"), getStoreDetails)




module.exports = storeRouter