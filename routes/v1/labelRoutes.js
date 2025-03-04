const {
  addLabel,
  getLabels,
  editLabel,
  searchLabel,
} = require("../../controllers/labelController");
const autheticateToken = require("../../middlewares/authMiddleware");

const labelRouter = require("express").Router();

labelRouter.get("/getlabels", getLabels);
labelRouter.post("/addlabel", autheticateToken(["admin"]), addLabel);
labelRouter.patch("/editlabel/:id", autheticateToken(["admin"]), editLabel);
labelRouter.get("/search", searchLabel);

module.exports = labelRouter;
