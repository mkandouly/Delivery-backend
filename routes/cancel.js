import { Router } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import { isLoggedIn, isCancel } from "../middleware/middleware.js";

const cancelRoute = Router()

cancelRoute.post("/", isLoggedIn, isCancel, async (req, res) => {
  const { ids, driverid } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ msg: "Array must not be empty" });
  }

  const existing = await pool.query(
    `SELECT orderid FROM assigned WHERE orderid = ANY($1::int[]) AND driverid = $2`,
    [ids, driverid],
  );

  const existingIds = existing.rows.map((r) => r.orderid);
  const existingSet = new Set(existingIds);
  const skippedIds = ids.filter((id) => !existingSet.has(id));

  if (existingIds.length === 0) {
    return res.json({
      msg: "No matching order IDs were found in depot, nothing changed.",
      inserted: 0,
      skipped: skippedIds,
    });
  }

  const auth = req.headers.authorization;
  const decoded = jwt.verify(auth, process.env.SECRET_KEY);
  const newtrans = await pool.query(
    "insert into transactions (empid, driverid, actiontype) values ($1, $2, $3) returning tid",
    [decoded.empid, driverid, "CANCELLED"],
  );

  const deleted = await pool.query(
    "delete from assigned where orderid = ANY($1::int[])",
    [existingIds],
  );
  const result = await pool.query(
    `
      INSERT INTO cancelled (orderid, tid)
      SELECT UNNEST($1::int[]), $2::int
      RETURNING *
      `,
    [existingIds, newtrans.rows[0].tid],
  );

  await pool.query(
  `
  INSERT INTO transaction_items (tid, orderid, actiontype)
  SELECT $1, UNNEST($2::int[]), 'CANCELLED'
  `,
  [newtrans.rows[0].tid, ids]
);

  return res
    .status(200)
    .json({
      msg: "Request Completed Successfully",
      inserted: existingIds.length,
      skipped: skippedIds,
    });
});

export default cancelRoute