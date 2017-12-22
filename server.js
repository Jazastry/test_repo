const express = require('express')
const app = express()

app.get('/', (req, res) => {
  var ip = req.headers['x-real-ip'] || req.connection.remoteAddress || req.ip
  console.log('ip', ip)
})

app.listen(8888, () => console.log('Example app listening on port 8888!'))
