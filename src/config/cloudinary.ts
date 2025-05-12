import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type cloudinaryOptions = {
    public_id: string;
    folder: string;
};

export const handleUpload = async (
    file: string,
    public_id: string,
    folder: string
) => {
    const res = await cloudinary.uploader.upload(file, {
        resource_type: "auto",
        public_id,
        overwrite: true,
        folder: folder || "",
    });
    return res;
};

export const handleUploadPicFromBuffer = async (
    picture: any,
    options: cloudinaryOptions
) => {
    const b64 = Buffer.from(picture.buffer).toString("base64");
    let dataURI = "data:" + picture.mimetype + ";base64," + b64;

    return await handleUpload(dataURI, options.public_id, options.folder);
};

export const handleUploadVideoFromBuffer = async (
    video: any,
    options: cloudinaryOptions
) => {
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
                        throw new Error(error as unknown as string);
                    }
                    return resolve(uploadResult);
                }
            )
            .end(video.buffer);
    });
};
