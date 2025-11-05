const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // XAMPP default
  database: "food_delivery"
});

db.connect(err => {
  if (err) {
    console.log("❌ Database Connection Error:", err);
  } else {
    console.log("✅ Connected to MySQL Successfully");
  }
});

// ✅ User Signup
app.post("/signup", (req, res) => {
  const { name, phone, address, email, password } = req.body;
  const query = "INSERT INTO Users (name, phone, address, email, password) VALUES (?, ?, ?, ?, ?)";
  db.query(query, [name, phone, address, email, password], (err) => {
    if (err) return res.json({ success: false, message: "User already exists" });
    res.json({ success: true });
  });
});

// ✅ Login (User / Admin)
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM Users WHERE email=? AND password=?", [email, password], (err, result) => {
    if (result.length > 0) {
      res.json({ success: true, role: result[0].role, user_id: result[0].user_id });
    } else {
      res.json({ success: false });
    }
  });
});

// ✅ Get Restaurants
app.get("/restaurants", (req, res) => {
  db.query("SELECT * FROM Restaurant", (err, data) => res.json(data));
});

// ✅ Get Menu for Restaurant
app.get("/menu/:id", (req, res) => {
  db.query("SELECT * FROM Food_Item WHERE restaurant_id=?", [req.params.id], (err, data) => res.json(data));
});

// ✅ Add to Cart
app.post("/cart/add", (req, res) => {
  const { user_id, food_id, quantity } = req.body;

  const sql = `
    INSERT INTO Cart (user_id, food_id, quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + ?;
  `;

  db.query(sql, [user_id, food_id, quantity, quantity], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});

// ✅ Get Cart Items (IMPORTANT)
app.get("/cart/:user_id", (req, res) => {
  const user_id = req.params.user_id;

  const sql = `
    SELECT Cart.food_id, Food_Item.name, Food_Item.image_url, Food_Item.price, Cart.quantity
    FROM Cart
    JOIN Food_Item ON Cart.food_id = Food_Item.food_id
    WHERE Cart.user_id = ?;
  `;

  db.query(sql, [user_id], (err, result) => {
    if (err) return res.json({ success: false, error: err });
    res.json(result);
  });
});

// ✅ Place Order (Calls Stored Procedure)
app.post("/order/place", (req, res) => {
  const { user_id, address } = req.body;
  db.query("CALL Place_Order(?, ?)", [user_id, address], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});

// ✅ Get Latest Order Details (for Confirmation Page)
app.get("/order/latest/:user_id", (req, res) => {
  const user_id = req.params.user_id;

  const sql = `
    SELECT Orders.order_id, Orders.total_amount, Orders.delivery_address, Orders.order_time,
           Delivery_Agent.name AS agent_name, Delivery_Agent.phone AS agent_phone
    FROM Orders
    JOIN Delivery_Agent ON Orders.agent_id = Delivery_Agent.agent_id
    WHERE Orders.user_id = ?
    ORDER BY Orders.order_time DESC
    LIMIT 1;
  `;

  db.query(sql, [user_id], (err, result) => {
    if (err) return res.json({ success: false, error: err });
    res.json(result[0] || {});   // ✅ FIXED LINE
  });
});

/******************************
 *       ADMIN ROUTES
 ******************************/

// ✅ Add Restaurant
app.post("/restaurants/add", (req, res) => {
  const { name, description, image_url } = req.body;
  const sql = "INSERT INTO Restaurant (name, description, image_url) VALUES (?, ?, ?)";
  db.query(sql, [name, description, image_url], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});

// ✅ Delete Restaurant
app.delete("/restaurants/delete/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM Restaurant WHERE restaurant_id=?", [id], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});

// ✅ Add Food Item
app.post("/food/add", (req, res) => {
  const { restaurant_id, name, price, image_url } = req.body;
  const sql = "INSERT INTO Food_Item (restaurant_id, name, price, image_url) VALUES (?, ?, ?, ?)";
  db.query(sql, [restaurant_id, name, price, image_url], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});

// ✅ Delete Food Item
app.delete("/food/delete/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM Food_Item WHERE food_id=?", [id], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});

// ✅ Update Food Price
app.post("/food/updatePrice", (req, res) => {
  const { food_id, price } = req.body;
  db.query("UPDATE Food_Item SET price=? WHERE food_id=?", [price, food_id], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});


// ✅ Start Server
app.listen(3001, () => {
  console.log("🚀 Server running at http://localhost:3001/");
});
