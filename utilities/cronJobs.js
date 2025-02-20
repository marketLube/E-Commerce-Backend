// Schedule the job (runs every day at midnight)
const { CronJob } = require("cron");
const removeExpiredOffers = require("./services/cronJobServices");

const job = new CronJob("*/1 * * * *", () => {
    console.log("⏳ Checking for expired offers...");
    removeExpiredOffers();
});



job.start();