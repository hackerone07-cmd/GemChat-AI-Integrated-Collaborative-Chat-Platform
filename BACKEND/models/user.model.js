import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minLength: [6, "Email must be at least 6 characters long"],
      maxLength: [50, "Email must be at most 50 characters long"],
    },

    // Display name — optional at register, changeable any time
    username: {
      type: String,
      trim: true,
      minLength: [2, "Username must be at least 2 characters"],
      maxLength: [30, "Username must be at most 30 characters"],
      default: "",
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password on save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.isValidPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Fallback display name: username or email prefix
userSchema.methods.displayName = function () {
  return this.username || this.email.split("@")[0];
};

// JWT carries _id + email + username — socket auth needs all three
userSchema.methods.generateJWT = function () {
  return jwt.sign(
    {
      _id:      this._id.toString(),
      email:    this.email,
      username: this.username || this.email.split("@")[0],
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

const User = mongoose.model("User", userSchema);
export default User;