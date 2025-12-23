import { Request } from "express";

const { BadRequestError } = require("../errors");

export const allowedPictureTypes = ["image/jpeg", "image/png", "image/gif"];
export const allowedVideoTypes = [
    "video/mp4",
    "video/mov",
    "video/avi",
    "video/mkv",
    "video/webm",
];
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export const checkSocketPics = (media: {
    buffer: Buffer;
    mimetype: string;
}) => {
    if (
        !allowedPictureTypes.includes(media.mimetype) &&
        !allowedVideoTypes.includes(media.mimetype)
    ) {
        throw new BadRequestError(
            "Invalid file type. Only images are allowed."
        );
    }
    const isPicture = allowedPictureTypes.includes(media.mimetype);
    const isVideo = allowedVideoTypes.includes(media.mimetype);
    if (
        (media && isPicture && media.buffer.length > MAX_PHOTO_SIZE) ||
        (media && isVideo && media.buffer.length > MAX_VIDEO_SIZE)
    ) {
        throw new BadRequestError(
            "File size exceeds the maximum allowed size."
        );
    }
    return true;
};

export const checkPicture = {
    fileFilter: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void
    ) => {
        if (!allowedPictureTypes.includes(file.mimetype)) {
            return cb(
                new BadRequestError(
                    "Invalid file type. Only images are allowed."
                ),
                false
            );
        } else if (file.size > MAX_PHOTO_SIZE) {
            return cb(
                new BadRequestError(
                    "File size exceeds the maximum allowed size of 5 MB."
                ),
                false
            );
        }

        return cb(null, true);
    },
};

export const checkStatus = {
    fileFilter: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void
    ) => {
        if (
            file &&
            !allowedPictureTypes.includes(file.mimetype) &&
            !allowedVideoTypes.includes(file.mimetype)
        ) {
            return cb(
                new BadRequestError(
                    "Invalid file type. Only images and videos are allowed."
                ),
                false
            );
        }

        const isPicture = allowedPictureTypes.includes(file.mimetype);
        const isVideo = allowedVideoTypes.includes(file.mimetype);

        if (
            (file && isPicture && file.size > MAX_PHOTO_SIZE) ||
            (file && isVideo && file.size > MAX_VIDEO_SIZE)
        ) {
            return cb(
                new BadRequestError(
                    "File size exceeds the maximum allowed size."
                ),
                false
            );
        }

        return cb(null, true);
    },
};
