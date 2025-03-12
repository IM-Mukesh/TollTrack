const express = require("express");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { authenticate, isAdmin } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/tickets
// @desc    Create a new ticket
// @access  Private
router.post("/", authenticate, async (req, res) => {
  try {
    const { vehicleNumber, amount } = req.body;

    // Validate input
    if (!vehicleNumber || !amount) {
      return res
        .status(400)
        .json({ message: "Please provide vehicle number and amount" });
    }

    // Create new ticket
    const ticket = new Ticket({
      vehicleNumber,
      amount,
      date: new Date(),
      email: req.user.email,
      adminEmail: req.user.createdBy,
    });

    await ticket.save();

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/tickets/my-tickets
// @desc    Get tickets created by current user
// @access  Private
router.get("/my-tickets", authenticate, async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id }).sort({
      date: -1,
    });

    res.json(tickets);
  } catch (error) {
    console.error("Get my tickets error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/tickets/collections
// @desc    Get ticket collections with filters
// @access  Private/Admin
// router.get("/collections", authenticate, isAdmin, async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     const { email } = req.body;

//     // Build filter
//     const filter = {};

//     if (startDate && endDate) {
//       filter.date = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate),
//       };
//     }

//     // if (userId) {
//     //   filter.user = req.;
//     // }

//     // Get tickets
//     // const tickets = await Ticket.find(filter)
//     //   .populate("user", "name email")
//     //   .sort({ date: -1 });

//     // res.json({ tickets });
//     res.json({})
//   } catch (error) {
//     console.error("Get collections error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.get("/collections", authenticate, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, userEmail } = req.query; // Change userId to userEmail
    // console.log("Received timestamps:", startDate, endDate, userEmail);

    // Build filter
    const filter = {};

    // Convert timestamps to Date objects
    if (startDate && endDate) {
      const start = new Date(Number(startDate)); // Convert timestamp to Date
      const end = new Date(Number(endDate));

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      // Set time to include the full day range
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      filter.date = { $gte: start, $lte: end };
    }

    let user = null;

    // If userEmail is provided, fetch the user
    if (userEmail) {
      user = await User.findOne({ email: userEmail }).select("_id");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      filter.user = user._id; // Use user's ID in the filter
    }
    console.log("filter is", filter);

    // Fetch tickets
    const tickets = await Ticket.find(filter);
    // .populate("user", "name email")
    // .sort({ date: -1 });

    res.json({ tickets });
  } catch (error) {
    console.error("Get collections error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/tickets/:id
// @desc    Get ticket by ID
// @access  Private
router.get("/:vehicleNumber", authenticate, async (req, res) => {
  try {
    // console.log("Received ticket number:", req.params.vehicleNumber, req.user);

    const ticket = await Ticket.findOne({
      vehicleNumber: req.params.vehicleNumber,
    });
    console.log("Ticket found:", ticket);

    if (!ticket) {
      console.log("returning...");

      return res.status(404).json({ message: "Ticket not found" });
    }
    console.log("after returning...");

    // Check if user is admin or ticket creator
    if (
      (req.user.role !== "admin" &&
        ticket.user._id.toString() !== req.user._id.toString()) ||
      req.user.email !== ticket.adminEmail
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this ticket" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
