const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const handleUpload = async (file, public_id, folder) => {
    const res = await cloudinary.uploader.upload(file, {
        resource_type: "auto",
        public_id,
        overwrite: true,
        folder: folder || "",
    });
    return res;
};

const handleUploadPicFromBuffer = async (picture, options) => {
    const b64 = Buffer.from(picture.buffer).toString("base64");
    let dataURI = "data:" + picture.mimetype + ";base64," + b64;

    return await handleUpload(dataURI, options.public_id, options.folder);
};

const handleUploadVideoFromBuffer = async (video, options) => {
    return await new Promise((resolve) => {
        cloudinary.uploader
            .upload_stream(
                {
                    resource_type: "video",
                    public_id: options.public_id,
                    folder: options.folder,
                },
                (error, uploadResult) => {
                    if (error) {
                        throw new Error(error);
                    }
                    return resolve(uploadResult);
                }
            )
            .end(video.buffer);
    });
};
module.exports = {
    cloudinary,
    handleUpload,
    handleUploadPicFromBuffer,
    handleUploadVideoFromBuffer,
};
