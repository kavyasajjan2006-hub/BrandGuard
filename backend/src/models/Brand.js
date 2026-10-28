
const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    industry: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    logoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Brand knowledge for compliance checking
    toneOfVoice: {
      type: String,
      trim: true,
      default: "",
    },

    brandGuidelines: {
      type: String,
      trim: true,
      default: "",
    },

    approvedFacts: {
      type: [String],
      default: [],
    },

    approvedTerminology: {
      type: [String],
      default: [],
    },

    prohibitedPhrases: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Brand", brandSchema);
