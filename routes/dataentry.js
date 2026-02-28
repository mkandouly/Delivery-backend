import { Router } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import { isLoggedIn, isDataEntry } from "../middleware/middleware.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

const dataentryRoute = Router();

dataentryRoute.get("/mers", isLoggedIn, isDataEntry, async (req, res) => {
  const result = await pool.query("select mername, merlocation from merchants");
  res.status(200).json({ msg: "Request successful", result: result.rows });
});

dataentryRoute.post("/neworder", isLoggedIn, isDataEntry, async (req, res) => {
  const {orderid, merid, cusname, cusphone, dcharge, ocharge, isexchange} = req.body;
  const auth = req.headers.authorization;
  const decoded = jwt.verify(auth, process.env.SECRET_KEY);
  const newtrans = await pool.query(
    "insert into transactions (empid, actiontype) values ($1, $2) returning *",
    [decoded.empid, "ENTERED"],
  );
  const result = await pool.query(
    "insert into orders (orderid, merid, cusname, cusphone, dcharge, ocharge, isexchange, tid) values ($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      orderid,
      merid,
      cusname,
      cusphone,
      dcharge,
      ocharge,
      isexchange,
      newtrans.rows[0].tid,
    ],
  );
  await pool.query("insert into depot (orderid, tid) values ($1,$2)", [
    orderid,
    newtrans.rows[0].tid,
  ]);

  res.status(201).json({ msg: "Order added successfully" });
});

dataentryRoute.put("/order/:id", isLoggedIn, isDataEntry, async (req, res) => {
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

export default dataentryRoute;
