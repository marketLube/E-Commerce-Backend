const adminRouter = require('./adminRoutes')
const brandRouter = require('./brandRoutes')
const cartRouter = require('./cartRoutes')
const categoryRouter = require('./categoryRoutes')
const labelRouter = require('./labelRoutes')
const orderRouter = require('./orderRoutes')
const productRouter = require('./productRoutes')
const ratingRouter = require('./rateRoutes')
const sellerRouter = require('./sellerRoutes')
const userRouter = require('./userRoutes')

const v1Router = require('express').Router()




v1Router.use("/user", userRouter)
v1Router.use("/product", productRouter)
v1Router.use("/admin", adminRouter)
v1Router.use("/category", categoryRouter)
v1Router.use("/seller", sellerRouter)
v1Router.use("/cart", cartRouter)
v1Router.use("/label", labelRouter)
v1Router.use("/rating", ratingRouter)
v1Router.use("/order", orderRouter)
v1Router.use("/brand", brandRouter)


module.exports = v1Router