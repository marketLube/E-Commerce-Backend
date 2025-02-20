const express = require('express')
const cookieParser = require('cookie-parser')
const apiRouter = require('./routes')
const connectDb = require('./config/dbConnection')
const globalErrorHandler = require('./utilities/errorHandlings/globalErrorHandler')
const AppError = require('./utilities/errorHandlings/appError')
require('dotenv').config()


const app = express()

//Database connection
connectDb()


//middlewares
app.use(cookieParser())
app.use(express.json())


//routes
app.use("/api", apiRouter)


app.all("*", (req, res, next) => {
    next(new AppError(`Cannot find the ${req.originalUrl} on the page !`, 404));
});

//error handling middleware
app.use(globalErrorHandler)



const port = process.env.PORT || 5000
app.listen(port, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log(`server starts on port ${port}`);

    }
})