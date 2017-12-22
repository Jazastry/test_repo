const express = require('express')
const app = express()

app.get('/', (req, res) => {
  var ip = req.headers['x-real-ip'] || req.connection.remoteAddress || req.ip
  console.log('ip', ip)
  res.send(`IP : ${ip}`)
})

app.listen(9999, () => console.log('Example app listening on port 9999!'))
