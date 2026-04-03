const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.post("/api/consulting-mail", upload.single("attachFile"), async (req, res) => {
  try {
    const body = req.body || {};
    const {
      inquiryType,
      userName,
      companyName,
      phone,
      email,
      replyMailAgree,
      department,
      position,
      subject,
      message,
      agreeService,
      agreePrivacy,
      agreeMarketing
    } = body;

    if (!inquiryType || !userName || !companyName || !phone || !email || !subject || !message) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }

    if (agreeService !== "Y" || agreePrivacy !== "Y") {
      return res.status(400).json({ message: "필수 약관 동의가 필요합니다." });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailHtml = `
      <div style="font-family:Pretendard,Noto Sans KR,sans-serif;line-height:1.7;color:#111;">
        <h2 style="margin:0 0 20px;">AI 컨설팅 문의 접수</h2>
        <table style="width:100%;border-collapse:collapse;border-top:2px solid #3868f4;">
          <tr><th style="width:180px;padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">문의구분</th><td style="padding:12px;border-bottom:1px solid #ddd;">${inquiryType}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">이름</th><td style="padding:12px;border-bottom:1px solid #ddd;">${userName}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">회사(소속)</th><td style="padding:12px;border-bottom:1px solid #ddd;">${companyName}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">연락처</th><td style="padding:12px;border-bottom:1px solid #ddd;">${phone}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">이메일</th><td style="padding:12px;border-bottom:1px solid #ddd;">${email}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">메일 답변 수신</th><td style="padding:12px;border-bottom:1px solid #ddd;">${replyMailAgree === "Y" ? "동의" : "미동의"}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">부서</th><td style="padding:12px;border-bottom:1px solid #ddd;">${department || "-"}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">직급</th><td style="padding:12px;border-bottom:1px solid #ddd;">${position || "-"}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">문의제목</th><td style="padding:12px;border-bottom:1px solid #ddd;">${subject}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">문의내용</th><td style="padding:12px;border-bottom:1px solid #ddd;white-space:pre-line;">${message}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">서비스 약관</th><td style="padding:12px;border-bottom:1px solid #ddd;">${agreeService === "Y" ? "동의" : "미동의"}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">개인정보 약관</th><td style="padding:12px;border-bottom:1px solid #ddd;">${agreePrivacy === "Y" ? "동의" : "미동의"}</td></tr>
          <tr><th style="padding:12px;border-bottom:1px solid #ddd;background:#f6f8fc;text-align:left;">마케팅 수신</th><td style="padding:12px;border-bottom:1px solid #ddd;">${agreeMarketing === "Y" ? "동의" : "미동의"}</td></tr>
        </table>
      </div>
    `;

    await transporter.sendMail({
      from: `"AI 컨설팅 문의" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO,
      replyTo: email,
      subject: `[AI 컨설팅 문의] ${subject}`,
      html: mailHtml,
      attachments: req.file
        ? [
            {
              filename: req.file.originalname,
              content: req.file.buffer
            }
          ]
        : []
    });

    return res.status(200).json({ message: "문의가 정상적으로 접수되었습니다." });
  } catch (error) {
    console.error("mail send error:", error);
    return res.status(500).json({ message: "메일 전송에 실패했습니다." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
