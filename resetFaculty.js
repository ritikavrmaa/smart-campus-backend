const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const hashedPassword = await bcrypt.hash(
      "Faculty@123",
      10
    );

    const user = await User.findOneAndUpdate(
      { email: "faculty@test.com" },
      {
        $set: {
          password: hashedPassword,
          role: "faculty",
        },
      },
      { new: true }
    );

    if (!user) {
      console.log("Faculty user not found");
    } else {
      console.log("Faculty password reset successfully");
      console.log("Email: faculty@test.com");
      console.log("Password: Faculty@123");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

resetPassword();