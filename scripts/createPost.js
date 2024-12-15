const fs = require('fs');   // 1
const path = require('path');   // 2
const mysql = require('mysql2');   // 3

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Function to create a markdown post using pet data
const createPost = (pet, content) => {   // 4
  const postId = pet.id;   // 5
  const title = pet.name;   // 6
  const description = "meta description";  // 7
  const date = new Date().toISOString();   // 8
  const image = "/images/posts/" + postId + ".jpg";   // 9
  const categories = ["animals"];   // 10
  const authors = ["1"];   // 11
  const tags = ["adopt", "pet"];   // 12
  const draft = false;   // 13

  // Frontmatter
  const frontmatter = `---   // 14
title: "${title}"   // 15
description: "${description}"   // 16
date: "${date}"   // 17
image: "${image}"   // 18
categories: ${JSON.stringify(categories)}   // 19
authors: ${JSON.stringify(authors)}   // 20
tags: ${JSON.stringify(tags)}   // 21
draft: ${draft}   // 22
---`;   // 23

  // Combine frontmatter and content
  const markdownContent = frontmatter + "\n\n" + content;   // 24

  // Define the file path using pet ID
  const filePath = path.join(__dirname, 'src', 'posts', `post-${postId}.md`);   // 25

  // Write the markdown file
  fs.writeFile(filePath, markdownContent, (err) => {   // 26
    if (err) {   // 27
      console.error('Error writing file:', err);   // 28
      return;   // 29
    }
    console.log(`Post created: ${filePath}`);   // 30
  });
};

// Function to fetch pet data from the database and create the post
const createPetPost = (petId) => {   // 31
  pool.query('SELECT * FROM animals WHERE id = ?', [petId], (err, results) => {   // 32
    if (err) {   // 33
      console.error('Error fetching pet from database:', err);   // 34
      return;   // 35
    }

    if (results.length === 0) {   // 36
      console.log(`No pet found with ID ${petId}`);   // 37
      return;   // 38
    }

    const pet = results[0];   // 39
    const content = `Placeholder   // 40

## Something Here   // 41

Placeholder`;   // 42

    // Call the createPost function to generate the markdown file
    createPost(pet, content);   // 43
  });
};

// Example usage: create a post for pet with ID 1
createPetPost(1);   // 44
