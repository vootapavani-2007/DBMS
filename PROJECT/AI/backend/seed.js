const bcrypt = require("bcryptjs");

const { mongoose, connectMongo } = require("./mongo");
const { User, Setting, nextId } = require("./models/domainModels");

async function seedDatabase() {
    try {
        await connectMongo();

        let admin = await User.findOne({ username: "admin" });
        if (!admin) {
            admin = await User.create({
                user_id: await nextId("user_id"),
                username: "admin",
                email: "admin@aisecurity.io",
                password_hash: await bcrypt.hash("admin123", 10),
                role: "admin"
            });
            console.log("MongoDB admin account created.");
        } else {
            console.log("MongoDB admin account already exists; credentials were not changed.");
        }

        if (!await Setting.exists({ user_id: admin.user_id })) {
            await Setting.create({ setting_id: await nextId("setting_id"), user_id: admin.user_id });
        }

        console.log("Seed complete. No traffic, intrusion, alert, or threat demo records were inserted.");
    } catch (error) {
        console.error("MongoDB seeding failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

seedDatabase();
