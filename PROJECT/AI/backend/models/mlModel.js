const { mongoose } = require("../mongo");

const MlModelSchema = new mongoose.Schema({
    model_version: {
        type: String,
        required: true,
        trim: true
    },
    dataset_name: {
        type: String,
        default: "unknown"
    },
    training_status: {
        type: String,
        default: "pending"
    },
    training_timestamp: {
        type: Date,
        default: Date.now
    },
    feature_configuration: {
        type: Object,
        default: {}
    },
    metrics: {
        type: Object,
        default: {}
    },
    artifact_location: {
        type: String,
        default: ""
    },
    created_by: {
        type: String,
        default: "local-trainer"
    }
}, {
    collection: "ml_models",
    timestamps: false
});

module.exports = mongoose.models.MlModel || mongoose.model("MlModel", MlModelSchema);
