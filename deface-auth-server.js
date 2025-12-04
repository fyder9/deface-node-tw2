require("dotenv").config();
const express = require("express");
const config = require("./config");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const port = 4000;