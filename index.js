// 1. Import libraries
const express = require('express')
const mysql = require('mysql2')

// 2. Create the server app
const app = express()

// 3. Connect to Northwind database
const db = mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'MYSQLDAV-1993',
  database: 'northwind'
})

// 4. Test the database connection
db.connect((err) => {
  if (err) {
    console.log('Database connection FAILED:', err.message)
  } else {
    console.log('Database connected successfully!')
  }
})

// 5. Create your first API endpoint
app.get('/api/customers', (req, res) => {
  db.query('SELECT * FROM customers', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message })
    } else {
      res.json(results)
    }
  })
})

// 6. Start the server and listen for requests
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})