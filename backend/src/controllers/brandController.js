
const Brand = require("../models/Brand");

async function createBrand(req, res, next) {
  try {
    const { name, description, industry, website, logoUrl } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    if (name.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Brand name cannot exceed 150 characters",
      });
    }

    const optionalFields = [
      ["description", description, 2000],
      ["industry", industry, 100],
      ["website", website, 2048],
      ["logoUrl", logoUrl, 2048],
    ];

    for (const [field, value, maxLength] of optionalFields) {
      if (value !== undefined && typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string`,
        });
      }

      if (typeof value === "string" && value.length > maxLength) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot exceed ${maxLength} characters`,
        });
      }
    }

    const brand = await Brand.create({
      name: name.trim(),
      description:
        typeof description === "string" ? description.trim() : "",
      industry: typeof industry === "string" ? industry.trim() : "",
      website: typeof website === "string" ? website.trim() : "",
      logoUrl: typeof logoUrl === "string" ? logoUrl.trim() : "",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Brand created successfully",
      brand,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyBrands(req, res, next) {
  try {
    const brands = await Brand.find({
      createdBy: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: brands.length,
      brands,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBrand,
  getMyBrands,
};
