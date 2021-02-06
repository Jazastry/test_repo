const express = require('express')
const app = express()

app.get('/', (req, res) => {
  const data = require('./src/test')
  console.log('data', JSON.stringify(data, null, 2))
  res.send(`
    DATA: ${JSON.stringify(data, null, 2)}
  `)
})

app.listen(9999, () => console.log('Example app listening on port 9999!'))
