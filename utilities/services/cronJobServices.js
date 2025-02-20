const categoryModel = require("../../model/categoryModel");


const removeExpiredOffers = async () => {
    try {
        const currentDate = new Date();
        await categoryModel.updateMany(
            { "offer.endDate": { $lt: currentDate } },
            { $set: { "offer.isActive": false } }
        );
        console.log("✅ Expired offers removed.");
    } catch (error) {
        console.error("❌ Error removing expired offers:", error);
    }
}

module.exports = removeExpiredOffers