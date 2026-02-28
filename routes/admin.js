import { Router } from "express";
import pool from "../db.js";
import { isLoggedIn, isAdmin } from "../middleware/middleware.js";
import bcrypt from "bcrypt";

const adminRoute = Router();

adminRoute.post("/newdriver", isLoggedIn, isAdmin, async (req, res) => {
  const { fname, lname, zone } = req.body;
  const result = await pool.query(
    "insert into drivers (driverfname, driverlname, driverzone) values ($1, $2, $3)",
    [fname, lname, zone],
  );

  res.status(201).json({ msg: "Driver created successfully" });
});

adminRoute.get("/drivers", isLoggedIn, isAdmin, async (req, res) => {
  const result = await pool.query("select * from drivers");
  res.status(200).json({ msg: "Request successful", result: result.rows });
});

adminRoute.delete("/deldriver/:d", isLoggedIn, isAdmin, async (req, res) => {
  const result = await pool.query("delete from drivers where driverid = $1", [
    req.params.d,
  ]);

  res.status(200).json({msg: "Driver deleted successfully"})
});

adminRoute.post("/newemp", isLoggedIn, isAdmin, async (req, res) => {
  const { fname, lname, user, pass, role } = req.body;
  const hashed = await bcrypt.hash(pass, 10);
  const timestamp = Date.now();
  const result = await pool.query(
    "insert into employees (empfname, emplname, empusername, emppassword, role, createdat) values ($1, $2, $3, $4, $5, $6)",
    [fname, lname, user, hashed, role, timestamp],
  );

  res.status(201).json({msg: "Employee created successfully"})
});

adminRoute.get("/emps", isLoggedIn, isAdmin, async (req, res) => {
  const result = await pool.query(
    "select empfname, emplname, empusername, role, createdat from employees",
  );
  res.status(200).json({ msg: "Request successful", result: result.rows });
});

adminRoute.delete("/delemp/:e", isLoggedIn, isAdmin, async (req, res) => {
  const result = await pool.query("delete from employees where empid = $1", [
    req.params.e,
  ]);

  res.status(200).json({msg: "Employee deleted successfully"})
});

adminRoute.post("/newmer", isLoggedIn, isAdmin, async (req, res) => {
  const { mername, merlocation, merpass} = req.body;
  const hashed = bcrypt.hash(merpass, 10)
  const result = await pool.query(
    "insert into merchants (mername, merlocation, merpassword, createdat) values ($1, $2, $3, $4)",
    [mername, merlocation, hashed, Date.now()],
  );

  res.status(200).json({msg: "Merchant created successfully"})
});

adminRoute.get("/mers", isLoggedIn, isAdmin, async (req, res) => {
  const result = await pool.query("select mername, merlocation from merchants");
  res.status(200).json({ msg: "Request successful", result: result.rows });
});

adminRoute.delete("/delmer/:m", isLoggedIn, isAdmin, async (req, res) => {
  const result = await pool.query("delete from merchants where merid = $1", [
    req.params.m,
  ]);

  res.status(200).json({msg: "Merchant deleted successfully"})
});

adminRoute.put("/driver/:id", isLoggedIn, isAdmin, async (req, res) => {
  const { fname, lname, zone } = req.body;
  const { id } = req.params;

  const sets = [];
  const values = [];
  let i = 1;

  if (fname !== undefined) { sets.push(`driverfname = $${i++}`); values.push(fname); }
  if (lname !== undefined) { sets.push(`driverlname = $${i++}`); values.push(lname); }
  if (zone !== undefined)  { sets.push(`driverzone = $${i++}`);  values.push(zone);  }

  if (sets.length === 0) {
    return res.status(400).json({ msg: "No fields provided to update" });
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE drivers SET ${sets.join(", ")} WHERE driverid = $${i} RETURNING *`,
    values
  );

  if (result.rowCount === 0) return res.status(404).json({ msg: "Driver not found" });

  res.status(200).json({ msg: "Driver updated successfully", result: result.rows[0] });
});

adminRoute.put("/mer/:id", isLoggedIn, isAdmin, async (req, res) => {
  const { mername, merlocation, merpass } = req.body;
  const { id } = req.params;

  const sets = [];
  const values = [];
  let i = 1;

  if (mername !== undefined)     { sets.push(`mername = $${i++}`);     values.push(mername); }
  if (merlocation !== undefined) { sets.push(`merlocation = $${i++}`); values.push(merlocation); }

  if (merpass !== undefined) {
    const hashed = await bcrypt.hash(pass, 10);
    sets.push(`merpassword = $${i++}`);
    values.push(hashed);
  }

  if (sets.length === 0) {
    return res.status(400).json({ msg: "No fields provided to update" });
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE merchants SET ${sets.join(", ")} WHERE merid = $${i} RETURNING *`,
    values
  );

  if (result.rowCount === 0) return res.status(404).json({ msg: "Merchant not found" });

  res.status(200).json({ msg: "Merchant updated successfully", result: result.rows[0] });
});

adminRoute.put("/emp/:id", isLoggedIn, isAdmin, async (req, res) => {
  const { fname, lname, user, pass, role } = req.body;
  const { id } = req.params;

  const sets = [];
  const values = [];
  let i = 1;

  if (fname !== undefined) { sets.push(`empfname = $${i++}`); values.push(fname); }
  if (lname !== undefined) { sets.push(`emplname = $${i++}`); values.push(lname); }
  if (user !== undefined)  { sets.push(`empusername = $${i++}`); values.push(user); }
  if (role !== undefined)  { sets.push(`role = $${i++}`); values.push(role); }

  if (pass !== undefined) {
    const hashed = await bcrypt.hash(pass, 10);
    sets.push(`emppassword = $${i++}`);
    values.push(hashed);
  }

  if (sets.length === 0) {
    return res.status(400).json({ msg: "No fields provided to update" });
  }

  values.push(id);

  const result = await pool.query(
    `UPDATE employees SET ${sets.join(", ")} WHERE empid = $${i} RETURNING empid, empfname, emplname, empusername, role, createdat`,
    values
  );

  if (result.rowCount === 0) return res.status(404).json({ msg: "Employee not found" });

  res.status(200).json({ msg: "Employee updated successfully", result: result.rows[0] });
});

adminRoute.put("/order/:id", isLoggedIn, isAdmin, async (req, res) => {
  const { id } = req.params;

  const {
    merid,
    cusname,
    cusphone,
    dcharge,
    ocharge,
    address,
    isexchange
  } = req.body;

  const sets = [];
  const values = [];
  let i = 1;

  if (merid !== undefined)      { sets.push(`merid = $${i++}`);      values.push(merid); }
  if (cusname !== undefined)    { sets.push(`cusname = $${i++}`);    values.push(cusname); }
  if (cusphone !== undefined)   { sets.push(`cusphone = $${i++}`);   values.push(cusphone); }
  if (dcharge !== undefined)    { sets.push(`dcharge = $${i++}`);    values.push(dcharge); }
  if (ocharge !== undefined)    { sets.push(`ocharge = $${i++}`);    values.push(ocharge); }
  if (address !== undefined)    { sets.push(`address = $${i++}`);    values.push(address); }
  if (isexchange !== undefined) { sets.push(`isexchange = $${i++}`); values.push(isexchange); }

  if (sets.length === 0) {
    return res.status(400).json({ msg: "No fields provided to update" });
  }

  values.push(id);

  // Update order
  const updated = await pool.query(
    `UPDATE orders SET ${sets.join(", ")} WHERE orderid = $${i} RETURNING *`,
    values
  );

  if (updated.rowCount === 0) {
    return res.status(404).json({ msg: "Order not found" });
  }

  // Return a richer row (with merchant name if exists)
  const full = await pool.query(
    `
    SELECT
      o.orderid, o.merid, m.mername,
      o.cusname, o.cusphone, o.dcharge, o.ocharge,
      o.address, o.isexchange, o.tid
    FROM orders o
    LEFT JOIN merchants m ON m.merid = o.merid
    WHERE o.orderid = $1
    `,
    [id]
  );

  res.status(200).json({ msg: "Order updated successfully", result: full.rows[0] });
});

export default adminRoute;
