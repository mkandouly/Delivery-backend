import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

function isLoggedIn(req, res, next) {
  const auth = req.headers.authorization;
  const decoded = jwt.verify(auth, process.env.SECRET_KEY);
  req.user = decoded;
  if (decoded.exp < Date.now() / 1000) {
    res.send("You are not logged in");
  } else {
    next();
  }
}

function isAdmin(req, res, next) {
  if (req.user.role === 2 || req.user.role === 1) {
    next();
  } else {
    res.send("Insufficient permissions");
  }
}

function isDataEntry(req, res, next) {
  if (req.user.role === 3 || req.user.role === 1) {
    next();
  } else {
    res.send("Insufficient permissions");
  }
}

function isAssign(req, res, next) {
  if (req.user.role === 4 || req.user.role === 1) {
    next();
  } else {
    res.send("Insufficient permissions");
  }
}

function isDeliver(req, res, next) {
  if (req.user.role === 5 || req.user.role === 1) {
    next();
  } else {
    res.send("Insufficient permissions");
  }
}

function isCancel(req, res, next) {
  if (req.user.role === 6 || req.user.role === 1) {
    next();
  } else {
    res.send("Insufficient permissions");
  }
}

function isMerchant(req, res, next) {
  if (req.user.role === 7) {
    next();
  } else {
    res.send("Insufficient permissions");
  }
}

export { isLoggedIn, isAdmin, isDataEntry, isAssign, isDeliver, isCancel, isMerchant };
