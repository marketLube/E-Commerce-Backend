const cloudinary = require("../config/cloudinaryConfig")

// const uploadToCloudinary = (filePath) => {
//     return new Promise((resolve, reject) => {
//         cloudinary.uploader.upload(
//             filePath,
//             { folder: 'Northelux/Products' },
//             (error, result) => {
//                 if (error) return reject(error)
//                 resolve(result.secure_url)
//             }
//         )
//     })
// }

// module.exports = uploadToCloudinary

const { Readable } = require("stream");

const bufferToStream = (buffer) => {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null); // Signals the end of the stream
    return readable;
};




const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream({ folder: "products" }, (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
        });

        bufferToStream(buffer).pipe(stream); // Using built-in Node.js stream
    });
};

module.exports = uploadToCloudinary
