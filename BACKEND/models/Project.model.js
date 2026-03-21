import mongoose from "mongoose";
import crypto from "crypto";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      lowercase: true,
      unique: true,
      required: true,
      trim: true,
    },

    users: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    // Admin system — creator is admin by default; admins can remove members and delete project
    admins: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],

    inviteCode: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(10).toString("hex"),
    },

    sharedCode: {
      type: String,
      default: "// Start coding here...\n",
    },

    language: {
      type: String,
      enum: [
        "javascript","typescript","python","java",
        "cpp","c","go","rust","php","ruby",
        "swift","kotlin","bash","html","css",
        "json","sql","plaintext",
      ],
      default: "javascript",
    },

    lastRunOutput: { type: String, default: "" },
    lastRunAt:     { type: Date },

    messages: {
      type: [
        {
          sender:         { type: String, required: true },
          senderUsername: { type: String, default: "" },
          message:        { type: String, required: true },
          isAI:           { type: Boolean, default: false },
          timestamp:      { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const Project = mongoose.model("project", projectSchema);
export default Project;