import { Router } from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";
import { isLoggedIn, isMerchant } from "../middleware/middleware.js";

const merchantRoute = Router();

merchantRoute.post("/login", async (req, res) => {
  const { pass, name } = req.body;
  const result = await pool.query(
    "select mername, merpassword from merchants where mername = $1",
    [name],
  );
  if (result.rowCount == 0) {
    return res.status(401).json({ msg: "Username and Password do not match" });
  } else if ((result.rowCount = 1)) {
    let respass = await pool.query(
      "select merpassword from merchants where mername = $1",
      [name],
    );
    const fpass = respass.rows[0].merpassword;
    const ppass = await bcrypt.compare(pass, fpass);
    if (ppass) {
      const token = jwt.sign(
        {
          merid: result.rows[0].merid,
        },
        process.env.SECRET_KEY,
        { expiresIn: "24h" },
      );
      return res.status(200).json({ msg: `Welcome ${name}`, token: token });
    } else {
      return res
        .status(401)
        .json({ msg: "Username and Password do not match" });
    }
  }
});

merchantRoute.get("/", isLoggedIn, isMerchant, async (req, res) => {
  const auth = req.headers.authorization;
  const decoded = jwt.verify(auth, process.env.SECRET_KEY);
  req.user = decoded;
  const result = await pool.query("select * from orders where merid = $1", [
    req.user.merid
  ]);

  res.status(200).json({result: result.rows})
});

merchantRoute.post("/neworder", isLoggedIn, isMerchant, async (req, res) => {
  const {orderid, cusname, cusphone, dcharge, ocharge, isexchange} = req.body;
  const auth = req.headers.authorization;
  const decoded = jwt.verify(auth, process.env.SECRET_KEY);
  req.user = decoded;
  const merchantid = "" + 9999 + req.user.merid;
  const resultInt = parseInt(merchantid, 10);
  const newtrans = await pool.query(
    "insert into transactions (empid, actiontype) values ($1, $2) returning *",
    [resultInt, "ENTERED"],
  );
  const result = await pool.query(
    "insert into orders (orderid, merid, cusname, cusphone, dcharge, ocharge, isexchange, tid) values ($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      orderid,
      req.user.merid,
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

export default merchantRoute