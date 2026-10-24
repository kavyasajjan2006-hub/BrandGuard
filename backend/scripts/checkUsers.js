
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/User");

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected database:", mongoose.connection.name);

    const users = await User.find({})
      .select("name email createdAt")
      .lean();

    console.log("Number of registered users:", users.length);

    for (const user of users) {
      console.log({
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
