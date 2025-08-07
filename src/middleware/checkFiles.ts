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
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export const checkPicture = {
    fileFilter: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void
    ) => {
        if (file.fieldname === "courseOverview") {
            if (!allowedVideoTypes.includes(file.mimetype)) {
                return cb(new Error("Only video files are allowed"), false);
            }
            if (file.size > MAX_VIDEO_SIZE) {
                return cb(
                    new Error("Video size must be less than 100MB"),
                    false
                );
            }
            return cb(null, true);
        }

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
