const adminRoutes = require('./adminRoutes')
const cartRouter = require('./cartRoutes')
const categoryRouter = require('./categoryRoutes')
const labelRouter = require('./labelRoutes')
const productRouter = require('./productRoutes')
const sellerRouter = require('./sellerRoutes')
const userRouter = require('./userRoutes')

const v1Router = require('express').Router()




v1Router.use("/user", userRouter)
v1Router.use("/product", productRouter)
v1Router.use("/admin", adminRoutes)
v1Router.use("/category", categoryRouter)
v1Router.use("/seller", sellerRouter)
v1Router.use("/cart", cartRouter)
v1Router.use("/label", labelRouter)


module.exports = v1Router