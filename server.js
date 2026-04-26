require("dotenv").config();


const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 5001;

const DATA = path.join(__dirname, "data");
const SENTENCES = path.join(DATA, "sentences.json");

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-this-secret-in-env",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 604800000 }
  })
);

app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err.message));

function read(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return fallback;
  }
}

function write(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function sentences() {
  return read(SENTENCES, []);
}

function saveSentences(x) {
  write(SENTENCES, x);
}

function pub(u) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    savedCount: (u.savedSentenceIds || []).length,
    practicedCount: u.practicedCount || 0,
    streak: u.streak || 0,
    lastPracticeDate: u.lastPracticeDate || null
  };
}

async function needUser(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Login required." });
  }

  const user = await User.findById(req.session.userId);
  if (!user) {
    req.session.userId = null;
    return res.status(401).json({ error: "Login required." });
  }

  req.user = user;
  next();
}

function needAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ error: "Admin login required." });
  }
  next();
}

function progress(u) {
  const today = new Date().toISOString().slice(0, 10);
  if (u.lastPracticeDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    u.streak = u.lastPracticeDate === yesterday ? (u.streak || 0) + 1 : 1;
    u.lastPracticeDate = today;
  }
  u.practicedCount = (u.practicedCount || 0) + 1;
}

app.get("/api/health", async (req, res) => {
  const userCount = await User.countDocuments();
  res.json({
    ok: true,
    sentences: sentences().length,
    users: userCount,
    db: mongoose.connection.readyState === 1 ? "connected" : "not connected"
  });
});

app.get("/api/categories", (req, res) => {
  const map = {};
  sentences().forEach((s) => {
    map[s.category] = (map[s.category] || 0) + 1;
  });
  res.json({
    categories: Object.entries(map).map(([value, count]) => ({ value, count }))
  });
});

app.get("/api/auth/me", async (req, res) => {
  let user = null;
  if (req.session.userId) {
    user = await User.findById(req.session.userId);
  }

  res.json({
    user: user ? pub(user) : null,
    admin: !!req.session.admin
  });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: passwordHash,
      savedSentenceIds: [],
      practicedCount: 0,
      streak: 0,
      lastPracticeDate: null
    });

    req.session.userId = String(user._id);
    res.json({ message: "Signup successful.", user: pub(user) });
  } catch (err) {
    res.status(500).json({ error: "Signup failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    req.session.userId = String(user._id);
    res.json({ message: "Login successful.", user: pub(user) });
  } catch (err) {
    res.status(500).json({ error: "Login failed." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out." }));
});

app.get("/api/sentences", (req, res) => {
  let list = sentences();
  const cat = String(req.query.category || "all");
  const level = String(req.query.level || "all");
  const q = String(req.query.q || "").toLowerCase().trim();
  const limit = Math.min(Number(req.query.limit) || 1200, 2000);

  if (cat !== "all") list = list.filter((x) => x.category === cat);
  if (level !== "all") list = list.filter((x) => x.level === level);
  if (q) list = list.filter((x) => x.text.toLowerCase().includes(q));

  res.json({ total: list.length, items: list.slice(0, limit) });
});

app.post("/api/practice/track", needUser, async (req, res) => {
  progress(req.user);
  await req.user.save();
  res.json({ message: "Practice tracked.", user: pub(req.user) });
});

app.get("/api/saved", needUser, (req, res) => {
  const ids = new Set(req.user.savedSentenceIds || []);
  res.json({ items: sentences().filter((s) => ids.has(s.id)) });
});

app.post("/api/saved/:id", needUser, async (req, res) => {
  const id = Number(req.params.id);

  if (!sentences().some((s) => s.id === id)) {
    return res.status(404).json({ error: "Sentence not found." });
  }

  req.user.savedSentenceIds = req.user.savedSentenceIds || [];
  if (!req.user.savedSentenceIds.includes(id)) {
    req.user.savedSentenceIds.push(id);
  }

  await req.user.save();
  res.json({ message: "Saved." });
});

app.delete("/api/saved/:id", needUser, async (req, res) => {
  const id = Number(req.params.id);
  req.user.savedSentenceIds = (req.user.savedSentenceIds || []).filter((x) => x !== id);
  await req.user.save();
  res.json({ message: "Removed." });
});

app.get("/api/profile", needUser, (req, res) => {
  const ids = new Set(req.user.savedSentenceIds || []);
  res.json({
    profile: {
      ...pub(req.user),
      saved: sentences().filter((s) => ids.has(s.id)).slice(0, 12)
    }
  });
});

app.post("/api/admin/login", (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    return res.status(500).json({ error: "Admin credentials are not configured in .env." });
  }

  if (req.body.username === adminUser && req.body.password === adminPass) {
    req.session.admin = true;
    return res.json({ message: "Admin login successful." });
  }

  res.status(400).json({ error: "Invalid admin credentials." });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.admin = false;
  res.json({ message: "Admin logged out." });
});

app.get("/api/admin/stats", needAdmin, async (req, res) => {
  const list = sentences();
  const userCount = await User.countDocuments();

  res.json({
    sentenceCount: list.length,
    userCount,
    categoryCount: [...new Set(list.map((x) => x.category))].length
  });
});

app.get("/api/admin/sentences", needAdmin, (req, res) => {
  let list = sentences();
  const q = String(req.query.q || "").toLowerCase().trim();
  const cat = String(req.query.category || "all");
  const level = String(req.query.level || "all");

  if (cat !== "all") list = list.filter((x) => x.category === cat);
  if (level !== "all") list = list.filter((x) => x.level === level);
  if (q) list = list.filter((x) => x.text.toLowerCase().includes(q));

  res.json({ items: list.slice(0, 300) });
});

app.post("/api/admin/sentences", needAdmin, (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "Sentence text required." });

  const list = sentences();
  const id = list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;
  const item = {
    id,
    text,
    category: String(req.body.category || "daily_routine"),
    level: String(req.body.level || "beginner"),
    tag: String(req.body.tag || "spoken")
  };

  list.unshift(item);
  saveSentences(list);
  res.json({ message: "Added.", item });
});

app.put("/api/admin/sentences/:id", needAdmin, (req, res) => {
  const id = Number(req.params.id);
  const list = sentences();
  const item = list.find((x) => x.id === id);

  if (!item) return res.status(404).json({ error: "Sentence not found." });

  item.text = String(req.body.text || item.text).trim();
  item.category = String(req.body.category || item.category);
  item.level = String(req.body.level || item.level);
  item.tag = String(req.body.tag || item.tag);

  saveSentences(list);
  res.json({ message: "Updated.", item });
});

app.delete("/api/admin/sentences/:id", needAdmin, (req, res) => {
  const id = Number(req.params.id);
  saveSentences(sentences().filter((x) => x.id !== id));
  res.json({ message: "Deleted." });
});

app.post("/api/admin/import", needAdmin, (req, res) => {
  const rows = Array.isArray(req.body.items) ? req.body.items : [];
  if (!rows.length) return res.status(400).json({ error: "No items provided." });

  const list = sentences();
  let id = list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;

  const cleaned = rows
    .map((r) => ({
      id: id++,
      text: String(r.text || r.sentence || "").trim(),
      category: String(r.category || "daily_routine"),
      level: String(r.level || "beginner"),
      tag: String(r.tag || "spoken")
    }))
    .filter((x) => x.text);

  saveSentences([...cleaned, ...list]);
  res.json({ message: `${cleaned.length} imported.` });
});

app.get("/admin-login", (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin");
  }
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.get("/admin", (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin-login");
  }
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

["/", "/practice", "/categories", "/saved", "/profile", "/login", "/signup"].forEach((route) => {
  const file = route === "/" ? "index.html" : route.slice(1) + ".html";
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, "public", file)));
});

app.listen(PORT, () => console.log(`EnglishFlow running on http://localhost:${PORT}`));
