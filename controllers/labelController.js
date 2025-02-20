const { getAll } = require("../helpers/handlerFactory/handlerFactory");
const LabelModel = require("../model/labelModel");

const addLabel = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: "Label name is required" });

        const existingLabel = await LabelModel.findOne({ name });
        if (existingLabel) return res.status(400).json({ message: "Label already exists" });

        const newLabel = new LabelModel({ name });
        await newLabel.save();

        res.status(201).json({ message: "Label created successfully", label: newLabel });
    } catch (error) {
        next(error);
    }
};


const getLabels = getAll(LabelModel)



module.exports = {
    addLabel,
    getLabels
};
