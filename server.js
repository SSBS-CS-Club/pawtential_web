// 在 server.js 中添加 CSP 头部
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

// 允许跨域
app.use(cors());

// 设置 CSP 策略
app.use((req, res, next) => {
  // 放宽CSP配置：允许来自localhost:3000的连接
  res.setHeader("Content-Security-Policy", 
    "default-src 'none'; " +
    "img-src 'self' http://localhost; " +  // 允许从 localhost 加载图片
    "connect-src 'self' http://localhost:3000; " +  // 允许从 localhost:3000 发起请求
    "script-src 'self' 'unsafe-inline'; " +  // 允许 inline 脚本（为了避免 CSP 错误）
    "style-src 'self' 'unsafe-inline';");  // 允许 inline 样式
  next();
});

// 解析 JSON 请求体
app.use(express.json());

// 解析表单数据 (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

// 创建 MySQL 连接池
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 测试数据库连接
pool.getConnection((err, connection) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('成功连接到数据库');
  connection.release();
});

// 处理添加动物的 API 请求
app.post('/api/add-animal', (req, res) => {
  console.log("收到请求:", req.body);  // 打印请求数据

  // 在验证之前打印请求体内容
  console.log("请求体内容：", req.body);  // 这里添加了请求体打印
  
  const { name, species, age, adoptionDate } = req.body;

  // 确保数据有效
  if (!name || !species || !age || !adoptionDate) {
    return res.status(400).json({ message: '所有字段都是必需的' });
  }

  // 打印验证后的数据
  console.log("验证通过，准备插入数据:", { name, species, age, adoptionDate });

  // 插入数据到数据库
  const query = 'INSERT INTO animals (name, species, age, adoptionDate) VALUES (?, ?, ?, ?)';
  pool.query(query, [name, species, age, adoptionDate], (err, result) => {
    if (err) {
      console.error('插入数据失败:', err);  // 输出数据库插入的具体错误信息
      return res.status(500).json({ message: '添加动物失败，请稍后再试' });
    }
    console.log("插入成功，动物 ID:", result.insertId);  // 打印成功插入的 ID
    res.status(200).json({ message: 'Successfully Added', animalId: result.insertId });
  });
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`后端服务器正在监听 http://localhost:${PORT}`);
});
