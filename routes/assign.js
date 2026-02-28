import { Router } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import { isLoggedIn, isAssign } from "../middleware/middleware.js";

const assignRoute = Router();

assignRoute.post("/", isLoggedIn, isAssign, async (req, res) => {
  const { ids, driverid } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ msg: "Array must not be empty" });
  }

  
  const existing = await pool.query(
      `SELECT orderid FROM depot WHERE orderid = ANY($1::int[])`,
      [ids],
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
      [decoded.empid, driverid, "ASSIGN"],
    );
    
  const deleted = await pool.query(
    "delete from depot where orderid = ANY($1::int[])",
    [existingIds],
  );
  const result = await pool.query(
    `
      INSERT INTO assigned (orderid, driverid, tid)
      SELECT UNNEST($1::int[]), $2::int, $3::int
      RETURNING *
      `,
    [existingIds, driverid, newtrans.rows[0].tid],
  );

  await pool.query(
  `
  INSERT INTO transaction_items (tid, orderid, actiontype)
  SELECT $1, UNNEST($2::int[]), 'ASSIGN'
  `,
  [newtrans.rows[0].tid, existingIds]
);

  return res.status(200).json({msg: "Orders Assigned Successfully",inserted: existingIds.length ,skipped: skippedIds})
});

export default assignRoute