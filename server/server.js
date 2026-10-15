require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { connectToDatabase, getDb, closeDatabase } = require("./db");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Constants:
const PASS_CHAR_MIN = 8;
const USERNAME_LIMIT = 32;
// For projects
const PROJECT_NAME_LIMIT = 100;
const VALID_STATUSES = ["Planning", "Active", "Completed"];


app.use(cors());
app.use(express.json());

// Sign-up:
//  validate input, check username, hash password, then insert.
app.post("/api/signup", async (req, res) => {
  try {
    const { firstName, lastName, username, password } = req.body || {};

    // Check if all 
    if (![firstName, lastName, username, password].every(
      value => typeof value === "string" && value.trim().length > 0
    )) {
      return res.status(400).json({
        success: false,
        message: "Please complete all four signup fields."
      });
    }

    // trim user inputs
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanUsername = username.trim();

    // Password to small
    if (password.length < PASS_CHAR_MIN) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long."
      });
    }

    // Username to large
    if (cleanUsername.length > USERNAME_LIMIT) {
      return res.status(400).json({
        success: false,
        message: "Username must be 64 characters or fewer."
      });
    }

    const users = getDb().collection("users");
    const existingUser = await users.findOne({ username: cleanUsername });

    if (existingUser) {
      return res.status(409).json({
        message: "That username is already used."
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Make user object form inputs to be sent to database
    const newUser = {
      f_name: cleanFirst,
      l_name: cleanLast,
      username: cleanUsername,
      password: hashedPassword
    };

    // Insert user into users table
    const result = await users.insertOne(newUser);

    return res.status(201).json({
      message: "Account created successfully. You can now log in.",
      userId: result.insertedId
    });
  } catch (error) {
    // MongoDB's unique index(race condition)
    if (error && error.code === 11000) {
      return res.status(409).json({
        message: "That username is already taken. Please choose another."
      });
    }
    console.error("Signup error:", error);
    return res.status(500).json({
      message: "A server or database error occurred. Please try again."
    });
  }
});

// Login: find by username and compare the entered password to its hash.
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (![username, password].every(
      value => typeof value === "string" && value.trim().length > 0
    )) {
      return res.status(400).json({
        message: "Please enter both username and password."
      });
    }

    const user = await getDb().collection("users").findOne({
      username: username.trim()
    });

    // Use the same response for an unknown username and wrong password.
    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password."
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid username or password."
      });
    }

    return res.status(200).json({
      message: `Login successful. Welcome, ${user.f_name}!`
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "A server or database error occurred. Please try again."
    });
  }
});

// Create project: validate input, confirm the lead exists, then insert.
app.post("/api/projects", async (req, res) => {
  try {
    const { name, description, status, project_lead_id } = req.body || {};

    if (![name, description, status, project_lead_id].every(
      value => typeof value === "string" && value.trim().length > 0
    )) {
      return res.status(400).json({
        message: "Please complete all project fields."
      });
    }

    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const leadId = project_lead_id.trim();

    if (cleanName.length > PROJECT_NAME_LIMIT) {
      return res.status(400).json({
        message: `Project name must be ${PROJECT_NAME_LIMIT} characters or fewer.`
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Status must be Planning, Active, or Completed."
      });
    }

    const db = getDb();

    // Compare the string from the dropdown against each user's _id converted to a string.
    const lead = await db.collection("users").findOne({
      $expr: { $eq: [{ $toString: "$_id" }, leadId] }
    });

    if (!lead) {
      return res.status(400).json({
        message: "The selected project lead does not exist."
      });
    }

    const newProject = {
      name: cleanName,
      description: cleanDescription,
      status,
      project_lead_id: leadId,   // stored as a string
      created_at: new Date()
    };

    const result = await db.collection("projects").insertOne(newProject);

    return res.status(201).json({
      message: "Project created successfully.",
      projectId: result.insertedId
    });
  } catch (error) {
    console.error("Project creation error:", error);
    return res.status(500).json({
      message: "A server or database error occurred. Please try again."
    });
  }
});

// Get, to get users from database
app.get("/api/users", async (req, res) => {
  try {
    const usersCollection = getDb().collection("users");
    const allNames = await usersCollection.find({})
    .project({_id:1,f_name:1,l_name:1,username:1})
    .sort({l_name:1,f_name:1}).toArray();
    res.status(200).json(allNames);
  }catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Failed to retrieve active users",
    });
  }
});

// Get all projects, with the project lead's name attached.
app.get("/api/projects", async (req, res) => {
  try {
    const projects = await getDb().collection("projects").aggregate([
      {
        $lookup: {
          from: "users",
          let: { leadId: "$project_lead_id" },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$leadId"] } } },
            { $project: { f_name: 1, l_name: 1, username: 1 } }
          ],
          as: "lead"
        }
      },
      { $unwind: { path: "$lead", preserveNullAndEmptyArrays: true } },
      { $sort: { created_at: -1 } }
    ]).toArray();

    const result = projects.map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      status: p.status,
      created_at: p.created_at,
      lead_name: p.lead ? `${p.lead.f_name} ${p.lead.l_name}` : "Unknown",
      lead_username: p.lead ? p.lead.username : null
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({
      message: "Failed to retrieve projects."
    });
  }
});

async function startServer() {
  try {
    await connectToDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Express server listening at http://localhost:${PORT}`);
    });

    const shutdown = async () => {
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Could not start server:", error.message);
    process.exit(1);
  }
}

startServer();