const { getAll } = require("../helpers/handlerFactory/handlerFactory");
const LabelModel = require("../model/labelModel");
const catchAsync = require("../utilities/errorHandlings/catchAsync");

const addLabel = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Label name is required" });

  const existingLabel = await LabelModel.findOne({ name });
  if (existingLabel)
    return res.status(400).json({ message: "Label already exists" });

  const newLabel = new LabelModel({ name });
  await newLabel.save();

  res
    .status(201)
    .json({ message: "Label created successfully", label: newLabel });
});

const getLabels = getAll(LabelModel);

const editLabel = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  const label = await LabelModel.findByIdAndUpdate(id, { name }, { new: true });
  res.status(200).json({ message: "Label updated successfully", label });
});

const searchLabel = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  const label = await LabelModel.find({ name: { $regex: q, $options: "i" } });
  res.status(200).json({ message: "Label found successfully", label });
});

module.exports = {
  addLabel,
  getLabels,
  editLabel,
  searchLabel,
};
