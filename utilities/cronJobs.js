// Schedule the job (runs every day at midnight)
const cron = require("cron");
const removeExpiredOffers = require("./services/cronJobServices");

// const job = new cron.CronJob("*/1 * * * *", () => {
//     console.log("⏳ CronJob Testing...");
// });
const job = new cron.CronJob("0 0 * * *", () => {
    console.log("⏳ Checking for expired offers...");
    removeExpiredOffers();
});



module.exports = job