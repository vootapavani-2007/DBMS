const { mongoose } = require("../mongo");

const ProjectSourceFileSchema = new mongoose.Schema({
    relative_path: {
        type: String,
        required: true,
        trim: true
    },
    filename: {
        type: String,
        required: true,
        trim: true
    },
    language: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    content_hash: {
        type: String,
        required: true,
        trim: true
    },
    last_synced_at: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        default: "local-project"
    }
}, {
    collection: "project_source_files",
    timestamps: false
});

ProjectSourceFileSchema.index({ relative_path: 1 }, { unique: true });

module.exports = mongoose.models.ProjectSourceFile || mongoose.model("ProjectSourceFile", ProjectSourceFileSchema);
