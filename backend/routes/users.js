const express = require("express");
const User = require("../models/User");
const { authenticate, isAdmin } = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const router = express.Router();
const jwt = require("jsonwebtoken");
// @route   POST /api/users
// @desc    Create a new user
// @access  Private/Admin
router.post("/", authenticate, isAdmin, async (req, res) => {
  //
  try {
    const { name, email, password, role, createdBy } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide name, email, and password" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || "user",
      isActive: true,
      createdBy,
    });

    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//@route POST /api/users/login
//@desc Login user
//@access Public
router.post("/login", async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    const { email, password } = req.body;
    console.log("email, password is", email, password);

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/users
// @desc    Get all users created By that Admin
// @access  Private/Admin
router.post("/list", authenticate, isAdmin, async (req, res) => {
  const { createdBy } = req.body;

  try {
    const users = await User.find({ createdBy }).sort({
      createdAt: -1,
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PATCH /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.patch("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { name, email, isActive } = req.body;

    // Find user
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deleting admin users
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot delete admin user" });
    }

    await user.remove();

    res.json({ message: "User removed" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PATCH /api/users/bulk-update
// @desc    Update all non-admin users
// @access  Private/Admin
router.patch("/bulk-update", authenticate, isAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res
        .status(400)
        .json({ message: "Please provide isActive status" });
    }

    // Update all non-admin users
    await User.updateMany({ role: { $ne: "admin" } }, { $set: { isActive } });

    res.json({ message: "Users updated successfully" });
  } catch (error) {
    console.error("Bulk update users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
