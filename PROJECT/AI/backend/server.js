require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const { mongoose, connectMongo } = require("./mongo");
const { syncProjectSources } = require("./sync-project-source");
const { predictTrafficBatch } = require("./ml-model");
const CicTrafficRecord = require("./models/cicTrafficRecord");
const { User, NetworkTraffic, Intrusion, AiPrediction, ThreatIntelligence, Alert, Report, Setting, nextId } = require("./models/domainModels");

const app = express();
const reportsDirectory = path.join(__dirname, "reports");
fs.mkdirSync(reportsDirectory, { recursive: true });

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured in backend/.env");
}

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(express.json({ limit: "6mb" }));

async function ensureMongoConnection() {
    await connectMongo();
    console.log(`MongoDB connected: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
}

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));


// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

function authenticateToken(req, res, next) {

    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Please login."
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET,
        (error, user) => {

            if (error) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid or expired token."
                });
            }

            req.user = user;

            next();
        }
    );
}


// ============================================
// HOME
// ============================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "../frontend/login.html")
    );

});


// ============================================
// TEST DATABASE
// ============================================

app.get("/api/test-db", async (req, res) => {

    try {

        const result = await mongoose.connection.db.admin().ping();

        res.json({
            success: true,
            message: "MongoDB database connected successfully!",
            result: result.ok
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });

    }

});


// ============================================
// LOGIN
// ============================================

app.post("/api/login", async (req, res) => {

    try {

        const username = String(req.body.username || "").trim();
        const password = String(req.body.password || "");

        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });

        }

        const user = await User.findOne({ username }).select("+password_hash").lean();

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }

        user.last_login = new Date();
        await User.updateOne({ user_id: user.user_id }, { $set: { last_login: user.last_login } });

        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        res.json({

            success: true,

            message: "Login successful.",

            token: token,

            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role
            }

        });

    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error during login."
        });

    }

});

app.post("/api/register", async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        if (!/^[a-zA-Z0-9_]{3,50}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) {
            return res.status(400).json({ success: false, message: "Username, email, and a password of at least 8 characters are required." });
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = await nextId("user_id");
        await User.create({ user_id: userId, username, email, password_hash: passwordHash, role: "analyst" });
        await Setting.create({ setting_id: await nextId("setting_id"), user_id: userId });
        res.status(201).json({ success: true, message: "Account created. You can sign in now." });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "That username or email is already registered." });
        }
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: "Unable to create account." });
    }
});


// ============================================
// DASHBOARD STATISTICS
// ============================================

function trafficSummaryPipeline() {
    const cicNumber = feature => ({
        $convert: { input: `$features.${feature}`, to: "double", onError: 0, onNull: 0 }
    });

    return [
        {
            $addFields: {
                _summary_packets: {
                    $cond: [
                        { $eq: ["$source_dataset", CIC_DATASET_NAME] },
                        { $add: [cicNumber("total_fwd_packets"), cicNumber("total_backward_packets")] },
                        { $ifNull: ["$packet_count", 0] }
                    ]
                },
                _summary_bytes: {
                    $cond: [
                        { $eq: ["$source_dataset", CIC_DATASET_NAME] },
                        { $add: [cicNumber("total_length_of_fwd_packets"), cicNumber("total_length_of_bwd_packets")] },
                        { $ifNull: ["$data_size_bytes", 0] }
                    ]
                }
            }
        },
        {
            $group: {
                _id: null,
                records: { $sum: 1 },
                packets: { $sum: "$_summary_packets" },
                bytes: { $sum: "$_summary_bytes" }
            }
        }
    ];
}

app.get(
    "/api/dashboard/stats",
    authenticateToken,
    async (req, res) => {

        try {

            const [traffic, threats, blocked, alerts] = await Promise.all([
                NetworkTraffic.aggregate(trafficSummaryPipeline()),
                Intrusion.countDocuments(),
                Intrusion.countDocuments({ status: "BLOCKED" }),
                Alert.countDocuments({ status: "ACTIVE" })
            ]);

            res.json({
                success: true,
                data: {
                    totalTraffic: traffic[0]?.packets || 0,
                    threatsDetected: threats,
                    blockedAttacks: blocked,
                    activeAlerts: alerts
                }
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load dashboard statistics."
            });

        }

    }
);


// ============================================
// RECENT THREATS
// ============================================

app.get(
    "/api/dashboard/recent-threats",
    authenticateToken,
    async (req, res) => {

        try {

            const rows = await Intrusion.find({})
                .select("-_id attack_type source_ip severity")
                .sort({ timestamp: -1 })
                .limit(5)
                .lean();

            res.json({
                success: true,
                data: rows
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load recent threats."
            });

        }

    }
);


// ============================================
// INTRUSIONS
// ============================================

app.get(
    "/api/intrusions",
    authenticateToken,
    async (req, res) => {

        try {

            const search = String(req.query.search || "").trim().slice(0, 80);
            const severity = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(req.query.severity || "").toUpperCase())
                ? String(req.query.severity).toUpperCase() : "";
            const filters = {};
            if (search) {
                const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
                filters.$or = [{ source_ip: expression }, { destination_ip: expression }, { attack_type: expression }];
            }
            if (severity) filters.severity = severity;
            const rows = await Intrusion.find(filters)
                .select("-_id intrusion_id timestamp source_ip destination_ip attack_type severity confidence_score status detection_method description source_dataset upload_id row_index ground_truth_label")
                .sort({ timestamp: -1 })
                .limit(500)
                .lean();

            res.json({
                success: true,
                data: rows
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load intrusions."
            });

        }

    }
);


// ============================================
// NETWORK TRAFFIC
// ============================================

app.get(
    "/api/network-traffic",
    authenticateToken,
    async (req, res) => {

        try {

            const search = String(req.query.search || "").trim().slice(0, 80);
            const status = ["NORMAL", "SUSPICIOUS", "BLOCKED"].includes(String(req.query.status || "").toUpperCase())
                ? String(req.query.status).toUpperCase() : "";
            const sort = ["timestamp", "packet_count", "data_size_bytes", "source_ip"].includes(req.query.sort)
                ? req.query.sort : "timestamp";
            const direction = String(req.query.direction).toLowerCase() === "asc" ? "ASC" : "DESC";
            const filters = {};
            if (search) {
                const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
                filters.$or = [
                    { source_ip: expression },
                    { destination_ip: expression },
                    { protocol: expression },
                    { attack_type: expression },
                    { ground_truth_label: expression },
                    { source_dataset: expression }
                ];
            }
            if (status) filters.status = status;
            const cicNumber = feature => ({
                $convert: { input: `$features.${feature}`, to: "double", onError: 0, onNull: 0 }
            });
            const rows = await NetworkTraffic.aggregate([
                { $match: { source_ip: { $exists: true } } },
                {
                    $project: {
                        _id: 0,
                        traffic_id: 1,
                        timestamp: 1,
                        source_ip: 1,
                        destination_ip: 1,
                        protocol: 1,
                        source_port: 1,
                        destination_port: 1,
                        data_size_bytes: 1,
                        packet_count: 1,
                        status: 1,
                        source_dataset: { $literal: null },
                        row_index: { $literal: null },
                        ground_truth_label: { $literal: null },
                        attack_type: { $literal: null }
                    }
                },
                {
                    $unionWith: {
                        coll: "network_traffic",
                        pipeline: [
                            { $match: { source_dataset: CIC_DATASET_NAME } },
                            {
                                $addFields: {
                                    traffic_id: null,
                                    source_ip: null,
                                    destination_ip: null,
                                    protocol: "CIC flow",
                                    source_port: null,
                                    destination_port: cicNumber("destination_port"),
                                    packet_count: { $add: [cicNumber("total_fwd_packets"), cicNumber("total_backward_packets")] },
                                    data_size_bytes: { $add: [cicNumber("total_length_of_fwd_packets"), cicNumber("total_length_of_bwd_packets")] },
                                    status: { $cond: [{ $eq: ["$predicted_attack_category", "BENIGN"] }, "NORMAL", "SUSPICIOUS"] },
                                    attack_type: "$predicted_attack_category"
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    traffic_id: 1,
                                    timestamp: 1,
                                    source_ip: 1,
                                    destination_ip: 1,
                                    protocol: 1,
                                    source_port: 1,
                                    destination_port: 1,
                                    data_size_bytes: 1,
                                    packet_count: 1,
                                    status: 1,
                                    source_dataset: 1,
                                    row_index: 1,
                                    ground_truth_label: 1,
                                    attack_type: 1
                                }
                            }
                        ]
                    }
                },
                { $match: filters },
                { $sort: { [sort]: direction === "ASC" ? 1 : -1 } },
                { $limit: 500 }
            ]).allowDiskUse(true);

            res.json({
                success: true,
                data: rows
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load network traffic."
            });

        }

    }
);


// ============================================
// NETWORK TRAFFIC STATISTICS
// ============================================

app.get(
    "/api/network-traffic/stats",
    authenticateToken,
    async (req, res) => {

        try {

            const [total, inbound, outbound, connections] = await Promise.all([
                NetworkTraffic.aggregate(trafficSummaryPipeline()),
                NetworkTraffic.aggregate([
                    { $match: { source_ip: { $exists: true, $not: /^192\.0\.2\./ } } },
                    { $group: { _id: null, packets: { $sum: "$packet_count" } } }
                ]),
                NetworkTraffic.aggregate([
                    { $match: { source_ip: /^192\.0\.2\./ } },
                    { $group: { _id: null, packets: { $sum: "$packet_count" } } }
                ]),
                NetworkTraffic.countDocuments()
            ]);

            const bandwidth =
                Number(total[0]?.bytes || 0) * 8 / 1000000;

            res.json({

                success: true,

                data: {

                    inbound: inbound[0]?.packets || 0,

                    outbound: outbound[0]?.packets || 0,

                    bandwidth: bandwidth.toFixed(2),

                    openConnections: connections

                }

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load network statistics."
            });

        }

    }
);


// ============================================
// INTRUSION STATISTICS
// ============================================

app.get(
    "/api/intrusions/stats",
    authenticateToken,
    async (req, res) => {

        try {

            const [total, blocked, investigating] = await Promise.all([
                Intrusion.countDocuments(),
                Intrusion.countDocuments({ status: "BLOCKED" }),
                Intrusion.countDocuments({ status: "INVESTIGATING" })
            ]);

            res.json({

                success: true,

                data: {

                    total,

                    blocked,

                    investigating,

                    falsePositives: 0

                }

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load intrusion statistics."
            });

        }

    }
);


// ============================================
// THREAT INTELLIGENCE
// ============================================

app.get(
    "/api/threat-intelligence",
    authenticateToken,
    async (req, res) => {

        try {

            const search = String(req.query.search || "").trim().slice(0, 80);
            const severity = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(req.query.severity || "").toUpperCase())
                ? String(req.query.severity).toUpperCase() : "";
            const filters = {};
            if (search) {
                const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
                filters.$or = [{ ioc_value: expression }, { threat_type: expression }, { source: expression }];
            }
            if (severity) filters.severity = severity;
            const rows = await ThreatIntelligence.find(filters)
                .select("-_id threat_id ioc_type ioc_value threat_type severity source description first_seen last_seen status")
                .sort({ last_seen: -1 })
                .limit(500)
                .lean();

            res.json({
                success: true,
                data: rows
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load threat intelligence."
            });

        }

    }
);


// ============================================
// ALERTS
// ============================================

app.get(
    "/api/alerts",
    authenticateToken,
    async (req, res) => {

        try {
            const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
            const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 100);
            const [rows, total] = await Promise.all([
                Alert.find({})
                    .select("-_id alert_id intrusion_id alert_message severity status created_at")
                    .sort({ created_at: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .lean(),
                Alert.countDocuments()
            ]);

            res.json({
                success: true,
                data: rows,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load alerts."
            });

        }

    }
);


// ============================================
// ALERT STATISTICS
// ============================================

app.get(
    "/api/alerts/stats",
    authenticateToken,
    async (req, res) => {

        try {

            const [active, critical, acknowledged, resolved] = await Promise.all([
                Alert.countDocuments({ status: "ACTIVE" }),
                Alert.countDocuments({ severity: "CRITICAL" }),
                Alert.countDocuments({ status: "ACKNOWLEDGED" }),
                Alert.countDocuments({ status: "RESOLVED" })
            ]);

            res.json({

                success: true,

                data: {

                    active,

                    critical,

                    acknowledged,

                    resolved

                }

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load alert statistics."
            });

        }

    }
);


// ============================================
// REPORTS
// ============================================

app.get(
    "/api/reports",
    authenticateToken,
    async (req, res) => {

        try {

            const rows = await Report.find({})
                .select("-_id report_id report_name report_type generated_at status")
                .sort({ generated_at: -1 })
                .lean();

            res.json({
                success: true,
                data: rows
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load reports."
            });

        }

    }
);


// ============================================
// SETTINGS
// ============================================

app.get(
    "/api/settings",
    authenticateToken,
    async (req, res) => {

        try {

            const [user, settings] = await Promise.all([
                User.findOne({ user_id: req.user.user_id }).select("-_id username email").lean(),
                Setting.findOne({ user_id: req.user.user_id }).select("-_id two_factor_enabled email_alerts auto_block_ips session_timeout").lean()
            ]);

            if (!user || !settings) {

                return res.status(404).json({
                    success: false,
                    message: "Settings not found."
                });

            }

            res.json({
                success: true,
                data: { ...user, ...settings }
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                success: false,
                message: "Unable to load settings."
            });

        }

    }
);


// ============================================
// SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.patch("/api/alerts/:id/status", authenticateToken, async (req, res) => {
    try {
        const status = String(req.body.status || "").toUpperCase();
        if (!["ACKNOWLEDGED", "RESOLVED"].includes(status)) {
            return res.status(400).json({ success: false, message: "Status must be ACKNOWLEDGED or RESOLVED." });
        }
        const timestampField = status === "ACKNOWLEDGED" ? "acknowledged_at" : "resolved_at";
        const result = await Alert.updateOne(
            { alert_id: Number(req.params.id) },
            { $set: { status, [timestampField]: new Date() } }
        );
        if (!result.matchedCount) return res.status(404).json({ success: false, message: "Alert not found." });
        res.json({ success: true, message: `Alert ${status.toLowerCase()}.` });
    } catch (error) {
        console.error("Alert update error:", error);
        res.status(500).json({ success: false, message: "Unable to update alert." });
    }
});

app.post("/api/reports", authenticateToken, async (req, res) => {
    let reportId;
    try {
        const reportType = String(req.body.report_type || "Security").slice(0, 50);
        const name = String(req.body.report_name || `${reportType} Security Report`).slice(0, 255);
        reportId = await nextId("report_id");
        await Report.create({ report_id: reportId, report_name: name, report_type: reportType, generated_by: req.user.user_id, status: "GENERATING" });
        const [traffic, intrusions, alerts, recent] = await Promise.all([
            NetworkTraffic.aggregate(trafficSummaryPipeline()),
            Intrusion.aggregate([
                { $group: {
                    _id: null,
                    total: { $sum: 1 },
                    high_risk: { $sum: { $cond: [{ $in: ["$severity", ["HIGH", "CRITICAL"]] }, 1, 0] } },
                    average_confidence: { $avg: "$confidence_score" }
                } }
            ]),
            Alert.aggregate([
                { $group: { _id: null, total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } } } }
            ]),
            Intrusion.find({}).select("-_id attack_type severity confidence_score source_ip source_dataset row_index timestamp").sort({ timestamp: -1 }).limit(20).lean()
        ]);
        const report = {
            report_id: reportId,
            report_name: name,
            report_type: reportType,
            generated_at: new Date().toISOString(),
            summary: {
                traffic: traffic[0] || { records: 0, packets: 0, bytes: 0 },
                intrusions: intrusions[0] || { total: 0, high_risk: 0, average_confidence: null },
                alerts: alerts[0] || { total: 0, active: 0 }
            },
            recent_intrusions: recent
        };
        const filePath = path.join(reportsDirectory, `report-${reportId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf8");
        await Report.updateOne({ report_id: reportId }, { $set: { status: "READY", file_path: filePath } });
        res.status(201).json({ success: true, data: { report_id: reportId, report_name: name, report_type: reportType, status: "READY" } });
    } catch (error) {
        if (reportId) await Report.updateOne({ report_id: reportId }, { $set: { status: "FAILED" } });
        console.error("Report generation error:", error);
        res.status(500).json({ success: false, message: "Unable to generate report." });
    }
});

app.get("/api/reports/:id/download", authenticateToken, async (req, res) => {
    try {
        const report = await Report.findOne({ report_id: Number(req.params.id), generated_by: req.user.user_id }).select("report_name file_path").lean();
        if (!report || !report.file_path) return res.status(404).json({ success: false, message: "Report file not found." });
        const filePath = path.resolve(report.file_path);
        const reportRelativePath = path.relative(path.resolve(reportsDirectory), filePath);
        if (reportRelativePath.startsWith("..") || path.isAbsolute(reportRelativePath)) {
            return res.status(403).json({ success: false, message: "Invalid report path." });
        }
        res.download(filePath, `${report.report_name.replace(/[^a-z0-9-_]+/gi, "-")}.json`);
    } catch (error) {
        console.error("Report download error:", error);
        res.status(500).json({ success: false, message: "Unable to download report." });
    }
});

app.patch("/api/settings", authenticateToken, async (req, res) => {
    try {
        const { email, two_factor_enabled, email_alerts, auto_block_ips, session_timeout } = req.body;
        const timeout = Number(session_timeout);
        const normalizedEmail = String(email || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !Number.isInteger(timeout) || timeout < 5 || timeout > 480) {
            return res.status(400).json({ success: false, message: "Provide a valid email and a session timeout between 5 and 480 minutes." });
        }
        await User.updateOne({ user_id: req.user.user_id }, { $set: { email: normalizedEmail } });
        await Setting.findOneAndUpdate(
            { user_id: req.user.user_id },
            {
                $set: {
                    two_factor_enabled: Boolean(two_factor_enabled),
                    email_alerts: Boolean(email_alerts),
                    auto_block_ips: Boolean(auto_block_ips),
                    session_timeout: timeout
                },
                $setOnInsert: { setting_id: await nextId("setting_id"), user_id: req.user.user_id }
            },
            { upsert: true, new: true, runValidators: true }
        );
        res.json({ success: true, message: "Settings saved." });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: "That email is already in use." });
        console.error("Settings update error:", error);
        res.status(500).json({ success: false, message: "Unable to save settings." });
    }
});

function normalizeCsvHeader(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_|_$/g, "");
}

function parseCsvLine(line) {
    const values = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"' && line[index + 1] === '"' && quoted) {
            value += '"';
            index += 1;
        } else if (character === '"') {
            quoted = !quoted;
        } else if (character === "," && !quoted) {
            values.push(value.trim());
            value = "";
        } else {
            value += character;
        }
    }
    if (quoted) throw new Error("CSV contains an unterminated quoted field.");
    values.push(value.trim());
    return values;
}

function parseCsv(csv, { allowCicFlow = false } = {}) {
    const lines = String(csv || "").slice(0, 25 * 1024 * 1024).trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw new Error("CSV must contain a header and at least one record.");
    const headers = parseCsvLine(lines.shift()).map(normalizeCsvHeader);
    const hasIpFields = headers.includes("source_ip") && headers.includes("destination_ip");
    const hasCicFlowFields = headers.includes("flow_duration") && headers.includes("total_fwd_packets") && headers.includes("destination_port");
    if (!hasIpFields && !(allowCicFlow && hasCicFlowFields)) {
        throw new Error("CSV must include source_ip and destination_ip, or CIC flow fields such as Flow Duration, Total Fwd Packets, and Destination Port.");
    }
    return lines.slice(0, 1000).map(line => {
        const values = parseCsvLine(line);
        const row = headers.reduce((record, key, index) => ({ ...record, [key]: values[index] !== undefined ? values[index].trim() : "" }), {});
        if (hasIpFields && (!row.source_ip || !row.destination_ip)) throw new Error("CSV contains a row without source_ip or destination_ip.");
        return row;
    });
}

async function insertTrafficRows(rows) {
    const documents = await Promise.all(rows.map(async row => {
        const packets = Number(row.packet_count || row.packets || 1);
        const dataSize = Number(row.data_size_bytes || row.bytes || 0);
        if (!Number.isFinite(packets) || packets < 1 || !Number.isFinite(dataSize) || dataSize < 0) throw new Error("Traffic packet and byte values must be valid positive numbers.");
        return {
            traffic_id: await nextId("traffic_id"),
            timestamp: new Date(),
            source_ip: String(row.source_ip).slice(0, 45),
            destination_ip: String(row.destination_ip).slice(0, 45),
            protocol: String(row.protocol || "UNKNOWN").slice(0, 20),
            source_port: Number(row.source_port) || null,
            destination_port: Number(row.destination_port || row.dst_port) || null,
            data_size_bytes: dataSize,
            packet_count: packets,
            status: "NORMAL"
        };
    }));
    if (documents.length) await NetworkTraffic.insertMany(documents, { ordered: true });
}

async function savePrediction(row, prediction, userId) {
    const sourceIp = String(row.source_ip || row.src_ip || "0.0.0.0");
    const destinationIp = String(row.destination_ip || row.dst_ip || "0.0.0.0");
    await AiPrediction.create({
        prediction_id: await nextId("prediction_id"),
        user_id: userId,
        source_ip: sourceIp,
        destination_ip: destinationIp,
        attack_type: prediction.attack_type,
        severity: prediction.severity,
        confidence_score: prediction.confidence_score,
        model_version: prediction.model_version,
        feature_distance: prediction.distance ?? null,
        raw_payload: row
    });
    if (["Normal Traffic", "BENIGN"].includes(prediction.attack_type)) return;
    await Intrusion.create({
        intrusion_id: await nextId("intrusion_id"),
        source_ip: sourceIp,
        destination_ip: destinationIp,
        attack_type: prediction.attack_type,
        severity: prediction.severity,
        confidence_score: prediction.confidence_score,
        status: "INVESTIGATING",
        detection_method: prediction.model_version,
        description: `Model probability: ${prediction.confidence_score}%. Analyzed by user ${userId}.`
    });
}

const CIC_DATASET_NAME = "CIC-IDS2017 MachineLearningCSV";

async function persistCicPrediction({ row, prediction, userId, uploadId, rowIndex, features }) {
    const identity = { source_dataset: CIC_DATASET_NAME, upload_id: uploadId, row_index: rowIndex };
    const groundTruth = row.label ? String(row.label).trim() : null;
    const predictionDocument = await AiPrediction.findOneAndUpdate(
        identity,
        {
            $set: {
                user_id: userId,
                source_ip: null,
                destination_ip: null,
                attack_type: prediction.attack_type,
                severity: prediction.severity,
                confidence_score: Number(prediction.confidence_score),
                model_version: prediction.model_version,
                source_dataset: CIC_DATASET_NAME,
                upload_id: uploadId,
                row_index: rowIndex,
                ground_truth_label: groundTruth,
                raw_payload: features
            },
            $setOnInsert: {
                prediction_id: await nextId("prediction_id"),
                created_at: new Date()
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    if (prediction.attack_type === "BENIGN") {
        return { prediction_id: predictionDocument.prediction_id, intrusion_id: null, alert_id: null };
    }

    const intrusion = await Intrusion.findOneAndUpdate(
        identity,
        {
            $set: {
                attack_type: prediction.attack_type,
                severity: prediction.severity,
                confidence_score: Number(prediction.confidence_score),
                detection_method: prediction.model_version,
                source_dataset: CIC_DATASET_NAME,
                upload_id: uploadId,
                row_index: rowIndex,
                ground_truth_label: groundTruth,
                description: `Predicted ${prediction.attack_type} traffic in CIC-IDS2017 row ${rowIndex + 1}; no source or destination IP is present in this dataset.`
            },
            $setOnInsert: {
                intrusion_id: await nextId("intrusion_id"),
                source_ip: null,
                destination_ip: null,
                status: "INVESTIGATING",
                timestamp: new Date()
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    const alert = await Alert.findOneAndUpdate(
        identity,
        {
            $set: {
                intrusion_id: intrusion.intrusion_id,
                alert_message: `${prediction.attack_type} traffic predicted in CIC-IDS2017 upload row ${rowIndex + 1}.`,
                severity: prediction.severity,
                source_dataset: CIC_DATASET_NAME,
                upload_id: uploadId,
                row_index: rowIndex
            },
            $setOnInsert: {
                alert_id: await nextId("alert_id"),
                status: "ACTIVE",
                created_at: new Date()
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    return {
        prediction_id: predictionDocument.prediction_id,
        intrusion_id: intrusion.intrusion_id,
        alert_id: alert.alert_id
    };
}

app.post("/api/ai/analyze", authenticateToken, async (req, res) => {
    try {
        let rows = [];
        if (req.body && req.body.csv) {
            rows = parseCsv(req.body.csv, { allowCicFlow: true });
        } else if (req.body && Object.keys(req.body).length) {
            rows = Array.isArray(req.body.traffic) ? req.body.traffic.slice(0, 1000) : [req.body];
        } else {
            return res.status(400).json({ success: false, message: "Provide CSV text or one traffic record." });
        }

        const isCicFlow = rows.length > 0 && rows.every(row => row.flow_duration !== undefined && row.total_fwd_packets !== undefined && row.destination_port !== undefined);
        if (isCicFlow) {
            const predictions = predictTrafficBatch(rows);
            const uploadId = String(req.body.upload_id || crypto.createHash("sha256").update(req.body.csv || JSON.stringify(rows)).digest("hex"));
            const rowOffset = Math.max(0, Number(req.body.row_offset) || 0);
            const operations = rows.map((row, index) => {
                const features = Object.fromEntries(Object.entries(row).filter(([key]) => normalizeCsvHeader(key) !== "label"));
                const prediction = predictions[index];
                return {
                    updateOne: {
                        filter: { upload_id: uploadId, row_index: rowOffset + index },
                        update: {
                            $set: {
                                source_dataset: CIC_DATASET_NAME,
                                features,
                                ground_truth_label: row.label ? String(row.label).trim() : null,
                                predicted_attack_category: prediction.attack_type,
                                model_probability: Number(prediction.confidence_score) / 100,
                                model_version: prediction.model_version,
                                user_id: req.user.user_id
                            },
                            $setOnInsert: { timestamp: new Date() }
                        },
                        upsert: true
                    }
                };
            });
            await CicTrafficRecord.bulkWrite(operations, { ordered: false });
            const savedPredictions = await Promise.all(rows.map((row, index) => {
                const features = Object.fromEntries(Object.entries(row).filter(([key]) => normalizeCsvHeader(key) !== "label"));
                return persistCicPrediction({
                    row,
                    prediction: predictions[index],
                    userId: req.user.user_id,
                    uploadId,
                    rowIndex: rowOffset + index,
                    features
                });
            }));
            return res.json({
                success: true,
                data: {
                    analyzed: predictions.length,
                    threats: predictions.filter(item => item.attack_type !== "BENIGN").length,
                    predictions: rows.map((input, index) => ({
                        input,
                        prediction: { ...predictions[index], ...savedPredictions[index] }
                    }))
                }
            });
        }

        if (rows.some(row => !row.source_ip || !row.destination_ip)) {
            return res.status(400).json({ success: false, message: "Every traffic record must include source_ip and destination_ip." });
        }
        const batchPredictions = predictTrafficBatch(rows);
        await insertTrafficRows(rows);
        const predictions = rows.map((input, index) => ({ input, prediction: batchPredictions[index] }));
        for (const item of predictions) await savePrediction(item.input, item.prediction, req.user.user_id);
        res.json({ success: true, data: { analyzed: predictions.length, threats: predictions.filter(item => !["Normal Traffic", "BENIGN"].includes(item.prediction.attack_type)).length, predictions } });
    } catch (error) {
        if (error.message.includes("trained CIC-IDS2017 model") || error.message.includes("PYTHON_EXECUTABLE")) return res.status(503).json({ success: false, message: error.message });
        if (error.message.includes("CSV") || error.message.includes("traffic record")) return res.status(400).json({ success: false, message: error.message });
        console.error("AI analysis error:", error);
        res.status(500).json({ success: false, message: "Unable to analyze network traffic." });
    }
});

app.get("/api/cic-traffic", authenticateToken, async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
        const [data, total] = await Promise.all([
            CicTrafficRecord.find({ user_id: req.user.user_id }).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            CicTrafficRecord.countDocuments({ user_id: req.user.user_id })
        ]);
        return res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error("CIC traffic history error:", error);
        return res.status(500).json({ success: false, message: "Unable to load CIC traffic history from MongoDB." });
    }
});

app.get("/api/ai/predictions", authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
        const rows = await AiPrediction.find({ $or: [{ user_id: req.user.user_id }, { user_id: null }] })
            .select("-_id prediction_id user_id source_ip destination_ip attack_type severity confidence_score model_version source_dataset upload_id row_index ground_truth_label raw_payload created_at")
            .sort({ created_at: -1 })
            .limit(limit)
            .lean();
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error("Prediction history error:", error);
        res.status(500).json({ success: false, message: "Unable to load prediction history." });
    }
});

app.post("/api/source/sync", authenticateToken, async (req, res) => {
    try {
        const result = await syncProjectSources();
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error("Project source sync error:", error);
        return res.status(503).json({ success: false, message: error.message || "Unable to sync project source snapshots to MongoDB." });
    }
});

app.get("/api/source/files", authenticateToken, async (req, res) => {
    try {
        const ProjectSourceFile = require("./models/projectSourceFile");
        const sourceFiles = await ProjectSourceFile.find({}).sort({ relative_path: 1 }).lean();
        return res.json({ success: true, data: sourceFiles });
    } catch (error) {
        console.error("Project source listing error:", error);
        return res.status(503).json({ success: false, message: error.message || "Unable to list project source snapshots." });
    }
});

app.post("/api/network-traffic/upload", authenticateToken, async (req, res) => {
    try {
        const rows = parseCsv(req.body.csv);
        await insertTrafficRows(rows);
        res.status(201).json({ success: true, data: { imported: rows.length } });
    } catch (error) {
        if (error.message.includes("CSV") || error.message.includes("Traffic")) return res.status(400).json({ success: false, message: error.message });
        console.error("Traffic upload error:", error);
        res.status(500).json({ success: false, message: "Unable to import network traffic." });
    }
});

async function startServer() {
    await ensureMongoConnection();
    app.listen(PORT, () => console.log(`AI Security backend listening at http://localhost:${PORT}/`));
}

startServer().catch(error => {
    console.error("Unable to initialize AI prediction storage:", error.message);
    process.exitCode = 1;
});