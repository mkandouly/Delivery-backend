import { Router } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import { isLoggedIn } from "../middleware/middleware.js";

const checkRoute = Router();

checkRoute.get("/order", isLoggedIn, async (req, res) => {
  const result = await pool.query("select * from orders");
  res.status(200).json({ result: result.rows });
});

export default checkRoute;
