const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const multer = require('multer');  // 引入 multer 处理文件上传
const cors = require('cors');
const app = express();

// 允许跨域
app.use(cors());

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dirPath = path.join(__dirname, 'content', 'imgs');  // 设置图片存储路径
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });  // 如果目录不存在，创建目录
    }
    cb(null, dirPath);  // 存储路径
  },
  filename: (req, file, cb) => {
    const fileName = `post_${Date.now()}${path.extname(file.originalname)}`;  // 文件名为 post_时间戳.jpg
    cb(null, fileName);  // 设置文件名
  }
});

const upload = multer({ storage: storage });

// 解析 JSON 请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 创建 MySQL 连接池
require('dotenv').config();
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.post('/api/add-animal', upload.single('image'), (req, res) => {
  console.log("收到请求:", req.body);  // 打印请求数据

  const { name, species, age, size, description } = req.body;
  const tempImage = req.file ? req.file.filename : null;  // 获取临时上传的图片文件名

  // 确保数据有效
  if (!name || !species || !age || !size || !description || !tempImage) {
    return res.status(400).json({ message: '所有字段都是必需的' });
  }

  // 插入数据到数据库
  const query = 'INSERT INTO animals (name, species, age, size, description) VALUES (?, ?, ?, ?, ?)';
  pool.query(query, [name, species, age, size, description], (err, result) => {
    if (err) {
      console.error('插入数据失败:', err);
      return res.status(500).json({ message: '添加动物失败，请稍后再试' });
    }

    const animalId = result.insertId;  // 获取插入后的动物 ID

    // 生成新的文件名为 post_{id}.jpg
    const newImagePath = path.join('content', 'imgs', `post_${animalId}.jpg`);

    // 使用新的文件名重命名文件
    fs.rename(path.join(__dirname, 'content', 'imgs', tempImage), newImagePath, (err) => {
      if (err) {
        console.error('文件重命名失败:', err);
        return res.status(500).json({ message: '文件处理失败，请稍后再试' });
      }

      // 更新数据库中的图片路径
      const updateQuery = 'UPDATE animals SET picture_url = ? WHERE id = ?';
      pool.query(updateQuery, [newImagePath, animalId], (err) => {
        if (err) {
          console.error('更新数据库图片路径失败:', err);
          return res.status(500).json({ message: '更新图片路径失败' });
        }

        console.log("插入成功，动物 ID:", animalId);
        res.status(200).json({ message: 'Successfully Added', animalId: animalId, pictureUrl: newImagePath });

        // 插入成功后重定向到 /adopt 页面
        /* res.redirect('/adopt'); */
      });
    });
  });
});


// Helper function to update .md files
const updateMarkdownFile = (postData, fileName) => {
    // File path to save the markdown file
    const filePath = path.join(__dirname, 'src', 'content', 'posts', fileName);
  
    // Create the markdown content
    const markdownContent =
      `title: "${postData.title}"\n` +
      `description: "${postData.description}"\n` +
      `date: ${new Date(postData.date).toISOString()}\n` +
      `image: "${postData.image}"\n` +
      `categories: ${JSON.stringify(postData.categories)}\n` +
      `authors: ${JSON.stringify(postData.authors)}\n` +
      `tags: ${JSON.stringify(postData.tags)}\n` +
      `draft: ${postData.draft}\n` +
      '---\n\n' +  // Double new line after the front matter
      `${postData.content}`; // Markdown content after the front matter
  
    // Print to console to verify content formatting before writing to the file
    console.log('Generated Markdown Content:\n', markdownContent);
  
    // Write content to file, ensuring no extra formatting or indentation
    fs.writeFileSync(filePath, markdownContent, { encoding: 'utf8' });
  
    console.log(`Markdown file created/updated at: ${filePath}`);
  };
// 处理更新动物的 API 请求
app.put('/api/update-animal/:id', (req, res) => {
  const animalId = req.params.id;
  const { name, species, age, adoptionDate } = req.body;

  // 确保数据有效
  if (!name || !species || !age || !adoptionDate) {
    return res.status(400).json({ message: '所有字段都是必需的' });
  }

  const query = 'UPDATE animals SET name = ?, species = ?, age = ?, adoptionDate = ? WHERE id = ?';
  pool.query(query, [name, species, age, adoptionDate, animalId], (err, result) => {
    if (err) {
      console.error('更新数据失败:', err);
      return res.status(500).json({ message: '更新动物失败，请稍后再试' });
    }

    // Update the corresponding .md file
    const postData = {
      title: `Test Pet ${name}`,
      description: `Details about ${name}`,
      date: adoptionDate,
      image: "/images/posts/01.jpg",
      categories: ["pets", "adopt"],
      authors: ["1"],
      tags: [species, "adopt"],
      draft: false,
      content: `This is the updated content for ${name}.`,
    };

    updateMarkdownFile(postData, `${name.toLowerCase().replace(/\s+/g, '-')}.md`);

    res.status(200).json({ message: 'Successfully Updated' });
  });
});

// Helper function to delete .md files
const deleteMarkdownFile = (fileName) => {
  // Updated file path to src/content/posts
  const filePath = path.join(__dirname, 'src', 'content', 'posts', fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Markdown file deleted: ${filePath}`);
  }
};

// 处理删除动物的 API 请求
app.delete('/api/delete-animal/:id', (req, res) => {
  const animalId = req.params.id;

  // 从数据库中删除动物
  const query = 'DELETE FROM animals WHERE id = ?';
  pool.query(query, [animalId], (err, result) => {
    if (err) {
      console.error('删除数据失败:', err);
      return res.status(500).json({ message: '删除动物失败，请稍后再试' });
    }

    // 删除对应的 .md 文件
    const animalName = req.body.name; // Assuming the name is passed in the request body
    deleteMarkdownFile(`${animalName.toLowerCase().replace(/\s+/g, '-')}.md`);

    res.status(200).json({ message: 'Successfully Deleted' });
  });
});

// 启动服务器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`后端服务器正在监听 http://localhost:${PORT}`);
});
