const AppError = require("../../utilities/errorHandlings/appError");
const catchAsync = require("../../utilities/errorHandlings/catchAsync");


const getAll = (Model) => {
    return catchAsync(async (req, res, next) => {

        const data = await Model.find();
        res.status(200).json({
            status: "Success",
            length: data.length,
            envelop: {
                data,
            },
        });
    });
};

const getOne = (Model, type = "id") => {
    return catchAsync(async (req, res, next) => {
        let data;

        switch (type) {
            case "id":
                const { id } = req.params;
                data = await Model.findById(id).select("-password");
                break;

            case "email":
                const { email } = req.params;
                data = await Model.findOne({ email }).select("-password");

            case "phone":
                const { phone } = req.params;
                data = await Model.findOne({ phone }).select("-password");

            default:
                console.log("its not going to happen...");
        }

        if (!data) return next(new AppError(`No data on this ${type}`, 404));

        res.status(200).json({
            status: "Success",
            message: "fetched successfully",
            envelop: {
                data,
            },
        });
    });
};

const createOne = (Model) => {
    return catchAsync(async (req, res, next) => {
        const createdData = await Model.create(req.body);
        res.status(200).json({
            status: "Success",
            message: "created successfully",
            envelop: {
                data: createdData,
            },
        });
    });
};


const saveOne = (Model, savedType) => {
    return catchAsync(async (req, res, next) => {
        const saved = await Model.save()
        res.status(200).json({
            status: "Success",
            message: `${saved} created successfully`,
            envelop: {
                data: createdData,
            },
        });
    })
}
const updateOne = (Model) => {
    return catchAsync(async (req, res, next) => {
        const { id } = req.params;

        const updation = req.body;
        const updatedData = await Model.findByIdAndUpdate(id, updation, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            status: "Success",
            message: "Successfully Updated",
            envelop: {
                data: updatedData,
            },
        });
    });
};

const deleteOne = (Model) => {
    return catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const doc = await Model.findByIdAndDelete(id);

        if (!doc) return next(new AppError("No document founded on this Id", 400));

        res.status(204).json({
            status: "Success",
            message: "Deleted Successfully",
        });
    });
};

module.exports = { getAll, getOne, createOne, updateOne, deleteOne, saveOne };