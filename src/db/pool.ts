import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err: Error) => {
  console.error("Unexpected DB error", err);
  process.exit(-1);
});

export default pool;
