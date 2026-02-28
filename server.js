import express from "express";
import pool from "./db.js";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import adminRoute from "./routes/admin.js";
import dataentryRoute from "./routes/dataentry.js";
import assignRoute from "./routes/assign.js";
import deliverRoute from "./routes/deliver.js";
import cancelRoute from "./routes/cancel.js";
import transferRoute from "./routes/transfer.js";
import checkRoute from "./routes/check.js";
import { isLoggedIn } from "./middleware/middleware.js";
import merchantRoute from "./routes/merchant.js";
dotenv.config();

const app = express();
app.use(express.json());

pool.query(
  "CREATE TABLE IF NOT EXISTS employees(empid serial primary key, empfname varchar not null, emplname varchar not null, empusername varchar not null, emppassword varchar not null, role int not null, createdat int not null)",
);

pool.query(
  "CREATE TABLE IF NOT EXISTS drivers(driverid serial primary key, driverfname varchar not null, driverlname varchar not null, driverzone varchar not null)",
);

pool.query(
  "CREATE TABLE IF NOT EXISTS merchants(merid serial primary key, mername varchar not null, merlocation varchar not null, merpassword varchar not null, createdat bigint not null)",
);

pool.query(
  "CREATE TABLE IF NOT EXISTS transactions(tid serial primary key, empid int not null references employees(empid), driverid int references drivers(driverid))",
);

pool.query(
  "CREATE TABLE IF NOT EXISTS orders(orderid int primary key, merid int references merchants(merid), cusname varchar, cusphone int not null, dcharge int, ocharge int, address varchar, isexchange boolean not null, tid int not null references transactions(tid))",
);

pool.query(
  "CREATE TABLE IF NOT EXISTS depot(orderid int references orders(orderid) on update cascade on delete cascade, tid int not null references transactions(tid))",
);

pool.query(
  "CREATE TABLE IF NOT EXISTS assigned(orderid int references orders(orderid) on update cascade on delete cascade, driverid int not null references drivers(driverid), tid int not null references transactions(tid))",
);

pool.query(
  "CREATE TABLE IF NOT EXISTS delivered(orderid int references orders(orderid) on update cascade on delete cascade, tid int not null references transactions(tid))",
);

pool.query(
  "CREATE TABLE IF NOT EXISTS cancelled(orderid int references orders(orderid) on update cascade on delete cascade, tid int not null references transactions(tid))",
);

app.use("/admin", adminRoute);
app.use("/dataentry", dataentryRoute);
app.use("/assign", assignRoute);
app.use("/deliver", deliverRoute);
app.use("/cancel", cancelRoute);
app.use("/transfer", transferRoute);
app.use("/check", checkRoute);
app.use("/merchant", merchantRoute);

app.post("/check", isLoggedIn, async (req, res) => {
  const { driverid, orderid, cusname, cusphone, mername, isexchange } =
  req.body;
  
  let query = `
  SELECT
  o.orderid,
  d.driverfname,
  d.driverlname,
  o.cusname,
  o.cusphone,
  o.dcharge,
  o.ocharge,
  o.address,
      m.mername,
      o.isexchange
    FROM orders o
    JOIN assigned a ON o.orderid = a.orderid
    LEFT JOIN merchants m ON o.merid = m.merid
    JOIN drivers d ON d.driverid = a.driverid
    WHERE 1=1
  `;

  const values = [];
  let i = 1;

  if (driverid) {
    query += ` AND a.driverid = $${i++}`;
    values.push(driverid);
  }

  if (orderid) {
    query += ` AND o.orderid = $${i++}`;
    values.push(orderid);
  }

  if (cusname) {
    query += ` AND o.cusname ILIKE $${i++}`;
    values.push(`%${cusname}%`);
  }

  if (cusphone) {
    query += ` AND o.cusphone = $${i++}`;
    values.push(cusphone);
  }

  if (mername) {
    query += ` AND m.mername ILIKE $${i++}`;
    values.push(`%${mername}%`);
  }

  if (isexchange !== undefined) {
    query += ` AND o.isexchange = $${i++}`;
    values.push(isexchange);
  }

  const result = await pool.query(query, values);

  res.status(200).json({ result: result.rows });
});

app.post("/login", async (req, res) => {
  const { pass, name } = req.body;
  const result = await pool.query(
    "select empid, empusername, role from employees where empusername = $1",
    [name],
  );
  if (result.rowCount == 0) {
    return res.status(401).json({ msg: "Username and Password do not match" });
  } else if ((result.rowCount = 1)) {
    let respass = await pool.query(
      "select emppassword from employees where empusername = $1",
      [name],
    );
    const fpass = respass.rows[0].emppassword;
    const ppass = await bcrypt.compare(pass, fpass);
    if (pass == fpass) {
      const token = jwt.sign(
        {
          empid: result.rows[0].empid,
          role: result.rows[0].role,
        },
        process.env.SECRET_KEY,
        { expiresIn: "2hr" },
      );
      return res.status(200).json({ msg: `Welcome ${name}`, token: token });
    } else {
      return res
        .status(401)
        .json({ msg: "Username and Password do not match" });
    }
  }
});

app.get("/transactions", isLoggedIn, async (req, res) => {
  const result = await pool.query(`
    SELECT
      t.tid,
      t.actiontype,
      e.empfname,
      e.emplname,
      d.driverfname,
      d.driverlname,
      o.orderid,
      o.cusname,
      o.cusphone,
      m.mername,
      o.isexchange
    FROM transactions t
    LEFT JOIN employees e ON e.empid = t.empid
    LEFT JOIN drivers d   ON d.driverid = t.driverid
    LEFT JOIN assigned a  ON a.tid = t.tid
    LEFT JOIN orders o    ON o.orderid = a.orderid OR o.tid = t.tid
    LEFT JOIN merchants m ON m.merid = o.merid
    ORDER BY t.tid DESC
  `);

  res.status(200).json({ result: result.rows });
});

app.get("/transaction/:tid", isLoggedIn, async (req, res) => {
  const { tid } = req.params;

  const result = await pool.query(
    `
    SELECT
      t.tid,
      t.actiontype,
      e.empfname,
      e.emplname,
      d.driverfname,
      d.driverlname,
      o.*
    FROM transactions t
    LEFT JOIN employees e ON e.empid = t.empid
    LEFT JOIN drivers d   ON d.driverid = t.driverid
    LEFT JOIN assigned a  ON a.tid = t.tid
    LEFT JOIN orders o    ON o.orderid = a.orderid OR o.tid = t.tid
    WHERE t.tid = $1
  `,
    [tid],
  );

  res.status(200).json({ result: result.rows });
});

app.get("/order-history/:id", isLoggedIn, async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `
    SELECT
      ti.orderid,
      ti.actiontype,
      ti.createdat,
      t.tid,
      e.empfname,
      e.emplname,
      d.driverfname,
      d.driverlname
    FROM transaction_items ti
    JOIN transactions t ON t.tid = ti.tid
    LEFT JOIN employees e ON e.empid = t.empid
    LEFT JOIN drivers d   ON d.driverid = t.driverid
    WHERE ti.orderid = $1
    ORDER BY ti.createdat ASC
  `,
    [id],
  );

  res.status(200).json({ history: result.rows });
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`),
);
