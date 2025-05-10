import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendEmail = async (
    to: string,
    subj: string,
    text: string,
    html: string
) => {
    if (!to || !subj || !text) return;
    const info = await transporter.sendMail({
        from: "Chat App <" + process.env.EMAIL_USER + ">",
        to: to,
        subject: subj,
        text: text,
        html: html || text,
    });

    console.log("Message sent: %s", info.messageId);
};

export const getEmailHtml = (verificationCode: number) => {
    const templatePath = path.join(
        __dirname,
        "../public/verify-email-template.html"
    );
    let html = fs.readFileSync(templatePath, "utf-8");

    // Split the verification code into individual digits
    const digits = verificationCode.toString().split("");
    digits.forEach((digit, index) => {
        html = html.replace(`{{vc${index}}}`, digit);
    });

    return html;
};
