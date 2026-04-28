const express = require('express')
const mysql = require('mysql2')

const app = express()
app.use(express.json())

// ── Database connection ──────────────────────────────────────────────────────
const db = mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'MYSQLDAV-1993',
  database: 'northwind'
})

db.connect((err) => {
  if (err) {
    console.log('Database connection FAILED:', err.message)
  } else {
    console.log('Database connected successfully!')
  }
})

// ── Health check ─────────────────────────────────────────────────────────────
// GET /api/health
// Use this first to confirm your server is running before testing other endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Northwind API is running' })
})

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMERS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/customers
// Optional query params:
//   ?country=Germany        → filter by country
//   ?city=Berlin            → filter by city
//   ?search=alfki           → search by CustomerID or CompanyName
//   ?sort=CompanyName       → sort by any column (default: CustomerID)
//   ?order=asc|desc         → sort direction (default: asc)
//   ?limit=10               → limit number of results
//   ?offset=0               → skip N results (for pagination)
app.get('/api/customers', (req, res) => {
  const { country, city, search, sort, order, limit, offset } = req.query

  const allowedSortColumns = ['CustomerID', 'CompanyName', 'ContactName', 'Country', 'City']
  const sortColumn = allowedSortColumns.includes(sort) ? sort : 'CustomerID'
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC'

  let sql = 'SELECT * FROM customers WHERE 1=1'
  const params = []

  if (country) { sql += ' AND Country = ?'; params.push(country) }
  if (city)    { sql += ' AND City = ?';    params.push(city) }
  if (search)  { sql += ' AND (CustomerID LIKE ? OR CompanyName LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`

  if (limit)  { sql += ' LIMIT ?';  params.push(parseInt(limit)) }
  if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)) }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ count: results.length, data: results })
  })
})

// GET /api/customers/:id  → get one customer by CustomerID (e.g. ALFKI)
app.get('/api/customers/:id', (req, res) => {
  db.query('SELECT * FROM customers WHERE CustomerID = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    if (results.length === 0) return res.status(404).json({ error: 'Customer not found' })
    res.json(results[0])
  })
})

// POST /api/customers  → create a new customer
// Body (JSON): { CustomerID, CompanyName, ContactName, ContactTitle, Address, City, Region, PostalCode, Country, Phone, Fax }
app.post('/api/customers', (req, res) => {
  const { CustomerID, CompanyName, ContactName, ContactTitle, Address, City, Region, PostalCode, Country, Phone, Fax } = req.body
  if (!CustomerID || !CompanyName) return res.status(400).json({ error: 'CustomerID and CompanyName are required' })
  const sql = 'INSERT INTO customers (CustomerID, CompanyName, ContactName, ContactTitle, Address, City, Region, PostalCode, Country, Phone, Fax) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  db.query(sql, [CustomerID, CompanyName, ContactName, ContactTitle, Address, City, Region, PostalCode, Country, Phone, Fax], (err) => {
    if (err) return res.status(500).json({ error: err.message })
    res.status(201).json({ message: 'Customer created', CustomerID })
  })
})

// PUT /api/customers/:id  → update an existing customer (full update)
// Body (JSON): any fields you want to update
app.put('/api/customers/:id', (req, res) => {
  const { CompanyName, ContactName, ContactTitle, Address, City, Region, PostalCode, Country, Phone, Fax } = req.body
  const sql = 'UPDATE customers SET CompanyName=?, ContactName=?, ContactTitle=?, Address=?, City=?, Region=?, PostalCode=?, Country=?, Phone=?, Fax=? WHERE CustomerID=?'
  db.query(sql, [CompanyName, ContactName, ContactTitle, Address, City, Region, PostalCode, Country, Phone, Fax, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message })
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' })
    res.json({ message: 'Customer updated', CustomerID: req.params.id })
  })
})

// DELETE /api/customers/:id  → delete a customer by CustomerID
app.delete('/api/customers/:id', (req, res) => {
  db.query('DELETE FROM customers WHERE CustomerID = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message })
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Customer not found' })
    res.json({ message: 'Customer deleted', CustomerID: req.params.id })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/products
// Optional query params:
//   ?search=chai             → search by ProductName
//   ?categoryId=1            → filter by CategoryID
//   ?supplierId=1            → filter by SupplierID
//   ?discontinued=0|1        → filter by discontinued status
//   ?sort=ProductName        → sort column
//   ?order=asc|desc
//   ?limit=10&offset=0
app.get('/api/products', (req, res) => {
  const { search, categoryId, supplierId, discontinued, sort, order, limit, offset } = req.query

  const allowedSortColumns = ['ProductID', 'ProductName', 'UnitPrice', 'UnitsInStock', 'CategoryID']
  const sortColumn = allowedSortColumns.includes(sort) ? sort : 'ProductID'
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC'

  let sql = 'SELECT * FROM products WHERE 1=1'
  const params = []

  if (search)       { sql += ' AND ProductName LIKE ?';    params.push(`%${search}%`) }
  if (categoryId)   { sql += ' AND CategoryID = ?';        params.push(categoryId) }
  if (supplierId)   { sql += ' AND SupplierID = ?';        params.push(supplierId) }
  if (discontinued !== undefined) { sql += ' AND Discontinued = ?'; params.push(discontinued) }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`
  if (limit)  { sql += ' LIMIT ?';  params.push(parseInt(limit)) }
  if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)) }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ count: results.length, data: results })
  })
})

// GET /api/products/:id  → get one product by ProductID (e.g. 1)
app.get('/api/products/:id', (req, res) => {
  db.query('SELECT * FROM products WHERE ProductID = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    if (results.length === 0) return res.status(404).json({ error: 'Product not found' })
    res.json(results[0])
  })
})

// POST /api/products  → create a new product
// Body (JSON): { ProductName, SupplierID, CategoryID, QuantityPerUnit, UnitPrice, UnitsInStock, UnitsOnOrder, ReorderLevel, Discontinued }
app.post('/api/products', (req, res) => {
  const { ProductName, SupplierID, CategoryID, QuantityPerUnit, UnitPrice, UnitsInStock, UnitsOnOrder, ReorderLevel, Discontinued } = req.body
  if (!ProductName) return res.status(400).json({ error: 'ProductName is required' })
  const sql = 'INSERT INTO products (ProductName, SupplierID, CategoryID, QuantityPerUnit, UnitPrice, UnitsInStock, UnitsOnOrder, ReorderLevel, Discontinued) VALUES (?,?,?,?,?,?,?,?,?)'
  db.query(sql, [ProductName, SupplierID, CategoryID, QuantityPerUnit, UnitPrice || 0, UnitsInStock || 0, UnitsOnOrder || 0, ReorderLevel || 0, Discontinued || 0], (err, result) => {
    if (err) return res.status(500).json({ error: err.message })
    res.status(201).json({ message: 'Product created', ProductID: result.insertId })
  })
})

// PUT /api/products/:id  → update a product
app.put('/api/products/:id', (req, res) => {
  const { ProductName, SupplierID, CategoryID, QuantityPerUnit, UnitPrice, UnitsInStock, UnitsOnOrder, ReorderLevel, Discontinued } = req.body
  const sql = 'UPDATE products SET ProductName=?, SupplierID=?, CategoryID=?, QuantityPerUnit=?, UnitPrice=?, UnitsInStock=?, UnitsOnOrder=?, ReorderLevel=?, Discontinued=? WHERE ProductID=?'
  db.query(sql, [ProductName, SupplierID, CategoryID, QuantityPerUnit, UnitPrice, UnitsInStock, UnitsOnOrder, ReorderLevel, Discontinued, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message })
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' })
    res.json({ message: 'Product updated', ProductID: req.params.id })
  })
})

// DELETE /api/products/:id  → delete a product
app.delete('/api/products/:id', (req, res) => {
  db.query('DELETE FROM products WHERE ProductID = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message })
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' })
    res.json({ message: 'Product deleted', ProductID: req.params.id })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/orders
// Optional query params:
//   ?customerId=ALFKI        → filter by CustomerID
//   ?employeeId=1            → filter by EmployeeID
//   ?search=10248            → search by OrderID
//   ?sort=OrderDate          → sort column
//   ?order=asc|desc
//   ?limit=10&offset=0
app.get('/api/orders', (req, res) => {
  const { customerId, employeeId, search, sort, order, limit, offset } = req.query

  const allowedSortColumns = ['OrderID', 'CustomerID', 'EmployeeID', 'OrderDate', 'ShippedDate']
  const sortColumn = allowedSortColumns.includes(sort) ? sort : 'OrderID'
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC'

  let sql = 'SELECT * FROM orders WHERE 1=1'
  const params = []

  if (customerId)  { sql += ' AND CustomerID = ?';        params.push(customerId) }
  if (employeeId)  { sql += ' AND EmployeeID = ?';        params.push(employeeId) }
  if (search)      { sql += ' AND OrderID LIKE ?';        params.push(`%${search}%`) }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`
  if (limit)  { sql += ' LIMIT ?';  params.push(parseInt(limit)) }
  if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)) }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ count: results.length, data: results })
  })
})

// GET /api/orders/:id  → get one order by OrderID (e.g. 10248)
app.get('/api/orders/:id', (req, res) => {
  db.query('SELECT * FROM orders WHERE OrderID = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    if (results.length === 0) return res.status(404).json({ error: 'Order not found' })
    res.json(results[0])
  })
})

// POST /api/orders  → create a new order
// Body (JSON): { CustomerID, EmployeeID, OrderDate, RequiredDate, ShippedDate, ShipVia, Freight, ShipName, ShipAddress, ShipCity, ShipRegion, ShipPostalCode, ShipCountry }
app.post('/api/orders', (req, res) => {
  const { CustomerID, EmployeeID, OrderDate, RequiredDate, ShippedDate, ShipVia, Freight, ShipName, ShipAddress, ShipCity, ShipRegion, ShipPostalCode, ShipCountry } = req.body
  if (!CustomerID) return res.status(400).json({ error: 'CustomerID is required' })
  const sql = 'INSERT INTO orders (CustomerID, EmployeeID, OrderDate, RequiredDate, ShippedDate, ShipVia, Freight, ShipName, ShipAddress, ShipCity, ShipRegion, ShipPostalCode, ShipCountry) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  db.query(sql, [CustomerID, EmployeeID, OrderDate, RequiredDate, ShippedDate, ShipVia, Freight || 0, ShipName, ShipAddress, ShipCity, ShipRegion, ShipPostalCode, ShipCountry], (err, result) => {
    if (err) return res.status(500).json({ error: err.message })
    res.status(201).json({ message: 'Order created', OrderID: result.insertId })
  })
})

// DELETE /api/orders/:id  → delete an order
app.delete('/api/orders/:id', (req, res) => {
  db.query('DELETE FROM orders WHERE OrderID = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message })
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' })
    res.json({ message: 'Order deleted', OrderID: req.params.id })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// EMPLOYEES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/employees
// Optional query params:
//   ?search=Davolio          → search by LastName or FirstName
//   ?title=Sales             → filter by Title (contains match)
//   ?sort=LastName           → sort column
//   ?order=asc|desc
//   ?limit=10&offset=0
app.get('/api/employees', (req, res) => {
  const { search, title, sort, order, limit, offset } = req.query

  const allowedSortColumns = ['EmployeeID', 'LastName', 'FirstName', 'Title', 'HireDate']
  const sortColumn = allowedSortColumns.includes(sort) ? sort : 'EmployeeID'
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC'

  let sql = 'SELECT EmployeeID, LastName, FirstName, Title, TitleOfCourtesy, BirthDate, HireDate, Address, City, Region, PostalCode, Country, HomePhone, Extension FROM employees WHERE 1=1'
  const params = []

  if (search) { sql += ' AND (LastName LIKE ? OR FirstName LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  if (title)  { sql += ' AND Title LIKE ?'; params.push(`%${title}%`) }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`
  if (limit)  { sql += ' LIMIT ?';  params.push(parseInt(limit)) }
  if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)) }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ count: results.length, data: results })
  })
})

// GET /api/employees/:id  → get one employee by EmployeeID
app.get('/api/employees/:id', (req, res) => {
  const sql = 'SELECT EmployeeID, LastName, FirstName, Title, TitleOfCourtesy, BirthDate, HireDate, Address, City, Region, PostalCode, Country, HomePhone, Extension FROM employees WHERE EmployeeID = ?'
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    if (results.length === 0) return res.status(404).json({ error: 'Employee not found' })
    res.json(results[0])
  })
})

// DELETE /api/employees/:id  → delete an employee
app.delete('/api/employees/:id', (req, res) => {
  db.query('DELETE FROM employees WHERE EmployeeID = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message })
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Employee not found' })
    res.json({ message: 'Employee deleted', EmployeeID: req.params.id })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/categories  → get all categories
app.get('/api/categories', (req, res) => {
  db.query('SELECT CategoryID, CategoryName, Description FROM categories ORDER BY CategoryID', (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ count: results.length, data: results })
  })
})

// GET /api/categories/:id  → get one category
app.get('/api/categories/:id', (req, res) => {
  db.query('SELECT CategoryID, CategoryName, Description FROM categories WHERE CategoryID = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    if (results.length === 0) return res.status(404).json({ error: 'Category not found' })
    res.json(results[0])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/suppliers
// Optional query params:
//   ?country=USA             → filter by country
//   ?search=exotic           → search by CompanyName
app.get('/api/suppliers', (req, res) => {
  const { country, search } = req.query
  let sql = 'SELECT * FROM suppliers WHERE 1=1'
  const params = []
  if (country) { sql += ' AND Country = ?'; params.push(country) }
  if (search)  { sql += ' AND CompanyName LIKE ?'; params.push(`%${search}%`) }
  sql += ' ORDER BY SupplierID'
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ count: results.length, data: results })
  })
})

// GET /api/suppliers/:id  → get one supplier
app.get('/api/suppliers/:id', (req, res) => {
  db.query('SELECT * FROM suppliers WHERE SupplierID = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    if (results.length === 0) return res.status(404).json({ error: 'Supplier not found' })
    res.json(results[0])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// SHIPPERS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/shippers  → get all shippers
app.get('/api/shippers', (req, res) => {
  db.query('SELECT * FROM shippers ORDER BY ShipperID', (err, results) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ count: results.length, data: results })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════════════════════════════════════════
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})