const http = require('http')
const app = require('./app')
require("dotenv").config(); //LOAD ENV FROM.env to process.env

const server = http.createServer(app)
const { PORT } = process.env || 3000

if (!PORT) {
  console.log("no port was provided in .env, port 3000 will be used by default")
}

server.listen(PORT, () => {
  console.log(`server started on localhost:${PORT}`)
})
