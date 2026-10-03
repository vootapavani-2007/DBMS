const { mongoose } = require("../mongo");

const CicTrafficRecordSchema = new mongoose.Schema({
    upload_id: {
        type: String,
        required: true,
        index: true
    },
    row_index: {
        type: Number,
        required: true
    },
    source_dataset: {
        type: String,
        default: "CIC-IDS2017 MachineLearningCSV"
    },
    features: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    ground_truth_label: {
        type: String,
        default: null
    },
    predicted_attack_category: {
        type: String,
        required: true
    },
    model_probability: {
        type: Number,
        min: 0,
        max: 1,
        required: true
    },
    model_version: {
        type: String,
        required: true
    },
    user_id: {
        type: Number,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    collection: "network_traffic",
    timestamps: false
});

CicTrafficRecordSchema.index({ upload_id: 1, row_index: 1 }, { unique: true });
CicTrafficRecordSchema.index({ timestamp: -1 });

module.exports = mongoose.models.CicTrafficRecord || mongoose.model("CicTrafficRecord", CicTrafficRecordSchema);
