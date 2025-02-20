// const multer = require("multer")


// const storage = multer.diskStorage({
//     filename: function (req, file, cb) {
//         cb(null, file.originalname)
//     }
// })

// const upload = multer({ storage: storage })

// module.exports = upload

const multer = require("multer");

const storage = multer.memoryStorage(); // Store files in memory (RAM)

const upload = multer({ storage });

module.exports = upload;

