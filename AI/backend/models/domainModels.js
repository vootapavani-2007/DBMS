const { mongoose } = require("../mongo");

const schemaOptions = { versionKey: false, timestamps: false };

function registerModel(name, schema, collection) {
    schema.set("collection", collection);
    schema.set("strict", true);
    return mongoose.models[name] || mongoose.model(name, schema, collection);
}

const UserSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 100 },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "analyst", "viewer"], default: "viewer" },
    created_at: { type: Date, default: Date.now },
    last_login: { type: Date, default: null }
}, schemaOptions);

const NetworkTrafficSchema = new mongoose.Schema({
    traffic_id: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    source_ip: { type: String, required: true, maxlength: 45 },
    destination_ip: { type: String, required: true, maxlength: 45 },
    protocol: { type: String, required: true, maxlength: 20 },
    source_port: { type: Number, default: null },
    destination_port: { type: Number, default: null },
    data_size_bytes: { type: Number, default: 0 },
    packet_count: { type: Number, default: 1 },
    status: { type: String, enum: ["NORMAL", "SUSPICIOUS", "BLOCKED"], default: "NORMAL" }
}, schemaOptions);
NetworkTrafficSchema.index({ timestamp: -1 });
NetworkTrafficSchema.index({ status: 1, timestamp: -1 });

const IntrusionSchema = new mongoose.Schema({
    intrusion_id: { type: Number, required: true, unique: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    source_ip: { type: String, default: null, maxlength: 45 },
    destination_ip: { type: String, default: null, maxlength: 45 },
    attack_type: { type: String, required: true, maxlength: 100 },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true },
    confidence_score: { type: Number, default: null, min: 0, max: 100 },
    status: { type: String, enum: ["BLOCKED", "MONITORING", "RESOLVED", "INVESTIGATING"], default: "MONITORING" },
    detection_method: { type: String, default: "AI/ML Model", maxlength: 100 },
    source_dataset: { type: String, default: null },
    upload_id: { type: String, default: null },
    row_index: { type: Number, default: null },
    ground_truth_label: { type: String, default: null },
    description: { type: String, default: "" }
}, schemaOptions);
IntrusionSchema.index({ timestamp: -1 });
IntrusionSchema.index(
    { source_dataset: 1, upload_id: 1, row_index: 1 },
    { unique: true, partialFilterExpression: { source_dataset: { $exists: true } } }
);

const AiPredictionSchema = new mongoose.Schema({
    prediction_id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, default: null, index: true },
    source_ip: { type: String, default: null, maxlength: 45 },
    destination_ip: { type: String, default: null, maxlength: 45 },
    attack_type: { type: String, required: true, maxlength: 100 },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true },
    confidence_score: { type: Number, required: true, min: 0, max: 100 },
    model_version: { type: String, required: true, maxlength: 100 },
    source_dataset: { type: String, default: null },
    upload_id: { type: String, default: null },
    row_index: { type: Number, default: null },
    ground_truth_label: { type: String, default: null },
    feature_distance: { type: Number, default: null },
    raw_payload: { type: mongoose.Schema.Types.Mixed, default: null },
    created_at: { type: Date, default: Date.now, index: true }
}, schemaOptions);
AiPredictionSchema.index({ user_id: 1, created_at: -1 });
AiPredictionSchema.index(
    { source_dataset: 1, upload_id: 1, row_index: 1 },
    { unique: true, partialFilterExpression: { source_dataset: { $exists: true } } }
);

const ThreatIntelligenceSchema = new mongoose.Schema({
    threat_id: { type: Number, required: true, unique: true, index: true },
    ioc_type: { type: String, enum: ["IP", "DOMAIN", "HASH", "URL"], required: true },
    ioc_value: { type: String, required: true, maxlength: 255 },
    threat_type: { type: String, required: true, maxlength: 100 },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true },
    source: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: "" },
    first_seen: { type: Date, default: null },
    last_seen: { type: Date, default: null, index: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "BLOCKED"], default: "ACTIVE" }
}, schemaOptions);
ThreatIntelligenceSchema.index({ ioc_type: 1, ioc_value: 1 }, { unique: true });

const AlertSchema = new mongoose.Schema({
    alert_id: { type: Number, required: true, unique: true, index: true },
    intrusion_id: { type: Number, default: null, index: true },
    alert_message: { type: String, required: true, maxlength: 255 },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], required: true },
    status: { type: String, enum: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"], default: "ACTIVE", index: true },
    source_dataset: { type: String, default: null },
    upload_id: { type: String, default: null },
    row_index: { type: Number, default: null },
    created_at: { type: Date, default: Date.now, index: true },
    acknowledged_at: { type: Date, default: null },
    resolved_at: { type: Date, default: null }
}, schemaOptions);
AlertSchema.index(
    { source_dataset: 1, upload_id: 1, row_index: 1 },
    { unique: true, partialFilterExpression: { source_dataset: { $exists: true } } }
);

const ReportSchema = new mongoose.Schema({
    report_id: { type: Number, required: true, unique: true, index: true },
    report_name: { type: String, required: true, maxlength: 255 },
    report_type: { type: String, required: true, maxlength: 50 },
    generated_by: { type: Number, default: null, index: true },
    generated_at: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ["READY", "GENERATING", "FAILED"], default: "GENERATING" },
    file_path: { type: String, default: null, maxlength: 500 }
}, schemaOptions);

const SettingSchema = new mongoose.Schema({
    setting_id: { type: Number, required: true, unique: true, index: true },
    user_id: { type: Number, required: true, unique: true, index: true },
    two_factor_enabled: { type: Boolean, default: false },
    email_alerts: { type: Boolean, default: true },
    auto_block_ips: { type: Boolean, default: true },
    session_timeout: { type: Number, default: 30, min: 5, max: 480 }
}, schemaOptions);

const CounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    sequence: { type: Number, default: 0 }
}, { ...schemaOptions, collection: "counters", id: false });

module.exports = {
    User: registerModel("User", UserSchema, "users"),
    NetworkTraffic: registerModel("NetworkTraffic", NetworkTrafficSchema, "network_traffic"),
    Intrusion: registerModel("Intrusion", IntrusionSchema, "intrusions"),
    AiPrediction: registerModel("AiPrediction", AiPredictionSchema, "ai_predictions"),
    ThreatIntelligence: registerModel("ThreatIntelligence", ThreatIntelligenceSchema, "threat_intelligence"),
    Alert: registerModel("Alert", AlertSchema, "alerts"),
    Report: registerModel("Report", ReportSchema, "reports"),
    Setting: registerModel("Setting", SettingSchema, "settings"),
    Counter: registerModel("Counter", CounterSchema, "counters")
};

module.exports.nextId = async function nextId(counterName) {
    const counter = await module.exports.Counter.findOneAndUpdate(
        { _id: counterName },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return counter.sequence;
};
