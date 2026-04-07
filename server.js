const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});
const inquiryRateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.use(cors());

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || "unknown";
}

function isRateLimited(req) {
  const clientIp = getClientIp(req);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const requestTimes = inquiryRateLimitStore.get(clientIp) || [];
  const recentRequests = requestTimes.filter(function(timestamp) {
    return timestamp > windowStart;
  });

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    inquiryRateLimitStore.set(clientIp, recentRequests);
    return true;
  }

  recentRequests.push(now);
  inquiryRateLimitStore.set(clientIp, recentRequests);
  return false;
}

app.post("/api/consulting-mail", upload.single("attachFile"), async (req, res) => {
  try {
    if (isRateLimited(req)) {
      return res.status(429).json({ message: "짧은 시간에 문의를 여러 번 보낼 수 없습니다. 잠시 후 다시 시도해주세요." });
    }

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
      website,
      agreeService,
      agreePrivacy,
      agreeMarketing
    } = body;

    const phonePattern = /^(01[016789]-\d{3,4}-\d{4}|0[2-9]\d?-\d{3,4}-\d{4})$/;
    const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!inquiryType || !userName || !companyName || !phone || !email || !subject || !message) {
      return res.status(400).json({ message: "필수 입력값이 누락되었습니다." });
    }

    if (website) {
      return res.status(400).json({ message: "비정상적인 요청이 감지되었습니다." });
    }

    if (!phonePattern.test(phone)) {
      return res.status(400).json({ message: "연락처 형식이 올바르지 않습니다." });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "이메일 형식이 올바르지 않습니다." });
    }

    if (agreeService !== "Y" || agreePrivacy !== "Y") {
      return res.status(400).json({ message: "필수 약관 동의가 필요합니다." });
    }

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

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM || !process.env.MAIL_TO) {
      return res.status(500).json({ message: "메일 API 환경변수가 설정되지 않았습니다." });
    }

    const subjectPrefixMap = {
      "진단": "진단 문의",
      "교육": "교육 문의",
      "컨설팅": "컨설팅 문의",
      "AI 전략수립": "AI 전략수립 문의",
      "AI 사내 자격인증": "AI 사내 자격인증 문의",
      "AI 역량모델링": "AI 역량모델링 문의",
      "AI 교육과정개발": "AI 교육과정개발 문의",
      "AI 데이터 분석 및 모델개발": "AI 데이터 분석 및 모델개발 문의"
    };
    const mailSubjectPrefix = subjectPrefixMap[inquiryType] || "AI 컨설팅 문의";

    const resendPayload = {
      from: process.env.RESEND_FROM,
      to: [process.env.MAIL_TO],
      reply_to: email,
      subject: `[${mailSubjectPrefix}] ${subject}`,
      html: mailHtml,
      attachments: req.file
        ? [
            {
              filename: req.file.originalname,
              content: req.file.buffer.toString("base64")
            }
          ]
        : undefined
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(resendPayload)
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("mail send error:", errorText);
      return res.status(500).json({ message: "메일 API 전송에 실패했습니다." });
    }

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
