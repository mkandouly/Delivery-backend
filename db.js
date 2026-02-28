import dotenv from "dotenv";
import { Pool } from "pg";
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWD,
  database: process.env.DB_DB,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
});

export default pool;
